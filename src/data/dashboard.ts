import { useState, useEffect } from "react";

import type {
  DashboardData,
  DashboardItem,
  ItemCategory,
  DeadlineItem,
} from "../types/dashboard";

import type {
  ContextItem,
  ContextCategory,
  UrgencyLevel,
  DashboardEvent,
  ActiveThread,
  ThreadTier,
  ThreadDomain,
} from "../types";

// ─── Fetch + hook ────────────────────────────────────────────────────────────

export async function fetchDashboard(): Promise<DashboardData> {
  const url = import.meta.env.BASE_URL + "dashboard.json";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch dashboard.json (${res.status})`);
  return res.json();
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

// ─── Selectors ───────────────────────────────────────────────────────────────

export function getHotItems(data: DashboardData): DashboardItem[] {
  return data.items.filter((i) => i.heat === "hot");
}

export function getWarmItems(data: DashboardData): DashboardItem[] {
  return data.items.filter((i) => i.heat === "warm");
}

export function getItemsByCategory(
  data: DashboardData,
  category: ItemCategory
): DashboardItem[] {
  return data.items.filter((i) => i.category === category);
}

export function getUpcomingDeadlines(data: DashboardData): DeadlineItem[] {
  return (data.items.filter(
    (i): i is DeadlineItem =>
      i.deadline !== null && i.days_until_deadline !== null
  ) as DeadlineItem[]).sort(
    (a, b) => a.days_until_deadline - b.days_until_deadline
  );
}

// ─── Adapters ────────────────────────────────────────────────────────────────

/** DashboardData → ContextItem[] for the ContextResume widget */
export function toContextItems(data: DashboardData): ContextItem[] {
  return data.items
    .filter((i) => i.heat !== "archived")
    .map((i) => {
      const urgency: UrgencyLevel = i.heat === "hot" ? "active" : "waiting";

      const category: ContextCategory =
        i.tag === "work"
          ? "work"
          : i.category === "people"
          ? "conversation"
          : "personal";

      const lastTouched =
        i.deadline !== null
          ? `Due ${new Date(i.deadline).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}`
          : i.heat_reason;

      return {
        category,
        label: i.title,
        context: i.summary,
        lastTouched,
        urgency,
      };
    });
}

/** DashboardData → DashboardEvent[] for the TemporalBubbleMap widget */
export function toEvents(data: DashboardData): DashboardEvent[] {
  return data.items
    .filter((i) => i.deadline !== null)
    .map((i) => {
      const weight =
        i.pinned && i.heat === "hot"
          ? 10
          : i.heat === "hot"
          ? 7
          : i.pinned
          ? 6
          : 4;

      return {
        name: i.title,
        date: new Date(i.deadline!),
        weight,
        actions: i.open_actions.map((a) => ({ name: a, status: "todo" as const })),
      };
    });
}

/** DashboardData → ActiveThread[] for the ActiveThreads widget */
export function toActiveThreads(data: DashboardData): ActiveThread[] {
  // Pick big rock: first open action of the highest-priority pinned hot item
  const bigRockItem = data.items.find(
    (i) => i.heat === "hot" && i.pinned && i.open_actions.length > 0
  );

  const generatedDate = new Date(data.generated_at).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric" }
  );

  return data.items
    .filter((i) => i.heat !== "archived")
    .map((i) => {
      const tier: ThreadTier = i.heat === "hot" ? "main" : "side";
      const domain: ThreadDomain = i.tag === "work" ? "work" : "personal";

      const tasks = i.open_actions.map((label, idx) => ({
        label,
        effort: "15 min" as const,
        bigRock: i.id === bigRockItem?.id && idx === 0,
      }));

      return {
        name: i.title,
        tier,
        domain,
        tasks,
        journal: [{ text: i.summary, date: generatedDate }],
      };
    });
}
