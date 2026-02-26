import { useState, useEffect, useRef, useMemo } from "react";

// ════════════════════════════════════════════════════════════════════
// COLOR SYSTEM — Industrial Monochrome Green → Orange → Red stress
// ════════════════════════════════════════════════════════════════════
const COLORS = {
  // Base palette
  bg: "#0a0e0a",
  bgSubtle: "#0d120d",
  surface: "rgba(14, 22, 14, 0.75)",
  surfaceBorder: "rgba(40, 70, 40, 0.25)",

  // Green spectrum (calm / nominal)
  green100: "#d4f5d4",
  green300: "#6ee7a0",
  green500: "#2ecc71",
  green700: "#1a8a4a",
  green900: "#0d4a28",
  greenGlow: "rgba(46, 204, 113, 0.15)",

  // Stress spectrum (attention needed)
  warm: "#e8a735",     // amber — approaching
  hot: "#e85d35",      // orange-red — urgent
  critical: "#ff3b3b", // red — overdue/critical

  // Neutrals
  text: "#c8d8c8",
  textMuted: "#5a7a5a",
  textDim: "#3a5a3a",
  gridLine: "rgba(46, 204, 113, 0.06)",
};

// Stress color based on days until deadline
function stressColor(daysAway) {
  if (daysAway <= 1) return COLORS.critical;
  if (daysAway <= 3) return COLORS.hot;
  if (daysAway <= 7) return COLORS.warm;
  if (daysAway <= 14) return COLORS.green500;
  if (daysAway <= 30) return COLORS.green700;
  return COLORS.green900;
}

function stressGlow(daysAway) {
  if (daysAway <= 1) return "rgba(255, 59, 59, 0.4)";
  if (daysAway <= 3) return "rgba(232, 93, 53, 0.3)";
  if (daysAway <= 7) return "rgba(232, 167, 53, 0.25)";
  return "rgba(46, 204, 113, 0.15)";
}

// ════════════════════════════════════════════════════════════════════
// STUB DATA
// ════════════════════════════════════════════════════════════════════
const TODAY = new Date(2026, 1, 26); // Feb 26, 2026

const ORBITAL_EVENTS = [
  { name: "Dana's Birthday", date: new Date(2026, 1, 28), weight: 7, category: "personal",
    actions: ["Jell-O shots", "Coordinate w/ Shar", "Laser tag booking"] },
  { name: "Mariano Trip Planning", date: new Date(2026, 2, 5), weight: 5, category: "travel",
    actions: ["Pick destination", "Book flights"] },
  { name: "Japan Trip", date: new Date(2026, 2, 23), weight: 9, category: "travel",
    actions: ["Pack list", "Fountain pen shops", "JR Pass", "Hotel confirmations"] },
  { name: "Cerebro v2 Deploy", date: new Date(2026, 2, 1), weight: 4, category: "project",
    actions: ["Timeline widget", "Color system"] },
  { name: "E-ink Display Order", date: new Date(2026, 2, 10), weight: 3, category: "project",
    actions: ["Final panel decision"] },
  { name: "Dentist Appt", date: new Date(2026, 2, 15), weight: 2, category: "personal", actions: [] },
  { name: "Taxes Prep", date: new Date(2026, 3, 1), weight: 5, category: "admin",
    actions: ["Gather W2s", "Schedule CPA"] },
];

const CALENDAR_EVENTS = [
  { name: "Dana's Birthday 🎂", date: new Date(2026, 1, 28), type: "event" },
  { name: "Cerebro Deploy", date: new Date(2026, 2, 1), type: "deadline" },
  { name: "Mariano call", date: new Date(2026, 2, 3), type: "event" },
  { name: "Trip Planning", date: new Date(2026, 2, 5), type: "event" },
  { name: "E-ink order deadline", date: new Date(2026, 2, 10), type: "deadline" },
  { name: "Dentist", date: new Date(2026, 2, 15), type: "event" },
  { name: "Japan ✈️", date: new Date(2026, 2, 23), type: "travel" },
  { name: "Japan Return", date: new Date(2026, 3, 7), type: "travel" },
];

const FOCUS_ITEMS = [
  { label: "Dana's 30th", urgency: "hot", context: "2 days away — Jell-O shots recipe, Shar coordination, laser tag deposit", category: "personal" },
  { label: "Cerebro v2 Layout", urgency: "active", context: "Layered orbital design — timeline strip + focus panel", category: "project" },
  { label: "Mariano Trip", urgency: "warm", context: "Need to pick warm-weather destination this week", category: "travel" },
  { label: "Japan Prep", urgency: "upcoming", context: "Fountain pen research, JR Pass purchase window opens soon", category: "travel" },
  { label: "Taxes", urgency: "upcoming", context: "April 1 — gather W2s", category: "admin" },
];

const DYNAMIC_ISLAND_DATA = {
  primary: "Dana's 30th in 2 days",
  secondary: "Laser tag deposit due tomorrow",
  pulse: true,
};

// ════════════════════════════════════════════════════════════════════
// ORBITAL CHART (Background Layer)
// ════════════════════════════════════════════════════════════════════
function OrbitalChart({ events }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);

  const processedEvents = useMemo(() => {
    return events.map(ev => {
      const days = Math.max(0.5, (ev.date - TODAY) / (1000 * 60 * 60 * 24));
      // Log scale for X positioning — compresses far-out events
      const xNorm = Math.log(days + 1) / Math.log(61);
      // Y based on weight with some deterministic spread
      const hash = ev.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const yNorm = 0.15 + (hash % 70) / 100;
      return { ...ev, days, xNorm, yNorm, hash };
    });
  }, [events]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let running = true;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!running) return;
      timeRef.current += 0.005;
      const t = timeRef.current;
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;

      ctx.clearRect(0, 0, w, h);

      // Grid lines (very subtle)
      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 1;
      const gridDays = [1, 3, 7, 14, 30];
      gridDays.forEach(d => {
        const x = (Math.log(d + 1) / Math.log(61)) * w * 0.75 + w * 0.05;
        ctx.beginPath();
        ctx.setLineDash([2, 8]);
        ctx.moveTo(x, h * 0.08);
        ctx.lineTo(x, h * 0.92);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = COLORS.textDim;
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        const label = d === 1 ? "1d" : d === 3 ? "3d" : d === 7 ? "1w" : d === 14 ? "2w" : "1m";
        ctx.fillText(label, x, h * 0.96);
      });

      // TODAY marker
      const todayX = w * 0.05;
      ctx.strokeStyle = COLORS.green500 + "40";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(todayX, h * 0.05);
      ctx.lineTo(todayX, h * 0.95);
      ctx.stroke();
      ctx.fillStyle = COLORS.green500;
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("TODAY", todayX, h * 0.04 + 10);

      // Spine line connecting parents
      const sortedEvents = [...processedEvents].sort((a, b) => a.xNorm - b.xNorm);
      if (sortedEvents.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = COLORS.green900 + "60";
        ctx.lineWidth = 1.5;
        sortedEvents.forEach((ev, i) => {
          const x = ev.xNorm * w * 0.75 + w * 0.05;
          const y = ev.yNorm * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Draw events
      processedEvents.forEach(ev => {
        const cx = ev.xNorm * w * 0.75 + w * 0.05;
        const cy = ev.yNorm * h;
        const baseR = 8 + ev.weight * 3;
        const color = stressColor(ev.days);
        const glow = stressGlow(ev.days);

        // Glow
        const glowR = baseR * 2.5;
        const grad = ctx.createRadialGradient(cx, cy, baseR * 0.3, cx, cy, glowR);
        grad.addColorStop(0, glow);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

        // Pulse ring for urgent items
        if (ev.days <= 3) {
          const pulseR = baseR + 6 + Math.sin(t * 3 + ev.hash) * 4;
          ctx.beginPath();
          ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = color + "30";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Orbiting action items
        if (ev.actions.length > 0) {
          const orbitR = baseR + 14;
          ev.actions.forEach((action, i) => {
            const angle = (Math.PI * 2 * i) / ev.actions.length + t * 0.3 + ev.hash;
            const ax = cx + Math.cos(angle) * orbitR;
            const ay = cy + Math.sin(angle) * orbitR;
            const childR = 3 + (i % 3);

            // Connection line
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(ax, ay);
            ctx.strokeStyle = color + "18";
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Child dot
            ctx.beginPath();
            ctx.arc(ax, ay, childR, 0, Math.PI * 2);
            ctx.fillStyle = color + "50";
            ctx.fill();
            ctx.strokeStyle = color + "30";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          });
        }

        // Parent node
        ctx.beginPath();
        ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
        ctx.fillStyle = color + "25";
        ctx.fill();
        ctx.strokeStyle = color + "60";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner bright core
        ctx.beginPath();
        ctx.arc(cx, cy, baseR * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = color + "80";
        ctx.fill();

        // Label
        ctx.fillStyle = COLORS.text + "bb";
        ctx.font = `${Math.max(10, 9 + ev.weight * 0.4)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "left";
        const labelY = cy < h * 0.3 ? cy + baseR + 14 : cy - baseR - 8;
        ctx.fillText(ev.name, cx + baseR + 6, labelY);

        // Days badge
        ctx.fillStyle = COLORS.textDim;
        ctx.font = "9px 'JetBrains Mono', monospace";
        const dLabel = ev.days < 1 ? "today" : `${Math.round(ev.days)}d`;
        ctx.fillText(dLabel, cx + baseR + 6, labelY + 13);
      });

      animRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [processedEvents]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

// ════════════════════════════════════════════════════════════════════
// TIMELINE STRIP (Top Layer)
// ════════════════════════════════════════════════════════════════════
function TimelineStrip({ events }) {
  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(TODAY);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = i === 0;
      const dayEvents = events.filter(ev => {
        const evDate = new Date(ev.date);
        return evDate.toDateString() === d.toDateString();
      });
      arr.push({ date: d, isWeekend, isToday, events: dayEvents, index: i });
    }
    return arr;
  }, [events]);

  return (
    <div style={{
      background: COLORS.surface,
      backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${COLORS.surfaceBorder}`,
      padding: "6px 12px",
      display: "flex",
      gap: 0,
      overflow: "hidden",
    }}>
      {days.map(day => {
        const dayName = day.date.toLocaleDateString("en-US", { weekday: "narrow" });
        const dayNum = day.date.getDate();
        const monthLabel = dayNum === 1 || day.isToday
          ? day.date.toLocaleDateString("en-US", { month: "short" })
          : null;

        return (
          <div
            key={day.index}
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "2px 1px",
              borderRadius: 4,
              background: day.isToday ? COLORS.green500 + "20" : "transparent",
              borderLeft: day.isWeekend && day.date.getDay() === 6 ? `1px solid ${COLORS.textDim}30` : "none",
              borderRight: day.isWeekend && day.date.getDay() === 0 ? `1px solid ${COLORS.textDim}30` : "none",
              position: "relative",
            }}
          >
            {/* Month label */}
            {monthLabel && (
              <div style={{
                fontSize: 7,
                color: COLORS.green500,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                position: "absolute",
                top: -1,
                whiteSpace: "nowrap",
              }}>
                {monthLabel}
              </div>
            )}

            {/* Day letter */}
            <div style={{
              fontSize: 8,
              color: day.isWeekend ? COLORS.warm + "80" : COLORS.textDim,
              fontFamily: "'JetBrains Mono', monospace",
              marginTop: monthLabel ? 8 : 0,
            }}>
              {dayName}
            </div>

            {/* Day number */}
            <div style={{
              fontSize: 10,
              fontWeight: day.isToday ? 700 : 400,
              color: day.isToday ? COLORS.green300 : day.isWeekend ? COLORS.textMuted : COLORS.text + "88",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {dayNum}
            </div>

            {/* Event dots */}
            {day.events.length > 0 && (
              <div style={{ display: "flex", gap: 2, marginTop: 1 }}>
                {day.events.slice(0, 3).map((ev, j) => {
                  const dotColor = ev.type === "deadline" ? COLORS.hot
                    : ev.type === "travel" ? COLORS.green300
                    : COLORS.warm;
                  return (
                    <div
                      key={j}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: dotColor,
                        boxShadow: `0 0 4px ${dotColor}60`,
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Event label — only show for events, staggered to avoid overlap */}
            {day.events.length > 0 && (
              <div style={{
                position: "absolute",
                bottom: -14,
                fontSize: 7,
                color: COLORS.text + "80",
                fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: "nowrap",
                maxWidth: 60,
                overflow: "hidden",
                textOverflow: "ellipsis",
                transform: "rotate(-20deg)",
                transformOrigin: "top left",
              }}>
                {day.events[0].name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// DYNAMIC ISLAND (Floating Left Layer)
// ════════════════════════════════════════════════════════════════════
function DynamicIsland({ data }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: COLORS.surface,
        backdropFilter: "blur(24px)",
        border: `1px solid ${data.pulse ? COLORS.hot + "40" : COLORS.surfaceBorder}`,
        borderRadius: expanded ? 16 : 24,
        padding: expanded ? "16px 20px" : "10px 20px",
        cursor: "pointer",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: data.pulse
          ? `0 0 20px ${COLORS.hot}15, inset 0 0 20px ${COLORS.hot}08`
          : `0 4px 20px rgba(0,0,0,0.3)`,
        maxWidth: expanded ? 320 : 280,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Pulse animation border */}
      {data.pulse && (
        <div style={{
          position: "absolute",
          inset: -1,
          borderRadius: "inherit",
          border: `1px solid ${COLORS.hot}`,
          opacity: 0.3,
          animation: "pulse 2s ease-in-out infinite",
        }} />
      )}

      {/* Primary text */}
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: data.pulse ? COLORS.hot : COLORS.green300,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "-0.02em",
      }}>
        {data.primary}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{
          marginTop: 8,
          fontSize: 11,
          color: COLORS.textMuted,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1.5,
        }}>
          {data.secondary}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// FOCUS PANEL (Right Layer)
// ════════════════════════════════════════════════════════════════════
const URGENCY_STYLES = {
  hot:      { dot: COLORS.critical, tag: "NOW", tagColor: COLORS.critical },
  active:   { dot: COLORS.green500, tag: "ACTIVE", tagColor: COLORS.green500 },
  warm:     { dot: COLORS.warm, tag: "THIS WEEK", tagColor: COLORS.warm },
  upcoming: { dot: COLORS.green700, tag: "UPCOMING", tagColor: COLORS.green700 },
};

function FocusPanel({ items }) {
  return (
    <div style={{
      background: COLORS.surface,
      backdropFilter: "blur(24px)",
      border: `1px solid ${COLORS.surfaceBorder}`,
      borderRadius: 12,
      padding: "20px 16px",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      overflow: "auto",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 8,
      }}>
        <h2 style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: COLORS.textMuted,
          fontFamily: "'JetBrains Mono', monospace",
          margin: 0,
        }}>
          Focus
        </h2>
        <span style={{
          fontSize: 9,
          color: COLORS.textDim,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {items.length} threads
        </span>
      </div>

      {/* Items */}
      {items.map((item, i) => {
        const style = URGENCY_STYLES[item.urgency] || URGENCY_STYLES.active;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 0",
              borderTop: i > 0 ? `1px solid ${COLORS.surfaceBorder}` : "none",
            }}
          >
            {/* Status indicator */}
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: style.dot,
              marginTop: 5,
              flexShrink: 0,
              boxShadow: `0 0 8px ${style.dot}40`,
            }} />

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: COLORS.text,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {item.label}
                </span>
                <span style={{
                  fontSize: 8,
                  padding: "2px 6px",
                  borderRadius: 4,
                  color: style.tagColor,
                  background: style.tagColor + "15",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}>
                  {style.tag}
                </span>
              </div>
              <p style={{
                margin: "4px 0 0",
                fontSize: 10,
                lineHeight: 1.5,
                color: COLORS.textMuted,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {item.context}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN LAYOUT — Layered Composition
// ════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      background: COLORS.bg,
      position: "relative",
      overflow: "hidden",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {/* Load font */}
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Subtle background texture */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 50%, ${COLORS.greenGlow}, transparent 60%),
          radial-gradient(circle at 80% 30%, rgba(46, 204, 113, 0.03), transparent 50%)
        `,
        pointerEvents: "none",
      }} />

      {/* ═══ LAYER 0: Orbital Chart Background ═══ */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "75%",
        height: "100%",
        zIndex: 0,
      }}>
        <OrbitalChart events={ORBITAL_EVENTS} />
      </div>

      {/* ═══ LAYER 1: Timeline Strip (Top) ═══ */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      }}>
        <TimelineStrip events={CALENDAR_EVENTS} />
      </div>

      {/* ═══ LAYER 2: Dynamic Island (Top-Left) ═══ */}
      <div style={{
        position: "absolute",
        top: 80,
        left: 20,
        zIndex: 20,
      }}>
        <DynamicIsland data={DYNAMIC_ISLAND_DATA} />
      </div>

      {/* ═══ LAYER 3: Focus Panel (Right) ═══ */}
      <div style={{
        position: "absolute",
        top: 70,
        right: 16,
        bottom: 16,
        width: "28%",
        minWidth: 260,
        zIndex: 15,
      }}>
        <FocusPanel items={FOCUS_ITEMS} />
      </div>

      {/* Pulse keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}