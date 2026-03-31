"use client";

import { useEffect, useState } from "react";
import ReportedStrikesList from "../ui/ReportedStrikesList";
import ReportedStrikesMap from "../ui/ReportedStrikesMap";
import EvidenceSubmissionForm from "../ui/EvidenceSubmissionForm";
import { api, CitizenReport } from "@/lib/api";

export default function OsintTab() {
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStrikeId, setSelectedStrikeId] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await api.osint.citizenReports();
        setReports(res.data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load OSINT data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSelectStrike = (id: string) => {
    setSelectedStrikeId((prev) => (prev === id ? null : id));
  };

  const handleClearSelection = () => {
    setSelectedStrikeId(null);
  };

  const selectedReport = reports.find((r) => r.id === selectedStrikeId) || null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="font-mono text-sm text-ink-muted animate-pulse">
          Loading OSINT database...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="font-mono text-sm text-signal-red">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 mb-24 min-h-[calc(100vh-140px)] flex flex-col gap-6">

      <div className="flex flex-col lg:flex-row gap-2 h-full flex-1">

        {/* Left Half: List + Form */}
        <div className="w-full lg:w-1/2 shrink-0 flex flex-col h-[calc(100vh-140px)]">
          {/* List Area */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-[450px]">
            <h2 className="font-display font-semibold text-xl mb-4 text-ink flex items-center justify-between max-w-2xl">
              Unconfirmed Reports
              <span className="bg-paper-warm text-ink-muted text-xs px-2 py-0.5 rounded-full font-mono">
                {reports.length}
              </span>
            </h2>
            <div className="flex-1 h-full w-full max-w-2xl">
              <ReportedStrikesList
                reports={reports}
                selectedId={selectedStrikeId}
                onSelect={handleSelectStrike}
              />
            </div>
          </div>

          {/* Form Area */}
          <div className="w-full max-w-2xl border-t border-paper-warm pt-8 mt-6 shrink-0">
            <EvidenceSubmissionForm selectedReport={selectedReport} />
          </div>
        </div>

        {/* Right Half: Map */}
        <div className="w-full md:w-1/2 h-[calc(100vh-140px)] rounded-sm overflow-hidden border border-paper-border shadow-sm flex-1">
          <ReportedStrikesMap
            reports={reports}
            selectedId={selectedStrikeId}
            onSelect={handleSelectStrike}
            onClearSelection={handleClearSelection}
          />
        </div>

      </div>
    </div>
  );
}
