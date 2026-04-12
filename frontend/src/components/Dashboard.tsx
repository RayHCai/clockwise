"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
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
  const [activeTab, setActiveTab] = useState<"agent" | "transcript">("agent");
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

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioStreamRef.current = audioStream;
      startAudioRecording(audioStream);
    } catch (err) {
      console.error("Failed to start audio recording:", err);
    }

    setTimeout(() => {
      const videoStream = cameraRef.current?.getStream();
      if (videoStream) {
        startVideoRecording(videoStream);
      }
    }, 1000);
  }, [startAudioRecording, startVideoRecording]);

  const handleSessionEnd = useCallback(async () => {
    const snapshot = cameraRef.current?.captureFrame() ?? null;
    setClockDrawingSnapshot(snapshot);

    const { audioBlob: audio, videoBlob: video } = await stopAll();
    setAudioBlob(audio);
    setVideoBlob(video);

    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;

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
    <div className="h-screen flex flex-col bg-[var(--cw-bg)]">
      {/* ─── Top Nav Bar ─── */}
      <header className="flex items-center justify-between px-6 py-3 bg-[var(--cw-surface)] border-b border-[var(--cw-border)]">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="ClockWise"
            width={160}
            height={160}
            className="h-10 w-auto max-w-[140px] object-contain object-left"
            priority
          />
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[var(--cw-text-primary)]">
              ClockWise
            </span>
            <span className="text-xs font-medium text-[var(--cw-text-tertiary)] uppercase tracking-widest">
              Cognitive Screen
            </span>
          </div>
        </div>

        <ConversationProvider>
          <VoiceAgent
            onTranscript={handleTranscript}
            onSessionStart={handleSessionStart}
            onSessionEnd={handleSessionEnd}
            isActive={isActive}
          />
        </ConversationProvider>
      </header>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex gap-4 p-4 min-h-0">
        {/* ─── Left Sidebar ─── */}
        <div className="w-80 shrink-0 flex flex-col gap-4 min-h-0">
          {/* Agent / Transcript Tabs */}
          <div className="card flex-1 flex flex-col min-h-0">
            {/* Tab bar */}
            <div className="flex border-b border-[var(--cw-border)]">
              <button
                onClick={() => setActiveTab("agent")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === "agent"
                    ? "text-[var(--cw-accent)] border-b-2 border-[var(--cw-accent)]"
                    : "text-[var(--cw-text-tertiary)] hover:text-[var(--cw-text-secondary)]"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Agent
              </button>
              <button
                onClick={() => setActiveTab("transcript")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === "transcript"
                    ? "text-[var(--cw-accent)] border-b-2 border-[var(--cw-accent)]"
                    : "text-[var(--cw-text-tertiary)] hover:text-[var(--cw-text-secondary)]"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                Transcript
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {activeTab === "agent" ? (
                <AgentMessages transcript={transcript} />
              ) : (
                <TranscriptPanel entries={transcript} />
              )}
            </div>
          </div>

          {/* Analysis Panel */}
          <div className="card p-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-[var(--cw-text-primary)] uppercase tracking-wider mb-3">
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
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
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

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <svg
              className="w-4 h-4 text-amber-500 mt-0.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-amber-800 leading-relaxed">
              Screening tool only — always consult a healthcare professional.
            </p>
          </div>
        </div>

        {/* ─── Center: Camera Feed ─── */}
        <div className="flex-1 min-h-0">
          <CameraFeed ref={cameraRef} active={isActive} onObservation={handleObservation} />
        </div>

        {/* ─── Right: Speech Graph ─── */}
        <div className="w-96 shrink-0 card flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-[var(--cw-text-primary)] uppercase tracking-wider">
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Speech Graph
            </h3>
            {graphData && (
              <span className="text-xs text-[var(--cw-text-tertiary)] font-mono">
                <span className="text-[var(--cw-accent)] font-semibold">
                  {graphData.metrics.N}
                </span>{" "}
                nodes{" "}
                <span className="text-[var(--cw-accent)] font-semibold ml-2">
                  {graphData.metrics.E}
                </span>{" "}
                edges
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <SpeechGraph data={graphData} />
          </div>
          {/* Legend */}
          <div className="px-4 py-3 border-t border-[var(--cw-border)] flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-[var(--cw-accent)] rounded" />
              <span className="text-[10px] text-[var(--cw-text-tertiary)]">
                single
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-amber-400 rounded" />
              <span className="text-[10px] text-[var(--cw-text-tertiary)]">
                repeated
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[var(--cw-accent)] rounded-full" />
              <span className="text-[10px] text-[var(--cw-text-tertiary)]">
                frequent
              </span>
            </div>
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

/* ─── Agent Messages sub-component ─── */

function AgentMessages({ transcript }: { transcript: TranscriptEntry[] }) {
  const agentMessages = transcript.filter((e) => e.role === "agent");

  if (agentMessages.length === 0) {
    return (
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[var(--cw-accent)]" />
            <span className="text-xs font-semibold text-[var(--cw-accent)]">
              ClockWise
            </span>
          </div>
          <div className="bg-[var(--cw-accent-light)] rounded-lg rounded-tl-none px-4 py-3 text-sm text-[var(--cw-text-primary)] leading-relaxed">
            Hello! I&apos;m ClockWise. Let&apos;s do a simple drawing exercise
            together — nothing stressful.
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[var(--cw-accent)]" />
            <span className="text-xs font-semibold text-[var(--cw-accent)]">
              ClockWise
            </span>
          </div>
          <div className="bg-[var(--cw-accent-light)] rounded-lg rounded-tl-none px-4 py-3 text-sm text-[var(--cw-text-primary)] leading-relaxed">
            Grab a blank piece of paper and a pen. Take your time.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {agentMessages.map((entry, i) => (
        <div key={i} className="animate-[fade-in-up_0.3s_ease-out]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[var(--cw-accent)]" />
            <span className="text-xs font-semibold text-[var(--cw-accent)]">
              ClockWise
            </span>
          </div>
          <div className="bg-[var(--cw-accent-light)] rounded-lg rounded-tl-none px-4 py-3 text-sm text-[var(--cw-text-primary)] leading-relaxed">
            {entry.text}
          </div>
        </div>
      ))}
    </div>
  );
}
