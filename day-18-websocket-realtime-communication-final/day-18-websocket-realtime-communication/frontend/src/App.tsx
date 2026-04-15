/**
 * DAY 18: Real-time Chat Frontend
 * Open 2 browser tabs to chat between them!
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface Message {
  id: string; userId: string; userName: string;
  text: string; timestamp: number; readBy: string[];
}
interface OnlineUser { id: string; name: string; }

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("general");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinRoom = useCallback(() => {
    if (!name.trim()) return;
    const s = io("http://localhost:3001");
    s.on("connect", () => setIsConnected(true));
    s.on("disconnect", () => setIsConnected(false));
    s.on("history", (msgs: Message[]) => setMessages(msgs));
    s.on("message", (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      // Mark messages as read
      s.emit("read_messages", { messageIds: [msg.id] });
    });
    s.on("user_joined", ({ user, onlineCount }: { user: OnlineUser; onlineCount: number }) => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), userId: "system", userName: "System",
        text: `${user.name} joined the room (${onlineCount} online)`,
        timestamp: Date.now(), readBy: [],
      }]);
    });
    s.on("user_left", ({ user }: { user: OnlineUser }) => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), userId: "system", userName: "System",
        text: `${user.name} left the room`, timestamp: Date.now(), readBy: [],
      }]);
      setOnlineUsers(prev => prev.filter(u => u.id !== user.id));
    });
    s.on("presence", (users: OnlineUser[]) => setOnlineUsers(users));
    s.on("typing", ({ users }: { users: string[] }) => setTypingUsers(users.filter(u => u !== name)));

    s.emit("join", { name: name.trim(), room });
    // Get our userId from the first message we receive
    s.once("message", (msg: Message) => { if (msg.userId !== "system") setUserId(msg.userId); });

    setSocket(s);
    setJoined(true);
    return () => s.disconnect();
  }, [name, room]);

  const sendMessage = useCallback(() => {
    if (!socket || !message.trim()) return;
    socket.emit("message", { text: message });
    setMessage("");
    socket.emit("typing_stop");
    clearTimeout(typingTimer.current);
  }, [socket, message]);

  const handleTyping = useCallback((value: string) => {
    setMessage(value);
    if (!socket) return;
    socket.emit("typing_start");
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit("typing_stop"), 2000);
  }, [socket]);

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  };

  if (!joined) return (
    <div style={{ fontFamily: "system-ui", background: "#f7fafc", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ ...card, width: 360 }}>
        <h2 style={{ marginTop: 0, textAlign: "center" }}>💬 Day 18: Real-time Chat</h2>
        <p style={{ fontSize: 13, color: "#718096", textAlign: "center" }}>Open 2 browser tabs to chat between them!</p>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Your name" onKeyDown={e => e.key === "Enter" && joinRoom()}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e0",
            fontSize: 15, boxSizing: "border-box", marginBottom: 12 }} />
        <select value={room} onChange={e => setRoom(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e0", marginBottom: 12 }}>
          {["general","react","nodejs","devops"].map(r => <option key={r} value={r}>#{r}</option>)}
        </select>
        <button onClick={joinRoom} disabled={!name.trim()}
          style={{ width: "100%", padding: "10px", borderRadius: 6, border: "none",
            background: name.trim() ? "#4299e1" : "#e2e8f0", color: name.trim() ? "#fff" : "#a0aec0",
            fontWeight: 600, cursor: name.trim() ? "pointer" : "not-allowed", fontSize: 15 }}>
          Join #{room}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui", background: "#f7fafc", height: "100vh", display: "grid", gridTemplateRows: "auto 1fr auto", gridTemplateColumns: "1fr 220px", gap: 0 }}>
      {/* Header */}
      <div style={{ gridColumn: "1/-1", background: "#2d3748", color: "#fff", padding: "12px 20px",
        display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontWeight: 700 }}>💬 #{room}</span>
        <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, background: isConnected ? "#48bb78" : "#fc8181" }}>
          {isConnected ? "● Connected" : "● Disconnected"}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#a0aec0" }}>You: {name}</span>
      </div>

      {/* Messages */}
      <div style={{ overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map(msg => {
          const isMe = msg.userId === userId;
          const isSystem = msg.userId === "system";
          if (isSystem) return (
            <div key={msg.id} style={{ textAlign: "center", fontSize: 12, color: "#a0aec0" }}>{msg.text}</div>
          );
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column",
              alignItems: isMe ? "flex-end" : "flex-start" }}>
              <div style={{ fontSize: 11, color: "#a0aec0", marginBottom: 2 }}>
                {!isMe && msg.userName} · {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
              <div style={{ maxWidth: "70%", padding: "8px 12px", borderRadius: isMe ? "12px 12px 0 12px" : "12px 12px 12px 0",
                background: isMe ? "#4299e1" : "#fff", color: isMe ? "#fff" : "#2d3748",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)", fontSize: 14 }}>
                {msg.text}
              </div>
              {isMe && msg.readBy.length > 1 && (
                <div style={{ fontSize: 10, color: "#4299e1", marginTop: 2 }}>✓✓ Read by {msg.readBy.length - 1}</div>
              )}
            </div>
          );
        })}
        {typingUsers.length > 0 && (
          <div style={{ fontSize: 12, color: "#a0aec0", fontStyle: "italic" }}>
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sidebar */}
      <div style={{ background: "#f7fafc", borderLeft: "1px solid #e2e8f0", padding: 16, overflowY: "auto" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#718096", marginBottom: 8 }}>
          ONLINE — {onlineUsers.length}
        </div>
        {onlineUsers.map(u => (
          <div key={u.id} style={{ fontSize: 13, padding: "4px 0", color: u.id === userId ? "#4299e1" : "#4a5568" }}>
            ● {u.name}{u.id === userId ? " (you)" : ""}
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ gridColumn: "1/-1", padding: 12, background: "#fff",
        borderTop: "1px solid #e2e8f0", display: "flex", gap: 8 }}>
        <input value={message} onChange={e => handleTyping(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Type a message... (Enter to send)"
          style={{ flex: 1, padding: "10px 14px", borderRadius: 24, border: "1px solid #e2e8f0",
            fontSize: 14, outline: "none" }} />
        <button onClick={sendMessage} disabled={!message.trim()}
          style={{ padding: "10px 20px", borderRadius: 24, border: "none",
            background: message.trim() ? "#4299e1" : "#e2e8f0",
            color: message.trim() ? "#fff" : "#a0aec0", cursor: message.trim() ? "pointer" : "not-allowed",
            fontWeight: 600 }}>Send</button>
      </div>
    </div>
  );
}
