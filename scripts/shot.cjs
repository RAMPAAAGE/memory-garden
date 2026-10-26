// Dev helper: electron scripts/shot.cjs <outDir> <plan.json>
// plan: [{ "query": "?scene=intro", "steps": [{ "wait": 1000 }, { "js": "..." }, { "shot": "name" }] }]
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
const [outDir, planFile] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 900, show: true, useContentSize: true, webPreferences: { backgroundThrottling: false } });
  win.webContents.on('console-message', (_e, level, msg) => { if (level >= 2) console.log('[page]', msg); });
  for (const run of plan) {
    if (run.size) win.setContentSize(run.size[0], run.size[1]);
    if (run.ua) win.webContents.setUserAgent(run.ua);
    await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { search: run.query || '' });
    for (const step of run.steps) {
      if (step.wait) await sleep(step.wait);
      if (step.js) { try { await win.webContents.executeJavaScript(step.js); } catch (e) { console.log('js error', e.message); } }
      if (step.wheel) {
        for (let i = 0; i < step.wheel.count; i++) {
          win.webContents.sendInputEvent({ type: 'mouseWheel', x: 700, y: 450, deltaX: 0, deltaY: -step.wheel.dy, canScroll: true });
          await sleep(step.wheel.every || 16);
        }
      }
      if (step.move) win.webContents.sendInputEvent({ type: 'mouseMove', x: step.move[0], y: step.move[1] });
      if (step.shot) {
        const img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(outDir, `${step.shot}.jpg`), img.toJPEG(82));
        console.log('shot', step.shot);
      }
    }
  }
  app.quit();
});
