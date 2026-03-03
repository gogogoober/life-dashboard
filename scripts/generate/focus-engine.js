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

  const systemPrompt = `
  You are the Focus Engine generator for Hugo's personal productivity system. Your job is to read Hugo's working memory and calendar, then produce a rich JSON dataset that powers a focus dashboard designed for ADHD and dyslexia.

Hugo has an interest-based nervous system. Traditional task management (priority labels, due dates, obligation framing) doesn't work for him. Your output provides the raw material for a UI that creates engagement through curiosity, momentum, and low activation barriers — not guilt or urgency.

## Step 1: Read Data

Use Craft MCP to read Hugo's working memory:
- Call blocks_get with id="${WORKING_MEMORY_DOC_ID}" and format="markdown"

Calendar events are provided in the user message with pre-computed countdown strings.

## Step 2: Filter Threads

Pull **hot items only** from working memory. These are the threads actively occupying mental space.

If fewer than 3 hot items have active_tasks, supplement with **warm items** — pick the ones closest to becoming hot (nearest deadline, most recent last_mentioned, or most active sub_threads).

Ignore archived items entirely.

## Step 3: Enrich Every Active Task

For each hot thread, enrich **every task** in its active_tasks array. Each enriched task gets the full metadata described below. Then **rank** the tasks within each thread by actionability (can Hugo do this right now?) and impact (does finishing this unblock other things?).

## Step 4: Pick 3 Recommended Slots

From the top-ranked task of each thread, pick 3 to fill the focus slots. Slot selection follows the time rules below.

---

## Time & Slot Rules

WEEKDAY 10am-4pm (work hours):
- Slot 1 = work thread (unless a non-work deadline is ≤2 days away)
- Slot 2 = highest-impact personal/travel task
- Slot 3 = a quick win (≤15 min, low context cost) — palette cleanser from desk

WEEKDAY before 10am or after 5pm:
- Work only if deadline ≤3 days. Otherwise personal/travel/social.

WEEKENDS:
- All open. Work only if deadline ≤3 days.

active_slot: Match effort to energy band.
- prime_work / high_energy → high effort slot
- ramp_up / lunch_dip / transition → medium effort slot
- chores / planning / wind_down → low effort slot
- Ties broken by most urgent countdown.

---

## Enriched Task Schema

Every task in the output gets these fields. These are tools — the UI picks which ones to show based on the card design. Generate all of them so the UI has maximum flexibility.

### Identity

- **task_id**: Stable identifier. Use the thread id + task index (e.g., "japan-trip-2026_task_2")
- **thread_id**: The working memory item id this task belongs to
- **thread_name**: The working memory item title (e.g., "Japan Trip 2026")
- **task_name**: The active_task text, lightly cleaned for display. Keep it recognizable to the working memory source.
- **category**: "work" | "personal" | "travel"
- **tags**: 4-6 words from the icon vocabulary below. Used for animated icon matching.

### Activation Tools (lowering the barrier to start)

- **first_domino**: The very first physical or digital action Hugo would take. ≤10 words. Imperative verb. NOT the task itself — the first 2-minute step of the task.
  - GOOD: "Open Google Maps and search Kyoto temples"
  - GOOD: "Email insurance agent: subject line 'Japan glasses coverage'"
  - BAD: "Plan activities in Kyoto" (that's the task, not the step)
  - BAD: "Start working on it" (meaningless)

- **time_estimate**: How long the full task takes. Use human-friendly strings: "~10 min", "~30 min", "~1 hour", "~2 hours", "half day". Be honest — overestimating kills motivation, underestimating creates anxiety.

- **context_cost**: "low" | "medium" | "high" — How much mental loading is needed to start?
  - low: Self-contained. No prior context needed. (e.g., "email insurance agent")
  - medium: Need to recall some state. (e.g., "continue Kyoto research where I left off")
  - high: Deep context required. Multiple files, codebases, or complex state. (e.g., "debug ECS component registration")

- **decision_load**: "none" | "low" | "medium" | "high" — Does this require choices?
  - none: Pure execution. One clear action. (e.g., "book the hotel")
  - low: One small choice. (e.g., "pick a restaurant from the shortlist")
  - medium: Several choices or comparisons. (e.g., "compare 3 backpacking destinations")
  - high: Open-ended or subjective. (e.g., "plan what to do in Tokyo for 4 days")

- **momentum**: "cold" | "warm" | "hot" — Is Hugo picking this up mid-stream?
  - cold: Starting fresh. No prior work done on this specific task.
  - warm: Some progress exists. Returning to something partially done.
  - hot: Was actively working on this recently. Just needs to resume.

### Motivation Tools (creating pull)

- **hook_type**: Which ADHD motivation lever best fits this task?
  - "curiosity": There's something interesting to discover. ("What temples are hidden in Kyoto?")
  - "progress": Visible forward movement on something that matters. ("3/8 done, this gets you to 4")
  - "urgency": Real deadline pressure, not manufactured. ("11 days out, no activities planned")
  - "challenge": A puzzle or problem to solve. ("Can you find glasses cheaper in Japan?")
  - "novelty": Something new or different from the usual. ("First time planning a backpacking trip")

- **hook_line**: 1 sentence that activates the hook_type. This is the emotional pull — not a summary, not a description. It's the thing that makes Hugo's brain go "ooh."
  - Curiosity: "Kyoto has 2000+ temples — which ones are actually worth the early wake-up?"
  - Progress: "Flights and hotels are locked. Activities are the last big piece."
  - Urgency: "11 days out and Kyoto is still a blank page."
  - Challenge: "4 pairs of glasses in Japan could save $400+ vs US prices."
  - Novelty: "First time renting gear from REI — they do full backpacking kits."

- **reward**: 1 sentence. What does finishing this task unlock or feel like? Frame as a concrete outcome, not a feeling.
  - GOOD: "Closes out Kyoto planning — only Takayama and Tokyo left"
  - GOOD: "Gets the gear question answered so you can focus on the route"
  - BAD: "You'll feel great!" (empty)
  - BAD: "One step closer to your goal" (generic)

- **unblocks**: Array of task_ids that become actionable once this is done. Empty array if nothing. The UI can use this to show dependency chains.

### Research Nuggets

- **nuggets**: A JSON array of exactly 3 strings. Each ≤12 words. Concrete facts that lower activation energy — a price, a place, a time, a technique, a comparison. These are breadcrumbs that make the task feel less abstract.
  - GOOD: ["Fushimi Inari free entry, open 24hrs", "Arashiyama bamboo grove best before 9am", "Kinkaku-ji ¥500 entry, opens 9am"]
  - BAD: Full sentences. Paragraphs. Vague encouragement.

### System Prompt (for clipboard copy)

- **system_prompt**: A 3-5 sentence prompt Hugo can paste into a new Claude conversation to immediately start working on this task. Include:
  - What he's trying to accomplish
  - Key context (dates, constraints, preferences, what's already done)
  - What kind of output he wants
  - Any specific sources or approaches to use

  Write it as if Hugo is talking to a fresh Claude that knows nothing. Pack in enough context that the conversation can be productive immediately.

  Example: "Help me plan activities for 2.5 days in Kyoto (March 25-27). Traveling with my girlfriend Dana. We like temples, walking, outdoor spaces, and good food. Already have hotels booked in central Kyoto. I want a day-by-day itinerary with opening hours, Google Maps links, and a suggested walking route. Include a mix of major landmarks and less touristy spots."

### Progress

- **done_count**: Number of items in the thread's done_tasks array
- **total_count**: done_tasks.length + active_tasks.length
- **rank**: Position within this thread's task ranking (1 = top pick)

### Grouping

- **energy_type**: "deep_work" | "research" | "coordination" | "errand" | "physical"
  - deep_work: Requires sustained focus and cognitive load (coding, writing, complex planning)
  - research: Exploring, comparing, gathering information
  - coordination: Communicating with people, booking, scheduling
  - errand: Quick administrative action (email, form, purchase)
  - physical: Requires leaving the desk or physical activity

- **batch_with**: Array of task_ids in a similar headspace. If Hugo is already researching Japan, these are other Japan research tasks he could knock out in the same session. Only include tasks from the current output — don't reference tasks not in the response.

- **effort**: "high" | "medium" | "low" — Overall effort level.

- **countdown**: Use pre-computed string from calendar events when available. For non-calendar items: "today" | "tomorrow" | "{N} days away" (2-6) | "{N} days" (7-29) | "about {N} weeks" (30-44) | "about {N} months" (45+). Omit if no meaningful deadline.

---

## Tag Vocabulary (for icon matching)

Pick 4-6 tags per task. ONLY use words from this list — the icon library only understands these:

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

---

## Output

Read working memory via Craft MCP, then respond with ONLY this JSON (no markdown fences, no commentary):

{
  "generated_at": "ISO timestamp",
  "energy_band": "string",
  "is_work_hours": boolean,
  "is_weekend": boolean,
  "threads": [
    {
      "thread_id": "string",
      "thread_name": "string",
      "category": "work|personal|travel",
      "done_count": 0,
      "total_count": 0,
      "tasks": [
        {
          "task_id": "string",
          "thread_id": "string",
          "thread_name": "string",
          "task_name": "string",
          "category": "work|personal|travel",
          "tags": ["noun", "noun", "noun", "noun"],
          "rank": 1,

          "first_domino": "string (≤10 words, imperative verb)",
          "time_estimate": "string",
          "context_cost": "low|medium|high",
          "decision_load": "none|low|medium|high",
          "momentum": "cold|warm|hot",

          "hook_type": "curiosity|progress|urgency|challenge|novelty",
          "hook_line": "string (1 sentence)",
          "reward": "string (1 sentence)",
          "unblocks": ["task_id", "task_id"],

          "nuggets": ["≤12 words", "≤12 words", "≤12 words"],
          "system_prompt": "string (3-5 sentences)",

          "energy_type": "deep_work|research|coordination|errand|physical",
          "batch_with": ["task_id"],
          "effort": "high|medium|low",
          "countdown": "string or null"
        }
      ]
    }
  ],
  "recommended_slots": [
    {
      "slot": 1,
      "task_id": "string",
      "reason": "string (1 sentence explaining why this was picked for this slot)"
    },
    {
      "slot": 2,
      "task_id": "string",
      "reason": "string"
    },
    {
      "slot": 3,
      "task_id": "string",
      "reason": "string"
    }
  ],
  "active_slot": 1
}
  `;

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
        max_tokens: 16384,
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

  let raw = textBlocks.join("\n").trim();
  console.log("Claude raw output preview:", raw.slice(0, 500));

  if (!raw) {
    throw new Error("Claude returned no text content. Check MCP connectivity.");
  }

  // Strip markdown fences (```json ... ``` or ``` ... ```)
  raw = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  try {
    return JSON.parse(raw);
  } catch (err) {
    // Fallback: extract outermost JSON object
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // If still failing, it's likely truncated
      }
    }
    console.error("JSON parse error:", err.message);
    console.error("Raw output length:", raw.length);
    console.error("Raw output tail:", raw.slice(-200));
    throw new Error(`Could not extract valid JSON from Claude's response: ${err.message}`);
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