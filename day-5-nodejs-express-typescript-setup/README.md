# Day 5: Node.js & Express TypeScript Setup

**Date:** February 17, 2026 | **Learning Time:** 2.5 hours

## 🎯 What You'll Build

A production-grade Express REST API boilerplate with: typed middleware, Zod validation, custom errors, env validation, rate limiting, and graceful shutdown.

## 🚀 How to Run

```bash
cd backend
cp .env.example .env     # Create your .env file
npm install
npm run dev              # http://localhost:3001
```

## 🔗 Test the API

```bash
# Health check
curl http://localhost:3001/health

# Get all users
curl http://localhost:3001/api/users

# Create a user (valid)
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Charlie","email":"charlie@example.com","role":"user"}'

# Create a user (invalid — see Zod validation error)
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"A","email":"not-an-email"}'

# Hit a route that doesn't exist (see 404 handler)
curl http://localhost:3001/api/nonexistent
```

## 📁 File Guide

```
backend/src/
├── config/env.ts       ← Zod env validation — crashes early if .env is wrong
├── middleware/index.ts ← requestLogger, validateBody, errorHandler, rateLimiter
├── routes/users.ts     ← CRUD routes with Zod schema validation
└── index.ts            ← App setup, middleware order, graceful shutdown
```

## ⚠️ Middleware Order (Critical!)

```
app.use(cors)          // 1. FIRST — handle preflight before anything
app.use(rateLimiter)   // 2. Early — reject abusers before parsing body
app.use(express.json)  // 3. Parse body — required before route handlers
app.use(logger)        // 4. Log requests
app.use("/api", routes)// 5. Route handlers
app.use(notFound)      // 6. 404 catcher — after all routes
app.use(errorHandler)  // 7. LAST — must be last to catch all errors
```

## 📖 Key Concepts

### 1. Extending Express Request Type

```typescript
declare global {
  namespace Express {
    interface Request {
      startTime?: number; // Add custom properties to every request
      requestId?: string;
    }
  }
}
// Now: req.startTime and req.requestId are typed throughout your app
```

### 2. Zod as Single Source of Truth

```typescript
const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["admin", "user", "guest"]).default("user"),
});

// Infer TypeScript type from schema — no duplication!
type CreateUserInput = z.infer<typeof createUserSchema>;
// = { name: string; email: string; role: "admin" | "user" | "guest" }
```

### 3. Custom Error Classes

```typescript
// Throw anywhere in your app:
throw new NotFoundError("User 42");
throw new ValidationError("Bad email", { email: ["Invalid format"] });
throw new UnauthorizedError();

// The global errorHandler catches ALL of them and formats properly
```

### 4. Async Error Handling in Express

```typescript
// Express 4: MUST wrap async handlers or errors won't be caught!
router.get("/:id", async (req, res, next) => {
  try {
    const user = await db.findUser(req.params.id);
    res.json(user);
  } catch (err) {
    next(err); // ← Forward to errorHandler
  }
});

// Express 5 (coming): async errors are caught automatically
```
