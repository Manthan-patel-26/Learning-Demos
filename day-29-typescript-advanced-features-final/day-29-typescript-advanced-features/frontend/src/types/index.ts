// src/types/index.ts
// Frontend copy of branded types — in a real monorepo these would be a shared package.

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type UserId      = Brand<string, 'UserId'>;
export type OrderId     = Brand<string, 'OrderId'>;
export type EmailAddress = Brand<string, 'EmailAddress'>;
export type USD         = Brand<number, 'USD'>;

// Smart constructors (same validation as backend)
export function toUserId(id: string): UserId {
  if (!id.trim()) throw new Error('UserId cannot be empty');
  return id as UserId;
}
export function toEmailAddress(email: string): EmailAddress {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Invalid email: ${email}`);
  return email as EmailAddress;
}
export function toUSD(n: number): USD {
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid USD amount');
  return n as USD;
}

// ── Template literal types demo ──────────────────────────────────────────
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiVersion = 'v1' | 'v2' | 'v3';
export type ApiRoute = `${HttpMethod} /${ApiVersion}/${'users' | 'products' | 'orders'}`;

// ── Conditional types demo ──────────────────────────────────────────────
export type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T;
export type ElementOf<T extends readonly unknown[]> = T extends readonly (infer E)[] ? E : never;

// ── Recursive types demo ────────────────────────────────────────────────
export type JsonValue =
  | string | number | boolean | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type DeepReadonly<T> =
  T extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

// ── Route param extraction ──────────────────────────────────────────────
export type ExtractRouteParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<`/${Rest}`>
    : Path extends `${string}:${infer Param}`
    ? Param
    : never;

export type RouteParams<Path extends string> =
  ExtractRouteParams<Path> extends never
    ? Record<string, never>
    : { [K in ExtractRouteParams<Path>]: string };

// Concept data for the UI
export interface TypeConcept {
  id: string;
  title: string;
  category: 'template-literal' | 'conditional' | 'branded' | 'recursive' | 'mapped';
  difficulty: 'intermediate' | 'advanced' | 'expert';
  description: string;
  problem: string;
  solution: string;
  codeExample: string;
  compilesTo: string;
}
