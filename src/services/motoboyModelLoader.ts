import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export type MotoboyCharacterId =
  | 'motoboy_1'
  | 'motoboy_2'
  | 'motoboy_3'
  | 'motoboy_4'
  | 'motoboy_5';

export interface MotoboySpec {
  id: MotoboyCharacterId;
  name: string;
  nickname: string;
  badge: string;
  fbxPath: string;
  price: number;
  rarity: 'Comum' | 'Especial' | 'Lendária' | 'Mítica';
  primaryColor: string;
  accentColor: string;
  riderTintHex: number;
  grauBonusPct: number;
  agilityPct: number;
  stylePct: number;
  description: string;
}

export const MOTOBOYS_CATALOG: MotoboySpec[] = [
  {
    id: 'motoboy_1',
    name: 'Piloto Clássico',
    nickname: 'Cria da Entrega',
    badge: 'CLÁSSICO',
    fbxPath: '/assets/motoboys/motoboy_breathing.fbx',
    price: 0,
    rarity: 'Comum',
    primaryColor: '#2563eb',
    accentColor: '#60a5fa',
    riderTintHex: 0xffffff,
    grauBonusPct: 90,
    agilityPct: 94,
    stylePct: 91,
    description: 'Postura firme e ágil para cortar o trânsito pesado da Vila Tropical.',
  },
  {
    id: 'motoboy_2',
    name: 'Piloto Alto Astral',
    nickname: 'Rei do Grau',
    badge: 'ALTO ASTRAL',
    fbxPath: '/assets/motoboys/motoboy_happy.fbx',
    price: 35000,
    rarity: 'Especial',
    primaryColor: '#f59e0b',
    accentColor: '#fde047',
    riderTintHex: 0xffffff,
    grauBonusPct: 98,
    agilityPct: 92,
    stylePct: 96,
    description: 'Puxa grau sorrindo na avenida enquanto coleta todas as notas da pista.',
  },
  {
    id: 'motoboy_3',
    name: 'Piloto Tático',
    nickname: 'Mestre do Corredor',
    badge: 'TÁTICO',
    fbxPath: '/assets/motoboys/motoboy_holding.fbx',
    price: 75000,
    rarity: 'Especial',
    primaryColor: '#10b981',
    accentColor: '#34d399',
    riderTintHex: 0xffffff,
    grauBonusPct: 93,
    agilityPct: 97,
    stylePct: 92,
    description: 'Reflexo cirúrgico nas curvas fechadas e desvios de última hora.',
  },
  {
    id: 'motoboy_4',
    name: 'Guerreiro Urbano',
    nickname: 'Brabo do Asfalto',
    badge: 'GUERREIRO',
    fbxPath: '/assets/motoboys/motoboy_warrior.fbx',
    price: 115000,
    rarity: 'Lendária',
    primaryColor: '#ef4444',
    accentColor: '#f87171',
    riderTintHex: 0xffffff,
    grauBonusPct: 96,
    agilityPct: 95,
    stylePct: 98,
    description: 'Presença imponente acelerando forte contra qualquer desafio na pista.',
  },
  {
    id: 'motoboy_5',
    name: 'Alienígena da Quebrada',
    nickname: 'ET do Grau',
    badge: 'ALIENÍGENA',
    fbxPath: '/assets/motoboys/motoboy_orc.fbx',
    price: 150000,
    rarity: 'Mítica',
    primaryColor: '#10b981',
    accentColor: '#fde047',
    riderTintHex: 0xffffff,
    grauBonusPct: 99,
    agilityPct: 96,
    stylePct: 100,
    description: 'Piloto intergaláctico com patch do Brasil na camiseta e mini OVNI escoltando na quebrada!',
  },
];

const SAVED_MOTOBOY_KEY = 'caramelo_equipped_motoboy_v1';
const UNLOCKED_MOTOBOYS_KEY = 'caramelo_unlocked_motoboys_v1';

export function getMotoboySpecById(id?: string): MotoboySpec {
  return MOTOBOYS_CATALOG.find((m) => m.id === id) || MOTOBOYS_CATALOG[0];
}

export function getSavedMotoboyId(): MotoboyCharacterId {
  try {
    const v = localStorage.getItem(SAVED_MOTOBOY_KEY);
    if (
      v === 'motoboy_1' ||
      v === 'motoboy_2' ||
      v === 'motoboy_3' ||
      v === 'motoboy_4' ||
      v === 'motoboy_5'
    ) {
      return v;
    }
  } catch {}
  return 'motoboy_1';
}

export function saveMotoboyId(id: MotoboyCharacterId): void {
  try {
    localStorage.setItem(SAVED_MOTOBOY_KEY, id);
  } catch {}
}

export function getUnlockedMotoboyIds(): MotoboyCharacterId[] {
  try {
    const raw = localStorage.getItem(UNLOCKED_MOTOBOYS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set(['motoboy_1', ...parsed])) as MotoboyCharacterId[];
      }
    }
  } catch {}
  return ['motoboy_1'];
}

export function saveUnlockedMotoboyIds(ids: MotoboyCharacterId[]): void {
  try {
    localStorage.setItem(
      UNLOCKED_MOTOBOYS_KEY,
      JSON.stringify(Array.from(new Set(['motoboy_1', ...ids])))
    );
  } catch {}
}

export interface MotoboyInstance {
  id: MotoboyCharacterId;
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  setFocusState: (isSelected: boolean, dt: number) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

export interface SeatedMotoboyRiderInstance {
  id: MotoboyCharacterId;
  root: THREE.Group;
  setDamageFlash: (intensity: number) => void;
  setThermalVision: (intensity: number) => void;
  triggerBiteSquash: (strength?: number) => void;
  triggerCashColorFlash: (hexColor: number, intensity?: number) => void;
  setPizzaAiming: (active: boolean, side?: -1 | 1) => void;
  triggerPizzaThrow: (side: -1 | 1) => void;
  setKnockoutBackFall: (factor01: number) => void;
  update: (
    dt: number,
    steerLean: number,
    pitchAngle: number,
    leftGripWorld?: THREE.Vector3,
    rightGripWorld?: THREE.Vector3
  ) => void;
  dispose: () => void;
}

// Objetos scratch pré-alocados para IK Analítico 2-Ossos em Espaço de Mundo (Zero GC por frame!)
const _ikSPos = new THREE.Vector3();
const _ikEPos = new THREE.Vector3();
const _ikWPos = new THREE.Vector3();
const _ikFPos = new THREE.Vector3();
const _ikToTarget = new THREE.Vector3();
const _ikCurSeg = new THREE.Vector3();
const _ikDesSeg = new THREE.Vector3();
const _ikUDir = new THREE.Vector3();
const _ikVDir = new THREE.Vector3();
const _ikPoleWorld = new THREE.Vector3();
const _ikElbowTarget = new THREE.Vector3();
const _ikGripDirWorld = new THREE.Vector3();
const _ikQParent = new THREE.Quaternion();
const _ikQBone = new THREE.Quaternion();
const _ikQDelta = new THREE.Quaternion();
const _ikRootWorldQuat = new THREE.Quaternion();
const _tmpAxis = new THREE.Vector3();
const _focusedColor = new THREE.Color(0xffffff);
const _defocusedColor = new THREE.Color(0xa68a79);

function solveTwoBoneArmIK(
  shoulder: THREE.Object3D | null,
  elbow: THREE.Object3D | null,
  wrist: THREE.Object3D | null,
  fingerBase: THREE.Object3D | null,
  targetWorld: THREE.Vector3,
  riderRootWorldQuat: THREE.Quaternion,
  isLeft: boolean
): void {
  if (!shoulder || !elbow || !wrist) return;

  shoulder.updateMatrixWorld(true);
  _ikSPos.setFromMatrixPosition(shoulder.matrixWorld);
  _ikEPos.setFromMatrixPosition(elbow.matrixWorld);
  _ikWPos.setFromMatrixPosition(wrist.matrixWorld);

  const l1 = _ikSPos.distanceTo(_ikEPos);
  const l2 = _ikEPos.distanceTo(_ikWPos);
  if (l1 < 0.005 || l2 < 0.005) return;

  _ikToTarget.subVectors(targetWorld, _ikSPos);
  const rawDist = _ikToTarget.length();
  if (rawDist < 0.001) return;

  const minReach = Math.abs(l1 - l2) + 0.012;
  const maxReach = (l1 + l2) * 0.992;
  const d = THREE.MathUtils.clamp(rawDist, minReach, maxReach);

  // Lei dos cossenos para flexão anatômica natural do cotovelo
  const cosAlpha = THREE.MathUtils.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const sinAlpha = Math.sqrt(Math.max(0, 1 - cosAlpha * cosAlpha));

  _ikUDir.copy(_ikToTarget).divideScalar(rawDist);

  // Vetor guia do cotovelo (para baixo, levemente aberto para fora e para trás — postura real de motoboy)
  _ikPoleWorld
    .set(isLeft ? -0.58 : 0.58, -0.78, 0.36)
    .applyQuaternion(riderRootWorldQuat)
    .normalize();

  _ikVDir.copy(_ikPoleWorld).addScaledVector(_ikUDir, -_ikPoleWorld.dot(_ikUDir));
  if (_ikVDir.lengthSq() < 1e-5) {
    _ikVDir.set(isLeft ? -1 : 1, -1, 0).addScaledVector(_ikUDir, -_ikUDir.y);
  }
  _ikVDir.normalize();

  _ikElbowTarget
    .copy(_ikSPos)
    .addScaledVector(_ikUDir, l1 * cosAlpha)
    .addScaledVector(_ikVDir, l1 * sinAlpha);

  // 1. Rotaciona o ombro para apontar o cotovelo na direção exata calculada
  _ikCurSeg.subVectors(_ikEPos, _ikSPos);
  _ikDesSeg.subVectors(_ikElbowTarget, _ikSPos);
  if (_ikCurSeg.lengthSq() > 1e-6 && _ikDesSeg.lengthSq() > 1e-6 && shoulder.parent) {
    _ikCurSeg.normalize();
    _ikDesSeg.normalize();
    _ikQDelta.setFromUnitVectors(_ikCurSeg, _ikDesSeg);
    shoulder.parent.getWorldQuaternion(_ikQParent);
    shoulder.getWorldQuaternion(_ikQBone);
    _ikQBone.premultiply(_ikQDelta);
    shoulder.quaternion.copy(_ikQParent.invert()).multiply(_ikQBone);
    shoulder.updateMatrixWorld(true);
  }

  // 2. Rotaciona o cotovelo cravando o punho (mixamorigLeftHand / RightHand) exatamente na manopla do guidão!
  _ikEPos.setFromMatrixPosition(elbow.matrixWorld);
  _ikWPos.setFromMatrixPosition(wrist.matrixWorld);
  _ikCurSeg.subVectors(_ikWPos, _ikEPos);
  _ikDesSeg.subVectors(targetWorld, _ikEPos);
  if (_ikCurSeg.lengthSq() > 1e-6 && _ikDesSeg.lengthSq() > 1e-6 && elbow.parent) {
    _ikCurSeg.normalize();
    _ikDesSeg.normalize();
    _ikQDelta.setFromUnitVectors(_ikCurSeg, _ikDesSeg);
    elbow.parent.getWorldQuaternion(_ikQParent);
    elbow.getWorldQuaternion(_ikQBone);
    _ikQBone.premultiply(_ikQDelta);
    elbow.quaternion.copy(_ikQParent.invert()).multiply(_ikQBone);
    elbow.updateMatrixWorld(true);
  }

  // 3. Alinha a palma/dedos envolvendo a manopla para frente/baixo sem torcer o pulso
  if (fingerBase && wrist.parent) {
    _ikWPos.setFromMatrixPosition(wrist.matrixWorld);
    _ikFPos.setFromMatrixPosition(fingerBase.matrixWorld);
    _ikCurSeg.subVectors(_ikFPos, _ikWPos);
    if (_ikCurSeg.lengthSq() > 1e-6) {
      _ikCurSeg.normalize();
      _ikGripDirWorld
        .set(isLeft ? -0.05 : 0.05, -0.34, -0.94)
        .applyQuaternion(riderRootWorldQuat)
        .normalize();
      _ikQDelta.setFromUnitVectors(_ikCurSeg, _ikGripDirWorld);
      wrist.parent.getWorldQuaternion(_ikQParent);
      wrist.getWorldQuaternion(_ikQBone);
      _ikQBone.premultiply(_ikQDelta);
      wrist.quaternion.copy(_ikQParent.invert()).multiply(_ikQBone);
      wrist.updateMatrixWorld(true);
    }
  }
}

function rotateBoneAroundWorldAxis(
  rootObj: THREE.Object3D,
  boneName: string,
  wx: number,
  wy: number,
  wz: number,
  angleRad: number
): THREE.Object3D | null {
  const bone = rootObj.getObjectByName(boneName);
  if (!bone || !bone.parent) return null;
  bone.parent.updateMatrixWorld(true);
  bone.parent.getWorldQuaternion(_ikQParent);
  bone.getWorldQuaternion(_ikQBone);
  _tmpAxis.set(wx, wy, wz).normalize();
  _ikQDelta.setFromAxisAngle(_tmpAxis, angleRad);
  _ikQBone.premultiply(_ikQDelta);
  bone.quaternion.copy(_ikQParent.invert()).multiply(_ikQBone);
  bone.updateMatrixWorld(true);
  return bone;
}

const fbxCache = new Map<string, THREE.Group>();
const fbxLoadingPromises = new Map<string, Promise<THREE.Group>>();
let sharedMotoboyGradientMap: THREE.DataTexture | null = null;

function getMotoboyCartoonGradientMap(): THREE.DataTexture {
  if (sharedMotoboyGradientMap) return sharedMotoboyGradientMap;

  const steps = [138, 195, 238, 255];
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
  sharedMotoboyGradientMap = tex;
  return tex;
}

function loadMotoboyFbx(fbxPath: string): Promise<THREE.Group> {
  const cached = fbxCache.get(fbxPath);
  if (cached) return Promise.resolve(cached);
  const inflight = fbxLoadingPromises.get(fbxPath);
  if (inflight) return inflight;

  const promise = new Promise<THREE.Group>((resolve, reject) => {
    const loader = new FBXLoader();
    loader.load(
      fbxPath,
      (group: THREE.Group) => {
        fbxCache.set(fbxPath, group);
        fbxLoadingPromises.delete(fbxPath);
        resolve(group);
      },
      undefined,
      (err: unknown) => {
        console.error(`[motoboyModelLoader] Erro ao carregar FBX ${fbxPath}:`, err);
        fbxLoadingPromises.delete(fbxPath);
        reject(err);
      }
    );
  });

  fbxLoadingPromises.set(fbxPath, promise);
  return promise;
}

interface RiderShaderFxUniforms {
  uDamageFlash: { value: number };
  uThermalVision: { value: number };
  uThermalTime: { value: number };
  uCashFlashIntensity: { value: number };
  uCashFlashColor: { value: THREE.Color };
}

interface GeomLegNormBounds {
  minY: number;
  spanY: number;
  centerX: number;
  halfSpanX: number;
}

function computeGeomLegBounds(geo: THREE.BufferGeometry): GeomLegNormBounds {
  if (!geo.boundingBox) geo.computeBoundingBox();
  const bb = geo.boundingBox;
  if (!bb) {
    return { minY: 0, spanY: 1.75, centerX: 0, halfSpanX: 0.45 };
  }
  const minY = bb.min.y;
  const spanY = Math.max(0.01, bb.max.y - bb.min.y);
  const centerX = (bb.min.x + bb.max.x) * 0.5;
  const halfSpanX = Math.max(0.01, (bb.max.x - bb.min.x) * 0.5);
  return { minY, spanY, centerX, halfSpanX };
}

function createCartoonOutlineMaterial(
  localExtrusion: number,
  colorHex = 0xffffff,
  bounds?: GeomLegNormBounds,
  fxUniforms?: RiderShaderFxUniforms
): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({
    color: colorHex,
    side: THREE.BackSide,
    transparent: true,
    opacity: 1.0,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const extrudeVal = localExtrusion.toFixed(5);
  mat.onBeforeCompile = (shader) => {
    if (fxUniforms && bounds) {
      shader.uniforms.uDamageFlash = fxUniforms.uDamageFlash;
      shader.uniforms.uThermalVision = fxUniforms.uThermalVision;
      shader.uniforms.uThermalTime = fxUniforms.uThermalTime;

      const minYStr = bounds.minY.toFixed(5);
      const spanYStr = bounds.spanY.toFixed(5);
      const cxStr = bounds.centerX.toFixed(5);
      const hsxStr = bounds.halfSpanX.toFixed(5);

      shader.vertexShader =
        `varying float vNormBindY;\nvarying float vNormAbsX;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vNormBindY = clamp((position.y - (${minYStr})) / (${spanYStr}), 0.0, 1.0);
          vNormAbsX = clamp(abs(position.x - (${cxStr})) / (${hsxStr}), 0.0, 2.0);
          vec3 safeN = length(normal) > 0.0001 ? normalize(normal) : vec3(0.0, 1.0, 0.0);
          float legBoost = (1.0 - smoothstep(0.45, 0.50, vNormBindY)) * uThermalVision * 0.45;
          transformed += safeN * (${extrudeVal} * (1.0 + legBoost));
          `
        );

      shader.fragmentShader =
        `uniform float uDamageFlash;\nuniform float uThermalVision;\nuniform float uThermalTime;\nvarying float vNormBindY;\nvarying float vNormAbsX;\n` +
        shader.fragmentShader.replace(
          '#include <opaque_fragment>',
          `
          if (uThermalVision > 0.001) {
            float legMask = (1.0 - smoothstep(0.45, 0.50, vNormBindY)) * (1.0 - smoothstep(0.22, 0.30, vNormAbsX));
            float pulse = 0.8 + 0.2 * sin(uThermalTime * 8.0);
            outgoingLight = mix(outgoingLight, vec3(1.0, 0.48, 0.04) * (1.45 * pulse), legMask * uThermalVision);
          }
          if (uDamageFlash > 0.001) {
            outgoingLight = mix(outgoingLight, vec3(0.85, 0.02, 0.02), clamp(uDamageFlash, 0.0, 1.0));
          }
          #include <opaque_fragment>
          `
        );
    } else {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vec3 safeN = length(normal) > 0.0001 ? normalize(normal) : vec3(0.0, 1.0, 0.0);
        transformed += safeN * ${extrudeVal};
        `
      );
    }
  };

  return mat;
}

function buildAlienCompanionUFO(
  gradientMap: THREE.DataTexture,
  disposableMaterials: THREE.Material[]
): {
  group: THREE.Group;
  update: (clock: number, dt: number, steerLean: number) => void;
} {
  const group = new THREE.Group();
  group.name = 'AlienCompanionUFO';

  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x090d16, side: THREE.BackSide });
  const hullMat = new THREE.MeshToonMaterial({ color: 0x94a3b8, gradientMap });
  const rimMat = new THREE.MeshToonMaterial({ color: 0x10b981, gradientMap });
  const goldTrimMat = new THREE.MeshToonMaterial({ color: 0xfacc15, gradientMap });
  const domeMat = new THREE.MeshToonMaterial({
    color: 0x38bdf8,
    gradientMap,
    transparent: true,
    opacity: 0.78,
  });
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposableMaterials.push(outlineMat, hullMat, rimMat, goldTrimMat, domeMat, beamMat);

  const saucerDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.155, 0.038, 20), hullMat);
  const saucerOutline = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.168, 0.05, 20),
    outlineMat
  );
  group.add(saucerDisc, saucerOutline);

  const rimTorus = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.016, 10, 24), rimMat);
  rimTorus.rotation.x = Math.PI / 2;
  const rimOut = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.023, 10, 24), outlineMat);
  rimOut.rotation.x = Math.PI / 2;
  group.add(rimTorus, rimOut);

  const underCap = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 10), goldTrimMat);
  underCap.position.y = -0.016;
  underCap.scale.set(1, 0.45, 1);
  group.add(underCap);

  const glassDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.082, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    domeMat
  );
  glassDome.position.y = 0.012;
  const domeOutline = new THREE.Mesh(
    new THREE.SphereGeometry(0.089, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    outlineMat
  );
  domeOutline.position.y = 0.012;
  group.add(glassDome, domeOutline);

  // Pequena antena cartoon no topo da cúpula
  const antennaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.007, 0.055, 8), hullMat);
  antennaStem.position.y = 0.105;
  const antennaOrbMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
  disposableMaterials.push(antennaOrbMat);
  const antennaOrb = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 10), antennaOrbMat);
  antennaOrb.position.y = 0.136;
  const antennaOrbOut = new THREE.Mesh(new THREE.SphereGeometry(0.021, 10, 10), outlineMat);
  antennaOrbOut.position.y = 0.136;
  group.add(antennaStem, antennaOrb, antennaOrbOut);

  // Luzes coloridas giratórias ao redor do disco
  const lightMats: THREE.MeshBasicMaterial[] = [];
  const lightGeo = new THREE.SphereGeometry(0.013, 8, 8);
  for (let i = 0; i < 6; i++) {
    const lMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xfef08a : 0x38bdf8 });
    disposableMaterials.push(lMat);
    lightMats.push(lMat);
    const ang = (i / 6) * Math.PI * 2;
    const bulb = new THREE.Mesh(lightGeo, lMat);
    bulb.position.set(Math.cos(ang) * 0.15, 0.002, Math.sin(ang) * 0.15);
    group.add(bulb);
  }

  // Mini anel de feixe abduzido discreto abaixo do disco
  const beamRing = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.085, 18), beamMat);
  beamRing.rotation.x = -Math.PI / 2;
  beamRing.position.y = -0.055;
  group.add(beamRing);

  const update = (clock: number, dt: number, steerLean: number) => {
    // Trajetória livre em oito suave + oscilação vertical orgânica sem poluir a visão
    const fig8X = Math.sin(clock * 0.72) * 0.14 + Math.cos(clock * 1.31) * 0.05;
    const bobY = Math.sin(clock * 1.48) * 0.065 + Math.cos(clock * 0.85) * 0.025;
    const swayZ = Math.cos(clock * 0.64) * 0.11;

    group.position.set(-0.46 + fig8X - steerLean * 0.06, 1.54 + bobY, 0.14 + swayZ);
    group.rotation.y = (group.rotation.y + dt * 2.4) % (Math.PI * 2);
    group.rotation.z = -steerLean * 0.22 + Math.cos(clock * 1.15) * 0.12;
    group.rotation.x = Math.sin(clock * 0.95) * 0.1;

    const ringScale = 0.85 + Math.sin(clock * 3.2) * 0.18;
    beamRing.scale.setScalar(ringScale);
    beamMat.opacity = 0.16 + Math.sin(clock * 3.2) * 0.08;

    const activeIdx = Math.floor(clock * 3.5) % lightMats.length;
    for (let i = 0; i < lightMats.length; i++) {
      lightMats[i].color.setHex(
        i === activeIdx ? 0xffffff : i % 2 === 0 ? 0xfacc15 : 0x34d399
      );
    }
  };

  return { group, update };
}

function applyCartoonMaterialsAndOutline(
  modelGroup: THREE.Group,
  castShadow: boolean,
  receiveShadow: boolean,
  fxUniforms?: RiderShaderFxUniforms,
  characterId?: MotoboyCharacterId
): {
  toonMaterials: THREE.MeshToonMaterial[];
  outlineMaterials: THREE.MeshBasicMaterial[];
  allDisposableMaterials: THREE.Material[];
} {
  const gradientMap = getMotoboyCartoonGradientMap();
  const toonMaterials: THREE.MeshToonMaterial[] = [];
  const outlineMaterials: THREE.MeshBasicMaterial[] = [];
  const allDisposableMaterials: THREE.Material[] = [];
  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  const staticMeshes: THREE.Mesh[] = [];
  const isAlienMotoboy = characterId === 'motoboy_5';

  modelGroup.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.userData?.isCartoonOutline) return;

      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      mesh.frustumCulled = false;

      const origMat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
        | THREE.MeshStandardMaterial
        | THREE.MeshPhongMaterial
        | undefined;
      const texMap = origMat?.map || null;
      if (texMap) {
        texMap.colorSpace = THREE.SRGBColorSpace;
      }

      const toonMat = new THREE.MeshToonMaterial({
        map: texMap,
        color: 0xffffff,
        gradientMap,
        transparent: true,
        opacity: 1.0,
      });

      if ((fxUniforms || isAlienMotoboy) && mesh.geometry) {
        const bounds = computeGeomLegBounds(mesh.geometry);
        const minYStr = bounds.minY.toFixed(5);
        const spanYStr = bounds.spanY.toFixed(5);
        const cxStr = bounds.centerX.toFixed(5);
        const hsxStr = bounds.halfSpanX.toFixed(5);

        toonMat.onBeforeCompile = (shader) => {
          if (fxUniforms) {
            shader.uniforms.uDamageFlash = fxUniforms.uDamageFlash;
            shader.uniforms.uThermalVision = fxUniforms.uThermalVision;
            shader.uniforms.uThermalTime = fxUniforms.uThermalTime;
            shader.uniforms.uCashFlashIntensity = fxUniforms.uCashFlashIntensity;
            shader.uniforms.uCashFlashColor = fxUniforms.uCashFlashColor;
          }

          shader.vertexShader =
            `varying float vNormBindY;\nvarying float vNormAbsX;\nvarying vec3 vBindRawPos;\n` +
            shader.vertexShader.replace(
              '#include <begin_vertex>',
              `
              #include <begin_vertex>
              vNormBindY = clamp((position.y - (${minYStr})) / (${spanYStr}), 0.0, 1.0);
              vNormAbsX = clamp(abs(position.x - (${cxStr})) / (${hsxStr}), 0.0, 2.0);
              vBindRawPos = position;
              `
            );

          if (isAlienMotoboy) {
            // Item 1: Patch / Estampa da Bandeira do Brasil integrada ao tecido da camiseta do Alienígena
            // Aplicada antes da iluminação toon para respeitar dobras, normais, sombras e perspectiva da malha!
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <color_fragment>',
              `
              #include <color_fragment>
              {
                bool isFrontChest = vBindRawPos.y < -0.015;
                bool isBackShirt = vBindRawPos.y > 0.015;
                vec2 pCenter = isFrontChest ? vec2(0.034, 0.172) : vec2(0.0, 0.194);
                vec2 pHalf = isFrontChest ? vec2(0.025, 0.0175) : vec2(0.032, 0.022);
                vec2 uvPatch = (vec2(vBindRawPos.x, vBindRawPos.z) - pCenter) / pHalf;
                if (isFrontChest) uvPatch.x = -uvPatch.x;
                if ((isFrontChest || isBackShirt) && abs(uvPatch.x) <= 1.0 && abs(uvPatch.y) <= 1.0) {
                  float edgeDist = max(abs(uvPatch.x), abs(uvPatch.y));
                  float borderMask = smoothstep(0.88, 0.95, edgeDist);
                  vec3 brGreen = vec3(0.0, 0.61, 0.23);
                  vec3 brYellow = vec3(1.0, 0.87, 0.0);
                  vec3 brBlue = vec3(0.0, 0.16, 0.47);
                  vec3 brWhite = vec3(0.97, 0.98, 0.99);

                  vec3 flagCol = brGreen;
                  float diamond = abs(uvPatch.x) / 0.78 + abs(uvPatch.y) / 0.74;
                  if (diamond <= 1.0) {
                    flagCol = brYellow;
                  }
                  float circleR = length(uvPatch * vec2(1.0, 0.70));
                  if (circleR <= 0.34) {
                    flagCol = brBlue;
                    float bandY = uvPatch.y * 0.70 + uvPatch.x * 0.11 + uvPatch.x * uvPatch.x * 0.22 - 0.02;
                    if (abs(bandY) <= 0.048) {
                      flagCol = brWhite;
                    }
                  }
                  // Borda costurada do patch + integração com as dobras e textura original do tecido
                  float stitchWave = 0.85 + 0.15 * sin((uvPatch.x + uvPatch.y) * 95.0);
                  flagCol = mix(flagCol, vec3(0.95, 0.82, 0.12) * stitchWave, borderMask * 0.85);
                  float fabricFoldShade = clamp(dot(diffuseColor.rgb, vec3(0.333)) * 1.42, 0.65, 1.14);
                  float softEdge = 1.0 - smoothstep(0.95, 1.0, edgeDist);
                  diffuseColor.rgb = mix(diffuseColor.rgb, flagCol * fabricFoldShade, softEdge * 0.94);
                }
              }
              `
            );
          }

          if (fxUniforms) {
            shader.fragmentShader =
              `uniform float uDamageFlash;\nuniform float uThermalVision;\nuniform float uThermalTime;\nuniform float uCashFlashIntensity;\nuniform vec3 uCashFlashColor;\nvarying float vNormBindY;\nvarying float vNormAbsX;\nvarying vec3 vBindRawPos;\n` +
              shader.fragmentShader.replace(
                '#include <opaque_fragment>',
                `
                if (uThermalVision > 0.001) {
                  float legMaskY = 1.0 - smoothstep(0.45, 0.50, vNormBindY);
                  float legMaskX = 1.0 - smoothstep(0.22, 0.30, vNormAbsX);
                  float legMask = legMaskY * legMaskX;
                  if (legMask > 0.001) {
                    float scanWave = 0.5 + 0.5 * sin(vNormBindY * 30.0 - uThermalTime * 10.0);
                    float pulse = 0.86 + 0.14 * sin(uThermalTime * 7.5);
                    float heatCore = clamp((1.0 - vNormAbsX * 2.4) * 0.65 + scanWave * 0.35, 0.0, 1.0);
                    vec3 coldOuter = vec3(0.88, 0.08, 0.02);
                    vec3 warmMid = vec3(1.0, 0.36, 0.0);
                    vec3 hotInner = vec3(1.0, 0.90, 0.22);
                    vec3 thermalCol = mix(coldOuter, warmMid, smoothstep(0.0, 0.55, heatCore));
                    thermalCol = mix(thermalCol, hotInner, smoothstep(0.55, 1.0, heatCore));
                    outgoingLight = mix(outgoingLight, thermalCol * (1.58 * pulse), legMask * uThermalVision);
                  }
                }
                if (uCashFlashIntensity > 0.001) {
                  outgoingLight = mix(outgoingLight, uCashFlashColor * 1.55, clamp(uCashFlashIntensity, 0.0, 1.0));
                }
                if (uDamageFlash > 0.001) {
                  outgoingLight = mix(outgoingLight, vec3(1.0, 0.07, 0.05) * 1.65, clamp(uDamageFlash, 0.0, 1.0));
                }
                #include <opaque_fragment>
                `
              );
          } else {
            shader.fragmentShader =
              `varying float vNormBindY;\nvarying float vNormAbsX;\nvarying vec3 vBindRawPos;\n` +
              shader.fragmentShader;
          }
        };
      }

      toonMaterials.push(toonMat);
      allDisposableMaterials.push(toonMat);
      mesh.material = toonMat;

      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
        skinnedMeshes.push(mesh as THREE.SkinnedMesh);
      } else {
        staticMeshes.push(mesh);
      }
    }
  });

  const computeLocalOutlineOffset = (geo: THREE.BufferGeometry): number => {
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (!bb) return 0.008;
    const span = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
    return span > 0.01 ? span * 0.0078 : 0.008;
  };

  for (const mesh of staticMeshes) {
    const bounds = fxUniforms ? computeGeomLegBounds(mesh.geometry) : undefined;
    const outMat = createCartoonOutlineMaterial(
      computeLocalOutlineOffset(mesh.geometry),
      0xffffff,
      bounds,
      fxUniforms
    );
    outlineMaterials.push(outMat);
    allDisposableMaterials.push(outMat);
    const outlineMesh = new THREE.Mesh(mesh.geometry, outMat);
    outlineMesh.userData.isCartoonOutline = true;
    outlineMesh.frustumCulled = false;
    outlineMesh.castShadow = false;
    outlineMesh.receiveShadow = false;
    mesh.add(outlineMesh);
  }

  for (const skinnedMesh of skinnedMeshes) {
    try {
      const bounds = fxUniforms ? computeGeomLegBounds(skinnedMesh.geometry) : undefined;
      const outMat = createCartoonOutlineMaterial(
        computeLocalOutlineOffset(skinnedMesh.geometry),
        0xffffff,
        bounds,
        fxUniforms
      );
      outlineMaterials.push(outMat);
      allDisposableMaterials.push(outMat);

      const outlineSkinned = new THREE.SkinnedMesh(skinnedMesh.geometry, outMat);
      outlineSkinned.userData.isCartoonOutline = true;
      outlineSkinned.position.copy(skinnedMesh.position);
      outlineSkinned.quaternion.copy(skinnedMesh.quaternion);
      outlineSkinned.scale.copy(skinnedMesh.scale);
      outlineSkinned.frustumCulled = false;
      outlineSkinned.castShadow = false;
      outlineSkinned.receiveShadow = false;
      outlineSkinned.bind(skinnedMesh.skeleton, skinnedMesh.bindMatrix.clone());

      if (skinnedMesh.parent) {
        skinnedMesh.parent.add(outlineSkinned);
      }
    } catch (e) {
      console.warn('[motoboyModelLoader] Aviso ao vincular contorno cartoon SkinnedMesh:', e);
    }
  }

  return { toonMaterials, outlineMaterials, allDisposableMaterials };
}

/**
 * Instancia o Piloto em Pé com sua animação de Idle nativa e visual Cartoon Cel-Shaded
 * (suporta efeito de foco nítido à frente vs desfocado suave ao fundo na Garagem!)
 */
export async function createMotoboyInstance(
  id: MotoboyCharacterId,
  options?: { targetHeight?: number }
): Promise<MotoboyInstance> {
  const spec = getMotoboySpecById(id);
  const baseFbx = await loadMotoboyFbx(spec.fbxPath);

  const motoboyGroup = SkeletonUtils.clone(baseFbx) as THREE.Group;
  motoboyGroup.name = `Motoboy_${id}`;

  const { toonMaterials, outlineMaterials, allDisposableMaterials } =
    applyCartoonMaterialsAndOutline(motoboyGroup, true, true, undefined, id);

  let mixer: THREE.AnimationMixer | null = null;
  if (baseFbx.animations && baseFbx.animations.length > 0) {
    mixer = new THREE.AnimationMixer(motoboyGroup);
    const action = mixer.clipAction(baseFbx.animations[0]);
    action.play();
    mixer.update(0);
  }

  motoboyGroup.updateMatrixWorld(true);

  const targetHeight = options?.targetHeight ?? 1.68;
  const initialBox = new THREE.Box3().setFromObject(motoboyGroup);
  const currentHeight = initialBox.max.y - initialBox.min.y;
  if (currentHeight > 0.05 && Number.isFinite(currentHeight)) {
    motoboyGroup.scale.multiplyScalar(targetHeight / currentHeight);
  }

  motoboyGroup.updateMatrixWorld(true);
  const alignedBox = new THREE.Box3().setFromObject(motoboyGroup);
  if (Number.isFinite(alignedBox.min.y)) {
    motoboyGroup.position.y -= alignedBox.min.y;
  }

  const root = new THREE.Group();
  root.name = `MotoboyRoot_${id}`;
  root.add(motoboyGroup);

  const alienUfo =
    id === 'motoboy_5'
      ? buildAlienCompanionUFO(getMotoboyCartoonGradientMap(), allDisposableMaterials)
      : null;
  if (alienUfo) {
    alienUfo.group.position.set(-0.42, 1.56, 0.06);
    root.add(alienUfo.group);
  }

  let focusBlend = 1.0;
  let ufoClock = 0;

  const setFocusState = (isSelected: boolean, dt: number) => {
    const target = isSelected ? 1.0 : 0.0;
    focusBlend = THREE.MathUtils.lerp(focusBlend, target, Math.min(1, 10 * dt));

    const bodyOpacity = THREE.MathUtils.lerp(0.38, 1.0, focusBlend);
    const outlineOpacity = THREE.MathUtils.lerp(0.14, 1.0, focusBlend);

    for (let i = 0; i < toonMaterials.length; i++) {
      const m = toonMaterials[i];
      m.color.copy(_defocusedColor).lerp(_focusedColor, focusBlend);
      m.opacity = bodyOpacity;
      m.depthWrite = focusBlend > 0.85;
    }
    for (let i = 0; i < outlineMaterials.length; i++) {
      outlineMaterials[i].opacity = outlineOpacity;
    }
  };

  const update = (dt: number) => {
    if (mixer) {
      mixer.update(dt);
    }
    if (alienUfo) {
      ufoClock = (ufoClock + dt) % 628.318;
      alienUfo.update(ufoClock, dt, 0);
    }
  };

  const dispose = () => {
    if (mixer) mixer.stopAllAction();
    for (const m of allDisposableMaterials) {
      m.dispose();
    }
    root.clear();
  };

  return {
    id,
    root,
    mixer,
    setFocusState,
    update,
    dispose,
  };
}

/**
 * Cria o Piloto Motoboy Cartoon (1 único modelo FBX limpo, sem malhas duplicadas!)
 * perfeitamente sentado no banco da moto, abraçando o tanque com os joelhos, pés nas pedaleiras,
 * costas livres à frente do Caixote de Anúncio e as 2 mãos travadas nas 2 manoplas do guidão!
 */
export async function createSeatedMotoboyRider(
  id: MotoboyCharacterId
): Promise<SeatedMotoboyRiderInstance> {
  const spec = getMotoboySpecById(id);
  const baseFbx = await loadMotoboyFbx(spec.fbxPath);
  const riderClone = SkeletonUtils.clone(baseFbx) as THREE.Group;
  riderClone.name = `SeatedMotoboyMesh_${id}`;

  const fxUniforms: RiderShaderFxUniforms = {
    uDamageFlash: { value: 0 },
    uThermalVision: { value: 0 },
    uThermalTime: { value: 0 },
    uCashFlashIntensity: { value: 0 },
    uCashFlashColor: { value: new THREE.Color(0x34d399) },
  };

  const { allDisposableMaterials } = applyCartoonMaterialsAndOutline(
    riderClone,
    true,
    false,
    fxUniforms,
    id
  );

  riderClone.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(riderClone);
  const rawH = Math.max(0.2, rawBox.max.y - rawBox.min.y);
  // Escala humana ideal de pilotagem (~1.78m equivalente) para alcance natural dos braços no guidão
  const riderScale = 1.78 / rawH;

  // O modelo FBX olha para +Z; girando PI em Y, ele olha para -Z (frente da pista!)
  const riderPivot = new THREE.Group();
  riderPivot.rotation.y = Math.PI;
  riderPivot.scale.setScalar(riderScale);
  riderPivot.add(riderClone);

  const seatLeanPivot = new THREE.Group();
  seatLeanPivot.name = 'RiderSeatLeanPivot';
  seatLeanPivot.position.set(0, 0.865, -0.02);
  seatLeanPivot.add(riderPivot);

  const root = new THREE.Group();
  root.name = `SeatedMotoboyRider_${id}`;
  root.add(seatLeanPivot);
  root.updateMatrixWorld(true);

  // 1. Postura anatômica sentada na moto em coordenadas de Mundo (100% determinística para todos os 5 personagens Mixamo!)
  // Tronco levemente inclinado à frente rumo ao guidão + pescoço/cabeça erguidos olhando para a pista (-Z)
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigSpine', 1, 0, 0, -0.18);
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigSpine1', 1, 0, 0, -0.17);
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigSpine2', 1, 0, 0, -0.10);
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigNeck', 1, 0, 0, 0.24);
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigHead', 1, 0, 0, 0.20);

  // Coxas elevadas à frente abraçando o tanque + joelhos flexionados para trás apoiando os pés nas pedaleiras!
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigLeftUpLeg', 1, 0, 0, 1.22);
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigLeftUpLeg', 0, 0, 1, -0.21);
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigLeftUpLeg', 0, 1, 0, -0.14);
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigLeftLeg', 1, 0, 0, -1.52);
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigLeftFoot', 1, 0, 0, 0.30);

  rotateBoneAroundWorldAxis(riderClone, 'mixamorigRightUpLeg', 1, 0, 0, 1.22);
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigRightUpLeg', 0, 0, 1, 0.21);
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigRightUpLeg', 0, 1, 0, 0.14);
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigRightLeg', 1, 0, 0, -1.52);
  rotateBoneAroundWorldAxis(riderClone, 'mixamorigRightFoot', 1, 0, 0, 0.30);

  // Dedos das 2 mãos fechados envolvendo firmemente as manoplas do guidão
  const fingerNames = ['Index', 'Middle', 'Ring', 'Pinky'];
  for (const side of ['Left', 'Right'] as const) {
    for (const fn of fingerNames) {
      for (const seg of ['1', '2', '3']) {
        const fBone = riderClone.getObjectByName(`mixamorig${side}Hand${fn}${seg}`);
        if (fBone) {
          fBone.rotateZ(side === 'Left' ? -0.62 : 0.62);
        }
      }
    }
  }

  // 2. Crava o quadril (mixamorigHips) exatamente no assento frontal (y = 0.865m, z = -0.02m),
  // deixando amplo espaço livre atrás para o Caixote "COLOQUE SEU ANÚNCIO AQUI!" (z = +0.58m)!
  root.updateMatrixWorld(true);
  const hipsNode = riderClone.getObjectByName('mixamorigHips');
  if (hipsNode) {
    const hipsWorld = new THREE.Vector3();
    hipsNode.getWorldPosition(hipsWorld);
    riderPivot.position.set(
      -hipsWorld.x,
      0.865 - hipsWorld.y,
      -0.02 - hipsWorld.z
    );
  }

  // Referências dos ossos dos 2 braços para travar ambos os punhos nas manoplas via IK Analítico!
  const shoulderL = riderClone.getObjectByName('mixamorigLeftArm') || null;
  const elbowL = riderClone.getObjectByName('mixamorigLeftForeArm') || null;
  const wristL = riderClone.getObjectByName('mixamorigLeftHand') || null;
  const fingerL = riderClone.getObjectByName('mixamorigLeftHandMiddle1') || null;

  const shoulderR = riderClone.getObjectByName('mixamorigRightArm') || null;
  const elbowR = riderClone.getObjectByName('mixamorigRightForeArm') || null;
  const wristR = riderClone.getObjectByName('mixamorigRightHand') || null;
  const fingerR = riderClone.getObjectByName('mixamorigRightHandMiddle1') || null;

  const headBone = riderClone.getObjectByName('mixamorigHead') || null;
  const headRestQuat = headBone ? headBone.quaternion.clone() : null;
  const leftUpLeg = riderClone.getObjectByName('mixamorigLeftUpLeg') || null;
  const rightUpLeg = riderClone.getObjectByName('mixamorigRightUpLeg') || null;
  const leftLeg = riderClone.getObjectByName('mixamorigLeftLeg') || null;
  const rightLeg = riderClone.getObjectByName('mixamorigRightLeg') || null;
  const leftUpLegSeatQuat = leftUpLeg ? leftUpLeg.quaternion.clone() : null;
  const rightUpLegSeatQuat = rightUpLeg ? rightUpLeg.quaternion.clone() : null;
  const leftLegSeatQuat = leftLeg ? leftLeg.quaternion.clone() : null;
  const rightLegSeatQuat = rightLeg ? rightLeg.quaternion.clone() : null;

  // Luz pontual térmica local ultraleve entre as 2 pernas (ativa exclusivamente na visão de calor!)
  const thermalLegLight = new THREE.PointLight(0xff4d00, 0, 2.2, 2.0);
  thermalLegLight.position.set(0, 0.56, 0.04);
  thermalLegLight.visible = false;
  root.add(thermalLegLight);

  const setDamageFlash = (intensity: number) => {
    fxUniforms.uDamageFlash.value = THREE.MathUtils.clamp(intensity, 0, 1);
  };

  const setThermalVision = (intensity: number) => {
    const v = THREE.MathUtils.clamp(intensity, 0, 1);
    fxUniforms.uThermalVision.value = v;
    thermalLegLight.visible = v > 0.02;
    thermalLegLight.intensity = v * 2.4;
  };

  let smoothLean = 0;
  let leanVel = 0;
  let rideBreathClock = 0;
  let squashTimer = 0;
  let squashStrength = 1.0;
  let pizzaAimingActive = false;
  let pizzaAimBlend = 0;
  let pizzaThrowTimer = 0;
  let pizzaThrowSide: -1 | 1 = 1;
  let knockoutFallFactor = 0;
  const _throwHandTargetWorld = new THREE.Vector3();
  const _pizzaLocalPos = new THREE.Vector3();
  const _knockoutLeftHandWorld = new THREE.Vector3();
  const _knockoutRightHandWorld = new THREE.Vector3();

  // Caixa de Pizza Cartoon Fechada na mão do Motoboy (a pizza fica dentro da caixa fechada, sem parecer fora da caixa!)
  const heldPizzaProp = new THREE.Group();
  heldPizzaProp.visible = false;
  {
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a0b04, side: THREE.BackSide });
    const boxBaseMat = new THREE.MeshStandardMaterial({ color: 0xd9a05b, roughness: 0.55 });
    const boxLidMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.48 });
    const emblemRingMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const emblemCenterMat = new THREE.MeshBasicMaterial({ color: 0xb91c1c });
    allDisposableMaterials.push(outlineMat, boxBaseMat, boxLidMat, emblemRingMat, emblemCenterMat);

    // Base da caixa fechada de entrega
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.044, 0.40), boxBaseMat);
    baseMesh.position.y = 0.022;
    const baseOut = new THREE.Mesh(new THREE.BoxGeometry(0.428, 0.068, 0.428), outlineMat);
    baseOut.position.y = 0.026;
    heldPizzaProp.add(baseMesh, baseOut);

    // Tampa superior encaixada fechando a caixa
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.416, 0.018, 0.416), boxLidMat);
    lidMesh.position.y = 0.048;
    heldPizzaProp.add(lidMesh);

    // Estampa plana circular no topo da tampa fechada
    const emblemRing = new THREE.Mesh(new THREE.CircleGeometry(0.135, 20), emblemRingMat);
    emblemRing.rotation.x = -Math.PI * 0.5;
    emblemRing.position.y = 0.058;
    const emblemCenter = new THREE.Mesh(new THREE.CircleGeometry(0.095, 20), emblemCenterMat);
    emblemCenter.rotation.x = -Math.PI * 0.5;
    emblemCenter.position.y = 0.0585;
    heldPizzaProp.add(emblemRing, emblemCenter);
  }
  root.add(heldPizzaProp);

  // Item 1: Pequeno Disco Voador (OVNI) Cartoon acompanhando o Motoboy Alienígena durante a gameplay!
  const alienUfo =
    id === 'motoboy_5'
      ? buildAlienCompanionUFO(getMotoboyCartoonGradientMap(), allDisposableMaterials)
      : null;
  if (alienUfo) {
    root.add(alienUfo.group);
  }

  const triggerBiteSquash = (strength = 1.0) => {
    squashStrength = THREE.MathUtils.clamp(strength, 0.35, 1.25);
    squashTimer = 0.78;
  };

  const triggerCashColorFlash = (hexColor: number, intensity = 0.92) => {
    fxUniforms.uCashFlashColor.value.setHex(hexColor);
    fxUniforms.uCashFlashIntensity.value = THREE.MathUtils.clamp(intensity, 0, 1);
  };

  const setPizzaAiming = (active: boolean, side?: -1 | 1) => {
    pizzaAimingActive = active;
    if (active && pizzaThrowTimer <= 0 && (side === -1 || side === 1)) {
      pizzaThrowSide = side;
    }
  };

  const triggerPizzaThrow = (side: -1 | 1) => {
    pizzaThrowSide = side;
    pizzaThrowTimer = 0.56;
    pizzaAimingActive = false;
  };

  const setKnockoutBackFall = (factor01: number) => {
    knockoutFallFactor = THREE.MathUtils.clamp(factor01, 0, 1);
    if (leftUpLeg && leftUpLegSeatQuat) {
      leftUpLeg.quaternion.copy(leftUpLegSeatQuat);
      if (knockoutFallFactor > 0.001) {
        leftUpLeg.rotateX(-1.12 * knockoutFallFactor);
        leftUpLeg.rotateZ(0.38 * knockoutFallFactor);
      }
    }
    if (rightUpLeg && rightUpLegSeatQuat) {
      rightUpLeg.quaternion.copy(rightUpLegSeatQuat);
      if (knockoutFallFactor > 0.001) {
        rightUpLeg.rotateX(-1.12 * knockoutFallFactor);
        rightUpLeg.rotateZ(-0.38 * knockoutFallFactor);
      }
    }
    if (leftLeg && leftLegSeatQuat) {
      leftLeg.quaternion.copy(leftLegSeatQuat);
      if (knockoutFallFactor > 0.001) {
        leftLeg.rotateX(1.38 * knockoutFallFactor);
      }
    }
    if (rightLeg && rightLegSeatQuat) {
      rightLeg.quaternion.copy(rightLegSeatQuat);
      if (knockoutFallFactor > 0.001) {
        rightLeg.rotateX(1.38 * knockoutFallFactor);
      }
    }
  };

  const update = (
    dt: number,
    steerLean: number,
    pitchAngle: number,
    leftGripWorld?: THREE.Vector3,
    rightGripWorld?: THREE.Vector3
  ) => {
    const clampedDt = Math.min(0.05, Math.max(0, dt));
    rideBreathClock = (rideBreathClock + clampedDt * 3.4) % 628.318;
    if (fxUniforms.uThermalVision.value > 0.001) {
      fxUniforms.uThermalTime.value = (fxUniforms.uThermalTime.value + clampedDt) % 628.318;
    }
    if (fxUniforms.uCashFlashIntensity.value > 0.001) {
      fxUniforms.uCashFlashIntensity.value = Math.max(
        0,
        fxUniforms.uCashFlashIntensity.value - clampedDt * 3.2
      );
    }
    if (squashTimer > 0) {
      squashTimer = Math.max(0, squashTimer - clampedDt);
    }
    if (pizzaThrowTimer > 0) {
      pizzaThrowTimer = Math.max(0, pizzaThrowTimer - clampedDt);
    }

    // Mola amortecida fluida nas curvas: acompanha livremente a inclinação da moto com naturalidade!
    const targetLean = THREE.MathUtils.clamp(steerLean, -1.35, 1.35);
    const springForce = (targetLean - smoothLean) * 165.0 - leanVel * 22.0;
    leanVel += springForce * clampedDt;
    smoothLean += leanVel * clampedDt;

    // Deformação cômica de achatamento ("pancake cartoon") ao receber mordida precisa no Modo Caramelo!
    let squashEnv = 0;
    let squashWobble = 0;
    if (squashTimer > 0) {
      const p = 1.0 - squashTimer / 0.78;
      const compression =
        p < 0.14 ? p / 0.14 : Math.pow(Math.max(0, 1.0 - (p - 0.14) / 0.86), 1.55);
      squashWobble = Math.sin(p * Math.PI * 6.5) * (1.0 - p) * squashStrength;
      squashEnv = compression * squashStrength;
    }

    const scaleSquashY = Math.max(0.46, 1.0 - squashEnv * 0.44 + squashWobble * 0.08);
    const scaleSquashXZ = 1.0 + squashEnv * 0.38 - squashWobble * 0.06;
    riderPivot.scale.set(
      riderScale * scaleSquashXZ,
      riderScale * scaleSquashY,
      riderScale * scaleSquashXZ
    );

    const absLean = Math.abs(smoothLean);
    const subtleBob = Math.sin(rideBreathClock) * 0.004;
    pizzaAimBlend = THREE.MathUtils.lerp(
      pizzaAimBlend,
      pizzaAimingActive && pizzaThrowTimer <= 0 ? 1.0 : 0.0,
      Math.min(1, clampedDt * 12.0)
    );
    const throwProgress = pizzaThrowTimer > 0 ? 1.0 - pizzaThrowTimer / 0.56 : 0;
    // Movimento natural em 3 fases: preparação (0..0.34), impulso/soltura (0.34..0.62) e retorno (0.62..1.0)
    const windupFactor =
      pizzaThrowTimer > 0
        ? throwProgress < 0.34
          ? Math.sin((throwProgress / 0.34) * (Math.PI * 0.5))
          : Math.max(0, 1.0 - (throwProgress - 0.34) / 0.18)
        : pizzaAimBlend;
    const impulseFactor =
      pizzaThrowTimer > 0 && throwProgress >= 0.28
        ? Math.sin(Math.min(1, (throwProgress - 0.28) / 0.56) * Math.PI)
        : 0;
    const throwArc = Math.max(windupFactor * 0.65, impulseFactor);
    // Item 4: Rotação natural do tronco (prepara girando o ombro para trás e lança girando o peito rumo à calçada!)
    const throwTorsoTwist =
      windupFactor * pizzaThrowSide * 0.24 - impulseFactor * pizzaThrowSide * 0.42;

    if (alienUfo) {
      alienUfo.update(rideBreathClock * 0.85, clampedDt, smoothLean);
    }

    if (knockoutFallFactor > 0.001) {
      // Item 7: Queda cômica de costas no chão com os 2 braços e 2 pernas abertos (Referência 2!)
      const kf = knockoutFallFactor;
      seatLeanPivot.position.x = THREE.MathUtils.lerp(smoothLean * 0.058, 0, kf);
      seatLeanPivot.position.y = THREE.MathUtils.lerp(0.865, 0.16, kf);
      seatLeanPivot.position.z = THREE.MathUtils.lerp(-0.02, 0.45, kf);
      seatLeanPivot.rotation.z = THREE.MathUtils.lerp(-smoothLean * 0.21, 0, kf);
      seatLeanPivot.rotation.y = THREE.MathUtils.lerp(-smoothLean * 0.085, 0, kf);
      seatLeanPivot.rotation.x = THREE.MathUtils.lerp(
        -Math.max(0, pitchAngle) * 0.22,
        Math.PI * 0.49,
        kf
      );
    } else {
      seatLeanPivot.position.x = smoothLean * 0.058 + squashWobble * 0.03 + throwArc * pizzaThrowSide * 0.04;
      seatLeanPivot.position.y = 0.865 - absLean * 0.015 - squashEnv * 0.11 + subtleBob;
      seatLeanPivot.position.z = -0.02;
      seatLeanPivot.rotation.z = -smoothLean * 0.21 + squashWobble * 0.12;
      seatLeanPivot.rotation.y = -smoothLean * 0.085 + throwTorsoTwist;
      seatLeanPivot.rotation.x =
        -Math.max(0, pitchAngle) * 0.22 + absLean * 0.05 - squashEnv * 0.28;
    }

    if (headBone && headRestQuat) {
      headBone.quaternion.copy(headRestQuat);
      headBone.rotateY(-smoothLean * 0.11 + squashWobble * 0.22 - throwTorsoTwist * 0.8);
      headBone.rotateX(-squashEnv * 0.24 - knockoutFallFactor * 0.35);
    }

    // Trava as 2 mãos no guidão (ou estica 1 braço para lançar a pizza / abre os 2 braços na queda!)
    if (leftGripWorld && rightGripWorld) {
      root.updateMatrixWorld(true);
      root.getWorldQuaternion(_ikRootWorldQuat);

      let effLeftTarget = leftGripWorld;
      let effRightTarget = rightGripWorld;

      if (knockoutFallFactor > 0.01) {
        root.getWorldPosition(_throwHandTargetWorld);
        _knockoutLeftHandWorld.set(
          _throwHandTargetWorld.x - 0.84 * knockoutFallFactor,
          _throwHandTargetWorld.y + 0.18,
          _throwHandTargetWorld.z + 0.15
        );
        _knockoutRightHandWorld.set(
          _throwHandTargetWorld.x + 0.84 * knockoutFallFactor,
          _throwHandTargetWorld.y + 0.18,
          _throwHandTargetWorld.z + 0.15
        );
        effLeftTarget = _knockoutLeftHandWorld;
        effRightTarget = _knockoutRightHandWorld;
      } else if (windupFactor > 0.01 || impulseFactor > 0.01) {
        const baseGrip = pizzaThrowSide === -1 ? leftGripWorld : rightGripWorld;
        _throwHandTargetWorld.copy(baseGrip);
        // Fase 1 (Preparação): ergue a mão segurando a pizza grande em primeiro plano
        // Fase 2 (Impulso): lança o braço com força para o lado do cliente
        const lateralOut =
          pizzaThrowSide * (0.42 * windupFactor + 0.86 * impulseFactor);
        const liftUp = 0.38 * windupFactor + 0.42 * impulseFactor;
        const forwardShift = 0.18 * windupFactor - 0.26 * impulseFactor;
        _throwHandTargetWorld.x += lateralOut;
        _throwHandTargetWorld.y += liftUp;
        _throwHandTargetWorld.z += forwardShift;
        if (pizzaThrowSide === -1) {
          effLeftTarget = _throwHandTargetWorld;
        } else {
          effRightTarget = _throwHandTargetWorld;
        }
      }

      solveTwoBoneArmIK(shoulderL, elbowL, wristL, fingerL, effLeftTarget, _ikRootWorldQuat, true);
      solveTwoBoneArmIK(shoulderR, elbowR, wristR, fingerR, effRightTarget, _ikRootWorldQuat, false);

      // Posiciona a Caixa de Pizza na mão apenas durante a mira (oculta imediatamente ao lançar para nunca duplicar!)
      const showHeldPizza =
        knockoutFallFactor <= 0.01 &&
        pizzaAimBlend > 0.08 &&
        pizzaThrowTimer <= 0;
      heldPizzaProp.visible = showHeldPizza;
      if (showHeldPizza) {
        _pizzaLocalPos.copy(_throwHandTargetWorld);
        root.worldToLocal(_pizzaLocalPos);
        heldPizzaProp.position.set(
          _pizzaLocalPos.x + pizzaThrowSide * 0.14,
          _pizzaLocalPos.y + 0.05,
          _pizzaLocalPos.z + 0.05
        );
        heldPizzaProp.rotation.set(
          0.26,
          rideBreathClock * 0.18,
          -pizzaThrowSide * 0.18
        );
        const popScale = THREE.MathUtils.lerp(0.68, 1.05, pizzaAimBlend);
        heldPizzaProp.scale.setScalar(popScale);
      }
    } else {
      heldPizzaProp.visible = false;
    }
  };

  const dispose = () => {
    for (const m of allDisposableMaterials) {
      m.dispose();
    }
    root.clear();
  };

  return {
    id,
    root,
    setDamageFlash,
    setThermalVision,
    triggerBiteSquash,
    triggerCashColorFlash,
    setPizzaAiming,
    triggerPizzaThrow,
    setKnockoutBackFall,
    update,
    dispose,
  };
}
