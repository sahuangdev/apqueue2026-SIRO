process.stdout.write("starting\n");
try {
  const e = require('electron');
  process.stdout.write("electron keys: " + Object.keys(e).join(', ') + "\n");
  const { app } = e;
  process.stdout.write("app: " + typeof app + "\n");
} catch(err) {
  process.stdout.write("ERROR: " + err.message + "\n");
}
