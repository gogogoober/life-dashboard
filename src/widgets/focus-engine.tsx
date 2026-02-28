import { useRef, useEffect, useState } from "react";
import type { WidgetProps } from "../types";
import type { FocusSlot } from "../data/dashboard";
import { Section } from "../components";
import { Player } from "@lordicon/react";
import { getIconForTags } from "../utils/get-icon-for-tags";

// ═══════════════════════════════════════════
// Dynamic icon loading via Vite lazy glob
// ═══════════════════════════════════════════

const iconModules = import.meta.glob<{ default: object }>(
  "../assets/icons/lordicon/*.json"
);

function useIconData(hash: string): object | null {
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    const key = `../assets/icons/lordicon/${hash}.json`;
    const loader = iconModules[key];
    if (!loader) return;
    loader().then((mod) => setData(mod.default));
  }, [hash]);

  return data;
}

const CATEGORY_FALLBACK: Record<string, string> = {
  travel: "✈",
  work: "◆",
  personal: "◎",
  social: "◇",
};

// ═══════════════════════════════════════════
// Design tokens
// ═══════════════════════════════════════════

// Icon hex values must match the CSS tokens in :root (Lordicon can't use CSS vars)
const CATEGORY_COLORS: Record<string, { primary: string; emphasis: string; bg: string }> = {
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
// Mock data
// ═══════════════════════════════════════════

const MOCK_QUESTS: Array<FocusSlot & { active: boolean }> = [
  {
    slot: 1,
    category: "travel",
    thread_name: "Japan Trip Planning",
    question: "You're 23 days out with no Kyoto plan — you have 3 days there.",
    answer: "Fushimi Inari has 10,000 vermillion torii gates you walk through — no reservation needed. Arashiyama bamboo grove is best before 8am.",
    next_step: "Save 'Fushimi Inari' and 'Arashiyama bamboo grove' to your Kyoto Craft doc",
    effort: "low",
    countdown: "23 days",
    tags: ["temple", "gate", "japan", "shrine", "travel", "building"],
    active: true,
  },
  {
    slot: 2,
    category: "work",
    thread_name: "Rate Limiter PR",
    question: "Your Snake prototype works but components aren't registered to entities yet.",
    answer: "In most ECS systems, entities are just integer IDs — components live in typed arrays indexed by that ID. Your Snake already has the entities; you need the typed storage layer.",
    next_step: "Open your ECS repo and create a ComponentStore struct with a map[EntityID]interface{}",
    effort: "high",
    countdown: "4 days",
    tags: ["computer", "code", "laptop", "game", "desk"],
    active: false,
  },
  {
    slot: 3,
    category: "personal",
    thread_name: "Dana's 30th Birthday",
    question: "Dana's 30th is 3 days away. Jell-O shots need 4 hours to set.",
    answer: "The classic ratio is 1 cup boiling water + 1 cup vodka per 3oz Jello box. Yellow works with lemon Jello + Absolut Citron. Makes about 20 shots per batch.",
    next_step: "Pick a time and set a reminder for Jell-O shots",
    effort: "low",
    countdown: "3 days",
    tags: ["party", "cake", "drink", "gift", "person"],
    active: false,
  },
];

// ═══════════════════════════════════════════
// Countdown font size — dynamic based on proximity
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
  const playerRef = useRef<Player>(null);
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.personal;
  const fallback = CATEGORY_FALLBACK[category] || "•";

  // Stable hash: compute once per tag set (avoids re-roll on re-render)
  const hash = useState(() => getIconForTags(tags, category))[0];
  const iconData = useIconData(hash);

  if (!iconData) {
    return (
      <span style={{ fontSize: 36, color: colors.primary }}>{fallback}</span>
    );
  }

  return (
    <div style={{ position: "relative", width: 56, height: 56 }}>
      <Player
        ref={playerRef}
        icon={iconData}
        size={56}
        colors={`primary:${colors.primary},secondary:${colors.emphasis}`}
        onReady={() => playerRef.current?.playFromBeginning()}
        onComplete={() => {
          setTimeout(() => playerRef.current?.playFromBeginning(), 2000);
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// Focus Card
// ═══════════════════════════════════════════

interface FocusCardProps {
  quest: FocusSlot & { active: boolean };
}

function FocusCard({ quest }: FocusCardProps) {
  const colors = CATEGORY_COLORS[quest.category] || CATEGORY_COLORS.personal;
  const days = parseDays(quest.countdown);
  const fontSize = countdownFontSize(quest.countdown);

  return (
    <div
      style={{
        background: "rgba(var(--bg-surface, 10, 18, 10), 0.7)",
        border: "1px solid rgba(var(--bg-surface-secondary, 14, 22, 14), 0.5)",
        borderRadius: 12,
        padding: 20,
        display: "grid",
        gridTemplateColumns: "80px 1fr",
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

      {/* Row 1: Icon */}
      <div
        style={{
          gridColumn: 1,
          gridRow: 1,
          width: 68,
          height: 88,
          borderRadius: 10,
          background: colors.bg,
          border: `1px solid ${colors.primary}33`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SlotIcon tags={quest.tags} category={quest.category} />
      </div>

      {/* Row 1: Question (the reminder) */}
      <div
        style={{
          gridColumn: 2,
          gridRow: 1,
          paddingLeft: 12,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 400,
            color: "var(--text-secondary, #5a7a5a)",
            lineHeight: 1.5,
            letterSpacing: "0.01em",
          }}
        >
          {quest.question}
        </div>
      </div>

      {/* Row 2: Answer (research nugget) */}
      <div
        style={{
          gridColumn: "1 / -1",
          gridRow: 2,
          paddingTop: 12,
          fontSize: 10,
          fontWeight: 400,
          color: "var(--text-primary, #c8d8c8)",
          lineHeight: 1.6,
          letterSpacing: "0.01em",
        }}
      >
        {quest.answer}
      </div>

      {/* Row 3: Next step (2-minute action) */}
      <div
        style={{
          gridColumn: "1 / -1",
          gridRow: 3,
          paddingTop: 10,
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-emphasis, #d4f5d4)",
          lineHeight: 1.3,
          letterSpacing: "-0.01em",
        }}
      >
        {quest.next_step}
      </div>

      {/* Row 4: Footer */}
      <div
        style={{
          gridColumn: "1 / -1",
          gridRow: 4,
          paddingTop: 16,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 10,
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
              fontSize: 11,
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
    : MOCK_QUESTS;

  return (
    <Section use="primary" title="Focus Engine" className="h-full">
      <div className="flex flex-col gap-3 flex-1">
        {quests.map((quest, i) => (
          <FocusCard key={i} quest={quest} />
        ))}
      </div>
    </Section>
  );
}