"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useGeminiLive } from "@/hooks/useGeminiLive";

export interface CameraFeedHandle {
  captureFrame: () => string | null;
  getStream: () => MediaStream | null;
}

interface CameraFeedProps {
  active: boolean;
  onObservation: (text: string) => void;
}

const CameraFeed = forwardRef<CameraFeedHandle, CameraFeedProps>(
  function CameraFeed({ active, onObservation }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

    const { connect, disconnect, sendFrame, connected } = useGeminiLive({
      apiKey,
      onObservation,
    });

    useImperativeHandle(ref, () => ({
      captureFrame: () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return null;
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0, 640, 480);
        return canvas.toDataURL("image/jpeg", 0.85);
      },
      getStream: () => streamRef.current,
    }));

    // Start/stop camera
    useEffect(() => {
      if (active) {
        navigator.mediaDevices
          .getUserMedia({ video: { width: 640, height: 480 } })
          .then((stream) => {
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch((err) => {
            console.error("Camera error:", err);
            if (err instanceof DOMException) {
              if (err.name === "NotAllowedError") {
                setCameraError(
                  "Camera permission denied. Allow camera access in browser settings.",
                );
              } else if (err.name === "NotFoundError") {
                setCameraError("No camera found. Connect a camera and try again.");
              } else {
                setCameraError(`Camera error: ${err.message}`);
              }
            } else {
              setCameraError("Failed to access camera.");
            }
          });
      } else {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
      }

      return () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        // Clear any camera error whenever `active` changes or the feed unmounts.
        setCameraError(null);
      };
    }, [active]);

    // Connect/disconnect Gemini Live
    useEffect(() => {
      console.log("[CameraFeed] active:", active, "apiKey:", apiKey ? "present" : "MISSING");
      if (active && apiKey) {
        connect();
      } else {
        disconnect();
      }
      return () => disconnect();
    }, [active, apiKey, connect, disconnect]);

    // Send frames at ~5s interval
    const captureAndSend = useCallback(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        console.log("[CameraFeed] captureAndSend skipped — video:", !!video, "canvas:", !!canvas);
        return;
      }
      if (video.readyState < 2) {
        console.log("[CameraFeed] captureAndSend skipped — video not ready, readyState:", video.readyState);
        return;
      }

      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 640, 480);
      console.log("[CameraFeed] Captured frame, sending to Gemini...");
      sendFrame(canvas);
    }, [sendFrame]);

    useEffect(() => {
      console.log("[CameraFeed] Frame interval effect — active:", active, "connected:", connected);
      if (active && connected) {
        console.log("[CameraFeed] Starting frame capture interval (every 5s)");
        intervalRef.current = setInterval(captureAndSend, 5000);
      } else if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [active, connected, captureAndSend]);

    return (
      <div className="relative flex-1 min-h-0 rounded-lg overflow-hidden border border-[var(--cw-border)] bg-[var(--cw-bg-secondary)]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain bg-gray-100"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Status badge */}
        {active && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-md px-2.5 py-1 border border-[var(--cw-border)]">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                connected
                  ? "bg-[var(--cw-risk-low)]"
                  : "bg-[var(--cw-risk-moderate)] animate-pulse"
              }`}
            />
            <span className="text-[11px] text-[var(--cw-text-secondary)] font-medium">
              {connected ? "Gemini Live" : "Connecting..."}
            </span>
          </div>
        )}

        {/* Inactive overlay */}
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <svg className="w-7 h-7 text-[var(--cw-text-tertiary)]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-[11px] text-[var(--cw-text-tertiary)] font-medium">
              Camera activates with session
            </span>
          </div>
        )}

        {/* Camera error */}
        {cameraError && active && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--cw-bg-secondary)]/90 p-4">
            <p className="text-[12px] text-[var(--cw-risk-high)] text-center leading-relaxed">
              {cameraError}
            </p>
          </div>
        )}

        {/* API key warning */}
        {!apiKey && active && (
          <div className="absolute bottom-2.5 left-2.5 text-[11px] text-[var(--cw-risk-moderate)] bg-white/80 backdrop-blur-sm rounded-md px-2.5 py-1 border border-[var(--cw-risk-moderate)]/20">
            Set NEXT_PUBLIC_GEMINI_API_KEY in .env.local
          </div>
        )}
      </div>
    );
  },
);

export default CameraFeed;
