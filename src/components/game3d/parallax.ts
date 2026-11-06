import * as THREE from 'three';

export interface HorizonVisualState {
  monumentGlowOpacity: number;
  uplightOpacity: number;
  godRaysOpacity: number;
  godRaysAngle: number;
  helicopterPos: { x: number; y: number; z: number; yaw: number };
  cableCarProgress: number;
  mistDriftX: number;
}

export const HORIZON_MONUMENT_CONFIG = {
  maxBuildingTopY: 17.8,
  buildingZMin: 220,
  buildingZMax: 240,
  corcovadoZ: 250,
  corcovadoSummitY: 33.5,
  pedestalHeight: 4.2,
  statueHeight: 11.8,
  statueArmSpan: 12.6,
  monumentTopY: 49.5,
} as const;

export function computeHorizonVisualState(timeProgress: number, elapsedSec: number): HorizonVisualState {
  let nightFactor = 0;
  let sunsetFactor = 0;
  if (timeProgress >= 0.35 && timeProgress < 0.56) {
    sunsetFactor = Math.sin(((timeProgress - 0.35) / 0.21) * Math.PI);
  }
  if (timeProgress >= 0.50 && timeProgress < 0.65) {
    nightFactor = (timeProgress - 0.50) / 0.15;
  } else if (timeProgress >= 0.65 && timeProgress < 0.88) {
    nightFactor = 1.0;
  } else if (timeProgress >= 0.88 && timeProgress < 0.96) {
    nightFactor = 1.0 - (timeProgress - 0.88) / 0.08;
  }

  // ✨ Brilho e Halo celestial do monumento do Cristo:
  // - Dia: iluminação suave e celestial sob a luz do sol (0.22)
  // - Pôr do sol: halo dourado crepuscular cinematográfico (0.38)
  // - Noite: iluminação artística de refletores (0.24)
  const monumentGlowOpacity = (1.0 - nightFactor) * 0.20 + sunsetFactor * 0.24 + nightFactor * 0.22;
  const uplightOpacity = sunsetFactor * 0.14 + nightFactor * 0.28;

  // ☀️ Raios Solares Crepusculares (God Rays) radiantes atrás do Cristo
  // Visíveis de dia e majestosos ao pôr do sol; apagam à noite
  const godRaysOpacity = Math.max(0, (1.0 - nightFactor) * (0.22 + sunsetFactor * 0.16));
  const godRaysAngle = Math.sin(elapsedSec * 0.20) * 0.12;

  // 🚁 Órbita panorâmica do helicóptero turístico ao redor do Cristo Redentor
  const heliAngle = elapsedSec * 0.38;
  const heliX = Math.cos(heliAngle) * 15.0;
  const heliZ = HORIZON_MONUMENT_CONFIG.corcovadoZ - 4.5 + Math.sin(heliAngle) * 5.0;
  const heliY = 44.2 + Math.sin(elapsedSec * 1.3) * 1.0;
  const heliYaw = -heliAngle + Math.PI * 0.5;

  // 🚡 Movimento suave de ida e volta do bondinho do Pão de Açúcar
  const cableCarProgress = 0.5 + 0.5 * Math.sin(elapsedSec * 0.32);
  const mistDriftX = Math.sin(elapsedSec * 0.22) * 5.5;

  return {
    monumentGlowOpacity,
    uplightOpacity,
    godRaysOpacity,
    godRaysAngle,
    helicopterPos: { x: heliX, y: heliY, z: heliZ, yaw: heliYaw },
    cableCarProgress,
    mistDriftX,
  };
}

// 🏢 Texturas Arquitetônicas do Skyline Urbano
function createSeriousFacadeTexture(facadeColor: number, seed: number, isDeep: boolean): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const r = (facadeColor >> 16) & 255;
  const g = (facadeColor >> 8) & 255;
  const b = facadeColor & 255;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, 256);
  bgGrad.addColorStop(0.0, `rgb(${Math.min(255, r + 24)}, ${Math.min(255, g + 24)}, ${Math.min(255, b + 26)})`);
  bgGrad.addColorStop(0.65, `rgb(${r}, ${g}, ${b})`);
  bgGrad.addColorStop(1.0, `rgb(${Math.max(0, r - 10)}, ${Math.max(0, g - 10)}, ${Math.max(0, b - 12)})`);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 128, 256);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.fillRect(0, 0, 8, 256);
  ctx.fillRect(120, 0, 8, 256);
  ctx.fillRect(60, 0, 8, 256);

  const rows = isDeep ? 16 : 12;
  const cols = 4;
  const rowH = Math.floor(256 / rows);
  const padX = 12;
  const colW = Math.floor((128 - padX * 2) / cols);

  for (let row = 0; row < rows; row++) {
    const wy = row * rowH + 3;
    const winH = Math.max(3, rowH - 6);

    ctx.fillStyle = 'rgba(241, 245, 249, 0.28)';
    ctx.fillRect(0, row * rowH, 128, 2);

    for (let col = 0; col < cols; col++) {
      const wx = padX + col * colW + 2;
      const winW = Math.max(4, colW - 4);
      const hash = (seed * 19 + row * 13 + col * 7) % 10;

      if (hash === 0 || hash === 1) {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
      } else if (hash === 2 || hash === 3) {
        ctx.fillStyle = 'rgba(186, 230, 253, 0.52)';
      } else {
        ctx.fillStyle = 'rgba(71, 85, 105, 0.42)';
      }
      ctx.fillRect(wx, wy, winW, winH);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1.15);
  texture.needsUpdate = true;
  return texture;
}

// ⛰️ PINTURA MATTE CINEMATOGRÁFICA DO MORRO DO CORCOVADO COM FADE OUT ATMOSFÉRICO REAL
function createCinematicCorcovadoTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Degradê vertical majestoso: Granito Carioca no topo -> Floresta densa -> Fade Out atmosférico na base
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0.00, '#475569'); // Paredão vertical rochoso gnaisse no cume
  grad.addColorStop(0.12, '#334155'); // Escarpa escura de rocha sob o pedestal
  grad.addColorStop(0.24, '#1e293b'); // Fenda geológica escura
  grad.addColorStop(0.32, '#14532d'); // Transição para floresta tropical densa
  grad.addColorStop(0.48, '#15803d'); // Mata Atlântica rica em verde esmeralda
  grad.addColorStop(0.64, '#166534'); // Floresta tropical de meia encosta
  grad.addColorStop(0.78, '#3b82f6'); // Início da Perspectiva Aérea (difusão de Rayleigh)
  grad.addColorStop(0.90, '#93c5fd'); // Névoa atmosférica luminosa do vale
  grad.addColorStop(1.00, '#e0f2fe'); // Fade Out completo na cor do horizonte
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Luz solar rasante dourada na face leste (Morning / Afternoon Golden Rim)
  const sunWash = ctx.createLinearGradient(0, 0, 1024, 0);
  sunWash.addColorStop(0.00, 'rgba(15, 23, 42, 0.38)'); // Face ocidental sombreada
  sunWash.addColorStop(0.45, 'rgba(255, 255, 255, 0.05)');
  sunWash.addColorStop(0.78, 'rgba(254, 240, 138, 0.28)'); // Face leste iluminada
  sunWash.addColorStop(1.00, 'rgba(251, 191, 36, 0.18)');
  ctx.fillStyle = sunWash;
  ctx.fillRect(0, 0, 1024, 1024);

  // 3. Fissuras verticais escarpadas e estratificação do Granito Carioca (y = 0 a 320)
  for (let i = 0; i < 75; i++) {
    const x = (i * 37 + (i % 7) * 19) % 1024;
    const w = 3 + (i % 5) * 3;
    const h = 180 + (i % 8) * 45;
    const y = (i % 5) * 28;
    const cliff = ctx.createLinearGradient(x, 0, x + w, 0);
    cliff.addColorStop(0.0, 'rgba(15, 23, 42, 0.40)');
    cliff.addColorStop(0.4, 'rgba(148, 163, 184, 0.35)');
    cliff.addColorStop(0.7, 'rgba(226, 232, 240, 0.45)');
    cliff.addColorStop(1.0, 'rgba(15, 23, 42, 0.30)');
    ctx.fillStyle = cliff;
    ctx.fillRect(x, y, w, h);
  }

  // 4. Dossel contínuo da Mata Atlântica com micro-textura orgânica (sem círculos de sarampo!)
  for (let band = 0; band < 45; band++) {
    const by = 260 + band * 11;
    const bandAlpha = Math.sin((band / 45) * Math.PI) * 0.38;
    const col = (band % 3 === 0) ? `rgba(22, 163, 74, ${bandAlpha})`
              : (band % 3 === 1) ? `rgba(21, 128, 61, ${bandAlpha * 1.1})`
              : `rgba(34, 197, 94, ${bandAlpha * 0.9})`;
    ctx.fillStyle = col;
    for (let c = 0; c < 35; c++) {
      const cx = (c * 31 + band * 47) % 1024;
      const rx = 14 + (c % 7) * 4;
      const ry = 6 + (c % 5) * 3;
      ctx.beginPath();
      ctx.ellipse(cx, by, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5. CAMADA DE FADE OUT ATMOSFÉRICO CINEMATOGRÁFICO NA BASE (Dissolve Aéreo Suave)
  // Elimina cortes secos: a montanha dissolve-se harmonicamente no horizonte!
  const fadeHaze = ctx.createLinearGradient(0, 640, 0, 1024);
  fadeHaze.addColorStop(0.00, 'rgba(186, 230, 253, 0.0)');
  fadeHaze.addColorStop(0.40, 'rgba(186, 230, 253, 0.48)');
  fadeHaze.addColorStop(0.75, 'rgba(219, 234, 254, 0.85)');
  fadeHaze.addColorStop(1.00, 'rgba(224, 242, 254, 0.98)');
  ctx.fillStyle = fadeHaze;
  ctx.fillRect(0, 640, 1024, 384);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// 🪨 Textura Nobre Contínua de Monólito Granítico (Pão de Açúcar / Dois Irmãos)
function createCinematicGraniteTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Monólito contínuo de granito carioca esculpido banhado por sol tropical
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0.00, '#94a3b8'); // Cume de granito suave
  grad.addColorStop(0.20, '#cbd5e1'); // Granito claro iluminado
  grad.addColorStop(0.45, '#64748b'); // Paredão de rocha gnaisse
  grad.addColorStop(0.65, '#15803d'); // Franja florestal na base do morro
  grad.addColorStop(0.82, '#93c5fd'); // Névoa atmosférica
  grad.addColorStop(1.00, '#e0f2fe'); // Fade out completo na base
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Luz solar dourada rasante
  const sunLight = ctx.createLinearGradient(0, 0, 1024, 0);
  sunLight.addColorStop(0.0, 'rgba(30, 41, 59, 0.32)');
  sunLight.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
  sunLight.addColorStop(0.8, 'rgba(254, 240, 138, 0.32)');
  sunLight.addColorStop(1.0, 'rgba(251, 191, 36, 0.18)');
  ctx.fillStyle = sunLight;
  ctx.fillRect(0, 0, 1024, 1024);

  // Veios verticais de escarpa de granito
  for (let i = 0; i < 40; i++) {
    const x = (i * 49) % 1024;
    const w = 4 + (i % 6) * 3;
    const h = 450 + (i % 7) * 60;
    const cliff = ctx.createLinearGradient(x, 0, x + w, 0);
    cliff.addColorStop(0.0, 'rgba(51, 65, 85, 0.30)');
    cliff.addColorStop(0.5, 'rgba(241, 245, 249, 0.38)');
    cliff.addColorStop(1.0, 'rgba(51, 65, 85, 0.20)');
    ctx.fillStyle = cliff;
    ctx.fillRect(x, 20, w, h);
  }

  // Fade out atmosférico na base
  const baseFade = ctx.createLinearGradient(0, 680, 0, 1024);
  baseFade.addColorStop(0.0, 'rgba(186, 230, 253, 0.0)');
  baseFade.addColorStop(0.5, 'rgba(186, 230, 253, 0.55)');
  baseFade.addColorStop(1.0, 'rgba(224, 242, 254, 0.95)');
  ctx.fillStyle = baseFade;
  ctx.fillRect(0, 680, 1024, 344);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// 🏞️ Textura de Cordilheira Distante (Serra dos Órgãos / Maciço da Tijuca de Fundo)
function createCinematicBackdropTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.00, '#64748b'); // Azul-ardósia distante
  grad.addColorStop(0.35, '#93c5fd'); // Azul suave do ar
  grad.addColorStop(0.70, '#bae6fd'); // Bruma luminosa
  grad.addColorStop(1.00, '#e0f2fe'); // Fusão com o céu
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// 🌫️ Textura de Névoa de Vale e Distance Fade Atmosférico
function createCinematicValleyMistTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 256);

  // Degradê vertical suave de névoa de vale: transparente no topo e na base, luminoso no centro
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.00, 'rgba(224, 242, 254, 0.0)');
  grad.addColorStop(0.35, 'rgba(219, 234, 254, 0.45)');
  grad.addColorStop(0.60, 'rgba(186, 230, 253, 0.75)');
  grad.addColorStop(0.85, 'rgba(191, 219, 254, 0.50)');
  grad.addColorStop(1.00, 'rgba(224, 242, 254, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  for (let i = 0; i < 8; i++) {
    const cy = 80 + i * 16;
    const gradWave = ctx.createRadialGradient(256, cy, 30, 256, cy, 240);
    gradWave.addColorStop(0.0, 'rgba(255, 255, 255, 0.25)');
    gradWave.addColorStop(0.5, 'rgba(224, 242, 254, 0.12)');
    gradWave.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = gradWave;
    ctx.beginPath();
    ctx.ellipse(256, cy, 250, 35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// 🗿 Textura Procedural de Pedra-Sabão Art Déco (Cristo Redentor)
function createSoapstoneRobeTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const bg = ctx.createLinearGradient(0, 0, 256, 256);
  bg.addColorStop(0.0, '#ffffff');
  bg.addColorStop(0.60, '#f8fafc');
  bg.addColorStop(1.0, '#e2e8f0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);

  for (let x = 16; x < 256; x += 22) {
    const foldGrad = ctx.createLinearGradient(x - 8, 0, x + 14, 0);
    foldGrad.addColorStop(0.0, 'rgba(148, 163, 184, 0.0)');
    foldGrad.addColorStop(0.40, 'rgba(100, 116, 139, 0.22)');
    foldGrad.addColorStop(0.70, 'rgba(255, 255, 255, 0.75)');
    foldGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.0)');
    ctx.fillStyle = foldGrad;
    ctx.fillRect(x - 8, 0, 22, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// 🌟 Halo Celestial Suave
function createSoftRadialGlowTexture(innerRgba: string, midRgba: string): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createRadialGradient(128, 128, 4, 128, 128, 124);
  grad.addColorStop(0.0, innerRgba);
  grad.addColorStop(0.35, midRgba);
  grad.addColorStop(0.75, 'rgba(254, 240, 138, 0.06)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ☀️ Raios Solares Crepusculares (God Rays) Majestosos e Suaves
function createCinematicGodRaysTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') return new THREE.CanvasTexture({} as any);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 512);
  ctx.save();
  ctx.translate(256, 256);

  const rayCount = 18;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    ctx.save();
    ctx.rotate(angle);
    const rGrad = ctx.createLinearGradient(0, 0, 250, 0);
    rGrad.addColorStop(0.00, 'rgba(255, 254, 240, 0.65)');
    rGrad.addColorStop(0.25, 'rgba(254, 240, 138, 0.35)');
    rGrad.addColorStop(0.60, 'rgba(253, 224, 71, 0.12)');
    rGrad.addColorStop(1.00, 'rgba(254, 240, 138, 0.0)');
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(248, -28);
    ctx.lineTo(248, 28);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// 🏔️ Morfologia Esculpida do Morro do Corcovado
function createSculptedCorcovadoGeometry(peakH: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(3.8, 34.0, peakH, 48, 24, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = (y + peakH * 0.5) / peakH; // 0 na base, 1 no cume
    const angle = Math.atan2(z, x);

    // Declive suave e majestoso na base com paredão escarpado no topo
    const flare = Math.pow(1.0 - ny, 2.0) * 0.36;

    // Paredão do Corcovado: face frontal quase vertical sob o pedestal
    let cliffIndent = 0.0;
    if (z < 0 && ny > 0.40) {
      cliffIndent = -1.2 * Math.pow(ny, 1.5) * Math.cos(angle);
    }

    // Cristas e escarpas laterais naturais da Floresta da Tijuca descendo em leque
    const ridge1 = Math.sin(angle * 3.0 + ny * 2.2) * (1.2 * (1.0 - ny));
    const ridge2 = Math.cos(angle * 4.0 - ny * 3.0) * (0.8 * (1.0 - ny));

    const currentR = Math.sqrt(x * x + z * z);
    const newR = Math.max(0.5, currentR * (1.0 + flare) + ridge1 + ridge2 + cliffIndent);

    pos.setX(i, Math.cos(angle) * newR);
    pos.setZ(i, Math.sin(angle) * newR);

    const shoulderElevation = Math.sin(angle * 2.0) * 0.9 * (1.0 - ny);
    pos.setY(i, y + shoulderElevation);
  }
  geo.computeVertexNormals();
  return geo;
}

// 🪨 Morfologia do Pão de Açúcar (Monólito Granítico Contínuo sem emendas)
function createSculptedSugarloafGeometry(height: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(1.6, 17.0, height, 44, 22, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = (y + height * 0.5) / height;
    const angle = Math.atan2(z, x);

    // Domo parabólico natural contínuo
    const domeCurve = Math.sqrt(Math.max(0, 1.0 - Math.pow(ny, 2.4)));
    const baseSpread = Math.pow(1.0 - ny, 1.6) * 0.28;

    const currentR = Math.sqrt(x * x + z * z);
    const newR = Math.max(0.4, currentR * (0.68 + domeCurve * 0.48 + baseSpread));

    pos.setX(i, Math.cos(angle) * newR);
    pos.setZ(i, Math.sin(angle) * newR);
  }
  geo.computeVertexNormals();
  return geo;
}

// 🏔️ Morfologia dos Morros Dois Irmãos
function createSculptedDoisIrmaosGeometry(height: number, isMajor: boolean): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(1.2, isMajor ? 16.5 : 14.5, height, 36, 18, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = (y + height * 0.5) / height;
    const angle = Math.atan2(z, x);

    const ridge = Math.sin(angle * 2.5 + ny * 2.2) * (0.85 * (1.0 - ny));
    const flare = Math.pow(1.0 - ny, 1.8) * 0.26;

    const currentR = Math.sqrt(x * x + z * z);
    const newR = Math.max(0.4, currentR * (1.0 + flare) + ridge);

    pos.setX(i, Math.cos(angle) * newR);
    pos.setZ(i, Math.sin(angle) * newR);
  }
  geo.computeVertexNormals();
  return geo;
}

// 🌄 Cordilheira Panorâmica de Fundo (Backdrop Serra da Carioca / Serra dos Órgãos)
function createBackdropRidgeGeometry(width: number, height: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 48, 12);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = (x + width * 0.5) / width;
    const ny = (y + height * 0.5) / height;

    if (ny > 0.25) {
      const wave1 = Math.sin(nx * 12.0) * 2.4;
      const wave2 = Math.cos(nx * 6.5) * 3.8;
      const wave3 = Math.sin(nx * 24.0) * 0.9;
      pos.setY(i, y + (wave1 + wave2 + wave3) * (ny - 0.25));
    }
    pos.setZ(i, -Math.sin(nx * Math.PI) * 14.0);
  }
  geo.computeVertexNormals();
  return geo;
}

export class ParallaxSystem {
  private scene: THREE.Scene;
  private horizonRootGroup: THREE.Group;

  private isDisposed: boolean = false;
  private elapsedSec: number = 0;
  private currentTimeProgress: number = 0.2;

  private sharedMaterials: THREE.MeshBasicMaterial[] = [];
  private tintableHorizonMaterials: THREE.MeshBasicMaterial[] = [];
  private sharedGeometries: THREE.BufferGeometry[] = [];
  private sharedTextures: THREE.Texture[] = [];

  private trimMat: THREE.MeshBasicMaterial;
  private roofConcreteMat: THREE.MeshBasicMaterial;
  private unitBoxGeo: THREE.BoxGeometry;

  private monumentHaloSprite: THREE.Sprite | null = null;
  private godRaysMesh: THREE.Mesh | null = null;
  private uplightBeamMeshes: THREE.Mesh[] = [];
  private beaconMat: THREE.MeshBasicMaterial | null = null;
  private sacredHeartMat: THREE.MeshBasicMaterial | null = null;
  private mistLayers: Array<{ mesh: THREE.Mesh; baseX: number; speed: number; phase: number }> = [];
  private helicopterGroup: THREE.Group | null = null;
  private mainRotorMesh: THREE.Mesh | null = null;
  private tailRotorMesh: THREE.Mesh | null = null;
  private heliStrobeMat: THREE.MeshBasicMaterial | null = null;
  private birdFlockGroup: THREE.Group | null = null;
  private birdMeshes: Array<{ group: THREE.Group; leftWing: THREE.Mesh; rightWing: THREE.Mesh; phase: number; radius: number; speed: number; baseY: number }> = [];
  private cableCarGroup: THREE.Group | null = null;
  private cableStart = new THREE.Vector3(12.0, 27.5, 255);
  private cableEnd = new THREE.Vector3(19.0, 20.8, 264);

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.horizonRootGroup = new THREE.Group();
    this.horizonRootGroup.name = 'StaticRoadHorizonSkyline';
    this.scene.add(this.horizonRootGroup);

    this.unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.sharedGeometries.push(this.unitBoxGeo);

    this.trimMat = new THREE.MeshBasicMaterial({ color: 0xcbd5e1, fog: false });
    this.roofConcreteMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, fog: false });

    // 1. Skyline Metropolitano Dinâmico na Esquerda em Perspectiva (corredor central 100% livre)
    this.buildDynamicPerspectiveSkyline();

    // 2. Cordilheira Carioca Esculpida, Morro do Corcovado Cinematográfico e Cristo Redentor 3D no topo
    this.buildCorcovadoAndCristoHorizon();
  }

  private registerGeo<T extends THREE.BufferGeometry>(geo: T): T {
    this.sharedGeometries.push(geo);
    return geo;
  }

  private registerTex<T extends THREE.Texture>(tex: T): T {
    this.sharedTextures.push(tex);
    return tex;
  }

  private createTintableMat(hex: number, map?: THREE.Texture): THREE.MeshBasicMaterial {
    const mat = new THREE.MeshBasicMaterial({
      color: hex,
      map: map || null,
      fog: false,
    });
    mat.userData = { baseColor: new THREE.Color(hex) };
    this.tintableHorizonMaterials.push(mat);
    return mat;
  }

  private createSeriousPalette(): THREE.MeshBasicMaterial[] {
    if (this.sharedMaterials.length > 0) return this.sharedMaterials;

    const palette = [
      { hex: 0xcbd5e1, isDeep: false },
      { hex: 0xb8c4d0, isDeep: false },
      { hex: 0xd6d3d1, isDeep: false },
      { hex: 0xa8b8c8, isDeep: false },
      { hex: 0x9fb1c4, isDeep: true },
      { hex: 0x94a3b8, isDeep: true },
      { hex: 0xa1a1aa, isDeep: true },
    ];

    palette.forEach((item, idx) => {
      const tex = this.registerTex(createSeriousFacadeTexture(item.hex, idx + 1, item.isDeep));
      const mat = new THREE.MeshBasicMaterial({
        color: item.hex,
        map: tex,
        fog: false,
      });
      mat.userData = {
        baseColor: new THREE.Color(item.hex),
      };
      this.sharedMaterials.push(mat);
    });

    return this.sharedMaterials;
  }

  private createStaticBuilding(
    w: number,
    h: number,
    d: number,
    mat: THREE.MeshBasicMaterial,
    hasPenthouse: boolean
  ): THREE.Group {
    const group = new THREE.Group();

    const mainTower = new THREE.Mesh(this.unitBoxGeo, mat);
    mainTower.scale.set(w, h, d);
    mainTower.position.y = h * 0.5;
    group.add(mainTower);

    if (hasPenthouse) {
      const phW = w * 0.58;
      const phH = Math.min(2.0, h * 0.11);
      const phD = d * 0.58;
      const penthouse = new THREE.Mesh(this.unitBoxGeo, this.roofConcreteMat);
      penthouse.scale.set(phW, phH, phD);
      penthouse.position.y = h + phH * 0.5;
      group.add(penthouse);
    } else {
      const parapet = new THREE.Mesh(this.unitBoxGeo, this.trimMat);
      parapet.scale.set(w * 1.02, 0.42, d * 1.02);
      parapet.position.y = h + 0.21;
      group.add(parapet);
    }

    return group;
  }

  private buildDynamicPerspectiveSkyline(): void {
    const mats = this.createSeriousPalette();

    const leftSkyline: Array<{ x: number; z: number; w: number; h: number; d: number; matIdx: number; penthouse: boolean }> = [
      { x: -14.8, z: 212, w: 4.8, h: 16.5, d: 5.6, matIdx: 0, penthouse: true },
      { x: -18.6, z: 224, w: 5.2, h: 21.5, d: 5.8, matIdx: 2, penthouse: true },
      { x: -23.2, z: 236, w: 5.6, h: 26.0, d: 6.2, matIdx: 1, penthouse: true },
      { x: -28.5, z: 248, w: 6.0, h: 23.5, d: 6.4, matIdx: 3, penthouse: false },
      { x: -35.0, z: 258, w: 6.5, h: 19.5, d: 6.8, matIdx: 4, penthouse: true },
      { x: -43.0, z: 266, w: 7.2, h: 16.0, d: 7.2, matIdx: 5, penthouse: false },
      { x: -21.0, z: 206, w: 4.5, h: 14.0, d: 5.2, matIdx: 1, penthouse: false },
      { x: -26.8, z: 218, w: 5.4, h: 19.5, d: 5.8, matIdx: 3, penthouse: true },
      { x: -33.5, z: 230, w: 5.8, h: 22.8, d: 6.0, matIdx: 5, penthouse: true },
      { x: -40.5, z: 244, w: 6.4, h: 18.2, d: 6.4, matIdx: 0, penthouse: false },
    ];

    const rightSkyline: Array<{ x: number; z: number; w: number; h: number; d: number; matIdx: number; penthouse: boolean }> = [
      { x: 26.5, z: 248, w: 4.6, h: 14.5, d: 5.0, matIdx: 2, penthouse: false },
      { x: 32.5, z: 256, w: 5.2, h: 17.0, d: 5.5, matIdx: 4, penthouse: true },
      { x: 39.0, z: 264, w: 5.6, h: 13.5, d: 5.2, matIdx: 0, penthouse: false },
    ];

    const allConfigs = [...leftSkyline, ...rightSkyline];

    for (let i = 0; i < allConfigs.length; i++) {
      const cfg = allConfigs[i];
      const mat = mats[cfg.matIdx % mats.length];
      const bldg = this.createStaticBuilding(cfg.w, cfg.h, cfg.d, mat, cfg.penthouse);
      bldg.position.set(cfg.x, -1.2, cfg.z);

      bldg.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.raycast = () => {};
          child.matrixAutoUpdate = false;
          child.updateMatrix();
        }
      });

      this.horizonRootGroup.add(bldg);
    }
  }

  /**
   * Constrói o Cenário Cinematográfico do Corcovado, Cristo Redentor, Pão de Açúcar e Cordilheira
   * com Fade Out atmosférico na base e iluminação celestial espetacular.
   */
  private buildCorcovadoAndCristoHorizon(): void {
    const mountainGroup = new THREE.Group();
    mountainGroup.name = 'CorcovadoAndCristoHorizon';
    this.horizonRootGroup.add(mountainGroup);

    // Texturas Cinematográficas
    const corcovadoTex = this.registerTex(createCinematicCorcovadoTexture());
    const corcovadoMainMat = this.createTintableMat(0xffffff, corcovadoTex);

    const graniteTex = this.registerTex(createCinematicGraniteTexture());
    const graniteMonolithMat = this.createTintableMat(0xffffff, graniteTex);

    const backdropTex = this.registerTex(createCinematicBackdropTexture());
    const backdropRidgeMat = this.createTintableMat(0xffffff, backdropTex);

    const corcovadoZ = HORIZON_MONUMENT_CONFIG.corcovadoZ; // 250
    const summitY = HORIZON_MONUMENT_CONFIG.corcovadoSummitY; // 33.5
    const peakH = summitY + 1.2; // 34.7m de altura monumental

    // =========================================================================
    // 1. MACIÇO CENTRAL DO CORCOVADO ESCULPIDO COM FADE OUT ATMOSFÉRICO
    // =========================================================================
    const corcovadoPeak = new THREE.Group();
    corcovadoPeak.position.set(0, -1.2, corcovadoZ);
    mountainGroup.add(corcovadoPeak);

    const corcovadoGeo = this.registerGeo(createSculptedCorcovadoGeometry(peakH));
    const mainCorcovadoMesh = new THREE.Mesh(corcovadoGeo, corcovadoMainMat);
    mainCorcovadoMesh.position.y = peakH * 0.5;
    mainCorcovadoMesh.rotation.y = Math.PI * 0.04;
    mainCorcovadoMesh.raycast = () => {};
    corcovadoPeak.add(mainCorcovadoMesh);

    // Mirante e Plataforma Panorâmica de Pedra no Cume do Corcovado
    const terraceGeo = this.registerGeo(new THREE.CylinderGeometry(4.0, 4.4, 1.2, 24));
    const terraceMesh = new THREE.Mesh(terraceGeo, this.trimMat);
    terraceMesh.position.set(0, peakH - 0.35, 0);
    terraceMesh.raycast = () => {};
    corcovadoPeak.add(terraceMesh);

    // =========================================================================
    // 2. MONUMENTO DO CRISTO REDENTOR 3D (Escultura Nobre Art Déco)
    // =========================================================================
    const cristoGroup = this.buildCristoRedentorMonument();
    cristoGroup.position.set(0, summitY, corcovadoZ);
    mountainGroup.add(cristoGroup);

    // =========================================================================
    // 3. PÃO DE AÇÚCAR À DIREITA (Monólito Contínuo com Fade Out)
    // =========================================================================
    const sugarloafHeight = 31.0;
    const sugarloafGeo = this.registerGeo(createSculptedSugarloafGeometry(sugarloafHeight));
    const sugarloafMesh = new THREE.Mesh(sugarloafGeo, graniteMonolithMat);
    sugarloafMesh.position.set(15.5, sugarloafHeight * 0.5 - 1.2, corcovadoZ + 7);
    sugarloafMesh.rotation.y = -0.22;
    sugarloafMesh.raycast = () => {};
    mountainGroup.add(sugarloafMesh);

    // Morro da Urca ao lado do Pão de Açúcar
    const urcaHeight = 23.5;
    const urcaGeo = this.registerGeo(createSculptedSugarloafGeometry(urcaHeight));
    const urcaMesh = new THREE.Mesh(urcaGeo, corcovadoMainMat);
    urcaMesh.position.set(24.5, urcaHeight * 0.5 - 1.2, corcovadoZ + 14);
    urcaMesh.rotation.y = 0.45;
    urcaMesh.raycast = () => {};
    mountainGroup.add(urcaMesh);

    // Cabo aéreo e Bondinho do Pão de Açúcar
    const cableCurve = new THREE.LineCurve3(this.cableStart, this.cableEnd);
    const cableGeo = this.registerGeo(new THREE.TubeGeometry(cableCurve, 12, 0.08, 6, false));
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x64748b, fog: false });
    this.sharedMaterials.push(cableMat);
    const cableMesh = new THREE.Mesh(cableGeo, cableMat);
    cableMesh.raycast = () => {};
    mountainGroup.add(cableMesh);

    this.cableCarGroup = new THREE.Group();
    const hangerMesh = new THREE.Mesh(this.unitBoxGeo, cableMat);
    hangerMesh.scale.set(0.10, 0.75, 0.10);
    hangerMesh.position.y = -0.38;
    this.cableCarGroup.add(hangerMesh);

    const cabinMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, fog: false });
    this.sharedMaterials.push(cabinMat);
    const cabinMesh = new THREE.Mesh(this.unitBoxGeo, cabinMat);
    cabinMesh.scale.set(0.92, 0.70, 0.62);
    cabinMesh.position.y = -0.85;
    cabinMesh.raycast = () => {};
    this.cableCarGroup.add(cabinMesh);
    this.cableCarGroup.position.copy(this.cableStart);
    mountainGroup.add(this.cableCarGroup);

    // =========================================================================
    // 4. MORRO DOIS IRMÃOS À ESQUERDA (Picos Esculturais Gêmeos)
    // =========================================================================
    const doisIrmaosMaiorH = 32.5;
    const doisIrmaosMaiorGeo = this.registerGeo(createSculptedDoisIrmaosGeometry(doisIrmaosMaiorH, true));
    const doisIrmaosMaior = new THREE.Mesh(doisIrmaosMaiorGeo, graniteMonolithMat);
    doisIrmaosMaior.position.set(-15.0, doisIrmaosMaiorH * 0.5 - 1.2, corcovadoZ + 8);
    doisIrmaosMaior.rotation.y = 0.35;
    doisIrmaosMaior.raycast = () => {};
    mountainGroup.add(doisIrmaosMaior);

    const doisIrmaosMenorH = 26.5;
    const doisIrmaosMenorGeo = this.registerGeo(createSculptedDoisIrmaosGeometry(doisIrmaosMenorH, false));
    const doisIrmaosMenor = new THREE.Mesh(doisIrmaosMenorGeo, corcovadoMainMat);
    doisIrmaosMenor.position.set(-24.5, doisIrmaosMenorH * 0.5 - 1.2, corcovadoZ + 15);
    doisIrmaosMenor.rotation.y = 0.18;
    doisIrmaosMenor.raycast = () => {};
    mountainGroup.add(doisIrmaosMenor);

    // =========================================================================
    // 5. CORDILHEIRA DE FUNDO (Backdrop Serra da Carioca em Perspectiva Aérea)
    // =========================================================================
    const backdropGeo = this.registerGeo(createBackdropRidgeGeometry(160, 28));
    const backdropMesh = new THREE.Mesh(backdropGeo, backdropRidgeMat);
    backdropMesh.position.set(0, 11.5, corcovadoZ + 24);
    backdropMesh.raycast = () => {};
    mountainGroup.add(backdropMesh);

    // =========================================================================
    // 6. DISTANCE FADE ATMOSFÉRICO DE VALE (Efeito Fade Out Cinematográfico)
    // =========================================================================
    this.buildAtmosphericDistanceFadeLayers(mountainGroup, corcovadoZ);
    this.buildOrographicMist(mountainGroup, corcovadoZ);
    this.buildScenicHelicopter(mountainGroup);
    this.buildTropicalBirdFlock(mountainGroup, corcovadoZ);

    // Congela matrizes estáticas para alta performance 60 FPS
    mountainGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.raycast = () => {};
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });
  }

  /**
   * Camadas de Névoa de Vale e Distance Fade em Profundidade.
   * Cria o efeito cinematográfico "Fade Out" onde a base dos morros dissolve-se
   * suavemente no horizonte, unindo a cidade e a paisagem em um degradê etéreo.
   */
  private buildAtmosphericDistanceFadeLayers(parent: THREE.Group, corcovadoZ: number): void {
    const mistTex = this.registerTex(createCinematicValleyMistTexture());
    const planeGeo = this.registerGeo(new THREE.PlaneGeometry(1, 1));

    // Camadas amplas de névoa de vale que criam o Fade Out cinematográfico
    const fadeLayers = [
      { z: corcovadoZ - 20, y: 5.8,  w: 180, h: 14.5, opacity: 0.36, speed: 0.40 },
      { z: corcovadoZ - 6,  y: 7.8,  w: 220, h: 17.5, opacity: 0.44, speed: -0.32 },
      { z: corcovadoZ + 8,  y: 9.8,  w: 260, h: 20.5, opacity: 0.40, speed: 0.26 },
      { z: corcovadoZ + 20, y: 11.8, w: 290, h: 22.5, opacity: 0.32, speed: -0.22 },
    ];

    fadeLayers.forEach((layer, idx) => {
      const mat = new THREE.MeshBasicMaterial({
        map: mistTex,
        color: 0xffffff,
        transparent: true,
        opacity: layer.opacity,
        depthWrite: false,
        fog: false,
      });
      mat.userData = { baseColor: new THREE.Color(0xffffff) };
      this.tintableHorizonMaterials.push(mat);

      const mesh = new THREE.Mesh(planeGeo, mat);
      mesh.scale.set(layer.w, layer.h, 1);
      mesh.position.set(0, layer.y, layer.z);
      mesh.raycast = () => {};
      parent.add(mesh);

      this.mistLayers.push({
        mesh,
        baseX: 0,
        speed: layer.speed,
        phase: idx * 1.6,
      });
    });
  }

  /**
   * Constrói a escultura 3D nobre do Cristo Redentor + Pedestal Art Déco + Iluminação Celestial
   */
  private buildCristoRedentorMonument(): THREE.Group {
    const monument = new THREE.Group();
    monument.name = 'CristoRedentor3D';

    const soapstoneTex = this.registerTex(createSoapstoneRobeTexture());
    const statueMat = this.createTintableMat(0xf8fafc, soapstoneTex);
    const statueBrightMat = this.createTintableMat(0xffffff);
    const statueShadeMat = this.createTintableMat(0xdbeafe);
    const pedestalBaseMat = this.createTintableMat(0x94a3b8);
    const pedestalMidMat = this.createTintableMat(0xcbd5e1);
    const pedestalTrimMat = this.createTintableMat(0xf1f5f9);

    // -------------------------------------------------------------------------
    // A. Halo Celestial e Raios Solares Crepusculares (God Rays) atrás do Cristo
    // -------------------------------------------------------------------------
    const haloTex = this.registerTex(
      createSoftRadialGlowTexture('rgba(255, 250, 220, 0.65)', 'rgba(254, 240, 138, 0.22)')
    );
    const haloMat = new THREE.SpriteMaterial({
      map: haloTex,
      color: 0xfef08a,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.monumentHaloSprite = new THREE.Sprite(haloMat);
    this.monumentHaloSprite.scale.set(16, 16, 1);
    this.monumentHaloSprite.position.set(0, 11.8, -0.2);
    monument.add(this.monumentHaloSprite);

    // Feixes de Raios Solares Crepusculares (God Rays) radiantes atrás do Cristo
    const godRaysGeo = this.registerGeo(new THREE.PlaneGeometry(42, 42));
    const godRaysTex = this.registerTex(createCinematicGodRaysTexture());
    const godRaysMat = new THREE.MeshBasicMaterial({
      map: godRaysTex,
      color: 0xfef08a,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.godRaysMesh = new THREE.Mesh(godRaysGeo, godRaysMat);
    this.godRaysMesh.position.set(0, 12.2, -0.6); // Diretamente atrás dos braços abertos
    this.godRaysMesh.raycast = () => {};
    monument.add(this.godRaysMesh);

    // -------------------------------------------------------------------------
    // B. Pedestal Octogonal Art Déco Escalonado em Pedra Nobre
    // -------------------------------------------------------------------------
    const pedStep1 = new THREE.Mesh(
      this.registerGeo(new THREE.CylinderGeometry(2.8, 3.3, 1.3, 8)),
      pedestalBaseMat
    );
    pedStep1.position.y = 0.65;
    monument.add(pedStep1);

    const pedStep2 = new THREE.Mesh(
      this.registerGeo(new THREE.CylinderGeometry(2.1, 2.55, 2.1, 8)),
      pedestalMidMat
    );
    pedStep2.position.y = 2.35;
    monument.add(pedStep2);

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const rib = new THREE.Mesh(this.unitBoxGeo, pedestalBaseMat);
      rib.scale.set(0.42, 2.6, 0.42);
      rib.position.set(Math.cos(angle) * 2.05, 2.0, Math.sin(angle) * 2.05);
      rib.rotation.y = -angle;
      monument.add(rib);
    }

    const pedPlinth = new THREE.Mesh(
      this.registerGeo(new THREE.CylinderGeometry(1.8, 2.1, 0.8, 8)),
      pedestalTrimMat
    );
    pedPlinth.position.y = 3.8;
    monument.add(pedPlinth);

    // -------------------------------------------------------------------------
    // C. Escultura Nobre do Cristo Redentor (Y = 4.2 até Y = 16.0)
    // -------------------------------------------------------------------------
    const statueBaseY = 4.2;
    const armY = statueBaseY + 8.4;
    const armSpan = HORIZON_MONUMENT_CONFIG.statueArmSpan;
    const armSpanHalf = armSpan * 0.5;

    // 1. Túnica Inferior (Saia colunar Art Déco)
    const lowerTunicGeo = this.registerGeo(new THREE.CylinderGeometry(1.22, 1.55, 5.0, 12));
    const lowerTunic = new THREE.Mesh(lowerTunicGeo, statueMat);
    lowerTunic.position.y = statueBaseY + 2.5;
    lowerTunic.scale.set(1.0, 1.0, 0.72);
    monument.add(lowerTunic);

    // 2. Torso Superior & Peito
    const upperTorsoGeo = this.registerGeo(new THREE.CylinderGeometry(1.60, 1.22, 4.2, 12));
    const upperTorso = new THREE.Mesh(upperTorsoGeo, statueMat);
    upperTorso.position.y = statueBaseY + 7.1;
    upperTorso.scale.set(1.04, 1.0, 0.74);
    monument.add(upperTorso);

    // 3. Dobras Esculturais Frontais da Túnica em Pedra-Sabão
    const pleatXOffsets = [-0.60, -0.20, 0.20, 0.60];
    for (let i = 0; i < pleatXOffsets.length; i++) {
      const pleat = new THREE.Mesh(this.unitBoxGeo, i % 2 === 0 ? statueBrightMat : statueShadeMat);
      pleat.scale.set(0.16, 8.4, 0.22);
      pleat.position.set(pleatXOffsets[i], statueBaseY + 4.4, -0.90);
      monument.add(pleat);
    }

    // 4. Manto Art Déco Nobre transpassando o ombro esquerdo
    const sashMesh = new THREE.Mesh(this.unitBoxGeo, statueShadeMat);
    sashMesh.scale.set(0.60, 5.0, 0.26);
    sashMesh.position.set(-0.12, statueBaseY + 6.8, -0.95);
    sashMesh.rotation.z = -0.44;
    monument.add(sashMesh);

    // 5. Sagrado Coração de Jesus iluminado em ouro suave no centro do peito
    this.sacredHeartMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false });
    this.sharedMaterials.push(this.sacredHeartMat);
    const heartGeo = this.registerGeo(new THREE.OctahedronGeometry(0.36, 1));
    const sacredHeart = new THREE.Mesh(heartGeo, this.sacredHeartMat);
    sacredHeart.position.set(0, statueBaseY + 7.5, -1.12);
    sacredHeart.scale.set(1.0, 1.25, 0.55);
    monument.add(sacredHeart);

    // 6. Braços Abertos em Cruz com Envergadura Nobre
    const armsBeam = new THREE.Mesh(this.unitBoxGeo, statueBrightMat);
    armsBeam.scale.set(armSpan - 1.2, 0.95, 0.80);
    armsBeam.position.set(0, armY, 0);
    monument.add(armsBeam);

    const sleeveShape = new THREE.Shape();
    sleeveShape.moveTo(1.0, 0.12);
    sleeveShape.lineTo(5.2, 0.12);
    sleeveShape.lineTo(4.9, -0.60);
    sleeveShape.lineTo(1.2, -1.65);
    sleeveShape.closePath();

    const sleeveGeo = this.registerGeo(
      new THREE.ExtrudeGeometry(sleeveShape, { depth: 0.58, bevelEnabled: false })
    );

    const rightSleeve = new THREE.Mesh(sleeveGeo, statueShadeMat);
    rightSleeve.position.set(0, armY - 0.08, -0.29);
    monument.add(rightSleeve);

    const leftSleeve = new THREE.Mesh(sleeveGeo, statueShadeMat);
    leftSleeve.scale.x = -1;
    leftSleeve.position.set(0, armY - 0.08, 0.29);
    monument.add(leftSleeve);

    const handGeo = this.registerGeo(new THREE.BoxGeometry(0.95, 0.52, 0.35));
    const leftHand = new THREE.Mesh(handGeo, statueBrightMat);
    leftHand.position.set(-armSpanHalf + 0.25, armY + 0.04, 0);
    leftHand.rotation.z = 0.06;
    monument.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, statueBrightMat);
    rightHand.position.set(armSpanHalf - 0.25, armY + 0.04, 0);
    rightHand.rotation.z = -0.06;
    monument.add(rightHand);

    // 7. Pescoço, Cabeça Esculpida e Coroa/Nimbo Suave
    const neckMesh = new THREE.Mesh(
      this.registerGeo(new THREE.CylinderGeometry(0.56, 0.70, 0.75, 8)),
      statueShadeMat
    );
    neckMesh.position.set(0, statueBaseY + 9.45, -0.08);
    monument.add(neckMesh);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, statueBaseY + 10.55, -0.16);
    headGroup.rotation.x = 0.18;
    monument.add(headGroup);

    const headGeo = this.registerGeo(new THREE.CylinderGeometry(0.72, 0.62, 1.85, 10));
    const headMesh = new THREE.Mesh(headGeo, statueBrightMat);
    headGroup.add(headMesh);

    const crownDome = new THREE.Mesh(
      this.registerGeo(new THREE.SphereGeometry(0.72, 10, 8)),
      statueBrightMat
    );
    crownDome.position.y = 0.78;
    headGroup.add(crownDome);

    const hairVolume = new THREE.Mesh(this.unitBoxGeo, statueShadeMat);
    hairVolume.scale.set(1.48, 1.85, 0.76);
    hairVolume.position.set(0, -0.06, 0.20);
    headGroup.add(hairVolume);

    const noseBridge = new THREE.Mesh(this.unitBoxGeo, statueShadeMat);
    noseBridge.scale.set(0.20, 0.70, 0.28);
    noseBridge.position.set(0, 0.08, -0.66);
    headGroup.add(noseBridge);

    this.beaconMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false });
    this.sharedMaterials.push(this.beaconMat);
    const beaconMesh = new THREE.Mesh(
      this.registerGeo(new THREE.SphereGeometry(0.20, 8, 8)),
      this.beaconMat
    );
    beaconMesh.position.set(0, 1.60, 0);
    headGroup.add(beaconMesh);

    // -------------------------------------------------------------------------
    // D. Refletores Metálicos Monumentais na Base do Pedestal
    // -------------------------------------------------------------------------
    const spotFixtureGeo = this.registerGeo(new THREE.CylinderGeometry(0.35, 0.45, 0.55, 8));
    const spotFixtureMat = new THREE.MeshBasicMaterial({ color: 0x475569, fog: false });
    this.sharedMaterials.push(spotFixtureMat);

    const spotlightPositions = [-1.6, 1.6];
    for (let i = 0; i < spotlightPositions.length; i++) {
      const fixture = new THREE.Mesh(spotFixtureGeo, spotFixtureMat);
      fixture.position.set(spotlightPositions[i], 0.28, 1.8);
      fixture.rotation.x = -0.35;
      monument.add(fixture);

      const spotGlowMat = new THREE.SpriteMaterial({
        map: haloTex,
        color: 0xfef08a,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        fog: false,
      });
      const spotGlow = new THREE.Sprite(spotGlowMat);
      spotGlow.scale.set(3.2, 3.2, 1);
      spotGlow.position.set(spotlightPositions[i], 0.50, 1.7);
      this.uplightBeamMeshes.push(spotGlow as any);
      monument.add(spotGlow);
    }

    return monument;
  }

  private buildOrographicMist(parent: THREE.Group, corcovadoZ: number): void {
    const mistTex = this.registerTex(
      createSoftRadialGlowTexture('rgba(248, 250, 252, 0.46)', 'rgba(226, 232, 240, 0.16)')
    );
    const mistConfigs = [
      { x: -6.5, y: 23.5, z: corcovadoZ - 4.0, w: 24, h: 6.0, speed: 0.9, phase: 0.0 },
      { x:  6.5, y: 26.5, z: corcovadoZ - 3.5, w: 22, h: 5.5, speed: -0.75, phase: 1.8 },
      { x: -13.0, y: 20.5, z: corcovadoZ + 2.0, w: 26, h: 6.5, speed: 0.55, phase: 4.5 },
      { x:  13.5, y: 21.5, z: corcovadoZ + 1.5, w: 26, h: 6.5, speed: -0.6, phase: 2.4 },
    ];

    const planeGeo = this.registerGeo(new THREE.PlaneGeometry(1, 1));
    for (let i = 0; i < mistConfigs.length; i++) {
      const cfg = mistConfigs[i];
      const mat = new THREE.MeshBasicMaterial({
        map: mistTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
        fog: false,
      });
      this.sharedMaterials.push(mat);
      const mesh = new THREE.Mesh(planeGeo, mat);
      mesh.scale.set(cfg.w, cfg.h, 1);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      parent.add(mesh);
      this.mistLayers.push({ mesh, baseX: cfg.x, speed: cfg.speed, phase: cfg.phase });
    }
  }

  private buildScenicHelicopter(parent: THREE.Group): void {
    const heli = new THREE.Group();
    heli.name = 'ScenicHorizonHelicopter';

    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, fog: false });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd, fog: false });
    const darkMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, fog: false });
    this.heliStrobeMat = new THREE.MeshBasicMaterial({ color: 0xef4444, fog: false });
    this.sharedMaterials.push(bodyMat, glassMat, darkMat, this.heliStrobeMat);

    const cabin = new THREE.Mesh(
      this.registerGeo(new THREE.SphereGeometry(0.75, 10, 8)),
      bodyMat
    );
    cabin.scale.set(0.85, 0.85, 1.55);
    heli.add(cabin);

    const windshield = new THREE.Mesh(
      this.registerGeo(new THREE.SphereGeometry(0.68, 8, 8)),
      glassMat
    );
    windshield.scale.set(0.82, 0.75, 1.1);
    windshield.position.set(0, 0.12, 0.45);
    heli.add(windshield);

    const tailBoom = new THREE.Mesh(this.unitBoxGeo, bodyMat);
    tailBoom.scale.set(0.22, 0.24, 1.85);
    tailBoom.position.set(0, 0.1, -1.45);
    heli.add(tailBoom);

    const tailFin = new THREE.Mesh(this.unitBoxGeo, bodyMat);
    tailFin.scale.set(0.12, 0.72, 0.35);
    tailFin.position.set(0, 0.35, -2.25);
    heli.add(tailFin);

    for (const side of [-0.48, 0.48]) {
      const skid = new THREE.Mesh(this.unitBoxGeo, darkMat);
      skid.scale.set(0.08, 0.08, 1.8);
      skid.position.set(side, -0.68, 0.1);
      heli.add(skid);
    }

    this.mainRotorMesh = new THREE.Mesh(this.unitBoxGeo, darkMat);
    this.mainRotorMesh.scale.set(3.4, 0.05, 0.22);
    this.mainRotorMesh.position.set(0, 0.78, 0);
    heli.add(this.mainRotorMesh);

    this.tailRotorMesh = new THREE.Mesh(this.unitBoxGeo, darkMat);
    this.tailRotorMesh.scale.set(0.06, 0.75, 0.12);
    this.tailRotorMesh.position.set(0.15, 0.35, -2.28);
    heli.add(this.tailRotorMesh);

    const strobe = new THREE.Mesh(
      this.registerGeo(new THREE.SphereGeometry(0.22, 6, 6)),
      this.heliStrobeMat
    );
    strobe.position.set(0, -0.65, 0);
    heli.add(strobe);

    heli.scale.set(1.15, 1.15, 1.15);
    this.helicopterGroup = heli;
    parent.add(heli);
  }

  private buildTropicalBirdFlock(parent: THREE.Group, corcovadoZ: number): void {
    this.birdFlockGroup = new THREE.Group();
    this.birdFlockGroup.name = 'CorcovadoBirds';
    parent.add(this.birdFlockGroup);

    const birdMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.sharedMaterials.push(birdMat);

    const wingGeo = this.registerGeo(new THREE.BoxGeometry(0.62, 0.06, 0.24));

    for (let i = 0; i < 7; i++) {
      const bGroup = new THREE.Group();
      const leftWing = new THREE.Mesh(wingGeo, birdMat);
      leftWing.position.x = -0.30;
      const rightWing = new THREE.Mesh(wingGeo, birdMat);
      rightWing.position.x = 0.30;
      bGroup.add(leftWing, rightWing);

      const baseY = 39.5 + (i % 4) * 2.6;
      const radius = 9.0 + (i % 3) * 3.5;
      const phase = (i / 7) * Math.PI * 2;
      const speed = 0.48 + (i % 3) * 0.08;

      bGroup.position.set(Math.cos(phase) * radius, baseY, corcovadoZ - 3.5 + Math.sin(phase) * 4.0);
      this.birdFlockGroup.add(bGroup);
      this.birdMeshes.push({ group: bGroup, leftWing, rightWing, phase, radius, speed, baseY });
    }
  }

  public update(
    dt: number,
    _forwardSpeed: number,
    _totalDistance: number,
    _playerX: number = 0,
    _turnDir: number = 0,
    camPos?: THREE.Vector3
  ): void {
    if (this.isDisposed) return;

    this.elapsedSec += Math.max(0, Math.min(0.1, dt || 0.016));

    this.horizonRootGroup.position.x = 0;
    this.horizonRootGroup.position.y = 0;
    this.horizonRootGroup.position.z = camPos ? camPos.z : 0;

    const visual = computeHorizonVisualState(this.currentTimeProgress, this.elapsedSec);

    // Atualiza Halo e God Rays celestiais atrás do Cristo
    if (this.monumentHaloSprite) {
      (this.monumentHaloSprite.material as THREE.SpriteMaterial).opacity = visual.monumentGlowOpacity;
      const s = 14.0 + Math.sin(this.elapsedSec * 1.5) * 1.2;
      this.monumentHaloSprite.scale.set(s, s, 1);
    }

    if (this.godRaysMesh) {
      (this.godRaysMesh.material as THREE.MeshBasicMaterial).opacity = visual.godRaysOpacity;
      this.godRaysMesh.rotation.z = visual.godRaysAngle;
    }

    for (let i = 0; i < this.uplightBeamMeshes.length; i++) {
      const beam = this.uplightBeamMeshes[i];
      if (beam && beam.material) {
        (beam.material as any).opacity = visual.uplightOpacity;
      }
    }

    if (this.beaconMat) {
      const blink = Math.sin(this.elapsedSec * 4.5) > 0.15;
      this.beaconMat.color.setHex(blink ? 0xef4444 : 0xfef08a);
    }

    // Movimento suave de derivação da névoa de vale cinematográfica
    for (let i = 0; i < this.mistLayers.length; i++) {
      const m = this.mistLayers[i];
      m.mesh.position.x = m.baseX + Math.sin(this.elapsedSec * 0.25 * m.speed + m.phase) * 5.5;
    }

    if (this.helicopterGroup) {
      this.helicopterGroup.position.set(
        visual.helicopterPos.x,
        visual.helicopterPos.y,
        visual.helicopterPos.z
      );
      this.helicopterGroup.rotation.y = visual.helicopterPos.yaw;
      this.helicopterGroup.rotation.z = 0.08;
    }
    if (this.mainRotorMesh) {
      this.mainRotorMesh.rotation.y += 28.0 * (dt || 0.016);
    }
    if (this.tailRotorMesh) {
      this.tailRotorMesh.rotation.x += 32.0 * (dt || 0.016);
    }
    if (this.heliStrobeMat) {
      const strobeOn = Math.sin(this.elapsedSec * 9.0) > 0.4;
      this.heliStrobeMat.color.setHex(strobeOn ? 0xffffff : 0xef4444);
    }

    const corcovadoZ = HORIZON_MONUMENT_CONFIG.corcovadoZ;
    for (let i = 0; i < this.birdMeshes.length; i++) {
      const b = this.birdMeshes[i];
      const angle = this.elapsedSec * b.speed + b.phase;
      b.group.position.x = Math.cos(angle) * b.radius;
      b.group.position.z = corcovadoZ - 3.5 + Math.sin(angle) * 4.0;
      b.group.position.y = b.baseY + Math.sin(this.elapsedSec * 2.2 + b.phase) * 0.7;
      b.group.rotation.y = -angle + Math.PI * 0.5;

      const flap = Math.sin(this.elapsedSec * 11.0 + b.phase * 3.0) * 0.48;
      b.leftWing.rotation.z = flap;
      b.rightWing.rotation.z = -flap;
    }

    if (this.cableCarGroup) {
      this.cableCarGroup.position.lerpVectors(
        this.cableStart,
        this.cableEnd,
        visual.cableCarProgress
      );
    }
  }

  private _scratchCol = new THREE.Color(0xffffff);
  private _scratchMonumentCol = new THREE.Color(0xffffff);
  private _colDay = new THREE.Color(0xffffff);
  private _colSunset = new THREE.Color(0xfed7aa);
  private _colDusk = new THREE.Color(0x94a3b8);
  private _colNight = new THREE.Color(0x64748b);
  private _colDawn = new THREE.Color(0xf1f5f9);
  private _colMonumentNight = new THREE.Color(0xdbeafe);

  public setTimeOfDay(progress: number): void {
    if (this.isDisposed || this.sharedMaterials.length === 0) return;
    this.currentTimeProgress = progress;

    if (progress < 0.35) {
      this._scratchCol.copy(this._colDay);
      this._scratchMonumentCol.copy(this._colDay);
    } else if (progress < 0.56) {
      const t = (progress - 0.35) / 0.21;
      this._scratchCol.lerpColors(this._colDay, this._colSunset, t);
      this._scratchMonumentCol.lerpColors(this._colDay, this._colSunset, t * 0.75);
    } else if (progress < 0.68) {
      const t = (progress - 0.56) / 0.12;
      this._scratchCol.lerpColors(this._colSunset, this._colDusk, t);
      this._scratchMonumentCol.lerpColors(this._colSunset, this._colMonumentNight, t);
    } else if (progress < 0.88) {
      this._scratchCol.copy(this._colNight);
      this._scratchMonumentCol.copy(this._colMonumentNight);
    } else {
      const t = (progress - 0.88) / 0.12;
      this._scratchCol.lerpColors(this._colNight, this._colDawn, t);
      this._scratchMonumentCol.lerpColors(this._colMonumentNight, this._colDawn, t);
    }

    for (let i = 0; i < this.sharedMaterials.length; i++) {
      const m = this.sharedMaterials[i];
      const baseCol = m.userData?.baseColor as THREE.Color | undefined;
      if (baseCol) {
        m.color.copy(baseCol).multiply(this._scratchCol);
      }
    }

    for (let i = 0; i < this.tintableHorizonMaterials.length; i++) {
      const m = this.tintableHorizonMaterials[i];
      const baseCol = m.userData?.baseColor as THREE.Color | undefined;
      if (baseCol) {
        const isStatueBright = baseCol.r > 0.85 && baseCol.g > 0.85 && baseCol.b > 0.85 && !m.map;
        m.color.copy(baseCol).multiply(isStatueBright ? this._scratchMonumentCol : this._scratchCol);
      }
    }
  }

  public dispose(): void {
    this.isDisposed = true;
    try {
      this.scene.remove(this.horizonRootGroup);
      this.sharedGeometries.forEach((g) => g.dispose());
      this.sharedMaterials.forEach((m) => m.dispose());
      this.tintableHorizonMaterials.forEach((m) => m.dispose());
      this.sharedTextures.forEach((t) => t.dispose());
      this.trimMat.dispose();
      this.roofConcreteMat.dispose();
      this.sharedGeometries = [];
      this.sharedMaterials = [];
      this.tintableHorizonMaterials = [];
      this.sharedTextures = [];
    } catch (e) {
      console.warn('[ParallaxSystem] Erro ao descarregar:', e);
    }
  }
}
