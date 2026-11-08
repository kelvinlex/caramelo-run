import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type TrafficVehicleKind = 'car' | 'bus';

export interface TrafficVehicleDef {
  id: string;
  nodeName: string;
  displayName: string;
  kind: TrafficVehicleKind;
  baseSpeedMs: number;
  wheelRadiusM: number;
  scale: number;
}

/**
 * Catálogo enxuto e ultra-otimizado com 7 veículos brasileiros icônicos (5 carros + 2 ônibus)
 * com geometrias fundidas (mergeGeometries + Vertex Colors) para máxima taxa de FPS!
 */
export const TRAFFIC_VEHICLES_CATALOG: TrafficVehicleDef[] = [
  {
    id: 'fiat_uno_mille',
    nodeName: 'Obstaculo_Carro_02_fiat_uno_mille',
    displayName: 'Fiat Uno Mille c/ Escada',
    kind: 'car',
    baseSpeedMs: 14.2,
    wheelRadiusM: 0.33,
    scale: 1.46,
  },
  {
    id: 'vw_fusca_1600',
    nodeName: 'Obstaculo_Carro_08_vw_fusca_1600',
    displayName: 'VW Fusca 1600 Clássico',
    kind: 'car',
    baseSpeedMs: 11.6,
    wheelRadiusM: 0.34,
    scale: 1.46,
  },
  {
    id: 'vw_gol_gti_quadrado',
    nodeName: 'Obstaculo_Carro_10_vw_gol_gti_quadrado',
    displayName: 'VW Gol GTI Quadrado',
    kind: 'car',
    baseSpeedMs: 14.6,
    wheelRadiusM: 0.34,
    scale: 1.46,
  },
  {
    id: 'chevrolet_camaro_ss',
    nodeName: 'Obstaculo_Carro_06_chevrolet_camaro_ss',
    displayName: 'Camaro Amarelo SS V8',
    kind: 'car',
    baseSpeedMs: 16.8,
    wheelRadiusM: 0.38,
    scale: 1.46,
  },
  {
    id: 'fiat_strada_endurance',
    nodeName: 'Obstaculo_Carro_05_fiat_strada_endurance',
    displayName: 'Fiat Strada Paredão',
    kind: 'car',
    baseSpeedMs: 13.5,
    wheelRadiusM: 0.36,
    scale: 1.46,
  },
  {
    id: 'urbano_sp_articulado',
    nodeName: 'Obstaculo_Onibus_01_urbano_sp_articulado',
    displayName: 'Ônibus Urbano SPTrans',
    kind: 'bus',
    baseSpeedMs: 10.6,
    wheelRadiusM: 0.56,
    scale: 2.22,
  },
  {
    id: 'escolar_caminho_escola',
    nodeName: 'Obstaculo_Onibus_03_escolar_caminho_escola',
    displayName: 'Ônibus Escolar Amarelinho',
    kind: 'bus',
    baseSpeedMs: 10.2,
    wheelRadiusM: 0.56,
    scale: 2.24,
  },
];

export interface PooledTrafficVehicle {
  def: TrafficVehicleDef;
  root: THREE.Group;
  contactShadow: THREE.Mesh;
  wheelPivots: THREE.Object3D[];
  halfWidth: number;
  halfLength: number;
  height: number;
  inUse: boolean;
  lane: -1 | 0 | 1;
  x: number;
  z: number;
  speedMs: number;
  wheelAngle: number;
  nearMissAwarded: boolean;
  honked: boolean;
  spinWheels: (dt: number, groundSpeed: number) => void;
}

interface BakedAxleTemplate {
  geometry: THREE.BufferGeometry;
  y: number;
  z: number;
}

interface BakedSpecialMeshTemplate {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrix: THREE.Matrix4;
}

interface BakedVehicleTemplate {
  def: TrafficVehicleDef;
  bodyGeo: THREE.BufferGeometry | null;
  outlineGeo: THREE.BufferGeometry | null;
  axles: BakedAxleTemplate[];
  specials: BakedSpecialMeshTemplate[];
  shadowGeo: THREE.PlaneGeometry;
  headlightGeo: THREE.BufferGeometry;
  width: number;
  length: number;
  height: number;
}

let cachedTemplates: Map<string, BakedVehicleTemplate> | null = null;
let templateBuildPromise: Promise<Map<string, BakedVehicleTemplate>> | null = null;

// Caches globais Cartoon & Bordas Pretas (Zero GC Alloc)
let sharedToonGrad: THREE.DataTexture | null = null;
let sharedVertexColorToonMat: THREE.MeshToonMaterial | null = null;
let sharedTrafficOutlineMat: THREE.MeshBasicMaterial | null = null;
let sharedContactShadowMat: THREE.MeshBasicMaterial | null = null;
let sharedHeadlightGlowMat: THREE.MeshBasicMaterial | null = null;
const specialToonMatCache = new WeakMap<THREE.Material, THREE.Material>();

function getTrafficCartoonGradient(): THREE.DataTexture {
  if (sharedToonGrad) return sharedToonGrad;
  const steps = [132, 190, 236, 255];
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
  sharedToonGrad = tex;
  return tex;
}

function getSharedVertexColorToonMat(): THREE.MeshToonMaterial {
  if (sharedVertexColorToonMat) return sharedVertexColorToonMat;
  sharedVertexColorToonMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    vertexColors: true,
    gradientMap: getTrafficCartoonGradient(),
  });
  return sharedVertexColorToonMat;
}

function getTrafficBlackOutlineMat(): THREE.MeshBasicMaterial {
  if (sharedTrafficOutlineMat) return sharedTrafficOutlineMat;
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
      vec3 safeN = length(normal) > 0.0001 ? normalize(normal) : vec3(0.0, 1.0, 0.0);
      transformed += safeN * 0.008;
      `
    );
  };
  sharedTrafficOutlineMat = mat;
  return mat;
}

function getTrafficContactShadowMat(): THREE.MeshBasicMaterial {
  if (sharedContactShadowMat) return sharedContactShadowMat;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 5, 32, 32, 31);
  grad.addColorStop(0, 'rgba(10, 8, 6, 0.72)');
  grad.addColorStop(0.7, 'rgba(10, 8, 6, 0.32)');
  grad.addColorStop(1, 'rgba(10, 8, 6, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  sharedContactShadowMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  return sharedContactShadowMat;
}

function getHeadlightGlowMat(): THREE.MeshBasicMaterial {
  if (sharedHeadlightGlowMat) return sharedHeadlightGlowMat;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 240, 1.0)');
  grad.addColorStop(0.35, 'rgba(254, 240, 138, 0.85)');
  grad.addColorStop(1, 'rgba(251, 191, 36, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  sharedHeadlightGlowMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return sharedHeadlightGlowMat;
}

function computeBoostedCartoonColor(sourceMat: THREE.Material): THREE.Color {
  const std = sourceMat as THREE.MeshStandardMaterial;
  const col = std.color ? std.color.clone() : new THREE.Color(0xffffff);
  const hsl = { h: 0, s: 0, l: 0 };
  col.getHSL(hsl);
  const metalness = typeof std.metalness === 'number' ? std.metalness : 0;
  if (metalness > 0.35 && hsl.l < 0.26) {
    col.lerp(new THREE.Color(0xcbd5e1), metalness * 0.36);
    col.getHSL(hsl);
  }
  const boostedS = hsl.s > 0.05 ? Math.min(1.0, hsl.s * 1.2) : hsl.s;
  const boostedL = hsl.l < 0.08 ? Math.max(hsl.l, 0.09) : Math.min(0.95, hsl.l * 1.08);
  col.setHSL(hsl.h, boostedS, boostedL);

  if (std.emissive && (std.emissive.r > 0.05 || std.emissive.g > 0.05 || std.emissive.b > 0.05)) {
    col.lerp(std.emissive, 0.55);
  }
  return col;
}

function convertSpecialMaterialToCartoon(sourceMat: THREE.Material): THREE.Material {
  const cached = specialToonMatCache.get(sourceMat);
  if (cached) return cached;

  const std = sourceMat as THREE.MeshStandardMaterial;
  const col = std.color ? std.color.clone() : new THREE.Color(0xffffff);
  if (std.map) {
    std.map.colorSpace = THREE.SRGBColorSpace;
    col.setRGB(Math.max(col.r, 0.96), Math.max(col.g, 0.96), Math.max(col.b, 0.96));
  } else {
    col.copy(computeBoostedCartoonColor(sourceMat));
  }

  const isTransparent = Boolean(std.transparent && (std.opacity ?? 1) < 0.94);

  const toon = new THREE.MeshToonMaterial({
    color: col,
    map: std.map || null,
    gradientMap: getTrafficCartoonGradient(),
    emissive: std.emissive ? std.emissive.clone() : new THREE.Color(0x000000),
    emissiveMap: std.emissiveMap || null,
    emissiveIntensity: std.emissiveIntensity ?? 1.0,
    transparent: isTransparent,
    opacity: std.opacity ?? 1.0,
    alphaTest: std.alphaTest ?? 0,
    depthWrite: !isTransparent,
    side: std.side ?? THREE.FrontSide,
  });

  specialToonMatCache.set(sourceMat, toon);
  return toon;
}

/**
 * Converte uma geometria arbitrária do GLB em BufferGeometry limpa não-indexada
 * apenas com (position, normal, color) em Float32 para fusão 100% garantida no mergeGeometries.
 */
function bakeColoredGeometry(
  srcGeo: THREE.BufferGeometry,
  transform: THREE.Matrix4,
  color: THREE.Color
): THREE.BufferGeometry | null {
  let working = srcGeo.clone();
  if (working.index) {
    const nonIdx = working.toNonIndexed();
    working.dispose();
    working = nonIdx;
  }
  working.applyMatrix4(transform);

  const posAttr = working.attributes.position;
  if (!posAttr || posAttr.count === 0) {
    working.dispose();
    return null;
  }

  if (!working.attributes.normal || working.attributes.normal.count !== posAttr.count) {
    working.computeVertexNormals();
  }
  const normAttr = working.attributes.normal;
  const count = posAttr.count;

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const r = color.r;
  const g = color.g;
  const b = color.b;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = posAttr.getX(i);
    positions[i3 + 1] = posAttr.getY(i);
    positions[i3 + 2] = posAttr.getZ(i);

    normals[i3] = normAttr ? normAttr.getX(i) : 0;
    normals[i3 + 1] = normAttr ? normAttr.getY(i) : 1;
    normals[i3 + 2] = normAttr ? normAttr.getZ(i) : 0;

    colors[i3] = r;
    colors[i3 + 1] = g;
    colors[i3 + 2] = b;
  }

  working.dispose();

  const clean = new THREE.BufferGeometry();
  clean.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  clean.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  clean.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return clean;
}

function bakeOutlineGeometry(
  srcGeo: THREE.BufferGeometry,
  transform: THREE.Matrix4
): THREE.BufferGeometry | null {
  let working = srcGeo.clone();
  if (working.index) {
    const nonIdx = working.toNonIndexed();
    working.dispose();
    working = nonIdx;
  }
  working.applyMatrix4(transform);

  const posAttr = working.attributes.position;
  if (!posAttr || posAttr.count === 0) {
    working.dispose();
    return null;
  }

  if (!working.attributes.normal || working.attributes.normal.count !== posAttr.count) {
    working.computeVertexNormals();
  }
  const normAttr = working.attributes.normal;
  const count = posAttr.count;

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = posAttr.getX(i);
    positions[i3 + 1] = posAttr.getY(i);
    positions[i3 + 2] = posAttr.getZ(i);

    normals[i3] = normAttr ? normAttr.getX(i) : 0;
    normals[i3 + 1] = normAttr ? normAttr.getY(i) : 1;
    normals[i3 + 2] = normAttr ? normAttr.getZ(i) : 0;
  }

  working.dispose();

  const clean = new THREE.BufferGeometry();
  clean.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  clean.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return clean;
}

function findWheelSpinAncestor(obj: THREE.Object3D, stopAt: THREE.Object3D): THREE.Object3D | null {
  let cur: THREE.Object3D | null = obj;
  while (cur && cur !== stopAt) {
    if (cur.name.toLowerCase().includes('wheelspin')) {
      return cur;
    }
    cur = cur.parent;
  }
  return null;
}

function bakeSingleVehicleTemplate(
  def: TrafficVehicleDef,
  carsScene: THREE.Group,
  busesScene: THREE.Group
): BakedVehicleTemplate | null {
  const master = def.kind === 'bus' ? busesScene : carsScene;
  let sourceNode = master.getObjectByName(def.nodeName);
  if (!sourceNode) {
    master.traverse((obj) => {
      if (!sourceNode && obj.name.toLowerCase().includes(def.id.toLowerCase())) {
        sourceNode = obj;
      }
    });
  }
  if (!sourceNode) return null;

  // Grupo temporário na origem para assar transformações já alinhadas (+Z = frente na contramão, y = 0 no solo)
  const alignHolder = new THREE.Group();
  const clone = sourceNode.clone(true);
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, -Math.PI / 2, 0);
  clone.scale.setScalar(def.scale);
  alignHolder.add(clone);

  alignHolder.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(alignHolder);
  if (Number.isFinite(rawBox.min.y)) {
    clone.position.y -= rawBox.min.y;
  }
  alignHolder.updateMatrixWorld(true);
  const alignedBox = new THREE.Box3().setFromObject(alignHolder);

  const width = Math.max(1.3, alignedBox.max.x - alignedBox.min.x);
  const length = Math.max(2.6, alignedBox.max.z - alignedBox.min.z);
  const height = Math.max(1.2, alignedBox.max.y - alignedBox.min.y);

  const bodyGeos: THREE.BufferGeometry[] = [];
  const outlineGeos: THREE.BufferGeometry[] = [];
  const fallbackHullGeos: THREE.BufferGeometry[] = [];
  const axleBuckets = new Map<
    string,
    { wy: number; wz: number; geos: THREE.BufferGeometry[] }
  >();
  const specials: BakedSpecialMeshTemplate[] = [];

  const localBox = new THREE.Box3();
  const sizeVec = new THREE.Vector3();
  const wheelPos = new THREE.Vector3();
  const shiftMat = new THREE.Matrix4();
  const relMat = new THREE.Matrix4();

  clone.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    if (!mesh.geometry) return;

    if (!mesh.geometry.boundingBox) {
      mesh.geometry.computeBoundingBox();
    }
    if (mesh.geometry.boundingBox) {
      localBox.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
      localBox.getSize(sizeVec);
    } else {
      sizeVec.set(1, 1, 1);
    }
    const worldDiag = sizeVec.length();

    // Descarta micro-parafusos e rebites invisíveis (< 4.5cm) para máxima leveza
    if (worldDiag < 0.045) return;

    const lowerName = mesh.name.toLowerCase();
    const isNativeOutline =
      Boolean(mesh.userData?.isCartoonOutline) || lowerName.includes('outline');

    if (isNativeOutline) {
      // Mantém contornos apenas de peças relevantes (carroceria, pneus, teto, para-choques)
      if (worldDiag >= 0.18) {
        const outG = bakeOutlineGeometry(mesh.geometry, mesh.matrixWorld);
        if (outG) outlineGeos.push(outG);
      }
      return;
    }

    const rawMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!rawMat) return;
    const std = rawMat as THREE.MeshStandardMaterial;
    const hasTexture = Boolean(std.map || std.emissiveMap);
    const isTransparent = Boolean(std.transparent && (std.opacity ?? 1) < 0.94);

    // Verifica se pertence a uma roda giratória (*WheelSpin)
    const wheelSpinNode = findWheelSpinAncestor(mesh, clone);
    if (wheelSpinNode && !hasTexture && !isTransparent) {
      wheelPos.setFromMatrixPosition(wheelSpinNode.matrixWorld);
      const axleKey = `${Math.round(wheelPos.z * 8) / 8}`;
      let bucket = axleBuckets.get(axleKey);
      if (!bucket) {
        bucket = { wy: wheelPos.y, wz: wheelPos.z, geos: [] };
        axleBuckets.set(axleKey, bucket);
      }
      shiftMat.makeTranslation(0, -bucket.wy, -bucket.wz);
      relMat.multiplyMatrices(shiftMat, mesh.matrixWorld);
      const col = computeBoostedCartoonColor(rawMat);
      const wg = bakeColoredGeometry(mesh.geometry, relMat, col);
      if (wg) bucket.geos.push(wg);
      return;
    }

    // Vidros translúcidos ou adesivos/placas com textura (apenas ~3 a 5 por veículo)
    if (hasTexture || isTransparent) {
      const specialMat = convertSpecialMaterialToCartoon(rawMat);
      specials.push({
        geometry: mesh.geometry.clone(),
        material: specialMat,
        matrix: mesh.matrixWorld.clone(),
      });
      return;
    }

    // Peça sólida opaca -> funde tudo em UMA ÚNICA malha com Vertex Colors!
    const col = computeBoostedCartoonColor(rawMat);
    const bg = bakeColoredGeometry(mesh.geometry, mesh.matrixWorld, col);
    if (bg) bodyGeos.push(bg);

    // Guarda contorno reserva para carrocerias grandes caso o ônibus/carro não tenha outline nativo
    if (worldDiag >= 0.48 && !lowerName.includes('glass') && !lowerName.includes('window')) {
      const fg = bakeOutlineGeometry(mesh.geometry, mesh.matrixWorld);
      if (fg) fallbackHullGeos.push(fg);
    }
  });

  const mergedBodyGeo =
    bodyGeos.length > 0 ? mergeGeometries(bodyGeos, false) : null;
  for (const g of bodyGeos) g.dispose();

  const chosenOutlineSource = outlineGeos.length > 0 ? outlineGeos : fallbackHullGeos;
  const mergedOutlineGeo =
    chosenOutlineSource.length > 0 ? mergeGeometries(chosenOutlineSource, false) : null;
  for (const g of outlineGeos) g.dispose();
  for (const g of fallbackHullGeos) g.dispose();

  const axles: BakedAxleTemplate[] = [];
  for (const bucket of axleBuckets.values()) {
    if (bucket.geos.length === 0) continue;
    const mergedAxle = mergeGeometries(bucket.geos, false);
    for (const g of bucket.geos) g.dispose();
    if (mergedAxle) {
      axles.push({
        geometry: mergedAxle,
        y: bucket.wy,
        z: bucket.wz,
      });
    }
  }

  // Funde os 2 faróis dianteiros em 1 única geometria (1 draw call em vez de 2!)
  const frontZ = alignedBox.max.z + 0.04;
  const headlightY = def.kind === 'bus' ? 0.62 : 0.52;
  const headlightSpreadX = width * 0.34;
  const leftFlare = new THREE.PlaneGeometry(0.52, 0.52);
  leftFlare.translate(-headlightSpreadX, headlightY, frontZ);
  const rightFlare = new THREE.PlaneGeometry(0.52, 0.52);
  rightFlare.translate(headlightSpreadX, headlightY, frontZ);
  const headlightGeo = mergeGeometries([leftFlare, rightFlare], false) || leftFlare;
  if (headlightGeo !== leftFlare) leftFlare.dispose();
  rightFlare.dispose();

  const shadowGeo = new THREE.PlaneGeometry(width * 1.12, length * 1.08);

  return {
    def,
    bodyGeo: mergedBodyGeo,
    outlineGeo: mergedOutlineGeo,
    axles,
    specials,
    shadowGeo,
    headlightGeo,
    width,
    length,
    height,
  };
}

function disposeRawSceneGeometries(root: THREE.Object3D) {
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.isMesh && m.geometry) {
      m.geometry.dispose();
    }
  });
  root.clear();
}

function ensureBakedTemplates(): Promise<Map<string, BakedVehicleTemplate>> {
  if (cachedTemplates) return Promise.resolve(cachedTemplates);
  if (templateBuildPromise) return templateBuildPromise;

  const loader = new GLTFLoader();
  const loadOne = (url: string) =>
    new Promise<THREE.Group>((resolve, reject) => {
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (err) => reject(err)
      );
    });

  templateBuildPromise = Promise.all([
    loadOne('/assets/traffic/cars_11_cartoon.glb'),
    loadOne('/assets/traffic/buses_3_cartoon.glb'),
  ])
    .then(([carsScene, busesScene]) => {
      const map = new Map<string, BakedVehicleTemplate>();
      for (const def of TRAFFIC_VEHICLES_CATALOG) {
        const tpl = bakeSingleVehicleTemplate(def, carsScene, busesScene);
        if (tpl) {
          map.set(def.id, tpl);
        }
      }
      // Descarta imediatamente as cenas brutas dos 14 veículos para liberar RAM e VRAM!
      disposeRawSceneGeometries(carsScene);
      disposeRawSceneGeometries(busesScene);
      cachedTemplates = map;
      return map;
    })
    .catch((err) => {
      templateBuildPromise = null;
      throw err;
    });

  return templateBuildPromise;
}

function instantiateFromTemplate(tpl: BakedVehicleTemplate): PooledTrafficVehicle {
  const { def, width, length, height } = tpl;
  const root = new THREE.Group();
  root.name = `Traffic_${def.id}`;

  if (tpl.bodyGeo) {
    const bodyMesh = new THREE.Mesh(tpl.bodyGeo, getSharedVertexColorToonMat());
    root.add(bodyMesh);
  }

  if (tpl.outlineGeo) {
    const outlineMesh = new THREE.Mesh(tpl.outlineGeo, getTrafficBlackOutlineMat());
    root.add(outlineMesh);
  }

  const wheelPivots: THREE.Object3D[] = [];
  const toonMat = getSharedVertexColorToonMat();
  for (const axle of tpl.axles) {
    const axleMesh = new THREE.Mesh(axle.geometry, toonMat);
    axleMesh.position.set(0, axle.y, axle.z);
    root.add(axleMesh);
    wheelPivots.push(axleMesh);
  }

  for (const sp of tpl.specials) {
    const sm = new THREE.Mesh(sp.geometry, sp.material);
    sm.matrixAutoUpdate = false;
    sm.matrix.copy(sp.matrix);
    root.add(sm);
  }

  const contactShadow = new THREE.Mesh(tpl.shadowGeo, getTrafficContactShadowMat());
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.02, 0);
  root.add(contactShadow);

  const headlights = new THREE.Mesh(tpl.headlightGeo, getHeadlightGlowMat());
  root.add(headlights);

  root.visible = false;

  const instance: PooledTrafficVehicle = {
    def,
    root,
    contactShadow,
    wheelPivots,
    halfWidth: (width * 0.84) / 2,
    halfLength: (length * 0.86) / 2,
    height,
    inUse: false,
    lane: 0,
    x: 0,
    z: -140,
    speedMs: def.baseSpeedMs,
    wheelAngle: 0,
    nearMissAwarded: false,
    honked: false,
    spinWheels(dt: number, groundSpeed: number) {
      const omega = (groundSpeed / def.wheelRadiusM) * dt;
      instance.wheelAngle = (instance.wheelAngle + omega) % (Math.PI * 2);
      for (let i = 0; i < wheelPivots.length; i++) {
        // Eixo X gira o pneu para frente (+Z) na direção da moto!
        wheelPivots[i].rotation.x = instance.wheelAngle;
      }
    },
  };

  return instance;
}

/**
 * Cria o Object Pool enxuto com apenas os 7 veículos diferentes ultra-otimizados.
 * Veículos inativos ficam fora do grafo de renderização (scene) e são removidos assim que passam da câmera!
 */
export async function createTrafficVehiclePool(): Promise<PooledTrafficVehicle[]> {
  const templates = await ensureBakedTemplates();
  const pool: PooledTrafficVehicle[] = [];

  for (const def of TRAFFIC_VEHICLES_CATALOG) {
    const tpl = templates.get(def.id);
    if (tpl) {
      pool.push(instantiateFromTemplate(tpl));
    }
  }

  return pool;
}
