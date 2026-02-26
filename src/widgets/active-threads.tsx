import type { WidgetProps, ActiveThread, EffortBucket, ThreadDomain, ThreadTier } from "../types";
import { Section, Panel, Text, Label, Pill, Divider } from "../components";
import { effortToStatus, domainToStatus } from "../utils/status-mapping";

interface ActiveThreadsProps extends WidgetProps {
  items: ActiveThread[];
}

const EFFORT_DISPLAY: Record<EffortBucket, string> = {
  "15 min":   "15m",
  "1 hr":     "1h",
  "half day": "½d",
  "full day": "1d",
};

interface ThreadCardProps {
  thread: ActiveThread;
  isLarge: boolean;
}

function ThreadCard({ thread, isLarge }: ThreadCardProps) {
  const isMain = thread.tier === "main";
  const latestJournal = thread.journal[0];

  return (
    <Panel
      status={domainToStatus(thread.domain as ThreadDomain)}
      style={{ flex: "1 1 180px", minWidth: 0 }}
    >
      {/* Header: thread name */}
      <div className="flex items-center mb-2">
        <Text
          variant={isMain ? "primary" : "secondary"}
          className="overflow-hidden text-ellipsis whitespace-nowrap"
        >
          {thread.name}
        </Text>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-1.5">
        {thread.tasks.slice(0, 4).map((task, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <Pill position="inline" status={effortToStatus(task.effort as EffortBucket)}>
              {EFFORT_DISPLAY[task.effort as EffortBucket]}
            </Pill>
            <Text variant="secondary" as="span">
              {task.label}
              {task.bigRock && <span style={{ marginLeft: 4, fontSize: 10 }}>🪨</span>}
            </Text>
          </div>
        ))}
        {thread.tasks.length > 4 && (
          <Label variant="secondary">
            +{thread.tasks.length - 4} more
          </Label>
        )}
      </div>

      {/* Journal entry (large only) */}
      {isLarge && latestJournal && (
        <>
          <Divider variant="secondary" spacing="md" />
          <div
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            <Text variant="tertiary">{latestJournal.date} — {latestJournal.text}</Text>
          </div>
        </>
      )}
    </Panel>
  );
}

export function ActiveThreads({ items, size }: ActiveThreadsProps) {
  const isLarge = size === "large";
  const mainThreads = items.filter((t) => (t.tier as ThreadTier) === "main");
  const sideThreads = items.filter((t) => (t.tier as ThreadTier) === "side");

  return (
    <Section use="primary" title="Active Threads" className="h-full">
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
              <Divider variant="primary" className="flex-1" />
              <Label variant="secondary">Side Quests</Label>
              <Divider variant="primary" className="flex-1" />
            </div>

            <div className="flex flex-wrap gap-2">
              {sideThreads.map((thread, i) => (
                <ThreadCard key={i} thread={thread} isLarge={isLarge} />
              ))}
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
