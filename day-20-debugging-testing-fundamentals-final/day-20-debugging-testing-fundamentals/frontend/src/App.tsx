import React, { useState } from "react";
const BASE = "http://localhost:3001";
export default function App() {
  const [log, setLog] = useState<string[]>([]);
  const [health, setHealth] = useState<{ memoryMB: number; requestLogSize: number; balance: number } | null>(null);
  function addLog(msg: string) { setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]); }
  async function getHealth() {
    const r = await fetch(`${BASE}/health`); const d = await r.json();
    setHealth(d); addLog(`Health: ${d.memoryMB}MB heap, ${d.requestLogSize} log entries, balance: $${d.balance}`);
  }
  async function triggerWork(n: number) {
    addLog(`Triggering /api/work/${n} (will block event loop for ~${n}s)...`);
    const t = Date.now();
    await fetch(`${BASE}/api/work/${n}`);
    addLog(`Work/${n} completed in ${Date.now()-t}ms`);
  }
  async function triggerWithdraw(n: number) {
    addLog(`Sending ${n} concurrent withdrawals of $200...`);
    await Promise.all(Array.from({length:n},()=>fetch(`${BASE}/api/withdraw`,{method:"POST",headers:{"Content-Type":"application/json"},body:'{"amount":200}'})));
    addLog("All withdrawals done. Check balance (may be negative — race condition!)");
    getHealth();
  }
  return (
    <div style={{ fontFamily:"system-ui", padding:24, maxWidth:800, margin:"0 auto" }}>
      <h1>🐛 Day 20: Debug the Buggy Server</h1>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
        <button onClick={getHealth} style={{ padding:"8px 14px",borderRadius:6,border:"none",background:"#4299e1",color:"#fff",cursor:"pointer" }}>Check Health</button>
        <button onClick={async()=>{addLog("Making 500 requests for memory leak test...");for(let i=0;i<500;i++) await fetch(`${BASE}/api/work/0`).catch(()=>{});await getHealth();}} style={{ padding:"8px 14px",borderRadius:6,border:"none",background:"#9f7aea",color:"#fff",cursor:"pointer" }}>Test Memory Leak (500 req)</button>
        <button onClick={()=>triggerWork(3)} style={{ padding:"8px 14px",borderRadius:6,border:"none",background:"#ed8936",color:"#fff",cursor:"pointer" }}>Block Event Loop (3s)</button>
        <button onClick={()=>triggerWithdraw(10)} style={{ padding:"8px 14px",borderRadius:6,border:"none",background:"#e53e3e",color:"#fff",cursor:"pointer" }}>Race Condition (10 concurrent)</button>
        <button onClick={async()=>{addLog("Triggering crash...");fetch(`${BASE}/api/crash`);}} style={{ padding:"8px 14px",borderRadius:6,border:"none",background:"#1a202c",color:"#fff",cursor:"pointer" }}>Unhandled Rejection (crash)</button>
      </div>
      {health && (
        <div style={{ background:"#fff",borderRadius:8,padding:12,boxShadow:"0 1px 3px rgba(0,0,0,0.1)",marginBottom:16,display:"flex",gap:24 }}>
          <div><div style={{ fontSize:12,color:"#a0aec0" }}>Heap Memory</div><div style={{ fontSize:20,fontWeight:700,color:health.memoryMB>100?"#e53e3e":"#38a169" }}>{health.memoryMB}MB</div></div>
          <div><div style={{ fontSize:12,color:"#a0aec0" }}>Request Log Size</div><div style={{ fontSize:20,fontWeight:700,color:health.requestLogSize>500?"#e53e3e":"#38a169" }}>{health.requestLogSize}</div></div>
          <div><div style={{ fontSize:12,color:"#a0aec0" }}>Account Balance</div><div style={{ fontSize:20,fontWeight:700,color:health.balance<0?"#e53e3e":"#38a169" }}>${health.balance}</div></div>
        </div>
      )}
      <div style={{ background:"#1a202c",borderRadius:8,padding:12,minHeight:200 }}>
        <div style={{ color:"#a0aec0",fontSize:12,marginBottom:8 }}>Event Log</div>
        {log.map((l,i)=><div key={i} style={{ color:"#a8ff78",fontSize:12,marginBottom:4 }}>{l}</div>)}
        {log.length===0&&<div style={{ color:"#4a5568" }}>Click buttons above to trigger bugs...</div>}
      </div>
    </div>
  );
}
