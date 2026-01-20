"use client";

import { useEffect, useRef, useCallback } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import type { GraphData } from "@/lib/types";
import {
  SIGMA_SETTINGS,
  EDGE_STYLES,
  NODE_STYLES,
  RANK_COLORS,
} from "@/lib/graph-config";

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

    const graph = new Graph();
    const centerNode = data.nodes.find((n) => n.id === centerId);

    // Position nodes in a circular layout around center
    const otherNodes = data.nodes.filter((n) => n.id !== centerId);
    const angleStep = (2 * Math.PI) / Math.max(otherNodes.length, 1);

    // Add center node
    if (centerNode) {
      graph.addNode(centerNode.id, {
        label: centerNode.label || "",
        size: 30,
        color: RANK_COLORS.thiqa, // Teal for center
        x: 0,
        y: 0,
      });
    }

    // Add other nodes in a circle
    otherNodes.forEach((node, index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const radius = 120;
      graph.addNode(node.id, {
        label: node.label || "",
        size: Math.max(node.size, NODE_STYLES.minSize),
        color: node.color || RANK_COLORS.default,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    });

    // Add edges with consistent styling
    data.edges.forEach((edge) => {
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        const isConnectedToCenter = edge.source === centerId || edge.target === centerId;
        graph.addEdge(edge.source, edge.target, {
          weight: edge.weight,
          size: isConnectedToCenter ? 1.5 : 0.5,
          color: isConnectedToCenter ? EDGE_STYLES.highlighted + "80" : EDGE_STYLES.default,
        });
      }
    });

    const sigma = new Sigma(graph, containerRef.current, {
      ...SIGMA_SETTINGS,
      labelRenderedSizeThreshold: 4, // Show more labels in ego graph
      nodeReducer: (node, nodeData) => {
        const res = { ...nodeData };
        const hovered = hoveredNodeRef.current;
        if (hovered && hovered !== centerId) {
          if (node === hovered || node === centerId || graph.areNeighbors(node, hovered)) {
            res.highlighted = true;
            if (node === hovered) {
              res.size = (res.size as number) * 1.2;
            }
          } else {
            res.color = NODE_STYLES.faded;
            res.label = "";
          }
        }
        // When not hovering, keep default labels visible
        return res;
      },
      edgeReducer: (edge, edgeData) => {
        const res = { ...edgeData };
        const hovered = hoveredNodeRef.current;
        if (hovered && hovered !== centerId) {
          const [source, target] = graph.extremities(edge);
          if (source !== hovered && target !== hovered) {
            res.hidden = true;
          } else {
            res.color = EDGE_STYLES.highlighted;
            res.size = 2;
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
  }, [data, centerId, handleNodeClick]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-80 bg-card rounded-lg ${className}`}
    />
  );
}
