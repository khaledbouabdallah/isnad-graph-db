"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Calendar, Star, Users } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { NarratorDetail } from "@/lib/types";

interface NarratorSidePanelProps {
  narratorId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onRelationClick?: (mainNarratorId: number, relatedNarratorId: number) => void;
}

export function NarratorSidePanel({
  narratorId,
  isOpen,
  onClose,
  onRelationClick,
}: NarratorSidePanelProps) {
  const [narrator, setNarrator] = useState<NarratorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);

  useEffect(() => {
    if (!narratorId || !isOpen) {
      return;
    }

    setSelectedRelationId(null);

    const fetchNarrator = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const response = await fetch(
          `${API_BASE}/narrators/${narratorId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch narrator");
        }
        const data = await response.json();
        setNarrator(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setNarrator(null);
      } finally {
        setLoading(false);
      }
    };

    fetchNarrator();
  }, [narratorId, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Side Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] bg-background border-l border-border shadow-2xl z-[150] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">تفاصيل الراوي</h2>
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

              {!loading && !error && narrator && (
                <div className="space-y-6">
                  {/* Main Info Card */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
                    <h3 className="text-2xl font-bold text-amber-900 mb-4">
                      {narrator.fame}
                    </h3>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {narrator.birth_year && (
                        <div className="flex items-center gap-2 text-amber-800">
                          <Calendar className="w-4 h-4" />
                          <span>
                            الميلاد: {formatNumber(narrator.birth_year)} هـ
                          </span>
                        </div>
                      )}
                      {narrator.death_year && (
                        <div className="flex items-center gap-2 text-amber-800">
                          <Calendar className="w-4 h-4" />
                          <span>
                            الوفاة: {formatNumber(narrator.death_year)} هـ
                          </span>
                        </div>
                      )}
                    </div>

                    {narrator.rank && (
                      <div className="mt-4 flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-600" />
                        <span className="text-amber-900 font-semibold">
                          {narrator.rank}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-primary">
                        {formatNumber(narrator.hadith_numbers?.length || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        أحاديث
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatNumber(narrator.teachers.length)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        شيوخ
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatNumber(narrator.students.length)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        تلاميذ
                      </div>
                    </div>
                  </div>

                  {/* Teachers Section */}
                  {narrator.teachers.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        روى عن (الشيوخ)
                      </h4>
                      <div className="space-y-2">
                        {narrator.teachers.map((teacher) => {
                          const isSelected = selectedRelationId === teacher.id;
                          return (
                            <button
                              key={teacher.id}
                              onClick={() => {
                                const newSelectedId = isSelected ? null : teacher.id;
                                setSelectedRelationId(newSelectedId);
                                if (newSelectedId && onRelationClick) {
                                  onRelationClick(Number(narrator.id), Number(teacher.id));
                                } else if (!newSelectedId && onRelationClick) {
                                  onRelationClick(Number(narrator.id), Number(narrator.id));
                                }
                              }}
                              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all border-2 ${
                                isSelected
                                  ? "bg-blue-600 border-blue-700 shadow-lg scale-105"
                                  : "bg-blue-50 hover:bg-blue-100 border-blue-100 hover:border-blue-200"
                              }`}
                            >
                              <span className={`font-medium ${
                                isSelected ? "text-white" : "text-blue-900"
                              }`}>
                                {teacher.fame}
                              </span>
                              <span className={`text-sm ${
                                isSelected ? "text-blue-100" : "text-blue-700"
                              }`}>
                                {formatNumber(teacher.hadith_count)} حديث
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Students Section */}
                  {narrator.students.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-6">
                      <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-600" />
                        روى عنه (التلاميذ)
                      </h4>
                      <div className="space-y-2">
                        {narrator.students.map((student) => {
                          const isSelected = selectedRelationId === student.id;
                          return (
                            <button
                              key={student.id}
                              onClick={() => {
                                const newSelectedId = isSelected ? null : student.id;
                                setSelectedRelationId(newSelectedId);
                                if (newSelectedId && onRelationClick) {
                                  onRelationClick(Number(narrator.id), Number(student.id));
                                } else if (!newSelectedId && onRelationClick) {
                                  onRelationClick(Number(narrator.id), Number(narrator.id));
                                }
                              }}
                              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all border-2 ${
                                isSelected
                                  ? "bg-green-600 border-green-700 shadow-lg scale-105"
                                  : "bg-green-50 hover:bg-green-100 border-green-100 hover:border-green-200"
                              }`}
                            >
                              <span className={`font-medium ${
                                isSelected ? "text-white" : "text-green-900"
                              }`}>
                                {student.fame}
                              </span>
                              <span className={`text-sm ${
                                isSelected ? "text-green-100" : "text-green-700"
                              }`}>
                                {formatNumber(student.hadith_count)} حديث
                              </span>
                            </button>
                          );
                        })}
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
