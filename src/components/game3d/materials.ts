import * as THREE from 'three';

// ============================================================
// Procedural Canvas Texture Generators — Ultra-Realistic PBR
// All textures generated via Canvas 2D (zero external assets)
// ============================================================

// Helper: seeded random for deterministic textures
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ============================================================
// 1. ASPHALT TEXTURE — Enhanced 1024px with rich detail
// ============================================================
let cachedAsphalt: { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null = null;
export function createAsphaltTexture(): { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  if (cachedAsphalt) return cachedAsphalt;
  if (typeof document === 'undefined') {
    const dummy = new THREE.Texture() as unknown as THREE.CanvasTexture;
    return { map: dummy, roughnessMap: dummy, bumpMap: dummy };
  }
  const size = 1024;

  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size; rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d')!;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = size; bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d')!;

  const rng = seededRandom(42);

  // --- Deep High-End Asphalt Base ---
  ctx.fillStyle = '#1c1b1a';
  ctx.fillRect(0, 0, size, size);

  // Natural asphalt tonal variation (sun wear, rubber friction lanes)
  for (let i = 0; i < 12; i++) {
    const px = rng() * size;
    const py = rng() * size;
    const pw = rng() * 260 + 100;
    const ph = rng() * 260 + 100;
    const tone = Math.floor(rng() * 12 + 24);
    ctx.fillStyle = `rgba(${tone}, ${tone - 1}, ${tone - 2}, 0.35)`;
    ctx.beginPath();
    ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle tire rubber wear strips along lanes
  ctx.fillStyle = 'rgba(10, 9, 8, 0.4)';
  ctx.fillRect(180, 0, 140, size);
  ctx.fillRect(700, 0, 140, size);

  rCtx.fillStyle = '#e5e5e5'; // Textura fosca, áspera e sem brilho ofuscante
  rCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // --- Fine Bitumen Aggregate & Micro-Gravel (60,000 dense particles) ---
  for (let i = 0; i < 60000; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = rng() * 1.5 + 0.25;
    const brightness = Math.floor(rng() * 55 + 18);
    ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    const bumpVal = Math.floor(rng() * 70 + 95);
    bCtx.fillStyle = `rgb(${bumpVal},${bumpVal},${bumpVal})`;
    bCtx.fillRect(x, y, 1.2, 1.2);
  }

  // --- Mineral quartz & granite specks ---
  for (let i = 0; i < 180; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = rng() * 2.8 + 1.2;
    const tone = Math.floor(rng() * 45 + 55);
    ctx.fillStyle = `rgb(${tone + 10}, ${tone + 5}, ${tone})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Bump for stones
    bCtx.fillStyle = `rgb(${Math.floor(rng() * 40 + 170)}, ${Math.floor(rng() * 40 + 170)}, ${Math.floor(rng() * 40 + 170)})`;
    bCtx.beginPath();
    bCtx.arc(x, y, r + 0.5, 0, Math.PI * 2);
    bCtx.fill();
  }

  // --- Asphalt Patches (Remendos brasileiros) ---
  for (let p = 0; p < 5; p++) {
    const px = rng() * (size - 160) + 80;
    const py = rng() * (size - 160) + 80;
    const pw = rng() * 120 + 50;
    const ph = rng() * 100 + 40;

    // Irregular patch shape
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px + rng() * 10, py + rng() * 10);
    ctx.lineTo(px + pw - rng() * 10, py + rng() * 8);
    ctx.lineTo(px + pw + rng() * 5, py + ph - rng() * 10);
    ctx.lineTo(px - rng() * 8, py + ph + rng() * 5);
    ctx.closePath();
    ctx.fillStyle = p < 2 ? 'rgba(20, 18, 16, 0.75)' : 'rgba(35, 32, 28, 0.6)';
    ctx.fill();

    // Seam / tar lines around patch
    ctx.strokeStyle = 'rgba(10, 9, 8, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // Patch roughness is smoother (newer asphalt)
    rCtx.fillStyle = 'rgba(140, 140, 140, 0.7)';
    rCtx.fillRect(px, py, pw, ph);
  }

  // --- Cracks (Rachaduras ramificadas) ---
  ctx.strokeStyle = '#181716';
  for (let c = 0; c < 6; c++) {
    let cx = rng() * size;
    let cy = rng() * size;
    ctx.lineWidth = rng() * 1.5 + 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const segments = Math.floor(rng() * 6 + 4);
    for (let s = 0; s < segments; s++) {
      cx += (rng() - 0.5) * 55;
      cy += (rng() - 0.5) * 55;
      ctx.lineTo(cx, cy);
      // Branch cracks
      if (rng() < 0.3) {
        const bx = cx + (rng() - 0.5) * 30;
        const by = cy + (rng() - 0.5) * 30;
        ctx.moveTo(cx, cy);
        ctx.lineTo(bx, by);
        ctx.moveTo(cx, cy);
      }
    }
    ctx.stroke();

    // Crack bump (darker in bump map)
    bCtx.strokeStyle = '#404040';
    bCtx.lineWidth = ctx.lineWidth + 1;
    bCtx.stroke();
  }

  // --- Oil stains (Manchas de óleo) ---
  for (let o = 0; o < 4; o++) {
    const ox = rng() * size;
    const oy = rng() * size;
    const or2 = rng() * 25 + 10;
    const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, or2);
    grad.addColorStop(0, 'rgba(15, 12, 8, 0.4)');
    grad.addColorStop(0.6, 'rgba(20, 16, 10, 0.2)');
    grad.addColorStop(1, 'rgba(25, 20, 15, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(ox, oy, or2 * 1.3, or2, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();

    // Oil is smoother
    rCtx.fillStyle = 'rgba(60, 60, 60, 0.3)';
    rCtx.beginPath();
    rCtx.arc(ox, oy, or2, 0, Math.PI * 2);
    rCtx.fill();
  }

  // --- Tire skid marks (Marcas de frenagem variadas) ---
  for (let t = 0; t < 3; t++) {
    const tx = rng() * size * 0.6 + size * 0.2;
    const tw = rng() * 18 + 12;
    ctx.fillStyle = `rgba(10, 10, 10, ${rng() * 0.12 + 0.06})`;
    // Slightly curved skid mark
    ctx.save();
    ctx.translate(tx, 0);
    ctx.rotate((rng() - 0.5) * 0.03);
    ctx.fillRect(-tw / 2, 0, tw, size);
    ctx.restore();
  }

  // --- Worn lane markings (faded paint traces) ---
  ctx.fillStyle = 'rgba(180, 170, 140, 0.06)';
  ctx.fillRect(size * 0.48, 0, size * 0.04, size);

  // --- Sand & Red Clay Shoulder Drifts & Patches on Asphalt (Barro e Areia invadindo as bordas do asfalto) ---
  for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
    const isLeft = sideIdx === 0;
    const baseEdgeX = isLeft ? 0 : size;
    for (let y = 0; y < size; y += 28) {
      const driftW = 65 + rng() * 95 + Math.sin(y * 0.025) * 35;
      const cx = isLeft ? driftW * 0.45 : size - driftW * 0.45;
      const grad = ctx.createRadialGradient(baseEdgeX, y, 4, cx, y, driftW);
      grad.addColorStop(0.0, 'rgba(168, 98, 48, 0.82)');   // Barro avermelhado na guia
      grad.addColorStop(0.45, 'rgba(198, 142, 82, 0.58)'); // Areia fina espalhada
      grad.addColorStop(0.80, 'rgba(180, 125, 70, 0.22)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(baseEdgeX, y, driftW * 1.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Manchas de areia e terra trazidas pelos pneus no meio das faixas
  for (let sp = 0; sp < 9; sp++) {
    const sx = 140 + rng() * (size - 280);
    const sy = rng() * size;
    const rx = 45 + rng() * 75;
    const ry = 85 + rng() * 140;
    const sandGrad = ctx.createRadialGradient(sx, sy, 6, sx, sy, Math.max(rx, ry));
    const isClay = sp % 2 === 0;
    sandGrad.addColorStop(0.0, isClay ? 'rgba(162, 92, 44, 0.52)' : 'rgba(208, 162, 102, 0.48)');
    sandGrad.addColorStop(0.55, isClay ? 'rgba(145, 82, 38, 0.25)' : 'rgba(188, 142, 86, 0.22)');
    sandGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sandGrad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, rx, ry, (rng() - 0.5) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Create textures ---
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 8);
  map.anisotropy = 16;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 8);
  roughnessMap.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 8);
  bumpMap.anisotropy = 8;

  cachedAsphalt = { map, roughnessMap, bumpMap };
  return cachedAsphalt;
}

export type RoadSurfaceType =
  | 'asphalt_sand_patches'
  | 'transition_asphalt_to_dirt'
  | 'dirt_sand_barro'
  | 'transition_dirt_to_asphalt';

// Define qual superfície de rua cada quarteirão (chunk) possui:
// Chunk 0: Asfalto com manchas de barro/areia
// Chunk 1: Limite do Asfalto -> Transição Profissional para Barro e Areia
// Chunks 2, 3, 4: Estrada de Barro Batido e Areia da Comunidade
// Chunk 5: Transição de Barro e Areia de volta para o Asfalto
export function getRoadSurfaceTypeForChunk(chunkIndex: number): RoadSurfaceType {
  const mod = ((chunkIndex % 6) + 6) % 6;
  if (mod === 0) return 'asphalt_sand_patches';
  if (mod === 1) return 'transition_asphalt_to_dirt';
  if (mod === 2 || mod === 3 || mod === 4) return 'dirt_sand_barro';
  return 'transition_dirt_to_asphalt';
}

export function getRoadSurfaceAtZ(worldDistZ: number, chunkLength = 45): RoadSurfaceType {
  const chunkIdx = Math.floor((worldDistZ + chunkLength * 0.5) / chunkLength);
  return getRoadSurfaceTypeForChunk(chunkIdx);
}

let cachedDirtSandRoad: { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null = null;
export function createDirtSandRoadTexture(): { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  if (cachedDirtSandRoad) return cachedDirtSandRoad;
  if (typeof document === 'undefined') {
    const dummy = new THREE.Texture() as unknown as THREE.CanvasTexture;
    return { map: dummy, roughnessMap: dummy, bumpMap: dummy };
  }
  const size = 1024;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d')!;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = size;
  bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d')!;

  if (!ctx || !rCtx || !bCtx) {
    const dummy = new THREE.CanvasTexture(canvas);
    return { map: dummy, roughnessMap: dummy, bumpMap: dummy };
  }

  const rng = seededRandom(314);

  // 1. Base de Barro Vermelho/Ocre Compactado Brasileiro (Estrada de Terra de Comunidade)
  ctx.fillStyle = '#9c5a2d';
  ctx.fillRect(0, 0, size, size);

  rCtx.fillStyle = '#f0f0f0'; // Barro/areia bem fosco (alta rugosidade)
  rCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // 2. Grandes bancos de areia lavada dourada e barro escuro úmido
  for (let i = 0; i < 42; i++) {
    const px = rng() * size;
    const py = rng() * size;
    const rx = 80 + rng() * 160;
    const ry = 110 + rng() * 210;
    const isSand = i % 2 === 0;
    const grad = ctx.createRadialGradient(px, py, 10, px, py, Math.max(rx, ry));
    if (isSand) {
      grad.addColorStop(0.0, 'rgba(219, 174, 112, 0.72)'); // Areia clara
      grad.addColorStop(0.55, 'rgba(196, 145, 84, 0.40)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    } else {
      grad.addColorStop(0.0, 'rgba(124, 64, 28, 0.68)');  // Barro avermelhado forte
      grad.addColorStop(0.60, 'rgba(146, 78, 34, 0.35)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, (rng() - 0.5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Rastros profundos de pneus de motos, carros e caminhões no barro/areia
  const rutXPositions = [180, 260, 460, 564, 764, 844];
  rutXPositions.forEach((rx) => {
    const rutGrad = ctx.createLinearGradient(rx - 36, 0, rx + 36, 0);
    rutGrad.addColorStop(0.0, 'rgba(218, 172, 110, 0.35)'); // Crista lateral de areia empurrada
    rutGrad.addColorStop(0.25, 'rgba(92, 46, 18, 0.58)');    // Sulco compacto escuro
    rutGrad.addColorStop(0.50, 'rgba(78, 38, 14, 0.68)');
    rutGrad.addColorStop(0.75, 'rgba(92, 46, 18, 0.58)');
    rutGrad.addColorStop(1.0, 'rgba(218, 172, 110, 0.35)');
    ctx.fillStyle = rutGrad;
    ctx.fillRect(rx - 36, 0, 72, size);

    // Frisos transversais de pneu cravados no barro e no bumpMap
    ctx.fillStyle = 'rgba(58, 28, 10, 0.28)';
    bCtx.fillStyle = '#484848';
    for (let ty = 0; ty < size; ty += 14) {
      const wobble = Math.sin(ty * 0.04 + rx) * 4;
      ctx.fillRect(rx - 18 + wobble, ty, 36, 5);
      bCtx.fillRect(rx - 18 + wobble, ty, 36, 5);
    }
  });

  // 4. Costelas / ondulações naturais de estrada de terra e pedregulhos (cascalho)
  for (let i = 0; i < 38000; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const toneChoice = rng();
    if (toneChoice < 0.35) {
      ctx.fillStyle = 'rgba(232, 194, 138, 0.45)'; // Grão de areia claro
    } else if (toneChoice < 0.75) {
      ctx.fillStyle = 'rgba(138, 72, 32, 0.42)';   // Grão de barro
    } else {
      ctx.fillStyle = 'rgba(82, 42, 18, 0.38)';    // Pedrisco escuro
    }
    const sz = rng() * 2.4 + 0.8;
    ctx.fillRect(x, y, sz, sz);

    const bVal = Math.floor(80 + rng() * 120);
    bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
    bCtx.fillRect(x, y, 2, 2);
  }

  // Pedrinhas / seixos espalhados nas bordas
  for (let p = 0; p < 240; p++) {
    const px = rng() * size;
    const py = rng() * size;
    const pr = 1.5 + rng() * 3.5;
    ctx.fillStyle = p % 2 === 0 ? '#d6b485' : '#78350f';
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 6);
  map.anisotropy = 16;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 6);

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 6);

  cachedDirtSandRoad = { map, roughnessMap, bumpMap };
  return cachedDirtSandRoad;
}

let cachedTransitionToDirt: { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null = null;
let cachedTransitionToAsphalt: { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null = null;

export function createRoadTransitionTexture(direction: 'to_dirt' | 'to_asphalt'): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  if (direction === 'to_dirt' && cachedTransitionToDirt) return cachedTransitionToDirt;
  if (direction === 'to_asphalt' && cachedTransitionToAsphalt) return cachedTransitionToAsphalt;
  if (typeof document === 'undefined') {
    const dummy = new THREE.Texture() as unknown as THREE.CanvasTexture;
    return { map: dummy, roughnessMap: dummy, bumpMap: dummy };
  }

  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const rCanvas = document.createElement('canvas');
  rCanvas.width = size;
  rCanvas.height = size;
  const rCtx = rCanvas.getContext('2d')!;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = size;
  bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d')!;

  if (!ctx || !rCtx || !bCtx) {
    const dummy = new THREE.CanvasTexture(canvas);
    return { map: dummy, roughnessMap: dummy, bumpMap: dummy };
  }

  // Nota sobre coordenadas UV após PlaneGeometry.rotateX(-Math.PI/2):
  // canvas Y = 0 (topo) corresponde a Z = -CHUNK_LENGTH/2 (início do chunk, perto da câmera)
  // canvas Y = size (base) corresponde a Z = +CHUNK_LENGTH/2 (fim do chunk, à frente do jogador)
  const rng = seededRandom(direction === 'to_dirt' ? 707 : 909);

  // 1. Preenche o fundo inteiro com a textura rica de Barro e Areia na mesma escala (2x6) dos chunks vizinhos!
  const dirtAssets = createDirtSandRoadTexture();
  if (dirtAssets.map.image) {
    const tileW = size / 2;
    const tileH = size / 6;
    for (let tx = 0; tx < 2; tx++) {
      for (let ty = 0; ty < 6; ty++) {
        ctx.drawImage(dirtAssets.map.image as CanvasImageSource, tx * tileW, ty * tileH, tileW, tileH);
      }
    }
  } else {
    ctx.fillStyle = '#9c5a2d';
    ctx.fillRect(0, 0, size, size);
  }
  rCtx.fillStyle = '#efefef';
  rCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // 2. Desenha a metade de Asfalto desgastado com borda irregular quebrada ("limite onde acaba o asfalto")
  ctx.save();
  ctx.beginPath();
  const splitY = size * 0.46;
  if (direction === 'to_dirt') {
    // Asfalto no topo (Y = 0..splitY, início do chunk) terminando em línguas quebradas sobre o barro/areia
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    for (let x = size; x >= 0; x -= 12) {
      const jag = Math.sin(x * 0.022) * 32 + Math.cos(x * 0.068) * 18 + (rng() - 0.5) * 16;
      // Nos trilhos dos pneus o barro avança mais para dentro do asfalto
      const tireWear = (Math.abs(x - 240) < 95 || Math.abs(x - 780) < 95) ? -28 : 10;
      ctx.lineTo(x, splitY + jag + tireWear);
    }
    ctx.closePath();
  } else {
    // Barro no topo (Y = 0..splitY) voltando para o asfalto na metade inferior (Y = splitY..size)
    ctx.moveTo(0, size);
    ctx.lineTo(size, size);
    for (let x = size; x >= 0; x -= 12) {
      const jag = Math.sin(x * 0.022) * 32 + Math.cos(x * 0.068) * 18 + (rng() - 0.5) * 16;
      ctx.lineTo(x, splitY + jag);
    }
    ctx.closePath();
  }
  ctx.clip();

  // Pinta o asfalto escuro granulado na mesma escala (2x8) dos chunks de asfalto!
  const asphaltAssets = createAsphaltTexture();
  if (asphaltAssets.map.image) {
    const tileW = size / 2;
    const tileH = size / 8;
    for (let tx = 0; tx < 2; tx++) {
      for (let ty = 0; ty < 8; ty++) {
        ctx.drawImage(asphaltAssets.map.image as CanvasImageSource, tx * tileW, ty * tileH, tileW, tileH);
      }
    }
  } else {
    ctx.fillStyle = '#1c1b1a';
    ctx.fillRect(0, 0, size, size);
  }
  ctx.restore();

  // 3. Degradê suave de areia e terra invadindo o limite do asfalto + borda chanfrada realista
  for (let x = 0; x < size; x += 8) {
    const jag = Math.sin(x * 0.022) * 32 + Math.cos(x * 0.068) * 18;
    const tireWear = direction === 'to_dirt' && (Math.abs(x - 240) < 95 || Math.abs(x - 780) < 95) ? -28 : 10;
    const borderY = splitY + jag + (direction === 'to_dirt' ? tireWear : 0);

    // Poeira de barro/areia arrastada pelos pneus sobre o asfalto na fronteira
    const dragGrad = ctx.createRadialGradient(x, borderY, 4, x, borderY, 95);
    dragGrad.addColorStop(0.0, 'rgba(176, 108, 52, 0.72)');
    dragGrad.addColorStop(0.45, 'rgba(204, 148, 86, 0.42)');
    dragGrad.addColorStop(0.80, 'rgba(164, 96, 46, 0.18)');
    dragGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = dragGrad;
    ctx.beginPath();
    ctx.ellipse(x, borderY, 36, 95, 0, 0, Math.PI * 2);
    ctx.fill();

    // Linha escura fina da quina quebrada do asfalto
    ctx.fillStyle = 'rgba(18, 15, 12, 0.68)';
    ctx.fillRect(x, borderY - 2, 9, 4);

    // Relevo no bumpMap na quina onde o asfalto acaba
    bCtx.fillStyle = '#d8d8d8';
    bCtx.fillRect(x, borderY - 3, 9, 4);
    bCtx.fillStyle = '#404040';
    bCtx.fillRect(x, borderY + 1, 9, 4);
  }

  // Pequenos fragmentos arredondados de brita/cascalho corrigidos para a proporção 10.2m x 45m (ry = rx * 0.22)
  for (let f = 0; f < 140; f++) {
    const fx = rng() * size;
    const fy = splitY + (rng() - 0.5) * 110;
    const rx = 2.0 + rng() * 4.5;
    const ry = rx * 0.24;
    ctx.fillStyle = f % 3 === 0 ? 'rgba(39, 39, 42, 0.75)' : (f % 3 === 1 ? 'rgba(217, 160, 102, 0.78)' : 'rgba(120, 53, 15, 0.72)');
    ctx.beginPath();
    ctx.ellipse(fx, fy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.anisotropy = 16;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.ClampToEdgeWrapping;
  roughnessMap.wrapT = THREE.ClampToEdgeWrapping;

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.ClampToEdgeWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;

  const res = { map, roughnessMap, bumpMap };
  if (direction === 'to_dirt') cachedTransitionToDirt = res;
  else cachedTransitionToAsphalt = res;
  return res;
}

export function setMaterialsAnisotropy(anisotropy: number) {
  if (cachedAsphalt) {
    cachedAsphalt.map.anisotropy = anisotropy;
    cachedAsphalt.roughnessMap.anisotropy = Math.min(8, anisotropy);
    cachedAsphalt.bumpMap.anisotropy = Math.min(8, anisotropy);
    cachedAsphalt.map.needsUpdate = true;
  }
  if (cachedDirtSandRoad) {
    cachedDirtSandRoad.map.anisotropy = anisotropy;
    cachedDirtSandRoad.map.needsUpdate = true;
  }
  if (cachedSidewalk) {
    cachedSidewalk.map.anisotropy = anisotropy;
    cachedSidewalk.bumpMap.anisotropy = Math.min(8, anisotropy);
    cachedSidewalk.map.needsUpdate = true;
  }
}

// ============================================================
// 2. SIDEWALK TEXTURE — Enhanced with cracks and wear
// ============================================================
let cachedSidewalk: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null = null;
export function createSidewalkTexture(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  if (cachedSidewalk) return cachedSidewalk;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = size; bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d')!;

  const rng = seededRandom(123);

  ctx.fillStyle = '#8c857b';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Individual slab variation (each slab gets a slight natural concrete color shift)
  const gridSize = 128;
  for (let gx = 0; gx < size; gx += gridSize) {
    for (let gy = 0; gy < size; gy += gridSize) {
      const shift = Math.floor(rng() * 16 - 8);
      const base = 142 + shift;
      ctx.fillStyle = `rgb(${base}, ${base - 2}, ${base - 5})`;
      ctx.fillRect(gx + 3, gy + 3, gridSize - 6, gridSize - 6);
    }
  }

  // Grid joints
  ctx.strokeStyle = '#857f76';
  ctx.lineWidth = 3.5;
  bCtx.strokeStyle = '#303030';
  bCtx.lineWidth = 3.5;

  for (let x = 0; x <= size; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
    bCtx.beginPath(); bCtx.moveTo(x, 0); bCtx.lineTo(x, size); bCtx.stroke();
  }
  for (let y = 0; y <= size; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    bCtx.beginPath(); bCtx.moveTo(0, y); bCtx.lineTo(size, y); bCtx.stroke();
  }

  // Sidewalk cracks & broken concrete (fissuras e placas quebradas autênticas das Fotos 4 e 5)
  for (let c = 0; c < 8; c++) {
    const sx = rng() * size;
    const sy = rng() * size;
    ctx.strokeStyle = '#3d3832';
    ctx.lineWidth = 2.2;
    bCtx.strokeStyle = '#101010';
    bCtx.lineWidth = 2.5;

    ctx.beginPath();
    bCtx.beginPath();
    ctx.moveTo(sx, sy);
    bCtx.moveTo(sx, sy);
    let curX = sx;
    let curY = sy;
    for (let s = 0; s < 5; s++) {
      curX += (rng() - 0.5) * 85;
      curY += (rng() - 0.5) * 85;
      ctx.lineTo(curX, curY);
      bCtx.lineTo(curX, curY);
    }
    ctx.stroke();
    bCtx.stroke();
  }

  // Remendos de asfalto preto / massa fria típica de calçadas brasileiras (Fotos 4 e 5)
  for (let p = 0; p < 4; p++) {
    const px = rng() * (size - 90);
    const py = rng() * (size - 90);
    const pw = rng() * 65 + 35;
    const ph = rng() * 55 + 28;

    ctx.fillStyle = '#292524'; // Asfalto escuro remendado
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.fill();

    bCtx.fillStyle = '#404040';
    bCtx.beginPath();
    bCtx.roundRect(px, py, pw, ph, 8);
    bCtx.fill();
  }

  // Grass growing between cracks
  for (let g = 0; g < 14; g++) {
    const gx2 = rng() * size;
    const gy2 = rng() * size;
    ctx.fillStyle = rng() > 0.4 ? 'rgba(34, 197, 94, 0.75)' : 'rgba(101, 163, 13, 0.65)';
    ctx.fillRect(gx2, gy2, rng() * 8 + 3, rng() * 8 + 3);
  }

  // Noise & dirt specks
  for (let i = 0; i < 8000; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const val = Math.floor(rng() * 40 + 155);
    ctx.fillStyle = `rgba(${val},${val - 5},${val - 10},0.25)`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Dark stains on some slabs
  for (let s = 0; s < 5; s++) {
    const sx = rng() * size;
    const sy = rng() * size;
    const sr = rng() * 20 + 8;
    ctx.fillStyle = 'rgba(100, 90, 80, 0.15)';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 10);
  map.anisotropy = 16;

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 10);

  cachedSidewalk = { map, bumpMap };
  return cachedSidewalk;
}

// ============================================================
// 3. BRICK WALL TEXTURE — Enhanced with mortar and aging
// ============================================================
let cachedBrick: THREE.CanvasTexture | null = null;
export function createBrickTexture(): THREE.CanvasTexture {
  if (cachedBrick) return cachedBrick;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const rng = seededRandom(77);

  ctx.fillStyle = '#b45309';
  ctx.fillRect(0, 0, size, size);

  const brickH = 24;
  const brickW = 48;

  // Draw individual bricks with color variation
  for (let y = 0; y < size; y += brickH) {
    const row = Math.floor(y / brickH);
    const offsetX = (row % 2) * (brickW / 2);
    for (let x = -offsetX; x < size + brickW; x += brickW) {
      const r = Math.floor(rng() * 30 + 160);
      const g = Math.floor(rng() * 20 + 60);
      const b = Math.floor(rng() * 15 + 5);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4);
    }
  }

  // Mortar lines
  ctx.strokeStyle = '#d6d3d1';
  ctx.lineWidth = 3;
  for (let y = 0; y < size; y += brickH) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    const row = Math.floor(y / brickH);
    const offsetX = (row % 2) * (brickW / 2);
    for (let x = -offsetX; x < size; x += brickW) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + brickH); ctx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  cachedBrick = map;
  return cachedBrick;
}

// ============================================================
// 4. ROOF TILES TEXTURE — Colonial ceramic
// ============================================================
let cachedRoof: THREE.CanvasTexture | null = null;
export function createRoofTexture(): THREE.CanvasTexture {
  if (cachedRoof) return cachedRoof;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c2410c';
  ctx.fillRect(0, 0, size, size);

  const tileW = 20;
  for (let x = 0; x < size; x += tileW) {
    const grad = ctx.createLinearGradient(x, 0, x + tileW, 0);
    grad.addColorStop(0, '#7c2d12');
    grad.addColorStop(0.5, '#ea580c');
    grad.addColorStop(1, '#9a3412');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, tileW, size);

    ctx.fillStyle = 'rgba(60, 20, 10, 0.4)';
    for (let y = 0; y < size; y += 32) {
      ctx.fillRect(x, y, tileW, 4);
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);
  cachedRoof = map;
  return cachedRoof;
}

// ============================================================
// 5. WINDOW GLASS TEXTURE — With warm interior glow
// ============================================================
let cachedWindowDay: THREE.CanvasTexture | null = null;
let cachedWindowNight: THREE.CanvasTexture | null = null;
export function createWindowTexture(isNight: boolean): THREE.CanvasTexture {
  if (isNight && cachedWindowNight) return cachedWindowNight;
  if (!isNight && cachedWindowDay) return cachedWindowDay;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#374151';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = isNight ? '#fbbf24' : '#60a5fa';
  ctx.fillRect(8, 8, 52, 52);
  ctx.fillRect(68, 8, 52, 52);
  ctx.fillRect(8, 68, 52, 52);
  ctx.fillRect(68, 68, 52, 52);

  // Reflection gloss line
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.moveTo(15, 8);
  ctx.lineTo(80, 8);
  ctx.lineTo(8, 80);
  ctx.lineTo(8, 15);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  if (isNight) cachedWindowNight = tex;
  else cachedWindowDay = tex;
  return tex;
}

// ============================================================
// 6. PAINTED CURB TEXTURE — Yellow (garage) or white (default)
// ============================================================
let cachedCurbYellow: THREE.CanvasTexture | null = null;
let cachedCurbWhite: THREE.CanvasTexture | null = null;
export function createCurbTexture(color: 'yellow' | 'white' = 'white'): THREE.CanvasTexture {
  if (color === 'yellow' && cachedCurbYellow) return cachedCurbYellow;
  if (color === 'white' && cachedCurbWhite) return cachedCurbWhite;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const baseColor = color === 'yellow' ? '#d4a017' : '#e0dcd4';
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(0, 0, size, size);

  // Painted stripes
  const stripeW = size / 4;
  for (let i = 0; i < 4; i += 2) {
    ctx.fillStyle = baseColor;
    ctx.fillRect(i * stripeW, 0, stripeW, size);
  }

  // Wear and aging
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = 'rgba(120, 115, 110, 0.15)';
    ctx.fillRect(x, y, 3, 3);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 8);
  if (color === 'yellow') cachedCurbYellow = map;
  else cachedCurbWhite = map;
  return map;
}

// ============================================================
// 7. COMMERCIAL SIGN TEXTURE — For shop facades
// ============================================================
const cachedSigns = new Map<string, THREE.CanvasTexture>();
export function createSignTexture(text: string, bgColor: string = '#cc2222', textColor: string = '#ffffff'): THREE.CanvasTexture {
  const key = `${text}_${bgColor}_${textColor}`;
  const existing = cachedSigns.get(key);
  if (existing) return existing;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 64);

  // Border
  ctx.strokeStyle = textColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 248, 56);

  // Text
  ctx.fillStyle = textColor;
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  cachedSigns.set(key, tex);
  return tex;
}

// ============================================================
// 8. GRAFITI TEXTURE — Random street art on walls
// ============================================================
export function createGrafitiTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.clearRect(0, 0, 128, 128);

  const rng = seededRandom(Math.floor(Math.random() * 99999));

  // Random spray paint shapes
  const colors = ['#ff3333', '#33ff33', '#3333ff', '#ffff33', '#ff33ff', '#33ffff', '#ff8800'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.beginPath();
    ctx.arc(rng() * 100 + 14, rng() * 100 + 14, rng() * 20 + 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Spray dots
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.globalAlpha = rng() * 0.5 + 0.3;
    ctx.beginPath();
    ctx.arc(rng() * 128, rng() * 128, rng() * 3 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  return new THREE.CanvasTexture(canvas);
}

// ============================================================
// 9. TERRAIN / GROUND UNDER HOUSES — Textured Lawn & Soil
// ============================================================
let cachedTerrainTex: THREE.CanvasTexture | null = null;
export function createTerrainTexture(): THREE.CanvasTexture {
  if (cachedTerrainTex) return cachedTerrainTex;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rng = seededRandom(101);

  // Earthy Brazilian green lawn base
  ctx.fillStyle = '#2e6b27';
  ctx.fillRect(0, 0, size, size);

  // Soil & dirt undertone patches
  for (let i = 0; i < 20; i++) {
    const px = rng() * size;
    const py = rng() * size;
    const r = rng() * 80 + 30;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(74, 53, 37, 0.25)' : 'rgba(46, 107, 39, 0.35)';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Multitone grass blades and textural grains
  const grassTones = ['#3d8333', '#25581f', '#4fa643', '#5cb84d', '#1e4819'];
  for (let i = 0; i < 5500; i++) {
    const x = rng() * size;
    const y = rng() * size;
    ctx.fillStyle = grassTones[Math.floor(rng() * grassTones.length)];
    ctx.fillRect(x, y, 2, rng() * 4 + 2);
  }

  cachedTerrainTex = new THREE.CanvasTexture(canvas);
  cachedTerrainTex.wrapS = THREE.RepeatWrapping;
  cachedTerrainTex.wrapT = THREE.RepeatWrapping;
  cachedTerrainTex.repeat.set(6, 6);
  return cachedTerrainTex;
}

