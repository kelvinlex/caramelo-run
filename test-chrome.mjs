import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDir = path.join(os.tmpdir(), 'chrome-test-' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9555',
  `--user-data-dir=${tmpDir}`,
  '--disable-gpu-shader-disk-cache',
  '--no-first-run',
  '--no-default-browser-check',
  'http://localhost:5173'
]);

child.on('error', (err) => {
  console.error('Failed to start Chrome:', err);
});

setTimeout(async () => {
  try {
    const res = await fetch('http://127.0.0.1:9555/json');
    const tabs = await res.json();
    console.log('Tabs:', tabs);
  } catch (e) {
    console.error('Fetch error:', e.message);
  } finally {
    child.kill();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}, 3000);
