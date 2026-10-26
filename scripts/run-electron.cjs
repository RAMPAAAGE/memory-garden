// VS Code terminals set ELECTRON_RUN_AS_NODE, which turns Electron into plain Node. Drop it and launch the app.
const { spawn } = require('node:child_process');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
spawn(electron, ['.', ...process.argv.slice(2)], { stdio: 'inherit', env }).on('exit', (code) => process.exit(code ?? 0));
