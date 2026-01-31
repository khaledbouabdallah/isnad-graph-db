"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Link as LinkIcon, GitBranch } from "lucide-react";
import type { HadithDetail } from "@/lib/types";
import { ChainTabs, CHAIN_TYPE_CONFIG } from "./ChainTabs";

// Marker colors matching the graph
const MARKER_STYLES = {
  variant: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1 rounded",
  note: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1 rounded",
};

interface HadithSidePanelProps {
  hadithNumber: number | null;
  isOpen: boolean;
  onClose: () => void;
  onNarratorClick?: (narratorId: string) => void;
}

export function HadithSidePanel({
  hadithNumber,
  isOpen,
  onClose,
  onNarratorClick,
}: HadithSidePanelProps) {
  const [hadith, setHadith] = useState<HadithDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChainIndex, setActiveChainIndex] = useState(0);

  useEffect(() => {
    if (!hadithNumber || !isOpen) {
      return;
    }

    const fetchHadith = async () => {
      setLoading(true);
      setError(null);
      setActiveChainIndex(0); // Reset to primary chain
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const response = await fetch(`${API_BASE}/hadiths/${hadithNumber}`);
        if (!response.ok) {
          throw new Error("Failed to fetch hadith");
        }
        const data = await response.json();
        setHadith(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setHadith(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHadith();
  }, [hadithNumber, isOpen]);

  // Highlight chain markers in the full text
  const highlightedFullText = useMemo(() => {
    if (!hadith?.full_text || !hadith.chains || hadith.chains.length <= 1) {
      return hadith?.full_text || null;
    }

    // Collect all markers from variant and note chains
    const markers: { text: string; type: "variant" | "note" }[] = [];
    hadith.chains.forEach((chain) => {
      if (chain.chain_type !== "primary" && chain.marker) {
        markers.push({
          text: chain.marker,
          type: chain.chain_type === "note" ? "note" : "variant",
        });
      }
    });

    if (markers.length === 0) {
      return hadith.full_text;
    }

    // Build regex to match all markers
    const markerTexts = markers.map(m => m.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${markerTexts.join('|')})`, 'g');

    // Split text and wrap markers with styled spans
    const parts = hadith.full_text.split(regex);

    return parts.map((part, index) => {
      const marker = markers.find(m => m.text === part);
      if (marker) {
        return (
          <span key={index} className={MARKER_STYLES[marker.type]}>
            {part}
          </span>
        );
      }
      return part;
    });
  }, [hadith?.full_text, hadith?.chains]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Side Panel - Left side */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-full sm:w-[600px] bg-background border-r border-border shadow-2xl z-[150] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                تفاصيل الحديث
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                aria-label="Close panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                  <p className="font-semibold">خطأ</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              )}

              {!loading && !error && hadith && (
                <div className="space-y-6">
                  {/* Hadith Number */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                    <div className="text-center">
                      <div className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
                        رقم الحديث
                      </div>
                      <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                        {hadith.number}
                      </div>
                      {/* Compound Isnad Badge */}
                      {hadith.is_compound_isnad && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                          <GitBranch className="w-4 h-4" />
                          <span>إسناد مركب - {hadith.chains.length} طرق</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hadith Text (Matn) */}
                  {hadith.matn && (
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h4 className="text-lg font-bold mb-3">متن الحديث</h4>
                      <p className="text-lg leading-loose text-right">
                        {hadith.matn}
                      </p>
                    </div>
                  )}

                  {/* Full Text if available */}
                  {hadith.full_text && hadith.full_text !== hadith.matn && (
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h4 className="text-lg font-bold mb-3">النص الكامل</h4>
                      <p className="text-base leading-relaxed text-right text-muted-foreground">
                        {highlightedFullText}
                      </p>
                      {hadith.chains && hadith.chains.length > 1 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className={`${MARKER_STYLES.variant} font-medium`}>طريق آخر</span>
                          <span className={`${MARKER_STYLES.note} font-medium`}>ملاحظة</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Narrator Chains */}
                  {hadith.chains && hadith.chains.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-primary" />
                        سلسلة الإسناد
                        {hadith.chains.length === 1 && (
                          <span className="text-muted-foreground font-normal">
                            ({hadith.chains[0].narrators.length} راوٍ)
                          </span>
                        )}
                      </h4>

                      {/* Chain Tabs for compound isnads */}
                      <ChainTabs
                        chains={hadith.chains}
                        activeIndex={activeChainIndex}
                        onTabChange={setActiveChainIndex}
                      />

                      {/* Active Chain Display */}
                      {hadith.chains[activeChainIndex] && (
                        <div className="space-y-3">
                          {/* Chain type indicator for non-primary chains */}
                          {hadith.chains[activeChainIndex].chain_type !== "primary" && (
                            <div className={`
                              p-3 rounded-lg border text-sm
                              ${hadith.chains[activeChainIndex].chain_type === "variant"
                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                                : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                              }
                            `}>
                              <div className="font-semibold">
                                {hadith.chains[activeChainIndex].chain_type === "variant" ? "طريق آخر" : "ملاحظة"}
                              </div>
                              {hadith.chains[activeChainIndex].marker && (
                                <div className="mt-1 opacity-80">
                                  {hadith.chains[activeChainIndex].marker}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Narrators list */}
                          {hadith.chains[activeChainIndex].narrators.map((narrator, index) => (
                            <button
                              key={`${hadith.chains[activeChainIndex].chain_id}-${narrator.id}-${index}`}
                              onClick={() => onNarratorClick?.(narrator.id)}
                              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-right border border-border hover:border-primary"
                            >
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate">
                                  {narrator.fame || narrator.name}
                                </div>
                                {narrator.rank && (
                                  <div className="text-sm text-muted-foreground truncate">
                                    {narrator.rank}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}

                          {/* Chain narrator count */}
                          <div className="text-center text-sm text-muted-foreground pt-2">
                            {hadith.chains[activeChainIndex].narrators.length} راوٍ في هذا الطريق
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Source Link */}
                  {hadith.url && (
                    <div className="flex justify-center">
                      <a
                        href={hadith.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>عرض في المصدر</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
