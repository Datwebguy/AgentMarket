// Minimal startup — bind port immediately, then load full app
const http = require('http');
const PORT = parseInt(process.env.PORT || '4000', 10);

console.log('[start] Process started, PORT=' + PORT);

// Create a minimal server that responds to /health immediately
// This ensures Railway health checks pass even if app takes time to load
const server = http.createServer(function(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' }));
});

server.listen(PORT, '0.0.0.0', function() {
  console.log('[start] Port ' + PORT + ' bound on 0.0.0.0');

  // Now load the full Express app
  console.log('[start] Loading main app...');
  try {
    // The full app will take over the port via its own server
    // We close the mini server first
    server.close(function() {
      try {
        require('./dist/index.js');
        console.log('[start] Main app loaded OK');
      } catch (err) {
        console.error('[start] CRASH loading app: ' + (err && err.stack ? err.stack : String(err)));
        process.exit(1);
      }
    });
  } catch (err) {
    console.error('[start] ERROR: ' + (err && err.stack ? err.stack : String(err)));
    process.exit(1);
  }
});

server.on('error', function(err) {
  console.error('[start] Server error: ' + err.message);
  process.exit(1);
});
