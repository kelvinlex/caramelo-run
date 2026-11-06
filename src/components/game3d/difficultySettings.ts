export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  id: DifficultyLevel;
  name: string;
  badge: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  // Trânsito e Carros
  maxActiveCars: number;
  trafficSpawnIntervalMin: number;
  trafficSpawnIntervalMax: number;
  // Vidas do Motoboy por Dificuldade (Fácil: 10, Médio: 5, Difícil: 3)
  maxLives: number;
  // Jatos d'água
  waterJetSpacingMin: number; // Distância entre jatos (maior = menos frequente)
  waterJetSpacingMax: number;
  waterJetInitialCount: number;
  // Frequência de obstáculos
  obstacleCooldown: number;
  // Velocidade da gameplay
  baseSpeedMultiplier: number;
  accelerationRate: number;
  initialMotoboySpeed: number;
  initialPlayerSpeed: number;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  easy: {
    id: 'easy',
    name: 'Fácil',
    badge: '🟢 TRANQUILO',
    description: 'Começa devagar e tranquilo, 1 carro por vez na pista e 10 vidas para o Motoboy.',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/50',
    maxActiveCars: 1, // 🚗 Estritamente 1 carro por vez
    trafficSpawnIntervalMin: 6.0,
    trafficSpawnIntervalMax: 8.5,
    maxLives: 10, // ❤️ 10 Vidas
    waterJetSpacingMin: 220,
    waterJetSpacingMax: 300,
    waterJetInitialCount: 1,
    obstacleCooldown: 1.6,
    baseSpeedMultiplier: 0.85,
    accelerationRate: 0.50,
    initialMotoboySpeed: 11.0,
    initialPlayerSpeed: 12.0,
  },
  medium: {
    id: 'medium',
    name: 'Médio',
    badge: '🟡 EQUILIBRADO',
    description: 'Inicia com velocidade calma e acelera gradualmente, 5 vidas e tráfego balanceado.',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
    maxActiveCars: 2, // 🚗 Reduzido de 4 para 2 carros para não travar a pista no Médio
    trafficSpawnIntervalMin: 4.2,
    trafficSpawnIntervalMax: 6.0,
    maxLives: 5, // ❤️ 5 Vidas
    waterJetSpacingMin: 180, // Bueiros com jatos mais espaçados
    waterJetSpacingMax: 240,
    waterJetInitialCount: 1,
    obstacleCooldown: 1.4,
    baseSpeedMultiplier: 0.90,
    accelerationRate: 0.75,
    initialMotoboySpeed: 11.5,
    initialPlayerSpeed: 12.5,
  },
  hard: {
    id: 'hard',
    name: 'Difícil',
    badge: '🔴 INSANO',
    description: 'Começa com ritmo controlado para se posicionar e logo acelera em alta velocidade com tráfego intenso!',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    maxActiveCars: 5,
    trafficSpawnIntervalMin: 1.8,
    trafficSpawnIntervalMax: 2.8,
    maxLives: 3, // ❤️ 3 Vidas
    waterJetSpacingMin: 90,
    waterJetSpacingMax: 130,
    waterJetInitialCount: 2,
    obstacleCooldown: 0.75,
    baseSpeedMultiplier: 1.05,
    accelerationRate: 1.20,
    initialMotoboySpeed: 12.5, // 🚀 Começa devagar e controlado, acelerando conforme a corrida avança
    initialPlayerSpeed: 13.5,
  },
};

export function getMaxLives(level: DifficultyLevel): number {
  return DIFFICULTY_CONFIGS[level]?.maxLives || 10;
}

const DIFFICULTY_STORAGE_KEY = 'caramelorun_difficulty_level';

export function getSavedDifficulty(): DifficultyLevel {
  try {
    const saved = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (saved === 'easy' || saved === 'medium' || saved === 'hard') {
      return saved;
    }
  } catch {}
  return 'medium';
}

export function saveDifficulty(level: DifficultyLevel): void {
  try {
    localStorage.setItem(DIFFICULTY_STORAGE_KEY, level);
  } catch {}
}
