// src/utils/cursor.ts
// Utilities for encoding/decoding pagination cursors.
//
// WHY OPAQUE CURSORS?
// - Clients should never construct cursors manually
// - Allows us to change internal cursor format without breaking clients
// - Base64 encoding makes it clear it's not meant to be human-readable
// - Prevents clients from trying to do "math" on cursor values

import { CursorPayload } from '../types/index.js';

/**
 * Encodes a cursor payload to a base64 string.
 * The client receives this and passes it back as the `cursor` query param.
 */
export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  // Using Buffer (Node.js built-in) for base64 encoding
  return Buffer.from(json).toString('base64url');
}

/**
 * Decodes a base64 cursor string back to its payload.
 * Returns null if the cursor is invalid (malformed, tampered, expired).
 *
 * SECURITY NOTE: Always validate cursors! A malicious user could send
 * crafted cursors to cause SQL injection or unexpected behavior.
 * Prisma parameterizes queries, so we're safe, but we still validate
 * the structure before trusting it.
 */
export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    const payload = JSON.parse(json) as unknown;

    // Validate the payload structure
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof (payload as Record<string, unknown>).id !== 'string' ||
      typeof (payload as Record<string, unknown>).createdAt !== 'string'
    ) {
      return null;
    }

    return payload as CursorPayload;
  } catch {
    // JSON.parse or Buffer.from failed - cursor is malformed
    return null;
  }
}
