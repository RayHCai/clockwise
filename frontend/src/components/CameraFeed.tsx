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
        setCameraError(null);
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
                setCameraError(
                  "No camera found. Connect a camera and try again.",
                );
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
        setCameraError(null);
      }

      return () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
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
      <div className="h-full rounded-2xl overflow-hidden bg-[var(--cw-navy)] flex flex-col relative">
        {/* Camera viewport */}
        <div className="flex-1 relative flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${active ? "block" : "hidden"}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Standby state */}
          {!active && !cameraError && (
            <div className="flex flex-col items-center gap-4">
              {/* Corner brackets */}
              <div className="relative w-48 h-36">
                {/* Top-left */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl-sm animate-[corner-scan_3s_ease-in-out_infinite]" />
                {/* Top-right */}
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/30 rounded-tr-sm animate-[corner-scan_3s_ease-in-out_infinite_0.5s]" />
                {/* Bottom-left */}
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/30 rounded-bl-sm animate-[corner-scan_3s_ease-in-out_infinite_1s]" />
                {/* Bottom-right */}
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/30 rounded-br-sm animate-[corner-scan_3s_ease-in-out_infinite_1.5s]" />

                {/* Camera icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center">
                    <svg
                      className="w-7 h-7 text-white/40"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-white/50 text-sm font-medium">
                  Camera feed appears here
                </p>
                <p className="text-white/30 text-xs mt-1">
                  Position paper drawing in frame
                </p>
              </div>
            </div>
          )}

          {/* Camera error */}
          {cameraError && active && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--cw-navy)]/90 p-4">
              <p className="text-sm text-red-400 text-center leading-relaxed">
                {cameraError}
              </p>
            </div>
          )}

          {/* Active status badge */}
          {active && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  connected
                    ? "bg-[var(--cw-risk-low)]"
                    : "bg-[var(--cw-risk-moderate)] animate-pulse"
                }`}
              />
              <span className="text-xs text-white/80 font-medium">
                {connected ? "Gemini Live" : "Connecting..."}
              </span>
            </div>
          )}

          {/* API key warning */}
          {!apiKey && active && (
            <div className="absolute bottom-14 left-4 text-xs text-amber-400 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
              Set NEXT_PUBLIC_GEMINI_API_KEY in .env.local
            </div>
          )}
        </div>

        {/* Bottom status bar */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                active
                  ? "bg-[var(--cw-risk-low)] animate-[status-pulse_2s_ease-in-out_infinite]"
                  : "bg-white/30"
              }`}
            />
            <span className="text-xs text-white/50 uppercase tracking-wider font-medium">
              {active ? "Recording" : "Standby"}
            </span>
          </div>
          <span className="text-xs text-white/30 font-medium">
            Paper Drawing
          </span>
        </div>
      </div>
    );
  },
);

export default CameraFeed;
