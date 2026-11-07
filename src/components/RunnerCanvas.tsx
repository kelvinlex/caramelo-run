import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMotoInstance, type MotoInstance } from '../services/motoModelLoader';
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
  type LaneIndex,
  type PlayerState,
  type TrackCoin,
  type TrackObstacle,
  applyCoinPickup,
  applyConeHit,
  checkObstacleCollision,
  computeDistantHouseOpacity,
  computeFavelaFadeOpacity,
  computeHouseHorizonFadeFactor,
  computeMountainVistaPlacement,
  computeObjectLodAndCulling,
  computeRoadTextureOffsetDelta,
  createInitialPlayerState,
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
  applyFavelaDistanceOpacity,
  applyGroupLodState,
  applyHouseDistanceOpacity,
  applyWorldCurvatureToMaterial,
  buildBrazilianHouse,
  buildBrazilianOrelhao,
  buildCoinMesh,
  buildCorcovadoAndCristoRedentor,
  buildHillsideFavelaCluster,
  buildHorizonCitySkyline,
  buildPerspectiveSkyClouds,
  buildRealisticHorizonSun,
  buildRoadsideOutdoorBillboard,
  buildStreetMotionRow,
  buildStylizedRunner,
  buildTropicalBird,
  buildUtilityPoleWithWires,
  worldCurveUniforms,
} from '../game/builders';

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

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
}

interface RunnerCanvasProps {
  phase: GamePhase;
  skyPreset: SkyPreset;
  inspectedHouseId: number | null;
  runNonce: number;
  equippedMotoId?: string;
  onHudUpdate: (hud: HudSnapshot) => void;
  onGameOver: (finalHud: HudSnapshot) => void;
  controlTriggerRef: React.MutableRefObject<{
    left: () => void;
    right: () => void;
    jump: () => void;
    roll: () => void;
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
const PARTICLE_POOL_SIZE = 36;

export const RunnerCanvas: React.FC<RunnerCanvasProps> = ({
  phase,
  skyPreset,
  inspectedHouseId,
  runNonce,
  equippedMotoId,
  onHudUpdate,
  onGameOver,
  controlTriggerRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<GamePhase>(phase);
  const skyPresetRef = useRef<SkyPreset>(skyPreset);
  const inspectedHouseRef = useRef<number | null>(inspectedHouseId);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onGameOverRef = useRef(onGameOver);
  const bestScoreRef = useRef<number>(0);
  const equippedMotoRef = useRef<string | undefined>(equippedMotoId);

  phaseRef.current = phase;
  skyPresetRef.current = skyPreset;
  inspectedHouseRef.current = inspectedHouseId;
  onHudUpdateRef.current = onHudUpdate;
  onGameOverRef.current = onGameOver;
  equippedMotoRef.current = equippedMotoId;

  const resetRunRef = useRef<(() => void) | null>(null);
  const updateSkyRef = useRef<((preset: SkyPreset) => void) | null>(null);
  const updateMotoRef = useRef<((id: string) => void) | null>(null);

  useEffect(() => {
    if (resetRunRef.current && runNonce > 0) {
      resetRunRef.current();
    }
  }, [runNonce]);

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
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;

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

    // Linear Fog Distance (50m -> 122m) smoothly hides distant object culling transitions with warm sunlit golden-peach tone
    const fogColor = new THREE.Color('#F7C8A0');
    scene.background = fogColor;
    scene.fog = new THREE.Fog(fogColor, FOG_DISTANCE_NEAR, FOG_DISTANCE_FAR);

    // Wide-angle cinematic perspective camera with tighter far plane for frustum culling optimization
    const camera = new THREE.PerspectiveCamera(68, initW / initH, 0.35, 290);
    camera.position.set(0, 2.75, 5.55);
    camera.lookAt(0, 2.1, -36);

    // 3. Natural Cartoon Illustration Lighting Rig (Soft lilac-blue sky fill + warm golden sun)
    const hemiLight = new THREE.HemisphereLight(0xd8b4fe, 0x3f6212, 0.88);
    hemiLight.position.set(0, 45, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.48);
    sunLight.position.set(16, 30, -28);
    sunLight.castShadow = false;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xfde68a, 0.65);
    rimLight.position.set(-14, 14, 18);
    scene.add(rimLight);

    // 4. Hand-Painted Digital Sky Dome (Soft Blue-Lilac-Rosy Gradient + Delicate Fluid Brushstrokes)
    const skyGeo = new THREE.SphereGeometry(250, 32, 20);
    const skyTex = createPainterlySkyTexture(skyPresetRef.current);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.position.set(0, -10, -45);
    scene.add(skyDome);

    // Clean Illustrated Horizon Sun (No smoky corona or particle fog)
    const realisticSun = buildRealisticHorizonSun();
    scene.add(realisticSun.group);

    // Clean Sky Group (Zero floating 3D smoke/fog clouds)
    const perspectiveClouds = buildPerspectiveSkyClouds(maxAniso);
    scene.add(perspectiveClouds.group);

    updateSkyRef.current = (nextPreset: SkyPreset) => {
      const newTex = createPainterlySkyTexture(nextPreset);
      if (skyMat.map) skyMat.map.dispose();
      skyMat.map = newTex;
      skyMat.needsUpdate = true;
      const nextFogHex =
        nextPreset === 'tropical_morning'
          ? '#BAE6FD'
          : nextPreset === 'sunset_dramatic'
            ? '#F7C8A0'
            : '#F5B8C8';
      fogColor.set(nextFogHex);
      worldCurveUniforms.uHorizonFogColor.value.copy(fogColor);
      scene.background = fogColor;
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.copy(fogColor);
      }
    };
    worldCurveUniforms.uHorizonFogColor.value.copy(fogColor);

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

    // 6. Wider Forward-Only Cracked Brazilian Asphalt Road (11.6m wide, starts at camera plane, zero geometry behind player!)
    const roadTex = createStreetRoadTexture(maxAniso);
    const roadBumpTex = createStreetRoadBumpTexture(maxAniso);

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      bumpMap: roadBumpTex,
      bumpScale: 0.05,
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.06,
    });
    applyWorldCurvatureToMaterial(roadMat);

    const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(11.6, 150, 4, 40), roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -69.5);
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
      scene.add(sw);

      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 150, 1, 1, 40), curbMat);
      curb.position.set(sideSign * 5.96, 0.12, -69.5);
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
      scene.add(leftBillboard, rightBillboard);
      billboardPairs.push({ leftZ, rightZ, leftBillboard, rightBillboard });
    }

    // 10. Birds, Parrots, Character and Coin systems removed per user request ("remove os passaros tambem os papagaio do jogo")!

    // 11. Moto do Jogador (Player Motorcycle) carregada dinamicamente
    let playerMotoInstance: MotoInstance | null = null;
    let currentLoadedMotoId = equippedMotoRef.current || 'cg160_titan';

    const loadPlayerMoto = (motoId: string) => {
      createMotoInstance(motoId, { scale: 1.0, castShadow: true, receiveShadow: true })
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
          playerMotoInstance.root.position.set(playerState.x, playerState.y, 0);
          playerMotoInstance.root.visible = phaseRef.current === 'playing' || phaseRef.current === 'paused';
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

    // 14. Game State, Smooth Camera Sway State & Reset Handler
    let playerState: PlayerState = createInitialPlayerState();
    let hitstopTimer = 0;
    let cameraTrauma = 0;
    let camRollAngle = 0; // Smooth banking angle when turning player
    let camRollImpulse = 0; // Impulse added on lane shift for cinematic sway
    let gaitCycle = 0;
    let hudEmitTimer = 0;
    let inspectedShowcaseMesh: THREE.Group | null = null;
    let lastInspectedId: number | null = null;

    const emitHud = (force = false) => {
      if (!force && hudEmitTimer < 0.1) return;
      hudEmitTimer = 0;

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

      onHudUpdateRef.current({
        score: roundedScore,
        bestScore: bestScoreRef.current,
        coins: playerState.coins,
        distance: Math.round(playerState.distance),
        hp: playerState.hp,
        maxHp: playerState.maxHp,
        combo: playerState.combo,
        speed: Math.round(playerState.speed * 3.6),
        housesPassed: playerState.housesPassed,
        leftHouseId: leftSpec.id,
        leftHouseName: leftSpec.name,
        rightHouseId: rightSpec.id,
        rightHouseName: rightSpec.name,
      });
    };

    const resetRun = () => {
      playerState = createInitialPlayerState();
      hitstopTimer = 0;
      cameraTrauma = 0;
      camRollAngle = 0;
      camRollImpulse = 0;
      gaitCycle = 0;
      emitHud(true);
    };

    resetRunRef.current = resetRun;
    resetRun();

    // 15. Camera Lane & Movement Controls (Sound & Shadow systems removed per user request!)
    const doShiftLeft = () => {
      if (phaseRef.current !== 'playing') return;
      const prevLane = playerState.lane;
      playerState = shiftLane(playerState, -1);
      if (playerState.lane !== prevLane) {
        camRollImpulse = 0.068;
      }
    };

    const doShiftRight = () => {
      if (phaseRef.current !== 'playing') return;
      const prevLane = playerState.lane;
      playerState = shiftLane(playerState, 1);
      if (playerState.lane !== prevLane) {
        camRollImpulse = -0.068;
      }
    };

    const doJump = () => {
      if (phaseRef.current !== 'playing') return;
      if (!playerState.isJumping) {
        playerState = triggerJump(playerState);
      }
    };

    const doRoll = () => {
      if (phaseRef.current !== 'playing') return;
      playerState = triggerRoll(playerState);
    };

    controlTriggerRef.current = {
      left: doShiftLeft,
      right: doShiftRight,
      jump: doJump,
      roll: doRoll,
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (phaseRef.current === 'playing') {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          e.preventDefault();
          doShiftLeft();
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          e.preventDefault();
          doShiftRight();
        } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
          e.preventDefault();
          doJump();
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          e.preventDefault();
          doRoll();
        }
      }
    };

    let touchStartX = 0;
    let touchStartY = 0;
    const onPointerDown = (e: PointerEvent) => {
      touchStartX = e.clientX;
      touchStartY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (phaseRef.current !== 'playing') return;
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

    // 16. Main Simulation & Render Loop with Software-WebGL `afterDraw` Pacing
    let frameId = 0;
    let isDisposed = false;
    let lastTime = performance.now();
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
      const rawDt = Math.max(0, (now - lastTime) / 1000);
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const elapsed = Math.max(0, (now - startTime) / 1000);
      const activePhase = phaseRef.current;

      // Update Realistic Horizon Sun, Perspective Cloud Lanes & Dynamic Horizon City Skyline
      const isActivelyRunning = activePhase === 'playing' && hitstopTimer <= 0;
      realisticSun.update(elapsed);
      perspectiveClouds.update(dt, elapsed, playerState.speed, isActivelyRunning);
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
        inspectedShowcaseMesh.rotation.y = Math.sin(elapsed * 0.75) * 0.36;
        _camTargetPos.set(0, 3.4, -1.8);
        _camLookAt.set(0, 2.6, -13.0);
        const camDamp = 1 - Math.exp(-10 * dt);
        camera.position.lerp(_camTargetPos, camDamp);
        currentCamLook.lerp(_camLookAt, camDamp);
        camera.lookAt(currentCamLook);
        camera.rotation.z = 0;
      } else if (activePhase === 'title') {
        _camTargetPos.set(0, 2.75, 5.55);
        _camLookAt.set(0, 2.1, -38);
        camera.position.lerp(_camTargetPos, 1 - Math.exp(-5 * dt));
        currentCamLook.lerp(_camLookAt, 1 - Math.exp(-5 * dt));
        camera.lookAt(currentCamLook);
        camera.rotation.z = 0;
      } else if (activePhase === 'playing') {
        if (hitstopTimer > 0) {
          hitstopTimer = Math.max(0, hitstopTimer - dt);
        } else {
          playerState = stepPlayerPhysics(playerState, dt);

          const moveZ = playerState.speed * dt;

          // Scroll street asphalt, bump map & sidewalk concrete textures synchronized with player speed
          roadTex.offset.y = (roadTex.offset.y + computeRoadTextureOffsetDelta(moveZ, 24.0)) % 1;
          roadBumpTex.offset.y = roadTex.offset.y;
          sidewalkTex.offset.y =
            (sidewalkTex.offset.y + computeRoadTextureOffsetDelta(moveZ, 20.0)) % 1;

          // Recycle physical 3D lane reflector studs & curb joints immediately when passing gameplay (z > 3.8)
          for (const row of streetMotionRows) {
            row.z += moveZ;
            if (row.z > BEHIND_GAMEPLAY_CULL_Z) {
              row.z -= NUM_STREET_MOTION_ROWS * STREET_MOTION_STEP_Z;
            }
            row.mesh.position.z = row.z;
          }

          // Recycle the 30 Brazilian house variations when completely behind the camera (z > 14.5)
          // and initialize recycled houses at opacity 0.0 so they materialize smoothly from the horizon!
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

          // Recycle hillside favela clusters immediately when passing gameplay (z > 3.8)
          for (const fPair of favelaPairs) {
            fPair.z += moveZ;
            if (fPair.z > BEHIND_GAMEPLAY_CULL_Z) {
              fPair.z -= NUM_FAVELA_PAIRS * FAVELA_STEP_Z;
            }
            fPair.leftFavela.position.z = fPair.z;
            fPair.rightFavela.position.z = fPair.z;
          }

          gaitCycle += moveZ * 1.25;
        }

        // Lower, More Immersive & Cinematic Chase Camera with Smooth Banking Sway & Speed FOV
        cameraTrauma = Math.max(0, cameraTrauma - 2.2 * dt);
        const shake = cameraTrauma * cameraTrauma;
        const shakeX = (Math.random() - 0.5) * shake * 0.65;
        const shakeY = (Math.random() - 0.5) * shake * 0.48;

        const targetFov = 68 + Math.max(0, playerState.speed - 15.5) * 0.45;
        if (Math.abs(camera.fov - targetFov) > 0.05) {
          camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-4 * dt));
          camera.updateProjectionMatrix();
        }

        const targetLaneX = laneToX(playerState.lane);
        const lateralDelta = targetLaneX - playerState.x;

        // Atualiza a moto 3D do jogador com esterçamento, inclinação lateral e giro de rodas
        if (playerMotoInstance) {
          const isPlayingOrPaused = activePhase === 'playing' || activePhase === 'paused';
          playerMotoInstance.root.visible = isPlayingOrPaused;

          if (isPlayingOrPaused) {
            playerMotoInstance.root.position.set(playerState.x, playerState.y, 0);

            const steerLean = lateralDelta * 1.5;
            const jumpPitch = playerState.isJumping ? Math.min(0.42, (playerState.vy + 5) * 0.04) : 0;

            playerMotoInstance.update(
              dt,
              isActivelyRunning ? playerState.speed : 0,
              steerLean,
              jumpPitch
            );
          }
        }

        _camTargetPos.set(
          playerState.x * 0.72 + shakeX,
          2.05 + playerState.y * 0.35 + shakeY,
          3.85,
        );
        _camLookAt.set(
          playerState.x * 0.45 + lateralDelta * 0.15,
          1.28 + playerState.y * 0.18,
          -32,
        );
        const camDamp = 1 - Math.exp(-8.5 * dt);
        camera.position.lerp(_camTargetPos, camDamp);
        currentCamLook.lerp(_camLookAt, camDamp);
        camera.lookAt(currentCamLook);

        // Keep camera roll zeroed so the horizon mountains never rock or sway
        camRollImpulse = 0;
        camRollAngle = 0;
        camera.rotation.z = 0;

        hudEmitTimer += dt;
        emitHud(false);
      }

      // Unified Automatic LOD (LOD0/LOD1/LOD2), Distance Culling, Forward-Only Culling & Occlusion Culling Pass
      const isInspectingCatalog = inspectedId !== null;
      for (let i = 0; i < activeHouseSlots.length; i++) {
        const slot = activeHouseSlots[i];
        if (isInspectingCatalog && slot.z >= -26) {
          slot.leftMesh.visible = false;
          slot.rightMesh.visible = false;
          continue;
        }
        const lodRes = computeObjectLodAndCulling(slot.z, 0, MAX_CULL_DISTANCE_HOUSE_Z);
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
        const lodRes = computeObjectLodAndCulling(fPair.z, 0, MAX_CULL_DISTANCE_FAVELA_Z);
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
        const lodRes = computeObjectLodAndCulling(pair.z, 0, MAX_CULL_DISTANCE_PROP_Z);
        pair.leftPole.visible = lodRes.visible;
        pair.rightPole.visible = lodRes.visible;
        if (lodRes.visible) {
          applyGroupLodState(pair.leftPole, lodRes.lod, false);
          applyGroupLodState(pair.rightPole, lodRes.lod, false);
        }
      }

      for (let i = 0; i < orelhaoPairs.length; i++) {
        const oPair = orelhaoPairs[i];
        const lod = computeObjectLodAndCulling(oPair.z, 0, MAX_CULL_DISTANCE_PROP_Z);
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
          MAX_CULL_DISTANCE_HOUSE_Z,
        );
        const rightLod = computeObjectLodAndCulling(
          bPair.rightZ,
          0,
          MAX_CULL_DISTANCE_HOUSE_Z,
        );
        const leftFade = computeHouseHorizonFadeFactor(bPair.leftZ, 0);
        const rightFade = computeHouseHorizonFadeFactor(bPair.rightZ, 0);
        bPair.leftBillboard.visible = leftLod.visible && leftFade > 0.02 && !isInspectingCatalog;
        bPair.rightBillboard.visible = rightLod.visible && rightFade > 0.02 && !isInspectingCatalog;
        if (bPair.leftBillboard.visible) {
          applyGroupLodState(bPair.leftBillboard, leftLod.lod, false);
          applyHouseDistanceOpacity(bPair.leftBillboard, leftFade);
        }
        if (bPair.rightBillboard.visible) {
          applyGroupLodState(bPair.rightBillboard, rightLod.lod, false);
          applyHouseDistanceOpacity(bPair.rightBillboard, rightFade);
        }
      }

      for (let i = 0; i < streetMotionRows.length; i++) {
        const row = streetMotionRows[i];
        const lodRes = computeObjectLodAndCulling(row.z, 0, MAX_CULL_DISTANCE_PROP_Z);
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
      window.removeEventListener('resize', onResize);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('pointerup', onPointerUp);
      if (playerMotoInstance) {
        playerMotoInstance.dispose();
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 w-full h-full overflow-hidden" />;
};
