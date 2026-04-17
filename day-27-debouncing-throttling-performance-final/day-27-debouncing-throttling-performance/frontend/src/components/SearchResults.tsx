// src/components/SearchResults.tsx
// Displays full search results with highlighted matches.

import { SearchResult } from '../types/index.js';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  isFetching: boolean;
  serverTook: number | null;
}

export function SearchResults({ results, query, isFetching, serverTook }: SearchResultsProps) {
  if (isFetching) {
    return (
      <div className="results-container">
        <div className="results-loading">
          <span className="spinner-lg" aria-hidden="true" />
          <p>Searching for "{query}"...</p>
        </div>
      </div>
    );
  }

  if (!query) return null;

  if (results.length === 0) {
    return (
      <div className="results-container">
        <div className="empty-results" role="status">
          <p className="empty-title">No results for "{query}"</p>
          <p className="empty-hint">Try a different keyword or browse by category</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      {/* Results meta: count + server timing */}
      <div className="results-meta" role="status" aria-live="polite">
        <span>{results.length} results for "<strong>{query}</strong>"</span>
        {serverTook !== null && (
          <span className="results-timing">{serverTook}ms</span>
        )}
      </div>

      {/* Results grid */}
      <ul className="results-grid" role="list">
        {results.map(result => (
          <li key={result.id} className="result-card">
            <div className="result-header">
              <h3
                className="result-title"
                // Safe: server generates only <mark> tags around matched text
                dangerouslySetInnerHTML={{ __html: result.highlight }}
              />
              <span className="result-category">{result.category}</span>
            </div>
            <p className="result-description">{result.description}</p>
            {result.price !== undefined && (
              <p className="result-price">${result.price.toFixed(2)}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
