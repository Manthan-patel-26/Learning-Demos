// src/components/BrandedDemo.tsx
// Interactive demo: call the API with branded type validation.

import { useState } from 'react';
import { toEmailAddress } from '../types/index.js';

interface DemoResult {
  success: boolean;
  data?: unknown;
  error?: string;
  validationError?: string;
}

export function BrandedDemo() {
  const [email, setEmail] = useState('');
  const [orderUserId, setOrderUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<DemoResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'user' | 'order'>('user');

  const createUser = async () => {
    // Validate with smart constructor on the frontend FIRST
    try {
      toEmailAddress(email); // Throws if invalid — branded type enforces format
    } catch (err) {
      setResult({ success: false, validationError: (err as Error).message });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/demo/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setResult({ success: res.ok, data, error: res.ok ? undefined : data.error });
    } catch {
      setResult({ success: false, error: 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  const createOrder = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setResult({ success: false, validationError: 'Amount must be a positive number (USD)' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/demo/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: orderUserId, amount: amountNum, items: 1 }),
      });
      const data = await res.json();
      setResult({ success: res.ok, data, error: res.ok ? undefined : data.error });
    } catch {
      setResult({ success: false, error: 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="branded-demo">
      <h2 className="demo-title">🔬 Live Branded Types Demo</h2>
      <p className="demo-subtitle">
        Smart constructors validate AND brand values. Invalid input is caught at the frontend
        (TypeScript + runtime) before hitting the API.
      </p>

      <div className="demo-tabs">
        {(['user', 'order'] as const).map(tab => (
          <button
            key={tab}
            className={`demo-tab ${activeTab === tab ? 'demo-tab-active' : ''}`}
            onClick={() => { setActiveTab(tab); setResult(null); }}
          >
            {tab === 'user' ? '👤 Create User' : '📦 Create Order'}
          </button>
        ))}
      </div>

      {activeTab === 'user' && (
        <div className="demo-form">
          <div className="demo-field">
            <label className="demo-label">
              Email <code className="type-tag">EmailAddress</code>
            </label>
            <input
              type="text"
              className="demo-input"
              value={email}
              onChange={e => { setEmail(e.target.value); setResult(null); }}
              placeholder="alice@example.com"
            />
            <span className="demo-hint">
              Smart constructor: <code>toEmailAddress(str)</code> — validates regex, returns branded type
            </span>
          </div>
          <button className="demo-btn" onClick={createUser} disabled={isLoading || !email}>
            {isLoading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      )}

      {activeTab === 'order' && (
        <div className="demo-form">
          <div className="demo-field">
            <label className="demo-label">
              User ID <code className="type-tag">UserId</code>
            </label>
            <input
              type="text"
              className="demo-input"
              value={orderUserId}
              onChange={e => { setOrderUserId(e.target.value); setResult(null); }}
              placeholder="usr_1234567890"
            />
            <span className="demo-hint">Create a user first, then paste their ID here</span>
          </div>
          <div className="demo-field">
            <label className="demo-label">
              Amount <code className="type-tag">USD</code>
            </label>
            <input
              type="number"
              className="demo-input"
              value={amount}
              onChange={e => { setAmount(e.target.value); setResult(null); }}
              placeholder="99.99"
              min="0.01"
              step="0.01"
            />
            <span className="demo-hint">
              Smart constructor: <code>toUSD(n)</code> — rejects negative/infinite, brands as USD
            </span>
          </div>
          <button className="demo-btn" onClick={createOrder} disabled={isLoading || !orderUserId || !amount}>
            {isLoading ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      )}

      {result && (
        <div className={`demo-result ${result.success ? 'result-success' : 'result-error'}`}>
          {result.validationError && (
            <div>
              <strong>Frontend validation failed</strong>
              <p className="result-detail">{result.validationError}</p>
              <p className="result-note">
                ✓ Caught by smart constructor before any API call was made
              </p>
            </div>
          )}
          {result.error && !result.validationError && (
            <div>
              <strong>API error</strong>
              <p className="result-detail">{JSON.stringify(result.error, null, 2)}</p>
            </div>
          )}
          {result.success && result.data && (
            <div>
              <strong>✓ Success</strong>
              <pre className="result-json">{JSON.stringify(result.data, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
