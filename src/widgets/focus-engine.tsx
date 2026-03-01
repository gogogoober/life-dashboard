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
// Countdown helpers
// ═══════════════════════════════════════════

function countdownFontSize(countdown: string): number {
  const match = countdown.match(/(\d+)/);
  if (!match) return 28;
  const days = parseInt(match[1], 10);
  if (days <= 3) return 40;
  if (days <= 7) return 34;
  if (days <= 14) return 30;
  return 26;
}

function parseDays(countdown: string): number {
  const match = countdown.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 99;
}

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
//   1. CTA (next_step)   — emphasis, bold, ≤10 words
//   2. Answer bullets     — secondary, 3 short lines
//   3. Question           — tertiary, italic, the "why now"
//   4. Footer             — thread name + countdown
// ═══════════════════════════════════════════

interface FocusCardProps {
  quest: FocusSlot & { active: boolean };
}

function FocusCard({ quest }: FocusCardProps) {
  const colors = CATEGORY_COLORS[quest.category] || CATEGORY_COLORS.personal;
  const days = parseDays(quest.countdown);
  const fontSize = countdownFontSize(quest.countdown);

  // answer can be string[] (new) or string (legacy fallback)
  const answerBullets: string[] = Array.isArray(quest.answer)
    ? quest.answer
    : [quest.answer];

  return (
    <div
      style={{
        background: "rgba(var(--bg-surface, 10, 18, 10), 0.7)",
        border: "1px solid rgba(var(--bg-surface-secondary, 14, 22, 14), 0.5)",
        borderRadius: 12,
        padding: "14px 16px",
        display: "grid",
        gridTemplateColumns: "56px 1fr",
        gridTemplateRows: "auto auto auto auto",
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

      {/* Icon — spans rows 1-2 */}
      <div
        style={{
          gridColumn: 1,
          gridRow: "1 / 3",
          width: 48,
          height: 48,
          borderRadius: 10,
          background: colors.bg,
          border: `1px solid ${colors.primary}33`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "start",
          marginTop: 2,
        }}
      >
        <SlotIcon tags={quest.tags} category={quest.category} />
      </div>

      {/* ── Row 1: CTA — the action, emphasis weight, ≤10 words ── */}
      <div
        style={{
          gridColumn: 2,
          gridRow: 1,
          paddingLeft: 10,
          display: "flex",
          alignItems: "center",
          minHeight: 24,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-emphasis, #d4f5d4)",
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
          }}
        >
          {quest.next_step}
        </div>
      </div>

      {/* ── Row 2: Answer bullets — bang bang bang ── */}
      <div
        style={{
          gridColumn: 2,
          gridRow: 2,
          paddingLeft: 10,
          paddingTop: 4,
        }}
      >
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

      {/* ── Row 3: Question — the context/reminder ── */}
      <div
        style={{
          gridColumn: "1 / -1",
          gridRow: 3,
          paddingTop: 8,
          fontSize: 9.5,
          fontWeight: 400,
          color: "var(--text-tertiary, #3d5a3d)",
          lineHeight: 1.4,
          fontStyle: "italic",
        }}
      >
        {quest.question}
      </div>

      {/* ── Row 4: Footer — thread name + countdown ── */}
      <div
        style={{
          gridColumn: "1 / -1",
          gridRow: 4,
          paddingTop: 8,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 500,
            color: "var(--text-primary, #c8d8c8)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {quest.thread_name}
        </div>
        <div
          style={{
            fontWeight: 700,
            color: "var(--text-alert, #e85d35)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            fontSize,
          }}
        >
          {days}
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "var(--text-secondary, #5a7a5a)",
              marginLeft: 3,
              letterSpacing: 0,
            }}
          >
            days
          </span>
        </div>
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