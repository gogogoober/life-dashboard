#!/usr/bin/env node

/**
 * Dashboard Generator
 *
 * Runs frequently (e.g. every hour). Uses Claude with Craft MCP connector
 * to read working memory and generate dashboard JSON, then commits
 * dashboard.json to the GitHub repo so the site re-renders.
 */

import https from "https";

// ─── Config ────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

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
    const data = body ? JSON.stringify(body) : null;
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

async function generateDashboardJson() {
  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are the Dashboard Generator for a personal productivity system called Cerebro.

You have access to Craft via MCP tools. Your job:
1. Read the working memory document (ID: ${WORKING_MEMORY_DOC_ID}) using blocks_get with format "markdown"
2. Transform the TOML content into structured dashboard JSON

Return ONLY valid JSON. No explanation. No markdown fences. No other text.

Schema:
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
      "deadline": "YYYY-MM-DD or null",
      "pinned": true,
      "days_until_deadline": 0
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
    "archived_count": 0
  }
}

Today's date: ${today}`;

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
          content: "Read the working memory from Craft and generate the dashboard JSON.",
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
    console.error("Claude API error:", JSON.stringify(response.body, null, 2).slice(0, 1000));
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

  console.log("Generating dashboard JSON via Claude + Craft MCP...");
  const dashboardJson = await generateDashboardJson();

  console.log("Pushing dashboard.json to GitHub...");
  await pushDashboardJson(dashboardJson);

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});