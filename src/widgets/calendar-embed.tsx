import type { WidgetProps } from "../types";
import { Section, Heading, Label } from "../components";

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
    <Section use="primary" className="h-full">
      <div className="flex items-baseline justify-between mb-2">
        <Heading size="sm">This &amp; Next Week</Heading>
        <Label variant="secondary">Google Calendar</Label>
      </div>
      <div
        className="flex-1 rounded-xl overflow-hidden flex items-center justify-center"
        style={{ minHeight: 240 }}
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
    </Section>
  );
}
