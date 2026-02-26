import { useEffect, useRef } from "react";
import type { WidgetProps, DashboardEvent, EventAction } from "../types";
import { daysFromNow, logX, MAX_DAYS } from "../utils/temporal";
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
  events: DashboardEvent[];
}

interface BubbleNode {
  event: DashboardEvent;
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
  todoActions: EventAction[];
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
const PADDING = { top: 30, right: 40, bottom: 45, left: 30 };
const GRID_MARKERS = [
  { label: "1d", days: 1 },
  { label: "3d", days: 3 },
  { label: "1w", days: 7 },
  { label: "2w", days: 14 },
  { label: "1mo", days: 30 },
  { label: "2mo", days: 60 },
];
const FONT = "'JetBrains Mono', monospace";

// ═══════════════════════════════════════════
// Layout
// ═══════════════════════════════════════════

function nameHash(name: string): number {
  return name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

function toPixelX(logVal: number, w: number): number {
  const drawW = w - PADDING.left - PADDING.right;
  return PADDING.left + (logVal / 100) * drawW;
}

function buildNodes(
  events: DashboardEvent[],
  w: number,
  h: number
): { nodes: BubbleNode[]; dots: ActionDot[] } {
  const drawH = h - PADDING.top - PADDING.bottom;

  const nodes: BubbleNode[] = events.map((ev) => {
    const days = daysFromNow(ev.date);
    const todoActions = ev.actions.filter((a) => a.status === "todo");
    const xNorm = logX(days) / 100;
    const hash = nameHash(ev.name);
    const yNorm = 0.18 + (hash % 58) / 100;
    const baseRadius = (18 + ev.weight * 4 + todoActions.length * 2.5) / 2;
    const proximityMultiplier = 1 + 2 / (days + 1);
    const radius = baseRadius * proximityMultiplier;

    return {
      event: ev,
      days,
      xNorm,
      yNorm,
      x: PADDING.left + xNorm * (w - PADDING.left - PADDING.right),
      y: PADDING.top + yNorm * drawH,
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
        nodes[i].y = PADDING.top + nodes[i].yNorm * drawH;
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

  // Time marker lines
  ctx.lineWidth = 1;
  GRID_MARKERS.forEach((m) => {
    const x = toPixelX(logX(m.days), w);
    ctx.beginPath();
    ctx.setLineDash([2, 10]);
    ctx.strokeStyle = canvasColors.grid;
    ctx.moveTo(x, yTop);
    ctx.lineTo(x, yBot);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = canvasColors.text.tertiary + "70";
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

function drawLabels(ctx: CanvasRenderingContext2D, node: BubbleNode, h: number) {
  const { x, y, radius, opacity } = node;
  ctx.globalAlpha = opacity;

  const labelAbove = y > h * 0.55;
  const labelY = labelAbove ? y - radius - 10 : y + radius + 16;
  const fontSize = Math.max(10, Math.min(14, 8 + node.event.weight * 0.6));

  // Text with outline for legibility
  ctx.font = `500 ${fontSize}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.strokeStyle = canvasColors.bg.base;
  ctx.lineWidth = 3;
  ctx.strokeText(node.event.name, x, labelY);
  ctx.fillStyle = canvasColors.text.primary + "cc";
  ctx.fillText(node.event.name, x, labelY);

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
