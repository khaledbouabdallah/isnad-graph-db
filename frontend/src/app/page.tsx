"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { getStats, getGraphOverview } from "@/lib/api";
import { Navbar, SearchBar, StatCard } from "@/components/ui";
import type { DatabaseStats, GraphData } from "@/lib/types";
import Link from "next/link";

// Dynamic import for Sigma.js (no SSR)
const NetworkGraph = dynamic(
  () => import("@/components/graph/NetworkGraph"),
  { ssr: false }
);

export default function HomePage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, graphDataResult] = await Promise.all([
          getStats(),
          getGraphOverview(200), // Load smaller subset for landing
        ]);
        setStats(statsData);
        setGraphData(graphDataResult);
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-l from-primary via-accent to-primary bg-clip-text text-transparent">
              مستكشف الإسناد
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              استكشف أحاديث صحيح البخاري وسلاسل الرواة بطريقة تفاعلية ومرئية
            </p>

            {/* Search Bar */}
            <div className="flex justify-center mb-8">
              <SearchBar />
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/explore"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <span>🔍</span>
                استكشاف الشبكة
              </Link>
              <Link
                href="/hadiths"
                className="px-6 py-3 bg-secondary text-secondary-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-colors flex items-center gap-2"
              >
                <span>📖</span>
                تصفح الأحاديث
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              <StatCard
                title="عدد الأحاديث"
                value={stats.total_hadiths}
                delay={0}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                }
              />
              <StatCard
                title="عدد الرواة"
                value={stats.total_narrators}
                delay={0.1}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              />
              <StatCard
                title="سلاسل الرواية"
                value={stats.total_edges}
                delay={0.2}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                }
              />
              <StatCard
                title="متوسط طول السلسلة"
                value={stats.avg_chain_length}
                delay={0.3}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
            </div>
          )}

          {/* Graph Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold">شبكة الرواة</h2>
              <Link
                href="/explore"
                className="text-sm text-primary hover:underline"
              >
                عرض الكل ←
              </Link>
            </div>
            <div className="h-[500px]">
              {graphData ? (
                <NetworkGraph
                  data={graphData}
                  onNodeClick={(id) => (window.location.href = `/narrator/${id}`)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </motion.div>

          {/* Top Narrators */}
          {stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-12"
            >
              <h2 className="text-2xl font-bold mb-6">أكثر الرواة اتصالاً</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.top_narrators.map((narrator, index) => (
                  <div
                    key={index}
                    className="p-4 bg-card border border-border rounded-xl flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{narrator.fame}</h3>
                      <p className="text-sm text-muted-foreground">
                        {narrator.connections} اتصال
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
