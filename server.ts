import "./server/telemetry"; // Must be imported before express
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./server/routes/api";
import { authRouter } from "./server/routes/auth";
import { adminRouter } from "./server/routes/admin";
import { logger } from "./server/config/logger";
import { register, httpRequestDuration, errorRateCounter } from "./server/metrics";
import { otelSDK } from "./server/telemetry";

async function startServer() {
  otelSDK.start();

  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(helmet({
    contentSecurityPolicy: false,
  }));
  app.use(cors());
  app.use(express.json());

  // Metrics Middleware
  app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
      end({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
    });
    next();
  });

  // Health and Readiness Checks
  app.get('/health/live', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/health/ready', (req, res) => {
    // Check DB/Redis connections here if applicable
    res.status(200).json({ status: 'ready' });
  });

  // Prometheus Metrics Endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (ex) {
      res.status(500).end(ex);
    }
  });

  // Observability Ingestion for Frontend Runtime Errors
  app.post('/api/telemetry/error', (req, res) => {
    try {
      const { errorId, boundary, name, message, stack, componentStack, route, timestamp } = req.body;
      errorRateCounter.inc({ type: 'frontend_runtime_error', endpoint: route || 'frontend' });
      logger.error(`[Frontend Runtime Error] ${name || 'Error'}: ${message || 'Unknown'}`, {
        errorId,
        boundary,
        route,
        stack,
        componentStack,
        source: 'react_error_boundary',
        timestamp: timestamp || new Date().toISOString()
      });
      res.status(200).json({ status: 'ok', errorId });
    } catch (ex) {
      logger.error('Failed to log frontend runtime error:', ex);
      res.status(500).json({ error: 'Failed to record error' });
    }
  });

  // API Routes
  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error handling middleware to catch errors and update metrics
  app.use((err: any, req: any, res: any, next: any) => {
    errorRateCounter.inc({ type: err.name || 'UnknownError', endpoint: req.path });
    logger.error('Unhandled Exception:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  logger.error("Failed to start server", err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  otelSDK.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
