import { useState, useEffect, useRef } from "react";
import type { WidgetProps, DashboardEvent } from "../types";
import {
  temporalColor,
  temporalGlow,
  daysFromNow,
  logX,
  MAX_DAYS,
} from "../utils/temporal";

declare global {
  interface Window {
    echarts: any;
  }
}

interface TemporalBubbleMapProps extends WidgetProps {
  events: DashboardEvent[];
}

function buildChartOption(events: DashboardEvent[]) {
  const parentData: any[] = [];
  const parentMeta: any[] = [];

  events.forEach((event) => {
    const todoActions = event.actions.filter((a) => a.status === "todo");
    const days = daysFromNow(event.date);
    const x = logX(days);
    const childFactor = todoActions.length * 2.5;
    const weightFactor = event.weight * 4;
    const y = Math.min(85, childFactor + weightFactor + 8);
    const size = 18 + event.weight * 4 + todoActions.length * 2.5;

    parentData.push({
      value: [x, y],
      name: event.name,
      symbolSize: size,
      itemStyle: {
        color: temporalColor(days),
        shadowBlur: 18,
        shadowColor: temporalGlow(days),
      },
      label: {
        show: true,
        formatter: "{b}",
        position: y > 55 ? "bottom" : "top",
        distance: 10,
        fontSize: Math.max(10, Math.min(14, 8 + event.weight * 0.6)),
        color: "#888",
        textBorderColor: "#161920",
        textBorderWidth: 3,
      },
      _date: event.date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      _daysAway: Math.round(days),
      _childCount: todoActions.length,
      _size: size,
    });

    if (todoActions.length > 0) {
      const orbitRadius = size / 10 + 2.5;
      const childSizes = todoActions.map((_, i) => {
        const base = 6;
        const variation = ((i * 7 + 3) % 5) + 1;
        return base + variation;
      });
      parentMeta.push({
        x,
        y,
        days,
        orbitRadius,
        children: todoActions,
        childSizes,
        childColor: temporalColor(days, 0.35),
        childBorder: temporalColor(days, 0.5),
        lineColor: temporalColor(days, 0.12),
      });
    }
  });

  const childData: any[] = [];
  const lineSegments: any[] = [];
  const angleOffset = -Math.PI / 2;

  parentMeta.forEach((parent) => {
    const n = parent.children.length;
    const angleStep = (Math.PI * 2) / n;

    parent.children.forEach((child: any, i: number) => {
      const a = angleOffset + angleStep * i;
      const cx = parent.x + Math.cos(a) * parent.orbitRadius;
      const cy = parent.y + Math.sin(a) * parent.orbitRadius;

      childData.push({
        value: [cx, cy],
        name: child.name,
        symbolSize: parent.childSizes[i],
        itemStyle: {
          color: parent.childColor,
          borderColor: parent.childBorder,
          borderWidth: 0.5,
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            formatter: "{b}",
            fontSize: 10,
            color: "#aaa",
            position: "right",
            distance: 6,
            textBorderColor: "#161920",
            textBorderWidth: 2,
          },
          itemStyle: { opacity: 0.9, shadowBlur: 8 },
        },
      });

      lineSegments.push({
        coords: [
          [parent.x, parent.y],
          [cx, cy],
        ],
        color: parent.lineColor,
      });
    });
  });

  const markers = [
    { label: "Tomorrow", days: 1 },
    { label: "1 Week", days: 7 },
    { label: "2 Weeks", days: 14 },
    { label: "1 Month", days: 30 },
    { label: "2 Months", days: 60 },
  ];

  function getWeekendLines() {
    const lines = [];
    const base = new Date();
    for (let d = 0; d <= 14; d++) {
      const date = new Date(base);
      date.setDate(base.getDate() + d);
      const dow = date.getDay(); // 0=Sun, 6=Sat
      if (dow === 0 || dow === 6) {
        lines.push({
          xAxis: logX(d === 0 ? 0 : d),
          label: { show: false },
          lineStyle: {
            color: "#232840",
            type: "solid",
            width: 1,
            opacity: 1,
          },
        });
      }
    }
    return lines;
  }

  return {
    backgroundColor: "transparent",
    animationDuration: 1200,
    animationEasing: "cubicOut",
    tooltip: {
      trigger: "item",
      backgroundColor: "#1a1d28ee",
      borderColor: "#2a2d3a",
      borderWidth: 1,
      textStyle: { color: "#e0e0e0", fontSize: 12 },
      formatter(params: any) {
        if (!params.data) return "";
        const d = params.data;
        if (d._daysAway != null) {
          let h = `<strong style="font-size:13px">${d.name}</strong><br/>`;
          h += `<span style="color:#888">${d._date} · ${d._daysAway} day${d._daysAway !== 1 ? "s" : ""} away</span>`;
          if (d._childCount > 0)
            h += `<br/><span style="color:#666">${d._childCount} action items</span>`;
          return h;
        }
        return `<span style="color:#ccc">${d.name}</span>`;
      },
    },
    grid: { left: 8, right: 40, top: 30, bottom: 45 },
    xAxis: {
      type: "value",
      min: -1,
      max: 105,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
    },
    yAxis: { type: "value", min: -8, max: 100, show: false },
    series: [
      {
        id: "markers",
        type: "scatter",
        data: [],
        silent: true,
        markLine: {
          silent: true,
          symbol: "none",
          animation: false,
          data: [
            {
              xAxis: logX(0),
              label: {
                formatter: "TODAY",
                position: "start",
                color: "#f97316",
                fontSize: 9,
              },
              lineStyle: {
                color: "#f97316",
                type: "solid",
                width: 1.5,
                opacity: 0.65,
              },
            },
            ...getWeekendLines(),
            ...markers.map((m) => ({
              xAxis: logX(m.days),
              label: {
                formatter: m.label,
                position: "start",
                color: "#2a2f3a",
                fontSize: 10,
              },
              lineStyle: { color: "#1c2030", type: [4, 4], width: 1 },
            })),
          ],
        },
      },
      {
        id: "connections",
        type: "lines",
        coordinateSystem: "cartesian2d",
        z: 1,
        silent: true,
        lineStyle: { width: 1 },
        data: lineSegments.map((seg) => ({
          coords: seg.coords,
          lineStyle: { color: seg.color },
        })),
      },
      {
        id: "spine",
        type: "line",
        z: 0,
        smooth: 0.3,
        showSymbol: false,
        lineStyle: { color: "#2a2f3a", width: 2 },
        data: parentData
          .map((d) => d.value)
          .sort((a: number[], b: number[]) => a[0] - b[0]),
      },
      { id: "children", type: "scatter", data: childData, z: 2 },
      { id: "parents", type: "scatter", data: parentData, z: 3 },
      {
        id: "dayLabels",
        type: "scatter",
        silent: true,
        z: 4,
        data: parentData.map((d) => ({
          value: d.value,
          symbolSize: 0,
          label: {
            show: true,
            formatter: String(d._daysAway),
            position: "inside",
            fontSize: Math.min(18, Math.max(7, Math.round(d._size * 0.3))),
            fontWeight: "bold",
            color: "rgba(255,255,255,0.8)",
            textBorderColor: "rgba(0,0,0,0.25)",
            textBorderWidth: 1,
          },
        })),
      },
    ],
  };
}

export function TemporalBubbleMap({ events }: TemporalBubbleMapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.echarts) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.0/echarts.min.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !chartRef.current) return;
    const chart = window.echarts.init(chartRef.current);
    instanceRef.current = chart;
    chart.setOption(buildChartOption(events));

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [events, ready]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-baseline justify-between px-1 mb-2">
        <h2
          className="text-xs font-medium tracking-widest uppercase"
          style={{ color: "#555" }}
        >
          What's Ahead
        </h2>
        <span className="text-xs" style={{ color: "#333" }}>
          logarithmic time scale
        </span>
      </div>
      <div
        ref={chartRef}
        className="flex-1 rounded-xl"
        style={{
          background: "#161920",
          border: "1px solid #1e2230",
          minHeight: 280,
        }}
      />
    </div>
  );
}
