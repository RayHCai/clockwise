"use client";

import { useCallback, useRef, useState } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import VoiceAgent from "./VoiceAgent";
import CameraFeed from "./CameraFeed";
import SpeechGraph from "./SpeechGraph";
import ScoresPanel from "./ScoresPanel";
import TranscriptPanel, { type TranscriptEntry } from "./TranscriptPanel";
import { useSpeechGraph } from "@/hooks/useSpeechGraph";
import type { FusionResult, SessionState } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function Dashboard() {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [observations, setObservations] = useState<string[]>([]);
  const [fusionResult, setFusionResult] = useState<FusionResult | null>(null);
  const [fusionLoading, setFusionLoading] = useState(false);

  // Accumulated patient speech for speech graph
  const patientSpeechRef = useRef("");

  const { graphData, analyze } = useSpeechGraph();

  const handleTranscript = useCallback(
    (text: string, role: "user" | "agent") => {
      setTranscript((prev) => [...prev, { text, role, timestamp: Date.now() }]);

      if (role === "user") {
        patientSpeechRef.current += " " + text;
        analyze(patientSpeechRef.current.trim());
      }
    },
    [analyze]
  );

  const handleObservation = useCallback((text: string) => {
    setObservations((prev) => [...prev, text]);
  }, []);

  const handleSessionStart = useCallback(() => {
    setSessionState("recording");
  }, []);

  const handleSessionEnd = useCallback(() => {
    setSessionState((prev) => (prev === "recording" ? "idle" : prev));
  }, []);

  const handleRunFusion = useCallback(async () => {
    if (!patientSpeechRef.current.trim() && observations.length === 0) return;

    setFusionLoading(true);
    setSessionState("analyzing");
    try {
      const res = await fetch(`${BACKEND_URL}/analyze-fusion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drawing_observations: observations,
          speech_metrics: graphData?.metrics ?? {},
          transcript: patientSpeechRef.current.trim(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FusionResult = await res.json();
      setFusionResult(data);
      setSessionState("complete");
    } catch (err) {
      console.error("Fusion analysis failed:", err);
      setSessionState("recording");
    } finally {
      setFusionLoading(false);
    }
  }, [observations, graphData]);

  const isActive = sessionState === "recording";
  const latestObservation = observations[observations.length - 1] ?? "";

  return (
    <div className="h-screen flex flex-col bg-[var(--cw-bg-secondary)]">
      {/* Main Grid — full height, no nav */}
      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-3 p-3 min-h-0">
        {/* Top-Left: Camera + Voice */}
        <div className="card card-hover p-4 flex flex-col gap-3 overflow-hidden">
          <h3 className="text-[11px] font-medium text-[var(--cw-text-tertiary)] uppercase tracking-widest">
            Camera & Voice
          </h3>
          <CameraFeed active={isActive} onObservation={handleObservation} />
          <ConversationProvider>
            <VoiceAgent
              onTranscript={handleTranscript}
              onSessionStart={handleSessionStart}
              onSessionEnd={handleSessionEnd}
            />
          </ConversationProvider>
        </div>

        {/* Top-Center: Transcript */}
        <div className="card card-hover p-4 flex flex-col overflow-hidden">
          <h3 className="text-[11px] font-medium text-[var(--cw-text-tertiary)] uppercase tracking-widest mb-2">
            Live Transcript
          </h3>
          <TranscriptPanel entries={transcript} />
        </div>

        {/* Right: Scores (spans 2 rows) */}
        <div className="row-span-2 card card-hover p-4 overflow-y-auto">
          <h3 className="text-[11px] font-medium text-[var(--cw-text-tertiary)] uppercase tracking-widest mb-3">
            Analysis
          </h3>
          <ScoresPanel
            fusionResult={fusionResult}
            speechMetrics={graphData?.metrics ?? null}
            latestObservation={latestObservation}
            onRunFusion={handleRunFusion}
            fusionLoading={fusionLoading}
            canRunFusion={
              patientSpeechRef.current.trim().length > 0 || observations.length > 0
            }
          />
        </div>

        {/* Bottom-Left spanning 2 cols: Speech Graph */}
        <div className="col-span-2 card card-hover overflow-hidden">
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <h3 className="text-[11px] font-medium text-[var(--cw-text-tertiary)] uppercase tracking-widest">
              Speech Graph
            </h3>
            {graphData && (
              <span className="text-[11px] text-[var(--cw-text-tertiary)] font-mono">
                {graphData.metrics.N} nodes &middot; {graphData.metrics.E} edges
              </span>
            )}
          </div>
          <div className="h-[calc(100%-2rem)]">
            <SpeechGraph data={graphData} />
          </div>
        </div>
      </div>
    </div>
  );
}
