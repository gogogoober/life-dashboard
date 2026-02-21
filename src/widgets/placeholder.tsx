import type { WidgetProps, PlaceholderItem } from "../types";
import { ModuleCard } from "./module-card";

interface PlaceholderModuleProps extends WidgetProps {
  title: string;
  icon: string;
  items: PlaceholderItem[];
}

export function PlaceholderModule({
  title,
  icon,
  items,
}: PlaceholderModuleProps) {
  return (
    <ModuleCard title={title} icon={icon}>
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: item.color || "#333" }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm" style={{ color: "#aaa" }}>
                {item.label}
              </div>
              {item.sub && (
                <div className="text-xs mt-0.5" style={{ color: "#555" }}>
                  {item.sub}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );
}
