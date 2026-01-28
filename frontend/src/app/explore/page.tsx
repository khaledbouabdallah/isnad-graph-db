"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { getGraphOverview } from "@/lib/api";
import { Navbar, GraphLegend, GraphControls, NarratorSidePanel, HadithSidePanel, EdgeHadithsModal } from "@/components/ui";
import { matchesRankFilter } from "@/lib/graph-config";
import type { GraphData, Narrator, Hadith } from "@/lib/types";
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
  const [searchType, setSearchType] = useState<"narrator" | "hadith">("narrator"); // Track search type
  const [narratorSearchResults, setNarratorSearchResults] = useState<Narrator[]>([]);
  const [hadithSearchResults, setHadithSearchResults] = useState<Hadith[]>([]);
  const [selectedNarratorId, setSelectedNarratorId] = useState<number | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [specificEdge, setSpecificEdge] = useState<{ source: string; target: string } | null>(null);

  // Hadith mode state
  const [selectedHadithNumber, setSelectedHadithNumber] = useState<number | null>(null);
  const [isHadithPanelOpen, setIsHadithPanelOpen] = useState(false);
  const [hadithChain, setHadithChain] = useState<string[] | null>(null);

  // Edge hadiths modal state
  const [edgeSourceId, setEdgeSourceId] = useState<string | null>(null);
  const [edgeTargetId, setEdgeTargetId] = useState<string | null>(null);
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState(false);

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

  // Search narrators or hadiths based on search type
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setNarratorSearchResults([]);
      setHadithSearchResults([]);
      return;
    }

    const performSearch = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

        if (searchType === "narrator") {
          const response = await fetch(
            `${API_BASE}/search/narrators?q=${encodeURIComponent(searchQuery)}&limit=10`
          );
          if (!response.ok) throw new Error(`Search failed: ${response.status}`);
          const results = await response.json();
          setNarratorSearchResults(results);
          setHadithSearchResults([]);
        } else {
          const response = await fetch(
            `${API_BASE}/search/hadiths?q=${encodeURIComponent(searchQuery)}&limit=10`
          );
          if (!response.ok) throw new Error(`Search failed: ${response.status}`);
          const results = await response.json();
          setHadithSearchResults(results);
          setNarratorSearchResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
        setNarratorSearchResults([]);
        setHadithSearchResults([]);
      }
    };

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, searchType]);

  // Reset to explore mode - unified function for consistency
  const resetToExploreMode = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedNarratorId(null);
    setSpecificEdge(null);
    setIsHadithPanelOpen(false);
    setSelectedHadithNumber(null);
    setHadithChain(null);

    // Reset graph to explore mode
    if (graphRef.current) {
      graphRef.current.resetToExploreMode();
    }
  }, []);

  // Handle narrator selection - enters detail mode - enters detail mode
  const handleNarratorClick = useCallback((id: number | string) => {
    const narratorId = typeof id === 'string' ? parseInt(id, 10) : id;

    // Enter narrator detail mode
    setSelectedNarratorId(narratorId);
    setIsPanelOpen(true);
    setSpecificEdge(null); // Reset specific edge when selecting new narrator
    setIsHadithPanelOpen(false); // Close hadith panel if open
    setSelectedHadithNumber(null);
    setSearchQuery("");
    setNarratorSearchResults([]);
    setHadithSearchResults([]);

    // Focus on the node in the graph
    if (graphRef.current) {
      graphRef.current.focusOnNode(String(narratorId));
    }
  }, []);

  // Handle hadith selection - enters hadith mode
  const handleHadithClick = useCallback(async (hadithNumber: number) => {
    // Enter hadith mode
    setSelectedHadithNumber(hadithNumber);
    setIsHadithPanelOpen(true);
    setSearchQuery("");
    setNarratorSearchResults([]);
    setHadithSearchResults([]);

    // Fetch hadith chain to highlight in graph
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const response = await fetch(`${API_BASE}/hadiths/${hadithNumber}/chain`);
      if (response.ok) {
        const chain = await response.json();
        const chainIds = chain.map((narrator: { id: string }) => narrator.id);
        setHadithChain(chainIds);
      }
    } catch (err) {
      console.error("Failed to fetch hadith chain:", err);
      setHadithChain(null);
    }
    // Note: Narrator panel can stay open, allowing navigation from narrator -> hadith
  }, []);

  // Handle background click - return to explore mode
  const handleBackgroundClick = useCallback(() => {
    resetToExploreMode();
  }, [resetToExploreMode]);

  // Handle edge click - shows hadiths for that relationship
  const handleEdgeClick = useCallback((source: string, target: string) => {
    setEdgeSourceId(source);
    setEdgeTargetId(target);
    setIsEdgeModalOpen(true);
  }, []);

  // Handle teacher/student relation click - shows specific connection
  const handleRelationClick = useCallback((mainId: number, relatedId: number) => {
    if (mainId === relatedId) {
      // Clicking main narrator resets to show all their connections
      setSpecificEdge(null);
    } else {
      // Show only specific connection between main narrator and selected relation
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
          <div className="max-w-2xl mx-auto relative z-[100]">
            {/* Search Type Toggle */}
            <div className="flex gap-2 mb-3 justify-center">
              <button
                onClick={() => setSearchType("narrator")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  searchType === "narrator"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                بحث عن راوي
              </button>
              <button
                onClick={() => setSearchType("hadith")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  searchType === "hadith"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                بحث عن حديث
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder={searchType === "narrator" ? "ابحث عن راوي بالشهرة..." : "ابحث عن حديث بالمتن..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>

            {/* Search Results Dropdown - Narrators */}
            {narratorSearchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-[100] max-h-80 overflow-y-auto">
                {narratorSearchResults.map((narrator) => (
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

            {/* Search Results Dropdown - Hadiths */}
            {hadithSearchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-[100] max-h-80 overflow-y-auto">
                {hadithSearchResults.map((hadith) => (
                  <button
                    key={hadith.number}
                    onClick={() => handleHadithClick(hadith.number)}
                    className="w-full p-3 text-right hover:bg-secondary transition-colors border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded">
                        {hadith.number}
                      </span>
                      {hadith.first_narrator && (
                        <span className="text-xs text-muted-foreground">
                          {hadith.first_narrator}
                        </span>
                      )}
                    </div>
                    {hadith.matn && (
                      <div className="text-sm text-foreground line-clamp-2">
                        {hadith.matn}
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
              onEdgeClick={handleEdgeClick}
              onBackgroundClick={handleBackgroundClick}
              showEdges={showEdges}
              specificEdge={specificEdge}
              hadithChain={hadithChain}
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
            onClose={resetToExploreMode}
            onRelationClick={handleRelationClick}
            onHadithClick={handleHadithClick}
          />

          {/* Hadith Side Panel - Inside graph container */}
          <HadithSidePanel
            hadithNumber={selectedHadithNumber}
            isOpen={isHadithPanelOpen}
            onClose={resetToExploreMode}
            onNarratorClick={handleNarratorClick}
          />

          {/* Edge Hadiths Modal */}
          <EdgeHadithsModal
            sourceId={edgeSourceId}
            targetId={edgeTargetId}
            isOpen={isEdgeModalOpen}
            onClose={() => setIsEdgeModalOpen(false)}
            onHadithClick={handleHadithClick}
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
