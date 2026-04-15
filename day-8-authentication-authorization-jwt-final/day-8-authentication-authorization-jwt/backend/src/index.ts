/**
 * DAY 8: Authentication & Authorization Server
 */
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth";

// Add cookie-parser to dependencies (for reading httpOnly cookies)
// npm install cookie-parser @types/cookie-parser

const app = express();
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser()); // Parse cookies from requests

app.use("/api/auth", authRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(3001, () => {
  console.log("\n🔐 Day 8 Auth Server on http://localhost:3001");
  console.log("\nEndpoints:");
  console.log("  POST /api/auth/register");
  console.log("  POST /api/auth/login");
  console.log("  POST /api/auth/refresh");
  console.log("  POST /api/auth/logout     (requires Bearer token)");
  console.log("  GET  /api/auth/me         (requires Bearer token)");
  console.log("  GET  /api/auth/admin-only (requires admin role)");
  console.log("  GET  /api/auth/users-and-admins (requires user/admin role)");
});
