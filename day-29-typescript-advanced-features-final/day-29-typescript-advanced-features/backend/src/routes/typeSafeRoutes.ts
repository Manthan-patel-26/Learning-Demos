// src/routes/typeSafeRoutes.ts
// Demonstrates the TypeSafeRouter in practice.
// Every route has compile-time validated params — no `any`, no string indexing.

import { TypeSafeRouter, toUserId, toOrderId, toUSD, toEmailAddress } from '../types/advanced.js';

export const router = new TypeSafeRouter();

// ─── Users Resource ────────────────────────────────────────────────────────

router.get('/users', async ({ query }) => {
  // `query` is typed as Record<string, never> here — no query params defined
  return { users: [], total: 0 };
}, { description: 'List all users' });

router.get('/users/:userId',
  async ({ params }) => {
    // `params.userId` is type `string` — TypeScript infers it from the path!
    // `params.nonExistent` would be a compile error
    const id = toUserId(params.userId);  // Brand the raw string
    return { user: { id, name: 'Alice', email: 'alice@example.com' } };
  },
  { description: 'Get user by ID' }
);

router.post('/users',
  async ({ body }) => {
    // body is `unknown` — must validate before using
    if (typeof body !== 'object' || body === null) {
      throw new Error('Invalid body');
    }
    const { email } = body as { email: string };
    const validEmail = toEmailAddress(email); // Throws if invalid
    return { user: { id: toUserId('usr_' + Date.now()), email: validEmail } };
  },
  { description: 'Create a new user' }
);

// ─── Orders Resource (nested route) ───────────────────────────────────────

router.get('/users/:userId/orders',
  async ({ params }) => {
    // Both `userId` is available as typed string
    const userId = toUserId(params.userId);
    return { orders: [], userId };
  },
  { description: 'Get orders for a user' }
);

router.get('/users/:userId/orders/:orderId',
  async ({ params }) => {
    // BOTH params are typed: `params.userId` and `params.orderId`
    // TypeScript extracts both from the path string at compile time!
    const userId  = toUserId(params.userId);
    const orderId = toOrderId(params.orderId);
    return {
      order: {
        id: orderId,
        userId,
        amount: toUSD(99.99),
        status: 'pending',
      },
    };
  },
  { description: 'Get specific order for a user' }
);

// ─── Products Resource ─────────────────────────────────────────────────────

router.get('/products/:productId',
  async ({ params }) => {
    // Only `productId` is available — no `userId` etc.
    return { product: { id: params.productId, name: 'Widget' } };
  }
);

export default router;
