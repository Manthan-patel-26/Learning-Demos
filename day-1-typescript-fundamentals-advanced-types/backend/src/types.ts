/**
 * ============================================================
 * TYPESCRIPT ADVANCED TYPES - CORE TYPE DEFINITIONS
 * ============================================================
 * 
 * This file demonstrates all the key TypeScript advanced type
 * concepts you need for production code.
 */

// ─────────────────────────────────────────────
// 1. UNION TYPES
//    A value that can be one of several types.
// ─────────────────────────────────────────────

// Simple union: a status can only be these 3 strings
export type HttpStatus = "success" | "error" | "loading";

// Union of types (not just literals)
export type StringOrNumber = string | number;

// ─────────────────────────────────────────────
// 2. DISCRIMINATED UNIONS (tagged unions)
//    The BEST pattern for API responses!
//    Each variant has a "discriminant" field
//    that TypeScript uses to narrow the type.
// ─────────────────────────────────────────────

// Success variant - has `data`, no `error`
export type ApiSuccess<T> = {
  status: "success"; // <-- discriminant field
  data: T;
  message: string;
  timestamp: string;
};

// Error variant - has `error`, no `data`
export type ApiError = {
  status: "error"; // <-- discriminant field
  error: {
    code: string;
    message: string;
    details?: unknown; // unknown is safer than any
  };
  timestamp: string;
};

// The combined response type - a discriminated union
// TypeScript will narrow based on the `status` field
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────
// 3. INTERSECTION TYPES
//    Combine multiple types into one (like extends)
// ─────────────────────────────────────────────

// Base entity - every DB record has these
export type BaseEntity = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

// Specific domain type
export type UserData = {
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
};

// Intersection: User IS a BaseEntity AND has UserData
// The & operator merges both types - you need ALL fields
export type User = BaseEntity & UserData;

// Another example: a Product
export type ProductData = {
  name: string;
  price: number;
  category: string;
  stock: number;
};

export type Product = BaseEntity & ProductData;

// ─────────────────────────────────────────────
// 4. MAPPED TYPES
//    Transform every property in a type
// ─────────────────────────────────────────────

// Make every field in T optional for PATCH requests
// This is what the built-in Partial<T> does internally
export type PartialUpdate<T> = {
  [K in keyof T]?: T[K]; // ? makes each property optional
};

// Make every field in T read-only
// Useful for config objects, constants
export type Immutable<T> = {
  readonly [K in keyof T]: T[K];
};

// Make nested objects also partial (deep partial)
// This is more powerful than built-in Partial<T>
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// ─────────────────────────────────────────────
// 5. GENERICS WITH CONSTRAINTS
//    Write reusable code that works with many
//    types, but only types that meet conditions
// ─────────────────────────────────────────────

// T must have an 'id' field of type string
// This constraint (extends { id: string }) ensures
// we can safely access entity.id
export type WithId = { id: string };

// ─────────────────────────────────────────────
// 6. UTILITY TYPES - Production Examples
//    TypeScript's built-in type transformers
// ─────────────────────────────────────────────

// What you receive from the client to create a user
// Omit removes 'id', 'createdAt', 'updatedAt' - server generates these
export type CreateUserInput = Omit<User, "id" | "createdAt" | "updatedAt">;

// What you receive from client to update a user
// Pick selects only specific fields, then make them all optional
export type UpdateUserInput = Partial<Pick<User, "name" | "email" | "role">>;

// A safe public version - never expose passwords or internal fields
export type PublicUser = Omit<User, never>; // in a real app: Omit<User, 'passwordHash'>

// Record<K, V> - an object with keys of type K and values of type V
// Great for lookup tables / dictionaries
export type UserByEmail = Record<string, User>;
export type RolePermissions = Record<UserData["role"], string[]>;
