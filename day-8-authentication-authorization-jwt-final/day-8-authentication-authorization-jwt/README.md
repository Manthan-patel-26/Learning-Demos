# Day 8: Authentication & Authorization - JWT

**Date:** February 20, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
Production-ready auth system with JWT access/refresh tokens, bcrypt password hashing, httpOnly cookies, and RBAC middleware.

## 🚀 How to Run
```bash
cd backend
cp .env.example .env
# Generate secrets and fill .env for JWT_ACCESS_SECRET & JWT_REFRESH_SECRET:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run start
```

## 🔗 Test the API
```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"Password1","name":"Alice","role":"admin"}'

# Login → copy the accessToken from response
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"Password1"}'

# Use access token (replace TOKEN)
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# Admin-only route
curl http://localhost:3001/api/auth/admin-only \
  -H "Authorization: Bearer TOKEN"
```

## 📖 Key Concepts

### JWT Structure
```
header.payload.signature
eyJhbGci...  .eyJ1c2VySWQi...  .SflKxwRJSMeK...

Payload (decoded, NOT secret): { userId, email, role, iat, exp }
Signature: HMAC-SHA256(header + "." + payload, JWT_SECRET)

⚠️ The payload is base64 encoded, NOT encrypted.
Anyone can decode it! Never put sensitive data in JWT payload.
```

### Access Token + Refresh Token Flow
```
Login → Server sends:
  - accessToken (15min) in response body → store in memory (NOT localStorage)
  - refreshToken (7d) in httpOnly cookie → JS cannot read

API requests: Authorization: Bearer <accessToken>

When accessToken expires:
  POST /api/auth/refresh → server rotates refresh token → new accessToken

Logout: invalidate all refresh tokens → clear cookie
```

### XSS vs CSRF
```
localStorage pros: Easy to use
localStorage cons: XSS attack can steal token: document.cookie / localStorage

httpOnly cookie pros: XSS CANNOT steal it (JS can't access)
httpOnly cookie cons: Vulnerable to CSRF (mitigated with SameSite=strict)

Best practice: accessToken in memory, refreshToken in httpOnly cookie
```

### RBAC Middleware
```typescript
// Stack middleware for protected routes:
router.get("/admin",
  authenticate,              // 1. Verify JWT
  authorize("admin"),        // 2. Check role
  adminHandler               // 3. Handle if both pass
);

// Multiple allowed roles:
router.get("/dashboard",
  authenticate,
  authorize("admin", "user"),
  dashboardHandler
);
```

## ⚠️ Security Gotchas

| Mistake | Danger | Fix |
|---------|--------|-----|
| Storing JWT in localStorage | XSS can steal it | Use httpOnly cookie or memory |
| Hardcoding JWT secret | Anyone can forge tokens | Use env var with 64+ random bytes |
| Same error for wrong email vs password | Lets attackers enumerate users | Always return "Invalid credentials" |
| Not expiring access tokens | Stolen token works forever | 15min expiry + refresh rotation |
| No rate limiting on /login | Brute force attacks | Add rate limiter (Day 9) |
