import { env } from "./config/env.js";
import { app } from "./app.js";
import { connectDB, disconnectDB } from "./database/mongodb.js";
import { initializeIndexes } from "./database/init.indexs.js";
import { startJobs } from "./jobs/index.js";

const port = env.port;

let server: ReturnType<typeof app.listen> | null = null;

if (env.nodeEnv !== "test") {
  const start = async (): Promise<void> => {
    await connectDB();
    await initializeIndexes();
    startJobs();

    server = app.listen(port, () => {
      console.log(`SideKick server listening on ${port}`);
    });
  };

  start().catch((err) => {
    console.error("[server] Failed to start:", err);
    process.exitCode = 1;
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