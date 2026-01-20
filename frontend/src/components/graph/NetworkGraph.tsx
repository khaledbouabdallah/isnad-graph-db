"use client";

import { useEffect, useRef, useCallback } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { GraphData } from "@/lib/types";

interface NetworkGraphProps {
  data: GraphData;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

export default function NetworkGraph({
  data,
  onNodeClick,
  className = "",
}: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      onNodeClick?.(nodeId);
    },
    [onNodeClick]
  );

  useEffect(() => {
    if (!containerRef.current || data.nodes.length === 0) return;

    // Create graphology instance
    const graph = new Graph();

    // Add nodes
    data.nodes.forEach((node) => {
      graph.addNode(node.id, {
        label: node.label || "",
        size: node.size,
        color: node.color || "#6366F1",
        x: Math.random() * 100,
        y: Math.random() * 100,
      });
    });

    // Add edges
    data.edges.forEach((edge) => {
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        graph.addEdge(edge.source, edge.target, {
          weight: edge.weight,
          size: Math.min(edge.weight, 5),
          color: "#ffffff15",
        });
      }
    });

    // Apply force-directed layout
    forceAtlas2.assign(graph, {
      iterations: 100,
      settings: {
        gravity: 1,
        scalingRatio: 10,
        barnesHutOptimize: true,
        strongGravityMode: true,
      },
    });

    // Create sigma instance
    const sigma = new Sigma(graph, containerRef.current, {
      renderLabels: true,
      labelFont: "IBM Plex Sans Arabic, sans-serif",
      labelSize: 12,
      labelColor: { color: "#ededed" },
      labelRenderedSizeThreshold: 8,
      defaultNodeColor: "#6366F1",
      defaultEdgeColor: "#ffffff15",
      nodeReducer: (node, nodeData) => {
        const res = { ...nodeData };
        const hovered = hoveredNodeRef.current;
        if (hovered) {
          if (node === hovered || graph.areNeighbors(node, hovered)) {
            res.highlighted = true;
          } else {
            res.color = "#ffffff20";
            res.label = "";
          }
        }
        return res;
      },
      edgeReducer: (edge, edgeData) => {
        const res = { ...edgeData };
        const hovered = hoveredNodeRef.current;
        if (hovered) {
          const [source, target] = graph.extremities(edge);
          if (source !== hovered && target !== hovered) {
            res.hidden = true;
          } else {
            res.color = "#14B8A660";
          }
        }
        return res;
      },
    });

    // Event handlers
    sigma.on("enterNode", ({ node }) => {
      hoveredNodeRef.current = node;
      sigma.refresh();
      containerRef.current!.style.cursor = "pointer";
    });

    sigma.on("leaveNode", () => {
      hoveredNodeRef.current = null;
      sigma.refresh();
      containerRef.current!.style.cursor = "default";
    });

    sigma.on("clickNode", ({ node }) => {
      handleNodeClick(node);
    });

    sigmaRef.current = sigma;

    return () => {
      sigma.kill();
    };
  }, [data, handleNodeClick]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-background rounded-lg ${className}`}
    />
  );
}
