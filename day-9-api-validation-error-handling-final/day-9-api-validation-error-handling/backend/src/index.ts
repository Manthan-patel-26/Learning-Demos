/**
 * DAY 9: API Validation & Error Handling - Complete Demo
 */
import express from "express";
import cors from "cors";
import { z } from "zod";
import {
  requestLogger,
  responseFormatter,
  validateBody,
  validateQuery,
  rateLimiter,
  authRateLimiter,
  notFound,
  errorHandler,
  NotFoundError,
  ConflictError,
  logger,
} from "./middleware";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10kb" }));

// ─── MIDDLEWARE ORDER ──────────────────────────────────────
app.use(rateLimiter); // 1. Rate limit
app.use(requestLogger); // 2. Log all requests
app.use(responseFormatter); // 3. Standardize responses

// ─── SCHEMAS ──────────────────────────────────────────────
const createProductSchema = z.object({
  name: z.string().min(2).max(100),
  price: z.number().positive("Price must be positive"),
  category: z.enum(["electronics", "clothing", "books"]),
  stock: z.number().int().nonnegative().default(0),
  description: z.string().max(500).optional(),
});

const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  category: z.enum(["electronics", "clothing", "books"]).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
});

// In-memory products
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  description?: string;
}
const products: Product[] = [
  {
    id: "1",
    name: "TypeScript Handbook",
    price: 29.99,
    category: "books",
    stock: 50,
  },
  {
    id: "2",
    name: "Mechanical Keyboard",
    price: 149.99,
    category: "electronics",
    stock: 12,
  },
];

// ─── ROUTES ───────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: Math.round(process.uptime()) });
});

// GET with query validation
app.get("/api/products", validateQuery(productQuerySchema), (req, res) => {
  let filtered = [...products];
  const { category, minPrice, maxPrice, page, limit } =
    req.query as unknown as z.infer<typeof productQuerySchema>;

  if (category) filtered = filtered.filter((p) => p.category === category);
  if (minPrice !== undefined)
    filtered = filtered.filter((p) => p.price >= minPrice);
  if (maxPrice !== undefined)
    filtered = filtered.filter((p) => p.price <= maxPrice);

  const total = filtered.length;
  const start = ((page as number) - 1) * (limit as number);
  const data = filtered.slice(start, start + (limit as number));

  res.json({
    status: "success",
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / (limit as number)),
    },
  });
});

app.get("/api/products/:id", (req, res, next) => {
  const product = products.find((p) => p.id === req.params["id"]);
  if (!product) {
    next(new NotFoundError("Product", req.params["id"]));
    return;
  }
  res.json({ status: "success", data: product });
});

// POST with body validation
app.post(
  "/api/products",
  validateBody(createProductSchema),
  (req, res, next) => {
    const data = req.body as z.infer<typeof createProductSchema>;

    // Check duplicate name (simulates DB unique constraint)
    if (
      products.some((p) => p.name.toLowerCase() === data.name.toLowerCase())
    ) {
      next(new ConflictError("Product", "name"));
      return;
    }

    const newProduct: Product = { id: String(Date.now()), ...data };
    products.push(newProduct);
    logger.info("Product created", {
      productId: newProduct.id,
      name: newProduct.name,
    });
    res
      .status(201)
      .json({
        status: "success",
        data: newProduct,
        message: "Product created",
      });
  },
);

// Demo route: trigger different error types
app.get("/api/demo/errors/:type", (req, res, next) => {
  switch (req.params["type"]) {
    case "not-found":
      next(new NotFoundError("Widget", "abc-123"));
      break;
    case "conflict":
      next(new ConflictError("User", "email"));
      break;
    case "validation":
      next({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Bad input",
        details: { name: ["Too short"] },
      });
      break;
    case "unexpected":
      throw new Error("Something totally unexpected broke!"); // Tests 500 handler
    default:
      res.json({
        message: "Try: /not-found, /conflict, /validation, /unexpected",
      });
  }
});

// Auth rate limiter demo
app.post("/api/auth/login", authRateLimiter, (_req, res) => {
  res.json({ message: "Login endpoint — rate limited to 10 requests/15min" });
});

// ─── ERROR HANDLERS (MUST be last) ────────────────────────
app.use(notFound);
app.use(errorHandler);

app.listen(3001, () => {
  console.log("\n🛡️  Day 9 server on http://localhost:3001");
  console.log("\nTest validation errors:");
  console.log(
    "  POST /api/products   (try empty body, invalid price, bad category)",
  );
  console.log("  GET  /api/products?page=abc&limit=999");
  console.log("  GET  /api/demo/errors/not-found");
  console.log("  GET  /api/demo/errors/conflict");
  console.log("  GET  /api/demo/errors/unexpected");
});
