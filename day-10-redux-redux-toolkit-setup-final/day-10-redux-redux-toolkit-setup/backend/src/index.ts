import express from "express";
import cors from "cors";
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const products = [
  { id: "1", name: "TypeScript Handbook", price: 29.99, category: "books", stock: 50, rating: 4.8 },
  { id: "2", name: "Mechanical Keyboard", price: 149.99, category: "electronics", stock: 12, rating: 4.5 },
  { id: "3", name: "React Design Patterns", price: 39.99, category: "books", stock: 30, rating: 4.7 },
  { id: "4", name: "USB-C Hub", price: 49.99, category: "electronics", stock: 8, rating: 4.2 },
  { id: "5", name: "CSS in Depth", price: 34.99, category: "books", stock: 25, rating: 4.6 },
];
const users = [
  { id: "u1", name: "Alice", email: "alice@example.com", role: "admin" },
  { id: "u2", name: "Bob", email: "bob@example.com", role: "user" },
];

app.get("/api/products", (_req, res) => {
  setTimeout(() => res.json({ status: "success", data: products }), 300); // Simulate latency
});
app.get("/api/auth/me", (_req, res) => {
  setTimeout(() => res.json({ status: "success", data: users[0] }), 200);
});
app.post("/api/orders", (req, res) => {
  const { items } = req.body;
  setTimeout(() => res.json({
    status: "success",
    data: { id: crypto.randomUUID(), items, total: items.reduce((s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity, 0), createdAt: new Date().toISOString() }
  }), 500);
});
app.listen(3001, () => console.log("Day 10 backend on http://localhost:3001"));
