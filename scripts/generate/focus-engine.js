#!/usr/bin/env node

/**
 * Focus Engine Generator
 *
 * Fetches Google Calendar events and reads working memory from Craft via MCP.
 * Uses Claude to select the 3 most important threads to surface as quest cards.
 * Pushes focus-engine.json to GitHub so the dashboard can render them.
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
const FOCUS_ENGINE_JSON_PATH = "public/focus-engine.json";

const CRAFT_MCP_URL = "https://mcp.craft.do/links/8pMZhXonzqg/mcp";
const CRAFT_MCP_NAME = "craft";
const WORKING_MEMORY_DOC_ID = "FC9D77DC-45EB-4EBA-B7F5-3F6F7BEB9DD0";

const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

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

// ─── Time Context ────────────────────────────────────────────────────────────

function getEnergyBand(hour) {
  if (hour < 10) return "ramp_up";
  if (hour < 13) return "prime_work";
  if (hour < 14) return "lunch_dip";
  if (hour < 16) return "high_energy";
  if (hour < 17) return "transition";
  if (hour < 18) return "chores";
  if (hour < 19) return "planning";
  return "wind_down";
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
  const isBirthday = (e) => (e.summary || "").toLowerCase().includes("birthday");
  const filtered = allEvents.filter((e) => !e.recurringEventId || isBirthday(e));

  console.log(
    `Calendar: ${allEvents.length} total events, ${filtered.length} kept (${allEvents.length - filtered.length} recurring filtered out, birthdays preserved)`
  );

  return filtered.map((e) => ({
    id: e.id,
    title: e.summary || "(no title)",
    start: e.start?.dateTime || e.start?.date || null,
    end: e.end?.dateTime || e.end?.date || null,
    all_day: !!e.start?.date,
    location: e.location || null,
  }));
}

// ─── Claude + Craft MCP ─────────────────────────────────────────────────────

async function generateFocusEngineJson(calendarEvents) {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const isWeekend = ["saturday", "sunday"].includes(dayOfWeek);
  const isWorkHours = hour >= 10 && hour < 16 && !isWeekend;
  const energyBand = getEnergyBand(hour);

  const systemPrompt = `You are the Focus Engine generator for Hugo's personal life dashboard.

You select the 3 most important things Hugo should focus on RIGHT NOW and present them as engaging "quest cards" that make him want to start working.

## Data Sources
1. **Craft MCP** — Read working memory (ID: ${WORKING_MEMORY_DOC_ID}) via blocks_get with format="markdown". Contains Hugo's active projects, threads, trips, events with heat levels and context.
2. **Google Calendar** — Provided below. Upcoming events for the next 2 months.

## Slot Rules

Current time: ${now.toISOString()}
Energy band: ${energyBand}
Is weekend: ${isWeekend}
Is work hours (10am-4pm weekday): ${isWorkHours}

WEEKDAY WORK HOURS (10am-4pm):
- Slot 1: MUST be a work item
- Slot 2: Work item preferred, or high-priority personal item with deadline within 7 days
- Slot 3: Quick personal win ONLY — something doable from a desk in 5 minutes (set a reminder, send a text, quick message). NO trip planning, NO deep personal projects.

WEEKDAY AFTER 5PM:
- Slot 1: Still work if something urgent, otherwise highest priority anything
- Slots 2-3: Personal, travel, social — whatever scores highest
- Trip planning and personal projects are welcome here

WEEKENDS:
- All slots open to any category
- Work items only if deadline within 3 days

## How to Write Each Quest Card

For each of the 3 slots, generate:

**hook**: A 2-3 sentence narrative that makes Hugo WANT to engage. Write in second person ("you"). Reference specific details from working memory. Connect to what's interesting about the task, not just that it's due. Make it feel like a story continuation, not a task list.

**next_step**: The absolute smallest first action. Must be completable in under 2 minutes. Start with an imperative verb. Examples: "Open the failing test and read the assertion", "Search 'Ginza fountain pen shops' and bookmark one", "Text Mariano 'what dates work for you?'"

**effort**: "high", "medium", or "low" based on the cognitive demand of the full task (not the next_step).
- high: Deep focus work, coding, writing, complex planning
- medium: Research, coordination, moderate thinking
- low: Quick messages, simple lookups, reminders

**countdown**: Express time remaining in relative human terms. NEVER use day names ("Saturday") or calendar dates ("March 15th"). Use:
- Within 3 days: "3 days away" / "tomorrow" / "tonight"
- Within 2 weeks: "next weekend" / "2 weekends left"
- Within a month: "3 weeks out" / "just under a month"
- Further: "about 2 months"
- Exception: "this weekend" is OK because it frames planning time

**category**: "work", "personal", or "travel"

**thread_name**: The name of the working memory item this card is about

## Output

After reading working memory and calendar data, respond with ONLY the JSON below. No preamble, no markdown fences, no commentary.

{
  "generated_at": "${now.toISOString()}",
  "energy_band": "${energyBand}",
  "is_work_hours": ${isWorkHours},
  "is_weekend": ${isWeekend},
  "slots": [
    {
      "slot": 1,
      "category": "work|personal|travel",
      "thread_name": "string",
      "hook": "string",
      "next_step": "string",
      "effort": "high|medium|low",
      "countdown": "string"
    },
    { "slot": 2, "category": "work|personal|travel", "thread_name": "string", "hook": "string", "next_step": "string", "effort": "high|medium|low", "countdown": "string" },
    { "slot": 3, "category": "work|personal|travel", "thread_name": "string", "hook": "string", "next_step": "string", "effort": "high|medium|low", "countdown": "string" }
  ],
  "active_slot": 1
}

active_slot = the slot number whose effort best matches current energy:
- prime_work / high_energy → prefer high effort slot
- ramp_up / lunch_dip / transition → prefer medium effort slot
- chores / planning / wind_down → prefer low effort slot
If multiple slots match, pick the one with the most urgent countdown.`;

  const userMessage = calendarEvents.length > 0
    ? `Read Hugo's working memory from Craft, then combine with these calendar events to generate the Focus Engine JSON.

Calendar events:
${JSON.stringify(calendarEvents, null, 2)}

Current time context:
- Time: ${now.toISOString()}
- Energy band: ${energyBand}
- Work hours: ${isWorkHours}
- Weekend: ${isWeekend}
- Day: ${dayOfWeek}`
    : `Read Hugo's working memory from Craft to generate the Focus Engine JSON. No calendar events are available — rely solely on working memory for dates and context.

Current time context:
- Time: ${now.toISOString()}
- Energy band: ${energyBand}
- Work hours: ${isWorkHours}
- Weekend: ${isWeekend}
- Day: ${dayOfWeek}`;

  console.log("Calling Claude with Craft MCP connector...");

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
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage,
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

  const toolCalls = (response.body?.content ?? []).filter(
    (block) => block.type === "mcp_tool_use"
  );
  console.log(`MCP tool calls made: ${toolCalls.length}`);
  toolCalls.forEach((tc) => console.log(`  - ${tc.name}(${JSON.stringify(tc.input).slice(0, 100)})`));

  if (toolCalls.length === 0) {
    console.warn("WARNING: Claude made no MCP tool calls. Output may be hallucinated.");
  }

  const textBlocks = (response.body?.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text);

  const raw = textBlocks.join("\n").trim();
  console.log("Claude raw output preview:", raw.slice(0, 500));

  if (!raw) {
    throw new Error("Claude returned no text content. Check MCP connectivity.");
  }

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

// ─── GitHub Push ────────────────────────────────────────────────────────────

async function pushFocusEngineJson(outputJson) {
  const content = Buffer.from(
    JSON.stringify(outputJson, null, 2)
  ).toString("base64");

  const existing = await httpsRequest(
    "GET",
    "api.github.com",
    `/repos/${GITHUB_REPO}/contents/${FOCUS_ENGINE_JSON_PATH}?ref=${GITHUB_BRANCH}`,
    {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "cerebro-focus-engine-generator",
      Accept: "application/vnd.github+json",
    }
  );

  const sha = existing?.body?.sha ?? undefined;

  const payload = {
    message: `chore: update focus-engine.json [${new Date().toISOString()}]`,
    content,
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  };

  const result = await httpsRequest(
    "PUT",
    "api.github.com",
    `/repos/${GITHUB_REPO}/contents/${FOCUS_ENGINE_JSON_PATH}`,
    {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "cerebro-focus-engine-generator",
      Accept: "application/vnd.github+json",
    },
    payload
  );

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(
      `GitHub push failed (${result.status}): ${JSON.stringify(result.body)}`
    );
  }

  console.log(`Pushed focus-engine.json (status: ${result.status})`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Focus Engine Generator starting ===");

  if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  if (!GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN");

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
    console.log("Google Calendar credentials not configured, skipping.");
  }

  console.log(`Generating focus-engine.json via Claude + Craft MCP${calendarEvents.length > 0 ? " + Calendar" : ""}...`);
  const outputJson = await generateFocusEngineJson(calendarEvents);

  console.log("Pushing focus-engine.json to GitHub...");
  await pushFocusEngineJson(outputJson);

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
