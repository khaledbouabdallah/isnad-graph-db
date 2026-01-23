"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { getGraphOverview } from "@/lib/api";
import { Navbar, GraphLegend, GraphControls, NarratorSidePanel } from "@/components/ui";
import { matchesRankFilter } from "@/lib/graph-config";
import type { GraphData, Narrator } from "@/lib/types";
import type { NetworkGraphRef } from "@/components/graph/NetworkGraph";

const NetworkGraph = dynamic(
  () => import("@/components/graph/NetworkGraph"),
  { ssr: false }
);

// Load all narrators - backend limit is 2000
const MAX_NODES = 2000;

export default function ExplorePage() {
  const graphRef = useRef<NetworkGraphRef>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Full data loaded once
  const [fullData, setFullData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  // Client-side filters
  const [nodeCount, setNodeCount] = useState(500);
  const [selectedRank, setSelectedRank] = useState("all");
  const [showEdges, setShowEdges] = useState(false);

  // Narrator search and side panel
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Narrator[]>([]);
  const [selectedNarratorId, setSelectedNarratorId] = useState<number | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [specificEdge, setSpecificEdge] = useState<{ source: string; target: string } | null>(null);

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

  // Search narrators by fame
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchNarrators = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const response = await fetch(
          `${API_BASE}/search/narrators?q=${encodeURIComponent(searchQuery)}&limit=10`
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Search failed with status ${response.status}:`, errorText);
          throw new Error(`Search failed: ${response.status}`);
        }
        const results = await response.json();
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      }
    };

    const debounce = setTimeout(searchNarrators, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Handle narrator selection
  const handleNarratorClick = useCallback((id: number | string) => {
    const narratorId = typeof id === 'string' ? parseInt(id, 10) : id;
    setSelectedNarratorId(narratorId);
    setIsPanelOpen(true);
    setSearchQuery("");
    setSearchResults([]);

    // Focus on the node in the graph
    if (graphRef.current) {
      graphRef.current.focusOnNode(String(narratorId));
    }
  }, []);

  // Handle background click - close panel and return to explore mode
  const handleBackgroundClick = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedNarratorId(null);
    setSpecificEdge(null);
  }, []);

  // Handle teacher/student relation click
  const handleRelationClick = useCallback((mainId: number, relatedId: number) => {
    if (mainId === relatedId) {
      // Reset to show all connections of main narrator
      setSpecificEdge(null);
    } else {
      // Show only specific connection
      setSpecificEdge({
        source: String(mainId),
        target: String(relatedId),
      });
    }
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
        {/* Search Bar */}
        <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm z-[100]">
          <div className="max-w-md mx-auto relative z-[100]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث عن راوي بالشهرة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-[100] max-h-80 overflow-y-auto">
                {searchResults.map((narrator) => (
                  <button
                    key={narrator.id}
                    onClick={() => handleNarratorClick(narrator.id)}
                    className="w-full p-3 text-right hover:bg-secondary transition-colors border-b border-border last:border-0"
                  >
                    <div className="font-semibold text-foreground">
                      {narrator.fame || narrator.name}
                    </div>
                    {narrator.rank && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {narrator.rank}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

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
              onNodeClick={handleNarratorClick}
              onBackgroundClick={handleBackgroundClick}
              showEdges={showEdges}
              specificEdge={specificEdge}
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

          {/* Narrator Side Panel - Inside graph container */}
          <NarratorSidePanel
            narratorId={selectedNarratorId}
            isOpen={isPanelOpen}
            onClose={() => {
              setIsPanelOpen(false);
              setSpecificEdge(null);
            }}
            onRelationClick={handleRelationClick}
          />
        </div>

        {/* Legend */}
        <div className="p-3 bg-card/80 backdrop-blur-sm border-t border-border">
          <GraphLegend compact className="justify-center" />
        </div>
      </main>
    </div>
  );
}
