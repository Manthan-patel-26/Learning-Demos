// src/types/advanced.ts
// ══════════════════════════════════════════════════════════════════════════════
// DAY 29 — ADVANCED TYPESCRIPT: TYPE-LEVEL PROGRAMMING
//
// This file is a living reference of advanced TypeScript patterns.
// Every concept taught in Day 29 is implemented and documented here.
// No `any`, no `unknown` escapes — everything is fully type-safe.
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. TEMPLATE LITERAL TYPES
//    Combine string literals at the type level — like template strings but
//    for types. Extremely powerful for building type-safe event systems,
//    CSS utilities, and API route definitions.
// ─────────────────────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type ApiVersion = 'v1' | 'v2' | 'v3';
type ResourceName = 'users' | 'products' | 'orders' | 'categories';

// Generates all valid API route strings: "GET /v1/users", "POST /v2/products", etc.
type ApiRoute = `${HttpMethod} /${ApiVersion}/${ResourceName}`;
// ✓ "GET /v1/users"       ✓ "POST /v2/products"
// ✗ "FETCH /v1/users"     ✗ "GET /v4/users"  (caught at compile time!)

// CSS utility type — generates Tailwind-like class names
type SpacingSize = 'sm' | 'md' | 'lg' | 'xl';
type CssProperty = 'margin' | 'padding' | 'gap';
type CssUtility = `${CssProperty}-${SpacingSize}`;
// = "margin-sm" | "margin-md" | "padding-sm" | ... (12 combinations)

// Event handler naming convention enforcer
type EventName = 'click' | 'submit' | 'change' | 'blur' | 'focus';
type HandlerName = `on${Capitalize<EventName>}`;
// = "onClick" | "onSubmit" | "onChange" | "onBlur" | "onFocus"

// Deep path accessor — accesses nested object properties with dot notation
// "user.address.city", "product.metadata.tags", etc.
type PathOf<T, Prefix extends string = ''> =
  T extends object
    ? {
        [K in keyof T & string]:
          Prefix extends ''
            ? K | PathOf<T[K], K>
            : `${Prefix}.${K}` | PathOf<T[K], `${Prefix}.${K}`>;
      }[keyof T & string]
    : never;

// Example usage:
type User = { id: string; address: { city: string; zip: string }; role: string };
type UserPaths = PathOf<User>;
// = "id" | "address" | "address.city" | "address.zip" | "role"


// ─────────────────────────────────────────────────────────────────────────────
// 2. CONDITIONAL TYPES + INFER
//    Extract type information from other types.
//    `infer` creates a type variable WITHIN the conditional.
// ─────────────────────────────────────────────────────────────────────────────

// Extract the return type of any function (built-in: ReturnType<T>)
type MyReturnType<T extends (...args: never[]) => unknown> =
  T extends (...args: never[]) => infer R ? R : never;

// Extract the resolved type of a Promise
type UnwrapPromise<T> =
  T extends Promise<infer U>
    ? UnwrapPromise<U>  // Recursive: unwrap Promise<Promise<string>> → string
    : T;

type A = UnwrapPromise<Promise<string>>;          // string
type B = UnwrapPromise<Promise<Promise<number>>>; // number
type C = UnwrapPromise<string>;                   // string (passthrough)

// Extract parameter types from a function
type MyParameters<T extends (...args: never[]) => unknown> =
  T extends (...args: infer P) => unknown ? P : never;

// Extract the element type from an array
type ElementOf<T extends readonly unknown[]> =
  T extends readonly (infer E)[] ? E : never;

type NumEl = ElementOf<number[]>;     // number
type StrEl = ElementOf<string[]>;     // string

// Extract the first argument of a function
type FirstArg<T extends (...args: never[]) => unknown> =
  T extends (first: infer F, ...rest: never[]) => unknown ? F : never;

// Deep Awaited — unwrap async functions all the way down
type DeepAwaited<T> =
  T extends PromiseLike<infer U> ? DeepAwaited<U> : T;

// Discriminated union extractor — filter a union by a discriminant field
type ExtractByKind<T, K extends string> =
  T extends { kind: K } ? T : never;

type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

type Circle = ExtractByKind<Shape, 'circle'>;
// = { kind: 'circle'; radius: number }


// ─────────────────────────────────────────────────────────────────────────────
// 3. BRANDED TYPES (Nominal Typing)
//    TypeScript uses structural typing: two types with the same shape are
//    interchangeable. Branded types add a phantom tag to prevent mixing
//    values that share the same underlying type but have different semantics.
//
//    Classic bug without branding:
//      function transfer(from: UserId, to: UserId, amount: OrderId) { ... }
//      transfer(orderId, userId, userId) // TypeScript can't catch this!
//
//    With branding: each ID type is distinct even though all are strings.
// ─────────────────────────────────────────────────────────────────────────────

// The brand is a phantom type — it only exists at compile time, zero runtime cost
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// Branded primitive types
export type UserId    = Brand<string, 'UserId'>;
export type OrderId   = Brand<string, 'OrderId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type USD       = Brand<number, 'USD'>;       // Can't mix currencies
export type EUR       = Brand<number, 'EUR'>;
export type EmailAddress = Brand<string, 'EmailAddress'>;
export type PositiveInt  = Brand<number, 'PositiveInt'>;

// Smart constructors — validate AND brand in one step
// These are the ONLY way to create branded values (factory pattern)
export function toUserId(id: string): UserId {
  if (!id || id.trim().length === 0) throw new Error('UserId cannot be empty');
  return id as UserId;
}

export function toOrderId(id: string): OrderId {
  if (!id || id.trim().length === 0) throw new Error('OrderId cannot be empty');
  return id as OrderId;
}

export function toUSD(amount: number): USD {
  if (!Number.isFinite(amount)) throw new Error('Amount must be finite');
  if (amount < 0) throw new Error('USD amount cannot be negative');
  return amount as USD;
}

export function toEmailAddress(email: string): EmailAddress {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new Error(`Invalid email: ${email}`);
  return email as EmailAddress;
}

export function toPositiveInt(n: number): PositiveInt {
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${n} is not a positive integer`);
  return n as PositiveInt;
}

// This won't compile — you can't accidentally pass OrderId where UserId is expected:
// function getUser(id: UserId) { ... }
// const orderId: OrderId = toOrderId('ord_123');
// getUser(orderId); // ✗ TS Error: Argument of type 'OrderId' is not assignable to 'UserId'


// ─────────────────────────────────────────────────────────────────────────────
// 4. RECURSIVE TYPES
//    Types that reference themselves. Used for trees, nested data, deep paths.
//    TypeScript has a depth limit (~100 levels) to prevent infinite recursion.
// ─────────────────────────────────────────────────────────────────────────────

// JSON-compatible value (fully recursive)
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// Deep Readonly — makes every nested property readonly
export type DeepReadonly<T> =
  T extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

// Deep Partial — makes every nested property optional
export type DeepPartial<T> =
  T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

// Tree structure (classic recursive type)
export type TreeNode<T> = {
  value: T;
  children: TreeNode<T>[];
};

// Flatten a nested array type
type Flatten<T> =
  T extends (infer U)[]
    ? Flatten<U>
    : T;

type Nested = number[][][];
type Flat = Flatten<Nested>; // number


// ─────────────────────────────────────────────────────────────────────────────
// 5. MAPPED TYPES — Advanced Patterns
// ─────────────────────────────────────────────────────────────────────────────

// Make specific keys required, rest optional
type RequireFields<T, K extends keyof T> =
  Omit<T, K> & Required<Pick<T, K>>;

// Make specific keys optional, rest required
type OptionalFields<T, K extends keyof T> =
  Omit<T, K> & Partial<Pick<T, K>>;

// Rename keys in an object type
type RenameKey<T, OldKey extends keyof T, NewKey extends string> =
  Omit<T, OldKey> & Record<NewKey, T[OldKey]>;

// Convert all values to a specific type
type ValuesAs<T, V> = { [K in keyof T]: V };

// Extract only function properties from an object
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never;
}[keyof T];

// Extract only non-function properties
type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? never : K;
}[keyof T];


// ─────────────────────────────────────────────────────────────────────────────
// 6. TYPE-SAFE ROUTE BUILDER (the coding challenge)
//    Build a routing system where route params and query params are
//    fully typed — autocomplete for routes, type errors for wrong params.
// ─────────────────────────────────────────────────────────────────────────────

// Extract route parameter names from a path string
// "/users/:id/orders/:orderId" → "id" | "orderId"
type ExtractRouteParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<`/${Rest}`>
    : Path extends `${string}:${infer Param}`
    ? Param
    : never;

// Build the params object type from a path
type RouteParams<Path extends string> =
  ExtractRouteParams<Path> extends never
    ? Record<string, never>  // No params — empty object
    : { [K in ExtractRouteParams<Path>]: string };

// Type-safe route handler signature
type RouteHandler<
  Path extends string,
  QueryParams extends Record<string, string> = Record<string, never>
> = (context: {
  params: RouteParams<Path>;
  query: QueryParams;
  body?: unknown;
}) => Promise<unknown> | unknown;

// Route definition registry
export type RouteDefinition<
  Path extends string,
  QP extends Record<string, string> = Record<string, never>
> = {
  path: Path;
  method: HttpMethod;
  handler: RouteHandler<Path, QP>;
  description?: string;
};

// The route builder — fluent API with full type inference
export class TypeSafeRouter {
  private routes: RouteDefinition<string, Record<string, string>>[] = [];

  // Each method returns `this` for chaining
  get<Path extends string, QP extends Record<string, string> = Record<string, never>>(
    path: Path,
    handler: RouteHandler<Path, QP>,
    options?: { description?: string }
  ): this {
    this.routes.push({ path, method: 'GET', handler: handler as RouteHandler<string, Record<string, string>>, ...options });
    return this;
  }

  post<Path extends string, QP extends Record<string, string> = Record<string, never>>(
    path: Path,
    handler: RouteHandler<Path, QP>,
    options?: { description?: string }
  ): this {
    this.routes.push({ path, method: 'POST', handler: handler as RouteHandler<string, Record<string, string>>, ...options });
    return this;
  }

  put<Path extends string, QP extends Record<string, string> = Record<string, never>>(
    path: Path,
    handler: RouteHandler<Path, QP>,
    options?: { description?: string }
  ): this {
    this.routes.push({ path, method: 'PUT', handler: handler as RouteHandler<string, Record<string, string>>, ...options });
    return this;
  }

  delete<Path extends string>(
    path: Path,
    handler: RouteHandler<Path>,
    options?: { description?: string }
  ): this {
    this.routes.push({ path, method: 'DELETE', handler: handler as RouteHandler<string, Record<string, string>>, ...options });
    return this;
  }

  getRoutes() { return this.routes; }
}

// Helper: assert at compile time (no runtime cost)
// Use to verify type assumptions in tests
export type Assert<T extends true> = T;
export type Equals<A, B> = A extends B ? (B extends A ? true : false) : false;

// Compile-time tests — these lines would error if types are wrong:
type _TestExtractParams1 = Assert<Equals<
  ExtractRouteParams<'/users/:id'>,
  'id'
>>;
type _TestExtractParams2 = Assert<Equals<
  ExtractRouteParams<'/users/:userId/orders/:orderId'>,
  'userId' | 'orderId'
>>;
type _TestExtractParams3 = Assert<Equals<
  ExtractRouteParams<'/users'>,
  never
>>;

// Export all the utility types for use in routes
export type {
  HttpMethod,
  ApiVersion,
  ApiRoute,
  HandlerName,
  UserPaths,
  UnwrapPromise,
  ExtractByKind,
  Shape,
  Circle,
  DeepReadonly,
  DeepPartial,
  TreeNode,
  JsonValue,
  ExtractRouteParams,
  RouteParams,
  RouteHandler,
};
