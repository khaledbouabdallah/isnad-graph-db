"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from "react";
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
  onBackgroundClick?: () => void;
  showEdges?: boolean;
  specificEdge?: { source: string; target: string } | null;
  className?: string;
}

export interface NetworkGraphRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetCamera: () => void;
  animateChain: (chain: Array<{ id: number }>) => void;
  focusOnNode: (nodeId: string) => void;
}

const NetworkGraph = forwardRef<NetworkGraphRef, NetworkGraphProps>(
  function NetworkGraph({ data, onNodeClick, onBackgroundClick, showEdges = false, specificEdge = null, className = "" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sigmaRef = useRef<Sigma | null>(null);
    const hoveredNodeRef = useRef<string | null>(null);
    const clickedNodeRef = useRef<string | null>(null);
    const specificEdgeRef = useRef(specificEdge);
    const showEdgesRef = useRef(showEdges);
    const isInitializedRef = useRef(false);
    const animationFrameRef = useRef<number | null>(null);
    const pulseFactorRef = useRef(1); // Animation pulse factor
    const [isDetailMode, setIsDetailMode] = useState(false); // Track detailed mode for animation

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

    // Keep specificEdgeRef in sync
    useEffect(() => {
      specificEdgeRef.current = specificEdge;
      setIsDetailMode(!!specificEdge || !!clickedNodeRef.current);
      if (isInitializedRef.current && sigmaRef.current) {
        try {
          sigmaRef.current.refresh();
        } catch {
          // Sigma not ready yet, ignore
        }
      }
    }, [specificEdge]);

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
      animateChain: (chain: Array<{ id: number }>) => {
        const sigma = sigmaRef.current;
        if (!sigma) return;

        const graph = sigma.getGraph();
        const nodeIds = chain.map(n => String(n.id));

        // Animate each node in sequence like a signal
        let currentIndex = 0;
        const animateNext = () => {
          if (currentIndex >= nodeIds.length) {
            // Reset after animation
            setTimeout(() => sigma.refresh(), 500);
            return;
          }

          const nodeId = nodeIds[currentIndex];
          if (!graph.hasNode(nodeId)) {
            currentIndex++;
            animateNext();
            return;
          }

          // Pulse effect - temporarily increase size and change color
          const originalSize = graph.getNodeAttribute(nodeId, "size");
          const originalColor = graph.getNodeAttribute(nodeId, "color");

          // Pulse to gold with glow
          graph.setNodeAttribute(nodeId, "size", originalSize * 2);
          graph.setNodeAttribute(nodeId, "color", "#F59E0B");
          sigma.refresh();

          // Return to original after pulse
          setTimeout(() => {
            graph.setNodeAttribute(nodeId, "size", originalSize);
            graph.setNodeAttribute(nodeId, "color", originalColor);
            sigma.refresh();

            // Move to next node
            currentIndex++;
            animateNext();
          }, 300);
        };

        animateNext();
      },
      focusOnNode: (nodeId: string) => {
        const sigma = sigmaRef.current;
        if (!sigma) return;

        const graph = sigma.getGraph();
        if (!graph.hasNode(nodeId)) return;

        // Set clicked node to highlight it and its neighbors
        clickedNodeRef.current = nodeId;
        setIsDetailMode(true);

        // Get node position and zoom in on it
        const nodeDisplayData = sigma.getNodeDisplayData(nodeId);
        if (nodeDisplayData) {
          const camera = sigma.getCamera();
          camera.animate(
            { x: nodeDisplayData.x, y: nodeDisplayData.y, ratio: 0.3 },
            { duration: 600, easing: "quadraticInOut" }
          );
        }

        sigma.refresh();
      },
    }));

    const handleNodeClick = useCallback(
      (nodeId: string) => {
        onNodeClick?.(nodeId);
      },
      [onNodeClick]
    );

    const handleBackgroundClick = useCallback(() => {
      onBackgroundClick?.();
    }, [onBackgroundClick]);

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
        // Don't render default label for hovered nodes
        defaultDrawNodeLabel: (context, data, settings) => {
          // Skip label rendering for hovered node (drawHover handles it)
          if (data.isHovered) {
            return;
          }
          // Default label rendering for other nodes
          if (!data.label) return;

          const size = data.size;

          // If this is a highlighted neighbor, draw prominent label
          if (data.highlighted) {
            const fontSize = (settings.labelSize || 12) + 2;
            const font = settings.labelFont || "sans-serif";

            context.font = `600 ${fontSize}px ${font}`;

            const labelWidth = context.measureText(data.label).width;
            const padding = 6;
            const labelX = data.x + size + 8;
            const labelY = data.y;

            // Semi-transparent dark background
            context.fillStyle = "rgba(0, 0, 0, 0.75)";
            context.beginPath();
            context.roundRect(
              labelX - padding,
              labelY - fontSize / 2 - padding / 2,
              labelWidth + padding * 2,
              fontSize + padding,
              4
            );
            context.fill();

            // Border with node color
            context.strokeStyle = data.color;
            context.lineWidth = 1;
            context.stroke();

            // Draw the label text
            context.fillStyle = "#fef3c7";
            context.textAlign = "left";
            context.fillText(data.label, labelX, labelY + fontSize / 3);
          } else {
            // Regular label for non-highlighted nodes
            context.fillStyle = settings.labelColor?.color || "#fef3c7";
            context.font = `${settings.labelWeight} ${settings.labelSize}px ${settings.labelFont}`;
            context.fillText(data.label, data.x + size + 3, data.y + settings.labelSize / 3);
          }
        },
        // Use curved edge program for stylish connections
        edgeProgramClasses: {
          curved: EdgeCurvedArrowProgram,
        },
        defaultEdgeType: "curved",
        renderEdgeLabels: true,
        edgeLabelSize: 12,
        edgeLabelColor: { color: "#fef3c7" },
        edgeLabelWeight: "600",
        nodeReducer: (node, nodeData) => {
          const res = { ...nodeData };
          const hovered = hoveredNodeRef.current;
          const clicked = clickedNodeRef.current;
          const specificEdge = specificEdgeRef.current;

          // If specific edge is set, only show those two nodes
          if (specificEdge) {
            if (node === specificEdge.source || node === specificEdge.target) {
              res.highlighted = true;
              if (node === specificEdge.source) {
                res.size = (res.size as number) * NODE_STYLES.glowMultiplier;
                res.zIndex = 2;
                res.isHovered = true; // Mark source as hovered to use drawHover
              } else {
                res.zIndex = 1;
                // Target node uses highlighted label style
              }
            } else {
              res.color = NODE_STYLES.faded;
              res.label = "";
              res.zIndex = 0;
            }
            return res;
          }

          const activeNode = hovered || clicked; // Use hover if present, else clicked

          if (activeNode) {
            if (node === activeNode) {
              // Active node - make it glow (larger), keep label for drawHover
              res.highlighted = true;
              res.size = (res.size as number) * NODE_STYLES.glowMultiplier;
              res.zIndex = 2;
              res.isHovered = true; // Mark as hovered for label renderer
            } else if (graph.areNeighbors(node, activeNode)) {
              // Neighbors - keep original color, show label
              //res.highlighted = true; // remove highlighted styling as gives duplicate effect
              res.zIndex = 1;
            } else {
              // Non-connected nodes - fade to transparent warm grey, hide label
              res.color = NODE_STYLES.faded;
              res.label = "";
              res.zIndex = 0;
            }
          }
          // When not hovering or clicked, keep default labels visible
          return res;
        },
        edgeReducer: (edge, edgeData) => {
          const res = { ...edgeData };
          const hovered = hoveredNodeRef.current;
          const clicked = clickedNodeRef.current;
          const specificEdge = specificEdgeRef.current;

          // If specific edge is set, only show that edge
          if (specificEdge) {
            const [source, target] = graph.extremities(edge);
            const isSpecificEdge =
              (source === specificEdge.source && target === specificEdge.target) ||
              (source === specificEdge.target && target === specificEdge.source);

            if (isSpecificEdge) {
              res.hidden = false;
              res.color = EDGE_STYLES.highlighted;
              const baseSize = 2 + Math.min(edgeData.weight * 0.3, 5);
              res.size = baseSize * pulseFactorRef.current; // Apply pulse
              res.zIndex = 2;
            } else {
              res.hidden = true;
            }
            return res;
          }

          const activeNode = hovered || clicked; // Use hover if present, else clicked

          // Edges hidden by default unless showEdges is true
          if (!showEdgesRef.current && !activeNode) {
            res.hidden = true;
            return res;
          }

          if (activeNode) {
            const [source, target] = graph.extremities(edge);
            if (source === activeNode || target === activeNode) {
              // Connected to active node - show with directional coloring
              res.hidden = false;

              // Blue for outgoing (narrated from), Green for incoming (narrated to)
              if (source === activeNode) {
                res.color = EDGE_STYLES.narratedFrom; // Outgoing: active → other (narrated from)
              } else {
                res.color = EDGE_STYLES.narratedTo; // Incoming: other → active (narrated to)
              }

              // Size based on hadith count - thicker edges for more hadiths
              const baseSize = 1.5 + Math.min(edgeData.weight * 0.3, 5);
              res.size = baseSize * pulseFactorRef.current; // Apply pulse
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
        // Toggle clicked state: if clicking the same node, unselect it
        if (clickedNodeRef.current === node) {
          clickedNodeRef.current = null;
          setIsDetailMode(false);
        } else {
          clickedNodeRef.current = node;
          setIsDetailMode(true);
        }
        sigma.refresh();
        handleNodeClick(node);
      });

      // Click on stage (background) clears selection
      sigma.on("clickStage", () => {
        if (clickedNodeRef.current) {
          clickedNodeRef.current = null;
          setIsDetailMode(false);
          sigma.refresh();
        }
        handleBackgroundClick();
      });

      sigmaRef.current = sigma;
      isInitializedRef.current = true;

      return () => {
        isInitializedRef.current = false;
        sigma.kill();
      };
    }, [data, handleNodeClick, handleBackgroundClick]);

    // Animate edges when in detailed mode (node clicked or specific edge)
    useEffect(() => {
      const sigma = sigmaRef.current;
      if (!sigma || !isDetailMode) {
        // Reset pulse factor when not in detail mode
        pulseFactorRef.current = 1;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }

      let phase = 0;
      let isRunning = true;

      const animate = () => {
        if (!isRunning || !sigmaRef.current) {
          return;
        }

        phase += 0.08; // Animation speed
        pulseFactorRef.current = 1 + Math.sin(phase) * 0.25; // Pulse between 0.75x and 1.25x

        try {
          sigma.refresh();
          animationFrameRef.current = requestAnimationFrame(animate);
        } catch (error) {
          // Sigma instance was destroyed, stop animation
          isRunning = false;
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        isRunning = false;
        pulseFactorRef.current = 1;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }, [isDetailMode]);

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
