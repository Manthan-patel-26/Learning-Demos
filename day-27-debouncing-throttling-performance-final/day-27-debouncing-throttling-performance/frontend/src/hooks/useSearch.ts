// src/hooks/useSearch.ts
// The complete search hook combining:
//   1. Debounce — wait for typing pause before fetching
//   2. AbortController — cancel stale in-flight requests
//   3. Loading states — separate "typing" vs "fetching" states
//   4. Error handling — network errors, server errors
//
// ════════════════════════════════════════════════════════════════════
// THE RACE CONDITION PROBLEM (without AbortController):
//
//  User types "s" → request A starts
//  User types "so" → request B starts
//  User types "son" → request C starts
//
//  If requests complete out of order:
//    C completes first: shows "sony" suggestions ✓
//    A completes last: OVERWRITES with "s" suggestions ✗ (stale!)
//
// WITH AbortController:
//  When request C starts, we abort requests A and B.
//  Their fetch() calls throw an AbortError, which we catch and ignore.
//  Only C's results are ever displayed. ✓
// ════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from './useDebounce.js';
import { SearchSuggestion, SearchResult } from '../types/index.js';

const API_BASE = '/api';

// How long to wait after the last keystroke before fetching
const DEBOUNCE_DELAY = 200; // ms — target <200ms perceived latency
const MIN_QUERY_LENGTH = 1;

interface UseSearchState {
  suggestions: SearchSuggestion[];
  results: SearchResult[];
  isTyping: boolean;        // User is actively typing (debounce pending)
  isFetchingSuggestions: boolean;
  isFetchingResults: boolean;
  error: string | null;
  lastQuery: string;
  serverTook: number | null; // Server response time in ms
}

interface UseSearchReturn extends UseSearchState {
  query: string;
  setQuery: (q: string) => void;
  submitSearch: (q?: string) => void;
  clearSearch: () => void;
}

export function useSearch(): UseSearchReturn {
  const [query, setQueryRaw] = useState('');
  const [state, setState] = useState<UseSearchState>({
    suggestions: [],
    results: [],
    isTyping: false,
    isFetchingSuggestions: false,
    isFetchingResults: false,
    error: null,
    lastQuery: '',
    serverTook: null,
  });

  // The debounced query is what actually triggers the API call.
  // Raw query updates instantly (for the input UI).
  // Debounced query updates only after DEBOUNCE_DELAY ms of silence.
  const debouncedQuery = useDebounce(query, DEBOUNCE_DELAY);

  // Track whether the user is still typing (between raw and debounced update)
  const isTyping = query !== debouncedQuery && query.length >= MIN_QUERY_LENGTH;

  // AbortController ref — we need a ref (not state) because:
  //   1. Changing it shouldn't trigger a re-render
  //   2. We need the latest value in async callbacks
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Fetch suggestions when debounced query changes ───────────────────────
  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setState(prev => ({
        ...prev,
        suggestions: [],
        isFetchingSuggestions: false,
        error: null,
      }));
      return;
    }

    // ABORT the previous in-flight request before starting a new one.
    // This is the key to eliminating race conditions.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a fresh AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchSuggestions = async () => {
      setState(prev => ({ ...prev, isFetchingSuggestions: true, error: null }));

      try {
        const url = `/api/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`;
        const response = await fetch(url, {
          signal: controller.signal, // Attach the abort signal to the fetch
        });

        if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);

        const data = await response.json() as { suggestions: SearchSuggestion[]; took: number };

        setState(prev => ({
          ...prev,
          suggestions: data.suggestions,
          isFetchingSuggestions: false,
          serverTook: data.took,
        }));
      } catch (err) {
        // AbortError is expected and should be silently ignored —
        // it just means a newer request superseded this one.
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Don't update state for aborted requests
        }

        setState(prev => ({
          ...prev,
          isFetchingSuggestions: false,
          error: err instanceof Error ? err.message : 'Search failed',
        }));
      }
    };

    fetchSuggestions();

    // Cleanup: abort if query changes before this effect runs again
    return () => controller.abort();
  }, [debouncedQuery]);

  // ── Submit full search ───────────────────────────────────────────────────
  const submitSearch = async (overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim()) return;

    // Abort any pending suggestion request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState(prev => ({
      ...prev,
      isFetchingResults: true,
      suggestions: [],  // Close suggestion dropdown on submit
      error: null,
      lastQuery: q,
    }));

    try {
      const response = await fetch(
        `${API_BASE}/search?q=${encodeURIComponent(q)}`,
        { signal: controller.signal }
      );

      if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);

      const data = await response.json() as { results: SearchResult[]; took: number };

      setState(prev => ({
        ...prev,
        results: data.results,
        isFetchingResults: false,
        serverTook: data.took,
      }));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setState(prev => ({
        ...prev,
        isFetchingResults: false,
        error: err instanceof Error ? err.message : 'Search failed',
      }));
    }
  };

  const setQuery = (q: string) => {
    setQueryRaw(q);
    // Clear results when query changes
    if (!q) {
      setState(prev => ({ ...prev, suggestions: [], results: [], lastQuery: '' }));
    }
  };

  const clearSearch = () => {
    setQueryRaw('');
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setState({
      suggestions: [],
      results: [],
      isTyping: false,
      isFetchingSuggestions: false,
      isFetchingResults: false,
      error: null,
      lastQuery: '',
      serverTook: null,
    });
  };

  return {
    query,
    setQuery,
    submitSearch,
    clearSearch,
    ...state,
    isTyping, // Override with the live computed value
  };
}
