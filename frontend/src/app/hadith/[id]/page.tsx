"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { getHadith, getHadithGraph } from "@/lib/api";
import { Navbar } from "@/components/ui";
import { IsnadChain } from "@/components/graph";
import type { HadithDetail, GraphData } from "@/lib/types";
import Link from "next/link";

const NetworkGraph = dynamic(
  () => import("@/components/graph/NetworkGraph"),
  { ssr: false }
);

export default function HadithPage() {
  const params = useParams();
  const router = useRouter();
  const hadithNumber = parseInt(params.id as string);

  const [hadith, setHadith] = useState<HadithDetail | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"chain" | "graph">("chain");

  useEffect(() => {
    async function loadData() {
      try {
        const [hadithData, graphDataResult] = await Promise.all([
          getHadith(hadithNumber),
          getHadithGraph(hadithNumber),
        ]);
        setHadith(hadithData);
        setGraphData(graphDataResult);
      } catch (error) {
        console.error("Failed to load hadith:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [hadithNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hadith) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">الحديث غير موجود</h1>
          <Link href="/hadiths" className="text-primary hover:underline">
            العودة للأحاديث
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-primary">
                  حديث رقم {hadith.number}
                </h1>
                <p className="text-muted-foreground">
                  سلسلة من {hadith.chain.length} رواة
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Link
                href={`/hadith/${hadithNumber - 1}`}
                className={`px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors ${
                  hadithNumber <= 1 ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                ← السابق
              </Link>
              <Link
                href={`/hadith/${hadithNumber + 1}`}
                className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                التالي →
              </Link>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Matn (Hadith Text) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-2xl p-6"
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>📜</span>
                متن الحديث
              </h2>
              <p className="text-lg leading-loose whitespace-pre-wrap">
                {hadith.matn || hadith.full_text || "لا يوجد نص"}
              </p>
            </motion.div>

            {/* Chain Visualization */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>🔗</span>
                  سلسلة الإسناد
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("chain")}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      viewMode === "chain"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    قائمة
                  </button>
                  <button
                    onClick={() => setViewMode("graph")}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      viewMode === "graph"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    رسم بياني
                  </button>
                </div>
              </div>

              {viewMode === "chain" ? (
                <IsnadChain chain={hadith.chain} />
              ) : (
                <div className="h-96">
                  {graphData && (
                    <NetworkGraph
                      data={graphData}
                      onNodeClick={(id) => router.push(`/narrator/${id}`)}
                    />
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
