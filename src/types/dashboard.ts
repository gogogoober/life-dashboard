// ─── Primitive union types ──────────────────────────────────────────────────

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

// ─── Core item ──────────────────────────────────────────────────────────────

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
  /** YYYY-MM-DD or null */
  deadline: string | null;
  pinned: boolean;
  days_until_deadline: number | null;
}

// ─── Habit tracking ─────────────────────────────────────────────────────────

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

// ─── Meta ───────────────────────────────────────────────────────────────────

export interface DashboardMeta {
  hot_count: number;
  warm_count: number;
  archived_count: number;
}

// ─── Root ───────────────────────────────────────────────────────────────────

export interface DashboardData {
  /** ISO timestamp */
  generated_at: string;
  items: DashboardItem[];
  habit_tracking: HabitTracking;
  meta: DashboardMeta;
}

// ─── Derived / filtered types ────────────────────────────────────────────────

export type HotItem = DashboardItem & { heat: "hot" };
export type WarmItem = DashboardItem & { heat: "warm" };
export type ArchivedItem = DashboardItem & { heat: "archived" };

/** An item that has a confirmed deadline and days-until value */
export type DeadlineItem = DashboardItem & {
  deadline: string;
  days_until_deadline: number;
};
