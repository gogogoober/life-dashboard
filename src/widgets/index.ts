import type { ComponentType } from "react";
import type { WidgetProps } from "../types";

import { TemporalBubbleMap } from "./temporal-bubble-map";
import { CalendarEmbed } from "./calendar-embed";
import { ContextResume } from "./context-resume";
import { CityMap } from "./city-map";
import { PlaceholderModule } from "./placeholder";
import { ActiveThreads } from "./active-threads";
import { UpNext } from "./up-next";
import { FocusEngine } from "./focus-engine";
import { ActionItems } from "./action-items";

export { TemporalBubbleMap } from "./temporal-bubble-map";
export { CalendarEmbed } from "./calendar-embed";
export { ContextResume } from "./context-resume";
export { CityMap } from "./city-map";
export { PlaceholderModule } from "./placeholder";
export { ActiveThreads } from "./active-threads";
export { UpNext } from "./up-next";
export { FocusEngine } from "./focus-engine";
export { ActionItems } from "./action-items";

// Registry: maps string keys to widget components.
// To add a new widget, create the component file, then add an entry here.
export const widgetRegistry: Record<string, ComponentType<any>> = {
  "temporal-bubble-map": TemporalBubbleMap,
  "calendar-embed": CalendarEmbed,
  "context-resume": ContextResume,
  "city-map": CityMap,
  placeholder: PlaceholderModule,
  "active-threads": ActiveThreads,
  "up-next": UpNext,
  "focus-engine": FocusEngine,
  "action-items": ActionItems,
};
