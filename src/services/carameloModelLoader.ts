import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export type PlayMode = 'moto' | 'caramelo';

export interface CarameloSpec {
  id: string;
  name: string;
  subtitle: string;
  glbPath: string;
  price: number;
  rarity: 'Comum' | 'Especial' | 'Lendária' | 'Mítica';
  primaryColor: string;
  accentColor: string;
  speedPct: number;
  agilityPct: number;
  staminaPct: number;
  description: string;
}

export const CARAMELO_CATALOG: CarameloSpec[] = [
  {
    id: 'caramelo_default',
    name: 'Caramelo Raiz',
    subtitle: 'Clássico da Quebrada',
    glbPath: '/models/caramelo/caramelo_default.glb',
    price: 0,
    rarity: 'Comum',
    primaryColor: '#d97706',
    accentColor: '#fbbf24',
    speedPct: 76,
    agilityPct: 82,
    staminaPct: 84,
    description: 'O patrimônio brasileiro das calçadas! Corre atrás de qualquer moto sem cansar.',
  },
  {
    id: 'caramelo_style',
    name: 'Caramelo Chavoso',
    subtitle: 'Estilo & Juliete',
    glbPath: '/models/caramelo/caramelo_style.glb',
    price: 3200,
    rarity: 'Especial',
    primaryColor: '#f59e0b',
    accentColor: '#38bdf8',
    speedPct: 82,
    agilityPct: 88,
    staminaPct: 86,
    description: 'Na régua máxima da Vila Tropical! Desvia de ônibus no puro estilo.',
  },
  {
    id: 'caramelo_praia',
    name: 'Caramelo Praiano',
    subtitle: 'Sol & Calçadão',
    glbPath: '/models/caramelo/caramelo_praia.glb',
    price: 5400,
    rarity: 'Especial',
    primaryColor: '#0ea5e9',
    accentColor: '#fde047',
    speedPct: 85,
    agilityPct: 90,
    staminaPct: 88,
    description: 'Direto da orla carioca! Passada leve, rápida e cheia de gingado.',
  },
  {
    id: 'caramelo_skin1',
    name: 'Caramelo Ouro',
    subtitle: 'Pelagem Dourada',
    glbPath: '/models/caramelo/caramelo_skin1.glb',
    price: 9800,
    rarity: 'Lendária',
    primaryColor: '#eab308',
    accentColor: '#fef08a',
    speedPct: 89,
    agilityPct: 92,
    staminaPct: 91,
    description: 'Brilho dourado reluzente no asfalto! Ímã natural de notas na avenida.',
  },
  {
    id: 'caramelo_samurai',
    name: 'Caramelo Samurai',
    subtitle: 'Reflexo Ninja',
    glbPath: '/models/caramelo/caramelo_samurai.glb',
    price: 15500,
    rarity: 'Lendária',
    primaryColor: '#dc2626',
    accentColor: '#fbbf24',
    speedPct: 93,
    agilityPct: 95,
    staminaPct: 93,
    description: 'Foco total olhando pra frente! Corta o trânsito pesado com precisão cirúrgica.',
  },
  {
    id: 'caramelo_cyber',
    name: 'Caramelo Cyber',
    subtitle: 'Turbo Noturno',
    glbPath: '/models/caramelo/caramelo_cyber.glb',
    price: 25000,
    rarity: 'Mítica',
    primaryColor: '#06b6d4',
    accentColor: '#a855f7',
    speedPct: 96,
    agilityPct: 97,
    staminaPct: 96,
    description: 'Feito para brilhar sob as estrelas e a Aurora Boreal nas noites da Vila!',
  },
  {
    id: 'caramelo_skin2',
    name: 'Caramelo Supremo Alfa',
    subtitle: 'Lenda da Vila',
    glbPath: '/models/caramelo/caramelo_skin2.glb',
    price: 36000,
    rarity: 'Mítica',
    primaryColor: '#f97316',
    accentColor: '#fef08a',
    speedPct: 100,
    agilityPct: 99,
    staminaPct: 100,
    description: 'O líder absoluto da matilha! Arrancada explosiva nas 3 pistas.',
  },
];

const EQUIPPED_CARAMELO_KEY = 'caramelo_equipped_dog_v1';
const UNLOCKED_CARAMELOS_KEY = 'caramelo_unlocked_dogs_v1';
const PLAY_MODE_KEY = 'caramelo_play_mode_v1';

export function getCarameloSpecById(id?: string): CarameloSpec {
  if (!id) return CARAMELO_CATALOG[0];
  return CARAMELO_CATALOG.find((c) => c.id === id) || CARAMELO_CATALOG[0];
}

export function getSavedEquippedCarameloId(): string {
  try {
    const v = localStorage.getItem(EQUIPPED_CARAMELO_KEY);
    if (v && CARAMELO_CATALOG.some((c) => c.id === v)) return v;
  } catch {}
  return CARAMELO_CATALOG[0].id;
}

export function saveEquippedCarameloId(id: string): void {
  try {
    localStorage.setItem(EQUIPPED_CARAMELO_KEY, id);
  } catch {}
}

export function getUnlockedCarameloIds(): string[] {
  try {
    const raw = localStorage.getItem(UNLOCKED_CARAMELOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set(['caramelo_default', ...parsed]));
      }
    }
  } catch {}
  return ['caramelo_default'];
}

export function saveUnlockedCarameloIds(ids: string[]): void {
  try {
    localStorage.setItem(
      UNLOCKED_CARAMELOS_KEY,
      JSON.stringify(Array.from(new Set(['caramelo_default', ...ids])))
    );
  } catch {}
}

export function getSavedPlayMode(): PlayMode {
  try {
    const v = localStorage.getItem(PLAY_MODE_KEY);
    if (v === 'caramelo' || v === 'moto') return v;
  } catch {}
  return 'moto';
}

export function savePlayMode(mode: PlayMode): void {
  try {
    localStorage.setItem(PLAY_MODE_KEY, mode);
  } catch {}
}

export interface CarameloInstance {
  spec: CarameloSpec;
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  triggerBonePuff: () => void;
  triggerBiteChomp: () => void;
  setBitePrepFactor: (factor: number) => void;
  setDefeatPose: (factor01: number) => void;
  update: (
    dt: number,
    speedMs: number,
    steerLean?: number,
    jumpY?: number,
    isRolling?: boolean
  ) => void;
  dispose: () => void;
}

interface CachedCarameloAsset {
  scene: THREE.Group;
}

const glbAssetCache = new Map<string, CachedCarameloAsset>();
const glbLoadingPromises = new Map<string, Promise<CachedCarameloAsset>>();
let sharedCarameloGradientMap: THREE.DataTexture | null = null;

// ============================================================================
// MOTOR BIOMECÂNICO DE GALOPE QUADRÚPEDE (Quadruped Run Cycle — 14 Frames)
// Baseado na referência clássica de locomoção canina (Pelvis Power Base):
// - Galope rotativo/transverso coordenado nas 4 patas (FL, FR, HL, HR)
// - Dianteiras: extensão frontal -> contato amortecido -> tração -> flexão recolhida
// - Traseiras: recolhimento profundo sob o abdômen -> apoio -> impulsão explosiva
// - Fase real de suspensão aérea com as 4 patas fora do chão (frames 10–11)
// - Sincronização de coluna, pelve, peito, pescoço, cabeça e cauda
// - Interpolação cíclica Catmull-Rom C¹ contínua (zero salto entre primeiro e último frame)
// - Garantia estrita de contato com o solo (patas nunca atravessam o chão)
// ============================================================================

interface SagittalRigBone {
  bone: THREE.Object3D;
  bindQuat: THREE.Quaternion;
  sagittalAxis: THREE.Vector3; // Eixo +X do mundo (plano sagital YZ) no espaço local do osso
  verticalAxis: THREE.Vector3; // Eixo +Y do mundo (guinada lateral) no espaço local do osso
}

// 6 nós de controle cíclicos uniformemente espaçados em p ∈ [0, 1) para a Pata Dianteira:
// [Shoulder, Arm (Úmero), ForeArm (Rádio/Cotovelo — sem hiperextensão em L!), Hand (Carpo/Pata)]
const FORELEG_SPLINE_KEYS: readonly [number, number, number, number][] = [
  [0.22, 0.38, 0.04, -0.06],   // k=0 (p=0.00): Extensão frontal natural com antebraço alinhado (sem dobra em L!)
  [0.16, 0.24, -0.04, 0.14],   // k=1 (p=0.17): Toque e recepção macia das almofadas da pata no solo
  [-0.04, -0.08, -0.08, 0.12], // k=2 (p=0.33): Apoio médio firme sustentando o peito
  [-0.24, -0.40, -0.18, -0.22],// k=3 (p=0.50): Propulsão e saída traseira limpa
  [-0.10, -0.22, -0.62, -0.38],// k=4 (p=0.67): Suspensão aérea recolhida sob o peito sem dobrar a malha!
  [0.10, 0.18, -0.20, -0.14],  // k=5 (p=0.83): Desdobramento fluido avançando à frente
];

// 6 nós de controle cíclicos uniformemente espaçados em p ∈ [0, 1) para a Pata Traseira:
// [UpLeg (Quadril/Fêmur), Leg (Joelho/Tíbia), Foot (Jarrete/Pata)]
const HINDLEG_SPLINE_KEYS: readonly [number, number, number][] = [
  [0.52, -0.46, 0.34],  // k=0 (p=0.00): Recolhimento sob o abdômen preservando o jarrete íntegro
  [0.38, -0.16, 0.16],  // k=1 (p=0.17): Avanço e contato natural das patas traseiras no chão
  [0.04, -0.18, 0.10],  // k=2 (p=0.33): Compressão elástica de carga da pelve
  [-0.46, 0.22, -0.32], // k=3 (p=0.50): Impulsão traseira potente!
  [-0.52, 0.12, -0.36], // k=4 (p=0.67): Extensão aérea traseira completa
  [0.06, -0.58, 0.38],  // k=5 (p=0.83): Elevação fluida de retorno — fase de suspensão!
];

function evalPeriodicCatmullRom(
  v0: number,
  v1: number,
  v2: number,
  v3: number,
  t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * v1 +
      (-v0 + v2) * t +
      (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 +
      (-v0 + 3 * v1 - 3 * v2 + v3) * t3)
  );
}

const _foreOut: [number, number, number, number] = [0, 0, 0, 0];
function sampleForelegAngles(phase: number): [number, number, number, number] {
  const n = FORELEG_SPLINE_KEYS.length; // 6
  const wrapped = ((phase % 1) + 1) % 1;
  const scaled = wrapped * n;
  const idx1 = Math.floor(scaled) % n;
  const frac = scaled - Math.floor(scaled);
  const idx0 = (idx1 + n - 1) % n;
  const idx2 = (idx1 + 1) % n;
  const idx3 = (idx1 + 2) % n;

  const k0 = FORELEG_SPLINE_KEYS[idx0];
  const k1 = FORELEG_SPLINE_KEYS[idx1];
  const k2 = FORELEG_SPLINE_KEYS[idx2];
  const k3 = FORELEG_SPLINE_KEYS[idx3];

  for (let c = 0; c < 4; c++) {
    _foreOut[c] = evalPeriodicCatmullRom(k0[c], k1[c], k2[c], k3[c], frac);
  }
  return _foreOut;
}

const _hindOut: [number, number, number] = [0, 0, 0];
function sampleHindlegAngles(phase: number): [number, number, number] {
  const n = HINDLEG_SPLINE_KEYS.length; // 6
  const wrapped = ((phase % 1) + 1) % 1;
  const scaled = wrapped * n;
  const idx1 = Math.floor(scaled) % n;
  const frac = scaled - Math.floor(scaled);
  const idx0 = (idx1 + n - 1) % n;
  const idx2 = (idx1 + 1) % n;
  const idx3 = (idx1 + 2) % n;

  const k0 = HINDLEG_SPLINE_KEYS[idx0];
  const k1 = HINDLEG_SPLINE_KEYS[idx1];
  const k2 = HINDLEG_SPLINE_KEYS[idx2];
  const k3 = HINDLEG_SPLINE_KEYS[idx3];

  for (let c = 0; c < 3; c++) {
    _hindOut[c] = evalPeriodicCatmullRom(k0[c], k1[c], k2[c], k3[c], frac);
  }
  return _hindOut;
}

// Objetos scratch reutilizáveis sem GC no loop de animação
const _qSagittal = new THREE.Quaternion();
const _qVertical = new THREE.Quaternion();
const _pawWorldVec = new THREE.Vector3();

function applySagittalBonePose(
  rb: SagittalRigBone | null,
  sagittalAngle: number,
  yawAngle = 0
): void {
  if (!rb) return;
  rb.bone.quaternion.copy(rb.bindQuat);
  if (Math.abs(sagittalAngle) > 1e-5) {
    _qSagittal.setFromAxisAngle(rb.sagittalAxis, sagittalAngle);
    rb.bone.quaternion.multiply(_qSagittal);
  }
  if (Math.abs(yawAngle) > 1e-5) {
    _qVertical.setFromAxisAngle(rb.verticalAxis, yawAngle);
    rb.bone.quaternion.multiply(_qVertical);
  }
}

function getCarameloCartoonGradientMap(): THREE.DataTexture {
  if (sharedCarameloGradientMap) return sharedCarameloGradientMap;
  const steps = [138, 194, 236, 255];
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
  sharedCarameloGradientMap = tex;
  return tex;
}

/**
 * Pré-calcula normais suavizadas espacialmente soldadas (sem quebras em costuras UV)
 * e fator de afilamento nas extremidades das patas para contorno cartoon 100% limpo sem manchas pretas!
 */
function ensureSmoothOutlineAttributes(geo: THREE.BufferGeometry): void {
  if (geo.userData?.smoothOutlinePrepared) return;
  const posAttr = geo.getAttribute('position');
  const normAttr = geo.getAttribute('normal');
  if (!posAttr || !normAttr) return;

  const count = posAttr.count;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const minZ = geo.boundingBox ? geo.boundingBox.min.z : -0.10;
  const spanZ = geo.boundingBox ? Math.max(0.05, geo.boundingBox.max.z - minZ) : 0.70;

  const bucketMap = new Map<string, number>();
  const sumNx: number[] = [];
  const sumNy: number[] = [];
  const sumNz: number[] = [];
  const vertBucket = new Int32Array(count);

  for (let i = 0; i < count; i++) {
    const px = posAttr.getX(i);
    const py = posAttr.getY(i);
    const pz = posAttr.getZ(i);
    const key = `${Math.round(px * 5000)},${Math.round(py * 5000)},${Math.round(pz * 5000)}`;
    let bid = bucketMap.get(key);
    if (bid === undefined) {
      bid = sumNx.length;
      bucketMap.set(key, bid);
      sumNx.push(0);
      sumNy.push(0);
      sumNz.push(0);
    }
    sumNx[bid] += normAttr.getX(i);
    sumNy[bid] += normAttr.getY(i);
    sumNz[bid] += normAttr.getZ(i);
    vertBucket[i] = bid;
  }

  const outNormals = new Float32Array(count * 3);
  const outScale = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const bid = vertBucket[i];
    let nx = sumNx[bid];
    let ny = sumNy[bid];
    let nz = sumNz[bid];
    const len = Math.hypot(nx, ny, nz);
    if (len > 1e-5) {
      nx /= len;
      ny /= len;
      nz /= len;
    } else {
      nx = 0;
      ny = 0;
      nz = 1;
    }
    outNormals[i * 3] = nx;
    outNormals[i * 3 + 1] = ny;
    outNormals[i * 3 + 2] = nz;

    // Afila suavemente a extrusão nos dígitos das patas (z próximo de minZ) para evitar auto-interseção
    const relZ = THREE.MathUtils.clamp((posAttr.getZ(i) - minZ) / (spanZ * 0.22), 0, 1);
    outScale[i] = 0.56 + 0.44 * (relZ * relZ * (3 - 2 * relZ));
  }

  geo.setAttribute('aOutlineNormal', new THREE.BufferAttribute(outNormals, 3));
  geo.setAttribute('aOutlineScale', new THREE.BufferAttribute(outScale, 1));
  geo.userData.smoothOutlinePrepared = true;
}

function createBlackOutlineMaterial(
  localExtrusion: number,
  useSmoothOutlineAttr = false
): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.BackSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const extrudeStr = localExtrusion.toFixed(5);
  mat.onBeforeCompile = (shader) => {
    if (useSmoothOutlineAttr) {
      shader.vertexShader =
        `attribute vec3 aOutlineNormal;\nattribute float aOutlineScale;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vec3 safeN = length(aOutlineNormal) > 0.0001 ? normalize(aOutlineNormal) : vec3(0.0, 1.0, 0.0);
          transformed += safeN * (${extrudeStr} * aOutlineScale);
          `
        );
    } else {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vec3 safeN = length(normal) > 0.0001 ? normalize(normal) : vec3(0.0, 1.0, 0.0);
        transformed += safeN * ${extrudeStr};
        `
      );
    }
  };
  return mat;
}

async function loadCarameloAsset(spec: CarameloSpec): Promise<CachedCarameloAsset> {
  const cached = glbAssetCache.get(spec.id);
  if (cached) return cached;

  const pending = glbLoadingPromises.get(spec.id);
  if (pending) return pending;

  const promise = new Promise<CachedCarameloAsset>((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      spec.glbPath,
      (gltf) => {
        const asset: CachedCarameloAsset = {
          scene: gltf.scene,
        };
        glbAssetCache.set(spec.id, asset);
        glbLoadingPromises.delete(spec.id);
        resolve(asset);
      },
      undefined,
      (err) => {
        console.error(`[carameloModelLoader] Erro ao carregar ${spec.glbPath}:`, err);
        glbLoadingPromises.delete(spec.id);
        reject(err);
      }
    );
  });

  glbLoadingPromises.set(spec.id, promise);
  return promise;
}

export async function createCarameloInstance(
  carameloId?: string,
  options?: { targetHeight?: number; castShadow?: boolean; receiveShadow?: boolean }
): Promise<CarameloInstance> {
  const spec = getCarameloSpecById(carameloId);
  const asset = await loadCarameloAsset(spec);

  const clonedModel = SkeletonUtils.clone(asset.scene) as THREE.Group;
  clonedModel.name = `CarameloMesh_${spec.id}`;

  const materialsToDispose: THREE.Material[] = [];
  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  const staticMeshes: THREE.Mesh[] = [];
  const gradientMap = getCarameloCartoonGradientMap();

  clonedModel.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = options?.castShadow ?? true;
      mesh.receiveShadow = options?.receiveShadow ?? true;
      mesh.frustumCulled = false;

      const std = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      const baseColor = std?.color ? std.color.clone() : new THREE.Color(0xffffff);
      if (std?.map) {
        std.map.colorSpace = THREE.SRGBColorSpace;
        baseColor.setRGB(1.0, 1.0, 1.0);
      } else {
        const hsl = { h: 0, s: 0, l: 0 };
        baseColor.getHSL(hsl);
        baseColor.setHSL(hsl.h, Math.min(1, hsl.s * 1.2), Math.min(0.92, hsl.l * 1.12));
      }

      const isCyber = spec.id === 'caramelo_cyber';
      const toonMat = new THREE.MeshToonMaterial({
        color: baseColor,
        map: std?.map || null,
        gradientMap,
        emissive: isCyber ? new THREE.Color(0x0284c7) : new THREE.Color(0x000000),
        emissiveIntensity: isCyber ? 0.28 : 0.0,
      });
      materialsToDispose.push(toonMat);
      mesh.material = toonMat;

      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
        skinnedMeshes.push(mesh as THREE.SkinnedMesh);
      } else {
        staticMeshes.push(mesh);
      }
    }
  });

  // Contorno Cartoon Preto Nítido em cada malha (SkinnedMesh ou estática)
  const computeLocalOutlineOffset = (geo: THREE.BufferGeometry): number => {
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (!bb) return 0.008;
    const span = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
    return span > 0.01 ? span * 0.011 : 0.008;
  };

  for (const sMesh of staticMeshes) {
    ensureSmoothOutlineAttributes(sMesh.geometry);
    const outMat = createBlackOutlineMaterial(computeLocalOutlineOffset(sMesh.geometry), true);
    materialsToDispose.push(outMat);
    const hull = new THREE.Mesh(sMesh.geometry, outMat);
    hull.name = 'caramelo_cartoon_outline';
    hull.frustumCulled = false;
    hull.castShadow = false;
    hull.receiveShadow = false;
    sMesh.add(hull);
  }

  for (const skMesh of skinnedMeshes) {
    try {
      ensureSmoothOutlineAttributes(skMesh.geometry);
      const baseOff = computeLocalOutlineOffset(skMesh.geometry);
      const outMat = createBlackOutlineMaterial(baseOff, true);
      materialsToDispose.push(outMat);
      const outlineSkinned = new THREE.SkinnedMesh(skMesh.geometry, outMat);
      outlineSkinned.name = 'caramelo_skinned_cartoon_outline';
      outlineSkinned.position.copy(skMesh.position);
      outlineSkinned.quaternion.copy(skMesh.quaternion);
      outlineSkinned.scale.copy(skMesh.scale);
      outlineSkinned.frustumCulled = false;
      outlineSkinned.castShadow = false;
      outlineSkinned.receiveShadow = false;
      outlineSkinned.bind(skMesh.skeleton, skMesh.bindMatrix.clone());
      if (skMesh.parent) {
        skMesh.parent.add(outlineSkinned);
      }

      // Leve Bloom Neon Azul na armadura do Caramelo Cyber (casca aditiva suave sem pesar na GPU!)
      if (spec.id === 'caramelo_cyber') {
        const bloomMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const bloomExtrude = (baseOff * 2.15).toFixed(5);
        bloomMat.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            vec3 safeNB = length(normal) > 0.0001 ? normalize(normal) : vec3(0.0, 1.0, 0.0);
            transformed += safeNB * ${bloomExtrude};
            `
          );
        };
        materialsToDispose.push(bloomMat);

        const bloomSkinned = new THREE.SkinnedMesh(skMesh.geometry, bloomMat);
        bloomSkinned.name = 'caramelo_cyber_armor_bloom';
        bloomSkinned.position.copy(skMesh.position);
        bloomSkinned.quaternion.copy(skMesh.quaternion);
        bloomSkinned.scale.copy(skMesh.scale);
        bloomSkinned.frustumCulled = false;
        bloomSkinned.castShadow = false;
        bloomSkinned.receiveShadow = false;
        bloomSkinned.bind(skMesh.skeleton, skMesh.bindMatrix.clone());
        if (skMesh.parent) {
          skMesh.parent.add(bloomSkinned);
        }
      }
    } catch (e) {
      console.warn('[carameloModelLoader] Aviso no contorno SkinnedMesh:', e);
    }
  }

  // O modelo nativo é Z-up com focinho em -Y e rabo em +Y.
  // Com order='YXZ', rotation.x = -PI/2 coloca +Z em +Y (em pé) e -Y em +Z;
  // em seguida rotation.y = PI gira 180° em torno de +Y, apontando o focinho para -Z (frente da pista!).
  const orientationPivot = new THREE.Group();
  orientationPivot.rotation.order = 'YXZ';
  orientationPivot.rotation.x = -Math.PI / 2;
  orientationPivot.rotation.y = Math.PI;
  orientationPivot.add(clonedModel);

  const visualHolder = new THREE.Group();
  visualHolder.name = 'CarameloVisualHolder';
  visualHolder.add(orientationPivot);

  visualHolder.updateMatrixWorld(true);

  const targetHeight = options?.targetHeight ?? 0.72;
  const initialBox = new THREE.Box3().setFromObject(orientationPivot);
  const currentHeight = initialBox.max.y - initialBox.min.y;
  if (currentHeight > 0.05 && Number.isFinite(currentHeight)) {
    const scaleFactor = targetHeight / currentHeight;
    orientationPivot.scale.multiplyScalar(scaleFactor);
  }

  visualHolder.updateMatrixWorld(true);
  const alignedBox = new THREE.Box3().setFromObject(orientationPivot);
  if (Number.isFinite(alignedBox.min.y)) {
    orientationPivot.position.y -= alignedBox.min.y;
  }
  const basePivotY = orientationPivot.position.y;

  // Pré-calcula os eixos sagital (+X) e vertical (+Y) exatos no espaço local de cada osso em bind pose!
  visualHolder.updateMatrixWorld(true);
  const captureRigBone = (name: string): SagittalRigBone | null => {
    const bone = clonedModel.getObjectByName(name);
    if (!bone) return null;
    const invWorldQuat = new THREE.Quaternion();
    bone.getWorldQuaternion(invWorldQuat).invert();
    return {
      bone,
      bindQuat: bone.quaternion.clone(),
      sagittalAxis: new THREE.Vector3(1, 0, 0).applyQuaternion(invWorldQuat).normalize(),
      verticalAxis: new THREE.Vector3(0, 1, 0).applyQuaternion(invWorldQuat).normalize(),
    };
  };

  // Coluna, pelve, peito, pescoço, cabeça e cauda
  const hipsRig = captureRigBone('Hips');
  const spineRig = captureRigBone('Spine');
  const spine1Rig = captureRigBone('Spine1');
  const neckRig = captureRigBone('Neck');
  const headRig = captureRigBone('Head');
  const tailRig = captureRigBone('Tail');
  const tail1Rig = captureRigBone('Tail1');

  // Pata Dianteira Esquerda (FL) e Direita (FR)
  const flShoulder = captureRigBone('LeftShoulder');
  const flArm = captureRigBone('LeftArm');
  const flForeArm = captureRigBone('LeftForeArm');
  const flHand = captureRigBone('LeftHand');

  const frShoulder = captureRigBone('RightShoulder');
  const frArm = captureRigBone('RightArm');
  const frForeArm = captureRigBone('RightForeArm');
  const frHand = captureRigBone('RightHand');

  // Pata Traseira Esquerda (HL) e Direita (HR)
  const hlUpLeg = captureRigBone('LeftUpLeg');
  const hlLeg = captureRigBone('LeftLeg');
  const hlFoot = captureRigBone('LeftFoot');

  const hrUpLeg = captureRigBone('RightUpLeg');
  const hrLeg = captureRigBone('RightLeg');
  const hrFoot = captureRigBone('RightFoot');

  // Sensores nas extremidades das 4 patas para garantir contato limpo sem atravessar o chão!
  const pawSensors: { node: THREE.Object3D; restY: number }[] = [];
  const pawCandidatePairs: [string, string][] = [
    ['LeftHandSite', 'LeftHand'],
    ['RightHandSite', 'RightHand'],
    ['LeftFootSite', 'LeftFoot'],
    ['RightFootSite', 'RightFoot'],
  ];
  for (const [siteName, fallbackName] of pawCandidatePairs) {
    const node =
      clonedModel.getObjectByName(siteName) || clonedModel.getObjectByName(fallbackName);
    if (node) {
      node.getWorldPosition(_pawWorldVec);
      pawSensors.push({ node, restY: _pawWorldVec.y });
    }
  }

  const root = new THREE.Group();
  root.name = `CarameloRoot_${spec.id}`;
  root.add(visualHolder);

  // =========================================================================
  // DRONES FUTURISTAS AZUIS CARTOON (EXCLUSIVOS DO CARAMELO CYBER!)
  // Inspirados no drone tático bi-rotor: chassi facetado escuro c/ detalhe caramelo,
  // olho central azul neon c/ bloom e 2 hélices dutadas azuis flutuando acima dele!
  // =========================================================================
  const cyberDrones: Array<{
    group: THREE.Group;
    rotors: THREE.Object3D[];
    eyeHalo: THREE.Mesh;
    baseX: number;
    baseY: number;
    baseZ: number;
    phase: number;
  }> = [];
  const droneGeometriesToDispose: THREE.BufferGeometry[] = [];

  if (spec.id === 'caramelo_cyber') {
    const dScale = targetHeight / 0.78;
    const darkHullMat = new THREE.MeshToonMaterial({ color: 0x1e293b, gradientMap });
    const caramelTrimMat = new THREE.MeshToonMaterial({ color: 0xf59e0b, gradientMap });
    const neonBlueMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const neonRingGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rotorDiscMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const droneOutlineMat = new THREE.MeshBasicMaterial({
      color: 0x090d16,
      side: THREE.BackSide,
    });
    materialsToDispose.push(
      darkHullMat,
      caramelTrimMat,
      neonBlueMat,
      neonRingGlowMat,
      rotorDiscMat,
      droneOutlineMat
    );

    const coreGeo = new THREE.CylinderGeometry(0.056, 0.068, 0.072, 8);
    coreGeo.rotateX(Math.PI / 2);
    const topCrestGeo = new THREE.BoxGeometry(0.068, 0.022, 0.076);
    const eyeBezelGeo = new THREE.CylinderGeometry(0.032, 0.036, 0.022, 12);
    eyeBezelGeo.rotateX(Math.PI / 2);
    const eyeLensGeo = new THREE.SphereGeometry(0.022, 12, 10);
    const eyeHaloGeo = new THREE.CircleGeometry(0.052, 16);
    const armGeo = new THREE.BoxGeometry(0.115, 0.016, 0.024);
    const ductOuterGeo = new THREE.TorusGeometry(0.068, 0.014, 8, 20);
    ductOuterGeo.rotateX(Math.PI / 2);
    const ductNeonGeo = new THREE.TorusGeometry(0.064, 0.0065, 6, 20);
    ductNeonGeo.rotateX(Math.PI / 2);
    const bladeGeo = new THREE.BoxGeometry(0.112, 0.004, 0.016);
    const discGeo = new THREE.CircleGeometry(0.058, 16);
    discGeo.rotateX(-Math.PI / 2);
    const skidGeo = new THREE.BoxGeometry(0.01, 0.046, 0.012);

    droneGeometriesToDispose.push(
      coreGeo,
      topCrestGeo,
      eyeBezelGeo,
      eyeLensGeo,
      eyeHaloGeo,
      armGeo,
      ductOuterGeo,
      ductNeonGeo,
      bladeGeo,
      discGeo,
      skidGeo
    );

    const addOutlinedDroneMesh = (
      parent: THREE.Object3D,
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      outlineScale = 1.09
    ) => {
      const m = new THREE.Mesh(geo, mat);
      const hull = new THREE.Mesh(geo, droneOutlineMat);
      hull.scale.setScalar(outlineScale);
      m.add(hull);
      parent.add(m);
      return m;
    };

    const droneSpecs: Array<[number, number, number, number]> = [
      [-0.31 * dScale, targetHeight + 0.25 * dScale, -0.04 * dScale, 0.0],
      [0.31 * dScale, targetHeight + 0.19 * dScale, 0.14 * dScale, 2.2],
    ];

    for (const [bx, by, bz, ph] of droneSpecs) {
      const dGroup = new THREE.Group();
      dGroup.scale.setScalar(dScale);
      dGroup.position.set(bx, by, bz);

      // Núcleo octogonal blindado + crista caramelo-dourada combinando com o Caramelo!
      addOutlinedDroneMesh(dGroup, coreGeo, darkHullMat, 1.08);
      const crest = addOutlinedDroneMesh(dGroup, topCrestGeo, caramelTrimMat, 1.09);
      crest.position.set(0, 0.042, 0.004);

      // Olho central azul brilhante apontado para frente (-Z) + halo bloom
      const bezel = addOutlinedDroneMesh(dGroup, eyeBezelGeo, darkHullMat, 1.08);
      bezel.position.set(0, -0.004, -0.038);

      const eyeLens = new THREE.Mesh(eyeLensGeo, neonBlueMat);
      eyeLens.position.set(0, -0.004, -0.046);
      dGroup.add(eyeLens);

      const eyeHalo = new THREE.Mesh(eyeHaloGeo, neonRingGlowMat);
      eyeHalo.position.set(0, -0.004, -0.052);
      eyeHalo.rotation.y = Math.PI;
      dGroup.add(eyeHalo);

      // Garras / Trem de pouso inferior tático
      for (const sSide of [-1, 1]) {
        const skid = addOutlinedDroneMesh(dGroup, skidGeo, darkHullMat, 1.12);
        skid.position.set(sSide * 0.028, -0.048, 0.005);
        skid.rotation.z = sSide * 0.24;
      }

      // 2 Braços Laterais + 2 Rotores Dutados Circulares com Anel Neon Azul!
      const rotors: THREE.Object3D[] = [];
      for (const rSide of [-1, 1]) {
        const arm = addOutlinedDroneMesh(dGroup, armGeo, darkHullMat, 1.09);
        arm.position.set(rSide * 0.082, 0.018, 0);
        arm.rotation.z = rSide * 0.14;

        const podX = rSide * 0.148;
        const podY = 0.032;

        const shroud = addOutlinedDroneMesh(dGroup, ductOuterGeo, darkHullMat, 1.07);
        shroud.position.set(podX, podY, 0);

        const neonRingUpper = new THREE.Mesh(ductNeonGeo, neonBlueMat);
        neonRingUpper.position.set(podX, podY - 0.008, 0);
        dGroup.add(neonRingUpper);

        const neonRingGlow = new THREE.Mesh(ductNeonGeo, neonRingGlowMat);
        neonRingGlow.scale.setScalar(1.08);
        neonRingGlow.position.set(podX, podY - 0.01, 0);
        dGroup.add(neonRingGlow);

        const disc = new THREE.Mesh(discGeo, rotorDiscMat);
        disc.position.set(podX, podY + 0.002, 0);
        dGroup.add(disc);

        const rotorHub = new THREE.Group();
        rotorHub.position.set(podX, podY + 0.004, 0);
        const b1 = new THREE.Mesh(bladeGeo, neonBlueMat);
        const b2 = new THREE.Mesh(bladeGeo, caramelTrimMat);
        b2.rotation.y = Math.PI / 2;
        rotorHub.add(b1, b2);
        dGroup.add(rotorHub);
        rotors.push(rotorHub);
      }

      root.add(dGroup);
      cyberDrones.push({
        group: dGroup,
        rotors,
        eyeHalo,
        baseX: bx,
        baseY: by,
        baseZ: bz,
        phase: ph,
      });
    }
  }

  // Fase contínua u ∈ [0, 1) perfeitamente periódica sem saltos entre frames
  let cycleU = Math.random();
  let idleClock = 0;
  let runBlend = 0;
  let bonePuffTimer = 0;
  let biteChompTimer = 0;
  let targetBitePrep = 0;
  let smoothBitePrep = 0;

  const triggerBonePuff = () => {
    // Pulso cômico de inflar o corpo ao coletar Osso Branco (volta suavemente ao tamanho normal!)
    bonePuffTimer = 0.78;
  };

  const triggerBiteChomp = () => {
    // Mordida rápida projetando pescoço e cabeça à frente + dentes cartoon se fechando!
    biteChompTimer = 0.56;
  };

  const setBitePrepFactor = (factor: number) => {
    targetBitePrep = THREE.MathUtils.clamp(factor, 0, 1);
  };

  let defeatPoseFactor = 0;
  const setDefeatPose = (factor01: number) => {
    defeatPoseFactor = THREE.MathUtils.clamp(factor01, 0, 1);
  };

  // Item 5: Efeito Visual Cartoon 3D de Dentes se Fechando ("NHAC!") na frente do focinho do Caramelo!
  const biteTeethVfxGroup = new THREE.Group();
  biteTeethVfxGroup.name = 'CarameloSnappingTeethVFX';
  biteTeethVfxGroup.position.set(0, 0.72, -0.58);
  biteTeethVfxGroup.visible = false;
  visualHolder.add(biteTeethVfxGroup);

  const gumMat = new THREE.MeshToonMaterial({ color: 0xf43f5e, gradientMap: getCarameloCartoonGradientMap() });
  const toothMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: getCarameloCartoonGradientMap() });
  const snapFlashMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const jawOutlineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide });
  materialsToDispose.push(gumMat, toothMat, snapFlashMat, jawOutlineMat);

  const upperJawPivot = new THREE.Group();
  const lowerJawPivot = new THREE.Group();
  biteTeethVfxGroup.add(upperJawPivot, lowerJawPivot);

  const gumGeo = new THREE.TorusGeometry(0.18, 0.042, 8, 14, Math.PI);
  const toothConeGeo = new THREE.ConeGeometry(0.036, 0.11, 6);
  const snapStarGeo = new THREE.OctahedronGeometry(0.14, 0);
  droneGeometriesToDispose.push(gumGeo, toothConeGeo, snapStarGeo);

  const upperGum = new THREE.Mesh(gumGeo, gumMat);
  upperGum.rotation.x = Math.PI * 0.5;
  upperJawPivot.add(upperGum);

  const lowerGum = new THREE.Mesh(gumGeo, gumMat);
  lowerGum.rotation.x = Math.PI * 0.5;
  lowerJawPivot.add(lowerGum);

  for (let tIdx = -3; tIdx <= 3; tIdx++) {
    const ang = (tIdx / 3.4) * (Math.PI * 0.42);
    const tx = Math.sin(ang) * 0.18;
    const tz = -Math.cos(ang) * 0.18;
    const isFang = Math.abs(tIdx) === 2;
    const tScaleY = isFang ? 1.38 : 1.0;

    const uTooth = new THREE.Mesh(toothConeGeo, toothMat);
    uTooth.position.set(tx, -0.055 * tScaleY, tz);
    uTooth.rotation.x = Math.PI;
    uTooth.scale.set(1, tScaleY, 1);
    upperJawPivot.add(uTooth);

    const lTooth = new THREE.Mesh(toothConeGeo, toothMat);
    lTooth.position.set(tx, 0.055 * tScaleY, tz);
    lTooth.scale.set(1, tScaleY, 1);
    lowerJawPivot.add(lTooth);
  }

  const snapFlashStar = new THREE.Mesh(snapStarGeo, snapFlashMat);
  snapFlashStar.scale.set(1.4, 0.8, 0.5);
  biteTeethVfxGroup.add(snapFlashStar);

  const update = (
    dt: number,
    speedMs: number,
    steerLean = 0,
    jumpY = 0,
    isRolling = false
  ) => {
    const clampedDt = Math.min(0.05, Math.max(0, dt));
    const activeSpeed = Math.max(0, speedMs);
    idleClock = (idleClock + clampedDt) % 628.3185;
    if (bonePuffTimer > 0) {
      bonePuffTimer = Math.max(0, bonePuffTimer - clampedDt);
    }
    if (biteChompTimer > 0) {
      biteChompTimer = Math.max(0, biteChompTimer - clampedDt);
    }
    smoothBitePrep = THREE.MathUtils.lerp(
      smoothBitePrep,
      targetBitePrep,
      1 - Math.exp(-11 * clampedDt)
    );

    const isRunning = activeSpeed > 0.25;
    // Transição contínua caminhada -> trote -> galope preservando o formato natural das patas
    const gaitAmp = isRunning
      ? THREE.MathUtils.clamp(0.55 + activeSpeed * 0.032, 0.62, 1.04) * (1.0 + smoothBitePrep * 0.10)
      : 0.0;
    const targetBlend = isRunning ? 1.0 : 0.0;
    runBlend = THREE.MathUtils.lerp(runBlend, targetBlend, 1 - Math.exp(-12 * clampedDt));

    if (isRunning) {
      const cyclesPerSec = THREE.MathUtils.clamp(
        1.45 + activeSpeed * 0.058 + smoothBitePrep * 0.28,
        1.55,
        3.45
      );
      cycleU = (cycleU + clampedDt * cyclesPerSec) % 1.0;
    }

    const twoPiU = cycleU * Math.PI * 2;
    const airBlend = THREE.MathUtils.clamp((jumpY - 0.06) / 0.34, 0, 1);
    const groundRunWeight = runBlend * gaitAmp * (1.0 - airBlend * 0.72);
    // Na preparação da mordida, as patas flexionam ligeiramente carregando mola de bote
    const prepForeArmBias = -0.10 * smoothBitePrep;
    const prepArmBias = 0.09 * smoothBitePrep;
    const prepHindUpBias = 0.11 * smoothBitePrep;
    const prepHindLegBias = -0.12 * smoothBitePrep;

    // 1. Defasagens de Galope Canino + Pose Aérea de Salto Limpa (4 patas preservam proporção em todos os estados!)
    const [flS, flA, flFA, flH] = sampleForelegAngles(cycleU);
    applySagittalBonePose(flShoulder, flS * groundRunWeight + airBlend * 0.16);
    applySagittalBonePose(flArm, flA * groundRunWeight + prepArmBias + airBlend * 0.28);
    applySagittalBonePose(flForeArm, flFA * groundRunWeight + prepForeArmBias - airBlend * 0.24);
    applySagittalBonePose(flHand, flH * groundRunWeight - airBlend * 0.12);

    const [frS, frA, frFA, frH] = sampleForelegAngles(cycleU + 0.12);
    applySagittalBonePose(frShoulder, frS * groundRunWeight + airBlend * 0.14);
    applySagittalBonePose(frArm, frA * groundRunWeight + prepArmBias + airBlend * 0.24);
    applySagittalBonePose(frForeArm, frFA * groundRunWeight + prepForeArmBias - airBlend * 0.28);
    applySagittalBonePose(frHand, frH * groundRunWeight - airBlend * 0.14);

    const [hlU, hlL, hlF] = sampleHindlegAngles(cycleU + 0.34);
    applySagittalBonePose(hlUpLeg, hlU * groundRunWeight + prepHindUpBias - airBlend * 0.34);
    applySagittalBonePose(hlLeg, hlL * groundRunWeight + prepHindLegBias + airBlend * 0.14);
    applySagittalBonePose(hlFoot, hlF * groundRunWeight - airBlend * 0.22);

    const [hrU, hrL, hrF] = sampleHindlegAngles(cycleU + 0.46);
    applySagittalBonePose(hrUpLeg, hrU * groundRunWeight + prepHindUpBias - airBlend * 0.30);
    applySagittalBonePose(hrLeg, hrL * groundRunWeight + prepHindLegBias + airBlend * 0.12);
    applySagittalBonePose(hrFoot, hrF * groundRunWeight - airBlend * 0.20);

    // 2. Sincronização biomecânica de Pelve, Coluna, Peito, Pescoço, Cabeça e Cauda
    const idleBreath = Math.sin(idleClock * 2.6) * 0.018 * (1 - runBlend);
    const hipsPitch = Math.cos(twoPiU - 0.25) * 0.082 * runBlend + smoothBitePrep * 0.05;
    const spineFlex = Math.cos(twoPiU - 0.72) * 0.090 * runBlend + idleBreath - smoothBitePrep * 0.06;
    const chestFlex = Math.cos(twoPiU - 0.85) * 0.080 * runBlend - smoothBitePrep * 0.05;

    applySagittalBonePose(hipsRig, hipsPitch);
    applySagittalBonePose(spineRig, spineFlex);
    applySagittalBonePose(spine1Rig, chestFlex);

    // Contra-estabilização do pescoço e cabeça mantendo o olhar firme para frente (-Z)
    // + Avanço predador da cabeça na Preparação (smoothBitePrep) + Mordida sincronizada ("NHAC!")
    const totalTorsoPitch = hipsPitch + spineFlex + chestFlex;
    const gallopNod = Math.sin(twoPiU - 0.4) * 0.042 * runBlend + idleBreath * 0.8;
    const turnLookYaw = THREE.MathUtils.clamp(-steerLean * 0.16, -0.24, 0.24);
    const chompNorm = biteChompTimer > 0 ? biteChompTimer / 0.54 : 0;
    const chompSnap =
      chompNorm > 0 ? Math.sin(chompNorm * Math.PI * 4.0) * 0.34 * chompNorm : 0;
    const prepHeadReach = smoothBitePrep * 0.22;

    applySagittalBonePose(
      neckRig,
      -totalTorsoPitch * 0.62 + gallopNod * 0.6 + prepHeadReach * 0.85 + chompSnap * 0.65,
      turnLookYaw * 0.45
    );
    applySagittalBonePose(
      headRig,
      -totalTorsoPitch * 0.38 + gallopNod * 0.5 + prepHeadReach * 0.95 + chompSnap * 1.12,
      turnLookYaw * 0.55 + Math.sin(chompNorm * Math.PI * 6.0) * 0.08 * chompNorm
    );

    // Cauda fluida acompanhando a onda da coluna + tensão alerta na preparação da mordida
    const tailPitch =
      Math.sin(twoPiU - 1.1) * 0.22 * runBlend +
      Math.sin(idleClock * 3.0) * 0.06 * (1 - runBlend) -
      smoothBitePrep * 0.14;
    const tailWag =
      Math.sin(twoPiU * 2.0) * 0.13 * runBlend +
      Math.sin(idleClock * 5.2) * 0.16 * (1 - runBlend) +
      Math.sin(idleClock * 16.0) * 0.09 * smoothBitePrep;
    applySagittalBonePose(tailRig, tailPitch, tailWag);
    applySagittalBonePose(
      tail1Rig,
      Math.sin(twoPiU - 1.75) * 0.20 * runBlend,
      tailWag * 0.85
    );

    // 3. Oscilação vertical da pelve + agachamento predador suave na preparação da mordida!
    const pelvisOscY =
      (-Math.cos(twoPiU - 0.3) * 0.024 + Math.sin(twoPiU * 2.0 - 0.5) * 0.008 + 0.015) *
      runBlend *
      (1.0 - airBlend);
    const prepCrouchOffset = -0.046 * smoothBitePrep;
    orientationPivot.position.y = basePivotY + pelvisOscY + prepCrouchOffset;

    // 4. Inclinação orgânica ao trocar entre as 3 faixas, preparação de bote, pulo, rasteira, DENTES SE FECHANDO e DERROTA CÔMICA!
    if (biteChompTimer > 0) {
      biteTeethVfxGroup.visible = true;
      const p = 1.0 - biteChompTimer / 0.56;
      // Abre amplamente na antecipação e fecha com estalo firme ("NHAC!") duas vezes!
      const snapWave = Math.abs(Math.cos(p * Math.PI * 2.5));
      const jawOpenAngle = snapWave * 0.62 * (1.0 - p * 0.35);
      upperJawPivot.position.y = 0.04 + jawOpenAngle * 0.12;
      upperJawPivot.rotation.x = -jawOpenAngle;
      lowerJawPivot.position.y = -0.04 - jawOpenAngle * 0.12;
      lowerJawPivot.rotation.x = jawOpenAngle;

      const popScale = p < 0.14 ? p / 0.14 : p > 0.82 ? Math.max(0.01, (1.0 - p) / 0.18) : 1.08;
      biteTeethVfxGroup.scale.setScalar(popScale * 1.18);
      const isClampedShut = jawOpenAngle < 0.16;
      snapFlashStar.visible = isClampedShut;
      if (isClampedShut) {
        snapFlashStar.rotation.z += clampedDt * 18.0;
        snapFlashStar.scale.setScalar(0.95 + Math.sin(p * 32.0) * 0.35);
      }
    } else {
      biteTeethVfxGroup.visible = false;
    }

    const targetRoll =
      defeatPoseFactor > 0.01
        ? THREE.MathUtils.lerp(-steerLean * 0.28, Math.PI * 0.82, defeatPoseFactor)
        : -steerLean * 0.28;
    const targetYaw =
      defeatPoseFactor > 0.01
        ? Math.sin(idleClock * 6.0) * 0.18 * defeatPoseFactor
        : -steerLean * 0.18;
    const targetPitch =
      defeatPoseFactor > 0.01
        ? 0.14 * defeatPoseFactor
        : chompNorm > 0
          ? 0.15 * chompNorm
          : jumpY > 0.06
            ? THREE.MathUtils.clamp(0.22 - jumpY * 0.11, -0.16, 0.26)
            : isRolling
              ? -0.12
              : -0.055 * smoothBitePrep;

    if (defeatPoseFactor > 0.01) {
      // Item 7: Derrota cômica própria do Caramelo (vira de barriga/lado com as patinhas pedalando no ar!)
      const paddle = Math.sin(idleClock * 18.0) * 0.42 * defeatPoseFactor;
      applySagittalBonePose(flArm, 0.35 + paddle);
      applySagittalBonePose(frArm, 0.35 - paddle);
      applySagittalBonePose(hlUpLeg, -0.35 - paddle);
      applySagittalBonePose(hrUpLeg, -0.35 + paddle);
      orientationPivot.position.y = basePivotY + 0.18 * defeatPoseFactor;
    }

    const smoothK = 1 - Math.exp(-14 * clampedDt);
    visualHolder.rotation.z = THREE.MathUtils.lerp(visualHolder.rotation.z, targetRoll, smoothK);
    visualHolder.rotation.y = THREE.MathUtils.lerp(visualHolder.rotation.y, targetYaw, smoothK);
    visualHolder.rotation.x = THREE.MathUtils.lerp(visualHolder.rotation.x, targetPitch, smoothK);

    // Curva elástica cartoon quando coleta Osso Branco: infla rápido nos primeiros 25% e desinfla macio até 0!
    let puffEnv = 0;
    if (bonePuffTimer > 0) {
      const p = 1.0 - bonePuffTimer / 0.78;
      const swell = p < 0.22 ? p / 0.22 : Math.pow(1.0 - (p - 0.22) / 0.78, 1.45);
      const wobble = 1.0 + Math.sin(p * Math.PI * 5.0) * 0.12 * (1.0 - p);
      puffEnv = swell * wobble;
    }

    const targetScaleY = (isRolling ? 0.62 : 1.0) * (1.0 + puffEnv * 0.28);
    const targetScaleXZ = (isRolling ? 1.14 : 1.0) * (1.0 + puffEnv * 0.42);
    visualHolder.scale.y = THREE.MathUtils.lerp(visualHolder.scale.y, targetScaleY, smoothK);
    visualHolder.scale.x = THREE.MathUtils.lerp(visualHolder.scale.x, targetScaleXZ, smoothK);
    visualHolder.scale.z = visualHolder.scale.x;

    // 5. Restrição Estrita de Solo: nenhuma pata atravessa o chão, preservando o voo na suspensão!
    if (pawSensors.length > 0 && jumpY <= 0.02 && !isRolling) {
      visualHolder.updateMatrixWorld(true);
      let minPawMargin = Infinity;
      for (let i = 0; i < pawSensors.length; i++) {
        const s = pawSensors[i];
        _pawWorldVec.setFromMatrixPosition(s.node.matrixWorld);
        visualHolder.worldToLocal(_pawWorldVec);
        const margin = _pawWorldVec.y - s.restY;
        if (margin < minPawMargin) {
          minPawMargin = margin;
        }
      }
      if (minPawMargin < 0) {
        orientationPivot.position.y += Math.min(0.09, -minPawMargin);
      }
    }

    // 6. Animação Anti-Gravidade e Hélices dos 2 Drones Azuis do Caramelo Cyber (Zero GC)
    if (cyberDrones.length > 0) {
      for (let i = 0; i < cyberDrones.length; i++) {
        const d = cyberDrones[i];
        const t = idleClock * 3.2 + d.phase;
        const hoverY = Math.sin(t) * 0.038 + jumpY * 0.85;
        const swayX = Math.cos(t * 0.75) * 0.028 - steerLean * 0.08;
        const swayZ = Math.sin(t * 0.55) * 0.025;

        d.group.position.set(d.baseX + swayX, d.baseY + hoverY, d.baseZ + swayZ);
        d.group.rotation.z = -steerLean * 0.34 + Math.sin(t * 0.8) * 0.08;
        d.group.rotation.x = isRunning ? -0.14 : Math.cos(t * 0.7) * 0.05;
        d.group.rotation.y = -steerLean * 0.18;

        const haloPulse = 0.88 + Math.sin(idleClock * 7.5 + d.phase) * 0.16;
        d.eyeHalo.scale.setScalar(haloPulse);

        for (let r = 0; r < d.rotors.length; r++) {
          d.rotors[r].rotation.y = (d.rotors[r].rotation.y + clampedDt * 38.0) % (Math.PI * 2);
        }
      }
    }
  };

  const dispose = () => {
    for (const g of droneGeometriesToDispose) {
      g.dispose();
    }
    for (const m of materialsToDispose) {
      m.dispose();
    }
    root.clear();
  };

  return {
    spec,
    root,
    mixer: null,
    triggerBonePuff,
    triggerBiteChomp,
    setBitePrepFactor,
    setDefeatPose,
    update,
    dispose,
  };
}
