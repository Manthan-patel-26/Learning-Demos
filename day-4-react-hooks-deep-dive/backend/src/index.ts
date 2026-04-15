import express from "express";
import cors from "cors";
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Simulates a slow API to test debounce/throttle hooks
app.get("/api/search", async (req, res) => {
  const query = (req.query["q"] as string) || "";
  await new Promise((r) => setTimeout(r, 300)); // Simulate network delay
  const items = [
    "React",
    "TypeScript",
    "Node.js",
    "Express",
    "PostgreSQL",
    "Redux",
    "Next.js",
    "GraphQL",
    "Docker",
    "AWS",
  ].filter((i) => i.toLowerCase().includes(query.toLowerCase()));
  res.json({ status: "success", data: items, query, timestamp: Date.now() });
});

app.listen(3001, () => console.log("Day 4 backend on http://localhost:3001"));
