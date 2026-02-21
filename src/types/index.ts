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
