import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMotoInstance } from './motoModelLoader';
import { createMotoboyInstance, type MotoboyCharacterId } from './motoboyModelLoader';
import { createCarameloInstance } from './carameloModelLoader';
import { HOUSE_VARIATIONS } from '../game/rules';
import {
  buildBeachSandAndOceanBackdrop,
  buildBeachfrontPropCluster,
  buildBrazilianHouse,
  buildCoastalCondominiumBuilding,
  buildCoastalHorizonCitySkyline,
  buildCorcovadoAndCristoRedentor,
  buildHillsideFavelaCluster,
  buildHorizonCitySkyline,
  buildLeftCoastalRetainingWallSegment,
  buildUtilityPoleWithWires,
} from '../game/builders';
import {
  createCopacabanaWaveSidewalkTexture,
  createPainterlySkyTexture,
  createSidewalkTexture,
  createStreetRoadTexture,
} from '../game/textures';

const thumbCache = new Map<string, string>();
const pendingMap = new Map<string, Promise<string>>();

let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedEnvTexture: THREE.Texture | null = null;
let renderQueue: Promise<void> = Promise.resolve();

function getSharedOffscreenRenderer(width: number, height: number): {
  renderer: THREE.WebGLRenderer;
  envTex: THREE.Texture;
} {
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    sharedRenderer.outputColorSpace = THREE.SRGBColorSpace;
    sharedRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    sharedRenderer.toneMappingExposure = 1.14;
    sharedRenderer.setPixelRatio(1);

    const pmrem = new THREE.PMREMGenerator(sharedRenderer);
    sharedEnvTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  sharedRenderer.setSize(width, height, false);
  return { renderer: sharedRenderer, envTex: sharedEnvTexture! };
}

function enqueueRenderTask<T>(task: () => Promise<T>): Promise<T> {
  const next = renderQueue.then(task, task);
  renderQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function createStudioContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 58);
  grad.addColorStop(0, 'rgba(10, 6, 4, 0.72)');
  grad.addColorStop(0.55, 'rgba(10, 6, 4, 0.32)');
  grad.addColorStop(1, 'rgba(10, 6, 4, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

let cachedShadowTex: THREE.CanvasTexture | null = null;
function getContactShadowTex(): THREE.CanvasTexture {
  if (!cachedShadowTex) {
    cachedShadowTex = createStudioContactShadowTexture();
  }
  return cachedShadowTex;
}

/**
 * Renderiza o modelo 3D real de cada motocicleta em um pequeno estúdio individual bem iluminado,
 * centralizado e com sombra de contato no piso.
 */
export function getOrRenderMoto3DCardThumb(motoId: string): Promise<string> {
  const cacheKey = `moto_3d_${motoId}`;
  const cached = thumbCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const pending = pendingMap.get(cacheKey);
  if (pending) return pending;

  const job = enqueueRenderTask(async () => {
    const existing = thumbCache.get(cacheKey);
    if (existing) return existing;

    const W = 280;
    const H = 190;
    const { renderer, envTex } = getSharedOffscreenRenderer(W, H);

    const scene = new THREE.Scene();
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 40);

    const hemi = new THREE.HemisphereLight(0xfff7ed, 0x1e293b, 1.35);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.35);
    keyLight.position.set(4.5, 6.5, 5.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 1.05);
    fillLight.position.set(-4.0, 3.2, 4.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfbbf24, 1.45);
    rimLight.position.set(-3.5, 4.8, -5.0);
    scene.add(rimLight);

    // Piso individual discreto de estúdio + sombra de contato
    const pedestalGeo = new THREE.CylinderGeometry(1.08, 1.16, 0.06, 36);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x26211d,
      roughness: 0.65,
      metalness: 0.18,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, -0.03, 0);
    scene.add(pedestal);

    const ringGeo = new THREE.RingGeometry(0.98, 1.05, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.002, 0);
    scene.add(ring);

    const shadowGeo = new THREE.PlaneGeometry(1.9, 1.05);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: getContactShadowTex(),
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, 0.004, 0);
    scene.add(shadowMesh);

    const motoInstance = await createMotoInstance(motoId, {
      scale: 1.0,
      castShadow: false,
      receiveShadow: false,
      riderId: null,
    });

    // Ângulo 3/4 lateral-frontal clássico de showroom valorizando toda a silhueta 3D da moto
    motoInstance.root.rotation.set(0, -1.04, 0);
    scene.add(motoInstance.root);
    motoInstance.root.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(motoInstance.root);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    motoInstance.root.position.x -= center.x;
    motoInstance.root.position.z -= center.z;
    motoInstance.root.position.y -= box.min.y;
    shadowMesh.rotation.y = -1.04;

    const maxSpan = Math.max(size.x, size.y * 1.35, size.z, 1.1);
    const dist = maxSpan * 1.48;
    camera.position.set(0, size.y * 0.62 + 0.16, dist);
    camera.lookAt(0, size.y * 0.45, 0);

    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    // Compõe sobre fundo de estúdio cinematográfico individual
    const outCanvas = document.createElement('canvas');
    outCanvas.width = W;
    outCanvas.height = H;
    const ctx = outCanvas.getContext('2d')!;

    const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.48, 12, W * 0.5, H * 0.52, W * 0.65);
    bgGrad.addColorStop(0, '#3b2314');
    bgGrad.addColorStop(0.58, '#1f130c');
    bgGrad.addColorStop(1, '#110a06');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Luz suave de horizonte no fundo do mini-estúdio
    const floorGlow = ctx.createLinearGradient(0, H * 0.55, 0, H);
    floorGlow.addColorStop(0, 'rgba(245, 158, 11, 0.0)');
    floorGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.10)');
    floorGlow.addColorStop(1, 'rgba(10, 6, 4, 0.65)');
    ctx.fillStyle = floorGlow;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    ctx.drawImage(renderer.domElement, 0, 0, W, H);

    motoInstance.dispose();
    pedestalGeo.dispose();
    pedestalMat.dispose();
    ringGeo.dispose();
    ringMat.dispose();
    shadowGeo.dispose();
    shadowMat.dispose();

    const dataUrl = outCanvas.toDataURL('image/png');
    thumbCache.set(cacheKey, dataUrl);
    pendingMap.delete(cacheKey);
    return dataUrl;
  });

  pendingMap.set(cacheKey, job);
  return job;
}

/**
 * Renderiza retrato de perfil diretamente do modelo 3D real do personagem (Piloto Motoboy),
 * centralizado no busto/rosto com iluminação de estúdio.
 */
export function getOrRenderMotoboy3DPortrait(motoboyId: MotoboyCharacterId): Promise<string> {
  const cacheKey = `motoboy_3d_front_v3_${motoboyId}`;
  const cached = thumbCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const pending = pendingMap.get(cacheKey);
  if (pending) return pending;

  const job = enqueueRenderTask(async () => {
    const existing = thumbCache.get(cacheKey);
    if (existing) return existing;

    const W = 220;
    const H = 220;
    const { renderer, envTex } = getSharedOffscreenRenderer(W, H);

    const scene = new THREE.Scene();
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(26, W / H, 0.1, 30);

    const hemi = new THREE.HemisphereLight(0xfffbeb, 0x334155, 1.55);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.35);
    keyLight.position.set(2.8, 4.2, 4.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.25);
    fillLight.position.set(-3.0, 2.5, 3.8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfde047, 1.35);
    rimLight.position.set(0, 3.8, -3.5);
    scene.add(rimLight);

    const instance = await createMotoboyInstance(motoboyId, {
      targetHeight: 1.58,
    });

    instance.update(0.15);
    // Personagem virado de frente/3/4 suave para a câmera
    instance.root.rotation.set(0, 0.16, 0);
    scene.add(instance.root);
    instance.root.updateMatrixWorld(true);

    const bodyNode = instance.root.children[0] ?? instance.root;
    const box = new THREE.Box3().setFromObject(bodyNode);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    instance.root.position.x -= center.x;
    instance.root.position.z -= center.z;
    instance.root.position.y -= box.min.y;

    // Enquadramento de retrato (rosto e busto superior bem centralizados e proporcionais)
    const bodyH = Math.min(1.62, Math.max(1.35, size.y));
    const bustTargetY = bodyH * 0.77;
    const camY = bodyH * 0.80;
    const camDist = Math.max(0.96, bodyH * 0.68);
    camera.position.set(0, camY, camDist);
    camera.lookAt(0, bustTargetY, 0);

    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = W;
    outCanvas.height = H;
    const ctx = outCanvas.getContext('2d')!;

    const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.42, 10, W * 0.5, H * 0.5, W * 0.62);
    bgGrad.addColorStop(0, '#452715');
    bgGrad.addColorStop(0.6, '#23140b');
    bgGrad.addColorStop(1, '#120a06');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Contorno suave de destaque na silhueta do retrato 3D
    const offsets = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
      [-1.5, -1.5],
      [1.5, -1.5],
      [-1.5, 1.5],
      [1.5, 1.5],
    ];
    const silhouetteCanvas = document.createElement('canvas');
    silhouetteCanvas.width = W;
    silhouetteCanvas.height = H;
    const sCtx = silhouetteCanvas.getContext('2d')!;
    sCtx.drawImage(renderer.domElement, 0, 0, W, H);
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = '#080503';
    sCtx.fillRect(0, 0, W, H);

    for (const [ox, oy] of offsets) {
      ctx.drawImage(silhouetteCanvas, ox, oy);
    }
    ctx.drawImage(renderer.domElement, 0, 0, W, H);

    instance.dispose();

    const dataUrl = outCanvas.toDataURL('image/png');
    thumbCache.set(cacheKey, dataUrl);
    pendingMap.delete(cacheKey);
    return dataUrl;
  });

  pendingMap.set(cacheKey, job);
  return job;
}

/**
 * Renderiza retrato de perfil diretamente do modelo 3D real de cada cachorro Caramelo,
 * preservando todos os detalhes originais e adicionando um contorno preto bem definido ao redor da silhueta.
 */
export function getOrRenderCaramelo3DPortrait(carameloId: string): Promise<string> {
  const cacheKey = `caramelo_3d_front_v5_${carameloId}`;
  const cached = thumbCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const pending = pendingMap.get(cacheKey);
  if (pending) return pending;

  const job = enqueueRenderTask(async () => {
    const existing = thumbCache.get(cacheKey);
    if (existing) return existing;

    const W = 220;
    const H = 220;
    const { renderer, envTex } = getSharedOffscreenRenderer(W, H);

    const scene = new THREE.Scene();
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 30);

    const hemi = new THREE.HemisphereLight(0xfffbeb, 0x3f6212, 1.55);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.45);
    keyLight.position.set(3.2, 4.5, 4.2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfef08a, 1.25);
    fillLight.position.set(-3.2, 2.4, 3.6);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfbbf24, 1.45);
    rimLight.position.set(-2.0, 3.8, -3.5);
    scene.add(rimLight);

    const instance = await createCarameloInstance(carameloId, {
      targetHeight: 0.94,
      castShadow: false,
      receiveShadow: false,
    });

    // Rotação frontal 3/4 (Math.PI compensa o orientationPivot de -Z para que o cachorro fique SEMPRE de frente para a câmera!)
    instance.root.rotation.set(0, Math.PI - 0.38, 0);
    scene.add(instance.root);
    instance.root.updateMatrixWorld(true);

    // Calcula o bounding box exclusivamente da malha do corpo do cachorro (ignorando VFX invisíveis de mordida/fogo e drones externos)
    const bodyMeshRoot = instance.root.getObjectByName(`CarameloMesh_${carameloId}`) || instance.root;
    const box = new THREE.Box3().setFromObject(bodyMeshRoot);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    instance.root.position.x -= center.x;
    instance.root.position.z -= center.z;
    instance.root.position.y -= box.min.y;

    const clampedH = Math.min(1.08, Math.max(0.82, size.y));
    const focusY = clampedH * 0.56;
    const maxSpan = Math.max( Math.min(1.15, size.x), clampedH, Math.min(1.15, size.z), 0.78);
    const camDist = maxSpan * 1.42;
    camera.position.set(0, clampedH * 0.66, camDist);
    camera.lookAt(0, focusY, 0);

    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = W;
    outCanvas.height = H;
    const ctx = outCanvas.getContext('2d')!;

    const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.45, 10, W * 0.5, H * 0.5, W * 0.64);
    bgGrad.addColorStop(0, '#472814');
    bgGrad.addColorStop(0.62, '#24140a');
    bgGrad.addColorStop(1, '#120a05');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Contorno preto bem definido ("contorno preto bem definido ao redor dos cachorros, destacando suas silhuetas")
    const silhouetteCanvas = document.createElement('canvas');
    silhouetteCanvas.width = W;
    silhouetteCanvas.height = H;
    const sCtx = silhouetteCanvas.getContext('2d')!;
    sCtx.drawImage(renderer.domElement, 0, 0, W, H);
    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = '#040201';
    sCtx.fillRect(0, 0, W, H);

    const outlineRadius = 3.2;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const ox = Math.cos(angle) * outlineRadius;
      const oy = Math.sin(angle) * outlineRadius;
      ctx.drawImage(silhouetteCanvas, ox, oy);
    }
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      const ox = Math.cos(angle) * (outlineRadius * 0.55);
      const oy = Math.sin(angle) * (outlineRadius * 0.55);
      ctx.drawImage(silhouetteCanvas, ox, oy);
    }

    ctx.drawImage(renderer.domElement, 0, 0, W, H);

    instance.dispose();

    const dataUrl = outCanvas.toDataURL('image/png');
    thumbCache.set(cacheKey, dataUrl);
    pendingMap.delete(cacheKey);
    return dataUrl;
  });

  pendingMap.set(cacheKey, job);
  return job;
}

/**
 * Renderiza uma captura real 3D da gameplay de cada cenário usando os construtores,
 * materiais, iluminação, construções e vegetação autênticos do jogo.
 */
export function getOrRenderMapGameplayCapture(mapKey: string): Promise<string> {
  const cacheKey = `map_capture_3d_${mapKey}`;
  const cached = thumbCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const pending = pendingMap.get(cacheKey);
  if (pending) return pending;

  const job = enqueueRenderTask(async () => {
    const existing = thumbCache.get(cacheKey);
    if (existing) return existing;

    const W = 420;
    const H = 236;
    const { renderer, envTex } = getSharedOffscreenRenderer(W, H);

    const scene = new THREE.Scene();
    scene.environment = envTex;

    const isPraiaScene =
      mapKey === 'praia' || mapKey === 'pelourinho' || mapKey === 'ponte_rio';
    const skyPreset =
      mapKey === 'centro_sp' || mapKey === 'curitiba'
        ? 'violet_dusk'
        : mapKey === 'sertanejo' || mapKey === 'pantanal' || mapKey === 'brasilia'
        ? 'sunset_dramatic'
        : 'tropical_morning';

    const fogHex =
      skyPreset === 'violet_dusk'
        ? '#1E293B'
        : skyPreset === 'sunset_dramatic'
        ? '#F79E6B'
        : isPraiaScene
        ? '#BAE6FD'
        : '#D8F3DC';
    const fogColor = new THREE.Color(fogHex);
    scene.background = fogColor;
    scene.fog = new THREE.Fog(fogColor, 48, 225);

    const camera = new THREE.PerspectiveCamera(58, W / H, 0.35, 280);
    if (mapKey === 'praia') {
      camera.position.set(1.4, 3.65, 6.2);
      camera.lookAt(3.2, 1.65, -42);
    } else if (mapKey === 'favela') {
      camera.position.set(0, 2.85, 5.6);
      camera.lookAt(0, 2.2, -38);
    } else {
      const seedIdx = mapKey.charCodeAt(0) % 5;
      camera.position.set((seedIdx - 2) * 0.85, 3.1 + (seedIdx % 2) * 0.6, 5.8);
      camera.lookAt((seedIdx - 2) * 0.4, 2.0, -40);
    }

    const hemi = new THREE.HemisphereLight(
      skyPreset === 'violet_dusk' ? 0x7dd3fc : 0xfff4de,
      0x4d7c0f,
      1.25,
    );
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(
      skyPreset === 'sunset_dramatic' ? 0xffedd5 : 0xfff8e7,
      1.85,
    );
    sun.position.set(-22, 62, -52);
    scene.add(sun);

    const skyTex = createPainterlySkyTexture(skyPreset);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false,
    });
    const skyGeo = new THREE.SphereGeometry(240, 24, 16);
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.position.set(0, -10, -45);
    scene.add(skyDome);

    const roadTex = createStreetRoadTexture(4);
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.78,
      metalness: 0.06,
    });
    const roadGeo = new THREE.PlaneGeometry(11.6, 150);
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -65);
    scene.add(roadMesh);

    const sidewalkTex = createSidewalkTexture(4);
    const swMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.84,
    });

    const corcovado = buildCorcovadoAndCristoRedentor();
    corcovado.scale.setScalar(1.38);
    corcovado.position.set(-22, isPraiaScene ? 3.6 : 1.5, -198);
    corcovado.rotation.y = 0.16;
    scene.add(corcovado);

    const skyline = isPraiaScene
      ? buildCoastalHorizonCitySkyline(4)
      : buildHorizonCitySkyline(4);
    scene.add(skyline.group);

    let copaTex: THREE.CanvasTexture | null = null;
    if (isPraiaScene) {
      const leftSw = new THREE.Mesh(new THREE.BoxGeometry(22, 0.22, 150), swMat);
      leftSw.position.set(-17.15, 0.11, -65);
      scene.add(leftSw);

      copaTex = createCopacabanaWaveSidewalkTexture(4);
      const rightSw = new THREE.Mesh(
        new THREE.BoxGeometry(3.85, 0.22, 150),
        new THREE.MeshStandardMaterial({ map: copaTex, roughness: 0.8 }),
      );
      rightSw.position.set(8.05, 0.11, -65);
      scene.add(rightSw);

      const beachAndOcean = buildBeachSandAndOceanBackdrop(4);
      beachAndOcean.update(1.4, 0);
      scene.add(beachAndOcean.group);

      for (let i = 0; i < 4; i++) {
        const z = -6 - i * 22;
        const lH = buildBrazilianHouse(HOUSE_VARIATIONS[(i * 3) % HOUSE_VARIATIONS.length], 'left', 4);
        lH.position.set(-14.6, 2.38, z);
        scene.add(lH);

        const lW = buildLeftCoastalRetainingWallSegment(i % 4, 4);
        lW.position.set(-8.65, 0.22, z);
        scene.add(lW);

        const rB = buildBeachfrontPropCluster(i % 6, 4);
        rB.position.set(0, 0, z);
        scene.add(rB);

        const condo = buildCoastalCondominiumBuilding(i, 4);
        condo.position.set(-25.5, 2.2, z - 8);
        scene.add(condo);
      }
    } else {
      for (const sideSign of [-1, 1]) {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(22, 0.22, 150), swMat);
        sw.position.set(sideSign * 17.15, 0.11, -65);
        scene.add(sw);
      }

      const varOffset =
        mapKey === 'favela'
          ? 0
          : (mapKey.charCodeAt(0) + mapKey.charCodeAt(mapKey.length - 1)) % 12;

      for (let i = 0; i < 5; i++) {
        const z = -4 - i * 19.5;
        const leftSpec = HOUSE_VARIATIONS[(varOffset + i * 2) % HOUSE_VARIATIONS.length];
        const rightSpec = HOUSE_VARIATIONS[(varOffset + i * 2 + 1) % HOUSE_VARIATIONS.length];
        const lH = buildBrazilianHouse(leftSpec, 'left', 4);
        const rH = buildBrazilianHouse(rightSpec, 'right', 4);
        lH.position.set(-12.0, 0.22, z);
        rH.position.set(12.0, 0.22, z);
        scene.add(lH, rH);

        if (i < 3) {
          const lFav = buildHillsideFavelaCluster(i * 2 + varOffset, 'left', 4);
          const rFav = buildHillsideFavelaCluster(i * 2 + 1 + varOffset, 'right', 4);
          lFav.position.set(-15.2, 1.8, z - 6);
          rFav.position.set(15.2, 1.8, z - 6);
          scene.add(lFav, rFav);
        }

        const lPole = buildUtilityPoleWithWires('left', 19.5, i % 2 === 0, true);
        const rPole = buildUtilityPoleWithWires('right', 19.5, false, true);
        lPole.position.set(-6.45, 0.22, z);
        rPole.position.set(6.45, 0.22, z);
        scene.add(lPole, rPole);
      }
    }

    renderer.setClearColor(fogColor, 1);
    renderer.clear();
    renderer.render(scene, camera);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = W;
    outCanvas.height = H;
    const ctx = outCanvas.getContext('2d')!;
    ctx.drawImage(renderer.domElement, 0, 0, W, H);

    skyGeo.dispose();
    skyMat.dispose();
    skyTex.dispose();
    roadGeo.dispose();
    roadMat.dispose();
    roadTex.dispose();
    swMat.dispose();
    sidewalkTex.dispose();
    if (copaTex) copaTex.dispose();

    const dataUrl = outCanvas.toDataURL('image/jpeg', 0.9);
    thumbCache.set(cacheKey, dataUrl);
    pendingMap.delete(cacheKey);
    return dataUrl;
  });

  pendingMap.set(cacheKey, job);
  return job;
}
