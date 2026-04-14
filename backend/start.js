// Startup wrapper — catches silent crashes during module loading
process.on('uncaughtException', function(err) {
  process.stderr.write('CRASH: ' + (err && err.stack ? err.stack : String(err)) + '\n');
  process.exit(1);
});
process.on('unhandledRejection', function(reason) {
  process.stderr.write('UNHANDLED: ' + String(reason) + '\n');
  process.exit(1);
});

process.stderr.write('Loading app...\n');
try {
  require('./dist/index.js');
  process.stderr.write('App loaded OK\n');
} catch (err) {
  process.stderr.write('LOAD ERROR: ' + (err && err.stack ? err.stack : String(err)) + '\n');
  process.exit(1);
}
