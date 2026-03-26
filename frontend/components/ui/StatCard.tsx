import { cn } from "@/lib/utils";

export type StatCardVariant = "default" | "confirmed" | "pending" | "today";

interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  variant?: StatCardVariant;
  isLoading?: boolean;
}

const variantStyles: Record<StatCardVariant, string> = {
  default: "border-paper-border",
  confirmed: "border-l-4 border-l-signal-green border-paper-border",
  pending: "border-l-4 border-l-signal-amber border-paper-border",
  today: "border-l-4 border-l-signal-red border-paper-border",
};

const variantValueStyles: Record<StatCardVariant, string> = {
  default: "text-ink",
  confirmed: "text-signal-green",
  pending: "text-signal-amber",
  today: "text-signal-red",
};

export default function StatCard({
  label,
  value,
  subtext,
  variant = "default",
  isLoading = false,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-paper-bright border rounded-sm p-5 min-w-[200px] flex-1",
        variantStyles[variant]
      )}
    >
      <p className="font-mono text-xs text-ink-muted tracking-wider uppercase mb-3">
        {label}
      </p>

      {isLoading ? (
        <div className="h-9 w-20 bg-paper-warm animate-pulse rounded" />
      ) : (
        <p
          className={cn(
            "font-display text-4xl font-bold leading-none mb-1",
            variantValueStyles[variant]
          )}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
      )}

      {subtext && (
        <p className="font-mono text-xs text-ink-faint mt-2">{subtext}</p>
      )}
    </div>
  );
}
