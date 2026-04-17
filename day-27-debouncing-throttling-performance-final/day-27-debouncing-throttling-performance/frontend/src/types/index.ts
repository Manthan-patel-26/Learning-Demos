// src/types/index.ts

export interface SearchSuggestion {
  id: string;
  text: string;
  highlight: string;   // HTML string with <mark> tags
  category: string;
  score: number;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  price?: number;
  highlight: string;
}

export interface SuggestionsResponse {
  query: string;
  suggestions: SearchSuggestion[];
  took: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  took: number;
}
