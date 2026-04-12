"use client";

import { useCallback, useRef } from "react";

export interface UseMediaRecordersReturn {
  startAudioRecording: (stream: MediaStream) => void;
  startVideoRecording: (stream: MediaStream) => void;
  stopAll: () => Promise<{ audioBlob: Blob | null; videoBlob: Blob | null }>;
}

function pickMime(kind: "audio" | "video"): string {
  const candidates =
    kind === "audio"
      ? ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"]
      : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return candidates[candidates.length - 1];
}

function stopRecorder(
  recorder: MediaRecorder | null,
  chunks: Blob[],
): Promise<Blob | null> {
  if (!recorder || recorder.state === "inactive") {
    return Promise.resolve(chunks.length > 0 ? new Blob(chunks, { type: chunks[0].type }) : null);
  }
  return new Promise((resolve) => {
    recorder.onstop = () => {
      resolve(
        chunks.length > 0 ? new Blob(chunks, { type: chunks[0].type }) : null,
      );
    };
    recorder.stop();
  });
}

export function useMediaRecorders(): UseMediaRecordersReturn {
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);

  const startAudioRecording = useCallback((stream: MediaStream) => {
    if (typeof MediaRecorder === "undefined") return;
    try {
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: pickMime("audio") });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(1000);
      audioRecorderRef.current = recorder;
    } catch (err) {
      console.error("Failed to start audio recording:", err);
    }
  }, []);

  const startVideoRecording = useCallback((stream: MediaStream) => {
    if (typeof MediaRecorder === "undefined") return;
    try {
      videoChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: pickMime("video") });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunksRef.current.push(e.data);
      };
      recorder.start(1000);
      videoRecorderRef.current = recorder;
    } catch (err) {
      console.error("Failed to start video recording:", err);
    }
  }, []);

  const stopAll = useCallback(async (): Promise<{
    audioBlob: Blob | null;
    videoBlob: Blob | null;
  }> => {
    const [audioBlob, videoBlob] = await Promise.all([
      stopRecorder(audioRecorderRef.current, audioChunksRef.current),
      stopRecorder(videoRecorderRef.current, videoChunksRef.current),
    ]);
    audioRecorderRef.current = null;
    videoRecorderRef.current = null;
    audioChunksRef.current = [];
    videoChunksRef.current = [];
    return { audioBlob, videoBlob };
  }, []);

  return { startAudioRecording, startVideoRecording, stopAll };
}
