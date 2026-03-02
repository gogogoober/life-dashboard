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

const REQUEST_TIMEOUT_MS = 14 * 60 * 1000; // 14 min — just under the 15-min job timeout

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
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`));
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ─── Claude + Craft MCP ─────────────────────────────────────────────────────

async function runWorkingMemoryUpdate() {
  const now = new Date();
  const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

const systemPrompt = `You are the Working Memory Updater for a personal productivity system called Life Dashboard.

You have access to Craft via MCP tools. Follow these steps in order.

## Step 1: Read source documents

Fetch these three documents from Craft:
1. Today's daily note — blocks_get with date="${today}", format="markdown"
2. Working memory — blocks_get with id="${CRAFT_DOCUMENT_IDS.workingMemory}", format="markdown"
3. Config — blocks_get with id="${CRAFT_DOCUMENT_IDS.config}", format="markdown"

If today's daily note is empty, proceed with just working memory and config.
Even with no daily note, you must still apply decay, deadline boosting, pinning,
and habit resets based on today's date.

The CONFIG is the source of truth for all rules. It defines:
- Valid categories and their descriptions
- Heat decay timing (decay_days_hot, decay_days_warm)
- Deadline urgency windows per category
- Pinned items and their minimum heat levels
- Habit definitions (target days, minimum_per_week)

## Step 2: Process and generate updated TOML

### 2a. Metadata
- Preserve schema_version exactly as-is. Never change it.
- Set last_updated to "${today}".

### 2b. Heat levels
- hot: actively occupying mental space — mentioned with depth in recent notes
- warm: present but not front-of-mind — brief mention or a few days stale
- archived: dormant — no recent mentions, kept for context

### 2c. Heat decay
Use the values from config [heat] section:
- hot → warm: after decay_days_hot days since last_mentioned
- warm → archived: after decay_days_warm days since last_mentioned
- archived → removed: after 30 days since last_mentioned

Before removing any archived item, check ALL of these:
- Does it have a deadline in the future? → Keep it.
- Does it have active_tasks remaining? → Keep it.
- Is it referenced in another item's sub_threads? → Keep it.
- When in doubt, keep it. Removal is the riskiest operation.

### 2d. Deadline boosting
Use config [heat.deadline_urgency_days] per category.
If an item's deadline is within the configured window, force heat to at least "hot".

After a deadline passes:
- Drop heat by one tier (hot → warm, warm → archived).
- Then let normal decay handle it from there.
- Do NOT remove the deadline field — it's historical context.

### 2e. Pinning
Read config [[pinned]] entries. For each:
- The item must never drop below the specified minimum_heat.
- Set heat_reason to "pinned:{level}" (e.g. "pinned:warm").
- Pinning overrides decay. Deadline boosting can raise above the pin floor
  but nothing drops below it.

### 2f. last_mentioned — CRITICAL
This field drives all decay calculations.
- If an item is referenced in today's daily note, set last_mentioned to "${today}".
- "Referenced" means the topic, project, or related activity appears — not just
  a passing word match. Use judgment.
- If an item is NOT mentioned, leave last_mentioned unchanged.

### 2g. heat_reason
Always set heat_reason to explain why the item has its current heat level.
Valid values:
- "decay" — heat dropped due to days since last_mentioned
- "deadline" — heat boosted because deadline is within urgency window
- "branching" — item shows depth/multiple angles in recent notes
- "frequency" — item keeps appearing regularly
- "pinned:{level}" — held at minimum heat by config (e.g. "pinned:warm")
- "post-deadline decay" — deadline passed, dropped one tier

### 2h. Identifying new items from the daily note
Look for topics that show DEPTH — signals include:
- Multiple paragraphs or bullet points about the same topic
- Decision-making language ("I'm thinking...", "leaning toward...", "need to decide...")
- Emotional weight ("stressed about...", "excited for...")
- Action items or next steps mentioned
- Research or comparison (pros/cons, options listed)

A single passing mention ("had coffee with Jake") is NOT enough for a new item.
A paragraph about Jake's job situation with follow-up questions IS enough.

When creating a new item, set ALL fields:
- id: lowercase-kebab-case, descriptive. Never change an id once created.
- title: short display label (2-5 words)
- category: must be one defined in config [[categories]]
- tag: one of "personal", "work", "both"
- heat: based on depth signals and rules above
- heat_reason: see 2g
- first_seen: "${today}"
- last_mentioned: "${today}"
- deadline: set if the daily note mentions a specific date, otherwise omit
- summary: 2-4 sentences of context written for future-you. What is this about,
  what's the current state, what decision or action is pending.
- sub_threads: related topic connections (see 2j)
- active_tasks: any tasks mentioned in the note (see 2i)
- done_tasks: empty array for new items

### 2i. Task management
- If the daily note says something was done, move it from active_tasks → done_tasks.
  Format done tasks: "Task title (context, ${today})"
- If the daily note mentions a new task for an existing item, add to active_tasks.
  Format: "Task description (brief context if needed)"
- Never invent tasks. Only add what the daily note explicitly states or clearly implies.
- Keep task wording specific and actionable — "Book flights to Chicago" not "Handle travel".

### 2j. Sub-threads
sub_threads are RELATED TOPICS for future graph views, not tasks.
- When creating or updating an item, check if it connects to other items.
- Links should be bidirectional: if A references B, B should reference A.
- Examples: "Japan trip" ↔ "fountain pens", "Mariano's 30th" ↔ "backpacking"
- Only add sub_threads that represent genuine conceptual connections.

### 2k. Summary maintenance
- When an item's context changes meaningfully (new info, decision made, status shift),
  rewrite the summary to reflect the current state.
- Don't append — rewrite. The summary should always read as a fresh 2-4 sentence
  briefing on where this item stands right now.
- Write in second person where natural ("You're leaning toward..." / "Plan is to...")

### 2l. Habit tracking
Use config [[habits]] to manage the [habit_tracking] section.
- If today is Monday: reset the week. Set week_start to "${today}",
  clear all completions arrays, set all statuses to "pending".
- If the daily note mentions completing a habit (e.g. "worked out", "did laundry"):
  add "${today}" to that habit's completions array.
- After updating completions, recalculate status:
  - completions.length >= minimum_per_week → "done"
  - Otherwise → "pending"
- ALWAYS preserve the [habit_tracking] section intact, even if nothing changed.
- Use minimum_per_week as the field name (match the config).

## Step 3: Write back to Craft

1. Use blocks_get with id="${CRAFT_DOCUMENT_IDS.workingMemory}", format="json", maxDepth=1
   to find the code block containing the TOML.
2. Use blocks_update to replace that code block's rawCode with the new TOML.
3. Ensure last_updated is set to "${today}".

Preserve the TOML comment structure (section headers, field comments).
Keep items ordered: hot first, then warm, then archived.

## Step 4: Confirm

Respond with a brief summary:
- Items added (with category and initial heat)
- Items removed (with reason)
- Heat changes (item: old → new, with reason)
- Tasks moved to done
- Tasks added
- Summaries rewritten (which items and why)
- Habit completions logged
- Habit week reset (if Monday)
- If nothing changed, say so.

Today's date: ${today}`;

  console.log(`[${new Date().toISOString()}] Calling Claude with Craft MCP connector...`);
  console.log("(Claude will make ~4 MCP round-trips to Craft — this can take several minutes)");

  const callStart = Date.now();
  const heartbeat = setInterval(() => {
    const elapsed = Math.round((Date.now() - callStart) / 1000);
    console.log(`[${new Date().toISOString()}] Still waiting for Claude response... (${elapsed}s elapsed)`);
  }, 30_000);

  let response;
  try {
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
  } finally {
    clearInterval(heartbeat);
  }

  console.log(`[${new Date().toISOString()}] Claude response status:`, response.status);

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