"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Narrator } from "@/lib/types";
import { getRankColor, formatNumber } from "@/lib/utils";

interface NarratorCardProps {
  narrator: Narrator;
  index?: number;
}

export default function NarratorCard({ narrator, index = 0 }: NarratorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/narrator/${narrator.id}`}
        className="block p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-all hover:bg-secondary group"
      >
        <div className="flex items-center gap-4">
          {/* Rank indicator */}
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getRankColor(narrator.rank) }}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {narrator.fame || "غير معروف"}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {narrator.rank || "غير محدد"}
            </p>
            {narrator.death_year && (
              <p className="text-xs text-muted-foreground">
                توفي: {narrator.death_year} هـ
              </p>
            )}
          </div>

          {/* Connection count */}
          {narrator.hadith_count && (
            <div className="text-left">
              <p className="text-lg font-bold text-primary">
                {formatNumber(narrator.hadith_count)}
              </p>
              <p className="text-xs text-muted-foreground">اتصال</p>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
