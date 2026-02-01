"use client";

import { motion } from "framer-motion";
import type { ChainNarrator } from "@/lib/types";
import { getRankColorHex, RANK_LABELS, RANK_COLORS } from "@/lib/graph-config";
import Link from "next/link";

interface IsnadChainProps {
  chain: ChainNarrator[];
  chainType?: "primary" | "variant" | "note";
  marker?: string | null;
  className?: string;
}

const CHAIN_TYPE_STYLES = {
  primary: {
    label: "الطريق الأساسي",
    bgClass: "bg-emerald-100 dark:bg-emerald-900/30",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-500",
  },
  variant: {
    label: "طريق آخر",
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-500",
  },
  note: {
    label: "ملاحظة",
    bgClass: "bg-amber-100 dark:bg-amber-900/30",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-500",
  },
};

/**
 * Vertical chain visualization showing the hadith transmission chain
 * with clear flow direction from first narrator to last (companion)
 */
export default function IsnadChain({ chain, chainType, marker, className = "" }: IsnadChainProps) {
  if (!chain || chain.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        لا توجد سلسلة رواة
      </div>
    );
  }

  const typeStyle = chainType ? CHAIN_TYPE_STYLES[chainType] : null;

  return (
    <div className={`relative ${className}`}>
      {/* Chain type header */}
      {typeStyle && chainType !== "primary" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 p-3 rounded-lg border ${typeStyle.bgClass} ${typeStyle.borderClass}`}
        >
          <div className={`text-sm font-semibold ${typeStyle.textClass}`}>
            {typeStyle.label}
          </div>
          {marker && (
            <div className={`text-xs mt-1 ${typeStyle.textClass} opacity-80`}>
              {marker}
            </div>
          )}
        </motion.div>
      )}

      {/* Chain container */}
      <div className="flex flex-col items-center">
        {chain.map((narrator, index) => {
          const color = getRankColorHex(narrator.rank);
          const isLast = index === chain.length - 1;
          const isFirst = index === 0;

          return (
            <motion.div
              key={narrator.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              className="flex flex-col items-center w-full max-w-md"
            >
              {/* Narrator Card */}
              <Link
                href={`/narrator/${narrator.id}`}
                className="group relative w-full"
              >
                <div
                  className="relative bg-card border-2 rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                  style={{ borderColor: color }}
                >
                  {/* Position badge */}
                  <div
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
                    style={{ backgroundColor: color }}
                  >
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex items-center gap-4">
                    {/* Color indicator */}
                    <div
                      className="w-1.5 h-12 rounded-full"
                      style={{ backgroundColor: color }}
                    />

                    {/* Narrator info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                        {narrator.fame || "غير معروف"}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {narrator.rank && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: color }}
                          >
                            {narrator.rank}
                          </span>
                        )}
                        {isFirst && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                            أول الإسناد
                          </span>
                        )}
                        {isLast && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#F59E0B20", color: "#F59E0B" }}>
                            آخر الإسناد
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow icon */}
                    <svg
                      className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Connector showing narration direction */}
              {!isLast && (
                <div className="flex flex-col items-center py-2">
                  {/* "روى عن" label - shows this narrator received from the next */}
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.08 + 0.15, duration: 0.2 }}
                    className="text-xs text-muted-foreground mb-1"
                  >
                    روى عن
                  </motion.span>
                  {/* Arrow pointing UP - knowledge flows from below (teacher) to above (student) */}
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 + 0.2, duration: 0.2 }}
                  >
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </motion.div>
                  {/* Vertical line */}
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: index * 0.08 + 0.25, duration: 0.2 }}
                    className="w-0.5 h-6 bg-gradient-to-t from-border to-primary/50"
                    style={{ transformOrigin: "bottom" }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: chain.length * 0.08 + 0.3 }}
        className="mt-8 pt-6 border-t border-border"
      >
        <h4 className="text-sm font-semibold text-muted-foreground mb-3 text-center">
          دليل الألوان
        </h4>
        <div className="flex flex-wrap justify-center gap-3">
          {Object.entries(RANK_LABELS).map(([key, label]) => {
            const colorKey = key as keyof typeof RANK_COLORS;
            return (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: RANK_COLORS[colorKey] }}
                />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
