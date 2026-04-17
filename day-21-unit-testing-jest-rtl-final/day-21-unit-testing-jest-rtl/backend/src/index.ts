import express from "express";
import cors from "cors";
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Pure functions to test (no side effects)
export function add(a: number, b: number): number {
  return a + b;
}
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default app;
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.listen(3001, () => console.log("Day 21 backend on :3001"));
