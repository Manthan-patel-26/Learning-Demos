/**
 * ============================================================
 * GENERIC API RESPONSE HANDLER
 * ============================================================
 *
 * This is the coding challenge solution: a type-safe,
 * reusable API response handler using all the concepts
 * learned today.
 */

import { ApiResponse, ApiSuccess, ApiError } from "./types";

// ─────────────────────────────────────────────
// GENERIC FACTORY FUNCTIONS
// These create properly-typed responses
// ─────────────────────────────────────────────

/**
 * Creates a success response.
 * The generic <T> means: "T can be anything - User, Product, etc."
 * TypeScript infers T from the `data` argument automatically.
 */
export function createSuccess<T>(data: T, message = "OK"): ApiSuccess<T> {
  return {
    status: "success",
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates an error response.
 * No generic needed - errors don't carry typed data.
 */
export function createError(
  code: string,
  message: string,
  details?: unknown,
): ApiError {
  return {
    status: "error",
    error: { code, message, details },
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────
// GENERIC API HANDLER CLASS
// ─────────────────────────────────────────────

/**
 * ApiHandler<T> - a generic class for processing API responses.
 *
 * The constraint `extends object` means T must be an object type
 * (not a primitive like string or number). This is a "generic constraint."
 *
 * Usage:
 *   const userHandler = new ApiHandler<User>();
 *   const result = userHandler.process(rawData);
 */
export class ApiHandler<T extends object> {
  // Store the last processed response for inspection
  private lastResponse: ApiResponse<T> | null = null;

  /**
   * Process a raw API response
   * Returns the response unchanged but typed correctly
   */
  process(response: ApiResponse<T>): ApiResponse<T> {
    this.lastResponse = response;
    return response;
  }

  /**
   * Safely extract data from a response using a discriminated union check.
   * Returns undefined if the response is an error.
   *
   * This is the SAFE way to access data - no type assertions needed!
   */
  getData(response: ApiResponse<T>): T | undefined {
    // TypeScript narrows the type here based on the discriminant
    if (response.status === "success") {
      // Inside this block, TypeScript KNOWS response is ApiSuccess<T>
      // So response.data is safely available
      return response.data;
    }
    // TypeScript KNOWS this is ApiError here - no .data property
    console.error("API Error:", response.error.message);
    return undefined;
  }

  /**
   * Transform the data inside a response using a mapping function.
   * This is like Array.map() but for API responses.
   *
   * The second generic <U> is the output type after transformation.
   */
  map<U extends object>(
    response: ApiResponse<T>,
    transform: (data: T) => U,
  ): ApiResponse<U> {
    if (response.status === "success") {
      // Transform the data and wrap in a new success response
      return createSuccess(transform(response.data), response.message);
    }
    // Pass errors through unchanged
    return response;
  }

  getLastResponse(): ApiResponse<T> | null {
    return this.lastResponse;
  }
}

// ─────────────────────────────────────────────
// UTILITY TYPES IN ACTION
// ─────────────────────────────────────────────

/**
 * Wraps any async operation in a try/catch and returns ApiResponse.
 * This is a VERY common production pattern - wrap all async calls!
 *
 * `fn: () => Promise<T>` is a function type annotation:
 * - fn: the parameter name
 * - () => Promise<T>: a function that takes no args, returns Promise<T>
 */
export async function safeAsync<T extends object>(
  fn: () => Promise<T>,
  errorCode = "INTERNAL_ERROR",
): Promise<ApiResponse<T>> {
  try {
    const data = await fn();
    return createSuccess(data);
  } catch (error) {
    // Extract a meaningful message from the error
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return createError(errorCode, message, error);
  }
}
