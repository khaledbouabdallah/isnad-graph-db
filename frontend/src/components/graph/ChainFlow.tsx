"use client";

import { motion } from "framer-motion";
import type { ChainNarrator } from "@/lib/types";
import { getRankColor } from "@/lib/utils";
import Link from "next/link";

interface ChainFlowProps {
  chain: ChainNarrator[];
  className?: string;
}

export default function ChainFlow({ chain, className = "" }: ChainFlowProps) {
  return (
    <div className={`flex flex-col gap-0 ${className}`}>
      {chain.map((narrator, index) => (
        <motion.div
          key={narrator.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-3"
        >
          {/* Connector line */}
          {index > 0 && (
            <div className="w-px h-8 bg-gradient-to-b from-primary/50 to-primary/20 mr-4" />
          )}

          {/* Node */}
          <Link
            href={`/narrator/${narrator.id}`}
            className="group flex items-center gap-3 p-3 rounded-lg bg-card hover:bg-secondary transition-colors"
          >
            {/* Position number */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ backgroundColor: getRankColor(narrator.rank) }}
            >
              {index + 1}
            </div>

            {/* Narrator info */}
            <div className="flex-1">
              <h4 className="font-semibold group-hover:text-primary transition-colors">
                {narrator.name || "غير معروف"}
              </h4>
              {narrator.rank && (
                <p className="text-sm text-muted-foreground">{narrator.rank}</p>
              )}
            </div>

            {/* Arrow */}
            <svg
              className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors"
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
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
