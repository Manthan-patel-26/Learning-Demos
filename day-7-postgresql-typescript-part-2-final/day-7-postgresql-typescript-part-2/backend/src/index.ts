/**
 * DAY 7: Repository Pattern Server
 * Shows how routes use repositories instead of raw SQL
 */
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { Pool } from "pg";
import { UserRepository, ProductRepository } from "./repositories";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

// Instantiate repositories — inject the pool
const userRepo = new UserRepository(pool);
const productRepo = new ProductRepository(pool);

// ─── ROUTES: Clean, no SQL in here! ───────────────────────

app.get("/api/users", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await userRepo.findAll({ limit: 20, orderBy: "created_at" });
    res.json({ status: "success", ...result });
  } catch (err) { next(err); }
});

app.get("/api/users/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userRepo.findById(req.params["id"]!);
    if (!user) { res.status(404).json({ status: "error", error: { message: "User not found" } }); return; }
    res.json({ status: "success", data: user });
  } catch (err) { next(err); }
});

app.get("/api/users/email/:email", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userRepo.findByEmail(req.params["email"]!);
    if (!user) { res.status(404).json({ status: "error", error: { message: "User not found" } }); return; }
    res.json({ status: "success", data: user });
  } catch (err) { next(err); }
});

app.get("/api/users/stats/all", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userRepo.findWithStats();
    res.json({ status: "success", data: users });
  } catch (err) { next(err); }
});

app.post("/api/users", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userRepo.create(req.body);
    res.status(201).json({ status: "success", data: user });
  } catch (err: unknown) {
    // Handle unique constraint violation (duplicate email)
    if (err instanceof Error && err.message.includes("unique constraint")) {
      res.status(409).json({ status: "error", error: { code: "DUPLICATE_EMAIL", message: "Email already in use" } });
      return;
    }
    next(err);
  }
});

app.patch("/api/users/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userRepo.update(req.params["id"]!, req.body);
    if (!user) { res.status(404).json({ status: "error", error: { message: "User not found" } }); return; }
    res.json({ status: "success", data: user });
  } catch (err) { next(err); }
});

app.delete("/api/users/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await userRepo.softDelete(req.params["id"]!);
    if (!deleted) { res.status(404).json({ status: "error", error: { message: "User not found" } }); return; }
    res.status(204).send();
  } catch (err) { next(err); }
});

app.get("/api/products", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productRepo.findWithDetails();
    res.json({ status: "success", data: products });
  } catch (err) { next(err); }
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err.message);
  res.status(500).json({ status: "error", error: { message: err.message } });
});

app.listen(3001, () => {
  console.log("\n🚀 Day 7 server on http://localhost:3001");
  console.log("Run migrations first: npm run migrate");
});
