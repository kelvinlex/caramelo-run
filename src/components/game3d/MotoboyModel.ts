import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { getActiveAd, recordAdImpression } from '../game/MarketingPortalModal';

export interface MotoboySkinConfig {
  id: string;
  name: string;
  subtitle: string;
  fbxPath: string;
  texturePath: string;
  thumbnail: string;
  rarity: 'Comum' | 'Rara' | 'Especial' | 'Lendária';
  color: string;
  price: number;
}

export const MOTO_SKINS: MotoboySkinConfig[] = [
  {
    id: 'moto_default',
    name: 'Honda CG 160 Titan',
    subtitle: 'A Lendária Clássica Vermelha',
    fbxPath: '/models/motorcycle.fbx',
    texturePath: '/models/textures/motorcycle_basecolor.jpg',
    thumbnail: '/models/skins/titan_red_rider.jpg',
    rarity: 'Comum',
    color: '#ef4444',
    price: 0,
  },
  {
    id: 'moto_skin1',
    name: 'CG 160 Cargo Laranja',
    subtitle: 'Baú Ciano & Carenagem Laranja',
    fbxPath: '/models/skins/skin1/model.fbx',
    texturePath: '/models/skins/skin1/color.jpg',
    thumbnail: '/models/skins/low_poly_motorcycle_render.jpg',
    rarity: 'Rara',
    color: '#ea580c',
    price: 1500,
  },
  {
    id: 'moto_skin2',
    name: 'Fazer 250 Street Black',
    subtitle: 'Estilo Noturno & Baú Branco',
    fbxPath: '/models/skins/skin2/model.fbx',
    texturePath: '/models/skins/skin2/color.jpg',
    thumbnail: '/models/skins/low_poly_motorcycle_rider.jpg',
    rarity: 'Especial',
    color: '#18181b',
    price: 3500,
  },
  {
    id: 'moto_skin3',
    name: 'XRE 300 Rally Amarela',
    subtitle: 'Baú Roxo & Carenagem Amarela',
    fbxPath: '/models/skins/skin3/model.fbx',
    texturePath: '/models/skins/skin3/color.jpg',
    thumbnail: '/models/skins/low_poly_motorcycle.jpg',
    rarity: 'Lendária',
    color: '#eab308',
    price: 7000,
  },
  {
    id: 'moto_skin4',
    name: 'Hornet 600 Sport Azul',
    subtitle: 'Carenagem Azul & Baú Preto',
    fbxPath: '/models/skins/skin4/model.fbx',
    texturePath: '/models/skins/skin4/color.jpg',
    thumbnail: '/models/skins/low_poly_mohawk_rider.jpg',
    rarity: 'Lendária',
    color: '#0284c7',
    price: 10000,
  },
];

export interface MotoboyInstance {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  exhaust: THREE.Mesh;
  bag: THREE.Mesh;
  flag: THREE.Mesh;
  suspensionGroup: THREE.Group;
  riderTorso: THREE.Mesh;
  riderLegL: THREE.Mesh;
  riderLegR: THREE.Mesh;
  jumpVelocity: number;
  suspensionY: number;
  suspensionPitch: number;
  damageTimer: number;
  fbxLoaded: boolean;
  currentSkinId: string;
  setSkin: (skinId: string) => void;
  updateAnimation: (runTime: number, bikeSpeed: number, dt: number, lateralWeave: number, nightFactor?: number) => void;
  setHeadlightNightFactor?: (nightFactor: number) => void;
  triggerBumpJump: () => void;
  triggerBiteDamage: () => void;
  triggerDamageFlash?: (duration?: number) => void;
  triggerCashFlash?: (noteValue?: 10 | 50 | 100) => void;
}

// Global cached FBX templates for zero-lag instant skin switching
const cachedFbxTemplates = new Map<string, THREE.Group>();
const pendingCallbacks = new Map<string, ((model: THREE.Group) => void)[]>();
const loadingSkins = new Set<string>();

// Preload/Load FBX skin model
export function loadFbxSkin(skinId: string, onLoaded?: (model: THREE.Group) => void) {
  const skin = MOTO_SKINS.find((s) => s.id === skinId) || MOTO_SKINS[0];
  const cached = cachedFbxTemplates.get(skin.id);
  if (cached) {
    if (onLoaded) onLoaded(cached.clone(true));
    return;
  }

  if (onLoaded) {
    const list = pendingCallbacks.get(skin.id) || [];
    list.push(onLoaded);
    pendingCallbacks.set(skin.id, list);
  }

  if (loadingSkins.has(skin.id)) return;
  loadingSkins.add(skin.id);

  const textureLoader = new THREE.TextureLoader();
  const bikeTexture = textureLoader.load(skin.texturePath, () => {
    bikeTexture.colorSpace = THREE.SRGBColorSpace;
  });

  const loader = new FBXLoader();
  loader.load(
    skin.fbxPath,
    (fbxModel) => {
      // Analyze bounding box
      const bbox = new THREE.Box3().setFromObject(fbxModel);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      // Scale to ~1.95 meters (standard motorcycle size)
      const maxDim = Math.max(size.x, size.y, size.z);
      const scaleFactor = 1.95 / (maxDim || 1);
      fbxModel.scale.set(scaleFactor, scaleFactor, scaleFactor);

      // Center bounding box
      const newBbox = new THREE.Box3().setFromObject(fbxModel);
      const center = new THREE.Vector3();
      newBbox.getCenter(center);
      fbxModel.position.x -= center.x;
      fbxModel.position.z -= center.z;

      // Align bottom to ground level (y=0)
      const groundBbox = new THREE.Box3().setFromObject(fbxModel);
      fbxModel.position.y -= groundBbox.min.y;

      // Determine orientation (+Z is forward in game)
      const testSize = new THREE.Vector3();
      new THREE.Box3().setFromObject(fbxModel).getSize(testSize);
      if (testSize.x > testSize.z * 1.15) {
        fbxModel.rotation.y = -Math.PI / 2;
      } else {
        fbxModel.rotation.y = Math.PI;
      }

      // Apply optimized material with texture
      const optimizedMat = new THREE.MeshStandardMaterial({
        map: bikeTexture,
        roughness: 0.4,
        metalness: 0.45,
      });

      fbxModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = optimizedMat;
          mesh.castShadow = true;
          mesh.receiveShadow = false;
        }
      });

      cachedFbxTemplates.set(skin.id, fbxModel);
      loadingSkins.delete(skin.id);

      // Notify all waiting instances
      const callbacks = pendingCallbacks.get(skin.id) || [];
      pendingCallbacks.delete(skin.id);
      callbacks.forEach((cb) => cb(fbxModel.clone(true)));
    },
    undefined,
    (err) => {
      console.warn(`[MotoboyModel] Error loading skin ${skin.id}:`, err);
      loadingSkins.delete(skin.id);
    }
  );
}

export function preloadFbxSkin(skinId: string): Promise<THREE.Group> {
  return new Promise((resolve) => {
    loadFbxSkin(skinId, (model) => {
      resolve(model);
    });
  });
}

let cachedMiniFlagTex: THREE.CanvasTexture | null = null;
function getMiniBrazilFlagTexture(): THREE.Texture {
  if (cachedMiniFlagTex) return cachedMiniFlagTex;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // Fundo Verde Vibrante com degradê sutil de tecido
    const gradGreen = ctx.createLinearGradient(0, 0, 512, 0);
    gradGreen.addColorStop(0, '#008530');
    gradGreen.addColorStop(0.5, '#009c3b');
    gradGreen.addColorStop(1, '#00b344');
    ctx.fillStyle = gradGreen;

    // Recorte estilizado de flâmula aerodinâmica (canto chanfrado e corte esportivo)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(512, 0);
    ctx.lineTo(460, 160); // Entalhe aerodinâmico esportivo na ponta
    ctx.lineTo(512, 320);
    ctx.lineTo(0, 320);
    ctx.closePath();
    ctx.fill();

    // Borda de costura dourada refinada
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Losango Amarelo Ouro
    ctx.fillStyle = '#ffdf00';
    ctx.beginPath();
    ctx.moveTo(256, 32);
    ctx.lineTo(430, 160);
    ctx.lineTo(256, 288);
    ctx.lineTo(82, 160);
    ctx.closePath();
    ctx.fill();

    // Círculo Azul Celeste Profundo
    ctx.fillStyle = '#002776';
    ctx.beginPath();
    ctx.arc(256, 160, 72, 0, Math.PI * 2);
    ctx.fill();

    // Faixa Branca Curva
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(256, 196, 68, Math.PI * 1.14, Math.PI * 1.86);
    ctx.stroke();

    // Estrelas pontilhadas
    ctx.fillStyle = '#ffffff';
    const stars = [
      [230, 140], [250, 130], [270, 145], [256, 175], [240, 200], [268, 205], [280, 190]
    ];
    stars.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    cachedMiniFlagTex = new THREE.CanvasTexture(canvas);
    cachedMiniFlagTex.anisotropy = 16;
    return cachedMiniFlagTex;
  } catch (e) {
    return new THREE.Texture();
  }
}

// Cria textura circular com brilho especular e raios de sol (Lens Flare para os retrovisores)
let cachedMirrorFlareTex: THREE.CanvasTexture | null = null;
function getMirrorFlareTexture(): THREE.Texture {
  if (cachedMirrorFlareTex) return cachedMirrorFlareTex;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(186, 230, 253, 0.85)');
    grad.addColorStop(0.55, 'rgba(56, 189, 248, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    // Raios de estrela estelares sutil
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(64, 10); ctx.lineTo(64, 118);
    ctx.moveTo(10, 64); ctx.lineTo(118, 64);
    ctx.stroke();

    cachedMirrorFlareTex = new THREE.CanvasTexture(canvas);
    return cachedMirrorFlareTex;
  } catch (e) {
    return new THREE.Texture();
  }
}

export function createBrightDeliveryBoxTexture(titleText?: string, imageUrl?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const activeAd = getActiveAd('motoboy_box');
  const adTitle = titleText || (activeAd ? activeAd.title : 'ANUNCIE SUA MARCA AQUI!');
  const adImgUrl = imageUrl || (activeAd ? activeAd.imageUrl : null);
  const companyName = activeAd ? activeAd.companyName : 'CARAMELO EXPRESS';

  if (activeAd) {
    recordAdImpression('motoboy_box');
  }

  // 📦 Fundo Amarelo Sol Creme Ultra Claro e Límpido
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0, '#ffffff');
  bgGrad.addColorStop(0.4, '#fef9c3'); // Creme amarelo claro iluminação 100%
  bgGrad.addColorStop(1, '#fef08a'); // Amarelo sol límpido
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Faixas Refletivas Vermelho Vibrante nas bordas do Baú
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 512, 32);
  ctx.fillRect(0, 480, 512, 32);
  ctx.fillRect(0, 0, 32, 512);
  ctx.fillRect(480, 0, 32, 512);

  // Refletivo Prata Prontidão
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 26, 512, 8);
  ctx.fillRect(0, 478, 512, 8);

  // Quadro de Anúncios Branco Puro Central
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(44, 44, 424, 424);

  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.strokeRect(44, 44, 424, 424);

  // Título e Ícone do Baú de Entregas
  ctx.fillStyle = '#7c2d12';
  ctx.font = '900 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`📦 ${companyName.toUpperCase()}`, 256, 96);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  if (adImgUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 60, 110, 392, 240);

      // Draw Title at bottom
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 24px sans-serif';
      ctx.fillText(adTitle.slice(0, 40), 256, 385);

      // CTA Tag
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(86, 402, 340, 48, 12);
      else ctx.rect(86, 402, 340, 48);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 19px sans-serif';
      ctx.fillText('📢 ANÚNCIO VERIFICADO 3D', 256, 433);

      tex.needsUpdate = true;
    };
    img.src = adImgUrl;
  } else {
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 28px sans-serif';

    const words = adTitle.split(' ');
    let line = '';
    let y = 180;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 370 && n > 0) {
        ctx.fillText(line, 256, y);
        line = words[n] + ' ';
        y += 38;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 256, y);

    // Botão em Destaque do Anunciante
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(86, 380, 340, 58, 16);
    else ctx.rect(86, 380, 340, 58);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px sans-serif';
    ctx.fillText('📢 ANUNCIE NO JOGO 3D', 256, 416);
  }

  return tex;
}

// 💡 Texturas para Farol Dianteiro da Moto (Luz Fotométrica Suave e Facho Natural no Asfalto)
let cachedMotoHeadlightTex: THREE.CanvasTexture | null = null;
function getMotoHeadlightTexture(): THREE.Texture {
  if (cachedMotoHeadlightTex) return cachedMotoHeadlightTex;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.20, 'rgba(254, 250, 235, 0.70)');
    grad.addColorStop(0.50, 'rgba(240, 248, 255, 0.22)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    cachedMotoHeadlightTex = new THREE.CanvasTexture(canvas);
    return cachedMotoHeadlightTex;
  } catch (e) {
    return new THREE.Texture();
  }
}

let cachedMotoBeamGroundTex: THREE.CanvasTexture | null = null;
function getMotoBeamGroundTexture(): THREE.Texture {
  if (cachedMotoBeamGroundTex) return cachedMotoBeamGroundTex;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();

    // 1. Facho cônico elíptico com falloff fotométrico ultra suave (sem bordas duras)
    const grad = ctx.createRadialGradient(128, 40, 8, 128, 220, 245);
    grad.addColorStop(0.0, 'rgba(255, 255, 245, 0.65)');
    grad.addColorStop(0.12, 'rgba(254, 250, 230, 0.45)');
    grad.addColorStop(0.28, 'rgba(250, 245, 220, 0.26)');
    grad.addColorStop(0.48, 'rgba(235, 245, 255, 0.13)');
    grad.addColorStop(0.70, 'rgba(215, 235, 255, 0.04)');
    grad.addColorStop(0.88, 'rgba(200, 225, 255, 0.008)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    // 2. Máscara de fade nas bordas do retângulo para garantir 100% de suavidade periférica
    ctx.globalCompositeOperation = 'destination-in';
    const vertFade = ctx.createLinearGradient(0, 0, 0, 512);
    vertFade.addColorStop(0.0, 'rgba(0,0,0,0)');
    vertFade.addColorStop(0.08, 'rgba(0,0,0,1)');
    vertFade.addColorStop(0.85, 'rgba(0,0,0,0.85)');
    vertFade.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = vertFade;
    ctx.fillRect(0, 0, 256, 512);

    const horizFade = ctx.createLinearGradient(0, 0, 256, 0);
    horizFade.addColorStop(0.0, 'rgba(0,0,0,0)');
    horizFade.addColorStop(0.15, 'rgba(0,0,0,1)');
    horizFade.addColorStop(0.85, 'rgba(0,0,0,1)');
    horizFade.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = horizFade;
    ctx.fillRect(0, 0, 256, 512);
    ctx.globalCompositeOperation = 'source-over';

    cachedMotoBeamGroundTex = new THREE.CanvasTexture(canvas);
    return cachedMotoBeamGroundTex;
  } catch (e) {
    return new THREE.Texture();
  }
}

export function buildMotoboy(initialSkinId: string = 'moto_default'): MotoboyInstance {
  const group = new THREE.Group();
  group.name = 'motoboyGroup';

  const suspensionGroup = new THREE.Group();
  suspensionGroup.name = 'suspensionGroup';
  group.add(suspensionGroup);

  // =========================================================================
  // 🪞 RETROVISORES DA MOTO COM REFLEXO ESPECULAR & LENS FLARE DE SOL
  // =========================================================================
  const mirrorGroup = new THREE.Group();
  mirrorGroup.name = 'motorcycleMirrors';

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.98,
    roughness: 0.06,
  });

  const mirrorGlassMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe, // Reflexo azul celeste metálico límpido
    metalness: 0.98,
    roughness: 0.02,
  });

  const mirrorFlareTex = getMirrorFlareTexture();
  const mirrorFlareMat = new THREE.MeshBasicMaterial({
    map: mirrorFlareTex,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Função auxiliar para criar retrovisor esquerdo e direito
  const createMirrorAssembly = (isRight: boolean) => {
    const asm = new THREE.Group();
    const sign = isRight ? 1 : -1;

    // Haste de sustentação cromada curvada saindo do guidão
    const stalkGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.22, 10);
    const stalk = new THREE.Mesh(stalkGeo, chromeMat);
    stalk.position.set(0, 0.10, 0);
    stalk.rotation.z = sign * -0.38;
    stalk.rotation.x = -0.15;
    asm.add(stalk);

    // Carcaça traseira do retrovisor (preto fosco aerodinâmico)
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.2 });
    const housingGeo = new THREE.CylinderGeometry(0.046, 0.052, 0.022, 16);
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.set(sign * 0.08, 0.20, -0.02);
    housing.rotation.x = Math.PI * 0.5 + 0.12;
    housing.rotation.y = sign * 0.25;
    asm.add(housing);

    // Lente espelhada reflexiva (frente voltada para trás na direção do piloto)
    const glassGeo = new THREE.CircleGeometry(0.046, 20);
    const glass = new THREE.Mesh(glassGeo, mirrorGlassMat);
    glass.position.set(sign * 0.08, 0.20, -0.033);
    glass.rotation.y = Math.PI + sign * -0.25;
    glass.rotation.x = -0.12;
    asm.add(glass);

    // Reflexo / Brilho de sol no vidro do espelho (Lens Flare)
    const flareGeo = new THREE.PlaneGeometry(0.075, 0.075);
    const flare = new THREE.Mesh(flareGeo, mirrorFlareMat);
    flare.position.set(sign * 0.08, 0.20, -0.037);
    flare.rotation.y = Math.PI + sign * -0.25;
    flare.rotation.x = -0.12;
    asm.add(flare);

    return asm;
  };

  const leftMirror = createMirrorAssembly(false);
  leftMirror.position.set(-0.34, 0.98, 0.44);
  mirrorGroup.add(leftMirror);

  const rightMirror = createMirrorAssembly(true);
  rightMirror.position.set(0.34, 0.98, 0.44);
  mirrorGroup.add(rightMirror);

  suspensionGroup.add(mirrorGroup);

  // =========================================================================
  // 💡 FAROL DIANTEIRO DA MOTO REALISTA (NATURAL DE DIA, ILUMINAÇÃO TOTAL À NOITE)
  // =========================================================================
  const headlightGroup = new THREE.Group();
  headlightGroup.name = 'motorcycleHeadlight';
  headlightGroup.position.set(0, 0.76, 0.84);

  // 1. Carcaça esportiva do farol
  const hlHousingGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.10, 16);
  hlHousingGeo.rotateX(Math.PI / 2);
  const hlHousingMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.6 });
  const hlHousing = new THREE.Mesh(hlHousingGeo, hlHousingMat);
  headlightGroup.add(hlHousing);

  // 2. Lente de vidro cristalina incandescente
  const hlLensGeo = new THREE.CircleGeometry(0.11, 20);
  const hlLensMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 0.8,
    roughness: 0.1,
  });
  const hlLens = new THREE.Mesh(hlLensGeo, hlLensMat);
  hlLens.position.set(0, 0, 0.052);
  headlightGroup.add(hlLens);

  // 3. Halo / Brilho volumétrico frontal (Sutil no sol, incandescente à noite)
  const hlHaloGeo = new THREE.PlaneGeometry(0.55, 0.55);
  const hlHaloMat = new THREE.MeshBasicMaterial({
    map: getMotoHeadlightTexture(),
    transparent: true,
    opacity: 0.10,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const hlHalo = new THREE.Mesh(hlHaloGeo, hlHaloMat);
  hlHalo.position.set(0, 0, 0.06);
  headlightGroup.add(hlHalo);

  // 4. Projeção de facho de luz no asfalto (Invisível sob sol forte, surge suave ao anoitecer)
  const groundBeamGeo = new THREE.PlaneGeometry(2.6, 16.0);
  groundBeamGeo.rotateX(-Math.PI / 2);
  const groundBeamMat = new THREE.MeshBasicMaterial({
    map: getMotoBeamGroundTexture(),
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const groundBeam = new THREE.Mesh(groundBeamGeo, groundBeamMat);
  groundBeam.position.set(0, -0.73, 8.2);
  groundBeam.visible = false;
  headlightGroup.add(groundBeam);

  // 5. Luz dinâmica pontual suave na dianteira
  const hlPointLight = new THREE.PointLight(0xfffbeb, 0.1, 16);
  hlPointLight.position.set(0, 0, 0.25);
  headlightGroup.add(hlPointLight);

  const setMotoHeadlightIntensity = (nightFactor: number) => {
    const n = Math.max(0, Math.min(1, nightFactor));
    // Facho no asfalto: estritamente visível quando começa a escurecer
    groundBeamMat.opacity = n * 0.58;
    groundBeam.visible = n > 0.02;

    // Halo frontal: reflexo sutil de dia (0.10), brilho potente à noite (0.85)
    hlHaloMat.opacity = 0.10 + n * 0.75;

    // Lente do farol: emissão suave de dia, bulbo potente aceso à noite
    hlLensMat.emissiveIntensity = 0.8 + n * 3.2;

    // Luz pontual Three.js
    hlPointLight.intensity = n * 2.8;
  };
  setMotoHeadlightIntensity(0); // Inicia no padrão diurno límpido

  suspensionGroup.add(headlightGroup);

  // =========================================================================
  // 🇧🇷 BANDEIRA DO BRASIL: FORMATO AERODINÂMICO COM ONDULAÇÃO FÍSICA NO VENTO
  // =========================================================================
  const flagGroup = new THREE.Group();
  flagGroup.name = 'brazilFlagGroup';
  flagGroup.position.set(0.32, 0.95, -0.68);
  flagGroup.rotation.set(-0.24, 0, -0.12);

  // Mastro flexível com mola cromada na base
  const springBaseGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.07, 10);
  const springBaseMat = new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.9, roughness: 0.1 });
  const springBase = new THREE.Mesh(springBaseGeo, springBaseMat);
  springBase.position.y = 0.035;
  flagGroup.add(springBase);

  const mastGeo = new THREE.CylinderGeometry(0.008, 0.009, 0.74, 8);
  const mast = new THREE.Mesh(mastGeo, chromeMat);
  mast.position.y = 0.42;
  flagGroup.add(mast);

  // Ponteira dourada no topo da antena
  const tipGeo = new THREE.SphereGeometry(0.018, 12, 12);
  const tipMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.1 });
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.position.y = 0.79;
  flagGroup.add(tip);

  // Tecido da Bandeira com malha subdividida para física real de onda senoidal
  const flagTex = getMiniBrazilFlagTexture();
  const flagWidth = 0.38;
  const flagHeight = 0.23;
  const flagClothGeo = new THREE.PlaneGeometry(flagWidth, flagHeight, 14, 8);
  // Desloca para que a lateral fique presa no mastro
  flagClothGeo.translate(-flagWidth * 0.5, 0, 0);

  const flagClothMat = new THREE.MeshStandardMaterial({
    map: flagTex,
    side: THREE.DoubleSide,
    roughness: 0.45,
    metalness: 0.05,
  });
  const flagCloth = new THREE.Mesh(flagClothGeo, flagClothMat);
  flagCloth.position.set(0, 0.62, 0);
  flagCloth.castShadow = true;
  flagGroup.add(flagCloth);

  suspensionGroup.add(flagGroup);

  // 📦 BAÚ DE ENTREGAS CLARO E ILUMINADO DA MOTO (Mochila do Motoboy com Anúncio Pago)
  const boxGeo = new THREE.BoxGeometry(0.58, 0.58, 0.58);
  const boxSideMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    roughness: 0.3,
    metalness: 0.1,
  });
  const boxAdTex = createBrightDeliveryBoxTexture();
  const boxRearMat = new THREE.MeshStandardMaterial({
    map: boxAdTex,
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.1,
    emissive: 0xfffbeb,
    emissiveIntensity: 0.25,
  });
  const boxMaterials = [
    boxSideMat, boxSideMat, boxSideMat, boxSideMat, boxSideMat, boxRearMat
  ];
  const deliveryBoxMesh = new THREE.Mesh(boxGeo, boxMaterials);
  deliveryBoxMesh.name = 'deliveryBoxMesh';
  deliveryBoxMesh.position.set(0, 0.96, -0.44);
  deliveryBoxMesh.castShadow = true;
  deliveryBoxMesh.receiveShadow = false;
  suspensionGroup.add(deliveryBoxMesh);

  // Guarda posições originais dos vértices para ondulação
  const origPositions = flagClothGeo.attributes.position.clone();

  // Red damage flash material
  const damageFlashMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xef4444,
    emissiveIntensity: 2.5,
    roughness: 0.2,
  });

  // Invisible dummy placeholders to satisfy interface with zero visual artifacts
  const dummyMat = new THREE.MeshBasicMaterial({ visible: false });
  const dummyGeo = new THREE.BufferGeometry();
  const dummyMesh = new THREE.Mesh(dummyGeo, dummyMat);
  dummyMesh.visible = false;

  // Active motorcycle FBX model container
  let currentBikeMesh: THREE.Object3D = new THREE.Group();
  suspensionGroup.add(currentBikeMesh);

  interface CachedMatEntry {
    mat: THREE.Material & { emissive?: THREE.Color; emissiveIntensity?: number };
    origEmissive?: THREE.Color;
    origEmissiveIntensity?: number;
  }
  const cachedBikeMaterials: CachedMatEntry[] = [];

  // Pre-allocated colors for zero-GC smooth cash glow
  const cashFlashColor = new THREE.Color(0x22c55e);
  const colNote10 = new THREE.Color(0x22c55e);  // Verde Esmeralda (R$ 10)
  const colNote50 = new THREE.Color(0xa855f7);  // Roxo Vibrante (R$ 50)
  const colNote100 = new THREE.Color(0x06b6d4); // Azul Ciano Brilhante (R$ 100)
  let cashFlashTimer = 0;
  const cashFlashDuration = 0.52;

  const rebuildCachedMaterials = (rootObj?: THREE.Object3D) => {
    cachedBikeMaterials.length = 0;
    // Inclui o baú de entregas (muito visível de costas na câmera!)
    cachedBikeMaterials.push(
      {
        mat: boxSideMat,
        origEmissive: boxSideMat.emissive.clone(),
        origEmissiveIntensity: boxSideMat.emissiveIntensity ?? 0,
      },
      {
        mat: boxRearMat,
        origEmissive: boxRearMat.emissive.clone(),
        origEmissiveIntensity: boxRearMat.emissiveIntensity ?? 0,
      }
    );

    if (rootObj) {
      rootObj.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          // Clona o material uma única vez na troca de skin para isolar o brilho emissivo desta instância
          if (Array.isArray(child.material)) {
            child.material = child.material.map((m) => (m ? m.clone() : m));
          } else {
            child.material = child.material.clone();
          }
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const m of mats) {
            if (m && (m as any).emissive) {
              const activeMat = m as THREE.MeshStandardMaterial;
              cachedBikeMaterials.push({
                mat: activeMat,
                origEmissive: activeMat.emissive.clone(),
                origEmissiveIntensity: activeMat.emissiveIntensity ?? 0,
              });
            }
          }
        }
      });
    }
  };

  // Inicializa pelo menos com os materiais do baú caso o FBX ainda esteja carregando
  rebuildCachedMaterials();

  const applyFbxModel = (fbxClone: THREE.Group) => {
    fbxClone.userData.isFBXModel = true;
    suspensionGroup.remove(currentBikeMesh);
    currentBikeMesh = fbxClone;
    suspensionGroup.add(fbxClone);
    rebuildCachedMaterials(fbxClone);
  };

  const cached = cachedFbxTemplates.get(initialSkinId);
  let isInitiallyLoaded = false;
  if (cached) {
    applyFbxModel(cached.clone(true));
    isInitiallyLoaded = true;
  } else {
    loadFbxSkin(initialSkinId, (fbxClone) => {
      applyFbxModel(fbxClone);
    });
  }

  // Instantiated object - FBX motorcycle + Brazilian flag + dynamic skin swap
  const instance: MotoboyInstance = {
    group,
    wheels: [dummyMesh, dummyMesh],
    exhaust: dummyMesh,
    bag: deliveryBoxMesh,
    flag: flagCloth,
    suspensionGroup,
    riderTorso: dummyMesh,
    riderLegL: dummyMesh,
    riderLegR: dummyMesh,
    jumpVelocity: 0,
    suspensionY: 0,
    suspensionPitch: 0,
    damageTimer: 0,
    fbxLoaded: isInitiallyLoaded,
    currentSkinId: initialSkinId,
    setSkin(skinId: string) {
      this.currentSkinId = skinId;
      loadFbxSkin(skinId, (fbxClone) => {
        applyFbxModel(fbxClone);
        this.fbxLoaded = true;
      });
    },
    triggerBumpJump() {
      // Suave amortecimento elástico da suspensão (elimina 100% de tremores ou bugs)
      this.suspensionPitch = 0.08;
    },
    triggerBiteDamage() {
      this.damageTimer = 0.85;
      this.triggerDamageFlash?.(0.85);
    },
    triggerDamageFlash(duration = 0.85) {
      this.damageTimer = duration;
    },
    triggerCashFlash(noteValue: 10 | 50 | 100 = 10) {
      if (noteValue === 100) {
        cashFlashColor.copy(colNote100);
      } else if (noteValue === 50) {
        cashFlashColor.copy(colNote50);
      } else {
        cashFlashColor.copy(colNote10);
      }
      cashFlashTimer = cashFlashDuration;
    },
    setHeadlightNightFactor(factor: number) {
      setMotoHeadlightIntensity(factor);
    },
    updateAnimation(runTime: number, bikeSpeed: number, dt: number, lateralWeave: number = 0, nightFactor: number = 0) {
      // =======================================================================
      // 🇧🇷 FÍSICA DINÂMICA DA BANDEIRA (ONDAS DE TECIDO PROGRESSIVAS NO VENTO)
      // =======================================================================
      // ⚡ Otimização de fluidez: atualiza a cada 2 frames e elimina computeVertexNormals() contínuo na CPU
      if (((window as any).__frameCount & 1) === 0) {
        const posAttr = flagClothGeo.attributes.position;
        const speedMult = 1.0 + Math.min(1.6, Math.max(0, bikeSpeed) / 16.0);
        for (let i = 0; i < posAttr.count; i++) {
          const ox = origPositions.getX(i);
          const oy = origPositions.getY(i);
          // Distância relativa ao mastro (0 no mastro, 1 na ponta livre)
          const distFromMast = Math.abs(ox) / flagWidth;
          // Onda senoidal primária + harmônica de vento
          const waveZ = Math.sin(runTime * 24.0 * speedMult + ox * 22.0) * (0.055 * distFromMast)
                      + Math.cos(runTime * 15.0 * speedMult + ox * 12.0) * (0.022 * distFromMast);
          const waveY = Math.sin(runTime * 19.0 * speedMult + ox * 16.0) * (0.014 * distFromMast);

          posAttr.setZ(i, waveZ);
          posAttr.setY(i, oy + waveY);
        }
        posAttr.needsUpdate = true;
      }

      // Flexibilidade da haste/mastro com mola proporcional à velocidade
      const mastTiltX = -0.22 - Math.min(0.20, bikeSpeed * 0.007) + Math.sin(runTime * 16.0) * 0.025;
      flagGroup.rotation.x = mastTiltX;
      flagGroup.rotation.z = -0.12 + Math.cos(runTime * 11.0) * 0.02;

      // =======================================================================
      // 🪞 PULSAÇÃO ESPECULAR NOS RETROVISORES & FAROL ACESO SÓ À NOITE
      // =======================================================================
      mirrorFlareMat.opacity = 0.60 + Math.sin(runTime * 8.5) * 0.25;
      setMotoHeadlightIntensity(nightFactor);
      if (nightFactor > 0.05) {
        hlHaloMat.opacity += Math.sin(runTime * 18.0) * 0.04;
        groundBeamMat.opacity += Math.sin(runTime * 14.0) * 0.03;
      }

      // =======================================================================
      // 🏍️ SUSPENSÃO & BALANÇO SUAVE DA MOTO
      // =======================================================================
      this.suspensionPitch += (0 - this.suspensionPitch) * Math.min(1.0, 8.5 * dt);
      this.suspensionGroup.position.y = 0;
      this.suspensionGroup.rotation.x = this.suspensionPitch;
      // ⚡ O controle de rotação Z (Roll) é unificado no Caramelo3DRunner sem conflitos de física dupla!

      // Reação de dano piscando em vermelho vivo (prioridade sobre o pulso de dinheiro)
      if (this.damageTimer > 0) {
        this.damageTimer -= dt;
        cashFlashTimer = 0;
        this.suspensionGroup.scale.set(1, 1, 1);
        const isFlashOn = Math.floor(this.damageTimer * 10) % 2 === 0;
        const flashColor = isFlashOn ? 0xff2222 : 0x000000;
        const flashIntensity = isFlashOn ? 2.5 : 0;

        for (let i = 0; i < cachedBikeMaterials.length; i++) {
          const entry = cachedBikeMaterials[i];
          if (entry.mat.emissive) {
            if (isFlashOn) {
              entry.mat.emissive.setHex(flashColor);
              if (typeof entry.mat.emissiveIntensity === 'number') {
                entry.mat.emissiveIntensity = flashIntensity;
              }
            } else if (entry.origEmissive) {
              entry.mat.emissive.copy(entry.origEmissive);
              if (typeof entry.mat.emissiveIntensity === 'number') {
                entry.mat.emissiveIntensity = entry.origEmissiveIntensity ?? 0;
              }
            }
          }
        }

        if (this.damageTimer <= 0) {
          for (let i = 0; i < cachedBikeMaterials.length; i++) {
            const entry = cachedBikeMaterials[i];
            if (entry.mat.emissive && entry.origEmissive) {
              entry.mat.emissive.copy(entry.origEmissive);
              if (typeof entry.mat.emissiveIntensity === 'number') {
                entry.mat.emissiveIntensity = entry.origEmissiveIntensity ?? 0;
              }
            }
          }
        }
      } else if (cashFlashTimer > 0) {
        // 💵 Pulso luminoso super suave e satisfatório na cor da nota coletada (R$ 10 Verde, R$ 50 Roxo, R$ 100 Azul/Ciano)
        cashFlashTimer = Math.max(0, cashFlashTimer - dt);
        const progress = 1.0 - (cashFlashTimer / cashFlashDuration); // 0 -> 1
        // Onda senoidal suave com duas pulsações delicadas e decaimento sedoso
        const envelope = Math.sin(progress * Math.PI);
        const shimmer = 0.72 + 0.28 * Math.sin(progress * Math.PI * 3.0);
        const glowFactor = envelope * shimmer;

        // Micro-impulso elástico sutil no corpo da moto para sensação tátil satisfatória
        const scalePulse = 1.0 + envelope * 0.032;
        this.suspensionGroup.scale.set(scalePulse, scalePulse, scalePulse);

        for (let i = 0; i < cachedBikeMaterials.length; i++) {
          const entry = cachedBikeMaterials[i];
          if (entry.mat.emissive && entry.origEmissive) {
            entry.mat.emissive.copy(entry.origEmissive).lerp(cashFlashColor, glowFactor * 0.90);
            if (typeof entry.mat.emissiveIntensity === 'number') {
              const baseInt = entry.origEmissiveIntensity ?? 0;
              entry.mat.emissiveIntensity = baseInt + glowFactor * 1.45;
            }
          }
        }

        if (cashFlashTimer <= 0) {
          this.suspensionGroup.scale.set(1, 1, 1);
          for (let i = 0; i < cachedBikeMaterials.length; i++) {
            const entry = cachedBikeMaterials[i];
            if (entry.mat.emissive && entry.origEmissive) {
              entry.mat.emissive.copy(entry.origEmissive);
              if (typeof entry.mat.emissiveIntensity === 'number') {
                entry.mat.emissiveIntensity = entry.origEmissiveIntensity ?? 0;
              }
            }
          }
        }
      }
    },
  };

  // Trigger initial skin load
  instance.setSkin(initialSkinId);

  return instance;
}

export function preloadAllFbxSkins() {
  if (typeof window === 'undefined') return;
  MOTO_SKINS.forEach((skin) => {
    loadFbxSkin(skin.id);
  });
}

