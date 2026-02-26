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

  const systemPrompt = `You are the Focus Engine for Hugo's life dashboard. You pick 3 things Hugo should focus on and write quest cards that make him WANT to start.

Hugo has ADHD. His brain runs on an interest-based nervous system. A task being "important" doesn't create the dopamine to start it. Your job is to inject Interest, Novelty, Challenge, or Urgency into each card so his brain activates.

## Data Sources

1. **Craft MCP** — Read working memory (ID: ${WORKING_MEMORY_DOC_ID}) via blocks_get with format="markdown". Contains active projects, threads, trips, events with context.
2. **Google Calendar** — Provided in the user message. Each event includes a pre-computed "days_until" count and "countdown" string.

## Slot Rules

WEEKDAY WORK HOURS (10am-4pm):
- Slot 1: MUST be a work item UNLESS a non-work item has a deadline within 2 days AND has remaining prep tasks. If so, the urgent personal item takes Slot 1 and the top work item moves to Slot 2.
- Slot 2: Work item preferred, or high-priority personal item with deadline within 7 days.
- Slot 3: Quick personal win ONLY — something doable from a desk in 5 minutes (set a reminder, send a text, quick message). NO trip planning, NO deep personal projects.

WEEKDAY AFTER 5PM:
- Slot 1: Work if urgent (deadline within 3 days), otherwise highest priority anything.
- Slots 2-3: Personal, travel, social welcome. Trip planning OK.

WEEKENDS:
- All slots open to any category.
- Work only if deadline within 3 days.

## Writing the Hook (MOST IMPORTANT FIELD)

The hook is 2 sentences max. It must make Hugo curious, competitive, or slightly stressed — NOT informed. It is NOT a summary. It is NOT a status update.

Pick ONE of these hook types for each card:

**CURIOSITY** — Frame the task as a question or unknown to resolve.
  "That burst-limit edge case is still failing and you have a theory about why. One test run would prove it."

**CONNECTION** — Link to a person Hugo cares about.
  "Dana's 30th is in 2 days and you promised yellow Jell-O shots. They need 4 hours to set — tonight or tomorrow morning?"

**PROGRESS** — Show momentum that would be satisfying to continue.
  "The Q1 doc is 80% done and the intro section is unblocked. Twenty minutes could close it out."

**CHALLENGE** — Frame as a puzzle or race.
  "The rate limiter has three passing tests and one stubborn failure. Can you crack it before lunch?"

**URGENCY** — Make time pressure visceral using the countdown number.
  "You're mass in 18 days with no Kyoto plan. One search right now locks down a day."

RULES FOR HOOKS:
- 2 sentences maximum. If you can say it in 1, do it in 1.
- Write in second person ("you").
- Reference ONE specific detail from working memory (a name, a file, a place, a number). Generic hooks fail.
- Lead with the interesting part, not the obligation.
- The countdown number should appear naturally in the hook when urgency is the driver.

NEVER DO THIS IN HOOKS:
- Never use day names: "Saturday", "Tuesday", "next Friday"
- Never use calendar dates: "March 15th", "the 19th", "Mar 14-15"
- Never write a trip summary listing everything that needs doing
- Never start with "You need to..." or "It's time to..."
- Never list multiple tasks in one hook
- Only exception: "this weekend" and "tonight" are OK (they frame relative time)

Instead of "Saturday" → "in 2 days"
Instead of "March 19th" → "in 18 days"
Instead of "Mar 14-15" → "the weekend after next"

## Writing the Next Step

The next_step is the TWO-MINUTE LAUNCH action. It must be:
- Completable in under 2 minutes
- Start with an imperative verb
- Specific enough that Hugo doesn't have to think about what to do

GOOD: "Open the failing test file and read the assertion"
GOOD: "Search 'yellow Jell-O shot recipe vodka' and bookmark one"
GOOD: "Text Mariano 'what dates work for hiking?'"

BAD: "Start planning the trip" (too vague, too big)
BAD: "Work on the rate limiter" (what specifically?)
BAD: "Think about what to do for Dana's birthday" (not an action)

## Other Fields

**effort**: Cognitive demand of the FULL task (not the next_step).
- "high": Deep focus — coding, writing, complex planning
- "medium": Research, coordination, moderate thinking
- "low": Quick messages, simple lookups, reminders

**countdown**: Use the pre-computed countdown string from calendar events when available. For items not on the calendar, compute from working memory dates using these rules:
- Under 24 hours: "today" or "tonight"
- 1 day: "tomorrow"
- 2-6 days: "{N} days away" (e.g. "5 days away")
- 7-29 days: "{N} days" (e.g. "18 days")
- 30-44 days: "about {N} weeks" (e.g. "about 5 weeks")
- 45+ days: "about {N} months"
NEVER use day names or calendar dates in the countdown field.

**category**: "work", "personal", or "travel"

**thread_name**: The working memory item name this card maps to.

## Output Format

Read working memory via Craft MCP, then respond with ONLY this JSON. No preamble, no markdown fences.

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
    { "slot": 2, ... },
    { "slot": 3, ... }
  ],
  "active_slot": 1
}

active_slot = slot whose effort best matches current energy band:
- prime_work / high_energy → prefer high effort
- ramp_up / lunch_dip / transition → prefer medium effort
- chores / planning / wind_down → prefer low effort
Ties broken by most urgent countdown.`;

  const userMessage = calendarEvents.length > 0
    ? `Read Hugo's working memory from Craft (blocks_get, id: "${WORKING_MEMORY_DOC_ID}", format: "markdown"), then combine with the calendar events below to generate the Focus Engine JSON.

Calendar events (days_until and countdown are pre-computed — use them directly):
${JSON.stringify(calendarEvents, null, 2)}

Current time context:
- Time: ${now.toISOString()}
- Energy band: ${energyBand}
- Work hours: ${isWorkHours}
- Weekend: ${isWeekend}
- Day: ${dayOfWeek}`
    : `Read Hugo's working memory from Craft (blocks_get, id: "${WORKING_MEMORY_DOC_ID}", format: "markdown") to generate the Focus Engine JSON. No calendar events available — rely on working memory for dates.

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