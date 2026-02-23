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

// ─── Placeholder ───────────────────────────────────────────────────

export interface PlaceholderItem {
  label: string;
  sub?: string;
  color?: string;
}

// ─── Template System ───────────────────────────────────────────────

export interface SlotConfig {
  widgetId: string;
  gridColumn: string;
  gridRow: string;
  size: SlotSize;
  props?: Record<string, unknown>;
}

export interface TemplateConfig {
  name: string;
  columns: string;
  rows: string;
  slots: SlotConfig[];
}
