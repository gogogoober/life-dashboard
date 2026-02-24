#!/usr/bin/env node

/**
 * Dashboard Generator
 *
 * Runs frequently (e.g. every hour). Fetches Google Calendar events,
 * uses Claude with Craft MCP connector to read working memory,
 * then generates dashboard JSON combining both sources.
 * Commits dashboard.json to GitHub so the site re-renders.
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
const DASHBOARD_JSON_PATH = "public/dashboard.json";

const CRAFT_MCP_URL = "https://mcp.craft.do/links/8pMZhXonzqg/mcp";
const CRAFT_MCP_NAME = "craft";
const WORKING_MEMORY_DOC_ID = "FC9D77DC-45EB-4EBA-B7F5-3F6F7BEB9DD0";

const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

// Delay before calling Claude API (seconds). Prevents rate-limit collisions
// when this workflow is triggered right after Update Working Memory completes.
const STARTUP_DELAY_SECONDS = 120;

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

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
  const twoMonthsOut = new Date(now);
  twoMonthsOut.setMonth(twoMonthsOut.getMonth() + 2);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: twoMonthsOut.toISOString(),
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

  const isBirthday = (e) =>
    (e.summary || "").toLowerCase().includes("birthday");
  const filtered = allEvents.filter((e) => !e.recurringEventId || isBirthday(e));

  console.log(
    `Calendar: ${allEvents.length} total events, ${filtered.length} kept (${allEvents.length - filtered.length} recurring filtered out, birthdays preserved)`
  );

  return filtered.map((e) => ({
    id: e.id,
    title: e.summary || "(no title)",
    description: e.description || null,
    location: e.location || null,
    start: e.start?.dateTime || e.start?.date || null,
    end: e.end?.dateTime || e.end?.date || null,
    all_day: !!e.start?.date,
    status: e.status,
    attendees: (e.attendees || [])
      .filter((a) => !a.self)
      .map((a) => a.displayName || a.email),
    creator: e.creator?.displayName || e.creator?.email || null,
  }));
}

// ─── Claude + Craft MCP ─────────────────────────────────────────────────────

async function generateDashboardJson(calendarEvents) {
  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are the Dashboard Generator for a personal productivity system.

## Data Sources
1. **Craft MCP** — Read working memory (ID: ${WORKING_MEMORY_DOC_ID}) via blocks_get format="markdown". Contains items with heat levels, sub-threads, open actions.
2. **Google Calendar** — Provided below. Non-recurring events + birthdays for the next 2 months.

## Merge Rules
- Fuzzy-match calendar events to working memory items (e.g. "JAPAN!" matches "Japan Trip 2026").
- Matched items: appear ONCE in "items" with working memory context. Use calendar dates as source of truth for start/end. Do NOT duplicate in calendar_events.
- Flights, hotels, logistics: keep as separate calendar_events with related_item_id linking to the parent item. E.g. "Flight to Osaka (BR 55)" and "Stay at Travelodge Kyoto" are separate calendar_events linked to the Japan trip item.
- Unmatched calendar events: standalone in calendar_events (related_item_id=null).
- Unmatched working memory items: in "items" as-is.

## Weights & Dates
calendar_events weight (1-10): multi-day trips=8-10, flights=6-7, birthdays=5, hotel stays=4, appointments=3.
Calculate days_until and days_until_deadline relative to today's date.

## Output
Return ONLY valid JSON matching this schema. No preamble, no explanation, no markdown fences, no text before or after the JSON object.

{ "generated_at": "ISO timestamp",
  "items": [{ "id": "string", "title": "string", "category": "active-research|project|action-item|trip-event|people", "tag": "personal|work|both", "heat": "hot|warm|archived", "heat_reason": "string", "summary": "string", "sub_threads": ["string"], "open_actions": ["string"], "start_date": "YYYY-MM-DD|null", "end_date": "YYYY-MM-DD|null", "deadline": "YYYY-MM-DD|null", "pinned": true, "days_until_deadline": "number|null", "calendar_source": "boolean" }],
  "calendar_events": [{ "id": "string", "title": "string", "type": "flight|hotel|appointment|birthday|social|logistics|other", "start": "ISO datetime or YYYY-MM-DD", "end": "ISO datetime or YYYY-MM-DD", "all_day": "boolean", "location": "string|null", "description": "string|null", "attendees": ["string"], "weight": "1-10", "days_until": "number", "related_item_id": "string|null" }],
  "habit_tracking": { "week_start": "YYYY-MM-DD", "habits": [{ "id": "string", "completions": ["mon"], "status": "done|partial|missed|pending" }] },
  "meta": { "hot_count": 0, "warm_count": 0, "archived_count": 0, "upcoming_events_count": 0 }
}

Today: ${today}`;

  console.log("Calling Claude with Craft MCP connector + calendar context...");

  const response = await httpsRequest(
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
      messages: [
        {
          role: "user",
          content: calendarEvents.length > 0
            ? `Read working memory from Craft, then merge with these calendar events to generate dashboard JSON.\n\n${JSON.stringify(calendarEvents, null, 2)}`
            : `Read working memory from Craft and generate dashboard JSON. No calendar events available — leave calendar_events empty.`,
        },
      ],
      mcp_servers: [
        {
          type: "url",
          url: CRAFT_MCP_URL,
          name: CRAFT_MCP_NAME,
        },
      ],
      tools: [
        {
          type: "mcp_toolset",
          mcp_server_name: CRAFT_MCP_NAME,
        },
      ],
    }
  );

  console.log("Claude response status:", response.status);

  if (response.status !== 200) {
    console.error(
      "Claude API error:",
      JSON.stringify(response.body, null, 2).slice(0, 1000)
    );
    throw new Error(`Claude API returned status ${response.status}`);
  }

  const textBlocks = (response.body?.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text);

  const raw = textBlocks.join("\n").trim();
  console.log("Claude raw output preview:", raw.slice(0, 300));

  if (!raw) {
    throw new Error("Claude returned no text content. Check MCP connectivity.");
  }

  try {
    return JSON.parse(raw);
  } catch {
    // Claude sometimes adds preamble text or markdown fences — extract the JSON object
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not extract valid JSON from Claude's response.");
  }
}

// ─── GitHub Push ────────────────────────────────────────────────────────────

async function pushDashboardJson(dashboardJson) {
  const content = Buffer.from(
    JSON.stringify(dashboardJson, null, 2)
  ).toString("base64");

  const existing = await httpsRequest(
    "GET",
    "api.github.com",
    `/repos/${GITHUB_REPO}/contents/${DASHBOARD_JSON_PATH}?ref=${GITHUB_BRANCH}`,
    {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "cerebro-dashboard-generator",
      Accept: "application/vnd.github+json",
    }
  );

  const sha = existing?.body?.sha ?? undefined;

  const payload = {
    message: `chore: update dashboard.json [${new Date().toISOString()}]`,
    content,
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  };

  const result = await httpsRequest(
    "PUT",
    "api.github.com",
    `/repos/${GITHUB_REPO}/contents/${DASHBOARD_JSON_PATH}`,
    {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "cerebro-dashboard-generator",
      Accept: "application/vnd.github+json",
    },
    payload
  );

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(
      `GitHub push failed (${result.status}): ${JSON.stringify(result.body)}`
    );
  }

  console.log(`Pushed dashboard.json (status: ${result.status})`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Dashboard Generator starting ===");

  if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  if (!GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN");

  // Wait for rate limit window to clear after working memory updater
  console.log(`Waiting ${STARTUP_DELAY_SECONDS}s for rate limit cooldown...`);
  await sleep(STARTUP_DELAY_SECONDS);
  console.log("Cooldown complete, proceeding.");

  let calendarEvents = [];
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN) {
    console.log("Fetching Google Calendar events...");
    try {
      const accessToken = await getGoogleAccessToken();
      calendarEvents = await fetchCalendarEvents(accessToken);
      console.log(`Got ${calendarEvents.length} events for next 2 months`);
    } catch (err) {
      console.warn("Google Calendar fetch failed, continuing without:", err.message);
    }
  } else {
    console.log("Google Calendar credentials not configured, skipping. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN to enable.");
  }

  console.log(`Generating dashboard JSON via Claude + Craft MCP${calendarEvents.length > 0 ? " + Calendar" : ""}...`);
  const dashboardJson = await generateDashboardJson(calendarEvents);

  console.log("Pushing dashboard.json to GitHub...");
  await pushDashboardJson(dashboardJson);

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});