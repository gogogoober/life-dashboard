import { useState, useEffect, useRef, useMemo } from "react";

// ════════════════════════════════════════════════════════════════════
// COLOR SYSTEM
// ════════════════════════════════════════════════════════════════════
const COLORS = {
  bg: "#0a0e0a",
  surface: "rgba(14, 22, 14, 0.78)",
  surfaceBorder: "rgba(40, 70, 40, 0.25)",

  green100: "#d4f5d4",
  green300: "#6ee7a0",
  green500: "#2ecc71",
  green700: "#1a8a4a",
  green900: "#0d4a28",

  amber: "#e8a735",
  hot: "#e85d35",
  critical: "#ff3b3b",

  text: "#c8d8c8",
  textMuted: "#5a7a5a",
  textDim: "#3a5a3a",
  gridLine: "rgba(46, 204, 113, 0.05)",
};

function stressColor(daysAway) {
  if (daysAway <= 1) return COLORS.critical;
  if (daysAway <= 3) return COLORS.hot;
  if (daysAway <= 7) return COLORS.amber;
  if (daysAway <= 14) return COLORS.green500;
  if (daysAway <= 30) return COLORS.green700;
  return COLORS.green900;
}

function stressGlow(daysAway) {
  if (daysAway <= 1) return "rgba(255, 59, 59, 0.35)";
  if (daysAway <= 3) return "rgba(232, 93, 53, 0.25)";
  if (daysAway <= 7) return "rgba(232, 167, 53, 0.2)";
  return "rgba(46, 204, 113, 0.1)";
}

// Opacity for far-out events (translucent/glassy at distance)
function distanceOpacity(daysAway) {
  if (daysAway <= 14) return 1;
  if (daysAway <= 30) return 0.7;
  return 0.4;
}

// ════════════════════════════════════════════════════════════════════
// STUB DATA
// ════════════════════════════════════════════════════════════════════
const TODAY = new Date(2026, 1, 26);

const ORBITAL_EVENTS = [
  { name: "Dana's Birthday", date: new Date(2026, 1, 28), weight: 7, category: "personal", priority: "high",
    actions: ["Jell-O shots", "Coordinate w/ Shar", "Laser tag booking"] },
  { name: "Cerebro v2", date: new Date(2026, 2, 1), weight: 4, category: "project", priority: "medium",
    actions: ["Timeline widget", "Color system"] },
  { name: "Mariano Trip", date: new Date(2026, 2, 5), weight: 5, category: "travel", priority: "high",
    actions: ["Pick destination", "Book flights"] },
  { name: "E-ink Order", date: new Date(2026, 2, 10), weight: 3, category: "project", priority: "low",
    actions: ["Final panel decision"] },
  { name: "Dentist", date: new Date(2026, 2, 15), weight: 2, category: "personal", priority: "low", actions: [] },
  { name: "Japan Trip", date: new Date(2026, 2, 23), weight: 9, category: "travel", priority: "high",
    actions: ["Pack list", "Fountain pen shops", "JR Pass", "Hotel confirms"] },
  { name: "Taxes Prep", date: new Date(2026, 3, 1), weight: 5, category: "admin", priority: "medium",
    actions: ["Gather W2s", "Schedule CPA"] },
  // Far-out events to show behind focus panel
  { name: "Q2 Goals Review", date: new Date(2026, 3, 15), weight: 4, category: "admin", priority: "medium",
    actions: ["Draft goals", "Review metrics"] },
  { name: "Mom's Visit", date: new Date(2026, 3, 20), weight: 5, category: "personal", priority: "high",
    actions: ["Guest room", "Plan dinners"] },
  { name: "Lease Renewal", date: new Date(2026, 3, 25), weight: 3, category: "admin", priority: "medium",
    actions: ["Review terms"] },
];

const CALENDAR_EVENTS = [
  { name: "Dana's 30th 🎂", start: new Date(2026, 1, 28), end: new Date(2026, 1, 28), type: "event" },
  { name: "Cerebro Deploy", start: new Date(2026, 2, 1), end: new Date(2026, 2, 1), type: "deadline" },
  { name: "Mariano Call", start: new Date(2026, 2, 3), end: new Date(2026, 2, 3), type: "event" },
  { name: "Trip Planning", start: new Date(2026, 2, 5), end: new Date(2026, 2, 6), type: "event" },
  { name: "E-ink Deadline", start: new Date(2026, 2, 10), end: new Date(2026, 2, 10), type: "deadline" },
  { name: "Dentist", start: new Date(2026, 2, 15), end: new Date(2026, 2, 15), type: "event" },
  { name: "Japan ✈️", start: new Date(2026, 2, 23), end: new Date(2026, 3, 7), type: "travel" },
];

const FOCUS_ITEMS = [
  { label: "Dana's 30th", urgency: "hot", context: "2 days — Jell-O shots, Shar coordination, laser tag deposit", category: "personal" },
  { label: "Cerebro v2 Layout", urgency: "active", context: "Layered orbital design — timeline + focus panel", category: "project" },
  { label: "Mariano Trip", urgency: "warm", context: "Pick warm-weather destination this week", category: "travel" },
  { label: "Japan Prep", urgency: "upcoming", context: "Fountain pen research, JR Pass window opening", category: "travel" },
  { label: "Taxes", urgency: "upcoming", context: "April 1 — gather W2s", category: "admin" },
];

// ════════════════════════════════════════════════════════════════════
// ORBITAL CHART
// ════════════════════════════════════════════════════════════════════
function OrbitalChart({ events }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);

  const processedEvents = useMemo(() => {
    const maxDays = 65;
    const evs = events.map(ev => {
      const days = Math.max(0.5, (ev.date - TODAY) / (1000 * 60 * 60 * 24));
      const xNorm = Math.log(days + 1) / Math.log(maxDays + 1);
      const hash = ev.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const yNorm = 0.18 + (hash % 58) / 100;
      return { ...ev, days, xNorm, yNorm, hash };
    });

    // Anti-overlap Y nudging
    evs.sort((a, b) => a.xNorm - b.xNorm);
    for (let i = 1; i < evs.length; i++) {
      for (let j = 0; j < i; j++) {
        const dx = Math.abs(evs[i].xNorm - evs[j].xNorm);
        const dy = Math.abs(evs[i].yNorm - evs[j].yNorm);
        if (dx < 0.1 && dy < 0.14) {
          evs[i].yNorm = Math.min(0.82, evs[j].yNorm + 0.16);
        }
      }
    }
    return evs;
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

    function getCoords(ev, w, h) {
      return {
        x: ev.xNorm * w * 0.88 + w * 0.03,
        y: ev.yNorm * h,
      };
    }

    function draw() {
      if (!running) return;
      timeRef.current += 0.004;
      const t = timeRef.current;
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;

      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.lineWidth = 1;
      const gridDays = [1, 3, 7, 14, 30, 60];
      gridDays.forEach(d => {
        const x = (Math.log(d + 1) / Math.log(66)) * w * 0.88 + w * 0.03;
        ctx.beginPath();
        ctx.setLineDash([2, 10]);
        ctx.strokeStyle = COLORS.gridLine;
        ctx.moveTo(x, h * 0.1);
        ctx.lineTo(x, h * 0.93);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = COLORS.textDim + "70";
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        const label = d === 1 ? "1d" : d === 3 ? "3d" : d === 7 ? "1w" : d === 14 ? "2w" : d === 30 ? "1mo" : "2mo";
        ctx.fillText(label, x, h * 0.97);
      });

      // TODAY marker (orange)
      const todayX = w * 0.03;
      ctx.strokeStyle = COLORS.hot + "50";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(todayX, h * 0.06);
      ctx.lineTo(todayX, h * 0.95);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = COLORS.hot;
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("TODAY", todayX, h * 0.05 + 8);

      // Curved spine
      const sorted = [...processedEvents].sort((a, b) => a.xNorm - b.xNorm);
      if (sorted.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = COLORS.green900 + "35";
        ctx.lineWidth = 1.5;
        const pts = sorted.map(ev => getCoords(ev, w, h));
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const prev = pts[i - 1];
          const curr = pts[i];
          const cpx1 = prev.x + (curr.x - prev.x) * 0.5;
          const cpx2 = prev.x + (curr.x - prev.x) * 0.5;
          ctx.bezierCurveTo(cpx1, prev.y, cpx2, curr.y, curr.x, curr.y);
        }
        ctx.stroke();
      }

      // Draw events
      processedEvents.forEach(ev => {
        const { x: cx, y: cy } = getCoords(ev, w, h);
        const baseR = 16 + ev.weight * 2.5;
        const color = stressColor(ev.days);
        const glow = stressGlow(ev.days);
        const daysRound = Math.round(ev.days);
        const opacity = distanceOpacity(ev.days);

        ctx.globalAlpha = opacity;

        // Glow
        const glowR = baseR * 2;
        const grad = ctx.createRadialGradient(cx, cy, baseR * 0.5, cx, cy, glowR);
        grad.addColorStop(0, glow);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Pulse rings for ≤3 days
        if (ev.days <= 3) {
          const pulseR = baseR + 8 + Math.sin(t * 2.5 + ev.hash) * 5;
          ctx.beginPath();
          ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = color + "25";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          const pulseR2 = baseR + 18 + Math.sin(t * 2.5 + ev.hash + 1) * 4;
          ctx.beginPath();
          ctx.arc(cx, cy, pulseR2, 0, Math.PI * 2);
          ctx.strokeStyle = color + "10";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Orbiting action items
        if (ev.actions.length > 0) {
          const orbitR = baseR + 20;
          ev.actions.forEach((action, i) => {
            const angle = (Math.PI * 2 * i) / ev.actions.length + t * 0.25 + ev.hash;
            const ax = cx + Math.cos(angle) * orbitR;
            const ay = cy + Math.sin(angle) * orbitR;
            const childR = 3 + (i % 3);

            // Curved connection
            const midX = (cx + ax) / 2;
            const midY = (cy + ay) / 2 - 4;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.quadraticCurveTo(midX + 3, midY - 3, ax, ay);
            ctx.strokeStyle = color + "12";
            ctx.lineWidth = 0.8;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(ax, ay, childR, 0, Math.PI * 2);
            ctx.fillStyle = color + "40";
            ctx.fill();
            ctx.strokeStyle = color + "20";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          });
        }

        // Parent node outer
        ctx.beginPath();
        ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
        ctx.fillStyle = color + "10";
        ctx.fill();
        ctx.strokeStyle = color + "35";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner core
        ctx.beginPath();
        ctx.arc(cx, cy, baseR * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = color + "18";
        ctx.fill();

        // Days number centered
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.max(14, baseR * 0.58)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(daysRound <= 0 ? "!" : String(daysRound), cx, cy);
        ctx.textBaseline = "alphabetic";

        // Event name (no days subtitle — just the name)
        const labelAbove = cy > h * 0.55;
        const labelY = labelAbove ? cy - baseR - 10 : cy + baseR + 16;

        ctx.fillStyle = COLORS.text + "cc";
        ctx.font = `500 ${Math.max(12, 11 + ev.weight * 0.4)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = "center";
        ctx.fillText(ev.name, cx, labelY);

        ctx.globalAlpha = 1;
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
// TIMELINE RIBBON — flush top, rounded bottom corners, 95% width
// ════════════════════════════════════════════════════════════════════
function TimelineRibbon({ events }) {
  const days = useMemo(() => {
    const arr = [];
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

  const eventSpans = useMemo(() => {
    return events.map(ev => {
      const startIdx = Math.max(0, Math.round((ev.start - TODAY) / (1000 * 60 * 60 * 24)));
      const endIdx = Math.min(29, Math.round((ev.end - TODAY) / (1000 * 60 * 60 * 24)));
      const spanColor = ev.type === "deadline" ? COLORS.hot
        : ev.type === "travel" ? COLORS.green500
        : COLORS.amber;
      return { ...ev, startIdx, endIdx, color: spanColor };
    }).filter(ev => ev.endIdx >= 0 && ev.startIdx < 30);
  }, [events]);

  const assignedSpans = useMemo(() => {
    const rows = [];
    const sorted = [...eventSpans].sort((a, b) => a.startIdx - b.startIdx);
    sorted.forEach(span => {
      let row = 0;
      while (true) {
        if (!rows[row]) rows[row] = [];
        const conflict = rows[row].some(s => !(span.startIdx > s.endIdx || span.endIdx < s.startIdx));
        if (!conflict) { rows[row].push(span); span.row = row; break; }
        row++;
      }
    });
    return sorted;
  }, [eventSpans]);

  const maxRows = Math.max(1, ...assignedSpans.map(s => s.row + 1));
  const ribbonHeight = 50 + maxRows * 26;

  return (
    <div style={{
      width: "95%",
      margin: "0 auto",
      background: COLORS.surface,
      backdropFilter: "blur(20px)",
      border: `1px solid ${COLORS.surfaceBorder}`,
      borderTop: "none",
      borderRadius: "0 0 12px 12px",
      padding: "8px 0 6px 0",
      height: ribbonHeight,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Day columns */}
      <div style={{ display: "flex", height: 44, position: "relative" }}>
        {days.map(day => {
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
                  ? COLORS.hot + "12"
                  : day.isWeekend
                    ? "rgba(232, 167, 53, 0.04)"
                    : "transparent",
                borderLeft: isFirstOfMonth ? `1px solid ${COLORS.green700}40` : "none",
                borderRight: day.isSunday ? `1px solid rgba(232, 167, 53, 0.08)` : "none",
                position: "relative",
              }}
            >
              {/* Month marker */}
              {(isFirstOfMonth || day.isToday) && (
                <div style={{
                  position: "absolute",
                  top: -1,
                  left: 2,
                  fontSize: 8,
                  fontWeight: 600,
                  color: day.isToday ? COLORS.hot : COLORS.green500,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}>
                  {day.isToday ? "Today" : day.date.toLocaleDateString("en-US", { month: "short" })}
                </div>
              )}

              {/* Day name */}
              <div style={{
                fontSize: 8,
                marginTop: 11,
                color: day.isWeekend ? COLORS.amber + "bb" : COLORS.textDim,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: day.isWeekend ? 600 : 400,
              }}>
                {dayName}
              </div>

              {/* Day number — reduced 20% from 14px to ~11px */}
              <div style={{
                fontSize: 11,
                fontWeight: day.isToday ? 700 : 500,
                color: day.isToday ? COLORS.hot : day.isWeekend ? COLORS.amber + "cc" : COLORS.text + "88",
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.2,
              }}>
                {dayNum}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gantt event bars — taller rows, text can wrap */}
      <div style={{
        position: "absolute",
        bottom: 6,
        left: 0,
        right: 0,
        height: maxRows * 26,
        pointerEvents: "none",
      }}>
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
              <span style={{
                fontSize: 9,
                fontWeight: 500,
                color: ev.color + "dd",
                fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {ev.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMING UP PILLS — closer to ribbon, bold days, no bullets
// ════════════════════════════════════════════════════════════════════
function ComingUpPills({ events }) {
  const [shakeActive, setShakeActive] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShakeActive(true);
      setTimeout(() => setShakeActive(false), 600);
    }, 30000);
    const initial = setTimeout(() => {
      setShakeActive(true);
      setTimeout(() => setShakeActive(false), 600);
    }, 3000);
    return () => { clearInterval(interval); clearTimeout(initial); };
  }, []);

  const pills = useMemo(() => {
    const upcoming = events
      .map(ev => {
        const days = Math.max(0, Math.round((ev.date - TODAY) / (1000 * 60 * 60 * 24)));
        return { ...ev, days };
      })
      .filter(ev => ev.days <= 7 && ev.days >= 0)
      .sort((a, b) => a.days - b.days);

    const nextChron = upcoming[0];
    const nextPriority = upcoming.find(ev => ev.priority === "high" && ev.actions?.length > 0);

    const result = [];
    if (nextChron) result.push({ ...nextChron, reason: "next" });
    if (nextPriority && nextPriority.name !== nextChron?.name) {
      result.push({ ...nextPriority, reason: "priority" });
    }
    upcoming.forEach(ev => {
      if (ev.days <= 3 && !result.find(r => r.name === ev.name)) {
        result.push({ ...ev, reason: "imminent" });
      }
    });

    return result.slice(0, 4);
  }, [events]);

  if (pills.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {pills.map((pill, i) => {
        const isUrgent = pill.days <= 3 && pill.priority === "high" && pill.actions?.length > 0;
        const color = pill.days <= 3 ? COLORS.hot : COLORS.amber;
        const shouldShake = isUrgent && shakeActive;
        const daysText = pill.days === 0 ? "today" : pill.days === 1 ? "1d" : `${pill.days}d`;

        return (
          <div
            key={i}
            style={{
              background: COLORS.surface,
              backdropFilter: "blur(24px)",
              border: `1px solid ${color}25`,
              borderRadius: 20,
              padding: "7px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: `0 0 10px ${color}08`,
              animation: shouldShake ? "pillShake 0.4s ease-in-out" : "none",
              maxWidth: 280,
            }}
          >
            {/* Dot */}
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 6px ${color}50`,
              flexShrink: 0,
            }} />

            {/* Event name — standard weight */}
            <span style={{
              fontSize: 12,
              fontWeight: 400,
              color: color,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {pill.name}
            </span>

            {/* Days — bold, slightly larger */}
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: color,
              fontFamily: "'JetBrains Mono', monospace",
              marginLeft: "auto",
              flexShrink: 0,
            }}>
              {daysText}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// FOCUS PANEL
// ════════════════════════════════════════════════════════════════════
const URGENCY_STYLES = {
  hot:      { dot: COLORS.critical, tag: "NOW", tagColor: COLORS.critical },
  active:   { dot: COLORS.green500, tag: "ACTIVE", tagColor: COLORS.green500 },
  warm:     { dot: COLORS.amber, tag: "THIS WEEK", tagColor: COLORS.amber },
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
      gap: 2,
      overflow: "auto",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 10,
      }}>
        <h2 style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.12em",
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

      {items.map((item, i) => {
        const st = URGENCY_STYLES[item.urgency] || URGENCY_STYLES.active;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px 0",
              borderTop: i > 0 ? `1px solid ${COLORS.surfaceBorder}` : "none",
            }}
          >
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: st.dot,
              marginTop: 5,
              flexShrink: 0,
              boxShadow: `0 0 8px ${st.dot}40`,
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 13,
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
                  color: st.tagColor,
                  background: st.tagColor + "15",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}>
                  {st.tag}
                </span>
              </div>
              <p style={{
                margin: "5px 0 0",
                fontSize: 11,
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
// MAIN LAYOUT
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
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ═══ LAYER 0: Orbital Chart — 85% width, true background ═══ */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "85%",
        height: "100%",
        zIndex: 0,
      }}>
        <OrbitalChart events={ORBITAL_EVENTS} />
      </div>

      {/* ═══ LAYER 1: Timeline Ribbon — flush top, 95% width, panel feel ═══ */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        display: "flex",
        justifyContent: "center",
      }}>
        <TimelineRibbon events={CALENDAR_EVENTS} />
      </div>

      {/* ═══ LAYER 2: Coming Up Pills — close to ribbon ═══ */}
      <div style={{
        position: "absolute",
        top: 105,
        left: 20,
        zIndex: 20,
      }}>
        <ComingUpPills events={ORBITAL_EVENTS} />
      </div>

      {/* ═══ LAYER 3: Focus Panel — right side ═══ */}
      <div style={{
        position: "absolute",
        top: 110,
        right: 16,
        bottom: 16,
        width: "27%",
        minWidth: 260,
        zIndex: 15,
      }}>
        <FocusPanel items={FOCUS_ITEMS} />
      </div>

      <style>{`
        @keyframes pillShake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-3px) rotate(-0.5deg); }
          30% { transform: translateX(2.5px) rotate(0.3deg); }
          45% { transform: translateX(-2px) rotate(-0.3deg); }
          60% { transform: translateX(1.5px) rotate(0.2deg); }
          75% { transform: translateX(-1px); }
        }
      `}</style>
    </div>
  );
}