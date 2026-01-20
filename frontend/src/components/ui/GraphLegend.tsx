"use client";

import { motion } from "framer-motion";
import { RANK_COLORS, RANK_LABELS } from "@/lib/graph-config";

interface GraphLegendProps {
  className?: string;
  compact?: boolean;
}

/**
 * Consistent legend component for all graph visualizations
 */
export default function GraphLegend({ className = "", compact = false }: GraphLegendProps) {
  const items = [
    { key: "sahabi", color: RANK_COLORS.sahabi, label: RANK_LABELS.sahabi },
    { key: "thiqaThabt", color: RANK_COLORS.thiqaThabt, label: RANK_LABELS.thiqaThabt },
    { key: "thiqa", color: RANK_COLORS.thiqa, label: RANK_LABELS.thiqa },
    { key: "hafiz", color: RANK_COLORS.hafiz, label: RANK_LABELS.hafiz },
    { key: "default", color: RANK_COLORS.default, label: RANK_LABELS.default },
  ];

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-3 ${className}`}>
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`bg-card border border-border rounded-xl p-4 ${className}`}
    >
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">
        دليل رتب الرواة
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full shadow-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm">{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
