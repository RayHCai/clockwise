const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const S3_ENABLED = process.env.NEXT_PUBLIC_ENABLE_S3_UPLOAD === "true";

export interface UploadArtifacts {
  audioBlob: Blob | null;
  videoBlob: Blob | null;
  pdfBlob: Blob;
}

export async function uploadSessionArtifacts(
  sessionId: string,
  artifacts: UploadArtifacts,
  onProgress?: (step: string) => void,
): Promise<{ uploaded: boolean }> {
  if (!S3_ENABLED) {
    return { uploaded: false };
  }

  onProgress?.("Requesting upload URLs...");
  const res = await fetch(`${BACKEND_URL}/upload/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!res.ok) {
    console.error("Failed to get presigned URLs:", res.status);
    return { uploaded: false };
  }

  const urls = await res.json();
  const uploads: Promise<Response>[] = [];

  if (artifacts.audioBlob) {
    onProgress?.("Uploading audio recording...");
    uploads.push(
      fetch(urls.audio_url, {
        method: "PUT",
        body: artifacts.audioBlob,
        headers: { "Content-Type": "audio/webm" },
      }),
    );
  }

  if (artifacts.videoBlob) {
    onProgress?.("Uploading video recording...");
    uploads.push(
      fetch(urls.video_url, {
        method: "PUT",
        body: artifacts.videoBlob,
        headers: { "Content-Type": "video/webm" },
      }),
    );
  }

  onProgress?.("Uploading PDF report...");
  uploads.push(
    fetch(urls.pdf_url, {
      method: "PUT",
      body: artifacts.pdfBlob,
      headers: { "Content-Type": "application/pdf" },
    }),
  );

  await Promise.all(uploads);
  onProgress?.("Upload complete");
  return { uploaded: true };
}
