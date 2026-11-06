import * as THREE from 'three';

export type PotholeSize = 'small' | 'medium' | 'large';
export type PuddleSize = 'small' | 'medium' | 'large';

const createOrganicShape = (radius: number, segments: number, variance: number): THREE.Shape => {
  const shape = new THREE.Shape();
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const r = radius + (Math.random() * variance - variance / 2);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else {
      const prevAngle = ((i - 1) / segments) * Math.PI * 2;
      const cpX = Math.cos(prevAngle + 0.1) * r * 1.1;
      const cpY = Math.sin(prevAngle + 0.1) * r * 1.1;
      shape.quadraticCurveTo(cpX, cpY, x, y);
    }
  }
  shape.lineTo(Math.cos(0) * radius, Math.sin(0) * radius);
  return shape;
};

// 3D PROCEDURAL HAZARD WARNING INDICATOR (DIAMOND / EXCLAMATION)
export function createHazardWarningIndicator(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'hazardWarningIndicator';

  // 3D Glowing Yellow/Amber Hazard Diamond
  const diamondGeo = new THREE.OctahedronGeometry(0.24, 0);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xffaa00,
    emissiveIntensity: 1.4,
    roughness: 0.15,
    metalness: 0.3,
  });
  const diamond = new THREE.Mesh(diamondGeo, diamondMat);
  group.add(diamond);

  // Outer Pulsing Glow Halo
  const haloGeo = new THREE.RingGeometry(0.24, 0.42, 16);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -0.18;
  group.add(halo);

  return group;
}

// ❗ 3D PROCEDURAL GLOWING RED EXCLAMATION MARK INDICATOR (SUPER VISÍVEL DE LONGE)
export function createRedExclamationIndicator(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'redExclamationIndicator';

  // 1. Barra vertical do '!' (tronco cônico vermelho brilhante)
  const stemGeo = new THREE.CylinderGeometry(0.13, 0.05, 0.72, 14);
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xff1e1e,
    emissive: 0xff0000,
    emissiveIntensity: 2.2,
    roughness: 0.15,
    metalness: 0.2,
  });
  const stem = new THREE.Mesh(stemGeo, redMat);
  stem.position.y = 0.45;
  group.add(stem);

  // 2. Núcleo branco incandescente interno para contraste nítido à distância
  const coreGeo = new THREE.CylinderGeometry(0.065, 0.025, 0.64, 8);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 0.45;
  group.add(core);

  // 3. Ponto inferior do '!' (esfera vermelha incandescente)
  const dotGeo = new THREE.SphereGeometry(0.105, 12, 12);
  const dot = new THREE.Mesh(dotGeo, redMat);
  dot.position.y = -0.05;
  group.add(dot);

  const dotCore = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), coreMat);
  dotCore.position.y = -0.05;
  group.add(dotCore);

  // 4. Halo circular pulsante vermelho de alerta no chão
  const haloGeo = new THREE.RingGeometry(0.28, 0.52, 16);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -0.22;
  group.add(halo);

  return group;
}

// ✨ GORGEOUS BRAZILIAN GOLD COIN (WITHOUT BLACK BORDER, BEAUTIFUL GOLD BEVEL & NIGHT GLOW)
// 💵 CÉDULAS REAIS COLETÁVEIS (10 REAIS, 50 REAIS E 100 REAIS) COM TEXTURAS DAS IMAGENS DA PASTA
let cachedNoteTextures: Record<number, THREE.Texture> = {};

function getBanknoteTexture(value: 10 | 50 | 100): THREE.Texture {
  if (cachedNoteTextures[value]) return cachedNoteTextures[value];

  const texLoader = new THREE.TextureLoader();
  let imagePath = '/dinheiro/10_reais_cutout.png';
  if (value === 50) imagePath = '/dinheiro/50_roxo_cutout.png';
  else if (value === 100) imagePath = '/dinheiro/100_reais_cutout.png';

  const tex = texLoader.load(
    imagePath,
    () => {},
    undefined,
    () => {
      // Fallback procedural de alta qualidade
      console.warn(`[obstacles] Falha ao carregar textura da nota ${value}, gerando canvas fallback.`);
    }
  );
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  cachedNoteTextures[value] = tex;
  return tex;
}

// 💵 Cria nota coletável estilo Billboard (sempre frontal para a câmera com flutuação suave e halo sutil)
export function createBanknoteBundle(value: 10 | 50 | 100 = 10): THREE.Group {
  const group = new THREE.Group();
  const banknoteTex = getBanknoteTexture(value);

  const is100 = value === 100;
  const is50 = value === 50;

  // Cédula com proporção brasileira otimizada e nítida
  const noteW = 1.45;
  const noteH = 0.72;

  // Material de alta definição sem halo/cúpula em volta, totalmente nítido e vibrante
  const noteMat = new THREE.MeshBasicMaterial({
    map: banknoteTex,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });

  const noteGeo = new THREE.PlaneGeometry(noteW, noteH);
  const noteMesh = new THREE.Mesh(noteGeo, noteMat);
  noteMesh.name = 'billboardFace';
  group.add(noteMesh);

  // Posição Y inicial de flutuação
  group.position.y = 0.85;
  group.userData = {
    collisionRadius: 0.95,
    obstacleType: 'coin',
    banknoteValue: value,
    isBillboardCollectible: true,
    initialY: 0.85,
    floatPhase: Math.random() * Math.PI * 2,
  };
  return group;
}

// Mantém compatibilidade com o nome antigo exportando o maço de 100 reais
export function createGoldCoin(): THREE.Group {
  return createBanknoteBundle(100);
}

export function createPothole(size: PotholeSize): THREE.Group {
  const group = new THREE.Group();
  let diameter = 0.9, depth = 0.15, colRadius = 0.60;
  if (size === 'medium') { diameter = 1.35; depth = 0.22; colRadius = 0.75; }
  else if (size === 'large') { diameter = 1.85; depth = 0.30; colRadius = 0.95; }

  const radius = diameter / 2;
  const shape = createOrganicShape(radius, 8, radius * 0.3);
  
  const extrudeSettings = { depth: depth, bevelEnabled: false };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const material = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95 });
  const hole = new THREE.Mesh(geometry, material);
  
  hole.rotation.x = Math.PI / 2;
  hole.position.y = 0.006;
  group.add(hole);

  // 1. Glowing Hazard Rim Ring rente ao asfalto
  const ringGeo = new THREE.RingGeometry(radius * 0.95, radius * 1.2, 16);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.008;
  group.add(ring);

  // 2. Floating 3D Glowing Hazard Warning Indicator
  const warningIndicator = createHazardWarningIndicator();
  warningIndicator.position.y = 1.25;
  group.add(warningIndicator);

  group.userData = { collisionRadius: colRadius, obstacleType: 'pothole', indicatorGroup: warningIndicator };
  return group;
}

export function createPuddle(size: PuddleSize): THREE.Group {
  const group = new THREE.Group();
  let diameter = 0.85, colRadius = 0.60;
  if (size === 'medium') { diameter = 1.35; colRadius = 0.75; }
  else if (size === 'large') { diameter = 1.95; colRadius = 0.95; }

  const radius = diameter / 2;

  // 1. Wet darker asphalt border / rim under and around the puddle rente ao solo
  const wetBorderShape = createOrganicShape(radius * 1.15, 12, radius * 0.2);
  const wetBorderGeo = new THREE.ShapeGeometry(wetBorderShape);
  const wetBorderMat = new THREE.MeshStandardMaterial({
    color: 0x09090b, // Asfalto escurecido e molhado
    roughness: 0.35,
    metalness: 0.4,
  });
  const wetBorder = new THREE.Mesh(wetBorderGeo, wetBorderMat);
  wetBorder.rotation.x = -Math.PI / 2;
  wetBorder.position.y = 0.006;
  group.add(wetBorder);

  // 2. Liquid water puddle surface (vibrant Brazilian blue sky water reflection)
  const waterShape = createOrganicShape(radius, 12, radius * 0.15);
  const waterGeo = new THREE.ShapeGeometry(waterShape);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Azul água vibrante
    metalness: 0.95,
    roughness: 0.04,
    transparent: true,
    opacity: 0.82,
    emissive: 0x0369a1,
    emissiveIntensity: 0.25,
  });
  const puddle = new THREE.Mesh(waterGeo, waterMat);
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.y = 0.010;
  group.add(puddle);

  // 3. Subtle inner water ripple
  const rippleGeo = new THREE.RingGeometry(radius * 0.35, radius * 0.45, 16);
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const ripple = new THREE.Mesh(rippleGeo, rippleMat);
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = 0.012;
  group.add(ripple);

  group.userData = { collisionRadius: colRadius, obstacleType: 'puddle' };
  return group;
}

export function createAsphaltPatch(): THREE.Group {
  const group = new THREE.Group();
  const w = 1.2 + Math.random();
  const h = 1.2 + Math.random() * 1.5;
  const geometry = new THREE.PlaneGeometry(w, h);
  const material = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.95 });
  const patch = new THREE.Mesh(geometry, material);
  patch.rotation.x = -Math.PI / 2;
  patch.position.y = 0.005;
  group.add(patch);
  
  group.userData = { collisionRadius: 0, obstacleType: 'patch' };
  return group;
}

export function createPizzaBox(): THREE.Group {
  const group = new THREE.Group();
  const boxGeo = new THREE.BoxGeometry(0.55, 0.08, 0.55);
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const matRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
  
  const bottom = new THREE.Mesh(boxGeo, matWhite);
  bottom.position.y = 0.04;
  bottom.castShadow = false;
  
  const lidGeo = new THREE.BoxGeometry(0.55, 0.03, 0.55);
  const lid = new THREE.Mesh(lidGeo, matRed);
  lid.position.set(0, 0.09, -0.2);
  lid.rotation.x = -0.22;
  lid.castShadow = false;
  
  group.add(bottom, lid);
  group.userData = { collisionRadius: 0.45, obstacleType: 'pizza' };
  return group;
}

// LARGER, HIGH-VISIBILITY BRAZILIAN TRAFFIC CONE
export function createTrafficCone(): THREE.Group {
  const group = new THREE.Group();

  // Heavy square rubber base on asphalt
  const baseGeo = new THREE.BoxGeometry(0.68, 0.06, 0.68);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.03;
  base.castShadow = false;

  // Cone dimensions: 0.30m base radius, 0.9m tall, assentado sobre a base de 0.06m
  const geometry = new THREE.ConeGeometry(0.30, 0.9, 16);
  const matOrange = new THREE.MeshStandardMaterial({
    color: 0xff5500,
    emissive: 0xff3300,
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const matWhite = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.5,
    roughness: 0.2,
  });

  const cone = new THREE.Mesh(geometry, matOrange);
  cone.position.y = 0.06 + 0.45;
  cone.castShadow = false;

  // Reflective white stripes on cone
  const bandGeo1 = new THREE.CylinderGeometry(0.17, 0.23, 0.18, 16);
  const band1 = new THREE.Mesh(bandGeo1, matWhite);
  band1.position.y = 0.06 + 0.42;

  const bandGeo2 = new THREE.CylinderGeometry(0.09, 0.14, 0.14, 16);
  const band2 = new THREE.Mesh(bandGeo2, matWhite);
  band2.position.y = 0.06 + 0.65;

  group.add(base, cone, band1, band2);
  group.userData = { collisionRadius: 0.45, obstacleType: 'cone' };
  return group;
}

export function createCoxinha(): THREE.Group {
  const group = new THREE.Group();
  
  const coneGeo = new THREE.ConeGeometry(0.24, 0.45, 12);
  const sphereGeo = new THREE.SphereGeometry(0.24, 12, 12);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.4,
    roughness: 0.3,
  });
  
  const top = new THREE.Mesh(coneGeo, mat);
  top.position.y = 0.22;
  const btm = new THREE.Mesh(sphereGeo, mat);
  btm.position.y = 0;
  
  group.add(top, btm);
  group.position.y = 0.55;
  group.userData = { collisionRadius: 0.6, obstacleType: 'coxinha' };
  return group;
}

// COMIC CARTOON WHITE COLLECTIBLE BONE (High-contrast, cel-shaded cartoon dog bone)
export function createBone(): THREE.Group {
  const group = new THREE.Group();

  // 1. Comic High-Contrast Black Cel-Shading Outlines
  const matOutline = new THREE.MeshBasicMaterial({
    color: 0x0f172a,
    side: THREE.BackSide,
  });

  // 2. Comic Glossy White Bone Material
  const matBone = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.45,
    roughness: 0.15,
    metalness: 0.05,
  });

  // 3. Central Bone Shaft (Thick comic bone shaft)
  const shaftGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.62, 16);
  shaftGeo.rotateZ(Math.PI / 2);
  const shaft = new THREE.Mesh(shaftGeo, matBone);
  shaft.castShadow = false;

  // Shaft Cartoon Outline
  const shaftOutlineGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.64, 16);
  shaftOutlineGeo.rotateZ(Math.PI / 2);
  const shaftOutline = new THREE.Mesh(shaftOutlineGeo, matOutline);
  shaft.add(shaftOutline);
  group.add(shaft);

  // 4. Double Comic Knobs at each end (Big rounded cartoon bone head)
  const knobGeo = new THREE.SphereGeometry(0.15, 14, 14);
  const knobOutlineGeo = new THREE.SphereGeometry(0.175, 14, 14);

  const knobPositions = [
    { x: -0.32, y: 0.10, z: 0 },
    { x: -0.32, y: -0.10, z: 0 },
    { x: 0.32, y: 0.10, z: 0 },
    { x: 0.32, y: -0.10, z: 0 },
  ];

  knobPositions.forEach(pos => {
    const knob = new THREE.Mesh(knobGeo, matBone);
    knob.position.set(pos.x, pos.y, pos.z);
    knob.castShadow = false;

    const knobOutline = new THREE.Mesh(knobOutlineGeo, matOutline);
    knob.add(knobOutline);
    group.add(knob);
  });

  // 5. Comic Sparkle / Star Highlights (Brilhos de desenho animado)
  const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const starGeo = new THREE.OctahedronGeometry(0.09, 0);
  const star1 = new THREE.Mesh(starGeo, sparkleMat);
  star1.position.set(0.16, 0.16, 0.09);
  const star2 = new THREE.Mesh(starGeo, sparkleMat);
  star2.position.set(-0.16, -0.12, 0.09);
  group.add(star1, star2);

  // Tilt slightly for cute comic attitude
  group.rotation.z = 0.22;
  group.position.y = 0.85;
  group.userData = { collisionRadius: 0.85, obstacleType: 'bone' };
  return group;
}

// 🕳️🌊 NOVO OBSTÁCULO CÔMICO: TAMPA DE BUEIRO COM JATO DE ÁGUA PRESSURIZADO
// Cache de materiais e geometrias compartilhados para ZERO GC, ZERO alocações e ZERO recompilação de shaders
let manholeIronMat: THREE.MeshStandardMaterial | null = null;
let manholeDarkRimMat: THREE.MeshStandardMaterial | null = null;
let manholeHazardMat: THREE.MeshBasicMaterial | null = null;
let manholeInnerWaterMat: THREE.MeshBasicMaterial | null = null;
let manholeOuterWaterMat: THREE.MeshBasicMaterial | null = null;
let manholeFoamMat: THREE.MeshBasicMaterial | null = null;
let manholeSprayArcMat: THREE.MeshBasicMaterial | null = null;
let manholeTopDropMat: THREE.MeshBasicMaterial | null = null;
let manholeBottomDropMat: THREE.MeshBasicMaterial | null = null;
let manholeSprayMat: THREE.MeshBasicMaterial | null = null;
export let manholeStreamTex: THREE.CanvasTexture | null = null;

let manholeRimGeo: THREE.CylinderGeometry | null = null;
let manholeHazardGeo: THREE.RingGeometry | null = null;
let manholeLidGeo: THREE.CylinderGeometry | null = null;
let manholeRibGeo1: THREE.TorusGeometry | null = null;
let manholeRibGeo2: THREE.TorusGeometry | null = null;
let manholeInnerGeo: THREE.CylinderGeometry | null = null;
let manholeOuterGeo: THREE.CylinderGeometry | null = null;
let manholeFoamGeo: THREE.SphereGeometry | null = null;
let manholeFoamRingGeo: THREE.TorusGeometry | null = null;
let manholeSprayGeo: THREE.ConeGeometry | null = null;
let manholeCrownGeo: THREE.SphereGeometry | null = null;
let manholeSprayRingGeo: THREE.RingGeometry | null = null;
let manholeOuterRippleGeo: THREE.RingGeometry | null = null;
let manholeDropGeos: THREE.SphereGeometry[] = [];

function initManholeSharedAssets() {
  if (manholeIronMat) return;

  manholeIronMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    metalness: 0.85,
    roughness: 0.35,
  });

  manholeDarkRimMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.9,
    roughness: 0.5,
  });

  manholeRimGeo = new THREE.CylinderGeometry(0.86, 0.92, 0.08, 16);
  manholeHazardGeo = new THREE.RingGeometry(0.88, 1.15, 16);

  const hazardCanvas = document.createElement('canvas');
  hazardCanvas.width = 128; hazardCanvas.height = 128;
  const hCtx = hazardCanvas.getContext('2d')!;
  for (let i = 0; i < 8; i++) {
    hCtx.fillStyle = i % 2 === 0 ? '#facc15' : '#18181b';
    hCtx.beginPath();
    hCtx.moveTo(64, 64);
    hCtx.arc(64, 64, 64, (i / 8) * Math.PI * 2, ((i + 1) / 8) * Math.PI * 2);
    hCtx.closePath();
    hCtx.fill();
  }
  const hazardTex = new THREE.CanvasTexture(hazardCanvas);
  manholeHazardMat = new THREE.MeshBasicMaterial({ map: hazardTex, transparent: true, opacity: 0.85 });

  manholeLidGeo = new THREE.CylinderGeometry(0.82, 0.82, 0.06, 16);
  manholeRibGeo1 = new THREE.TorusGeometry(0.55, 0.02, 4, 16);
  manholeRibGeo2 = new THREE.TorusGeometry(0.28, 0.02, 4, 12);

  // Textura procedural de jato de água cristalina pressurizada com estrias de espuma branca
  const streamCanvas = document.createElement('canvas');
  streamCanvas.width = 128;
  streamCanvas.height = 256;
  const sCtx = streamCanvas.getContext('2d')!;
  const bgGrad = sCtx.createLinearGradient(0, 0, 128, 0);
  bgGrad.addColorStop(0.0, 'rgba(14, 165, 233, 0.75)');
  bgGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.92)');
  bgGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.98)');
  bgGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.92)');
  bgGrad.addColorStop(1.0, 'rgba(14, 165, 233, 0.75)');
  sCtx.fillStyle = bgGrad;
  sCtx.fillRect(0, 0, 128, 256);

  // Estrias verticais de espuma branca de alta velocidade
  for (let i = 0; i < 28; i++) {
    const sx = (i * 19) % 120;
    const sy = (i * 37) % 220;
    const sw = 3 + (i % 4) * 2;
    const sh = 28 + (i % 5) * 14;
    sCtx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.88)' : 'rgba(186, 230, 253, 0.65)';
    sCtx.fillRect(sx, sy, sw, sh);
  }

  manholeStreamTex = new THREE.CanvasTexture(streamCanvas);
  manholeStreamTex.wrapS = THREE.RepeatWrapping;
  manholeStreamTex.wrapT = THREE.RepeatWrapping;
  manholeStreamTex.repeat.set(2, 3);

  manholeInnerWaterMat = new THREE.MeshBasicMaterial({
    map: manholeStreamTex,
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.92,
  });
  manholeInnerGeo = new THREE.CylinderGeometry(0.45, 0.88, 18.0, 14, 1, true);

  manholeOuterWaterMat = new THREE.MeshBasicMaterial({
    map: manholeStreamTex,
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.58,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  manholeOuterGeo = new THREE.CylinderGeometry(0.95, 1.55, 17.6, 14, 1, true);

  manholeFoamMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
  });
  manholeFoamGeo = new THREE.SphereGeometry(1.48, 10, 10);
  manholeFoamRingGeo = new THREE.TorusGeometry(0.95, 0.16, 6, 14);

  manholeSprayArcMat = new THREE.MeshBasicMaterial({
    color: 0xf0f9ff,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  manholeSprayGeo = new THREE.ConeGeometry(0.36, 3.1, 6);
  manholeCrownGeo = new THREE.SphereGeometry(2.05, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52);

  manholeTopDropMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.92,
  });

  manholeSprayRingGeo = new THREE.RingGeometry(0.55, 2.25, 16);
  manholeOuterRippleGeo = new THREE.RingGeometry(1.8, 3.1, 16);
  manholeSprayMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });

  manholeBottomDropMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
  });

  // Reusable drop geometries
  manholeDropGeos = [
    new THREE.SphereGeometry(0.13, 6, 6),
    new THREE.SphereGeometry(0.20, 6, 6),
    new THREE.SphereGeometry(0.27, 6, 6),
  ];
}

let manholePreWarnTex: THREE.CanvasTexture | null = null;
let manholePreWarnMat: THREE.SpriteMaterial | null = null;
let manholePreRingGeo: THREE.RingGeometry | null = null;
let manholePreRingMat: THREE.MeshBasicMaterial | null = null;
let manholePreArrowGeo: THREE.ConeGeometry | null = null;
let manholePreArrowMat: THREE.MeshBasicMaterial | null = null;

function initManholePreWarnAssets() {
  if (manholePreWarnTex) return;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  // Outer glow
  const glow = ctx.createRadialGradient(128, 115, 10, 128, 115, 110);
  glow.addColorStop(0.0, 'rgba(56, 189, 248, 0.85)');
  glow.addColorStop(0.55, 'rgba(250, 204, 21, 0.45)');
  glow.addColorStop(1.0, 'rgba(239, 68, 68, 0.0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(128, 115, 110, 0, Math.PI * 2);
  ctx.fill();

  // 3D Cartoon Warning Badge Shield (Yellow/Orange with dark border)
  ctx.fillStyle = '#dc2626';
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(128, 18);
  ctx.lineTo(226, 174);
  ctx.lineTo(30, 174);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();

  // Inner yellow triangle
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(128, 36);
  ctx.lineTo(206, 162);
  ctx.lineTo(50, 162);
  ctx.closePath();
  ctx.fill();

  // Water Geyser / Drop Icon + Exclamation inside triangle
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(128, 126, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(128, 74);
  ctx.lineTo(150, 120);
  ctx.lineTo(106, 120);
  ctx.closePath();
  ctx.fill();

  // Exclamation mark
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(122, 92, 12, 30);
  ctx.beginPath();
  ctx.arc(128, 136, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // Downward pointer arrow at the bottom of the badge
  ctx.fillStyle = '#38bdf8';
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(98, 186);
  ctx.lineTo(158, 186);
  ctx.lineTo(128, 238);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();

  manholePreWarnTex = new THREE.CanvasTexture(canvas);
  manholePreWarnTex.needsUpdate = true;

  manholePreWarnMat = new THREE.SpriteMaterial({
    map: manholePreWarnTex,
    transparent: true,
    depthWrite: false,
  });

  manholePreRingGeo = new THREE.RingGeometry(1.05, 1.52, 24);
  manholePreRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });

  manholePreArrowGeo = new THREE.ConeGeometry(0.36, 0.72, 8);
  manholePreArrowMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
  });
}

export function createManhole(): THREE.Group {
  initManholeSharedAssets();
  initManholePreWarnAssets();

  const group = new THREE.Group();
  group.name = 'manholeObstacle';

  // 1. Base Rim on Asphalt
  const rimMesh = new THREE.Mesh(manholeRimGeo!, manholeDarkRimMat!);
  rimMesh.position.y = 0.04;
  group.add(rimMesh);

  // 2. Caution Hazard Painted Border (Yellow/Black street hazard mark)
  const hazardMesh = new THREE.Mesh(manholeHazardGeo!, manholeHazardMat!);
  hazardMesh.rotation.x = -Math.PI / 2;
  hazardMesh.position.y = 0.042;
  group.add(hazardMesh);

  // 2B. Anel de Pressão Subterrânea Pulsante (Ativo ANTES de espirrar)
  const preEruptRingMesh = new THREE.Mesh(manholePreRingGeo!, manholePreRingMat!);
  preEruptRingMesh.rotation.x = -Math.PI / 2;
  preEruptRingMesh.position.y = 0.048;
  group.add(preEruptRingMesh);

  // 2C. Indicador 3D Pulando em Cima do Bueiro ANTES do Jato Espirrar!
  const preEruptIndicatorGroup = new THREE.Group();
  preEruptIndicatorGroup.position.set(0, 1.55, 0);

  const warnSprite = new THREE.Sprite(manholePreWarnMat!);
  warnSprite.scale.set(1.85, 1.85, 1);
  warnSprite.position.y = 0.45;
  preEruptIndicatorGroup.add(warnSprite);

  const pointerCone = new THREE.Mesh(manholePreArrowGeo!, manholePreArrowMat!);
  pointerCone.rotation.x = Math.PI; // Aponta para baixo, direto para a tampa do bueiro
  pointerCone.position.y = -0.35;
  preEruptIndicatorGroup.add(pointerCone);

  group.add(preEruptIndicatorGroup);

  // 3. Cast Iron Sewer Lid (Tampa de Bueiro que treme com pressão e depois voa)
  const lidGroup = new THREE.Group();
  lidGroup.position.y = 0.08;

  const lidMesh = new THREE.Mesh(manholeLidGeo!, manholeIronMat!);
  lidGroup.add(lidMesh);

  const ribMesh = new THREE.Mesh(manholeRibGeo1!, manholeDarkRimMat!);
  ribMesh.rotation.x = Math.PI / 2;
  ribMesh.position.y = 0.035;
  lidGroup.add(ribMesh);

  const ribMesh2 = new THREE.Mesh(manholeRibGeo2!, manholeDarkRimMat!);
  ribMesh2.rotation.x = Math.PI / 2;
  ribMesh2.position.y = 0.035;
  lidGroup.add(ribMesh2);

  group.add(lidGroup);

  // 4. Pressurized Water Geyser Column (Jato de Água Ultra-Dinâmico e Realista)
  const waterGroup = new THREE.Group();
  waterGroup.position.y = 0.08;

  // Inner Core Water Stream
  const innerMesh = new THREE.Mesh(manholeInnerGeo!, manholeInnerWaterMat!);
  innerMesh.position.y = 9.0;
  waterGroup.add(innerMesh);

  // Outer Shimmering Water Sheath
  const outerMesh = new THREE.Mesh(manholeOuterGeo!, manholeOuterWaterMat!);
  outerMesh.position.y = 8.75;
  waterGroup.add(outerMesh);

  // Anéis de pressão de espuma subindo pelo jato
  const foamRings: THREE.Mesh[] = [];
  for (let r = 0; r < 4; r++) {
    const ringMesh = new THREE.Mesh(manholeFoamRingGeo!, manholeFoamMat!);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 1.5 + r * 4.0;
    const sc = 0.75 + r * 0.14;
    ringMesh.scale.set(sc, sc, 1.0);
    ringMesh.userData = { speed: 1.5 + r * 0.25, phase: r * 0.25 };
    waterGroup.add(ringMesh);
    foamRings.push(ringMesh);
  }

  // White Foamy Crest at top of geyser
  const foamMesh = new THREE.Mesh(manholeFoamGeo!, manholeFoamMat!);
  foamMesh.position.y = 17.8;
  waterGroup.add(foamMesh);

  // 🌊 LEQUE / COROA DE ESGUICHOS EM ARCO NO TOPO
  const crestSprayGroup = new THREE.Group();
  crestSprayGroup.position.y = 17.8;

  for (let s = 0; s < 10; s++) {
    const sprayCone = new THREE.Mesh(manholeSprayGeo!, manholeSprayArcMat!);
    const ang = (s / 10) * Math.PI * 2;
    sprayCone.position.set(Math.cos(ang) * 1.05, 0.45, Math.sin(ang) * 1.05);
    sprayCone.rotation.z = Math.cos(ang) * 1.02;
    sprayCone.rotation.x = -Math.sin(ang) * 1.02;
    crestSprayGroup.add(sprayCone);
  }

  const crownMesh = new THREE.Mesh(manholeCrownGeo!, manholeSprayArcMat!);
  crownMesh.position.y = 0.25;
  crestSprayGroup.add(crownMesh);
  waterGroup.add(crestSprayGroup);

  // 💧 GOTAS DINÂMICAS ESPIRRANDO DO TOPO (Usa geometrias compartilhadas)
  const topDrops: Array<{
    mesh: THREE.Mesh;
    vx: number;
    vy: number;
    vz: number;
    baseRad: number;
    baseY: number;
    phase: number;
    angle: number;
  }> = [];

  for (let i = 0; i < 16; i++) {
    const dGeo = manholeDropGeos[i % manholeDropGeos.length];
    const dMesh = new THREE.Mesh(dGeo, manholeTopDropMat!);
    const ang = (i / 16) * Math.PI * 2;
    const rad = 0.55 + (i % 4) * 0.42;
    const spd = 2.6 + (i % 3) * 1.2;
    const by = 17.4 + (i % 3) * 0.4;

    dMesh.position.set(Math.cos(ang) * rad, by, Math.sin(ang) * rad);
    waterGroup.add(dMesh);

    topDrops.push({
      mesh: dMesh,
      vx: Math.cos(ang) * spd,
      vy: 2.8 + (i % 4) * 1.1,
      vz: Math.sin(ang) * spd,
      baseRad: rad,
      baseY: by,
      phase: (i / 16),
      angle: ang,
    });
  }

  // Droplets along the column (Usa geometrias compartilhadas)
  for (let i = 0; i < 12; i++) {
    const dGeo = manholeDropGeos[i % manholeDropGeos.length];
    const dropMesh = new THREE.Mesh(dGeo, manholeFoamMat!);
    const ang = (i / 12) * Math.PI * 2;
    const rad = 0.92 + (i % 3) * 0.18;
    dropMesh.position.set(Math.cos(ang) * rad, 1.8 + (i / 12) * 15.0, Math.sin(ang) * rad);
    waterGroup.add(dropMesh);
  }

  // Bottom Spray splash ring + Outer dynamic ripple
  const sprayMesh = new THREE.Mesh(manholeSprayRingGeo!, manholeSprayMat!);
  sprayMesh.rotation.x = -Math.PI / 2;
  sprayMesh.position.y = 0.06;
  waterGroup.add(sprayMesh);

  const outerRippleMesh = new THREE.Mesh(manholeOuterRippleGeo!, manholeOuterWaterMat!);
  outerRippleMesh.rotation.x = -Math.PI / 2;
  outerRippleMesh.position.y = 0.05;
  waterGroup.add(outerRippleMesh);

  // 💧 Gotas menores e espuma na base do chão (Usa geometrias compartilhadas)
  const bottomDrops: Array<{
    mesh: THREE.Mesh;
    baseX: number;
    baseZ: number;
    vy: number;
    vx: number;
    vz: number;
    maxH: number;
    phase: number;
  }> = [];

  for (let b = 0; b < 14; b++) {
    const bGeo = manholeDropGeos[b % manholeDropGeos.length];
    const bMesh = new THREE.Mesh(bGeo, manholeBottomDropMat!);

    const bAng = (b / 14) * Math.PI * 2;
    const bDist = 0.8 + (b % 3) * 0.45;
    const bx = Math.cos(bAng) * bDist;
    const bz = Math.sin(bAng) * bDist;
    const maxH = 0.45 + (b % 4) * 0.28;

    bMesh.position.set(bx, 0.08, bz);
    waterGroup.add(bMesh);

    bottomDrops.push({
      mesh: bMesh,
      baseX: bx,
      baseZ: bz,
      vy: 3.4 + (b % 3) * 1.1,
      vx: Math.cos(bAng) * 0.9,
      vz: Math.sin(bAng) * 0.9,
      maxH,
      phase: (b / 14) * Math.PI * 2,
    });
  }

  waterGroup.scale.set(0.01, 0.01, 0.01);
  waterGroup.visible = false;
  group.add(waterGroup);

  // UserData & Physics Controller
  group.userData = {
    collisionRadius: 1.15,
    obstacleType: 'manhole',
    isManhole: true,
    triggered: false,
    lidGroup,
    waterGroup,
    preEruptIndicatorGroup,
    preEruptRingMesh,
    innerMesh,
    outerMesh,
    foamRings,
    crestSprayGroup,
    topDrops,
    bottomDrops,
    sprayMesh,
    outerRippleMesh,
    lidVy: 0,
    lidY: 0.08,
    lidRotX: 0,
    lidRotZ: 0,
    waterProgress: 0,
  };

  return group;
}

export function warmUpManholeSharedAssets(
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  scene: THREE.Scene,
  composer?: any
) {
  try {
    initManholeSharedAssets();
    const warmGroup = new THREE.Group();
    warmGroup.name = 'warmUpAssetsGroup';
    warmGroup.frustumCulled = false;
    warmGroup.position.set(0, 0.8, 4.5); // Diretamente no cone de visão frontal da câmera

    // 1. Manhole completo com jato d'água 100% ativo e visível
    const sampleManhole = createManhole();
    sampleManhole.frustumCulled = false;
    sampleManhole.traverse((node) => {
      node.visible = true;
      node.frustumCulled = false;
    });
    if (sampleManhole.userData?.waterGroup) {
      sampleManhole.userData.waterGroup.visible = true;
      sampleManhole.userData.waterGroup.scale.set(1, 1, 1);
    }
    if (sampleManhole.userData?.lidGroup) {
      sampleManhole.userData.lidGroup.position.set(0, 1.2, 0);
    }
    sampleManhole.position.set(0, 0, 0);
    warmGroup.add(sampleManhole);

    // 2. Outros obstáculos para garantir zero engasgos em poças e buracos
    const puddle = createPuddle('medium');
    puddle.frustumCulled = false;
    puddle.position.set(-1.2, 0, 0);
    warmGroup.add(puddle);

    const cone = createTrafficCone();
    cone.frustumCulled = false;
    cone.position.set(1.2, 0, 0);
    warmGroup.add(cone);

    const pothole = createPothole('medium');
    pothole.frustumCulled = false;
    pothole.position.set(0, 0, 1.0);
    warmGroup.add(pothole);

    scene.add(warmGroup);

    // Compila e renderiza para a GPU
    renderer.compile(scene, camera);
    renderer.render(scene, camera);

    if (composer && typeof composer.render === 'function') {
      try { composer.render(); } catch (_) {}
    }

    // Força o driver da GPU a finalizar todas as compilações e uploads
    const gl = renderer.getContext();
    if (gl && typeof gl.finish === 'function') {
      gl.finish();
    }

    scene.remove(warmGroup);
  } catch (e) {
    console.warn('[WarmUp] Falha ao pré-aquecer obstáculos:', e);
  }
}

