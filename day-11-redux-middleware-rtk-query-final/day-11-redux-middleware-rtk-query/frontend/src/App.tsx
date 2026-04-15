/**
 * ============================================================
 * DAY 11: RTK Query Integration Demo
 * ============================================================
 * Shows: auto-caching, optimistic updates, infinite scroll,
 * prefetching, and cache invalidation all in action.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Provider } from "react-redux";
import { store } from "./store";
import {
  useGetProductsQuery, useGetProductQuery, useGetCartQuery,
  useAddToCartMutation, useRemoveFromCartMutation,
  useUpdateProductMutation, usePlaceOrderMutation, usePrefetch,
  Product,
} from "./store/api";

const USER_ID = "user1";

// ─── PRODUCT CARD ──────────────────────────────────────────
function ProductCard({ product, onHover }: { product: Product; onHover: (id: string) => void }) {
  const [addToCart, { isLoading: isAdding }] = useAddToCartMutation();
  const [updateProduct] = useUpdateProductMutation();

  return (
    <div
      onMouseEnter={() => onHover(product.id)}
      style={{
        background: "#fff", borderRadius: 10, padding: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex",
        flexDirection: "column", gap: 8,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</div>
      <div style={{ fontSize: 12, color: "#718096", textTransform: "capitalize" }}>
        {product.category} · ⭐ {product.rating} · {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, color: "#4299e1", fontSize: 16 }}>
          ${product.price.toFixed(2)}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {/* Optimistic update demo: instantly update rating */}
          <button
            onClick={() => updateProduct({ id: product.id, changes: { rating: parseFloat((product.rating + 0.1).toFixed(1)) } })}
            style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #e2e8f0",
              background: "#fffbeb", cursor: "pointer", fontSize: 11 }}
            title="Optimistic update demo"
          >
            ★+
          </button>
          <button
            onClick={() => addToCart({ userId: USER_ID, productId: product.id })}
            disabled={product.stock === 0 || isAdding}
            style={{
              padding: "4px 12px", borderRadius: 6, border: "none",
              background: product.stock === 0 ? "#e2e8f0" : "#4299e1",
              color: product.stock === 0 ? "#a0aec0" : "#fff",
              cursor: product.stock === 0 ? "not-allowed" : "pointer", fontSize: 12,
            }}
          >
            {isAdding ? "..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCT DETAIL (prefetch demo) ───────────────────────
function ProductDetail({ id }: { id: string }) {
  // useGetProductQuery: only fetches if not already in cache!
  const { data: product, isFetching } = useGetProductQuery(id);
  if (isFetching) return <div style={{ padding: 12 }}>Loading detail...</div>;
  if (!product) return null;
  return (
    <div style={{ background: "#ebf8ff", borderRadius: 8, padding: 12, marginTop: 8, fontSize: 13 }}>
      <strong>{product.name}</strong> — {product.description}
    </div>
  );
}

// ─── CART PANEL ───────────────────────────────────────────
function CartPanel() {
  const { data: cartItems = [], isFetching } = useGetCartQuery(USER_ID);
  const [removeFromCart] = useRemoveFromCartMutation();
  const [placeOrder, { isLoading: isCheckingOut, isSuccess }] = usePlaceOrderMutation();

  const total = cartItems.reduce((s, i) => s + (i.product?.price ?? 0) * i.quantity, 0);

  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <h3 style={{ margin: "0 0 12px" }}>
        🛒 Cart {isFetching && <span style={{ fontSize: 11, color: "#a0aec0" }}>syncing...</span>}
      </h3>
      {cartItems.length === 0 ? (
        <p style={{ color: "#a0aec0", fontSize: 13 }}>Empty — add some products!</p>
      ) : (
        <>
          {cartItems.map(item => (
            <div key={item.productId} style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 13 }}>
                <div>{item.product?.name ?? item.productId}</div>
                <div style={{ color: "#718096" }}>×{item.quantity} = ${((item.product?.price ?? 0) * item.quantity).toFixed(2)}</div>
              </div>
              <button onClick={() => removeFromCart({ userId: USER_ID, productId: item.productId })}
                style={{ border: "none", background: "#fed7d7", borderRadius: 4,
                  padding: "2px 8px", cursor: "pointer", color: "#c53030" }}>✕</button>
            </div>
          ))}
          <div style={{ marginTop: 12, fontWeight: 700, textAlign: "right" }}>
            Total: ${total.toFixed(2)}
          </div>
          {isSuccess ? (
            <div style={{ marginTop: 8, padding: 8, background: "#c6f6d5", borderRadius: 6,
              fontSize: 12, textAlign: "center" }}>✅ Order placed!</div>
          ) : (
            <button
              onClick={() => placeOrder({ userId: USER_ID, items: cartItems })}
              disabled={isCheckingOut}
              style={{ width: "100%", marginTop: 12, padding: "8px", borderRadius: 6,
                border: "none", background: "#48bb78", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
              {isCheckingOut ? "Processing..." : "Checkout"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────
function AppInner() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Prefetch hook: fetches without subscribing to the data
  const prefetchProduct = usePrefetch("getProduct");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [category, debouncedSearch]);

  // RTK Query: auto-fetches, caches, deduplicates!
  const { data, isFetching, isError } = useGetProductsQuery({
    page, limit: 12, category, search: debouncedSearch || undefined,
  });

  // Infinite scroll: load more button (RTK Query infinite scroll pattern)
  const hasNextPage = data?.pagination.hasNextPage;

  // Prefetch next page on hover of "Load More"
  const prefetchProducts = usePrefetch("getProducts");

  // Intersection Observer for auto-scroll
  const loaderRef = useRef<HTMLDivElement>(null);
  const onLoadMore = useCallback(() => {
    if (hasNextPage && !isFetching) setPage(p => p + 1);
  }, [hasNextPage, isFetching]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) onLoadMore(); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [onLoadMore]);

  const card: React.CSSProperties = { background: "#fff", borderRadius: 10, padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)" };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f7fafc", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>⚡ Day 11: RTK Query</h1>

        <div style={{ ...card, marginBottom: 16, padding: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search products (debounced)..."
              style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e0", fontSize: 14 }} />
            {["", "books", "electronics", "clothing"].map(cat => (
              <button key={cat} onClick={() => setCategory(cat || undefined)}
                style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                  background: category === (cat || undefined) ? "#4299e1" : "#e2e8f0",
                  color: category === (cat || undefined) ? "#fff" : "#4a5568", fontSize: 13 }}>
                {cat || "All"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
          <div>
            {isError && (
              <div style={{ ...card, background: "#fff5f5", color: "#c53030", marginBottom: 12 }}>
                ⚠ Backend not running. Start: <code>cd backend && npm run dev</code>
              </div>
            )}

            {/* Stats bar */}
            <div style={{ ...card, marginBottom: 12, padding: 10, fontSize: 13, color: "#718096",
              display: "flex", gap: 16 }}>
              <span>{data?.pagination.total ?? "..."} products</span>
              <span>Page {page} of {data?.pagination.totalPages ?? "?"}</span>
              {isFetching && <span style={{ color: "#4299e1" }}>⟳ Fetching...</span>}
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#a0aec0" }}>
                Cache: all pages share one cache entry (serializeQueryArgs magic!)
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {data?.data.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onHover={(id) => {
                    setHoveredId(id);
                    // PREFETCH: load product detail into cache on hover
                    prefetchProduct(id, { ifOlderThan: 60 });
                  }}
                />
              ))}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={loaderRef} style={{ height: 40, display: "flex", alignItems: "center",
              justifyContent: "center", marginTop: 12 }}>
              {isFetching ? (
                <span style={{ color: "#a0aec0" }}>Loading more...</span>
              ) : hasNextPage ? (
                <button
                  onClick={onLoadMore}
                  onMouseEnter={() => prefetchProducts({ page: page + 1, limit: 12, category })}
                  style={{ padding: "8px 24px", borderRadius: 20, border: "1px solid #cbd5e0",
                    background: "#fff", cursor: "pointer" }}>
                  Load More (hover to prefetch!)
                </button>
              ) : data && (
                <span style={{ color: "#a0aec0", fontSize: 13 }}>All {data.pagination.total} products loaded</span>
              )}
            </div>

            {/* Prefetch preview */}
            {hoveredId && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#718096" }}>
                  Prefetched product detail (from cache, instant!):
                </div>
                <ProductDetail id={hoveredId} />
              </div>
            )}
          </div>

          <div>
            <CartPanel />
            <div style={{ ...card, marginTop: 12, background: "#fffbeb", fontSize: 12 }}>
              <strong>🎓 RTK Query Concepts Here:</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 16, lineHeight: 1.8 }}>
                <li><strong>Auto-caching:</strong> Same query → no refetch</li>
                <li><strong>Optimistic updates:</strong> Click ★+ to see instant rating update (no server wait)</li>
                <li><strong>Cache invalidation:</strong> Add to cart → cart query auto-refetches</li>
                <li><strong>Infinite scroll:</strong> serializeQueryArgs + merge</li>
                <li><strong>Prefetch:</strong> Hover a product → detail pre-loaded</li>
                <li><strong>Polling:</strong> Add pollingInterval: 30000 to any query</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <Provider store={store}><AppInner /></Provider>;
}
