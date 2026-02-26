import type {
  DashboardEvent, ContextItem, MapPin, PinType, ActiveThread,
  UpNextThread, UpNextHabit, UpNextPriority, UpNextData,
  CalendarEvent,
} from "../types";

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

export const UP_NEXT_STUB: UpNextData = {
  generated_at: "2026-02-23T14:00:00.000Z",
  context: {
    day_of_week: "monday",
    time_of_day: "afternoon",
    is_weekend: false,
    after_6pm: false,
  },
  active_threads: [
    {
      task: "Fix burst limit edge case — failing test",
      epic: "Rate Limit PR",
      category: "work",
      left_off: "Token bucket mostly working, one edge case failing",
      left_off_date: "Feb 20",
      urgency: "active",
    },
    {
      task: "Book JR Rail Pass — prices go up in March",
      epic: "Japan Trip",
      category: "personal",
      left_off: "Booked flights and Tokyo hotel, Kyoto still open",
      left_off_date: "Feb 21",
      urgency: "active",
    },
    {
      task: "Follow up with Miguel for headcount numbers",
      epic: "Q1 Planning",
      category: "work",
      left_off: "Draft 80% done, blocked on capacity section",
      left_off_date: "Feb 19",
      urgency: "waiting",
    },
  ],
  pickup_notes: [
    "Rate limit PR has one failing edge case",
    "Kyoto hotel still needs booking",
  ],
  habits: [
    { id: "workout", state: "ok" },
    { id: "laundry", state: "late" },
    { id: "cleaning", state: "ok" },
  ],
  smart_priorities: [
    {
      label: "Japan Trip",
      reason: "JR Pass prices increase next week",
      urgency: "high",
    },
    {
      label: "Q1 Planning",
      reason: "Miguel hasn't replied in 3 days",
      urgency: "medium",
    },
  ],
};

export const CALENDAR_EVENTS_STUB: CalendarEvent[] = [
  { name: "Dana's 30th", start: new Date(2026, 1, 28), end: new Date(2026, 1, 28), type: "event" },
  { name: "Cerebro Deploy", start: new Date(2026, 2, 1), end: new Date(2026, 2, 1), type: "deadline" },
  { name: "Mariano Call", start: new Date(2026, 2, 3), end: new Date(2026, 2, 3), type: "event" },
  { name: "Trip Planning", start: new Date(2026, 2, 5), end: new Date(2026, 2, 6), type: "event" },
  { name: "Chicago Trip", start: new Date(2026, 2, 13), end: new Date(2026, 2, 15), type: "travel" },
  { name: "Dentist", start: new Date(2026, 2, 15), end: new Date(2026, 2, 15), type: "event" },
  { name: "Japan Trip", start: new Date(2026, 2, 24), end: new Date(2026, 3, 2), type: "travel" },
];

export const ACTIVE_THREADS_STUB: ActiveThread[] = [
  {
    name: "Japan Trip",
    tier: "main",
    domain: "personal",
    tasks: [
      { label: "Buy travel adapter", effort: "15 min", bigRock: false },
      { label: "Book JR Rail Pass", effort: "1 hr", bigRock: true },
      { label: "Decide on Kyoto hotel — ryokan vs modern", effort: "1 hr", bigRock: false },
      { label: "Plan day-by-day itinerary", effort: "half day", bigRock: false },
    ],
    journal: [
      { text: "Booked flights and Tokyo hotel. Kyoto hotel still open.", date: "Feb 21" },
      { text: "Started building itinerary. Tsukiji and Akihabara on day 1.", date: "Feb 18" },
      { text: "Decided on late March dates. Isabella confirmed.", date: "Feb 14" },
    ],
  },
  {
    name: "API Rate Limiting PR",
    tier: "main",
    domain: "work",
    tasks: [
      { label: "Fix burst limit edge case — failing test", effort: "1 hr", bigRock: false },
      { label: "Ping Sarah for re-review after fix", effort: "15 min", bigRock: false },
    ],
    journal: [
      { text: "Token bucket mostly working. One edge case with burst limits failing.", date: "Feb 20" },
      { text: "Sarah left initial review comments. Addressed 4 of 5.", date: "Feb 19" },
    ],
  },
  {
    name: "Q1 Planning Doc",
    tier: "main",
    domain: "work",
    tasks: [
      { label: "Follow up with Miguel for headcount numbers", effort: "15 min", bigRock: false },
      { label: "Write capacity section once numbers arrive", effort: "half day", bigRock: false },
    ],
    journal: [
      { text: "Draft is 80% done. Capacity section is the last gap.", date: "Feb 19" },
    ],
  },
  {
    name: "Fountain Pen Research",
    tier: "side",
    domain: "personal",
    tasks: [
      { label: "Order replacement nib for Pilot 823", effort: "15 min", bigRock: false },
    ],
    journal: [
      { text: "Narrowed to Pilot 823 or Sailor Pro Gear. Leaning Pilot for the vac filler.", date: "Feb 20" },
    ],
  },
  {
    name: "Follow Up with Jake",
    tier: "side",
    domain: "personal",
    tasks: [
      { label: "Text Jake about the job opportunity he mentioned", effort: "15 min", bigRock: false },
    ],
    journal: [
      { text: "Jake brought up a role at his company during dinner. Said he'd send details.", date: "Feb 17" },
    ],
  },
  {
    name: "Cerebro Dashboard",
    tier: "main",
    domain: "personal",
    tasks: [
      { label: "Build Active Threads widget", effort: "half day", bigRock: false },
      { label: "Set up working memory update cron job", effort: "full day", bigRock: false },
    ],
    journal: [
      { text: "Consolidated Context Resume and Up Next into quest-log-style panel.", date: "Feb 23" },
      { text: "Bubble map and city map working. Widget registry and template system solid.", date: "Feb 21" },
    ],
  },
];
