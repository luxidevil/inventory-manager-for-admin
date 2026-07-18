import app from "./app";
import { logger } from "./lib/logger";
import { connectDB } from "./lib/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Start listening immediately so the frontend and health checks are available
// even if MongoDB is temporarily unreachable (e.g. a paused Atlas cluster).
app.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

// Connect to MongoDB in the background, retrying on failure instead of
// crash-looping. API routes that need the DB will error until it connects.
async function connectWithRetry(): Promise<void> {
  const delayMs = 10_000;
  for (;;) {
    try {
      await connectDB();
      logger.info("MongoDB connection established");
      return;
    } catch (err) {
      logger.error(
        { err },
        `Failed to connect to MongoDB, retrying in ${delayMs / 1000}s`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

void connectWithRetry();
