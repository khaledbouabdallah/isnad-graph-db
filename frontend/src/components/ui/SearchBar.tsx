"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { search } from "@/lib/api";
import type { SearchResults } from "@/lib/types";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await search(query);
        setResults(data);
        setIsOpen(true);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (type: "hadith" | "narrator", id: string | number) => {
    setIsOpen(false);
    setQuery("");
    if (type === "hadith") {
      router.push(`/hadith/${id}`);
    } else {
      router.push(`/narrator/${id}`);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results && setIsOpen(true)}
          placeholder="ابحث عن حديث أو راوي..."
          className="w-full px-4 py-3 pr-12 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && results && (results.narrators.length > 0 || results.hadiths.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* Narrators */}
            {results.narrators.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-secondary text-sm font-semibold text-muted-foreground">
                  الرواة
                </div>
                {results.narrators.slice(0, 5).map((narrator) => (
                  <button
                    key={narrator.id}
                    onClick={() => handleSelect("narrator", narrator.id)}
                    className="w-full px-4 py-3 text-right hover:bg-secondary transition-colors flex items-center justify-between"
                  >
                    <span>{narrator.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {narrator.rank}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Hadiths */}
            {results.hadiths.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-secondary text-sm font-semibold text-muted-foreground">
                  الأحاديث
                </div>
                {results.hadiths.slice(0, 5).map((hadith) => (
                  <button
                    key={hadith.number}
                    onClick={() => handleSelect("hadith", hadith.number)}
                    className="w-full px-4 py-3 text-right hover:bg-secondary transition-colors"
                  >
                    <span className="text-primary ml-2">
                      حديث {hadith.number}
                    </span>
                    <span className="text-sm text-muted-foreground line-clamp-1">
                      {hadith.matn?.slice(0, 50)}...
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
