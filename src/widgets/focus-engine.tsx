import { useCallback, useMemo, useState } from "react";
import type { WidgetProps } from "../types";
import type { FocusTask, FocusEngineData } from "../data/dashboard";
import { Section, Heading, Text, Label, Pill } from "../components";
import { AnimatedIcon } from "../components/AnimatedIcon";
import { getIconForTags } from "../utils/get-icon-for-tags";

// ═══════════════════════════════════════════
// Design tokens
// ═══════════════════════════════════════════

const CATEGORY_COLORS: Record<
  string,
  { primary: string; emphasis: string; bg: string }
> = {
  travel: {
    primary: "#0097a7",
    emphasis: "#00e5ff",
    bg: "rgba(0, 151, 167, 0.1)",
  },
  work: {
    primary: "#78909c",
    emphasis: "#cfd8dc",
    bg: "rgba(120, 144, 156, 0.1)",
  },
  personal: {
    primary: "#8e4a9e",
    emphasis: "#ce93d8",
    bg: "rgba(142, 74, 158, 0.1)",
  },
  social: {
    primary: "#e8a735",
    emphasis: "#f5d180",
    bg: "rgba(232, 167, 53, 0.1)",
  },
};

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function parseCountdownDays(countdown: string | null): number | null {
  if (!countdown) return null;
  const match = countdown.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// ═══════════════════════════════════════════
// Icon component — tag-matched with fallback
// ═══════════════════════════════════════════

function SlotIcon({ tags, category }: { tags: string[]; category: string }) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.personal;

  const hash = useMemo(() => getIconForTags(tags, category), [tags, category]);

  return (
    <AnimatedIcon
      iconHash={hash}
      size={48}
      primary={colors.primary}
      secondary={colors.emphasis}
      animateOn="load"
      pauseFor={2000}
    />
  );
}

// ═══════════════════════════════════════════
// Focus Card
//
// Visual hierarchy (top → bottom):
//   1. Header     — icon + title group + countdown
//   2. Hook line  — emotional pull (text primary)
//   3. Hook type  — tiny badge, right-aligned
//   4. Nuggets    — 3 research bullets
//   5. Pills      — time, context, momentum
//   6. Progress   — done_count / total_count bar
//   7. Reward     — what finishing unlocks
// ═══════════════════════════════════════════

interface FocusCardProps {
  task: FocusTask;
}

function FocusCard({ task }: FocusCardProps) {
  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.personal;
  const [copied, setCopied] = useState(false);

  const done = task.done_count ?? 0;
  const total = task.total_count ?? task.nuggets.length;
  const days = parseCountdownDays(task.countdown);

  const handleIconClick = useCallback(() => {
    if (!task.system_prompt) return;
    navigator.clipboard.writeText(task.system_prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    });
  }, [task.system_prompt]);

  return (
    <div
      style={{
        background: "rgba(var(--bg-surface), 0.45)",
        border: "1px solid var(--border-secondary)",
        borderRadius: "var(--radius-primary)",
        padding: "10px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        overflow: "hidden",
      }}
    >
      {/* ── Row 1: Header — icon | title group | countdown ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "48px 1fr auto",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Icon */}
        <div
          onClick={handleIconClick}
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-secondary)",
            background: colors.bg,
            border: `1px solid ${colors.primary}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: task.system_prompt ? "pointer" : "default",
            opacity: copied ? 0.4 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          <SlotIcon tags={task.tags} category={task.category} />
        </div>

        {/* Title group */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <Heading size="md" as="h2"><span style={{ color: "var(--text-emphasis)" }}>{task.thread_name}</span></Heading>
          <Label variant="secondary">{task.task_name}</Label>
        </div>

        {/* Countdown */}
        {days !== null && (
          <div style={{ textAlign: "right", lineHeight: 1 }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "var(--text-alert)",
                letterSpacing: "-0.02em",
              }}
            >
              {days}
            </span>
            <Label variant="secondary"> days</Label>
          </div>
        )}
      </div>

      {/* ── Row 2: Hook line ── */}
      <div style={{ paddingTop: 6 }}>
        <Text variant="primary" as="div">{task.hook_line}</Text>
      </div>

      {/* ── Row 3: Pills — time, context, momentum ── */}
      <div
        style={{
          paddingTop: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <Pill>{task.time_estimate}</Pill>
        <Pill>{task.context_cost} context</Pill>
        <Pill>{task.momentum}</Pill>
      </div>

      {/* ── Row 4: Nuggets ── */}
      <div style={{ paddingTop: 4 }}>
        {task.nuggets.map((nugget, i) => (
          <div
            key={i}
            style={{
              paddingLeft: 10,
              position: "relative",
              marginBottom: i < task.nuggets.length - 1 ? 1 : 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                color: "var(--text-tertiary)",
              }}
            >
              <Text variant="tertiary">›</Text>
            </span>
            <Text variant="secondary">{nugget}</Text>
          </div>
        ))}
      </div>

      {/* ── Row 5: Progress bar ── */}
      <div
        style={{
          paddingTop: 6,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 4,
            borderRadius: "var(--radius-tertiary)",
            background: "var(--border-secondary)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: total > 0 ? `${(done / total) * 100}%` : "0%",
              height: "100%",
              borderRadius: "var(--radius-tertiary)",
              background: "var(--text-primary)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <Label variant="secondary">{done}/{total}</Label>
      </div>

      {/* ── Row 6: Reward ── */}
      <div style={{ paddingTop: 4 }}>
        <Text variant="secondary" as="div">✓ {task.reward}</Text>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Resolve recommended slots → tasks
// ═══════════════════════════════════════════

function getRecommendedTasks(data: FocusEngineData): FocusTask[] {
  return data.recommended_slots
    .map((slot) => {
      for (const thread of data.threads) {
        const task = thread.tasks.find((t) => t.task_id === slot.task_id);
        if (task) return task;
      }
      return null;
    })
    .filter(Boolean) as FocusTask[];
}

// ═══════════════════════════════════════════
// Focus Engine
// ═══════════════════════════════════════════

interface FocusEngineProps extends WidgetProps {
  data?: FocusEngineData;
}

export function FocusEngine({ size: _, data }: FocusEngineProps) {
  const tasks = data ? getRecommendedTasks(data) : [];

  return (
    <Section use="primary" title="Focus Engine" className="h-full">
      <div className="flex flex-col gap-3 flex-1">
        {tasks.map((task) => (
          <FocusCard key={task.task_id} task={task} />
        ))}
      </div>
    </Section>
  );
}
