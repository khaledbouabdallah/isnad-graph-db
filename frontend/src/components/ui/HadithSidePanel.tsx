"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Link as LinkIcon, GitBranch, AlertCircle, AlertTriangle } from "lucide-react";
import type { HadithDetail } from "@/lib/types";

// Highlighting styles for full text
const HIGHLIGHT_STYLES = {
  variant: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1 rounded",
  note: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1 rounded",
  narrator: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-0.5 rounded font-semibold",
  matn: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 leading-relaxed",
};

interface HadithSidePanelProps {
  hadithNumber: number | null;
  isOpen: boolean;
  onClose: () => void;
  onNarratorClick?: (narratorId: string) => void;
  missingChainNodes?: number; // Number of chain nodes not visible in current graph
}

export function HadithSidePanel({
  hadithNumber,
  isOpen,
  onClose,
  onNarratorClick,
  missingChainNodes = 0,
}: HadithSidePanelProps) {
  const [hadith, setHadith] = useState<HadithDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hadithNumber || !isOpen) {
      return;
    }

    const fetchHadith = async () => {
      setLoading(true);
      setError(null);
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

  // Highlight narrators, matn, and chain markers in the full text
  const highlightedFullText = useMemo(() => {
    if (!hadith?.full_text) {
      return null;
    }

    const fullText = hadith.full_text;

    // Collect all items to highlight with their positions
    interface HighlightItem {
      start: number;
      end: number;
      type: "narrator" | "matn" | "variant" | "note";
      text: string;
    }
    const highlights: HighlightItem[] = [];

    // Add narrator names to highlights
    if (hadith.chains) {
      hadith.chains.forEach((chain) => {
        chain.narrators.forEach((narrator) => {
          const name = narrator.name;
          if (name) {
            let pos = 0;
            while ((pos = fullText.indexOf(name, pos)) !== -1) {
              highlights.push({
                start: pos,
                end: pos + name.length,
                type: "narrator",
                text: name,
              });
              pos += name.length;
            }
          }
        });

        // Add chain markers
        if (chain.chain_type !== "primary" && chain.marker) {
          const marker = chain.marker;
          let pos = 0;
          while ((pos = fullText.indexOf(marker, pos)) !== -1) {
            highlights.push({
              start: pos,
              end: pos + marker.length,
              type: chain.chain_type === "note" ? "note" : "variant",
              text: marker,
            });
            pos += marker.length;
          }
        }
      });
    }

    // Add matn to highlights
    if (hadith.matn) {
      const matnPos = fullText.indexOf(hadith.matn);
      if (matnPos !== -1) {
        highlights.push({
          start: matnPos,
          end: matnPos + hadith.matn.length,
          type: "matn",
          text: hadith.matn,
        });
      }
    }

    // Sort by position and remove overlaps (prefer matn > narrator > markers)
    highlights.sort((a, b) => a.start - b.start);

    // Remove overlapping highlights (keep first one found at each position)
    const nonOverlapping: HighlightItem[] = [];
    let lastEnd = 0;
    for (const h of highlights) {
      if (h.start >= lastEnd) {
        nonOverlapping.push(h);
        lastEnd = h.end;
      }
    }

    if (nonOverlapping.length === 0) {
      return fullText;
    }

    // Build the highlighted text
    const result: React.ReactNode[] = [];
    let currentPos = 0;

    nonOverlapping.forEach((h, index) => {
      // Add text before this highlight
      if (h.start > currentPos) {
        result.push(fullText.slice(currentPos, h.start));
      }

      // Add highlighted text
      result.push(
        <span key={index} className={HIGHLIGHT_STYLES[h.type]}>
          {h.text}
        </span>
      );

      currentPos = h.end;
    });

    // Add remaining text
    if (currentPos < fullText.length) {
      result.push(fullText.slice(currentPos));
    }

    return result;
  }, [hadith?.full_text, hadith?.chains, hadith?.matn]);

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

                  {/* Missing nodes warning */}
                  {missingChainNodes > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                            بعض الرواة غير ظاهرين
                          </div>
                          <div className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                            {missingChainNodes} راوٍ من سلسلة الإسناد غير موجود في الرسم البياني الحالي.
                            قم بزيادة عدد العُقَد أو تغيير الفلتر لعرض السلسلة كاملة.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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
                      <p className="text-base leading-relaxed text-right">
                        {highlightedFullText}
                      </p>
                      {/* Legend for highlights */}
                      <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <span className={`${HIGHLIGHT_STYLES.narrator} px-2`}>راوي</span>
                          <span className="text-muted-foreground">الرواة</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className={`${HIGHLIGHT_STYLES.matn} px-2`}>متن</span>
                          <span className="text-muted-foreground">نص الحديث</span>
                        </span>
                        {hadith.chains && hadith.chains.length > 1 && (
                          <>
                            <span className="flex items-center gap-1">
                              <span className={`${HIGHLIGHT_STYLES.variant} px-2`}>طريق</span>
                              <span className="text-muted-foreground">طريق آخر</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className={`${HIGHLIGHT_STYLES.note} px-2`}>ملاحظة</span>
                              <span className="text-muted-foreground">إضافة</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Narrator Chain - Primary Only */}
                  {hadith.chains && hadith.chains.length > 0 && (() => {
                    const primaryChain = hadith.chains.find(c => c.chain_type === "primary") || hadith.chains[0];
                    const variantCount = hadith.chains.filter(c => c.chain_type === "variant").length;
                    const noteCount = hadith.chains.filter(c => c.chain_type === "note").length;

                    return (
                      <div className="bg-card border border-border rounded-2xl p-6">
                        <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <LinkIcon className="w-5 h-5 text-primary" />
                          سلسلة الإسناد
                          <span className="text-muted-foreground font-normal">
                            ({primaryChain.narrators.length} راوٍ)
                          </span>
                        </h4>

                        {/* Variant/Note indicator badge */}
                        {(variantCount > 0 || noteCount > 0) && (
                          <div className="mb-4 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                  إسناد مركب
                                </div>
                                <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                  يُعرض الطريق الأساسي فقط. يوجد{" "}
                                  {variantCount > 0 && (
                                    <span className="font-semibold">{variantCount} طريق آخر</span>
                                  )}
                                  {variantCount > 0 && noteCount > 0 && " و "}
                                  {noteCount > 0 && (
                                    <span className="font-semibold">{noteCount} ملاحظة</span>
                                  )}
                                  {" "}في النص الكامل.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Primary Chain Narrators */}
                        <div className="space-y-3">
                          {primaryChain.narrators.map((narrator, index) => (
                            <button
                              key={`${primaryChain.chain_id}-${narrator.id}-${index}`}
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
                        </div>
                      </div>
                    );
                  })()}

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
