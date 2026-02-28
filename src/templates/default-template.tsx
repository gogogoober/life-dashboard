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

// Grid: 7 cols left (orbital/calendar) + 5 cols right (focus engine / widgets)
// Previous: 8/4 split. New: 7/5 split — gives right panel ~25% more width.
export const defaultTemplate: TemplateConfig = {
  name: "Default",
  columns: "repeat(12, 1fr)",
  rows: "1fr 1fr",
  slots: [
    {
      widgetId: "calendar-embed",
      gridColumn: "1 / 8",
      gridRow: "1 / 2",
      size: "large",
    },
    {
      widgetId: "temporal-bubble-map",
      gridColumn: "1 / 8",
      gridRow: "2 / 3",
      size: "large",
    },
    {
      widgetId: "focus-engine",
      gridColumn: "8 / 13",
      gridRow: "1 / 3",
      size: "large",
    },
  ],
};