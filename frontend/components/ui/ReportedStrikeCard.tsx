"use client";

import { formatDate, cn } from "@/lib/utils";
import type { CitizenReport } from "@/lib/api";

interface ReportedStrikeCardProps {
  report: CitizenReport;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function ReportedStrikeCard({
  report,
  isSelected = false,
  onClick,
}: ReportedStrikeCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex-shrink-0 bg-paper-bright border rounded-sm overflow-hidden flex flex-col cursor-pointer transition-all duration-200",
        isSelected
          ? "border-signal-amber ring-1 ring-signal-amber bg-amber-50/10 shadow-sm"
          : "border-paper-border hover:border-paper-warm hover:bg-paper-warm/30"
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="font-mono text-xs text-ink-faint">
            {formatDate(report.report_date)}
          </span>
        </div>

        <p
          className="text-right font-display text-lg font-semibold text-ink leading-snug"
          dir="rtl"
          lang="fa"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {report.name_fa || "—"}
        </p>

        {report.description_fa && (
          <p
            className="text-right font-display text-sm text-ink-muted mt-2 leading-relaxed"
            dir="rtl"
            lang="fa"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {report.description_fa}
          </p>
        )}

        {(report.name_en || report.description_en) && (
          <div className="mt-3 space-y-1.5 border-t border-paper-warm/50 pt-2">
            {report.name_en && (
              <p className="font-mono text-xs font-semibold text-ink-muted tracking-wide">
                {report.name_en}
              </p>
            )}
            {report.description_en && (
              <p className="font-mono text-xs text-ink-muted leading-relaxed">
                {report.description_en}
              </p>
            )}
          </div>
        )}

        {report.latitude && report.longitude && (
          <p className="font-mono text-xs text-ink-faint mt-3 border-t border-paper-warm pt-2">
            {report.latitude.toFixed(4)}°N · {report.longitude.toFixed(4)}°E
          </p>
        )}
      </div>
    </div>
  );
}
