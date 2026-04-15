/**
 * ============================================================
 * DAY 11: Backend API for RTK Query Integration
 * ============================================================
 * Full REST API simulating an e-commerce backend.
 * Supports pagination, filtering, optimistic update simulation.
 */
import express, { Request, Response } from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ─── IN-MEMORY DATA ────────────────────────────────────────
interface Product {
  id: string; name: string; price: number; category: string;
  stock: number; rating: number; imageUrl: string; description: string;
}

interface CartItem { productId: string; quantity: number; }
interface Order { id: string; userId: string; items: CartItem[]; total: number; status: string; createdAt: string; }

const products: Product[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  name: ["TypeScript Handbook","React Patterns","Node.js Guide","CSS Mastery","Docker Basics",
         "PostgreSQL Deep Dive","Redis in Action","GraphQL API","Testing JavaScript","Clean Code"][i % 10] + ` v${Math.floor(i/10)+1}`,
  price: parseFloat((9.99 + (i * 3.5)).toFixed(2)),
  category: ["books","electronics","clothing"][i % 3],
  stock: (i % 5 === 0) ? 0 : 10 + (i * 2),
  rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
  imageUrl: `https://picsum.photos/seed/${i+1}/200/200`,
  description: `Comprehensive guide to ${["TypeScript","React","Node.js","CSS","Docker"][i%5]} — edition ${i+1}`,
}));

const orders: Order[] = [];
const carts: Record<string, CartItem[]> = { "user1": [] };

// ─── PRODUCTS ROUTES ──────────────────────────────────────

// Paginated products list
app.get("/api/products", (req: Request, res: Response) => {
  const page    = parseInt(req.query["page"] as string) || 1;
  const limit   = parseInt(req.query["limit"] as string) || 10;
  const category = req.query["category"] as string | undefined;
  const search  = req.query["search"] as string | undefined;

  let filtered = [...products];
  if (category) filtered = filtered.filter(p => p.category === category);
  if (search)   filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const data  = filtered.slice((page - 1) * limit, page * limit);

  // Simulate network delay so we can see loading states
  setTimeout(() => {
    res.json({
      status: "success",
      data,
      pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages },
    });
  }, 300);
});

app.get("/api/products/:id", (req: Request, res: Response) => {
  const product = products.find(p => p.id === req.params["id"]);
  if (!product) { res.status(404).json({ status: "error", error: { message: "Product not found" } }); return; }
  setTimeout(() => res.json({ status: "success", data: product }), 200);
});

app.patch("/api/products/:id", (req: Request, res: Response) => {
  const idx = products.findIndex(p => p.id === req.params["id"]);
  if (idx === -1) { res.status(404).json({ status: "error", error: { message: "Not found" } }); return; }
  Object.assign(products[idx]!, req.body);
  res.json({ status: "success", data: products[idx] });
});

// ─── CART ROUTES ──────────────────────────────────────────

app.get("/api/cart/:userId", (req: Request, res: Response) => {
  const cart = carts[req.params["userId"]] ?? [];
  const enriched = cart.map(item => {
    const product = products.find(p => p.id === item.productId);
    return { ...item, product };
  });
  res.json({ status: "success", data: enriched });
});

app.post("/api/cart/:userId/items", (req: Request, res: Response) => {
  const { userId } = req.params;
  const { productId, quantity = 1 } = req.body;
  if (!carts[userId!]) carts[userId!] = [];

  const existing = carts[userId!]!.find(i => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    carts[userId!]!.push({ productId, quantity });
  }
  res.status(201).json({ status: "success", data: carts[userId!] });
});

app.delete("/api/cart/:userId/items/:productId", (req: Request, res: Response) => {
  const { userId, productId } = req.params;
  if (carts[userId!]) {
    carts[userId!] = carts[userId!]!.filter(i => i.productId !== productId);
  }
  res.json({ status: "success", data: carts[userId!] });
});

// ─── ORDERS ROUTES ────────────────────────────────────────

app.get("/api/orders", (_req: Request, res: Response) => {
  res.json({ status: "success", data: orders });
});

app.post("/api/orders", (req: Request, res: Response) => {
  const { userId, items } = req.body;
  const total = items.reduce((s: number, i: { productId: string; quantity: number }) => {
    const p = products.find(pr => pr.id === i.productId);
    return s + (p?.price ?? 0) * i.quantity;
  }, 0);
  const order: Order = {
    id: crypto.randomUUID(), userId, items, total,
    status: "pending", createdAt: new Date().toISOString()
  };
  orders.push(order);
  setTimeout(() => res.status(201).json({ status: "success", data: order }), 500);
});

app.listen(3001, () => {
  console.log("\n🚀 Day 11 backend on http://localhost:3001");
  console.log("  GET  /api/products?page=1&limit=10&category=books&search=react");
  console.log("  GET  /api/products/:id");
  console.log("  PATCH /api/products/:id");
  console.log("  GET  /api/cart/user1");
  console.log("  POST /api/cart/user1/items");
  console.log("  POST /api/orders");
});
