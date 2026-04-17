// src/routes/brandedTypes.ts
// REST API endpoint that demonstrates branded types in action.
// Shows how smart constructors validate and brand at the boundary.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  toUserId, toOrderId, toUSD, toEmailAddress, toPositiveInt,
  UserId, OrderId, USD,
} from '../types/advanced.js';

const expressRouter = Router();

// ── In-memory store (typed with branded IDs) ──────────────────────────────

interface StoredUser {
  id: UserId;
  email: string;
  createdAt: Date;
}

interface StoredOrder {
  id: OrderId;
  userId: UserId;
  amount: USD;
  items: number;
}

const users = new Map<UserId, StoredUser>();
const orders = new Map<OrderId, StoredOrder>();

// Validation schemas (Zod validates at runtime, branding enforces at compile time)
const createUserSchema = z.object({
  email: z.string().email(),
});

const createOrderSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive(),
  items: z.number().int().positive(),
});

// ── Routes ────────────────────────────────────────────────────────────────

expressRouter.post('/demo/users', (req: Request, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    // Smart constructor validates AND brands the value
    const email = toEmailAddress(parsed.data.email);
    const id = toUserId(`usr_${Date.now()}`);

    const user: StoredUser = { id, email, createdAt: new Date() };
    users.set(id, user);

    res.status(201).json({ user: { id, email, createdAt: user.createdAt } });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

expressRouter.post('/demo/orders', (req: Request, res: Response) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const userId = toUserId(parsed.data.userId);
    if (!users.has(userId)) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const id = toOrderId(`ord_${Date.now()}`);
    const amount = toUSD(parsed.data.amount);
    const items = toPositiveInt(parsed.data.items);

    const order: StoredOrder = { id, userId, amount, items };
    orders.set(id, order);

    res.status(201).json({ order });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

expressRouter.get('/demo/users', (_req: Request, res: Response) => {
  res.json({ users: Array.from(users.values()) });
});

expressRouter.get('/demo/orders', (_req: Request, res: Response) => {
  res.json({ orders: Array.from(orders.values()) });
});

// ── Type info endpoint ─────────────────────────────────────────────────────
// Returns documentation about the type system used
expressRouter.get('/demo/type-info', (_req: Request, res: Response) => {
  res.json({
    concepts: [
      {
        name: 'Branded Types',
        description: 'Phantom type tags that prevent mixing structurally identical types',
        example: 'UserId vs OrderId — both strings but incompatible at compile time',
        benefit: 'Eliminates entire class of bugs: passing wrong ID type to a function',
      },
      {
        name: 'Smart Constructors',
        description: 'Factory functions that validate AND brand in one step',
        example: 'toEmailAddress(str) throws on invalid format, returns EmailAddress brand',
        benefit: 'Single validation point — once branded, always valid throughout the codebase',
      },
      {
        name: 'Template Literal Types',
        description: 'Generate union types from string pattern combinations',
        example: 'ApiRoute = `${HttpMethod} /${ApiVersion}/${ResourceName}`',
        benefit: 'Type-safe event names, CSS utilities, API routes — autocomplete works!',
      },
      {
        name: 'Conditional Types + infer',
        description: 'Extract type information from other types',
        example: 'UnwrapPromise<Promise<string>> = string',
        benefit: 'Build type utilities that adapt to their input types',
      },
      {
        name: 'Recursive Types',
        description: 'Types that reference themselves for tree/nested structures',
        example: 'JsonValue, DeepReadonly<T>, TreeNode<T>',
        benefit: 'Model arbitrarily deep data structures with full type safety',
      },
    ],
  });
});

export default expressRouter;
