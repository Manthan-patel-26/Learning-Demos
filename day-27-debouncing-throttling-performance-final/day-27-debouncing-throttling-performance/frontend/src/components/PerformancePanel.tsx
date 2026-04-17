// src/components/PerformancePanel.tsx
// Educational panel that visualizes debounce behavior in real-time.
// Shows how many API calls were SAVED by debouncing.
// Great for demos and teaching the concept.

import { useState, useEffect, useRef } from 'react';

interface PerformancePanelProps {
  query: string;               // Raw query (every keystroke)
  debouncedQuery: string;      // Debounced query (only after pause)
  apiCallCount: number;        // How many API calls were actually made
  serverTook: number | null;
}

export function PerformancePanel({
  query,
  debouncedQuery,
  apiCallCount,
  serverTook,
}: PerformancePanelProps) {
  // Count total keystrokes to compare with actual API calls
  const keystrokeCount = useRef(0);
  const [keystrokes, setKeystrokes] = useState(0);
  const prevQuery = useRef('');

  useEffect(() => {
    if (query !== prevQuery.current) {
      keystrokeCount.current += Math.abs(query.length - prevQuery.current.length);
      setKeystrokes(keystrokeCount.current);
      prevQuery.current = query;
    }
  }, [query]);

  const savedCalls = Math.max(0, keystrokes - apiCallCount);
  const savingPercent = keystrokes > 0
    ? Math.round((savedCalls / keystrokes) * 100)
    : 0;

  return (
    <div className="perf-panel" aria-label="Performance statistics">
      <h2 className="perf-title">⚡ Debounce in Action</h2>

      <div className="perf-grid">
        {/* Raw value — updates on every character */}
        <div className="perf-item">
          <span className="perf-label">Raw input</span>
          <code className="perf-value raw">{query || '—'}</code>
          <span className="perf-hint">Every keystroke</span>
        </div>

        {/* Debounced value — only updates after 200ms pause */}
        <div className="perf-item">
          <span className="perf-label">Debounced (200ms)</span>
          <code className="perf-value debounced">{debouncedQuery || '—'}</code>
          <span className="perf-hint">Only after typing pause</span>
        </div>

        {/* Stats */}
        <div className="perf-item">
          <span className="perf-label">Keystrokes</span>
          <span className="perf-number">{keystrokes}</span>
          <span className="perf-hint">Total characters typed</span>
        </div>

        <div className="perf-item">
          <span className="perf-label">API calls made</span>
          <span className="perf-number highlight-green">{apiCallCount}</span>
          <span className="perf-hint">Actual server requests</span>
        </div>

        <div className="perf-item">
          <span className="perf-label">Calls saved</span>
          <span className="perf-number highlight-blue">{savedCalls}</span>
          <span className="perf-hint">{savingPercent}% reduction</span>
        </div>

        <div className="perf-item">
          <span className="perf-label">Server time</span>
          <span className="perf-number">{serverTook != null ? `${serverTook}ms` : '—'}</span>
          <span className="perf-hint">Last response latency</span>
        </div>
      </div>

      <p className="perf-explanation">
        Without debouncing, typing "wireless" (8 chars) would fire{' '}
        <strong>8 API requests</strong>. With 200ms debounce, it fires{' '}
        <strong>1 request</strong> (after the pause).
      </p>
    </div>
  );
}
