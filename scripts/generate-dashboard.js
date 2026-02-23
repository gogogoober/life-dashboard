#!/usr/bin/env node

/**
 * Dashboard Generator
 *
 * Runs frequently (e.g. every hour). Reads working memory from Craft,
 * sends it to Claude to generate dashboard JSON, then commits
 * dashboard.json to the GitHub repo so the site re-renders.
 */

import https from "https";

// ─── Config ────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CRAFT_MCP_TOKEN = process.env.CRAFT_MCP_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const GITHUB_REPO = "gogogoober/life-dashboard";
const GITHUB_BRANCH = "main";
const DASHBOARD_JSON_PATH = "public/dashboard.json";

const CRAFT_DOCUMENT_IDS = {
  workingMemory: "FC9D77DC-45EB-4EBA-B7F5-3F6F7BEB9DD0",
};

const CLAUDE_MODEL = "claude-sonnet-4-6";

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

// ─── Craft MCP ──────────────────────────────────────────────────────────────

async function fetchCraftDocument(documentId) {
  console.log(`Fetching Craft document: ${documentId}`);

  const response = await httpsRequest(
    "POST",
    "mcp.craft.do",
    "/links/8pMZhXonzqg/mcp",
    { Authorization: `Bearer ${CRAFT_MCP_TOKEN}` },
    {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "blocks_get",
        arguments: { id: documentId, format: "markdown" },
      },
    }
  );

  console.log("Craft response status:", response.status);
  console.log("Craft response body:", JSON.stringify(response.body, null, 2).slice(0, 500));

  const text = response?.body?.result?.content?.[0]?.text ?? "";
  console.log("Extracted text length:", text.length);
  return text;
}

// ─── Claude Call ────────────────────────────────────────────────────────────

async function generateDashboardJson(workingMemory) {
  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are the Dashboard Generator for a personal productivity system called Cerebro.

Your job is to transform the working memory TOML into a structured JSON object that a React dashboard can consume.

Return ONLY valid JSON. No explanation. No markdown fences.

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

  const response = await httpsRequest(
    "POST",
    "api.anthropic.com",
    "/v1/messages",
    {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    {
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Convert this working memory to dashboard JSON:\n\n${workingMemory}`,
        },
      ],
    }
  );

  console.log("Claude response status:", response.status);

  const raw = response?.body?.content?.[0]?.text ?? "";
  console.log("Claude raw output preview:", raw.slice(0, 300));

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
  if (!CRAFT_MCP_TOKEN) throw new Error("Missing CRAFT_MCP_TOKEN");
  if (!GITHUB_TOKEN) throw new Error("Missing GITHUB_TOKEN");

  console.log("Fetching working memory from Craft...");
  const workingMemory = await fetchCraftDocument(CRAFT_DOCUMENT_IDS.workingMemory);
  console.log("Working memory length:", workingMemory.length);

  console.log("Generating dashboard JSON via Claude...");
  const dashboardJson = await generateDashboardJson(workingMemory);

  console.log("Pushing dashboard.json to GitHub...");
  await pushDashboardJson(dashboardJson);

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});