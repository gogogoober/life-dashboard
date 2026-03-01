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

// ─── City Map ──────────────────────────────────────────────────────

export type PinType = "stay" | "activity" | "food" | "transit";

export interface MapPin {
  name: string;
  lng: number;
  lat: number;
  type: PinType;
  days: string;
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
