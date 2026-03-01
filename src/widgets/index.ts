import type { ComponentType } from "react";
import type { WidgetProps } from "../types";

import { TemporalBubbleMap } from "./temporal-bubble-map";
import { CalendarEmbed } from "./calendar-embed";
import { CityMap } from "./city-map";
import { PlaceholderModule } from "./placeholder";
import { FocusEngine } from "./focus-engine";
import { TimelineRibbon } from "./timeline-ribbon";

export { TemporalBubbleMap } from "./temporal-bubble-map";
export { CalendarEmbed } from "./calendar-embed";
export { CityMap } from "./city-map";
export { PlaceholderModule } from "./placeholder";
export { FocusEngine } from "./focus-engine";
export { TimelineRibbon } from "./timeline-ribbon";

// Registry: maps string keys to widget components.
// To add a new widget, create the component file, then add an entry here.
export const widgetRegistry: Record<string, ComponentType<any>> = {
  "temporal-bubble-map": TemporalBubbleMap,
  "calendar-embed": CalendarEmbed,
  "city-map": CityMap,
  placeholder: PlaceholderModule,
  "focus-engine": FocusEngine,
  "timeline-ribbon": TimelineRibbon,
};
