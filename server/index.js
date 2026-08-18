import express from 'express';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import app from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;

const distDir = path.join(__dirname, '..', 'client', 'dist');
function staticWithJsx(dir) {
  return express.static(dir, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.jsx')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    },
  });
}

if (existsSync(path.join(distDir, 'index.html'))) {
  app.use(staticWithJsx(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
  console.log('Serving frontend from', distDir);
} else {
  // Fallback to serving the unbuilt client during development
  const devIndex = path.join(__dirname, '..', 'client', 'index.html');
  const clientDir = path.join(__dirname, '..', 'client');
  if (existsSync(devIndex)) {
    app.use(staticWithJsx(clientDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(devIndex);
    });
    console.log('Serving frontend from (dev) ', clientDir);
  }
}

function startServer(port, maxAttempts = 10) {
  const server = app.listen(port, () => {
    console.log(`PDF Split Mail server listening on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      if (maxAttempts <= 0) {
        console.error(`Port ${port} in use and no more retries left.`);
        process.exit(1);
      } else {
        console.warn(`Port ${port} in use, trying port ${port + 1}...`);
        startServer(port + 1, maxAttempts - 1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer(Number(PORT));
