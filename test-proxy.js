// Quick test script for AI Optimizer proxy
const server = require('./src/proxy/server.js');

console.log('🧪 Starting AI Optimizer proxy test...\n');

// Start the proxy server
server.startServer(3000).then(() => {
  console.log('✅ Proxy started on port 3000\n');
  
  // Test health endpoint
  const http = require('http');
  
  // Test /health
  http.get('http://localhost:3000/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Health:', JSON.parse(data));
    });
  });
  
  // Test /stats
  http.get('http://localhost:3000/stats', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Stats:', JSON.parse(data));
      console.log('\n✅ Proxy working!');
      console.log('Press Ctrl+C to stop\n');
    });
  });
  
}).catch(err => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});
