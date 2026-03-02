import { useMemo } from "react";
import type { WidgetProps } from "../types";
import type { FocusSlot } from "../data/dashboard";
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
//   1. Icon + thread_name — primary H2
//   2. next_step          — emphasis body text
//   3. Answer bullets     — secondary, 3 short lines
//   4. Progress bar       — thin bar + done/total label
// ═══════════════════════════════════════════

interface FocusCardProps {
  quest: FocusSlot & { active: boolean };
}

function FocusCard({ quest }: FocusCardProps) {
  const colors = CATEGORY_COLORS[quest.category] || CATEGORY_COLORS.personal;

  // answer can be string[] (new) or string (legacy fallback)
  const answerBullets: string[] = Array.isArray(quest.answer)
    ? quest.answer
    : [quest.answer];

  const total = answerBullets.length;
  const done = 0; // hardcoded until data shape includes tasks_done

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
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      {/* Left edge category tint */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 3,
          height: "100%",
          background: colors.primary,
          opacity: 0.6,
          borderRadius: "12px 0 0 12px",
        }}
      />

      {/* ── Row 1: Icon + header + call to action ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
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
          }}
        >
          <SlotIcon tags={quest.tags} category={quest.category} />
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
            {quest.thread_name}
          </h2>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-emphasis, #d4f5d4)",
              lineHeight: 1.4,
            }}
          >
            {quest.next_step}
          </div>
        </div>
      </div>

      {/* ── Row 3: Answer bullets ── */}
      <div style={{ paddingTop: 6 }}>
        {answerBullets.map((bullet, i) => (
          <div
            key={i}
            style={{
              fontSize: 9.5,
              fontWeight: 400,
              color: "var(--text-secondary, #5a7a5a)",
              lineHeight: 1.5,
              paddingLeft: 10,
              position: "relative",
              marginBottom: i < answerBullets.length - 1 ? 1 : 0,
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
            {bullet}
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
// Focus Engine
// ═══════════════════════════════════════════

interface FocusEngineProps extends WidgetProps {
  slots?: FocusSlot[];
  activeSlot?: number;
}

export function FocusEngine({ size: _, slots, activeSlot }: FocusEngineProps) {
  const quests = slots
    ? slots.map((s) => ({ ...s, active: s.slot === (activeSlot ?? 1) }))
    : [];

  return (
    <Section use="primary" title="Focus Engine" className="h-full">
      <div className="flex flex-col gap-3 flex-1">
        {quests.map((quest) => (
          <FocusCard key={quest.slot} quest={quest} />
        ))}
      </div>
    </Section>
  );
}