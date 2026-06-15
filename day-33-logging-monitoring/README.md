# Day 33: Logging & Monitoring

**Date:** March 27, 2026 | **Learning Time:** 2.5 hours

## 🎯 What You'll Build
Production logging with Winston: structured JSON output, multiple transports (console + daily-rotate-file), PII redaction (password/token → [REDACTED]), correlation IDs per request, slow query alerts, and error rate alerting.

## 🚀 How to Run
```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm start
```

## 📁 Key Files
```
backend/src/
├── logger.ts   ← Winston config, PII redaction, typed helpers, alert rules
└── index.ts    ← Express app with correlation ID middleware + request logger
logs/
├── app-YYYY-MM-DD.log   ← Daily rotating combined log (JSON)
└── error.log            ← Error-only log (JSON, persistent)
```

## 📖 Key Concepts

### Structured Logging — Always log JSON in production
```typescript
// ❌ Unstructured — hard to query/alert on
console.log(`User ${userId} logged in from ${ip} at ${timestamp}`);

// ✅ Structured — queryable in Datadog/CloudWatch
logger.info("User login", { userId, ip, timestamp, correlationId });
// Can now query: "show all logins from IP 1.2.3.4 in the last hour"
```

### Correlation IDs — Trace a request across services
```typescript
// Request arrives → attach unique ID
req.correlationId = req.headers["x-correlation-id"] ?? uuidv4();

// Every log line includes it
logger.info("Processing order", { correlationId, orderId });
logger.info("Charging payment", { correlationId, amount });
logger.info("Sending confirmation", { correlationId, email });

// Later: grep logs for correlationId to see the full request journey!
```

### Log Levels (use the right level)
| Level | When | Example |
|-------|------|---------|
| `error` | App is broken, needs immediate attention | DB connection failed |
| `warn` | Something unexpected, but app still works | Slow query, rate limit hit |
| `info` | Normal business events | User logged in, order placed |
| `http` | HTTP requests | GET /api/users 200 45ms |
| `debug` | Detailed debug info (dev only!) | SQL query parameters |

## ⚠️ PII — What NEVER to log
```typescript
// ❌ NEVER log these:
logger.info("Login", { password: req.body.password }); // Credit card, SSN, token

// ✅ Safe to log:
logger.info("Login attempt", { email, ip, correlationId });
// The PII redactor in logger.ts catches any accidental PII automatically.
```
