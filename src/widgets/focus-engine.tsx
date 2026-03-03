import { useCallback, useMemo, useState } from "react";
import type { WidgetProps } from "../types";
import type { FocusTask, FocusEngineData } from "../data/dashboard";
import { Section } from "../components";
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

const FONT = "'JetBrains Mono', monospace";

// ═══════════════════════════════════════════
// Icon component — tag-matched with fallback
// ═══════════════════════════════════════════

function SlotIcon({ tags, category }: { tags: string[]; category: string }) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.personal;

  // useMemo: recomputes when tags change, deterministic per tag-set (no flicker)
  const hash = useMemo(() => getIconForTags(tags, category), [tags, category]);

  return (
    <AnimatedIcon
      iconHash={hash}
      size={58}
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
//   1. Icon (clickable) + thread_name + task_name
//   2. → first_domino    — tertiary CTA
//   3. Nugget bullets     — secondary, 3 short lines
//   4. Progress bar       — done_count / total_count
// ═══════════════════════════════════════════

interface FocusCardProps {
  task: FocusTask;
  active: boolean;
}

function FocusCard({ task }: FocusCardProps) {
  const colors = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.personal;
  const [copied, setCopied] = useState(false);

  const done = task.done_count ?? 0;
  const total = task.total_count ?? task.nuggets.length;

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
        background: "rgba(var(--bg-surface, 10, 18, 10), 0.7)",
        border: "1px solid rgba(var(--bg-surface-secondary, 14, 22, 14), 0.5)",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      {/* ── Row 1: Icon + thread_name + task_name ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          onClick={handleIconClick}
          style={{
            width: 58,
            height: 58,
            borderRadius: 12,
            background: colors.bg,
            border: `1px solid ${colors.primary}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: task.system_prompt ? "pointer" : "default",
            opacity: copied ? 0.4 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          <SlotIcon tags={task.tags} category={task.category} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary, #c8d8c8)",
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
            }}
          >
            {task.thread_name}
          </h2>
          <div
            style={{
              fontSize: 11,
              fontWeight: 400,
              color: "var(--text-secondary, #5a7a5a)",
              lineHeight: 1.4,
            }}
          >
            {task.task_name}
          </div>
        </div>
      </div>

      {/* ── Row 2: → first_domino (CTA, tertiary) ── */}
      <div
        style={{
          paddingTop: 8,
          fontSize: 10,
          fontWeight: 400,
          color: "var(--text-tertiary, #3d5a3d)",
          lineHeight: 1.4,
        }}
      >
        → {task.first_domino}
      </div>

      {/* ── Row 3: Nugget bullets ── */}
      <div style={{ paddingTop: 6 }}>
        {task.nuggets.map((nugget, i) => (
          <div
            key={i}
            style={{
              fontSize: 9.5,
              fontWeight: 400,
              color: "var(--text-secondary, #5a7a5a)",
              lineHeight: 1.5,
              paddingLeft: 10,
              position: "relative",
              marginBottom: i < task.nuggets.length - 1 ? 1 : 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                color: colors.primary,
                opacity: 0.6,
              }}
            >
              ›
            </span>
            {nugget}
          </div>
        ))}
      </div>

      {/* ── Row 4: Progress bar ── */}
      <div
        style={{
          paddingTop: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: "rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: total > 0 ? `${(done / total) * 100}%` : "0%",
              height: "100%",
              borderRadius: 2,
              background: colors.primary,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 500,
            color: "var(--text-secondary, #5a7a5a)",
            whiteSpace: "nowrap",
          }}
        >
          {done}/{total}
        </span>
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
  const activeTaskId = data
    ? data.recommended_slots.find((s) => s.slot === data.active_slot)?.task_id
    : undefined;

  return (
    <Section use="primary" title="Focus Engine" className="h-full">
      <div className="flex flex-col gap-3 flex-1">
        {tasks.map((task) => (
          <FocusCard
            key={task.task_id}
            task={task}
            active={task.task_id === activeTaskId}
          />
        ))}
      </div>
    </Section>
  );
}
