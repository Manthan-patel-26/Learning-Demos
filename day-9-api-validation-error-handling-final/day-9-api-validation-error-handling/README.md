# Day 9: API Validation & Error Handling

**Date:** February 23, 2026 | **Learning Time:** 2.5 hours

## 🎯 What You'll Build
A complete middleware suite: structured logger, response formatter, Zod request/query validation, custom error class hierarchy, global error handler, and tiered rate limiter.

## 🚀 How to Run
```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run start
```

## 🔗 Test All the Features
```bash
# ✅ Valid product creation
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"New Book","price":19.99,"category":"books","stock":10}'

# ❌ Validation error (price negative, bad category)
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"X","price":-5,"category":"food"}'

# ❌ Query validation error
curl "http://localhost:3001/api/products?page=abc&limit=999"

# ✅ With valid query params
curl "http://localhost:3001/api/products?page=1&limit=5&category=books"

# 🔴 Different error types
curl http://localhost:3001/api/demo/errors/not-found
curl http://localhost:3001/api/demo/errors/conflict
curl http://localhost:3001/api/demo/errors/unexpected
```

## 📁 Key File
`backend/src/middleware/index.ts` — The entire middleware suite in one well-commented file.

## 📖 Error Hierarchy
```
AppError (base - has statusCode, code, message, details)
├── ValidationError   (400) — Bad request body/query
├── NotFoundError     (404) — Resource doesn't exist
├── UnauthorizedError (401) — Not logged in
├── ForbiddenError    (403) — Logged in but wrong role
├── ConflictError     (409) — Duplicate resource
└── TooManyRequestsError (429) — Rate limited
```

## ⚠️ Key Rules

### Error Message Security
```typescript
// ❌ Too revealing — tells attacker DB schema
throw new Error("Column 'user_id' violates foreign key constraint 'users_id_fkey'");

// ✅ Safe for client, detailed for internal logs
throw new NotFoundError("User");           // Client: "User not found"
logger.error("DB constraint", { err });   // Logs full error internally
```

### What to Log vs Not Log
```typescript
// ✅ Safe to log
logger.info("User logged in", { userId, ip, userAgent });

// ❌ NEVER log these — PII / security risk
logger.info("Login", { password, creditCard, ssn });
```

### HTTP Status Codes
| Code | Meaning | When to use |
|------|---------|-------------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, malformed JSON |
| 401 | Unauthorized | Not logged in / bad token |
| 403 | Forbidden | Logged in, wrong role |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate (email/username taken) |
| 422 | Unprocessable | Validation error (alternative to 400) |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Error | Programming error (never return details) |
