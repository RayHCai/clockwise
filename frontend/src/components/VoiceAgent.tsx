"use client";

import { useCallback, useEffect, useRef } from "react";
import { useConversation } from "@elevenlabs/react";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!;

interface VoiceAgentProps {
  onTranscript: (text: string, role: "user" | "agent") => void;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
  isActive: boolean;
}

export default function VoiceAgent({
  onTranscript,
  onSessionStart,
  onSessionEnd,
  isActive,
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
        try {
          conversation.endSession();
        } catch {}
      }
    };
  }, [conversation]);

  if (isConnected) {
    return (
      <button
        onClick={handleStop}
        className="px-5 py-2.5 bg-red-500 text-white rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors duration-150"
      >
        End Session
      </button>
    );
  }

  return (
    <button
      onClick={handleStart}
      disabled={conversation.status === "connecting"}
      className="px-5 py-2.5 bg-[var(--cw-accent)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--cw-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
    >
      {conversation.status === "connecting" ? "Connecting..." : "Start Session"}
    </button>
  );
}
