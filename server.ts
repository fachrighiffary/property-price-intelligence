import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const DEFAULT_PORT = 3000;
const START_PORT = Number(process.env.PORT) || DEFAULT_PORT;
const isPortExplicit = process.env.PORT !== undefined;

app.use(express.json());

const configuredCrawlerBase = (
  process.env.CRAWLER_API_BASE_URL || process.env.SERVICE_CRAWLER_URL || ""
)
  .trim()
  .replace(/\/$/, "");

function buildCrawlerCandidates(currentHostHeader: string | undefined) {
  const currentHost = (currentHostHeader || "").toLowerCase();
  const currentPort = Number((currentHost.split(":").pop() || "0").trim());
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
  const rawCandidates = [
    configuredCrawlerBase,
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    // "http://localhost:3001",
    // "http://127.0.0.1:3001"
  ];

  return Array.from(new Set(rawCandidates.filter(Boolean))).filter((candidate) => {
    try {
      const parsed = new URL(candidate);
      const candidateHost = parsed.host.toLowerCase();
      const candidatePort = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));

      if (candidateHost === currentHost) {
        return false;
      }

      if (
        currentPort > 0 &&
        candidatePort === currentPort &&
        loopbackHosts.has(parsed.hostname.toLowerCase())
      ) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  });
}

function parseCrawlerResponse(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requestCrawler(req: express.Request, endpoint: string, init?: RequestInit) {
  const candidates = buildCrawlerCandidates(req.headers.host);
  let lastError = "";

  for (const base of candidates) {
    try {
      const response = await fetch(`${base}${endpoint}`, init);
      const text = await response.text();
      const data = parseCrawlerResponse(text);
      return { status: response.status, data };
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  throw new Error(
    `Service crawler unreachable. Set CRAWLER_API_BASE_URL or SERVICE_CRAWLER_URL. Last error: ${lastError || "Unknown error"}`
  );
}

// Proxy all API traffic to the dedicated servicecrawler backend.
app.all("/api/*", async (req, res) => {
  try {
    const method = req.method.toUpperCase();
    const body = method === "GET" || method === "HEAD" ? undefined : JSON.stringify(req.body || {});
    const endpoint = req.originalUrl;

    const { status, data } = await requestCrawler(req, endpoint, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body
    });

    if (typeof data === "string") {
      res.status(status).send(data);
      return;
    }

    res.status(status).json(data);
  } catch (error: any) {
    console.error("API proxy error:", error);
    res.status(502).json({ error: error.message || "Failed to reach service crawler" });
  }
});

// Vite middleware & Static asset serving setup
async function createAppServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Important: API routes must be accessible before Vite middleware intercepts
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Catch-all route for SPA - but NOT for /api routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

function listenOnPort(port: number) {
  return new Promise<import("http").Server>((resolve, reject) => {
    const server = app.listen(port, "0.0.0.0", () => resolve(server));
    server.on("error", (err: NodeJS.ErrnoException) => reject({ err, port }));
  });
}

async function startServer(port: number = START_PORT) {
  await createAppServer();
  
  // Add 404 handler after all other routes and middleware
  app.use((req, res) => {
    console.warn(`[404] ${req.method} ${req.path}`);
    res.status(404).json({ error: `Route ${req.path} not found` });
  });

  try {
    const server = await listenOnPort(port);
    console.log(`Server running on http://localhost:${port}`);
    return server;
  } catch (payload: any) {
    const err: NodeJS.ErrnoException = payload.err;
    const attemptedPort: number = payload.port;

    if (err.code === "EADDRINUSE" && !isPortExplicit && attemptedPort < START_PORT + 5) {
      console.warn(`Port ${attemptedPort} already in use, trying ${attemptedPort + 1}...`);
      return startServer(attemptedPort + 1);
    }

    if (err.code === "EADDRINUSE") {
      console.error(`Port ${attemptedPort} is already in use. Please stop the process using that port or set PORT to a different value.`);
    } else {
      console.error("Server failed to start:", err);
    }
    process.exit(1);
  }
}

startServer();
