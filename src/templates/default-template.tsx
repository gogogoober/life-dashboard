import type { TemplateConfig, SlotConfig } from "../types";
import { widgetRegistry } from "../widgets";

interface TemplateRendererProps {
  config: TemplateConfig;
  data: Record<string, Record<string, unknown>>;
}

const LAYER_Z: Record<string, number> = {
  background: 0,
  foreground: 10,
  floating: 20,
};

function resolveWidget(slot: SlotConfig, data: Record<string, Record<string, unknown>>) {
  const Widget = widgetRegistry[slot.widgetId];
  if (!Widget) {
    console.warn(`Unknown widget: ${slot.widgetId}`);
    return null;
  }
  const widgetData = data[slot.widgetId] || {};
  const props = { ...slot.props, ...widgetData, size: slot.size };
  return <Widget {...props} />;
}

export function TemplateRenderer({ config, data }: TemplateRendererProps) {
  const background: SlotConfig[] = [];
  const foregroundPlaced: SlotConfig[] = [];
  const foregroundGrid: SlotConfig[] = [];
  const floating: SlotConfig[] = [];

  config.slots.forEach((slot) => {
    const layer = slot.layer || "foreground";
    if (layer === "background") {
      background.push(slot);
    } else if (layer === "floating") {
      floating.push(slot);
    } else if (slot.placement) {
      foregroundPlaced.push(slot);
    } else {
      foregroundGrid.push(slot);
    }
  });

  return (
    <div className="relative w-dvw h-dvh overflow-hidden">
      {/* Layer 0 — Background: pointer-events pass through container */}
      {background.map((slot, i) => {
        const p = slot.placement;
        return (
          <div
            key={`bg-${slot.widgetId}-${i}`}
            className="absolute pointer-events-none"
            style={{
              zIndex: LAYER_Z.background,
              top: p?.top ?? 0,
              right: p?.right ?? 0,
              bottom: p?.bottom ?? 0,
              left: p?.left ?? 0,
              width: p?.width,
              height: p?.height,
            }}
          >
            <div className="pointer-events-auto w-full h-full">
              {resolveWidget(slot, data)}
            </div>
          </div>
        );
      })}

      {/* Layer 1a — Foreground grid slots (if any use gridColumn/gridRow) */}
      {foregroundGrid.length > 0 && (
        <div
          className="absolute inset-0 grid gap-4"
          style={{
            zIndex: LAYER_Z.foreground,
            gridTemplateColumns: config.columns,
            gridTemplateRows: config.rows,
            padding: "0 var(--dashboard-inset) var(--dashboard-inset)",
          }}
        >
          {foregroundGrid.map((slot, i) => (
            <div
              key={`grid-${slot.widgetId}-${i}`}
              style={{ gridColumn: slot.gridColumn, gridRow: slot.gridRow }}
            >
              {resolveWidget(slot, data)}
            </div>
          ))}
        </div>
      )}

      {/* Layer 1b — Foreground absolutely placed slots */}
      {foregroundPlaced.map((slot, i) => (
        <div
          key={`fg-${slot.widgetId}-${i}`}
          className="absolute"
          style={{
            zIndex: LAYER_Z.foreground,
            top: slot.placement?.top,
            right: slot.placement?.right,
            bottom: slot.placement?.bottom,
            left: slot.placement?.left,
            width: slot.placement?.width,
            height: slot.placement?.height,
          }}
        >
          {resolveWidget(slot, data)}
        </div>
      ))}

      {/* Layer 2 — Floating (reserved) */}
      {floating.map((slot, i) => (
        <div
          key={`fl-${slot.widgetId}-${i}`}
          className="absolute"
          style={{
            zIndex: LAYER_Z.floating,
            top: slot.placement?.top,
            right: slot.placement?.right,
            bottom: slot.placement?.bottom,
            left: slot.placement?.left,
            width: slot.placement?.width,
            height: slot.placement?.height,
          }}
        >
          {resolveWidget(slot, data)}
        </div>
      ))}
    </div>
  );
}

// The default layout config
export const defaultTemplate: TemplateConfig = {
  name: "Default",
  columns: "1fr var(--focus-panel-width)",
  rows: "min-content 1fr",
  slots: [
    // Layer 0 — Orbital below ribbon, 80% width, left-aligned
    {
      widgetId: "temporal-bubble-map",
      size: "large",
      layer: "background",
      placement: {
        top: "calc(var(--ribbon-height) + 5rem)",
        left: "0",
        bottom: "0",
        width: "95%",
      },
    },
    // Layer 1 grid — Timeline ribbon full width top row
    {
      widgetId: "timeline-ribbon",
      size: "default",
      layer: "foreground",
      gridColumn: "1 / -1",
      gridRow: "1 / 2",
    },
    // Layer 1 grid — Focus engine, right column, row 2
    {
      widgetId: "focus-engine",
      size: "large",
      layer: "foreground",
      gridColumn: "2 / 3",
      gridRow: "2 / 3",
    },
  ],
};
