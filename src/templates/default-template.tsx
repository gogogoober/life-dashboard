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

// The default layout config — matches the original base.ts grid
export const defaultTemplate: TemplateConfig = {
  name: "Default",
  columns: "repeat(12, 1fr)",
  rows: "repeat(6, 1fr)",
  slots: [
    {
      widgetId: "temporal-bubble-map",
      gridColumn: "1 / 9",
      gridRow: "1 / 4",
      size: "large",
    },
    {
      widgetId: "active-threads",
      gridColumn: "1 / 9",
      gridRow: "4 / 7",
      size: "large",
    },
    {
      widgetId: "context-resume",
      gridColumn: "9 / 13",
      gridRow: "1 / 3",
      size: "default",
    },
    {
      widgetId: "calendar-embed",
      gridColumn: "9 / 13",
      gridRow: "3 / 5",
      size: "default",
    },
    {
      widgetId: "city-map",
      gridColumn: "9 / 13",
      gridRow: "5 / 7",
      size: "default",
    },
  ],
};
