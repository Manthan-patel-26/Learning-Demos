// src/components/ApiExplorer.tsx
// Interactive REST API explorer — make live requests, see responses, headers, and HATEOAS links.

import { useState } from 'react';
import { RequestLog } from '../types/index.js';

interface Endpoint {
  method: string;
  path: string;
  description: string;
  body?: string;
  badge?: string;
}

const ENDPOINTS: Endpoint[] = [
  { method: 'GET',    path: '/api',                   description: 'API discovery root — HATEOAS entry point', badge: 'HATEOAS' },
  { method: 'GET',    path: '/api/v1/products',        description: 'List products (v1) — paginated + links' },
  { method: 'GET',    path: '/api/v2/products',        description: 'List products (v2) — new price/category shape', badge: 'v2' },
  { method: 'GET',    path: '/api/v1/products?page=1&pageSize=5&sort=price&order=asc', description: 'Filtered list — page 1, sorted by price ascending' },
  { method: 'GET',    path: '/api/v1/products?category=Electronics', description: 'Filter by category' },
  { method: 'POST',   path: '/api/v1/products',        description: 'Create product — returns 201 + Location header', badge: '201', body: JSON.stringify({ name: 'New Gadget XR', description: 'A brand new gadget with amazing features and capabilities', price: 149.99, category: 'Electronics', stock: 25, sku: 'ELEC-NGX-' + Date.now().toString().slice(-4) }, null, 2) },
  { method: 'POST',   path: '/api/v1/products',        description: 'Invalid create — see validation error envelope', badge: 'Error', body: JSON.stringify({ name: 'X', price: -5, category: 'InvalidCat', sku: 'bad sku!' }, null, 2) },
  { method: 'GET',    path: '/api/openapi',            description: 'OpenAPI 3.0 specification', badge: 'OpenAPI' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: '#10b981', POST: '#6366f1', PATCH: '#f59e0b', DELETE: '#ef4444', PUT: '#8b5cf6',
};

function formatMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

export function ApiExplorer() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [activeLog, setActiveLog] = useState<RequestLog | null>(null);
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'links'>('body');
  const [loading, setLoading] = useState(false);
  const [customPath, setCustomPath] = useState('');
  const [customMethod, setCustomMethod] = useState('GET');
  const [customBody, setCustomBody] = useState('');

  const makeRequest = async (method: string, url: string, body?: string) => {
    setLoading(true);
    const start = Date.now();
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body && method !== 'GET' ? { body } : {}),
      });
      const ms = Date.now() - start;
      const responseBody = await res.json().catch(() => null);
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => { headers[k] = v; });

      const log: RequestLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString(),
        method,
        url,
        status: res.status,
        ms,
        requestId: headers['x-request-id'] ?? '—',
        responseBody,
        responseHeaders: headers,
      };
      setLogs(prev => [log, ...prev].slice(0, 20));
      setActiveLog(log);
      setActiveTab('body');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const links = activeLog && typeof activeLog.responseBody === 'object' && activeLog.responseBody !== null
    ? (activeLog.responseBody as Record<string, unknown>)['links'] as Array<{ rel: string; href: string; method: string }> | undefined
    : undefined;

  return (
    <div className="explorer">
      {/* Left panel: endpoint list */}
      <aside className="explorer-sidebar">
        <h2 className="sidebar-title">Endpoints</h2>

        <div className="endpoint-list">
          {ENDPOINTS.map((ep, i) => (
            <button
              key={i}
              className="endpoint-btn"
              onClick={() => makeRequest(ep.method, ep.path, ep.body)}
              disabled={loading}
            >
              <span className="ep-method" style={{ color: METHOD_COLORS[ep.method] ?? '#fff' }}>{ep.method}</span>
              <span className="ep-path">{ep.path}</span>
              {ep.badge && <span className="ep-badge">{ep.badge}</span>}
              <span className="ep-desc">{ep.description}</span>
            </button>
          ))}
        </div>

        {/* Custom request */}
        <div className="custom-request">
          <h3 className="custom-title">Custom Request</h3>
          <div className="custom-row">
            <select className="custom-method" value={customMethod} onChange={e => setCustomMethod(e.target.value)}>
              {['GET','POST','PATCH','DELETE'].map(m => <option key={m}>{m}</option>)}
            </select>
            <input className="custom-path" value={customPath} onChange={e => setCustomPath(e.target.value)} placeholder="/api/v1/products/..." />
          </div>
          {customMethod !== 'GET' && (
            <textarea className="custom-body" value={customBody} onChange={e => setCustomBody(e.target.value)} placeholder='{"name": "..."}' rows={4} />
          )}
          <button className="custom-send-btn" onClick={() => makeRequest(customMethod, customPath, customBody)} disabled={loading || !customPath}>
            {loading ? 'Sending...' : 'Send Request →'}
          </button>
        </div>
      </aside>

      {/* Right panel: response viewer */}
      <main className="explorer-main">
        {activeLog ? (
          <>
            {/* Status bar */}
            <div className="response-status-bar">
              <span className="rs-method" style={{ color: METHOD_COLORS[activeLog.method] ?? '#fff' }}>{activeLog.method}</span>
              <span className="rs-url">{activeLog.url}</span>
              <span className={`rs-status ${activeLog.status < 300 ? 'rs-ok' : activeLog.status < 400 ? 'rs-redirect' : 'rs-error'}`}>
                {activeLog.status}
              </span>
              <span className="rs-time">{formatMs(activeLog.ms)}</span>
              <span className="rs-reqid">ID: {activeLog.requestId.slice(0, 8)}…</span>
            </div>

            {/* Tab switcher */}
            <div className="response-tabs">
              {(['body', 'headers', 'links'] as const).map(tab => (
                <button key={tab} className={`resp-tab ${activeTab === tab ? 'resp-tab-active' : ''}`}
                  onClick={() => setActiveTab(tab)}>
                  {tab === 'body' ? '📄 Response Body' : tab === 'headers' ? '📋 Headers' : `🔗 HATEOAS Links ${links ? `(${links.length})` : ''}`}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="response-content">
              {activeTab === 'body' && (
                <pre className="response-json">{JSON.stringify(activeLog.responseBody, null, 2)}</pre>
              )}
              {activeTab === 'headers' && (
                <table className="headers-table">
                  <thead><tr><th>Header</th><th>Value</th></tr></thead>
                  <tbody>
                    {Object.entries(activeLog.responseHeaders).map(([k, v]) => (
                      <tr key={k} className={['x-request-id','x-api-version','etag','location','deprecation','sunset'].includes(k) ? 'header-highlight' : ''}>
                        <td className="header-key">{k}</td>
                        <td className="header-val">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === 'links' && (
                links && links.length > 0 ? (
                  <div className="links-list">
                    {links.map((l, i) => (
                      <div key={i} className="link-item">
                        <span className="link-method" style={{ color: METHOD_COLORS[l.method] ?? '#fff' }}>{l.method}</span>
                        <span className="link-rel">{l.rel}</span>
                        <button className="link-follow" onClick={() => makeRequest(l.method, l.href)}>
                          {l.href}
                        </button>
                      </div>
                    ))}
                    <p className="links-hint">↑ Click any link to follow it — this is HATEOAS in action!</p>
                  </div>
                ) : <p className="no-links">No HATEOAS links in this response</p>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p className="empty-icon">🚀</p>
            <p className="empty-title">Click an endpoint to make a request</p>
            <p className="empty-hint">Responses, headers, and HATEOAS links will appear here</p>
          </div>
        )}

        {/* Request history */}
        {logs.length > 1 && (
          <div className="history">
            <h3 className="history-title">History</h3>
            <div className="history-list">
              {logs.slice(1).map(log => (
                <button key={log.id} className="history-item" onClick={() => setActiveLog(log)}>
                  <span className="h-method" style={{ color: METHOD_COLORS[log.method] ?? '#fff' }}>{log.method}</span>
                  <span className="h-url">{log.url.replace('http://localhost:3001','')}</span>
                  <span className={`h-status ${log.status < 300 ? 'hs-ok' : 'hs-err'}`}>{log.status}</span>
                  <span className="h-time">{log.ms}ms</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
