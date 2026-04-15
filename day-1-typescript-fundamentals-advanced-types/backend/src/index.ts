/**
 * ============================================================
 * DAY 1: TypeScript Advanced Types - Demo Server
 * ============================================================
 * Run: npx ts-node src/index.ts
 * Then visit: http://localhost:3001/api/demo
 */

import express, { Request, Response } from "express";
import cors from "cors";
import { createSuccess, createError, ApiHandler, safeAsync } from "./apiHandler";
import { isUser } from "./typeGuards";
import { User, Product, CreateUserInput, RolePermissions } from "./types";

const app = express();
app.use(cors());
app.use(express.json());

// ─── DEMO DATA (simulating a database) ─────────────────────
const users: User[] = [
  {
    id: "1",
    name: "Alice Admin",
    email: "alice@example.com",
    role: "admin",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Bob User",
    email: "bob@example.com",
    role: "user",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

// RolePermissions uses Record<role, string[]> - a typed dictionary
const rolePermissions: RolePermissions = {
  admin: ["read", "write", "delete", "manage_users"],
  user: ["read", "write"],
  guest: ["read"],
};

// ─── ROUTES ────────────────────────────────────────────────

/**
 * GET /api/users - Returns all users
 * Demonstrates: ApiHandler<User>, createSuccess
 */
app.get("/api/users", (_req: Request, res: Response) => {
  const handler = new ApiHandler<User>();
  const response = handler.process(createSuccess(users[0])); // Demo: first user
  res.json(response);
});

/**
 * GET /api/users/all - Returns user list
 * Demonstrates: Generic array response
 */
app.get("/api/users/all", (_req: Request, res: Response) => {
  // ApiHandler with array - note T is User[], which extends object ✓
  const response = createSuccess(users, `Found ${users.length} users`);
  res.json(response);
});

/**
 * GET /api/users/:id - Get user by ID
 * Demonstrates: union return type, discriminated union handling
 */
app.get("/api/users/:id", (req: Request, res: Response) => {
  const user = users.find((u) => u.id === req.params["id"]);

  if (!user) {
    // Returns ApiError
    res.status(404).json(createError("USER_NOT_FOUND", `User ${req.params["id"]} not found`));
    return;
  }
  // Returns ApiSuccess<User>
  res.json(createSuccess(user));
});

/**
 * POST /api/users - Create a user
 * Demonstrates: CreateUserInput (Omit utility type), type guard validation
 */
app.post("/api/users", (req: Request, res: Response) => {
  const input: CreateUserInput = req.body;

  // Simulate creating a new user (server generates id, timestamps)
  const newUser: User = {
    ...input,
    id: String(users.length + 1),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // isUser() is a type guard - validates at runtime
  if (!isUser(newUser)) {
    res.status(400).json(createError("INVALID_USER", "Invalid user data provided"));
    return;
  }

  users.push(newUser);
  res.status(201).json(createSuccess(newUser, "User created successfully"));
});

/**
 * GET /api/demo - Shows all TypeScript type concepts in action
 */
app.get("/api/demo", (_req: Request, res: Response) => {
  const handler = new ApiHandler<User>();

  // map() transforms User to a public-safe version
  const userResponse = createSuccess(users[0]);
  const publicResponse = handler.map(userResponse, (user) => ({
    id: user.id,
    name: user.name,
    role: user.role,
    permissions: rolePermissions[user.role], // Record<role, string[]> lookup
  }));

  res.json(
    createSuccess({
      message: "Day 1 TypeScript Concepts Demo",
      discriminatedUnionExample: publicResponse,
      utilityTypesExample: {
        "Omit<User, id|createdAt|updatedAt>": "CreateUserInput - used for POST body",
        "Partial<Pick<User, name|email|role>>": "UpdateUserInput - used for PATCH body",
        "Record<role, string[]>": rolePermissions,
      },
      concepts: [
        "Union Types", "Discriminated Unions", "Intersection Types",
        "Mapped Types", "Generics with Constraints", "Utility Types",
        "Type Guards", "Type Narrowing"
      ]
    })
  );
});

/**
 * GET /api/safe-async - Demonstrates safeAsync wrapper
 * Demonstrates: wrapping async operations safely
 */
app.get("/api/safe-async", async (_req: Request, res: Response) => {
  // safeAsync wraps any async fn - errors become ApiError automatically
  const result = await safeAsync<Product>(async () => {
    // Simulate async database call
    await new Promise((r) => setTimeout(r, 10));
    return {
      id: "p1",
      name: "TypeScript Handbook",
      price: 29.99,
      category: "books",
      stock: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
  res.json(result);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Day 1 TypeScript Demo running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  http://localhost:${PORT}/api/demo`);
  console.log(`  GET  http://localhost:${PORT}/api/users`);
  console.log(`  GET  http://localhost:${PORT}/api/users/all`);
  console.log(`  GET  http://localhost:${PORT}/api/users/1`);
  console.log(`  POST http://localhost:${PORT}/api/users`);
  console.log(`  GET  http://localhost:${PORT}/api/safe-async`);
});
