#!/usr/bin/env node

/**
 * Focus Engine Generator
 *
 * Reads working memory from Craft via MCP, then uses Claude to select
 * 3 quest cards — the most important threads to surface right now.
 * Pushes focus-engine.json to GitHub so the dashboard can render them.
 */

import https from "https";

// ─── Config ────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const GITHUB_REPO = "gogogoober/life-dashboard";
const GITHUB_BRANCH = "main";
const OUTPUT_JSON_PATH = "public/focus-engine.json";

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

// ─── Energy Band ─────────────────────────────────────────────────────────────

function getEnergyBand(hour) {
  if (hour < 10) return "ramp_up";
  if (hour < 13) return "prime_work";
  if (hour < 14) return "lunch_dip";
  if (hour < 17) return "high_energy";
  if (hour < 18) return "chores";
  if (hour < 19) return "planning";
  return "wind_down";
}

// ─── Claude + Craft MCP ─────────────────────────────────────────────────────

async function generateFocusEngineJson() {
  const now = new Date();
  const hour = now.getHours();
  const energyBand = getEnergyBand(hour);

  const systemPrompt = `You are the Focus Engine generator for Hugo's personal life dashboard called Cerebro.

Your job is to read Hugo's working memory and select the 3 most important threads to surface as "quest cards." For each thread, write a narrative hook that makes Hugo want to start working on it, and suggest a micro-first-step.

Rules:
- Slot 1 is ALWAYS a work item
- Slots 2-3 are the next highest priority items from any category
- Narrative hooks: 2-3 sentences, conversational tone, connects the task to something that matters
- next_step: the smallest possible action to begin — something you could do in 2 minutes
- effort: high (deep focus required), medium (moderate concentration), low (can do while tired or distracted)
- countdown: express time remaining in relative terms — "3 days away", "2 weekends left". NEVER use day-of-week names or calendar dates
- Use countdowns that create urgency: "3 days" not "Saturday"
- active_slot: pick the slot whose effort level best matches the current energy band
  (high effort for prime_work/high_energy, low effort for wind_down/ramp_up, medium for others)

Be decisive. Do not hedge. Hugo trusts you to make the call.
Do NOT invent data. Everything must come from working memory.`;

  const userMessage = `## STEP 1: READ WORKING MEMORY

Use the MCP tool now:
blocks_get with id="${WORKING_MEMORY_DOC_ID}" and format="markdown"

Read the response carefully. All output must be derived from this data.

## STEP 2: SELECT 3 QUEST CARDS

Current time: ${now.toISOString()}
Current energy band: ${energyBand}

Select:
- Slot 1: Best work item (hot or warm heat, most urgent or impactful)
- Slot 2: Second highest priority (any category)
- Slot 3: Third highest priority (any category)

For each, write a narrative hook (2-3 sentences), a micro-first-step, assign effort level, and compute a relative countdown.

Determine active_slot: which slot's effort level best matches the current energy band?
- prime_work / high_energy → prefer high effort
- ramp_up / lunch_dip / planning → prefer medium effort
- wind_down / chores → prefer low effort

## STEP 3: OUTPUT

Respond with ONLY the JSON object below. No explanation. No markdown fences. No commentary.

{
  "generated_at": "${now.toISOString()}",
  "energy_band": "${energyBand}",
  "slots": [
    {
      "slot": 1,
      "category": "work",
      "thread_name": "",
      "hook": "",
      "next_step": "",
      "effort": "high|medium|low",
      "countdown": ""
    },
    {
      "slot": 2,
      "category": "work|personal|travel",
      "thread_name": "",
      "hook": "",
      "next_step": "",
      "effort": "high|medium|low",
      "countdown": ""
    },
    {
      "slot": 3,
      "category": "work|personal|travel",
      "thread_name": "",
      "hook": "",
      "next_step": "",
      "effort": "high|medium|low",
      "countdown": ""
    }
  ],
  "active_slot": 1
}

Remember: the string fields above are empty placeholders. Fill them with real data from working memory.`;

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
    `/repos/${GITHUB_REPO}/contents/${OUTPUT_JSON_PATH}?ref=${GITHUB_BRANCH}`,
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
    `/repos/${GITHUB_REPO}/contents/${OUTPUT_JSON_PATH}`,
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

  console.log("Generating focus-engine.json via Claude + Craft MCP...");
  const outputJson = await generateFocusEngineJson();

  console.log("Pushing focus-engine.json to GitHub...");
  await pushFocusEngineJson(outputJson);

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
