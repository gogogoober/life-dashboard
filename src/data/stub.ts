import type { DashboardEvent, ContextItem, MapPin, PinType } from "../types";

export const EVENTS: DashboardEvent[] = [
  {
    name: "Dinner w/ Isabella",
    date: new Date(2026, 1, 21),
    weight: 3,
    actions: [],
  },
  {
    name: "Dana's Birthday",
    date: new Date(2026, 1, 28),
    weight: 6,
    actions: [
      { name: "Buy gift", status: "todo" },
      { name: "Book restaurant", status: "todo" },
      { name: "Plan surprise?", status: "todo" },
    ],
  },
  {
    name: "Chicago Trip",
    date: new Date(2026, 2, 13),
    weight: 6,
    actions: [
      { name: "Book flights", status: "todo" },
      { name: "Hotel", status: "todo" },
      { name: "Dinner plans", status: "todo" },
    ],
  },
  {
    name: "Japan Trip",
    date: new Date(2026, 2, 24),
    weight: 10,
    actions: [
      { name: "Flights", status: "todo" },
      { name: "Hotel Tokyo", status: "todo" },
      { name: "Hotel Kyoto", status: "todo" },
      { name: "JR Rail Pass", status: "todo" },
      { name: "Tsukiji Market", status: "todo" },
      { name: "Fushimi Inari", status: "todo" },
      { name: "Shibuya night out", status: "todo" },
      { name: "Onsen day trip", status: "todo" },
      { name: "Akihabara", status: "todo" },
      { name: "Omakase dinner", status: "todo" },
      { name: "Pack bags", status: "todo" },
      { name: "Get yen", status: "todo" },
    ],
  },
  {
    name: "Return from Japan",
    date: new Date(2026, 3, 2),
    weight: 3,
    actions: [{ name: "Unpack & laundry", status: "todo" }],
  },
];

export const CONTEXT_STUB: ContextItem[] = [
  {
    category: "work",
    label: "API rate limiting PR",
    context:
      "Waiting on code review from Sarah. Left off debugging the token bucket implementation — failing test on edge case with burst limits.",
    lastTouched: "Today, 4:30pm",
    urgency: "active",
  },
  {
    category: "work",
    label: "Q1 planning doc",
    context:
      "Draft is 80% done. Still need the capacity section — blocked on headcount numbers from Miguel.",
    lastTouched: "Yesterday",
    urgency: "waiting",
  },
  {
    category: "personal",
    label: "Dashboard project",
    context:
      "Built temporal bubble map with ECharts. Next: city map module and context resume. Need to define JSON data schema.",
    lastTouched: "Today",
    urgency: "active",
  },
  {
    category: "conversation",
    label: "Follow up with Jake",
    context:
      "He mentioned a job opportunity he wanted to talk about. Said he'd send details — hasn't yet.",
    lastTouched: "3 days ago",
    urgency: "nudge",
  },
];

export const TOKYO_PINS: MapPin[] = [
  { name: "Hotel (Shinjuku)", lng: 139.6917, lat: 35.6895, type: "stay", days: "Mar 24–28" },
  { name: "Tsukiji Market", lng: 139.7706, lat: 35.6654, type: "activity", days: "Mar 25" },
  { name: "Akihabara", lng: 139.7711, lat: 35.7023, type: "activity", days: "Mar 25" },
  { name: "Shibuya", lng: 139.7016, lat: 35.658, type: "activity", days: "Mar 26" },
  { name: "Senso-ji Temple", lng: 139.7966, lat: 35.7148, type: "activity", days: "Mar 26" },
  { name: "Omakase Dinner", lng: 139.7454, lat: 35.6619, type: "food", days: "Mar 27" },
  { name: "Tokyo Station", lng: 139.7671, lat: 35.6812, type: "transit", days: "Mar 28" },
];

export const PIN_COLORS: Record<PinType, string> = {
  stay: "#e8a735",
  activity: "#6ee7b7",
  food: "#f87171",
  transit: "#93c5fd",
};
