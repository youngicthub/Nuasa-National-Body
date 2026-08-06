import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Required for accurate per-client IPs (rate limiting, logging) when running
// behind a single reverse proxy — Replit's autoscale router, or a typical
// production load balancer. Without this, every request appears to come
// from the proxy's own address.
app.set("trust proxy", 1);

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
// Deliberately open to all origins — this is a public API with no
// cookie-based auth (Bearer tokens only), so there's no CSRF surface for
// wide-open CORS to make worse. `credentials: false` keeps that true even
// if a cookie-based flow gets added later without revisiting this line.
app.use(cors({ origin: "*", credentials: false }));
// Raise body limit to 20 MB to accommodate base64-encoded images that admins
// may embed directly in API payloads (executive photos, etc.).
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Every real route lives under /api (see routes/index.ts) — this is just so
// hitting the bare domain root (e.g. sanity-checking a fresh deploy) shows
// something meaningful instead of Express's default "Cannot GET /".
app.get("/", (_req, res) => {
  res.json({ name: "NUASA API", status: "ok", health: "/api/healthz" });
});

app.use("/api", router);

export default app;
