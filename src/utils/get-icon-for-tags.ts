/**
 * getIconForTags — Ranked icon matching via tag intersection scoring
 *
 * How it works:
 * 1. For each item tag, look up which icon hashes have that tag
 * 2. Count how many of the item's tags each icon matches
 * 3. Icons with the MOST matching tags score highest (specificity wins)
 * 4. Random pick from the top-scoring icons
 *
 * Example:
 *   Item tags: ["travel", "japan", "visa", "temple"]
 *
 *   Icon A (torii gate):  matches "japan", "temple", "travel"  → score 3
 *   Icon B (passport):    matches "travel", "visa"              → score 2
 *   Icon C (airplane):    matches "travel"                      → score 1
 *
 *   → Picks randomly from icons with score 3 (most specific match)
 *
 * Fallback chain:
 *   1. Best tag intersection score
 *   2. Category fallback (if no tag matches at all)
 *   3. Random icon from full library
 */

import tagIndex from "../assets/icons/icon-tag-index.json";

// Pre-compute the full list of icon hashes once
const ALL_HASHES: string[] = [...new Set(Object.values(tagIndex).flat())];

// Category → broad fallback tags (used when zero tag matches)
const CATEGORY_FALLBACK_TAGS: Record<string, string[]> = {
  travel: ["travel", "plane", "suitcase", "map"],
  work: ["computer", "office", "desk", "laptop"],
  personal: ["person", "home", "heart", "star"],
  social: ["people", "meeting", "couple", "group"],
};

/**
 * Score every icon by how many of the given tags it matches.
 * Returns a Map<hash, score> for icons with score > 0.
 */
function scoreIcons(itemTags: string[]): Map<string, number> {
  const scores = new Map<string, number>();

  for (const tag of itemTags) {
    const normalizedTag = tag.toLowerCase();
    const matchingHashes = (tagIndex as Record<string, string[]>)[normalizedTag];
    if (!matchingHashes) continue;

    for (const hash of matchingHashes) {
      scores.set(hash, (scores.get(hash) ?? 0) + 1);
    }
  }

  return scores;
}

/**
 * From a scores map, return only the hashes with the highest score.
 */
function topScoringHashes(scores: Map<string, number>): string[] {
  if (scores.size === 0) return [];

  let maxScore = 0;
  for (const score of scores.values()) {
    if (score > maxScore) maxScore = score;
  }

  const top: string[] = [];
  for (const [hash, score] of scores) {
    if (score === maxScore) top.push(hash);
  }

  return top;
}

/**
 * Pick a random element from an array.
 */
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Main entry point.
 *
 * @param tags     - Tags from the focus slot (e.g. ["travel", "japan", "visa"])
 * @param category - Focus slot category for fallback (e.g. "travel")
 * @returns Icon hash string (e.g. "pjzsyzye") for loading from /assets/icons/lordicon/
 */
export function getIconForTags(
  tags: string[],
  category?: string
): string {
  // Step 1: Score all icons by tag intersection
  const scores = scoreIcons(tags);
  const best = topScoringHashes(scores);

  if (best.length > 0) {
    return randomPick(best);
  }

  // Step 2: Category fallback — try broad tags for the category
  if (category && CATEGORY_FALLBACK_TAGS[category]) {
    const fallbackScores = scoreIcons(CATEGORY_FALLBACK_TAGS[category]);
    const fallbackBest = topScoringHashes(fallbackScores);

    if (fallbackBest.length > 0) {
      return randomPick(fallbackBest);
    }
  }

  // Step 3: Totally random — no matches at all
  return randomPick(ALL_HASHES);
}