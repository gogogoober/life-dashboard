import { useState, useEffect, useRef } from "react";
import type { WidgetProps, MapPin, PinType } from "../types";
import { PIN_COLORS } from "../data/stub";
import { Section } from "../components";

declare global {
  interface Window {
    L: any;
  }
}

interface CityMapProps extends WidgetProps {
  city: string;
  pins: MapPin[];
  center?: [number, number];
  zoom?: number;
}

export function CityMap({ city, pins, center, zoom }: CityMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const mapCenter = center || [35.6812, 139.7671];
  const mapZoom = zoom || 12;

  useEffect(() => {
    if (window.L) {
      setReady(true);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
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

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd" }
    ).addTo(map);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd", pane: "overlayPane" }
    ).addTo(map);

    const latlngs = pins.map((p) => [p.lat, p.lng]);
    L.polyline(latlngs, {
      color: "#ffffff",
      weight: 1,
      opacity: 0.08,
      dashArray: "6,6",
    }).addTo(map);

    pins.forEach((pin) => {
      const color = PIN_COLORS[pin.type as PinType] || "#888";
      const dotSize = pin.type === "stay" ? 14 : 9;

      const html =
        pin.type === "stay"
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

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [ready, pins, mapCenter, mapZoom]);

  return (
    <Section use="primary" title={`${city} — Trip Map`} className="h-full">
      <style>{`
        @keyframes mapPulse {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2);   opacity: 0; }
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
        .leaflet-tooltip-top::before { border-top-color: #2a2d3a !important; }
        .leaflet-container { background: #12151c !important; font-family: inherit !important; }
      `}</style>
      <div
        ref={mapRef}
        className="flex-1 w-full rounded-lg overflow-hidden"
        style={{ minHeight: 160, background: "#12151c" }}
      />
    </Section>
  );
}
