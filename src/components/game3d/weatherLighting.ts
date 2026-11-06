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
  // 6. CÉU AZUL VIBRANTE E NUVENS EM PINCELADA CEL SHADING SUAVES
  // Elimina todo o esbranquiçado leitoso do céu e traz nuvens cel artísticas
  // espalhadas aleatoriamente em 3 camadas e se movendo suavemente.
  // =========================================================================
  function createPainterlySkyTexture(): THREE.CanvasTexture {
    if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
    const width = 2048;
    const height = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // 1. Degradê de céu tropical brasileiro profundo e límpido (ZERO BRANCO LEITOSO)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0.00, '#035388'); // Azul safira cerúleo profundo no zênite
    skyGrad.addColorStop(0.20, '#0284c7'); // Azul cobalto vibrante e luminoso
    skyGrad.addColorStop(0.48, '#0ea5e9'); // Azul celeste radiante (luz do dia)
    skyGrad.addColorStop(0.74, '#38bdf8'); // Azul piscina / ciano atmosférico límpido
    skyGrad.addColorStop(1.00, '#60a5fa'); // Azul horizonte limpo, vivo e saturado (sem neblina branca)
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Ondas suaves de ar e pinceladas de atmosfera transparente (sem estragar o azul profundo)
    function drawSoftAirRibbon(x0: number, y0: number, x1: number, y1: number, w: number, color: string) {
      ctx!.save();
      ctx!.strokeStyle = color;
      ctx!.lineWidth = w;
      ctx!.lineCap = 'round';
      ctx!.beginPath();
      ctx!.moveTo(x0, y0);
      const cpX = (x0 + x1) * 0.5 + 40;
      const cpY = (y0 + y1) * 0.5 - 18;
      ctx!.quadraticCurveTo(cpX, cpY, x1, y1);
      ctx!.stroke();
      // Repetição seamless horizontal
      if (x1 > width - 50) {
        ctx!.beginPath();
        ctx!.moveTo(x0 - width, y0);
        ctx!.quadraticCurveTo(cpX - width, cpY, x1 - width, y1);
        ctx!.stroke();
      }
      if (x0 < 50) {
        ctx!.beginPath();
        ctx!.moveTo(x0 + width, y0);
        ctx!.quadraticCurveTo(cpX + width, cpY, x1 + width, y1);
        ctx!.stroke();
      }
      ctx!.restore();
    }

    // Apenas filamentos ultra suaves de brisa celeste (0.05 a 0.08 de opacidade)
    for (let i = 0; i < 16; i++) {
      const x0 = (i * 135) % width;
      const y0 = 80 + ((i * 47) % 380);
      const len = 280 + (i % 4) * 80;
      const x1 = x0 + len;
      const y1 = y0 + 15 + (i % 3) * 10;
      drawSoftAirRibbon(x0, y0, x1, y1, 28, 'rgba(186, 230, 253, 0.06)');
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  // ☁️ 1. Textura Cel Shading: Cúmulus Majestoso em Pincelada Artística (Estilo Anime/Ghibli)
  function createCelCumulusCloudTexture(): THREE.CanvasTexture {
    if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
    const width = 512;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // 1. Base / Sombra Cel Suave (volume inferior em tom azul-celeste suave)
    const shadowGrad = ctx.createLinearGradient(0, 90, 0, height);
    shadowGrad.addColorStop(0.0, 'rgba(186, 230, 253, 0.0)');
    shadowGrad.addColorStop(0.4, 'rgba(186, 230, 253, 0.70)');
    shadowGrad.addColorStop(1.0, 'rgba(147, 197, 253, 0.85)');
    ctx.fillStyle = shadowGrad;

    const shadowLobes = [
      { x: 135, y: 165, rx: 85, ry: 48 },
      { x: 256, y: 175, rx: 145, ry: 58 },
      { x: 375, y: 165, rx: 90, ry: 50 },
      { x: 210, y: 195, rx: 110, ry: 40 },
      { x: 315, y: 195, rx: 105, ry: 40 },
    ];
    shadowLobes.forEach(l => {
      ctx.beginPath();
      ctx.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Camada Cel Principal (Corpo fofo branco-creme aveludado)
    ctx.fillStyle = 'rgba(250, 253, 255, 0.96)';
    const bodyLobes = [
      { x: 120, y: 145, rx: 75, ry: 46 },
      { x: 185, y: 112, rx: 85, ry: 60 },
      { x: 270, y: 92, rx: 96, ry: 68 },
      { x: 350, y: 120, rx: 82, ry: 56 },
      { x: 405, y: 152, rx: 65, ry: 42 },
      { x: 256, y: 142, rx: 125, ry: 56 },
    ];
    bodyLobes.forEach(l => {
      ctx.beginPath();
      ctx.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Pinceladas Cel Shading nos Topos (Realces luminosos nítidos e orgânicos)
    ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
    const highlightCrests = [
      { x: 185, y: 88, rx: 62, ry: 34 },
      { x: 268, y: 70, rx: 76, ry: 40 },
      { x: 346, y: 96, rx: 62, ry: 34 },
      { x: 124, y: 126, rx: 50, ry: 26 },
      { x: 395, y: 136, rx: 46, ry: 24 },
    ];
    highlightCrests.forEach(c => {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Efeito de Pincelada / Dry Brush chanfrada nas bordas
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 3.2;
    highlightCrests.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y + 4, c.rx * 0.9, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  // ☁️ 2. Textura Cel Shading: Pincelada Cirrostratus Alongada (Brisa e Movimento Horizontal)
  function createCelStratusCloudTexture(): THREE.CanvasTexture {
    if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
    const width = 512;
    const height = 192;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Degradê horizontal feathered com pontas artísticas afiladas
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0.00, 'rgba(255, 255, 255, 0.0)');
    grad.addColorStop(0.12, 'rgba(224, 242, 254, 0.55)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.92)');
    grad.addColorStop(0.70, 'rgba(255, 255, 255, 0.90)');
    grad.addColorStop(0.88, 'rgba(224, 242, 254, 0.50)');
    grad.addColorStop(1.00, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = grad;
    const strokes = [
      { y: 96, rx: 220, ry: 30, tilt: -0.02 },
      { y: 78, rx: 165, ry: 22, tilt: 0.015 },
      { y: 116, rx: 185, ry: 24, tilt: -0.01 },
      { y: 68, rx: 115, ry: 16, tilt: -0.025 },
      { y: 126, rx: 135, ry: 18, tilt: 0.02 },
    ];
    strokes.forEach(s => {
      ctx.beginPath();
      ctx.ellipse(256, s.y, s.rx, s.ry, s.tilt, 0, Math.PI * 2);
      ctx.fill();
    });

    // Crista central nítida (pincelada luminosa com luz direta)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.beginPath();
    ctx.ellipse(256, 88, 145, 12, -0.01, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  // ☁️ 3. Textura Cel Shading: Tufo de Nuvem Puffy Compacto (Anime Cel Puffs)
  function createCelPuffCloudTexture(): THREE.CanvasTexture {
    if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
    const width = 384;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Sombra cel base
    ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
    ctx.beginPath();
    ctx.ellipse(192, 162, 125, 46, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bolotas e lóbulos de nuvem cel fofa
    ctx.fillStyle = 'rgba(250, 253, 255, 0.95)';
    const puffs = [
      { x: 115, y: 148, r: 48 },
      { x: 180, y: 116, r: 64 },
      { x: 248, y: 126, r: 54 },
      { x: 280, y: 152, r: 44 },
    ];
    puffs.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Realce luminoso cel no topo
    ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
    ctx.beginPath();
    ctx.arc(180, 96, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(128, 122, 34, 0, Math.PI * 2);
    ctx.fill();

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

  // ☁️ NUVENS CEL SHADING ESTILIZADAS EM PINCELADAS (Espalhadas em 3 camadas e se movendo suavemente)
  const cloudsGroup = new THREE.Group();
  cloudsGroup.name = 'CelPainterlyCloudsGroup';

  const texCumulus = createCelCumulusCloudTexture();
  const texStratus = createCelStratusCloudTexture();
  const texPuff = createCelPuffCloudTexture();

  const cloudMat1 = new THREE.MeshBasicMaterial({
    map: texCumulus,
    color: 0xffffff,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });

  const cloudMat2 = new THREE.MeshBasicMaterial({
    map: texStratus,
    color: 0xffffff,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });

  const cloudMat3 = new THREE.MeshBasicMaterial({
    map: texPuff,
    color: 0xffffff,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });

  const cloudMats = [cloudMat1, cloudMat2, cloudMat3];

  function updateAllCloudColors(hex: number) {
    cloudMat1.color.setHex(hex);
    cloudMat2.color.setHex(hex);
    cloudMat3.color.setHex(hex);
  }

  // 🚀 OTIMIZAÇÃO: 1 única geometria compartilhada na VRAM para todas as 30 nuvens!
  const sharedCloudGeo = new THREE.PlaneGeometry(1, 1);

  const TOTAL_CLOUDS = 30;
  for (let i = 0; i < TOTAL_CLOUDS; i++) {
    const matIdx = i % 3;
    const mesh = new THREE.Mesh(sharedCloudGeo, cloudMats[matIdx]);
    mesh.raycast = () => {};

    // 3 Camadas de Altitude e Proporção Visual:
    let baseW = 85;
    let baseH = 36;
    let altitudeY = 75;
    let depthZ = 120;
    let driftSpeed = 0.42;

    if (i < 8) {
      // Camada 1: Baixa / Horizonte distante
      baseW = 60 + (i % 4) * 20;
      baseH = 22 + (i % 3) * 8;
      altitudeY = 46 + (i % 4) * 6;
      depthZ = 210 + (i % 5) * 35;
      driftSpeed = 0.22 + (i % 3) * 0.08;
    } else if (i < 20) {
      // Camada 2: Média (Cumulus fofas de destaque cel)
      baseW = 85 + (i % 5) * 22;
      baseH = 34 + (i % 4) * 12;
      altitudeY = 68 + (i % 5) * 8;
      depthZ = 125 + (i % 6) * 30;
      driftSpeed = 0.36 + (i % 4) * 0.10;
    } else {
      // Camada 3: Alta (Cirros alongados e mechas celestes)
      baseW = 110 + (i % 4) * 28;
      baseH = 30 + (i % 3) * 10;
      altitudeY = 96 + (i % 4) * 10;
      depthZ = 75 + (i % 4) * 40;
      driftSpeed = 0.46 + (i % 3) * 0.12;
    }

    mesh.scale.set(baseW, baseH, 1);
    mesh.rotation.x = -Math.PI * 0.07; // Leve inclinação para visão da câmera

    // Posição X amplamente distribuída de forma pseudo-aleatória equilibrada
    const xStep = 540 / TOTAL_CLOUDS;
    const rawX = -270 + i * xStep + ((i * 37) % 35) - 17;
    const posX = Math.abs(rawX) < 20 ? (i % 2 === 0 ? rawX + 32 : rawX - 32) : rawX;

    mesh.position.set(posX, altitudeY, depthZ);
    mesh.userData = {
      baseY: altitudeY,
      floatPhase: (i * 0.73) % (Math.PI * 2),
      driftSpeed: driftSpeed,
      bobAmp: 0.005 + (i % 3) * 0.003,
      bobFreq: 0.6 + (i % 4) * 0.15,
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
  let cycleTimer = 45.0;

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
    timeOfDay: 'DAY',
    timeProgress: 0.2,
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
        ambientLight.intensity = 1.3 - t * 0.4;
        sunLight.color.setHex(0xf97316);
        sunLight.intensity = 2.4 - t * 0.9;
        starMat.opacity = t * 0.3;
        constelStarMat.opacity = t * 0.35;
        constelLineMat.opacity = t * 0.15;
        updateAllCloudColors(0xfca5a5);
        // O sol escurece horizontalmente em direção ao horizonte (de branco/ouro para âmbar e carmesim)
        _colA.setHex(0xffffff); _colB.setHex(0xd97706);
        sunCoreMat.color.lerpColors(_colA, _colB, t);
        _colA.setHex(0xfacc15); _colB.setHex(0x991b1b);
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
        painterlySkyDomeMat.color.setHex(0xfecdd3);
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
      sunLight.color.setHex(0xfffbeb);
      sunLight.intensity = 1.6;
      starMat.opacity = 0;
      constelStarMat.opacity = 0;
      constelLineMat.opacity = 0;
      updateAllCloudColors(0xffffff);
      sunCoreMat.color.setHex(0xffffff);
      coronaMat.color.setHex(0xfacc15);
      sunburstMat.opacity = 0.28;
    },
    toggleTimeOfDay(): TimeOfDay {
      if (this.timeOfDay === 'DAY') {
        cycleTimer = 95.0; // Sunset (~0.43)
      } else if (this.timeOfDay === 'SUNSET') {
        cycleTimer = 150.0; // Night (~0.68)
      } else {
        cycleTimer = 44.0; // Day (~0.20)
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
      try { (texCumulus as any)?.dispose?.(); } catch (_) {}
      try { (texStratus as any)?.dispose?.(); } catch (_) {}
      try { (texPuff as any)?.dispose?.(); } catch (_) {}
      
      // These objects might not be in the traversed groups
      try { if (typeof rainGeo !== 'undefined') rainGeo?.dispose?.(); } catch (_) {}
      try { if (typeof rainLineMat !== 'undefined') rainLineMat?.dispose?.(); } catch (_) {}
      try { sharedCloudGeo?.dispose?.(); } catch (_) {}
      try { cloudMat1?.dispose?.(); } catch (_) {}
      try { cloudMat2?.dispose?.(); } catch (_) {}
      try { cloudMat3?.dispose?.(); } catch (_) {}
      try { if (typeof painterlySkyDomeGeo !== 'undefined') painterlySkyDomeGeo?.dispose?.(); } catch (_) {}
      try { if (typeof painterlySkyDomeMat !== 'undefined') painterlySkyDomeMat?.dispose?.(); } catch (_) {}
    }
  };
}
