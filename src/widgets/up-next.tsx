import type {
  WidgetProps,
  UpNextData,
  UpNextThread,
  UpNextHabit,
  UpNextPriority,
} from "../types";
import { Section, Panel, Text, Label, Pill, Divider } from "../components";
import {
  urgencyToVariant,
  categoryToStatus,
  habitStateToVariant,
  priorityToStatus,
} from "../utils/status-mapping";

interface UpNextProps extends WidgetProps {
  data: UpNextData;
}

const HABIT_EMOJI: Record<string, string> = {
  workout:  "🏋️",
  laundry:  "🧺",
  cleaning: "🧹",
};

const HABIT_STATE_TEXT: Record<"ok" | "late" | "severe", string> = {
  ok:     "✓",
  late:   "!",
  severe: "!!",
};

const URGENCY_SYMBOL: Record<"active" | "waiting" | "nudge", string> = {
  active:  "▸",
  waiting: "◦",
  nudge:   "◦",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function HabitRow({ habits }: { habits: UpNextHabit[] }) {
  return (
    <div className="flex items-center gap-4">
      {habits.map((habit) => {
        const emoji = HABIT_EMOJI[habit.id] ?? habit.id;
        return (
          <div key={habit.id} className="flex items-center gap-1">
            <span style={{ fontSize: 31, lineHeight: 1 }}>{emoji}</span>
            <Text variant={habitStateToVariant(habit.state)}>
              {HABIT_STATE_TEXT[habit.state]}
            </Text>
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
          <Text variant="emphasis">▸</Text>
          <Text variant="emphasis" as="span">{note}</Text>
        </div>
      ))}
    </div>
  );
}

function ThreadRow({ thread }: { thread: UpNextThread }) {
  return (
    <div className="flex flex-col gap-0.5">
      {/* Line 1: indicator + task */}
      <div className="flex items-start gap-1.5">
        <Text variant={urgencyToVariant(thread.urgency)}>
          {URGENCY_SYMBOL[thread.urgency]}
        </Text>
        <Text variant="primary">{thread.task}</Text>
      </div>
      {/* Line 2: epic pill + date */}
      <div className="flex items-center gap-1.5" style={{ paddingLeft: "1.25rem" }}>
        <Pill position="inline" status={categoryToStatus(thread.category)}>
          {thread.epic}
        </Pill>
        <Label variant="secondary">·</Label>
        <Label variant="secondary">{thread.left_off_date}</Label>
      </div>
    </div>
  );
}

function PriorityRow({ priority }: { priority: UpNextPriority }) {
  return (
    <Panel status={priorityToStatus(priority.urgency)}>
      <div className="flex flex-col gap-0.5">
        <Text variant="primary">{priority.label}</Text>
        <Text variant="secondary" as="p">{priority.reason}</Text>
      </div>
    </Panel>
  );
}

// ─── Main widget ─────────────────────────────────────────────────────────────

export function UpNext({ data, size }: UpNextProps) {
  const isLarge = size === "large";
  const threads = data.active_threads.slice(0, 3);
  const notes = data.pickup_notes.slice(0, 2);
  const priorities = data.smart_priorities.slice(0, 2);

  return (
    <Section use="primary" title="Up Next" className="h-full">
      <div className="flex flex-col justify-between h-full">
        {/* Top content */}
        <div className="flex flex-col gap-0">
          {notes.length > 0 && <PickupNotes notes={notes} />}

          <Divider spacing="md" />

          <div className="flex flex-col gap-3">
            {threads.map((thread, i) => (
              <ThreadRow key={i} thread={thread} />
            ))}
          </div>

          {isLarge && priorities.length > 0 && (
            <>
              <Divider spacing="md" />
              <div className="flex flex-col gap-0">
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
    </Section>
  );
}
