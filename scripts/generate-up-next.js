#!/usr/bin/env node

/**
 * Up Next Generator
 *
 * Runs after Dashboard Generator. Uses Claude with Craft MCP connector
 * to read working memory + config, then generates up_next.json.
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
// when this job runs right after Dashboard Generator completes.
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

  // ── System prompt: who you are and what tools to use ──────────────
  const systemPrompt = `You are the Up Next agent for Hugo's personal life dashboard called Cerebro.
Be decisive. Do not hedge. Hugo trusts you to make the call.

You MUST use MCP tools to read Hugo's actual data before generating output.
Do NOT invent or assume any data. Every field must come from what you read.`;

  // ── User message: step-by-step instructions ───────────────────────
  const userMessage = `## STEP 1: READ DATA FROM CRAFT

Use MCP tools now. Make both calls before doing anything else:

Call 1: blocks_get with id="${WORKING_MEMORY_DOC_ID}" and format="markdown"
Call 2: blocks_get with id="${CONFIG_DOC_ID}" and format="markdown"

Read the responses carefully. All output must be derived from this data.

## STEP 2: APPLY CONTEXT RULES

Current datetime: ${now.toISOString()}
Today: ${today}
Day: ${dayOfWeek}
Time of day: ${timeOfDay}
Is weekend: ${isWeekend}
After 6pm: ${after6pm}

Use these rules to decide what to surface:

WEEKDAY BEFORE 18:00
→ Prioritize work items. Personal only if deadline is within 7 days.

WEEKDAY AFTER 18:00
→ Shift to personal. Work only if severely urgent or deadline tomorrow.

WEEKEND
→ Personal-first. Suppress work items UNLESS:
  - persist_weekend = true on a left_off entry
  - A work deadline is within 3 days

## STEP 3: BUILD EACH SECTION

### active_threads (max 3)
Select from working_memory items where heat = "hot" or "warm".
For each, provide:
- task: the specific next action to take (imperative verb, not the project name)
- epic: the working memory item title
- category: "work" or "personal" based on the item's tag
- left_off: what was last done on this thread, from left_off entries or sub_threads
- left_off_date: when that happened, e.g. "Feb 21"
- urgency: "active" if actionable now, "waiting" if blocked, "nudge" if needs follow-up

### pickup_notes (max 2)
Short bullets (under 10 words each) summarizing where Hugo left off.
Pull from left_off entries in working memory.
If none exist, derive from the top thread's open_actions.

### habits
For each habit in the config's habits section, check habit_tracking in working memory.
Compare completions this week against target_days and the current day of week.
- "ok": completed or not yet due this week
- "late": past an expected day without completion
- "severe": 2+ days past expected without completion

### smart_priorities (max 2)
Items needing attention NOW. Different from active_threads — these are alerts.
Look for: approaching deadlines, stalled items (no activity in days), pending replies.
- label: the item name
- reason: max 8 words explaining why it's urgent
- urgency: "high" or "medium"

## STEP 4: OUTPUT

After reading the data and applying rules, respond with ONLY the JSON object below.
No explanation before or after. No markdown fences. No commentary.
Fill every field with real data from what you read in Step 1.

{
  "generated_at": "${now.toISOString()}",
  "context": {
    "day_of_week": "${dayOfWeek}",
    "time_of_day": "${timeOfDay}",
    "is_weekend": ${isWeekend},
    "after_6pm": ${after6pm}
  },
  "active_threads": [],
  "pickup_notes": [],
  "habits": [],
  "smart_priorities": []
}

Remember: the arrays above are empty placeholders. You must fill them with real data from Craft.`;

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

  console.log("Claude response status:", response.status);

  if (response.status !== 200) {
    console.error(
      "Claude API error:",
      JSON.stringify(response.body, null, 2).slice(0, 1000)
    );
    throw new Error(`Claude API returned status ${response.status}`);
  }

  // Log MCP tool calls for debugging
  const toolCalls = (response.body?.content ?? []).filter(
    (block) => block.type === "mcp_tool_use"
  );
  console.log(`MCP tool calls made: ${toolCalls.length}`);
  toolCalls.forEach((tc) => console.log(`  - ${tc.name}(${JSON.stringify(tc.input).slice(0, 100)})`));

  if (toolCalls.length === 0) {
    console.warn("WARNING: Claude made no MCP tool calls. Output may be hallucinated.");
  }

  // Extract text blocks (the final JSON output)
  const textBlocks = (response.body?.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text);

  const raw = textBlocks.join("\n").trim();
  console.log("Claude raw output preview:", raw.slice(0, 500));

  if (!raw) {
    throw new Error("Claude returned no text content. Check MCP connectivity.");
  }

  // Parse JSON — try direct first, then extract from mixed output
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