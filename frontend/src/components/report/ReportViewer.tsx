"use client";

interface ReportViewerProps {
  pdfUrl: string;
  uploaded: boolean;
  onNewSession: () => void;
}

export function ReportViewer({
  pdfUrl,
  uploaded,
  onNewSession,
}: ReportViewerProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-6">
      <div className="card p-6 max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--cw-text-primary)]">
              Clinical Report Generated
            </h2>
            <p className="text-[11px] text-[var(--cw-text-tertiary)] mt-0.5">
              {uploaded
                ? "Session artifacts saved to cloud"
                : "Report available for download"}
            </p>
          </div>
          {uploaded && (
            <span className="text-[10px] bg-[var(--cw-risk-low)]/10 text-[var(--cw-risk-low)] px-2.5 py-1 rounded-md font-medium border border-[var(--cw-risk-low)]/20">
              Uploaded
            </span>
          )}
        </div>

        {/* PDF Preview */}
        <iframe
          src={pdfUrl}
          title="Clinical Report Preview"
          className="flex-1 w-full rounded-lg border border-[var(--cw-border)] bg-white min-h-[400px]"
        />

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <a
            href={pdfUrl}
            download="clockwise-report.pdf"
            className="flex-1 px-4 py-2.5 bg-[var(--cw-accent)] text-white rounded-lg font-medium text-sm text-center hover:bg-[var(--cw-accent-hover)] transition-colors duration-150"
          >
            Download PDF
          </a>
          <button
            onClick={onNewSession}
            className="flex-1 px-4 py-2.5 bg-[var(--cw-bg-secondary)] text-[var(--cw-text-secondary)] rounded-lg font-medium text-sm border border-[var(--cw-border)] hover:border-[var(--cw-border-hover)] transition-colors duration-150"
          >
            New Session
          </button>
        </div>
      </div>
    </div>
  );
}
