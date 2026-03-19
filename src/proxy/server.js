// Proxy Server - Express wrapper for OpenAI proxy
const express = require('express');
const { processChatCompletion, getStats, resetStats } = require('./openai.js');

let server = null;
let isRunning = false;

/**
 * Start the proxy server
 * @param {number} port - Port to listen on
 * @returns {Promise<boolean>} - Success status
 */
async function startServer(port = 3000) {
  if (isRunning) {
    console.log('⚠️  Proxy server already running');
    return false;
  }

  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', running: true });
  });

  // Stats endpoint (for UI)
  app.get('/stats', (req, res) => {
    const stats = getStats();
    res.json(stats);
  });

  // OpenAI proxy endpoint
  app.post('/v1/chat/completions', async (req, res) => {
    try {
      const response = await processChatCompletion(req.body);
      res.json(response);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: error.message });
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
  stopServer,
  getStatus,
  getStats
};
