/**
 * getIconForTags — Icon matching with fuzzy resolution + specificity weighting
 *
 * Three-layer matching:
 *   1. Direct tag lookup (exact match in index)
 *   2. Fuzzy resolution (synonyms → index tag, stem stripping)
 *   3. Intersection scoring with specificity tie-breaking
 *
 * Tie-breaking logic:
 *   When multiple icons share the same tag-match score,
 *   prefer icons that appear in FEWER total tags (= more specialized).
 *   A backpack icon tagged with 3 things beats a generic person icon tagged with 80.
 *
 * Fallback chain:
 *   1. Best intersection score + specificity weight
 *   2. Category fallback (broad tags for the category)
 *   3. Random icon from full library
 */

import tagIndex from "../assets/icons/icon-tag-index.json";

const INDEX = tagIndex as Record<string, string[]>;

// ─── Pre-computed lookups ──────────────────────────────────────────────────

// All unique icon hashes
const ALL_HASHES: string[] = [...new Set(Object.values(INDEX).flat())];

// Reverse index: icon hash → how many tags reference it (lower = more specific)
const ICON_TAG_COUNT: Map<string, number> = new Map();
for (const hashes of Object.values(INDEX)) {
  for (const hash of hashes) {
    ICON_TAG_COUNT.set(hash, (ICON_TAG_COUNT.get(hash) ?? 0) + 1);
  }
}

// All valid tags in the index (for stem matching)
const VALID_TAGS = new Set(Object.keys(INDEX));

// ─── Synonym Map ───────────────────────────────────────────────────────────
// Maps common LLM-generated words → actual index tags.
// Only needed for terms that stem-stripping won't catch.

const SYNONYMS: Record<string, string> = {
  // Outdoor / Adventure
  tent: "camping",
  campsite: "camping",
  backpacking: "backpack",
  hike: "hiking",
  trek: "hiking",
  trekker: "hiking",
  summit: "mountain",
  peak: "mountain",
  cliff: "mountain",
  wilderness: "forest",
  woodland: "forest",
  grove: "forest",
  pathway: "trail",
  footpath: "trail",

  // Travel
  passport: "airport",
  luggage: "suitcase",
  itinerary: "travel",
  sightseeing: "landmark",

  // Japan-specific
  shinto: "shrine",
  pagoda: "temple",
  kyoto: "japan",
  osaka: "japan",
  fushimi: "shrine",

  // Tech / Work
  programming: "code",
  developer: "code",
  software: "code",
  terminal: "code",
  monitor: "computer",
  desktop: "computer",
  workspace: "desk",
  workstation: "desk",

  // Writing
  fountain: "pen",
  nib: "pen",
  calligraphy: "pen",
  stationery: "pen",
  journal: "notebook",
  diary: "notebook",

  // Music
  guitar: "music",
  piano: "music",
  drums: "music",
  instrument: "music",
  band: "concert",
  gig: "concert",

  // Food
  restaurant: "food",
  recipe: "cooking",
  meal: "food",
  chef: "cooking",

  // Misc
  gift: "birthday",
  presents: "birthday",
  cake: "birthday",
  ocean: "beach",
  swim: "beach",
  snorkel: "diving",
  photo: "camera",
  photograph: "camera",
  movie: "cinema",
  film: "cinema",
};

// ─── Stem Stripping ────────────────────────────────────────────────────────

const SUFFIXES = [
  "ing", "tion", "sion", "ment", "ness",
  "er", "or", "ed", "ly", "ity",
  "ous", "ive", "al", "s",
];

/**
 * Try removing common English suffixes to find a matching index tag.
 * Returns the matched tag or null.
 */
function stemMatch(word: string): string | null {
  if (VALID_TAGS.has(word)) return word;

  for (const suffix of SUFFIXES) {
    if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
      const stem = word.slice(0, -suffix.length);
      if (VALID_TAGS.has(stem)) return stem;

      // Try adding back trailing 'e' (e.g., "hiking" → "hik" → not useful here,
      // but "diving" → "div" → "dive" ✓)
      if (VALID_TAGS.has(stem + "e")) return stem + "e";
    }
  }

  // Try adding common suffixes to the input word
  // e.g., input "hike" → check "hiking" in index
  for (const suffix of ["ing", "s", "er"]) {
    if (VALID_TAGS.has(word + suffix)) return word + suffix;
  }

  return null;
}

// ─── Tag Resolution ────────────────────────────────────────────────────────

/**
 * Resolve a single LLM-generated tag to zero or more index tags.
 * Priority: exact match → synonym → stem match → hyphen split
 */
function resolveTag(raw: string): string[] {
  const word = raw.toLowerCase().trim();

  // 1. Exact match
  if (VALID_TAGS.has(word)) return [word];

  // 2. Synonym lookup
  if (SYNONYMS[word]) {
    const resolved = SYNONYMS[word];
    return VALID_TAGS.has(resolved) ? [resolved] : [];
  }

  // 3. Stem stripping
  const stemmed = stemMatch(word);
  if (stemmed) return [stemmed];

  // 4. Hyphenated compound — try each part
  if (word.includes("-")) {
    const parts = word.split("-").flatMap((p) => resolveTag(p));
    return [...new Set(parts)];
  }

  return [];
}

// ─── Scoring ───────────────────────────────────────────────────────────────

// Category → fallback tags (specific enough to be useful, not "travel"/"person")
const CATEGORY_FALLBACK_TAGS: Record<string, string[]> = {
  travel: ["airplane", "airport", "map", "suitcase"],
  work: ["laptop", "code", "desk", "keyboard"],
  personal: ["notebook", "home", "heart", "star"],
  social: ["people", "meeting", "couple", "group"],
};

/**
 * Score every icon by how many resolved tags it matches.
 */
function scoreIcons(resolvedTags: string[]): Map<string, number> {
  const scores = new Map<string, number>();

  for (const tag of resolvedTags) {
    const hashes = INDEX[tag];
    if (!hashes) continue;

    for (const hash of hashes) {
      scores.set(hash, (scores.get(hash) ?? 0) + 1);
    }
  }

  return scores;
}

/**
 * From a scores map, pick the best icon using:
 *   1. Highest tag-match score (most tags matched)
 *   2. Lowest tag-count tie-breaker (most specific/specialized icon)
 *   3. Random among final ties
 */
function pickBest(scores: Map<string, number>): string | null {
  if (scores.size === 0) return null;

  // Find max match score
  let maxScore = 0;
  for (const score of scores.values()) {
    if (score > maxScore) maxScore = score;
  }

  // Collect all icons at max score
  const candidates: string[] = [];
  for (const [hash, score] of scores) {
    if (score === maxScore) candidates.push(hash);
  }

  if (candidates.length === 1) return candidates[0];

  // Tie-break: prefer icons appearing in fewer total index tags (more specialized)
  let bestSpecificity = Infinity;
  const finalists: string[] = [];

  for (const hash of candidates) {
    const tagCount = ICON_TAG_COUNT.get(hash) ?? Infinity;
    if (tagCount < bestSpecificity) {
      bestSpecificity = tagCount;
      finalists.length = 0;
      finalists.push(hash);
    } else if (tagCount === bestSpecificity) {
      finalists.push(hash);
    }
  }

  return finalists[Math.floor(Math.random() * finalists.length)];
}

// ─── Main Entry Point ──────────────────────────────────────────────────────

/**
 * @param tags     - Raw tags from the focus slot (e.g. ["backpacking", "tent", "mountain"])
 * @param category - Focus slot category for fallback (e.g. "travel")
 * @returns Icon hash string (e.g. "vypqhraa")
 */
export function getIconForTags(tags: string[], category?: string): string {
  // Step 1: Resolve all tags through synonym + stem pipeline
  const resolved = tags.flatMap(resolveTag);
  const unique = [...new Set(resolved)];

  // Step 2: Score and pick best
  const scores = scoreIcons(unique);
  const best = pickBest(scores);

  if (best) return best;

  // Step 3: Category fallback
  if (category && CATEGORY_FALLBACK_TAGS[category]) {
    const fallbackScores = scoreIcons(CATEGORY_FALLBACK_TAGS[category]);
    const fallbackBest = pickBest(fallbackScores);
    if (fallbackBest) return fallbackBest;
  }

  // Step 4: Random (should very rarely reach here)
  return ALL_HASHES[Math.floor(Math.random() * ALL_HASHES.length)];
}