import type { WidgetProps } from "../types";
import { ModuleCard } from "./module-card";

const MOCK_THREADS = [
  { name: "API rate limiting PR",   heat: "hot"  as const, lastTouched: "today" },
  { name: "Japan Trip",             heat: "hot"  as const, lastTouched: "today" },
  { name: "Dana's 30th Birthday",   heat: "hot"  as const, lastTouched: "today" },
  { name: "Q1 Planning Doc",        heat: "warm" as const, lastTouched: "1d ago" },
  { name: "Chicago Trip",           heat: "warm" as const, lastTouched: "3d ago" },
  { name: "Dashboard project",      heat: "cool" as const, lastTouched: "today" },
  { name: "Follow up with Jake",    heat: "cool" as const, lastTouched: "3d ago" },
];

const HEAT_DOT: Record<"hot" | "warm" | "cool", string> = {
  hot:  "#ff6b6b",
  warm: "#ffcc66",
  cool: "#6699ff",
};

const HEAT_BADGE: Record<"hot" | "warm" | "cool", { bg: string; color: string }> = {
  hot:  { bg: "#ff6b6b22", color: "#ff8888" },
  warm: { bg: "#ffcc6622", color: "#ffdd88" },
  cool: { bg: "#6699ff22", color: "#88aaff" },
};

export function ActionItems({ size: _ }: WidgetProps) {
  return (
    <ModuleCard title="Action Items" icon="📋">
      <div className="flex flex-col gap-2">
        {MOCK_THREADS.map((thread, i) => {
          const badge = HEAT_BADGE[thread.heat];
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 0",
                borderBottom: i < MOCK_THREADS.length - 1 ? "1px solid #1e2230" : "none",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: HEAT_DOT[thread.heat],
                  flexShrink: 0,
                }}
              />

              <span style={{ fontSize: 12, color: "#ccc", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {thread.name}
              </span>

              <span
                style={{
                  fontSize: 10,
                  background: badge.bg,
                  color: badge.color,
                  padding: "1px 6px",
                  borderRadius: 3,
                  flexShrink: 0,
                }}
              >
                {thread.heat.charAt(0).toUpperCase() + thread.heat.slice(1)}
              </span>

              <span style={{ fontSize: 10, color: "#444", flexShrink: 0, minWidth: 38, textAlign: "right" }}>
                {thread.lastTouched}
              </span>
            </div>
          );
        })}
      </div>
    </ModuleCard>
  );
}
