#!/usr/bin/env node

/**
 * Dates Generator
 *
 * Reads working memory from Craft (via MCP) and Google Calendar events,
 * then uses Claude to merge both sources into a unified dates.json.
 *
 * This single file powers: orbital chart, timeline ribbon, notifications.
 * Replaces the old orbital.js generator.
 *
 * Output: public/dates.json
 */

import https from "https";

// ─── Config ────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";

const GITHUB_REPO = "gogogoober/life-dashboard";
const GITHUB_BRANCH = "main";
const OUTPUT_PATH = "public/dates.json";

const CRAFT_MCP_URL = "https://mcp.craft.do/links/8pMZhXonzqg/mcp";
const CRAFT_MCP_NAME = "craft";
const WORKING_MEMORY_DOC_ID = "FC9D77DC-45EB-4EBA-B7F5-3F6F7BEB9DD0";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const WINDOW_DAYS = 60;

// ─── Helpers ────────────────────────────────────────────────────────────────

function httpsRequest(method, hostname, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const data = body
      ? typeof body === "string"
        ? body
        : JSON.stringify(body)
      : null;
    const req = https.request(
      {
        hostname,
        path: urlPath,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

// ─── Google Calendar ────────────────────────────────────────────────────────

async function getGoogleAccessToken() {
  const tokenBody = [
    `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}`,
    `client_secret=${encodeURIComponent(GOOGLE_CLIENT_SECRET)}`,
    `refresh_token=${encodeURIComponent(GOOGLE_REFRESH_TOKEN)}`,
    `grant_type=refresh_token`,
  ].join("&");

  const response = await httpsRequest(
    "POST",
    "oauth2.googleapis.com",
    "/token",
    { "Content-Type": "application/x-www-form-urlencoded" },
    tokenBody
  );

  if (response.status !== 200) {
    throw new Error(
      `Google OAuth failed (${response.status}): ${JSON.stringify(response.body)}`
    );
  }

  return response.body.access_token;
}

async function fetchCalendarEvents(accessToken) {
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: windowEnd.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const calId = encodeURIComponent(GOOGLE_CALENDAR_ID);
  const response = await httpsRequest(
    "GET",
    "www.googleapis.com",
    `/calendar/v3/calendars/${calId}/events?${params.toString()}`,
    { Authorization: `Bearer ${accessToken}` }
  );

  if (response.status !== 200) {
    throw new Error(
      `Google Calendar API failed (${response.status}): ${JSON.stringify(response.body)}`
    );
  }

  const allEvents = response.body.items || [];
  const isBirthday = (e) => (e.summary || "").toLowerCase().includes("birthday");
  const filtered = allEvents.filter((e) => !e.recurringEventId || isBirthday(e));

  console.log(
    `Calendar: ${allEvents.length} total → ${filtered.length} kept ` +
    `(${allEvents.length - filtered.length} recurring filtered, birthdays preserved)`
  );

  return filtered.map((e) => ({
    id: e.id,
    title: e.summary || "(no title)",
    description: e.description || null,
    location: e.location || null,
    start: e.start?.dateTime || e.start?.date || null,
    end: e.end?.dateTime || e.end?.date || null,
    all_day: !!e.start?.date,
    attendees: (e.attendees || [])
      .filter((a) => !a.self)
      .map((a) => a.displayName || a.email),
  }));
}

// ─── Claude + Craft MCP ─────────────────────────────────────────────────────

async function generateDatesJson(calendarEvents) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const systemPrompt = `You are the Dates Generator for Hugo's personal life dashboard.

You have two data sources:
1. **Craft MCP** — Read working memory (ID: ${WORKING_MEMORY_DOC_ID}) via blocks_get with format="markdown". Contains items with heat levels, sub-threads, open actions, deadlines.
2. **Google Calendar** — Provided below. Non-recurring events + birthdays for the next ${WINDOW_DAYS} days.

## Your job

Merge both sources into a flat list of events. Every event in the output is a DateEvent — there is no separate "calendar_events" array. Everything is unified.

## Merge rules

- Fuzzy-match calendar events to working memory items (e.g. "JAPAN!" matches "Japan Trip").
- **Matched items**: appear ONCE. Use calendar dates as source of truth. Pull context, actions, and people from working memory. Set source to "both".
- **Logistics** (flights, hotels, individual bookings): fold these into the parent event's actions array. Do NOT create separate top-level events for "Flight to Osaka" or "Stay at Travelodge" — they become actions on the parent trip.
- **Unmatched calendar events**: create a standalone event. Set source to "google". Infer category from the event title/description.
- **Unmatched working memory items** (with dates): include as-is. Set source to "craft".
- Only include events with startDate on or after today (${today}) and within ${WINDOW_DAYS} days.

## Field guidelines

- **id**: Stable kebab-case slug. Use the same slug across regenerations for the same event. Examples: "japan-trip-2026", "danas-30th-birthday", "weekly-standup".
- **name**: Human-readable display name. Short and clear.
- **startDate**: YYYY-MM-DD format. Use calendar date when available.
- **durationDays**: 1 for single-day events. For multi-day trips, count the days. A dinner is 1. Japan Mar 23–Apr 7 is 16.
- **importance** (1-10): How much mental weight this carries. Guidelines:
  - 9-10: Multi-week trips, major deadlines, life events
  - 7-8: Week-long trips, significant projects
  - 5-6: Birthdays, weekend trips, meaningful social events
  - 3-4: Regular social events, appointments
  - 1-2: Low-stakes calendar items
- **category**: work | personal | travel | social
- **source**: google | craft | both
- **isRecurring**: true for weekly standups, recurring 1:1s, etc. false for one-off events.
- **context**: One sentence describing what's going on. Be specific and useful, not generic.
- **hook**: A nudge to action. Only include when there are open (todo) actions. Frame it as "what should Hugo do next?" — be specific. Omit this field entirely if there are no todo actions.
- **actions**: Sub-tasks. Each has id (kebab-case), name, status (todo|done). Include logistics as actions on their parent event. Empty array if none.
- **people**: Names of people involved. Empty array if none or if it's a solo task.

## Output format

Return ONLY valid JSON. No preamble, no markdown fences, no explanation.

{
  "generatedAt": "${now.toISOString()}",
  "windowDays": ${WINDOW_DAYS},
  "events": [ ... ]
}

Today: ${today}`;

  const calendarContext =
    calendarEvents.length > 0
      ? `Read working memory from Craft, then merge with these Google Calendar events.\n\nCalendar events:\n${JSON.stringify(calendarEvents, null, 2)}`
      : `Read working memory from Craft. No calendar events available — use only working memory data.`;

  const userMessage = `## STEP 1: READ WORKING MEMORY

Use the MCP tool now:
blocks_get with id="${WORKING_MEMORY_DOC_ID}" and format="markdown"

Read the full response carefully before proceeding.

## STEP 2: MERGE AND OUTPUT

${calendarContext}

Respond with ONLY the JSON object. No explanation. No markdown fences.`;

  console.log("Calling Claude with Craft MCP + calendar context...");

  let response;
  for (let attempt = 1; attempt <= 3; attempt++) {
    response = await httpsRequest(
      "POST",
      "api.anthropic.com",
      "/v1/messages",
      {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-11-20",
      },
      {
        model: CLAUDE_MODEL,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
        mcp_servers: [
          { type: "url", url: CRAFT_MCP_URL, name: CRAFT_MCP_NAME },
        ],
        tools: [
          { type: "mcp_toolset", mcp_server_name: CRAFT_MCP_NAME },
        ],
      }
    );

    if (response.status === 429) {
      if (attempt === 3) break;
      console.log(`Rate limited (429). Waiting 60s before retry ${attempt + 1}/3...`);
      await sleep(60);
      continue;
    }
    break;
  }

  console.log("Claude response status:", response.status);

  if (response.status !== 200) {
    console.error(
      "Claude API error:",
      JSON.stringify(response.body, null, 2).slice(0, 1000)
    );
    throw new Error(`Claude API returned status ${response.status}`);
  }

  // Log MCP tool usage
  const toolCalls = (response.body?.content ?? []).filter(
    (block) => block.type === "mcp_tool_use"
  );
  console.log(`MCP tool calls made: ${toolCalls.length}`);
  toolCalls.forEach((tc) =>
    console.log(`  - ${tc.name}(${JSON.stringify(tc.input).slice(0, 100)})`)
  );

  if (toolCalls.length === 0) {
    console.warn("WARNING: Claude made no MCP tool calls. Output may be hallucinated.");
  }

  // Extract text blocks from response
  const textBlocks = (response.body?.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text);

  const raw = textBlocks.join("\n").trim();
  console.log("Raw output preview:", raw.slice(0, 500));

  if (!raw) {
    throw new Error("Claude returned no text content. Check MCP connectivity.");
  }

  // Parse JSON — handle potential preamble or markdown fences
  try {
    return JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not extract valid JSON from Claude's response.");
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateDatesJson(data) {
  if (!data.events || !Array.isArray(data.events)) {
    throw new Error("Validation failed: missing events array");
  }

  const requiredFields = [
    "id", "name", "startDate", "durationDays",
    "importance", "category", "source", "isRecurring", "context",
  ];
  const validCategories = ["work", "personal", "travel", "social"];
  const validSources = ["google", "craft", "both"];

  const issues = [];

  data.events.forEach((event, i) => {
    const label = event.name || `events[${i}]`;

    // Check required fields exist
    requiredFields.forEach((field) => {
      if (event[field] === undefined || event[field] === null) {
        issues.push(`${label}: missing required field "${field}"`);
      }
    });

    // Validate ranges and enums
    if (event.importance < 1 || event.importance > 10) {
      issues.push(`${label}: importance ${event.importance} outside 1-10 range`);
    }
    if (event.durationDays < 1) {
      issues.push(`${label}: durationDays must be >= 1`);
    }
    if (!validCategories.includes(event.category)) {
      issues.push(`${label}: invalid category "${event.category}"`);
    }
    if (!validSources.includes(event.source)) {
      issues.push(`${label}: invalid source "${event.source}"`);
    }

    // Ensure arrays exist
    if (!Array.isArray(event.actions)) {
      event.actions = [];
    }
    if (!Array.isArray(event.people)) {
      event.people = [];
    }

    // Validate action statuses
    event.actions.forEach((action, j) => {
      if (!["todo", "done"].includes(action.status)) {
        issues.push(`${label}.actions[${j}]: invalid status "${action.status}"`);
      }
    });

    // Hook should only exist when there are todo actions
    const hasTodoActions = event.actions.some((a) => a.status === "todo");
    if (event.hook && !hasTodoActions) {
      // Not a hard error — just clean it up
      delete event.hook;
    }
  });

  if (issues.length > 0) {
    console.warn(`Validation found ${issues.length} issue(s):`);
    issues.forEach((msg) => console.warn(`  ⚠ ${msg}`));
  } else {
    console.log(`Validation passed: ${data.events.length} events OK`);
  }

  return data;
}

// ─── GitHub Push ────────────────────────────────────────────────────────────

async function pushToGitHub(jsonData) {
  const content = Buffer.from(
    JSON.stringify(jsonData, null, 2)
  ).toString("base64");

  // Check if file already exists (need SHA for update)
  const existing = await httpsRequest(
    "GET",
    "api.github.com",
    `/repos/${GITHUB_REPO}/contents/${OUTPUT_PATH}?ref=${GITHUB_BRANCH}`,
    {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "life-dashboard-dates-generator",
      Accept: "application/vnd.github+json",
    }
  );

  const sha = existing?.body?.sha ?? undefined;

  const payload = {
    message: `chore: update dates.json [${new Date().toISOString()}]`,
    content,
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  };

  const result = await httpsRequest(
    "PUT",
    "api.github.com",
    `/repos/${GITHUB_REPO}/contents/${OUTPUT_PATH}`,
    {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "life-dashboard-dates-generator",
      Accept: "application/vnd.github+json",
    },
    payload
  );

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(
      `GitHub push failed (${result.status}): ${JSON.stringify(result.body)}`
    );
  }

  console.log(`Pushed ${OUTPUT_PATH} (status: ${result.status})`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Dates Generator starting ===");
  console.log(`Window: ${WINDOW_DAYS} days | Model: ${CLAUDE_MODEL}`);

  if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  if (!GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN");

  // Step 1: Fetch Google Calendar
  let calendarEvents = [];
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN) {
    console.log("Fetching Google Calendar events...");
    try {
      const accessToken = await getGoogleAccessToken();
      calendarEvents = await fetchCalendarEvents(accessToken);
      console.log(`Got ${calendarEvents.length} events for next ${WINDOW_DAYS} days`);
    } catch (err) {
      console.warn("Google Calendar fetch failed, continuing without:", err.message);
    }
  } else {
    console.log("Google Calendar not configured — Craft-only mode.");
  }

  // Step 2: Generate via Claude + Craft MCP
  console.log("Generating dates.json via Claude + Craft MCP...");
  let datesJson = await generateDatesJson(calendarEvents);

  // Step 3: Validate and clean
  datesJson = validateDatesJson(datesJson);

  // Step 4: Push to GitHub
  console.log("Pushing dates.json to GitHub...");
  await pushToGitHub(datesJson);

  console.log(`=== Done — ${datesJson.events.length} events generated ===`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});