"use client";

import { useEffect, useRef } from "react";
import type { Strike } from "@/lib/api";

interface StrikeMapProps {
  strikes: Strike[];
  selectedStrikeId?: string | null;
  onSelectStrike?: (strike: Strike) => void;
  onClearSelection?: () => void;
}

export default function StrikeMap({
  strikes,
  selectedStrikeId,
  onSelectStrike,
  onClearSelection,
}: StrikeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  // ── Initialise the map once ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    if (mapRef.current) return;

    let isCancelled = false;

    import("leaflet").then((L) => {
      if (isCancelled || mapRef.current) return;
      
      // If the container already has a map (detectable by Leaflet's internal prop)
      // we must not call L.map again on it.
      if ((containerRef.current as any)._leaflet_id) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: [35.7219, 51.3347],
        zoom: 11,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Clicking the map background clears any selection
      map.on("click", () => {
        onClearSelection?.();
      });

      mapRef.current = map;
      
      // Force repaint to correctly register dimensions if they changed during init
      setTimeout(() => map.invalidateSize(), 150);
    });

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the background-click handler fresh without re-initialising the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = () => onClearSelection?.();
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [onClearSelection]);

  // ── Re-draw markers whenever strikes change ──────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      // Remove old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();

      strikes.forEach((strike) => {
        if (strike.longitude == null || strike.latitude == null) return;

        const isSelected = selectedStrikeId === strike.id;
        const icon = makeIcon(L, strike.accurate, isSelected);

        const marker = L.marker([strike.latitude, strike.longitude], { icon })
          .addTo(mapRef.current)
          .bindTooltip(`<div style="font-family:var(--font-display); font-size:16px; font-weight:600; padding:2px 4px">${strike.name_fa || 'Unknown Location'}</div>`, { direction: 'top', offset: [0, -10] })
          .bindPopup(buildPopup(strike), { maxWidth: 260 });

        // Stop the map click from also firing when the marker is clicked
        marker.on("click", (e: any) => {
          if (e.originalEvent) {
             L.DomEvent.stopPropagation(e.originalEvent);
          }
          onSelectStrike?.(strike);
        });

        markersRef.current.set(strike.id, marker);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strikes]);

  // ── Update marker styles when selection changes (no full redraw) ─────────
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      markersRef.current.forEach((marker, id) => {
        const strike = strikes.find((s) => s.id === id);
        if (!strike) return;
        const isSelected = selectedStrikeId === id;
        marker.setIcon(makeIcon(L, strike.accurate, isSelected));

        if (isSelected) {
          // Pan to the selected marker
          mapRef.current.panTo(marker.getLatLng(), { animate: true });
          marker.openPopup();
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStrikeId]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", background: "#e8e8e8" }}
      />
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeIcon(L: any, accurate: boolean, selected: boolean) {
  const size = selected ? 16 : accurate ? 10 : 8;
  const half = size / 2;
  const color = accurate ? "#ef4444" : "#d97706";
  const border = accurate ? "#fca5a5" : "#fcd34d";
  const glow = selected
    ? `0 0 0 3px ${color}55, 0 0 10px ${color}88`
    : `0 0 5px ${color}66`;

  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:${selected ? 3 : 2}px solid ${border};
      box-shadow:${glow};
      transition:all 0.15s ease;
      cursor:pointer;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

function buildPopup(strike: Strike): string {
  return `
    <div style="font-family:monospace;font-size:12px;line-height:1.7;min-width:190px;padding:2px 0">
      <div style="font-family:var(--font-display); font-weight:700;font-size:18px;margin-bottom:4px">${strike.name_fa || "—"}</div>
      <div style="color:#6b7280;margin-bottom:4px">${strike.strike_date ?? "unknown date"}</div>
      <div>
        <span style="
          display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:600;
          background:${strike.accurate ? "#fef2f2" : "#fffbeb"};
          color:${strike.accurate ? "#dc2626" : "#d97706"};
          border:1px solid ${strike.accurate ? "#fca5a5" : "#fcd34d"};
        ">
          ${strike.accurate ? "Confirmed" : "Pending"}
        </span>
        ${strike.district
          ? `<span style="margin-left:6px;color:#7c3aed;font-size:11px">${strike.district}</span>`
          : ""}
      </div>
      ${strike.status ? `<div style="color:#9ca3af;margin-top:4px;font-size:11px">${strike.status}</div>` : ""}
    </div>`;
}
