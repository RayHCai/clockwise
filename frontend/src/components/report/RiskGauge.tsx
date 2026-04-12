import { Circle, G, Line, Path, Svg, Text as SvgText } from "@react-pdf/renderer";

interface RiskGaugeProps {
  score: number;
  riskLevel: "low" | "moderate" | "high";
}

export function RiskGauge({ score }: RiskGaugeProps) {
  const cx = 60;
  const cy = 55;
  const r = 40;

  // Build three arcs: green (0-33), amber (33-66), red (66-100)
  function arcPath(startPct: number, endPct: number): string {
    const startAngle = Math.PI + (startPct / 100) * Math.PI;
    const endAngle = Math.PI + (endPct / 100) * Math.PI;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = endPct - startPct > 50 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  // Needle angle: score 0 = left (180°), score 100 = right (0°)
  const needleAngle = Math.PI + (score / 100) * Math.PI;
  const needleLen = r - 8;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);

  return (
    <Svg width={120} height={70} viewBox="0 0 120 70">
      {/* Green arc: 0-33 */}
      <Path d={arcPath(0, 33)} stroke="#34D399" strokeWidth={7} fill="none" />
      {/* Amber arc: 33-66 */}
      <Path d={arcPath(33, 66)} stroke="#FBBF24" strokeWidth={7} fill="none" />
      {/* Red arc: 66-100 */}
      <Path d={arcPath(66, 100)} stroke="#F87171" strokeWidth={7} fill="none" />

      {/* Needle */}
      <G>
        <Line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#1F2937" strokeWidth={2} />
        <Circle cx={cx} cy={cy} r={3} fill="#1F2937" />
      </G>

      {/* Score label */}
      <SvgText
        x={cx}
        y={cy + 12}
        style={{ fontSize: 10, fontWeight: 700, textAnchor: "middle" }}
        fill="#1F2937"
      >
        {score}
      </SvgText>
    </Svg>
  );
}
