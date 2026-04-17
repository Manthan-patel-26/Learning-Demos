import express from "express";
import cors from "cors";
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.post("/api/register", (req, res) => {
  console.log("Registration data received:", req.body);
  setTimeout(() => res.status(201).json({ status: "success", message: "Registration complete!", data: req.body }), 800);
});
app.listen(3001, () => console.log("Day 23 backend on http://localhost:3001"));
