import { useEffect, useRef } from "react";
import type { WidgetProps } from "../types";
import type { DateEvent, DateAction } from "../types/dates";
import { daysUntil } from "../types/dates";
import { logX, MAX_DAYS } from "../utils/temporal";
import {
  canvasColors,
  stressColor,
  stressGlow,
  distanceOpacity,
  hue,
  daysToHueValue,
} from "../design-system";


// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface TemporalBubbleMapProps extends WidgetProps {
  events: DateEvent[];
}

interface BubbleNode {
  event: DateEvent;
  days: number;
  xNorm: number;
  yNorm: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  glowColor: string;
  opacity: number;
  daysLabel: string;
  todoActions: DateAction[];
  hash: number;
}

interface ActionDot {
  parent: BubbleNode;
  index: number;
  size: number;
  color: string;
  borderColor: string;
  lineColor: string;
}

// ═══════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════

const TAU = Math.PI * 2;
const PADDING = { top: 30, right: 0, bottom: 45, left: 0 };
const X_MIN = -6;
const X_MAX = 120;
const GRID_MARKERS = [
  { label: "1d", days: 1 },
  { label: "3d", days: 3 },
  { label: "1w", days: 7 },
  { label: "2w", days: 14 },
  { label: "1mo", days: 30 },
  { label: "2mo", days: 60 },
];
const FONT = "'JetBrains Mono', monospace";

// ─── Bubble sizing ───
const RADIUS_MIN = 16;
const RADIUS_MAX = 62;
const BASE_RADIUS = 14;
const ACTION_WEIGHT = 2.5;
const PROX_SIZE_FACTOR = 1.5;
const TRIP_DURATION_WEIGHT = 1.5;

// ─── Y-axis attention scoring ───
const CATEGORY_MULTIPLIER: Record<string, number> = {
  trip: 1.4,
  travel: 1.4,
  work: 1.0,
  personal: 1.0,
  social: 0.9,
};
const RECURRING_DAMPER = 0.6;
const DANA_BOOST = 1.15;
const TODO_Y_WEIGHT = 1.5;
const PROX_Y_MAX = 8;
const MAX_Y = 35;

// ═══════════════════════════════════════════
// Layout
// ═══════════════════════════════════════════

function nameHash(name: string): number {
  return name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

function toPixelX(logVal: number, w: number): number {
  const drawW = w - PADDING.left - PADDING.right;
  return PADDING.left + ((logVal - X_MIN) / (X_MAX - X_MIN)) * drawW;
}

function buildNodes(
  events: DateEvent[],
  w: number,
  h: number
): { nodes: BubbleNode[]; dots: ActionDot[] } {
  const drawH = h - PADDING.top - PADDING.bottom;

  const nodes: BubbleNode[] = events.map((ev) => {
    const days = daysUntil(ev);
    const todoActions = ev.actions.filter((a: DateAction) => a.status === "todo");
    const xNorm = logX(days) / 100;
    const hash = nameHash(ev.name);

    // ─── Size = "how much stuff is attached" ───
    const totalActions = ev.actions.length; // todo + done — scale doesn't shrink
    const baseRadius = BASE_RADIUS + totalActions * ACTION_WEIGHT;

    // Multi-day trips get bigger — a 14-day Japan trip is a bigger deal than a day trip
    const durationBonus = ev.category === "travel"
      ? ev.durationDays * TRIP_DURATION_WEIGHT
      : 0;

    const proxSizeBoost = 1 + PROX_SIZE_FACTOR / (days + 1);
    const radius = Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, (baseRadius + durationBonus) * proxSizeBoost));

    // ─── Y-axis = "how much this demands attention right now" ───
    const catMult = CATEGORY_MULTIPLIER[ev.category] ?? 1.0;
    const recurMult = ev.isRecurring ? RECURRING_DAMPER : 1.0;
    const peopleMult = ev.people.some((p) => p.toLowerCase().includes("dana"))
      ? DANA_BOOST
      : 1.0;

    const attentionScore = ev.importance * catMult * recurMult * peopleMult;

    const openTodos = todoActions.length;
    const todoBoost = openTodos * TODO_Y_WEIGHT;

    // Proximity curve: steep inside 7 days, fades to zero at 14 days
    // log(15 / (days+1)) / log(15) → ~1.0 at day 0, ~0.7 at day 3, ~0.35 at day 7, 0 at day 14
    const proximityBoost = days <= 14
      ? PROX_Y_MAX * Math.log(15 / (days + 1)) / Math.log(15)
      : 0;

    const rawY = attentionScore + todoBoost + Math.max(0, proximityBoost);
    const yNorm = Math.min(0.92, Math.max(0.08, rawY / MAX_Y));

    return {
      event: ev,
      days,
      xNorm,
      yNorm,
      x: toPixelX(logX(days), w),
      y: PADDING.top + (1 - yNorm) * drawH,
      radius,
      color: stressColor(days),
      glowColor: stressGlow(days),
      opacity: distanceOpacity(days),
      daysLabel: Math.round(days) <= 0 ? "!" : String(Math.round(days)),
      todoActions,
      hash,
    };
  });

  // Anti-overlap Y nudging
  nodes.sort((a, b) => a.xNorm - b.xNorm);
  for (let i = 1; i < nodes.length; i++) {
    for (let j = 0; j < i; j++) {
      const dx = Math.abs(nodes[i].xNorm - nodes[j].xNorm);
      const dy = Math.abs(nodes[i].yNorm - nodes[j].yNorm);
      if (dx < 0.1 && dy < 0.14) {
        nodes[i].yNorm = Math.min(0.82, nodes[j].yNorm + 0.16);
        nodes[i].y = PADDING.top + (1 - nodes[i].yNorm) * drawH;
      }
    }
  }

  // Build action dots
  const dots: ActionDot[] = [];
  nodes.forEach((node) => {
    const hueVal = daysToHueValue(node.days, MAX_DAYS);
    node.todoActions.forEach((_, i) => {
      dots.push({
        parent: node,
        index: i,
        size: 3 + ((i * 7 + 3) % 5) * 0.6,
        color: hue(hueVal, 0.35),
        borderColor: hue(hueVal, 0.5),
        lineColor: hue(hueVal, 0.12),
      });
    });
  });

  return { nodes, dots };
}

// ═══════════════════════════════════════════
// Drawing functions
// ═══════════════════════════════════════════

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const yTop = PADDING.top;
  const yBot = h - PADDING.bottom;

  // Time marker labels only (no lines)
  GRID_MARKERS.forEach((m) => {
    const x = toPixelX(logX(m.days), w);
    ctx.fillStyle = "#5c6580";
    ctx.font = `10px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(m.label, x, h - 8);
  });

  // TODAY marker
  const todayX = toPixelX(logX(0), w);
  ctx.strokeStyle = canvasColors.text.alert + "50";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(todayX, yTop - 10);
  ctx.lineTo(todayX, yBot);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = canvasColors.text.alert;
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("TODAY", todayX, yTop - 2);
}

function getUpcomingWeekendDays(count: number): { days: number; label: string }[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const result: { days: number; label: string }[] = [];
  const d = new Date(now);
  d.setDate(d.getDate() + 1); // start from tomorrow
  while (result.length < count) {
    if (d.getDay() === 0 || d.getDay() === 6) {
      const daysDiff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      result.push({
        days: daysDiff,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return result;
}

function drawWeekendLines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const yTop = PADDING.top;
  const yBot = h - PADDING.bottom;
  const weekendDays = getUpcomingWeekendDays(4);

  weekendDays.forEach((wd) => {
    const x = toPixelX(logX(wd.days), w);

    // Gradient line: visible at bottom, fading out quickly
    const fadeTop = yBot - (yBot - yTop) * 0.35;
    const grad = ctx.createLinearGradient(x, yBot, x, fadeTop);
    grad.addColorStop(0, "rgba(60, 70, 90, 0.45)");
    grad.addColorStop(1, "rgba(60, 70, 90, 0)");

    ctx.beginPath();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.moveTo(x, yTop);
    ctx.lineTo(x, yBot);
    ctx.stroke();

    // Label at bottom
    ctx.fillStyle = "#3a4050";
    ctx.font = `9px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(wd.label, x, yBot + 12);
  });
}

function drawSpine(ctx: CanvasRenderingContext2D, nodes: BubbleNode[]) {
  const sorted = [...nodes].sort((a, b) => a.xNorm - b.xNorm);
  if (sorted.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = canvasColors.text.tertiary + "35";
  ctx.lineWidth = 1.5;

  ctx.moveTo(sorted[0].x, sorted[0].y);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.5;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.5;
    ctx.bezierCurveTo(cpx1, prev.y, cpx2, curr.y, curr.x, curr.y);
  }
  ctx.stroke();
}

function getOrbitPos(
  parent: BubbleNode,
  dot: ActionDot,
  totalChildren: number,
  t: number
): { ax: number; ay: number } {
  const orbitR = parent.radius + 20;
  const angle =
    (TAU * dot.index) / totalChildren + t * 0.25 + parent.hash;
  return {
    ax: parent.x + Math.cos(angle) * orbitR,
    ay: parent.y + Math.sin(angle) * orbitR,
  };
}

function drawConnectionLines(
  ctx: CanvasRenderingContext2D,
  node: BubbleNode,
  nodeDots: ActionDot[],
  t: number
) {
  const n = node.todoActions.length;
  if (n === 0) return;

  ctx.globalAlpha = node.opacity;
  nodeDots.forEach((dot) => {
    const { ax, ay } = getOrbitPos(node, dot, n, t);
    const midX = (node.x + ax) / 2;
    const midY = (node.y + ay) / 2 - 4;

    ctx.beginPath();
    ctx.moveTo(node.x, node.y);
    ctx.quadraticCurveTo(midX + 3, midY - 3, ax, ay);
    ctx.strokeStyle = dot.lineColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  node: BubbleNode,
  t: number
) {
  const { x, y, radius, color, glowColor, opacity } = node;
  ctx.globalAlpha = opacity;

  // Radial glow
  const glowR = radius * 2.5;
  const grad = ctx.createRadialGradient(x, y, radius * 0.3, x, y, glowR);
  grad.addColorStop(0, glowColor);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, TAU);
  ctx.fill();

  // Pulsating rings (≤3 days)
  if (node.days <= 3) {
    const pulse1 = radius + 8 + Math.sin(t * 2.5 + node.hash) * 5;
    ctx.beginPath();
    ctx.arc(x, y, pulse1, 0, TAU);
    ctx.strokeStyle = color + "25";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const pulse2 = radius + 18 + Math.sin(t * 2.5 + node.hash + 1) * 4;
    ctx.beginPath();
    ctx.arc(x, y, pulse2, 0, TAU);
    ctx.strokeStyle = color + "10";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Outer ring
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fillStyle = color + "10";
  ctx.fill();
  ctx.strokeStyle = color + "35";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner core
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.55, 0, TAU);
  ctx.fillStyle = color + "18";
  ctx.fill();

  // Day count centered
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.max(7, Math.round(radius * 0.7))}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(node.daysLabel, x, y);
  ctx.textBaseline = "alphabetic";

  ctx.globalAlpha = 1;
}

function drawActionDots(
  ctx: CanvasRenderingContext2D,
  node: BubbleNode,
  nodeDots: ActionDot[],
  t: number
) {
  const n = node.todoActions.length;
  if (n === 0) return;

  ctx.globalAlpha = node.opacity;
  nodeDots.forEach((dot) => {
    const { ax, ay } = getOrbitPos(node, dot, n, t);

    ctx.beginPath();
    ctx.arc(ax, ay, dot.size, 0, TAU);
    ctx.fillStyle = dot.color;
    ctx.fill();
    ctx.strokeStyle = dot.borderColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

function formatDateLabel(startDate: string): string {
  const d = new Date(startDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const LABEL_MAX_CHARS = 18;

function truncateLabel(name: string): string {
  return name.length > LABEL_MAX_CHARS ? name.slice(0, LABEL_MAX_CHARS - 1) + "…" : name;
}

function drawLabels(ctx: CanvasRenderingContext2D, node: BubbleNode, h: number) {
  const { x, y, radius, opacity } = node;
  ctx.globalAlpha = opacity;

  const labelAbove = y > h * 0.55;
  const labelY = labelAbove ? y - radius - 14 : y + radius + 18;
  const fontSize = Math.max(10, Math.min(14, 8 + node.event.importance * 0.6));
  const label = truncateLabel(node.event.name);

  // Event name with outline for legibility
  ctx.font = `500 ${fontSize}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.strokeStyle = canvasColors.bg.base;
  ctx.lineWidth = 3;
  ctx.strokeText(label, x, labelY);
  ctx.fillStyle = canvasColors.text.primary + "cc";
  ctx.fillText(label, x, labelY);

  // Date below the name
  const dateY = labelAbove ? labelY - fontSize - 2 : labelY + 12;
  const dateStr = formatDateLabel(node.event.startDate);
  ctx.font = `9px ${FONT}`;
  ctx.strokeStyle = canvasColors.bg.base;
  ctx.lineWidth = 3;
  ctx.strokeText(dateStr, x, dateY);
  ctx.fillStyle = "#4a5060";
  ctx.fillText(dateStr, x, dateY);

  ctx.globalAlpha = 1;
}

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

export function TemporalBubbleMap({ events }: TemporalBubbleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    const startTime = performance.now();

    function frame(now: number) {
      if (!running || !container || !canvas || !ctx) return;
      const t = (now - startTime) / 1000;

      const dpr = window.devicePixelRatio || 1;
      // Read size from the container, not the canvas — avoids feedback loop
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const pixelW = Math.round(w * dpr);
      const pixelH = Math.round(h * dpr);

      if (canvas.width !== pixelW || canvas.height !== pixelH) {
        canvas.width = pixelW;
        canvas.height = pixelH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const { nodes, dots } = buildNodes(events, w, h);

      // Build dots-by-node lookup
      const dotsByNode = new Map<BubbleNode, ActionDot[]>();
      nodes.forEach((n) => dotsByNode.set(n, []));
      dots.forEach((d) => dotsByNode.get(d.parent)?.push(d));

      // Draw in z-order
      drawGrid(ctx, w, h);
      drawWeekendLines(ctx, w, h);
      drawSpine(ctx, nodes);
      nodes.forEach((n) => drawConnectionLines(ctx, n, dotsByNode.get(n) || [], t));
      nodes.forEach((n) => drawBubble(ctx, n, t));
      nodes.forEach((n) => drawActionDots(ctx, n, dotsByNode.get(n) || [], t));
      nodes.forEach((n) => drawLabels(ctx, n, h));

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

    return () => {
      running = false;
    };
  }, [events]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
}
