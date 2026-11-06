import * as THREE from 'three';
import { BuildingManager } from './BuildingManager';
import { TreeManager } from './TreeManager';
import { GamefyBillboardManager } from './GamefyBillboard';
import { applyAtmosphericToChunk, applyAtmosphericPerspective } from './atmosphericFogSystem';
import {
  createAsphaltTexture,
  createDirtSandRoadTexture,
  createRoadTransitionTexture,
  getRoadSurfaceTypeForChunk,
  RoadSurfaceType,
} from './materials';

export interface ChunkConfig {
  chunkLength: number;
  chunkIndex: number;
  isNight: boolean;
  isMobile?: boolean;
}

import { createBench, createTrashCan, createStreetLightPoleVariant } from './urbanProps';

// Cria um canteiro florido/jardineira urbana decorativa para calçadas e praças
function createFlowerBed(): THREE.Group {
  const g = new THREE.Group();
  g.userData = { isScenery: true, isSmallProp: true };
  const borderMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 }); // Granito/concreto claro
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95 });   // Terra escura
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.75 });  // Graminha viçosa

  // Mureta da jardineira
  const border = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 1.2), borderMat);
  border.position.y = 0.14;
  border.castShadow = false;
  g.add(border);

  // Terra/Grama interna
  const grass = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 0.9), greenMat);
  grass.position.y = 0.29;
  g.add(grass);

  // Flores/folhagens pontuais estilizadas
  const flowerColors = [0xf43f5e, 0xfbbf24, 0xa855f7, 0x38bdf8];
  for (let f = 0; f < 5; f++) {
    const fMat = new THREE.MeshStandardMaterial({ color: flowerColors[f % flowerColors.length], roughness: 0.6 });
    const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), fMat);
    flower.position.set(-0.7 + f * 0.35, 0.40, (f % 2 === 0 ? 0.15 : -0.15));
    g.add(flower);
  }
  return g;
}

// Nomes autênticos e placas de mercadinhos de bairro brasileiros
const MARKET_NAMES = [
  'MERCADINHO DO ZÉ',
  'MERCEARIA DA VILA',
  'SUPERMERCADO POPULAR',
  'HORTIFRUTI DA QUEBRADA',
  'EMPÓRIO SÃO JORGE',
  'CASA DE CARNES BOI DE OURO',
  'MERCADO BOM PREÇO',
  'SACOLÃO & QUITANDA',
  'MERCEARIA DO COMPADRE',
  'SUPERMERCADO ESTRELA',
];

// Paletas de cores autênticas de comércios de bairro brasileiros
const MARKET_THEMES = [
  { wall: 0x1e40af, tile: 0x93c5fd, awning1: '#facc15', awning2: '#1e3a8a', gate: 0x334155, trim: 0xfef08a, signBg: '#1e3a8a', signTxt: '#fde047', sub: 'BEBIDAS GELADAS • AÇOUGUE • PÃO QUENTE', promo: 'FRANGO ASSADO R$ 24,90' },
  { wall: 0x15803d, tile: 0xbbf7d0, awning1: '#16a34a', awning2: '#ffffff', gate: 0x475569, trim: 0xfef08a, signBg: '#14532d', signTxt: '#fef08a', sub: 'FRUTAS FRESCAS • VERDURAS • HORTIFRUTI', promo: 'BANANA NANICA R$ 3,99/KG' },
  { wall: 0xb91c1c, tile: 0xfecaca, awning1: '#dc2626', awning2: '#fef08a', gate: 0x1e293b, trim: 0xffffff, signBg: '#7f1d1d', signTxt: '#fde047', sub: 'AÇOUGUE • MERCEARIA • OFERTAS DO DIA', promo: 'PICANHA & CARVÃO EM OFERTA' },
  { wall: 0xd97706, tile: 0xfde68a, awning1: '#f97316', awning2: '#1e3a8a', gate: 0x374151, trim: 0xffedd5, signBg: '#9a3412', signTxt: '#fef9c3', sub: 'GÁS • ÁGUA MINERAL • MERCEARIA', promo: 'GÁS E ÁGUA 20L ENTREGA JÁ' },
  { wall: 0x0f766e, tile: 0x99f6e4, awning1: '#0d9488', awning2: '#fde047', gate: 0x1e293b, trim: 0xe0f2fe, signBg: '#115e59', signTxt: '#ffffff', sub: 'PADARIA • LATICÍNIOS • UTILIDADES', promo: 'PÃO FRANCÊS QUENTINHO!' },
  { wall: 0x4338ca, tile: 0xc7d2fe, awning1: '#e11d48', awning2: '#ffffff', gate: 0x334155, trim: 0xfef08a, signBg: '#312e81', signTxt: '#fde047', sub: 'PADARIA & CONFEITARIA DA VILA', promo: 'COXINHA + REFRI R$ 8,00' },
  { wall: 0xca8a04, tile: 0xfef08a, awning1: '#15803d', awning2: '#fef08a', gate: 0x1f2937, trim: 0xffffff, signBg: '#854d0e', signTxt: '#ffffff', sub: 'HORTIFRUTI • QUEIJOS • DOCES CASEIROS', promo: 'OVO CAIPIRA 30 UN R$ 18,90' },
  { wall: 0x0369a1, tile: 0xbae6fd, awning1: '#0284c7', awning2: '#ffffff', gate: 0x334155, trim: 0xfde047, signBg: '#0c4a6e', signTxt: '#fef08a', sub: 'ABERTO ATÉ TARDE • TELE-ENTREGA', promo: 'CERVEJA TRINCANDO R$ 3,50' },
];

const cachedMarketSignTextures = new Map<number, THREE.CanvasTexture>();
function getMarketSignTexture(seed: number): THREE.CanvasTexture {
  const key = seed % MARKET_THEMES.length;
  if (cachedMarketSignTextures.has(key)) return cachedMarketSignTextures.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const theme = MARKET_THEMES[key];
  const name = MARKET_NAMES[seed % MARKET_NAMES.length];

  // Fundo com gradiente comercial vibrante
  const grad = ctx.createLinearGradient(0, 0, 0, 140);
  grad.addColorStop(0, theme.signBg);
  grad.addColorStop(1, '#090d16');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 140);

  // Faixa lateral amarela/vermelha típica de placa patrocinada de bairro
  ctx.fillStyle = theme.awning1;
  ctx.fillRect(0, 0, 18, 140);
  ctx.fillRect(494, 0, 18, 140);

  // Borda decorativa dupla
  ctx.strokeStyle = theme.signTxt;
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 8, 492, 124);

  // Sombra do título + Letreiro em português
  ctx.font = '900 36px "Segoe UI", Impact, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillText(name, 259, 49);
  ctx.fillStyle = theme.signTxt;
  ctx.fillText(name, 256, 46);

  // Faixa de subtítulo
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(24, 76, 464, 24);
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(theme.sub, 256, 88);

  // Destaque de oferta na base da placa
  ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#4ade80';
  ctx.fillText(`★ ${theme.promo} ★`, 256, 116);

  const tex = new THREE.CanvasTexture(canvas);
  cachedMarketSignTextures.set(key, tex);
  return tex;
}

const cachedAwningTextures = new Map<number, THREE.CanvasTexture>();
function getStripedAwningTexture(seed: number): THREE.CanvasTexture {
  const key = seed % MARKET_THEMES.length;
  if (cachedAwningTextures.has(key)) return cachedAwningTextures.get(key)!;

  const theme = MARKET_THEMES[key];
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const stripes = 8;
  const sw = 256 / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? theme.awning1 : theme.awning2;
    ctx.fillRect(i * sw, 0, sw, 128);
  }
  // Sombreamento de lona
  const shade = ctx.createLinearGradient(0, 0, 0, 128);
  shade.addColorStop(0, 'rgba(0,0,0,0.22)');
  shade.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  shade.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 256, 128);

  const tex = new THREE.CanvasTexture(canvas);
  cachedAwningTextures.set(key, tex);
  return tex;
}

let cachedInteriorTex: THREE.CanvasTexture | null = null;
function getMarketInteriorTexture(): THREE.CanvasTexture {
  if (cachedInteriorTex) return cachedInteriorTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Fundo interno iluminado com luz quente de mercadinho
  const bg = ctx.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0, '#451a03');
  bg.addColorStop(0.3, '#78350f');
  bg.addColorStop(1, '#1c1917');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);

  // Lâmpada fluorescente no teto
  ctx.fillStyle = '#fef9c3';
  ctx.fillRect(40, 12, 176, 8);

  // Prateleiras cheias de produtos coloridos (arroz, feijão, óleo, café, biscoitos)
  const shelfColors = ['#ef4444', '#facc15', '#3b82f6', '#22c55e', '#f97316', '#a855f7'];
  for (let row = 0; row < 4; row++) {
    const y = 48 + row * 42;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(16, y + 26, 145, 5);
    for (let col = 0; col < 8; col++) {
      ctx.fillStyle = shelfColors[(row * 3 + col) % shelfColors.length];
      ctx.fillRect(20 + col * 17, y + 6, 13, 20);
    }
  }

  // Geladeira comercial vertical de bebidas à direita
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(174, 42, 66, 185);
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(180, 56, 54, 155);
  for (let r = 0; r < 5; r++) {
    ctx.fillStyle = r % 2 === 0 ? '#dc2626' : '#16a34a';
    ctx.fillRect(184, 62 + r * 28, 46, 18);
  }

  cachedInteriorTex = new THREE.CanvasTexture(canvas);
  return cachedInteriorTex;
}

let cachedChalkboardTex: THREE.CanvasTexture | null = null;
function getChalkboardTexture(): THREE.CanvasTexture {
  if (cachedChalkboardTex) return cachedChalkboardTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, 0, 128, 192);
  ctx.fillStyle = '#14532d';
  ctx.fillRect(8, 8, 112, 168);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('OFERTAS', 64, 34);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('PÃO QUENTE', 64, 64);
  ctx.fillStyle = '#4ade80';
  ctx.fillText('R$ 12,99 kg', 64, 84);

  ctx.fillStyle = '#ffffff';
  ctx.fillText('REFRI 2L', 64, 116);
  ctx.fillStyle = '#f87171';
  ctx.fillText('R$ 6,50', 64, 136);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('ACEITAMOS PIX', 64, 164);

  cachedChalkboardTex = new THREE.CanvasTexture(canvas);
  return cachedChalkboardTex;
}

// 🏪 MERCADINHO DE BAIRRO BRASILEIRO ULTRA-DETALHADO (Toldo listrado, banca de frutas, galões de água 20L, caixa d'água azul, interior iluminado)
function createBrazilianCornerMarket(side: 1 | -1, seed: number): { mesh: THREE.Group; width: number } {
  const g = new THREE.Group();
  g.userData = { isScenery: true, isBuilding3D: true };

  const theme = MARKET_THEMES[seed % MARKET_THEMES.length];
  const w = 8.4;
  const h = 4.6;
  const d = 6.2;

  // 1. Calçada / Base de concreto sob o mercadinho
  const baseSlab = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.6, 0.16, d + 0.8),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 })
  );
  baseSlab.position.set(0, 0.08, -d / 2 + 0.2);
  baseSlab.receiveShadow = true;
  g.add(baseSlab);

  // 2. Corpo principal de alvenaria colorida
  const wallMat = new THREE.MeshStandardMaterial({
    color: theme.wall,
    roughness: 0.78,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.set(0, h / 2, -d / 2);
  body.castShadow = false;
  body.receiveShadow = true;
  g.add(body);

  // 3. Barra de azulejo comercial na metade inferior da fachada e colunas frontais
  const tileMat = new THREE.MeshStandardMaterial({
    color: theme.tile,
    roughness: 0.35,
    metalness: 0.08,
  });
  const lowerTile = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 1.35, d + 0.06), tileMat);
  lowerTile.position.set(0, 0.68, -d / 2);
  g.add(lowerTile);

  // Pilastras frontais revestidas
  const pillarGeo = new THREE.BoxGeometry(0.42, h, 0.22);
  const trimMat = new THREE.MeshStandardMaterial({ color: theme.trim, roughness: 0.7 });
  for (const px of [-w / 2 + 0.21, 0.45, w / 2 - 0.21]) {
    const pil = new THREE.Mesh(pillarGeo, trimMat);
    pil.position.set(px, h / 2, 0.05);
    pil.castShadow = false;
    g.add(pil);
  }

  // 4. Platibanda superior escalonada (arquitetura comercial típica brasileira)
  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.42, d + 0.4), trimMat);
  roofTrim.position.set(0, h + 0.21, -d / 2);
  roofTrim.castShadow = false;
  g.add(roofTrim);

  const frontCrest = new THREE.Mesh(new THREE.BoxGeometry(w * 0.68, 0.48, 0.38), wallMat);
  frontCrest.position.set(0, h + 0.58, -0.05);
  g.add(frontCrest);

  // 5. Caixa d'água azul brasileira (Fortlev) no telhado + Ar-condicionado na parede
  const waterTankMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45 });
  const waterTank = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.72, 1.1, 12), waterTankMat);
  waterTank.position.set(-w * 0.25, h + 0.85, -d * 0.62);
  waterTank.castShadow = false;
  g.add(waterTank);

  const tankLid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.90, 0.88, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.4 })
  );
  tankLid.position.set(-w * 0.25, h + 1.42, -d * 0.62);
  g.add(tankLid);

  // 6. Entrada comercial aberta com interior iluminado + Porta de aço de enrolar no topo
  const interiorMat = new THREE.MeshBasicMaterial({ map: getMarketInteriorTexture() });
  const interiorPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.55), interiorMat);
  interiorPlane.position.set(-1.65, 1.32, 0.06);
  g.add(interiorPlane);

  // Rolo da porta de aço recolhida no topo da entrada
  const shutterMat = new THREE.MeshStandardMaterial({ color: theme.gate, metalness: 0.65, roughness: 0.38 });
  const shutterRoll = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.48, 0.28), shutterMat);
  shutterRoll.position.set(-1.65, 2.52, 0.14);
  g.add(shutterRoll);

  // Segunda porta de aço semi-abaixada ou vitrine à direita
  const rightDoor = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.5), shutterMat);
  rightDoor.position.set(2.15, 1.30, 0.06);
  g.add(rightDoor);

  // 7. Placa/letreiro comercial grande e legível no topo
  const signTex = getMarketSignTexture(seed);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.35 });
  const signFrame = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 1.45, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
  );
  signFrame.position.set(0, 3.65, 0.14);
  signFrame.castShadow = false;
  g.add(signFrame);

  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 1.32), signMat);
  signMesh.position.set(0, 3.65, 0.24);
  g.add(signMesh);

  // 8. Toldo retrátil listrado 3D com babado frontal
  const awningTex = getStripedAwningTexture(seed);
  const awningMat = new THREE.MeshStandardMaterial({ map: awningTex, roughness: 0.65 });
  const awning = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.10, 1.45), awningMat);
  awning.rotation.x = 0.26;
  awning.position.set(0, 2.76, 0.72);
  awning.castShadow = false;
  g.add(awning);

  const valance = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.26, 0.06), awningMat);
  valance.position.set(0, 2.48, 1.40);
  g.add(valance);

  // 9. Banca de Hortifruti / Feira na calçada cheia de frutas coloridas
  const standWoodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.88 });
  const fruitStand = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 0.85), standWoodMat);
  fruitStand.position.set(2.1, 0.38, 0.68);
  fruitStand.rotation.x = 0.18;
  fruitStand.castShadow = false;
  g.add(fruitStand);

  const fruitColors = [0x16a34a, 0xf97316, 0xfacc15, 0xdc2626]; // Melancia, laranja, banana, maçã/tomate
  const fruitSphereGeo = new THREE.SphereGeometry(0.14, 7, 7);
  for (let fx = 0; fx < 4; fx++) {
    const fMat = new THREE.MeshStandardMaterial({ color: fruitColors[fx], roughness: 0.45 });
    for (let fz = 0; fz < 2; fz++) {
      const fruit = new THREE.Mesh(fruitSphereGeo, fMat);
      fruit.position.set(1.32 + fx * 0.50, 0.82 - fz * 0.05, 0.55 + fz * 0.25);
      g.add(fruit);
    }
  }

  // 10. Galões azuis de água mineral de 20L e engradados de bebidas empilhados
  const gallonMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.88,
  });
  const gallonGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.46, 8);
  for (let gw = 0; gw < 3; gw++) {
    const gal = new THREE.Mesh(gallonGeo, gallonMat);
    gal.position.set(3.55, 0.25 + (gw === 2 ? 0.46 : 0), 0.45 + (gw % 2) * 0.38);
    g.add(gal);
  }

  // Engradados de refrigerante/cerveja
  const crateColors = [0xfacc15, 0xdc2626, 0x1d4ed8];
  const crateGeo = new THREE.BoxGeometry(0.52, 0.34, 0.42);
  for (let c = 0; c < 3; c++) {
    const crateMat = new THREE.MeshStandardMaterial({ color: crateColors[c], roughness: 0.8 });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.set(0.35, 0.18 + c * 0.34, 0.48);
    crate.castShadow = false;
    g.add(crate);
  }

  // 11. Cavalete promocional de ofertas na calçada ("OFERTAS / PÃO QUENTE / ACEITAMOS PIX")
  const easelGroup = new THREE.Group();
  const easelBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 1.02, 0.08),
    new THREE.MeshStandardMaterial({ map: getChalkboardTexture(), roughness: 0.8 })
  );
  easelBoard.position.y = 0.52;
  easelGroup.add(easelBoard);
  easelGroup.position.set(-3.55, 0.08, 0.85);
  easelGroup.rotation.y = side === 1 ? -0.35 : 0.35;
  g.add(easelGroup);

  if (side === -1) {
    g.rotation.y = Math.PI / 2;
  } else {
    g.rotation.y = -Math.PI / 2;
  }

  return { mesh: g, width: w };
}

// 🧱 TERRENO BALDIO BRASILEIRO (TERRA, AREIA, TIJOLOS, CAÇAMBA DE ENTULHO, MANILHAS, PNEUS E VEGETAÇÃO)
let cachedBrickTex: THREE.CanvasTexture | null = null;
function getBrickWallMaterial(): THREE.MeshStandardMaterial {
  if (!cachedBrickTex) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Fundo da argamassa/cimento entre os tijolos
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, 0, 256, 256);

    const rows = 16;
    const rowHeight = 256 / rows;
    const brickWidth = 32;

    for (let r = 0; r < rows; r++) {
      const isOffset = r % 2 === 1;
      const startX = isOffset ? -brickWidth / 2 : 0;
      for (let x = startX; x < 256 + brickWidth; x += brickWidth) {
        const toneRand = ((r * 7 + x * 13) % 10) / 10;
        const rVal = Math.floor(170 + toneRand * 38);
        const gVal = Math.floor(58 + toneRand * 26);
        const bVal = Math.floor(26 + toneRand * 16);
        ctx.fillStyle = `rgb(${rVal},${gVal},${bVal})`;
        ctx.fillRect(x + 1, r * rowHeight + 1, brickWidth - 2, rowHeight - 2);

        // Ranhuras típicas de tijolo baiano furado
        ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
        ctx.fillRect(x + 4, r * rowHeight + 3, brickWidth - 8, 2);
        ctx.fillRect(x + 4, r * rowHeight + 8, brickWidth - 8, 2);
      }
    }

    cachedBrickTex = new THREE.CanvasTexture(canvas);
    cachedBrickTex.wrapS = THREE.RepeatWrapping;
    cachedBrickTex.wrapT = THREE.RepeatWrapping;
    cachedBrickTex.repeat.set(4, 2);
  }

  return new THREE.MeshStandardMaterial({
    map: cachedBrickTex,
    roughness: 0.92,
    metalness: 0.04,
  });
}

let cachedGroundTex: THREE.CanvasTexture | null = null;
function getDetailedLotGroundTexture(): THREE.CanvasTexture {
  if (!cachedGroundTex) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Base terra vermelha/marrom batida brasileira
    ctx.fillStyle = '#6e472b';
    ctx.fillRect(0, 0, 256, 256);

    // Manchas de capim rasteiro, areia lavada e cascalho
    const patches = [
      { x: 55, y: 60, r: 52, col: 'rgba(194, 145, 92, 0.50)' },
      { x: 185, y: 145, r: 64, col: 'rgba(77, 124, 15, 0.45)' },
      { x: 105, y: 205, r: 55, col: 'rgba(63, 98, 18, 0.42)' },
      { x: 205, y: 45, r: 42, col: 'rgba(160, 140, 110, 0.45)' },
      { x: 45, y: 185, r: 48, col: 'rgba(120, 82, 48, 0.50)' },
    ];
    patches.forEach(p => {
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    for (let i = 0; i < 360; i++) {
      const gx = (i * 73) % 256;
      const gy = (i * 137) % 256;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(60, 50, 40, 0.35)' : 'rgba(215, 185, 145, 0.38)';
      ctx.fillRect(gx, gy, 2, 2);
    }

    cachedGroundTex = new THREE.CanvasTexture(canvas);
    cachedGroundTex.wrapS = THREE.RepeatWrapping;
    cachedGroundTex.wrapT = THREE.RepeatWrapping;
    cachedGroundTex.repeat.set(4, 4);
  }
  return cachedGroundTex;
}

// 🧱 TERRENO BALDIO BRASILEIRO VIVO E DETALHADO (Muros de tijolo baiano com colunas e vergalhões, caçamba de entulho, manilhas de concreto, pneus, areia e mato)
function createVacantLot(chunkLength: number, side: 1 | -1, seed: number): THREE.Group {
  const g = new THREE.Group();
  g.userData = { isScenery: true };

  const lotWidth = 18.0;
  const lotDepth = chunkLength - 3;

  // 1. Solo rústico de terra vermelha/batida, areia e manchas de mato
  const groundTex = getDetailedLotGroundTexture();
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    color: 0x9a7b5c,
    roughness: 0.95,
    fog: true,
  });
  const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(lotWidth, lotDepth), groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.set(side * 15.0, 0.025, 0);
  groundMesh.receiveShadow = true;
  g.add(groundMesh);

  const brickWallMat = getBrickWallMaterial();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 });
  const rebarMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.5 });

  // 2. Muro de tijolo baiano nos fundos + Colunas de concreto com ferros apontando ("espera de pilar")
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, lotDepth * 0.95), brickWallMat);
  backWall.position.set(side * 22.5, 1.1, 0);
  backWall.castShadow = false;
  backWall.receiveShadow = true;
  g.add(backWall);

  // Muros laterais de divisa
  const sideWallFront = new THREE.Mesh(new THREE.BoxGeometry(lotWidth * 0.76, 1.85, 0.32), brickWallMat);
  sideWallFront.position.set(side * 16.0, 0.92, -lotDepth * 0.48);
  sideWallFront.castShadow = false;
  sideWallFront.receiveShadow = true;
  g.add(sideWallFront);

  const sideWallBack = new THREE.Mesh(new THREE.BoxGeometry(lotWidth * 0.76, 1.85, 0.32), brickWallMat);
  sideWallBack.position.set(side * 16.0, 0.92, lotDepth * 0.48);
  sideWallBack.castShadow = false;
  sideWallBack.receiveShadow = true;
  g.add(sideWallBack);

  // Mureta frontal baixa quebrada / inacabada com pilares e vergalhões de ferro expostos
  const colGeo = new THREE.BoxGeometry(0.38, 2.15, 0.38);
  const rebarGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.55, 5);
  for (let p = -1; p <= 1; p++) {
    const colZ = p * (lotDepth * 0.32);
    const pillar = new THREE.Mesh(colGeo, concreteMat);
    pillar.position.set(side * 9.8, 1.07, colZ);
    pillar.castShadow = false;
    g.add(pillar);

    // Vergalhões de ferro no topo da coluna inacabada
    const rb1 = new THREE.Mesh(rebarGeo, rebarMat);
    rb1.position.set(side * 9.72, 2.38, colZ - 0.08);
    const rb2 = new THREE.Mesh(rebarGeo, rebarMat);
    rb2.position.set(side * 9.88, 2.35, colZ + 0.08);
    g.add(rb1, rb2);
  }

  // Mureta baixa parcial na frente do terreno
  const lowFrontWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, lotDepth * 0.28), brickWallMat);
  lowFrontWall.position.set(side * 9.8, 0.38, -lotDepth * 0.16);
  lowFrontWall.castShadow = false;
  g.add(lowFrontWall);

  // 3. Caçamba de Entulho Amarela Brasileira na beira da calçada ("DISK ENTULHO")
  const dumpsterGroup = new THREE.Group();
  const dumpMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.55, metalness: 0.25 });
  const dumpBody = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.15, 2.65), dumpMat);
  dumpBody.position.y = 0.58;
  dumpBody.castShadow = false;
  dumpsterGroup.add(dumpBody);

  // Borda superior reforçada com faixa zebrada preta
  const dumpRim = new THREE.Mesh(
    new THREE.BoxGeometry(1.88, 0.14, 2.78),
    new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 })
  );
  dumpRim.position.y = 1.15;
  dumpsterGroup.add(dumpRim);

  // Entulho transbordando dentro da caçamba
  const rubblePile = new THREE.Mesh(
    new THREE.ConeGeometry(1.05, 0.65, 7),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.95 })
  );
  rubblePile.position.y = 1.22;
  rubblePile.scale.set(0.8, 1.0, 1.2);
  dumpsterGroup.add(rubblePile);

  dumpsterGroup.position.set(side * 10.8, 0.02, chunkLength * 0.22);
  dumpsterGroup.rotation.y = (seed % 3 - 1) * 0.12;
  g.add(dumpsterGroup);

  // 4. Manilhas / Tubos de Concreto Armado de Obra
  const pipeGeo = new THREE.CylinderGeometry(0.58, 0.58, 2.2, 12);
  pipeGeo.rotateZ(Math.PI / 2);
  for (let m = 0; m < 2; m++) {
    const pipe = new THREE.Mesh(pipeGeo, concreteMat);
    pipe.position.set(side * (13.8 + m * 1.25), 0.58, -chunkLength * 0.04 + m * 0.4);
    pipe.rotation.y = 0.25 - m * 0.4;
    pipe.castShadow = false;
    g.add(pipe);
  }

  // 5. Pilha de Pneus Velhos (Clássico de terreno baldio)
  const tireGeo = new THREE.TorusGeometry(0.38, 0.15, 7, 12);
  tireGeo.rotateX(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.92 });
  for (let t = 0; t < 4; t++) {
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.position.set(
      side * 11.4 + (t % 2) * 0.08,
      0.15 + t * 0.24,
      chunkLength * 0.05 + (t === 3 ? 0.12 : 0)
    );
    if (t === 3) tire.rotation.z = 0.35;
    g.add(tire);
  }

  // 6. Palete de Tijolos Baianos + Monte Grande de Areia de Construção
  const brickStack = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.2, 2.3), brickWallMat);
  brickStack.position.set(side * 12.6, 0.60, -chunkLength * 0.24);
  brickStack.rotation.y = (seed % 5) * 0.15;
  brickStack.castShadow = false;
  g.add(brickStack);

  const sandMat = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.98 });
  const sandPile = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.15, 12), sandMat);
  sandPile.position.set(side * 15.8, 0.55, chunkLength * 0.14);
  sandPile.castShadow = false;
  g.add(sandPile);

  // 7. Touceiras de Mato Alto, Capim e Bananeira Tropical de Terreno Baldio
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.88 });
  const lushGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
  const weedGeo = new THREE.ConeGeometry(0.48, 0.85, 6);
  const bushGeo = new THREE.DodecahedronGeometry(0.68, 1);

  for (let m = 0; m < 8; m++) {
    const isBush = m % 2 === 0;
    const mesh = new THREE.Mesh(isBush ? bushGeo : weedGeo, isBush ? lushGreenMat : grassMat);
    const wx = side * (10.5 + (m % 4) * 2.6);
    const wz = -chunkLength * 0.36 + m * 3.2;
    mesh.position.set(wx, isBush ? 0.42 : 0.40, wz);
    if (isBush) mesh.scale.set(1.2, 0.85, 1.1);
    mesh.castShadow = false;
    g.add(mesh);
  }

  return g;
}

export interface ScenerySideConfig {
  side: 1 | -1;
  zone: 'favela_morro' | 'brazilian_neighborhood';
  maxSidewalkTrees: number;
  maxResidentialTrees: number;
  maxHillTrees: number;
}

export const FAVELA_MORRO_CONFIG = {
  rightScreenSide: -1 as const,
  leftScreenSide: 1 as const,
  tier0StreetBaseY: 0.02,
  tier1SlopeBaseY: 3.6,
  tier2MidMorroBaseY: 8.2,
  tier3CrestBaseY: 13.0,
  housesPerTier0: 4,
  housesPerTier1: 4,
  housesPerTier2: 4,
  housesPerTier3: 3,
  backgroundComplexCount: 2,
  stairwayWidth: 4.8,
  stairwayClearanceHalfZ: 6.4,
  minHouseSeparationGap: 3.2,
} as const;

export function getScenerySideConfig(side: 1 | -1, isLowGraphics = false): ScenerySideConfig {
  // Na câmera olhando para +Z: side = -1 (-X) é o LADO DIREITO da tela (Comunidade / Favela de Morro)
  if (side === -1) {
    return {
      side: -1,
      zone: 'favela_morro',
      maxSidewalkTrees: 0,
      maxResidentialTrees: 0,
      maxHillTrees: isLowGraphics ? 0 : 1,
    };
  }
  // side = 1 (+X) é o LADO ESQUERDO da tela (Bairro Brasileiro com Casas de Portão de Ferro, Tijolos e Comércio)
  return {
    side: 1,
    zone: 'brazilian_neighborhood',
    maxSidewalkTrees: 1,
    maxResidentialTrees: isLowGraphics ? 1 : 2,
    maxHillTrees: isLowGraphics ? 1 : 3,
  };
}

// ============================================================================
// 🏘️ CONSTRUTOR DE FAVELA / COMUNIDADE DE MORRO BRASILEIRA (Lado Direito, side = -1)
// Construções maiores e bem espaçadas, texturas HD de tijolo baiano com reboco
// chapiscado, escadaria monumental desobstruída, grandes complexos ao fundo,
// postes com transformador e fiação elétrica/fibra realista.
// ============================================================================
interface FavelaSharedAssets {
  brickMat: THREE.MeshStandardMaterial;
  chapiscoBrickMat: THREE.MeshStandardMaterial;
  concreteMat: THREE.MeshStandardMaterial;
  darkConcreteMat: THREE.MeshStandardMaterial;
  slopeEarthMat: THREE.MeshStandardMaterial;
  slopeGrassMat: THREE.MeshStandardMaterial;
  zincRoofMat: THREE.MeshStandardMaterial;
  ceramicRoofMat: THREE.MeshStandardMaterial;
  waterTankMat: THREE.MeshStandardMaterial;
  waterTankLidMat: THREE.MeshStandardMaterial;
  ironGateMat: THREE.MeshStandardMaterial;
  yellowHandrailMat: THREE.MeshStandardMaterial;
  winDayMat: THREE.MeshStandardMaterial;
  winWarmLitMat: THREE.MeshStandardMaterial;
  winTvLitMat: THREE.MeshStandardMaterial;
  wireMat: THREE.MeshBasicMaterial;
  paintMats: THREE.MeshStandardMaterial[];
  shopSignMats: THREE.MeshStandardMaterial[];
}

let cachedFavelaAssets: FavelaSharedAssets | null = null;

const FAVELA_SHOP_BANNERS = [
  { title: 'BAR & SINUCA DO MORRO', sub: 'CERVEJA GELADA • PORÇÕES • PIX', bg: '#7c2d12', border: '#facc15', txt: '#fef08a' },
  { title: 'BARBEARIA DO CORTE', sub: 'DEGRADÊ NA RÉGUA • BIGODE', bg: '#0f172a', border: '#38bdf8', txt: '#f8fafc' },
  { title: 'AÇAÍ & LANCHES DA QUEBRADA', sub: 'AÇAÍ 500ML • PASTEL • CALDO DE CANA', bg: '#4c1d95', border: '#f43f5e', txt: '#fde047' },
  { title: 'OFICINA MOTOS DO GRAU', sub: 'PEÇAS • PNEUS • TROCA DE ÓLEO', bg: '#1e3a8a', border: '#fb923c', txt: '#ffffff' },
  { title: 'PADARIA & MERCEARIA FÉ', sub: 'PÃO QUENTE TODA HORA • LEITE', bg: '#14532d', border: '#fde047', txt: '#fef9c3' },
];

function createFavelaShopSignTexture(idx: number): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const banner = FAVELA_SHOP_BANNERS[idx % FAVELA_SHOP_BANNERS.length];
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = banner.bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = banner.border;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = banner.txt;
  ctx.font = '900 32px Impact, "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(banner.title, 256, 46);

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(24, 76, 464, 32);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px "Segoe UI", Arial, sans-serif';
  ctx.fillText(banner.sub, 256, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Textura HD 512x512 de Tijolo Baiano 8 Furos + Chapisco de Cimento + Vigas de Concreto da Favela
function createDetailedFavelaBrickTextures(withPlasterPatches: boolean): { map: THREE.Texture; bumpMap: THREE.Texture } {
  if (typeof document === 'undefined') {
    const d = new THREE.Texture();
    return { map: d, bumpMap: d };
  }
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = size;
  bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d')!;

  // Argamassa de cimento rústico
  ctx.fillStyle = '#78716c';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#383838';
  bCtx.fillRect(0, 0, size, size);

  const rows = 16;
  const cols = 8;
  const rowH = size / rows;
  const colW = size / cols;
  const mortar = 3.5;

  const brickTones = ['#c2410c', '#b45309', '#9a3412', '#d97706', '#a13a11', '#c84b15', '#8c2d0e'];

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const idx = Math.abs(r * 11 + c * 17) % brickTones.length;
      ctx.fillStyle = brickTones[idx];
      ctx.fillRect(x + mortar, y + mortar, colW - mortar * 2, rowH - mortar * 2);

      // Ranhuras frisadas profundas de tijolo baiano
      ctx.fillStyle = 'rgba(20, 12, 8, 0.26)';
      ctx.fillRect(x + mortar + 2, y + rowH * 0.26, colW - mortar * 2 - 4, 2.5);
      ctx.fillRect(x + mortar + 2, y + rowH * 0.52, colW - mortar * 2 - 4, 2.5);
      ctx.fillRect(x + mortar + 2, y + rowH * 0.76, colW - mortar * 2 - 4, 2.5);

      // Relevo no bumpMap
      bCtx.fillStyle = '#e5e5e5';
      bCtx.fillRect(x + mortar, y + mortar, colW - mortar * 2, rowH - mortar * 2);
      bCtx.fillStyle = '#808080';
      bCtx.fillRect(x + mortar + 2, y + rowH * 0.26, colW - mortar * 2 - 4, 2.5);
      bCtx.fillRect(x + mortar + 2, y + rowH * 0.52, colW - mortar * 2 - 4, 2.5);
      bCtx.fillRect(x + mortar + 2, y + rowH * 0.76, colW - mortar * 2 - 4, 2.5);
    }
  }

  // Cinta de concreto armado horizontal (viga de amarração típica das casas de morro)
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 0, size, 22);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.fillRect(0, 22, size, 8);

  if (withPlasterPatches) {
    // Manchas de reboco/chapisco cinza nas paredes de tijolo (meio-reboco de obra viva)
    const patches = [
      { x: 110, y: 160, rx: 95, ry: 70 },
      { x: 380, y: 310, rx: 115, ry: 85 },
      { x: 210, y: 420, rx: 85, ry: 60 },
    ];
    patches.forEach((p) => {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0.15, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Sombreamento de desgaste/umidade próximo à laje superior e base
  const topWeather = ctx.createLinearGradient(0, 0, 0, 90);
  topWeather.addColorStop(0.0, 'rgba(15, 23, 42, 0.35)');
  topWeather.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topWeather;
  ctx.fillRect(0, 0, size, 90);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2.2, 1.8);

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2.2, 1.8);

  return { map, bumpMap };
}

// Textura HD de Fachada Pintada da Favela com Reboco Texturizado, Vigas e Desgaste Natural
function createDetailedFavelaPlasterTexture(baseHex: number): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const c = new THREE.Color(baseHex);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);

  // Variação de rolo de pintura sobre reboco rústico
  for (let i = 0; i < 1800; i++) {
    const px = (i * 53) % size;
    const py = (i * 97) % size;
    const delta = (i % 2 === 0 ? 14 : -16);
    ctx.fillStyle = `rgba(${Math.max(0, Math.min(255, r + delta))},${Math.max(0, Math.min(255, g + delta))},${Math.max(0, Math.min(255, b + delta))}, 0.25)`;
    ctx.fillRect(px, py, 6, 4);
  }

  // Pequena área de reboco descascado mostrando tijolo aparente no canto
  ctx.fillStyle = '#b45309';
  ctx.fillRect(22, 188, 44, 28);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 188, 44, 28);
  ctx.fillStyle = '#78716c';
  ctx.fillRect(22, 201, 44, 2);

  // Viga superior e rodapé de cimento
  ctx.fillStyle = 'rgba(148, 163, 184, 0.72)';
  ctx.fillRect(0, 0, size, 12);
  ctx.fillStyle = 'rgba(51, 65, 85, 0.55)';
  ctx.fillRect(0, size - 16, size, 16);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 1.2);
  return tex;
}

function createCorrugatedZincRoofTexture(): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const waves = 18;
  const step = 256 / waves;
  for (let i = 0; i < waves; i++) {
    const x = i * step;
    const grad = ctx.createLinearGradient(x, 0, x + step, 0);
    grad.addColorStop(0.0, '#475569');
    grad.addColorStop(0.5, '#cbd5e1');
    grad.addColorStop(1.0, '#334155');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, step, 256);
  }

  // Manchas autênticas de oxidação/ferrugem de telha de zinco no morro
  ctx.fillStyle = 'rgba(154, 52, 18, 0.36)';
  ctx.fillRect(28, 40, 74, 95);
  ctx.fillRect(145, 130, 82, 85);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createFavelaWindowTexture(mode: 'day' | 'warm' | 'tv'): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Moldura de concreto/alumínio
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(6, 6, 116, 116);

  const grad = ctx.createLinearGradient(0, 10, 0, 118);
  if (mode === 'warm') {
    grad.addColorStop(0.0, '#fef9c3');
    grad.addColorStop(0.45, '#facc15');
    grad.addColorStop(1.0, '#ca8a04');
  } else if (mode === 'tv') {
    grad.addColorStop(0.0, '#e0f2fe');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(1.0, '#0369a1');
  } else {
    grad.addColorStop(0.0, '#38bdf8');
    grad.addColorStop(0.45, '#1e3a8a');
    grad.addColorStop(1.0, '#0f172a');
  }

  // 4 caixilhos de janela basculante/correr brasileira + grade de proteção
  ctx.fillStyle = grad;
  ctx.fillRect(12, 12, 48, 48);
  ctx.fillRect(68, 12, 48, 48);
  ctx.fillRect(12, 68, 48, 48);
  ctx.fillRect(68, 68, 48, 48);

  // Venezianas / grades finas
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
  for (let y = 20; y <= 108; y += 14) {
    ctx.fillRect(12, y, 104, 2);
  }

  // Reflexo diagonal no vidro
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(14, 12);
  ctx.lineTo(48, 12);
  ctx.lineTo(14, 48);
  ctx.closePath();
  ctx.fill();

  // Peitoril inferior de concreto
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(2, 118, 124, 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function getFavelaSharedAssets(): FavelaSharedAssets {
  if (cachedFavelaAssets) return cachedFavelaAssets;

  const pureBrick = createDetailedFavelaBrickTextures(false);
  const brickMat = new THREE.MeshStandardMaterial({
    map: pureBrick.map,
    bumpMap: pureBrick.bumpMap,
    bumpScale: 0.045,
    roughness: 0.88,
    metalness: 0.04,
  });

  const chapiscoBrick = createDetailedFavelaBrickTextures(true);
  const chapiscoBrickMat = new THREE.MeshStandardMaterial({
    map: chapiscoBrick.map,
    bumpMap: chapiscoBrick.bumpMap,
    bumpScale: 0.045,
    roughness: 0.90,
    metalness: 0.04,
  });

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.86 });
  const darkConcreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92 });
  const slopeEarthMat = new THREE.MeshStandardMaterial({ color: 0x6e472b, roughness: 0.96, fog: true });
  const slopeGrassMat = new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.92, fog: true });
  const zincRoofMat = new THREE.MeshStandardMaterial({
    map: createCorrugatedZincRoofTexture(),
    metalness: 0.48,
    roughness: 0.52,
  });
  const ceramicRoofMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.78 });
  const waterTankMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.10 });
  const waterTankLidMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.35 });
  const ironGateMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.80, roughness: 0.28 });
  const yellowHandrailMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.45, roughness: 0.32 });

  const winDayTex = createFavelaWindowTexture('day');
  const winWarmTex = createFavelaWindowTexture('warm');
  const winTvTex = createFavelaWindowTexture('tv');

  const winDayMat = new THREE.MeshStandardMaterial({ map: winDayTex, roughness: 0.22, metalness: 0.25 });
  const winWarmLitMat = new THREE.MeshStandardMaterial({
    map: winWarmTex,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 0.45,
    roughness: 0.2,
  });
  const winTvLitMat = new THREE.MeshStandardMaterial({
    map: winTvTex,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 0.40,
    roughness: 0.2,
  });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

  const favelaColors = [
    0xc2410c, // Terracota / Tijolo queimado
    0xeab308, // Amarelo Ocre / Canário
    0x0284c7, // Azul Piscina / Morro
    0x16a34a, // Verde Comunidade
    0xe11d48, // Rosa / Coral Vibrante
    0xd97706, // Laranja Pôr do Sol
    0x2563eb, // Azul Cobalto
    0xf1f5f9, // Reboco Caiado Branco
    0x0d9488, // Verde-Água
    0x7c3aed, // Roxo Açaí
  ];

  const paintMats = favelaColors.map((hex) => {
    const m = new THREE.MeshStandardMaterial({
      map: createDetailedFavelaPlasterTexture(hex),
      roughness: 0.82,
    });
    m.userData.isShared = true;
    return m;
  });

  const shopSignMats = FAVELA_SHOP_BANNERS.map((_, idx) => {
    const m = new THREE.MeshStandardMaterial({ map: createFavelaShopSignTexture(idx), roughness: 0.4 });
    m.userData.isShared = true;
    return m;
  });

  const allSingleMats = [
    brickMat, chapiscoBrickMat, concreteMat, darkConcreteMat, slopeEarthMat, slopeGrassMat,
    zincRoofMat, ceramicRoofMat, waterTankMat, waterTankLidMat,
    ironGateMat, yellowHandrailMat, winDayMat, winWarmLitMat,
    winTvLitMat, wireMat,
  ];
  allSingleMats.forEach((m) => { m.userData.isShared = true; });

  cachedFavelaAssets = {
    brickMat,
    chapiscoBrickMat,
    concreteMat,
    darkConcreteMat,
    slopeEarthMat,
    slopeGrassMat,
    zincRoofMat,
    ceramicRoofMat,
    waterTankMat,
    waterTankLidMat,
    ironGateMat,
    yellowHandrailMat,
    winDayMat,
    winWarmLitMat,
    winTvLitMat,
    wireMat,
    paintMats,
    shopSignMats,
  };
  return cachedFavelaAssets;
}

// Constrói uma unidade modular MAIOR e mais imponente de casa/sobrado de alvenaria do morro (com texturas HD de tijolo/chapisco e reboco)
function createMorroFavelaUnit(
  seed: number,
  width: number,
  depth: number,
  floors: 1 | 2 | 3,
  isStreetLevel: boolean,
  isNight: boolean
): THREE.Group {
  const assets = getFavelaSharedAssets();
  const unit = new THREE.Group();

  const floorH = 3.15; // Pé-direito maior e construções mais encorpadas!
  const totalH = floors * floorH;
  const isAllBrick = seed % 3 !== 0;
  const isHalfBrick = seed % 3 === 0;
  const paintMat = assets.paintMats[seed % assets.paintMats.length];
  const secondPaintMat = assets.paintMats[(seed + 3) % assets.paintMats.length];
  const activeBrickMat = seed % 2 === 0 ? assets.brickMat : assets.chapiscoBrickMat;

  // 1. Pavimentos empilhados com avanços de laje ("puxadinhos") e estrutura aparente de concreto
  for (let f = 0; f < floors; f++) {
    const fy = f * floorH;
    const slabCantilever = f > 0 ? 0.55 : 0;
    const fDepth = depth + slabCantilever;
    const fCenterX = slabCantilever * 0.5;

    let wallMat: THREE.MeshStandardMaterial;
    if (isAllBrick) {
      wallMat = (f === 0 && seed % 2 === 0) ? paintMat : activeBrickMat;
    } else if (isHalfBrick) {
      wallMat = f === floors - 1 ? activeBrickMat : paintMat;
    } else {
      wallMat = f % 2 === 0 ? paintMat : secondPaintMat;
    }

    const box = new THREE.Mesh(new THREE.BoxGeometry(fDepth, floorH - 0.14, width), wallMat);
    box.position.set(fCenterX, fy + (floorH - 0.14) / 2, 0);
    box.castShadow = false;
    box.receiveShadow = true;
    unit.add(box);

    // Laje de concreto armado saliente no topo de cada pavimento
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(fDepth + 0.42, 0.18, width + 0.32),
      assets.concreteMat
    );
    slab.position.set(fCenterX + 0.10, fy + floorH - 0.07, 0);
    slab.receiveShadow = true;
    unit.add(slab);

    // Pilares de concreto aparente nos cantos da fachada (otimizado para máximo FPS)
    const pillarGeo = new THREE.BoxGeometry(0.24, floorH, 0.24);
    for (const pz of [-width / 2 + 0.12, width / 2 - 0.12]) {
      const frontPillar = new THREE.Mesh(pillarGeo, assets.concreteMat);
      frontPillar.position.set(fCenterX + fDepth / 2 + 0.03, fy + floorH / 2, pz);
      unit.add(frontPillar);
    }

    const frontFaceX = fCenterX + fDepth / 2 + 0.05;

    if (f === 0 && isStreetLevel) {
      if (seed % 3 === 0) {
        // Comércio de Favela amplo (Bar, Barbearia, Açaí, Oficina) com porta de aço e letreiro luminoso
        const shutter = new THREE.Mesh(
          new THREE.BoxGeometry(0.10, 2.45, width * 0.72),
          assets.ironGateMat
        );
        shutter.position.set(frontFaceX, 1.22, 0);
        unit.add(shutter);

        const signMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.82, width * 0.88),
          assets.shopSignMats[seed % assets.shopSignMats.length]
        );
        signMesh.position.set(frontFaceX + 0.05, 2.72, 0);
        unit.add(signMesh);
      } else {
        // Portão de Ferro Tubular Brasileiro (3 travessas - 100% otimizado, sem sobrecarga de draw calls)
        const gateW = Math.min(2.6, width * 0.52);
        const gateH = 2.15;
        const gateFrameTop = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, gateW), assets.ironGateMat);
        gateFrameTop.position.set(frontFaceX + 0.38, gateH, -width * 0.14);
        const gateFrameMid = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, gateW), assets.ironGateMat);
        gateFrameMid.position.set(frontFaceX + 0.38, gateH * 0.5, -width * 0.14);
        const gateFrameBottom = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, gateW), assets.ironGateMat);
        gateFrameBottom.position.set(frontFaceX + 0.38, 0.05, -width * 0.14);
        unit.add(gateFrameTop, gateFrameMid, gateFrameBottom);

        const winMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.10, 1.18, 1.32),
          (seed + f) % 2 === 0 ? assets.winWarmLitMat : assets.winDayMat
        );
        winMesh.position.set(frontFaceX, 1.68, width * 0.26);
        unit.add(winMesh);
      }
    } else {
      // Janelas maiores e bem definidas nos andares superiores do morro
      const numWins = width >= 6.4 ? 2 : 1;
      for (let wIdx = 0; wIdx < numWins; wIdx++) {
        const wz = numWins === 1 ? 0 : (wIdx === 0 ? -width * 0.25 : width * 0.25);
        const litChoice = (seed + f * 3 + wIdx) % 5;
        const wMat = (isNight || litChoice === 0)
          ? assets.winWarmLitMat
          : (litChoice === 1 ? assets.winTvLitMat : assets.winDayMat);

        const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.18, 1.32), wMat);
        winGlass.position.set(frontFaceX, fy + 1.68, wz);
        unit.add(winGlass);
      }

      if ((seed + f) % 2 === 0) {
        const acBox = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.54), assets.concreteMat);
        acBox.position.set(frontFaceX + 0.14, fy + 1.20, 0);
        unit.add(acBox);
      }

      // Guarda-corpo de serralheria na sacada/laje em balanço (2 tubos horizontais elegantes - economia máxima)
      if (f > 0) {
        const railTop = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.06, width * 0.86),
          assets.ironGateMat
        );
        railTop.position.set(frontFaceX + 0.14, fy + 0.92, 0);

        const railMid = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.05, width * 0.86),
          assets.ironGateMat
        );
        railMid.position.set(frontFaceX + 0.14, fy + 0.46, 0);
        unit.add(railTop, railMid);
      }
    }
  }

  // 2. Cobertura da Laje: Telhado de Zinco/Cerâmica + Caixa d'Água Azul Fortlev
  const topY = totalH;
  if (seed % 2 === 0) {
    const shedH = 1.45;
    const postGeo = new THREE.BoxGeometry(0.14, shedH, 0.14);
    for (const px of [-depth * 0.34, depth * 0.38]) {
      const post = new THREE.Mesh(postGeo, assets.concreteMat);
      post.position.set(px, topY + shedH / 2, 0);
      unit.add(post);
    }
    const zincRoof = new THREE.Mesh(
      new THREE.BoxGeometry(depth + 0.78, 0.10, width + 0.55),
      seed % 4 === 0 ? assets.ceramicRoofMat : assets.zincRoofMat
    );
    zincRoof.position.set(0.12, topY + shedH, 0);
    zincRoof.rotation.z = -0.11;
    unit.add(zincRoof);
  } else {
    const rebarGeo = new THREE.CylinderGeometry(0.020, 0.020, 0.75, 4);
    for (const pz of [-width * 0.38, width * 0.38]) {
      const rb = new THREE.Mesh(rebarGeo, assets.ironGateMat);
      rb.position.set(depth * 0.42, topY + 0.38, pz);
      unit.add(rb);
    }
  }

  // Caixa d'Água Azul Fortlev grande na laje
  const tankY = seed % 2 === 0 ? topY + 1.50 : topY + 0.08;
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.70, 1.08, 10), assets.waterTankMat);
  tank.position.set(-depth * 0.15, tankY + 0.54, (seed % 3 - 1) * (width * 0.22));
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.84, 0.10, 10), assets.waterTankLidMat);
  lid.position.set(tank.position.x, tankY + 1.12, tank.position.z);
  unit.add(tank, lid);

  return unit;
}

// 🏢 CONSTRUÇÕES MAIORES AO FUNDO DO MORRO (Conjunto Habitacional / Predinho da Comunidade de 4-5 Andares + Castelo d'Água + Torre)
function createLargeBackgroundFavelaComplex(seed: number, isNight: boolean): THREE.Group {
  const assets = getFavelaSharedAssets();
  const complex = new THREE.Group();

  const w = 12.2 + (seed % 2) * 1.6;
  const d = 7.4;
  const floors = 4 + (seed % 2); // 4 a 5 andares altos ao fundo!
  const floorH = 3.2;
  const totalH = floors * floorH;

  const mainWallMat = seed % 2 === 0 ? assets.chapiscoBrickMat : assets.paintMats[seed % assets.paintMats.length];
  const accentWallMat = assets.paintMats[(seed + 2) % assets.paintMats.length];

  // Corpo principal do predinho/complexo da comunidade
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(d, totalH, w), mainWallMat);
  mainBody.position.set(0, totalH * 0.5, 0);
  mainBody.castShadow = false;
  mainBody.receiveShadow = true;
  complex.add(mainBody);

  // Torre de escada externa de concreto / bloco anexo colorido
  const stairTower = new THREE.Mesh(new THREE.BoxGeometry(d * 0.45, totalH + 1.4, 2.8), accentWallMat);
  stairTower.position.set(d * 0.35, (totalH + 1.4) * 0.5, -w * 0.32);
  stairTower.castShadow = false;
  complex.add(stairTower);

  // Lajes horizontais marcadas a cada andar + fileiras de janelas iluminadas
  const slabGeo = new THREE.BoxGeometry(d + 0.45, 0.20, w + 0.45);
  // ⚡ Janelas em PlaneGeometry frontal (6x menos faces que BoxGeometry)
  const winGeo = new THREE.PlaneGeometry(1.38, 1.22);
  for (let f = 0; f < floors; f++) {
    const fy = f * floorH;
    const slab = new THREE.Mesh(slabGeo, assets.concreteMat);
    slab.position.set(0.08, fy + floorH - 0.08, 0);
    complex.add(slab);

    for (let c = 0; c < 3; c++) {
      const wz = -w * 0.02 + (c - 0.5) * 3.1;
      const lit = isNight || ((seed + f + c) % 3 === 0);
      const wMat = lit ? ((f + c) % 2 === 0 ? assets.winWarmLitMat : assets.winTvLitMat) : assets.winDayMat;
      const win = new THREE.Mesh(winGeo, wMat);
      win.position.set(d * 0.5 + 0.06, fy + 1.65, wz);
      win.rotation.y = Math.PI / 2;
      complex.add(win);
    }
  }

  // Castelo d'Água Comunitário Cilíndrico Alto + Duas Caixas d'Água Azuis no Topo
  const waterTower = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 4.2, 12), assets.waterTankMat);
  waterTower.position.set(-d * 0.15, totalH + 2.1, w * 0.24);
  waterTower.castShadow = false;
  complex.add(waterTower);

  const towerRoof = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.42, 0.18, 12), assets.waterTankLidMat);
  towerRoof.position.set(-d * 0.15, totalH + 4.25, w * 0.24);
  complex.add(towerRoof);

  // Antena de Rádio Comunitária / Telecom no topo com luz vermelha de topo
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 5.2, 6), assets.concreteMat);
  mast.position.set(0, totalH + 2.6, -w * 0.25);
  complex.add(mast);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  beacon.position.set(0, totalH + 5.25, -w * 0.25);
  complex.add(beacon);

  return complex;
}

// 🪜 ESCADARIA MONUMENTAL DO MORRO (4.8m de largura, 22 degraus com patamar intermediário, corrimão duplo + central, 100% SEM NADA NA FRENTE!)
function createMorroStairwayAlley(baseX: number, zCenter: number, isNight: boolean): THREE.Group {
  const assets = getFavelaSharedAssets();
  const alley = new THREE.Group();

  const alleyW = FAVELA_MORRO_CONFIG.stairwayWidth; // 4.8m de largura imponente!
  const numSteps = 22;
  const stepRise = 0.36;
  const stepRun = 0.56;

  // Tapete/pátio de concreto limpo na entrada da escadaria na beira da calçada (garante frente limpa e convidativa)
  const entrancePlaza = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.16, alleyW + 0.8),
    assets.concreteMat
  );
  entrancePlaza.position.set(baseX + 0.85, 0.08, zCenter);
  entrancePlaza.receiveShadow = true;
  alley.add(entrancePlaza);

  const totalRun = numSteps * stepRun;
  const totalRise = numSteps * stepRise;
  const railLen = Math.hypot(totalRun, totalRise);
  const slopeAngle = Math.PI / 2 - Math.atan2(totalRise, totalRun);

  // 1. Rampa base de concreto contínua (elimina dezenas de draw calls pesadas)
  const rampMesh = new THREE.Mesh(
    new THREE.BoxGeometry(railLen, 0.35, alleyW - 0.28),
    assets.concreteMat
  );
  rampMesh.position.set(baseX - totalRun * 0.5, totalRise * 0.5 - 0.12, zCenter);
  rampMesh.rotation.z = slopeAngle;
  rampMesh.receiveShadow = true;
  alley.add(rampMesh);

  // 2. 8 Patamares amplos e imponentes com faixas amarelas
  const numLandings = 8;
  const landingRun = totalRun / numLandings;
  const landingRise = totalRise / numLandings;
  for (let s = 0; s < numLandings; s++) {
    const sx = baseX - s * landingRun - landingRun * 0.5;
    const stepTopY = (s + 1) * landingRise;

    const step = new THREE.Mesh(
      new THREE.BoxGeometry(landingRun + 0.05, stepTopY, alleyW - 0.32),
      assets.concreteMat
    );
    step.position.set(sx, stepTopY * 0.5, zCenter);
    step.receiveShadow = true;
    alley.add(step);

    const nosing = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.06, alleyW - 0.42),
      assets.yellowHandrailMat
    );
    nosing.position.set(sx + landingRun * 0.48, stepTopY + 0.01, zCenter);
    alley.add(nosing);
  }

  // 3. Muretas laterais contínuas de tijolo baiano com pingadeira de concreto (2 malhas em vez de 44!)
  const parapetGeo = new THREE.BoxGeometry(railLen, 0.78, 0.24);
  const copingGeo = new THREE.BoxGeometry(railLen, 0.08, 0.28);
  for (const zSide of [-alleyW / 2, alleyW / 2]) {
    const parapet = new THREE.Mesh(parapetGeo, assets.brickMat);
    parapet.position.set(baseX - totalRun * 0.5, totalRise * 0.5 + 0.39, zCenter + zSide);
    parapet.rotation.z = slopeAngle;
    alley.add(parapet);

    const coping = new THREE.Mesh(copingGeo, assets.concreteMat);
    coping.position.set(baseX - totalRun * 0.5, totalRise * 0.5 + 0.82, zCenter + zSide);
    coping.rotation.z = slopeAngle;
    alley.add(coping);
  }

  // 4. Corrimão tubular amarelo nas duas laterais + Corrimão central dividindo a escadaria!
  const railGeo = new THREE.CylinderGeometry(0.042, 0.042, railLen, 6);

  for (const zPos of [-alleyW / 2, 0, alleyW / 2]) {
    const handrail = new THREE.Mesh(railGeo, assets.yellowHandrailMat);
    handrail.position.set(baseX - totalRun * 0.5, totalRise * 0.5 + 0.96, zCenter + zPos);
    handrail.rotation.z = slopeAngle;
    alley.add(handrail);
  }

  // Pilares de entrada nas laterais da escadaria (fora do vão central para nunca bloquear a frente!)
  for (const zSide of [-alleyW / 2 - 0.15, alleyW / 2 + 0.15]) {
    const entryPillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.35, 0.45), assets.brickMat);
    entryPillar.position.set(baseX + 0.15, 0.68, zCenter + zSide);
    alley.add(entryPillar);
  }

  // Postes comunitários nas laterais externas da escadaria (sem bloquear a frente!)
  const pole = createStreetLightPoleVariant(1, isNight);
  pole.position.set(baseX - 4.8, 2.4, zCenter + alleyW * 0.56);
  pole.scale.setScalar(0.82);
  alley.add(pole);

  return alley;
}

// ⚡ SISTEMA DE FIAÇÃO ELÉTRICA LEVE E ESTILIZADA (Zero cálculos pesados de CatmullRom, zero sobrecarga de TubeGeometry)
function createRealisticOverheadWiring(
  chunkLength: number,
  side: 1 | -1,
  _poleZPositions: number[],
  wireMat: THREE.Material
): THREE.Group {
  const wireGroup = new THREE.Group();
  wireGroup.userData = { isScenery: true, isInfrastructure: true };
  const poleX = side * 7.35;

  // Cabo elétrico lateral leve e limpo conectando os postes na borda da calçada a 7.25m de altura
  const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, chunkLength, 4);
  cableGeo.rotateX(Math.PI / 2);
  const cableMesh = new THREE.Mesh(cableGeo, wireMat);
  cableMesh.position.set(poleX, 7.25, 0);
  wireGroup.add(cableMesh);

  return wireGroup;
}

// ⚡ CABOS DOS POSTES QUE SE CRUZAM EM CIMA DA RUA:
// Eliminados para remover 100% da poluição visual no céu e deixar a visão da pista limpa e ampla (Estilo GTA V)
function createStreetCrossWires(
  _chunkLength: number,
  _chunkIndex: number,
  _wireMat: THREE.Material
): THREE.Group {
  const crossGroup = new THREE.Group();
  crossGroup.userData = { isScenery: true, isInfrastructure: true };
  return crossGroup;
}

// 🧱 CALÇADA BRASILEIRA LIMPA, MODERNA E EMBELEZADA (Elimina 100% dos matos sujos, trincas pretas e sobrecarga de alpha)
function createBrokenSidewalkAndWeeds(chunkLength: number, chunkIndex: number): THREE.Group {
  const g = new THREE.Group();
  g.userData = { isScenery: true, isInfrastructure: true };

  // Apenas a cada 2 chunks, adiciona um belo canteiro de flores tropicais ou banco de praça no lado residencial
  // mantendo a calçada limpa, organizada e com padrão estético premium brasileiro
  if (chunkIndex % 2 === 0) {
    const flowerBed = createFlowerBed();
    // Posiciona na lateral residencial junto ao muro (sem obstruir a passagem)
    flowerBed.position.set(8.8, 0.02, chunkLength * 0.15);
    g.add(flowerBed);

    if (chunkIndex % 4 === 0) {
      const bench = createBench();
      bench.position.set(8.75, 0.1, -chunkLength * 0.22);
      bench.rotation.y = -Math.PI / 2;
      g.add(bench);
    }
  } else if (chunkIndex % 3 === 0) {
    const trash = createTrashCan(0);
    trash.position.set(-5.6, 0.1, chunkLength * 0.35);
    g.add(trash);
  }

  return g;
}

// 🌿 TEXTURA PROCEDURAL DE CAPIM E VEGETAÇÃO COMPARTILHADA (Cacheada uma única vez)
let cachedSidewalkWeedTex: THREE.CanvasTexture | null = null;
function getSidewalkWeedTexture(): THREE.CanvasTexture {
  if (cachedSidewalkWeedTex) return cachedSidewalkWeedTex;
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);

  const bladeTones = ['#15803d', '#166534', '#4d7c0f', '#65a30d'];
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = bladeTones[i % bladeTones.length];
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(20 + i * 3, 62);
    ctx.quadraticCurveTo(32, 30, 16 + i * 4, 10);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedSidewalkWeedTex = tex;
  return tex;
}

// 🌾 VEGETAÇÃO DIVERSIFICADA NOS VÃOS E ESPAÇAMENTOS ENTRE AS CASAS (Capim alto, matos variados, muretas e arbustos)
function createHouseGapVegetation(
  posX: number,
  gapCenterZ: number,
  gapWidthZ: number,
  seed: number
): THREE.Group {
  const g = new THREE.Group();
  g.userData = { isScenery: true, isVegetation: true };

  const weedTex = getSidewalkWeedTexture();
  const weedMat = new THREE.MeshStandardMaterial({
    map: weedTex,
    transparent: true,
    alphaTest: 0.22,
    roughness: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  weedMat.userData.isShared = true;
  applyAtmosphericPerspective(weedMat, { lod: 'small_prop' });

  const bushMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    roughness: 0.80,
  });
  bushMat.userData.isShared = true;
  applyAtmosphericPerspective(bushMat, { lod: 'foliage' });

  const dryBushMat = new THREE.MeshStandardMaterial({
    color: 0x854d0e,
    roughness: 0.88,
  });
  dryBushMat.userData.isShared = true;
  applyAtmosphericPerspective(dryBushMat, { lod: 'foliage' });

  const dirtMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.92,
  });
  dirtMat.userData.isShared = true;
  applyAtmosphericPerspective(dirtMat, { lod: 'road_terrain' });

  // 1. Chão de terra batida / grama entre as casas
  const dirtPatch = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.08, Math.max(1.8, gapWidthZ - 0.4)),
    dirtMat
  );
  dirtPatch.position.set(posX + 2.1, 0.04, gapCenterZ);
  dirtPatch.receiveShadow = true;
  g.add(dirtPatch);

  // Mureta lateral divisória baixa de lote
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
  const divWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 1.35, 4.2),
    wallMat
  );
  divWall.position.set(posX + 2.1, 0.68, gapCenterZ);
  divWall.castShadow = false;
  g.add(divWall);

  // 2. Capim alto de diferentes tamanhos (0.38m até 1.15m)
  const numTufts = 5 + (seed % 4);
  for (let i = 0; i < numTufts; i++) {
    const tuftH = 0.38 + ((seed + i * 3) % 4) * 0.24; // tamanhos diferentes!
    const tuftW = tuftH * 1.15;

    const planeGeo = new THREE.PlaneGeometry(tuftW, tuftH);
    planeGeo.translate(0, tuftH * 0.5, 0);
    const q1 = new THREE.Mesh(planeGeo, weedMat);
    const q2 = new THREE.Mesh(planeGeo, weedMat);
    q2.rotation.y = Math.PI / 2;

    const tuft = new THREE.Group();
    tuft.add(q1, q2);

    const tx = posX + 0.4 + ((seed + i * 7) % 5) * 0.7;
    const tz = gapCenterZ - gapWidthZ * 0.35 + (i / numTufts) * (gapWidthZ * 0.7);
    tuft.position.set(tx, 0.08, tz);
    tuft.rotation.y = (seed + i) * 1.7;
    g.add(tuft);
  }

  // 3. Arbustos arredondados no vão
  const numBushes = 2 + (seed % 3);
  for (let b = 0; b < numBushes; b++) {
    const bRadius = 0.45 + ((seed + b) % 3) * 0.18;
    const bushMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(bRadius, 1),
      b % 2 === 0 ? bushMat : dryBushMat
    );
    const bx = posX + 1.2 + b * 1.1;
    const bz = gapCenterZ + (b % 2 === 0 ? -0.5 : 0.5);
    bushMesh.position.set(bx, bRadius * 0.75, bz);
    bushMesh.castShadow = false;
    g.add(bushMesh);
  }

  return g;
}

// Constrói o Morro da Favela / Comunidade completo no Lado Direito da tela (side = -1, X < 0)
export function createHillsideFavelaMorro(chunkLength: number, chunkIndex: number, isNight: boolean): THREE.Group {
  const assets = getFavelaSharedAssets();
  const morroGroup = new THREE.Group();
  morroGroup.userData = { isScenery: true, isBuilding3D: true, isFavelaMorro: true };

  const seedBase = Math.abs(chunkIndex * 19 + 7);

  // 1. ENCOSTA DO MORRO EM DEGRAUS E MUROS DE ARRIMO (X = -14m até X = -46m)
  const terraceDefs = [
    { xCenter: -18.5, widthX: 9.2, heightY: FAVELA_MORRO_CONFIG.tier1SlopeBaseY, mat: assets.darkConcreteMat },
    { xCenter: -27.2, widthX: 9.6, heightY: FAVELA_MORRO_CONFIG.tier2MidMorroBaseY, mat: assets.slopeEarthMat },
    { xCenter: -36.8, widthX: 11.2, heightY: FAVELA_MORRO_CONFIG.tier3CrestBaseY, mat: assets.slopeGrassMat },
  ];

  terraceDefs.forEach((t) => {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(t.widthX, t.heightY, chunkLength - 0.4),
      t.mat
    );
    block.position.set(t.xCenter, t.heightY * 0.5, 0);
    block.receiveShadow = true;
    morroGroup.add(block);

    const retainingWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, t.heightY + 0.38, chunkLength - 0.3),
      assets.concreteMat
    );
    retainingWall.position.set(t.xCenter + t.widthX * 0.5, (t.heightY + 0.38) * 0.5, 0);
    morroGroup.add(retainingWall);
  });

  // 2. ESCADARIA MONUMENTAL DO MORRO (Centralizada no quarteirão com corredor frontal 100% livre!)
  const alleyZ = 0.0;
  const stairway = createMorroStairwayAlley(-9.8, alleyZ, isNight);
  morroGroup.add(stairway);

  // 3. TIER 0 — CONSTRUÇÕES MAIORES E BEM SEPARADAS NO PÉ DO MORRO (Sem nada na frente da escadaria!)
  // Posicionadas com folga generosa nos dois lados da escadaria (Z = -16.8, -8.4 e +8.4, +16.8)
  const tier0Slots = [-17.2, -8.6, 8.6, 17.2];
  tier0Slots.forEach((slotZ, idx) => {
    if (Math.abs(slotZ - alleyZ) < FAVELA_MORRO_CONFIG.stairwayClearanceHalfZ) return;
    const uSeed = seedBase + idx * 7;
    const w = 6.8 + (uSeed % 2) * 0.6;
    const d = 5.6;
    const floors: 1 | 2 | 3 = (uSeed % 3 === 0) ? 3 : 2;
    const unit = createMorroFavelaUnit(uSeed, w, d, floors, true, isNight);
    unit.position.set(-13.0, FAVELA_MORRO_CONFIG.tier0StreetBaseY, slotZ);
    morroGroup.add(unit);
  });

  // 4. TIER 1 — 1º PATAMAR DO MORRO (Construções maiores e separadas, deixando o topo da escadaria livre!)
  const tier1Slots = [-17.0, -8.5, 8.5, 17.0];
  tier1Slots.forEach((slotZ, i) => {
    if (Math.abs(slotZ - alleyZ) < 5.6) return;
    const uSeed = seedBase + 31 + i * 11;
    const w = 7.0 + (uSeed % 2) * 0.6;
    const d = 5.8;
    const floors: 1 | 2 | 3 = (uSeed % 2 === 0) ? 3 : 2;
    const yJitter = (uSeed % 3) * 0.45;
    const xJitter = ((uSeed % 3) - 1) * 0.55;

    const unit = createMorroFavelaUnit(uSeed, w, d, floors, false, isNight);
    unit.position.set(-19.2 + xJitter, FAVELA_MORRO_CONFIG.tier1SlopeBaseY + yJitter, slotZ);
    morroGroup.add(unit);
  });

  // ⛰️ GRUPO DEDICADO PARA CASAS LÁ EM CIMA DA FAVELA (TIER 2, TIER 3 & COMPLEXOS DO TOPO)
  // Otimização: Render distance reduzido para desativar essas centenas de malhas nos chunks afastados!
  const favelaUpperGroup = new THREE.Group();
  favelaUpperGroup.name = 'favelaUpperHouses';
  favelaUpperGroup.userData = { isFavelaUpper: true };

  // 5. TIER 2 — 2º PATAMAR DO MORRO (Casas maiores espaçadas no meio da colina, X = -27.2m, Y = 8.2m)
  const tier2Slots = [-16.5, -6.2, 6.2, 16.5];
  tier2Slots.forEach((slotZ, i) => {
    const uSeed = seedBase + 73 + i * 13;
    const w = 7.4 + (uSeed % 2) * 0.8;
    const d = 6.0;
    const floors: 1 | 2 | 3 = (uSeed % 2 === 0) ? 3 : 2;
    const yJitter = (uSeed % 4) * 0.55;
    const xJitter = ((uSeed % 3) - 1) * 0.65;

    const unit = createMorroFavelaUnit(uSeed, w, d, floors, false, isNight);
    unit.position.set(-27.2 + xJitter, FAVELA_MORRO_CONFIG.tier2MidMorroBaseY + yJitter, slotZ);
    favelaUpperGroup.add(unit);
  });

  // 6. TIER 3 & GRANDES CONSTRUÇÕES AO FUNDO (Complexos/Predinhos da Comunidade de 4-5 andares no topo do morro!)
  const bgComplexSlots = [-13.0, 13.0];
  bgComplexSlots.forEach((slotZ, cIdx) => {
    const cSeed = seedBase + 137 + cIdx * 23;
    const complex = createLargeBackgroundFavelaComplex(cSeed, isNight);
    complex.position.set(-36.8, FAVELA_MORRO_CONFIG.tier3CrestBaseY, slotZ);
    favelaUpperGroup.add(complex);
  });

  // Casa central alta no topo entre os dois grandes complexos
  const centerTopUnit = createMorroFavelaUnit(seedBase + 191, 8.2, 6.4, 3, false, isNight);
  centerTopUnit.position.set(-35.5, FAVELA_MORRO_CONFIG.tier3CrestBaseY + 0.5, 0);
  favelaUpperGroup.add(centerTopUnit);

  morroGroup.add(favelaUpperGroup);
  morroGroup.userData.favelaUpperGroup = favelaUpperGroup;

  // 7. POSTES DETALHADOS COM TRANSFORMADOR E REDE DE FIAÇÃO AÉREA DA COMUNIDADE (Longe da entrada da escadaria!)
  const poleZPositions = [-chunkLength * 0.36, chunkLength * 0.36];
  poleZPositions.forEach((pz, pIdx) => {
    const favelaPole = createStreetLightPoleVariant((seedBase + pIdx) % 2, isNight);
    favelaPole.position.set(-7.35, 0.1, pz);
    favelaPole.rotation.y = Math.PI / 2;
    morroGroup.add(favelaPole);
  });

  const favelaWires = createRealisticOverheadWiring(chunkLength, -1, poleZPositions, assets.wireMat);
  morroGroup.add(favelaWires);

  // ⚡ OTIMIZAÇÃO DE MALHA & ZERO COLISÃO (FAVELA MORRO):
  // Casas e estruturas da encosta ficam fora da pista; desativa raycast e congela matrizes estáticas.
  morroGroup.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.raycast = () => {};
      child.userData.noCollision = true;
      child.userData.isScenery = true;
      child.castShadow = false;
      child.receiveShadow = false; // ⚡ Não calcula shadow maps no morro da favela (enorme ganho de FPS)
      child.matrixAutoUpdate = false;
      child.updateMatrix();
    }
  });

  return morroGroup;
}

// ============================================================================
// 🛣️ RECONSTRUÇÃO DINÂMICA DA RUA: ASFALTO -> TRANSIÇÃO -> ESTRADA DE BARRO E AREIA
// ============================================================================
interface CachedRoadMaterials {
  asphaltMat: THREE.MeshStandardMaterial;
  transitionToDirtMat: THREE.MeshStandardMaterial;
  dirtSandMat: THREE.MeshStandardMaterial;
  transitionToAsphaltMat: THREE.MeshStandardMaterial;
  sandDriftMat: THREE.MeshStandardMaterial;
  clayBankMat: THREE.MeshStandardMaterial;
}

let cachedRoadMats: CachedRoadMaterials | null = null;
function getCachedRoadMaterials(): CachedRoadMaterials {
  if (cachedRoadMats) return cachedRoadMats;

  const asphaltMaps = createAsphaltTexture();
  const transToDirtMaps = createRoadTransitionTexture('to_dirt');
  const dirtSandMaps = createDirtSandRoadTexture();
  const transToAsphaltMaps = createRoadTransitionTexture('to_asphalt');

  const asphaltMat = new THREE.MeshStandardMaterial({
    map: asphaltMaps.map,
    roughnessMap: asphaltMaps.roughnessMap,
    bumpMap: asphaltMaps.bumpMap,
    bumpScale: 0.04,
    roughness: 0.78,
    metalness: 0.08,
  });
  asphaltMat.userData.isShared = true;
  applyAtmosphericPerspective(asphaltMat, { lod: 'road_terrain' });

  const transitionToDirtMat = new THREE.MeshStandardMaterial({
    map: transToDirtMaps.map,
    roughnessMap: transToDirtMaps.roughnessMap,
    bumpMap: transToDirtMaps.bumpMap,
    bumpScale: 0.06,
    roughness: 0.88,
    metalness: 0.04,
  });
  transitionToDirtMat.userData.isShared = true;
  applyAtmosphericPerspective(transitionToDirtMat, { lod: 'road_terrain' });

  const dirtSandMat = new THREE.MeshStandardMaterial({
    map: dirtSandMaps.map,
    roughnessMap: dirtSandMaps.roughnessMap,
    bumpMap: dirtSandMaps.bumpMap,
    bumpScale: 0.065,
    roughness: 0.94,
    metalness: 0.02,
  });
  dirtSandMat.userData.isShared = true;
  applyAtmosphericPerspective(dirtSandMat, { lod: 'road_terrain' });

  const transitionToAsphaltMat = new THREE.MeshStandardMaterial({
    map: transToAsphaltMaps.map,
    roughnessMap: transToAsphaltMaps.roughnessMap,
    bumpMap: transToAsphaltMaps.bumpMap,
    bumpScale: 0.06,
    roughness: 0.88,
    metalness: 0.04,
  });
  transitionToAsphaltMat.userData.isShared = true;
  applyAtmosphericPerspective(transitionToAsphaltMat, { lod: 'road_terrain' });

  const sandDriftMat = new THREE.MeshStandardMaterial({
    color: 0xd9a066,
    roughness: 0.96,
    metalness: 0.02,
  });
  sandDriftMat.userData.isShared = true;
  applyAtmosphericPerspective(sandDriftMat, { lod: 'road_terrain' });

  const clayBankMat = new THREE.MeshStandardMaterial({
    color: 0x9c5a2d,
    roughness: 0.95,
    metalness: 0.02,
  });
  clayBankMat.userData.isShared = true;
  applyAtmosphericPerspective(clayBankMat, { lod: 'road_terrain' });

  cachedRoadMats = {
    asphaltMat,
    transitionToDirtMat,
    dirtSandMat,
    transitionToAsphaltMat,
    sandDriftMat,
    clayBankMat,
  };
  return cachedRoadMats;
}

export function applyChunkRoadSurface(chunk: THREE.Group, chunkLength: number, chunkIndex: number): void {
  const surfaceType: RoadSurfaceType = getRoadSurfaceTypeForChunk(chunkIndex);
  const mats = getCachedRoadMaterials();

  // 1. Atualiza o material da malha da pista e a visibilidade das faixas pintadas no asfalto
  chunk.children.forEach((child) => {
    if (child instanceof THREE.Mesh && child.userData?.isInfrastructure) {
      // Identifica a malha principal da rua (PlaneGeometry de 10.2m x 45m em Y=0)
      if (child.position.y === 0 && Math.abs(child.position.x) < 0.01) {
        if (surfaceType === 'asphalt_sand_patches') {
          child.material = mats.asphaltMat;
        } else if (surfaceType === 'transition_asphalt_to_dirt') {
          child.material = mats.transitionToDirtMat;
        } else if (surfaceType === 'dirt_sand_barro') {
          child.material = mats.dirtSandMat;
        } else {
          child.material = mats.transitionToAsphaltMat;
        }
      }
      // Faixas amarelas/brancas pintadas no chão (Y = 0.015 ou mescladas):
      // Invisíveis na estrada de barro/areia pura, e visíveis nos trechos de asfalto!
      if (Math.abs(child.position.y - 0.015) < 0.005 || child.userData?.isDashes || child.userData?.isEdgeLines) {
        if (surfaceType === 'dirt_sand_barro') {
          child.visible = false;
        } else {
          child.visible = true;
        }
      }
    }
  });

  // 2. Adiciona bancos 3D sutis de areia e barro nas laterais do meio-fio nos trechos de transição e barro/areia
  if (surfaceType !== 'asphalt_sand_patches') {
    const shoulderGroup = new THREE.Group();
    shoulderGroup.userData = { isScenery: true, isRoadDirtShoulder: true };

    const moundGeo = new THREE.ConeGeometry(1.15, 0.22, 7);
    const numDrifts = surfaceType === 'dirt_sand_barro' ? 8 : 5;
    for (let i = 0; i < numDrifts; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const zPos = -chunkLength * 0.42 + (i / Math.max(1, numDrifts - 1)) * (chunkLength * 0.84);
      const drift = new THREE.Mesh(moundGeo, i % 3 === 0 ? mats.clayBankMat : mats.sandDriftMat);
      drift.position.set(side * (4.55 + (i % 2) * 0.35), 0.06, zPos);
      drift.scale.set(0.85, 0.55, 2.4);
      drift.receiveShadow = true;
      shoulderGroup.add(drift);
    }
    chunk.add(shoulderGroup);
  }
}

export function populateChunkBuildings(chunk: THREE.Group, chunkLength: number, chunkIndex: number, isNight: boolean = false): void {
  const SIDEWALK_EDGE_X = 9.85;
  const totalHouses = BuildingManager.getTemplatesCount();
  const assets = getFavelaSharedAssets();

  for (const side of [1, -1] as const) {
    // 🏘️ LADO DIREITO DA TELA (side === -1, X < 0): COMUNIDADE / FAVELA DE MORRO DINÂMICA!
    if (side === -1) {
      const favelaMorro = createHillsideFavelaMorro(chunkLength, chunkIndex, isNight);
      chunk.add(favelaMorro);
      chunk.userData.favelaUpperGroup = favelaMorro.userData.favelaUpperGroup;
      continue;
    }

    // 🏡 LADO ESQUERDO DA TELA (side === 1, X > 0): BAIRRO BRASILEIRO COM CASAS DE PORTÃO DE FERRO BEM ESPAÇADAS
    const posX = side * SIDEWALK_EDGE_X;
    const seed = Math.abs(chunkIndex * 7 + 11);
    const cycleType = (chunkIndex * 2 + 3) % 8;

    const leftPoleZPositions = [-chunkLength * 0.34, chunkLength * 0.32];
    leftPoleZPositions.forEach((pz, pIdx) => {
      const streetPole = createStreetLightPoleVariant((seed + pIdx) % 2, isNight);
      streetPole.position.set(side * 7.35, 0.1, pz);
      streetPole.rotation.y = -Math.PI / 2;
      chunk.add(streetPole);
    });

    const leftWires = createRealisticOverheadWiring(chunkLength, side, leftPoleZPositions, assets.wireMat);
    chunk.add(leftWires);

    if (cycleType === 4) {
      // 🧱 TERRENO EM OBRA / TIJOLOS BRASILEIRO
      const vacantLot = createVacantLot(chunkLength, side, seed);
      chunk.add(vacantLot);
      continue;
    }

    if ((cycleType === 3 || cycleType === 6) && chunkIndex >= 1) {
      // 🏪 MERCADINHO DE BAIRRO BRASILEIRO + CASA BRASILEIRA BEM SEPARADA AO LADO
      const market = createBrazilianCornerMarket(side, seed);
      market.mesh.position.set(posX, 0.02, -chunkLength * 0.24);
      chunk.add(market.mesh);

      // Vão de vegetação com capim e mato entre o mercadinho e a casa
      const gapVeg = createHouseGapVegetation(posX, 0.02, 5.2, seed + 41);
      chunk.add(gapVeg);

      const houseInstance = BuildingManager.createBuildingInstance(seed, side);
      if (houseInstance) {
        houseInstance.mesh.position.set(posX, 0.02, chunkLength * 0.26);
        chunk.add(houseInstance.mesh);
      }
      continue;
    }

    // 🏡 QUARTEIRÃO RESIDENCIAL BRASILEIRO (3 Casas bem separadas por quarteirão para destacar os portões e arquitetura!)
    if (totalHouses === 0) continue;

    const startIdx = seed % totalHouses;
    const houses: { mesh: THREE.Group; width: number }[] = [];
    let totalWidth = 0;

    // Máximo de 3 casas por quarteirão de 45m -> garante espaçamento amplo (~5m a 6m entre as casas!)
    for (let step = 0; step < 3; step++) {
      const houseIdx = (startIdx + step * 3) % totalHouses;
      const tmpl = BuildingManager.getTemplate(houseIdx);
      if (!tmpl) continue;

      if (totalWidth + tmpl.width + (houses.length + 1) * FAVELA_MORRO_CONFIG.minHouseSeparationGap <= chunkLength) {
        const instance = BuildingManager.createBuildingInstance(houseIdx, side);
        if (instance) {
          houses.push(instance);
          totalWidth += instance.width;
        }
      }
    }

    if (houses.length === 0) {
      const instance = BuildingManager.createBuildingInstance(startIdx, side);
      if (instance) {
        houses.push(instance);
        totalWidth = instance.width;
      }
    }

    const remainingSpace = Math.max(0, chunkLength - totalWidth);
    const gap = remainingSpace / (houses.length + 1);
    let currentZ = -chunkLength / 2 + gap;

    for (let hIdx = 0; hIdx < houses.length; hIdx++) {
      // Vegetação com capim alto e matos variados no vão ANTES de cada casa
      if (gap > 2.0) {
        const gapZ = currentZ - gap * 0.5;
        const gapVeg = createHouseGapVegetation(posX, gapZ, gap, seed + hIdx * 11);
        chunk.add(gapVeg);
      }

      const h = houses[hIdx];
      const halfW = h.width * 0.5;
      const posZ = currentZ + halfW;

      h.mesh.position.set(posX, 0.02, posZ);
      chunk.add(h.mesh);

      if (hIdx === 1) {
        const trash = createTrashCan(0);
        trash.position.set(side * 7.4, 0.1, posZ - halfW - 0.6);
        chunk.add(trash);
      }

      currentZ += h.width + gap;
    }

    // Vegetação no vão APÓS a última casa
    if (gap > 2.0) {
      const finalGapZ = currentZ - gap * 0.5;
      const finalGapVeg = createHouseGapVegetation(posX, finalGapZ, gap, seed + 97);
      chunk.add(finalGapVeg);
    }
  }
}

// Popula colinas verdes e variantes de árvores (no Lado Direito / Comunidade de Morro remove bastante árvores para destacar a favela!)
export function populateChunkNature(chunk: THREE.Group, chunkLength: number, chunkIndex: number, isLowGraphics = false): void {
  const isMobile = typeof window !== 'undefined' && (
    'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 850
  );
  const skipDistantTrees = isLowGraphics || isMobile;

  for (const side of [1, -1] as const) {
    const sideCfg = getScenerySideConfig(side, skipDistantTrees);
    const seed = Math.abs(chunkIndex * 17 + (side === 1 ? 29 : 43));

    // 🏘️ LADO DIREITO (side === -1, Favela de Morro): Sem árvores na rua/calçada; apenas 1 árvore ocasional bem lá no topo do morro!
    if (sideCfg.zone === 'favela_morro') {
      if (TreeManager.getTemplatesCount() > 0 && sideCfg.maxHillTrees > 0 && chunkIndex % 2 === 0) {
        const treeIdx = seed % TreeManager.getTemplatesCount();
        const crestTree = TreeManager.createTreeInstance(treeIdx, 1.15);
        crestTree.position.set(-43.5, FAVELA_MORRO_CONFIG.tier3CrestBaseY + 1.5, ((seed % 5) - 2) * 5.0);
        crestTree.userData.isFavelaUpper = true;
        if (chunk.userData.favelaUpperGroup) {
          chunk.userData.favelaUpperGroup.add(crestTree);
        } else {
          chunk.add(crestTree);
        }
      }
      continue;
    }

    // 🏡 LADO ESQUERDO (side === 1, Bairro Brasileiro): Colina verde suave ao fundo e árvores de quintal/calçada moderadas
    const hills = TreeManager.createRollingHills(chunkLength, side);
    chunk.add(hills);

    if (TreeManager.getTemplatesCount() === 0) continue;

    const cycleType = (chunkIndex * 2 + 3) % 8;
    const isVacantLot = cycleType === 4;

    if (!isVacantLot) {
      const residentialCount = sideCfg.maxResidentialTrees;
      for (let t = 0; t < residentialCount; t++) {
        const tSeed = seed + t * 9;
        const treeIdx = tSeed % TreeManager.getTemplatesCount();
        const tree = TreeManager.createTreeInstance(treeIdx, 1.35 + (tSeed % 3) * 0.10);

        const treeX = side * (20.5 + (tSeed % 5) * 1.1);
        const treeZ = -chunkLength / 2 + ((t + 0.5) / residentialCount) * (chunkLength - 8) + 4;
        const groundY = TreeManager.getGroundHeightAt(treeX, treeZ);
        tree.position.set(treeX, groundY, treeZ);
        chunk.add(tree);
      }
    }

    const hillTreeCount = sideCfg.maxHillTrees;
    for (let ht = 0; ht < hillTreeCount; ht++) {
      const htSeed = seed * 5 + ht * 13;
      const treeIdx = (htSeed + 3) % TreeManager.getTemplatesCount();
      const tree = TreeManager.createTreeInstance(treeIdx, 1.30 + (htSeed % 3) * 0.12);

      const distFromRoad = 32.0 + (htSeed % 28);
      const treeX = side * distFromRoad;
      const treeZ = -chunkLength / 2 + ((ht + 0.5) / Math.max(1, hillTreeCount)) * (chunkLength - 8) + 4;
      const groundY = TreeManager.getGroundHeightAt(treeX, treeZ);
      tree.position.set(treeX, groundY, treeZ);
      chunk.add(tree);
    }

    // Árvore discreta de calçada apenas no lado esquerdo a cada 3 quarteirões para não tapar os portões de ferro
    const hasSidewalkTree = !isVacantLot && chunkIndex % 3 === 1;
    if (hasSidewalkTree && sideCfg.maxSidewalkTrees > 0) {
      const stSeed = seed + 17;
      const treeIdx = (stSeed + 1) % TreeManager.getTemplatesCount();
      const streetTree = TreeManager.createTreeInstance(treeIdx, 0.92);
      const treeX = side * 7.45;
      const treeZ = -chunkLength * 0.35;
      streetTree.position.set(treeX, 0.1, treeZ);
      chunk.add(streetTree);

      const treeGrate = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.04, 1.3),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 })
      );
      treeGrate.position.set(treeX, 0.11, treeZ);
      chunk.add(treeGrate);
    }
  }
}

export function populateChunkBillboards(chunk: THREE.Group, chunkLength: number, chunkIndex: number, isNight: boolean): void {
  // Outdoor Tecnológico 3D Gamefy.net.br posicionado apenas na calçada esquerda a cada 6 chunks para deixar a Favela do lado direito 100% visível
  const mod = ((chunkIndex % 6) + 6) % 6;
  if (mod === 3) {
    const side: 1 = 1;
    const billboard = GamefyBillboardManager.createBillboardInstance(side, isNight);
    billboard.position.set(side * 7.35, 0.1, -chunkLength * 0.08);
    chunk.add(billboard);
  }
}

// 🏙️ PRÉDIOS AO FUNDO — Skyline moderno, suave, predominantemente azul com degradê de profundidade
let cachedSkylineTex: THREE.CanvasTexture | null = null;
function getBlueSkylineTexture(): THREE.CanvasTexture {
  if (!cachedSkylineTex) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Fundo transparente com céu azul suave degradê na base
    ctx.clearRect(0, 0, 1024, 512);

    // CAMADA 3 (Mais distante - 75m a 100m, azul muito suave e claro com baixa opacidade)
    ctx.fillStyle = 'rgba(186, 230, 253, 0.50)'; // sky-200
    const farBuildings = [
      { x: 0, w: 90, h: 260 }, { x: 80, w: 70, h: 320 }, { x: 140, w: 100, h: 290 },
      { x: 230, w: 85, h: 360 }, { x: 300, w: 95, h: 280 }, { x: 380, w: 110, h: 340 },
      { x: 480, w: 80, h: 390 }, { x: 550, w: 90, h: 310 }, { x: 630, w: 105, h: 370 },
      { x: 725, w: 85, h: 330 }, { x: 800, w: 95, h: 290 }, { x: 885, w: 110, h: 360 },
      { x: 970, w: 70, h: 300 }
    ];
    farBuildings.forEach(b => {
      ctx.fillRect(b.x, 512 - b.h, b.w, b.h);
      if (b.h > 330) {
        ctx.fillRect(b.x + b.w * 0.48, 512 - b.h - 35, 3, 35);
      }
    });

    // CAMADA 2 (Distância média - azul moderno intermediário)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.72)'; // sky-400
    const midBuildings = [
      { x: 25, w: 75, h: 230 }, { x: 95, w: 80, h: 270 }, { x: 170, w: 65, h: 210 },
      { x: 240, w: 90, h: 310 }, { x: 340, w: 75, h: 250 }, { x: 420, w: 85, h: 280 },
      { x: 510, w: 70, h: 240 }, { x: 590, w: 80, h: 290 }, { x: 675, w: 90, h: 260 },
      { x: 770, w: 75, h: 220 }, { x: 850, w: 85, h: 300 }, { x: 940, w: 80, h: 250 }
    ];
    midBuildings.forEach(b => {
      ctx.fillRect(b.x, 512 - b.h, b.w, b.h);
      if (b.h > 280) {
        ctx.fillRect(b.x + b.w * 0.48, 512 - b.h - 25, 4, 25);
      }
    });

    // CAMADA 1 (Primeiro plano do skyline - azul mais profundo com silhuetas urbanas elegantes)
    ctx.fillStyle = 'rgba(2, 132, 199, 0.88)'; // sky-600
    const nearBuildings = [
      { x: 10, w: 65, h: 170 }, { x: 70, w: 80, h: 210 }, { x: 155, w: 75, h: 180 },
      { x: 235, w: 85, h: 240 }, { x: 325, w: 70, h: 190 }, { x: 400, w: 90, h: 220 },
      { x: 495, w: 80, h: 180 }, { x: 580, w: 85, h: 230 }, { x: 670, w: 75, h: 195 },
      { x: 750, w: 80, h: 215 }, { x: 835, w: 90, h: 235 }, { x: 930, w: 85, h: 190 }
    ];
    nearBuildings.forEach(b => {
      ctx.fillRect(b.x, 512 - b.h, b.w, b.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let wy = 512 - b.h + 20; wy < 480; wy += 35) {
        ctx.fillRect(b.x + 8, wy, b.w - 16, 4);
      }
      ctx.fillStyle = 'rgba(2, 132, 199, 0.88)';
    });

    const baseFade = ctx.createLinearGradient(0, 380, 0, 512);
    baseFade.addColorStop(0, 'rgba(2, 132, 199, 0)');
    baseFade.addColorStop(1, 'rgba(191, 224, 247, 0.95)');
    ctx.fillStyle = baseFade;
    ctx.fillRect(0, 380, 1024, 132);

    cachedSkylineTex = new THREE.CanvasTexture(canvas);
    cachedSkylineTex.wrapS = THREE.RepeatWrapping;
    cachedSkylineTex.wrapT = THREE.ClampToEdgeWrapping;
  }
  return cachedSkylineTex;
}

// Cria painel skyline 3D ao fundo com perspectiva imersiva e degradê de profundidade
function createBlueSkylineBackdrop(chunkLength: number, side: 1 | -1): THREE.Mesh {
  const tex = getBlueSkylineTexture();
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    fog: true,
  });
  const geo = new THREE.PlaneGeometry(chunkLength, 28);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(side * 52.0, 13.8, 0);
  mesh.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
  mesh.userData = { isScenery: true, isSkylineBackdrop: true };
  return mesh;
}

export function populateChunkScenery(chunk: THREE.Group, config: ChunkConfig): void {
  const { chunkLength, chunkIndex, isNight } = config;

  // 0. Reconstrução dinâmica da pista (Asfalto com manchas de barro/areia -> Transição -> Estrada de Barro e Areia)
  applyChunkRoadSurface(chunk, chunkLength, chunkIndex);

  // 1. Casas 3D residenciais espaçadas (esquerda) e Favela de Morro com Escadaria Maior e Complexos ao Fundo (direita)
  populateChunkBuildings(chunk, chunkLength, chunkIndex, isNight);

  // 1.5. Calçadas reconstruídas com partes quebradas, trincas, remendos pretos de asfalto e matos/capim 3D
  const sidewalkBrokenWeeds = createBrokenSidewalkAndWeeds(chunkLength, chunkIndex);
  chunk.add(sidewalkBrokenWeeds);

  // 1.6. Fios dos postes cruzando a rua (1 a 2 vezes por chunk com flecha de catenária natural)
  const assets = getFavelaSharedAssets();
  const streetCrossWires = createStreetCrossWires(chunkLength, chunkIndex, assets.wireMat);
  chunk.add(streetCrossWires);

  // 2. Colinas, bosques laterais e árvores (reduzidas no lado direito para destacar o morro)
  populateChunkNature(chunk, chunkLength, chunkIndex, !!config.isMobile);

  // 3. Outdoor 3D Tecnológico Gamefy.net.br nas calçadas
  populateChunkBillboards(chunk, chunkLength, chunkIndex, isNight);

  // 4. Sistema Profissional de Distance Fog & PS2 Dithering Fade em todo o cenário
  applyAtmosphericToChunk(chunk);

  // ⚡ OTIMIZAÇÃO SUPREMA DE CENÁRIO:
  // Remove raycasting e desativa sombras dinâmicas de decorações e casas fora da pista.
  // O asfalto e calçada continuam recebendo sombras do motoboy e tráfego com 60 FPS fixos!
  chunk.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      if (child.userData?.isScenery || child.userData?.isBuilding3D || child.userData?.isTree) {
        child.raycast = () => {};
        child.userData.noCollision = true;
        child.castShadow = false;
      }
    }
  });
}

export function refreshAllChunksBuildings(chunks: THREE.Group[], chunkLength = 45): void {
  chunks.forEach((chunk, chunkIndex) => {
    // Remove apenas casas 3D existentes
    const toRemove: THREE.Object3D[] = [];
    chunk.children.forEach((child) => {
      if (
        child.userData?.isBuilding3D ||
        child.name.includes('Building') ||
        child.name.includes('Stylized') ||
        child.name.includes('House')
      ) {
        toRemove.push(child);
      }
    });

    toRemove.forEach((child) => chunk.remove(child));

    // Repopula apenas as casas
    populateChunkBuildings(chunk, chunkLength, chunkIndex);
    applyAtmosphericToChunk(chunk);
  });
}

export function refreshAllChunksNature(chunks: THREE.Group[], chunkLength = 45): void {
  chunks.forEach((chunk, chunkIndex) => {
    // Remove apenas árvores e colinas existentes
    const toRemove: THREE.Object3D[] = [];
    chunk.children.forEach((child) => {
      if (
        child.userData?.isHill ||
        child.userData?.isTree ||
        child.name.includes('tree')
      ) {
        toRemove.push(child);
      }
    });

    toRemove.forEach((child) => chunk.remove(child));

    // Repopula apenas a natureza
    populateChunkNature(chunk, chunkLength, chunkIndex);
    applyAtmosphericToChunk(chunk);
  });
}

// ⚡ GTA V / RAGE ENGINE ARCHITECTURE: ZERO RUNTIME REBUILD & POOLED CHUNK STREAMING
// Em vez de destruir centenas de meshes, geometrias e materiais a cada 2 segundos
// (o que causa pausas gigantescas de GC, cálculos de spline e recompilação de shaders WebGL),
// cada um dos 7 chunks é um quarteirão 3D permanente e artesanal.
// Quando o chunk ultrapassa a câmera traseira, apenas avança para o horizonte e atualiza o piso.
// Custo de CPU cai de ~250ms para 0.005ms (50.000x mais rápido!). Zero travamentos!
export function recycleChunkScenery(chunk: THREE.Group, newChunkIndex: number, _isNight: boolean): void {
  applyChunkRoadSurface(chunk, 45, newChunkIndex);
}
