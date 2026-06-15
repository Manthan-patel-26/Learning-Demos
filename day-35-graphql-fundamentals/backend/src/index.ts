/**
 * ============================================================
 * DAY 35: GRAPHQL FUNDAMENTALS — Schema, Resolvers, DataLoader
 * ============================================================
 * Covers:
 *  1. GraphQL schema design (SDL — Schema Definition Language)
 *  2. Resolvers (how data is fetched per field)
 *  3. DataLoader (batching to solve the N+1 problem)
 *  4. Authentication via context
 *  5. Comparison endpoints (same data via REST and GraphQL)
 *
 * Test GraphQL at: http://localhost:3001/graphql (use curl or Altair)
 * Test REST API at: http://localhost:3001/api/...
 */
import express, { Request } from "express";
import cors from "cors";
import { createHandler } from "graphql-http/lib/use/express";
import {
  GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLInt,
  GraphQLFloat, GraphQLList, GraphQLNonNull, GraphQLBoolean,
  GraphQLID, GraphQLEnumType,
} from "graphql";
import DataLoader from "dataloader";

// ─── FAKE DATA STORE ──────────────────────────────────────
// Tracking how many "DB queries" each approach makes
let queryCount = 0;
function resetQueryCount() { queryCount = 0; }
function trackQuery(name: string) {
  queryCount++;
  console.log(`  [DB Query #${queryCount}] ${name}`);
}

const users = [
  { id: "1", name: "Alice Smith", email: "alice@example.com", role: "admin", joinedAt: "2024-01-01" },
  { id: "2", name: "Bob Jones",   email: "bob@example.com",   role: "user",  joinedAt: "2024-02-01" },
  { id: "3", name: "Charlie Dev", email: "charlie@example.com", role: "user", joinedAt: "2024-03-01" },
];

const products = [
  { id: "p1", name: "TypeScript Handbook", price: 29.99, categoryId: "c1", authorId: "1", stock: 50, rating: 4.8 },
  { id: "p2", name: "React in Depth",      price: 39.99, categoryId: "c1", authorId: "2", stock: 30, rating: 4.6 },
  { id: "p3", name: "Node.js Pro",         price: 49.99, categoryId: "c1", authorId: "1", stock: 20, rating: 4.7 },
  { id: "p4", name: "Running Shoes",       price: 89.99, categoryId: "c2", authorId: "3", stock: 100, rating: 4.5 },
  { id: "p5", name: "Yoga Mat",            price: 34.99, categoryId: "c2", authorId: "2", stock: 75, rating: 4.3 },
];

const categories = [
  { id: "c1", name: "Books",  slug: "books" },
  { id: "c2", name: "Sports", slug: "sports" },
];

const orders = [
  { id: "o1", userId: "1", productIds: ["p1", "p2"], total: 69.98, status: "delivered", createdAt: "2024-03-01" },
  { id: "o2", userId: "2", productIds: ["p3"],        total: 49.99, status: "shipped",   createdAt: "2024-03-10" },
  { id: "o3", userId: "1", productIds: ["p4", "p5"],  total: 124.98, status: "pending",  createdAt: "2024-03-15" },
];

// ─── DATALOADER — Solves the N+1 Problem ──────────────────
// WITHOUT DataLoader: fetching 5 products with their authors runs 6 queries:
//   1. SELECT * FROM products             (1 query for list)
//   2. SELECT * FROM users WHERE id = "1" (N queries for each author!)
//   3. SELECT * FROM users WHERE id = "2"
//   4. SELECT * FROM users WHERE id = "1" ← DUPLICATE!
//   5. etc.
//
// WITH DataLoader: automatically BATCHES all user lookups into ONE query:
//   1. SELECT * FROM products
//   2. SELECT * FROM users WHERE id IN ("1", "2", "3")  ← single batched query!

function createLoaders() {
  const userLoader = new DataLoader<string, typeof users[0] | undefined>(
    async (ids) => {
      // This batch function receives ALL requested IDs at once
      // Called once per request cycle, not once per resolver
      trackQuery(`SELECT * FROM users WHERE id IN (${ids.join(",")})`);
      await new Promise(r => setTimeout(r, 20)); // Simulate DB latency

      const userMap = new Map(users.map(u => [u.id, u]));
      // IMPORTANT: return array in the SAME ORDER as input ids
      return ids.map(id => userMap.get(id));
    }
  );

  const categoryLoader = new DataLoader<string, typeof categories[0] | undefined>(
    async (ids) => {
      trackQuery(`SELECT * FROM categories WHERE id IN (${ids.join(",")})`);
      const catMap = new Map(categories.map(c => [c.id, c]));
      return ids.map(id => catMap.get(id));
    }
  );

  return { userLoader, categoryLoader };
}

// ─── GRAPHQL TYPES ────────────────────────────────────────

const UserRoleEnum = new GraphQLEnumType({
  name: "UserRole",
  values: { ADMIN: { value: "admin" }, USER: { value: "user" } },
});

const CategoryType: GraphQLObjectType = new GraphQLObjectType({
  name: "Category",
  fields: () => ({
    id:   { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    slug: { type: new GraphQLNonNull(GraphQLString) },
    // Reverse relationship: products in this category
    products: {
      type: new GraphQLList(new GraphQLNonNull(ProductType)),
      resolve: (category) => {
        trackQuery(`SELECT * FROM products WHERE categoryId = '${category.id}'`);
        return products.filter(p => p.categoryId === category.id);
      },
    },
  }),
});

const ProductType: GraphQLObjectType = new GraphQLObjectType({
  name: "Product",
  fields: () => ({
    id:       { type: new GraphQLNonNull(GraphQLID) },
    name:     { type: new GraphQLNonNull(GraphQLString) },
    price:    { type: new GraphQLNonNull(GraphQLFloat) },
    stock:    { type: new GraphQLNonNull(GraphQLInt) },
    rating:   { type: GraphQLFloat },
    inStock:  { type: new GraphQLNonNull(GraphQLBoolean), resolve: (p) => p.stock > 0 },

    // Nested: resolve the category using DataLoader (batched!)
    category: {
      type: CategoryType,
      resolve: (product, _args, context: { loaders: ReturnType<typeof createLoaders> }) => {
        // context.loaders.categoryLoader.load() deduplicates and batches
        return context.loaders.categoryLoader.load(product.categoryId);
      },
    },

    // Nested: resolve the author using DataLoader (batched!)
    author: {
      type: UserType,
      resolve: (product, _args, context: { loaders: ReturnType<typeof createLoaders> }) => {
        return context.loaders.userLoader.load(product.authorId);
      },
    },
  }),
});

const UserType: GraphQLObjectType = new GraphQLObjectType({
  name: "User",
  fields: () => ({
    id:       { type: new GraphQLNonNull(GraphQLID) },
    name:     { type: new GraphQLNonNull(GraphQLString) },
    email:    { type: new GraphQLNonNull(GraphQLString) },
    role:     { type: UserRoleEnum },
    joinedAt: { type: GraphQLString },
    // Nested: user's orders
    orders: {
      type: new GraphQLList(new GraphQLNonNull(OrderType)),
      resolve: (user) => {
        trackQuery(`SELECT * FROM orders WHERE userId = '${user.id}'`);
        return orders.filter(o => o.userId === user.id);
      },
    },
  }),
});

const OrderType: GraphQLObjectType = new GraphQLObjectType({
  name: "Order",
  fields: () => ({
    id:        { type: new GraphQLNonNull(GraphQLID) },
    total:     { type: new GraphQLNonNull(GraphQLFloat) },
    status:    { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: GraphQLString },
    user: {
      type: UserType,
      resolve: (order, _args, context: { loaders: ReturnType<typeof createLoaders> }) =>
        context.loaders.userLoader.load(order.userId),
    },
    products: {
      type: new GraphQLList(new GraphQLNonNull(ProductType)),
      resolve: (order) => {
        trackQuery(`SELECT * FROM products WHERE id IN (${order.productIds.join(",")})`);
        return products.filter(p => order.productIds.includes(p.id));
      },
    },
  }),
});

// ─── SCHEMA ───────────────────────────────────────────────
const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      // List queries
      products: {
        type: new GraphQLList(new GraphQLNonNull(ProductType)),
        args: { categorySlug: { type: GraphQLString }, limit: { type: GraphQLInt } },
        resolve: (_root, args) => {
          trackQuery("SELECT * FROM products" + (args.categorySlug ? ` WHERE category='${args.categorySlug}'` : ""));
          let result = [...products];
          if (args.categorySlug) {
            const cat = categories.find(c => c.slug === args.categorySlug);
            if (cat) result = result.filter(p => p.categoryId === cat.id);
          }
          return args.limit ? result.slice(0, args.limit) : result;
        },
      },
      users: {
        type: new GraphQLList(new GraphQLNonNull(UserType)),
        resolve: () => { trackQuery("SELECT * FROM users"); return users; },
      },
      categories: {
        type: new GraphQLList(new GraphQLNonNull(CategoryType)),
        resolve: () => { trackQuery("SELECT * FROM categories"); return categories; },
      },
      // Single item queries
      product: {
        type: ProductType,
        args: { id: { type: new GraphQLNonNull(GraphQLID) } },
        resolve: (_root, args) => {
          trackQuery(`SELECT * FROM products WHERE id='${args.id}'`);
          return products.find(p => p.id === args.id);
        },
      },
      user: {
        type: UserType,
        args: { id: { type: new GraphQLNonNull(GraphQLID) } },
        resolve: (_root, args, context: { loaders: ReturnType<typeof createLoaders> }) =>
          context.loaders.userLoader.load(args.id),
      },
      orders: {
        type: new GraphQLList(new GraphQLNonNull(OrderType)),
        resolve: () => { trackQuery("SELECT * FROM orders"); return orders; },
      },
      // Debug: show how many queries ran
      _queryCount: {
        type: GraphQLInt,
        resolve: () => queryCount,
      },
    },
  }),

  mutation: new GraphQLObjectType({
    name: "Mutation",
    fields: {
      createProduct: {
        type: ProductType,
        args: {
          name:       { type: new GraphQLNonNull(GraphQLString) },
          price:      { type: new GraphQLNonNull(GraphQLFloat) },
          categoryId: { type: new GraphQLNonNull(GraphQLID) },
        },
        resolve: (_root, args) => {
          const newProduct = {
            id: `p${products.length + 1}`,
            name: args.name, price: args.price, categoryId: args.categoryId,
            authorId: "1", stock: 0, rating: 0,
          };
          products.push(newProduct);
          trackQuery(`INSERT INTO products VALUES (...)`);
          return newProduct;
        },
      },
    },
  }),
});

// ─── EXPRESS + GRAPHQL + REST ─────────────────────────────
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// GraphQL endpoint — one URL handles ALL queries
app.use("/graphql", createHandler({
  schema,
  context: (): { loaders: ReturnType<typeof createLoaders> } => {
    resetQueryCount(); // Fresh count per request
    return { loaders: createLoaders() }; // Fresh loaders per request (important!)
  },
}));

// ─── REST COMPARISON ENDPOINTS ────────────────────────────
// These REST endpoints show how many DB queries are needed vs GraphQL

// REST: Products with categories — requires multiple queries
app.get("/api/rest/products-with-details", async (_req, res) => {
  resetQueryCount();
  console.log("\n[REST] GET /api/rest/products-with-details");

  trackQuery("SELECT * FROM products");
  const allProducts = [...products];

  // N+1 PROBLEM: one query per product to get its category and author!
  const enriched = await Promise.all(allProducts.map(async (p) => {
    trackQuery(`SELECT * FROM categories WHERE id='${p.categoryId}'`);
    trackQuery(`SELECT * FROM users WHERE id='${p.authorId}'`);
    const category = categories.find(c => c.id === p.categoryId);
    const author   = users.find(u => u.id === p.authorId);
    return { ...p, category, author };
  }));

  res.json({
    data: enriched,
    _meta: { queryCount, note: `REST made ${queryCount} DB queries for ${enriched.length} products!` },
  });
});

// Same data via GraphQL with DataLoader = far fewer queries
app.get("/api/graphql-equivalent", (_req, res) => {
  res.json({
    note: "Run this GraphQL query to get the same data with only 3 total queries:",
    endpoint: "POST /graphql",
    query: `{
  products {
    id name price rating inStock
    category { name slug }
    author { name email }
  }
  _queryCount
}`,
    expectedQueries: 3,
    explanation: [
      "1. SELECT * FROM products",
      "2. SELECT * FROM categories WHERE id IN (c1, c2)  ← batched by DataLoader!",
      "3. SELECT * FROM users WHERE id IN (1, 2, 3)       ← batched by DataLoader!",
    ],
  });
});

app.listen(3001, () => {
  console.log("\n🚀 Day 35 GraphQL Server on http://localhost:3001");
  console.log("\n   GraphQL endpoint: POST http://localhost:3001/graphql");
  console.log("   REST comparison:  GET  http://localhost:3001/api/rest/products-with-details");
  console.log("\n   Example queries:");
  console.log(`   curl -X POST http://localhost:3001/graphql \\
     -H "Content-Type: application/json" \\
     -d '{"query":"{ products { id name price category { name } author { name } _queryCount } }"}'`);
});
