/**
 * ============================================================
 * DAY 21: COMPONENTS UNDER TEST
 * ============================================================
 * These 5 components cover the full range of testing scenarios:
 *  1. LoginForm      — form validation, user interaction
 *  2. UserCard       — conditional rendering, props
 *  3. AsyncDataList  — async data fetching, loading/error states
 *  4. Counter        — stateful component, complex interactions
 *  5. SearchBar      — debounced input, callback testing
 */

import React, { useState, useEffect, useCallback, useRef } from "react";

// ─── 1. LOGIN FORM ────────────────────────────────────────
export interface LoginFormProps {
  onSubmit: (credentials: { email: string; password: string }) => Promise<void>;
  isLoading?: boolean;
}

export function LoginForm({ onSubmit, isLoading = false }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Invalid email address";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    try {
      await onSubmit({ email, password });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Login form">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={errors.email ? "email-error" : undefined}
          aria-invalid={!!errors.email}
          data-testid="email-input"
        />
        {errors.email && (
          <span id="email-error" role="alert" data-testid="email-error">
            {errors.email}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={errors.password ? "password-error" : undefined}
          aria-invalid={!!errors.password}
          data-testid="password-input"
        />
        {errors.password && (
          <span id="password-error" role="alert" data-testid="password-error">
            {errors.password}
          </span>
        )}
      </div>

      {submitError && (
        <div role="alert" data-testid="submit-error">
          {submitError}
        </div>
      )}

      <button type="submit" disabled={isLoading} data-testid="submit-button">
        {isLoading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

// ─── 2. USER CARD ─────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
  avatar?: string;
  isActive: boolean;
}

export interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDeactivate?: (userId: string) => void;
  showActions?: boolean;
}

export function UserCard({
  user,
  onEdit,
  onDeactivate,
  showActions = true,
}: UserCardProps) {
  return (
    <article
      aria-label={`User card for ${user.name}`}
      data-testid="user-card"
      style={{ opacity: user.isActive ? 1 : 0.5 }}
    >
      {user.avatar ? (
        <img src={user.avatar} alt={`${user.name}'s avatar`} />
      ) : (
        <div data-testid="avatar-fallback" aria-label="No avatar">
          {user.name[0]?.toUpperCase()}
        </div>
      )}
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <span data-testid="user-role" aria-label={`Role: ${user.role}`}>
        {user.role}
      </span>
      {!user.isActive && <span data-testid="inactive-badge">Inactive</span>}
      {showActions && (
        <div>
          {onEdit && (
            <button onClick={() => onEdit(user)} data-testid="edit-button">
              Edit
            </button>
          )}
          {onDeactivate && user.isActive && (
            <button
              onClick={() => onDeactivate(user.id)}
              data-testid="deactivate-button"
            >
              Deactivate
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// ─── 3. ASYNC DATA LIST ───────────────────────────────────
export interface AsyncDataListProps {
  fetchData: () => Promise<string[]>;
  title: string;
}

export function AsyncDataList({ fetchData, title }: AsyncDataListProps) {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchData()
      .then((data) => {
        if (!cancelled) {
          setItems(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  if (loading) return <div data-testid="loading-spinner">Loading...</div>;
  if (error)
    return (
      <div data-testid="error-message" role="alert">
        {error}
      </div>
    );
  if (items.length === 0)
    return <p data-testid="empty-state">No items found</p>;

  return (
    <section>
      <h2>{title}</h2>
      <ul data-testid="items-list">
        {items.map((item, i) => (
          <li key={i} data-testid="list-item">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── 4. COUNTER ───────────────────────────────────────────
export interface CounterProps {
  initialValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
}

export function Counter({
  initialValue = 0,
  min = -Infinity,
  max = Infinity,
  step = 1,
  onChange,
}: CounterProps) {
  const [count, setCount] = useState(initialValue);

  function update(newValue: number) {
    const clamped = Math.min(max, Math.max(min, newValue));
    setCount(clamped);
    onChange?.(clamped);
  }

  return (
    <div aria-label="Counter">
      <button
        onClick={() => update(count - step)}
        disabled={count <= min}
        data-testid="decrement-button"
        aria-label="Decrement"
      >
        −
      </button>
      <span data-testid="count-display" aria-live="polite">
        {count}
      </span>
      <button
        onClick={() => update(count + step)}
        disabled={count >= max}
        data-testid="increment-button"
        aria-label="Increment"
      >
        +
      </button>
      <button
        onClick={() => update(initialValue)}
        data-testid="reset-button"
        aria-label="Reset"
      >
        Reset
      </button>
    </div>
  );
}

// ─── 5. SEARCH BAR ────────────────────────────────────────
export interface SearchBarProps {
  onSearch: (query: string) => void;
  debounceMs?: number;
  placeholder?: string;
}

export function SearchBar({
  onSearch,
  debounceMs = 300,
  placeholder = "Search...",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const debouncedSearch = useCallback(
    (value: string) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(value), debounceMs);
    },
    [onSearch, debounceMs],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  }

  function handleClear() {
    setQuery("");
    onSearch("");
    clearTimeout(timerRef.current);
  }

  return (
    <div role="search">
      <input
        type="search"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Search"
        data-testid="search-input"
      />
      {query && (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          data-testid="clear-button"
        >
          ✕
        </button>
      )}
    </div>
  );
}
