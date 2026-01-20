import type {
  Hadith,
  HadithDetail,
  Narrator,
  NarratorDetail,
  GraphData,
  DatabaseStats,
  SearchResults,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Hadiths
export async function getHadiths(skip = 0, limit = 20): Promise<Hadith[]> {
  return fetchAPI(`/hadiths?skip=${skip}&limit=${limit}`);
}

export async function getHadith(number: number): Promise<HadithDetail> {
  return fetchAPI(`/hadiths/${number}`);
}

// Narrators
export async function getNarrators(skip = 0, limit = 20): Promise<Narrator[]> {
  return fetchAPI(`/narrators?skip=${skip}&limit=${limit}`);
}

export async function getTopNarrators(limit = 10): Promise<Narrator[]> {
  return fetchAPI(`/narrators/top?limit=${limit}`);
}

export async function getNarrator(id: string): Promise<NarratorDetail> {
  return fetchAPI(`/narrators/${id}`);
}

// Graph
export async function getGraphOverview(limit = 500): Promise<GraphData> {
  return fetchAPI(`/graph/overview?limit=${limit}`);
}

export async function getNarratorGraph(
  id: string,
  depth = 1
): Promise<GraphData> {
  return fetchAPI(`/graph/narrator/${id}?depth=${depth}`);
}

export async function getHadithGraph(number: number): Promise<GraphData> {
  return fetchAPI(`/graph/hadith/${number}`);
}

// Search
export async function search(query: string): Promise<SearchResults> {
  return fetchAPI(`/search?q=${encodeURIComponent(query)}`);
}

export async function searchHadiths(query: string, limit = 20): Promise<Hadith[]> {
  return fetchAPI(`/search/hadiths?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function searchNarrators(query: string, limit = 20): Promise<Narrator[]> {
  return fetchAPI(`/search/narrators?q=${encodeURIComponent(query)}&limit=${limit}`);
}

// Stats
export async function getStats(): Promise<DatabaseStats> {
  return fetchAPI("/stats");
}
