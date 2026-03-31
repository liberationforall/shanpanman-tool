"use client";

import { useEffect, useRef } from "react";
import ReportedStrikeCard from "./ReportedStrikeCard";
import type { CitizenReport } from "@/lib/api";

interface ReportedStrikesListProps {
  reports: CitizenReport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ReportedStrikesList({
  reports,
  selectedId,
  onSelect,
}: ReportedStrikesListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when selected from map
  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    const cardElement = document.getElementById(`report-card-${selectedId}`);
    if (cardElement) {
      scrollRef.current.scrollTo({
        top: cardElement.offsetTop - scrollRef.current.offsetTop - 16,
        behavior: "smooth",
      });
    }
  }, [selectedId]);

  if (reports.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-ink-muted bg-paper-bright border border-dashed rounded-sm">
        <p className="font-mono text-xs">No citizen reports available.</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-col gap-4 overflow-y-auto w-full h-full pb-12 pr-2 custom-scrollbar"
    >
      {reports.map((report) => (
        <div key={report.id} id={`report-card-${report.id}`}>
          <ReportedStrikeCard
            report={report}
            isSelected={selectedId === report.id}
            onClick={() => onSelect(report.id)}
          />
        </div>
      ))}
      {/* Spacer to prevent cut-off at bottom */}
    </div>
  );
}
