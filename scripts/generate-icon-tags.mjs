import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ICONS_DIR = path.join(ROOT, "src/assets/icons/lordicon");
const ASSETS_DIR = path.join(ROOT, "src/assets/icons");

// Load .env manually (no dependencies needed)
const envPath = path.join(ROOT, ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY in .env");
  process.exit(1);
}

const BATCH_SIZE = 20;
const MODEL = "claude-sonnet-4-5-20250929";

const SYSTEM_PROMPT = `You are a visual icon tagging engine. You receive Lordicon animation names that describe what each icon depicts. Your job is to generate tags that will be used to MATCH these icons to real-life tasks, events, and items on a dashboard.

THE MATCHING PROBLEM:
A user's dashboard will have items like "Date with Dana", "Japan trip planning", "Fix kitchen sink", "Dentist appointment", "Team standup". Each item gets tags like ["date", "dinner", "restaurant", "woman"]. Those tags need to match against YOUR icon tags to find a relevant icon.

So your tags need to be the kinds of words that would naturally describe everyday tasks, events, and things — not art history terms or medical jargon.

RULES:

1. GENERALIZE SPECIFIC NAMES
   - "da-vinci" → the icon shows a human figure in a circle, like a diagram. Tag it as: person, diagram, sketch, body, anatomy, circle, drawing, artist, inventor, engineer
   - "acne-herpes" → the icon shows a face with spots. Tag it as: face, skin, spots, doctor, appointment, head, person
   - "hairdresser-barber" → shows a person with scissors. Tag it as: scissors, person, haircut, chair, mirror, salon, grooming, appointment
   - Always ask: "What would someone's to-do item say that should show this icon?"

2. COMPOUND WORDS — keep the compound AND split it
   - "toilet-paper" → tags include: toilet-paper, toilet, paper, roll, bathroom, tissue, dispenser
   - "gas-burner" → tags include: gas-burner, gas, burner, stove, flame, kitchen, cooking
   - "time-out" → tags include: time-out, time, clock, pause, break, hand, stop, wait
   - "x-ray" → tags include: x-ray, skeleton, bones, scan, hospital, medical, screen

3. CONCRETE NOUNS AND COMMON VERBS ONLY
   - YES: objects, tools, animals, places, vehicles, furniture, food, clothing, body parts, rooms, containers
   - YES: common action verbs that describe tasks: cooking, cleaning, writing, running, building, fixing
   - NO: abstract concepts like "achievement", "wellness", "motivation", "synergy", "productivity"
   - NO: emotions like "joy", "stress", "calm"
   - Test: "Would this word appear in a to-do list or calendar event?" If yes, it's a good tag.

4. THINK ABOUT THE SHAPES
   - What objects are visually present in the icon?
   - What room or scene would these objects appear in?
   - What activities happen with these objects?
   - What OTHER icons might share similar shapes?

5. THROWAWAY WORDS
   - Skip meaningless fragments: "double", "site", "outline", numbers
   - Skip style prefixes: "wired", "outline", "flat", "lineal", "gradient"

For each icon, return 8-10 tags. Include both:
- What the icon literally shows (the shapes/objects)
- What everyday tasks/events it could represent

Return ONLY valid JSON, no markdown fences, no explanation. Format:
{
  "hash": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"]
}

IMPORTANT: The key should be the FILE HASH (I will provide it), not the nm string.`;

// Step 1: Extract nm fields from all icons
function extractIconNames() {
  const files = fs.readdirSync(ICONS_DIR).filter((f) => f.endsWith(".json"));
  const icons = [];
  const errors = [];

  for (const file of files) {
    const hash = file.replace(".json", "");
    try {
      const data = JSON.parse(
        fs.readFileSync(path.join(ICONS_DIR, file), "utf-8")
      );
      if (data.nm) {
        icons.push({ hash, nm: data.nm });
      } else {
        errors.push({ hash, error: "No nm field" });
      }
    } catch (e) {
      errors.push({ hash, error: `Parse error: ${e.message}` });
    }
  }

  return { icons, errors };
}

// Step 2: Call Claude API for a batch
async function tagBatch(batch, batchNum, totalBatches) {
  const lines = batch
    .map((icon, i) => `${i + 1}. hash: ${icon.hash} | nm: ${icon.nm}`)
    .join("\n");

  const userPrompt = `Generate tags for these icons. The hash is the filename, the nm is from the JSON.\n\n${lines}\n\nReturn JSON keyed by hash.`;

  const body = {
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        const wait = attempt * 15;
        console.log(
          `  Rate limited on batch ${batchNum}/${totalBatches}, waiting ${wait}s...`
        );
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const text = data.content[0].text;

      // Extract JSON from response (handle possible markdown fences)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");

      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      if (attempt === 3) {
        console.error(
          `  FAILED batch ${batchNum}/${totalBatches} after 3 attempts: ${e.message}`
        );
        return {};
      }
      console.log(
        `  Retry ${attempt}/3 for batch ${batchNum}: ${e.message}`
      );
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  return {};
}

// Main
async function main() {
  console.log("Step 1: Extracting icon names...");
  const { icons, errors } = extractIconNames();
  console.log(`  Found ${icons.length} icons with nm field`);
  if (errors.length > 0) {
    console.log(`  ${errors.length} errors:`);
    errors.forEach((e) => console.log(`    ${e.hash}: ${e.error}`));
  }

  // Step 2: Batch tag generation
  console.log(`\nStep 2: Generating tags via Claude API (${MODEL})...`);
  const batches = [];
  for (let i = 0; i < icons.length; i += BATCH_SIZE) {
    batches.push(icons.slice(i, i + BATCH_SIZE));
  }
  console.log(
    `  ${batches.length} batches of up to ${BATCH_SIZE} icons each\n`
  );

  const registry = {};

  // Load checkpoint if exists
  const checkpointPath = path.join(ASSETS_DIR, ".tag-checkpoint.json");
  let startBatch = 0;
  if (fs.existsSync(checkpointPath)) {
    const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, "utf-8"));
    Object.assign(registry, checkpoint.registry);
    startBatch = checkpoint.nextBatch;
    console.log(
      `  Resuming from batch ${startBatch + 1} (${Object.keys(registry).length} icons already tagged)\n`
    );
  }

  for (let i = startBatch; i < batches.length; i++) {
    const batch = batches[i];
    console.log(
      `  Batch ${i + 1}/${batches.length} (${batch.length} icons)...`
    );

    const tags = await tagBatch(batch, i + 1, batches.length);
    const taggedCount = Object.keys(tags).length;

    // Merge results into registry
    for (const icon of batch) {
      registry[icon.hash] = {
        name: icon.nm,
        tags: tags[icon.hash] || [],
      };
    }

    console.log(`    Tagged ${taggedCount}/${batch.length} icons`);

    // Save checkpoint after each batch
    fs.writeFileSync(
      checkpointPath,
      JSON.stringify({ nextBatch: i + 1, registry }, null, 2)
    );

    // Small delay between batches to avoid rate limiting
    if (i < batches.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // Clean up checkpoint
  if (fs.existsSync(checkpointPath)) fs.unlinkSync(checkpointPath);

  // Step 3: Save registry
  console.log("\nStep 3: Saving icon-registry.json...");
  const registryPath = path.join(ASSETS_DIR, "icon-registry.json");
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log(`  Saved ${Object.keys(registry).length} icons to registry`);

  // Step 4: Build inverted index
  console.log("\nStep 4: Building inverted tag index...");
  const tagIndex = {};

  for (const [hash, entry] of Object.entries(registry)) {
    for (const tag of entry.tags) {
      const normalizedTag = tag.toLowerCase();
      if (!tagIndex[normalizedTag]) tagIndex[normalizedTag] = [];
      if (!tagIndex[normalizedTag].includes(hash)) {
        tagIndex[normalizedTag].push(hash);
      }
    }
  }

  // Sort keys alphabetically
  const sortedIndex = {};
  for (const key of Object.keys(tagIndex).sort()) {
    sortedIndex[key] = tagIndex[key];
  }

  const indexPath = path.join(ASSETS_DIR, "icon-tag-index.json");
  fs.writeFileSync(indexPath, JSON.stringify(sortedIndex, null, 2));
  console.log(`  Saved ${Object.keys(sortedIndex).length} unique tags`);

  // Step 5: Verify coverage
  console.log("\n=== COVERAGE REPORT ===\n");

  const totalIcons = Object.keys(registry).length;
  const totalTags = Object.keys(sortedIndex).length;
  const tagCounts = Object.values(registry).map((e) => e.tags.length);
  const avgTags = (tagCounts.reduce((a, b) => a + b, 0) / tagCounts.length).toFixed(1);
  const emptyTags = tagCounts.filter((c) => c === 0).length;

  console.log(`Total icons processed: ${totalIcons}`);
  console.log(`Total unique tags: ${totalTags}`);
  console.log(`Average tags per icon: ${avgTags}`);
  console.log(`Icons with no tags: ${emptyTags}`);

  // Top 30 tags
  const tagsByCount = Object.entries(sortedIndex)
    .map(([tag, hashes]) => ({ tag, count: hashes.length }))
    .sort((a, b) => b.count - a.count);

  console.log("\nTop 30 most-used tags:");
  for (const { tag, count } of tagsByCount.slice(0, 30)) {
    console.log(`  ${tag}: ${count} icons`);
  }

  // Bottom 10 tags
  console.log("\nBottom 10 tags (1 icon each):");
  const singleTags = tagsByCount.filter((t) => t.count === 1);
  for (const { tag } of singleTags.slice(0, 10)) {
    console.log(`  ${tag}`);
  }
  console.log(`  ... (${singleTags.length} tags with only 1 icon total)`);

  if (errors.length > 0) {
    console.log(`\nFailed to parse: ${errors.length} icons`);
    errors.forEach((e) => console.log(`  ${e.hash}: ${e.error}`));
  }

  console.log("\nDone!");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
