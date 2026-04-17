# Day 27 — Debouncing, Throttling & Performance

## What You'll Learn
- **Debounce vs Throttle** — when to use each, mental model, real tradeoffs
- **`useDebounce` hook** — the right React pattern (debounce the value, not the function)
- **Stale closure gotcha** — why naive `debounce(fn, 300)` breaks in React
- **AbortController** — eliminate search race conditions entirely
- **Leading vs trailing debounce** — two different UX behaviors
- **`requestAnimationFrame` throttle** — smooth scroll/animation handlers
- **Perceived latency** — why <200ms feels instant to users

---

## Project Structure

```
day-27-debouncing-throttling-performance/
├── backend/
│   ├── src/
│   │   ├── index.ts                  ← Express app
│   │   ├── routes/search.ts          ← /suggestions + /search endpoints
│   │   ├── utils/search.ts           ← Relevance scoring + HTML highlight
│   │   ├── utils/data.ts             ← 60 in-memory products
│   │   └── types/index.ts
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── hooks/
    │   │   ├── useDebounce.ts        ← Core: trailing + leading debounce
    │   │   ├── useThrottle.ts        ← Throttle + rAF throttle
    │   │   └── useSearch.ts          ← Debounce + AbortController combined
    │   ├── components/
    │   │   ├── SearchInput.tsx       ← Combobox with full keyboard nav + ARIA
    │   │   ├── SearchResults.tsx     ← Results with highlighted matches
    │   │   └── PerformancePanel.tsx  ← Live visual: keystrokes vs API calls
    │   ├── App.tsx
    │   └── styles.css
    └── package.json
```

---

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npm run dev
# → http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Open the browser. Try typing "wireless" quickly — watch the **Performance Panel** show keystrokes vs actual API calls saved by debouncing.

---

## API Endpoints

| Endpoint | Purpose | Called when |
|---|---|---|
| `GET /api/search/suggestions?q=sony` | Autocomplete dropdown (≤6 results) | Every debounced keystroke |
| `GET /api/search?q=headphones` | Full results (≤20) | Enter key or suggestion click |

Both return a `took` field (server ms) for performance monitoring.

---

## Core Concepts Deep-Dive

### Debounce vs Throttle

```
DEBOUNCE — "Wait for the user to stop"
  typing:  s → so → son → sony
  timer:   [reset][reset][reset][200ms wait → FIRE]
  calls:                                          1 ✓

THROTTLE — "Fire at most once per interval"
  typing:  s → so → son → sony → sonyd → ...
  timer:   [FIRE]  skip  skip  [FIRE]   skip  ...
  calls:   1                   2              ...
```

### The Stale Closure Bug (and how to avoid it)

```typescript
// ❌ WRONG — stale closure captures `query` from first render
function SearchBox() {
  const [query, setQuery] = useState('');

  // This debounced function always "sees" query = '' from initial render!
  const debouncedSearch = useMemo(
    () => debounce(() => fetch(`/search?q=${query}`), 300),
    [] // Empty deps = created once = stale forever
  );
}

// ✅ CORRECT — debounce the VALUE, not the function
function SearchBox() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300); // <-- debounce the value

  useEffect(() => {
    // This effect always reads the CURRENT debouncedQuery (no stale closure)
    fetch(`/search?q=${debouncedQuery}`);
  }, [debouncedQuery]); // Runs when debounced value updates
}
```

### AbortController — Eliminating Race Conditions

```
Without AbortController (race condition):
  Type "s"   → Request A ──────────────────────────► responds "s results"
  Type "so"  → Request B ────────────────► responds "so results"
  Type "son" → Request C ──────► responds "son results"

  Display order: "son" → "so" → "s" ← WRONG! Last wins unexpectedly

With AbortController:
  Type "s"   → Request A starts,  controller A created
  Type "so"  → controller A.abort() called, Request B starts
  Type "son" → controller B.abort() called, Request C starts
              → Only C completes → displays "son results" ✓
```

### requestAnimationFrame Throttle

```typescript
// For scroll handlers — syncs to display refresh rate (60fps)
const handleScroll = useRafThrottle(() => {
  // Called at most 60 times/second, perfectly in sync with renders
  updateParallaxEffect(window.scrollY);
});

window.addEventListener('scroll', handleScroll, { passive: true });
```

---

## Common Gotchas (from the curriculum)

### 1. Memory leaks from uncanceled timeouts
Every `setTimeout` in a component MUST be cleared in the `useEffect` cleanup.
Our `useDebounce` returns `() => clearTimeout(timer)` — this is what prevents leaks.

### 2. Leading vs trailing — choosing the right one
- **Search autocomplete** → trailing (wait for pause, then show suggestions)
- **"Save draft" button** → trailing (wait for typing to stop, then save)
- **"Add to cart" button** → leading (fire immediately, block double-clicks)
- **Scroll position tracking** → throttle (not debounce — fires continuously)

### 3. AbortError is not a real error
```typescript
try {
  const res = await fetch(url, { signal: controller.signal });
} catch (err) {
  if (err instanceof Error && err.name === 'AbortError') {
    return; // ← ALWAYS handle this separately, never show to user
  }
  // Only real errors reach here
  showErrorToUser(err);
}
```

### 4. Debounce delay sweet spot
- **< 150ms** — users notice the lag between typing and suggestions appearing
- **200ms** — sweet spot; feels instant, saves ~70% of API calls
- **> 300ms** — users think search is broken
- **Perceived latency** = debounce delay + network + server time. Keep total < 400ms.

---

## Extending This Project

1. **Real search engine** — swap in-memory search for Meilisearch (self-hosted, free):
   ```bash
   docker run -p 7700:7700 getmeili/meilisearch
   ```

2. **Search history** — store recent searches in `localStorage`, show as suggestions when input is focused but empty

3. **Highlight on results page** — pass the query to results and use CSS `::highlight()` API (modern browsers)

4. **Keyboard shortcut** — `Cmd+K` or `/` to focus the search input (common pattern in dev tools, GitHub, etc.)

5. **Analytics** — track which queries return 0 results (invaluable for product improvement)
