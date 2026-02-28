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

function daysUntil(dateStr) {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatCountdown(days) {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 6) return `${days} days away`;
  if (days <= 29) return `${days} days`;
  if (days <= 44) return `about ${Math.round(days / 7)} weeks`;
  return `about ${Math.round(days / 30)} months`;
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

  return filtered.map((e) => {
    const startDate = e.start?.dateTime || e.start?.date || null;
    const days = startDate ? daysUntil(startDate) : null;

    return {
      id: e.id,
      title: e.summary || "(no title)",
      start: startDate,
      end: e.end?.dateTime || e.end?.date || null,
      all_day: !!e.start?.date,
      location: e.location || null,
      days_until: days,
      countdown: days !== null ? formatCountdown(days) : null,
    };
  });
}

// ─── Claude + Craft MCP ─────────────────────────────────────────────────────

async function generateFocusEngineJson(calendarEvents) {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const isWeekend = ["saturday", "sunday"].includes(dayOfWeek);
  const isWorkHours = hour >= 10 && hour < 16 && !isWeekend;
  const energyBand = getEnergyBand(hour);

  const systemPrompt = `You are the Focus Engine for Hugo's life dashboard. Pick 3 things Hugo should focus on. Write quest cards that lower activation energy for his ADHD brain.

## Data Sources

1. **Craft MCP** — Read working memory (ID: ${WORKING_MEMORY_DOC_ID}) via blocks_get with format="markdown".
2. **Google Calendar** — Provided in user message with pre-computed countdown strings.

## Slot Rules

WEEKDAY 10am-4pm: Slot 1 = work (unless non-work deadline ≤2 days). Slot 3 = quick 5-min personal win from desk.
WEEKDAY after 5pm: Work only if deadline ≤3 days. Otherwise personal/travel/social.
WEEKENDS: All open. Work only if deadline ≤3 days.

## Card Fields

### next_step (CTA — shown at TOP of card)

THE MOST IMPORTANT FIELD. This is what Hugo sees first.

HARD LIMIT: 10 words max. Imperative verb. Specific action.

GOOD: "Save Fushimi Inari + Arashiyama to Kyoto doc"
GOOD: "Create ComponentStore struct in ECS repo"
GOOD: "Search warm March backpacking destinations near Chicago"
GOOD: "Text Mariano about restaurant picks"

BAD: "Search 'March weather Zion vs Big Bend vs Joshua Tree' and save the best option to your Chicago Craft doc" (way too long)
BAD: "Start planning" (too vague)
BAD: "Work on it" (meaningless)

### answer (research nuggets — shown as 3 bullet points)

A JSON array of exactly 3 strings. Each string ≤12 words. Short punchy facts that lower activation energy. Each bullet is one concrete nugget — a price, a place, a technique, a fact.

FORMAT: ["bullet one", "bullet two", "bullet three"]

GOOD:
["Pilot CH92 — ¥11k (~$110) vs $180 in US", "Sailor Pro Gear Slim — ¥13k in Japan", "Itoya Ginza — 12-floor stationery, one-stop"]

GOOD:
["Zion 60-70°F mid-March, best warm option", "REI rents full kits ~$50-70/weekend", "Chicago Lincoln Park REI has gear pickup"]

BAD: Full sentences. Paragraphs. Repeating what working memory already says.

### question (the reminder — shown at BOTTOM of card)

1-2 sentences. WHAT needs doing and WHY now. Use gap/status/commitment/deadline framing. Use countdown numbers for urgency. NEVER use day names or calendar dates.

### Other fields

- **effort**: "high" (deep focus), "medium" (research/coordination), "low" (quick action)
- **countdown**: Use pre-computed string from calendar. For non-calendar items, format as: "today"/"tomorrow"/"{N} days away" (2-6)/"{N} days" (7-29)/"about {N} weeks" (30-44)/"about {N} months" (45+)
- **category**: "work", "personal", or "travel"
- **thread_name**: Working memory item name
- **tags**: Pick 4-6 words ONLY from this vocabulary (the icon library only understands these):

  Outdoor: backpack, camping, hiking, mountain, trail, forest, campfire, climb, nature, wildlife, safari, binoculars
  Travel: airplane, airport, flight, suitcase, luggage, passport, map, landmark, hotel, boat, cruise, ferry
  Japan: japan, temple, shrine, torii, pagoda, origami
  Tech: computer, laptop, code, keyboard, desk, programming, software, robot, dashboard
  Writing: pen, ink, writing, notebook, quill, book, reading, art, paint, brush, canvas
  Food: cooking, kitchen, food, dinner, meal, breakfast, plate
  Fitness: gym, exercise, yoga, swimming, cycling, running, barbell, dumbbell, boxing
  Music: music, concert, cinema, camera, film, karaoke, arcade, gaming
  Events: birthday, party, celebration, wedding, gift, meeting, conference
  Nature: beach, island, ocean, snow, rain, lake, river, sun
  Home: home, garden, bed, bathroom, cleaning, laundry, furniture
  Finance: money, bank, chart, contract, document, calendar

  Examples:
  - Backpacking trip → ["backpack", "mountain", "hiking", "camping", "trail", "nature"]
  - Japan Kyoto → ["japan", "temple", "shrine", "torii", "landmark", "map"]
  - Fountain pens → ["pen", "ink", "writing", "notebook", "japan", "art"]
  - Go ECS project → ["computer", "code", "laptop", "programming", "keyboard", "dashboard"]

## Output

Read working memory via Craft MCP, then respond with ONLY this JSON (no markdown fences):

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
      "question": "string (1-2 sentences)",
      "answer": ["≤12 words", "≤12 words", "≤12 words"],
      "next_step": "string (≤10 words, imperative verb)",
      "effort": "high|medium|low",
      "countdown": "string",
      "tags": ["noun", "noun", "noun", "noun"]
    }
  ],
  "active_slot": 1
}

active_slot: match effort to energy band. prime_work/high_energy → high effort. ramp_up/lunch_dip/transition → medium. chores/planning/wind_down → low. Ties broken by most urgent countdown.`;

  const userMessage = calendarEvents.length > 0
    ? `Read Hugo's working memory from Craft (blocks_get, id: "${WORKING_MEMORY_DOC_ID}", format: "markdown"), then combine with calendar events below to generate Focus Engine JSON.

Calendar events:
${JSON.stringify(calendarEvents, null, 2)}

Time context: ${now.toISOString()} | ${energyBand} | work_hours=${isWorkHours} | weekend=${isWeekend} | ${dayOfWeek}`
    : `Read Hugo's working memory from Craft (blocks_get, id: "${WORKING_MEMORY_DOC_ID}", format: "markdown") to generate Focus Engine JSON. No calendar events — use working memory dates.

Time context: ${now.toISOString()} | ${energyBand} | work_hours=${isWorkHours} | weekend=${isWeekend} | ${dayOfWeek}`;

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