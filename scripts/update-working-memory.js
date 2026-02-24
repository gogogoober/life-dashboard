#!/usr/bin/env node

/**
 * Working Memory Updater
 *
 * Runs once daily. Uses Claude with Craft MCP connector to read today's
 * daily note + current working memory + config, process them, and write
 * the updated working memory back to Craft.
 */

import https from "https";

// ─── Config ────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const CRAFT_MCP_URL = "https://mcp.craft.do/links/8pMZhXonzqg/mcp";
const CRAFT_MCP_NAME = "craft";

const CRAFT_DOCUMENT_IDS = {
  workingMemory: "FC9D77DC-45EB-4EBA-B7F5-3F6F7BEB9DD0",
  config: "15AD13D1-F413-41F9-B2CD-1F9B51E1EB1C",
};

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

async function runWorkingMemoryUpdate() {
  const now = new Date();
  const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

  const systemPrompt = `You are the Working Memory Updater for a personal productivity system called Cerebro.

You have access to Craft via MCP tools. Follow these steps in order:

## Step 1: Read source documents
Use MCP tools to fetch these three things:
1. Today's daily note — use blocks_get with date="${today}" and format="markdown"
2. Working memory — use blocks_get with id="${CRAFT_DOCUMENT_IDS.workingMemory}" and format="markdown"
3. Config — use blocks_get with id="${CRAFT_DOCUMENT_IDS.config}" and format="markdown"

If today's daily note is empty, that's fine — proceed with just working memory and config.

## Step 2: Process and generate updated TOML
Apply these rules:

**Heat levels:**
- hot: actively occupying mental space, mentioned with depth/branching
- warm: present but not urgent, mentioned briefly or a few days ago
- archived: dormant, no recent mentions — keep for context

**Heat decay (days since last_mentioned):**
- hot → warm: 3 days
- warm → archived: 7 days
- archived: keep for 30 days, then remove

**Deadline boosting:**
- Trips: boost to hot within 14 days of departure
- Social events: boost to hot within 7 days
- Action items: boost to hot within 3 days

**Categories:** active-research, project, action-item, trip-event, people
**Tags:** personal, work, both

**What counts as "eating the brain":**
Depth and branching — the user returns to a topic from multiple angles, not just mentions it once.

## Step 3: Write back to Craft
First, use blocks_get with id="${CRAFT_DOCUMENT_IDS.workingMemory}" and format="json" and maxDepth=1 to find the code block.
Then use blocks_update to update that code block's rawCode with the new TOML.
Update the last_updated field to "${today}".

## Step 4: Confirm
After writing, respond with a brief summary of changes made (items added/removed/heat changed).

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
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content:
            "Read today's daily note, current working memory, and config from Craft. " +
            "Process the updates, then write the updated working memory back to Craft.",
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

  // Log Claude's summary of what it did
  const textBlocks = (response.body?.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text);

  const summary = textBlocks.join("\n").trim();
  if (summary) {
    console.log("\nClaude's update summary:\n" + summary);
  }

  // Verify MCP tool calls were made
  const toolCalls = (response.body?.content ?? []).filter(
    (block) => block.type === "mcp_tool_use"
  );
  console.log(`\nMCP tool calls made: ${toolCalls.length}`);
  toolCalls.forEach((tc) => console.log(`  - ${tc.name}`));

  if (toolCalls.length === 0) {
    throw new Error("Claude made no MCP tool calls. Check MCP connectivity.");
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Working Memory Updater starting ===");

  if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");

  await runWorkingMemoryUpdate();

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});