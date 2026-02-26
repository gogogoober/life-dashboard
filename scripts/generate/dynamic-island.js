#!/usr/bin/env node

/**
 * Dynamic Island Generator
 *
 * Reads working memory from Craft via MCP, then uses Claude to decide
 * what supplementary content to show on the dashboard (threads, knockout,
 * nudge, or quote). Pushes dynamic-island.json to GitHub.
 */

import https from "https";

// ─── Config ────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const GITHUB_REPO = "gogogoober/life-dashboard";
const GITHUB_BRANCH = "main";
const OUTPUT_JSON_PATH = "public/dynamic-island.json";

const CRAFT_MCP_URL = "https://mcp.craft.do/links/8pMZhXonzqg/mcp";
const CRAFT_MCP_NAME = "craft";
const WORKING_MEMORY_DOC_ID = "FC9D77DC-45EB-4EBA-B7F5-3F6F7BEB9DD0";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

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

// ─── Claude + Craft MCP ─────────────────────────────────────────────────────

async function generateDynamicIslandJson() {
  const now = new Date();

  const systemPrompt = `You are the Dynamic Island generator for Hugo's personal life dashboard called Cerebro.

Your job is to decide what supplementary content to show on the dashboard to keep things fresh and engaging. Pick ONE content type based on what's most relevant right now.

Content types:
- "threads": Show a compact list of all active threads with heat levels. Use this as the default if nothing else is more compelling.
- "knockout": Generate a "knockout round" — 3 small quick-win tasks Hugo can do in under 5 minutes each. Pull real tasks from working memory, or suggest generic productive tasks if nothing small is obvious.
- "nudge": A contextual reminder or question about something Hugo mentioned but hasn't acted on yet.
- "quote": A short motivational or thought-provoking quote (generate one yourself, don't reference a database).

height:
- "short": use for threads (compact list) or quote
- "tall": use for knockout (has more content) or nudge (needs breathing room)

Only populate the content field matching the type you chose. Set all other fields to null.

Be decisive. Pick one type and commit to it.`;

  const userMessage = `## STEP 1: READ WORKING MEMORY

Use the MCP tool now:
blocks_get with id="${WORKING_MEMORY_DOC_ID}" and format="markdown"

Read the response. Use it to pick the most relevant content type and generate the content.

## STEP 2: OUTPUT

Respond with ONLY the JSON object below. No explanation. No markdown fences. No commentary.
Populate only the content field matching your chosen type. Set the others to null.

{
  "generated_at": "${now.toISOString()}",
  "type": "threads|knockout|nudge|quote",
  "height": "short|tall",
  "content": {
    "threads": [
      { "name": "string", "heat": "hot|warm|cool", "last_touched": "string", "category": "work|personal" }
    ],
    "knockout": {
      "prompt": "string — the challenge prompt",
      "tasks": ["string", "string", "string"],
      "points_each": 5,
      "bonus": 15
    },
    "nudge": {
      "text": "string"
    },
    "quote": {
      "text": "string",
      "attribution": "string|null"
    }
  }
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

async function pushDynamicIslandJson(outputJson) {
  const content = Buffer.from(
    JSON.stringify(outputJson, null, 2)
  ).toString("base64");

  const existing = await httpsRequest(
    "GET",
    "api.github.com",
    `/repos/${GITHUB_REPO}/contents/${OUTPUT_JSON_PATH}?ref=${GITHUB_BRANCH}`,
    {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "cerebro-dynamic-island-generator",
      Accept: "application/vnd.github+json",
    }
  );

  const sha = existing?.body?.sha ?? undefined;

  const payload = {
    message: `chore: update dynamic-island.json [${new Date().toISOString()}]`,
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
      "User-Agent": "cerebro-dynamic-island-generator",
      Accept: "application/vnd.github+json",
    },
    payload
  );

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(
      `GitHub push failed (${result.status}): ${JSON.stringify(result.body)}`
    );
  }

  console.log(`Pushed dynamic-island.json (status: ${result.status})`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Dynamic Island Generator starting ===");

  if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  if (!GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN");

  console.log("Generating dynamic-island.json via Claude + Craft MCP...");
  const outputJson = await generateDynamicIslandJson();

  console.log("Pushing dynamic-island.json to GitHub...");
  await pushDynamicIslandJson(outputJson);

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
