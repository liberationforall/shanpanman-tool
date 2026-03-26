export default function OsintTab() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center justify-center text-center">
      <div className="border border-dashed border-paper-border rounded-sm p-12 max-w-md w-full">
        <p
          className="font-display text-2xl font-semibold text-ink mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          OSINT Portal
        </p>
        <p className="font-mono text-xs text-ink-muted leading-relaxed">
          Citizen contribution portal with tiered trust levels, cross-reference
          engine, and image evidence pipeline.
        </p>
        <p className="font-mono text-xs text-ink-faint mt-4">
          Scheduled for v0.3
        </p>
      </div>
    </div>
  );
}
