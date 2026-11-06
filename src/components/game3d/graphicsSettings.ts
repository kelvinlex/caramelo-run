export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra';
export type RenderDistance = 'low' | 'medium' | 'high';
export type FpsLimit = 30 | 60 | 90 | 120 | 0; // 0 = sem limite
export type ResolutionScale = 0.5 | 0.65 | 0.75 | 0.85 | 1.0 | 1.25;
export type ShadowQuality = 'off' | 'basic' | 'soft';
export type ParticleQuality = 'low' | 'medium' | 'high';
export type PS2FogMode = 'retro_ps2' | 'smooth_cinematic' | 'off';
export type DitherPixelSize = 1 | 2 | 3; // 1 = Fino, 2 = PS2 Padrão, 3 = Pixel Art Retrô

export interface GraphicsSettings {
  preset: GraphicsPreset;
  renderDistance: RenderDistance;
  fpsLimit: FpsLimit;
  resolutionScale: ResolutionScale;
  bloomEnabled: boolean;
  bloomIntensity: number;
  shadows: ShadowQuality;
  particles: ParticleQuality;
  antialias: boolean;
  ps2FogMode: PS2FogMode;
  ditherPixelSize: DitherPixelSize;
  atmosphericPerspective: boolean;
}

export const DEFAULT_GRAPHICS_SETTINGS: GraphicsSettings = {
  preset: 'low',
  renderDistance: 'low',
  fpsLimit: 60,
  resolutionScale: 0.85,
  bloomEnabled: false,
  bloomIntensity: 0.10,
  shadows: 'off',
  particles: 'low',
  antialias: false,
  ps2FogMode: 'smooth_cinematic',
  ditherPixelSize: 1,
  atmosphericPerspective: true,
};

export const PRESET_CONFIGS: Record<GraphicsPreset, Partial<GraphicsSettings>> = {
  low: {
    preset: 'low',
    renderDistance: 'low',
    resolutionScale: 0.85,
    bloomEnabled: false,
    shadows: 'off',
    particles: 'low',
    antialias: false,
    ps2FogMode: 'smooth_cinematic',
    ditherPixelSize: 1,
    atmosphericPerspective: true,
  },
  medium: {
    preset: 'medium',
    renderDistance: 'medium',
    resolutionScale: 1.0,
    bloomEnabled: false,
    shadows: 'off',
    particles: 'medium',
    antialias: false,
    ps2FogMode: 'smooth_cinematic',
    ditherPixelSize: 1,
    atmosphericPerspective: true,
  },
  high: {
    preset: 'high',
    renderDistance: 'high',
    resolutionScale: 1.0,
    bloomEnabled: true,
    bloomIntensity: 0.18,
    shadows: 'basic',
    particles: 'high',
    antialias: true,
    ps2FogMode: 'smooth_cinematic',
    ditherPixelSize: 2,
    atmosphericPerspective: true,
  },
  ultra: {
    preset: 'ultra',
    renderDistance: 'high',
    resolutionScale: 1.0,
    bloomEnabled: true,
    bloomIntensity: 0.16,
    shadows: 'soft',
    particles: 'high',
    antialias: true,
    ps2FogMode: 'smooth_cinematic',
    ditherPixelSize: 2,
    atmosphericPerspective: true,
  },
};

const GRAPHICS_STORAGE_KEY = 'caramelorun_graphics_settings';

export function loadGraphicsSettings(): GraphicsSettings {
  try {
    const saved = localStorage.getItem(GRAPHICS_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_GRAPHICS_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {}
  return { ...DEFAULT_GRAPHICS_SETTINGS };
}

export function saveGraphicsSettings(settings: GraphicsSettings): void {
  try {
    localStorage.setItem(GRAPHICS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function getMaxVisibleDistance(dist: RenderDistance): number {
  switch (dist) {
    case 'low': return 115;
    case 'medium': return 160;
    case 'high': return 220;
  }
}

export function getFarPlaneByDistance(dist: RenderDistance): number {
  switch (dist) {
    case 'low': return 260;
    case 'medium': return 350;
    case 'high': return 500;
  }
}

export function getFogDensityByDistance(dist: RenderDistance): number {
  switch (dist) {
    case 'low': return 0.0050; // Suave fade no horizonte a 115-130m
    case 'medium': return 0.0035; // Suave fade no horizonte a 165-180m
    case 'high': return 0.0022;
  }
}

export function getDistanceScale(dist: RenderDistance): number {
  switch (dist) {
    case 'low': return 0.75;
    case 'medium': return 1.0;
    case 'high': return 1.25;
  }
}
