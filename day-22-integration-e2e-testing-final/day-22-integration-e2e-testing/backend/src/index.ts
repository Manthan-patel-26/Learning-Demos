/**
 * ============================================================
 * DAY 22: Express API — The server under integration test
 * ============================================================
 * We export the app separately from the server listen call.
 * This lets supertest spin up the server on a random port
 * without conflicting with the real running server.
 */
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

export const app = express();
app.use(cors());
app.use(express.json());

// ─── IN-MEMORY DATA STORE ─────────────────────────────────
// In real tests, you'd use a test database (see README for pattern)
export interface User {
  id: string; name: string; email: string; role: string; createdAt: string;
}

export let users: User[] = [
  { id: "1", name: "Alice", email: "alice@example.com", role: "admin", createdAt: "2024-01-01T00:00:00Z" },
  { id: "2", name: "Bob", email: "bob@example.com", role: "user", createdAt: "2024-01-02T00:00:00Z" },
];

// ── Reset function for test isolation ──────────────────────
// Each test should start with a clean state!
export function resetStore() {
  users = [
    { id: "1", name: "Alice", email: "alice@example.com", role: "admin", createdAt: "2024-01-01T00:00:00Z" },
    { id: "2", name: "Bob", email: "bob@example.com", role: "user", createdAt: "2024-01-02T00:00:00Z" },
  ];
}

// ─── ROUTES ───────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET /api/users — list all users
app.get("/api/users", (_req: Request, res: Response) => {
  res.json({ status: "success", data: users, total: users.length });
});

// GET /api/users/:id — get single user
app.get("/api/users/:id", (req: Request, res: Response) => {
  const user = users.find(u => u.id === req.params["id"]);
  if (!user) {
    res.status(404).json({ status: "error", error: { code: "NOT_FOUND", message: `User ${req.params["id"]} not found` } });
    return;
  }
  res.json({ status: "success", data: user });
});

// POST /api/users — create user
app.post("/api/users", (req: Request, res: Response) => {
  const { name, email, role = "user" } = req.body as Partial<User>;

  if (!name?.trim()) {
    res.status(400).json({ status: "error", error: { code: "VALIDATION_ERROR", message: "Name is required", details: { name: ["Name is required"] } } });
    return;
  }
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ status: "error", error: { code: "VALIDATION_ERROR", message: "Valid email is required", details: { email: ["Must be a valid email"] } } });
    return;
  }
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    res.status(409).json({ status: "error", error: { code: "DUPLICATE_EMAIL", message: `Email ${email} is already registered` } });
    return;
  }

  const newUser: User = {
    id: String(users.length + 1),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    role: role || "user",
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  res.status(201).json({ status: "success", data: newUser, message: "User created successfully" });
});

// PATCH /api/users/:id — update user
app.patch("/api/users/:id", (req: Request, res: Response) => {
  const idx = users.findIndex(u => u.id === req.params["id"]);
  if (idx === -1) {
    res.status(404).json({ status: "error", error: { code: "NOT_FOUND", message: "User not found" } });
    return;
  }
  const { name, role } = req.body as Partial<User>;
  users[idx] = { ...users[idx]!, ...(name && { name }), ...(role && { role }) };
  res.json({ status: "success", data: users[idx] });
});

// DELETE /api/users/:id — delete user
app.delete("/api/users/:id", (req: Request, res: Response) => {
  const idx = users.findIndex(u => u.id === req.params["id"]);
  if (idx === -1) {
    res.status(404).json({ status: "error", error: { code: "NOT_FOUND", message: "User not found" } });
    return;
  }
  users.splice(idx, 1);
  res.status(204).send();
});

// ─── ERROR HANDLER ────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ status: "error", error: { code: "INTERNAL_ERROR", message: err.message } });
});

// Only start listening if run directly (not imported by tests)
if (require.main === module) {
  app.listen(3001, () => console.log("Day 22 server on http://localhost:3001"));
}
