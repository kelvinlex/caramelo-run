import * as THREE from 'three';
import type { HouseVariationSpec } from './rules';

export type SkyPreset = 'sunset_dramatic' | 'tropical_morning' | 'violet_dusk';

const wallTextureCache = new Map<string, THREE.CanvasTexture>();
const roofTextureCache = new Map<string, THREE.CanvasTexture>();
const doorTextureCache = new Map<string, THREE.CanvasTexture>();
const windowTextureCache = new Map<string, THREE.CanvasTexture>();
const gateTextureCache = new Map<string, THREE.CanvasTexture>();
const buildingTextureCache = new Map<string, THREE.CanvasTexture>();
let brazilFlagTexCache: THREE.CanvasTexture | null = null;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function adjustColor(hex: string, delta: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r + delta)}, ${clamp(g + delta)}, ${clamp(b + delta)})`;
}

/**
 * Hand-painted wall texture with gouache brushstrokes, deep eave AO shadow,
 * lower plinth ("barriga/rodapé"), exposed clay bricks, and optional azulejo strip.
 */
export function getHandPaintedWallTexture(
  spec: HouseVariationSpec,
  isUpperStory = false,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const baseHex = isUpperStory && spec.upperWallColor ? spec.upperWallColor : spec.wallColor;
  const cacheKey = `${spec.id}_${isUpperStory ? 'upper' : 'lower'}_${baseHex}_v3`;
  const cached = wallTextureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 1. Rich warm vertical hand-painted plaster gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, adjustColor(baseHex, -36));
  grad.addColorStop(0.18, adjustColor(baseHex, 4));
  grad.addColorStop(0.68, adjustColor(baseHex, -8));
  grad.addColorStop(1, adjustColor(baseHex, -32));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // 2. Painterly gouache brush strokes across plaster
  let seed = spec.id * 97 + (isUpperStory ? 31 : 7);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 220; i++) {
    const bx = rand() * 512;
    const by = rand() * 410;
    const bw = 24 + rand() * 82;
    const bh = 7 + rand() * 20;
    const delta = (rand() - 0.52) * 38;
    ctx.fillStyle = adjustColor(baseHex, delta);
    ctx.globalAlpha = 0.34;
    ctx.beginPath();
    ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 4);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // 3. Pronounced Soft Top Eave Shadow (Soft Shading under roof overhang)
  const topShadow = ctx.createLinearGradient(0, 0, 0, 92);
  topShadow.addColorStop(0, 'rgba(32, 14, 5, 0.62)');
  topShadow.addColorStop(0.45, 'rgba(42, 18, 6, 0.26)');
  topShadow.addColorStop(1, 'rgba(42, 18, 6, 0.0)');
  ctx.fillStyle = topShadow;
  ctx.fillRect(0, 0, 512, 92);

  // 4. Optional Exposed Clay Brick Patches ("tijolinho aparente onde o reboco descascou")
  if (spec.hasExposedBrick && !isUpperStory) {
    const drawBrickPatch = (startX: number, startY: number, cols: number, rows: number) => {
      const brickW = 34;
      const brickH = 16;
      const gap = 3;
      ctx.fillStyle = adjustColor(baseHex, -58);
      ctx.beginPath();
      ctx.roundRect(
        startX - 6,
        startY - 6,
        cols * (brickW + gap) + 12,
        rows * (brickH + gap) + 12,
        6,
      );
      ctx.fill();

      ctx.fillStyle = '#8C735B';
      ctx.fillRect(startX - 2, startY - 2, cols * (brickW + gap) + 4, rows * (brickH + gap) + 4);

      for (let r = 0; r < rows; r++) {
        const rowCols = Math.max(1, cols - Math.floor(r * 0.45));
        for (let c = 0; c < rowCols; c++) {
          const offset = (r % 2) * (brickW * 0.45);
          const x = startX + c * (brickW + gap) + offset;
          const y = startY + (rows - 1 - r) * (brickH + gap);
          const tone = (rand() - 0.5) * 28;
          ctx.fillStyle = adjustColor('#B84A27', tone);
          ctx.beginPath();
          ctx.roundRect(x, y, brickW, brickH, 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255, 215, 180, 0.35)';
          ctx.fillRect(x + 2, y + 1, brickW - 4, 3);
        }
      }
    };

    drawBrickPatch(14, 308, 3, 5);
    drawBrickPatch(380, 338, 3, 4);
  }

  // 5. Optional Azulejo Decorated Strip
  if (spec.hasAzulejoStrip && !isUpperStory) {
    const stripY = 364;
    const tileSize = 32;
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(0, stripY, 512, tileSize);
    for (let x = 0; x < 512; x += tileSize) {
      ctx.strokeStyle = '#1E40AF';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, stripY + 1, tileSize - 2, tileSize - 2);
      ctx.fillStyle = '#1D4ED8';
      ctx.beginPath();
      ctx.moveTo(x + tileSize / 2, stripY + 4);
      ctx.lineTo(x + tileSize - 4, stripY + tileSize / 2);
      ctx.lineTo(x + tileSize / 2, stripY + tileSize - 4);
      ctx.lineTo(x + 4, stripY + tileSize / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#EAB308';
      ctx.beginPath();
      ctx.arc(x + tileSize / 2, stripY + tileSize / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 6. Lower Base Plinth ("Barriga / Rodapé Brasileiro")
  if (!isUpperStory) {
    const plinthY = 396;
    const plinthGrad = ctx.createLinearGradient(0, plinthY, 0, 512);
    plinthGrad.addColorStop(0, adjustColor(spec.basePlinthColor, 8));
    plinthGrad.addColorStop(0.2, spec.basePlinthColor);
    plinthGrad.addColorStop(1, adjustColor(spec.basePlinthColor, -36));
    ctx.fillStyle = plinthGrad;
    ctx.fillRect(0, plinthY, 512, 512 - plinthY);

    ctx.fillStyle = 'rgba(255, 245, 225, 0.42)';
    ctx.fillRect(0, plinthY, 512, 4);
    ctx.fillStyle = 'rgba(20, 12, 8, 0.38)';
    ctx.fillRect(0, plinthY - 4, 512, 4);

    for (let i = 0; i < 42; i++) {
      const wx = rand() * 512;
      const wy = plinthY + 12 + rand() * 92;
      ctx.fillStyle = adjustColor(spec.basePlinthColor, (rand() - 0.5) * 38);
      ctx.globalAlpha = 0.42;
      ctx.beginPath();
      ctx.roundRect(wx, wy, 18 + rand() * 40, 6 + rand() * 14, 3);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  // 7. Side corner framing AO shadows for stylized 3D chunkiness
  const leftEdge = ctx.createLinearGradient(0, 0, 42, 0);
  leftEdge.addColorStop(0, 'rgba(25, 12, 4, 0.42)');
  leftEdge.addColorStop(1, 'rgba(25, 12, 4, 0)');
  ctx.fillStyle = leftEdge;
  ctx.fillRect(0, 0, 42, 512);

  const rightEdge = ctx.createLinearGradient(470, 0, 512, 0);
  rightEdge.addColorStop(0, 'rgba(25, 12, 4, 0)');
  rightEdge.addColorStop(1, 'rgba(25, 12, 4, 0.42)');
  ctx.fillStyle = rightEdge;
  ctx.fillRect(470, 0, 42, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAnisotropy;
  wallTextureCache.set(cacheKey, tex);
  return tex;
}

/**
 * Hand-painted Brazilian clay roof tile texture ("Telha Colonial de Barro")
 */
export function getHandPaintedRoofTexture(
  roofColor: string,
  roofStyle: string,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const key = `${roofColor}_${roofStyle}_v2`;
  const cached = roofTextureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = roofColor;
  ctx.fillRect(0, 0, 256, 256);

  const cols = roofStyle === 'fiber_cement' ? 12 : 8;
  const rows = roofStyle === 'fiber_cement' ? 4 : 7;
  const colW = 256 / cols;
  const rowH = 256 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * colW;
      const y = r * rowH;

      const tileGrad = ctx.createLinearGradient(x, y, x + colW, y);
      tileGrad.addColorStop(0, adjustColor(roofColor, -52));
      tileGrad.addColorStop(0.28, adjustColor(roofColor, 22));
      tileGrad.addColorStop(0.62, adjustColor(roofColor, -6));
      tileGrad.addColorStop(1, adjustColor(roofColor, -58));
      ctx.fillStyle = tileGrad;
      ctx.fillRect(x, y, colW, rowH);

      if (roofStyle !== 'fiber_cement') {
        ctx.strokeStyle = adjustColor(roofColor, -68);
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(x + colW / 2, y + rowH - 4, colW * 0.46, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();

        ctx.strokeStyle = adjustColor(roofColor, 32);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(x + colW / 2, y + rowH - 6, colW * 0.42, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  roofTextureCache.set(key, tex);
  return tex;
}

/**
 * Hand-painted wooden/modern Brazilian door texture
 */
export function getHandPaintedDoorTexture(doorColor: string): THREE.CanvasTexture {
  const cached = doorTextureCache.get(doorColor);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = adjustColor(doorColor, -38);
  ctx.fillRect(0, 0, 128, 256);

  const leafGrad = ctx.createLinearGradient(10, 10, 118, 246);
  leafGrad.addColorStop(0, adjustColor(doorColor, 14));
  leafGrad.addColorStop(1, adjustColor(doorColor, -22));
  ctx.fillStyle = leafGrad;
  ctx.fillRect(10, 10, 108, 246);

  ctx.strokeStyle = adjustColor(doorColor, -45);
  ctx.lineWidth = 3;
  for (let x = 28; x <= 100; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 16);
    ctx.lineTo(x, 248);
    ctx.stroke();
  }

  ctx.strokeStyle = adjustColor(doorColor, 26);
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 24, 88, 92);
  ctx.strokeRect(20, 134, 88, 98);

  ctx.fillStyle = '#D4D4D8';
  ctx.beginPath();
  ctx.roundRect(96, 118, 10, 34, 3);
  ctx.fill();
  ctx.fillStyle = '#3F3F46';
  ctx.fillRect(99, 124, 4, 14);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  doorTextureCache.set(doorColor, tex);
  return tex;
}

/**
 * Hand-painted window texture (supports louvered 'veneziana' and iron-barred glass windows)
 */
export function getHandPaintedWindowTexture(
  windowColor: string,
  isLouvered: boolean,
  hasGrille: boolean,
): THREE.CanvasTexture {
  const key = `${windowColor}_${isLouvered}_${hasGrille}_v2`;
  const cached = windowTextureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = adjustColor(windowColor, -35);
  ctx.fillRect(0, 0, 256, 192);

  if (isLouvered) {
    ctx.fillStyle = adjustColor(windowColor, -8);
    ctx.fillRect(10, 10, 236, 172);

    const panels = 3;
    const pw = 224 / panels;
    for (let p = 0; p < panels; p++) {
      const px = 16 + p * pw;
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 3;
      ctx.strokeRect(px, 16, pw - 4, 160);

      for (let y = 22; y < 170; y += 9) {
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(px + 3, y, pw - 10, 4);
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(px + 3, y - 2, pw - 10, 2);
      }
    }
  } else {
    const glassGrad = ctx.createLinearGradient(0, 12, 256, 180);
    glassGrad.addColorStop(0, '#0F172A');
    glassGrad.addColorStop(0.45, '#1E293B');
    glassGrad.addColorStop(0.55, '#334155');
    glassGrad.addColorStop(1, '#090D16');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(12, 12, 232, 168);

    ctx.fillStyle = 'rgba(255, 240, 200, 0.22)';
    ctx.beginPath();
    ctx.moveTo(28, 180);
    ctx.lineTo(95, 12);
    ctx.lineTo(135, 12);
    ctx.lineTo(68, 180);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = windowColor;
    ctx.fillRect(124, 12, 8, 168);
    ctx.fillRect(12, 92, 232, 8);
  }

  if (hasGrille) {
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4.5;
    for (let x = 32; x < 230; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x, 184);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(8, 48);
    ctx.lineTo(248, 48);
    ctx.moveTo(8, 144);
    ctx.lineTo(248, 144);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  windowTextureCache.set(key, tex);
  return tex;
}

/**
 * Hand-painted Brazilian garage gate ("Portão Basculante com Grade Diagonal no Topo")
 */
export function getHandPaintedGarageGateTexture(gateColor: string): THREE.CanvasTexture {
  const cached = gateTextureCache.get(gateColor);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = adjustColor(gateColor, -28);
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#18181B';
  ctx.fillRect(12, 12, 232, 64);
  ctx.strokeStyle = adjustColor(gateColor, 22);
  ctx.lineWidth = 6;
  for (let x = -40; x < 280; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 76);
    ctx.lineTo(x + 48, 12);
    ctx.stroke();
  }

  ctx.fillStyle = gateColor;
  ctx.fillRect(12, 82, 232, 164);
  for (let x = 16; x < 240; x += 28) {
    ctx.fillStyle = adjustColor(gateColor, -22);
    ctx.fillRect(x, 86, 4, 156);
    ctx.fillStyle = adjustColor(gateColor, 18);
    ctx.fillRect(x + 4, 86, 3, 156);
  }

  ctx.fillStyle = adjustColor(gateColor, -34);
  ctx.fillRect(8, 76, 240, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  gateTextureCache.set(gateColor, tex);
  return tex;
}

/**
 * Weathered Brazilian Asphalt Street Texture with Cracks, Tar Patches & Worn Markings
 * ("Asfalto meio quebrado com rachaduras tipo Brasil")
 */
export function createStreetRoadTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 1. Sun-baked Brazilian asphalt base gradient
  const roadGrad = ctx.createLinearGradient(0, 0, 512, 0);
  roadGrad.addColorStop(0, '#242830');
  roadGrad.addColorStop(0.14, '#2F3540');
  roadGrad.addColorStop(0.5, '#39404D');
  roadGrad.addColorStop(0.86, '#2F3540');
  roadGrad.addColorStop(1, '#242830');
  ctx.fillStyle = roadGrad;
  ctx.fillRect(0, 0, 512, 512);

  let seed = 409;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // 2. Asphalt repair patches ("Remendos de recapeamento e piche brasileiro")
  const patches = [
    { x: 58, y: 70, w: 95, h: 120, color: '#22262E' },
    { x: 310, y: 190, w: 115, h: 140, color: '#272C35' },
    { x: 155, y: 340, w: 130, h: 110, color: '#2C313B' },
    { x: 365, y: 395, w: 88, h: 90, color: '#1F232A' },
    { x: 75, y: 245, w: 80, h: 75, color: '#424957' },
  ];
  for (const p of patches) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15, 18, 24, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // 3. Coarse aggregate & weathered asphalt grain
  for (let i = 0; i < 420; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(10,12,16,0.12)';
    ctx.fillRect(x, y, 4 + rand() * 14, 8 + rand() * 26);
  }

  // 4. Shallow eroded potholes / worn aggregate spots ("Desgaste e buraquinhos de rua brasileira")
  const wornSpots = [
    { x: 96, y: 142, rx: 22, ry: 14 },
    { x: 388, y: 110, rx: 26, ry: 16 },
    { x: 248, y: 286, rx: 19, ry: 13 },
    { x: 118, y: 438, rx: 25, ry: 15 },
    { x: 412, y: 342, rx: 20, ry: 12 },
  ];
  for (const ws of wornSpots) {
    ctx.fillStyle = '#525B6C';
    ctx.beginPath();
    ctx.ellipse(ws.x, ws.y, ws.rx + 4, ws.ry + 3, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1B1E24';
    ctx.beginPath();
    ctx.ellipse(ws.x, ws.y + 1, ws.rx, ws.ry, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#64748B';
    for (let s = 0; s < 7; s++) {
      ctx.fillRect(
        ws.x - ws.rx * 0.5 + rand() * ws.rx,
        ws.y - ws.ry * 0.5 + rand() * ws.ry,
        3,
        3,
      );
    }
  }

  // 5. Pronounced Jagged Branching Asphalt Cracks ("Rachaduras e trincas no asfalto")
  const drawCrackNetwork = (startX: number, startY: number, segments: number, dirY = 1) => {
    let cx = startX;
    let cy = startY;

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points: Array<{ x: number; y: number }> = [{ x: cx, y: cy }];
    for (let s = 0; s < segments; s++) {
      cx += (rand() - 0.48) * 34;
      cy += dirY * (14 + rand() * 22);
      points.push({ x: cx, y: cy });
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x + 1.5, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x + 1.5, points[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#0F1115';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    for (let i = 1; i < points.length - 1; i++) {
      if (rand() > 0.32) {
        const p = points[i];
        const bx = p.x + (rand() > 0.5 ? 1 : -1) * (16 + rand() * 32);
        const by = p.y + (rand() - 0.3) * 24;
        ctx.strokeStyle = '#111318';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo((p.x + bx) * 0.5 + (rand() - 0.5) * 8, (p.y + by) * 0.5);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }
  };

  drawCrackNetwork(82, 18, 9, 1);
  drawCrackNetwork(235, 40, 10, 1);
  drawCrackNetwork(410, 25, 9, 1);
  drawCrackNetwork(135, 240, 8, 1);
  drawCrackNetwork(330, 220, 9, 1);
  drawCrackNetwork(265, 310, 7, 1);
  drawCrackNetwork(65, 330, 7, 1);

  // 6. Trilhas longitudinais de pneu & juntas transversais de asfalto para forte sensação de velocidade na rua
  const laneCenters = [86, 256, 426];
  for (const lx of laneCenters) {
    ctx.fillStyle = 'rgba(15, 18, 24, 0.28)';
    ctx.fillRect(lx - 26, 0, 14, 512);
    ctx.fillRect(lx + 12, 0, 14, 512);
  }

  // Juntas de piche transversais sutis que passam rápido sob a moto
  ctx.fillStyle = 'rgba(12, 14, 19, 0.48)';
  ctx.fillRect(18, 126, 476, 4);
  ctx.fillRect(18, 382, 476, 4);
  ctx.fillStyle = 'rgba(203, 213, 225, 0.12)';
  ctx.fillRect(18, 130, 476, 2);
  ctx.fillRect(18, 386, 476, 2);

  // Faixas amarelas duplas/laterais vivas junto ao meio-fio
  ctx.fillStyle = '#111827';
  ctx.fillRect(11, 0, 14, 512);
  ctx.fillRect(487, 0, 14, 512);
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(13, 0, 10, 512);
  ctx.fillRect(489, 0, 10, 512);

  // 7. Faixas Brancas Tracejadas de Alto Contraste separando as 3 ruas (8 faixas por ciclo para leitura veloz!)
  const lane1X = Math.round(512 * 0.34);
  const lane2X = Math.round(512 * 0.66);
  for (let y = 8; y < 512; y += 64) {
    // Contorno escuro estilo cartoon na pintura de solo
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(lane1X - 8, y - 2, 16, 38, 5);
    ctx.roundRect(lane2X - 8, y - 2, 16, 38, 5);
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(lane1X - 6, y, 12, 34, 4);
    ctx.roundRect(lane2X - 6, y, 12, 34, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(51, 57, 69, 0.55)';
    ctx.fillRect(lane1X - 6, y + 15, 12, 2.5);
    ctx.fillRect(lane2X - 6, y + 22, 12, 2.5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 10);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Grayscale bump map matching the cracked Brazilian asphalt for 3D micro-relief
 */
export function createStreetRoadBumpTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  let seed = 409;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 360; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#989898' : '#646464';
    ctx.fillRect(rand() * 256, rand() * 256, 3 + rand() * 6, 4 + rand() * 10);
  }

  ctx.strokeStyle = '#181818';
  ctx.lineWidth = 2.4;
  for (let c = 0; c < 8; c++) {
    let x = 25 + rand() * 206;
    let y = rand() * 180;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (rand() - 0.5) * 24;
      y += 12 + rand() * 16;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 10);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Brazilian sidewalk texture ("Calçada de Concreto e Pedra Portuguesa com Meio-Fio Caiado")
 */
export function createSidewalkTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(0, 0, 256, 256);

  const slabSize = 64;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const tone = ((r * 3 + c * 5) % 3 - 1) * 14;
      ctx.fillStyle = adjustColor('#BDC8D6', tone);
      ctx.fillRect(c * slabSize + 2, r * slabSize + 2, slabSize - 4, slabSize - 4);
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 3;
      ctx.strokeRect(c * slabSize, r * slabSize, slabSize, slabSize);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 12);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * High-detail Brazilian Flag ("Bandeira do Brasil") texture for the green-detailed Rio building
 */
export function createBrazilFlagTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (brazilFlagTexCache) return brazilFlagTexCache;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 360;
  const ctx = canvas.getContext('2d')!;

  const greenGrad = ctx.createLinearGradient(0, 0, 512, 360);
  greenGrad.addColorStop(0, '#009B3A');
  greenGrad.addColorStop(0.5, '#00A843');
  greenGrad.addColorStop(1, '#007A2E');
  ctx.fillStyle = greenGrad;
  ctx.fillRect(0, 0, 512, 360);

  for (let x = 0; x < 512; x += 64) {
    const waveGrad = ctx.createLinearGradient(x, 0, x + 64, 0);
    waveGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
    waveGrad.addColorStop(0.5, 'rgba(0,0,0,0.08)');
    waveGrad.addColorStop(1, 'rgba(255,255,255,0.06)');
    ctx.fillStyle = waveGrad;
    ctx.fillRect(x, 0, 64, 360);
  }

  ctx.fillStyle = '#FEDF00';
  ctx.beginPath();
  ctx.moveTo(256, 34);
  ctx.lineTo(468, 180);
  ctx.lineTo(256, 326);
  ctx.lineTo(44, 180);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#EAB308';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(256, 180, 92, 0, Math.PI * 2);
  ctx.closePath();
  const blueGrad = ctx.createRadialGradient(236, 155, 12, 256, 180, 92);
  blueGrad.addColorStop(0, '#0038A8');
  blueGrad.addColorStop(1, '#002776');
  ctx.fillStyle = blueGrad;
  ctx.fill();
  ctx.clip();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(215, 295, 165, -Math.PI * 0.68, -Math.PI * 0.14);
  ctx.stroke();

  ctx.strokeStyle = '#009B3A';
  ctx.lineWidth = 4;
  ctx.setLineDash([7, 4]);
  ctx.beginPath();
  ctx.arc(215, 295, 165, -Math.PI * 0.62, -Math.PI * 0.2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#FFFFFF';
  const stars = [
    { x: 256, y: 205, r: 4.2 },
    { x: 256, y: 232, r: 4.5 },
    { x: 238, y: 216, r: 4.0 },
    { x: 274, y: 214, r: 4.0 },
    { x: 266, y: 222, r: 2.8 },
    { x: 205, y: 198, r: 3.8 },
    { x: 218, y: 228, r: 3.5 },
    { x: 302, y: 202, r: 4.2 },
    { x: 318, y: 225, r: 3.6 },
    { x: 288, y: 246, r: 3.8 },
    { x: 228, y: 250, r: 3.4 },
    { x: 282, y: 145, r: 4.2 },
  ];
  for (const st of stars) {
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  brazilFlagTexCache = tex;
  return tex;
}

/**
 * Hand-Painted Cartoon / Cel-Shaded Rio de Janeiro Building Facade Texture
 * ("deixe os predios pouco mais cartom" + non-flickering LinearFilter sampling)
 */
export function getRioBuildingFacadeTexture(
  paletteKey: 'brasil_green' | 'copacabana_wave' | 'art_deco_historic' | 'ipanema_modern',
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const cached = buildingTextureCache.get(paletteKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const drawCartoonWindow = (
    wx: number,
    wy: number,
    ww: number,
    wh: number,
    isLit: boolean,
    glassTop: string,
    glassBot: string,
  ) => {
    // Bold cartoon ink outline around window frame
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);

    // Light cartoon sill & frame trim
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);

    // Cel-shaded cartoon glass fill
    const g = ctx.createLinearGradient(wx, wy, wx, wy + wh);
    if (isLit) {
      g.addColorStop(0, '#FEF08A');
      g.addColorStop(1, '#FACC15');
    } else {
      g.addColorStop(0, glassTop);
      g.addColorStop(1, glassBot);
    }
    ctx.fillStyle = g;
    ctx.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);

    // Bold diagonal cartoon cel-shading specular slash
    ctx.fillStyle = isLit ? 'rgba(255,255,255,0.65)' : 'rgba(224,242,254,0.58)';
    ctx.beginPath();
    ctx.moveTo(wx + 3, wy + 2);
    ctx.lineTo(wx + Math.min(ww - 3, 18), wy + 2);
    ctx.lineTo(wx + 7, wy + wh - 2);
    ctx.lineTo(wx + 3, wy + wh - 2);
    ctx.closePath();
    ctx.fill();

    // Clean cartoon center cross mullion
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(wx + Math.floor(ww / 2) - 1, wy + 1, 2, wh - 2);
  };

  if (paletteKey === 'brasil_green') {
    // Vibrant Cartoon Brasil Green & Canary Yellow Skyscraper
    ctx.fillStyle = '#10B981';
    ctx.fillRect(0, 0, 256, 512);

    // Cartoon side & center pilasters with dark ink borders
    ctx.fillStyle = '#059669';
    ctx.fillRect(0, 0, 22, 512);
    ctx.fillRect(234, 0, 22, 512);
    ctx.fillRect(118, 0, 20, 512);

    ctx.fillStyle = '#FACC15';
    ctx.fillRect(18, 0, 6, 512);
    ctx.fillRect(232, 0, 6, 512);
    ctx.fillRect(115, 0, 5, 512);
    ctx.fillRect(136, 0, 5, 512);

    const floors = 8;
    const floorH = 512 / floors;
    for (let f = 0; f < floors; f++) {
      const y = f * floorH;
      // Cartoon horizontal spandrel band with dark ink outline
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, y, 256, 4);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(20, y + 4, 216, 7);
      ctx.fillStyle = '#047857';
      ctx.fillRect(20, y + 11, 216, 4);

      // 4 bold cartoon windows per floor (2 on left wing, 2 on right wing)
      const bayXList = [32, 74, 148, 190];
      for (let w = 0; w < bayXList.length; w++) {
        const isLit = (f * 3 + w * 2) % 5 === 0;
        drawCartoonWindow(bayXList[w], y + 20, 32, floorH - 27, isLit, '#38BDF8', '#0284C7');
      }
    }
  } else if (paletteKey === 'copacabana_wave') {
    // Stylized Cartoon Coastal Mint & Cream Building
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, 256, 512);

    ctx.fillStyle = '#BAE6FD';
    ctx.fillRect(14, 0, 228, 512);

    const floors = 8;
    const floorH = 512 / floors;
    for (let f = 0; f < floors; f++) {
      const y = f * floorH;
      // Cartoon balcony slab with dark outline
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, y, 256, 4);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(4, y + 4, 248, 10);
      ctx.fillStyle = '#2DD4BF';
      ctx.fillRect(8, y + 14, 240, 6);

      for (let w = 0; w < 3; w++) {
        const wx = 26 + w * 74;
        const isLit = (f + w) % 4 === 0;
        drawCartoonWindow(wx, y + 25, 56, floorH - 32, isLit, '#0EA5E9', '#0369A1');
      }
    }
  } else if (paletteKey === 'art_deco_historic') {
    // Warm Cartoon Pastel Ochre / Sunlit Mustard Building
    ctx.fillStyle = '#FDE68A';
    ctx.fillRect(0, 0, 256, 512);

    ctx.fillStyle = '#F59E0B';
    for (let px = 0; px < 256; px += 80) {
      ctx.fillRect(px, 0, 16, 512);
    }

    const floors = 8;
    const floorH = 512 / floors;
    for (let f = 0; f < floors; f++) {
      const y = f * floorH;
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, y, 256, 4);
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(0, y + 4, 256, 8);

      for (let c = 0; c < 3; c++) {
        const wx = 24 + c * 80;
        const isWarmLit = (f + c) % 3 === 0;
        drawCartoonWindow(wx, y + 18, 46, floorH - 26, isWarmLit, '#38BDF8', '#0284C7');
      }
    }
  } else {
    // Soft Cartoon Coral-Pink & Sky-Blue Modern Building
    ctx.fillStyle = '#FECDD3';
    ctx.fillRect(0, 0, 256, 512);

    ctx.fillStyle = '#FB7185';
    ctx.fillRect(0, 0, 18, 512);
    ctx.fillRect(238, 0, 18, 512);

    const floors = 8;
    const floorH = 512 / floors;
    for (let f = 0; f < floors; f++) {
      const y = f * floorH;
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, y, 256, 4);
      ctx.fillStyle = '#FFF1F2';
      ctx.fillRect(18, y + 4, 220, 8);

      for (let w = 0; w < 3; w++) {
        const wx = 30 + w * 70;
        const isLit = (f * 2 + w) % 4 === 1;
        drawCartoonWindow(wx, y + 18, 52, floorH - 25, isLit, '#38BDF8', '#0284C7');
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  // Disable mipmap ringing on distant cartoon lines to prevent any texture shimmering/flicker!
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  buildingTextureCache.set(paletteKey, tex);
  return tex;
}

/**
 * Vibrant, Luminous Hand-Painted Cartoon Sky Dome Texture (2048x1024)
 */
export function createPainterlySkyTexture(
  preset: SkyPreset = 'sunset_dramatic',
): THREE.CanvasTexture {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  if (preset === 'sunset_dramatic') {
    skyGrad.addColorStop(0.0, '#7C2D12');
    skyGrad.addColorStop(0.14, '#9A3412');
    skyGrad.addColorStop(0.26, '#C2410C');
    skyGrad.addColorStop(0.36, '#EA580C');
    skyGrad.addColorStop(0.45, '#F97316');
    skyGrad.addColorStop(0.52, '#FB923C');
    skyGrad.addColorStop(0.58, '#FBBF24');
    skyGrad.addColorStop(0.66, '#FEF08A');
    skyGrad.addColorStop(1.0, '#FDBA74');
  } else if (preset === 'tropical_morning') {
    skyGrad.addColorStop(0.0, '#0B3B9E');
    skyGrad.addColorStop(0.16, '#1456C8');
    skyGrad.addColorStop(0.30, '#1D74E8');
    skyGrad.addColorStop(0.42, '#2998F6');
    skyGrad.addColorStop(0.50, '#4FC3F7');
    skyGrad.addColorStop(0.56, '#A7E8FF');
    skyGrad.addColorStop(0.65, '#FFF3D1');
    skyGrad.addColorStop(1.0, '#A7E8FF');
  } else {
    skyGrad.addColorStop(0.0, '#020617');
    skyGrad.addColorStop(0.16, '#070B19');
    skyGrad.addColorStop(0.30, '#0F172A');
    skyGrad.addColorStop(0.42, '#1E1B4B');
    skyGrad.addColorStop(0.50, '#1E3A8A');
    skyGrad.addColorStop(0.57, '#1D4ED8');
    skyGrad.addColorStop(0.64, '#0284C7');
    skyGrad.addColorStop(1.0, '#0F172A');
  }

  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const cloudPanoramaCache = new Map<SkyPreset, THREE.CanvasTexture>();

/**
 * High-Resolution 2048x1024 Painterly Fluid-Brushstroke Cloud Panorama Texture
 * (Used on BOTH Mapa 1 Favela and Mapa 2 Praia!)
 */
export function createPainterlyCloudPanoramaTexture(
  preset: SkyPreset = 'tropical_morning',
): THREE.CanvasTexture {
  const cached = cloudPanoramaCache.get(preset);
  if (cached) return cached;

  const W = 2048;
  const H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  const pal =
    preset === 'tropical_morning'
      ? {
          deepCobalt: '#2B50AA',
          periwinkleShadow: '#4C6EF5',
          cornflowerMid: '#748FFC',
          lavenderMid: '#B1C2FF',
          warmRoseBlush: '#EDE9FE',
          creamHighlight: '#FFFDF9',
          pureWhite: '#FFFFFF',
          skyStreak: '#60A5FA',
          overallAlpha: 0.96,
        }
      : preset === 'sunset_dramatic'
        ? {
            deepCobalt: '#7C2D12',
            periwinkleShadow: '#9A3412',
            cornflowerMid: '#EA580C',
            lavenderMid: '#FB923C',
            warmRoseBlush: '#FED7AA',
            creamHighlight: '#FEF08A',
            pureWhite: '#FFFBEB',
            skyStreak: '#FDBA74',
            overallAlpha: 0.92,
          }
        : {
            deepCobalt: '#090D16',
            periwinkleShadow: '#1E293B',
            cornflowerMid: '#334155',
            lavenderMid: '#475569',
            warmRoseBlush: '#94A3B8',
            creamHighlight: '#BAE6FD',
            pureWhite: '#E0F2FE',
            skyStreak: '#38BDF8',
            overallAlpha: 0.42,
          };

  let seed = 8862;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const drawFluidRibbonStroke = (
    cx: number,
    cy: number,
    len: number,
    thick: number,
    angle: number,
    color: string,
    alpha: number,
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * pal.overallAlpha;
    ctx.beginPath();
    ctx.moveTo(-len * 0.5, 0);
    ctx.bezierCurveTo(-len * 0.18, -thick, len * 0.22, -thick * 0.65, len * 0.5, 0);
    ctx.bezierCurveTo(len * 0.22, thick * 0.75, -len * 0.18, thick * 0.95, -len * 0.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawSculptedGouachePuff = (
    px: number,
    py: number,
    rx: number,
    ry: number,
    rot: number,
    lightAngle: number,
    tier: 'base_shadow' | 'mid_billow' | 'sunlit_crown',
  ) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);

    ctx.fillStyle =
      tier === 'base_shadow'
        ? pal.periwinkleShadow
        : tier === 'mid_billow'
          ? pal.cornflowerMid
          : pal.lavenderMid;
    ctx.globalAlpha = (tier === 'base_shadow' ? 0.82 : 0.88) * pal.overallAlpha;
    ctx.beginPath();
    ctx.ellipse(0, ry * 0.12, rx, ry * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();

    if (tier === 'base_shadow' || tier === 'mid_billow') {
      ctx.fillStyle = tier === 'base_shadow' ? pal.deepCobalt : pal.periwinkleShadow;
      ctx.globalAlpha = 0.68 * pal.overallAlpha;
      ctx.beginPath();
      ctx.ellipse(-rx * 0.08, ry * 0.28, rx * 0.86, ry * 0.64, 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    if (tier !== 'base_shadow') {
      const lx = Math.cos(lightAngle) * rx * 0.14;
      const ly = Math.sin(lightAngle) * ry * 0.18;
      ctx.fillStyle = tier === 'sunlit_crown' ? pal.warmRoseBlush : pal.lavenderMid;
      ctx.globalAlpha = 0.92 * pal.overallAlpha;
      ctx.beginPath();
      ctx.ellipse(lx, ly - ry * 0.08, rx * 0.88, ry * 0.82, -0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    if (tier === 'sunlit_crown' || (tier === 'mid_billow' && rand() > 0.35)) {
      const lx = Math.cos(lightAngle) * rx * 0.2;
      const ly = Math.sin(lightAngle) * ry * 0.26;
      ctx.fillStyle = tier === 'sunlit_crown' ? pal.pureWhite : pal.creamHighlight;
      ctx.globalAlpha = (tier === 'sunlit_crown' ? 0.98 : 0.86) * pal.overallAlpha;
      ctx.beginPath();
      ctx.ellipse(lx, ly - ry * 0.18, rx * 0.82, ry * 0.74, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  for (let i = 0; i < 24; i++) {
    const sx = 250 + rand() * 1550;
    const sy = 60 + rand() * 280;
    drawFluidRibbonStroke(
      sx,
      sy,
      180 + rand() * 320,
      7 + rand() * 14,
      -0.22 + (rand() - 0.5) * 0.08,
      pal.skyStreak,
      0.24 + rand() * 0.16,
    );
  }

  const midSkyRibbons = [
    { x: 760, y: 540, w: 340, h: 65, angle: -0.05 },
    { x: 1040, y: 475, w: 390, h: 72, angle: 0.04 },
    { x: 1290, y: 560, w: 360, h: 62, angle: -0.03 },
    { x: 920, y: 635, w: 460, h: 52, angle: 0.02 },
  ];
  for (const rib of midSkyRibbons) {
    drawFluidRibbonStroke(rib.x, rib.y + 18, rib.w * 0.95, rib.h * 0.55, rib.angle, pal.periwinkleShadow, 0.72);
    drawFluidRibbonStroke(rib.x - 10, rib.y + 6, rib.w, rib.h * 0.62, rib.angle, pal.lavenderMid, 0.85);
    drawFluidRibbonStroke(rib.x - 18, rib.y - 8, rib.w * 0.92, rib.h * 0.52, rib.angle, pal.pureWhite, 0.95);
  }

  const paintCumulusTowerBank = (
    centerX: number,
    baseY: number,
    spanW: number,
    towerH: number,
    lightDirX: number,
    slopeDir: number,
  ) => {
    const lightAngle = Math.atan2(-1.0, lightDirX);

    const baseCount = 14;
    for (let i = 0; i < baseCount; i++) {
      const t = i / (baseCount - 1);
      const px = centerX + (t - 0.5) * spanW * 0.92;
      const py = baseY + 22 - Math.sin(t * Math.PI) * 38 + (rand() - 0.5) * 20;
      const rx = 58 + rand() * 42;
      const ry = 40 + rand() * 28;
      drawSculptedGouachePuff(px, py, rx, ry, (rand() - 0.5) * 0.3, lightAngle, 'base_shadow');
    }

    const midCount = 18;
    for (let i = 0; i < midCount; i++) {
      const t = i / (midCount - 1);
      const arch = Math.sin(t * Math.PI);
      const px = centerX + (t - 0.5) * spanW * 0.88;
      const py = baseY - arch * towerH * 0.52 + (rand() - 0.5) * 28;
      const rx = 54 + rand() * 40;
      const ry = 44 + rand() * 32;
      drawSculptedGouachePuff(
        px,
        py,
        rx,
        ry,
        (rand() - 0.5) * 0.38,
        lightAngle,
        i % 3 === 0 ? 'sunlit_crown' : 'mid_billow',
      );
    }

    const peakCount = 16;
    for (let i = 0; i < peakCount; i++) {
      const t = i / (peakCount - 1);
      const arch = Math.pow(Math.sin(t * Math.PI), 1.25);
      const asym = 1.0 + slopeDir * (t - 0.5) * 0.58;
      const px = centerX + (t - 0.5) * spanW * 0.78;
      const py = baseY - arch * asym * towerH + (rand() - 0.5) * 24;
      const rx = 52 + arch * 48 + rand() * 22;
      const ry = 46 + arch * 44 + rand() * 22;
      drawSculptedGouachePuff(px, py, rx, ry, (rand() - 0.5) * 0.32, lightAngle, 'sunlit_crown');
    }

    for (let w = 0; w < 10; w++) {
      const t = (w + 0.5) / 10;
      const wx = centerX + (t - 0.5) * spanW * 0.82;
      const wy = baseY - Math.sin(t * Math.PI) * towerH * (0.38 + rand() * 0.45);
      drawFluidRibbonStroke(
        wx,
        wy,
        105 + rand() * 140,
        9 + rand() * 13,
        (rand() - 0.5) * 0.16,
        w % 2 === 0 ? pal.pureWhite : pal.warmRoseBlush,
        0.92,
      );
    }
  };

  paintCumulusTowerBank(740, 565, 390, 235, 0.6, -0.35);
  paintCumulusTowerBank(1310, 550, 410, 250, -0.6, 0.4);
  paintCumulusTowerBank(420, 595, 480, 380, 0.75, -0.5);
  paintCumulusTowerBank(1620, 585, 490, 395, -0.75, 0.5);

  ctx.globalCompositeOperation = 'destination-in';
  const vMaskGrad = ctx.createLinearGradient(0, 0, 0, H);
  vMaskGrad.addColorStop(0.0, 'rgba(255,255,255,0.95)');
  vMaskGrad.addColorStop(0.62, 'rgba(255,255,255,0.98)');
  vMaskGrad.addColorStop(0.84, 'rgba(255,255,255,0.35)');
  vMaskGrad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = vMaskGrad;
  ctx.fillRect(0, 0, W, H);

  const hMaskGrad = ctx.createLinearGradient(0, 0, W, 0);
  hMaskGrad.addColorStop(0.0, 'rgba(255,255,255,0.0)');
  hMaskGrad.addColorStop(0.07, 'rgba(255,255,255,1.0)');
  hMaskGrad.addColorStop(0.93, 'rgba(255,255,255,1.0)');
  hMaskGrad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = hMaskGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cloudPanoramaCache.set(preset, tex);
  return tex;
}

/**
 * Unused legacy stub kept for module compatibility
 */
export function createPerspectiveCloudDeckTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBrushCloudSpriteTexture(_variant = 0): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const favelaTexCache = new Map<string, THREE.CanvasTexture>();

/**
 * Hand-Painted Cartoon + Thin Black Outlines Favela Facade Texture (256x256)
 * Directly inspired by Reference Images 2 & 3:
 * - Soft, harmonious hand-painted gouache tones (terracotta brick, ochre, dusty rose, mint, powder blue, cream)
 * - Thin black cartoon outlines (#1E1B18) around bricks, windows, shutters, concrete beams, and murals
 * - Varied window layouts & optional Brazilian street-art murals so favela houses never look repetitive
 */
export function getFavelaHouseTexture(
  wallHex: string,
  trimHex: string,
  isBrick = false,
  maxAnisotropy = 4,
  styleSeed = 0,
): THREE.CanvasTexture {
  const layoutVariant = ((styleSeed % 5) + 5) % 5;
  const key = `${wallHex}_${trimHex}_${isBrick ? 'b' : 'p'}_${layoutVariant}_v4`;
  const cached = favelaTexCache.get(key);
  if (cached) return cached;

  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  // 1. Soft hand-painted gouache base wall gradient
  const baseGrad = ctx.createLinearGradient(0, 0, 0, S);
  baseGrad.addColorStop(0, adjustColor(wallHex, 8));
  baseGrad.addColorStop(0.55, wallHex);
  baseGrad.addColorStop(1, adjustColor(wallHex, -22));
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, S, S);

  let seed = styleSeed * 131 + (isBrick ? 19 : 7);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // Discrete hand-painted brush strokes across the facade
  for (let i = 0; i < 55; i++) {
    const bx = rand() * S;
    const by = rand() * S;
    const bw = 24 + rand() * 56;
    const bh = 6 + rand() * 14;
    ctx.fillStyle = adjustColor(wallHex, (rand() - 0.5) * 24);
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 3);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  if (isBrick) {
    // Illustrated Brazilian 8-hole clay brick pattern ("tijolinho baiano") with thin dark cartoon lines
    const rowH = 18;
    const colW = 36;
    for (let y = 10; y < S - 12; y += rowH) {
      const rowIdx = Math.floor(y / rowH);
      const xOffset = (rowIdx % 2) * (colW * 0.5);
      for (let x = -xOffset; x < S; x += colW) {
        const tone = ((rowIdx * 7 + Math.floor(x / colW) * 3) % 5 - 2) * 8;
        ctx.fillStyle = adjustColor(wallHex, tone);
        ctx.fillRect(x + 1, y + 1, colW - 2, rowH - 2);
        // Subtle vertical clay-brick rib lines (like Reference Image 2)
        ctx.strokeStyle = 'rgba(30, 27, 24, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + colW * 0.33, y + 2);
        ctx.lineTo(x + colW * 0.33, y + rowH - 2);
        ctx.moveTo(x + colW * 0.66, y + 2);
        ctx.lineTo(x + colW * 0.66, y + rowH - 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(30, 27, 24, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
    }
  } else if (layoutVariant === 2 || layoutVariant === 4) {
    // Exposed brick patch in the corner of a painted plaster house (Reference Image 3 left)
    const patchX = layoutVariant === 2 ? 14 : 168;
    const patchY = 148;
    ctx.fillStyle = '#C86446';
    ctx.beginPath();
    ctx.roundRect(patchX, patchY, 68, 42, 4);
    ctx.fill();
    ctx.strokeStyle = '#1E1B18';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    for (let py = patchY + 14; py < patchY + 40; py += 14) {
      ctx.beginPath();
      ctx.moveTo(patchX, py);
      ctx.lineTo(patchX + 68, py);
      ctx.stroke();
    }
  }

  // 2. Painted top eave drop-shadow & mid-story concrete slab ("viga/laje de concreto")
  ctx.fillStyle = 'rgba(30, 20, 15, 0.26)';
  ctx.fillRect(0, 0, S, 22);
  ctx.fillRect(0, 128, S, 14);

  // Concrete structural columns & mid-beam with thin black outline
  ctx.fillStyle = trimHex;
  ctx.fillRect(0, 0, S, 10);
  ctx.fillRect(0, 120, S, 10);
  ctx.fillRect(0, S - 14, S, 14);

  ctx.strokeStyle = '#1E1B18';
  ctx.lineWidth = 2.2;
  ctx.strokeRect(1, 1, S - 2, S - 2);
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(S, 10);
  ctx.moveTo(0, 120);
  ctx.lineTo(S, 120);
  ctx.moveTo(0, 130);
  ctx.lineTo(S, 130);
  ctx.moveTo(0, S - 14);
  ctx.lineTo(S, S - 14);
  ctx.stroke();

  // Helper to draw an illustrated cartoon window with thin black outline & painted shadow
  const drawCartoonWindow = (
    wx: number,
    wy: number,
    ww: number,
    wh: number,
    hasShutters: boolean,
    isWarmLit: boolean,
  ) => {
    // Painted drop shadow under window sill
    ctx.fillStyle = 'rgba(24, 18, 15, 0.28)';
    ctx.fillRect(wx - 3, wy + wh + 2, ww + 6, 7);

    // Outer frame
    ctx.fillStyle = trimHex;
    ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
    ctx.strokeStyle = '#1E1B18';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(wx - 4, wy - 4, ww + 8, wh + 8);

    // Optional open wooden/turquoise shutters on sides
    if (hasShutters) {
      const shW = 12;
      ctx.fillStyle = '#38A3A5';
      ctx.fillRect(wx - 4 - shW, wy - 2, shW, wh + 4);
      ctx.fillRect(wx + ww + 4, wy - 2, shW, wh + 4);
      ctx.strokeRect(wx - 4 - shW, wy - 2, shW, wh + 4);
      ctx.strokeRect(wx + ww + 4, wy - 2, shW, wh + 4);
    }

    // Window pane interior
    ctx.fillStyle = isWarmLit ? '#F6D58E' : '#2B3A4A';
    ctx.fillRect(wx, wy, ww, wh);

    // Diagonal cartoon glass reflection
    ctx.fillStyle = isWarmLit ? 'rgba(255, 250, 220, 0.55)' : 'rgba(142, 202, 230, 0.35)';
    ctx.beginPath();
    ctx.moveTo(wx + 3, wy + 3);
    ctx.lineTo(wx + ww * 0.48, wy + 3);
    ctx.lineTo(wx + ww * 0.22, wy + wh - 3);
    ctx.lineTo(wx + 3, wy + wh - 3);
    ctx.closePath();
    ctx.fill();

    // Thin black window muntin bars (crossbars)
    ctx.strokeStyle = '#1E1B18';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2);
    ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();
  };

  // 3. Asymmetric Cartoon Window & Mural Layouts per variant
  if (layoutVariant === 0) {
    drawCartoonWindow(28, 36, 66, 52, true, false);
    drawCartoonWindow(154, 42, 62, 46, false, true);
    drawCartoonWindow(34, 152, 72, 54, false, false);
    drawCartoonWindow(152, 156, 58, 48, true, false);
  } else if (layoutVariant === 1) {
    // Wide multi-pane favela window + small ventilation window + lower door
    drawCartoonWindow(26, 34, 112, 54, false, false);
    drawCartoonWindow(172, 40, 48, 36, false, true);
    drawCartoonWindow(142, 154, 78, 52, true, false);
    // Illustrated blue favela door on lower left (like Reference Image 2)
    ctx.fillStyle = '#4EA8DE';
    ctx.fillRect(34, 148, 52, 94);
    ctx.strokeStyle = '#1E1B18';
    ctx.lineWidth = 2.4;
    ctx.strokeRect(34, 148, 52, 94);
  } else if (layoutVariant === 2) {
    // Artistic Brazilian favela geometric mural on upper half + asymmetric windows (Reference Image 2)
    ctx.fillStyle = '#E76F51';
    ctx.beginPath();
    ctx.arc(190, 66, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1E1B18';
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.fillStyle = '#E9C46A';
    ctx.beginPath();
    ctx.arc(190, 66, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    drawCartoonWindow(30, 38, 84, 52, true, false);
    drawCartoonWindow(98, 152, 96, 54, false, true);
  } else if (layoutVariant === 3) {
    // Corrugated turquoise sheet panel + asymmetric windows (Reference Image 2 right)
    ctx.fillStyle = '#72B5C4';
    ctx.fillRect(16, 134, 224, 28);
    ctx.strokeStyle = '#1E1B18';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(16, 134, 224, 28);
    for (let cx = 28; cx < 236; cx += 12) {
      ctx.beginPath();
      ctx.moveTo(cx, 134);
      ctx.lineTo(cx, 162);
      ctx.stroke();
    }
    drawCartoonWindow(32, 36, 68, 50, false, false);
    drawCartoonWindow(146, 36, 72, 50, false, false);
    drawCartoonWindow(42, 174, 68, 46, true, true);
    drawCartoonWindow(152, 174, 64, 46, false, false);
  } else {
    // Staggered stairwell windows & small graffiti tag line
    drawCartoonWindow(28, 32, 64, 48, false, true);
    drawCartoonWindow(142, 52, 74, 48, true, false);
    drawCartoonWindow(32, 150, 82, 52, false, false);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  favelaTexCache.set(key, tex);
  return tex;
}

const billboardTexCache = new Map<number, THREE.CanvasTexture>();

/**
 * Creates a High-Impact Cartoon Brazilian Roadside Billboard ("Outdoor") Texture (512x256)
 * reading "SEU ANÚNCIO AQUI" in the exact graphic style of the attached reference image
 * (white/silver canvas, purple & black diagonal speed bursts, purple crown, paw prints,
 * illustrated Caramelo mascot emblem, and 3D-extruded cartoon block typography).
 */
export function createBillboardAdTexture(
  variant = 0,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const v = ((variant % 3) + 3) % 3;
  const cached = billboardTexCache.get(v);
  if (cached) return cached;

  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 1. Bright White-Silver Diagonal Studio Backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#F8FAFC');
  bgGrad.addColorStop(0.5, '#FFFFFF');
  bgGrad.addColorStop(1, '#E2E8F0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle diagonal speed-line sheen across white background
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
  ctx.lineWidth = 6;
  for (let i = -100; i < W + 100; i += 44) {
    ctx.beginPath();
    ctx.moveTo(i, H);
    ctx.lineTo(i + 150, 0);
    ctx.stroke();
  }

  // 2. Dynamic Purple/Blue/Orange & Black Comic Speed Spikes in the Corners
  const accentPrimary = v === 0 ? '#7E22CE' : v === 1 ? '#1D4ED8' : '#EA580C';
  const accentBright = v === 0 ? '#A855F7' : v === 1 ? '#38BDF8' : '#FACC15';

  const drawCornerSpikes = () => {
    // Top-left spikes
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(145, 0);
    ctx.lineTo(28, 42);
    ctx.lineTo(95, 38);
    ctx.lineTo(0, 82);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accentPrimary;
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.lineTo(118, 26);
    ctx.lineTo(16, 78);
    ctx.lineTo(84, 72);
    ctx.lineTo(0, 118);
    ctx.closePath();
    ctx.fill();

    // Bottom-left spikes
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(148, H);
    ctx.lineTo(36, H - 38);
    ctx.lineTo(98, H - 44);
    ctx.lineTo(0, H - 84);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accentBright;
    ctx.beginPath();
    ctx.moveTo(0, H - 18);
    ctx.lineTo(112, H);
    ctx.lineTo(20, H - 54);
    ctx.closePath();
    ctx.fill();

    // Top-right spikes
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W - 190, 0);
    ctx.lineTo(W - 65, 34);
    ctx.lineTo(W - 140, 44);
    ctx.lineTo(W, 64);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accentBright;
    ctx.beginPath();
    ctx.moveTo(W, 12);
    ctx.lineTo(W - 145, 16);
    ctx.lineTo(W - 32, 54);
    ctx.closePath();
    ctx.fill();

    // Bottom-right spikes
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(W, H);
    ctx.lineTo(W - 210, H);
    ctx.lineTo(W - 72, H - 34);
    ctx.lineTo(W - 155, H - 40);
    ctx.lineTo(W, H - 72);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accentPrimary;
    ctx.beginPath();
    ctx.moveTo(W, H - 14);
    ctx.lineTo(W - 148, H);
    ctx.lineTo(W - 28, H - 52);
    ctx.closePath();
    ctx.fill();
  };
  drawCornerSpikes();

  // 3. Left-Side Illustrated Emblem: Caramelo Mascot only on 1 in 3 billboards (natural balanced distribution without clustering!),
  // while other billboards feature a Cartoon Motoboy Helmet & Speed Emblem!
  const showCarameloMascot = v === 0;
  ctx.save();
  ctx.translate(92, 142);

  if (showCarameloMascot) {
    // Dust cloud puff under paws
    ctx.fillStyle = '#D6C7B2';
    ctx.beginPath();
    ctx.ellipse(-8, 56, 58, 22, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Warm Caramel Body & Shoulders
    ctx.fillStyle = '#D97706';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.ellipse(-12, 16, 46, 38, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Floppy Caramel Ears
    for (const [ex, ey, rot] of [
      [-38, -36, -0.55],
      [32, -32, 0.55],
    ]) {
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(rot);
      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Caramel Head
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(0, -18, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Expressive Cartoon Eyes
    for (const ox of [-11, 11]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(ox, -26, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(ox + 2, -25, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Snout & Happy Open Barking Mouth + Black Nose
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.ellipse(6, -6, 20, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#7F1D1D';
    ctx.beginPath();
    ctx.arc(4, 2, 12, 0, Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FB7185';
    ctx.beginPath();
    ctx.arc(4, 6, 7, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.ellipse(14, -12, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lunging Front Caramel Paws with Black Paw Pads
    for (const [px, py] of [
      [-22, 42],
      [20, 46],
    ]) {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.ellipse(px, py, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(px, py + 3, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Stylized Cartoon Racing Helmet / Megaphone Star Emblem for varied Vila Tropical ads!
    ctx.fillStyle = '#FDE047';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(-2, 4, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Helmet shell
    ctx.fillStyle = accentPrimary;
    ctx.beginPath();
    ctx.arc(0, 2, 34, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(28, 26);
    ctx.lineTo(-28, 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tinted visor
    ctx.fillStyle = '#0EA5E9';
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.lineTo(31, -4);
    ctx.lineTo(27, 14);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Visor shine streak
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(2, -3);
    ctx.lineTo(22, -1);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Stamp Accents
  if (showCarameloMascot) {
    const drawPawStamp = (px: number, py: number, scale: number) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.ellipse(0, 4, 8, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const [tx, ty] of [
        [-9, -5],
        [-3, -9],
        [4, -9],
        [9, -4],
      ]) {
        ctx.beginPath();
        ctx.arc(tx, ty, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };
    drawPawStamp(174, 146, 1.05);
    drawPawStamp(478, 98, 1.15);
  }

  // 5. Tilted Purple Cartoon Crown Above Top Headline (Matching Reference Image 1)
  ctx.save();
  ctx.translate(208, 44);
  ctx.rotate(-0.22);
  ctx.fillStyle = accentBright;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-24, 14);
  ctx.lineTo(-28, -10);
  ctx.lineTo(-10, 2);
  ctx.lineTo(0, -16);
  ctx.lineTo(10, 2);
  ctx.lineTo(28, -10);
  ctx.lineTo(24, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 6. Bold 3D Cartoon Extruded Typography: "SEU ANÚNCIO" + "ESPAÇO VIP" + "AQUI!"
  ctx.save();
  ctx.transform(1, -0.09, -0.12, 1, 0, 26);

  // Top Headline: "SEU ANÚNCIO" (White 3D Block Letters with Deep Purple/Black Extrusion)
  ctx.font = '900 44px "Fredoka", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';

  // 3D Deep Extrusion Shadow
  ctx.fillStyle = '#0F172A';
  for (let d = 7; d >= 1; d--) {
    ctx.fillText('SEU ANÚNCIO', 346 + d * 0.7, 78 + d);
  }
  ctx.lineWidth = 10;
  ctx.strokeStyle = accentPrimary;
  ctx.strokeText('SEU ANÚNCIO', 346, 78);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#0F172A';
  ctx.strokeText('SEU ANÚNCIO', 346, 78);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('SEU ANÚNCIO', 346, 78);

  // Middle Sub-Line: "DIVULGUE NA VILA"
  ctx.font = '900 22px "Fredoka", "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('★ DIVULGUE NA VILA ★', 348, 114);

  // Bottom Huge Headline: "AQUI!" (Vibrant Purple/Blue 3D Block Letters)
  ctx.font = '900 66px "Fredoka", "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#0F172A';
  for (let d = 9; d >= 1; d--) {
    ctx.fillText('AQUI!', 346 + d * 0.8, 178 + d);
  }
  ctx.lineWidth = 11;
  ctx.strokeStyle = '#0F172A';
  ctx.strokeText('AQUI!', 346, 178);
  const wordGrad = ctx.createLinearGradient(200, 120, 480, 185);
  wordGrad.addColorStop(0, accentBright);
  wordGrad.addColorStop(1, accentPrimary);
  ctx.fillStyle = wordGrad;
  ctx.fillText('AQUI!', 346, 178);
  ctx.restore();

  // 7. Outer Dark Metallic Frame Border
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  billboardTexCache.set(v, tex);
  return tex;
}

const mercadinhoSignCache = new Map<number, THREE.CanvasTexture>();

/**
 * High-contrast, authentic Brazilian Neighborhood Grocery & Bar Signboard Texture
 * ("deixe em algumas partes com mercadinhos do bairro, deixe nome do mercado bem destacado,
 *   e produtos na calçada, ou alguns bar")
 * Directly inspired by the user's attached reference collage:
 * - Variant 0: "Mercadinho Compra Certa" (Ceramic tile cream background + bold royal-blue brush script)
 * - Variant 1: "MERCEARIA SÃO JOÃO · R$ 1,99" (Bright yellow/green awning + red/white bold block letters)
 * - Variant 2: "MERCEARIA LUIZA Nº 298" (Deep royal blue banner + crisp white block letters)
 * - Variant 3: "BAR & MERCEARIA DA VILA" (Warm amber boteco banner + red/white letters & cold drinks badge)
 */
export function createMercadinhoSignTexture(
  variant = 0,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const v = ((variant % 4) + 4) % 4;
  const cached = mercadinhoSignCache.get(v);
  if (cached) return cached;

  const W = 512;
  const H = 160;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  if (v === 0) {
    // VARIANT 0: "Mercadinho Compra Certa" (Cream ceramic tile background + bold blue lettering + red motto)
    ctx.fillStyle = '#F5EBD6';
    ctx.fillRect(0, 0, W, H);

    // Subtle ceramic tile grid lines
    ctx.strokeStyle = 'rgba(180, 160, 130, 0.45)';
    ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 52) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Left red religious motto & phone number badge ("O Senhor é Meu Pastor · 3250-1154")
    ctx.fillStyle = '#DC2626';
    ctx.font = '800 16px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('O Senhor é Meu Pastor', 16, 118);
    ctx.fillStyle = '#1D4ED8';
    ctx.font = '900 18px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.fillText('☎ 3250-1154 · RECARGA', 16, 144);

    // Main Highlighted Store Name: "Mercadinho COMPRA CERTA"
    ctx.textAlign = 'center';
    ctx.font = '900 44px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeText('COMPRA CERTA', 305, 68);
    ctx.fillStyle = '#0369A1';
    ctx.fillText('COMPRA CERTA', 305, 68);

    ctx.font = '900 28px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.strokeText('MERCADINHO', 92, 62);
    ctx.fillStyle = '#0F766E';
    ctx.fillText('MERCADINHO', 92, 62);

    // Right yellow promo badge
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.roundRect(352, 92, 144, 52, 8);
    ctx.fill();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#991B1B';
    ctx.font = '900 20px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.fillText('OFERTAS DIA!', 424, 125);
  } else if (v === 1) {
    // VARIANT 1: "MERCEARIA SÃO JOÃO · R$ 1,99" (Double banner: Red-brown top + bright yellow/green bottom)
    ctx.fillStyle = '#991B1B';
    ctx.fillRect(0, 0, W, 76);

    const lowGrad = ctx.createLinearGradient(0, 76, 0, H);
    lowGrad.addColorStop(0, '#FDE047');
    lowGrad.addColorStop(1, '#84CC16');
    ctx.fillStyle = lowGrad;
    ctx.fillRect(0, 76, W, H - 76);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 73, W, 5);

    // Upper banner text
    ctx.textAlign = 'center';
    ctx.font = '900 38px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#450A0A';
    ctx.strokeText('MERCEARIA SÃO JOÃO', 228, 52);
    ctx.fillStyle = '#FEF08A';
    ctx.fillText('MERCEARIA SÃO JOÃO', 228, 52);

    // Right "R$ 1,99" white burst badge
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(418, 10, 84, 56, 8);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 22px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.fillText('R$ 1,99', 460, 46);

    // Lower bright awning text in bold red with white outline
    ctx.font = '900 40px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeText('MERCEARIA SÃO JOÃO', 256, 132);
    ctx.fillStyle = '#DC2626';
    ctx.fillText('MERCEARIA SÃO JOÃO', 256, 132);
  } else if (v === 2) {
    // VARIANT 2: "MERCEARIA LUIZA Nº 298" (Deep royal blue awning with crisp bold white lettering)
    const blueGrad = ctx.createLinearGradient(0, 0, 0, H);
    blueGrad.addColorStop(0, '#1E3A8A');
    blueGrad.addColorStop(1, '#1D4ED8');
    ctx.fillStyle = blueGrad;
    ctx.fillRect(0, 0, W, H);

    // Top & bottom white/yellow trim stripes
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 8, W, 6);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(0, H - 14, W, 6);

    ctx.textAlign = 'center';
    ctx.font = '900 44px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#0F172A';
    ctx.strokeText('MERCEARIA LUIZA', 222, 74);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('MERCEARIA LUIZA', 222, 74);

    // Red/White "Nº 298" plate on right
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.roundRect(412, 28, 86, 56, 8);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 24px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Nº 298', 455, 65);

    ctx.font = '900 24px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FEF08A';
    ctx.fillText('★ BAR · BEBIDAS GELADAS · SALGADOS ★', 256, 126);
  } else {
    // VARIANT 3: "BAR & MERCADINHO DO BAIRRO" (Vibrant yellow/red Brazilian boteco sign)
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#DC2626';
    ctx.fillRect(0, 0, W, 22);
    ctx.fillRect(0, H - 22, W, 22);

    ctx.textAlign = 'center';
    ctx.font = '900 42px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeText('BAR & MERCADINHO', 256, 76);
    ctx.fillStyle = '#991B1B';
    ctx.fillText('BAR & MERCADINHO', 256, 76);

    ctx.font = '900 26px "Fredoka", "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('DO BAIRRO · PASTEL & REFRI GELADO', 256, 122);
  }

  // Crisp cartoon black outline border around the sign
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  mercadinhoSignCache.set(v, tex);
  return tex;
}

const floralCutoutCache = new Map<number, THREE.CanvasTexture>();

/**
 * Generates an Illustrated Transparent PNG-Style Floral & Grass Cutout Texture (512x256)
 * featuring lush layered green grass blades, golden Sunflowers ("Girassóis"), crimson/pink Roses ("Rosas"),
 * and tropical blossoms with crisp cartoon ink outlines ("deixe as gramas mais bonitas com flores, e girassois com rosas, em png desenho pra dar sensacao 3d").
 */
export function createFloralGardenCutoutTexture(
  variant = 0,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const v = ((variant % 4) + 4) % 4;
  const cached = floralCutoutCache.get(v);
  if (cached) return cached;

  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  let seed = 8821 + v * 547;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // Helper to draw a curved hand-painted grass blade with cartoon outline
  const drawGrassBlade = (
    baseX: number,
    baseY: number,
    height: number,
    width: number,
    leanX: number,
    fillHex: string,
    highlightHex: string,
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(baseX - width * 0.5, baseY);
    ctx.quadraticCurveTo(
      baseX + leanX * 0.35 - width * 0.25,
      baseY - height * 0.55,
      baseX + leanX,
      baseY - height,
    );
    ctx.quadraticCurveTo(
      baseX + leanX * 0.4 + width * 0.35,
      baseY - height * 0.5,
      baseX + width * 0.5,
      baseY,
    );
    ctx.closePath();

    const grad = ctx.createLinearGradient(baseX, baseY, baseX + leanX, baseY - height);
    grad.addColorStop(0, '#14532D');
    grad.addColorStop(0.55, fillHex);
    grad.addColorStop(1, highlightHex);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#14261C';
    ctx.stroke();
    ctx.restore();
  };

  // Helper to draw a broad serrated rose/sunflower leaf
  const drawLeaf = (cx: number, cy: number, rx: number, ry: number, angle: number, color: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#14261C';
    ctx.stroke();

    // Central leaf vein
    ctx.beginPath();
    ctx.moveTo(-rx * 0.75, 0);
    ctx.lineTo(rx * 0.75, 0);
    ctx.strokeStyle = '#86EFAC';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  };

  // Helper to draw an Illustrated Golden Sunflower ("Girassol")
  const drawSunflower = (cx: number, cy: number, radius: number) => {
    ctx.save();
    // Stems & broad leaves behind sunflower
    ctx.beginPath();
    ctx.moveTo(cx, H);
    ctx.quadraticCurveTo(cx + (rand() - 0.5) * 18, (cy + H) * 0.5, cx, cy);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#14261C';
    ctx.stroke();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#22C55E';
    ctx.stroke();

    drawLeaf(cx - radius * 0.75, cy + radius * 0.85, radius * 0.55, radius * 0.28, -0.45, '#16A34A');
    drawLeaf(cx + radius * 0.75, cy + radius * 0.75, radius * 0.55, radius * 0.28, 0.45, '#22C55E');

    // Outer ring of 14 golden petals
    const numPetals = 14;
    for (let p = 0; p < numPetals; p++) {
      const ang = (p / numPetals) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(radius * 0.68, 0, radius * 0.48, radius * 0.19, 0, 0, Math.PI * 2);
      ctx.fillStyle = p % 2 === 0 ? '#FACC15' : '#F59E0B';
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#1E1B18';
      ctx.stroke();
      ctx.restore();
    }

    // Warm orange inner petal ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.48, 0, Math.PI * 2);
    ctx.fillStyle = '#EA580C';
    ctx.fill();

    // Dark brown sunflower seed disc center
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.36, 0, Math.PI * 2);
    ctx.fillStyle = '#451A03';
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#1E1B18';
    ctx.stroke();

    // Golden seed dots inside the center disc
    ctx.fillStyle = '#FDE047';
    for (let d = 0; d < 9; d++) {
      const a = d * 2.4;
      const r = Math.sqrt(d / 9) * radius * 0.24;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // Helper to draw an Illustrated Layered Rose ("Rosa Vermelha / Rosa Pink")
  const drawRose = (cx: number, cy: number, radius: number, isPink = false) => {
    ctx.save();
    // Stem
    ctx.beginPath();
    ctx.moveTo(cx, H);
    ctx.quadraticCurveTo(cx + (rand() - 0.5) * 14, (cy + H) * 0.52, cx, cy);
    ctx.lineWidth = 6.5;
    ctx.strokeStyle = '#14261C';
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#15803D';
    ctx.stroke();

    drawLeaf(cx - radius * 0.7, cy + radius * 0.65, radius * 0.48, radius * 0.24, -0.5, '#15803D');
    drawLeaf(cx + radius * 0.7, cy + radius * 0.55, radius * 0.48, radius * 0.24, 0.5, '#22C55E');

    const outerCol = isPink ? '#EC4899' : '#DC2626';
    const midCol = isPink ? '#F472B6' : '#EF4444';
    const innerCol = isPink ? '#FBCFE8' : '#FCA5A5';
    const deepCol = isPink ? '#9D174D' : '#991B1B';

    // 6 rounded outer rose petals
    for (let p = 0; p < 6; p++) {
      const ang = (p / 6) * Math.PI * 2 + 0.2;
      ctx.save();
      ctx.translate(cx + Math.cos(ang) * radius * 0.36, cy + Math.sin(ang) * radius * 0.32);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = outerCol;
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#1E1B18';
      ctx.stroke();
      ctx.restore();
    }

    // Inner cupped rose bowl
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.52, 0, Math.PI * 2);
    ctx.fillStyle = midCol;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#1E1B18';
    ctx.stroke();

    // Spiraled rose center petals (classic cartoon rose swirl!)
    ctx.beginPath();
    ctx.arc(cx, cy - radius * 0.06, radius * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = deepCol;
    ctx.fill();

    ctx.strokeStyle = innerCol;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(cx, cy - radius * 0.05, radius * 0.24, 0.2, Math.PI * 1.65);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 2, cy - radius * 0.05, radius * 0.12, Math.PI * 0.5, Math.PI * 2.1);
    ctx.stroke();
    ctx.restore();
  };

  // 1. Back Layer of Lush Deep-Green & Emerald Grass Blades
  for (let i = 0; i < 34; i++) {
    const gx = 18 + (i / 33) * (W - 36) + (rand() - 0.5) * 10;
    const gh = 85 + rand() * 88;
    const gw = 12 + rand() * 8;
    const lean = (rand() - 0.5) * 34;
    drawGrassBlade(gx, H - 2, gh, gw, lean, '#16A34A', '#4ADE80');
  }

  // 2. Foreground Layer of Bright Sunlit Lime & Tropical Green Grass Blades
  for (let i = 0; i < 28; i++) {
    const gx = 22 + (i / 27) * (W - 44) + (rand() - 0.5) * 12;
    const gh = 64 + rand() * 72;
    const gw = 11 + rand() * 7;
    const lean = (rand() - 0.5) * 28;
    drawGrassBlade(gx, H, gh, gw, lean, '#22C55E', '#A3E635');
  }

  // 3. Arrange Sunflowers ("Girassóis") and Red/Pink Roses ("Rosas") across the cutout
  const flowerSlots = [
    { x: 68, y: 112, type: v % 2 === 0 ? 'sunflower' : 'rose_red', r: 34 },
    { x: 142, y: 128, type: 'rose_red', r: 27 },
    { x: 218, y: 96, type: 'sunflower', r: 38 },
    { x: 296, y: 124, type: 'rose_pink', r: 28 },
    { x: 374, y: 102, type: v % 2 === 1 ? 'sunflower' : 'rose_red', r: 35 },
    { x: 446, y: 126, type: 'rose_pink', r: 27 },
  ];

  for (const slot of flowerSlots) {
    const jx = slot.x + (rand() - 0.5) * 10;
    const jy = slot.y + (rand() - 0.5) * 10;
    if (slot.type === 'sunflower') {
      drawSunflower(jx, jy, slot.r);
    } else if (slot.type === 'rose_red') {
      drawRose(jx, jy, slot.r, false);
    } else {
      drawRose(jx, jy, slot.r, true);
    }
  }

  // 4. Small Accent Wildflower Blossoms & Rosebuds tucked into the grass
  const accentColors = ['#FEF08A', '#FB7185', '#F43F5E', '#FACC15', '#C084FC'];
  for (let a = 0; a < 10; a++) {
    const ax = 36 + a * 48 + (rand() - 0.5) * 16;
    const ay = 152 + rand() * 44;
    const col = accentColors[(a + v) % accentColors.length];
    ctx.beginPath();
    ctx.arc(ax, ay, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#1E1B18';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ax, ay, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  floralCutoutCache.set(v, tex);
  return tex;
}

let cachedGraffitiMuralTex: THREE.CanvasTexture | null = null;

/**
 * Generates an Authentic Brazilian Urban Street-Art / Graffiti & Pixo Mural ("desenho pichado no prédio")
 * painted directly onto the skyscraper facade (replacing the removed flags!).
 */
export function createBuildingGraffitiMuralTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (cachedGraffitiMuralTex) return cachedGraffitiMuralTex;

  const W = 512;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  // 1. Soft Spray-Paint Aerosol Halo & Splatter Cloud on the Building Wall
  const sprayClouds = [
    { x: 256, y: 245, r: 215, col: 'rgba(15, 23, 42, 0.55)' },
    { x: 185, y: 210, r: 155, col: 'rgba(168, 85, 247, 0.48)' },
    { x: 325, y: 220, r: 160, col: 'rgba(6, 182, 212, 0.48)' },
    { x: 256, y: 310, r: 150, col: 'rgba(249, 115, 22, 0.45)' },
  ];
  for (const sc of sprayClouds) {
    const grad = ctx.createRadialGradient(sc.x, sc.y, sc.r * 0.1, sc.x, sc.y, sc.r);
    grad.addColorStop(0, sc.col);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sc.x, sc.y, sc.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Spray Paint Drips Hanging Down from the Mural ("Escorridos de Tinta Spray")
  const dripCoords = [
    { x: 96, y: 310, h: 78, col: '#EC4899' },
    { x: 145, y: 335, h: 92, col: '#06B6D4' },
    { x: 218, y: 350, h: 105, col: '#FACC15' },
    { x: 282, y: 345, h: 86, col: '#A855F7' },
    { x: 354, y: 330, h: 95, col: '#22C55E' },
    { x: 408, y: 315, h: 72, col: '#F97316' },
  ];
  for (const dr of dripCoords) {
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(dr.x, dr.y);
    ctx.lineTo(dr.x, dr.y + dr.h);
    ctx.stroke();

    ctx.strokeStyle = dr.col;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(dr.x, dr.y);
    ctx.lineTo(dr.x, dr.y + dr.h);
    ctx.stroke();
  }

  // 3. Stylised Street-Art Spray Crown & Lightning Bolts at the Top of the Graffiti
  ctx.save();
  ctx.translate(256, 108);
  ctx.rotate(-0.05);
  ctx.beginPath();
  ctx.moveTo(-78, 28);
  ctx.lineTo(-92, -38);
  ctx.lineTo(-36, -4);
  ctx.lineTo(0, -54);
  ctx.lineTo(36, -4);
  ctx.lineTo(92, -38);
  ctx.lineTo(78, 28);
  ctx.closePath();
  ctx.fillStyle = '#FACC15';
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#0F172A';
  ctx.stroke();

  // Crown spray-paint shine
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-64, 14);
  ctx.lineTo(64, 14);
  ctx.stroke();
  ctx.restore();

  // 4. Bold Wildstyle Graffiti Throw-Up Lettering ("VILA" + "RIO" / Street Art Tag)
  ctx.save();
  ctx.translate(256, 232);
  ctx.rotate(-0.06);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 108px "Fredoka", "Plus Jakarta Sans", sans-serif';

  // Deep 3D extruded black drop-shadow block
  ctx.fillStyle = '#0F172A';
  for (let d = 14; d >= 1; d -= 2) {
    ctx.fillText('VILA!', d * 0.7, d);
  }

  // Outer neon cyan spray aura
  ctx.lineWidth = 22;
  ctx.strokeStyle = '#06B6D4';
  ctx.lineJoin = 'round';
  ctx.strokeText('VILA!', 0, 0);

  // Thick black cartoon graffiti outline
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#0F172A';
  ctx.strokeText('VILA!', 0, 0);

  // Vibrant hot-pink / gold / lime street-art fill gradient
  const fillGrad = ctx.createLinearGradient(0, -55, 0, 55);
  fillGrad.addColorStop(0, '#FDE047');
  fillGrad.addColorStop(0.5, '#F97316');
  fillGrad.addColorStop(1, '#EC4899');
  ctx.fillStyle = fillGrad;
  ctx.fillText('VILA!', 0, 0);
  ctx.restore();

  // 5. Lower Angular Brazilian "Pixo / Tag Urbana" Calligraphy Strokes Across the Wall
  ctx.save();
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 8;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  const tagX = [68, 128, 192, 258, 326, 392];
  for (let i = 0; i < tagX.length; i++) {
    const tx = tagX[i];
    const ty = 345 + (i % 2) * 8;
    ctx.beginPath();
    ctx.moveTo(tx - 18, ty + 38);
    ctx.lineTo(tx - 6, ty - 34);
    ctx.lineTo(tx + 18, ty - 16);
    ctx.lineTo(tx - 12, ty + 6);
    ctx.lineTo(tx + 20, ty + 36);
    ctx.stroke();

    // Inner white/lime tag highlight
    ctx.save();
    ctx.strokeStyle = i % 2 === 0 ? '#A3E635' : '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // 6. Spray-Paint Stars & Dots Around the Mural
  const starPts = [
    { x: 74, y: 145, col: '#FDE047' },
    { x: 432, y: 138, col: '#38BDF8' },
    { x: 64, y: 275, col: '#EC4899' },
    { x: 442, y: 268, col: '#A3E635' },
  ];
  for (const sp of starPts) {
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(sp.x - 18, sp.y);
    ctx.lineTo(sp.x + 18, sp.y);
    ctx.moveTo(sp.x, sp.y - 18);
    ctx.lineTo(sp.x, sp.y + 18);
    ctx.stroke();

    ctx.strokeStyle = sp.col;
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  cachedGraffitiMuralTex = tex;
  return tex;
}

export function createCopacabanaWaveSidewalkTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const W = 512;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F5EFE6';
  ctx.fillRect(0, 0, W, H);

  const twoPi = Math.PI * 2;
  const waveBands = [
    { centerX: 112, amp: 64, width: 52, phase: 0 },
    { centerX: 256, amp: 68, width: 54, phase: 0 },
    { centerX: 400, amp: 64, width: 52, phase: 0 },
  ];

  ctx.fillStyle = '#262422';
  for (const band of waveBands) {
    ctx.beginPath();
    for (let y = 0; y <= H; y += 3) {
      const waveX =
        band.centerX +
        Math.sin((y / H) * twoPi * 3 + band.phase) * band.amp;
      if (y === 0) ctx.moveTo(waveX - band.width * 0.5, y);
      else ctx.lineTo(waveX - band.width * 0.5, y);
    }
    for (let y = H; y >= 0; y -= 3) {
      const waveX =
        band.centerX +
        Math.sin((y / H) * twoPi * 3 + band.phase) * band.amp;
      ctx.lineTo(waveX + band.width * 0.5, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(120, 113, 108, 0.28)';
  ctx.lineWidth = 1.5;
  const step = 16;
  for (let y = 0; y < H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = 0; x < W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  ctx.fillStyle = '#D6CFC4';
  ctx.fillRect(0, 0, 24, H);
  ctx.fillRect(W - 24, 0, 24, H);
  ctx.fillStyle = '#78716C';
  ctx.fillRect(22, 0, 4, H);
  ctx.fillRect(W - 26, 0, 4, H);

  ctx.fillStyle = '#57534E';
  for (let y = 0; y < H; y += 64) {
    ctx.fillRect(0, y, 26, 3);
    ctx.fillRect(W - 26, y, 26, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 28);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createGoldenBeachSandTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const W = 512;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const sandGrad = ctx.createLinearGradient(0, 0, W, 0);
  sandGrad.addColorStop(0.0, '#D97706');
  sandGrad.addColorStop(0.22, '#EAB308');
  sandGrad.addColorStop(0.58, '#D97706');
  sandGrad.addColorStop(0.84, '#B45309');
  sandGrad.addColorStop(1.0, '#92400E');
  ctx.fillStyle = sandGrad;
  ctx.fillRect(0, 0, W, H);

  let seed = 7712;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 180; i++) {
    const sx = rand() * (W * 0.88);
    const sy = rand() * H;
    const sw = 32 + rand() * 88;
    const sh = 10 + rand() * 24;
    ctx.fillStyle = i % 2 === 0 ? '#F59E0B' : '#B45309';
    ctx.globalAlpha = i % 2 === 0 ? 0.24 : 0.18;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sw * 0.5, sh * 0.5, (rand() - 0.5) * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 8);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

let cachedRioWallGraffitiTex: THREE.CanvasTexture | null = null;

export function createRioWallGraffitiTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (cachedRioWallGraffitiTex) return cachedRioWallGraffitiTex;

  const W = 768;
  const H = 384;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  const purpleHalo = ctx.createRadialGradient(384, 200, 30, 384, 200, 290);
  purpleHalo.addColorStop(0.0, 'rgba(147, 51, 234, 0.42)');
  purpleHalo.addColorStop(0.55, 'rgba(168, 85, 247, 0.22)');
  purpleHalo.addColorStop(1.0, 'rgba(126, 34, 206, 0.0)');
  ctx.fillStyle = purpleHalo;
  ctx.beginPath();
  ctx.ellipse(384, 204, 310, 130, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(255, 84);
  ctx.rotate(-0.18);
  ctx.fillStyle = 'rgba(147, 51, 234, 0.78)';
  ctx.strokeStyle = '#3B0764';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-48, 22);
  ctx.lineTo(-58, -26);
  ctx.lineTo(-20, -2);
  ctx.lineTo(0, -38);
  ctx.lineTo(20, -2);
  ctx.lineTo(58, -26);
  ctx.lineTo(48, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(384, 82);
  ctx.rotate(-0.06);

  ctx.fillStyle = '#581C87';
  ctx.beginPath();
  ctx.moveTo(-48, 30);
  ctx.lineTo(-60, -24);
  ctx.lineTo(-18, 2);
  ctx.lineTo(0, -38);
  ctx.lineTo(18, 2);
  ctx.lineTo(60, -24);
  ctx.lineTo(48, 30);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-54, 24);
  ctx.lineTo(-66, -30);
  ctx.lineTo(-22, -4);
  ctx.lineTo(0, -44);
  ctx.lineTo(22, -4);
  ctx.lineTo(66, -30);
  ctx.lineTo(54, 24);
  ctx.closePath();
  const crownGrad = ctx.createLinearGradient(0, -44, 0, 24);
  crownGrad.addColorStop(0.0, '#FDE047');
  crownGrad.addColorStop(0.58, '#FACC15');
  crownGrad.addColorStop(0.62, '#9333EA');
  crownGrad.addColorStop(1.0, '#6B21A8');
  ctx.fillStyle = crownGrad;
  ctx.fill();

  ctx.lineWidth = 10;
  ctx.strokeStyle = '#141413';
  ctx.lineJoin = 'round';
  ctx.stroke();

  const crownJewels = [
    { x: -66, y: -34, r: 8.5 },
    { x: 0, y: -49, r: 10.0 },
    { x: 66, y: -34, r: 8.5 },
    { x: 0, y: 8, r: 7.5 },
    { x: -28, y: 10, r: 6.0 },
    { x: 28, y: 10, r: 6.0 },
  ];
  for (const jw of crownJewels) {
    ctx.beginPath();
    ctx.arc(jw.x, jw.y, jw.r, 0, Math.PI * 2);
    ctx.fillStyle = '#A855F7';
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#141413';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(jw.x - jw.r * 0.25, jw.y - jw.r * 0.25, jw.r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#F3E8FF';
    ctx.fill();
  }
  ctx.restore();

  const drips = [
    { x: 145, y: 262, h: 48, col: '#7E22CE' },
    { x: 196, y: 268, h: 36, col: '#141413' },
    { x: 268, y: 260, h: 58, col: '#9333EA' },
    { x: 356, y: 256, h: 46, col: '#141413' },
    { x: 438, y: 252, h: 54, col: '#9333EA' },
    { x: 525, y: 248, h: 62, col: '#7E22CE' },
    { x: 604, y: 244, h: 42, col: '#141413' },
  ];
  ctx.lineCap = 'round';
  for (const d of drips) {
    ctx.strokeStyle = d.col;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x, d.y + d.h);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(d.x, d.y + d.h + 4, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = d.col;
    ctx.fill();
  }

  ctx.save();
  ctx.translate(384, 212);
  ctx.rotate(-0.07);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 132px "Fredoka", "Plus Jakarta Sans", sans-serif';

  ctx.lineWidth = 34;
  ctx.strokeStyle = '#9333EA';
  ctx.lineJoin = 'round';
  ctx.strokeText('Gamefy', 0, 0);

  for (let s = 16; s >= 1; s -= 2) {
    ctx.fillStyle = s > 8 ? '#3B0764' : '#141413';
    ctx.fillText('Gamefy', -s * 0.55, s * 0.85);
  }

  ctx.lineWidth = 22;
  ctx.strokeStyle = '#141413';
  ctx.lineJoin = 'round';
  ctx.strokeText('Gamefy', 0, 0);

  ctx.lineWidth = 8;
  ctx.strokeStyle = '#A855F7';
  ctx.strokeText('Gamefy', 0, 0);

  const gamefyGrad = ctx.createLinearGradient(0, -64, 0, 66);
  gamefyGrad.addColorStop(0.0, '#FFFFFF');
  gamefyGrad.addColorStop(0.38, '#F3E8FF');
  gamefyGrad.addColorStop(0.72, '#C084FC');
  gamefyGrad.addColorStop(1.0, '#9333EA');
  ctx.fillStyle = gamefyGrad;
  ctx.fillText('Gamefy', 0, 0);

  for (const [sx, sy] of [
    [-312, -36],
    [314, -44],
    [-296, 42],
    [304, 38],
  ]) {
    ctx.beginPath();
    ctx.arc(sx, sy, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#A855F7';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#141413';
    ctx.stroke();
  }

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  cachedRioWallGraffitiTex = tex;
  return tex;
}

const condoFacadeTexCache = new Map<number, THREE.CanvasTexture>();

export function getCoastalCondoFacadeTexture(
  variantIndex = 0,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const v = ((variantIndex % 4) + 4) % 4;
  const cached = condoFacadeTexCache.get(v);
  if (cached) return cached;

  const W = 256;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const palettes = [
    { wall: '#F8FAFC', pilaster: '#E2E8F0', slab: '#FFFFFF', rail: '#CBD5E1', glassTop: '#1E3A5F', glassBot: '#0F172A' },
    { wall: '#F5EFE6', pilaster: '#E6DEC8', slab: '#FFFBEB', rail: '#D6CFC2', glassTop: '#2B4C7E', glassBot: '#172554' },
    { wall: '#E2E8F0', pilaster: '#CBD5E1', slab: '#F8FAFC', rail: '#94A3B8', glassTop: '#0369A1', glassBot: '#0C4A6E' },
    { wall: '#FB923C', pilaster: '#EA580C', slab: '#FFF7ED', rail: '#FDE68A', glassTop: '#1E293B', glassBot: '#0F172A' },
  ];
  const pal = palettes[v];

  ctx.fillStyle = pal.wall;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = pal.pilaster;
  ctx.fillRect(0, 0, 18, H);
  ctx.fillRect(W - 18, 0, 18, H);
  ctx.fillRect(118, 0, 20, H);

  const floors = 9;
  const floorH = H / floors;
  for (let f = 0; f < floors; f++) {
    const y = f * floorH;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(0, y + floorH - 8, W, 8);
    ctx.fillStyle = pal.slab;
    ctx.fillRect(0, y, W, 9);
    ctx.fillStyle = pal.rail;
    ctx.fillRect(14, y + floorH - 16, W - 28, 8);

    const winX = [24, 70, 144, 190];
    for (let wIdx = 0; wIdx < winX.length; wIdx++) {
      const wx = winX[wIdx];
      const wy = y + 14;
      const ww = 38;
      const wh = floorH - 30;

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);

      const g = ctx.createLinearGradient(wx, wy, wx, wy + wh);
      g.addColorStop(0, pal.glassTop);
      g.addColorStop(1, pal.glassBot);
      ctx.fillStyle = g;
      ctx.fillRect(wx, wy, ww, wh);

      ctx.fillStyle = 'rgba(186, 230, 253, 0.35)';
      ctx.beginPath();
      ctx.moveTo(wx + 3, wy + 2);
      ctx.lineTo(wx + 16, wy + 2);
      ctx.lineTo(wx + 7, wy + wh - 2);
      ctx.lineTo(wx + 3, wy + wh - 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = pal.slab;
      ctx.fillRect(wx + Math.floor(ww / 2) - 1, wy, 2, wh);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  condoFacadeTexCache.set(v, tex);
  return tex;
}

let cachedAirplaneBannerTex: THREE.CanvasTexture | null = null;

export function createAirplaneBannerTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (cachedAirplaneBannerTex) return cachedAirplaneBannerTex;

  const W = 1024;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, W, H);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(12, 14);
  ctx.lineTo(W - 14, 14);
  ctx.lineTo(W - 118, H * 0.5);
  ctx.lineTo(W - 14, H - 14);
  ctx.lineTo(12, H - 14);
  ctx.closePath();
  ctx.clip();

  const bgGrad = ctx.createLinearGradient(0, 14, 0, H - 14);
  bgGrad.addColorStop(0, '#FFFFFF');
  bgGrad.addColorStop(0.5, '#FFFBEB');
  bgGrad.addColorStop(1, '#FEF3C7');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(126, 34, 206, 0.04)';
  for (let x = 20; x < W; x += 18) {
    ctx.fillRect(x, 0, 6, H);
  }

  const borderGrad = ctx.createLinearGradient(0, 0, W, 0);
  borderGrad.addColorStop(0, '#6B21A8');
  borderGrad.addColorStop(0.5, '#9333EA');
  borderGrad.addColorStop(1, '#EC4899');
  ctx.fillStyle = borderGrad;
  ctx.fillRect(0, 14, W, 24);
  ctx.fillRect(0, H - 38, W, 24);

  ctx.fillStyle = '#FACC15';
  ctx.fillRect(0, 38, W, 8);
  ctx.fillRect(0, H - 46, W, 8);

  ctx.fillStyle = '#581C87';
  ctx.fillRect(12, 14, 26, H - 28);

  ctx.save();
  ctx.translate(118, H * 0.5 + 8);
  ctx.fillStyle = '#9333EA';
  ctx.strokeStyle = '#1E1B4B';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-42, 26);
  ctx.lineTo(-50, -24);
  ctx.lineTo(-18, 2);
  ctx.lineTo(0, -34);
  ctx.lineTo(18, 2);
  ctx.lineTo(50, -24);
  ctx.lineTo(42, 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FACC15';
  for (const [jx, jy] of [
    [-50, -28],
    [0, -38],
    [50, -28],
  ]) {
    ctx.beginPath();
    ctx.arc(jx, jy, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 72px "Arial Black", Impact, sans-serif';

  ctx.fillStyle = '#FACC15';
  ctx.fillText('SEU ANÚNCIO AQUI!', 518, H * 0.5 + 7);

  ctx.lineWidth = 13;
  ctx.strokeStyle = '#1E1B4B';
  ctx.strokeText('SEU ANÚNCIO AQUI!', 512, H * 0.5 + 1);

  const txtGrad = ctx.createLinearGradient(0, H * 0.5 - 42, 0, H * 0.5 + 42);
  txtGrad.addColorStop(0, '#7E22CE');
  txtGrad.addColorStop(0.55, '#6B21A8');
  txtGrad.addColorStop(1, '#3B0764');
  ctx.fillStyle = txtGrad;
  ctx.fillText('SEU ANÚNCIO AQUI!', 512, H * 0.5 + 1);
  ctx.restore();

  ctx.restore();

  ctx.strokeStyle = '#1E1B4B';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(12, 14);
  ctx.lineTo(W - 14, 14);
  ctx.lineTo(W - 118, H * 0.5);
  ctx.lineTo(W - 14, H - 14);
  ctx.lineTo(12, H - 14);
  ctx.closePath();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  cachedAirplaneBannerTex = tex;
  return tex;
}

let cachedSandDriftTex: THREE.CanvasTexture | null = null;

export function createBlownSandRoadDriftTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (cachedSandDriftTex) return cachedSandDriftTex;

  const W = 512;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, W, H);

  const baseGrad = ctx.createLinearGradient(W, 0, 64, 0);
  baseGrad.addColorStop(0.0, 'rgba(245, 188, 56, 0.72)');
  baseGrad.addColorStop(0.28, 'rgba(248, 198, 72, 0.48)');
  baseGrad.addColorStop(0.58, 'rgba(251, 208, 92, 0.22)');
  baseGrad.addColorStop(0.82, 'rgba(253, 224, 115, 0.06)');
  baseGrad.addColorStop(1.0, 'rgba(253, 224, 115, 0.0)');

  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 6; i++) {
    const cy = ((i + 0.5) / 6) * H;
    const radX = 180 + (i % 3) * 45;
    const radY = 95 + (i % 2) * 30;
    const softGrad = ctx.createRadialGradient(W - 20, cy, 10, W - 40, cy, radX);
    softGrad.addColorStop(0.0, 'rgba(245, 179, 42, 0.28)');
    softGrad.addColorStop(0.55, 'rgba(251, 196, 68, 0.12)');
    softGrad.addColorStop(1.0, 'rgba(253, 224, 102, 0.0)');
    ctx.save();
    ctx.translate(W - 20, cy);
    ctx.scale(1.0, radY / radX);
    ctx.fillStyle = softGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radX, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  cachedSandDriftTex = tex;
  return tex;
}

const kiteTextureCache = new Map<number, THREE.CanvasTexture>();

export function createCartoonKiteTexture(
  variantIndex: number,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const key = ((variantIndex % 6) + 6) % 6;
  const cached = kiteTextureCache.get(key);
  if (cached) return cached;

  const W = 512;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, W, H);
  const cx = W * 0.5;

  const drawFivePointStar = (
    sx: number,
    sy: number,
    outerR: number,
    innerR: number,
    fillHex: string,
    strokeHex = '#0F172A',
  ) => {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = -Math.PI * 0.5 + (i * Math.PI) / 5;
      const px = sx + Math.cos(angle) * r;
      const py = sy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fillHex;
    ctx.fill();
    if (strokeHex) {
      ctx.strokeStyle = strokeHex;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.restore();
  };

  if (key === 1) {
    const topY = 24;
    const upperMidY = 168;
    const lowerMidY = 300;
    const botY = 486;
    const leftX = 46;
    const rightX = W - 46;
    const lowerLeftX = 96;
    const lowerRightX = W - 96;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(rightX, upperMidY);
    ctx.lineTo(lowerRightX, lowerMidY);
    ctx.lineTo(cx, botY);
    ctx.lineTo(lowerLeftX, lowerMidY);
    ctx.lineTo(leftX, upperMidY);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = '#16A34A';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(rightX, upperMidY);
    ctx.lineTo(cx, 232);
    ctx.lineTo(leftX, upperMidY);
    ctx.closePath();
    ctx.fill();

    const losTopY = 88;
    const losMidY = 232;
    const losBotY = 382;
    const losLeftX = 82;
    const losRightX = W - 82;

    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(cx, losTopY);
    ctx.lineTo(losRightX, losMidY);
    ctx.lineTo(cx, losBotY);
    ctx.lineTo(losLeftX, losMidY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const globeR = 72;
    ctx.fillStyle = '#1D4ED8';
    ctx.beginPath();
    ctx.arc(cx, losMidY, globeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#0F172A';
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, losMidY, globeR - 3, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(cx - 18, losMidY + 95, 112, -Math.PI * 0.78, -Math.PI * 0.22);
    ctx.stroke();
    ctx.restore();

    for (const [sx, sy] of [
      [cx - 26, losMidY + 18],
      [cx + 22, losMidY + 26],
      [cx + 6, losMidY + 38],
      [cx - 14, losMidY + 42],
      [cx + 28, losMidY - 22],
    ]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx, botY);
    ctx.moveTo(leftX, upperMidY);
    ctx.lineTo(rightX, upperMidY);
    ctx.moveTo(lowerLeftX, lowerMidY);
    ctx.lineTo(lowerRightX, lowerMidY);
    ctx.stroke();

    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx, topY + 6);
    ctx.lineTo(cx, botY - 6);
    ctx.moveTo(leftX + 6, upperMidY);
    ctx.lineTo(rightX - 6, upperMidY);
    ctx.moveTo(lowerLeftX + 6, lowerMidY);
    ctx.lineTo(lowerRightX - 6, lowerMidY);
    ctx.stroke();

    ctx.restore();

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(rightX, upperMidY);
    ctx.lineTo(lowerRightX, lowerMidY);
    ctx.lineTo(cx, botY);
    ctx.lineTo(lowerLeftX, lowerMidY);
    ctx.lineTo(leftX, upperMidY);
    ctx.closePath();
    ctx.stroke();
  } else if (key === 2) {
    const topY = 26;
    const midY = 256;
    const botY = 486;
    const leftX = 26;
    const rightX = W - 26;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(rightX, midY);
    ctx.lineTo(cx, botY);
    ctx.lineTo(leftX, midY);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = '#06B6D4';
    ctx.fillRect(0, 0, W, H);

    const stripeColors = ['#EC4899', '#FACC15', '#2563EB', '#22C55E', '#F97316'];
    for (let s = 0; s < 5; s++) {
      const inset = (s + 1) * 36;
      ctx.fillStyle = stripeColors[s % stripeColors.length];
      ctx.beginPath();
      ctx.moveTo(cx, topY + inset);
      ctx.lineTo(rightX - inset, midY);
      ctx.lineTo(cx, botY - inset);
      ctx.lineTo(leftX + inset, midY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx, botY);
    ctx.moveTo(leftX, midY);
    ctx.quadraticCurveTo(cx, topY + 85, rightX, midY);
    ctx.stroke();

    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, topY + 6);
    ctx.lineTo(cx, botY - 6);
    ctx.moveTo(leftX + 6, midY);
    ctx.quadraticCurveTo(cx, topY + 85, rightX - 6, midY);
    ctx.stroke();

    ctx.restore();

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(rightX, midY);
    ctx.lineTo(cx, botY);
    ctx.lineTo(leftX, midY);
    ctx.closePath();
    ctx.stroke();
  } else if (key === 0 || key === 3 || key === 5) {
    const topY = 26;
    const upperMidY = 176;
    const lowerMidY = 306;
    const botY = 484;
    const leftX = 42;
    const rightX = W - 42;
    const lowerLeftX = 92;
    const lowerRightX = W - 92;

    const qTopLeft = key === 0 ? '#EF4444' : key === 3 ? '#EC4899' : '#F97316';
    const qTopRight = key === 0 ? '#1D4ED8' : key === 3 ? '#06B6D4' : '#EF4444';
    const qBotLeft = key === 0 ? '#22C55E' : key === 3 ? '#FACC15' : '#FACC15';
    const qBotRight = key === 0 ? '#FACC15' : key === 3 ? '#9333EA' : '#EA580C';

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(rightX, upperMidY);
    ctx.lineTo(lowerRightX, lowerMidY);
    ctx.lineTo(cx, botY);
    ctx.lineTo(lowerLeftX, lowerMidY);
    ctx.lineTo(leftX, upperMidY);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = qTopLeft;
    ctx.fillRect(0, 0, cx, 236);
    ctx.fillStyle = qTopRight;
    ctx.fillRect(cx, 0, cx, 236);
    ctx.fillStyle = qBotLeft;
    ctx.fillRect(0, 236, cx, H - 236);
    ctx.fillStyle = qBotRight;
    ctx.fillRect(cx, 236, cx, H - 236);

    if (key === 3) {
      drawFivePointStar(cx, 232, 92, 40, '#FEF08A', '#0F172A');
    } else if (key === 5) {
      ctx.fillStyle = '#FEF08A';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx, 122);
      ctx.lineTo(cx + 88, 232);
      ctx.lineTo(cx, 342);
      ctx.lineTo(cx - 88, 232);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawFivePointStar(cx, 232, 54, 24, '#EF4444', '#0F172A');
    }

    const glow = ctx.createRadialGradient(cx, 232, 10, cx, 232, 210);
    glow.addColorStop(0.0, 'rgba(255, 255, 255, 0.24)');
    glow.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx, botY);
    ctx.moveTo(leftX, upperMidY);
    ctx.lineTo(rightX, upperMidY);
    ctx.moveTo(lowerLeftX, lowerMidY);
    ctx.lineTo(lowerRightX, lowerMidY);
    ctx.stroke();

    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, topY + 6);
    ctx.lineTo(cx, botY - 6);
    ctx.moveTo(leftX + 6, upperMidY);
    ctx.lineTo(rightX - 6, upperMidY);
    ctx.moveTo(lowerLeftX + 6, lowerMidY);
    ctx.lineTo(lowerRightX - 6, lowerMidY);
    ctx.stroke();

    ctx.fillStyle = '#F97316';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, upperMidY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(rightX, upperMidY);
    ctx.lineTo(lowerRightX, lowerMidY);
    ctx.lineTo(cx, botY);
    ctx.lineTo(lowerLeftX, lowerMidY);
    ctx.lineTo(leftX, upperMidY);
    ctx.closePath();
    ctx.stroke();
  } else {
    const pal = {
      peak: '#FACC15',
      mid: '#06B6D4',
      wingL: '#22C55E',
      wingR: '#16A34A',
      center: '#EC4899',
    };

    const topY = 24;
    const wingTipY = 305;
    const innerArchY = 342;
    const tailPointY = 484;
    const leftTipX = 24;
    const rightTipX = W - 24;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(rightTipX, wingTipY);
    ctx.quadraticCurveTo(cx + 82, innerArchY, cx, tailPointY);
    ctx.quadraticCurveTo(cx - 82, innerArchY, leftTipX, wingTipY);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = pal.wingL;
    ctx.fillRect(0, 0, cx, H);
    ctx.fillStyle = pal.wingR;
    ctx.fillRect(cx, 0, cx, H);

    ctx.fillStyle = pal.mid;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(rightTipX - 38, wingTipY - 42);
    ctx.lineTo(cx, 272);
    ctx.lineTo(leftTipX + 38, wingTipY - 42);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = pal.peak;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(rightTipX - 96, wingTipY - 98);
    ctx.lineTo(cx, 210);
    ctx.lineTo(leftTipX + 96, wingTipY - 98);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = pal.center;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, 150);
    ctx.lineTo(cx + 38, 248);
    ctx.lineTo(cx, 346);
    ctx.lineTo(cx - 38, 248);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(leftTipX + 96, wingTipY - 98);
    ctx.lineTo(cx, 210);
    ctx.lineTo(rightTipX - 96, wingTipY - 98);
    ctx.moveTo(leftTipX + 38, wingTipY - 42);
    ctx.lineTo(cx, 272);
    ctx.lineTo(rightTipX - 38, wingTipY - 42);
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx, tailPointY);
    ctx.stroke();

    ctx.restore();

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(rightTipX, wingTipY);
    ctx.quadraticCurveTo(cx + 82, innerArchY, cx, tailPointY);
    ctx.quadraticCurveTo(cx - 82, innerArchY, leftTipX, wingTipY);
    ctx.closePath();
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  kiteTextureCache.set(key, tex);
  return tex;
}

const kiteRabiolaTexCache = new Map<number, THREE.CanvasTexture>();

export function createKiteRabiolaTexture(
  variantIndex: number,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const key = ((variantIndex % 4) + 4) % 4;
  const cached = kiteRabiolaTexCache.get(key);
  if (cached) return cached;

  const W = 128;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  const cx = W * 0.5;

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, H);
  ctx.stroke();

  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, H);
  ctx.stroke();

  const colorSets = [
    ['#22C55E', '#FACC15', '#1D4ED8', '#FFFFFF'],
    ['#EF4444', '#FACC15', '#06B6D4', '#EC4899'],
    ['#A855F7', '#F97316', '#FACC15', '#22C55E'],
    ['#06B6D4', '#EC4899', '#FACC15', '#FFFFFF'],
  ];
  const palette = colorSets[key];

  const numBows = 11;
  for (let i = 0; i < numBows; i++) {
    const t = i / (numBows - 1);
    const y = 22 + t * (H - 46);
    const bowHalfW = (52 - t * 18) * (i % 2 === 0 ? 1.0 : 0.9);
    const bowH = 14 - t * 3;
    const tilt = (i % 2 === 0 ? 1 : -1) * 0.14;
    const col = palette[i % palette.length];

    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate(tilt);

    ctx.fillStyle = col;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.moveTo(-bowHalfW, -bowH);
    ctx.lineTo(0, -3);
    ctx.lineTo(bowHalfW, -bowH);
    ctx.lineTo(bowHalfW - 4, bowH);
    ctx.lineTo(0, 3);
    ctx.lineTo(-bowHalfW + 4, bowH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  kiteRabiolaTexCache.set(key, tex);
  return tex;
}

let cachedMountainTreeCutoutTex: THREE.CanvasTexture | null = null;

export function createMountainTreeFoliageCutoutTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (cachedMountainTreeCutoutTex) return cachedMountainTreeCutoutTex;

  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  const treeClusterPuffs: Array<{ cx: number; cy: number; rx: number; ry: number }> = [
    { cx: 74, cy: 178, rx: 54, ry: 48 },
    { cx: 438, cy: 180, rx: 54, ry: 46 },
    { cx: 146, cy: 148, rx: 68, ry: 62 },
    { cx: 366, cy: 150, rx: 66, ry: 60 },
    { cx: 256, cy: 126, rx: 82, ry: 76 },
    { cx: 198, cy: 142, rx: 70, ry: 64 },
    { cx: 314, cy: 144, rx: 70, ry: 62 },
    { cx: 112, cy: 196, rx: 64, ry: 48 },
    { cx: 214, cy: 198, rx: 78, ry: 50 },
    { cx: 306, cy: 198, rx: 78, ry: 50 },
    { cx: 402, cy: 196, rx: 64, ry: 48 },
  ];

  ctx.fillStyle = '#2F656B';
  for (const p of treeClusterPuffs) {
    ctx.beginPath();
    ctx.ellipse(p.cx, p.cy + 4, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#38765C';
  for (const p of treeClusterPuffs) {
    ctx.beginPath();
    ctx.ellipse(p.cx, p.cy - 2, p.rx * 0.92, p.ry * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#629E6E';
  for (const p of treeClusterPuffs) {
    ctx.beginPath();
    ctx.ellipse(p.cx - 4, p.cy - 10, p.rx * 0.76, p.ry * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#89BF84';
  for (let i = 2; i < 7; i++) {
    const p = treeClusterPuffs[i];
    ctx.beginPath();
    ctx.ellipse(p.cx - 7, p.cy - 18, p.rx * 0.52, p.ry * 0.42, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'destination-in';
  const alphaGrad = ctx.createLinearGradient(0, 40, 0, H);
  alphaGrad.addColorStop(0.0, 'rgba(255,255,255,0.92)');
  alphaGrad.addColorStop(0.68, 'rgba(255,255,255,0.88)');
  alphaGrad.addColorStop(0.92, 'rgba(255,255,255,0.25)');
  alphaGrad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = alphaGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  cachedMountainTreeCutoutTex = tex;
  return tex;
}


/**
 * Builds the Cracked Volcanic-Reddish Asphalt Road Texture with a Single Dashed White/Cream Center Line
 * matching the reference image ("Apocalyptic_Road_to_the_Inferno_3ca1a72e.png")!
 */
export function createInfernoRoadTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Rich dark reddish-charcoal asphalt base bathed in warm crimson-amber firelight
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0.0, '#4A1815');
  grad.addColorStop(0.14, '#3D1412');
  grad.addColorStop(0.5, '#331110');
  grad.addColorStop(0.86, '#3D1412');
  grad.addColorStop(1.0, '#4A1815');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Warm orange-red firelight reflection bands along left and right road shoulders
  for (let i = 0; i < 16; i++) {
    const y = i * 32;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(234, 88, 12, 0.12)' : 'rgba(185, 28, 28, 0.10)';
    ctx.fillRect(0, y, 96, 22);
    ctx.fillRect(416, y, 96, 22);
  }

  // Subtle dark ash & scorch patches across the road surface
  let rSeed = 4041;
  const rand = () => {
    rSeed = (rSeed * 1664525 + 1013904223) % 4294967296;
    return rSeed / 4294967296;
  };

  for (let i = 0; i < 42; i++) {
    const px = 24 + rand() * 464;
    const py = rand() * 512;
    const pw = 18 + rand() * 54;
    const ph = 8 + rand() * 24;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(24, 6, 6, 0.36)' : 'rgba(127, 29, 29, 0.22)';
    ctx.fillRect(px, py, pw, ph);
  }

  // Jagged asphalt fissures & cracks near the road edges
  ctx.strokeStyle = '#180505';
  ctx.lineWidth = 3;
  for (let c = 0; c < 18; c++) {
    const startX = c % 2 === 0 ? 12 + rand() * 120 : 380 + rand() * 120;
    const startY = rand() * 512;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + (rand() - 0.5) * 44, startY + 24);
    ctx.lineTo(startX + (rand() - 0.5) * 64, startY + 52);
    ctx.stroke();
  }

  // Three Crisp Dashed White/Warm-Cream Road Stripes ("e tambem coloque 3 faixas na rua")
  // Aligned across the left, center, and right road corridors (x = 118, 256, 394 on the 512px texture)
  const stripeCenters = [118, 256, 394];
  const dashCount = 4;
  const segmentH = 512 / dashCount;
  const stripeW = 14;
  for (const cx of stripeCenters) {
    const sx = Math.round(cx - stripeW / 2);
    for (let d = 0; d < dashCount; d++) {
      const dy = d * segmentH + 18;
      const dh = segmentH - 46;
      // Subtle dark outline border for maximum sharpness at distance
      ctx.fillStyle = 'rgba(24, 6, 6, 0.58)';
      ctx.fillRect(sx - 2, dy - 2, stripeW + 4, dh + 4);
      // Warm cream-white road dash
      ctx.fillStyle = '#F5D0C5';
      ctx.fillRect(sx, dy, stripeW, dh);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 14);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Builds the Cracked Volcanic Sidewalk Slab Texture for both sides of the Inferno road.
 */
export function createInfernoCrackedSidewalkTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#6E322C';
  ctx.fillRect(0, 0, 256, 256);

  // Stone slab grid with dark soot seams
  ctx.strokeStyle = '#2A0D0B';
  ctx.lineWidth = 4;
  for (let y = 0; y <= 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  for (let x = 0; x <= 256; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }

  // Warm orange-red reflection highlights on slab tops
  ctx.fillStyle = 'rgba(251, 146, 60, 0.16)';
  ctx.fillRect(6, 6, 52, 52);
  ctx.fillRect(134, 70, 52, 52);
  ctx.fillRect(70, 198, 52, 52);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Builds the Subterranean Crimson-Scarlet to Fiery Orange-Red Cavern Sky Backdrop Texture
 * ("horizonte avermelhado e o ceu invez de ser ceu e umas montanhas cabeca pra baixo").
 */
export function createInfernoCavernSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // SphereGeometry maps zenith (+Y) to y=0 (0.0) and horizon equator (Y=0) to y=256 (0.50)!
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#6B0F0F');
  grad.addColorStop(0.18, '#991B1B');
  grad.addColorStop(0.32, '#DC2626');
  grad.addColorStop(0.42, '#EF4444');
  grad.addColorStop(0.49, '#F97316');
  grad.addColorStop(0.56, '#EA580C');
  grad.addColorStop(1.0, '#7F1D1D');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle glowing atmospheric heat bands in the horizon sky (y = 140..255)
  const horizonGlow = ctx.createRadialGradient(256, 232, 16, 256, 232, 240);
  horizonGlow.addColorStop(0.0, 'rgba(253, 186, 116, 0.48)');
  horizonGlow.addColorStop(0.45, 'rgba(239, 68, 68, 0.25)');
  horizonGlow.addColorStop(1.0, 'rgba(153, 27, 27, 0.0)');
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const infernoWallTexCache = new Map<number, THREE.CanvasTexture>();

/**
 * Builds a Scorched, Cracked Plaster & Exposed Brick Ruined House Facade Texture
 * for the burning houses in the Inferno map ("as casas destruidas pegando fogo").
 */
export function getInfernoRuinedWallTexture(
  variantIndex: number,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const idx = Math.abs(variantIndex) % 6;
  const cached = infernoWallTexCache.get(idx);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const baseColors = ['#8C4237', '#7A352C', '#964B3E', '#6E2E26', '#853D32', '#733129'];
  ctx.fillStyle = baseColors[idx];
  ctx.fillRect(0, 0, 256, 256);

  // Soot & fire-scorch gradient darkening the top of the ruined wall
  const sootGrad = ctx.createLinearGradient(0, 0, 0, 256);
  sootGrad.addColorStop(0.0, 'rgba(20, 5, 5, 0.62)');
  sootGrad.addColorStop(0.45, 'rgba(35, 10, 8, 0.22)');
  sootGrad.addColorStop(1.0, 'rgba(251, 146, 60, 0.18)');
  ctx.fillStyle = sootGrad;
  ctx.fillRect(0, 0, 256, 256);

  // Exposed dark-red brick patches where plaster peeled off in the fire
  ctx.fillStyle = '#4A1512';
  ctx.strokeStyle = '#1F0706';
  ctx.lineWidth = 2;
  const patches = [
    { x: 18, y: 28, rows: 3, cols: 3 },
    { x: 148, y: 92, rows: 4, cols: 3 },
    { x: 42, y: 164, rows: 3, cols: 4 },
  ];
  for (const p of patches) {
    for (let r = 0; r < p.rows; r++) {
      for (let c = 0; c < p.cols; c++) {
        const bx = p.x + c * 22 + (r % 2) * 10;
        const by = p.y + r * 12;
        ctx.fillRect(bx, by, 20, 10);
        ctx.strokeRect(bx, by, 20, 10);
      }
    }
  }

  // Structural wall cracks
  ctx.strokeStyle = '#1C0605';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(64, 0);
  ctx.lineTo(78, 48);
  ctx.lineTo(58, 104);
  ctx.moveTo(192, 32);
  ctx.lineTo(174, 96);
  ctx.lineTo(198, 156);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  infernoWallTexCache.set(idx, tex);
  return tex;
}

let cachedInfernoWoodenBillboardTex: THREE.CanvasTexture | null = null;

/**
 * Builds the Weathered, Cracked Wooden Plank Billboard & House Sign Texture reading "SUA LOGO AQUI"
 * ("se possivel coloque uns autdor no canto e escrito sua logo aqui. placa de madeira assim das casas e autdor meio que quebrado").
 */
export function getInfernoWoodenBillboardTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (cachedInfernoWoodenBillboardTex) return cachedInfernoWoodenBillboardTex;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // 1. Horizontal weathered wooden planks matching the Inferno house/fence wood palette
  const plankColors = ['#8F3F2B', '#7A3221', '#994631', '#6E2B1C'];
  const plankH = 64;
  for (let p = 0; p < 4; p++) {
    ctx.fillStyle = plankColors[p];
    ctx.fillRect(0, p * plankH, 512, plankH);

    // Subtle wood grain streaks along each plank
    ctx.fillStyle = 'rgba(28, 7, 5, 0.24)';
    ctx.fillRect(24, p * plankH + 14, 180, 5);
    ctx.fillRect(260, p * plankH + 38, 210, 6);
    ctx.fillStyle = 'rgba(251, 146, 60, 0.14)';
    ctx.fillRect(80, p * plankH + 26, 220, 4);
  }

  // Soot & fire-scorch vignette around the wooden board edges
  const scorchGrad = ctx.createRadialGradient(256, 128, 90, 256, 128, 300);
  scorchGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
  scorchGrad.addColorStop(1.0, 'rgba(18, 4, 3, 0.58)');
  ctx.fillStyle = scorchGrad;
  ctx.fillRect(0, 0, 512, 256);

  // Dark horizontal seams between wooden planks + vertical plank joints
  ctx.strokeStyle = '#1A0504';
  ctx.lineWidth = 5;
  for (let p = 1; p < 4; p++) {
    ctx.beginPath();
    ctx.moveTo(0, p * plankH);
    ctx.lineTo(512, p * plankH);
    ctx.stroke();
  }
  // Vertical board split / crack seams
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(168, 0);
  ctx.lineTo(162, 64);
  ctx.moveTo(356, 128);
  ctx.lineTo(364, 256);
  ctx.stroke();

  // Iron nail heads at plank ends
  ctx.fillStyle = '#180504';
  for (let p = 0; p < 4; p++) {
    for (const nx of [20, 492]) {
      ctx.beginPath();
      ctx.arc(nx, p * plankH + 18, 4.5, 0, Math.PI * 2);
      ctx.arc(nx, p * plankH + 46, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Distressed painted inner frame border
  ctx.strokeStyle = '#240806';
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, 484, 228);
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 472, 216);

  // 2. Bold Stenciled / Painted "SUA LOGO AQUI" Lettering
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  ctx.font = '900 72px "Arial Black", Impact, sans-serif';
  ctx.strokeStyle = '#160403';
  ctx.lineWidth = 13;
  ctx.strokeText('SUA LOGO', 256, 92);
  ctx.fillStyle = '#FEF08A';
  ctx.fillText('SUA LOGO', 256, 92);

  ctx.font = '900 78px "Arial Black", Impact, sans-serif';
  ctx.strokeStyle = '#160403';
  ctx.lineWidth = 13;
  ctx.strokeText('AQUI', 256, 174);
  ctx.fillStyle = '#FFFBEB';
  ctx.fillText('AQUI', 256, 174);

  // Re-draw thin dark plank seam lines and diagonal cracks over the painted text so it looks painted directly onto the broken wooden boards!
  ctx.strokeStyle = 'rgba(26, 5, 4, 0.72)';
  ctx.lineWidth = 3.5;
  for (let p = 1; p < 4; p++) {
    ctx.beginPath();
    ctx.moveTo(0, p * plankH);
    ctx.lineTo(512, p * plankH);
    ctx.stroke();
  }
  // Diagonal wood fracture cracks
  ctx.beginPath();
  ctx.moveTo(48, 0);
  ctx.lineTo(92, 76);
  ctx.lineTo(74, 128);
  ctx.moveTo(445, 256);
  ctx.lineTo(412, 182);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  cachedInfernoWoodenBillboardTex = tex;
  return tex;
}








