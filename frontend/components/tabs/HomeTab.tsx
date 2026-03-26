"use client";

import dynamic from "next/dynamic";
import { useStrikes } from "@/hooks/useStrikes";
import StatCard from "@/components/ui/StatCard";
import StrikeTimeline from "@/components/charts/StrikeTimeline";
import StrikeCardList from "@/components/ui/StrikeCardList";
import type { Strike } from "@/lib/api";

// Load map only client-side — Leaflet touches `window`
const StrikeMap = dynamic(() => import("@/components/ui/StrikeMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-paper-bright border border-paper-border rounded-sm flex items-center justify-center">
      <p className="font-mono text-xs text-ink-faint animate-pulse">
        Loading map…
      </p>
    </div>
  ),
});

export default function HomeTab() {
  const {
    stats,
    timeline,
    mapStrikes,
    displayedStrikes,
    selectedDate,
    setSelectedDate,
    selectedStrikeId,
    setSelectedStrikeId,
    isLoading,
    error,
    tehranOnly,
    setTehranOnly,
  } = useStrikes();

  if (error) {
    return (
      <div className="max-w-8xl mx-auto px-6 py-16 text-center">
        <p className="font-mono text-sm text-signal-red mb-2">
          Failed to load data
        </p>
        <p className="font-mono text-xs text-ink-muted">{error}</p>
        <p className="font-mono text-xs text-ink-faint mt-4">
          Ensure the FastAPI backend is running on{" "}
          <span className="text-ink">localhost:8000</span>
        </p>
      </div>
    );
  }

  const handleSelectStrike = (strike: Strike) => {
    setSelectedStrikeId(
      selectedStrikeId === strike.id ? null : strike.id
    );
  };

  const handleSelectDate = (date: string | null) => {
    setSelectedDate(date);
  };

  // Active filter description shown below the map
  const activeFilter = selectedStrikeId
    ? "Showing 1 selected strike"
    : selectedDate
    ? `Showing strikes for ${selectedDate}`
    : null;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8 animate-fade-in">

      {/* ── Tehran toggle ── */}
      <div className="flex items-center gap-3">
        <button
          id="tehran-only-toggle"
          role="switch"
          aria-checked={tehranOnly}
          onClick={() => setTehranOnly(!tehranOnly)}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-red"
          style={{
            background: tehranOnly ? "#dc2626" : "var(--color-paper-border, #ccc)",
          }}
        >
          <span
            className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
            style={{ transform: tehranOnly ? "translateX(22px)" : "translateX(4px)" }}
          />
        </button>
        <span className="font-mono text-xs text-ink-muted uppercase tracking-widest select-none">
          Tehran strikes only
        </span>
      </div>

      {/* ── Two-column upper area ── */}
      <div className="flex gap-6" style={{ minHeight: "500px" }}>

        {/* LEFT: stat cards + timeline */}
        <div className="flex flex-col gap-6 min-w-0 flex-1">

          {/* Stat cards */}
          <section>
            <p className="font-mono text-xs text-ink-faint uppercase tracking-widest mb-4">
              Situation Overview
            </p>
            <div className="flex gap-4 flex-wrap">
              <StatCard
                label="Confirmed Strikes (total)"
                value={isLoading ? "—" : (stats?.total_confirmed ?? 0)}
                subtext="Verified via geolocated source"
                variant="confirmed"
                isLoading={isLoading}
              />
              <StatCard
                label="Confirmed Today"
                value={isLoading ? "—" : (stats?.confirmed_today ?? 0)}
                subtext="Since 00:00 UTC"
                variant="today"
                isLoading={isLoading}
              />
              <StatCard
                label="Pending Confirmation"
                value={isLoading ? "—" : (stats?.pending_confirmation ?? 0)}
                subtext="Awaiting geolocated verification"
                variant="pending"
                isLoading={isLoading}
              />
            </div>
          </section>

          {/* Timeline chart */}
          <section className="flex-1">
            <p className="font-mono text-xs text-ink-faint uppercase tracking-widest mb-4">
              Temporal Distribution
              {selectedDate && (
                <button
                  onClick={() => handleSelectDate(null)}
                  className="ml-3 normal-case text-ink-muted hover:text-ink border border-paper-border px-2 py-0.5 rounded-sm transition-colors"
                  style={{ fontSize: "0.65rem" }}
                >
                  ✕ clear date
                </button>
              )}
            </p>
            {isLoading ? (
              <div className="bg-paper-bright border border-paper-border rounded-sm p-6 h-full">
                <div className="h-6 w-40 bg-paper-warm rounded animate-pulse mb-6" />
                <div className="h-48 w-full bg-paper-warm rounded animate-pulse" />
              </div>
            ) : (
              <StrikeTimeline
                data={timeline}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
              />
            )}
          </section>
        </div>

        {/* RIGHT: map */}
        <div className="flex flex-col min-w-0 flex-1">
          <p className="font-mono text-xs text-ink-faint uppercase tracking-widest mb-4">
            Strike Map
          </p>
          <div
            className="flex-1 rounded-sm overflow-hidden border border-paper-border"
            style={{ minHeight: "420px" }}
          >
            <StrikeMap
              strikes={isLoading ? [] : mapStrikes}
              selectedStrikeId={selectedStrikeId}
              onSelectStrike={handleSelectStrike}
              onClearSelection={() => setSelectedStrikeId(null)}
            />
          </div>
          {/* Legend + active filter hint */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-5">
              <span className="flex items-center gap-2 font-mono text-xs text-ink-muted">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
                Confirmed
              </span>
              <span className="flex items-center gap-2 font-mono text-xs text-ink-muted">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-600 shadow-sm" />
                Pending
              </span>
            </div>
            {activeFilter && (
              <span className="font-mono text-xs text-ink-muted italic">
                {activeFilter}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <hr className="border-paper-border" />

      {/* ── Strike cards (full width) ── */}
      <StrikeCardList
        strikes={displayedStrikes}
        selectedDate={selectedDate}
        isLoading={isLoading}
      />
    </div>
  );
}
