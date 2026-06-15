/**
 * DAY 32: Transaction Management Demo
 * Tests ACID properties: transfers, inventory orders, optimistic locking, race conditions.
 */
import React, { useState, useEffect, useCallback } from "react";

const BASE = "http://localhost:3001";

interface Account { id: number; name: string; balance: string; version: number; }
interface Product { id: number; name: string; price: string; stock: number; }

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [log, setLog] = useState<{ msg: string; ok: boolean }[]>([]);
  const [from, setFrom] = useState("1"); const [to, setTo] = useState("2"); const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const addLog = useCallback((msg: string, ok = true) =>
    setLog(p => [{ msg: `[${new Date().toLocaleTimeString()}] ${msg}`, ok }, ...p.slice(0, 24)]), []);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/state`); const d = await r.json();
      setAccounts(d.accounts ?? []); setProducts(d.products ?? []);
    } catch { addLog("⚠ Backend not running", false); }
  }, [addLog]);

  useEffect(() => { refresh(); const t = setInterval(refresh, 3000); return () => clearInterval(t); }, [refresh]);

  async function run(label: string, fn: () => Promise<Response>) {
    setLoading(p => ({ ...p, [label]: true }));
    try {
      const r = await fn(); const d = await r.json();
      if (r.ok) { addLog(`✅ ${label}: ${JSON.stringify(d.data ?? d.message ?? "OK")}`, true); }
      else { addLog(`❌ ${label}: ${d.error?.message ?? d.error ?? JSON.stringify(d)}`, false); }
    } catch { addLog(`❌ ${label}: Network error`, false); }
    setLoading(p => ({ ...p, [label]: false })); await refresh();
  }

  const btn = (color = "#4299e1"): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 6, border: "none", background: color,
    color: "#fff", cursor: "pointer", fontSize: 13, margin: "0 4px 4px 0"
  });
  const card: React.CSSProperties = { background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: 12 };
  const input: React.CSSProperties = { padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e0", fontSize: 14, width: 60, marginRight: 8 };

  return (
    <div style={{ fontFamily: "system-ui", background: "#f7fafc", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>💳 Day 32: Database Transactions & ACID</h1>
        <div style={{ background: "#fffbeb", borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 13 }}>
          <strong>Setup:</strong> <code>docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16-alpine</code> → <code>npm run db:setup</code> → <code>npm run dev</code>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          {/* Accounts */}
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Accounts</h3>
            {accounts.map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e2e8f0", fontSize: 14 }}>
                <span>{a.name}</span>
                <span style={{ fontWeight: 700, color: parseFloat(a.balance) < 100 ? "#e53e3e" : "#38a169" }}>${parseFloat(a.balance).toFixed(2)} <span style={{ fontSize: 11, color: "#a0aec0" }}>v{a.version}</span></span>
              </div>
            ))}
          </div>

          {/* Products */}
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Products (Inventory)</h3>
            {products.map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e2e8f0", fontSize: 14 }}>
                <span>{p.name}</span>
                <span>${parseFloat(p.price).toFixed(2)} · <strong style={{ color: p.stock === 0 ? "#e53e3e" : p.stock < 3 ? "#ed8936" : "#38a169" }}>{p.stock} left</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Transfer */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>1. Atomic Transfer (Pessimistic Lock — FOR UPDATE)</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>From account</span>
            <input value={from} onChange={e => setFrom(e.target.value)} style={{ ...input, width: 40 }} />
            <span>to</span>
            <input value={to} onChange={e => setTo(e.target.value)} style={{ ...input, width: 40 }} />
            <span>amount $</span>
            <input value={amount} onChange={e => setAmount(e.target.value)} style={input} />
            <button disabled={loading["transfer"]} style={btn()} onClick={() => run("transfer", () =>
              fetch(`${BASE}/api/transfer`, { method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fromId: parseInt(from), toId: parseInt(to), amount: parseFloat(amount) }) }))}>
              {loading["transfer"] ? "..." : "Transfer"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#718096", margin: 0 }}>
            Try: transfer more than balance ($1000+) → should fail with rollback. Both accounts remain consistent.
          </p>
        </div>

        {/* Order */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>2. Order with Inventory Deduction (Multi-table Transaction)</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button disabled={loading["order1"]} style={btn("#48bb78")} onClick={() => run("order1",
              () => fetch(`${BASE}/api/orders`, { method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountId: 1, items: [{ productId: 1, quantity: 1 }] }) }))}>
              Alice buys 1x TypeScript ($29.99)
            </button>
            <button disabled={loading["order2"]} style={btn("#ed8936")} onClick={() => run("order2",
              () => fetch(`${BASE}/api/orders`, { method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountId: 2, items: [{ productId: 4, quantity: 1 }] }) }))}>
              Bob buys Limited Edition (stock=1!)
            </button>
            <button disabled={loading["order-fail"]} style={btn("#e53e3e")} onClick={() => run("order-fail",
              () => fetch(`${BASE}/api/orders`, { method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountId: 3, items: [{ productId: 3, quantity: 100 }] }) }))}>
              Charlie: over-stock order (should fail + rollback)
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#718096", marginTop: 8, marginBottom: 0 }}>
            The limited edition product has only 1 in stock. Click it twice to see the second fail atomically.
          </p>
        </div>

        {/* Optimistic Locking */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>3. Optimistic Locking (version column)</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={btn("#9f7aea")} onClick={() => {
              const acct = accounts[0]; if (!acct) return;
              run("opt-correct", () => fetch(`${BASE}/api/accounts/1/optimistic`,
                { method: "PATCH", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ version: acct.version, newBalance: parseFloat(acct.balance) + 50 }) }));
            }}>Update with correct version (should work)</button>
            <button style={btn("#e53e3e")} onClick={() =>
              run("opt-stale", () => fetch(`${BASE}/api/accounts/1/optimistic`,
                { method: "PATCH", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ version: 1, newBalance: 9999 }) }))}>
              Update with stale version=1 (should 409 Conflict)
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#718096", marginTop: 8, marginBottom: 0 }}>
            Optimistic locking detects concurrent modifications without blocking reads. Version must match.
          </p>
        </div>

        {/* Race Condition Test */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>4. Race Condition Test — Concurrent Transfers</h3>
          <button style={btn("#e53e3e")} disabled={loading["race"]} onClick={async () => {
            setLoading(p => ({ ...p, race: true }));
            addLog("🔥 Firing 5 concurrent transfers...");
            const results = await Promise.allSettled(
              Array.from({ length: 5 }, () =>
                fetch(`${BASE}/api/transfer`, { method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ fromId: 1, toId: 2, amount: 50 }) }
                ).then(r => r.json())
              )
            );
            const ok = results.filter(r => r.status === "fulfilled" && (r.value as { status?: string }).status === "success").length;
            const fail = results.length - ok;
            addLog(`Race test: ${ok} succeeded, ${fail} failed (expected if balance < total)`, ok > 0);
            setLoading(p => ({ ...p, race: false })); await refresh();
          }}>
            {loading["race"] ? "Running..." : "🔥 Fire 5 concurrent transfers (Alice→Bob $50 each)"}
          </button>
          <p style={{ fontSize: 12, color: "#718096", marginTop: 8, marginBottom: 0 }}>
            FOR UPDATE locks prevent race conditions. All transactions will serialize safely.
          </p>
        </div>

        {/* Log */}
        <div style={{ ...card, background: "#1a202c" }}>
          <div style={{ color: "#a0aec0", fontSize: 12, marginBottom: 6 }}>Activity Log</div>
          {log.length === 0 ? <div style={{ color: "#4a5568", fontSize: 12 }}>Click buttons to see activity...</div>
            : log.map((l, i) => <div key={i} style={{ color: l.ok ? "#a8ff78" : "#fc8181", fontSize: 12, marginBottom: 2 }}>{l.msg}</div>)}
        </div>
      </div>
    </div>
  );
}
