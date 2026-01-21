"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { getHadiths } from "@/lib/api";
import { Navbar, HadithCard, SearchBar, HadithSidePanel } from "@/components/ui";
import type { Hadith } from "@/lib/types";

export default function HadithsPage() {
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Side panel state
  const [selectedHadithNumber, setSelectedHadithNumber] = useState<number | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const loadHadiths = async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      const data = await getHadiths(pageNum * 20, 20);
      if (append) {
        setHadiths((prev) => [...prev, ...data]);
      } else {
        setHadiths(data);
      }
      setHasMore(data.length === 20);
    } catch (error) {
      console.error("Failed to load hadiths:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHadiths(0);
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadHadiths(nextPage, true);
  };

  // Handle hadith card click
  const handleHadithClick = useCallback((hadithNumber: number) => {
    setSelectedHadithNumber(hadithNumber);
    setIsPanelOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="text-3xl font-bold mb-4">أحاديث صحيح البخاري</h1>
            <p className="text-muted-foreground mb-6">
              تصفح وابحث في أحاديث صحيح البخاري
            </p>
            <div className="flex justify-center">
              <SearchBar />
            </div>
          </motion.div>

          {/* Hadith List */}
          <div className="space-y-4">
            {hadiths.map((hadith, index) => (
              <HadithCard
                key={hadith.number}
                hadith={hadith}
                index={index}
                onClick={handleHadithClick}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    جاري التحميل...
                  </span>
                ) : (
                  "تحميل المزيد"
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Hadith Side Panel */}
      <HadithSidePanel
        hadithNumber={selectedHadithNumber}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  );
}
