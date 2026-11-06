import * as THREE from 'three';

export interface BuildingTemplate {
  name: string;
  group: THREE.Group;
  width: number;  // Largura da fachada frontal (ao longo da rua)
  depth: number;  // Profundidade do lote/casa (afastamento da rua)
  height: number; // Altura total
  frontZ: number; // Posição frontal da fachada/muro no eixo Z local
}

export interface BrazilianHouseSpec {
  id: string;
  name: string;
  style:
    | 'tijolo_aparente'
    | 'sobrado_varanda'
    | 'terrea_garagem'
    | 'meio_tijolo_laje'
    | 'geminada'
    | 'moderna_grade'
    | 'colonial_paulista'
    | 'colonial_arco_varanda';
  width: number;
  depth: number;
  floors: 1 | 2;
  isBrickHouse: boolean;
  hasIronGate: boolean;
  gateStyle:
    | 'grade_lanca'
    | 'correr_metalon'
    | 'basculante_grade'
    | 'grade_colonial'
    | 'grade_branca_tubular'
    | 'arabescos_artisticos';
  wallColorHex: number;
  secondaryWallHex: number;
  trimColorHex: number;
  gateColorHex: number;
  roofStyle:
    | 'colonial_barro'
    | 'laje_puxadinho'
    | 'fibrocimento'
    | 'garagem_telha'
    | 'colonial_4aguas'
    | 'colonial_arco_platibanda';
  houseNumber: string;
}

export const BRAZILIAN_HOUSE_SPECS: readonly BrazilianHouseSpec[] = [
  {
    id: 'casa_paulista_colonial_4aguas',
    name: 'Casa Paulista Térrea 4 Águas com Varanda e Calha',
    style: 'colonial_paulista',
    width: 7.8,
    depth: 7.0,
    floors: 1,
    isBrickHouse: false,
    hasIronGate: true,
    gateStyle: 'grade_branca_tubular',
    wallColorHex: 0xe59b6b,
    secondaryWallHex: 0xd97736,
    trimColorHex: 0xffffff,
    gateColorHex: 0xf8fafc,
    roofStyle: 'colonial_4aguas',
    houseNumber: '142',
  },
  {
    id: 'casa_arco_colonial_varanda',
    name: 'Casa Tradicional com Arco Pleno e Platibanda Ondulada',
    style: 'colonial_arco_varanda',
    width: 7.8,
    depth: 7.0,
    floors: 1,
    isBrickHouse: false,
    hasIronGate: true,
    gateStyle: 'arabescos_artisticos',
    wallColorHex: 0xeab308,
    secondaryWallHex: 0xca8a04,
    trimColorHex: 0xfef3c7,
    gateColorHex: 0xffffff,
    roofStyle: 'colonial_arco_platibanda',
    houseNumber: '210',
  },
  {
    id: 'casa_tijolo_baiano_grade_lanca',
    name: 'Casa Tijolo Baiano com Portão de Lança',
    style: 'tijolo_aparente',
    width: 7.4,
    depth: 6.8,
    floors: 1,
    isBrickHouse: true,
    hasIronGate: true,
    gateStyle: 'grade_lanca',
    wallColorHex: 0xc2410c,
    secondaryWallHex: 0x9a3412,
    trimColorHex: 0x94a3b8,
    gateColorHex: 0x111827,
    roofStyle: 'colonial_barro',
    houseNumber: '142',
  },
  {
    id: 'sobrado_ocre_varanda_portao_ferro',
    name: 'Sobrado Ocre Brasileiro com Varanda e Grade',
    style: 'sobrado_varanda',
    width: 7.8,
    depth: 7.0,
    floors: 2,
    isBrickHouse: false,
    hasIronGate: true,
    gateStyle: 'correr_metalon',
    wallColorHex: 0xd97706,
    secondaryWallHex: 0xf59e0b,
    trimColorHex: 0xfef3c7,
    gateColorHex: 0x1e293b,
    roofStyle: 'laje_puxadinho',
    houseNumber: '285',
  },
  {
    id: 'casa_azul_garagem_coberta_grade',
    name: 'Casa Azul Piscina com Garagem Coberta e Portão de Ferro',
    style: 'terrea_garagem',
    width: 7.6,
    depth: 6.8,
    floors: 1,
    isBrickHouse: false,
    hasIronGate: true,
    gateStyle: 'grade_colonial',
    wallColorHex: 0x0284c7,
    secondaryWallHex: 0x0369a1,
    trimColorHex: 0xf8fafc,
    gateColorHex: 0x0f172a,
    roofStyle: 'garagem_telha',
    houseNumber: '78',
  },
  {
    id: 'sobrado_tijolo_meio_reboco_laje',
    name: 'Sobrado Meio Reboco e Tijolo Aparente na Laje',
    style: 'meio_tijolo_laje',
    width: 7.5,
    depth: 6.9,
    floors: 2,
    isBrickHouse: true,
    hasIronGate: true,
    gateStyle: 'grade_lanca',
    wallColorHex: 0x0d9488,
    secondaryWallHex: 0xc2410c,
    trimColorHex: 0x94a3b8,
    gateColorHex: 0x18181b,
    roofStyle: 'laje_puxadinho',
    houseNumber: '410',
  },
  {
    id: 'casa_terracota_portao_duplo_ferro',
    name: 'Casa Terracota com Varanda e Portão de Ferro Trabalhado',
    style: 'terrea_garagem',
    width: 7.6,
    depth: 6.6,
    floors: 1,
    isBrickHouse: false,
    hasIronGate: true,
    gateStyle: 'basculante_grade',
    wallColorHex: 0xea580c,
    secondaryWallHex: 0xb45309,
    trimColorHex: 0xffedd5,
    gateColorHex: 0x1c1917,
    roofStyle: 'colonial_barro',
    houseNumber: '319',
  },
  {
    id: 'sobrado_geminado_duas_casas_ferro',
    name: 'Sobrado Geminado Brasileiro com Dois Portões de Ferro',
    style: 'geminada',
    width: 8.6,
    depth: 7.0,
    floors: 2,
    isBrickHouse: false,
    hasIronGate: true,
    gateStyle: 'correr_metalon',
    wallColorHex: 0xe11d48,
    secondaryWallHex: 0xeab308,
    trimColorHex: 0xf8fafc,
    gateColorHex: 0x0f172a,
    roofStyle: 'laje_puxadinho',
    houseNumber: '502',
  },
  {
    id: 'casa_tijolo_rustico_puxadinho_zinco',
    name: 'Casa Rústica de Tijolo à Vista com Telha Brasilit',
    style: 'tijolo_aparente',
    width: 7.2,
    depth: 6.6,
    floors: 1,
    isBrickHouse: true,
    hasIronGate: true,
    gateStyle: 'correr_metalon',
    wallColorHex: 0xb45309,
    secondaryWallHex: 0x9a3412,
    trimColorHex: 0x64748b,
    gateColorHex: 0x1e293b,
    roofStyle: 'fibrocimento',
    houseNumber: '94',
  },
  {
    id: 'casa_verde_colonial_grade_trabalhada',
    name: 'Casa Verde Esmeralda com Muro de Tijolo e Grade',
    style: 'terrea_garagem',
    width: 7.6,
    depth: 6.8,
    floors: 1,
    isBrickHouse: false,
    hasIronGate: true,
    gateStyle: 'grade_lanca',
    wallColorHex: 0x15803d,
    secondaryWallHex: 0x166534,
    trimColorHex: 0xf0fdf4,
    gateColorHex: 0x09090b,
    roofStyle: 'garagem_telha',
    houseNumber: '216',
  },
  {
    id: 'sobrado_branco_grafite_basculante_grade',
    name: 'Sobrado Reboco Branco com Portão Basculante de Grade',
    style: 'moderna_grade',
    width: 7.8,
    depth: 7.0,
    floors: 2,
    isBrickHouse: false,
    hasIronGate: true,
    gateStyle: 'basculante_grade',
    wallColorHex: 0xf1f5f9,
    secondaryWallHex: 0x334155,
    trimColorHex: 0x1e293b,
    gateColorHex: 0x0f172a,
    roofStyle: 'laje_puxadinho',
    houseNumber: '630',
  },
  {
    id: 'casa_tijolo_sobrado_comunidade',
    name: 'Sobrado de Tijolo Baiano com Sacada de Ferro e Caixa dÁgua',
    style: 'tijolo_aparente',
    width: 7.6,
    depth: 6.9,
    floors: 2,
    isBrickHouse: true,
    hasIronGate: true,
    gateStyle: 'grade_colonial',
    wallColorHex: 0xd97706,
    secondaryWallHex: 0x9a3412,
    trimColorHex: 0x94a3b8,
    gateColorHex: 0x111827,
    roofStyle: 'laje_puxadinho',
    houseNumber: '115',
  },
];

// ============================================================================
// TEXTURAS PROCEDURAIS COMPARTILHADAS (Zero arquivos externos / Zero 404)
// ============================================================================
let cachedClayBrickTex: THREE.Texture | null = null;
let cachedClayBrickBump: THREE.Texture | null = null;
let cachedColonialRoofTex: THREE.Texture | null = null;
let cachedFibroRoofTex: THREE.Texture | null = null;
let cachedCaquinhoFloorTex: THREE.Texture | null = null;
let cachedWindowDayTex: THREE.Texture | null = null;

function getClayBrickTextures(): { map: THREE.Texture; bumpMap: THREE.Texture } {
  if (cachedClayBrickTex && cachedClayBrickBump) {
    return { map: cachedClayBrickTex, bumpMap: cachedClayBrickBump };
  }
  if (typeof document === 'undefined') {
    const dummy = new THREE.Texture();
    return { map: dummy, bumpMap: dummy };
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = 512;
  bCanvas.height = 512;
  const bCtx = bCanvas.getContext('2d')!;

  // Argamassa de cimento entre os tijolos baianos
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 0, 512, 512);

  bCtx.fillStyle = '#475569';
  bCtx.fillRect(0, 0, 512, 512);

  const rows = 14;
  const cols = 8;
  const rowH = 512 / rows;
  const colW = 512 / cols;
  const mortar = 3.5;

  const brickPalette = [
    '#c2410c', '#ea580c', '#b45309', '#9a3412',
    '#d97706', '#c2410c', '#dc2626', '#b45309',
  ];

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const colorIdx = Math.abs(r * 7 + c * 13) % brickPalette.length;
      ctx.fillStyle = brickPalette[colorIdx];
      ctx.fillRect(x + mortar, y + mortar, colW - mortar * 2, rowH - mortar * 2);

      // Ranhuras frisadas típicas de tijolo baiano 8 furos
      ctx.fillStyle = 'rgba(0, 0, 0, 0.17)';
      const grooveH = 2.2;
      ctx.fillRect(x + mortar + 2, y + rowH * 0.28, colW - mortar * 2 - 4, grooveH);
      ctx.fillRect(x + mortar + 2, y + rowH * 0.52, colW - mortar * 2 - 4, grooveH);
      ctx.fillRect(x + mortar + 2, y + rowH * 0.74, colW - mortar * 2 - 4, grooveH);

      // Leve variação térmica de queima do barro
      ctx.fillStyle = (r + c) % 3 === 0 ? 'rgba(255, 237, 213, 0.08)' : 'rgba(28, 25, 23, 0.09)';
      ctx.fillRect(x + mortar + 4, y + mortar + 2, (colW - mortar * 2) * 0.6, rowH - mortar * 2 - 4);

      bCtx.fillStyle = '#e2e8f0';
      bCtx.fillRect(x + mortar, y + mortar, colW - mortar * 2, rowH - mortar * 2);
      bCtx.fillStyle = '#94a3b8';
      bCtx.fillRect(x + mortar + 2, y + rowH * 0.28, colW - mortar * 2 - 4, grooveH);
      bCtx.fillRect(x + mortar + 2, y + rowH * 0.52, colW - mortar * 2 - 4, grooveH);
      bCtx.fillRect(x + mortar + 2, y + rowH * 0.74, colW - mortar * 2 - 4, grooveH);
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2.5, 2.0);

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2.5, 2.0);

  cachedClayBrickTex = map;
  cachedClayBrickBump = bumpMap;
  return { map, bumpMap };
}

function getColonialRoofTexture(): THREE.Texture {
  if (cachedColonialRoofTex) return cachedColonialRoofTex;
  if (typeof document === 'undefined') return new THREE.Texture();

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#9a3412';
  ctx.fillRect(0, 0, 256, 256);

  const cols = 12;
  const rows = 8;
  const colW = 256 / cols;
  const rowH = 256 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * colW;
      const y = r * rowH;
      const grad = ctx.createLinearGradient(x, y, x + colW, y);
      grad.addColorStop(0.0, '#7c2d12');
      grad.addColorStop(0.45, (r + c) % 2 === 0 ? '#c2410c' : '#b45309');
      grad.addColorStop(0.85, '#ea580c');
      grad.addColorStop(1.0, '#431407');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y + 1, colW - 1, rowH - 2);

      // Sombra da sobreposição da telha colonial
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x, y + rowH - 3, colW, 3);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  cachedColonialRoofTex = tex;
  return tex;
}

function getFibrocimentoRoofTexture(): THREE.Texture {
  if (cachedFibroRoofTex) return cachedFibroRoofTex;
  if (typeof document === 'undefined') return new THREE.Texture();

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 0, 256, 256);

  const waves = 16;
  const wStep = 256 / waves;
  for (let i = 0; i < waves; i++) {
    const x = i * wStep;
    const grad = ctx.createLinearGradient(x, 0, x + wStep, 0);
    grad.addColorStop(0.0, '#64748b');
    grad.addColorStop(0.5, '#cbd5e1');
    grad.addColorStop(1.0, '#475569');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, wStep, 256);
  }
  // Emendas horizontais das telhas Brasilit
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.fillRect(0, 84, 256, 3);
  ctx.fillRect(0, 170, 256, 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  cachedFibroRoofTex = tex;
  return tex;
}

function getCaquinhoFloorTexture(): THREE.Texture {
  if (cachedCaquinhoFloorTex) return cachedCaquinhoFloorTex;
  if (typeof document === 'undefined') return new THREE.Texture();

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Piso tradicional brasileiro de cacos de cerâmica vermelha/amarela com rejunte
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 256, 256);

  const tileColors = ['#b91c1c', '#dc2626', '#d97706', '#f59e0b', '#991b1b', '#78350f'];
  const grid = 8;
  const step = 256 / grid;
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      ctx.fillStyle = tileColors[(gx * 5 + gy * 11) % tileColors.length];
      ctx.fillRect(gx * step + 2, gy * step + 2, step - 4, step - 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  cachedCaquinhoFloorTex = tex;
  return tex;
}

function getBrazilianWindowTexture(): THREE.Texture {
  if (cachedWindowDayTex) return cachedWindowDayTex;
  if (typeof document === 'undefined') return new THREE.Texture();

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Esquadria de alumínio/ferro
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 128, 128);

  // Vidros com reflexo de céu e cortina interna aconchegante
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.0, '#fef08a');
  grad.addColorStop(0.45, '#fde047');
  grad.addColorStop(1.0, '#ca8a04');
  ctx.fillStyle = grad;
  ctx.fillRect(8, 8, 52, 112);
  ctx.fillRect(68, 8, 52, 112);

  // Veneziana / grades horizontais de janela brasileira
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  for (let y = 16; y < 118; y += 14) {
    ctx.fillRect(8, y, 52, 3);
    ctx.fillRect(68, y, 52, 3);
  }

  // Brilho no vidro
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.moveTo(12, 10);
  ctx.lineTo(44, 10);
  ctx.lineTo(12, 52);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedWindowDayTex = tex;
  return tex;
}

const houseNumberTextureCache = new Map<string, THREE.Texture>();
function getHouseNumberTexture(numStr: string): THREE.Texture {
  if (houseNumberTextureCache.has(numStr)) return houseNumberTextureCache.get(numStr)!;
  if (typeof document === 'undefined') return new THREE.Texture();

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Plaquinha azul esmaltada tradicional de numeração residencial brasileira
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, 120, 56);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(numStr, 64, 34);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  houseNumberTextureCache.set(numStr, tex);
  return tex;
}

const streetPlaqueCache = new Map<string, THREE.Texture>();
function getStreetPlaqueTexture(streetName: string): THREE.Texture {
  if (streetPlaqueCache.has(streetName)) return streetPlaqueCache.get(streetName)!;
  if (typeof document === 'undefined') return new THREE.Texture();

  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e3a8a'; // Azul esmaltado oficial de rua brasileira
  ctx.fillRect(0, 0, 160, 80);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 152, 72);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('RUA', 80, 12);
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText(streetName, 80, 36);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  streetPlaqueCache.set(streetName, tex);
  return tex;
}

// ============================================================================
// CONSTRUTOR DE PORTÕES DE FERRO BRASILEIROS DETALHADOS (Barras 3D reais)
// ============================================================================
function buildDetailedBrazilianIronGate(
  gateWidth: number,
  gateHeight: number,
  style: BrazilianHouseSpec['gateStyle'],
  gateColorHex: number
): THREE.Group {
  const gateGroup = new THREE.Group();

  const ironMat = new THREE.MeshStandardMaterial({
    color: gateColorHex,
    metalness: 0.78,
    roughness: 0.28,
  });
  ironMat.userData.isShared = true;

  const goldSpearMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.88,
    roughness: 0.22,
  });
  goldSpearMat.userData.isShared = true;

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.15,
  });
  chromeMat.userData.isShared = true;

  // Trilho metálico inferior no chão
  const trackMesh = new THREE.Mesh(
    new THREE.BoxGeometry(gateWidth + 0.3, 0.04, 0.10),
    ironMat
  );
  trackMesh.position.set(0, 0.02, 0);
  gateGroup.add(trackMesh);

  if (style === 'grade_lanca') {
    // Portão de ferro forjado com barras verticais 3D, travessas duplas, losangos ornamentais e pontas de lança douradas
    const railGeo = new THREE.BoxGeometry(gateWidth, 0.065, 0.065);
    for (const ry of [0.12, gateHeight * 0.45, gateHeight - 0.22, gateHeight - 0.08]) {
      const rail = new THREE.Mesh(railGeo, ironMat);
      rail.position.set(0, ry, 0);
      rail.castShadow = false;
      gateGroup.add(rail);
    }

    // Chapa de proteção inferior (rodapé de ferro de 32cm)
    const kickPlate = new THREE.Mesh(
      new THREE.BoxGeometry(gateWidth - 0.08, 0.32, 0.035),
      ironMat
    );
    kickPlate.position.set(0, 0.28, 0);
    gateGroup.add(kickPlate);

    const numBars = 15;
    const barGeo = new THREE.CylinderGeometry(0.018, 0.018, gateHeight - 0.16, 6);
    const spearGeo = new THREE.ConeGeometry(0.036, 0.16, 4);
    const diamondGeo = new THREE.OctahedronGeometry(0.065, 0);
    const step = (gateWidth - 0.16) / (numBars - 1);

    for (let i = 0; i < numBars; i++) {
      const bx = -gateWidth / 2 + 0.08 + i * step;
      const bar = new THREE.Mesh(barGeo, ironMat);
      bar.position.set(bx, gateHeight * 0.5, 0);
      bar.castShadow = false;
      gateGroup.add(bar);

      const spear = new THREE.Mesh(spearGeo, goldSpearMat);
      spear.position.set(bx, gateHeight + 0.02, 0);
      gateGroup.add(spear);

      // Ornamento de serralheria no vão superior a cada 2 barras
      if (i % 2 === 1 && i < numBars - 1) {
        const ornament = new THREE.Mesh(diamondGeo, goldSpearMat);
        ornament.position.set(bx, gateHeight - 0.15, 0);
        gateGroup.add(ornament);
      }
    }

    // Caixa de fechadura central e puxador
    const lockBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.08), ironMat);
    lockBox.position.set(0, gateHeight * 0.5, 0.01);
    gateGroup.add(lockBox);
  } else if (style === 'correr_metalon') {
    // Portão de correr em perfil metalon + portão social integrado com puxador cromado
    const socialW = 0.92;
    const mainW = gateWidth - socialW - 0.12;

    // Quadro externo do portão de garagem
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(gateWidth, 0.07, 0.07), ironMat);
    topRail.position.set(0, gateHeight - 0.04, 0);
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(gateWidth, 0.07, 0.07), ironMat);
    botRail.position.set(0, 0.08, 0);
    const midRail = new THREE.Mesh(new THREE.BoxGeometry(gateWidth, 0.055, 0.06), ironMat);
    midRail.position.set(0, gateHeight * 0.38, 0);
    gateGroup.add(topRail, botRail, midRail);

    // Chapa frisada na parte baixa (muito comum em casas brasileiras)
    const lowerSheet = new THREE.Mesh(
      new THREE.BoxGeometry(gateWidth - 0.06, gateHeight * 0.34, 0.03),
      ironMat
    );
    lowerSheet.position.set(0, gateHeight * 0.21, 0);
    gateGroup.add(lowerSheet);

    // Barras verticais de metalon vazadas permitindo ver a garagem e a casa
    const numBars = 16;
    const barGeo = new THREE.BoxGeometry(0.032, gateHeight - 0.12, 0.042);
    const step = (gateWidth - 0.14) / (numBars - 1);
    for (let i = 0; i < numBars; i++) {
      const bx = -gateWidth / 2 + 0.07 + i * step;
      const bar = new THREE.Mesh(barGeo, ironMat);
      bar.position.set(bx, gateHeight * 0.5, 0);
      bar.castShadow = false;
      gateGroup.add(bar);
    }

    // Divisória vertical do portão social + puxador longo inox
    const dividerX = gateWidth / 2 - socialW;
    const divider = new THREE.Mesh(new THREE.BoxGeometry(0.08, gateHeight, 0.08), ironMat);
    divider.position.set(dividerX, gateHeight * 0.5, 0);
    gateGroup.add(divider);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 8), chromeMat);
    handle.position.set(dividerX + 0.12, gateHeight * 0.48, 0.05);
    gateGroup.add(handle);

    void mainW;
  } else if (style === 'basculante_grade') {
    // Portão Basculante Brasileiro (Colunas laterais de contrapeso + folha meio chapa / meio grade vazada)
    const boxLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, gateHeight + 0.22, 0.20), ironMat);
    boxLeft.position.set(-gateWidth / 2 + 0.08, (gateHeight + 0.22) * 0.5, 0);
    const boxRight = new THREE.Mesh(new THREE.BoxGeometry(0.16, gateHeight + 0.22, 0.20), ironMat);
    boxRight.position.set(gateWidth / 2 - 0.08, (gateHeight + 0.22) * 0.5, 0);
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(gateWidth + 0.08, 0.14, 0.20), ironMat);
    topBeam.position.set(0, gateHeight + 0.15, 0);
    gateGroup.add(boxLeft, boxRight, topBeam);

    // Metade inferior em chapa almofadada (Búzios)
    const lowerPanel = new THREE.Mesh(
      new THREE.BoxGeometry(gateWidth - 0.34, gateHeight * 0.46, 0.045),
      ironMat
    );
    lowerPanel.position.set(0, gateHeight * 0.26, 0);
    gateGroup.add(lowerPanel);

    // Losangos em alto-relevo na chapa inferior
    const diamondGeo = new THREE.BoxGeometry(0.28, 0.28, 0.065);
    diamondGeo.rotateZ(Math.PI / 4);
    for (let d = -2; d <= 2; d++) {
      const dm = new THREE.Mesh(diamondGeo, goldSpearMat);
      dm.position.set(d * 0.56, gateHeight * 0.26, 0);
      gateGroup.add(dm);
    }

    // Metade superior em grade vazada horizontal e vertical
    const numBars = 13;
    const innerW = gateWidth - 0.36;
    const barGeo = new THREE.BoxGeometry(0.028, gateHeight * 0.52, 0.038);
    for (let i = 0; i < numBars; i++) {
      const bx = -innerW / 2 + (i / (numBars - 1)) * innerW;
      const bar = new THREE.Mesh(barGeo, ironMat);
      bar.position.set(bx, gateHeight * 0.74, 0);
      gateGroup.add(bar);
    }
  } else if (style === 'grade_branca_tubular') {
    // Portão de grade branca tubular de metal (Foto 4)
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.25,
      roughness: 0.35,
    });
    whiteMat.userData.isShared = true;

    // Quadro perimetral e travessas horizontais
    const railGeo = new THREE.BoxGeometry(gateWidth, 0.05, 0.05);
    for (const ry of [0.08, gateHeight * 0.48, gateHeight - 0.06]) {
      const rail = new THREE.Mesh(railGeo, whiteMat);
      rail.position.set(0, ry, 0);
      rail.castShadow = false;
      gateGroup.add(rail);
    }

    // Tubos verticais cilíndricos brancos
    const numTubes = 18;
    const tubeGeo = new THREE.CylinderGeometry(0.018, 0.018, gateHeight - 0.12, 8);
    const step = (gateWidth - 0.16) / (numTubes - 1);
    for (let i = 0; i < numTubes; i++) {
      const bx = -gateWidth / 2 + 0.08 + i * step;
      const tube = new THREE.Mesh(tubeGeo, whiteMat);
      tube.position.set(bx, gateHeight * 0.5, 0);
      tube.castShadow = false;
      gateGroup.add(tube);
    }

    // Puxador vertical e trinco social
    const latchBox = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.06), chromeMat);
    latchBox.position.set(gateWidth * 0.22, gateHeight * 0.48, 0.04);
    gateGroup.add(latchBox);
  } else if (style === 'arabescos_artisticos') {
    // Grade branca artística forjada com arabescos, volutas e círculos decorativos (Foto 5)
    const whiteIronMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.35,
      roughness: 0.30,
    });
    whiteIronMat.userData.isShared = true;

    // Travessas horizontais superior, intermediária e inferior
    const hBarGeo = new THREE.BoxGeometry(gateWidth, 0.045, 0.045);
    for (const ry of [0.08, gateHeight * 0.46, gateHeight - 0.08]) {
      const hBar = new THREE.Mesh(hBarGeo, whiteIronMat);
      hBar.position.set(0, ry, 0);
      gateGroup.add(hBar);
    }

    // Barras verticais estruturais
    const numBars = 12;
    const barGeo = new THREE.CylinderGeometry(0.016, 0.016, gateHeight - 0.14, 8);
    const step = (gateWidth - 0.14) / (numBars - 1);
    for (let i = 0; i < numBars; i++) {
      const bx = -gateWidth / 2 + 0.07 + i * step;
      const bar = new THREE.Mesh(barGeo, whiteIronMat);
      bar.position.set(bx, gateHeight * 0.5, 0);
      bar.castShadow = false;
      gateGroup.add(bar);
    }

    // Arabescos ornamentais curvilíneos (volutas/anéis de serralheria artística)
    const ringGeo = new THREE.TorusGeometry(0.14, 0.014, 6, 16);
    const numRings = Math.max(3, Math.floor(gateWidth / 0.55));
    const ringStep = (gateWidth - 0.4) / Math.max(1, numRings - 1);
    for (let i = 0; i < numRings; i++) {
      const rx = -gateWidth / 2 + 0.2 + i * ringStep;
      // Anel no vão superior
      const ringTop = new THREE.Mesh(ringGeo, whiteIronMat);
      ringTop.position.set(rx, gateHeight * 0.72, 0);
      gateGroup.add(ringTop);
      // Anel no vão inferior
      const ringBot = new THREE.Mesh(ringGeo, whiteIronMat);
      ringBot.position.set(rx, gateHeight * 0.25, 0);
      gateGroup.add(ringBot);
    }

    // Detalhe de puxador ornamental
    const ornateHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8), chromeMat);
    ornateHandle.position.set(0.12, gateHeight * 0.46, 0.05);
    gateGroup.add(ornateHandle);
  } else {
    // Grade Colonial Brasileira com arcos/lanças e barras duplas
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(gateWidth, 0.06, 0.06), ironMat);
    topBar.position.set(0, gateHeight - 0.10, 0);
    const midBar = new THREE.Mesh(new THREE.BoxGeometry(gateWidth, 0.06, 0.06), ironMat);
    midBar.position.set(0, gateHeight * 0.42, 0);
    const botBar = new THREE.Mesh(new THREE.BoxGeometry(gateWidth, 0.06, 0.06), ironMat);
    botBar.position.set(0, 0.10, 0);
    gateGroup.add(topBar, midBar, botBar);

    const numBars = 14;
    const barGeo = new THREE.CylinderGeometry(0.02, 0.02, gateHeight - 0.12, 6);
    const tipGeo = new THREE.ConeGeometry(0.035, 0.14, 4);
    for (let i = 0; i < numBars; i++) {
      const bx = -gateWidth / 2 + 0.10 + (i / (numBars - 1)) * (gateWidth - 0.20);
      const bar = new THREE.Mesh(barGeo, ironMat);
      bar.position.set(bx, gateHeight * 0.5, 0);
      gateGroup.add(bar);

      const tip = new THREE.Mesh(tipGeo, ironMat);
      tip.position.set(bx, gateHeight, 0);
      gateGroup.add(tip);
    }
  }

  return gateGroup;
}

// ============================================================================
// 1. CASA PAULISTA COLONIAL 4 ÁGUAS COM VARANDA EMBUTIDA, CALHAS E HIBISCOS (FOTO 4)
// ============================================================================
function buildCasaPaulistaColonial(spec: BrazilianHouseSpec, _seed: number): BuildingTemplate {
  const g = new THREE.Group();
  g.name = spec.id;

  const w = spec.width; // 7.8
  const d = spec.depth; // 7.0
  const yardDepth = 1.85;
  const houseDepth = d - yardDepth; // 5.15
  const houseH = 3.35;
  const facadeZ = -yardDepth;

  const colonialRoofTex = getColonialRoofTexture();
  const caquinhoTex = getCaquinhoFloorTexture();
  const winTex = getBrazilianWindowTexture();

  const peachWallMat = new THREE.MeshStandardMaterial({
    color: spec.wallColorHex, // 0xe59b6b
    roughness: 0.82,
  });
  peachWallMat.userData.isShared = true;

  const plinthMat = new THREE.MeshStandardMaterial({
    color: spec.secondaryWallHex, // 0xd97736
    roughness: 0.80,
  });
  plinthMat.userData.isShared = true;

  const whiteTrimMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.55,
  });
  whiteTrimMat.userData.isShared = true;

  const whiteGutterMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.20,
    roughness: 0.40,
  });
  whiteGutterMat.userData.isShared = true;

  const colonialRoofMat = new THREE.MeshStandardMaterial({
    map: colonialRoofTex,
    color: 0xffffff,
    roughness: 0.78,
  });
  colonialRoofMat.userData.isShared = true;

  // A. PISO DO QUINTAL / VARANDA (Piso vermelho/caquinho brasileiro)
  const yardFloor = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.12, d),
    new THREE.MeshStandardMaterial({ map: caquinhoTex, color: 0xffffff, roughness: 0.78 })
  );
  yardFloor.position.set(0, 0.06, -d / 2);
  yardFloor.receiveShadow = true;
  g.add(yardFloor);

  // B. CORPO DA CASA: ALA ESQUERDA (FECHADA COM JANELA) + ALA DIREITA (VARANDA EMBUTIDA RECUADA)
  const porchW = 3.2;
  const porchRecess = 1.75;
  const leftW = w - porchW;
  const houseCenterZ = -yardDepth - houseDepth / 2;

  // Ala esquerda fechada (com janela ampla)
  const leftBody = new THREE.Mesh(
    new THREE.BoxGeometry(leftW, houseH, houseDepth),
    peachWallMat
  );
  leftBody.position.set(-w / 2 + leftW / 2, houseH / 2, houseCenterZ);
  leftBody.castShadow = false;
  leftBody.receiveShadow = true;
  g.add(leftBody);

  // Barra de rodapé/azulejo na ala esquerda
  const leftPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(leftW + 0.04, 0.38, houseDepth + 0.04),
    plinthMat
  );
  leftPlinth.position.set(-w / 2 + leftW / 2, 0.19, houseCenterZ);
  g.add(leftPlinth);

  // Ala direita com Varanda Embutida (recuada em relação à fachada)
  const porchBackZ = facadeZ - porchRecess - (houseDepth - porchRecess) / 2;
  const rightBackBody = new THREE.Mesh(
    new THREE.BoxGeometry(porchW, houseH, houseDepth - porchRecess),
    peachWallMat
  );
  rightBackBody.position.set(w / 2 - porchW / 2, houseH / 2, porchBackZ);
  rightBackBody.castShadow = false;
  rightBackBody.receiveShadow = true;
  g.add(rightBackBody);

  // Viga superior / verga da varanda embutida na frente
  const porchBeam = new THREE.Mesh(
    new THREE.BoxGeometry(porchW + 0.08, 0.42, 0.28),
    peachWallMat
  );
  porchBeam.position.set(w / 2 - porchW / 2, houseH - 0.21, facadeZ + 0.1);
  porchBeam.castShadow = false;
  g.add(porchBeam);

  // Parede lateral direita da varanda
  const rightPorchWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, houseH, porchRecess),
    peachWallMat
  );
  rightPorchWall.position.set(w / 2 - 0.12, houseH / 2, facadeZ - porchRecess / 2);
  g.add(rightPorchWall);

  // C. JANELA DA ALA ESQUERDA (Moldura branca saliente com grades verticais - Foto 4)
  const winW = 1.55;
  const winH = 1.25;
  const winX = -w / 2 + leftW * 0.48;
  const winY = 1.72;

  const winTrim = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.18, winH + 0.18, 0.10), whiteTrimMat);
  winTrim.position.set(winX, winY, facadeZ + 0.02);
  g.add(winTrim);

  const winGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(winW, winH),
    new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.2, metalness: 0.15 })
  );
  winGlass.position.set(winX, winY, facadeZ + 0.08);
  g.add(winGlass);

  // Grades brancas de proteção verticais na janela (Foto 4)
  const numGrilleBars = 7;
  const barGeo = new THREE.CylinderGeometry(0.012, 0.012, winH + 0.04, 6);
  for (let b = 0; b < numGrilleBars; b++) {
    const gx = winX - winW / 2 + 0.12 + (b / (numGrilleBars - 1)) * (winW - 0.24);
    const bar = new THREE.Mesh(barGeo, whiteTrimMat);
    bar.position.set(gx, winY, facadeZ + 0.10);
    g.add(bar);
  }

  // D. PORTA E JANELA INTERNA DENTRO DA VARANDA EMBUTIDA
  const innerFacadeZ = facadeZ - porchRecess + 0.04;
  const doorX = w / 2 - porchW * 0.35;
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.08, 2.22, 0.08), whiteTrimMat);
  doorFrame.position.set(doorX, 1.11, innerFacadeZ);
  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.94, 2.12, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x5c2d16, roughness: 0.65 })
  );
  doorPanel.position.set(doorX, 1.06, innerFacadeZ + 0.02);
  g.add(doorFrame, doorPanel);

  const porchWinX = w / 2 - porchW * 0.78;
  const porchWin = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 1.05),
    new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.25 })
  );
  porchWin.position.set(porchWinX, 1.68, innerFacadeZ + 0.02);
  g.add(porchWin);

  // E. PLAQUINHA AZUL DE RUA TRADICIONAL NO CANTO SUPERIOR ESQUERDO ("RUA NHAMUNDÁ" - Foto 4)
  const plaqueMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.22),
    new THREE.MeshBasicMaterial({ map: getStreetPlaqueTexture('NHAMUNDÁ') })
  );
  plaqueMesh.position.set(-w / 2 + 0.42, houseH - 0.55, facadeZ + 0.04);
  g.add(plaqueMesh);

  // F. TELHADO COLONIAL DE 4 ÁGUAS (HIP ROOF) COM BEIRAL E CALHAS BRANCAS (Foto 4)
  const roofW = w + 0.55;
  const roofD = houseDepth + 0.65;
  const roofApexY = houseH + 1.25;

  // Telhado frontal inclinado
  const frontSlope = new THREE.Mesh(
    new THREE.BoxGeometry(roofW - 1.2, 0.10, roofD * 0.56),
    colonialRoofMat
  );
  frontSlope.position.set(0, houseH + 0.58, houseCenterZ + roofD * 0.22);
  frontSlope.rotation.x = 0.38;
  frontSlope.castShadow = false;

  // Telhado traseiro inclinado
  const backSlope = new THREE.Mesh(
    new THREE.BoxGeometry(roofW - 1.2, 0.10, roofD * 0.56),
    colonialRoofMat
  );
  backSlope.position.set(0, houseH + 0.58, houseCenterZ - roofD * 0.22);
  backSlope.rotation.x = -0.38;
  backSlope.castShadow = false;

  // Água lateral esquerda (Hip triangle)
  const leftHip = new THREE.Mesh(
    new THREE.ConeGeometry(roofD * 0.48, 1.15, 3),
    colonialRoofMat
  );
  leftHip.position.set(-roofW / 2 + 0.5, houseH + 0.58, houseCenterZ);
  leftHip.rotation.y = Math.PI / 2;
  leftHip.rotation.z = -0.15;
  leftHip.castShadow = false;

  // Água lateral direita (Hip triangle)
  const rightHip = new THREE.Mesh(
    new THREE.ConeGeometry(roofD * 0.48, 1.15, 3),
    colonialRoofMat
  );
  rightHip.position.set(roofW / 2 - 0.5, houseH + 0.58, houseCenterZ);
  rightHip.rotation.y = -Math.PI / 2;
  rightHip.rotation.z = 0.15;
  rightHip.castShadow = false;

  // Cumeeira central
  const ridgeBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, roofW * 0.55, 6),
    colonialRoofMat
  );
  ridgeBeam.rotation.z = Math.PI / 2;
  ridgeBeam.position.set(0, roofApexY, houseCenterZ);
  g.add(frontSlope, backSlope, leftHip, rightHip, ridgeBeam);

  // G. CALHAS DE CHUVA BRANCAS PERIMETRAIS + CONDUTOR PLUVIAL VERTICAL (Foto 4)
  const gutterGeo = new THREE.BoxGeometry(roofW + 0.1, 0.10, 0.12);
  const frontGutter = new THREE.Mesh(gutterGeo, whiteGutterMat);
  frontGutter.position.set(0, houseH + 0.05, facadeZ + 0.28);
  g.add(frontGutter);

  // Cano condutor de água pluvial vertical descendo pelo canto esquerdo
  const downspoutPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, houseH - 0.35, 8),
    whiteGutterMat
  );
  downspoutPipe.position.set(-w / 2 + 0.15, (houseH - 0.35) * 0.5 + 0.1, facadeZ + 0.18);
  downspoutPipe.castShadow = false;

  // Joelhos / curvas do cano
  const elbowTop = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.035, 6, 8, Math.PI * 0.5), whiteGutterMat);
  elbowTop.position.set(-w / 2 + 0.15, houseH - 0.12, facadeZ + 0.22);
  elbowTop.rotation.y = -Math.PI / 2;

  const elbowBot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), whiteGutterMat);
  elbowBot.rotation.x = Math.PI / 3;
  elbowBot.position.set(-w / 2 + 0.15, 0.14, facadeZ + 0.26);
  g.add(downspoutPipe, elbowTop, elbowBot);

  // H. ANTENA DE TV METÁLICA ("ESPINHA DE PEIXE") NO TOPO DO TELHADO (Foto 4)
  const tvMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1.85, 6),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 })
  );
  tvMast.position.set(0, roofApexY + 0.95, houseCenterZ);

  // Elementos diretores horizontais da antena espinha de peixe
  const dirLengths = [0.85, 0.68, 0.52, 0.38, 0.28];
  for (let e = 0; e < dirLengths.length; e++) {
    const dirMesh = new THREE.Mesh(
      new THREE.BoxGeometry(dirLengths[e], 0.015, 0.015),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
    );
    dirMesh.position.set(0, roofApexY + 1.25 + e * 0.14, houseCenterZ);
    g.add(dirMesh);
  }
  g.add(tvMast);

  // I. JARDIM FRONTAL COM FLORES DE HIBISCO (Foto 4)
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.82 });
  const flowerMatPink = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.55 });
  const flowerMatRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.55 });
  const flowerMatWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });

  for (let b = 0; b < 3; b++) {
    const bx = -w * 0.15 + b * 0.75;
    const bz = -0.95 + (b % 2) * 0.25;
    const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42 + (b % 2) * 0.12, 1), bushMat);
    shrub.position.set(bx, 0.52, bz);
    shrub.castShadow = false;
    g.add(shrub);

    // Flores de hibisco brotando no arbusto
    for (let f = 0; f < 3; f++) {
      const flMat = f === 0 ? flowerMatPink : f === 1 ? flowerMatRed : flowerMatWhite;
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), flMat);
      flower.position.set(bx + (f - 1) * 0.22, 0.72 + (f % 2) * 0.16, bz + 0.28);
      g.add(flower);
    }
  }

  // J. MURO BAIXO COM GRADE BRANCA TUBULAR E PORTÃO (Foto 4)
  const muroH = 1.45;
  const curbBaseH = 0.26;
  const gateW = 3.2;

  // Base de alvenaria baixa
  const wallBaseL = new THREE.Mesh(
    new THREE.BoxGeometry((w - gateW) / 2, curbBaseH, 0.20),
    peachWallMat
  );
  wallBaseL.position.set(-w / 2 + (w - gateW) / 4, curbBaseH / 2, 0);
  const wallBaseR = new THREE.Mesh(
    new THREE.BoxGeometry((w - gateW) / 2, curbBaseH, 0.20),
    peachWallMat
  );
  wallBaseR.position.set(w / 2 - (w - gateW) / 4, curbBaseH / 2, 0);
  g.add(wallBaseL, wallBaseR);

  // Pilares brancos tubulares
  const pilarGeo = new THREE.BoxGeometry(0.24, muroH + 0.1, 0.24);
  for (const px of [-w / 2 + 0.12, -gateW / 2, gateW / 2, w / 2 - 0.12]) {
    const pil = new THREE.Mesh(pilarGeo, whiteTrimMat);
    pil.position.set(px, (muroH + 0.1) / 2, 0);
    pil.castShadow = false;
    g.add(pil);
  }

  // Grade branca tubular frontal e portão
  const sideGrilleL = buildDetailedBrazilianIronGate((w - gateW) / 2 - 0.1, muroH - curbBaseH, 'grade_branca_tubular', 0xf8fafc);
  sideGrilleL.position.set(-w / 2 + (w - gateW) / 4, curbBaseH, 0);
  const sideGrilleR = buildDetailedBrazilianIronGate((w - gateW) / 2 - 0.1, muroH - curbBaseH, 'grade_branca_tubular', 0xf8fafc);
  sideGrilleR.position.set(w / 2 - (w - gateW) / 4, curbBaseH, 0);
  const mainGate = buildDetailedBrazilianIronGate(gateW, muroH, 'grade_branca_tubular', 0xf8fafc);
  mainGate.position.set(0, 0, 0);
  g.add(sideGrilleL, sideGrilleR, mainGate);

  // Número da casa no pilar
  const numPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.13),
    new THREE.MeshBasicMaterial({ map: getHouseNumberTexture(spec.houseNumber) })
  );
  numPlaque.position.set(gateW / 2 + 0.13, 1.15, 0.13);
  g.add(numPlaque);

  return {
    name: spec.name,
    group: g,
    width: w,
    depth: d,
    height: houseH + 2.1,
    frontZ: 0.18,
  };
}

// ============================================================================
// 2. CASA TRADICIONAL COM ARCO PLENO, PLATIBANDA ONDULADA E PALMEIRAS (FOTO 5)
// ============================================================================
function buildCasaArcoColonial(spec: BrazilianHouseSpec, _seed: number): BuildingTemplate {
  const g = new THREE.Group();
  g.name = spec.id;

  const w = spec.width; // 7.8
  const d = spec.depth; // 7.0
  const yardDepth = 1.85;
  const houseDepth = d - yardDepth; // 5.15
  const houseH = 3.45;
  const facadeZ = -yardDepth;

  const colonialRoofTex = getColonialRoofTexture();
  const caquinhoTex = getCaquinhoFloorTexture();
  const winTex = getBrazilianWindowTexture();

  const yellowWallMat = new THREE.MeshStandardMaterial({
    color: spec.wallColorHex, // 0xeab308
    roughness: 0.78,
  });
  yellowWallMat.userData.isShared = true;

  const ocherPlinthMat = new THREE.MeshStandardMaterial({
    color: spec.secondaryWallHex, // 0xca8a04
    roughness: 0.80,
  });
  ocherPlinthMat.userData.isShared = true;

  const creamTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.60,
  });
  creamTrimMat.userData.isShared = true;

  const whiteIronMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.35,
    roughness: 0.30,
  });
  whiteIronMat.userData.isShared = true;

  const whiteGutterMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.40,
    metalness: 0.15,
  });
  whiteGutterMat.userData.isShared = true;

  const colonialRoofMat = new THREE.MeshStandardMaterial({
    map: colonialRoofTex,
    color: 0xffffff,
    roughness: 0.78,
  });
  colonialRoofMat.userData.isShared = true;

  // A. PISO DO QUINTAL / VARANDA
  const yardFloor = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.12, d),
    new THREE.MeshStandardMaterial({ map: caquinhoTex, color: 0xffffff, roughness: 0.78 })
  );
  yardFloor.position.set(0, 0.06, -d / 2);
  yardFloor.receiveShadow = true;
  g.add(yardFloor);

  // B. CORPO DA CASA: ALA ESQUERDA (JANELA COM GRADE DIAMANTE) + ALA DIREITA (PÓRTICO COM ARCO PLENO)
  const porchW = 3.6;
  const porchRecess = 1.85;
  const leftW = w - porchW;
  const houseCenterZ = -yardDepth - houseDepth / 2;

  // Corpo esquerdo da casa
  const leftBody = new THREE.Mesh(
    new THREE.BoxGeometry(leftW, houseH, houseDepth),
    yellowWallMat
  );
  leftBody.position.set(-w / 2 + leftW / 2, houseH / 2, houseCenterZ);
  leftBody.castShadow = false;
  leftBody.receiveShadow = true;
  g.add(leftBody);

  // Rodapé da ala esquerda
  const leftPlinth = new THREE.Mesh(
    new THREE.BoxGeometry(leftW + 0.04, 0.42, houseDepth + 0.04),
    ocherPlinthMat
  );
  leftPlinth.position.set(-w / 2 + leftW / 2, 0.21, houseCenterZ);
  g.add(leftPlinth);

  // Fundo da varanda direita
  const porchBackZ = facadeZ - porchRecess - (houseDepth - porchRecess) / 2;
  const rightBackBody = new THREE.Mesh(
    new THREE.BoxGeometry(porchW, houseH, houseDepth - porchRecess),
    yellowWallMat
  );
  rightBackBody.position.set(w / 2 - porchW / 2, houseH / 2, porchBackZ);
  rightBackBody.castShadow = false;
  rightBackBody.receiveShadow = true;
  g.add(rightBackBody);

  // Parede lateral externa direita da varanda
  const rightPorchWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, houseH, porchRecess),
    yellowWallMat
  );
  rightPorchWall.position.set(w / 2 - 0.12, houseH / 2, facadeZ - porchRecess / 2);
  g.add(rightPorchWall);

  // C. FACHADA DO PÓRTICO COM ARCO PLENO (SEMICIRCULAR ROUND ARCH - Foto 5)
  const archCenterX = w / 2 - porchW * 0.48;
  const archRadius = 1.15;
  const archPillarH = 1.85;

  // Pilar esquerdo do arco
  const archPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.32, archPillarH, 0.24), creamTrimMat);
  archPillarL.position.set(archCenterX - archRadius - 0.16, archPillarH / 2, facadeZ + 0.02);
  // Pilar direito do arco
  const archPillarR = new THREE.Mesh(new THREE.BoxGeometry(0.32, archPillarH, 0.24), creamTrimMat);
  archPillarR.position.set(archCenterX + archRadius + 0.16, archPillarH / 2, facadeZ + 0.02);
  g.add(archPillarL, archPillarR);

  // Enquadramento curvo do Arco Pleno (Torus semicircular em relevo no topo dos pilares)
  const archRingGeo = new THREE.TorusGeometry(archRadius, 0.14, 8, 16, Math.PI);
  const archRing = new THREE.Mesh(archRingGeo, creamTrimMat);
  archRing.position.set(archCenterX, archPillarH, facadeZ + 0.04);
  archRing.rotation.z = 0;
  g.add(archRing);

  // Paredes de fechamento sobre e ao lado do arco
  const archTopWall = new THREE.Mesh(
    new THREE.BoxGeometry(porchW + 0.04, houseH - (archPillarH + archRadius), 0.24),
    yellowWallMat
  );
  archTopWall.position.set(
    w / 2 - porchW / 2,
    archPillarH + archRadius + (houseH - (archPillarH + archRadius)) / 2,
    facadeZ + 0.02
  );
  g.add(archTopWall);

  // Spandrels (cantos entre o arco e o teto)
  const spandrelL = new THREE.Mesh(new THREE.BoxGeometry(0.32, archRadius, 0.24), yellowWallMat);
  spandrelL.position.set(archCenterX - archRadius - 0.16, archPillarH + archRadius * 0.5, facadeZ + 0.02);
  const spandrelR = new THREE.Mesh(new THREE.BoxGeometry(0.32, archRadius, 0.24), yellowWallMat);
  spandrelR.position.set(archCenterX + archRadius + 0.16, archPillarH + archRadius * 0.5, facadeZ + 0.02);
  g.add(spandrelL, spandrelR);

  // Porta branca no interior sombreado da varanda
  const innerFacadeZ = facadeZ - porchRecess + 0.04;
  const innerDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 2.15, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
  );
  innerDoor.position.set(archCenterX, 1.08, innerFacadeZ);
  g.add(innerDoor);

  // D. JANELA COM GRADE BRANCA EM LOSANGOS / ARABESCOS (Foto 5)
  const winW = 1.6;
  const winH = 1.3;
  const winX = -w / 2 + leftW * 0.5;
  const winY = 1.75;

  const winGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(winW, winH),
    new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.22 })
  );
  winGlass.position.set(winX, winY, facadeZ + 0.04);
  g.add(winGlass);

  const winBorder = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.14, winH + 0.14, 0.06), creamTrimMat);
  winBorder.position.set(winX, winY, facadeZ + 0.02);
  g.add(winBorder);

  // Grade geométrica em losangos (barras diagonais cruzadas em X a 45 graus)
  const numDiags = 6;
  const diagBarGeo = new THREE.CylinderGeometry(0.012, 0.012, winH * 1.35, 6);
  for (let d = -numDiags / 2; d <= numDiags / 2; d++) {
    const b1 = new THREE.Mesh(diagBarGeo, whiteIronMat);
    b1.position.set(winX + d * 0.24, winY, facadeZ + 0.08);
    b1.rotation.z = Math.PI / 4;
    const b2 = new THREE.Mesh(diagBarGeo, whiteIronMat);
    b2.position.set(winX + d * 0.24, winY, facadeZ + 0.08);
    b2.rotation.z = -Math.PI / 4;
    g.add(b1, b2);
  }

  // E. PLATIBANDA ONDULADA / FRONTÃO BARROCO SINUOSO NO TOPO DO TELHADO (Foto 5)
  const parapetW = 3.8;

  // Base do frontão
  const frontonBase = new THREE.Mesh(new THREE.BoxGeometry(parapetW, 0.42, 0.22), yellowWallMat);
  frontonBase.position.set(archCenterX, houseH + 0.21, facadeZ + 0.04);

  // Arco decorativo sinuoso central da platibanda
  const crestArch = new THREE.Mesh(
    new THREE.CylinderGeometry(parapetW * 0.38, parapetW * 0.38, 0.20, 16, 1, false, 0, Math.PI),
    yellowWallMat
  );
  crestArch.rotation.z = Math.PI;
  crestArch.rotation.y = Math.PI / 2;
  crestArch.position.set(archCenterX, houseH + 0.42, facadeZ + 0.04);

  // Moldura curva branca superior
  const crestTrim = new THREE.Mesh(
    new THREE.TorusGeometry(parapetW * 0.39, 0.07, 6, 16, Math.PI),
    creamTrimMat
  );
  crestTrim.position.set(archCenterX, houseH + 0.42, facadeZ + 0.12);
  crestTrim.rotation.z = 0;
  g.add(frontonBase, crestArch, crestTrim);

  // Telhado colonial em duas águas atrás da platibanda
  const roofW = w + 0.4;
  const roofD = houseDepth + 0.5;
  const mainRoof = new THREE.Mesh(new THREE.BoxGeometry(roofW, 0.12, roofD * 0.55), colonialRoofMat);
  mainRoof.position.set(0, houseH + 0.45, houseCenterZ + 0.2);
  mainRoof.rotation.x = 0.32;
  mainRoof.castShadow = false;
  g.add(mainRoof);

  // F. CALHAS BRANCAS E CONDUTORES PLUVIAIS NOS DOIS CANTOS (Foto 5)
  const gutterMesh = new THREE.Mesh(new THREE.BoxGeometry(roofW + 0.1, 0.09, 0.11), whiteGutterMat);
  gutterMesh.position.set(0, houseH + 0.05, facadeZ + 0.22);
  g.add(gutterMesh);

  for (const cx of [-w / 2 + 0.14, w / 2 - 0.14]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, houseH - 0.2, 8), whiteGutterMat);
    pipe.position.set(cx, (houseH - 0.2) * 0.5 + 0.1, facadeZ + 0.16);
    pipe.castShadow = false;
    g.add(pipe);
  }

  // G. PALMEIRAS BRASILEIRAS ESGUIAS DE JARDIM NO QUINTAL FRONTAL (Foto 5)
  const palmMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.72 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.90 });

  const addGardenPalm = (px: number, pz: number, palmH: number) => {
    const palmGroup = new THREE.Group();
    // Tronco esguio segmentado levemente inclinado
    const numSegs = 7;
    const segH = palmH / numSegs;
    let currX = 0;
    let currY = 0;
    for (let s = 0; s < numSegs; s++) {
      const segMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065 - s * 0.004, 0.072 - s * 0.004, segH, 7),
        trunkMat
      );
      currX += (s * 0.035);
      segMesh.position.set(currX, currY + segH / 2, 0);
      segMesh.rotation.z = -0.06;
      segMesh.castShadow = false;
      palmGroup.add(segMesh);
      currY += segH;
    }

    // Coroa de folhas de palmeira em leque/penas arqueadas para fora
    const numFronds = 9;
    for (let f = 0; f < numFronds; f++) {
      const fAngle = (f / numFronds) * Math.PI * 2;
      const frondCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(currX, currY, 0),
        new THREE.Vector3(currX + Math.cos(fAngle) * 0.85, currY + 0.45, Math.sin(fAngle) * 0.85),
        new THREE.Vector3(currX + Math.cos(fAngle) * 1.65, currY - 0.25, Math.sin(fAngle) * 1.65),
      ]);
      const frondGeo = new THREE.TubeGeometry(frondCurve, 8, 0.045, 4, false);
      const frond = new THREE.Mesh(frondGeo, palmMat);
      palmGroup.add(frond);
    }

    palmGroup.position.set(px, 0.08, pz);
    g.add(palmGroup);
  };

  addGardenPalm(-w * 0.26, -0.92, 4.8);
  addGardenPalm(-w * 0.38, -0.75, 5.3);

  // H. MURO FRONTAL ONDULADO COM ARABESCOS ARTÍSTICOS DE FERRO BRANCO (Foto 5)
  const muroH = 1.55;
  const gateW = 2.45;

  // Muro frontal ondulado em amarelo
  const wallL = new THREE.Mesh(
    new THREE.BoxGeometry((w - gateW) / 2, 0.95, 0.22),
    yellowWallMat
  );
  wallL.position.set(-w / 2 + (w - gateW) / 4, 0.475, 0);

  const wallR = new THREE.Mesh(
    new THREE.BoxGeometry((w - gateW) / 2, 0.95, 0.22),
    yellowWallMat
  );
  wallR.position.set(w / 2 - (w - gateW) / 4, 0.475, 0);
  g.add(wallL, wallR);

  // Grade ornamental sobre o muro com arabescos
  const wallGrilleL = buildDetailedBrazilianIronGate((w - gateW) / 2 - 0.1, 0.55, 'arabescos_artisticos', 0xffffff);
  wallGrilleL.position.set(-w / 2 + (w - gateW) / 4, 0.95, 0);
  const wallGrilleR = buildDetailedBrazilianIronGate((w - gateW) / 2 - 0.1, 0.55, 'arabescos_artisticos', 0xffffff);
  wallGrilleR.position.set(w / 2 - (w - gateW) / 4, 0.95, 0);
  g.add(wallGrilleL, wallGrilleR);

  // Pilares do portão com topos chanfrados
  const pilarGeo = new THREE.BoxGeometry(0.36, muroH + 0.15, 0.36);
  const capGeo = new THREE.ConeGeometry(0.28, 0.18, 4);
  for (const px of [-gateW / 2, gateW / 2]) {
    const pil = new THREE.Mesh(pilarGeo, yellowWallMat);
    pil.position.set(px, (muroH + 0.15) / 2, 0);
    pil.castShadow = false;

    const cap = new THREE.Mesh(capGeo, creamTrimMat);
    cap.position.set(px, muroH + 0.24, 0);
    cap.rotation.y = Math.PI / 4;
    g.add(pil, cap);
  }

  // Portão social artístico de ferro branco com arabescos (Foto 5)
  const mainGate = buildDetailedBrazilianIronGate(gateW, muroH, 'arabescos_artisticos', 0xffffff);
  mainGate.position.set(0, 0, 0);
  g.add(mainGate);

  // Plaquinha com número da casa
  const numPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.25, 0.13),
    new THREE.MeshBasicMaterial({ map: getHouseNumberTexture(spec.houseNumber) })
  );
  numPlaque.position.set(gateW / 2, 1.25, 0.20);
  g.add(numPlaque);

  return {
    name: spec.name,
    group: g,
    width: w,
    depth: d,
    height: houseH + 1.8,
    frontZ: 0.18,
  };
}

// ============================================================================
// CONSTRUTOR DE CASA BRASILEIRA COMPLETA (Muro + Portão de Ferro + Quintal + Casa)
// ============================================================================
function buildProceduralBrazilianHouse(spec: BrazilianHouseSpec, seed: number): BuildingTemplate {
  if (spec.style === 'colonial_paulista') {
    return buildCasaPaulistaColonial(spec, seed);
  }
  if (spec.style === 'colonial_arco_varanda') {
    return buildCasaArcoColonial(spec, seed);
  }

  const g = new THREE.Group();
  g.name = spec.id;

  const w = spec.width;
  const d = spec.depth;
  const yardDepth = 1.85; // Recuo frontal (garagem/varanda visível através das grades do portão!)
  const houseDepth = d - yardDepth;
  const floorHeight = 3.15;
  const houseH = spec.floors === 2 ? floorHeight * 2 : 3.45;

  const brickTex = getClayBrickTextures();
  const colonialRoofTex = getColonialRoofTexture();
  const fibroRoofTex = getFibrocimentoRoofTexture();
  const caquinhoTex = getCaquinhoFloorTexture();
  const winTex = getBrazilianWindowTexture();

  const brickMat = new THREE.MeshStandardMaterial({
    map: brickTex.map,
    bumpMap: brickTex.bumpMap,
    bumpScale: 0.035,
    color: 0xffffff,
    roughness: 0.88,
  });
  brickMat.userData.isShared = true;

  const paintedWallMat = new THREE.MeshStandardMaterial({
    color: spec.wallColorHex,
    roughness: 0.80,
  });
  paintedWallMat.userData.isShared = true;

  const secondaryWallMat = new THREE.MeshStandardMaterial({
    color: spec.secondaryWallHex,
    roughness: 0.82,
  });
  secondaryWallMat.userData.isShared = true;

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.86,
  });
  concreteMat.userData.isShared = true;

  const trimMat = new THREE.MeshStandardMaterial({
    color: spec.trimColorHex,
    roughness: 0.65,
  });
  trimMat.userData.isShared = true;

  const darkIronMat = new THREE.MeshStandardMaterial({
    color: spec.gateColorHex,
    metalness: 0.75,
    roughness: 0.30,
  });
  darkIronMat.userData.isShared = true;

  const woodDoorMat = new THREE.MeshStandardMaterial({
    color: 0x5c2d16,
    roughness: 0.68,
  });
  woodDoorMat.userData.isShared = true;

  const winMat = new THREE.MeshStandardMaterial({
    map: winTex,
    roughness: 0.22,
    metalness: 0.15,
  });
  winMat.userData.isShared = true;

  // 1. PISO DO QUINTAL / GARAGEM (Piso de caquinho cerâmico brasileiro)
  const yardFloor = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.12, d),
    new THREE.MeshStandardMaterial({ map: caquinhoTex, color: 0xffffff, roughness: 0.78 })
  );
  yardFloor.position.set(0, 0.06, -d / 2);
  yardFloor.receiveShadow = true;
  g.add(yardFloor);

  // 2. CORPO PRINCIPAL DA CASA (Com variações de tijolo baiano, meio-reboco, sobrado ou geminada)
  const houseCenterZ = -yardDepth - houseDepth / 2;

  if (spec.style === 'geminada') {
    // Duas casas geminadas lado a lado (muito típico de bairros brasileiros)
    const halfW = (w - 0.16) / 2;
    const bodyL = new THREE.Mesh(new THREE.BoxGeometry(halfW, houseH, houseDepth), paintedWallMat);
    bodyL.position.set(-halfW / 2 - 0.04, houseH / 2, houseCenterZ);
    bodyL.castShadow = false;
    bodyL.receiveShadow = true;

    const bodyR = new THREE.Mesh(new THREE.BoxGeometry(halfW, houseH, houseDepth), secondaryWallMat);
    bodyR.position.set(halfW / 2 + 0.04, houseH / 2, houseCenterZ);
    bodyR.castShadow = false;
    bodyR.receiveShadow = true;
    g.add(bodyL, bodyR);

    // Pilares divisórios de concreto
    const centerPillar = new THREE.Mesh(new THREE.BoxGeometry(0.24, houseH + 0.2, houseDepth + 0.12), trimMat);
    centerPillar.position.set(0, houseH / 2, houseCenterZ);
    g.add(centerPillar);
  } else if (spec.style === 'meio_tijolo_laje') {
    // Térreo rebocado colorido + 2º andar em tijolo baiano aparente com pilares de concreto
    const groundBody = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, floorHeight, houseDepth), paintedWallMat);
    groundBody.position.set(0, floorHeight / 2, houseCenterZ);
    groundBody.castShadow = false;
    groundBody.receiveShadow = true;
    g.add(groundBody);

    // Laje intermediária saliente
    const midSlab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.20, houseDepth + 0.9), concreteMat);
    midSlab.position.set(0, floorHeight, houseCenterZ + 0.35);
    midSlab.castShadow = false;
    g.add(midSlab);

    // 2º Andar em tijolo baiano aparente
    const upperBody = new THREE.Mesh(new THREE.BoxGeometry(w - 0.25, floorHeight, houseDepth), brickMat);
    upperBody.position.set(0, floorHeight * 1.5, houseCenterZ);
    upperBody.castShadow = false;
    upperBody.receiveShadow = true;
    g.add(upperBody);
  } else {
    const mainWallMat = spec.isBrickHouse ? brickMat : paintedWallMat;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, houseH, houseDepth), mainWallMat);
    body.position.set(0, houseH / 2, houseCenterZ);
    body.castShadow = false;
    body.receiveShadow = true;
    g.add(body);

    // Barra inferior de reboco/azulejo ou rodapé
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.12, 0.55, houseDepth + 0.06),
      spec.isBrickHouse ? concreteMat : secondaryWallMat
    );
    plinth.position.set(0, 0.28, houseCenterZ);
    g.add(plinth);
  }

  // 3. ESTRUTURA DE CONCRETO APARENTE (Pilares e Vigas nas casas de tijolo baiano)
  if (spec.isBrickHouse) {
    const colGeo = new THREE.BoxGeometry(0.24, houseH + 0.1, 0.24);
    for (const cx of [-w / 2 + 0.2, 0, w / 2 - 0.2]) {
      const col = new THREE.Mesh(colGeo, concreteMat);
      col.position.set(cx, houseH / 2, -yardDepth + 0.02);
      col.castShadow = false;
      g.add(col);
    }
    // Cinta/Viga horizontal de concreto armado
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.22, houseDepth + 0.08), concreteMat);
    beam.position.set(0, spec.floors === 2 ? floorHeight : houseH - 0.1, houseCenterZ);
    g.add(beam);

    // Vergalhões de ferro ("espera de pilar") apontando no topo da laje
    const rebarGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.55, 5);
    for (const rx of [-w / 2 + 0.22, w / 2 - 0.22]) {
      const rb1 = new THREE.Mesh(rebarGeo, darkIronMat);
      rb1.position.set(rx - 0.04, houseH + 0.35, -yardDepth + 0.02);
      const rb2 = new THREE.Mesh(rebarGeo, darkIronMat);
      rb2.position.set(rx + 0.04, houseH + 0.32, -yardDepth + 0.02);
      g.add(rb1, rb2);
    }
  }

  // 4. PORTAS E JANELAS COM GRADES DE PROTEÇÃO DE FERRO NA FACHADA DA CASA
  const facadeZ = -yardDepth + 0.04;
  const addWindowWithIronGrille = (wx: number, wy: number, ww = 1.25, wh = 1.15) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.14, wh + 0.14, 0.08), trimMat);
    frame.position.set(wx, wy, facadeZ);
    g.add(frame);

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), winMat);
    glass.position.set(wx, wy, facadeZ + 0.05);
    g.add(glass);

    // Grade de proteção de ferro na janela (clássico brasileiro)
    const grilleBarV = new THREE.CylinderGeometry(0.012, 0.012, wh + 0.06, 5);
    for (let b = -2; b <= 2; b++) {
      const gBar = new THREE.Mesh(grilleBarV, darkIronMat);
      gBar.position.set(wx + b * (ww * 0.21), wy, facadeZ + 0.08);
      g.add(gBar);
    }
    const grilleBarH = new THREE.BoxGeometry(ww + 0.08, 0.02, 0.03);
    for (const gy of [wy - wh * 0.32, wy + wh * 0.32]) {
      const hBar = new THREE.Mesh(grilleBarH, darkIronMat);
      hBar.position.set(wx, gy, facadeZ + 0.08);
      g.add(hBar);
    }
  };

  // Porta principal de madeira com almofadas e postigo
  const addBrazilianDoor = (dx: number, dy: number) => {
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.18, 0.08), trimMat);
    doorFrame.position.set(dx, dy + 1.09, facadeZ);
    g.add(doorFrame);

    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.08, 0.09), woodDoorMat);
    doorPanel.position.set(dx, dy + 1.04, facadeZ + 0.02);
    g.add(doorPanel);

    // Grade/postigo na porta
    const doorGrille = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.75, 0.11), darkIronMat);
    doorGrille.position.set(dx, dy + 1.42, facadeZ + 0.03);
    g.add(doorGrille);
  };

  if (spec.style === 'geminada') {
    addBrazilianDoor(-w * 0.32, 0);
    addWindowWithIronGrille(-w * 0.14, 1.55, 1.05, 1.05);
    addBrazilianDoor(w * 0.14, 0);
    addWindowWithIronGrille(w * 0.32, 1.55, 1.05, 1.05);
  } else {
    addBrazilianDoor(-w * 0.24, 0);
    addWindowWithIronGrille(w * 0.20, 1.58, 1.35, 1.15);
  }

  // 5. SEGUNDO ANDAR: SACADA BRASILEIRA COM GUARDA-CORPO DE FERRO E JANELAS
  if (spec.floors === 2) {
    addWindowWithIronGrille(-w * 0.23, floorHeight + 1.55, 1.25, 1.15);
    addWindowWithIronGrille(w * 0.23, floorHeight + 1.55, 1.25, 1.15);

    // Laje da sacada em balanço sobre a garagem
    const balconyW = w * 0.68;
    const balconyD = 1.05;
    const balconySlab = new THREE.Mesh(
      new THREE.BoxGeometry(balconyW, 0.16, balconyD),
      spec.isBrickHouse ? concreteMat : trimMat
    );
    balconySlab.position.set(0, floorHeight + 0.05, -yardDepth + balconyD * 0.5);
    balconySlab.castShadow = false;
    g.add(balconySlab);

    // Guarda-corpo de grade de ferro na sacada
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(balconyW, 0.05, 0.05), darkIronMat);
    railTop.position.set(0, floorHeight + 0.92, -yardDepth + balconyD - 0.04);
    g.add(railTop);

    const numBalBars = 15;
    const balBarGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.84, 5);
    for (let b = 0; b < numBalBars; b++) {
      const bx = -balconyW / 2 + 0.06 + (b / (numBalBars - 1)) * (balconyW - 0.12);
      const bar = new THREE.Mesh(balBarGeo, darkIronMat);
      bar.position.set(bx, floorHeight + 0.48, -yardDepth + balconyD - 0.04);
      g.add(bar);
    }
  }

  // 6. TELHADO BRASILEIRO (Telha Colonial de Barro, Telhado de Garagem, Fibrocimento ou Laje com Puxadinho + Caixa d'Água)
  const colonialRoofMat = new THREE.MeshStandardMaterial({
    map: colonialRoofTex,
    color: 0xffffff,
    roughness: 0.78,
  });
  colonialRoofMat.userData.isShared = true;

  const fibroRoofMat = new THREE.MeshStandardMaterial({
    map: fibroRoofTex,
    color: 0xffffff,
    roughness: 0.82,
  });
  fibroRoofMat.userData.isShared = true;

  const waterTankMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.35,
    metalness: 0.1,
  });
  waterTankMat.userData.isShared = true;

  let totalRoofExtraH = 1.6;

  if (spec.roofStyle === 'colonial_barro') {
    // Telhado colonial brasileiro de barro em duas águas (com beiral largo)
    const roofW = w + 0.45;
    const roofD = houseDepth + 0.65;
    const slopeLeft = new THREE.Mesh(new THREE.BoxGeometry(roofW, 0.12, roofD * 0.58), colonialRoofMat);
    slopeLeft.position.set(0, houseH + 0.55, houseCenterZ + roofD * 0.22);
    slopeLeft.rotation.x = 0.36;
    slopeLeft.castShadow = false;

    const slopeBack = new THREE.Mesh(new THREE.BoxGeometry(roofW, 0.12, roofD * 0.58), colonialRoofMat);
    slopeBack.position.set(0, houseH + 0.55, houseCenterZ - roofD * 0.22);
    slopeBack.rotation.x = -0.36;
    slopeBack.castShadow = false;
    g.add(slopeLeft, slopeBack);
  } else if (spec.roofStyle === 'garagem_telha') {
    // Telhado na casa + Telhado colonial inclinado cobrindo a garagem até o portão!
    const mainRoof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.14, houseDepth + 0.5), colonialRoofMat);
    mainRoof.position.set(0, houseH + 0.42, houseCenterZ);
    mainRoof.rotation.x = 0.18;
    mainRoof.castShadow = false;
    g.add(mainRoof);

    // Cobertura de telha sobre a garagem frontal sustentada por vigas
    const porchRoof = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.62, 0.11, yardDepth + 0.45),
      colonialRoofMat
    );
    porchRoof.position.set(-w * 0.15, 2.58, -yardDepth * 0.5 + 0.08);
    porchRoof.rotation.x = 0.22;
    porchRoof.castShadow = false;
    g.add(porchRoof);
  } else if (spec.roofStyle === 'fibrocimento') {
    // Laje de concreto + Telhado inclinado de Brasilit/Eternit + Caixa d'Água Azul em torre
    const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.18, houseDepth + 0.3), concreteMat);
    roofSlab.position.set(0, houseH + 0.09, houseCenterZ);
    g.add(roofSlab);

    const fibroSheet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.08, houseDepth + 0.6), fibroRoofMat);
    fibroSheet.position.set(0, houseH + 0.52, houseCenterZ);
    fibroSheet.rotation.x = 0.15;
    fibroSheet.castShadow = false;
    g.add(fibroSheet);

    // Torre de tijolo e caixa d'água azul
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.1, 1.35), brickMat);
    tower.position.set(w * 0.22, houseH + 0.65, houseCenterZ - 0.4);
    g.add(tower);

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.62, 0.95, 12), waterTankMat);
    tank.position.set(w * 0.22, houseH + 1.65, houseCenterZ - 0.4);
    tank.castShadow = false;
    g.add(tank);
    totalRoofExtraH = 2.2;
  } else {
    // Laje Brasileira com Platibanda, Terraço Coberto ("Puxadinho na Laje") e Caixa d'Água Azul Fortlev
    const topSlab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.20, houseDepth + 0.4), concreteMat);
    topSlab.position.set(0, houseH + 0.10, houseCenterZ);
    topSlab.castShadow = false;
    g.add(topSlab);

    // Mureta da laje
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.55, 0.18), spec.isBrickHouse ? brickMat : paintedWallMat);
    parapet.position.set(0, houseH + 0.45, -yardDepth + 0.05);
    g.add(parapet);

    // Puxadinho coberto na metade da laje (pilares + telha de zinco/fibrocimento)
    const shedW = w * 0.54;
    const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(shedW, 0.08, houseDepth * 0.75), fibroRoofMat);
    shedRoof.position.set(-w * 0.18, houseH + 1.55, houseCenterZ);
    shedRoof.rotation.z = -0.10;
    shedRoof.castShadow = false;
    g.add(shedRoof);

    const postGeo = new THREE.BoxGeometry(0.12, 1.45, 0.12);
    for (const px of [-w * 0.42, 0.04]) {
      for (const pz of [houseCenterZ - houseDepth * 0.3, houseCenterZ + houseDepth * 0.3]) {
        const post = new THREE.Mesh(postGeo, concreteMat);
        post.position.set(px, houseH + 0.82, pz);
        g.add(post);
      }
    }

    // Caixa d'Água Azul Clássica Brasileira no topo
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.65, 1.02, 12), waterTankMat);
    tank.position.set(w * 0.25, houseH + 0.72, houseCenterZ - 0.3);
    tank.castShadow = false;
    g.add(tank);

    const tankLid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.80, 0.78, 0.10, 12),
      new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.35 })
    );
    tankLid.position.set(w * 0.25, houseH + 1.26, houseCenterZ - 0.3);
    g.add(tankLid);
    totalRoofExtraH = 2.0;
  }

  // Antena Parabólica / UHF no teto (detalhe autêntico de casa brasileira)
  if (seed % 2 === 0) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 6), darkIronMat);
    mast.position.set(-w * 0.28, houseH + 1.1, houseCenterZ);
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.35),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide })
    );
    dish.position.set(-w * 0.28, houseH + 1.65, houseCenterZ + 0.08);
    dish.rotation.x = 0.65;
    g.add(mast, dish);
  }

  // 7. MUROS LATERAIS DE DIVISA DO QUINTAL + VASOS DE PLANTA NA VARANDA
  const sideWallMat = spec.isBrickHouse ? brickMat : paintedWallMat;
  const sideWallGeo = new THREE.BoxGeometry(0.18, 2.05, yardDepth);
  const leftYardWall = new THREE.Mesh(sideWallGeo, sideWallMat);
  leftYardWall.position.set(-w / 2 + 0.09, 1.025, -yardDepth / 2);
  const rightYardWall = new THREE.Mesh(sideWallGeo, sideWallMat);
  rightYardWall.position.set(w / 2 - 0.09, 1.025, -yardDepth / 2);
  g.add(leftYardWall, rightYardWall);

  // Vaso de barro com planta tropical na varanda (visível através da grade!)
  const potMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.16, 0.36, 8),
    new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.85 })
  );
  potMesh.position.set(w * 0.34, 0.30, -0.75);
  const plantBush = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.34, 0),
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 })
  );
  plantBush.position.set(w * 0.34, 0.66, -0.75);
  g.add(potMesh, plantBush);

  // 8. MURO FRONTAL + PILARES + RELÓGIO MEDIDOR DE LUZ + PORTÃO DE FERRO DETALHADO (Em Z = 0)
  const muroH = 2.08;
  const gateW = spec.style === 'geminada' ? 2.55 : 3.35;

  if (spec.style === 'geminada') {
    // Dois portões de ferro para o sobrado geminado
    const subW = w / 2;
    const subGateW = 2.45;
    for (const sideMul of [-1, 1]) {
      const centerSubX = sideMul * (subW / 2);
      const gate = buildDetailedBrazilianIronGate(subGateW, muroH, spec.gateStyle, spec.gateColorHex);
      gate.position.set(centerSubX, 0, 0);
      g.add(gate);

      // Pilares laterais de cada portão
      const pilMat = sideMul === -1 ? paintedWallMat : secondaryWallMat;
      for (const px of [centerSubX - subGateW / 2 - 0.12, centerSubX + subGateW / 2 + 0.12]) {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(0.28, muroH + 0.16, 0.28), pilMat);
        pil.position.set(px, (muroH + 0.16) / 2, 0);
        pil.castShadow = false;
        g.add(pil);
      }
    }
  } else {
    // Muro frontal nas laterais do portão de ferro
    const wallSegW = Math.max(0.55, (w - gateW) / 2);
    const frontWallMat = spec.isBrickHouse || spec.id.includes('verde') ? brickMat : paintedWallMat;

    const wallL = new THREE.Mesh(new THREE.BoxGeometry(wallSegW, muroH * 0.52, 0.22), frontWallMat);
    wallL.position.set(-w / 2 + wallSegW / 2, muroH * 0.26, 0);
    wallL.castShadow = false;
    wallL.receiveShadow = true;
    g.add(wallL);

    const wallR = new THREE.Mesh(new THREE.BoxGeometry(wallSegW, muroH, 0.22), frontWallMat);
    wallR.position.set(w / 2 - wallSegW / 2, muroH / 2, 0);
    wallR.castShadow = false;
    wallR.receiveShadow = true;
    g.add(wallR);

    // Grade de ferro sobre a mureta esquerda (muro meio-grade brasileiro, dando ainda mais visibilidade!)
    const sideGrille = buildDetailedBrazilianIronGate(wallSegW - 0.18, muroH * 0.48, 'grade_lanca', spec.gateColorHex);
    sideGrille.position.set(-w / 2 + wallSegW / 2, muroH * 0.50, 0);
    g.add(sideGrille);

    // Pilares robustos sustentando o portão de ferro + Pingadeira de concreto
    const pillarGeo = new THREE.BoxGeometry(0.32, muroH + 0.18, 0.32);
    const capGeo = new THREE.BoxGeometry(0.38, 0.08, 0.38);
    for (const px of [-w / 2 + 0.16, -gateW / 2, gateW / 2, w / 2 - 0.16]) {
      const pil = new THREE.Mesh(pillarGeo, spec.isBrickHouse ? concreteMat : trimMat);
      pil.position.set(px, (muroH + 0.18) / 2, 0);
      pil.castShadow = false;
      g.add(pil);

      const cap = new THREE.Mesh(capGeo, concreteMat);
      cap.position.set(px, muroH + 0.20, 0);
      g.add(cap);
    }

    // Portão de Ferro Principal 3D Vazado
    const mainIronGate = buildDetailedBrazilianIronGate(gateW, muroH, spec.gateStyle, spec.gateColorHex);
    mainIronGate.position.set(0, 0, 0);
    g.add(mainIronGate);

    // Plaquinha azul com o número da casa no pilar direito do portão
    const numPlaque = new THREE.Mesh(
      new THREE.PlaneGeometry(0.26, 0.14),
      new THREE.MeshBasicMaterial({ map: getHouseNumberTexture(spec.houseNumber) })
    );
    numPlaque.position.set(gateW / 2, 1.62, 0.17);
    g.add(numPlaque);

    // Caixinha de Correio Amarela Correios no muro
    const mailbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.28, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.3 })
    );
    mailbox.position.set(-gateW / 2, 1.38, 0.14);
    g.add(mailbox);

    // Relógio Medidor de Energia Elétrica ("Padrão de Luz" com bengala galvanizada) no muro direito
    const meterBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.30, 0.42, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.45 })
    );
    meterBox.position.set(w / 2 - 0.52, 1.52, 0.14);
    const meterGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xbae6fd })
    );
    meterGlass.position.set(w / 2 - 0.52, 1.58, 0.24);
    const meterMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.85, 6),
      darkIronMat
    );
    meterMast.position.set(w / 2 - 0.16, muroH + 0.90, 0);
    g.add(meterBox, meterGlass, meterMast);
  }

  return {
    name: spec.name,
    group: g,
    width: w,
    depth: d,
    height: houseH + totalRoofExtraH,
    frontZ: 0.18,
  };
}

class BuildingManagerClass {
  private templates: BuildingTemplate[] = [];
  public isLoaded = false;
  private loadPromise: Promise<void> | null = null;
  private onLoadedListeners: (() => void)[] = [];
  private onProgressListeners: ((pct: number) => void)[] = [];
  private sharedShadowMat: THREE.MeshBasicMaterial;

  constructor() {
    this.sharedShadowMat = this.createSoftShadowMaterial();
    this.initBrazilianHouseTemplates();
    this.isLoaded = true;
  }

  private createSoftShadowMaterial(): THREE.MeshBasicMaterial {
    if (typeof document === 'undefined') {
      const m = new THREE.MeshBasicMaterial({ color: 0x09090b, transparent: true, opacity: 0.25, depthWrite: false });
      m.userData.isShared = true;
      return m;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 62);
      grad.addColorStop(0.0, 'rgba(9, 9, 11, 0.52)');
      grad.addColorStop(0.55, 'rgba(9, 9, 11, 0.28)');
      grad.addColorStop(1.0, 'rgba(9, 9, 11, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    mat.userData.isShared = true;
    return mat;
  }

  private initBrazilianHouseTemplates(): void {
    this.templates = BRAZILIAN_HOUSE_SPECS.map((spec, idx) =>
      buildProceduralBrazilianHouse(spec, idx + 1)
    );
  }

  public onLoaded(fn: () => void): void {
    if (this.isLoaded) {
      setTimeout(fn, 0);
    } else {
      this.onLoadedListeners.push(fn);
    }
  }

  public onProgress(fn: (pct: number) => void): void {
    if (this.isLoaded) {
      setTimeout(() => fn(100), 0);
    } else {
      this.onProgressListeners.push(fn);
    }
  }

  public async init(): Promise<void> {
    if (this.isLoaded) {
      this.onProgressListeners.forEach((cb) => {
        try { cb(100); } catch (e) { console.error(e); }
      });
      this.onProgressListeners = [];
      this.onLoadedListeners.forEach((cb) => {
        try { cb(); } catch (e) { console.error(e); }
      });
      this.onLoadedListeners = [];
      return Promise.resolve();
    }
    if (this.loadPromise) return this.loadPromise;

    this.initBrazilianHouseTemplates();
    this.isLoaded = true;
    this.loadPromise = Promise.resolve();
    return this.loadPromise;
  }

  public getTemplatesCount(): number {
    return this.templates.length;
  }

  public getTemplate(index: number): BuildingTemplate | null {
    if (!this.templates || this.templates.length === 0) return null;
    return this.templates[Math.abs(index) % this.templates.length] || null;
  }

  /**
   * Cria uma nova instância de casa brasileira para o cenário.
   * Na câmera do jogo (olhando para +Z):
   * - side = 1 (+X) é o Lado Esquerdo da tela -> frente da casa aponta para -X (rotation.y = -Math.PI / 2)
   * - side = -1 (-X) é o Lado Direito da tela -> frente da casa aponta para +X (rotation.y = Math.PI / 2)
   */
  public createBuildingInstance(index: number, side: -1 | 1): { mesh: THREE.Group; width: number; depth: number } | null {
    const tmpl = this.getTemplate(index);
    if (!tmpl) return null;
    const clone = tmpl.group.clone(true);
    clone.userData.isScenery = true;
    clone.userData.isBuilding3D = true;

    const seed = Math.abs(index * 13 + (side === 1 ? 7 : 19));
    const scaleX = 0.94 + (seed % 4) * 0.03;
    const scaleY = 0.92 + ((seed + 2) % 4) * 0.04;
    const scaleZ = 0.94 + ((seed + 1) % 3) * 0.03;
    clone.scale.set(scaleX, scaleY, scaleZ);

    if (side === -1) {
      clone.rotation.y = Math.PI / 2;   // Lado direito da tela (-X): frente aponta para a rua (+X)
    } else {
      clone.rotation.y = -Math.PI / 2;  // Lado esquerdo da tela (+X): frente aponta para a rua (-X)
    }

    const effectiveWidth = tmpl.width * scaleX;
    const effectiveDepth = tmpl.depth * scaleZ;

    const shadowGeo = new THREE.PlaneGeometry(effectiveWidth + 0.8, effectiveDepth + 1.0);
    const groundShadow = new THREE.Mesh(shadowGeo, this.sharedShadowMat);
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.position.set(0, 0.028, -effectiveDepth / 2);
    groundShadow.raycast = () => {};
    clone.add(groundShadow);

    // ⚡ OTIMIZAÇÃO DE MALHA, ZERO COLISÃO & ZERO DRAW CALLS DE SOMBRA:
    // O carro e o jogador nunca vão bater nas construções fora da pista.
    // Desativa raycasting, física e cálculos repetidos de matrizes.
    // As construções já possuem sombra de contato projetada (groundShadow), então
    // desativamos o castShadow dinâmico para eliminar mais de 1.000 draw calls por frame no modo Ultra!
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.raycast = () => {};
        child.userData.noCollision = true;
        child.userData.isScenery = true;
        child.castShadow = false;
        child.receiveShadow = false;
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    return {
      mesh: clone,
      width: effectiveWidth,
      depth: effectiveDepth,
    };
  }

  public updateNightWindows(_nightFactor: number, _runTimeSec: number): void {
    // Iluminação residencial integrada nas janelas procedurais
  }
}

export const BuildingManager = new BuildingManagerClass();
if (typeof window !== 'undefined') {
  BuildingManager.init();
}
