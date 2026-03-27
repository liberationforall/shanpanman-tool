"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { Strike, StrikeStats, TimelinePoint } from "@/lib/api";

interface UseStrikesReturn {
  strikes: Strike[];
  stats: StrikeStats | null;
  timeline: TimelinePoint[];
  // Date selection (driven by timeline chart)
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  // Map point selection
  selectedStrikeId: string | null;
  setSelectedStrikeId: (id: string | null) => void;
  // What the map should display (date-filtered)
  mapStrikes: Strike[];
  // What the card list should display (date-filtered, or single if map point clicked)
  displayedStrikes: Strike[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  tehranOnly: boolean;
  setTehranOnly: (v: boolean) => void;
}

export function useStrikes(): UseStrikesReturn {
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [stats, setStats] = useState<StrikeStats | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStrikeId, setSelectedStrikeId] = useState<string | null>(null);
  const [tehranOnly, setTehranOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = tehranOnly ? { tehran_only: true } : undefined;
      const [strikesRes, statsRes, timelineRes] = await Promise.all([
        api.strikes.list(params),
        api.strikes.stats(params),
        api.strikes.timeline(params),
      ]);
      setStrikes(strikesRes.data);
      setStats(statsRes);
      setTimeline(timelineRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [tehranOnly]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Clear strike selection whenever the date filter changes
  useEffect(() => {
    setSelectedStrikeId(null);
  }, [selectedDate]);

  // Clear date filter whenever a map point is selected
  const handleSetSelectedStrikeId = useCallback((id: string | null) => {
    setSelectedStrikeId(id);
  }, []);

  // Map always shows the date-filtered set (or all if no date selected)
  const mapStrikes = selectedDate
    ? strikes.filter((s) => s.strike_date === selectedDate)
    : strikes;

  // Cards show the single clicked strike, or the date-filtered set
  const displayedStrikes = selectedStrikeId
    ? strikes.filter((s) => s.id === selectedStrikeId)
    : mapStrikes;

  return {
    strikes,
    stats,
    timeline,
    selectedDate,
    setSelectedDate,
    selectedStrikeId,
    setSelectedStrikeId: handleSetSelectedStrikeId,
    mapStrikes,
    displayedStrikes,
    isLoading,
    error,
    refresh: fetchAll,
    tehranOnly,
    setTehranOnly,
  };
}
