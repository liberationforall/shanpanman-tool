"use client";

import { useEffect, useRef } from "react";
import type { CitizenReport } from "@/lib/api";

interface ReportedStrikesMapProps {
  reports: CitizenReport[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onClearSelection?: () => void;
}

export default function ReportedStrikesMap({
  reports,
  selectedId,
  onSelect,
  onClearSelection,
}: ReportedStrikesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  // Init the map once
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    if (mapRef.current) return;

    let isCancelled = false;

    import("leaflet").then((L) => {
      if (isCancelled || mapRef.current) return;

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

      map.on("click", () => {
        onClearSelection?.();
      });

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);

      // Add a ResizeObserver to ensure map resizes correctly
      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      (mapRef.current as any)._resizeObserver = resizeObserver;
    });

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        if ((mapRef.current as any)._resizeObserver) {
          (mapRef.current as any)._resizeObserver.disconnect();
        }
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update background-click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = () => onClearSelection?.();
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [onClearSelection]);

  // Draw markers
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();

      reports.forEach((report) => {
        if (report.longitude == null || report.latitude == null) return;

        // If something is selected, only show the selected one.
        // Or we can draw them all and toggle opacity later, but showing only one marker is asked in requirements.
        if (selectedId && selectedId !== report.id) {
          return;
        }

        const isSelected = selectedId === report.id;
        const icon = makeIcon(L, isSelected);

        const marker = L.marker([report.latitude, report.longitude], { icon })
          .addTo(mapRef.current)
          .bindTooltip(`<div style="font-family:var(--font-display); font-size:16px; font-weight:600; padding:2px 4px">${report.name_fa || 'Unknown Location'}</div>${report.name_en ? `<div style="font-family:monospace; font-size:11px; color:#6b7280; padding:0 4px 2px">${report.name_en}</div>` : ''}`, { direction: 'top', offset: [0, -10] })
          .bindPopup(`
            <div style="font-family:monospace;font-size:12px;line-height:1.7;min-width:190px;padding:2px 0">
              <div style="font-family:var(--font-display); font-weight:700;font-size:18px;margin-bottom:2px">${report.name_fa || "—"}</div>
              ${report.name_en ? `<div style="font-family:monospace;font-size:11px;color:#6b7280;margin-bottom:4px">${report.name_en}</div>` : ""}
              <div style="color:#6b7280;margin-bottom:4px">${report.report_date ?? "unknown date"}</div>
            </div>
          `, { maxWidth: 260, autoPan: false });

        marker.on("click", (e: any) => {
          if (e.originalEvent) {
            L.DomEvent.stopPropagation(e.originalEvent);
          }
          onSelect?.(report.id);
        });

        markersRef.current.set(report.id, marker);
      });

      // Center on selection if one exists
      if (selectedId) {
        const marker = markersRef.current.get(selectedId);
        if (marker) {
          mapRef.current.setView(marker.getLatLng(), mapRef.current.getZoom(), { animate: true });
          marker.openPopup();
        }
      }
    });
  }, [reports, selectedId, onSelect]);


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

function makeIcon(L: any, selected: boolean) {
  const size = selected ? 16 : 10;
  const half = size / 2;
  const color = "#d97706";
  const border = "#fcd34d";
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
