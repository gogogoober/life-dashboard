import type {
  WidgetProps,
  UpNextData,
  UpNextThread,
  UpNextHabit,
  UpNextPriority,
  UpNextCategory,
  UpNextUrgency,
  HabitState,
  PriorityUrgency,
} from "../types";
import { ModuleCard } from "./module-card";

interface UpNextProps extends WidgetProps {
  data: UpNextData;
}

// ─── Design tokens ───────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<UpNextCategory, string> = {
  work: "hsl(25, 92%, 55%)",
  personal: "#6ee7b7",
};

const URGENCY_INDICATOR: Record<UpNextUrgency, { symbol: string; color: string }> = {
  active: { symbol: "▸", color: "hsl(25, 92%, 55%)" },
  waiting: { symbol: "◦", color: "#fbbf24" },
  nudge:   { symbol: "◦", color: "#93c5fd" },
};

const HABIT_EMOJI: Record<string, string> = {
  workout: "🏋️",
  laundry: "🧺",
  cleaning: "🧹",
};

const HABIT_STATE: Record<HabitState, { text: string; color: string }> = {
  ok:     { text: "✓",  color: "#6ee7b7" },
  late:   { text: "!",  color: "#fbbf24" },
  severe: { text: "!!", color: "#ef4444" },
};

const PRIORITY_ICON: Record<PriorityUrgency, { symbol: string; color: string }> = {
  high:   { symbol: "⚠", color: "#ef4444" },
  medium: { symbol: "△", color: "#fbbf24" },
};

const DIVIDER = (
  <div style={{ height: 1, background: "#1e2230", margin: "10px 0" }} />
);

// ─── Sub-components ──────────────────────────────────────────────────────────

function HabitRow({ habits }: { habits: UpNextHabit[] }) {
  return (
    <div className="flex items-center gap-4">
      {habits.map((habit) => {
        const emoji = HABIT_EMOJI[habit.id] ?? habit.id;
        const state = HABIT_STATE[habit.state] ?? HABIT_STATE.ok;
        return (
          <div key={habit.id} className="flex items-center gap-1">
            <span style={{ fontSize: 31, lineHeight: 1 }}>{emoji}</span>
            <span
              style={{ fontSize: 10, fontWeight: 600, color: state.color, lineHeight: 1 }}
            >
              {state.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PickupNotes({ notes }: { notes: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      {notes.slice(0, 2).map((note, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <span style={{ color: "#ffffff", fontSize: 10, lineHeight: 1.5, flexShrink: 0 }}>▸</span>
          <span style={{ color: "#ffffff", fontSize: 14, lineHeight: 1.4 }}>{note}</span>
        </div>
      ))}
    </div>
  );
}

function ThreadRow({ thread }: { thread: UpNextThread }) {
  const indicator = URGENCY_INDICATOR[thread.urgency];
  const epicColor = CATEGORY_COLOR[thread.category];

  return (
    <div className="flex flex-col gap-0.5">
      {/* Line 1: indicator + task */}
      <div className="flex items-start gap-1.5">
        <span
          style={{
            color: indicator.color,
            fontSize: 12,
            lineHeight: 1.4,
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          {indicator.symbol}
        </span>
        <span
          className="text-sm font-medium leading-snug"
          style={{ color: "#ccc" }}
        >
          {thread.task}
        </span>
      </div>
      {/* Line 2: epic pill + date */}
      <div className="flex items-center gap-1.5" style={{ paddingLeft: "1.25rem" }}>
        <span
          className="rounded px-1.5 py-0.5"
          style={{
            color: epicColor,
            background: epicColor + "26",
            fontSize: 10,
            lineHeight: 1.4,
          }}
        >
          {thread.epic}
        </span>
        <span style={{ color: "#444", fontSize: 10 }}>·</span>
        <span style={{ color: "#444", fontSize: 10 }}>{thread.left_off_date}</span>
      </div>
    </div>
  );
}

function PriorityRow({ priority }: { priority: UpNextPriority }) {
  const icon = PRIORITY_ICON[priority.urgency];
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span style={{ color: icon.color, fontSize: 11, flexShrink: 0 }}>{icon.symbol}</span>
        <span className="text-sm font-medium" style={{ color: "#ccc" }}>
          {priority.label}
        </span>
      </div>
      <p style={{ color: "#555", fontSize: 11, lineHeight: 1.4, paddingLeft: "1.375rem" }}>
        {priority.reason}
      </p>
    </div>
  );
}

// ─── Main widget ─────────────────────────────────────────────────────────────

export function UpNext({ data, size }: UpNextProps) {
  const isLarge = size === "large";
  const threads = data.active_threads.slice(0, 3);
  const notes = data.pickup_notes.slice(0, 2);
  const priorities = data.smart_priorities.slice(0, 2);

  return (
    <ModuleCard title="Up Next" icon="⚡">
      <div className="flex flex-col justify-between h-full">
        {/* Top content — stays grouped at the top */}
        <div className="flex flex-col gap-0">
          {/* Pickup notes */}
          {notes.length > 0 && (
            <PickupNotes notes={notes} />
          )}

          {/* Threads */}
          {DIVIDER}
          <div className="flex flex-col gap-3">
            {threads.map((thread, i) => (
              <ThreadRow key={i} thread={thread} />
            ))}
          </div>

          {/* Smart priorities — large only */}
          {isLarge && priorities.length > 0 && (
            <>
              {DIVIDER}
              <div className="flex flex-col gap-3">
                {priorities.map((p, i) => (
                  <PriorityRow key={i} priority={p} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Habits — bottom right */}
        <div className="flex justify-end">
          <HabitRow habits={data.habits} />
        </div>
      </div>
    </ModuleCard>
  );
}
