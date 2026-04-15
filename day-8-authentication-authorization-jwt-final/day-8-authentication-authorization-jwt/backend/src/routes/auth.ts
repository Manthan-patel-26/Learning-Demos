/**
 * ============================================================
 * DAY 8: Auth Routes - Register, Login, Refresh, Logout
 * ============================================================
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  users, hashPassword, verifyPassword,
  generateAccessToken, generateRefreshToken, rotateRefreshToken,
  invalidateAllUserTokens, StoredUser
} from "../services/auth";
import { authenticate, authorize } from "../middleware/auth";

export const authRouter = Router();

// ─── VALIDATION SCHEMAS ───────────────────────────────────
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain a number"),
  name: z.string().min(2).max(50),
  role: z.enum(["admin", "user", "guest"]).default("user"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Helper: Set refresh token as httpOnly cookie
// httpOnly: JS cannot read it → XSS cannot steal it!
function setRefreshCookie(res: Response, token: string): void {
  res.cookie("refreshToken", token, {
    httpOnly: true,   // Not accessible via document.cookie!
    secure: process.env["NODE_ENV"] === "production", // HTTPS only in prod
    sameSite: "strict", // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: "/api/auth/refresh", // Only sent to this path — minimizes exposure
  });
}

// ─── REGISTER ─────────────────────────────────────────────
authRouter.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "error", error: { code: "VALIDATION_ERROR",
      message: "Invalid input", details: parsed.error.flatten().fieldErrors } });
    return;
  }

  const { email, password, name, role } = parsed.data;

  if (users.find(u => u.email === email.toLowerCase())) {
    res.status(409).json({ status: "error", error: { code: "EMAIL_EXISTS", message: "Email already registered" } });
    return;
  }

  const passwordHash = await hashPassword(password);
  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    passwordHash, // Store hash, NEVER the plain password
    name,
    role,
    isEmailVerified: false,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);

  const accessToken = generateAccessToken({ userId: newUser.id, email: newUser.email, role: newUser.role });
  const refreshToken = generateRefreshToken(newUser.id);
  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    status: "success",
    data: {
      accessToken,
      user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
    },
    message: "Registration successful",
  });
});

// ─── LOGIN ────────────────────────────────────────────────
authRouter.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "error", error: { code: "VALIDATION_ERROR", message: "Email and password required" } });
    return;
  }

  const { email, password } = parsed.data;
  const user = users.find(u => u.email === email.toLowerCase());

  // IMPORTANT: Same error message whether user doesn't exist OR password is wrong.
  // Giving different messages lets attackers enumerate valid emails!
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    // Add a small delay to prevent timing-based user enumeration
    await new Promise(r => setTimeout(r, 100));
    res.status(401).json({ status: "error", error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    return;
  }

  const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);

  res.json({
    status: "success",
    data: {
      accessToken, // Short-lived — store in memory, not localStorage
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    },
  });
});

// ─── REFRESH TOKEN ────────────────────────────────────────
// Gets new access token using the refresh token cookie
authRouter.post("/refresh", (req: Request, res: Response) => {
  // Read from httpOnly cookie — not accessible to JS/XSS
  const oldRefreshToken = req.cookies?.["refreshToken"];
  if (!oldRefreshToken) {
    res.status(401).json({ status: "error", error: { code: "MISSING_REFRESH_TOKEN", message: "No refresh token" } });
    return;
  }

  const result = rotateRefreshToken(oldRefreshToken);
  if (!result) {
    res.clearCookie("refreshToken");
    res.status(401).json({ status: "error", error: { code: "INVALID_REFRESH_TOKEN", message: "Invalid or expired refresh token" } });
    return;
  }

  const user = users.find(u => u.id === result.userId);
  if (!user) {
    res.status(401).json({ status: "error", error: { code: "USER_NOT_FOUND", message: "User not found" } });
    return;
  }

  const newAccessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
  setRefreshCookie(res, result.newRefreshToken); // Rotate: set new cookie

  res.json({ status: "success", data: { accessToken: newAccessToken } });
});

// ─── LOGOUT ───────────────────────────────────────────────
authRouter.post("/logout", authenticate, (req: Request, res: Response) => {
  invalidateAllUserTokens(req.user!.userId);
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
  res.json({ status: "success", message: "Logged out successfully" });
});

// ─── PROTECTED ROUTE EXAMPLES ─────────────────────────────
authRouter.get("/me", authenticate, (req: Request, res: Response) => {
  const user = users.find(u => u.id === req.user!.userId);
  if (!user) { res.status(404).json({ status: "error", error: { message: "User not found" } }); return; }
  res.json({ status: "success", data: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

authRouter.get("/admin-only", authenticate, authorize("admin"), (_req: Request, res: Response) => {
  res.json({ status: "success", message: "Welcome, admin! You have full access." });
});

authRouter.get("/users-and-admins", authenticate, authorize("admin", "user"), (req: Request, res: Response) => {
  res.json({ status: "success", message: `Welcome ${req.user!.role}! This is for users and admins.` });
});
