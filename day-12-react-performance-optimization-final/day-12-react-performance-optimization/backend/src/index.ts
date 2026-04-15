/**
 * DAY 12: Backend — serves 10,000 items for performance testing
 */
import express from "express";
import cors from "cors";
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Generate 10,000 items
const items = Array.from({ length: 10000 }, (_, i) => ({
  id: String(i + 1),
  name: `Item ${i + 1} — ${["React Component", "TypeScript Interface", "Redux Slice", "Express Route", "SQL Query"][i % 5]}`,
  category: ["frontend", "backend", "database", "devops", "testing"][i % 5],
  price: parseFloat((5 + Math.random() * 200).toFixed(2)),
  complexity: ["easy", "medium", "hard", "expert"][
    Math.floor(Math.random() * 4)
  ],
  tags: Array.from(
    { length: Math.floor(Math.random() * 4) + 1 },
    (_, j) => ["react", "typescript", "node", "sql", "docker"][j % 5],
  ),
}));

app.get("/api/items", (_req, res) => res.json({ data: items }));
app.get("/api/items/paginated", (req, res) => {
  const page = parseInt(req.query["page"] as string) || 1;
  const limit = parseInt(req.query["limit"] as string) || 50;
  res.json({
    data: items.slice((page - 1) * limit, page * limit),
    total: items.length,
    page,
    totalPages: Math.ceil(items.length / limit),
  });
});

app.listen(3001, () =>
  console.log(
    "Day 12 backend on http://localhost:3001 (10k items at /api/items)",
  ),
);
