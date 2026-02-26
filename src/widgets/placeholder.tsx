import type { WidgetProps, PlaceholderItem } from "../types";
import { Section, Panel, Text } from "../components";

interface PlaceholderModuleProps extends WidgetProps {
  title: string;
  icon: string;
  items: PlaceholderItem[];
}

export function PlaceholderModule({ title, items }: PlaceholderModuleProps) {
  return (
    <Section use="primary" title={title} className="h-full">
      <div className="flex flex-col">
        {items.map((item, i) => (
          <Panel key={i} divider={i > 0}>
            <Text variant="primary" as="div">{item.label}</Text>
            {item.sub && (
              <Text variant="secondary" as="div">{item.sub}</Text>
            )}
          </Panel>
        ))}
      </div>
    </Section>
  );
}
