"use client";

import { useCallback, useRef, useState } from "react";

interface UseGeminiLiveOptions {
  apiKey: string;
  onObservation: (text: string) => void;
}

const SYSTEM_PROMPT = `You are observing a patient drawing a clock for a cognitive screening test (Clock Drawing Test).
Describe what you see concisely in 1-2 sentences. Focus on:
- Circle quality (round, closed, distorted)
- Number placement and spacing
- Clock hand positions and accuracy
- Any hesitations or unusual patterns
Be clinical and objective. If you can't see a drawing clearly, say so briefly.`;

export function useGeminiLive({ apiKey, onObservation }: UseGeminiLiveOptions) {
  const [connected, setConnected] = useState(false);
  const activeRef = useRef(false);

  const connect = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    setConnected(true);
    console.log("[GeminiVision] Ready (REST mode)");
  }, []);

  const sendFrame = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (!activeRef.current) return;

      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(",")[1];
            console.log("[GeminiVision] Sending frame for analysis...");

            try {
              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    systemInstruction: {
                      parts: [{ text: SYSTEM_PROMPT }],
                    },
                    contents: [
                      {
                        parts: [
                          { text: "Describe what you see in this frame." },
                          {
                            inlineData: {
                              mimeType: "image/jpeg",
                              data: base64,
                            },
                          },
                        ],
                      },
                    ],
                  }),
                },
              );

              if (!res.ok) {
                console.error(
                  "[GeminiVision] API error:",
                  res.status,
                  await res.text(),
                );
                return;
              }

              const data = await res.json();
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                console.log("[GeminiVision] Observation:", text);
                onObservation(text);
              }
            } catch (err) {
              console.error("[GeminiVision] Request failed:", err);
            }
          };
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.7,
      );
    },
    [apiKey, onObservation],
  );

  const disconnect = useCallback(() => {
    activeRef.current = false;
    setConnected(false);
    console.log("[GeminiVision] Disconnected");
  }, []);

  return { connect, disconnect, sendFrame, connected };
}
