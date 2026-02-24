#!/usr/bin/env node

/**
 * Up Next Generator
 *
 * Runs frequently (e.g. every hour, after dashboard generator).
 * Uses Claude with Craft MCP connector to read working memory + config,
 * then generates up_next.json — a compact daily briefing with:
 *   - Active threads (max 3, context-aware)
 *   - Pickup notes (where you left off)
 *   - Habit status (ok / late / severe)
 *   - Smart priorities (max 2 alerts)
 * Commits up_next.json to GitHub so the site re-renders.
 */

import https from "https";

// ─── Config ────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const GITHUB_REPO = "gogogoober/life-dashboard";
const GITHUB_BRANCH = "main";
const UP_NEXT_JSON_PATH = "public/up_next.json";

const CRAFT_MCP_URL = "https://mcp.craft.do/links/8pMZhXonzqg/mcp";
const CRAFT_MCP_NAME = "craft";
const WORKING_MEMORY_DOC_ID = "FC9D77DC-45EB-4EBA-B7F5-3F6F7BEB9DD0";
const CONFIG_DOC_ID = "15AD13D1-F413-41F9-B2CD-1F9B51E1EB1C";

const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

// Delay before calling Claude API (seconds). Prevents rate-limit collisions
// when this workflow is triggered right after Dashboard Generator completes.
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

// ─── Claude + Craft MCP ─────────────────────────────────────────────────────

async function generateUpNextJson() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const hour = now.getHours();
  const dayOfWeek = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
  const isWeekend = ["saturday", "sunday"].includes(dayOfWeek);
  const after6pm = hour >= 18;
  const timeOfDay =
    hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  const systemPrompt = `You are the Up Next agent for Hugo's personal life dashboard.
Your job is to produce a single up_next.json file.
Be decisive. Do not hedge. Hugo trusts you to make the call.

You have access to Craft via MCP tools. Read these documents first:
1. Working memory — use blocks_get with id="${WORKING_MEMORY_DOC_ID}" and format="markdown"
2. Config — use blocks_get with id="${CONFIG_DOC_ID}" and format="markdown"

## CURRENT DATETIME
- ISO: ${now.toISOString()}
- Date: ${today}
- Day: ${dayOfWeek}
- Time of day: ${timeOfDay}
- Is weekend: ${isWeekend}
- After 6pm: ${after6pm}

## CONTEXT RULES

Use these to decide what to surface:

WEEKDAY BEFORE 18:00
→ Prioritize work items. Personal only if deadline is within 7 days.

WEEKDAY AFTER 18:00
→ Shift to personal. Work only if severely urgent or deadline tomorrow.

WEEKEND
→ Personal-first. Suppress work items UNLESS:
  - persist_weekend = true on a left_off entry
  - A work deadline is within 3 days
  - Daily note contains signal like "working this weekend" or "urgent"

## ACTIVE THREADS

Select max 3 items from working_memory items where heat = "hot" or "warm".
Apply context rules above.

Each thread must have:
- task: the most actionable next step (not the project title)
- epic: the item title (shown as a pill)
- category: work | personal
- left_off: pull from left_off section if thread_id matches, else derive from open_actions
- left_off_date: from left_off entry or today if derived
- urgency: active | waiting | nudge

## PICKUP NOTES

Pull from left_off entries in working memory.
Summarize into max 2 plain-language bullets.
If no declared left_off entries exist, derive from the top active thread's open_actions.
Keep each bullet under 10 words.

## HABITS

For each habit in habit_tracking:
- Compare completions against target_days for the current week
- Compute days elapsed since week_start
- Assign state:
  ok      → completed or not yet due
  late    → past expected day, not done
  severe  → 2+ days past expected day, not done

## SMART PRIORITIES

Select max 2 items that need attention RIGHT NOW.
These are separate from active threads — think of them as alerts.
Criteria: approaching deadline, stalled item, pending communication.
Each needs:
- label: item title
- reason: one phrase, max 8 words, why it matters right now
- urgency: high | medium

## OUTPUT FORMAT

After reading working memory and config, respond with ONLY valid JSON.
No explanation. No markdown. No code fences. No text before or after.

{
  "generated_at": "<ISO timestamp>",
  "context": {
    "day_of_week": "${dayOfWeek}",
    "time_of_day": "${timeOfDay}",
    "is_weekend": ${isWeekend},
    "after_6pm": ${after6pm}
  },
  "active_threads": [
    {
      "task": "string — most actionable next step",
      "epic": "string — item title",
      "category": "work|personal",
      "left_off": "string — where you left off",
      "left_off_date": "string — e.g. Feb 21",
      "urgency": "active|waiting|nudge"
    }
  ],
  "pickup_notes": ["string max 10 words", "string max 10 words"],
  "habits": [
    { "id": "workout", "state": "ok|late|severe" },
    { "id": "laundry", "state": "ok|late|severe" },
    { "id": "cleaning", "state": "ok|late|severe" }
  ],
  "smart_priorities": [
    {
      "label": "string — item title",
      "reason": "string — max 8 words",
      "urgency": "high|medium"
    }
  ]
}`;

  console.log("Calling Claude with Craft MCP connector...");

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
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content:
            "Read working memory and config from Craft, then generate the up_next.json output.",
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
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not extract valid JSON from Claude's response.");
  }
}

// ─── GitHub Push ────────────────────────────────────────────────────────────

async function pushUpNextJson(upNextJson) {
  const content = Buffer.from(
    JSON.stringify(upNextJson, null, 2)
  ).toString("base64");

  const existing = await httpsRequest(
    "GET",
    "api.github.com",
    `/repos/${GITHUB_REPO}/contents/${UP_NEXT_JSON_PATH}?ref=${GITHUB_BRANCH}`,
    {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "cerebro-up-next-generator",
      Accept: "application/vnd.github+json",
    }
  );

  const sha = existing?.body?.sha ?? undefined;

  const payload = {
    message: `chore: update up_next.json [${new Date().toISOString()}]`,
    content,
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  };

  const result = await httpsRequest(
    "PUT",
    "api.github.com",
    `/repos/${GITHUB_REPO}/contents/${UP_NEXT_JSON_PATH}`,
    {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "cerebro-up-next-generator",
      Accept: "application/vnd.github+json",
    },
    payload
  );

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(
      `GitHub push failed (${result.status}): ${JSON.stringify(result.body)}`
    );
  }

  console.log(`Pushed up_next.json (status: ${result.status})`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Up Next Generator starting ===");

  if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  if (!GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN");

  console.log(`Waiting ${STARTUP_DELAY_SECONDS}s for rate limit cooldown...`);
  await sleep(STARTUP_DELAY_SECONDS);
  console.log("Cooldown complete, proceeding.");

  console.log("Generating up_next.json via Claude + Craft MCP...");
  const upNextJson = await generateUpNextJson();

  console.log("Pushing up_next.json to GitHub...");
  await pushUpNextJson(upNextJson);

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});