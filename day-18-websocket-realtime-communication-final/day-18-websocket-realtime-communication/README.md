# Day 18: WebSocket & Real-time Communication

**Date:** March 06, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
Real-time chat with Socket.io: multiple rooms, typing indicators, read receipts, user presence, and message history.

## 🚀 How to Run
```bash
cd backend && npm install && npm run dev   # port 3001
cd frontend && npm install && npm start   # port 3000
# Open 2 browser tabs and chat between them!
```

## 📖 WebSocket vs HTTP

| Feature | HTTP | WebSocket |
|---------|------|-----------|
| Direction | Client→Server only | Bidirectional |
| Connection | New per request | Persistent |
| Overhead | Headers on every request | Low after handshake |
| Use case | REST APIs, file download | Chat, live data, gaming |
| Polling alternative | Yes (inefficient) | No polling needed |

## 📖 Socket.io Core Events
```typescript
// Server → All clients in room
io.to("general").emit("message", data);

// Server → All clients EXCEPT sender
socket.to("general").emit("typing", data);

// Server → specific socket
io.to(socket.id).emit("private_message", data);

// Server → ALL connected clients (all rooms)
io.emit("announcement", data);
```

## ⚠️ Gotchas

### Memory Leaks from Event Listeners
```typescript
// ❌ Registers new listener every time component renders
useEffect(() => {
  socket.on("message", handler);
}); // No cleanup!

// ✅ Register once, cleanup on unmount
useEffect(() => {
  socket.on("message", handler);
  return () => socket.off("message", handler); // Cleanup!
}, []);
```

### Scaling WebSockets (Multiple Servers)
```
Problem: User A on Server 1 sends message → only Server 1 knows → User B on Server 2 never gets it!

Solution: Redis Pub/Sub adapter (socket.io-redis)
 - All servers subscribe to Redis channels
 - When Server 1 broadcasts, Redis relays to all servers
 - Both User A and User B receive the message

npm install @socket.io/redis-adapter
```
