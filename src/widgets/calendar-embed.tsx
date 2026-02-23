import type { WidgetProps } from "../types";

interface CalendarEmbedProps extends WidgetProps {
  calendarSrc?: string;
}

export function CalendarEmbed({ calendarSrc }: CalendarEmbedProps) {
  const base = calendarSrc ||
    "https://calendar.google.com/calendar/embed?src=juicebox.salinas%40gmail.com&ctz=America%2FNew_York";
  const src = base +
    "&mode=MONTH" +
    "&showTitle=0" +
    "&showNav=0" +
    "&showDate=0" +
    "&showPrint=0" +
    "&showTabs=0" +
    "&wkst=2" +
    "&showCalendars=0" +
    "&showTz=0";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-baseline justify-between px-1 mb-2">
        <h2
          className="text-xs font-medium tracking-widest uppercase"
          style={{ color: "#555" }}
        >
          This & Next Week
        </h2>
        <span className="text-xs" style={{ color: "#333" }}>
          Google Calendar
        </span>
      </div>
      <div
        className="flex-1 rounded-xl overflow-hidden flex items-center justify-center"
        style={{
          background: "#161920",
          border: "1px solid #1e2230",
          minHeight: 240,
        }}
      >
        <iframe
          src={src}
          style={{
            border: 0,
            width: "100%",
            height: "100%",
            filter: "invert(0.88) hue-rotate(180deg)",
          }}
          frameBorder="0"
          scrolling="no"
          title="Google Calendar"
        />
      </div>
    </div>
  );
}
