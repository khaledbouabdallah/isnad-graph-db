"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { getGraphOverview } from "@/lib/api";
import { Navbar } from "@/components/ui";
import type { GraphData } from "@/lib/types";

const NetworkGraph = dynamic(
  () => import("@/components/graph/NetworkGraph"),
  { ssr: false }
);

export default function ExplorePage() {
  const router = useRouter();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodeCount, setNodeCount] = useState(500);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await getGraphOverview(nodeCount);
        setGraphData(data);
      } catch (error) {
        console.error("Failed to load graph:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [nodeCount]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-16 h-screen flex flex-col">
        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-card border-b border-border flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl font-bold">استكشاف شبكة الرواة</h1>
            <p className="text-sm text-muted-foreground">
              {graphData
                ? `${graphData.nodes.length} راوي • ${graphData.edges.length} اتصال`
                : "جاري التحميل..."}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">عدد الرواة:</span>
              <select
                value={nodeCount}
                onChange={(e) => setNodeCount(parseInt(e.target.value))}
                className="bg-secondary border border-border rounded-lg px-3 py-1 text-sm"
              >
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={800}>800</option>
                <option value={1000}>1000</option>
              </select>
            </label>
          </div>
        </motion.div>

        {/* Graph */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">جاري تحميل الشبكة...</p>
              </div>
            </div>
          ) : graphData ? (
            <NetworkGraph
              data={graphData}
              onNodeClick={(id) => router.push(`/narrator/${id}`)}
              className="h-full"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground">فشل في تحميل البيانات</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-card border-t border-border flex items-center justify-center gap-6"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
            <span className="text-sm">صحابي</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#14B8A6" }} />
            <span className="text-sm">ثقة</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#10B981" }} />
            <span className="text-sm">ثقة ثبت</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#06B6D4" }} />
            <span className="text-sm">حافظ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#6366F1" }} />
            <span className="text-sm">آخرون</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
