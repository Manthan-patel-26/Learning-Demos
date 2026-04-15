/**
 * ============================================================
 * DAY 18: Real-time Chat with Socket.io
 * ============================================================
 * Features: rooms, typing indicators, read receipts, presence
 */
import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));

// Socket.io requires the raw http.Server (not Express)
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
  // pingTimeout: ms before client is considered disconnected
  pingTimeout: 60_000,
});

// ─── TYPES ────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  room: string;
  socketId: string;
}
interface Message {
  id: string;
  userId: string;
  userName: string;
  room: string;
  text: string;
  timestamp: number;
  readBy: string[];
}

// In-memory store (use Redis + DB in production)
const users = new Map<string, User>(); // socketId → User
const rooms = new Map<string, Set<string>>(); // roomId → Set of socketIds
const messages = new Map<string, Message[]>(); // roomId → messages
const typingUsers = new Map<string, Set<string>>(); // roomId → Set of userNames

// ─── SOCKET.IO EVENT HANDLERS ─────────────────────────────
io.on("connection", (socket: Socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ── JOIN ROOM ──────────────────────────────────────────
  socket.on("join", ({ name, room }: { name: string; room: string }) => {
    const user: User = {
      id: crypto.randomUUID(),
      name,
      room,
      socketId: socket.id,
    };
    users.set(socket.id, user);

    // Socket.io rooms: broadcast to a subset of connected clients
    socket.join(room);
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room)!.add(socket.id);

    // Send existing messages to the new user
    const roomMessages = messages.get(room) ?? [];
    socket.emit("history", roomMessages);

    // Notify everyone in the room
    io.to(room).emit("user_joined", {
      user: { id: user.id, name: user.name },
      onlineCount: rooms.get(room)!.size,
    });

    // Send presence list to new user
    const onlineUsers = [...(rooms.get(room) ?? [])]
      .map((sid) => {
        const u = users.get(sid);
        return u ? { id: u.id, name: u.name } : null;
      })
      .filter(Boolean);
    socket.emit("presence", onlineUsers);

    console.log(`[Socket] ${name} joined room: ${room}`);
  });

  // ── SEND MESSAGE ───────────────────────────────────────
  socket.on("message", ({ text }: { text: string }) => {
    const user = users.get(socket.id);
    if (!user || !text.trim()) return;

    const message: Message = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      room: user.room,
      text: text.trim().slice(0, 1000), // Limit message length
      timestamp: Date.now(),
      readBy: [user.id],
    };

    // Persist message
    if (!messages.has(user.room)) messages.set(user.room, []);
    const roomMessages = messages.get(user.room)!;
    roomMessages.push(message);
    // Keep last 100 messages per room
    if (roomMessages.length > 100) roomMessages.shift();

    // Broadcast to everyone in the room (including sender)
    io.to(user.room).emit("message", message);

    // Clear typing indicator for this user
    typingUsers.get(user.room)?.delete(user.name);
    io.to(user.room).emit("typing", {
      users: [...(typingUsers.get(user.room) ?? [])],
    });
  });

  // ── TYPING INDICATOR ───────────────────────────────────
  socket.on("typing_start", () => {
    const user = users.get(socket.id);
    if (!user) return;
    if (!typingUsers.has(user.room)) typingUsers.set(user.room, new Set());
    typingUsers.get(user.room)!.add(user.name);
    // Broadcast to everyone EXCEPT the typer
    socket
      .to(user.room)
      .emit("typing", { users: [...(typingUsers.get(user.room) ?? [])] });
  });

  socket.on("typing_stop", () => {
    const user = users.get(socket.id);
    if (!user) return;
    typingUsers.get(user.room)?.delete(user.name);
    socket
      .to(user.room)
      .emit("typing", { users: [...(typingUsers.get(user.room) ?? [])] });
  });

  // ── READ RECEIPTS ──────────────────────────────────────
  socket.on("read_messages", ({ messageIds }: { messageIds: string[] }) => {
    const user = users.get(socket.id);
    if (!user) return;
    const roomMessages = messages.get(user.room) ?? [];
    const updated: string[] = [];
    messageIds.forEach((id) => {
      const msg = roomMessages.find((m) => m.id === id);
      if (msg && !msg.readBy.includes(user.id)) {
        msg.readBy.push(user.id);
        updated.push(id);
      }
    });
    if (updated.length > 0) {
      io.to(user.room).emit("messages_read", {
        messageIds: updated,
        userId: user.id,
      });
    }
  });

  // ── DISCONNECT ─────────────────────────────────────────
  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) {
      rooms.get(user.room)?.delete(socket.id);
      typingUsers.get(user.room)?.delete(user.name);
      users.delete(socket.id);
      io.to(user.room).emit("user_left", {
        user: { id: user.id, name: user.name },
        onlineCount: rooms.get(user.room)?.size ?? 0,
      });
      io.to(user.room).emit("typing", {
        users: [...(typingUsers.get(user.room) ?? [])],
      });
      console.log(`[Socket] ${user.name} disconnected`);
    }
  });
});

// REST endpoints for room info
app.get("/api/rooms", (_req, res) => {
  const roomList = [...rooms.entries()].map(([id, sockets]) => ({
    id,
    userCount: sockets.size,
    messageCount: messages.get(id)?.length ?? 0,
  }));
  res.json({ data: roomList });
});

app.get("/health", (_req, res) =>
  res.json({ status: "ok", connections: io.engine.clientsCount }),
);

httpServer.listen(3001, () => {
  console.log("\n💬 Day 18 Chat Server on http://localhost:3001");
  console.log("  Open 2 browser tabs to chat between them!");
});
