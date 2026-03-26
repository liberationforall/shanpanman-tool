"use client";

import { useRef } from "react";
import StrikeCard from "./StrikeCard";
import { cn, formatDateShort } from "@/lib/utils";
import type { Strike } from "@/lib/api";

interface StrikeCardListProps {
  strikes: Strike[];
  selectedDate: string | null;
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[320px] bg-paper-bright border border-paper-border rounded-sm p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-5 w-20 bg-paper-warm rounded-full" />
        <div className="h-4 w-16 bg-paper-warm rounded" />
      </div>
      <div className="h-5 w-full bg-paper-warm rounded mb-2" />
      <div className="h-4 w-28 bg-paper-warm rounded mb-4" />
      <div className="h-32 w-full bg-paper-warm rounded" />
    </div>
  );
}

export default function StrikeCardList({
  strikes,
  selectedDate,
  isLoading = false,
}: StrikeCardListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "right" ? 340 : -340,
      behavior: "smooth",
    });
  };

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            className="font-display text-lg font-semibold text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Strike Reports
          </h2>
          <p className="font-mono text-xs text-ink-muted mt-0.5">
            {selectedDate
              ? `Showing strikes for ${formatDateShort(selectedDate)}`
              : `All ${strikes.length} recorded strikes`}
          </p>
        </div>

        {/* Scroll controls */}
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="w-8 h-8 flex items-center justify-center border border-paper-border rounded-sm text-ink-muted hover:text-ink hover:border-ink-muted transition-colors font-mono text-sm"
          >
            ‹
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="w-8 h-8 flex items-center justify-center border border-paper-border rounded-sm text-ink-muted hover:text-ink hover:border-ink-muted transition-colors font-mono text-sm"
          >
            ›
          </button>
        </div>
      </div>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-4 overflow-x-auto pb-4 no-scrollbar",
          "scroll-smooth"
        )}
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : strikes.length === 0 ? (
          <div className="w-full py-12 flex items-center justify-center border border-dashed border-paper-border rounded-sm">
            <p className="font-mono text-sm text-ink-faint">
              No strikes found for the selected date
            </p>
          </div>
        ) : (
          strikes.map((strike) => (
            <StrikeCard key={strike.id} strike={strike} />
          ))
        )}
      </div>
    </section>
  );
}
