import { TemplateRenderer, defaultTemplate } from "./templates";
import { EVENTS, CONTEXT_STUB, TOKYO_PINS, ACTIVE_THREADS_STUB, UP_NEXT_STUB } from "./data/stub";
import { useDashboard, useUpNext, useOrbital, useFocusEngine, toOrbitalEvents, toContextItems, toActiveThreads } from "./data/dashboard";

export default function App() {
  const { data, error } = useDashboard();
  const { data: upNextData, error: upNextError } = useUpNext();
  const { data: orbitalData, error: orbitalError } = useOrbital();
  const { data: focusData, error: focusError } = useFocusEngine();

  if (orbitalError) {
    console.warn("[orbital] Failed to load orbital.json, using stubs:", orbitalError);
  }
  if (focusError) {
    console.warn("[focus-engine] Failed to load focus-engine.json, using stubs:", focusError);
  }
  if (error) {
    console.warn("[dashboard] Failed to load dashboard.json, using stubs:", error);
  }
  if (upNextError) {
    console.warn("[up-next] Failed to load up_next.json, using stub:", upNextError);
  }

  const widgetData: Record<string, Record<string, unknown>> = {
    "temporal-bubble-map": {
      events: orbitalData ? toOrbitalEvents(orbitalData) : EVENTS,
    },
    "focus-engine": focusData
      ? { slots: focusData.slots, activeSlot: focusData.active_slot }
      : {},
    "action-items": {},
  };

  const generatedAt = data
    ? new Date(data.generated_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className="relative w-screen h-screen p-5 overflow-hidden"
      style={{
        background: "#0f1117",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <TemplateRenderer config={defaultTemplate} data={widgetData} />

      {generatedAt && (
        <div
          className="absolute bottom-1.5 right-3 pointer-events-none"
          style={{ fontSize: 9, color: "#252830", letterSpacing: "0.03em" }}
        >
          updated {generatedAt}
        </div>
      )}
    </div>
  );
}
