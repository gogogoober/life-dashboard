#!/usr/bin/env node

/**
 * Working Memory Updater
 *
 * Runs once daily. Reads today's Craft daily note + current working memory + config,
 * sends them to Claude, and writes the updated working memory back to Craft.
 */

const https = require("https");

// ─── Config ────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CRAFT_MCP_TOKEN = process.env.CRAFT_MCP_TOKEN;

const CRAFT_DOCUMENT_IDS = {
  workingMemory: "FC9D77DC-45EB-4EBA-B7F5-3F6F7BEB9DD0",
  config: "15AD13D1-F413-41F9-B2CD-1F9B51E1EB1C",
};

const CLAUDE_MODEL = "claude-sonnet-4-6";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodayDateString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          ...headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error(`Failed to parse response: ${raw}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ─── Craft MCP Calls ────────────────────────────────────────────────────────

async function fetchCraftDocument(documentId) {
  const response = await httpsPost(
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
  return response?.result?.content?.[0]?.text ?? "";
}

async function fetchTodayDailyNote() {
  const today = getTodayDateString();
  console.log(`Fetching daily note for: ${today}`);

  // Search for today's note by title
  const response = await httpsPost(
    "mcp.craft.do",
    "/links/8pMZhXonzqg/mcp",
    { Authorization: `Bearer ${CRAFT_MCP_TOKEN}` },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "documents_search",
        arguments: { include: today },
      },
    }
  );

  const docs = response?.result?.content?.[0]?.text;
  if (!docs) return `No daily note found for ${today}.`;

  // Parse out the first matching document ID and fetch its content
  const parsed = JSON.parse(docs);
  const match = parsed?.documents?.find((d) => d.title === today);
  if (!match) return `No daily note found for ${today}.`;

  return fetchCraftDocument(match.id);
}

async function writeCraftDocument(documentId, tomlContent) {
  // First clear the existing code block content, then write new content
  // Strategy: fetch block IDs, find the code block, update it
  const fetchResponse = await httpsPost(
    "mcp.craft.do",
    "/links/8pMZhXonzqg/mcp",
    { Authorization: `Bearer ${CRAFT_MCP_TOKEN}` },
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "blocks_get",
        arguments: { id: documentId, format: "json", maxDepth: 1 },
      },
    }
  );

  const blocks = JSON.parse(
    fetchResponse?.result?.content?.[0]?.text ?? "[]"
  );
  const codeBlock = blocks?.find?.((b) => b.type === "code");

  if (!codeBlock) {
    console.error("Could not find code block in working memory document.");
    return;
  }

  await httpsPost(
    "mcp.craft.do",
    "/links/8pMZhXonzqg/mcp",
    { Authorization: `Bearer ${CRAFT_MCP_TOKEN}` },
    {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "blocks_update",
        arguments: {
          blocks: [{ id: codeBlock.id, rawCode: tomlContent }],
        },
      },
    }
  );

  console.log("Working memory updated in Craft.");
}

// ─── Claude Call ────────────────────────────────────────────────────────────

async function runClaudeUpdate(dailyNote, workingMemory, config) {
  const today = getTodayDateString();

  const systemPrompt = `You are the Working Memory Updater for a personal productivity system called Cerebro.

Your job is to read the user's daily notes, current working memory, and config, then produce an updated working memory document in TOML format.

## Rules

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

## Output format

Return ONLY valid TOML inside a code block. No explanation. No commentary. Match the exact schema of the current working memory.

Today's date: ${today}`;

  const userMessage = `Here are the three source documents. Please update the working memory.

---
## TODAY'S DAILY NOTE (${today})
${dailyNote}

---
## CURRENT WORKING MEMORY
${workingMemory}

---
## CONFIG
${config}`;

  const response = await httpsPost(
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
      messages: [{ role: "user", content: userMessage }],
    }
  );

  const raw = response?.content?.[0]?.text ?? "";

  // Extract TOML from code block
  const match = raw.match(/```(?:toml)?\n([\s\S]*?)```/);
  if (!match) {
    throw new Error(`Claude did not return a TOML code block. Raw: ${raw}`);
  }

  return match[1].trim();
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Working Memory Updater starting ===");

  if (!ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");
  if (!CRAFT_MCP_TOKEN) throw new Error("Missing CRAFT_MCP_TOKEN");

  console.log("Fetching source documents from Craft...");
  const [dailyNote, workingMemory, config] = await Promise.all([
    fetchTodayDailyNote(),
    fetchCraftDocument(CRAFT_DOCUMENT_IDS.workingMemory),
    fetchCraftDocument(CRAFT_DOCUMENT_IDS.config),
  ]);

  console.log("Sending to Claude for processing...");
  const updatedToml = await runClaudeUpdate(dailyNote, workingMemory, config);

  console.log("Writing updated working memory back to Craft...");
  await writeCraftDocument(CRAFT_DOCUMENT_IDS.workingMemory, updatedToml);

  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});