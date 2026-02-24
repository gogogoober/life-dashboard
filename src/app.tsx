import { TemplateRenderer, defaultTemplate } from "./templates";
import { EVENTS, CONTEXT_STUB, TOKYO_PINS, ACTIVE_THREADS_STUB, UP_NEXT_STUB } from "./data/stub";
import { useDashboard, toEvents, toContextItems, toActiveThreads } from "./data/dashboard";

export default function App() {
  const { data, error } = useDashboard();

  if (error) {
    console.warn("[dashboard] Failed to load dashboard.json, using stubs:", error);
  }

  const widgetData: Record<string, Record<string, unknown>> = {
    "temporal-bubble-map": {
      events: data ? toEvents(data) : EVENTS,
    },
    "context-resume": {
      items: data ? toContextItems(data) : CONTEXT_STUB,
    },
    "city-map": {
      city: "Tokyo",
      pins: TOKYO_PINS,
    },
    "active-threads": {
      items: data ? toActiveThreads(data) : ACTIVE_THREADS_STUB,
    },
    "up-next": {
      data: UP_NEXT_STUB,
    },
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
