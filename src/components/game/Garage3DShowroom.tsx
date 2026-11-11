import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMotoInstance, type MotoInstance } from '../../services/motoModelLoader';
import {
  MOTOBOYS_CATALOG,
  createMotoboyInstance,
  type MotoboyCharacterId,
  type MotoboyInstance,
} from '../../services/motoboyModelLoader';
import {
  createCarameloInstance,
  type CarameloInstance,
} from '../../services/carameloModelLoader';
import { HOUSE_VARIATIONS } from '../../game/rules';
import {
  createPainterlySkyTexture,
  createSidewalkTexture,
  createStreetRoadBumpTexture,
  createStreetRoadTexture,
  getHandPaintedDoorTexture,
  getHandPaintedGarageGateTexture,
  getHandPaintedRoofTexture,
  getHandPaintedWallTexture,
  getHandPaintedWindowTexture,
} from '../../game/textures';
import { Pause, Play, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

export type GarageShowroomMode = 'motos' | 'motoboys' | 'caramelos';

interface Garage3DShowroomProps {
  motoId: string;
  mode?: GarageShowroomMode;
  selectedMotoboyId?: MotoboyCharacterId;
  selectedCarameloId?: string;
  riderId?: MotoboyCharacterId | null;
  onSelectMotoboy?: (id: MotoboyCharacterId) => void;
  className?: string;
}

export const Garage3DShowroom: React.FC<Garage3DShowroomProps> = ({
  motoId,
  mode = 'motos',
  selectedMotoboyId = 'motoboy_1',
  selectedCarameloId = 'caramelo_default',
  riderId = null,
  onSelectMotoboy,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingMoto, setLoadingMoto] = useState(true);
  const [loadingCaramelo, setLoadingCaramelo] = useState(false);
  const [loadingMotoboys, setLoadingMotoboys] = useState(true);
  const [autoSpin, setAutoSpin] = useState(true);

  const motoTurntableRef = useRef<THREE.Group | null>(null);
  const motoboyStageHolderRef = useRef<THREE.Group | null>(null);
  const carameloStageHolderRef = useRef<THREE.Group | null>(null);
  const activeMotoRef = useRef<MotoInstance | null>(null);
  const activeMotoboyRef = useRef<MotoboyInstance | null>(null);
  const activeCarameloRef = useRef<CarameloInstance | null>(null);
  const autoSpinRef = useRef(true);
  const modeRef = useRef<GarageShowroomMode>(mode);
  const selectedMotoboyRef = useRef<MotoboyCharacterId>(selectedMotoboyId);
  const riderIdRef = useRef<MotoboyCharacterId | null>(riderId);
  const onSelectMotoboyRef = useRef(onSelectMotoboy);
  const turntableAngleRef = useRef(-0.62);
  const pilotAngleRef = useRef(0.0);
  const treadmillAngleRef = useRef(Math.PI * 0.76);
  const targetZoomRef = useRef(3.72);
  const currentZoomRef = useRef(3.72);
  const popScaleRef = useRef(1.0);
  const motoboyPopScaleRef = useRef(1.0);
  const carameloPopScaleRef = useRef(1.0);

  autoSpinRef.current = autoSpin;
  modeRef.current = mode;
  selectedMotoboyRef.current = selectedMotoboyId;
  riderIdRef.current = riderId;
  onSelectMotoboyRef.current = onSelectMotoboy;

  // 1. Monta o Cenário 3D Completo da Vila Tropical (Oficina + Pódio de Moto + Palco de Pilotos + Esteira Parada do Caramelo)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDisposed = false;
    let animId = 0;
    const loadedMotoboys = new Map<MotoboyCharacterId, MotoboyInstance>();
    const motoboyShadows = new Map<MotoboyCharacterId, THREE.Mesh>();

    const disposableGeometries: THREE.BufferGeometry[] = [];
    const disposableMaterials: THREE.Material[] = [];
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      disposableGeometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      disposableMaterials.push(m);
      return m;
    };

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 360;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const maxAniso = renderer.capabilities.getMaxAnisotropy() || 4;

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const fogColor = new THREE.Color('#F7C8A0');
    scene.background = fogColor;
    scene.fog = new THREE.Fog(fogColor, 16, 58);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.15, 120);
    camera.position.set(0, 1.18, currentZoomRef.current);
    camera.lookAt(0, 0.76, 0);

    // Iluminação de Estúdio Cartoon Aprimorada (Key + Fill Frontal + Rim Dourado para destacar detalhes e animações!)
    const hemiLight = new THREE.HemisphereLight(0xfef3c7, 0x3f6212, 1.22);
    hemiLight.position.set(0, 25, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.05);
    sunLight.position.set(7, 13, 9);
    scene.add(sunLight);

    const studioFrontFill = new THREE.DirectionalLight(0xffe4e6, 0.92);
    studioFrontFill.position.set(-3, 4.5, 8);
    scene.add(studioFrontFill);

    const rimLight = new THREE.DirectionalLight(0xfde047, 1.18);
    rimLight.position.set(-7, 6.5, -6);
    scene.add(rimLight);

    const inkLineMat = trackMat(
      new THREE.LineBasicMaterial({
        color: 0x1e1b18,
        transparent: true,
        opacity: 0.78,
      })
    );
    const inkHullMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x1e1b18,
        side: THREE.BackSide,
      })
    );

    const addBoxCartoonEdges = (mesh: THREE.Mesh, threshold = 24) => {
      const edges = trackGeo(new THREE.EdgesGeometry(mesh.geometry, threshold));
      const lines = new THREE.LineSegments(edges, inkLineMat);
      mesh.add(lines);
    };

    const addSphereCartoonHull = (mesh: THREE.Mesh, scale = 1.05) => {
      const hull = new THREE.Mesh(mesh.geometry, inkHullMat);
      hull.scale.setScalar(scale);
      mesh.add(hull);
    };

    // Domo de Céu Pintado à Mão
    const skyTex = createPainterlySkyTexture('sunset_dramatic');
    const skyMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: skyTex,
        side: THREE.BackSide,
        fog: false,
      })
    );
    const skyDome = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(55, 28, 18)), skyMat);
    skyDome.position.set(0, -4, -10);
    scene.add(skyDome);

    // Rua de Asfalto Brasileiro + Calçada + Meio-Fio
    const roadTex = createStreetRoadTexture(maxAniso);
    const roadBump = createStreetRoadBumpTexture(maxAniso);
    const roadMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: roadTex,
        bumpMap: roadBump,
        bumpScale: 0.04,
        roughness: 0.82,
        metalness: 0.05,
      })
    );
    const roadMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(24, 16)), roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, 2.2);
    scene.add(roadMesh);

    const sidewalkTex = createSidewalkTexture(maxAniso);
    const sidewalkMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: sidewalkTex,
        roughness: 0.85,
        metalness: 0.04,
      })
    );
    const sidewalkMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(24, 0.16, 10)), sidewalkMat);
    sidewalkMesh.position.set(0, 0.08, -6.2);
    addBoxCartoonEdges(sidewalkMesh);
    scene.add(sidewalkMesh);

    const curbMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.72,
      })
    );
    const curbMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(24, 0.19, 0.28)), curbMat);
    curbMesh.position.set(0, 0.095, -1.12);
    addBoxCartoonEdges(curbMesh);
    scene.add(curbMesh);

    // Sombra de contato compartilhada
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sctx = shadowCanvas.getContext('2d')!;
    const sgrad = sctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    sgrad.addColorStop(0, 'rgba(15, 10, 5, 0.65)');
    sgrad.addColorStop(0.65, 'rgba(15, 10, 5, 0.28)');
    sgrad.addColorStop(1, 'rgba(15, 10, 5, 0.0)');
    sctx.fillStyle = sgrad;
    sctx.fillRect(0, 0, 128, 128);
    const contactShadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadowMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
      })
    );

    // =========================================================================
    // PALCO 1: PÓDIO GIRATÓRIO EXCLUSIVO DAS MOTOS (SEM PILOTOS POLUINDO!)
    // =========================================================================
    const motoPodiumGroup = new THREE.Group();
    scene.add(motoPodiumGroup);

    const outerPodiumMat = trackMat(new THREE.MeshToonMaterial({ color: 0x9a3412 }));
    const outerPodium = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.28, 1.38, 0.09, 40)),
      outerPodiumMat
    );
    outerPodium.position.set(0, 0.045, 0.18);
    addBoxCartoonEdges(outerPodium, 28);
    motoPodiumGroup.add(outerPodium);

    const goldRingMat = trackMat(new THREE.MeshToonMaterial({ color: 0xfbbf24 }));
    const goldRing = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.19, 1.22, 0.105, 40)),
      goldRingMat
    );
    goldRing.position.set(0, 0.05, 0.18);
    motoPodiumGroup.add(goldRing);

    const innerStageMat = trackMat(new THREE.MeshToonMaterial({ color: 0x292524 }));
    const innerStage = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.12, 1.12, 0.115, 40)),
      innerStageMat
    );
    innerStage.position.set(0, 0.055, 0.18);
    motoPodiumGroup.add(innerStage);

    const motoShadowMesh = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(2.05, 1.05)),
      contactShadowMat
    );
    motoShadowMesh.rotation.x = -Math.PI / 2;
    motoShadowMesh.position.set(0, 0.116, 0.18);
    motoPodiumGroup.add(motoShadowMesh);

    const motoTurntable = new THREE.Group();
    motoTurntable.name = 'MotoTurntable';
    motoTurntable.position.set(0, 0.115, 0.18);
    motoPodiumGroup.add(motoTurntable);
    motoTurntableRef.current = motoTurntable;

    // =========================================================================
    // FACHADA DE FUNDO: OFICINA DA VILA + CASAS COLORIDAS
    // =========================================================================
    const backdropGroup = new THREE.Group();
    scene.add(backdropGroup);

    const specCenter = HOUSE_VARIATIONS[0];
    const specLeft = HOUSE_VARIATIONS[2] || HOUSE_VARIATIONS[0];
    const specRight = HOUSE_VARIATIONS[4] || HOUSE_VARIATIONS[1];

    const centerWallMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: getHandPaintedWallTexture(specCenter, false, maxAniso),
        roughness: 0.85,
      })
    );
    const centerBuilding = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.6, 3.6, 2.4)),
      centerWallMat
    );
    centerBuilding.position.set(0, 1.96, -4.6);
    addBoxCartoonEdges(centerBuilding);
    backdropGroup.add(centerBuilding);

    const clayRoofMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: getHandPaintedRoofTexture('#C2410C', 'colonial_clay', maxAniso),
        roughness: 0.8,
      })
    );
    const centerRoof = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.0, 0.34, 2.9)),
      clayRoofMat
    );
    centerRoof.position.set(0, 3.86, -4.5);
    centerRoof.rotation.x = 0.08;
    addBoxCartoonEdges(centerRoof);
    backdropGroup.add(centerRoof);

    const bayInteriorMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x3b1d0a }));
    const bayInterior = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.3, 2.35, 0.12)),
      bayInteriorMat
    );
    bayInterior.position.set(0, 1.32, -3.38);
    addBoxCartoonEdges(bayInterior);
    backdropGroup.add(bayInterior);

    const gateMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: getHandPaintedGarageGateTexture('#0284c7'),
        roughness: 0.65,
      })
    );
    const rolledGate = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.42, 0.52, 0.24)),
      gateMat
    );
    rolledGate.position.set(0, 2.42, -3.32);
    addBoxCartoonEdges(rolledGate);
    backdropGroup.add(rolledGate);

    const signBoardMat = trackMat(new THREE.MeshToonMaterial({ color: 0x7c2d12 }));
    const signBoard = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.2, 0.56, 0.16)),
      signBoardMat
    );
    signBoard.position.set(0, 3.18, -3.32);
    addBoxCartoonEdges(signBoard);
    backdropGroup.add(signBoard);

    const signTrim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.0, 0.38, 0.18)),
      goldRingMat
    );
    signTrim.position.set(0, 3.18, -3.31);
    backdropGroup.add(signTrim);

    const leftHouseMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: getHandPaintedWallTexture(specLeft, false, maxAniso),
        roughness: 0.85,
      })
    );
    const leftHouse = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.6, 4.4, 2.6)),
      leftHouseMat
    );
    leftHouse.position.set(-5.25, 2.36, -5.0);
    addBoxCartoonEdges(leftHouse);
    backdropGroup.add(leftHouse);

    const leftRoof = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.9, 0.32, 3.0)),
      clayRoofMat
    );
    leftRoof.position.set(-5.25, 4.68, -4.9);
    leftRoof.rotation.x = 0.06;
    addBoxCartoonEdges(leftRoof);
    backdropGroup.add(leftRoof);

    const winMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: getHandPaintedWindowTexture('#0284c7', true, false),
        roughness: 0.7,
      })
    );
    const leftWin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.95, 0.12)), winMat);
    leftWin.position.set(-4.3, 2.9, -3.68);
    addBoxCartoonEdges(leftWin);
    backdropGroup.add(leftWin);

    const doorMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: getHandPaintedDoorTexture('#b45309'),
        roughness: 0.75,
      })
    );
    const leftDoor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 1.95, 0.12)), doorMat);
    leftDoor.position.set(-4.3, 1.14, -3.68);
    addBoxCartoonEdges(leftDoor);
    backdropGroup.add(leftDoor);

    const rightHouseMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: getHandPaintedWallTexture(specRight, false, maxAniso),
        roughness: 0.85,
      })
    );
    const rightHouse = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.6, 3.9, 2.6)),
      rightHouseMat
    );
    rightHouse.position.set(5.25, 2.11, -5.0);
    addBoxCartoonEdges(rightHouse);
    backdropGroup.add(rightHouse);

    const rightRoof = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.9, 0.32, 3.0)),
      clayRoofMat
    );
    rightRoof.position.set(5.25, 4.18, -4.9);
    rightRoof.rotation.x = 0.06;
    addBoxCartoonEdges(rightRoof);
    backdropGroup.add(rightRoof);

    const rightWin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.15, 0.95, 0.12)), winMat);
    rightWin.position.set(4.25, 2.25, -3.68);
    addBoxCartoonEdges(rightWin);
    backdropGroup.add(rightWin);

    const foliageMat1 = trackMat(new THREE.MeshToonMaterial({ color: 0x22c55e }));
    const foliageMat2 = trackMat(new THREE.MeshToonMaterial({ color: 0x16a34a }));
    const bushGeo = trackGeo(new THREE.SphereGeometry(0.55, 14, 12));
    const bushCoords: Array<[number, number, number, number, THREE.Material]> = [
      [-2.85, 0.48, -2.95, 1.0, foliageMat1],
      [-3.35, 0.38, -2.75, 0.78, foliageMat2],
      [2.85, 0.48, -2.95, 1.0, foliageMat1],
      [3.35, 0.38, -2.75, 0.78, foliageMat2],
    ];
    for (const [bx, by, bz, bs, bmat] of bushCoords) {
      const bush = new THREE.Mesh(bushGeo, bmat);
      bush.position.set(bx, by, bz);
      bush.scale.setScalar(bs);
      addSphereCartoonHull(bush, 1.055);
      backdropGroup.add(bush);
    }

    // =========================================================================
    // PALCO 2: GARAGEM DOS PILOTOS (SEM MOTO! SELECIONADO À FRENTE, OUTROS DESFOCADOS ATRÁS!)
    // =========================================================================
    const motoboysStageGroup = new THREE.Group();
    motoboysStageGroup.name = 'MotoboysOnlyStage';
    motoboysStageGroup.visible = false;
    scene.add(motoboysStageGroup);

    const frontSpotlightRingMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xfde047 }));
    const frontSpotlightRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.46, 0.58, 36)),
      frontSpotlightRingMat
    );
    frontSpotlightRing.rotation.x = -Math.PI / 2;
    frontSpotlightRing.position.set(0, 0.012, 0.68);
    motoboysStageGroup.add(frontSpotlightRing);

    const frontSpotlightBorderMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x110c08 }));
    const frontSpotlightBorder = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.58, 0.63, 36)),
      frontSpotlightBorderMat
    );
    frontSpotlightBorder.rotation.x = -Math.PI / 2;
    frontSpotlightBorder.position.set(0, 0.013, 0.68);
    motoboysStageGroup.add(frontSpotlightBorder);

    const mbShadowGeo = trackGeo(new THREE.PlaneGeometry(1.1, 1.1));
    const singlePilotShadow = new THREE.Mesh(mbShadowGeo, contactShadowMat);
    singlePilotShadow.rotation.x = -Math.PI / 2;
    singlePilotShadow.position.set(0, 0.006, 0.56);
    motoboysStageGroup.add(singlePilotShadow);

    const motoboyStageHolder = new THREE.Group();
    motoboyStageHolder.position.set(0, 0, 0.56);
    motoboysStageGroup.add(motoboyStageHolder);
    motoboyStageHolderRef.current = motoboyStageHolder;

    // =========================================================================
    // PALCO 3: ESTEIRA 3D PARADA EXCLUSIVA DO CARAMELO (SEM PERSONAGENS!)
    // =========================================================================
    const treadmillStageGroup = new THREE.Group();
    treadmillStageGroup.name = 'CarameloTreadmillStage';
    treadmillStageGroup.position.set(0, 0.01, 0.22);
    treadmillStageGroup.rotation.y = treadmillAngleRef.current;
    treadmillStageGroup.visible = false;
    scene.add(treadmillStageGroup);

    const tmShadow = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.48, 2.35)),
      contactShadowMat
    );
    tmShadow.rotation.x = -Math.PI / 2;
    tmShadow.position.set(0, 0.004, 0);
    treadmillStageGroup.add(tmShadow);

    const tmChassisMat = trackMat(new THREE.MeshToonMaterial({ color: 0x1e293b }));
    const tmAccentOrangeMat = trackMat(new THREE.MeshToonMaterial({ color: 0xf97316 }));
    const tmSafetyAmberMat = trackMat(new THREE.MeshToonMaterial({ color: 0xfbbf24 }));
    const tmRollerSteelMat = trackMat(new THREE.MeshToonMaterial({ color: 0x94a3b8 }));

    const tmDeck = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.04, 0.13, 1.94)),
      tmChassisMat
    );
    tmDeck.position.set(0, 0.08, 0);
    addBoxCartoonEdges(tmDeck);
    treadmillStageGroup.add(tmDeck);

    for (const side of [-1, 1]) {
      const sideRail = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.13, 0.165, 1.98)),
        tmAccentOrangeMat
      );
      sideRail.position.set(side * 0.485, 0.095, 0);
      addBoxCartoonEdges(sideRail);
      treadmillStageGroup.add(sideRail);

      const gripStrip = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.06, 0.02, 1.72)),
        tmSafetyAmberMat
      );
      gripStrip.position.set(side * 0.485, 0.184, 0.04);
      addBoxCartoonEdges(gripStrip);
      treadmillStageGroup.add(gripStrip);
    }

    const rollerGeo = trackGeo(new THREE.CylinderGeometry(0.068, 0.068, 0.84, 16));
    const frontRoller = new THREE.Mesh(rollerGeo, tmRollerSteelMat);
    frontRoller.rotation.z = Math.PI / 2;
    frontRoller.position.set(0, 0.09, -0.92);
    addBoxCartoonEdges(frontRoller, 32);
    treadmillStageGroup.add(frontRoller);

    const rearRoller = new THREE.Mesh(rollerGeo, tmRollerSteelMat);
    rearRoller.rotation.z = Math.PI / 2;
    rearRoller.position.set(0, 0.09, 0.92);
    addBoxCartoonEdges(rearRoller, 32);
    treadmillStageGroup.add(rearRoller);

    // Lona da Esteira (Totalmente Parada conforme solicitado!)
    const beltCanvas = document.createElement('canvas');
    beltCanvas.width = 256;
    beltCanvas.height = 256;
    const bctx = beltCanvas.getContext('2d')!;
    bctx.fillStyle = '#1f242d';
    bctx.fillRect(0, 0, 256, 256);
    bctx.fillStyle = '#2b323f';
    for (let y = 0; y < 256; y += 32) {
      bctx.fillRect(18, y, 220, 12);
    }
    bctx.fillStyle = '#fbbf24';
    bctx.fillRect(8, 0, 10, 256);
    bctx.fillRect(238, 0, 10, 256);

    const treadmillBeltTex = new THREE.CanvasTexture(beltCanvas);
    treadmillBeltTex.colorSpace = THREE.SRGBColorSpace;
    treadmillBeltTex.wrapS = THREE.RepeatWrapping;
    treadmillBeltTex.wrapT = THREE.RepeatWrapping;
    treadmillBeltTex.repeat.set(1, 2.4);

    const beltMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: treadmillBeltTex,
        roughness: 0.78,
        metalness: 0.05,
      })
    );
    const runningBelt = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.8, 1.82)),
      beltMat
    );
    runningBelt.rotation.x = -Math.PI / 2;
    runningBelt.position.set(0, 0.148, 0);
    treadmillStageGroup.add(runningBelt);

    for (const side of [-1, 1]) {
      const upright = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.075, 0.92, 0.075)),
        tmChassisMat
      );
      upright.position.set(side * 0.46, 0.54, -0.83);
      upright.rotation.x = 0.14;
      addBoxCartoonEdges(upright);
      treadmillStageGroup.add(upright);

      const handrail = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.065, 0.065, 0.56)),
        tmSafetyAmberMat
      );
      handrail.position.set(side * 0.46, 0.93, -0.58);
      handrail.rotation.x = 0.08;
      addBoxCartoonEdges(handrail);
      treadmillStageGroup.add(handrail);
    }

    const consoleCanvas = document.createElement('canvas');
    consoleCanvas.width = 256;
    consoleCanvas.height = 96;
    const cctx = consoleCanvas.getContext('2d')!;
    cctx.fillStyle = '#0f172a';
    cctx.fillRect(0, 0, 256, 96);
    cctx.strokeStyle = '#fbbf24';
    cctx.lineWidth = 6;
    cctx.strokeRect(4, 4, 248, 88);
    cctx.fillStyle = '#38bdf8';
    cctx.font = '900 28px sans-serif';
    cctx.textAlign = 'center';
    cctx.fillText('🐕 CARAMELO VIP', 128, 42);
    cctx.fillStyle = '#4ade80';
    cctx.font = '900 20px monospace';
    cctx.fillText('ESTEIRA ATIVA • RUN', 128, 74);

    const consoleTex = new THREE.CanvasTexture(consoleCanvas);
    consoleTex.colorSpace = THREE.SRGBColorSpace;

    const consoleBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.98, 0.24, 0.14)),
      tmChassisMat
    );
    consoleBody.position.set(0, 0.98, -0.89);
    consoleBody.rotation.x = -0.45;
    addBoxCartoonEdges(consoleBody);
    treadmillStageGroup.add(consoleBody);

    const consoleScreenMat = trackMat(new THREE.MeshBasicMaterial({ map: consoleTex }));
    const consoleScreen = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.84, 0.18)),
      consoleScreenMat
    );
    consoleScreen.position.set(0, 0.995, -0.816);
    consoleScreen.rotation.x = -0.45;
    treadmillStageGroup.add(consoleScreen);

    const dogBeltShadow = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.68, 0.98)),
      contactShadowMat
    );
    dogBeltShadow.rotation.x = -Math.PI / 2;
    dogBeltShadow.position.set(0, 0.151, 0.06);
    treadmillStageGroup.add(dogBeltShadow);

    const carameloStageHolder = new THREE.Group();
    carameloStageHolder.position.set(0, 0.152, 0.06);
    treadmillStageGroup.add(carameloStageHolder);
    carameloStageHolderRef.current = carameloStageHolder;

    // Interação de Rotação Manual + Clique nos Pilotos de Fundo
    let isDragging = false;
    let dragDistance = 0;
    let prevX = 0;
    let downClientX = 0;

    // Posições de arco para os 4 pilotos desfocados ao fundo
    const bgSlots: Array<[number, number, number]> = [
      [-1.58, -0.92, 0.28],
      [-0.64, -1.24, 0.12],
      [0.64, -1.24, -0.12],
      [1.58, -0.92, -0.28],
    ];

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragDistance = 0;
      prevX = e.clientX;
      downClientX = e.clientX;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      dragDistance += Math.abs(dx);
      if (modeRef.current === 'caramelos') {
        treadmillAngleRef.current += dx * 0.013;
      } else if (modeRef.current === 'motoboys') {
        pilotAngleRef.current += dx * 0.014;
      } else {
        turntableAngleRef.current += dx * 0.013;
      }
      prevX = e.clientX;
    };

    const onPointerUp = () => {
      if (
        isDragging &&
        dragDistance < 6 &&
        modeRef.current === 'motoboys' &&
        onSelectMotoboyRef.current
      ) {
        const rect = dom.getBoundingClientRect();
        const relX = (downClientX - rect.left) / Math.max(1, rect.width);
        const curIdx = MOTOBOYS_CATALOG.findIndex((m) => m.id === selectedMotoboyRef.current);
        if (relX < 0.36) {
          const prevIdx = (curIdx - 1 + MOTOBOYS_CATALOG.length) % MOTOBOYS_CATALOG.length;
          pilotAngleRef.current = 0;
          onSelectMotoboyRef.current(MOTOBOYS_CATALOG[prevIdx].id);
        } else if (relX > 0.64) {
          const nextIdx = (curIdx + 1) % MOTOBOYS_CATALOG.length;
          pilotAngleRef.current = 0;
          onSelectMotoboyRef.current(MOTOBOYS_CATALOG[nextIdx].id);
        }
      }
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetZoomRef.current = THREE.MathUtils.clamp(
        targetZoomRef.current + e.deltaY * 0.0022,
        2.55,
        4.65
      );
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Loop de Renderização (Zero GC Alloc)
    let lastTime = performance.now();
    let currentLookY = 0.78;

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const curMode = modeRef.current;
      const isCarameloStage = curMode === 'caramelos';
      const isMotoboyStage = curMode === 'motoboys';
      const isMotoStage = curMode === 'motos';

      // Separação 100% limpa entre os 3 palcos da Garagem!
      motoPodiumGroup.visible = isMotoStage;
      motoboysStageGroup.visible = isMotoboyStage;
      treadmillStageGroup.visible = isCarameloStage;

      if (isCarameloStage) {
        // ESTEIRA DE LADO (perfil lateral) COM O CARAMELO CORRENDO FLUIDAMENTE NA ESTEIRA!
        treadmillStageGroup.rotation.y = treadmillAngleRef.current;
        treadmillBeltTex.offset.y = (treadmillBeltTex.offset.y + dt * 2.55) % 1;
        frontRoller.rotation.x = (frontRoller.rotation.x - dt * 15.0) % (Math.PI * 2);
        rearRoller.rotation.x = (rearRoller.rotation.x - dt * 15.0) % (Math.PI * 2);

        carameloPopScaleRef.current = THREE.MathUtils.lerp(
          carameloPopScaleRef.current,
          1.0,
          Math.min(1, 12 * dt)
        );
        carameloStageHolder.scale.setScalar(carameloPopScaleRef.current);

        if (activeCarameloRef.current) {
          // Galope quadrúpede natural sincronizado com a velocidade da lona (+ drones Cyber flutuando!)
          activeCarameloRef.current.update(dt, 16.5, 0, 0, false);
        }
      } else if (isMotoboyStage) {
        // PALCO EXCLUSIVO DO PILOTO SELECIONADO (Carregado sob demanda, inteiro e centralizado!)
        motoboyPopScaleRef.current = THREE.MathUtils.lerp(
          motoboyPopScaleRef.current,
          1.0,
          Math.min(1, 12 * dt)
        );
        motoboyStageHolder.scale.setScalar(motoboyPopScaleRef.current);
        motoboyStageHolder.rotation.y = pilotAngleRef.current;
        if (activeMotoboyRef.current) {
          activeMotoboyRef.current.setFocusState(true, dt);
          activeMotoboyRef.current.update(dt);
        }
      } else {
        // PALCO EXCLUSIVO DAS MOTOS
        if (autoSpinRef.current && !isDragging) {
          turntableAngleRef.current += dt * 0.55;
        }
        motoTurntable.rotation.y = turntableAngleRef.current;

        popScaleRef.current = THREE.MathUtils.lerp(popScaleRef.current, 1.0, Math.min(1, 12 * dt));
        motoTurntable.scale.setScalar(popScaleRef.current);

        if (activeMotoRef.current) {
          activeMotoRef.current.update(dt, 0, 0, 0);
        }
      }

      const targetLookY = isCarameloStage ? 0.62 : isMotoboyStage ? 0.92 : 0.76;
      currentLookY = THREE.MathUtils.lerp(currentLookY, targetLookY, Math.min(1, 8 * dt));

      currentZoomRef.current = THREE.MathUtils.lerp(
        currentZoomRef.current,
        targetZoomRef.current,
        Math.min(1, 10 * dt)
      );
      camera.position.z = currentZoomRef.current;
      camera.lookAt(0, currentLookY, 0);

      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    const resizeObserver = new ResizeObserver(() => {
      if (!container || isDisposed) return;
      const w = container.clientWidth || 520;
      const h = container.clientHeight || 360;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);

      if (activeMotoRef.current) {
        activeMotoRef.current.dispose();
        activeMotoRef.current = null;
      }
      if (activeMotoboyRef.current) {
        activeMotoboyRef.current.dispose();
        activeMotoboyRef.current = null;
      }
      if (activeCarameloRef.current) {
        activeCarameloRef.current.dispose();
        activeCarameloRef.current = null;
      }
      for (const mb of loadedMotoboys.values()) {
        mb.dispose();
      }
      loadedMotoboys.clear();

      treadmillBeltTex.dispose();
      consoleTex.dispose();
      contactShadowTex.dispose();
      skyTex.dispose();
      envTexture.dispose();
      for (const g of disposableGeometries) g.dispose();
      for (const m of disposableMaterials) m.dispose();

      renderer.dispose();
      if (dom.parentElement) {
        dom.parentElement.removeChild(dom);
      }
    };
  }, []);

  // Ajusta o zoom e ângulo ao alternar entre as 3 abas limpas da Garagem (modelos inteiros, sem cortes na cabeça ou rodas!)
  useEffect(() => {
    if (mode === 'caramelos') {
      treadmillAngleRef.current = -Math.PI * 0.48;
      targetZoomRef.current = 3.15;
    } else if (mode === 'motoboys') {
      pilotAngleRef.current = 0;
      targetZoomRef.current = 3.28;
    } else {
      targetZoomRef.current = 3.72;
    }
  }, [mode]);

  useEffect(() => {
    pilotAngleRef.current = 0;
  }, [selectedMotoboyId]);

  // 2. Carregamento Sob Demanda da Moto (somente quando a aba 'motos' estiver ativa!)
  useEffect(() => {
    if (mode !== 'motos') {
      if (activeMotoRef.current && motoTurntableRef.current) {
        motoTurntableRef.current.remove(activeMotoRef.current.root);
        activeMotoRef.current.dispose();
        activeMotoRef.current = null;
      }
      setLoadingMoto(false);
      return;
    }
    let cancelled = false;
    setLoadingMoto(true);

    createMotoInstance(motoId, {
      scale: 1.04,
      castShadow: false,
      receiveShadow: false,
      riderId: null,
    })
      .then((instance) => {
        if (cancelled) {
          instance.dispose();
          return;
        }
        const turntable = motoTurntableRef.current;
        if (!turntable) {
          instance.dispose();
          return;
        }

        if (activeMotoRef.current) {
          turntable.remove(activeMotoRef.current.root);
          activeMotoRef.current.dispose();
        }

        activeMotoRef.current = instance;
        instance.root.position.set(0, 0, 0);
        turntable.add(instance.root);
        popScaleRef.current = 0.86;
        setLoadingMoto(false);
      })
      .catch((err) => {
        console.error('[Garage3DShowroom] Erro ao trocar moto:', err);
        if (!cancelled) setLoadingMoto(false);
      });

    return () => {
      cancelled = true;
    };
  }, [motoId, mode]);

  // 2B. Carregamento Sob Demanda do Piloto Selecionado (somente quando a aba 'motoboys' estiver ativa!)
  useEffect(() => {
    if (mode !== 'motoboys') {
      if (activeMotoboyRef.current && motoboyStageHolderRef.current) {
        motoboyStageHolderRef.current.remove(activeMotoboyRef.current.root);
        activeMotoboyRef.current.dispose();
        activeMotoboyRef.current = null;
      }
      setLoadingMotoboys(false);
      return;
    }
    let cancelled = false;
    setLoadingMotoboys(true);

    createMotoboyInstance(selectedMotoboyId, { targetHeight: 1.58 })
      .then((instance) => {
        if (cancelled) {
          instance.dispose();
          return;
        }
        const holder = motoboyStageHolderRef.current;
        if (!holder) {
          instance.dispose();
          return;
        }
        if (activeMotoboyRef.current) {
          holder.remove(activeMotoboyRef.current.root);
          activeMotoboyRef.current.dispose();
        }
        activeMotoboyRef.current = instance;
        instance.root.position.set(0, 0, 0);
        holder.add(instance.root);
        motoboyPopScaleRef.current = 0.86;
        setLoadingMotoboys(false);
      })
      .catch((err) => {
        console.error('[Garage3DShowroom] Erro ao trocar piloto:', err);
        if (!cancelled) setLoadingMotoboys(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMotoboyId, mode]);

  // 3. Carregamento Sob Demanda do Caramelo na Esteira (somente quando a aba 'caramelos' estiver ativa!)
  useEffect(() => {
    if (mode !== 'caramelos') {
      if (activeCarameloRef.current && carameloStageHolderRef.current) {
        carameloStageHolderRef.current.remove(activeCarameloRef.current.root);
        activeCarameloRef.current.dispose();
        activeCarameloRef.current = null;
      }
      setLoadingCaramelo(false);
      return;
    }
    let cancelled = false;
    setLoadingCaramelo(true);

    createCarameloInstance(selectedCarameloId, { targetHeight: 0.88 })
      .then((instance) => {
        if (cancelled) {
          instance.dispose();
          return;
        }
        const holder = carameloStageHolderRef.current;
        if (!holder) {
          instance.dispose();
          return;
        }

        if (activeCarameloRef.current) {
          holder.remove(activeCarameloRef.current.root);
          activeCarameloRef.current.dispose();
        }

        activeCarameloRef.current = instance;
        instance.root.position.set(0, 0, 0);
        holder.add(instance.root);
        carameloPopScaleRef.current = 0.85;
        setLoadingCaramelo(false);
      })
      .catch((err) => {
        console.error('[Garage3DShowroom] Erro ao trocar Caramelo na esteira:', err);
        if (!cancelled) setLoadingCaramelo(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCarameloId, mode]);

  const isStageLoading =
    (mode === 'caramelos' && loadingCaramelo) ||
    (mode === 'motoboys' && loadingMotoboys) ||
    (mode === 'motos' && loadingMoto);

  return (
    <div className={`relative w-full h-full min-h-[260px] sm:min-h-[330px] select-none ${className}`}>
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Indicador leve apenas durante o carregamento */}
      {isStageLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-950/45 backdrop-blur-[2px] z-10 pointer-events-none">
          <div className="cartoon-wood-plank px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
            <div className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
            <span className="text-[11px] font-black uppercase text-amber-200 tracking-wider cartoon-text-outline">
              Carregando...
            </span>
          </div>
        </div>
      )}

      {/* Controles Limpos de Zoom/Giro no Canto Superior Direito */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            targetZoomRef.current = Math.max(2.25, targetZoomRef.current - 0.35);
          }}
          title="Aproximar Zoom"
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl cartoon-btn-wood flex items-center justify-center cursor-pointer shadow-md"
        >
          <ZoomIn className="w-5 h-5 sm:w-4 sm:h-4 text-amber-300" />
        </button>
        <button
          type="button"
          onClick={() => {
            targetZoomRef.current = Math.min(4.65, targetZoomRef.current + 0.35);
          }}
          title="Afastar Zoom"
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl cartoon-btn-wood flex items-center justify-center cursor-pointer shadow-md"
        >
          <ZoomOut className="w-5 h-5 sm:w-4 sm:h-4 text-amber-300" />
        </button>
        {mode === 'motos' && (
          <button
            type="button"
            onClick={() => setAutoSpin((prev) => !prev)}
            title={autoSpin ? 'Pausar Giro' : 'Girar 360°'}
            className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl cartoon-btn-wood flex items-center justify-center cursor-pointer shadow-md"
          >
            {autoSpin ? (
              <Pause className="w-5 h-5 sm:w-4 sm:h-4 text-amber-300" />
            ) : (
              <Play className="w-5 h-5 sm:w-4 sm:h-4 text-emerald-300 fill-emerald-300" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
