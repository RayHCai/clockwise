"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { SpeechGraphResult } from "@/lib/types";

interface SpeechGraphProps {
  data: SpeechGraphResult | null;
}

// Deterministic force-directed-ish layout using golden angle distribution
function computeLayout(
  nodes: SpeechGraphResult["nodes"],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const n = nodes.length;
  if (n === 0) return positions;

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const centerX = 400;
  const centerY = 300;
  const scale = Math.min(300, 80 * Math.sqrt(n));

  nodes.forEach((node, i) => {
    const angle = i * goldenAngle;
    const r = scale * Math.sqrt((i + 1) / n);
    positions.set(node.id, {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    });
  });

  return positions;
}

export default function SpeechGraph({ data }: SpeechGraphProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!data || data.nodes.length === 0) {
      return { flowNodes: [], flowEdges: [] };
    }

    const positions = computeLayout(data.nodes);
    const maxFreq = Math.max(...data.nodes.map((n) => n.frequency), 1);
    const maxWeight = Math.max(...data.edges.map((e) => e.weight), 1);

    // Build adjacency for highlighting
    const adjacency = new Map<string, Set<string>>();
    data.edges.forEach((e) => {
      if (!adjacency.has(e.source)) adjacency.set(e.source, new Set());
      if (!adjacency.has(e.target)) adjacency.set(e.target, new Set());
      adjacency.get(e.source)!.add(e.target);
      adjacency.get(e.target)!.add(e.source);
    });

    const connectedToSelected = selectedNode
      ? (adjacency.get(selectedNode) ?? new Set())
      : null;

    const flowNodes: Node[] = data.nodes.map((node) => {
      const pos = positions.get(node.id) ?? { x: 400, y: 300 };
      const size = 30 + (node.frequency / maxFreq) * 40;
      const isSelected = node.id === selectedNode;
      const isConnected = connectedToSelected?.has(node.id);
      const dimmed = selectedNode && !isSelected && !isConnected;

      const intensity = 0.08 + (node.frequency / maxFreq) * 0.25;

      return {
        id: node.id,
        position: pos,
        data: { label: node.label },
        style: {
          width: size,
          height: size,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.max(9, Math.min(14, size / 4)),
          fontWeight: isSelected ? 700 : 500,
          background: isSelected
            ? "#BF5700"
            : isConnected
              ? "#E08A4E"
              : `rgba(191, 87, 0, ${intensity})`,
          color: isSelected || isConnected ? "#FFFFFF" : "#2C1A05",
          border: isSelected
            ? "2px solid #A34B00"
            : isConnected
              ? "1px solid #F0B88A"
              : "1px solid rgba(120, 70, 20, 0.12)",
          boxShadow: isSelected
            ? "0 0 16px rgba(191, 87, 0, 0.35)"
            : isConnected
              ? "0 0 10px rgba(191, 87, 0, 0.2)"
              : "none",
          opacity: dimmed ? 0.25 : 1,
          transition: "all 0.3s ease",
          cursor: "pointer",
          padding: "2px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap" as const,
        },
        type: "default",
      };
    });

    const flowEdges: Edge[] = data.edges.map((edge) => {
      const normalizedWeight = edge.weight / maxWeight;
      const isHighRepeat = edge.weight > 2;
      const isSelfLoop = edge.source === edge.target;
      const connectedToSel =
        selectedNode &&
        (edge.source === selectedNode || edge.target === selectedNode);
      const dimmed = selectedNode && !connectedToSel;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: isHighRepeat,
        style: {
          stroke: isHighRepeat
            ? "#EF4444"
            : connectedToSel
              ? "#BF5700"
              : "#D4C4B0",
          strokeWidth: 1 + normalizedWeight * 3,
          opacity: dimmed ? 0.1 : isSelfLoop ? 0.5 : 0.6,
          transition: "all 0.3s ease",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color: isHighRepeat
            ? "#EF4444"
            : connectedToSel
              ? "#BF5700"
              : "#D4C4B0",
        },
        label: edge.weight > 1 ? `${edge.weight}` : undefined,
        labelStyle: { fontSize: 9, fill: "#9C8B78" },
      };
    });

    return { flowNodes, flowEdges };
  }, [data, selectedNode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNode((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  if (!data || data.nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[var(--cw-text-tertiary)] text-sm">
        Speech graph will emerge as the patient speaks...
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#D4C4B0" gap={24} size={1} />
        <Controls position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
