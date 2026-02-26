import type { TemplateConfig } from "../types";
import { widgetRegistry } from "../widgets";

interface TemplateRendererProps {
  config: TemplateConfig;
  data: Record<string, Record<string, unknown>>;
}

export function TemplateRenderer({ config, data }: TemplateRendererProps) {
  return (
    <div
      className="grid h-full gap-4"
      style={{
        gridTemplateColumns: config.columns,
        gridTemplateRows: config.rows,
      }}
    >
      {config.slots.map((slot, i) => {
        const Widget = widgetRegistry[slot.widgetId];
        if (!Widget) {
          console.warn(`Unknown widget: ${slot.widgetId}`);
          return null;
        }

        const widgetData = data[slot.widgetId] || {};
        const props = { ...slot.props, ...widgetData, size: slot.size };

        return (
          <div
            key={`${slot.widgetId}-${i}`}
            style={{ gridColumn: slot.gridColumn, gridRow: slot.gridRow }}
          >
            <Widget {...props} />
          </div>
        );
      })}
    </div>
  );
}

// The default layout config
export const defaultTemplate: TemplateConfig = {
  name: "Default",
  columns: "repeat(12, 1fr)",
  rows: "1fr 1fr",
  slots: [
    {
      widgetId: "focus-engine",
      gridColumn: "1 / 5",
      gridRow: "1 / 3",
      size: "large",
    },
    {
      widgetId: "temporal-bubble-map",
      gridColumn: "5 / 13",
      gridRow: "1 / 2",
      size: "large",
    },
    {
      widgetId: "calendar-embed",
      gridColumn: "5 / 9",
      gridRow: "2 / 3",
      size: "default",
    },
    {
      widgetId: "action-items",
      gridColumn: "9 / 13",
      gridRow: "2 / 3",
      size: "default",
    },
  ],
};
