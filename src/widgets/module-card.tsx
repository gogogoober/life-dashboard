import type { ReactNode } from "react";

interface ModuleCardProps {
  title: string;
  icon: string;
  children: ReactNode;
}

export function ModuleCard({ title, icon, children }: ModuleCardProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-1 mb-2">
        <span style={{ color: "#444" }}>{icon}</span>
        <h2
          className="text-xs font-medium tracking-widest uppercase"
          style={{ color: "#555" }}
        >
          {title}
        </h2>
      </div>
      <div
        className="flex-1 rounded-xl p-4 overflow-auto"
        style={{ background: "#161920", border: "1px solid #1e2230" }}
      >
        {children}
      </div>
    </div>
  );
}
