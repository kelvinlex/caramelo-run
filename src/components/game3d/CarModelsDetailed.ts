import * as THREE from 'three';
import { getSharedMaterials } from './sceneryModels';

// Cache for realistic car textures and materials
let carMatsCache: {
  chrome: THREE.Material;
  tire: THREE.Material;
  glass: THREE.Material;
  headlight: THREE.Material;
  taillight: THREE.Material;
  grille: THREE.Material;
  interior: THREE.Material;
  licensePlate: THREE.Material;
} | null = null;

let cachedBrazilCargoTex: THREE.CanvasTexture | null = null;
function getBrazilCargoTexture(): THREE.Texture {
  if (cachedBrazilCargoTex) return cachedBrazilCargoTex;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // Green Background
    ctx.fillStyle = '#009c3b';
    ctx.fillRect(0, 0, 512, 256);

    // Yellow Rhombus (Losango)
    ctx.fillStyle = '#ffdf00';
    ctx.beginPath();
    ctx.moveTo(256, 25);
    ctx.lineTo(480, 128);
    ctx.lineTo(256, 231);
    ctx.lineTo(32, 128);
    ctx.closePath();
    ctx.fill();

    // Blue Celestial Globe (Círculo Azul)
    ctx.fillStyle = '#002776';
    ctx.beginPath();
    ctx.arc(256, 128, 65, 0, Math.PI * 2);
    ctx.fill();

    // White Curved Strip
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(256, 160, 62, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) {
      const sx = 220 + (i * 7) % 70;
      const sy = 115 + (i * 11) % 40;
      ctx.fillRect(sx, sy, 3, 3);
    }

    // Brazilian Truck Lettering
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BRASIL TRANSPORTES 🇧🇷', 256, 240);
    ctx.fillText('QUEBRADA EXPRESS', 256, 32);

    cachedBrazilCargoTex = new THREE.CanvasTexture(canvas);
    return cachedBrazilCargoTex;
  } catch (e) {
    return new THREE.Texture();
  }
}

let cachedPlateTex: THREE.CanvasTexture | null = null;
function getPlateTexture(): THREE.Texture {
  if (cachedPlateTex) return cachedPlateTex;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 64);

    // Blue Mercosul strip
    ctx.fillStyle = '#003399';
    ctx.fillRect(0, 0, 128, 18);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BRASIL', 64, 13);

    // Plate Letters
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BRA-2E26', 64, 48);

    cachedPlateTex = new THREE.CanvasTexture(canvas);
    return cachedPlateTex;
  } catch (e) {
    return new THREE.Texture();
  }
}

let cachedVanTex: THREE.CanvasTexture | null = null;
function getDeliveryVanTexture(): THREE.Texture {
  if (cachedVanTex) return cachedVanTex;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 256);

    // Yellow / Blue Brazilian Delivery Stripe
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 100, 512, 55);

    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 155, 512, 18);

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ENTREGAS DA QUEBRADA 📦', 256, 140);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('EXPRESS SEDEX • BRASIL', 256, 210);

    cachedVanTex = new THREE.CanvasTexture(canvas);
    return cachedVanTex;
  } catch (e) {
    return new THREE.Texture();
  }
}

// 🌟 TEXTURAS PROCEDURAIS PARA FARÓIS REALISTAS E ILUMINAÇÃO DE ASFALTO
let cachedCarBulbTex: THREE.CanvasTexture | null = null;
function getCarHeadlightBulbTexture(): THREE.Texture {
  if (cachedCarBulbTex) return cachedCarBulbTex;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // Halo óptico automotivo circular realista (centro incandescente e suave atenuação)
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.18, 'rgba(254, 250, 230, 0.90)');
    grad.addColorStop(0.45, 'rgba(245, 235, 200, 0.40)');
    grad.addColorStop(0.75, 'rgba(230, 240, 255, 0.10)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    cachedCarBulbTex = new THREE.CanvasTexture(canvas);
    return cachedCarBulbTex;
  } catch (e) {
    return new THREE.Texture();
  }
}

let cachedGroundLightTex: THREE.CanvasTexture | null = null;
function getHeadlightGroundTexture(): THREE.Texture {
  if (cachedGroundLightTex) return cachedGroundLightTex;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // 1. Projeção dupla fotométrica realista no asfalto (dois fachos suaves dos faróis esquerdo e direito)
    const drawBeam = (cx: number) => {
      const grad = ctx.createRadialGradient(cx, 32, 10, cx, 220, 210);
      grad.addColorStop(0.0, 'rgba(255, 255, 245, 0.65)');
      grad.addColorStop(0.18, 'rgba(254, 250, 225, 0.42)');
      grad.addColorStop(0.42, 'rgba(240, 245, 255, 0.20)');
      grad.addColorStop(0.72, 'rgba(215, 235, 255, 0.05)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, 220, 210, 0, Math.PI * 2);
      ctx.fill();
    };

    drawBeam(90);
    drawBeam(166);

    // 2. Máscara de atenuação progressiva nas bordas (sem nenhuma borda dura na pista)
    ctx.globalCompositeOperation = 'destination-in';
    const vertFade = ctx.createLinearGradient(0, 0, 0, 512);
    vertFade.addColorStop(0.0, 'rgba(0,0,0,0)');
    vertFade.addColorStop(0.06, 'rgba(0,0,0,1)');
    vertFade.addColorStop(0.82, 'rgba(0,0,0,0.85)');
    vertFade.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = vertFade;
    ctx.fillRect(0, 0, 256, 512);

    const horizFade = ctx.createLinearGradient(0, 0, 256, 0);
    horizFade.addColorStop(0.0, 'rgba(0,0,0,0)');
    horizFade.addColorStop(0.12, 'rgba(0,0,0,1)');
    horizFade.addColorStop(0.88, 'rgba(0,0,0,1)');
    horizFade.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = horizFade;
    ctx.fillRect(0, 0, 256, 512);
    ctx.globalCompositeOperation = 'source-over';

    cachedGroundLightTex = new THREE.CanvasTexture(canvas);
    return cachedGroundLightTex;
  } catch (e) {
    return new THREE.Texture();
  }
}

export interface VehicleHeadlightRig {
  group: THREE.Group;
  setIntensity: (intensity: number) => void;
}

export function createVehicleHeadlightRigs(
  frontZ: number,
  hlY: number,
  widthApart: number,
  isTruck = false
): VehicleHeadlightRig {
  const group = new THREE.Group();
  group.name = 'headlightRig';

  const beamLength = isTruck ? 17.0 : 13.0;

  // 1. Projeção de iluminação suave e fotométrica no asfalto (sem cones artificiais no ar)
  const groundGeo = new THREE.PlaneGeometry(isTruck ? 3.6 : 3.0, beamLength * 1.15);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshBasicMaterial({
    map: getHeadlightGroundTexture(),
    color: 0xfffbeb,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.set(0, 0.026, frontZ + beamLength * 0.52);
  group.add(groundMesh);

  // 2. Bulbos frontais incandescentes (halo óptico suave e circular nas lentes dos faróis)
  const bulbGeo = new THREE.PlaneGeometry(0.36, 0.36);
  const bulbMat = new THREE.MeshBasicMaterial({
    map: getCarHeadlightBulbTexture(),
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const bulbL = new THREE.Mesh(bulbGeo, bulbMat);
  bulbL.position.set(-widthApart, hlY, frontZ + 0.03);
  const bulbR = bulbL.clone();
  bulbR.position.x = widthApart;
  group.add(bulbL, bulbR);

  group.visible = false;

  return {
    group,
    setIntensity: (intensity: number) => {
      const clamped = Math.max(0, Math.min(1, intensity));
      // Facho no asfalto: surge suavemente ao entardecer e atinge pico à noite
      groundMat.opacity = clamped * (isTruck ? 0.62 : 0.50);
      groundMesh.visible = clamped > 0.01;
      // Bulbos nos faróis dianteiros: brilho fotométrico realista
      bulbMat.opacity = 0.15 + clamped * 0.85;
      group.visible = true;
    },
  };
}

function getCarMaterials() {
  if (carMatsCache) return carMatsCache;
  const shared = getSharedMaterials();

  const plateTex = getPlateTexture();

  carMatsCache = {
    chrome: shared.chrome,
    tire: shared.rubberTire,
    glass: new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    }),
    headlight: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffbeb,
      emissiveIntensity: 3.5,
      roughness: 0.1,
    }),
    taillight: new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 2.0,
      roughness: 0.2,
    }),
    grille: new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.8,
      roughness: 0.4,
    }),
    interior: new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.8,
    }),
    licensePlate: new THREE.MeshBasicMaterial({ map: plateTex }),
  };

  return carMatsCache;
}

export function createUltraRealisticCar(typeIndex = 0): THREE.Group {
  const mats = getCarMaterials();
  const group = new THREE.Group();

  const carColors = [
    0xdc2626, // Vermelho Fogo Metálico
    0x0284c7, // Azul Oceano Elétrico
    0x16a34a, // Verde Esmeralda Tropical
    0xfacc15, // Amarelo Canário Esportivo
    0xf8fafc, // Branco Pérola Cristalino
    0x18181b, // Preto Ônix Metalizado
    0x94a3b8, // Prata Lunar Espelhado
    0x7c3aed, // Roxo Açaí Profundo
    0xe11d48, // Vermelho Carmim Sangue
    0xd97706, // Cobre Metálico Pôr do Sol
    0x0d9488, // Verde Petróleo Turquesa
    0x475569, // Cinza Chumbo Grafite Fosco
    0xf97316, // Laranja Tangerina Tuning
    0x4f46e5, // Azul Cobalto Premium
    0xb45309, // Dourado Champanhe Luxo
  ];
  const color = carColors[typeIndex % carColors.length];
  const paintMat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.86,
    roughness: 0.16,
  });

  const carType = typeIndex % 5;

  if (carType === 0) {
    // =========================================================================
    // 1. SEDAN EXECUTIVO / TÁXI MODERNO (4 Portas, Linhas Retas e Aerodinâmicas)
    // =========================================================================
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.52, 4.35), paintMat);
    chassis.position.y = 0.52;
    chassis.castShadow = false;
    group.add(chassis);

    // Aerodynamic Cabin Roof
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.56, 2.3), paintMat);
    cabin.position.set(0, 1.04, -0.15);
    cabin.castShadow = false;
    group.add(cabin);

    // Front Slanted Windshield
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.65), mats.glass);
    windshield.position.set(0, 1.05, 0.98);
    windshield.rotation.x = -0.52;
    group.add(windshield);

    // Rear Slanted Glass
    const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.6), mats.glass);
    rearGlass.position.set(0, 1.05, -1.28);
    rearGlass.rotation.x = 0.52;
    rearGlass.rotation.y = Math.PI;
    group.add(rearGlass);

    // Side Windows
    const sideGlassL = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.42), mats.glass);
    sideGlassL.position.set(-0.78, 1.02, -0.15);
    sideGlassL.rotation.y = -Math.PI / 2;
    const sideGlassR = sideGlassL.clone();
    sideGlassR.position.x = 0.78;
    sideGlassR.rotation.y = Math.PI / 2;
    group.add(sideGlassL, sideGlassR);

    // Modern Chrome Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.26, 0.08), mats.grille);
    grille.position.set(0, 0.52, 2.18);
    group.add(grille);

    // Horizontal Sleek Headlights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.1), mats.headlight);
    hlL.position.set(-0.66, 0.56, 2.18);
    const hlR = hlL.clone();
    hlR.position.set(0.66, 0.56, 2.18);
    group.add(hlL, hlR);

    // Sleek Taillights
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.08), mats.taillight);
    tlL.position.set(-0.66, 0.58, -2.18);
    const tlR = tlL.clone();
    tlR.position.set(0.66, 0.58, -2.18);
    group.add(tlL, tlR);

    // Side Mirrors
    const mirrorL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.16), paintMat);
    mirrorL.position.set(-0.94, 0.96, 0.7);
    const mirrorR = mirrorL.clone();
    mirrorR.position.set(0.94, 0.96, 0.7);
    group.add(mirrorL, mirrorR);

  } else if (carType === 1) {
    // =========================================================================
    // 2. HATCHBACK POPULAR MODERNO (HB20 / Onix / Gol G6 - Compacto & Esportivo)
    // =========================================================================
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.54, 3.8), paintMat);
    chassis.position.y = 0.52;
    chassis.castShadow = false;
    group.add(chassis);

    // Sporty Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.6, 2.1), paintMat);
    cabin.position.set(0, 1.06, -0.32);
    cabin.castShadow = false;
    group.add(cabin);

    // Rear Spoiler (Aerofólio Esportivo)
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.25), mats.interior);
    spoiler.position.set(0, 1.38, -1.35);
    group.add(spoiler);

    // Slanted Front Windshield
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.68), mats.glass);
    windshield.position.set(0, 1.06, 0.72);
    windshield.rotation.x = -0.58;
    group.add(windshield);

    // Slanted Hatchback Rear Glass
    const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.58), mats.glass);
    rearGlass.position.set(0, 1.05, -1.34);
    rearGlass.rotation.x = 0.58;
    rearGlass.rotation.y = Math.PI;
    group.add(rearGlass);

    // Sport Front Honeycomb Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 0.08), mats.grille);
    grille.position.set(0, 0.48, 1.91);
    group.add(grille);

    // Angled Modern Headlights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.1), mats.headlight);
    hlL.position.set(-0.64, 0.56, 1.91);
    const hlR = hlL.clone();
    hlR.position.set(0.64, 0.56, 1.91);
    group.add(hlL, hlR);

    // Taillights
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.08), mats.taillight);
    tlL.position.set(-0.65, 0.65, -1.91);
    const tlR = tlL.clone();
    tlR.position.set(0.65, 0.65, -1.91);
    group.add(tlL, tlR);

  } else if (carType === 2) {
    // =========================================================================
    // 3. SUV URBANO / JEEP COMPASS (Alto, Robusto, com Rack de Teto)
    // =========================================================================
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.65, 4.4), paintMat);
    chassis.position.y = 0.68;
    chassis.castShadow = false;
    group.add(chassis);

    // Tall Spacious Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.68, 2.5), paintMat);
    cabin.position.set(0, 1.32, -0.1);
    cabin.castShadow = false;
    group.add(cabin);

    // Roof Rack (Barras Longitudinais de Teto)
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2.2), mats.chrome);
    railL.position.set(-0.72, 1.7, -0.1);
    const railR = railL.clone();
    railR.position.set(0.72, 1.7, -0.1);
    group.add(railL, railR);

    // Windshields
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 0.72), mats.glass);
    windshield.position.set(0, 1.32, 1.15);
    windshield.rotation.x = -0.42;
    group.add(windshield);

    const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.64), mats.glass);
    rearGlass.position.set(0, 1.32, -1.34);
    rearGlass.rotation.x = 0.38;
    rearGlass.rotation.y = Math.PI;
    group.add(rearGlass);

    // Imposing Front Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.38, 0.1), mats.grille);
    grille.position.set(0, 0.68, 2.21);
    group.add(grille);

    // DRL LED Headlights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.1), mats.headlight);
    hlL.position.set(-0.72, 0.74, 2.21);
    const hlR = hlL.clone();
    hlR.position.set(0.72, 0.74, 2.21);
    group.add(hlL, hlR);

    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.25, 0.08), mats.taillight);
    tlL.position.set(-0.75, 0.78, -2.21);
    const tlR = tlL.clone();
    tlR.position.set(0.75, 0.78, -2.21);
    group.add(tlL, tlR);

  } else if (carType === 3) {
    // =========================================================================
    // 4. PICAPE CABINE DUPLA / HILUX / TORO (Com Caçamba e Santantônio)
    // =========================================================================
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.68, 4.5), paintMat);
    cab.position.y = 0.68;
    cab.castShadow = false;
    group.add(cab);

    const topCab = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.68, 2.0), paintMat);
    topCab.position.set(0, 1.32, 0.25);
    topCab.castShadow = false;
    group.add(topCab);

    // Santantônio Tubular Cromado
    const rollBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), mats.chrome);
    rollBar.rotateZ(Math.PI / 2);
    rollBar.position.set(0, 1.62, -0.8);
    group.add(rollBar);

    // Open cargo bed in rear
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.35, 1.6), mats.interior);
    bed.position.set(0, 0.88, -1.35);
    group.add(bed);

    // Glass
    const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.65), mats.glass);
    frontGlass.position.set(0, 1.32, 1.25);
    frontGlass.rotation.x = -0.38;
    group.add(frontGlass);

    // Front Bumper & Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.38, 0.1), mats.grille);
    grille.position.set(0, 0.68, 2.26);
    group.add(grille);

    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.1), mats.headlight);
    hlL.position.set(-0.74, 0.72, 2.26);
    const hlR = hlL.clone();
    hlR.position.set(0.74, 0.72, 2.26);
    group.add(hlL, hlR);

    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.38, 0.1), mats.taillight);
    tlL.position.set(-0.82, 0.8, -2.26);
    const tlR = tlL.clone();
    tlR.position.set(0.82, 0.8, -2.26);
    group.add(tlL, tlR);

  } else {
    // =========================================================================
    // 5. FURGÃO / FIORINO / VAN DE ENTREGA (Com Baú e Textura de Entregas)
    // =========================================================================
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.7, 4.3), paintMat);
    cab.position.y = 0.68;
    cab.castShadow = false;
    group.add(cab);

    // Delivery Box Cargo Body
    const vanTex = getDeliveryVanTexture();
    const vanMatSide = new THREE.MeshStandardMaterial({ map: vanTex, roughness: 0.4 });
    const vanBox = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.25, 2.6), [
      vanMatSide, vanMatSide, paintMat, paintMat, paintMat, vanMatSide
    ]);
    vanBox.position.set(0, 1.4, -0.7);
    vanBox.castShadow = false;
    group.add(vanBox);

    // Front Cab Top
    const cabTop = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.65, 1.3), paintMat);
    cabTop.position.set(0, 1.25, 0.95);
    group.add(cabTop);

    // Windshield
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.65), mats.glass);
    windshield.position.set(0, 1.25, 1.6);
    windshield.rotation.x = -0.42;
    group.add(windshield);

    // Grille & Headlights
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.32, 0.1), mats.grille);
    grille.position.set(0, 0.65, 2.16);
    group.add(grille);

    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.1), mats.headlight);
    hlL.position.set(-0.68, 0.68, 2.16);
    const hlR = hlL.clone();
    hlR.position.set(0.68, 0.68, 2.16);
    group.add(hlL, hlR);

    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.08), mats.taillight);
    tlL.position.set(-0.8, 0.75, -2.01);
    const tlR = tlL.clone();
    tlR.position.set(0.8, 0.75, -2.01);
    group.add(tlL, tlR);
  }

  // Front & Rear Brazilian Mercosul License Plates
  const plateF = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.17), mats.licensePlate);
  plateF.position.set(0, 0.35, 2.2);
  group.add(plateF);

  const plateR = plateF.clone();
  plateR.position.set(0, 0.38, -2.2);
  plateR.rotation.y = Math.PI;
  group.add(plateR);

  // Door Handles on both sides
  const handleGeo = new THREE.BoxGeometry(0.04, 0.035, 0.14);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.25 });
  const handleFL = new THREE.Mesh(handleGeo, handleMat);
  handleFL.position.set(-0.94, 0.72, 0.35);
  const handleFR = handleFL.clone();
  handleFR.position.set(0.94, 0.72, 0.35);
  const handleRL = new THREE.Mesh(handleGeo, handleMat);
  handleRL.position.set(-0.94, 0.72, -0.45);
  const handleRR = handleRL.clone();
  handleRR.position.set(0.94, 0.72, -0.45);
  group.add(handleFL, handleFR, handleRL, handleRR);

  // Dual Sport Chrome Exhaust Tips at rear
  const exhaustGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.18, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  const exL = new THREE.Mesh(exhaustGeo, mats.chrome);
  exL.position.set(-0.45, 0.22, -2.18);
  const exR = exL.clone();
  exR.position.set(0.45, 0.22, -2.18);
  group.add(exL, exR);

  // 4 REALISTIC SPORT ALLOY WHEELS + RED BRAKE CALIPERS + BRAKE ROTORS
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 18);
  wheelGeo.rotateZ(Math.PI / 2);

  const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.23, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.92, roughness: 0.18 });

  // Metallic Brake Rotor Disc
  const brakeDiscGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.04, 16);
  brakeDiscGeo.rotateZ(Math.PI / 2);
  const brakeDiscMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.15 });

  // Red Brembo-style Brake Caliper
  const caliperGeo = new THREE.BoxGeometry(0.08, 0.11, 0.08);
  const caliperMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.4, roughness: 0.3 });

  // Chrome center hubcap
  const hubcapGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.24, 12);
  hubcapGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-0.96, 0.34, 1.25],
    [0.96, 0.34, 1.25],
    [-0.96, 0.34, -1.25],
    [0.96, 0.34, -1.25],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(x, y, z);
    wheelGroup.name = 'wheel';

    const tire = new THREE.Mesh(wheelGeo, mats.tire);
    tire.castShadow = false;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(rimGeo, rimMat);
    wheelGroup.add(rim);

    const hubcap = new THREE.Mesh(hubcapGeo, mats.chrome);
    wheelGroup.add(hubcap);

    // Brake disc inside
    const disc = new THREE.Mesh(brakeDiscGeo, brakeDiscMat);
    disc.position.x = x > 0 ? -0.04 : 0.04;
    wheelGroup.add(disc);

    // Red caliper
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(x > 0 ? -0.04 : 0.04, 0.10, 0.06);
    wheelGroup.add(caliper);

    group.add(wheelGroup);
  });

  // Soft Contact Ambient Shadow Plane below vehicle
  const shadowGeo = new THREE.PlaneGeometry(2.2, 4.5);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.65,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  group.add(shadowMesh);

  // 🌟 Real-time Dynamic Volumetric Headlights & Street Lighting System
  const hlFrontZ = carType === 1 ? 1.91 : carType === 2 ? 2.21 : carType === 3 ? 2.25 : carType === 4 ? 2.10 : 2.18;
  const hlY = carType === 2 || carType === 3 ? 0.72 : carType === 4 ? 0.65 : 0.56;
  const hlWidth = carType === 0 ? 0.66 : carType === 1 ? 0.64 : carType === 2 ? 0.72 : 0.70;
  const headlightRig = createVehicleHeadlightRigs(hlFrontZ, hlY, hlWidth, false);
  group.add(headlightRig.group);
  group.userData.headlightRig = headlightRig;

  return group;
}

// BRAZILIAN CARGO TRUCK (CAMINHÃO COM BANDEIRA DO BRASIL)
export function createBrazilianTruck(typeIndex = 0): THREE.Group {
  const mats = getCarMaterials();
  const group = new THREE.Group();

  const cabColors = [
    0x2563eb, // Royal Blue
    0xfacc15, // Golden Yellow
    0xdc2626, // Red
    0xf8fafc, // Pure White
  ];
  const cabColor = cabColors[typeIndex % cabColors.length];
  const cabPaintMat = new THREE.MeshStandardMaterial({
    color: cabColor,
    metalness: 0.7,
    roughness: 0.25,
  });

  // 1. FRONT CAB (Cabine Frontal)
  const cabBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 2.2), cabPaintMat);
  cabBase.position.set(0, 1.45, 1.8);
  cabBase.castShadow = false;
  group.add(cabBase);

  // Cab Windshield (Parabrisa gigante)
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.9), mats.glass);
  windshield.position.set(0, 2.0, 2.91);
  group.add(windshield);

  // Grille & Mercedes/Scania styling
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.1), mats.grille);
  grille.position.set(0, 0.95, 2.92);
  group.add(grille);

  // Chrome Bumper
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.35, 0.2), mats.chrome);
  bumper.position.set(0, 0.45, 2.95);
  bumper.castShadow = false;
  group.add(bumper);

  // Headlights
  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.1), mats.headlight);
  hlL.position.set(-0.85, 0.55, 2.95);
  const hlR = hlL.clone();
  hlR.position.set(0.85, 0.55, 2.95);
  group.add(hlL, hlR);

  // Rooftop Air Deflector / Horns (Buzinas a ar)
  const hornGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.6, 8);
  hornGeo.rotateX(Math.PI / 2);
  const hornL = new THREE.Mesh(hornGeo, mats.chrome);
  hornL.position.set(-0.55, 2.75, 2.0);
  const hornR = hornL.clone();
  hornR.position.set(0.55, 2.75, 2.0);
  group.add(hornL, hornR);

  // 2. REAR CARGO CONTAINER / BAÚ WITH BRAZILIAN FLAG ARTWORK
  const cargoTex = getBrazilCargoTexture();
  const cargoMatSide = new THREE.MeshStandardMaterial({
    map: cargoTex,
    roughness: 0.5,
  });
  const cargoMatPlain = new THREE.MeshStandardMaterial({
    color: 0x009c3b,
    roughness: 0.4,
  });

  // Materials array for box: [right, left, top, bottom, front, back]
  const cargoMaterials = [
    cargoMatSide, // right (+x)
    cargoMatSide, // left (-x)
    cargoMatPlain, // top
    cargoMatPlain, // bottom
    cargoMatPlain, // front
    cargoMatSide, // back (-z)
  ];

  const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.7, 4.4), cargoMaterials);
  cargoBox.position.set(0, 1.75, -1.3);
  cargoBox.castShadow = false;
  group.add(cargoBox);

  // Undercarriage Chassis / Fuel Tank
  const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.8, 12), mats.chrome);
  fuelTank.rotateZ(Math.PI / 2);
  fuelTank.position.set(0, 0.45, -0.6);
  group.add(fuelTank);

  // Taillights
  const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.08), mats.taillight);
  tlL.position.set(-0.95, 0.7, -3.52);
  const tlR = tlL.clone();
  tlR.position.set(0.95, 0.7, -3.52);
  group.add(tlL, tlR);

  // 6 HEAVY-DUTY TRUCK WHEELS
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.29, 14);
  rimGeo.rotateZ(Math.PI / 2);

  const truckWheelPositions = [
    [-1.08, 0.42, 1.8], // Front Left
    [1.08, 0.42, 1.8],  // Front Right
    [-1.12, 0.42, -1.8], // Mid Left Dual
    [1.12, 0.42, -1.8],  // Mid Right Dual
    [-1.12, 0.42, -2.8], // Rear Left Dual
    [1.12, 0.42, -2.8],  // Rear Right Dual
  ];

  truckWheelPositions.forEach(([x, y, z]) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(x, y, z);
    wheelGroup.name = 'wheel';

    const tire = new THREE.Mesh(wheelGeo, mats.tire);
    tire.castShadow = false;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(rimGeo, mats.chrome);
    wheelGroup.add(rim);

    group.add(wheelGroup);
  });

  // Contact Shadow Plane
  const shadowGeo = new THREE.PlaneGeometry(2.6, 6.8);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.65,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  shadowMesh.position.z = -0.4;
  group.add(shadowMesh);

  // 🌟 Real-time Dynamic Volumetric Headlights & Street Lighting System for Heavy Truck
  const headlightRig = createVehicleHeadlightRigs(2.95, 0.55, 0.85, true);
  group.add(headlightRig.group);
  group.userData.headlightRig = headlightRig;

  return group;
}
