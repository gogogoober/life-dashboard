import { useState, useEffect, useRef } from "react";

// ─── TEMPORAL COLOR SYSTEM ─────────────────────────────────────────
const MAX_DAYS = 60;

function temporalColor(days, opacityOverride) {
  let hue, sat, lit;
  if (days <= 7) {
    hue = 25; sat = 92; lit = 55;
  } else if (days <= 14) {
    const t = (days - 7) / 7;
    hue = 25 + t * 5;
    sat = 92 - t * 25;
    lit = 55 - t * 5;
  } else {
    const daysIntoDecay = days - 14;
    const maxDecay = MAX_DAYS - 14;
    const t = Math.log(daysIntoDecay + 1) / Math.log(maxDecay + 1);
    hue = 30 + t * (220 - 30);
    sat = 67 - t * (67 - 8);
    lit = 50 + t * (35 - 50);
  }
  const alpha = opacityOverride != null ? opacityOverride : 1;
  return `hsla(${Math.round(hue)}, ${Math.round(sat)}%, ${Math.round(lit)}%, ${alpha})`;
}

function temporalGlow(days) {
  if (days > 14) return "hsla(25, 0%, 35%, 0)";
  return `hsla(25, 90%, 55%, ${days <= 7 ? 0.4 : 0.2})`;
}

// ─── HELPERS ───────────────────────────────────────────────────────
const TODAY = new Date(2026, 1, 20);

function daysFromNow(date) {
  return Math.max(0.5, (date - TODAY) / (1000 * 60 * 60 * 24));
}

function logX(days) {
  return (Math.log(days + 1) / Math.log(MAX_DAYS + 1)) * 100;
}

// ─── STUB DATA ─────────────────────────────────────────────────────
const EVENTS = [
  {
    name: "Dinner w/ Isabella",
    date: new Date(2026, 1, 21),
    weight: 3,
    actions: [],
  },
  {
    name: "Dana's Birthday",
    date: new Date(2026, 1, 28),
    weight: 6,
    actions: [
      { name: "Buy gift", status: "todo" },
      { name: "Book restaurant", status: "todo" },
      { name: "Plan surprise?", status: "todo" },
    ],
  },
  {
    name: "Chicago Trip",
    date: new Date(2026, 2, 13),
    weight: 6,
    actions: [
      { name: "Book flights", status: "todo" },
      { name: "Hotel", status: "todo" },
      { name: "Dinner plans", status: "todo" },
    ],
  },
  {
    name: "Japan Trip",
    date: new Date(2026, 2, 24),
    weight: 10,
    actions: [
      { name: "Flights", status: "todo" },
      { name: "Hotel Tokyo", status: "todo" },
      { name: "Hotel Kyoto", status: "todo" },
      { name: "JR Rail Pass", status: "todo" },
      { name: "Tsukiji Market", status: "todo" },
      { name: "Fushimi Inari", status: "todo" },
      { name: "Shibuya night out", status: "todo" },
      { name: "Onsen day trip", status: "todo" },
      { name: "Akihabara", status: "todo" },
      { name: "Omakase dinner", status: "todo" },
      { name: "Pack bags", status: "todo" },
      { name: "Get yen", status: "todo" },
    ],
  },
  {
    name: "Return from Japan",
    date: new Date(2026, 3, 2),
    weight: 3,
    actions: [{ name: "Unpack & laundry", status: "todo" }],
  },
];

// ─── ECHARTS OPTION BUILDER ────────────────────────────────────────
function buildChartOption(events) {
  const parentData = [];
  const parentMeta = [];

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
    });

    if (todoActions.length > 0) {
      const orbitRadius = size / 10 + 2.5;
      const childSizes = todoActions.map((_, i) => {
        const base = 6;
        const variation = ((i * 7 + 3) % 5) + 1;
        return base + variation;
      });
      parentMeta.push({
        x, y, days, orbitRadius,
        children: todoActions,
        childSizes,
        childColor: temporalColor(days, 0.35),
        childBorder: temporalColor(days, 0.5),
        lineColor: temporalColor(days, 0.12),
      });
    }
  });

  // Calculate orbits (static for now)
  const childData = [];
  const lineSegments = [];
  const angleOffset = -Math.PI / 2;

  parentMeta.forEach((parent) => {
    const n = parent.children.length;
    const angleStep = (Math.PI * 2) / n;

    parent.children.forEach((child, i) => {
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
            show: true, formatter: "{b}", fontSize: 10,
            color: "#aaa", position: "right", distance: 6,
            textBorderColor: "#161920", textBorderWidth: 2,
          },
          itemStyle: { opacity: 0.9, shadowBlur: 8 },
        },
      });

      lineSegments.push({
        coords: [[parent.x, parent.y], [cx, cy]],
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
      formatter(params) {
        if (!params.data) return "";
        const d = params.data;
        if (d._daysAway != null) {
          let h = `<strong style="font-size:13px">${d.name}</strong><br/>`;
          h += `<span style="color:#888">${d._date} · ${d._daysAway} day${d._daysAway !== 1 ? "s" : ""} away</span>`;
          if (d._childCount > 0) h += `<br/><span style="color:#666">${d._childCount} action items</span>`;
          return h;
        }
        return `<span style="color:#ccc">${d.name}</span>`;
      },
    },
    grid: { left: 40, right: 40, top: 30, bottom: 45 },
    xAxis: {
      type: "value", min: -2, max: 105,
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { show: false }, axisLabel: { show: false },
    },
    yAxis: { type: "value", min: -8, max: 100, show: false },
    series: [
      {
        id: "markers", type: "scatter", data: [], silent: true,
        markLine: {
          silent: true, symbol: "none", animation: false,
          data: markers.map((m) => ({
            xAxis: logX(m.days),
            label: { formatter: m.label, position: "start", color: "#2a2f3a", fontSize: 10 },
            lineStyle: { color: "#1c2030", type: [4, 4], width: 1 },
          })),
        },
      },
      {
        id: "connections", type: "lines", coordinateSystem: "cartesian2d",
        z: 1, silent: true, lineStyle: { width: 1 },
        data: lineSegments.map((seg) => ({
          coords: seg.coords, lineStyle: { color: seg.color },
        })),
      },
      {
        id: "spine", type: "line", z: 0, smooth: 0.3, showSymbol: false,
        lineStyle: { color: "#2a2f3a", width: 2 },
        data: parentData.map((d) => d.value).sort((a, b) => a[0] - b[0]),
      },
      { id: "children", type: "scatter", data: childData, z: 2 },
      { id: "parents", type: "scatter", data: parentData, z: 3 },
      {
        id: "today", type: "scatter", silent: true,
        data: [{
          value: [logX(0.5), -4], symbolSize: 0,
          label: { show: true, formatter: "▲ TODAY", color: "#444", fontSize: 9 },
        }],
      },
    ],
  };
}

// ─── COMPONENTS ────────────────────────────────────────────────────

function TemporalBubbleMap({ events }) {
  const chartRef = useRef(null);
  const instanceRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Load ECharts from CDN
  useEffect(() => {
    if (window.echarts) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.0/echarts.min.js";
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
        <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: "#555" }}>
          What's Ahead
        </h2>
        <span className="text-xs" style={{ color: "#333" }}>
          logarithmic time scale
        </span>
      </div>
      <div
        ref={chartRef}
        className="flex-1 rounded-xl"
        style={{ background: "#161920", border: "1px solid #1e2230", minHeight: 280 }}
      />
    </div>
  );
}

function CalendarEmbed() {
  // Replace this src with your actual Google Calendar embed URL
  const calendarSrc =
    "https://calendar.google.com/calendar/embed?showTitle=0&showNav=1&showPrint=0&showCalendars=0&mode=WEEK&bgcolor=%23161920&color=%23e8a735&ctz=America%2FNew_York";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-baseline justify-between px-1 mb-2">
        <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: "#555" }}>
          This & Next Week
        </h2>
        <span className="text-xs" style={{ color: "#333" }}>
          Google Calendar
        </span>
      </div>
      <div
        className="flex-1 rounded-xl overflow-hidden flex items-center justify-center"
        style={{ background: "#161920", border: "1px solid #1e2230", minHeight: 240 }}
      >
        <iframe
          src={calendarSrc}
          style={{ border: 0, width: "100%", height: "100%", filter: "invert(0.88) hue-rotate(180deg)" }}
          frameBorder="0"
          scrolling="no"
          title="Google Calendar"
        />
      </div>
    </div>
  );
}

function ModuleCard({ title, icon, children }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-1 mb-2">
        <span style={{ color: "#444" }}>{icon}</span>
        <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: "#555" }}>
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

function PlaceholderModule({ title, icon, items }) {
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

// ─── CITY MAP MINI ─────────────────────────────────────────────────
// Leaflet + CartoDB dark tiles. Won't render in artifact sandbox but works when deployed.

const TOKYO_PINS = [
  { name: "Hotel (Shinjuku)", lng: 139.6917, lat: 35.6895, type: "stay", days: "Mar 24–28" },
  { name: "Tsukiji Market", lng: 139.7706, lat: 35.6654, type: "activity", days: "Mar 25" },
  { name: "Akihabara", lng: 139.7711, lat: 35.7023, type: "activity", days: "Mar 25" },
  { name: "Shibuya", lng: 139.7016, lat: 35.6580, type: "activity", days: "Mar 26" },
  { name: "Senso-ji Temple", lng: 139.7966, lat: 35.7148, type: "activity", days: "Mar 26" },
  { name: "Omakase Dinner", lng: 139.7454, lat: 35.6619, type: "food", days: "Mar 27" },
  { name: "Tokyo Station", lng: 139.7671, lat: 35.6812, type: "transit", days: "Mar 28" },
];

const PIN_COLORS = {
  stay: "#e8a735",
  activity: "#6ee7b7",
  food: "#f87171",
  transit: "#93c5fd",
};

function CityMapMini({ city, pins, center, zoom }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [ready, setReady] = useState(false);

  const mapCenter = center || [35.6812, 139.7671];
  const mapZoom = zoom || 12;

  useEffect(() => {
    if (window.L) { setReady(true); return; }

    // Load Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;

    const map = L.map(mapRef.current, {
      center: mapCenter,
      zoom: mapZoom,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });

    mapInstanceRef.current = map;

    // CartoDB dark tiles — no labels base + labels overlay
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd" }
    ).addTo(map);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd", pane: "overlayPane" }
    ).addTo(map);

    // Itinerary polyline connecting all pins
    const latlngs = pins.map((p) => [p.lat, p.lng]);
    L.polyline(latlngs, {
      color: "#ffffff",
      weight: 1,
      opacity: 0.08,
      dashArray: "6,6",
    }).addTo(map);

    // Add pin markers
    pins.forEach((pin) => {
      const color = PIN_COLORS[pin.type] || "#888";
      const dotSize = pin.type === "stay" ? 14 : 9;

      const html = pin.type === "stay"
        ? `<div style="position:relative;width:${dotSize * 3}px;height:${dotSize * 3}px;display:flex;align-items:center;justify-content:center">
             <div style="width:${dotSize}px;height:${dotSize}px;background:${color};border-radius:50%;box-shadow:0 0 10px ${color}88;position:relative;z-index:2"></div>
             <div style="position:absolute;width:${dotSize * 2.5}px;height:${dotSize * 2.5}px;border-radius:50%;border:1.5px solid ${color}44;animation:mapPulse 2s ease-out infinite"></div>
           </div>`
        : `<div style="width:${dotSize}px;height:${dotSize}px;background:${color};border-radius:50%;box-shadow:0 0 8px ${color}55"></div>`;

      const icon = L.divIcon({
        html,
        className: "",
        iconSize: [dotSize * 3, dotSize * 3],
        iconAnchor: [dotSize * 1.5, dotSize * 1.5],
      });

      L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindTooltip(
          `<strong>${pin.name}</strong><br/><span style="color:#888">${pin.days}</span>`,
          { direction: "top", offset: [0, -10] }
        );
    });

    // Handle resize
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [ready, pins, mapCenter, mapZoom]);

  return (
    <ModuleCard title={`${city} — Trip Map`} icon="✈">
      <style>{`
        @keyframes mapPulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2); opacity: 0; }
        }
        .leaflet-tooltip {
          background: #1a1d28ee !important;
          border: 1px solid #2a2d3a !important;
          color: #e0e0e0 !important;
          font-size: 11px !important;
          border-radius: 6px !important;
          padding: 6px 10px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
        }
        .leaflet-tooltip-top::before {
          border-top-color: #2a2d3a !important;
        }
        .leaflet-container {
          background: #12151c !important;
          font-family: inherit !important;
        }
      `}</style>
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: 160, background: "#12151c" }}
      />
    </ModuleCard>
  );
}

// ─── CONTEXT RESUME ────────────────────────────────────────────────
// "Where I left off" — tracks active threads across work, personal, conversations

const CONTEXT_STUB = [
  {
    category: "work",
    label: "API rate limiting PR",
    context: "Waiting on code review from Sarah. Left off debugging the token bucket implementation — failing test on edge case with burst limits.",
    lastTouched: "Today, 4:30pm",
    urgency: "active",
  },
  {
    category: "work",
    label: "Q1 planning doc",
    context: "Draft is 80% done. Still need the capacity section — blocked on headcount numbers from Miguel.",
    lastTouched: "Yesterday",
    urgency: "waiting",
  },
  {
    category: "personal",
    label: "Dashboard project",
    context: "Built temporal bubble map with ECharts. Next: city map module and context resume. Need to define JSON data schema.",
    lastTouched: "Today",
    urgency: "active",
  },
  {
    category: "conversation",
    label: "Follow up with Jake",
    context: "He mentioned a job opportunity he wanted to talk about. Said he'd send details — hasn't yet.",
    lastTouched: "3 days ago",
    urgency: "nudge",
  },
];

const URGENCY_STYLES = {
  active:  { dot: "hsl(25, 92%, 55%)", tag: "Active",  tagColor: "hsl(25, 92%, 55%)" },
  waiting: { dot: "#fbbf24",           tag: "Waiting", tagColor: "#fbbf24" },
  nudge:   { dot: "#93c5fd",           tag: "Nudge",   tagColor: "#93c5fd" },
};

const CATEGORY_ICONS = {
  work: "◆",
  personal: "◎",
  conversation: "◇",
};

function ContextResume({ items, size }) {
  const isLarge = size === "large";

  return (
    <ModuleCard title="Where I Left Off" icon="↩">
      <div className={`flex flex-col ${isLarge ? "gap-5" : "gap-3"}`}>
        {items.map((item, i) => {
          const style = URGENCY_STYLES[item.urgency] || URGENCY_STYLES.active;
          return (
            <div key={i} className="flex items-start gap-3">
              {/* Status dot */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: style.dot }}
                />
                {isLarge && (
                  <span style={{ color: "#333", fontSize: 10 }}>
                    {CATEGORY_ICONS[item.category]}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: "#ccc" }}>
                    {item.label}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      color: style.tagColor,
                      background: style.tagColor + "15",
                      fontSize: 10,
                    }}
                  >
                    {style.tag}
                  </span>
                </div>

                {/* Context — the actual "where I left off" */}
                {(isLarge || i < 3) && (
                  <p
                    className="mt-1 leading-relaxed"
                    style={{
                      color: "#777",
                      fontSize: isLarge ? 13 : 11,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.context}
                  </p>
                )}

                {/* Timestamp */}
                <div className="mt-1" style={{ color: "#444", fontSize: 10 }}>
                  {item.lastTouched}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ModuleCard>
  );
}

// ─── MAIN DASHBOARD ────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <div
      className="w-screen h-screen p-5 overflow-hidden"
      style={{ background: "#0f1117", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* 12-column grid, 3 rows */}
      <div
        className="grid h-full gap-4"
        style={{
          gridTemplateColumns: "repeat(12, 1fr)",
          gridTemplateRows: "1fr 1fr",
        }}
      >
        {/* ── Left: Calendar (top, 8 cols) ── */}
        <div style={{ gridColumn: "1 / 9", gridRow: "1 / 2" }}>
          <CalendarEmbed />
        </div>

        {/* ── Left: Bubble Map (bottom, 8 cols) ── */}
        <div style={{ gridColumn: "1 / 9", gridRow: "2 / 3" }}>
          <TemporalBubbleMap events={EVENTS} />
        </div>

        {/* ── Right top: Context Resume (4 cols) ── */}
        <div style={{ gridColumn: "9 / 13", gridRow: "1 / 2" }}>
          <ContextResume items={CONTEXT_STUB} size="small" />
        </div>

        {/* ── Right bottom: City Map Mini (4 cols) ── */}
        <div style={{ gridColumn: "9 / 13", gridRow: "2 / 3" }}>
          <CityMapMini city="Tokyo" pins={TOKYO_PINS} />
        </div>
      </div>
    </div>
  );
}