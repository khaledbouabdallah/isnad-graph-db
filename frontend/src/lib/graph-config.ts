/**
 * Shared graph configuration for consistent visualization across the app
 * Warm desert/parchment color palette - harmonious earth tones
 */

// Narrator rank colors - Warm harmonious palette (gold, amber, copper, bronze)
export const RANK_COLORS = {
  sahabi: "#F59E0B",      // Warm Gold - Companions (صحابي)
  thiqaThabt: "#D97706",  // Deep Amber - Very trustworthy (ثقة ثبت)
  thiqa: "#B45309",       // Copper - Trustworthy (ثقة)
  hafiz: "#92400E",       // Bronze - Memorizer (حافظ)
  default: "#78716C",     // Warm Stone - Default/Unknown
} as const;

// Edge styling - hidden by default, curved, shown on hover
export const EDGE_STYLES = {
  default: "#ffffff00",        // Invisible by default
  highlighted: "#F59E0B",      // Gold for highlighted connections
  visible: "#78716C40",        // Subtle warm grey when showing all
  faded: "#ffffff05",          // Nearly invisible for faded edges
} as const;

// Node styling
export const NODE_STYLES = {
  faded: "#78716C25",          // Semi-transparent warm stone (not white!)
  minSize: 8,
  maxSize: 40,
  glowMultiplier: 1.4,         // Size multiplier on hover
} as const;

// Sigma.js shared settings
export const SIGMA_SETTINGS = {
  renderLabels: true,
  labelFont: "IBM Plex Sans Arabic, sans-serif",
  labelSize: 12,
  labelColor: { color: "#fef3c7" },  // Warm cream for labels
  labelRenderedSizeThreshold: 8,
  defaultNodeColor: RANK_COLORS.default,
  defaultEdgeColor: EDGE_STYLES.default,
  edgeLabelFont: "IBM Plex Sans Arabic, sans-serif",
  edgeLabelSize: 10,
  labelDensity: 0.5,
  labelGridCellSize: 100,
  zIndex: true,
} as const;

// ForceAtlas2 layout settings
export const LAYOUT_SETTINGS = {
  iterations: 100,
  settings: {
    gravity: 1,
    scalingRatio: 10,
    barnesHutOptimize: true,
    strongGravityMode: true,
    slowDown: 3,
    outboundAttractionDistribution: true,
  },
} as const;

/**
 * Get hex color for a narrator rank
 */
export function getRankColorHex(rank: string | null): string {
  if (!rank) return RANK_COLORS.default;

  if (rank.includes("صحابي")) return RANK_COLORS.sahabi;
  if (rank.includes("ثقة ثبت")) return RANK_COLORS.thiqaThabt;
  if (rank.includes("ثقة")) return RANK_COLORS.thiqa;
  if (rank.includes("حافظ")) return RANK_COLORS.hafiz;

  return RANK_COLORS.default;
}

/**
 * Rank labels in Arabic with associated keys for filtering
 */
export const RANK_LABELS: Record<string, string> = {
  sahabi: "صحابي",
  thiqaThabt: "ثقة ثبت",
  thiqa: "ثقة",
  hafiz: "حافظ",
  default: "غير محدد",
};

/**
 * Filter options for rank-based filtering
 */
export const RANK_FILTER_OPTIONS = [
  { key: "all", label: "الكل", color: "#ffffff" },
  { key: "sahabi", label: "صحابي", color: RANK_COLORS.sahabi },
  { key: "thiqaThabt", label: "ثقة ثبت", color: RANK_COLORS.thiqaThabt },
  { key: "thiqa", label: "ثقة", color: RANK_COLORS.thiqa },
  { key: "hafiz", label: "حافظ", color: RANK_COLORS.hafiz },
  { key: "default", label: "غير محدد", color: RANK_COLORS.default },
] as const;

/**
 * Check if a narrator rank matches a filter key
 */
export function matchesRankFilter(rank: string | null, filterKey: string): boolean {
  if (filterKey === "all") return true;
  if (!rank) return filterKey === "default";

  switch (filterKey) {
    case "sahabi": return rank.includes("صحابي");
    case "thiqaThabt": return rank.includes("ثقة ثبت");
    case "thiqa": return rank.includes("ثقة") && !rank.includes("ثقة ثبت");
    case "hafiz": return rank.includes("حافظ");
    case "default": return !rank.includes("صحابي") && !rank.includes("ثقة") && !rank.includes("حافظ");
    default: return true;
  }
}
