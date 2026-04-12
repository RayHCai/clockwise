"use client";

import { useCallback, useRef, useState } from "react";
import type { SpeechGraphResult } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export function useSpeechGraph() {
  const [graphData, setGraphData] = useState<SpeechGraphResult | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/analyze-speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SpeechGraphResult = await res.json();
      setGraphData(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Speech graph analysis failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setGraphData(null);
  }, []);

  return { graphData, loading, analyze, reset };
}
