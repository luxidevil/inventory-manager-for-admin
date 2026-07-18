import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API is served under the /inventory prefix so it can live behind the
// luxidevilott.com/inventory route without colliding with the main site's /api.
app.use("/inventory/api", router);
// Keep the bare /api mount too so local dev / direct access still works.
app.use("/api", router);

// Serve the built React frontend (when FRONTEND_DIR is provided) under the
// same /inventory prefix, with SPA fallback to index.html for client routing.
const frontendDir = process.env.FRONTEND_DIR;
if (frontendDir) {
  const indexHtml = path.join(frontendDir, "index.html");
  app.use("/inventory", express.static(frontendDir));
  app.use((req, res, next) => {
    if (
      req.method === "GET" &&
      req.path.startsWith("/inventory") &&
      !req.path.startsWith("/inventory/api")
    ) {
      return res.sendFile(indexHtml);
    }
    next();
  });
}

export default app;
