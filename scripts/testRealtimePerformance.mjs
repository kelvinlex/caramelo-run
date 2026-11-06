import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDir = path.join(os.tmpdir(), 'chrome-runner-' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9556',
  `--user-data-dir=${tmpDir}`,
  '--disable-gpu-shader-disk-cache',
  '--window-size=1280,720',
  '--no-first-run',
  '--no-default-browser-check',
  'http://localhost:5173'
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  await sleep(2500);

  const res = await fetch('http://127.0.0.1:9556/json');
  const tabs = await res.json();
  const pageTab = tabs.find((t) => t.type === 'page' && t.url.includes('5173'));

  if (!pageTab) {
    console.error('No page tab found!');
    cleanup();
    return;
  }

  console.log('Connecting to:', pageTab.webSocketDebuggerUrl);
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    } else if (data.method === 'Runtime.consoleAPICalled') {
      const args = (data.params.args || []).map((a) => a.value || a.description).join(' ');
      console.log(`[BROWSER CONSOLE ${data.params.type}]:`, args);
    } else if (data.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]:', data.params.exceptionDetails);
    }
  };

  await new Promise((resolve) => { ws.onopen = resolve; });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Console.enable');

  console.log('Waiting for game to load...');
  await sleep(4000);

  // Evaluate state in page
  async function evalJs(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return res.result?.value;
  }

  // Click play button or check loading progress
  let loadingPct = await evalJs(`document.querySelector('.loading-progress-text')?.innerText || document.body.innerText`);
  console.log('Initial page text excerpt:', String(loadingPct).slice(0, 150));

  // Check if start/play button exists and click it
  await evalJs(`
    const btns = Array.from(document.querySelectorAll('button'));
    const playBtn = btns.find(b => b.textContent && (b.textContent.includes('JOGAR') || b.textContent.includes('Jogar') || b.textContent.includes('CORRE')));
    if (playBtn) playBtn.click();
  `);

  await sleep(3000);

  // Measure FPS over time and inspect Three.js scene
  const diagnostics = await evalJs(`
    (() => {
      const fpsEl = document.querySelector('[class*="font-mono text-[11px]"]') || document.body;
      const fpsText = fpsEl ? fpsEl.textContent : 'none';
      const canvas = document.querySelector('canvas');
      const webglInfo = {
        hasCanvas: !!canvas,
        width: canvas ? canvas.width : 0,
        height: canvas ? canvas.height : 0,
      };
      return { fpsText, webglInfo, url: window.location.href };
    })()
  `);
  console.log('Diagnostics:', diagnostics);

  // Take screenshot
  const screenshotData = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\lexke\\.gemini\antigravity\\scratch\\caramelo-run\\gameplay-test.png', Buffer.from(screenshotData.data, 'base64'));
  console.log('Screenshot saved to gameplay-test.png');

  ws.close();
  cleanup();
}

function cleanup() {
  try { child.kill(); } catch {}
  setTimeout(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }, 1000);
}

run().catch((err) => {
  console.error('Error during test:', err);
  cleanup();
});
