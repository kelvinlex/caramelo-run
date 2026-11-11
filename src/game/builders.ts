import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  DEFAULT_WORLD_CURVE_Y,
  WORLD_CURVE_START_Z,
  type HouseVariationSpec,
  type ObstacleKind,
  type TreeType,
  computeBannerAirplanePose,
  computeBeachKitePose,
  computeCelestialSunMoonDiagonalPose,
  computeSmoothLodTierOpacities,
  computeInfernoAscendingRoadHeight,
  computeInfernoFlyingCreaturePose,
  computeInfernoMeteorPose,
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
  createRioWallGraffitiTexture,
  getCoastalCondoFacadeTexture,
  createGoldenBeachSandTexture,
  createAirplaneBannerTexture,
  createBlownSandRoadDriftTexture,
  createCartoonKiteTexture,
  createKiteRabiolaTexture,
  createMountainTreeFoliageCutoutTexture,
  createPainterlyCloudPanoramaTexture,
  getInfernoRuinedWallTexture,
  getInfernoWoodenBillboardTexture,
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
  uLadeiraSlope: { value: 0.0 },
  uRoadWindPhase: { value: 0.0 },
  uPalmWindTime: { value: 0.0 },
  uSunsetOrangeMix: { value: 0.0 },
  uNightDarknessMix: { value: 0.0 },
  uInfernoMapMix: { value: 0.0 },
  uWindowEmissiveIntensity: { value: 0.0 },
  uLampGlowOpacity: { value: 0.0 },
  uSunWorldPos: { value: new THREE.Vector3(-102.0, 99.0, -252.0) },
  uSunActiveOpacity: { value: 1.0 },
  uHorizonFogColor: { value: new THREE.Color('#F1D4B8') },
  uHorizonFogSkyTint: { value: new THREE.Color('#C8BFE7') },
  uHorizonFogPulse: { value: 0.0 },
};

const curvedMaterialInstances = new WeakSet<THREE.Material>();

export const GLSL_TROPICAL_CINEMATIC_GRADE = `
uniform float uSunsetOrangeMix;
uniform float uNightDarknessMix;
uniform float uInfernoMapMix;

vec3 applyTropicalCinematicGrade(vec3 rawCol) {
  vec3 c = clamp(rawCol, 0.0, 1.0);
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float shadowMask = 1.0 - smoothstep(0.0, 0.48, luma);
  float highlightMask = smoothstep(0.45, 0.96, luma);

  // 1. Sombras levemente azuladas e profundas (Deep Cool-Azure Shadow Split-Toning)
  vec3 coolShadowTint = vec3(0.055, 0.125, 0.245);
  c = mix(c, mix(c * vec3(0.86, 0.93, 1.12), coolShadowTint, 0.24), shadowMask * 0.68);

  // 2. Iluminação solar quente e dourada + Realces luminosos (Warm Golden Solar Highlights)
  vec3 warmSunMultiplier = vec3(1.06, 1.01, 0.91);
  c = mix(c, c * warmSunMultiplier + vec3(0.028, 0.020, 0.004), highlightMask * 0.65);

  // 3. Contraste Médio-Alto (Smooth S-Curve Contrast)
  vec3 sCurve = smoothstep(0.0, 1.0, c);
  c = mix(c, sCurve, 0.22);

  // 4. Cores tropicais intensas e saturadas sem exageros (Smart Vibrance Boost)
  float newLuma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float maxChan = max(c.r, max(c.g, c.b));
  float minChan = min(c.r, min(c.g, c.b));
  float sat = maxChan - minChan;
  float vibranceBoost = 1.0 + 0.24 * (1.0 - sat * 0.75);
  c = mix(vec3(newLuma), c, vibranceBoost);

  // 5. Entardecer Alaranjado ("atardecer cenario fica meio alaranjado"):
  if (uSunsetOrangeMix > 0.001) {
    vec3 sunsetTint = c * vec3(1.18, 0.84, 0.56) + vec3(0.065, 0.024, -0.015);
    vec3 sunsetShadow = mix(sunsetTint, vec3(0.22, 0.09, 0.14), shadowMask * 0.28);
    c = mix(c, clamp(sunsetShadow, 0.0, 1.0), uSunsetOrangeMix * 0.82);
  }

  // 6. Noite Tropical ("sistema de dia e noite tambem"):
  if (uNightDarknessMix > 0.001) {
    float warmLightPreserve = smoothstep(0.62, 0.92, c.r) * smoothstep(0.45, 0.85, c.g);
    vec3 nightCol = c * vec3(0.36, 0.48, 0.78) + vec3(0.01, 0.025, 0.065);
    nightCol = mix(nightCol, c * vec3(1.08, 0.96, 0.76), warmLightPreserve * 0.85);
    c = mix(c, clamp(nightCol, 0.0, 1.0), uNightDarknessMix * 0.86);
  }

  // 6b. Apocalyptic Inferno Controlled Crimson-Amber Grading
  if (uInfernoMapMix > 0.001) {
    float firePreserve = smoothstep(0.65, 0.94, rawCol.r) * smoothstep(0.35, 0.88, rawCol.g);
    vec3 infernoMid = rawCol * vec3(1.16, 0.58, 0.44) + vec3(0.075, 0.014, 0.006);
    vec3 infernoShadow = mix(infernoMid, vec3(0.11, 0.018, 0.020), shadowMask * 0.38);
    vec3 infernoCol = mix(infernoShadow, rawCol * vec3(1.08, 0.98, 0.76), firePreserve * 0.88);
    c = mix(c, clamp(infernoCol, 0.0, 1.0), uInfernoMapMix * 0.88);
  }

  // 7. Pretos suaves & Anti-glare highlight shoulder (Soft Blacks + Preserved Readability)
  vec3 softBlackFloor = mix(vec3(0.022, 0.032, 0.056), vec3(0.038, 0.010, 0.012), uInfernoMapMix);
  c = softBlackFloor + c * (vec3(0.985) - softBlackFloor);
  return clamp(c, 0.0, 1.0);
}
`;

function glslSmoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function evalRoadCurveOffsetsAtZ(worldZ: number): { xOffset: number; yOffset: number } {
  const curveStartZ = worldCurveUniforms.uCurveStartZ.value;
  if (worldCurveUniforms.uInfernoMapMix.value > 0.5) {
    return {
      xOffset: 0,
      yOffset: computeInfernoAscendingRoadHeight(worldZ, curveStartZ),
    };
  }
  const curveY = worldCurveUniforms.uWorldCurveY.value;
  const curveX = worldCurveUniforms.uWorldCurveX.value;
  const ladeiraSlope = worldCurveUniforms.uLadeiraSlope.value;
  const windPhase = worldCurveUniforms.uRoadWindPhase.value;

  const curveDist = Math.max(0, -(worldZ - curveStartZ));
  const curveDistSq = curveDist * curveDist;

  const ladeiraBowl =
    4.2 *
    glslSmoothstep(14.0, 108.0, curveDist) *
    (1.0 - 0.14 * glslSmoothstep(108.0, 175.0, curveDist));
  const sCurveNear =
    Math.sin(curveDist * 0.032 + windPhase) *
    1.95 *
    glslSmoothstep(16.0, 78.0, curveDist) *
    ladeiraSlope;
  const sCurveFar =
    Math.cos(curveDist * 0.016 - windPhase * 0.65) *
    1.45 *
    glslSmoothstep(48.0, 165.0, curveDist) *
    ladeiraSlope;

  const yOffset = -(curveY * curveDistSq * 0.16 + ladeiraBowl * ladeiraSlope);
  const xOffset = curveX * curveDistSq + sCurveNear + sCurveFar;
  return { xOffset, yOffset };
}

/**
 * Calcula exatamente a altura (yOffset), deslocamento lateral da curva (xOffset),
 * inclinação longitudinal da ladeira (pitchX) e alinhamento direcional da curva (yawY)
 * para manter todos os pneus dos veículos 100% colados no asfalto em qualquer ponto Z.
 */
export function sampleRoadSurfaceTransform(worldZ: number): {
  xOffset: number;
  yOffset: number;
  pitchX: number;
  yawY: number;
} {
  const center = evalRoadCurveOffsetsAtZ(worldZ);
  const dz = 1.25;
  const aheadTowardsCam = evalRoadCurveOffsetsAtZ(worldZ + dz);
  const behindIntoHorizon = evalRoadCurveOffsetsAtZ(worldZ - dz);

  const dy = aheadTowardsCam.yOffset - behindIntoHorizon.yOffset;
  const dx = aheadTowardsCam.xOffset - behindIntoHorizon.xOffset;
  const span = 2 * dz;

  const pitchX = -Math.atan2(dy, span);
  const yawY = Math.atan2(dx, span);

  return {
    xOffset: center.xOffset,
    yOffset: center.yOffset,
    pitchX,
    yawY,
  };
}

/**
 * Injects the world-space downward horizon curvature into any Three.js material vertex shader,
 * plus optional Dynamic Atmospheric Depth Fog and Tropical Cinematic Color Grading.
 * Uses a WeakSet per Material instance so cloned materials (.clone()) always receive their own
 * onBeforeCompile curvature hook even when userData is shallow-copied!
 */
export function applyWorldCurvatureToMaterial(mat: THREE.Material): void {
  if (!mat || curvedMaterialInstances.has(mat)) return;
  curvedMaterialInstances.add(mat);
  mat.userData.hasWorldCurvature = true;

  const fogCfg = mat.userData.horizonDepthFog as HorizonDepthFogConfig | undefined;
  const skipColorGrade = Boolean(mat.userData.skipColorGrade);
  const isPalmFrondMat = Boolean(mat.userData.isPalmFrondMat);

  const prevCompile = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    if (prevCompile) prevCompile(shader, renderer);
    shader.uniforms.uWorldCurveY = worldCurveUniforms.uWorldCurveY;
    shader.uniforms.uWorldCurveX = worldCurveUniforms.uWorldCurveX;
    shader.uniforms.uCurveStartZ = worldCurveUniforms.uCurveStartZ;
    shader.uniforms.uLadeiraSlope = worldCurveUniforms.uLadeiraSlope;
    shader.uniforms.uRoadWindPhase = worldCurveUniforms.uRoadWindPhase;
    shader.uniforms.uPalmWindTime = worldCurveUniforms.uPalmWindTime;
    shader.uniforms.uSunsetOrangeMix = worldCurveUniforms.uSunsetOrangeMix;
    shader.uniforms.uNightDarknessMix = worldCurveUniforms.uNightDarknessMix;
    shader.uniforms.uInfernoMapMix = worldCurveUniforms.uInfernoMapMix;
    shader.uniforms.uHorizonFogColor = worldCurveUniforms.uHorizonFogColor;
    shader.uniforms.uHorizonFogSkyTint = worldCurveUniforms.uHorizonFogSkyTint;
    shader.uniforms.uHorizonFogPulse = worldCurveUniforms.uHorizonFogPulse;

    if (!shader.vertexShader.includes('uniform float uWorldCurveY;')) {
      shader.vertexShader =
        `uniform float uWorldCurveY;\nuniform float uWorldCurveX;\nuniform float uCurveStartZ;\nuniform float uLadeiraSlope;\nuniform float uRoadWindPhase;\nuniform float uPalmWindTime;\nuniform float uInfernoMapMix;\nvarying vec3 vCurvedWorldPos;\nvarying float vCameraDepth;\n` +
        shader.vertexShader;
    }

    const palmWindSnippet = isPalmFrondMat
      ? `float palmFlutter = sin(uPalmWindTime * 3.4 + wp.z * 0.42 + wp.x * 0.58) * 0.22 + cos(uPalmWindTime * 5.2 - wp.z * 0.75) * 0.09;
      wp.y += palmFlutter * 0.68;
      wp.x += palmFlutter * 0.54;`
      : '';

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      vec4 wp = modelMatrix * mvPosition;
      ${palmWindSnippet}
      float curveDist = max(0.0, -(wp.z - uCurveStartZ));
      float curveDistSq = curveDist * curveDist;
      float ladeiraBowl = 4.2 * smoothstep(14.0, 108.0, curveDist) * (1.0 - 0.14 * smoothstep(108.0, 175.0, curveDist));
      float sCurveNear = sin(curveDist * 0.032 + uRoadWindPhase) * 1.95 * smoothstep(16.0, 78.0, curveDist) * uLadeiraSlope;
      float sCurveFar = cos(curveDist * 0.016 - uRoadWindPhase * 0.65) * 1.45 * smoothstep(48.0, 165.0, curveDist) * uLadeiraSlope;
      float beachDropY = -(uWorldCurveY * curveDistSq * 0.16 + ladeiraBowl * uLadeiraSlope);
      float beachShiftX = uWorldCurveX * curveDistSq + sCurveNear + sCurveFar;

      float infernoDip = -1.35 * smoothstep(2.0, 26.0, curveDist) * (1.0 - smoothstep(28.0, 72.0, curveDist));
      float infernoClimbDist = min(166.0, max(0.0, curveDist - 24.0));
      float infernoSkyClimb = pow(infernoClimbDist / 165.0, 1.72) * 34.5;
      float infernoY = infernoDip + infernoSkyClimb;
      float roadCorridorMask = 1.0 - smoothstep(14.0, 32.0, abs(wp.x));
      float horizonPastPortal = smoothstep(162.0, 172.0, curveDist);
      float pinchFactor = mix(-0.76 * smoothstep(18.0, 166.0, curveDist), -0.98, horizonPastPortal);
      float effectivePinch = pinchFactor * mix(0.22, 1.0, roadCorridorMask);
      float infernoPinchX = wp.x * effectivePinch;

      wp.y *= mix(1.0, max(0.04, 1.0 + effectivePinch), uInfernoMapMix);
      wp.y += mix(beachDropY, infernoY, uInfernoMapMix);
      wp.x += mix(beachShiftX, infernoPinchX, uInfernoMapMix);
      vCurvedWorldPos = wp.xyz;
      mvPosition = viewMatrix * wp;
      vCameraDepth = -mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;`,
    );

    if (!skipColorGrade && !shader.fragmentShader.includes('applyTropicalCinematicGrade')) {
      shader.fragmentShader =
        `uniform vec3 uHorizonFogColor;\nuniform vec3 uHorizonFogSkyTint;\nuniform float uHorizonFogPulse;\nvarying vec3 vCurvedWorldPos;\nvarying float vCameraDepth;\n` +
        GLSL_TROPICAL_CINEMATIC_GRADE +
        shader.fragmentShader;

      if (fogCfg) {
        const minF = fogCfg.minFog.toFixed(3);
        const maxF = fogCfg.maxFog.toFixed(3);
        const clearY = fogCfg.clearHeightY.toFixed(1);

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          gl_FragColor.rgb = applyTropicalCinematicGrade(gl_FragColor.rgb);
          float distDepthRatio = smoothstep(55.0, 155.0, vCameraDepth);
          float verticalHaze = 1.0 - smoothstep(2.0, ${clearY}, vCurvedWorldPos.y);
          float dynamicPulse = 0.045 * sin(vCurvedWorldPos.x * 0.06 + uHorizonFogPulse) + 0.03 * cos(vCurvedWorldPos.y * 0.08 - uHorizonFogPulse * 0.7);
          float rawFogMix = mix(${minF}, ${maxF}, clamp(verticalHaze * 0.68 + distDepthRatio * 0.32 + dynamicPulse, 0.0, 1.0));
          float finalDepthFog = clamp(rawFogMix * smoothstep(45.0, 85.0, vCameraDepth), 0.0, ${maxF});
          vec3 atmosphericTint = mix(uHorizonFogColor, uHorizonFogSkyTint, clamp((vCurvedWorldPos.y - 4.0) / 38.0, 0.0, 0.65));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, atmosphericTint, finalDepthFog);`,
        );
      } else {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          gl_FragColor.rgb = applyTropicalCinematicGrade(gl_FragColor.rgb);`,
        );
      }
    } else if (fogCfg && !shader.fragmentShader.includes('uniform vec3 uHorizonFogColor;')) {
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
cartoonInkLineMat.userData.skipColorGrade = true;
applyWorldCurvatureToMaterial(cartoonInkLineMat);

const cartoonInkHullMat = new THREE.MeshBasicMaterial({
  color: 0x1e1b18,
  side: THREE.BackSide,
});
cartoonInkHullMat.userData.skipColorGrade = true;
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
  lod2MaxNodes: THREE.Object3D[];
  occludableLowerNodes: THREE.Object3D[];
}

function getOrBuildLodCache(group: THREE.Object3D): CachedLodLists {
  if (group.userData.cachedLodLists) {
    return group.userData.cachedLodLists as CachedLodLists;
  }

  const lod0OnlyNodes: THREE.Object3D[] = [];
  const lod1MaxNodes: THREE.Object3D[] = [];
  const lod2MaxNodes: THREE.Object3D[] = [];
  const occludableLowerNodes: THREE.Object3D[] = [];

  if (group.userData.keepAllMeshesVisible) {
    group.traverse((obj) => {
      if (obj === group) return;
      if (obj instanceof THREE.LineSegments || obj.userData.isOutlineMesh) {
        lod0OnlyNodes.push(obj);
      }
    });
    const lists: CachedLodLists = {
      lod0OnlyNodes,
      lod1MaxNodes,
      lod2MaxNodes,
      occludableLowerNodes,
    };
    group.userData.cachedLodLists = lists;
    return lists;
  }

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
        // Overhead sagging wires visible in LOD0 & LOD1, hidden in far LOD2/LOD3
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
      } else if (approxVol < 16.0) {
        // Secondary sub-volumes -> LOD0, LOD1, LOD2 (hidden in ultra-far LOD3 > 142m)
        lod2MaxNodes.push(obj);
      }
    }
  });

  const lists: CachedLodLists = { lod0OnlyNodes, lod1MaxNodes, lod2MaxNodes, occludableLowerNodes };
  group.userData.cachedLodLists = lists;
  return lists;
}

/**
 * Applies automatic Level of Detail (LOD0 / LOD1 / LOD2 / LOD3) and Occlusion Culling
 * to any 3D group in O(1) time when state is unchanged.
 */
export function applyGroupLodState(
  group: THREE.Object3D,
  lod: 0 | 1 | 2 | 3,
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

  const { lod0OnlyNodes, lod1MaxNodes, lod2MaxNodes, occludableLowerNodes } = getOrBuildLodCache(group);

  const showLod0 = lod === 0;
  for (let i = 0; i < lod0OnlyNodes.length; i++) {
    lod0OnlyNodes[i].visible = showLod0;
  }

  const showLod1 = lod <= 1;
  for (let i = 0; i < lod1MaxNodes.length; i++) {
    lod1MaxNodes[i].visible = showLod1;
  }

  const showLod2 = lod <= 2;
  for (let i = 0; i < lod2MaxNodes.length; i++) {
    lod2MaxNodes[i].visible = showLod2;
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
export function applyHouseDistanceOpacity(
  group: THREE.Object3D,
  opacity: number,
  _distanceAhead = 0,
): void {
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

const streetlampUniforms = {
  uNightIntensity: { value: 0.0 },
};

const streetlampNightConeMat = new THREE.ShaderMaterial({
  uniforms: streetlampUniforms,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  vertexShader: `
    varying vec2 vUv;
    varying float vCamDist;
    void main() {
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vCamDist = length(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    uniform float uNightIntensity;
    varying vec2 vUv;
    varying float vCamDist;
    void main() {
      if (uNightIntensity <= 0.005) discard;
      // Fade suave vertical (mais brilhante perto da lâmpada no topo, desaparecendo suavemente para baixo)
      float vertFade = smoothstep(0.0, 0.65, vUv.y) * (1.0 - smoothstep(0.88, 1.0, vUv.y));
      // Fade radial suave para eliminar qualquer borda dura de cone/triângulo
      float radialDist = abs(vUv.x - 0.5) * 2.0;
      float radialSoft = exp(-radialDist * radialDist * 3.2);
      // Light Fade Out com a distância da câmera (desaparece gradualmente ao longe)
      float distFade = smoothstep(92.0, 18.0, vCamDist);
      float alpha = vertFade * radialSoft * distFade * uNightIntensity * 0.22;
      if (alpha <= 0.003) discard;
      vec3 warmCol = mix(vec3(1.0, 0.78, 0.28), vec3(1.0, 0.96, 0.75), vUv.y);
      gl_FragColor = vec4(warmCol, alpha);
    }
  `,
});

const streetlampNightBulbOrbMat = new THREE.ShaderMaterial({
  uniforms: streetlampUniforms,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: `
    varying vec3 vNormalDir;
    varying vec3 vViewDir;
    varying float vCamDist;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vCamDist = length(cameraPosition - wp.xyz);
      vNormalDir = normalize(normalMatrix * normal);
      vec4 mvPos = viewMatrix * wp;
      vViewDir = normalize(-mvPos.xyz);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    uniform float uNightIntensity;
    varying vec3 vNormalDir;
    varying vec3 vViewDir;
    varying float vCamDist;
    void main() {
      float baseGlow = max(0.18, uNightIntensity);
      float ndv = max(0.0, dot(vNormalDir, vViewDir));
      float softHalo = pow(ndv, 2.2);
      // Light Fade Out suave com a distância
      float distFade = smoothstep(105.0, 14.0, vCamDist);
      float alpha = softHalo * distFade * baseGlow * 0.68;
      if (alpha <= 0.004) discard;
      vec3 col = mix(vec3(1.0, 0.82, 0.32), vec3(1.0, 0.98, 0.88), ndv);
      gl_FragColor = vec4(col, alpha);
    }
  `,
});

export function setNightStreetLightIntensity(nightFactor: number): void {
  const n = THREE.MathUtils.clamp(nightFactor, 0, 1);
  streetlampUniforms.uNightIntensity.value = n;
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

  // Halo luminoso quente nos postes com Light Fade Out suave pela distância (sem triângulos duros!)
  const nightHalo = new THREE.Mesh(sharedGeos.cone, streetlampNightConeMat);
  nightHalo.scale.set(0.95, 2.35, 0.95);
  nightHalo.position.set(roadDir * 1.22, poleH - 1.55, 0);
  nightHalo.userData.noCartoonOutline = true;
  nightHalo.visible = true;
  group.add(nightHalo);

  const nightOrb = new THREE.Mesh(sharedGeos.sphere, streetlampNightBulbOrbMat);
  nightOrb.scale.set(0.52, 0.36, 0.52);
  nightOrb.position.set(roadDir * 1.22, poleH - 0.35, 0);
  nightOrb.userData.noCartoonOutline = true;
  group.add(nightOrb);

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

const cachedStoreSignMaterials: Record<string, THREE.MeshBasicMaterial> = {};

function getCariocaBuildingSignMaterial(
  kind: 'BAR' | 'PIZZARIA' | 'RIO' | 'LANCHONETE' | 'BRASIL_FLAG',
): THREE.MeshBasicMaterial {
  if (cachedStoreSignMaterials[kind]) return cachedStoreSignMaterials[kind];

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 192);

  if (kind === 'BRASIL_FLAG') {
    // Bandeira do Brasil vibrante com contorno cartoon
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 182);

    ctx.beginPath();
    ctx.moveTo(256, 20);
    ctx.lineTo(468, 96);
    ctx.lineTo(256, 172);
    ctx.lineTo(44, 96);
    ctx.closePath();
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(256, 96, 48, 0, Math.PI * 2);
    ctx.fillStyle = '#1d4ed8';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 9;
    ctx.arc(256, 114, 52, -Math.PI * 0.78, -Math.PI * 0.22);
    ctx.stroke();
  } else if (kind === 'BAR') {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(10, 16, 492, 160, 26);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();

    ctx.font = '900 108px Impact, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#09090b';
    ctx.strokeText('BAR', 256, 102);
    ctx.fillStyle = '#fde047';
    ctx.fillText('BAR', 256, 102);
  } else if (kind === 'PIZZARIA') {
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.roundRect(8, 12, 496, 168, 22);
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();

    ctx.font = '900 76px Impact, Arial Black, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 11;
    ctx.strokeStyle = '#09090b';
    ctx.strokeText('PIZZARIA', 28, 100);
    ctx.fillStyle = '#15803d';
    ctx.fillText('PIZZARIA', 28, 100);

    // Fatia de pizza cartoon à direita
    ctx.save();
    ctx.translate(432, 96);
    ctx.rotate(-0.2);
    ctx.beginPath();
    ctx.moveTo(-48, 38);
    ctx.lineTo(44, -10);
    ctx.lineTo(-12, -48);
    ctx.closePath();
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();
    ctx.fillStyle = '#dc2626';
    for (const [px, py] of [
      [-14, 6],
      [6, -6],
      [-10, -20],
    ]) {
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (kind === 'RIO') {
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.roundRect(8, 12, 496, 168, 22);
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#09090b';
    ctx.stroke();

    ctx.font = '900 104px Impact, Arial Black, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#09090b';
    ctx.strokeText('RIO', 42, 102);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('RIO', 42, 102);

    // Silhueta branca do Cristo Redentor na placa "RIO"
    ctx.save();
    ctx.translate(385, 98);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, -44, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-58, -26);
    ctx.lineTo(58, -26);
    ctx.lineTo(58, -12);
    ctx.lineTo(15, -10);
    ctx.lineTo(20, 56);
    ctx.lineTo(-20, 56);
    ctx.lineTo(-15, -10);
    ctx.lineTo(-58, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else {
    // LANCHONETE
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(10, 16, 492, 160, 24);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#fde047';
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#09090b';
    ctx.strokeRect(10, 16, 492, 160);

    ctx.font = '900 72px Impact, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 11;
    ctx.strokeStyle = '#09090b';
    ctx.strokeText('LANCHONETE', 256, 100);
    ctx.fillStyle = '#fde047';
    ctx.fillText('LANCHONETE', 256, 100);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    fog: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  cachedStoreSignMaterials[kind] = mat;
  return mat;
}

/**
 * Item 10: Recria os 4 Prédios Cariocas Cartoon Individuais em 3D seguindo fielmente a imagem de referência
 * (media_1794194967212_d1e76a06.jpg):
 * - v === 0: Edifício Amarelo Solar com Varandas Curvas, Bandeira do Brasil na sacada, Ar-Condicionado e "BAR" no térreo.
 * - v === 1: Edifício Azul Carioca com "PIZZARIA" no térreo, toldo verde/branco, floreiras com plantas, AC e caixa-d'água azul.
 * - v === 2: Edifício Bege/Areia Art Déco com faixas verticais azuis, janelas de canto, plantas e loja "RIO" (com Cristo) no térreo.
 * - v === 3: Edifício Verde-Abacate & Coral com Telhado Colonial de Cerâmica, Varal de Roupas Coloridas na sacada, AC, caixa-d'água azul e "LANCHONETE" no térreo.
 */
export function buildRioSkylineBuilding(
  variantIndex: number,
  side: 'left' | 'right',
  _maxAnisotropy = 4,
): THREE.Group {
  const group = new THREE.Group();
  const v = ((variantIndex % 4) + 4) % 4;
  const streetSign = side === 'left' ? 1 : -1;

  // Materiais cartoon vivos sem neblina opaca para preservar cores vibrantes e leitura limpa
  const makeCartoonWallMat = (hex: number) =>
    new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 0.58,
      metalness: 0.06,
      fog: false,
    });

  const yellowWallMat = makeCartoonWallMat(0xfbbf24);
  const yellowTrimMat = makeCartoonWallMat(0xfef08a);
  const terracottaBaseMat = makeCartoonWallMat(0xea580c);
  const blueWallMat = makeCartoonWallMat(0x2563eb);
  const blueDarkTrimMat = makeCartoonWallMat(0x1d4ed8);
  const beigeDecoWallMat = makeCartoonWallMat(0xfde68a);
  const sandWarmWallMat = makeCartoonWallMat(0xfcd34d);
  const coralWallMat = makeCartoonWallMat(0xf97316);
  const limeGreenWallMat = makeCartoonWallMat(0x84cc16);
  const clayRoofMat = makeCartoonWallMat(0xd95326);
  const blueGlassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.22,
    metalness: 0.25,
    fog: false,
  });
  const darkWindowFrameMat = makeCartoonWallMat(0x1e293b);
  const creamShutterMat = makeCartoonWallMat(0xfef3c7);
  const foliageGreenMat = makeCartoonWallMat(0x16a34a);
  const acWhiteMat = makeCartoonWallMat(0xf8fafc);
  const waterTankBlueMat = makeCartoonWallMat(0x0284c7);
  const redAwningMat = makeCartoonWallMat(0xdc2626);
  const greenAwningMat = makeCartoonWallMat(0x16a34a);
  const blueAwningMat = makeCartoonWallMat(0x2563eb);

  // Helper: Aparelho de Ar-Condicionado 3D com grade circular preta
  const addAcUnit = (x: number, y: number, z: number, rotY = 0) => {
    const acGroup = new THREE.Group();
    acGroup.position.set(x, y, z);
    acGroup.rotation.y = rotY;
    const box = new THREE.Mesh(sharedGeos.unitBox, acWhiteMat);
    box.scale.set(0.92, 0.66, 0.54);
    acGroup.add(box);
    const fan = new THREE.Mesh(sharedGeos.cylinder, darkWindowFrameMat);
    fan.scale.set(0.24, 0.56, 0.24);
    fan.rotation.x = Math.PI / 2;
    fan.position.set(-0.14, 0, 0.02);
    acGroup.add(fan);
    group.add(acGroup);
  };

  // Helper: Caixa-d'Água Azul Cilíndrica Carioca no Telhado
  const addBlueWaterTank = (x: number, y: number, z: number, radius = 1.65, height = 2.1) => {
    const tank = new THREE.Mesh(sharedGeos.cylinder, waterTankBlueMat);
    tank.scale.set(radius, height, radius);
    tank.position.set(x, y + height * 0.5, z);
    group.add(tank);
    const lid = new THREE.Mesh(sharedGeos.cylinder, blueDarkTrimMat);
    lid.scale.set(radius * 1.08, 0.28, radius * 1.08);
    lid.position.set(x, y + height + 0.12, z);
    group.add(lid);
  };

  // Helper: Antena de TV Metálica no Topo do Prédio
  const addRooftopTvAntenna = (x: number, y: number, z: number) => {
    const antGroup = new THREE.Group();
    antGroup.position.set(x, y, z);
    const mast = new THREE.Mesh(sharedGeos.cylinder, darkWindowFrameMat);
    mast.scale.set(0.09, 3.6, 0.09);
    mast.position.set(0, 1.8, 0);
    antGroup.add(mast);
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(sharedGeos.unitBox, darkWindowFrameMat);
      bar.scale.set(1.6 - i * 0.28, 0.08, 0.08);
      bar.position.set(0, 2.2 + i * 0.6, 0);
      bar.rotation.y = 0.35;
      antGroup.add(bar);
    }
    group.add(antGroup);
  };

  // Helper: Floreira / Vaso com Plantas Tropicais Verdes na Janela ou Sacada
  const addWindowPlanter = (x: number, y: number, z: number, w = 2.2) => {
    const box = new THREE.Mesh(sharedGeos.unitBox, terracottaBaseMat);
    box.scale.set(w, 0.48, 0.56);
    box.position.set(x, y, z);
    group.add(box);
    for (const ox of [-w * 0.3, 0, w * 0.3]) {
      const bush = new THREE.Mesh(sharedGeos.sphere, foliageGreenMat);
      bush.scale.set(0.55, 0.48, 0.48);
      bush.position.set(x + ox, y + 0.36, z + 0.06);
      group.add(bush);
    }
  };

  // Dimensões individuais variadas (alturas e larguras distintas conforme a imagem de referência!)
  const W = v === 0 ? 11.2 : v === 1 ? 10.4 : v === 2 ? 11.0 : 10.6;
  const D = v === 0 ? 9.6 : v === 1 ? 9.2 : v === 2 ? 9.4 : 9.2;
  const H = v === 0 ? 31.0 : v === 1 ? 22.5 : v === 2 ? 29.5 : 21.5;

  // Base arquitetônica cartoon decorada (tijolinho/pedra quente colonial, arcos e vitrines)
  // para nunca exibir paredes cinzas estranhas na parte inferior dos prédios!
  const warmStoneBaseMat = v === 0 ? terracottaBaseMat : v === 1 ? sandWarmWallMat : v === 2 ? coralWallMat : terracottaBaseMat;
  const trimBandMat = creamShutterMat;

  const podium = new THREE.Mesh(sharedGeos.unitBox, warmStoneBaseMat);
  podium.scale.set(W + 0.5, 16.0, D + 0.5);
  podium.position.set(0, -8.0, 0);
  group.add(podium);

  // Faixas horizontais creme e arcos coloniais decorativos na base inferior do prédio
  for (const bandY of [-0.35, -3.6, -7.2]) {
    const plinthBand = new THREE.Mesh(sharedGeos.unitBox, trimBandMat);
    plinthBand.scale.set(W + 0.78, 0.55, D + 0.78);
    plinthBand.position.set(0, bandY, 0);
    group.add(plinthBand);
  }
  for (const archX of [-W * 0.28, 0, W * 0.28]) {
    const pilaster = new THREE.Mesh(sharedGeos.unitBox, trimBandMat);
    pilaster.scale.set(0.85, 7.2, 0.45);
    pilaster.position.set(archX, -3.6, D * 0.5 + 0.22);
    group.add(pilaster);

    const shopArchWin = new THREE.Mesh(sharedGeos.unitBox, blueGlassMat);
    shopArchWin.scale.set(1.65, 2.4, 0.36);
    shopArchWin.position.set(archX, -2.1, D * 0.5 + 0.24);
    group.add(shopArchWin);
  }

  if (v === 0) {
    // =========================================================================
    // PRÉDIO 1: EDIFÍCIO AMARELO SOLAR COM VARANDAS CURVAS, BANDEIRA DO BRASIL E "BAR"
    // =========================================================================
    const mainShaft = new THREE.Mesh(sharedGeos.tallBox, yellowWallMat);
    mainShaft.scale.set(W, H, D);
    mainShaft.position.set(0, H * 0.5, 0);
    group.add(mainShaft);

    // Coluna cilíndrica curva na quina esquerda (varandas arredondadas!)
    const roundedCorner = new THREE.Mesh(sharedGeos.cylinder, yellowWallMat);
    roundedCorner.scale.set(3.2, H, 3.2);
    roundedCorner.position.set(-W * 0.34, H * 0.5, D * 0.26);
    group.add(roundedCorner);

    // Térreo comercial "BAR" com toldo listrado vermelho/branco
    const groundBase = new THREE.Mesh(sharedGeos.unitBox, terracottaBaseMat);
    groundBase.scale.set(W + 0.4, 4.8, D + 0.4);
    groundBase.position.set(0, 2.4, 0);
    group.add(groundBase);

    const barSign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 1.55),
      getCariocaBuildingSignMaterial('BAR'),
    );
    barSign.position.set(1.2, 4.15, D * 0.5 + 0.32);
    barSign.userData.noCartoonOutline = true;
    group.add(barSign);

    // Toldo listrado vermelho e branco
    for (let s = -2; s <= 2; s++) {
      const stripe = new THREE.Mesh(
        sharedGeos.unitBox,
        s % 2 === 0 ? redAwningMat : acWhiteMat,
      );
      stripe.scale.set(1.05, 0.24, 1.85);
      stripe.position.set(-2.2 + s * 1.02, 3.35, D * 0.5 + 0.85);
      stripe.rotation.x = 0.32;
      group.add(stripe);
    }

    // 5 Andares com Varandas Curvas à esquerda + Janelas Azuis à direita + Bandeira do Brasil!
    for (let fl = 1; fl <= 5; fl++) {
      const fy = 4.8 + (fl - 1) * 4.8;

      // Laje branca arredondada da sacada esquerda
      const balcSlab = new THREE.Mesh(sharedGeos.cylinder, acWhiteMat);
      balcSlab.scale.set(3.65, 0.55, 3.65);
      balcSlab.position.set(-W * 0.34, fy + 0.3, D * 0.28);
      group.add(balcSlab);

      // Guarda-corpo escuro da sacada
      const rail = new THREE.Mesh(sharedGeos.cylinder, darkWindowFrameMat);
      rail.scale.set(3.58, 0.95, 3.58);
      rail.position.set(-W * 0.34, fy + 1.05, D * 0.28);
      group.add(rail);

      // Porta-janela azul na sacada
      const balcWin = new THREE.Mesh(sharedGeos.unitBox, blueGlassMat);
      balcWin.scale.set(2.3, 2.7, 0.36);
      balcWin.position.set(-W * 0.28, fy + 1.9, D * 0.5 + 0.16);
      group.add(balcWin);

      if (fl % 2 === 1) {
        addWindowPlanter(-W * 0.36, fy + 0.85, D * 0.5 + 0.55, 1.8);
      }

      // Janela azul direita
      const rightWinFrame = new THREE.Mesh(sharedGeos.unitBox, darkWindowFrameMat);
      rightWinFrame.scale.set(2.9, 2.3, 0.32);
      rightWinFrame.position.set(W * 0.22, fy + 2.0, D * 0.5 + 0.12);
      group.add(rightWinFrame);

      const rightWinGlass = new THREE.Mesh(sharedGeos.unitBox, blueGlassMat);
      rightWinGlass.scale.set(2.55, 1.95, 0.38);
      rightWinGlass.position.set(W * 0.22, fy + 2.0, D * 0.5 + 0.16);
      group.add(rightWinGlass);

      if (fl === 2 || fl === 3) {
        addAcUnit(W * 0.36, fy + 0.95, D * 0.5 + 0.36);
      }
    }

    // Bandeira do Brasil pendurada com orgulho no 4º andar (igual à imagem de referência!)
    const flagMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 2.45),
      getCariocaBuildingSignMaterial('BRASIL_FLAG'),
    );
    flagMesh.position.set(W * 0.22, 4.8 + 3 * 4.8 + 0.55, D * 0.5 + 0.42);
    flagMesh.rotation.z = -0.06;
    flagMesh.userData.noCartoonOutline = true;
    group.add(flagMesh);

    // Cobertura / Terraço com plantas e antena
    const penthouse = new THREE.Mesh(sharedGeos.unitBox, coralWallMat);
    penthouse.scale.set(W * 0.62, 3.4, D * 0.62);
    penthouse.position.set(0.4, H + 1.7, -0.3);
    group.add(penthouse);
    addWindowPlanter(-W * 0.22, H + 0.35, D * 0.32, 3.2);
    addRooftopTvAntenna(1.8, H + 3.4, 0);
  } else if (v === 1) {
    // =========================================================================
    // PRÉDIO 2: EDIFÍCIO AZUL CARIOCA COM "PIZZARIA", FLORERAS E CAIXA-D'ÁGUA AZUL
    // =========================================================================
    const mainShaft = new THREE.Mesh(sharedGeos.tallBox, blueWallMat);
    mainShaft.scale.set(W, H, D);
    mainShaft.position.set(0, H * 0.5, 0);
    group.add(mainShaft);

    // Térreo creme com placa "PIZZARIA" + fatia de pizza e toldo verde/branco
    const groundBase = new THREE.Mesh(sharedGeos.unitBox, creamShutterMat);
    groundBase.scale.set(W + 0.4, 5.0, D + 0.4);
    groundBase.position.set(0, 2.5, 0);
    group.add(groundBase);

    const pizzaSign = new THREE.Mesh(
      new THREE.PlaneGeometry(7.6, 2.2),
      getCariocaBuildingSignMaterial('PIZZARIA'),
    );
    pizzaSign.position.set(0, 4.1, D * 0.5 + 0.32);
    pizzaSign.userData.noCartoonOutline = true;
    group.add(pizzaSign);

    for (let s = -3; s <= 3; s++) {
      const stripe = new THREE.Mesh(
        sharedGeos.unitBox,
        s % 2 === 0 ? greenAwningMat : acWhiteMat,
      );
      stripe.scale.set(1.12, 0.24, 1.9);
      stripe.position.set(s * 1.1, 2.85, D * 0.5 + 0.88);
      stripe.rotation.x = 0.34;
      group.add(stripe);
    }

    // Frisos horizontais creme separando os andares + janelas com venezianas e floreiras
    for (let fl = 1; fl <= 2; fl++) {
      const fy = 5.4 + (fl - 1) * 7.6;

      const cornice = new THREE.Mesh(sharedGeos.unitBox, creamShutterMat);
      cornice.scale.set(W + 0.65, 0.62, D + 0.65);
      cornice.position.set(0, fy, 0);
      group.add(cornice);

      for (const wx of [-W * 0.24, W * 0.24]) {
        const winFrame = new THREE.Mesh(sharedGeos.unitBox, creamShutterMat);
        winFrame.scale.set(3.1, 3.4, 0.32);
        winFrame.position.set(wx, fy + 3.4, D * 0.5 + 0.14);
        group.add(winFrame);

        const winPane = new THREE.Mesh(
          sharedGeos.unitBox,
          fl === 1 && wx < 0 ? sandWarmWallMat : blueGlassMat,
        );
        winPane.scale.set(2.65, 2.95, 0.38);
        winPane.position.set(wx, fy + 3.4, D * 0.5 + 0.18);
        group.add(winPane);

        if (wx < 0) {
          addWindowPlanter(wx, fy + 1.55, D * 0.5 + 0.42, 2.8);
        } else {
          addAcUnit(wx + 0.2, fy + 1.35, D * 0.5 + 0.38);
        }
      }
    }

    // Platibanda amarela superior + Caixa-d'Água Azul Cilíndrica + Antena
    const roofRim = new THREE.Mesh(sharedGeos.unitBox, yellowWallMat);
    roofRim.scale.set(W + 0.6, 0.95, D + 0.6);
    roofRim.position.set(0, H + 0.45, 0);
    group.add(roofRim);

    addBlueWaterTank(-1.2, H + 0.9, 0.4, 2.05, 2.45);
    addWindowPlanter(2.4, H + 0.95, D * 0.28, 2.2);
    addRooftopTvAntenna(2.2, H + 0.95, -0.5);
  } else if (v === 2) {
    // =========================================================================
    // PRÉDIO 3: EDIFÍCIO BEGE ART DÉCO COM FAIXAS VERTICAIS AZUIS E LOJA "RIO" (CRISTO)
    // =========================================================================
    const mainShaft = new THREE.Mesh(sharedGeos.tallBox, beigeDecoWallMat);
    mainShaft.scale.set(W, H, D);
    mainShaft.position.set(0, H * 0.5, 0);
    group.add(mainShaft);

    // Duas faixas verticais azuis Art Déco percorrendo toda a altura do prédio
    for (const sx of [0.35, 1.25]) {
      const blueStripe = new THREE.Mesh(
        sharedGeos.tallBox,
        sx < 0.8 ? blueWallMat : blueGlassMat,
      );
      blueStripe.scale.set(0.68, H + 1.8, D + 0.52);
      blueStripe.position.set(sx, H * 0.5 + 0.9, 0);
      group.add(blueStripe);
    }

    // Loja térrea "RIO" com silhueta do Cristo Redentor e toldo azul
    const rioSign = new THREE.Mesh(
      new THREE.PlaneGeometry(8.2, 2.25),
      getCariocaBuildingSignMaterial('RIO'),
    );
    rioSign.position.set(0, 4.35, D * 0.5 + 0.34);
    rioSign.userData.noCartoonOutline = true;
    group.add(rioSign);

    const blueAwning = new THREE.Mesh(sharedGeos.unitBox, blueAwningMat);
    blueAwning.scale.set(6.8, 0.32, 1.85);
    blueAwning.position.set(0, 2.95, D * 0.5 + 0.82);
    blueAwning.rotation.x = 0.28;
    group.add(blueAwning);

    // 4 Andares de janelas de canto azuis, sacadas direitas com plantas e AC à esquerda
    for (let fl = 1; fl <= 4; fl++) {
      const fy = 5.6 + (fl - 1) * 5.4;

      const band = new THREE.Mesh(sharedGeos.unitBox, creamShutterMat);
      band.scale.set(W + 0.45, 0.48, D + 0.45);
      band.position.set(0, fy, 0);
      group.add(band);

      for (const wx of [-W * 0.22, W * 0.3]) {
        const winGlass = new THREE.Mesh(sharedGeos.unitBox, blueGlassMat);
        winGlass.scale.set(2.5, 2.65, 0.36);
        winGlass.position.set(wx, fy + 2.3, D * 0.5 + 0.16);
        group.add(winGlass);
      }

      addAcUnit(-W * 0.44, fy + 1.4, D * 0.5 + 0.28);
      if (fl % 2 === 0) {
        addWindowPlanter(W * 0.34, fy + 0.65, D * 0.5 + 0.36, 1.9);
      }
    }

    // Topo escalonado Art Déco + Antena
    const step1 = new THREE.Mesh(sharedGeos.unitBox, beigeDecoWallMat);
    step1.scale.set(W * 0.72, 2.6, D * 0.72);
    step1.position.set(0, H + 1.3, 0);
    group.add(step1);

    const step2 = new THREE.Mesh(sharedGeos.unitBox, creamShutterMat);
    step2.scale.set(W * 0.42, 2.0, D * 0.42);
    step2.position.set(-0.6, H + 3.4, 0);
    group.add(step2);

    addRooftopTvAntenna(-0.4, H + 4.4, 0);
  } else {
    // =========================================================================
    // PRÉDIO 4: EDIFÍCIO VERDE-ABACATE & CORAL COM TELHADO COLONIAL, VARAL DE ROUPAS E "LANCHONETE"
    // =========================================================================
    // Metade inferior Coral/Terracota + Andar superior Verde-Abacate
    const lowerShaft = new THREE.Mesh(sharedGeos.tallBox, coralWallMat);
    lowerShaft.scale.set(W, H * 0.66, D);
    lowerShaft.position.set(0, H * 0.33, 0);
    group.add(lowerShaft);

    const upperShaft = new THREE.Mesh(sharedGeos.unitBox, limeGreenWallMat);
    upperShaft.scale.set(W + 0.15, H * 0.36, D + 0.15);
    upperShaft.position.set(0, H * 0.82, 0);
    group.add(upperShaft);

    // Térreo comercial "LANCHONETE" com toldo vermelho largo
    const lanchSign = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 2.05),
      getCariocaBuildingSignMaterial('LANCHONETE'),
    );
    lanchSign.position.set(0, 4.1, D * 0.5 + 0.34);
    lanchSign.userData.noCartoonOutline = true;
    group.add(lanchSign);

    const redAwning = new THREE.Mesh(sharedGeos.unitBox, redAwningMat);
    redAwning.scale.set(7.8, 0.34, 2.0);
    redAwning.position.set(0, 2.8, D * 0.5 + 0.9);
    redAwning.rotation.x = 0.32;
    group.add(redAwning);

    // Sacada do 2º andar com VARAL DE ROUPAS COLORIDAS (camisetas vermelha, amarela e azul!)
    const balcY = 8.4;
    const balcSlab = new THREE.Mesh(sharedGeos.unitBox, creamShutterMat);
    balcSlab.scale.set(W * 0.76, 0.5, 1.55);
    balcSlab.position.set(0, balcY, D * 0.5 + 0.65);
    group.add(balcSlab);

    const balcRail = new THREE.Mesh(sharedGeos.unitBox, darkWindowFrameMat);
    balcRail.scale.set(W * 0.74, 1.05, 0.14);
    balcRail.position.set(0, balcY + 0.75, D * 0.5 + 1.32);
    group.add(balcRail);

    // Roupas coloridas penduradas no varal da sacada (igual à imagem de referência!)
    const clothesSpecs = [
      { x: -1.65, mat: redAwningMat },
      { x: 0.0, mat: yellowWallMat },
      { x: 1.65, mat: blueGlassMat },
    ];
    for (const cl of clothesSpecs) {
      const shirt = new THREE.Mesh(sharedGeos.unitBox, cl.mat);
      shirt.scale.set(1.15, 1.45, 0.14);
      shirt.position.set(cl.x, balcY + 1.85, D * 0.5 + 1.15);
      shirt.rotation.z = cl.x * 0.04;
      group.add(shirt);
    }

    // Janelas com venezianas no 3º andar verde + aparelhos de ar-condicionado
    for (const wx of [-W * 0.24, W * 0.24]) {
      const upperWin = new THREE.Mesh(sharedGeos.unitBox, creamShutterMat);
      upperWin.scale.set(2.5, 2.6, 0.34);
      upperWin.position.set(wx, H * 0.82, D * 0.5 + 0.16);
      group.add(upperWin);
    }
    addAcUnit(W * 0.26, H * 0.68, D * 0.5 + 0.38);
    addAcUnit(-W * 0.42, H * 0.66, D * 0.5 + 0.34);

    // Telhado Colonial de Cerâmica Laranja + Caixa-d'Água Azul + Antena
    const roofSlopeFront = new THREE.Mesh(sharedGeos.unitBox, clayRoofMat);
    roofSlopeFront.scale.set(W + 1.1, 0.42, D * 0.62);
    roofSlopeFront.position.set(0, H + 0.85, D * 0.22);
    roofSlopeFront.rotation.x = 0.36;
    group.add(roofSlopeFront);

    const roofSlopeBack = new THREE.Mesh(sharedGeos.unitBox, clayRoofMat);
    roofSlopeBack.scale.set(W + 1.1, 0.42, D * 0.62);
    roofSlopeBack.position.set(0, H + 0.85, -D * 0.22);
    roofSlopeBack.rotation.x = -0.36;
    group.add(roofSlopeBack);

    addBlueWaterTank(1.6, H + 0.9, -0.6, 1.85, 2.2);
    addRooftopTvAntenna(-2.0, H + 1.1, 0);
  }

  // Coqueiro / Palmeira Tropical na calçada ao lado do prédio (igual à imagem de referência!)
  const cornerPalm = buildTropicalTree('palm');
  cornerPalm.scale.setScalar(1.35);
  cornerPalm.position.set(streetSign * (W * 0.5 + 1.3), 0, D * 0.42);
  group.add(cornerPalm);

  // Contornos pretos cartoon bem definidos nos volumes 3D de cada prédio
  addSoftBuildingOutlinesToGroup(group);
  applyWorldCurvatureToGroup(group, {
    minFog: 0.08,
    maxFog: 0.38,
    clearHeightY: 36.0,
  });
  return group;
}

const softBuildingEdgeMat = new THREE.LineBasicMaterial({
  color: 0x09090b,
  transparent: true,
  opacity: 0.68,
  fog: false,
});

const softBuildingSilhouetteHullMat = new THREE.MeshBasicMaterial({
  color: 0x09090b,
  side: THREE.BackSide,
  transparent: true,
  opacity: 0.72,
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
 * Builds a Radiant, Illustrated Cartoon Sun with Golden Sunbeams Passing Behind the Horizon Mountains & Skyline,
 * smoothly descending and reddening at sunset, then fading cleanly as Night & Aurora Borealis emerge!
 */
export function buildRealisticHorizonSun(isPraia = false): {
  group: THREE.Group;
  update: (
    elapsed: number,
    qualityMultiplier?: number,
    sunVisibility?: number,
    sunsetFactor?: number
  ) => void;
} {
  const group = new THREE.Group();
  group.name = 'Cinematic_High_Sky_Sun';

  const sunUniforms = {
    uTime: { value: 0 },
    uQuality: { value: 1.0 },
    uOpacity: { value: 1.0 },
    uSunset: { value: 0.0 },
  };

  // 1. Disco Solar Radiante + Halo Dourado / Coral de Pôr do Sol
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
      uniform float uQuality;
      uniform float uOpacity;
      uniform float uSunset;
      varying vec2 vUv;
      void main() {
        if (uOpacity <= 0.005) discard;
        float r = length(vUv);
        if (r > 1.0) discard;

        float angle = atan(vUv.y, vUv.x);

        float rayA = sin(angle * 10.0 - uTime * 0.18) * 0.5 + 0.5;
        float rayB = cos(angle * 16.0 + uTime * 0.11) * 0.5 + 0.5;
        float rayC = sin(angle * 6.0 + uTime * 0.06) * 0.5 + 0.5;
        float godRays = (pow(rayA, 3.6) * 0.50 + pow(rayB, 4.5) * 0.30 + pow(rayC, 2.4) * 0.25)
          * smoothstep(0.96, 0.14, r) * (0.26 + 0.14 * uQuality);

        float streak = exp(-abs(vUv.y) * 26.0) * smoothstep(0.98, 0.05, abs(vUv.x)) * (0.34 + 0.18 * uQuality);
        float lensRing = exp(-pow((r - 0.44) * 16.0, 2.0)) * 0.14 * uQuality;

        float coreDisc = smoothstep(0.18, 0.12, r);
        float innerGlow = smoothstep(0.36, 0.125, r) * 0.62;
        float midCorona = smoothstep(0.64, 0.18, r) * 0.28;
        float outerAura = smoothstep(0.95, 0.30, r) * 0.14;

        vec3 pureSolarWhite = mix(vec3(1.0, 0.99, 0.96), vec3(1.0, 0.95, 0.84), uSunset);
        vec3 warmGold = mix(vec3(1.0, 0.94, 0.72), vec3(1.0, 0.74, 0.45), uSunset);
        vec3 richAmber = mix(vec3(0.99, 0.84, 0.58), vec3(0.96, 0.52, 0.42), uSunset);
        vec3 softPeach = mix(vec3(0.98, 0.78, 0.58), vec3(0.82, 0.38, 0.56), uSunset);

        vec3 col = mix(softPeach, richAmber, smoothstep(0.95, 0.38, r));
        col = mix(col, warmGold, smoothstep(0.52, 0.18, r) + lensRing);
        col = mix(col, pureSolarWhite, clamp(coreDisc + streak * 0.65 + godRays * 0.48, 0.0, 1.0));

        float alpha = clamp(coreDisc + innerGlow + midCorona + outerAura + godRays * 0.75 + streak * 0.72 + lensRing, 0.0, 1.0) * uOpacity * 0.86;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  // 2. Feixes Solares Aditivos (Sunbeams / Lens Bloom Amplo no Alto do Céu)
  const beamsShaderMat = new THREE.ShaderMaterial({
    uniforms: sunUniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uQuality;
      uniform float uOpacity;
      uniform float uSunset;
      varying vec2 vUv;
      void main() {
        if (uOpacity <= 0.005) discard;
        float r = length(vUv);
        if (r > 1.0) discard;
        float angle = atan(vUv.y, vUv.x);
        float shafts = pow(sin(angle * 7.0 + uTime * 0.08) * 0.5 + 0.5, 3.0) * smoothstep(1.0, 0.08, r);
        float diagShaft = exp(-abs(vUv.x * 0.62 + vUv.y * 0.78) * 5.5) * step(vUv.y, 0.15) * smoothstep(1.0, 0.1, r);
        float intensity = (shafts * 0.11 + diagShaft * 0.15 + smoothstep(0.65, 0.0, r) * 0.16) * (0.65 + 0.35 * uQuality) * uOpacity;
        vec3 dayBeam = mix(vec3(1.0, 0.85, 0.58), vec3(1.0, 0.97, 0.86), smoothstep(0.7, 0.0, r));
        vec3 sunsetBeam = mix(vec3(0.95, 0.48, 0.46), vec3(1.0, 0.78, 0.52), smoothstep(0.7, 0.0, r));
        vec3 beamColor = mix(dayBeam, sunsetBeam, uSunset);
        gl_FragColor = vec4(beamColor * intensity, intensity);
      }
    `,
  });

  const coreQuad = new THREE.Mesh(new THREE.PlaneGeometry(86, 86), coreShaderMat);
  coreQuad.position.set(0, 0, 0);
  group.add(coreQuad);

  const beamsQuad = new THREE.Mesh(new THREE.PlaneGeometry(148, 148), beamsShaderMat);
  beamsQuad.position.set(4, -8, 0.5);
  group.add(beamsQuad);

  group.position.set(isPraia ? 26.0 : -18.5, isPraia ? 64.0 : 74.0, -182.0);

  return {
    group,
    update: (
      elapsed: number,
      qualityMultiplier = 1.0,
      sunVisibility = 1.0,
      sunsetFactor = 0.0
    ) => {
      const vis = THREE.MathUtils.clamp(sunVisibility, 0, 1);
      group.visible = vis > 0.008;
      worldCurveUniforms.uSunActiveOpacity.value = vis;
      if (!group.visible) return;

      const sMix = THREE.MathUtils.clamp(sunsetFactor, 0, 1);
      sunUniforms.uTime.value = elapsed;
      sunUniforms.uQuality.value = qualityMultiplier;
      sunUniforms.uOpacity.value = vis;
      sunUniforms.uSunset.value = sMix;
      beamsQuad.visible = qualityMultiplier >= 0.45 && vis > 0.04;

      if (isPraia) {
        // Na Praia: o Sol começa alto no céu ensolarado e se põe horizontalmente no horizonte sobre o mar à direita (+X)!
        const setProgress = 1.0 - vis;
        group.position.x =
          THREE.MathUtils.lerp(22.0, 56.0, Math.pow(setProgress, 0.85)) +
          Math.sin(elapsed * 0.04) * 1.4;
        group.position.y =
          THREE.MathUtils.lerp(62.0, 9.5, Math.pow(setProgress, 1.12)) +
          Math.cos(elapsed * 0.04) * 0.4;
      } else {
        // Na Vila/Favela: desce suavemente atrás das montanhas ao anoitecer
        group.position.x = -18.5 - (1.0 - vis) * 12.0 + Math.sin(elapsed * 0.04) * 2.0;
        group.position.y = 16.0 + vis * 58.0 + Math.cos(elapsed * 0.04) * 0.6;
      }
      worldCurveUniforms.uSunWorldPos.value.copy(group.position);
    },
  };
}

/**
 * Nuvens 3D Cartoon Estilizadas lá no Alto do Céu que mudam de cor suavemente
 * conforme o ciclo Dia -> Pôr do Sol -> Noite Estrelada & Aurora Boreal!
 */
export function buildPerspectiveSkyClouds(_maxAnisotropy = 4): {
  group: THREE.Group;
  update: (
    dt: number,
    elapsed: number,
    playerSpeed: number,
    isPlaying: boolean,
    sunsetMix?: number,
    nightMix?: number
  ) => void;
} {
  const group = new THREE.Group();
  group.name = 'Cartoon_Dynamic_Sky_Clouds';

  const cloudTopMat = new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
    fog: false,
  });
  const cloudBellyMat = new THREE.MeshBasicMaterial({
    color: 0xfde68a,
    fog: false,
  });
  const cloudInkHullMat = new THREE.MeshBasicMaterial({
    color: 0x1e1b4b,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.35,
    fog: false,
  });

  const puffGeo = new THREE.SphereGeometry(1.0, 12, 10);

  interface CloudCluster {
    root: THREE.Group;
    baseX: number;
    baseY: number;
    baseZ: number;
    driftSpeed: number;
  }
  const clusters: CloudCluster[] = [];

  const cloudSpecs = [
    { x: -58, y: 66, z: -156, s: 5.4, speed: 0.9 },
    { x: 48, y: 72, z: -162, s: 6.2, speed: 0.72 },
    { x: -16, y: 82, z: -168, s: 5.0, speed: 0.64 },
    { x: 86, y: 58, z: -150, s: 4.8, speed: 1.05 },
    { x: -92, y: 56, z: -148, s: 4.6, speed: 0.82 },
  ];

  const lobeLayout = [
    { dx: 0, dy: 0.35, dz: 0, sx: 1.45, sy: 0.95, sz: 0.85, top: true },
    { dx: -1.15, dy: 0.08, dz: 0.08, sx: 1.05, sy: 0.78, sz: 0.75, top: true },
    { dx: 1.18, dy: 0.12, dz: -0.06, sx: 1.1, sy: 0.82, sz: 0.75, top: true },
    { dx: 0, dy: -0.22, dz: 0.12, sx: 2.15, sy: 0.48, sz: 0.82, top: false },
  ];

  for (const spec of cloudSpecs) {
    const cRoot = new THREE.Group();
    cRoot.position.set(spec.x, spec.y, spec.z);
    cRoot.scale.setScalar(spec.s);

    for (const lobe of lobeLayout) {
      const m = new THREE.Mesh(puffGeo, lobe.top ? cloudTopMat : cloudBellyMat);
      m.position.set(lobe.dx, lobe.dy, lobe.dz);
      m.scale.set(lobe.sx, lobe.sy, lobe.sz);

      const hull = new THREE.Mesh(puffGeo, cloudInkHullMat);
      hull.scale.setScalar(1.045);
      m.add(hull);
      cRoot.add(m);
    }

    group.add(cRoot);
    clusters.push({
      root: cRoot,
      baseX: spec.x,
      baseY: spec.y,
      baseZ: spec.z,
      driftSpeed: spec.speed,
    });
  }

  const _dayTop = new THREE.Color('#fffef5');
  const _dayBelly = new THREE.Color('#dbeafe');
  const _sunsetTop = new THREE.Color('#fed7aa');
  const _sunsetBelly = new THREE.Color('#f472b6');
  const _nightTop = new THREE.Color('#2dd4bf'); // Reflexo turquesa suave da Aurora Boreal nas nuvens!
  const _nightBelly = new THREE.Color('#1e1b4b'); // Azul índigo profundo da noite
  const _tmpTop = new THREE.Color();
  const _tmpBelly = new THREE.Color();

  return {
    group,
    update: (
      dt: number,
      elapsed: number,
      _playerSpeed: number,
      _isPlaying: boolean,
      sunsetMix = 0,
      nightMix = 0
    ) => {
      const sMix = THREE.MathUtils.clamp(sunsetMix, 0, 1);
      const nMix = THREE.MathUtils.clamp(nightMix, 0, 1);

      _tmpTop.copy(_dayTop).lerp(_sunsetTop, sMix).lerp(_nightTop, nMix * 0.72);
      _tmpBelly.copy(_dayBelly).lerp(_sunsetBelly, sMix).lerp(_nightBelly, nMix);

      cloudTopMat.color.copy(_tmpTop);
      cloudBellyMat.color.copy(_tmpBelly);
      cloudInkHullMat.opacity = THREE.MathUtils.lerp(0.28, 0.52, nMix);

      for (let i = 0; i < clusters.length; i++) {
        const cl = clusters[i];
        cl.baseX += cl.driftSpeed * dt;
        if (cl.baseX > 125) cl.baseX = -125;
        cl.root.position.x = cl.baseX;
        cl.root.position.y = cl.baseY + Math.sin(elapsed * 0.35 + i * 1.4) * 0.65;
      }
    },
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
  topRadius = 0.42,
  bottomRadius = 1.0,
  radialSegs = 18,
  heightSegs = 12,
  seed = 1.0,
  flattenTop = false,
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
    const fluteAtten = flattenTop ? 1.0 - smoothstepLocal(0.75, 1.0, hNorm) * 0.55 : 1.0;
    const flute1 = Math.sin(angle * 5.0 + seed * 1.7) * 0.14 * fluteAtten;
    const flute2 = Math.cos(angle * 9.0 - seed * 2.3 + hNorm * 2.2) * 0.08 * fluteAtten;
    const flute3 = Math.sin(angle * 14.0 + seed * 3.1 - hNorm * 3.5) * 0.04 * fluteAtten;
    const cliffStep = Math.sin(hNorm * 9.0 + angle * 3.0 + seed) * 0.045 * (1.0 - hNorm * 0.4);

    const crownProfile =
      hNorm > 0.76
        ? 1.0 - Math.pow((hNorm - 0.76) / 0.24, 1.45) * (flattenTop ? 0.14 : 0.24)
        : 1.0;
    const radialScale = (1.0 + flute1 + flute2 + flute3 + cliffStep) * crownProfile;

    x *= radialScale;
    z *= radialScale;

    if (y > 0.48) {
      const centerFactor = Math.max(0, 1.0 - rXZ / Math.max(0.05, topRadius));
      y += centerFactor * (flattenTop ? 0.016 : 0.038) + Math.sin(angle * 3.0 + seed) * 0.008;
    }

    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function smoothstepLocal(e0: number, e1: number, v: number): number {
  const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
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
      uLadeiraSlope: worldCurveUniforms.uLadeiraSlope,
      uRoadWindPhase: worldCurveUniforms.uRoadWindPhase,
      uSunsetOrangeMix: worldCurveUniforms.uSunsetOrangeMix,
      uNightDarknessMix: worldCurveUniforms.uNightDarknessMix,
      uHorizonFogColor: worldCurveUniforms.uHorizonFogColor,
      uHorizonFogSkyTint: worldCurveUniforms.uHorizonFogSkyTint,
      uSunDir: { value: new THREE.Vector3(-0.74, 0.46, 0.48).normalize() },
    },
    vertexShader: `
      uniform float uWorldCurveY;
      uniform float uWorldCurveX;
      uniform float uCurveStartZ;
      uniform float uLadeiraSlope;
      uniform float uRoadWindPhase;
      attribute vec3 aCragLocalPos;
      varying vec3 vWorldPos;
      varying vec3 vScaleCorrectedNormal;
      varying vec3 vLocalPos;

      void main() {
        vLocalPos = aCragLocalPos;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        vScaleCorrectedNormal = normalize(mat3(modelMatrix) * normal);

        // Apply world curvature in WORLD SPACE
        float curveDist = max(0.0, -(worldPosition.z - uCurveStartZ));
        float curveSq = curveDist * curveDist;
        float ladeiraBowl = 4.2 * smoothstep(14.0, 108.0, curveDist) * (1.0 - 0.14 * smoothstep(108.0, 175.0, curveDist));
        float sCurveNear = sin(curveDist * 0.032 + uRoadWindPhase) * 1.95 * smoothstep(16.0, 78.0, curveDist) * uLadeiraSlope;
        float sCurveFar = cos(curveDist * 0.016 - uRoadWindPhase * 0.65) * 1.45 * smoothstep(48.0, 165.0, curveDist) * uLadeiraSlope;
        worldPosition.y -= curveSq * uWorldCurveY * 0.16 + ladeiraBowl * uLadeiraSlope;
        worldPosition.x += curveSq * uWorldCurveX + sCurveNear + sCurveFar;

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
      ${GLSL_TROPICAL_CINEMATIC_GRADE}

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

        float effHeight = max(relHeight, localHeight);
        float upperCragZone = smoothstep(0.28, 0.62, effHeight) * smoothstep(0.22, 0.65, localHeight);
        float steepness = smoothstep(0.68, 0.25, abs(N.y));
        float verticalStriation = clamp((fluteWave * 0.5 + 0.5) * (fineCrag * 0.5 + 0.5) * 1.45, 0.0, 1.0);
        float rockMask = clamp(upperCragZone * steepness * (0.35 + 0.65 * verticalStriation), 0.0, 0.85);

        vec3 rockShadowBlue = vec3(0.240, 0.395, 0.520);
        vec3 rockMidGrey    = vec3(0.465, 0.595, 0.665);
        vec3 rockSunlitPale = vec3(0.765, 0.835, 0.865);
        vec3 rockCol = mix(rockShadowBlue, rockMidGrey, smoothstep(0.28, 0.58, lightMix));
        rockCol = mix(rockCol, rockSunlitPale, smoothstep(0.58, 0.86, lightMix));

        vec3 col = mix(forestCol, rockCol, rockMask);

        float leftRim = smoothstep(0.32, 0.82, clamp(-N.x * 0.72 + N.y * 0.45, 0.0, 1.0)) * smoothstep(0.2, 0.8, effHeight);
        col += vec3(0.11, 0.17, 0.13) * leftRim * 0.45;

        // Subtle atmospheric distance perspective haze
        vec3 coastalSkyHaze = vec3(0.46, 0.66, 0.83);
        float rightRidgeHaze = clamp((vWorldPos.x + 8.0) / 52.0, 0.0, 1.0) * 0.22;
        float shadowHaze = (1.0 - lightMix) * 0.18 + rightRidgeHaze + 0.06;
        col = mix(col, coastalSkyHaze, clamp(shadowHaze, 0.0, 0.36));

        // Single-pass soft black cartoon contour along crag silhouettes and internal rock creases
        vec3 V = normalize(cameraPosition - vWorldPos);
        float grazingSilhouette = 1.0 - abs(dot(smoothN, V));
        float ridgeCrease = clamp(length(fwidth(N)) * 2.2, 0.0, 1.0);
        float softBlackContour = clamp(
          smoothstep(0.52, 0.82, grazingSilhouette) * 0.58 +
          smoothstep(0.30, 0.80, ridgeCrease) * 0.28,
          0.0,
          0.62
        );
        col = applyTropicalCinematicGrade(col);
        col = mix(col, vec3(0.04, 0.06, 0.10), softBlackContour);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    fog: false,
  });
  curvedMaterialInstances.add(mat);
  mat.userData.hasWorldCurvature = true;
  return mat;
}

let sharedMountainTreeCutoutMat: THREE.ShaderMaterial | null = null;
function getSharedMountainTreeCutoutMat(maxAnisotropy = 4): THREE.ShaderMaterial {
  if (sharedMountainTreeCutoutMat) return sharedMountainTreeCutoutMat;
  const tex = createMountainTreeFoliageCutoutTexture(maxAnisotropy);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: tex },
      uWorldCurveY: worldCurveUniforms.uWorldCurveY,
      uWorldCurveX: worldCurveUniforms.uWorldCurveX,
      uCurveStartZ: worldCurveUniforms.uCurveStartZ,
      uLadeiraSlope: worldCurveUniforms.uLadeiraSlope,
      uRoadWindPhase: worldCurveUniforms.uRoadWindPhase,
      uSunsetOrangeMix: worldCurveUniforms.uSunsetOrangeMix,
      uNightDarknessMix: worldCurveUniforms.uNightDarknessMix,
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: `
      uniform float uWorldCurveY;
      uniform float uWorldCurveX;
      uniform float uCurveStartZ;
      uniform float uLadeiraSlope;
      uniform float uRoadWindPhase;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;

        float curveDist = max(0.0, -(wp.z - uCurveStartZ));
        float curveDistSq = curveDist * curveDist;
        float ladeiraBowl = 4.2 * smoothstep(14.0, 108.0, curveDist) * (1.0 - 0.14 * smoothstep(108.0, 175.0, curveDist));
        float sCurveNear = sin(curveDist * 0.032 + uRoadWindPhase) * 1.95 * smoothstep(16.0, 78.0, curveDist) * uLadeiraSlope;
        float sCurveFar = cos(curveDist * 0.016 - uRoadWindPhase * 0.65) * 1.45 * smoothstep(48.0, 165.0, curveDist) * uLadeiraSlope;
        wp.y -= uWorldCurveY * curveDistSq * 0.16 + ladeiraBowl * uLadeiraSlope;
        wp.x += uWorldCurveX * curveDistSq + sCurveNear + sCurveFar;

        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      ${GLSL_TROPICAL_CINEMATIC_GRADE}
      void main() {
        vec4 texel = texture2D(uMap, vUv);
        if (texel.a < 0.05) discard;
        vec3 coastalHaze = vec3(0.44, 0.65, 0.78);
        vec3 col = mix(texel.rgb, coastalHaze, 0.24);
        col = applyTropicalCinematicGrade(col);
        gl_FragColor = vec4(col, texel.a * 0.88);
      }
    `,
  });
  sharedMountainTreeCutoutMat = mat;
  return mat;
}

function buildMergedMountainTreeCutoutMesh(
  cards: ReadonlyArray<{
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    rotY?: number;
    rotZ?: number;
  }>,
): THREE.Mesh {
  const quadTemplate = new THREE.PlaneGeometry(1, 1, 2, 1);
  const vPerCard = quadTemplate.attributes.position.count;
  const idxTemplate = quadTemplate.index!.array;
  const iPerCard = idxTemplate.length;

  const totalVerts = cards.length * vPerCard;
  const totalIndices = cards.length * iPerCard;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices = new Uint16Array(totalIndices);

  const srcPos = quadTemplate.attributes.position;
  const srcNorm = quadTemplate.attributes.normal;
  const srcUv = quadTemplate.attributes.uv;

  const mat4 = new THREE.Matrix4();
  const normalMat = new THREE.Matrix3();
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();
  const posVec = new THREE.Vector3();
  const scaleVec = new THREE.Vector3();
  const vTmp = new THREE.Vector3();

  for (let c = 0; c < cards.length; c++) {
    const card = cards[c];
    euler.set(-0.08, card.rotY ?? 0, card.rotZ ?? 0);
    quat.setFromEuler(euler);
    posVec.set(card.x, card.y, card.z);
    scaleVec.set(card.w, card.h, 1.0);
    mat4.compose(posVec, quat, scaleVec);
    normalMat.getNormalMatrix(mat4);

    const vBase = c * vPerCard;
    for (let i = 0; i < vPerCard; i++) {
      vTmp.set(srcPos.getX(i), srcPos.getY(i), srcPos.getZ(i)).applyMatrix4(mat4);
      const outV = (vBase + i) * 3;
      positions[outV] = vTmp.x;
      positions[outV + 1] = vTmp.y;
      positions[outV + 2] = vTmp.z;

      vTmp.set(srcNorm.getX(i), srcNorm.getY(i), srcNorm.getZ(i)).applyMatrix3(normalMat).normalize();
      normals[outV] = vTmp.x;
      normals[outV + 1] = vTmp.y;
      normals[outV + 2] = vTmp.z;

      const outUv = (vBase + i) * 2;
      uvs[outUv] = srcUv.getX(i);
      uvs[outUv + 1] = srcUv.getY(i);
    }

    const iBase = c * iPerCard;
    for (let j = 0; j < iPerCard; j++) {
      indices[iBase + j] = vBase + idxTemplate[j];
    }
  }
  quadTemplate.dispose();

  const mergedGeo = new THREE.BufferGeometry();
  mergedGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  mergedGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  mergedGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  mergedGeo.setIndex(new THREE.BufferAttribute(indices, 1));

  const mesh = new THREE.Mesh(mergedGeo, getSharedMountainTreeCutoutMat());
  mesh.name = 'Merged_Mountain_Tree_PNG_Cutouts';
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return mesh;
}

/**
 * Builds the Optimized, Sculpted Realistic-Cartoon Coastal Mountain Massif:
 * - Uses `mergeMountainCragGeometries` to combine all 16 crag peaks & base apron slices into 1 single static BufferGeometry (1 draw call!).
 * - Uses optimized segment counts (18x12 / 16x10) and single-pass shader contour with zero transparent backface overdraw.
 * - Pristine natural summit peak without the statue as requested.
 */
const cristoSoapstoneMat = new THREE.MeshStandardMaterial({
  color: 0xf4f6f9,
  roughness: 0.48,
  metalness: 0.05,
  fog: false,
});
applyWorldCurvatureToMaterial(cristoSoapstoneMat);

const cristoPedestalStoneMat = new THREE.MeshStandardMaterial({
  color: 0xcbd5e1,
  roughness: 0.68,
  metalness: 0.05,
  fog: false,
});
applyWorldCurvatureToMaterial(cristoPedestalStoneMat);

const cristoLightBlackOutlineMat = new THREE.MeshBasicMaterial({
  color: 0x111827,
  side: THREE.BackSide,
  transparent: true,
  opacity: 0.86,
  fog: false,
});
cristoLightBlackOutlineMat.userData.skipColorGrade = true;
applyWorldCurvatureToMaterial(cristoLightBlackOutlineMat);

/**
 * Creates a vertex-normal-extruded BackSide material for a light black cartoon outline ("contorno leve preto")
 * on the 3D FBX Cristo Redentor mesh, including world horizon curvature.
 */
function createCristoFbxNormalOutlineMaterial(localNormalOffset: number): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uOutlineOffset: { value: localNormalOffset },
      uWorldCurveY: worldCurveUniforms.uWorldCurveY,
      uWorldCurveX: worldCurveUniforms.uWorldCurveX,
      uCurveStartZ: worldCurveUniforms.uCurveStartZ,
      uLadeiraSlope: worldCurveUniforms.uLadeiraSlope,
      uRoadWindPhase: worldCurveUniforms.uRoadWindPhase,
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: true,
    fog: false,
    vertexShader: `
      uniform float uOutlineOffset;
      uniform float uWorldCurveY;
      uniform float uWorldCurveX;
      uniform float uCurveStartZ;
      uniform float uLadeiraSlope;
      uniform float uRoadWindPhase;
      void main() {
        vec3 extruded = position + normalize(normal) * uOutlineOffset;
        vec4 worldPosition = modelMatrix * vec4(extruded, 1.0);
        float curveDist = max(0.0, -(worldPosition.z - uCurveStartZ));
        float curveSq = curveDist * curveDist;
        float ladeiraBowl = 4.2 * smoothstep(14.0, 108.0, curveDist) * (1.0 - 0.14 * smoothstep(108.0, 175.0, curveDist));
        float sCurveNear = sin(curveDist * 0.032 + uRoadWindPhase) * 1.95 * smoothstep(16.0, 78.0, curveDist) * uLadeiraSlope;
        float sCurveFar = cos(curveDist * 0.016 - uRoadWindPhase * 0.65) * 1.45 * smoothstep(48.0, 165.0, curveDist) * uLadeiraSlope;
        worldPosition.y -= curveSq * uWorldCurveY * 0.16 + ladeiraBowl * uLadeiraSlope;
        worldPosition.x += curveSq * uWorldCurveX + sCurveNear + sCurveFar;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      void main() {
        gl_FragColor = vec4(0.065, 0.085, 0.125, 0.88);
      }
    `,
  });
  curvedMaterialInstances.add(mat);
  mat.userData.hasWorldCurvature = true;
  return mat;
}

let cachedCristoFbxPromise: Promise<THREE.Group | null> | null = null;

function loadCristoRedentor3DFbxTemplate(): Promise<THREE.Group | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!cachedCristoFbxPromise) {
    const loader = new FBXLoader();
    cachedCristoFbxPromise = new Promise((resolve) => {
      loader.load(
        '/assets/cristo/cristo_redentor.fbx',
        (fbx) => resolve(fbx),
        undefined,
        () => resolve(null),
      );
    });
  }
  return cachedCristoFbxPromise;
}

/**
 * Builds the Corcovado Summit Pedestal + Loads the 3D Cristo Redentor FBX Model
 * (`/assets/cristo/cristo_redentor.fbx`) with a light black cartoon outline ("contorno leve preto")!
 */
function buildCristoRedentorSummitMonument(): THREE.Group {
  const monumentGroup = new THREE.Group();
  monumentGroup.name = 'Cristo_Redentor_Summit_Monument';

  const addPedestalPart = (
    geo: THREE.BufferGeometry,
    sx: number,
    sy: number,
    sz: number,
    py: number,
  ) => {
    const mesh = new THREE.Mesh(geo, cristoPedestalStoneMat);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(0, py, 0);
    mesh.userData.hasCartoonOutline = true;

    const hull = new THREE.Mesh(geo, cristoLightBlackOutlineMat);
    hull.scale.set(1.045, 1.035, 1.045);
    mesh.add(hull);

    monumentGroup.add(mesh);
  };

  // 2. Instant Fallback Statue & Pedestal (shown immediately and replaced seamlessly once the 3D FBX finishes loading)
  const fallbackStatue = new THREE.Group();
  fallbackStatue.name = 'Cristo_Fallback_Statue';
  const addPedestalToFallback = (
    geo: THREE.BufferGeometry,
    sx: number,
    sy: number,
    sz: number,
    py: number,
  ) => {
    const mesh = new THREE.Mesh(geo, cristoPedestalStoneMat);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(0, py, 0);
    mesh.userData.hasCartoonOutline = true;
    const hull = new THREE.Mesh(geo, cristoLightBlackOutlineMat);
    hull.scale.set(1.045, 1.035, 1.045);
    mesh.add(hull);
    fallbackStatue.add(mesh);
  };
  addPedestalToFallback(sharedGeos.cylinder, 4.8, 2.2, 4.2, 1.1);
  addPedestalToFallback(sharedGeos.cylinder, 3.2, 3.8, 2.9, 4.0);
  addPedestalToFallback(sharedGeos.unitBox, 4.6, 0.75, 4.2, 6.1);

  const addFallbackPart = (
    geo: THREE.BufferGeometry,
    sx: number,
    sy: number,
    sz: number,
    px: number,
    py: number,
    pz: number,
    rotZ = 0,
  ) => {
    const m = new THREE.Mesh(geo, cristoSoapstoneMat);
    m.scale.set(sx, sy, sz);
    m.position.set(px, py, pz);
    m.rotation.z = rotZ;
    m.userData.hasCartoonOutline = true;
    const h = new THREE.Mesh(geo, cristoLightBlackOutlineMat);
    h.scale.set(1.05, 1.04, 1.05);
    m.add(h);
    fallbackStatue.add(m);
  };
  addFallbackPart(sharedGeos.cylinder, 1.95, 7.2, 1.45, 0, 9.9, 0);
  addFallbackPart(sharedGeos.unitBox, 3.85, 6.4, 2.35, 0, 15.8, 0);
  addFallbackPart(sharedGeos.unitBox, 15.8, 1.85, 1.72, 0, 17.4, 0);
  addFallbackPart(sharedGeos.unitBox, 5.4, 2.35, 1.85, -4.4, 16.5, 0, 0.14);
  addFallbackPart(sharedGeos.unitBox, 5.4, 2.35, 1.85, 4.4, 16.5, 0, -0.14);
  addFallbackPart(sharedGeos.sphere, 1.42, 1.88, 1.48, 0, 21.0, 0.22);
  monumentGroup.add(fallbackStatue);

  // Subtle base terrace platform resting on the flattened Corcovado summit plateau
  addPedestalPart(sharedGeos.cylinder, 5.6, 1.4, 5.2, 0.7);

  // 3. Load the real 3D Cristo Redentor FBX model and mount it onto the summit plateau facing the spectators
  loadCristoRedentor3DFbxTemplate().then((fbxTemplate) => {
    if (!fbxTemplate) return;
    const clonedFbx = SkeletonUtils.clone(fbxTemplate) as THREE.Group;
    clonedFbx.updateMatrixWorld(true);

    // Measure raw bounding box to auto-scale and center the statue on top of the terrace (y = 1.35)
    const box = new THREE.Box3().setFromObject(clonedFbx);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const rawHeight = Math.max(0.001, size.y);
    const targetHeight = 21.6; // Full monument height (pedestal + statue) matching iconic Corcovado proportion
    const scaleFactor = targetHeight / rawHeight;

    // Subtle vertex-normal extrusion in raw geometry units (~1.1% of statue height = "contorno leve preto")
    const outlineMat = createCristoFbxNormalOutlineMaterial(rawHeight * 0.011);

    const meshesToOutline: THREE.Mesh[] = [];
    clonedFbx.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
        mesh.userData.hasCartoonOutline = true;

        // Upgrade material to bright soapstone while preserving any model texture or vertex colors
        const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const origMap = (origMat as THREE.MeshStandardMaterial)?.map || null;
        const hasVertexColors = Boolean(mesh.geometry?.attributes?.color);

        const stdMat = new THREE.MeshStandardMaterial({
          color: origMap ? 0xffffff : 0xf4f6f9,
          map: origMap,
          vertexColors: hasVertexColors,
          roughness: 0.44,
          metalness: 0.05,
          emissive: new THREE.Color(0x334155),
          emissiveIntensity: 0.16,
          fog: false,
        });
        applyWorldCurvatureToMaterial(stdMat);
        mesh.material = stdMat;
        meshesToOutline.push(mesh);
      }
    });

    // Attach light black BackSide outline mesh to each 3D mesh part
    for (const mesh of meshesToOutline) {
      if (mesh.geometry) {
        if (!mesh.geometry.attributes.normal) {
          mesh.geometry.computeVertexNormals();
        }
        const outlineChild = new THREE.Mesh(mesh.geometry, outlineMat);
        outlineChild.name = 'Cristo_Light_Black_Outline';
        outlineChild.frustumCulled = false;
        outlineChild.userData.hasCartoonOutline = true;
        mesh.add(outlineChild);
      }
    }

    const holder = new THREE.Group();
    holder.name = 'Cristo_3D_FBX_Holder';
    clonedFbx.scale.setScalar(scaleFactor);
    clonedFbx.position.set(
      -center.x * scaleFactor,
      1.35 - box.min.y * scaleFactor,
      -center.z * scaleFactor,
    );
    holder.add(clonedFbx);

    // Raw FBX has open arms along Z and face/chest along +X; rotate -90 deg around Y so face & open arms point directly at the spectators (+Z)
    holder.rotation.y = -Math.PI * 0.5;

    monumentGroup.remove(fallbackStatue);
    monumentGroup.add(holder);
  });

  return monumentGroup;
}

/**
 * Builds the Optimized, Sculpted Realistic-Cartoon Coastal Mountain Massif:
 * - Uses `mergeMountainCragGeometries` to combine all 16 crag peaks & base apron slices into 1 single static BufferGeometry (1 draw call!).
 * - Flattened Corcovado summit plateau topped with the 3D Cristo Redentor model (`/assets/cristo/cristo_redentor.fbx`) and light black cartoon outline.
 */
export function buildCorcovadoAndCristoRedentor(): THREE.Group {
  const vistaGroup = new THREE.Group();
  vistaGroup.name = 'Rio_Coastal_Mountain_Massif_Vista';

  const sceneryMountainMat = createMountainSceneryShaderMat();

  const cragGeoMain = createSculptedMountainCragGeo(0.54, 1.0, 18, 12, 1.2, true);
  const cragGeoTwin = createSculptedMountainCragGeo(0.36, 0.92, 16, 10, 2.5, false);
  const cragGeoSub = createSculptedMountainCragGeo(0.38, 1.04, 16, 10, 3.8, false);
  const apronGeo = createSculptedMountainCragGeo(0.42, 1.22, 16, 8, 5.1, false);

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

  // 2b. Distant 2D PNG Tree Cutout Clusters along the Lower Base & Lateral Flanks of the Mountain
  const mountainTreeCutoutMesh = buildMergedMountainTreeCutoutMesh([
    { x: -35.5, y: 10.2, z: 18.0, w: 16.5, h: 7.4, rotY: 0.16, rotZ: 0.08 },
    { x: -27.5, y: 11.8, z: 20.2, w: 17.5, h: 7.8, rotY: 0.12, rotZ: 0.06 },
    { x: -20.5, y: 9.0, z: 23.2, w: 19.5, h: 7.8, rotY: 0.05, rotZ: 0.02 },
    { x: -7.5, y: 9.4, z: 24.8, w: 21.0, h: 8.2, rotY: 0.0, rotZ: 0.0 },
    { x: 6.5, y: 9.2, z: 24.2, w: 20.0, h: 8.0, rotY: -0.04, rotZ: -0.02 },
    { x: 20.0, y: 8.8, z: 22.8, w: 18.5, h: 7.6, rotY: -0.08, rotZ: -0.03 },
    { x: 28.5, y: 11.2, z: 19.8, w: 17.0, h: 7.6, rotY: -0.12, rotZ: -0.06 },
    { x: 37.5, y: 9.8, z: 18.8, w: 16.5, h: 7.2, rotY: -0.16, rotZ: -0.05 },
    { x: 45.5, y: 8.6, z: 17.6, w: 15.8, h: 6.8, rotY: -0.20, rotZ: -0.04 },
  ]);
  vistaGroup.add(mountainTreeCutoutMesh);

  // 3. Place 3D Cristo Redentor Monument atop the flattened Corcovado summit plateau
  const cristoStatue = buildCristoRedentorSummitMonument();
  cristoStatue.scale.set(0.68, 0.68, 0.68);
  cristoStatue.position.set(-2.2, 42.4, 1.0);
  vistaGroup.add(cristoStatue);

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

    // Base arquitetônica em alvenaria de tijolinho colorido e vegetação tropical (substituindo paredes cinzas lisas!)
    const basePal = FAVELA_PALETTES[(variantIndex + tIdx * 2) % FAVELA_PALETTES.length];
    const retBrickTex = getFavelaHouseTexture(
      basePal.wall,
      basePal.trim,
      true,
      maxAnisotropy,
      variantIndex * 7 + tIdx * 3,
    );
    const retWallMat = new THREE.MeshStandardMaterial({
      map: retBrickTex,
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.03,
    });
    retWallMat.userData.isFavelaFadeMat = true;
    retWallMat.userData.isUpperFavelaTier = isUpperTier;

    const retWall = new THREE.Mesh(sharedGeos.unitBox, retWallMat);
    retWall.scale.set(3.5, 4.8, 15.2);
    retWall.position.set(outSign * tier.dist, tier.baseY - 2.4, 0);
    if (tIdx === 0) retWall.userData.occludableLowerTier = true;
    group.add(retWall);

    // Moldura superior creme/terracota do patamar + arbustos tropicais verdes na base
    const ledgeTrimMat = getFavelaRoofMat(basePal.trim).clone();
    ledgeTrimMat.userData.isFavelaFadeMat = true;
    ledgeTrimMat.userData.isUpperFavelaTier = isUpperTier;
    const ledgeCap = new THREE.Mesh(sharedGeos.unitBox, ledgeTrimMat);
    ledgeCap.scale.set(3.9, 0.34, 15.5);
    ledgeCap.position.set(outSign * tier.dist, tier.baseY - 0.08, 0);
    group.add(ledgeCap);

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

  // Item 10: Posiciona os 4 prédios cariocas cartoon um pouco mais ao fundo (z = -124 .. -136),
  // com alturas, larguras e ângulos variados, integrados naturalmente à frente das montanhas (z = -148)!
  const towerSpecs = [
    { x: -8.5, z: -128, baseY: 7.2, variant: 1, scale: 0.92, hMult: 0.96, rotY: 0.12 }, // Azul "PIZZARIA"
    { x: 5.2, z: -124, baseY: 7.4, variant: 0, scale: 0.96, hMult: 1.02, rotY: -0.08 }, // Amarelo Solar "BAR" + Bandeira do Brasil
    { x: 19.8, z: -126, baseY: 7.8, variant: 2, scale: 0.95, hMult: 1.0, rotY: -0.14 }, // Bege Art Déco "RIO" + Cristo
    { x: 33.8, z: -130, baseY: 8.2, variant: 3, scale: 0.94, hMult: 0.95, rotY: -0.18 }, // Verde & Coral "LANCHONETE" + Varal
    { x: 47.0, z: -135, baseY: 8.5, variant: 1, scale: 0.88, hMult: 0.9, rotY: -0.22 },
  ];

  for (let i = 0; i < towerSpecs.length; i++) {
    const spec = towerSpecs[i];
    const side: 'left' | 'right' = spec.x < 0 ? 'left' : 'right';
    const bldg = buildRioSkylineBuilding(spec.variant, side, maxAnisotropy);
    bldg.scale.set(spec.scale, spec.scale * spec.hMult, spec.scale);
    bldg.position.set(spec.x, spec.baseY, spec.z);
    bldg.rotation.y = spec.rotY;
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

/**
 * Domo de Céu Dinâmico 360° que transiciona suavemente entre Dia Tropical, Pôr do Sol Cinematográfico
 * e Noite Estrelada — mantendo as nuvens pinceladas suaves iluminadas pelo luar e pela Aurora Boreal!
 */
export function createDynamicSkyDomeMaterial(
  dayTex: THREE.Texture,
  sunsetTex: THREE.Texture
): {
  material: THREE.ShaderMaterial;
  setCycleWeights: (sunsetMix: number, nightMix: number, elapsed?: number) => void;
} {
  const uniforms = {
    uDayTex: { value: dayTex },
    uSunsetTex: { value: sunsetTex },
    uSunsetMix: { value: 0.0 },
    uNightMix: { value: 0.0 },
    uTime: { value: 0.0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vDir;
      void main() {
        vUv = uv;
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uDayTex;
      uniform sampler2D uSunsetTex;
      uniform float uSunsetMix;
      uniform float uNightMix;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vDir;

      void main() {
        vec2 skyUv = vec2(fract(vUv.x + uTime * 0.0016), vUv.y);
        vec3 dayCol = texture2D(uDayTex, skyUv).rgb;
        vec3 sunsetCol = texture2D(uSunsetTex, skyUv).rgb;
        vec3 baseSky = mix(dayCol, sunsetCol, clamp(uSunsetMix, 0.0, 1.0));

        // Gradiente de céu noturno profundo cinematográfico (horizonte índigo -> zênite meia-noite)
        float h = clamp(vDir.y * 1.35 + 0.12, 0.0, 1.0);
        vec3 nightHorizon = vec3(0.062, 0.112, 0.240);
        vec3 nightMid     = vec3(0.028, 0.055, 0.152);
        vec3 nightZenith  = vec3(0.010, 0.020, 0.072);
        vec3 nightSky = mix(nightHorizon, nightMid, smoothstep(0.0, 0.42, h));
        nightSky = mix(nightSky, nightZenith, smoothstep(0.38, 0.92, h));

        // Brilho atmosférico sutil da Aurora Boreal no alto da noite
        float auroraGlow = smoothstep(0.14, 0.52, h) * smoothstep(0.95, 0.42, h);
        nightSky += vec3(0.016, 0.078, 0.092) * auroraGlow;

        // Preserva as Nuvens Pinceladas Suaves também à noite (banhadas por luar prateado e reflexo boreal!)
        float brushCloudMask = smoothstep(0.34, 0.90, dayCol.r)
                             * smoothstep(0.01, 0.24, h)
                             * smoothstep(0.84, 0.34, h);
        vec3 moonlitBrushCloud = mix(
          vec3(0.13, 0.22, 0.38),
          vec3(0.24, 0.38, 0.56) + vec3(0.05, 0.16, 0.18) * auroraGlow,
          smoothstep(0.50, 0.95, dayCol.g)
        );
        nightSky = mix(nightSky, moonlitBrushCloud, brushCloudMask * 0.68);

        vec3 finalCol = mix(baseSky, nightSky, clamp(uNightMix, 0.0, 1.0));
        gl_FragColor = vec4(finalCol, 1.0);
      }
    `,
  });

  return {
    material,
    setCycleWeights: (sunsetMix: number, nightMix: number, elapsed = 0) => {
      uniforms.uSunsetMix.value = THREE.MathUtils.clamp(sunsetMix, 0, 1);
      uniforms.uNightMix.value = THREE.MathUtils.clamp(nightMix, 0, 1);
      uniforms.uTime.value = elapsed;
    },
  };
}

/**
 * Constrói o Céu Noturno Cinematográfico:
 * 1. Campo de 340 estrelas cintilantes (`THREE.Points`, 1 draw call).
 * 2. Lua cheia/crescente cartoon iluminada subindo no horizonte oposto ao sol.
 * 3. Cortinas ondulantes de AURORA BOREAL (verde-esmeralda, ciano, violeta e magenta) em GLSL!
 */
export function buildNightSkyStarsAndAurora(): {
  group: THREE.Group;
  update: (elapsed: number, nightOpacity: number, qualityMultiplier?: number) => void;
} {
  const group = new THREE.Group();
  group.name = 'Cinematic_Night_Stars_Moon_Aurora';
  group.visible = false;

  // 1. Campo de Estrelas Cintilantes (1 único draw call)
  const STAR_COUNT = 340;
  const starPositions = new Float32Array(STAR_COUNT * 3);
  const starColors = new Float32Array(STAR_COUNT * 3);
  const starPhases = new Float32Array(STAR_COUNT);
  const starSizes = new Float32Array(STAR_COUNT);

  const starPalette = [
    new THREE.Color('#ffffff'),
    new THREE.Color('#e0f2fe'),
    new THREE.Color('#fef08a'),
    new THREE.Color('#c4b5fd'),
    new THREE.Color('#99f6e4'),
  ];

  for (let i = 0; i < STAR_COUNT; i++) {
    // Distribui no hemisfério frontal/superior visível da câmera
    const theta = (Math.random() - 0.5) * Math.PI * 1.25; // ângulo horizontal amplo
    const elev = 0.14 + Math.random() * 0.78; // sempre acima do horizonte
    const radius = 195 + Math.random() * 25;

    const sx = Math.sin(theta) * Math.cos(elev) * radius;
    const sy = Math.sin(elev) * radius + 12.0;
    const sz = -Math.cos(theta) * Math.cos(elev) * radius - 18.0;

    starPositions[i * 3 + 0] = sx;
    starPositions[i * 3 + 1] = sy;
    starPositions[i * 3 + 2] = sz;

    const c = starPalette[i % starPalette.length];
    starColors[i * 3 + 0] = c.r;
    starColors[i * 3 + 1] = c.g;
    starColors[i * 3 + 2] = c.b;

    starPhases[i] = Math.random() * Math.PI * 2;
    starSizes[i] = 2.2 + Math.pow(Math.random(), 2.2) * 4.6;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));

  const sharedNightUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uQuality: { value: 1.0 },
  };

  const starMat = new THREE.ShaderMaterial({
    uniforms: sharedNightUniforms,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      uniform float uOpacity;
      attribute float aPhase;
      attribute float aSize;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vColor = color;
        vTwinkle = 0.52 + 0.48 * sin(uTime * (2.1 + mod(aPhase, 2.3)) + aPhase * 3.0);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (0.75 + 0.45 * vTwinkle) * (220.0 / max(40.0, -mvPos.z));
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        // Brilho estelar suave com pequeno reflexo em cruz
        float core = exp(-r * r * 7.5);
        float crossFlare = exp(-abs(p.x) * 12.0) * exp(-abs(p.y) * 2.6)
                         + exp(-abs(p.y) * 12.0) * exp(-abs(p.x) * 2.6);
        float alpha = clamp(core + crossFlare * 0.35, 0.0, 1.0) * vTwinkle * uOpacity;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
  });

  const starPoints = new THREE.Points(starGeo, starMat);
  starPoints.frustumCulled = false;
  group.add(starPoints);

  // 2. Lua Luminosa Cinematográfica no alto direito do céu noturno
  const moonMat = new THREE.ShaderMaterial({
    uniforms: sharedNightUniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float r = length(vUv);
        if (r > 1.0) discard;
        float disc = smoothstep(0.24, 0.215, r);
        // Sutil textura de crateras cartoon na superfície lunar
        float crater1 = smoothstep(0.08, 0.04, length(vUv - vec2(-0.06, 0.05))) * 0.14;
        float crater2 = smoothstep(0.06, 0.03, length(vUv - vec2(0.07, -0.04))) * 0.12;
        float halo = smoothstep(1.0, 0.20, r) * 0.38 + smoothstep(0.52, 0.21, r) * 0.42;
        vec3 moonCore = vec3(0.96, 0.99, 1.0) - vec3(crater1 + crater2);
        vec3 haloCol = vec3(0.45, 0.82, 0.98);
        vec3 col = mix(haloCol, moonCore, disc);
        float alpha = clamp(disc + halo, 0.0, 1.0) * uOpacity;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const moonQuad = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), moonMat);
  moonQuad.position.set(36.0, 74.0, -180.0);
  group.add(moonQuad);

  // 3. Cortinas Etéreas, Suaves e Fluidas de AURORA BOREAL Cinematográfica (3 véus de luz no céu!)
  const createCurvedAuroraRibbonGeo = (
    width: number,
    height: number,
    arcDepth: number,
    waveFreq: number
  ): THREE.BufferGeometry => {
    const geo = new THREE.PlaneGeometry(width, height, 96, 24);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const u = x / (width * 0.5); // -1 .. +1
      const v = y / height + 0.5; // 0 (base) .. 1 (topo)
      // Curva orgânica suave abraçando a abóbada celeste + inclinação magnética natural no topo
      const zCurve = -Math.cos(u * 1.28) * arcDepth + Math.sin(u * waveFreq) * 8.2 + v * -15.0;
      const yArch = Math.cos(u * 1.05) * 7.5 + Math.sin(u * 2.15) * 3.0;
      pos.setXYZ(i, x, y + yArch, zCurve);
    }
    geo.computeVertexNormals();
    return geo;
  };

  const auroraMat = new THREE.ShaderMaterial({
    uniforms: sharedNightUniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        // Movimento de seda calmo, fluido e hipnótico no vento solar
        float sway = sin(uv.x * 6.5 + uTime * 0.22) * 4.2
                   + cos(uv.x * 12.0 - uTime * 0.15) * 2.1;
        p.z += sway * (0.25 + 0.75 * uv.y);
        p.y += sin(uv.x * 4.8 - uTime * 0.18) * 1.6;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform float uQuality;
      varying vec2 vUv;

      void main() {
        if (uOpacity <= 0.005) discard;

        // Desbotamento lateral ultra-suave em sino (zero bordas retas!)
        float horizBell = pow(max(0.0, sin(vUv.x * 3.14159265)), 1.35);

        // Dobra orgânica serena na base luminosa da cortina boreal
        float baseFold = sin(vUv.x * 9.5 + uTime * 0.24) * 0.048
                       + cos(vUv.x * 17.5 - uTime * 0.17) * 0.025
                       + sin(vUv.x * 4.2 + uTime * 0.11) * 0.032;
        float yShifted = clamp(vUv.y + baseFold, 0.0, 1.0);

        // Perfil vertical aveludado: base brilhante suave que se dissolve em plumas altas no céu
        float softBottom = smoothstep(0.02, 0.28, yShifted);
        float softTopPlume = pow(max(0.0, 1.0 - smoothstep(0.14, 0.99, yShifted)), 1.85);
        float verticalVeil = softBottom * softTopPlume;

        // Raios magnéticos verticais sedosos e agradáveis (sem listras duras)
        float drift1 = sin(vUv.x * 6.0 + uTime * 0.19) * 2.4;
        float drift2 = cos(vUv.x * 9.0 - uTime * 0.14) * 1.8;
        float rayA = sin(vUv.x * 32.0 + drift1 - uTime * 0.34) * 0.5 + 0.5;
        float rayB = sin(vUv.x * 54.0 - drift2 + uTime * 0.26) * 0.5 + 0.5;
        float rayC = sin(vUv.x * 19.0 + uTime * 0.15) * 0.5 + 0.5;
        float silkyRays = mix(
          0.56,
          1.14,
          smoothstep(0.15, 0.92, rayA) * 0.45 +
          smoothstep(0.20, 0.95, rayB) * 0.30 +
          rayC * 0.25
        );

        // Paleta Cinematográfica Suave (igual à referência real):
        // Verde-Esmeralda luminoso na base -> Turquesa/Ciano no meio -> Lavanda/Violeta e Rosa suave nas pontas altas!
        vec3 emeraldBase   = vec3(0.16, 0.94, 0.56);
        vec3 aquaTurquoise = vec3(0.14, 0.84, 0.86);
        vec3 softViolet    = vec3(0.60, 0.34, 0.90);
        vec3 roseAurora    = vec3(0.86, 0.34, 0.70);

        float hueFlow = sin(vUv.x * 4.5 - uTime * 0.14) * 0.5 + 0.5;
        vec3 lowerCurtain = mix(emeraldBase, aquaTurquoise, hueFlow * 0.42);
        vec3 midCurtain   = mix(lowerCurtain, aquaTurquoise, smoothstep(0.16, 0.48, yShifted));
        vec3 upperPlume   = mix(softViolet, roseAurora, hueFlow * 0.55);
        vec3 auroraCol    = mix(midCurtain, upperPlume, smoothstep(0.36, 0.84, yShifted));

        float alpha = verticalVeil * silkyRays * horizBell * (0.52 + 0.20 * uQuality) * uOpacity;
        gl_FragColor = vec4(auroraCol * alpha, alpha);
      }
    `,
  });

  const ribbonPrimary = new THREE.Mesh(createCurvedAuroraRibbonGeo(270, 52, 26, 2.8), auroraMat);
  ribbonPrimary.position.set(0, 72.0, -150.0);
  ribbonPrimary.frustumCulled = false;
  group.add(ribbonPrimary);

  const ribbonSecondary = new THREE.Mesh(createCurvedAuroraRibbonGeo(235, 44, 20, 3.6), auroraMat);
  ribbonSecondary.position.set(-18, 86.0, -168.0);
  ribbonSecondary.rotation.z = 0.045;
  ribbonSecondary.frustumCulled = false;
  group.add(ribbonSecondary);

  const ribbonTertiary = new THREE.Mesh(createCurvedAuroraRibbonGeo(210, 40, 18, 2.3), auroraMat);
  ribbonTertiary.position.set(22, 81.0, -162.0);
  ribbonTertiary.rotation.z = -0.04;
  ribbonTertiary.frustumCulled = false;
  group.add(ribbonTertiary);

  return {
    group,
    update: (elapsed: number, nightOpacity: number, qualityMultiplier = 1.0) => {
      const op = THREE.MathUtils.clamp(nightOpacity, 0, 1);
      group.visible = op > 0.01;
      if (!group.visible) return;

      sharedNightUniforms.uTime.value = elapsed;
      sharedNightUniforms.uOpacity.value = op;
      sharedNightUniforms.uQuality.value = qualityMultiplier;

      // A Lua sobe suavemente enquanto a noite se aprofunda
      moonQuad.position.y = 28.0 + op * 48.0;
      ribbonSecondary.visible = qualityMultiplier >= 0.4;
      ribbonTertiary.visible = qualityMultiplier >= 0.65;
    },
  };
}

/**
 * Denominações oficiais das notas brasileiras espalhadas pelo mapa:
 * - R$ 10: Vermelha rosada
 * - R$ 50: Meio alaranjada
 * - R$ 100: Azulada
 * - R$ 200: Bordô (Mais rara — aparece com maior frequência no modo Difícil!)
 */
export type CashDenomination = 10 | 50 | 100 | 200;

interface CashPaletteSpec {
  outerFill: string;
  innerFill: string;
  darkAccent: string;
  cornerText: string;
  strapBorder: string;
  strapBg: string;
  strapText: string;
  sideColorHex: number;
  glowColorHex: number;
}

const CASH_PALETTES: Record<CashDenomination, CashPaletteSpec> = {
  10: {
    outerFill: '#fda4af',
    innerFill: '#f43f5e',
    darkAccent: '#9f1239',
    cornerText: '#ffe4e6',
    strapBorder: '#e11d48',
    strapBg: '#fff1f2',
    strapText: '#881337',
    sideColorHex: 0xe11d48,
    glowColorHex: 0xfb7185,
  },
  50: {
    outerFill: '#fdba74',
    innerFill: '#f97316',
    darkAccent: '#9a3412',
    cornerText: '#ffedd5',
    strapBorder: '#ea580c',
    strapBg: '#fffbeb',
    strapText: '#7c2d12',
    sideColorHex: 0xea580c,
    glowColorHex: 0xfb923c,
  },
  100: {
    outerFill: '#7dd3fc',
    innerFill: '#0ea5e9',
    darkAccent: '#075985',
    cornerText: '#e0f2fe',
    strapBorder: '#0284c7',
    strapBg: '#f0f9ff',
    strapText: '#0c4a6e',
    sideColorHex: 0x0284c7,
    glowColorHex: 0x38bdf8,
  },
  200: {
    outerFill: '#e11d48',
    innerFill: '#881337',
    darkAccent: '#4c0519',
    cornerText: '#fef08a',
    strapBorder: '#eab308',
    strapBg: '#fef9c3',
    strapText: '#881337',
    sideColorHex: 0x881337,
    glowColorHex: 0xbe123c,
  },
};

const cashStackTexCache = new Map<CashDenomination, THREE.CanvasTexture>();

function getCartoonBrazilianCashTexture(denomination: CashDenomination): THREE.CanvasTexture {
  const cached = cashStackTexCache.get(denomination);
  if (cached) return cached;

  const p = CASH_PALETTES[denomination] || CASH_PALETTES[50];
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 144;
  const ctx = canvas.getContext('2d')!;

  // Fundo externo da cédula na paleta brasileira correspondente
  ctx.fillStyle = p.outerFill;
  ctx.fillRect(0, 0, 256, 144);

  // Moldura interna escura cartoon
  ctx.strokeStyle = p.darkAccent;
  ctx.lineWidth = 9;
  ctx.strokeRect(14, 14, 228, 116);

  ctx.fillStyle = p.innerFill;
  ctx.fillRect(22, 22, 212, 100);

  // Detalhes circulares nos cantos e medalhão central
  ctx.fillStyle = p.darkAccent;
  for (const [cx, cy] of [
    [34, 34],
    [222, 34],
    [34, 110],
    [222, 110],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(58, 72, 12, 0, Math.PI * 2);
  ctx.arc(198, 72, 12, 0, Math.PI * 2);
  ctx.fill();

  // Medalhão central (com aro dourado especial na nota rara bordô de R$ 200!)
  ctx.beginPath();
  ctx.arc(128, 72, 32, 0, Math.PI * 2);
  ctx.fill();
  if (denomination === 200) {
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // Valor nítido nos cantos da cédula
  ctx.fillStyle = p.cornerText;
  ctx.font = '900 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${denomination}`, 62, 38);
  ctx.fillText(`${denomination}`, 194, 106);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cashStackTexCache.set(denomination, tex);
  return tex;
}

const cashStrapTexCache = new Map<CashDenomination, THREE.CanvasTexture>();

function getCartoonCashStrapTexture(denomination: CashDenomination): THREE.CanvasTexture {
  const cached = cashStrapTexCache.get(denomination);
  if (cached) return cached;

  const p = CASH_PALETTES[denomination] || CASH_PALETTES[50];
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = p.strapBorder;
  ctx.fillRect(0, 0, 128, 160);
  ctx.fillStyle = p.strapBg;
  ctx.fillRect(10, 0, 108, 160);

  ctx.fillStyle = p.strapText;
  ctx.font = '900 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 64, 64);

  ctx.font = '900 24px sans-serif';
  ctx.fillText(`R$${denomination}`, 64, 120);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cashStrapTexCache.set(denomination, tex);
  return tex;
}

interface CachedCashMatSet {
  billMaterials: THREE.Material[];
  strapMaterials: THREE.Material[];
  glowRingMat: THREE.MeshBasicMaterial;
}

const cashMatSetCache = new Map<CashDenomination, CachedCashMatSet>();
let sharedCashRingGeo: THREE.RingGeometry | null = null;

function getCashMatSet(denomination: CashDenomination): CachedCashMatSet {
  const cached = cashMatSetCache.get(denomination);
  if (cached) return cached;

  const p = CASH_PALETTES[denomination] || CASH_PALETTES[50];
  const sideMat = new THREE.MeshToonMaterial({ color: p.sideColorHex });
  const faceMat = new THREE.MeshToonMaterial({
    map: getCartoonBrazilianCashTexture(denomination),
    color: 0xffffff,
  });
  const strapTopMat = new THREE.MeshToonMaterial({
    map: getCartoonCashStrapTexture(denomination),
    color: 0xffffff,
  });
  const strapSideMat = new THREE.MeshToonMaterial({ color: p.strapBg });
  const glowRingMat = new THREE.MeshBasicMaterial({
    color: p.glowColorHex,
    transparent: true,
    opacity: denomination === 200 ? 0.56 : 0.44,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const set: CachedCashMatSet = {
    billMaterials: [sideMat, sideMat, faceMat, faceMat, sideMat, sideMat],
    strapMaterials: [strapSideMat, strapSideMat, strapTopMat, strapSideMat, strapSideMat, strapSideMat],
    glowRingMat,
  };
  cashMatSetCache.set(denomination, set);
  return set;
}

/**
 * Constrói o Maço 3D de Notas de Dinheiro Brasileiro Cartoon:
 * - R$ 10 (Vermelha rosada), R$ 50 (Alaranjada), R$ 100 (Azulada), R$ 200 (Bordô Rara!)
 */
export function buildCartoonCashStackMesh(denomination: CashDenomination = 50): THREE.Group {
  const root = new THREE.Group();
  root.name = `CartoonCashStack_${denomination}`;

  const matSet = getCashMatSet(denomination);
  if (!sharedCashRingGeo) {
    sharedCashRingGeo = new THREE.RingGeometry(0.32, 0.58, 20);
  }

  const shadow = new THREE.Mesh(sharedGeos.contactShadow, sharedMats.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(0.64, 0.64, 1);
  shadow.position.set(0, 0.018, 0);
  root.add(shadow);

  const glowRing = new THREE.Mesh(sharedCashRingGeo, matSet.glowRingMat);
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.set(0, 0.026, 0);
  glowRing.userData.noCartoonOutline = true;
  root.add(glowRing);

  const holder = new THREE.Group();
  holder.name = 'CashVisualSpinHolder';
  holder.position.set(0, 0.54, 0);
  holder.rotation.x = 0.44;
  holder.rotation.z = -0.16;
  if (denomination === 200) {
    // Leve destaque extra de escala na nota rara de R$ 200!
    holder.scale.setScalar(1.08);
  }

  const fanAngles = [-0.13, -0.02, 0.09];
  for (let i = 0; i < 3; i++) {
    const bill = new THREE.Mesh(sharedGeos.unitBox, matSet.billMaterials);
    bill.scale.set(0.88, 0.068, 0.50);
    bill.position.set(0, (i - 1) * 0.078, 0);
    bill.rotation.y = fanAngles[i];
    holder.add(bill);
  }

  const strap = new THREE.Mesh(sharedGeos.unitBox, matSet.strapMaterials);
  strap.scale.set(0.24, 0.255, 0.535);
  strap.position.set(0, 0, 0);
  strap.rotation.y = 0.02;
  holder.add(strap);

  addCartoonOutlinesToGroup(holder);
  root.add(holder);

  applyWorldCurvatureToGroup(root);
  return root;
}

/**
 * Geometria 3D Unificada de Nuvem de Fumaça Cartoon com Contorno Preto Embutido (1 Único Draw Call via InstancedMesh!):
 * Combina 3 lóbulos esféricos macios (cor de vértice clara cel-shaded) + casca externa inflada com normais/faces invertidas
 * (cor de vértice grafite/preta cartoon), permitindo desenhar dezenas de nuvens de fumaça cartoon no escapamento com ZERO custo extra!
 */
export function createCartoonSmokePuffGeometry(): THREE.BufferGeometry {
  const lobes = [
    { r: 0.095, x: 0.0, y: 0.0, z: 0.0 },
    { r: 0.072, x: 0.055, y: 0.032, z: -0.025 },
    { r: 0.068, x: -0.052, y: -0.018, z: 0.028 },
  ];

  const baseSpheres = lobes.map((l) => {
    const g = new THREE.IcosahedronGeometry(l.r, 1);
    g.translate(l.x, l.y, l.z);
    return g;
  });

  let singleVerts = 0;
  let singleIndices = 0;
  for (const g of baseSpheres) {
    const p = g.attributes.position;
    singleVerts += p.count;
    singleIndices += g.index ? g.index.count : p.count;
  }

  // Camada interna clara + Camada externa invertida preta (2x vértices e índices na mesma geometria)
  const totalVerts = singleVerts * 2;
  const totalIndices = singleIndices * 2;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 3);
  const indices = new Uint16Array(totalIndices);

  let vOff = 0;
  let iOff = 0;

  // 1ª Passada: Lóbulos brancos/creme da fumaça cartoon
  for (const g of baseSpheres) {
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const k = (vOff + i) * 3;
      positions[k + 0] = pos.getX(i);
      positions[k + 1] = pos.getY(i);
      positions[k + 2] = pos.getZ(i);

      normals[k + 0] = norm.getX(i);
      normals[k + 1] = norm.getY(i);
      normals[k + 2] = norm.getZ(i);

      // Branco quente / cinza perolado cartoon
      const shade = 0.94 + (pos.getY(i) > 0 ? 0.06 : -0.04);
      colors[k + 0] = shade;
      colors[k + 1] = shade;
      colors[k + 2] = Math.min(1.0, shade + 0.02);
    }

    if (g.index) {
      for (let j = 0; j < g.index.count; j++) {
        indices[iOff + j] = vOff + g.index.getX(j);
      }
      iOff += g.index.count;
    } else {
      for (let j = 0; j < pos.count; j++) {
        indices[iOff + j] = vOff + j;
      }
      iOff += pos.count;
    }
    vOff += pos.count;
  }

  // 2ª Passada: Casca externa inflada (+0.015m) com winding invertido para contorno preto cartoon!
  const outlineThickness = 0.015;
  for (const g of baseSpheres) {
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const k = (vOff + i) * 3;
      const nx = norm.getX(i);
      const ny = norm.getY(i);
      const nz = norm.getZ(i);

      positions[k + 0] = pos.getX(i) + nx * outlineThickness;
      positions[k + 1] = pos.getY(i) + ny * outlineThickness;
      positions[k + 2] = pos.getZ(i) + nz * outlineThickness;

      normals[k + 0] = -nx;
      normals[k + 1] = -ny;
      normals[k + 2] = -nz;

      // Borda grafite-escura cartoon
      colors[k + 0] = 0.11;
      colors[k + 1] = 0.12;
      colors[k + 2] = 0.15;
    }

    if (g.index) {
      for (let j = 0; j < g.index.count; j += 3) {
        indices[iOff + j + 0] = vOff + g.index.getX(j + 0);
        indices[iOff + j + 1] = vOff + g.index.getX(j + 2); // Winding invertido!
        indices[iOff + j + 2] = vOff + g.index.getX(j + 1);
      }
      iOff += g.index.count;
    } else {
      for (let j = 0; j < pos.count; j += 3) {
        indices[iOff + j + 0] = vOff + j + 0;
        indices[iOff + j + 1] = vOff + j + 2; // Winding invertido!
        indices[iOff + j + 2] = vOff + j + 1;
      }
      iOff += pos.count;
    }
    vOff += pos.count;
    g.dispose();
  }

  const outGeo = new THREE.BufferGeometry();
  outGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  outGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  outGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  outGeo.setIndex(new THREE.BufferAttribute(indices, 1));
  outGeo.computeBoundingSphere();
  return outGeo;
}

export interface CartoonManholeHazardRig {
  root: THREE.Group;
  warningRing: THREE.Mesh;
  exclamationGroup: THREE.Group;
  lidGroup: THREE.Group;
  geyserGroup: THREE.Group;
  coreColumn: THREE.Mesh;
  foamCrown: THREE.Mesh;
  baseSplashRing: THREE.Mesh;
  sideDroplets: THREE.Mesh[];
}

let cachedManholeShared: {
  rimGeo: THREE.CylinderGeometry;
  holeGeo: THREE.CircleGeometry;
  warnRingGeo: THREE.RingGeometry;
  lidGeo: THREE.CylinderGeometry;
  lidInnerGeo: THREE.CylinderGeometry;
  exclBarGeo: THREE.CylinderGeometry;
  exclDotGeo: THREE.SphereGeometry;
  coreWaterGeo: THREE.CylinderGeometry;
  outerWaterGeo: THREE.CylinderGeometry;
  plumeCardGeo: THREE.PlaneGeometry;
  puddlePlaneGeo: THREE.PlaneGeometry;
  crownFoamGeo: THREE.IcosahedronGeometry;
  dropletGeo: THREE.SphereGeometry;
  splashRingGeo: THREE.RingGeometry;
  ironDarkMat: THREE.MeshToonMaterial;
  ironLidMat: THREE.MeshToonMaterial;
  abyssMat: THREE.MeshBasicMaterial;
  warnRedMat: THREE.MeshBasicMaterial;
  exclRedMat: THREE.MeshToonMaterial;
  exclYellowMat: THREE.MeshBasicMaterial;
  waterCyanMat: THREE.MeshToonMaterial;
  waterRoyalMat: THREE.MeshToonMaterial;
  waterLightMat: THREE.MeshBasicMaterial;
  foamWhiteMat: THREE.MeshBasicMaterial;
  outlineBlackMat: THREE.MeshBasicMaterial;
  outlineWhiteMat: THREE.MeshBasicMaterial;
  plumeCutoutMat: THREE.MeshBasicMaterial;
  puddleCutoutMat: THREE.MeshBasicMaterial;
} | null = null;

function createCartoonGeyserPlumeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawPlumeArch = (
      startX: number,
      startY: number,
      cp1X: number,
      cp1Y: number,
      cp2X: number,
      cp2Y: number,
      endX: number,
      endY: number,
      baseWidth: number,
      tipRadius: number,
      curlDir: number,
    ) => {
      // 1. Contorno preto/azul-marinho grosso estilo HQ
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
      ctx.lineWidth = baseWidth + 18;
      ctx.strokeStyle = '#061229';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(endX, endY, tipRadius + 9, 0, Math.PI * 2);
      ctx.fillStyle = '#061229';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        endX + curlDir * (tipRadius * 0.65),
        endY + tipRadius * 0.55,
        tipRadius * 0.68 + 8,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#061229';
      ctx.fill();

      // 2. Corpo externo azul royal vibrante
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
      ctx.lineWidth = baseWidth;
      ctx.strokeStyle = '#0284c7';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(endX, endY, tipRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.fill();

      // 3. Camada intermediária azul ciano luminoso
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX - curlDir * 4, endY + 4);
      ctx.lineWidth = baseWidth * 0.64;
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();

      // 4. Crista de espuma branca na ponta curvada + filete central de espuma
      ctx.beginPath();
      ctx.arc(endX - curlDir * 3, endY - 4, tipRadius * 0.86, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        endX + curlDir * (tipRadius * 0.65),
        endY + tipRadius * 0.55,
        tipRadius * 0.64,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1X, cp1Y - 6, cp2X, cp2Y - 8, endX - curlDir * 4, endY - 4);
      ctx.lineWidth = baseWidth * 0.28;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();
    };

    // Plumas laterais inferiores (esquerda e direita)
    drawPlumeArch(246, 488, 210, 390, 130, 310, 82, 342, 42, 24, -1);
    drawPlumeArch(266, 488, 305, 390, 385, 305, 434, 336, 42, 24, 1);

    // Plumas médias (esquerda e direita)
    drawPlumeArch(250, 492, 215, 320, 145, 195, 96, 224, 52, 30, -1);
    drawPlumeArch(262, 492, 302, 315, 372, 185, 420, 212, 52, 30, 1);

    // Plumas superiores altas (centro-esquerda, topo-direito e topo-central)
    drawPlumeArch(252, 496, 232, 260, 180, 108, 148, 128, 58, 33, -1);
    drawPlumeArch(260, 496, 286, 250, 338, 95, 368, 118, 58, 33, 1);
    drawPlumeArch(256, 498, 252, 240, 258, 82, 286, 62, 68, 38, 1);
    drawPlumeArch(256, 498, 256, 255, 232, 86, 222, 68, 62, 36, -1);

    // Jorro branco central de alta pressão na base até o meio
    ctx.beginPath();
    ctx.moveTo(236, 498);
    ctx.quadraticCurveTo(248, 310, 238, 165);
    ctx.moveTo(256, 502);
    ctx.quadraticCurveTo(256, 290, 262, 120);
    ctx.moveTo(276, 498);
    ctx.quadraticCurveTo(268, 320, 288, 175);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Nuvens de espuma branca com contorno preto na base do jato
    const foamPuffs = [
      { x: 170, y: 472, r: 28 },
      { x: 205, y: 482, r: 24 },
      { x: 308, y: 482, r: 24 },
      { x: 344, y: 470, r: 29 },
      { x: 145, y: 484, r: 20 },
      { x: 368, y: 484, r: 20 },
    ];
    for (const p of foamPuffs) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 7, 0, Math.PI * 2);
      ctx.fillStyle = '#061229';
      ctx.fill();
    }
    for (const p of foamPuffs) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = '#e0f2fe';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x - 3, p.y - 4, p.r * 0.78, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    // Gotas cartoon em formato de lágrima com contorno preto e brilho branco
    const drawTeardrop = (x: number, y: number, angle: number, len: number, r: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.moveTo(0, -len);
      ctx.quadraticCurveTo(r + 6, 0, 0, r + 6);
      ctx.quadraticCurveTo(-r - 6, 0, 0, -len);
      ctx.fillStyle = '#061229';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -len + 6);
      ctx.quadraticCurveTo(r, 0, 0, r);
      ctx.quadraticCurveTo(-r, 0, 0, -len + 6);
      ctx.fillStyle = '#0284c7';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, r * 0.15, r * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(-r * 0.22, r * 0.25, r * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    };

    drawTeardrop(54, 272, 1.15, 42, 15);
    drawTeardrop(46, 365, 1.32, 46, 16);
    drawTeardrop(196, 48, 0.35, 38, 14);
    drawTeardrop(398, 52, -0.55, 38, 14);
    drawTeardrop(458, 258, -1.15, 42, 15);
    drawTeardrop(464, 358, -1.32, 46, 16);

    // Pontos de exclamação amarelos estilo HQ (! !) nas laterais superiores
    const drawComicExclamation = (x: number, y: number, angle: number, scale: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(scale, scale);

      // Barra trapezoidal com contorno preto grosso
      ctx.beginPath();
      ctx.moveTo(-14, -48);
      ctx.lineTo(14, -48);
      ctx.lineTo(7, 10);
      ctx.lineTo(-7, 10);
      ctx.closePath();
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#061229';
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.fill();

      // Ponto inferior
      ctx.beginPath();
      ctx.arc(0, 30, 9, 0, Math.PI * 2);
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#061229';
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.fill();

      ctx.restore();
    };

    drawComicExclamation(78, 172, -0.58, 0.92);
    drawComicExclamation(114, 148, -0.25, 0.76);
    drawComicExclamation(422, 146, 0.32, 0.92);
    drawComicExclamation(452, 174, 0.65, 0.74);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCartoonGeyserPuddleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    const blobs = [
      { x: 128, y: 128, rx: 92, ry: 68 },
      { x: 64, y: 118, rx: 48, ry: 32 },
      { x: 192, y: 134, rx: 46, ry: 30 },
      { x: 96, y: 168, rx: 45, ry: 26 },
      { x: 164, y: 92, rx: 42, ry: 25 },
    ];
    // Contorno escuro da poça no asfalto
    ctx.fillStyle = '#061229';
    for (const b of blobs) {
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.rx + 7, b.ry + 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Azul royal da poça
    ctx.fillStyle = '#0284c7';
    for (const b of blobs) {
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Reflexo ciano interno
    ctx.fillStyle = '#38bdf8';
    for (const b of blobs) {
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - 2, b.rx * 0.72, b.ry * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Anéis de espuma branca ao redor do bueiro
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(128, 128, 56, 42, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Constrói a Tampa de Bueiro Explosiva Cartoon na rua:
 * - Antes de estourar: tampa de ferro no asfalto + anel vermelho + Ponto de Exclamação (!) vermelho 3D pulsando acima!
 * - Quando o jogador se aproxima: a tampa voa girando pros ares e um jato de água cartoon estilizado jorra alto com arcos de espuma, gotículas e sinais de impacto!
 */
export function buildCartoonManholeHazard(): CartoonManholeHazardRig {
  if (!cachedManholeShared) {
    const rimGeo = new THREE.CylinderGeometry(0.68, 0.72, 0.045, 20);
    const holeGeo = new THREE.CircleGeometry(0.58, 20);
    holeGeo.rotateX(-Math.PI / 2);

    const warnRingGeo = new THREE.RingGeometry(0.74, 0.92, 24);
    warnRingGeo.rotateX(-Math.PI / 2);

    const lidGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.055, 18);
    const lidInnerGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.068, 14);

    // Ponto de Exclamação 3D Vermelho Cartoon (!)
    const exclBarGeo = new THREE.CylinderGeometry(0.135, 0.075, 0.68, 10);
    const exclDotGeo = new THREE.SphereGeometry(0.125, 10, 8);

    // Coluna central 3D afunilada na base e abrindo no topo (formato chafariz cartoon)
    const coreWaterGeo = new THREE.CylinderGeometry(0.46, 0.24, 0.95, 14, 1, true);
    coreWaterGeo.translate(0, 0.475, 0);

    const outerWaterGeo = new THREE.CylinderGeometry(0.62, 0.30, 0.88, 12, 1, true);
    outerWaterGeo.translate(0, 0.44, 0);

    // Painel ilustrado HQ com pivô na base (y = 0 -> y = 1.18)
    const plumeCardGeo = new THREE.PlaneGeometry(2.65, 1.22);
    plumeCardGeo.translate(0, 0.58, 0);

    const puddlePlaneGeo = new THREE.PlaneGeometry(3.4, 2.5);
    puddlePlaneGeo.rotateX(-Math.PI / 2);

    const crownFoamGeo = new THREE.IcosahedronGeometry(0.36, 1);
    const dropletGeo = new THREE.SphereGeometry(0.125, 10, 8);
    dropletGeo.scale(0.82, 1.45, 0.82);

    const splashRingGeo = new THREE.RingGeometry(0.32, 0.96, 20);
    splashRingGeo.rotateX(-Math.PI / 2);

    const plumeTex = createCartoonGeyserPlumeTexture();
    const puddleTex = createCartoonGeyserPuddleTexture();

    cachedManholeShared = {
      rimGeo,
      holeGeo,
      warnRingGeo,
      lidGeo,
      lidInnerGeo,
      exclBarGeo,
      exclDotGeo,
      coreWaterGeo,
      outerWaterGeo,
      plumeCardGeo,
      puddlePlaneGeo,
      crownFoamGeo,
      dropletGeo,
      splashRingGeo,
      ironDarkMat: new THREE.MeshToonMaterial({ color: 0x1e293b }),
      ironLidMat: new THREE.MeshToonMaterial({ color: 0x475569 }),
      abyssMat: new THREE.MeshBasicMaterial({ color: 0x090d16 }),
      warnRedMat: new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
      exclRedMat: new THREE.MeshToonMaterial({
        color: 0xff1e27,
        emissive: new THREE.Color(0x991b1b),
        emissiveIntensity: 0.45,
      }),
      exclYellowMat: new THREE.MeshBasicMaterial({
        color: 0xfacc15,
      }),
      waterCyanMat: new THREE.MeshToonMaterial({
        color: 0x38bdf8,
        emissive: new THREE.Color(0x0284c7),
        emissiveIntensity: 0.42,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      }),
      waterRoyalMat: new THREE.MeshToonMaterial({
        color: 0x0284c7,
        emissive: new THREE.Color(0x0369a1),
        emissiveIntensity: 0.35,
        side: THREE.DoubleSide,
      }),
      waterLightMat: new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      }),
      foamWhiteMat: new THREE.MeshBasicMaterial({
        color: 0xffffff,
      }),
      outlineBlackMat: new THREE.MeshBasicMaterial({
        color: 0x061229,
        side: THREE.BackSide,
      }),
      outlineWhiteMat: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.BackSide,
      }),
      plumeCutoutMat: new THREE.MeshBasicMaterial({
        map: plumeTex,
        transparent: true,
        alphaTest: 0.08,
        side: THREE.DoubleSide,
      }),
      puddleCutoutMat: new THREE.MeshBasicMaterial({
        map: puddleTex,
        transparent: true,
        alphaTest: 0.06,
        depthWrite: false,
      }),
    };
  }

  const s = cachedManholeShared;
  const root = new THREE.Group();
  root.name = 'CartoonManholeHazard';

  // 1. Aro metálico fixo no asfalto + buraco escuro do bueiro
  const rimMesh = new THREE.Mesh(s.rimGeo, s.ironDarkMat);
  rimMesh.position.y = 0.022;
  const rimOutline = new THREE.Mesh(s.rimGeo, s.outlineBlackMat);
  rimOutline.scale.set(1.06, 1.18, 1.06);
  rimMesh.add(rimOutline);
  root.add(rimMesh);

  const holeMesh = new THREE.Mesh(s.holeGeo, s.abyssMat);
  holeMesh.position.y = 0.046;
  root.add(holeMesh);

  // 2. Anel vermelho de alerta pulsando no chão
  const warningRing = new THREE.Mesh(s.warnRingGeo, s.warnRedMat);
  warningRing.position.y = 0.03;
  root.add(warningRing);

  // 3. Tampa de ferro destacável que voa pros ares quando estoura!
  const lidGroup = new THREE.Group();
  lidGroup.position.set(0, 0.052, 0);
  const lidMain = new THREE.Mesh(s.lidGeo, s.ironLidMat);
  const lidHull = new THREE.Mesh(s.lidGeo, s.outlineBlackMat);
  lidHull.scale.set(1.06, 1.22, 1.06);
  lidMain.add(lidHull);
  lidGroup.add(lidMain);

  const lidCenter = new THREE.Mesh(s.lidInnerGeo, s.ironDarkMat);
  lidGroup.add(lidCenter);
  root.add(lidGroup);

  // 4. Ponto de Exclamação Vermelho Cartoon (!) flutuando acima da tampa
  const exclamationGroup = new THREE.Group();
  exclamationGroup.position.set(0, 1.55, 0);

  const barMesh = new THREE.Mesh(s.exclBarGeo, s.exclRedMat);
  barMesh.position.y = 0.24;
  const barWhiteHull = new THREE.Mesh(s.exclBarGeo, s.outlineWhiteMat);
  barWhiteHull.scale.set(1.18, 1.06, 1.18);
  const barBlackHull = new THREE.Mesh(s.exclBarGeo, s.outlineBlackMat);
  barBlackHull.scale.set(1.34, 1.12, 1.34);
  barMesh.add(barWhiteHull, barBlackHull);
  exclamationGroup.add(barMesh);

  const dotMesh = new THREE.Mesh(s.exclDotGeo, s.exclRedMat);
  dotMesh.position.y = -0.28;
  const dotWhiteHull = new THREE.Mesh(s.exclDotGeo, s.outlineWhiteMat);
  dotWhiteHull.scale.setScalar(1.18);
  const dotBlackHull = new THREE.Mesh(s.exclDotGeo, s.outlineBlackMat);
  dotBlackHull.scale.setScalar(1.34);
  dotMesh.add(dotWhiteHull, dotBlackHull);
  exclamationGroup.add(dotMesh);

  root.add(exclamationGroup);

  // 5. Jato de Água Cartoon/HQ 100% 3D Animado (sem PNG estático! Coluna de água viva + jatos curvos 3D + anéis ascendentes + 28 gotas voando!)
  const geyserGroup = new THREE.Group();
  geyserGroup.visible = false;

  const coreColumn = new THREE.Mesh(s.coreWaterGeo, s.waterCyanMat);
  const outerColumn = new THREE.Mesh(s.outerWaterGeo, s.waterLightMat);
  const columnBlackOutline = new THREE.Mesh(s.outerWaterGeo, s.outlineBlackMat);
  columnBlackOutline.scale.set(1.15, 1.02, 1.15);
  coreColumn.add(outerColumn, columnBlackOutline);

  // Jatos laterais curvos em 3D (mesmo formato de chafariz cartoon, porém 100% 3D com volume e animação real!)
  for (let p = 0; p < 6; p++) {
    const pAngle = (p / 6) * Math.PI * 2;
    const plumePivot = new THREE.Group();
    plumePivot.rotation.y = pAngle;

    const streamJet = new THREE.Mesh(
      s.coreWaterGeo,
      p % 2 === 0 ? s.waterRoyalMat : s.waterCyanMat,
    );
    streamJet.scale.set(0.38, 0.78 + (p % 2) * 0.14, 0.38);
    streamJet.position.set(0.16, 0.08, 0);
    streamJet.rotation.z = -0.34 - (p % 2) * 0.08;
    const streamOut = new THREE.Mesh(s.coreWaterGeo, s.outlineBlackMat);
    streamOut.scale.set(1.22, 1.04, 1.22);
    streamJet.add(streamOut);

    // Crista de espuma branca na ponta de cada jato curvo lateral
    const curlTip = new THREE.Mesh(s.crownFoamGeo, s.foamWhiteMat);
    curlTip.scale.set(0.58, 0.48, 0.58);
    curlTip.position.set(0.42, 0.72 + (p % 2) * 0.12, 0);
    const curlTipOut = new THREE.Mesh(s.crownFoamGeo, s.outlineBlackMat);
    curlTipOut.scale.setScalar(1.22);
    curlTip.add(curlTipOut);

    plumePivot.add(streamJet, curlTip);
    coreColumn.add(plumePivot);
  }

  // Filetes verticais brancos de espuma subindo pela coluna 3D
  for (let f = 0; f < 4; f++) {
    const fAng = (f / 4) * Math.PI * 2 + 0.4;
    const foamStreak = new THREE.Mesh(s.exclBarGeo, s.foamWhiteMat);
    foamStreak.scale.set(0.65, 1.18, 0.65);
    foamStreak.position.set(Math.cos(fAng) * 0.28, 0.52, Math.sin(fAng) * 0.28);
    foamStreak.rotation.z = -Math.cos(fAng) * 0.16;
    foamStreak.rotation.x = Math.sin(fAng) * 0.16;
    coreColumn.add(foamStreak);
  }

  geyserGroup.add(coreColumn);

  // Crista superior de espuma branca e azul com contornos pretos marcantes
  const foamCrown = new THREE.Mesh(s.crownFoamGeo, s.foamWhiteMat);
  const crownOutline = new THREE.Mesh(s.crownFoamGeo, s.outlineBlackMat);
  crownOutline.scale.setScalar(1.16);
  foamCrown.add(crownOutline);

  for (let c = 0; c < 8; c++) {
    const ang = (c / 8) * Math.PI * 2 + 0.35;
    const subPuff = new THREE.Mesh(
      s.crownFoamGeo,
      c % 2 === 0 ? s.foamWhiteMat : s.waterCyanMat,
    );
    subPuff.scale.setScalar(0.64 + (c % 2) * 0.18);
    subPuff.position.set(
      Math.cos(ang) * 0.38,
      -0.14 + (c % 2) * 0.2,
      Math.sin(ang) * 0.38,
    );
    const subOut = new THREE.Mesh(s.crownFoamGeo, s.outlineBlackMat);
    subOut.scale.setScalar(1.18);
    subPuff.add(subOut);
    foamCrown.add(subPuff);
  }
  geyserGroup.add(foamCrown);

  // Poça de água cartoon no asfalto + anel de espuma e tufos de espuma 3D na base
  const baseSplashRing = new THREE.Mesh(s.splashRingGeo, s.foamWhiteMat);
  baseSplashRing.position.y = 0.055;
  const baseSplashOut = new THREE.Mesh(s.splashRingGeo, s.outlineBlackMat);
  baseSplashOut.scale.set(1.08, 1.08, 1.08);
  baseSplashOut.position.y = -0.005;
  baseSplashRing.add(baseSplashOut);

  const puddleMesh = new THREE.Mesh(s.puddlePlaneGeo, s.puddleCutoutMat);
  puddleMesh.position.y = -0.018;
  baseSplashRing.add(puddleMesh);

  // Nuvens de espuma 3D contornadas ao redor da boca do bueiro
  for (let b = 0; b < 8; b++) {
    const bAng = (b / 8) * Math.PI * 2;
    const radius = 0.64 + (b % 2) * 0.14;
    const basePuff = new THREE.Mesh(
      s.crownFoamGeo,
      b % 3 === 0 ? s.waterLightMat : s.foamWhiteMat,
    );
    const puffScale = 0.38 + (b % 2) * 0.12;
    basePuff.scale.set(puffScale * 1.15, puffScale * 0.85, puffScale * 1.15);
    basePuff.position.set(Math.cos(bAng) * radius, 0.11, Math.sin(bAng) * radius);
    const puffOut = new THREE.Mesh(s.crownFoamGeo, s.outlineBlackMat);
    puffOut.scale.setScalar(1.22);
    basePuff.add(puffOut);
    baseSplashRing.add(basePuff);
  }
  geyserGroup.add(baseSplashRing);

  // 28 Gotas 3D em formato de lágrima com contorno preto grosso e ponto de brilho branco voando continuamente!
  const sideDroplets: THREE.Mesh[] = [];
  for (let i = 0; i < 28; i++) {
    const dropMat =
      i % 3 === 0 ? s.foamWhiteMat : i % 3 === 1 ? s.waterCyanMat : s.waterRoyalMat;
    const drop = new THREE.Mesh(s.dropletGeo, dropMat);
    const sizeMult = i < 8 ? 1.48 : i < 18 ? 1.12 : 0.82;
    drop.userData.baseSizeMult = sizeMult;
    drop.userData.speedMult = 1.85 + (i % 5) * 0.34;
    drop.userData.radialSpread = 1.35 + (i % 4) * 0.48;
    drop.userData.heightMult = 0.72 + (i % 3) * 0.24;
    drop.userData.phaseSeed = (i / 28) + (i % 7) * 0.09;
    const dOut = new THREE.Mesh(s.dropletGeo, s.outlineBlackMat);
    dOut.scale.setScalar(1.26);
    const specDot = new THREE.Mesh(s.exclDotGeo, s.foamWhiteMat);
    specDot.scale.setScalar(0.34);
    specDot.position.set(-0.035, 0.04, 0.075);
    drop.add(dOut, specDot);
    geyserGroup.add(drop);
    sideDroplets.push(drop);
  }

  root.add(geyserGroup);
  applyWorldCurvatureToGroup(root);

  return {
    root,
    warningRing,
    exclamationGroup,
    lidGroup,
    geyserGroup,
    coreColumn,
    foamCrown,
    baseSplashRing,
    sideDroplets,
  };
}

// ============================================================================
// NOVOS ATIVOS 3D CARTOON: OSSO BRANCO, CARNE VERMELHA E INDICADOR DE ATAQUE
// ============================================================================
interface SharedDogCollectibleResources {
  boneShaftGeo: THREE.CylinderGeometry;
  boneKnobGeo: THREE.SphereGeometry;
  boneWhiteMat: THREE.MeshToonMaterial;
  boneShadowRingGeo: THREE.RingGeometry;
  boneShadowRingMat: THREE.MeshBasicMaterial;
  meatBodyGeo: THREE.CylinderGeometry;
  meatFatRimGeo: THREE.CylinderGeometry;
  meatMarrowBoneGeo: THREE.CylinderGeometry;
  meatMarrowCoreGeo: THREE.CylinderGeometry;
  meatRubyMat: THREE.MeshToonMaterial;
  meatCreamFatMat: THREE.MeshToonMaterial;
  meatMarrowPinkMat: THREE.MeshToonMaterial;
  meatAuraRingGeo: THREE.RingGeometry;
  meatAuraRingMat: THREE.MeshBasicMaterial;
  outlineBlackMat: THREE.MeshBasicMaterial;
  warnBadgeGeo: THREE.BoxGeometry;
  warnBarGeo: THREE.CylinderGeometry;
  warnDotGeo: THREE.SphereGeometry;
  warnFangGeo: THREE.ConeGeometry;
  warnYellowMat: THREE.MeshBasicMaterial;
  warnRedMat: THREE.MeshBasicMaterial;
  warnWhiteMat: THREE.MeshBasicMaterial;
}

let _sharedDogCollectibleRes: SharedDogCollectibleResources | null = null;

function getSharedDogCollectibleRes(): SharedDogCollectibleResources {
  if (_sharedDogCollectibleRes) return _sharedDogCollectibleRes;

  const boneShaftGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.56, 10);
  boneShaftGeo.rotateZ(Math.PI * 0.5);

  const boneKnobGeo = new THREE.SphereGeometry(0.118, 10, 8);

  const boneWhiteMat = new THREE.MeshToonMaterial({
    color: 0xfefce8,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.22,
  });

  const boneShadowRingGeo = new THREE.RingGeometry(0.16, 0.38, 18);
  boneShadowRingGeo.rotateX(-Math.PI * 0.5);
  const boneShadowRingMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.52,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Carne Vermelha suculenta estilo desenho animado (bife alto marmorizado c/ osso central!)
  const meatBodyGeo = new THREE.CylinderGeometry(0.36, 0.38, 0.19, 14);
  meatBodyGeo.scale(1.22, 1.0, 0.88);

  const meatFatRimGeo = new THREE.CylinderGeometry(0.395, 0.41, 0.15, 14);
  meatFatRimGeo.scale(1.22, 1.0, 0.88);

  const meatMarrowBoneGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.215, 12);
  const meatMarrowCoreGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.225, 10);

  const meatRubyMat = new THREE.MeshToonMaterial({
    color: 0xdc2626,
    emissive: 0x991b1b,
    emissiveIntensity: 0.28,
  });

  const meatCreamFatMat = new THREE.MeshToonMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 0.18,
  });

  const meatMarrowPinkMat = new THREE.MeshToonMaterial({
    color: 0xfca5a5,
  });

  const meatAuraRingGeo = new THREE.RingGeometry(0.32, 0.58, 22);
  meatAuraRingGeo.rotateX(-Math.PI * 0.5);
  const meatAuraRingMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const outlineBlackMat = new THREE.MeshBasicMaterial({
    color: 0x110c08,
    side: THREE.BackSide,
  });

  const warnBadgeGeo = new THREE.BoxGeometry(0.46, 0.46, 0.08);
  warnBadgeGeo.rotateZ(Math.PI * 0.25); // Losango cômico estilo quadrinhos!
  const warnBarGeo = new THREE.CylinderGeometry(0.058, 0.036, 0.24, 8);
  const warnDotGeo = new THREE.SphereGeometry(0.052, 8, 8);
  const warnFangGeo = new THREE.ConeGeometry(0.055, 0.14, 6);

  const warnYellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const warnRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const warnWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  _sharedDogCollectibleRes = {
    boneShaftGeo,
    boneKnobGeo,
    boneWhiteMat,
    boneShadowRingGeo,
    boneShadowRingMat,
    meatBodyGeo,
    meatFatRimGeo,
    meatMarrowBoneGeo,
    meatMarrowCoreGeo,
    meatRubyMat,
    meatCreamFatMat,
    meatMarrowPinkMat,
    meatAuraRingGeo,
    meatAuraRingMat,
    outlineBlackMat,
    warnBadgeGeo,
    warnBarGeo,
    warnDotGeo,
    warnFangGeo,
    warnYellowMat,
    warnRedMat,
    warnWhiteMat,
  };
  return _sharedDogCollectibleRes;
}

/**
 * Constrói um Osso Branco 3D Cartoon (com contorno preto e halo dourado suave no asfalto)
 * para substituir as cédulas de dinheiro quando jogando no Modo Caramelo!
 */
export function buildCartoonWhiteBoneMesh(): { root: THREE.Group; spinVisual: THREE.Group } {
  const res = getSharedDogCollectibleRes();
  const root = new THREE.Group();
  root.name = 'CartoonWhiteBone';

  const groundHalo = new THREE.Mesh(res.boneShadowRingGeo, res.boneShadowRingMat);
  groundHalo.position.y = 0.04;
  root.add(groundHalo);

  const spinVisual = new THREE.Group();
  spinVisual.position.y = 0.56;
  spinVisual.rotation.z = 0.22;

  const shaft = new THREE.Mesh(res.boneShaftGeo, res.boneWhiteMat);
  const shaftOut = new THREE.Mesh(res.boneShaftGeo, res.outlineBlackMat);
  shaftOut.scale.set(1.04, 1.24, 1.24);
  shaft.add(shaftOut);
  spinVisual.add(shaft);

  const knobOffsets: Array<[number, number, number]> = [
    [-0.27, 0.065, 0.035],
    [-0.27, -0.065, -0.035],
    [0.27, 0.065, -0.035],
    [0.27, -0.065, 0.035],
  ];
  for (let i = 0; i < knobOffsets.length; i++) {
    const [kx, ky, kz] = knobOffsets[i];
    const knob = new THREE.Mesh(res.boneKnobGeo, res.boneWhiteMat);
    knob.position.set(kx, ky, kz);
    const knobOut = new THREE.Mesh(res.boneKnobGeo, res.outlineBlackMat);
    knobOut.scale.setScalar(1.18);
    knob.add(knobOut);
    spinVisual.add(knob);
  }

  root.add(spinVisual);
  applyWorldCurvatureToGroup(root);
  return { root, spinVisual };
}

/**
 * Constrói uma Peça Suculenta de Carne Vermelha 3D Cartoon (bife grosso com borda creme e osso branco central)
 * espalhada estrategicamente pela rua no Modo Caramelo para recuperar Estamina + Turbo!
 */
export function buildCartoonMeatMesh(): { root: THREE.Group; spinVisual: THREE.Group } {
  const res = getSharedDogCollectibleRes();
  const root = new THREE.Group();
  root.name = 'CartoonRedMeat';

  const aura = new THREE.Mesh(res.meatAuraRingGeo, res.meatAuraRingMat);
  aura.position.y = 0.045;
  root.add(aura);

  const spinVisual = new THREE.Group();
  spinVisual.position.y = 0.62;
  spinVisual.rotation.x = 0.36;
  spinVisual.rotation.z = -0.18;

  // Borda de gordura creme + contorno preto externo
  const fatRim = new THREE.Mesh(res.meatFatRimGeo, res.meatCreamFatMat);
  const fatOut = new THREE.Mesh(res.meatFatRimGeo, res.outlineBlackMat);
  fatOut.scale.set(1.07, 1.18, 1.07);
  fatRim.add(fatOut);
  spinVisual.add(fatRim);

  // Miolo vermelho rubi suculento
  const meatCore = new THREE.Mesh(res.meatBodyGeo, res.meatRubyMat);
  spinVisual.add(meatCore);

  // Osso branco redondo central com tutano rosado (clássico desenho animado!)
  const marrowBone = new THREE.Mesh(res.meatMarrowBoneGeo, res.boneWhiteMat);
  marrowBone.position.set(0.11, 0, 0.04);
  const marrowCenter = new THREE.Mesh(res.meatMarrowCoreGeo, res.meatMarrowPinkMat);
  marrowBone.add(marrowCenter);
  spinVisual.add(marrowBone);

  root.add(spinVisual);
  applyWorldCurvatureToGroup(root);
  return { root, spinVisual };
}

/**
 * Constrói o Indicador Cômico e Diagonal ("!" + presas de quadrinho inclinado na diagonal)
 * exibido acima da cabeça do Caramelo momentos antes dele saltar nas costas do Motoboy!
 */
export function buildCarameloAttackIndicator(): {
  root: THREE.Group;
  diagonalBadge: THREE.Group;
} {
  const res = getSharedDogCollectibleRes();
  const root = new THREE.Group();
  root.name = 'CarameloDiagonalAttackIndicator';
  root.visible = false;

  const diagonalBadge = new THREE.Group();
  // Inclinação cômica diagonal (-28 graus) estilo mangá/cartoon!
  diagonalBadge.rotation.z = -0.49;

  // Losango amarelo vibrante com bordas branca e preta
  const diamond = new THREE.Mesh(res.warnBadgeGeo, res.warnYellowMat);
  const diamondBlack = new THREE.Mesh(res.warnBadgeGeo, res.outlineBlackMat);
  diamondBlack.scale.set(1.16, 1.16, 1.3);
  diamond.add(diamondBlack);
  diagonalBadge.add(diamond);

  // Ponto de exclamação vermelho gigante no centro
  const bar = new THREE.Mesh(res.warnBarGeo, res.warnRedMat);
  bar.position.set(0, 0.075, 0.055);
  const barWhite = new THREE.Mesh(res.warnBarGeo, res.warnWhiteMat);
  barWhite.scale.set(1.25, 1.08, 1.1);
  barWhite.position.z = -0.01;
  bar.add(barWhite);
  diagonalBadge.add(bar);

  const dot = new THREE.Mesh(res.warnDotGeo, res.warnRedMat);
  dot.position.set(0, -0.115, 0.055);
  diagonalBadge.add(dot);

  // Duas presinhas brancas cômicas nas pontas inferiores do alerta!
  for (const side of [-1, 1]) {
    const fang = new THREE.Mesh(res.warnFangGeo, res.warnWhiteMat);
    fang.rotation.z = Math.PI + side * 0.22;
    fang.position.set(side * 0.14, -0.26, 0.03);
    const fangOut = new THREE.Mesh(res.warnFangGeo, res.outlineBlackMat);
    fangOut.scale.setScalar(1.24);
    fang.add(fangOut);
    diagonalBadge.add(fang);
  }

  root.add(diagonalBadge);
  return { root, diagonalBadge };
}

/**
 * Item 5: Faixa Vermelha Piscante de Zona de Perigo no Chão (Modo Motoboy)
 * Indica exatamente a área onde o bote do Caramelo vai atingir, piscando cada vez mais rápido!
 */
export interface DangerGroundStripRig {
  root: THREE.Group;
  fillMat: THREE.MeshBasicMaterial;
  borderMat: THREE.MeshBasicMaterial;
  chevronMat: THREE.MeshBasicMaterial;
}

export function buildDangerLaneGroundStrip(): DangerGroundStripRig {
  const root = new THREE.Group();
  root.name = 'CarameloDangerGroundStrip';
  root.visible = false;

  const stripW = 2.36;
  const stripL = 6.2;

  const fillMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  applyWorldCurvatureToMaterial(fillMat);

  const borderMat = new THREE.MeshBasicMaterial({
    color: 0xff2a2a,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  applyWorldCurvatureToMaterial(borderMat);

  const chevronMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  applyWorldCurvatureToMaterial(chevronMat);

  const fillGeo = new THREE.PlaneGeometry(stripW, stripL, 2, 8);
  fillGeo.rotateX(-Math.PI / 2);
  const fillMesh = new THREE.Mesh(fillGeo, fillMat);
  fillMesh.position.y = 0.034;
  root.add(fillMesh);

  // Bordas laterais e frontais demarcando nitidamente a zona real de impacto
  const sideGeo = new THREE.PlaneGeometry(0.14, stripL, 1, 8);
  sideGeo.rotateX(-Math.PI / 2);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(sideGeo, borderMat);
    rail.position.set(s * (stripW * 0.5 - 0.07), 0.036, 0);
    root.add(rail);
  }

  const capGeo = new THREE.PlaneGeometry(stripW, 0.16);
  capGeo.rotateX(-Math.PI / 2);
  for (const zCap of [-stripL * 0.5 + 0.08, stripL * 0.5 - 0.08]) {
    const cap = new THREE.Mesh(capGeo, borderMat);
    cap.position.set(0, 0.036, zCap);
    root.add(cap);
  }

  // Chevrons diagonais de alerta dentro da faixa de perigo
  const chevArmGeo = new THREE.PlaneGeometry(0.95, 0.18);
  chevArmGeo.rotateX(-Math.PI / 2);
  for (const zOff of [-1.85, 0.0, 1.85]) {
    const chevGroup = new THREE.Group();
    chevGroup.position.set(0, 0.038, zOff);
    const leftArm = new THREE.Mesh(chevArmGeo, chevronMat);
    leftArm.position.set(-0.36, 0, 0);
    leftArm.rotation.y = 0.48;
    const rightArm = new THREE.Mesh(chevArmGeo, chevronMat);
    rightArm.position.set(0.36, 0, 0);
    rightArm.rotation.y = -0.48;
    chevGroup.add(leftArm, rightArm);
    root.add(chevGroup);
  }

  return { root, fillMat, borderMat, chevronMat };
}

/**
 * Item 7: Cédula 3D Individual Flutuante Acima da Cabeça do Motoboy na Coleta
 * Sobe suavemente com rotação leve e desaparece gradualmente (fade-out limpo)!
 */
export interface FloatingHeadBanknoteRig {
  root: THREE.Group;
  setAppearance: (hexColor: number, opacity: number) => void;
}

let _sharedFloatingNoteGeos: {
  noteGeo: THREE.BoxGeometry;
  bandGeo: THREE.BoxGeometry;
  outGeo: THREE.BoxGeometry;
} | null = null;

export function buildFloatingHeadBanknote(): FloatingHeadBanknoteRig {
  if (!_sharedFloatingNoteGeos) {
    _sharedFloatingNoteGeos = {
      noteGeo: new THREE.BoxGeometry(0.44, 0.018, 0.23),
      bandGeo: new THREE.BoxGeometry(0.11, 0.022, 0.236),
      outGeo: new THREE.BoxGeometry(0.475, 0.032, 0.262),
    };
  }
  const root = new THREE.Group();
  root.visible = false;

  const noteMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    fog: false,
  });
  const bandMat = new THREE.MeshBasicMaterial({
    color: 0xfef3c7,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    fog: false,
  });
  const outMat = new THREE.MeshBasicMaterial({
    color: 0x0d0b0a,
    side: THREE.BackSide,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    fog: false,
  });

  const noteMesh = new THREE.Mesh(_sharedFloatingNoteGeos.noteGeo, noteMat);
  const bandMesh = new THREE.Mesh(_sharedFloatingNoteGeos.bandGeo, bandMat);
  const outMesh = new THREE.Mesh(_sharedFloatingNoteGeos.outGeo, outMat);
  root.add(noteMesh, bandMesh, outMesh);

  const setAppearance = (hexColor: number, opacity: number) => {
    const a = THREE.MathUtils.clamp(opacity, 0, 1);
    noteMat.color.setHex(hexColor);
    noteMat.opacity = a;
    bandMat.opacity = a;
    outMat.opacity = a * 0.92;
  };

  return { root, setAppearance };
}

/**
 * Item 6: Sequência Final Cômica e Cinematográfica (Briga Cartoon na Nuvem de Poeira Branca + Peças da Moto Voando!)
 */
export interface BrawlFlyingPart {
  group: THREE.Group;
  kind: 'wheel_front' | 'wheel_rear' | 'crate' | 'handlebar' | 'muffler' | 'fender';
  radius: number;
  restitution: number;
}

export interface CartoonBrawlFinaleRig {
  root: THREE.Group;
  dustCloudGroup: THREE.Group;
  dustPuffs: Array<{
    group: THREE.Group;
    mat: THREE.MeshToonMaterial;
    outMat: THREE.MeshBasicMaterial;
    orbitAngle: number;
    orbitRadius: number;
    orbitHeight: number;
    speed: number;
    baseScale: number;
  }>;
  comicSpikes: THREE.Mesh[];
  flyingParts: BrawlFlyingPart[];
}

export function buildCartoonBrawlFinaleRig(): CartoonBrawlFinaleRig {
  const res = getSharedDogCollectibleRes();
  const root = new THREE.Group();
  root.name = 'CartoonBrawlFinaleRig';
  root.visible = false;

  const dustCloudGroup = new THREE.Group();
  root.add(dustCloudGroup);

  const puffGeo = new THREE.SphereGeometry(0.62, 14, 12);
  const puffOutGeo = new THREE.SphereGeometry(0.68, 12, 10);
  const dustColors = [0xffffff, 0xf8fafc, 0xfffbeb, 0xf1f5f9];
  const dustPuffs: CartoonBrawlFinaleRig['dustPuffs'] = [];

  for (let i = 0; i < 16; i++) {
    const pGroup = new THREE.Group();
    const mat = new THREE.MeshToonMaterial({
      color: dustColors[i % dustColors.length],
      transparent: true,
      opacity: 1.0,
    });
    const outMat = new THREE.MeshBasicMaterial({
      color: 0x0d0b0a,
      side: THREE.BackSide,
      transparent: true,
      opacity: 1.0,
    });
    const m = new THREE.Mesh(puffGeo, mat);
    const o = new THREE.Mesh(puffOutGeo, outMat);
    pGroup.add(m, o);
    dustCloudGroup.add(pGroup);
    dustPuffs.push({
      group: pGroup,
      mat,
      outMat,
      orbitAngle: (i / 16) * Math.PI * 2,
      orbitRadius: i < 4 ? 0.28 : 0.65 + (i % 4) * 0.24,
      orbitHeight: 0.42 + (i % 5) * 0.22,
      speed: (i % 2 === 0 ? 1 : -1) * (4.8 + (i % 4) * 1.3),
      baseScale: i < 4 ? 1.35 : 0.78 + (i % 3) * 0.24,
    });
  }

  // Estrelas / Faíscas de Impacto Cartoon + Onomatopeias "POW!", "BAM!", "BIF!" + Punhos/Botas (Referência 1!)
  const spikeGeo = new THREE.OctahedronGeometry(0.20, 0);
  const spikePalette = [0xfde047, 0xf97316, 0x38bdf8, 0xf43f5e];
  const comicSpikes: THREE.Mesh[] = [];
  for (let s = 0; s < 6; s++) {
    const sMat = new THREE.MeshBasicMaterial({ color: spikePalette[s % spikePalette.length] });
    const sMesh = new THREE.Mesh(spikeGeo, sMat);
    const sOut = new THREE.Mesh(spikeGeo, res.outlineBlackMat);
    sOut.scale.setScalar(1.22);
    sMesh.add(sOut);
    dustCloudGroup.add(sMesh);
    comicSpikes.push(sMesh);
  }

  // Onomatopeias cômicas "POW!", "BAM!", "BIF!" (Referência 1) saltando ao redor da nuvem de pancadaria!
  const createComicWordBadge = (word: string, bgHex: string, textHex: string): THREE.Mesh => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 128);

    // Explosão estrelada de fundo estilo quadrinhos
    ctx.save();
    ctx.translate(128, 64);
    ctx.beginPath();
    const pts = 14;
    for (let i = 0; i < pts * 2; i++) {
      const r = i % 2 === 0 ? 112 : 76;
      const a = (i * Math.PI) / pts;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * (r * 0.52);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = bgHex;
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#0d0b0a';
    ctx.stroke();

    ctx.font = 'italic 900 54px Impact, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#0d0b0a';
    ctx.strokeText(word, 0, 4);
    ctx.fillStyle = textHex;
    ctx.fillText(word, 0, 4);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.59), mat);
  };

  const powBadge = createComicWordBadge('POW!', '#fef08a', '#ef4444');
  const bamBadge = createComicWordBadge('BAM!', '#bbf7d0', '#16a34a');
  const bifBadge = createComicWordBadge('BIF!', '#fed7aa', '#f59e0b');
  dustCloudGroup.add(powBadge, bamBadge, bifBadge);
  comicSpikes.push(powBadge, bamBadge, bifBadge);

  // Punhos e botas cartoon saindo da nuvem de poeira (Referência 1!)
  const bootMat = new THREE.MeshToonMaterial({ color: 0x78350f });
  const skinFistMat = new THREE.MeshToonMaterial({ color: 0xfdba74 });
  for (let lIdx = 0; lIdx < 2; lIdx++) {
    const limbMesh = new THREE.Mesh(
      lIdx === 0
        ? new THREE.BoxGeometry(0.32, 0.22, 0.44)
        : new THREE.SphereGeometry(0.20, 10, 8),
      lIdx === 0 ? bootMat : skinFistMat
    );
    const lOut = new THREE.Mesh(limbMesh.geometry, res.outlineBlackMat);
    lOut.scale.setScalar(1.14);
    limbMesh.add(lOut);
    dustCloudGroup.add(limbMesh);
    comicSpikes.push(limbMesh);
  }

  // Peças Icônicas da Moto Voando com Direção e Quique Convincente!
  const tireMat = new THREE.MeshToonMaterial({ color: 0x1e293b });
  const chromeMat = new THREE.MeshToonMaterial({ color: 0xe2e8f0 });
  const crateRedMat = new THREE.MeshToonMaterial({ color: 0xef4444 });
  const crateYellowMat = new THREE.MeshToonMaterial({ color: 0xfacc15 });
  const fenderBlueMat = new THREE.MeshToonMaterial({ color: 0x2563eb });

  const addPartOutline = (mesh: THREE.Mesh, scale = 1.12) => {
    const out = new THREE.Mesh(mesh.geometry, res.outlineBlackMat);
    out.scale.setScalar(scale);
    mesh.add(out);
  };

  const buildWheelPart = (kind: 'wheel_front' | 'wheel_rear'): BrawlFlyingPart => {
    const g = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.10, 10, 20), tireMat);
    addPartOutline(tire, 1.10);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 12), chromeMat);
    rim.rotation.x = Math.PI / 2;
    g.add(tire, rim);
    root.add(g);
    return { group: g, kind, radius: 0.38, restitution: 0.68 };
  };

  const crateG = new THREE.Group();
  const crateBody = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 0.48), crateRedMat);
  addPartOutline(crateBody, 1.09);
  const crateLid = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.52), crateYellowMat);
  crateLid.position.y = 0.24;
  addPartOutline(crateLid, 1.09);
  crateG.add(crateBody, crateLid);
  root.add(crateG);

  const barG = new THREE.Group();
  const barTube = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.78, 8), chromeMat);
  barTube.rotation.z = Math.PI / 2;
  addPartOutline(barTube, 1.18);
  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.16, 8), tireMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.x = side * 0.34;
    barG.add(grip);
  }
  barG.add(barTube);
  root.add(barG);

  const mufflerG = new THREE.Group();
  const mufflerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.068, 0.56, 10), chromeMat);
  mufflerBody.rotation.z = Math.PI / 2;
  addPartOutline(mufflerBody, 1.12);
  mufflerG.add(mufflerBody);
  root.add(mufflerG);

  const fenderG = new THREE.Group();
  const fenderBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.46), fenderBlueMat);
  addPartOutline(fenderBody, 1.12);
  fenderG.add(fenderBody);
  root.add(fenderG);

  const flyingParts: BrawlFlyingPart[] = [
    buildWheelPart('wheel_front'),
    buildWheelPart('wheel_rear'),
    { group: crateG, kind: 'crate', radius: 0.26, restitution: 0.52 },
    { group: barG, kind: 'handlebar', radius: 0.16, restitution: 0.56 },
    { group: mufflerG, kind: 'muffler', radius: 0.14, restitution: 0.50 },
    { group: fenderG, kind: 'fender', radius: 0.14, restitution: 0.48 },
  ];

  return { root, dustCloudGroup, dustPuffs, comicSpikes, flyingParts };
}

/**
 * Item 11: Caramelo Ambiente Cartoon Esparso nas Calçadas (apenas 2 unidades bem espaçadas no mapa,
 * preservando a presença charmosa deles no bairro sem jamais agrupar vários cachorros!)
 */
export function buildSparseSidewalkCarameloProp(): { root: THREE.Group; tailPivot: THREE.Group } {
  const root = new THREE.Group();
  root.name = 'SparseSidewalkCaramelo';

  const whiteOutlineMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.BackSide,
  });
  const coatMat = new THREE.MeshToonMaterial({ color: 0xd97706 });
  const chestMat = new THREE.MeshToonMaterial({ color: 0xfbbf24 });
  const noseMat = new THREE.MeshToonMaterial({ color: 0x1e293b });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.28, 6, 10), coatMat);
  body.position.set(0, 0.28, 0);
  body.rotation.x = -0.52;
  const bodyOut = new THREE.Mesh(body.geometry, whiteOutlineMat);
  bodyOut.scale.setScalar(1.10);
  body.add(bodyOut);
  root.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 8), chestMat);
  chest.position.set(0, 0.34, 0.10);
  root.add(chest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), coatMat);
  head.position.set(0, 0.52, 0.14);
  const headOut = new THREE.Mesh(head.geometry, whiteOutlineMat);
  headOut.scale.setScalar(1.10);
  head.add(headOut);
  root.add(head);

  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.09, 6, 8), chestMat);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.49, 0.27);
  root.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), noseMat);
  nose.position.set(0, 0.51, 0.34);
  root.add(nose);

  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.05), coatMat);
    ear.position.set(s * 0.12, 0.59, 0.11);
    ear.rotation.z = s * 0.42;
    root.add(ear);

    const fLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.26, 8), coatMat);
    fLeg.position.set(s * 0.085, 0.13, 0.14);
    root.add(fLeg);
  }

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.22, -0.16);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.24, 6), coatMat);
  tail.position.set(0, 0.10, -0.06);
  tail.rotation.x = -0.65;
  tailPivot.add(tail);
  root.add(tailPivot);

  applyWorldCurvatureToGroup(root);
  return { root, tailPivot };
}

// ============================================================================
// ITEM 8: NOVO SISTEMA DE MISSÕES — ZONA VERDE PISCANTE NO CHÃO + NPC CLIENTE
// ============================================================================

export interface PizzaDeliveryZoneRig {
  root: THREE.Group;
  floorZoneGroup: THREE.Group;
  floorFillMat: THREE.MeshBasicMaterial;
  floorBorderMat: THREE.MeshBasicMaterial;
  floorBeaconMat: THREE.MeshBasicMaterial;
  npcGroup: THREE.Group;
  wavingArmPivot: THREE.Group;
  catchingArmPivot: THREE.Group;
  orderBadgeMesh: THREE.Mesh;
  deliveredBadgeMesh: THREE.Mesh;
}

let sharedPizzaZoneBadges: {
  orderMat: THREE.MeshBasicMaterial;
  deliveredMat: THREE.MeshBasicMaterial;
} | null = null;

function getSharedPizzaZoneBadges() {
  if (sharedPizzaZoneBadges) return sharedPizzaZoneBadges;

  const makeBadgeTex = (topText: string, subText: string, bgStart: string, bgEnd: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 320, 128);

    const grad = ctx.createLinearGradient(0, 8, 0, 120);
    grad.addColorStop(0, bgStart);
    grad.addColorStop(1, bgEnd);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(10, 10, 300, 108, 28);
    ctx.fill();

    ctx.lineWidth = 7;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#0d0b0a';
    ctx.lineWidth = 7;
    ctx.strokeText(topText, 160, 48);
    ctx.fillText(topText, 160, 48);

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 24px sans-serif';
    ctx.strokeText(subText, 160, 88);
    ctx.fillText(subText, 160, 88);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  };

  sharedPizzaZoneBadges = {
    orderMat: makeBadgeTex('🍕 PEDIDO AQUI!', 'ENTREGAR PIZZA', '#22c55e', '#15803d'),
    deliveredMat: makeBadgeTex('🍕 ENTREGUE!', '+BÔNUS VIP!', '#f59e0b', '#b45309'),
  };
  return sharedPizzaZoneBadges;
}

export function buildPizzaDeliveryZoneRig(
  side: 'left' | 'right',
  variantIdx = 0
): PizzaDeliveryZoneRig {
  const root = new THREE.Group();
  root.name = `PizzaDeliveryZone_${side}_${variantIdx}`;
  root.visible = false;

  const sideSign = side === 'left' ? -1 : 1;
  // 1) Área Verde Piscante no Chão na faixa da rua próxima à casa (x = ±3.15m)
  const floorZoneGroup = new THREE.Group();
  floorZoneGroup.position.set(sideSign * 3.15, 0.032, 0);
  root.add(floorZoneGroup);

  const floorFillMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const floorBorderMat = new THREE.MeshBasicMaterial({
    color: 0x86efac,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const floorBeaconMat = new THREE.MeshBasicMaterial({
    color: 0x4ade80,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const zoneW = 2.85;
  const zoneL = 6.2;
  const fillPlane = new THREE.Mesh(new THREE.PlaneGeometry(zoneW, zoneL), floorFillMat);
  fillPlane.rotation.x = -Math.PI * 0.5;
  floorZoneGroup.add(fillPlane);

  // Moldura verde luminosa piscante no asfalto
  const bThick = 0.16;
  const leftEdge = new THREE.Mesh(new THREE.PlaneGeometry(bThick, zoneL), floorBorderMat);
  leftEdge.rotation.x = -Math.PI * 0.5;
  leftEdge.position.set(-zoneW * 0.5, 0.004, 0);
  const rightEdge = new THREE.Mesh(new THREE.PlaneGeometry(bThick, zoneL), floorBorderMat);
  rightEdge.rotation.x = -Math.PI * 0.5;
  rightEdge.position.set(zoneW * 0.5, 0.004, 0);
  const frontEdge = new THREE.Mesh(new THREE.PlaneGeometry(zoneW, bThick), floorBorderMat);
  frontEdge.rotation.x = -Math.PI * 0.5;
  frontEdge.position.set(0, 0.004, zoneL * 0.5);
  const backEdge = new THREE.Mesh(new THREE.PlaneGeometry(zoneW, bThick), floorBorderMat);
  backEdge.rotation.x = -Math.PI * 0.5;
  backEdge.position.set(0, 0.004, -zoneL * 0.5);
  floorZoneGroup.add(leftEdge, rightEdge, frontEdge, backEdge);

  // Halo vertical suave demarcando a área de entrega
  const beaconCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.35, 1.15, 18, 1, true),
    floorBeaconMat
  );
  beaconCylinder.position.set(0, 0.58, 0);
  floorZoneGroup.add(beaconCylinder);

  // 2) NPC Cliente Cartoon esperando na calçada em frente à casa (com BORDAS BRANCAS estilo cartoon!)
  const npcGroup = new THREE.Group();
  npcGroup.position.set(sideSign * 5.65, 0.16, 0);
  // Olha em direção à rua e ao motoboy que vem se aproximando
  npcGroup.rotation.y = side === 'left' ? Math.PI * 0.35 : -Math.PI * 0.35;
  root.add(npcGroup);

  const whiteOutlineMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.BackSide,
  });

  const shirtPalette = [0xef4444, 0x3b82f6, 0xf59e0b, 0xec4899, 0x8b5cf6, 0x10b981];
  const pantsPalette = [0x1e3a8a, 0x334155, 0x475569, 0x78350f];
  const skinPalette = [0xfdba74, 0xd97706, 0xfed7aa, 0x92400e];

  const shirtMat = new THREE.MeshToonMaterial({
    color: shirtPalette[variantIdx % shirtPalette.length],
  });
  const pantsMat = new THREE.MeshToonMaterial({
    color: pantsPalette[variantIdx % pantsPalette.length],
  });
  const skinMat = new THREE.MeshToonMaterial({
    color: skinPalette[variantIdx % skinPalette.length],
  });
  const hairMat = new THREE.MeshToonMaterial({ color: 0x1e1b18 });
  const shoeMat = new THREE.MeshToonMaterial({ color: 0xf8fafc });

  const addWhiteOutlinedMesh = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    parent: THREE.Object3D,
    outScale = 1.12
  ) => {
    const m = new THREE.Mesh(geo, mat);
    const hull = new THREE.Mesh(geo, whiteOutlineMat);
    hull.scale.setScalar(outScale);
    m.add(hull);
    parent.add(m);
    return m;
  };

  // Pernas e tênis
  for (const s of [-1, 1]) {
    const leg = addWhiteOutlinedMesh(
      new THREE.CapsuleGeometry(0.085, 0.42, 6, 8),
      pantsMat,
      npcGroup
    );
    leg.position.set(s * 0.12, 0.36, 0);

    const shoe = addWhiteOutlinedMesh(
      new THREE.BoxGeometry(0.14, 0.10, 0.24),
      shoeMat,
      npcGroup
    );
    shoe.position.set(s * 0.12, 0.06, 0.04);
  }

  // Tronco
  const torso = addWhiteOutlinedMesh(
    new THREE.CapsuleGeometry(0.19, 0.38, 8, 12),
    shirtMat,
    npcGroup,
    1.10
  );
  torso.position.set(0, 0.88, 0);

  // Cabeça e Cabelo/Boné
  const head = addWhiteOutlinedMesh(
    new THREE.SphereGeometry(0.185, 12, 10),
    skinMat,
    npcGroup,
    1.11
  );
  head.position.set(0, 1.34, 0);

  const hair = addWhiteOutlinedMesh(
    new THREE.SphereGeometry(0.192, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat,
    npcGroup,
    1.08
  );
  hair.position.set(0, 1.36, -0.01);

  // Braço que acena pedindo a pizza!
  const wavingArmPivot = new THREE.Group();
  wavingArmPivot.position.set(-sideSign * 0.24, 1.06, 0);
  npcGroup.add(wavingArmPivot);
  const waveArm = addWhiteOutlinedMesh(
    new THREE.CapsuleGeometry(0.068, 0.34, 6, 8),
    skinMat,
    wavingArmPivot
  );
  waveArm.position.set(0, 0.20, 0);

  // Segundo braço pronto para receber a caixa de pizza
  const catchingArmPivot = new THREE.Group();
  catchingArmPivot.position.set(sideSign * 0.24, 1.04, 0);
  npcGroup.add(catchingArmPivot);
  const catchArm = addWhiteOutlinedMesh(
    new THREE.CapsuleGeometry(0.068, 0.32, 6, 8),
    skinMat,
    catchingArmPivot
  );
  catchArm.position.set(0, -0.14, 0.10);
  catchArm.rotation.x = -0.65;

  // Placa Flutuante de Pedido / Entrega Concluída acima do NPC
  const badges = getSharedPizzaZoneBadges();
  const badgePlaneGeo = new THREE.PlaneGeometry(1.55, 0.62);
  const orderBadgeMesh = new THREE.Mesh(badgePlaneGeo, badges.orderMat);
  orderBadgeMesh.position.set(sideSign * 4.85, 2.25, 0);
  root.add(orderBadgeMesh);

  const deliveredBadgeMesh = new THREE.Mesh(badgePlaneGeo, badges.deliveredMat);
  deliveredBadgeMesh.position.set(sideSign * 4.85, 2.35, 0);
  deliveredBadgeMesh.visible = false;
  root.add(deliveredBadgeMesh);

  applyWorldCurvatureToGroup(root);

  return {
    root,
    floorZoneGroup,
    floorFillMat,
    floorBorderMat,
    floorBeaconMat,
    npcGroup,
    wavingArmPivot,
    catchingArmPivot,
    orderBadgeMesh,
    deliveredBadgeMesh,
  };
}

/* =========================================================================================
 * VILA TROPICAL PRAIA (MAPA 2: ORLA DE COPACABANA & MAR CARIOCA) BUILDERS & SCENERY
 * ========================================================================================= */

const condoSlabMat = new THREE.MeshStandardMaterial({
  color: 0xf1f5f9,
  roughness: 0.48,
  metalness: 0.06,
  fog: false,
});

const condoWarmCreamMat = new THREE.MeshStandardMaterial({
  color: 0xfef3c7,
  roughness: 0.52,
  metalness: 0.05,
  fog: false,
});

const condoBalconyGlassMat = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  roughness: 0.22,
  metalness: 0.25,
  fog: false,
});

const condoDarkWindowMat = new THREE.MeshStandardMaterial({
  color: 0x1e3a5f,
  roughness: 0.3,
  metalness: 0.2,
  fog: false,
});

/**
 * Builds a Rio Coastal Condominium Apartment Building ("Prédios de Condomínio Diferentes")
 */
export function buildCoastalCondominiumBuilding(
  variantIndex: number,
  maxAnisotropy = 4,
  isDistantHorizon = false,
): THREE.Group {
  const group = new THREE.Group();
  const v = ((variantIndex % 4) + 4) % 4;
  group.name = `Coastal_Condominium_${v}`;

  const facadeTex = getCoastalCondoFacadeTexture(v, maxAnisotropy);
  const facadeMat = new THREE.MeshStandardMaterial({
    map: facadeTex,
    color: 0xffffff,
    roughness: 0.52,
    metalness: 0.08,
    fog: false,
  });

  const W = v === 0 ? 8.8 : v === 1 ? 9.2 : v === 2 ? 8.4 : 8.8;
  const D = 6.8;
  const H = v === 0 ? 25.0 : v === 1 ? 21.5 : v === 2 ? 23.0 : 18.5;

  // 1. Base Arquitetônica Cartoon com Textura de Fachada, Molduras Quentes e Vitrines Térreas
  // (substituindo paredes cinzas lisas por acabamento detalhado de orla carioca!)
  const foundation = new THREE.Mesh(sharedGeos.tallBox, facadeMat);
  foundation.scale.set(W + 0.16, 16.0, D + 0.16);
  foundation.position.set(0, -8.0, 0);
  group.add(foundation);

  for (const bandY of [0.15, -2.8, -5.8]) {
    const baseCornice = new THREE.Mesh(sharedGeos.unitBox, condoWarmCreamMat);
    baseCornice.scale.set(W + 0.56, 0.42, D + 0.56);
    baseCornice.position.set(0, bandY, 0);
    group.add(baseCornice);
  }
  if (!isDistantHorizon) {
    // Vitrines azuis e floreiras tropicais na base voltada para a avenida da praia (+X e +Z)
    const lobbyGlass = new THREE.Mesh(sharedGeos.unitBox, condoBalconyGlassMat);
    lobbyGlass.scale.set(0.24, 2.2, D * 0.68);
    lobbyGlass.position.set(W * 0.5 + 0.12, -1.35, 0);
    group.add(lobbyGlass);
  }

  // 2. Main Residential Apartment Tower Shaft
  const mainShaft = new THREE.Mesh(sharedGeos.tallBox, facadeMat);
  mainShaft.scale.set(W, H, D);
  mainShaft.position.set(0, H * 0.5, 0);
  group.add(mainShaft);

  const slabMat = v % 2 === 0 ? condoSlabMat : condoWarmCreamMat;

  // 3. Projecting 3D Coastal Balconies ("Varandas de Condomínio")
  if (!isDistantHorizon) {
    const numBalconyFloors = v === 3 ? 5 : 6;
    const floorStepY = (H - 2.6) / numBalconyFloors;

    for (let fl = 1; fl <= numBalconyFloors; fl++) {
      const by = fl * floorStepY + 0.6;

      // Beach-facing (+X) projecting concrete balcony slab & glass railing
      const beachSlab = new THREE.Mesh(sharedGeos.unitBox, slabMat);
      beachSlab.scale.set(0.68, 0.32, D * 0.78);
      beachSlab.position.set(W * 0.5 + 0.24, by, 0);
      beachSlab.userData.lod2MaxNode = true;
      group.add(beachSlab);

      const beachRail = new THREE.Mesh(sharedGeos.unitBox, condoBalconyGlassMat);
      beachRail.scale.set(0.12, 0.58, D * 0.76);
      beachRail.position.set(W * 0.5 + 0.52, by + 0.42, 0);
      beachRail.userData.lod2MaxNode = true;
      group.add(beachRail);

      // Camera-facing (+Z) twin recessed window & balcony ledges
      for (const bx of [-W * 0.25, W * 0.25]) {
        const frontBalcony = new THREE.Mesh(sharedGeos.unitBox, slabMat);
        frontBalcony.scale.set(W * 0.34, 0.30, 0.58);
        frontBalcony.position.set(bx, by, D * 0.5 + 0.20);
        frontBalcony.userData.lod2MaxNode = true;
        group.add(frontBalcony);

        const frontWindow = new THREE.Mesh(sharedGeos.unitBox, condoDarkWindowMat);
        frontWindow.scale.set(W * 0.28, floorStepY * 0.50, 0.14);
        frontWindow.position.set(bx, by + floorStepY * 0.34, D * 0.5 + 0.05);
        frontWindow.userData.lod2MaxNode = true;
        group.add(frontWindow);
      }
    }
  }

  // 4. Clean Full-Width Flat Modernist Roofline Cornice Cap
  const roofCornice = new THREE.Mesh(sharedGeos.unitBox, slabMat);
  roofCornice.scale.set(W + 0.52, 0.68, D + 0.52);
  roofCornice.position.set(0, H + 0.34, 0);
  group.add(roofCornice);

  applyWorldCurvatureToGroup(group, {
    minFog: 0.04,
    maxFog: 0.26,
    clearHeightY: 36.0,
  });
  return group;
}

/**
 * Builds the Distant Bay Condominium Skyline starting strictly BEYOND the scrolling hillside condo row
 */
export function buildCoastalHorizonCitySkyline(maxAnisotropy = 4): {
  group: THREE.Group;
  update: (elapsed: number, playerX: number) => void;
} {
  const group = new THREE.Group();
  group.name = 'Rio_Coastal_Condominium_Bay_Skyline';

  const condoSpecs = [
    { x: -24.0, z: -168, baseY: 0.5, variant: 0, scale: 0.72, hMult: 0.74 },
    { x: -14.5, z: -180, baseY: 0.2, variant: 1, scale: 0.64, hMult: 0.64 },
    { x: -5.2, z: -192, baseY: 0.0, variant: 2, scale: 0.56, hMult: 0.54 },
    { x: 3.8, z: -202, baseY: -0.1, variant: 0, scale: 0.48, hMult: 0.46 },
  ];

  for (let i = 0; i < condoSpecs.length; i++) {
    const spec = condoSpecs[i];
    const bldg = buildCoastalCondominiumBuilding(spec.variant, maxAnisotropy, true);
    bldg.scale.set(spec.scale, spec.scale * spec.hMult, spec.scale);
    bldg.position.set(spec.x, spec.baseY, spec.z);
    bldg.rotation.y = 0.18;
    bldg.updateMatrix();
    bldg.matrixAutoUpdate = false;
    group.add(bldg);
  }
  group.updateMatrix();
  group.matrixAutoUpdate = false;

  return {
    group,
    update: (_elapsed: number, _playerX: number) => {},
  };
}

const coastalWallStoneMat = new THREE.MeshStandardMaterial({
  color: 0xe9b872,
  roughness: 0.76,
  metalness: 0.04,
});

const coastalWallCapMat = new THREE.MeshStandardMaterial({
  color: 0xd97706,
  roughness: 0.72,
  metalness: 0.05,
});

const benchWoodMat = new THREE.MeshStandardMaterial({
  color: 0xc27838,
  roughness: 0.72,
  metalness: 0.05,
});

const trashBinBodyMat = new THREE.MeshStandardMaterial({
  color: 0x27272a,
  roughness: 0.65,
  metalness: 0.25,
});

const palmTrunkRingMat = new THREE.MeshStandardMaterial({
  color: 0x784421,
  roughness: 0.85,
  metalness: 0.03,
});

const palmTrunkDarkMat = new THREE.MeshStandardMaterial({
  color: 0x5c3216,
  roughness: 0.88,
  metalness: 0.02,
});

const palmFrondBrightMat = new THREE.MeshStandardMaterial({
  color: 0x22c55e,
  roughness: 0.58,
  metalness: 0.04,
});
palmFrondBrightMat.userData.isPalmFrondMat = true;

const palmFrondDeepMat = new THREE.MeshStandardMaterial({
  color: 0x15803d,
  roughness: 0.62,
  metalness: 0.04,
});
palmFrondDeepMat.userData.isPalmFrondMat = true;

const coconutBrownMat = new THREE.MeshStandardMaterial({
  color: 0x451a03,
  roughness: 0.8,
});

const lifeguardWoodMat = new THREE.MeshStandardMaterial({
  color: 0xb4692e,
  roughness: 0.76,
  metalness: 0.05,
});

const lifeguardRoofWoodMat = new THREE.MeshStandardMaterial({
  color: 0x8c4a1c,
  roughness: 0.8,
  metalness: 0.04,
});

const beachPoleWhiteMat = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  roughness: 0.4,
  metalness: 0.2,
});

const umbrellaStripePalettes: Array<[number, number]> = [
  [0xef4444, 0xffffff], // Red & White
  [0x0284c7, 0xffffff], // Cobalt Ocean Blue & White
  [0xfacc15, 0x16a34a], // Brasil Yellow & Green
  [0x06b6d4, 0xffffff], // Tropical Turquoise & White
  [0xf97316, 0xfffbeb], // Sunset Tangerine & Cream
  [0x2563eb, 0xfacc15], // Royal Blue & Sun Gold
];

/**
 * Builds a Tall, Curved Tropical Coconut Palm Tree ("Palmeira / Coqueiro da Praia")
 */
export function buildCoastalCoconutPalm(
  variantIndex = 0,
  scale = 1.0,
  leanX = 0.22,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Coastal_Coconut_Palm_${variantIndex}`;

  const segCount = 7;
  let curX = 0;
  let curY = 0;
  let curZ = 0;
  const zLean = ((variantIndex % 3) - 1) * 0.05;

  for (let i = 0; i < segCount; i++) {
    const t = i / (segCount - 1);
    const segH = 0.92 * scale;
    const rBottom = (0.25 - t * 0.09) * scale;
    const rTop = (0.23 - t * 0.09) * scale;

    const segGeo = new THREE.CylinderGeometry(rTop, rBottom, segH, 7, 1);
    const segMesh = new THREE.Mesh(
      segGeo,
      i % 2 === 0 ? palmTrunkRingMat : palmTrunkDarkMat,
    );
    segMesh.position.set(curX, curY + segH * 0.5, curZ);
    segMesh.rotation.z = -leanX * (t * 0.65 + 0.15);
    segMesh.rotation.x = zLean * t;
    group.add(segMesh);

    curX += Math.sin(leanX * (t * 0.65 + 0.15)) * segH;
    curY += Math.cos(leanX * (t * 0.65 + 0.15)) * segH;
    curZ -= Math.sin(zLean * t) * segH;
  }

  // Coconut cluster at the base of the crown
  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * Math.PI * 2;
    const nut = new THREE.Mesh(sharedGeos.sphere, coconutBrownMat);
    nut.scale.set(0.18 * scale, 0.22 * scale, 0.18 * scale);
    nut.position.set(
      curX + Math.cos(a) * 0.22 * scale,
      curY - 0.15 * scale,
      curZ + Math.sin(a) * 0.22 * scale,
    );
    group.add(nut);
  }

  // Articulated Palm Crown Pivot
  const crownPivot = new THREE.Group();
  crownPivot.position.set(curX, curY, curZ);
  crownPivot.userData.isPalmCrown = true;
  crownPivot.userData.baseRotZ = -leanX * 0.45;
  crownPivot.rotation.z = -leanX * 0.45;

  const numFronds = 8;
  for (let f = 0; f < numFronds; f++) {
    const angle = (f / numFronds) * Math.PI * 2 + (variantIndex % 2) * 0.25;
    const isUpper = f % 2 === 0;
    const frondMat = isUpper ? palmFrondBrightMat : palmFrondDeepMat;

    const frondArm = new THREE.Group();
    frondArm.rotation.y = angle;
    frondArm.rotation.z = isUpper ? -0.18 : -0.38;

    const innerBlade = new THREE.Mesh(sharedGeos.unitBox, frondMat);
    innerBlade.scale.set(1.35 * scale, 0.14 * scale, 0.62 * scale);
    innerBlade.position.set(0.68 * scale, 0.22 * scale, 0);
    innerBlade.rotation.z = 0.24;
    innerBlade.rotation.x = 0.18;
    frondArm.add(innerBlade);

    const outerBlade = new THREE.Mesh(sharedGeos.unitBox, frondMat);
    outerBlade.scale.set(1.28 * scale, 0.11 * scale, 0.48 * scale);
    outerBlade.position.set(1.78 * scale, 0.02 * scale, 0);
    outerBlade.rotation.z = -0.46;
    outerBlade.rotation.x = -0.15;
    frondArm.add(outerBlade);

    crownPivot.add(frondArm);
  }

  group.add(crownPivot);
  return group;
}

/**
 * Builds a Dynamic Coastal Wooden-Support Outdoor Billboard
 */
export function buildWoodenBeachBillboard(
  variantIndex = 0,
  side: 'left' | 'right' = 'right',
  maxAnisotropy = 4,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Wooden_Beach_Billboard_${side}_${variantIndex}`;

  const boardW = 4.55;
  const boardH = 2.32;
  const postH = 2.85;
  const postSpanX = boardW * 0.62;

  for (const px of [-postSpanX * 0.5, postSpanX * 0.5]) {
    const baseBlock = new THREE.Mesh(sharedGeos.unitBox, lifeguardRoofWoodMat);
    baseBlock.scale.set(0.42, 0.36, 0.56);
    baseBlock.position.set(px, 0.18, 0);
    group.add(baseBlock);

    const timberPost = new THREE.Mesh(sharedGeos.unitBox, lifeguardWoodMat);
    timberPost.scale.set(0.26, postH + boardH * 0.85, 0.26);
    timberPost.position.set(px, (postH + boardH * 0.85) * 0.5, -0.14);
    group.add(timberPost);

    const rearStrut = new THREE.Mesh(sharedGeos.unitBox, lifeguardRoofWoodMat);
    rearStrut.scale.set(0.20, postH * 1.18, 0.20);
    rearStrut.position.set(px, postH * 0.52, -0.78);
    rearStrut.rotation.x = 0.42;
    group.add(rearStrut);

    const kneeBrace = new THREE.Mesh(sharedGeos.unitBox, lifeguardRoofWoodMat);
    kneeBrace.scale.set(0.16, 1.15, 0.16);
    kneeBrace.position.set(px + (px < 0 ? 0.38 : -0.38), postH - 0.32, -0.14);
    kneeBrace.rotation.z = px < 0 ? -0.68 : 0.68;
    group.add(kneeBrace);
  }

  for (const cy of [1.15, postH - 0.12]) {
    const crossBeam = new THREE.Mesh(sharedGeos.unitBox, lifeguardRoofWoodMat);
    crossBeam.scale.set(postSpanX + 0.65, 0.22, 0.24);
    crossBeam.position.set(0, cy, -0.14);
    group.add(crossBeam);
  }

  const boardPivot = new THREE.Group();
  boardPivot.position.set(0, postH + boardH * 0.5, 0.06);
  boardPivot.userData.isDynamicBillboard = true;
  boardPivot.userData.billboardPhase = variantIndex * 1.25 + (side === 'right' ? 0.0 : 1.5);

  const woodFrameOuter = new THREE.Mesh(sharedGeos.unitBox, lifeguardRoofWoodMat);
  woodFrameOuter.scale.set(boardW + 0.38, boardH + 0.36, 0.22);
  boardPivot.add(woodFrameOuter);

  const woodFrameInner = new THREE.Mesh(sharedGeos.unitBox, lifeguardWoodMat);
  woodFrameInner.scale.set(boardW + 0.14, boardH + 0.14, 0.26);
  boardPivot.add(woodFrameInner);

  const adTex = createBillboardAdTexture(variantIndex, maxAnisotropy);
  const adMat = new THREE.MeshBasicMaterial({
    map: adTex,
    color: 0xffffff,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  applyWorldCurvatureToMaterial(adMat);

  const adPlaneFront = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardH), adMat);
  adPlaneFront.position.set(0, 0, 0.15);
  adPlaneFront.userData.noCartoonOutline = true;
  boardPivot.add(adPlaneFront);

  const woodCatwalk = new THREE.Mesh(sharedGeos.unitBox, lifeguardWoodMat);
  woodCatwalk.scale.set(boardW + 0.25, 0.14, 0.52);
  woodCatwalk.position.set(0, -boardH * 0.5 - 0.22, 0.18);
  boardPivot.add(woodCatwalk);

  for (const lx of [-boardW * 0.32, 0, boardW * 0.32]) {
    const lightArm = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
    lightArm.scale.set(0.08, 0.36, 0.52);
    lightArm.position.set(lx, boardH * 0.5 + 0.24, 0.22);
    lightArm.rotation.x = 0.32;
    boardPivot.add(lightArm);

    const lightHood = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
    lightHood.scale.set(0.34, 0.12, 0.24);
    lightHood.position.set(lx, boardH * 0.5 + 0.36, 0.44);
    boardPivot.add(lightHood);
  }

  group.add(boardPivot);
  group.rotation.y = side === 'right' ? -0.36 : 0.36;
  return group;
}

function buildSingleBrazilianKiteWithRabiola(
  parentGroup: THREE.Group,
  _handX: number,
  _handY: number,
  _handZ: number,
  anchorX: number,
  anchorY: number,
  anchorZ: number,
  texVariant: number,
  maxAnisotropy = 4,
  facingSign = 1,
): void {
  const kitePivot = new THREE.Group();
  kitePivot.position.set(anchorX, anchorY, anchorZ);
  kitePivot.userData.isDynamicBeachKite = true;
  kitePivot.userData.kiteVariant = texVariant;
  kitePivot.userData.baseX = anchorX;
  kitePivot.userData.baseY = anchorY;
  kitePivot.userData.baseZ = anchorZ;
  kitePivot.userData.noCartoonOutline = true;
  kitePivot.userData.lod1MaxNode = true;

  const key = ((texVariant % 6) + 6) % 6;
  const kiteTex = createCartoonKiteTexture(key, maxAnisotropy);
  const kiteCanopyMat = new THREE.MeshBasicMaterial({
    map: kiteTex,
    color: 0xffffff,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
  });

  const isHexPipa = key === 0 || key === 1 || key === 3 || key === 5;
  const canopyW = isHexPipa ? 2.28 : 2.52;
  const canopyH = isHexPipa ? 2.48 : 2.28;
  const canopyMesh = new THREE.Mesh(new THREE.PlaneGeometry(canopyW, canopyH), kiteCanopyMat);
  canopyMesh.rotation.y = -0.18 * facingSign;
  canopyMesh.rotation.x = 0.22;
  canopyMesh.userData.noCartoonOutline = true;
  canopyMesh.userData.keepVisibleAtAllLods = true;
  kitePivot.add(canopyMesh);

  const ribbonTailGroup = new THREE.Group();
  ribbonTailGroup.position.set(0, -canopyH * 0.45, 0);
  ribbonTailGroup.userData.isKiteRibbonGroup = true;
  ribbonTailGroup.userData.keepVisibleAtAllLods = true;
  canopyMesh.add(ribbonTailGroup);

  const rabiolaLen = 3.45;
  const rabiolaGeo = new THREE.PlaneGeometry(0.56, rabiolaLen, 1, 10);
  rabiolaGeo.translate(0, -rabiolaLen * 0.5, 0);

  const rabiolaTex = createKiteRabiolaTexture(key, maxAnisotropy);
  const rabiolaMat = new THREE.MeshBasicMaterial({
    map: rabiolaTex,
    color: 0xffffff,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
  });
  rabiolaMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = worldCurveUniforms.uPalmWindTime;
    shader.uniforms.uRibbonSeed = { value: key * 1.15 };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uWindTime;
        uniform float uRibbonSeed;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float trailFrac = clamp(-position.y / 3.45, 0.0, 1.0);
        float waveX = sin(trailFrac * 8.2 - uWindTime * 9.0 + uRibbonSeed) * 0.52 * pow(trailFrac, 1.15) + trailFrac * 0.48;
        float waveZ = cos(trailFrac * 6.5 - uWindTime * 7.4 + uRibbonSeed * 1.3) * 0.24 * trailFrac;
        transformed.x += waveX;
        transformed.z += waveZ;`,
      );
  };
  rabiolaMat.customProgramCacheKey = () => `kite-rabiola-main-${key}`;
  applyWorldCurvatureToMaterial(rabiolaMat);

  const rabiolaMesh = new THREE.Mesh(rabiolaGeo, rabiolaMat);
  rabiolaMesh.rotation.z = 0.18 * facingSign;
  rabiolaMesh.userData.noCartoonOutline = true;
  rabiolaMesh.userData.keepVisibleAtAllLods = true;
  ribbonTailGroup.add(rabiolaMesh);

  parentGroup.add(kitePivot);
}

/**
 * Builds the Left Sidewalk Retaining Wall Segment ("Muro de Contenção com Escadaria e Grafite")
 */
export function buildLeftCoastalRetainingWallSegment(
  variantIndex: number,
  maxAnisotropy = 4,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Left_Coastal_Retaining_Wall_${variantIndex}`;
  group.userData.keepAllMeshesVisible = true;

  const segLenZ = 15.6;
  const wallH = 2.45;
  const wallThick = 1.15;

  const wallPal = FAVELA_PALETTES[variantIndex % 4];
  const wallTex = getFavelaHouseTexture(wallPal.wall, wallPal.trim, true, maxAnisotropy, variantIndex + 20);
  const texturedWallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0xffffff,
    roughness: 0.74,
    metalness: 0.04,
  });

  const mainWall = new THREE.Mesh(sharedGeos.unitBox, texturedWallMat);
  mainWall.scale.set(wallThick, wallH, segLenZ);
  mainWall.position.set(-wallThick * 0.5, wallH * 0.5, 0);
  group.add(mainWall);

  const topCap = new THREE.Mesh(sharedGeos.unitBox, coastalWallCapMat);
  topCap.scale.set(wallThick + 0.24, 0.26, segLenZ);
  topCap.position.set(-wallThick * 0.5, wallH + 0.13, 0);
  group.add(topCap);

  // Pilastras coloniais creme e floreiras tropicais ao longo da base do muro
  for (const pz of [-6.8, -2.2, 2.2, 6.8]) {
    const pilaster = new THREE.Mesh(sharedGeos.unitBox, condoWarmCreamMat);
    pilaster.scale.set(0.28, wallH + 0.18, 0.55);
    pilaster.position.set(0.06, wallH * 0.5, pz);
    group.add(pilaster);
  }

  // Escadaria colonial em terracota e madeira quente (substituindo blocos cinzas!)
  const stairStartZ = 1.2;
  for (let s = 0; s < 6; s++) {
    const stepY = 0.35 + s * 0.38;
    const stepZ = stairStartZ - s * 0.68;
    const stepMesh = new THREE.Mesh(sharedGeos.unitBox, sharedMats.clayBrick);
    stepMesh.scale.set(1.25, 0.36, 0.68);
    stepMesh.position.set(-0.45, stepY, stepZ);
    stepMesh.userData.lod2MaxNode = true;
    group.add(stepMesh);

    const baluster = new THREE.Mesh(sharedGeos.unitBox, condoWarmCreamMat);
    baluster.scale.set(0.24, stepY + 0.52, 0.72);
    baluster.position.set(0.08, (stepY + 0.52) * 0.5, stepZ);
    baluster.userData.lod2MaxNode = true;
    group.add(baluster);
  }

  // Street-art graffiti mural
  const gamefyTex = createRioWallGraffitiTexture(maxAnisotropy);
  const gamefyMat = new THREE.MeshBasicMaterial({
    map: gamefyTex,
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  applyWorldCurvatureToMaterial(gamefyMat);

  const muralPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.15, 2.34), gamefyMat);
  muralPlane.rotation.y = Math.PI / 2;
  muralPlane.position.set(0.04, 1.32, 4.75);
  muralPlane.userData.noCartoonOutline = true;
  group.add(muralPlane);

  // Wooden park bench
  if (variantIndex % 2 === 0) {
    const benchGroup = new THREE.Group();
    benchGroup.position.set(0.62, 0, -4.5);

    const seat = new THREE.Mesh(sharedGeos.unitBox, benchWoodMat);
    seat.scale.set(0.68, 0.1, 2.15);
    seat.position.set(0, 0.48, 0);
    benchGroup.add(seat);

    const back = new THREE.Mesh(sharedGeos.unitBox, benchWoodMat);
    back.scale.set(0.1, 0.48, 2.15);
    back.position.set(-0.28, 0.76, 0);
    back.rotation.z = 0.12;
    benchGroup.add(back);

    for (const lz of [-0.88, 0, 0.88]) {
      const legF = new THREE.Mesh(sharedGeos.unitBox, benchWoodMat);
      legF.scale.set(0.12, 0.48, 0.12);
      legF.position.set(0.22, 0.24, lz);
      benchGroup.add(legF);

      const legB = new THREE.Mesh(sharedGeos.unitBox, benchWoodMat);
      legB.scale.set(0.12, 0.48, 0.12);
      legB.position.set(-0.22, 0.24, lz);
      benchGroup.add(legB);
    }
    group.add(benchGroup);
  }

  // Trash bin
  const binGroup = new THREE.Group();
  binGroup.position.set(0.45, 0, -2.35);
  const binBody = new THREE.Mesh(sharedGeos.unitBox, trashBinBodyMat);
  binBody.scale.set(0.58, 0.96, 0.62);
  binBody.position.set(0, 0.48, 0);
  binBody.userData.lod2MaxNode = true;
  binGroup.add(binBody);

  const binLid = new THREE.Mesh(sharedGeos.unitBox, sharedMats.darkMetal);
  binLid.scale.set(0.64, 0.1, 0.68);
  binLid.position.set(0, 0.98, 0);
  binLid.userData.lod2MaxNode = true;
  binGroup.add(binLid);
  group.add(binGroup);

  // Left palm
  const leftPalm = buildCoastalCoconutPalm(variantIndex, 0.94, 0.14);
  leftPalm.position.set(0.55, 0, -6.2);
  group.add(leftPalm);

  addCartoonOutlinesToGroup(group);

  if (variantIndex === 0) {
    buildSingleBrazilianKiteWithRabiola(
      group,
      -1.2,
      3.6,
      -1.8,
      -1.4,
      12.8,
      -1.2,
      1,
      maxAnisotropy,
      -1,
    );
  }

  applyWorldCurvatureToGroup(group);
  return group;
}

function buildBeachUmbrellaSet(variantIndex: number): THREE.Group {
  const group = new THREE.Group();
  const [colA, colB] = umbrellaStripePalettes[variantIndex % umbrellaStripePalettes.length];
  const matA = new THREE.MeshStandardMaterial({ color: colA, roughness: 0.55 });
  const matB = new THREE.MeshStandardMaterial({ color: colB, roughness: 0.55 });

  const shadow = new THREE.Mesh(sharedGeos.contactShadow, sharedMats.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.55, 1.55, 1);
  shadow.position.set(0, 0.03, 0);
  group.add(shadow);

  const umbrellaPivot = new THREE.Group();
  umbrellaPivot.rotation.z = ((variantIndex % 3) - 1) * 0.12;
  umbrellaPivot.rotation.x = ((variantIndex % 2) - 0.5) * 0.1;

  const pole = new THREE.Mesh(sharedGeos.cylinder, beachPoleWhiteMat);
  pole.scale.set(0.055, 2.35, 0.055);
  pole.position.set(0, 1.15, 0);
  umbrellaPivot.add(pole);

  const numPanels = 8;
  const radius = 1.62;
  for (let p = 0; p < numPanels; p++) {
    const a = (p / numPanels) * Math.PI * 2;
    const panel = new THREE.Mesh(sharedGeos.unitBox, p % 2 === 0 ? matA : matB);
    panel.scale.set(radius * 0.62, 0.09, radius * 0.44);
    panel.position.set(Math.cos(a) * radius * 0.46, 2.18, Math.sin(a) * radius * 0.46);
    panel.rotation.y = -a;
    panel.rotation.z = -0.32;
    panel.userData.keepVisibleAtAllLods = true;
    umbrellaPivot.add(panel);
  }

  const cap = new THREE.Mesh(sharedGeos.cone, matA);
  cap.scale.set(0.28, 0.22, 0.28);
  cap.position.set(0, 2.38, 0);
  umbrellaPivot.add(cap);

  group.add(umbrellaPivot);

  const chairColors = [0x0284c7, 0xef4444, 0xfacc15];
  for (const sideDir of [-1, 1]) {
    const chairMat = new THREE.MeshStandardMaterial({
      color: chairColors[(variantIndex + (sideDir > 0 ? 1 : 0)) % chairColors.length],
      roughness: 0.6,
    });
    const chair = new THREE.Group();
    chair.position.set(sideDir * 0.72, 0.18, 0.15);
    chair.rotation.y = 0.35 + sideDir * 0.12;

    const seat = new THREE.Mesh(sharedGeos.unitBox, chairMat);
    seat.scale.set(0.56, 0.08, 1.05);
    seat.position.set(0, 0.06, 0);
    seat.userData.lod2MaxNode = true;
    chair.add(seat);

    const backrest = new THREE.Mesh(sharedGeos.unitBox, chairMat);
    backrest.scale.set(0.56, 0.62, 0.08);
    backrest.position.set(0, 0.32, -0.45);
    backrest.rotation.x = -0.45;
    backrest.userData.lod2MaxNode = true;
    chair.add(backrest);

    group.add(chair);
  }

  return group;
}

function buildBeachTentGazebo(variantIndex: number): THREE.Group {
  const group = new THREE.Group();
  const canopyMat = new THREE.MeshStandardMaterial({
    color: variantIndex % 2 === 0 ? 0x0ea5e9 : 0xfacc15,
    roughness: 0.55,
  });

  const W = 2.55;
  const H = 2.25;
  for (const lx of [-W * 0.46, W * 0.46]) {
    for (const lz of [-W * 0.46, W * 0.46]) {
      const leg = new THREE.Mesh(sharedGeos.cylinder, beachPoleWhiteMat);
      leg.scale.set(0.045, H, 0.045);
      leg.position.set(lx, H * 0.5, lz);
      group.add(leg);
    }
  }

  const roof = new THREE.Mesh(sharedGeos.cone, canopyMat);
  roof.scale.set(W * 0.82, 0.95, W * 0.82);
  roof.rotation.y = Math.PI * 0.25;
  roof.position.set(0, H + 0.42, 0);
  roof.userData.keepVisibleAtAllLods = true;
  group.add(roof);

  const towelMat = new THREE.MeshStandardMaterial({
    color: variantIndex % 2 === 0 ? 0xf43f5e : 0x06b6d4,
    roughness: 0.8,
  });
  const towel = new THREE.Mesh(sharedGeos.unitBox, towelMat);
  towel.scale.set(1.25, 0.04, 1.75);
  towel.position.set(0, 0.04, 0);
  towel.userData.lod2MaxNode = true;
  group.add(towel);

  return group;
}

/**
 * Builds the Iconic Elevated Wooden Lifeguard Tower ("Posto Salva-Vidas de Madeira")
 */
export function buildWoodenLifeguardTower(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Wooden_Beach_Lifeguard_Tower';

  const stiltH = 2.45;
  const deckW = 2.65;
  const deckD = 2.65;

  for (const sx of [-0.95, 0.95]) {
    for (const sz of [-0.95, 0.95]) {
      const stilt = new THREE.Mesh(sharedGeos.unitBox, lifeguardWoodMat);
      stilt.scale.set(0.24, stiltH + 0.6, 0.24);
      stilt.position.set(sx, (stiltH - 0.3) * 0.5, sz);
      stilt.userData.keepVisibleAtAllLods = true;
      group.add(stilt);
    }
  }

  for (const sz of [-0.95, 0.95]) {
    for (const dir of [-1, 1]) {
      const brace = new THREE.Mesh(sharedGeos.unitBox, lifeguardWoodMat);
      brace.scale.set(2.45, 0.14, 0.14);
      brace.position.set(0, stiltH * 0.52, sz);
      brace.rotation.z = dir * 0.68;
      brace.userData.lod2MaxNode = true;
      group.add(brace);
    }
  }
  for (const sx of [-0.95, 0.95]) {
    for (const dir of [-1, 1]) {
      const brace = new THREE.Mesh(sharedGeos.unitBox, lifeguardWoodMat);
      brace.scale.set(0.14, 0.14, 2.45);
      brace.position.set(sx, stiltH * 0.52, 0);
      brace.rotation.x = dir * 0.68;
      brace.userData.lod2MaxNode = true;
      group.add(brace);
    }
  }

  const deckPlatform = new THREE.Mesh(sharedGeos.unitBox, lifeguardWoodMat);
  deckPlatform.scale.set(deckW, 0.24, deckD);
  deckPlatform.position.set(0, stiltH, 0);
  deckPlatform.userData.keepVisibleAtAllLods = true;
  group.add(deckPlatform);

  const railH = 0.82;
  for (const rx of [-deckW * 0.46, deckW * 0.46]) {
    for (const rz of [-deckD * 0.46, deckD * 0.46]) {
      const post = new THREE.Mesh(sharedGeos.unitBox, lifeguardWoodMat);
      post.scale.set(0.14, railH, 0.14);
      post.position.set(rx, stiltH + railH * 0.5, rz);
      post.userData.lod2MaxNode = true;
      group.add(post);
    }
  }
  for (const rz of [-deckD * 0.46, deckD * 0.46]) {
    const railBar = new THREE.Mesh(sharedGeos.unitBox, lifeguardWoodMat);
    railBar.scale.set(deckW, 0.12, 0.12);
    railBar.position.set(0, stiltH + railH, rz);
    railBar.userData.lod2MaxNode = true;
    group.add(railBar);
  }
  for (const rx of [-deckW * 0.46, deckW * 0.46]) {
    const railBar = new THREE.Mesh(sharedGeos.unitBox, lifeguardWoodMat);
    railBar.scale.set(0.12, 0.12, deckD);
    railBar.position.set(rx, stiltH + railH, 0);
    railBar.userData.lod2MaxNode = true;
    group.add(railBar);
  }

  const cabW = 1.82;
  const cabH = 1.95;
  const cabD = 1.82;
  const cabin = new THREE.Mesh(sharedGeos.unitBox, lifeguardWoodMat);
  cabin.scale.set(cabW, cabH, cabD);
  cabin.position.set(0, stiltH + cabH * 0.5 + 0.1, 0);
  cabin.userData.keepVisibleAtAllLods = true;
  group.add(cabin);

  const winFront = new THREE.Mesh(sharedGeos.unitBox, condoDarkWindowMat);
  winFront.scale.set(cabW * 0.65, 0.68, cabD + 0.08);
  winFront.position.set(0, stiltH + cabH * 0.64, 0);
  group.add(winFront);

  const winSide = new THREE.Mesh(sharedGeos.unitBox, condoDarkWindowMat);
  winSide.scale.set(cabW + 0.08, 0.68, cabD * 0.65);
  winSide.position.set(0, stiltH + cabH * 0.64, 0);
  group.add(winSide);

  const roofBaseY = stiltH + cabH + 0.12;
  const roofL = new THREE.Mesh(sharedGeos.unitBox, lifeguardRoofWoodMat);
  roofL.scale.set(1.55, 0.18, 2.45);
  roofL.position.set(-0.62, roofBaseY + 0.28, 0);
  roofL.rotation.z = 0.36;
  roofL.userData.keepVisibleAtAllLods = true;
  group.add(roofL);

  const roofR = new THREE.Mesh(sharedGeos.unitBox, lifeguardRoofWoodMat);
  roofR.scale.set(1.55, 0.18, 2.45);
  roofR.position.set(0.62, roofBaseY + 0.28, 0);
  roofR.rotation.z = -0.36;
  roofR.userData.keepVisibleAtAllLods = true;
  group.add(roofR);

  return group;
}

let sharedSandDriftRoadMat: THREE.MeshBasicMaterial | null = null;
function getSharedSandDriftRoadMat(maxAnisotropy = 4): THREE.MeshBasicMaterial {
  if (!sharedSandDriftRoadMat) {
    const driftTex = createBlownSandRoadDriftTexture(maxAnisotropy);
    sharedSandDriftRoadMat = new THREE.MeshBasicMaterial({
      map: driftTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    applyWorldCurvatureToMaterial(sharedSandDriftRoadMat);
  }
  return sharedSandDriftRoadMat;
}

function buildBeachKiteAndSoftFocusBeachgoers(
  variantIndex: number,
  maxAnisotropy = 4,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Beach_Kite_And_Beachgoers_${variantIndex}`;
  group.userData.keepAllMeshesVisible = true;
  group.userData.noCartoonOutline = true;

  const sandYAtX = (x: number) => Math.min(0.08, -(x - 9.85) * 0.03);

  const personX = 16.55 + (variantIndex % 3) * 0.55;
  const personZ = -1.2 + (variantIndex % 2) * 2.4;

  const shirtColors = [0xff4d6d, 0x00b4d8, 0xffbe0b, 0x8338ec, 0x06d6a0, 0xfb5607];
  const shortsColors = [0x1d3557, 0xf1faee, 0x2b2d42, 0x023e8a, 0x3a0ca3, 0x118ab2];

  const createSoftFocusPerson = (
    px: number,
    pz: number,
    shirtHex: number,
    shortsHex: number,
    isFlyingKite: boolean,
    scale = 1.0,
  ) => {
    const pGroup = new THREE.Group();
    pGroup.position.set(px, sandYAtX(px), pz);
    pGroup.scale.setScalar(scale);
    pGroup.userData.noCartoonOutline = true;

    const shells: Array<[number, number, boolean]> = [
      [1.0, 0.76, false],
      [1.46, 0.28, true],
    ];
    for (const [shellScale, shellOpacity, isOuterBokeh] of shells) {
      const skinMat = new THREE.MeshBasicMaterial({
        color: 0xd99b72,
        transparent: true,
        opacity: shellOpacity,
        depthWrite: false,
      });
      const shirtMat = new THREE.MeshBasicMaterial({
        color: shirtHex,
        transparent: true,
        opacity: shellOpacity,
        depthWrite: false,
      });
      const shortsMat = new THREE.MeshBasicMaterial({
        color: shortsHex,
        transparent: true,
        opacity: shellOpacity,
        depthWrite: false,
      });

      const torso = new THREE.Mesh(sharedGeos.cylinder, shirtMat);
      torso.scale.set(0.14 * shellScale, 0.42 * shellScale, 0.11 * shellScale);
      torso.position.set(0, 0.88, 0);
      torso.userData.noCartoonOutline = true;
      torso.userData.lod2MaxNode = isOuterBokeh;
      pGroup.add(torso);

      const shorts = new THREE.Mesh(sharedGeos.unitBox, shortsMat);
      shorts.scale.set(0.26 * shellScale, 0.24 * shellScale, 0.19 * shellScale);
      shorts.position.set(0, 0.56, 0);
      shorts.userData.noCartoonOutline = true;
      shorts.userData.lod2MaxNode = isOuterBokeh;
      pGroup.add(shorts);

      for (const lx of [-0.07, 0.07]) {
        const leg = new THREE.Mesh(sharedGeos.cylinder, skinMat);
        leg.scale.set(0.055 * shellScale, 0.46, 0.055 * shellScale);
        leg.position.set(lx, 0.24, 0);
        leg.userData.noCartoonOutline = true;
        leg.userData.lod2MaxNode = isOuterBokeh;
        pGroup.add(leg);
      }

      const head = new THREE.Mesh(sharedGeos.sphere, skinMat);
      head.scale.setScalar(0.145 * shellScale);
      head.position.set(0, 1.28, 0);
      head.userData.noCartoonOutline = true;
      head.userData.lod2MaxNode = isOuterBokeh;
      pGroup.add(head);

      if (isFlyingKite && !isOuterBokeh) {
        const arm = new THREE.Mesh(sharedGeos.cylinder, skinMat);
        arm.scale.set(0.048 * shellScale, 0.42, 0.048 * shellScale);
        arm.position.set(0.16, 1.18, -0.05);
        arm.rotation.z = -0.52;
        arm.userData.noCartoonOutline = true;
        arm.userData.lod2MaxNode = true;
        pGroup.add(arm);
      }
    }
    return pGroup;
  };

  const kiteFlyer = createSoftFocusPerson(
    personX,
    personZ,
    shirtColors[variantIndex % shirtColors.length],
    shortsColors[variantIndex % shortsColors.length],
    true,
    0.95,
  );
  group.add(kiteFlyer);

  const companionX = personX + 1.15;
  const companionZ = personZ + 2.2;
  const companion = createSoftFocusPerson(
    companionX,
    companionZ,
    shirtColors[(variantIndex + 2) % shirtColors.length],
    shortsColors[(variantIndex + 3) % shortsColors.length],
    true,
    0.9,
  );
  group.add(companion);

  if (variantIndex % 2 === 0) {
    const kiteVariants = [1, 0, 2];
    const slotIdx = (variantIndex >> 1) % kiteVariants.length;
    buildSingleBrazilianKiteWithRabiola(
      group,
      personX + 0.35,
      sandYAtX(personX) + 1.28,
      personZ - 0.05,
      13.2 + slotIdx * 1.4,
      12.6 + slotIdx * 3.2,
      personZ - 1.5,
      kiteVariants[slotIdx],
      maxAnisotropy,
      1,
    );
  }

  return group;
}

export function buildBeachfrontPropCluster(variantIndex: number, maxAnisotropy = 4): THREE.Group {
  const group = new THREE.Group();
  group.name = `Beachfront_Prop_Cluster_${variantIndex}`;
  group.userData.keepAllMeshesVisible = true;

  const sandYAtX = (x: number) => Math.min(0.08, -(x - 9.85) * 0.03);

  const sandDriftRoadMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 15.2, 2, 2),
    getSharedSandDriftRoadMat(maxAnisotropy),
  );
  sandDriftRoadMesh.rotation.x = -Math.PI / 2;
  sandDriftRoadMesh.position.set(6.25, 0.238, 0);
  sandDriftRoadMesh.userData.noCartoonOutline = true;
  sandDriftRoadMesh.userData.lod2MaxNode = true;
  group.add(sandDriftRoadMesh);

  for (const bz of [-5.2, 0.0, 5.2]) {
    const bollardRoad = new THREE.Mesh(sharedGeos.cylinder, lifeguardWoodMat);
    bollardRoad.scale.set(0.11, 0.68, 0.11);
    bollardRoad.position.set(6.36, 0.45, bz);
    bollardRoad.userData.lod2MaxNode = true;
    group.add(bollardRoad);

    const bollardSand = new THREE.Mesh(sharedGeos.cylinder, coastalWallStoneMat);
    bollardSand.scale.set(0.1, 0.56, 0.1);
    bollardSand.position.set(9.78, 0.38, bz + 2.6);
    bollardSand.userData.lod2MaxNode = true;
    group.add(bollardSand);
  }

  if (variantIndex % 3 === 0) {
    const beachBillboard = buildWoodenBeachBillboard(variantIndex, 'right', maxAnisotropy);
    beachBillboard.scale.setScalar(0.84);
    beachBillboard.position.set(10.05, 0.08, 3.6);
    beachBillboard.rotation.y = -0.34;
    group.add(beachBillboard);
  }

  const palmX = 10.85 + (variantIndex % 2) * 0.95;
  const promenadePalm = buildCoastalCoconutPalm(
    variantIndex,
    1.04 + (variantIndex % 3) * 0.07,
    0.26,
  );
  promenadePalm.position.set(palmX, sandYAtX(palmX), -2.4);
  group.add(promenadePalm);

  if (variantIndex % 2 === 1) {
    const palm2X = 13.05;
    const sandPalm = buildCoastalCoconutPalm(variantIndex + 3, 0.92, -0.16);
    sandPalm.position.set(palm2X, sandYAtX(palm2X), 4.4);
    group.add(sandPalm);
  }

  const umb1X = 12.6 + (variantIndex % 3) * 0.75;
  const umb1 = buildBeachUmbrellaSet(variantIndex * 2);
  umb1.position.set(umb1X, sandYAtX(umb1X), 2.8);
  group.add(umb1);

  const umb2X = 14.45 + ((variantIndex + 1) % 3) * 0.65;
  const umb2 = buildBeachUmbrellaSet(variantIndex * 2 + 1);
  umb2.position.set(umb2X, sandYAtX(umb2X), -3.6);
  group.add(umb2);

  if (variantIndex % 3 === 0) {
    const towerX = 15.85;
    const lifeguardTower = buildWoodenLifeguardTower();
    lifeguardTower.position.set(towerX, sandYAtX(towerX), 0.8);
    lifeguardTower.rotation.y = -0.16;
    group.add(lifeguardTower);
  } else if (variantIndex % 3 === 1) {
    const tentX = 15.25;
    const beachTent = buildBeachTentGazebo(variantIndex);
    beachTent.position.set(tentX, sandYAtX(tentX), 1.6);
    beachTent.rotation.y = 0.22;
    group.add(beachTent);
  }

  addCartoonOutlinesToGroup(group);

  const kiteAndBeachgoers = buildBeachKiteAndSoftFocusBeachgoers(variantIndex, maxAnisotropy);
  group.add(kiteAndBeachgoers);

  applyWorldCurvatureToGroup(group);
  return group;
}

/**
 * Builds the Complete Right-Side Golden Beach Sand, Dynamic Animated Ocean with Shimmering Solar Reflection
 */
export function buildBeachSandAndOceanBackdrop(maxAnisotropy = 4): {
  group: THREE.Group;
  sandTex: THREE.CanvasTexture;
  update: (elapsed: number, moveZ: number) => void;
} {
  const group = new THREE.Group();
  group.name = 'Rio_Golden_Beach_And_Dynamic_Ocean';

  const sandTex = createGoldenBeachSandTexture(maxAnisotropy);
  const sandMat = new THREE.MeshStandardMaterial({
    map: sandTex,
    color: 0xffffff,
    roughness: 0.84,
    metalness: 0.04,
    fog: false,
  });
  applyWorldCurvatureToMaterial(sandMat);

  const sandGeo = new THREE.PlaneGeometry(38.0, 330.0, 18, 72);
  sandGeo.rotateX(-Math.PI / 2);
  const sandPos = sandGeo.attributes.position;
  for (let i = 0; i < sandPos.count; i++) {
    const lx = sandPos.getX(i);
    const lz = sandPos.getZ(i);
    const bayCurveX = -Math.pow(Math.max(0, -lz - 20.0) / 235.0, 1.35) * 2.8;
    const worldX = 27.0 + lx + bayCurveX;
    const slopeY = Math.min(0.1, -(worldX - 9.85) * 0.03);
    sandPos.setX(i, lx + bayCurveX);
    sandPos.setY(i, slopeY);
  }
  sandGeo.computeVertexNormals();

  const sandMesh = new THREE.Mesh(sandGeo, sandMat);
  sandMesh.position.set(27.0, 0, -142.0);
  sandMesh.updateMatrix();
  sandMesh.matrixAutoUpdate = false;
  group.add(sandMesh);

  const oceanUniforms = {
    uTime: { value: 0 },
    uWorldCurveY: worldCurveUniforms.uWorldCurveY,
    uWorldCurveX: worldCurveUniforms.uWorldCurveX,
    uCurveStartZ: worldCurveUniforms.uCurveStartZ,
    uLadeiraSlope: worldCurveUniforms.uLadeiraSlope,
    uRoadWindPhase: worldCurveUniforms.uRoadWindPhase,
    uSunsetOrangeMix: worldCurveUniforms.uSunsetOrangeMix,
    uNightDarknessMix: worldCurveUniforms.uNightDarknessMix,
    uSunWorldPos: worldCurveUniforms.uSunWorldPos,
    uSunActiveOpacity: worldCurveUniforms.uSunActiveOpacity,
  };

  const oceanMat = new THREE.ShaderMaterial({
    uniforms: oceanUniforms,
    transparent: true,
    depthWrite: true,
    fog: false,
    vertexShader: `
      uniform float uTime;
      uniform float uWorldCurveY;
      uniform float uWorldCurveX;
      uniform float uCurveStartZ;
      uniform float uLadeiraSlope;
      uniform float uRoadWindPhase;
      varying vec3 vOceanWorldPos;
      varying float vShoreDist;
      varying float vWaveCrest;

      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);

        float bayShiftX = -pow(max(0.0, -wp.z - 20.0) / 235.0, 1.35) * 2.8;
        float shorelineX = 17.8 + bayShiftX;
        float shoreDist = wp.x - shorelineX;
        vShoreDist = shoreDist;

        float swellEnv = smoothstep(-2.0, 10.0, shoreDist);
        float wave1 = sin(wp.x * 0.28 + wp.z * 0.09 + uTime * 2.15) * 0.18 * swellEnv;
        float wave2 = cos(wp.x * 0.16 - wp.z * 0.14 + uTime * 1.55) * 0.13 * swellEnv;
        float surfSurge = sin(shoreDist * 0.65 + uTime * 2.6 + sin(wp.z * 0.08) * 1.4) * 0.06;
        vWaveCrest = (wave1 + wave2) / max(0.01, 0.31 * swellEnv);

        wp.y += wave1 + wave2 + surfSurge;
        vOceanWorldPos = wp.xyz;

        float curveDist = max(0.0, -(wp.z - uCurveStartZ));
        float curveDistSq = curveDist * curveDist;
        float ladeiraBowl = 4.2 * smoothstep(14.0, 108.0, curveDist) * (1.0 - 0.14 * smoothstep(108.0, 175.0, curveDist));
        float sCurveNear = sin(curveDist * 0.032 + uRoadWindPhase) * 1.95 * smoothstep(16.0, 78.0, curveDist) * uLadeiraSlope;
        float sCurveFar = cos(curveDist * 0.016 - uRoadWindPhase * 0.65) * 1.45 * smoothstep(48.0, 165.0, curveDist) * uLadeiraSlope;

        float heatMask = smoothstep(85.0, 165.0, curveDist);
        float heatWaveY = sin(wp.x * 0.38 + wp.z * 0.15 - uTime * 5.2) * 0.24 * heatMask;
        float heatWaveX = cos(wp.z * 0.22 + uTime * 4.4) * 0.32 * heatMask;

        wp.y -= uWorldCurveY * curveDistSq * 0.16 + ladeiraBowl * uLadeiraSlope - heatWaveY;
        wp.x += uWorldCurveX * curveDistSq + sCurveNear + sCurveFar + heatWaveX;

        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSunWorldPos;
      uniform float uSunActiveOpacity;
      varying vec3 vOceanWorldPos;
      varying float vShoreDist;
      varying float vWaveCrest;
      ${GLSL_TROPICAL_CINEMATIC_GRADE}

      void main() {
        float distZ = max(0.0, -vOceanWorldPos.z);
        float horizonHeat = smoothstep(80.0, 175.0, distZ);
        float heatShimmer = sin(vOceanWorldPos.z * 0.45 - uTime * 6.2 + vOceanWorldPos.x * 0.3) * 0.55 * horizonHeat;

        float zWave = sin(vOceanWorldPos.z * 0.095 + uTime * 0.75) * 1.05
                    + cos(vOceanWorldPos.z * 0.21 - uTime * 1.15) * 0.45;
        float swash = sin(uTime * 2.2 + vOceanWorldPos.z * 0.06) * 0.85;
        float d = vShoreDist + zWave + swash + heatShimmer * 0.35;

        if (d < -1.35) discard;

        vec3 shallowTurquoise = vec3(0.16, 0.78, 0.89);
        vec3 midAquaCyan      = vec3(0.02, 0.62, 0.82);
        vec3 richCerulean     = vec3(0.02, 0.43, 0.74);
        vec3 deepCobaltBlue   = vec3(0.02, 0.28, 0.58);

        vec3 waterCol = mix(shallowTurquoise, midAquaCyan, smoothstep(0.0, 6.5, d));
        waterCol = mix(waterCol, richCerulean, smoothstep(5.5, 16.0, d));
        waterCol = mix(waterCol, deepCobaltBlue, smoothstep(14.0, 42.0, d));

        float wavePhase1 = sin(d * 0.68 + uTime * 2.4 + sin(vOceanWorldPos.z * 0.11) * 1.6);
        float wavePhase2 = cos(vOceanWorldPos.x * 0.36 - vOceanWorldPos.z * 0.18 - uTime * 1.8);
        float crestHighlight = smoothstep(0.52, 0.88, wavePhase1 * 0.65 + wavePhase2 * 0.35);
        vec3 warmCrestRim = mix(vec3(0.24, 0.32, 0.36), vec3(0.98, 0.68, 0.25), 0.55 + 0.35 * uSunsetOrangeMix);
        waterCol = mix(waterCol, waterCol + warmCrestRim, crestHighlight * 0.62);

        float shoreEdgeFoam = smoothstep(1.95, -0.35, d);
        float breakingLine1 = smoothstep(0.72, 0.93, sin(d * 0.92 + uTime * 2.5)) * smoothstep(14.0, 1.0, d);
        float breakingLine2 = smoothstep(0.78, 0.95, cos(d * 0.52 + uTime * 1.9 - vOceanWorldPos.z * 0.08)) * smoothstep(26.0, 4.0, d) * 0.76;

        float totalFoam = clamp(shoreEdgeFoam + breakingLine1 + breakingLine2, 0.0, 1.0);
        vec3 foamColor = mix(vec3(0.98, 0.99, 1.0), vec3(1.0, 0.91, 0.74), 0.32 + 0.42 * uSunsetOrangeMix);
        vec3 finalCol = mix(waterCol, foamColor, totalFoam);

        float sunOverOceanFactor = smoothstep(18.0, 36.0, uSunWorldPos.x) * uSunActiveOpacity * (1.0 - uNightDarknessMix);
        if (sunOverOceanFactor > 0.005) {
          float camToWaterZ = max(1.0, 7.6 - vOceanWorldPos.z);
          float camToSunZ = max(1.0, 7.6 - uSunWorldPos.z);
          float rayFrac = clamp(camToWaterZ / camToSunZ, 0.24, 1.0);
          float sunCenterX = max(21.5, uSunWorldPos.x * rayFrac) + heatShimmer * 1.25;
          float distFromSunPathX = abs(vOceanWorldPos.x - sunCenterX);
          float pathWidth = mix(4.2, 16.5, clamp(distZ / 165.0, 0.0, 1.0));
          float sunPathEnvelope = exp(-pow(distFromSunPathX / max(1.0, pathWidth), 1.6)) * smoothstep(18.0, 52.0, distZ);

          float glitterWave = sin(vOceanWorldPos.z * 0.85 + uTime * 4.2 + sin(vOceanWorldPos.x * 1.4 - uTime * 2.8) * 1.8) * 0.5 + 0.5;
          float glitterFacet = smoothstep(0.24, 0.84, glitterWave * 0.65 + crestHighlight * 0.55);

          float wetSandMirror = smoothstep(5.5, -0.6, d) * exp(-pow(abs(vOceanWorldPos.x - (19.5 + heatShimmer * 0.4)) / 5.2, 1.5)) * smoothstep(22.0, 55.0, distZ);

          float totalSunReflection = clamp(sunPathEnvelope * (0.52 + 0.85 * glitterFacet) + wetSandMirror * 0.72, 0.0, 1.0) * sunOverOceanFactor;
          vec3 sunReflectDeepAmber = vec3(0.99, 0.56, 0.10);
          vec3 sunReflectBrightGold = vec3(1.0, 0.96, 0.72);
          vec3 sunReflectCol = mix(sunReflectDeepAmber, sunReflectBrightGold, clamp(glitterFacet * 0.78 + wetSandMirror * 0.5, 0.0, 1.0));
          finalCol = mix(finalCol, sunReflectCol, totalSunReflection * (0.88 + 0.12 * uSunsetOrangeMix));

          float horizonGlowMix = smoothstep(115.0, 205.0, distZ) * sunPathEnvelope * sunOverOceanFactor;
          vec3 horizonSunHaze = mix(vec3(1.0, 0.80, 0.44), vec3(1.0, 0.62, 0.20), uSunsetOrangeMix);
          finalCol = mix(finalCol, horizonSunHaze, horizonGlowMix * 0.54);
        }

        finalCol = applyTropicalCinematicGrade(finalCol);
        float alpha = smoothstep(-1.35, 0.22, d);
        gl_FragColor = vec4(finalCol, alpha);
      }
    `,
  });

  const oceanGeo = new THREE.PlaneGeometry(240.0, 330.0, 54, 72);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.set(126.0, -0.22, -142.0);
  oceanMesh.updateMatrix();
  oceanMesh.matrixAutoUpdate = false;
  group.add(oceanMesh);

  // Sculpted Rio Coastal Rocky Island on the Horizon
  const islandGroup = new THREE.Group();
  islandGroup.name = 'Sculpted_Coastal_Horizon_Island';
  islandGroup.position.set(66.0, -0.2, -184.0);
  islandGroup.rotation.y = -0.18;
  islandGroup.updateMatrix();
  islandGroup.matrixAutoUpdate = false;

  const islandShaderMat = createMountainSceneryShaderMat();
  const cragIslePeak = createSculptedMountainCragGeo(0.46, 1.0, 16, 10, 1.8, false);
  const cragIsleShoulder = createSculptedMountainCragGeo(0.38, 1.04, 14, 8, 3.2, false);
  const cragIsleApron = createSculptedMountainCragGeo(0.44, 1.24, 14, 8, 4.7, false);

  const islandMergedGeo = mergeMountainCragGeometries([
    { geo: cragIsleApron, x: -6.5, y: 4.2, z: 1.4, sx: 14.0, sy: 10.5, sz: 11.0, rotY: 0.45 },
    { geo: cragIsleApron, x: 5.5, y: 3.8, z: 1.0, sx: 13.5, sy: 9.2, sz: 10.5, rotY: 1.65 },
    { geo: cragIslePeak, x: 1.2, y: 9.8, z: 0.0, sx: 13.8, sy: 22.4, sz: 12.2, rotY: 0.72, rotZ: -0.04 },
    { geo: cragIsleShoulder, x: -8.6, y: 6.8, z: 0.6, sx: 11.2, sy: 15.6, sz: 10.6, rotY: 1.95, rotZ: 0.06 },
    { geo: cragIsleShoulder, x: 9.4, y: 5.6, z: -0.5, sx: 9.8, sy: 12.4, sz: 9.4, rotY: 1.15, rotZ: -0.08 },
  ]);
  cragIslePeak.dispose();
  cragIsleShoulder.dispose();
  cragIsleApron.dispose();

  const islandMassifMesh = new THREE.Mesh(islandMergedGeo, islandShaderMat);
  islandMassifMesh.matrixAutoUpdate = false;
  islandMassifMesh.updateMatrix();
  islandGroup.add(islandMassifMesh);

  const islandTreeCutoutMesh = buildMergedMountainTreeCutoutMesh([
    { x: -10.5, y: 4.2, z: 14.6, w: 12.5, h: 6.4, rotY: 0.16, rotZ: 0.05 },
    { x: -1.5, y: 4.8, z: 15.8, w: 14.2, h: 7.2, rotY: 0.0, rotZ: 0.0 },
    { x: 7.8, y: 4.0, z: 14.4, w: 12.0, h: 6.2, rotY: -0.16, rotZ: -0.05 },
  ]);
  islandGroup.add(islandTreeCutoutMesh);
  group.add(islandGroup);

  return {
    group,
    sandTex,
    update: (elapsed: number, moveZ: number) => {
      oceanUniforms.uTime.value = elapsed;
      if (moveZ > 0) {
        sandTex.offset.y = (sandTex.offset.y + moveZ / 24.0) % 1;
      }
    },
  };
}

/**
 * Builds the 3D Vaulted Overhead & Horizon Cloud Canopy ("nuvens desse mapa da praia")
 * Callable for BOTH Mapa da Favela and Mapa da Praia!
 */
export function buildVaultedCloudCanopy(): {
  mesh: THREE.Mesh;
  update: (elapsed: number, effSunset: number, effNight: number) => void;
} {
  const cloudFlowUniforms = {
    uTime: { value: 0 },
    uSunWorldPos: { value: new THREE.Vector3(-102.0, 99.0, -252.0) },
    uCloudTopColor: { value: new THREE.Color('#FFFFFF') },
    uCloudMidColor: { value: new THREE.Color('#E0F2FE') },
    uCloudShadowColor: { value: new THREE.Color('#7DD3FC') },
    uSunGlowColor: { value: new THREE.Color('#FDE68A') },
    uCloudOpacity: { value: 0.64 },
  };

  const cloudFlowShaderMat = new THREE.ShaderMaterial({
    uniforms: cloudFlowUniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSunWorldPos;
      uniform vec3 uCloudTopColor;
      uniform vec3 uCloudMidColor;
      uniform vec3 uCloudShadowColor;
      uniform vec3 uSunGlowColor;
      uniform float uCloudOpacity;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      float hash21(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 34.45);
        return fract(p.x * p.y);
      }

      float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(
          mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbmFlow(vec2 p) {
        float v = 0.0;
        float amp = 0.52;
        mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
        for (int i = 0; i < 4; i++) {
          v += amp * smoothNoise(p);
          p = rot * p * 2.03 + vec2(13.7, 9.2);
          amp *= 0.48;
        }
        return v;
      }

      void main() {
        float envY = smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
        float envX = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        float envelope = envY * envX;
        if (envelope <= 0.005) discard;

        float perspFreqY = mix(1.0, 2.35, vUv.y * vUv.y);
        float perspFreqX = mix(0.72, 1.65, vUv.y);
        vec2 flowCoord = vec2(
          (vUv.x - 0.5) * 6.4 * perspFreqX - uTime * 0.025,
          vUv.y * 6.2 * perspFreqY - uTime * 0.014
        );

        vec2 warp1 = vec2(
          fbmFlow(flowCoord + vec2(0.0, uTime * 0.014)),
          fbmFlow(flowCoord + vec2(4.3, -uTime * 0.011))
        );
        vec2 warp2 = vec2(
          fbmFlow(flowCoord * 1.32 + warp1 * 1.45 + vec2(1.8, -uTime * 0.016)),
          fbmFlow(flowCoord * 1.32 + warp1 * 1.45 + vec2(7.1, uTime * 0.012))
        );

        float cloudField = fbmFlow(flowCoord * 1.08 + warp2 * 1.28);
        float waveAll = 0.5 + 0.5 * sin(vUv.y * 22.0 * perspFreqY * 0.55 + warp1.x * 2.5 - uTime * 0.08);
        float waveCross = 0.5 + 0.5 * cos(vUv.x * 9.5 - vUv.y * 8.5 + warp1.y * 2.2 - uTime * 0.05);
        float horizonBoost = smoothstep(0.42, 0.88, vUv.y) * 0.14;
        float skyCoverage = 0.74 + 0.36 * (waveAll * 0.58 + waveCross * 0.42) + horizonBoost;

        float combinedDensity = cloudField * skyCoverage;
        float density = smoothstep(0.30, 0.68, combinedDensity) * envelope;
        density = pow(density, 1.06);
        if (density <= 0.008) discard;

        float lightGrad = clamp((1.0 - vUv.y * 0.65) * 0.28 + smoothstep(0.28, 0.76, combinedDensity) * 0.72, 0.0, 1.0);
        vec3 col = mix(uCloudShadowColor, uCloudMidColor, smoothstep(0.0, 0.48, lightGrad));
        col = mix(col, uCloudTopColor, smoothstep(0.40, 0.90, lightGrad));

        float sunDist = length(vec2((vWorldPos.x - uSunWorldPos.x) * 0.65, vWorldPos.y - uSunWorldPos.y));
        float sunHalo = exp(-sunDist * 0.018);
        col = mix(col, uSunGlowColor, sunHalo * 0.52);

        float alpha = clamp(density * uCloudOpacity, 0.0, 0.64);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const cloudVaultGeo = new THREE.PlaneGeometry(460, 296, 48, 64);
  const cPos = cloudVaultGeo.attributes.position;
  const cUv = cloudVaultGeo.attributes.uv;
  for (let i = 0; i < cPos.count; i++) {
    const u = cUv.getX(i);
    const v = cUv.getY(i);
    const invV = 1.0 - v;

    const wx = (u - 0.5) * 460.0;
    const wz = invV * invV * 28.0 + 2.0 * invV * v * -256.0 + v * v * -268.0;
    const lateralDome = Math.pow((u - 0.5) * 2.0, 2.0) * 9.0 * (1.0 - v * 0.65);
    const wy = invV * invV * 34.0 + 2.0 * invV * v * 68.0 + v * v * -6.0 - lateralDome;

    cPos.setXYZ(i, wx, wy, wz);
  }
  cloudVaultGeo.computeVertexNormals();

  const cloudPanoramaMesh = new THREE.Mesh(cloudVaultGeo, cloudFlowShaderMat);
  cloudPanoramaMesh.name = 'Vaulted_Overhead_Horizon_Cloud_Canopy';
  cloudPanoramaMesh.renderOrder = 1;
  cloudPanoramaMesh.frustumCulled = false;

  const cCloudTopDay = new THREE.Color('#FFFFFF');
  const cCloudTopSunset = new THREE.Color('#FFF7ED');
  const cCloudTopNight = new THREE.Color('#93C5FD');

  const cCloudMidDay = new THREE.Color('#E0F2FE');
  const cCloudMidSunset = new THREE.Color('#FDBA74');
  const cCloudMidNight = new THREE.Color('#3B82F6');

  const cCloudShadDay = new THREE.Color('#7DD3FC');
  const cCloudShadSunset = new THREE.Color('#C2410C');
  const cCloudShadNight = new THREE.Color('#1E3A8A');

  const cCloudGlowDay = new THREE.Color('#FEF08A');
  const cCloudGlowSunset = new THREE.Color('#FEF08A');
  const cCloudGlowNight = new THREE.Color('#60A5FA');

  return {
    mesh: cloudPanoramaMesh,
    update: (elapsed: number, effSunset: number, effNight: number) => {
      cloudFlowUniforms.uTime.value = elapsed;
      cloudFlowUniforms.uCloudTopColor.value
        .copy(cCloudTopDay)
        .lerp(cCloudTopSunset, effSunset)
        .lerp(cCloudTopNight, effNight);
      cloudFlowUniforms.uCloudMidColor.value
        .copy(cCloudMidDay)
        .lerp(cCloudMidSunset, effSunset)
        .lerp(cCloudMidNight, effNight);
      cloudFlowUniforms.uCloudShadowColor.value
        .copy(cCloudShadDay)
        .lerp(cCloudShadSunset, effSunset)
        .lerp(cCloudShadNight, effNight);
      cloudFlowUniforms.uSunGlowColor.value
        .copy(cCloudGlowDay)
        .lerp(cCloudGlowSunset, effSunset)
        .lerp(cCloudGlowNight, effNight);
      cloudFlowUniforms.uCloudOpacity.value =
        (0.64 - 0.02 * effSunset) * (1.0 - effNight) + 0.38 * effNight;
    },
  };
}

/**
 * Builds the Vibrant Cinematic Low Horizon Sun, Rising Moon, and Twinkling 3D Starfield
 */
export function buildCinematicOceanHorizonSun(): {
  group: THREE.Group;
  update: (
    elapsed: number,
    preset: 'tropical_morning' | 'sunset_dramatic' | 'violet_dusk',
    autoCycle?: boolean,
  ) => { effSunset: number; effNight: number; cyclePos: number };
} {
  const group = new THREE.Group();
  group.name = 'Cinematic_Ocean_Horizon_Sun_Moon_And_Twinkling_Stars';

  const sunUniforms = {
    uTime: { value: 0 },
    uCoreColor: { value: new THREE.Color('#FFFEFA') },
    uCoronaColor: { value: new THREE.Color('#FDE68A') },
    uOuterGlowColor: { value: new THREE.Color('#FDBA74') },
    uRayIntensity: { value: 0.78 },
    uSunOpacity: { value: 1.0 },
    uMoonOpacity: { value: 0.0 },
    uStarfieldOpacity: { value: 0.0 },
    uNightMix: { value: 0.0 },
  };

  const sunGlowMat = new THREE.ShaderMaterial({
    uniforms: sunUniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uCoreColor;
      uniform vec3 uCoronaColor;
      uniform vec3 uOuterGlowColor;
      uniform float uRayIntensity;
      uniform float uSunOpacity;
      varying vec2 vUv;

      void main() {
        if (uSunOpacity <= 0.01) discard;
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;

        float angle = atan(p.y, p.x);
        float rAnamorphic = length(vec2(p.x * 0.76, p.y * 1.32));

        float ray1 = sin(angle * 12.0 - uTime * 0.28) * 0.5 + 0.5;
        float ray2 = cos(angle * 18.0 + uTime * 0.22) * 0.5 + 0.5;
        float ray3 = sin(angle * 6.0 + uTime * 0.12) * 0.5 + 0.5;
        float sunburstRays = (pow(ray1, 4.0) * 0.54 + pow(ray2, 3.5) * 0.32 + pow(ray3, 2.5) * 0.24)
                            * smoothstep(0.92, 0.18, r) * uRayIntensity;

        float coreDisk = smoothstep(0.22, 0.145, r);
        float innerCorona = exp(-r * 4.2) * 0.68;
        float outerBloom = exp(-rAnamorphic * 2.1) * 0.36;

        vec3 col = mix(uOuterGlowColor, uCoronaColor, smoothstep(0.78, 0.28, rAnamorphic));
        col = mix(col, uCoreColor, clamp(coreDisk * 1.25 + sunburstRays * 0.38, 0.0, 1.0));

        float alpha = clamp(coreDisk + innerCorona * 0.66 + sunburstRays * 0.56 + outerBloom * 0.40, 0.0, 1.0)
                    * smoothstep(1.0, 0.72, r) * uSunOpacity * 0.88;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const sunQuad = new THREE.Mesh(new THREE.PlaneGeometry(112, 112), sunGlowMat);
  sunQuad.position.set(-102.0, 99.0, -252.0);
  sunQuad.rotation.y = -0.14;
  sunQuad.renderOrder = 3;
  group.add(sunQuad);

  const moonGlowMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: sunUniforms.uTime,
      uMoonOpacity: sunUniforms.uMoonOpacity,
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uMoonOpacity;
      varying vec2 vUv;

      void main() {
        if (uMoonOpacity <= 0.01) discard;
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;

        float moonDisk = smoothstep(0.185, 0.155, r);
        float crater1 = smoothstep(0.08, 0.02, length(p - vec2(-0.05, 0.04))) * 0.16;
        float crater2 = smoothstep(0.07, 0.01, length(p - vec2(0.06, -0.03))) * 0.14;
        float crater3 = smoothstep(0.05, 0.01, length(p - vec2(0.02, 0.07))) * 0.12;
        float surfaceShade = 1.0 - (crater1 + crater2 + crater3);

        float innerHalo = exp(-r * 5.2) * 0.82;
        float outerHalo = exp(-r * 2.6) * 0.45 * smoothstep(1.0, 0.1, r);

        vec3 diskCol = vec3(0.96, 0.98, 1.0) * surfaceShade;
        vec3 haloCol = vec3(0.38, 0.76, 0.98);
        vec3 col = haloCol * (outerHalo + innerHalo * 0.65) + diskCol * (moonDisk * 1.25 + innerHalo * 0.35);

        float alpha = clamp(moonDisk * 0.96 + innerHalo * 0.72 + outerHalo * 0.48, 0.0, 1.0) * uMoonOpacity;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const moonQuad = new THREE.Mesh(new THREE.PlaneGeometry(88, 88), moonGlowMat);
  moonQuad.position.set(-68.0, 95.0, -248.0);
  moonQuad.rotation.y = 0.12;
  moonQuad.renderOrder = 3;
  group.add(moonQuad);

  const cloudCanopy = buildVaultedCloudCanopy();
  group.add(cloudCanopy.mesh);

  // Twinkling 3D Starfield
  const numStars = 520;
  const starBaseQuad = new THREE.PlaneGeometry(1.0, 1.0);
  const starPosCount = starBaseQuad.attributes.position.count;
  const starPositions = new Float32Array(numStars * starPosCount * 3);
  const starUvs = new Float32Array(numStars * starPosCount * 2);
  const starSeeds = new Float32Array(numStars * starPosCount);
  const starTints = new Float32Array(numStars * starPosCount * 3);
  const starIndices: number[] = [];

  let sSeed = 9001;
  const sRand = () => {
    sSeed = (sSeed * 1664525 + 1013904223) % 4294967296;
    return sSeed / 4294967296;
  };

  for (let i = 0; i < numStars; i++) {
    const sx = (sRand() - 0.5) * 320.0;
    const sy = -12.0 + sRand() * 96.0;
    const sz = -255.0 - sRand() * 12.0;
    const starSize = 0.48 + Math.pow(sRand(), 2.0) * 0.72;
    const seedVal = sRand() * 100.0;

    const tintRoll = i % 6;
    const tr = tintRoll === 0 ? 1.0 : tintRoll === 1 ? 0.78 : 0.96;
    const tg = tintRoll === 0 ? 0.94 : tintRoll === 1 ? 0.92 : 0.98;
    const tb = tintRoll === 0 ? 0.72 : 1.0;

    for (let v = 0; v < starPosCount; v++) {
      const lx = starBaseQuad.attributes.position.getX(v) * starSize;
      const ly = starBaseQuad.attributes.position.getY(v) * starSize;
      const idx3 = (i * starPosCount + v) * 3;
      starPositions[idx3] = sx + lx;
      starPositions[idx3 + 1] = sy + ly;
      starPositions[idx3 + 2] = sz;

      starTints[idx3] = tr;
      starTints[idx3 + 1] = tg;
      starTints[idx3 + 2] = tb;

      const idx2 = (i * starPosCount + v) * 2;
      starUvs[idx2] = starBaseQuad.attributes.uv.getX(v);
      starUvs[idx2 + 1] = starBaseQuad.attributes.uv.getY(v);

      starSeeds[i * starPosCount + v] = seedVal;
    }

    const bIdx = starBaseQuad.index!.array;
    for (let k = 0; k < bIdx.length; k++) {
      starIndices.push(i * starPosCount + bIdx[k]);
    }
  }
  starBaseQuad.dispose();

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('uv', new THREE.BufferAttribute(starUvs, 2));
  starGeo.setAttribute('aStarSeed', new THREE.BufferAttribute(starSeeds, 1));
  starGeo.setAttribute('aStarTint', new THREE.BufferAttribute(starTints, 3));
  starGeo.setIndex(starIndices);

  const starfieldMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: sunUniforms.uTime,
      uStarfieldOpacity: sunUniforms.uStarfieldOpacity,
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aStarSeed;
      attribute vec3 aStarTint;
      varying vec2 vUv;
      varying float vSeed;
      varying vec3 vTint;
      void main() {
        vUv = uv;
        vSeed = aStarSeed;
        vTint = aStarTint;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uStarfieldOpacity;
      varying vec2 vUv;
      varying float vSeed;
      varying vec3 vTint;
      void main() {
        if (uStarfieldOpacity <= 0.01) discard;
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;

        float speed1 = 2.6 + mod(vSeed * 1.37, 4.2);
        float speed2 = 4.5 + mod(vSeed * 2.91, 4.8);
        float twinkle = 0.28 + 0.72 * pow(0.5 + 0.5 * sin(uTime * speed1 + vSeed) * cos(uTime * speed2 * 0.5 - vSeed * 0.7), 1.5);

        float core = exp(-r * r * 14.0);
        float crossGlint = (exp(-abs(p.x) * 18.0) * exp(-abs(p.y) * 3.6) + exp(-abs(p.y) * 18.0) * exp(-abs(p.x) * 3.6)) * 0.85;
        float alpha = clamp((core * 1.2 + crossGlint) * twinkle * uStarfieldOpacity, 0.0, 1.0);
        if (alpha < 0.02) discard;

        vec3 col = mix(vTint, vec3(1.0), core * 0.72);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const starfieldMesh = new THREE.Mesh(starGeo, starfieldMat);
  group.add(starfieldMesh);

  let currentCelestialPhase = 0.0;
  let lastElapsed = 0.0;
  let presetElapsed = 0.0;
  let lastPreset: 'tropical_morning' | 'sunset_dramatic' | 'violet_dusk' = 'tropical_morning';

  const cDayCore = new THREE.Color('#FFFEFA');
  const cSunsetCore = new THREE.Color('#FFFBEB');
  const cNightCore = new THREE.Color('#F8FAFC');

  const cDayCorona = new THREE.Color('#FDE68A');
  const cSunsetCorona = new THREE.Color('#FDBA74');
  const cNightCorona = new THREE.Color('#38BDF8');

  const cDayOuter = new THREE.Color('#FCD34D');
  const cSunsetOuter = new THREE.Color('#FB923C');
  const cNightOuter = new THREE.Color('#1D4ED8');

  return {
    group,
    update: (
      elapsed: number,
      preset: 'tropical_morning' | 'sunset_dramatic' | 'violet_dusk',
      autoCycle = false,
    ) => {
      const dt = Math.max(0.001, Math.min(0.1, elapsed - lastElapsed));
      lastElapsed = elapsed;
      sunUniforms.uTime.value = elapsed;

      const targetPhase =
        preset === 'tropical_morning' ? 0.0 : preset === 'sunset_dramatic' ? 0.5 : 1.0;
      if (preset !== lastPreset) {
        lastPreset = preset;
        currentCelestialPhase = targetPhase;
        presetElapsed = 0.0;
      } else {
        currentCelestialPhase += (targetPhase - currentCelestialPhase) * Math.min(1.0, dt * 6.0);
        presetElapsed += dt * (autoCycle ? 1.65 : 1.0);
      }

      const celPose = computeCelestialSunMoonDiagonalPose(currentCelestialPhase, presetElapsed);
      sunQuad.position.set(celPose.sunX, celPose.sunY, celPose.sunZ);
      sunQuad.rotation.y = -celPose.sunX * 0.0022;
      moonQuad.position.set(celPose.moonX, celPose.moonY, celPose.moonZ);
      moonQuad.rotation.y = -celPose.moonX * 0.0022;

      const effSunset = celPose.dynamicSunsetMix;
      const effNight = celPose.dynamicNightMix;

      worldCurveUniforms.uSunsetOrangeMix.value = effSunset;
      worldCurveUniforms.uNightDarknessMix.value = effNight;

      worldCurveUniforms.uSunWorldPos.value.set(celPose.sunX, celPose.sunY, celPose.sunZ);
      worldCurveUniforms.uSunActiveOpacity.value = celPose.sunOpacity;

      sunUniforms.uSunOpacity.value = celPose.sunOpacity;
      sunUniforms.uMoonOpacity.value = celPose.moonOpacity;
      sunUniforms.uStarfieldOpacity.value = celPose.starfieldOpacity;
      sunUniforms.uNightMix.value = effNight;

      sunUniforms.uCoreColor.value
        .copy(cDayCore)
        .lerp(cSunsetCore, effSunset)
        .lerp(cNightCore, effNight);
      sunUniforms.uCoronaColor.value
        .copy(cDayCorona)
        .lerp(cSunsetCorona, effSunset)
        .lerp(cNightCorona, effNight);
      sunUniforms.uOuterGlowColor.value
        .copy(cDayOuter)
        .lerp(cSunsetOuter, effSunset)
        .lerp(cNightOuter, effNight);
      sunUniforms.uRayIntensity.value =
        (0.78 + effSunset * 0.18) * (1.0 - effNight) + 0.45 * effNight;

      cloudCanopy.update(elapsed, effSunset, effNight);

      return {
        effSunset,
        effNight,
        cyclePos: celPose.cyclePos,
      };
    },
  };
}

/**
 * Builds a Subtle, Soft-Feathered Beach Sand Breeze Transition
 */
export function buildBlownBeachSandWindEffect(): {
  group: THREE.Group;
  update: (elapsed: number, moveZ: number) => void;
} {
  const group = new THREE.Group();
  group.name = 'Blown_Beach_Sand_To_Street_Effect';

  const sandWindUniforms = {
    uTime: { value: 0 },
    uScrollZ: { value: 0 },
    uWorldCurveY: worldCurveUniforms.uWorldCurveY,
    uWorldCurveX: worldCurveUniforms.uWorldCurveX,
    uCurveStartZ: worldCurveUniforms.uCurveStartZ,
    uLadeiraSlope: worldCurveUniforms.uLadeiraSlope,
    uRoadWindPhase: worldCurveUniforms.uRoadWindPhase,
    uSunsetOrangeMix: worldCurveUniforms.uSunsetOrangeMix,
    uNightDarknessMix: worldCurveUniforms.uNightDarknessMix,
  };

  const streamerMat = new THREE.ShaderMaterial({
    uniforms: sandWindUniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: `
      uniform float uWorldCurveY;
      uniform float uWorldCurveX;
      uniform float uCurveStartZ;
      uniform float uLadeiraSlope;
      uniform float uRoadWindPhase;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;

        float curveDist = max(0.0, -(wp.z - uCurveStartZ));
        float curveDistSq = curveDist * curveDist;
        float ladeiraBowl = 4.2 * smoothstep(14.0, 108.0, curveDist) * (1.0 - 0.14 * smoothstep(108.0, 175.0, curveDist));
        float sCurveNear = sin(curveDist * 0.032 + uRoadWindPhase) * 1.95 * smoothstep(16.0, 78.0, curveDist) * uLadeiraSlope;
        float sCurveFar = cos(curveDist * 0.016 - uRoadWindPhase * 0.65) * 1.45 * smoothstep(48.0, 165.0, curveDist) * uLadeiraSlope;
        wp.y -= uWorldCurveY * curveDistSq * 0.16 + ladeiraBowl * uLadeiraSlope;
        wp.x += uWorldCurveX * curveDistSq + sCurveNear + sCurveFar;

        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uScrollZ;
      uniform float uSunsetOrangeMix;
      uniform float uNightDarknessMix;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        float zCoord = vWorldPos.z + uScrollZ;
        float gentleWave = sin(zCoord * 0.12 + uTime * 0.45) * 0.08;
        float xGrad = smoothstep(0.05, 0.92, vUv.x + gentleWave) * smoothstep(1.0, 0.82, vUv.x);
        float zEnvelope = smoothstep(-145.0, -75.0, vWorldPos.z) * smoothstep(12.0, -2.0, vWorldPos.z);

        float alpha = xGrad * zEnvelope * 0.16 * (1.0 - uNightDarknessMix * 0.45);
        if (alpha < 0.005) discard;

        vec3 sandGold = mix(vec3(0.96, 0.80, 0.36), vec3(1.0, 0.68, 0.24), uSunsetOrangeMix * 0.65);
        gl_FragColor = vec4(sandGold, alpha);
      }
    `,
  });

  const sheetGeo = new THREE.PlaneGeometry(5.2, 150.0, 8, 48);
  sheetGeo.rotateX(-Math.PI / 2);
  const sheetMesh = new THREE.Mesh(sheetGeo, streamerMat);
  sheetMesh.position.set(8.2, 0.25, -64.0);
  group.add(sheetMesh);

  return {
    group,
    update: (elapsed: number, moveZ: number) => {
      sandWindUniforms.uTime.value = elapsed;
      sandWindUniforms.uScrollZ.value = (sandWindUniforms.uScrollZ.value + moveZ) % 1000.0;
    },
  };
}

/**
 * Builds a High-Wing White Single-Engine Coastal Propeller Airplane towing an Animated Banner
 */
export function buildCoastalBannerAirplane(
  planeIndex = 0,
  maxAnisotropy = 4,
): {
  group: THREE.Group;
  update: (elapsed: number) => void;
} {
  const rootGroup = new THREE.Group();
  rootGroup.name = `Coastal_Banner_Airplane_${planeIndex}`;

  const planeBody = new THREE.Group();

  const whitePaintMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.32,
    metalness: 0.08,
    fog: false,
  });
  const burgundyStripeMat = new THREE.MeshStandardMaterial({
    color: 0x581c87,
    roughness: 0.38,
    metalness: 0.12,
    fog: false,
  });
  const goldTrimMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    fog: false,
  });
  const cabinGlassMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.18,
    metalness: 0.35,
    fog: false,
  });
  const tireBlackMat = new THREE.MeshBasicMaterial({
    color: 0x18181b,
    fog: false,
  });

  const cabinBox = new THREE.Mesh(sharedGeos.unitBox, whitePaintMat);
  cabinBox.scale.set(2.8, 1.18, 1.15);
  cabinBox.position.set(0.2, 0, 0);
  planeBody.add(cabinBox);

  const noseCowling = new THREE.Mesh(sharedGeos.unitBox, whitePaintMat);
  noseCowling.scale.set(1.35, 0.92, 0.98);
  noseCowling.position.set(2.05, -0.08, 0);
  planeBody.add(noseCowling);

  const tailCone = new THREE.Mesh(sharedGeos.unitBox, whitePaintMat);
  tailCone.scale.set(2.65, 0.72, 0.68);
  tailCone.position.set(-2.35, 0.06, 0);
  tailCone.rotation.z = -0.06;
  planeBody.add(tailCone);

  const stripeSide = new THREE.Mesh(sharedGeos.unitBox, burgundyStripeMat);
  stripeSide.scale.set(5.9, 0.24, 1.2);
  stripeSide.position.set(-0.25, -0.08, 0);
  planeBody.add(stripeSide);

  const goldStripe = new THREE.Mesh(sharedGeos.unitBox, goldTrimMat);
  goldStripe.scale.set(5.85, 0.08, 1.22);
  goldStripe.position.set(-0.25, 0.08, 0);
  planeBody.add(goldStripe);

  const windshield = new THREE.Mesh(sharedGeos.unitBox, cabinGlassMat);
  windshield.scale.set(0.95, 0.62, 1.08);
  windshield.position.set(1.22, 0.32, 0);
  windshield.rotation.z = -0.38;
  planeBody.add(windshield);

  const sideWindows = new THREE.Mesh(sharedGeos.unitBox, cabinGlassMat);
  sideWindows.scale.set(1.65, 0.44, 1.19);
  sideWindows.position.set(0.15, 0.26, 0);
  planeBody.add(sideWindows);

  const mainWing = new THREE.Mesh(sharedGeos.unitBox, whitePaintMat);
  mainWing.scale.set(1.55, 0.14, 8.6);
  mainWing.position.set(0.35, 0.68, 0);
  planeBody.add(mainWing);

  for (const zTip of [-4.35, 4.35]) {
    const wingTip = new THREE.Mesh(sharedGeos.unitBox, burgundyStripeMat);
    wingTip.scale.set(1.58, 0.16, 0.34);
    wingTip.position.set(0.35, 0.68, zTip);
    planeBody.add(wingTip);
  }

  for (const zSide of [-1, 1]) {
    const strut = new THREE.Mesh(sharedGeos.unitBox, whitePaintMat);
    strut.scale.set(0.09, 2.35, 0.09);
    strut.position.set(0.35, 0.08, zSide * 1.55);
    strut.rotation.x = zSide * 0.92;
    planeBody.add(strut);
  }

  const tailFin = new THREE.Mesh(sharedGeos.unitBox, whitePaintMat);
  tailFin.scale.set(1.28, 1.65, 0.16);
  tailFin.position.set(-3.45, 0.92, 0);
  tailFin.rotation.z = 0.28;
  planeBody.add(tailFin);

  const tailFinStripe = new THREE.Mesh(sharedGeos.unitBox, burgundyStripeMat);
  tailFinStripe.scale.set(1.3, 0.28, 0.19);
  tailFinStripe.position.set(-3.42, 0.55, 0);
  tailFinStripe.rotation.z = 0.28;
  planeBody.add(tailFinStripe);

  const horizStab = new THREE.Mesh(sharedGeos.unitBox, whitePaintMat);
  horizStab.scale.set(0.96, 0.11, 2.85);
  horizStab.position.set(-3.35, 0.28, 0);
  planeBody.add(horizStab);

  const planeStrutMat = new THREE.MeshBasicMaterial({
    color: 0xcbd5e1,
    fog: false,
  });
  const noseStrut = new THREE.Mesh(sharedGeos.unitBox, planeStrutMat);
  noseStrut.scale.set(0.08, 0.78, 0.08);
  noseStrut.position.set(1.85, -0.78, 0);
  noseStrut.rotation.z = 0.18;
  planeBody.add(noseStrut);

  const noseWheel = new THREE.Mesh(sharedGeos.cylinder, tireBlackMat);
  noseWheel.scale.set(0.24, 0.14, 0.24);
  noseWheel.rotation.x = Math.PI / 2;
  noseWheel.position.set(1.92, -1.16, 0);
  planeBody.add(noseWheel);

  for (const zGear of [-0.88, 0.88]) {
    const gearStrut = new THREE.Mesh(sharedGeos.unitBox, planeStrutMat);
    gearStrut.scale.set(0.09, 0.88, 0.09);
    gearStrut.position.set(0.05, -0.82, zGear * 0.68);
    gearStrut.rotation.x = -zGear * 0.42;
    planeBody.add(gearStrut);

    const mainWheel = new THREE.Mesh(sharedGeos.cylinder, tireBlackMat);
    mainWheel.scale.set(0.28, 0.16, 0.28);
    mainWheel.rotation.x = Math.PI / 2;
    mainWheel.position.set(0.05, -1.2, zGear);
    planeBody.add(mainWheel);
  }

  const propPivot = new THREE.Group();
  propPivot.position.set(2.82, -0.08, 0);

  const spinnerCone = new THREE.Mesh(sharedGeos.cone, burgundyStripeMat);
  spinnerCone.scale.set(0.28, 0.45, 0.28);
  spinnerCone.rotation.z = -Math.PI / 2;
  spinnerCone.position.set(0.12, 0, 0);
  propPivot.add(spinnerCone);

  const propBlade = new THREE.Mesh(sharedGeos.unitBox, tireBlackMat);
  propBlade.scale.set(0.06, 1.95, 0.18);
  propPivot.add(propBlade);

  const propBlurMat = new THREE.MeshBasicMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false,
  });
  const propBlurDisc = new THREE.Mesh(new THREE.CircleGeometry(0.98, 20), propBlurMat);
  propBlurDisc.rotation.y = Math.PI / 2;
  propBlurDisc.position.set(0.04, 0, 0);
  propPivot.add(propBlurDisc);

  planeBody.add(propPivot);

  const skyPlaneOutlineMat = new THREE.LineBasicMaterial({
    color: 0x0f172a,
    fog: false,
  });
  const planeMeshes: THREE.Mesh[] = [];
  planeBody.traverse((child) => {
    if (child instanceof THREE.Mesh && child !== propBlurDisc) {
      planeMeshes.push(child);
    }
  });
  for (const m of planeMeshes) {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 28), skyPlaneOutlineMat);
    m.add(edges);
  }

  rootGroup.add(planeBody);

  for (const yEnd of [-1.45, 1.45]) {
    const cableCurve = new THREE.LineCurve3(
      new THREE.Vector3(-3.65, 0.1, 0),
      new THREE.Vector3(-6.8, yEnd, 0),
    );
    const cableGeo = new THREE.TubeGeometry(cableCurve, 4, 0.025, 4, false);
    const cableMesh = new THREE.Mesh(cableGeo, tireBlackMat);
    rootGroup.add(cableMesh);
  }

  const leadBar = new THREE.Mesh(sharedGeos.cylinder, burgundyStripeMat);
  leadBar.scale.set(0.06, 3.35, 0.06);
  leadBar.position.set(-6.8, 0, 0);
  rootGroup.add(leadBar);

  const bannerW = 16.8;
  const bannerH = 3.35;
  const bannerGeo = new THREE.PlaneGeometry(bannerW, bannerH, 32, 4);
  const bannerBaseX = new Float32Array(bannerGeo.attributes.position.count);
  const bannerBaseY = new Float32Array(bannerGeo.attributes.position.count);
  for (let i = 0; i < bannerGeo.attributes.position.count; i++) {
    bannerBaseX[i] = bannerGeo.attributes.position.getX(i);
    bannerBaseY[i] = bannerGeo.attributes.position.getY(i);
  }

  const bannerTex = createAirplaneBannerTexture(maxAnisotropy);
  const bannerMat = new THREE.MeshBasicMaterial({
    map: bannerTex,
    color: 0xffffff,
    transparent: true,
    alphaTest: 0.15,
    side: THREE.DoubleSide,
    fog: false,
  });

  const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
  bannerMesh.position.set(-6.8 - bannerW * 0.5, 0, 0);
  rootGroup.add(bannerMesh);

  const overallScale = planeIndex === 0 ? 1.28 : 1.05;
  rootGroup.scale.setScalar(overallScale);

  return {
    group: rootGroup,
    update: (elapsed: number) => {
      const pose = computeBannerAirplanePose(elapsed, planeIndex);
      rootGroup.visible = pose.visible;
      if (!pose.visible) return;

      rootGroup.position.set(pose.x, pose.y, pose.z);
      rootGroup.rotation.set(pose.rotX, pose.rotY, pose.rotZ);
      propPivot.rotation.x = pose.propellerAngle;

      const posAttr = bannerGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const lx = bannerBaseX[i];
        const ly = bannerBaseY[i];
        const trailFrac = Math.max(0, (bannerW * 0.5 - lx) / bannerW);
        const waveEnv = Math.pow(trailFrac, 1.15);

        const waveZ =
          Math.sin(trailFrac * 10.5 - pose.bannerWavePhase) * 0.62 * waveEnv +
          Math.cos(trailFrac * 18.0 - pose.bannerWavePhase * 1.45 + ly * 0.8) * 0.22 * waveEnv;
        const flutterY =
          Math.sin(trailFrac * 7.5 - pose.bannerWavePhase * 0.85) * 0.24 * waveEnv;

        posAttr.setY(i, ly + flutterY);
        posAttr.setZ(i, waveZ);
      }
      posAttr.needsUpdate = true;
    },
  };
}

export function buildCoastalAirplaneFleet(maxAnisotropy = 4): {
  group: THREE.Group;
  update: (elapsed: number) => void;
} {
  const group = new THREE.Group();
  group.name = 'Coastal_Airplane_Banner_Fleet';
  const plane0 = buildCoastalBannerAirplane(0, maxAnisotropy);
  group.add(plane0.group);

  return {
    group,
    update: (elapsed: number) => {
      plane0.update(elapsed);
    },
  };
}

export function updateBeachKiteNode(kiteNode: THREE.Object3D, elapsed: number): void {
  const variant = (kiteNode.userData.kiteVariant as number) ?? 0;
  const baseX = (kiteNode.userData.baseX as number) ?? kiteNode.position.x;
  const baseY = (kiteNode.userData.baseY as number) ?? kiteNode.position.y;
  const baseZ = (kiteNode.userData.baseZ as number) ?? kiteNode.position.z;
  const pose = computeBeachKitePose(variant, elapsed);

  kiteNode.position.set(baseX + pose.swayX, baseY + pose.bobY, baseZ);
  kiteNode.rotation.set(pose.pitchX, pose.yawY, pose.rollZ);
}

// ============================================================================
// APOCALYPTIC INFERNO MAP BUILDERS ("Estrada do Inferno")
// - Far-Off Cavern Ceiling of Upside-Down Mountains & Inverted Volcanoes Pouring Lava Downward ("deixe as montanhas la em cima bem mais afastada com sensacao de lugar grande, e as montanhas com topo tipo vulcao algumas soltando lava pra baixo")
// - Flanking Erupting Volcanoes with Molten Lava Rivers & Horizon Mist
// - Straight-Line Sky-Climbing Road Leading into a Radiant Horizon Exit Portal & Infinite Horizon Fog ("coloque efeito de neblina fog la no fundo, como se cenario fosse infinito")
// - Destroyed, Roof-Collapsed Houses & Multi-Story Buildings Engulfed in Roaring Flames & Soft Smoke Plumes ("as casas destruídas pegando fogo... predios ao lados destruidos")
// - Broken Utility Poles with All Fallen/Snapped Wires ("e os postes deixe alguns quebrados e os fios dos postes todos caido")
// - Distant, Blurry Winged Creatures in the Sky ("deixe essas criaturas voando bem longe e borradas")
// ============================================================================

/**
 * Builds the Apocalyptic Reddish Sky with Fluid Black-Reddish Clouds (in the exact same C2 quintic domain-warped FBM
 * wind-stream style as the Beach clouds) PLUS Cinematic Diagonal Falling Meteors streaking across the sky:
 * - "revome as montanhas la de cima, deixe um ceu avermelhada com uumas nuvens pretas avvermelhada mesmo estilo das nuvens da praia"
 * - "e se possivel faz uns meteoros caindo em diagonal bem sienmatografico"
 */
export function buildInfernoUpsideDownCeilingMountains(): {
  group: THREE.Group;
  update: (elapsed: number) => void;
} {
  const group = new THREE.Group();
  group.name = 'Inferno_Reddish_Sky_Clouds_And_Diagonal_Meteors';

  const skyUniforms = {
    uTime: { value: 0 },
  };

  // 1. Fluid Black-Reddish Painterly Clouds ("nuvens pretas avvermelhada mesmo estilo das nuvens da praia"):
  // Uses the exact C2 quintic-interpolated domain-warped FBM wind-stream shader (`fbmFlow` + `streamRibbon1/2/3`)
  // from the Beach clouds, styled with deep charcoal-black cloud cores, dark blood-crimson midtones, and fiery scarlet-red rims!
  const infernoCloudFlowMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: skyUniforms.uTime,
      uCloudShadowColor: { value: new THREE.Color('#090101') }, // Deep charcoal-black core
      uCloudMidColor: { value: new THREE.Color('#380505') },    // Dark blood-crimson midtone
      uCloudTopColor: { value: new THREE.Color('#C81E14') },    // Glowing crimson-red underlit rim
      uCloudOpacity: { value: 0.82 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    blending: THREE.NormalBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uCloudTopColor;
      uniform vec3 uCloudMidColor;
      uniform vec3 uCloudShadowColor;
      uniform float uCloudOpacity;
      varying vec2 vUv;

      float hash21(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 34.45);
        return fract(p.x * p.y);
      }

      // C2 Quintic-interpolated value noise -> zero grid artifacts, zero rings or hard layer boundaries
      float smoothNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(
          mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbmFlow(vec2 p) {
        float v = 0.0;
        float amp = 0.52;
        mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
        for (int i = 0; i < 4; i++) {
          v += amp * smoothNoise(p);
          p = rot * p * 2.03 + vec2(13.7, 9.2);
          amp *= 0.48;
        }
        return v;
      }

      void main() {
        // Soft vertical and horizontal feathering so cloud edges dissolve seamlessly into the crimson sky
        float envY = smoothstep(0.02, 0.24, vUv.y) * smoothstep(0.99, 0.72, vUv.y);
        float envX = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        float envelope = envY * envX;
        if (envelope <= 0.005) discard;

        // Anisotropic horizontal wind-stream coordinates ("mesmo estilo das nuvens da praia")
        vec2 flowCoord = vec2(vUv.x * 4.8 - uTime * 0.036, vUv.y * 3.1);

        // Continuous organic domain warping for silky brushstroke flow without any discrete bands
        vec2 warp1 = vec2(
          fbmFlow(flowCoord + vec2(0.0, uTime * 0.015)),
          fbmFlow(flowCoord + vec2(4.3, -uTime * 0.012))
        );
        vec2 warp2 = vec2(
          fbmFlow(flowCoord * 1.35 + warp1 * 1.55 + vec2(1.8, -uTime * 0.019)),
          fbmFlow(flowCoord * 1.35 + warp1 * 1.55 + vec2(7.1, uTime * 0.014))
        );

        float cloudField = fbmFlow(flowCoord * 1.12 + warp2 * 1.35);

        // Sweeping wind ribbons intertwined with the fluid FBM field
        float streamRibbon1 = exp(-pow((vUv.y - (0.34 + sin(vUv.x * 5.0 - uTime * 0.08 + warp1.x * 1.6) * 0.11)) / 0.17, 2.0));
        float streamRibbon2 = exp(-pow((vUv.y - (0.62 + cos(vUv.x * 6.2 - uTime * 0.06 - warp1.y * 1.4) * 0.10)) / 0.16, 2.0));
        float streamRibbon3 = exp(-pow((vUv.y - (0.82 + sin(vUv.x * 4.4 + uTime * 0.05 + warp2.x * 1.2) * 0.08)) / 0.15, 2.0));
        float ribbonFlow = clamp(streamRibbon1 * 0.88 + streamRibbon2 * 0.84 + streamRibbon3 * 0.72, 0.0, 1.0);

        float combinedDensity = cloudField * (0.64 + 0.62 * ribbonFlow);

        // Ultra-smooth continuous density ramp -> zero step lines or concentric contours!
        float density = smoothstep(0.26, 0.68, combinedDensity) * envelope;
        density = pow(density, 1.08);
        if (density <= 0.008) discard;

        // Black-reddish cloud shading: deep black-charcoal interior core with dark crimson midtones
        // and fiery red-orange underlit rims where the inferno glow catches the cloud edges!
        float rimGlow = smoothstep(0.18, 0.52, density) * (1.0 - smoothstep(0.55, 0.88, density)) * 1.45
                      + (1.0 - vUv.y) * 0.35;
        vec3 col = mix(uCloudTopColor, uCloudMidColor, smoothstep(0.18, 0.56, density));
        col = mix(col, uCloudShadowColor, smoothstep(0.46, 0.84, density));
        col = mix(col, vec3(0.92, 0.18, 0.06), clamp(rimGlow * 0.42, 0.0, 0.48));

        float alpha = clamp(density * uCloudOpacity, 0.0, 0.84);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const infernoCloudPanoramaMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(480, 175),
    infernoCloudFlowMat,
  );
  infernoCloudPanoramaMesh.position.set(0.0, 62.0, -188.0);
  group.add(infernoCloudPanoramaMesh);

  // Second high-altitude black-reddish cloud layer spanning the upper crimson sky
  const upperCloudMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 150),
    infernoCloudFlowMat,
  );
  upperCloudMesh.position.set(-16.0, 88.0, -206.0);
  group.add(upperCloudMesh);

  // 2. Cinematic Diagonal Falling Meteors ("e se possivel faz uns meteoros caindo em diagonal bem sienmatografico"):
  // Each meteor features a blazing white-gold fireball head, a 3D molten meteoroid rock core, and a long, tapered
  // diagonal plasma-fire & dark ember-smoke wake oriented along its diagonal fall trajectory!
  const meteorRockGeo = new THREE.DodecahedronGeometry(0.95, 0);
  const meteorRockMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    fog: false,
  });

  const meteors: Array<{
    root: THREE.Group;
    rockMesh: THREE.Mesh;
    uniforms: { uTime: { value: number }; uOpacity: { value: number }; uSeed: { value: number } };
  }> = [];

  for (let i = 0; i < 5; i++) {
    const mUniforms = {
      uTime: skyUniforms.uTime,
      uOpacity: { value: 1.0 },
      uSeed: { value: i * 2.37 + 1.1 },
    };

    const meteorShaderMat = new THREE.ShaderMaterial({
      uniforms: mUniforms,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      fog: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform float uSeed;
        varying vec2 vUv;

        void main() {
          // vUv.x = 0.0 at tail tip, vUv.x = 0.84 at blazing meteor head
          // vUv.y = 0.5 along the diagonal centerline
          float u = vUv.x;
          float v = (vUv.y - 0.5) * 2.0;

          // 1. Blazing Fireball Head at (u = 0.84, v = 0.0)
          vec2 headP = vec2((u - 0.84) * 4.2, v * 0.96);
          float headR = length(headP);
          float fireballCore = exp(-headR * headR * 9.5);
          float fireballHalo = exp(-headR * 2.6) * smoothstep(1.3, 0.08, headR);

          // Cinematic star-flare spikes around the meteor fireball head
          float flareAngle = atan(headP.y, headP.x);
          float starSpikes = pow(abs(cos(flareAngle * 2.0 + 0.4)), 8.0) * exp(-headR * 3.1) * 0.92;

          // 2. Long Tapered Diagonal Plasma-Fire & Glowing Ember Tail (u in 0.0 .. 0.84)
          float tailLenMask = smoothstep(0.0, 0.78, u) * smoothstep(0.92, 0.76, u);
          float wave = sin(u * 24.0 - uTime * 16.0 + uSeed) * 0.08 * (1.0 - u);
          float tailHalfWidth = mix(0.64, 0.22, pow(u, 0.72));
          float radialTail = exp(-pow((v + wave) / max(0.06, tailHalfWidth), 2.0) * 2.1);

          // Streaking glowing ember sparks inside the meteor wake
          float sparkWave = 0.76 + 0.24 * sin(u * 38.0 - uTime * 22.0 + cos(v * 8.0 + uSeed));
          float tailIntensity = radialTail * tailLenMask * sparkWave;

          float totalMask = clamp(fireballCore * 1.65 + fireballHalo * 1.15 + starSpikes + tailIntensity * 1.35, 0.0, 1.0);
          if (totalMask <= 0.015) discard;

          vec3 tailCrimsonOrange = vec3(0.98, 0.26, 0.05);
          vec3 midPlasmaGold = vec3(1.0, 0.76, 0.18);
          vec3 headPureWhite = vec3(1.0, 1.0, 0.96);

          vec3 col = mix(tailCrimsonOrange, midPlasmaGold, smoothstep(0.20, 0.74, u * radialTail + fireballHalo * 0.55));
          col = mix(col, headPureWhite, clamp(fireballCore * 1.45 + starSpikes * 0.95 + pow(radialTail, 2.5) * smoothstep(0.48, 0.84, u) * 0.85, 0.0, 1.0));

          float edgeFeather = smoothstep(1.0, 0.65, abs(v)) * smoothstep(0.0, 0.08, u) * smoothstep(1.0, 0.92, u);
          float alpha = clamp(totalMask * edgeFeather * uOpacity, 0.0, 0.99);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    const mRoot = new THREE.Group();
    const trailQuad = new THREE.Mesh(new THREE.PlaneGeometry(36.0, 7.6), meteorShaderMat);
    mRoot.add(trailQuad);

    const rockMesh = new THREE.Mesh(meteorRockGeo, meteorRockMat);
    rockMesh.position.set(36.0 * (0.84 - 0.5), 0, 0.1);
    rockMesh.scale.set(0.85, 0.65, 0.65);
    mRoot.add(rockMesh);

    group.add(mRoot);
    meteors.push({ root: mRoot, rockMesh, uniforms: mUniforms });
  }

  return {
    group,
    update: (elapsed: number) => {
      skyUniforms.uTime.value = elapsed;
      for (let i = 0; i < meteors.length; i++) {
        const m = meteors[i];
        const pose = computeInfernoMeteorPose(i, elapsed);
        m.root.position.set(pose.x, pose.y, pose.z);
        m.root.rotation.set(0, 0, pose.angleZ);
        m.root.scale.setScalar(pose.scale);
        m.uniforms.uOpacity.value = pose.opacity;
        m.rockMesh.rotation.x = elapsed * 3.2 + i;
        m.rockMesh.rotation.y = elapsed * 2.4 + i;
      }
    },
  };
}

/**
 * Builds a Monumental 3D Horned Sitting Dog Statue ("com estatua, cachorro com chifres" / "estátua de cachorro sentado la em cima da montanha")
 * perched on a stepped stone pedestal on top of each of the 2 imposing mountains.
 * Features seated haunches, upward-curved tail, sloping back, straight vertical front legs, proud chest,
 * spiked black obsidian collar, extended snout, pointed ears, blazing eyes, and sweeping curved demonic horns ("chifres")
 * with crisp black graphic outlines ("detalhes pretos").
 */
function buildSittingDogStatueOnPedestal(
  sideSign: -1 | 1,
  statueScale: number,
  statueMat: THREE.Material,
  blackDetailMat: THREE.Material,
  glowEyeMat: THREE.Material,
  eyeHaloMat: THREE.Material,
): THREE.Group {
  const dogGroup = new THREE.Group();

  const addPart = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    sx: number,
    sy: number,
    sz: number,
    px: number,
    py: number,
    pz: number,
    rx = 0,
    ry = 0,
    rz = 0,
  ) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(px, py, pz);
    mesh.rotation.set(rx, ry, rz);
    dogGroup.add(mesh);
    return mesh;
  };

  // 1. Stepped Stone Monument Pedestal Plinth with Black Obsidian Trim Bands ("detalhes pretos")
  addPart(sharedGeos.unitBox, blackDetailMat, 6.8, 0.55, 7.8, 0, 0.28, 0);
  addPart(sharedGeos.unitBox, statueMat, 6.2, 1.0, 7.2, 0, 0.95, 0);
  addPart(sharedGeos.unitBox, blackDetailMat, 5.5, 0.38, 6.5, 0, 1.55, 0);
  addPart(sharedGeos.unitBox, statueMat, 5.0, 0.85, 6.0, 0, 2.05, 0);

  // 2. Seated Hindquarters / Haunches & Folded Hind Legs (at back of pedestal, z < 0)
  addPart(sharedGeos.unitBox, statueMat, 2.85, 3.0, 3.1, 0, 3.75, -1.45, 0.26, 0, 0);
  for (const lx of [-1.26, 1.26]) {
    // Folded hind thigh
    addPart(sharedGeos.unitBox, statueMat, 1.02, 2.55, 2.4, lx, 3.55, -1.2, -0.34, 0, 0);
    // Seated hind paw flat on pedestal
    addPart(sharedGeos.unitBox, statueMat, 0.9, 0.72, 1.8, lx * 0.94, 2.68, 0.15);
    // Black obsidian hind claws
    addPart(sharedGeos.cone, blackDetailMat, 0.26, 0.55, 0.45, lx * 0.94, 2.55, 1.12, Math.PI * 0.45, 0, 0);
  }

  // 3. Upward-Curved Canine Tail at the Back of the Haunches with Black Spiked Tip
  addPart(sharedGeos.unitBox, statueMat, 0.66, 2.65, 0.72, 0, 4.25, -2.88, -0.66, 0, 0);
  addPart(sharedGeos.unitBox, statueMat, 0.56, 2.45, 0.62, 0, 5.95, -3.62, -0.22, 0, 0);
  addPart(sharedGeos.cone, blackDetailMat, 0.68, 1.45, 0.68, 0, 7.35, -3.88, -0.15, 0, 0);

  // 4. Sloping Canine Back, Black Dorsal Spine Ridge & Proud Upright Ribcage/Chest
  addPart(sharedGeos.unitBox, statueMat, 2.55, 5.1, 2.65, 0, 6.25, -0.42, 0.44, 0, 0);
  addPart(sharedGeos.unitBox, statueMat, 2.82, 3.45, 2.62, 0, 7.55, 0.58, 0.18, 0, 0);
  // Dark black breastplate / chest armor detail
  addPart(sharedGeos.unitBox, blackDetailMat, 1.65, 2.45, 0.42, 0, 7.45, 1.82, 0.18, 0, 0);

  // 5. Straight Vertical Front Legs & Front Paws (at front of pedestal, z = +1.48, leaving clear daylight gap behind them!)
  for (const fx of [-0.85, 0.85]) {
    addPart(sharedGeos.unitBox, statueMat, 0.76, 5.1, 0.8, fx, 4.85, 1.48);
    addPart(sharedGeos.unitBox, statueMat, 0.86, 0.72, 1.38, fx, 2.68, 1.88);
    addPart(sharedGeos.cone, blackDetailMat, 0.28, 0.58, 0.48, fx, 2.55, 2.65, Math.PI * 0.45, 0, 0);
  }

  // 6. Upright Muscular Canine Neck & Spiked Black Obsidian Collar ("detalhes pretos")
  addPart(sharedGeos.unitBox, statueMat, 2.05, 2.85, 2.15, 0, 9.65, 0.92, 0.15, 0, 0);
  addPart(sharedGeos.unitBox, blackDetailMat, 2.38, 0.58, 2.48, 0, 9.1, 0.9, 0.15, 0, 0);
  for (const sx of [-1.25, 0, 1.25]) {
    addPart(
      sharedGeos.cone,
      blackDetailMat,
      0.42,
      1.05,
      0.42,
      sx,
      9.25,
      sx === 0 ? 2.28 : 1.55,
      0.75,
      0,
      sx * -0.45,
    );
  }

  // 7. Canine Head, Extended Forward Snout/Muzzle, Black Nose & Blazing Hellhound Eyes
  addPart(sharedGeos.unitBox, statueMat, 2.28, 2.18, 2.42, 0, 11.38, 1.24);
  addPart(sharedGeos.unitBox, statueMat, 1.44, 1.26, 2.45, 0, 11.05, 2.65);
  addPart(sharedGeos.unitBox, statueMat, 1.22, 0.55, 2.05, 0, 10.45, 2.42);
  addPart(sharedGeos.unitBox, blackDetailMat, 0.76, 0.62, 0.65, 0, 11.42, 3.78);

  // Blazing crimson-red glowing eyes ("faca os olhos das estatua brilhando vermelho")
  // Positioned at the outer-front brow corners so both eyes are prominent in 3/4 profile, with camera-facing red glow halos!
  const eyeGlowGeo = new THREE.PlaneGeometry(4.6, 4.6);
  for (const ex of [-0.96, 0.96]) {
    const eye = addPart(sharedGeos.unitBox, glowEyeMat, 0.72, 0.52, 0.76, ex, 11.72, 2.38);
    eye.userData.noCartoonOutline = true;

    const halo = new THREE.Mesh(eyeGlowGeo, eyeHaloMat);
    halo.position.set(ex * 1.16, 11.72, 2.82);
    halo.rotation.y = sideSign < 0 ? -1.28 : 1.28;
    halo.renderOrder = 28;
    halo.userData.noCartoonOutline = true;
    dogGroup.add(halo);
  }

  // 8. Tall Pointed Perked Canine Ears (slightly further back on the skull)
  for (const ex of [-0.82, 0.82]) {
    addPart(
      sharedGeos.cone,
      statueMat,
      0.66,
      2.65,
      0.86,
      ex,
      13.25,
      0.55,
      -0.12,
      0,
      ex < 0 ? 0.12 : -0.12,
    );
  }

  // 9. Prominent Sweeping Curved Demonic Horns ("cachorro com chifres")!
  // Built as multi-segment curved horn chains sweeping forward, upward, and curving sharply at the tips
  // in pitch-black obsidian so the horns ("chifres") are 100% unmistakable in profile against the red sky!
  for (const hSign of [-1, 1]) {
    // Horn base emerging from the brow ridge
    addPart(
      sharedGeos.cylinder,
      blackDetailMat,
      0.56,
      1.95,
      0.56,
      hSign * 0.74,
      12.95,
      1.72,
      0.55,
      0,
      hSign * -0.28,
    );
    // Mid horn sweeping forward and upward
    addPart(
      sharedGeos.cylinder,
      blackDetailMat,
      0.44,
      2.15,
      0.44,
      hSign * 1.08,
      14.35,
      2.48,
      0.24,
      0,
      hSign * -0.18,
    );
    // Upper horn curving backward/upward to a tall sharp point above the head!
    addPart(
      sharedGeos.cone,
      blackDetailMat,
      0.42,
      2.75,
      0.42,
      hSign * 1.26,
      16.25,
      2.55,
      -0.28,
      0,
      hSign * -0.08,
    );
  }

  dogGroup.scale.setScalar(statueScale);
  // Rotate into a clear 3/4 side profile facing inward toward the road so the sitting dog + horns silhouette is unmistakable!
  dogGroup.rotation.y = sideSign < 0 ? 1.28 : -1.28;
  return dogGroup;
}

/**
 * Builds ONLY the 2 Imposing Rocky Mountains Closest to the Road with Black Crag Details & Horned Dog Statues on Top
 * ("deixe so 2 montanhas as que esta mais proximo da rua as do fundo tire, e deixe bem imponentes as montanhas com detalhes pretos etc com estatua, cachorro com chifres").
 */
export function buildInfernoFlankingVolcanoes(): {
  group: THREE.Group;
  update: (elapsed: number) => void;
} {
  const group = new THREE.Group();
  group.name = 'Inferno_Two_Imposing_Mountains_With_Horned_Dog_Statues';

  // Dedicated un-curved black graphic ink outline material for static horizon mountains & horned dog statues
  const staticMountainInkLineMat = new THREE.LineBasicMaterial({
    color: 0x050101,
    transparent: true,
    opacity: 0.92,
    fog: false,
  });

  const mainPeakGeo = createSculptedMountainCragGeo(0.28, 1.0, 9, 6, 3.1, true);
  const jaggedSpireGeo = createSculptedMountainCragGeo(0.05, 1.0, 7, 5, 5.8, true);
  const mainPeakEdgesGeo = new THREE.EdgesGeometry(mainPeakGeo, 6);
  const jaggedSpireEdgesGeo = new THREE.EdgesGeometry(jaggedSpireGeo, 6);

  const addStaticBlackOutlines = (root: THREE.Object3D) => {
    const meshes: THREE.Mesh[] = [];
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && !obj.userData.noCartoonOutline) {
        meshes.push(obj);
      }
    });
    for (const m of meshes) {
      const edgesGeo =
        m.geometry === mainPeakGeo
          ? mainPeakEdgesGeo
          : m.geometry === jaggedSpireGeo
            ? jaggedSpireEdgesGeo
            : getCachedEdgesGeo(m.geometry);
      const line = new THREE.LineSegments(edgesGeo, staticMountainInkLineMat);
      line.userData.isOutlineMesh = true;
      m.add(line);
    }
  };

  // High-contrast imposing dark crimson & pitch-black chiseled crag mountain shader ("bem imponentes com detalhes pretos etc")
  const mountainShaderMat = new THREE.ShaderMaterial({
    fog: false,
    vertexShader: `
      varying vec3 vLocalPos;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      void main() {
        vLocalPos = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec3 vLocalPos;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;

      void main() {
        vec3 dpx = dFdx(vWorldPos);
        vec3 dpy = dFdy(vWorldPos);
        vec3 faceN = normalize(cross(dpx, dpy));

        // 0.0 at base (-0.5), 1.0 at flat mountain summit (+0.5)
        float hNorm = clamp(vLocalPos.y + 0.5, 0.0, 1.0);

        // Dramatic side-rim lighting from the central road exit portal so outer & recessed crag faces are pitch black!
        vec3 lightDir = normalize(vec3(-sign(vWorldPos.x) * 0.94, 0.24, -0.22));
        float facetLit = clamp(dot(faceN, lightDir), 0.0, 1.0);

        // Jagged vertical rock fault shadow bands for rich black cliff detail ("detalhes pretos")
        float cliffBand = sin(vLocalPos.x * 14.0 + sin(hNorm * 9.0) * 1.6);
        float blackFaultMask = smoothstep(0.35, 0.72, cliffBand) * (1.0 - smoothstep(0.55, 0.85, facetLit));

        // 3-Tone Graphic Chiseled Rock Shading: Pitch-Black Shadow Facets -> Deep Blood Crimson -> Fiery Scarlet Rim
        vec3 pitchBlackRock = vec3(0.03, 0.008, 0.008);
        vec3 darkCrimsonRock = vec3(0.36, 0.05, 0.04);
        vec3 fieryRidgeHighlight = vec3(0.78, 0.18, 0.07);

        float midMask = smoothstep(0.18, 0.26, facetLit) * (1.0 - blackFaultMask * 0.88);
        float hiMask = smoothstep(0.54, 0.64, facetLit) * smoothstep(0.12, 0.88, hNorm);

        vec3 col = mix(pitchBlackRock, darkCrimsonRock, midMask);
        col = mix(col, fieryRidgeHighlight, hiMask);

        // Subtle horizon mist only at the very bottom base so the mountains stay crisp, dark, and imposing!
        float baseMist = (1.0 - smoothstep(0.0, 0.20, hNorm)) * 0.26;
        vec3 fogCol = vec3(0.58, 0.09, 0.05);
        col = mix(col, fogCol, baseMist);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  // Chiseled dark basalt & crimson monument material for the Horned Sitting Dog Statues
  const dogStatueShaderMat = new THREE.ShaderMaterial({
    fog: false,
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      void main() {
        vec3 lightDir = normalize(vec3(-sign(vWorldPos.x) * 0.55, 0.52, 0.62));
        float diff = clamp(dot(vNormalW, lightDir) * 0.5 + 0.5, 0.0, 1.0);
        float rim = pow(clamp(1.0 - abs(vNormalW.z), 0.0, 1.0), 1.6);
        vec3 pitchBlackShadow = vec3(0.03, 0.008, 0.008);
        vec3 darkStoneMid = vec3(0.38, 0.07, 0.05);
        vec3 fieryRim = vec3(0.92, 0.30, 0.10);
        vec3 col = mix(pitchBlackShadow, darkStoneMid, smoothstep(0.28, 0.72, diff));
        col = mix(col, fieryRim, rim * 0.45);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const blackObsidianDetailMat = new THREE.MeshBasicMaterial({
    color: 0x070101,
    fog: false,
  });

  const hellhoundEyeGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff1a1a,
    fog: false,
  });

  // Intense additive crimson-red eye glow halo shader ("faca os olhos das estatua brilhando vermelho")
  const hellhoundEyeHaloMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;
        float core = exp(-r * r * 11.0) * 2.25;
        float halo = exp(-r * 3.0) * 1.25 * smoothstep(1.0, 0.12, r);
        vec3 redCore = vec3(1.0, 0.38, 0.28);
        vec3 deepRedHalo = vec3(1.0, 0.03, 0.01);
        vec3 col = deepRedHalo * halo + redCore * core;
        float alpha = clamp(core + halo * 0.95, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  // ONLY 2 Mountains — the 2 closest to the road ("deixe so 2 montanhas as que esta mais proximo da rua as do fundo tire")!
  const twoMountainsClosestToRoad: Array<{
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    rotY: number;
    sideSign: -1 | 1;
    dogScale: number;
  }> = [
    // Left Imposing Mountain Closest to the Road with Horned Sitting Dog Statue on top
    { x: -42.0, y: 21.5, z: -112.0, sx: 36.0, sy: 43.0, sz: 28.0, rotY: 0.65, sideSign: -1, dogScale: 1.35 },
    // Right Imposing Mountain Closest to the Road with Horned Sitting Dog Statue on top
    { x: 42.0, y: 21.5, z: -114.0, sx: 36.0, sy: 43.0, sz: 28.0, rotY: 1.95, sideSign: 1, dogScale: 1.35 },
  ];

  for (const m of twoMountainsClosestToRoad) {
    const massifGroup = new THREE.Group();
    massifGroup.position.set(m.x, 0, m.z);

    // 1. Central Towering Flat-Topped Chiseled Crag Peak
    const mMesh = new THREE.Mesh(mainPeakGeo, mountainShaderMat);
    mMesh.position.set(0, m.y, 0);
    mMesh.scale.set(m.sx, m.sy, m.sz);
    mMesh.rotation.y = m.rotY;
    massifGroup.add(mMesh);

    // 2. Jagged Flanking Rock Buttresses & Black-Shadowed Crag Spires ("bem imponentes com detalhes pretos etc")
    const buttressConfigs = [
      // Inner shoulder crag facing toward the road
      { dx: -m.sideSign * 11.5, y: m.y + 1.5, dz: 4.5, sx: 16.0, sy: 34.0, sz: 15.0, rz: m.sideSign * 0.22, ry: 0.8 },
      // Outer dramatic jagged cliff peak jutting high on the outer flank
      { dx: m.sideSign * 14.0, y: m.y + 3.5, dz: -2.0, sx: 19.0, sy: 38.0, sz: 17.0, rz: -m.sideSign * 0.24, ry: 2.1 },
      // Outer secondary crag spur
      { dx: m.sideSign * 22.5, y: m.y - 2.0, dz: -4.0, sx: 17.0, sy: 30.0, sz: 15.0, rz: -m.sideSign * 0.28, ry: 1.4 },
    ];
    for (const bc of buttressConfigs) {
      const spire = new THREE.Mesh(jaggedSpireGeo, mountainShaderMat);
      spire.position.set(bc.dx, bc.y, bc.dz);
      spire.scale.set(bc.sx, bc.sy, bc.sz);
      spire.rotation.set(0, bc.ry, bc.rz);
      massifGroup.add(spire);
    }

    // 3. Sharp Pitch-Black Obsidian Rock Spikes & Crag Ribs jutting from the mountain slopes ("detalhes pretos")
    const blackSpikes = [
      { dx: -m.sideSign * 9.5, y: m.y + 10.5, dz: 6.5, sx: 3.6, sy: 15.0, sz: 3.6, rz: m.sideSign * 0.34 },
      { dx: m.sideSign * 11.0, y: m.y + 12.0, dz: 4.5, sx: 4.2, sy: 16.5, sz: 4.2, rz: -m.sideSign * 0.38 },
      { dx: -m.sideSign * 5.2, y: m.y + 14.5, dz: 7.8, sx: 2.8, sy: 11.5, sz: 2.8, rz: m.sideSign * 0.26 },
      { dx: m.sideSign * 6.0, y: m.y + 15.0, dz: 7.2, sx: 3.2, sy: 12.0, sz: 3.2, rz: -m.sideSign * 0.28 },
    ];
    for (const bs of blackSpikes) {
      const spike = new THREE.Mesh(sharedGeos.cone, blackObsidianDetailMat);
      spike.position.set(bs.dx, bs.y, bs.dz);
      spike.scale.set(bs.sx, bs.sy, bs.sz);
      spike.rotation.z = bs.rz;
      spike.rotation.x = 0.18;
      massifGroup.add(spike);
    }

    // 4. Monumental Horned Sitting Dog Statue ("estatua, cachorro com chifres") perched on top of the mountain summit!
    const summitY = m.y + m.sy * 0.5 - 0.45;
    const dogStatue = buildSittingDogStatueOnPedestal(
      m.sideSign,
      m.dogScale,
      dogStatueShaderMat,
      blackObsidianDetailMat,
      hellhoundEyeGlowMat,
      hellhoundEyeHaloMat,
    );
    dogStatue.position.set(0, summitY, 0);
    massifGroup.add(dogStatue);

    // Apply static (un-curved) crisp black graphic outlines to both the mountain crags and the horned dog statue!
    addStaticBlackOutlines(massifGroup);

    group.add(massifGroup);
  }

  return {
    group,
    update: () => {
      // Static imposing mountains and horned sitting dog statues
    },
  };
}

/**
 * Builds the Compact, Pure Radial White-Gold Horizon Light at the Summit Tip of the Narrowing Road
 * ("remove esse quadrado de luz da rua, e deixe a luz pouco menor e a estrad ficando menor horizonte")
 * PLUS the Seamless Gaussian Infinite Horizon Fog & Volumetric Atmospheric Mist!
 */
export function buildInfernoHorizonExitPortal(): {
  group: THREE.Group;
  update: (elapsed: number) => void;
} {
  const group = new THREE.Group();
  group.name = 'Inferno_Horizon_Exit_Portal_And_Infinite_Fog';

  const portalUniforms = {
    uTime: { value: 0 },
  };

  // 1. Seamless Gaussian Infinite Horizon Fog / Mist ("efeito de neblina fog la no fundo, como se cenario fosse infinito")
  const horizonFogMat = new THREE.ShaderMaterial({
    uniforms: portalUniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.NormalBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float drift = sin(p.x * 3.5 + uTime * 0.25) * 0.08 + cos(p.x * 6.0 - uTime * 0.18) * 0.05;
        float py = p.y + drift;

        // Smooth Gaussian envelope fading to 0.0 well before all 4 borders of the quad!
        float gaussY = exp(-py * py * 3.8) * smoothstep(1.0, 0.18, abs(p.y));
        float gaussX = exp(-p.x * p.x * 1.8) * smoothstep(1.0, 0.15, abs(p.x));
        float mistMask = gaussY * gaussX;
        if (mistMask <= 0.01) discard;

        float centerWarmth = exp(-p.x * p.x * 6.5);
        vec3 deepCrimsonFog = vec3(0.80, 0.14, 0.08);
        vec3 fieryAmberFog = vec3(0.98, 0.44, 0.14);
        vec3 portalWhiteMist = vec3(1.0, 0.96, 0.88);

        vec3 col = mix(deepCrimsonFog, fieryAmberFog, clamp(0.5 - py * 0.5, 0.0, 1.0));
        col = mix(col, portalWhiteMist, centerWarmth * 0.48);

        float alpha = clamp(mistMask * (0.42 + centerWarmth * 0.18), 0.0, 0.64);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const fogLayer1 = new THREE.Mesh(new THREE.PlaneGeometry(360, 95), horizonFogMat);
  fogLayer1.position.set(0, 18.0, -148.0);
  group.add(fogLayer1);

  const fogLayer2 = new THREE.Mesh(new THREE.PlaneGeometry(400, 110), horizonFogMat);
  fogLayer2.position.set(0, 27.5, -174.0);
  group.add(fogLayer2);

  const fogLayer3 = new THREE.Mesh(new THREE.PlaneGeometry(450, 130), horizonFogMat);
  fogLayer3.position.set(0, 36.0, -206.0);
  group.add(fogLayer3);

  // 2. Compact, Pure Circular Radial White-Gold Light at the Summit Tip of the Narrowing Road (z = -178.0, y = 33.2)
  // ("remove esse quadrado de luz da rua, e deixe a luz pouco menor")
  const portalMat = new THREE.ShaderMaterial({
    uniforms: portalUniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r > 1.0) discard;

        // Pure radial circular falloff (zero rectangular/arch box shapes!)
        float pulse = 0.95 + 0.05 * sin(uTime * 3.5);
        float whiteHotCore = exp(-r * r * 15.0) * 1.85 * pulse;
        float innerWhiteGlow = exp(-r * 4.4) * 1.25;
        float outerHalo = exp(-r * 2.6) * 0.65 * smoothstep(1.0, 0.18, r);

        // Soft radial crepuscular rays around the circular horizon light
        float angle = atan(p.y, p.x);
        float rayWave = pow(sin(angle * 8.0 + uTime * 0.55) * 0.5 + 0.5, 2.2) * 0.58
                      + pow(cos(angle * 14.0 - uTime * 0.75) * 0.5 + 0.5, 2.4) * 0.44;
        float rays = rayWave * exp(-r * 2.7) * smoothstep(0.03, 0.15, r) * 1.05;

        vec3 pureWhite = vec3(1.0, 1.0, 1.0);
        vec3 warmWhiteCorona = vec3(1.0, 0.98, 0.92);
        vec3 outerGoldAmber = vec3(1.0, 0.78, 0.36);

        vec3 col = outerGoldAmber * (outerHalo + rays * 0.72)
                 + warmWhiteCorona * (innerWhiteGlow + rays * 0.96)
                 + pureWhite * (whiteHotCore * 2.15);

        float alpha = clamp(whiteHotCore + innerWhiteGlow * 0.92 + outerHalo * 0.62 + rays * 0.82, 0.0, 1.0) * smoothstep(1.0, 0.68, r);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  // Compact 44x44 pure circular radial light quad at the summit tip of the road (rendered in front of fog layers, zero square road patch!)
  const portalQuad = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), portalMat);
  portalQuad.position.set(0, 33.8, -168.0);
  portalQuad.renderOrder = 25;
  group.add(portalQuad);

  return {
    group,
    update: (elapsed: number) => {
      portalUniforms.uTime.value = elapsed;
    },
  };
}

const sharedInfernoFireUniforms = {
  uTime: { value: 0 },
};

const infernoRoaringFireMat = new THREE.ShaderMaterial({
  uniforms: sharedInfernoFireUniforms,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  fog: false,
  blending: THREE.AdditiveBlending,
  vertexShader: `
    uniform float uWorldCurveY;
    uniform float uWorldCurveX;
    uniform float uCurveStartZ;
    uniform float uLadeiraSlope;
    uniform float uRoadWindPhase;
    uniform float uInfernoMapMix;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      float curveDist = max(0.0, -(wp.z - uCurveStartZ));
      float curveDistSq = curveDist * curveDist;
      float ladeiraBowl = 9.6 * smoothstep(4.0, 64.0, curveDist) * (1.0 - 0.18 * smoothstep(64.0, 155.0, curveDist));
      float beachDropY = -(uWorldCurveY * curveDistSq * 0.16 + ladeiraBowl * uLadeiraSlope);

      float infernoDip = -1.35 * smoothstep(2.0, 26.0, curveDist) * (1.0 - smoothstep(28.0, 72.0, curveDist));
      float infernoClimbDist = min(166.0, max(0.0, curveDist - 24.0));
      float infernoSkyClimb = pow(infernoClimbDist / 165.0, 1.72) * 34.5;
      float infernoY = infernoDip + infernoSkyClimb;
      float pinchFactor = mix(-0.76 * smoothstep(18.0, 166.0, curveDist), -0.98, smoothstep(162.0, 172.0, curveDist));
      float infernoPinchX = wp.x * pinchFactor;

      wp.y *= mix(1.0, max(0.04, 1.0 + pinchFactor), uInfernoMapMix);
      wp.y += mix(beachDropY, infernoY, uInfernoMapMix);
      wp.x += infernoPinchX * uInfernoMapMix;
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      float xCentered = (vUv.x - 0.5) * 2.0;
      float yNorm = vUv.y;

      // Dynamic multi-tongue roaring flame distortion
      float seed = vWorldPos.z * 0.35 + vWorldPos.x * 0.25;
      float wave1 = sin(yNorm * 9.5 - uTime * 8.2 + seed) * 0.22 * yNorm;
      float wave2 = cos(yNorm * 16.0 - uTime * 11.5 - seed * 1.7) * 0.14 * yNorm;
      float tongueJagged = sin(vUv.x * 18.0 + uTime * 5.5 + seed) * 0.12 * yNorm;

      float distFromCenter = abs(xCentered + wave1 + wave2) + tongueJagged;
      float widthAtHeight = mix(0.92, 0.18, pow(yNorm, 1.15));
      float flameMask = smoothstep(widthAtHeight, widthAtHeight * 0.25, distFromCenter) * smoothstep(0.0, 0.12, yNorm) * smoothstep(1.0, 0.72, yNorm);
      if (flameMask <= 0.02) discard;

      // Vibrant Cartoon Fire Palette: White-Yellow Core -> Bright Gold -> Fiery Orange -> Crimson Tip
      float coreIntensity = smoothstep(widthAtHeight * 0.75, 0.0, distFromCenter) * (1.0 - yNorm * 0.62);
      vec3 crimsonTip = vec3(0.92, 0.14, 0.05);
      vec3 brightOrange = vec3(1.0, 0.48, 0.04);
      vec3 goldenYellow = vec3(1.0, 0.88, 0.22);
      vec3 incandescentWhite = vec3(1.0, 0.99, 0.85);

      vec3 col = mix(crimsonTip, brightOrange, smoothstep(0.05, 0.42, flameMask));
      col = mix(col, goldenYellow, smoothstep(0.25, 0.68, coreIntensity));
      col = mix(col, incandescentWhite, smoothstep(0.62, 0.92, coreIntensity));

      float alpha = clamp(flameMask * 1.15, 0.0, 0.96);
      gl_FragColor = vec4(col, alpha);
    }
  `,
});
Object.assign(infernoRoaringFireMat.uniforms, {
  uWorldCurveY: worldCurveUniforms.uWorldCurveY,
  uWorldCurveX: worldCurveUniforms.uWorldCurveX,
  uCurveStartZ: worldCurveUniforms.uCurveStartZ,
  uLadeiraSlope: worldCurveUniforms.uLadeiraSlope,
  uRoadWindPhase: worldCurveUniforms.uRoadWindPhase,
  uInfernoMapMix: worldCurveUniforms.uInfernoMapMix,
});

export function updateInfernoFireTime(elapsed: number): void {
  sharedInfernoFireUniforms.uTime.value = elapsed;
}

const charredWoodMat = new THREE.MeshStandardMaterial({
  color: 0x240c0a,
  roughness: 0.9,
});
applyWorldCurvatureToMaterial(charredWoodMat);

const fallenWireBlackMat = new THREE.MeshBasicMaterial({
  color: 0x120505,
});
applyWorldCurvatureToMaterial(fallenWireBlackMat);

const brokenFenceWoodMat = new THREE.MeshStandardMaterial({
  color: 0x6e2c1b,
  roughness: 0.84,
});
applyWorldCurvatureToMaterial(brokenFenceWoodMat);

const rubbleRockDarkMat = new THREE.MeshStandardMaterial({
  color: 0x451816,
  roughness: 0.88,
  flatShading: true,
});
applyWorldCurvatureToMaterial(rubbleRockDarkMat);

const rubbleRockLitMat = new THREE.MeshStandardMaterial({
  color: 0x6b2621,
  roughness: 0.84,
  flatShading: true,
});
applyWorldCurvatureToMaterial(rubbleRockLitMat);

// Volumetric C2 Quintic FBM Billowing Smoke Plume Shader for Burning Houses ("melhore nessas fumacas das casas pegando fogo")
// Eliminates hard-edged 3D spheres/bubbles and renders soft, curling, fire-lit charcoal smoke plumes!
const infernoBillowingSmokeMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: sharedInfernoFireUniforms.uTime,
    uWorldCurveY: worldCurveUniforms.uWorldCurveY,
    uWorldCurveX: worldCurveUniforms.uWorldCurveX,
    uCurveStartZ: worldCurveUniforms.uCurveStartZ,
    uLadeiraSlope: worldCurveUniforms.uLadeiraSlope,
    uRoadWindPhase: worldCurveUniforms.uRoadWindPhase,
    uInfernoMapMix: worldCurveUniforms.uInfernoMapMix,
  },
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  fog: false,
  blending: THREE.NormalBlending,
  vertexShader: `
    uniform float uWorldCurveY;
    uniform float uWorldCurveX;
    uniform float uCurveStartZ;
    uniform float uLadeiraSlope;
    uniform float uRoadWindPhase;
    uniform float uInfernoMapMix;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      float curveDist = max(0.0, -(wp.z - uCurveStartZ));
      float curveDistSq = curveDist * curveDist;
      float ladeiraBowl = 9.6 * smoothstep(4.0, 64.0, curveDist) * (1.0 - 0.18 * smoothstep(64.0, 155.0, curveDist));
      float beachDropY = -(uWorldCurveY * curveDistSq * 0.16 + ladeiraBowl * uLadeiraSlope);

      float infernoDip = -1.35 * smoothstep(2.0, 26.0, curveDist) * (1.0 - smoothstep(28.0, 72.0, curveDist));
      float infernoClimbDist = min(166.0, max(0.0, curveDist - 24.0));
      float infernoSkyClimb = pow(infernoClimbDist / 165.0, 1.72) * 34.5;
      float infernoY = infernoDip + infernoSkyClimb;
      float pinchFactor = mix(-0.76 * smoothstep(18.0, 166.0, curveDist), -0.98, smoothstep(162.0, 172.0, curveDist));
      float infernoPinchX = wp.x * pinchFactor;

      wp.y *= mix(1.0, max(0.04, 1.0 + pinchFactor), uInfernoMapMix);
      wp.y += mix(beachDropY, infernoY, uInfernoMapMix);
      wp.x += infernoPinchX * uInfernoMapMix;
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    float hash21(vec2 p) {
      p = fract(p * vec2(234.34, 435.345));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
    }

    float quinticNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbmSmoke(vec2 p) {
      float v = 0.0;
      float amp = 0.52;
      mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
      for (int i = 0; i < 4; i++) {
        v += amp * quinticNoise(p);
        p = rot * p * 2.04 + vec2(11.7, 7.3);
        amp *= 0.50;
      }
      return v;
    }

    void main() {
      float xCentered = (vUv.x - 0.5) * 2.0;
      float yNorm = vUv.y;

      float seed = floor(abs(vWorldPos.z) * 0.25 + abs(vWorldPos.x) * 0.15);
      float sway = sin(yNorm * 4.2 - uTime * 1.35 + seed) * 0.24 * pow(yNorm, 0.85);
      float px = xCentered + sway;

      // Plume widens organically as it rises and billow-curls via FBM noise
      float plumeHalfWidth = mix(0.36, 0.82, smoothstep(0.0, 0.85, yNorm));
      vec2 noiseUv = vec2(px * 1.9 + seed * 1.7, yNorm * 3.2 - uTime * 0.95);
      float n = fbmSmoke(noiseUv);
      float nDetail = fbmSmoke(noiseUv * 2.1 + vec2(0.0, -uTime * 0.55));

      float radialDist = abs(px) / max(0.1, plumeHalfWidth);
      float billowEdge = radialDist - (n - 0.45) * 0.68;
      float radialMask = smoothstep(1.0, 0.18, billowEdge) * smoothstep(1.0, 0.08, abs(xCentered));
      float verticalMask = smoothstep(0.0, 0.16, yNorm) * smoothstep(1.0, 0.32, yNorm);

      float density = clamp(radialMask * verticalMask * (0.65 + 0.55 * n), 0.0, 1.0);
      if (density <= 0.015) discard;

      // Fire-lit warm amber-orange glow at the base of the smoke column -> deep charcoal-black soot above
      float fireUnderlight = exp(-yNorm * 3.4) * smoothstep(0.95, 0.15, radialDist);
      vec3 deepCharcoalSoot = vec3(0.06, 0.015, 0.015);
      vec3 darkCrimsonSmoke = vec3(0.22, 0.04, 0.03);
      vec3 fireLitAmberBase = vec3(0.96, 0.36, 0.07);

      vec3 smokeCol = mix(deepCharcoalSoot, darkCrimsonSmoke, smoothstep(0.28, 0.78, nDetail));
      smokeCol = mix(smokeCol, fireLitAmberBase, clamp(fireUnderlight * 0.88, 0.0, 0.92));

      float alpha = clamp(density * 0.68, 0.0, 0.64);
      gl_FragColor = vec4(smokeCol, alpha);
    }
  `,
});

const burntCarBodyMat = new THREE.MeshStandardMaterial({
  color: 0x8c331e,
  roughness: 0.78,
  metalness: 0.22,
});
applyWorldCurvatureToMaterial(burntCarBodyMat);

const infernoWindowFireCoreMat = new THREE.MeshBasicMaterial({
  color: 0xfde047,
  fog: false,
});
applyWorldCurvatureToMaterial(infernoWindowFireCoreMat);

const infernoPoleLampAmberMat = new THREE.MeshBasicMaterial({
  color: 0xfbbf24,
  fog: false,
});
applyWorldCurvatureToMaterial(infernoPoleLampAmberMat);

// Soft, feather-edged radial streetlight glow shader (zero hard sphere circles!)
const infernoSoftLampGlowMat = new THREE.ShaderMaterial({
  uniforms: {
    uWorldCurveY: worldCurveUniforms.uWorldCurveY,
    uWorldCurveX: worldCurveUniforms.uWorldCurveX,
    uCurveStartZ: worldCurveUniforms.uCurveStartZ,
    uLadeiraSlope: worldCurveUniforms.uLadeiraSlope,
    uRoadWindPhase: worldCurveUniforms.uRoadWindPhase,
    uInfernoMapMix: worldCurveUniforms.uInfernoMapMix,
  },
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  fog: false,
  blending: THREE.AdditiveBlending,
  vertexShader: `
    uniform float uWorldCurveY;
    uniform float uWorldCurveX;
    uniform float uCurveStartZ;
    uniform float uLadeiraSlope;
    uniform float uRoadWindPhase;
    uniform float uInfernoMapMix;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      float curveDist = max(0.0, -(wp.z - uCurveStartZ));
      float curveDistSq = curveDist * curveDist;
      float ladeiraBowl = 9.6 * smoothstep(4.0, 64.0, curveDist) * (1.0 - 0.18 * smoothstep(64.0, 155.0, curveDist));
      float beachDropY = -(uWorldCurveY * curveDistSq * 0.16 + ladeiraBowl * uLadeiraSlope);

      float infernoDip = -1.35 * smoothstep(2.0, 26.0, curveDist) * (1.0 - smoothstep(28.0, 72.0, curveDist));
      float infernoClimbDist = min(166.0, max(0.0, curveDist - 24.0));
      float infernoSkyClimb = pow(infernoClimbDist / 165.0, 1.72) * 34.5;
      float infernoY = infernoDip + infernoSkyClimb;
      float pinchFactor = mix(-0.76 * smoothstep(18.0, 166.0, curveDist), -0.98, smoothstep(162.0, 172.0, curveDist));
      float infernoPinchX = wp.x * pinchFactor;

      wp.y *= mix(1.0, max(0.04, 1.0 + pinchFactor), uInfernoMapMix);
      wp.y += mix(beachDropY, infernoY, uInfernoMapMix);
      wp.x += infernoPinchX * uInfernoMapMix;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      float r = length(p);
      if (r > 1.0) discard;
      float glow = exp(-r * r * 4.8) * smoothstep(1.0, 0.18, r);
      vec3 col = mix(vec3(0.98, 0.42, 0.06), vec3(1.0, 0.92, 0.45), exp(-r * r * 6.5));
      gl_FragColor = vec4(col, glow * 0.72);
    }
  `,
});

const lowPolyBoulderGeo = new THREE.DodecahedronGeometry(0.65, 0);

/**
 * Builds a Charred Leafless Dead Tree with Twisted Black Branches ("árvore seca queimada" from the reference image)
 */
function buildCharredDeadTree(scale = 1.0, seed = 0): THREE.Group {
  const g = new THREE.Group();

  const trunk = new THREE.Mesh(sharedGeos.cylinder, charredWoodMat);
  trunk.scale.set(0.24 * scale, 3.6 * scale, 0.24 * scale);
  trunk.position.set(0, 1.8 * scale, 0);
  trunk.rotation.z = (seed % 2 === 0 ? 1 : -1) * 0.08;
  g.add(trunk);

  const branches = [
    { x: -0.55, y: 3.4, z: 0.1, sx: 0.14, sy: 2.1, rotZ: 0.58, rotX: 0.12 },
    { x: 0.52, y: 3.2, z: -0.1, sx: 0.14, sy: 2.0, rotZ: -0.52, rotX: -0.14 },
    { x: -1.15, y: 4.3, z: 0.2, sx: 0.08, sy: 1.35, rotZ: 0.88, rotX: 0.2 },
    { x: -0.35, y: 4.4, z: 0.05, sx: 0.08, sy: 1.25, rotZ: 0.22, rotX: -0.18 },
    { x: 1.08, y: 4.1, z: -0.15, sx: 0.08, sy: 1.4, rotZ: -0.82, rotX: -0.22 },
    { x: 0.28, y: 4.3, z: 0.12, sx: 0.08, sy: 1.3, rotZ: -0.18, rotX: 0.24 },
  ];
  for (const b of branches) {
    const br = new THREE.Mesh(sharedGeos.cylinder, charredWoodMat);
    br.scale.set(b.sx * scale, b.sy * scale, b.sx * scale);
    br.position.set(b.x * scale, b.y * scale, b.z * scale);
    br.rotation.set(b.rotX, 0, b.rotZ);
    g.add(br);
  }
  return g;
}

/**
 * Builds a Partially Broken Wooden Outdoor Billboard in the Roadside Corner reading "SUA LOGO AQUI"
 * ("se possivel coloque uns autdor no canto e escrito sua logo aqui. placa de madeira assim das casas e autdor meio que quebrado").
 */
function buildInfernoBrokenWoodenBillboard(
  side: 'left' | 'right',
  maxAnisotropy = 4,
): THREE.Group {
  const bGroup = new THREE.Group();
  const sign = side === 'left' ? -1 : 1;

  const billboardTex = getInfernoWoodenBillboardTexture(maxAnisotropy);
  const billboardSignMat = new THREE.MeshStandardMaterial({
    map: billboardTex,
    roughness: 0.78,
    metalness: 0.04,
    emissive: new THREE.Color(0x7a2614),
    emissiveMap: billboardTex,
    emissiveIntensity: 0.48,
  });
  applyWorldCurvatureToMaterial(billboardSignMat);

  // 1. Two Weathered Wooden Support Posts + Broken Diagonal Strut
  const leftPost = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
  leftPost.scale.set(0.22, 3.65, 0.22);
  leftPost.position.set(-1.22, 1.82, -0.14);
  leftPost.rotation.z = 0.04;
  bGroup.add(leftPost);

  const rightPost = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
  rightPost.scale.set(0.22, 3.42, 0.22);
  rightPost.position.set(1.22, 1.71, -0.14);
  rightPost.rotation.z = -0.05;
  bGroup.add(rightPost);

  // Snapped diagonal wooden support brace under the board
  const diagBrace = new THREE.Mesh(sharedGeos.unitBox, brokenFenceWoodMat);
  diagBrace.scale.set(2.15, 0.14, 0.14);
  diagBrace.position.set(-0.32, 1.55, -0.15);
  diagBrace.rotation.z = 0.44;
  bGroup.add(diagBrace);

  // 2. Tilted / Partially Broken Wooden Billboard Panel ("autdor meio que quebrado escrito SUA LOGO AQUI")
  const boardPivot = new THREE.Group();
  boardPivot.position.set(0, 2.68, 0);
  // Tilted slightly so it looks half-broken and weathered
  boardPivot.rotation.z = sign * 0.085;
  boardPivot.rotation.x = 0.03;

  // Wooden backing board (offset behind signFace so zero Z-fighting occurs)
  const backingBoard = new THREE.Mesh(sharedGeos.unitBox, brokenFenceWoodMat);
  backingBoard.scale.set(3.22, 1.76, 0.12);
  backingBoard.position.set(0, 0, -0.08);
  boardPivot.add(backingBoard);

  // Painted wooden plank face with "SUA LOGO AQUI"
  const signFace = new THREE.Mesh(sharedGeos.unitBox, billboardSignMat);
  signFace.scale.set(3.10, 1.66, 0.06);
  signFace.position.set(0, 0, 0.03);
  signFace.userData.noCartoonOutline = true;
  boardPivot.add(signFace);

  // Broken wooden top frame molding — left half intact, right half snapped and hanging down at an angle!
  const topFrameLeft = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
  topFrameLeft.scale.set(1.68, 0.15, 0.20);
  topFrameLeft.position.set(-0.78, 0.88, 0.02);
  boardPivot.add(topFrameLeft);

  const topFrameSnapped = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
  topFrameSnapped.scale.set(1.52, 0.15, 0.20);
  topFrameSnapped.position.set(0.84, 0.72, 0.08);
  topFrameSnapped.rotation.z = -0.34;
  boardPivot.add(topFrameSnapped);

  // Splintered hanging wooden plank shard at the bottom corner ("meio que quebrado")
  const hangingPlank = new THREE.Mesh(sharedGeos.unitBox, brokenFenceWoodMat);
  hangingPlank.scale.set(1.28, 0.26, 0.10);
  hangingPlank.position.set(0.88, -0.94, 0.05);
  hangingPlank.rotation.z = -0.26;
  boardPivot.add(hangingPlank);

  bGroup.add(boardPivot);

  // Fallen broken wooden plank resting on the ground beneath the outdoor billboard
  const fallenPlank = new THREE.Mesh(sharedGeos.unitBox, brokenFenceWoodMat);
  fallenPlank.scale.set(1.75, 0.12, 0.32);
  fallenPlank.position.set(0.25, 0.10, 0.38);
  fallenPlank.rotation.y = 0.28;
  fallenPlank.rotation.z = 0.06;
  bGroup.add(fallenPlank);

  return bGroup;
}

/**
 * Helper to create a 3D fallen wire tube or snapped cable segment between a sequence of 3D points.
 */
function buildFallenWireCurveMesh(points: THREE.Vector3[], radius = 0.032): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 12, radius, 5, false);
  const mesh = new THREE.Mesh(geo, fallenWireBlackMat);
  mesh.userData.noCartoonOutline = true;
  return mesh;
}

/**
 * Builds an Apocalyptic Wooden Cross-Arm Utility Pole where SOME poles are snapped/broken in half
 * and ALL utility wires are snapped and fallen to the ground ("e os postes deixe alguns quebrados e os fios dos postes todos caido")!
 */
function buildInfernoBrokenPoleAndFallenWires(
  side: 'left' | 'right',
  variantIndex: number,
): THREE.Group {
  const poleGroup = new THREE.Group();
  const sign = side === 'left' ? -1 : 1;
  const roadDir = -sign; // +1 towards road for left pole, -1 towards road for right pole
  const isSnappedInHalf = variantIndex % 2 === 1;

  if (isSnappedInHalf) {
    // BROKEN / SNAPPED POLE ("alguns postes quebrados"):
    // 1. Lower splintered wooden stump
    const lowerStump = new THREE.Mesh(sharedGeos.cylinder, charredWoodMat);
    lowerStump.scale.set(0.24, 3.2, 0.24);
    lowerStump.position.set(0, 1.6, 0);
    lowerStump.rotation.z = roadDir * 0.08;
    poleGroup.add(lowerStump);

    for (let s = 0; s < 3; s++) {
      const splinter = new THREE.Mesh(sharedGeos.cone, charredWoodMat);
      splinter.scale.set(0.08, 0.55, 0.08);
      splinter.position.set((s - 1) * 0.07, 3.25, (s % 2) * 0.06);
      splinter.rotation.z = (s - 1) * 0.18;
      poleGroup.add(splinter);
    }

    // 2. Snapped Upper Pole Section hanging over at a steep broken angle
    const brokenUpperPivot = new THREE.Group();
    brokenUpperPivot.position.set(roadDir * 0.14, 3.05, 0);
    brokenUpperPivot.rotation.z = roadDir * 0.58;
    brokenUpperPivot.rotation.x = 0.18;

    const upperShaft = new THREE.Mesh(sharedGeos.cylinder, charredWoodMat);
    upperShaft.scale.set(0.21, 3.1, 0.21);
    upperShaft.position.set(0, 1.55, 0);
    brokenUpperPivot.add(upperShaft);

    const crossbar = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
    crossbar.scale.set(1.85, 0.16, 0.16);
    crossbar.position.set(0, 2.55, 0);
    crossbar.rotation.z = -roadDir * 0.34;
    brokenUpperPivot.add(crossbar);

    const lampArm = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
    lampArm.scale.set(1.45, 0.10, 0.10);
    lampArm.position.set(roadDir * 0.72, 1.95, 0);
    lampArm.rotation.z = roadDir * 0.18;
    brokenUpperPivot.add(lampArm);

    const lampHead = new THREE.Mesh(sharedGeos.unitBox, infernoPoleLampAmberMat);
    lampHead.scale.set(0.46, 0.16, 0.28);
    lampHead.position.set(roadDir * 1.38, 2.05, 0);
    brokenUpperPivot.add(lampHead);

    const lampGlowQuad = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), infernoSoftLampGlowMat);
    lampGlowQuad.position.set(roadDir * 1.38, 1.92, 0.18);
    lampGlowQuad.userData.noCartoonOutline = true;
    brokenUpperPivot.add(lampGlowQuad);

    poleGroup.add(brokenUpperPivot);

    // 3. ALL WIRES FALLEN TO THE GROUND ("os fios dos postes todos caido"):
    // Smooth catenary curves that drape down onto the sidewalk (y >= 0.08) without dipping below ground!
    const wire1 = buildFallenWireCurveMesh([
      new THREE.Vector3(roadDir * 1.25, 4.75, -0.15),
      new THREE.Vector3(roadDir * 1.05, 2.35, -1.55),
      new THREE.Vector3(roadDir * 0.65, 0.48, -3.20),
      new THREE.Vector3(roadDir * 0.35, 0.12, -5.40),
      new THREE.Vector3(-roadDir * 0.35, 0.10, -8.20),
    ]);
    poleGroup.add(wire1);

    const wire2 = buildFallenWireCurveMesh([
      new THREE.Vector3(roadDir * 1.65, 4.15, 0.15),
      new THREE.Vector3(roadDir * 1.25, 1.85, 1.75),
      new THREE.Vector3(roadDir * 0.65, 0.42, 3.45),
      new THREE.Vector3(-roadDir * 0.25, 0.10, 5.80),
    ]);
    poleGroup.add(wire2);

    const danglingWhip = buildFallenWireCurveMesh([
      new THREE.Vector3(roadDir * 0.65, 4.85, 0.10),
      new THREE.Vector3(roadDir * 0.72, 2.65, 0.38),
      new THREE.Vector3(roadDir * 0.48, 0.85, 0.68),
      new THREE.Vector3(roadDir * 0.22, 0.12, 1.15),
    ]);
    poleGroup.add(danglingWhip);
  } else {
    // LEANING WOODEN CROSS-POLE WITH BROKEN CROSSBAR & ALL WIRES FALLEN TO THE GROUND:
    const tiltAngle = roadDir * (0.14 + (variantIndex % 3) * 0.035);
    const polePivot = new THREE.Group();
    polePivot.rotation.z = tiltAngle;

    const mainShaft = new THREE.Mesh(sharedGeos.cylinder, charredWoodMat);
    mainShaft.scale.set(0.23, 6.4, 0.23);
    mainShaft.position.set(0, 3.2, 0);
    polePivot.add(mainShaft);

    const topCrossbar = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
    topCrossbar.scale.set(2.05, 0.18, 0.18);
    topCrossbar.position.set(0, 5.65, 0);
    topCrossbar.rotation.z = -roadDir * 0.22;
    polePivot.add(topCrossbar);

    for (const ix of [-0.82, 0.82]) {
      const pin = new THREE.Mesh(sharedGeos.cylinder, charredWoodMat);
      pin.scale.set(0.06, 0.26, 0.06);
      pin.position.set(ix, 5.82, 0);
      polePivot.add(pin);
    }

    const lampArm = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
    lampArm.scale.set(1.85, 0.11, 0.11);
    lampArm.position.set(roadDir * 0.92, 4.45, 0);
    lampArm.rotation.z = roadDir * 0.12;
    polePivot.add(lampArm);

    const lampHousing = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
    lampHousing.scale.set(0.54, 0.18, 0.32);
    lampHousing.position.set(roadDir * 1.82, 4.58, 0);
    polePivot.add(lampHousing);

    const lampBulb = new THREE.Mesh(sharedGeos.unitBox, infernoPoleLampAmberMat);
    lampBulb.scale.set(0.46, 0.10, 0.26);
    lampBulb.position.set(roadDir * 1.82, 4.48, 0);
    polePivot.add(lampBulb);

    const lampGlowQuad = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.0), infernoSoftLampGlowMat);
    lampGlowQuad.position.set(roadDir * 1.82, 4.35, 0.18);
    lampGlowQuad.userData.noCartoonOutline = true;
    polePivot.add(lampGlowQuad);

    poleGroup.add(polePivot);

    // ALL WIRES SNAPPED & FALLEN TO THE GROUND ("e os fios dos postes todos caido"):
    const fallenWireA = buildFallenWireCurveMesh([
      new THREE.Vector3(roadDir * 0.20, 5.55, -0.1),
      new THREE.Vector3(roadDir * 0.42, 2.75, -1.7),
      new THREE.Vector3(roadDir * 0.52, 0.55, -3.5),
      new THREE.Vector3(-roadDir * 0.28, 0.12, -6.2),
      new THREE.Vector3(roadDir * 0.22, 0.10, -8.8),
    ]);
    poleGroup.add(fallenWireA);

    const fallenWireB = buildFallenWireCurveMesh([
      new THREE.Vector3(roadDir * 1.35, 5.25, 0.1),
      new THREE.Vector3(roadDir * 1.10, 2.45, 1.8),
      new THREE.Vector3(roadDir * 0.58, 0.48, 3.4),
      new THREE.Vector3(roadDir * 0.18, 0.10, 5.8),
    ]);
    poleGroup.add(fallenWireB);

    const groundCableLoop = buildFallenWireCurveMesh([
      new THREE.Vector3(-roadDir * 0.65, 0.10, -2.4),
      new THREE.Vector3(roadDir * 0.38, 0.11, -0.8),
      new THREE.Vector3(-roadDir * 0.25, 0.10, 1.4),
      new THREE.Vector3(roadDir * 0.48, 0.10, 3.1),
    ]);
    poleGroup.add(groundCableLoop);
  }

  return poleGroup;
}

/**
 * Builds a Towering Destroyed Multi-Story Apartment/Office Building ("coloque alguns predios ao lados destruidos")
 * flanking the apocalyptic Inferno road:
 * - 4 to 6 stories tall (14.5m..20.5m) with scorched concrete facade & floor-slab ledges
 * - Multi-floor grid of blown-out hollow windows & roaring fire-lit windows
 * - Catastrophically collapsed upper stories with tilted broken concrete roof slabs, stair-stepped jagged wall teeth,
 *   exposed twisted steel rebar rods, broken side balconies, and roaring rooftop flames!
 */
function buildInfernoDestroyedTallBuilding(
  variantIndex: number,
  side: 'left' | 'right',
  ruinedWallMat: THREE.Material,
): THREE.Group {
  const bGroup = new THREE.Group();
  const sign = side === 'left' ? -1 : 1;

  const floors = 3 + (variantIndex % 2); // 3 or 4 stories tall so mountain dog statues remain 100% unobstructed
  const floorH = 2.75;
  const totalH = floors * floorH;
  const bWidth = 7.2 + (variantIndex % 2) * 0.8;
  const bDepth = 8.4 + (variantIndex % 3) * 0.6;

  // Main multi-story concrete tower shell
  const mainTower = new THREE.Mesh(sharedGeos.unitBox, ruinedWallMat);
  mainTower.scale.set(bWidth, totalH, bDepth);
  mainTower.position.set(0, totalH * 0.5, 0);
  bGroup.add(mainTower);

  // Horizontal concrete floor-slab ledges between stories
  for (let f = 1; f < floors; f++) {
    const slabLedge = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
    slabLedge.scale.set(bWidth + 0.24, 0.20, bDepth + 0.22);
    slabLedge.position.set(0, f * floorH, 0);
    bGroup.add(slabLedge);
  }

  // Multi-story grid of blown-out dark windows & fire-lit windows facing the road and street approach!
  const roadFaceX = -sign * (bWidth * 0.5 + 0.04);
  const winZCols = [-2.5, 0.0, 2.5];

  for (let f = 0; f < floors; f++) {
    const wy = f * floorH + 1.65;
    for (let c = 0; c < winZCols.length; c++) {
      // Top floor corner is collapsed on one side, skip window there for broken silhouette
      if (f === floors - 1 && c === 2) continue;

      const wz = winZCols[c];
      const isOnFire = (f + c + variantIndex) % 2 === 0;

      const winFrame = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
      winFrame.scale.set(0.18, 1.48, 1.44);
      winFrame.position.set(roadFaceX, wy, wz);
      bGroup.add(winFrame);

      if (isOnFire) {
        const fireCore = new THREE.Mesh(sharedGeos.unitBox, infernoWindowFireCoreMat);
        fireCore.scale.set(0.12, 1.24, 1.22);
        fireCore.position.set(roadFaceX + sign * 0.04, wy, wz);
        bGroup.add(fireCore);

        if ((f + c) % 3 === 0) {
          const winFlame = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 2.35), infernoRoaringFireMat);
          winFlame.rotation.y = sign * (Math.PI * 0.5);
          winFlame.position.set(roadFaceX - sign * 0.18, wy + 0.45, wz);
          winFlame.userData.noCartoonOutline = true;
          bGroup.add(winFlame);
        }
      }

      // Broken tilted concrete balconies on alternating upper stories
      if (f >= 1 && (f + c + variantIndex) % 3 === 1) {
        const balcony = new THREE.Mesh(sharedGeos.unitBox, ruinedWallMat);
        balcony.scale.set(0.95, 0.24, 1.68);
        balcony.position.set(roadFaceX - sign * 0.42, wy - 0.72, wz);
        balcony.rotation.z = sign * (0.16 + (f % 2) * 0.12);
        balcony.rotation.x = ((c % 2) - 0.5) * 0.14;
        bGroup.add(balcony);
      }
    }

    // Front Z-facing windows (visible as player approaches the tall building down the straight road!)
    for (const wx of [-1.8, 1.8]) {
      const zWinFrame = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
      zWinFrame.scale.set(1.38, 1.44, 0.18);
      zWinFrame.position.set(wx, wy, bDepth * 0.5 + 0.04);
      bGroup.add(zWinFrame);

      if ((f + Math.round(wx) + variantIndex) % 2 === 0) {
        const zFireCore = new THREE.Mesh(sharedGeos.unitBox, infernoWindowFireCoreMat);
        zFireCore.scale.set(1.16, 1.20, 0.12);
        zFireCore.position.set(wx, wy, bDepth * 0.5 + 0.01);
        bGroup.add(zFireCore);
      }
    }
  }

  // Catastrophically Collapsed Upper Roof & Jagged Stair-Stepped Broken Wall Blocks ("predios ao lados destruidos")
  for (let b = 0; b < 6; b++) {
    const bz = (b - 2.5) * (bDepth * 0.17);
    const bh = 1.15 + ((b * 2 + variantIndex) % 4) * 0.72;
    const bx = ((b % 2 === 0 ? -1 : 1) * bWidth * 0.28);
    const brokenPillar = new THREE.Mesh(sharedGeos.unitBox, ruinedWallMat);
    brokenPillar.scale.set(1.65, bh, 1.45);
    brokenPillar.position.set(bx, totalH + bh * 0.5 - 0.15, bz);
    brokenPillar.rotation.z = sign * (((b % 3) - 1) * 0.14);
    bGroup.add(brokenPillar);
  }

  // Collapsed Tilted Concrete Roof Slab hanging precariously off the top of the destroyed building
  const collapsedRoofSlab = new THREE.Mesh(sharedGeos.unitBox, ruinedWallMat);
  collapsedRoofSlab.scale.set(bWidth * 0.78, 0.42, bDepth * 0.62);
  collapsedRoofSlab.position.set(-sign * 0.85, totalH + 0.85, 0.6);
  collapsedRoofSlab.rotation.z = sign * 0.34;
  collapsedRoofSlab.rotation.x = 0.18;
  bGroup.add(collapsedRoofSlab);

  // Exposed Twisted Steel Rebar Rods sticking out of the shattered upper concrete walls
  for (let r = 0; r < 6; r++) {
    const rebar = new THREE.Mesh(sharedGeos.cylinder, charredWoodMat);
    rebar.scale.set(0.06, 2.2 + (r % 2) * 0.8, 0.06);
    rebar.position.set(
      -sign * (bWidth * 0.32) + ((r % 3) - 1) * 1.4,
      totalH + 1.1,
      (r - 2.5) * 1.35,
    );
    rebar.rotation.z = sign * (0.22 + (r % 3) * 0.18);
    rebar.rotation.x = ((r % 2) - 0.5) * 0.32;
    rebar.userData.noCartoonOutline = true;
    bGroup.add(rebar);
  }

  // Roaring Conflagration Flames & Rising Smoke on the Collapsed Building Rooftop!
  for (let f = 0; f < 2; f++) {
    const fz = (f - 0.5) * 3.4;
    const roofFlameA = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.8), infernoRoaringFireMat);
    roofFlameA.position.set(-sign * 0.8, totalH + 2.1, fz);
    roofFlameA.rotation.y = 0.28 * sign;
    roofFlameA.userData.noCartoonOutline = true;
    bGroup.add(roofFlameA);

    const roofFlameB = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 5.4), infernoRoaringFireMat);
    roofFlameB.position.set(-sign * 0.6, totalH + 2.0, fz);
    roofFlameB.rotation.y = Math.PI * 0.44 * sign;
    roofFlameB.userData.noCartoonOutline = true;
    bGroup.add(roofFlameB);
  }

  return bGroup;
}

/**
 * Builds a Complete 15.6m Apocalyptic Inferno Roadside Slot for either the 'left' or 'right' side of the road:
 * - Destroyed, roof-collapsed concrete/brick house engulfed in roaring animated flames & soft rising smoke plumes ("as casas destruidas pegando fogo")
 * - Towering Destroyed Multi-Story Buildings ("coloque alguns predios ao lados destruidos") flanking both sides of the road
 * - Broken wooden picket/slat fence along the sidewalk
 * - Scattered angular low-poly volcanic rocks & rubble along the curb edge
 * - Charred leafless dead trees & burnt-out car wrecks
 * - Broken/leaning wooden utility pole with ALL wires snapped and fallen on the ground ("e os postes deixe alguns quebrados e os fios dos postes todos caido")
 */
export function buildInfernoBurningRuinedHouseSlot(
  variantIndex: number,
  side: 'left' | 'right',
  maxAnisotropy = 4,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Inferno_Burning_Ruined_Slot_${side}_${variantIndex}`;
  group.userData.keepAllMeshesVisible = true;

  const sign = side === 'left' ? -1 : 1;
  const wallTex = getInfernoRuinedWallTexture(variantIndex, maxAnisotropy);
  const ruinedWallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: 0.86,
    metalness: 0.04,
  });
  applyWorldCurvatureToMaterial(ruinedWallMat);

  // 1. Primary Ruined House Shell (set at x = -11.8 for left, +11.8 for right)
  const houseX = sign * 11.8;
  const houseW = 6.6;
  const houseD = 8.4 + (variantIndex % 3) * 0.8;
  const stories = variantIndex % 2 === 0 ? 2 : 1;
  const baseH = stories === 2 ? 6.2 : 4.2;

  const houseGroup = new THREE.Group();
  houseGroup.position.set(houseX, 0.22, 0);

  const shell = new THREE.Mesh(sharedGeos.unitBox, ruinedWallMat);
  shell.scale.set(houseW, baseH, houseD);
  shell.position.set(0, baseH * 0.5, 0);
  houseGroup.add(shell);

  // Jagged broken upper wall blocks & collapsed concrete parapet teeth along the top edge ("casas destruídas")
  const frontFaceX = -sign * (houseW * 0.5 + 0.04);
  for (let b = 0; b < 5; b++) {
    const bz = (b - 2) * (houseD * 0.2);
    const bh = 0.55 + ((b + variantIndex) % 3) * 0.42;
    const brokenTooth = new THREE.Mesh(sharedGeos.unitBox, ruinedWallMat);
    brokenTooth.scale.set(0.42, bh, 1.15);
    brokenTooth.position.set(-sign * (houseW * 0.45), baseH + bh * 0.5 - 0.1, bz);
    brokenTooth.rotation.x = ((b % 2) - 0.5) * 0.16;
    houseGroup.add(brokenTooth);
  }

  // Collapsed charred roof rafters sticking out of the top of the burning house
  for (let r = 0; r < 3; r++) {
    const rafter = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
    rafter.scale.set(3.8, 0.22, 0.24);
    rafter.position.set(0, baseH + 0.25, (r - 1) * 2.4);
    rafter.rotation.z = sign * (0.28 + r * 0.12);
    houseGroup.add(rafter);
  }

  // Glowing fire-filled hollow window & door openings facing the street!
  const windowZOffsets = [-2.2, 0.0, 2.2];
  for (let w = 0; w < windowZOffsets.length; w++) {
    const wz = windowZOffsets[w];
    const isDoor = w === 1;
    const openH = isDoor ? 2.15 : 1.35;
    const openY = isDoor ? 1.15 : 1.75;

    const frame = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
    frame.scale.set(0.18, openH + 0.24, 1.38);
    frame.position.set(frontFaceX, openY, wz);
    houseGroup.add(frame);

    const fireInterior = new THREE.Mesh(sharedGeos.unitBox, infernoWindowFireCoreMat);
    fireInterior.scale.set(0.12, openH, 1.18);
    fireInterior.position.set(frontFaceX + sign * 0.05, openY, wz);
    houseGroup.add(fireInterior);

    const windowFlame = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 2.2), infernoRoaringFireMat);
    windowFlame.rotation.y = sign * (Math.PI * 0.5);
    windowFlame.position.set(frontFaceX - sign * 0.18, openY + 0.35, wz);
    windowFlame.userData.noCartoonOutline = true;
    houseGroup.add(windowFlame);

    if (stories === 2) {
      const upperFrame = new THREE.Mesh(sharedGeos.unitBox, charredWoodMat);
      upperFrame.scale.set(0.18, 1.4, 1.36);
      upperFrame.position.set(frontFaceX, 4.45, wz);
      houseGroup.add(upperFrame);

      const upperFire = new THREE.Mesh(sharedGeos.unitBox, infernoWindowFireCoreMat);
      upperFire.scale.set(0.12, 1.2, 1.16);
      upperFire.position.set(frontFaceX + sign * 0.05, 4.45, wz);
      houseGroup.add(upperFire);
    }
  }

  // Roaring Rooftop Conflagration Flames shooting out of the collapsed roof!
  for (let f = 0; f < 3; f++) {
    const fz = (f - 1) * 2.4;
    const flameA = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.8), infernoRoaringFireMat);
    flameA.position.set(-sign * 0.5, baseH + 1.65, fz);
    flameA.rotation.y = 0.25 * sign;
    flameA.userData.noCartoonOutline = true;
    houseGroup.add(flameA);

    const flameB = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.5), infernoRoaringFireMat);
    flameB.position.set(-sign * 0.3, baseH + 1.55, fz);
    flameB.rotation.y = Math.PI * 0.42 * sign;
    flameB.userData.noCartoonOutline = true;
    houseGroup.add(flameB);
  }

  // Organic Volumetric FBM Billowing Smoke Plume rising from the burning house roof ("melhore nessas fumacas das casas pegando fogo")
  // Uses camera-facing vertical planes with soft C2 quintic FBM noise (zero hard sphere circles and zero edge-on plane lines!)
  if (variantIndex % 2 === 0) {
    const smokePlumeGeo = new THREE.PlaneGeometry(6.8, 9.6);
    const smokeX = sign * 2.2;
    const smokeY = baseH + 4.2;
    const smokeZ = ((variantIndex % 3) - 1) * 0.9;

    const smokePlaneA = new THREE.Mesh(smokePlumeGeo, infernoBillowingSmokeMat);
    smokePlaneA.position.set(smokeX, smokeY, smokeZ);
    smokePlaneA.rotation.y = -sign * 0.18;
    smokePlaneA.userData.noCartoonOutline = true;
    houseGroup.add(smokePlaneA);

    const smokePlaneB = new THREE.Mesh(smokePlumeGeo, infernoBillowingSmokeMat);
    smokePlaneB.position.set(smokeX + sign * 1.1, smokeY + 0.8, smokeZ - 1.4);
    smokePlaneB.rotation.y = -sign * 0.12;
    smokePlaneB.userData.noCartoonOutline = true;
    houseGroup.add(smokePlaneB);
  }

  // 1b. Towering Destroyed Multi-Story Buildings on Staggered Slots ("coloque alguns predios ao lados destruidos"):
  // Placed on alternating slots on left and right so there are prominent 4-to-6 story collapsed urban buildings
  // alongside the road while keeping wide sky vistas open between buildings for volcanoes, meteors, and distant creatures!
  const hasTallBuilding =
    (side === 'left' && variantIndex % 3 === 2) ||
    (side === 'right' && variantIndex % 3 === 1);

  if (hasTallBuilding) {
    const tallBuildingTex = getInfernoRuinedWallTexture(variantIndex + 7, maxAnisotropy);
    const tallBuildingMat = new THREE.MeshStandardMaterial({
      map: tallBuildingTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    applyWorldCurvatureToMaterial(tallBuildingMat);

    const destroyedBuilding = buildInfernoDestroyedTallBuilding(variantIndex, side, tallBuildingMat);
    destroyedBuilding.position.set(
      sign * (7.2 + (variantIndex % 2) * 1.2),
      0,
      (variantIndex % 2 === 0 ? -1.6 : 1.4),
    );
    destroyedBuilding.rotation.z = -sign * (0.025 + (variantIndex % 3) * 0.015);
    houseGroup.add(destroyedBuilding);
  } else {
    // Lower Secondary Background Ruin on non-high-rise slots so the skyline is varied and open!
    const bgRuin = new THREE.Mesh(sharedGeos.unitBox, ruinedWallMat);
    const bgH = 5.0 + (variantIndex % 2) * 1.4;
    bgRuin.scale.set(5.8, bgH, 7.0);
    bgRuin.position.set(sign * 8.0, bgH * 0.5, -2.0);
    houseGroup.add(bgRuin);

    const bgFlame = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 5.0), infernoRoaringFireMat);
    bgFlame.position.set(sign * 5.2, bgH + 1.4, -2.0);
    bgFlame.userData.noCartoonOutline = true;
    houseGroup.add(bgFlame);
  }

  group.add(houseGroup);

  // Determine rock pattern & corner billboard placement per slot
  // ("e tambem na rua faz quebrar padrao igual algumas partes sem predras, uma pedra maior mais ao lado de uma casa")
  const hasCornerBillboard =
    (side === 'left' && (variantIndex === 0 || variantIndex === 2 || variantIndex === 5)) ||
    (side === 'right' && (variantIndex === 0 || variantIndex === 3));

  const rockPattern = hasCornerBillboard
    ? 0
    : side === 'left'
      ? variantIndex === 1 || variantIndex === 3
        ? 1
        : 0
      : variantIndex === 1 || variantIndex === 4
        ? 1
        : variantIndex === 2
          ? 0
          : 2;

  // 2. Broken Wooden Picket / Slat Fence along the Sidewalk Edge (x = +-7.85)
  // Leaves a crushed gap where a giant boulder or corner wooden billboard sits!
  const fenceX = sign * 7.85;
  const fenceRail = new THREE.Mesh(sharedGeos.unitBox, brokenFenceWoodMat);
  fenceRail.scale.set(0.12, 0.14, 12.6);
  fenceRail.position.set(fenceX, 0.88, 0);
  fenceRail.rotation.x = 0.03;
  group.add(fenceRail);

  for (let p = -6; p <= 6; p++) {
    if ((p + variantIndex) % 5 === 0) continue;
    if (hasCornerBillboard && p >= 0 && p <= 5) continue;
    if (rockPattern === 1 && p >= -1 && p <= 4) continue;
    const picket = new THREE.Mesh(sharedGeos.unitBox, brokenFenceWoodMat);
    const ph = 1.18 + ((p * 3 + variantIndex) % 3) * 0.22;
    picket.scale.set(0.1, ph, 0.42);
    picket.position.set(fenceX - sign * 0.05, 0.22 + ph * 0.5, p * 0.98);
    picket.rotation.x = ((p % 3) - 1) * 0.11;
    picket.rotation.z = sign * (((p + 1) % 2) * 0.08);
    group.add(picket);
  }

  // 3. Non-Repetitive Volcanic Rocks & Giant House-Side Boulders
  let rockOffsets: Array<{ x: number; z: number; sx: number; sy: number; sz: number; rotY: number }> = [];

  if (rockPattern === 0) {
    // Pattern 0: Completely clear stretch with NO rocks ("algumas partes sem pedras")!
    rockOffsets = [];
  } else if (rockPattern === 1) {
    // Pattern 1: One HUGE craggy boulder right beside the house on the sidewalk ("uma pedra maior mais ao lado de uma casa")!
    rockOffsets = [
      { x: sign * 6.72, z: 1.6, sx: 2.72, sy: 2.02, sz: 2.38, rotY: 0.75 },
      { x: sign * 5.55, z: -3.4, sx: 0.92, sy: 0.50, sz: 0.82, rotY: 1.85 },
    ];
  } else {
    // Pattern 2: Single isolated medium rock near the curb, rest of the 15.6m slot completely rock-free!
    rockOffsets = [
      { x: sign * 5.58, z: -2.2, sx: 1.32, sy: 0.72, sz: 1.10, rotY: 2.1 },
    ];
  }

  for (let r = 0; r < rockOffsets.length; r++) {
    const ro = rockOffsets[r];
    const rock = new THREE.Mesh(
      lowPolyBoulderGeo,
      r % 2 === 0 ? rubbleRockDarkMat : rubbleRockLitMat,
    );
    rock.scale.set(ro.sx, ro.sy, ro.sz);
    rock.position.set(ro.x, 0.22 + ro.sy * 0.28, ro.z);
    rock.rotation.set(r * 0.3, ro.rotY, 0.15);
    rock.userData.noCartoonOutline = true;
    group.add(rock);
  }

  // 4. Partially Broken Wooden Outdoor Billboard ("coloque uns autdor no canto e escrito sua logo aqui. placa de madeira assim das casas e autdor meio que quebrado")
  // or Charred Leafless Dead Tree on alternating slots (with the parked car completely removed: "remove esse carro parado tambem na calsada")!
  if (hasCornerBillboard) {
    const brokenBillboard = buildInfernoBrokenWoodenBillboard(side, maxAnisotropy);
    // Placed in the open roadside corner in front of the utility pole & outside the house wall so "SUA LOGO AQUI" is 100% unclipped!
    brokenBillboard.position.set(sign * 6.45, 0.22, 2.4);
    brokenBillboard.rotation.y = -sign * 0.26;
    group.add(brokenBillboard);
  } else if (variantIndex % 2 === 0) {
    const deadTree = buildCharredDeadTree(1.08, variantIndex);
    deadTree.position.set(sign * 8.95, 0.22, 4.2);
    group.add(deadTree);
  }

  // 5. Broken / Leaning Wooden Utility Pole with ALL Wires Fallen to the Ground ("e os postes deixe alguns quebrados e os fios dos postes todos caido")!
  const brokenPole = buildInfernoBrokenPoleAndFallenWires(side, variantIndex);
  brokenPole.position.set(sign * 6.32, 0.22, -3.5);
  group.add(brokenPole);

  addCartoonOutlinesToGroup(group);
  return group;
}

// Soft Out-of-Focus Gaussian-Blurred Winged Creature Shaders ("deixe essas criaturas voando bem longe e borradas"):
// Renders distant sky creatures with a wide optical depth-of-field blur kernel, atmospheric crimson haze blending,
// zero sharp polygon edges, and zero glowing yellow eyes!
const infernoBlurredCreatureBodyMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  fog: false,
  blending: THREE.NormalBlending,
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    void main() {
      vec2 p = (vUv - 0.5) * 2.0;
      // Elongated soft torso/tail Gaussian blur kernel
      float d = length(vec2(p.x * 1.35, p.y * 0.90));
      if (d > 1.0) discard;
      float blurMask = exp(-d * d * 3.4) * smoothstep(1.0, 0.12, d);
      vec3 coreCol = vec3(0.12, 0.015, 0.015);
      vec3 hazeEdgeCol = vec3(0.62, 0.10, 0.06);
      vec3 col = mix(hazeEdgeCol, coreCol, blurMask);
      gl_FragColor = vec4(col, blurMask * 0.56);
    }
  `,
});

const infernoBlurredCreatureWingMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  fog: false,
  blending: THREE.NormalBlending,
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    void main() {
      // Soft out-of-focus arched bat/wyvern wing silhouette with wide Gaussian blur feathering
      float span = vUv.x; // 0 at shoulder, 1 at wingtip
      float chord = (vUv.y - 0.5) * 2.0;
      float archOffset = sin(span * 3.14159) * 0.24;
      float halfWidth = mix(0.66, 0.10, pow(span, 0.82));
      float distFromWing = abs(chord - archOffset) / max(0.08, halfWidth);
      float spanFade = smoothstep(0.0, 0.14, span) * smoothstep(1.0, 0.18, span);
      float wingBlur = exp(-distFromWing * distFromWing * 2.1) * smoothstep(1.40, 0.18, distFromWing) * spanFade;
      if (wingBlur <= 0.01) discard;

      vec3 coreCol = vec3(0.14, 0.02, 0.02);
      vec3 hazeEdgeCol = vec3(0.65, 0.11, 0.06);
      vec3 col = mix(hazeEdgeCol, coreCol, wingBlur);
      gl_FragColor = vec4(col, wingBlur * 0.52);
    }
  `,
});

/**
 * Builds a Distant, Out-of-Focus Blurred Winged Sky Creature Silhouette ("deixe essas criaturas voando bem longe e borradas").
 */
function buildSingleInfernoFlyingCreature(): {
  root: THREE.Group;
  leftWingPivot: THREE.Group;
  rightWingPivot: THREE.Group;
} {
  const root = new THREE.Group();

  // Soft Gaussian-blurred body quad (no sharp edges, no yellow eyes!)
  const bodyQuad = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), infernoBlurredCreatureBodyMat);
  bodyQuad.rotation.x = -Math.PI * 0.18;
  root.add(bodyQuad);

  const createBlurredWing = (dir: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(dir * 0.25, 0.05, 0.0);

    const wingGeo = new THREE.PlaneGeometry(4.2, 2.4);
    if (dir === -1) {
      // Flip UVs horizontally so span = 0 is at the shoulder for the left wing too
      const uvAttr = wingGeo.attributes.uv;
      for (let i = 0; i < uvAttr.count; i++) {
        uvAttr.setX(i, 1.0 - uvAttr.getX(i));
      }
      uvAttr.needsUpdate = true;
    }

    const wingQuad = new THREE.Mesh(wingGeo, infernoBlurredCreatureWingMat);
    wingQuad.position.set(dir * 1.9, 0.0, 0.0);
    wingQuad.rotation.x = -Math.PI * 0.15;
    pivot.add(wingQuad);

    return pivot;
  };

  const leftWingPivot = createBlurredWing(-1);
  const rightWingPivot = createBlurredWing(1);
  root.add(leftWingPivot);
  root.add(rightWingPivot);

  return { root, leftWingPivot, rightWingPivot };
}

/**
 * Builds the Flock of 6 Distant, Blurry Winged Creatures in the Far Inferno Horizon Sky
 * ("deixe essas criaturas voando bem longe e borradas").
 */
export function buildInfernoFlyingCreatures(): {
  group: THREE.Group;
  update: (elapsed: number) => void;
} {
  const group = new THREE.Group();
  group.name = 'Inferno_Flying_Sky_Creatures';

  const creatures: Array<{
    root: THREE.Group;
    leftWingPivot: THREE.Group;
    rightWingPivot: THREE.Group;
    scale: number;
  }> = [];

  const scales = [1.05, 1.18, 0.98, 1.12, 0.92, 1.02];
  for (let i = 0; i < 6; i++) {
    const c = buildSingleInfernoFlyingCreature();
    c.root.scale.setScalar(scales[i]);
    group.add(c.root);
    creatures.push({ ...c, scale: scales[i] });
  }

  return {
    group,
    update: (elapsed: number) => {
      for (let i = 0; i < creatures.length; i++) {
        const c = creatures[i];
        const pose = computeInfernoFlyingCreaturePose(i, elapsed);
        c.root.position.set(pose.x, pose.y, pose.z);
        c.root.rotation.set(pose.rotX, pose.rotY, pose.rotZ);
        c.leftWingPivot.rotation.z = pose.wingFlapAngle;
        c.rightWingPivot.rotation.z = -pose.wingFlapAngle;
      }
    },
  };
}

/**
 * Constrói o NPC Fantasma do Mapa INFERNO (aguardando na zona de entrega de pizza)
 * e a Alma Libertada que sai do corpo, atravessa o centro da câmera e sobe ao céu!
 */
export interface InfernoGhostCustomerRig {
  root: THREE.Group;
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  wavingArmPivot: THREE.Group;
  catchingArmPivot: THREE.Group;
  auraRing: THREE.Mesh;
  update: (elapsed: number, happyBounce: number) => void;
}

export function buildInfernoGhostCustomerGroup(
  _side?: 'left' | 'right',
  _index?: number
): InfernoGhostCustomerRig {
  const group = new THREE.Group();
  group.name = 'Inferno_Ghost_NPC';

  // Fantasmas NPC em azul claro brilhante / ciano neon para enxergar com máxima nitidez de longe!
  const spectralOuterMat = new THREE.MeshToonMaterial({
    color: 0xbae6fd,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.95,
    transparent: true,
    opacity: 0.90,
    fog: false,
  });
  const spectralCoreMat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    emissive: 0x7dd3fc,
    emissiveIntensity: 0.88,
    transparent: true,
    opacity: 0.98,
    fog: false,
  });
  const whiteOutlineMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.95,
    fog: false,
  });
  const darkOutlineMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    side: THREE.BackSide,
    fog: false,
  });
  const eyeMat = new THREE.MeshBasicMaterial({
    color: 0x090d16,
    fog: false,
  });
  const pupilGlowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    fog: false,
  });
  const blushMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.65,
    fog: false,
  });
  const mouthInnerMat = new THREE.MeshBasicMaterial({
    color: 0x0c4a6e,
    fog: false,
  });

  // 1) Corpo Esculpido de Fantasma Cartoon (Silhueta orgânica estilo lençol flutuante + cauda curvada para cima!)
  const lathePoints: THREE.Vector2[] = [
    new THREE.Vector2(0.001, 1.76),
    new THREE.Vector2(0.18, 1.73),
    new THREE.Vector2(0.32, 1.62),
    new THREE.Vector2(0.38, 1.44),
    new THREE.Vector2(0.36, 1.22),
    new THREE.Vector2(0.41, 0.96),
    new THREE.Vector2(0.48, 0.68),
    new THREE.Vector2(0.55, 0.42),
    new THREE.Vector2(0.46, 0.24),
    new THREE.Vector2(0.24, 0.12),
    new THREE.Vector2(0.001, 0.04),
  ];
  const ghostSheetGeo = new THREE.LatheGeometry(lathePoints, 20);
  const ghostBody = new THREE.Mesh(ghostSheetGeo, spectralCoreMat);
  group.add(ghostBody);

  // Contorno Cartoon Branco Brilhante + Contorno Azul Profundo para destacar a silhueta!
  const ghostWhiteHull = new THREE.Mesh(ghostSheetGeo, whiteOutlineMat);
  ghostWhiteHull.scale.set(1.065, 1.035, 1.065);
  group.add(ghostWhiteHull);

  const ghostDarkHull = new THREE.Mesh(ghostSheetGeo, darkOutlineMat);
  ghostDarkHull.scale.set(1.105, 1.055, 1.105);
  group.add(ghostDarkHull);

  // 2) Babados Ondulados Cartoon na Barra do Lençol + Cauda Espectral Flutuante
  const ruffleCount = 7;
  for (let i = 0; i < ruffleCount; i++) {
    const ang = (i / ruffleCount) * Math.PI * 2;
    const ruffle = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.38, 10),
      i % 2 === 0 ? spectralCoreMat : spectralOuterMat
    );
    ruffle.rotation.x = Math.PI;
    ruffle.position.set(Math.cos(ang) * 0.44, 0.26, Math.sin(ang) * 0.44);
    ruffle.rotation.z = Math.cos(ang) * 0.22;
    const ruffleHull = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.41, 10), whiteOutlineMat);
    ruffle.add(ruffleHull);
    group.add(ruffle);
  }

  // Cauda espiralada cartoon subindo atrás
  const wispTail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.62, 12), spectralOuterMat);
  wispTail.rotation.x = Math.PI * 0.78;
  wispTail.position.set(0, 0.18, -0.22);
  group.add(wispTail);

  // 3) Rosto Cartoon Super Expressivo (Olhões Brilhantes + Sobrancelhas Flutuantes + Bochechas + Boca Feliz!)
  for (const s of [-1, 1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 12), eyeMat);
    eye.scale.set(1.0, 1.38, 0.58);
    eye.position.set(s * 0.135, 1.42, 0.34);
    group.add(eye);

    // Brilho duplo cartoon nos olhos
    const shineBig = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), pupilGlowMat);
    shineBig.position.set(s * 0.118, 1.46, 0.38);
    group.add(shineBig);

    const shineSmall = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), pupilGlowMat);
    shineSmall.position.set(s * 0.15, 1.39, 0.38);
    group.add(shineSmall);

    // Sobrancelha expressiva flutuante
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.09, 4, 8), eyeMat);
    brow.position.set(s * 0.14, 1.58, 0.33);
    brow.rotation.z = Math.PI * 0.5 - s * 0.22;
    group.add(brow);

    // Bochecha luminosa azul-celeste
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), blushMat);
    blush.scale.set(1.3, 0.75, 0.4);
    blush.position.set(s * 0.23, 1.33, 0.31);
    group.add(blush);
  }

  // Boca alegre cartoon aberta esperando a pizza
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), mouthInnerMat);
  mouth.scale.set(1.25, 0.95, 0.48);
  mouth.position.set(0, 1.25, 0.35);
  group.add(mouth);

  // 4) Braços Gordinhos Cartoon com Contorno Branco Acenando!
  const makeGhostArm = (dir: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(dir * 0.35, 1.14, 0.08);
    const armGeo = new THREE.CapsuleGeometry(0.095, 0.32, 8, 12);
    const armMesh = new THREE.Mesh(armGeo, spectralCoreMat);
    armMesh.position.set(dir * 0.18, 0.14, 0);
    armMesh.rotation.z = -dir * 0.65;
    const armHull = new THREE.Mesh(armGeo, whiteOutlineMat);
    armHull.scale.setScalar(1.15);
    armMesh.add(armHull);
    pivot.add(armMesh);
    group.add(pivot);
    return pivot;
  };

  const leftArm = makeGhostArm(-1);
  const rightArm = makeGhostArm(1);

  // 5) Auréola & Anéis Espectrais Luminosos Flutuando
  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.78, 24),
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
      fog: false,
    })
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.06;
  group.add(auraRing);

  return {
    root: group,
    group,
    leftArm,
    rightArm,
    wavingArmPivot: rightArm,
    catchingArmPivot: leftArm,
    auraRing,
    update: (elapsed: number, happyBounce: number) => {
      // Flutuação viva e subida alegre quando recebe a pizza!
      group.position.y = Math.sin(elapsed * 4.2) * 0.18 + happyBounce * 0.85;
      group.rotation.z = Math.sin(elapsed * 2.8) * 0.08;
      leftArm.rotation.z = Math.sin(elapsed * 6.0) * 0.32;
      rightArm.rotation.z = -Math.sin(elapsed * 6.0) * 0.32;
      auraRing.scale.setScalar(1 + Math.sin(elapsed * 4.8) * 0.15);
    },
  };
}

/**
 * Constrói a Alma / Fantasma Cartoon Libertado que sai do corpo do Fantasma ao receber a pizza,
 * voando lá pra cima em direção ao céu com asas de anjo cartoon, rosto feliz e trilha estelar!
 */
export interface LiberatedSoulAscensionRig {
  root: THREE.Group;
  group: THREE.Group;
  coreMat: THREE.MeshBasicMaterial;
  auraMat: THREE.MeshBasicMaterial;
  haloMat: THREE.MeshBasicMaterial;
  wingsLeft: THREE.Object3D;
  wingsRight: THREE.Object3D;
  sparkles: THREE.Mesh[];
  update: (progress01: number, elapsed: number) => void;
}

export function buildLiberatedSoulAscensionRig(): LiberatedSoulAscensionRig {
  const group = new THREE.Group();
  group.name = 'Inferno_Liberated_Soul_Rig';
  group.visible = false;

  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xf0f9ff,
    transparent: true,
    opacity: 0.96,
    fog: false,
    depthTest: false,
  });
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
    side: THREE.BackSide,
    fog: false,
    depthTest: false,
  });
  const cyanRimMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.65,
    side: THREE.BackSide,
    fog: false,
    depthTest: false,
  });
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.98,
    fog: false,
    depthTest: false,
  });
  const faceMat = new THREE.MeshBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.95,
    fog: false,
    depthTest: false,
  });

  // 1) Corpo Esculpido de Fantasminha Cartoon Feliz Voando pra Cima (com Contorno Branco e Halo Azul!)
  const soulLathePts: THREE.Vector2[] = [
    new THREE.Vector2(0.001, 1.05),
    new THREE.Vector2(0.20, 1.01),
    new THREE.Vector2(0.35, 0.88),
    new THREE.Vector2(0.38, 0.66),
    new THREE.Vector2(0.34, 0.42),
    new THREE.Vector2(0.40, 0.16),
    new THREE.Vector2(0.30, -0.14),
    new THREE.Vector2(0.16, -0.44),
    new THREE.Vector2(0.05, -0.72),
    new THREE.Vector2(0.001, -0.88),
  ];
  const soulBodyGeo = new THREE.LatheGeometry(soulLathePts, 20);
  const soulBody = new THREE.Mesh(soulBodyGeo, coreMat);
  soulBody.renderOrder = 25;

  const soulWhiteOutline = new THREE.Mesh(soulBodyGeo, auraMat);
  soulWhiteOutline.scale.set(1.09, 1.05, 1.09);
  soulWhiteOutline.renderOrder = 24;

  const soulCyanOutline = new THREE.Mesh(soulBodyGeo, cyanRimMat);
  soulCyanOutline.scale.set(1.16, 1.09, 1.16);
  soulCyanOutline.renderOrder = 23;
  group.add(soulCyanOutline, soulWhiteOutline, soulBody);

  // 2) Rosto Cartoon Feliz de Alma Purificada (Olhos em arco sorridentes + Sorriso + Brilho!)
  for (const s of [-1, 1] as const) {
    const happyEye = new THREE.Mesh(
      new THREE.TorusGeometry(0.068, 0.022, 8, 16, Math.PI),
      faceMat
    );
    happyEye.position.set(s * 0.13, 0.68, 0.35);
    happyEye.renderOrder = 27;
    group.add(happyEye);
  }
  const happySmile = new THREE.Mesh(
    new THREE.TorusGeometry(0.085, 0.022, 8, 16, Math.PI),
    faceMat
  );
  happySmile.rotation.z = Math.PI;
  happySmile.position.set(0, 0.56, 0.35);
  happySmile.renderOrder = 27;
  group.add(happySmile);

  // 3) Bracinhos Cartoon Erguidos Celebrando a Subida ao Céu!
  for (const s of [-1, 1] as const) {
    const armGeo = new THREE.CapsuleGeometry(0.085, 0.28, 8, 10);
    const arm = new THREE.Mesh(armGeo, coreMat);
    arm.position.set(s * 0.42, 0.62, 0.08);
    arm.rotation.z = -s * 0.55;
    arm.renderOrder = 25;
    const armOutline = new THREE.Mesh(armGeo, auraMat);
    armOutline.scale.setScalar(1.18);
    armOutline.renderOrder = 24;
    arm.add(armOutline);
    group.add(arm);
  }

  // 4) Auréola Dourada/Branca Celestial Luminosa
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.048, 12, 28), haloMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 1.24, 0);
  halo.renderOrder = 27;
  group.add(halo);

  // 5) Asas de Anjo Cartoon Esculpidas com Penas Camadas + Contorno Branco
  const buildCartoonWing = (dir: -1 | 1) => {
    const wingRoot = new THREE.Group();
    wingRoot.position.set(dir * 0.34, 0.58, -0.06);
    const featherSpecs = [
      { len: 0.68, rad: 0.13, y: 0.14, ang: 0.22 },
      { len: 0.56, rad: 0.11, y: -0.02, ang: -0.04 },
      { len: 0.42, rad: 0.095, y: -0.16, ang: -0.28 },
    ];
    for (const f of featherSpecs) {
      const fGeo = new THREE.CapsuleGeometry(f.rad, f.len, 8, 12);
      fGeo.rotateZ(Math.PI / 2);
      const fMesh = new THREE.Mesh(fGeo, coreMat);
      fMesh.scale.set(1.0, 0.65, 0.28);
      fMesh.position.set(dir * (f.len * 0.52), f.y, 0);
      fMesh.rotation.z = dir * f.ang;
      fMesh.renderOrder = 25;
      const fHull = new THREE.Mesh(fGeo, auraMat);
      fHull.scale.setScalar(1.16);
      fHull.renderOrder = 24;
      fMesh.add(fHull);
      wingRoot.add(fMesh);
    }
    group.add(wingRoot);
    return wingRoot;
  };

  const wingsLeft = buildCartoonWing(-1);
  const wingsRight = buildCartoonWing(1);

  // 6) Estrelas e Anéis de Luz Subindo ao Redor do Fantasma Cartoon
  const sparkles: THREE.Mesh[] = [];
  const sparkGeo = new THREE.OctahedronGeometry(0.12, 0);
  for (let i = 0; i < 10; i++) {
    const sp = new THREE.Mesh(sparkGeo, i % 2 === 0 ? haloMat : auraMat);
    sp.renderOrder = 27;
    group.add(sp);
    sparkles.push(sp);
  }

  return {
    root: group,
    group,
    coreMat,
    auraMat,
    haloMat,
    wingsLeft,
    wingsRight,
    sparkles,
    update: (progress01: number, elapsed: number) => {
      const popIn = Math.min(1, progress01 / 0.12);
      const fade = 1 - Math.pow(Math.max(0, (progress01 - 0.62) / 0.38), 1.45);
      const alpha = popIn * fade;
      coreMat.opacity = 0.96 * alpha;
      auraMat.opacity = 0.92 * alpha;
      cyanRimMat.opacity = 0.68 * alpha;
      haloMat.opacity = 0.98 * alpha;
      faceMat.opacity = 0.95 * alpha;

      // Bater de asas alegre e fluido enquanto voa lá pra cima!
      const flap = Math.sin(elapsed * 18.0) * 0.42;
      wingsLeft.rotation.z = 0.25 + flap;
      wingsLeft.rotation.y = Math.cos(elapsed * 18.0) * 0.22;
      wingsRight.rotation.z = -0.25 - flap;
      wingsRight.rotation.y = -Math.cos(elapsed * 18.0) * 0.22;

      for (let i = 0; i < sparkles.length; i++) {
        const a = (i / sparkles.length) * Math.PI * 2 + elapsed * 5.2;
        const radius = 0.58 + Math.sin(elapsed * 4.0 + i) * 0.14;
        sparkles[i].position.set(
          Math.cos(a) * radius,
          -0.45 + ((i * 0.22 + elapsed * 1.8) % 1.8),
          Math.sin(a) * radius
        );
        sparkles[i].rotation.set(elapsed * 6, elapsed * 8, i);
        sparkles[i].scale.setScalar(alpha * (0.75 + (i % 3) * 0.22));
      }
    },
  };
}

/**
 * Adapta qualquer veículo para o estilo infernal do Mapa INFERNO:
 * - Chamas cartoon na parte externa (capô, teto e laterais)
 * - Rodas pegando fogo
 * - Detalhes de ossos / caveira demoníaca no para-choque dianteiro
 * - Fumaça e brasas subindo
 */
export function buildInfernalVehicleOverlayGroup(
  _halfW?: number,
  _halfL?: number,
  _height?: number
): {
  group: THREE.Group;
  flames: THREE.Mesh[];
  wheelRings: THREE.Mesh[];
  smokePuffs: THREE.Mesh[];
} {
  const group = new THREE.Group();
  group.name = 'Infernal_Vehicle_Overlay';

  const boneMat = new THREE.MeshToonMaterial({ color: 0xfef3c7 });
  const hornMat = new THREE.MeshToonMaterial({ color: 0x1c1917 });
  const outerFlameMat = new THREE.MeshBasicMaterial({
    color: 0xff2a00,
    transparent: true,
    opacity: 0.92,
    fog: false,
  });
  const innerFlameMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.95,
    fog: false,
  });
  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0x18181b,
    transparent: true,
    opacity: 0.58,
    fog: false,
  });
  applyWorldCurvatureToMaterial(boneMat);
  applyWorldCurvatureToMaterial(hornMat);
  applyWorldCurvatureToMaterial(outerFlameMat);
  applyWorldCurvatureToMaterial(innerFlameMat);
  applyWorldCurvatureToMaterial(smokeMat);

  // 1. Caveira e Chifres de Osso no Para-Choque Dianteiro (+Z e -Z para qualquer direção)
  for (const zDir of [-1, 1] as const) {
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.38, 0.26), boneMat);
    skull.position.set(0, 0.68, zDir * 2.18);
    group.add(skull);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), innerFlameMat);
    eyeL.position.set(-0.12, 0.72, zDir * 2.31);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), innerFlameMat);
    eyeR.position.set(0.12, 0.72, zDir * 2.31);
    group.add(eyeR);

    for (const side of [-1, 1] as const) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.56, 8), boneMat);
      horn.position.set(side * 0.42, 0.85, zDir * 2.15);
      horn.rotation.z = -side * 0.65;
      horn.rotation.x = zDir * 0.35;
      group.add(horn);

      // Costelas de osso nas laterais da carroceria
      for (let r = -1; r <= 1; r++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.12), boneMat);
        rib.position.set(side * 1.02, 0.78, r * 0.65);
        rib.rotation.z = side * 0.18;
        group.add(rib);
      }
    }
  }

  // 2. Rodas Pegando Fogo (4 aros flamejantes nas posições das rodas)
  const wheelRings: THREE.Mesh[] = [];
  const wheelCoords: Array<[number, number, number]> = [
    [-0.98, 0.38, 1.32],
    [0.98, 0.38, 1.32],
    [-0.98, 0.38, -1.32],
    [0.98, 0.38, -1.32],
  ];
  const ringGeo = new THREE.TorusGeometry(0.38, 0.09, 8, 16);
  for (const [wx, wy, wz] of wheelCoords) {
    const wRing = new THREE.Mesh(ringGeo, outerFlameMat);
    wRing.rotation.y = Math.PI / 2;
    wRing.position.set(wx, wy, wz);
    group.add(wRing);
    wheelRings.push(wRing);

    const wCore = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 6, 12), innerFlameMat);
    wCore.rotation.y = Math.PI / 2;
    wCore.position.set(wx + (wx > 0 ? 0.03 : -0.03), wy, wz);
    group.add(wCore);
  }

  // 3. Chamas Cartoon Vibrantes no Capô, Teto e Laterais
  const flames: THREE.Mesh[] = [];
  const flamePositions: Array<[number, number, number, number]> = [
    [0, 1.15, 1.45, 1.1],
    [-0.55, 1.08, 1.25, 0.85],
    [0.55, 1.08, 1.25, 0.85],
    [0, 1.65, 0.0, 1.25],
    [-0.65, 1.42, -0.35, 0.9],
    [0.65, 1.42, -0.35, 0.9],
    [0, 1.18, -1.45, 1.05],
  ];
  const outerConeGeo = new THREE.ConeGeometry(0.28, 0.88, 8);
  const innerConeGeo = new THREE.ConeGeometry(0.16, 0.62, 8);
  for (const [fx, fy, fz, fScale] of flamePositions) {
    const fOuter = new THREE.Mesh(outerConeGeo, outerFlameMat);
    fOuter.position.set(fx, fy, fz);
    fOuter.scale.setScalar(fScale);
    group.add(fOuter);
    flames.push(fOuter);

    const fInner = new THREE.Mesh(innerConeGeo, innerFlameMat);
    fInner.position.set(fx, fy - 0.06, fz + 0.02);
    fInner.scale.setScalar(fScale);
    group.add(fInner);
    flames.push(fInner);
  }

  // 4. Nuvens de Fumaça Escura Subindo
  const smokePuffs: THREE.Mesh[] = [];
  const smokeGeo = new THREE.DodecahedronGeometry(0.24, 1);
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Mesh(smokeGeo, smokeMat);
    sp.position.set((i % 2 === 0 ? -1 : 1) * 0.35, 1.85 + i * 0.25, -0.2 - i * 0.35);
    group.add(sp);
    smokePuffs.push(sp);
  }

  return { group, flames, wheelRings, smokePuffs };
}


