"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ConversationProvider } from "@elevenlabs/react";
import VoiceAgent from "./VoiceAgent";
import CameraFeed, { type CameraFeedHandle } from "./CameraFeed";
import SpeechGraph from "./SpeechGraph";
import ScoresPanel from "./ScoresPanel";
import TranscriptPanel, { type TranscriptEntry } from "./TranscriptPanel";
import { ReportViewer } from "./report/ReportViewer";
import { useSpeechGraph } from "@/hooks/useSpeechGraph";
import { useMediaRecorders } from "@/hooks/useMediaRecorders";
import type { FusionResult, SessionState } from "@/lib/types";

// Dynamic import — React-PDF must not be SSR'd
const ReportGenerator = dynamic(
  () =>
    import("./report/ReportGenerator").then((m) => ({
      default: m.ReportGenerator,
    })),
  { ssr: false },
);

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function Dashboard() {
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [observations, setObservations] = useState<string[]>([]);
  const [fusionResult, setFusionResult] = useState<FusionResult | null>(null);
  const [fusionLoading, setFusionLoading] = useState(false);

  // Report-related state
  const [clockDrawingSnapshot, setClockDrawingSnapshot] = useState<string | null>(null);
  const [reportPdfUrl, setReportPdfUrl] = useState<string | null>(null);
  const [reportUploaded, setReportUploaded] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID().slice(0, 12));

  // Refs
  const patientSpeechRef = useRef("");
  const cameraRef = useRef<CameraFeedHandle>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Hooks
  const { graphData, analyze } = useSpeechGraph();
  const { startAudioRecording, startVideoRecording, stopAll } =
    useMediaRecorders();

  const handleTranscript = useCallback(
    (text: string, role: "user" | "agent") => {
      setTranscript((prev) => [...prev, { text, role, timestamp: Date.now() }]);

      if (role === "user") {
        patientSpeechRef.current += " " + text;
        analyze(patientSpeechRef.current.trim());
      }
    },
    [analyze],
  );

  const handleObservation = useCallback((text: string) => {
    setObservations((prev) => [...prev, text]);
  }, []);

  const handleSessionStart = useCallback(async () => {
    setSessionState("recording");

    // Start audio recording (separate from ElevenLabs)
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioStreamRef.current = audioStream;
      startAudioRecording(audioStream);
    } catch (err) {
      console.error("Failed to start audio recording:", err);
    }

    // Start video recording once camera stream is available
    // (small delay to let CameraFeed acquire the stream)
    setTimeout(() => {
      const videoStream = cameraRef.current?.getStream();
      if (videoStream) {
        startVideoRecording(videoStream);
      }
    }, 1000);
  }, [startAudioRecording, startVideoRecording]);

  const handleSessionEnd = useCallback(async () => {
    // CRITICAL: Capture frame and stop recorders BEFORE state changes
    // (CameraFeed deactivates when isActive becomes false)
    const snapshot = cameraRef.current?.captureFrame() ?? null;
    setClockDrawingSnapshot(snapshot);

    const { audioBlob: audio, videoBlob: video } = await stopAll();
    setAudioBlob(audio);
    setVideoBlob(video);

    // Stop the dedicated audio stream
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;

    // Auto-run fusion analysis
    setSessionState("analyzing");
    setFusionLoading(true);
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
      setSessionState("generating_report");
    } catch (err) {
      console.error("Fusion analysis failed:", err);
      setSessionState("idle");
    } finally {
      setFusionLoading(false);
    }
  }, [observations, graphData, stopAll]);

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

  const handleReportComplete = useCallback(
    (pdfUrl: string, uploaded: boolean) => {
      setReportPdfUrl(pdfUrl);
      setReportUploaded(uploaded);
      setSessionState("complete");
    },
    [],
  );

  const handleReportError = useCallback((error: string) => {
    console.error("Report generation failed:", error);
    setSessionState("complete");
  }, []);

  const handleNewSession = useCallback(() => {
    // Clean up previous PDF URL
    if (reportPdfUrl) URL.revokeObjectURL(reportPdfUrl);

    setSessionState("idle");
    setTranscript([]);
    setObservations([]);
    setFusionResult(null);
    setFusionLoading(false);
    setClockDrawingSnapshot(null);
    setReportPdfUrl(null);
    setReportUploaded(false);
    setAudioBlob(null);
    setVideoBlob(null);
    patientSpeechRef.current = "";
  }, [reportPdfUrl]);

  const isActive = sessionState === "recording";
  const latestObservation = observations[observations.length - 1] ?? "";

  return (
    <div className="h-screen flex flex-col bg-[var(--cw-bg-secondary)] relative">
      {/* Main Grid — full height, no nav */}
      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-3 p-3 min-h-0">
        {/* Top-Left: Camera + Voice */}
        <div className="card card-hover p-4 flex flex-col gap-3 overflow-hidden">
          <h3 className="text-[11px] font-medium text-[var(--cw-text-tertiary)] uppercase tracking-widest">
            Camera & Voice
          </h3>
          <CameraFeed
            ref={cameraRef}
            active={isActive}
            onObservation={handleObservation}
          />
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
              patientSpeechRef.current.trim().length > 0 ||
              observations.length > 0
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
                {graphData.metrics.N} nodes &middot; {graphData.metrics.E}{" "}
                edges
              </span>
            )}
          </div>
          <div className="h-[calc(100%-2rem)]">
            <SpeechGraph data={graphData} />
          </div>
        </div>
      </div>

      {/* Report Generation Overlay */}
      {sessionState === "generating_report" && fusionResult && (
        <ReportGenerator
          fusionResult={fusionResult}
          graphData={graphData}
          clockDrawingSnapshot={clockDrawingSnapshot}
          observations={observations}
          transcript={patientSpeechRef.current.trim()}
          audioBlob={audioBlob}
          videoBlob={videoBlob}
          sessionId={sessionId}
          onComplete={handleReportComplete}
          onError={handleReportError}
        />
      )}

      {/* Report Viewer Overlay */}
      {sessionState === "complete" && reportPdfUrl && (
        <ReportViewer
          pdfUrl={reportPdfUrl}
          uploaded={reportUploaded}
          onNewSession={handleNewSession}
        />
      )}
    </div>
  );
}
