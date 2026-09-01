import { connectDB, initializeIndexes, disconnectDB } from "./database/index.js";
import { env } from "./config/env.js";
import { app } from "./app.js";

const port = env.port;

let server: ReturnType<typeof app.listen> | null = null;

if (env.nodeEnv !== "test") {
  server = app.listen(port, async () => {
    try {
      await connectDB();
      await initializeIndexes();
    } catch (err) {
      console.error("[database] Failed to connect:", err);
    }
    console.log(`SideKick server listening`);
  });
}

const gracefulShutdown = (signal: string) => {
  console.log(`[server] Received ${signal}, shutting down...`);

  if (!server) {
    process.exit(0);
  }

  server.close(async () => {
    try {
      await disconnectDB();
    } catch (err) {
      console.error("[database] Error closing connection:", err);
    }
    process.exit(0);
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

export { app };