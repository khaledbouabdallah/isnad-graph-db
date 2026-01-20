"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import { EdgeCurvedArrowProgram } from "@sigma/edge-curve";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { GraphData } from "@/lib/types";
import {
  SIGMA_SETTINGS,
  LAYOUT_SETTINGS,
  EDGE_STYLES,
  NODE_STYLES,
} from "@/lib/graph-config";

// Custom draw hover function - prominent label above the node
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawHover(context: CanvasRenderingContext2D, data: any, settings: any): void {
  const size = data.size;
  const x = data.x;
  const y = data.y;

  // Draw a glow ring around the node
  context.beginPath();
  context.arc(x, y, size + 4, 0, Math.PI * 2);
  context.strokeStyle = data.color;
  context.lineWidth = 3;
  context.globalAlpha = 0.8;
  context.stroke();
  context.globalAlpha = 1;

  // Draw label ABOVE the node with larger font and background
  if (data.label) {
    const fontSize = (settings.labelSize || 12) + 4; // Larger font for hovered
    const font = settings.labelFont || "sans-serif";

    context.font = `700 ${fontSize}px ${font}`;

    const labelWidth = context.measureText(data.label).width;
    const padding = 8;
    const labelX = x - labelWidth / 2;
    const labelY = y - size - 16; // Position above the node

    // Semi-transparent dark background for readability
    context.fillStyle = "rgba(0, 0, 0, 0.85)";
    context.beginPath();
    context.roundRect(
      labelX - padding,
      labelY - fontSize + 2,
      labelWidth + padding * 2,
      fontSize + padding,
      6
    );
    context.fill();

    // Border with node color
    context.strokeStyle = data.color;
    context.lineWidth = 1.5;
    context.stroke();

    // Draw the label text
    context.fillStyle = "#fef3c7";
    context.textAlign = "left";
    context.fillText(data.label, labelX, labelY);
  }
}

interface NetworkGraphProps {
  data: GraphData;
  onNodeClick?: (nodeId: string) => void;
  showEdges?: boolean;
  className?: string;
}

export interface NetworkGraphRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetCamera: () => void;
}

const NetworkGraph = forwardRef<NetworkGraphRef, NetworkGraphProps>(
  function NetworkGraph({ data, onNodeClick, showEdges = false, className = "" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sigmaRef = useRef<Sigma | null>(null);
    const hoveredNodeRef = useRef<string | null>(null);
    const showEdgesRef = useRef(showEdges);
    const isInitializedRef = useRef(false);

    // Keep showEdgesRef in sync - only refresh if sigma is fully ready
    useEffect(() => {
      showEdgesRef.current = showEdges;
      // Only refresh if sigma is initialized and ready
      if (isInitializedRef.current && sigmaRef.current) {
        try {
          sigmaRef.current.refresh();
        } catch {
          // Sigma not ready yet, ignore
        }
      }
    }, [showEdges]);

    // Expose imperative methods for zoom/camera control
    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        const camera = sigmaRef.current?.getCamera();
        if (camera) {
          camera.animatedZoom({ duration: 300, factor: 1.5 });
        }
      },
      zoomOut: () => {
        const camera = sigmaRef.current?.getCamera();
        if (camera) {
          camera.animatedUnzoom({ duration: 300, factor: 1.5 });
        }
      },
      resetCamera: () => {
        const camera = sigmaRef.current?.getCamera();
        if (camera) {
          camera.animatedReset({ duration: 300 });
        }
      },
    }));

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

      // Add nodes with warm color palette
      data.nodes.forEach((node) => {
        graph.addNode(node.id, {
          label: node.label || "",
          size: Math.min(Math.max(node.size, NODE_STYLES.minSize), NODE_STYLES.maxSize),
          color: node.color || "#78716C",
          x: Math.random() * 100,
          y: Math.random() * 100,
        });
      });

      // Add edges - use type for curved rendering, weight determines thickness
      data.edges.forEach((edge) => {
        if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
          graph.addEdge(edge.source, edge.target, {
            weight: edge.weight,
            size: 0.8 + Math.min(edge.weight * 0.5, 3), // Thicker for more transmissions
            color: EDGE_STYLES.default,
            type: "curved", // Enable curved edges
          });
        }
      });

      // Apply force-directed layout
      forceAtlas2.assign(graph, LAYOUT_SETTINGS);

      // Create sigma instance with curved edges and warm styling
      const sigma = new Sigma(graph, containerRef.current, {
        ...SIGMA_SETTINGS,
        // Custom hover rendering - no white background box
        defaultDrawNodeHover: drawHover,
        // Use curved edge program for stylish connections
        edgeProgramClasses: {
          curved: EdgeCurvedArrowProgram,
        },
        defaultEdgeType: "curved",
        nodeReducer: (node, nodeData) => {
          const res = { ...nodeData };
          const hovered = hoveredNodeRef.current;

          if (hovered) {
            if (node === hovered) {
              // Hovered node - make it glow (larger), show label
              res.highlighted = true;
              res.size = (res.size as number) * NODE_STYLES.glowMultiplier;
              res.zIndex = 2;
            } else if (graph.areNeighbors(node, hovered)) {
              // Neighbors - keep original color, show label
              res.highlighted = true;
              res.zIndex = 1;
            } else {
              // Non-connected nodes - fade to transparent warm grey
              res.color = NODE_STYLES.faded;
              res.label = "";
              res.zIndex = 0;
            }
          }
          return res;
        },
        edgeReducer: (edge, edgeData) => {
          const res = { ...edgeData };
          const hovered = hoveredNodeRef.current;

          // Edges hidden by default unless showEdges is true
          if (!showEdgesRef.current && !hovered) {
            res.hidden = true;
            return res;
          }

          if (hovered) {
            const [source, target] = graph.extremities(edge);
            if (source === hovered || target === hovered) {
              // Connected to hovered node - show with gold highlight
              res.hidden = false;
              res.color = EDGE_STYLES.highlighted;
              res.size = 2.5;
              res.zIndex = 1;
            } else {
              // Not connected - hide completely
              res.hidden = true;
            }
          } else if (showEdgesRef.current) {
            // Show all edges with subtle warm opacity
            res.hidden = false;
            res.color = EDGE_STYLES.visible;
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
      isInitializedRef.current = true;

      return () => {
        isInitializedRef.current = false;
        sigma.kill();
      };
    }, [data, handleNodeClick]);

    return (
      <div
        ref={containerRef}
        className={`w-full h-full bg-background rounded-lg ${className}`}
        style={{ background: "radial-gradient(ellipse at center, #1c1917 0%, #0c0a09 100%)" }}
      />
    );
  }
);

export default NetworkGraph;
