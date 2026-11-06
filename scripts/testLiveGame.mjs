import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDir = path.join(os.tmpdir(), 'chrome-runner-live-' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const child = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9558',
  `--user-data-dir=${tmpDir}`,
  '--disable-gpu-shader-disk-cache',
  '--window-size=1280,720',
  '--no-first-run',
  '--no-default-browser-check',
  'http://localhost:5173/?view=game'
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  await sleep(2500);

  const res = await fetch('http://127.0.0.1:9558/json');
  const tabs = await res.json();
  const pageTab = tabs.find((t) => t.type === 'page' && t.url.includes('5173'));

  if (!pageTab) {
    console.error('No page tab found!');
    cleanup();
    return;
  }

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
      const args = (data.params.args || []).map((a) => a.value || a.description || JSON.stringify(a)).join(' ');
      if (data.params.type === 'error' || args.includes('FPS') || args.includes('NaN')) {
        console.log(`[BROWSER ${data.params.type}]:`, args);
      }
    }
  };

  await new Promise((resolve) => { ws.onopen = resolve; });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Console.enable');

  console.log('--- 1. Esperando o jogo carregar 100% ---');
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const ready = await evalJs(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent && b.textContent.includes('COMEÇAR'));
        return !!btn;
      })()
    `);
    if (ready) {
      console.log('Jogo carregado! Botão COMEÇAR disponível.');
      break;
    }
  }

  async function evalJs(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return res.result?.value;
  }

  console.log('--- 2. Aceitando cookies e escolhendo MOTOBOY para iniciar corrida 3D ---');
  await evalJs(`
    (() => {
      // Aceita cookies
      const cookieBtn = Array.from(document.querySelectorAll('*')).find(b => b.textContent && b.textContent.includes('ACEITAR TODOS') && b.children.length === 0);
      if (cookieBtn) cookieBtn.click();

      // Clica em COMEÇAR
      const startBtn = Array.from(document.querySelectorAll('*')).find(b => b.textContent && b.textContent.includes('COMEÇAR') && b.children.length === 0);
      if (startBtn) startBtn.click();
    })()
  `);

  await sleep(1500);

  // Clica no cartão MOTOBOY (Desviar & Empinar)
  const clickedRole = await evalJs(`
    (() => {
      const cards = Array.from(document.querySelectorAll('div')).filter(d => d.textContent && d.textContent.includes('Fuga na CG 160 & Grau'));
      const motoboyCard = cards[cards.length - 1];
      if (motoboyCard) {
        motoboyCard.click();
        return true;
      }
      return false;
    })()
  `);
  console.log('Cartão Motoboy clicado:', clickedRole);

  console.log('Esperando o motoboy acelerar na pista...');
  await sleep(4000);

  // Função para ler o FPS atual do jogo
  async function sampleFps(seconds = 3) {
    const samples = [];
    for (let i = 0; i < seconds * 4; i++) {
      await sleep(250);
      const text = await evalJs(`
        (() => {
          const els = Array.from(document.querySelectorAll('*'));
          const el = els.find(e => e.textContent && e.textContent.includes('FPS') && e.textContent.length < 15);
          return el ? el.textContent.trim() : 'N/A';
        })()
      `);
      samples.push(text);
    }
    return samples;
  }

  console.log('--- 3. Medindo FPS no estado inicial ---');
  const initialFps = await sampleFps(3);
  console.log('Amostras de FPS (inicial):', initialFps);

  // Testar presets
  for (const preset of ['ultra', 'high', 'medium', 'low']) {
    console.log(`--- Testando Preset: ${preset.toUpperCase()} ---`);
    await evalJs(`
      (() => {
        // Tenta disparar updateGraphicsSetting ou clicar no botão de preset
        const btns = Array.from(document.querySelectorAll('button'));
        const pBtn = btns.find(b => b.textContent && b.textContent.toLowerCase().includes('${preset}'));
        if (pBtn) pBtn.click();
        else {
          // Se o menu estiver fechado, atualiza o localStorage e chama o evento
          try {
            const raw = localStorage.getItem('caramelorun_graphics_settings') || '{}';
            const s = JSON.parse(raw);
            s.preset = '${preset}';
            localStorage.setItem('caramelorun_graphics_settings', JSON.stringify(s));
          } catch(e) {}
        }
      })()
    `);
    await sleep(2000);
    const fpsSamples = await sampleFps(2);
    console.log(`FPS no preset ${preset}:`, fpsSamples);

    // Diagnósticos detalhados do Three.js
    const renderStats = await evalJs(`
      (() => {
        const canvas = document.querySelector('canvas');
        return {
          canvasW: canvas?.width,
          canvasH: canvas?.height,
          clientW: canvas?.clientWidth,
          clientH: canvas?.clientHeight,
          dpr: window.devicePixelRatio
        };
      })()
    `);
    console.log(`Render stats (${preset}):`, renderStats);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const shotPath = path.join(process.cwd(), `shot-${preset}.png`);
    fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
    console.log(`Salvo screenshot: ${shotPath}`);
  }

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
