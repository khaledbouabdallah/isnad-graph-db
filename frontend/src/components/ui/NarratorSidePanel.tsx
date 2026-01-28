"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Calendar, Star, Users, Search, BookOpen } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { NarratorDetail, Hadith } from "@/lib/types";

interface NarratorSidePanelProps {
  narratorId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onRelationClick?: (mainNarratorId: number, relatedNarratorId: number) => void;
  onHadithClick?: (hadithNumber: number) => void;
}

export function NarratorSidePanel({
  narratorId,
  isOpen,
  onClose,
  onRelationClick,
  onHadithClick,
}: NarratorSidePanelProps) {
  const [narrator, setNarrator] = useState<NarratorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);

  // Hadith search state
  const [hadithSearchQuery, setHadithSearchQuery] = useState("");
  const [hadithSearchResults, setHadithSearchResults] = useState<Hadith[]>([]);
  const [isSearchingHadiths, setIsSearchingHadiths] = useState(false);

  // Hadith list state
  const [narratorHadiths, setNarratorHadiths] = useState<Hadith[]>([]);
  const [filteredNarratorHadiths, setFilteredNarratorHadiths] = useState<Hadith[]>([]);
  const [loadingHadiths, setLoadingHadiths] = useState(false);
  const [hadithListFilter, setHadithListFilter] = useState("");

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

  // Hadith search effect
  useEffect(() => {
    if (!hadithSearchQuery.trim() || !isOpen) {
      setHadithSearchResults([]);
      return;
    }

    const searchHadiths = async () => {
      setIsSearchingHadiths(true);
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const response = await fetch(
          `${API_BASE}/search/hadiths?q=${encodeURIComponent(hadithSearchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setHadithSearchResults(data);
        }
      } catch (err) {
        console.error("Failed to search hadiths:", err);
      } finally {
        setIsSearchingHadiths(false);
      }
    };

    const debounce = setTimeout(searchHadiths, 300);
    return () => clearTimeout(debounce);
  }, [hadithSearchQuery, isOpen]);

  // Fetch narrator's hadiths list
  useEffect(() => {
    if (!narratorId || !isOpen) {
      setNarratorHadiths([]);
      setFilteredNarratorHadiths([]);
      return;
    }

    const fetchNarratorHadiths = async () => {
      setLoadingHadiths(true);
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const url = selectedRelationId
          ? `${API_BASE}/graph/narrator/${narratorId}/hadiths?related_narrator_id=${selectedRelationId}`
          : `${API_BASE}/graph/narrator/${narratorId}/hadiths`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setNarratorHadiths(data);
          setFilteredNarratorHadiths(data);
        }
      } catch (err) {
        console.error("Failed to fetch narrator hadiths:", err);
      } finally {
        setLoadingHadiths(false);
      }
    };

    fetchNarratorHadiths();
  }, [narratorId, selectedRelationId, isOpen]);

  // Filter hadith list based on search
  useEffect(() => {
    if (!hadithListFilter.trim()) {
      setFilteredNarratorHadiths(narratorHadiths);
      return;
    }

    const filtered = narratorHadiths.filter(
      (hadith) =>
        hadith.matn?.toLowerCase().includes(hadithListFilter.toLowerCase()) ||
        hadith.number.toString().includes(hadithListFilter)
    );
    setFilteredNarratorHadiths(filtered);
  }, [hadithListFilter, narratorHadiths]);

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

                  {/* Hadith Search Section */}
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h4 className="text-lg font-bold mb-4">بحث عن حديث</h4>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="ابحث في أحاديث هذا الراوي..."
                        value={hadithSearchQuery}
                        onChange={(e) => setHadithSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                      />
                    </div>

                    {/* Hadith Search Results */}
                    {hadithSearchResults.length > 0 && (
                      <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                        {hadithSearchResults.map((hadith) => (
                          <button
                            key={hadith.number}
                            onClick={() => {
                              if (onHadithClick) {
                                onHadithClick(hadith.number);
                                setHadithSearchQuery("");
                              }
                            }}
                            className="w-full p-3 text-right bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border border-border"
                          >
                            <div className="flex items-center gap-3 mb-1">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded">
                                {hadith.number}
                              </span>
                              {hadith.first_narrator && (
                                <span className="text-xs text-muted-foreground">
                                  {hadith.first_narrator}
                                </span>
                              )}
                            </div>
                            {hadith.matn && (
                              <div className="text-sm text-foreground line-clamp-2">
                                {hadith.matn}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {isSearchingHadiths && (
                      <div className="mt-3 text-center text-sm text-muted-foreground">
                        جاري البحث...
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

                  {/* Hadith List Section */}
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-600" />
                        قائمة الأحاديث
                        {selectedRelationId && (
                          <span className="text-sm font-normal text-muted-foreground">
                            (مشتركة)
                          </span>
                        )}
                      </h4>
                      <span className="text-sm text-muted-foreground">
                        {formatNumber(filteredNarratorHadiths.length)} حديث
                      </span>
                    </div>

                    {/* Hadith List Filter */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="ابحث في القائمة..."
                        value={hadithListFilter}
                        onChange={(e) => setHadithListFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right text-sm"
                      />
                    </div>

                    {/* Scrollable Hadith List */}
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {loadingHadiths && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          جاري التحميل...
                        </div>
                      )}

                      {!loadingHadiths && filteredNarratorHadiths.length === 0 && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          {hadithListFilter ? "لا توجد نتائج" : "لا توجد أحاديث"}
                        </div>
                      )}

                      {!loadingHadiths && filteredNarratorHadiths.map((hadith) => (
                        <button
                          key={hadith.number}
                          onClick={() => {
                            if (onHadithClick) {
                              onHadithClick(hadith.number);
                            }
                          }}
                          className="w-full p-3 text-right bg-background hover:bg-secondary/50 rounded-lg transition-colors border border-border hover:border-emerald-300"
                        >
                          <div className="flex items-center gap-3 mb-1">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded">
                              {hadith.number}
                            </span>
                            {hadith.first_narrator && (
                              <span className="text-xs text-muted-foreground truncate">
                                {hadith.first_narrator}
                              </span>
                            )}
                          </div>
                          {hadith.matn && (
                            <div className="text-sm text-foreground line-clamp-2 leading-relaxed">
                              {hadith.matn}
                            </div>
                          )}
                        </button>
                      ))}
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
