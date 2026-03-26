export default function StrikeAnalysisTab() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col items-center justify-center text-center">
      <div className="border border-dashed border-paper-border rounded-sm p-12 max-w-md w-full">
        <p
          className="font-display text-2xl font-semibold text-ink mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Strike Analysis
        </p>
        <p className="font-mono text-xs text-ink-muted leading-relaxed">
          Advanced analytics — district-level density maps, target category
          breakdowns, damage cost estimates, and AI severity scoring.
        </p>
        <p className="font-mono text-xs text-ink-faint mt-4">
          Scheduled for v0.2
        </p>
      </div>
    </div>
  );
}
