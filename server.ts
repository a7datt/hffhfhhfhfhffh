import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import authRoutes from './src/server/routes/auth.js';
import dashboardRoutes from './src/server/routes/dashboard.js';
import externalApiRoutes from './src/server/routes/external_api.js';
import adminRoutes from './src/server/routes/admin.js';
import { setupCronJobs } from './src/server/cron.js';
import dns from 'dns';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

dns.setDefaultResultOrder('ipv4first');
axios.defaults.timeout = 8000;

// Set up proxy for Syrian APIs if running on Render/production
if (process.env.SHAM_PROXY) {
  const proxyUrl = process.env.SHAM_PROXY;
  console.log(`Setting global HTTPS proxy: ${proxyUrl}`);
  axios.defaults.httpsAgent = new HttpsProxyAgent(proxyUrl);
  axios.defaults.proxy = false; // Disable axios's built-in proxy to use agent
}

async function startServer() {
  // Start background jobs
  setupCronJobs();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/v1', externalApiRoutes);
  app.use('/api/admin', adminRoutes);


  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
