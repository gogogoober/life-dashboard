import type { WidgetProps, ContextItem, UrgencyLevel, ContextCategory } from "../types";
import { ModuleCard } from "./module-card";

interface ContextResumeProps extends WidgetProps {
  items: ContextItem[];
}

const URGENCY_STYLES: Record<
  UrgencyLevel,
  { dot: string; tag: string; tagColor: string }
> = {
  active: { dot: "hsl(25, 92%, 55%)", tag: "Active", tagColor: "hsl(25, 92%, 55%)" },
  waiting: { dot: "#fbbf24", tag: "Waiting", tagColor: "#fbbf24" },
  nudge: { dot: "#93c5fd", tag: "Nudge", tagColor: "#93c5fd" },
};

const CATEGORY_ICONS: Record<ContextCategory, string> = {
  work: "◆",
  personal: "◎",
  conversation: "◇",
};

export function ContextResume({ items, size }: ContextResumeProps) {
  const isLarge = size === "large";

  return (
    <ModuleCard title="Where I Left Off" icon="↩">
      <div className={`flex flex-col ${isLarge ? "gap-5" : "gap-3"}`}>
        {items.map((item, i) => {
          const style = URGENCY_STYLES[item.urgency] || URGENCY_STYLES.active;
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: style.dot }}
                />
                {isLarge && (
                  <span style={{ color: "#333", fontSize: 10 }}>
                    {CATEGORY_ICONS[item.category]}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#ccc" }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      color: style.tagColor,
                      background: style.tagColor + "15",
                      fontSize: 10,
                    }}
                  >
                    {style.tag}
                  </span>
                </div>

                {(isLarge || i < 3) && (
                  <p
                    className="mt-1 leading-relaxed"
                    style={{
                      color: "#777",
                      fontSize: isLarge ? 13 : 11,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.context}
                  </p>
                )}

                <div className="mt-1" style={{ color: "#444", fontSize: 10 }}>
                  {item.lastTouched}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ModuleCard>
  );
}
