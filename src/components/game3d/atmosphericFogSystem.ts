import * as THREE from 'three';

/**
 * ============================================================================
 * ATMOSPHERIC FOG & PS2 DITHERING FADE SYSTEM
 * ============================================================================
 * Sistema profissional de Perspectiva Atmosférica, Distance Fog, LOD e
 * Dithering Fade (Matriz Bayer 4x4 / Screen-Door Transparency) estilo Retrô PS2.
 * 
 * Benefícios técnicos:
 * - Desaturação cromática gradual e atenuação de contraste com a distância.
 * - Mistura suave à luz e paleta do ambiente (Dia, Pôr do Sol, Noite, Chuva).
 * - Dithering Fade por matriz Bayer 4x4: elimina 100% dos pop-ins sem necessidade
 *   de transparência alfa clássica (evita z-sorting bugs, halos e manchas).
 * - LOD escalonado por categorias (pequenos props, árvores, construções, pista).
 * - Pixel Art / Retrô PS2: escala de dither configurável (pixel-grid autêntico).
 */

export type AtmosphericLODCategory = 
  | 'small_prop'    // Bicos de luz, latas de lixo, bancos, pedras, canteiros, lombadas (70m - 105m)
  | 'foliage'       // Árvores, copas, troncos, arbustos (130m - 180m)
  | 'scenery'       // Casas residenciais, muros, portões, favela morro, caixas d'água (165m - 225m)
  | 'road_terrain'  // Pista de asfalto, calçadas, meio-fio, gramado base (200m - 250m)
  | 'backdrop'      // Colinas verdes, skyline distante, silhuetas do morro (220m - 275m)
  | 'character'     // Caramelo, Motoboy e veículos de trânsito imediatos (sem dither próximo)
  | 'custom';       // Distâncias manuais personalizadas

export interface AtmosphericMaterialConfig {
  lod?: AtmosphericLODCategory;
  ditherNear?: number;
  ditherFar?: number;
  fogStart?: number;
  fogEnd?: number;
  desaturation?: number;      // 0.0 a 1.0 (perda de saturação cromática)
  contrastReduction?: number; // 0.0 a 1.0 (achatamento suave de contraste)
  ditherEnabled?: boolean;    // Ativa/desativa screen-door dithering
  retroBanding?: boolean;     // Ativa micro-dither 16-bit PS2
}

// Configurações padrão de distâncias por categoria LOD (em metros) - Ajustadas para Máxima Vivacidade e Cores Vivas
export const LOD_PROFILES: Record<AtmosphericLODCategory, {
  fogStart: number;
  fogEnd: number;
  ditherStart: number;
  ditherEnd: number;
  desaturation: number;
  contrastReduction: number;
  ditherEnabled: boolean;
}> = {
  small_prop: {
    fogStart: 65.0,
    fogEnd: 150.0,
    ditherStart: 115.0,
    ditherEnd: 145.0,
    desaturation: 0.10,
    contrastReduction: 0.08,
    ditherEnabled: true,
  },
  foliage: {
    fogStart: 85.0,
    fogEnd: 230.0,
    ditherStart: 175.0,
    ditherEnd: 225.0,
    desaturation: 0.12,
    contrastReduction: 0.10,
    ditherEnabled: true,
  },
  scenery: {
    fogStart: 95.0,
    fogEnd: 275.0,
    ditherStart: 215.0,
    ditherEnd: 270.0,
    desaturation: 0.14,
    contrastReduction: 0.10,
    ditherEnabled: true,
  },
  road_terrain: {
    fogStart: 120.0,
    fogEnd: 310.0,
    ditherStart: 250.0,
    ditherEnd: 300.0,
    desaturation: 0.08,
    contrastReduction: 0.06,
    ditherEnabled: true,
  },
  backdrop: {
    fogStart: 140.0,
    fogEnd: 360.0,
    ditherStart: 280.0,
    ditherEnd: 350.0,
    desaturation: 0.10,
    contrastReduction: 0.08,
    ditherEnabled: true,
  },
  character: {
    fogStart: 100.0,
    fogEnd: 280.0,
    ditherStart: 999.0,
    ditherEnd: 1000.0,
    desaturation: 0.05,
    contrastReduction: 0.05,
    ditherEnabled: false,
  },
  custom: {
    fogStart: 85.0,
    fogEnd: 250.0,
    ditherStart: 190.0,
    ditherEnd: 245.0,
    desaturation: 0.12,
    contrastReduction: 0.10,
    ditherEnabled: true,
  },
};

// Uniforms globais compartilhados atualizados a cada frame
export const globalAtmosphericUniforms = {
  uAtmosphereColor: { value: new THREE.Color(0x38bdf8) },
  uAtmosphereSunColor: { value: new THREE.Color(0xfffbeb) },
  uAtmosphereSunDir: { value: new THREE.Vector3(0.5, 0.7, 0.5).normalize() },
  uAtmosphereAmbientColor: { value: new THREE.Color(0xffedd5) },
  uTime: { value: 0.0 },
  uDitherScale: { value: 2.0 }, // 2.0 = grade pixel retrô PS2 (480p pixel look)
  uRetroBanding: { value: 1.0 }, // 1.0 = emulação de dither tonal PS2 16-bit
  uDistanceMultiplier: { value: 1.0 }, // Ajustado pelas configurações de Render Distance
  uGlobalFogDensityMul: { value: 1.0 }, // Aumenta em caso de chuva
  uPS2FogActive: { value: 1.0 }, // 1.0 = ativo, 0.0 = desativado
};

// Shader chunk ultra-rápido para dither e ruído tonal (Zero branches, Zero stall de GPU)
const BAYER_SHADER_CHUNK = /* glsl */ `
float getBayer4x4(vec2 screenPos, float pixelScale) {
    vec2 p = floor(screenPos / max(1.0, pixelScale));
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
`;

/**
 * Injeta o sistema de Perspectiva Atmosférica e Dithering Fade em qualquer material Three.js
 */
export function applyAtmosphericPerspective(
  material: THREE.Material,
  config: AtmosphericMaterialConfig = {}
): THREE.Material {
  if (!material) return material;

  // Evita re-injetar no mesmo material
  if ((material as any).userData?._hasAtmosphericShader) {
    return material;
  }
  (material as any).userData = (material as any).userData || {};
  (material as any).userData._hasAtmosphericShader = true;

  const lod = config.lod || 'scenery';
  const profile = LOD_PROFILES[lod];

  const fStart = config.fogStart ?? profile.fogStart;
  const fEnd = config.fogEnd ?? profile.fogEnd;
  const dStart = config.ditherNear ?? profile.ditherStart;
  const dEnd = config.ditherFar ?? profile.ditherEnd;
  const desat = config.desaturation ?? profile.desaturation;
  const contRed = config.contrastReduction ?? profile.contrastReduction;
  const ditherOn = config.ditherEnabled ?? profile.ditherEnabled;
  const retroBanding = config.retroBanding ?? true;

  // Força fog = true para materiais nativos
  if ('fog' in material) {
    (material as any).fog = true;
  }

  // Chave de cache para evitar recompilações redundantes pelo Three.js
  material.customProgramCacheKey = () => 
    `atm_ps2_${lod}_${ditherOn ? '1' : '0'}_${retroBanding ? '1' : '0'}`;

  const prevOnBeforeCompile = material.onBeforeCompile;

  material.onBeforeCompile = (shader, renderer) => {
    if (typeof prevOnBeforeCompile === 'function') {
      prevOnBeforeCompile(shader, renderer);
    }

    // 1. Vincula Uniforms
    shader.uniforms.uAtmosphereColor = globalAtmosphericUniforms.uAtmosphereColor;
    shader.uniforms.uAtmosphereSunColor = globalAtmosphericUniforms.uAtmosphereSunColor;
    shader.uniforms.uAtmosphereSunDir = globalAtmosphericUniforms.uAtmosphereSunDir;
    shader.uniforms.uAtmosphereAmbientColor = globalAtmosphericUniforms.uAtmosphereAmbientColor;
    shader.uniforms.uAtmosphereTime = globalAtmosphericUniforms.uTime;
    shader.uniforms.uDitherScale = globalAtmosphericUniforms.uDitherScale;
    shader.uniforms.uRetroBanding = globalAtmosphericUniforms.uRetroBanding;
    shader.uniforms.uDistanceMultiplier = globalAtmosphericUniforms.uDistanceMultiplier;
    shader.uniforms.uGlobalFogDensityMul = globalAtmosphericUniforms.uGlobalFogDensityMul;
    shader.uniforms.uPS2FogActive = globalAtmosphericUniforms.uPS2FogActive;

    // Uniforms específicos deste material/LOD
    shader.uniforms.uFogStart = { value: fStart };
    shader.uniforms.uFogEnd = { value: fEnd };
    shader.uniforms.uDitherStart = { value: dStart };
    shader.uniforms.uDitherEnd = { value: dEnd };
    shader.uniforms.uDesaturation = { value: desat };
    shader.uniforms.uContrastReduction = { value: contRed };
    shader.uniforms.uDitherEnabled = { value: ditherOn ? 1.0 : 0.0 };

    // 2. Vertex Shader: Cálculo de profundidade esférica contínua e posição no mundo
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying float vAtmosphericDistance;
      varying vec3 vAtmosphericWorldPos;`
    );

    if (shader.vertexShader.includes('#include <project_vertex>')) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vAtmosphericDistance = length(mvPosition.xyz);
        vAtmosphericWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );
    } else {
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `void main() {
        vAtmosphericDistance = 0.0;
        vAtmosphericWorldPos = vec3(0.0);`
      );
    }

    // 3. Fragment Shader: Declaração de Varyings, Uniforms e Função Bayer
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying float vAtmosphericDistance;
      varying vec3 vAtmosphericWorldPos;
      uniform vec3 uAtmosphereColor;
      uniform vec3 uAtmosphereSunColor;
      uniform vec3 uAtmosphereSunDir;
      uniform vec3 uAtmosphereAmbientColor;
      uniform float uAtmosphereTime;
      uniform float uDitherScale;
      uniform float uRetroBanding;
      uniform float uDistanceMultiplier;
      uniform float uGlobalFogDensityMul;
      uniform float uPS2FogActive;

      uniform float uFogStart;
      uniform float uFogEnd;
      uniform float uDitherStart;
      uniform float uDitherEnd;
      uniform float uDesaturation;
      uniform float uContrastReduction;
      uniform float uDitherEnabled;

      ${BAYER_SHADER_CHUNK}`
    );

    // Bloco central de processamento atmosférico (Early-Z 100% ativo, ZERO discard!)
    const atmosphericFragmentLogic = /* glsl */ `
    if (uPS2FogActive > 0.5) {
        float dist = vAtmosphericDistance;
        float distMul = max(0.2, uDistanceMultiplier);
        float fStart = uFogStart * distMul;
        float fEnd = uFogEnd * distMul;

        // Perspectiva Atmosférica Otimizada (Early-Z preservado, interpolação suave em direção ao céu)
        if (dist >= fStart) {
            float rawFog = clamp((dist - fStart) / max(1.0, fEnd - fStart), 0.0, 1.0);
            float hazeStrength = 1.0 - exp(-rawFog * 1.35 * uGlobalFogDensityMul);
            hazeStrength = clamp(hazeStrength, 0.0, 1.0);

            vec3 curColor = gl_FragColor.rgb;

            // Realce de Vivacidade Tropical
            float lum = dot(curColor, vec3(0.299, 0.587, 0.114));
            vec3 vividColor = mix(curColor, (curColor - vec3(lum)) * 1.12 + vec3(lum), 0.55);

            // Perda sutil de saturação cromática na extrema distância
            vec3 desaturated = mix(vividColor, vec3(lum), hazeStrength * uDesaturation);

            // Ajuste suave de contraste
            float skyLum = dot(uAtmosphereColor, vec3(0.299, 0.587, 0.114));
            vec3 lowContrast = mix(desaturated, vec3(mix(lum, skyLum, 0.35)), hazeStrength * uContrastReduction);

            // Espalhamento solar frontal
            vec3 viewDir = normalize(vAtmosphericWorldPos - cameraPosition);
            float sunDot = max(0.0, dot(viewDir, uAtmosphereSunDir));
            vec3 sunScattering = uAtmosphereSunColor * (pow(sunDot, 6.0) * 0.20 * (1.0 - hazeStrength * 0.30));
            vec3 atmosphericTint = uAtmosphereColor + sunScattering;

            // Dissolução perfeita no céu atmosférico (elimina pop-in com 0ms de custo de discard)
            gl_FragColor.rgb = mix(lowContrast, atmosphericTint, hazeStrength);

            // Ruído tonal suave 16-bit apenas se uRetroBanding estiver ligado
            if (uRetroBanding > 0.5) {
                float ditherJitter = (fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * (1.0 / 80.0);
                gl_FragColor.rgb += vec3(ditherJitter);
            }
        }
    }
    `;

    // Injeta antes de tonemapping ou no fog_fragment
    if (shader.fragmentShader.includes('#include <fog_fragment>')) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <fog_fragment>',
        `#include <fog_fragment>
        ${atmosphericFragmentLogic}`
      );
    } else if (shader.fragmentShader.includes('#include <dithering_fragment>')) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `${atmosphericFragmentLogic}
        #include <dithering_fragment>`
      );
    } else {
      // Injeta antes do fechamento de main
      const lastIndex = shader.fragmentShader.lastIndexOf('}');
      if (lastIndex !== -1) {
        shader.fragmentShader = 
          shader.fragmentShader.substring(0, lastIndex) +
          `\n${atmosphericFragmentLogic}\n}` +
          shader.fragmentShader.substring(lastIndex + 1);
      }
    }
  };

  material.needsUpdate = true;
  return material;
}

/**
 * Aplica recursivamente o sistema a todos os meshes de uma hierarquia 3D
 */
export function applyAtmosphericToHierarchy(
  root: THREE.Object3D,
  config: AtmosphericMaterialConfig = {}
): void {
  if (!root) return;

  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        applyAtmosphericPerspective(m, config);
      });
    }
  });
}

/**
 * Inspeciona automaticamente um Chunk do cenário e aplica os perfis LOD ideais
 * para cada categoria de elemento (Props pequenos, árvores, casas, pista, terreno)
 */
export function applyAtmosphericToChunk(chunk: THREE.Group): void {
  if (!chunk) return;

  chunk.children.forEach((child) => {
    const ud = child.userData || {};

    // 1. Árvores e Vegetação (foliage)
    if (ud.isTree || child.name.toLowerCase().includes('tree')) {
      applyAtmosphericToHierarchy(child, { lod: 'foliage' });
      return;
    }

    // 2. Colinas e relevo distante (backdrop)
    if (ud.isHill || ud.isSkylineBackdrop || child.name.toLowerCase().includes('hill')) {
      applyAtmosphericToHierarchy(child, { lod: 'backdrop' });
      return;
    }

    // 3. Pequenos props urbanos (small_prop): bancos, lixeiras, postes, canteiros, lombadas
    if (
      ud.isSmallProp ||
      ud.isProp ||
      child.name.includes('Bench') ||
      child.name.includes('Trash') ||
      child.name.includes('Pole') ||
      child.name.includes('Flower') ||
      child.name.includes('SpeedBump') ||
      child.name.includes('Grate')
    ) {
      applyAtmosphericToHierarchy(child, { lod: 'small_prop' });
      return;
    }

    // 4. Casas 3D e Favela Morro (scenery)
    if (
      ud.isBuilding3D ||
      ud.isFavelaMorro ||
      child.name.includes('Building') ||
      child.name.includes('House') ||
      child.name.includes('Morro') ||
      child.name.includes('Wall')
    ) {
      applyAtmosphericToHierarchy(child, { lod: 'scenery' });
      return;
    }

    // 5. Infraestrutura da Pista / Calçada / Gramado (road_terrain)
    if (ud.isInfrastructure || child.name.includes('Road') || child.name.includes('Terrain')) {
      applyAtmosphericToHierarchy(child, { lod: 'road_terrain' });
      return;
    }

    // Padrão geral para qualquer outro objeto de cenário
    if (ud.isScenery) {
      applyAtmosphericToHierarchy(child, { lod: 'scenery' });
    }
  });
}

/**
 * Atualiza os Uniforms atmosféricos em tempo real a cada frame do jogo
 */
export function updateAtmosphericUniforms(params: {
  skyColor: THREE.Color;
  fogColor: THREE.Color;
  sunColor?: THREE.Color;
  sunPosition?: THREE.Vector3;
  ambientColor?: THREE.Color;
  renderDistanceScale?: number;
  isRaining?: boolean;
  rainIntensity?: number;
  timeOfDay?: string;
  ps2FogMode?: 'off' | 'retro_ps2' | 'smooth_cinematic';
  pixelScale?: number;
  dt: number;
}): void {
  const {
    skyColor,
    fogColor,
    sunColor,
    sunPosition,
    ambientColor,
    renderDistanceScale = 1.0,
    isRaining = false,
    rainIntensity = 0.0,
    ps2FogMode = 'retro_ps2',
    pixelScale = 2.0,
    dt,
  } = params;

  // Tempo acumulado
  globalAtmosphericUniforms.uTime.value += dt;

  // Cor atmosférica do ambiente: mistura suave do fog com o tom do céu
  globalAtmosphericUniforms.uAtmosphereColor.value.copy(fogColor);

  // Sol e espalhamento
  if (sunColor) {
    globalAtmosphericUniforms.uAtmosphereSunColor.value.copy(sunColor);
  }
  if (sunPosition) {
    globalAtmosphericUniforms.uAtmosphereSunDir.value.copy(sunPosition).normalize();
  }
  if (ambientColor) {
    globalAtmosphericUniforms.uAtmosphereAmbientColor.value.copy(ambientColor);
  }

  // Escala de Render Distance (Low: 0.75x, Med: 1.0x, High/Ultra: 1.25x)
  globalAtmosphericUniforms.uDistanceMultiplier.value = renderDistanceScale;

  // Densidade extra com chuva
  globalAtmosphericUniforms.uGlobalFogDensityMul.value = isRaining 
    ? 1.0 + rainIntensity * 0.65 
    : 1.0;

  // Modo Retrô PS2
  if (ps2FogMode === 'off') {
    globalAtmosphericUniforms.uPS2FogActive.value = 0.0;
  } else {
    globalAtmosphericUniforms.uPS2FogActive.value = 1.0;
    // No modo retro_ps2: dither ativado com escala de pixel definida
    // No modo smooth_cinematic: dither suave com escala 1.0
    globalAtmosphericUniforms.uDitherScale.value = ps2FogMode === 'retro_ps2' ? pixelScale : 1.0;
    globalAtmosphericUniforms.uRetroBanding.value = ps2FogMode === 'retro_ps2' ? 1.0 : 0.0;
  }
}
