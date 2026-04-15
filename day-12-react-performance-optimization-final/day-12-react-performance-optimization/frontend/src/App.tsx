/**
 * ============================================================
 * DAY 12: React Performance Optimization
 * ============================================================
 * Demonstrates BEFORE vs AFTER for:
 *  1. Virtual scrolling (10k items — renders only ~20 at a time)
 *  2. React.memo (prevent unnecessary child re-renders)
 *  3. useMemo (expensive filter/sort computation)
 *  4. useCallback (stable function references for children)
 *  5. Code splitting with React.lazy + Suspense
 */
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  Suspense,
  lazy,
} from "react";
import { FixedSizeList as List } from "react-window";

// ─── TYPE ─────────────────────────────────────────────────
interface Item {
  id: string;
  name: string;
  category: string;
  price: number;
  complexity: string;
  tags: string[];
}

// ─── CODE SPLITTING ──────────────────────────────────────
// lazy() + Suspense: HeavyChart is only loaded when user opens "Analytics" tab.
// The chunk is downloaded on demand, not at initial page load.
const HeavyChart = lazy(() => import("./HeavyChart"));

// ─── 1. REACT.MEMO ───────────────────────────────────────
// React.memo: re-renders ONLY if props actually changed (shallow compare).
// Without memo: re-renders whenever PARENT re-renders, even if props unchanged.
// With memo: skips re-render if item prop reference is the same.
const ItemRow = memo(function ItemRow({
  item,
  onSelect,
  isSelected,
}: {
  item: Item;
  onSelect: (id: string) => void;
  isSelected: boolean;
}) {
  // Uncomment to verify: only selected/deselected rows re-render
  // console.log("Rendering:", item.id);

  return (
    <div
      onClick={() => onSelect(item.id)}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 16px",
        background: isSelected ? "#ebf8ff" : "transparent",
        borderBottom: "1px solid #e2e8f0",
        cursor: "pointer",
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400 }}>
          {item.name}
        </div>
        <div style={{ fontSize: 11, color: "#718096" }}>
          {item.category} · {item.complexity}
        </div>
      </div>
      <span style={{ fontWeight: 600, color: "#4299e1" }}>
        ${item.price.toFixed(2)}
      </span>
    </div>
  );
});

// ─── 2. VIRTUAL LIST ROW RENDERER ─────────────────────────
// react-window only renders the ~20 items visible in the viewport.
// Even with 10,000 items: only 20 DOM nodes exist at any time.
function VirtualRow({
  index,
  style,
  data,
}: {
  index: number;
  style: React.CSSProperties;
  data: {
    items: Item[];
    selectedId: string | null;
    onSelect: (id: string) => void;
  };
}) {
  const item = data.items[index]!;
  return (
    <div style={style}>
      <ItemRow
        item={item}
        onSelect={data.onSelect}
        isSelected={data.selectedId === item.id}
      />
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────
export default function App() {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price">("name");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");
  const [renderMode, setRenderMode] = useState<"virtual" | "naive">("virtual");

  useEffect(() => {
    fetch("http://localhost:3001/api/items")
      .then((r) => r.json())
      .then((d) => {
        setAllItems(d.data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback: generate local data if backend is not running
        setAllItems(
          Array.from({ length: 10000 }, (_, i) => ({
            id: String(i + 1),
            name: `Item ${i + 1}`,
            category: ["frontend", "backend", "database"][i % 3],
            price: parseFloat((5 + Math.random() * 200).toFixed(2)),
            complexity: ["easy", "medium", "hard"][i % 3],
            tags: [],
          })),
        );
        setLoading(false);
      });
  }, []);

  // ── 3. useMemo: expensive computation ─────────────────
  // This filter+sort runs on 10,000 items. Without useMemo it
  // re-runs on EVERY render (e.g., when unrelated state changes).
  // With useMemo: only re-runs when allItems, search, sortBy, or filterCategory change.
  const filteredItems = useMemo(() => {
    const start = performance.now();
    let result = allItems;
    if (filterCategory !== "all")
      result = result.filter((i) => i.category === filterCategory);
    if (search)
      result = result.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase()),
      );
    result = [...result].sort((a, b) =>
      sortBy === "price" ? a.price - b.price : a.name.localeCompare(b.name),
    );
    const duration = performance.now() - start;
    if (duration > 5) console.log(`Filter/sort took ${duration.toFixed(1)}ms`);
    return result;
  }, [allItems, search, sortBy, filterCategory]);

  // ── 4. useCallback: stable reference for child prop ───
  // Without useCallback: a new `handleSelect` function is created on every render.
  // Since ItemRow's onSelect prop changes, React.memo can't help — it re-renders ALL rows!
  // With useCallback: same function reference → React.memo skips re-renders.
  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []); // Empty deps: this function never changes

  // Data object for react-window (must be stable to not break memo)
  const listData = useMemo(
    () => ({ items: filteredItems, selectedId, onSelect: handleSelect }),
    [filteredItems, selectedId, handleSelect],
  );

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        background: "#f7fafc",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>
          ⚡ Day 12: React Performance Optimization
        </h1>

        {/* Tab navigation */}
        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: "2px solid #e2e8f0",
            marginBottom: 20,
          }}
        >
          {(["list", "analytics"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "none",
                cursor: "pointer",
                borderBottom:
                  activeTab === tab
                    ? "2px solid #4299e1"
                    : "2px solid transparent",
                marginBottom: -2,
                color: activeTab === tab ? "#4299e1" : "#718096",
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {tab}{" "}
              {tab === "analytics" && (
                <span style={{ fontSize: 11, color: "#a0aec0" }}>
                  (lazy loaded)
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "analytics" ? (
          // CODE SPLITTING: HeavyChart is lazy-loaded only when this tab is active
          <Suspense
            fallback={
              <div
                style={{ textAlign: "center", padding: 60, color: "#718096" }}
              >
                Loading analytics module... (this chunk was not in the initial
                bundle!)
              </div>
            }
          >
            <HeavyChart items={filteredItems} />
          </Suspense>
        ) : (
          <>
            {/* Controls */}
            <div style={{ ...card, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search 10,000 items... (useMemo filters)"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e0",
                  }}
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e0",
                  }}
                >
                  <option value="all">All categories</option>
                  {["frontend", "backend", "database", "devops", "testing"].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ),
                  )}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "name" | "price")
                  }
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e0",
                  }}
                >
                  <option value="name">Sort by name</option>
                  <option value="price">Sort by price</option>
                </select>
                <button
                  onClick={() =>
                    setRenderMode((m) =>
                      m === "virtual" ? "naive" : "virtual",
                    )
                  }
                  style={{
                    padding: "8px 14px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    background:
                      renderMode === "virtual" ? "#c6f6d5" : "#fed7d7",
                    color: renderMode === "virtual" ? "#276749" : "#c53030",
                  }}
                >
                  {renderMode === "virtual" ? "✅ Virtual" : "❌ Naive"} (
                  {filteredItems.length.toLocaleString()} items)
                </button>
              </div>
            </div>

            <div style={{ ...card, overflow: "hidden" }}>
              {loading ? (
                <div
                  style={{ padding: 40, textAlign: "center", color: "#718096" }}
                >
                  Loading 10,000 items...
                </div>
              ) : renderMode === "virtual" ? (
                // VIRTUAL LIST: Only renders ~20 DOM nodes regardless of list size
                <List
                  height={500}
                  itemCount={filteredItems.length}
                  itemSize={52}
                  width="100%"
                  itemData={listData}
                >
                  {VirtualRow}
                </List>
              ) : (
                // NAIVE: Renders ALL items. With 10k items this will freeze!
                <div style={{ height: 500, overflow: "auto" }}>
                  <div
                    style={{
                      padding: 8,
                      background: "#fff5f5",
                      color: "#c53030",
                      fontSize: 12,
                    }}
                  >
                    ⚠ Naive mode: rendering ALL{" "}
                    {filteredItems.length.toLocaleString()} DOM nodes. Expect
                    lag!
                  </div>
                  {filteredItems.slice(0, 500).map(
                    (
                      item, // Cap at 500 to not crash browser
                    ) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onSelect={handleSelect}
                        isSelected={selectedId === item.id}
                      />
                    ),
                  )}
                  {filteredItems.length > 500 && (
                    <div
                      style={{
                        padding: 8,
                        textAlign: "center",
                        color: "#718096",
                        fontSize: 12,
                      }}
                    >
                      (Showing first 500 of{" "}
                      {filteredItems.length.toLocaleString()} to prevent browser
                      freeze)
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                ...card,
                marginTop: 12,
                padding: 12,
                background: "#fffbeb",
                fontSize: 12,
              }}
            >
              <strong>🎓 Performance techniques used:</strong>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 4,
                  marginTop: 8,
                }}
              >
                <div>
                  ✅ <strong>react-window:</strong> Virtual scrolling — only
                  renders visible rows
                </div>
                <div>
                  ✅ <strong>React.memo:</strong> ItemRow skips re-render if
                  props unchanged
                </div>
                <div>
                  ✅ <strong>useMemo:</strong> Filter+sort only recalculates
                  when inputs change
                </div>
                <div>
                  ✅ <strong>useCallback:</strong> handleSelect has stable
                  reference → memo works
                </div>
                <div>
                  ✅ <strong>React.lazy:</strong> Analytics tab chunk loaded on
                  demand
                </div>
                <div>
                  ✅ <strong>Suspense:</strong> Loading fallback while lazy
                  chunk downloads
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
