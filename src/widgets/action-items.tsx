import type { WidgetProps } from "../types";
import { Section, Panel, Text, Label, Pill } from "../components";
import { heatToStatus } from "../utils/status-mapping";

const MOCK_THREADS = [
  { name: "API rate limiting PR",   heat: "hot"  as const, lastTouched: "today" },
  { name: "Japan Trip",             heat: "hot"  as const, lastTouched: "today" },
  { name: "Dana's 30th Birthday",   heat: "hot"  as const, lastTouched: "today" },
  { name: "Q1 Planning Doc",        heat: "warm" as const, lastTouched: "1d ago" },
  { name: "Chicago Trip",           heat: "warm" as const, lastTouched: "3d ago" },
  { name: "Dashboard project",      heat: "cool" as const, lastTouched: "today" },
  { name: "Follow up with Jake",    heat: "cool" as const, lastTouched: "3d ago" },
];

export function ActionItems({ size: _ }: WidgetProps) {
  return (
    <Section use="primary" title="Action Items" className="h-full">
      <div className="flex flex-col">
        {MOCK_THREADS.map((thread, i) => (
          <Panel key={i} divider={i > 0}>
            <div className="flex items-center gap-2">
              <Text
                variant="primary"
                as="span"
                className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
              >
                {thread.name}
              </Text>
              <Pill position="inline" status={heatToStatus(thread.heat)}>
                {thread.heat.charAt(0).toUpperCase() + thread.heat.slice(1)}
              </Pill>
              <Label variant="secondary">{thread.lastTouched}</Label>
            </div>
          </Panel>
        ))}
      </div>
    </Section>
  );
}
