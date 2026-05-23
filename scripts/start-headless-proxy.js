const fs = require('fs');
const os = require('os');
const path = require('path');
const proxyServer = require('../src/proxy/server.js');

const CONFIG_DIR = process.env.AI_OPTIMIZER_USER_DATA_DIR || path.join(os.homedir(), '.config', 'ai-optimizer');
const SETTINGS_PATH = path.join(CONFIG_DIR, 'settings.json');
const PORT = Number.parseInt(process.env.AI_OPTIMIZER_PORT || '3000', 10);

function loadSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    throw new Error(`AI Optimizer settings not found at ${SETTINGS_PATH}`);
  }

  const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  return {
    provider: raw.provider || 'openai',
    cacheTtlSeconds: raw.cacheTtlSeconds || 300,
    openaiApiKey: raw.openaiApiKey || '',
    anthropicApiKey: raw.anthropicApiKey || '',
    googleApiKey: raw.googleApiKey || ''
  };
}

async function main() {
  const settings = loadSettings();

  // Local service mode for internal automations like News Scout.
  proxyServer.setLicenseValidator(() => true);

  await proxyServer.startServer(PORT, settings);
  console.log(`AI Optimizer headless proxy running on http://localhost:${PORT} using provider=${settings.provider}`);
}

async function shutdown(signal) {
  console.log(`Received ${signal}; stopping AI Optimizer headless proxy...`);
  try {
    await proxyServer.stopServer();
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
