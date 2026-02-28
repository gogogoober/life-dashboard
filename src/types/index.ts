export type SlotSize = "default" | "large";

export interface WidgetProps {
  size: SlotSize;
}

// ─── Event / Bubble Map ────────────────────────────────────────────

export interface EventAction {
  name: string;
  status: "todo" | "done";
}

export interface DashboardEvent {
  name: string;
  date: Date;
  weight: number;
  actions: EventAction[];
}

// ─── Context Resume ────────────────────────────────────────────────

export type UrgencyLevel = "active" | "waiting" | "nudge";
export type ContextCategory = "work" | "personal" | "conversation";

export interface ContextItem {
  category: ContextCategory;
  label: string;
  context: string;
  lastTouched: string;
  urgency: UrgencyLevel;
}

// ─── City Map ──────────────────────────────────────────────────────

export type PinType = "stay" | "activity" | "food" | "transit";

export interface MapPin {
  name: string;
  lng: number;
  lat: number;
  type: PinType;
  days: string;
}

// ─── Active Threads ────────────────────────────────────────

export type ThreadTier = "main" | "side";
export type ThreadDomain = "work" | "personal";
export type EffortBucket = "15 min" | "1 hr" | "half day" | "full day";

export interface ThreadTask {
  label: string;
  effort: EffortBucket;
  bigRock: boolean;
}

export interface ThreadJournalEntry {
  text: string;
  date: string;
}

export interface ActiveThread {
  name: string;
  tier: ThreadTier;
  domain: ThreadDomain;
  tasks: ThreadTask[];
  journal: ThreadJournalEntry[];
}

// ─── Up Next (Daily Briefing) ──────────────────────────────────────

export type UpNextCategory = "work" | "personal";
export type UpNextUrgency = "active" | "waiting" | "nudge";
export type HabitState = "ok" | "late" | "severe";
export type PriorityUrgency = "high" | "medium";

export interface UpNextThread {
  /** The most actionable next step — imperative, specific */
  task: string;
  /** Parent item title, shown as a subtle pill/tag */
  epic: string;
  /** work or personal */
  category: UpNextCategory;
  /** Where you last left off on this thread */
  left_off: string;
  /** When the left_off was recorded, e.g. "Feb 21" */
  left_off_date: string;
  /** active = do it now, waiting = blocked, nudge = follow up */
  urgency: UpNextUrgency;
}

export interface UpNextHabit {
  /** Habit ID matching config: workout, laundry, cleaning */
  id: string;
  /** ok = on track, late = overdue, severe = very overdue */
  state: HabitState;
}

export interface UpNextPriority {
  /** Item title */
  label: string;
  /** Why it matters right now — max 8 words */
  reason: string;
  /** high or medium */
  urgency: PriorityUrgency;
}

export interface UpNextData {
  generated_at: string;
  context: {
    day_of_week: string;
    time_of_day: string;
    is_weekend: boolean;
    after_6pm: boolean;
  };
  active_threads: UpNextThread[];
  pickup_notes: string[];
  habits: UpNextHabit[];
  smart_priorities: UpNextPriority[];
}

// ─── Focus Engine ──────────────────────────────────────────────────

export type EffortLevel = "high" | "medium" | "low";

export interface QuestCard {
  slot: string;
  question: string;
  answer: string;
  nextStep: string;
  effort: EffortLevel;
  countdown: string;
  tags: string[];
  active: boolean;
}

// ─── Action Items (Dynamic Island) ─────────────────────────────────

export type HeatLevel = "hot" | "warm" | "cool";

export interface ActionThread {
  name: string;
  heat: HeatLevel;
  lastTouched: string;
}

// ─── Dates (unified schema) ───────────────────────────────────────

export type { DateEvent, DateAction, DatesData, EventCategory, EventSource, ActionStatus } from "./dates";
export { daysUntil, isMultiDay, openActionCount, withinDays } from "./dates";

// ─── Placeholder ───────────────────────────────────────────────────

export interface PlaceholderItem {
  label: string;
  sub?: string;
  color?: string;
}

// ─── Template System ───────────────────────────────────────────────

export type SlotLayer = 'background' | 'foreground' | 'floating';

export interface SlotPlacement {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  width?: string;
  height?: string;
}

export interface SlotConfig {
  widgetId: string;
  gridColumn?: string;
  gridRow?: string;
  size: SlotSize;
  props?: Record<string, unknown>;
  layer?: SlotLayer;
  placement?: SlotPlacement;
}

export interface TemplateConfig {
  name: string;
  columns: string;
  rows: string;
  slots: SlotConfig[];
}
