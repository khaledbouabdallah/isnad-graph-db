"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { getGraphOverview } from "@/lib/api";
import { Navbar, GraphLegend, GraphControls } from "@/components/ui";
import { matchesRankFilter } from "@/lib/graph-config";
import type { GraphData } from "@/lib/types";
import type { NetworkGraphRef } from "@/components/graph/NetworkGraph";

const NetworkGraph = dynamic(
  () => import("@/components/graph/NetworkGraph"),
  { ssr: false }
);

// Load all narrators - backend limit is 2000
const MAX_NODES = 2000;

export default function ExplorePage() {
  const router = useRouter();
  const graphRef = useRef<NetworkGraphRef>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Full data loaded once
  const [fullData, setFullData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  // Client-side filters
  const [nodeCount, setNodeCount] = useState(500);
  const [selectedRank, setSelectedRank] = useState("all");
  const [showEdges, setShowEdges] = useState(false);

  // Fullscreen handler - fullscreen the entire main section (includes toolbar)
  const toggleFullscreen = useCallback(() => {
    if (mainRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        mainRef.current.requestFullscreen();
      }
    }
  }, []);

  // Load full data once on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await getGraphOverview(MAX_NODES);
        setFullData(data);
      } catch (error) {
        console.error("Failed to load graph:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Client-side filtered data
  const filteredData = useMemo<GraphData | null>(() => {
    if (!fullData) return null;

    // Filter nodes by rank
    let filteredNodes = fullData.nodes;
    if (selectedRank !== "all") {
      filteredNodes = fullData.nodes.filter((node) =>
        matchesRankFilter((node as { rank?: string }).rank || null, selectedRank)
      );
    }

    // Limit to nodeCount
    filteredNodes = filteredNodes.slice(0, nodeCount);

    // Get visible node IDs for edge filtering
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));

    // Filter edges to only include visible nodes
    const filteredEdges = fullData.edges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
    };
  }, [fullData, nodeCount, selectedRank]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main ref={mainRef} className="pt-16 h-screen flex flex-col bg-background">
        {/* Controls */}
        <GraphControls
          nodeCount={nodeCount}
          maxNodes={fullData?.nodes.length || MAX_NODES}
          onNodeCountChange={setNodeCount}
          selectedRank={selectedRank}
          onRankChange={setSelectedRank}
          showEdges={showEdges}
          onToggleEdges={() => setShowEdges(!showEdges)}
          onZoomIn={() => graphRef.current?.zoomIn()}
          onZoomOut={() => graphRef.current?.zoomOut()}
          onResetCamera={() => graphRef.current?.resetCamera()}
          onToggleFullscreen={toggleFullscreen}
          visibleNodes={filteredData?.nodes.length || 0}
          visibleEdges={filteredData?.edges.length || 0}
        />

        {/* Graph */}
        <div className="flex-1 relative">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "radial-gradient(ellipse at center, #0a0a0f 0%, #050507 100%)" }}
            >
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full bg-primary/40 animate-pulse" />
                  <div className="absolute inset-4 rounded-full bg-primary animate-pulse" />
                </div>
                <p className="text-muted-foreground">جاري تحميل الشبكة...</p>
              </div>
            </motion.div>
          ) : filteredData && filteredData.nodes.length > 0 ? (
            <NetworkGraph
              ref={graphRef}
              data={filteredData}
              onNodeClick={(id) => router.push(`/narrator/${id}`)}
              showEdges={showEdges}
              className="h-full"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground">
                {filteredData?.nodes.length === 0
                  ? "لا يوجد رواة تطابق المعايير المحددة"
                  : "فشل في تحميل البيانات"
                }
              </p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-3 bg-card/80 backdrop-blur-sm border-t border-border">
          <GraphLegend compact className="justify-center" />
        </div>
      </main>
    </div>
  );
}
