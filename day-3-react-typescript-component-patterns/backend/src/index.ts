/**
 * Day 3 Backend - Provides form submission endpoint
 * Pairs with the frontend form components library
 */
import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Simulate stored form submissions
const submissions: unknown[] = [];

// Accept form submissions from the frontend
app.post("/api/submit", (req, res) => {
  const data = req.body;
  submissions.push({
    ...data,
    id: Date.now(),
    submittedAt: new Date().toISOString(),
  });
  res.json({
    status: "success",
    message: "Form submitted!",
    total: submissions.length,
  });
});

app.get("/api/submissions", (_req, res) => {
  res.json({ status: "success", data: submissions });
});

app.listen(3001, () => console.log("Day 3 backend on http://localhost:3001"));
