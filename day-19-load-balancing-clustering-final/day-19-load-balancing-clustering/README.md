# Day 19: Load Balancing & Clustering

**Date:** March 09, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
Node.js clustering with the cluster module, PM2 process manager configuration, Nginx load balancer with health checks, and graceful shutdown.

## 🚀 How to Run

### Single Process (development)
```bash
cd backend && npm install && npm run dev
```

### Cluster Mode (all CPU cores)
```bash
cd backend && npm run cluster
# Spawns one worker per CPU core — watch the different PIDs in responses
```

### With PM2 (production process manager)
```bash
npm install -g pm2
cd backend && npm run build
pm2 start pm2.config.js
pm2 monit          # Live CPU/memory dashboard
pm2 logs           # Tail all logs
pm2 reload all     # Zero-downtime rolling restart
pm2 stop all
```

### With Nginx Load Balancer
```bash
# Start 3 backend instances on different ports
PORT=3001 node dist/index.js &
PORT=3002 node dist/index.js &
PORT=3003 node dist/index.js &

# Configure nginx (see nginx.conf)
nginx -c $(pwd)/nginx.conf
# Now all traffic on :80 is distributed across :3001, :3002, :3003
```

## 📖 Key Concepts

### cluster module
```typescript
if (cluster.isPrimary) {
  // Fork one worker per CPU core
  for (let i = 0; i < os.cpus().length; i++) cluster.fork();
  cluster.on("exit", (worker) => cluster.fork()); // Auto-restart
} else {
  // Worker: normal Express app
  app.listen(3001);
}
// All workers share the same port — OS distributes connections between them
```

### Why workers DON'T share memory
```typescript
// ❌ This doesn't work in cluster mode!
let sharedCounter = 0;
app.get("/inc", () => { sharedCounter++; return sharedCounter; });
// Each worker has its OWN sharedCounter — they diverge!

// ✅ Use Redis for shared state across workers
app.get("/inc", async () => {
  const count = await redis.incr("counter"); // Atomic — works across all workers
  return count;
});
```

## ⚠️ Gotchas

| Issue | Problem | Fix |
|-------|---------|-----|
| Shared memory | Workers have separate memory | Use Redis/DB for shared state |
| Socket.io + cluster | Each worker only knows its own sockets | Use `@socket.io/redis-adapter` |
| Sticky sessions | Load balancer sends user to different worker each request | Use Redis sessions OR ip_hash in nginx |
| Graceful shutdown | In-flight requests killed immediately | Listen to SIGTERM, call `server.close()` |
