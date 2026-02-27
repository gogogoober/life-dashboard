import type {
  DateEvent, ContextItem, MapPin, PinType, ActiveThread,
  UpNextThread, UpNextHabit, UpNextPriority, UpNextData,
} from "../types";

export const EVENTS: DateEvent[] = [
  {
    id: "dinner-isabella",
    name: "Dinner w/ Isabella",
    startDate: "2026-02-21",
    durationDays: 1,
    importance: 3,
    category: "social",
    source: "google",
    isRecurring: false,
    context: "Dinner with Isabella at the usual spot.",
    actions: [],
    people: ["Isabella"],
  },
  {
    id: "danas-birthday",
    name: "Dana's Birthday",
    startDate: "2026-02-28",
    durationDays: 1,
    importance: 6,
    category: "personal",
    source: "both",
    isRecurring: false,
    context: "Dana's 30th — gift, restaurant, and surprise still open.",
    hook: "3 actions still open",
    actions: [
      { id: "buy-gift", name: "Buy gift", status: "todo" },
      { id: "book-restaurant", name: "Book restaurant", status: "todo" },
      { id: "plan-surprise", name: "Plan surprise?", status: "todo" },
    ],
    people: ["Dana"],
  },
  {
    id: "chicago-trip",
    name: "Chicago Trip",
    startDate: "2026-03-13",
    durationDays: 3,
    importance: 6,
    category: "travel",
    source: "both",
    isRecurring: false,
    context: "Weekend trip to Chicago — flights and hotel still needed.",
    hook: "3 actions still open",
    actions: [
      { id: "book-flights", name: "Book flights", status: "todo" },
      { id: "hotel", name: "Hotel", status: "todo" },
      { id: "dinner-plans", name: "Dinner plans", status: "todo" },
    ],
    people: [],
  },
  {
    id: "japan-trip-2026",
    name: "Japan Trip",
    startDate: "2026-03-24",
    durationDays: 10,
    importance: 10,
    category: "travel",
    source: "both",
    isRecurring: false,
    context: "Two-week trip with Dana — Tokyo + Kyoto. Flights booked, need to finalize hotels and rail pass.",
    hook: "12 actions still open — JR Rail Pass is time-sensitive",
    actions: [
      { id: "flights", name: "Flights", status: "todo" },
      { id: "hotel-tokyo", name: "Hotel Tokyo", status: "todo" },
      { id: "hotel-kyoto", name: "Hotel Kyoto", status: "todo" },
      { id: "jr-rail-pass", name: "JR Rail Pass", status: "todo" },
      { id: "tsukiji-market", name: "Tsukiji Market", status: "todo" },
      { id: "fushimi-inari", name: "Fushimi Inari", status: "todo" },
      { id: "shibuya-night", name: "Shibuya night out", status: "todo" },
      { id: "onsen-day", name: "Onsen day trip", status: "todo" },
      { id: "akihabara", name: "Akihabara", status: "todo" },
      { id: "omakase-dinner", name: "Omakase dinner", status: "todo" },
      { id: "pack-bags", name: "Pack bags", status: "todo" },
      { id: "get-yen", name: "Get yen", status: "todo" },
    ],
    people: ["Dana"],
  },
  {
    id: "return-japan",
    name: "Return from Japan",
    startDate: "2026-04-02",
    durationDays: 1,
    importance: 3,
    category: "personal",
    source: "craft",
    isRecurring: false,
    context: "Landing back — unpack and reset.",
    hook: "1 action remaining",
    actions: [{ id: "unpack", name: "Unpack & laundry", status: "todo" }],
    people: [],
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

export const CALENDAR_EVENTS_STUB: DateEvent[] = [
  { id: "danas-30th", name: "Dana's 30th", startDate: "2026-02-28", durationDays: 1, importance: 6, category: "social", source: "google", isRecurring: false, context: "Dana's birthday dinner.", actions: [], people: ["Dana"] },
  { id: "cerebro-deploy", name: "Cerebro Deploy", startDate: "2026-03-01", durationDays: 1, importance: 5, category: "work", source: "craft", isRecurring: false, context: "Deploy deadline for Cerebro dashboard.", actions: [], people: [] },
  { id: "mariano-call", name: "Mariano Call", startDate: "2026-03-03", durationDays: 1, importance: 3, category: "social", source: "google", isRecurring: false, context: "Catch-up call with Mariano.", actions: [], people: ["Mariano"] },
  { id: "trip-planning", name: "Trip Planning", startDate: "2026-03-05", durationDays: 2, importance: 4, category: "personal", source: "craft", isRecurring: false, context: "Block off time to finalize Japan itinerary.", actions: [], people: [] },
  { id: "chicago-trip-cal", name: "Chicago Trip", startDate: "2026-03-13", durationDays: 3, importance: 6, category: "travel", source: "google", isRecurring: false, context: "Weekend trip to Chicago.", actions: [], people: [] },
  { id: "dentist", name: "Dentist", startDate: "2026-03-15", durationDays: 1, importance: 2, category: "personal", source: "google", isRecurring: false, context: "Routine dental checkup.", actions: [], people: [] },
  { id: "japan-trip-cal", name: "Japan Trip", startDate: "2026-03-24", durationDays: 10, importance: 10, category: "travel", source: "google", isRecurring: false, context: "Tokyo + Kyoto trip.", actions: [], people: ["Dana"] },
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
