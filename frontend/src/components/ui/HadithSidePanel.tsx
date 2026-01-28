"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Link as LinkIcon } from "lucide-react";
import type { HadithDetail } from "@/lib/types";

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
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4">
                    <div className="text-center">
                      <div className="text-sm text-emerald-700 font-semibold mb-1">
                        رقم الحديث
                      </div>
                      <div className="text-3xl font-bold text-emerald-900">
                        {hadith.number}
                      </div>
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
                        {hadith.full_text}
                      </p>
                    </div>
                  )}

                  {/* Narrator Chain */}
                  {hadith.chain && hadith.chain.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-primary" />
                        سلسلة الإسناد ({hadith.chain.length} راوٍ)
                      </h4>
                      <div className="space-y-3">
                        {hadith.chain.map((narrator, index) => (
                          <button
                            key={narrator.id}
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
