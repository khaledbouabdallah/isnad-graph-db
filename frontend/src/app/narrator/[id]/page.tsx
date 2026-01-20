"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { getNarrator, getNarratorGraph } from "@/lib/api";
import { Navbar } from "@/components/ui";
import type { NarratorDetail, GraphData } from "@/lib/types";
import { getRankColor, formatNumber } from "@/lib/utils";
import Link from "next/link";

const EgoGraph = dynamic(
  () => import("@/components/graph/EgoGraph"),
  { ssr: false }
);

export default function NarratorPage() {
  const params = useParams();
  const router = useRouter();
  const narratorId = params.id as string;

  const [narrator, setNarrator] = useState<NarratorDetail | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [narratorData, graphDataResult] = await Promise.all([
          getNarrator(narratorId),
          getNarratorGraph(narratorId, 1),
        ]);
        setNarrator(narratorData);
        setGraphData(graphDataResult);
      } catch (error) {
        console.error("Failed to load narrator:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [narratorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!narrator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">الراوي غير موجود</h1>
          <Link href="/narrators" className="text-primary hover:underline">
            العودة للرواة
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
            <button
              onClick={() => router.back()}
              className="mb-4 p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              رجوع
            </button>

            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: getRankColor(narrator.rank) }}
              >
                👤
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">
                  {narrator.fame || "غير معروف"}
                </h1>
                <p className="text-lg text-muted-foreground mb-2">
                  {narrator.rank || "غير محدد"}
                </p>
                {(narrator.birth_year || narrator.death_year) && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {narrator.birth_year && (
                      <span className="flex items-center gap-1">
                        <span>🌟</span>
                        <span>ولد: {narrator.birth_year} هـ</span>
                      </span>
                    )}
                    {narrator.death_year && (
                      <span className="flex items-center gap-1">
                        <span>📅</span>
                        <span>توفي: {narrator.death_year} هـ</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-4">
                <div className="text-center p-4 bg-card rounded-xl border border-border">
                  <p className="text-2xl font-bold text-primary">
                    {formatNumber(narrator.total_connections)}
                  </p>
                  <p className="text-sm text-muted-foreground">إجمالي الاتصالات</p>
                </div>
                <div className="text-center p-4 bg-card rounded-xl border border-border">
                  <p className="text-2xl font-bold text-primary">
                    {formatNumber(narrator.hadith_numbers.length)}
                  </p>
                  <p className="text-sm text-muted-foreground">أحاديث</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Graph */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 bg-card border border-border rounded-2xl p-6"
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>🔗</span>
                شبكة الرواية
              </h2>
              {graphData && (
                <EgoGraph
                  data={graphData}
                  centerId={narratorId}
                  onNodeClick={(id) => router.push(`/narrator/${id}`)}
                  className="h-80"
                />
              )}
            </motion.div>

            {/* Teachers & Students */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Teachers */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span>⬆️</span>
                  شيوخه ({narrator.teachers.length})
                </h2>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {narrator.teachers.slice(0, 10).map((teacher) => (
                    <Link
                      key={teacher.id}
                      href={`/narrator/${teacher.id}`}
                      className="block p-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <p className="font-medium">{teacher.fame}</p>
                      <p className="text-sm text-muted-foreground">
                        {teacher.hadith_count} أحاديث
                      </p>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Students */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span>⬇️</span>
                  تلاميذه ({narrator.students.length})
                </h2>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {narrator.students.slice(0, 10).map((student) => (
                    <Link
                      key={student.id}
                      href={`/narrator/${student.id}`}
                      className="block p-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <p className="font-medium">{student.fame}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.hadith_count} أحاديث
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Hadiths */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>📖</span>
              الأحاديث التي يرويها ({narrator.hadith_numbers.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {narrator.hadith_numbers.slice(0, 50).map((num) => (
                <Link
                  key={num}
                  href={`/hadith/${num}`}
                  className="px-3 py-1 bg-secondary hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors text-sm"
                >
                  {num}
                </Link>
              ))}
              {narrator.hadith_numbers.length > 50 && (
                <span className="px-3 py-1 text-muted-foreground text-sm">
                  +{narrator.hadith_numbers.length - 50} أحاديث أخرى
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
