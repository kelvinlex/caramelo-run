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
    price: 22000,
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
    price: 45000,
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
    price: 78000,
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
    price: 115000,
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
    name: 'Caramelo Cyber Robô',
    subtitle: 'Turbo Noturno & Drones',
    glbPath: '/models/caramelo/caramelo_cyber.glb',
    price: 150000,
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
    price: 165000,
    rarity: 'Mítica',
    primaryColor: '#f97316',
    accentColor: '#fef08a',
    speedPct: 100,
    agilityPct: 99,
    staminaPct: 100,
    description: 'O líder absoluto da matilha! Arrancada explosiva nas 3 pistas.',
  },
  {
    id: 'caramelo_diabo',
    name: 'Caramelo Diabo',
    subtitle: 'Terror do Inferno',
    glbPath: '/models/caramelo/caramelo_diabo.glb?v=2',
    price: 185000,
    rarity: 'Lendária',
    primaryColor: '#dc2626',
    accentColor: '#f97316',
    speedPct: 100,
    agilityPct: 100,
    staminaPct: 100,
    description: 'A forma infernal do Caramelo no Modo Extremo! Chifres, asas demoníacas e velocidade máxima nas pistas.',
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
  return 'caramelo';
}

export function savePlayMode(mode: PlayMode): void {
  try {
    localStorage.setItem(PLAY_MODE_KEY, mode);
  } catch {}
}

export type CarameloAttackVariant = 'snap_bite' | 'spin_whip' | 'alpha_pounce';
export type CarameloFireBreathPhase = 'idle' | 'charge' | 'blast' | 'dissipate';

export interface CarameloInstance {
  spec: CarameloSpec;
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  triggerBonePuff: () => void;
  triggerBiteChomp: (variant?: CarameloAttackVariant) => void;
  setBitePrepFactor: (factor: number) => void;
  setFireBreathState: (phase: CarameloFireBreathPhase, progress01: number) => void;
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
  [0.20, 0.36, 0.04, -0.04],   // k=0 (p=0.00): Extensão frontal natural preparando o pouso no asfalto
  [0.12, 0.18, 0.02, 0.16],    // k=1 (p=0.17): Toque firme e recepção das almofadas da pata no solo
  [-0.02, -0.04, 0.00, 0.14],  // k=2 (p=0.33): Apoio médio firme cravado no chão sustentando o peito
  [-0.22, -0.36, -0.10, -0.18],// k=3 (p=0.50): Impulso potente empurrando o asfalto para trás
  [-0.10, -0.20, -0.54, -0.34],// k=4 (p=0.67): Recolhimento limpo na fase de impulso
  [0.10, 0.18, -0.16, -0.12],  // k=5 (p=0.83): Desdobramento fluido avançando à frente
];

// 6 nós de controle cíclicos uniformemente espaçados em p ∈ [0, 1) para a Pata Traseira:
// [UpLeg (Quadril/Fêmur), Leg (Joelho/Tíbia), Foot (Jarrete/Pata)]
const HINDLEG_SPLINE_KEYS: readonly [number, number, number][] = [
  [0.48, -0.38, 0.28],  // k=0 (p=0.00): Avanço sob o abdômen preparando o apoio
  [0.32, -0.08, 0.12],  // k=1 (p=0.17): Contato firme das patas traseiras no chão
  [0.02, -0.10, 0.08],  // k=2 (p=0.33): Apoio completo e carga de tração no solo
  [-0.44, 0.24, -0.28], // k=3 (p=0.50): Impulsão traseira potente empurrando o chão!
  [-0.48, 0.12, -0.32], // k=4 (p=0.67): Extensão traseira pós-impulso
  [0.06, -0.48, 0.32],  // k=5 (p=0.83): Retorno fluido para nova passada
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
const _tempEyePos = new THREE.Vector3();

let _cachedAnimeRedFlareTexture: THREE.CanvasTexture | null = null;
function getAnimeRedFlareTexture(): THREE.CanvasTexture {
  if (_cachedAnimeRedFlareTexture) return _cachedAnimeRedFlareTexture;
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 256;
  const cy = 128;

  // 1. Long Anamorphic Horizontal Laser Streak (vermelho rubi com núcleo branco puro)
  const gradStreak = ctx.createLinearGradient(0, cy, 512, cy);
  gradStreak.addColorStop(0.0, 'rgba(255, 0, 30, 0.0)');
  gradStreak.addColorStop(0.22, 'rgba(255, 0, 50, 0.18)');
  gradStreak.addColorStop(0.40, 'rgba(255, 20, 60, 0.72)');
  gradStreak.addColorStop(0.47, 'rgba(255, 140, 170, 0.95)');
  gradStreak.addColorStop(0.50, 'rgba(255, 255, 255, 1.0)');
  gradStreak.addColorStop(0.53, 'rgba(255, 140, 170, 0.95)');
  gradStreak.addColorStop(0.60, 'rgba(255, 20, 60, 0.72)');
  gradStreak.addColorStop(0.78, 'rgba(255, 0, 50, 0.18)');
  gradStreak.addColorStop(1.0, 'rgba(255, 0, 30, 0.0)');

  ctx.fillStyle = gradStreak;
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.bezierCurveTo(180, cy - 8, 332, cy - 8, 512, cy);
  ctx.bezierCurveTo(332, cy + 8, 180, cy + 8, 0, cy);
  ctx.closePath();
  ctx.fill();

  // Linha central ultra-fina super branca no núcleo do feixe
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillRect(180, cy - 1.5, 152, 3.0);

  // 2. Feixe óptico vertical (cruz ótica anamórfica)
  const gradCross = ctx.createLinearGradient(cx, 16, cx, 240);
  gradCross.addColorStop(0.0, 'rgba(255, 0, 30, 0.0)');
  gradCross.addColorStop(0.35, 'rgba(255, 10, 50, 0.45)');
  gradCross.addColorStop(0.48, 'rgba(255, 180, 200, 0.9)');
  gradCross.addColorStop(0.50, 'rgba(255, 255, 255, 1.0)');
  gradCross.addColorStop(0.52, 'rgba(255, 180, 200, 0.9)');
  gradCross.addColorStop(0.65, 'rgba(255, 10, 50, 0.45)');
  gradCross.addColorStop(1.0, 'rgba(255, 0, 30, 0.0)');

  ctx.fillStyle = gradCross;
  ctx.beginPath();
  ctx.moveTo(cx, 16);
  ctx.bezierCurveTo(cx - 6, 80, cx - 6, 176, cx, 240);
  ctx.bezierCurveTo(cx + 6, 176, cx + 6, 80, cx, 16);
  ctx.closePath();
  ctx.fill();

  // 3. Brilho radial central intenso (hotspot diamante branco + aura vermelha incandescente)
  const radGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 110);
  radGlow.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  radGlow.addColorStop(0.08, 'rgba(255, 240, 245, 0.98)');
  radGlow.addColorStop(0.22, 'rgba(255, 20, 60, 0.85)');
  radGlow.addColorStop(0.45, 'rgba(220, 0, 40, 0.45)');
  radGlow.addColorStop(0.75, 'rgba(180, 0, 25, 0.12)');
  radGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = radGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.fill();

  // 4. Fantasma anamórfico secundário suave à direita
  const ghostGlow = ctx.createRadialGradient(cx + 95, cy, 0, cx + 95, cy, 26);
  ghostGlow.addColorStop(0.0, 'rgba(255, 30, 70, 0.38)');
  ghostGlow.addColorStop(0.6, 'rgba(220, 0, 40, 0.14)');
  ghostGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = ghostGlow;
  ctx.beginPath();
  ctx.arc(cx + 95, cy, 26, 0, Math.PI * 2);
  ctx.fill();

  _cachedAnimeRedFlareTexture = new THREE.CanvasTexture(canvas);
  return _cachedAnimeRedFlareTexture;
}

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
  useSmoothOutlineAttr = false,
  outlineColor = 0x050302
): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({
    color: outlineColor,
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
  const diaboWingUniforms = {
    uWingFlapAngle: { value: 0.0 },
  };

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
      const isDiabo = spec.id === 'caramelo_diabo';
      const toonMat = new THREE.MeshToonMaterial({
        color: baseColor,
        map: std?.map || null,
        gradientMap,
        side: isDiabo ? THREE.DoubleSide : THREE.FrontSide,
        emissive: isCyber
          ? new THREE.Color(0x0284c7)
          : isDiabo
          ? new THREE.Color(0x450a0a)
          : new THREE.Color(0x000000),
        emissiveIntensity: isCyber ? 0.28 : isDiabo ? 0.18 : 0.0,
      });

      // Animação de bater de asas fluida e calculada (Caramelo Diabo)
      // O dorso e a coluna do cachorro são rigorosamente preservados via peso zero de isolamento!
      if (isDiabo) {
        toonMat.onBeforeCompile = (shader) => {
          shader.uniforms.uWingFlapAngle = diaboWingUniforms.uWingFlapAngle;
          shader.vertexShader =
            `uniform float uWingFlapAngle;\n` +
            shader.vertexShader.replace(
              '#include <begin_vertex>',
              `
              #include <begin_vertex>
              if (position.z > 0.35 && position.y > -0.15) {
                float wingW = smoothstep(0.065, 0.17, abs(position.x)) * smoothstep(0.35, 0.44, position.z);
                if (wingW > 0.0001) {
                  if (position.x > 0.0) {
                    vec3 pivot = vec3(0.065, position.y, 0.36);
                    vec3 rel = transformed - pivot;
                    float ang = uWingFlapAngle * wingW;
                    float cosA = cos(ang);
                    float sinA = sin(ang);
                    float rotX = rel.x * cosA - rel.z * sinA;
                    float rotZ = rel.x * sinA + rel.z * cosA;
                    float tipFlex = sin(uWingFlapAngle * 1.4 - 0.25) * 0.12 * smoothstep(0.14, 0.36, position.x) * wingW;
                    transformed = pivot + vec3(rotX, rel.y, rotZ + tipFlex);
                  } else {
                    vec3 pivot = vec3(-0.065, position.y, 0.36);
                    vec3 rel = transformed - pivot;
                    float ang = -uWingFlapAngle * wingW;
                    float cosA = cos(ang);
                    float sinA = sin(ang);
                    float rotX = rel.x * cosA - rel.z * sinA;
                    float rotZ = rel.x * sinA + rel.z * cosA;
                    float tipFlex = sin(uWingFlapAngle * 1.4 - 0.25) * 0.12 * smoothstep(0.14, 0.36, -position.x) * wingW;
                    transformed = pivot + vec3(rotX, rel.y, rotZ + tipFlex);
                  }
                }
              }
              `
            );
        };
      }

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
    if (!bb) return 0.012;
    const span = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
    return span > 0.01 ? span * 0.018 : 0.012;
  };

  // Contorno Cartoon: amarelado/dourado queimado cartoon para o Caramelo Diabo (não muito intenso), preto clássico para os demais
  const isDiabo = spec.id === 'caramelo_diabo';
  const outlineColor = isDiabo ? 0xd4a028 : 0x050302;

  for (const sMesh of staticMeshes) {
    ensureSmoothOutlineAttributes(sMesh.geometry);
    const outMat = createBlackOutlineMaterial(computeLocalOutlineOffset(sMesh.geometry), true, outlineColor);
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
      const outMat = createBlackOutlineMaterial(baseOff, true, outlineColor);
      if (spec.id === 'caramelo_diabo') {
        const prevCompile = outMat.onBeforeCompile;
        outMat.onBeforeCompile = (shader, renderer) => {
          if (prevCompile) prevCompile(shader, renderer);
          shader.uniforms.uWingFlapAngle = diaboWingUniforms.uWingFlapAngle;
          shader.vertexShader =
            `uniform float uWingFlapAngle;\n` +
            shader.vertexShader.replace(
              '#include <begin_vertex>',
              `
              #include <begin_vertex>
              if (position.z > 0.35 && position.y > -0.15) {
                float wingW = smoothstep(0.065, 0.17, abs(position.x)) * smoothstep(0.35, 0.44, position.z);
                if (wingW > 0.0001) {
                  if (position.x > 0.0) {
                    vec3 pivot = vec3(0.065, position.y, 0.36);
                    vec3 rel = transformed - pivot;
                    float ang = uWingFlapAngle * wingW;
                    float cosA = cos(ang);
                    float sinA = sin(ang);
                    float rotX = rel.x * cosA - rel.z * sinA;
                    float rotZ = rel.x * sinA + rel.z * cosA;
                    float tipFlex = sin(uWingFlapAngle * 1.4 - 0.25) * 0.12 * smoothstep(0.14, 0.36, position.x) * wingW;
                    transformed = pivot + vec3(rotX, rel.y, rotZ + tipFlex);
                  } else {
                    vec3 pivot = vec3(-0.065, position.y, 0.36);
                    vec3 rel = transformed - pivot;
                    float ang = -uWingFlapAngle * wingW;
                    float cosA = cos(ang);
                    float sinA = sin(ang);
                    float rotX = rel.x * cosA - rel.z * sinA;
                    float rotZ = rel.x * sinA + rel.z * cosA;
                    float tipFlex = sin(uWingFlapAngle * 1.4 - 0.25) * 0.12 * smoothstep(0.14, 0.36, -position.x) * wingW;
                    transformed = pivot + vec3(rotX, rel.y, rotZ + tipFlex);
                  }
                }
              }
              `
            );
        };
      }
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
  const basePivotY = orientationPivot.position.y - 0.018;
  orientationPivot.position.y = basePivotY;

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
    orbitAngle: number;
    orbitSpeed: number;
    radiusX: number;
    radiusZ: number;
    freqA: number;
    freqB: number;
    freqC: number;
    curX: number;
    curY: number;
    curZ: number;
    vx: number;
    vy: number;
    vz: number;
    wanderTimer: number;
    wanderX: number;
    wanderY: number;
    wanderZ: number;
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

    // Item 2: Drones posicionados com distância, altura e órbitas independentes ao redor do cachorro (nunca colados sobre ele!)
    const droneSpecs: Array<{
      bx: number;
      by: number;
      bz: number;
      ph: number;
      orbitSpeed: number;
      rx: number;
      rz: number;
      fA: number;
      fB: number;
      fC: number;
    }> = [
      {
        bx: -0.62 * dScale,
        by: targetHeight + 0.36 * dScale,
        bz: -0.18 * dScale,
        ph: 0.4,
        orbitSpeed: 0.78,
        rx: 0.48 * dScale,
        rz: 0.44 * dScale,
        fA: 1.37,
        fB: 2.13,
        fC: 0.89,
      },
      {
        bx: 0.68 * dScale,
        by: targetHeight + 0.48 * dScale,
        bz: 0.24 * dScale,
        ph: 3.65,
        orbitSpeed: -0.64,
        rx: 0.54 * dScale,
        rz: 0.50 * dScale,
        fA: 1.79,
        fB: 1.24,
        fC: 1.53,
      },
    ];

    for (const sp of droneSpecs) {
      const { bx, by, bz, ph } = sp;
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
        orbitAngle: ph,
        orbitSpeed: sp.orbitSpeed,
        radiusX: sp.rx,
        radiusZ: sp.rz,
        freqA: sp.fA,
        freqB: sp.fB,
        freqC: sp.fC,
        curX: bx,
        curY: by,
        curZ: bz,
        vx: 0,
        vy: 0,
        vz: 0,
        wanderTimer: 0.4 + Math.random() * 0.9,
        wanderX: 0,
        wanderY: 0,
        wanderZ: 0,
      });
    }
  }

  // Fase contínua u ∈ [0, 1) perfeitamente periódica sem saltos entre frames
  let cycleU = Math.random();
  let idleClock = 0;
  let wingFlapClock = 0;
  let runBlend = 0;
  let bonePuffTimer = 0;
  let biteChompTimer = 0;
  let activeAttackVariant: CarameloAttackVariant = 'snap_bite';
  let attackCycleCounter = 0;
  let targetBitePrep = 0;
  let smoothBitePrep = 0;

  const triggerBonePuff = () => {
    // Pulso cômico de inflar o corpo ao coletar Osso Branco (volta suavemente ao tamanho normal!)
    bonePuffTimer = 0.78;
  };

  const triggerBiteChomp = (variant?: CarameloAttackVariant) => {
    // Item 11: Novas variações de ataque do Caramelo (mordida rápida, giro chicote ou bote duplo alfa!)
    if (variant) {
      activeAttackVariant = variant;
    } else {
      const variants: CarameloAttackVariant[] = ['snap_bite', 'spin_whip', 'alpha_pounce'];
      activeAttackVariant = variants[attackCycleCounter % variants.length];
      attackCycleCounter += 1;
    }
    biteChompTimer = activeAttackVariant === 'alpha_pounce' ? 0.64 : 0.56;
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
  biteTeethVfxGroup.position.set(0, 0.74, -0.62);
  biteTeethVfxGroup.visible = false;
  visualHolder.add(biteTeethVfxGroup);

  const gumMat = new THREE.MeshToonMaterial({ color: 0xe11d48, gradientMap: getCarameloCartoonGradientMap() });
  const toothMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: getCarameloCartoonGradientMap() });
  const snapFlashMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const snapCrimsonFlashMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const jawOutlineMat = new THREE.MeshBasicMaterial({ color: 0x090d16, side: THREE.BackSide });
  materialsToDispose.push(gumMat, toothMat, snapFlashMat, snapCrimsonFlashMat, jawOutlineMat);

  const upperJawPivot = new THREE.Group();
  const lowerJawPivot = new THREE.Group();
  biteTeethVfxGroup.add(upperJawPivot, lowerJawPivot);

  const gumGeo = new THREE.TorusGeometry(0.24, 0.056, 10, 18, Math.PI);
  const toothConeGeo = new THREE.ConeGeometry(0.048, 0.155, 8);
  const snapStarGeo = new THREE.OctahedronGeometry(0.19, 0);
  droneGeometriesToDispose.push(gumGeo, toothConeGeo, snapStarGeo);

  const upperGum = new THREE.Mesh(gumGeo, gumMat);
  upperGum.rotation.x = Math.PI * 0.5;
  const upperGumOutline = new THREE.Mesh(gumGeo, jawOutlineMat);
  upperGumOutline.scale.setScalar(1.12);
  upperGum.add(upperGumOutline);
  upperJawPivot.add(upperGum);

  const lowerGum = new THREE.Mesh(gumGeo, gumMat);
  lowerGum.rotation.x = Math.PI * 0.5;
  const lowerGumOutline = new THREE.Mesh(gumGeo, jawOutlineMat);
  lowerGumOutline.scale.setScalar(1.12);
  lowerGum.add(lowerGumOutline);
  lowerJawPivot.add(lowerGum);

  for (let tIdx = -3; tIdx <= 3; tIdx++) {
    const ang = (tIdx / 3.2) * (Math.PI * 0.44);
    const tx = Math.sin(ang) * 0.24;
    const tz = -Math.cos(ang) * 0.24;
    const isFang = Math.abs(tIdx) === 2;
    const tScaleY = isFang ? 1.55 : 1.08;
    const tScaleXZ = isFang ? 1.22 : 1.0;

    const uTooth = new THREE.Mesh(toothConeGeo, toothMat);
    uTooth.position.set(tx, -0.072 * tScaleY, tz);
    uTooth.rotation.x = Math.PI;
    uTooth.scale.set(tScaleXZ, tScaleY, tScaleXZ);
    const uToothHull = new THREE.Mesh(toothConeGeo, jawOutlineMat);
    uToothHull.scale.setScalar(1.14);
    uTooth.add(uToothHull);
    upperJawPivot.add(uTooth);

    const lTooth = new THREE.Mesh(toothConeGeo, toothMat);
    lTooth.position.set(tx, 0.072 * tScaleY, tz);
    lTooth.scale.set(tScaleXZ, tScaleY, tScaleXZ);
    const lToothHull = new THREE.Mesh(toothConeGeo, jawOutlineMat);
    lToothHull.scale.setScalar(1.14);
    lTooth.add(lToothHull);
    lowerJawPivot.add(lTooth);
  }

  const snapFlashStar = new THREE.Mesh(snapStarGeo, snapFlashMat);
  snapFlashStar.scale.set(1.65, 1.0, 0.65);
  const snapOuterBurst = new THREE.Mesh(snapStarGeo, snapCrimsonFlashMat);
  snapOuterBurst.scale.setScalar(1.38);
  snapOuterBurst.rotation.z = Math.PI / 4;
  snapFlashStar.add(snapOuterBurst);
  biteTeethVfxGroup.add(snapFlashStar);

  // =========================================================================
  // CARAMELO DIABO (MODO EXTREMO: INFERNO) — CHIFRES, OLHOS AMEAÇADORES,
  // ASAS DEMONÍACAS PARCIALMENTE ENCOLHIDAS NAS COSTAS + BAFORADA DE FOGO!
  // =========================================================================
  let fireBreathPhase: CarameloFireBreathPhase = 'idle';
  let fireBreathProgress = 0;
  const fireBreathVfxGroup = new THREE.Group();
  fireBreathVfxGroup.name = 'CarameloDiabo_FireBreathVFX';
  fireBreathVfxGroup.position.set(0, 0.72, -0.54);
  fireBreathVfxGroup.visible = false;
  visualHolder.add(fireBreathVfxGroup);

  const fireChargeOrb = new THREE.Group();
  const fireBlastStream = new THREE.Group();
  fireChargeOrb.scale.setScalar(0.0001);
  fireBlastStream.scale.setScalar(0.0001);
  const fireEmberMeshes: THREE.Mesh[] = [];
  const firePuffMeshes: THREE.Mesh[] = [];
  const fireShockRings: THREE.Mesh[] = [];
  fireBreathVfxGroup.add(fireChargeOrb, fireBlastStream);

  // Luz pontual cinematográfica que projeta o clarão da baforada no chão e no cenário
  const firePointLight = new THREE.PointLight(0xff7700, 0, 11, 2);
  firePointLight.position.set(0, 0.1, -1.2);
  fireBreathVfxGroup.add(firePointLight);

  const setFireBreathState = (phase: CarameloFireBreathPhase, progress01: number) => {
    fireBreathPhase = phase;
    fireBreathProgress = THREE.MathUtils.clamp(progress01, 0, 1);
  };

  // O modelo nativo caramelo_diabo.glb já possui chifres e asas demoníacas esculpidos na malha 3D!

  // 3. Construção da Baforada de Fogo Cartoon Cinematográfica & Vibrante (Núcleo Branco-Quente + Laranja + Vermelho + Puffs Cartoon + Brasas)
  {
    const coreWhiteMat = new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
      transparent: true,
      opacity: 0.98,
    });
    const coreYellowMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.95,
    });
    const midOrangeMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.90,
    });
    const deepOrangeMat = new THREE.MeshBasicMaterial({
      color: 0xea580c,
      transparent: true,
      opacity: 0.86,
    });
    const outerRedMat = new THREE.MeshBasicMaterial({
      color: 0xdc2626,
      transparent: true,
      opacity: 0.82,
    });
    const emberGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
    });
    const darkCrimsonMat = new THREE.MeshBasicMaterial({
      color: 0x991b1b,
      transparent: true,
      opacity: 0.78,
    });
    materialsToDispose.push(
      coreWhiteMat,
      coreYellowMat,
      midOrangeMat,
      deepOrangeMat,
      outerRedMat,
      emberGlowMat,
      darkCrimsonMat
    );

    // Esfera de energia acumulando na boca (Fase 'charge')
    const orbCoreGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const orbOuterGeo = new THREE.SphereGeometry(0.25, 12, 12);
    const orbRingGeo = new THREE.TorusGeometry(0.28, 0.035, 8, 18);
    droneGeometriesToDispose.push(orbCoreGeo, orbOuterGeo, orbRingGeo);

    const orbCore = new THREE.Mesh(orbCoreGeo, coreWhiteMat);
    const orbOuter = new THREE.Mesh(orbOuterGeo, coreYellowMat);
    const orbRing = new THREE.Mesh(orbRingGeo, midOrangeMat);
    fireChargeOrb.add(orbCore, orbOuter, orbRing);

    // Jato de Fogo Multi-Camadas apontando para -Z (Fase 'blast' & 'dissipate')
    const innerJetGeo = new THREE.ConeGeometry(0.38, 5.0, 12, 1, false);
    innerJetGeo.rotateX(Math.PI / 2);
    innerJetGeo.translate(0, 0, -2.5);

    const midJetGeo = new THREE.ConeGeometry(0.66, 6.0, 14, 1, false);
    midJetGeo.rotateX(Math.PI / 2);
    midJetGeo.translate(0, 0, -3.0);

    const outerJetGeo = new THREE.ConeGeometry(0.92, 6.8, 14, 1, false);
    outerJetGeo.rotateX(Math.PI / 2);
    outerJetGeo.translate(0, 0, -3.4);

    const flameRingGeo = new THREE.TorusGeometry(0.48, 0.08, 8, 16);
    const emberGeo = new THREE.OctahedronGeometry(0.09, 0);
    const puffGeo = new THREE.SphereGeometry(0.22, 7, 7);
    droneGeometriesToDispose.push(innerJetGeo, midJetGeo, outerJetGeo, flameRingGeo, emberGeo, puffGeo);

    const innerJet = new THREE.Mesh(innerJetGeo, coreYellowMat);
    const midJet = new THREE.Mesh(midJetGeo, midOrangeMat);
    const outerJet = new THREE.Mesh(outerJetGeo, outerRedMat);
    fireBlastStream.add(outerJet, midJet, innerJet);

    // Anéis de choque de fogo contínuo
    for (let r = 0; r < 5; r++) {
      const fRing = new THREE.Mesh(flameRingGeo, r % 2 === 0 ? coreWhiteMat : coreYellowMat);
      fRing.position.set(0, 0, -0.9 - r * 1.15);
      fRing.scale.setScalar(0.5 + r * 0.22);
      fireBlastStream.add(fRing);
      fireShockRings.push(fRing);
    }

    // Puffs cartoon volumétricos saindo da rajada
    for (let pIdx = 0; pIdx < 16; pIdx++) {
      const puffMat =
        pIdx % 4 === 0
          ? coreWhiteMat
          : pIdx % 3 === 0
          ? coreYellowMat
          : pIdx % 2 === 0
          ? midOrangeMat
          : outerRedMat;
      const puffMesh = new THREE.Mesh(puffGeo, puffMat);
      fireBlastStream.add(puffMesh);
      firePuffMeshes.push(puffMesh);
    }

    // Fagulhas e brasas cartoon saltando para as laterais
    for (let e = 0; e < 18; e++) {
      const emb = new THREE.Mesh(
        emberGeo,
        e % 4 === 0 ? coreWhiteMat : e % 3 === 0 ? coreYellowMat : e % 2 === 0 ? emberGlowMat : darkCrimsonMat
      );
      fireBlastStream.add(emb);
      fireEmberMeshes.push(emb);
    }
  }

  // =========================================================================
  // OLHOS COM BRILHO VERMELHO ANAMÓRFICO ESTILO ANIME (CARAMELO DIABO)
  // Cravados milimetricamente nas órbitas oculares do osso Head 3D!
  // =========================================================================
  const isDiaboSpec = spec.id === 'caramelo_diabo';
  const diaboEyesGroup = new THREE.Group();
  diaboEyesGroup.name = 'CarameloDiabo_RedEyesGlow';
  diaboEyesGroup.visible = isDiaboSpec;
  visualHolder.add(diaboEyesGroup);

  const rightEyeHeadLocal = new THREE.Vector3(0.1039, 0.2859, 0.0549);
  const leftEyeHeadLocal = new THREE.Vector3(0.0621, 0.2825, -0.0695);

  const flareTexture = getAnimeRedFlareTexture();
  const flareMat = new THREE.SpriteMaterial({
    map: flareTexture,
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  materialsToDispose.push(flareMat);

  const rightEyeFlare = new THREE.Sprite(flareMat);
  rightEyeFlare.scale.set(0.34, 0.17, 1.0);
  const leftEyeFlare = new THREE.Sprite(flareMat);
  leftEyeFlare.scale.set(0.34, 0.17, 1.0);
  diaboEyesGroup.add(rightEyeFlare, leftEyeFlare);

  const corneaGeo = new THREE.SphereGeometry(0.022, 10, 8);
  const pupilDotGeo = new THREE.SphereGeometry(0.010, 8, 6);
  droneGeometriesToDispose.push(corneaGeo, pupilDotGeo);
  const corneaMat = new THREE.MeshBasicMaterial({ color: 0xff0522 });
  const corneaWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  materialsToDispose.push(corneaMat, corneaWhiteMat);

  const rightEyeMesh = new THREE.Mesh(corneaGeo, corneaMat);
  const rightPupilMesh = new THREE.Mesh(pupilDotGeo, corneaWhiteMat);
  rightPupilMesh.position.z = -0.013;
  rightEyeMesh.add(rightPupilMesh);

  const leftEyeMesh = new THREE.Mesh(corneaGeo, corneaMat);
  const leftPupilMesh = new THREE.Mesh(pupilDotGeo, corneaWhiteMat);
  leftPupilMesh.position.z = -0.013;
  leftEyeMesh.add(leftPupilMesh);

  diaboEyesGroup.add(rightEyeMesh, leftEyeMesh);

  const diaboEyesPointLight = new THREE.PointLight(0xff1500, isDiaboSpec ? 1.4 : 0, 3.2, 2);
  diaboEyesPointLight.position.set(0, 0.74, -0.56);
  diaboEyesGroup.add(diaboEyesPointLight);

  // =========================================================================
  // FAGULHAS / PARTÍCULAS DE FOGO SAINDO DAS 4 PATAS (SEM MALHA DE FOGO SÓLIDA)
  // Conforme solicitado: malhas de fogo removidas da pata, mantendo
  // exclusivamente partículas e fagulhas de fogo incandescentes saindo no ar!
  // =========================================================================
  const diaboPawPositions: THREE.Vector3[] = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];

  interface DiaboPawEmberParticle {
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    life: number;
    maxLife: number;
    baseScale: number;
    pawIdx: number;
  }
  const diaboPawEmbers: DiaboPawEmberParticle[] = [];
  const pawEmberGeo = new THREE.OctahedronGeometry(0.016, 0);
  droneGeometriesToDispose.push(pawEmberGeo);

  const emberYellowMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const emberOrangeMat = new THREE.MeshBasicMaterial({
    color: 0xfb923c,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const emberRedMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materialsToDispose.push(emberYellowMat, emberOrangeMat, emberRedMat);

  interface DiaboWingEmberParticle {
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    life: number;
    maxLife: number;
    baseScale: number;
    side: -1 | 1;
  }
  const diaboWingEmbers: DiaboWingEmberParticle[] = [];

  if (isDiaboSpec) {
    for (let pIdx = 0; pIdx < pawSensors.length; pIdx++) {
      // 10 partículas de faíscas/fagulhas incandescentes por pata (40 no total)
      for (let ep = 0; ep < 10; ep++) {
        const eMat = ep % 3 === 0 ? emberYellowMat : ep % 2 === 0 ? emberOrangeMat : emberRedMat;
        const eMesh = new THREE.Mesh(pawEmberGeo, eMat);
        visualHolder.add(eMesh);
        diaboPawEmbers.push({
          mesh: eMesh,
          pos: new THREE.Vector3(0, -10, 0),
          vel: new THREE.Vector3(0, 0, 0),
          life: 1.0,
          maxLife: 0.35 + (ep / 10) * 0.35,
          baseScale: 0.75 + Math.random() * 0.5,
          pawIdx: pIdx,
        });
      }
    }

    // Partículas e Fagulhas Místicas nas Asas do Caramelo Diabo (Efeito Cinematográfico!)
    for (let wep = 0; wep < 28; wep++) {
      const side = wep % 2 === 0 ? 1 : -1;
      const wMat = wep % 3 === 0 ? emberYellowMat : wep % 2 === 0 ? emberOrangeMat : emberRedMat;
      const wMesh = new THREE.Mesh(pawEmberGeo, wMat);
      visualHolder.add(wMesh);
      diaboWingEmbers.push({
        mesh: wMesh,
        pos: new THREE.Vector3(0, -10, 0),
        vel: new THREE.Vector3(0, 0, 0),
        life: 1.0,
        maxLife: 0.40 + (wep / 28) * 0.45,
        baseScale: 0.85 + Math.random() * 0.55,
        side,
      });
    }
  }

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

    // Animação calculada das Asas do Caramelo Diabo (bate para cima e para baixo suave e fluido sem tocar o dorso)
    if (spec.id === 'caramelo_diabo') {
      const flapSpeed = activeSpeed > 0.25 ? (7.8 + activeSpeed * 0.24) : 4.6;
      wingFlapClock = (wingFlapClock + clampedDt * flapSpeed) % 628.3185;
      // Curva com harmônico secundário suave para dar sensação aerodinâmica de pena e membrana
      const primaryFlap = Math.sin(wingFlapClock) * 0.38;
      const harmonicFlap = Math.sin(wingFlapClock * 2.0 - 0.4) * 0.05;
      diaboWingUniforms.uWingFlapAngle.value = primaryFlap + harmonicFlap;

      // 1. Olhos com fixação milimétrica nas órbitas do osso Head
      if (headRig && headRig.bone) {
        headRig.bone.updateMatrixWorld(true);

        _tempEyePos.copy(rightEyeHeadLocal).applyMatrix4(headRig.bone.matrixWorld);
        visualHolder.worldToLocal(_tempEyePos);
        rightEyeFlare.position.copy(_tempEyePos);
        rightEyeMesh.position.copy(_tempEyePos);

        _tempEyePos.copy(leftEyeHeadLocal).applyMatrix4(headRig.bone.matrixWorld);
        visualHolder.worldToLocal(_tempEyePos);
        leftEyeFlare.position.copy(_tempEyePos);
        leftEyeMesh.position.copy(_tempEyePos);

        const eyeFlicker = 1.0 + Math.sin(idleClock * 22.0) * 0.14 + Math.cos(idleClock * 37.0) * 0.08;
        const flareScaleX = 0.34 * eyeFlicker;
        const flareScaleY = 0.17 * eyeFlicker;
        rightEyeFlare.scale.set(flareScaleX, flareScaleY, 1.0);
        leftEyeFlare.scale.set(flareScaleX, flareScaleY, 1.0);

        diaboEyesPointLight.position.set(0, _tempEyePos.y, _tempEyePos.z - 0.06);
        diaboEyesPointLight.intensity = (1.3 + Math.sin(idleClock * 16.0) * 0.3) * eyeFlicker;
      }

      // 2. Rastreia as posições mundiais das 4 patas para emissão das partículas de fogo
      for (let p = 0; p < pawSensors.length && p < diaboPawPositions.length; p++) {
        pawSensors[p].node.getWorldPosition(_pawWorldVec);
        visualHolder.worldToLocal(_pawWorldVec);
        diaboPawPositions[p].copy(_pawWorldVec);
      }

      // 3. Sistema de Faíscas/Fagulhas de Fogo saindo das 4 patas e voando para trás no ar
      for (let ep = 0; ep < diaboPawEmbers.length; ep++) {
        const ember = diaboPawEmbers[ep];
        ember.life += clampedDt;
        if (ember.life >= ember.maxLife) {
          ember.life = 0;
          const pawPos = diaboPawPositions[ember.pawIdx];
          if (pawPos) {
            ember.pos.copy(pawPos);
            ember.pos.x += (Math.random() - 0.5) * 0.035;
            ember.pos.y += 0.01 + Math.random() * 0.03;
            ember.pos.z += (Math.random() - 0.5) * 0.035;

            // Soprado para trás (+Z) pelo vento da corrida e subindo no ar (+Y)
            ember.vel.set(
              (Math.random() - 0.5) * 0.35,
              0.40 + Math.random() * 0.75,
              1.3 + Math.random() * 2.0 + activeSpeed * 0.15
            );
          }
        } else {
          ember.pos.x += ember.vel.x * clampedDt;
          ember.pos.y += ember.vel.y * clampedDt;
          ember.pos.z += ember.vel.z * clampedDt;
          ember.vel.y += 0.4 * clampedDt;
        }

        ember.mesh.position.copy(ember.pos);
        const lifeNorm = ember.life / ember.maxLife;
        const s = ember.baseScale * (1.0 - lifeNorm);
        ember.mesh.scale.setScalar(Math.max(0.001, s));
        (ember.mesh.material as THREE.Material).opacity = Math.max(0, 1.0 - lifeNorm * lifeNorm);
      }

      // 4. Sistema de Faíscas/Fagulhas Místicas saindo das Asas (Cinematográfico!)
      const wingFlap = diaboWingUniforms.uWingFlapAngle.value;
      for (let wep = 0; wep < diaboWingEmbers.length; wep++) {
        const wEmber = diaboWingEmbers[wep];
        wEmber.life += clampedDt;
        if (wEmber.life >= wEmber.maxLife) {
          wEmber.life = 0;
          const sideX = wEmber.side;
          const spanT = 0.22 + Math.random() * 0.14;
          wEmber.pos.set(
            sideX * spanT,
            0.64 + wingFlap * 0.28 * (spanT / 0.36) + (Math.random() - 0.5) * 0.04,
            0.36 + (Math.random() - 0.5) * 0.08
          );
          wEmber.vel.set(
            sideX * (0.2 + Math.random() * 0.35),
            0.45 + Math.random() * 0.65,
            1.2 + Math.random() * 1.6 + activeSpeed * 0.16
          );
        } else {
          wEmber.pos.x += wEmber.vel.x * clampedDt;
          wEmber.pos.y += wEmber.vel.y * clampedDt;
          wEmber.pos.z += wEmber.vel.z * clampedDt;
          wEmber.vel.y += 0.35 * clampedDt;
        }

        wEmber.mesh.position.copy(wEmber.pos);
        const wLifeNorm = wEmber.life / wEmber.maxLife;
        const ws = wEmber.baseScale * (1.0 - wLifeNorm);
        wEmber.mesh.scale.setScalar(Math.max(0.001, ws));
        (wEmber.mesh.material as THREE.Material).opacity = Math.max(0, 1.0 - wLifeNorm * wLifeNorm);
      }
    }

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
    // + Avanço predador da cabeça na Preparação (smoothBitePrep) + Variações de Ataque ("NHAC!", Giro Chicote e Bote Alfa!)
    const totalTorsoPitch = hipsPitch + spineFlex + chestFlex;
    const gallopNod = Math.sin(twoPiU - 0.4) * 0.042 * runBlend + idleBreath * 0.8;
    const turnLookYaw = THREE.MathUtils.clamp(-steerLean * 0.16, -0.24, 0.24);
    const chompDuration = activeAttackVariant === 'alpha_pounce' ? 0.64 : 0.56;
    const chompNorm = biteChompTimer > 0 ? biteChompTimer / chompDuration : 0;
    const chompProgress = biteChompTimer > 0 ? 1.0 - chompNorm : 0;
    const chompSnap =
      chompNorm > 0 ? Math.sin(chompNorm * Math.PI * 4.0) * 0.36 * chompNorm : 0;
    const prepHeadReach = smoothBitePrep * 0.22;

    // Variação de rotação lateral da cabeça/pescoço conforme o estilo do ataque
    const attackHeadYaw =
      chompNorm > 0
        ? activeAttackVariant === 'spin_whip'
          ? Math.sin(chompProgress * Math.PI * 2.0) * 0.36
          : activeAttackVariant === 'alpha_pounce'
          ? Math.sin(chompProgress * Math.PI * 4.0) * 0.18
          : Math.sin(chompNorm * Math.PI * 6.0) * 0.14 * chompNorm
        : 0;

    // No Bote Alfa ('alpha_pounce'), as patas dianteiras também dão uma patada dupla expressiva no ar
    if (chompNorm > 0 && activeAttackVariant === 'alpha_pounce') {
      const swipeWave = Math.sin(chompProgress * Math.PI);
      applySagittalBonePose(flArm, flA * groundRunWeight + swipeWave * 0.48);
      applySagittalBonePose(frArm, frA * groundRunWeight + swipeWave * 0.48);
    }

    applySagittalBonePose(
      neckRig,
      -totalTorsoPitch * 0.62 + gallopNod * 0.6 + prepHeadReach * 0.85 + chompSnap * 0.68,
      turnLookYaw * 0.45 + attackHeadYaw * 0.55
    );
    applySagittalBonePose(
      headRig,
      -totalTorsoPitch * 0.38 + gallopNod * 0.5 + prepHeadReach * 0.95 + chompSnap * 1.18,
      turnLookYaw * 0.55 + attackHeadYaw
    );

    // Cauda fluida acompanhando a onda da coluna + tensão alerta na preparação + chicoteada no ataque!
    const tailAttackWhip =
      chompNorm > 0 && activeAttackVariant === 'spin_whip'
        ? Math.sin(chompProgress * Math.PI * 3.0) * 0.52
        : 0;
    const tailPitch =
      Math.sin(twoPiU - 1.1) * 0.22 * runBlend +
      Math.sin(idleClock * 3.0) * 0.06 * (1 - runBlend) -
      smoothBitePrep * 0.14 +
      chompNorm * 0.18;
    const tailWag =
      Math.sin(twoPiU * 2.0) * 0.13 * runBlend +
      Math.sin(idleClock * 5.2) * 0.16 * (1 - runBlend) +
      Math.sin(idleClock * 16.0) * 0.09 * smoothBitePrep +
      tailAttackWhip;
    applySagittalBonePose(tailRig, tailPitch, tailWag);
    applySagittalBonePose(
      tail1Rig,
      Math.sin(twoPiU - 1.75) * 0.20 * runBlend,
      tailWag * 0.85
    );

    // 3. Oscilação vertical da pelve calibrada para manter contato firme das patas com o solo!
    const pelvisOscY =
      (-Math.cos(twoPiU - 0.3) * 0.018 + Math.sin(twoPiU * 2.0 - 0.5) * 0.006 - 0.012) *
      runBlend *
      (1.0 - airBlend);
    const prepCrouchOffset = -0.046 * smoothBitePrep;
    const attackHopY =
      chompNorm > 0
        ? activeAttackVariant === 'alpha_pounce'
          ? Math.sin(chompProgress * Math.PI) * 0.12
          : Math.sin(chompProgress * Math.PI) * 0.05
        : 0;
    orientationPivot.position.y = basePivotY + pelvisOscY + prepCrouchOffset + attackHopY;

    // 4. Inclinação orgânica ao trocar entre as 3 faixas, preparação de bote, pulo, rasteira, DENTES SE FECHANDO e DERROTA CÔMICA!
    if (biteChompTimer > 0) {
      biteTeethVfxGroup.visible = true;
      const p = chompProgress;
      // Abre amplamente na antecipação e fecha com estalo firme ("NHAC!") duas vezes!
      const snapFreq = activeAttackVariant === 'alpha_pounce' ? 3.5 : 2.5;
      const snapWave = Math.abs(Math.cos(p * Math.PI * snapFreq));
      const jawOpenAngle = snapWave * 0.66 * (1.0 - p * 0.32);
      upperJawPivot.position.y = 0.04 + jawOpenAngle * 0.12;
      upperJawPivot.rotation.x = -jawOpenAngle;
      lowerJawPivot.position.y = -0.04 - jawOpenAngle * 0.12;
      lowerJawPivot.rotation.x = jawOpenAngle;

      const variantBoost =
        activeAttackVariant === 'alpha_pounce'
          ? 1.36
          : activeAttackVariant === 'spin_whip'
          ? 1.24
          : 1.18;
      const popScale = p < 0.14 ? p / 0.14 : p > 0.82 ? Math.max(0.01, (1.0 - p) / 0.18) : 1.08;
      biteTeethVfxGroup.scale.setScalar(popScale * variantBoost);
      biteTeethVfxGroup.rotation.z =
        activeAttackVariant === 'spin_whip' ? Math.sin(p * Math.PI * 2.0) * 0.28 : 0;
      const isClampedShut = jawOpenAngle < 0.16;
      snapFlashStar.visible = isClampedShut;
      if (isClampedShut) {
        snapFlashStar.rotation.z += clampedDt * 22.0;
        snapFlashStar.scale.setScalar((0.98 + Math.sin(p * 32.0) * 0.38) * (variantBoost * 0.9));
      }
    } else {
      biteTeethVfxGroup.visible = false;
      biteTeethVfxGroup.rotation.z = 0;
    }

    const spinWhipYaw =
      chompNorm > 0 && activeAttackVariant === 'spin_whip'
        ? Math.sin(chompProgress * Math.PI * 2.0) * 0.42
        : 0;
    const spinWhipRoll =
      chompNorm > 0 && activeAttackVariant === 'spin_whip'
        ? Math.sin(chompProgress * Math.PI * 2.0) * 0.18
        : 0;

    const targetRoll =
      defeatPoseFactor > 0.01
        ? THREE.MathUtils.lerp(-steerLean * 0.19, Math.PI * 0.82, defeatPoseFactor)
        : -steerLean * 0.19 + spinWhipRoll;
    const targetYaw =
      defeatPoseFactor > 0.01
        ? Math.sin(idleClock * 6.0) * 0.18 * defeatPoseFactor
        : -steerLean * 0.13 + spinWhipYaw;
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

    const smoothK = 1 - Math.exp(-10.5 * clampedDt);
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

    // 5. Contato Realista de Solo: garante que a pata de apoio encoste firmemente no chão a cada passada sem flutuar e sem atravessar o asfalto!
    if (pawSensors.length > 0 && jumpY <= 0.02 && !isRolling && defeatPoseFactor <= 0.01) {
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
      } else if (minPawMargin < 0.085 && attackHopY <= 0.01) {
        // Assenta a pata mais baixa diretamente no solo durante a fase de apoio e impulsão
        orientationPivot.position.y -= Math.min(0.055, minPawMargin * 0.92);
      }
    }

    // 6. Item 2: Movimentação Orgânica, Livre e Independente dos Drones do Cachorrinho (Zero GC)
    // Circulam ao redor do personagem com variações reais de altura, distância, inclinação e correções de trajetória!
    if (cyberDrones.length > 0) {
      for (let i = 0; i < cyberDrones.length; i++) {
        const d = cyberDrones[i];
        d.orbitAngle = (d.orbitAngle + clampedDt * d.orbitSpeed) % (Math.PI * 2);
        d.wanderTimer -= clampedDt;
        if (d.wanderTimer <= 0) {
          // Pequenas correções autônomas de trajetória a cada 0.65..1.45s (dessincronizadas entre os drones)
          d.wanderTimer = 0.65 + Math.random() * 0.8;
          d.wanderX = (Math.random() - 0.5) * 0.28;
          d.wanderY = (Math.random() - 0.5) * 0.18;
          d.wanderZ = (Math.random() - 0.5) * 0.26;
        }

        const tA = idleClock * d.freqA + d.phase;
        const tB = idleClock * d.freqB + d.phase * 1.7;
        const tC = idleClock * d.freqC + i * 2.4;

        // Órbita elíptica suave circulando pelas laterais/arredores do cachorro, mantendo zona de exclusão central
        let desiredX =
          d.baseX * 0.55 +
          Math.cos(d.orbitAngle) * d.radiusX +
          Math.sin(tA) * 0.16 +
          d.wanderX -
          steerLean * 0.12;
        let desiredZ =
          d.baseZ * 0.5 +
          Math.sin(d.orbitAngle) * d.radiusZ +
          Math.cos(tB) * 0.14 +
          d.wanderZ;
        // Garante que nunca fiquem diretamente em cima da cabeça/dorso do cachorro
        const radialDist = Math.hypot(desiredX, desiredZ);
        const minSafeDist = 0.42;
        if (radialDist < minSafeDist) {
          const pushSign = i === 0 ? -1 : 1;
          const ang = radialDist > 0.01 ? Math.atan2(desiredZ, desiredX) : pushSign * 0.4;
          desiredX = Math.cos(ang) * minSafeDist;
          desiredZ = Math.sin(ang) * minSafeDist;
        }

        const desiredY =
          d.baseY +
          Math.sin(tA * 1.15) * 0.11 +
          Math.cos(tC) * 0.065 +
          d.wanderY +
          jumpY * 0.72;

        // Física de mola-amortecedor independente por drone para curvas orgânicas e desaceleração natural
        const stiffness = 11.5 + i * 2.2;
        const damping = 4.6 + i * 0.5;
        const ax = (desiredX - d.curX) * stiffness - d.vx * damping;
        const ay = (desiredY - d.curY) * stiffness - d.vy * damping;
        const az = (desiredZ - d.curZ) * stiffness - d.vz * damping;

        d.vx += ax * clampedDt;
        d.vy += ay * clampedDt;
        d.vz += az * clampedDt;

        d.curX += d.vx * clampedDt;
        d.curY += d.vy * clampedDt;
        d.curZ += d.vz * clampedDt;

        d.group.position.set(d.curX, d.curY, d.curZ);

        // Inclinação física reagindo à velocidade/aceleração do próprio drone + varredura do olhar
        const targetBankRoll = THREE.MathUtils.clamp(-d.vx * 0.48 - ax * 0.04, -0.45, 0.45);
        const targetPitchTilt = THREE.MathUtils.clamp(
          (isRunning ? -0.12 : -0.02) + d.vz * 0.35 + az * 0.03,
          -0.42,
          0.32
        );
        const targetScanYaw = THREE.MathUtils.clamp(
          -d.vx * 0.42 + Math.sin(tC * 0.85) * 0.26 - steerLean * 0.15,
          -0.65,
          0.65
        );

        const rotLerp = Math.min(1, clampedDt * 9.5);
        d.group.rotation.z = THREE.MathUtils.lerp(d.group.rotation.z, targetBankRoll, rotLerp);
        d.group.rotation.x = THREE.MathUtils.lerp(d.group.rotation.x, targetPitchTilt, rotLerp);
        d.group.rotation.y = THREE.MathUtils.lerp(d.group.rotation.y, targetScanYaw, rotLerp);

        const haloPulse = 0.86 + Math.sin(idleClock * (6.8 + i * 1.4) + d.phase) * 0.16;
        d.eyeHalo.scale.setScalar(haloPulse);

        const rotorSpeed = 36.0 + Math.hypot(d.vx, d.vy, d.vz) * 14.0;
        for (let r = 0; r < d.rotors.length; r++) {
          d.rotors[r].rotation.y = (d.rotors[r].rotation.y + clampedDt * rotorSpeed) % (Math.PI * 2);
        }
      }
    }

    // 7. Animação da Baforada de Fogo do Caramelo Diabo (Cinematográfica, Dinâmica com Puffs Cartoon & Fagulhas)!
    if (fireBreathPhase !== 'idle') {
      fireBreathVfxGroup.visible = true;
      const p = fireBreathProgress;
      const flicker = 1.0 + Math.sin(idleClock * 42.0) * 0.14 + Math.cos(idleClock * 29.0) * 0.08;
      if (fireBreathPhase === 'charge') {
        fireChargeOrb.visible = true;
        fireBlastStream.visible = false;
        const orbScale = Math.max(0.15, p * 1.45 * flicker);
        fireChargeOrb.scale.setScalar(orbScale);
        fireChargeOrb.rotation.z = idleClock * 16.0;
        fireChargeOrb.rotation.y = idleClock * 11.0;
        firePointLight.intensity = p * 2.4;
        firePointLight.color.setHex(0xff5500);

        // Prepara a mandíbula abrindo aos poucos para a baforada
        lowerJawPivot.rotation.x = THREE.MathUtils.lerp(0, -0.32, p);
        upperJawPivot.rotation.x = THREE.MathUtils.lerp(0, 0.12, p);
      } else if (fireBreathPhase === 'blast') {
        fireChargeOrb.visible = true;
        fireChargeOrb.scale.setScalar(1.22 * flicker);
        fireChargeOrb.rotation.z = idleClock * 22.0;
        fireBlastStream.visible = true;

        // Tremor orgânico de recuo de disparo na mandíbula aberta
        const jawShake = Math.sin(idleClock * 44.0) * 0.06;
        lowerJawPivot.rotation.x = -0.54 + jawShake;
        upperJawPivot.rotation.x = 0.18 - jawShake * 0.5;

        // Clarão da luz dinâmica pulsando com o fogo
        firePointLight.intensity = (4.4 + Math.sin(idleClock * 38.0) * 1.5) * flicker;
        firePointLight.color.setHex(0xffaa22);

        const reachZ = THREE.MathUtils.clamp(p * 4.2, 0.28, 1.25) * flicker;
        const widthXY = (0.94 + Math.sin(idleClock * 32.0) * 0.18) * Math.min(1.0, p * 4.6);
        fireBlastStream.scale.set(widthXY, widthXY, reachZ);
        fireBlastStream.rotation.z = Math.sin(idleClock * 18.0) * 0.18;

        // Anéis de choque de fogo avançando em ondas contínuas de sopro
        for (let r = 0; r < fireShockRings.length; r++) {
          const fRing = fireShockRings[r];
          const ringCycle = (idleClock * 5.5 + r * 0.22) % 1.0;
          fRing.position.z = -0.5 - ringCycle * 5.8;
          fRing.scale.setScalar((0.42 + ringCycle * 1.45) * flicker);
          fRing.rotation.z = idleClock * 8.0 + r * 1.2;
        }

        // Puffs cartoon volumétricos saindo da boca e avançando na rajada
        for (let pIdx = 0; pIdx < firePuffMeshes.length; pIdx++) {
          const puff = firePuffMeshes[pIdx];
          const cycle = (idleClock * (3.8 + (pIdx % 5) * 0.7) + pIdx * 0.19) % 1.0;
          const distZ = -0.3 - cycle * 6.2;
          const swirlX = Math.sin(cycle * 13.0 + pIdx * 1.5) * (0.10 + cycle * 0.65);
          const swirlY = Math.cos(cycle * 11.0 + pIdx * 1.3) * (0.08 + cycle * 0.42) + cycle * 0.36; // Sobe levemente pelo calor
          puff.position.set(swirlX, swirlY, distZ);
          puff.rotation.set(idleClock * 10, idleClock * 14, cycle * 6);
          const puffScale = (cycle < 0.2 ? cycle / 0.2 : 1.0 - (cycle - 0.2) / 0.8) * 1.35 * flicker;
          puff.scale.setScalar(Math.max(0.08, puffScale));
        }

        // Fagulhas e brasas cartoon saltando para as laterais
        for (let e = 0; e < fireEmberMeshes.length; e++) {
          const emb = fireEmberMeshes[e];
          const cycle = (idleClock * (4.2 + (e % 4) * 0.8) + e * 0.24) % 1.0;
          const distZ = -0.4 - cycle * 6.5;
          const swirlAng = cycle * 12.0 + e * 1.5;
          const radius = (0.16 + cycle * 1.05) * (e % 2 === 0 ? 1 : -1);
          emb.position.set(
            Math.cos(swirlAng) * radius,
            Math.sin(swirlAng) * Math.abs(radius) + cycle * 0.52,
            distZ
          );
          emb.rotation.set(idleClock * 15, idleClock * 18, cycle * 10);
          emb.scale.setScalar(Math.max(0.12, (1.0 - cycle * 0.8) * 1.35));
        }
      } else if (fireBreathPhase === 'dissipate') {
        fireChargeOrb.visible = false;
        fireBlastStream.visible = true;
        const fade = Math.max(0.01, 1.0 - p);
        fireBlastStream.scale.set(fade * 0.95, fade * 0.95, (0.65 + p * 0.45) * fade);
        fireBlastStream.rotation.z = Math.sin(idleClock * 14.0) * 0.22;
        firePointLight.intensity = THREE.MathUtils.lerp(3.5, 0, p);

        // Boca fechando gradualmente ao cessar a baforada
        lowerJawPivot.rotation.x = THREE.MathUtils.lerp(-0.54, 0, p);
        upperJawPivot.rotation.x = THREE.MathUtils.lerp(0.18, 0, p);
      }
    } else {
      fireBreathVfxGroup.visible = false;
      firePointLight.intensity = 0;
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
    setFireBreathState,
    setDefeatPose,
    update,
    dispose,
  };
}
