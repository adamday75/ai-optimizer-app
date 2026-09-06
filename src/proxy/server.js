// Proxy Server - Express wrapper for active AI provider
const express = require('express');
const { processChatCompletion, processEmbeddings, processResponses, getStats, resetStats, resetClients, configureProviders } = require('./provider-router.js');
const { configureCache } = require('./cache.js');
const fs = require('fs');
const os = require('os');
const path = require('path');

let electronApp = null;
try {
  const electron = require('electron');
  if (electron && typeof electron === 'object' && electron.app) {
    electronApp = electron.app;
  }
} catch (error) {
  electronApp = null;
}

// Log file for debugging
function getLogFilePath() {
  if (electronApp?.getPath) {
    try {
      return path.join(electronApp.getPath('userData'), 'proxy-debug.log');
    } catch (error) {
      // Fall back to the standard config directory when Electron app paths are unavailable.
    }
  }

  const fallbackDir = process.env.AI_OPTIMIZER_USER_DATA_DIR || path.join(os.homedir(), '.config', 'ai-optimizer');
  fs.mkdirSync(fallbackDir, { recursive: true });
  return path.join(fallbackDir, 'proxy-debug.log');
}

function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(getLogFilePath(), `[${timestamp}] ${message}\n`);
}

let server = null;
let isRunning = false;

// License validation function (injected from main.js)
let isLicenseValidFn = null;

/**
 * Set the license validation function
 * @param {Function} fn - Function that returns true if license is valid
 */
function setLicenseValidator(fn) {
  isLicenseValidFn = fn;
  logToFile('🔐 License validator registered');
}

/**
 * Middleware to validate license before allowing API access
 */
function requireValidLicense(req, res, next) {
  // Skip license check for health and stats endpoints
  if (req.path === '/health' || req.path === '/stats') {
    return next();
  }

  // Check if license validator is set
  if (!isLicenseValidFn) {
    console.warn('⚠️  No license validator set - allowing request');
    logToFile('⚠️  Request allowed - no validator configured');
    return next();
  }

  // Validate license
  try {
    const isValid = isLicenseValidFn();
    
    if (!isValid) {
      console.warn('🚫 Blocked request - invalid or missing license');
      logToFile(`🚫 BLOCKED: ${req.method} ${req.path} - Invalid license`);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid license required. Please activate your license to use this feature.' 
      });
    }
    
    logToFile(`✅ License validated - ${req.method} ${req.path}`);
    next();
  } catch (error) {
    console.error('License validation error:', error);
    logToFile(`❌ License validation error: ${error.message}`);
    res.status(500).json({ error: 'License validation failed' });
  }
}

/**
 * Start the proxy server
 * @param {number} port - Port to listen on
 * @returns {Promise<boolean>} - Success status
 */
async function startServer(port = 3000, settings = {}) {
  if (isRunning) {
    console.log('⚠️  Proxy server already running');
    return false;
  }

  const cacheConfig = configureCache(settings);
  configureProviders(settings);
  logToFile(`🧠 Cache TTL configured: ${cacheConfig.ttlSeconds}s (${cacheConfig.source})`);
  logToFile(`🤖 Active provider configured: ${settings.provider || 'openai'}`);

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Apply license validation middleware to all routes
  app.use(requireValidLicense);

  // Health check endpoint (exempt from license check via middleware logic)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', running: true });
  });

  // Stats endpoint (exempt from license check via middleware logic)
  app.get('/stats', (req, res) => {
    const stats = getStats();
    res.json(stats);
  });

  // Active provider proxy endpoints - protected by license check
  app.post('/v1/chat/completions', async (req, res) => {
    try {
      const response = await processChatCompletion(req.body);
      res.json(response);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(error?.status || 500).json({ error: error.message });
    }
  });

  // Embeddings passthrough for the active provider (OpenAI supported in V1)
  app.post('/v1/embeddings', async (req, res) => {
    try {
      const response = await processEmbeddings(req.body);
      res.json(response);
    } catch (error) {
      console.error('Embeddings proxy error:', error);
      res.status(error?.status || 500).json({ error: error.message });
    }
  });

  // Responses API (OpenAI supported in V1; other providers can return unsupported)
  app.post('/v1/responses', async (req, res) => {
    try {
      console.log('📝 Responses API called');
      const response = await processResponses(req.body);
      res.json(response);
    } catch (error) {
      console.error('Responses API error:', error);
      res.status(error?.status || 500).json({ error: error.message });
    }
  });

  // Codex uses /responses (without /v1 prefix)
  app.post('/responses', async (req, res) => {
    try {
      console.log('📝 Codex /responses endpoint called');
      const response = await processResponses(req.body);
      res.json(response);
    } catch (error) {
      console.error('Codex /responses error:', error);
      res.status(error?.status || 500).json({ error: error.message });
    }
  });

  // Also handle GET /responses (WebSocket fallback)
  app.get('/responses', (req, res) => {
    console.log('⚠️ GET /responses not supported - use POST');
    res.status(405).json({ error: 'Method not allowed' });
  });

  // Codex CLI endpoint (2025-2026 agentic CLI)
  app.post('/backend-api/codex/responses', async (req, res) => {
    try {
      console.log('🤖 Codex CLI endpoint called');
      const response = await processResponses(req.body);
      res.json(response);
    } catch (error) {
      console.error('Codex CLI error:', error);
      res.status(error?.status || 500).json({ error: error.message });
    }
  });

  // ChatGPT.com backend API - forward all requests to real backend
  // This catches /backend-api/* paths that the extension intercepts
  app.use('/backend-api/', async (req, res) => {
    try {
      const path = req.originalUrl; // e.g., /backend-api/gizmos/...
      const https = require('https');
      const http = require('http');
      
      console.log('🔄 Forwarding ChatGPT backend request:', path);
      logToFile(`🔄 Forwarding: ${path} (method: ${req.method})`);
      
      const url = new URL(path, 'https://chatgpt.com');
      const lib = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: req.method,
        headers: {
          ...req.headers,
          host: url.hostname,
          'Content-Length': undefined // Let Node.js calculate this
        }
      };
      
      const proxyReq = lib.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      
      proxyReq.on('error', (err) => {
        console.error('Proxy request error:', err);
        logToFile(`❌ Error: ${err.message}`);
        res.status(500).json({ error: err.message });
      });
      
      if (req.body && Object.keys(req.body).length > 0) {
        proxyReq.write(JSON.stringify(req.body));
      }
      
      proxyReq.end();
    } catch (error) {
      console.error('ChatGPT backend proxy error:', error);
      logToFile(`❌ Error: ${error.message}`);
      res.status(error?.status || 500).json({ error: error.message });
    }
  });

  return new Promise((resolve, reject) => {
    server = app.listen(port, () => {
      console.log(`🚀 Proxy server running on http://localhost:${port}`);
      isRunning = true;
      resolve(true);
    });

    server.on('error', (err) => {
      console.error('Server error:', err);
      isRunning = false;
      reject(err);
    });
  });
}


function updateSettings(settings = {}) {
  configureProviders(settings);
  const cacheConfig = configureCache(settings);
  logToFile(`⚙️ Runtime settings updated: provider=${settings.provider || 'openai'}, ttl=${cacheConfig.ttlSeconds}s (${cacheConfig.source})`);
}

/**
 * Stop the proxy server
 * @returns {Promise<boolean>} - Success status
 */
async function stopServer() {
  if (!isRunning || !server) {
    console.log('⚠️  Proxy server not running');
    return false;
  }

  return new Promise((resolve) => {
    server.close(() => {
      console.log('🛑 Proxy server stopped');
      isRunning = false;
      server = null;
      resetStats(); // Reset stats on restart
      resetClients(); // Reset provider clients so keys are re-read fresh on next start
      resolve(true);
    });
  });
}

/**
 * Check if server is running
 * @returns {boolean}
 */
function getStatus() {
  return isRunning;
}

// Export for Electron main process
module.exports = {
  startServer,
  updateSettings,
  stopServer,
  getStatus,
  getStats,
  setLicenseValidator
};
