"use client";

import { useCallback, useRef, useState } from "react";

interface UseGeminiLiveOptions {
  apiKey: string;
  onObservation: (text: string) => void;
}

export function useGeminiLive({ apiKey, onObservation }: UseGeminiLiveOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (wsRef.current) return;

    const ws = new WebSocket(
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`
    );

    ws.onopen = () => {
      // Send setup config as first message
      ws.send(
        JSON.stringify({
          setup: {
            model: "models/gemini-2.0-flash-live-001",
            generationConfig: {
              responseModalities: ["TEXT"],
            },
            systemInstruction: {
              parts: [
                {
                  text: `You are observing a patient drawing a clock for a cognitive screening test (Clock Drawing Test).
Describe what you see concisely in 1-2 sentences. Focus on:
- Circle quality (round, closed, distorted)
- Number placement and spacing
- Clock hand positions and accuracy
- Any hesitations or unusual patterns
Be clinical and objective. If you can't see a drawing clearly, say so briefly.`,
                },
              ],
            },
          },
        })
      );
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const parts = data?.serverContent?.modelTurn?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.text) {
              onObservation(part.text);
            }
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      setConnected(false);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [apiKey, onObservation]);

  const sendFrame = useCallback((canvas: HTMLCanvasElement) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          ws.send(
            JSON.stringify({
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: "image/jpeg",
                    data: base64,
                  },
                ],
              },
            })
          );
        };
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      0.7
    );
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  return { connect, disconnect, sendFrame, connected };
}
