# Day 1: TypeScript Fundamentals - Advanced Types

**Date:** February 11, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build

A type-safe API Response Handler with discriminated unions, generics, utility types, and type guards.

---

## 📁 Project Structure

```
day-1-typescript-fundamentals-advanced-types/
├── backend/           # Express + TypeScript API
│   ├── src/
│   │   ├── types.ts       ← ALL type definitions with explanations
│   │   ├── typeGuards.ts  ← Runtime type validation
│   │   ├── apiHandler.ts  ← Generic API handler (the challenge!)
│   │   └── index.ts       ← Express server with demo routes
│   ├── package.json
│   └── tsconfig.json
├── frontend/          # React + TypeScript UI
│   ├── src/
│   │   ├── types.ts   ← Frontend type mirrors
│   │   └── App.tsx    ← Demo UI showing all concepts
│   └── package.json
└── README.md
```

---

## 🚀 How to Run

### Backend

```bash
cd backend
npm install
npm run dev
# Server starts at http://localhost:3001
```

### Frontend (separate terminal)

```bash
cd frontend
npm install
npm start
# App opens at http://localhost:3000
```

---

## 🔗 API Endpoints to Test

```
GET  http://localhost:3001/api/demo         ← See all concepts in one response
GET  http://localhost:3001/api/users/all    ← List users
GET  http://localhost:3001/api/users/1      ← Get user by ID
POST http://localhost:3001/api/users        ← Create user
GET  http://localhost:3001/api/safe-async   ← safeAsync wrapper demo
```

**POST /api/users body example:**

```json
{
  "name": "Charlie",
  "email": "charlie@example.com",
  "role": "user"
}
```

---

## 📖 Study Guide

### Key Concepts (read in this order)

1. **`backend/src/types.ts`** - Start here. All type definitions with inline explanations:
   - Union types (`"admin" | "user" | "guest"`)
   - Discriminated unions (`status: "success" | "error"`)
   - Intersection types (`BaseEntity & UserData`)
   - Mapped types (`{ [K in keyof T]?: T[K] }`)
   - Utility types (`Omit`, `Pick`, `Partial`, `Record`)

2. **`backend/src/typeGuards.ts`** - Runtime safety:
   - Why type assertions (`as User`) are dangerous
   - How to write type guards (`value is User`)
   - The `in` operator for property checks

3. **`backend/src/apiHandler.ts`** - The challenge solution:
   - Generic class `ApiHandler<T extends object>`
   - Factory functions `createSuccess<T>`, `createError`
   - `safeAsync<T>` wrapper pattern

4. **`frontend/src/App.tsx`** - Same concepts in React:
   - `useState<User[]>()` - typed state
   - `GenericList<T extends { id: string }>` - generic component
   - `Record<Status, CSSProperties>` - typed lookup table

---

## ⚠️ Common Gotchas (Senior Level Tips)

### 1. `any` vs `unknown`

```typescript
// ❌ BAD - any disables ALL type checking
function processData(data: any) {
  data.nonExistentMethod(); // TypeScript won't catch this!
}

// ✅ GOOD - unknown forces you to check before use
function processData(data: unknown) {
  if (typeof data === "string") {
    console.log(data.toUpperCase()); // Safe! TypeScript knows it's a string here
  }
}
```

### 2. Type Assertion vs Type Guard

```typescript
// ❌ UNSAFE - you're forcing TypeScript to believe you
const user = data as User; // No runtime check!
user.email.toLowerCase(); // Can crash if data isn't actually a User

// ✅ SAFE - check at runtime
if (isUser(data)) {
  data.email.toLowerCase(); // TypeScript AND runtime both know it's a User
}
```

### 3. Structural Typing (TypeScript's "Duck Typing")

```typescript
type Point2D = { x: number; y: number };
type Point3D = { x: number; y: number; z: number };

// This works in TypeScript! Point3D is assignable to Point2D
// because it has all the required properties.
const p3d: Point3D = { x: 1, y: 2, z: 3 };
const p2d: Point2D = p3d; // ✅ No error!

// BUT - excess property checking on object literals:
const p2dLiteral: Point2D = { x: 1, y: 2, z: 3 }; // ❌ Error! Extra property 'z'
```

### 4. `readonly` vs `const`

```typescript
const arr = [1, 2, 3];
arr.push(4); // ✅ Works! const prevents reassignment, NOT mutation

const readonlyArr: readonly number[] = [1, 2, 3];
readonlyArr.push(4); // ❌ Error! readonly prevents mutation at compile time
// Note: readonly is compile-time only - can be bypassed at runtime
```

---

## ✅ Self-Check Questions

After completing this day, you should be able to answer:

1. When should you use a discriminated union instead of a simple union?
2. What's the difference between `Partial<T>` and `DeepPartial<T>`?
3. Why is `unknown` safer than `any`? Give a real example.
4. What does `extends` mean in a generic constraint like `T extends object`?
5. How does TypeScript know which variant of a discriminated union you're working with?
6. When would you use `Pick` vs `Omit`?

---

## 🏆 Extension Challenges (if you finish early)

1. Add a `Result<T, E>` type (Rust-inspired) as an alternative to `ApiResponse<T>`
2. Create a `Nullable<T>` mapped type that adds `| null` to every field
3. Implement a `Flatten<T>` type that unwraps `Promise<T>` to `T`
4. Add `zod` validation to the POST endpoint to validate request bodies
