import type { WidgetProps } from "../types";
import type { FocusSlot } from "../data/dashboard";
import { Section, Panel, Text, Label, Pill } from "../components";
import { focusEffortToStatus } from "../utils/status-mapping";

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

const EFFORT_LABEL: Record<"high" | "medium" | "low", string> = {
  high:   "High Effort",
  medium: "Med Effort",
  low:    "Low Effort",
};

function countdownVariant(countdown: string): "alert" | "secondary" {
  const match = countdown.match(/(\d+)\s*day/i);
  if (match && parseInt(match[1], 10) < 5) return "alert";
  return "secondary";
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
    <Section use="primary" title="Focus Engine" className="h-full">
      <div className="flex flex-col gap-3 flex-1">
        {quests.map((quest, i) => {
          const label = quest.active
            ? quest.thread_name
            : quest.category.charAt(0).toUpperCase() + quest.category.slice(1);

          return (
            <div key={i} style={{ flex: quest.active ? "1.2" : "1" }}>
              <Panel status={quest.active ? "primary" : "none"}>
                <div className="flex flex-col gap-1.5">
                  <Label variant="secondary">{label}</Label>
                  <Text variant="primary" as="p">{quest.hook}</Text>
                  <div className="flex items-center gap-1.5">
                    <Text variant="primary">→</Text>
                    <Text variant="secondary">{quest.next_step}</Text>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill position="inline" status={focusEffortToStatus(quest.effort)}>
                      {EFFORT_LABEL[quest.effort]}
                    </Pill>
                    <Text variant={countdownVariant(quest.countdown)}>
                      {quest.countdown}
                    </Text>
                  </div>
                </div>
              </Panel>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
