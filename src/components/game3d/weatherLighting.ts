import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type TimeOfDay = 'DAY' | 'SUNSET' | 'NIGHT';

export interface WeatherSystem {
  timeOfDay: TimeOfDay;
  timeProgress: number;
  lowPlaneRumble: number; // 🛩️ Rumble factor when low airplane is overhead
  isRaining: boolean;
  rainIntensity: number; // 0.0 a 1.0
  currentSkyColor: THREE.Color;
  currentFogColor: THREE.Color;
  sunLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  bikeHeadlight: THREE.SpotLight;
  bikeLightTarget: THREE.Object3D;
  sunMesh: THREE.Group;
  moonMesh: THREE.Group;
  starsGroup: THREE.Points;
  cloudsGroup: THREE.Group;
  lensFlareGroup: THREE.Group;
  update: (dt: number, scene: THREE.Scene, cameraPos: THREE.Vector3) => TimeOfDay;
  resetToDay: () => void;
  setSunset: () => void;
  setNight: () => void;
  setTimeOfDayMode: (mode: TimeOfDay) => void;
  toggleTimeOfDay: () => TimeOfDay;
  setOptimizedMode: (optimized: boolean) => void;
  dispose: () => void;
}

const _colA = new THREE.Color();
const _colB = new THREE.Color();
const _overcastSky = new THREE.Color(0x334155);
const _overcastFog = new THREE.Color(0x475569);

// Helper: Natural Soft Atmospheric Solar Glow Texture (Zero geometric spikes or sharp shapes)
function createSunburstTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const center = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Smooth multi-stop radial atmospheric glow
  const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.14, 'rgba(255, 251, 235, 0.78)');
  grad.addColorStop(0.32, 'rgba(254, 240, 138, 0.42)');
  grad.addColorStop(0.58, 'rgba(251, 191, 36, 0.16)');
  grad.addColorStop(0.82, 'rgba(245, 158, 11, 0.04)');
  grad.addColorStop(1.0, 'rgba(245, 158, 11, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

// ☀️ Raios Solares Crepusculares Suaves (Soft Volumetric God Rays)
function createSoftSolarRaysTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  // 14 feixes com transição difusa orgânica (sem bordas duras)
  const rayCount = 14;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(0, 0, size * 0.48, 0);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(0.22, 'rgba(254, 240, 138, 0.26)');
    grad.addColorStop(0.60, 'rgba(251, 191, 36, 0.08)');
    grad.addColorStop(1.0, 'rgba(245, 158, 11, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(size * 0.48, -26);
    ctx.lineTo(size * 0.48, 26);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createWeatherLighting(scene: THREE.Scene): WeatherSystem {
  let isOptimizedMode = false;

  // Ambient & Hemisphere Light for rich natural Brazilian sky/ground illumination
  const ambientLight = new THREE.AmbientLight(0xffedd5, 1.15);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x92400e, 0.65);
  hemiLight.position.set(0, 60, 0);
  scene.add(hemiLight);

  // Directional Sunlight / Moonlight (Iluminação e sombras suaves, focadas e ultra rápidas a 60 FPS)
  const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
  sunLight.position.set(18, 42, 48);
  sunLight.castShadow = true;
  // ⚡ Otimização: shadow map 512x512 (4x menos pixels que 1024x1024) com frustum apertado
  sunLight.shadow.mapSize.width = 512;
  sunLight.shadow.mapSize.height = 512;
  sunLight.shadow.camera.near = 6.0;
  sunLight.shadow.camera.far = 55.0;
  sunLight.shadow.camera.left = -10;
  sunLight.shadow.camera.right = 10;
  sunLight.shadow.camera.top = 22;
  sunLight.shadow.camera.bottom = -6;
  sunLight.shadow.bias = -0.0003;
  sunLight.shadow.normalBias = 0.02;
  sunLight.shadow.radius = 1.6;
  scene.add(sunLight);
  scene.add(sunLight.target);

// ☀️ TEXTURA DO SOL ÓTICO FOTOGRÁFICO REALISTA COM DIFRAÇÃO FRAUNHOFER (FOTO 1)
// Núcleo ofuscante puro + raios finos pontiagudos + corona contínua (SEM estilo cartoon e SEM esferas 3D sólidas)
function createPhotorealisticOpticalSunTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  // 1. Raios ópticos finos e nítidos de difração estelar (Fraunhofer Starburst Spikes - exatamente como na Foto 1)
  const numSpikes = 24;
  for (let i = 0; i < numSpikes; i++) {
    const angle = (i / numSpikes) * Math.PI * 2;
    const isMajor = i % 4 === 0;
    const isMedium = i % 2 === 0;
    const spikeLen = isMajor ? size * 0.47 : isMedium ? size * 0.35 : size * 0.23;
    const halfWidth = isMajor ? 2.8 : isMedium ? 1.8 : 1.1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const sGrad = ctx.createLinearGradient(0, 0, spikeLen, 0);
    sGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    sGrad.addColorStop(0.12, 'rgba(255, 254, 240, 0.88)');
    sGrad.addColorStop(0.35, 'rgba(254, 243, 199, 0.42)');
    sGrad.addColorStop(0.70, 'rgba(253, 224, 71, 0.10)');
    sGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.moveTo(0, -halfWidth);
    ctx.lineTo(spikeLen, 0);
    ctx.lineTo(0, halfWidth);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // 2. Corona fotográfica contínua sem anéis concêntricos (dispersão de Mie pura)
  const coronaGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.26);
  coronaGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  coronaGrad.addColorStop(0.10, 'rgba(255, 255, 250, 0.94)');
  coronaGrad.addColorStop(0.24, 'rgba(254, 249, 195, 0.65)');
  coronaGrad.addColorStop(0.48, 'rgba(253, 224, 71, 0.25)');
  coronaGrad.addColorStop(0.75, 'rgba(251, 191, 36, 0.06)');
  coronaGrad.addColorStop(1.0, 'rgba(245, 158, 11, 0.0)');
  ctx.fillStyle = coronaGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.26, 0, Math.PI * 2);
  ctx.fill();

  // 3. Ponto nuclear ofuscante compacto (saturação de sensor de câmera real)
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.042);
  coreGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  coreGrad.addColorStop(0.70, 'rgba(255, 255, 255, 0.98)');
  coreGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.042, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// 🌅 DIFUSÃO ATMOSFÉRICA VOLUMÉTRICA AMPLA (FOTO 2 - CÉU DOURADO EXPANSIVO NO PÔR DO SOL)
function createPhotorealisticAtmosphericGlowTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.49);
  glowGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.90)');
  glowGrad.addColorStop(0.14, 'rgba(255, 251, 235, 0.58)');
  glowGrad.addColorStop(0.32, 'rgba(254, 240, 138, 0.28)');
  glowGrad.addColorStop(0.58, 'rgba(251, 191, 36, 0.09)');
  glowGrad.addColorStop(0.82, 'rgba(249, 115, 22, 0.02)');
  glowGrad.addColorStop(1.0, 'rgba(249, 115, 22, 0.0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

  // =========================================================================
  // 1. SOL FOTOGRÁFICO REALISTA ÓTICO (SEM estilo cartoon, SEM esferas 3D sólidas)
  // Baseado fielmente nas Fotos 1 e 2: Starburst ótico fino límpido + Iluminação volumétrica
  // =========================================================================
  const sunGroup = new THREE.Group();
  scene.add(sunGroup);

  const opticalSunTex = createPhotorealisticOpticalSunTexture();
  const atmosphericGlowTex = createPhotorealisticAtmosphericGlowTexture();

  // 1. Núcleo Ótico Fotográfico com Starburst Fino (Foto 1)
  const sunCoreMat = new THREE.SpriteMaterial({
    map: opticalSunTex,
    color: 0xffffff,
    transparent: true,
    opacity: 0.98,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const opticalSunSprite = new THREE.Sprite(sunCoreMat);
  opticalSunSprite.scale.set(38, 38, 1);
  sunGroup.add(opticalSunSprite);

  // 2. Halo Atmosférico Volumétrico Suave e Expansivo (Foto 2)
  const coronaMat = new THREE.SpriteMaterial({
    map: atmosphericGlowTex,
    color: 0xfffbeb,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const atmosphericGlowSprite = new THREE.Sprite(coronaMat);
  atmosphericGlowSprite.scale.set(88, 88, 1);
  sunGroup.add(atmosphericGlowSprite);

  // =========================================================================
  // 2. SOFT ATMOSPHERIC GLOW (Sem hexágonos e sem feixes geométricos)
  // =========================================================================
  const lensFlareGroup = new THREE.Group();
  scene.add(lensFlareGroup);

  const sunburstTex = createSunburstTexture();
  const sunburstMat = new THREE.SpriteMaterial({
    map: sunburstTex,
    color: 0xfffbeb,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const sunburstMesh = new THREE.Sprite(sunburstMat);
  sunburstMesh.scale.set(62, 62, 1);
  lensFlareGroup.add(sunburstMesh);

  // =========================================================================
  // 3. ULTRA-REALISTIC 3D GLOWING MOON
  // =========================================================================
  const moonGroup = new THREE.Group();
  scene.add(moonGroup);

  const moonCoreGeo = new THREE.SphereGeometry(5.0, 24, 24);
  const moonCoreMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const moonCore = new THREE.Mesh(moonCoreGeo, moonCoreMat);
  moonGroup.add(moonCore);

  const moonCoronaGeo = new THREE.SphereGeometry(11.0, 18, 18);
  const moonCoronaMat = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.5,
    side: THREE.BackSide,
  });
  const moonCorona = new THREE.Mesh(moonCoronaGeo, moonCoronaMat);
  moonGroup.add(moonCorona);

  // =========================================================================
  // 4. NIGHT SKY CONSTELLATIONS & DYNAMIC STARRY SKY
  // =========================================================================
  const celestialDome = new THREE.Group();
  scene.add(celestialDome);

  // 320 Ambient Twinkling Stars
  const starCount = 380;
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    starPositions[i] = (Math.random() - 0.5) * 480;
    starPositions[i + 1] = Math.random() * 95 + 30;
    starPositions[i + 2] = (Math.random() - 0.5) * 480;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.35, transparent: true, opacity: 0 });
  const starsGroup = new THREE.Points(starGeo, starMat);
  celestialDome.add(starsGroup);

  // 🌌 BRAZILIAN CONSTELLATIONS: Cruzeiro do Sul (Southern Cross) & Três Marias (Orion)
  const constellationGroup = new THREE.Group();
  celestialDome.add(constellationGroup);

  const constelStarMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0 });
  const constelLineMat = new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0 });

  // Cruzeiro do Sul Stars
  const cruzeiroStars = [
    new THREE.Vector3(15, 65, 120),  // Acrux (Sul)
    new THREE.Vector3(15, 78, 120),  // Gacrux (Norte)
    new THREE.Vector3(10, 71, 120),  // Mimosa (Leste)
    new THREE.Vector3(20, 72, 120),  // Delta Crucis (Oeste)
    new THREE.Vector3(17, 69, 120),  // Intrometida
  ];

  cruzeiroStars.forEach((pos) => {
    const starNode = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 12), constelStarMat);
    starNode.position.copy(pos);
    constellationGroup.add(starNode);
  });

  // Cruzeiro Lines
  const cruzeiroLineGeo = new THREE.BufferGeometry().setFromPoints([
    cruzeiroStars[0], cruzeiroStars[1],
    cruzeiroStars[2], cruzeiroStars[3],
  ]);
  const cruzeiroLines = new THREE.LineSegments(cruzeiroLineGeo, constelLineMat);
  constellationGroup.add(cruzeiroLines);

  // Três Marias (Orion Belt)
  const tresMarias = [
    new THREE.Vector3(-45, 72, 130),
    new THREE.Vector3(-41, 74, 130),
    new THREE.Vector3(-37, 76, 130),
  ];
  tresMarias.forEach((pos) => {
    const starNode = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 12), constelStarMat);
    starNode.position.copy(pos);
    constellationGroup.add(starNode);
  });
  const orionLineGeo = new THREE.BufferGeometry().setFromPoints([
    tresMarias[0], tresMarias[1],
    tresMarias[1], tresMarias[2],
  ]);
  const orionLines = new THREE.LineSegments(orionLineGeo, constelLineMat);
  constellationGroup.add(orionLines);

  // =========================================================================
  // 5. AIRPLANE SYSTEM (Authentic 3D Models from GLTF: Airliner & Executive Jet)
  // =========================================================================
  const airplaneGroup = new THREE.Group();
  scene.add(airplaneGroup);

  // Avião alto de cruzeiro na linha do horizonte
  const skyPlane = new THREE.Group();
  airplaneGroup.add(skyPlane);

  // Modelos para sobrevoo rasante realista
  const lowFlyoverPlanes: THREE.Group[] = [];
  let activeLowPlaneIdx = 0;

  const gltfLoader = new GLTFLoader();

  const loadAirplaneSafe = (url: string, onLoad: (gltf: any) => void) => {
    try {
      gltfLoader.load(
        url,
        (gltf) => {
          try {
            onLoad(gltf);
          } catch (err) {
            console.warn(`Erro ao processar ${url}:`, err);
          }
        },
        undefined,
        (err) => console.warn(`Aviso: Falha ao carregar ${url}:`, err)
      );
    } catch (err) {
      console.warn(`Erro ao iniciar load de ${url}:`, err);
    }
  };

  // 1. Avião Comercial Grande (4 Turbinas, Pintura Vermelha e Branca)
  loadAirplaneSafe('/models/airplanes/airplane1.glb', (gltf) => {
    const model = gltf.scene;
    model.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = false; // ⚡ Aviões no céu não precisam de sombra dinâmica
        child.receiveShadow = false;
      }
    });

    // Modelo alto de cruzeiro no horizonte
    const cruisePlane = model.clone();
    cruisePlane.scale.set(0.55, 0.55, 0.55);
    skyPlane.add(cruisePlane);

    // Modelo rasante
    const lowPlane1 = model.clone();
    lowPlane1.scale.set(0.95, 0.95, 0.95);
    lowPlane1.visible = false;
    airplaneGroup.add(lowPlane1);
    lowFlyoverPlanes.push(lowPlane1);
  });

  // 2. Jato Executivo Elegante (Bi-Turbina Traseira, Detalhes Cromados e Azul)
  loadAirplaneSafe('/models/airplanes/airplane2.glb', (gltf) => {
    const model = gltf.scene;
    model.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = false; // ⚡ Aviões no céu não precisam de sombra dinâmica
        child.receiveShadow = false;
      }
    });

    const lowPlane2 = model.clone();
    lowPlane2.scale.set(1.2, 1.2, 1.2);
    lowPlane2.visible = false;
    airplaneGroup.add(lowPlane2);
    lowFlyoverPlanes.push(lowPlane2);
  });

  // Dynamic Ground Shadow of Airplane projected on road/sidewalk (radial gradient, no CSS filter artifact)
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 512;
  shadowCanvas.height = 512;
  const sCtx = shadowCanvas.getContext('2d')!;
  sCtx.clearRect(0, 0, 512, 512);

  const pGrad = sCtx.createRadialGradient(256, 256, 18, 256, 256, 225);
  pGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.45)');
  pGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.18)');
  pGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  sCtx.fillStyle = pGrad;
  sCtx.beginPath();
  sCtx.ellipse(256, 256, 210, 210, 0, 0, Math.PI * 2);
  sCtx.fill();

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const planeShadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(34, 46), shadowMat);
  planeShadowMesh.rotation.x = -Math.PI / 2;
  planeShadowMesh.position.y = 0.04;
  planeShadowMesh.visible = false; // Inicia invisível até que um sobrevoo rasante ocorra
  scene.add(planeShadowMesh);

  let highPlaneProgress = 0;
  let lowPlaneTimer = 18.0; // Next low flyover countdown
  let isLowFlyoverActive = false;
  let lowFlyoverZ = 220;

  // =========================================================================
  // 6. MOTOR VISUAL DE CÉU CINEMATOGRÁFICO — NUVENS PINTADAS À MÃO (MATTE PAINTING)
  // Inspirado fielmente na referência: cumulus volumétricos colossais, pinceladas
  // a óleo/espátula visíveis, iluminação crepuscular dourada/âmbar, bordas com
  // Cloud Rim Lighting incandescente e sombras profundas em vinho, roxo e ameixa.
  // 100% Procedural via Canvas 2D em GPU com 1 única PlaneGeometry compartilhada (60 FPS).
  // =========================================================================

  // Helper: Pincelada a óleo / espátula com textura de cerdas e afunilamento natural
  function drawImpastoBrushStroke(
    ctx: CanvasRenderingContext2D,
    x0: number, y0: number,
    cpX: number, cpY: number,
    x1: number, y1: number,
    width: number,
    color: string,
    withBristleHighlights = false
  ) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cpX, cpY, x1, y1);
    ctx.stroke();

    if (withBristleHighlights && width > 4.5) {
      // Estria luminosa de cerda interna (efeito impasto de tinta a óleo)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = width * 0.32;
      ctx.beginPath();
      ctx.moveTo(x0 + 1.2, y0 - 1.2);
      ctx.quadraticCurveTo(cpX, cpY - 1.2, x1, y1 - 1.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 🌅 1. Cúpula Panorâmica Hemisférica em Pintura Digital a Óleo
  function createPainterlySkyTexture(): THREE.CanvasTexture {
    if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
    const width = 2048;
    const height = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // 1. Degradê vertical crepuscular cinematográfico (Zênite índigo profundo -> Ametista -> Vinho -> Laranja Cádmio -> Ouro Horizon)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0.00, '#0e112d'); // Zênite azul-noite profundo / safira escuro
    skyGrad.addColorStop(0.15, '#1e1b4b'); // Azul cobalto escuro crepuscular
    skyGrad.addColorStop(0.32, '#3b1d54'); // Roxo ametista imperial / ameixa
    skyGrad.addColorStop(0.48, '#6b2160'); // Vinho aveludado e magenta real
    skyGrad.addColorStop(0.62, '#9f2855'); // Rosa coral escuro crepuscular
    skyGrad.addColorStop(0.74, '#cf4732'); // Vermelhão pôr do sol / terracota
    skyGrad.addColorStop(0.85, '#f97316'); // Laranja cádmio ardente e saturado
    skyGrad.addColorStop(0.93, '#fbbf24'); // Âmbar dourado crepuscular
    skyGrad.addColorStop(1.00, '#fef08a'); // Ouro límpido radiante na linha do horizonte
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Halo solar volumétrico difuso na linha do horizonte (luz quente espalhando no céu)
    const sunAzimuthX = width * 0.50;
    const sunHorizonY = height * 0.88;
    const solarGlowGrad = ctx.createRadialGradient(sunAzimuthX, sunHorizonY, 10, sunAzimuthX, sunHorizonY, width * 0.45);
    solarGlowGrad.addColorStop(0.00, 'rgba(255, 247, 237, 0.55)');
    solarGlowGrad.addColorStop(0.20, 'rgba(254, 215, 170, 0.40)');
    solarGlowGrad.addColorStop(0.50, 'rgba(249, 115, 22, 0.22)');
    solarGlowGrad.addColorStop(0.80, 'rgba(159, 40, 85, 0.08)');
    solarGlowGrad.addColorStop(1.00, 'rgba(110, 23, 76, 0.0)');
    ctx.fillStyle = solarGlowGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Estrias horizontais de pinceladas atmosféricas texturizadas (seamless wrapping)
    for (let i = 0; i < 32; i++) {
      const x0 = (i * 128) % width;
      const y0 = 340 + ((i * 37) % 520);
      const len = 340 + (i % 5) * 90;
      const x1 = x0 + len;
      const y1 = y0 + 10 + (i % 4) * 6;
      const cpX = (x0 + x1) * 0.5 + 30;
      const cpY = (y0 + y1) * 0.5 - 14;

      const alpha = 0.08 + (i % 3) * 0.05;
      const col = y0 > 650 
        ? `rgba(254, 240, 138, ${alpha})`
        : y0 > 480 
        ? `rgba(251, 146, 60, ${alpha})`
        : `rgba(216, 70, 239, ${alpha * 0.8})`;

      drawImpastoBrushStroke(ctx, x0, y0, cpX, cpY, x1, y1, 24, col);
      // Repetição horizontal perfeita
      if (x1 > width - 40) {
        drawImpastoBrushStroke(ctx, x0 - width, y0, cpX - width, cpY, x1 - width, y1, 24, col);
      }
      if (x0 < 40) {
        drawImpastoBrushStroke(ctx, x0 + width, y0, cpX + width, cpY, x1 + width, y1, 24, col);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  // ☁️ 2. Pinceladas Suaves de Tinta a Óleo e Mechas Translúcidas (Zero nuvens grossas ou roxas)
  // Textura A: Fita de pincelada suave em degradê dourado/pêssego
  function createSoftPainterlyBrushRibbonTexture(): THREE.CanvasTexture {
    if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
    const width = 512;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.clearRect(0, 0, width, height);

    // Traço suave horizontal com pontas desfiadas afiladas (pincelada translúcida)
    const ribbonGrad = ctx.createLinearGradient(0, 0, width, 0);
    ribbonGrad.addColorStop(0.00, 'rgba(254, 240, 138, 0.0)');
    ribbonGrad.addColorStop(0.18, 'rgba(254, 240, 138, 0.45)');
    ribbonGrad.addColorStop(0.50, 'rgba(251, 146, 60, 0.65)');
    ribbonGrad.addColorStop(0.82, 'rgba(254, 215, 170, 0.40)');
    ribbonGrad.addColorStop(1.00, 'rgba(254, 240, 138, 0.0)');
    ctx.fillStyle = ribbonGrad;

    const ribbons = [
      { y: 64, rx: 210, ry: 22, tilt: -0.015 },
      { y: 52, rx: 160, ry: 16, tilt: 0.012 },
      { y: 76, rx: 180, ry: 18, tilt: -0.01 },
      { y: 44, rx: 120, ry: 12, tilt: -0.02 },
      { y: 84, rx: 130, ry: 14, tilt: 0.018 },
    ];
    ribbons.forEach(r => {
      ctx.beginPath();
      ctx.ellipse(256, r.y, r.rx, r.ry, r.tilt, 0, Math.PI * 2);
      ctx.fill();
    });

    // Pinceladas de cerdas finas com textura de espátula e brilho dourado suave
    for (let i = 0; i < 40; i++) {
      const sx = 60 + ((i * 39) % 360);
      const sy = 40 + ((i * 27) % 50);
      const len = 65 + (i % 4) * 25;
      const ex = sx + len;
      const ey = sy + (Math.sin(i * 1.5) * 3);
      const col = (i % 2 === 0) 
        ? 'rgba(255, 251, 235, 0.35)' 
        : 'rgba(254, 240, 138, 0.28)';
      drawImpastoBrushStroke(ctx, sx, sy, (sx + ex) * 0.5, sy - 2, ex, ey, 2.8 + (i % 3) * 1.5, col);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  // Textura B: Mechas de Cirros Eólicos Leves e Translúcidos
  function createSoftCirrusWispTexture(): THREE.CanvasTexture {
    if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
    const width = 512;
    const height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.clearRect(0, 0, width, height);

    const wispGrad = ctx.createLinearGradient(0, 0, width, 0);
    wispGrad.addColorStop(0.00, 'rgba(254, 240, 138, 0.0)');
    wispGrad.addColorStop(0.25, 'rgba(254, 243, 199, 0.38)');
    wispGrad.addColorStop(0.55, 'rgba(253, 186, 116, 0.48)');
    wispGrad.addColorStop(0.85, 'rgba(244, 114, 182, 0.25)');
    wispGrad.addColorStop(1.00, 'rgba(254, 240, 138, 0.0)');
    ctx.fillStyle = wispGrad;

    const wisps = [
      { y: 60, rx: 195, ry: 18, tilt: -0.02 },
      { y: 74, rx: 165, ry: 15, tilt: 0.015 },
      { y: 48, rx: 135, ry: 12, tilt: -0.025 },
    ];
    wisps.forEach(w => {
      ctx.beginPath();
      ctx.ellipse(256, w.y, w.rx, w.ry, w.tilt, 0, Math.PI * 2);
      ctx.fill();
    });

    for (let i = 0; i < 30; i++) {
      const sx = 75 + ((i * 41) % 340);
      const sy = 45 + ((i * 23) % 40);
      const len = 50 + (i % 4) * 20;
      drawImpastoBrushStroke(ctx, sx, sy, sx + len * 0.5, sy - 2, sx + len, sy + 1, 2.2, 'rgba(255, 255, 255, 0.28)');
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  // 🌌 CÚPULA PANORÂMICA HEMISFÉRICA CONTÍNUA (Envolve perfeitamente o horizonte sem gaps)
  const painterlySkyTex = createPainterlySkyTexture();
  const painterlySkyDomeGeo = new THREE.SphereGeometry(490, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const painterlySkyDomeMat = new THREE.MeshBasicMaterial({
    map: painterlySkyTex,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const painterlySkyDomeMesh = new THREE.Mesh(painterlySkyDomeGeo, painterlySkyDomeMat);
  painterlySkyDomeMesh.rotation.y = Math.PI; // Emenda U=0/U=1 exatamente em -Z (atrás do jogador)
  painterlySkyDomeMesh.position.y = 12;
  painterlySkyDomeMesh.raycast = () => {};
  scene.add(painterlySkyDomeMesh);

  // ☁️ PINCELADAS SUAVES TRANSLÚCIDAS NO ALTO CÉU (Zero nuvens grossas ou roxas)
  const cloudsGroup = new THREE.Group();
  cloudsGroup.name = 'PainterlySoftBrushRibbonsGroup';

  const texBrushRibbon = createSoftPainterlyBrushRibbonTexture();
  const texCirrusWisp = createSoftCirrusWispTexture();

  const cloudMatRibbon = new THREE.MeshBasicMaterial({
    map: texBrushRibbon,
    color: 0xffffff,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });

  const cloudMatCirrus = new THREE.MeshBasicMaterial({
    map: texCirrusWisp,
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });

  const cloudMats = [cloudMatRibbon, cloudMatCirrus];

  function updateAllCloudColors(hex: number) {
    cloudMats.forEach(m => m.color.setHex(hex));
  }

  // 🚀 OTIMIZAÇÃO: 1 única geometria compartilhada na VRAM para as pinceladas suaves
  const sharedCloudGeo = new THREE.PlaneGeometry(1, 1);

  // Apenas 16 pinceladas suaves finas e esguias flutuando bem alto (acima das montanhas)
  const TOTAL_CLOUDS = 16;
  for (let i = 0; i < TOTAL_CLOUDS; i++) {
    const matIdx = i % 2;
    const mesh = new THREE.Mesh(sharedCloudGeo, cloudMats[matIdx]);
    mesh.raycast = () => {};

    // Pinceladas horizontais esguias e finas (baseH fino de 12 a 20m para NUNCA formar blocos grossos)
    const baseW = 95 + (i % 4) * 22;
    const baseH = 12 + (i % 3) * 4;
    // Altitude alta (92m a 122m) — muito acima dos picos do Corcovado e Cristo (Y ≈ 47-50m)
    const altitudeY = 92 + (i % 5) * 6;
    const depthZ = 170 + (i % 4) * 25;
    const driftSpeed = 0.18 + (i % 3) * 0.06;

    mesh.scale.set(baseW, baseH, 1);
    mesh.rotation.x = -Math.PI * 0.05;

    // Distribuição equilibrada em X
    const xStep = 520 / TOTAL_CLOUDS;
    const rawX = -260 + i * xStep + ((i * 31) % 28) - 14;
    const posX = Math.abs(rawX) < 16 ? (i % 2 === 0 ? rawX + 26 : rawX - 26) : rawX;

    mesh.position.set(posX, altitudeY, depthZ);
    mesh.userData = {
      baseY: altitudeY,
      floatPhase: (i * 0.73) % (Math.PI * 2),
      driftSpeed: driftSpeed,
      bobAmp: 0.003 + (i % 3) * 0.002,
      bobFreq: 0.4 + (i % 4) * 0.1,
    };

    cloudsGroup.add(mesh);
  }
  scene.add(cloudsGroup);

  // Bike Headlight
  const bikeLightTarget = new THREE.Object3D();
  scene.add(bikeLightTarget);

  // Bike Headlight com bordas ultra suaves e degradê natural (penumbra 0.95)
  const bikeHeadlight = new THREE.SpotLight(0xfffbeb, 3.8, 50, Math.PI / 4.2, 0.95, 1.2);
  bikeHeadlight.castShadow = false;
  bikeHeadlight.target = bikeLightTarget;
  scene.add(bikeHeadlight);

  // Natural Brazilian Atmospheric Colors (Céu azul tropical límpido e vivo durante o dia, SEM BRANCO LEITOSO)
  const daySky = new THREE.Color(0x0284c7);
  const dayFog = new THREE.Color(0x38bdf8);
  const sunsetSky = new THREE.Color(0xf97316);
  const sunsetFog = new THREE.Color(0xfbbf24);
  const duskSky = new THREE.Color(0x311042);
  const duskFog = new THREE.Color(0x1e1b4b);
  const nightSky = new THREE.Color(0x090d16);
  const nightFog = new THREE.Color(0x0f172a);
  const dawnSky = new THREE.Color(0x38bdf8);
  const dawnFog = new THREE.Color(0x7dd3fc);

  const currentSkyColor = new THREE.Color();
  const currentFogColor = new THREE.Color();

  const CYCLE_DURATION = 220.0;
  let cycleTimer = 92.0; // Inicia no Pôr do Sol Dourado Cinematográfico (~0.418)

  // =========================================================================
  // 7. REALISTIC FINE RAIN & GROUND SPLASH SYSTEM (Chuva Fina e Pingos no Chão)
  // =========================================================================
  let cachedRippleTex: THREE.CanvasTexture | null = null;
  const getWaterRippleTexture = (): THREE.CanvasTexture => {
    if (cachedRippleTex) return cachedRippleTex;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);

    // Anel externo translúcido fino
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.88)';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.stroke();

    // Anel interno suave
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(32, 32, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Ponto central de impacto da gota
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(32, 32, 3.5, 0, Math.PI * 2);
    ctx.fill();

    cachedRippleTex = new THREE.CanvasTexture(canvas);
    return cachedRippleTex;
  };

  const RAIN_COUNT = 1100;
  const rainGeo = new THREE.BufferGeometry();
  // 2 vértices por gota (linha 3D esticada): [topX, topY, topZ, botX, botY, botZ]
  const rainPositions = new Float32Array(RAIN_COUNT * 6);
  const rainSpeeds = new Float32Array(RAIN_COUNT);
  const rainLengths = new Float32Array(RAIN_COUNT);

  for (let r = 0; r < RAIN_COUNT; r++) {
    const x = (Math.random() - 0.5) * 36;
    const y = Math.random() * 26 + 1;
    const z = (Math.random() - 0.5) * 45;
    const len = 0.85 + Math.random() * 0.45;

    rainLengths[r] = len;
    rainSpeeds[r] = 42 + Math.random() * 18;

    // Vértice superior
    rainPositions[r * 6 + 0] = x;
    rainPositions[r * 6 + 1] = y;
    rainPositions[r * 6 + 2] = z;

    // Vértice inferior (traço fino inclinado com o vento)
    rainPositions[r * 6 + 3] = x - 0.04;
    rainPositions[r * 6 + 4] = y - len;
    rainPositions[r * 6 + 5] = z - 0.22;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

  const rainLineMat = new THREE.LineBasicMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const rainMesh = new THREE.LineSegments(rainGeo, rainLineMat);
  rainMesh.visible = false;
  scene.add(rainMesh);

  // Pool de Ondulações de Pingo no Chão (Ground Splashes)
  const SPLASH_COUNT = 55;
  const rippleGeo = new THREE.PlaneGeometry(0.55, 0.55);
  rippleGeo.rotateX(-Math.PI / 2);

  const splashesGroup = new THREE.Group();
  scene.add(splashesGroup);

  interface GroundSplash {
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
    life: number;
    maxLife: number;
  }

  const splashPool: GroundSplash[] = [];
  for (let s = 0; s < SPLASH_COUNT; s++) {
    const mat = new THREE.MeshBasicMaterial({
      map: getWaterRippleTexture(),
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(rippleGeo, mat);
    mesh.visible = false;
    mesh.position.y = 0.032;
    splashesGroup.add(mesh);
    splashPool.push({
      mesh,
      mat,
      active: false,
      life: 0,
      maxLife: 0.25,
    });
  }

  const triggerGroundSplash = (x: number, z: number) => {
    for (let s = 0; s < SPLASH_COUNT; s++) {
      const sp = splashPool[s];
      if (!sp.active) {
        sp.active = true;
        sp.life = 0;
        sp.maxLife = 0.20 + Math.random() * 0.12;
        sp.mesh.position.set(x, 0.032, z);
        sp.mesh.scale.set(0.2, 1, 0.2);
        sp.mat.opacity = 0.75;
        sp.mesh.visible = true;
        break;
      }
    }
  };

  let rainCycleTimer = 15.0; // Inicia sem chuva para curtir o sol; primeira pancada em ~45s

  return {
    timeOfDay: 'SUNSET',
    timeProgress: 0.418,
    lowPlaneRumble: 0,
    isRaining: false,
    rainIntensity: 0.0,
    currentSkyColor,
    currentFogColor,
    sunLight,
    ambientLight,
    bikeHeadlight,
    bikeLightTarget,
    sunMesh: sunGroup,
    moonMesh: moonGroup,
    starsGroup,
    cloudsGroup,
    update(dt: number, currentScene: THREE.Scene, cameraPos: THREE.Vector3): TimeOfDay {
      cycleTimer = (cycleTimer + dt) % CYCLE_DURATION;
      const progress = cycleTimer / CYCLE_DURATION;
      this.timeProgress = progress;

      // 1. TRAJETÓRIA DO SOL REALISTA PASSANDO ATRÁS DO CRISTO REDENTOR
      // O Cristo Redentor está situado em X = 0, Y ≈ 47.0 a 50.0 e Z = cameraPos.z + 266.
      // O Sol realiza um arco cinematográfico onde no início da tarde (progress ≈ 0.29 a 0.32)
      // cruza o meridiano central (X = 0) alinhado perfeitamente atrás dos braços abertos do monumento.
      const sunAngle = progress * Math.PI * 2 - Math.PI / 2;
      const sunX = cameraPos.x * 0.05 + Math.sin((progress - 0.295) * Math.PI * 1.8) * 32.0;
      const sunY = Math.cos(sunAngle) * 36.0 + 36.0;
      const sunZ = cameraPos.z + 305; // Logo atrás da montanha e do Cristo
      sunGroup.position.set(sunX, Math.max(-28, sunY), sunZ);
      sunGroup.visible = sunY > -14;
      opticalSunSprite.visible = sunY > -14;
      atmosphericGlowSprite.visible = sunY > -14;
      if (sunGroup.visible) {
        sunCoreMat.rotation += 0.006 * dt; // Rotação ótica lenta e límpida dos raios
      }

      // Efeito de contraluz e halo celestial quando o Sol passa diretamente atrás do Cristo
      const isBehindCristo = Math.abs(sunX - cameraPos.x * 0.05) < 7.5 && sunY > 40 && sunY < 56;
      if (isBehindCristo) {
        opticalSunSprite.scale.set(52, 52, 1);
        atmosphericGlowSprite.scale.set(118, 118, 1);
      } else {
        opticalSunSprite.scale.set(38, 38, 1);
        atmosphericGlowSprite.scale.set(88, 88, 1);
      }

      const moonAngle = sunAngle + Math.PI;
      const moonX = cameraPos.x * 0.08 + Math.sin(moonAngle) * 32;
      const moonY = Math.cos(moonAngle) * 40 + 26;
      const moonZ = cameraPos.z + 345;
      moonGroup.position.set(moonX, Math.max(-28, moonY), moonZ);
      moonGroup.visible = moonY > -10;

      // 2. NATURAL ATMOSPHERIC SOLAR HALO (Suave e realista)
      const isSunVisible = sunY > -6;
      lensFlareGroup.visible = isSunVisible && progress < 0.55;
      if (lensFlareGroup.visible) {
        lensFlareGroup.position.copy(sunGroup.position);
        sunburstMat.opacity = isBehindCristo ? 0.38 : (progress < 0.35 ? 0.22 : 0.30);
      } else {
        sunburstMat.opacity = 0;
      }
      if (isOptimizedMode) {
        sunLight.castShadow = false;
        bikeHeadlight.castShadow = false;
      }

      // Cúpula Panorâmica do Céu em Pincelada: fixada na câmera em Z, com rotação lenta e cinematográfica
      painterlySkyDomeMesh.position.set(cameraPos.x * 0.02, 12, cameraPos.z + 20);
      painterlySkyDomeMesh.rotation.y += 0.0018 * dt;

      // Nuvens cel em pincelada: fixadas em Z à frente da câmera e flutuando suavemente
      cloudsGroup.position.set(0, 0, cameraPos.z);
      cloudsGroup.children.forEach((c) => {
        const ud = c.userData;
        const driftSpeed = ud.driftSpeed || 0.42;
        c.position.x += driftSpeed * 2.4 * dt;
        if (c.position.x > 275) {
          c.position.x = -275;
          if (ud.baseY) {
            c.position.y = ud.baseY + ((Math.random() - 0.5) * 5.0);
          }
        }

        const phase = ud.floatPhase || 0;
        const bobAmp = ud.bobAmp || 0.006;
        const freq = ud.bobFreq || 0.65;
        c.position.y = (ud.baseY || c.position.y) + Math.sin(cycleTimer * freq + phase) * (bobAmp * 16.0);
      });

      // 3. AIRPLANE FLYOVER ANIMATIONS (Disponível apenas em High / Ultra - no LOW / otimizado desliga completamente)
      if (isOptimizedMode) {
        skyPlane.visible = false;
        planeShadowMesh.visible = false;
        lowFlyoverPlanes.forEach((p) => { p.visible = false; });
        this.lowPlaneRumble = 0;
        isLowFlyoverActive = false;
      } else {
        skyPlane.visible = true;
        highPlaneProgress = (highPlaneProgress + dt * 0.022) % 1.0;
        const highX = cameraPos.x - 220 + highPlaneProgress * 440;
        const highY = 62.0; // Altitude natural de cruzeiro no horizonte
        const highZ = cameraPos.z + 175;
        skyPlane.position.set(highX, highY, highZ);
        skyPlane.rotation.set(0, -Math.PI / 2, 0); // Nariz apontando suavemente para a direita (+X)

        // Sobrevoo rasante natural (alternando entre Boeing/Airbus comercial e Jato executivo)
        lowPlaneTimer -= dt;
        if (lowPlaneTimer <= 0 && !isLowFlyoverActive && lowFlyoverPlanes.length > 0) {
          isLowFlyoverActive = true;
          lowFlyoverZ = cameraPos.z + 240;
          activeLowPlaneIdx = (activeLowPlaneIdx + 1) % lowFlyoverPlanes.length;
        }

        if (isLowFlyoverActive && lowFlyoverPlanes.length > 0) {
          lowFlyoverZ -= 64.0 * dt;
          const lowX = 0;
          const lowY = 34.0; // Altitude realista e natural acima dos telhados

          const currentPlane = lowFlyoverPlanes[activeLowPlaneIdx % lowFlyoverPlanes.length];
          lowFlyoverPlanes.forEach((p, idx) => {
            p.visible = idx === (activeLowPlaneIdx % lowFlyoverPlanes.length);
          });

          // Suave balanço aerodinâmico natural de asas durante o voo
          const bankingAngle = Math.sin(lowFlyoverZ * 0.018) * 0.045;
          currentPlane.position.set(lowX, lowY, lowFlyoverZ);
          currentPlane.rotation.set(0.012, 0, bankingAngle);

          // Projeta sombra nítida e ampla no asfalto acompanhando a aeronave
          planeShadowMesh.position.set(lowX, 0.038, lowFlyoverZ - 3.0);
          planeShadowMesh.visible = true;
          (planeShadowMesh.material as THREE.MeshBasicMaterial).opacity = 0.55;

          // 📳 TREMOR DE TELA POTENTE & ECLIPSE SOLAR COM APROXIMAÇÃO
          const distToPlayerZ = Math.abs(lowFlyoverZ - cameraPos.z);
          if (distToPlayerZ < 55) {
            const rumbleFactor = Math.cos((distToPlayerZ / 55) * Math.PI * 0.5); // 1.0 no zênite
            this.lowPlaneRumble = Math.pow(rumbleFactor, 0.72) * 1.85;
            const eclipseCoverage = Math.cos((Math.min(38, distToPlayerZ) / 38) * Math.PI * 0.5);
            sunburstMat.opacity *= (1.0 - eclipseCoverage * 0.90);
            sunLight.intensity *= (1.0 - eclipseCoverage * 0.55);
          } else {
            this.lowPlaneRumble = 0;
          }

          if (lowFlyoverZ < cameraPos.z - 55) {
            isLowFlyoverActive = false;
            this.lowPlaneRumble = 0;
            lowFlyoverPlanes.forEach((p) => { p.visible = false; });
            planeShadowMesh.visible = false;
            lowPlaneTimer = 28.0 + Math.random() * 14.0;
          }
        } else {
          this.lowPlaneRumble = 0;
          lowFlyoverPlanes.forEach((p) => { p.visible = false; });
          planeShadowMesh.visible = false;
        }
      }

      // 4. CELESTIAL DOME & CONSTELLATIONS ROTATION AT NIGHT
      celestialDome.rotation.y += 0.015 * dt;

      // 5. COLOR TRANSITIONS
      let currentMode: TimeOfDay = 'DAY';

      if (progress < 0.35) {
        currentMode = 'DAY';
        const t = progress / 0.35;
        currentSkyColor.lerpColors(dawnSky, daySky, t);
        currentFogColor.lerpColors(dawnFog, dayFog, t);
        ambientLight.color.setHex(0xffedd5);
        ambientLight.intensity = 1.35;
        sunLight.color.setHex(0xfffbeb);
        sunLight.intensity = 1.6; // Suave e agradável (antes 2.3)
        starMat.opacity = 0;
        constelStarMat.opacity = 0;
        constelLineMat.opacity = 0;
        updateAllCloudColors(0xffffff);
        sunCoreMat.color.setHex(0xffffff);
        coronaMat.color.setHex(0xfacc15);
      } else if (progress < 0.56) {
        currentMode = 'SUNSET';
        const t = (progress - 0.35) / 0.21;
        currentSkyColor.lerpColors(daySky, sunsetSky, t);
        currentFogColor.lerpColors(dayFog, sunsetFog, t);
        ambientLight.color.setHex(0xfb923c);
        ambientLight.intensity = 1.35;
        hemiLight.color.setHex(0xf43f5e);
        hemiLight.groundColor.setHex(0x7c2d12);
        sunLight.color.setHex(0xf97316);
        sunLight.intensity = 2.2 - t * 0.4;
        starMat.opacity = t * 0.3;
        constelStarMat.opacity = t * 0.35;
        constelLineMat.opacity = t * 0.15;
        updateAllCloudColors(0xffffff); // Mantém puras as cores ricas a óleo e rim lighting da referência
        // O sol escurece em direção ao horizonte (de ouro/âmbar para carmesim)
        _colA.setHex(0xfffbeb); _colB.setHex(0xf59e0b);
        sunCoreMat.color.lerpColors(_colA, _colB, t);
        _colA.setHex(0xfacc15); _colB.setHex(0xef4444);
        coronaMat.color.lerpColors(_colA, _colB, t);
      } else if (progress < 0.68) {
        currentMode = 'NIGHT';
        const t = (progress - 0.56) / 0.12;
        currentSkyColor.lerpColors(sunsetSky, duskSky, t);
        currentFogColor.lerpColors(sunsetFog, duskFog, t);
        ambientLight.color.setHex(0x312e81);
        ambientLight.intensity = 0.9 - t * 0.4;
        sunLight.color.setHex(0x818cf8);
        sunLight.intensity = 1.5 - t * 0.8;
        // Sol desaparecendo escuro no horizonte noturno
        _colA.setHex(0xd97706); _colB.setHex(0x381207);
        sunCoreMat.color.lerpColors(_colA, _colB, t);
        _colA.setHex(0x991b1b); _colB.setHex(0x181033);
        coronaMat.color.lerpColors(_colA, _colB, t);
        starMat.opacity = 0.3 + t * 0.65;
        constelStarMat.opacity = 0.35 + t * 0.65;
        constelLineMat.opacity = 0.15 + t * 0.35;
        updateAllCloudColors(0x64748b);
      } else if (progress < 0.88) {
        currentMode = 'NIGHT';
        const t = (progress - 0.68) / 0.20;
        currentSkyColor.lerpColors(duskSky, nightSky, t);
        currentFogColor.lerpColors(duskFog, nightFog, t);
        ambientLight.color.setHex(0x1e293b);
        ambientLight.intensity = 0.52;
        sunLight.color.setHex(0x93c5fd);
        sunLight.intensity = 0.85;
        starMat.opacity = 0.95;
        constelStarMat.opacity = 1.0;
        constelLineMat.opacity = 0.45;
        updateAllCloudColors(0x334155);
      } else {
        currentMode = 'DAY';
        const t = (progress - 0.88) / 0.12;
        currentSkyColor.lerpColors(nightSky, dawnSky, t);
        currentFogColor.lerpColors(nightFog, dawnFog, t);
        ambientLight.color.setHex(0xfef3c7);
        ambientLight.intensity = 0.52 + t * 0.8;
        sunLight.color.setHex(0xfde68a);
        sunLight.intensity = 0.85 + t * 1.4;
        starMat.opacity = (1 - t) * 0.95;
        constelStarMat.opacity = (1 - t);
        constelLineMat.opacity = (1 - t) * 0.45;
        updateAllCloudColors(0xfef08a);
        sunCoreMat.color.setHex(0xffffff);
        coronaMat.color.setHex(0xfbbf24);
      }

      // 🌦️ CICLO DE CHUVA OCASIONAL (Desativado no modo otimizado para poupar 100% da CPU mobile)
      if (isOptimizedMode) {
        this.isRaining = false;
        rainMesh.visible = false;
        rainLineMat.opacity = 0;
      } else {
        rainCycleTimer = (rainCycleTimer + dt) % 85.0;
        let targetRainIntensity = 0;
        if (rainCycleTimer > 45.0 && rainCycleTimer < 72.0) {
          const rTime = rainCycleTimer - 45.0;
          if (rTime < 3.5) targetRainIntensity = rTime / 3.5; // Entrada suave
          else if (rTime > 23.5) targetRainIntensity = Math.max(0, (27.0 - rTime) / 3.5); // Saída suave
          else targetRainIntensity = 1.0;
        }

        this.rainIntensity += (targetRainIntensity - this.rainIntensity) * Math.min(1.0, 2.5 * dt);
        this.isRaining = this.rainIntensity > 0.05;
      }

      if (this.isRaining) {
        rainMesh.visible = true;
        rainLineMat.opacity = this.rainIntensity * 0.65;
        rainMesh.position.set(cameraPos.x, 0, cameraPos.z + 10);

        // Queda rápida e inclinada dos traços finos de chuva
        const positions = rainGeo.attributes.position.array as Float32Array;
        const fallDt = dt;
        for (let r = 0; r < RAIN_COUNT; r++) {
          const fallDist = rainSpeeds[r] * fallDt;
          const windZ = 4.5 * fallDt;
          const windX = 1.0 * fallDt;

          // Vértice superior
          positions[r * 6 + 0] -= windX;
          positions[r * 6 + 1] -= fallDist;
          positions[r * 6 + 2] -= windZ;

          // Vértice inferior
          positions[r * 6 + 3] -= windX;
          positions[r * 6 + 4] -= fallDist;
          positions[r * 6 + 5] -= windZ;

          // Pingou no chão!
          if (positions[r * 6 + 4] <= 0.04) {
            const hitX = cameraPos.x + positions[r * 6 + 0];
            const hitZ = cameraPos.z + 10 + positions[r * 6 + 2];
            // Se cair dentro da pista ou calçadas próximas, cria ondulação de pingo
            if (Math.abs(positions[r * 6 + 0]) < 6.8 && Math.random() < 0.55) {
              triggerGroundSplash(hitX, hitZ);
            }

            const x = (Math.random() - 0.5) * 36;
            const y = 26.0 + Math.random() * 4;
            const z = (Math.random() - 0.5) * 45;
            const len = rainLengths[r];

            positions[r * 6 + 0] = x;
            positions[r * 6 + 1] = y;
            positions[r * 6 + 2] = z;

            positions[r * 6 + 3] = x - 0.04;
            positions[r * 6 + 4] = y - len;
            positions[r * 6 + 5] = z - 0.22;
          }
        }
        rainGeo.attributes.position.needsUpdate = true;

        // Atualização e expansão dos pingos no chão (water ripples)
        for (let s = 0; s < SPLASH_COUNT; s++) {
          const sp = splashPool[s];
          if (sp.active) {
            sp.life += dt;
            const prog = sp.life / sp.maxLife;
            if (prog >= 1.0) {
              sp.active = false;
              sp.mesh.visible = false;
            } else {
              const sc = 0.2 + prog * 0.95;
              sp.mesh.scale.set(sc, 1, sc);
              sp.mat.opacity = (1.0 - prog) * 0.85 * this.rainIntensity;
            }
          }
        }

        // Clima fica pouco escuro e chuvoso
        currentSkyColor.lerp(_overcastSky, this.rainIntensity * 0.50);
        currentFogColor.lerp(_overcastFog, this.rainIntensity * 0.55);
        sunLight.intensity *= (1.0 - this.rainIntensity * 0.38);
      } else {
        rainMesh.visible = false;
        rainLineMat.opacity = 0;
        for (let s = 0; s < SPLASH_COUNT; s++) {
          if (splashPool[s].active) {
            splashPool[s].active = false;
            splashPool[s].mesh.visible = false;
          }
        }
      }

      this.timeOfDay = currentMode;
      if (!currentScene.background || !(currentScene.background instanceof THREE.Color)) {
        currentScene.background = new THREE.Color();
      }
      (currentScene.background as THREE.Color).copy(currentSkyColor);

      // Harmonização cromática da Cúpula do Céu em Pincelada com a hora do dia
      if (currentMode === 'DAY') {
        painterlySkyDomeMat.color.setHex(0xffffff);
      } else if (currentMode === 'SUNSET') {
        painterlySkyDomeMat.color.setHex(0xffffff); // Mantém o degradê cinematográfico puro
      } else {
        painterlySkyDomeMat.color.setHex(0x38bdf8).multiplyScalar(0.25);
      }

      // Neblina calibrada para transição natural e gradual das casas no horizonte (sem corte seco e sem névoa branca)
      const targetDensity = currentMode === 'NIGHT' 
        ? (0.0022 + this.rainIntensity * 0.0010) 
        : (0.0016 + this.rainIntensity * 0.0012);

      if (currentScene.fog && currentScene.fog instanceof THREE.FogExp2) {
        currentScene.fog.color.copy(currentFogColor);
        currentScene.fog.density = targetDensity;
      } else {
        currentScene.fog = new THREE.FogExp2(currentFogColor, targetDensity);
      }
      sunLight.target.position.set(cameraPos.x, 0, cameraPos.z + 18);
      sunLight.target.updateMatrixWorld();
      sunLight.position.set(cameraPos.x + 18, 36, cameraPos.z + 48);

      return currentMode;
    },
    resetToDay() {
      cycleTimer = 44.0; // 44 / 220 = 0.20 (Dia ensolarado pleno e límpido)
      this.timeProgress = 0.20;
      this.timeOfDay = 'DAY';
      rainCycleTimer = 0.0;
      this.rainIntensity = 0.0;
      this.isRaining = false;
      rainMesh.visible = false;
      rainLineMat.opacity = 0;
      for (let s = 0; s < SPLASH_COUNT; s++) {
        if (splashPool[s].active) {
          splashPool[s].active = false;
          splashPool[s].mesh.visible = false;
        }
      }
      isLowFlyoverActive = false;
      this.lowPlaneRumble = 0;
      lowPlaneTimer = 25.0;

      // Iluminação e céu diurno radiante límpido
      currentSkyColor.setHex(0x0284c7);
      currentFogColor.setHex(0x38bdf8);
      ambientLight.color.setHex(0xffedd5);
      ambientLight.intensity = 1.35;
      hemiLight.color.setHex(0xbae6fd);
      hemiLight.groundColor.setHex(0x92400e);
      sunLight.color.setHex(0xfffbeb);
      sunLight.intensity = 1.6;
      starMat.opacity = 0;
      constelStarMat.opacity = 0;
      constelLineMat.opacity = 0;
      updateAllCloudColors(0xffffff);
      painterlySkyDomeMat.color.setHex(0xffffff);
      sunCoreMat.color.setHex(0xffffff);
      coronaMat.color.setHex(0xfacc15);
      sunburstMat.opacity = 0.28;
    },
    setSunset() {
      cycleTimer = 92.0; // Sunset (~0.418)
      this.timeProgress = 0.418;
      this.timeOfDay = 'SUNSET';
      currentSkyColor.copy(sunsetSky);
      currentFogColor.copy(sunsetFog);
      ambientLight.color.setHex(0xfb923c);
      ambientLight.intensity = 1.35;
      hemiLight.color.setHex(0xf43f5e);
      hemiLight.groundColor.setHex(0x7c2d12);
      sunLight.color.setHex(0xf97316);
      sunLight.intensity = 2.2;
      updateAllCloudColors(0xffffff);
      painterlySkyDomeMat.color.setHex(0xffffff);
      sunCoreMat.color.setHex(0xfffbeb);
      coronaMat.color.setHex(0xf97316);
      sunburstMat.opacity = 0.35;
    },
    setNight() {
      cycleTimer = 160.0; // Night (~0.727)
      this.timeProgress = 0.727;
      this.timeOfDay = 'NIGHT';
      currentSkyColor.copy(nightSky);
      currentFogColor.copy(nightFog);
      ambientLight.color.setHex(0x1e293b);
      ambientLight.intensity = 0.52;
      hemiLight.color.setHex(0x1e1b4b);
      hemiLight.groundColor.setHex(0x0f172a);
      sunLight.color.setHex(0x93c5fd);
      sunLight.intensity = 0.85;
      updateAllCloudColors(0x334155);
      painterlySkyDomeMat.color.setHex(0x38bdf8).multiplyScalar(0.25);
      starMat.opacity = 0.95;
      constelStarMat.opacity = 1.0;
      constelLineMat.opacity = 0.45;
    },
    setTimeOfDayMode(mode: TimeOfDay) {
      if (mode === 'DAY') this.resetToDay();
      else if (mode === 'SUNSET') this.setSunset();
      else if (mode === 'NIGHT') this.setNight();
    },
    toggleTimeOfDay(): TimeOfDay {
      if (this.timeOfDay === 'DAY') {
        this.setSunset();
      } else if (this.timeOfDay === 'SUNSET') {
        this.setNight();
      } else {
        this.resetToDay();
      }
      return this.timeOfDay;
    },
    lensFlareGroup,
    setOptimizedMode(optimized: boolean) {
      isOptimizedMode = optimized;
      sunLight.castShadow = !optimized;
      bikeHeadlight.castShadow = !optimized;
      // O Sol realista e sua coroa continuam 100% visíveis em todos os modos (custo zero de GPU)
      sunGroup.visible = true;
      opticalSunSprite.visible = true;
      atmosphericGlowSprite.visible = true;
      lensFlareGroup.visible = true;
      if (optimized) {
        isLowFlyoverActive = false;
        planeShadowMesh.visible = false;
        lowFlyoverPlanes.forEach((p) => { p.visible = false; });
      }
    },
    dispose() {
      const disposeNode = (node: any) => {
        try {
          if (node?.geometry && typeof node.geometry.dispose === 'function') {
            node.geometry.dispose();
          }
          if (node?.material) {
            if (Array.isArray(node.material)) {
              node.material.forEach((m: any) => {
                if (m && typeof m.dispose === 'function') m.dispose();
              });
            } else if (typeof node.material.dispose === 'function') {
              node.material.dispose();
            }
          }
        } catch (_) {}
      };
      try { sunGroup?.traverse?.(disposeNode); } catch (_) {}
      try { lensFlareGroup?.traverse?.(disposeNode); } catch (_) {}
      try { moonGroup?.traverse?.(disposeNode); } catch (_) {}
      try { celestialDome?.traverse?.(disposeNode); } catch (_) {}
      try { painterlySkyDomeMesh?.traverse?.(disposeNode); } catch (_) {}
      try { airplaneGroup?.traverse?.(disposeNode); } catch (_) {}
      try { if (typeof cloudsGroup !== 'undefined') cloudsGroup?.traverse?.(disposeNode); } catch (_) {}
      
      try { (opticalSunTex as any)?.dispose?.(); } catch (_) {}
      try { (atmosphericGlowTex as any)?.dispose?.(); } catch (_) {}
      try { (sunburstTex as any)?.dispose?.(); } catch (_) {}
      try { (shadowTex as any)?.dispose?.(); } catch (_) {}
      try { (painterlySkyTex as any)?.dispose?.(); } catch (_) {}
      try { (texBrushRibbon as any)?.dispose?.(); } catch (_) {}
      try { (texCirrusWisp as any)?.dispose?.(); } catch (_) {}
      
      // These objects might not be in the traversed groups
      try { if (typeof rainGeo !== 'undefined') rainGeo?.dispose?.(); } catch (_) {}
      try { if (typeof rainLineMat !== 'undefined') rainLineMat?.dispose?.(); } catch (_) {}
      try { sharedCloudGeo?.dispose?.(); } catch (_) {}
      try { cloudMatRibbon?.dispose?.(); } catch (_) {}
      try { cloudMatCirrus?.dispose?.(); } catch (_) {}
      try { if (typeof painterlySkyDomeGeo !== 'undefined') painterlySkyDomeGeo?.dispose?.(); } catch (_) {}
      try { if (typeof painterlySkyDomeMat !== 'undefined') painterlySkyDomeMat?.dispose?.(); } catch (_) {}
    }
  };
}
