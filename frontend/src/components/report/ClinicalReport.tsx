import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  FusionResult,
  ReportNarrative,
  SpeechGraphResult,
} from "@/lib/types";
import { RiskGauge } from "./RiskGauge";
import { MiniSpeechGraph } from "./MiniSpeechGraph";

interface ClinicalReportProps {
  fusionResult: FusionResult;
  graphData: SpeechGraphResult | null;
  clockDrawingSnapshot: string | null;
  observations: string[];
  narrative: ReportNarrative;
  sessionDate: string;
}

const s = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#BF5700",
    paddingBottom: 8,
  },
  title: { fontSize: 16, fontWeight: "bold", color: "#BF5700" },
  subtitle: { fontSize: 8, color: "#6B7280" },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  riskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 4,
  },
  riskScore: { fontSize: 28, fontWeight: "bold" },
  riskBadge: {
    fontSize: 9,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    textTransform: "uppercase",
  },
  clockImage: { width: "100%", maxHeight: 120, objectFit: "contain" },
  observation: { fontSize: 8, color: "#374151", marginBottom: 2 },
  summaryText: {
    fontSize: 9,
    color: "#1F2937",
    lineHeight: 1.5,
    marginBottom: 4,
  },
  scoreBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  scoreBarLabel: { width: 70, fontSize: 8, color: "#6B7280" },
  scoreBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
  },
  scoreBarFill: { height: 6, borderRadius: 3 },
  scoreBarValue: {
    width: 24,
    fontSize: 8,
    textAlign: "right",
    color: "#374151",
    fontWeight: "bold",
  },
  disclaimer: {
    marginTop: "auto",
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
    fontSize: 7,
    color: "#9CA3AF",
    textAlign: "center",
  },
});

function riskColor(level: string): string {
  if (level === "low") return "#059669";
  if (level === "moderate") return "#D97706";
  return "#DC2626";
}

function riskBg(level: string): string {
  if (level === "low") return "#D1FAE5";
  if (level === "moderate") return "#FEF3C7";
  return "#FEE2E2";
}

function scoreBarColor(value: number): string {
  if (value < 33) return "#34D399";
  if (value < 66) return "#FBBF24";
  return "#F87171";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.scoreBarRow}>
      <Text style={s.scoreBarLabel}>{label}</Text>
      <View style={s.scoreBarTrack}>
        <View
          style={[
            s.scoreBarFill,
            {
              width: `${Math.min(value, 100)}%`,
              backgroundColor: scoreBarColor(value),
            },
          ]}
        />
      </View>
      <Text style={s.scoreBarValue}>{value}</Text>
    </View>
  );
}

export function ClinicalReport({
  fusionResult,
  graphData,
  clockDrawingSnapshot,
  observations,
  narrative,
  sessionDate,
}: ClinicalReportProps) {
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Clockwise</Text>
            <Text style={s.subtitle}>Cognitive Screening Report</Text>
          </View>
          <Text style={s.subtitle}>Date: {sessionDate}</Text>
        </View>

        {/* Risk Score Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Risk Assessment</Text>
          <View style={s.riskRow}>
            <RiskGauge
              score={fusionResult.composite_score}
              riskLevel={fusionResult.risk_level}
            />
            <View style={{ justifyContent: "center", gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text
                  style={[
                    s.riskScore,
                    { color: riskColor(fusionResult.risk_level) },
                  ]}
                >
                  {fusionResult.composite_score}
                </Text>
                <Text style={{ fontSize: 10, color: "#6B7280" }}>/100</Text>
              </View>
              <View
                style={[
                  s.riskBadge,
                  {
                    backgroundColor: riskBg(fusionResult.risk_level),
                    color: riskColor(fusionResult.risk_level),
                    alignSelf: "flex-start",
                  },
                ]}
              >
                <Text>{fusionResult.risk_level} risk</Text>
              </View>
              <Text style={{ fontSize: 8, color: "#6B7280" }}>
                Confidence: {fusionResult.confidence}
              </Text>
            </View>
          </View>
        </View>

        {/* Two-column: Clock Drawing + Speech Graph */}
        <View style={[s.section, s.row]}>
          {/* Clock Drawing */}
          <View style={s.col}>
            <Text style={s.sectionTitle}>Clock Drawing</Text>
            {clockDrawingSnapshot ? (
              <Image style={s.clockImage} src={clockDrawingSnapshot} />
            ) : (
              <Text style={{ fontSize: 8, color: "#9CA3AF", marginBottom: 6 }}>
                No drawing captured
              </Text>
            )}
            {observations.length > 0 && (
              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 7, color: "#6B7280", marginBottom: 2 }}>
                  AI Observations:
                </Text>
                {observations.slice(-5).map((obs, i) => (
                  <Text key={i} style={s.observation}>
                    • {obs}
                  </Text>
                ))}
              </View>
            )}
            {narrative.drawing_findings && (
              <Text style={{ fontSize: 8, color: "#374151", marginTop: 4, lineHeight: 1.4 }}>
                {narrative.drawing_findings}
              </Text>
            )}
          </View>

          {/* Speech Graph */}
          <View style={s.col}>
            <Text style={s.sectionTitle}>Speech Graph</Text>
            <MiniSpeechGraph data={graphData} />
            {narrative.graph_interpretation && (
              <Text style={{ fontSize: 8, color: "#374151", marginTop: 4, lineHeight: 1.4 }}>
                {narrative.graph_interpretation}
              </Text>
            )}
          </View>
        </View>

        {/* Clinical Summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Clinical Summary</Text>
          {narrative.summary_sentences.map((sentence, i) => (
            <Text key={i} style={s.summaryText}>
              {sentence}
            </Text>
          ))}
          {narrative.recommendation && (
            <Text style={[s.summaryText, { fontWeight: "bold", marginTop: 4 }]}>
              {narrative.recommendation}
            </Text>
          )}
        </View>

        {/* Domain Subscores */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Domain Subscores</Text>
          <ScoreBar label="Visuospatial" value={fusionResult.subscores.visuospatial} />
          <ScoreBar label="Executive" value={fusionResult.subscores.executive} />
          <ScoreBar label="Language" value={fusionResult.subscores.language} />
          <ScoreBar label="Motor" value={fusionResult.subscores.motor} />
        </View>

        {/* Disclaimer */}
        <Text style={s.disclaimer}>
          This report is generated by an automated screening tool and does not
          constitute a clinical diagnosis. Results should be interpreted by a
          qualified healthcare professional in the context of a comprehensive
          clinical evaluation. Clockwise Cognitive Screening.
        </Text>
      </Page>
    </Document>
  );
}
