// ─── Primitive union types ───────────────────────────────────────────────────

export type ItemCategory =
  | "active-research"
  | "project"
  | "action-item"
  | "trip-event"
  | "people";

export type ItemTag = "personal" | "work" | "both";

export type HeatLevel = "hot" | "warm" | "archived";

export type HabitStatus = "done" | "partial" | "missed" | "pending";

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type CalendarEventType =
  | "flight"
  | "hotel"
  | "appointment"
  | "birthday"
  | "social"
  | "logistics"
  | "other";

// ─── Calendar event ──────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  /** ISO datetime or YYYY-MM-DD */
  start: string;
  /** ISO datetime or YYYY-MM-DD */
  end: string;
  all_day: boolean;
  location: string | null;
  description: string | null;
  attendees: string[];
  /** Significance score 1–10 */
  weight: number;
  days_until: number;
  /** Flights/hotels link to their parent trip item; null for standalone events */
  related_item_id: string | null;
}

// ─── Working-memory item ─────────────────────────────────────────────────────

export interface DashboardItem {
  id: string;
  title: string;
  category: ItemCategory;
  tag: ItemTag;
  heat: HeatLevel;
  heat_reason: string;
  summary: string;
  sub_threads: string[];
  open_actions: string[];
  /** YYYY-MM-DD — from calendar when matched, else null */
  start_date: string | null;
  /** YYYY-MM-DD — from calendar when matched, else null */
  end_date: string | null;
  /** YYYY-MM-DD or null */
  deadline: string | null;
  pinned: boolean;
  days_until_deadline: number | null;
  /** true when start_date/end_date were enriched from Google Calendar */
  calendar_source: boolean;
}

// ─── Habit tracking ──────────────────────────────────────────────────────────

export interface Habit {
  id: string;
  completions: DayOfWeek[];
  status: HabitStatus;
}

export interface HabitTracking {
  /** YYYY-MM-DD */
  week_start: string;
  habits: Habit[];
}

// ─── Meta ────────────────────────────────────────────────────────────────────

export interface DashboardMeta {
  hot_count: number;
  warm_count: number;
  archived_count: number;
  upcoming_events_count: number;
}

// ─── Root ────────────────────────────────────────────────────────────────────

export interface DashboardData {
  /** ISO timestamp */
  generated_at: string;
  items: DashboardItem[];
  calendar_events: CalendarEvent[];
  habit_tracking: HabitTracking;
  meta: DashboardMeta;
}

// ─── Derived / filtered types ─────────────────────────────────────────────────

export type HotItem = DashboardItem & { heat: "hot" };
export type WarmItem = DashboardItem & { heat: "warm" };
export type ArchivedItem = DashboardItem & { heat: "archived" };

/** An item that has a confirmed deadline and days-until value */
export type DeadlineItem = DashboardItem & {
  deadline: string;
  days_until_deadline: number;
};

/** An item whose dates were enriched from Google Calendar */
export type CalendarEnrichedItem = DashboardItem & {
  start_date: string;
  end_date: string;
  calendar_source: true;
};

/** A calendar event that is linked to a parent working-memory item */
export type LinkedCalendarEvent = CalendarEvent & {
  related_item_id: string;
};
