# Day 29 — TypeScript Advanced Features

## What You'll Learn
- **Template Literal Types** — generate unions from string patterns at compile time
- **Conditional Types + `infer`** — extract type information from other types
- **Branded / Nominal Types** — prevent mixing structurally identical types
- **Recursive Types** — model trees, JSON, and infinitely nested structures
- **Advanced Mapped Types** — filter, rename, and transform object types
- **Type-Safe Route Builder** — extract route params from path strings at type level

> **Key principle:** Everything in this day costs **zero bytes at runtime**.
> All the complexity lives in the type system and is erased at compile time.

---

## Project Structure

```
day-29-typescript-advanced-features/
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── types/advanced.ts          ← ALL advanced type patterns (read this first!)
│   │   ├── routes/typeSafeRoutes.ts   ← TypeSafeRouter in practice
│   │   └── routes/brandedTypes.ts     ← REST API with branded type validation
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── types/index.ts             ← Frontend branded types + utilities
    │   ├── utils/concepts.ts          ← Concept data for the playground UI
    │   ├── components/
    │   │   ├── ConceptCard.tsx        ← Expandable concept explanation cards
    │   │   └── BrandedDemo.tsx        ← Live branded type API demo
    │   └── App.tsx
    └── package.json
```

---

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
# → http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

**Run the type-checker** (no compilation, just type errors):
```bash
cd backend && npm run type-check
cd frontend && npm run type-check
```

---

## API Endpoints (Demo)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/demo/type-info` | Returns concept documentation JSON |
| `POST` | `/api/demo/users` | Create user — validates `EmailAddress` brand |
| `POST` | `/api/demo/orders` | Create order — validates `UserId` + `USD` brands |
| `GET` | `/api/demo/users` | List all created users |
| `GET` | `/api/demo/orders` | List all created orders |

### Create User
```bash
curl -X POST http://localhost:3001/api/demo/users \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com"}'
# → {"user":{"id":"usr_1234","email":"alice@example.com","createdAt":"..."}}

curl -X POST http://localhost:3001/api/demo/users \
  -H "Content-Type: application/json" \
  -d '{"email": "not-an-email"}'
# → 400: {"error":"Invalid email: not-an-email"}
```

---

## Core Concepts

### 1. Template Literal Types

```typescript
type Method   = 'GET' | 'POST' | 'DELETE';
type Version  = 'v1' | 'v2';
type Resource = 'users' | 'products';

// Generates ALL combinations at compile time (no runtime cost)
type ApiRoute = `${Method} /${Version}/${Resource}`;
// = "GET /v1/users" | "GET /v1/products" | "POST /v1/users" | ... (12 total)

function callApi(route: ApiRoute) {}
callApi('GET /v1/users');   // ✓ autocomplete works
callApi('FETCH /v1/lol');   // ✗ compile error
```

### 2. Conditional Types + `infer`

```typescript
// Extract the resolved type from any Promise depth
type UnwrapPromise<T> =
  T extends Promise<infer U> ? UnwrapPromise<U> : T;

type A = UnwrapPromise<Promise<string>>;           // string
type B = UnwrapPromise<Promise<Promise<number>>>;  // number

// Extract route parameters from path strings
type ExtractParams<P extends string> =
  P extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<`/${Rest}`>
    : P extends `${string}:${infer Param}`
    ? Param
    : never;

type Params = ExtractParams<'/users/:userId/orders/:orderId'>;
// = "userId" | "orderId"
```

### 3. Branded Types (most practically useful)

```typescript
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

type UserId  = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

// ✗ Without branding: this compiles but is WRONG
function cancelOrder(userId: string, orderId: string) {}
cancelOrder(orderId, userId); // Swapped! TypeScript can't catch this.

// ✓ With branding: swap is a compile error
function cancelOrder(userId: UserId, orderId: OrderId) {}
cancelOrder(orderId, userId); // ✗ Type error: OrderId ≠ UserId
```

**Where branded types shine:**
- User IDs, Order IDs, Product IDs (prevents cross-entity ID confusion)
- Currency types (USD, EUR — prevents math across currencies)
- Validated strings (EmailAddress, PhoneNumber, SlugString)
- Units (Meters, Kilometers, Miles — prevents unit confusion)

### 4. Recursive Types

```typescript
// TypeScript resolves recursive types lazily — no infinite loops
type JsonValue =
  | string | number | boolean | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type DeepReadonly<T> =
  T extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

// Depth limit: TypeScript stops recursing at ~100 levels
// For deeper structures, use conditional types with explicit limits
```

---

## Common Gotchas

### 1. Template literal type performance
Large unions (100+ combinations) slow down the TypeScript compiler.
Keep the cardinality manageable:
```typescript
// ✓ Fine: 3 × 3 × 3 = 27 combinations
type Route = `${A} ${B} ${C}`;

// ✗ Slow: 10 × 10 × 10 = 1000 combinations
type HugeUnion = `${TenOptions} ${TenOptions} ${TenOptions}`;
```

### 2. Conditional type distribution
When a union type is passed to a conditional type, it distributes over the union:
```typescript
type IsString<T> = T extends string ? 'yes' : 'no';
type R = IsString<string | number>;
// = IsString<string> | IsString<number>
// = 'yes' | 'no'
// NOT: 'yes' | 'no' as a single evaluation of the whole union

// To prevent distribution, wrap in a tuple:
type IsStringExact<T> = [T] extends [string] ? 'yes' : 'no';
type R2 = IsStringExact<string | number>; // 'no' (the union isn't a string)
```

### 3. Branded type smart constructors are the only safe entry point
```typescript
// ✗ WRONG — casting bypasses validation
const id = 'bad input' as UserId;

// ✓ CORRECT — smart constructor validates first
const id = toUserId('good-id'); // throws if invalid, returns UserId
```

### 4. Recursive type depth limits
TypeScript enforces a recursion limit (~100 levels). For deeply nested structures,
use iterative approaches or utility libraries like `type-fest`.

---

## Extending This Project

1. **`type-fest`** — comprehensive collection of utility types:
   ```bash
   npm install type-fest
   ```

2. **Zod + branded types** — validate AND brand in one schema:
   ```typescript
   const UserIdSchema = z.string().min(1).brand<'UserId'>();
   type UserId = z.infer<typeof UserIdSchema>; // Branded automatically
   ```

3. **`ts-pattern`** — exhaustive pattern matching on discriminated unions:
   ```typescript
   import { match } from 'ts-pattern';
   const result = match(shape)
     .with({ kind: 'circle' }, c => Math.PI * c.radius ** 2)
     .with({ kind: 'rect' }, r => r.width * r.height)
     .exhaustive(); // Compile error if a case is missing!
   ```
