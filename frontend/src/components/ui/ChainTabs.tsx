"use client";

import { motion } from "framer-motion";
import type { Chain } from "@/lib/types";

interface ChainTabsProps {
  chains: Chain[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}

const CHAIN_TYPE_CONFIG = {
  primary: {
    label: "الطريق الأساسي",
    color: "emerald",
    bgClass: "bg-emerald-100 dark:bg-emerald-900/30",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-500",
    activeBg: "bg-emerald-500",
  },
  variant: {
    label: "طريق آخر",
    color: "blue",
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-500",
    activeBg: "bg-blue-500",
  },
  note: {
    label: "ملاحظة",
    color: "amber",
    bgClass: "bg-amber-100 dark:bg-amber-900/30",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-500",
    activeBg: "bg-amber-500",
  },
};

export function ChainTabs({ chains, activeIndex, onTabChange }: ChainTabsProps) {
  if (chains.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {chains.map((chain, index) => {
        const config = CHAIN_TYPE_CONFIG[chain.chain_type] || CHAIN_TYPE_CONFIG.variant;
        const isActive = index === activeIndex;

        return (
          <motion.button
            key={chain.chain_id}
            onClick={() => onTabChange(index)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              border-2
              ${isActive
                ? `${config.activeBg} text-white border-transparent shadow-md`
                : `${config.bgClass} ${config.textClass} ${config.borderClass} hover:shadow-sm`
              }
            `}
          >
            <div className="flex items-center gap-2">
              {/* Chain type indicator */}
              <span>
                {index === 0 ? config.label : `${config.label} ${index}`}
              </span>

              {/* Narrator count badge */}
              <span className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${isActive
                  ? "bg-white/20 text-white"
                  : "bg-black/10 dark:bg-white/10"
                }
              `}>
                {chain.narrators.length}
              </span>
            </div>

            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-sm"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export { CHAIN_TYPE_CONFIG };
