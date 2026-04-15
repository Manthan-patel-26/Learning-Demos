/**
 * ============================================================
 * DAY 5: Users Router - Shows typed routes + Zod validation
 * ============================================================
 */
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validateBody, NotFoundError } from "../middleware";

export const usersRouter = Router();

// ─── ZOD SCHEMAS ──────────────────────────────────────────
// Define validation schemas. These serve double duty:
// 1. Runtime validation (Zod checks the actual data)
// 2. Type inference (z.infer<typeof schema> gives TypeScript type)

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 chars").max(50),
  email: z.string().email("Invalid email format"),
  role: z.enum(["admin", "user", "guest"]).default("user"),
  // .transform() runs after validation — clean the data
  age: z.coerce.number().int().min(13).max(120).optional(),
});

const updateUserSchema = createUserSchema.partial(); // All fields optional for PATCH

// Infer TypeScript types from Zod schemas — single source of truth!
type CreateUserInput = z.infer<typeof createUserSchema>;
type UpdateUserInput = z.infer<typeof updateUserSchema>;

// In-memory store (Day 6 adds real PostgreSQL)
interface User extends CreateUserInput {
  id: string;
  createdAt: string;
}
const users: User[] = [
  { id: "1", name: "Alice", email: "alice@example.com", role: "admin", createdAt: "2024-01-01T00:00:00Z" },
  { id: "2", name: "Bob", email: "bob@example.com", role: "user", createdAt: "2024-01-02T00:00:00Z" },
];

// ─── ROUTES ───────────────────────────────────────────────

usersRouter.get("/", (_req: Request, res: Response) => {
  res.json({ status: "success", data: users, total: users.length });
});

usersRouter.get("/:id", (req: Request, res: Response, next: NextFunction) => {
  const user = users.find((u) => u.id === req.params["id"]);
  if (!user) {
    // Pass error to next() — errorHandler middleware will format it
    next(new NotFoundError(`User ${req.params["id"]}`));
    return;
  }
  res.json({ status: "success", data: user });
});

// validateBody(schema) runs BEFORE the handler
// If validation fails, it calls next(ValidationError) — skips this handler
usersRouter.post("/", validateBody(createUserSchema), (req: Request, res: Response) => {
  // req.body is now typed as CreateUserInput (validated + transformed by Zod)
  const input: CreateUserInput = req.body;
  const newUser: User = { ...input, id: String(users.length + 1), createdAt: new Date().toISOString() };
  users.push(newUser);
  res.status(201).json({ status: "success", data: newUser, message: "User created" });
});

usersRouter.patch("/:id", validateBody(updateUserSchema), (req: Request, res: Response, next: NextFunction) => {
  const idx = users.findIndex((u) => u.id === req.params["id"]);
  if (idx === -1) { next(new NotFoundError(`User ${req.params["id"]}`)); return; }
  const update: UpdateUserInput = req.body;
  users[idx] = { ...users[idx]!, ...update };
  res.json({ status: "success", data: users[idx] });
});

usersRouter.delete("/:id", (req: Request, res: Response, next: NextFunction) => {
  const idx = users.findIndex((u) => u.id === req.params["id"]);
  if (idx === -1) { next(new NotFoundError(`User ${req.params["id"]}`)); return; }
  users.splice(idx, 1);
  res.status(204).send();
});
