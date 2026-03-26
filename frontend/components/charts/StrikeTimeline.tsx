"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { formatDateShort } from "@/lib/utils";
import type { TimelinePoint } from "@/lib/api";

interface StrikeTimelineProps {
  data: TimelinePoint[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

// Custom dot — larger + filled when selected
const CustomDot = (props: {
  cx?: number;
  cy?: number;
  payload?: TimelinePoint;
  selectedDate: string | null;
  dataKey: string;
}) => {
  const { cx, cy, payload, selectedDate, dataKey } = props;
  if (!cx || !cy || !payload) return null;
  const isSelected = payload.date === selectedDate;
  const isConfirmed = dataKey === "confirmed";
  const isTotal = dataKey === "total";

  let fill = "#d4820a";
  if (isConfirmed) fill = "#2d6a4f";
  if (isTotal) fill = "#0f0f0f";

  return (
    <circle
      cx={cx}
      cy={cy}
      r={isSelected ? 6 : 4}
      fill={fill}
      fillOpacity={isTotal ? 0.5 : 1}
      stroke={isSelected ? "#0f0f0f" : "transparent"}
      strokeWidth={isSelected ? 2 : 0}
      style={{ cursor: "pointer" }}
    />
  );
};

// Custom tooltip
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-paper-bright border border-paper-border shadow-md px-4 py-3 text-sm">
      <p
        className="font-mono text-xs text-ink-muted mb-2 tracking-wide"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {label}
      </p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="font-mono text-xs"
          style={{ color: entry.color, fontFamily: "var(--font-mono)" }}
        >
          {entry.dataKey === "confirmed" ? "Confirmed" : entry.dataKey === "pending" ? "Pending" : "Total"}:{" "}
          <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

import { useMemo } from "react";

export default function StrikeTimeline({
  data,
  selectedDate,
  onSelectDate,
}: StrikeTimelineProps) {
  const handleClick = (point: { activePayload?: { payload: TimelinePoint }[] }) => {
    const date = point?.activePayload?.[0]?.payload?.date;
    if (!date) return;
    onSelectDate(selectedDate === date ? null : date);
  };

  const formattedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      label: formatDateShort(d.date),
      total: d.confirmed + d.pending,
    }));
  }, [data]);

  return (
    <div className="bg-paper-bright border border-paper-border rounded-sm p-6">
      {/* Header row */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2
            className="font-display text-lg font-semibold text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Strike Frequency
          </h2>
          <p className="font-mono text-xs text-ink-muted mt-0.5">
            Daily confirmed &amp; pending reports
            {selectedDate && (
              <span className="ml-2 text-ink">
                · Filtered to{" "}
                <span className="font-medium">{formatDateShort(selectedDate)}</span>
                {" — "}
                <button
                  onClick={() => onSelectDate(null)}
                  className="underline text-ink-muted hover:text-ink"
                >
                  clear
                </button>
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-4 font-mono text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-signal-green inline-block" />
            Confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-signal-amber inline-block" />
            Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-ink inline-block opacity-50 border-t border-dashed border-ink" />
            Total
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center font-mono text-xs text-ink-faint">
          No timeline data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(500, data.length * 80) }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={formattedData}
                margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                onClick={handleClick}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#d8d2c8"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "#5c5c5c" }}
                  axisLine={{ stroke: "#d8d2c8" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "#5c5c5c" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<CustomTooltip />} />

                {selectedDate && (
                  <ReferenceLine
                    x={formatDateShort(selectedDate)}
                    stroke="#0f0f0f"
                    strokeDasharray="4 2"
                    strokeWidth={1}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0f0f0f"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  isAnimationActive={false}
                  dot={(props) => (
                    <CustomDot
                      key={props.index}
                      {...props}
                      selectedDate={selectedDate}
                      dataKey="total"
                    />
                  )}
                  activeDot={{ r: 7, fill: "#0f0f0f", fillOpacity: 0.5, stroke: "#0f0f0f", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="confirmed"
                  stroke="#2d6a4f"
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={(props) => (
                    <CustomDot
                      key={props.index}
                      {...props}
                      selectedDate={selectedDate}
                      dataKey="confirmed"
                    />
                  )}
                  activeDot={{ r: 7, fill: "#2d6a4f", stroke: "#0f0f0f", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="pending"
                  stroke="#d4820a"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  isAnimationActive={false}
                  dot={(props) => (
                    <CustomDot
                      key={props.index}
                      {...props}
                      selectedDate={selectedDate}
                      dataKey="pending"
                    />
                  )}
                  activeDot={{ r: 7, fill: "#d4820a", stroke: "#0f0f0f", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <p className="font-mono text-xs text-ink-faint mt-4">
        Click any point to filter strike cards below by that date
      </p>
    </div>
  );
}
