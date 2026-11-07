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

  // 6. Weathered Yellow Edge Drainage Lines near sidewalk curbs
  ctx.fillStyle = '#EAB308';
  ctx.fillRect(14, 0, 8, 512);
  ctx.fillRect(490, 0, 8, 512);

  // 7. White Dashed Lane Dividers separating the 3 lanes
  ctx.fillStyle = '#F1F5F9';
  const lane1X = Math.round(512 * 0.34);
  const lane2X = Math.round(512 * 0.66);
  for (let y = 24; y < 512; y += 128) {
    ctx.beginPath();
    ctx.roundRect(lane1X - 5, y, 10, 68, 4);
    ctx.roundRect(lane2X - 5, y, 10, 68, 4);
    ctx.fill();

    ctx.fillStyle = '#333945';
    ctx.fillRect(lane1X - 6, y + 26, 12, 4);
    ctx.fillRect(lane2X - 6, y + 44, 12, 3);
    ctx.fillStyle = '#F1F5F9';
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
 * ("deixe o ceu mais vivo tambem, o sol passando por tras bem lindo")
 * Features:
 * - Rich, vivid tropical sky blue zenith transitioning into radiant sunset violet-rose and glowing golden-amber horizon
 * - Luminous golden-rimmed cartoon cloud banks and painterly sunset streaks
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

  // Note: On SphereGeometry, y = 0 is the zenith (+Y) and y = H * 0.52 (532) is the horizon (y = 0 in 3D).
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  if (preset === 'sunset_dramatic') {
    // Vivid tropical cerulean blue -> vibrant periwinkle/violet -> radiant coral-rose -> glowing golden-amber horizon
    skyGrad.addColorStop(0.0, '#0284C7');
    skyGrad.addColorStop(0.15, '#0EA5E9');
    skyGrad.addColorStop(0.27, '#38BDF8');
    skyGrad.addColorStop(0.35, '#818CF8');
    skyGrad.addColorStop(0.41, '#C084FC');
    skyGrad.addColorStop(0.46, '#F472B6');
    skyGrad.addColorStop(0.50, '#FB923C');
    skyGrad.addColorStop(0.55, '#FBBF24');
    skyGrad.addColorStop(0.62, '#FEF08A');
    skyGrad.addColorStop(1.0, '#FDBA74');
  } else if (preset === 'tropical_morning') {
    // Vivid turquoise-sky blue -> aqua-cyan -> warm sunlit gold-peach horizon
    skyGrad.addColorStop(0.0, '#0369A1');
    skyGrad.addColorStop(0.18, '#0284C7');
    skyGrad.addColorStop(0.32, '#06B6D4');
    skyGrad.addColorStop(0.42, '#67E8F9');
    skyGrad.addColorStop(0.48, '#FDE047');
    skyGrad.addColorStop(0.54, '#FBBF24');
    skyGrad.addColorStop(0.62, '#FEF08A');
    skyGrad.addColorStop(1.0, '#FDE68A');
  } else {
    // Vivid royal twilight -> electric orchid magenta -> glowing sunset rose-gold
    skyGrad.addColorStop(0.0, '#1E1B4B');
    skyGrad.addColorStop(0.18, '#4338CA');
    skyGrad.addColorStop(0.30, '#7E22CE');
    skyGrad.addColorStop(0.40, '#C026D3');
    skyGrad.addColorStop(0.47, '#EC4899');
    skyGrad.addColorStop(0.53, '#F97316');
    skyGrad.addColorStop(0.60, '#FACC15');
    skyGrad.addColorStop(1.0, '#FB7185');
  }

  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  let seed = 2026;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // 1. Vibrant, luminous digital-painting brushstrokes integrated smoothly into the sky
  const drawFluidBrushStroke = (
    cx: number,
    cy: number,
    length: number,
    thickness: number,
    angle: number,
    colorHex: string,
    alpha: number,
  ) => {
    for (const ox of [-W, 0, W]) {
      const px = cx + ox;
      if (px + length < 0 || px - length > W) continue;
      ctx.save();
      ctx.translate(px, cy);
      ctx.rotate(angle);
      ctx.fillStyle = colorHex;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(-length * 0.5, 0);
      ctx.bezierCurveTo(
        -length * 0.22,
        -thickness * 0.85,
        length * 0.22,
        -thickness * 0.55,
        length * 0.5,
        0,
      );
      ctx.bezierCurveTo(
        length * 0.22,
        thickness * 0.65,
        -length * 0.22,
        thickness * 0.85,
        -length * 0.5,
        0,
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  };

  // Upper sky vivid cyan/azure strokes (y = 130..320)
  const upperStrokeColors =
    preset === 'tropical_morning'
      ? ['#22D3EE', '#38BDF8', '#7DD3FC', '#A5F3FC']
      : ['#38BDF8', '#60A5FA', '#818CF8', '#C084FC'];
  for (let i = 0; i < 64; i++) {
    const sx = rand() * W;
    const sy = 130 + rand() * 190;
    const len = 180 + rand() * 340;
    const thick = 8 + rand() * 20;
    const angle = (rand() - 0.5) * 0.08;
    const col = upperStrokeColors[i % upperStrokeColors.length];
    drawFluidBrushStroke(sx, sy, len, thick, angle, col, 0.22 + rand() * 0.16);
  }

  // Mid-to-horizon glowing sunset gold, coral, and pink painterly strokes (y = 315..520)
  const midStrokeColors =
    preset === 'tropical_morning'
      ? ['#FEF08A', '#FDE047', '#FBBF24', '#FFFBEB']
      : ['#F472B6', '#FB7185', '#FB923C', '#FACC15', '#FEF08A'];
  for (let i = 0; i < 75; i++) {
    const sx = rand() * W;
    const sy = 315 + rand() * 195;
    const len = 210 + rand() * 380;
    const thick = 10 + rand() * 24;
    const angle = (rand() - 0.5) * 0.06;
    const col = midStrokeColors[i % midStrokeColors.length];
    drawFluidBrushStroke(sx, sy, len, thick, angle, col, 0.24 + rand() * 0.18);
  }

  // 2. Crisp, Sunlit Cartoon Cloud Banks with Warm Golden-Amber Rim Highlights
  const drawIllustratedCloudBank = (
    cx: number,
    baseY: number,
    scale: number,
    fillColor: string,
    shadowColor: string,
    rimColor: string,
    alpha: number,
  ) => {
    const puffs = [
      { dx: -115, dy: 8, r: 44 },
      { dx: -72, dy: -12, r: 58 },
      { dx: -18, dy: -32, r: 74 },
      { dx: 42, dy: -18, r: 62 },
      { dx: 96, dy: 2, r: 48 },
      { dx: 132, dy: 14, r: 34 },
    ];
    for (const ox of [-W, 0, W]) {
      const px = cx + ox;
      if (px + 220 * scale < 0 || px - 220 * scale > W) continue;
      ctx.save();
      ctx.translate(px, baseY);
      ctx.scale(scale, scale * 0.68);

      // Radiant golden-sunlit top rim highlight
      ctx.globalAlpha = alpha * 0.95;
      ctx.fillStyle = rimColor;
      ctx.beginPath();
      ctx.moveTo(-155, 32);
      for (const p of puffs) {
        ctx.arc(p.dx, p.dy - 6, p.r + 4, Math.PI * 0.85, Math.PI * 0.15, false);
      }
      ctx.lineTo(165, 32);
      ctx.closePath();
      ctx.fill();

      // Main luminous cartoon cloud body
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(-152, 32);
      for (const p of puffs) {
        ctx.arc(p.dx, p.dy, p.r, Math.PI * 0.9, Math.PI * 0.1, false);
      }
      ctx.lineTo(162, 32);
      ctx.quadraticCurveTo(0, 44, -152, 32);
      ctx.closePath();
      ctx.fill();

      // Soft warm violet/coral shadow band inside the cloud belly
      ctx.globalAlpha = alpha * 0.62;
      ctx.fillStyle = shadowColor;
      ctx.beginPath();
      ctx.moveTo(-140, 28);
      for (const p of puffs) {
        ctx.arc(p.dx, p.dy + 16, p.r * 0.78, Math.PI * 0.95, Math.PI * 0.05, false);
      }
      ctx.lineTo(148, 30);
      ctx.quadraticCurveTo(0, 42, -140, 28);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  };

  const cloudFill = preset === 'tropical_morning' ? '#FFFBEB' : '#FFF1F2';
  const cloudShadow = preset === 'tropical_morning' ? '#FDE68A' : '#F472B6';
  const cloudRim = '#FEF08A';

  const numCloudClusters = 14;
  for (let c = 0; c < numCloudClusters; c++) {
    const cx = (c / numCloudClusters) * W + (rand() - 0.5) * 55;
    const cy = 365 + (c % 3) * 36 + rand() * 24;
    const sc = 0.68 + (c % 3) * 0.22 + rand() * 0.18;
    drawIllustratedCloudBank(cx, cy, sc, cloudFill, cloudShadow, cloudRim, 0.65 + (c % 2) * 0.16);
  }

  ctx.globalAlpha = 1.0;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
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
  const v = variant % 2;
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

  // 2. Dynamic Purple & Black Comic Speed Spikes in the Corners (Matching Reference Image 1)
  const accentPrimary = v === 0 ? '#7E22CE' : '#1D4ED8';
  const accentBright = v === 0 ? '#A855F7' : '#38BDF8';

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

  // 3. Left-Side Illustrated Cartoon Vira-Lata Caramelo Mascot (Matching Reference Image 1)
  ctx.save();
  ctx.translate(92, 142);

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
  ctx.restore();

  // 4. Black Paw Print Stamps (Left-Center & Far-Right, matching Reference Image 1)
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






