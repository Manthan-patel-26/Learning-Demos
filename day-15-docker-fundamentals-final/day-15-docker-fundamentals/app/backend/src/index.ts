/**
 * DAY 15: Sample Backend App — Used for Dockerization
 * This is the app you will containerize using the Dockerfiles.
 */
import express from "express";
import cors from "cors"; // 1. Import it

const app = express();

// 2. Enable CORS
app.use(cors());

// If you want to be specific (safer):
// app.use(cors({ origin: 'http://localhost:3000' }));

app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", pid: process.pid }));

app.get("/api/greet", (req, res) => {
  const name = req.query["name"] ?? "World";
  res.json({ message: `Hello, ${name}!` });
});

app.listen(3001, () => console.log("Server on http://localhost:3001"));
