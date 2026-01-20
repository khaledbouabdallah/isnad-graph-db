"use client";

import { motion } from "framer-motion";
import { formatNumber } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  delay?: number;
}

export default function StatCard({ title, value, icon, delay = 0 }: StatCardProps) {
  const displayValue = typeof value === "number" ? formatNumber(value) : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-3xl font-bold">{displayValue}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </div>
    </motion.div>
  );
}
