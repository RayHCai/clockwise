"use client";

import type { FusionResult, SpeechGraphMetrics } from "@/lib/types";

interface ScoresPanelProps {
  fusionResult: FusionResult | null;
  speechMetrics: SpeechGraphMetrics | null;
  latestObservation: string;
  onRunFusion: () => void;
  fusionLoading: boolean;
  canRunFusion: boolean;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value < 33
      ? "bg-[var(--cw-risk-low)]"
      : value < 66
        ? "bg-[var(--cw-risk-moderate)]"
        : "bg-[var(--cw-risk-high)]";

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] text-[var(--cw-text-tertiary)] w-24 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-[var(--cw-surface-elevated)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-[var(--cw-text-secondary)] w-8 text-right tabular-nums">
        {value}
      </span>
    </div>
  );
}

export default function ScoresPanel({
  fusionResult,
  speechMetrics,
  latestObservation,
  onRunFusion,
  fusionLoading,
  canRunFusion,
}: ScoresPanelProps) {
  // No fusion result yet — show placeholder
  if (!fusionResult && !speechMetrics) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--cw-text-tertiary)] italic py-2">
        <svg
          className="w-4 h-4 text-[var(--cw-accent)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
        </svg>
        Scores after analysis
      </div>
    );
  }

  const riskColor = fusionResult
    ? fusionResult.risk_level === "low"
      ? "text-[var(--cw-risk-low)]"
      : fusionResult.risk_level === "moderate"
        ? "text-[var(--cw-risk-moderate)]"
        : "text-[var(--cw-risk-high)]"
    : "text-[var(--cw-text-tertiary)]";

  const riskBg = fusionResult
    ? fusionResult.risk_level === "low"
      ? "bg-[var(--cw-risk-low-muted)] text-[var(--cw-risk-low)]"
      : fusionResult.risk_level === "moderate"
        ? "bg-[var(--cw-risk-moderate-muted)] text-[var(--cw-risk-moderate)]"
        : "bg-[var(--cw-risk-high-muted)] text-[var(--cw-risk-high)]"
    : "";

  return (
    <div className="flex flex-col gap-4">
      {/* Speech Metrics summary */}
      {speechMetrics && (
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ["N", speechMetrics.N, "Unique words"],
              ["LSC", speechMetrics.LSC, "Largest strongly connected"],
              ["L1", speechMetrics.L1, "Self-loops"],
            ] as [string, number, string][]
          ).map(([key, val, tip]) => (
            <div
              key={key}
              className="bg-[var(--cw-bg)] rounded-lg p-2 text-center"
              title={tip}
            >
              <div className="text-sm font-bold text-[var(--cw-text-primary)] font-mono tabular-nums">
                {typeof val === "number" && val % 1 !== 0
                  ? val.toFixed(2)
                  : val}
              </div>
              <div className="text-[9px] text-[var(--cw-text-tertiary)] uppercase tracking-wider">
                {key}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fusion Results */}
      {fusionResult && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`text-3xl font-bold font-mono tabular-nums ${riskColor}`}
            >
              {fusionResult.composite_score}
            </div>
            <div>
              <div
                className={`text-xs font-semibold capitalize rounded-md px-2 py-0.5 inline-block ${riskBg}`}
              >
                {fusionResult.risk_level} Risk
              </div>
              <div className="text-[10px] text-[var(--cw-text-tertiary)] mt-0.5">
                Confidence: {fusionResult.confidence}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <ScoreBar
              label="Visuospatial"
              value={fusionResult.subscores.visuospatial}
            />
            <ScoreBar
              label="Executive"
              value={fusionResult.subscores.executive}
            />
            <ScoreBar
              label="Language"
              value={fusionResult.subscores.language}
            />
            <ScoreBar label="Motor" value={fusionResult.subscores.motor} />
          </div>
        </div>
      )}

      {/* Run Fusion Button */}
      {canRunFusion && (
        <button
          onClick={onRunFusion}
          disabled={fusionLoading}
          className="w-full px-3 py-2 bg-[var(--cw-accent)] text-white rounded-lg font-medium text-xs hover:bg-[var(--cw-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
        >
          {fusionLoading ? "Analyzing..." : "Run Fusion Analysis"}
        </button>
      )}
    </div>
  );
}
