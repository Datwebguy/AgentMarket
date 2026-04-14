'use strict';
// This file owns the HTTP server. index.ts exports the Express app.
// This way the port is bound BEFORE any TypeScript modules load.

const http  = require('http');
const PORT  = parseInt(process.env.PORT || '4000', 10);

console.log('[start] AgentMarket starting on PORT=' + PORT);

let expressApp = null;

// Minimal handler while app loads
const server = http.createServer(function (req, res) {
  if (expressApp) {
    expressApp(req, res);
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', note: 'loading', timestamp: new Date().toISOString(), version: '1.0.0' }));
  }
});

server.on('error', function (err) {
  console.error('[start] Server bind error:', err.message);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', function () {
  console.log('[start] Port ' + PORT + ' bound — loading app...');

  // Now load the TypeScript-compiled app
  try {
    console.log('[start] require dist/index.js...');
    const mod = require('./dist/index.js');
    expressApp = mod.app || mod.default || mod;
    if (typeof expressApp === 'function') {
      console.log('[start] Express app mounted OK');
    } else {
      console.log('[start] WARNING: exported value is not a function, type=' + typeof expressApp);
      expressApp = null;
    }
  } catch (err) {
    console.error('[start] CRASH during app load:');
    console.error(err && err.stack ? err.stack : String(err));
    // Keep server alive so Railway sees a response — helps with debugging
  }
});
