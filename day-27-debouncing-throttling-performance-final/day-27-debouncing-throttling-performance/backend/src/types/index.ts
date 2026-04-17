// src/types/index.ts
// Types for the search autocomplete API.

export interface SearchSuggestion {
  id: string;
  text: string;         // The full suggestion text
  highlight: string;    // HTML with <mark> tags around matched characters
  category: string;
  score: number;        // Relevance score (higher = more relevant)
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  price?: number;
  highlight: string;    // Title with matched text highlighted
}

export interface SearchResponse {
  query: string;
  suggestions: SearchSuggestion[];
  results: SearchResult[];
  took: number;         // Server-side time in ms (for performance monitoring)
}
