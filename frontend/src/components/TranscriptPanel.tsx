"use client";

import { useEffect, useRef } from "react";

interface TranscriptEntry {
  text: string;
  role: "user" | "agent";
  timestamp: number;
}

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
}

export default function TranscriptPanel({ entries }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [entries]);

  return (
    <div ref={scrollRef} className="space-y-2 min-h-0">
      {entries.length === 0 && (
        <p className="text-sm text-[var(--cw-text-tertiary)] italic">
          Transcript will appear here during the session...
        </p>
      )}
      {entries.map((entry, i) => (
        <div
          key={i}
          className={`rounded-lg px-3.5 py-2.5 animate-[fade-in-up_0.3s_ease-out] ${
            entry.role === "user"
              ? "bg-[var(--cw-accent-muted)] border border-[var(--cw-accent)]/10"
              : "bg-[var(--cw-bg)] border border-[var(--cw-border)]"
          }`}
        >
          <span
            className={`font-medium text-[10px] uppercase tracking-widest ${
              entry.role === "user"
                ? "text-[var(--cw-accent)]"
                : "text-[var(--cw-text-tertiary)]"
            }`}
          >
            {entry.role === "user" ? "Patient" : "Agent"}
          </span>
          <p className="mt-1 text-sm leading-relaxed text-[var(--cw-text-secondary)]">
            {entry.text}
          </p>
        </div>
      ))}
    </div>
  );
}

export type { TranscriptEntry };
