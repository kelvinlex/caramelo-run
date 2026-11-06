import * as THREE from 'three';
import { getSharedMaterials } from './sceneryModels';
import { createWindowTexture } from './materials';

const createRNG = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

// 16 VIBRANT BRAZILIAN ARCHITECTURAL PALETTES
export const EXPANDED_HOUSE_PALETTES = [
  { name: 'amarelo colonial', wall: '#f59e0b', trim: '#ffffff', door: '#78350f', stucco: 'rough' },
  { name: 'azul piscina / grego', wall: '#0284c7', trim: '#ffffff', door: '#0369a1', stucco: 'smooth' },
  { name: 'verde limão vibrante', wall: '#84cc16', trim: '#ecfccb', door: '#3f6212', stucco: 'rough' },
  { name: 'rosa choque / chiclete', wall: '#ec4899', trim: '#fdf2f8', door: '#831843', stucco: 'medium' },
  { name: 'roxo açaí', wall: '#7c3aed', trim: '#f5f3ff', door: '#4c1d95', stucco: 'smooth' },
  { name: 'vermelho telha vivo', wall: '#dc2626', trim: '#fef2f2', door: '#450a0a', stucco: 'rough' },
  { name: 'verde esmeralda escuro', wall: '#059669', trim: '#d1fae5', door: '#064e3b', stucco: 'medium' },
  { name: 'laranja pôr do sol', wall: '#ea580c', trim: '#ffedd5', door: '#7c2d12', stucco: 'rough' },
  { name: 'turquesa caribe', wall: '#06b6d4', trim: '#ecfeff', door: '#164e63', stucco: 'smooth' },
  { name: 'lilás suave', wall: '#a855f7', trim: '#faf5ff', door: '#581c87', stucco: 'medium' },
  { name: 'terracota rústico', wall: '#b45309', trim: '#fef3c7', door: '#451a03', stucco: 'rough' },
  { name: 'azul cobalto escuro', wall: '#1d4ed8', trim: '#eff6ff', door: '#1e3a8a', stucco: 'smooth' },
  { name: 'coral vibrante', wall: '#f43f5e', trim: '#ffe4e6', door: '#881337', stucco: 'medium' },
  { name: 'amarelo canário', wall: '#eab308', trim: '#fefce8', door: '#713f12', stucco: 'rough' },
  { name: 'menta fresca', wall: '#10b981', trim: '#f0fdf4', door: '#047857', stucco: 'smooth' },
  { name: 'cinza urbano grafite', wall: '#475569', trim: '#f8fafc', door: '#0f172a', stucco: 'rough' },
];

// 🧱 TEXTURA PROCEDURAL DE TIJOLINHOS LARANJA REALISTAS
let cachedOrangeBrickTex: THREE.CanvasTexture | null = null;
export function getOrangeBrickTexture(): THREE.CanvasTexture {
  if (cachedOrangeBrickTex) return cachedOrangeBrickTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Rejunte cinza claro realista
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 512, 512);

    const brickH = 26;
    const brickW = 60;
    const gap = 4;
    const rows = Math.ceil(512 / (brickH + gap));
    const cols = Math.ceil(512 / (brickW + gap)) + 1;

    const brickColors = [
      '#ea580c', '#d97706', '#c2410c', '#b45309',
      '#f97316', '#dc2626', '#9a3412', '#ea580c'
    ];

    for (let r = 0; r < rows; r++) {
      const y = r * (brickH + gap);
      const isOffset = (r % 2) === 1;
      const startX = isOffset ? -(brickW / 2) : 0;

      for (let c = 0; c < cols; c++) {
        const x = startX + c * (brickW + gap);
        const color = brickColors[(r * 7 + c * 13) % brickColors.length];
        ctx.fillStyle = color;
        ctx.fillRect(x, y, brickW, brickH);

        // Textura cerâmica rústica
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        for (let k = 0; k < 14; k++) {
          const px = x + ((r * 11 + k * 17) % brickW);
          const py = y + ((c * 19 + k * 23) % brickH);
          ctx.fillRect(px, py, 2, 2);
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
        for (let k = 0; k < 8; k++) {
          const px = x + ((r * 29 + k * 31) % brickW);
          const py = y + ((c * 37 + k * 41) % brickH);
          ctx.fillRect(px, py, 2, 2);
        }
      }
    }
  }
  cachedOrangeBrickTex = new THREE.CanvasTexture(canvas);
  cachedOrangeBrickTex.wrapS = THREE.RepeatWrapping;
  cachedOrangeBrickTex.wrapT = THREE.RepeatWrapping;
  cachedOrangeBrickTex.repeat.set(2.5, 2.5);
  return cachedOrangeBrickTex;
}

// 🏢 TEXTURA PROCEDURAL DE REBOCO BRANCO MODERNO
let cachedWhitePlasterTex: THREE.CanvasTexture | null = null;
export function getWhitePlasterTexture(): THREE.CanvasTexture {
  if (cachedWhitePlasterTex) return cachedWhitePlasterTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 3500; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.6)' : 'rgba(148, 163, 184, 0.14)';
      const x = (i * 137) % 512;
      const y = (i * 269) % 512;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  cachedWhitePlasterTex = new THREE.CanvasTexture(canvas);
  cachedWhitePlasterTex.wrapS = THREE.RepeatWrapping;
  cachedWhitePlasterTex.wrapT = THREE.RepeatWrapping;
  cachedWhitePlasterTex.repeat.set(3, 3);
  return cachedWhitePlasterTex;
}

// 🚪 GERADOR DE PORTÕES VARIADOS (GRADE DE FERRO COM LANÇAS, ALUMÍNIO FRISADO, PORTÃO DUPLO)
export function createVariedGate(width: number, rng: () => number, wallMat: THREE.Material): THREE.Group {
  const gateGroup = new THREE.Group();
  const gateTypes = ['grade_ferro', 'grade_branca', 'aluminio_preto', 'aluminio_branco', 'aluminio_bronze', 'portao_duplo'];
  const gateType = gateTypes[Math.floor(rng() * gateTypes.length)];

  const gateW = 2.4;
  const gateH = 1.85;

  if (gateType === 'grade_ferro') {
    // Portão de grade de ferro com barras verticais e pontas de lanças
    const barMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.85, roughness: 0.25 });
    const spearMat = new THREE.MeshStandardMaterial({ color: rng() > 0.5 ? 0xf59e0b : 0x111827, metalness: 0.9, roughness: 0.2 });

    const frameGeo = new THREE.BoxGeometry(gateW, 0.08, 0.06);
    const bottomBar = new THREE.Mesh(frameGeo, barMat);
    bottomBar.position.y = 0.1;
    gateGroup.add(bottomBar);

    const midBar = new THREE.Mesh(frameGeo, barMat);
    midBar.position.y = gateH * 0.5;
    gateGroup.add(midBar);

    const topBar = new THREE.Mesh(frameGeo, barMat);
    topBar.position.y = gateH - 0.15;
    gateGroup.add(topBar);

    const numBars = 11;
    const spacing = (gateW - 0.2) / (numBars - 1);
    for (let i = 0; i < numBars; i++) {
      const bx = -gateW / 2 + 0.1 + i * spacing;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, gateH - 0.2, 8), barMat);
      bar.position.set(bx, gateH / 2 - 0.05, 0);
      gateGroup.add(bar);

      const spear = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.16, 4), spearMat);
      spear.position.set(bx, gateH - 0.05, 0);
      gateGroup.add(spear);
    }
  } else if (gateType === 'grade_branca') {
    // Grade tubular moderna de alumínio branco
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.2 });
    const numBars = 12;
    const spacing = (gateW - 0.2) / (numBars - 1);

    const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(gateW, 0.08, 0.06), whiteMat);
    frameBottom.position.y = 0.1;
    gateGroup.add(frameBottom);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(gateW, 0.08, 0.06), whiteMat);
    frameTop.position.y = gateH - 0.05;
    gateGroup.add(frameTop);

    for (let i = 0; i < numBars; i++) {
      const bx = -gateW / 2 + 0.1 + i * spacing;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.045, gateH - 0.15, 0.045), whiteMat);
      bar.position.set(bx, gateH / 2, 0);
      gateGroup.add(bar);
    }
  } else if (gateType === 'portao_duplo') {
    // Portão de garagem basculante + portão social com pilar
    const gateColor = rng() > 0.5 ? 0x1e293b : 0x78350f;
    const panelMat = new THREE.MeshStandardMaterial({ color: gateColor, roughness: 0.45, metalness: 0.6 });

    const carGate = new THREE.Mesh(new THREE.BoxGeometry(1.7, gateH - 0.1, 0.06), panelMat);
    carGate.position.set(-0.4, gateH / 2, 0);
    gateGroup.add(carGate);

    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.2, gateH + 0.1, 0.25), wallMat);
    pillar.position.set(0.55, (gateH + 0.1) / 2, 0);
    gateGroup.add(pillar);

    const personGate = new THREE.Mesh(new THREE.BoxGeometry(0.75, gateH - 0.1, 0.06), panelMat);
    personGate.position.set(1.05, gateH / 2, 0);
    gateGroup.add(personGate);

    const handleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.05), handleMat);
    handle.position.set(0.75, 1.0, 0.04);
    gateGroup.add(handle);
  } else {
    // Portão de alumínio com frisos horizontais
    const colors = {
      aluminio_preto: 0x0f172a,
      aluminio_branco: 0xf8fafc,
      aluminio_bronze: 0x451a03,
    };
    const c = colors[gateType as keyof typeof colors] || 0x334155;
    const slatMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.38, metalness: 0.65 });

    const baseGate = new THREE.Mesh(new THREE.BoxGeometry(gateW, gateH - 0.08, 0.05), slatMat);
    baseGate.position.set(0, gateH / 2, 0);
    gateGroup.add(baseGate);

    const numSlats = 8;
    for (let s = 1; s < numSlats; s++) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(gateW - 0.1, 0.02, 0.065),
        new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.5 })
      );
      slat.position.set(0, (gateH / numSlats) * s, 0.025);
      gateGroup.add(slat);
    }

    const pullerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
    const puller = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 12), pullerMat);
    puller.position.set(gateW * 0.35, 1.05, 0.045);
    gateGroup.add(puller);
  }

  return gateGroup;
}

export function createModularFacade(seed: number, side: 1 | -1, isNight: boolean): THREE.Group {
  const rng = createRNG(seed);
  const group = new THREE.Group();

  let width = 6.0 + rng() * 2.5;
  const depth = 4.5 + rng() * 2.0;

  // Variedade autêntica brasileira
  const baseTypes = [
    'predio_3andares_branco', // 🏢 Grande casa/prédio de 3 andares branco
    'casa_tijolo_laranja',    // 🧱 Casa com textura de tijolos laranja realistas
    'sobrado',                // Sobrado colorido
    'terrea',                 // Casa térrea colonial
    'predio_3andares_branco', // Alta frequência
    'casa_tijolo_laranja',    // Alta frequência
    'comercio',               // Padaria / bar / loja
    'lote_vago',              // Lote em construção
  ];
  const baseType = baseTypes[Math.floor(rng() * baseTypes.length)];
  const palette = EXPANDED_HOUSE_PALETTES[Math.floor(rng() * EXPANDED_HOUSE_PALETTES.length)];
  const mats = getSharedMaterials();

  let wallMat: THREE.Material;
  let trimMat: THREE.Material;
  let doorMat: THREE.Material;
  let height = 3.4;

  if (baseType === 'predio_3andares_branco') {
    // 🏢 PRÉDIO / CASA GRANDE BRANCA DE 3 ANDARES
    height = 9.6;
    width = Math.max(7.2, width);
    const whiteTex = getWhitePlasterTexture();
    wallMat = new THREE.MeshStandardMaterial({ map: whiteTex, color: 0xffffff, roughness: 0.65 });
    trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
    doorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
  } else if (baseType === 'casa_tijolo_laranja') {
    // 🧱 CASA COM TIJOLOS LARANJA RÚSTICOS
    height = rng() > 0.45 ? 6.2 : 3.5;
    const brickTex = getOrangeBrickTexture();
    wallMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.88 });
    trimMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
    doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.55 });
  } else if (baseType === 'sobrado') {
    height = 5.8;
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = palette.wall;
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1500; i++) {
        ctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect(rng() * 256, rng() * 256, 2, 2);
      }
    }
    const wallTex = new THREE.CanvasTexture(canvas);
    wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 });
    trimMat = new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.4 });
    doorMat = new THREE.MeshStandardMaterial({ color: palette.door, roughness: 0.6 });
  } else if (baseType === 'comercio') {
    height = 3.6;
    wallMat = new THREE.MeshStandardMaterial({ color: palette.wall, roughness: 0.8 });
    trimMat = new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.4 });
    doorMat = new THREE.MeshStandardMaterial({ color: palette.door, roughness: 0.6 });
  } else if (baseType === 'lote_vago') {
    height = 2.0;
    wallMat = mats.brick;
    trimMat = new THREE.MeshStandardMaterial({ color: 0x78716c });
    doorMat = new THREE.MeshStandardMaterial({ color: 0x1c1917 });
  } else {
    height = 3.4;
    wallMat = new THREE.MeshStandardMaterial({ color: palette.wall, roughness: 0.85 });
    trimMat = new THREE.MeshStandardMaterial({ color: palette.trim, roughness: 0.4 });
    doorMat = new THREE.MeshStandardMaterial({ color: palette.door, roughness: 0.6 });
  }

  const windowTex = createWindowTexture(isNight);
  const windowMat = new THREE.MeshStandardMaterial({
    map: windowTex,
    roughness: 0.15,
    metalness: 0.2,
    emissive: isNight ? new THREE.Color(0xfbbf24) : new THREE.Color(0x000000),
    emissiveIntensity: isNight ? 0.85 : 0,
  });

  if (baseType !== 'lote_vago') {
    // 1. Corpo Principal da Casa
    const houseGeom = new THREE.BoxGeometry(width, height, depth);
    const houseMesh = new THREE.Mesh(houseGeom, wallMat);
    houseMesh.position.set(0, height / 2, -depth / 2 - 1.8);
    houseMesh.receiveShadow = true;
    group.add(houseMesh);

    // Portas e Janelas Térreas
    const doorH = 2.1;
    const doorW = 1.0;
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.08), doorMat);
    door.position.set(-width * 0.25, doorH / 2, -1.74);
    group.add(door);

    const win1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.08), windowMat);
    win1.position.set(width * 0.25, 1.6, -1.74);
    group.add(win1);

    // 🏢 2º ANDAR
    if (height >= 5.5) {
      const win2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.08), windowMat);
      win2.position.set(-width * 0.25, 4.4, -1.74);
      const win3 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.08), windowMat);
      win3.position.set(width * 0.25, 4.4, -1.74);
      group.add(win2, win3);

      const balconySlab = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.55, 0.18, 1.1),
        trimMat
      );
      balconySlab.position.set(0, 3.6, -1.25);
      group.add(balconySlab);

      const railMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.2 });
      const railing = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.53, 0.75, 0.06),
        railMat
      );
      railing.position.set(0, 4.05, -0.72);
      group.add(railing);
    }

    // 🏢 3º ANDAR (Prédios brancos de 3 andares)
    if (baseType === 'predio_3andares_branco') {
      const win4 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 0.08), windowMat);
      win4.position.set(-width * 0.25, 7.5, -1.74);
      const win5 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 0.08), windowMat);
      win5.position.set(width * 0.25, 7.5, -1.74);
      group.add(win4, win5);

      const balconySlab3 = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.52, 0.18, 1.0),
        trimMat
      );
      balconySlab3.position.set(0, 6.7, -1.3);
      group.add(balconySlab3);

      const glassRailing = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.50, 0.75, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.7, transparent: true, opacity: 0.65 })
      );
      glassRailing.position.set(0, 7.15, -0.82);
      group.add(glassRailing);
    }

    // Toldos e Placas para Comércio
    if (baseType === 'comercio') {
      const toldoColor = [0xdc2626, 0x2563eb, 0x16a34a, 0xd97706, 0x7c3aed][Math.floor(rng() * 5)];
      const toldo = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.88, 0.25, 1.4),
        new THREE.MeshStandardMaterial({ color: toldoColor, roughness: 0.4 })
      );
      toldo.position.set(0, 2.7, -1.0);
      toldo.rotation.x = 0.25;
      group.add(toldo);

      const signNames = ['PADARIA ESTRELA 🥖', 'BAR DO ZÉ 🍺', 'BORRACHARIA 24H 🔧', 'MERCADO CENTRAL 🛒', 'LANCHES DO GAÚCHO 🍔'];
      const signName = signNames[Math.floor(rng() * signNames.length)];
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512; signCanvas.height = 128;
      const sCtx = signCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#0f172a'; sCtx.fillRect(0, 0, 512, 128);
        sCtx.strokeStyle = '#f59e0b'; sCtx.lineWidth = 6;
        sCtx.strokeRect(4, 4, 504, 120);
        sCtx.fillStyle = '#fbbf24'; sCtx.font = 'bold 36px sans-serif';
        sCtx.textAlign = 'center'; sCtx.textBaseline = 'middle';
        sCtx.fillText(signName, 256, 64);
      }
      const signTex = new THREE.CanvasTexture(signCanvas);
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width * 0.75, 0.7),
        new THREE.MeshBasicMaterial({ map: signTex })
      );
      signMesh.position.set(0, 3.1, -1.72);
      group.add(signMesh);
    }

    // Telhados e Platibandas
    if (baseType === 'predio_3andares_branco') {
      const platibanda = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.3, 0.65, depth + 0.3),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
      );
      platibanda.position.set(0, height + 0.3, -depth / 2 - 1.8);
      group.add(platibanda);
    } else if (baseType === 'casa_tijolo_laranja' && rng() > 0.4) {
      const roofGeom = new THREE.ConeGeometry(width * 0.76, 1.8, 4);
      const roofMesh = new THREE.Mesh(roofGeom, mats.roofTiles);
      roofMesh.position.set(0, height + 0.9, -depth / 2 - 1.8);
      roofMesh.rotation.y = Math.PI / 4;
      group.add(roofMesh);
    } else {
      const platibanda = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.4, 0.6, depth + 0.4),
        trimMat
      );
      platibanda.position.set(0, height + 0.3, -depth / 2 - 1.8);
      group.add(platibanda);
    }

    // Caixa d'água Fortlev
    if (rng() < 0.7) {
      const cxMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.88, 12), mats.waterTank);
      cxMesh.position.set((rng() - 0.5) * (width * 0.5), height + 0.6, -depth / 2 - 1.8);
      group.add(cxMesh);
    }

    // AC Unit
    if (rng() < 0.5) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.38, 0.3), mats.acUnit);
      ac.position.set(-width * 0.35, height > 5 ? 3.8 : 2.5, -1.65);
      group.add(ac);
    }
  } else {
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(width, 2.0, 0.25), mats.brick);
    wallBack.position.set(0, 1.0, -depth / 2);
    group.add(wallBack);

    const pile = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.9), mats.brick);
    pile.position.set((rng() - 0.5) * (width * 0.5), 0.3, -1.2);
    group.add(pile);
  }

  // 🏡 MURO FRONTAL E PORTÕES REALISTAS VARIADOS
  const muroH = 1.85;
  const gateW = 2.4;
  const wallSegmentW = (width - gateW) / 2;

  const wallL = new THREE.Mesh(new THREE.BoxGeometry(wallSegmentW, muroH, 0.22), wallMat);
  wallL.position.set(-width / 2 + wallSegmentW / 2, muroH / 2, 0);
  group.add(wallL);

  const wallR = new THREE.Mesh(new THREE.BoxGeometry(wallSegmentW, muroH, 0.22), wallMat);
  wallR.position.set(width / 2 - wallSegmentW / 2, muroH / 2, 0);
  group.add(wallR);

  const pilarL = new THREE.Mesh(new THREE.BoxGeometry(0.24, muroH + 0.12, 0.26), trimMat);
  pilarL.position.set(-gateW / 2, (muroH + 0.12) / 2, 0);
  group.add(pilarL);

  const pilarR = new THREE.Mesh(new THREE.BoxGeometry(0.24, muroH + 0.12, 0.26), trimMat);
  pilarR.position.set(gateW / 2, (muroH + 0.12) / 2, 0);
  group.add(pilarR);

  // 🚪 Portão variado realista
  const gate = createVariedGate(gateW, rng, wallMat);
  gate.position.set(0, 0, 0);
  group.add(gate);

  group.userData.width = width;

  if (side === 1) {
    group.rotation.y = -Math.PI / 2;
  } else {
    group.rotation.y = Math.PI / 2;
  }

  return group;
}

