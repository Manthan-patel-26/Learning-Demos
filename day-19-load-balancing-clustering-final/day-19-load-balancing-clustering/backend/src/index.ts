/**
 * DAY 19: Single-process server for development.
 * For clustering: npm run cluster
 */
import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

let requestCount = 0;

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    pid: process.pid,
    uptime: Math.round(process.uptime()),
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    requests: requestCount,
  });
});

app.get("/api/work", (_req, res) => {
  requestCount++;
  let result = 0;
  for (let i = 0; i < 1_000_000; i++) result += Math.sqrt(i);
  res.json({
    result: Math.round(result),
    pid: process.pid,
    requests: requestCount,
  });
});

app.listen(3001, () =>
  console.log(`Server PID ${process.pid} on http://localhost:3001`),
);
