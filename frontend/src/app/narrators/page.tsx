"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getNarrators } from "@/lib/api";
import { Navbar, NarratorCard, SearchBar } from "@/components/ui";
import type { Narrator } from "@/lib/types";

export default function NarratorsPage() {
  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadNarrators = async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      const data = await getNarrators(pageNum * 20, 20);
      if (append) {
        setNarrators((prev) => [...prev, ...data]);
      } else {
        setNarrators(data);
      }
      setHasMore(data.length === 20);
    } catch (error) {
      console.error("Failed to load narrators:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNarrators(0);
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadNarrators(nextPage, true);
  };

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
            <h1 className="text-3xl font-bold mb-4">رواة صحيح البخاري</h1>
            <p className="text-muted-foreground mb-6">
              استكشف رواة الحديث وسلاسل الإسناد
            </p>
            <div className="flex justify-center">
              <SearchBar />
            </div>
          </motion.div>

          {/* Narrator List */}
          <div className="space-y-3">
            {narrators.map((narrator, index) => (
              <NarratorCard key={narrator.id} narrator={narrator} index={index} />
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
    </div>
  );
}
