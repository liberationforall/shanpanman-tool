"use client";

import { useState } from "react";
import type { CitizenReport } from "@/lib/api";
import { createClient } from "@/utils/supabase/client";

interface EvidenceSubmissionFormProps {
  selectedReport?: CitizenReport | null;
}

export default function EvidenceSubmissionForm({
  selectedReport,
}: EvidenceSubmissionFormProps) {
  const [status, setStatus] = useState<"IDLE" | "LOADING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedReport) return;

    setStatus("LOADING");
    setErrorMessage("");

    const target = e.target as HTMLFormElement;
    const formData = new FormData(target);
    const file = formData.get("evidence_image") as File;
    const evidenceDescription = formData.get("evidence_description") as string;
    const email = formData.get("email") as string;

    // Check for 50MB limit (50 * 1024 * 1024 bytes)
    const MAX_SIZE = 52428800;
    if (file && file.size > MAX_SIZE) {
      setStatus("ERROR");
      setErrorMessage("File size exceeds 50MB limit. Please provide a smaller image.");
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedReport.id}-${Date.now()}.${fileExt}`;
      const filePath = `submissions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('form-images')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { error: insertError } = await supabase
        .from('submissions')
        .insert([{
          strike_id: selectedReport.id,
          strike_public_id: selectedReport.publicId || null,
          strike_name: selectedReport.name_en || selectedReport.name_fa || "Unknown",
          strike_location: `${selectedReport.longitude},${selectedReport.latitude}`,
          strike_description: selectedReport.description_en || selectedReport.description_fa || null,
          evidence_description: evidenceDescription || null,
          image_path: filePath,
          email: email || null
        }]);

      if (insertError) {
        throw new Error(`Insert failed: ${insertError.message}`);
      }

      setStatus("SUCCESS");
      target.reset();
    } catch (err: any) {
      console.error(err);
      setStatus("ERROR");
      setErrorMessage(err.message || "An unexpected error occurred.");
    }
  };

  const isDisabled = !selectedReport || status === "LOADING" || status === "SUCCESS";

  return (
    <div className={`bg-paper-bright border border-paper-border rounded-sm p-6 ${!selectedReport ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
      <h3 className="font-display text-xl font-semibold text-ink mb-1" style={{ fontFamily: "var(--font-display)" }}>
        Submit Evidence
      </h3>
      <p className="font-mono text-xs text-ink-muted mb-6">
        {selectedReport
          ? `Attaching evidence for report ${selectedReport.publicId || selectedReport.id}`
          : "Select a report from the list or map to submit evidence"}
      </p>

      {status === "SUCCESS" ? (
        <div className="bg-signal-green/10 border border-signal-green text-signal-green p-4 rounded text-sm mb-4">
          Evidence submitted successfully. Thank you for your contribution.
          <button
            type="button"
            onClick={() => setStatus("IDLE")}
            className="ml-3 underline font-medium hover:text-green-800"
          >
            Submit another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs font-semibold text-ink-muted mb-1">
              Evidence Image (Required)
            </label>
            <input
              type="file"
              name="evidence_image"
              accept="image/jpeg, image/png, image/webp"
              required
              disabled={isDisabled}
              className="w-full text-sm font-mono text-ink-muted file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-semibold file:bg-paper-warm file:text-ink hover:file:bg-paper-border focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block font-mono text-xs font-semibold text-ink-muted mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              name="evidence_description"
              rows={4}
              disabled={isDisabled}
              placeholder="Provide context about the image..."
              className="w-full bg-transparent border border-paper-border rounded-sm px-3 py-2 text-sm font-mono text-ink focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-shadow resize-none"
            />
          </div>

          <div>
            <label className="block font-mono text-xs font-semibold text-ink-muted mb-1">
              Your Email (Optional)
            </label>
            <input
              type="email"
              name="email"
              disabled={isDisabled}
              placeholder="For follow-up questions"
              className="w-full bg-transparent border border-paper-border rounded-sm px-3 py-2 text-sm font-mono text-ink focus:border-ink focus:ring-1 focus:ring-ink outline-none transition-shadow"
            />
          </div>

          {status === "ERROR" && (
            <div className="text-signal-red text-xs font-mono mb-2">
              Error: {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isDisabled}
            className="w-full bg-ink text-paper py-2.5 rounded-sm font-mono text-sm font-semibold hover:bg-ink-muted focus:ring-2 focus:ring-offset-2 focus:ring-ink transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "LOADING" ? "Submitting..." : "Submit Evidence"}
          </button>
        </form>
      )}
    </div>
  );
}
