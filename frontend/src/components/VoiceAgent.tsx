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
  const onSessionStartRef = useRef(onSessionStart);
  onSessionStartRef.current = onSessionStart;
  const onSessionEndRef = useRef(onSessionEnd);
  onSessionEndRef.current = onSessionEnd;

  const conversation = useConversation({
    onMessage: useCallback((message: { source: string; message: string }) => {
      if (message.source === "user") {
        onTranscriptRef.current(message.message, "user");
      } else if (message.source === "ai") {
        onTranscriptRef.current(message.message, "agent");
      }
    }, []),
    onError: useCallback((error: unknown) => {
      console.error("ElevenLabs conversation error:", error);
    }, []),
    onDebug: useCallback((info: unknown) => {
      console.log("ElevenLabs debug:", info);
    }, []),
  });

  const isConnected = conversation.status === "connected";

  const handleStart = useCallback(async () => {
    try {
      const session = await conversation.startSession({
        agentId: AGENT_ID,
        overrides: {
          agent: {
            prompt: {
              prompt: `You are a warm, patient, and encouraging therapist guiding a dementia patient through the Clock Drawing Test (CDT). Your role is to lead the conversation — do not wait for the patient to ask questions. Give clear, simple, one-step-at-a-time instructions. Speak slowly and calmly. Use short sentences. Reassure the patient often. If they seem confused, gently repeat or rephrase without frustration. Never say "How can I help you?" — you are the guide. Walk them through each step: drawing the circle, placing the numbers, and setting the hands to a specific time. Celebrate small successes. If they go quiet, gently prompt them to continue. Always be kind, never clinical or condescending.`,
            },
            firstMessage:
              "Hello there. It's lovely to speak with you today. We're going to do a simple drawing activity together — nothing difficult, I promise. First, I'd like you to draw a nice big circle on the paper in front of you. Take your time, there's no rush at all.",
          },
        },
      });
      console.log("ElevenLabs session started:", session);
      onSessionStartRef.current?.();
    } catch (err) {
      console.error("Failed to start ElevenLabs session:", err);
      onSessionEndRef.current?.();
    }
  }, [conversation]);

  const handleStop = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error("Failed to end ElevenLabs session:", err);
    } finally {
      onSessionEndRef.current?.();
    }
  }, [conversation]);

  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;

  useEffect(() => {
    return () => {
      if (conversationRef.current.status === "connected") {
        try { conversationRef.current.endSession(); } catch {}
      }
    };
  }, []);

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
