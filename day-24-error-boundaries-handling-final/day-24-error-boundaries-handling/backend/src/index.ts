import express from "express";
import cors from "cors";
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.listen(3001, () => console.log("Day 24 backend on http://localhost:3001"));
