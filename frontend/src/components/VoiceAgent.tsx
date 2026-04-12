"use client";

import { useCallback, useEffect, useRef } from "react";
import { useConversation } from "@elevenlabs/react";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!;

type AgentStatus = "idle" | "starting" | "listening" | "speaking";

interface VoiceAgentProps {
  onTranscript: (text: string, role: "user" | "agent") => void;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
  disabled?: boolean;
}

export default function VoiceAgent({
  onTranscript,
  onSessionStart,
  onSessionEnd,
  disabled,
}: VoiceAgentProps) {
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const conversation = useConversation({
    onMessage: useCallback((message: { source: string; message: string }) => {
      if (message.source === "user") {
        onTranscriptRef.current(message.message, "user");
      } else if (message.source === "ai") {
        onTranscriptRef.current(message.message, "agent");
      }
    }, []),
  });

  const isConnected = conversation.status === "connected";

  const status: AgentStatus =
    conversation.status === "connecting"
      ? "starting"
      : conversation.status === "connected"
        ? conversation.isSpeaking
          ? "speaking"
          : "listening"
        : "idle";

  const handleStart = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      onSessionStart?.();
      await conversation.startSession({ agentId: AGENT_ID });
    } catch (err) {
      console.error("Failed to start ElevenLabs session:", err);
      onSessionEnd?.();
    }
  }, [conversation, onSessionStart, onSessionEnd]);

  const handleStop = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error("Failed to end ElevenLabs session:", err);
    } finally {
      onSessionEnd?.();
    }
  }, [conversation, onSessionEnd]);

  useEffect(() => {
    return () => {
      if (conversation.status === "connected") {
        try { conversation.endSession(); } catch {}
      }
    };
  }, [conversation]);

  const statusLabel: Record<AgentStatus, string> = {
    idle: "Ready",
    starting: "Connecting...",
    listening: "Listening",
    speaking: "Speaking",
  };

  // Orb visual states — UT burnt orange theme
  const orbStyle: Record<AgentStatus, string> = {
    idle: "bg-[var(--cw-surface-elevated)] border border-[var(--cw-border)]",
    starting:
      "bg-orange-50 border border-orange-200 animate-[orb-breathe_2s_ease-in-out_infinite]",
    listening:
      "bg-orange-50 border border-orange-300 animate-[orb-breathe_1.5s_ease-in-out_infinite] shadow-[0_0_20px_rgba(191,87,0,0.15)]",
    speaking:
      "bg-orange-50 border border-orange-300 animate-[pulse-glow_2s_ease-in-out_infinite]",
  };

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Orb */}
      <div className="relative">
        {isConnected && (
          <div className="absolute -inset-2 rounded-full bg-[var(--cw-accent)]/5 animate-[orb-breathe_3s_ease-in-out_infinite]" />
        )}
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${orbStyle[status]}`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              status === "idle"
                ? "bg-[var(--cw-text-tertiary)]"
                : status === "listening"
                  ? "bg-[var(--cw-accent)] shadow-[0_0_8px_var(--cw-accent)]"
                  : status === "speaking"
                    ? "bg-[#BF5700] shadow-[0_0_8px_rgba(191,87,0,0.5)]"
                    : "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
            }`}
          />
        </div>
      </div>

      {/* Status label */}
      <span className="text-[10px] text-[var(--cw-text-tertiary)] font-medium uppercase tracking-widest">
        {statusLabel[status]}
      </span>

      {/* Action button */}
      {!isConnected ? (
        <button
          onClick={handleStart}
          disabled={disabled || conversation.status === "connecting"}
          className="px-5 py-2 bg-[var(--cw-accent)] text-white rounded-lg font-medium text-sm hover:bg-[var(--cw-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
        >
          Start Session
        </button>
      ) : (
        <button
          onClick={handleStop}
          className="px-5 py-2 bg-[var(--cw-bg-secondary)] text-[var(--cw-text-secondary)] rounded-lg font-medium text-sm border border-[var(--cw-border)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors duration-150"
        >
          End Session
        </button>
      )}
    </div>
  );
}
