"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Hadith } from "@/lib/types";
import { truncate } from "@/lib/utils";

interface HadithCardProps {
  hadith: Hadith;
  index?: number;
}

export default function HadithCard({ hadith, index = 0 }: HadithCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/hadith/${hadith.number}`}
        className="block p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-all hover:bg-secondary group"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold text-primary">
            حديث رقم {hadith.number}
          </span>
          {hadith.chain_length && (
            <span className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded">
              {hadith.chain_length} رواة
            </span>
          )}
        </div>

        {/* First narrator */}
        {hadith.first_narrator && (
          <p className="text-sm text-muted-foreground mb-2">
            عن {hadith.first_narrator}
          </p>
        )}

        {/* Matn preview */}
        {hadith.matn && (
          <p className="text-foreground/80 leading-relaxed">
            {truncate(hadith.matn, 120)}
          </p>
        )}

        {/* Read more indicator */}
        <div className="mt-3 flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-sm">عرض التفاصيل</span>
          <svg
            className="w-4 h-4"
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
      </Link>
    </motion.div>
  );
}
