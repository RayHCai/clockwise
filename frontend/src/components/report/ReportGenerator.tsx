"use client";

import { useEffect, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { ClinicalReport } from "./ClinicalReport";
import { uploadSessionArtifacts } from "@/lib/s3Upload";
import type {
  FusionResult,
  ReportNarrative,
  SpeechGraphResult,
} from "@/lib/types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface ReportGeneratorProps {
  fusionResult: FusionResult;
  graphData: SpeechGraphResult | null;
  clockDrawingSnapshot: string | null;
  observations: string[];
  transcript: string;
  audioBlob: Blob | null;
  videoBlob: Blob | null;
  sessionId: string;
  onComplete: (pdfUrl: string, uploaded: boolean) => void;
  onError: (error: string) => void;
}

type GenerationStep =
  | "narrative"
  | "rendering"
  | "uploading"
  | "done";

const stepLabels: Record<GenerationStep, string> = {
  narrative: "Generating clinical narrative...",
  rendering: "Rendering PDF report...",
  uploading: "Uploading session artifacts...",
  done: "Report ready!",
};

export function ReportGenerator({
  fusionResult,
  graphData,
  clockDrawingSnapshot,
  observations,
  transcript,
  audioBlob,
  videoBlob,
  sessionId,
  onComplete,
  onError,
}: ReportGeneratorProps) {
  const [step, setStep] = useState<GenerationStep>("narrative");
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    async function generate() {
      // Step 1: Generate clinical narrative
      setStep("narrative");
      let narrative: ReportNarrative;
      try {
        const res = await fetch(`${BACKEND_URL}/generate-report-narrative`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fusion_result: fusionResult,
            drawing_observations: observations,
            speech_metrics: graphData?.metrics ?? {},
            transcript,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        narrative = await res.json();
      } catch (err) {
        console.error("Narrative generation failed, using fallback:", err);
        narrative = {
          summary_sentences: [fusionResult.clinical_notes],
          drawing_findings: fusionResult.drawing_assessment,
          speech_findings: fusionResult.speech_assessment,
          recommendation: "Consider follow-up assessment.",
          graph_interpretation: "",
        };
      }

      // Step 2: Render PDF
      setStep("rendering");
      const pdfDoc = (
        <ClinicalReport
          fusionResult={fusionResult}
          graphData={graphData}
          clockDrawingSnapshot={clockDrawingSnapshot}
          observations={observations}
          narrative={narrative}
          sessionDate={new Date().toISOString().split("T")[0]}
        />
      );
      const blob = await pdf(pdfDoc).toBlob();
      const url = URL.createObjectURL(blob);

      // Step 3: Upload to S3 (skipped in dev)
      setStep("uploading");
      let uploaded = false;
      try {
        const result = await uploadSessionArtifacts(sessionId, {
          audioBlob,
          videoBlob,
          pdfBlob: blob,
        });
        uploaded = result.uploaded;
      } catch (err) {
        console.error("S3 upload failed:", err);
      }

      setStep("done");
      onComplete(url, uploaded);
    }

    generate().catch((err) => {
      console.error("Report generation failed:", err);
      onError(err instanceof Error ? err.message : "Report generation failed");
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
      <div className="card p-8 text-center max-w-sm">
        {/* Spinner */}
        <div className="mx-auto w-8 h-8 border-2 border-[var(--cw-border)] border-t-[var(--cw-accent)] rounded-full animate-spin mb-4" />
        <p className="text-sm text-[var(--cw-text-secondary)] font-medium">
          {stepLabels[step]}
        </p>
        <p className="text-[11px] text-[var(--cw-text-tertiary)] mt-2">
          This may take a few seconds
        </p>
      </div>
    </div>
  );
}
