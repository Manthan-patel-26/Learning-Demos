/**
 * ============================================================
 * DAY 17: Production Security Suite
 * ============================================================
 * Covers:
 *  1. Helmet — security headers
 *  2. Flexible rate limiter (IP / user / API key strategies)
 *  3. Input sanitization (XSS prevention)
 *  4. SQL injection prevention examples
 *  5. CORS configuration
 *  6. Request size limiting
 */
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

const app = express();

// ─── 1. SECURITY HEADERS WITH HELMET ─────────────────────
// helmet sets ~15 security headers. Without it, your app is vulnerable
// to clickjacking, MIME sniffing, XSS via old browsers, etc.
app.use(helmet({
  // Content Security Policy: tells browser which sources are trusted
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],                       // Only load from own origin
      scriptSrc: ["'self'", "'nonce-abc123'"],      // Allow inline scripts with nonce
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:*"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],                        // Block Flash, plugins
      upgradeInsecureRequests: [],                  // Force HTTPS
    },
  },
  // X-Frame-Options: prevents clickjacking (embedding in iframe)
  frameguard: { action: "deny" },
  // X-Content-Type-Options: nosniff — prevent MIME type confusion attacks
  noSniff: true,
  // Strict-Transport-Security: force HTTPS for 1 year
  hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
  // Referrer-Policy: don't leak URL to third parties
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

// ─── 2. CORS CONFIGURATION ────────────────────────────────
const ALLOWED_ORIGINS = ["http://localhost:3000", "https://yourdomain.com"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Allow server-to-server (no origin)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Api-Key"],
  credentials: true,           // Allow cookies
  maxAge: 86400,               // Cache preflight for 24h (fewer OPTIONS requests)
}));

// ─── 3. REQUEST SIZE LIMITING ─────────────────────────────
// Prevents large payload DoS attacks
app.use(express.json({ limit: "10kb" }));     // Reject payloads > 10KB
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── 4. FLEXIBLE RATE LIMITER ─────────────────────────────
// Strategy: key by IP by default, but allow user-specific keys

function createRateLimiter(
  maxRequests: number,
  windowMs: number,
  keyStrategy: "ip" | "user" | "apikey" = "ip"
) {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    // Dynamic key: IP-based is default, but can override per user or API key
    keyGenerator: (req) => {
      if (keyStrategy === "user" && req.headers["x-user-id"]) {
        return `user:${req.headers["x-user-id"]}`;
      }
      if (keyStrategy === "apikey" && req.headers["x-api-key"]) {
        return `apikey:${req.headers["x-api-key"]}`;
      }
      // IP: handle proxies — use X-Forwarded-For but validate it
      // ⚠️ Spoofing risk: an attacker can set X-Forwarded-For to any value!
      // In production: set trust proxy only if behind a known load balancer
      const forwarded = req.headers["x-forwarded-for"];
      const ip = typeof forwarded === "string" ? forwarded.split(",")[0]!.trim() : req.ip ?? "unknown";
      return `ip:${ip}`;
    },
    handler: (_req, res) => {
      res.status(429).json({
        status: "error",
        error: { code: "RATE_LIMIT_EXCEEDED",
          message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000}s` }
      });
    },
  });
}

// Different limits for different endpoints
const globalLimiter  = createRateLimiter(100, 15 * 60 * 1000, "ip");    // 100/15min global
const authLimiter    = createRateLimiter(10, 15 * 60 * 1000, "ip");     // 10/15min auth
const apiKeyLimiter  = createRateLimiter(1000, 60 * 60 * 1000, "apikey"); // 1000/hr for API keys

app.use(globalLimiter);

// ─── 5. INPUT SANITIZATION ────────────────────────────────
// Prevent XSS: strip or encode HTML from user input
function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = typeof value === "string" ? sanitizeInput(value) : value;
  }
  return sanitized;
}

// Middleware: auto-sanitize all request bodies
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body as Record<string, unknown>);
  }
  next();
});

// ─── DEMO ROUTES ──────────────────────────────────────────

app.get("/health", (_req, res) => res.json({ status: "ok", headers: "Check response headers for security headers!" }));

app.post("/api/auth/login", authLimiter, (req: Request, res: Response) => {
  // Input is already sanitized by middleware
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) { res.status(400).json({ status: "error", error: { message: "Email and password required" } }); return; }
  res.json({ status: "success", message: "Login endpoint (rate limited: 10/15min)", sanitizedEmail: email });
});

app.post("/api/comments", (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };
  res.json({
    status: "success",
    data: { text, sanitized: true,
      hint: "Try sending: <script>alert('xss')</script> — it will be sanitized" }
  });
});

// SQL injection demo (safe parameterized query vs unsafe string interpolation)
app.get("/api/sql-injection-demo", (req: Request, res: Response) => {
  const userInput = req.query["search"] as string ?? "";
  res.json({
    // ❌ VULNERABLE (never do this in real code):
    vulnerable: `SELECT * FROM users WHERE name = '${userInput}'`,
    // Input "'; DROP TABLE users; --" → executes arbitrary SQL!

    // ✅ SAFE: parameterized query (pg library):
    safe: `pool.query("SELECT * FROM users WHERE name = $1", [userInput])`,
    // The driver safely escapes $1. SQL injection is impossible.

    yourInput: userInput,
    sanitized: sanitizeInput(userInput),
  });
});

app.get("/api/security-headers", (req: Request, res: Response) => {
  res.json({
    message: "Check the response headers in your browser DevTools → Network tab",
    headersSet: [
      "Content-Security-Policy", "X-Frame-Options: DENY",
      "X-Content-Type-Options: nosniff", "Strict-Transport-Security",
      "Referrer-Policy", "X-DNS-Prefetch-Control"
    ],
  });
});

app.listen(3001, () => {
  console.log("\n🛡️ Day 17 Security Server on http://localhost:3001");
  console.log("\nTest rate limiting:");
  console.log("  for i in {1..15}; do curl -s http://localhost:3001/api/auth/login -X POST -H 'Content-Type: application/json' -d '{\"email\":\"a@b.com\",\"password\":\"x\"}' | jq .status; done");
  console.log("\nTest XSS sanitization:");
  console.log('  curl -X POST http://localhost:3001/api/comments -H "Content-Type: application/json" -d \'{"text":"<script>alert(1)</script>"}\'');
  console.log("\nTest SQL injection demo:");
  console.log("  curl \"http://localhost:3001/api/sql-injection-demo?search='; DROP TABLE users; --\"");
});
