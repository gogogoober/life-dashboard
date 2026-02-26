import type { WidgetProps, ContextItem, UrgencyLevel } from "../types";
import { Section, Panel, Text, Label, Pill } from "../components";
import { urgencyToStatus } from "../utils/status-mapping";

interface ContextResumeProps extends WidgetProps {
  items: ContextItem[];
}

const URGENCY_TAG: Record<UrgencyLevel, string> = {
  active:  "Active",
  waiting: "Waiting",
  nudge:   "Nudge",
};

export function ContextResume({ items, size }: ContextResumeProps) {
  const isLarge = size === "large";

  return (
    <Section use="primary" title="Where I Left Off" className="h-full">
      <div className={`flex flex-col ${isLarge ? "gap-1" : "gap-0"}`}>
        {items.map((item, i) => (
          <Panel key={i} status={urgencyToStatus(item.urgency)} divider={i > 0}>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Text variant="primary">{item.label}</Text>
                <Pill position="inline" status={urgencyToStatus(item.urgency)}>
                  {URGENCY_TAG[item.urgency]}
                </Pill>
              </div>

              {(isLarge || i < 3) && (
                <Text variant="secondary" as="p">
                  {item.context}
                </Text>
              )}

              <Label variant="secondary">{item.lastTouched}</Label>
            </div>
          </Panel>
        ))}
      </div>
    </Section>
  );
}
