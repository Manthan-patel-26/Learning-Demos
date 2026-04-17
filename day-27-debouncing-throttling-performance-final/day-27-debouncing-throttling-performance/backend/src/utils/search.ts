// src/utils/search.ts
// In-memory search with relevance scoring and HTML highlighting.
//
// In production, use a dedicated search engine:
//   - Elasticsearch / OpenSearch: enterprise full-text search
//   - Meilisearch: developer-friendly, instant search
//   - Typesense: open-source Algolia alternative
//   - Postgres tsvector: built-in full-text search for smaller datasets
//
// This implementation demonstrates the concepts without external dependencies.

import { PRODUCTS } from './data.js';
import { SearchSuggestion, SearchResult } from '../types/index.js';

/**
 * Wraps matched substrings with <mark> tags for highlight rendering.
 * The frontend renders this as innerHTML (safe because we control the input).
 *
 * Example: highlight("Sony WH-1000", "sony")
 *   → "<mark>Sony</mark> WH-1000"
 */
export function highlightMatches(text: string, query: string): string {
  if (!query.trim()) return text;
  // Escape special regex chars to prevent regex injection
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Simple relevance scoring:
 *   - Starts with query: +3 (highest priority)
 *   - Title contains query: +2
 *   - Description contains query: +1
 *   - Tags contain query: +1.5
 *
 * In a real search engine, TF-IDF or BM25 scoring would be used.
 */
function scoreProduct(title: string, description: string, tags: string[], query: string): number {
  const q = query.toLowerCase();
  const t = title.toLowerCase();
  const d = description.toLowerCase();
  let score = 0;

  if (t.startsWith(q)) score += 3;
  if (t.includes(q)) score += 2;
  if (d.includes(q)) score += 1;
  if (tags.some(tag => tag.includes(q))) score += 1.5;

  return score;
}

/**
 * Returns autocomplete suggestions for the search dropdown.
 * Max 6 suggestions, sorted by relevance score.
 */
export function getSuggestions(query: string, limit = 6): SearchSuggestion[] {
  if (!query || query.trim().length < 1) return [];

  const q = query.toLowerCase().trim();

  return PRODUCTS
    .filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some(t => t.includes(q))
    )
    .map(p => ({
      id: p.id,
      text: p.title,
      highlight: highlightMatches(p.title, query),
      category: p.category,
      score: scoreProduct(p.title, p.description, p.tags, q),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Returns full search results with title highlighting.
 * Max 20 results, sorted by relevance.
 */
export function searchProducts(query: string, limit = 20): SearchResult[] {
  if (!query || query.trim().length < 1) return [];

  const q = query.toLowerCase().trim();

  return PRODUCTS
    .filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.includes(q))
    )
    .map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      price: p.price,
      highlight: highlightMatches(p.title, query),
      score: scoreProduct(p.title, p.description, p.tags, q),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
