import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectToDatabase, getDb } from "./config/db.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await connectToDatabase();
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "disconnected", error: (err as Error).message });
  }
});

const port = Number(process.env.PORT) || 5000;

if (process.env.NODE_ENV !== "test") {
  await connectToDatabase();
  app.listen(port, () => {
    console.log(`SideKick server listening on http://localhost:${port}`);
  });
}

export { app };
