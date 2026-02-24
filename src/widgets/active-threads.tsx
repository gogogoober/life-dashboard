import type { WidgetProps, ActiveThread, EffortBucket, ThreadDomain, ThreadTier } from "../types";
import { ModuleCard } from "./module-card";

interface ActiveThreadsProps extends WidgetProps {
  items: ActiveThread[];
}

const EFFORT: Record<EffortBucket, { display: string; color: string }> = {
  "15 min":   { display: "15m", color: "#6ee7b7" },
  "1 hr":     { display: "1h",  color: "#fbbf24" },
  "half day": { display: "½d",  color: "#f97316" },
  "full day": { display: "1d",  color: "#ef4444" },
};

const DOMAIN_COLOR: Record<ThreadDomain, string> = {
  work:     "hsl(25, 92%, 55%)",
  personal: "#6ee7b7",
};

const TIER_DOT: Record<ThreadTier, string> = {
  main: "●",
  side: "○",
};

interface ThreadCardProps {
  thread: ActiveThread;
  isLarge: boolean;
}

function ThreadCard({ thread, isLarge }: ThreadCardProps) {
  const dotColor = DOMAIN_COLOR[thread.domain];
  const isMain = thread.tier === "main";
  const nameColor = isMain ? "#ccc" : "#999";
  const labelColor = isMain ? "#bbb" : "#777";
  const padding = isLarge ? "12px" : "8px";
  const latestJournal = thread.journal[0];

  return (
    <div
      style={{
        background: "#1a1d28",
        border: "1px solid #1e2230",
        borderRadius: 8,
        padding,
        flex: "1 1 180px",
        minWidth: 0,
      }}
    >
      {/* Header: domain dot + thread name */}
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color: dotColor, fontSize: 9, lineHeight: 1, flexShrink: 0 }}>
          {TIER_DOT[thread.tier]}
        </span>
        <span
          className="text-sm font-medium leading-tight"
          style={{
            color: nameColor,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {thread.name}
        </span>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-1.5">
        {thread.tasks.slice(0, 4).map((task, i) => {
          const effort = EFFORT[task.effort];
          return (
            <div key={i} className="flex items-start gap-1.5">
              {/* Effort badge pill */}
              <span
                className="flex-shrink-0 text-xs rounded text-center"
                style={{
                  color: effort.color,
                  background: effort.color + "26",
                  width: "2.5rem",
                  padding: "1px 0",
                  fontSize: 10,
                  lineHeight: 1.6,
                }}
              >
                {effort.display}
              </span>
              {/* Task label + optional big rock */}
              <span style={{ color: labelColor, fontSize: 11, lineHeight: 1.5 }}>
                {task.label}
                {task.bigRock && (
                  <span style={{ marginLeft: 4, fontSize: 10 }}>🪨</span>
                )}
              </span>
            </div>
          );
        })}
        {thread.tasks.length > 4 && (
          <span style={{ color: "#444", fontSize: 10, paddingLeft: "2.75rem" }}>
            +{thread.tasks.length - 4} more
          </span>
        )}
      </div>

      {/* Journal entry (large only) */}
      {isLarge && latestJournal && (
        <>
          <div
            className="my-2"
            style={{ borderTop: "1px dotted #1e2230" }}
          />
          <div
            style={{
              fontSize: 10,
              lineHeight: 1.55,
              color: "#555",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            <span style={{ color: "#444" }}>{latestJournal.date} — </span>
            {latestJournal.text}
          </div>
        </>
      )}
    </div>
  );
}

export function ActiveThreads({ items, size }: ActiveThreadsProps) {
  const isLarge = size === "large";
  const mainThreads = items.filter((t) => t.tier === "main");
  const sideThreads = items.filter((t) => t.tier === "side");

  return (
    <ModuleCard title="Active Threads" icon="⚡">
      <div className="flex flex-col gap-3">
        {/* Main quests */}
        <div className="flex flex-wrap gap-2">
          {mainThreads.map((thread, i) => (
            <ThreadCard key={i} thread={thread} isLarge={isLarge} />
          ))}
        </div>

        {/* Tier divider + side quests */}
        {sideThreads.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <div style={{ flex: 1, height: 1, background: "#1e2230" }} />
              <span
                className="tracking-widest uppercase"
                style={{ color: "#333", fontSize: 9 }}
              >
                Side Quests
              </span>
              <div style={{ flex: 1, height: 1, background: "#1e2230" }} />
            </div>

            <div className="flex flex-wrap gap-2">
              {sideThreads.map((thread, i) => (
                <ThreadCard key={i} thread={thread} isLarge={isLarge} />
              ))}
            </div>
          </>
        )}
      </div>
    </ModuleCard>
  );
}
