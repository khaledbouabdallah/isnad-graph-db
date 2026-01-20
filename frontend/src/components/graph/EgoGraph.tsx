"use client";

import { useEffect, useRef } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import type { GraphData } from "@/lib/types";

interface EgoGraphProps {
  data: GraphData;
  centerId: string;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

export default function EgoGraph({
  data,
  centerId,
  onNodeClick,
  className = "",
}: EgoGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.nodes.length === 0) return;

    const graph = new Graph();
    const centerNode = data.nodes.find((n) => n.id === centerId);

    // Position nodes in a circular layout around center
    const otherNodes = data.nodes.filter((n) => n.id !== centerId);
    const angleStep = (2 * Math.PI) / otherNodes.length;

    // Add center node
    if (centerNode) {
      graph.addNode(centerNode.id, {
        label: centerNode.label || "",
        size: 25,
        color: centerNode.color || "#14B8A6",
        x: 0,
        y: 0,
      });
    }

    // Add other nodes in a circle
    otherNodes.forEach((node, index) => {
      const angle = index * angleStep;
      const radius = 100;
      graph.addNode(node.id, {
        label: node.label || "",
        size: node.size,
        color: node.color || "#6366F1",
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    });

    // Add edges
    data.edges.forEach((edge) => {
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        graph.addEdge(edge.source, edge.target, {
          weight: edge.weight,
          size: 1,
          color: edge.source === centerId || edge.target === centerId
            ? "#14B8A640"
            : "#ffffff10",
        });
      }
    });

    const sigma = new Sigma(graph, containerRef.current, {
      renderLabels: true,
      labelFont: "IBM Plex Sans Arabic, sans-serif",
      labelSize: 10,
      labelColor: { color: "#ededed" },
      labelRenderedSizeThreshold: 6,
      defaultNodeColor: "#6366F1",
      defaultEdgeColor: "#ffffff10",
    });

    sigma.on("clickNode", ({ node }) => {
      onNodeClick?.(node);
    });

    sigma.on("enterNode", () => {
      containerRef.current!.style.cursor = "pointer";
    });

    sigma.on("leaveNode", () => {
      containerRef.current!.style.cursor = "default";
    });

    return () => {
      sigma.kill();
    };
  }, [data, centerId, onNodeClick]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-64 bg-card rounded-lg ${className}`}
    />
  );
}
