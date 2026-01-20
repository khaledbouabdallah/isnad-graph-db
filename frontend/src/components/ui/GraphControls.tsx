"use client";

import { motion } from "framer-motion";
import { RANK_FILTER_OPTIONS } from "@/lib/graph-config";

interface GraphControlsProps {
  // Slider
  nodeCount: number;
  maxNodes: number;
  onNodeCountChange: (count: number) => void;

  // Rank filter
  selectedRank: string;
  onRankChange: (rank: string) => void;

  // Edge visibility
  showEdges: boolean;
  onToggleEdges: () => void;

  // Camera controls
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
  onToggleFullscreen: () => void;

  // Stats
  visibleNodes: number;
  visibleEdges: number;
}

export function GraphControls({
  nodeCount,
  maxNodes,
  onNodeCountChange,
  selectedRank,
  onRankChange,
  showEdges,
  onToggleEdges,
  onZoomIn,
  onZoomOut,
  onResetCamera,
  onToggleFullscreen,
  visibleNodes,
  visibleEdges,
}: GraphControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-4 p-4 bg-card/80 backdrop-blur-sm border-b border-border"
    >
      {/* Stats */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">الظاهر:</span>
        <span className="font-mono text-primary">{visibleNodes}</span>
        <span className="text-muted-foreground">راوي •</span>
        <span className="font-mono text-primary">{visibleEdges}</span>
        <span className="text-muted-foreground">اتصال</span>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Node Count Slider */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground whitespace-nowrap">
          عدد الرواة:
        </label>
        <input
          type="range"
          min={50}
          max={maxNodes}
          step={50}
          value={nodeCount}
          onChange={(e) => onNodeCountChange(parseInt(e.target.value))}
          className="w-32 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <span className="text-sm font-mono w-12 text-center">{nodeCount}</span>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Rank Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">المرتبة:</span>
        <div className="flex gap-1">
          {RANK_FILTER_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => onRankChange(option.key)}
              className={`
                px-2 py-1 text-xs rounded-md transition-all border
                ${selectedRank === option.key
                  ? "ring-2 ring-offset-1 ring-offset-background"
                  : "opacity-60 hover:opacity-100"
                }
              `}
              style={{
                backgroundColor: selectedRank === option.key ? option.color + "30" : "transparent",
                borderColor: option.color,
                color: option.color,
                // Use CSS custom property for ring color
                ["--tw-ring-color" as string]: option.color,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* Toggle Edges */}
      <button
        onClick={onToggleEdges}
        className={`
          flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all
          ${showEdges
            ? "bg-primary/20 text-primary border border-primary/40"
            : "bg-secondary text-muted-foreground border border-border hover:border-primary/40"
          }
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <span>{showEdges ? "إخفاء الروابط" : "إظهار الروابط"}</span>
      </button>

      {/* Camera Controls */}
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
        <button
          onClick={onZoomIn}
          className="p-2 hover:bg-background rounded-md transition-colors"
          title="تكبير"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        <button
          onClick={onZoomOut}
          className="p-2 hover:bg-background rounded-md transition-colors"
          title="تصغير"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={onResetCamera}
          className="p-2 hover:bg-background rounded-md transition-colors"
          title="إعادة التمركز"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <div className="w-px h-6 bg-border" />
        <button
          onClick={onToggleFullscreen}
          className="p-2 hover:bg-background rounded-md transition-colors"
          title="ملء الشاشة"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
