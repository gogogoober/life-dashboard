import { useMemo } from "react";
import type { WidgetProps, CalendarEvent } from "../types";
import { canvasColors } from "../design-system";
import { Section, Label } from "../components";

interface TimelineRibbonProps extends WidgetProps {
  events: CalendarEvent[];
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const FONT = "'JetBrains Mono', monospace";

const TYPE_COLORS: Record<CalendarEvent["type"], string> = {
  deadline: canvasColors.status.alert,
  travel: canvasColors.status.primary,
  event: canvasColors.status.warning,
};

interface DayCell {
  date: Date;
  isWeekend: boolean;
  isToday: boolean;
  isSunday: boolean;
  index: number;
}

interface EventSpan {
  name: string;
  startIdx: number;
  endIdx: number;
  color: string;
  row: number;
}

export function TimelineRibbon({ events }: TimelineRibbonProps) {
  const days: DayCell[] = useMemo(() => {
    const arr: DayCell[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(TODAY);
      d.setDate(d.getDate() + i);
      arr.push({
        date: d,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: i === 0,
        isSunday: d.getDay() === 0,
        index: i,
      });
    }
    return arr;
  }, []);

  const assignedSpans: EventSpan[] = useMemo(() => {
    const spans = events
      .map((ev) => {
        const startIdx = Math.max(
          0,
          Math.round((ev.start.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24))
        );
        const endIdx = Math.min(
          29,
          Math.round((ev.end.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24))
        );
        return {
          name: ev.name,
          startIdx,
          endIdx,
          color: TYPE_COLORS[ev.type],
          row: 0,
        };
      })
      .filter((ev) => ev.endIdx >= 0 && ev.startIdx < 30);

    // Row assignment — avoid overlaps
    const rows: EventSpan[][] = [];
    const sorted = [...spans].sort((a, b) => a.startIdx - b.startIdx);
    sorted.forEach((span) => {
      let row = 0;
      while (true) {
        if (!rows[row]) rows[row] = [];
        const conflict = rows[row].some(
          (s) => !(span.startIdx > s.endIdx || span.endIdx < s.startIdx)
        );
        if (!conflict) {
          rows[row].push(span);
          span.row = row;
          break;
        }
        row++;
      }
    });

    return sorted;
  }, [events]);

  const maxRows = Math.max(1, ...assignedSpans.map((s) => s.row + 1));
  const ribbonHeight = 50 + maxRows * 26;

  return (
    <Section use="primary" flush="top" className="w-full">
      <div
        style={{
          height: ribbonHeight,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Day columns */}
        <div style={{ display: "flex", height: 44, position: "relative" }}>
          {days.map((day) => {
            const dayName = day.date.toLocaleDateString("en-US", { weekday: "short" });
            const dayNum = day.date.getDate();
            const isFirstOfMonth = dayNum === 1;

            return (
              <div
                key={day.index}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "0 1px",
                  background: day.isToday
                    ? canvasColors.status.alert + "12"
                    : day.isWeekend
                      ? canvasColors.status.warning + "04"
                      : "transparent",
                  borderLeft: isFirstOfMonth
                    ? `1px solid ${canvasColors.status.secondary}40`
                    : "none",
                  borderRight: day.isSunday
                    ? `1px solid ${canvasColors.status.warning}08`
                    : "none",
                  position: "relative",
                }}
              >
                {/* Month marker */}
                {(isFirstOfMonth || day.isToday) && (
                  <div
                    style={{
                      position: "absolute",
                      top: -1,
                      left: 2,
                      fontSize: 8,
                      fontWeight: 600,
                      color: day.isToday
                        ? canvasColors.status.alert
                        : canvasColors.status.primary,
                      fontFamily: FONT,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {day.isToday
                      ? "Today"
                      : day.date.toLocaleDateString("en-US", { month: "short" })}
                  </div>
                )}

                {/* Day name */}
                <div
                  style={{
                    fontSize: 8,
                    marginTop: 11,
                    color: day.isWeekend
                      ? canvasColors.status.warning + "bb"
                      : canvasColors.text.tertiary,
                    fontFamily: FONT,
                    fontWeight: day.isWeekend ? 600 : 400,
                  }}
                >
                  {dayName}
                </div>

                {/* Day number */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: day.isToday ? 700 : 500,
                    color: day.isToday
                      ? canvasColors.status.alert
                      : day.isWeekend
                        ? canvasColors.status.warning + "cc"
                        : canvasColors.text.primary + "88",
                    fontFamily: FONT,
                    lineHeight: 1.2,
                  }}
                >
                  {dayNum}
                </div>
              </div>
            );
          })}
        </div>

        {/* Gantt event bars */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: 0,
            right: 0,
            height: maxRows * 26,
            pointerEvents: "none",
          }}
        >
          {assignedSpans.map((ev, i) => {
            const leftPct = (ev.startIdx / 30) * 100;
            const widthPct = ((ev.endIdx - ev.startIdx + 1) / 30) * 100;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${leftPct}%`,
                  width: `${Math.max(widthPct, 3.3)}%`,
                  top: ev.row * 26,
                  height: 22,
                  background: ev.color + "18",
                  border: `1px solid ${ev.color}30`,
                  borderRadius: 5,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 6,
                  paddingRight: 4,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 500,
                    color: ev.color + "dd",
                    fontFamily: FONT,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {ev.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
