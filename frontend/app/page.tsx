"use client";

import { useState } from "react";
import HomeTab from "@/components/tabs/HomeTab";
import StrikeAnalysisTab from "@/components/tabs/StrikeAnalysisTab";
import OsintTab from "@/components/tabs/OsintTab";
import { cn } from "@/lib/utils";

type Tab = "home" | "strike-analysis" | "osint";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "strike-analysis", label: "Strike Analysis" },
  { id: "osint", label: "OSINT" },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      {/* ── Header ── */}
      <header className="border-b border-paper-border bg-paper-bright">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-end justify-between gap-8">
          {/* Masthead */}
          <div>
            <p className="font-mono text-s text-ink-muted tracking-widest uppercase mb-0.5">
              مهسا الرت — Intelligence Platform
            </p>
            <h1
              className="font-display text-3xl font-bold text-ink leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Shanpanman
            </h1>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 font-mono text-xs text-ink-muted">
            <span className="w-2 h-2 rounded-full bg-signal-red animate-pulse inline-block" />
            Live · Static mode
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="max-w-[1600px] mx-auto px-6">
          <div className="flex gap-0 border-t border-paper-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-5 py-3 text-sm font-mono tracking-wide transition-all duration-150 border-t-2 -mt-px",
                  activeTab === tab.id
                    ? "border-ink text-ink font-medium"
                    : "border-transparent text-ink-muted hover:text-ink hover:border-ink-faint"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* ── Tab Content ── */}
      <main className="flex-1">
        <div className={activeTab === "home" ? "block" : "hidden"}>
          <HomeTab />
        </div>
        <div className={activeTab === "strike-analysis" ? "block" : "hidden"}>
          <StrikeAnalysisTab />
        </div>
        <div className={activeTab === "osint" ? "block" : "hidden"}>
          <OsintTab />
        </div>
      </main>
      
      {/* ── Footer ── */}
      <footer className="border-t border-paper-border bg-paper-bright py-8">
        <div className="max-w-[1600px] mx-auto px-6 text-center">
          <p className="text-ink-muted text-sm font-body">
            If you have any requests for features to be added to the tool, please send an email to{' '}
            <a 
              href="mailto:nima.karshenas@gmail.com" 
              className="text-ink font-medium underline underline-offset-4 hover:text-signal-red transition-colors"
            >
              nima.karshenas@gmail.com
            </a>
          </p>
          <p className="text-ink-faint text-xs font-mono mt-2 uppercase tracking-wide">
            Describe your work, how it would help, and the feature you would like to be added.
          </p>
        </div>
      </footer>
    </div>
  );
}

