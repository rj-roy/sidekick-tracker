import express from "express";
import cors from "cors";
import { connectDB, initializeIndexes } from "./database/index.js";
import { env } from "./config/env.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  res.json({ status: "ok", message: "Server is runnig perfectly" });
});

const port = env.port;

if (env.nodeEnv !== "test") {
  app.listen(port, async () => {
    try {
      await connectDB();
      await initializeIndexes();
    } catch (err) {
      console.error("[database] Failed to connect:", err);
    }
    console.log(`SideKick server listening on http://localhost:${port}`);
  });
}

export { app };
