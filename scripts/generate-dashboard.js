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
    singleEvents: "true",       // expand recurring into individual instances
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

  // Filter OUT recurring event instances — keep one-off events + birthdays
  const isBirthday = (e) =>
    (e.summary || "").toLowerCase().includes("birthday");
  const filtered = allEvents.filter((e) => !e.recurringEventId || isBirthday(e));

  console.log(
    `Calendar: ${allEvents.length} total events, ${filtered.length} kept (${allEvents.length - filtered.length} recurring filtered out, birthdays preserved)`
  );

  // Simplify to what Claude needs
  return filtered.map((e) => ({
    id: e.id,
    title: e.summary || "(no title)",
    description: e.description || null,
    location: e.location || null,
    start: e.start?.dateTime || e.start?.date || null, // dateTime for timed, date for all-day
    end: e.end?.dateTime || e.end?.date || null,
    all_day: !!e.start?.date,
    status: e.status,                                   // confirmed, tentative, cancelled
    attendees: (e.attendees || [])
      .filter((a) => !a.self)
      .map((a) => a.displayName || a.email),
    creator: e.creator?.displayName || e.creator?.email || null,
  }));
}

// ─── Claude + Craft MCP ─────────────────────────────────────────────────────

async function generateDashboardJson(calendarEvents) {
  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are the Dashboard Generator for a personal productivity system called Cerebro.

You have two data sources:
1. **Craft (via MCP tools)** — Read the working memory document (ID: ${WORKING_MEMORY_DOC_ID}) using blocks_get with format "markdown". This contains items actively occupying mental space, with heat levels, sub-threads, and open actions.
2. **Google Calendar events** — Provided in the user message below. These are one-off (non-recurring) events for the next 2 months, plus any recurring birthdays.

## CRITICAL: Intelligent Merge Rules

You MUST intelligently merge these two data sources. Never show the same thing twice.

### Step 1: Match calendar events to working memory items
Look for semantic matches — shared keywords, overlapping dates, contextual clues. Examples:
- A calendar event called "JAPAN!" and a working memory item called "Japan Trip 2026" are the SAME thing
- A calendar event called "Chicago" and a working memory item about a Chicago trip are the SAME thing
- Use fuzzy matching: "JAPAN!", "Japan Trip", "Flight to Osaka" all relate to the same trip

### Step 2: For matched trips/events — merge, don't duplicate
When a calendar event matches a working memory item:
- The item goes in "items" ONCE with all the working memory context (summary, sub_threads, open_actions, heat, etc.)
- **Use the calendar dates as the source of truth** for the item's start/end dates. Override the working memory deadline with the actual calendar start date.
- Do NOT also put the trip block (e.g. "JAPAN!" or "Chicago") in calendar_events — it's already represented in items.

### Step 3: Flights, hotels, and logistics stay as separate calendar_events
Even though flights and hotel stays are part of a trip, keep them as individual entries in "calendar_events" with their specific times and locations. These are actionable/time-specific:
- "Flight to Taipei (BR 55)" → separate calendar_event, linked to parent trip via related_item_id
- "Stay at Travelodge Kyoto" → separate calendar_event, linked via related_item_id
- "Flight to Honolulu (ZG 2)" → separate calendar_event, linked via related_item_id

### Step 4: Standalone calendar events
Calendar events with NO working memory match go into "calendar_events" as standalone entries:
- Birthdays, appointments, social events, etc.
- Set related_item_id to null

### Step 5: Standalone working memory items
Working memory items with NO calendar match (e.g. a coding project) go into "items" as-is with their original dates.

### Summary of what goes where:
- "items": Working memory items (enriched with calendar dates when matched). ONE entry per concept.
- "calendar_events": Flights, hotels, logistics (linked to parent item), birthdays, appointments, and anything from the calendar that isn't already represented in items.

## Weighting & Dates

- For calendar_events: assign weight 1-10 based on significance. Multi-day trips=8-10, flights=6-7, birthdays=5, appointments=3, hotel stays=4.
- Calculate days_until and days_until_deadline relative to today.
- For items with a matched calendar event, set the deadline to the calendar's start date (the departure date for trips).

Return ONLY valid JSON. No explanation. No markdown fences. No other text.

## Schema

{
  "generated_at": "<ISO timestamp>",
  "items": [
    {
      "id": "string",
      "title": "string",
      "category": "active-research | project | action-item | trip-event | people",
      "tag": "personal | work | both",
      "heat": "hot | warm | archived",
      "heat_reason": "string",
      "summary": "string",
      "sub_threads": ["string"],
      "open_actions": ["string"],
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null",
      "deadline": "YYYY-MM-DD or null",
      "pinned": true,
      "days_until_deadline": number | null,
      "calendar_source": true | false
    }
  ],
  "calendar_events": [
    {
      "id": "string",
      "title": "string",
      "type": "flight | hotel | appointment | birthday | social | logistics | other",
      "start": "ISO datetime or YYYY-MM-DD",
      "end": "ISO datetime or YYYY-MM-DD",
      "all_day": true | false,
      "location": "string or null",
      "description": "string or null",
      "attendees": ["string"],
      "weight": 1-10,
      "days_until": number,
      "related_item_id": "string or null"
    }
  ],
  "habit_tracking": {
    "week_start": "YYYY-MM-DD",
    "habits": [
      {
        "id": "string",
        "completions": ["mon"],
        "status": "done | partial | missed | pending"
      }
    ]
  },
  "meta": {
    "hot_count": 0,
    "warm_count": 0,
    "archived_count": 0,
    "upcoming_events_count": 0
  }
}

Today's date: ${today}`;

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
          content: `Read the working memory from Craft, then combine it with these calendar events to generate the dashboard JSON.

## Google Calendar Events (next 2 months, non-recurring + birthdays)

${JSON.stringify(calendarEvents, null, 2)}`,
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

  // Extract text blocks (skip mcp_tool_use / mcp_tool_result)
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
    const clean = raw.replace(/```json\n?|```\n?/g, "").trim();
    return JSON.parse(clean);
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
  if (!GOOGLE_CLIENT_ID) throw new Error("Missing GOOGLE_CLIENT_ID");
  if (!GOOGLE_CLIENT_SECRET) throw new Error("Missing GOOGLE_CLIENT_SECRET");
  if (!GOOGLE_REFRESH_TOKEN) throw new Error("Missing GOOGLE_REFRESH_TOKEN");

  console.log("Fetching Google Calendar events...");
  const accessToken = await getGoogleAccessToken();
  const calendarEvents = await fetchCalendarEvents(accessToken);
  console.log(`Got ${calendarEvents.length} one-off events for next 2 months`);

  console.log("Generating dashboard JSON via Claude + Craft MCP + Calendar...");
  const dashboardJson = await generateDashboardJson(calendarEvents);

  console.log("Pushing dashboard.json to GitHub...");
  await pushDashboardJson(dashboardJson);

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});