import * as THREE from 'three';
import {
  DEFAULT_WORLD_CURVE_Y,
  WORLD_CURVE_START_Z,
  type HouseVariationSpec,
  type ObstacleKind,
  type TreeType,
} from './rules';
import {
  getHandPaintedWallTexture,
  getHandPaintedRoofTexture,
  getHandPaintedDoorTexture,
  getHandPaintedWindowTexture,
  getHandPaintedGarageGateTexture,
  createBrazilFlagTexture,
  createBillboardAdTexture,
  createMercadinhoSignTexture,
  createFloralGardenCutoutTexture,
  createBuildingGraffitiMuralTexture,
  getRioBuildingFacadeTexture,
  getFavelaHouseTexture,
} from './textures';

export interface HorizonDepthFogConfig {
  minFog: number;
  maxFog: number;
  clearHeightY: number;
}

/**
 * Shared uniforms driving the dynamic downward horizon curvature ("efeito de curva pra baixo lá no horizonte")
 * and the Dynamic Atmospheric Depth Fog on distant buildings and mountains.
 */
export const worldCurveUniforms = {
  uWorldCurveY: { value: DEFAULT_WORLD_CURVE_Y },
  uWorldCurveX: { value: 0.0 },
  uCurveStartZ: { value: WORLD_CURVE_START_Z },
  uHorizonFogColor: { value: new THREE.Color('#F1D4B8') },
  uHorizonFogSkyTint: { value: new THREE.Color('#C8BFE7') },
  uHorizonFogPulse: { value: 0.0 },
};

const curvedMaterialInstances = new WeakSet<THREE.Material>();

/**
 * Injects the world-space downward horizon curvature into any Three.js material vertex shader,
 * plus optional Dynamic Atmospheric Depth Fog for distant horizon buildings and mountains.
 * Uses a WeakSet per Material instance so cloned materials (.clone()) always receive their own
 * onBeforeCompile curvature hook even when userData is shallow-copied!
 */
export function applyWorldCurvatureToMaterial(mat: THREE.Material): void {
  if (!mat || curvedMaterialInstances.has(mat)) return;
  curvedMaterialInstances.add(mat);
  mat.userData.hasWorldCurvature = true;

  const fogCfg = mat.userData.horizonDepthFog as HorizonDepthFogConfig | undefined;

  const prevCompile = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    if (prevCompile) prevCompile(shader, renderer);
    shader.uniforms.uWorldCurveY = worldCurveUniforms.uWorldCurveY;
    shader.uniforms.uWorldCurveX = worldCurveUniforms.uWorldCurveX;
    shader.uniforms.uCurveStartZ = worldCurveUniforms.uCurveStartZ;
    shader.uniforms.uHorizonFogColor = worldCurveUniforms.uHorizonFogColor;
    shader.uniforms.uHorizonFogSkyTint = worldCurveUniforms.uHorizonFogSkyTint;
    shader.uniforms.uHorizonFogPulse = worldCurveUniforms.uHorizonFogPulse;

    if (!shader.vertexShader.includes('uniform float uWorldCurveY;')) {
      shader.vertexShader =
        `uniform float uWorldCurveY;\nuniform float uWorldCurveX;\nuniform float uCurveStartZ;\nvarying vec3 vCurvedWorldPos;\nvarying float vCameraDepth;\n` +
        shader.vertexShader;
    }

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      vec4 wp = modelMatrix * mvPosition;
      float curveDist = max(0.0, -(wp.z - uCurveStartZ));
      float curveDistSq = curveDist * curveDist;
      wp.y -= uWorldCurveY * curveDistSq;
      wp.x += uWorldCurveX * curveDistSq;
      vCurvedWorldPos = wp.xyz;
      mvPosition = viewMatrix * wp;
      vCameraDepth = -mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;`,
    );

    if (fogCfg && !shader.fragmentShader.includes('uniform vec3 uHorizonFogColor;')) {
      shader.fragmentShader =
        `uniform vec3 uHorizonFogColor;\nuniform vec3 uHorizonFogSkyTint;\nuniform float uHorizonFogPulse;\nvarying vec3 vCurvedWorldPos;\nvarying float vCameraDepth;\n` +
        shader.fragmentShader;

      const minF = fogCfg.minFog.toFixed(3);
      const maxF = fogCfg.maxFog.toFixed(3);
      const clearY = fogCfg.clearHeightY.toFixed(1);

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        float distDepthRatio = smoothstep(55.0, 155.0, vCameraDepth);
        float verticalHaze = 1.0 - smoothstep(2.0, ${clearY}, vCurvedWorldPos.y);
        float dynamicPulse = 0.045 * sin(vCurvedWorldPos.x * 0.06 + uHorizonFogPulse) + 0.03 * cos(vCurvedWorldPos.y * 0.08 - uHorizonFogPulse * 0.7);
        float rawFogMix = mix(${minF}, ${maxF}, clamp(verticalHaze * 0.68 + distDepthRatio * 0.32 + dynamicPulse, 0.0, 1.0));
        float finalDepthFog = clamp(rawFogMix * smoothstep(45.0, 85.0, vCameraDepth), 0.0, ${maxF});
        vec3 atmosphericTint = mix(uHorizonFogColor, uHorizonFogSkyTint, clamp((vCurvedWorldPos.y - 4.0) / 38.0, 0.0, 0.65));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, atmosphericTint, finalDepthFog);`,
      );
    }
  };
}

export function applyWorldCurvatureToGroup(
  root: THREE.Object3D,
  horizonDepthFog?: HorizonDepthFogConfig,
): void {
  root.traverse((obj) => {
    if ((obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) && obj.material) {
      const applyMat = (m: THREE.Material) => {
        if (horizonDepthFog && !m.userData.horizonDepthFog) {
          m.userData.horizonDepthFog = horizonDepthFog;
        }
        applyWorldCurvatureToMaterial(m);
      };
      if (Array.isArray(obj.material)) {
        for (const m of obj.material) applyMat(m);
      } else {
        applyMat(obj.material);
      }
    }
  });
}

const cartoonInkLineMat = new THREE.LineBasicMaterial({
  color: 0x1e1b18,
  transparent: true,
  opacity: 0.72,
});
applyWorldCurvatureToMaterial(cartoonInkLineMat);

const cartoonInkHullMat = new THREE.MeshBasicMaterial({
  color: 0x1e1b18,
  side: THREE.BackSide,
});
applyWorldCurvatureToMaterial(cartoonInkHullMat);

const edgesGeoCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();
function getCachedEdgesGeo(geo: THREE.BufferGeometry): THREE.EdgesGeometry {
  let edges = edgesGeoCache.get(geo);
  if (!edges) {
    edges = new THREE.EdgesGeometry(geo, 24);
    edgesGeoCache.set(geo, edges);
  }
  return edges;
}

/**
 * Applies discreet, thin black cartoon outlines ("Hand-Painted Cartoon + Thin Black Outlines")
 * to houses, favelas, trees, buildings, and props without heavy or thick lines.
 */
export function addCartoonOutlinesToGroup(root: THREE.Object3D): void {
  const meshes: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && !obj.userData.hasCartoonOutline && !obj.userData.isOutlineMesh) {
      meshes.push(obj);
    }
  });

  for (const mesh of meshes) {
    mesh.userData.hasCartoonOutline = true;
    if (mesh.userData.noCartoonOutline) continue;
    const geo = mesh.geometry;
    if (!geo || geo === sharedGeos.contactShadow) continue;

    // Skip ultra-thin wires or tiny rebar cylinders
    if (geo.type === 'TubeGeometry' || geo.type === 'PlaneGeometry') continue;
    if (
      geo === sharedGeos.cylinder &&
      Math.min(Math.abs(mesh.scale.x), Math.abs(mesh.scale.z)) < 0.08
    ) {
      continue;
    }

    if (geo === sharedGeos.sphere) {
      // Subtle backface inverted-hull ink outline for organic rounded tree foliage & bushes
      const hull = new THREE.Mesh(geo, cartoonInkHullMat);
      hull.userData.isOutlineMesh = true;
      hull.scale.set(1.038, 1.038, 1.038);
      mesh.add(hull);
    } else {
      // Crisp thin black edge linework for architectural boxes, roofs, water tanks, cones & columns
      const line = new THREE.LineSegments(getCachedEdgesGeo(geo), cartoonInkLineMat);
      line.userData.isOutlineMesh = true;
      mesh.add(line);
    }
  }
}

interface CachedLodLists {
  lod0OnlyNodes: THREE.Object3D[];
  lod1MaxNodes: THREE.Object3D[];
  occludableLowerNodes: THREE.Object3D[];
}

function getOrBuildLodCache(group: THREE.Object3D): CachedLodLists {
  if (group.userData.cachedLodLists) {
    return group.userData.cachedLodLists as CachedLodLists;
  }

  const lod0OnlyNodes: THREE.Object3D[] = [];
  const lod1MaxNodes: THREE.Object3D[] = [];
  const occludableLowerNodes: THREE.Object3D[] = [];

  group.traverse((obj) => {
    if (obj === group) return;

    if (obj.userData.occludableLowerTier) {
      occludableLowerNodes.push(obj);
      return;
    }

    // Thin cartoon outlines & backface hulls are LOD0-only (<= 36m) to cut draw calls in half at distance
    if (obj instanceof THREE.LineSegments || obj.userData.isOutlineMesh) {
      lod0OnlyNodes.push(obj);
      return;
    }

    if (obj instanceof THREE.Mesh) {
      if (obj.geometry?.type === 'TubeGeometry') {
        // Overhead sagging wires visible in LOD0 & LOD1, hidden in far LOD2
        lod1MaxNodes.push(obj);
        return;
      }

      const sx = Math.abs(obj.scale.x);
      const sy = Math.abs(obj.scale.y);
      const sz = Math.abs(obj.scale.z);
      const approxVol = sx * sy * sz;

      // Tiny details (rebars, bricks, antenna dipoles, clothes, rafters, meters, grilles) -> LOD0 only
      if (approxVol < 0.24 || Math.min(sx, sy, sz) < 0.07) {
        lod0OnlyNodes.push(obj);
      } else if (approxVol < 1.85) {
        // Medium architectural details (windows, doors, water tanks, balconies, steps) -> LOD0 & LOD1
        lod1MaxNodes.push(obj);
      }
    }
  });

  const lists: CachedLodLists = { lod0OnlyNodes, lod1MaxNodes, occludableLowerNodes };
  group.userData.cachedLodLists = lists;
  return lists;
}

/**
 * Applies automatic Level of Detail (LOD0 / LOD1 / LOD2) and Occlusion Culling
 * to any 3D group in O(1) time when state is unchanged.
 */
export function applyGroupLodState(
  group: THREE.Object3D,
  lod: 0 | 1 | 2,
  lowerTierOccluded = false,
): void {
  if (
    group.userData.currentLod === lod &&
    group.userData.currentLowerOcc === lowerTierOccluded
  ) {
    return;
  }

  group.userData.currentLod = lod;
  group.userData.currentLowerOcc = lowerTierOccluded;

  const { lod0OnlyNodes, lod1MaxNodes, occludableLowerNodes } = getOrBuildLodCache(group);

  const showLod0 = lod === 0;
  for (let i = 0; i < lod0OnlyNodes.length; i++) {
    lod0OnlyNodes[i].visible = showLod0;
  }

  const showLod1 = lod <= 1;
  for (let i = 0; i < lod1MaxNodes.length; i++) {
    lod1MaxNodes[i].visible = showLod1;
  }

  const showLower = !lowerTierOccluded && lod <= 1;
  for (let i = 0; i < occludableLowerNodes.length; i++) {
    occludableLowerNodes[i].visible = showLower;
  }
}

interface HouseFadeMatEntry {
  mat: THREE.Material;
  baseOpacity: number;
  baseTransparent: boolean;
}

/**
 * Smoothly updates the transparency and horizon emergence of distant houses further ahead down the street
 * ("deixe mais fluido e suave a renderizacao das casas la na frente, para nao ficar aparecendo do nada")
 * across ALL meshes and outlines in the house group in O(1) time using per-slot cloned materials.
 */
export function applyHouseDistanceOpacity(group: THREE.Object3D, opacity: number): void {
  const clamped = Math.max(0, Math.min(1, opacity));
  const rounded = Math.round(clamped * 50) / 50;
  if (group.userData.lastHouseOpacity === rounded) return;
  group.userData.lastHouseOpacity = rounded;

  let entries = group.userData.allFadeableMatEntries as HouseFadeMatEntry[] | undefined;
  if (!entries) {
    entries = [];
    const clonedMap = new Map<THREE.Material, THREE.Material>();

    const cloneMatForHouse = (orig: THREE.Material): THREE.Material => {
      let cloned = clonedMap.get(orig);
      if (!cloned) {
        cloned = orig.clone();
        cloned.userData = { ...orig.userData, hasWorldCurvature: false };
        applyWorldCurvatureToMaterial(cloned);
        clonedMap.set(orig, cloned);
        entries!.push({
          mat: cloned,
          baseOpacity: orig.opacity ?? 1.0,
          baseTransparent: Boolean(orig.transparent),
        });
      }
      return cloned;
    };

    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map((m) => cloneMatForHouse(m));
        } else if (obj.material) {
          obj.material = cloneMatForHouse(obj.material);
        }
      }
    });
    group.userData.allFadeableMatEntries = entries;
  }

  const isTranslucent = rounded < 0.99;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const m = entry.mat;
    const nextTrans = isTranslucent || entry.baseTransparent;
    if (m.transparent !== nextTrans) {
      m.transparent = nextTrans;
      m.needsUpdate = true;
    }
    m.opacity = entry.baseOpacity * rounded;
  }
}

/**
 * Smoothly updates the fade-out opacity ("efeito de sumindo") on distant and upper-tier hillside favela houses
 * in O(1) time using cached material lists per favela cluster.
 */
export function applyFavelaDistanceOpacity(
  group: THREE.Object3D,
  lowerOpacity: number,
  upperOpacity: number,
): void {
  const rLower = Math.round(lowerOpacity * 40) / 40;
  const rUpper = Math.round(upperOpacity * 40) / 40;
  if (
    group.userData.lastFavelaLowerOp === rLower &&
    group.userData.lastFavelaUpperOp === rUpper
  ) {
    return;
  }
  group.userData.lastFavelaLowerOp = rLower;
  group.userData.lastFavelaUpperOp = rUpper;

  let lowerMats = group.userData.favelaLowerMats as THREE.Material[] | undefined;
  let upperMats = group.userData.favelaUpperMats as THREE.Material[] | undefined;
  if (!lowerMats || !upperMats) {
    lowerMats = [];
    upperMats = [];
    const seen = new Set<THREE.Material>();
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.Material) {
        const m = obj.material;
        if (m.userData.isFavelaFadeMat && !seen.has(m)) {
          seen.add(m);
          if (m.userData.isUpperFavelaTier) {
            upperMats!.push(m);
          } else {
            lowerMats!.push(m);
          }
        }
      }
    });
    group.userData.favelaLowerMats = lowerMats;
    group.userData.favelaUpperMats = upperMats;
  }

  const lowerTrans = rLower < 0.99;
  for (let i = 0; i < lowerMats.length; i++) {
    const m = lowerMats[i];
    if (m.transparent !== lowerTrans) {
      m.transparent = lowerTrans;
      m.needsUpdate = true;
    }
    m.opacity = rLower;
  }

  const upperTrans = rUpper < 0.99;
  for (let i = 0; i < upperMats.length; i++) {
    const m = upperMats[i];
    if (m.transparent !== upperTrans) {
      m.transparent = upperTrans;
      m.needsUpdate = true;
    }
    m.opacity = rUpper;
  }
}

const sharedGeos = {
  // Subdivided along X/Z so wide houses, foundations, and roofs bend smoothly along the street curvature
  unitBox: new THREE.BoxGeometry(1, 1, 1, 3, 1, 3),
  tallBox: new THREE.BoxGeometry(1, 1, 1, 1, 6, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
  sphere: new THREE.SphereGeometry(1, 10, 8),
  cone: new THREE.ConeGeometry(1, 1, 10),
  contactShadow: new THREE.CircleGeometry(1, 14),
};


const sharedMats = {
  contactShadow: new THREE.MeshBasicMaterial({
    color: 0x09060c,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  }),
  concreteStep: new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    roughness: 0.85,
    metalness: 0.05,
  }),
  rawConcretePillar: new THREE.MeshStandardMaterial({
    color: 0x78716c,
    roughness: 0.9,
    metalness: 0.05,
  }),
  clayBrick: new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    roughness: 0.85,
    metalness: 0.04,
  }),
  clayBrickDark: new THREE.MeshStandardMaterial({
    color: 0x9a3412,
    roughness: 0.88,
    metalness: 0.04,
  }),
  sandPile: new THREE.MeshStandardMaterial({
    color: 0xd6b87c,
    roughness: 0.95,
    metalness: 0.02,
  }),
  vacantDirt: new THREE.MeshStandardMaterial({
    color: 0x5c4028,
    roughness: 0.96,
    metalness: 0.02,
  }),
  darkMetal: new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.45,
    metalness: 0.65,
  }),
  galvanizedSteel: new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.35,
    metalness: 0.7,
  }),
  meterBox: new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.55,
    metalness: 0.4,
  }),
  meterGlass: new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.2,
    metalness: 0.2,
    emissive: 0x0284c7,
    emissiveIntensity: 0.3,
  }),
  rafterWood: new THREE.MeshStandardMaterial({
    color: 0x5c2e14,
    roughness: 0.8,
    metalness: 0.05,
  }),
  scaffoldWood: new THREE.MeshStandardMaterial({
    color: 0x854d0e,
    roughness: 0.85,
    metalness: 0.04,
  }),
  waterTankBlue: new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.45,
    metalness: 0.1,
  }),
  terracottaPot: new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    roughness: 0.75,
    metalness: 0.05,
  }),
  foliageGreen: new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.68,
    metalness: 0.05,
  }),
  foliageLime: new THREE.MeshStandardMaterial({
    color: 0x65a30d,
    roughness: 0.65,
    metalness: 0.05,
  }),
  ipeYellow: new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.55,
    metalness: 0.05,
  }),
  bougainvilleaPink: new THREE.MeshStandardMaterial({
    color: 0xec4899,
    roughness: 0.6,
    metalness: 0.05,
  }),
  trunkWood: new THREE.MeshStandardMaterial({
    color: 0x713f12,
    roughness: 0.88,
    metalness: 0.02,
  }),
  wireBlack: new THREE.MeshBasicMaterial({
    color: 0x18181b,
  }),
  poleConcrete: new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.82,
    metalness: 0.08,
  }),
  lampGlow: new THREE.MeshBasicMaterial({
    color: 0xfef08a,
  }),
  coneOrange: new THREE.MeshStandardMaterial({
    color: 0xff5500,
    roughness: 0.42,
    metalness: 0.08,
  }),
  coneWhite: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.05,
    emissive: 0xffffff,
    emissiveIntensity: 0.18,
  }),
  coinGold: new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.22,
    metalness: 0.75,
    emissive: 0xca8a04,
    emissiveIntensity: 0.25,
  }),
  brazilGreen: new THREE.MeshStandardMaterial({
    color: 0x009b3a,
    roughness: 0.42,
    metalness: 0.12,
  }),
  brazilYellow: new THREE.MeshStandardMaterial({
    color: 0xfedf00,
    roughness: 0.38,
    metalness: 0.15,
  }),
  emeraldGlass: new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.18,
    metalness: 0.35,
    transparent: true,
    opacity: 0.82,
  }),
  whiteMarble: new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.38,
    metalness: 0.08,
  }),
  araraBlue: new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.45,
    metalness: 0.08,
  }),
  araraCyan: new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.45,
    metalness: 0.08,
  }),
  papagaioGreen: new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.48,
    metalness: 0.05,
  }),
  birdRed: new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.48,
    metalness: 0.05,
  }),
};

/**
 * Builds a stylized tropical Brazilian tree (Mango, Banana, Ipê-Amarelo, Palm, or Bougainvillea)
 */
export function buildTropicalTree(type: TreeType): THREE.Group {
  const group = new THREE.Group();
  if (type === 'none') return group;

  if (type === 'palm') {
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(sharedGeos.cylinder, sharedMats.trunkWood);
      const r = 0.24 - i * 0.025;
      seg.scale.set(r, 0.95, r);
      seg.position.set(i * 0.06, 0.45 + i * 0.85, 0);
      seg.rotation.z = -0.06 * i;
      group.add(seg);
    }
    for (let f = 0; f < 6; f++) {
      const angle = (f / 6) * Math.PI * 2;
      const frond = new THREE.Mesh(sharedGeos.unitBox, sharedMats.foliageLime);
      frond.scale.set(1.9, 0.14, 0.55);
      frond.position.set(0.25 + Math.cos(angle) * 0.85, 4.5, Math.sin(angle) * 0.85);
      frond.rotation.y = -angle;
      frond.rotation.z = -0.35;
      group.add(frond);
    }
    return group;
  }

  if (type === 'banana') {
    const stem = new THREE.Mesh(sharedGeos.cylinder, sharedMats.foliageLime);
    stem.scale.set(0.22, 2.4, 0.22);
    stem.position.set(0, 1.2, 0);
    group.add(stem);

    for (let l = 0; l < 5; l++) {
      const a = (l / 5) * Math.PI * 2 + 0.3;
      const leaf = new THREE.Mesh(sharedGeos.unitBox, sharedMats.foliageGreen);
      leaf.scale.set(1.65, 0.08, 0.62);
      leaf.position.set(Math.cos(a) * 0.72, 2.35 + (l % 2) * 0.22, Math.sin(a) * 0.72);
      leaf.rotation.y = -a;
      leaf.rotation.z = -0.28;
      group.add(leaf);
    }
    return group;
  }

  const trunk = new THREE.Mesh(sharedGeos.cylinder, sharedMats.trunkWood);
  trunk.scale.set(0.28, 2.6, 0.28);
  trunk.position.set(0, 1.3, 0);
  group.add(trunk);

  const crownMat =
    type === 'ipe_amarelo'
      ? sharedMats.ipeYellow
      : type === 'bougainvillea'
        ? sharedMats.bougainvilleaPink
        : sharedMats.foliageGreen;

  const puffs = [
    { x: 0, y: 3.1, z: 0, r: 1.35 },
    { x: -0.75, y: 2.75, z: 0.4, r: 0.95 },
    { x: 0.78, y: 2.8, z: -0.3, r: 1.0 },
    { x: 0.2, y: 3.75, z: 0.2, r: 0.9 },
  ];
  for (const p of puffs) {
    const puff = new THREE.Mesh(sharedGeos.sphere, crownMat);
    puff.scale.set(p.r, p.r * 0.85, p.r);
    puff.position.set(p.x, p.y, p.z);
    group.add(puff);
  }

  return group;
}

/**
 * Builds a 3D Volumetric Multi-Plane Illustrated PNG Cutout Arrangement ("em png desenho pra dar sensacao 3d")
 * featuring lush grass blades, golden Sunflowers ("Girassóis"), and Red/Pink Roses ("Rosas").
 * Uses 3 intersecting angled cutout planes so the arrangement looks rich and three-dimensional from every camera angle!
 */
function buildFloralGardenCutoutCluster(
  width: number,
  height: number,
  variantSeed: number,
  maxAnisotropy = 4,
): THREE.Group {
  const cluster = new THREE.Group();
  const planeGeo = new THREE.PlaneGeometry(width, height);

  const frontTex = createFloralGardenCutoutTexture(variantSeed, maxAnisotropy);
  const crossTex1 = createFloralGardenCutoutTexture(variantSeed + 1, maxAnisotropy);
  const crossTex2 = createFloralGardenCutoutTexture(variantSeed + 2, maxAnisotropy);

  const makeCutoutMat = (tex: THREE.CanvasTexture) => {
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
    });
    mat.userData.isHouseFadeableMat = true;
    applyWorldCurvatureToMaterial(mat);
    return mat;
  };

  // 1. Primary street-facing floral & grass cutout plane
  const frontPlane = new THREE.Mesh(planeGeo, makeCutoutMat(frontTex));
  frontPlane.position.set(0, height * 0.46, 0.04);
  frontPlane.userData.noCartoonOutline = true;
  cluster.add(frontPlane);

  // 2. Angled cross-plane (+28 deg) facing the oncoming camera for 3D depth parallax
  const crossLeft = new THREE.Mesh(planeGeo, makeCutoutMat(crossTex1));
  crossLeft.scale.set(0.88, 0.96, 1.0);
  crossLeft.position.set(-width * 0.06, height * 0.45, 0);
  crossLeft.rotation.y = 0.48;
  crossLeft.userData.noCartoonOutline = true;
  cluster.add(crossLeft);

  // 3. Opposite angled cross-plane (-28 deg) completing the 3D bouquet volume
  const crossRight = new THREE.Mesh(planeGeo, makeCutoutMat(crossTex2));
  crossRight.scale.set(0.88, 0.96, 1.0);
  crossRight.position.set(width * 0.06, height * 0.45, -0.03);
  crossRight.rotation.y = -0.48;
  crossRight.userData.noCartoonOutline = true;
  cluster.add(crossRight);

  return cluster;
}

/**
 * Builds a 2-Story Brazilian Brick House Under Construction ("Casa Nova em Construção de 2 Andares em Tijolo Baiano")
 * with ground-floor brick masonry, poured 2nd-floor concrete slab (laje) with timber shores (escoras) & scaffolding (andaimes),
 * and 2nd-story half-built brick walls with raw concrete columns and exposed steel rebar (vergalhões).
 */
function buildVacantLotOrBrickConstruction(
  variantSeed: number,
  lotWidth: number,
  lotDepth: number,
): THREE.Group {
  const g = new THREE.Group();

  // 1. Earthy construction lot ground patch with deep grounding skirt so it never floats on the curved street
  const dirtPatch = new THREE.Mesh(sharedGeos.unitBox, sharedMats.vacantDirt);
  dirtPatch.scale.set(lotWidth - 0.2, 0.48, lotDepth * 0.94);
  dirtPatch.position.set(0, -0.1, 0);
  g.add(dirtPatch);

  for (let b = 0; b < 3; b++) {
    const bx = -lotWidth * 0.34 + b * 0.32 * lotWidth;
    const bz = -lotDepth * 0.28 + ((b * 3) % 3) * 0.85;
    const floralCluster = buildFloralGardenCutoutCluster(1.25, 0.72, variantSeed + b);
    floralCluster.position.set(bx, 0.12, bz);
    g.add(floralCluster);
  }

  const wallW = Math.min(lotWidth * 0.82, 5.4);
  const wallD = lotDepth * 0.74;
  const zFront = wallD * 0.5;
  const groundH = 2.75;
  const slabY = groundH + 0.12;
  const secondFloorH = 2.25;

  // 2. First Story (Térreo) Red Clay Brick Walls ("Alvenaria de Tijolo Baiano do 1º Andar")
  // Left & Right front wall piers framing an open doorway & window opening
  const frontLeftPier = new THREE.Mesh(sharedGeos.unitBox, sharedMats.clayBrick);
  frontLeftPier.scale.set(wallW * 0.34, groundH, 0.26);
  frontLeftPier.position.set(-wallW * 0.33, groundH * 0.5 + 0.08, zFront);
  g.add(frontLeftPier);

  const frontRightPier = new THREE.Mesh(sharedGeos.unitBox, sharedMats.clayBrick);
  frontRightPier.scale.set(wallW * 0.36, groundH * 0.46, 0.26);
  frontRightPier.position.set(wallW * 0.28, groundH * 0.23 + 0.08, zFront);
  g.add(frontRightPier);

  // Concrete lintel beam ("viga cinta de amarração") above ground floor openings
  const groundLintel = new THREE.Mesh(sharedGeos.unitBox, sharedMats.rawConcretePillar);
  groundLintel.scale.set(wallW + 0.16, 0.28, 0.3);
  groundLintel.position.set(0, groundH - 0.06, zFront);
  g.add(groundLintel);

  // Ground-floor side & back clay brick walls
  for (const sideSign of [-1, 1]) {
    const sideWall = new THREE.Mesh(sharedGeos.unitBox, sharedMats.clayBrickDark);
    sideWall.scale.set(0.26, groundH, wallD);
    sideWall.position.set(sideSign * (wallW * 0.48), groundH * 0.5 + 0.08, 0);
    g.add(sideWall);
  }

  const backWall1 = new THREE.Mesh(sharedGeos.unitBox, sharedMats.clayBrick);
  backWall1.scale.set(wallW, groundH, 0.26);
  backWall1.position.set(0, groundH * 0.5 + 0.08, -wallD * 0.48);
  g.add(backWall1);

  // 3. Poured 2nd-Floor Concrete Slab ("Laje de Concreto do 2º Andar") with Eucalyptus Timber Shores ("Escoras")
  const secondFloorSlab = new THREE.Mesh(sharedGeos.unitBox, sharedMats.concreteStep);
  secondFloorSlab.scale.set(wallW + 0.65, 0.24, wallD + 0.65);
  secondFloorSlab.position.set(0, slabY, 0.12);
  g.add(secondFloorSlab);

  // Wooden shoring props ("escoras de eucalipto segurando a laje")
  for (const sx of [-wallW * 0.28, 0.05, wallW * 0.32]) {
    const shore = new THREE.Mesh(sharedGeos.cylinder, sharedMats.scaffoldWood);
    shore.scale.set(0.05, groundH - 0.1, 0.05);
    shore.position.set(sx, groundH * 0.5, zFront + 0.28);
    shore.rotation.z = sx * 0.03;
    g.add(shore);
  }

  // Exterior wooden scaffolding ("andaime de madeira na fachada")
  for (const ax of [-wallW * 0.38, wallW * 0.38]) {
    const leg = new THREE.Mesh(sharedGeos.unitBox, sharedMats.scaffoldWood);
    leg.scale.set(0.1, slabY + 1.1, 0.1);
    leg.position.set(ax, (slabY + 1.1) * 0.5, zFront + 0.68);
    g.add(leg);
  }
  const scaffoldPlank = new THREE.Mesh(sharedGeos.unitBox, sharedMats.scaffoldWood);
  scaffoldPlank.scale.set(wallW * 0.92, 0.09, 0.48);
  scaffoldPlank.position.set(0, slabY - 0.15, zFront + 0.58);
  g.add(scaffoldPlank);

  // 4. Second Story Under Construction ("2º Andar em Construção com Tijolos Escalonados e Colunas com Vergalhões")
  const upperBaseY = slabY + 0.12;

  // Half-built 2nd floor front brick wall with window gap
  const upperFrontLeft = new THREE.Mesh(sharedGeos.unitBox, sharedMats.clayBrick);
  upperFrontLeft.scale.set(wallW * 0.44, secondFloorH * 0.72, 0.24);
  upperFrontLeft.position.set(-wallW * 0.24, upperBaseY + secondFloorH * 0.36, zFront);
  g.add(upperFrontLeft);

  const upperFrontRight = new THREE.Mesh(sharedGeos.unitBox, sharedMats.clayBrick);
  upperFrontRight.scale.set(wallW * 0.32, secondFloorH * 0.48, 0.24);
  upperFrontRight.position.set(wallW * 0.28, upperBaseY + secondFloorH * 0.24, zFront);
  g.add(upperFrontRight);

  // Stepped brick courses on the 2nd floor walls ("tijolos escalonados no 2º andar")
  for (let s = 0; s < 4; s++) {
    const stepBrick = new THREE.Mesh(sharedGeos.unitBox, sharedMats.clayBrickDark);
    stepBrick.scale.set(0.52, 0.24, 0.25);
    stepBrick.position.set(
      -wallW * 0.36 + s * 0.46,
      upperBaseY + secondFloorH * 0.72 + (s % 2) * 0.22,
      zFront,
    );
    g.add(stepBrick);
  }

  // 2nd floor side & back brick walls
  const upperLeftWall = new THREE.Mesh(sharedGeos.unitBox, sharedMats.clayBrickDark);
  upperLeftWall.scale.set(0.24, secondFloorH * 0.88, wallD);
  upperLeftWall.position.set(-wallW * 0.48, upperBaseY + secondFloorH * 0.44, 0);
  g.add(upperLeftWall);

  const upperRightWall = new THREE.Mesh(sharedGeos.unitBox, sharedMats.clayBrickDark);
  upperRightWall.scale.set(0.24, secondFloorH * 0.65, wallD * 0.85);
  upperRightWall.position.set(wallW * 0.48, upperBaseY + secondFloorH * 0.32, -wallD * 0.06);
  g.add(upperRightWall);

  const upperBackWall = new THREE.Mesh(sharedGeos.unitBox, sharedMats.clayBrick);
  upperBackWall.scale.set(wallW, secondFloorH * 0.92, 0.24);
  upperBackWall.position.set(0, upperBaseY + secondFloorH * 0.46, -wallD * 0.48);
  g.add(upperBackWall);

  // Full 2-Story Raw Concrete Structural Columns + Protruding Steel Rebar ("Colunas de 2 Andares com Vergalhões")
  const totalPillarH = upperBaseY + secondFloorH + 0.25;
  const pillarCoords = [
    { x: -wallW * 0.48, z: zFront },
    { x: 0.0, z: zFront },
    { x: wallW * 0.48, z: zFront },
    { x: -wallW * 0.48, z: -wallD * 0.48 },
    { x: wallW * 0.48, z: -wallD * 0.48 },
  ];
  for (const pc of pillarCoords) {
    const col = new THREE.Mesh(sharedGeos.unitBox, sharedMats.rawConcretePillar);
    col.scale.set(0.3, totalPillarH, 0.3);
    col.position.set(pc.x, totalPillarH * 0.5, pc.z);
    g.add(col);

    for (const rx of [-0.06, 0.06]) {
      const rebar = new THREE.Mesh(sharedGeos.cylinder, sharedMats.darkMetal);
      rebar.scale.set(0.022, 0.72, 0.022);
      rebar.position.set(pc.x + rx, totalPillarH + 0.34, pc.z);
      g.add(rebar);
    }
  }

  // 5. Stacked Pallets of Red Clay Bricks & Sand Mound in Front of the 2-Story Construction
  for (let p = 0; p < 2; p++) {
    const brickStack = new THREE.Mesh(sharedGeos.unitBox, sharedMats.clayBrick);
    brickStack.scale.set(0.82, 0.58 + (p % 2) * 0.22, 0.62);
    brickStack.position.set(wallW * 0.26 - p * 0.65, 0.32, zFront + 0.82);
    g.add(brickStack);
  }

  const sandMound = new THREE.Mesh(sharedGeos.cone, sharedMats.sandPile);
  sandMound.scale.set(1.05, 0.68, 1.05);
  sandMound.position.set(-wallW * 0.25, 0.34, zFront + 0.88);
  g.add(sandMound);

  if (variantSeed % 2 === 0) {
    // Blue water tank waiting on the 2nd floor slab to be installed
    const tank = new THREE.Mesh(sharedGeos.cylinder, sharedMats.waterTankBlue);
    tank.scale.set(0.58, 0.68, 0.58);
    tank.position.set(wallW * 0.18, upperBaseY + 0.35, -0.2);
    g.add(tank);
  }

  return g;
}

/**
 * Helper to construct a complete Brazilian facade (Door, Window, Garage Gate, Meter Box, Planter, Awning)
 * on a local +Z plane of width `W` and height `H`.
 */
function buildFacadeElements(
  spec: HouseVariationSpec,
  W: number,
  groundH: number,
  upperH: number,
  D: number,
  isPrimaryStreetFace: boolean,
): THREE.Group {
  const fg = new THREE.Group();
  const zSurface = D / 2;

  const doorTex = getHandPaintedDoorTexture(spec.doorColor);
  const doorMat = new THREE.MeshStandardMaterial({
    map: doorTex,
    color: 0xffffff,
    roughness: 0.65,
    metalness: 0.08,
  });
  doorMat.userData.isHouseFadeableMat = true;

  const winTex = getHandPaintedWindowTexture(
    spec.windowColor,
    spec.hasLouveredWindow,
    spec.hasWindowGrille,
  );
  const winMat = new THREE.MeshStandardMaterial({
    map: winTex,
    color: 0xffffff,
    roughness: 0.38,
    metalness: 0.15,
  });
  winMat.userData.isHouseFadeableMat = true;

  const trimMat = new THREE.MeshStandardMaterial({
    color: spec.trimColor,
    roughness: 0.72,
    metalness: 0.05,
  });
  trimMat.userData.isHouseFadeableMat = true;

  const doorX =
    spec.doorSide === 'left' ? -W * 0.25 : spec.doorSide === 'right' ? W * 0.26 : 0;
  const winX =
    spec.doorSide === 'left' ? W * 0.18 : spec.doorSide === 'right' ? -W * 0.2 : -W * 0.26;

  if (isPrimaryStreetFace) {
    // 1. Front Door + Recessed Frame + Concrete Steps
    const doorFrame = new THREE.Mesh(sharedGeos.unitBox, trimMat);
    doorFrame.scale.set(1.38, 2.48, 0.18);
    doorFrame.position.set(doorX, 1.32, zSurface + 0.05);
    fg.add(doorFrame);

    const doorMesh = new THREE.Mesh(sharedGeos.unitBox, doorMat);
    doorMesh.scale.set(1.18, 2.32, 0.12);
    doorMesh.position.set(doorX, 1.28, zSurface + 0.11);
    fg.add(doorMesh);

    const step1 = new THREE.Mesh(sharedGeos.unitBox, sharedMats.concreteStep);
    step1.scale.set(1.55, 0.16, 0.45);
    step1.position.set(doorX, 0.08, zSurface + 0.22);
    fg.add(step1);

    const step2 = new THREE.Mesh(sharedGeos.unitBox, sharedMats.concreteStep);
    step2.scale.set(1.38, 0.14, 0.28);
    step2.position.set(doorX, 0.2, zSurface + 0.14);
    fg.add(step2);

    // 2. Garage Gate (Portão Basculante) OR Ground Floor Window
    if (spec.hasGarageGate) {
      const gateTex = getHandPaintedGarageGateTexture(spec.gateColor);
      const gateMat = new THREE.MeshStandardMaterial({
        map: gateTex,
        color: 0xffffff,
        roughness: 0.48,
        metalness: 0.45,
      });

      const gateFrame = new THREE.Mesh(sharedGeos.unitBox, trimMat);
      gateFrame.scale.set(2.85, 2.65, 0.22);
      gateFrame.position.set(winX, 1.35, zSurface + 0.06);
      fg.add(gateFrame);

      const gateMesh = new THREE.Mesh(sharedGeos.unitBox, gateMat);
      gateMesh.scale.set(2.62, 2.48, 0.14);
      gateMesh.position.set(winX, 1.32, zSurface + 0.13);
      fg.add(gateMesh);
    } else {
      const winFrame = new THREE.Mesh(sharedGeos.unitBox, trimMat);
      winFrame.scale.set(1.95, 1.48, 0.16);
      winFrame.position.set(winX, 1.82, zSurface + 0.05);
      fg.add(winFrame);

      const winMesh = new THREE.Mesh(sharedGeos.unitBox, winMat);
      winMesh.scale.set(1.76, 1.3, 0.12);
      winMesh.position.set(winX, 1.82, zSurface + 0.1);
      fg.add(winMesh);

      const sill = new THREE.Mesh(sharedGeos.unitBox, sharedMats.concreteStep);
      sill.scale.set(2.08, 0.12, 0.26);
      sill.position.set(winX, 1.06, zSurface + 0.12);
      fg.add(sill);
    }

    // 3. Brazilian Electricity Meter Box ("Padrão de Luz")
    if (spec.hasElectricMeter) {
      const meterX = spec.doorSide === 'left' ? -W * 0.43 : W * 0.43;
      const box = new THREE.Mesh(sharedGeos.unitBox, sharedMats.meterBox);
      box.scale.set(0.38, 0.52, 0.18);
      box.position.set(meterX, 1.75, zSurface + 0.09);
      fg.add(box);

      const visor = new THREE.Mesh(sharedGeos.unitBox, sharedMats.meterGlass);
      visor.scale.set(0.24, 0.2, 0.06);
      visor.position.set(meterX, 1.82, zSurface + 0.17);
      fg.add(visor);

      const pipe = new THREE.Mesh(sharedGeos.cylinder, sharedMats.darkMetal);
      pipe.scale.set(0.035, groundH - 1.6, 0.035);
      pipe.position.set(meterX, 1.75 + (groundH - 1.6) / 2, zSurface + 0.08);
      fg.add(pipe);
    }

    // 4. Planter Box ("Jardineira") with 3D Illustrated PNG-Style Grass, Sunflowers ("Girassóis") & Roses ("Rosas")
    if (spec.hasPlanterBox || spec.id % 2 === 0) {
      const planterX = spec.hasGarageGate ? 0.05 : winX;
      const planter = new THREE.Mesh(sharedGeos.unitBox, sharedMats.concreteStep);
      planter.scale.set(1.62, 0.48, 0.52);
      planter.position.set(planterX, 0.24, zSurface + 0.28);
      fg.add(planter);

      // Rich dark soil bed inside top of planter box
      const soilBed = new THREE.Mesh(sharedGeos.unitBox, sharedMats.vacantDirt);
      soilBed.scale.set(1.5, 0.08, 0.4);
      soilBed.position.set(planterX, 0.47, zSurface + 0.28);
      fg.add(soilBed);

      // Multi-layered 3D Illustrated PNG Cutout of Grass, Sunflowers ("Girassóis") & Roses ("Rosas")
      const floralCutout = buildFloralGardenCutoutCluster(1.58, 0.86, spec.id);
      floralCutout.position.set(planterX, 0.46, zSurface + 0.28);
      fg.add(floralCutout);
    }

    // 5. Striped Commercial Awning
    if (spec.hasStripedAwning) {
      const awningGroup = new THREE.Group();
      const stripes = 6;
      const stripeW = (W * 0.86) / stripes;
      for (let s = 0; s < stripes; s++) {
        const sMat = new THREE.MeshStandardMaterial({
          color: s % 2 === 0 ? 0xdc2626 : 0xfef9c3,
          roughness: 0.6,
        });
        const slab = new THREE.Mesh(sharedGeos.unitBox, sMat);
        slab.scale.set(stripeW, 0.12, 1.15);
        slab.position.set(-W * 0.43 + stripeW * (s + 0.5), groundH - 0.55, zSurface + 0.55);
        slab.rotation.x = 0.32;
        awningGroup.add(slab);
      }
      fg.add(awningGroup);
    }

    // 6. Upper Story Balcony & Sliding Glass Door
    if (spec.stories === 2 && upperH > 0) {
      const upperFloorY = groundH;
      if (spec.hasBalcony) {
        const balcSlab = new THREE.Mesh(sharedGeos.unitBox, trimMat);
        balcSlab.scale.set(W + 0.3, 0.28, 1.15);
        balcSlab.position.set(0, upperFloorY + 0.05, zSurface + 0.48);
        fg.add(balcSlab);

        const railTop = new THREE.Mesh(sharedGeos.unitBox, sharedMats.galvanizedSteel);
        railTop.scale.set(W + 0.1, 0.07, 0.07);
        railTop.position.set(0, upperFloorY + 1.05, zSurface + 0.98);
        fg.add(railTop);

        const postCount = 7;
        for (let p = 0; p < postCount; p++) {
          const px = -W * 0.48 + (p / (postCount - 1)) * (W * 0.96);
          const post = new THREE.Mesh(sharedGeos.unitBox, sharedMats.galvanizedSteel);
          post.scale.set(0.06, 0.92, 0.06);
          post.position.set(px, upperFloorY + 0.58, zSurface + 0.98);
          fg.add(post);
        }

        const pot = new THREE.Mesh(sharedGeos.cylinder, sharedMats.terracottaPot);
        pot.scale.set(0.24, 0.34, 0.24);
        pot.position.set(-W * 0.28, upperFloorY + 0.35, zSurface + 0.72);
        fg.add(pot);

        const balconyFlowers = buildFloralGardenCutoutCluster(0.75, 0.58, spec.id + 2);
        balconyFlowers.position.set(-W * 0.28, upperFloorY + 0.48, zSurface + 0.72);
        fg.add(balconyFlowers);
      }

      const upperDoor = new THREE.Mesh(sharedGeos.unitBox, winMat);
      upperDoor.scale.set(1.85, 2.1, 0.14);
      upperDoor.position.set(-0.2, upperFloorY + 1.15, zSurface + 0.08);
      fg.add(upperDoor);

      const smallWin = new THREE.Mesh(sharedGeos.unitBox, winMat);
      smallWin.scale.set(0.68, 0.68, 0.14);
      smallWin.position.set(W * 0.3, upperFloorY + 1.85, zSurface + 0.08);
      fg.add(smallWin);
    }

    // 7. Front Porch & Low Front Boundary Wall
    if (spec.hasFrontWall) {
      const wallMat = new THREE.MeshStandardMaterial({
        color: spec.wallColor,
        roughness: 0.75,
      });
      const leftWall = new THREE.Mesh(sharedGeos.unitBox, wallMat);
      leftWall.scale.set(W * 0.52, 1.35, 0.28);
      leftWall.position.set(-W * 0.22, 0.68, zSurface + 1.35);
      fg.add(leftWall);

      const rightWall = new THREE.Mesh(sharedGeos.unitBox, wallMat);
      rightWall.scale.set(W * 0.22, 1.35, 0.28);
      rightWall.position.set(W * 0.38, 0.68, zSurface + 1.35);
      fg.add(rightWall);

      for (const px of [-W * 0.44, 0.12, W * 0.44]) {
        const pillar = new THREE.Mesh(sharedGeos.unitBox, sharedMats.rafterWood);
        pillar.scale.set(0.22, groundH - 0.3, 0.22);
        pillar.position.set(px, (groundH - 0.3) / 2, zSurface + 1.25);
        fg.add(pillar);
      }
    }
  } else {
    // Camera-facing side wall (+Z in world): rich windows + sills so the player sees crisp architectural detail
    const sideWinFrame = new THREE.Mesh(sharedGeos.unitBox, trimMat);
    sideWinFrame.scale.set(1.75, 1.38, 0.16);
    sideWinFrame.position.set(0, 1.85, zSurface + 0.05);
    fg.add(sideWinFrame);

    const sideWin = new THREE.Mesh(sharedGeos.unitBox, winMat);
    sideWin.scale.set(1.56, 1.2, 0.12);
    sideWin.position.set(0, 1.85, zSurface + 0.1);
    fg.add(sideWin);

    const sideSill = new THREE.Mesh(sharedGeos.unitBox, sharedMats.concreteStep);
    sideSill.scale.set(1.88, 0.12, 0.24);
    sideSill.position.set(0, 1.12, zSurface + 0.11);
    fg.add(sideSill);

    if (spec.stories === 2 && upperH > 0) {
      const upperSideWinFrame = new THREE.Mesh(sharedGeos.unitBox, trimMat);
      upperSideWinFrame.scale.set(1.75, 1.38, 0.16);
      upperSideWinFrame.position.set(0, groundH + 1.55, zSurface + 0.05);
      fg.add(upperSideWinFrame);

      const upperSideWin = new THREE.Mesh(sharedGeos.unitBox, winMat);
      upperSideWin.scale.set(1.56, 1.2, 0.12);
      upperSideWin.position.set(0, groundH + 1.55, zSurface + 0.1);
      fg.add(upperSideWin);
    }
  }

  return fg;
}

const mercadinhoInteriorMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
const mercadinhoRedRackMat = new THREE.MeshStandardMaterial({
  color: 0xdc2626,
  roughness: 0.42,
  metalness: 0.25,
});
const mercadinhoYellowChairMat = new THREE.MeshStandardMaterial({
  color: 0xfacc15,
  roughness: 0.36,
  metalness: 0.08,
});
const mercadinhoBlueAwningMat = new THREE.MeshStandardMaterial({
  color: 0x1d4ed8,
  roughness: 0.48,
  metalness: 0.12,
});
const mercadinhoLimeAwningMat = new THREE.MeshStandardMaterial({
  color: 0x84cc16,
  roughness: 0.52,
  metalness: 0.08,
});
const snackBagMats = [
  new THREE.MeshBasicMaterial({ color: 0xef4444 }), // Red chip bag
  new THREE.MeshBasicMaterial({ color: 0xfacc15 }), // Yellow corn snack bag
  new THREE.MeshBasicMaterial({ color: 0x22c55e }), // Green onion snack bag
  new THREE.MeshBasicMaterial({ color: 0x3b82f6 }), // Blue cheese snack bag
  new THREE.MeshBasicMaterial({ color: 0xf97316 }), // Orange bacon snack bag
  new THREE.MeshBasicMaterial({ color: 0xec4899 }), // Pink sweet snack bag
];

/**
 * Builds an Authentic Brazilian Neighborhood Grocery Store ("Mercadinho do Bairro / Mercearia")
 * or Sidewalk Bar ("Bar & Petiscos") matching the user's 3 reference photos:
 * - Prominent, high-contrast Store Name Signboards ("Mercadinho Compra Certa", "MERCEARIA SÃO JOÃO · R$ 1,99", "MERCEARIA LUIZA Nº 298")
 *   mounted both on the street facade AND angled toward the oncoming player camera so the name stands out unmistakably!
 * - Wide open roll-up commercial entrance with a red beverage refrigerator ("Geladeira Vermelha de Bebidas") and stocked shelves inside
 * - Sidewalk products ("produtos na calçada"): red wire chip/snack display racks, banana/fruit crates, broom/bucket stand,
 *   and hanging colorful balls & snack strips under the awning
 * - Sidewalk Bar Tables & Plastic Chairs ("mesas e cadeiras plásticas amarelas e vermelhas de bar na calçada")
 */
function buildMercadinhoOrBarFront(
  spec: HouseVariationSpec,
  W: number,
  groundH: number,
  D: number,
  side: 'left' | 'right',
  maxAnisotropy: number,
): THREE.Group {
  const mg = new THREE.Group();
  const zSurface = D / 2;
  const variant = Math.floor(spec.id / 3) % 4;
  // In local houseGroup space (before ±90° Y rotation), `towardsCameraSign` points toward world +Z (the player camera!)
  const towardsCameraSign = side === 'left' ? -1 : 1;

  const signTex = createMercadinhoSignTexture(variant, maxAnisotropy);
  const signMat = new THREE.MeshBasicMaterial({
    map: signTex,
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  applyWorldCurvatureToMaterial(signMat);

  // 1. Wide Open Commercial Storefront Recess + Rolled-Up Corrugated Steel Shutter ("Porta de Aço Aberta")
  const openW = W * 0.56;
  const openH = 2.48;
  const openX = -towardsCameraSign * (W * 0.08);

  const interiorBox = new THREE.Mesh(sharedGeos.unitBox, mercadinhoInteriorMat);
  interiorBox.scale.set(openW, openH, 0.16);
  interiorBox.position.set(openX, openH * 0.5 + 0.12, zSurface + 0.14);
  mg.add(interiorBox);

  // Rolled-up steel door header box at top of entrance
  const shutterRoll = new THREE.Mesh(sharedGeos.unitBox, sharedMats.galvanizedSteel);
  shutterRoll.scale.set(openW + 0.24, 0.34, 0.32);
  shutterRoll.position.set(openX, openH + 0.22, zSurface + 0.22);
  mg.add(shutterRoll);

  // Inside Storefront: Iconic Red Drink Refrigerator ("Geladeira de Refrigerante/Cerveja") + Stocked Shelves
  const fridgeBody = new THREE.Mesh(sharedGeos.unitBox, mercadinhoRedRackMat);
  fridgeBody.scale.set(0.88, 2.05, 0.42);
  fridgeBody.position.set(openX - 0.95, 1.15, zSurface + 0.22);
  mg.add(fridgeBody);

  const fridgeGlass = new THREE.Mesh(sharedGeos.unitBox, sharedMats.meterGlass);
  fridgeGlass.scale.set(0.72, 1.35, 0.08);
  fridgeGlass.position.set(openX - 0.95, 1.25, zSurface + 0.43);
  mg.add(fridgeGlass);

  // Colorful stocked counter/shelves visible inside the open store entrance
  for (let row = 0; row < 3; row++) {
    const shelf = new THREE.Mesh(
      sharedGeos.unitBox,
      snackBagMats[(row + variant) % snackBagMats.length],
    );
    shelf.scale.set(openW * 0.48, 0.26, 0.22);
    shelf.position.set(openX + 0.65, 0.65 + row * 0.58, zSurface + 0.22);
    mg.add(shelf);
  }

  // 2. Projecting Commercial Awning ("Toldo de Mercadinho") Over the Sidewalk
  const awningMat =
    variant === 2
      ? mercadinhoBlueAwningMat
      : variant === 1
        ? mercadinhoLimeAwningMat
        : mercadinhoRedRackMat;
  const awningRoof = new THREE.Mesh(sharedGeos.unitBox, awningMat);
  awningRoof.scale.set(W * 0.96, 0.14, 1.65);
  awningRoof.position.set(0, groundH - 0.62, zSurface + 0.82);
  awningRoof.rotation.x = 0.22;
  mg.add(awningRoof);

  // Front steel awning support poles on the sidewalk
  for (const px of [-W * 0.44, W * 0.44]) {
    const pole = new THREE.Mesh(sharedGeos.cylinder, sharedMats.darkMetal);
    pole.scale.set(0.045, groundH - 0.75, 0.045);
    pole.position.set(px, (groundH - 0.75) * 0.5, zSurface + 1.52);
    mg.add(pole);
  }

  // 3. PROMINENT HIGHLIGHTED STORE NAME SIGNBOARDS ("deixe nome do mercado bem destacado")
  // 3A. Large Main Street-Facing Fascia Signboard above the awning
  const mainSignW = W * 0.96;
  const mainSignH = 1.32;
  const mainSignFrame = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
  mainSignFrame.scale.set(mainSignW + 0.2, mainSignH + 0.18, 0.22);
  mainSignFrame.position.set(0, groundH + 0.28, zSurface + 0.55);
  mg.add(mainSignFrame);

  const mainSignFace = new THREE.Mesh(new THREE.PlaneGeometry(mainSignW, mainSignH), signMat);
  mainSignFace.position.set(0, groundH + 0.28, zSurface + 0.68);
  mg.add(mainSignFace);

  // 3B. Angled Camera-Facing Corner/Roof Signboard ("Placa Destacada Virada para o Jogador")
  // Rotated toward `towardsCameraSign` (which is +Z toward the oncoming player!) so the store name is 100% readable while running!
  const cameraWingGroup = new THREE.Group();
  const wingW = 4.6;
  const wingH = 1.42;
  cameraWingGroup.position.set(
    towardsCameraSign * (W * 0.36),
    groundH + 0.42,
    zSurface + 1.15,
  );
  // In local houseGroup space, rotating around Y by `towardsCameraSign * (Math.PI * 0.36)` points the +Z plane face directly toward the oncoming player camera!
  cameraWingGroup.rotation.y = towardsCameraSign * (Math.PI * 0.36);

  const wingBacking = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
  wingBacking.scale.set(wingW + 0.22, wingH + 0.2, 0.2);
  cameraWingGroup.add(wingBacking);

  const wingYellowBorder = new THREE.Mesh(sharedGeos.unitBox, mercadinhoYellowChairMat);
  wingYellowBorder.scale.set(wingW + 0.1, wingH + 0.1, 0.23);
  cameraWingGroup.add(wingYellowBorder);

  const wingFaceGeo = new THREE.PlaneGeometry(wingW, wingH);
  const wingFace = new THREE.Mesh(wingFaceGeo, signMat);
  wingFace.position.set(0, 0, 0.14);
  cameraWingGroup.add(wingFace);

  const wingFaceBack = new THREE.Mesh(wingFaceGeo, signMat);
  wingFaceBack.position.set(0, 0, -0.14);
  wingFaceBack.rotation.y = Math.PI;
  cameraWingGroup.add(wingFaceBack);
  mg.add(cameraWingGroup);

  // 4. SIDEWALK PRODUCTS & DISPLAY RACKS ("produtos na calçada" matching Reference Photos 1 & 3!)
  // 4A. Two Red Wire Snack/Chip Display Racks ("Expositores de Salgadinhos Coloridos na Calçada")
  for (const rackSide of [-1, 1]) {
    const rackX = openX + rackSide * (openW * 0.46);
    const rackZ = zSurface + 0.92;

    const rackFrame = new THREE.Mesh(sharedGeos.unitBox, mercadinhoRedRackMat);
    rackFrame.scale.set(0.76, 1.58, 0.42);
    rackFrame.position.set(rackX, 0.82, rackZ);
    mg.add(rackFrame);

    // 4 tiers of colorful chip/snack bags on the rack
    for (let tier = 0; tier < 4; tier++) {
      for (let col = -1; col <= 1; col++) {
        const bagMat = snackBagMats[(tier * 2 + col + 3 + variant) % snackBagMats.length];
        const bag = new THREE.Mesh(sharedGeos.unitBox, bagMat);
        bag.scale.set(0.2, 0.26, 0.14);
        bag.position.set(rackX + col * 0.23, 0.32 + tier * 0.34, rackZ + 0.18);
        mg.add(bag);
      }
    }
  }

  // 4B. Hanging Colorful Balls & Chip Strips Under the Front Awning (matching Reference Photos 1 & 3!)
  for (let hIdx = -3; hIdx <= 3; hIdx++) {
    const hx = hIdx * (W * 0.12);
    const hz = zSurface + 1.42;
    const hy = groundH - 1.05;

    if (Math.abs(hIdx) % 2 === 1) {
      // Net of 2 colorful plastic beach/soccer balls hanging from the awning
      for (let b = 0; b < 2; b++) {
        const ball = new THREE.Mesh(
          sharedGeos.sphere,
          snackBagMats[(Math.abs(hIdx) + b + variant) % snackBagMats.length],
        );
        ball.scale.set(0.22, 0.22, 0.22);
        ball.position.set(hx, hy - b * 0.38, hz);
        mg.add(ball);
      }
    } else {
      // Hanging strip of colorful snack packets ("tira de salgadinhos pendurada")
      const strip = new THREE.Mesh(
        sharedGeos.unitBox,
        snackBagMats[(Math.abs(hIdx) + variant) % snackBagMats.length],
      );
      strip.scale.set(0.18, 0.78, 0.12);
      strip.position.set(hx, hy - 0.24, hz);
      mg.add(strip);
    }
  }

  // 4C. Produce / Banana Stand, Stacked Crates, White Buckets & Broom Rack on the Sidewalk Corner
  const cornerProdX = towardsCameraSign * (W * 0.34);
  const cornerProdZ = zSurface + 1.25;

  // Wooden produce crate stand + yellow/green banana bunches ("banca de bananas e frutas na calçada")
  const produceCrate = new THREE.Mesh(sharedGeos.unitBox, sharedMats.rafterWood);
  produceCrate.scale.set(0.95, 0.72, 0.68);
  produceCrate.position.set(cornerProdX, 0.38, cornerProdZ);
  mg.add(produceCrate);

  for (let b = 0; b < 3; b++) {
    const bananaBunch = new THREE.Mesh(
      sharedGeos.sphere,
      b % 2 === 0 ? mercadinhoYellowChairMat : mercadinhoLimeAwningMat,
    );
    bananaBunch.scale.set(0.28, 0.2, 0.26);
    bananaBunch.position.set(cornerProdX + (b - 1) * 0.26, 0.84, cornerProdZ);
    mg.add(bananaBunch);
  }

  // Broom & mop display rack ("vassouras e rodos na calçada" like Mercadinho Compra Certa!)
  for (let br = 0; br < 3; br++) {
    const broomStick = new THREE.Mesh(sharedGeos.cylinder, sharedMats.scaffoldWood);
    broomStick.scale.set(0.03, 1.35, 0.03);
    broomStick.position.set(cornerProdX + (br - 1) * 0.16, 0.72, cornerProdZ + 0.42);
    broomStick.rotation.z = (br - 1) * 0.08;
    mg.add(broomStick);

    const broomHead = new THREE.Mesh(
      sharedGeos.unitBox,
      snackBagMats[(br + variant) % snackBagMats.length],
    );
    broomHead.scale.set(0.26, 0.14, 0.12);
    broomHead.position.set(cornerProdX + (br - 1) * 0.18, 1.36, cornerProdZ + 0.42);
    mg.add(broomHead);
  }

  // White plastic buckets on the sidewalk edge (like Mercearia São João!)
  for (const bx of [-0.18, 0.18]) {
    const bucket = new THREE.Mesh(sharedGeos.cylinder, sharedMats.coneWhite);
    bucket.scale.set(0.16, 0.34, 0.16);
    bucket.position.set(openX + bx, 0.18, zSurface + 1.55);
    mg.add(bucket);
  }

  // 5. SIDEWALK BAR / BOTECO PLASTIC TABLES & CHAIRS ("ou alguns bar" matching Mercearia Luiza & São João!)
  const chairMat = variant % 2 === 0 ? mercadinhoYellowChairMat : mercadinhoRedRackMat;
  for (let tIdx = 0; tIdx < 2; tIdx++) {
    const tableX = -towardsCameraSign * (W * 0.32) + tIdx * towardsCameraSign * 1.65;
    const tableZ = zSurface + 1.68;

    // Square plastic bar table
    const tableTop = new THREE.Mesh(sharedGeos.unitBox, chairMat);
    tableTop.scale.set(0.78, 0.07, 0.78);
    tableTop.position.set(tableX, 0.74, tableZ);
    mg.add(tableTop);

    const tablePedestal = new THREE.Mesh(sharedGeos.unitBox, chairMat);
    tablePedestal.scale.set(0.16, 0.72, 0.16);
    tablePedestal.position.set(tableX, 0.36, tableZ);
    mg.add(tablePedestal);

    // Bottle & glass on the bar table
    const bottle = new THREE.Mesh(sharedGeos.cylinder, sharedMats.darkMetal);
    bottle.scale.set(0.055, 0.26, 0.055);
    bottle.position.set(tableX, 0.9, tableZ);
    mg.add(bottle);

    // 2 plastic bar chairs flanking the table
    for (const cDir of [-1, 1]) {
      const chairX = tableX + cDir * 0.56;
      const seat = new THREE.Mesh(sharedGeos.unitBox, chairMat);
      seat.scale.set(0.42, 0.44, 0.42);
      seat.position.set(chairX, 0.22, tableZ);
      mg.add(seat);

      const backrest = new THREE.Mesh(sharedGeos.unitBox, chairMat);
      backrest.scale.set(0.08, 0.46, 0.42);
      backrest.position.set(chairX + cDir * 0.17, 0.64, tableZ);
      mg.add(backrest);
    }
  }

  return mg;
}

/**
 * Builds a complete multi-part 3D stylized Brazilian house for one of the 30 variations,
 * aligned straight facing the street (not diagonal!), plus an adjacent Terreno Baldio / Brick Construction lot.
 */
export function buildBrazilianHouse(
  spec: HouseVariationSpec,
  side: 'left' | 'right',
  maxAnisotropy = 4,
): THREE.Group {
  const houseGroup = new THREE.Group();
  houseGroup.name = `House_${spec.id}_${spec.name}`;

  const W = spec.width;
  const D = spec.depth;
  const groundH = spec.stories === 2 ? spec.height * 0.52 : spec.height;
  const upperH = spec.stories === 2 ? spec.height * 0.48 : 0;
  const totalWallH = groundH + upperH;

  // 1. Deep Ground-Anchored Concrete Foundation Plinth Slab (extends into the sidewalk so houses never float on curves)
  const foundation = new THREE.Mesh(sharedGeos.unitBox, sharedMats.concreteStep);
  foundation.scale.set(W + 0.4, 0.56, D + 0.4);
  foundation.position.set(0, -0.1, 0);
  houseGroup.add(foundation);

  // 2. Ground Story Main Body with Hand-Painted Texture
  const lowerWallTex = getHandPaintedWallTexture(spec, false, maxAnisotropy);
  const lowerWallMat = new THREE.MeshStandardMaterial({
    map: lowerWallTex,
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.04,
  });
  lowerWallMat.userData.isHouseFadeableMat = true;

  const lowerBody = new THREE.Mesh(sharedGeos.unitBox, lowerWallMat);
  lowerBody.scale.set(W, groundH, D);
  lowerBody.position.set(0, groundH / 2 + 0.12, 0);
  houseGroup.add(lowerBody);

  // 3. Optional Second Story Body ("Sobrado")
  if (spec.stories === 2 && upperH > 0) {
    const upperWallTex = getHandPaintedWallTexture(spec, true, maxAnisotropy);
    const upperWallMat = new THREE.MeshStandardMaterial({
      map: upperWallTex,
      color: 0xffffff,
      roughness: 0.76,
      metalness: 0.04,
    });
    upperWallMat.userData.isHouseFadeableMat = true;
    const upperBody = new THREE.Mesh(sharedGeos.unitBox, upperWallMat);
    upperBody.scale.set(W + 0.12, upperH, D + 0.12);
    upperBody.position.set(0, groundH + upperH / 2 + 0.12, 0);
    houseGroup.add(upperBody);
  }

  // 4. Primary Street-Facing Facade Elements (+Z in local group space) OR Neighborhood Mercadinho / Bar!
  const isMercadinhoOrBar = spec.style === 'comercio_esquina' || spec.id % 3 === 2 || spec.id === 3;
  const primaryFacade = buildFacadeElements(spec, W, groundH, upperH, D, true);
  houseGroup.add(primaryFacade);

  if (isMercadinhoOrBar) {
    const mercadinhoFront = buildMercadinhoOrBarFront(spec, W, groundH, D, side, maxAnisotropy);
    houseGroup.add(mercadinhoFront);
  }

  // 5. Secondary Camera-Facing Side Facade Elements (+Z world when rotated ±90 deg)
  const sideFacadeAngle = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
  const cameraSideFacade = buildFacadeElements(spec, D, groundH, upperH, W, false);
  cameraSideFacade.rotation.y = sideFacadeAngle;
  houseGroup.add(cameraSideFacade);

  // 6. Roof Assembly
  const roofTex = getHandPaintedRoofTexture(spec.roofColor, spec.roofStyle, maxAnisotropy);
  const roofMat = new THREE.MeshStandardMaterial({
    map: roofTex,
    color: 0xffffff,
    roughness: 0.65,
    metalness: 0.06,
  });
  roofMat.userData.isHouseFadeableMat = true;

  const roofBaseY = totalWallH + 0.12;

  if (spec.roofStyle === 'flat_parapet') {
    const parapetMat = new THREE.MeshStandardMaterial({
      color: spec.roofColor,
      roughness: 0.7,
      metalness: 0.1,
    });
    parapetMat.userData.isHouseFadeableMat = true;
    const topBand = new THREE.Mesh(sharedGeos.unitBox, parapetMat);
    topBand.scale.set(W + 0.35, 0.65, D + 0.35);
    topBand.position.set(0, roofBaseY + 0.25, 0);
    houseGroup.add(topBand);

    const accentVolume = new THREE.Mesh(sharedGeos.unitBox, parapetMat);
    accentVolume.scale.set(W * 0.58, 0.95, D * 0.85);
    accentVolume.position.set(W * 0.18, roofBaseY + 0.52, 0.15);
    houseGroup.add(accentVolume);
  } else {
    const overhangW = W + 0.95;
    const overhangD = D + (spec.hasFrontWall ? 2.1 : 1.05);
    const roofZOffset = spec.hasFrontWall ? 0.55 : 0;

    const slopeW = overhangW * 0.55;
    const leftSlope = new THREE.Mesh(sharedGeos.unitBox, roofMat);
    leftSlope.scale.set(slopeW, 0.22, overhangD);
    leftSlope.position.set(-overhangW * 0.24, roofBaseY + 0.58, roofZOffset);
    leftSlope.rotation.z = 0.42;
    houseGroup.add(leftSlope);

    const rightSlope = new THREE.Mesh(sharedGeos.unitBox, roofMat);
    rightSlope.scale.set(slopeW, 0.22, overhangD);
    rightSlope.position.set(overhangW * 0.24, roofBaseY + 0.58, roofZOffset);
    rightSlope.rotation.z = -0.42;
    houseGroup.add(rightSlope);

    const ridge = new THREE.Mesh(sharedGeos.cylinder, roofMat);
    ridge.scale.set(0.18, overhangD + 0.1, 0.18);
    ridge.rotation.x = Math.PI / 2;
    ridge.position.set(0, roofBaseY + 1.08, roofZOffset);
    houseGroup.add(ridge);

    const gableShape = new THREE.Shape();
    gableShape.moveTo(-W / 2, 0);
    gableShape.lineTo(W / 2, 0);
    gableShape.lineTo(0, 1.05);
    gableShape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(gableShape, {
      depth: D,
      bevelEnabled: false,
    });
    gableGeo.translate(0, 0, -D / 2);
    const gableFiller = new THREE.Mesh(gableGeo, lowerWallMat);
    gableFiller.position.set(0, roofBaseY - 0.02, 0);
    houseGroup.add(gableFiller);

    for (let r = -2; r <= 2; r++) {
      const rafter = new THREE.Mesh(sharedGeos.unitBox, sharedMats.rafterWood);
      rafter.scale.set(0.12, 0.12, overhangD + 0.15);
      rafter.position.set(r * (W * 0.2), roofBaseY + 0.12, roofZOffset);
      houseGroup.add(rafter);
    }
  }

  // 7. Rooftop Props: Satellite Dish & Blue Water Tank
  if (spec.hasSatelliteDish) {
    const dishGroup = new THREE.Group();
    const mast = new THREE.Mesh(sharedGeos.cylinder, sharedMats.galvanizedSteel);
    mast.scale.set(0.05, 0.85, 0.05);
    mast.position.set(0, 0.42, 0);
    dishGroup.add(mast);

    const dish = new THREE.Mesh(sharedGeos.cylinder, sharedMats.galvanizedSteel);
    dish.scale.set(0.55, 0.12, 0.55);
    dish.position.set(0, 0.82, 0.1);
    dish.rotation.x = 0.65;
    dishGroup.add(dish);

    dishGroup.position.set(W * 0.34, roofBaseY + 0.35, D * 0.28);
    houseGroup.add(dishGroup);
  }

  if (spec.hasWaterTank) {
    const tank = new THREE.Mesh(sharedGeos.cylinder, sharedMats.waterTankBlue);
    tank.scale.set(0.75, 0.92, 0.75);
    tank.position.set(-W * 0.22, roofBaseY + 0.75, -D * 0.18);
    houseGroup.add(tank);

    const lid = new THREE.Mesh(sharedGeos.cylinder, sharedMats.waterTankBlue);
    lid.scale.set(0.82, 0.12, 0.82);
    lid.position.set(-W * 0.22, roofBaseY + 1.22, -D * 0.18);
    houseGroup.add(lid);
  }

  // 8. Inter-House Spacing Lot: Terreno Baldio & Brick House Under Construction ("Espaçamentos com casas sendo construídas com tijolos e terreno baldio")
  const spacingGap = Math.max(5.8, spec.spacingAfter + 2.2);
  // When rotated by +Math.PI/2 (left) or -Math.PI/2 (right), local +X (left) or -X (right) points to -Z along the street
  const alongStreetSign = side === 'left' ? 1 : -1;
  const lotCenterX = alongStreetSign * (W / 2 + spacingGap / 2 + 0.4);

  const constructionLot = buildVacantLotOrBrickConstruction(spec.id, spacingGap, D * 0.85);
  constructionLot.position.set(lotCenterX, 0, 0);
  houseGroup.add(constructionLot);

  if (spec.treeType !== 'none') {
    const tree = buildTropicalTree(spec.treeType);
    tree.position.set(lotCenterX + alongStreetSign * 0.8, 0, -D * 0.22);
    houseGroup.add(tree);
  }

  // 9. Orient the house straight aligned facing the street (90 degrees, NEVER diagonal!)
  if (side === 'left') {
    houseGroup.rotation.y = Math.PI / 2; // Faces directly toward street (+X)
  } else {
    houseGroup.rotation.y = -Math.PI / 2; // Faces directly toward street (-X)
  }

  addCartoonOutlinesToGroup(houseGroup);
  applyWorldCurvatureToGroup(houseGroup);
  return houseGroup;
}

/**
 * Builds a Brazilian Sidewalk Concrete Utility Pole ("Poste de Concreto com Fios e Luminária")
 */
export function buildUtilityPoleWithWires(
  side: 'left' | 'right',
  poleSpacingZ: number,
  _includeCrossStreetWire: boolean,
  includeTransformer: boolean,
): THREE.Group {
  const group = new THREE.Group();
  // Kept at 4.35m so the longitudinal wire bundle stays at y = 3.5 .. 4.15m,
  // projecting on screen strictly BELOW the elevated diagonal Outdoor Billboards (y = 5.85 .. 9.2m)!
  const poleH = 4.35;

  const pole = new THREE.Mesh(sharedGeos.cylinder, sharedMats.poleConcrete);
  pole.scale.set(0.15, poleH, 0.15);
  pole.position.set(0, poleH / 2, 0);
  group.add(pole);

  const baseCollar = new THREE.Mesh(sharedGeos.cylinder, sharedMats.darkMetal);
  baseCollar.scale.set(0.18, 0.75, 0.18);
  baseCollar.position.set(0, 0.38, 0);
  group.add(baseCollar);

  const crossArm1 = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
  crossArm1.scale.set(0.11, 0.11, 1.25);
  crossArm1.position.set(0, poleH - 0.25, 0);
  group.add(crossArm1);

  const crossArm2 = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
  crossArm2.scale.set(0.09, 0.09, 1.0);
  crossArm2.position.set(0, poleH - 0.78, 0);
  group.add(crossArm2);

  for (const zOff of [-0.48, 0, 0.48]) {
    const ins = new THREE.Mesh(sharedGeos.cylinder, sharedMats.galvanizedSteel);
    ins.scale.set(0.055, 0.14, 0.055);
    ins.position.set(0, poleH - 0.16, zOff);
    group.add(ins);
  }

  if (includeTransformer) {
    const trans = new THREE.Mesh(sharedGeos.cylinder, sharedMats.meterBox);
    trans.scale.set(0.28, 0.68, 0.28);
    trans.position.set(side === 'left' ? -0.24 : 0.24, poleH - 1.25, 0);
    group.add(trans);
  }

  const roadDir = side === 'left' ? 1 : -1;
  const arm = new THREE.Mesh(sharedGeos.unitBox, sharedMats.galvanizedSteel);
  arm.scale.set(1.28, 0.065, 0.065);
  arm.position.set(roadDir * 0.6, poleH - 0.42, 0);
  arm.rotation.z = roadDir * 0.22;
  group.add(arm);

  const lampHousing = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
  lampHousing.scale.set(0.38, 0.11, 0.22);
  lampHousing.position.set(roadDir * 1.22, poleH - 0.28, 0);
  group.add(lampHousing);

  const lampBulb = new THREE.Mesh(sharedGeos.unitBox, sharedMats.lampGlow);
  lampBulb.scale.set(0.28, 0.055, 0.16);
  lampBulb.position.set(roadDir * 1.22, poleH - 0.33, 0);
  group.add(lampBulb);

  addCartoonOutlinesToGroup(group);

  // Clean longitudinal electrical wire bundle along the sidewalk (stays at y = 3.55 .. 4.15m so it never crosses billboards!)
  const wireOffsets = [-0.48, -0.16, 0.16, 0.48];
  for (let wIdx = 0; wIdx < wireOffsets.length; wIdx++) {
    const xOff = wireOffsets[wIdx];
    const sagDrop = 0.55 + (wIdx % 2) * 0.14;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(xOff * 0.28, poleH - 0.18, 0),
      new THREE.Vector3(xOff * 0.28, poleH - sagDrop, -poleSpacingZ * 0.5),
      new THREE.Vector3(xOff * 0.28, poleH - 0.18, -poleSpacingZ),
    );
    const tubeGeo = new THREE.TubeGeometry(curve, 12, 0.019, 4, false);
    const wireMesh = new THREE.Mesh(tubeGeo, sharedMats.wireBlack);
    group.add(wireMesh);
  }

  // Lower secondary telecom cable
  const lowCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, poleH - 0.78, 0),
    new THREE.Vector3(0, poleH - 1.12, -poleSpacingZ * 0.5),
    new THREE.Vector3(0, poleH - 0.78, -poleSpacingZ),
  );
  const lowTube = new THREE.TubeGeometry(lowCurve, 12, 0.02, 4, false);
  group.add(new THREE.Mesh(lowTube, sharedMats.wireBlack));

  applyWorldCurvatureToGroup(group);
  return group;
}

const orelhaoYellowMat = new THREE.MeshStandardMaterial({
  color: 0xfacc15,
  roughness: 0.38,
  metalness: 0.08,
});
const orelhaoBlueMat = new THREE.MeshStandardMaterial({
  color: 0x0284c7,
  roughness: 0.38,
  metalness: 0.08,
});
const orelhaoCavityMat = new THREE.MeshStandardMaterial({
  color: 0x292524,
  roughness: 0.92,
  metalness: 0.02,
});
const orelhaoPhoneBoxMat = new THREE.MeshStandardMaterial({
  color: 0x2563eb,
  roughness: 0.45,
  metalness: 0.35,
});
const orelhaoDecalPurpleMat = new THREE.MeshBasicMaterial({
  color: 0x7e22ce,
});

/**
 * Builds an Authentic Brazilian Sidewalk Payphone ("Orelhão BR") matching the user's reference photo:
 * Curved fiberglass acoustic dome shell (iconic yellow with top sticker decal & blue-gray metallic card phone box inside).
 */
const orelhaoDomeGeo = new THREE.SphereGeometry(1, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.66);
const orelhaoInnerCavityMat = new THREE.MeshStandardMaterial({
  color: 0x1c1917,
  roughness: 0.95,
  metalness: 0.02,
  side: THREE.BackSide,
});

/**
 * Builds an Authentic Brazilian Sidewalk Payphone ("Orelhão BR") matching the user's reference photo:
 * Open concave fiberglass acoustic dome shell (iconic yellow with top sticker decal & blue-gray metallic card phone box inside).
 */
export function buildBrazilianOrelhao(
  side: 'left' | 'right',
  variantIndex = 0,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Orelhao_BR_${side}_${variantIndex}`;

  const roadSign = side === 'left' ? 1 : -1;
  const shellMat = variantIndex % 4 === 3 ? orelhaoBlueMat : orelhaoYellowMat;

  // 1. Sturdy dark metallic post anchored to the sidewalk
  const post = new THREE.Mesh(sharedGeos.cylinder, sharedMats.darkMetal);
  post.scale.set(0.09, 1.45, 0.09);
  post.position.set(0, 0.725, 0);
  group.add(post);

  const baseFlange = new THREE.Mesh(sharedGeos.cylinder, sharedMats.concreteStep);
  baseFlange.scale.set(0.19, 0.12, 0.19);
  baseFlange.position.set(0, 0.06, 0);
  group.add(baseFlange);

  // 2. Iconic Open Concave Fiberglass Acoustic Dome Shell ("Concha Acústica do Orelhão")
  const domePivot = new THREE.Group();
  domePivot.position.set(0, 1.72, 0);
  // Orient open mouth toward the camera (+Z) and slightly toward the sidewalk/street so interior phone is 100% visible!
  domePivot.rotation.y = roadSign * 0.34;

  // Open dome shell rotated so the open 34% mouth faces forward-down (+Z, -Y)
  const shellGroup = new THREE.Group();
  shellGroup.rotation.x = -Math.PI * 0.36;

  const outerShell = new THREE.Mesh(orelhaoDomeGeo, shellMat);
  outerShell.scale.set(0.72, 0.92, 0.68);
  shellGroup.add(outerShell);

  // Dark acoustic interior lining (BackSide of slightly smaller open dome — zero z-fighting!)
  const innerLining = new THREE.Mesh(orelhaoDomeGeo, orelhaoInnerCavityMat);
  innerLining.scale.set(0.67, 0.87, 0.63);
  innerLining.userData.hasCartoonOutline = true; // Skip outline on inner backside lining
  shellGroup.add(innerLining);

  domePivot.add(shellGroup);

  // Lower yellow/blue chin collar where the post enters the bottom of the shell
  const bottomCollar = new THREE.Mesh(sharedGeos.cylinder, shellMat);
  bottomCollar.scale.set(0.36, 0.12, 0.32);
  bottomCollar.position.set(0, -0.58, -0.04);
  domePivot.add(bottomCollar);

  // Top campaign/ad sticker decal on the forehead of the yellow dome (matching the reference photo!)
  const stickerBg = new THREE.Mesh(sharedGeos.unitBox, orelhaoDecalPurpleMat);
  stickerBg.scale.set(0.44, 0.16, 0.04);
  stickerBg.position.set(-0.06, 0.64, 0.42);
  stickerBg.rotation.x = -0.52;
  stickerBg.rotation.z = 0.1;
  domePivot.add(stickerBg);

  // Side telecom lettering stripe ("SERCOMTEL / OI / TELEMAR")
  const sideStripe = new THREE.Mesh(sharedGeos.unitBox, orelhaoPhoneBoxMat);
  sideStripe.scale.set(0.04, 0.44, 0.18);
  sideStripe.position.set(roadSign * 0.69, 0.16, 0.04);
  sideStripe.rotation.x = -0.35;
  domePivot.add(sideStripe);

  // 3. Internal Metallic Blue-Gray Telephone Box, Silver Instruction Plate, Keypad & Black Handset
  // Positioned cleanly inside the open concave cavity so it is clearly visible from the street!
  const instructionPlate = new THREE.Mesh(sharedGeos.unitBox, sharedMats.galvanizedSteel);
  instructionPlate.scale.set(0.28, 0.13, 0.05);
  instructionPlate.position.set(0.02, 0.28, 0.02);
  domePivot.add(instructionPlate);

  const phoneBody = new THREE.Mesh(sharedGeos.unitBox, orelhaoPhoneBoxMat);
  phoneBody.scale.set(0.38, 0.46, 0.18);
  phoneBody.position.set(0.02, -0.05, 0.04);
  domePivot.add(phoneBody);

  // Metallic keypad face & card reader slot
  const keypadPlate = new THREE.Mesh(sharedGeos.unitBox, sharedMats.galvanizedSteel);
  keypadPlate.scale.set(0.18, 0.18, 0.04);
  keypadPlate.position.set(0.08, 0.02, 0.13);
  domePivot.add(keypadPlate);

  const cardSlotPlate = new THREE.Mesh(sharedGeos.unitBox, sharedMats.concreteStep);
  cardSlotPlate.scale.set(0.18, 0.14, 0.04);
  cardSlotPlate.position.set(0.08, -0.16, 0.13);
  domePivot.add(cardSlotPlate);

  // Black telephone handset ("monofone no gancho") on the left side of the phone box
  const handsetBar = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
  handsetBar.scale.set(0.08, 0.28, 0.09);
  handsetBar.position.set(-0.1, -0.02, 0.15);
  domePivot.add(handsetBar);

  // Hanging steel cord loop below the phone
  const cordLoop = new THREE.Mesh(sharedGeos.cylinder, sharedMats.galvanizedSteel);
  cordLoop.scale.set(0.016, 0.34, 0.016);
  cordLoop.position.set(-0.08, -0.38, 0.12);
  cordLoop.rotation.z = 0.15;
  domePivot.add(cordLoop);

  group.add(domePivot);

  addCartoonOutlinesToGroup(group);
  applyWorldCurvatureToGroup(group);
  return group;
}

/**
 * Builds a Roadside Brazilian "Outdoor" Advertising Billboard ("SEU ANÚNCIO AQUI!")
 * ("arruem nos autdor para nao ficar bugado dentro das casas"):
 * - Support column is offset into the open inter-house backyard gap so it NEVER clips through any house wall or roof.
 * - Elevated steel column (pillarH = 9.0m) places the entire billboard frame & catwalk (y = 8.95 .. 12.45m)
 *   cleanly ABOVE all 1-story and 2-story house roofs (y <= 8.55m), Mercadinho signs (y <= 5.6m), and utility pole wires (y <= 4.35m)!
 */
export function buildRoadsideOutdoorBillboard(
  side: 'left' | 'right',
  variantIndex = 0,
  maxAnisotropy = 4,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Outdoor_Billboard_${side}_${variantIndex}`;

  const roadSign = side === 'left' ? 1 : -1;
  const boardW = 6.5;
  const boardH = 3.35;
  // Elevated to 9.0m so the bottom of the billboard catwalk (y = 8.95m) clears even the tallest 2-story Sobrado roof (8.55m)!
  const pillarH = 9.0;
  // Offset column slightly outward behind the house line while cantilevering the diagonal board over the clear airspace above the roofs
  const colOffsetX = -roadSign * 1.45;

  // 1. Heavy cylindrical dark-steel support column + concrete footing in the open inter-house gap
  const footing = new THREE.Mesh(sharedGeos.cylinder, sharedMats.concreteStep);
  footing.scale.set(0.56, 0.36, 0.56);
  footing.position.set(colOffsetX, 0.18, 0);
  group.add(footing);

  const mainColumn = new THREE.Mesh(sharedGeos.cylinder, sharedMats.darkMetal);
  mainColumn.scale.set(0.34, pillarH, 0.34);
  mainColumn.position.set(colOffsetX, pillarH * 0.5, 0);
  group.add(mainColumn);

  // Horizontal steel cantilever cross-arm at y = 8.95m connecting the outer column to the diagonal billboard head
  const cantileverBeam = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
  cantileverBeam.scale.set(Math.abs(colOffsetX) + 0.5, 0.28, 0.32);
  cantileverBeam.position.set(colOffsetX * 0.5, pillarH - 0.08, 0);
  group.add(cantileverBeam);

  // 2. Pivoted Billboard Head angled in diagonal above/behind the houses, facing the oncoming audience!
  const boardPivot = new THREE.Group();
  boardPivot.position.set(0, pillarH + boardH * 0.5 + 0.12, 0);
  boardPivot.rotation.y = roadSign * 0.52; // ~30° diagonal facing the street & player camera

  // Outer dark metallic structural frame
  const outerFrame = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
  outerFrame.scale.set(boardW + 0.34, boardH + 0.32, 0.26);
  boardPivot.add(outerFrame);

  // Inner light metallic border trim
  const innerTrim = new THREE.Mesh(sharedGeos.unitBox, sharedMats.galvanizedSteel);
  innerTrim.scale.set(boardW + 0.12, boardH + 0.12, 0.3);
  boardPivot.add(innerTrim);

  // High-contrast "SEU ANÚNCIO AQUI!" billboard canvas face (+Z facing the player)
  const adTex = createBillboardAdTexture(variantIndex, maxAnisotropy);
  const adMat = new THREE.MeshBasicMaterial({
    map: adTex,
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  applyWorldCurvatureToMaterial(adMat);

  const adFaceFront = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardH), adMat);
  adFaceFront.position.set(0, 0, 0.21);
  boardPivot.add(adFaceFront);

  // Lower steel maintenance catwalk & truss beam ("passarela metálica inferior do outdoor")
  const catwalkBeam = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
  catwalkBeam.scale.set(boardW * 0.96, 0.15, 0.52);
  catwalkBeam.position.set(0, -boardH * 0.5 - 0.26, 0.16);
  boardPivot.add(catwalkBeam);

  for (let b = -3; b <= 3; b++) {
    const bracket = new THREE.Mesh(sharedGeos.unitBox, sharedMats.galvanizedSteel);
    bracket.scale.set(0.08, 0.24, 0.4);
    bracket.position.set(b * (boardW * 0.14), -boardH * 0.5 - 0.16, 0.12);
    boardPivot.add(bracket);
  }

  // 3 Overhead Floodlight Arms on top of the billboard (matching Reference Image 1!)
  for (const lx of [-boardW * 0.32, 0, boardW * 0.32]) {
    const arm = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
    arm.scale.set(0.07, 0.48, 0.6);
    arm.position.set(lx, boardH * 0.5 + 0.32, 0.24);
    arm.rotation.x = 0.35;
    boardPivot.add(arm);

    const floodHood = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
    floodHood.scale.set(0.38, 0.13, 0.26);
    floodHood.position.set(lx, boardH * 0.5 + 0.48, 0.5);
    floodHood.rotation.x = 0.25;
    boardPivot.add(floodHood);

    const floodLens = new THREE.Mesh(sharedGeos.unitBox, sharedMats.lampGlow);
    floodLens.scale.set(0.3, 0.06, 0.18);
    floodLens.position.set(lx, boardH * 0.5 + 0.43, 0.5);
    floodLens.rotation.x = 0.25;
    boardPivot.add(floodLens);
  }

  group.add(boardPivot);

  addCartoonOutlinesToGroup(group);
  applyWorldCurvatureToGroup(group);
  return group;
}

const solidSkylineMarbleMat = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  roughness: 0.38,
  metalness: 0.08,
  fog: false,
});
const solidSkylineDarkMetalMat = new THREE.MeshStandardMaterial({
  color: 0x27272a,
  roughness: 0.45,
  metalness: 0.65,
  fog: false,
});
const solidSkylineBrazilGreenMat = new THREE.MeshStandardMaterial({
  color: 0x009b3a,
  roughness: 0.38,
  metalness: 0.12,
  fog: false,
});
const solidSkylineBrazilYellowMat = new THREE.MeshStandardMaterial({
  color: 0xfedf00,
  roughness: 0.35,
  metalness: 0.15,
  fog: false,
});
const solidSkylineEmeraldGlassMat = new THREE.MeshStandardMaterial({
  color: 0x10b981,
  roughness: 0.22,
  metalness: 0.3,
  fog: false,
});
const solidSkylineConcreteMat = new THREE.MeshStandardMaterial({
  color: 0x9ca3af,
  roughness: 0.8,
  metalness: 0.05,
  fog: false,
});
const solidSkylineSteelMat = new THREE.MeshStandardMaterial({
  color: 0xcbd5e1,
  roughness: 0.35,
  metalness: 0.7,
  fog: false,
});

/**
 * Builds Dynamic Rio de Janeiro High-Rise Buildings in Deep 3D Perspective:
 * Uses `fog: false` so horizon buildings are 100% solid and never look transparent against the sky,
 * and makes the Green Brasil Flag Tower (`v === 0`) much taller and wider with a huge Bandeira do Brasil!
 */
export function buildRioSkylineBuilding(
  variantIndex: number,
  side: 'left' | 'right',
  maxAnisotropy = 4,
): THREE.Group {
  const group = new THREE.Group();
  const v = ((variantIndex % 4) + 4) % 4;
  const streetSign = side === 'left' ? 1 : -1;

  const isBrasilTower = v === 0;
  const isCurvedWaveTower = v === 1;
  const isArtDeco = v === 2;

  const paletteKey = isBrasilTower
    ? 'brasil_green'
    : isCurvedWaveTower
      ? 'copacabana_wave'
      : isArtDeco
        ? 'art_deco_historic'
        : 'ipanema_modern';

  const facadeTex = getRioBuildingFacadeTexture(paletteKey, maxAnisotropy);
  const facadeMat = new THREE.MeshStandardMaterial({
    map: facadeTex,
    color: 0xffffff,
    roughness: 0.46,
    metalness: 0.16,
    fog: false,
  });

  // The Green Brasil Flag Building is much larger and taller ("deixe o predio verde bem maior com bandeira brasil")
  const W = isBrasilTower ? 15.2 : isCurvedWaveTower ? 10.4 : 9.8;
  const D = isBrasilTower ? 12.6 : 9.8;
  const H = isBrasilTower ? 46.5 : isCurvedWaveTower ? 28.5 : isArtDeco ? 26.0 : 29.0;

  // 1. Deep Ground-Anchored Architectural Podium (extends down to y = -24 so it never floats even under horizon curvature!)
  const podium = new THREE.Mesh(sharedGeos.unitBox, solidSkylineMarbleMat);
  podium.scale.set(W + 1.4, 28.0, D + 1.4);
  podium.position.set(0, -10.5, 0);
  group.add(podium);

  const lobbyGlass = new THREE.Mesh(sharedGeos.unitBox, solidSkylineDarkMetalMat);
  lobbyGlass.scale.set(W + 0.8, 2.8, D + 0.8);
  lobbyGlass.position.set(0, 1.5, 0);
  group.add(lobbyGlass);

  // 2. Main High-Rise Tower Shaft (subdivided vertically so it bends smoothly with the curved horizon)
  const mainTower = new THREE.Mesh(sharedGeos.tallBox, facadeMat);
  mainTower.scale.set(W, H, D);
  mainTower.position.set(0, H / 2, 0);
  group.add(mainTower);

  // 3. Wrap-around Bold Cartoon 3D Architectural Reliefs on BOTH Camera-Facing (+Z) & Street-Facing (±X) Sides
  if (isBrasilTower) {
    const windowGlassCyanMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.22,
      metalness: 0.15,
      fog: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const windowLitGoldMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      fog: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    // Vertical emerald-green structural pilasters on corners and street-facing center
    for (const xCorner of [-W * 0.48, -W * 0.16, W * 0.16, W * 0.48]) {
      const greenColumn = new THREE.Mesh(sharedGeos.tallBox, solidSkylineBrazilGreenMat);
      greenColumn.scale.set(0.84, H + 0.8, D + 0.56);
      greenColumn.position.set(xCorner, H / 2 + 0.4, 0);
      group.add(greenColumn);
    }
    for (const zBand of [-D * 0.48, 0, D * 0.48]) {
      const sidePilaster = new THREE.Mesh(sharedGeos.tallBox, solidSkylineBrazilGreenMat);
      sidePilaster.scale.set(W + 0.56, H + 0.8, 0.84);
      sidePilaster.position.set(0, H / 2 + 0.4, zBand);
      group.add(sidePilaster);
    }

    // 3D Cartoon Glass Window Bays on the Front (+Z) and Street-Facing (±X) Facades
    const bayOffsetsX = [-W * 0.32, 0, W * 0.32];
    for (let bIdx = 0; bIdx < bayOffsetsX.length; bIdx++) {
      const bx = bayOffsetsX[bIdx];
      const glassBay = new THREE.Mesh(sharedGeos.tallBox, windowGlassCyanMat);
      glassBay.scale.set(2.9, H - 5.2, 0.32);
      glassBay.position.set(bx, H * 0.5, D / 2 + 0.22);
      group.add(glassBay);

      // Bold cartoon illuminated office windows aligned with the 8 cartoon floors
      for (let fl = 1; fl <= 8; fl++) {
        if ((fl + bIdx) % 2 === 0) {
          const litPane = new THREE.Mesh(sharedGeos.unitBox, windowLitGoldMat);
          litPane.scale.set(2.4, 2.2, 0.36);
          litPane.position.set(bx, fl * 5.2 - 1.2, D / 2 + 0.28);
          group.add(litPane);
        }
      }
    }

    // Street-facing (±X) 3D glass window bays
    for (const bz of [-D * 0.25, D * 0.25]) {
      const sideGlassBay = new THREE.Mesh(sharedGeos.tallBox, windowGlassCyanMat);
      sideGlassBay.scale.set(0.32, H - 5.2, 3.2);
      sideGlassBay.position.set(streetSign * (W / 2 + 0.22), H * 0.5, bz);
      group.add(sideGlassBay);
    }

    // Horizontal wrap-around canary-yellow & white cartoon brise-soleil floor ledges (8 bold floors — zero flicker!)
    for (let floor = 1; floor <= 8; floor++) {
      const by = floor * 5.4;
      const louverSlab = new THREE.Mesh(
        sharedGeos.unitBox,
        floor % 2 === 0 ? solidSkylineBrazilYellowMat : solidSkylineMarbleMat,
      );
      louverSlab.scale.set(W + 1.05, 0.54, D + 1.05);
      louverSlab.position.set(0, by, 0);
      group.add(louverSlab);
    }

    // SCULPTED AERODYNAMIC "CORTA-VENTO" (WIND-CUTTER) SLANTED CROWN AT THE TOP
    const crownBase = new THREE.Mesh(sharedGeos.unitBox, solidSkylineBrazilGreenMat);
    crownBase.scale.set(W + 1.4, 1.5, D + 1.4);
    crownBase.position.set(0, H + 0.75, 0);
    group.add(crownBase);

    const crownYellowBand = new THREE.Mesh(sharedGeos.unitBox, solidSkylineBrazilYellowMat);
    crownYellowBand.scale.set(W + 1.55, 0.65, D + 1.55);
    crownYellowBand.position.set(0, H + 1.75, 0);
    group.add(crownYellowBand);

    // Slanted Glass Sky-Lounge Penthouse inside the Wind-Cutter Crown
    const skyLoungeGlass = new THREE.Mesh(sharedGeos.unitBox, windowGlassCyanMat);
    skyLoungeGlass.scale.set(W * 0.82, 4.2, D * 0.76);
    skyLoungeGlass.position.set(0, H + 3.8, -0.4);
    group.add(skyLoungeGlass);

    // 5 Sculpted Diagonal Sloped "Corta-Vento" Aerodynamic Fins sweeping upward across the crown
    const finPositionsX = [-W * 0.44, -W * 0.22, 0, W * 0.22, W * 0.44];
    for (let fIdx = 0; fIdx < finPositionsX.length; fIdx++) {
      const fx = finPositionsX[fIdx];
      const isOuterOrCenter = fIdx === 0 || fIdx === 2 || fIdx === 4;
      const finMat = isOuterOrCenter ? solidSkylineBrazilGreenMat : solidSkylineBrazilYellowMat;

      const windFin = new THREE.Mesh(sharedGeos.unitBox, finMat);
      windFin.scale.set(0.68, 6.2, D * 0.92);
      windFin.position.set(fx, H + 4.4, -0.2);
      windFin.rotation.x = 0.38;
      group.add(windFin);
    }

    // Sloped Top Aerodynamic Wind-Deflector Roof Foil ("Aleta Superior Corta-Vento")
    const topDeflectorFoil = new THREE.Mesh(sharedGeos.unitBox, solidSkylineBrazilYellowMat);
    topDeflectorFoil.scale.set(W + 1.2, 0.62, D * 0.95);
    topDeflectorFoil.position.set(0, H + 6.6, -0.5);
    topDeflectorFoil.rotation.x = 0.36;
    group.add(topDeflectorFoil);

    const upperCrestFoil = new THREE.Mesh(sharedGeos.unitBox, solidSkylineBrazilGreenMat);
    upperCrestFoil.scale.set(W * 0.92, 0.56, D * 0.68);
    upperCrestFoil.position.set(0, H + 7.6, -1.2);
    upperCrestFoil.rotation.x = 0.36;
    group.add(upperCrestFoil);

    // Spray-Painted Urban Graffiti & Pixo Mural ("remove as 2 bandeira predios, e faca como se fosse um desenho pichado no predio")
    // Directly painted onto the skyscraper's facade with no flag frames or rooftop flagpoles
    const graffitiTex = createBuildingGraffitiMuralTexture(maxAnisotropy);
    const graffitiMat = new THREE.MeshBasicMaterial({
      map: graffitiTex,
      transparent: true,
      alphaTest: 0.06,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });

    // Large spray-painted graffiti throw-up + pixo tags across the front (+Z) facade
    const frontGraffiti = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.88, 9.6), graffitiMat);
    frontGraffiti.position.set(0, H * 0.68, D / 2 + 0.34);
    frontGraffiti.userData.noCartoonOutline = true;
    group.add(frontGraffiti);

    // Second higher pixo tag band near the upper crown
    const upperGraffiti = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.78, 6.2), graffitiMat);
    upperGraffiti.position.set(0, H * 0.88, D / 2 + 0.34);
    upperGraffiti.rotation.z = -0.04;
    upperGraffiti.userData.noCartoonOutline = true;
    group.add(upperGraffiti);

    // Street-facing side facade graffiti & pixo mural
    const sideGraffiti = new THREE.Mesh(new THREE.PlaneGeometry(D * 0.86, 9.2), graffitiMat);
    sideGraffiti.rotation.y = streetSign * (Math.PI / 2);
    sideGraffiti.position.set(streetSign * (W / 2 + 0.34), H * 0.68, 0);
    sideGraffiti.userData.noCartoonOutline = true;
    group.add(sideGraffiti);
  } else if (isCurvedWaveTower) {
    for (let b = 1; b <= 5; b++) {
      const by = b * 5.0;
      const wrapSlab = new THREE.Mesh(sharedGeos.unitBox, solidSkylineMarbleMat);
      wrapSlab.scale.set(W + 1.05, 0.52, D + 1.05);
      wrapSlab.position.set(streetSign * 0.25, by, 0.25);
      group.add(wrapSlab);

      const wrapGlass = new THREE.Mesh(sharedGeos.unitBox, solidSkylineEmeraldGlassMat);
      wrapGlass.scale.set(W + 0.88, 0.85, D + 0.88);
      wrapGlass.position.set(streetSign * 0.25, by + 0.68, 0.25);
      group.add(wrapGlass);
    }

    const roofPergola = new THREE.Mesh(sharedGeos.unitBox, solidSkylineMarbleMat);
    roofPergola.scale.set(W * 0.74, 2.2, D * 0.74);
    roofPergola.position.set(0, H + 1.1, 0);
    group.add(roofPergola);
  } else if (isArtDeco) {
    for (const offset of [-0.36, 0, 0.36]) {
      const frontRib = new THREE.Mesh(sharedGeos.tallBox, solidSkylineConcreteMat);
      frontRib.scale.set(0.62, H, D + 0.52);
      frontRib.position.set(W * offset, H / 2, 0);
      group.add(frontRib);

      const sideRib = new THREE.Mesh(sharedGeos.tallBox, solidSkylineConcreteMat);
      sideRib.scale.set(W + 0.52, H, 0.62);
      sideRib.position.set(0, H / 2, D * offset);
      group.add(sideRib);
    }

    const step1 = new THREE.Mesh(sharedGeos.unitBox, facadeMat);
    step1.scale.set(W * 0.76, 3.2, D * 0.76);
    step1.position.set(0, H + 1.6, 0);
    group.add(step1);

    const step2 = new THREE.Mesh(sharedGeos.unitBox, solidSkylineConcreteMat);
    step2.scale.set(W * 0.48, 2.4, D * 0.48);
    step2.position.set(0, H + 4.3, 0);
    group.add(step2);

    const decoSpire = new THREE.Mesh(sharedGeos.cylinder, solidSkylineSteelMat);
    decoSpire.scale.set(0.12, 4.2, 0.12);
    decoSpire.position.set(0, H + 7.2, 0);
    group.add(decoSpire);
  } else {
    for (let b = 1; b <= 5; b++) {
      const by = b * 5.0;
      const cornerBalcony = new THREE.Mesh(sharedGeos.unitBox, solidSkylineMarbleMat);
      cornerBalcony.scale.set(W + 0.96, 0.52, D + 0.96);
      cornerBalcony.position.set(streetSign * 0.22, by, 0.22);
      group.add(cornerBalcony);
    }

    const penthouse = new THREE.Mesh(sharedGeos.unitBox, solidSkylineMarbleMat);
    penthouse.scale.set(W * 0.72, 2.5, D * 0.72);
    penthouse.position.set(0, H + 1.25, 0);
    group.add(penthouse);

    const spire = new THREE.Mesh(sharedGeos.cylinder, solidSkylineSteelMat);
    spire.scale.set(0.11, 5.0, 0.11);
    spire.position.set(0, H + 4.8, 0);
    group.add(spire);
  }

  // 4. Secondary Outer Skyline Tower (Layered Metropolitan Depth in Perspective, also fog: false!)
  const secPalette =
    v === 0 ? 'copacabana_wave' : v === 1 ? 'ipanema_modern' : v === 2 ? 'brasil_green' : 'art_deco_historic';
  const secTex = getRioBuildingFacadeTexture(secPalette, maxAnisotropy);
  const secMat = new THREE.MeshStandardMaterial({
    map: secTex,
    color: 0xe2e8f0,
    roughness: 0.55,
    metalness: 0.12,
    fog: false,
  });
  const secH = (isBrasilTower ? 34.0 : H) + 6.5 + (v % 3) * 3.2;
  const secW = 10.6;
  const secD = 9.6;
  const secTower = new THREE.Mesh(sharedGeos.tallBox, secMat);
  secTower.scale.set(secW, secH + 8.0, secD);
  secTower.position.set(-streetSign * 12.8, (secH - 4.0) / 2, -8.5);
  group.add(secTower);

  const secCrown = new THREE.Mesh(sharedGeos.unitBox, solidSkylineMarbleMat);
  secCrown.scale.set(secW * 0.78, 2.4, secD * 0.78);
  secCrown.position.set(-streetSign * 12.8, secH + 1.2, -8.5);
  group.add(secCrown);

  // Soft, subtle black cartoon outlines on the horizon skyscrapers ("coloque leves contorno preto nas montanhas e nos predios bem suave")
  addSoftBuildingOutlinesToGroup(group);
  // Apply Dynamic Atmospheric Depth Fog to the distant skyline buildings ("efeito de Depth Fog dos predios e montanha bem dinamico")
  applyWorldCurvatureToGroup(group, {
    minFog: 0.14,
    maxFog: 0.52,
    clearHeightY: 34.0,
  });
  return group;
}

const softBuildingEdgeMat = new THREE.LineBasicMaterial({
  color: 0x141619,
  transparent: true,
  opacity: 0.34,
  fog: false,
});

const softBuildingSilhouetteHullMat = new THREE.MeshBasicMaterial({
  color: 0x141619,
  side: THREE.BackSide,
  transparent: true,
  opacity: 0.32,
  fog: false,
});

/**
 * Applies soft, delicate black cartoon outlines ("coloque leves contorno preto ... nos predios bem suave")
 * to the distant horizon skyscrapers: a soft outer backface silhouette contour + gentle architectural edge lines.
 */
function addSoftBuildingOutlinesToGroup(root: THREE.Object3D): void {
  const meshes: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh && !obj.userData.hasCartoonOutline && !obj.userData.isOutlineMesh) {
      meshes.push(obj);
    }
  });

  for (const mesh of meshes) {
    mesh.userData.hasCartoonOutline = true;
    if (mesh.userData.noCartoonOutline) continue;
    const geo = mesh.geometry;
    if (!geo || geo.type === 'PlaneGeometry') continue;

    // Soft outer silhouette hull on the main skyscraper volumes
    if (geo === sharedGeos.tallBox) {
      const hull = new THREE.Mesh(geo, softBuildingSilhouetteHullMat);
      hull.userData.isOutlineMesh = true;
      hull.scale.set(1.022, 1.008, 1.022);
      mesh.add(hull);
    }

    // Gentle, soft black architectural edge contour (opacity 0.34)
    const line = new THREE.LineSegments(getCachedEdgesGeo(geo), softBuildingEdgeMat);
    line.userData.isOutlineMesh = true;
    mesh.add(line);
  }
}

/**
 * Builds a Radiant, Illustrated Cartoon Sunset Sun with Golden Sunbeams Passing Behind the Horizon Mountains & Skyline
 * ("deixe o ceu mais vivo tambem, o sol passando por tras bem lindo").
 */
export function buildRealisticHorizonSun(): {
  group: THREE.Group;
  update: (elapsed: number) => void;
} {
  const group = new THREE.Group();
  group.name = 'Cinematic_Horizon_Sunset_Sun';

  const sunUniforms = {
    uTime: { value: 0 },
  };

  const coreShaderMat = new THREE.ShaderMaterial({
    uniforms: sunUniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    blending: THREE.NormalBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float r = length(vUv);
        if (r > 1.0) discard;

        float angle = atan(vUv.y, vUv.x);

        // Cinematic anamorphic lens ratio for warm atmospheric horizon diffusion
        float rAnamorphic = length(vec2(vUv.x * 0.72, vUv.y * 1.35));

        // Subtle, elegant crepuscular rays (god rays) radiating gently
        float beam1 = sin(angle * 8.0 - uTime * 0.14) * 0.5 + 0.5;
        float beam2 = cos(angle * 12.0 + uTime * 0.09) * 0.5 + 0.5;
        float rays = (pow(beam1, 4.0) * 0.65 + pow(beam2, 3.2) * 0.35) * smoothstep(0.85, 0.22, r) * 0.18;

        // Compact, brilliant cinematic solar disc with soft golden hour corona
        float coreDisc = smoothstep(0.24, 0.17, r);
        float innerCorona = smoothstep(0.42, 0.19, r) * 0.72;
        float midHalo = smoothstep(0.72, 0.26, rAnamorphic) * 0.38;
        float outerAtmosphere = smoothstep(1.0, 0.42, rAnamorphic) * 0.20;

        vec3 coreWhite = vec3(1.0, 0.99, 0.94);
        vec3 goldCorona = vec3(1.0, 0.85, 0.32);
        vec3 sunsetAmber = vec3(0.99, 0.55, 0.22);
        vec3 twilightRose = vec3(0.95, 0.44, 0.30);

        vec3 col = mix(twilightRose, sunsetAmber, smoothstep(0.90, 0.40, rAnamorphic));
        col = mix(col, goldCorona, smoothstep(0.55, 0.22, r));
        col = mix(col, coreWhite, coreDisc + rays * 0.6);

        float alpha = clamp(coreDisc * 0.98 + innerCorona + midHalo + outerAtmosphere + rays, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  // Compact, cinematic sun plane (42x42 instead of 82x82)
  const coreQuad = new THREE.Mesh(new THREE.PlaneGeometry(42, 42), coreShaderMat);
  coreQuad.position.set(0, 0, 0);
  group.add(coreQuad);

  // Nestled gracefully behind the distant mountain saddle and Rio skyline (z = -185)
  group.position.set(1.0, 32.5, -185.0);

  return {
    group,
    update: (elapsed: number) => {
      sunUniforms.uTime.value = elapsed;
      // Majestic, slow celestial drift in the horizon
      group.position.x = 1.0 + Math.sin(elapsed * 0.05) * 5.0;
      group.position.y = 32.5 + Math.cos(elapsed * 0.05) * 0.6;
    },
  };
}

/**
 * Clean Sky System: No floating 3D smoke/fog cloud billboards!
 * All digital brushstrokes and illustrated clouds are integrated directly into the sky dome texture.
 */
export function buildPerspectiveSkyClouds(_maxAnisotropy = 4): {
  group: THREE.Group;
  update: (dt: number, elapsed: number, playerSpeed: number, isPlaying: boolean) => void;
} {
  const group = new THREE.Group();
  group.name = 'Clean_Illustrated_Sky';
  return {
    group,
    update: () => {},
  };
}

/**
 * Helper to build a stylized cartoon tree or jagged tropical forest crown (inspired by Reference Image 2)
 */
const mountainTrunkMat = new THREE.MeshBasicMaterial({
  color: 0x4a2c11,
  fog: false,
});

function buildMountainForestTree(
  scale: number,
  leafMat: THREE.Material,
  accentLeafMat: THREE.Material,
  variant: number,
): THREE.Group {
  const tg = new THREE.Group();

  const trunk = new THREE.Mesh(sharedGeos.cylinder, mountainTrunkMat);
  trunk.scale.set(0.26 * scale, 1.8 * scale, 0.26 * scale);
  trunk.position.set(0, 0.9 * scale, 0);
  tg.add(trunk);

  if (variant % 2 === 0) {
    // Jagged layered tropical forest crown (cones like Reference Image 2 top forest)
    for (let k = 0; k < 3; k++) {
      const cone = new THREE.Mesh(sharedGeos.cone, k === 2 ? accentLeafMat : leafMat);
      const r = (1.72 - k * 0.32) * scale;
      const h = (2.2 - k * 0.25) * scale;
      cone.scale.set(r, h, r);
      cone.position.set(((k % 2) - 0.5) * 0.2 * scale, (1.85 + k * 0.95) * scale, 0);
      tg.add(cone);
    }
  } else {
    // Lush rounded cartoon tree canopy puffs
    const puffs = [
      { x: 0, y: 2.35, z: 0, r: 1.5, mat: leafMat },
      { x: -0.85, y: 1.95, z: 0.35, r: 1.1, mat: accentLeafMat },
      { x: 0.85, y: 2.0, z: -0.25, r: 1.15, mat: leafMat },
      { x: 0.15, y: 3.1, z: 0.15, r: 1.0, mat: accentLeafMat },
    ];
    for (const p of puffs) {
      const sp = new THREE.Mesh(sharedGeos.sphere, p.mat);
      sp.scale.set(p.r * scale, p.r * 0.88 * scale, p.r * scale);
      sp.position.set(p.x * scale, p.y * scale, p.z * scale);
      tg.add(sp);
    }
  }

  return tg;
}

/**
 * Creates an optimized sculpted 3D crag peak geometry with realistic vertical granite rock flutes,
 * chiseled ridges, and a seamless rounded summit dome.
 */
function createSculptedMountainCragGeo(
  topRadius = 0.18,
  bottomRadius = 1.0,
  radialSegs = 18,
  heightSegs = 12,
  seed = 1.0,
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, 1.0, radialSegs, heightSegs, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i); // -0.5 to +0.5
    let z = pos.getZ(i);
    const hNorm = Math.max(0, Math.min(1, y + 0.5)); // 0 at base, 1 at summit
    const rXZ = Math.hypot(x, z);
    const angle = Math.atan2(z, x);

    // Deep vertical rock flutes and craggy ribs matching the coastal mountain reference photo
    const flute1 = Math.sin(angle * 5.0 + seed * 1.7) * 0.15;
    const flute2 = Math.cos(angle * 9.0 - seed * 2.3 + hNorm * 2.2) * 0.09;
    const flute3 = Math.sin(angle * 14.0 + seed * 3.1 - hNorm * 3.5) * 0.045;
    const cliffStep = Math.sin(hNorm * 9.0 + angle * 3.0 + seed) * 0.05 * (1.0 - hNorm * 0.35);

    // Smoothly arch the top cap into an organic craggy summit dome so there is never a flat horizontal cylinder seam
    const crownProfile = hNorm > 0.72 ? 1.0 - Math.pow((hNorm - 0.72) / 0.28, 1.55) * 0.42 : 1.0;
    const radialScale = (1.0 + flute1 + flute2 + flute3 + cliffStep) * crownProfile;

    x *= radialScale;
    z *= radialScale;

    // Arch the top disk vertices upward toward the center so the summit is a natural rounded rock peak
    if (y > 0.48) {
      const centerFactor = Math.max(0, 1.0 - rXZ / Math.max(0.05, topRadius));
      y += centerFactor * 0.08 + Math.sin(angle * 3.0 + seed) * 0.018;
    }

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Merges multiple transformed mountain crag BufferGeometries into a single static BufferGeometry
 * with pre-baked scale-corrected normals and a per-vertex `aCragLocalPos` attribute so the entire
 * 16-peak Corcovado mountain massif renders in 1 single draw call!
 */
function mergeMountainCragGeometries(
  parts: Array<{
    geo: THREE.BufferGeometry;
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    rotY: number;
    rotZ?: number;
  }>,
): THREE.BufferGeometry {
  let totalVerts = 0;
  let totalIndices = 0;

  for (const part of parts) {
    const posAttr = part.geo.attributes.position;
    totalVerts += posAttr.count;
    const idxAttr = part.geo.index;
    totalIndices += idxAttr ? idxAttr.count : posAttr.count;
  }

  const mergedPositions = new Float32Array(totalVerts * 3);
  const mergedNormals = new Float32Array(totalVerts * 3);
  const mergedCragLocalPos = new Float32Array(totalVerts * 3);
  const mergedIndices = new Uint32Array(totalIndices);

  const mat4 = new THREE.Matrix4();
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();
  const posVec = new THREE.Vector3();
  const scaleVec = new THREE.Vector3();
  const vTmp = new THREE.Vector3();
  const nTmp = new THREE.Vector3();

  let vertOffset = 0;
  let idxOffset = 0;

  for (const part of parts) {
    const { geo, x, y, z, sx, sy, sz, rotY, rotZ = 0 } = part;
    posVec.set(x, y, z);
    euler.set(0, rotY, rotZ, 'XYZ');
    quat.setFromEuler(euler);
    scaleVec.set(sx, sy, sz);
    mat4.compose(posVec, quat, scaleVec);

    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const lx = posAttr.getX(i);
      const ly = posAttr.getY(i);
      const lz = posAttr.getZ(i);

      const outIdx = (vertOffset + i) * 3;
      mergedCragLocalPos[outIdx] = lx;
      mergedCragLocalPos[outIdx + 1] = ly;
      mergedCragLocalPos[outIdx + 2] = lz;

      vTmp.set(lx, ly, lz).applyMatrix4(mat4);
      mergedPositions[outIdx] = vTmp.x;
      mergedPositions[outIdx + 1] = vTmp.y;
      mergedPositions[outIdx + 2] = vTmp.z;

      // Scale-corrected normal rotated by quat
      nTmp
        .set(
          normAttr.getX(i) / Math.max(0.0001, sx),
          normAttr.getY(i) / Math.max(0.0001, sy),
          normAttr.getZ(i) / Math.max(0.0001, sz),
        )
        .normalize()
        .applyQuaternion(quat)
        .normalize();
      mergedNormals[outIdx] = nTmp.x;
      mergedNormals[outIdx + 1] = nTmp.y;
      mergedNormals[outIdx + 2] = nTmp.z;
    }

    const idxAttr = geo.index;
    if (idxAttr) {
      const ic = idxAttr.count;
      for (let j = 0; j < ic; j++) {
        mergedIndices[idxOffset + j] = vertOffset + idxAttr.getX(j);
      }
      idxOffset += ic;
    } else {
      for (let j = 0; j < count; j++) {
        mergedIndices[idxOffset + j] = vertOffset + j;
      }
      idxOffset += count;
    }

    vertOffset += count;
  }

  const mergedGeo = new THREE.BufferGeometry();
  mergedGeo.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3));
  mergedGeo.setAttribute('normal', new THREE.BufferAttribute(mergedNormals, 3));
  mergedGeo.setAttribute('aCragLocalPos', new THREE.BufferAttribute(mergedCragLocalPos, 3));
  mergedGeo.setIndex(new THREE.BufferAttribute(mergedIndices, 1));
  mergedGeo.computeBoundingSphere();
  return mergedGeo;
}

/**
 * Custom Directional Scenery Lighting Shader Material ("iluminacao cenario na montanha igual na imagem")
 * Computes horizon curvature strictly in WORLD SPACE (`worldPosition.z` and `worldPosition.y`) before
 * `viewMatrix` so the mountains never sway, tilt, or rock when the player runs or changes lanes!
 */
function createMountainSceneryShaderMat(): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uWorldCurveY: worldCurveUniforms.uWorldCurveY,
      uWorldCurveX: worldCurveUniforms.uWorldCurveX,
      uCurveStartZ: worldCurveUniforms.uCurveStartZ,
      uHorizonFogColor: worldCurveUniforms.uHorizonFogColor,
      uHorizonFogSkyTint: worldCurveUniforms.uHorizonFogSkyTint,
      uSunDir: { value: new THREE.Vector3(-0.74, 0.46, 0.48).normalize() },
    },
    vertexShader: `
      uniform float uWorldCurveY;
      uniform float uWorldCurveX;
      uniform float uCurveStartZ;
      attribute vec3 aCragLocalPos;
      varying vec3 vWorldPos;
      varying vec3 vScaleCorrectedNormal;
      varying vec3 vLocalPos;

      void main() {
        vLocalPos = aCragLocalPos;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        vScaleCorrectedNormal = normalize(mat3(modelMatrix) * normal);

        // Apply world curvature in WORLD SPACE (identical to road & houses) so camera pitch/yaw never sways the mountains!
        float curveDist = max(0.0, -(worldPosition.z - uCurveStartZ));
        float curveSq = curveDist * curveDist;
        worldPosition.y -= curveSq * uWorldCurveY;
        worldPosition.x += curveSq * uWorldCurveX;

        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform vec3 uHorizonFogColor;
      uniform vec3 uHorizonFogSkyTint;
      varying vec3 vWorldPos;
      varying vec3 vScaleCorrectedNormal;
      varying vec3 vLocalPos;

      void main() {
        vec3 dpx = dFdx(vWorldPos);
        vec3 dpy = dFdy(vWorldPos);
        vec3 faceNormal = normalize(cross(dpx, dpy));
        vec3 smoothN = normalize(vScaleCorrectedNormal);
        if (dot(faceNormal, smoothN) < 0.0) {
          faceNormal = -faceNormal;
        }
        vec3 N = normalize(mix(smoothN, faceNormal, 0.48));
        vec3 L = normalize(uSunDir);

        // Mountain height relative to the vista base
        float relHeight = clamp((vWorldPos.y - 33.5) / 44.0, 0.0, 1.0);
        float localHeight = clamp(vLocalPos.y + 0.5, 0.0, 1.0);

        // Vertical granite flutes & forest canopy texture Detail
        float fluteWave = sin(vWorldPos.x * 1.45 + sin(vWorldPos.y * 0.55) * 1.25);
        float fineCrag = cos(vWorldPos.x * 3.6 - vWorldPos.y * 0.85);
        float canopyDetail = sin(vWorldPos.x * 1.1 + vWorldPos.z * 0.9) * cos(vWorldPos.y * 0.75) * 0.5 + 0.5;

        vec3 flutedN = normalize(N + vec3(fluteWave * 0.22 + fineCrag * 0.10, 0.0, 0.0));

        float ndotl = dot(flutedN, L);
        float sunTerm = clamp(ndotl * 0.58 + 0.42, 0.0, 1.0);

        float celBand = smoothstep(0.22, 0.34, sunTerm) * 0.34
                      + smoothstep(0.46, 0.58, sunTerm) * 0.34
                      + smoothstep(0.70, 0.84, sunTerm) * 0.32;
        float lightMix = mix(sunTerm, celBand, 0.46);

        vec3 deepShadowSlate = vec3(0.155, 0.310, 0.435);
        vec3 midCoolTeal     = vec3(0.185, 0.395, 0.455);
        vec3 midForestGreen  = vec3(0.215, 0.455, 0.355);
        vec3 sunlitEmerald   = vec3(0.395, 0.625, 0.440);
        vec3 sunlitRidgeLime = vec3(0.560, 0.765, 0.535);

        vec3 forestCol = mix(deepShadowSlate, midCoolTeal, smoothstep(0.12, 0.36, lightMix));
        forestCol = mix(forestCol, midForestGreen, smoothstep(0.34, 0.56, lightMix));
        forestCol = mix(forestCol, sunlitEmerald, smoothstep(0.54, 0.78, lightMix));
        forestCol = mix(forestCol, sunlitRidgeLime, smoothstep(0.76, 0.96, lightMix) * (0.5 + 0.5 * canopyDetail));

        float upperCragZone = smoothstep(0.28, 0.62, relHeight) * smoothstep(0.25, 0.65, localHeight);
        float steepness = smoothstep(0.68, 0.25, abs(N.y));
        float verticalStriation = clamp((fluteWave * 0.5 + 0.5) * (fineCrag * 0.5 + 0.5) * 1.45, 0.0, 1.0);
        float rockMask = clamp(upperCragZone * steepness * (0.35 + 0.65 * verticalStriation), 0.0, 0.85);

        vec3 rockShadowBlue = vec3(0.240, 0.395, 0.520);
        vec3 rockMidGrey    = vec3(0.465, 0.595, 0.665);
        vec3 rockSunlitPale = vec3(0.765, 0.835, 0.865);
        vec3 rockCol = mix(rockShadowBlue, rockMidGrey, smoothstep(0.28, 0.58, lightMix));
        rockCol = mix(rockCol, rockSunlitPale, smoothstep(0.58, 0.86, lightMix));

        vec3 col = mix(forestCol, rockCol, rockMask);

        float leftRim = smoothstep(0.32, 0.82, clamp(-N.x * 0.72 + N.y * 0.45, 0.0, 1.0)) * smoothstep(0.2, 0.8, relHeight);
        col += vec3(0.11, 0.17, 0.13) * leftRim * 0.45;

        // Subtle atmospheric distance perspective haze since mountain is placed further back at z = -168
        vec3 coastalSkyHaze = vec3(0.46, 0.66, 0.83);
        float rightRidgeHaze = clamp((vWorldPos.x + 8.0) / 52.0, 0.0, 1.0) * 0.22;
        float shadowHaze = (1.0 - lightMix) * 0.18 + rightRidgeHaze + 0.06;
        col = mix(col, coastalSkyHaze, clamp(shadowHaze, 0.0, 0.36));

        // Single-pass soft black cartoon contour along crag silhouettes and internal rock creases (zero transparent overdraw!)
        vec3 V = normalize(cameraPosition - vWorldPos);
        float grazingSilhouette = 1.0 - abs(dot(smoothN, V));
        float ridgeCrease = clamp(length(fwidth(N)) * 2.2, 0.0, 1.0);
        float softBlackContour = clamp(
          smoothstep(0.58, 0.86, grazingSilhouette) * 0.46 +
          smoothstep(0.35, 0.85, ridgeCrease) * 0.22,
          0.0,
          0.48
        );
        col = mix(col, vec3(0.07, 0.09, 0.11), softBlackContour);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    fog: false,
  });
  curvedMaterialInstances.add(mat);
  mat.userData.hasWorldCurvature = true;
  return mat;
}

/**
 * Builds the Optimized, Sculpted Realistic-Cartoon Coastal Mountain Massif:
 * - Uses `mergeMountainCragGeometries` to combine all 16 crag peaks & base apron slices into 1 single static BufferGeometry (1 draw call!).
 * - Uses optimized segment counts (18x12 / 16x10) and single-pass shader contour with zero transparent backface overdraw.
 * - Pristine natural summit peak without the statue as requested.
 */
export function buildCorcovadoAndCristoRedentor(): THREE.Group {
  const vistaGroup = new THREE.Group();
  vistaGroup.name = 'Rio_Coastal_Mountain_Massif_Vista';

  const sceneryMountainMat = createMountainSceneryShaderMat();

  const cragGeoMain = createSculptedMountainCragGeo(0.22, 1.0, 18, 12, 1.2);
  const cragGeoTwin = createSculptedMountainCragGeo(0.18, 0.9, 16, 10, 2.5);
  const cragGeoSub = createSculptedMountainCragGeo(0.24, 1.04, 16, 10, 3.8);
  const apronGeo = createSculptedMountainCragGeo(0.28, 1.22, 16, 8, 5.1);

  const cragParts: Array<{
    geo: THREE.BufferGeometry;
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    rotY: number;
    rotZ?: number;
  }> = [
    // 1. Broad Forested Foreground Base Apron ("Mata Atlântica" lower slope)
    { geo: apronGeo, x: -22.0, y: 11.0, z: 3.2, sx: 22.0, sy: 24.0, sz: 15.0, rotY: 0.35 },
    { geo: apronGeo, x: -6.0, y: 13.0, z: 3.8, sx: 26.0, sy: 28.0, sz: 17.0, rotY: 1.15 },
    { geo: apronGeo, x: 10.0, y: 11.8, z: 3.4, sx: 24.0, sy: 25.0, sz: 16.0, rotY: 2.05 },
    { geo: apronGeo, x: 26.0, y: 9.8, z: 2.8, sx: 23.0, sy: 21.0, sz: 15.0, rotY: 0.75 },
    { geo: apronGeo, x: 42.0, y: 8.0, z: 2.2, sx: 21.0, sy: 17.0, sz: 14.0, rotY: 1.55 },

    // 2. Iconic Multi-Crag Massif Silhouette
    { geo: cragGeoTwin, x: -26.5, y: 12.5, z: 0.4, sx: 8.5, sy: 25.0, sz: 10.0, rotY: 0.4, rotZ: 0.08 },
    { geo: cragGeoSub, x: -18.5, y: 18.0, z: 0.6, sx: 14.0, sy: 36.0, sz: 13.5, rotY: 0.85, rotZ: 0.04 },
    { geo: cragGeoSub, x: -10.5, y: 19.5, z: 0.8, sx: 13.5, sy: 39.0, sz: 14.0, rotY: 1.65, rotZ: 0.02 },
    // Tallest Central Summit Crag (Top reaches y = 22.8 + 45.6/2 = 45.6)
    { geo: cragGeoMain, x: -2.2, y: 22.8, z: 1.0, sx: 15.2, sy: 45.6, sz: 15.0, rotY: 0.52, rotZ: 0.0 },
    // Narrow Twin Right Pillar Crag
    { geo: cragGeoTwin, x: 3.2, y: 21.7, z: 1.15, sx: 8.8, sy: 43.4, sz: 13.0, rotY: 2.15, rotZ: -0.03 },
    // Stepped descending right ridge spine
    { geo: cragGeoSub, x: 9.8, y: 16.8, z: 0.9, sx: 13.8, sy: 33.6, sz: 13.5, rotY: 1.1, rotZ: -0.1 },
    { geo: cragGeoSub, x: 17.5, y: 13.8, z: 0.6, sx: 14.2, sy: 27.6, sz: 13.0, rotY: 2.4, rotZ: -0.08 },
    { geo: cragGeoSub, x: 25.8, y: 11.4, z: 0.3, sx: 14.8, sy: 22.8, sz: 12.5, rotY: 0.65, rotZ: -0.06 },
    { geo: cragGeoSub, x: 34.5, y: 9.5, z: 0.0, sx: 15.2, sy: 19.0, sz: 12.0, rotY: 1.85, rotZ: -0.05 },
    { geo: cragGeoSub, x: 44.0, y: 7.8, z: -0.4, sx: 15.8, sy: 15.6, sz: 11.5, rotY: 0.95, rotZ: -0.04 },
    // Distant flanking horizon mountain on far left
    { geo: cragGeoSub, x: -39.0, y: 13.0, z: -3.0, sx: 22.0, sy: 26.0, sz: 14.0, rotY: 1.2, rotZ: 0.0 },
  ];

  const mergedMountainGeo = mergeMountainCragGeometries(cragParts);
  // Dispose temporary unmerged template geometries
  cragGeoMain.dispose();
  cragGeoTwin.dispose();
  cragGeoSub.dispose();
  apronGeo.dispose();

  const mergedMountainMesh = new THREE.Mesh(mergedMountainGeo, sceneryMountainMat);
  mergedMountainMesh.name = 'Optimized_SingleDraw_Mountain_Massif';
  mergedMountainMesh.matrixAutoUpdate = false;
  mergedMountainMesh.updateMatrix();
  vistaGroup.add(mergedMountainMesh);

  return vistaGroup;
}

/**
 * Soft, harmonious Hand-Painted Cartoon Favela Palette (Reference Images 2 & 3:
 * warm terracotta clay bricks, soft mustard/ochre, dusty rose, sky blue, sage mint, cream, lavender)
 */
const FAVELA_PALETTES = [
  { wall: '#D46A4C', trim: '#E6DEC8', roof: '#5C768D', brick: true },  // Warm Tijolinho Terracotta + Zinc Roof (Ref Image 2)
  { wall: '#E9C46A', trim: '#F4F1DE', roof: '#4EA8DE', brick: false }, // Soft Mustard Ochre + Blue Roof (Ref Image 2/3)
  { wall: '#E58A8A', trim: '#FDF0ED', roof: '#457B9D', brick: false }, // Dusty Coral Rose + Slate-Blue Roof (Ref Image 3)
  { wall: '#64B5CD', trim: '#F1FAEE', roof: '#1D3557', brick: false }, // Soft Turquoise-Sky + Deep Blue Roof (Ref Image 3)
  { wall: '#C2593F', trim: '#CBD5E1', roof: '#78716C', brick: true },  // Red Clay Tijolo Baiano + Concrete Laje (Ref Image 2)
  { wall: '#84C3A3', trim: '#F4F9F5', roof: '#C86446', brick: false }, // Muted Sage Mint + Clay Tile Roof (Ref Image 3)
  { wall: '#F4A261', trim: '#FFF8F0', roof: '#4EA8DE', brick: false }, // Warm Apricot-Orange + Blue Roof (Ref Image 2)
  { wall: '#E6DEC8', trim: '#D46A4C', roof: '#64748B', brick: false }, // Warm Cream Plaster + Terracotta Trim
  { wall: '#B8B5E1', trim: '#F8FAFC', roof: '#457B9D', brick: false }, // Soft Lavender-Lilac + Blue Roof
  { wall: '#8ECAE6', trim: '#78350F', roof: '#3B82F6', brick: false }, // Powder Blue + Wood Trim (Ref Image 3)
];

const favelaRoofMats = new Map<string, THREE.MeshStandardMaterial>();
function getFavelaRoofMat(hex: string): THREE.MeshStandardMaterial {
  let m = favelaRoofMats.get(hex);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.72, metalness: 0.08 });
    favelaRoofMats.set(hex, m);
  }
  return m;
}

const hillsideSlopeMat = new THREE.MeshStandardMaterial({
  color: 0x2d6a4f,
  roughness: 0.9,
  flatShading: true,
});

const hillsideLightGreenMat = new THREE.MeshStandardMaterial({
  color: 0x52b788,
  roughness: 0.85,
  flatShading: true,
});

const retainingStoneMat = new THREE.MeshStandardMaterial({
  color: 0x78716c,
  roughness: 0.88,
});

const waterTankCyanMat = new THREE.MeshStandardMaterial({
  color: 0x2994b2,
  roughness: 0.5,
  metalness: 0.08,
});

const waterTankLidMat = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  roughness: 0.6,
});

const clothColors = [0xf4a261, 0xe76f51, 0x4ea8de, 0xfefae0, 0x84c3a3, 0xe58a8a].map(
  (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }),
);

/**
 * Builds an Iconic Brazilian Favela Tapered Blue/Cyan Water Tank ("Caixa d'Água com Tampa Cônica")
 * matching Reference Images 2 & 3.
 */
function buildCartoonWaterTank(scale = 1.0, hasPedestal = false): THREE.Group {
  const tg = new THREE.Group();
  let baseY = 0;

  if (hasPedestal) {
    const ped = new THREE.Mesh(sharedGeos.unitBox, sharedMats.clayBrick);
    ped.scale.set(0.95 * scale, 0.75 * scale, 0.95 * scale);
    ped.position.set(0, 0.375 * scale, 0);
    tg.add(ped);
    baseY = 0.75 * scale;
  }

  // Tapered tank body
  const body = new THREE.Mesh(sharedGeos.cylinder, waterTankCyanMat);
  body.scale.set(0.68 * scale, 0.78 * scale, 0.68 * scale);
  body.position.set(0, baseY + 0.39 * scale, 0);
  tg.add(body);

  // Upper rim collar
  const rim = new THREE.Mesh(sharedGeos.cylinder, waterTankCyanMat);
  rim.scale.set(0.76 * scale, 0.14 * scale, 0.76 * scale);
  rim.position.set(0, baseY + 0.82 * scale, 0);
  tg.add(rim);

  // Low conical lid (like Reference Image 2)
  const lid = new THREE.Mesh(sharedGeos.cone, waterTankLidMat);
  lid.scale.set(0.78 * scale, 0.24 * scale, 0.78 * scale);
  lid.position.set(0, baseY + 1.0 * scale, 0);
  tg.add(lid);

  return tg;
}

/**
 * Builds a Rooftop TV Yagi Antenna ("Antena Espinha de Peixe") or Parabolic Satellite Dish ("Parabólica")
 * matching Reference Images 2 & 3.
 */
function buildRooftopAntennaOrDish(seed: number): THREE.Group {
  const ag = new THREE.Group();
  if (seed % 2 === 0) {
    // TV Yagi Antenna ("Antena de TV")
    const mast = new THREE.Mesh(sharedGeos.cylinder, sharedMats.darkMetal);
    mast.scale.set(0.04, 1.55, 0.04);
    mast.position.set(0, 0.77, 0);
    ag.add(mast);

    const boom = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
    boom.scale.set(0.95, 0.04, 0.04);
    boom.position.set(0, 1.48, 0);
    ag.add(boom);

    for (let k = -1; k <= 1; k++) {
      const dip = new THREE.Mesh(sharedGeos.unitBox, sharedMats.galvanizedSteel);
      dip.scale.set(0.04, 0.04, 0.55 - k * 0.1);
      dip.position.set(k * 0.32, 1.48, 0);
      ag.add(dip);
    }
  } else {
    // White Parabolic Satellite Dish ("Antena Parabólica")
    const mast = new THREE.Mesh(sharedGeos.cylinder, sharedMats.darkMetal);
    mast.scale.set(0.05, 0.75, 0.05);
    mast.position.set(0, 0.37, 0);
    ag.add(mast);

    const dish = new THREE.Mesh(sharedGeos.cylinder, waterTankLidMat);
    dish.scale.set(0.46, 0.1, 0.46);
    dish.position.set(0, 0.72, 0.08);
    dish.rotation.x = 0.68;
    ag.add(dish);
  }
  return ag;
}

/**
 * Builds a Brazilian Favela Clothesline ("Varal de Roupas Coloridas") strung across an alley or terrace.
 */
function buildFavelaClothesline(spanZ: number, seed: number): THREE.Group {
  const cg = new THREE.Group();

  // Thin wire
  const lineBar = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
  lineBar.scale.set(0.03, 0.03, spanZ);
  cg.add(lineBar);

  // 4 hanging colorful clothes
  const count = 4;
  for (let i = 0; i < count; i++) {
    const zOff = -spanZ * 0.36 + (i / (count - 1)) * (spanZ * 0.72);
    const w = 0.36 + ((seed + i) % 2) * 0.12;
    const h = 0.45 + ((seed + i * 3) % 3) * 0.14;
    const cloth = new THREE.Mesh(
      sharedGeos.unitBox,
      clothColors[(seed + i) % clothColors.length],
    );
    cloth.scale.set(0.04, h, w);
    cloth.position.set(0, -h * 0.5 - 0.02, zOff);
    cloth.rotation.z = ((i % 2) - 0.5) * 0.12;
    cg.add(cloth);
  }

  return cg;
}

/**
 * Builds an Optimized, Irregular, Hand-Painted Cartoon Brazilian Hillside Favela Cluster:
 * - Zero top forest trees ("remove aquelas arvores la do topo das favela") for a clean rooftop silhouette
 * - Optimized low-poly geometry (3 tiers × 3 houses, 1 central staircase, simplified upper tier)
 * - Per-cluster fadeable materials (`isFavelaFadeMat` + `isUpperFavelaTier`) for smooth distance & upper-tier fade-out ("efeito de sumindo")
 */
export function buildHillsideFavelaCluster(
  variantIndex: number,
  side: 'left' | 'right',
  maxAnisotropy = 4,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Hillside_Favela_${side}_${variantIndex}`;

  const outSign = side === 'left' ? -1 : 1; // Direction climbing away from the street
  const faceSign = side === 'left' ? 1 : -1; // Direction facing toward the street

  // 1. Central Stepped Favela Alleyway ("Escadaria do Morro" — elevated higher so the favelas stand prominently above street houses)
  const alleyZ = (variantIndex % 2 === 0 ? 1 : -1) * 2.6;
  for (let s = 0; s < 6; s++) {
    const stepX = outSign * (0.5 + s * 1.75);
    const stepY = 5.2 + s * 2.1;
    const stepShiftZ = alleyZ + Math.sin(s * 0.7 + variantIndex) * 0.22;

    const step = new THREE.Mesh(sharedGeos.unitBox, sharedMats.concreteStep);
    step.scale.set(1.85, 1.45, 1.35);
    step.position.set(stepX, stepY, stepShiftZ);
    if (s < 2) step.userData.occludableLowerTier = true;
    group.add(step);
  }

  // 2. 3 Elevated Ascending Tiers of Brazilian Favela Constructions ("deixe as favelas pouco mais pra cima pra ver melhor elas")
  const tiers = [
    { dist: 0.8, baseY: 6.2, zSlots: [-5.4, 0.0, 5.4], hScale: 1.06 },
    { dist: 4.8, baseY: 10.6, zSlots: [-5.5, 0.2, 5.3], hScale: 1.14 },
    { dist: 8.8, baseY: 15.0, zSlots: [-5.3, -0.2, 5.5], hScale: 1.2 },
  ];

  for (let tIdx = 0; tIdx < tiers.length; tIdx++) {
    const tier = tiers[tIdx];
    const isUpperTier = tIdx === 2;

    // Stepped stone retaining base under each elevated terrace
    const retWallMat = (tIdx % 2 === 0 ? retainingStoneMat : hillsideSlopeMat).clone();
    retWallMat.userData.isFavelaFadeMat = true;
    retWallMat.userData.isUpperFavelaTier = isUpperTier;

    const retWall = new THREE.Mesh(sharedGeos.unitBox, retWallMat);
    retWall.scale.set(3.8, 5.6, 15.8);
    retWall.position.set(outSign * tier.dist, tier.baseY - 2.8, 0);
    if (tIdx === 0) retWall.userData.occludableLowerTier = true;
    group.add(retWall);

    for (let sIdx = 0; sIdx < tier.zSlots.length; sIdx++) {
      const seed = variantIndex * 19 + tIdx * 11 + sIdx * 5;
      const archetype = isUpperTier ? seed % 2 : seed % 4;
      const pal = FAVELA_PALETTES[seed % FAVELA_PALETTES.length];
      const palUpper = FAVELA_PALETTES[(seed + 3) % FAVELA_PALETTES.length];

      const zPos = tier.zSlots[sIdx] + ((seed % 5) - 2) * 0.18;
      const xPos = outSign * (tier.dist + ((seed % 3) - 1) * 0.35);
      const baseH = tier.baseY + ((seed % 3) - 1) * 0.32;

      const w = 3.3 + (seed % 3) * 0.45;
      const d = 3.2 + ((seed + 2) % 3) * 0.42;
      const h = (3.5 + (seed % 3) * 0.65) * tier.hScale;

      const houseTex = getFavelaHouseTexture(pal.wall, pal.trim, pal.brick, maxAnisotropy, seed);
      const houseMat = new THREE.MeshStandardMaterial({
        map: houseTex,
        color: 0xffffff,
        roughness: 0.78,
        metalness: 0.03,
      });
      houseMat.userData.isFavelaFadeMat = true;
      houseMat.userData.isUpperFavelaTier = isUpperTier;

      const roofMat = getFavelaRoofMat(pal.roof).clone();
      roofMat.userData.isFavelaFadeMat = true;
      roofMat.userData.isUpperFavelaTier = isUpperTier;

      const houseUnit = new THREE.Group();
      houseUnit.position.set(xPos, baseH, zPos);
      houseUnit.rotation.y = ((seed % 7) - 3) * 0.035;
      if (tIdx === 0) houseUnit.userData.occludableLowerTier = true;

      if (isUpperTier) {
        // Ultra-Optimized Upper Tier Favela House (2 meshes only + smooth distance fade-out "efeito de sumindo"!)
        const mainBox = new THREE.Mesh(sharedGeos.unitBox, houseMat);
        mainBox.scale.set(w, h, d);
        mainBox.position.set(0, h * 0.5, 0);
        mainBox.userData.hasCartoonOutline = true; // Skip extra outline mesh on upper tier for polygon optimization
        houseUnit.add(mainBox);

        const roofSlab = new THREE.Mesh(sharedGeos.unitBox, roofMat);
        roofSlab.scale.set(w * 1.15, 0.26, d * 1.15);
        roofSlab.position.set(0, h + 0.14, 0);
        roofSlab.rotation.z = faceSign * 0.14;
        roofSlab.userData.hasCartoonOutline = true;
        houseUnit.add(roofSlab);
      } else if (archetype === 0) {
        // ARCHETYPE 0: Cantilevered "Puxadinho" Sobrado
        const lowerH = h * 0.52;
        const upperH = h * 0.54;
        const lowerBox = new THREE.Mesh(sharedGeos.unitBox, houseMat);
        lowerBox.scale.set(w * 0.88, lowerH, d * 0.88);
        lowerBox.position.set(0, lowerH * 0.5, 0);
        houseUnit.add(lowerBox);

        const upperTex = getFavelaHouseTexture(
          palUpper.wall,
          palUpper.trim,
          palUpper.brick,
          maxAnisotropy,
          seed + 1,
        );
        const upperMat = new THREE.MeshStandardMaterial({
          map: upperTex,
          color: 0xffffff,
          roughness: 0.76,
        });
        upperMat.userData.isFavelaFadeMat = true;
        upperMat.userData.isUpperFavelaTier = false;

        const upperBox = new THREE.Mesh(sharedGeos.unitBox, upperMat);
        upperBox.scale.set(w * 1.08, upperH, d * 1.08);
        upperBox.position.set(faceSign * 0.32, lowerH + upperH * 0.5, 0.18);
        houseUnit.add(upperBox);

        const totalH = lowerH + upperH;
        const roofSlab = new THREE.Mesh(sharedGeos.unitBox, roofMat);
        roofSlab.scale.set(w * 1.2, 0.28, d * 1.2);
        roofSlab.position.set(faceSign * 0.32, totalH + 0.16, 0.18);
        roofSlab.rotation.z = faceSign * 0.15;
        houseUnit.add(roofSlab);

        const tank = buildCartoonWaterTank(0.86, false);
        tank.position.set(-faceSign * 0.42, totalH + 0.22, -0.3);
        houseUnit.add(tank);
      } else if (archetype === 1) {
        // ARCHETYPE 1: L-Shaped House + Rooftop Turret Room + Water Tank
        const mainBox = new THREE.Mesh(sharedGeos.unitBox, houseMat);
        mainBox.scale.set(w, h, d);
        mainBox.position.set(0, h * 0.5, 0);
        houseUnit.add(mainBox);

        const turretTex = getFavelaHouseTexture(
          palUpper.wall,
          palUpper.trim,
          false,
          maxAnisotropy,
          seed + 2,
        );
        const turretMat = new THREE.MeshStandardMaterial({
          map: turretTex,
          color: 0xffffff,
          roughness: 0.76,
        });
        turretMat.userData.isFavelaFadeMat = true;
        turretMat.userData.isUpperFavelaTier = false;

        const tw = w * 0.56;
        const td = d * 0.56;
        const th = 2.1;
        const turret = new THREE.Mesh(sharedGeos.unitBox, turretMat);
        turret.scale.set(tw, th, td);
        turret.position.set(-faceSign * 0.38, h + th * 0.5, 0.35);
        houseUnit.add(turret);

        const turretRoof = new THREE.Mesh(sharedGeos.unitBox, roofMat);
        turretRoof.scale.set(tw + 0.35, 0.22, td + 0.35);
        turretRoof.position.set(-faceSign * 0.38, h + th + 0.12, 0.35);
        turretRoof.rotation.z = faceSign * 0.12;
        houseUnit.add(turretRoof);

        const tank = buildCartoonWaterTank(0.84, false);
        tank.position.set(-faceSign * 0.38, h + th + 0.22, 0.35);
        houseUnit.add(tank);
      } else if (archetype === 2) {
        // ARCHETYPE 2: Covered Terraço with Zinc Roof & Clothesline
        const mainBox = new THREE.Mesh(sharedGeos.unitBox, houseMat);
        mainBox.scale.set(w, h * 0.88, d);
        mainBox.position.set(0, h * 0.44, 0);
        houseUnit.add(mainBox);

        const roofY = h * 0.88;
        const canopyH = 1.55;
        for (const cx of [-w * 0.38, w * 0.38]) {
          const col = new THREE.Mesh(sharedGeos.unitBox, sharedMats.rawConcretePillar);
          col.scale.set(0.18, canopyH, 0.18);
          col.position.set(cx, roofY + canopyH * 0.5, 0);
          houseUnit.add(col);
        }

        const canopyRoof = new THREE.Mesh(sharedGeos.unitBox, roofMat);
        canopyRoof.scale.set(w + 0.55, 0.22, d + 0.55);
        canopyRoof.position.set(0, roofY + canopyH + 0.1, 0);
        canopyRoof.rotation.z = faceSign * 0.14;
        houseUnit.add(canopyRoof);

        const varal = buildFavelaClothesline(d * 0.72, seed);
        varal.position.set(faceSign * (w * 0.25), roofY + canopyH * 0.75, 0);
        houseUnit.add(varal);
      } else {
        // ARCHETYPE 3: Stepped Twin-Volume Casinha with Blue Awning
        const h1 = h * 0.92;
        const h2 = h * 1.12;

        const vol1 = new THREE.Mesh(sharedGeos.unitBox, houseMat);
        vol1.scale.set(w * 0.95, h1, d * 0.58);
        vol1.position.set(faceSign * 0.18, h1 * 0.5, -d * 0.22);
        houseUnit.add(vol1);

        const tex2 = getFavelaHouseTexture(
          palUpper.wall,
          palUpper.trim,
          palUpper.brick,
          maxAnisotropy,
          seed + 3,
        );
        const mat2 = new THREE.MeshStandardMaterial({
          map: tex2,
          color: 0xffffff,
          roughness: 0.76,
        });
        mat2.userData.isFavelaFadeMat = true;
        mat2.userData.isUpperFavelaTier = false;

        const vol2 = new THREE.Mesh(sharedGeos.unitBox, mat2);
        vol2.scale.set(w * 0.92, h2, d * 0.58);
        vol2.position.set(-faceSign * 0.15, h2 * 0.5, d * 0.24);
        houseUnit.add(vol2);

        const r1 = new THREE.Mesh(sharedGeos.unitBox, roofMat);
        r1.scale.set(w * 1.08, 0.24, d * 0.68);
        r1.position.set(faceSign * 0.18, h1 + 0.14, -d * 0.22);
        r1.rotation.z = faceSign * 0.18;
        houseUnit.add(r1);

        const r2 = new THREE.Mesh(sharedGeos.unitBox, roofMat);
        r2.scale.set(w * 1.06, 0.24, d * 0.68);
        r2.position.set(-faceSign * 0.15, h2 + 0.14, d * 0.24);
        r2.rotation.z = -faceSign * 0.14;
        houseUnit.add(r2);

        const ant = buildRooftopAntennaOrDish(seed + 1);
        ant.position.set(-faceSign * 0.15, h2 + 0.24, d * 0.24);
        houseUnit.add(ant);
      }

      group.add(houseUnit);
    }
  }

  // Apply Thin Black Cartoon Outlines to lower & middle favela houses (upper tier skips outlines for lighter rendering)
  addCartoonOutlinesToGroup(group);
  applyWorldCurvatureToGroup(group);
  return group;
}

/**
 * Builds the Urban Horizon Skyline with an Organic City-vs-Nature Visual Division:
 * ("3. Criar uma divisão visual entre os dois lados do cenário:
 *   - Um lado com prédios urbanos (lado direito / centro-direito).
 *   - Outro lado com montanhas verdes, árvores e vegetação (lado esquerdo).
 *   - Fazer a transição entre cidade e natureza de maneira orgânica.")
 */
export function buildHorizonCitySkyline(maxAnisotropy = 4): {
  group: THREE.Group;
  update: (elapsed: number, playerX: number) => void;
} {
  const group = new THREE.Group();
  group.name = 'Dynamic_Horizon_City_Skyline';

  // Urban Skyline positioned at z = -108 .. -116 so the Green Mountains & Cristo Redentor (at z = -148)
  // sit cleanly BEHIND the buildings ("deixe as montanhas atras dos predios")!
  const towerSpecs = [
    { x: -7.5, z: -116, baseY: 6.5, variant: 2, scale: 0.72, hMult: 0.82 },
    { x: 3.5, z: -114, baseY: 7.5, variant: 3, scale: 0.78, hMult: 0.92 },
    { x: 16.2, z: -108, baseY: 9.0, variant: 0, scale: 1.05, hMult: 1.18 }, // Detailed Green Brasil Wind-Cutter Skyscraper!
    { x: 30.2, z: -112, baseY: 9.2, variant: 1, scale: 0.88, hMult: 1.08 },
    { x: 42.5, z: -114, baseY: 9.5, variant: 2, scale: 0.86, hMult: 1.06 },
  ];

  for (let i = 0; i < towerSpecs.length; i++) {
    const spec = towerSpecs[i];
    const side: 'left' | 'right' = spec.x < 0 ? 'left' : 'right';
    const bldg = buildRioSkylineBuilding(spec.variant, side, maxAnisotropy);
    bldg.scale.set(spec.scale, spec.scale * spec.hMult, spec.scale);
    bldg.position.set(spec.x, spec.baseY, spec.z);
    bldg.rotation.y = spec.x < 0 ? 0.15 : -0.18;
    group.add(bldg);
  }

  return {
    group,
    update: (_elapsed: number, _playerX: number) => {
      // Keep horizon buildings anchored in world space so they never float or slide when camera sways!
    },
  };
}

/**
 * Builds an Animated Tropical Brazilian Bird ("Arara-Azul", "Arara-Canindé", or "Papagaio")
 * with articulated Left and Right Wing pivots for live flapping across the sky!
 */
export interface BirdRig {
  root: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
}

export function buildTropicalBird(
  species: 'arara_azul' | 'arara_caninde' | 'papagaio',
): BirdRig {
  const root = new THREE.Group();

  const bodyMat =
    species === 'arara_azul'
      ? sharedMats.araraBlue
      : species === 'arara_caninde'
        ? sharedMats.brazilYellow
        : sharedMats.papagaioGreen;

  const wingMat =
    species === 'arara_azul'
      ? sharedMats.araraBlue
      : species === 'arara_caninde'
        ? sharedMats.araraCyan
        : sharedMats.papagaioGreen;

  const accentMat =
    species === 'arara_azul'
      ? sharedMats.brazilYellow
      : species === 'arara_caninde'
        ? sharedMats.araraBlue
        : sharedMats.birdRed;

  const body = new THREE.Mesh(sharedGeos.sphere, bodyMat);
  body.scale.set(0.28, 0.24, 0.65);
  root.add(body);

  const head = new THREE.Mesh(
    sharedGeos.sphere,
    species === 'papagaio' ? sharedMats.brazilYellow : bodyMat,
  );
  head.scale.set(0.22, 0.22, 0.24);
  head.position.set(0, 0.12, -0.55);
  root.add(head);

  const beak = new THREE.Mesh(sharedGeos.cone, sharedMats.darkMetal);
  beak.scale.set(0.11, 0.26, 0.12);
  beak.rotation.x = -Math.PI * 0.62;
  beak.position.set(0, 0.08, -0.78);
  root.add(beak);

  const tailLen = species === 'papagaio' ? 0.55 : 1.35;
  const tail = new THREE.Mesh(sharedGeos.unitBox, wingMat);
  tail.scale.set(0.18, 0.05, tailLen);
  tail.position.set(0, 0.02, 0.45 + tailLen * 0.45);
  root.add(tail);

  const tailTip = new THREE.Mesh(sharedGeos.unitBox, accentMat);
  tailTip.scale.set(0.12, 0.06, tailLen * 0.6);
  tailTip.position.set(0, 0.03, 0.55 + tailLen * 0.6);
  root.add(tailTip);

  const leftWing = new THREE.Group();
  leftWing.position.set(-0.2, 0.06, -0.05);
  const lwMain = new THREE.Mesh(sharedGeos.unitBox, wingMat);
  lwMain.scale.set(0.95, 0.05, 0.42);
  lwMain.position.set(-0.46, 0, 0);
  const lwTip = new THREE.Mesh(sharedGeos.unitBox, accentMat);
  lwTip.scale.set(0.45, 0.055, 0.28);
  lwTip.position.set(-0.88, 0, 0.05);
  leftWing.add(lwMain, lwTip);
  root.add(leftWing);

  const rightWing = new THREE.Group();
  rightWing.position.set(0.2, 0.06, -0.05);
  const rwMain = new THREE.Mesh(sharedGeos.unitBox, wingMat);
  rwMain.scale.set(0.95, 0.05, 0.42);
  rwMain.position.set(0.46, 0, 0);
  const rwTip = new THREE.Mesh(sharedGeos.unitBox, accentMat);
  rwTip.scale.set(0.45, 0.055, 0.28);
  rwTip.position.set(0.88, 0, 0.05);
  rightWing.add(rwMain, rwTip);
  root.add(rightWing);

  return { root, leftWing, rightWing };
}

/**
 * Builds physical 3D Road Motion Markers ("Tachões Refletivos / Olhos-de-Gato na Pista")
 * that physically rush toward the camera when the player is running (zero curb overlap to prevent Z-fighting!).
 */
export function buildStreetMotionRow(): THREE.Group {
  const row = new THREE.Group();

  // 2 glowing yellow cat's-eye reflector studs between the 3 wider lanes (x = ±1.62)
  for (const lx of [-1.62, 1.62]) {
    const studBase = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
    studBase.scale.set(0.18, 0.04, 0.22);
    studBase.position.set(lx, 0.022, 0);
    row.add(studBase);

    const studReflector = new THREE.Mesh(sharedGeos.unitBox, sharedMats.lampGlow);
    studReflector.scale.set(0.12, 0.05, 0.12);
    studReflector.position.set(lx, 0.035, 0);
    row.add(studReflector);
  }

  applyWorldCurvatureToGroup(row);
  return row;
}

/**
 * Builds the 3rd-person Stylized Brazilian Runner Character (8 distinct parts + contact shadow)
 */
export interface RunnerRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  headGroup: THREE.Group;
}

export function buildStylizedRunner(): RunnerRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const shadow = new THREE.Mesh(sharedGeos.contactShadow, sharedMats.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(0.68, 0.68, 1);
  shadow.position.set(0, 0.02, 0);
  root.add(shadow);

  const jerseyMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.55,
    metalness: 0.05,
  });
  const trimGreenMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.55,
  });
  const shortsMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.6,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc68642,
    roughness: 0.65,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.5,
  });

  const torso = new THREE.Mesh(sharedGeos.unitBox, jerseyMat);
  torso.scale.set(0.56, 0.68, 0.34);
  torso.position.set(0, 1.02, 0);
  torso.castShadow = true;
  bodyGroup.add(torso);

  const backpack = new THREE.Mesh(sharedGeos.unitBox, trimGreenMat);
  backpack.scale.set(0.42, 0.48, 0.22);
  backpack.position.set(0, 1.04, 0.24);
  bodyGroup.add(backpack);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.56, 0);

  const head = new THREE.Mesh(sharedGeos.sphere, skinMat);
  head.scale.set(0.26, 0.28, 0.26);
  headGroup.add(head);

  const capCrown = new THREE.Mesh(sharedGeos.sphere, capMat);
  capCrown.scale.set(0.275, 0.2, 0.28);
  capCrown.position.set(0, 0.08, 0);
  headGroup.add(capCrown);

  const capVisor = new THREE.Mesh(sharedGeos.unitBox, capMat);
  capVisor.scale.set(0.28, 0.05, 0.24);
  capVisor.position.set(0, 0.06, 0.22);
  headGroup.add(capVisor);

  bodyGroup.add(headGroup);

  const leftLeg = new THREE.Mesh(sharedGeos.unitBox, shortsMat);
  leftLeg.scale.set(0.21, 0.64, 0.22);
  leftLeg.position.set(-0.15, 0.38, 0);
  leftLeg.castShadow = true;
  bodyGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(sharedGeos.unitBox, shortsMat);
  rightLeg.scale.set(0.21, 0.64, 0.22);
  rightLeg.position.set(0.15, 0.38, 0);
  rightLeg.castShadow = true;
  bodyGroup.add(rightLeg);

  const leftArm = new THREE.Mesh(sharedGeos.unitBox, skinMat);
  leftArm.scale.set(0.16, 0.56, 0.16);
  leftArm.position.set(-0.38, 1.0, 0);
  bodyGroup.add(leftArm);

  const rightArm = new THREE.Mesh(sharedGeos.unitBox, skinMat);
  rightArm.scale.set(0.16, 0.56, 0.16);
  rightArm.position.set(0.38, 1.0, 0);
  bodyGroup.add(rightArm);

  addCartoonOutlinesToGroup(bodyGroup);

  return {
    root,
    bodyGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    headGroup,
  };
}

function buildSingleTrafficCone(): THREE.Group {
  const g = new THREE.Group();

  const base = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
  base.scale.set(0.68, 0.08, 0.68);
  base.position.set(0, 0.04, 0);
  g.add(base);

  const coneBody = new THREE.Mesh(sharedGeos.cone, sharedMats.coneOrange);
  coneBody.scale.set(0.28, 0.92, 0.28);
  coneBody.position.set(0, 0.5, 0);
  coneBody.castShadow = true;
  g.add(coneBody);

  const band1 = new THREE.Mesh(sharedGeos.cylinder, sharedMats.coneWhite);
  band1.scale.set(0.21, 0.12, 0.21);
  band1.position.set(0, 0.42, 0);
  g.add(band1);

  const band2 = new THREE.Mesh(sharedGeos.cylinder, sharedMats.coneWhite);
  band2.scale.set(0.14, 0.11, 0.14);
  band2.position.set(0, 0.68, 0);
  g.add(band2);

  return g;
}

export function buildObstacleMesh(kind: ObstacleKind): THREE.Group {
  const root = new THREE.Group();

  const shadow = new THREE.Mesh(sharedGeos.contactShadow, sharedMats.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(0.85, 0.85, 1);
  shadow.position.set(0, 0.015, 0);
  root.add(shadow);

  if (kind === 'cone_single') {
    root.add(buildSingleTrafficCone());
    addCartoonOutlinesToGroup(root);
    applyWorldCurvatureToGroup(root);
    return root;
  }

  if (kind === 'cone_pair') {
    const c1 = buildSingleTrafficCone();
    c1.position.set(-0.42, 0, 0);
    const c2 = buildSingleTrafficCone();
    c2.position.set(0.42, 0, 0);
    root.add(c1, c2);

    const bar = new THREE.Mesh(sharedGeos.unitBox, sharedMats.coneOrange);
    bar.scale.set(0.95, 0.08, 0.08);
    bar.position.set(0, 0.68, 0);
    root.add(bar);
    addCartoonOutlinesToGroup(root);
    applyWorldCurvatureToGroup(root);
    return root;
  }

  if (kind === 'cavalete') {
    const legL = new THREE.Mesh(sharedGeos.unitBox, sharedMats.rafterWood);
    legL.scale.set(0.1, 1.0, 0.1);
    legL.position.set(-0.75, 0.48, 0);
    legL.rotation.x = 0.18;

    const legR = new THREE.Mesh(sharedGeos.unitBox, sharedMats.rafterWood);
    legR.scale.set(0.1, 1.0, 0.1);
    legR.position.set(0.75, 0.48, 0);
    legR.rotation.x = -0.18;

    const plank = new THREE.Mesh(sharedGeos.unitBox, sharedMats.coneOrange);
    plank.scale.set(1.85, 0.28, 0.12);
    plank.position.set(0, 0.76, 0);
    plank.castShadow = true;

    const stripe1 = new THREE.Mesh(sharedGeos.unitBox, sharedMats.coneWhite);
    stripe1.scale.set(0.35, 0.29, 0.13);
    stripe1.position.set(-0.45, 0.76, 0);

    const stripe2 = new THREE.Mesh(sharedGeos.unitBox, sharedMats.coneWhite);
    stripe2.scale.set(0.35, 0.29, 0.13);
    stripe2.position.set(0.45, 0.76, 0);

    root.add(legL, legR, plank, stripe1, stripe2);
    addCartoonOutlinesToGroup(root);
    applyWorldCurvatureToGroup(root);
    return root;
  }

  const postL = new THREE.Mesh(sharedGeos.cylinder, sharedMats.darkMetal);
  postL.scale.set(0.08, 2.2, 0.08);
  postL.position.set(-0.92, 1.1, 0);

  const postR = new THREE.Mesh(sharedGeos.cylinder, sharedMats.darkMetal);
  postR.scale.set(0.08, 2.2, 0.08);
  postR.position.set(0.92, 1.1, 0);

  const banner = new THREE.Mesh(sharedGeos.unitBox, sharedMats.coneOrange);
  banner.scale.set(1.96, 0.85, 0.16);
  banner.position.set(0, 1.65, 0);

  const bannerStripe = new THREE.Mesh(sharedGeos.unitBox, sharedMats.coneWhite);
  bannerStripe.scale.set(1.75, 0.24, 0.18);
  bannerStripe.position.set(0, 1.65, 0);

  root.add(postL, postR, banner, bannerStripe);
  addCartoonOutlinesToGroup(root);
  applyWorldCurvatureToGroup(root);
  return root;
}

export function buildCoinMesh(): THREE.Group {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(sharedGeos.cylinder, sharedMats.coinGold);
  disc.scale.set(0.36, 0.09, 0.36);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, 0.75, 0);
  g.add(disc);

  const shadow = new THREE.Mesh(sharedGeos.contactShadow, sharedMats.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(0.32, 0.32, 1);
  shadow.position.set(0, 0.015, 0);
  g.add(shadow);
  addCartoonOutlinesToGroup(g);
  applyWorldCurvatureToGroup(g);
  return g;
}

