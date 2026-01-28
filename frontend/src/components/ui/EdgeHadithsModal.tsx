"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen } from "lucide-react";
import type { Hadith } from "@/lib/types";

interface EdgeHadithsModalProps {
  sourceId: string | null;
  targetId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onHadithClick: (hadithNumber: number) => void;
}

export function EdgeHadithsModal({
  sourceId,
  targetId,
  isOpen,
  onClose,
  onHadithClick,
}: EdgeHadithsModalProps) {
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceId || !targetId || !isOpen) {
      return;
    }

    const fetchHadiths = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const response = await fetch(
          `${API_BASE}/graph/relationship/${sourceId}/${targetId}/hadiths`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch hadiths");
        }
        const data = await response.json();
        setHadiths(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setHadiths([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHadiths();
  }, [sourceId, targetId, isOpen]);

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[140]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-background border border-border rounded-2xl shadow-2xl z-[150] max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-border p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-bold text-emerald-900">
                  الأحاديث المشتركة
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-emerald-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-emerald-900" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                  <p className="font-semibold">خطأ</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              )}

              {!loading && !error && hadiths.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  لا توجد أحاديث مشتركة لهذه العلاقة
                </div>
              )}

              {!loading && !error && hadiths.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    تم العثور على {hadiths.length} حديث مشترك
                  </p>
                  {hadiths.map((hadith) => (
                    <button
                      key={hadith.number}
                      onClick={() => {
                        onHadithClick(hadith.number);
                        onClose();
                      }}
                      className="w-full p-4 text-right bg-card hover:bg-secondary border border-border rounded-lg transition-all hover:shadow-md"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-bold rounded">
                          {hadith.number}
                        </span>
                        {hadith.first_narrator && (
                          <span className="text-sm text-muted-foreground">
                            {hadith.first_narrator}
                          </span>
                        )}
                      </div>
                      {hadith.matn && (
                        <div className="text-base text-foreground line-clamp-3 leading-relaxed">
                          {hadith.matn}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
