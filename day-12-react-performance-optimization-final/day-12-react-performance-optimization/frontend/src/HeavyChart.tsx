/**
 * HeavyChart.tsx — Lazy-loaded analytics component
 * This module is in a separate JS chunk. It's downloaded only
 * when the user clicks the "Analytics" tab.
 *
 * In a real app this would use chart libraries (recharts, chart.js)
 * that add significant bundle weight — perfect for lazy loading.
 */
import React, { useMemo } from "react";

interface Item {
  id: string;
  category: string;
  price: number;
  complexity: string;
}

export default function HeavyChart({ items }: { items: Item[] }) {
  // Compute category distribution
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((i) => {
      counts[i.category] = (counts[i.category] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const priceData = useMemo(() => {
    const buckets = [0, 50, 100, 150, 200];
    return buckets.map((min, idx) => {
      const max = buckets[idx + 1] ?? Infinity;
      return {
        label: max === Infinity ? `$${min}+` : `$${min}-${max}`,
        count: items.filter((i) => i.price >= min && i.price < max).length,
      };
    });
  }, [items]);

  const maxCount = Math.max(...categoryData.map(([, c]) => c), 1);

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 10,
    padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: 16,
  };

  return (
    <div>
      <div
        style={{
          background: "#c6f6d5",
          borderRadius: 8,
          padding: 10,
          marginBottom: 16,
          fontSize: 13,
        }}
      >
        ✅ This component was lazy-loaded! It wasn't in the initial JavaScript
        bundle. Open DevTools → Network → JS to see the separate chunk file that
        was downloaded.
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>
          📊 Category Distribution ({items.length.toLocaleString()} items)
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {categoryData.map(([cat, count]) => (
            <div
              key={cat}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <div
                style={{
                  width: 90,
                  fontSize: 13,
                  textAlign: "right",
                  color: "#4a5568",
                }}
              >
                {cat}
              </div>
              <div
                style={{
                  flex: 1,
                  background: "#e2e8f0",
                  borderRadius: 4,
                  height: 24,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    background: "#4299e1",
                    borderRadius: 4,
                    height: "100%",
                    width: `${(count / maxCount) * 100}%`,
                    transition: "width 0.5s",
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 8,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {count.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>💰 Price Distribution</h3>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            height: 120,
          }}
        >
          {priceData.map(({ label, count }) => {
            const maxBucket = Math.max(...priceData.map((d) => d.count), 1);
            const height = Math.round((count / maxBucket) * 100);
            return (
              <div
                key={label}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div style={{ fontSize: 12, color: "#718096" }}>
                  {count.toLocaleString()}
                </div>
                <div
                  style={{
                    width: "100%",
                    height,
                    background: "#9f7aea",
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.5s",
                  }}
                />
                <div style={{ fontSize: 11, color: "#4a5568" }}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
