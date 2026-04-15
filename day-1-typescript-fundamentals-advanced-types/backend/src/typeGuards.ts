/**
 * ============================================================
 * TYPE GUARDS - Runtime Type Safety
 * ============================================================
 *
 * TypeScript types only exist at compile time.
 * At runtime (when real data arrives from APIs, databases,
 * user input), you need TYPE GUARDS to safely narrow types.
 *
 * A type guard is a function that returns a "type predicate":
 *   `value is SomeType`
 * This tells TypeScript "if this function returns true,
 * treat the value as SomeType in the following code."
 */

import { ApiResponse, ApiSuccess, ApiError, User } from "./types";

// ─────────────────────────────────────────────
// TYPE GUARD vs TYPE ASSERTION
//
// Type Assertion (UNSAFE - avoid when possible):
//   const user = data as User;
//   ❌ You're TELLING TypeScript to trust you
//   ❌ No runtime check - can crash at runtime
//
// Type Guard (SAFE - prefer this):
//   if (isUser(data)) { /* TypeScript knows it's User here */ }
//   ✅ Actual runtime check
//   ✅ TypeScript narrows the type automatically
// ─────────────────────────────────────────────

/**
 * Type guard for ApiSuccess
 * The `response is ApiSuccess<T>` return type is the "type predicate"
 */
export function isApiSuccess<T>(
  response: ApiResponse<T>,
): response is ApiSuccess<T> {
  // We check the discriminant field at runtime
  return response.status === "success";
}

/**
 * Type guard for ApiError
 */
export function isApiError(
  response: ApiResponse<unknown>,
): response is ApiError {
  return response.status === "error";
}

/**
 * A more robust type guard for User objects
 * Use this when validating data from external sources
 * (API responses, database results, user input)
 */
export function isUser(value: unknown): value is User {
  // Step 1: Check it's an object and not null
  if (typeof value !== "object" || value === null) return false;

  // Step 2: Cast to a record so we can access properties safely
  const obj = value as Record<string, unknown>;

  // Step 3: Check each required field exists with correct type
  return (
    typeof obj["id"] === "string" &&
    typeof obj["name"] === "string" &&
    typeof obj["email"] === "string" &&
    typeof obj["createdAt"] === "string" &&
    typeof obj["updatedAt"] === "string" &&
    (obj["role"] === "admin" ||
      obj["role"] === "user" ||
      obj["role"] === "guest")
  );
}

/**
 * Type narrowing with `in` operator
 * Useful for checking if a property exists on a type
 */
export function hasProperty<T extends object, K extends string>(
  obj: T,
  key: K,
): obj is T & Record<K, unknown> {
  return key in obj;
}
