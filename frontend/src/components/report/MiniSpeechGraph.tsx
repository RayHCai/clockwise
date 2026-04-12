import { Circle, Line, Svg, Text as SvgText, G } from "@react-pdf/renderer";
import type { SpeechGraphResult } from "@/lib/types";

interface MiniSpeechGraphProps {
  data: SpeechGraphResult | null;
  width?: number;
  height?: number;
}

export function MiniSpeechGraph({
  data,
  width = 180,
  height = 130,
}: MiniSpeechGraphProps) {
  if (!data || data.nodes.length === 0) {
    return (
      <Svg width={width} height={height}>
        <SvgText
          x={width / 2}
          y={height / 2}
          style={{ fontSize: 8, textAnchor: "middle" }}
          fill="#9CA3AF"
        >
          No speech data
        </SvgText>
      </Svg>
    );
  }

  // Take top N nodes by frequency
  const maxNodes = 20;
  const sorted = [...data.nodes].sort((a, b) => b.frequency - a.frequency);
  const topNodes = sorted.slice(0, maxNodes);
  const nodeIds = new Set(topNodes.map((n) => n.id));

  // Simple circular layout
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 20;
  const positions = new Map<string, { x: number; y: number }>();

  topNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / topNodes.length - Math.PI / 2;
    positions.set(node.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });

  // Filter edges to only include visible nodes
  const visibleEdges = data.edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );

  const maxFreq = Math.max(...topNodes.map((n) => n.frequency), 1);

  return (
    <Svg width={width} height={height}>
      {/* Edges */}
      {visibleEdges.map((edge) => {
        const src = positions.get(edge.source);
        const tgt = positions.get(edge.target);
        if (!src || !tgt) return null;
        const color = edge.weight > 2 ? "#F87171" : "#D1D5DB";
        return (
          <Line
            key={edge.id}
            x1={src.x}
            y1={src.y}
            x2={tgt.x}
            y2={tgt.y}
            stroke={color}
            strokeWidth={0.5 + Math.min(edge.weight, 4) * 0.3}
            opacity={0.6}
          />
        );
      })}
      {/* Nodes */}
      {topNodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        const r = 3 + (node.frequency / maxFreq) * 5;
        return (
          <G key={node.id}>
            <Circle cx={pos.x} cy={pos.y} r={r} fill="#3B82F6" opacity={0.7} />
            <SvgText
              x={pos.x}
              y={pos.y + r + 7}
              style={{ fontSize: 5, textAnchor: "middle" }}
              fill="#374151"
            >
              {node.label.length > 8
                ? node.label.slice(0, 7) + "…"
                : node.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
