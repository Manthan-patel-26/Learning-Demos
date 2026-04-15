import express from "express";
import cors from "cors";
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.get("/api/data", (_req, res) => res.json({ data: ["React", "TypeScript", "Node.js", "Docker"] }));
app.listen(3001, () => console.log("Day 13 backend on http://localhost:3001"));
