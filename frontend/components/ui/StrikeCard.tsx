"use client";

import TweetEmbed from "./TweetEmbed";
import { formatDate, extractTwitterUsername, cn } from "@/lib/utils";
import type { Strike } from "@/lib/api";

interface StrikeCardProps {
  strike: Strike;
}

function StatusBadge({ accurate }: { accurate: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 rounded-full border",
        accurate
          ? "border-signal-green text-signal-green bg-green-50"
          : "border-signal-amber text-signal-amber bg-amber-50"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          accurate ? "bg-signal-green" : "bg-signal-amber"
        )}
      />
      {accurate ? "Confirmed" : "Pending"}
    </span>
  );
}

export default function StrikeCard({ strike }: StrikeCardProps) {
  const username = extractTwitterUsername(strike.tweet_url);

  return (
    <div className="flex-shrink-0 w-[320px] bg-paper-bright border border-paper-border rounded-sm overflow-hidden flex flex-col">
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 border-b border-paper-warm">
        <div className="flex items-start justify-between gap-3 mb-2">
          <StatusBadge accurate={strike.accurate} />
          <span className="font-mono text-xs text-ink-faint">
            {formatDate(strike.strike_date)}
          </span>
        </div>

        {/* Target name in Farsi */}
        <p
          className="text-right font-display text-xl font-semibold text-ink leading-snug"
          dir="rtl"
          lang="fa"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {strike.name_fa || "—"}
        </p>

        {/* Coordinates */}
        {strike.latitude && strike.longitude && (
          <p className="font-mono text-xs text-ink-faint mt-1.5">
            {strike.latitude.toFixed(4)}°N · {strike.longitude.toFixed(4)}°E
          </p>
        )}

        {/* Source attribution */}
        {username && (
          <p className="font-mono text-xs text-ink-muted mt-1">
            via{" "}
            <a
              href={strike.tweet_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-ink transition-colors"
            >
              {username}
            </a>
          </p>
        )}
      </div>

      {/* Tweet embed or no-source notice */}
      <div className="px-4 py-3 flex-1 overflow-hidden">
        {strike.tweet_url && strike.tweet_id ? (
          <TweetEmbed tweetUrl={strike.tweet_url} tweetId={strike.tweet_id} />
        ) : (
          <div className="h-16 flex items-center justify-center border border-dashed border-paper-border rounded">
            <p className="font-mono text-xs text-ink-faint">No source linked</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 pt-1">
        <p className="font-mono text-xs text-ink-faint">
          ID:{" "}
          <span className="text-ink-muted">{strike.source_id ?? strike.id}</span>
        </p>
      </div>
    </div>
  );
}
