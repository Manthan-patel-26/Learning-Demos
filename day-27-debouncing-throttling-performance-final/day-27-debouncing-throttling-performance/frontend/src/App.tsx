// src/App.tsx
// Root component wiring together search input, results, and performance panel.

import { useState } from 'react';
import { SearchInput } from './components/SearchInput.js';
import { SearchResults } from './components/SearchResults.js';
import { PerformancePanel } from './components/PerformancePanel.js';
import { useSearch } from './hooks/useSearch.js';
import { useDebounce } from './hooks/useDebounce.js';

function App() {
  const {
    query,
    setQuery,
    submitSearch,
    clearSearch,
    suggestions,
    results,
    isTyping,
    isFetchingSuggestions,
    isFetchingResults,
    error,
    lastQuery,
    serverTook,
  } = useSearch();

  // Track actual API call count for the performance panel
  const [apiCallCount, setApiCallCount] = useState(0);

  // Debounced query exposed to the perf panel for the "before/after" visual
  const debouncedQueryForPanel = useDebounce(query, 200);

  // Close suggestion dropdown without clearing query
  const [dropdownOpen, setDropdownOpen] = useState(true);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setDropdownOpen(true);
    if (q.length >= 1) setApiCallCount(c => c + 1);
  };

  const handleSubmit = (q?: string) => {
    submitSearch(q);
    setDropdownOpen(false);
  };

  return (
    <div className="app">
      <div className="hero">
        <h1 className="hero-title">🔍 Search Autocomplete</h1>
        <p className="hero-subtitle">
          Debouncing · AbortController · Keyboard Navigation · &lt;200ms Latency
        </p>
      </div>

      <main className="main-content">
        {/* Search box */}
        <div className="search-section">
          <SearchInput
            query={query}
            suggestions={dropdownOpen ? suggestions : []}
            isTyping={isTyping}
            isFetchingSuggestions={isFetchingSuggestions}
            error={error}
            onChange={handleQueryChange}
            onSubmit={handleSubmit}
            onClear={() => { clearSearch(); setApiCallCount(0); }}
            onCloseSuggestions={() => setDropdownOpen(false)}
          />
        </div>

        {/* Performance visualizer */}
        <PerformancePanel
          query={query}
          debouncedQuery={debouncedQueryForPanel}
          apiCallCount={apiCallCount}
          serverTook={serverTook}
        />

        {/* Full search results (shown after Enter or suggestion click) */}
        <SearchResults
          results={results}
          query={lastQuery}
          isFetching={isFetchingResults}
          serverTook={serverTook}
        />
      </main>
    </div>
  );
}

export default App;
