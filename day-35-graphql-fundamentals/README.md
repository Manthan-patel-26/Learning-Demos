# Day 35: GraphQL Fundamentals (Comparison)

**Date:** March 31, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
GraphQL server with DataLoader batching vs REST N+1 comparison. Live query playground showing: fetching nested products+category+author in 3 queries (GraphQL) vs 11+ queries (REST).

## 🚀 How to Run
```bash
cd backend && npm install && npm run dev    # http://localhost:3001
cd frontend && npm install && npm start    # http://localhost:3000

# Or test GraphQL directly:
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ products { name price category { name } author { name } } _queryCount }"}'
```

## 📁 Key Files
```
backend/src/index.ts  ← Full GraphQL schema, resolvers, DataLoader, REST comparison
```

## 📖 The N+1 Problem — The #1 GraphQL Gotcha

```
Without DataLoader (N+1):
  Query 1: SELECT * FROM products           → 5 products
  Query 2: SELECT * FROM categories WHERE id = 'c1'   ← per product!
  Query 3: SELECT * FROM users WHERE id = '1'
  Query 4: SELECT * FROM categories WHERE id = 'c1'   ← DUPLICATE!
  ...total: 11 queries for 5 products

With DataLoader (batched):
  Query 1: SELECT * FROM products
  Query 2: SELECT * FROM categories WHERE id IN ('c1', 'c2')
  Query 3: SELECT * FROM users WHERE id IN ('1', '2', '3')
  Total: 3 queries regardless of result count!
```

## 📖 DataLoader — How It Works
```typescript
const userLoader = new DataLoader<string, User>(
  async (ids: readonly string[]) => {
    // Called ONCE per request tick with ALL requested IDs
    const users = await db.query("SELECT * FROM users WHERE id = ANY($1)", [ids]);
    const map = new Map(users.map(u => [u.id, u]));
    return ids.map(id => map.get(id)); // Must return in same order as input!
  }
);

// In resolver (called per product):
resolve: (product, _args, { loaders }) =>
  loaders.userLoader.load(product.authorId);
// DataLoader collects all .load() calls within one tick, then batches them
```

## 📖 GraphQL SDL Quick Reference
```graphql
type Product {
  id: ID!           # ! = non-null (required)
  name: String!
  price: Float!
  inStock: Boolean! # Computed field (resolver)
  category: Category  # Nested type (resolved separately)
}

type Query {
  products(categorySlug: String, limit: Int): [Product!]!
  product(id: ID!): Product  # nullable (may not exist)
}

type Mutation {
  createProduct(name: String!, price: Float!, categoryId: ID!): Product
}
```

## ⚠️ When NOT to Use GraphQL

| Situation | Why REST is better |
|-----------|-------------------|
| Public API | HTTP caching, simpler auth, easier docs |
| File uploads | multipart/form-data is complex in GraphQL |
| Simple CRUD | GraphQL overhead not worth it for basic apps |
| Team unfamiliar | Learning curve: schema + resolvers + DataLoader |
| Microservices | Each service can have its own REST API |
