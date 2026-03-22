// Fetch stats from AI Optimizer proxy
async function updateStats() {
  try {
    const response = await fetch('http://localhost:3000/stats');
    const data = await response.json();
    
    // Update UI
    document.getElementById('requests').textContent = data.requests || 0;
    document.getElementById('cache-hits').textContent = data.cacheHits || 0;
    document.getElementById('total-saved').textContent = `$${(data.totalSaved || 0).toFixed(2)}`;
    
    // Calculate hit rate
    const hitRate = data.requests > 0 
      ? ((data.cacheHits / data.requests) * 100).toFixed(1) + '%' 
      : '0%';
    document.getElementById('hit-rate').textContent = hitRate;
    
    // Update status
    const statusEl = document.getElementById('status');
    statusEl.textContent = 'Proxy Running ✅';
    statusEl.className = 'status running';
    
  } catch (error) {
    // Proxy not running or unreachable
    document.getElementById('requests').textContent = '-';
    document.getElementById('cache-hits').textContent = '-';
    document.getElementById('hit-rate').textContent = '-';
    document.getElementById('total-saved').textContent = '$0.00';
    
    const statusEl = document.getElementById('status');
    statusEl.textContent = 'Proxy Stopped ❌';
    statusEl.className = 'status stopped';
  }
}

// Load stats when popup opens
updateStats();

// Refresh every 2 seconds
setInterval(updateStats, 2000);
