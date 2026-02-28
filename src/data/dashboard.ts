import { useState, useEffect } from "react";

import type {
  DashboardData,
  DashboardItem,
  CalendarEvent,
  ItemCategory,
  DeadlineItem,
  LinkedCalendarEvent,
} from "../types/dashboard";

import type {
  ContextItem,
  ContextCategory,
  UrgencyLevel,
  DashboardEvent,
  ActiveThread,
  ThreadTier,
  ThreadDomain,
  UpNextData,
} from "../types";

// ─── Fetch + hook ─────────────────────────────────────────────────────────────

/**
 * Normalises a raw JSON payload from any schema version into the full
 * DashboardData contract. Fields added in later schema versions are back-filled
 * with safe defaults so old dashboard.json files still work.
 */
function normalise(raw: any): DashboardData {
  return {
    ...raw,
    calendar_events: raw.calendar_events ?? [],
    items: (raw.items ?? []).map((item: any) => ({
      start_date: null,
      end_date: null,
      calendar_source: false,
      ...item,
    })),
    meta: {
      upcoming_events_count: 0,
      ...raw.meta,
    },
  };
}

export async function fetchDashboard(): Promise<DashboardData> {
  const url = import.meta.env.BASE_URL + "dashboard.json";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch dashboard.json (${res.status})`);
  return normalise(await res.json());
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

// ─── Focus Engine data ────────────────────────────────────────────────────────

export interface FocusSlot {
  slot: number;
  category: "work" | "personal" | "travel";
  thread_name: string;
  question: string;
  answer: string;
  next_step: string;
  effort: "high" | "medium" | "low";
  countdown: string;
  tags: string[];
}

interface FocusEngineData {
  generated_at: string;
  energy_band: string;
  is_work_hours: boolean;
  is_weekend: boolean;
  slots: FocusSlot[];
  active_slot: number;
}

export async function fetchFocusEngine(): Promise<FocusEngineData> {
  const url = import.meta.env.BASE_URL + "focus-engine.json";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch focus-engine.json (${res.status})`);
  return res.json();
}

export function useFocusEngine() {
  const [data, setData] = useState<FocusEngineData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFocusEngine()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return { data, error };
}

// ─── Dates (unified schema) ──────────────────────────────────────────────────

import type { DatesData } from "../types/dates";

export async function fetchDates(): Promise<DatesData> {
  const url = import.meta.env.BASE_URL + "dates.json";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch dates.json (${res.status})`);
  return res.json();
}

export function useDates() {
  const [data, setData] = useState<DatesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDates()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return { data, error };
}

// ─── Orbital data ─────────────────────────────────────────────────────────────

interface OrbitalEvent {
  name: string;
  date: string; // YYYY-MM-DD
  weight: number;
  actions: Array<{ name: string; status: "todo" | "done" }>;
}

interface OrbitalData {
  generated_at: string;
  events: OrbitalEvent[];
}

export async function fetchOrbital(): Promise<OrbitalData> {
  const url = import.meta.env.BASE_URL + "orbital.json";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch orbital.json (${res.status})`);
  return res.json();
}

export function useOrbital() {
  const [data, setData] = useState<OrbitalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrbital()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return { data, error };
}

/** OrbitalData → DashboardEvent[] for the TemporalBubbleMap widget */
export function toOrbitalEvents(data: OrbitalData): DashboardEvent[] {
  return data.events.map((e) => ({
    name: e.name,
    date: new Date(e.date.length === 10 ? e.date + "T00:00:00" : e.date),
    weight: e.weight,
    actions: e.actions,
  }));
}

export async function fetchUpNext(): Promise<UpNextData> {
  const url = import.meta.env.BASE_URL + "up_next.json";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch up_next.json (${res.status})`);
  return res.json();
}

export function useUpNext() {
  const [data, setData] = useState<UpNextData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUpNext()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return { data, error };
}

// ─── Item selectors ───────────────────────────────────────────────────────────

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
  return (
    data.items.filter(
      (i): i is DeadlineItem =>
        i.deadline !== null && i.days_until_deadline !== null
    ) as DeadlineItem[]
  ).sort((a, b) => a.days_until_deadline - b.days_until_deadline);
}

// ─── Calendar event selectors ─────────────────────────────────────────────────

/** All calendar events sorted by days_until (soonest first) */
export function getUpcomingEvents(data: DashboardData): CalendarEvent[] {
  return [...data.calendar_events].sort((a, b) => a.days_until - b.days_until);
}

/** Calendar events linked to a specific working-memory item (e.g. flights for a trip) */
export function getEventsForItem(
  data: DashboardData,
  itemId: string
): LinkedCalendarEvent[] {
  return data.calendar_events.filter(
    (e): e is LinkedCalendarEvent => e.related_item_id === itemId
  );
}

/** Calendar events NOT linked to any working-memory item */
export function getStandaloneEvents(data: DashboardData): CalendarEvent[] {
  return data.calendar_events.filter((e) => e.related_item_id === null);
}

/** Calendar events in the next 7 days */
export function getThisWeekEvents(data: DashboardData): CalendarEvent[] {
  return data.calendar_events.filter(
    (e) => e.days_until >= 0 && e.days_until <= 7
  );
}

/**
 * Calendar events at or above a minimum weight (default 5).
 * Useful for filtering to only significant events.
 */
export function getHighWeightEvents(
  data: DashboardData,
  minWeight = 5
): CalendarEvent[] {
  return data.calendar_events.filter((e) => e.weight >= minWeight);
}

/** Returns an item paired with all its linked calendar events (flights, hotels, etc.) */
export function getTripWithLogistics(
  data: DashboardData,
  itemId: string
): { item: DashboardItem; events: LinkedCalendarEvent[] } | null {
  const item = data.items.find((i) => i.id === itemId);
  if (!item) return null;
  return { item, events: getEventsForItem(data, itemId) };
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

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

/**
 * DashboardData → DashboardEvent[] for the TemporalBubbleMap widget.
 *
 * Sources:
 * 1. Items with start_date (calendar-enriched trips/events) — positioned at start_date.
 *    Their linked calendar_events (flights, hotels) become child action bubbles.
 *    If no linked events exist, open_actions are used as children instead.
 * 2. Items with deadline but no start_date — positioned at deadline, open_actions as children.
 * 3. Standalone calendar_events (related_item_id === null) — own bubbles, no children.
 *    Linked events (related_item_id set) are NOT separate bubbles — they belong to their parent.
 */
export function toEvents(data: DashboardData): DashboardEvent[] {
  const events: DashboardEvent[] = [];

  // IDs of items that have linked calendar events (so we know not to duplicate them)
  const linkedItemIds = new Set(
    data.calendar_events
      .filter((e) => e.related_item_id !== null)
      .map((e) => e.related_item_id as string)
  );

  // 1 + 2: Working-memory items that have a position on the timeline
  for (const item of data.items) {
    if (item.heat === "archived") continue;

    const dateStr = item.start_date ?? item.deadline;
    if (!dateStr) continue;

    const weight =
      item.pinned && item.heat === "hot"
        ? 10
        : item.heat === "hot"
        ? 7
        : item.pinned
        ? 6
        : 4;

    // Prefer linked calendar events as children (they're more semantically rich).
    // Fall back to open_actions for items with no linked events.
    const linkedEvents = linkedItemIds.has(item.id)
      ? getEventsForItem(data, item.id)
      : [];

    const actions =
      linkedEvents.length > 0
        ? linkedEvents.map((e) => ({ name: e.title, status: "todo" as const }))
        : item.open_actions.map((a) => ({ name: a, status: "todo" as const }));

    events.push({
      name: item.title,
      date: new Date(dateStr.length === 10 ? dateStr + "T00:00:00" : dateStr),
      weight,
      actions,
    });
  }

  // 3: Standalone calendar events (birthdays, appointments, etc.)
  for (const event of getStandaloneEvents(data)) {
    events.push({
      name: event.title,
      date: new Date(event.start.length === 10 ? event.start + "T00:00:00" : event.start),
      weight: event.weight,
      actions: [],
    });
  }

  return events;
}

/** DashboardData → ActiveThread[] for the ActiveThreads widget */
export function toActiveThreads(data: DashboardData): ActiveThread[] {
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
