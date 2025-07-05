import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Enable full iframe embedding - remove all blocking headers
app.use((req, res, next) => {
  // CORS headers for cross-origin requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'false');
  
  // COMPLETELY remove any iframe blocking headers
  res.removeHeader('X-Frame-Options');
  res.removeHeader('x-frame-options');
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('content-security-policy');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Final safety net to ensure no iframe blocking headers are sent
app.use((req, res, next) => {
  const originalEnd = res.end;
  const originalSend = res.send;
  
  res.end = function(...args: any[]) {
    // Remove all possible iframe blocking headers
    res.removeHeader('X-Frame-Options');
    res.removeHeader('x-frame-options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('content-security-policy');
    return originalEnd.apply(this, args);
  };
  
  res.send = function(body: any) {
    // Remove all possible iframe blocking headers
    res.removeHeader('X-Frame-Options');
    res.removeHeader('x-frame-options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('content-security-policy');
    return originalSend.call(this, body);
  };
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
