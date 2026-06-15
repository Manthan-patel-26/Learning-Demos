/**
 * DAY 31: Job Queue Dashboard
 * Monitor queues, add jobs, track progress in real time.
 */
import React, { useState, useEffect, useCallback } from "react";

const BASE = "http://localhost:3001";

interface QueueStats { name: string; waiting: number; active: number; completed: number; failed: number; delayed: number; }
interface JobInfo { id: string; name: string; state: string; progress: number | object; attemptsMade: number; returnvalue: unknown; failedReason: string; timestamp: { added: string; processed: string | null; finished: string | null }; }

export default function App() {
  const [stats, setStats] = useState<QueueStats[]>([]);
  const [jobId, setJobId] = useState("");
  const [queue, setQueue] = useState("emails");
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const addLog = useCallback((msg: string) =>
    setLog(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p.slice(0, 29)]), []);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/queues/stats`);
      const d = await r.json();
      setStats(d.data ?? []);
    } catch { addLog("⚠ Could not fetch stats — is backend running?"); }
  }, [addLog]);

  useEffect(() => {
    fetchStats();
    const t = setInterval(fetchStats, 2000);
    return () => clearInterval(t);
  }, [fetchStats]);

  async function addJob(endpoint: string, body: object, label: string) {
    setLoading(p => ({ ...p, [label]: true }));
    try {
      const r = await fetch(`${BASE}/api/jobs/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      addLog(`✅ ${label} → jobId: ${d.jobId}`);
      if (d.jobId) setJobId(d.jobId);
    } catch { addLog(`❌ Failed to add ${label} job`); }
    setLoading(p => ({ ...p, [label]: false }));
  }

  async function checkJob() {
    if (!jobId) return;
    try {
      const r = await fetch(`${BASE}/api/jobs/${queue}/${jobId}`);
      const d = await r.json();
      setJobInfo(d);
    } catch { addLog("❌ Could not fetch job"); }
  }

  const stateColor = (s: string) => ({ completed: "#38a169", active: "#4299e1", failed: "#e53e3e", waiting: "#ed8936", delayed: "#9f7aea" }[s] ?? "#718096");
  const card: React.CSSProperties = { background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: 12 };

  return (
    <div style={{ fontFamily: "system-ui", background: "#f7fafc", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>⚙️ Day 31: Job Queue Dashboard</h1>
        <div style={{ background: "#fffbeb", borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 13 }}>
          <strong>Prerequisites:</strong> <code>docker run -d -p 6379:6379 redis:alpine</code> → <code>npm run dev</code> → <code>npm run worker</code> (separate terminal)
        </div>

        {/* Queue Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          {(stats.length ? stats : [{ name:"emails",waiting:0,active:0,completed:0,failed:0,delayed:0 },
            { name:"images",waiting:0,active:0,completed:0,failed:0,delayed:0 },
            { name:"reports",waiting:0,active:0,completed:0,failed:0,delayed:0 }]).map(q => (
            <div key={q.name} style={card}>
              <div style={{ fontWeight: 700, textTransform: "capitalize", marginBottom: 8 }}>📬 {q.name}</div>
              {[["waiting",q.waiting,"#ed8936"],["active",q.active,"#4299e1"],["completed",q.completed,"#38a169"],["failed",q.failed,"#e53e3e"],["delayed",q.delayed,"#9f7aea"]].map(([k,v,c]) => (
                <div key={k as string} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:2 }}>
                  <span style={{ color:"#718096",textTransform:"capitalize" }}>{k}</span>
                  <span style={{ fontWeight:600, color: (v as number) > 0 ? c as string : "#a0aec0" }}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Add Jobs */}
        <div style={card}>
          <h3 style={{ marginTop:0 }}>Add Jobs</h3>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[
              { label:"Email (welcome)", endpoint:"email", body:{ to:`user${Date.now()}@example.com`, template:"welcome", subject:"Welcome!", variables:{} } },
              { label:"Email (priority)", endpoint:"email", body:{ to:`vip${Date.now()}@example.com`, template:"order_confirm", subject:"Order!", variables:{}, priority:20 } },
              { label:"Image Process", endpoint:"image", body:{} },
              { label:"Report (delayed)", endpoint:"report", body:{ reportType:"daily_sales", outputFormat:"pdf" } },
              { label:"Bulk (5 emails)", endpoint:"demo-bulk", body:{} },
            ].map(({ label, endpoint, body }) => (
              <button key={label} disabled={loading[label]}
                onClick={() => addJob(endpoint, body, label)}
                style={{ padding:"7px 14px", borderRadius:6, border:"none", background: loading[label] ? "#a0aec0" : "#4299e1", color:"#fff", cursor:"pointer", fontSize:13 }}>
                {loading[label] ? "Adding..." : `+ ${label}`}
              </button>
            ))}
          </div>
        </div>

        {/* Check Job */}
        <div style={card}>
          <h3 style={{ marginTop:0 }}>Check Job Status</h3>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <select value={queue} onChange={e=>setQueue(e.target.value)} style={{ padding:"7px 10px", borderRadius:6, border:"1px solid #cbd5e0" }}>
              <option value="emails">emails</option>
              <option value="images">images</option>
              <option value="reports">reports</option>
            </select>
            <input value={jobId} onChange={e=>setJobId(e.target.value)} placeholder="Job ID (auto-filled on add)" style={{ flex:1, padding:"7px 10px", borderRadius:6, border:"1px solid #cbd5e0" }} />
            <button onClick={checkJob} style={{ padding:"7px 16px", borderRadius:6, border:"none", background:"#48bb78", color:"#fff", cursor:"pointer" }}>Check</button>
          </div>
          {jobInfo && (
            <div style={{ background:"#f7fafc", borderRadius:8, padding:12 }}>
              <div style={{ display:"flex", gap:12, marginBottom:8 }}>
                <span><strong>ID:</strong> {jobInfo.id}</span>
                <span style={{ color: stateColor(jobInfo.state), fontWeight:700 }}>● {jobInfo.state}</span>
                <span><strong>Progress:</strong> {typeof jobInfo.progress === "number" ? `${jobInfo.progress}%` : "—"}</span>
                <span><strong>Attempts:</strong> {jobInfo.attemptsMade}</span>
              </div>
              {jobInfo.state === "completed" && (
                <div style={{ fontSize:13, color:"#38a169" }}>✅ Result: {JSON.stringify(jobInfo.returnvalue)}</div>
              )}
              {jobInfo.failedReason && (
                <div style={{ fontSize:13, color:"#e53e3e" }}>❌ Failed: {jobInfo.failedReason}</div>
              )}
            </div>
          )}
        </div>

        {/* Log */}
        <div style={{ ...card, background:"#1a202c" }}>
          <div style={{ color:"#a0aec0", fontSize:12, marginBottom:8 }}>Activity Log (auto-refreshes every 2s)</div>
          {log.length === 0 ? <div style={{ color:"#4a5568", fontSize:12 }}>Add a job to see activity...</div>
            : log.map((l,i) => <div key={i} style={{ color:"#a8ff78", fontSize:12, marginBottom:2 }}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}
