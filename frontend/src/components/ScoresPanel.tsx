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
      <span className="text-[11px] text-[var(--cw-text-tertiary)] w-28 shrink-0">
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
    <div className="flex flex-col gap-5">
      {/* Drawing Observation */}
      <div>
        <h4 className="text-[11px] font-medium text-[var(--cw-text-tertiary)] uppercase tracking-widest mb-2">
          Drawing Observation
        </h4>
        <p className={`text-sm leading-relaxed min-h-[2.5rem] ${latestObservation ? "text-[var(--cw-text-secondary)]" : "text-[var(--cw-text-tertiary)] italic"}`}>
          {latestObservation || "No observations yet — start session and point camera at drawing."}
        </p>
      </div>

      {/* Speech Metrics */}
      {speechMetrics && (
        <div>
          <h4 className="text-[11px] font-medium text-[var(--cw-text-tertiary)] uppercase tracking-widest mb-2.5">
            Speech Graph Metrics
          </h4>
          <div className="grid grid-cols-5 gap-2">
            {(
              [
                ["N", speechMetrics.N, "Unique words"],
                ["LSC", speechMetrics.LSC, "Largest strongly connected"],
                ["L1", speechMetrics.L1, "Self-loops"],
                ["L2", speechMetrics.L2, "2-cycles"],
                ["L3", speechMetrics.L3, "3-cycles"],
                ["PE", speechMetrics.PE, "Parallel edges"],
                ["LCC", speechMetrics.LCC, "Largest connected"],
                ["E", speechMetrics.E, "Total edges"],
                ["ATD", speechMetrics.ATD, "Avg degree"],
                ["Den", speechMetrics.density, "Density"],
              ] as [string, number, string][]
            ).map(([key, val, tip]) => (
              <div
                key={key}
                className="bg-[var(--cw-bg-secondary)] rounded-lg p-2.5 text-center border border-[var(--cw-border)] hover:border-[var(--cw-border-hover)] transition-colors duration-150"
                title={tip}
              >
                <div className="text-lg font-bold text-[var(--cw-text-primary)] font-mono tabular-nums">
                  {typeof val === "number" && val % 1 !== 0 ? val.toFixed(2) : val}
                </div>
                <div className="text-[9px] text-[var(--cw-text-tertiary)] uppercase tracking-wider mt-0.5">
                  {key}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fusion Results */}
      {fusionResult && (
        <div>
          <h4 className="text-[11px] font-medium text-[var(--cw-text-tertiary)] uppercase tracking-widest mb-3">
            Cognitive Risk Assessment
          </h4>
          <div className="flex items-center gap-4 mb-4">
            <div className={`text-4xl font-bold font-mono tabular-nums ${riskColor}`}>
              {fusionResult.composite_score}
            </div>
            <div>
              <div className={`text-sm font-semibold capitalize rounded-md px-2.5 py-0.5 inline-block ${riskBg}`}>
                {fusionResult.risk_level} Risk
              </div>
              <div className="text-[11px] text-[var(--cw-text-tertiary)] mt-1">
                Confidence: {fusionResult.confidence}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <ScoreBar label="Visuospatial" value={fusionResult.subscores.visuospatial} />
            <ScoreBar label="Executive" value={fusionResult.subscores.executive} />
            <ScoreBar label="Language" value={fusionResult.subscores.language} />
            <ScoreBar label="Motor" value={fusionResult.subscores.motor} />
          </div>
          <p className="text-xs text-[var(--cw-text-tertiary)] mt-4 leading-relaxed">
            {fusionResult.clinical_notes}
          </p>
        </div>
      )}

      {/* Run Fusion Button */}
      <button
        onClick={onRunFusion}
        disabled={!canRunFusion || fusionLoading}
        className="w-full px-4 py-2.5 bg-[var(--cw-accent)] text-white rounded-lg font-medium text-sm hover:bg-[var(--cw-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
      >
        {fusionLoading ? "Analyzing..." : "Run Fusion Analysis"}
      </button>
    </div>
  );
}
