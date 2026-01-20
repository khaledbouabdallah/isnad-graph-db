"use client";

import { motion } from "framer-motion";
import type { ChainNarrator } from "@/lib/types";
import { getRankColorHex, RANK_LABELS } from "@/lib/graph-config";
import Link from "next/link";

interface IsnadChainProps {
  chain: ChainNarrator[];
  className?: string;
}

/**
 * Vertical chain visualization showing the hadith transmission chain
 * with clear flow direction from first narrator to last (companion)
 */
export default function IsnadChain({ chain, className = "" }: IsnadChainProps) {
  if (!chain || chain.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        لا توجد سلسلة رواة
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
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
                        {narrator.name || "غير معروف"}
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
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
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

              {/* Connector arrow to next narrator */}
              {!isLast && (
                <div className="flex flex-col items-center py-2">
                  {/* Vertical line */}
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: index * 0.08 + 0.15, duration: 0.2 }}
                    className="w-0.5 h-6 bg-gradient-to-b from-border to-muted-foreground/50"
                    style={{ transformOrigin: "top" }}
                  />
                  {/* Arrow down */}
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 + 0.2, duration: 0.2 }}
                  >
                    <svg
                      className="w-4 h-4 text-muted-foreground"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </motion.div>
                  {/* "روى عن" label */}
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.08 + 0.25, duration: 0.2 }}
                    className="text-xs text-muted-foreground mt-1"
                  >
                    روى عن
                  </motion.span>
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
            const colorKey = key as keyof typeof import("@/lib/graph-config").RANK_COLORS;
            const colors = {
              sahabi: "#F59E0B",
              thiqaThabt: "#10B981",
              thiqa: "#14B8A6",
              hafiz: "#06B6D4",
              default: "#8B5CF6",
            };
            return (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[colorKey] }}
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
