# Day 17: API Rate Limiting & Security

**Date:** March 05, 2026 | **Learning Time:** 2.5 hours

## 🎯 What You'll Build
Production security suite: Helmet security headers, flexible IP/user/API-key rate limiter, XSS input sanitization, SQL injection demo, and CORS configuration.

## 🚀 How to Run
```bash
cd backend && npm install && npm run dev   # port 3001
cd frontend && npm install && npm start   # port 3000
```

## 🔗 Test via curl
```bash
# Check security headers (look at response headers)
curl -I http://localhost:3001/health

# Test rate limiting (run 11 times quickly)
for i in {1..11}; do
  curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"a@b.com","password":"x"}' | python3 -m json.tool
done

# Test XSS sanitization
curl -X POST http://localhost:3001/api/comments \
  -H "Content-Type: application/json" \
  -d '{"text":"<script>alert(1)</script><img onerror=alert(2) src=x>"}'

# SQL injection demo (safe vs unsafe query)
curl "http://localhost:3001/api/sql-injection-demo?search='; DROP TABLE users; --"
```

## 📖 Security Headers (Helmet)
```
Content-Security-Policy: controls which sources browser trusts
X-Frame-Options: DENY          → prevents clickjacking (embedding in iframe)
X-Content-Type-Options: nosniff → browser won't guess MIME type
Strict-Transport-Security      → forces HTTPS for 1 year
Referrer-Policy                → limits URL leaking to third parties
```

## ⚠️ Rate Limit Key Selection

| Strategy | Key | Use Case | Risk |
|----------|-----|----------|------|
| IP-based | `127.0.0.1` | Public APIs | Shared IPs (offices, NAT) affect all users |
| User ID | `user:abc123` | Authenticated APIs | Requires login first |
| API Key | `key:sk-abc123` | Developer APIs | Key rotation affects limits |
| Composite | `ip:user` | High security | More complex |

**X-Forwarded-For spoofing:** Attackers can set this header to bypass IP rate limiting. Only trust it if you control the proxy (load balancer) that sets it. Use `app.set("trust proxy", 1)` only if behind a known proxy.
