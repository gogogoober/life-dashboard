import type { WidgetProps } from "../types";
import type { FocusSlot } from "../data/dashboard";
import { ModuleCard } from "./module-card";

const MOCK_QUESTS: Array<FocusSlot & { active: boolean }> = [
  {
    slot: 1,
    category: "work",
    thread_name: "Work",
    hook: "That burst limit edge case in the rate limiter has been nagging at you. Sarah's review is pending but this bug is yours to squash.",
    next_step: "Open the failing test and read the assertion",
    effort: "high",
    countdown: "4 days left",
    active: true,
  },
  {
    slot: 2,
    category: "travel",
    thread_name: "Travel",
    hook: "26 days until Tokyo. You mentioned wanting to find that fountain pen shop in Ginza. One search could lock down Day 3's afternoon.",
    next_step: "Open Japan doc and add one stop to Day 3",
    effort: "low",
    countdown: "26 days",
    active: false,
  },
  {
    slot: 3,
    category: "personal",
    thread_name: "Quick Win",
    hook: "Dana's 30th is 3 days away. Jell-O shots need 4 hours to set — are you making them tonight or tomorrow morning?",
    next_step: "Pick a time and set a reminder",
    effort: "low",
    countdown: "3 days away",
    active: false,
  },
];

const EFFORT_STYLES: Record<"high" | "medium" | "low", { bg: string; color: string; label: string }> = {
  high:   { bg: "#ff884422", color: "#ffaa66", label: "High Effort" },
  medium: { bg: "#ffdd4422", color: "#ffdd66", label: "Medium Effort" },
  low:    { bg: "#44aaff22", color: "#66bbff", label: "Low Effort" },
};

function countdownColor(countdown: string): string {
  const match = countdown.match(/(\d+)\s*day/i);
  if (match && parseInt(match[1], 10) < 5) return "#ff8866";
  return "#888";
}

interface FocusEngineProps extends WidgetProps {
  slots?: FocusSlot[];
  activeSlot?: number;
}

export function FocusEngine({ size: _, slots, activeSlot }: FocusEngineProps) {
  const quests = slots
    ? slots.map((s) => ({ ...s, active: s.slot === (activeSlot ?? 1) }))
    : MOCK_QUESTS;

  return (
    <ModuleCard title="Focus Engine" icon="⚡">
      <div className="flex flex-col gap-3 h-full">
        {quests.map((quest, i) => {
          const effort = EFFORT_STYLES[quest.effort];
          const label = quest.active
            ? quest.thread_name
            : quest.category.charAt(0).toUpperCase() + quest.category.slice(1);
          return (
            <div
              key={i}
              style={{
                background: quest.active ? "#1a2220" : "#1a1d28",
                borderRadius: 10,
                padding: "12px 14px",
                borderLeft: quest.active ? "3px solid #6bffaa" : "3px solid transparent",
                opacity: quest.active ? 1 : 0.5,
                flex: quest.active ? "1.2" : "1",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#555",
                  marginBottom: 6,
                }}
              >
                {label}
              </div>

              <p style={{ fontSize: 12, color: "#ccc", lineHeight: 1.6, margin: 0, marginBottom: 10 }}>
                {quest.hook}
              </p>

              <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
                <span style={{ color: "#6bffaa", marginRight: 4 }}>→</span>
                {quest.next_step}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    background: effort.bg,
                    color: effort.color,
                    padding: "2px 7px",
                    borderRadius: 4,
                  }}
                >
                  {effort.label}
                </span>
                <span style={{ fontSize: 10, color: countdownColor(quest.countdown) }}>
                  {quest.countdown}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </ModuleCard>
  );
}
