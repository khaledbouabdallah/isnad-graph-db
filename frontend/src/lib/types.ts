// Hadith types
export interface ChainNarrator {
  id: string;
  name: string | null;
  rank: string | null;
  fame: string | null;
  position: number;
}

export interface Hadith {
  number: number;
  matn: string | null;
  chain_length: number | null;
  first_narrator: string | null;
}

export interface HadithDetail {
  number: number;
  matn: string | null;
  full_text: string | null;
  url: string | null;
  chain: ChainNarrator[];
}

// Narrator types
export interface Narrator {
  id: string;
  name: string | null;
  rank: string | null;
  fame: string | null;
  birth_year: number | null;
  death_year: number | null;
  hadith_count: number | null;
}

export interface NarratorConnection {
  id: string;
  name: string | null;
  fame: string | null;
  rank: string | null;
  birth_year: number | null;
  death_year: number | null;
  hadith_count: number;
}

export interface NarratorDetail {
  id: string;
  name: string | null;
  rank: string | null;
  fame: string | null;
  birth_year: number | null;
  death_year: number | null;
  total_connections: number;
  teachers: NarratorConnection[];
  students: NarratorConnection[];
  hadith_numbers: number[];
}

// Graph types
export interface GraphNode {
  id: string;
  label: string | null;
  rank: string | null;
  size: number;
  color: string | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Stats types
export interface TopNarrator {
  name: string;
  fame: string;
  rank: string;
  connections: number;
}

export interface DatabaseStats {
  total_hadiths: number;
  total_narrators: number;
  total_edges: number;
  avg_chain_length: number;
  top_narrators: TopNarrator[];
}

// Search types
export interface SearchResults {
  narrators: Narrator[];
  hadiths: Hadith[];
}
