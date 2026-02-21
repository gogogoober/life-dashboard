import { TemplateRenderer, defaultTemplate } from "./templates";
import { EVENTS, CONTEXT_STUB, TOKYO_PINS } from "./data/stub";

// Map widget IDs to their data. Each key matches a widgetId in the template config.
// When you add a new widget, add its data here under its registry key.
const widgetData: Record<string, Record<string, unknown>> = {
  "temporal-bubble-map": {
    events: EVENTS,
  },
  "context-resume": {
    items: CONTEXT_STUB,
  },
  "city-map": {
    city: "Tokyo",
    pins: TOKYO_PINS,
  },
};

export default function App() {
  return (
    <div
      className="w-screen h-screen p-5 overflow-hidden"
      style={{
        background: "#0f1117",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <TemplateRenderer config={defaultTemplate} data={widgetData} />
    </div>
  );
}
