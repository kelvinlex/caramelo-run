import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getMotoSpecById, type MotorcycleSpec } from '../game/motosCatalog';
import {
  createSeatedMotoboyRider,
  type MotoboyCharacterId,
  type SeatedMotoboyRiderInstance,
} from './motoboyModelLoader';

export interface MotoInstance {
  spec: MotorcycleSpec;
  root: THREE.Group;
  steeringPivot: THREE.Object3D | null;
  frontWheel: THREE.Object3D | null;
  rearWheel: THREE.Object3D | null;
  getExhaustWorldPosition: (out: THREE.Vector3) => THREE.Vector3;
  setRider: (riderId: MotoboyCharacterId | null) => void;
  setRiderDamageFlash: (intensity: number) => void;
  setRiderThermalVision: (intensity: number) => void;
  triggerRiderSquash: (strength?: number) => void;
  triggerRiderCashFlash: (hexColor: number, intensity?: number) => void;
  setPizzaBoxCount: (count: number) => void;
  setPizzaAiming: (active: boolean, side?: -1 | 1) => void;
  triggerPizzaThrow: (side: -1 | 1) => void;
  setRiderKnockoutFall: (factor01: number) => void;
  update: (dt: number, speed: number, steerLean: number, pitchAngle: number) => void;
  dispose: () => void;
}

let cachedGltfScene: THREE.Group | null = null;
let gltfLoadingPromise: Promise<THREE.Group> | null = null;

// Caches globais (Zero GC Alloc / Reuso de Shaders e Geometrias de Borda)
let sharedCartoonGradientMap: THREE.DataTexture | null = null;
let sharedBlackOutlineMat: THREE.MeshBasicMaterial | null = null;
let sharedBlackCreaseLineMat: THREE.LineBasicMaterial | null = null;
const cartoonMaterialCache = new WeakMap<THREE.Material, THREE.Material>();
const edgesGeometryCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();

// Vetores scratch para cálculo das manoplas do guidão sem alocar no loop (Zero GC)
const _leftGripWorld = new THREE.Vector3();
const _rightGripWorld = new THREE.Vector3();

// Cache global de geometrias e materiais do Bagageiro + Pilha de Caixas de Pizza Cartoon (Referência 4!)
const PIZZA_BOX_PALETTE_HEX = [
  0xd9a05b, // Papelão Kraft Clássico (Referência 4)
  0xef4444, // Vermelho Pizzaria Tradicional
  0x16a34a, // Verde Manjericão Italiano
  0xeab308, // Amarelo Queijo Dourado
  0xf97316, // Laranja Forno a Lenha
  0xfef3c7, // Creme Artesanal
  0x0ea5e9, // Azul Express
  0x9333ea, // Roxo Especial VIP
];

let cachedCaixoteAssets: {
  rackGeo: THREE.BoxGeometry;
  backrestGeo: THREE.BoxGeometry;
  strapGeo: THREE.BoxGeometry;
  reflectorGeo: THREE.BoxGeometry;
  badgeGeo: THREE.PlaneGeometry;
  pizzaBaseGeo: THREE.BoxGeometry;
  pizzaLidGeo: THREE.BoxGeometry;
  pizzaNotchGeo: THREE.CylinderGeometry;
  pizzaTopEmblemGeo: THREE.CircleGeometry;
  rackMat: THREE.MeshToonMaterial;
  strapMat: THREE.MeshToonMaterial;
  notchMat: THREE.MeshToonMaterial;
  reflectorYellowMat: THREE.MeshToonMaterial;
  reflectorWhiteMat: THREE.MeshToonMaterial;
  badgeMat: THREE.MeshBasicMaterial;
  pizzaTopEmblemMat: THREE.MeshBasicMaterial;
  pizzaBoxMats: THREE.MeshToonMaterial[];
} | null = null;

function createPepperoniPizzaEmblemTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);

  // Círculo externo vermelho molho de tomate (idêntico à Referência 4!)
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.fill();

  // Borda crocante dourada da massa da pizza
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(128, 128, 98, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Recheio amarelo queijo muçarela
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(128, 128, 82, 0, Math.PI * 2);
  ctx.fill();

  // 8 divisões de fatias laranja suaves
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(128 - Math.cos(ang) * 80, 128 - Math.sin(ang) * 80);
    ctx.lineTo(128 + Math.cos(ang) * 80, 128 + Math.sin(ang) * 80);
    ctx.stroke();
  }

  // Rodelas de pepperoni vermelho-alaranjado distribuídas nas fatias
  const pepPositions = [
    [128, 76],
    [166, 92],
    [180, 132],
    [158, 168],
    [116, 178],
    [82, 154],
    [78, 112],
    [106, 98],
  ];
  for (const [px, py] of pepPositions) {
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCaixoteBadgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  // Fundo amarelo vibrante cartoon com moldura preta grossa
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 320);
  bgGrad.addColorStop(0, '#fef08a');
  bgGrad.addColorStop(1, '#facc15');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 320);

  ctx.strokeStyle = '#0d0b0a';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, 496, 304);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.strokeRect(20, 20, 472, 280);

  // Faixa superior vermelha destaque
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(28, 28, 456, 72);
  ctx.strokeStyle = '#0d0b0a';
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, 456, 72);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📢 DIVULGUE NA VILA!', 256, 65);

  // Texto principal "COLOQUE SEU ANÚNCIO AQUI!" bem legível na gameplay
  ctx.fillStyle = '#0d0b0a';
  ctx.font = '900 48px sans-serif';
  ctx.fillText('COLOQUE SEU', 256, 158);

  ctx.fillStyle = '#b91c1c';
  ctx.font = '900 54px sans-serif';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeText('ANÚNCIO AQUI!', 256, 232);
  ctx.fillText('ANÚNCIO AQUI!', 256, 232);

  // Pontilhado inferior estilo outdoor
  ctx.fillStyle = '#1e293b';
  ctx.font = '800 22px monospace';
  ctx.fillText('★ ESPAÇO PUBLICITÁRIO VIP ★', 256, 282);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function ensureCaixoteAssets() {
  if (cachedCaixoteAssets) return cachedCaixoteAssets;
  const gradientMap = getMotoCartoonGradientMap();
  cachedCaixoteAssets = {
    rackGeo: new THREE.BoxGeometry(0.46, 0.038, 0.44),
    backrestGeo: new THREE.BoxGeometry(0.44, 0.28, 0.032),
    strapGeo: new THREE.BoxGeometry(0.026, 0.48, 0.44),
    reflectorGeo: new THREE.BoxGeometry(0.052, 0.18, 0.014),
    badgeGeo: new THREE.PlaneGeometry(0.36, 0.21),
    pizzaBaseGeo: new THREE.BoxGeometry(0.40, 0.044, 0.40),
    pizzaLidGeo: new THREE.BoxGeometry(0.416, 0.018, 0.416),
    pizzaNotchGeo: new THREE.CylinderGeometry(0.038, 0.038, 0.022, 12),
    pizzaTopEmblemGeo: new THREE.CircleGeometry(0.145, 20),
    rackMat: new THREE.MeshToonMaterial({ color: 0x1e293b, gradientMap }),
    strapMat: new THREE.MeshToonMaterial({ color: 0xfacc15, gradientMap }),
    notchMat: new THREE.MeshToonMaterial({ color: 0x78350f, gradientMap }),
    reflectorYellowMat: new THREE.MeshToonMaterial({
      color: 0xfde047,
      emissive: new THREE.Color(0xca8a04),
      emissiveIntensity: 0.35,
      gradientMap,
    }),
    reflectorWhiteMat: new THREE.MeshToonMaterial({
      color: 0xf8fafc,
      emissive: new THREE.Color(0x94a3b8),
      emissiveIntensity: 0.28,
      gradientMap,
    }),
    badgeMat: new THREE.MeshBasicMaterial({ map: createCaixoteBadgeTexture() }),
    pizzaTopEmblemMat: new THREE.MeshBasicMaterial({
      map: createPepperoniPizzaEmblemTexture(),
      transparent: true,
    }),
    pizzaBoxMats: PIZZA_BOX_PALETTE_HEX.map(
      (hex) => new THREE.MeshToonMaterial({ color: hex, gradientMap })
    ),
  };
  return cachedCaixoteAssets;
}

/**
 * Constrói uma única Caixa de Pizza 3D Cartoon (idêntica à Referência 4, com tampa, recorte frontal e pizza de pepperoni no topo!)
 * usada tanto na pilha traseira da moto quanto no arremesso de entrega para os clientes!
 */
export function createSingleCartoonPizzaBoxMesh(colorIndex = 0): THREE.Group {
  const a = ensureCaixoteAssets();
  const outlineMat = getMotoBlackOutlineMaterial();
  const creaseMat = getMotoBlackCreaseLineMaterial();
  const boxMat = a.pizzaBoxMats[Math.abs(colorIndex) % a.pizzaBoxMats.length];

  const boxGroup = new THREE.Group();
  boxGroup.name = `CartoonPizzaBox_${colorIndex}`;

  const baseMesh = new THREE.Mesh(a.pizzaBaseGeo, boxMat);
  baseMesh.position.y = 0.022;
  const baseHull = new THREE.Mesh(a.pizzaBaseGeo, outlineMat);
  baseHull.userData.isCartoonOutline = true;
  baseMesh.add(baseHull);
  const baseCreases = new THREE.LineSegments(getCachedEdgesGeometry(a.pizzaBaseGeo), creaseMat);
  baseCreases.userData.isCartoonOutline = true;
  baseMesh.add(baseCreases);
  boxGroup.add(baseMesh);

  const lidMesh = new THREE.Mesh(a.pizzaLidGeo, boxMat);
  lidMesh.position.y = 0.048;
  const lidHull = new THREE.Mesh(a.pizzaLidGeo, outlineMat);
  lidHull.userData.isCartoonOutline = true;
  lidMesh.add(lidHull);
  const lidCreases = new THREE.LineSegments(getCachedEdgesGeometry(a.pizzaLidGeo), creaseMat);
  lidCreases.userData.isCartoonOutline = true;
  lidMesh.add(lidCreases);
  boxGroup.add(lidMesh);

  // Recorte semicircular frontal de abrir a caixa (Referência 4)
  const notchMesh = new THREE.Mesh(a.pizzaNotchGeo, a.notchMat);
  notchMesh.position.set(0, 0.045, 0.202);
  boxGroup.add(notchMesh);

  // Emblema circular da Pizza de Pepperoni estampado no topo da tampa
  const emblemMesh = new THREE.Mesh(a.pizzaTopEmblemGeo, a.pizzaTopEmblemMat);
  emblemMesh.rotation.x = -Math.PI * 0.5;
  emblemMesh.position.set(0, 0.0585, 0);
  boxGroup.add(emblemMesh);

  return boxGroup;
}

function buildMotoboyDeliveryCaixote(): {
  group: THREE.Group;
  pizzaBoxMeshes: THREE.Group[];
} {
  const a = ensureCaixoteAssets();
  const outlineMat = getMotoBlackOutlineMaterial();
  const creaseMat = getMotoBlackCreaseLineMaterial();

  const group = new THREE.Group();
  group.name = 'MotoboyRearCaixote';
  // Posicionado na garupa traseira (z = +0.58m, y = 0.89m base), amplo e bem visível atrás do motoboy!
  group.position.set(0, 0.89, 0.58);

  const addOutlinedPart = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    withCreases = true
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = false;
    m.receiveShadow = false;

    const hull = new THREE.Mesh(geo, outlineMat);
    hull.userData.isCartoonOutline = true;
    m.add(hull);

    if (withCreases) {
      const creases = new THREE.LineSegments(getCachedEdgesGeometry(geo), creaseMat);
      creases.userData.isCartoonOutline = true;
      m.add(creases);
    }
    group.add(m);
    return m;
  };

  // Base metálica do bagageiro + suporte traseiro + refletores laterais
  addOutlinedPart(a.rackGeo, a.rackMat, 0, 0.0, 0);
  addOutlinedPart(a.backrestGeo, a.rackMat, 0, 0.145, 0.215);
  addOutlinedPart(a.reflectorGeo, a.reflectorWhiteMat, -0.215, 0.145, 0.232, false);
  addOutlinedPart(a.reflectorGeo, a.reflectorYellowMat, 0.215, 0.145, 0.232, false);

  // Placa Publicitária Traseira voltada para a câmera (+Z)
  const badge = new THREE.Mesh(a.badgeGeo, a.badgeMat);
  badge.position.set(0, 0.145, 0.235);
  group.add(badge);

  // Pilha visual de 8 Caixas de Pizza Cartoon coloridas empilhadas no bagageiro traseiro!
  const pizzaBoxMeshes: THREE.Group[] = [];
  const boxStepY = 0.059;
  for (let i = 0; i < 8; i++) {
    const pBox = createSingleCartoonPizzaBoxMesh(i);
    // Leve desalinhamento orgânico de rotação em Y para dar charme cartoon à pilha!
    pBox.position.set(0, 0.02 + i * boxStepY, -0.01);
    pBox.rotation.y = ((i % 3) - 1) * 0.045;
    group.add(pBox);
    pizzaBoxMeshes.push(pBox);
  }

  return { group, pizzaBoxMeshes };
}

function getMotoCartoonGradientMap(): THREE.DataTexture {
  if (sharedCartoonGradientMap) return sharedCartoonGradientMap;

  // 4 faixas discretas cel-shaded (sombras vivas sem escurecer demais)
  const steps = [132, 188, 234, 255];
  const data = new Uint8Array(steps.length * 4);
  for (let i = 0; i < steps.length; i++) {
    const v = steps[i];
    data[i * 4 + 0] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }

  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  sharedCartoonGradientMap = tex;
  return tex;
}

function getMotoBlackOutlineMaterial(): THREE.MeshBasicMaterial {
  if (sharedBlackOutlineMat) return sharedBlackOutlineMat;

  const mat = new THREE.MeshBasicMaterial({
    color: 0x0d0b0a,
    side: THREE.BackSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vec3 safeNormal = length(normal) > 0.0001 ? normalize(normal) : vec3(0.0, 1.0, 0.0);
      transformed += safeNormal * 0.0068;
      `
    );
  };

  sharedBlackOutlineMat = mat;
  return mat;
}

function getMotoBlackCreaseLineMaterial(): THREE.LineBasicMaterial {
  if (sharedBlackCreaseLineMat) return sharedBlackCreaseLineMat;
  sharedBlackCreaseLineMat = new THREE.LineBasicMaterial({
    color: 0x110e0c,
    transparent: true,
    opacity: 0.65,
  });
  return sharedBlackCreaseLineMat;
}

function getCachedEdgesGeometry(geo: THREE.BufferGeometry): THREE.EdgesGeometry {
  let edges = edgesGeometryCache.get(geo);
  if (!edges) {
    edges = new THREE.EdgesGeometry(geo, 30);
    edgesGeometryCache.set(geo, edges);
  }
  return edges;
}

function convertToCartoonMaterial(sourceMat: THREE.Material): THREE.Material {
  const cached = cartoonMaterialCache.get(sourceMat);
  if (cached) return cached;

  const std = sourceMat as THREE.MeshStandardMaterial;
  const baseColor = std.color ? std.color.clone() : new THREE.Color(0xffffff);

  // Realça saturação e claridade das peças para estética cartoon vibrante
  if (!std.map) {
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    // Peças metálicas escuras ganham leve tom prateado/grafite cartoon em vez de preto chapado
    const metalness = typeof std.metalness === 'number' ? std.metalness : 0;
    if (metalness > 0.35 && hsl.l < 0.25) {
      baseColor.lerp(new THREE.Color(0xcbd5e1), metalness * 0.38);
      baseColor.getHSL(hsl);
    }
    const boostedS = hsl.s > 0.06 ? Math.min(1.0, hsl.s * 1.18) : hsl.s;
    const boostedL = hsl.l < 0.08 ? Math.max(hsl.l, 0.09) : Math.min(0.95, hsl.l * 1.08);
    baseColor.setHSL(hsl.h, boostedS, boostedL);
  } else {
    std.map.colorSpace = THREE.SRGBColorSpace;
    // Garante que o multiplicador da textura não escureça os adesivos/pintura
    baseColor.setRGB(
      Math.max(baseColor.r, 0.96),
      Math.max(baseColor.g, 0.96),
      Math.max(baseColor.b, 0.96)
    );
  }

  const isTransparent = Boolean(std.transparent && (std.opacity ?? 1) < 0.95);

  const toonMat = new THREE.MeshToonMaterial({
    color: baseColor,
    map: std.map || null,
    gradientMap: getMotoCartoonGradientMap(),
    emissive: std.emissive ? std.emissive.clone() : new THREE.Color(0x000000),
    emissiveMap: std.emissiveMap || null,
    emissiveIntensity: std.emissiveIntensity ?? 1.0,
    transparent: isTransparent,
    opacity: std.opacity ?? 1.0,
    alphaTest: std.alphaTest ?? 0,
    side: std.side ?? THREE.FrontSide,
  });

  cartoonMaterialCache.set(sourceMat, toonMat);
  return toonMat;
}

export function loadMasterMotosGlb(onProgress?: (percent: number) => void): Promise<THREE.Group> {
  if (cachedGltfScene) {
    return Promise.resolve(cachedGltfScene);
  }
  if (gltfLoadingPromise) {
    return gltfLoadingPromise;
  }

  gltfLoadingPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      '/assets/motos/player_20_motos_completas_cartoon_game_ready.glb',
      (gltf) => {
        cachedGltfScene = gltf.scene;
        resolve(gltf.scene);
      },
      (xhr) => {
        if (xhr.lengthComputable && onProgress) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          onProgress(percent);
        }
      },
      (err) => {
        console.error('[motoModelLoader] Falha ao carregar GLB das motos:', err);
        gltfLoadingPromise = null;
        reject(err);
      }
    );
  });

  return gltfLoadingPromise;
}

export async function createMotoInstance(
  motoId: string,
  options?: {
    scale?: number;
    castShadow?: boolean;
    receiveShadow?: boolean;
    riderId?: MotoboyCharacterId | null;
  }
): Promise<MotoInstance> {
  const spec = getMotoSpecById(motoId);
  const masterScene = await loadMasterMotosGlb();

  // Encontra o nó da moto no GLB pelo nodeName do manifesto
  let sourceNode = masterScene.getObjectByName(spec.nodeName);
  if (!sourceNode) {
    sourceNode = masterScene.getObjectByName(spec.id);
    if (!sourceNode) {
      masterScene.traverse((obj) => {
        if (!sourceNode && obj.name.toLowerCase().includes(spec.id.toLowerCase())) {
          sourceNode = obj;
        }
      });
    }
  }

  if (!sourceNode) {
    const parentContainer = masterScene.getObjectByName('01_PLAYER_MOTOS_JOGADOR_20');
    if (parentContainer && parentContainer.children.length > 0) {
      sourceNode = parentContainer.children[0];
    } else {
      sourceNode = masterScene;
    }
  }

  // Clona a moto para criar uma instância independente
  const motoMeshGroup = sourceNode.clone(true);
  motoMeshGroup.position.set(0, 0, 0);

  // No modelo original 3D, a frente da moto aponta para +X.
  // Rotacionamos em +90 graus (Math.PI / 2) no eixo Y para apontar para -Z (frente da pista).
  motoMeshGroup.rotation.y = Math.PI / 2;

  const root = new THREE.Group();
  root.name = `MotoInstance_${spec.id}`;

  const visualHolder = new THREE.Group();
  visualHolder.name = 'VisualHolder';
  visualHolder.add(motoMeshGroup);
  root.add(visualHolder);

  const scale = options?.scale ?? 1.0;
  root.scale.set(scale, scale, scale);

  const castShadow = options?.castShadow ?? true;
  const receiveShadow = options?.receiveShadow ?? true;

  const blackOutlineMat = getMotoBlackOutlineMaterial();
  const blackCreaseMat = getMotoBlackCreaseLineMaterial();

  const allMeshes: THREE.Mesh[] = [];
  motoMeshGroup.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      allMeshes.push(child as THREE.Mesh);
    }
  });

  for (const mesh of allMeshes) {
    const lowerName = mesh.name.toLowerCase();
    const isExportedOutline =
      lowerName.includes('cartoon_outline') || Boolean(mesh.userData?.isCartoonOutline);

    if (isExportedOutline) {
      // Corrige a malha de contorno nativa do GLB para BackSide + extrusão normal preta nítida
      mesh.material = blackOutlineMat;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      continue;
    }

    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;

    // Converte materiais PBR para Cel-Shading Cartoon Vibrante
    let isTransparentMesh = false;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => {
        const cm = convertToCartoonMaterial(m);
        if (cm.transparent) isTransparentMesh = true;
        return cm;
      });
    } else if (mesh.material) {
      const cm = convertToCartoonMaterial(mesh.material);
      if (cm.transparent) isTransparentMesh = true;
      mesh.material = cm;
    }

    // Verifica se já possui malha filha de contorno nativa
    const hasChildOutline = mesh.children.some(
      (c) => c.name.toLowerCase().includes('cartoon_outline') || Boolean(c.userData?.isCartoonOutline)
    );

    const isDecalOrLens =
      isTransparentMesh ||
      lowerName.includes('decal') ||
      lowerName.includes('glass') ||
      lowerName.includes('lens') ||
      lowerName.includes('visor');

    // Mede o tamanho da peça para pular contornos/arestas em parafusos e raios minúsculos (< 6.5cm)
    let partDiag = 1.0;
    if (mesh.geometry) {
      if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
      }
      if (mesh.geometry.boundingBox) {
        const b = mesh.geometry.boundingBox;
        const dx = b.max.x - b.min.x;
        const dy = b.max.y - b.min.y;
        const dz = b.max.z - b.min.z;
        partDiag = Math.hypot(dx, dy, dz) * scale;
      }
    }
    const isTinyDetail = partDiag < 0.065;

    if (!hasChildOutline && !isDecalOrLens && !isTinyDetail && mesh.geometry) {
      const hull = new THREE.Mesh(mesh.geometry, blackOutlineMat);
      hull.name = 'generated_cartoon_outline';
      hull.userData.isCartoonOutline = true;
      hull.castShadow = false;
      hull.receiveShadow = false;
      mesh.add(hull);
    }

    // Adiciona linhas de vinco pretas estilo quadrinho/cartoon apenas nas carenagens, tanque e peças principais
    if (!isDecalOrLens && partDiag >= 0.11 && mesh.geometry) {
      const posAttr = mesh.geometry.attributes.position;
      if (posAttr && posAttr.count > 16 && posAttr.count <= 3200) {
        const creaseLines = new THREE.LineSegments(
          getCachedEdgesGeometry(mesh.geometry),
          blackCreaseMat
        );
        creaseLines.name = 'cartoon_ink_creases';
        creaseLines.userData.isCartoonOutline = true;
        mesh.add(creaseLines);
      }
    }
  }

  // Encontra pivôs de direção, manoplas, rodas, ponteira do escapamento e descanso lateral/cavalete
  let steeringPivot: THREE.Object3D | null = null;
  let handControlsNode: THREE.Object3D | null = null;
  let frontWheel: THREE.Object3D | null = null;
  let rearWheel: THREE.Object3D | null = null;
  let detectedExhaustMesh: THREE.Mesh | null = null;

  motoMeshGroup.traverse((child) => {
    const n = child.name.toLowerCase();
    // Retrai e levanta o pezinho lateral e o cavalete central em todas as motos
    if (n.includes('sidestand')) {
      child.quaternion.set(0, 0, -0.5971954, 0.8020958);
    }
    if (n.includes('centerstand')) {
      child.quaternion.set(0, 0, -0.58509725, 0.8109631);
    }
    if (n.includes('steering') || n.includes('guidao')) {
      steeringPivot = child;
    }
    if (!handControlsNode && (n.includes('part_hand_controls') || n.includes('manopla'))) {
      handControlsNode = child;
    }
    if (n.includes('frontwheel') || n.includes('roda_dianteira')) {
      frontWheel = child;
    }
    if (n.includes('rearwheel') || n.includes('roda_traseira')) {
      rearWheel = child;
    }
    if (
      !detectedExhaustMesh &&
      (child as THREE.Mesh).isMesh &&
      (n.includes('exhaust') || n.includes('escap') || n.includes('muffler'))
    ) {
      detectedExhaustMesh = child as THREE.Mesh;
    }
  });

  // Âncoras exatas das 2 manoplas do guidão (esquerda e direita) acopladas ao steeringPivot!
  let gripX = 0.352;
  let gripY = 1.128;
  let gripZ = -0.392;
  if (handControlsNode) {
    visualHolder.updateMatrixWorld(true);
    const hcBox = new THREE.Box3().setFromObject(handControlsNode);
    if (!hcBox.isEmpty()) {
      const invHolder = visualHolder.matrixWorld.clone().invert();
      hcBox.applyMatrix4(invHolder);
      gripX = THREE.MathUtils.clamp((hcBox.max.x - hcBox.min.x) * 0.5 * 0.8, 0.28, 0.42);
      gripY = THREE.MathUtils.clamp(
        hcBox.min.y + (hcBox.max.y - hcBox.min.y) * 0.41,
        0.96,
        1.24
      );
      gripZ = THREE.MathUtils.clamp((hcBox.min.z + hcBox.max.z) * 0.5 + 0.024, -0.46, -0.3);
    }
  }

  const leftGripAnchor = new THREE.Object3D();
  leftGripAnchor.name = 'LeftHandlebarGripAnchor';
  leftGripAnchor.position.set(-gripX, gripY, gripZ);
  visualHolder.add(leftGripAnchor);

  const rightGripAnchor = new THREE.Object3D();
  rightGripAnchor.name = 'RightHandlebarGripAnchor';
  rightGripAnchor.position.set(gripX, gripY, gripZ);
  visualHolder.add(rightGripAnchor);

  if (steeringPivot) {
    visualHolder.updateMatrixWorld(true);
    (steeringPivot as THREE.Object3D).attach(leftGripAnchor);
    (steeringPivot as THREE.Object3D).attach(rightGripAnchor);
  }

  // Bagageiro com Pilha de Caixas de Pizza Cartoon coloridas montado na garupa traseira (visível na Garagem e na Gameplay!)
  const { group: deliveryCaixote, pizzaBoxMeshes } = buildMotoboyDeliveryCaixote();
  deliveryCaixote.visible = true;
  visualHolder.add(deliveryCaixote);

  const setPizzaBoxCount = (count: number) => {
    const clamped = Math.max(0, Math.min(pizzaBoxMeshes.length, Math.round(count)));
    for (let i = 0; i < pizzaBoxMeshes.length; i++) {
      pizzaBoxMeshes[i].visible = i < clamped;
    }
  };

  // Âncora exata da ponteira do escapamento dentro do visualHolder (acompanha inclinação lateral e o Grau!)
  const exhaustTipAnchor = new THREE.Object3D();
  exhaustTipAnchor.name = 'ExhaustTipAnchor';
  // Posição calibrada na ponteira direita ao lado do cubo traseiro (+0.162m dir, 0.335m altura, +0.585m trás)
  exhaustTipAnchor.position.set(0.162, 0.335, 0.585);
  if (detectedExhaustMesh) {
    visualHolder.updateMatrixWorld(true);
    const exBox = new THREE.Box3().setFromObject(detectedExhaustMesh);
    if (!exBox.isEmpty()) {
      const invHolder = visualHolder.matrixWorld.clone().invert();
      exBox.applyMatrix4(invHolder);
      // Ponteira fica na extremidade traseira (+Z) e superior-média da caixa do escapamento
      exhaustTipAnchor.position.set(
        THREE.MathUtils.clamp((exBox.min.x + exBox.max.x) * 0.5, 0.12, 0.24),
        THREE.MathUtils.clamp(exBox.max.y - 0.04, 0.26, 0.52),
        THREE.MathUtils.clamp(exBox.max.z + 0.02, 0.46, 0.72)
      );
    }
  }
  visualHolder.add(exhaustTipAnchor);

  // Suporte dinâmico ao Piloto Motoboy sentado na moto + Caixote traseiro!
  let activeRider: SeatedMotoboyRiderInstance | null = null;
  let riderRequestToken = 0;
  let isMotoDisposed = false;
  let currentDamageFlash = 0;
  let currentThermalVision = 0;

  const setRiderDamageFlash = (intensity: number) => {
    currentDamageFlash = THREE.MathUtils.clamp(intensity, 0, 1);
    if (activeRider) {
      activeRider.setDamageFlash(currentDamageFlash);
    }
  };

  const setRiderThermalVision = (intensity: number) => {
    currentThermalVision = THREE.MathUtils.clamp(intensity, 0, 1);
    if (activeRider) {
      activeRider.setThermalVision(currentThermalVision);
    }
  };

  const setRider = (riderId: MotoboyCharacterId | null) => {
    riderRequestToken++;
    const myToken = riderRequestToken;

    if (activeRider) {
      visualHolder.remove(activeRider.root);
      activeRider.dispose();
      activeRider = null;
    }

    deliveryCaixote.visible = true;

    if (!riderId || isMotoDisposed) return;

    createSeatedMotoboyRider(riderId)
      .then((riderInst) => {
        if (isMotoDisposed || myToken !== riderRequestToken) {
          riderInst.dispose();
          return;
        }
        activeRider = riderInst;
        riderInst.setDamageFlash(currentDamageFlash);
        riderInst.setThermalVision(currentThermalVision);
        visualHolder.add(riderInst.root);
        // Alinha imediatamente as 2 mãos no guidão já no primeiro frame!
        root.updateMatrixWorld(true);
        leftGripAnchor.getWorldPosition(_leftGripWorld);
        rightGripAnchor.getWorldPosition(_rightGripWorld);
        riderInst.update(0, 0, visualHolder.rotation.x, _leftGripWorld, _rightGripWorld);
      })
      .catch((err) => {
        console.warn('[motoModelLoader] Aviso ao carregar piloto sentado:', err);
      });
  };

  if (options?.riderId) {
    setRider(options.riderId);
  }

  const getExhaustWorldPosition = (out: THREE.Vector3): THREE.Vector3 => {
    root.updateMatrixWorld(true);
    return exhaustTipAnchor.getWorldPosition(out);
  };

  const triggerRiderSquash = (strength = 1.0) => {
    activeRider?.triggerBiteSquash(strength);
  };

  const triggerRiderCashFlash = (hexColor: number, intensity = 0.92) => {
    activeRider?.triggerCashColorFlash(hexColor, intensity);
  };

  const setPizzaAiming = (active: boolean, side?: -1 | 1) => {
    activeRider?.setPizzaAiming(active, side);
  };

  const triggerPizzaThrow = (side: -1 | 1) => {
    activeRider?.triggerPizzaThrow(side);
  };

  let currentRiderKnockout = 0;
  const setRiderKnockoutFall = (factor01: number) => {
    currentRiderKnockout = THREE.MathUtils.clamp(factor01, 0, 1);
    activeRider?.setKnockoutBackFall(currentRiderKnockout);
  };

  let wheelAngle = 0;
  let engineBob = 0;
  let rollVel = 0;
  let steerYawVel = 0;

  const update = (dt: number, speed: number, steerLean: number, pitchAngle: number) => {
    const clampedDt = Math.min(0.05, Math.max(0, dt));
    const angularSpeed = (speed / 0.32) * clampedDt;
    wheelAngle = (wheelAngle + angularSpeed) % (Math.PI * 2);

    if (frontWheel) {
      frontWheel.rotation.x = 0;
      frontWheel.rotation.y = 0;
      frontWheel.rotation.z = -wheelAngle;
    }
    if (rearWheel) {
      rearWheel.rotation.x = 0;
      rearWheel.rotation.y = 0;
      rearWheel.rotation.z = -wheelAngle;
    }

    if (steeringPivot) {
      const targetSteer = THREE.MathUtils.clamp(-steerLean * 0.24, -0.32, 0.32);
      const steerAccel = (targetSteer - steeringPivot.rotation.y) * 180.0 - steerYawVel * 24.0;
      steerYawVel += steerAccel * clampedDt;
      steeringPivot.rotation.y += steerYawVel * clampedDt;
    }

    const targetRoll = THREE.MathUtils.clamp(-steerLean * 0.30, -0.36, 0.36);
    const rollAccel = (targetRoll - visualHolder.rotation.z) * 165.0 - rollVel * 22.0;
    rollVel += rollAccel * clampedDt;
    visualHolder.rotation.z += rollVel * clampedDt;
    // Guinada sutil e controlada do chassi acompanhando a tangente da curva
    visualHolder.rotation.y = THREE.MathUtils.lerp(
      visualHolder.rotation.y,
      -steerLean * 0.055,
      1 - Math.exp(-14 * clampedDt)
    );

    // CORREÇÃO FÍSICA DO GRAU: +pitchAngle levanta a RODA DA FRENTE (-Z sobe!)
    // mantendo o PNEU TRASEIRO (+Z = +0.68m) cravado no asfalto!
    visualHolder.rotation.x = THREE.MathUtils.lerp(
      visualHolder.rotation.x,
      pitchAngle,
      1 - Math.exp(-24 * dt)
    );

    const effectivePitch = visualHolder.rotation.x;
    const posPitch = Math.max(0, effectivePitch);
    const forkDip = Math.min(0, effectivePitch) * 0.35;
    const wheelieLiftY = 0.68 * Math.sin(posPitch) + forkDip;
    const wheelieShiftZ = 0.68 * (1 - Math.cos(posPitch));

    if (speed > 0.5) {
      engineBob += dt * (28 + Math.min(24, speed * 0.85));
      visualHolder.position.y = Math.sin(engineBob) * 0.0065 + wheelieLiftY;
    } else {
      visualHolder.position.y = wheelieLiftY;
    }
    visualHolder.position.z = wheelieShiftZ;

    if (activeRider) {
      root.updateMatrixWorld(true);
      leftGripAnchor.getWorldPosition(_leftGripWorld);
      rightGripAnchor.getWorldPosition(_rightGripWorld);
      activeRider.update(dt, steerLean, effectivePitch, _leftGripWorld, _rightGripWorld);
    }
  };

  const dispose = () => {
    isMotoDisposed = true;
    riderRequestToken++;
    if (activeRider) {
      activeRider.dispose();
      activeRider = null;
    }
    // Não descartamos geometrias ou materiais em cache global para permitir troca instantânea de motos sem vazamento
    root.clear();
  };

  return {
    spec,
    root,
    steeringPivot,
    frontWheel,
    rearWheel,
    getExhaustWorldPosition,
    setRider,
    setRiderDamageFlash,
    setRiderThermalVision,
    triggerRiderSquash,
    triggerRiderCashFlash,
    setPizzaBoxCount,
    setPizzaAiming,
    triggerPizzaThrow,
    setRiderKnockoutFall,
    update,
    dispose,
  };
}
