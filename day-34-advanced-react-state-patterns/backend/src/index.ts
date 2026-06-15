import express from "express";
import cors from "cors";
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
// Simulates payment API called by the state machine's confirming state
app.post("/api/payment", async (req, res) => {
  await new Promise(r => setTimeout(r, 1500));
  if (Math.random() < 0.3) {
    res.status(402).json({ success: false, error: "Card declined — simulated failure" });
  } else {
    res.json({ success: true, orderId: `ORD-${Date.now()}` });
  }
});
app.listen(3001, () => console.log("Day 34 payment API on http://localhost:3001"));
