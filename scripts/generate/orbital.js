#!/usr/bin/env node

/**
 * Orbital Generator
 *
 * Reads working memory from Craft via MCP, then uses Claude to extract
 * all upcoming events and trips with weights and action items.
 * Pushes orbital.json to GitHub so the dashboard can render the orbital chart.
 */

import https from "https";

// ─── Config ────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const GITHUB_REPO = "gogogoober/life-dashboard";
const GITHUB_BRANCH = "main";
const OUTPUT_JSON_PATH = "public/orbital.json";

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

async function generateOrbitalJson() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const systemPrompt = `You are the Orbital Chart generator for Hugo's personal life dashboard called Cerebro.

Your job is to extract all upcoming events and trips from Hugo's working memory and structure them for the orbital chart.

Weight guidelines (1-10 scale):
- Multi-week trips: 8-10
- Week-long trips: 7-8
- Weekend trips: 5-6
- Birthdays / significant events: 5-6
- Social events: 3-4
- Appointments: 2-3
- Small tasks: 1-2

For each event, list action items found in working memory with their completion status.
Only include events with a known or inferable date.
Sort events by date ascending. Today is ${today}.`;

  const userMessage = `## STEP 1: READ WORKING MEMORY

Use the MCP tool now:
blocks_get with id="${WORKING_MEMORY_DOC_ID}" and format="markdown"

Read the response carefully. Extract all events, trips, and significant upcoming items.

## STEP 2: OUTPUT

Respond with ONLY the JSON object below. No explanation. No markdown fences. No commentary.
Include only events with a date on or after today (${today}).

{
  "generated_at": "${now.toISOString()}",
  "events": [
    {
      "name": "string",
      "date": "YYYY-MM-DD",
      "weight": 5,
      "actions": [
        { "name": "string", "status": "todo|done" }
      ]
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

async function pushOrbitalJson(outputJson) {
  const content = Buffer.from(
    JSON.stringify(outputJson, null, 2)
  ).toString("base64");

  const existing = await httpsRequest(
    "GET",
    "api.github.com",
    `/repos/${GITHUB_REPO}/contents/${OUTPUT_JSON_PATH}?ref=${GITHUB_BRANCH}`,
    {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "cerebro-orbital-generator",
      Accept: "application/vnd.github+json",
    }
  );

  const sha = existing?.body?.sha ?? undefined;

  const payload = {
    message: `chore: update orbital.json [${new Date().toISOString()}]`,
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
      "User-Agent": "cerebro-orbital-generator",
      Accept: "application/vnd.github+json",
    },
    payload
  );

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(
      `GitHub push failed (${result.status}): ${JSON.stringify(result.body)}`
    );
  }

  console.log(`Pushed orbital.json (status: ${result.status})`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Orbital Generator starting ===");

  if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  if (!GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN");

  console.log("Generating orbital.json via Claude + Craft MCP...");
  const outputJson = await generateOrbitalJson();

  console.log("Pushing orbital.json to GitHub...");
  await pushOrbitalJson(outputJson);

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
