"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import { EdgeCurvedArrowProgram } from "@sigma/edge-curve";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { GraphData, HadithChainData } from "@/lib/types";
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
  onEdgeClick?: (source: string, target: string) => void;
  onBackgroundClick?: () => void;
  showEdges?: boolean;
  specificEdge?: { source: string; target: string } | null;
  hadithChainData?: HadithChainData | null; // Primary and variant chains for hadith view
  className?: string;
}

export interface NetworkGraphRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetCamera: () => void;
  animateChain: (chain: Array<{ id: number }>) => void;
  focusOnNode: (nodeId: string) => void;
  resetToExploreMode: () => void;
}

// Chain colors for visualization
const CHAIN_COLORS = {
  primary: "#10b981", // Emerald green
  variant: "#3b82f6", // Blue
  note: "#f59e0b", // Amber
  connection: "#a855f7", // Purple for connection points
};

const NetworkGraph = forwardRef<NetworkGraphRef, NetworkGraphProps>(
  function NetworkGraph({ data, onNodeClick, onEdgeClick, onBackgroundClick, showEdges = false, specificEdge = null, hadithChainData = null, className = "" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sigmaRef = useRef<Sigma | null>(null);
    const hoveredNodeRef = useRef<string | null>(null);
    const clickedNodeRef = useRef<string | null>(null);
    const specificEdgeRef = useRef(specificEdge);
    const hadithChainDataRef = useRef(hadithChainData);
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

    // Keep hadithChainDataRef in sync
    useEffect(() => {
      hadithChainDataRef.current = hadithChainData;
      setIsDetailMode(!!hadithChainData || !!specificEdge || !!clickedNodeRef.current);
      if (isInitializedRef.current && sigmaRef.current) {
        try {
          sigmaRef.current.refresh();
        } catch {
          // Sigma not ready yet, ignore
        }
      }
    }, [hadithChainData, specificEdge]);

    // Apply hierarchical top-down layout when hadith chain is active
    useEffect(() => {
      const sigma = sigmaRef.current;
      const chainData = hadithChainData;

      if (!sigma || !isInitializedRef.current || !chainData || chainData.primaryChain.length === 0) return;

      const graph = sigma.getGraph();
      const primaryChain = chainData.primaryChain;

      // Calculate center position based on existing primary chain nodes
      let sumX = 0;
      let validNodes = 0;
      primaryChain.forEach((nodeId) => {
        if (graph.hasNode(nodeId)) {
          sumX += graph.getNodeAttribute(nodeId, "x") as number;
          validNodes++;
        }
      });
      const centerX = validNodes > 0 ? sumX / validNodes : 50;

      // Position primary chain nodes in a vertical line (top-down hierarchy)
      const verticalSpacing = 80;
      const startY = 0;

      primaryChain.forEach((nodeId, index) => {
        if (graph.hasNode(nodeId)) {
          graph.setNodeAttribute(nodeId, "x", centerX);
          graph.setNodeAttribute(nodeId, "y", startY + index * verticalSpacing);
        }
      });

      // Position variant chain nodes branching off from their connection points
      const horizontalOffset = 120; // Distance to the side for variant chains
      const primarySet = new Set(primaryChain);
      let variantCount = 0; // Track actual variant chains (not notes)
      let noteCount = 0; // Track note chains

      chainData.variantChains.forEach((variant) => {
        const connectsAtIndex = variant.connectsAt
          ? primaryChain.indexOf(variant.connectsAt)
          : primaryChain.length - 1;

        const connectionY = connectsAtIndex >= 0
          ? startY + connectsAtIndex * verticalSpacing
          : startY + (primaryChain.length - 1) * verticalSpacing;

        // Find narrators unique to this variant (not in primary)
        const uniqueNarrators = variant.narrators.filter(n => !primarySet.has(n));

        if (variant.chain_type === "note") {
          // NOTE chains: arrange horizontally as parallel narrators
          // Fan out from the connection point
          const noteSpacing = 100;
          uniqueNarrators.forEach((nodeId, idx) => {
            if (graph.hasNode(nodeId)) {
              // Position in a horizontal line above the connection point
              const totalWidth = (uniqueNarrators.length - 1) * noteSpacing;
              const startXNote = centerX - totalWidth / 2;
              graph.setNodeAttribute(nodeId, "x", startXNote + idx * noteSpacing);
              graph.setNodeAttribute(nodeId, "y", connectionY - verticalSpacing);
            }
          });
          noteCount++;
        } else {
          // VARIANT chains: arrange vertically branching off to the side
          const side = (variantCount % 2 === 0) ? 1 : -1; // Alternate left/right
          const xOffset = centerX + (side * horizontalOffset * (Math.floor(variantCount / 2) + 1));

          uniqueNarrators.forEach((nodeId, idx) => {
            if (graph.hasNode(nodeId)) {
              // Position above the connection point in a vertical line
              const yPos = connectionY - (uniqueNarrators.length - idx) * verticalSpacing;
              graph.setNodeAttribute(nodeId, "x", xOffset);
              graph.setNodeAttribute(nodeId, "y", yPos);
            }
          });
          variantCount++;
        }
      });

      // Animate camera to fit all chains
      setTimeout(() => {
        const camera = sigma.getCamera();
        camera.animatedReset({ duration: 400 });
      }, 50);

      sigma.refresh();
    }, [hadithChainData]);

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
      resetToExploreMode: () => {
        // Clear all focus state and return to explore mode
        clickedNodeRef.current = null;
        hoveredNodeRef.current = null;
        setIsDetailMode(false);

        const sigma = sigmaRef.current;
        if (sigma) {
          sigma.refresh();
        }
      },
    }));

    const handleNodeClick = useCallback(
      (nodeId: string) => {
        onNodeClick?.(nodeId);
      },
      [onNodeClick]
    );

    const handleEdgeClick = useCallback(
      (source: string, target: string) => {
        onEdgeClick?.(source, target);
      },
      [onEdgeClick]
    );

    const handleBackgroundClick = useCallback(() => {
      onBackgroundClick?.();
    }, [onBackgroundClick]);

    useEffect(() => {
      if (!containerRef.current || data.nodes.length === 0) return;

      // Create graphology instance
      const graph = new Graph();

      // Seeded random for deterministic layout based on node ID
      const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };

      // Add nodes with warm color palette and deterministic positions
      data.nodes.forEach((node) => {
        // Use node ID as seed for deterministic position
        const idNum = parseInt(node.id, 10) || node.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const x = seededRandom(idNum * 1.1) * 100;
        const y = seededRandom(idNum * 2.3) * 100;

        graph.addNode(node.id, {
          label: node.label || "",
          size: Math.min(Math.max(node.size, NODE_STYLES.minSize), NODE_STYLES.maxSize),
          color: node.color || "#78716C",
          originalColor: node.color || "#78716C", // Store original color for hadith mode
          rank: node.rank || null, // Store rank for hadith mode coloring
          x,
          y,
        });
      });

      // Add edges - REVERSED direction: teacher → student (source was student, target was teacher)
      // Original data: student NARRATED_FROM teacher (student → teacher)
      // We want: teacher NARRATED_TO student (teacher → student)
      data.edges.forEach((edge) => {
        if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
          // Swap source and target to reverse direction
          graph.addEdge(edge.target, edge.source, {
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
        // Custom label rendering - avoid duplicate labels
        defaultDrawNodeLabel: (context, data, settings) => {
          // Skip label rendering for hovered node (drawHover handles it)
          if (data.isHovered) {
            return;
          }
          // Default label rendering for other nodes
          if (!data.label) return;

          const size = data.size;
          const chainData = hadithChainDataRef.current;
          const isInHadithMode = chainData && chainData.primaryChain.length > 0;

          // If this is a highlighted neighbor (NOT in hadith chain mode), draw prominent label
          // In hadith mode, use simple labels to avoid clutter
          if (data.highlighted && !isInHadithMode) {
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
            // Regular label for non-highlighted nodes OR hadith mode chain nodes
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
          const chainData = hadithChainDataRef.current;

          // Priority 1: Hadith chain highlighting (supports multiple chains)
          if (chainData && chainData.primaryChain.length > 0) {
            const inPrimary = chainData.primaryChain.includes(node);

            // Check if node is in any variant chain
            let inVariant = false;

            for (const variant of chainData.variantChains) {
              if (variant.narrators.includes(node)) {
                inVariant = true;
              }
            }

            if (inPrimary || inVariant) {
              res.highlighted = true;
              res.size = (res.size as number) * NODE_STYLES.glowMultiplier;
              res.zIndex = 2;

              // Keep original rank-based color instead of chain-type color
              // The originalColor is set when the node was created
              const originalColor = nodeData.originalColor as string | undefined;
              if (originalColor) {
                res.color = originalColor;
              }
              // Otherwise keep the current color (already rank-based)
            } else {
              res.color = NODE_STYLES.faded;
              res.label = "";
              res.zIndex = 0;
            }
            return res;
          }

          // Priority 2: If specific edge is set, only show those two nodes
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
          const chainData = hadithChainDataRef.current;

          // Priority 1: Hadith chain highlighting - show edges for all chains
          if (chainData && chainData.primaryChain.length > 1) {
            const [source, target] = graph.extremities(edge);
            const primarySet = new Set(chainData.primaryChain);

            // Check if edge is in primary chain (consecutive nodes with REVERSED direction)
            // Edge direction is now: teacher → student (reversed from original)
            // Chain order: [first_narrator(student), ..., sahabi(teacher)]
            // With reversed edges: source=teacher (index i+1), target=student (index i)
            // So we need: sourceIdx - targetIdx === 1
            const sourceIdxPrimary = chainData.primaryChain.indexOf(source);
            const targetIdxPrimary = chainData.primaryChain.indexOf(target);
            const isPrimaryEdge =
              sourceIdxPrimary >= 0 &&
              targetIdxPrimary >= 0 &&
              sourceIdxPrimary - targetIdxPrimary === 1; // Teacher → Student

            if (isPrimaryEdge) {
              res.hidden = false;
              res.color = CHAIN_COLORS.primary;
              const baseSize = 3 + Math.min(edgeData.weight * 0.3, 5);
              res.size = baseSize;
              res.zIndex = 3;
              return res;
            }

            // Check if edge is in any variant chain
            for (const variant of chainData.variantChains) {
              // For NOTE chains: they often represent parallel narrators, not sequential
              // With reversed direction: connection point (teacher) → note narrator (student)
              if (variant.chain_type === "note" && variant.connectsAt) {
                const isNoteEdge =
                  source === variant.connectsAt &&
                  variant.narrators.includes(target) &&
                  target !== variant.connectsAt;

                if (isNoteEdge) {
                  res.hidden = false;
                  res.color = CHAIN_COLORS.note;
                  const baseSize = 2 + Math.min(edgeData.weight * 0.3, 4);
                  res.size = baseSize;
                  res.zIndex = 2;
                  return res;
                }
                continue; // Skip sequential check for notes
              }

              // For VARIANT chains: show edges between UNIQUE narrators (not in primary)
              // plus the connection to primary
              const uniqueNarrators = variant.narrators.filter(n => !primarySet.has(n));
              const sourceIdxUnique = uniqueNarrators.indexOf(source);
              const targetIdxUnique = uniqueNarrators.indexOf(target);

              // Edge between consecutive unique narrators (teacher → student)
              const isUniqueVariantEdge =
                sourceIdxUnique >= 0 &&
                targetIdxUnique >= 0 &&
                sourceIdxUnique - targetIdxUnique === 1;

              if (isUniqueVariantEdge) {
                res.hidden = false;
                res.color = CHAIN_COLORS.variant;
                const baseSize = 2.5 + Math.min(edgeData.weight * 0.3, 4);
                res.size = baseSize;
                res.zIndex = 2;
                return res;
              }

              // Edge connecting connection point (teacher) to first unique narrator (student)
              // Direction: connectsAt → firstUniqueNarrator
              if (variant.connectsAt && uniqueNarrators.length > 0) {
                const firstUniqueNarrator = uniqueNarrators[uniqueNarrators.length - 1];
                const isConnectionEdge =
                  source === variant.connectsAt && target === firstUniqueNarrator;

                if (isConnectionEdge) {
                  res.hidden = false;
                  res.color = CHAIN_COLORS.connection;
                  const baseSize = 2 + Math.min(edgeData.weight * 0.3, 4);
                  res.size = baseSize;
                  res.zIndex = 2;
                  return res;
                }
              }
            }

            // Not part of any chain - hide
            res.hidden = true;
            return res;
          }

          // Priority 2: If specific edge is set, only show that edge
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
              // Edge direction is now teacher → student
              res.hidden = false;

              if (source === activeNode) {
                // Active is teacher, pointing to students
                res.color = EDGE_STYLES.narratedTo; // Green: taught to students
              } else {
                // Active is student, receiving from teachers
                res.color = EDGE_STYLES.narratedFrom; // Blue: learned from teachers
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

      // Helper to check if node is in any chain
      const isNodeInChains = (node: string, chainData: HadithChainData | null): boolean => {
        if (!chainData) return false;
        if (chainData.primaryChain.includes(node)) return true;
        return chainData.variantChains.some(v => v.narrators.includes(node));
      };

      // Event handlers
      sigma.on("enterNode", ({ node }) => {
        const specificEdge = specificEdgeRef.current;
        const chainData = hadithChainDataRef.current;

        // Don't hover faded nodes when in specific edge mode
        if (specificEdge && node !== specificEdge.source && node !== specificEdge.target) {
          return; // Ignore hover on faded nodes
        }

        // Don't hover faded nodes when in hadith chain mode
        if (chainData && chainData.primaryChain.length > 0 && !isNodeInChains(node, chainData)) {
          return; // Ignore hover on nodes not in any chain
        }

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
        const specificEdge = specificEdgeRef.current;
        const chainData = hadithChainDataRef.current;

        // Don't allow clicking faded nodes when in specific edge mode
        if (specificEdge && node !== specificEdge.source && node !== specificEdge.target) {
          return; // Ignore clicks on faded nodes
        }

        // Don't allow clicking faded nodes when in hadith chain mode
        if (chainData && chainData.primaryChain.length > 0 && !isNodeInChains(node, chainData)) {
          return; // Ignore clicks on nodes not in any chain
        }

        // In hadith chain mode, just call the handler without setting clicked state
        // This prevents normal highlight behavior from triggering
        if (chainData && chainData.primaryChain.length > 0) {
          handleNodeClick(node);
          return;
        }

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

      // Click on edge to show hadiths for that relationship
      sigma.on("clickEdge", ({ edge }) => {
        const edgeData = graph.getEdgeAttributes(edge);
        if (edgeData.source && edgeData.target) {
          handleEdgeClick(edgeData.source, edgeData.target);
        }
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
