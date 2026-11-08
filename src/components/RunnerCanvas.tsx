import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  createMotoInstance,
  createSingleCartoonPizzaBoxMesh,
  type MotoInstance,
} from '../services/motoModelLoader';
import { type MotoboyCharacterId } from '../services/motoboyModelLoader';
import {
  createCarameloInstance,
  type CarameloInstance,
  type PlayMode,
} from '../services/carameloModelLoader';
import {
  createTrafficVehiclePool,
  type PooledTrafficVehicle,
} from '../services/trafficVehicleLoader';
import { sound } from '../services/soundEffects';
import {
  BEHIND_GAMEPLAY_CULL_Z,
  DEFAULT_WORLD_CURVE_Y,
  FOG_DISTANCE_FAR,
  FOG_DISTANCE_NEAR,
  HOUSE_VARIATIONS,
  LANE_INDICES,
  MAX_CULL_DISTANCE_FAVELA_Z,
  MAX_CULL_DISTANCE_HOUSE_Z,
  MAX_CULL_DISTANCE_PROP_Z,
  WORLD_CURVE_START_Z,
  type LaneIndex,
  type PlayerState,
  createInitialPlayerState,
  computeFavelaFadeOpacity,
  computeHouseHorizonFadeFactor,
  computeMountainVistaPlacement,
  computeObjectLodAndCulling,
  computeRoadTextureOffsetDelta,
  evaluateFavelaOcclusion,
  getHouseVariationByIndex,
  laneToX,
  shiftLane,
  stepPlayerPhysics,
  triggerJump,
  triggerRoll,
} from '../game/rules';
import {
  createPainterlySkyTexture,
  createSidewalkTexture,
  createStreetRoadBumpTexture,
  createStreetRoadTexture,
  type SkyPreset,
} from '../game/textures';
import {
  type BirdRig,
  type CartoonBrawlFinaleRig,
  type CartoonManholeHazardRig,
  type CashDenomination,
  type DangerGroundStripRig,
  type FloatingHeadBanknoteRig,
  type PizzaDeliveryZoneRig,
  applyFavelaDistanceOpacity,
  applyGroupLodState,
  applyHouseDistanceOpacity,
  applyWorldCurvatureToMaterial,
  buildBrazilianHouse,
  buildBrazilianOrelhao,
  buildCarameloAttackIndicator,
  buildCartoonBrawlFinaleRig,
  buildCartoonCashStackMesh,
  buildCartoonManholeHazard,
  buildCartoonMeatMesh,
  buildCartoonWhiteBoneMesh,
  buildCoinMesh,
  buildCorcovadoAndCristoRedentor,
  buildDangerLaneGroundStrip,
  buildFloatingHeadBanknote,
  buildHillsideFavelaCluster,
  buildHorizonCitySkyline,
  buildNightSkyStarsAndAurora,
  buildPizzaDeliveryZoneRig,
  buildRealisticHorizonSun,
  buildRoadsideOutdoorBillboard,
  buildSparseSidewalkCarameloProp,
  buildStreetMotionRow,
  buildStylizedRunner,
  buildTropicalBird,
  buildUtilityPoleWithWires,
  createCartoonSmokePuffGeometry,
  createDynamicSkyDomeMaterial,
  setNightStreetLightIntensity,
  worldCurveUniforms,
} from '../game/builders';

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';
export type BitePrecisionQuality = 'miss' | 'weak' | 'good' | 'perfect';

export interface HudSnapshot {
  score: number;
  bestScore: number;
  coins: number;
  distance: number;
  hp: number;
  maxHp: number;
  combo: number;
  speed: number;
  housesPassed: number;
  leftHouseId: number;
  leftHouseName: string;
  rightHouseId: number;
  rightHouseName: string;
  bonesCollected?: number;
  stamina?: number;
  meatBoostActive?: boolean;
  biteReady?: boolean;
  biteCooldownRatio?: number;
  targetMotoboyHp?: number;
  targetMotoboyMaxHp?: number;
  motoboysDefeated?: number;
  carameloAttackWarning?: boolean;
  bitePrecisionActive?: boolean;
  bitePrecisionMarker?: number;
  biteLastResult?: { quality: BitePrecisionQuality; nonce: number } | null;
  brawlFinaleActive?: boolean;
  dodgeSuccessNonce?: number;
  playerScreenPos?: { x: number; y: number };
  pizzasLeft?: number;
  pizzasDelivered?: number;
  pizzaMissionGoal?: number;
  inDeliveryZone?: boolean;
  deliveryZoneSide?: 'left' | 'right' | null;
  lastPizzaDeliveredNonce?: number;
  tutorialPhase?: 'none' | 'approaching' | 'slowmo' | 'complete';
  tutorialBannerText?: string | null;
  wheelieBalanceRatio?: number;
  missionVictorySequenceActive?: boolean;
}

export type GraphicsQualityPreset = 'low' | 'medium' | 'high' | 'ultra';
export type RenderDistancePreset = 'low' | 'medium' | 'high';
export type GameDifficulty = 'easy' | 'medium' | 'hard';

interface RunnerCanvasProps {
  phase: GamePhase;
  skyPreset: SkyPreset;
  inspectedHouseId: number | null;
  runNonce: number;
  equippedMotoId?: string;
  equippedMotoboyId?: MotoboyCharacterId;
  equippedCarameloId?: string;
  playMode?: PlayMode;
  graphicsPreset?: GraphicsQualityPreset;
  renderDistance?: RenderDistancePreset;
  fpsLimit?: number;
  difficulty?: GameDifficulty;
  onHudUpdate: (hud: HudSnapshot) => void;
  onCashCollected?: (amount: number, denomination: CashDenomination) => void;
  onBoneCollected?: (rewardAmount: number, kind: 'bone' | 'meat' | 'bite') => void;
  onWaterJetSplash?: (intensity: number) => void;
  onGameOver: (finalHud: HudSnapshot, crashReason?: string) => void;
  controlTriggerRef: React.MutableRefObject<{
    left: () => void;
    right: () => void;
    jump: () => void;
    roll: () => void;
    wheelie?: () => void;
    bite?: () => void;
    throwPizza?: () => void;
    setHoldLeft?: (down: boolean) => void;
    setHoldRight?: (down: boolean) => void;
    setHoldWheelie?: (down: boolean) => void;
  } | null>;
}

const HOUSE_SLOT_STEP_Z = 15.6; // Generous spacing so each house + 2-story brick construction lot breathes
const NUM_HOUSE_PAIRS = 10; // Covers z = +14.5m (behind camera) to -141.5m (156.0m loop cycle)
const POLE_STEP_Z = 15.6; // Synchronized with HOUSE_SLOT_STEP_Z & BILLBOARD_STEP_Z so poles never block billboards!
const NUM_POLE_PAIRS = 10; // Exact 156.0m loop cycle matching NUM_HOUSE_PAIRS * HOUSE_SLOT_STEP_Z
const ORELHAO_STEP_Z = 78.0; // Sparse spacing so Orelhões appear only occasionally ("remova alguns orelhoes, deixe apenas algumas vezes aparecendo")
const NUM_ORELHAO_PAIRS = 2; // Exact 156.0m loop cycle (2 * 78.0m)
const BILLBOARD_STEP_Z = 31.2; // Exact 2 * HOUSE_SLOT_STEP_Z so billboards always stay locked in the open inter-house gaps!
const NUM_BILLBOARD_PAIRS = 5; // Exact 156.0m loop cycle (5 * 31.2m = 10 * 15.6m) so billboards never drift into houses!
const FAVELA_STEP_Z = 18.0;
const NUM_FAVELA_PAIRS = 8; // Covers z = +14.5m to -130m so favelas never disappear while visible on screen!
const STREET_MOTION_STEP_Z = 11.0;
const NUM_STREET_MOTION_ROWS = 12; // Reflector stud rows covering camera frustum to horizon

export const RunnerCanvas: React.FC<RunnerCanvasProps> = ({
  phase,
  skyPreset,
  inspectedHouseId,
  runNonce,
  equippedMotoId,
  equippedMotoboyId = 'motoboy_1',
  equippedCarameloId = 'caramelo_default',
  playMode = 'moto',
  graphicsPreset = 'high',
  renderDistance = 'high',
  fpsLimit = 0,
  difficulty = 'medium',
  onHudUpdate,
  onCashCollected,
  onBoneCollected,
  onWaterJetSplash,
  onGameOver,
  controlTriggerRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<GamePhase>(phase);
  const skyPresetRef = useRef<SkyPreset>(skyPreset);
  const inspectedHouseRef = useRef<number | null>(inspectedHouseId);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onCashCollectedRef = useRef(onCashCollected);
  const onBoneCollectedRef = useRef(onBoneCollected);
  const onWaterJetSplashRef = useRef(onWaterJetSplash);
  const onGameOverRef = useRef(onGameOver);
  const bestScoreRef = useRef<number>(0);
  const equippedMotoRef = useRef<string | undefined>(equippedMotoId);
  const equippedMotoboyRef = useRef<MotoboyCharacterId>(equippedMotoboyId);
  const equippedCarameloRef = useRef<string>(equippedCarameloId);
  const playModeRef = useRef<PlayMode>(playMode);
  const graphicsPresetRef = useRef<GraphicsQualityPreset>(graphicsPreset);
  const renderDistanceRef = useRef<RenderDistancePreset>(renderDistance);
  const fpsLimitRef = useRef<number>(fpsLimit);
  const difficultyRef = useRef<GameDifficulty>(difficulty);

  phaseRef.current = phase;
  skyPresetRef.current = skyPreset;
  inspectedHouseRef.current = inspectedHouseId;
  onHudUpdateRef.current = onHudUpdate;
  onCashCollectedRef.current = onCashCollected;
  onBoneCollectedRef.current = onBoneCollected;
  onWaterJetSplashRef.current = onWaterJetSplash;
  onGameOverRef.current = onGameOver;
  equippedMotoRef.current = equippedMotoId;
  equippedMotoboyRef.current = equippedMotoboyId;
  equippedCarameloRef.current = equippedCarameloId;
  playModeRef.current = playMode;
  graphicsPresetRef.current = graphicsPreset;
  renderDistanceRef.current = renderDistance;
  fpsLimitRef.current = fpsLimit;
  difficultyRef.current = difficulty;

  const resetRunRef = useRef<(() => void) | null>(null);
  const updateSkyRef = useRef<((preset: SkyPreset) => void) | null>(null);
  const updateMotoRef = useRef<((id: string) => void) | null>(null);
  const updateMotoboyRef = useRef<((id: MotoboyCharacterId) => void) | null>(null);
  const updateCarameloRef = useRef<((id: string) => void) | null>(null);
  const updateGraphicsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (resetRunRef.current && runNonce > 0) {
      resetRunRef.current();
    }
  }, [runNonce]);

  useEffect(() => {
    if (resetRunRef.current) {
      resetRunRef.current();
    }
  }, [playMode]);

  useEffect(() => {
    if (updateSkyRef.current) {
      updateSkyRef.current(skyPreset);
    }
  }, [skyPreset]);

  useEffect(() => {
    if (updateMotoRef.current && equippedMotoId) {
      updateMotoRef.current(equippedMotoId);
    }
  }, [equippedMotoId]);

  useEffect(() => {
    if (updateMotoboyRef.current && equippedMotoboyId) {
      updateMotoboyRef.current(equippedMotoboyId);
    }
  }, [equippedMotoboyId]);

  useEffect(() => {
    if (updateCarameloRef.current && equippedCarameloId) {
      updateCarameloRef.current(equippedCarameloId);
    }
  }, [equippedCarameloId]);

  useEffect(() => {
    if (updateGraphicsRef.current) {
      updateGraphicsRef.current();
    }
  }, [graphicsPreset, renderDistance, fpsLimit]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL detection
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initW = container.clientWidth || window.innerWidth;
    const initH = container.clientHeight || window.innerHeight;
    renderer.setSize(initW, initH);
    renderer.domElement.dataset.testid = 'runner-canvas';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const maxAniso = renderer.capabilities.getMaxAnisotropy() || 1;

    // 2. Scene, Studio Environment & Clean Atmospheric Horizon Fog
    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const fogColor = new THREE.Color('#F7C8A0');
    scene.background = fogColor;
    scene.fog = new THREE.Fog(fogColor, FOG_DISTANCE_NEAR, FOG_DISTANCE_FAR);

    const camera = new THREE.PerspectiveCamera(68, initW / initH, 0.35, 290);
    camera.position.set(0, 2.75, 5.55);
    camera.lookAt(0, 2.1, -36);

    // 3. Iluminação Solar Direcional Equilibrada c/ Sombras Projetadas Limpas & Sem Flicker (Item 9)
    const hemiLight = new THREE.HemisphereLight(0xfff4de, 0x4d7c0f, 1.18);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.74);
    sunLight.position.set(-22, 62, -52);
    sunLight.target.position.set(0, 0, -18);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 12;
    sunLight.shadow.camera.far = 132;
    sunLight.shadow.camera.left = -13.5;
    sunLight.shadow.camera.right = 13.5;
    sunLight.shadow.camera.top = 26;
    sunLight.shadow.camera.bottom = -11;
    sunLight.shadow.bias = -0.00038;
    sunLight.shadow.normalBias = 0.026;
    sunLight.shadow.radius = 2.0;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const rimLight = new THREE.DirectionalLight(0xfef08a, 0.78);
    rimLight.position.set(14, 18, 22);
    scene.add(rimLight);

    // 4. Domo de Céu Dinâmico 360° + Sol Cinematográfico + Estrelas Cintilantes, Lua & Aurora Boreal!
    const skyGeo = new THREE.SphereGeometry(250, 32, 20);
    const daySkyTex = createPainterlySkyTexture('tropical_morning');
    const sunsetSkyTex = createPainterlySkyTexture('sunset_dramatic');
    const dynamicSky = createDynamicSkyDomeMaterial(daySkyTex, sunsetSkyTex);
    const skyDome = new THREE.Mesh(skyGeo, dynamicSky.material);
    skyDome.position.set(0, -10, -45);
    scene.add(skyDome);

    const realisticSun = buildRealisticHorizonSun();
    scene.add(realisticSun.group);

    const nightStarsAndAurora = buildNightSkyStarsAndAurora();
    scene.add(nightStarsAndAurora.group);

    // Estado dinâmico do escalonamento gráfico (Low -> Ultra mantendo beleza + alta performance!)
    let activeCullScale = 1.0;
    let activeSunQuality = 0.85;
    let activeMaxTraffic = 8;
    let showAtmosphericParticles = true;
    let showContactShadows = true;

    // Fase contínua do Ciclo Dia -> Pôr do Sol -> Noite Estrelada c/ Aurora Boreal (0.0 .. 1.0)
    const presetToCyclePhase = (preset: SkyPreset): number => {
      if (preset === 'tropical_morning') return 0.06; // Dia Tropical Aberto
      if (preset === 'sunset_dramatic') return 0.21; // Pôr do Sol Dourado rumo à Noite
      return 0.5; // Noite Estrelada com Aurora Boreal
    };
    let dayNightCycleProgress = presetToCyclePhase(skyPresetRef.current);

    // Cores pré-alocadas do ciclo Dia/Noite (Zero GC Alloc por frame!)
    const _fogDay = new THREE.Color('#BAE6FD');
    const _fogSunset = new THREE.Color('#F79E6B');
    const _fogNight = new THREE.Color('#0B1736');
    const _sunColDay = new THREE.Color('#FFFFFF');
    const _sunColSunset = new THREE.Color('#FF9E5E');
    const _sunColNight = new THREE.Color('#7DD3FC');
    const _hemiSkyDay = new THREE.Color('#E0F2FE');
    const _hemiSkySunset = new THREE.Color('#FDE68A');
    const _hemiSkyNight = new THREE.Color('#2DD4BF');
    const _hemiGndDay = new THREE.Color('#4D7C0F');
    const _hemiGndNight = new THREE.Color('#1E1B4B');
    const _rimDay = new THREE.Color('#FEF08A');
    const _rimNight = new THREE.Color('#34D399');
    const _skyTintDay = new THREE.Color('#FFF1E6');
    const _skyTintNight = new THREE.Color('#132A4A');

    const applyDayNightAtmosphere = (
      elapsed: number,
      dt: number,
      playerSpeed: number,
      isRunning: boolean,
    ) => {
      const solarCos = Math.cos(dayNightCycleProgress * Math.PI * 2);
      const sunVisibility = THREE.MathUtils.smoothstep(solarCos, -0.22, 0.42);
      const nightMix = THREE.MathUtils.smoothstep(-solarCos, -0.08, 0.38);
      const twilightBell = Math.exp(-Math.pow((Math.abs(solarCos) - 0.06) / 0.34, 2.0));
      const sunsetMix = THREE.MathUtils.clamp(twilightBell * (1.0 - nightMix * 0.65), 0, 1);

      dynamicSky.setCycleWeights(sunsetMix, nightMix, elapsed);
      realisticSun.update(elapsed, activeSunQuality, sunVisibility, sunsetMix);
      nightStarsAndAurora.update(elapsed, nightMix, activeSunQuality);
      setNightStreetLightIntensity(nightMix);

      fogColor.copy(_fogDay).lerp(_fogSunset, sunsetMix).lerp(_fogNight, nightMix);
      scene.background = fogColor;
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.copy(fogColor);
      }
      worldCurveUniforms.uHorizonFogColor.value.copy(fogColor);
      worldCurveUniforms.uHorizonFogSkyTint.value.copy(_skyTintDay).lerp(_skyTintNight, nightMix);

      sunLight.color.copy(_sunColDay).lerp(_sunColSunset, sunsetMix).lerp(_sunColNight, nightMix);
      sunLight.intensity = THREE.MathUtils.lerp(1.74, 1.04, nightMix);
      sunLight.position.set(
        THREE.MathUtils.lerp(-22, 24, nightMix),
        THREE.MathUtils.lerp(62, 48, 1.0 - sunVisibility) + nightMix * 12,
        -52,
      );

      hemiLight.color.copy(_hemiSkyDay).lerp(_hemiSkySunset, sunsetMix).lerp(_hemiSkyNight, nightMix * 0.72);
      hemiLight.groundColor.copy(_hemiGndDay).lerp(_hemiGndNight, nightMix * 0.82);
      hemiLight.intensity = THREE.MathUtils.lerp(1.18, 0.96, nightMix);

      rimLight.color.copy(_rimDay).lerp(_rimNight, nightMix);
      rimLight.intensity = THREE.MathUtils.lerp(0.78, 1.12, nightMix);
    };

    updateSkyRef.current = (nextPreset: SkyPreset) => {
      dayNightCycleProgress = presetToCyclePhase(nextPreset);
      applyDayNightAtmosphere(0, 0.016, 0, false);
    };
    applyDayNightAtmosphere(0, 0.016, 0, false);

    // 5. Optimized Sculpted 3D Green Mountains & Smaller White Cristo Redentor Positioned Further Back Behind the Buildings!
    const mountainPlacement = computeMountainVistaPlacement();
    const corcovadoVista = buildCorcovadoAndCristoRedentor();
    corcovadoVista.scale.setScalar(mountainPlacement.scale);
    corcovadoVista.position.set(mountainPlacement.x, mountainPlacement.y, mountainPlacement.z);
    corcovadoVista.rotation.y = 0.16;
    corcovadoVista.updateMatrix();
    corcovadoVista.matrixAutoUpdate = false;
    scene.add(corcovadoVista);

    const horizonSkyline = buildHorizonCitySkyline(maxAniso);
    scene.add(horizonSkyline.group);

    // 6. Wider Forward-Only Cracked Brazilian Asphalt Road (11.6m wide)
    const roadTex = createStreetRoadTexture(maxAniso);
    const roadBumpTex = createStreetRoadBumpTexture(maxAniso);

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      bumpMap: roadBumpTex,
      bumpScale: 0.05,
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.06,
    });
    applyWorldCurvatureToMaterial(roadMat);

    // Função de aplicação ao vivo dos presets gráficos (Low até Ultra bonitos e super leves!)
    const applyGraphicsConfig = () => {
      const gp = graphicsPresetRef.current;
      const rd = renderDistanceRef.current;
      const dpr = window.devicePixelRatio || 1;

      const targetPixelRatio = isSoftwareGl
        ? 1
        : gp === 'low'
        ? Math.min(dpr, 1.0)
        : gp === 'medium'
        ? Math.min(dpr, 1.3)
        : gp === 'high'
        ? Math.min(dpr, 1.65)
        : Math.min(dpr, 2.0);

      renderer.setPixelRatio(targetPixelRatio);
      const curW = container.clientWidth || window.innerWidth;
      const curH = container.clientHeight || window.innerHeight;
      renderer.setSize(curW, curH);

      // Mesmo no LOW mantemos exposição viva, cores quentes e contornos nítidos!
      renderer.toneMappingExposure =
        gp === 'low' ? 1.13 : gp === 'medium' ? 1.15 : gp === 'high' ? 1.17 : 1.2;

      roadMat.bumpScale = gp === 'low' ? 0.0 : gp === 'medium' ? 0.035 : gp === 'high' ? 0.055 : 0.075;
      roadMat.needsUpdate = true;

      activeSunQuality = gp === 'low' ? 0.35 : gp === 'medium' ? 0.65 : gp === 'high' ? 0.9 : 1.15;
      activeMaxTraffic = gp === 'low' ? 2 : gp === 'medium' ? 3 : gp === 'high' ? 4 : 4;
      showAtmosphericParticles = gp === 'high' || gp === 'ultra';
      showContactShadows = gp !== 'low';

      const enableProjectedShadows = !isSoftwareGl && gp !== 'low';
      renderer.shadowMap.enabled = enableProjectedShadows;
      sunLight.castShadow = enableProjectedShadows;
      if (enableProjectedShadows) {
        const desiredShadowSize = gp === 'medium' ? 1024 : 2048;
        if (sunLight.shadow.mapSize.x !== desiredShadowSize) {
          sunLight.shadow.mapSize.set(desiredShadowSize, desiredShadowSize);
          if (sunLight.shadow.map) {
            sunLight.shadow.map.dispose();
            sunLight.shadow.map = null;
          }
        }
      }

      const distFactor = rd === 'low' ? 0.72 : rd === 'medium' ? 0.9 : 1.08;
      const presetDistFactor = gp === 'low' ? 0.85 : gp === 'ultra' ? 1.08 : 1.0;
      activeCullScale = distFactor * presetDistFactor;

      if (scene.fog instanceof THREE.Fog) {
        scene.fog.near = FOG_DISTANCE_NEAR * Math.max(0.75, activeCullScale);
        scene.fog.far = FOG_DISTANCE_FAR * Math.max(0.78, activeCullScale);
      }
    };
    updateGraphicsRef.current = applyGraphicsConfig;
    applyGraphicsConfig();

    const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 150, 4, 40), roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -69.5);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Forward-Only Sidewalks (Left & Right) + Whitewashed Curbs ("Meio-Fio Caiado") with Clean Non-Overlapping Coordinates (Zero Z-Fighting!)
    const sidewalkTex = createSidewalkTexture(maxAniso);
    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.04,
    });
    applyWorldCurvatureToMaterial(sidewalkMat);

    const curbMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.75,
    });
    applyWorldCurvatureToMaterial(curbMat);

    for (const sideSign of [-1, 1]) {
      // Sidewalk inner edge sits at x = ±6.15, while curb outer edge sits at x = ±6.13 (0.02m gap + distinct Y height = zero Z-fighting!)
      const sw = new THREE.Mesh(new THREE.BoxGeometry(22, 0.22, 150, 1, 1, 40), sidewalkMat);
      sw.position.set(sideSign * 17.15, 0.11, -69.5);
      sw.receiveShadow = true;
      scene.add(sw);

      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 150, 1, 1, 40), curbMat);
      curb.position.set(sideSign * 5.96, 0.12, -69.5);
      curb.receiveShadow = true;
      scene.add(curb);
    }

    // Physical 3D Street Motion Rows (Reflective Cat's-Eye Studs — Forward-Only!)
    interface StreetMotionSlot {
      z: number;
      mesh: THREE.Group;
    }
    const streetMotionRows: StreetMotionSlot[] = [];
    for (let r = 0; r < NUM_STREET_MOTION_ROWS; r++) {
      const z = 12.0 - r * STREET_MOTION_STEP_Z;
      const rowMesh = buildStreetMotionRow();
      rowMesh.position.set(0, 0, z);
      scene.add(rowMesh);
      streetMotionRows.push({ z, mesh: rowMesh });
    }

    // Forward-Only Outer Green Ground extending only in front of the camera
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x365314,
      roughness: 0.95,
    });
    applyWorldCurvatureToMaterial(terrainMat);
    const terrainMesh = new THREE.Mesh(new THREE.PlaneGeometry(260, 160, 6, 36), terrainMat);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.position.set(0, -0.04, -74.5);
    scene.add(terrainMesh);

    // 7. Pre-build all 30 Brazilian House Variations (aligned straight facing the wider street, with 2-story houses under construction!)
    const leftHousePool: THREE.Group[] = HOUSE_VARIATIONS.map((spec) =>
      buildBrazilianHouse(spec, 'left', maxAniso),
    );
    const rightHousePool: THREE.Group[] = HOUSE_VARIATIONS.map((spec) =>
      buildBrazilianHouse(spec, 'right', maxAniso),
    );

    interface ActiveHouseSlot {
      z: number;
      leftVarIndex: number;
      rightVarIndex: number;
      leftMesh: THREE.Group;
      rightMesh: THREE.Group;
    }

    const activeHouseSlots: ActiveHouseSlot[] = [];
    let nextHouseSeq = 0;

    // Houses placed at x = ±12.0 so their front facades sit clearly behind the poles (±6.45), Orelhões (±6.65), and Billboards (±8.55)!
    const mountSlotMeshes = (slot: ActiveHouseSlot) => {
      slot.leftMesh.position.set(-12.0, 0.22, slot.z);
      slot.rightMesh.position.set(12.0, 0.22, slot.z);
      scene.add(slot.leftMesh);
      scene.add(slot.rightMesh);
    };

    for (let i = 0; i < NUM_HOUSE_PAIRS; i++) {
      const z = 12.0 - i * HOUSE_SLOT_STEP_Z;
      const leftIdx = nextHouseSeq % 30;
      const rightIdx = (nextHouseSeq + 1) % 30;
      nextHouseSeq += 2;

      const slot: ActiveHouseSlot = {
        z,
        leftVarIndex: leftIdx,
        rightVarIndex: rightIdx,
        leftMesh: leftHousePool[leftIdx].clone(),
        rightMesh: rightHousePool[rightIdx].clone(),
      };
      mountSlotMeshes(slot);
      activeHouseSlots.push(slot);
    }

    // 8. Dynamic Colorful Hillside Favela / Morro Communities Elevated Behind the Houses (x = ±15.2, y = 1.8!)
    interface FavelaPair {
      z: number;
      leftFavela: THREE.Group;
      rightFavela: THREE.Group;
    }
    const favelaPairs: FavelaPair[] = [];
    for (let f = 0; f < NUM_FAVELA_PAIRS; f++) {
      const z = 12.0 - f * FAVELA_STEP_Z;
      const leftFavela = buildHillsideFavelaCluster(f * 2, 'left', maxAniso);
      const rightFavela = buildHillsideFavelaCluster(f * 2 + 1, 'right', maxAniso);
      leftFavela.position.set(-15.2, 1.8, z);
      rightFavela.position.set(15.2, 1.8, z);
      scene.add(leftFavela, rightFavela);
      favelaPairs.push({ z, leftFavela, rightFavela });
    }

    // 9. Sidewalk Concrete Utility Poles with Sagging Electrical Wires (Rendering Further Ahead at x = ±6.45!)
    interface PolePair {
      z: number;
      leftPole: THREE.Group;
      rightPole: THREE.Group;
    }
    const polePairs: PolePair[] = [];
    for (let p = 0; p < NUM_POLE_PAIRS; p++) {
      const z = 12.0 - p * POLE_STEP_Z;
      const leftPole = buildUtilityPoleWithWires('left', POLE_STEP_Z, p % 2 === 0, p % 3 === 0);
      const rightPole = buildUtilityPoleWithWires('right', POLE_STEP_Z, false, p % 3 === 1);
      leftPole.position.set(-6.45, 0.22, z);
      rightPole.position.set(6.45, 0.22, z);
      scene.add(leftPole, rightPole);
      polePairs.push({ z, leftPole, rightPole });
    }

    // 9B. Sparse Sidewalk Payphones ("Orelhões BR nas Calçadas — apenas algumas vezes aparecendo") at x = ±6.65
    interface OrelhaoPair {
      z: number;
      activeSide: 'left' | 'right';
      leftOrelhao: THREE.Group;
      rightOrelhao: THREE.Group;
    }
    const orelhaoPairs: OrelhaoPair[] = [];
    for (let o = 0; o < NUM_ORELHAO_PAIRS; o++) {
      const z = -22.0 - o * ORELHAO_STEP_Z;
      const activeSide: 'left' | 'right' = o % 2 === 0 ? 'left' : 'right';
      const leftOrelhao = buildBrazilianOrelhao('left', o * 2);
      const rightOrelhao = buildBrazilianOrelhao('right', o * 2 + 1);
      leftOrelhao.position.set(-6.65, 0.22, z);
      rightOrelhao.position.set(6.65, 0.22, z);
      leftOrelhao.visible = activeSide === 'left';
      rightOrelhao.visible = activeSide === 'right';
      scene.add(leftOrelhao, rightOrelhao);
      orelhaoPairs.push({ z, activeSide, leftOrelhao, rightOrelhao });
    }

    // 9C. Roadside "Outdoor" Billboards ("SEU ANÚNCIO AQUI!") locked in the open inter-house gap (slot.z - 4.2m)
    // and elevated above all roofs (y = 8.95 .. 12.45m) so they NEVER intersect or clip inside any house ("arruem nos autdor para nao ficar bugado dentro das casas")!
    interface BillboardPair {
      leftZ: number;
      rightZ: number;
      showLeft: boolean;
      showRight: boolean;
      leftBillboard: THREE.Group;
      rightBillboard: THREE.Group;
    }
    const billboardPairs: BillboardPair[] = [];
    for (let b = 0; b < NUM_BILLBOARD_PAIRS; b++) {
      const leftZ = 7.8 - b * BILLBOARD_STEP_Z; // Exact slot.z - 4.2m inter-house gap
      const rightZ = -7.8 - b * BILLBOARD_STEP_Z; // Exact slot.z - 4.2m inter-house gap on opposite phase
      const leftBillboard = buildRoadsideOutdoorBillboard('left', b * 2, maxAniso);
      const rightBillboard = buildRoadsideOutdoorBillboard('right', b * 2 + 1, maxAniso);
      leftBillboard.position.set(-11.2, 0.22, leftZ);
      rightBillboard.position.set(11.2, 0.22, rightZ);
      // Item 11: Alterna presença dos outdoors para evitar excesso visual simultâneo nos dois lados
      const showLeft = b % 2 === 0;
      const showRight = b % 2 === 1;
      scene.add(leftBillboard, rightBillboard);
      billboardPairs.push({ leftZ, rightZ, showLeft, showRight, leftBillboard, rightBillboard });
    }

    // 9D. Item 11: Presença Equilibrada e Natural de Caramelos no Cenário (apenas 2 unidades isoladas a cada 78m, sem grupos!)
    const SIDEWALK_DOG_STEP_Z = 78.0;
    const NUM_SIDEWALK_DOGS = 2;
    interface SidewalkCarameloSlot {
      z: number;
      side: 'left' | 'right';
      root: THREE.Group;
      tailPivot: THREE.Group;
    }
    const sidewalkCaramelos: SidewalkCarameloSlot[] = [];
    for (let s = 0; s < NUM_SIDEWALK_DOGS; s++) {
      const z = -54.0 - s * SIDEWALK_DOG_STEP_Z;
      const side: 'left' | 'right' = s % 2 === 0 ? 'right' : 'left';
      const prop = buildSparseSidewalkCarameloProp();
      prop.root.position.set(side === 'left' ? -6.75 : 6.75, 0.22, z);
      prop.root.rotation.y = side === 'left' ? 0.55 : -0.55;
      scene.add(prop.root);
      sidewalkCaramelos.push({ z, side, root: prop.root, tailPivot: prop.tailPivot });
    }

    // 10. Pool Ultra-Otimizado de 7 Veículos na Contramão (Geometrias Fundidas + Removidos da Cena ao Passar da Câmera!)
    let trafficPool: PooledTrafficVehicle[] = [];
    let trafficSpawnTimer = 0.25;
    let trafficWaveCounter = 0;
    let lastSpawnedLane: LaneIndex | null = null;
    let seedInitialTrafficRef: (() => void) | null = null;

    const attachVehicleToScene = (veh: PooledTrafficVehicle) => {
      veh.inUse = true;
      veh.root.visible = true;
      if (!veh.root.parent) {
        scene.add(veh.root);
      }
    };

    const eraseVehicleFromScene = (veh: PooledTrafficVehicle) => {
      veh.inUse = false;
      veh.root.visible = false;
      if (veh.root.parent) {
        scene.remove(veh.root);
      }
    };

    createTrafficVehiclePool()
      .then((pool) => {
        if (isDisposed) {
          for (const v of pool) eraseVehicleFromScene(v);
          return;
        }
        trafficPool = pool;
        if (seedInitialTrafficRef) {
          seedInitialTrafficRef();
        }
      })
      .catch((err) => {
        console.warn('[RunnerCanvas] Erro ao carregar pool de tráfego cartoon:', err);
      });

    // 10B. Pool Pré-Alocado de Explosão Cartoon 3D (Zero GC Alloc no impacto!)
    const explosionGroup = new THREE.Group();
    explosionGroup.visible = false;
    scene.add(explosionGroup);

    const fireballMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      fog: false,
      toneMapped: false,
    });
    const fireballCore = new THREE.Mesh(new THREE.SphereGeometry(1.0, 18, 14), fireballMat);
    const fireballOutlineMat = new THREE.MeshBasicMaterial({
      color: 0x0d0b0a,
      side: THREE.BackSide,
      transparent: true,
      opacity: 1.0,
      fog: false,
    });
    const fireballOutline = new THREE.Mesh(new THREE.SphereGeometry(1.09, 16, 12), fireballOutlineMat);
    fireballCore.add(fireballOutline);
    explosionGroup.add(fireballCore);

    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    const shockwaveRing = new THREE.Mesh(new THREE.RingGeometry(0.52, 0.96, 28), shockwaveMat);
    shockwaveRing.rotation.x = -Math.PI / 2;
    explosionGroup.add(shockwaveRing);

    const explosionFlashLight = new THREE.PointLight(0xff9500, 0, 22, 1.6);
    explosionGroup.add(explosionFlashLight);

    interface ExplosionPuff {
      group: THREE.Group;
      mat: THREE.MeshBasicMaterial;
      outMat: THREE.MeshBasicMaterial;
      vx: number;
      vy: number;
      vz: number;
      baseScale: number;
      growRate: number;
    }
    const explosionPuffs: ExplosionPuff[] = [];
    const puffGeo = new THREE.SphereGeometry(0.55, 12, 10);
    const puffOutGeo = new THREE.SphereGeometry(0.62, 10, 8);
    const puffPalette = [0xffedd5, 0xfde047, 0xf97316, 0xef4444, 0x475569, 0x1e293b];

    for (let i = 0; i < 16; i++) {
      const pGroup = new THREE.Group();
      const pMat = new THREE.MeshBasicMaterial({
        color: puffPalette[i % puffPalette.length],
        transparent: true,
        opacity: 1.0,
        fog: false,
      });
      const pOutMat = new THREE.MeshBasicMaterial({
        color: 0x0d0b0a,
        side: THREE.BackSide,
        transparent: true,
        opacity: 1.0,
        fog: false,
      });
      const pMesh = new THREE.Mesh(puffGeo, pMat);
      const pOut = new THREE.Mesh(puffOutGeo, pOutMat);
      pGroup.add(pMesh, pOut);
      explosionGroup.add(pGroup);
      explosionPuffs.push({
        group: pGroup,
        mat: pMat,
        outMat: pOutMat,
        vx: 0,
        vy: 0,
        vz: 0,
        baseScale: 0.5,
        growRate: 1.8,
      });
    }

    interface ExplosionDebris {
      mesh: THREE.Mesh;
      vx: number;
      vy: number;
      vz: number;
      rx: number;
      ry: number;
      rz: number;
    }
    const explosionDebris: ExplosionDebris[] = [];
    const debrisGeo = new THREE.BoxGeometry(0.19, 0.13, 0.25);
    const debrisEdgesGeo = new THREE.EdgesGeometry(debrisGeo);
    const debrisEdgeMat = new THREE.LineBasicMaterial({ color: 0x0d0b0a });
    const debrisColors = [0xfacc15, 0xf97316, 0xef4444, 0x1f2937, 0xe2e8f0, 0x38bdf8];

    for (let i = 0; i < 28; i++) {
      const dMat = new THREE.MeshBasicMaterial({
        color: debrisColors[i % debrisColors.length],
        fog: false,
      });
      const dMesh = new THREE.Mesh(debrisGeo, dMat);
      dMesh.add(new THREE.LineSegments(debrisEdgesGeo, debrisEdgeMat));
      explosionGroup.add(dMesh);
      explosionDebris.push({
        mesh: dMesh,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
      });
    }

    let explosionOriginX = 0;
    let explosionOriginY = 0.7;
    let explosionOriginZ = 0.2;

    const triggerCartoonExplosion = (ox: number, oy: number, oz: number) => {
      explosionOriginX = ox;
      explosionOriginY = oy;
      explosionOriginZ = oz;
      explosionGroup.position.set(0, 0, 0);
      explosionGroup.visible = true;

      fireballCore.position.set(ox, oy, oz);
      fireballCore.scale.setScalar(0.45);
      fireballMat.color.setHex(0xffffff);
      fireballMat.opacity = 1.0;
      fireballOutlineMat.opacity = 1.0;

      shockwaveRing.position.set(ox, 0.06, oz);
      shockwaveRing.scale.setScalar(0.5);
      shockwaveMat.opacity = 0.95;

      explosionFlashLight.position.set(ox, oy + 1.2, oz + 0.8);
      explosionFlashLight.intensity = 15.0;

      for (let i = 0; i < explosionPuffs.length; i++) {
        const puff = explosionPuffs[i];
        const angle = (i / explosionPuffs.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const horizSpeed = 2.4 + Math.random() * 5.2;
        puff.group.position.set(
          ox + (Math.random() - 0.5) * 0.5,
          oy + (Math.random() - 0.3) * 0.4,
          oz + (Math.random() - 0.5) * 0.5,
        );
        puff.vx = Math.cos(angle) * horizSpeed;
        puff.vy = 2.2 + Math.random() * 5.8;
        puff.vz = Math.sin(angle) * horizSpeed;
        puff.baseScale = 0.42 + Math.random() * 0.45;
        puff.growRate = 1.6 + Math.random() * 1.8;
        puff.group.scale.setScalar(puff.baseScale);
        puff.mat.color.setHex(puffPalette[i % puffPalette.length]);
        puff.mat.opacity = 1.0;
        puff.outMat.opacity = 1.0;
      }

      for (let i = 0; i < explosionDebris.length; i++) {
        const deb = explosionDebris[i];
        const angle = Math.random() * Math.PI * 2;
        const speed = 5.0 + Math.random() * 11.5;
        deb.mesh.position.set(ox, oy, oz);
        deb.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        deb.mesh.scale.setScalar(0.75 + Math.random() * 0.85);
        deb.vx = Math.cos(angle) * speed;
        deb.vy = 4.5 + Math.random() * 9.5;
        deb.vz = Math.sin(angle) * speed * 0.85 + 2.0;
        deb.rx = (Math.random() - 0.5) * 18;
        deb.ry = (Math.random() - 0.5) * 18;
        deb.rz = (Math.random() - 0.5) * 18;
      }
    };

    const updateCartoonExplosion = (dt: number, progress: number) => {
      const clampedT = THREE.MathUtils.clamp(progress, 0, 1);

      // Bola de fogo central: Branco -> Amarelo Solar -> Laranja -> Vermelho Intenso
      const coreScale = 0.45 + Math.pow(clampedT, 0.42) * 3.1;
      fireballCore.scale.setScalar(coreScale);
      fireballCore.position.y = explosionOriginY + clampedT * 0.95;
      if (clampedT < 0.16) {
        fireballMat.color.setHex(0xffffff);
      } else if (clampedT < 0.38) {
        fireballMat.color.setHex(0xfde047);
      } else if (clampedT < 0.65) {
        fireballMat.color.setHex(0xf97316);
      } else {
        fireballMat.color.setHex(0xdc2626);
      }
      const coreFade = Math.max(0, 1 - Math.max(0, (clampedT - 0.48) / 0.52));
      fireballMat.opacity = coreFade;
      fireballOutlineMat.opacity = coreFade;
      fireballCore.visible = coreFade > 0.02;

      // Anel de choque no asfalto
      const ringScale = 0.55 + Math.pow(clampedT, 0.5) * 7.6;
      shockwaveRing.scale.setScalar(ringScale);
      shockwaveMat.opacity = Math.max(0, (1 - clampedT * 1.25) * 0.95);
      shockwaveRing.visible = shockwaveMat.opacity > 0.02;

      // Flash de luz dinâmico nas casas e no veículo
      explosionFlashLight.intensity = Math.max(0, 15.0 * Math.pow(1 - Math.min(1, clampedT * 1.7), 2));

      // Nuvens de fumaça e fogo cartoon com borda preta
      for (let i = 0; i < explosionPuffs.length; i++) {
        const puff = explosionPuffs[i];
        puff.group.position.x += puff.vx * dt;
        puff.group.position.y += puff.vy * dt;
        puff.group.position.z += puff.vz * dt;
        puff.vx *= Math.max(0, 1 - 2.6 * dt);
        puff.vz *= Math.max(0, 1 - 2.6 * dt);
        puff.vy = Math.max(0.8, puff.vy - 4.2 * dt);

        const s = puff.baseScale + clampedT * puff.growRate;
        puff.group.scale.setScalar(s);

        if (clampedT > 0.42 && i % 3 !== 0) {
          puff.mat.color.setHex(i % 2 === 0 ? 0x334155 : 0x1e293b);
        }
        const puffFade = Math.max(0, 1 - Math.max(0, (clampedT - 0.55) / 0.45));
        puff.mat.opacity = puffFade;
        puff.outMat.opacity = puffFade;
      }

      // Estilhaços e faíscas quicando no asfalto
      for (let i = 0; i < explosionDebris.length; i++) {
        const deb = explosionDebris[i];
        deb.vy -= 26.0 * dt;
        deb.mesh.position.x += deb.vx * dt;
        deb.mesh.position.y += deb.vy * dt;
        deb.mesh.position.z += deb.vz * dt;
        if (deb.mesh.position.y < 0.09) {
          deb.mesh.position.y = 0.09;
          deb.vy = Math.abs(deb.vy) * 0.46;
          deb.vx *= 0.82;
          deb.vz *= 0.82;
        }
        deb.mesh.rotation.x += deb.rx * dt;
        deb.mesh.rotation.y += deb.ry * dt;
        deb.mesh.rotation.z += deb.rz * dt;
      }
    };

    // 10C. Partículas Solares & Linhas de Velocidade Vivas (High/Ultra — Zero GC Alloc)
    const atmosGroup = new THREE.Group();
    scene.add(atmosGroup);
    interface SpeedStreak {
      mesh: THREE.Mesh;
      x: number;
      y: number;
      z: number;
      speedFactor: number;
    }
    const speedStreaks: SpeedStreak[] = [];
    const streakGeo = new THREE.PlaneGeometry(0.045, 2.3);
    streakGeo.rotateX(-Math.PI / 2);
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    for (let i = 0; i < 20; i++) {
      const sMesh = new THREE.Mesh(streakGeo, streakMat);
      const sx = (i % 2 === 0 ? -1 : 1) * (4.2 + (i % 5) * 0.95);
      const sy = 0.55 + (i % 4) * 0.75;
      const sz = -i * 3.8;
      sMesh.position.set(sx, sy, sz);
      atmosGroup.add(sMesh);
      speedStreaks.push({
        mesh: sMesh,
        x: sx,
        y: sy,
        z: sz,
        speedFactor: 1.25 + (i % 3) * 0.22,
      });
    }

    // 10D. Fumaça Cartoon Colada na Boca do Escapamento + Sujeira do Asfalto (2 InstancedMeshes = Apenas 2 Draw Calls, Zero GC Alloc!)
    const _particleDummy = new THREE.Object3D();
    const _particleZeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    const _tmpColor = new THREE.Color();
    const _exhaustNozzleWorld = new THREE.Vector3();

    const EXHAUST_POOL_SIZE = 34;
    const exhaustGeo = createCartoonSmokePuffGeometry();
    const exhaustMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      fog: false,
    });
    const exhaustInstanced = new THREE.InstancedMesh(exhaustGeo, exhaustMat, EXHAUST_POOL_SIZE);
    exhaustInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    exhaustInstanced.frustumCulled = false;
    exhaustInstanced.visible = false;
    const exhaustPalette = [0xffffff, 0xf8fafc, 0xf1f5f9, 0xe2e8f0];
    for (let i = 0; i < EXHAUST_POOL_SIZE; i++) {
      exhaustInstanced.setMatrixAt(i, _particleZeroMatrix);
      exhaustInstanced.setColorAt(i, _tmpColor.setHex(exhaustPalette[i % exhaustPalette.length]));
    }
    if (exhaustInstanced.instanceColor) exhaustInstanced.instanceColor.needsUpdate = true;
    scene.add(exhaustInstanced);

    const exActive = new Uint8Array(EXHAUST_POOL_SIZE);
    const exLife = new Float32Array(EXHAUST_POOL_SIZE);
    const exMaxLife = new Float32Array(EXHAUST_POOL_SIZE);
    const exX = new Float32Array(EXHAUST_POOL_SIZE);
    const exY = new Float32Array(EXHAUST_POOL_SIZE);
    const exZ = new Float32Array(EXHAUST_POOL_SIZE);
    const exVx = new Float32Array(EXHAUST_POOL_SIZE);
    const exVy = new Float32Array(EXHAUST_POOL_SIZE);
    const exVz = new Float32Array(EXHAUST_POOL_SIZE);
    const exBaseScale = new Float32Array(EXHAUST_POOL_SIZE);
    const exSwirlSeed = new Float32Array(EXHAUST_POOL_SIZE);
    let exhaustCursor = 0;
    let exhaustEmitAcc = 0;

    const DIRT_POOL_SIZE = 38;
    const dirtGeo = new THREE.DodecahedronGeometry(0.05, 0);
    const dirtMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      fog: false,
    });
    const dirtInstanced = new THREE.InstancedMesh(dirtGeo, dirtMat, DIRT_POOL_SIZE);
    dirtInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    dirtInstanced.frustumCulled = false;
    dirtInstanced.visible = false;
    const dirtPalette = [0x1e293b, 0x78350f, 0x334155, 0x92400e, 0x44403c, 0xa16207];
    for (let i = 0; i < DIRT_POOL_SIZE; i++) {
      dirtInstanced.setMatrixAt(i, _particleZeroMatrix);
      dirtInstanced.setColorAt(i, _tmpColor.setHex(dirtPalette[i % dirtPalette.length]));
    }
    if (dirtInstanced.instanceColor) dirtInstanced.instanceColor.needsUpdate = true;
    scene.add(dirtInstanced);

    const dtActive = new Uint8Array(DIRT_POOL_SIZE);
    const dtLife = new Float32Array(DIRT_POOL_SIZE);
    const dtMaxLife = new Float32Array(DIRT_POOL_SIZE);
    const dtX = new Float32Array(DIRT_POOL_SIZE);
    const dtY = new Float32Array(DIRT_POOL_SIZE);
    const dtZ = new Float32Array(DIRT_POOL_SIZE);
    const dtVx = new Float32Array(DIRT_POOL_SIZE);
    const dtVy = new Float32Array(DIRT_POOL_SIZE);
    const dtVz = new Float32Array(DIRT_POOL_SIZE);
    const dtBaseScale = new Float32Array(DIRT_POOL_SIZE);
    const dtSpin = new Float32Array(DIRT_POOL_SIZE);
    let dirtCursor = 0;
    let dirtEmitAcc = 0;

    const clearBikeParticles = () => {
      exActive.fill(0);
      dtActive.fill(0);
      for (let i = 0; i < EXHAUST_POOL_SIZE; i++) {
        exhaustInstanced.setMatrixAt(i, _particleZeroMatrix);
      }
      exhaustInstanced.instanceMatrix.needsUpdate = true;
      exhaustInstanced.visible = false;

      for (let i = 0; i < DIRT_POOL_SIZE; i++) {
        dirtInstanced.setMatrixAt(i, _particleZeroMatrix);
      }
      dirtInstanced.instanceMatrix.needsUpdate = true;
      dirtInstanced.visible = false;
    };

    const updateBikeExhaustAndDirt = (
      dt: number,
      bikeX: number,
      bikeY: number,
      speedMs: number,
      steerLean: number,
      lateralVel: number,
      pitchRad: number,
      isRunning: boolean,
      isMotoMode: boolean,
    ) => {
      exhaustInstanced.visible = isMotoMode;
      dirtInstanced.visible = true;

      if (isRunning && speedMs > 1.0) {
        const speedNorm = Math.min(1.5, Math.max(0, (speedMs - 10.0) / 22.0));
        const inGrau = isMotoMode && pitchRad > 0.16;

        // Emissão dinâmica de fumaça cartoon saindo EXATAMENTE da ponteira do escapamento da moto!
        if (isMotoMode) {
          const exhaustRate = 24 + speedNorm * 18 + (inGrau ? 18 : 0);
          exhaustEmitAcc += exhaustRate * dt;

          let pipeX = bikeX + 0.162 - steerLean * 0.08;
          let pipeY = bikeY + 0.335;
          let pipeZ = 0.585;
          if (playerMotoInstance) {
            playerMotoInstance.getExhaustWorldPosition(_exhaustNozzleWorld);
            pipeX = _exhaustNozzleWorld.x;
            pipeY = _exhaustNozzleWorld.y;
            pipeZ = _exhaustNozzleWorld.z;
          }

          while (exhaustEmitAcc >= 1.0) {
            exhaustEmitAcc -= 1.0;
            const idx = exhaustCursor;
            exhaustCursor = (exhaustCursor + 1) % EXHAUST_POOL_SIZE;
            exActive[idx] = 1;
            exLife[idx] = 0;
            exMaxLife[idx] = 0.42 + Math.random() * 0.24;
            // Nasce colado na ponteira do escapamento para máxima fidelidade visual!
            exX[idx] = pipeX + (Math.random() - 0.5) * 0.024;
            exY[idx] = pipeY + (Math.random() - 0.5) * 0.022;
            exZ[idx] = pipeZ + 0.02;
            exVx[idx] = 0.14 + (Math.random() - 0.35) * 0.65 - lateralVel * 0.06;
            exVy[idx] = 0.42 + Math.random() * 0.85 + (inGrau ? 0.35 : 0);
            exVz[idx] = 1.85 + speedMs * 0.22 + Math.random() * 1.15;
            exBaseScale[idx] = 0.46 + Math.random() * 0.42 + (inGrau ? 0.26 : 0);
            exSwirlSeed[idx] = Math.random() * Math.PI * 2;
          }
        }

        // Emissão dinâmica de sujeira/pedrinhas no asfalto (pneu traseiro da moto ou patas do Caramelo!)
        if (bikeY < 0.09) {
          const turnBoost = Math.min(22, Math.abs(lateralVel) * 2.2);
          const dirtRate = (isMotoMode ? 24 : 18) + speedNorm * 22 + turnBoost + (inGrau ? 16 : 0);
          dirtEmitAcc += dirtRate * dt;
          const tirePatchX = bikeX - steerLean * 0.08;
          const tirePatchZ = isMotoMode ? 0.68 : 0.28;

          while (dirtEmitAcc >= 1.0) {
            dirtEmitAcc -= 1.0;
            const idx = dirtCursor;
            dirtCursor = (dirtCursor + 1) % DIRT_POOL_SIZE;
            dtActive[idx] = 1;
            dtLife[idx] = 0;
            dtMaxLife[idx] = 0.34 + Math.random() * 0.24;
            dtX[idx] = tirePatchX + (Math.random() - 0.5) * 0.18;
            dtY[idx] = 0.045;
            dtZ[idx] = tirePatchZ + (Math.random() - 0.5) * 0.08;
            dtVx[idx] = -lateralVel * 0.24 + (Math.random() - 0.5) * 2.3;
            dtVy[idx] = 1.85 + Math.random() * 2.75 + speedNorm * 1.15 + (inGrau ? 0.85 : 0);
            dtVz[idx] = speedMs * 0.52 + 2.8 + Math.random() * 2.4;
            dtBaseScale[idx] = 0.65 + Math.random() * 0.75;
            dtSpin[idx] = (Math.random() - 0.5) * 18.0;
          }
        }
      }

      // Simula nuvens de fumaça cartoon espiralando atrás do escapamento
      if (isMotoMode) {
        for (let i = 0; i < EXHAUST_POOL_SIZE; i++) {
          if (!exActive[i]) continue;
          exLife[i] += dt;
          const t = exLife[i] / exMaxLife[i];
          if (t >= 1.0 || exZ[i] > 4.35) {
            exActive[i] = 0;
            exhaustInstanced.setMatrixAt(i, _particleZeroMatrix);
            continue;
          }
          const swirlX = Math.sin(exLife[i] * 11.0 + exSwirlSeed[i]) * 0.48;
          const swirlY = Math.cos(exLife[i] * 9.0 + exSwirlSeed[i]) * 0.25;
          exX[i] += (exVx[i] + swirlX) * dt;
          exY[i] += (exVy[i] + swirlY) * dt;
          exZ[i] += exVz[i] * dt;
          exVy[i] += 0.85 * dt;

          // Cresce cartoon elástico (0.38 -> 1.95) e encolhe limpo no final
          const grow =
            t < 0.18
              ? 0.35 + (t / 0.18) * 0.85
              : t < 0.65
                ? 1.2 + ((t - 0.18) / 0.47) * 0.75
                : 1.95 * (1.0 - (t - 0.65) / 0.35);
          const s = Math.max(0.001, exBaseScale[i] * grow);
          _particleDummy.position.set(exX[i], exY[i], exZ[i]);
          _particleDummy.rotation.set(
            exSwirlSeed[i] + t * 2.8,
            exSwirlSeed[i] * 0.7 + t * 3.6,
            t * 1.9,
          );
          _particleDummy.scale.setScalar(s);
          _particleDummy.updateMatrix();
          exhaustInstanced.setMatrixAt(i, _particleDummy.matrix);
        }
        exhaustInstanced.instanceMatrix.needsUpdate = true;
      }

      // Simula sujeira do asfalto quicando atrás do pneu/patas
      for (let i = 0; i < DIRT_POOL_SIZE; i++) {
        if (!dtActive[i]) continue;
        dtLife[i] += dt;
        const t = dtLife[i] / dtMaxLife[i];
        if (t >= 1.0 || dtZ[i] > 4.2) {
          dtActive[i] = 0;
          dirtInstanced.setMatrixAt(i, _particleZeroMatrix);
          continue;
        }
        dtVy[i] -= 18.5 * dt;
        dtX[i] += dtVx[i] * dt;
        dtY[i] += dtVy[i] * dt;
        dtZ[i] += dtVz[i] * dt;
        if (dtY[i] < 0.03) {
          dtY[i] = 0.03;
          dtVy[i] = Math.abs(dtVy[i]) * 0.36;
          dtVx[i] *= 0.8;
        }
        const fade = t < 0.7 ? 1.0 : 1.0 - (t - 0.7) / 0.3;
        const s = Math.max(0.001, dtBaseScale[i] * fade);
        const ang = dtLife[i] * dtSpin[i];
        _particleDummy.position.set(dtX[i], dtY[i], dtZ[i]);
        _particleDummy.rotation.set(ang, ang * 0.7, ang * 1.3);
        _particleDummy.scale.setScalar(s);
        _particleDummy.updateMatrix();
        dirtInstanced.setMatrixAt(i, _particleDummy.matrix);
      }
      dirtInstanced.instanceMatrix.needsUpdate = true;
    };

    // 10E. Pool de Notas de Dinheiro Brasileiro Cartoon na Rua (R$ 10, R$ 50, R$ 100 e R$ 200 Bordô Rara — Zero GC Alloc!)
    interface PooledCashStack {
      mesh: THREE.Group;
      spinHolder: THREE.Object3D | null;
      denomination: CashDenomination;
      inUse: boolean;
      attracting: boolean;
      lane: LaneIndex;
      x: number;
      y: number;
      z: number;
      phaseOffset: number;
    }
    const cashStackPool: PooledCashStack[] = [];
    const cashDenomPoolInit: CashDenomination[] = [
      10, 10, 10, 10, 10, 10, 10, 10, 10,
      50, 50, 50, 50, 50, 50, 50, 50,
      100, 100, 100, 100, 100, 100,
      200, 200, 200, 200, 200,
    ];
    for (let i = 0; i < cashDenomPoolInit.length; i++) {
      const denom = cashDenomPoolInit[i];
      const cashMesh = buildCartoonCashStackMesh(denom);
      cashMesh.visible = false;
      cashStackPool.push({
        mesh: cashMesh,
        spinHolder: cashMesh.getObjectByName('CashVisualSpinHolder') || null,
        denomination: denom,
        inUse: false,
        attracting: false,
        lane: 0,
        x: 0,
        y: 0,
        z: -60,
        phaseOffset: i * 0.65,
      });
    }
    let cashSpawnTimer = 0.65;

    const attachCashStack = (stack: PooledCashStack) => {
      stack.inUse = true;
      stack.attracting = false;
      stack.y = 0;
      stack.mesh.scale.setScalar(1);
      stack.mesh.visible = true;
      if (!stack.mesh.parent) {
        scene.add(stack.mesh);
      }
    };

    const eraseCashStack = (stack: PooledCashStack) => {
      stack.inUse = false;
      stack.attracting = false;
      stack.mesh.visible = false;
      if (stack.mesh.parent) {
        scene.remove(stack.mesh);
      }
    };

    // 10F. Explosão Cartoon 3D de Notas & Brilhos na Coleta de Dinheiro (1 Único Draw Call Zero-GC!)
    const MAX_CASH_BURST = 32;
    const cashBurstGeo = new THREE.BoxGeometry(0.28, 0.018, 0.15);
    const cashBurstMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const cashBurstInstanced = new THREE.InstancedMesh(cashBurstGeo, cashBurstMat, MAX_CASH_BURST);
    cashBurstInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cashBurstInstanced.frustumCulled = false;
    const _burstDummy = new THREE.Object3D();
    const _burstCol = new THREE.Color();
    for (let i = 0; i < MAX_CASH_BURST; i++) {
      _burstDummy.scale.set(0, 0, 0);
      _burstDummy.updateMatrix();
      cashBurstInstanced.setMatrixAt(i, _burstDummy.matrix);
      cashBurstInstanced.setColorAt(i, _burstCol.setHex(0xfde047));
    }
    scene.add(cashBurstInstanced);

    const cashBurstPool = Array.from({ length: MAX_CASH_BURST }, () => ({
      active: false,
      age: 0,
      life: 0.65,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rx: 0,
      ry: 0,
      rz: 0,
      vrx: 0,
      vry: 0,
    }));
    let cashBurstCursor = 0;

    const triggerCustomColorBurst = (
      bx: number,
      by: number,
      bz: number,
      primaryHex: number,
      accentHex: number,
      count = 12
    ) => {
      for (let k = 0; k < count; k++) {
        const p = cashBurstPool[cashBurstCursor];
        const idx = cashBurstCursor;
        cashBurstCursor = (cashBurstCursor + 1) % MAX_CASH_BURST;
        const ang = (k / count) * Math.PI * 2 + Math.random() * 0.35;
        const spd = 2.4 + Math.random() * 3.1;
        p.active = true;
        p.age = 0;
        p.life = 0.52 + Math.random() * 0.25;
        p.x = bx + (Math.random() - 0.5) * 0.22;
        p.y = by + Math.random() * 0.16;
        p.z = bz + (Math.random() - 0.5) * 0.22;
        p.vx = Math.cos(ang) * spd;
        p.vy = 4.5 + Math.random() * 3.5;
        p.vz = Math.sin(ang) * spd * 0.75 + 2.2;
        p.rx = Math.random() * Math.PI;
        p.ry = Math.random() * Math.PI;
        p.rz = Math.random() * Math.PI;
        p.vrx = (Math.random() - 0.5) * 15;
        p.vry = (Math.random() - 0.5) * 17;

        _burstCol.setHex(k % 2 === 0 ? primaryHex : accentHex);
        cashBurstInstanced.setColorAt(idx, _burstCol);
      }
      if (cashBurstInstanced.instanceColor) {
        cashBurstInstanced.instanceColor.needsUpdate = true;
      }
    };

    const triggerCashPickupBurst = (bx: number, by: number, bz: number, denom: CashDenomination) => {
      const mainHex =
        denom === 200 ? 0xbe123c : denom === 100 ? 0x38bdf8 : denom === 50 ? 0xf97316 : 0xf43f5e;
      triggerCustomColorBurst(bx, by, bz, mainHex, 0xfde047, 12);
    };

    const updateCashPickupBurst = (dtStep: number) => {
      let anyDirty = false;
      for (let i = 0; i < MAX_CASH_BURST; i++) {
        const p = cashBurstPool[i];
        if (!p.active) continue;
        anyDirty = true;
        p.age += dtStep;
        if (p.age >= p.life) {
          p.active = false;
          _burstDummy.scale.set(0, 0, 0);
          _burstDummy.updateMatrix();
          cashBurstInstanced.setMatrixAt(i, _burstDummy.matrix);
          continue;
        }
        p.vy -= 13.5 * dtStep;
        p.x += p.vx * dtStep;
        p.y += p.vy * dtStep;
        p.z += p.vz * dtStep;
        p.rx += p.vrx * dtStep;
        p.ry += p.vry * dtStep;

        const t = p.age / p.life;
        const s = Math.sin(Math.min(1, t * 4.5) * Math.PI * 0.5) * (1 - t * 0.85) * 1.25;
        _burstDummy.position.set(p.x, p.y, p.z);
        _burstDummy.rotation.set(p.rx, p.ry, p.rz);
        _burstDummy.scale.setScalar(Math.max(0.01, s));
        _burstDummy.updateMatrix();
        cashBurstInstanced.setMatrixAt(i, _burstDummy.matrix);
      }
      if (anyDirty) {
        cashBurstInstanced.instanceMatrix.needsUpdate = true;
      }
    };

    const clearCashPickupBurst = () => {
      for (let i = 0; i < MAX_CASH_BURST; i++) {
        cashBurstPool[i].active = false;
        _burstDummy.scale.set(0, 0, 0);
        _burstDummy.updateMatrix();
        cashBurstInstanced.setMatrixAt(i, _burstDummy.matrix);
      }
      cashBurstInstanced.instanceMatrix.needsUpdate = true;
    };

    // 10F-2. Item 7: 2 a 3 Cédulas 3D Escalonadas Subindo Suavemente Acima da Cabeça do Motoboy (Zero Acúmulo / Zero GC!)
    const HEAD_NOTE_POOL_SIZE = 12;
    interface ActiveHeadBanknote {
      rig: FloatingHeadBanknoteRig;
      active: boolean;
      age: number;
      life: number;
      offsetX: number;
      offsetY: number;
      spinSpeed: number;
      spinPhase: number;
      hexColor: number;
    }
    const headNotePool: ActiveHeadBanknote[] = [];
    for (let i = 0; i < HEAD_NOTE_POOL_SIZE; i++) {
      const rig = buildFloatingHeadBanknote();
      scene.add(rig.root);
      headNotePool.push({
        rig,
        active: false,
        age: 0,
        life: 0.78,
        offsetX: 0,
        offsetY: 1.76,
        spinSpeed: 2.8,
        spinPhase: i * 0.7,
        hexColor: 0x34d399,
      });
    }
    let headNoteCursor = 0;

    interface PendingHeadNoteSpawn {
      active: boolean;
      delay: number;
      offsetX: number;
      hexColor: number;
    }
    const pendingHeadNotes: PendingHeadNoteSpawn[] = Array.from({ length: 12 }, () => ({
      active: false,
      delay: 0,
      offsetX: 0,
      hexColor: 0x34d399,
    }));
    let pendingHeadCursor = 0;

    const getDenomVisualHex = (denom: CashDenomination): number =>
      denom === 200 ? 0xfbbf24 : denom === 100 ? 0x38bdf8 : denom === 50 ? 0xf97316 : 0xf43f5e;

    const enqueueStaggeredHeadBanknotes = (denom: CashDenomination) => {
      const noteCount = denom >= 100 ? 3 : 2;
      const hex = getDenomVisualHex(denom);
      for (let k = 0; k < noteCount; k++) {
        const slot = pendingHeadNotes[pendingHeadCursor];
        pendingHeadCursor = (pendingHeadCursor + 1) % pendingHeadNotes.length;
        slot.active = true;
        slot.delay = k * 0.095; // Escalonamento suave (95ms entre notas — nunca aparecem todas juntas!)
        slot.offsetX = (k - (noteCount - 1) * 0.5) * 0.22 + (Math.random() - 0.5) * 0.05;
        slot.hexColor = hex;
      }
    };

    const updateStaggeredHeadBanknotes = (dtStep: number, riderX: number, riderY: number, visibleAllowed: boolean) => {
      for (let i = 0; i < pendingHeadNotes.length; i++) {
        const q = pendingHeadNotes[i];
        if (!q.active) continue;
        q.delay -= dtStep;
        if (q.delay <= 0) {
          q.active = false;
          const note = headNotePool[headNoteCursor];
          headNoteCursor = (headNoteCursor + 1) % HEAD_NOTE_POOL_SIZE;
          note.active = true;
          note.age = 0;
          note.life = 0.78;
          note.offsetX = q.offsetX;
          note.offsetY = 1.74;
          note.spinSpeed = (Math.random() < 0.5 ? 1 : -1) * (2.4 + Math.random() * 1.1);
          note.spinPhase = Math.random() * Math.PI * 2;
          note.hexColor = q.hexColor;
          note.rig.setAppearance(q.hexColor, 1.0);
          note.rig.root.visible = visibleAllowed;
        }
      }

      for (let i = 0; i < HEAD_NOTE_POOL_SIZE; i++) {
        const n = headNotePool[i];
        if (!n.active) continue;
        n.age += dtStep;
        if (n.age >= n.life || !visibleAllowed) {
          if (n.age >= n.life) {
            n.active = false;
            n.rig.root.visible = false;
          } else {
            n.rig.root.visible = false;
          }
          continue;
        }
        const t = n.age / n.life;
        const popIn = Math.min(1, t / 0.16);
        const fadeOut = 1.0 - THREE.MathUtils.smoothstep(t, 0.42, 1.0);
        const riseY = riderY + n.offsetY + t * 1.08;
        const swayX = Math.sin(n.age * 7.5 + n.spinPhase) * 0.055;
        n.rig.root.visible = true;
        n.rig.root.position.set(riderX + n.offsetX + swayX, riseY, -0.04);
        n.rig.root.rotation.set(
          0.32 + Math.sin(n.age * 6.0) * 0.14,
          n.spinPhase + n.age * n.spinSpeed,
          Math.cos(n.age * 5.2 + n.spinPhase) * 0.15,
        );
        n.rig.root.scale.setScalar(0.88 * popIn * (0.85 + 0.15 * fadeOut));
        n.rig.setAppearance(n.hexColor, fadeOut);
      }
    };

    const clearHeadBanknotes = () => {
      for (let i = 0; i < pendingHeadNotes.length; i++) pendingHeadNotes[i].active = false;
      for (let i = 0; i < HEAD_NOTE_POOL_SIZE; i++) {
        headNotePool[i].active = false;
        headNotePool[i].rig.root.visible = false;
      }
    };

    // 10G. Pool de Tampas de Bueiro Explosivas na Pista (! Vermelho -> Tampa Voa -> Jato de Água Cartoon -> -1 Vida!)
    interface PooledManholeHazard {
      rig: CartoonManholeHazardRig;
      inUse: boolean;
      erupted: boolean;
      damagedPlayer: boolean;
      splashedLens: boolean;
      lane: LaneIndex;
      x: number;
      z: number;
      eruptAge: number;
      lidX: number;
      lidY: number;
      lidZ: number;
      lidVx: number;
      lidVy: number;
      lidVz: number;
      lidSpinX: number;
      lidSpinZ: number;
    }

    const manholePool: PooledManholeHazard[] = [];
    for (let i = 0; i < 5; i++) {
      const rig = buildCartoonManholeHazard();
      rig.root.visible = false;
      manholePool.push({
        rig,
        inUse: false,
        erupted: false,
        damagedPlayer: false,
        splashedLens: false,
        lane: 0,
        x: 0,
        z: -80,
        eruptAge: 0,
        lidX: 0,
        lidY: 0.052,
        lidZ: 0,
        lidVx: 0,
        lidVy: 0,
        lidVz: 0,
        lidSpinX: 0,
        lidSpinZ: 0,
      });
    }
    let manholeSpawnTimer = 3.2;

    const attachManhole = (mh: PooledManholeHazard) => {
      mh.inUse = true;
      mh.erupted = false;
      mh.damagedPlayer = false;
      mh.splashedLens = false;
      mh.eruptAge = 0;
      mh.lidX = 0;
      mh.lidY = 0.052;
      mh.lidZ = 0;
      mh.rig.lidGroup.visible = true;
      mh.rig.lidGroup.position.set(0, 0.052, 0);
      mh.rig.lidGroup.rotation.set(0, 0, 0);
      mh.rig.exclamationGroup.visible = true;
      mh.rig.warningRing.visible = true;
      mh.rig.geyserGroup.visible = false;
      mh.rig.root.visible = true;
      if (!mh.rig.root.parent) {
        scene.add(mh.rig.root);
      }
    };

    const eraseManhole = (mh: PooledManholeHazard) => {
      mh.inUse = false;
      mh.rig.root.visible = false;
      if (mh.rig.root.parent) {
        scene.remove(mh.rig.root);
      }
    };

    const spawnStreetManholeHazard = (customZ?: number) => {
      let freeMh: PooledManholeHazard | null = null;
      for (let i = 0; i < manholePool.length; i++) {
        if (!manholePool[i].inUse) {
          freeMh = manholePool[i];
          break;
        }
      }
      if (!freeMh) return;

      const spawnZ = customZ ?? -(92.0 + Math.random() * 18.0);
      const laneOrder: LaneIndex[] = [-1, 0, 1];
      for (let i = laneOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = laneOrder[i];
        laneOrder[i] = laneOrder[j];
        laneOrder[j] = tmp;
      }

      let chosenLane: LaneIndex | null = null;
      for (const ln of laneOrder) {
        let blocked = false;
        for (let i = 0; i < trafficPool.length; i++) {
          const v = trafficPool[i];
          if (v.inUse && v.lane === ln && Math.abs(v.z - spawnZ) < 16.0) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          for (let i = 0; i < manholePool.length; i++) {
            const m = manholePool[i];
            if (m.inUse && Math.abs(m.z - spawnZ) < 28.0) {
              blocked = true;
              break;
            }
          }
        }
        if (!blocked) {
          chosenLane = ln;
          break;
        }
      }

      if (chosenLane === null) return;
      freeMh.lane = chosenLane;
      freeMh.x = laneToX(chosenLane);
      freeMh.z = spawnZ;
      attachManhole(freeMh);
    };

    const seedInitialManholes = () => {
      for (let i = 0; i < manholePool.length; i++) {
        eraseManhole(manholePool[i]);
      }
      spawnStreetManholeHazard(-56.0);
      manholeSpawnTimer = 4.2;
    };

    // 10H. Respingos de Água Translúcidos e Iluminados de Múltiplos Tamanhos (Zero GC, 1 Draw Call!)
    const WATER_SPLASH_POOL = 42;
    const waterSplashGeo = new THREE.IcosahedronGeometry(0.085, 1);
    const waterSplashMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.28,
      roughness: 0.08,
      metalness: 0.12,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    const waterSplashInstanced = new THREE.InstancedMesh(
      waterSplashGeo,
      waterSplashMat,
      WATER_SPLASH_POOL
    );
    waterSplashInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    waterSplashInstanced.frustumCulled = false;
    const wsActive = new Uint8Array(WATER_SPLASH_POOL);
    const wsAge = new Float32Array(WATER_SPLASH_POOL);
    const wsLife = new Float32Array(WATER_SPLASH_POOL);
    const wsX = new Float32Array(WATER_SPLASH_POOL);
    const wsY = new Float32Array(WATER_SPLASH_POOL);
    const wsZ = new Float32Array(WATER_SPLASH_POOL);
    const wsVx = new Float32Array(WATER_SPLASH_POOL);
    const wsVy = new Float32Array(WATER_SPLASH_POOL);
    const wsVz = new Float32Array(WATER_SPLASH_POOL);
    const wsScale = new Float32Array(WATER_SPLASH_POOL);
    let wsCursor = 0;
    for (let i = 0; i < WATER_SPLASH_POOL; i++) {
      waterSplashInstanced.setMatrixAt(i, _particleZeroMatrix);
      waterSplashInstanced.setColorAt(
        i,
        _tmpColor.setHex(i % 3 === 0 ? 0xffffff : i % 3 === 1 ? 0x7dd3fc : 0x38bdf8)
      );
    }
    if (waterSplashInstanced.instanceColor) waterSplashInstanced.instanceColor.needsUpdate = true;
    scene.add(waterSplashInstanced);

    const emitDirectionalWaterSplash = (
      ox: number,
      oy: number,
      oz: number,
      playerSpeedMs: number,
      playerLatVx: number,
      count: number
    ) => {
      for (let k = 0; k < count; k++) {
        const idx = wsCursor;
        wsCursor = (wsCursor + 1) % WATER_SPLASH_POOL;
        wsActive[idx] = 1;
        wsAge[idx] = 0;
        wsLife[idx] = 0.45 + Math.random() * 0.36;
        wsX[idx] = ox + (Math.random() - 0.5) * 0.55;
        wsY[idx] = oy + Math.random() * 0.65;
        wsZ[idx] = oz + (Math.random() - 0.5) * 0.45;
        // Respingos acompanham a direção do movimento do personagem e espirram rumo à câmera!
        wsVx[idx] = playerLatVx * 0.42 + (Math.random() - 0.5) * 4.8;
        wsVy[idx] = 3.2 + Math.random() * 4.8 + playerSpeedMs * 0.08;
        wsVz[idx] = 3.4 + playerSpeedMs * 0.24 + Math.random() * 3.8;
        // Gotas e jatos de diferentes tamanhos (pequenas névoas até gotas graúdas!)
        wsScale[idx] = 0.38 + Math.pow(Math.random(), 1.6) * 1.65;
      }
    };

    const updateWaterSplashParticles = (dtStep: number) => {
      let dirty = false;
      for (let i = 0; i < WATER_SPLASH_POOL; i++) {
        if (!wsActive[i]) continue;
        dirty = true;
        wsAge[i] += dtStep;
        if (wsAge[i] >= wsLife[i] || wsZ[i] > 5.4) {
          wsActive[i] = 0;
          waterSplashInstanced.setMatrixAt(i, _particleZeroMatrix);
          continue;
        }
        wsVy[i] -= 16.5 * dtStep;
        wsX[i] += wsVx[i] * dtStep;
        wsY[i] += wsVy[i] * dtStep;
        wsZ[i] += wsVz[i] * dtStep;
        if (wsY[i] < 0.04) {
          wsY[i] = 0.04;
          wsVy[i] = Math.abs(wsVy[i]) * 0.28;
        }
        const t = wsAge[i] / wsLife[i];
        const env = (1.0 - t * 0.85) * wsScale[i];
        _particleDummy.position.set(wsX[i], wsY[i], wsZ[i]);
        // Alonga levemente na direção do jato/movimento para leitura fluida
        _particleDummy.rotation.set(wsVy[i] * 0.06, 0, -wsVx[i] * 0.08);
        _particleDummy.scale.set(env * 0.85, env * 1.28, env * 0.95);
        _particleDummy.updateMatrix();
        waterSplashInstanced.setMatrixAt(i, _particleDummy.matrix);
      }
      if (dirty) {
        waterSplashInstanced.instanceMatrix.needsUpdate = true;
      }
    };

    const clearWaterSplashParticles = () => {
      wsActive.fill(0);
      for (let i = 0; i < WATER_SPLASH_POOL; i++) {
        waterSplashInstanced.setMatrixAt(i, _particleZeroMatrix);
      }
      waterSplashInstanced.instanceMatrix.needsUpdate = true;
    };

    // 10I. Pools Exclusivos do Modo Caramelo: Ossos Brancos 3D + Carne Vermelha Estratégica (máx 3 no mapa!)
    interface PooledWhiteBone {
      root: THREE.Group;
      spinVisual: THREE.Group;
      inUse: boolean;
      attracting: boolean;
      lane: LaneIndex;
      x: number;
      y: number;
      z: number;
      phaseOffset: number;
    }
    const whiteBonePool: PooledWhiteBone[] = [];
    for (let i = 0; i < 24; i++) {
      const built = buildCartoonWhiteBoneMesh();
      built.root.visible = false;
      whiteBonePool.push({
        root: built.root,
        spinVisual: built.spinVisual,
        inUse: false,
        attracting: false,
        lane: 0,
        x: 0,
        y: 0,
        z: -60,
        phaseOffset: i * 0.55,
      });
    }
    let boneSpawnTimer = 0.6;

    const attachWhiteBone = (b: PooledWhiteBone) => {
      b.inUse = true;
      b.attracting = false;
      b.y = 0;
      b.root.scale.setScalar(1);
      b.root.visible = true;
      if (!b.root.parent) scene.add(b.root);
    };
    const eraseWhiteBone = (b: PooledWhiteBone) => {
      b.inUse = false;
      b.attracting = false;
      b.root.visible = false;
      if (b.root.parent) scene.remove(b.root);
    };

    interface PooledRedMeat {
      root: THREE.Group;
      spinVisual: THREE.Group;
      inUse: boolean;
      lane: LaneIndex;
      x: number;
      z: number;
      phaseOffset: number;
    }
    const redMeatPool: PooledRedMeat[] = [];
    for (let i = 0; i < 3; i++) {
      const built = buildCartoonMeatMesh();
      built.root.visible = false;
      redMeatPool.push({
        root: built.root,
        spinVisual: built.spinVisual,
        inUse: false,
        lane: 0,
        x: 0,
        z: -90,
        phaseOffset: i * 1.4,
      });
    }
    let meatSpawnTimer = 5.5;

    const attachRedMeat = (m: PooledRedMeat) => {
      m.inUse = true;
      m.root.visible = true;
      if (!m.root.parent) scene.add(m.root);
    };
    const eraseRedMeat = (m: PooledRedMeat) => {
      m.inUse = false;
      m.root.visible = false;
      if (m.root.parent) scene.remove(m.root);
    };

    // Indicador Cômico Diagonal ("!" + presas) acima da cabeça do Caramelo + Faixa Vermelha Piscante no Chão (Item 5)
    const carameloWarnRig = buildCarameloAttackIndicator();
    scene.add(carameloWarnRig.root);

    const dangerGroundStrip: DangerGroundStripRig = buildDangerLaneGroundStrip();
    scene.add(dangerGroundStrip.root);

    // Item 6: Sequência Final de Briga Cômica Cartoon na Nuvem de Poeira Branca + Peças da Moto Voando!
    const brawlFinaleRig: CartoonBrawlFinaleRig = buildCartoonBrawlFinaleRig();
    scene.add(brawlFinaleRig.root);
    const brawlPartState = brawlFinaleRig.flyingParts.map(() => ({
      launched: false,
      launchDelay: 0,
      x: 0,
      y: 0.4,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rx: 0,
      ry: 0,
      rz: 0,
    }));

    // Item 8: Pool de Zonas Verdes Piscantes de Entrega de Pizza (em frente às casas dos dois lados da rua!) + Caixa Voadora 3D!
    interface PooledPizzaDeliveryZone {
      rig: PizzaDeliveryZoneRig;
      side: 'left' | 'right';
      lane: LaneIndex;
      x: number;
      z: number;
      delivered: boolean;
      happyJumpTimer: number;
    }
    const PIZZA_ZONE_STEP_Z = 42.0;
    const pizzaZonePool: PooledPizzaDeliveryZone[] = [];
    for (let i = 0; i < 4; i++) {
      const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
      const rig = buildPizzaDeliveryZoneRig(side, i);
      scene.add(rig.root);
      pizzaZonePool.push({
        rig,
        side,
        lane: side === 'left' ? -1 : 1,
        x: side === 'left' ? -3.15 : 3.15,
        z: -36.0 - i * PIZZA_ZONE_STEP_Z,
        delivered: false,
        happyJumpTimer: 0,
      });
    }

    const flyingPizzaBoxMesh = createSingleCartoonPizzaBoxMesh(0);
    flyingPizzaBoxMesh.visible = false;
    scene.add(flyingPizzaBoxMesh);
    const flyingPizzaState = {
      active: false,
      age: 0,
      duration: 0.36,
      startX: 0,
      startY: 1.15,
      startZ: 0,
      endX: 0,
      endY: 1.15,
      endZ: 0,
      targetZoneIdx: -1,
    };

    // 11. Moto do Jogador c/ Piloto Motoboy Cartoon + 1 Único Caramelo Cartoon (Perseguindo Dinâmico ou Jogável!)
    let playerMotoInstance: MotoInstance | null = null;
    let currentLoadedMotoId = equippedMotoRef.current || 'cg160_titan';

    const loadPlayerMoto = (motoId: string) => {
      createMotoInstance(motoId, {
        scale: 1.0,
        castShadow: true,
        receiveShadow: true,
        riderId: equippedMotoboyRef.current,
      })
        .then((inst) => {
          if (isDisposed) {
            inst.dispose();
            return;
          }
          if (playerMotoInstance) {
            scene.remove(playerMotoInstance.root);
            playerMotoInstance.dispose();
          }
          playerMotoInstance = inst;
          playerMotoInstance.setPizzaBoxCount(pizzasLeft);
          playerMotoInstance.root.position.set(playerState.x, playerState.y, 0);
          playerMotoInstance.root.visible =
            (phaseRef.current === 'playing' || phaseRef.current === 'paused') && !isCrashing;
          scene.add(playerMotoInstance.root);
        })
        .catch((err) => {
          console.warn('[RunnerCanvas] Erro ao instanciar moto do jogador:', err);
        });
    };

    loadPlayerMoto(currentLoadedMotoId);

    updateMotoRef.current = (newId: string) => {
      currentLoadedMotoId = newId;
      loadPlayerMoto(newId);
    };

    updateMotoboyRef.current = (newRiderId: MotoboyCharacterId) => {
      if (playerMotoInstance) {
        playerMotoInstance.setRider(newRiderId);
      }
    };

    // Instância 3D de 1 único Caramelo Cartoon (perseguição super dinâmica atrás da moto ou modo jogável!)
    let leadCaramelo: CarameloInstance | null = null;
    let chaseDogX = -0.35;
    let chaseDogVelX = 0;
    let chaseLungeTimer = 2.8;
    let chaseLungeBoost = 0;
    let chaseBarkTimer = 4.5;

    const loadLeadCaramelo = (dogId: string) => {
      createCarameloInstance(dogId, { targetHeight: 0.92 })
        .then((inst) => {
          if (isDisposed) {
            inst.dispose();
            return;
          }
          if (leadCaramelo) {
            scene.remove(leadCaramelo.root);
            leadCaramelo.dispose();
          }
          leadCaramelo = inst;
          leadCaramelo.root.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              obj.castShadow = true;
            }
          });
          leadCaramelo.root.visible =
            (phaseRef.current === 'playing' || phaseRef.current === 'paused') && !isCrashing;
          scene.add(leadCaramelo.root);
        })
        .catch((err) => {
          console.warn('[RunnerCanvas] Erro ao carregar Caramelo principal:', err);
        });
    };

    loadLeadCaramelo(equippedCarameloRef.current || 'caramelo_default');

    updateCarameloRef.current = (newDogId: string) => {
      loadLeadCaramelo(newDogId);
    };

    // 14. Game State, Crash Sequence State & Reset Handler
    let playerState: PlayerState = createInitialPlayerState(difficultyRef.current);
    let hitstopTimer = 0;
    let cameraTrauma = 0;
    let camRollAngle = 0; // Smooth banking angle when turning player
    let camRollImpulse = 0; // Impulse added on lane shift for cinematic sway
    let gaitCycle = 0;
    let hudEmitTimer = 0;
    let inspectedShowcaseMesh: THREE.Group | null = null;
    let lastInspectedId: number | null = null;

    // Estado físico de mola-amortecedor do Grau (Empinar super fluido!)
    const keysDown = {
      left: false,
      right: false,
      wheelie: false,
    };
    let steerVelocityX = 0;
    let holdSteerTimer = 0;
    let wheeliePulseTimer = 0;
    let wheelieAngle = 0;
    let wheelieVel = 0;
    let forkDip = 0;
    let forkDipVel = 0;

    // Estado da colisão explosiva -> Game Over c/ compartilhamento
    let isCrashing = false;
    let crashTimer = 0;
    const CRASH_SEQUENCE_DURATION = 1.18;
    let activeCrashReason = '';

    // Estados de Combate Cômico, Perseguição Dupla, Estamina, Carne & Mordida c/ Precisão (Zero GC!)
    type MotoDogAttackPhase = 'stalking' | 'warning' | 'lunging' | 'latched' | 'recovering';
    let motoDogAttackPhase: MotoDogAttackPhase = 'stalking';
    let motoDogAttackTimer = 6.8;
    let motoDogPhaseClock = 0;
    let motoDogWarnBlinkPhase = 0;
    let motoDogLockedX = 0;
    let motoDogStartX = 0;
    let motoDogStartZ = 1.85;
    let dodgeSuccessNonce = 0;

    let riderDamageFlashTimer = 0;
    let thermalVisionBlend = 0;

    // Estados exclusivos do Modo Caramelo (10 Vidas, Aproximação Suave, Barra de Precisão, Fuga Progressiva e Finale Poeira!)
    type CarameloBitePhase =
      | 'pursuing'
      | 'precision'
      | 'impact_react'
      | 'escaping'
      | 'brawl_leap'
      | 'brawl_cloud';
    const BITE_COOLDOWN_MAX = 2.0;
    let carameloBitePhase: CarameloBitePhase = 'pursuing';
    let precisionClock = 0;
    let precisionMarkerPhase = 0;
    let precisionMarkerValue = 0;
    let bitePrepBlend = 0;
    let biteStrikeTimer = 0;
    let biteResultNonce = 0;
    let biteLastResult: { quality: BitePrecisionQuality; nonce: number } | null = null;
    let impactReactTimer = 0;

    let bonesCollectedRun = 0;
    let carameloStamina = 100;
    let meatBoostTimer = 0;
    let biteCooldownTimer = 0;
    let carameloBiteLungeTimer = 0;
    let isBiteCurrentlyReady = false;

    let aiMotoLane: LaneIndex = 0;
    let aiMotoX = 0;
    let aiMotoVelX = 0;
    let aiMotoZ = -8.8;
    let aiMotoEscapeVel = 0;
    const aiMotoMaxHp = 10;
    let aiMotoHp = 10;
    let motoboysDefeated = 0;
    let chasePressure = 0;
    let aiMotoEscapeTimer = 0;
    let aiMotoRespawnTimer = 0;
    let aiDecisionCooldown = 0;

    let brawlClock = 0;
    let brawlStartX = 0;
    let brawlStartZ = 0;
    let brawlCenterX = 0;
    let brawlCenterZ = -4.2;

    // Item 2: Estado do Tutorial Cinematográfico Jogável em Câmera Lenta ("Agora se vire hahaha...")
    type TutorialIntroPhase = 'none' | 'approaching' | 'slowmo' | 'complete';
    let tutorialPhase: TutorialIntroPhase = 'approaching';
    let tutorialTimeScale = 1.0;
    let tutorialSlowMoClock = 0;
    let tutorialBannerTimer = 0;
    let tutorialCarRef: PooledTrafficVehicle | null = null;

    // Item 4: Projeção 2D da posição acima do Motoboy para os 10 Corações Dinâmicos
    const _heartProjVec = new THREE.Vector3();
    let playerScreenPos = { x: 0.5, y: 0.54 };

    // Item 6, 7 & 9: Estados de Equilíbrio do Grau, Quedas Cômicas e Fuga Final sem Pizzas
    let wheelieOverbalanceTimer = 0;
    type SpecialEndSequence =
      | 'none'
      | 'wheelie_brawl'
      | 'motoboy_backfall'
      | 'caramelo_flop'
      | 'pizza_escape';
    let specialEndSequence: SpecialEndSequence = 'none';
    let specialEndClock = 0;
    let specialEndReason = '';
    let escapeBikeZ = 0;

    // Item 8: Estado das Missões de Entrega de Pizzas
    const PIZZA_MISSION_GOAL = 8;
    let pizzasLeft = PIZZA_MISSION_GOAL;
    let pizzasDelivered = 0;
    let inDeliveryZone = false;
    let deliveryZoneSide: 'left' | 'right' | null = null;
    let activeDeliveryZoneIdx = -1;
    let lastPizzaDeliveredNonce = 0;

    const initBrawlFlyingParts = () => {
      const launchDirs: Array<{ vx: number; vy: number; vz: number; rx: number; ry: number; rz: number; delay: number }> = [
        { vx: -3.4, vy: 6.8, vz: -2.4, rx: 14, ry: 4, rz: 8, delay: 0.04 },   // wheel_front
        { vx: 3.6, vy: 6.4, vz: 1.8, rx: -15, ry: -3, rz: -9, delay: 0.12 },  // wheel_rear
        { vx: -1.6, vy: 8.6, vz: 2.6, rx: 9, ry: 11, rz: -7, delay: 0.08 },   // crate
        { vx: 2.5, vy: 7.9, vz: -1.5, rx: -12, ry: 13, rz: 10, delay: 0.20 }, // handlebar
        { vx: -2.9, vy: 7.2, vz: 1.1, rx: 11, ry: -9, rz: 14, delay: 0.28 },  // muffler
        { vx: 1.4, vy: 7.5, vz: -2.8, rx: 13, ry: 8, rz: -11, delay: 0.34 },  // fender
      ];
      for (let i = 0; i < brawlPartState.length; i++) {
        const cfg = launchDirs[i % launchDirs.length];
        const st = brawlPartState[i];
        st.launched = false;
        st.launchDelay = cfg.delay;
        st.x = 0;
        st.y = 0.55;
        st.z = 0;
        st.vx = cfg.vx;
        st.vy = cfg.vy;
        st.vz = cfg.vz;
        st.rx = cfg.rx;
        st.ry = cfg.ry;
        st.rz = cfg.rz;
        brawlFinaleRig.flyingParts[i].group.visible = false;
        brawlFinaleRig.flyingParts[i].group.position.set(0, 0.55, 0);
      }
    };

    const buildHudSnapshot = (): HudSnapshot => {
      let nearestSlot = activeHouseSlots[0];
      let bestDist = Infinity;
      for (const slot of activeHouseSlots) {
        const d = Math.abs(slot.z - -6);
        if (d < bestDist) {
          bestDist = d;
          nearestSlot = slot;
        }
      }
      const leftSpec = getHouseVariationByIndex(nearestSlot.leftVarIndex);
      const rightSpec = getHouseVariationByIndex(nearestSlot.rightVarIndex);

      const roundedScore = Math.round(playerState.score);
      if (roundedScore > bestScoreRef.current) {
        bestScoreRef.current = roundedScore;
      }

      const isMoto = playModeRef.current === 'moto';
      const grauBoostKmh = isMoto ? Math.round(Math.max(0, wheelieAngle) * 22) : 0;
      const meatBoostKmh = !isMoto && meatBoostTimer > 0 ? Math.round(Math.min(1, meatBoostTimer) * 38) : 0;
      const displayKmh = Math.round(playerState.speed * 5.6) + grauBoostKmh + meatBoostKmh;

      return {
        score: roundedScore,
        bestScore: bestScoreRef.current,
        coins: playerState.coins,
        distance: Math.round(playerState.distance),
        hp: playerState.hp,
        maxHp: playerState.maxHp,
        combo: playerState.combo,
        speed: displayKmh,
        housesPassed: playerState.housesPassed,
        leftHouseId: leftSpec.id,
        leftHouseName: leftSpec.name,
        rightHouseId: rightSpec.id,
        rightHouseName: rightSpec.name,
        bonesCollected: bonesCollectedRun,
        stamina: Math.round(carameloStamina),
        meatBoostActive: meatBoostTimer > 0.05,
        biteReady: isBiteCurrentlyReady || (!isMoto && carameloBitePhase === 'precision'),
        biteCooldownRatio: THREE.MathUtils.clamp(biteCooldownTimer / BITE_COOLDOWN_MAX, 0, 1),
        targetMotoboyHp: aiMotoHp,
        targetMotoboyMaxHp: aiMotoMaxHp,
        motoboysDefeated,
        carameloAttackWarning: isMoto && motoDogAttackPhase === 'warning',
        bitePrecisionActive: !isMoto && carameloBitePhase === 'precision',
        bitePrecisionMarker: precisionMarkerValue,
        biteLastResult,
        brawlFinaleActive:
          (!isMoto && (carameloBitePhase === 'brawl_leap' || carameloBitePhase === 'brawl_cloud')) ||
          specialEndSequence === 'wheelie_brawl',
        dodgeSuccessNonce,
        playerScreenPos,
        pizzasLeft,
        pizzasDelivered,
        pizzaMissionGoal: PIZZA_MISSION_GOAL,
        inDeliveryZone: isMoto && inDeliveryZone && pizzasLeft > 0,
        deliveryZoneSide: isMoto && inDeliveryZone ? deliveryZoneSide : null,
        lastPizzaDeliveredNonce,
        tutorialPhase: isMoto ? tutorialPhase : 'none',
        tutorialBannerText:
          isMoto && tutorialBannerTimer > 0 ? 'Agora se vire hahaha...' : null,
        wheelieBalanceRatio: isMoto ? THREE.MathUtils.clamp(wheelieAngle / 0.74, 0, 1) : 0,
        missionVictorySequenceActive: specialEndSequence === 'pizza_escape',
      };
    };

    const emitHud = (force = false) => {
      const minInterval = carameloBitePhase === 'precision' ? 0.015 : 0.08;
      if (!force && hudEmitTimer < minInterval) return;
      hudEmitTimer = 0;
      onHudUpdateRef.current(buildHudSnapshot());
    };

    const pickCashDenomination = (): CashDenomination => {
      const diff = difficultyRef.current;
      const roll = Math.random();
      if (diff === 'hard') {
        // Modo Difícil: a nota rara bordô de R$ 200 aparece com bem mais frequência (~18%!)
        if (roll >= 0.82) return 200;
        if (roll >= 0.58) return 100;
        if (roll >= 0.28) return 50;
        return 10;
      }
      if (diff === 'medium') {
        if (roll >= 0.945) return 200;
        if (roll >= 0.76) return 100;
        if (roll >= 0.44) return 50;
        return 10;
      }
      // Modo Fácil: R$ 200 bem rara (~2.5%)
      if (roll >= 0.975) return 200;
      if (roll >= 0.83) return 100;
      if (roll >= 0.52) return 50;
      return 10;
    };

    // Spawner abundante de Notas de Dinheiro Brasileiro Cartoon (trilhas de 1 a 3 notas nas faixas livres!)
    const spawnStreetCashStack = (customZ?: number) => {
      let freeCount = 0;
      for (let i = 0; i < cashStackPool.length; i++) {
        if (!cashStackPool[i].inUse) freeCount++;
      }
      if (freeCount === 0) return;

      const baseZ = customZ ?? -96.0 - Math.random() * 14.0;
      const trailLen = Math.min(
        freeCount,
        Math.random() < 0.35 ? 3 : Math.random() < 0.72 ? 2 : 1
      );

      const lanes: LaneIndex[] = [-1, 0, 1];
      for (let i = lanes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = lanes[i];
        lanes[i] = lanes[j];
        lanes[j] = tmp;
      }

      let selectedLane: LaneIndex | null = null;
      for (const ln of lanes) {
        let blocked = false;
        const zEnd = baseZ - (trailLen - 1) * 5.2;
        for (let i = 0; i < trafficPool.length; i++) {
          const v = trafficPool[i];
          if (v.inUse && v.lane === ln && v.z < baseZ + 10.5 && v.z > zEnd - 10.5) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          for (let i = 0; i < cashStackPool.length; i++) {
            const c = cashStackPool[i];
            if (c.inUse && c.lane === ln && c.z < baseZ + 6.5 && c.z > zEnd - 6.5) {
              blocked = true;
              break;
            }
          }
        }
        if (!blocked) {
          selectedLane = ln;
          break;
        }
      }

      if (selectedLane === null) return;

      const targetDenom = pickCashDenomination();
      const curveY = worldCurveUniforms.uWorldCurveY.value;

      for (let t = 0; t < trailLen; t++) {
        let chosenStack: PooledCashStack | null = null;
        // Na trilha, notas de 200 raras vêm sozinhas ou como prêmio no final da trilha
        const stepDenom: CashDenomination =
          targetDenom === 200 && t < trailLen - 1 ? 100 : targetDenom;

        for (let i = 0; i < cashStackPool.length; i++) {
          const cand = cashStackPool[i];
          if (!cand.inUse && cand.denomination === stepDenom) {
            chosenStack = cand;
            break;
          }
        }
        if (!chosenStack) {
          for (let i = 0; i < cashStackPool.length; i++) {
            if (!cashStackPool[i].inUse) {
              chosenStack = cashStackPool[i];
              break;
            }
          }
        }
        if (!chosenStack) break;

        const zPos = baseZ - t * 5.2;
        chosenStack.lane = selectedLane;
        chosenStack.x = laneToX(selectedLane);
        chosenStack.z = zPos;

        const curveDist = Math.max(0, -(zPos - WORLD_CURVE_START_Z));
        chosenStack.mesh.position.set(
          chosenStack.x,
          -curveY * curveDist * curveDist,
          zPos
        );
        chosenStack.mesh.rotation.x = Math.atan(2 * curveY * curveDist);
        attachCashStack(chosenStack);
      }
    };

    const seedInitialCashStacks = () => {
      for (let i = 0; i < cashStackPool.length; i++) {
        eraseCashStack(cashStackPool[i]);
      }
      if (playModeRef.current !== 'moto') return;
      spawnStreetCashStack(-20.0);
      spawnStreetCashStack(-42.0);
      spawnStreetCashStack(-64.0);
      spawnStreetCashStack(-86.0);
      spawnStreetCashStack(-108.0);
      cashSpawnTimer = 0.65;
    };

    // Spawner de Ossos Brancos 3D no Modo Caramelo (trilhas de 1 a 3 ossos nas faixas livres!)
    const spawnStreetWhiteBones = (customZ?: number) => {
      let freeCount = 0;
      for (let i = 0; i < whiteBonePool.length; i++) {
        if (!whiteBonePool[i].inUse) freeCount++;
      }
      if (freeCount === 0) return;

      const baseZ = customZ ?? -94.0 - Math.random() * 14.0;
      const trailLen = Math.min(freeCount, Math.random() < 0.42 ? 3 : Math.random() < 0.78 ? 2 : 1);
      const lanes: LaneIndex[] = [-1, 0, 1];
      for (let i = lanes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = lanes[i];
        lanes[i] = lanes[j];
        lanes[j] = tmp;
      }

      let selectedLane: LaneIndex | null = null;
      for (const ln of lanes) {
        let blocked = false;
        const zEnd = baseZ - (trailLen - 1) * 4.8;
        for (let i = 0; i < trafficPool.length; i++) {
          const v = trafficPool[i];
          if (v.inUse && v.lane === ln && v.z < baseZ + 9.5 && v.z > zEnd - 9.5) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          for (let i = 0; i < whiteBonePool.length; i++) {
            const b = whiteBonePool[i];
            if (b.inUse && b.lane === ln && b.z < baseZ + 6.0 && b.z > zEnd - 6.0) {
              blocked = true;
              break;
            }
          }
        }
        if (!blocked) {
          selectedLane = ln;
          break;
        }
      }
      if (selectedLane === null) return;

      const curveY = worldCurveUniforms.uWorldCurveY.value;
      for (let t = 0; t < trailLen; t++) {
        let chosen: PooledWhiteBone | null = null;
        for (let i = 0; i < whiteBonePool.length; i++) {
          if (!whiteBonePool[i].inUse) {
            chosen = whiteBonePool[i];
            break;
          }
        }
        if (!chosen) break;
        const zPos = baseZ - t * 4.8;
        chosen.lane = selectedLane;
        chosen.x = laneToX(selectedLane);
        chosen.z = zPos;
        const cDist = Math.max(0, -(zPos - WORLD_CURVE_START_Z));
        chosen.root.position.set(chosen.x, -curveY * cDist * cDist, zPos);
        chosen.root.rotation.x = Math.atan(2 * curveY * cDist);
        attachWhiteBone(chosen);
      }
    };

    // Spawner Estratégico de Carne Vermelha (máximo de 2 ativas simultaneamente para nunca exagerar!)
    const spawnStreetRedMeat = (customZ?: number) => {
      let activeMeats = 0;
      let freeMeat: PooledRedMeat | null = null;
      for (let i = 0; i < redMeatPool.length; i++) {
        if (redMeatPool[i].inUse) {
          activeMeats++;
        } else if (!freeMeat) {
          freeMeat = redMeatPool[i];
        }
      }
      if (!freeMeat || activeMeats >= 2) return;

      const spawnZ = customZ ?? -(98.0 + Math.random() * 18.0);
      const lanes: LaneIndex[] = [-1, 0, 1];
      for (let i = lanes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = lanes[i];
        lanes[i] = lanes[j];
        lanes[j] = tmp;
      }

      let chosenLane: LaneIndex | null = null;
      for (const ln of lanes) {
        let blocked = false;
        for (let i = 0; i < trafficPool.length; i++) {
          const v = trafficPool[i];
          if (v.inUse && v.lane === ln && Math.abs(v.z - spawnZ) < 13.0) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          for (let i = 0; i < manholePool.length; i++) {
            const mh = manholePool[i];
            if (mh.inUse && mh.lane === ln && Math.abs(mh.z - spawnZ) < 11.0) {
              blocked = true;
              break;
            }
          }
        }
        if (!blocked) {
          chosenLane = ln;
          break;
        }
      }
      if (chosenLane === null) return;

      const curveY = worldCurveUniforms.uWorldCurveY.value;
      freeMeat.lane = chosenLane;
      freeMeat.x = laneToX(chosenLane);
      freeMeat.z = spawnZ;
      const cDist = Math.max(0, -(spawnZ - WORLD_CURVE_START_Z));
      freeMeat.root.position.set(freeMeat.x, -curveY * cDist * cDist, spawnZ);
      freeMeat.root.rotation.x = Math.atan(2 * curveY * cDist);
      attachRedMeat(freeMeat);
    };

    const seedInitialDogCollectibles = () => {
      for (let i = 0; i < whiteBonePool.length; i++) eraseWhiteBone(whiteBonePool[i]);
      for (let i = 0; i < redMeatPool.length; i++) eraseRedMeat(redMeatPool[i]);
      if (playModeRef.current !== 'caramelo') return;
      spawnStreetWhiteBones(-22.0);
      spawnStreetWhiteBones(-44.0);
      spawnStreetWhiteBones(-66.0);
      spawnStreetWhiteBones(-88.0);
      spawnStreetRedMeat(-54.0);
      boneSpawnTimer = 0.65;
      meatSpawnTimer = 8.5;
    };

    // Spawner justo de ondas na contramão (sempre garante pelo menos 1 faixa livre para desvio!)
    const spawnOncomingTrafficWave = () => {
      if (trafficPool.length === 0) return;

      let activeCount = 0;
      for (let i = 0; i < trafficPool.length; i++) {
        if (trafficPool[i].inUse) activeCount++;
      }
      if (activeCount >= activeMaxTraffic) return;

      const diff = difficultyRef.current;
      // No modo difícil os carros e ônibus vêm significativamente mais rápidos!
      const speedMult = diff === 'easy' ? 0.82 : diff === 'hard' ? 1.58 : 1.0;
      const distFactor = Math.min(0.28, playerState.distance / 2600);

      const doubleWaveChance =
        diff === 'easy' ? 0.22 : diff === 'hard' ? 0.68 : 0.44;
      const wantTwoVehicles =
        Math.random() < doubleWaveChance && activeCount + 2 <= activeMaxTraffic;
      const countToSpawn = wantTwoVehicles ? 2 : 1;

      // Escolhe faixas disponíveis (sem bloquear as 3 ruas ao mesmo tempo!)
      const candidateLanes: LaneIndex[] = [-1, 0, 1];
      for (let i = candidateLanes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = candidateLanes[i];
        candidateLanes[i] = candidateLanes[j];
        candidateLanes[j] = tmp;
      }
      if (countToSpawn === 1 && candidateLanes[0] === lastSpawnedLane) {
        const swap = candidateLanes[0];
        candidateLanes[0] = candidateLanes[1];
        candidateLanes[1] = swap;
      }

      trafficWaveCounter++;
      const preferBus = trafficWaveCounter % 3 === 0;

      for (let s = 0; s < countToSpawn; s++) {
        const chosenLane = candidateLanes[s];
        const spawnZ = s === 0 ? -110.0 : -122.0 - Math.random() * 5.0;

        let laneBusyAtHorizon = false;
        for (let i = 0; i < trafficPool.length; i++) {
          const v = trafficPool[i];
          if (v.inUse && v.lane === chosenLane && Math.abs(v.z - spawnZ) < 18.0) {
            laneBusyAtHorizon = true;
            break;
          }
        }
        if (laneBusyAtHorizon) continue;

        const freeIndices: number[] = [];
        for (let i = 0; i < trafficPool.length; i++) {
          if (!trafficPool[i].inUse) {
            if (s === 0 && preferBus && trafficPool[i].def.kind === 'bus') {
              freeIndices.push(i);
            } else if (!(s === 0 && preferBus) || freeIndices.length === 0) {
              freeIndices.push(i);
            }
          }
        }
        if (freeIndices.length === 0) break;

        let poolIdx = freeIndices[Math.floor(Math.random() * freeIndices.length)];
        if (s === 0 && preferBus) {
          const busCandidates = freeIndices.filter((idx) => trafficPool[idx].def.kind === 'bus');
          if (busCandidates.length > 0) {
            poolIdx = busCandidates[Math.floor(Math.random() * busCandidates.length)];
          }
        }

        const veh = trafficPool[poolIdx];
        veh.lane = chosenLane;
        veh.x = laneToX(chosenLane);
        veh.z = spawnZ;
        veh.speedMs = veh.def.baseSpeedMs * (speedMult + distFactor);
        veh.wheelAngle = 0;
        veh.nearMissAwarded = false;
        veh.honked = false;
        veh.root.rotation.set(0, 0, 0);
        veh.contactShadow.visible = showContactShadows;

        const curveDist = Math.max(0, -(veh.z - WORLD_CURVE_START_Z));
        const curveY = worldCurveUniforms.uWorldCurveY.value;
        veh.root.position.set(veh.x, -curveY * curveDist * curveDist, veh.z);
        veh.root.rotation.x = Math.atan(2 * curveY * curveDist);
        attachVehicleToScene(veh);

        lastSpawnedLane = chosenLane;
      }

      const baseInterval = diff === 'easy' ? 1.65 : diff === 'hard' ? 0.75 : 1.28;
      trafficSpawnTimer = Math.max(0.56, baseInterval - distFactor * 0.85) + Math.random() * 0.25;
    };

    // Popula imediatamente veículos já visíveis na rua ao iniciar (e remove da cena todos os demais!)
    const seedInitialStreetTraffic = () => {
      if (trafficPool.length === 0) return;
      for (let i = 0; i < trafficPool.length; i++) {
        trafficPool[i].root.rotation.set(0, 0, 0);
        eraseVehicleFromScene(trafficPool[i]);
      }

      const diff = difficultyRef.current;
      const speedMult = diff === 'easy' ? 0.82 : diff === 'hard' ? 1.58 : 1.0;
      const curveY = worldCurveUniforms.uWorldCurveY.value;

      const initialSeeds: Array<{ z: number; lane: LaneIndex; wantBus: boolean }> =
        playModeRef.current === 'moto'
          ? [
              // Item 2: No início da corrida do Motoboy, o 1º carro vem em alta velocidade na mesma faixa (lane 0) para o Tutorial Cinematográfico!
              { z: -38.0, lane: 0, wantBus: false },
              { z: -76.0, lane: -1, wantBus: true },
              { z: -108.0, lane: 1, wantBus: false },
            ]
          : [
              { z: -42.0, lane: Math.random() < 0.5 ? -1 : 1, wantBus: false },
              { z: -72.0, lane: 0, wantBus: true },
              { z: -102.0, lane: Math.random() < 0.5 ? 1 : -1, wantBus: false },
            ];

      tutorialCarRef = null;
      let spawned = 0;
      for (const seed of initialSeeds) {
        if (spawned >= activeMaxTraffic) break;
        const candidates: number[] = [];
        for (let i = 0; i < trafficPool.length; i++) {
          if (!trafficPool[i].inUse) {
            if (seed.wantBus && trafficPool[i].def.kind === 'bus') candidates.push(i);
            else if (!seed.wantBus && trafficPool[i].def.kind === 'car') candidates.push(i);
          }
        }
        if (candidates.length === 0) continue;
        const idx = candidates[Math.floor(Math.random() * candidates.length)];
        const veh = trafficPool[idx];
        veh.lane = seed.lane;
        veh.x = laneToX(seed.lane);
        veh.z = seed.z;
        veh.speedMs =
          spawned === 0 && playModeRef.current === 'moto'
            ? veh.def.baseSpeedMs * Math.max(1.22, speedMult)
            : veh.def.baseSpeedMs * speedMult;
        veh.wheelAngle = 0;
        veh.nearMissAwarded = false;
        veh.honked = false;
        veh.root.rotation.set(0, 0, 0);
        veh.contactShadow.visible = showContactShadows;

        const curveDist = Math.max(0, -(veh.z - WORLD_CURVE_START_Z));
        veh.root.position.set(veh.x, -curveY * curveDist * curveDist, veh.z);
        veh.root.rotation.x = Math.atan(2 * curveY * curveDist);
        attachVehicleToScene(veh);
        if (spawned === 0 && playModeRef.current === 'moto') {
          tutorialCarRef = veh;
        }
        spawned++;
      }

      trafficSpawnTimer = 0.85;
      seedInitialCashStacks();
    };
    seedInitialTrafficRef = seedInitialStreetTraffic;

    const seedInitialPizzaZones = () => {
      const isMoto = playModeRef.current === 'moto';
      for (let i = 0; i < pizzaZonePool.length; i++) {
        const pz = pizzaZonePool[i];
        pz.z = -38.0 - i * PIZZA_ZONE_STEP_Z;
        pz.delivered = false;
        pz.happyJumpTimer = 0;
        pz.rig.orderBadgeMesh.visible = true;
        pz.rig.deliveredBadgeMesh.visible = false;
        pz.rig.floorZoneGroup.visible = true;
        pz.rig.root.visible = isMoto;
      }
      flyingPizzaState.active = false;
      flyingPizzaBoxMesh.visible = false;
    };

    const resetRun = () => {
      playerState = createInitialPlayerState(difficultyRef.current);
      // Item 4: O Motoboy tem 10 vidas dinâmicas!
      if (playModeRef.current === 'moto') {
        playerState.hp = 10;
        playerState.maxHp = 10;
      }
      hitstopTimer = 0;
      cameraTrauma = 0;
      camRollAngle = 0;
      camRollImpulse = 0;
      gaitCycle = 0;
      steerVelocityX = 0;
      holdSteerTimer = 0;
      wheeliePulseTimer = 0;
      wheelieAngle = 0;
      wheelieVel = 0;
      wheelieOverbalanceTimer = 0;
      forkDip = 0;
      forkDipVel = 0;
      chaseDogX = 0;
      chaseDogVelX = 0;
      chaseLungeTimer = 2.6;
      chaseLungeBoost = 0;
      chaseBarkTimer = 3.8;
      motoDogAttackPhase = 'stalking';
      motoDogAttackTimer = difficultyRef.current === 'hard' ? 6.8 : 8.2;
      motoDogPhaseClock = 0;
      motoDogWarnBlinkPhase = 0;
      motoDogLockedX = 0;
      motoDogStartX = 0;
      motoDogStartZ = 1.85;
      dodgeSuccessNonce = 0;
      carameloWarnRig.root.visible = false;
      dangerGroundStrip.root.visible = false;
      brawlFinaleRig.root.visible = false;

      tutorialPhase = playModeRef.current === 'moto' ? 'approaching' : 'none';
      tutorialTimeScale = 1.0;
      tutorialSlowMoClock = 0;
      tutorialBannerTimer = 0;

      specialEndSequence = 'none';
      specialEndClock = 0;
      specialEndReason = '';
      escapeBikeZ = 0;

      pizzasLeft = PIZZA_MISSION_GOAL;
      pizzasDelivered = 0;
      inDeliveryZone = false;
      deliveryZoneSide = null;
      activeDeliveryZoneIdx = -1;

      riderDamageFlashTimer = 0;
      thermalVisionBlend = 0;
      carameloBitePhase = 'pursuing';
      precisionClock = 0;
      precisionMarkerPhase = 0;
      precisionMarkerValue = 0;
      bitePrepBlend = 0;
      biteStrikeTimer = 0;
      biteLastResult = null;
      impactReactTimer = 0;
      brawlClock = 0;

      bonesCollectedRun = 0;
      carameloStamina = 100;
      meatBoostTimer = 0;
      biteCooldownTimer = 0;
      carameloBiteLungeTimer = 0;
      isBiteCurrentlyReady = false;
      aiMotoLane = 0;
      aiMotoX = 0;
      aiMotoVelX = 0;
      aiMotoZ = -8.6;
      aiMotoEscapeVel = 0;
      aiMotoHp = aiMotoMaxHp;
      motoboysDefeated = 0;
      chasePressure = 0.25;
      aiMotoEscapeTimer = 0;
      aiMotoRespawnTimer = 0;
      aiDecisionCooldown = 0;

      if (playerMotoInstance) {
        playerMotoInstance.setRiderDamageFlash(0);
        playerMotoInstance.setRiderThermalVision(0);
        playerMotoInstance.setRiderKnockoutFall(0);
        playerMotoInstance.setPizzaBoxCount(pizzasLeft);
      }
      if (leadCaramelo) {
        leadCaramelo.setBitePrepFactor(0);
        leadCaramelo.setDefeatPose(0);
      }

      dayNightCycleProgress = presetToCyclePhase(skyPresetRef.current);
      keysDown.left = false;
      keysDown.right = false;
      keysDown.wheelie = false;
      isCrashing = false;
      crashTimer = 0;
      activeCrashReason = '';
      explosionGroup.visible = false;
      clearBikeParticles();
      clearCashPickupBurst();
      clearHeadBanknotes();
      clearWaterSplashParticles();
      trafficWaveCounter = 0;
      seedInitialStreetTraffic();
      seedInitialCashStacks();
      seedInitialDogCollectibles();
      seedInitialManholes();
      seedInitialPizzaZones();
      const isPlayingOrPaused = phaseRef.current === 'playing' || phaseRef.current === 'paused';
      if (playerMotoInstance) {
        playerMotoInstance.root.visible = isPlayingOrPaused;
      }
      if (leadCaramelo) {
        leadCaramelo.root.visible = isPlayingOrPaused;
      }
      emitHud(true);
    };

    resetRunRef.current = resetRun;
    resetRun();

    // Item 2: Resolve o desvio com Jato de Água durante a câmera lenta do tutorial inicial!
    const completeTutorialSlowMoDodge = (dodgeDir: -1 | 1) => {
      if (tutorialPhase !== 'slowmo') return;
      tutorialPhase = 'complete';
      tutorialTimeScale = 1.0;
      tutorialBannerTimer = 2.8;
      sound.playSlowMoTransition(false);
      sound.playWaterGeyserBurst();
      sound.boostGameplayMusicIntensity(0.32, 1.4);
      emitDirectionalWaterSplash(
        playerState.x,
        playerState.y + 0.55,
        0,
        playerState.speed,
        dodgeDir * 6.5,
        20
      );
      onWaterJetSplashRef.current?.(0.75);
      cameraTrauma = Math.max(cameraTrauma, 0.35);
      emitHud(true);
    };

    // Item 8: Executa o arremesso fluido com uma mão da Caixa de Pizza para o cliente na calçada!
    const triggerPizzaThrowToZone = (zoneIdx: number) => {
      if (zoneIdx < 0 || zoneIdx >= pizzaZonePool.length) return;
      const pz = pizzaZonePool[zoneIdx];
      if (pz.delivered || pizzasLeft <= 0 || flyingPizzaState.active) return;

      pz.delivered = true;
      inDeliveryZone = false;
      deliveryZoneSide = null;
      activeDeliveryZoneIdx = -1;

      pizzasLeft = Math.max(0, pizzasLeft - 1);
      playerMotoInstance?.setPizzaBoxCount(pizzasLeft);
      const sideSign: -1 | 1 = pz.side === 'left' ? -1 : 1;
      playerMotoInstance?.triggerPizzaThrow(sideSign);
      sound.playPizzaThrowWhoosh();

      flyingPizzaState.active = true;
      flyingPizzaState.age = 0;
      flyingPizzaState.duration = 0.34;
      flyingPizzaState.startX = playerState.x + sideSign * 0.52;
      flyingPizzaState.startY = playerState.y + 1.18;
      flyingPizzaState.startZ = -0.15;
      flyingPizzaState.endX = sideSign * 5.25;
      flyingPizzaState.endY = 1.18;
      flyingPizzaState.endZ = pz.z;
      flyingPizzaState.targetZoneIdx = zoneIdx;
      flyingPizzaBoxMesh.position.set(
        flyingPizzaState.startX,
        flyingPizzaState.startY,
        flyingPizzaState.startZ
      );
      flyingPizzaBoxMesh.visible = true;
      emitHud(true);
    };

    const doThrowPizza = () => {
      if (phaseRef.current !== 'playing' || isCrashing || specialEndSequence !== 'none') return;
      if (playModeRef.current !== 'moto') return;
      if (activeDeliveryZoneIdx >= 0 && pizzasLeft > 0) {
        triggerPizzaThrowToZone(activeDeliveryZoneIdx);
      }
    };

    // 15. Camera Lane & Movement Controls + Sistema de Mordida no Modo Caramelo
    const doShiftLeft = () => {
      if (phaseRef.current !== 'playing' || isCrashing || specialEndSequence !== 'none') return;
      const prevLane = playerState.lane;
      playerState = shiftLane(playerState, -1);
      if (playerState.lane !== prevLane) {
        camRollImpulse = 0.068;
      }
      if (tutorialPhase === 'slowmo') {
        if (playerState.lane === 0) {
          playerState = shiftLane(playerState, -1);
        }
        completeTutorialSlowMoDodge(-1);
      }
    };

    const doShiftRight = () => {
      if (phaseRef.current !== 'playing' || isCrashing || specialEndSequence !== 'none') return;
      const prevLane = playerState.lane;
      playerState = shiftLane(playerState, 1);
      if (playerState.lane !== prevLane) {
        camRollImpulse = -0.068;
      }
      if (tutorialPhase === 'slowmo') {
        if (playerState.lane === 0) {
          playerState = shiftLane(playerState, 1);
        }
        completeTutorialSlowMoDodge(1);
      }
    };

    const doJump = () => {
      if (phaseRef.current !== 'playing' || isCrashing || specialEndSequence !== 'none') return;
      if (tutorialPhase === 'slowmo') {
        const safeDir: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
        playerState = shiftLane(playerState, safeDir);
        playerState = triggerJump(playerState);
        completeTutorialSlowMoDodge(safeDir);
        return;
      }
      if (!playerState.isJumping) {
        playerState = triggerJump(playerState);
        if (playModeRef.current === 'caramelo') {
          sound.playBoing();
        }
      }
    };

    const doRoll = () => {
      if (phaseRef.current !== 'playing' || isCrashing || specialEndSequence !== 'none') return;
      if (tutorialPhase === 'slowmo') {
        const safeDir: -1 | 1 = -1;
        playerState = shiftLane(playerState, safeDir);
        completeTutorialSlowMoDodge(safeDir);
        return;
      }
      playerState = triggerRoll(playerState);
    };

    // Avalia a região exata na Barra de Precisão da Mordida (Item 3: Vermelho | Laranja | Amarelo | VERDE)
    const evaluatePrecisionQuality = (markerPos01: number): BitePrecisionQuality => {
      if (markerPos01 >= 0.41 && markerPos01 <= 0.59) return 'perfect'; // Verde Central (18%)
      if ((markerPos01 >= 0.30 && markerPos01 < 0.41) || (markerPos01 > 0.59 && markerPos01 <= 0.70)) {
        return 'good'; // Amarelo (22%)
      }
      if ((markerPos01 >= 0.16 && markerPos01 < 0.30) || (markerPos01 > 0.70 && markerPos01 <= 0.84)) {
        return 'weak'; // Laranja (28%)
      }
      return 'miss'; // Vermelho nas pontas (32%)
    };

    const resolveCarameloPrecisionBite = (quality: BitePrecisionQuality) => {
      leadCaramelo?.setBitePrepFactor(0);
      biteResultNonce += 1;
      biteLastResult = { quality, nonce: biteResultNonce };
      isBiteCurrentlyReady = false;

      if (quality === 'miss') {
        // Vermelho -> Erro: mordida falha e o Motoboy acelera progressivamente escapando!
        sound.playBitePrecisionConfirm('miss');
        biteCooldownTimer = 1.65;
        carameloBitePhase = 'escaping';
        aiMotoEscapeVel = 1.5;
        aiMotoEscapeTimer = 1.65;
        chasePressure = 0.05;
        emitHud(true);
        return;
      }

      // Acerto (Laranja / Amarelo / Verde): piscar azul na tela + VFX proporcional + Motoboy achatado!
      biteCooldownTimer = BITE_COOLDOWN_MAX;
      biteStrikeTimer = 0.28;
      leadCaramelo?.triggerBiteChomp();
      sound.playCustomBark();
      sound.playBitePrecisionConfirm(quality);

      const squashPower = quality === 'perfect' ? 1.15 : quality === 'good' ? 0.88 : 0.62;
      const burstCount = quality === 'perfect' ? 26 : quality === 'good' ? 18 : 11;
      const accentColor =
        quality === 'perfect' ? 0x4ade80 : quality === 'good' ? 0xfacc15 : 0xf97316;

      playerMotoInstance?.triggerRiderSquash(squashPower);
      triggerCustomColorBurst(aiMotoX, 0.82, aiMotoZ + 0.32, 0x38bdf8, accentColor, burstCount);
      riderDamageFlashTimer = 0.55;
      cameraTrauma = Math.max(
        cameraTrauma,
        quality === 'perfect' ? 0.74 : quality === 'good' ? 0.54 : 0.38,
      );

      aiMotoHp = Math.max(0, aiMotoHp - 1);
      chasePressure = 0;

      const nextCombo = Math.min(10, playerState.combo + 1);
      const scoreGain =
        (quality === 'perfect' ? 480 : quality === 'good' ? 310 : 190) * nextCombo;
      const coinGain = quality === 'perfect' ? 4 : quality === 'good' ? 3 : 2;
      const cashBonus = quality === 'perfect' ? 180 : quality === 'good' ? 120 : 75;

      playerState = {
        ...playerState,
        coins: playerState.coins + coinGain,
        combo: nextCombo,
        score: playerState.score + scoreGain,
      };
      onBoneCollectedRef.current?.(cashBonus, 'bite');

      if (aiMotoHp <= 0) {
        // Item 6: 0 Vidas -> Grande Salto Cômico + Nuvem Branca de Poeira Volumétrica + Peças da Moto Voando!
        carameloBitePhase = 'brawl_leap';
        brawlClock = 0;
        brawlStartX = playerState.x;
        brawlStartZ = 0;
        brawlCenterX = aiMotoX * 0.65;
        brawlCenterZ = THREE.MathUtils.clamp(aiMotoZ - 1.35, -5.2, -3.4);
        sound.playBoing();
        // Limpa perigos imediatos próximos à câmera para o grand finale brilhar sem interrupção
        for (let i = 0; i < trafficPool.length; i++) {
          if (trafficPool[i].inUse && trafficPool[i].z > -38) {
            eraseVehicleFromScene(trafficPool[i]);
          }
        }
        for (let i = 0; i < manholePool.length; i++) {
          if (manholePool[i].inUse && manholePool[i].z > -32) {
            eraseManhole(manholePool[i]);
          }
        }
      } else {
        // Item 4: Reage primeiro ao impacto (achatado) e em seguida acelera progressivamente fugindo!
        carameloBitePhase = 'impact_react';
        impactReactTimer = 0.28;
        aiMotoEscapeVel = 0;
        aiMotoEscapeTimer = 1.85;
      }

      emitHud(true);
    };

    // Ação de Mordida ("MORDER") em 2 Etapas no Modo Caramelo (Item 2 & Item 3):
    // 1º Toque: Aproximação suave c/ postura de preparação + abre Barra de Precisão!
    // 2º Toque: Trava o marcador em movimento e executa a mordida!
    const doCarameloBite = () => {
      if (phaseRef.current !== 'playing' || isCrashing) return;
      if (playModeRef.current !== 'caramelo') return;
      if (carameloBitePhase === 'brawl_leap' || carameloBitePhase === 'brawl_cloud') return;

      if (carameloBitePhase === 'precision') {
        const quality = evaluatePrecisionQuality(precisionMarkerValue);
        resolveCarameloPrecisionBite(quality);
        return;
      }

      if (carameloBitePhase !== 'pursuing') return;
      if (!isBiteCurrentlyReady || biteCooldownTimer > 0 || aiMotoRespawnTimer > 0) return;

      carameloBitePhase = 'precision';
      precisionClock = 0;
      precisionMarkerPhase = 0;
      precisionMarkerValue = 0;
      sound.playAttackWarning();
      emitHud(true);
    };

    const doWheelie = () => {
      if (phaseRef.current !== 'playing' || isCrashing || specialEndSequence !== 'none') return;
      if (playModeRef.current === 'caramelo') {
        doCarameloBite();
        return;
      }
      // Item 6: Pulso curto responsivo (0.48s) para que ao soltar o botão a moto sempre volte suavemente ao chão!
      wheeliePulseTimer = Math.max(wheeliePulseTimer, 0.48);
    };

    controlTriggerRef.current = {
      left: doShiftLeft,
      right: doShiftRight,
      jump: doJump,
      roll: doRoll,
      wheelie: doWheelie,
      bite: doCarameloBite,
      throwPizza: doThrowPizza,
      setHoldLeft: (down: boolean) => {
        keysDown.left = down;
        if (down) doShiftLeft();
      },
      setHoldRight: (down: boolean) => {
        keysDown.right = down;
        if (down) doShiftRight();
      },
      setHoldWheelie: (down: boolean) => {
        if (playModeRef.current === 'caramelo') {
          keysDown.wheelie = false;
          if (down) doCarameloBite();
          return;
        }
        keysDown.wheelie = down;
        if (down) {
          wheeliePulseTimer = Math.max(wheeliePulseTimer, 0.35);
        } else {
          wheeliePulseTimer = 0;
        }
      },
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current === 'playing' && !isCrashing && specialEndSequence === 'none') {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          e.preventDefault();
          keysDown.left = true;
          if (!e.repeat) doShiftLeft();
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          e.preventDefault();
          keysDown.right = true;
          if (!e.repeat) doShiftRight();
        } else if (e.code === 'KeyF' || e.code === 'Enter') {
          e.preventDefault();
          if (!e.repeat) doThrowPizza();
        } else if (e.code === 'KeyQ' || e.code === 'KeyE') {
          e.preventDefault();
          if (playModeRef.current === 'caramelo') {
            if (!e.repeat) doCarameloBite();
          } else {
            keysDown.wheelie = true;
            wheeliePulseTimer = 0.48;
          }
        } else if (e.code === 'Space') {
          if (!e.repeat) {
            e.preventDefault();
            if (
              playModeRef.current === 'caramelo' &&
              (carameloBitePhase === 'precision' || isBiteCurrentlyReady)
            ) {
              doCarameloBite();
            } else if (playModeRef.current === 'moto' && inDeliveryZone && pizzasLeft > 0 && tutorialPhase !== 'slowmo') {
              doThrowPizza();
            } else {
              doJump();
            }
          }
        } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          if (!e.repeat) {
            e.preventDefault();
            doJump();
          }
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          if (!e.repeat) {
            e.preventDefault();
            doRoll();
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keysDown.left = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keysDown.right = false;
      } else if (e.code === 'KeyQ' || e.code === 'KeyE') {
        keysDown.wheelie = false;
        wheeliePulseTimer = 0;
      }
    };

    let touchStartX = 0;
    let touchStartY = 0;
    const onPointerDown = (e: PointerEvent) => {
      touchStartX = e.clientX;
      touchStartY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (phaseRef.current !== 'playing' || isCrashing) return;
      const dx = e.clientX - touchStartX;
      const dy = e.clientY - touchStartY;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) doShiftLeft();
        else doShiftRight();
      } else {
        if (dy < 0) doJump();
        else doRoll();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const canvasEl = renderer.domElement;
    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('pointerup', onPointerUp);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', onResize);

    // 16. Main Simulation & Render Loop with Software-WebGL `afterDraw` Pacing + FPS Limiter
    let frameId = 0;
    let isDisposed = false;
    let lastTime = performance.now();
    let lastRenderTime = performance.now();
    const startTime = performance.now();
    const _camTargetPos = new THREE.Vector3();
    const _camLookAt = new THREE.Vector3();
    let currentCamLook = new THREE.Vector3(0, 2.15, -32);

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;
      const now = performance.now();

      // Controle de limite de FPS configurável pelo jogador (30 / 60 / Ilimitado)
      const capFps = fpsLimitRef.current;
      if (capFps > 0 && !isSoftwareGl) {
        const minFrameMs = 1000 / capFps;
        if (now - lastRenderTime < minFrameMs - 1.2) {
          frameId = requestAnimationFrame(tick);
          return;
        }
      }
      lastRenderTime = now;

      const rawDt = Math.max(0, (now - lastTime) / 1000);
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const elapsed = Math.max(0, (now - startTime) / 1000);
      const activePhase = phaseRef.current;

      // Ciclo Fluido Dia -> Pôr do Sol -> Noite c/ Estrelas, Lua, Postes Acesos, Nuvens Coloridas, Fog & Aurora Boreal!
      const isActivelyRunning =
        activePhase === 'playing' &&
        hitstopTimer <= 0 &&
        !isCrashing &&
        specialEndSequence === 'none';
      const isMotoMode = playModeRef.current === 'moto';

      // Item 2: Gerenciamento da Câmera Lenta Cinematográfica do Tutorial Inicial
      if (activePhase === 'playing' && isMotoMode) {
        if (tutorialBannerTimer > 0) {
          tutorialBannerTimer = Math.max(0, tutorialBannerTimer - dt);
          if (tutorialBannerTimer <= 0) {
            emitHud(true);
          }
        }
        if (tutorialPhase === 'approaching' && tutorialCarRef && tutorialCarRef.inUse) {
          if (
            tutorialCarRef.z >= -18.5 &&
            tutorialCarRef.z <= -4.5 &&
            Math.abs(playerState.x - tutorialCarRef.x) < 1.55
          ) {
            tutorialPhase = 'slowmo';
            tutorialSlowMoClock = 0;
            sound.playSlowMoTransition(true);
            emitHud(true);
          } else if (tutorialCarRef.z > -4.5) {
            completeTutorialSlowMoDodge(1);
          }
        }
        if (tutorialPhase === 'slowmo') {
          tutorialSlowMoClock += dt;
          tutorialTimeScale = THREE.MathUtils.lerp(tutorialTimeScale, 0.14, 1 - Math.exp(-14 * dt));
          // Se o jogador demorar mais de 3.1s na câmera lenta, desvia automaticamente para nunca morrer no tutorial
          if (tutorialSlowMoClock >= 3.1) {
            if (playerState.lane <= 0) {
              doShiftRight();
            } else {
              doShiftLeft();
            }
          }
        } else {
          tutorialTimeScale = THREE.MathUtils.lerp(tutorialTimeScale, 1.0, 1 - Math.exp(-12 * dt));
        }
      } else {
        tutorialTimeScale = 1.0;
      }
      const simDt = dt * tutorialTimeScale;

      if (isActivelyRunning) {
        dayNightCycleProgress = (dayNightCycleProgress + simDt / 64.0) % 1.0;
      } else if (activePhase === 'title') {
        dayNightCycleProgress = (dayNightCycleProgress + dt / 115.0) % 1.0;
      }
      applyDayNightAtmosphere(elapsed, simDt, playerState.speed, isActivelyRunning);
      horizonSkyline.update(elapsed, playerState.x);

      // Keep World Horizon Curvature Uniforms 100% static so distant mountains & skyline buildings never bob, pulse, or sway!
      worldCurveUniforms.uHorizonFogPulse.value = 0.0;
      const inspectedId = inspectedHouseRef.current;
      if (inspectedId !== null) {
        worldCurveUniforms.uWorldCurveY.value = 0.0008;
        worldCurveUniforms.uWorldCurveX.value = 0.0;
      } else {
        worldCurveUniforms.uWorldCurveY.value = DEFAULT_WORLD_CURVE_Y;
        worldCurveUniforms.uWorldCurveX.value = 0.0;
      }

      // Handle 30-House Catalog Inspector Showcase if active
      if (inspectedId !== lastInspectedId) {
        if (inspectedShowcaseMesh) {
          scene.remove(inspectedShowcaseMesh);
          inspectedShowcaseMesh = null;
        }
        lastInspectedId = inspectedId;
        const isInspecting = inspectedId !== null;
        if (isInspecting) {
          const spec = HOUSE_VARIATIONS.find((h) => h.id === inspectedId) || HOUSE_VARIATIONS[0];
          inspectedShowcaseMesh = buildBrazilianHouse(spec, 'left', maxAniso);
          inspectedShowcaseMesh.rotation.y = 0;
          inspectedShowcaseMesh.position.set(0, 0.22, -13.0);
          scene.add(inspectedShowcaseMesh);
        }
      }

      if (inspectedShowcaseMesh && inspectedId !== null) {
        atmosGroup.visible = false;
        exhaustInstanced.visible = false;
        dirtInstanced.visible = false;
        waterSplashInstanced.visible = false;
        carameloWarnRig.root.visible = false;
        dangerGroundStrip.root.visible = false;
        brawlFinaleRig.root.visible = false;
        if (playerMotoInstance) playerMotoInstance.root.visible = false;
        if (leadCaramelo) leadCaramelo.root.visible = false;
        inspectedShowcaseMesh.rotation.y = Math.sin(elapsed * 0.75) * 0.36;
        _camTargetPos.set(0, 3.4, -1.8);
        _camLookAt.set(0, 2.6, -13.0);
        const camDamp = 1 - Math.exp(-10 * dt);
        camera.position.lerp(_camTargetPos, camDamp);
        currentCamLook.lerp(_camLookAt, camDamp);
        camera.lookAt(currentCamLook);
        camera.rotation.z = 0;
      } else if (activePhase === 'title') {
        atmosGroup.visible = false;
        exhaustInstanced.visible = false;
        dirtInstanced.visible = false;
        waterSplashInstanced.visible = false;
        carameloWarnRig.root.visible = false;
        dangerGroundStrip.root.visible = false;
        brawlFinaleRig.root.visible = false;
        flyingPizzaBoxMesh.visible = false;
        for (let i = 0; i < pizzaZonePool.length; i++) {
          pizzaZonePool[i].rig.root.visible = false;
        }
        if (playerMotoInstance) playerMotoInstance.root.visible = false;
        if (leadCaramelo) leadCaramelo.root.visible = false;
        for (let i = 0; i < cashStackPool.length; i++) {
          if (cashStackPool[i].inUse) cashStackPool[i].mesh.visible = false;
        }
        for (let i = 0; i < whiteBonePool.length; i++) {
          if (whiteBonePool[i].inUse) whiteBonePool[i].root.visible = false;
        }
        for (let i = 0; i < redMeatPool.length; i++) {
          if (redMeatPool[i].inUse) redMeatPool[i].root.visible = false;
        }
        for (let i = 0; i < manholePool.length; i++) {
          if (manholePool[i].inUse) manholePool[i].rig.root.visible = false;
        }

        // Mantém os 7 veículos ultra-otimizados circulando no fundo do Menu e apaga assim que passam da câmera!
        trafficSpawnTimer -= dt;
        if (trafficSpawnTimer <= 0) {
          spawnOncomingTrafficWave();
        }
        const curveY = worldCurveUniforms.uWorldCurveY.value;
        for (let i = 0; i < trafficPool.length; i++) {
          const veh = trafficPool[i];
          if (!veh.inUse) continue;
          veh.z += veh.speedMs * dt;
          if (veh.z - veh.halfLength > 5.4) {
            eraseVehicleFromScene(veh);
            continue;
          }
          const curveDist = Math.max(0, -(veh.z - WORLD_CURVE_START_Z));
          veh.root.position.set(veh.x, -curveY * curveDist * curveDist, veh.z);
          veh.root.rotation.x = Math.atan(2 * curveY * curveDist);
          veh.contactShadow.visible = showContactShadows;
          veh.root.visible = veh.z >= -120.0;
          veh.spinWheels(dt, veh.speedMs);
        }

        _camTargetPos.set(0, 2.75, 5.55);
        _camLookAt.set(0, 2.1, -38);
        camera.position.lerp(_camTargetPos, 1 - Math.exp(-5 * dt));
        currentCamLook.lerp(_camLookAt, 1 - Math.exp(-5 * dt));
        camera.lookAt(currentCamLook);
        camera.rotation.z = 0;
      } else if (activePhase === 'playing') {
        if (isCrashing) {
          // Sequência Cinematográfica de Explosão Cartoon 3D (1.18s) -> Transição SE LASCOU! (Intacta para batidas de carro!)
          atmosGroup.visible = false;
          exhaustInstanced.visible = false;
          dirtInstanced.visible = false;
          waterSplashInstanced.visible = false;
          carameloWarnRig.root.visible = false;
          dangerGroundStrip.root.visible = false;
          brawlFinaleRig.root.visible = false;
          flyingPizzaBoxMesh.visible = false;
          clearHeadBanknotes();
          if (playerMotoInstance) {
            playerMotoInstance.setRiderDamageFlash(0);
            playerMotoInstance.setRiderThermalVision(0);
          }
          if (leadCaramelo) leadCaramelo.root.visible = false;
          crashTimer -= dt;
          const crashProgress = 1 - Math.max(0, crashTimer) / CRASH_SEQUENCE_DURATION;
          updateCartoonExplosion(dt, crashProgress);

          // Desacelera suavemente os outros veículos distantes durante a explosão
          const curveY = worldCurveUniforms.uWorldCurveY.value;
          for (let i = 0; i < trafficPool.length; i++) {
            const veh = trafficPool[i];
            if (!veh.inUse) continue;
            if (Math.abs(veh.z) > 4.5) {
              const slowSpeed = veh.speedMs * Math.max(0, 1 - crashProgress * 1.1) * 0.35;
              veh.z += slowSpeed * dt;
              const curveDist = Math.max(0, -(veh.z - WORLD_CURVE_START_Z));
              veh.root.position.set(veh.x, -curveY * curveDist * curveDist, veh.z);
              veh.root.rotation.x = Math.atan(2 * curveY * curveDist);
              veh.spinWheels(dt, slowSpeed);
            }
          }

          cameraTrauma = Math.max(0, cameraTrauma - 1.28 * dt);
          const shake = cameraTrauma * cameraTrauma;
          const shakeX = (Math.random() - 0.5) * shake * 0.92;
          const shakeY = (Math.random() - 0.5) * shake * 0.72;

          _camTargetPos.set(
            explosionOriginX * 0.65 + shakeX,
            2.45 + shakeY,
            4.95 + crashProgress * 0.55,
          );
          _camLookAt.set(explosionOriginX * 0.85, 1.05, 0.0);
          const camDamp = 1 - Math.exp(-9.0 * dt);
          camera.position.lerp(_camTargetPos, camDamp);
          currentCamLook.lerp(_camLookAt, camDamp);
          camera.lookAt(currentCamLook);
          camera.rotation.z = 0;

          if (crashTimer <= 0) {
            isCrashing = false;
            explosionGroup.visible = false;
            const finalSnap = buildHudSnapshot();
            onHudUpdateRef.current(finalSnap);
            onGameOverRef.current(finalSnap, activeCrashReason);
          }
        } else if (specialEndSequence !== 'none') {
          // =========================================================================
          // SEQUÊNCIAS ESPECIAIS DE FINALIZAÇÃO (ITENS 6, 7 & 9):
          // - 'wheelie_brawl': Caiu no Grau -> Caramelo pula em cima -> Nuvem de Pancadaria c/ POW! BAM! BIF!
          // - 'motoboy_backfall': Motoboy derrotado (0 vidas) cai de costas no chão c/ braços e pernas abertos
          // - 'caramelo_flop': Caramelo derrotado (0 vidas) rola cômico de barriga pra cima abanando as patinhas
          // - 'pizza_escape': Fim das Pizzas (8/8 entregues) -> Motoboy acelera e foge deixando o Caramelo pra trás!
          // =========================================================================
          specialEndClock += dt;
          atmosGroup.visible = false;
          carameloWarnRig.root.visible = false;
          dangerGroundStrip.root.visible = false;
          flyingPizzaBoxMesh.visible = false;
          clearHeadBanknotes();

          if (specialEndSequence === 'wheelie_brawl') {
            exhaustInstanced.visible = false;
            dirtInstanced.visible = false;
            if (playerMotoInstance) playerMotoInstance.root.visible = false;
            if (leadCaramelo) leadCaramelo.root.visible = false;
            brawlFinaleRig.root.visible = inspectedId === null;
            brawlFinaleRig.root.position.set(playerState.x, 0, 0);

            const cloudGrowth = THREE.MathUtils.lerp(
              0.62,
              1.68,
              Math.min(1, specialEndClock / 1.35),
            );
            const cloudFade = 1.0 - THREE.MathUtils.smoothstep(specialEndClock, 1.95, 2.35);
            brawlFinaleRig.dustCloudGroup.scale.setScalar(cloudGrowth);

            for (let p = 0; p < brawlFinaleRig.dustPuffs.length; p++) {
              const puff = brawlFinaleRig.dustPuffs[p];
              const ang = puff.orbitAngle + specialEndClock * puff.speed;
              const wobbleR = puff.orbitRadius * (0.85 + 0.25 * Math.sin(specialEndClock * 15.0 + p));
              puff.group.position.set(
                Math.cos(ang) * wobbleR,
                puff.orbitHeight + Math.abs(Math.sin(specialEndClock * 16.0 + p * 1.3)) * 0.28,
                Math.sin(ang) * wobbleR * 0.82,
              );
              const sPulse = puff.baseScale * (0.92 + 0.22 * Math.sin(specialEndClock * 20.0 + p));
              puff.group.scale.setScalar(sPulse);
              puff.mat.opacity = cloudFade;
              puff.outMat.opacity = cloudFade;
            }
            for (let s = 0; s < brawlFinaleRig.comicSpikes.length; s++) {
              const sp = brawlFinaleRig.comicSpikes[s];
              const sAng = (s / brawlFinaleRig.comicSpikes.length) * Math.PI * 2 + specialEndClock * 6.5;
              const pop = Math.max(0, Math.sin(specialEndClock * 18.0 + s * 2.1)) * cloudFade;
              sp.position.set(
                Math.cos(sAng) * 1.15,
                0.75 + Math.sin(specialEndClock * 12.0 + s) * 0.38,
                Math.sin(sAng) * 0.95,
              );
              sp.rotation.set(specialEndClock * 9.0, sAng, specialEndClock * 7.0);
              sp.scale.setScalar(0.5 + pop * 1.35);
            }
            for (let k = 0; k < brawlFinaleRig.flyingParts.length; k++) {
              const part = brawlFinaleRig.flyingParts[k];
              const st = brawlPartState[k];
              if (!st.launched) {
                if (specialEndClock >= st.launchDelay) {
                  st.launched = true;
                  part.group.visible = true;
                  cameraTrauma = Math.max(cameraTrauma, 0.35);
                } else {
                  continue;
                }
              }
              st.vy -= 21.5 * dt;
              st.x += st.vx * dt;
              st.y += st.vy * dt;
              st.z += st.vz * dt;
              if (st.y < part.radius) {
                st.y = part.radius;
                st.vy = Math.abs(st.vy) * part.restitution;
                st.vx *= 0.85;
                st.vz *= 0.85;
              }
              part.group.position.set(st.x, st.y, st.z);
              part.group.rotation.x += st.rx * dt;
              part.group.rotation.y += st.ry * dt;
              part.group.rotation.z += st.rz * dt;
            }

            _camTargetPos.set(playerState.x * 0.55, 2.25, 3.15);
            _camLookAt.set(playerState.x * 0.85, 0.92, 0);
            camera.position.lerp(_camTargetPos, 1 - Math.exp(-8 * dt));
            currentCamLook.lerp(_camLookAt, 1 - Math.exp(-8 * dt));
            camera.lookAt(currentCamLook);

            if (specialEndClock >= 2.35) {
              brawlFinaleRig.root.visible = false;
              specialEndSequence = 'none';
              const finalSnap = buildHudSnapshot();
              onHudUpdateRef.current(finalSnap);
              onGameOverRef.current(finalSnap, specialEndReason);
            }
          } else if (specialEndSequence === 'motoboy_backfall') {
            // Item 7: Motoboy cai esparramado de costas no chão com braços e pernas abertos (Referência 2!)
            exhaustInstanced.visible = false;
            dirtInstanced.visible = false;
            brawlFinaleRig.root.visible = false;
            const fallProgress = Math.min(1, specialEndClock / 0.42);
            if (playerMotoInstance) {
              playerMotoInstance.root.visible = true;
              playerMotoInstance.root.position.set(playerState.x, 0, 0);
              playerMotoInstance.setRiderDamageFlash(0);
              playerMotoInstance.setRiderKnockoutFall(fallProgress);
            }
            if (leadCaramelo) {
              leadCaramelo.root.visible = true;
              leadCaramelo.root.position.set(
                playerState.x + 1.15,
                Math.abs(Math.sin(specialEndClock * 11.0)) * 0.22,
                0.65,
              );
              leadCaramelo.update(dt, 4.0, 0, 0, false);
            }
            _camTargetPos.set(playerState.x * 0.65, 2.55, 2.85);
            _camLookAt.set(playerState.x * 0.85, 0.45, 0.45);
            camera.position.lerp(_camTargetPos, 1 - Math.exp(-8 * dt));
            currentCamLook.lerp(_camLookAt, 1 - Math.exp(-8 * dt));
            camera.lookAt(currentCamLook);

            if (specialEndClock >= 1.95) {
              playerMotoInstance?.setRiderKnockoutFall(0);
              specialEndSequence = 'none';
              const finalSnap = buildHudSnapshot();
              onHudUpdateRef.current(finalSnap);
              onGameOverRef.current(finalSnap, specialEndReason);
            }
          } else if (specialEndSequence === 'caramelo_flop') {
            // Item 7: Derrota cômica própria e exclusiva do Caramelo (nunca reutiliza a do Motoboy!)
            exhaustInstanced.visible = false;
            dirtInstanced.visible = false;
            brawlFinaleRig.root.visible = false;
            if (playerMotoInstance) {
              playerMotoInstance.root.visible = true;
              aiMotoZ -= 14.0 * dt;
              playerMotoInstance.root.position.set(aiMotoX, 0, aiMotoZ);
            }
            if (leadCaramelo) {
              leadCaramelo.root.visible = true;
              leadCaramelo.root.position.set(playerState.x, 0, 0);
              leadCaramelo.setDefeatPose(Math.min(1, specialEndClock / 0.38));
              leadCaramelo.update(dt, 0, 0, 0, false);
            }
            _camTargetPos.set(playerState.x * 0.65, 1.95, 2.55);
            _camLookAt.set(playerState.x * 0.85, 0.42, 0.0);
            camera.position.lerp(_camTargetPos, 1 - Math.exp(-8 * dt));
            currentCamLook.lerp(_camLookAt, 1 - Math.exp(-8 * dt));
            camera.lookAt(currentCamLook);

            if (specialEndClock >= 1.9) {
              leadCaramelo?.setDefeatPose(0);
              specialEndSequence = 'none';
              const finalSnap = buildHudSnapshot();
              onHudUpdateRef.current(finalSnap);
              onGameOverRef.current(finalSnap, specialEndReason);
            }
          } else if (specialEndSequence === 'pizza_escape') {
            // Item 9: Fim das Pizzas! Motoboy percebe que entregou tudo, empina e acelera fugindo do Caramelo!
            brawlFinaleRig.root.visible = false;
            escapeBikeZ -= 21.5 * dt;
            const escapeWheelie = Math.min(0.46, specialEndClock * 1.15) * Math.max(0, 1 - specialEndClock * 0.35);
            if (playerMotoInstance) {
              playerMotoInstance.root.visible = true;
              const cDist = Math.max(0, -(escapeBikeZ - WORLD_CURVE_START_Z));
              const cY = -worldCurveUniforms.uWorldCurveY.value * cDist * cDist;
              playerMotoInstance.root.position.set(playerState.x, cY, escapeBikeZ);
              playerMotoInstance.update(dt, playerState.speed * 1.65, 0, escapeWheelie);
            }
            if (leadCaramelo) {
              leadCaramelo.root.visible = true;
              // Caramelo fica pra trás na poeira dando pulinhos cômicos de frustração!
              const dogFrustratedHop = Math.abs(Math.sin(specialEndClock * 12.0)) * 0.28;
              leadCaramelo.root.position.set(playerState.x, dogFrustratedHop, 1.65);
              leadCaramelo.update(dt, 6.0, Math.sin(specialEndClock * 10.0) * 0.25, dogFrustratedHop, false);
            }
            _camTargetPos.set(playerState.x * 0.5, 2.25, 4.45);
            _camLookAt.set(playerState.x * 0.5, 1.15, Math.max(-28, escapeBikeZ));
            camera.position.lerp(_camTargetPos, 1 - Math.exp(-7 * dt));
            currentCamLook.lerp(_camLookAt, 1 - Math.exp(-7 * dt));
            camera.lookAt(currentCamLook);

            if (specialEndClock >= 2.35) {
              specialEndSequence = 'none';
              sound.playWin();
              const finalSnap = buildHudSnapshot();
              onHudUpdateRef.current(finalSnap);
              onGameOverRef.current(finalSnap, specialEndReason);
            }
          }
        } else {
          waterSplashInstanced.visible = inspectedId === null;
          let effectiveGroundSpeed = playerState.speed;

          if (hitstopTimer > 0) {
            hitstopTimer = Math.max(0, hitstopTimer - dt);
          } else {
            // Atualiza Timers de Mordida, Piscar Vermelho de Dano, Turbo de Carne e Fuga do Motoboy IA
            biteCooldownTimer = Math.max(0, biteCooldownTimer - simDt);
            carameloBiteLungeTimer = Math.max(0, carameloBiteLungeTimer - simDt);
            biteStrikeTimer = Math.max(0, biteStrikeTimer - simDt);
            riderDamageFlashTimer = Math.max(0, riderDamageFlashTimer - simDt);
            meatBoostTimer = Math.max(0, meatBoostTimer - simDt);
            aiMotoEscapeTimer = Math.max(0, aiMotoEscapeTimer - simDt);

            if (playerMotoInstance) {
              const flashAmt =
                riderDamageFlashTimer > 0
                  ? Math.sin(riderDamageFlashTimer * 38.0) > -0.15
                    ? 1.0
                    : 0.22
                  : 0.0;
              playerMotoInstance.setRiderDamageFlash(flashAmt);
            }

            const inBrawlFinale =
              !isMotoMode &&
              (carameloBitePhase === 'brawl_leap' || carameloBitePhase === 'brawl_cloud');

            // Item 10: Alimenta direção contínua analógica/suave na física da moto
            const prevPosX = playerState.x;
            playerState.steerInput = inBrawlFinale
              ? 0
              : (keysDown.right ? 1 : 0) - (keysDown.left ? 1 : 0);
            playerState = stepPlayerPhysics(playerState, simDt, difficultyRef.current);

            // Suporte contínuo para transição e navegação fluida entre as 3 ruas (segurar tecla ou botão touch!)
            if (!inBrawlFinale && keysDown.left) {
              holdSteerTimer += dt;
              if (holdSteerTimer > 0.185 && playerState.lane > -1) {
                doShiftLeft();
                holdSteerTimer = 0;
              }
            } else if (!inBrawlFinale && keysDown.right) {
              holdSteerTimer += dt;
              if (holdSteerTimer > 0.185 && playerState.lane < 1) {
                doShiftRight();
                holdSteerTimer = 0;
              }
            } else {
              holdSteerTimer = 0;
            }

            const lateralVx = (playerState.x - prevPosX) / Math.max(0.001, dt);
            steerVelocityX = THREE.MathUtils.lerp(steerVelocityX, lateralVx, Math.min(1, 16.0 * dt));

            // Estamina e Turbo de Carne Vermelha no Modo Caramelo (desacelera de volta ao normal suavemente!)
            if (!isMotoMode) {
              if (meatBoostTimer > 0) {
                carameloStamina = 100;
              } else {
                carameloStamina = Math.max(18, carameloStamina - dt * 3.1);
              }
            }
            const meatSpeedBonus =
              !isMotoMode && meatBoostTimer > 0 ? 7.6 * Math.min(1, meatBoostTimer / 0.85) : 0;

            // Item 6: A partir de <= 5 vidas do Motoboy, aumenta moderada e gradualmente o ritmo da perseguição!
            const carameloEndgameFactor =
              !isMotoMode && aiMotoHp <= 5 ? (6 - Math.max(1, aiMotoHp)) / 5 : 0;
            const endgameSpeedBonus = !isMotoMode ? carameloEndgameFactor * 1.35 : 0;

            // Bônus leve de velocidade e pontuação enquanto sustenta o Grau na Moto!
            const grauSpeedBonus =
              isMotoMode && wheelieAngle > 0.18 ? 1.8 * Math.min(1, wheelieAngle / 0.56) : 0;
            if (isMotoMode && wheelieAngle > 0.2) {
              playerState.score += 18 * playerState.combo * dt;
            }
            const brawlBrakeFactor =
              !isMotoMode && carameloBitePhase === 'brawl_cloud'
                ? Math.max(0, 1.0 - brawlClock * 3.2)
                : !isMotoMode && carameloBitePhase === 'brawl_leap'
                ? 0.65
                : 1.0;
            effectiveGroundSpeed =
              (playerState.speed + grauSpeedBonus + meatSpeedBonus + endgameSpeedBonus) *
              brawlBrakeFactor;
            const moveZ = effectiveGroundSpeed * simDt;

            // Movimento 1:1 cravado no asfalto e na calçada (15.0m exatos por tile da rua e 8.333m da calçada!)
            roadTex.offset.y = (roadTex.offset.y + computeRoadTextureOffsetDelta(moveZ, 15.0)) % 1;
            roadBumpTex.offset.y = roadTex.offset.y;
            sidewalkTex.offset.y =
              (sidewalkTex.offset.y + computeRoadTextureOffsetDelta(moveZ, 150.0 / 18.0)) % 1;

            // Recycle physical 3D lane reflector studs & curb joints immediately when passing gameplay
            for (const row of streetMotionRows) {
              row.z += moveZ;
              if (row.z > BEHIND_GAMEPLAY_CULL_Z) {
                row.z -= NUM_STREET_MOTION_ROWS * STREET_MOTION_STEP_Z;
              }
              row.mesh.position.z = row.z;
            }

            // Recycle the 30 Brazilian house variations when completely behind the camera (z > 14.5)
            for (const slot of activeHouseSlots) {
              slot.z += moveZ;
              if (slot.z > BEHIND_GAMEPLAY_CULL_Z) {
                scene.remove(slot.leftMesh);
                scene.remove(slot.rightMesh);
                slot.z -= NUM_HOUSE_PAIRS * HOUSE_SLOT_STEP_Z;
                slot.leftVarIndex = nextHouseSeq % 30;
                slot.rightVarIndex = (nextHouseSeq + 1) % 30;
                nextHouseSeq += 2;
                slot.leftMesh = leftHousePool[slot.leftVarIndex].clone();
                slot.rightMesh = rightHousePool[slot.rightVarIndex].clone();
                applyHouseDistanceOpacity(slot.leftMesh, 0.0);
                applyHouseDistanceOpacity(slot.rightMesh, 0.0);
                slot.leftMesh.visible = false;
                slot.rightMesh.visible = false;
                mountSlotMeshes(slot);
                playerState.housesPassed += 2;
              } else {
                slot.leftMesh.position.z = slot.z;
                slot.rightMesh.position.z = slot.z;
              }
            }

            // Recycle sidewalk utility poles when behind camera (z > 14.5)
            for (const pair of polePairs) {
              pair.z += moveZ;
              if (pair.z > BEHIND_GAMEPLAY_CULL_Z) {
                pair.z -= NUM_POLE_PAIRS * POLE_STEP_Z;
              }
              pair.leftPole.position.z = pair.z;
              pair.rightPole.position.z = pair.z;
            }

            // Recycle sparse sidewalk Brazilian Orelhões when behind camera (z > 14.5)
            for (const oPair of orelhaoPairs) {
              oPair.z += moveZ;
              if (oPair.z > BEHIND_GAMEPLAY_CULL_Z) {
                oPair.z -= NUM_ORELHAO_PAIRS * ORELHAO_STEP_Z;
              }
              oPair.leftOrelhao.position.z = oPair.z;
              oPair.rightOrelhao.position.z = oPair.z;
            }

            // Recycle roadside "SEU ANÚNCIO AQUI!" Outdoor Billboards independently per side when behind camera (z > 14.5)
            for (const bPair of billboardPairs) {
              bPair.leftZ += moveZ;
              if (bPair.leftZ > BEHIND_GAMEPLAY_CULL_Z) {
                bPair.leftZ -= NUM_BILLBOARD_PAIRS * BILLBOARD_STEP_Z;
              }
              bPair.rightZ += moveZ;
              if (bPair.rightZ > BEHIND_GAMEPLAY_CULL_Z) {
                bPair.rightZ -= NUM_BILLBOARD_PAIRS * BILLBOARD_STEP_Z;
              }
              bPair.leftBillboard.position.z = bPair.leftZ;
              bPair.rightBillboard.position.z = bPair.rightZ;
            }

            // Recycle sparse sidewalk Caramelos (Item 11: apenas 2 unidades isoladas, abanando o rabo!)
            for (let s = 0; s < sidewalkCaramelos.length; s++) {
              const sc = sidewalkCaramelos[s];
              sc.z += moveZ;
              if (sc.z > BEHIND_GAMEPLAY_CULL_Z) {
                sc.z -= NUM_SIDEWALK_DOGS * SIDEWALK_DOG_STEP_Z;
              }
              sc.root.position.z = sc.z;
              sc.tailPivot.rotation.z = Math.sin(elapsed * 7.8 + s * 2.1) * 0.36;
            }

            // Recycle hillside favela clusters immediately when passing gameplay (z > 3.8)
            for (const fPair of favelaPairs) {
              fPair.z += moveZ;
              if (fPair.z > BEHIND_GAMEPLAY_CULL_Z) {
                fPair.z -= NUM_FAVELA_PAIRS * FAVELA_STEP_Z;
              }
              fPair.leftFavela.position.z = fPair.z;
              fPair.rightFavela.position.z = fPair.z;
            }

            // Atualiza Linhas de Velocidade Vivas (High/Ultra + Turbo de Carne)
            atmosGroup.visible =
              (showAtmosphericParticles || meatBoostTimer > 0) && inspectedId === null;
            if (atmosGroup.visible) {
              for (let i = 0; i < speedStreaks.length; i++) {
                const st = speedStreaks[i];
                st.z += moveZ * st.speedFactor * (meatBoostTimer > 0 ? 1.35 : 1.0);
                if (st.z > 6.5) {
                  st.z -= 76.0;
                }
                st.mesh.position.set(st.x + playerState.x * 0.25, st.y, st.z);
              }
            }

            const curveY = worldCurveUniforms.uWorldCurveY.value;
            const maxVisibleVehicleZ = -138.0 * Math.max(0.82, activeCullScale);

            // =========================================================================
            // ITEM 3: COLETÁVEIS COM ATRAÇÃO MAGNÉTICA E SEM BARRAS/FAIXAS PRETAS!
            // =========================================================================
            if (isMotoMode) {
              cashSpawnTimer -= simDt;
              if (cashSpawnTimer <= 0) {
                spawnStreetCashStack();
                cashSpawnTimer = 0.62 + Math.random() * 0.45;
              }

              for (let i = 0; i < cashStackPool.length; i++) {
                const stack = cashStackPool[i];
                if (!stack.inUse) continue;
                stack.z += moveZ;
                if (stack.z > 4.2 && !stack.attracting) {
                  eraseCashStack(stack);
                  continue;
                }

                // Atração magnética suave quando o Motoboy se aproxima da nota!
                if (
                  !stack.attracting &&
                  stack.z >= -5.6 &&
                  stack.z <= 1.8 &&
                  Math.abs(playerState.x - stack.x) < 2.35 &&
                  playerState.y < 1.8
                ) {
                  stack.attracting = true;
                }

                if (stack.attracting) {
                  const pullLerp = Math.min(1, 18.5 * simDt);
                  stack.x = THREE.MathUtils.lerp(stack.x, playerState.x, pullLerp);
                  stack.z = THREE.MathUtils.lerp(stack.z, 0.0, pullLerp);
                  stack.y = THREE.MathUtils.lerp(stack.y, playerState.y + 0.86, pullLerp);
                }

                const cDist = Math.max(0, -(stack.z - WORLD_CURVE_START_Z));
                const rY = -curveY * cDist * cDist + (stack.attracting ? stack.y : 0);
                stack.mesh.position.set(stack.x, rY, stack.z);
                stack.mesh.rotation.x = Math.atan(2 * curveY * cDist);
                stack.mesh.visible = stack.z >= maxVisibleVehicleZ && inspectedId === null;

                if (stack.spinHolder) {
                  const spinRate = stack.attracting ? 14.0 : 2.5;
                  stack.spinHolder.rotation.y += spinRate * simDt;
                  stack.spinHolder.position.y = stack.attracting
                    ? 0.15
                    : 0.5 + Math.sin(elapsed * 4.4 + stack.phaseOffset) * 0.075;
                }

                // Coleta magnética sem faixas ou barras pretas acima da cabeça!
                if (
                  (stack.attracting &&
                    Math.abs(playerState.x - stack.x) < 0.72 &&
                    Math.abs(stack.z) < 0.95) ||
                  (Math.abs(playerState.x - stack.x) < 1.18 &&
                    Math.abs(stack.z) < 1.32 &&
                    playerState.y < 1.58)
                ) {
                  const collectedDenom = stack.denomination;
                  const sx = stack.x;
                  const sz = stack.z;
                  eraseCashStack(stack);
                  sound.playCashMagnetCollect(collectedDenom);
                  triggerCashPickupBurst(sx, 0.68, sz, collectedDenom);
                  playerMotoInstance?.triggerRiderCashFlash(getDenomVisualHex(collectedDenom), 0.75);
                  cameraTrauma = Math.max(cameraTrauma, collectedDenom >= 100 ? 0.09 : 0.04);
                  playerState = {
                    ...playerState,
                    coins: playerState.coins + 1,
                    score: playerState.score + collectedDenom * 2 * playerState.combo,
                  };
                  onCashCollectedRef.current?.(collectedDenom, collectedDenom);
                  emitHud(true);
                }
              }

              // =========================================================================
              // ITEM 8 & 9: ZONAS VERDES DE ENTREGA DE PIZZA NAS CASAS DOS DOIS LADOS
              // =========================================================================
              let foundZoneIdx = -1;
              let foundZoneSide: 'left' | 'right' | null = null;

              for (let i = 0; i < pizzaZonePool.length; i++) {
                const pz = pizzaZonePool[i];
                pz.z += moveZ;
                if (pz.z > BEHIND_GAMEPLAY_CULL_Z) {
                  pz.z -= pizzaZonePool.length * PIZZA_ZONE_STEP_Z;
                  pz.delivered = false;
                  pz.happyJumpTimer = 0;
                  pz.rig.orderBadgeMesh.visible = true;
                  pz.rig.deliveredBadgeMesh.visible = false;
                  pz.rig.floorZoneGroup.visible = true;
                }

                const pzCurveDist = Math.max(0, -(pz.z - WORLD_CURVE_START_Z));
                const pzRoadY = -curveY * pzCurveDist * pzCurveDist;
                pz.rig.root.position.set(0, pzRoadY, pz.z);
                pz.rig.root.rotation.x = Math.atan(2 * curveY * pzCurveDist);
                pz.rig.root.visible =
                  pz.z >= maxVisibleVehicleZ && inspectedId === null && pizzasLeft > 0;

                // Pulso luminoso da área verde no chão
                const greenPulse = 0.5 + 0.5 * Math.sin(elapsed * 8.5 + i * 1.4);
                pz.rig.floorFillMat.opacity = pz.delivered ? 0.12 : 0.34 + greenPulse * 0.34;
                pz.rig.floorBorderMat.opacity = pz.delivered ? 0.25 : 0.65 + greenPulse * 0.35;

                // Animação do cliente NPC acenando ou comemorando a entrega!
                if (pz.happyJumpTimer > 0) {
                  pz.happyJumpTimer = Math.max(0, pz.happyJumpTimer - simDt);
                  pz.rig.npcGroup.position.y =
                    0.22 + Math.abs(Math.sin(pz.happyJumpTimer * 16.0)) * 0.42;
                  pz.rig.wavingArmPivot.rotation.z =
                    (pz.side === 'left' ? -1 : 1) * (2.5 + Math.sin(elapsed * 22.0) * 0.35);
                } else {
                  pz.rig.npcGroup.position.y = 0.22;
                  pz.rig.wavingArmPivot.rotation.z =
                    (pz.side === 'left' ? -1 : 1) * (2.15 + Math.sin(elapsed * 6.5 + i) * 0.32);
                }

                // Verifica se o Motoboy está na área verde de entrega (ou se aproximando dela na faixa certa)
                if (
                  !pz.delivered &&
                  pizzasLeft > 0 &&
                  pz.z >= -8.2 &&
                  pz.z <= 3.4 &&
                  Math.abs(playerState.x - pz.x) < 2.45
                ) {
                  foundZoneIdx = i;
                  foundZoneSide = pz.side;

                  // Se o Motoboy passar diretamente por cima do tapete verde e ainda não clicou, lança a pizza fluindo com uma mão!
                  if (
                    !flyingPizzaState.active &&
                    pz.z >= -0.85 &&
                    pz.z <= 2.25 &&
                    Math.abs(playerState.x - pz.x) < 1.85
                  ) {
                    triggerPizzaThrowToZone(i);
                  }
                }
              }

              const prevInZone = inDeliveryZone;
              inDeliveryZone = foundZoneIdx >= 0 && !flyingPizzaState.active && pizzasLeft > 0;
              deliveryZoneSide = foundZoneSide;
              activeDeliveryZoneIdx = foundZoneIdx;
              if (prevInZone !== inDeliveryZone) {
                emitHud(true);
              }

              // Animação parabólica da Caixa de Pizza 3D voando até o NPC cliente!
              if (flyingPizzaState.active) {
                flyingPizzaState.age += simDt;
                const u = Math.min(1, flyingPizzaState.age / flyingPizzaState.duration);
                const curX = THREE.MathUtils.lerp(
                  flyingPizzaState.startX,
                  flyingPizzaState.endX,
                  u,
                );
                const curZ = THREE.MathUtils.lerp(
                  flyingPizzaState.startZ,
                  flyingPizzaState.endZ,
                  u,
                );
                const curY =
                  THREE.MathUtils.lerp(flyingPizzaState.startY, flyingPizzaState.endY, u) +
                  Math.sin(u * Math.PI) * 1.35;
                flyingPizzaBoxMesh.position.set(curX, curY, curZ);
                flyingPizzaBoxMesh.rotation.y += 14.0 * simDt;
                flyingPizzaBoxMesh.rotation.z =
                  (flyingPizzaState.endX < 0 ? 1 : -1) * Math.sin(u * Math.PI) * 0.45;

                if (u >= 1) {
                  flyingPizzaState.active = false;
                  flyingPizzaBoxMesh.visible = false;
                  const targetZone = pizzaZonePool[flyingPizzaState.targetZoneIdx];
                  if (targetZone) {
                    targetZone.happyJumpTimer = 1.15;
                    targetZone.rig.orderBadgeMesh.visible = false;
                    targetZone.rig.deliveredBadgeMesh.visible = true;
                  }
                  pizzasDelivered += 1;
                  lastPizzaDeliveredNonce += 1;
                  sound.playPizzaDeliveredChime();
                  triggerCustomColorBurst(
                    flyingPizzaState.endX,
                    flyingPizzaState.endY + 0.4,
                    flyingPizzaState.endZ,
                    0x22c55e,
                    0xfacc15,
                    18,
                  );
                  const nextCombo = Math.min(10, playerState.combo + 1);
                  playerState = {
                    ...playerState,
                    coins: playerState.coins + 3,
                    combo: nextCombo,
                    score: playerState.score + 350 * nextCombo,
                  };
                  onCashCollectedRef.current?.(150, 100);
                  emitHud(true);

                  // Item 9: Quando as pizzas acabam (0 restantes), inicia a Fuga Cinematográfica do Motoboy!
                  if (pizzasLeft <= 0 && specialEndSequence === 'none') {
                    specialEndSequence = 'pizza_escape';
                    specialEndClock = 0;
                    escapeBikeZ = 0;
                    specialEndReason = 'MISSÃO CONCLUÍDA! Todas as Pizzas Entregues!';
                    sound.playCartoonDodgeSuccess();
                    emitHud(true);
                  }
                }
              }
            } else {
              // Oculta zonas de pizza no Modo Caramelo
              flyingPizzaBoxMesh.visible = false;
              for (let i = 0; i < pizzaZonePool.length; i++) {
                pizzaZonePool[i].rig.root.visible = false;
              }

              // Modo Caramelo: Ossos Brancos Cartoon com Atração Magnética + Carne Vermelha Estratégica!
              boneSpawnTimer -= simDt;
              if (boneSpawnTimer <= 0) {
                spawnStreetWhiteBones();
                boneSpawnTimer = 0.62 + Math.random() * 0.44;
              }

              for (let i = 0; i < whiteBonePool.length; i++) {
                const b = whiteBonePool[i];
                if (!b.inUse) continue;
                b.z += moveZ;
                if (b.z > 4.2 && !b.attracting) {
                  eraseWhiteBone(b);
                  continue;
                }

                if (
                  !b.attracting &&
                  b.z >= -5.6 &&
                  b.z <= 1.8 &&
                  Math.abs(playerState.x - b.x) < 2.35 &&
                  playerState.y < 1.8
                ) {
                  b.attracting = true;
                }

                if (b.attracting) {
                  const pullLerp = Math.min(1, 18.5 * simDt);
                  b.x = THREE.MathUtils.lerp(b.x, playerState.x, pullLerp);
                  b.z = THREE.MathUtils.lerp(b.z, 0.0, pullLerp);
                  b.y = THREE.MathUtils.lerp(b.y, playerState.y + 0.62, pullLerp);
                }

                const cDist = Math.max(0, -(b.z - WORLD_CURVE_START_Z));
                const rY = -curveY * cDist * cDist + (b.attracting ? b.y : 0);
                b.root.position.set(b.x, rY, b.z);
                b.root.rotation.x = Math.atan(2 * curveY * cDist);
                b.root.visible = b.z >= maxVisibleVehicleZ && inspectedId === null;

                b.spinVisual.rotation.y += (b.attracting ? 15.0 : 2.8) * simDt;
                b.spinVisual.position.y = b.attracting
                  ? 0.12
                  : 0.5 + Math.sin(elapsed * 4.6 + b.phaseOffset) * 0.08;

                // Coleta magnética do Osso Branco: desaparece com partículas + som específico!
                if (
                  (b.attracting &&
                    Math.abs(playerState.x - b.x) < 0.75 &&
                    Math.abs(b.z) < 0.95) ||
                  (Math.abs(playerState.x - b.x) < 1.25 &&
                    Math.abs(b.z) < 1.45 &&
                    playerState.y < 1.6)
                ) {
                  const bx = b.x;
                  const bz = b.z;
                  eraseWhiteBone(b);
                  sound.playBoneMagnetCollect();
                  leadCaramelo?.triggerBonePuff();
                  triggerCustomColorBurst(bx, 0.56, bz, 0xfefce8, 0xfde047, 12);
                  bonesCollectedRun += 1;
                  carameloStamina = Math.min(100, carameloStamina + 7);
                  chasePressure = Math.min(1, chasePressure + 0.06);
                  playerState = {
                    ...playerState,
                    coins: playerState.coins + 1,
                    score: playerState.score + 85 * playerState.combo,
                  };
                  onBoneCollectedRef.current?.(40, 'bone');
                  emitHud(true);
                }
              }

              meatSpawnTimer -= simDt;
              if (meatSpawnTimer <= 0) {
                spawnStreetRedMeat();
                meatSpawnTimer = 9.2 + Math.random() * 4.5;
              }

              for (let i = 0; i < redMeatPool.length; i++) {
                const m = redMeatPool[i];
                if (!m.inUse) continue;
                m.z += moveZ;
                if (m.z > 4.2) {
                  eraseRedMeat(m);
                  continue;
                }

                const cDist = Math.max(0, -(m.z - WORLD_CURVE_START_Z));
                const rY = -curveY * cDist * cDist;
                m.root.position.set(m.x, rY, m.z);
                m.root.rotation.x = Math.atan(2 * curveY * cDist);
                m.root.visible = m.z >= maxVisibleVehicleZ && inspectedId === null;

                m.spinVisual.rotation.y = elapsed * 2.2 + m.phaseOffset;
                m.spinVisual.position.y =
                  0.55 + Math.sin(elapsed * 4.0 + m.phaseOffset) * 0.09;

                // Coleta da Carne Vermelha: Estamina 100% + Forte Aumento Temporário de Velocidade!
                if (
                  Math.abs(playerState.x - m.x) < 1.32 &&
                  Math.abs(m.z) < 1.5 &&
                  playerState.y < 1.65
                ) {
                  const mx = m.x;
                  const mz = m.z;
                  eraseRedMeat(m);
                  carameloStamina = 100;
                  meatBoostTimer = 4.2;
                  chasePressure = Math.min(1, chasePressure + 0.36);
                  sound.playMeatPowerup();
                  sound.playCustomBark();
                  triggerCustomColorBurst(mx, 0.62, mz, 0xdc2626, 0xfde047, 16);
                  cameraTrauma = Math.max(cameraTrauma, 0.28);
                  playerState = {
                    ...playerState,
                    coins: playerState.coins + 2,
                    score: playerState.score + 220 * playerState.combo,
                  };
                  onBoneCollectedRef.current?.(90, 'meat');
                  emitHud(true);
                }
              }
            }

            updateCashPickupBurst(simDt);
            clearHeadBanknotes();

            // Spawn, Animação e Colisão das Tampas de Bueiro Explosivas (! Vermelho -> Tampa Voa -> Jato de Água Cinematográfico!)
            if (playerState.invulnerableTimer > 0) {
              playerState.invulnerableTimer = Math.max(0, playerState.invulnerableTimer - simDt);
            }

            manholeSpawnTimer -= simDt;
            if (manholeSpawnTimer <= 0) {
              spawnStreetManholeHazard();
              const diffInterval =
                difficultyRef.current === 'hard'
                  ? 3.8
                  : difficultyRef.current === 'medium'
                  ? 4.8
                  : 6.0;
              manholeSpawnTimer = diffInterval + Math.random() * 2.2;
            }

            for (let i = 0; i < manholePool.length; i++) {
              const mh = manholePool[i];
              if (!mh.inUse) continue;
              mh.z += moveZ;

              if (mh.z > 5.0) {
                eraseManhole(mh);
                continue;
              }

              const mhCurveDist = Math.max(0, -(mh.z - WORLD_CURVE_START_Z));
              const mhRoadY = -curveY * mhCurveDist * mhCurveDist;
              mh.rig.root.position.set(mh.x, mhRoadY, mh.z);
              mh.rig.root.rotation.x = Math.atan(2 * curveY * mhCurveDist);
              mh.rig.root.visible = mh.z >= maxVisibleVehicleZ && inspectedId === null;

              // Quando o motoboy/Caramelo chega perto (z >= -25m), a tampa explode voando e o jato de água estoura!
              if (!mh.erupted && mh.z >= -25.0) {
                mh.erupted = true;
                mh.eruptAge = 0;
                mh.rig.exclamationGroup.visible = false;
                mh.rig.geyserGroup.visible = true;
                mh.lidVx = (mh.lane === 0 ? (Math.random() < 0.5 ? -1 : 1) : -mh.lane) * 2.6;
                mh.lidVy = 11.8;
                mh.lidVz = -1.8;
                mh.lidSpinX = 11.5;
                mh.lidSpinZ = -9.2;
                sound.playWaterGeyserBurst();
                emitDirectionalWaterSplash(
                  mh.x,
                  mhRoadY + 0.45,
                  mh.z,
                  effectiveGroundSpeed * 0.4,
                  0,
                  14
                );
              }

              if (!mh.erupted) {
                // Pulso urgente do Ponto de Exclamação Vermelho (!) + Anel de Perigo no Asfalto
                const warnPulse = 1 + Math.sin(elapsed * 11.0 + i) * 0.18;
                mh.rig.exclamationGroup.position.y =
                  1.48 + Math.abs(Math.sin(elapsed * 7.5 + i)) * 0.34;
                mh.rig.exclamationGroup.scale.setScalar(warnPulse);
                mh.rig.exclamationGroup.rotation.y = Math.sin(elapsed * 4.5 + i) * 0.35;
                mh.rig.warningRing.scale.setScalar(0.95 + Math.sin(elapsed * 9.5) * 0.12);
              } else {
                mh.eruptAge += simDt;

                // 1) Física da tampa de ferro voando e girando pelos ares!
                if (mh.lidY > -1.5) {
                  mh.lidVy -= 24.0 * simDt;
                  mh.lidX += mh.lidVx * simDt;
                  mh.lidY += mh.lidVy * simDt;
                  mh.lidZ += mh.lidVz * simDt;
                  mh.rig.lidGroup.position.set(mh.lidX, Math.max(0.04, mh.lidY), mh.lidZ);
                  mh.rig.lidGroup.rotation.x += mh.lidSpinX * simDt;
                  mh.rig.lidGroup.rotation.z += mh.lidSpinZ * simDt;
                }

                // 2) Jato de Água Cinematográfico jorrando alto e espirrando gotas translúcidas iluminadas!
                const rise = Math.min(1, mh.eruptAge * 6.5);
                const jetHeight = (2.65 + Math.sin(elapsed * 18.0 + i) * 0.28) * rise;
                const jetWidth = 0.92 + Math.cos(elapsed * 21.0 + i) * 0.12;
                mh.rig.coreColumn.scale.set(jetWidth, Math.max(0.1, jetHeight), jetWidth);
                mh.rig.coreColumn.rotation.y = elapsed * 6.5;

                mh.rig.foamCrown.position.y = jetHeight;
                const crownScale = (0.95 + Math.sin(elapsed * 16.0) * 0.18) * rise;
                mh.rig.foamCrown.scale.setScalar(Math.max(0.05, crownScale));
                mh.rig.foamCrown.rotation.y = -elapsed * 5.0;

                const ringSplash = 0.85 + ((elapsed * 3.4) % 1.0) * 0.75;
                mh.rig.baseSplashRing.scale.setScalar(ringSplash);

                // Emite gotas 3D translúcidas de múltiplos tamanhos reagindo à velocidade e direção
                if (mh.z > -32.0 && mh.z < 3.5 && Math.random() < Math.min(0.85, simDt * 30.0)) {
                  emitDirectionalWaterSplash(
                    mh.x,
                    mhRoadY + jetHeight * 0.58,
                    mh.z,
                    effectiveGroundSpeed * 0.34,
                    steerVelocityX * 0.35,
                    2
                  );
                }

                // Ao passar próximo ou através do jato de água: respingos e desfoque cinematográfico na lente da câmera!
                if (
                  !mh.splashedLens &&
                  Math.abs(mh.z) < 2.25 &&
                  Math.abs(playerState.x - mh.x) < 2.35
                ) {
                  mh.splashedLens = true;
                  const directPass = Math.abs(playerState.x - mh.x) < 1.05;
                  emitDirectionalWaterSplash(
                    mh.x,
                    mhRoadY + 1.05,
                    mh.z,
                    effectiveGroundSpeed,
                    steerVelocityX,
                    directPass ? 22 : 14
                  );
                  cameraTrauma = Math.max(cameraTrauma, directPass ? 0.52 : 0.26);
                  onWaterJetSplashRef.current?.(directPass ? 1.0 : 0.68);
                }

                const drops = mh.rig.sideDroplets;
                for (let d = 0; d < drops.length; d++) {
                  const dropPhase = (mh.eruptAge * 2.35 + d * 0.1) % 1.0;
                  const angle = (d / drops.length) * Math.PI * 2 + 0.35;
                  const sideRadius = 0.32 + dropPhase * 1.65;
                  const arcY =
                    jetHeight * 0.68 +
                    dropPhase * 1.45 -
                    dropPhase * dropPhase * (jetHeight * 0.68 + 1.42);
                  drops[d].position.set(
                    Math.cos(angle) * sideRadius,
                    Math.max(0.08, arcY),
                    Math.sin(angle) * sideRadius * 0.75
                  );
                  const dScale = (1.0 - dropPhase * 0.55) * rise;
                  drops[d].scale.setScalar(Math.max(0.05, dScale));
                  drops[d].rotation.z = -Math.cos(angle) * dropPhase * 1.4;
                }

                // 3) Dano ao passar por cima do bueiro estourado: perde 1 vida!
                if (
                  !inBrawlFinale &&
                  !mh.damagedPlayer &&
                  playerState.invulnerableTimer <= 0 &&
                  Math.abs(playerState.x - mh.x) < 0.88 &&
                  Math.abs(mh.z) < 1.04 &&
                  playerState.y < 1.25
                ) {
                  mh.damagedPlayer = true;
                  const nextHp = Math.max(0, playerState.hp - 1);
                  if (nextHp <= 0) {
                    // Item 7: Derrota Cômica Específica por Modo (Motoboy cai de costas vs Caramelo flop)
                    playerState = { ...playerState, hp: 0 };
                    specialEndSequence = isMotoMode ? 'motoboy_backfall' : 'caramelo_flop';
                    specialEndClock = 0;
                    specialEndReason = 'Bueiro Estourado na Pista';
                    cameraTrauma = 1.15;
                    clearBikeParticles();
                    sound.playSplash();
                    if (isMotoMode) {
                      sound.playMotoboyFunnyScream();
                    } else {
                      sound.playCarameloComicalDefeat();
                    }
                    sound.setGameOverMuffledVolume();
                    emitHud(true);
                    break;
                  } else {
                    riderDamageFlashTimer = 0.62;
                    playerState = {
                      ...playerState,
                      hp: nextHp,
                      combo: 1,
                      invulnerableTimer: 1.5,
                    };
                    cameraTrauma = Math.max(cameraTrauma, 0.72);
                    sound.playSplash();
                    sound.playStumble();
                    emitHud(true);
                  }
                }
              }
            }

            updateWaterSplashParticles(simDt);

            // Spawn e Simulação dos 7 Veículos Ultra-Otimizados na CONTRAMÃO
            trafficSpawnTimer -= simDt;
            if (trafficSpawnTimer <= 0) {
              spawnOncomingTrafficWave();
            }

            for (let i = 0; i < trafficPool.length; i++) {
              const veh = trafficPool[i];
              if (!veh.inUse) continue;

              // Veículo vem de frente na contramão (+Z) somando velocidade dele com a da moto/Caramelo!
              const closingSpeed = effectiveGroundSpeed + veh.speedMs;
              veh.z += closingSpeed * simDt;

              // Apaga e remove imediatamente da cena (scene.remove) assim que passa da câmera!
              if (veh.z - veh.halfLength > 4.65) {
                eraseVehicleFromScene(veh);
                continue;
              }

              const curveDist = Math.max(0, -(veh.z - WORLD_CURVE_START_Z));
              const roadY = -curveY * curveDist * curveDist;
              veh.root.position.set(veh.x, roadY, veh.z);
              veh.root.rotation.x = Math.atan(2 * curveY * curveDist);
              veh.contactShadow.visible = showContactShadows;
              veh.root.visible = veh.z >= maxVisibleVehicleZ && inspectedId === null;
              veh.spinWheels(simDt, veh.speedMs);

              // Buzina de alerta quando o carro/ônibus se aproxima na mesma faixa
              const dx = Math.abs(playerState.x - veh.x);
              if (!veh.honked && veh.z > -36.0 && veh.z < -11.5 && dx < 1.35) {
                veh.honked = true;
                sound.playVehicleHonk(veh.def.kind === 'bus', 0.28);
              }

              // Checagem de Colisão Frontal / Lateral (com desvio anti-travamento lateral para o Caramelo!)
              const dz = Math.abs(veh.z);
              const playerHalfW = isMotoMode ? 0.36 : 0.28;
              const playerHalfL = isMotoMode ? 0.76 : 0.5;
              if (
                !inBrawlFinale &&
                dx < playerHalfW + veh.halfWidth * 0.82 &&
                dz < playerHalfL + veh.halfLength * 0.88 &&
                playerState.y < veh.height * 0.85
              ) {
                // Evita que o Caramelo fique preso na lateral de um veículo ao trocar de faixa!
                if (
                  !isMotoMode &&
                  dz < veh.halfLength * 0.7 &&
                  Math.abs(prevPosX - veh.x) >= playerHalfW + veh.halfWidth * 0.75
                ) {
                  const safeSign = prevPosX >= veh.x ? 1 : -1;
                  const safeLane: LaneIndex = prevPosX < -1.1 ? -1 : prevPosX > 1.1 ? 1 : 0;
                  playerState = {
                    ...playerState,
                    x: veh.x + safeSign * (veh.halfWidth + 0.56),
                    lane: safeLane,
                  };
                  cameraTrauma = Math.max(cameraTrauma, 0.24);
                  sound.playStumble();
                  continue;
                }

                // Item 7: Batidas de carro preservadas 100% intactas!
                isCrashing = true;
                crashTimer = CRASH_SEQUENCE_DURATION;
                activeCrashReason = veh.def.displayName;
                playerState = { ...playerState, hp: 0 };
                cameraTrauma = 1.45;
                if (playerMotoInstance) {
                  playerMotoInstance.root.visible = false;
                }
                if (leadCaramelo) {
                  leadCaramelo.root.visible = false;
                }
                clearBikeParticles();
                veh.root.rotation.z = THREE.MathUtils.clamp(
                  (playerState.x - veh.x) * 0.06,
                  -0.08,
                  0.08,
                );
                if (!isMotoMode) {
                  sound.playBark();
                }
                sound.playCrash();
                sound.setGameOverMuffledVolume();
                triggerCartoonExplosion(
                  playerState.x,
                  Math.max(0.68, playerState.y + 0.58),
                  0.25,
                );
                emitHud(true);
                break;
              }

              // Bônus de "Tirar Fina" (Near-Miss) ao passar raspando pelo carro/ônibus!
              if (veh.z > 1.35 && !veh.nearMissAwarded) {
                veh.nearMissAwarded = true;
                if (dx < 3.55) {
                  const nextCombo = Math.min(10, playerState.combo + 1);
                  playerState = {
                    ...playerState,
                    coins: playerState.coins + 2,
                    combo: nextCombo,
                    score: playerState.score + 35 * nextCombo,
                  };
                  sound.playWhoosh();
                }
              }
            }

            gaitCycle += moveZ * 1.25;
          }

          if (!isCrashing && specialEndSequence === 'none') {
            // Lower, More Immersive & Cinematic Chase Camera with Smooth Banking Sway & Speed FOV
            cameraTrauma = Math.max(0, cameraTrauma - 2.2 * dt);
            const shake = cameraTrauma * cameraTrauma;
            const shakeX = (Math.random() - 0.5) * shake * 0.65;
            const shakeY = (Math.random() - 0.5) * shake * 0.48;

            const speedBoostFov = !isMotoMode && meatBoostTimer > 0 ? 5.5 : 0;
            const targetFov = 68 + Math.max(0, playerState.speed - 14.0) * 0.52 + speedBoostFov;
            if (Math.abs(camera.fov - targetFov) > 0.05) {
              camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-4 * dt));
              camera.updateProjectionMatrix();
            }

            // Inclinação dinâmica e fluida ao navegar entre as 3 ruas (Banking realista)
            const steerLean = THREE.MathUtils.clamp((steerVelocityX / 5.5) * 1.5, -1.2, 1.2);

            // =========================================================================
            // ITEM 6: SISTEMA DE EMPINAR A MOTO (GRAU) COM EQUILÍBRIO DINÂMICO,
            // RETORNO GARANTIDO AO NORMAL E QUEDA C/ NUVEM DE PANCADARIA DO CARAMELO!
            // =========================================================================
            if (wheeliePulseTimer > 0) {
              wheeliePulseTimer = Math.max(0, wheeliePulseTimer - dt);
            }
            const wantWheelie =
              isMotoMode &&
              (keysDown.wheelie || wheeliePulseTimer > 0) &&
              !playerState.isJumping &&
              !playerState.isRolling;

            if (wantWheelie) {
              // Se segurar o comando continuamente além do ponto de equilíbrio, acumula desequilíbrio gradual!
              if (keysDown.wheelie && wheelieAngle > 0.48) {
                wheelieOverbalanceTimer = Math.min(1.05, wheelieOverbalanceTimer + simDt * 0.48);
              } else {
                wheelieOverbalanceTimer = Math.max(0, wheelieOverbalanceTimer - simDt * 0.85);
              }
              const balanceFloat =
                Math.sin(elapsed * 5.2) * 0.025 + Math.sin(elapsed * 11.3) * 0.008;
              const targetAngle = 0.54 + wheelieOverbalanceTimer * 0.24 + balanceFloat;
              const accel = (targetAngle - wheelieAngle) * 26.0 - wheelieVel * 7.8;
              wheelieVel += accel * dt;
              wheelieAngle += wheelieVel * dt;

              // Passou da margem de tolerância e virou para trás: Cai da moto + Caramelo pula em cima na Nuvem de Pancadaria!
              if (wheelieOverbalanceTimer >= 0.98 && specialEndSequence === 'none') {
                wheelieOverbalanceTimer = 0;
                keysDown.wheelie = false;
                wheeliePulseTimer = 0;
                specialEndSequence = 'wheelie_brawl';
                specialEndClock = 0;
                specialEndReason = 'Virou no Grau — Pego pelo Caramelo!';
                playerState = { ...playerState, hp: 0 };
                brawlCenterX = playerState.x;
                brawlCenterZ = 0;
                initBrawlFlyingParts();
                brawlFinaleRig.root.visible = true;
                clearBikeParticles();
                sound.playMotoboyFunnyScream();
                sound.playCartoonBrawlFinale();
                sound.setGameOverMuffledVolume();
                cameraTrauma = 1.15;
                emitHud(true);
              }
            } else {
              wheelieOverbalanceTimer = Math.max(0, wheelieOverbalanceTimer - dt * 2.8);
              // Retorno forte e garantido à posição horizontal normal (corrige qualquer travamento no grau!)
              const accel = (0 - wheelieAngle) * 34.0 - wheelieVel * 10.6;
              wheelieVel += accel * dt;
              wheelieAngle += wheelieVel * dt;
              if (wheelieAngle <= 0.004) {
                if (wheelieVel < -0.15) {
                  forkDipVel = Math.max(-0.55, wheelieVel * 0.22);
                }
                wheelieAngle = 0;
                wheelieVel = 0;
              }
            }
            wheelieAngle = THREE.MathUtils.clamp(wheelieAngle, 0, 0.82);

            forkDipVel += (-forkDip * 46.0 - forkDipVel * 11.5) * dt;
            forkDip += forkDipVel * dt;

            const jumpPitch = playerState.isJumping
              ? Math.min(0.42, (playerState.vy + 5) * 0.04)
              : 0;
            const totalPitch = isMotoMode ? Math.max(wheelieAngle, jumpPitch) + forkDip : 0;
            const wheelieRatio = isMotoMode ? THREE.MathUtils.clamp(wheelieAngle / 0.56, 0, 1) : 0;

            const isPlayingOrPaused = activePhase === 'playing' || activePhase === 'paused';

            const invulnBlinkVisible =
              playerState.invulnerableTimer <= 0 ||
              Math.floor(playerState.invulnerableTimer * 16) % 2 === 0;

            // =========================================================================
            // COREOGRAFIA DUPLA: MODO MOTOBOY vs MODO CARAMELO
            // =========================================================================
            if (isMotoMode) {
              brawlFinaleRig.root.visible = false;
              // 1) MODO MOTOBOY: Moto fluida c/ inclinação natural + Faixa Vermelha Piscante no Chão antes do bote!
              if (playerMotoInstance) {
                playerMotoInstance.setRiderThermalVision(0);
                playerMotoInstance.root.rotation.x = 0;
                playerMotoInstance.root.visible =
                  isPlayingOrPaused && !isCrashing && inspectedId === null && invulnBlinkVisible;
                if (playerMotoInstance.root.visible) {
                  playerMotoInstance.root.position.set(playerState.x, playerState.y, 0);
                  playerMotoInstance.update(
                    dt,
                    isActivelyRunning ? playerState.speed : 0,
                    steerLean,
                    totalPitch,
                  );
                }
              }

              // Posicionamento seguro um pouco atrás do Motoboy (z ≈ +1.85m..+2.15m) desviando de carros!
              const baseBehindZ =
                1.92 + Math.sin(elapsed * 2.35) * 0.16 + wheelieRatio * 0.18;
              let desiredDogX =
                playerState.x +
                Math.sin(elapsed * 2.55) * 0.26 -
                THREE.MathUtils.clamp(steerLean * 0.22, -0.3, 0.3);

              for (let i = 0; i < trafficPool.length; i++) {
                const v = trafficPool[i];
                if (v.inUse && v.z > -4.8 && v.z < 3.8 && Math.abs(desiredDogX - v.x) < v.halfWidth + 0.62) {
                  const dodgeDir = desiredDogX >= v.x ? 1 : -1;
                  desiredDogX = v.x + dodgeDir * (v.halfWidth + 0.72);
                }
              }
              desiredDogX = THREE.MathUtils.clamp(desiredDogX, -4.65, 4.65);

              let dogY = 0;
              let dogZ = baseBehindZ;
              let dogRunSpeedMult = 1.06;

              if (!isActivelyRunning) {
                carameloWarnRig.root.visible = false;
                dangerGroundStrip.root.visible = false;
              } else if (motoDogAttackPhase === 'stalking') {
                carameloWarnRig.root.visible = false;
                dangerGroundStrip.root.visible = false;
                leadCaramelo?.setBitePrepFactor(0);
                const springAccelX = (desiredDogX - chaseDogX) * 34.0 - chaseDogVelX * 9.2;
                chaseDogVelX += springAccelX * dt;
                chaseDogX = THREE.MathUtils.clamp(chaseDogX + chaseDogVelX * dt, -4.75, 4.75);

                motoDogAttackTimer -= dt;
                if (
                  motoDogAttackTimer <= 0 &&
                  playerState.invulnerableTimer <= 0 &&
                  !playerState.isJumping
                ) {
                  motoDogAttackPhase = 'warning';
                  motoDogPhaseClock = 0;
                  motoDogWarnBlinkPhase = 0;
                  motoDogLockedX = playerState.x;
                  sound.playAttackWarning();
                  sound.playCustomBark();
                  emitHud(true);
                }
              } else if (motoDogAttackPhase === 'warning') {
                // Item 5: Faixa Vermelha Piscante no Chão (acelerando a frequência conforme o bote se aproxima!)
                motoDogPhaseClock += dt;
                const warnTotal = 1.22;
                const warnProgress = THREE.MathUtils.clamp(motoDogPhaseClock / warnTotal, 0, 1);

                const springAccelX = (motoDogLockedX - chaseDogX) * 44.0 - chaseDogVelX * 10.0;
                chaseDogVelX += springAccelX * dt;
                chaseDogX = THREE.MathUtils.clamp(chaseDogX + chaseDogVelX * dt, -4.75, 4.75);
                dogZ = THREE.MathUtils.lerp(baseBehindZ, 1.46, Math.min(1, motoDogPhaseClock / 0.45));
                dogRunSpeedMult = 1.24;
                leadCaramelo?.setBitePrepFactor(warnProgress * 0.85);

                // Faixa vermelha na pista demarcando exatamente a zona de ataque sob o Motoboy
                dangerGroundStrip.root.visible = inspectedId === null;
                dangerGroundStrip.root.position.set(motoDogLockedX, 0, -1.35);
                const blinkFreq = THREE.MathUtils.lerp(8.5, 34.0, warnProgress * warnProgress);
                motoDogWarnBlinkPhase += dt * blinkFreq;
                const blinkWave = 0.5 + 0.5 * Math.sin(motoDogWarnBlinkPhase);
                dangerGroundStrip.fillMat.opacity = 0.16 + blinkWave * 0.46;
                dangerGroundStrip.borderMat.opacity = 0.44 + blinkWave * 0.56;
                dangerGroundStrip.chevronMat.opacity = 0.34 + blinkWave * 0.66;

                carameloWarnRig.root.visible = inspectedId === null;
                const warnBob = Math.abs(Math.sin(motoDogPhaseClock * 14.0)) * 0.18;
                const warnScale = 1.04 + blinkWave * 0.18;
                carameloWarnRig.root.position.set(
                  chaseDogX + 0.16,
                  1.34 + warnBob,
                  dogZ - 0.08,
                );
                carameloWarnRig.diagonalBadge.rotation.z =
                  -0.49 + Math.sin(motoDogPhaseClock * 26.0) * 0.11;
                carameloWarnRig.diagonalBadge.scale.setScalar(warnScale);

                if (motoDogPhaseClock >= warnTotal) {
                  carameloWarnRig.root.visible = false;
                  dangerGroundStrip.root.visible = false;
                  leadCaramelo?.setBitePrepFactor(0);
                  motoDogAttackPhase = 'lunging';
                  motoDogPhaseClock = 0;
                  motoDogStartX = chaseDogX;
                  motoDogStartZ = dogZ;
                  sound.playBoing();
                  emitHud(true);
                }
              } else if (motoDogAttackPhase === 'lunging') {
                // Salto parabólico em direção à área demarcada! Remove a faixa vermelha ao saltar!
                carameloWarnRig.root.visible = false;
                dangerGroundStrip.root.visible = false;
                motoDogPhaseClock += dt;
                const u = Math.min(1, motoDogPhaseClock / 0.26);
                chaseDogX = THREE.MathUtils.lerp(motoDogStartX, motoDogLockedX, u);
                dogZ = THREE.MathUtils.lerp(motoDogStartZ, 0.42, u);
                dogY = Math.sin(u * Math.PI) * 0.95 + u * 0.78;
                dogRunSpeedMult = 1.38;

                if (u >= 1) {
                  // Zona real da faixa (largura 2.36m -> raio lateral 1.12m)
                  const dodged =
                    Math.abs(playerState.x - motoDogLockedX) >= 1.12 || playerState.y > 0.68;
                  if (dodged) {
                    // Item 5: Desviou a tempo! Feedback visual e sonoro satisfatório de esquiva!
                    dodgeSuccessNonce += 1;
                    sound.playCartoonDodgeSuccess();
                    triggerCustomColorBurst(
                      playerState.x,
                      playerState.y + 0.95,
                      0.0,
                      0x38bdf8,
                      0xfacc15,
                      14,
                    );
                    const nextCombo = Math.min(10, playerState.combo + 1);
                    playerState = {
                      ...playerState,
                      combo: nextCombo,
                      score: playerState.score + 120 * nextCombo,
                    };
                    motoDogAttackPhase = 'recovering';
                    motoDogPhaseClock = 0;
                    motoDogStartX = chaseDogX;
                    motoDogStartZ = 0.55;
                    emitHud(true);
                  } else {
                    // Permaneceu na faixa marcada: Caramelo se agarra às costas + mordida + dano!
                    motoDogAttackPhase = 'latched';
                    motoDogPhaseClock = 0;
                    leadCaramelo?.triggerBiteChomp();
                    sound.playBiteAttack();
                    sound.playCustomBark();
                    triggerCustomColorBurst(
                      playerState.x,
                      playerState.y + 1.15,
                      0.32,
                      0xff2a00,
                      0xfde047,
                      18,
                    );
                    riderDamageFlashTimer = 0.78;
                    cameraTrauma = Math.max(cameraTrauma, 0.76);

                    const nextHp = Math.max(0, playerState.hp - 1);
                    if (nextHp <= 0) {
                      // Item 7: Derrota Cômica do Motoboy (0 vidas) — cai de costas no chão com braços e pernas abertos!
                      playerState = { ...playerState, hp: 0 };
                      specialEndSequence = 'motoboy_backfall';
                      specialEndClock = 0;
                      specialEndReason = 'Mordida do Caramelo nas Costas!';
                      cameraTrauma = 1.25;
                      clearBikeParticles();
                      sound.playMotoboyFunnyScream();
                      sound.setGameOverMuffledVolume();
                      emitHud(true);
                    } else {
                      playerState = {
                        ...playerState,
                        hp: nextHp,
                        combo: 1,
                        invulnerableTimer: 1.65,
                      };
                      emitHud(true);
                    }
                  }
                }
              } else if (motoDogAttackPhase === 'latched') {
                carameloWarnRig.root.visible = false;
                dangerGroundStrip.root.visible = false;
                motoDogPhaseClock += dt;
                chaseDogX = playerState.x + Math.sin(motoDogPhaseClock * 32.0) * 0.08;
                chaseDogVelX = 0;
                dogZ = 0.44;
                dogY =
                  playerState.y + 0.84 + Math.abs(Math.sin(motoDogPhaseClock * 18.0)) * 0.12;
                dogRunSpeedMult = 1.3;

                if (motoDogPhaseClock > 0.32 && motoDogPhaseClock - dt <= 0.32) {
                  leadCaramelo?.triggerBiteChomp();
                  triggerCustomColorBurst(
                    playerState.x,
                    playerState.y + 1.15,
                    0.34,
                    0xef4444,
                    0xffffff,
                    8,
                  );
                }

                if (motoDogPhaseClock >= 0.72) {
                  motoDogAttackPhase = 'recovering';
                  motoDogPhaseClock = 0;
                  motoDogStartX = chaseDogX;
                  motoDogStartZ = 0.44;
                }
              } else {
                carameloWarnRig.root.visible = false;
                dangerGroundStrip.root.visible = false;
                motoDogPhaseClock += dt;
                const u = Math.min(1, motoDogPhaseClock / 0.52);
                chaseDogX = THREE.MathUtils.lerp(motoDogStartX, desiredDogX, u);
                dogZ = THREE.MathUtils.lerp(motoDogStartZ, baseBehindZ, u);
                dogY = Math.sin(u * Math.PI) * 0.45 + (1 - u) * 0.35;

                if (u >= 1) {
                  motoDogAttackPhase = 'stalking';
                  const baseCd =
                    difficultyRef.current === 'hard'
                      ? 5.2
                      : difficultyRef.current === 'medium'
                      ? 6.6
                      : 8.2;
                  motoDogAttackTimer = baseCd + Math.random() * 2.4;
                }
              }

              const dogPursuitLean = THREE.MathUtils.clamp(chaseDogVelX * 0.16, -0.9, 0.9);
              if (leadCaramelo && !isCrashing) {
                leadCaramelo.root.visible =
                  isPlayingOrPaused && inspectedId === null;
                leadCaramelo.root.position.set(chaseDogX, dogY, dogZ);
                leadCaramelo.update(
                  dt,
                  isActivelyRunning ? playerState.speed * dogRunSpeedMult : 0,
                  dogPursuitLean,
                  dogY,
                  false,
                );
              }

              if (isActivelyRunning && wantWheelie) {
                chaseBarkTimer -= dt * 2.4;
                if (chaseBarkTimer <= 0) {
                  chaseBarkTimer = 5.5 + Math.random() * 4.5;
                  sound.playCustomBark();
                }
              }
            } else {
              // 2) MODO CARAMELO: 10 Vidas, Aproximação Suave, Barra de Precisão, Motoboy Achatado, Fuga Progressiva & Finale Poeira!
              carameloWarnRig.root.visible = false;
              dangerGroundStrip.root.visible = false;
              const curveY = worldCurveUniforms.uWorldCurveY.value;
              const endgameScale = aiMotoHp <= 5 ? (6 - Math.max(1, aiMotoHp)) / 5 : 0;

              let aiEscapeWheelie = 0;

              if (isActivelyRunning) {
                // IA de Desvio Inteligente nas fases fora da nuvem de poeira final
                if (carameloBitePhase !== 'brawl_leap' && carameloBitePhase !== 'brawl_cloud') {
                  aiDecisionCooldown = Math.max(0, aiDecisionCooldown - dt);
                  const laneDanger = [0, 0, 0];
                  const laneList: LaneIndex[] = [-1, 0, 1];
                  for (let li = 0; li < 3; li++) {
                    const ln = laneList[li];
                    for (let vIdx = 0; vIdx < trafficPool.length; vIdx++) {
                      const v = trafficPool[vIdx];
                      if (v.inUse && v.lane === ln && v.z > aiMotoZ - 34.0 && v.z < aiMotoZ + 5.5) {
                        const prox = 36.0 - Math.abs(v.z - aiMotoZ);
                        laneDanger[li] += Math.max(5, prox * 3.0);
                      }
                    }
                    for (let mIdx = 0; mIdx < manholePool.length; mIdx++) {
                      const mh = manholePool[mIdx];
                      if (mh.inUse && mh.lane === ln && mh.z > aiMotoZ - 22.0 && mh.z < aiMotoZ + 3.8) {
                        laneDanger[li] += 45;
                      }
                    }
                  }

                  const curIdx = aiMotoLane + 1;
                  const allowWeave = carameloBitePhase !== 'precision' && carameloBitePhase !== 'impact_react';
                  if (laneDanger[curIdx] > 0 || (allowWeave && aiDecisionCooldown <= 0)) {
                    let bestIdx = curIdx;
                    let bestScore = laneDanger[curIdx];
                    const weaveChance = 0.22 + endgameScale * 0.16;
                    for (let li = 0; li < 3; li++) {
                      const weaveBias =
                        allowWeave &&
                        laneDanger[li] === 0 &&
                        aiDecisionCooldown <= 0 &&
                        Math.random() < weaveChance
                          ? -1
                          : 0;
                      if (laneDanger[li] + weaveBias < bestScore) {
                        bestScore = laneDanger[li] + weaveBias;
                        bestIdx = li;
                      }
                    }
                    if (bestIdx !== curIdx) {
                      aiMotoLane = laneList[bestIdx];
                      const cdFactor = 1.0 - endgameScale * 0.24;
                      aiDecisionCooldown = (0.52 + Math.random() * 0.42) * cdFactor;
                    } else if (aiDecisionCooldown <= 0) {
                      aiDecisionCooldown = 0.8 + Math.random() * 0.55;
                    }
                  }
                }

                if (carameloBitePhase === 'pursuing') {
                  bitePrepBlend = THREE.MathUtils.lerp(bitePrepBlend, 0, 1 - Math.exp(-9.0 * dt));
                  chasePressure = THREE.MathUtils.clamp(
                    chasePressure + dt * (meatBoostTimer > 0 ? 0.48 : 0.115),
                    0,
                    1,
                  );
                  const targetAiZ =
                    THREE.MathUtils.lerp(-9.2, -3.35, chasePressure) +
                    (meatBoostTimer > 0 ? 0.65 : 0);
                  aiMotoZ = THREE.MathUtils.lerp(aiMotoZ, targetAiZ, 1 - Math.exp(-3.8 * dt));
                } else if (carameloBitePhase === 'precision') {
                  // Item 2 & 3: Aproximação gradual atrás/ao lado do Motoboy (NUNCA salta para a frente dele!)
                  bitePrepBlend = THREE.MathUtils.lerp(bitePrepBlend, 1.0, 1 - Math.exp(-8.5 * dt));
                  aiMotoZ = THREE.MathUtils.lerp(aiMotoZ, -1.68, 1 - Math.exp(-5.0 * dt));

                  // Oscilação contínua do marcador na Barra de Precisão (moderadamente mais rápida com <= 5 vidas!)
                  const sweepSpeed = THREE.MathUtils.lerp(3.65, 4.95, endgameScale);
                  precisionClock += dt;
                  precisionMarkerPhase += dt * sweepSpeed;
                  precisionMarkerValue = 0.5 - 0.5 * Math.cos(precisionMarkerPhase);

                  if (precisionClock >= 2.85) {
                    resolveCarameloPrecisionBite('miss');
                  }
                } else if (carameloBitePhase === 'impact_react') {
                  // Item 4: Motoboy reage primeiro ao impacto (achatado) antes de acelerar!
                  bitePrepBlend = THREE.MathUtils.lerp(bitePrepBlend, 0, 1 - Math.exp(-12.0 * dt));
                  impactReactTimer -= dt;
                  if (impactReactTimer <= 0) {
                    carameloBitePhase = 'escaping';
                    aiMotoEscapeVel = 0.8;
                  }
                } else if (carameloBitePhase === 'escaping') {
                  // Item 4: Aceleração progressiva e natural da moto ganhando distância considerável (Zero Teleporte!)
                  bitePrepBlend = THREE.MathUtils.lerp(bitePrepBlend, 0, 1 - Math.exp(-10.0 * dt));
                  const targetEscapeZ = -16.8;
                  if (aiMotoZ > targetEscapeZ + 0.35 && aiMotoEscapeTimer > 0) {
                    aiMotoEscapeVel = Math.min(13.8, aiMotoEscapeVel + 16.5 * dt);
                    aiMotoZ = Math.max(targetEscapeZ, aiMotoZ - aiMotoEscapeVel * dt);
                    aiEscapeWheelie = Math.min(0.28, aiMotoEscapeVel * 0.025);
                  } else {
                    aiMotoEscapeVel = Math.max(0, aiMotoEscapeVel - 22.0 * dt);
                    carameloBitePhase = 'pursuing';
                    chasePressure = 0.08;
                  }
                } else if (carameloBitePhase === 'brawl_leap') {
                  // Item 6 (Etapa 1): Grande Salto Cômico em direção ao Motoboy!
                  bitePrepBlend = 0;
                  brawlClock += dt;
                  aiMotoX = THREE.MathUtils.lerp(aiMotoX, brawlCenterX, 1 - Math.exp(-10.0 * dt));
                  aiMotoZ = THREE.MathUtils.lerp(aiMotoZ, brawlCenterZ, 1 - Math.exp(-10.0 * dt));
                  if (brawlClock >= 0.38) {
                    carameloBitePhase = 'brawl_cloud';
                    brawlClock = 0;
                    initBrawlFlyingParts();
                    brawlFinaleRig.root.visible = true;
                    sound.playCartoonBrawlFinale();
                    cameraTrauma = 0.92;
                    emitHud(true);
                  }
                } else if (carameloBitePhase === 'brawl_cloud') {
                  // Item 6 (Etapa 2): Nuvem Branca de Poeira Volumétrica Crescendo + Peças da Moto Voando e Quicando!
                  brawlClock += dt;
                  brawlFinaleRig.root.visible = inspectedId === null;
                  const bCurveDist = Math.max(0, -(brawlCenterZ - WORLD_CURVE_START_Z));
                  const bRoadY = -curveY * bCurveDist * bCurveDist;
                  brawlFinaleRig.root.position.set(brawlCenterX, bRoadY, brawlCenterZ);

                  const cloudGrowth = THREE.MathUtils.lerp(
                    0.58,
                    1.62,
                    Math.min(1, brawlClock / 1.45),
                  );
                  const cloudFade = 1.0 - THREE.MathUtils.smoothstep(brawlClock, 2.25, 2.68);
                  brawlFinaleRig.dustCloudGroup.scale.setScalar(cloudGrowth);

                  for (let p = 0; p < brawlFinaleRig.dustPuffs.length; p++) {
                    const puff = brawlFinaleRig.dustPuffs[p];
                    const ang = puff.orbitAngle + brawlClock * puff.speed;
                    const wobbleR = puff.orbitRadius * (0.85 + 0.25 * Math.sin(brawlClock * 14.0 + p));
                    puff.group.position.set(
                      Math.cos(ang) * wobbleR,
                      puff.orbitHeight + Math.abs(Math.sin(brawlClock * 16.0 + p * 1.3)) * 0.28,
                      Math.sin(ang) * wobbleR * 0.82,
                    );
                    const sPulse = puff.baseScale * (0.9 + 0.22 * Math.sin(brawlClock * 20.0 + p));
                    puff.group.scale.setScalar(sPulse);
                    puff.mat.opacity = cloudFade;
                    puff.outMat.opacity = cloudFade;
                  }

                  for (let s = 0; s < brawlFinaleRig.comicSpikes.length; s++) {
                    const sp = brawlFinaleRig.comicSpikes[s];
                    const sAng = (s / brawlFinaleRig.comicSpikes.length) * Math.PI * 2 + brawlClock * 6.5;
                    const pop = Math.max(0, Math.sin(brawlClock * 18.0 + s * 2.1)) * cloudFade;
                    sp.position.set(
                      Math.cos(sAng) * 1.15,
                      0.75 + Math.sin(brawlClock * 12.0 + s) * 0.38,
                      Math.sin(sAng) * 0.95,
                    );
                    sp.rotation.set(brawlClock * 9.0, sAng, brawlClock * 7.0);
                    sp.scale.setScalar(0.5 + pop * 1.35);
                  }

                  for (let k = 0; k < brawlFinaleRig.flyingParts.length; k++) {
                    const part = brawlFinaleRig.flyingParts[k];
                    const st = brawlPartState[k];
                    if (!st.launched) {
                      if (brawlClock >= st.launchDelay) {
                        st.launched = true;
                        part.group.visible = true;
                        cameraTrauma = Math.max(cameraTrauma, 0.38);
                      } else {
                        continue;
                      }
                    }
                    st.vy -= 21.5 * dt;
                    st.x += st.vx * dt;
                    st.y += st.vy * dt;
                    st.z += st.vz * dt;
                    if (st.y < part.radius) {
                      st.y = part.radius;
                      st.vy = Math.abs(st.vy) * part.restitution;
                      st.vx *= 0.85;
                      st.vz *= 0.85;
                    }
                    part.group.position.set(st.x, st.y, st.z);
                    part.group.rotation.x += st.rx * dt;
                    part.group.rotation.y += st.ry * dt;
                    part.group.rotation.z += st.rz * dt;
                  }

                  if (brawlClock >= 2.68) {
                    brawlFinaleRig.root.visible = false;
                    motoboysDefeated += 1;
                    playerState = {
                      ...playerState,
                      coins: playerState.coins + 15,
                      score: playerState.score + 2500,
                    };
                    onBoneCollectedRef.current?.(500, 'bite');
                    sound.playWin();
                    const finalSnap = buildHudSnapshot();
                    onHudUpdateRef.current(finalSnap);
                    onGameOverRef.current(
                      finalSnap,
                      'VITÓRIA! Motoboy Capturado pelo Caramelo!',
                    );
                  }
                }
              }

              leadCaramelo?.setBitePrepFactor(bitePrepBlend);

              if (carameloBitePhase !== 'brawl_leap' && carameloBitePhase !== 'brawl_cloud') {
                const targetAiX = laneToX(aiMotoLane);
                const aiSpring = (targetAiX - aiMotoX) * 42.0 - aiMotoVelX * 10.2;
                aiMotoVelX += aiSpring * dt;
                aiMotoX = THREE.MathUtils.clamp(aiMotoX + aiMotoVelX * dt, -4.6, 4.6);
              }
              const aiSteerLean = THREE.MathUtils.clamp((aiMotoVelX / 5.5) * 1.4, -1.1, 1.1);

              // Verifica distância para ativar Botão MORDER + Visão Térmica Infravermelha APENAS nas 2 pernas!
              const distToMotoZ = Math.abs(aiMotoZ);
              const distToMotoX = Math.abs(playerState.x - aiMotoX);
              const closeEnoughToBite =
                carameloBitePhase === 'pursuing' &&
                distToMotoZ <= 5.8 &&
                distToMotoX <= 2.15;
              const prevBiteReady = isBiteCurrentlyReady;
              isBiteCurrentlyReady = closeEnoughToBite && biteCooldownTimer <= 0;
              if (prevBiteReady !== isBiteCurrentlyReady) {
                emitHud(true);
              }

              const targetThermal =
                carameloBitePhase === 'precision' || closeEnoughToBite
                  ? 1.0
                  : carameloBitePhase === 'pursuing' && distToMotoZ <= 7.2 && distToMotoX <= 2.65
                  ? 0.35
                  : 0.0;
              thermalVisionBlend = THREE.MathUtils.lerp(
                thermalVisionBlend,
                targetThermal,
                1 - Math.exp(-10.0 * dt),
              );

              if (playerMotoInstance) {
                playerMotoInstance.setRiderThermalVision(thermalVisionBlend);
                const aiCurveDist = Math.max(0, -(aiMotoZ - WORLD_CURVE_START_Z));
                const aiRoadY = -curveY * aiCurveDist * aiCurveDist;
                playerMotoInstance.root.visible =
                  isPlayingOrPaused &&
                  !isCrashing &&
                  inspectedId === null &&
                  carameloBitePhase !== 'brawl_cloud';
                if (playerMotoInstance.root.visible) {
                  playerMotoInstance.root.position.set(aiMotoX, aiRoadY, aiMotoZ);
                  playerMotoInstance.root.rotation.x = Math.atan(2 * curveY * aiCurveDist);
                  playerMotoInstance.update(
                    dt,
                    isActivelyRunning
                      ? effectiveGroundSpeed + aiMotoEscapeVel * 0.85
                      : 0,
                    aiSteerLean,
                    aiEscapeWheelie,
                  );
                }
              }

              // Caramelo Jogável: aproximação gradual na preparação (sem pular à frente do Motoboy!)
              if (leadCaramelo) {
                leadCaramelo.root.visible =
                  isPlayingOrPaused &&
                  !isCrashing &&
                  inspectedId === null &&
                  invulnBlinkVisible &&
                  carameloBitePhase !== 'brawl_cloud';

                let dogPosX = playerState.x;
                let dogPosY = playerState.y;
                let dogPosZ = 0;

                if (carameloBitePhase === 'precision') {
                  const sideOffset = playerState.x >= aiMotoX ? 0.38 : -0.38;
                  dogPosX = THREE.MathUtils.lerp(
                    playerState.x,
                    aiMotoX + sideOffset,
                    bitePrepBlend * 0.55,
                  );
                  dogPosZ = -0.22 * bitePrepBlend; // Permanece atrás da moto (-1.68m), nunca à frente!
                } else if (biteStrikeTimer > 0) {
                  const strikeArc = Math.sin((1.0 - biteStrikeTimer / 0.28) * Math.PI);
                  dogPosX = THREE.MathUtils.lerp(playerState.x, aiMotoX, strikeArc * 0.52);
                  dogPosY = playerState.y + strikeArc * 0.22;
                  dogPosZ = Math.max(aiMotoZ + 0.92, -0.58 * strikeArc);
                } else if (carameloBitePhase === 'brawl_leap') {
                  const leapU = Math.min(1, brawlClock / 0.38);
                  dogPosX = THREE.MathUtils.lerp(brawlStartX, brawlCenterX, leapU);
                  dogPosZ = THREE.MathUtils.lerp(brawlStartZ, brawlCenterZ + 0.32, leapU);
                  dogPosY = Math.sin(leapU * Math.PI) * 1.48;
                }

                if (leadCaramelo.root.visible) {
                  leadCaramelo.root.position.set(dogPosX, dogPosY, dogPosZ);
                  leadCaramelo.update(
                    dt,
                    isActivelyRunning ? Math.max(8.5, effectiveGroundSpeed) : 0,
                    steerLean,
                    dogPosY,
                    playerState.isRolling,
                  );
                }
              }
            }

            // 3) Fumaça Cartoon colada na ponteira do escapamento + Sujeira do Asfalto
            if (inspectedId === null && carameloBitePhase !== 'brawl_cloud') {
              updateBikeExhaustAndDirt(
                dt,
                isMotoMode ? playerState.x : aiMotoX,
                isMotoMode ? playerState.y : 0,
                effectiveGroundSpeed,
                steerLean,
                steerVelocityX,
                totalPitch,
                isActivelyRunning,
                isMotoMode,
              );
            } else {
              exhaustInstanced.visible = false;
              dirtInstanced.visible = false;
            }

            if (isMotoMode) {
              _camTargetPos.set(
                playerState.x * 0.72 + shakeX,
                2.14 + playerState.y * 0.35 + shakeY + wheelieRatio * 0.14,
                4.48 + wheelieRatio * 0.24,
              );
              _camLookAt.set(
                playerState.x * 0.45 + steerVelocityX * 0.05,
                1.24 + playerState.y * 0.18 + wheelieRatio * 0.2,
                -32,
              );
            } else if (
              carameloBitePhase === 'brawl_leap' ||
              carameloBitePhase === 'brawl_cloud'
            ) {
              // Enquadramento cinematográfico cômico para a nuvem de poeira e peças voando!
              _camTargetPos.set(
                brawlCenterX * 0.55 + shakeX,
                2.22 + shakeY,
                2.95,
              );
              _camLookAt.set(brawlCenterX * 0.85, 0.92, brawlCenterZ);
            } else if (carameloBitePhase === 'precision') {
              // Câmera levemente mais próxima valorizando a postura predatória de preparação da mordida!
              _camTargetPos.set(
                (playerState.x * 0.55 + aiMotoX * 0.22) + shakeX,
                1.72 + playerState.y * 0.3 + shakeY,
                3.18,
              );
              _camLookAt.set(
                aiMotoX * 0.55 + playerState.x * 0.2,
                0.98 + playerState.y * 0.15,
                -18,
              );
            } else {
              _camTargetPos.set(
                playerState.x * 0.72 + shakeX,
                1.86 + playerState.y * 0.35 + shakeY,
                3.72 - (meatBoostTimer > 0 ? 0.18 : 0),
              );
              _camLookAt.set(
                (playerState.x * 0.38 + aiMotoX * 0.14) + steerVelocityX * 0.05,
                1.14 + playerState.y * 0.18,
                -32,
              );
            }
            const camDamp = 1 - Math.exp(-8.5 * dt);
            camera.position.lerp(_camTargetPos, camDamp);
            currentCamLook.lerp(_camLookAt, camDamp);
            camera.lookAt(currentCamLook);

            // Keep camera roll zeroed so the horizon mountains never rock or sway
            camRollImpulse = 0;
            camRollAngle = 0;
            camera.rotation.z = 0;

            // Item 4: Projeta a posição 3D acima da cabeça do Motoboy para coordenadas de tela (10 Corações Dinâmicos)
            camera.updateMatrixWorld();
            _heartProjVec
              .set(
                playerState.x,
                playerState.y + (isMotoMode ? 2.12 + wheelieRatio * 0.22 : 1.55),
                0,
              )
              .project(camera);
            playerScreenPos = {
              x: THREE.MathUtils.clamp((_heartProjVec.x + 1) * 0.5, 0.14, 0.86),
              y: THREE.MathUtils.clamp((1 - _heartProjVec.y) * 0.5, 0.11, 0.76),
            };

            hudEmitTimer += dt;
            emitHud(false);
          }
        }
      } else {
        // paused ou gameover
        const isPausedVisible = activePhase === 'paused' && !isCrashing;
        atmosGroup.visible = false;
        exhaustInstanced.visible = isMotoMode && isPausedVisible;
        dirtInstanced.visible = isPausedVisible;
        waterSplashInstanced.visible = isPausedVisible;
        carameloWarnRig.root.visible = false;
        dangerGroundStrip.root.visible = false;
        if (activePhase !== 'paused') {
          brawlFinaleRig.root.visible = false;
          clearHeadBanknotes();
        }
        if (playerMotoInstance) {
          playerMotoInstance.root.visible =
            isPausedVisible && carameloBitePhase !== 'brawl_cloud';
        }
        if (leadCaramelo) {
          leadCaramelo.root.visible =
            isPausedVisible && carameloBitePhase !== 'brawl_cloud';
        }
      }

      // Unified Automatic LOD (LOD0/LOD1/LOD2), Distance Culling, Forward-Only Culling & Occlusion Culling Pass
      const isInspectingCatalog = inspectedId !== null;
      const scaledHouseCullZ = MAX_CULL_DISTANCE_HOUSE_Z * activeCullScale;
      const scaledFavelaCullZ = MAX_CULL_DISTANCE_FAVELA_Z * activeCullScale;
      const scaledPropCullZ = MAX_CULL_DISTANCE_PROP_Z * activeCullScale;

      for (let i = 0; i < activeHouseSlots.length; i++) {
        const slot = activeHouseSlots[i];
        if (isInspectingCatalog && slot.z >= -26) {
          slot.leftMesh.visible = false;
          slot.rightMesh.visible = false;
          continue;
        }
        const lodRes = computeObjectLodAndCulling(slot.z, 0, scaledHouseCullZ);
        const houseOpacity = computeHouseHorizonFadeFactor(slot.z, 0);
        const isHouseVisible = lodRes.visible && houseOpacity > 0.02;
        slot.leftMesh.visible = isHouseVisible;
        slot.rightMesh.visible = isHouseVisible;
        if (isHouseVisible) {
          applyGroupLodState(slot.leftMesh, lodRes.lod, false);
          applyGroupLodState(slot.rightMesh, lodRes.lod, false);
          applyHouseDistanceOpacity(slot.leftMesh, houseOpacity);
          applyHouseDistanceOpacity(slot.rightMesh, houseOpacity);
        }
      }

      for (let i = 0; i < favelaPairs.length; i++) {
        const fPair = favelaPairs[i];
        const lodRes = computeObjectLodAndCulling(fPair.z, 0, scaledFavelaCullZ);
        if (!lodRes.visible) {
          fPair.leftFavela.visible = false;
          fPair.rightFavela.visible = false;
          continue;
        }

        // Check if a 2-story foreground sobrado is standing in front of this hillside favela cluster
        let leftBlockedBySobrado = false;
        let rightBlockedBySobrado = false;
        for (let h = 0; h < activeHouseSlots.length; h++) {
          const hs = activeHouseSlots[h];
          if (Math.abs(hs.z - fPair.z) < 10.5) {
            if (HOUSE_VARIATIONS[hs.leftVarIndex].stories === 2) leftBlockedBySobrado = true;
            if (HOUSE_VARIATIONS[hs.rightVarIndex].stories === 2) rightBlockedBySobrado = true;
          }
        }

        const leftOcc = evaluateFavelaOcclusion(
          fPair.z,
          'left',
          playerState.x,
          leftBlockedBySobrado,
        );
        const rightOcc = evaluateFavelaOcclusion(
          fPair.z,
          'right',
          playerState.x,
          rightBlockedBySobrado,
        );

        const lowerFade = computeFavelaFadeOpacity(fPair.z, 0, false);
        const upperFade = computeFavelaFadeOpacity(fPair.z, 0, true);

        fPair.leftFavela.visible = !leftOcc.fullyOccluded && lowerFade > 0.02;
        if (fPair.leftFavela.visible) {
          applyGroupLodState(fPair.leftFavela, lodRes.lod, leftOcc.lowerTierOccluded);
          applyFavelaDistanceOpacity(fPair.leftFavela, lowerFade, upperFade);
        }

        fPair.rightFavela.visible = !rightOcc.fullyOccluded && lowerFade > 0.02;
        if (fPair.rightFavela.visible) {
          applyGroupLodState(fPair.rightFavela, lodRes.lod, rightOcc.lowerTierOccluded);
          applyFavelaDistanceOpacity(fPair.rightFavela, lowerFade, upperFade);
        }
      }

      for (let i = 0; i < polePairs.length; i++) {
        const pair = polePairs[i];
        const lodRes = computeObjectLodAndCulling(pair.z, 0, scaledPropCullZ);
        pair.leftPole.visible = lodRes.visible;
        pair.rightPole.visible = lodRes.visible;
        if (lodRes.visible) {
          applyGroupLodState(pair.leftPole, lodRes.lod, false);
          applyGroupLodState(pair.rightPole, lodRes.lod, false);
        }
      }

      for (let i = 0; i < orelhaoPairs.length; i++) {
        const oPair = orelhaoPairs[i];
        const lod = computeObjectLodAndCulling(oPair.z, 0, scaledPropCullZ);
        oPair.leftOrelhao.visible =
          oPair.activeSide === 'left' && lod.visible && !isInspectingCatalog;
        oPair.rightOrelhao.visible =
          oPair.activeSide === 'right' && lod.visible && !isInspectingCatalog;
        if (oPair.leftOrelhao.visible) {
          applyGroupLodState(oPair.leftOrelhao, lod.lod, false);
        }
        if (oPair.rightOrelhao.visible) {
          applyGroupLodState(oPair.rightOrelhao, lod.lod, false);
        }
      }

      for (let i = 0; i < billboardPairs.length; i++) {
        const bPair = billboardPairs[i];
        const leftLod = computeObjectLodAndCulling(
          bPair.leftZ,
          0,
          scaledHouseCullZ,
        );
        const rightLod = computeObjectLodAndCulling(
          bPair.rightZ,
          0,
          scaledHouseCullZ,
        );
        const leftFade = computeHouseHorizonFadeFactor(bPair.leftZ, 0);
        const rightFade = computeHouseHorizonFadeFactor(bPair.rightZ, 0);
        bPair.leftBillboard.visible =
          bPair.showLeft && leftLod.visible && leftFade > 0.02 && !isInspectingCatalog;
        bPair.rightBillboard.visible =
          bPair.showRight && rightLod.visible && rightFade > 0.02 && !isInspectingCatalog;
        if (bPair.leftBillboard.visible) {
          applyGroupLodState(bPair.leftBillboard, leftLod.lod, false);
          applyHouseDistanceOpacity(bPair.leftBillboard, leftFade);
        }
        if (bPair.rightBillboard.visible) {
          applyGroupLodState(bPair.rightBillboard, rightLod.lod, false);
          applyHouseDistanceOpacity(bPair.rightBillboard, rightFade);
        }
      }

      for (let i = 0; i < sidewalkCaramelos.length; i++) {
        const sc = sidewalkCaramelos[i];
        const lod = computeObjectLodAndCulling(sc.z, 0, scaledPropCullZ);
        sc.root.visible = lod.visible && !isInspectingCatalog;
      }

      for (let i = 0; i < streetMotionRows.length; i++) {
        const row = streetMotionRows[i];
        const lodRes = computeObjectLodAndCulling(row.z, 0, scaledPropCullZ);
        row.mesh.visible = lodRes.visible;
        if (lodRes.visible) {
          applyGroupLodState(row.mesh, lodRes.lod, false);
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('pointerup', onPointerUp);
      if (playerMotoInstance) {
        playerMotoInstance.dispose();
      }
      if (leadCaramelo) {
        leadCaramelo.dispose();
      }
      skyGeo.dispose();
      daySkyTex.dispose();
      sunsetSkyTex.dispose();
      dynamicSky.material.dispose();
      exhaustInstanced.dispose();
      exhaustGeo.dispose();
      exhaustMat.dispose();
      dirtInstanced.dispose();
      dirtGeo.dispose();
      dirtMat.dispose();
      cashBurstInstanced.dispose();
      cashBurstGeo.dispose();
      cashBurstMat.dispose();
      waterSplashInstanced.dispose();
      waterSplashGeo.dispose();
      waterSplashMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ filter: 'saturate(1.11) contrast(1.03)' }}
      className="fixed inset-0 w-full h-full overflow-hidden"
    />
  );
};
