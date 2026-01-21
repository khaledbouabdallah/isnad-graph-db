"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Hash, Link as LinkIcon } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface Hadith {
  number: number;
  book: string;
  chapter: string;
  matn: string;
  full_text: string;
  chain: Array<{ id: number; name: string; fame: string }>;
  chain_length: number;
}

interface HadithSidePanelProps {
  hadithNumber: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function HadithSidePanel({
  hadithNumber,
  isOpen,
  onClose,
}: HadithSidePanelProps) {
  const [hadith, setHadith] = useState<Hadith | null>(null);
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
        const response = await fetch(
          `${API_BASE}/hadiths/${hadithNumber}`
        );
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Side Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[600px] bg-background border-l border-border shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">تفاصيل الحديث</h2>
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
                  {/* Header Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Hash className="w-6 h-6 text-blue-600" />
                      <h3 className="text-2xl font-bold text-blue-900">
                        حديث رقم {formatNumber(hadith.number)}
                      </h3>
                    </div>

                    {hadith.book && (
                      <div className="flex items-center gap-2 text-blue-800 mb-2">
                        <BookOpen className="w-4 h-4" />
                        <span className="font-semibold">{hadith.book}</span>
                      </div>
                    )}

                    {hadith.chapter && (
                      <div className="text-sm text-blue-700 mr-6">
                        {hadith.chapter}
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-2 text-blue-800">
                      <LinkIcon className="w-4 h-4" />
                      <span className="text-sm">
                        السلسلة: {formatNumber(hadith.chain_length || hadith.chain?.length || 0)} راوي
                      </span>
                    </div>
                  </div>

                  {/* Hadith Text */}
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <span>📜</span>
                      متن الحديث
                    </h4>
                    <p className="text-lg leading-loose whitespace-pre-wrap text-foreground">
                      {hadith.matn || hadith.full_text || "لا يوجد نص"}
                    </p>
                  </div>

                  {/* Isnad Chain */}
                  {hadith.chain && hadith.chain.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span>🔗</span>
                        سلسلة الإسناد ({hadith.chain.length} راوي)
                      </h4>
                      <div className="space-y-2">
                        {hadith.chain.map((narrator, index) => (
                          <div
                            key={`${narrator.id}-${index}`}
                            className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold">{narrator.fame || narrator.name}</div>
                            </div>
                          </div>
                        ))}
                      </div>
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
