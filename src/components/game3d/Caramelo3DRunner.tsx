import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Zap,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Flame,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Sun,
  Sunset,
  Moon,
  Bone as BoneIcon,
  Award,
  Trophy,
  Heart,
  Bike,
  Dog,
  Maximize,
  Minimize,
  Check,
  Download,
  MessageCircle,
  Instagram,
  Video,
  Share2,
  Share,
  Copy,
  Palette,
  Gamepad2,
  Settings,
  X,
  MoveHorizontal,
  Lock,
  Image as ImageIcon,
  Home,
  Megaphone,
  ChevronDown,
  Pause,
  Play,
  Camera,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../services/soundEffects';
import { storage } from '../../services/storageService';
import { Skin } from '../../types';
import { ProfilePhotoSelectorModal } from '../player/ProfilePhotoSelectorModal';
import { GalleryModal } from './GalleryModal';
import {
  SteelCornerBrackets,
  OctagonCloseButton,
  OctagonIconBadge,
  SteelCoinPill,
  GoldCoinIcon,
  SteelRivet,
} from '../common/CartoonWoodUI';
import { createAsphaltTexture, createSidewalkTexture, createTerrainTexture, setMaterialsAnisotropy, getRoadSurfaceAtZ } from './materials';
import {
  createSpeedBump,
  getSharedMaterials,
} from './sceneryModels';
import { createManhole, warmUpManholeSharedAssets, manholeStreamTex } from './obstacles';
import { createWeatherLighting, TimeOfDay } from './weatherLighting';
import { ParticleSystem } from './particles';
import { buildCaramelo, CarameloInstance, CARAMELO_SKINS, CarameloSkinConfig } from './CarameloModel';
import { buildMotoboy, MotoboyInstance, MOTO_SKINS, MotoboySkinConfig } from './MotoboyModel';
import { MotorcycleSkinViewer } from './MotorcycleSkinViewer';
import { DogSkinViewer } from './DogSkinViewer';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { populateChunkScenery, recycleChunkScenery, refreshAllChunksBuildings, applyChunkRoadSurface } from './scenerySystem';
import { TrafficManager, TrafficCar } from './traffic';
import { SpawnManager, SpawnedObstacle } from './spawnManager';
import { ParallaxSystem } from './parallax';
import { GameplayDirectorAI } from './gameplayAI';
import { PedestrianSystem } from './PedestrianSystem';
import { BuildingManager } from './BuildingManager';
import { TreeManager } from './TreeManager';
import { GamefyBillboardManager } from './GamefyBillboard';
import { IntroCinematic } from './IntroCinematic';
import { MarketingPortalModal, recordAdImpression } from '../game/MarketingPortalModal';
import {
  DifficultyLevel,
  DIFFICULTY_CONFIGS,
  getSavedDifficulty,
  saveDifficulty,
  getMaxLives,
} from './difficultySettings';
import {
  GraphicsSettings,
  loadGraphicsSettings,
  saveGraphicsSettings,
  PRESET_CONFIGS,
  getMaxVisibleDistance,
  getFarPlaneByDistance,
  getFogDensityByDistance,
  getDistanceScale,
} from './graphicsSettings';
import {
  applyAtmosphericPerspective,
  applyAtmosphericToChunk,
  updateAtmosphericUniforms,
} from './atmosphericFogSystem';
import {
  frontalFrustumCulling,
  FrontalFrustumCulling,
} from './frontalFrustumCulling';

interface Caramelo3DRunnerProps {
  equippedSkin?: Skin;
  onGameOver?: (score: number, bites: number) => void;
  onBackToMenu?: () => void;
  startInSettings?: boolean;
}

type GameMode = 'caramelo' | 'motoboy';

const MOTOBOY_SHOUTS = [
  'SAI CACHORRO! 🛵💨',
  'MINHA CANELA NÃOOO! 🦵🔥',
  'ME DEIXA ENTREGAR A PIZZA! 🍕😱',
  'VAI MORDER TUA VÓ! 😡🐕',
  'TÔ ATRASADO NO IFOOD! ⏰🛵',
  'DÁ LICENÇA CARAMELO! ⚠️',
  'SAI DA MINHA BOTA! 👢💨',
  'NÃO TEM COMIDA NA BAG! 📦😭',
  'OLHA O CARROOO! 🚗💥',
  'ACELERA NO GRAU! 🛵💨🔥',
];

const BITE_REACTIONS = [
  'AI MINHA CANELA! 💥🦵 AIII!',
  'NHAC! AI MEU TORNOZELO! 😱🔥',
  'CARAMELO DESGRAÇADO! 🤬🛵',
  'ARRANCOU O PEDAÇO DA CALÇA! 👖😭',
  'MEU CHINELO HAVAIANAS! 🩴💥',
];

const DOG_BARK_TEXTS = [
  'AU AU AU! 🐕🔥',
  'GRRRR! VOU TE PEGAR! 🦴',
  'LATIU E MORDEU! 🐶💢',
  'NHAC NHAC! 🦷💥',
  'VEM CÁ MOTOBOY! 🐕‍🦺💨',
];

const CHUNK_LENGTH = 45;
const NUM_CHUNKS = 7;
const MOTOBOY_MODE_MAX_LIVES = 10;
const BITES_TO_WIN = 10;

const WHEELIE_TIERS = [
  { dist: 10, label: 'PRIMEIRO GRAU! 10M', bonus: 500 },
  { dist: 100, label: 'MESTRE DO GRAU! 100M', bonus: 2500 },
  { dist: 500, label: 'LENDA DO ASFALTO! 500M', bonus: 10000 },
  { dist: 1000, label: 'DEUS DO GRAU! 1 KM', bonus: 30000 },
  { dist: 2500, label: 'REI DA QUEBRADA! 2.5 KM', bonus: 75000 },
  { dist: 5000, label: 'GRAU SUPREMO BRASIL! 5 KM', bonus: 200000 },
];

// 📸 FOTOS FINAIS DE PERDA / GAME OVER (Alternadas dinamicamente a cada derrota)
const FINAL_GAME_OVER_IMAGES = [
  '/images/gameover/dog_selfie_gas_station.jpg',
  '/images/gameover/favela_selfie_scene.jpg',
  '/images/gameover/low_poly_dog_selfie.jpg',
  '/images/gameover/low_poly_dog_selfie_1.jpg',
  '/images/gameover/low_poly_selfie_scene.jpg',
  '/images/gameover/sunset_park_selfie.jpg',
];

let lastGameOverImageIndex = -1;
const LAST_GAMEOVER_IDX_KEY = 'viralata_last_gameover_idx_v1';
function getNextGameOverImage(): string {
  // Tenta restaurar último índice do localStorage para não repetir após reload (importante no celular)
  try {
    if (lastGameOverImageIndex === -1 && typeof window !== 'undefined') {
      const saved = localStorage.getItem(LAST_GAMEOVER_IDX_KEY);
      if (saved !== null) {
        const n = parseInt(saved, 10);
        if (!isNaN(n)) lastGameOverImageIndex = n;
      }
    }
  } catch {}

  try {
    // 🎯 1. Prioridade Máxima: Checa se há URL direta da imagem fixada salva no storage / localStorage
    const directPinnedUrl = storage.getPinnedGameOverImageUrl?.() ||
      (typeof window !== 'undefined' ? localStorage.getItem('viralata_pinned_gameover_image_url_v1') : null);
    if (directPinnedUrl && typeof directPinnedUrl === 'string' && directPinnedUrl.trim().length > 0) {
      console.log('[GameOver] Usando imagem FIXADA (URL direta):', directPinnedUrl);
      return directPinnedUrl.trim();
    }

    // 🎯 2. Checa por ID fixado
    const pinnedId = storage.getPinnedGameOverImageId?.() ||
      (typeof window !== 'undefined' ? localStorage.getItem('viralata_pinned_gameover_image_v1') : null);
    const customImages = storage.getGameOverImages();
    if (pinnedId && customImages && customImages.length > 0) {
      const pinned = customImages.find(img => img.id === pinnedId || img.url === pinnedId);
      if (pinned && pinned.url) {
        console.log('[GameOver] Usando imagem FIXADA (ID):', pinnedId, pinned.url);
        return pinned.url;
      } else {
        console.warn('[GameOver] ID fixado não encontrado, voltando ao aleatório. ID:', pinnedId);
      }
    }

    // 🎲 3. Rotação Aleatória - com persistência do último índice
    const pickRandom = (len: number) => {
      if (len <= 1) return 0;
      let nextIdx = Math.floor(Math.random() * len);
      // Evita repetir a mesma consecutivamente
      if (nextIdx === lastGameOverImageIndex) {
        nextIdx = (nextIdx + 1) % len;
      }
      lastGameOverImageIndex = nextIdx;
      try { localStorage.setItem(LAST_GAMEOVER_IDX_KEY, String(nextIdx)); } catch {}
      return nextIdx;
    };

    if (customImages && customImages.length > 0) {
      const urls = customImages.map(img => img.url).filter(Boolean);
      if (urls.length > 0) {
        const idx = pickRandom(urls.length);
        console.log('[GameOver] Sorteio aleatório (custom):', idx, urls[idx], 'total:', urls.length);
        return urls[idx];
      }
    }
  } catch (e) { console.warn('[GameOver] Erro no sorteio custom:', e); }
  // Fallback para imagens padrão
  const len = FINAL_GAME_OVER_IMAGES.length;
  let nextIdx = Math.floor(Math.random() * len);
  if (len > 1 && nextIdx === lastGameOverImageIndex) {
    nextIdx = (nextIdx + 1) % len;
  }
  lastGameOverImageIndex = nextIdx;
  try { localStorage.setItem(LAST_GAMEOVER_IDX_KEY, String(nextIdx)); } catch {}
  console.log('[GameOver] Sorteio aleatório (padrão):', nextIdx, FINAL_GAME_OVER_IMAGES[nextIdx]);
  return FINAL_GAME_OVER_IMAGES[nextIdx];
}

// Reusable scratch vector for projection calculations without Garbage Collection overhead
const _scratchVec3 = new THREE.Vector3();

export const Caramelo3DRunner: React.FC<Caramelo3DRunnerProps> = ({
  equippedSkin,
  onGameOver,
  onBackToMenu,
  startInSettings = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // React State for HUD & UI
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('IDLE');
  const [gameMode, setGameMode] = useState<GameMode>('caramelo');
  const [score, setScore] = useState(0);
  const [bitesCount, setBitesCount] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(30);
  const [motoboyDistance, setMotoboyDistance] = useState(12.0);
  const setIsBiteReady = useCallback((_val: boolean) => {}, []);
  const [biteCombo, setBiteCombo] = useState(0);
  const [ossoCoinsEarned, setOssoCoinsEarned] = useState(0);
  const [earnedNotes10, setEarnedNotes10] = useState(0);
  const [earnedNotes50, setEarnedNotes50] = useState(0);
  const [earnedNotes100, setEarnedNotes100] = useState(0);
  const [userNotes10, setUserNotes10] = useState(() => storage.getCurrentUser()?.notas10 ?? Math.floor((storage.getCurrentUser()?.ossoCoins || 2500) / 10));
  const [userNotes50, setUserNotes50] = useState(() => storage.getCurrentUser()?.notas50 ?? 0);
  const [userNotes100, setUserNotes100] = useState(() => storage.getCurrentUser()?.notas100 ?? 0);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [highScore, setHighScore] = useState(() => storage.getCurrentUser()?.stats.maiorPontuacao || 0);
  const [currentTimeOfDay, setCurrentTimeOfDay] = useState<TimeOfDay>('DAY');
  const [soundMuted, setSoundMuted] = useState(false);
  const [lives, setLives] = useState(() => getMaxLives(getSavedDifficulty()));
  // ⏸️ Animação Dinâmica de Score e Dinheiro Subindo no GameOver
  const [animMoney10, setAnimMoney10] = useState(0);
  const [animMoney50, setAnimMoney50] = useState(0);
  const [animMoney100, setAnimMoney100] = useState(0);
  const [animTotalCollectedMoney, setAnimTotalCollectedMoney] = useState(0);
  const [isGameOverShaking, setIsGameOverShaking] = useState(false);

  // ⏸️ Sistema de Pausa do Jogo
  const [isGamePaused, setIsGamePaused] = useState(false);
  const isGamePausedRef = useRef(false);

  // ⚙️ Menu Compacto de Opções Rápidas (Engrenagem com Seta)
  const [isQuickOptionsOpen, setIsQuickOptionsOpen] = useState(false);

  // 🏠 Modal de Confirmação de Saída da Partida (Sem recompensas)
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // 🐕 Estamina Real do Cachorro (Modo Caramelo)
  const [dogStamina, setDogStamina] = useState(100);
  const dogStaminaRef = useRef(100);
  const dogStaminaBarRef = useRef<HTMLDivElement>(null);
  const dogStaminaTextRef = useRef<HTMLSpanElement>(null);

  // ⚡ Desafio de Reação Rápida do Cachorro (Linha oscilando de um lado para o outro para acertar no meio)
  const [dogQTE, setDogQTE] = useState<{
    active: boolean;
    timeLeft: number;
    duration: number;
    lineProgress: number; // 0 a 100%
  }>({
    active: false,
    timeLeft: 0,
    duration: 2.4,
    lineProgress: 50,
  });
  const dogQTERef = useRef({
    active: false,
    timeLeft: 0,
    duration: 2.4,
    lineProgress: 50,
    direction: 1 as 1 | -1,
    oscSpeed: 115, // Velocidade suave e responsiva de oscilação (% por segundo)
  });
  const qteCooldownRef = useRef(0);
  // 🛵 Vidas do Motoboy no Modo Caramelo (10 corações fixos)
  const [motoboyBossLives, setMotoboyBossLives] = useState(10);
  // 🐕 Vidas do Jogador Caramelo no Modo Caramelo (10 no Fácil, 5 no Médio, 3 no Difícil)
  const [carameloLives, setCarameloLives] = useState(() => getMaxLives(getSavedDifficulty()));
  // 🛡️ Trava rigorosa anti-duplo clique e anti-múltiplo dano no desafio
  const isQTEProcessingHitRef = useRef(false);
  // 🎯 Alvo Interativo Dinâmico Flutuante atrás do Motoboy
  const biteTargetDomRef = useRef<HTMLDivElement>(null);
  // 🦷 Animação Cinemática de Mordida (boca aberta -> boca fechada mordendo grudada no Motoboy)
  const [biteAnimStage, setBiteAnimStage] = useState<'open' | 'closed' | null>(null);
  const biteAnimStageRef = useRef<'open' | 'closed' | null>(null);
  const biteAnimDomRef = useRef<HTMLDivElement>(null);
  const [biteAnimPos, setBiteAnimPos] = useState({ x: 50, y: 50 });
  const [screenRedFlash, setScreenRedFlash] = useState(false);

  // 📢 Motoboy Speech Bubble & In-Game Popups (DOM refs para ZERO re-renders de React no loop 3D)
  const damagePopBoxRef = useRef<HTMLDivElement>(null);
  const damagePopTextRef = useRef<HTMLSpanElement>(null);
  const motoboySpeechBoxRef = useRef<HTMLDivElement>(null);
  const motoboySpeechTextRef = useRef<HTMLSpanElement>(null);
  const inGameAlertsContainerRef = useRef<HTMLDivElement>(null);

  const setDamagePop = useCallback((text: string | null) => {
    if (damagePopBoxRef.current && damagePopTextRef.current && inGameAlertsContainerRef.current) {
      if (text) {
        damagePopTextRef.current.textContent = text;
        damagePopBoxRef.current.style.opacity = '1';
        damagePopBoxRef.current.style.transform = 'translate3d(0, 0, 0) scale(1)';
        inGameAlertsContainerRef.current.style.opacity = '1';
      } else {
        damagePopBoxRef.current.style.opacity = '0';
        damagePopBoxRef.current.style.transform = 'translate3d(0, -6px, 0) scale(0.96)';
        const isSpeechVisible = motoboySpeechBoxRef.current && motoboySpeechBoxRef.current.style.opacity === '1';
        if (!isSpeechVisible) {
          inGameAlertsContainerRef.current.style.opacity = '0';
        }
      }
    }
  }, []);

  const setMotoboySpeech = useCallback((text: string | null) => {
    if (motoboySpeechBoxRef.current && motoboySpeechTextRef.current && inGameAlertsContainerRef.current) {
      if (text) {
        motoboySpeechTextRef.current.textContent = text;
        motoboySpeechBoxRef.current.style.opacity = '1';
        motoboySpeechBoxRef.current.style.transform = 'translate3d(0, 0, 0) scale(1)';
        inGameAlertsContainerRef.current.style.opacity = '1';
      } else {
        motoboySpeechBoxRef.current.style.opacity = '0';
        motoboySpeechBoxRef.current.style.transform = 'translate3d(0, -6px, 0) scale(0.96)';
        const isDamageVisible = damagePopBoxRef.current && damagePopBoxRef.current.style.opacity === '1';
        if (!isDamageVisible) {
          inGameAlertsContainerRef.current.style.opacity = '0';
        }
      }
    }
  }, []);

  const [gameOverImage, setGameOverImage] = useState<string | null>(null);
  // 🏍️ Holograma Dinâmico do Painel Flutuante (estilo duplo mostrador CG Titan/Twister com stickers brasileiros)
  const [hologramDash, setHologramDash] = useState({
    x: 40,
    y: 65,
    speed: 30,
    gear: '2',
    odo: '0.0',
    tilt: 0,
    opacity: 0.92,
    visible: false
  });
  const [floatingCoins, setFloatingCoins] = useState<{ id: number; x: number; y: number; value?: 10 | 50 | 100 }[]>([]);
  const [showCutscene, setShowCutscene] = useState(false);
  const [showIntroCinematic, setShowIntroCinematic] = useState(false);
  const [waterJetTutorialActive, setWaterJetTutorialActive] = useState(false);
  const [waterJetTutorialEnabled, setWaterJetTutorialEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('caramelo_tutorial_enabled');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });
  const waterJetTutorialEnabledRef = useRef(waterJetTutorialEnabled);
  useEffect(() => { waterJetTutorialEnabledRef.current = waterJetTutorialEnabled; }, [waterJetTutorialEnabled]);
  const touchStartXRef = useRef(0);
  const [screenFadeBlack, setScreenFadeBlack] = useState(0);
  const [isSlowMoActive, setIsSlowMoActive] = useState(false);
  const [showSkinsModal, setShowSkinsModal] = useState(false);
  const [skinsTab, setSkinsTab] = useState<'caramelo' | 'motoboy'>('motoboy');
  const [equippedMotoSkinId, setEquippedMotoSkinId] = useState<string>(() => {
    return localStorage.getItem('caramelorun_equipped_moto_skin') || 'moto_default';
  });
  const [previewMotoSkin, setPreviewMotoSkin] = useState<MotoboySkinConfig>(() => {
    const saved = localStorage.getItem('caramelorun_equipped_moto_skin') || 'moto_default';
    return MOTO_SKINS.find((s) => s.id === saved) || MOTO_SKINS[0];
  });
  const [equippedDogSkinId, setEquippedDogSkinId] = useState<string>(() => {
    return localStorage.getItem('caramelorun_equipped_dog_skin') || 'caramelo_default';
  });
  const [previewDogSkin, setPreviewDogSkin] = useState<CarameloSkinConfig>(() => {
    const saved = localStorage.getItem('caramelorun_equipped_dog_skin') || 'caramelo_default';
    return CARAMELO_SKINS.find((s) => s.id === saved) || CARAMELO_SKINS[0];
  });
  const [unlockedDogSkins, setUnlockedDogSkins] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('caramelorun_unlocked_dog_skins');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['caramelo_default'];
  });
  const [unlockedMotoSkins, setUnlockedMotoSkins] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('caramelorun_unlocked_moto_skins');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['moto_default'];
  });
  const [userCoins, setUserCoins] = useState<number>(() => {
    return storage.getCurrentUser()?.ossoCoins || 2500;
  });
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [sunFlareOpacity, setSunFlareOpacity] = useState(0.95);
  const [wheelieMilestoneMsg, setWheelieMilestoneMsg] = useState<string | null>(null);
  const [floatingWheelies, setFloatingWheelies] = useState<{
    id: number;
    title: string;
    bonus: number;
    x: number;
    y: number;
  }[]>([]);
  const [isHyperSpeed, setIsHyperSpeed] = useState(false);
  const [dashTilt, setDashTilt] = useState({ roll: 0, bobY: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // 🎮 Sistema de Dificuldade Profissional (Fácil / Médio / Difícil)
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(getSavedDifficulty);
  const difficultyRef = useRef<DifficultyLevel>(difficulty);
  difficultyRef.current = difficulty;

  const handleSetDifficulty = useCallback((level: DifficultyLevel) => {
    setDifficulty(level);
    difficultyRef.current = level;
    saveDifficulty(level);
    const maxL = getMaxLives(level);
    setLives(maxL);
    setCarameloLives(maxL);
    gameRef.current.mbLives = maxL;
    gameRef.current.carameloLives = maxL;
    if (gameRef.current.traffic) {
      gameRef.current.traffic.setDifficulty(level);
    }
    if (gameRef.current.spawnManager) {
      gameRef.current.spawnManager.setDifficulty(level);
    }
  }, []);

  // 🖥️ Sistema Profissional de Configurações Gráficas
  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettings>(loadGraphicsSettings);
  const graphicsSettingsRef = useRef<GraphicsSettings>(graphicsSettings);
  graphicsSettingsRef.current = graphicsSettings;

  const updateGraphicsSetting = useCallback(<K extends keyof GraphicsSettings>(key: K, value: GraphicsSettings[K]) => {
    setGraphicsSettings((prev) => {
      let updated = { ...prev, [key]: value };
      if (key === 'preset') {
        const presetConfig = PRESET_CONFIGS[value as keyof typeof PRESET_CONFIGS];
        if (presetConfig) {
          updated = { ...updated, ...presetConfig };
        }
      }
      graphicsSettingsRef.current = updated;
      saveGraphicsSettings(updated);

      // Aplica dinamicamente sem reiniciar
      const g = gameRef.current;
      if (g.renderer) {
        const isMob = typeof window !== 'undefined' && window.innerWidth < 768;
        const maxDpr = updated.preset === 'ultra' ? 1.05 : (updated.preset === 'low' ? 0.85 : 1.0);
        const targetPixelRatio = Math.min(1.05, (isMob ? 1.0 : Math.min(window.devicePixelRatio || 1, maxDpr)) * updated.resolutionScale);
        g.renderer.setPixelRatio(targetPixelRatio);

        if (updated.shadows === 'off') {
          g.renderer.shadowMap.enabled = false;
        } else {
          g.renderer.shadowMap.enabled = true;
          g.renderer.shadowMap.type = updated.shadows === 'soft' ? THREE.PCFShadowMap : THREE.BasicShadowMap;
        }

        if (g.bloomPass) {
          g.bloomPass.enabled = updated.bloomEnabled;
          g.bloomPass.strength = updated.bloomIntensity;
        }
      }

      if (g.camera) {
        g.camera.far = getFarPlaneByDistance(updated.renderDistance);
        g.camera.updateProjectionMatrix();
      }
      if (g.scene && g.scene.fog && g.scene.fog instanceof THREE.FogExp2) {
        g.scene.fog.density = getFogDensityByDistance(updated.renderDistance);
      }
      if (g.weather) {
        const isMob = typeof window !== 'undefined' && window.innerWidth < 768;
        const optMode = updated.preset === 'low' || updated.preset === 'medium' || isMob;
        g.weather.setOptimizedMode(optMode);
      }

      return updated;
    });
  }, []);

  // 🔔 Toast Notification Helper
  const showToast = useCallback((msg: string) => {
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // 🎨 Gera um "Share Card" usando Canvas: combina a foto do game over + texto sobreposto numa única imagem
  const generateShareCardFile = useCallback(async (
    imgUrl: string,
    lines: string[],
    filename = 'caramelo_viralataran.jpg'
  ): Promise<File | null> => {
    try {
      // Carrega a imagem base
      let srcBlob: Blob;
      if (imgUrl.startsWith('data:')) {
        const [header, b64] = imgUrl.split(',');
        const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(b64);
        const u8 = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
        srcBlob = new Blob([u8], { type: mime });
      } else {
        const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${window.location.origin}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
        srcBlob = await fetch(fullUrl).then(r => r.blob());
      }

      const bmp = await createImageBitmap(srcBlob);
      const W = bmp.width || 600;
      const H = bmp.height || 600;
      const BANNER = Math.round(H * 0.22); // altura do banner de texto (22% da imagem)

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H + BANNER;
      const ctx = canvas.getContext('2d')!;

      // Fundo preto para o banner
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, W, canvas.height);

      // Imagem na parte de cima
      ctx.drawImage(bmp, 0, 0, W, H);

      // Banner de texto embaixo
      ctx.fillStyle = 'rgba(0,0,0,0.92)';
      ctx.fillRect(0, H, W, BANNER);

      // Linha de destaque laranja
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, H, W, 4);

      const fontSize = Math.max(14, Math.round(W / 24));
      const smallFontSize = Math.max(11, Math.round(W / 32));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const totalLines = lines.length;
      const lineH = BANNER / (totalLines + 1);
      lines.forEach((line, i) => {
        const isFirst = i === 0;
        ctx.font = `bold ${isFirst ? fontSize : smallFontSize}px 'Fredoka', 'Arial Rounded MT Bold', Arial, sans-serif`;
        ctx.fillStyle = isFirst ? '#fbbf24' : '#d1d5db';
        // Sombra suave
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(line, W / 2, H + lineH * (i + 1), W - 24);
      });
      ctx.shadowBlur = 0;

      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.93));
      if (!blob) return null;
      return new File([blob], filename, { type: 'image/jpeg' });
    } catch (err) {
      console.warn('[ShareCard] Erro ao gerar card:', err);
      return null;
    }
  }, []);

  // 🔗 Helper: baixa um File como link <a download>
  const downloadFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, []);

  // 📱 Compartilhamento Geral (botão "Enviar")
  const handleNativeShare = useCallback(async () => {
    sound.playClick();
    const shareUrl = window.location.origin;
    const shareText = `💥 Fiz ${score} pontos e ${bitesCount} mordidas no Vira-Lata Run! 🐶🛵💨 Bora tentar bater meu recorde? ${shareUrl}`;

    if (gameOverImage) {
      const cardLines = [
        `🐶 ${score} PTS | ${speedKmh} km/h | ${bitesCount} mordidas`,
        'Vira-Lata Run — viralatarun.com.br',
      ];
      let cardFile: File | null = null;
      try { cardFile = await generateShareCardFile(gameOverImage, cardLines, 'caramelo_compartilhar.jpg'); } catch {}
      if (cardFile) {
        // No PC o WhatsApp Desktop separa `text+files` em 2 mensagens (texto primeiro, imagem depois).
        // Por isso: PC = envia só a imagem (1 mensagem), Celular = envia imagem+texto como legenda única.
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        try { await navigator.clipboard.writeText(shareText); } catch {}
        const tryShareWithFiles = async () => {
          if (typeof navigator.share !== 'function') return false;
          try {
            const canShare = navigator.canShare ? navigator.canShare({ files: [cardFile!] }) : true;
            if (!canShare) return false;
            if (isMobile) {
              await navigator.share({ text: shareText, files: [cardFile!] });
              showToast('📸 Imagem + legenda em 1 mensagem!');
            } else {
              // PC: só arquivo = 1 mensagem de imagem (legenda já está copiada no Ctrl+V)
              await navigator.share({ files: [cardFile!] });
              showToast('📸 Imagem enviada (1 mensagem)! Legenda copiada — cole com Ctrl+V se quiser 📋');
            }
            return true;
          } catch (e: any) {
            if (e?.name === 'AbortError') return true; // usuário cancelou, não faz fallback
            return false;
          }
        };
        if (await tryShareWithFiles()) return;
        // Tentativa sem canShare
        if (typeof navigator.share === 'function') {
          try {
            if (isMobile) {
              await navigator.share({ text: shareText, files: [cardFile] });
              showToast('📸 Imagem + legenda em 1 mensagem!');
            } else {
              await navigator.share({ files: [cardFile] });
              showToast('📸 Imagem enviada (1 mensagem)! Legenda copiada — cole com Ctrl+V 📋');
            }
            return;
          } catch (e: any) { if (e?.name === 'AbortError') return; }
        }
        // Fallback: baixa o card e copia texto
        try { await navigator.clipboard.writeText(shareText); } catch {}
        downloadFile(cardFile);
        showToast('📥 Imagem baixada e texto copiado! Escolha o app para enviar 📎');
        // Tenta abrir sheet de texto também
        if (typeof navigator.share === 'function') {
          try { await navigator.share({ title: 'Vira-Lata Run', text: shareText }); } catch {}
        }
        return;
      }
    }

    // Sem imagem: tenta share de texto
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Vira-Lata Run', text: shareText });
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      showToast('📋 Texto copiado! Cole no WhatsApp.');
    } catch {
      showToast('📸 Compartilhe nas redes sociais!');
    }
  }, [score, bitesCount, speedKmh, gameOverImage, generateShareCardFile, downloadFile, showToast]);

  // 💬 Compartilhamento WhatsApp — CORRIGIDO para celular
  // ⚠️ Limitação do WhatsApp: `wa.me/?text=` NUNCA consegue enviar imagem junto, só texto.
  // O ÚNICO jeito de enviar imagem+texto direto pro Zap no celular é via Web Share API com `files`.
  // Por isso: 1) tenta `navigator.share({files})` (abre sheet nativo -> usuário escolhe Zap e vai com imagem+texto)
  //           2) fallback (quando não suportado): baixa imagem + copia texto + abre wa.me com texto -> usuário anexa manualmente
  const handleWhatsAppShare = useCallback(async () => {
    sound.playClick();
    const shareUrl = window.location.origin;
    const msgText = `💥 Bati a moto a ${speedKmh} km/h no Vira-Lata Run!\nPontuação: ${score} pontos | ${bitesCount} mordidas 🐶🛵💨\n🎮 Jogue: ${shareUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msgText)}`;

    const openWhatsApp = () => {
      // window.open com delay de 800ms é bloqueado como popup no iOS/Android.
      // Abrir imediatamente mantém o gesto do usuário e não é bloqueado.
      const win = window.open(waUrl, '_blank', 'noopener');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        // Fallback se popup bloqueado (iOS Safari)
        window.location.href = waUrl;
      }
    };

    if (gameOverImage) {
      const cardLines = [
        `💥 ${score} PTS | ${speedKmh} km/h | ${bitesCount} mordidas`,
        `🎮 Jogue: ${shareUrl}`,
      ];
      let cardFile: File | null = null;
      try {
        cardFile = await generateShareCardFile(gameOverImage, cardLines, 'caramelo_zap.jpg');
      } catch {}

      if (cardFile) {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        try { await navigator.clipboard.writeText(msgText); } catch {}
        // 1. Tenta Web Share com arquivo — Celular = imagem+legenda em 1 msg, PC = só imagem (1 msg) para não virar 2
        const canShareWithFiles = typeof navigator.share === 'function' && (() => {
          try {
            if (navigator.canShare) return navigator.canShare({ files: [cardFile!] });
            return true;
          } catch { return false; }
        })();

        if (canShareWithFiles) {
          try {
            if (isMobile) {
              await navigator.share({ text: msgText, files: [cardFile] });
              showToast('📸 Imagem + legenda em 1 mensagem!');
            } else {
              await navigator.share({ files: [cardFile] });
              showToast('📸 Imagem enviada (1 mensagem)! Legenda copiada — cole com Ctrl+V se quiser 📋');
            }
            return;
          } catch (e: any) {
            if (e?.name === 'AbortError') return;
            console.warn('[Zap] share com arquivo falhou:', e);
          }
        }

        // 2. Tentativa extra mesmo se canShare retornou false
        if (typeof navigator.share === 'function') {
          try {
            if (isMobile) {
              await navigator.share({ text: msgText, files: [cardFile] });
              showToast('📸 Imagem + legenda em 1 mensagem!');
            } else {
              await navigator.share({ files: [cardFile] });
              showToast('📸 Imagem enviada (1 mensagem)! Legenda copiada — cole com Ctrl+V 📋');
            }
            return;
          } catch (e: any) {
            if (e?.name === 'AbortError') return;
          }
        }

        // 3. Fallback SEM suporte a arquivos: NÃO baixa mais (usuário pediu para não baixar)
        // Limitação do WhatsApp: wa.me/?text= nunca envia imagem. Sem Web Share com files, só dá para enviar texto.
        // Se quiser a imagem, use o botão SALVAR ou tente em Chrome/Safari atualizado em HTTPS.
        showToast('⚠️ Seu navegador não permite enviar imagem direto pro Zap. Enviando só o texto!');
        openWhatsApp();
        return;
      }
    }

    // Sem imagem: tenta share nativo de texto, senão wa.me
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Vira-Lata Run', text: msgText });
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
      }
    }
    openWhatsApp();
  }, [speedKmh, score, bitesCount, gameOverImage, generateShareCardFile, downloadFile, showToast]);

  // 📷 Compartilhamento Instagram
  const handleInstagramShare = useCallback(async () => {
    sound.playClick();
    const shareUrl = window.location.origin;
    const caption = `Bati a moto a ${speedKmh} km/h no Vira-Lata Run! Pontuação: ${score} pts! 🐶🛵💨 #ViraLataRun #CarameloRun ${shareUrl}`;

    if (gameOverImage) {
      const cardLines = [
        `🐶 ${score} PTS | ${speedKmh} km/h`,
        '#ViraLataRun #CarameloRun',
      ];
      const cardFile = await generateShareCardFile(gameOverImage, cardLines, 'caramelo_stories.jpg');

      if (cardFile) {
        // Tenta compartilhar nativamente com arquivo
        if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [cardFile] })) {
          try {
            await navigator.share({ title: 'Vira-Lata Run Stories', text: caption, files: [cardFile] });
            showToast('📸 Card enviado para o Insta com sucesso!');
            return;
          } catch (e: any) {
            if (e?.name === 'AbortError') return;
          }
        }
        // Desktop: baixa o card e copia legenda
        downloadFile(cardFile);
        try {
          await navigator.clipboard.writeText(caption);
          showToast('📥 Imagem baixada e legenda copiada! Cole nos Stories do Instagram.');
        } catch {
          showToast('📥 Imagem baixada! Poste nos Stories do Instagram.');
        }
        return;
      }
    }

    showToast('📸 Tire um print e marque #CarameloRun nos Stories!');
  }, [speedKmh, score, gameOverImage, generateShareCardFile, downloadFile, showToast]);

  const handleDownloadImage = useCallback(async () => {
    sound.playClick();
    if (gameOverImage) {
      const cardLines = [
        `🐶 ${score} PTS | ${speedKmh} km/h | ${bitesCount} mordidas`,
        'Vira-Lata Run',
      ];
      const cardFile = await generateShareCardFile(gameOverImage, cardLines, `caramelo_selfie_${Date.now()}.jpg`);
      if (cardFile) {
        downloadFile(cardFile);
        showToast('📥 Card da quebrada salvo na galeria!');
      } else {
        // fallback
        const a = document.createElement('a');
        a.href = gameOverImage;
        a.download = `caramelo_selfie_${Date.now()}.jpg`;
        a.click();
        showToast('📥 Foto salva na galeria!');
      }
    }
  }, [gameOverImage, score, speedKmh, bitesCount, generateShareCardFile, downloadFile, showToast]);

  const handleCopyLink = useCallback(async () => {
    sound.playClick();
    try {
      await navigator.clipboard.writeText(window.location.origin);
      showToast('🔗 Link do jogo copiado!');
    } catch {
      showToast('Não foi possível copiar o link.');
    }
  }, [showToast]);

  // 📱 Mobile Controls & Swipe Tutorial States
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false);
  const [showOnScreenControls, setShowOnScreenControls] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('caramelo_touch_controls');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });


  // 🚀 Loading Screen State (0% a 100%)
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Iniciando motores da quebrada...');
  const [loadingSteps, setLoadingSteps] = useState({
    houses: false,
    npcs: false,
    trees: false,
    shaders: false,
  });
  const [downloadSpeedKbps, setDownloadSpeedKbps] = useState<number>(0);

  // 🚀 MEGA SALTO DO JATO D'ÁGUA & MANOBRAS AÉREAS (MORTAIS NO AR)
  const [isMegaJumping, setIsMegaJumping] = useState(false);
  const [airAltitude, setAirAltitude] = useState(0);
  const [airFlipsCount, setAirFlipsCount] = useState(0);
  const [airStuntScore, setAirStuntScore] = useState(0);
  const [airStuntComboName, setAirStuntComboName] = useState<string | null>(null);

  // 💧 Water Splatter on Screen (Gotas de água escorrendo na tela ao passar pela poça)
  const [waterSplatterActive, setWaterSplatterActive] = useState(false);
  const [waterDrops, setWaterDrops] = useState<{
    id: number;
    x: number;
    startY: number;
    size: number;
    slideDist: number;
    delay: number;
    duration: number;
    scaleX: number;
    scaleY: number;
  }[]>([]);
  const waterSplatterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🚀 Auto-transição suave da tela de carregamento para o menu após 100%
  useEffect(() => {
    if (loadingProgress >= 100) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        sound.startMenuMusic();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress]);

  // ⚡ Monitor Realtime de Velocidade de Carregamento da Internet (KB/s ou MB/s)
  useEffect(() => {
    if (!isLoading || loadingProgress >= 100) return;

    let lastBytes = 0;
    let lastTime = performance.now();

    const interval = setInterval(() => {
      try {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        let totalBytes = 0;
        for (let i = 0; i < resources.length; i++) {
          const r = resources[i];
          const bytes = r.encodedBodySize || r.transferSize || r.decodedBodySize || 0;
          totalBytes += bytes;
        }

        const now = performance.now();
        const timeDiffSec = (now - lastTime) / 1000;
        if (timeDiffSec > 0.1) {
          const bytesDiff = Math.max(0, totalBytes - lastBytes);
          const kbps = Math.round((bytesDiff / 1024) / timeDiffSec);
          if (kbps > 0) {
            setDownloadSpeedKbps(kbps);
          } else if (lastBytes === 0 && totalBytes > 0) {
            setDownloadSpeedKbps(Math.round(totalBytes / 1024));
          }
          lastBytes = totalBytes;
          lastTime = now;
        }
      } catch (e) {}
    }, 350);

    return () => clearInterval(interval);
  }, [isLoading, loadingProgress]);

  const containerRef = useRef<HTMLDivElement>(null);

  // ⚡ Refs de Alta Performance para 60 FPS Cravados (Zero React Re-renders no loop 3D)
  const fpsTextRef = useRef<HTMLSpanElement>(null);
  const fpsDotRef = useRef<HTMLDivElement>(null);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const lastTimeOfDayRef = useRef<TimeOfDay>('DAY');

  const hologramDomRef = useRef<HTMLDivElement>(null);
  const speedTextRef = useRef<HTMLSpanElement>(null);
  const gearTextRef = useRef<HTMLSpanElement>(null);
  const odoTextRef = useRef<HTMLSpanElement>(null);
  const rpmArcRef = useRef<HTMLDivElement>(null);

  // ⚡ Refs diretas no DOM para zerar gargalos de CPU/GPU no mobile
  const scoreTextRef = useRef<HTMLDivElement>(null);
  const distanceTextRef = useRef<HTMLDivElement>(null);
  const desktopSpeedRef = useRef<HTMLSpanElement>(null);
  const desktopGearRef = useRef<HTMLSpanElement>(null);
  const desktopDashRef = useRef<HTMLDivElement>(null);
  const sunFlareRef = useRef<HTMLDivElement>(null);
  const carPassBlurRef = useRef<HTMLDivElement>(null);
  const isHyperSpeedRef = useRef(false);
  const isBiteReadyRef = useRef(false);
  const qtePointerRef = useRef<HTMLDivElement>(null);
  const togglePauseRef = useRef<() => void>(() => {});

  const wheelieHudDomRef = useRef<HTMLDivElement>(null);
  const wheelieMetersTextRef = useRef<HTMLSpanElement>(null);
  const desktopWheelieTextRef = useRef<HTMLSpanElement>(null);
  const desktopWheelieLabelRef = useRef<HTMLSpanElement>(null);
  const bloodSplatterDomRef = useRef<HTMLDivElement>(null);
  const menuVideoRef = useRef<HTMLVideoElement>(null);

  const setWheelieMeters = useCallback((meters: number) => {
    if (wheelieHudDomRef.current) {
      wheelieHudDomRef.current.style.display = meters > 0 ? 'block' : 'none';
    }
    if (wheelieMetersTextRef.current) {
      wheelieMetersTextRef.current.textContent = String(meters);
    }
    if (desktopWheelieTextRef.current) {
      desktopWheelieTextRef.current.textContent = meters > 0 ? String(meters) : (gameRef.current?.distanceToMotoboy?.toFixed(1) || '12.0');
    }
    if (desktopWheelieLabelRef.current) {
      desktopWheelieLabelRef.current.textContent = meters > 0 ? 'GRAU (M)' : 'DISTÂNCIA';
    }
  }, []);

  const setBloodSplatterOpacity = useCallback((op: number) => {
    if (bloodSplatterDomRef.current) {
      bloodSplatterDomRef.current.style.display = op > 0.01 ? 'block' : 'none';
      bloodSplatterDomRef.current.style.opacity = op.toFixed(2);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // 🎬 Animação Dinâmica de Entrada no GameOver: Tremor de Tela e Dinheiro Subindo do 0 com Áudio de Score
  useEffect(() => {
    if (gameState === 'GAMEOVER' || gameState === 'VICTORY') {
      setIsGameOverShaking(true);
      const shakeTimeout = setTimeout(() => {
        setIsGameOverShaking(false);
      }, 700);

      // Zerar contadores visuais e subir progressivamente
      setAnimMoney10(0);
      setAnimMoney50(0);
      setAnimMoney100(0);
      setAnimTotalCollectedMoney(0);

      const target10 = earnedNotes10;
      const target50 = earnedNotes50;
      const target100 = earnedNotes100;
      const totalTarget = target10 * 10 + target50 * 50 + target100 * 100;

      const durationMs = 1500;
      const startTime = performance.now();
      let lastAudioTime = 0;

      const interval = setInterval(() => {
        const now = performance.now();
        const progress = Math.min(1, (now - startTime) / durationMs);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const current10 = Math.round(target10 * easeOut);
        const current50 = Math.round(target50 * easeOut);
        const current100 = Math.round(target100 * easeOut);
        const currentTotal = Math.round(totalTarget * easeOut);

        setAnimMoney10(current10);
        setAnimMoney50(current50);
        setAnimMoney100(current100);
        setAnimTotalCollectedMoney(currentTotal);

        // Disparo rítmico do som de dinheiro subindo
        if (now - lastAudioTime > 90 && progress < 1 && totalTarget > 0) {
          lastAudioTime = now;
          sound.playCoin();
        }

        if (progress >= 1) {
          clearInterval(interval);
          setAnimMoney10(target10);
          setAnimMoney50(target50);
          setAnimMoney100(target100);
          setAnimTotalCollectedMoney(totalTarget);
          if (totalTarget > 0) {
            sound.playCoin();
          }
        }
      }, 35);

      return () => {
        clearTimeout(shakeTimeout);
        clearInterval(interval);
      };
    } else {
      setIsGameOverShaking(false);
      setAnimMoney10(0);
      setAnimMoney50(0);
      setAnimMoney100(0);
      setAnimTotalCollectedMoney(0);
    }
  }, [gameState, earnedNotes10, earnedNotes50, earnedNotes100]);

  // 🪙 Sincronização de Moedas, Notas e Foto de Perfil com Storage
  useEffect(() => {
    const unsub = storage.subscribe(() => {
      const u = storage.getCurrentUser();
      if (u) {
        setUserCoins(u.ossoCoins);
        setHighScore(u.stats.maiorPontuacao);
        setUserNotes10(u.notas10 ?? Math.floor((u.ossoCoins || 0) / 10));
        setUserNotes50(u.notas50 ?? 0);
        setUserNotes100(u.notas100 ?? 0);
        if (u.profilePhotoUrl) {
          setCurrentUserPhoto(u.profilePhotoUrl);
        }
      }
    });
    return unsub;
  }, []);

  // 🛒 Compra de Skins com Moedas
  const handleBuyDogSkin = useCallback((skin: CarameloSkinConfig) => {
    const price = skin.price || 0;
    if (userCoins < price) {
      sound.playStumble();
      return;
    }
    const cu = storage.getCurrentUser();
    if (cu) {
      storage.adjustUserCoins(cu.id, -price);
    }
    const next = [...unlockedDogSkins, skin.id];
    setUnlockedDogSkins(next);
    localStorage.setItem('caramelorun_unlocked_dog_skins', JSON.stringify(next));
    setUserCoins((c) => Math.max(0, c - price));
    setEquippedDogSkinId(skin.id);
    localStorage.setItem('caramelorun_equipped_dog_skin', skin.id);
    if (gameRef.current.caramelo) {
      gameRef.current.caramelo.setSkin(skin.id);
    }
    sound.playPowerup();
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
  }, [userCoins, unlockedDogSkins]);

  const handleBuyMotoSkin = useCallback((moto: MotoboySkinConfig) => {
    const price = moto.price || 0;
    if (userCoins < price) {
      sound.playStumble();
      return;
    }
    const cu = storage.getCurrentUser();
    if (cu) {
      storage.adjustUserCoins(cu.id, -price);
    }
    const next = [...unlockedMotoSkins, moto.id];
    setUnlockedMotoSkins(next);
    localStorage.setItem('caramelorun_unlocked_moto_skins', JSON.stringify(next));
    setUserCoins((c) => Math.max(0, c - price));
    setEquippedMotoSkinId(moto.id);
    localStorage.setItem('caramelorun_equipped_moto_skin', moto.id);
    if (gameRef.current.motoboy) {
      gameRef.current.motoboy.setSkin(moto.id);
    }
    sound.playPowerup();
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
  }, [userCoins, unlockedMotoSkins]);

  const handleSpendCoins = useCallback((amount: number): boolean => {
    if (userCoins < amount) return false;
    const cu = storage.getCurrentUser();
    if (cu) {
      storage.adjustUserCoins(cu.id, -amount);
    }
    setUserCoins((c) => Math.max(0, c - amount));
    return true;
  }, [userCoins]);

  // ⚙️ Modal de Configurações, Marketing e Navegação
  const [isSettingsOpen, setIsSettingsOpen] = useState(startInSettings);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [isNavigatingLoading, setIsNavigatingLoading] = useState(false);
  const [navigatingMessage, setNavigatingMessage] = useState('Carregando jogo e lendo dados...');
  const [settingsTab, setSettingsTab] = useState<'gameplay' | 'graphics' | 'audio' | 'weather'>('gameplay');
  const [showModeSelectModal, setShowModeSelectModal] = useState(false);
  const [isPhotoSelectorOpen, setIsPhotoSelectorOpen] = useState(false);
  const [currentUserPhoto, setCurrentUserPhoto] = useState<string>(() => storage.getCurrentUser()?.profilePhotoUrl || '');
  const [graphicsQuality, setGraphicsQuality] = useState<'light' | 'medium' | 'maximum'>(() => {
    try {
      const saved = localStorage.getItem('caramelo_graphics_quality') as any;
      if (saved === 'light' || saved === 'medium' || saved === 'maximum') return saved;
      return 'light'; // Começa no modo Mínimo/Light por padrão
    } catch {
      return 'light';
    }
  });

  const triggerLoadingAction = useCallback((actionFn: () => void, message = 'Carregando jogo e lendo dados...') => {
    setNavigatingMessage(message);
    setIsNavigatingLoading(true);
    setTimeout(() => {
      actionFn();
      setTimeout(() => {
        setIsNavigatingLoading(false);
      }, 700);
    }, 80);
  }, []);

  const [carPassBlur, setCarPassBlur] = useState(0);
  const [pedestrianShadows, setPedestrianShadows] = useState<boolean>(() => {
    try {
      return localStorage.getItem('caramelo_pedestrian_shadows') === 'true';
    } catch {
      return false;
    }
  });

  const togglePedestrianShadows = useCallback(() => {
    setPedestrianShadows((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('caramelo_pedestrian_shadows', next ? 'true' : 'false');
      } catch {}
      if (gameRef.current.pedestrianSystem) {
        gameRef.current.pedestrianSystem.setShadowsEnabled(next);
      }
      return next;
    });
  }, []);

  const toggleGraphicsQuality = useCallback((quality: 'light' | 'medium' | 'maximum') => {
    setGraphicsQuality(quality);
    try {
      localStorage.setItem('caramelo_graphics_quality', quality);
    } catch {}

    const g = gameRef.current;
    if (g.renderer) {
      const isMob = typeof window !== 'undefined' && (
        /android|iphone|ipad|ipod|windows phone|mobile/i.test(navigator.userAgent) ||
        'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 850
      );
      if (quality === 'light') {
        g.renderer.shadowMap.enabled = false;
        g.renderer.setPixelRatio(1);
        setMaterialsAnisotropy(1);
        if (g.bloomPass) g.bloomPass.enabled = false;
      } else if (quality === 'medium') {
        g.renderer.shadowMap.enabled = false;
        g.renderer.setPixelRatio(isMob ? 1.0 : 1.25);
        setMaterialsAnisotropy(4);
        if (g.bloomPass) g.bloomPass.enabled = false;
      } else {
        g.renderer.shadowMap.enabled = !isMob;
        g.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        g.renderer.setPixelRatio(isMob ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.5));
        setMaterialsAnisotropy(isMob ? 1 : 16);
        if (g.bloomPass) g.bloomPass.enabled = !isMob;
      }
    }
    if (g.weather) {
      g.weather.setOptimizedMode(quality !== 'maximum');
    }
  }, []);

  const [invertTouchDirection, setInvertTouchDirection] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Mostra tutorial de deslizar o dedo (setas animadas) ao iniciar no celular
  useEffect(() => {
    if (gameState === 'PLAYING') {
      const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768);
      if (isTouch) {
        setShowSwipeTutorial(true);
        const t = setTimeout(() => {
          setShowSwipeTutorial(false);
        }, 4500);
        return () => clearTimeout(t);
      }
    } else {
      setShowSwipeTutorial(false);
    }
  }, [gameState]);

  // Game Loop Ref
  const gameRef = useRef({
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    composer: null as EffectComposer | null,
    bloomPass: null as UnrealBloomPass | null,
    animationFrameId: 0,
    caramelo: null as CarameloInstance | null,
    motoboy: null as MotoboyInstance | null,
    weather: null as ReturnType<typeof createWeatherLighting> | null,
    particles: null as ParticleSystem | null,
    traffic: null as TrafficManager | null,
    collidedCar: null as TrafficCar | null,
    spawnManager: null as SpawnManager | null,
    parallax: null as ParallaxSystem | null,
    pedestrianSystem: null as PedestrianSystem | null,
    gameplayAI: null as GameplayDirectorAI | null,
    activeTrees: [] as THREE.Group[],
    uiUpdateTimer: 0,
    dashRoll: 0,
    dashBobY: 0,
    wasRaining: false,
    chunks: [] as THREE.Group[],
    chunkIndices: [] as number[],
    speedBumps: [] as { mesh: THREE.Group; z: number; triggered: boolean }[],
    waterJets: [] as { mesh: THREE.Group; x: number; z: number; triggered: boolean; launchedMoto: boolean; dogHit?: boolean; tutorialTriggered?: boolean }[],
    npcMotoJumping: false,
    npcMotoJumpVy: 0,
    npcMotoY: 0,
    totalDistance: 0,
    crashReason: '' as string,
    hasPlayedCrashSound: false,
    // Physics
    currentSpeed: 16.5,
    baseMotoboySpeed: 19.0,
    motoboySpeed: 19.0,
    motoboyX: 0,
    prevMotoboyX: 0,
    targetMotoboyX: 0,
    motoboyBoostTimer: 0,
    motoboyBoostInterval: 8.0,
    coinCollectFadeTimer: 0,
    motoboyScreenPos: { x: 50, y: 35 },
    hologramX: 35,
    hologramY: 65,
    hologramTilt: 0,
    hologramOpacity: 0.92,
    targetPlayerX: 0,
    playerX: 0,
    playerY: 0,
    jumpVelocity: 0,
    isJumping: false,
    isMegaJumping: false,
    airFlipsCount: 0,
    airFlipRotation: 0,
    airRotationAccum: 0,
    airStuntScore: 0,
    airStuntComboName: '',
    wheelieAngle: 0,
    wheelieDistance: 0,
    wheelieDuration: 0,
    wheelieTilt: 0,
    lastWheelieTierIndex: -1,
    straightLineFactor: 1.0,
    cameraRoll: 0,
    potholeHitsCount: 0,
    distanceToMotoboy: 9.5,
    stumbleTimer: 0,
    biteLungeTimer: 0,
    explodingTimer: 0,
    motoboyExplodingTimer: 0,
    speechTimer: 2.0,
    damagePopTimer: 0,
    barkProximityTimer: 0,
    boneEnergy: 0,
    superTurboTimer: 0,
    // 🐕 Estamina e Sprint do Cachorro
    dogStamina: 100,
    isDogSprinting: false,
    scoreAcc: 0,
    coinsAcc: 0,
    notes10Acc: 0,
    notes50Acc: 0,
    notes100Acc: 0,
    spawned100Count: 0,
    bitesAcc: 0,
    runTimeSec: 0,
    running: false,
    cameraShakeTimer: 0,
    cameraShakeIntensity: 0,
    keys: { left: false, right: false, jump: false, bite: false, accelerate: false, frontFlip: false, backFlip: false },
    touchStartX: 0,
    touchStartY: 0,
    // Motoboy Mode specifics
    gameMode: 'caramelo' as GameMode,
    mbLives: MOTOBOY_MODE_MAX_LIVES,
    motoboyBossLives: 10,
    carameloLives: 10,
    carameloInvincibleTimer: 0,
    mbDogX: 0,
    mbDogTargetX: 0,
    mbDogBiteCooldown: 0,
    mbDogSprintTimer: 0,
    mbDogSprintInterval: 10.0,
    mbInvincibleTimer: 0,
    mbKickTimer: 0,
    mbKickCooldown: 0,
    stumblesInRow: 0,
    stumbleRecoverTimer: 0,
    // Camera event system (zoom out + show caramelo on cone/pothole collision)
    cameraEventTimer: 0,
    bloodSplatterTimer: 0,
    isCutsceneActive: false,
    isGameActive: false,
    isGameOver: false,
    startSlowMoTimer: 0,
    startSlowMoDuration: 1.8,
    isWaterJetPaused: false,
    hasPassedWaterTutorial: false,
    curbCooldown: 0,
    curbStreak: 0,
    curbStreakResetTimer: 0,
    curbChaseTimer: 0,
    carameloOnBikeTimer: 0,
    motoboyTargetX: 0,
    airFlipCount: 0,
  });

  const finishCutscene = useCallback(() => {
    setShowCutscene(false);
    setGameState('PLAYING');
    const g = gameRef.current;
    g.isCutsceneActive = false;
    g.running = true;
    g.runTimeSec = 0;
    if (g.traffic) g.traffic.reset();
    if (g.spawnManager) g.spawnManager.reset(g.gameMode);
    if (g.pedestrianSystem) g.pedestrianSystem.reset();
    sound.startMusic();
  }, []);

  // Jump action
  const executeJump = useCallback(() => {
    const g = gameRef.current;
    if (!g.running || g.isJumping || g.explodingTimer > 0) return;
    g.isJumping = true;
    g.jumpVelocity = 8.8;
    if (g.gameMode === 'caramelo') {
      sound.playCustomBark();
    }
  }, []);



  // ⚡ ATIVAR O DESAFIO DE MORDIDA AO CLICAR NO ALVO ATRÁS DO MOTOBOY OU APERTAR ESPAÇO
  const triggerBiteChallenge = useCallback(() => {
    const g = gameRef.current;
    if (!g.running || g.gameMode !== 'caramelo' || dogQTERef.current.active || qteCooldownRef.current > 0 || g.motoboyBossLives <= 0) return;
    isQTEProcessingHitRef.current = false;
    dogQTERef.current = {
      active: true,
      timeLeft: 2.4,
      duration: 2.4,
      lineProgress: 10,
      direction: 1,
      oscSpeed: 110,
    };
    setDogQTE({
      active: true,
      timeLeft: 2.4,
      duration: 2.4,
      lineProgress: 10,
    });
    sound.playCustomBark();
  }, []);

  // 🦷 ANIMAÇÃO DAS DUAS IMAGENS DE MORDIDA GRUDADA NA TRASEIRA DO MOTOBOY
  const triggerBiteImagesSequence = useCallback(() => {
    const g = gameRef.current;
    const biteX = g.motoboyScreenPos?.x ?? 50;
    const biteY = Math.min(85, (g.motoboyScreenPos?.y ?? 45) + 6.5);
    setBiteAnimPos({ x: biteX, y: biteY });
    setBiteAnimStage('open');
    biteAnimStageRef.current = 'open';

    // ✨ MOTOBOY FICA VERMELHO VIVO PERDENDO VIDA!
    if (g.motoboy?.triggerDamageFlash) {
      g.motoboy.triggerDamageFlash(2.5);
    }
    setScreenRedFlash(true);

    // Transição fluida para boca fechada cravando os dentes
    setTimeout(() => {
      setBiteAnimStage('closed');
      biteAnimStageRef.current = 'closed';
      sound.playBite();
      setScreenRedFlash(false);
      if (g.particles && g.motoboy) {
        g.particles.emitBiteImpact(g.motoboyX, 0.65, g.distanceToMotoboy);
        g.particles.emitBloodSplatter(g.motoboyX, 0.65, g.distanceToMotoboy, 35);
      }
    }, 160);

    // Conclui animação
    setTimeout(() => {
      setBiteAnimStage(null);
      biteAnimStageRef.current = null;
      setScreenRedFlash(false);
    }, 580);
  }, []);

  // 🎯 SUCESSO NO DESAFIO DE REAÇÃO RÁPIDA (ACERTAR A LINHA NO MEIO)
  const handleDogQTEHit = useCallback(() => {
    const qte = dogQTERef.current;
    // Trava estrita contra cliques múltiplos, chamadas duplicadas ou fora do tempo
    if (!qte.active || qte.timeLeft <= 0 || isQTEProcessingHitRef.current) return;
    isQTEProcessingHitRef.current = true;

    const g = gameRef.current;
    if (!g.running || g.explodingTimer > 0 || g.motoboyExplodingTimer > 0) return;

    const hitPosition = qte.lineProgress; // Posição atual da linha (0 a 100%)
    const isCenterHit = hitPosition >= 36 && hitPosition <= 64; // Zona central no meio da barra
    const isBullseye = hitPosition >= 46 && hitPosition <= 54;  // Bem no centro exato!

    // Fecha o painel do desafio imediatamente
    qte.active = false;
    dogQTERef.current.active = false;
    setDogQTE((prev) => ({ ...prev, active: false }));

    if (isCenterHit) {
      // 🎯 ACERTOU PERFEITAMENTE O MEIO! (SUCESSO NA MORDIDA)
      sound.playBite();
      sound.playCustomBark();
      g.biteLungeTimer = 0.55;
      g.bitesAcc += 1;
      const pts = isBullseye ? 1200 : 700;
      g.scoreAcc += pts;
      g.coinsAcc += 25;

      // 🦷 EXECUTA ANIMAÇÃO DE MORDIDA COM O MOTOBOY PISCANDO EM VERMELHO
      triggerBiteImagesSequence();

      // Remove exatamente 1 coração do Motoboy (de 10 corações)
      g.motoboyBossLives = Math.max(0, g.motoboyBossLives - 1);
      setMotoboyBossLives(g.motoboyBossLives);
      setBitesCount(g.bitesAcc);
      setBiteCombo((prev) => prev + 1);
      setScore(Math.floor(g.scoreAcc));
      setOssoCoinsEarned(g.coinsAcc);

      // Efeitos visuais e impacto
      if (g.motoboy) {
        g.motoboy.triggerBiteDamage();
      }
      g.bloodSplatterTimer = 0.85;
      setBloodSplatterOpacity(0.95);

      const react = BITE_REACTIONS[Math.floor(Math.random() * BITE_REACTIONS.length)];
      setMotoboySpeech(react);
      g.speechTimer = 2.4;

      setDamagePop(
        isBullseye 
          ? `🎯 NA MOSCA! NO MEIO EXATO! -1 ❤️ (Motoboy: ${g.motoboyBossLives}/10)`
          : `🎯 ACERTOU NO MEIO! -1 ❤️ (Motoboy: ${g.motoboyBossLives}/10)`
      );
      g.damagePopTimer = 2.0;

      confetti({
        particleCount: 50,
        spread: 85,
        origin: { y: 0.65 },
        colors: ['#22C55E', '#EAB308', '#EF4444'],
      });

      // 🛵 O MOTOBOY SOFRE DANO E FOGE IMEDIATAMENTE EM DISPARADA!
      g.distanceToMotoboy = 15.0;
      g.motoboyBoostTimer = 3.2;
      g.motoboyBoostInterval = 7.0;

      // O bote consome fôlego do cachorro (-20% de estamina), incentivando a buscar novos ossos na pista
      g.dogStamina = Math.max(10, g.dogStamina - 20);
      dogStaminaRef.current = g.dogStamina;
      setDogStamina(g.dogStamina);
      if (dogStaminaBarRef.current) {
        dogStaminaBarRef.current.style.width = `${g.dogStamina}%`;
      }
      if (dogStaminaTextRef.current) {
        dogStaminaTextRef.current.textContent = `${Math.round(g.dogStamina)}%`;
      }

      // Cooldown para evitar que o desafio reabra instantaneamente
      qteCooldownRef.current = 4.0;

      // Vitória quando todos os 10 corações forem arrancados!
      if (g.motoboyBossLives <= 0) {
        sound.playWin();
        g.motoboyExplodingTimer = 1.6;
        setTimeout(() => {
          endGame('🏆 O Caramelo arrancou todos os corações do motoboy e resgatou a pizza!', true);
        }, 1300);
      }
    } else {
      // 💨 ERROU O MEIO! (Apertou fora da zona verde central)
      sound.playStumble();
      setDamagePop('💨 ERROU O MEIO! O Motoboy acelerou e fugiu!');
      g.damagePopTimer = 1.8;
      // Motoboy foge imediatamente sem perder coração
      g.distanceToMotoboy = Math.min(14.5, g.distanceToMotoboy + 4.5);
      g.motoboyBoostTimer = 2.4;
      qteCooldownRef.current = 3.5;
    }
  }, []);

  // 🌊 DESVIO DO JATO DE ÁGUA (RETOMA A GAMEPLAY E EXIBE BALÃO "PARABÉNS!")
  const handleWaterJetDodge = useCallback((direction: 'left' | 'right') => {
    const g = gameRef.current;
    if (!g.isWaterJetPaused) return;

    // Desvia com precisão cirúrgica na visão da câmera 3D: Direita = -2.2 (faixa direita na tela), Esquerda = +2.2 (faixa esquerda na tela)
    const targetLaneX = direction === 'right' ? -2.2 : 2.2;
    g.targetPlayerX = targetLaneX;
    g.playerX = targetLaneX;
    g.targetMotoboyX = targetLaneX;
    g.motoboyX = targetLaneX;

    // Retoma imediatamente a gameplay e volta à velocidade normal
    g.isWaterJetPaused = false;
    g.hasPassedWaterTutorial = true;
    g.startSlowMoTimer = 0;
    setIsSlowMoActive(false);
    setWaterJetTutorialActive(false);

    // Efeito sonoro agradável e elevação gradual e empolgante da trilha da gameplay
    sound.playWhoosh();
    sound.boostGameplayMusicIntensity(0.46, 1.8);

    // Mostra balão de fala animado com a mensagem "Parabéns!"
    setMotoboySpeech('🎉 Parabéns! Desvio perfeito!');
    g.speechTimer = 2.8;
    setDamagePop('⚡ DESVIO PERFEITO! +500 PTS');
    g.damagePopTimer = 1.6;
    g.scoreAcc += 500;
    setScore(Math.floor(g.scoreAcc));
  }, []);

  // Bridge para teste e automação da sequência do Jato de Água
  useEffect(() => {
    (window as any).__triggerWaterJetTutorial = () => {
      gameRef.current.isWaterJetPaused = true;
      setWaterJetTutorialActive(true);
    };
    (window as any).__dodgeWaterJet = (dir: 'left' | 'right') => {
      handleWaterJetDodge(dir);
    };
  }, [handleWaterJetDodge]);

  // Action (Desafio do Cão em Modo Caramelo / Chute em Modo Motoboy)
  const executeAction = useCallback(() => {
    const g = gameRef.current;
    if (!g.running || g.explodingTimer > 0) return;

    if (g.gameMode === 'caramelo') {
      if (dogQTERef.current.active) {
        handleDogQTEHit();
      } else {
        const canTrigger = g.distanceToMotoboy <= 4.2 && Math.abs(g.motoboyX - g.playerX) < 1.95 && qteCooldownRef.current <= 0 && g.motoboyBossLives > 0;
        if (canTrigger) {
          triggerBiteChallenge();
        } else {
          setDamagePop('⚠️ Aproxime-se do motoboy para morder!');
          g.damagePopTimer = 1.0;
        }
      }
    } else if (g.gameMode === 'motoboy') {
      if (g.mbKickCooldown > 0) return;

      g.mbKickTimer = 0.3;
      g.mbKickCooldown = 2.0;

      // Kick hits the dog if it's close enough!
      const inRange = g.distanceToMotoboy <= 4.5 && Math.abs(g.mbDogX - g.motoboyX) < 1.6;
      if (inRange) {
        sound.playStumble();
        g.distanceToMotoboy = Math.min(22.0, g.distanceToMotoboy + 6.0);
        g.scoreAcc += 250;
        setScore(Math.floor(g.scoreAcc));

        setDamagePop('🥾 CHUTE! TOMA CACHORRO!');
        g.damagePopTimer = 1.0;
        setMotoboySpeech('SAI PRA LÁ! 🥾💨');
        g.speechTimer = 1.5;

        if (g.particles) {
          g.particles.emitBiteImpact(g.mbDogX, 0.5, g.distanceToMotoboy);
        }
      }
    }
  }, []);

  // Alias for bite button in Caramelo Mode
  const executeBite = executeAction;

  // ⏸️ Alternar Pausa (Congela movimento dos personagens, perseguição e gameplay sem tocar música do menu)
  const togglePause = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    setIsGamePaused((prev) => {
      const next = !prev;
      isGamePausedRef.current = next;
      // 🎶 Não toca a música do menu na pausa: apenas atenua suavemente o volume da gameplay
      sound.setGameplayPausedVolume(next);
      return next;
    });
  }, [gameState]);

  togglePauseRef.current = togglePause;

  // 🏠 Abandonar Partida Sem Recompensas (Confirmação segura)
  const handleConfirmAbandon = useCallback(() => {
    setShowQuitConfirm(false);
    setIsGamePaused(false);
    isGamePausedRef.current = false;
    setIsQuickOptionsOpen(false);

    const g = gameRef.current;
    g.running = false;
    cancelAnimationFrame(g.animationFrameId);
    sound.stopMusic();
    sound.startMenuMusic(); // Retoma música suave do menu

    if (onBackToMenu) {
      onBackToMenu();
    } else {
      setGameState('IDLE');
    }
  }, [onBackToMenu]);

  // Trigger floating coin animation no ponto exato da rua onde foi coletada
  const triggerFloatingCoin = useCallback((customX?: number, customY?: number, banknoteVal: 10 | 50 | 100 = 10) => {
    const newId = Date.now() + Math.random();
    const g = gameRef.current;
    // 🪙 Quando coleta moedas, o painel holográfico vai ficando suavemente invisível/translúcido
    g.coinCollectFadeTimer = 1.35;
    const posX = typeof customX === 'number' ? customX : (g.gameMode === 'motoboy' ? g.motoboyScreenPos.x : 50);
    const posY = typeof customY === 'number' ? customY : (g.gameMode === 'motoboy' ? g.motoboyScreenPos.y : 60);
    setFloatingCoins((prev) => [...prev.slice(-8), { id: newId, x: posX, y: posY, value: banknoteVal }]);
    setTimeout(() => {
      setFloatingCoins((prev) => prev.filter((c) => c.id !== newId));
    }, 950);
  }, []);

  const triggerFloatingCoinRef = useRef(triggerFloatingCoin);
  triggerFloatingCoinRef.current = triggerFloatingCoin;

  // 💧 Disparo de gotas de água na tela e na câmera
  const triggerWaterSplatter = useCallback(() => {
    const drops = [];
    const count = 22 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      drops.push({
        id: Date.now() + i + Math.random(),
        x: Math.random() * 90 + 5,
        startY: Math.random() * 55 + 5,
        size: Math.random() * 20 + 16,
        slideDist: Math.random() * 60 + 35,
        delay: Math.random() * 0.25,
        duration: Math.random() * 1.5 + 2.0,
        scaleX: 0.85 + Math.random() * 0.3,
        scaleY: 1.1 + Math.random() * 0.45,
      });
    }
    setWaterDrops(drops);
    setWaterSplatterActive(true);

    if (waterSplatterTimeoutRef.current) {
      clearTimeout(waterSplatterTimeoutRef.current);
    }
    waterSplatterTimeoutRef.current = setTimeout(() => {
      setWaterSplatterActive(false);
    }, 3600);
  }, []);

  const triggerWaterSplatterRef = useRef(triggerWaterSplatter);
  triggerWaterSplatterRef.current = triggerWaterSplatter;

  // End Game
  const endGame = useCallback(
    (reason: string, isVictory = false) => {
      const g = gameRef.current;
      // 🛑 TRAVA DE SEGURANÇA ABSOLUTA: Se já estiver em Game Over, nunca reexecuta nem troca a imagem!
      if (g.isGameOver) return;
      g.isGameOver = true;
      g.running = false;
      // 🎵 Deixa a música tocando bem baixa e com clima abafado cinematográfico no game over
      sound.setGameOverMuffledVolume();
      setGameState(isVictory ? 'VICTORY' : 'GAMEOVER');
      setGameOverReason(reason);

      // 📸 Gera a foto da quebrada e NUNCA troca se já estiver definida nesta derrota
      setGameOverImage((prevImg) => {
        if (prevImg) return prevImg;
        return getNextGameOverImage();
      });

      if (isVictory) {
        sound.playWin();
      } else if (!g.hasPlayedCrashSound) {
        sound.playCrash();
      }
      g.hasPlayedCrashSound = false;

      const finalScore = Math.floor(g.scoreAcc);
      setScore(finalScore);
      setSpeedKmh(Math.round(g.currentSpeed * 3.6));
      setOssoCoinsEarned(g.coinsAcc);
      setBitesCount(g.bitesAcc);
      storage.submitGameScore(
        finalScore,
        g.bitesAcc,
        Math.floor(g.runTimeSec * 2),
        Math.max(1, Math.floor(g.runTimeSec)),
        { n10: g.notes10Acc, n50: g.notes50Acc, n100: g.notes100Acc }
      );
      // Atualizar saldos de notas do usuário no estado local
      const curU = storage.getCurrentUser();
      if (curU) {
        setUserNotes10(curU.notas10 ?? 0);
        setUserNotes50(curU.notas50 ?? 0);
        setUserNotes100(curU.notas100 ?? 0);
      }
      if (finalScore > highScore) {
        setHighScore(finalScore);
      }
      if (onGameOver) {
        onGameOver(finalScore, g.bitesAcc);
      }
    },
    [highScore, onGameOver]
  );

  const endGameRef = useRef(endGame);
  endGameRef.current = endGame;
  const executeActionRef = useRef(executeAction);
  executeActionRef.current = executeAction;
  const executeJumpRef = useRef(executeJump);
  executeJumpRef.current = executeJump;
  const handleWaterJetDodgeRef = useRef(handleWaterJetDodge);
  handleWaterJetDodgeRef.current = handleWaterJetDodge;

  // Start Game com transição suave de Fade Escuro
  const startGame = useCallback((mode: GameMode = 'caramelo') => {
    // 🎬 Ativa fade escuro cinematográfico antes de começar a partida
    setScreenFadeBlack(1);

    // ⚡ Desacoplamento do Menu: Pausa o vídeo do menu imediatamente para liberar a GPU
    if (menuVideoRef.current) {
      try {
        menuVideoRef.current.pause();
      } catch (_) {}
    }

    setTimeout(() => {
      if (mode === 'caramelo') {
        sound.playCustomBark();
      }
      const g = gameRef.current;
      if (g.weather) {
        g.weather.resetToDay();
        setCurrentTimeOfDay('DAY');
      }
      const currentMaxLives = getMaxLives(difficultyRef.current);
      const diffConfig = DIFFICULTY_CONFIGS[difficultyRef.current];

    g.isGameActive = true;
    g.isGameOver = false;
    g.gameMode = mode;
    g.currentSpeed = diffConfig.initialPlayerSpeed;
    g.baseMotoboySpeed = mode === 'caramelo' ? diffConfig.initialMotoboySpeed : (diffConfig.initialPlayerSpeed + 1.0);
    g.motoboySpeed = mode === 'caramelo' ? diffConfig.initialMotoboySpeed : (diffConfig.initialPlayerSpeed + 1.0);
    g.motoboyX = 0;
    g.targetMotoboyX = 0;
    g.motoboyBoostTimer = 0;
    g.motoboyBoostInterval = 6.0 + Math.random() * 4.0;
    g.distanceToMotoboy = mode === 'motoboy' ? 14.0 : 18.0;
    if (g.camera) {
      if (mode === 'motoboy') {
        g.camera.position.set(0, 2.55, g.distanceToMotoboy - 4.85);
        g.camera.lookAt(0, 0.85, g.distanceToMotoboy + 14);
      } else {
        // Câmera esportiva e cinematográfica bem próxima do Caramelo
        g.camera.position.set(0, 2.05, -2.75);
        g.camera.lookAt(0, 0.90, 12);
      }
    }

    // ⚡ Pré-compilação e aquecimento da GPU no 3D durante o loading para zero travamentos
    if (g.renderer && g.scene && g.camera) {
      try {
        g.renderer.compile(g.scene, g.camera);
        g.renderer.render(g.scene, g.camera);
      } catch (e) {}
    }
    g.playerX = 0;
    g.targetPlayerX = 0;
    g.playerY = 0;
    g.jumpVelocity = 0;
    g.isJumping = false;
    g.wheelieAngle = 0;
    g.wheelieTilt = 0;
    g.wheelieDistance = 0;
    g.wheelieDuration = 0;
    g.lastWheelieTierIndex = -1;
    g.keys = { left: false, right: false, jump: false, bite: false, accelerate: false, frontFlip: false, backFlip: false };
    g.boneEnergy = 0;
    g.superTurboTimer = 0;
    g.dogStamina = 100;
    g.isDogSprinting = false;
    dogStaminaRef.current = 100;
    setDogStamina(100);
    g.scoreAcc = 0;
    g.coinsAcc = 0;
    g.bitesAcc = 0;
    g.runTimeSec = 0;
    g.totalDistance = 0;
    g.stumbleTimer = 0;
    g.biteLungeTimer = 0;
    g.explodingTimer = 0;
    g.motoboyExplodingTimer = 0;
    g.speechTimer = 1.5;
    g.damagePopTimer = 0;
    g.barkProximityTimer = 0;
    g.cameraShakeTimer = 0;
    g.cameraShakeIntensity = 0;
    g.hasPlayedCrashSound = false;

    // Vidas e estados específicos de cada modo:
    // Modo Caramelo: Motoboy possui 10 corações fixos; Caramelo possui vidas conforme a dificuldade (10 Fácil, 5 Médio, 3 Difícil)
    g.motoboyBossLives = 10;
    setMotoboyBossLives(10);
    g.carameloLives = currentMaxLives;
    setCarameloLives(currentMaxLives);
    g.carameloInvincibleTimer = 0;
    isQTEProcessingHitRef.current = false;

    // Modo Motoboy: Motoboy possui vidas conforme a dificuldade
    g.mbLives = currentMaxLives;
    setLives(currentMaxLives);

    dogQTERef.current = {
      active: false,
      timeLeft: 0,
      duration: 2.4,
      lineProgress: 50,
      direction: 1,
      oscSpeed: 115,
    };
    setDogQTE({ active: false, timeLeft: 0, duration: 2.4, lineProgress: 50 });
    qteCooldownRef.current = 2.5;
    g.mbDogX = 0;
    g.mbDogTargetX = 0;
    g.mbDogBiteCooldown = 3.0; // first bite after 3 seconds
    g.mbDogSprintTimer = 0;
    g.mbDogSprintInterval = 8.0 + Math.random() * 4.0;
    g.mbInvincibleTimer = 0;
    g.mbKickTimer = 0;
    g.mbKickCooldown = 0;
    g.stumblesInRow = 0;
    g.stumbleRecoverTimer = 0;
    g.cameraEventTimer = 0;
    g.curbCooldown = 0;
    g.curbStreak = 0;
    g.curbStreakResetTimer = 0;
    g.curbChaseTimer = 0;
    g.carameloOnBikeTimer = 0;

    if (g.caramelo) {
      g.caramelo.group.position.set(0, 0, mode === 'motoboy' ? -20 : 0);
      g.caramelo.group.rotation.set(0, 0, 0);
      g.caramelo.group.scale.set(1, 1, 1);
      g.caramelo.group.visible = mode !== 'motoboy' ? false : true;
      if (mode === 'caramelo') g.caramelo.group.visible = true;
    }

    if (g.motoboy) {
      g.motoboy.group.position.set(0, 0, mode === 'motoboy' ? 12 : 18);
      g.motoboy.group.rotation.set(0, 0, 0);
      g.motoboy.group.scale.set(1, 1, 1);
      g.motoboy.group.visible = true;
    }

    g.potholeHitsCount = 0;
    g.isMegaJumping = false;
    g.airFlipsCount = 0;
    g.airFlipRotation = 0;
    g.airRotationAccum = 0;
    g.airStuntScore = 0;
    g.airStuntComboName = '';
    setIsMegaJumping(false);
    setAirFlipsCount(0);
    setAirStuntScore(0);
    setAirStuntComboName(null);

    g.speedBumps.forEach((sb) => {
      if (sb.mesh.parent) sb.mesh.parent.remove(sb.mesh);
    });
    g.speedBumps = [];
    if (g.scene) {
      // 🛹 Lombadas espaçadas com intervalo amplo para não ficarem aparecendo a todo momento
      for (const z of [95, 240]) {
        const bump = createSpeedBump();
        bump.position.set(0, 0, z);
        g.scene.add(bump);
        g.speedBumps.push({
          mesh: bump,
          z,
          triggered: false,
        });
      }
    }

    g.waterJets.forEach((wj) => {
      if (wj.mesh.parent) wj.mesh.parent.remove(wj.mesh);
    });
    g.waterJets = [];
    g.npcMotoJumping = false;
    g.npcMotoJumpVy = 0;
    g.npcMotoY = 0;
    g.crashReason = '';
    // Bueiros com Jatos de Água: Primeiro jato a 58m para exibir o indicador pulando e o horizonte livre antes de espirrar
    const initialJets = [
      { x: 0, z: mode === 'motoboy' ? 58 : 48 },
    ];
    if (g.scene) {
      initialJets.forEach((ij) => {
        const manhole = createManhole();
        manhole.position.set(ij.x, 0.03, ij.z);
        g.scene!.add(manhole);
        g.waterJets.push({
          mesh: manhole,
          x: ij.x,
          z: ij.z,
          triggered: false,
          launchedMoto: false,
          dogHit: false,
        });
      });
    }

    if (g.particles) g.particles.clear();
    if (g.chunks && g.chunks.length > 0) {
      g.chunks.forEach((chunk, idx) => {
        chunk.position.z = idx * CHUNK_LENGTH;
        g.chunkIndices[idx] = idx;
        applyChunkRoadSurface(chunk, CHUNK_LENGTH, idx);
      });
    }
    if (g.traffic) {
      g.traffic.reset();
      g.traffic.setDifficulty(difficultyRef.current);
    }
    if (g.spawnManager) {
      g.spawnManager.reset(mode);
      g.spawnManager.setDifficulty(difficultyRef.current);
    }
    if (g.pedestrianSystem) g.pedestrianSystem.reset();

    // ⚡ AQUECIMENTO DEFINITIVO NA TELA PRETA (ELIMINA 100% DO TRAVAMENTO NA 1ª CORRIDA):
    // Força a GPU e CPU a compilarem antecipadamente geometrias, shaders do bueiro, geyser, partículas e WebAudio
    try {
      sound.warmUpWebAudio();
    } catch (_) {}

    if (g.renderer && g.scene && g.camera) {
      try {
        if (g.particles) {
          g.particles.warmUp(g.renderer, g.camera, g.composer);
        }
        warmUpManholeSharedAssets(g.renderer, g.camera, g.scene, g.composer);

        // Ativa temporariamente o jato de água do primeiro bueiro na GPU por 1 frame invisível
        if (g.waterJets.length > 0 && (g.waterJets[0].mesh as any).userData?.waterGroup) {
          const wg = (g.waterJets[0].mesh as any).userData.waterGroup;
          wg.visible = true;
          wg.scale.set(1, 1, 1);
          g.renderer.render(g.scene, g.camera);
          if (g.composer && typeof g.composer.render === 'function') {
            try { g.composer.render(); } catch (_) {}
          }
          wg.visible = false;
          wg.scale.set(0.01, 0.01, 0.01);
        }

        const gl = g.renderer.getContext();
        if (gl && typeof gl.finish === 'function') {
          gl.finish();
        }
      } catch (e) {
        console.warn('[StartGame WarmUp]', e);
      }
    }

    setGameMode(mode);
    setScore(0);
    setBitesCount(0);
    setOssoCoinsEarned(0);
    g.notes10Acc = 0;
    g.notes50Acc = 0;
    g.notes100Acc = 0;
    g.spawned100Count = 0;
    setEarnedNotes10(0);
    setEarnedNotes50(0);
    setEarnedNotes100(0);
    // 💵 Spawnar a 1ª nota rara de 100 exatamente na frente do primeiro jato d'água (desafio)
    if (g.spawnManager && initialJets.length > 0) {
      g.spawnManager.spawnRareBanknote100At(initialJets[0].x, initialJets[0].z - 4.5);
      g.spawned100Count = 1;
    }
    setBiteCombo(0);
    setMotoboyDistance(mode === 'motoboy' ? 12.0 : 18.0);
    setIsBiteReady(false);
    setMotoboySpeech(null);
    setDamagePop(null);
    setWheelieMeters(0);
    setFloatingWheelies([]);
    setLives(currentMaxLives);
    setGameOverImage(null);

    // 🚀 Início direto da gameplay sem tela ou sequência de créditos antes da partida
    g.isGameOver = false;
    g.isCutsceneActive = false;
    g.running = true;
    setShowCutscene(false);
    setShowIntroCinematic(false);
    setGameState('PLAYING');
    sound.startMusic();

    // 🎬 Efeito cinematográfico de câmera lenta suave no início da partida (apenas no modo motoboy)
    if (mode === 'caramelo') {
      g.startSlowMoTimer = 0;
      g.startSlowMoDuration = 0;
      setIsSlowMoActive(false);
      g.isWaterJetPaused = false;
      g.hasPassedWaterTutorial = true;
      setWaterJetTutorialActive(false);
    } else {
      g.startSlowMoTimer = 2.4;
      g.startSlowMoDuration = 2.4;
      setIsSlowMoActive(true);
      g.isWaterJetPaused = false;
      g.hasPassedWaterTutorial = false;
      setWaterJetTutorialActive(false);
    }

    // 🎬 Fade in suave clareando a tela revelando o jogo em andamento
      setTimeout(() => {
        setScreenFadeBlack(0);
      }, 100);
    }, 280);
  }, [endGame]);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1') {
      setIsLoading(false);
      const t = setTimeout(() => {
        startGame('motoboy');
      }, 250);
      return () => clearTimeout(t);
    }
  }, [startGame]);

  // Initialize Three.js 3D Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0284c7);
    scene.fog = new THREE.FogExp2(0x38bdf8, 0.0016);

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 750);
    camera.up.set(0, 1, 0);
    camera.position.set(0, 2.05, -2.75);
    camera.lookAt(0, 0.90, 12);

    // 📱 Detecção mobile robusta para otimização máxima de rendering
    const isMobileDevice = typeof window !== 'undefined' && (
      /android|iphone|ipad|ipod|windows phone|mobile/i.test(navigator.userAgent) ||
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 850 || window.innerHeight > window.innerWidth
    );
    const initGfx = graphicsSettingsRef.current;
    let safeDpr = 1.0;
    if (initGfx.preset === 'low') {
      safeDpr = isMobileDevice ? 0.75 : Math.min(window.devicePixelRatio || 1, 1.0) * 0.85;
    } else if (initGfx.preset === 'medium') {
      safeDpr = isMobileDevice ? 0.85 : Math.min(window.devicePixelRatio || 1, 1.0);
    } else if (initGfx.preset === 'high') {
      safeDpr = isMobileDevice ? 0.9 : Math.min(window.devicePixelRatio || 1, 1.0);
    } else {
      safeDpr = isMobileDevice ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.05);
    }
    const initialPixelRatio = Math.min(1.05, Math.max(0.5, safeDpr * initGfx.resolutionScale));

    const renderer = new THREE.WebGLRenderer({
      antialias: initGfx.antialias && !isMobileDevice && initGfx.preset !== 'low', // Desliga antialias no LOW para máximo ganho de FPS
      powerPreference: 'high-performance',
      precision: isMobileDevice ? 'mediump' : 'highp',
      stencil: false,
      depth: true,
      alpha: false, // 🚀 Comunica ao compositor do navegador que o canvas é 100% opaco para máxima performance
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(initialPixelRatio);
    renderer.shadowMap.enabled = initGfx.shadows !== 'off' && initGfx.preset !== 'low' && initGfx.preset !== 'medium' && !isMobileDevice;
    renderer.shadowMap.type = initGfx.shadows === 'soft' ? THREE.PCFShadowMap : THREE.BasicShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const maxAniso = initGfx.preset === 'low' || isMobileDevice ? 1 : renderer.capabilities.getMaxAnisotropy();
    setMaterialsAnisotropy(maxAniso);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const weather = createWeatherLighting(scene);

    const asphaltMaps = createAsphaltTexture();
    const sidewalkMaps = createSidewalkTexture();

    const roadMat = new THREE.MeshStandardMaterial({
      map: asphaltMaps.map,
      roughnessMap: asphaltMaps.roughnessMap,
      bumpMap: asphaltMaps.bumpMap,
      bumpScale: 0.04,
      roughness: 0.75,
      metalness: 0.1,
    });

    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: sidewalkMaps.map,
      bumpMap: sidewalkMaps.bumpMap,
      bumpScale: 0.03,
      roughness: 0.85,
    });

    const curbMat = getSharedMaterials().curb;
    const yellowDashMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    applyAtmosphericPerspective(roadMat, { lod: 'road_terrain' });
    applyAtmosphericPerspective(sidewalkMat, { lod: 'road_terrain' });
    applyAtmosphericPerspective(curbMat, { lod: 'road_terrain' });
    applyAtmosphericPerspective(yellowDashMat, { lod: 'road_terrain' });
    applyAtmosphericPerspective(whiteLineMat, { lod: 'road_terrain' });

    const carameloInstance = buildCaramelo(equippedDogSkinId || equippedSkin);
    carameloInstance.group.position.set(0, 0, 0);
    scene.add(carameloInstance.group);

    const motoboyInstance = buildMotoboy(equippedMotoSkinId);
    motoboyInstance.group.position.set(0, 0, 12);
    scene.add(motoboyInstance.group);

    const particleSystem = new ParticleSystem(scene);
    const trafficManager = new TrafficManager(scene);
    trafficManager.setDifficulty(difficultyRef.current);
    const gameplayAI = new GameplayDirectorAI();
    trafficManager.onNearMiss = (car) => {
      gameplayAI.triggerNearMiss(!!car.isTruck, (pts, msg) => {
        gameRef.current.scoreAcc += pts;
        setDamagePop(msg);
        gameRef.current.damagePopTimer = 1.4;
      });
    };
    const spawnManager = new SpawnManager(scene);
    spawnManager.setMode(gameMode);
    spawnManager.setDifficulty(difficultyRef.current);
    try {
      spawnManager.prewarmPool(renderer, camera);
    } catch (_) {}
    const parallaxSystem = new ParallaxSystem(scene);
    const pedestrianSystem = new PedestrianSystem(scene, renderer, camera);

    const chunks: THREE.Group[] = [];
    const chunkIndices: number[] = [];

    // 🌿 CHÃO TEXTURIZADO DE BAIXO DAS CASAS (Compartilhado para eliminar alocações por chunk)
    const terrainTex = createTerrainTexture();
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.9,
      metalness: 0.05,
    });
    applyAtmosphericPerspective(terrainMat, { lod: 'road_terrain' });

    for (let c = 0; c < NUM_CHUNKS; c++) {
      const chunk = new THREE.Group();
      chunk.position.z = c * CHUNK_LENGTH;

      const roadGeo = new THREE.PlaneGeometry(10.2, CHUNK_LENGTH);
      roadGeo.rotateX(-Math.PI / 2);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.receiveShadow = true;
      road.userData.isInfrastructure = true;
      chunk.add(road);

      // 1. Faixas Amarelas Centrais Mescladas (1 draw call por chunk em vez de 20!)
      const dashGeos: THREE.BufferGeometry[] = [];
      for (let z = -CHUNK_LENGTH / 2 + 2; z < CHUNK_LENGTH / 2; z += 4.5) {
        const d1 = new THREE.PlaneGeometry(0.18, 2.2);
        d1.rotateX(-Math.PI / 2);
        d1.translate(-0.15, 0.015, z);
        dashGeos.push(d1);

        const d2 = new THREE.PlaneGeometry(0.18, 2.2);
        d2.rotateX(-Math.PI / 2);
        d2.translate(0.15, 0.015, z);
        dashGeos.push(d2);
      }
      const mergedDashes = mergeGeometries(dashGeos, false);
      dashGeos.forEach((g) => g.dispose());
      if (mergedDashes) {
        const dashesMesh = new THREE.Mesh(mergedDashes, yellowDashMat);
        dashesMesh.userData.isInfrastructure = true;
        dashesMesh.userData.isDashes = true;
        chunk.add(dashesMesh);
      }

      // 2. Faixas Brancas Laterais Mescladas (1 draw call em vez de 2)
      const edgeGeos: THREE.BufferGeometry[] = [];
      const edgeL = new THREE.PlaneGeometry(0.15, CHUNK_LENGTH);
      edgeL.rotateX(-Math.PI / 2);
      edgeL.translate(-4.9, 0.015, 0);
      edgeGeos.push(edgeL);

      const edgeR = new THREE.PlaneGeometry(0.15, CHUNK_LENGTH);
      edgeR.rotateX(-Math.PI / 2);
      edgeR.translate(4.9, 0.015, 0);
      edgeGeos.push(edgeR);

      const mergedEdges = mergeGeometries(edgeGeos, false);
      edgeGeos.forEach((g) => g.dispose());
      if (mergedEdges) {
        const edgesMesh = new THREE.Mesh(mergedEdges, whiteLineMat);
        edgesMesh.userData.isInfrastructure = true;
        edgesMesh.userData.isEdgeLines = true;
        chunk.add(edgesMesh);
      }

      // 3. Meio-fio Mesclado (1 draw call em vez de 2)
      const curbGeos: THREE.BufferGeometry[] = [];
      const curbL = new THREE.BoxGeometry(0.3, 0.25, CHUNK_LENGTH);
      curbL.translate(-5.15, 0.12, 0);
      curbGeos.push(curbL);

      const curbR = new THREE.BoxGeometry(0.3, 0.25, CHUNK_LENGTH);
      curbR.translate(5.15, 0.12, 0);
      curbGeos.push(curbR);

      const mergedCurbs = mergeGeometries(curbGeos, false);
      curbGeos.forEach((g) => g.dispose());
      if (mergedCurbs) {
        const curbsMesh = new THREE.Mesh(mergedCurbs, curbMat);
        curbsMesh.receiveShadow = true;
        curbsMesh.userData.isInfrastructure = true;
        chunk.add(curbsMesh);
      }

      // 4. Calçadas Mescladas (1 draw call em vez de 2)
      const swGeos: THREE.BufferGeometry[] = [];
      const swL = new THREE.BoxGeometry(4.4, 0.2, CHUNK_LENGTH);
      swL.translate(-7.45, 0.1, 0);
      swGeos.push(swL);

      const swR = new THREE.BoxGeometry(4.4, 0.2, CHUNK_LENGTH);
      swR.translate(7.45, 0.1, 0);
      swGeos.push(swR);

      const mergedSw = mergeGeometries(swGeos, false);
      swGeos.forEach((g) => g.dispose());
      if (mergedSw) {
        const swMesh = new THREE.Mesh(mergedSw, sidewalkMat);
        swMesh.receiveShadow = true;
        swMesh.userData.isInfrastructure = true;
        chunk.add(swMesh);
      }

      // 5. Chão / Terreno Lateral Mesclado (1 draw call em vez de 2)
      const terrainGeos: THREE.BufferGeometry[] = [];
      const terrainL = new THREE.PlaneGeometry(36.0, CHUNK_LENGTH);
      terrainL.rotateX(-Math.PI / 2);
      terrainL.translate(-27.65, 0.02, 0);
      terrainGeos.push(terrainL);

      const terrainR = new THREE.PlaneGeometry(36.0, CHUNK_LENGTH);
      terrainR.rotateX(-Math.PI / 2);
      terrainR.translate(27.65, 0.02, 0);
      terrainGeos.push(terrainR);

      const mergedTerrain = mergeGeometries(terrainGeos, false);
      terrainGeos.forEach((g) => g.dispose());
      if (mergedTerrain) {
        const terrainMesh = new THREE.Mesh(mergedTerrain, terrainMat);
        terrainMesh.receiveShadow = true;
        terrainMesh.userData.isInfrastructure = true;
        chunk.add(terrainMesh);
      }

      populateChunkScenery(chunk, {
        chunkLength: CHUNK_LENGTH,
        chunkIndex: c,
        isNight: false,
      });

      FrontalFrustumCulling.ensureFrustumCulledHierarchy(chunk);

      scene.add(chunk);
      chunks.push(chunk);
      chunkIndices.push(c);
    }

    // ⚡ OTIMIZAÇÃO: Cache direto das árvores para eliminar traverse() a cada frame
    const refreshTreesCache = () => {
      const trees: THREE.Group[] = [];
      for (let i = 0; i < chunks.length; i++) {
        chunks[i].traverse((ch) => {
          if (ch.userData && ch.userData.isTree) {
            trees.push(ch as THREE.Group);
          }
        });
      }
      gameRef.current.activeTrees = trees;
    };
    refreshTreesCache();

    // 🚀 Carregador Central da Quebrada: Rastreamento real de 0% a 100% de todos os assets
    let housesPct = BuildingManager.isLoaded ? 100 : 25;
    let npcsPct = (pedestrianSystem as any).isLoaded ? 100 : 20;
    let treesReady = TreeManager.isLoaded;
    let shadersReady = false;

    const updateLoadingState = () => {
      const overall = Math.min(99, Math.round(
        (housesPct * 0.45) +
        (npcsPct * 0.30) +
        (treesReady ? 15 : 5) +
        (shadersReady ? 10 : 0)
      ));
      setLoadingProgress((prev) => Math.max(prev, overall));
      if (overall < 40) {
        setLoadingMessage('Carregando cenários e casas da quebrada...');
      } else if (overall < 70) {
        setLoadingMessage('Posicionando moradores e animações...');
      } else if (overall < 95) {
        setLoadingMessage('Otimizando gráficos e texturas a 60 FPS...');
      } else {
        setLoadingMessage('Tudo pronto para o corre!');
      }
    };

    let hasRefreshedHouses = false;
    const checkAllReady = () => {
      if (shadersReady) return;
      if (BuildingManager.isLoaded && (pedestrianSystem as any).isLoaded) {
        shadersReady = true;
        // ⚡ PRÉ-RENDERIZAÇÃO E WARM-UP EFETIVO DE SHADERS NA GPU (Executado apenas 1 vez!)
        try {
          pedestrianSystem.prepareForWarmUp();
          trafficManager.prepareForWarmUp();
          spawnManager.prepareForWarmUp();
          particleSystem.warmUp(renderer, camera);
          warmUpManholeSharedAssets(renderer, camera, scene);

          renderer.compile(scene, camera);
          renderer.render(scene, camera);

          pedestrianSystem.finishWarmUp();
          trafficManager.finishWarmUp();
          spawnManager.finishWarmUp();
        } catch (e) {
          console.warn('[WarmUp] Compilação prévia de shaders:', e);
        }

        housesPct = 100;
        npcsPct = 100;
        treesReady = true;
        setLoadingSteps({
          houses: true,
          npcs: true,
          trees: true,
          shaders: true,
        });
        setLoadingProgress(100);
        setLoadingMessage('Tudo pronto para o corre!');
      } else {
        updateLoadingState();
      }
    };

    BuildingManager.onLoaded(() => {
      if (hasRefreshedHouses) return;
      hasRefreshedHouses = true;
      console.log('[Caramelo3D] Casas 3D carregadas! Atualizando quarteirões com modelos HD...');
      const targetChunks = (gameRef.current.chunks && gameRef.current.chunks.length > 0) ? gameRef.current.chunks : chunks;
      refreshAllChunksBuildings(targetChunks, CHUNK_LENGTH);
      refreshTreesCache();
      housesPct = 100;
      setLoadingSteps((s) => ({ ...s, houses: true }));
      checkAllReady();
    });

    BuildingManager.onProgress((pct) => {
      housesPct = Math.max(housesPct, pct);
      if (pct >= 100) {
        setLoadingSteps((s) => ({ ...s, houses: true }));
        checkAllReady();
      } else {
        updateLoadingState();
      }
    });

    pedestrianSystem.onProgress((pct) => {
      npcsPct = Math.max(npcsPct, pct);
      if (pct >= 100) {
        setLoadingSteps((s) => ({ ...s, npcs: true }));
        checkAllReady();
      } else {
        updateLoadingState();
      }
    });

    pedestrianSystem.onLoaded(() => {
      npcsPct = 100;
      setLoadingSteps((s) => ({ ...s, npcs: true }));
      checkAllReady();
    });

    TreeManager.onLoaded(() => {
      treesReady = true;
      setLoadingSteps((s) => ({ ...s, trees: true }));
      checkAllReady();
    });

    // ⚡ Timeout de segurança (após 5s) para caso ocorra lentidão na rede
    setTimeout(() => {
      try {
        renderer.compile(scene, camera);
      } catch (e) {}
      shadersReady = true;
      housesPct = 100;
      npcsPct = 100;
      treesReady = true;
      setLoadingSteps({
        houses: true,
        npcs: true,
        trees: true,
        shaders: true,
      });
      setLoadingProgress(100);
      setLoadingMessage('Tudo pronto para o corre!');
    }, 5000);

    gameRef.current.scene = scene;
    gameRef.current.camera = camera;
    gameRef.current.renderer = renderer;
    gameRef.current.weather = weather;

    // 🌸 Postprocessing: Bloom suave e cinematográfico (Apenas Desktop no modo Cinematic!)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if ((graphicsQuality as any) === 'cinematic' && !isMobileDevice) {
      try {
        composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        // ⚡ Bloom cinematográfico em 1/4 de resolução (16x mais leve na GPU, zero impacto visual perceptível)
        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(Math.floor(w / 4), Math.floor(h / 4)),
          0.12,
          0.28,
          0.94
        );
        composer.addPass(bloomPass);
        gameRef.current.composer = composer;
        gameRef.current.bloomPass = bloomPass;
      } catch (err) {
        console.warn('[PostProcessing] Failed to init bloom composer:', err);
      }
    }

    // 📱 Modo otimizado: LOW por padrão, mobile e/ou gráficos reduzidos
    const shouldOptimizeWeather = initGfx.preset === 'low' || initGfx.preset === 'medium' || isMobileDevice;
    weather.setOptimizedMode(shouldOptimizeWeather);
    if (initGfx.preset === 'low' || isMobileDevice) {
      setMaterialsAnisotropy(1);
    }
    gameRef.current.caramelo = carameloInstance;
    gameRef.current.motoboy = motoboyInstance;
    gameRef.current.particles = particleSystem;
    gameRef.current.traffic = trafficManager;
    gameRef.current.spawnManager = spawnManager;
    gameRef.current.parallax = parallaxSystem;
    gameRef.current.pedestrianSystem = pedestrianSystem;
    gameRef.current.gameplayAI = gameplayAI;
    gameRef.current.chunks = chunks;
    gameRef.current.chunkIndices = chunkIndices;

    // Dynamic soft landing shadow for motorcycle during jumps and mega launches
    const bikeShadowCanvas = document.createElement('canvas');
    bikeShadowCanvas.width = 128; bikeShadowCanvas.height = 128;
    const bsc = bikeShadowCanvas.getContext('2d')!;
    const grad = bsc.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    bsc.fillStyle = grad;
    bsc.fillRect(0, 0, 128, 128);
    const bikeShadowTex = new THREE.CanvasTexture(bikeShadowCanvas);
    const bikeShadowMat = new THREE.MeshBasicMaterial({
      map: bikeShadowTex,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const bikeShadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.8), bikeShadowMat);
    bikeShadowMesh.rotation.x = -Math.PI / 2;
    bikeShadowMesh.position.set(0, 0.038, 12);
    bikeShadowMesh.visible = false;
    scene.add(bikeShadowMesh);

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const aspect = w / h;
      camera.aspect = aspect;

      // 📱 ADAPTAÇÃO DINÂMICA DE CÂMERA (HORIZONTAL & VERTICAL):
      // No celular em pé (Vertical / Portrait - aspect < 1.0), alarga o FOV vertical para enquadrar
      // perfeitamente a pista inteira de 10.2m, as calçadas, casas e o trânsito sem cortar nada nas bordas!
      if (aspect < 1.0) {
        camera.fov = Math.min(88, 60 / aspect);
      } else {
        camera.fov = 60;
      }

      camera.updateProjectionMatrix();
      if (isMobileDevice) {
        renderer.setPixelRatio(1);
      }
      renderer.setSize(w, h);
      if (composer) {
        composer.setSize(w, h);
      }
      if (bloomPass) {
        bloomPass.resolution.set(w, h);
      }
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => handleResize());
    if (container) {
      resizeObserver.observe(container);
    }
    // Executa imediatamente para garantir enquadramento perfeito desde o frame inicial
    handleResize();

    const spawnSpeedBump = (zPos: number) => {
      const bump = createSpeedBump();
      bump.position.set(0, 0, zPos);
      scene.add(bump);
      gameRef.current.speedBumps.push({
        mesh: bump,
        z: zPos,
        triggered: false,
      });
    };

    for (const z of [95, 240]) {
      spawnSpeedBump(z);
    }

    const spawnWaterJet = (xPos: number, zPos: number) => {
      const manhole = createManhole();
      manhole.position.set(xPos, 0.03, zPos);
      scene.add(manhole);
      gameRef.current.waterJets.push({
        mesh: manhole,
        x: xPos,
        z: zPos,
        triggered: false,
        launchedMoto: false,
      });
    };

    const initialJets = [
      { x: 0, z: 58 },
    ];
    initialJets.forEach((ij) => spawnWaterJet(ij.x, ij.z));

    let nextChunkIndex = NUM_CHUNKS;
    let lastTime = performance.now();

    let lastRenderTime = performance.now();

    // =========================================================================
    // MAIN GAME LOOP (COM SUPORTE A LIMITE DE FPS, BLOOM E FRUSTUM CULLING FRONTAL)
    // =========================================================================
    const renderFrame = () => {
      const g = gameRef.current;
      const gfx = graphicsSettingsRef.current;

      // 🚀 TECNOLOGIA DE RENDERIZAR APENAS A FRENTE (Frontal Frustum Culling com Distância Adaptativa)
      // Descarta da GPU e CPU quarteirões e geometrias atrás da câmera ou além da distância configurada
      if (camera && g.chunks && g.chunks.length > 0) {
        frontalFrustumCulling.updateCamera(camera);
        const maxVisDist = getMaxVisibleDistance(gfx.renderDistance);
        frontalFrustumCulling.cullChunks(g.chunks, camera.position, CHUNK_LENGTH, maxVisDist);
      }

      if (gfx.bloomEnabled && g.composer && g.bloomPass) {
        g.composer.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    const animate = (time: number) => {
      gameRef.current.animationFrameId = requestAnimationFrame(animate);
      (window as any).__frameCount = ((window as any).__frameCount || 0) + 1;
      if (showCutscene) {
        lastTime = time;
        return;
      }

      // ⏱️ Limite Profissional de Taxa de Quadros (FPS Limiter calibrado para 60Hz sem micro-stutter)
      const targetFps = graphicsSettingsRef.current.fpsLimit;
      if (targetFps > 0) {
        const minFrameInterval = 1000 / targetFps;
        // Tolerância de 2.8ms absorve jitter normal do VSync do navegador sem pular frames em telas de 60Hz
        if (time - lastRenderTime < minFrameInterval - 2.8) {
          return;
        }
      }
      lastRenderTime = time;

      const dtRaw = Math.min(0.080, (time - lastTime) / 1000);
      lastTime = time;

      let dt = dtRaw;
      if (isGamePausedRef.current) {
        dt = 0; // ⏸️ Jogo pausado pelo jogador: congela movimentação, perseguição e física
      } else if (gameRef.current.isWaterJetPaused && gameRef.current.gameMode === 'motoboy') {
        dt = 0; // ⏸️ Pausa da instrução do jato de água (apenas no modo motoboy!)
      } else if (!gameRef.current.hasPassedWaterTutorial && waterJetTutorialEnabledRef.current && gameRef.current.gameMode === 'motoboy') {
        // 🎬 Câmera lenta suave cinematográfica até o motoboy atingir o jato de água
        const timeScale = 0.50;
        dt = dtRaw * timeScale;
      } else if (gameRef.current.startSlowMoTimer > 0) {
        gameRef.current.startSlowMoTimer -= dtRaw;
        if (gameRef.current.startSlowMoTimer <= 0) {
          gameRef.current.startSlowMoTimer = 0;
          setIsSlowMoActive(false);
        }
        const progress = Math.max(0, Math.min(1.0, 1.0 - gameRef.current.startSlowMoTimer / gameRef.current.startSlowMoDuration));
        // 🎬 Câmera lenta suave cinematográfica (timeScale ultra fluido)
        const timeScale = 0.22 + 0.78 * (progress * progress);
        dt = dtRaw * timeScale;
      }

      // 📊 Medidor de FPS em Tempo Real (atualiza texto diretamente no DOM a cada 400ms sem custo de React)
      frameCountRef.current++;
      if (time - lastFpsTimeRef.current >= 400) {
        const measuredFps = Math.round((frameCountRef.current * 1000) / (time - lastFpsTimeRef.current));
        frameCountRef.current = 0;
        lastFpsTimeRef.current = time;
        if (fpsTextRef.current) {
          fpsTextRef.current.textContent = `${measuredFps} FPS`;
          fpsTextRef.current.className = `font-black font-mono tracking-tight text-[11px] ${
            measuredFps >= 55 ? 'text-emerald-400' : measuredFps >= 40 ? 'text-yellow-400' : 'text-rose-400'
          }`;
        }
        if (fpsDotRef.current) {
          fpsDotRef.current.className = `w-2 h-2 rounded-full ${
            measuredFps >= 55 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : measuredFps >= 40 ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.9)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
          } animate-pulse`;
        }
      }

      const g = gameRef.current;

      // ⚡ OTIMIZAÇÃO EXTREMA DO MENU PRINCIPAL:
      // Quando no Menu Principal (IDLE: !g.running && !g.isGameOver && !g.isCutsceneActive),
      // não reciclamos quarteirões 3D nem re-renderizamos sombras pesadas a 60 FPS por trás do vídeo do menu,
      // eliminando 100% de travamentos, lags ou aquecimento da GPU nos menus!
      if (!g.running && !g.isGameOver && !g.isCutsceneActive && g.explodingTimer <= 0 && g.motoboyExplodingTimer <= 0) {
        if (!(g as any).menuIdleFrameRendered) {
          (g as any).menuIdleFrameRendered = true;
          const idleTime = weather.update(dt, scene, camera.position);
          updateAtmosphericUniforms({
            skyColor: weather.currentSkyColor,
            fogColor: weather.currentFogColor,
            sunColor: weather.sunLight.color,
            sunPosition: weather.sunLight.position,
            ambientColor: weather.ambientLight.color,
            renderDistanceScale: getDistanceScale(graphicsSettingsRef.current.renderDistance),
            isRaining: weather.isRaining,
            rainIntensity: weather.rainIntensity,
            timeOfDay: idleTime,
            ps2FogMode: graphicsSettingsRef.current.ps2FogMode,
            pixelScale: graphicsSettingsRef.current.ditherPixelSize,
            dt,
          });
          if (g.parallax) {
            g.parallax.setTimeOfDay(weather.timeProgress || 0);
            g.parallax.update(dt, 0, 0, 0, 0, camera.position);
          }
          renderFrame();
        }
        return;
      }
      (g as any).menuIdleFrameRendered = false;

      const timeOfDay = weather.update(dt, scene, camera.position);
      updateAtmosphericUniforms({
        skyColor: weather.currentSkyColor,
        fogColor: weather.currentFogColor,
        sunColor: weather.sunLight.color,
        sunPosition: weather.sunLight.position,
        ambientColor: weather.ambientLight.color,
        renderDistanceScale: getDistanceScale(graphicsSettingsRef.current.renderDistance),
        isRaining: weather.isRaining,
        rainIntensity: weather.rainIntensity,
        timeOfDay,
        ps2FogMode: graphicsSettingsRef.current.ps2FogMode,
        pixelScale: graphicsSettingsRef.current.ditherPixelSize,
        dt,
      });
      if (lastTimeOfDayRef.current !== timeOfDay) {
        lastTimeOfDayRef.current = timeOfDay;
        setCurrentTimeOfDay(timeOfDay);
      }

      const timeProgress = weather.timeProgress || 0;
      if (g.parallax) {
        g.parallax.setTimeOfDay(timeProgress);
      }

      // Fator de Noite Gradual (0.0 no dia ensolarado, 0.0->1.0 ao entardecer, 1.0 à noite, 1.0->0.0 no amanhecer)
      let nightFactor = 0;
      if (timeProgress >= 0.50 && timeProgress < 0.65) {
        nightFactor = (timeProgress - 0.50) / 0.15; // Pôr do sol transicionando para a noite
      } else if (timeProgress >= 0.65 && timeProgress < 0.86) {
        nightFactor = 1.0; // Noite plena
      } else if (timeProgress >= 0.86 && timeProgress < 0.95) {
        nightFactor = 1.0 - (timeProgress - 0.86) / 0.09; // Amanhecer voltando para o dia
      } else {
        nightFactor = 0.0; // Dia pleno
      }

      // 🪟 Atualiza dynamicamente as janelas iluminadas das casas no ciclo dia/noite (throttled a 4 FPS para liberar CPU)
      if (!(g as any).lastWindowUpdateSec || g.runTimeSec - (g as any).lastWindowUpdateSec >= 0.25) {
        (g as any).lastWindowUpdateSec = g.runTimeSec;
        BuildingManager.updateNightWindows(nightFactor, g.runTimeSec);
      }

      // Exploding animations (both moto and car/truck explode, sem tela preta, cenário 3D visível)
      if (g.explodingTimer > 0) {
        g.explodingTimer -= dt;

        const explodingEntity = g.gameMode === 'motoboy' ? g.motoboy : g.caramelo;
        if (explodingEntity) {
          explodingEntity.group.position.y += 8.5 * dt;
          explodingEntity.group.position.z -= 2.5 * dt;
          explodingEntity.group.rotation.x += 12.0 * dt;
          explodingEntity.group.rotation.y += 14.0 * dt;
          explodingEntity.group.rotation.z += 9.0 * dt;
          explodingEntity.group.scale.multiplyScalar(0.96);
        }

        // Item 3: Colisão inteligente (Carro fica no chão de forma realista, sem voar pelo ar)
        if (g.collidedCar) {
          g.collidedCar.mesh.position.y = 0;
          g.collidedCar.mesh.rotation.z = (Math.random() - 0.5) * 0.05;
        }

        if (g.particles && Math.random() < 0.85) {
          if (explodingEntity) {
            g.particles.emitExhaustSmoke(explodingEntity.group.position.x, explodingEntity.group.position.y, explodingEntity.group.position.z, 15);
          }
          if (g.collidedCar) {
            g.particles.emitExhaustSmoke(g.collidedCar.mesh.position.x, g.collidedCar.mesh.position.y, g.collidedCar.mesh.position.z, 15);
          }
        }

        if (g.particles) g.particles.update(dt, 0);

        if (g.explodingTimer <= 0) {
          setScreenFadeBlack(0);
          endGame(g.gameMode === 'motoboy' ? '💥 Você bateu de frente no veículo! A moto EXPLODIU!' : '💥 O Caramelo foi atropelado pelo carro!');
          return;
        }

        renderFrame();
        return;
      }

      if (g.motoboyExplodingTimer > 0) {
        g.motoboyExplodingTimer -= dt;
        if (g.motoboy) {
          g.motoboy.group.position.y += 7.0 * dt;
          g.motoboy.group.rotation.x += 14.0 * dt;
          g.motoboy.group.rotation.z += 10.0 * dt;
          g.motoboy.group.scale.multiplyScalar(0.94);
        }
        if (g.particles) g.particles.update(dt, g.currentSpeed);

        // 🏆 Quando o motoboy bater ou cair no modo Caramelo, encerra com vitória (sem o cão seguir fantasmas!)
        if (g.motoboyExplodingTimer <= 0 && g.gameMode === 'caramelo' && g.running) {
          endGame('🏆 O Motoboy caiu e você resgatou a pizza!', true);
          return;
        }
      }

      if (!g.running || g.isCutsceneActive) {
        // 🌆 Apenas no Game Over ou Cutscene, mantém o cenário 3D visível ao fundo
        if (!g.running && g.isGameOver && g.chunks && g.chunks.length > 0) {
          const slowScrollSpeed = 6.0;
          const slowForwardDist = slowScrollSpeed * dtRaw;
          g.chunks.forEach((chunk, idx) => {
            chunk.position.z -= slowForwardDist;
            if (chunk.position.z < -CHUNK_LENGTH) {
              chunk.position.z += CHUNK_LENGTH * NUM_CHUNKS;
              recycleChunkScenery(chunk, nextChunkIndex, timeOfDay === 'NIGHT');
              g.chunkIndices[idx] = nextChunkIndex;
              nextChunkIndex++;
            }
          });
          if (g.parallax) {
            g.parallax.update(dtRaw, slowScrollSpeed, g.totalDistance, 0, 0, camera.position);
          }
          GamefyBillboardManager.update(dtRaw, slowScrollSpeed);
        }
        renderFrame();
        return;
      }

      g.runTimeSec += dt;

      // Speech & damage pop timers (shared)
      g.speechTimer -= dt;
      if (g.damagePopTimer > 0) {
        g.damagePopTimer -= dt;
        if (g.damagePopTimer <= 0) setDamagePop(null);
      }

      if (g.bloodSplatterTimer > 0) {
        g.bloodSplatterTimer -= dt;
        setBloodSplatterOpacity(Math.max(0, g.bloodSplatterTimer / 0.85));
      }

      if (g.stumbleRecoverTimer > 0) {
        g.stumbleRecoverTimer -= dt;
        if (g.stumbleRecoverTimer <= 0) {
          g.stumblesInRow = 0;
        }
      }

      // =====================================================================
      // BRANCH: MODO CARAMELO (original) vs MODO MOTOBOY (new)
      // =====================================================================
      if (g.gameMode === 'caramelo') {
        // === ORIGINAL CARAMELO MODE ===
        if (g.speechTimer <= 0 && g.motoboyExplodingTimer <= 0) {
          const shout = MOTOBOY_SHOUTS[Math.floor(Math.random() * MOTOBOY_SHOUTS.length)];
          setMotoboySpeech(shout);
          g.speechTimer = 3.5 + Math.random() * 2.5;
        }

        if (g.motoboy && camera && g.motoboyExplodingTimer <= 0) {
          g.motoboy.group.getWorldPosition(_scratchVec3);
          _scratchVec3.y += 2.2;
          _scratchVec3.project(camera);
          const sx = (_scratchVec3.x * 0.5 + 0.5) * 100;
          const sy = (-(_scratchVec3.y * 0.5) + 0.5) * 100;
          g.motoboyScreenPos = { x: sx, y: sy };
        }

        // Steering (player = caramelo) — livre e responsivo sem travas
        const STEER_SPEED = 8.5;
        const isSteerLocked = false;
        // Steering na visão da câmera 3D: D/Direita vai para a Direita da tela (-X), A/Esquerda vai para a Esquerda da tela (+X)
        if (g.keys.right) g.targetPlayerX = Math.max(-3.8, g.targetPlayerX - STEER_SPEED * dt);
        if (g.keys.left) g.targetPlayerX = Math.min(3.8, g.targetPlayerX + STEER_SPEED * dt);
        g.playerX += (g.targetPlayerX - g.playerX) * Math.min(1.0, 15 * dt);

        // Jumping
        if (g.isJumping) {
          g.playerY += g.jumpVelocity * dt;
          g.jumpVelocity -= 22.0 * dt;
          if (g.playerY <= 0) {
            g.playerY = 0;
            g.jumpVelocity = 0;
            g.isJumping = false;
            if (g.particles) {
              g.particles.emitLandingDustRing(g.playerX, 0);
            }
          }
        }

        if (g.caramelo) {
          g.caramelo.group.position.x = g.playerX;
          g.caramelo.group.position.y = g.playerY;
          const tilt = (g.targetPlayerX - g.playerX) * -0.32;
          const pitch = g.isJumping ? (g.jumpVelocity > 0 ? -0.22 : 0.18) : 0;
          g.caramelo.group.rotation.set(pitch, 0, tilt);
        }

        // 🛡️ Invencibilidade temporária do Caramelo após sofrer dano (efeito piscar)
        if (g.carameloInvincibleTimer > 0) {
          g.carameloInvincibleTimer -= dt;
          if (g.caramelo?.group) {
            g.caramelo.group.visible = Math.floor(g.runTimeSec * 14) % 2 === 0;
          }
        } else if (g.caramelo?.group && !g.caramelo.group.visible) {
          g.caramelo.group.visible = true;
        }

        // 🐕 SISTEMA DE ESTAMINA E VELOCIDADE PROGRESSIVA DO CARAMELO:
        // - A estamina diminui continuamente ao correr (~6.5% por segundo).
        // - Quando a estamina estiver cheia, ele corre na velocidade máxima (~26 a 28 m/s).
        // - Conforme a estamina diminui, o Caramelo fica progressivamente mais lento.
        // - Com estamina baixa (< 20%), fica visivelmente lento (~13.5 a 15 m/s) e a moto se distancia.
        // - Comer ossos (+35%) é essencial para recuperar estamina e manter a perseguição!
        const staminaDrainRate = 6.5;
        g.dogStamina = Math.max(0, g.dogStamina - staminaDrainRate * dt);

        // Recuperação passiva muito gradual caso a estamina chegue ao limite inferior
        if (g.dogStamina < 15) {
          const slowRegen = 3.0;
          g.dogStamina = Math.min(15, g.dogStamina + slowRegen * dt);
        }

        g.isDogSprinting = g.dogStamina >= 50;
        dogStaminaRef.current = g.dogStamina;
        if (dogStaminaBarRef.current) {
          dogStaminaBarRef.current.style.width = `${g.dogStamina}%`;
        }
        if (dogStaminaTextRef.current) {
          dogStaminaTextRef.current.textContent = `${Math.round(g.dogStamina)}%`;
        }

        const diffConfig = DIFFICULTY_CONFIGS[difficultyRef.current] || DIFFICULTY_CONFIGS.medium;
        // Inicia suave (warm-up progressivo nos primeiros 20s) e vai aumentando a dificuldade com o tempo
        const warmUpProgress = Math.min(1.0, g.runTimeSec / 20.0);
        const warmUpSpeedBoost = warmUpProgress * 8.0;
        const staminaRatio = Math.max(0, Math.min(1.0, g.dogStamina / 100.0));
        const dogProgress = Math.min(1.0, g.runTimeSec / 140.0);

        const initialDogSpd = diffConfig.initialPlayerSpeed;
        const initialMotoSpd = diffConfig.initialMotoboySpeed;

        // Começa devagar e acelera progressivamente
        const targetBaseDogSpeed = initialDogSpd + warmUpSpeedBoost + (staminaRatio * 8.5) + (dogProgress * 3.5 * diffConfig.accelerationRate);

        if (g.stumbleTimer > 0) {
          g.stumbleTimer -= dt;
          // Mantém o Caramelo lento durante o tropeço como antes (~4.8 m/s), com desaceleração física suave e firme
          g.currentSpeed = Math.max(4.8, g.currentSpeed - 16.0 * dt);
        } else {
          // Acelera gradualmente de volta até a velocidade normal de perseguição
          g.currentSpeed += (targetBaseDogSpeed - g.currentSpeed) * Math.min(1.0, 3.2 * dt);
        }

        // Velocidade do Motoboy: inicia calma e acelera gradualmente
        g.baseMotoboySpeed = initialMotoSpd + (warmUpProgress * 6.0) + (dogProgress * 3.0 * diffConfig.accelerationRate);

        // 🛵 I.A. DE FUGA INTELIGENTE DO MOTOBOY:
        // - Desvia de carros, jatos d'água e cones na pista escolhendo a melhor faixa
        // - Não pula sozinho sem motivo (salto apenas em lombadas reais)
        const possibleLanes = [-2.3, 0.0, 2.3];
        let bestLane = g.targetMotoboyX;
        let isEmergencyDodge = false;

        if (g.motoboy) {
          const oncomingCars = g.traffic ? g.traffic.getActiveCars() : [];
          const activeObstacles = g.spawnManager ? g.spawnManager.getObstacles() : [];
          const waterJets = g.waterJets || [];

          // Calcula a folga de perigo em cada faixa
          const laneClearance = possibleLanes.map((lane) => {
            let nearestHazardDist = 999;

            // 1. Carros no trânsito
            for (const car of oncomingCars) {
              const dz = car.z - g.distanceToMotoboy;
              if (dz > -1.5 && dz < 55.0 && Math.abs(car.lane - lane) < 1.35) {
                if (dz < nearestHazardDist) nearestHazardDist = dz;
              }
            }

            // 2. Bueiros com jatos d'água
            for (const wj of waterJets) {
              const dz = wj.z - g.distanceToMotoboy;
              if (dz > -1.5 && dz < 50.0 && Math.abs(wj.x - lane) < 1.30) {
                if (dz < nearestHazardDist) nearestHazardDist = dz;
              }
            }

            // 3. Cones e buracos na pista
            for (const obs of activeObstacles) {
              if (obs.collected) continue;
              const type = (obs.type || '').toLowerCase();
              if (type === 'cone' || type === 'pothole' || type === 'manhole' || type === 'patch') {
                const dz = obs.z - g.distanceToMotoboy;
                if (dz > -1.5 && dz < 48.0 && Math.abs(obs.x - lane) < 1.30) {
                  if (dz < nearestHazardDist) nearestHazardDist = dz;
                }
              }
            }

            return { lane, dist: nearestHazardDist };
          });

          // Perigo na faixa atual
          let nearestInCurrentLane = 999;

          for (const car of oncomingCars) {
            const dz = car.z - g.distanceToMotoboy;
            if (dz > -1.0 && dz < 46.0 && Math.abs(car.lane - g.motoboyX) < 1.35) {
              if (dz < nearestInCurrentLane) nearestInCurrentLane = dz;
            }
          }

          for (const wj of waterJets) {
            const dz = wj.z - g.distanceToMotoboy;
            if (dz > -1.0 && dz < 44.0 && Math.abs(wj.x - g.motoboyX) < 1.25) {
              if (dz < nearestInCurrentLane) nearestInCurrentLane = dz;
            }
          }

          for (const obs of activeObstacles) {
            if (obs.collected) continue;
            const type = (obs.type || '').toLowerCase();
            if (type === 'cone' || type === 'pothole' || type === 'manhole' || type === 'patch') {
              const dz = obs.z - g.distanceToMotoboy;
              if (dz > -1.0 && dz < 42.0 && Math.abs(obs.x - g.motoboyX) < 1.25) {
                if (dz < nearestInCurrentLane) nearestInCurrentLane = dz;
              }
            }
          }

          if (nearestInCurrentLane < 46.0) {
            // Perigo detectado à frente: muda para a faixa mais desimpedida
            laneClearance.sort((a, b) => b.dist - a.dist);
            bestLane = laneClearance[0].lane;

            if (nearestInCurrentLane < 26.0) {
              isEmergencyDodge = true;
              g.motoboyBoostTimer = Math.max(g.motoboyBoostTimer, 1.2);
            }
          } else {
            // Faixa livre: se o cão se aproximar na mesma linha para morder e não houver QTE, faz desvio suave
            if (!dogQTERef.current.active && g.distanceToMotoboy < 2.8 && Math.abs(g.playerX - g.motoboyX) < 0.85) {
              const evadeLanes = possibleLanes.filter((l) => Math.abs(l - g.playerX) > 1.2);
              if (evadeLanes.length > 0 && Math.random() < 0.35) {
                bestLane = evadeLanes[Math.floor(Math.random() * evadeLanes.length)];
              }
            }
          }
        }

        g.motoboyBoostInterval -= dt;
        if (g.motoboyBoostInterval <= 0) {
          g.motoboyBoostTimer = 1.2;
          g.motoboyBoostInterval = 10.0 + Math.random() * 6.0;
          setMotoboySpeech('ACELERA NO GRAU! 🛵💨');
        }

        let currentBoost = 0;
        if (g.motoboyBoostTimer > 0) {
          g.motoboyBoostTimer -= dt;
          currentBoost = 3.6;
        }

        g.motoboySpeed = g.baseMotoboySpeed + Math.sin(g.runTimeSec * 0.45) * 0.8 + currentBoost;

        // Atualização contínua e suave da aproximação do Cachorro em relação ao Motoboy
        const relativeSpeed = g.currentSpeed - g.motoboySpeed;
        g.distanceToMotoboy = Math.max(1.8, Math.min(24.0, g.distanceToMotoboy - relativeSpeed * dt));

        g.targetMotoboyX = bestLane;
        const steerSpeed = isEmergencyDodge ? 12.0 : 8.5;
        g.motoboyX += (g.targetMotoboyX - g.motoboyX) * Math.min(1.0, steerSpeed * dt);
        g.motoboyX = Math.max(-4.2, Math.min(4.2, g.motoboyX));

        if (g.motoboy?.group) {
          const latVel = (g.targetMotoboyX - g.motoboyX);
          const targetRoll = -latVel * 0.14;
          g.motoboy.group.rotation.z += (targetRoll - g.motoboy.group.rotation.z) * Math.min(1.0, 10.0 * dt);
          const targetYaw = latVel * 0.05;
          g.motoboy.group.rotation.y += (targetYaw - g.motoboy.group.rotation.y) * Math.min(1.0, 9.0 * dt);
        }

        if (g.motoboy) {
          if (g.motoboyExplodingTimer > 0) {
            g.motoboyExplodingTimer -= dt;
            // Derrapagem realista no asfalto com faíscas sem voar como foguete
            const crashProgress = 1.0 - (g.motoboyExplodingTimer / 1.8);
            g.motoboy.group.position.x = g.motoboyX + Math.sin(crashProgress * 6) * 0.35;
            g.motoboy.group.position.y = Math.max(0.02, 0.35 * Math.sin(crashProgress * Math.PI)); // deslizamento no solo
            g.motoboy.group.position.z = g.distanceToMotoboy;
            g.motoboy.group.rotation.x = -1.1 * Math.min(1.0, crashProgress * 2.2); // inclina para a frente no asfalto
            g.motoboy.group.rotation.z = 0.75 * Math.min(1.0, crashProgress * 2.0); // derrapa de lado
            if (g.particles && Math.random() < 0.45) {
              g.particles.emitBiteImpact(g.motoboyX, 0.1, g.distanceToMotoboy);
            }
          } else if (g.npcMotoJumping) {
            g.npcMotoY += g.npcMotoJumpVy * dt;
            g.npcMotoJumpVy -= 21.0 * dt;
            g.motoboy.group.position.y = Math.max(0, g.npcMotoY);
            if (g.npcMotoY <= 0) {
              g.npcMotoY = 0;
              g.npcMotoJumping = false;
              g.motoboy.group.position.y = 0;
              g.motoboy.group.rotation.x = 0;
              sound.playBoing();
              if (g.motoboy) g.motoboy.triggerBumpJump();
              if (g.particles) {
                g.particles.emitLandingDustRing(g.motoboyX, g.distanceToMotoboy);
              }
            }
          } else {
            g.motoboy.group.position.y = 0;
            g.motoboy.group.rotation.x = 0;
          }
          g.motoboy.group.position.x = g.motoboyX;
          g.motoboy.group.position.z = g.distanceToMotoboy;
          g.motoboy.updateAnimation(g.runTimeSec, g.motoboySpeed, dt, 0, nightFactor);
          weather.bikeHeadlight.position.set(g.motoboyX, 0.95 + g.npcMotoY * 0.5, g.distanceToMotoboy + 0.8);
          weather.bikeLightTarget.position.set(g.motoboyX, 0, g.distanceToMotoboy + 14);
          weather.bikeHeadlight.intensity = nightFactor * 5.0;
          weather.bikeHeadlight.visible = nightFactor > 0.05;
        }

        // 🎯 SISTEMA DE DESAFIO DE REAÇÃO RÁPIDA DO CACHORRO (LINHA OSCILANTE)
        if (qteCooldownRef.current > 0) {
          qteCooldownRef.current -= dt;
        }

        const isCloseToBike = g.distanceToMotoboy <= 4.5;
        // Distância necessária para acionar o desafio: 1.5m a 3.5m alinhado na pista
        const inAttackZone = g.distanceToMotoboy <= 3.5 && Math.abs(g.motoboyX - g.playerX) < 1.75;

        // Se o desafio estiver ativo:
        if (dogQTERef.current.active) {
          const qte = dogQTERef.current;
          qte.timeLeft -= dt;

          // Se o Motoboy escapou ou ficou muito distante, cancela o desafio
          if (g.distanceToMotoboy > 5.5) {
            qte.active = false;
            setDogQTE((prev) => ({ ...prev, active: false }));
            qteCooldownRef.current = 2.5;
          }

          // Movimento de vai-e-vem da linha de um lado para o outro (0 a 100%)
          qte.lineProgress += qte.direction * qte.oscSpeed * dt;
          if (qte.lineProgress >= 98) {
            qte.lineProgress = 98;
            qte.direction = -1;
          } else if (qte.lineProgress <= 2) {
            qte.lineProgress = 2;
            qte.direction = 1;
          }

          // Atualiza a posição da linha diretamente no DOM para 60 FPS cravados
          if (qtePointerRef.current) {
            qtePointerRef.current.style.left = `${qte.lineProgress}%`;
          }

          if (qte.timeLeft <= 0) {
            // ERROU / FORA DO TEMPO:
            qte.active = false;
            setDogQTE((prev) => ({ ...prev, active: false }));
            sound.playStumble();
            setDamagePop('💨 FORA DO TEMPO! O Motoboy desviou e acelerou!');
            g.damagePopTimer = 1.6;
            // Motoboy acelera e escapa para frente sem perder corações
            g.distanceToMotoboy = Math.min(14.5, g.distanceToMotoboy + 4.5);
            g.motoboyBoostTimer = 2.4;
            qteCooldownRef.current = 3.5; // Cooldown para reiniciar perseguição
          }
        }

        // 🎯 ALVO DE MORDIDA DINÂMICO QUE SEGUE O MOTOBOY NA TELA
        const canShowBiteTarget = inAttackZone &&
          !dogQTERef.current.active &&
          qteCooldownRef.current <= 0 &&
          g.motoboyExplodingTimer <= 0 &&
          g.explodingTimer <= 0 &&
          g.motoboyBossLives > 0 &&
          g.running;

        if (biteTargetDomRef.current) {
          if (canShowBiteTarget) {
            biteTargetDomRef.current.style.display = 'flex';
            biteTargetDomRef.current.style.left = `${g.motoboyScreenPos.x}%`;
            biteTargetDomRef.current.style.top = `${Math.min(84, g.motoboyScreenPos.y + 6)}%`;
          } else {
            biteTargetDomRef.current.style.display = 'none';
          }
        }

        // 🦷 Atualização em tempo real (60 FPS) da imagem de mordida grudada atrás do Motoboy
        if (biteAnimDomRef.current && biteAnimStageRef.current) {
          biteAnimDomRef.current.style.left = `${g.motoboyScreenPos.x}%`;
          biteAnimDomRef.current.style.top = `${Math.min(85, g.motoboyScreenPos.y + 6.5)}%`;
        }

        if (inAttackZone !== isBiteReadyRef.current) {
          isBiteReadyRef.current = inAttackZone;
          setIsBiteReady(inAttackZone);
        }

        if (isCloseToBike && g.motoboyExplodingTimer <= 0) {
          g.barkProximityTimer -= dt;
          if (g.barkProximityTimer <= 0) {
            sound.playCustomBark();
            g.barkProximityTimer = 2.5 + Math.random() * 1.5;
          }
        }

        if (g.caramelo) {
          const isBiting = g.biteLungeTimer > 0;
          if (g.biteLungeTimer > 0) g.biteLungeTimer -= dt;
          g.caramelo.updateAnimation(g.runTimeSec, g.currentSpeed, dt, isBiting, g.isJumping);
        }

        // Camera (Caramelo mode - câmera próxima e dinâmica profissional atrás do cachorro)
        const targetFOV = 52 + (g.currentSpeed / 24.5) * 12;
        camera.fov += (targetFOV - camera.fov) * Math.min(1.0, 4.0 * dt);
        camera.updateProjectionMatrix();

        const camBob = Math.sin(g.runTimeSec * g.currentSpeed * 1.5) * 0.035;
        let shakeX = 0, shakeY = 0;
        if (g.cameraShakeTimer > 0) {
          g.cameraShakeTimer -= dt;
          const shakeAmt = g.cameraShakeIntensity * (g.cameraShakeTimer / 0.3);
          shakeX = (Math.random() - 0.5) * shakeAmt;
          shakeY = (Math.random() - 0.5) * shakeAmt * 0.5;
        }

        const isMobileDog = typeof window !== 'undefined' && (window.innerWidth < 768 || window.innerHeight > window.innerWidth);
        const mobileDogPullBackZ = isMobileDog ? -0.45 : 0.0;
        const mobileDogElevY = isMobileDog ? 0.15 : 0.0;

        // 🐕 Câmera mais próxima do Caramelo, enquadrando o cachorro em destaque com a moto à frente
        const camTargetX = g.playerX * 0.72 + shakeX;
        const camTargetY = (g.npcMotoJumping ? (3.2 + g.npcMotoY * 0.45) : (1.95 + g.playerY * 0.4)) + camBob + shakeY + mobileDogElevY;
        camera.position.x += (camTargetX - camera.position.x) * Math.min(1.0, 10 * dt);
        camera.position.y += (camTargetY - camera.position.y) * Math.min(1.0, 10 * dt);
        camera.position.z = -2.75 + mobileDogPullBackZ;
        camera.up.set(0, 1, 0);
        const lookY = g.npcMotoJumping ? (1.30 + g.npcMotoY * 0.65) : (0.85 + g.playerY * 0.25);
        camera.lookAt(g.playerX * 0.45, lookY, g.distanceToMotoboy + 4.5);

        // Particles
        if (g.particles) {
          const motoSurface = getRoadSurfaceAtZ(g.totalDistance + g.distanceToMotoboy, CHUNK_LENGTH);
          const isMotoOnDirt = motoSurface !== 'asphalt_sand_patches';
          if (!g.isJumping) g.particles.emitPawDust(g.playerX, 0, 0, g.currentSpeed);
          if (g.motoboy && g.motoboyExplodingTimer <= 0) {
            g.particles.emitMotoRoadTireDust(g.motoboyX, g.npcMotoY * 0.25, g.distanceToMotoboy, g.motoboySpeed, false, isMotoOnDirt);
            g.particles.emitExhaustSmoke(g.motoboyX, 0.30 + g.npcMotoY * 0.25, g.distanceToMotoboy, g.motoboySpeed, false);
          }
          if (g.traffic) {
            const activeCars = g.traffic.getActiveCars();
            for (let ci = 0; ci < activeCars.length; ci++) {
              const car = activeCars[ci];
              if (car.z > -4 && car.z < 52) {
                const carSurf = getRoadSurfaceAtZ(g.totalDistance + car.z, CHUNK_LENGTH);
                g.particles.emitCarWheelDust(car.lane, 0, car.z, g.currentSpeed, carSurf !== 'asphalt_sand_patches');
              }
            }
          }
          g.particles.update(dt, g.currentSpeed);
        }

        // Traffic (caramelo mode - player is the dog) — carros só aparecem depois do desvio do tutorial
        const canSpawnTraffic = g.hasPassedWaterTutorial || !waterJetTutorialEnabledRef.current;
        if (g.traffic && canSpawnTraffic) {
          const collidedCar = g.traffic.update(dt, g.playerX, g.playerY, g.currentSpeed, g.runTimeSec, 0, nightFactor);

          if (g.motoboy && g.motoboyExplodingTimer <= 0) {
            const activeCars = g.traffic.getActiveCars();
            for (const car of activeCars) {
              const mdx = Math.abs(g.motoboyX - car.lane);
              const mdz = Math.abs(car.z - g.distanceToMotoboy);
              if (mdz < 2.0 && mdx < 1.1) {
                if (g.particles) g.particles.emitCarExplosion(g.motoboyX, 0.8, g.distanceToMotoboy);
                sound.playCrash();
                g.cameraShakeTimer = 0.5;
                g.cameraShakeIntensity = 0.8;
                g.motoboyExplodingTimer = 1.6;
                g.traffic.removeCar(car);
                setMotoboySpeech('BATI NO CARROOO! 🛵💥🚗🔥');
                setDamagePop('💥 KABOOOM! 🍕🔥');
                setTimeout(() => {
                  endGame('🏆 O Motoboy bateu de frente no carro e você resgatou a pizza!', true);
                }, 1200);
                break;
              }
            }
          }

          if (collidedCar && g.explodingTimer <= 0) {
            if (g.carameloInvincibleTimer <= 0) {
              g.carameloLives = Math.max(0, g.carameloLives - 1);
              setCarameloLives(g.carameloLives);
              g.carameloInvincibleTimer = 1.8; // Invencibilidade temporária contra múltiplos danos
              sound.playStumble();
              sound.playCustomBark();
              g.cameraShakeTimer = 0.35;
              g.cameraShakeIntensity = 0.6;
              g.stumbleTimer = 0.9;
              g.currentSpeed = Math.max(6.0, g.currentSpeed - 8.0);
              g.distanceToMotoboy = Math.min(22.0, g.distanceToMotoboy + 4.5);
              setDamagePop(`💥 BATEU NO CARRO! -1 ❤️ (Vidas restantes: ${g.carameloLives})`);
              g.damagePopTimer = 1.8;
              if (g.particles) g.particles.emitCarExplosion(g.playerX, 0.6, 0);

              if (g.carameloLives <= 0) {
                g.explodingTimer = 1.2;
                endGame('💥 O Caramelo perdeu todas as vidas! Fim de jogo.');
                return;
              }
            }
          }
        }

        // Obstacles (caramelo mode)
        if (g.spawnManager) {
          g.spawnManager.update(dt, g.currentSpeed, 0, 0, camera);

          // 🛵💥 Check if NPC Motoboy hits a manhole (water geyser) ahead!
          const motoHitObs = g.spawnManager.checkCollision(g.motoboyX, g.npcMotoY, g.distanceToMotoboy);
          if (motoHitObs && motoHitObs.type === 'manhole') {
            sound.playCrash();
            sound.playSplash();
            sound.playWin();
            if (g.particles) {
              g.particles.emitWaterBlast(g.motoboyX, 0.6, g.distanceToMotoboy);
            }
            g.cameraShakeTimer = 0.6;
            g.cameraShakeIntensity = 0.65;
            // 💥 Motoboy NPC perde, sai voando e cai!
            g.motoboyExplodingTimer = 1.8;
            setMotoboySpeech('💥 AAAAAAHHH! O JATO D\'ÁGUA ME DERRUBOU! 🛵💨🌊');
            g.speechTimer = 3.5;
            setDamagePop('🏆 MOTOBOY CAIU NO JATO D\'ÁGUA! +1500 PTS!');
            g.damagePopTimer = 3.0;
            g.scoreAcc += 1500;
            g.coinsAcc += 15;
            setScore(Math.floor(g.scoreAcc));
            setOssoCoinsEarned(g.coinsAcc);
            setTimeout(() => {
              endGame('🏆 O Motoboy caiu no jato d\'água e a pizza é sua!', true);
            }, 1200);
          }

          const hitObs = g.spawnManager.checkCollision(g.playerX, g.playerY);
          if (hitObs) handleObstacleCollisionCaramelo(hitObs, g);
        }

        // Bite range
        const inBiteRange = g.distanceToMotoboy <= 2.8 && Math.abs(g.playerX - g.motoboyX) < 1.2 && g.motoboyExplodingTimer <= 0;
        if (inBiteRange !== isBiteReadyRef.current) {
          isBiteReadyRef.current = inBiteRange;
          setIsBiteReady(inBiteRange);
        }

        // Cap distance
        g.distanceToMotoboy = Math.min(26.0, g.distanceToMotoboy);

      } else {
        // =================================================================
        // === MODO MOTOBOY (3ª PESSOA) ===
        // Player controls the motoboy, dog AI chases from behind
        // Camera closer + zoom-out event on cone/pothole collision
        // =================================================================
        // Project motoboy position for floating cinematic 3D counter & Hologram Dash
        if (g.motoboy && camera) {
          _scratchVec3.set(g.motoboyX + 1.35, 1.25 + g.playerY, g.distanceToMotoboy);
          _scratchVec3.project(camera);
          const sx = Math.max(6, Math.min(86, (_scratchVec3.x * 0.5 + 0.5) * 100));
          const sy = Math.max(8, Math.min(84, (-(_scratchVec3.y * 0.5) + 0.5) * 100));
          g.motoboyScreenPos = { x: sx, y: sy };

          // 🏍️ Posição flutuante do Círculo ao lado esquerdo da moto (bem próximo ao motoboy, sem entrar nele e sem sair da tela)
          const isMobileDevice = typeof window !== 'undefined' && (
            /android|iphone|ipad|ipod|windows phone/i.test(navigator.userAgent) ||
            'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 1024
          );
          const dashOffsetX = isMobileDevice ? -0.85 : -1.05;
          const dashOffsetY = 0.65 + (g.isJumping ? g.playerY * 0.55 : 0) + (g.wheelieAngle * 0.35);
          _scratchVec3.set(g.motoboyX + dashOffsetX, dashOffsetY, g.distanceToMotoboy - 0.20);
          _scratchVec3.project(camera);

          const hx = Math.max(8, Math.min(88, (_scratchVec3.x * 0.5 + 0.5) * 100));
          const hy = Math.max(12, Math.min(86, (-(_scratchVec3.y * 0.5) + 0.5) * 100));

          // Interpolação suave para seguir sem trepidação
          g.hologramX += (hx - g.hologramX) * Math.min(1.0, 16.0 * dt);
          g.hologramY += (hy - g.hologramY) * Math.min(1.0, 16.0 * dt);

          // Inclinação dinâmica suave acompanhando as curvas da moto
          const targetTilt = (g.targetMotoboyX - g.motoboyX) * -6.5;
          g.hologramTilt += (targetTilt - g.hologramTilt) * Math.min(1.0, 14.0 * dt);

          // Efeito de fade quando coleta moedas: fica quase transparente (0.12) e volta suavemente para 0.92
          if (g.coinCollectFadeTimer > 0) {
            g.coinCollectFadeTimer -= dt;
          }
          const targetDashOpacity = g.coinCollectFadeTimer > 0 ? 0.12 : 0.92;
          g.hologramOpacity += (targetDashOpacity - g.hologramOpacity) * Math.min(1.0, 7.5 * dt);

          const currentKmh = Math.floor(g.currentSpeed * 3.6);
          const currentGear = currentKmh < 5 ? 'N' : `${Math.min(5, Math.floor(currentKmh / 18) + 1)}ª`;
          const currentOdo = `${(g.totalDistance / 1000).toFixed(1)}km`;

          // ⚡ Atualização Ultra-Rápida direta no DOM (GPU Hardware-Accelerated, ZERO React Re-render)
          if (hologramDomRef.current) {
            hologramDomRef.current.style.left = `${g.hologramX}%`;
            hologramDomRef.current.style.top = `${g.hologramY}%`;
            hologramDomRef.current.style.transform = `translate(-50%, -50%) rotate(${Math.round(g.hologramTilt * 10) / 10}deg) scale(0.90)`;
            hologramDomRef.current.style.opacity = `${Math.max(0.08, Math.min(1.0, g.hologramOpacity))}`;
          }

          if (speedTextRef.current && speedTextRef.current.textContent !== `${currentKmh}`) {
            speedTextRef.current.textContent = `${currentKmh}`;
          }
          if (gearTextRef.current && gearTextRef.current.textContent !== currentGear) {
            gearTextRef.current.textContent = currentGear;
          }
          if (odoTextRef.current && odoTextRef.current.textContent !== currentOdo) {
            odoTextRef.current.textContent = currentOdo;
          }
          if (rpmArcRef.current) {
            const rot = Math.min(180, (currentKmh / 160) * 180) - 90;
            rpmArcRef.current.style.transform = `rotate(${rot}deg)`;
          }
        }

        // Steering (player = motoboy) — Bloqueado durante a câmera lenta inicial até a dica/jato de água
        const STEER_SPEED = 11.2;
        const STEER_MAX_X = 4.85; // Permite ir até a guia / calçada das casas da avenida alargada
        // Bloqueia esterço quando estiver em câmera lenta antes da dica/jato de água ou quando a tela estiver pausada no tutorial
        const isMbSteerBlocked = g.isWaterJetPaused || (!g.hasPassedWaterTutorial && waterJetTutorialEnabledRef.current) || g.startSlowMoTimer > 0;
        // Steering na visão da câmera 3D: D/Direita vai para a Direita da tela (-X), A/Esquerda vai para a Esquerda da tela (+X)
        if (!isMbSteerBlocked && g.keys.right) g.targetMotoboyX = Math.max(-STEER_MAX_X, g.targetMotoboyX - STEER_SPEED * dt);
        if (!isMbSteerBlocked && g.keys.left) g.targetMotoboyX = Math.min(STEER_MAX_X, g.targetMotoboyX + STEER_SPEED * dt);
        // ⚡ Movimento lateral ultra fluido e amortecido (elimina solavancos secos ao virar)
        g.motoboyX += (g.targetMotoboyX - g.motoboyX) * Math.min(1.0, 13.5 * dt);

        // 🧱 COLISÃO COM AS BORDAS / CALÇADA DAS CASAS (|x| >= 4.45m)
        if (g.curbCooldown > 0) g.curbCooldown -= dt;
        if (g.curbStreakResetTimer > 0) {
          g.curbStreakResetTimer -= dt;
          if (g.curbStreakResetTimer <= 0) {
            g.curbStreak = 0;
          }
        }
        if (g.curbChaseTimer > 0) g.curbChaseTimer -= dt;
        if (g.carameloOnBikeTimer > 0) g.carameloOnBikeTimer -= dt;

        const isHittingCurb = Math.abs(g.motoboyX) >= 4.45;
        if (isHittingCurb && g.curbCooldown <= 0 && g.explodingTimer <= 0 && !g.isJumping) {
          g.curbCooldown = 0.55;
          g.curbStreak = (g.curbStreak || 0) + 1;

          // 💥 RASPAR NA BORDA: Desaceleração suave por atrito (elimina 100% dos congelamentos)
          g.currentSpeed = Math.max(10.0, g.currentSpeed - 3.0);

          // Rebote suave para dentro da pista sem teletransporte brusco
          g.targetMotoboyX = Math.sign(g.motoboyX) * 3.8;
          g.motoboyX = Math.sign(g.motoboyX) * 4.38;

          // ✨ O MOTOBOY PISCA EM VERMELHO VIVO (zero custo de GPU, zero lag)
          if (g.motoboy?.triggerDamageFlash) {
            g.motoboy.triggerDamageFlash(0.85);
          }
          g.mbInvincibleTimer = 0.85;

          // 🐕 O CACHORRO FICA ESTREITAMENTE ATRÁS, SEM NUNCA GRUDAR NA MOTO!
          g.carameloOnBikeTimer = 0;
          g.curbChaseTimer = 3.5;
          g.distanceToMotoboy = Math.max(3.8, Math.min(g.distanceToMotoboy, 4.6));
          g.mbDogX = g.motoboyX;

          // Tremor de impacto suave e cinematográfico
          g.cameraShakeTimer = 0.20;
          g.cameraShakeIntensity = 0.32;

          // Faíscas no meio-fio
          if (g.particles) {
            g.particles.emitBiteImpact(g.motoboyX, 0.25, g.distanceToMotoboy);
          }

          setMotoboySpeech('RASPOU NA BORDA! 😱🛵💨');
          g.speechTimer = 1.6;
          setDamagePop('⚠️ RASPOU NA BORDA!');
          g.damagePopTimer = 1.2;
        }

        // SUSTAINED WHEELIE & BALANCE CHALLENGE ("Grau contínuo com pontuação e risco de queda ao virar brusco")
        const isHoldingWheelie = g.keys.jump;
        if (isHoldingWheelie && g.stumbleTimer <= 0) {
          g.wheelieAngle = Math.min(0.65, g.wheelieAngle + 8.5 * dt);
          g.wheelieDistance += g.currentSpeed * dt;
          g.wheelieDuration += dt;

          // Bonus score for balancing on one wheel!
          g.scoreAcc += g.currentSpeed * 4.5 * dt;

          // Steer balance tilt check: turning hard during wheelie destabilizes the bike
          const isKeyTurning = (g.keys.left ? 1 : 0) + (g.keys.right ? -1 : 0);
          g.wheelieTilt += (isKeyTurning * 3.4 - g.wheelieTilt * 2.2) * dt;

          if (Math.abs(g.wheelieTilt) > 1.25) {
            // Oversteered / whipped handlebar too hard during wheelie! Bike slips/stumbles!
            g.stumbleTimer = 1.1;
            g.wheelieAngle = 0;
            g.wheelieTilt = 0;
            g.currentSpeed = Math.max(8.0, g.currentSpeed - 8.5);
            sound.playCrash();
            // Sem zerar a pontuação/metros de grau conquistados na corrida
            if (g.particles) {
              g.particles.emitBiteImpact(g.motoboyX, 0.25, g.distanceToMotoboy);
            }
          } else {
            // Check escalating wheelie milestone celebrations (10m -> 100m -> 500m -> 1km -> 2.5km -> 5km!)
            const currentM = Math.floor(g.wheelieDistance);
            setWheelieMeters(currentM);
            for (let ti = 0; ti < WHEELIE_TIERS.length; ti++) {
              const tier = WHEELIE_TIERS[ti];
              if (currentM >= tier.dist && g.lastWheelieTierIndex < ti) {
                g.lastWheelieTierIndex = ti;
                g.scoreAcc += tier.bonus;
                sound.playPowerup();
                confetti({ particleCount: 50, spread: 80, origin: { y: 0.58 } });

                // Posição flutuante dinâmica compacta ao lado da moto na tela (sem cobrir a pista nem o piloto)
                const motoScreenX = Math.max(20, Math.min(80, 50 - g.motoboyX * 5.0));
                const popX = g.motoboyX > 0 ? Math.max(16, motoScreenX - 22) : Math.min(84, motoScreenX + 22);
                const popY = Math.max(50, Math.min(68, 58 - g.wheelieAngle * 6));
                const newId = Date.now() + Math.random();

                setFloatingWheelies((prev) => [
                  ...prev.slice(-2),
                  { id: newId, title: tier.label, bonus: tier.bonus, x: popX, y: popY }
                ]);
                setTimeout(() => {
                  setFloatingWheelies((prev) => prev.filter((s) => s.id !== newId));
                }, 2600);
                break;
              }
            }
          }
        } else {
          // Desce suavemente a roda dianteira sem perder a pontuação e metros acumulados de grau
          g.wheelieAngle = Math.max(0, g.wheelieAngle - 12.0 * dt);
          g.wheelieTilt = 0;
          setWheelieMeters(0);
        }

        // Lift elevation during wheelie so ground obstacles are avoided (somente se NÃO estiver em salto)
        if (!g.isJumping) {
          g.playerY = g.wheelieAngle * 0.95;
        }

        // Progressive Speed: começa devagar com calma e acelera progressivamente escalando com a dificuldade
        const diffConfig = DIFFICULTY_CONFIGS[difficultyRef.current] || DIFFICULTY_CONFIGS.medium;
        const initialSpd = diffConfig.initialPlayerSpeed;
        let targetNormalSpeed = initialSpd;
        if (g.runTimeSec < 40.0) {
          const p = Math.min(1.0, g.runTimeSec / 40.0);
          targetNormalSpeed = initialSpd + p * (27.78 - initialSpd);
        } else {
          // Beyond 100 km/h: acelera dinamicamente até 160 km/h (44.44 m/s) com base na taxa da dificuldade!
          const extraP = Math.min(1.0, (g.runTimeSec - 40.0) / 45.0);
          targetNormalSpeed = 27.78 + extraP * (44.44 - 27.78) * diffConfig.accelerationRate;
        }

        if (g.stumbleTimer > 0) {
          g.stumbleTimer -= dt;
          g.currentSpeed = Math.max(9.0, g.currentSpeed - 8.0 * dt);
        } else {
          // Smooth stable acceleration to progressive target speed
          g.currentSpeed += (targetNormalSpeed - g.currentSpeed) * Math.min(1.0, 1.6 * dt);
        }

        // Dog AI speed (chasing smoothly behind motoboy)
        let dogSpeedBase = g.currentSpeed - 0.2 + Math.sin(g.runTimeSec * 0.8) * 0.6;
        
        if (g.mbKickCooldown > 0) g.mbKickCooldown -= dt;

        // Dog sprint bursts
        g.mbDogSprintInterval -= dt;
        if (g.mbDogSprintInterval <= 0) {
          g.mbDogSprintTimer = 2.0;
          g.mbDogSprintInterval = 8.0 + Math.random() * 4.0;
        }
        if (g.mbDogSprintTimer > 0) {
          g.mbDogSprintTimer -= dt;
          dogSpeedBase += 2.0;
        }

        // 🤖 I.A. TÁTICA DO CÃO CARAMELO (Vácuo aerodinâmico, fintas de bote e arrancadas)
        let dogSpeedBonus = 0;
        if (g.gameplayAI) {
          const aiResult = g.gameplayAI.updateCarameloAI(
            dt,
            g.motoboyX,
            g.mbDogX,
            g.distanceToMotoboy,
            g.currentSpeed,
            g.wheelieAngle > 0.12,
            (speechText) => {
              setMotoboySpeech(speechText);
              g.speechTimer = 2.8;
            }
          );
          g.mbDogTargetX = aiResult.targetDogX;
          dogSpeedBonus = aiResult.speedBonus;
        } else {
          g.mbDogTargetX = g.motoboyX + Math.sin(g.runTimeSec * 2.0) * 0.6;
        }

        const dogSpeed = dogSpeedBase + dogSpeedBonus;

        const isTutorialApproaching = !g.hasPassedWaterTutorial && waterJetTutorialEnabledRef.current;
        if (isTutorialApproaching) {
          // 🐕 O cão não alcança o motoboy durante a câmera lenta até o jato de água!
          g.distanceToMotoboy = Math.max(10.5, Math.min(15.0, g.distanceToMotoboy));
          g.mbDogBiteCooldown = 5.0;
        } else {
          // Dog chases: relative speed = dogSpeed - playerSpeed
          const dogRelative = dogSpeed - g.currentSpeed;
          g.distanceToMotoboy = Math.max(2.0, Math.min(18.0, g.distanceToMotoboy - dogRelative * dt));
        }

        g.mbDogX += (g.mbDogTargetX - g.mbDogX) * Math.min(1.0, 7.5 * dt);

        // Position motoboy (player-controlled)
        if (g.motoboy) {
          if (g.explodingTimer > 0) {
            // Dynamic Dual Explosion Physics: tumble moto and car (sem tela preta, cenário 3D visível)
            g.explodingTimer -= dt;

            g.motoboy.group.position.y += 9.0 * dt;
            g.motoboy.group.position.z -= 3.5 * dt;
            g.motoboy.group.rotation.x += 12.0 * dt;
            g.motoboy.group.rotation.y += 10.0 * dt;
            g.motoboy.group.rotation.z += 8.0 * dt;

            // Item 3: Colisão inteligente (Veículo pesado permanece no asfalto com leve trepidação de impacto)
            if (g.collidedCar) {
              g.collidedCar.mesh.position.y = 0;
              g.collidedCar.mesh.rotation.z = (Math.random() - 0.5) * 0.05;
            }

            if (g.particles && Math.random() < 0.85) {
              g.particles.emitExhaustSmoke(g.motoboy.group.position.x, g.motoboy.group.position.y, g.motoboy.group.position.z, 15);
              if (g.collidedCar) {
                g.particles.emitExhaustSmoke(g.collidedCar.mesh.position.x, g.collidedCar.mesh.position.y, g.collidedCar.mesh.position.z, 15);
              }
            }

            if (g.explodingTimer <= 0) {
              setScreenFadeBlack(0);
              endGame('💥 A moto e o carro bateram de frente e explodiram!');
              return;
            }
          } else {
            // Jump & Mega Launch physics in motoboy mode
            if (g.isJumping) {
              const baseGravity = g.isMegaJumping ? 15.2 : 21.0;
              // Efeito de gravidade cinematográfica com hang-time suave no ápice acima dos telhados
              const effectiveGravity = (g.isMegaJumping && Math.abs(g.jumpVelocity) < 8.0 && g.playerY > 20.0)
                ? 9.8
                : baseGravity;

              g.playerY += g.jumpVelocity * dt;
              g.jumpVelocity -= effectiveGravity * dt;

              if (g.isMegaJumping) {
                // In-air Stunt Controls: W / ArrowUp (front flip) and S / ArrowDown (back flip)
                const isFrontFlip = g.keys.frontFlip;
                const isBackFlip = g.keys.backFlip;

                const FLIP_SPEED = 10.2; // Rotação ágil e fluida
                let flipDelta = 0;
                if (isFrontFlip) {
                  flipDelta = -FLIP_SPEED * dt;
                } else if (isBackFlip) {
                  flipDelta = FLIP_SPEED * dt;
                }

                g.airFlipRotation += flipDelta;
                g.airRotationAccum += Math.abs(flipDelta);

                // Detect complete 360° flips (2 * Math.PI rad)
                const currentFullFlips = Math.floor(g.airRotationAccum / (Math.PI * 2));
                if (currentFullFlips > g.airFlipsCount) {
                  g.airFlipsCount = currentFullFlips;
                  const flipBonus = g.airFlipsCount === 1 ? 1000 :
                                    g.airFlipsCount === 2 ? 2500 :
                                    g.airFlipsCount === 3 ? 5000 :
                                    g.airFlipsCount === 4 ? 10000 : 20000;
                  g.airStuntScore += flipBonus;

                  const comboLabels = [
                    '',
                    '🛹 MORTAL! +1.000',
                    '🔥 DUPLO MORTAL! x2',
                    '⚡ TRIPLO MORTAL! x3',
                    '🌟 QUADRUPLO MORTAL! x4',
                    '👑 MANOBRA SUPREMA! x5',
                    '🚀 ESTRATOSFÉRICO! x6',
                    '🏆 LENDA DOS CÉUS! x7'
                  ];
                  const label = comboLabels[Math.min(g.airFlipCount, comboLabels.length - 1)] || comboLabels[1];
                  g.airStuntComboName = `${label} (+${g.airStuntScore} pts)`;
                  sound.playCoin();
                  confetti({ particleCount: 45, spread: 85, origin: { y: 0.5 } });
                }
              }

              // Touchdown / Landing Detection
              if (g.playerY <= 0) {
                g.playerY = 0;
                g.jumpVelocity = 0;
                g.isJumping = false;

                if (g.isMegaJumping) {
                  // Check landing alignment: upright within ~43 degrees
                  const normalizedAngle = ((g.airFlipRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                  const isUpright = normalizedAngle < 0.75 || normalizedAngle > (Math.PI * 2 - 0.75);

                  if (isUpright && g.airFlipsCount > 0) {
                    // ✨ POUSO PERFEITO! COMBO APROVADO!
                    g.scoreAcc += g.airStuntScore;
                    setScore(Math.floor(g.scoreAcc));
                    sound.playWin();
                    sound.playBoing();
                    confetti({ particleCount: 85, spread: 100, origin: { y: 0.6 } });
                    setDamagePop(`✨ POUSO PERFEITO! +${g.airStuntScore} PTS! 🏆`);
                    g.damagePopTimer = 2.5;
                  } else if (g.airFlipsCount > 0) {
                    // 💥 POUSO DESALINHADO! PERDEU O COMBO!
                    sound.playCrash();
                    g.stumbleTimer = 0.75;
                    g.currentSpeed = Math.max(8.0, g.currentSpeed - 6.5);
                    setDamagePop('💥 POUSO DESALINHADO! COMBO PERDIDO! ⚠️');
                    g.damagePopTimer = 2.0;
                    if (g.particles) {
                      g.particles.emitExhaustSmoke(g.motoboyX, 0.4, g.distanceToMotoboy, 12);
                    }
                  } else {
                    sound.playBoing();
                  }

                  g.isMegaJumping = false;
                  g.airFlipsCount = 0;
                  g.airFlipRotation = 0;
                  g.airRotationAccum = 0;
                  g.airStuntScore = 0;
                  setIsMegaJumping(false);
                  setAirStuntComboName(null);
                } else {
                  // Suave aterrissagem de lombada / quebra-mola
                  sound.playBoing();
                  if (g.motoboy) g.motoboy.triggerBumpJump();
                  // 💨 Poeira se dissipando em volta no chão ao pousar da lombada!
                  if (g.particles) {
                    g.particles.emitLandingDustRing(g.motoboyX, g.distanceToMotoboy);
                  }
                }
              }
            }

            g.motoboy.group.position.x = g.motoboyX;
            g.motoboy.group.position.z = g.distanceToMotoboy;
            
            // Visual Wheelie & Flip Rotations
            if (g.isMegaJumping) {
              g.motoboy.group.position.y = g.playerY;
              g.motoboy.group.rotation.x = g.airFlipRotation;
            } else {
              const jumpPitch = g.isJumping ? (g.jumpVelocity > 0 ? -0.14 : 0.10) : 0;
              g.motoboy.group.position.y = g.playerY;
              g.motoboy.group.rotation.x = -g.wheelieAngle + jumpPitch;
            }

            // Sombra dinâmica da moto no solo para percepção perfeita de altura e pouso
            if (g.isJumping || g.playerY > 0.05) {
              bikeShadowMesh.visible = true;
              bikeShadowMesh.position.set(g.motoboyX, 0.038, g.distanceToMotoboy);
              const shadowScale = Math.max(0.6, 1.0 + Math.min(1.6, g.playerY * 0.04));
              bikeShadowMesh.scale.set(shadowScale, shadowScale * 1.3, 1.0);
              bikeShadowMat.opacity = Math.max(0.12, 0.65 - (g.playerY / 45.0) * 0.45);
            } else {
              bikeShadowMesh.visible = false;
            }

            // 🏍️ INCLINAÇÃO FÍSICA E ESTERÇO SUAVE (ZERO TRAVADINHA)
            const isKeyTurning = (g.keys.left ? 1 : 0) + (g.keys.right ? -1 : 0);
            
            // Inclinação lateral (Roll Z): transição fluida ao entrar e sair de curvas
            const targetRoll = isKeyTurning * 0.24 + (g.wheelieTilt || 0) * 0.18;
            g.motoboy.group.rotation.z += (targetRoll - g.motoboy.group.rotation.z) * Math.min(1.0, 11.0 * dt);

            // Rotação do guidão (Yaw Y): suavemente amortecida (elimina estalo instantâneo ao apertar/soltar teclas)
            const targetYaw = -isKeyTurning * 0.10;
            g.motoboy.group.rotation.y += (targetYaw - g.motoboy.group.rotation.y) * Math.min(1.0, 10.0 * dt);

            g.motoboy.updateAnimation(g.runTimeSec, g.currentSpeed, dt, 0, nightFactor);
          }
          
          // Headlight (ilumina o asfalto à noite com intensidade gradual)
          weather.bikeHeadlight.position.set(g.motoboyX, 0.95 + (g.isJumping ? g.playerY * 0.5 : 0), g.distanceToMotoboy + 0.8);
          weather.bikeLightTarget.position.set(g.motoboyX, (g.isJumping ? 8.0 : 0), g.distanceToMotoboy + 14);
          weather.bikeHeadlight.intensity = nightFactor * 5.0;
          weather.bikeHeadlight.visible = nightFactor > 0.05;
        }

        // ==============================================================
        // CAMERA EVENT SYSTEM: Caramelo appears only on cone/pothole hit
        // ==============================================================
        if (g.cameraEventTimer > 0) {
          g.cameraEventTimer -= dt;
        }

        const isCameraEvent = g.cameraEventTimer > 0;

        // Position dog (AI-controlled) — visible during camera event, curb chase, or when jumping on the bike!
        const isDogChasing = Boolean(isCameraEvent || (g.curbChaseTimer && g.curbChaseTimer > 0) || (g.carameloOnBikeTimer && g.carameloOnBikeTimer > 0));

        if (g.caramelo) {
          if (g.carameloOnBikeTimer && g.carameloOnBikeTimer > 0) {
            // 🐕💥 O CARAMELO PULA NA MOTO! (acoplado na traseira/bag/perna do piloto)
            g.caramelo.group.visible = true;
            g.caramelo.group.position.x = g.motoboyX + 0.14;
            g.caramelo.group.position.y = 0.78 + g.playerY;
            g.caramelo.group.position.z = g.distanceToMotoboy + 0.35;
            g.caramelo.group.rotation.set(-0.25, 0, (g.targetMotoboyX - g.motoboyX) * -0.35);
          } else if (isDogChasing) {
            g.caramelo.group.visible = true;
            const targetDogZ = Math.max(0.6, g.distanceToMotoboy - 2.8);
            g.caramelo.group.position.z += (targetDogZ - g.caramelo.group.position.z) * Math.min(1.0, 7.5 * dt);
            g.caramelo.group.position.x += (g.mbDogX - g.caramelo.group.position.x) * Math.min(1.0, 8.0 * dt);
            g.caramelo.group.position.y = 0;
            const tilt = (g.mbDogTargetX - g.mbDogX) * -0.25;
            g.caramelo.group.rotation.set(0, 0, tilt);
          } else {
            g.caramelo.group.visible = false;
            g.caramelo.group.position.z = -20;
          }

          const isBiting = Boolean(g.biteLungeTimer > 0 || (g.carameloOnBikeTimer && g.carameloOnBikeTimer > 0));
          if (g.biteLungeTimer > 0) g.biteLungeTimer -= dt;
          g.caramelo.updateAnimation(g.runTimeSec, dogSpeed, dt, isBiting);
        }

        // Invincibility after hit / bite / curb
        if (g.mbInvincibleTimer > 0) {
          g.mbInvincibleTimer -= dt;
          if (g.motoboy && g.explodingTimer <= 0) {
            g.motoboy.group.visible = Math.floor(time / 110) % 2 === 0;
          }
        } else {
          if (g.motoboy && g.explodingTimer <= 0) {
            g.motoboy.group.visible = true;
          }
        }

        // DOG AUTO-BITE when close enough (desativado durante a câmera lenta até o tutorial do jato)
        g.mbDogBiteCooldown -= dt;
        const dogBiteRange = !isTutorialApproaching && isCameraEvent && g.distanceToMotoboy <= 2.5 && Math.abs(g.mbDogX - g.motoboyX) < 1.3;

        if (dogBiteRange && g.mbDogBiteCooldown <= 0 && g.mbInvincibleTimer <= 0) {
          sound.playBite();
          sound.playCustomBark();
          g.biteLungeTimer = 0.45;
          g.bitesAcc += 1;
          g.mbLives -= 1;
          g.mbDogBiteCooldown = 3.5;
          g.mbInvincibleTimer = 2.0;
          g.distanceToMotoboy = Math.min(8.0, g.distanceToMotoboy + 5.0);
          g.cameraEventTimer = 0;

          if (g.particles) {
            g.particles.emitBiteImpact(g.motoboyX, 0.65, g.distanceToMotoboy);
            g.particles.emitBloodSplatter(g.motoboyX, 0.65, g.distanceToMotoboy, 28);
          }
          g.bloodSplatterTimer = 0.95;
          setBloodSplatterOpacity(1.0);

          if (g.motoboy) {
            g.motoboy.triggerBiteDamage();
          }

          g.cameraShakeTimer = 0.3;
          g.cameraShakeIntensity = 0.5;

          const react = BITE_REACTIONS[Math.floor(Math.random() * BITE_REACTIONS.length)];
          setMotoboySpeech(react);
          g.speechTimer = 2.0;
          setDamagePop(`-1 ❤️`);
          g.damagePopTimer = 1.2;

          setBitesCount(g.bitesAcc);
          setLives(g.mbLives);

          confetti({
            particleCount: 25,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#EF4444', '#F59E0B'],
          });

          if (g.mbLives <= 0) {
            endGame('🐕 O Vira-Lata Caramelo pegou o motoboy!');
            return;
          }
        }

        const isDogVisible = isDogChasing;
        sound.updateVolumes(g.distanceToMotoboy, isDogVisible);

        if (isDogVisible && g.distanceToMotoboy <= 4.5) {
          g.barkProximityTimer -= dt;
          if (g.barkProximityTimer <= 0) {
            sound.playCustomBark();
            g.barkProximityTimer = 1.5 + Math.random() * 1.0;
          }
        }

        // ==============================================================
        // 🎬 CINEMATIC CAMERA — SPEED STRETCH EM LINHA RETA, RELAXAMENTO NAS CURVAS & LEAN PROFISSIONAL
        // ==============================================================
        const isNear100Kmh = (g.currentSpeed * 3.6) >= 94;
        if (isNear100Kmh !== isHyperSpeedRef.current) {
          isHyperSpeedRef.current = isNear100Kmh;
          setIsHyperSpeed(isNear100Kmh);
        }

        // Detecção de linha reta vs curvas (esterçamento ativo das teclas ou toque)
        const isSteering = g.keys.left || g.keys.right || Math.abs(g.motoboyTargetX - g.motoboyX) > 0.16;
        const straightTarget = isSteering ? 0.0 : 1.0;
        g.straightLineFactor += (straightTarget - g.straightLineFactor) * Math.min(1.0, 4.8 * dt);

        // Esticamento de Velocidade (Speed Stretch):
        const speedRatio = Math.min(1.0, g.currentSpeed / 34.0); // 0 a 1
        const straightStretchFOV = 0; // Câmera estável em todo o percurso

        // 🐕 CÂMERA PANORÂMICA ESTÁVEL (Sem trancos bruscos de Z na perseguição)
        const dogCamYOffset = isDogChasing ? 0.20 : 0;
        const dogCamZOffset = 0; // Câmera mantém distância Z sem pulos para frente
        const baseFOV = 48 + speedRatio * 1.2; // FOV suave e amplo para enquadrar todo o trânsito com clareza

        // Esticamento de Câmera em Z suave
        const straightCamZPullBack = 0;
        const hyperCamZOffset = 0;
        const hyperCamYOffset = 0;
        const hyperSpeedTremor = isNear100Kmh ? Math.sin(g.runTimeSec * 45) * 0.015 : 0;

        // 🛩️ Tremor de câmera dinâmico quando o avião passa voando por cima
        if (weather.lowPlaneRumble > 0) {
          g.cameraShakeTimer = Math.max(g.cameraShakeTimer, 0.4);
          g.cameraShakeIntensity = Math.max(g.cameraShakeIntensity, weather.lowPlaneRumble * 0.42);
        }

        const turnDir = (g.keys.left ? -1 : 0) + (g.keys.right ? 1 : 0);

        // 🏍️ Balanço Orgânico da Moto: ondulações rítmicas suaves
        const camBobY = (Math.sin(g.runTimeSec * 11.0) * 0.025) * (0.4 + speedRatio * 0.4);
        const camSwayX = (Math.cos(g.runTimeSec * 5.5) * 0.020) * (0.4 + speedRatio * 0.4);

        // 🏍️ FÍSICA DINÂMICA DE CÂMERA IMERSIVA:
        const latSpeed = (g.motoboyX - (g.prevMotoboyX ?? g.motoboyX)) / Math.max(0.001, dt);
        g.prevMotoboyX = g.motoboyX;

        const targetCamRoll = -latSpeed * 0.025 - turnDir * 0.035;
        g.cameraRoll = (g.cameraRoll || 0) + (targetCamRoll - (g.cameraRoll || 0)) * Math.min(1.0, 11.0 * dt);
        camera.up.set(Math.sin(-g.cameraRoll), Math.cos(g.cameraRoll), 0);

        // 🏍️💨 CÂMERA ESTÁVEL NO GRAU (Zero zoom in restritivo):
        // No grau, a câmera se eleva levemente sem aproximar da moto, mantendo visão perfeita da pista e dos carros
        const wheelieProgress = Math.min(1.0, g.wheelieAngle / 0.65);
        const wheelieZoomFOV = 0; // Desativado zoom in para não atrapalhar a visão dos carros
        const wheelieCamY = -g.wheelieAngle * 0.15;
        const wheelieCamZ = 0; // Distância fixa constante

        let shakeX = hyperSpeedTremor + camSwayX, shakeY = hyperSpeedTremor * 0.6 + camBobY;
        if (g.cameraShakeTimer > 0) {
          g.cameraShakeTimer -= dt;
          const shakeAmt = g.cameraShakeIntensity * (g.cameraShakeTimer / 0.3);
          shakeX += (Math.random() - 0.5) * shakeAmt;
          shakeY += (Math.random() - 0.5) * shakeAmt * 0.5;
        }

        // Detecção de tela mobile / proporção vertical (afastamento ideal da câmera no celular)
        const isMobileScreen = typeof window !== 'undefined' && (window.innerWidth < 768 || window.innerHeight > window.innerWidth);
        const mobilePullBackZ = isMobileScreen ? -2.35 : 0.0;
        const mobileElevY = isMobileScreen ? 0.45 : 0.0;
        const mobileFOVBoost = isMobileScreen ? 4.5 : 0.0;

        // Câmera cinematográfica afastada e elevada do motoboy (visão ampla da moto, do trânsito e do cachorro)
        const targetCamY = 2.50 + mobileElevY + dogCamYOffset + hyperCamYOffset + g.playerY * 0.40 + wheelieCamY + shakeY;
        let slowMoZoom = 0;
        if (!g.hasPassedWaterTutorial && waterJetTutorialEnabledRef.current) {
          const approachProg = Math.max(0, Math.min(1.0, (g.distanceToMotoboy - 14.0) / 16.0));
          slowMoZoom = approachProg * 1.65;
        } else if (g.startSlowMoTimer > 0) {
          slowMoZoom = (1.0 - g.startSlowMoTimer / g.startSlowMoDuration) * 1.60;
        }
        const targetCamZ = (g.distanceToMotoboy - 4.90) + mobilePullBackZ + dogCamZOffset + straightCamZPullBack + hyperCamZOffset + wheelieCamZ + slowMoZoom;
        const targetFOV = baseFOV + straightStretchFOV + wheelieZoomFOV + mobileFOVBoost;

        camera.fov += (targetFOV - camera.fov) * Math.min(1.0, 5.8 * dt);
        camera.updateProjectionMatrix();

        // Câmera perfeitamente sincronizada com a moto (SEM LAG, fluida e orgânica)
        const camTargetX = g.motoboyX * (isNear100Kmh ? 0.84 : 0.78) + shakeX;

        // Interpolação responsiva e amortecida sem engasgos
        camera.position.x += (camTargetX - camera.position.x) * Math.min(1.0, 14.0 * dt);
        camera.position.y += (targetCamY - camera.position.y) * Math.min(1.0, 12.0 * dt);
        camera.position.z += (targetCamZ - camera.position.z) * Math.min(1.0, 14.0 * dt);

        // Foco visual suave em harmonia perfeita com a posição da câmera (elimina 100% de tremor angular ao esterçar)
        const lookAheadX = camera.position.x * 0.92;
        const lookAheadY = isDogChasing ? 0.95 : (0.85 + g.playerY * 0.35 + (g.wheelieAngle * 0.55));
        const lookAheadZ = isDogChasing ? (g.distanceToMotoboy + 5.0) : (g.distanceToMotoboy + (isMobileScreen ? 14.5 : 13.5));
        camera.lookAt(lookAheadX, lookAheadY, lookAheadZ);

        // Particles
        if (g.particles) {
          const motoSurface = getRoadSurfaceAtZ(g.totalDistance + g.distanceToMotoboy, CHUNK_LENGTH);
          const isMotoOnDirt = motoSurface !== 'asphalt_sand_patches';
          if (isDogVisible) {
            g.particles.emitPawDust(g.mbDogX, 0, g.caramelo?.group.position.z ?? 0, dogSpeed);
          }
          if (g.motoboy) {
            const isWheelieNow = g.wheelieAngle > 0.08;
            g.particles.emitMotoRoadTireDust(
              g.motoboyX,
              g.playerY * 0.25,
              g.distanceToMotoboy,
              g.currentSpeed,
              isWheelieNow,
              isMotoOnDirt
            );
            g.particles.emitExhaustSmoke(g.motoboyX, 0.32 + g.playerY * 0.25, g.distanceToMotoboy, g.currentSpeed, isWheelieNow);
            // 💨 MODO CINEMÁTICO: Esteiras e linhas aerodinâmicas de vento ao mover para os lados
            if (turnDir !== 0 && (graphicsQuality as any) === 'cinematic') {
              g.particles.emitLateralMotionStreaks(g.motoboyX, g.playerY * 0.25, g.distanceToMotoboy, turnDir, g.currentSpeed);
            }
          }
          if (g.traffic) {
            const activeCars = g.traffic.getActiveCars();
            for (let ci = 0; ci < activeCars.length; ci++) {
              const car = activeCars[ci];
              if (car.z > -4 && car.z < 55) {
                const carSurf = getRoadSurfaceAtZ(g.totalDistance + car.z, CHUNK_LENGTH);
                g.particles.emitCarWheelDust(car.lane, 0, car.z, g.currentSpeed, carSurf !== 'asphalt_sand_patches');
              }
            }
          }
          g.particles.update(dt, g.currentSpeed);
        }

        // Traffic (motoboy mode) — carros só aparecem depois do desvio do tutorial
        const canSpawnTraffic = g.hasPassedWaterTutorial || !waterJetTutorialEnabledRef.current;
        if (g.traffic && g.explodingTimer <= 0 && canSpawnTraffic) {
          const collidedCar = g.traffic.update(dt, g.motoboyX, g.playerY, g.currentSpeed, g.runTimeSec, g.distanceToMotoboy, nightFactor);

          if (collidedCar && g.explodingTimer <= 0 && g.mbInvincibleTimer <= 0) {
            // Remove exatamente 1 vida e atualiza o estado
            g.mbLives = Math.max(0, g.mbLives - 1);
            setLives(g.mbLives);
            g.mbInvincibleTimer = 2.4; // 2.4 segundos de imunidade temporária (i-frames)

            // Afasta o carro colidido para frente/trás para evitar dano duplicado imediato
            collidedCar.z = -50;
            collidedCar.mesh.position.z = -50;

            if (g.mbLives > 0) {
              // ⚠️ 1ª ou 2ª BATIDA: Dano parcial com feedback visual e sonoro de impacto
              sound.playCrash();
              if (g.motoboy) g.motoboy.triggerDamageFlash?.(2.4);
              if (g.particles) {
                g.particles.emitCarExplosion(g.motoboyX, 0.7, g.distanceToMotoboy);
                g.particles.emitExhaustSmoke(g.motoboyX, 0.5, g.distanceToMotoboy, 20);
              }
              g.currentSpeed = Math.max(7.5, g.currentSpeed * 0.55);
              g.cameraShakeTimer = 0.55;
              g.cameraShakeIntensity = 0.85;
              const currentMaxLives = getMaxLives(difficultyRef.current);
              setDamagePop(`⚠️ BATIDA! -1 ❤️ (Vidas restantes: ${g.mbLives}/${currentMaxLives})`);
              g.damagePopTimer = 2.0;
              confetti({
                particleCount: 25,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#EF4444', '#F59E0B'],
              });
            } else {
              // 💥 MORTE DEFINITIVA E ELIMINAÇÃO (0 VIDAS)
              sound.playCrash();
              g.collidedCar = collidedCar;
              if (g.particles) {
                g.particles.emitCarExplosion(g.motoboyX, 0.8, g.distanceToMotoboy);
                g.particles.emitCarExplosion(collidedCar.lane, 1.2, collidedCar.z);
                g.particles.emitCarExplosion(g.motoboyX, 1.6, g.distanceToMotoboy + 2.0);
              }
              g.explodingTimer = 1.8;
              g.currentSpeed = 0;
              g.cameraShakeTimer = 1.2;
              g.cameraShakeIntensity = 1.8;
              setDamagePop('💥 BATIDA FATAL! MOTO DESTRUÍDA! 0 VIDAS');
              g.damagePopTimer = 1.8;
              confetti({
                particleCount: 80,
                spread: 140,
                origin: { y: 0.5 },
                colors: ['#FF4500', '#FFD700', '#FF0000', '#333333', '#FFFFFF'],
              });
            }
          } else {
            // Realistic Dynamic Vehicle Horn System & Camera Proximity Blur
            const activeCars = g.traffic.getActiveCars();
            let maxCarCamBlur = 0;
            for (const car of activeCars) {
              const dz = car.z - g.distanceToMotoboy; // Distance in front of motorcycle
              const dx = Math.abs(car.lane - g.motoboyX);

              // 🏎️ DESFOQUE CINEMATOGRÁFICO DE CARROS QUE CHEGAM MUITO PERTO DA CÂMERA
              const camDz = Math.abs(car.z - camera.position.z);
              const camDx = Math.abs(car.lane - camera.position.x);
              if (camDz < 4.8 && camDx < 3.2) {
                const prox = Math.max(0, 1.0 - (Math.hypot(camDx, camDz) / 5.2));
                if (prox > maxCarCamBlur) maxCarCamBlur = prox;
                // Deformação aerodinâmica de alta velocidade no carro ao passar rente à lente
                car.mesh.scale.z = car.modelDef.scale * (1.0 + prox * 0.32);
              } else {
                car.mesh.scale.z = car.modelDef.scale;
              }

              // If car is approaching ahead in the same lane (closing in fast) - buzina no máximo 1x por carro
              if (!car.hasHonked && dz > 1.5 && dz < 26.0 && dx < 1.05) {
                car.hasHonked = true;
                const hornVolume = 0.25 + (1.0 - (dz / 26.0)) * 0.20; // Volume contido e agradável
                sound.playVehicleHonk(car.isTruck, hornVolume);
              }

              // Near-miss close pass wind vibration effect ("tirando fininha")
              const absDz = Math.abs(car.z - g.distanceToMotoboy);
              if (absDz < 2.0 && dx > 1.25 && dx < 2.4) {
                if (Math.random() < 0.15) {
                  sound.playWhoosh();
                  g.cameraShakeTimer = 0.12;
                  g.cameraShakeIntensity = 0.22;
                }
              }
            }

            if (carPassBlurRef.current) {
              if (maxCarCamBlur > 0.05) {
                carPassBlurRef.current.style.opacity = String(Math.min(1.0, maxCarCamBlur * 1.3));
                carPassBlurRef.current.style.display = 'flex';
              } else if (carPassBlurRef.current.style.display !== 'none') {
                carPassBlurRef.current.style.opacity = '0';
                carPassBlurRef.current.style.display = 'none';
              }
            }
          }
        }

        // Obstacles (motoboy mode - accurate collision check against motoboy position)
        if (g.spawnManager) {
          g.spawnManager.update(dt, g.currentSpeed, g.distanceToMotoboy, 0, camera);
          const hitObs = g.spawnManager.checkCollision(g.motoboyX, g.playerY, g.distanceToMotoboy);
          if (hitObs) {
            console.log(`[COLLISION] type=${hitObs.type} x=${hitObs.x.toFixed(2)} z=${hitObs.z.toFixed(2)} playerX=${g.motoboyX.toFixed(2)} playerZ=${g.distanceToMotoboy.toFixed(2)} playerY=${g.playerY.toFixed(2)} isJumping=${g.isJumping} isMega=${g.isMegaJumping}`);
            handleObstacleCollisionMotoboy(hitObs, g);
          }
        }

        if (isBiteReadyRef.current) {
          isBiteReadyRef.current = false;
          setIsBiteReady(false);
        }
      }

      // =================================================================
      // SHARED: Speed bumps, chunks, score, render
      // =================================================================
      const forwardDist = g.currentSpeed * dt;
      g.totalDistance += forwardDist;

      // ⚡ GTA V RAGE STREAMING: Zero-cost chunk recycling (desliza o quarteirão para frente sem recriar malhas)
      g.chunks.forEach((chunk, idx) => {
        chunk.position.z -= forwardDist;
        if (chunk.position.z < -CHUNK_LENGTH) {
          chunk.position.z += CHUNK_LENGTH * NUM_CHUNKS;
          recycleChunkScenery(chunk, nextChunkIndex, timeOfDay === 'NIGHT');
          g.chunkIndices[idx] = nextChunkIndex;
          nextChunkIndex++;
        }
      });

      const currentTurnDir = (g.keys.left ? -1 : 0) + (g.keys.right ? 1 : 0);
      const currentControlX = g.gameMode === 'motoboy' ? g.motoboyX : g.playerX;
      if (g.parallax) g.parallax.update(dt, g.currentSpeed, g.totalDistance, currentControlX, currentTurnDir, camera.position);

      // Atualiza o telão tecnológico dinâmico 3D da Gamefy.net.br
      GamefyBillboardManager.update(dt, g.currentSpeed);

      if (g.pedestrianSystem) {
        const isPlaying = g.running;
        const playerX = g.gameMode === 'motoboy' ? g.motoboyX : g.playerX;
        const playerY = g.gameMode === 'motoboy' ? g.playerY : g.npcMotoY;
        const playerZ = g.gameMode === 'motoboy' ? g.distanceToMotoboy : 0;
        g.pedestrianSystem.update(dt, g.currentSpeed, playerX, playerY, playerZ, isPlaying);
      }

      for (let i = g.speedBumps.length - 1; i >= 0; i--) {
        const sb = g.speedBumps[i];
        sb.z -= forwardDist;
        sb.mesh.position.z = sb.z;

        const targetZ = g.gameMode === 'motoboy' ? g.distanceToMotoboy : 0;
        if (!sb.triggered && Math.abs(sb.z - targetZ) < 1.15) {
          sb.triggered = true;
          if (g.gameMode === 'motoboy') {
            // MOTO PULA NA LOMBADA! Salto suave com suspensão e física real
            if (!g.isMegaJumping) {
              g.jumpVelocity = 8.8;
              g.isJumping = true;
              if (g.motoboy) g.motoboy.triggerBumpJump();
              sound.playBoing();
              setDamagePop('🛹 LOMBADA! SALTOU!');
              g.damagePopTimer = 0.9;
            }
          } else {
            if (g.motoboy) g.motoboy.triggerBumpJump();
          }
        }

        if (sb.z < -14) {
          scene.remove(sb.mesh);
          g.speedBumps.splice(i, 1);
          const highestZ = g.speedBumps.reduce((max, s) => Math.max(max, s.z), 50);
          let nextBumpZ = highestZ + 195 + Math.random() * 55;
          // Garantir que nenhum quebra-mola surja em cima de bueiro/jato de água
          for (const wj of g.waterJets) {
            if (Math.abs(nextBumpZ - wj.z) < 22.0) {
              nextBumpZ = wj.z + (nextBumpZ >= wj.z ? 25.0 : -25.0);
            }
          }
          spawnSpeedBump(nextBumpZ);
        }
      }

      // =================================================================
      // 🕳️🌊 SISTEMA DE JATOS DE ÁGUA E BUEIROS (RAROS E ESPAÇADOS)
      // =================================================================
      for (let i = g.waterJets.length - 1; i >= 0; i--) {
        const wj = g.waterJets[i];
        wj.z -= forwardDist;
        wj.mesh.position.z = wj.z;

        const ud = wj.mesh.userData;
        const targetZ = g.gameMode === 'motoboy' ? g.distanceToMotoboy : 0;
        const targetX = g.gameMode === 'motoboy' ? g.motoboyX : g.playerX;

        // ⚠️ ANIMAÇÃO DO INDICADOR PULANDO EM CIMA DO BUEIRO ANTES DE ESPIRRAR ÁGUA!
        if (!ud.triggered) {
          const distToTarget = wj.z - targetZ;
          const urgency = distToTarget < 60 && distToTarget > 0 ? 1.0 + (1.0 - distToTarget / 60) * 1.45 : 1.0;
          const bouncePhase = g.runTimeSec * 9.5 * urgency + wj.x * 1.7;
          const bounceAbs = Math.abs(Math.sin(bouncePhase));

          if (ud.preEruptIndicatorGroup) {
            ud.preEruptIndicatorGroup.visible = true;
            ud.preEruptIndicatorGroup.position.y = 1.25 + bounceAbs * 1.15;
            const squash = 1.0 + Math.cos(bouncePhase * 2.0) * 0.14;
            ud.preEruptIndicatorGroup.scale.set(1.0 / Math.sqrt(squash), squash, 1.0);
          }
          if (ud.preEruptRingMesh) {
            ud.preEruptRingMesh.visible = true;
            const ringScale = 0.85 + bounceAbs * 0.48;
            ud.preEruptRingMesh.scale.set(ringScale, ringScale, 1.0);
          }
          // Tampão do bueiro treme na rua indicando pressão subterrânea prestes a explodir!
          if (ud.lidGroup && distToTarget < 65 && distToTarget > 26) {
            ud.lidGroup.position.y = 0.08 + bounceAbs * 0.12;
            ud.lidGroup.rotation.z = Math.sin(g.runTimeSec * 38.0 + wj.z) * 0.085;
            ud.lidGroup.rotation.x = Math.cos(g.runTimeSec * 32.0 + wj.x) * 0.065;
          }
        }

        // Erupt water geyser when approaching within 26 meters
        if (!ud.triggered && wj.z < (targetZ + 26) && wj.z > (targetZ - 8)) {
          ud.triggered = true;
          ud.lidVy = 22.0;
          if (ud.waterGroup) ud.waterGroup.visible = true;
          if (ud.preEruptIndicatorGroup) ud.preEruptIndicatorGroup.visible = false;
          if (ud.preEruptRingMesh) ud.preEruptRingMesh.visible = false;
          sound.playSplash();
          // 📳 Tremor na câmera quando o jato d'água aparece!
          g.cameraShakeTimer = Math.max(g.cameraShakeTimer, 0.42);
          g.cameraShakeIntensity = Math.max(g.cameraShakeIntensity, 0.38);
        }

        // Animate geyser eruption
        if (ud.triggered) {
          if (ud.lidGroup) {
            ud.lidVy -= 22 * dt;
            ud.lidY = Math.max(0.08, ud.lidY + ud.lidVy * dt);
            ud.lidGroup.position.y = ud.lidY;
            ud.lidRotX += 14 * dt;
            ud.lidRotZ += 10 * dt;
            ud.lidGroup.rotation.x = ud.lidRotX;
            ud.lidGroup.rotation.z = ud.lidRotZ;
          }
          if (ud.waterGroup) {
            ud.waterProgress = Math.min(1.0, ud.waterProgress + 6.5 * dt);
            const pulse = 1.0 + Math.sin(wj.z * 2.0 + g.runTimeSec * 14.0) * 0.14;
            ud.waterGroup.scale.set(pulse, ud.waterProgress * (1.0 + Math.sin(wj.z * 3.0 + g.runTimeSec * 9.5) * 0.10), pulse);
            if (manholeStreamTex) {
              manholeStreamTex.offset.y = (manholeStreamTex.offset.y - dt * 3.4) % 1.0;
            }

            if (ud.crestSprayGroup) {
              ud.crestSprayGroup.rotation.y += dt * 4.5;
              const crestScale = 0.92 + Math.sin(g.runTimeSec * 16.0 + wj.z) * 0.18;
              ud.crestSprayGroup.scale.set(crestScale, crestScale, crestScale);
            }

            // ⚡ Otimização: anéis de espuma atualizam a cada 2 frames (visualmente suave, CPU leve)
            if (ud.foamRings && Array.isArray(ud.foamRings) && ((window as any).__frameCount & 1) === 0) {
              for (let r = 0; r < ud.foamRings.length; r++) {
                const ring = ud.foamRings[r];
                const rProg = (g.runTimeSec * ring.userData.speed + ring.userData.phase) % 1.0;
                ring.position.y = 0.25 + rProg * 3.35;
                const rScale = 0.65 + Math.sin(rProg * Math.PI) * 0.78;
                ring.scale.set(rScale, rScale, 1.0);
              }
            }

            // ⚡ Otimização: gotas do topo atualizam a cada 2 frames
            if (ud.topDrops && Array.isArray(ud.topDrops) && ((window as any).__frameCount & 1) === 0) {
              for (let tdIdx = 0; tdIdx < ud.topDrops.length; tdIdx++) {
                const td = ud.topDrops[tdIdx];
                const arcProg = (g.runTimeSec * 2.2 + td.phase) % 1.0;
                td.mesh.position.x = td.vx * arcProg * 0.65;
                td.mesh.position.z = td.vz * arcProg * 0.65;
                td.mesh.position.y = td.baseY + Math.sin(arcProg * Math.PI) * 0.85 - arcProg * 0.45;
              }
            }

            if (ud.outerRippleMesh) {
              const ripProg = (g.runTimeSec * 1.8 + wj.z * 0.1) % 1.0;
              const ripScale = 0.65 + ripProg * 0.85;
              ud.outerRippleMesh.scale.set(ripScale, ripScale, 1.0);
            }

            // 💧 Animação de gotas menores e respingos na base do chão (saltando e espalhando com pressão)
            // ⚡ Otimização: atualiza gotas da base a cada 2 frames (30fps efetivo, visualmente idêntico)
            if (ud.bottomDrops && Array.isArray(ud.bottomDrops) && ((window as any).__frameCount & 1) === 0) {
              for (let b = 0; b < ud.bottomDrops.length; b++) {
                const bd = ud.bottomDrops[b];
                const jumpProg = Math.abs(Math.sin(g.runTimeSec * bd.vy + bd.phase));
                bd.mesh.position.y = 0.06 + jumpProg * bd.maxH;
                bd.mesh.position.x = bd.baseX + Math.sin(g.runTimeSec * 4.5 + bd.phase) * 0.20;
                bd.mesh.position.z = bd.baseZ + Math.cos(g.runTimeSec * 4.5 + bd.phase) * 0.20;
                const sc = 0.85 + jumpProg * 0.48;
                bd.mesh.scale.set(sc, sc, sc);
              }
            }
          }
        }

        // 🚨 SEQUÊNCIA ESPECIAL DO JATO DE ÁGUA (POUCO ANTES DE ATINGIR O JATO, PAUSE COMPLETAMENTE A GAMEPLAY)
        const playerDistToJet = wj.z - targetZ;
        const isAlignedWithJet = Math.abs(targetX - wj.x) < 1.5;
        const isApproachingJet = playerDistToJet > 2.8 && playerDistToJet < 7.0 && isAlignedWithJet;

        if (g.gameMode === 'motoboy' && !g.hasPassedWaterTutorial && !wj.tutorialTriggered && isApproachingJet && !g.isWaterJetPaused && waterJetTutorialEnabledRef.current) {
          wj.tutorialTriggered = true;
          g.isWaterJetPaused = true;
          setWaterJetTutorialActive(true);
        }

        // 💥 QUANDO MOTOBOY PASSA POR CIMA DOS JATOS D'ÁGUA ELE PERDE E SAI VOANDO!
        // Hitbox precisa e justa (raio de 0.75m): se passar do lado, NÃO MORRE!
        const dz = Math.abs(wj.z - targetZ);
        const dx = Math.abs(targetX - wj.x);

        if (!wj.launchedMoto && dz < 1.0 && dx < 0.75) {
          wj.launchedMoto = true;
          if (g.gameMode === 'motoboy') {
            sound.playCrash();
            sound.playSplash();
            if (g.particles) {
              g.particles.emitWaterBlast(targetX, 0.6, wj.z);
            }
            // 💥 Motoboy perde e sai voando!
            g.cameraShakeTimer = 0.85;
            g.cameraShakeIntensity = 0.85;
            g.explodingTimer = 1.8;
            g.crashReason = '💥 O jato d\'água arrebentou a moto e você voou longe!';
            g.currentSpeed = 0;
            setDamagePop('💥 JATO D\'ÁGUA! A MOTO FOI ARREMESSADA E VOCÊ PERDEU!');
            g.damagePopTimer = 2.5;
          }
        }

        // Modo Caramelo: quando o motoboy à frente passa por cima do jato d'água, ele perde e sai voando!
        if (g.gameMode === 'caramelo' && !wj.launchedMoto) {
          const motoDz = Math.abs(wj.z - g.distanceToMotoboy);
          const motoDx = Math.abs(g.motoboyX - wj.x);
          if (motoDz < 1.0 && motoDx < 0.75) {
            wj.launchedMoto = true;
            sound.playCrash();
            sound.playSplash();
            sound.playWin();
            if (g.particles) {
              g.particles.emitWaterBlast(g.motoboyX, 0.6, g.distanceToMotoboy);
            }
            g.cameraShakeTimer = 0.6;
            g.cameraShakeIntensity = 0.65;
            // 💥 Motoboy NPC sai voando e cai na pista!
            g.motoboyExplodingTimer = 1.8;
            setMotoboySpeech('💥 AAAAAAHHH! O JATO D\'ÁGUA ME DERRUBOU! 🛵💨🌊');
            g.speechTimer = 3.5;
            setDamagePop('🏆 MOTOBOY BATEU NO JATO D\'ÁGUA E CAIU! +1500 PTS!');
            g.damagePopTimer = 3.0;
            g.scoreAcc += 1500;
            g.coinsAcc += 15;
            setScore(Math.floor(g.scoreAcc));
            setOssoCoinsEarned(g.coinsAcc);
            setTimeout(() => {
              endGame('🏆 O Motoboy bateu no jato d\'água e você resgatou a pizza!', true);
            }, 1200);
          }
        }

        // Modo Caramelo: se o cachorro passar no jato d'água
        if (g.gameMode === 'caramelo' && !wj.dogHit && dz < 0.9 && dx < 0.75) {
          wj.dogHit = true;
          sound.playSplash();
          sound.playStumble();
          g.stumbleTimer = 0.90;
          // Deceleração física contínua sem quebra abrupta de 0ms em um único frame
          g.currentSpeed = Math.max(4.8, g.currentSpeed - 3.5);
          g.cameraShakeTimer = 0.35;
          g.cameraShakeIntensity = 0.35;
          setDamagePop('🌊 BANHO DO JATO D\'ÁGUA! TROPICOU!');
          g.damagePopTimer = 1.8;
          if (g.particles) {
            g.particles.emitWaterBlast(g.playerX, 0.4, wj.z);
          }
        }

        // Recycle (espaçamento grande e NUNCA em cima dos quebra-molas!)
        if (wj.z < -16) {
          const diffCfg = DIFFICULTY_CONFIGS[difficultyRef.current];
          const jetSpacing = diffCfg.waterJetSpacingMin + Math.random() * (diffCfg.waterJetSpacingMax - diffCfg.waterJetSpacingMin);
          const highestZ = g.waterJets.reduce((max, j) => Math.max(max, j.z), 45);
          let nextZ = highestZ + jetSpacing;
          // Garantir distância de segurança de pelo menos 22m de qualquer quebra-mola
          for (const sb of g.speedBumps) {
            if (Math.abs(nextZ - sb.z) < 22.0) {
              nextZ = sb.z + (nextZ >= sb.z ? 25.0 : -25.0);
            }
          }
          const nextX = [-2.8, 0, 2.8][Math.floor(Math.random() * 3)];

          // Reutiliza o manhole existente sem alocações ou memory leaks
          wj.z = nextZ;
          wj.x = nextX;
          wj.mesh.position.set(nextX, 0.03, nextZ);
          wj.triggered = false;
          wj.launchedMoto = false;
          wj.dogHit = false;
          const ud = wj.mesh.userData;
          if (ud) {
            ud.triggered = false;
            ud.lidVy = 0;
            ud.lidY = 0.08;
            ud.lidRotX = 0;
            ud.lidRotZ = 0;
            ud.waterProgress = 0;
            if (ud.lidGroup) {
              ud.lidGroup.position.set(0, 0.08, 0);
              ud.lidGroup.rotation.set(0, 0, 0);
            }
            if (ud.waterGroup) {
              ud.waterGroup.scale.set(0.01, 0.01, 0.01);
              ud.waterGroup.visible = false;
            }
            if (ud.preEruptIndicatorGroup) {
              ud.preEruptIndicatorGroup.visible = true;
              ud.preEruptIndicatorGroup.position.y = 1.25;
            }
            if (ud.preEruptRingMesh) {
              ud.preEruptRingMesh.visible = true;
            }
          }

          // 💵 Desafio: Colocar as notas raras de 100 (exatamente 4 no mapa) na frente dos jatos de água para o jogador desviar e coletar
          if (g.spawnManager && g.spawned100Count < 4) {
            g.spawnManager.spawnRareBanknote100At(nextX, nextZ - 4.5);
            g.spawned100Count++;
          }
        }
      }

      // Ocasional bando de pássaros voando ao longe no horizonte (apenas em gráficos médios ou altos, desativado no LOW)
      const isLowGfx = graphicsSettingsRef.current.preset === 'low' || graphicsSettingsRef.current.particles === 'low';
      if (!isLowGfx && g.particles && Math.random() < 0.04) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const birdX = side * (8.0 + Math.random() * 8.0);
        const birdZ = Math.random() * 45 + 30;
        g.particles.emitBirdsFlock(birdX, 9.0, birdZ);
      }

      // 🌿 Árvores balançando SOMENTE na chuva (em qualidade média/alta, desativado no LOW para economizar CPU)
      const isLowQualityGfx = graphicsSettingsRef.current.preset === 'low';
      const rainIntensity = weather.rainIntensity || 0;
      if (!isLowQualityGfx && rainIntensity > 0.04) {
        g.wasRaining = true;
        const sway = Math.sin(g.runTimeSec * 4.2) * (0.075 * rainIntensity);
        for (let t = 0; t < g.activeTrees.length; t++) {
          g.activeTrees[t].rotation.z = sway;
        }
      } else if (g.wasRaining) {
        for (let t = 0; t < g.activeTrees.length; t++) {
          g.activeTrees[t].rotation.z = 0;
        }
        g.wasRaining = false;
      }

      const kmh = Math.round(g.currentSpeed * 3.6);
      sound.updateEngineRPM(kmh);
      g.scoreAcc += g.currentSpeed * 2.8 * dt;

      // Sun Flare Camera-Corner Opacity Sync (Desativado no modo LOW e mobile para tela 100% limpa)
      const isLowQuality = graphicsSettingsRef.current.preset === 'low';
      let flareAlpha = 0;
      if (!isLowQuality) {
        if (weather.timeProgress < 0.58) {
          flareAlpha = Math.max(0, Math.sin((weather.timeProgress / 0.58) * Math.PI) * 0.95);
        } else if (weather.timeProgress > 0.88) {
          flareAlpha = ((weather.timeProgress - 0.88) / 0.12) * 0.75;
        }
      }

      // Dashboard Dynamic Sway Physics (balanço suave do painel nas curvas e grau)
      const isKeyTurning = (g.keys.left ? 1 : 0) + (g.keys.right ? -1 : 0);
      const targetRoll = isKeyTurning * 5.5 + g.wheelieTilt * 3.5;
      const targetBob = g.wheelieAngle > 0.1 ? -8 : Math.sin(g.runTimeSec * 10) * 1.5;
      g.dashRoll += (targetRoll - g.dashRoll) * Math.min(1.0, 12 * dt);
      g.dashBobY += (targetBob - g.dashBobY) * Math.min(1.0, 12 * dt);

      // ⚡ OTIMIZAÇÃO SUPREMA PARA 60 FPS CRAVADOS NO CELULAR:
      // Zero React re-renders no loop! Atualiza números e visuais diretamente nas refs do DOM.
      if (scoreTextRef.current) {
        scoreTextRef.current.textContent = String(Math.floor(g.scoreAcc));
      }
      if (distanceTextRef.current) {
        distanceTextRef.current.textContent = `${g.distanceToMotoboy.toFixed(1)}m`;
      }
      if (desktopDashRef.current) {
        desktopDashRef.current.style.transform = `rotate(${g.dashRoll}deg) translateY(${g.dashBobY}px)`;
      }
      if (desktopSpeedRef.current) {
        desktopSpeedRef.current.textContent = String(kmh);
      }
      if (desktopGearRef.current) {
        desktopGearRef.current.textContent = kmh < 5 ? 'N' : String(Math.min(5, Math.floor(kmh / 18) + 1));
      }
      if (desktopWheelieTextRef.current && g.wheelieDistance <= 0) {
        desktopWheelieTextRef.current.textContent = g.distanceToMotoboy.toFixed(1);
      }
      if (sunFlareRef.current) {
        sunFlareRef.current.style.opacity = String(flareAlpha);
      }

      // Sincronização leve de React State score apenas a cada 3.0s (elimina 99% da carga da CPU)
      g.uiUpdateTimer += dt;
      if (g.uiUpdateTimer >= 3.0) {
        g.uiUpdateTimer = 0;
        setScore(Math.floor(g.scoreAcc));
      }

      renderFrame();
    };

    // Obstacle collision for CARAMELO mode (stumble only, no game over)
    const handleObstacleCollisionCaramelo = (obs: SpawnedObstacle, g: typeof gameRef.current) => {
      const type = obs.type.toLowerCase();
      if (type === 'puddle') {
        sound.playSplash();
        triggerWaterSplatterRef.current();
        g.currentSpeed = Math.max(7.0, g.currentSpeed - 6.0);
        g.distanceToMotoboy = Math.min(28.0, g.distanceToMotoboy + 4.0);
        setDamagePop('💧 ESPIRROU ÁGUA NA CÂMERA!');
        g.damagePopTimer = 1.6;
      } else if (type === 'pizza') {
        sound.playStumble();
        g.stumbleTimer = 0.75;
        g.currentSpeed = Math.max(5.0, g.currentSpeed - 8.5);
        g.distanceToMotoboy = Math.min(28.0, g.distanceToMotoboy + 5.5);
      } else if (type === 'pothole') {
        sound.playStumble();
        g.stumbleTimer = 0.9;
        g.currentSpeed = Math.max(4.5, g.currentSpeed - 9.0);
        g.distanceToMotoboy = Math.min(28.0, g.distanceToMotoboy + 6.0);
      } else if (type === 'manhole') {
        sound.playSplash();
        sound.playStumble();
        g.stumbleTimer = 0.85;
        g.currentSpeed = Math.max(4.8, g.currentSpeed - 8.5);
        g.distanceToMotoboy = Math.min(28.0, g.distanceToMotoboy + 4.5);
        setDamagePop('🌊 BUEIRO ESTOUROU! BANHO DE ÁGUA!');
        g.damagePopTimer = 1.8;
      } else if (type === 'cone') {
        sound.playStumble();
        g.stumbleTimer = 0.5;
        g.currentSpeed = Math.max(6.0, g.currentSpeed - 5.0);
        g.distanceToMotoboy = Math.min(28.0, g.distanceToMotoboy + 3.0);
      } else if (type === 'coxinha') {
        sound.playCoin();
        g.coinsAcc += 5;
        g.scoreAcc += 200;
        g.currentSpeed = Math.min(30.0, g.currentSpeed + 2.0);
        setScore(Math.floor(g.scoreAcc));
        setOssoCoinsEarned(g.coinsAcc);
      } else if (type === 'bone') {
        sound.playPowerup();
        g.coinsAcc += 20;
        g.scoreAcc += 600;

        // 🍖 OSSO RECUPERA/PREENCHE A ESTAMINA (+35%)
        g.dogStamina = Math.min(100, g.dogStamina + 35);
        dogStaminaRef.current = g.dogStamina;
        setDogStamina(g.dogStamina);
        if (dogStaminaBarRef.current) {
          dogStaminaBarRef.current.style.width = `${g.dogStamina}%`;
        }
        if (dogStaminaTextRef.current) {
          dogStaminaTextRef.current.textContent = `${Math.round(g.dogStamina)}%`;
        }

        setScore(Math.floor(g.scoreAcc));
        setOssoCoinsEarned(g.coinsAcc);
        setDamagePop('⚡ +35% ESTAMINA! 🍖 ACELERE O PASSO!');
        g.damagePopTimer = 1.3;

        if (g.particles) {
          g.particles.emitCoinCollectSparkles(obs.x, 0.65, obs.z);
        }
      } else if (type === 'coin' || type === 'coin_10' || type === 'coin_50' || type === 'coin_100') {
        const rawVal = (obs.mesh.userData && obs.mesh.userData.banknoteValue) || (type === 'coin_50' ? 50 : type === 'coin_100' ? 100 : 10);
        const noteVal: 10 | 50 | 100 = rawVal === 100 ? 100 : rawVal === 50 ? 50 : 10;
        sound.playCoin();
        g.coinsAcc += noteVal;
        g.scoreAcc += noteVal * 10;
        if (noteVal === 10) {
          g.notes10Acc += 1;
          setEarnedNotes10(g.notes10Acc);
        } else if (noteVal === 50) {
          g.notes50Acc += 1;
          setEarnedNotes50(g.notes50Acc);
        } else if (noteVal === 100) {
          g.notes100Acc += 1;
          setEarnedNotes100(g.notes100Acc);
        }
        setScore(Math.floor(g.scoreAcc));
        setOssoCoinsEarned(g.coinsAcc);
        // 💵 Animação de cédula subindo no ponto exato da rua onde foi coletada!
        let coinScreenX: number | undefined;
        let coinScreenY: number | undefined;
        if (camera) {
          _scratchVec3.set(obs.x, 0.55, obs.z);
          _scratchVec3.project(camera);
          coinScreenX = Math.max(8, Math.min(92, (_scratchVec3.x * 0.5 + 0.5) * 100));
          coinScreenY = Math.max(10, Math.min(90, (-(_scratchVec3.y * 0.5) + 0.5) * 100));
        }
        triggerFloatingCoinRef.current(coinScreenX, coinScreenY, noteVal);
        if (g.motoboy) {
          g.motoboy.triggerCashFlash?.(noteVal);
        }
        if (g.particles) {
          g.particles.emitCoinCollectSparkles(obs.x, 0.85, obs.z, noteVal);
        }
      }
    };

    // Obstacle collision for MOTOBOY mode (stumble slows you, cone/pothole triggers camera event)
    const handleObstacleCollisionMotoboy = (obs: SpawnedObstacle, g: typeof gameRef.current) => {
      const type = obs.type.toLowerCase();
      if (type === 'coin' || type === 'coin_10' || type === 'coin_50' || type === 'coin_100') {
        const rawVal = (obs.mesh.userData && obs.mesh.userData.banknoteValue) || (type === 'coin_50' ? 50 : type === 'coin_100' ? 100 : 10);
        const noteVal: 10 | 50 | 100 = rawVal === 100 ? 100 : rawVal === 50 ? 50 : 10;
        sound.playCoin();
        g.coinsAcc += noteVal;
        g.scoreAcc += noteVal * 10;
        if (noteVal === 10) {
          g.notes10Acc += 1;
          setEarnedNotes10(g.notes10Acc);
        } else if (noteVal === 50) {
          g.notes50Acc += 1;
          setEarnedNotes50(g.notes50Acc);
        } else if (noteVal === 100) {
          g.notes100Acc += 1;
          setEarnedNotes100(g.notes100Acc);
        }
        setScore(Math.floor(g.scoreAcc));
        setOssoCoinsEarned(g.coinsAcc);
        // 💵 Animação de cédula subindo no ponto exato da rua onde foi coletada!
        let coinScreenX: number | undefined;
        let coinScreenY: number | undefined;
        if (camera) {
          _scratchVec3.set(obs.x, 0.55, obs.z);
          _scratchVec3.project(camera);
          coinScreenX = Math.max(8, Math.min(92, (_scratchVec3.x * 0.5 + 0.5) * 100));
          coinScreenY = Math.max(10, Math.min(90, (-(_scratchVec3.y * 0.5) + 0.5) * 100));
        }
        triggerFloatingCoinRef.current(coinScreenX, coinScreenY, noteVal);
        if (g.motoboy) {
          g.motoboy.triggerCashFlash?.(noteVal);
        }
        if (g.particles) {
          g.particles.emitCoinCollectSparkles(obs.x, 0.85, obs.z, noteVal);
        }
      } else if (type === 'cone') {
        // 🚧 CONE: Direct impact -> Player flashes RED and Caramelo bites!
        sound.playStumble();
        sound.playBite();
        sound.playCustomBark();
        g.stumbleTimer = 0.5;
        g.currentSpeed = Math.max(5.0, g.currentSpeed - 6.0);
        g.cameraEventTimer = 3.5;
        g.cameraShakeTimer = 0; // No annoying rapid shaking
        g.cameraShakeIntensity = 0;

        g.mbLives -= 1;
        g.bitesAcc += 1;
        if (g.motoboy) g.motoboy.triggerBiteDamage();
        if (g.particles) {
          g.particles.emitBiteImpact(g.motoboyX, 0.65, g.distanceToMotoboy);
          g.particles.emitBloodSplatter(g.motoboyX, 0.65, g.distanceToMotoboy, 25);
        }
        g.bloodSplatterTimer = 0.85;
        setBloodSplatterOpacity(0.9);
        setDamagePop('🚧 BATEU NO CONE! O CARAMELO MORDEU! -1 ❤️');
        g.damagePopTimer = 1.8;
        setBitesCount(g.bitesAcc);
        setLives(g.mbLives);

        if (g.mbLives <= 0) {
          setTimeout(() => {
            endGame('🐕 O Caramelo te mordeu 3 vezes! Sua canela não aguentou!');
          }, 800);
        }
      } else if (type === 'pothole') {
        // 🕳️ BURACO: perde velocidade e o Caramelo se aproxima!
        sound.playStumble();
        g.stumbleTimer = 0.55;
        g.currentSpeed = Math.max(7.5, g.currentSpeed - 6.5);
        g.potholeHitsCount += 1;

        if (g.potholeHitsCount === 1) {
          // 1ª VEZ: O cachorro só aparece atrás latindo bravo, sem morder ainda!
          g.cameraEventTimer = 3.8;
          sound.playCustomBark();
          setDamagePop('🐕 BURACO! O CARAMELO CHEGOU PERTO!');
          g.damagePopTimer = 2.0;
        } else {
          // 2ª VEZ EM DIANTE: O cachorro MORDE o motoboy até perder todas as vidas!
          sound.playBite();
          sound.playCustomBark();
          g.cameraEventTimer = 3.8;
          g.mbLives -= 1;
          g.bitesAcc += 1;
          if (g.motoboy) g.motoboy.triggerBiteDamage();
          if (g.particles) {
            g.particles.emitBiteImpact(g.motoboyX, 0.65, g.distanceToMotoboy);
            g.particles.emitBloodSplatter(g.motoboyX, 0.65, g.distanceToMotoboy, 25);
          }
          g.bloodSplatterTimer = 0.85;
          setBloodSplatterOpacity(0.9);
          setDamagePop(`🐕 BURACO! O CARAMELO MORDEU! -1 ❤️ (Vidas: ${g.mbLives})`);
          g.damagePopTimer = 2.0;
          setBitesCount(g.bitesAcc);
          setLives(g.mbLives);

          if (g.mbLives <= 0) {
            setTimeout(() => {
              endGame('🐕 O Caramelo te mordeu até acabar suas vidas! Cuidado com os buracos na pista!');
            }, 800);
          }
        }
      } else if (type === 'manhole') {
        // 🕳️🌊 TAMPA DE BUEIRO COM JATO DE ÁGUA: MOTOBOY PERDE E SAI VOANDO!
        sound.playCrash();
        sound.playSplash();
        if (g.particles) {
          g.particles.emitWaterBlast(obs.x, 0.6, obs.z);
        }
        g.cameraShakeTimer = 0.85;
        g.cameraShakeIntensity = 0.85;
        g.explodingTimer = 1.8;
        g.crashReason = '💥 O jato d\'água arrebentou a moto e você voou longe!';
        g.currentSpeed = 0;
        setDamagePop('💥 JATO D\'ÁGUA! A MOTO FOI ARREMESSADA E VOCÊ PERDEU!');
        g.damagePopTimer = 2.5;
      } else if (type === 'puddle') {
        sound.playSplash();
        triggerWaterSplatterRef.current();
        g.stumbleTimer = 0.35;
        g.currentSpeed = Math.max(10.0, g.currentSpeed - 3.5);
        setDamagePop('💧 ESPIRROU ÁGUA NA CÂMERA!');
        g.damagePopTimer = 1.6;
      } else if (type === 'pizza') {
        sound.playStumble();
        g.stumbleTimer = 0.35;
        g.currentSpeed = Math.max(10.0, g.currentSpeed - 3.5);
        setDamagePop('🍕 PIZZA NA PISTA!');
        g.damagePopTimer = 1.2;
      } else if (type === 'coxinha') {
        sound.playCoin();
        g.scoreAcc += 200;
        g.coinsAcc += 2;
        setScore(Math.floor(g.scoreAcc));
        setOssoCoinsEarned(g.coinsAcc);
      } else if (type === 'bone') {
        sound.playWin();
        g.scoreAcc += 500;
        g.coinsAcc += 5;
        setScore(Math.floor(g.scoreAcc));
        setOssoCoinsEarned(g.coinsAcc);
        // Bone cancels camera event
        g.cameraEventTimer = 0;
      }
    };

    gameRef.current.animationFrameId = requestAnimationFrame(animate);

    const handleKeyDown = (e: KeyboardEvent) => {
      // ⏸️ Tecla P ou ESC para pausar/retomar o jogo durante o gameplay
      if ((e.code === 'KeyP' || e.code === 'Escape') && gameState === 'PLAYING') {
        togglePause();
        return;
      }

      if (gameRef.current.isCutsceneActive) {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyW') {
          finishCutscene();
          return;
        }
      }

      // 🌊 Durante a pausa do tutorial do jato d'água, permite desviar imediatamente com as teclas
      if (gameRef.current.isWaterJetPaused) {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          handleWaterJetDodgeRef.current('left');
          return;
        }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          handleWaterJetDodgeRef.current('right');
          return;
        }
      }

      // 🛑 Durante a câmera lenta inicial do tutorial (apenas motoboy), bloqueia mover antes da dica
      const isControlsLockedSlowMo = gameRef.current.gameMode === 'motoboy' && (
        (!gameRef.current.hasPassedWaterTutorial && waterJetTutorialEnabledRef.current) || gameRef.current.startSlowMoTimer > 0
      );

      // Controles naturais: Esquerda vai para Esquerda, Direita vai para Direita (apenas se liberados)
      if (!isControlsLockedSlowMo) {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          gameRef.current.keys.left = true;
          gameRef.current.keys.right = false;
        }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          gameRef.current.keys.right = true;
          gameRef.current.keys.left = false;
        }
      }
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        gameRef.current.keys.frontFlip = true;
        gameRef.current.keys.jump = true;
        if (gameRef.current.gameMode === 'caramelo') {
          executeJumpRef.current();
        }
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        gameRef.current.keys.backFlip = true;
      }
      if (e.code === 'Space') {
        gameRef.current.keys.jump = true;
        if (gameRef.current.gameMode === 'caramelo') {
          executeActionRef.current();
        }
      }
      if (e.code === 'KeyB' || e.code === 'KeyE') {
        executeActionRef.current();
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (togglePauseRef.current) {
          togglePauseRef.current();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        gameRef.current.keys.left = false;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        gameRef.current.keys.right = false;
      }
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        gameRef.current.keys.frontFlip = false;
        gameRef.current.keys.jump = false;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        gameRef.current.keys.backFlip = false;
      }
      if (e.code === 'Space') {
        gameRef.current.keys.jump = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(gameRef.current.animationFrameId);
      sound.stopMusic();
      gameRef.current.waterJets.forEach((wj) => {
        if (wj.mesh.parent) wj.mesh.parent.remove(wj.mesh);
      });
      gameRef.current.waterJets = [];
      if (trafficManager) trafficManager.dispose();
      if (spawnManager) spawnManager.dispose();
      if (parallaxSystem) parallaxSystem.dispose();
      if (pedestrianSystem) pedestrianSystem.dispose();
      if (gameRef.current.composer) gameRef.current.composer.dispose();
      if (renderer) renderer.dispose();
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setShowSwipeTutorial(false);
    gameRef.current.touchStartX = e.touches[0].clientX;
    gameRef.current.touchStartY = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - gameRef.current.touchStartX;
    const diffY = currentY - gameRef.current.touchStartY;

    // 🏍️ ARRASTAR DEDO PARA BAIXO: A MOTO EMPINA (GRAU CONTÍNUO ENQUANTO SEGURA O ARRASTO PARA BAIXO!)
    if (diffY > 28) {
      if (gameRef.current.gameMode === 'motoboy') {
        gameRef.current.keys.jump = true;
      }
    } else if (diffY < -35) {
      // 🚀 ARRASTAR DEDO PARA CIMA: PULAR / CHUTAR
      executeJumpRef.current();
      gameRef.current.touchStartY = currentY;
      if (gameRef.current.gameMode === 'motoboy') {
        gameRef.current.keys.jump = false;
      }
    } else if (Math.abs(diffX) > 18) {
      // ↔️ ARRASTAR PARA OS LADOS: ESQUIVAR SUAVEMENTE ENTRE AS FAIXAS (DIREÇÃO NATURAL E INTUITIVA)
      const isSteerLocked = gameRef.current.gameMode === 'motoboy'
        ? (gameRef.current.isWaterJetPaused || (!gameRef.current.hasPassedWaterTutorial && waterJetTutorialEnabledRef.current) || gameRef.current.startSlowMoTimer > 0)
        : false;
      if (!isSteerLocked) {
        // diffX > 0 (arrastar para a direita na tela) subtrai X (-1.5) / diffX < 0 (arrastar para a esquerda) soma X (+1.5)
        const step = diffX > 0 ? -1.5 : 1.5;
        if (gameRef.current.gameMode === 'motoboy') {
          gameRef.current.targetMotoboyX = Math.max(-4.85, Math.min(4.85, gameRef.current.targetMotoboyX + step));
        } else {
          gameRef.current.targetPlayerX = Math.max(-3.8, Math.min(3.8, gameRef.current.targetPlayerX + step));
        }
      }
      gameRef.current.touchStartX = currentX;
    }
  };

  const handleTouchEnd = () => {
    // Ao soltar o toque, a moto desce do grau suavemente
    if (gameRef.current.keys.jump) {
      gameRef.current.keys.jump = false;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-slate-950 overflow-hidden select-none font-sans flex items-center justify-center`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        overscrollBehavior: 'none',
      }}
    >
      <div
        ref={mountRef}
        className="w-full h-full cursor-pointer"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />

      {/* SUBTLE SUNSET BLOOM — Desktop only (desativado no modo low para remover reflexos e luz na tela) */}
      {graphicsSettings.preset !== 'low' && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_35%,rgba(245,158,11,0.06)_0%,rgba(217,83,30,0.1)_60%,rgba(15,23,42,0.35)_100%)] mix-blend-overlay hidden sm:block" />
      )}

      {/* ☀️ O Sol Realista é renderizado diretamente em 3D no céu (weatherLighting.ts) */}
      <div ref={sunFlareRef} className="hidden pointer-events-none" />

      {/* 🚀 100 KM/H HYPER-SPEED MOTION WARP OVERLAY */}
      {isHyperSpeed && (
        <div className="absolute inset-0 pointer-events-none z-10 animate-pulse bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(56,189,248,0.18)_85%,rgba(239,68,68,0.3)_100%)] border-4 border-cyan-400/40" />
      )}



      {/* 🏍️ VELOCÍMETRO SECUNDÁRIO OCULTO (Painel 3D principal já exibe KM/H, Marcha e Distância) */}
      <div
        ref={hologramDomRef}
        className="hidden pointer-events-none select-none"
        style={{
          left: '42%',
          top: '65%',
          transform: 'translate(-50%, -50%) rotate(0deg) scale(0.90)',
          opacity: 0.92,
          willChange: 'transform, opacity',
          filter: 'drop-shadow(0 0 12px rgba(34,211,238,0.5)) drop-shadow(0 6px 18px rgba(0,0,0,0.85))',
        }}
      >
        {/* Mostrador Circular Clean (Estilo MotoGP Puro) */}
        <div className="relative w-15 h-15 sm:w-18 sm:h-18 rounded-full bg-slate-950/80 border-2 border-cyan-400/60 shadow-inner flex flex-col items-center justify-center p-1 overflow-hidden">
          {/* Arco de RPM / Aceleração Neon */}
          <div
            ref={rpmArcRef}
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-amber-400 transition-transform duration-75"
            style={{
              transform: 'rotate(-90deg)',
              opacity: 0.9,
            }}
          />

          {/* Badge de Marcha Discreto no Topo do Círculo */}
          <div className="flex items-center gap-0.5 leading-none -mt-0.5">
            <span
              ref={gearTextRef}
              className="text-[9px] sm:text-[10px] font-black font-mono text-emerald-400 leading-none drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]"
            >
              2ª
            </span>
          </div>

          {/* Velocidade KM/H */}
          <span
            ref={speedTextRef}
            className="text-lg sm:text-2xl font-black font-mono tracking-tighter text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.95)] leading-none tabular-nums"
          >
            30
          </span>
          <span className="text-[7px] sm:text-[8px] font-black font-mono tracking-widest text-slate-300 uppercase leading-none mt-0.5">
            KM/H
          </span>
        </div>
      </div>

      {/* 🚀 MANOBRAS E GRAU FLUTUANTES AO LADO DA MOTO (LIMPO, COMPACTO E MODERNO) */}
      {floatingWheelies.map((stunt) => (
        <div
          key={stunt.id}
          className="absolute z-35 pointer-events-none -translate-x-1/2 -translate-y-1/2 select-none animate-stunt-radical flex flex-col items-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
          style={{ left: `${stunt.x}%`, top: `${stunt.y}%` }}
        >
          {/* Tipografia Dinâmica, Limpa e Flutuante (sem caixa preta e sem amarelo berrante) */}
          <span className="text-xs sm:text-sm font-black italic tracking-wider text-white uppercase">
            {stunt.title}
          </span>
          <span className="text-[11px] sm:text-xs font-bold font-mono text-orange-400">
            +{stunt.bonus} PTS 🔥
          </span>
        </div>
      ))}

      {/* 💵 INDICADOR SIMPLES, GRANDE E LEGÍVEL DE DINHEIRO COLETADO */}
      {floatingCoins.map((coin) => {
        const val = coin.value || 10;
        const textColor =
          val === 100
            ? '#38bdf8'
            : val === 50
            ? '#e879f9'
            : '#4ade80';

        return (
          <div
            key={coin.id}
            className="absolute z-40 pointer-events-none -translate-x-1/2 -translate-y-full animate-coin-float select-none"
            style={{ left: `${coin.x}%`, top: `${coin.y - 5}%` }}
          >
            <span
              className="font-fun font-black text-xl sm:text-2xl md:text-3xl tracking-wide uppercase block"
              style={{
                color: textColor,
                paintOrder: 'stroke fill',
                WebkitTextStroke: '3.5px #1c0a00',
                textShadow: '0 3px 0 #1c0a00, 0 5px 10px rgba(0,0,0,0.9)',
              }}
            >
              +R$ {val}
            </span>
          </div>
        );
      })}

      <style>{`
        @keyframes coinFloatRise {
          0% {
            opacity: 0;
            transform: translate(-50%, 4px) scale(0.75);
          }
          22% {
            opacity: 1;
            transform: translate(-50%, -14px) scale(1.15);
          }
          45% {
            opacity: 1;
            transform: translate(-50%, -24px) scale(1.04);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -46px) scale(0.96);
          }
        }
        .animate-coin-float {
          animation: coinFloatRise 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes horizontalSwipe {
          0%, 100% {
            transform: translateX(-18px);
          }
          50% {
            transform: translateX(18px);
          }
        }
        .animate-horizontal-swipe {
          animation: horizontalSwipe 1.3s ease-in-out infinite;
        }
        @keyframes bounceSubtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        .animate-bounce-subtle {
          animation: bounceSubtle 2.2s ease-in-out infinite;
        }
      `}</style>

      {/* Mensagens de balão de fala desativadas a pedido do usuário para tela limpa */}

      {/* 🏎️ DESFOQUE CINEMATOGRÁFICO DE CARROS PASSANDO COLADOS NA CÂMERA (Sem backdrop-blur para 60 FPS lisos) */}
      <div
        ref={carPassBlurRef}
        className="pointer-events-none absolute inset-0 z-20 bg-slate-950/20 transition-opacity duration-100 items-center justify-center hidden"
        style={{ opacity: 0 }}
      >
        {/* Estrias de ar periféricas no vácuo de passagem */}
        <div className="w-full h-full bg-[radial-gradient(circle_at_center,transparent_35%,rgba(15,23,42,0.4)_100%)]" />
      </div>

      {/* 🎬 EFEITO VISUAL CINEMATOGRÁFICO DE CÂMERA LENTA EM TODA A TELA (Vinheta imersiva sem poluir os corações) */}
      {isSlowMoActive && gameState === 'PLAYING' && (
        <div className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300">
          {/* Vinheta cinematográfica suave nas bordas de toda a tela */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.60)_100%)]" />
          {/* Faixas cinematográficas ultra limpas */}
          <div className="absolute top-0 inset-x-0 h-3 sm:h-5 bg-black/50" />
          <div className="absolute bottom-0 inset-x-0 h-3 sm:h-5 bg-black/50" />
        </div>
      )}

      {/* ❤️❤️❤️ CORAÇÕES DO MOTOBOY NO MODO MOTOBOY (10 no Fácil, 5 no Médio, 3 no Difícil) */}
      {gameState === 'PLAYING' && gameMode === 'motoboy' && (
        <div
          className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 z-25 flex flex-col items-center pointer-events-none select-none"
          style={{ paddingTop: 'max(4px, env(safe-area-inset-top))' }}
        >
          {/* Identificação direta do Motoboy */}
          <div className="flex items-center gap-1.5 mb-0.5 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            <span className="text-[11px] sm:text-xs md:text-sm font-black tracking-widest uppercase text-white font-fun">
              🛵 MOTOBOY
            </span>
            <span className="text-[11px] sm:text-xs md:text-sm font-black text-rose-300 font-mono">
              ({lives}/{getMaxLives(difficulty)})
            </span>
          </div>

          {/* Corações flutuantes e transparentes conforme o nível (SEM RETÂNGULO PRETO) */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 filter drop-shadow-[0_2px_6px_rgba(239,68,68,0.85)]">
            {Array.from({ length: getMaxLives(difficulty) }).map((_, i) => (
              <span
                key={i}
                className={`text-base sm:text-xl md:text-2xl transition-all duration-300 select-none ${
                  i < lives
                    ? 'opacity-100 scale-100'
                    : 'opacity-20 scale-85 grayscale contrast-50'
                }`}
                style={{
                  textShadow: i < lives ? '0 0 10px rgba(239, 68, 68, 0.95), 0 2px 4px rgba(0,0,0,0.9)' : 'none',
                }}
              >
                ❤️
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ❤️❤️❤️ 10 CORAÇÕES DO MOTOBOY NO MODO CARAMELO (SEM FUNDO PRETO) */}
      {gameState === 'PLAYING' && gameMode === 'caramelo' && (
        <div
          className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 z-25 flex flex-col items-center pointer-events-none select-none"
          style={{ paddingTop: 'max(4px, env(safe-area-inset-top))' }}
        >
          {/* Identificação do Chefe Motoboy */}
          <div className="flex items-center gap-1.5 mb-0.5 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            <span className="text-[11px] sm:text-xs md:text-sm font-black tracking-widest uppercase text-white font-fun">
              🛵 MOTOBOY
            </span>
            <span className="text-[11px] sm:text-xs md:text-sm font-black text-rose-300 font-mono">
              ({motoboyBossLives}/10)
            </span>
          </div>

          {/* 10 Corações do Motoboy no Modo Caramelo (sem fundo preto) */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 filter drop-shadow-[0_2px_6px_rgba(239,68,68,0.85)]">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className={`text-base sm:text-xl md:text-2xl transition-all duration-300 select-none ${
                  i < motoboyBossLives
                    ? 'opacity-100 scale-100'
                    : 'opacity-25 scale-85 grayscale contrast-50'
                }`}
                style={{
                  textShadow: i < motoboyBossLives ? '0 0 10px rgba(239, 68, 68, 0.95), 0 2px 4px rgba(0,0,0,0.9)' : 'none',
                }}
              >
                {i < motoboyBossLives ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TOP HUD BAR — 3D Cartoon Wood & Blue-Steel */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between pointer-events-none z-10 px-2 pt-[env(safe-area-inset-top,8px)]" style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        {/* Left Side: Pausa || + Pontos & Rosto do Motoboy */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            {/* ⏸️ BOTÃO DE PAUSA NA TELA LADO ESQUERDO */}
            {gameState === 'PLAYING' && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  togglePause();
                }}
                className={`pointer-events-auto flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer touch-manipulation select-none active:scale-90 ${
                  isGamePaused ? 'cartoon-btn-green animate-pulse' : 'cartoon-btn-gold'
                }`}
                title={isGamePaused ? 'Retomar Jogo (P / Esc)' : 'Pausar Jogo (P / Esc)'}
                aria-label="Pausar Jogo"
              >
                {isGamePaused ? (
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white drop-shadow" />
                ) : (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-4 sm:w-2 sm:h-5 bg-stone-950 rounded-full shadow-sm" />
                    <div className="w-1.5 h-4 sm:w-2 sm:h-5 bg-stone-950 rounded-full shadow-sm" />
                  </div>
                )}
              </button>
            )}

            {/* Pontos — Tábua de Madeira e Metal */}
            <div className="cartoon-wood-plank px-3 py-1 rounded-xl flex items-center gap-2 relative overflow-hidden">
              <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
              <SteelRivet className="top-1 right-1 w-1.5 h-1.5" />
              <span className="text-base filter drop-shadow">🏆</span>
              <div>
                <div className="text-[8px] text-amber-200 font-black uppercase leading-none tracking-wider cartoon-text-outline">Pontos</div>
                <div ref={scoreTextRef} className="text-sm sm:text-base font-black text-yellow-300 leading-tight tabular-nums cartoon-text-outline">{score}</div>
              </div>
            </div>

            {/* 💵 Três Contadores de Dinheiro no Topo (10, 50, 100) — Números Maiores e Mais Legíveis */}
            <div className="cartoon-steel-pill px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-2 sm:gap-2.5">
              {/* Nota de 10 */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-950/90 border-2 border-emerald-400/75 shadow-inner">
                <img
                  src="/dinheiro/icone_10_cutout.png"
                  alt="Nota 10"
                  className="w-6 h-4 sm:w-7 sm:h-5 object-contain filter drop-shadow"
                />
                <span
                  className="text-sm sm:text-base md:text-lg font-fun font-black text-emerald-300 tabular-nums leading-none"
                  style={{
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: '2px #052e16',
                    textShadow: '0 2px 0 #052e16',
                  }}
                >
                  {earnedNotes10}
                </span>
              </div>

              {/* Nota de 50 */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-950/90 border-2 border-purple-400/75 shadow-inner">
                <img
                  src="/dinheiro/icone_50_roxo_cutout.png"
                  alt="Nota 50"
                  className="w-6 h-4 sm:w-7 sm:h-5 object-contain filter drop-shadow"
                />
                <span
                  className="text-sm sm:text-base md:text-lg font-fun font-black text-purple-200 tabular-nums leading-none"
                  style={{
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: '2px #3b0764',
                    textShadow: '0 2px 0 #3b0764',
                  }}
                >
                  {earnedNotes50}
                </span>
              </div>

              {/* Nota de 100 */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-950/90 border-2 border-cyan-400/80 shadow-inner">
                <img
                  src="/dinheiro/icone_100_vermelho_cutout.png"
                  alt="Nota 100"
                  className="w-6 h-4 sm:w-7 sm:h-5 object-contain filter drop-shadow"
                />
                <span
                  className="text-sm sm:text-base md:text-lg font-fun font-black text-cyan-200 tabular-nums leading-none"
                  style={{
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: '2px #083344',
                    textShadow: '0 2px 0 #083344',
                  }}
                >
                  {earnedNotes100}
                </span>
              </div>
            </div>
          </div>

          {/* 📹 ROSTO DO MOTOBOY AO VIVO — Moldura de Madeira e Aço */}
          {gameState === 'PLAYING' && gameMode === 'motoboy' && (
            <div className="flex flex-col gap-1 self-start">
              <div className="relative w-22 h-15 sm:w-36 sm:h-24 rounded-xl overflow-hidden border-[3px] border-[#5f7d9c] shadow-[0_6px_16px_rgba(0,0,0,0.85)] bg-black/90">
                <SteelCornerBrackets size="sm" />
                <video
                  src="/videos/player_reaction.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  disablePictureInPicture
                  className="w-full h-full object-cover pointer-events-none"
                  style={{ transform: 'translateZ(0)', willChange: 'transform' }}
                />
                <div className="absolute top-1 left-1 flex items-center gap-1 bg-red-700/90 border border-red-300 px-1.5 py-0.5 rounded text-[7px] font-black text-white shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  AO VIVO
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: FPS + PAUSA + ENGRENAGEM COM DROPDOWN */}
        <div className="relative flex items-center gap-1.5 mt-0.5">
          {/* ⚡ Medidor de FPS em Tempo Real */}
          <div className="cartoon-steel-pill px-2.5 py-1.5 flex items-center gap-1.5">
            <div ref={fpsDotRef} className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
            <span ref={fpsTextRef} className="font-black font-mono tracking-tight text-[11px] text-emerald-300 cartoon-text-outline">
              60 FPS
            </span>
          </div>

          {/* ⏸️ BOTÃO DE PAUSA */}
          {gameState === 'PLAYING' && (
            <button
              onClick={togglePause}
              className="pointer-events-auto flex items-center justify-center min-w-[42px] min-h-[42px] sm:min-w-[44px] sm:min-h-[44px] cartoon-btn-steel p-2.5 rounded-xl transition-all cursor-pointer touch-manipulation"
              title={isGamePaused ? 'Retomar Jogo (P / Esc)' : 'Pausar Jogo (P / Esc)'}
            >
              {isGamePaused ? <Play className="w-4.5 h-4.5 text-emerald-300 fill-emerald-300" /> : <Pause className="w-4.5 h-4.5 text-amber-300" />}
            </button>
          )}

          {/* ⚙️ BOTÃO DE OPÇÕES COM SETA (Dropdown Compacto em Madeira & Aço) */}
          <div className="relative">
            <button
              onClick={() => setIsQuickOptionsOpen((prev) => !prev)}
              className="pointer-events-auto flex items-center justify-center gap-1.5 min-w-[42px] min-h-[42px] sm:min-h-[44px] cartoon-btn-steel px-3 py-2 rounded-xl transition-all cursor-pointer touch-manipulation"
              title="Menu de Opções Rápidas"
            >
              <Settings className="w-4.5 h-4.5 text-amber-300" />
              <ChevronDown className={`w-4 h-4 text-slate-200 transition-transform duration-200 ${isQuickOptionsOpen ? 'rotate-180 text-amber-300' : ''}`} />
            </button>

            {/* Painel Dropdown de Opções */}
            {isQuickOptionsOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 cartoon-wood-board rounded-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 pointer-events-auto flex flex-col gap-1.5 text-xs">
                <SteelCornerBrackets size="sm" />
                {/* Som */}
                <button
                  onClick={() => {
                    const isEnabled = sound.toggleMute();
                    setSoundMuted(!isEnabled);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl cartoon-wood-plank hover:brightness-110 text-white transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-black uppercase text-[11px] cartoon-text-outline">
                    {soundMuted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
                    Áudio / Música
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${soundMuted ? 'cartoon-btn-red' : 'cartoon-btn-green'}`}>
                    {soundMuted ? 'MUDO' : 'ATIVO'}
                  </span>
                </button>

                {/* Alternar Clima / Iluminação */}
                <button
                  onClick={() => {
                    if (gameRef.current.weather) {
                      gameRef.current.weather.toggleTimeOfDay();
                      const cur = (gameRef.current.weather as any).getTimeOfDay ? (gameRef.current.weather as any).getTimeOfDay() : (gameRef.current.weather as any).timeOfDay;
                      setCurrentTimeOfDay(cur);
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl cartoon-wood-plank hover:brightness-110 text-white transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-black uppercase text-[11px] cartoon-text-outline">
                    {currentTimeOfDay === 'DAY' && <Sun className="w-4 h-4 text-amber-300" />}
                    {currentTimeOfDay === 'SUNSET' && <Sunset className="w-4 h-4 text-orange-300" />}
                    {currentTimeOfDay === 'NIGHT' && <Moon className="w-4 h-4 text-cyan-300" />}
                    Iluminação
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md cartoon-btn-steel uppercase">
                    {currentTimeOfDay === 'DAY' ? 'Dia' : currentTimeOfDay === 'SUNSET' ? 'Tarde' : 'Noite'}
                  </span>
                </button>

                {/* Tela Cheia */}
                <button
                  onClick={toggleFullscreen}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl cartoon-wood-plank hover:brightness-110 text-white transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-black uppercase text-[11px] cartoon-text-outline">
                    {isFullscreen ? <Minimize className="w-4 h-4 text-cyan-300" /> : <Maximize className="w-4 h-4 text-cyan-300" />}
                    Tela Cheia
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md cartoon-btn-blue">
                    {isFullscreen ? 'SIM' : 'NÃO'}
                  </span>
                </button>

                {/* Configurações Avançadas */}
                <button
                  onClick={() => {
                    setIsQuickOptionsOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl cartoon-btn-gold text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Mais Ajustes...
                  </span>
                </button>

                {/* Sair da Corrida */}
                {gameState === 'PLAYING' && (
                  <button
                    onClick={() => {
                      setIsQuickOptionsOpen(false);
                      setShowQuitConfirm(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl cartoon-btn-red text-xs font-black uppercase tracking-wider transition-all cursor-pointer mt-0.5"
                  >
                    <Home className="w-4 h-4" />
                    Sair da Corrida
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🎬 TRANSIÇÃO CINEMATOGRÁFICA DE FADE ESCURO AO INICIAR/REINICIAR */}
      <div
        className={`pointer-events-none fixed inset-0 z-[70] bg-black transition-opacity duration-300 ease-in-out ${
          screenFadeBlack > 0 ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 💧 REALISTIC WATER SPLATTER & DRIPPING DROPLETS ON CAMERA / VISOR */}
      {waterSplatterActive && (
        <div className="absolute inset-0 pointer-events-none z-35 overflow-hidden animate-water-fade">
          {/* Subtle wet lens blur */}
          <div className="absolute inset-0 backdrop-blur-[1.5px] bg-cyan-950/15 mix-blend-overlay" />

          {waterDrops.map((drop) => (
            <div
              key={drop.id}
              className="absolute animate-water-slide"
              style={{
                left: `${drop.x}%`,
                top: `${drop.startY}%`,
                width: `${drop.size}px`,
                height: `${drop.size * 1.35}px`,
                animationDuration: `${drop.duration}s`,
                animationDelay: `${drop.delay}s`,
                transform: `scale(${drop.scaleX}, ${drop.scaleY})`,
                ['--slide-dist' as any]: `${drop.slideDist}px`,
              }}
            >
              {/* Ultra-realistic liquid droplet */}
              <div
                className="w-full h-full rounded-full border border-white/70 shadow-[inset_0_2px_4px_rgba(255,255,255,0.85),inset_0_-2px_4px_rgba(0,100,200,0.3),0_4px_8px_rgba(0,0,0,0.25)]"
                style={{
                  background: 'radial-gradient(ellipse at 35% 30%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.3) 30%, rgba(186,230,253,0.35) 60%, rgba(14,116,144,0.4) 100%)',
                }}
              >
                {/* Specular highlight pin */}
                <div className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-white/95 blur-[0.3px]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🩸 REALISTIC BLOOD SPLATTER OVERLAY (Dano / Mordida do Caramelo - Zero React Re-render via DOM ref) */}
      <div
        ref={bloodSplatterDomRef}
        className="absolute inset-0 pointer-events-none z-35 overflow-hidden transition-opacity duration-75 select-none"
        style={{
          display: 'none',
          opacity: 0,
          background: 'radial-gradient(ellipse at center, transparent 38%, rgba(185, 28, 28, 0.42) 75%, rgba(127, 29, 29, 0.88) 100%)',
          boxShadow: 'inset 0 0 110px rgba(220, 38, 38, 0.85)',
        }}
      >
        {/* Gotas e manchas de sangue nos cantos */}
        <div className="absolute top-6 left-8 text-3xl font-black opacity-90 drop-shadow-[0_0_12px_rgba(220,38,38,1)]">🩸</div>
        <div className="absolute top-12 left-20 text-xl font-black opacity-80 drop-shadow-[0_0_8px_rgba(185,28,28,1)]">💥</div>
        <div className="absolute bottom-10 right-10 text-4xl font-black opacity-90 drop-shadow-[0_0_14px_rgba(220,38,38,1)]">🩸</div>
        <div className="absolute bottom-20 right-24 text-2xl font-black opacity-75 drop-shadow-[0_0_10px_rgba(185,28,28,1)]">🩸</div>
        <div className="absolute top-14 right-16 text-3xl font-black opacity-85 drop-shadow-[0_0_12px_rgba(220,38,38,1)]">💥</div>
      </div>

      {/* 🏍️ DYNAMIC WHEELIE DISTANCE COUNTER (Zero React Re-render via DOM ref) */}
      {gameState === 'PLAYING' && gameMode === 'motoboy' && (
        <div
          ref={wheelieHudDomRef}
          style={{ display: 'none' }}
          className="absolute bottom-5 left-5 z-20 pointer-events-none select-none flex flex-col items-start"
        >
          <div className="flex flex-col items-start transition-all duration-300 transform">
            <div className="text-[10px] sm:text-xs font-black text-cyan-300 uppercase tracking-widest flex items-center gap-1 drop-shadow-md">
              <span>🔥 NO GRAU:</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span
                ref={wheelieMetersTextRef}
                className="text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-tighter text-blue-400 drop-shadow-[0_0_25px_rgba(59,130,246,0.95)]"
              >
                0
              </span>
              <span className="text-sm sm:text-base font-black text-cyan-300 font-mono tracking-widest drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]">
                M
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 🌊 TUTORIAL / INSTRUÇÃO DE DESVIO DO JATO DE ÁGUA — 3D CARTOON WOOD & GOLD PREMIUM */}
      {waterJetTutorialActive && gameState === 'PLAYING' && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-auto select-none p-4 animate-fade-in"
          onTouchStart={(e) => {
            const touch = e.touches[0];
            touchStartXRef.current = touch.clientX;
          }}
          onTouchMove={(e) => {
            if (!touchStartXRef.current) return;
            const diffX = e.touches[0].clientX - touchStartXRef.current;
            if (diffX < -25) {
              touchStartXRef.current = 0;
              handleWaterJetDodge('left');
            } else if (diffX > 25) {
              touchStartXRef.current = 0;
              handleWaterJetDodge('right');
            }
          }}
          onMouseDown={(e) => {
            touchStartXRef.current = e.clientX;
          }}
          onMouseMove={(e) => {
            if (!touchStartXRef.current) return;
            const diffX = e.clientX - touchStartXRef.current;
            if (diffX < -30) {
              touchStartXRef.current = 0;
              handleWaterJetDodge('left');
            } else if (diffX > 30) {
              touchStartXRef.current = 0;
              handleWaterJetDodge('right');
            }
          }}
          onMouseUp={() => {
            touchStartXRef.current = 0;
          }}
        >
          <div className="relative flex flex-col items-center gap-4 sm:gap-5 text-center select-none max-w-md w-full">
            {/* Placa Superior de Alerta 3D em Madeira & Ouro */}
            <div className="relative cartoon-wood-header px-5 sm:px-7 py-2 sm:py-2.5 rounded-2xl border-[3px] border-[#fbbf24] shadow-[0_8px_24px_rgba(0,0,0,0.9)] flex items-center gap-2.5 animate-bounce-subtle">
              <SteelCornerBrackets size="sm" />
              <SteelRivet className="top-1.5 left-1.5 w-1.5 h-1.5" />
              <SteelRivet className="top-1.5 right-1.5 w-1.5 h-1.5" />
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#b45309] border-2 border-[#fef08a] flex items-center justify-center shadow-md shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow">
                  <path d="M12 3 L22 20 L2 20 Z" fill="#ef4444" stroke="#451a03" strokeWidth="2" strokeLinejoin="round" />
                  <rect x="11" y="9" width="2" height="5.5" rx="1" fill="#ffffff" />
                  <circle cx="12" cy="17" r="1.2" fill="#ffffff" />
                </svg>
              </div>
              <span
                className="font-fun font-black text-base sm:text-xl md:text-2xl tracking-wide uppercase"
                style={{
                  color: '#fde047',
                  paintOrder: 'stroke fill',
                  WebkitTextStroke: '3px #3b1304',
                  textShadow: '0 3px 0 #3b1304, 0 5px 10px rgba(0,0,0,0.85)',
                }}
              >
                JATO D'ÁGUA À FRENTE!
              </span>
            </div>

            {/* Botões de Seta 3D Cartoon Dourados/Madeira + Indicador Central de Arraste */}
            <div className="flex items-center justify-center gap-5 sm:gap-8 my-1">
              {/* Seta Esquerda 3D Cartoon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleWaterJetDodge('left');
                }}
                className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl cartoon-btn-gold flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-[0_8px_0_#78350f,0_14px_28px_rgba(0,0,0,0.9)]"
                title="Desviar para a Esquerda"
              >
                <SteelCornerBrackets size="sm" />
                <SteelRivet className="top-1.5 left-1.5 w-2 h-2" />
                <SteelRivet className="top-1.5 right-1.5 w-2 h-2" />
                <SteelRivet className="bottom-1.5 left-1.5 w-2 h-2" />
                <SteelRivet className="bottom-1.5 right-1.5 w-2 h-2" />
                <svg
                  viewBox="0 0 64 64"
                  className="w-12 h-12 sm:w-14 sm:h-14 animate-arrow-left drop-shadow-[0_4px_4px_rgba(0,0,0,0.65)]"
                >
                  <defs>
                    <linearGradient id="arrowWhiteLeft" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="60%" stopColor="#fef08a" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M34 10 L10 32 L34 54 L34 41 L54 41 L54 23 L34 23 Z"
                    fill="url(#arrowWhiteLeft)"
                    stroke="#3b1304"
                    strokeWidth="4.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Centro: Mão Animada + Faixa Dourada ARRASTE */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl cartoon-wood-board border-2 border-[#fbbf24] flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.85)] animate-horizontal-swipe">
                  <span className="text-3xl sm:text-4xl drop-shadow-[0_3px_4px_rgba(0,0,0,0.8)]">👆</span>
                </div>
                <div className="cartoon-gold-ribbon px-3.5 py-1 rounded-xl border-2 border-[#451a03] shadow-lg flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-[#2e1005]">◀</span>
                  <span
                    className="font-fun font-black text-xs sm:text-sm uppercase tracking-wider text-white"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: '2px #3b1304',
                      textShadow: '0 2px 0 #3b1304',
                    }}
                  >
                    ARRASTE
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#2e1005]">▶</span>
                </div>
              </div>

              {/* Seta Direita 3D Cartoon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleWaterJetDodge('right');
                }}
                className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl cartoon-btn-gold flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-[0_8px_0_#78350f,0_14px_28px_rgba(0,0,0,0.9)]"
                title="Desviar para a Direita"
              >
                <SteelCornerBrackets size="sm" />
                <SteelRivet className="top-1.5 left-1.5 w-2 h-2" />
                <SteelRivet className="top-1.5 right-1.5 w-2 h-2" />
                <SteelRivet className="bottom-1.5 left-1.5 w-2 h-2" />
                <SteelRivet className="bottom-1.5 right-1.5 w-2 h-2" />
                <svg
                  viewBox="0 0 64 64"
                  className="w-12 h-12 sm:w-14 sm:h-14 animate-arrow-right drop-shadow-[0_4px_4px_rgba(0,0,0,0.65)]"
                >
                  <defs>
                    <linearGradient id="arrowWhiteRight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="60%" stopColor="#fef08a" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M30 10 L54 32 L30 54 L30 41 L10 41 L10 23 L30 23 Z"
                    fill="url(#arrowWhiteRight)"
                    stroke="#3b1304"
                    strokeWidth="4.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Faixa Inferior de Instrução 3D em Madeira Esculpida */}
            <div className="relative cartoon-wood-plank px-5 py-2 rounded-xl border-2 border-[#f59e0b] shadow-[0_6px_18px_rgba(0,0,0,0.9)]">
              <SteelRivet className="left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5" />
              <SteelRivet className="right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5" />
              <p
                className="font-fun font-black text-xs sm:text-base text-white uppercase tracking-wider px-2"
                style={{
                  paintOrder: 'stroke fill',
                  WebkitTextStroke: '2.5px #2e1005',
                  textShadow: '0 2px 0 #2e1005, 0 4px 8px rgba(0,0,0,0.85)',
                }}
              >
                TOQUE NA SETA OU ARRASTE PARA DESVIAR!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 📱 CONTROLES VIRTUAIS 3D CARTOON ARCADE PREMIUM */}
      {showOnScreenControls && gameState === 'PLAYING' && (
        <div className="absolute inset-0 pointer-events-none z-25 select-none">
          {/* Lado Esquerdo: Dois botões táteis 3D metálicos para Desvio ◀ e ▶ */}
          <div
            className="absolute bottom-5 left-3 sm:left-6 flex items-center gap-3.5 sm:gap-5 pointer-events-auto"
            style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
          >
            {/* Botão Seta Esquerda ◀ 3D Cartoon */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                if (waterJetTutorialActive) { handleWaterJetDodge('left'); return; }
                gameRef.current.keys.left = true;
                gameRef.current.keys.right = false;
              }}
              onPointerUp={(e) => { e.preventDefault(); gameRef.current.keys.left = false; }}
              onPointerLeave={(e) => { e.preventDefault(); gameRef.current.keys.left = false; }}
              onTouchStart={(e) => {
                e.preventDefault();
                if (waterJetTutorialActive) { handleWaterJetDodge('left'); return; }
                gameRef.current.keys.left = true;
                gameRef.current.keys.right = false;
              }}
              onTouchEnd={(e) => { e.preventDefault(); gameRef.current.keys.left = false; }}
              className="group relative w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-b from-[#3b82f6] via-[#1d4ed8] to-[#1e3a8a] border-[3px] border-[#93c5fd] shadow-[0_6px_0_#0f172a,0_10px_20px_rgba(0,0,0,0.85),inset_0_2px_0_rgba(255,255,255,0.45)] active:translate-y-1 active:shadow-[0_2px_0_#0f172a,0_4px_10px_rgba(0,0,0,0.8)] transition-all flex items-center justify-center select-none cursor-pointer touch-manipulation"
              title="Desviar para a Esquerda"
            >
              <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shadow-inner" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shadow-inner" />
              <span className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shadow-inner" />
              <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shadow-inner" />
              <svg viewBox="0 0 24 24" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_3px_2px_rgba(0,0,0,0.75)]">
                <path d="M15.5 4.5L7.5 12l8 7.5V4.5z" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Botão Seta Direita ▶ 3D Cartoon */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                if (waterJetTutorialActive) { handleWaterJetDodge('right'); return; }
                gameRef.current.keys.right = true;
                gameRef.current.keys.left = false;
              }}
              onPointerUp={(e) => { e.preventDefault(); gameRef.current.keys.right = false; }}
              onPointerLeave={(e) => { e.preventDefault(); gameRef.current.keys.right = false; }}
              onTouchStart={(e) => {
                e.preventDefault();
                if (waterJetTutorialActive) { handleWaterJetDodge('right'); return; }
                gameRef.current.keys.right = true;
                gameRef.current.keys.left = false;
              }}
              onTouchEnd={(e) => { e.preventDefault(); gameRef.current.keys.right = false; }}
              className="group relative w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-b from-[#3b82f6] via-[#1d4ed8] to-[#1e3a8a] border-[3px] border-[#93c5fd] shadow-[0_6px_0_#0f172a,0_10px_20px_rgba(0,0,0,0.85),inset_0_2px_0_rgba(255,255,255,0.45)] active:translate-y-1 active:shadow-[0_2px_0_#0f172a,0_4px_10px_rgba(0,0,0,0.8)] transition-all flex items-center justify-center select-none cursor-pointer touch-manipulation"
              title="Desviar para a Direita"
            >
              <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shadow-inner" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shadow-inner" />
              <span className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shadow-inner" />
              <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shadow-inner" />
              <svg viewBox="0 0 24 24" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_3px_2px_rgba(0,0,0,0.75)]">
                <path d="M8.5 4.5L16.5 12l-8 7.5V4.5z" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Lado Direito: Ações em Modo Motoboy (Chutar Cão + Grau + Pular) */}
          {gameMode === 'motoboy' && (
            <div
              className="absolute bottom-5 right-3 sm:right-6 flex flex-col items-end gap-2.5 pointer-events-auto"
              style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
            >
              {/* Botão 3D Laranja: Chutar Cão */}
              <button
                onClick={(e) => { e.preventDefault(); executeAction(); }}
                className="relative px-4 py-2 rounded-xl bg-gradient-to-b from-[#fb923c] via-[#ea580c] to-[#9a3412] border-2 border-[#fed7aa] shadow-[0_4px_0_#431407,0_8px_16px_rgba(0,0,0,0.85),inset_0_2px_0_rgba(255,255,255,0.4)] active:translate-y-1 active:shadow-[0_1px_0_#431407] text-white flex items-center gap-2 transition-all select-none cursor-pointer"
                title="Chutar para afastar o cão"
              >
                <span className="text-base drop-shadow">🥾</span>
                <span className="text-xs font-black uppercase tracking-wider cartoon-title-3d">CHUTAR CÃO</span>
              </button>

              {/* Par Principal de Botões 3D: Grau/Empinar + Pular */}
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Botão Grau / Empinar (Âmbar Dourado 3D) */}
                <button
                  onPointerDown={(e) => { e.preventDefault(); gameRef.current.keys.jump = true; }}
                  onPointerUp={(e) => { e.preventDefault(); gameRef.current.keys.jump = false; }}
                  onPointerLeave={(e) => { e.preventDefault(); gameRef.current.keys.jump = false; }}
                  onTouchStart={(e) => { e.preventDefault(); gameRef.current.keys.jump = true; }}
                  onTouchEnd={(e) => { e.preventDefault(); gameRef.current.keys.jump = false; }}
                  className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-b from-[#facc15] via-[#eab308] to-[#b45309] border-[3px] border-[#fef08a] shadow-[0_6px_0_#451a03,0_10px_20px_rgba(0,0,0,0.85),inset_0_2px_0_rgba(255,255,255,0.55)] active:translate-y-1 active:shadow-[0_2px_0_#451a03] transition-all flex flex-col items-center justify-center p-1.5 select-none cursor-pointer"
                  title="Segure para dar Grau / Empinar"
                >
                  <img src="/icons/icone_empinar.png" alt="Empinar" className="w-11 h-11 sm:w-13 sm:h-13 object-contain pointer-events-none select-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.75)]" />
                  <span className="text-[9px] sm:text-[10px] font-black text-white cartoon-title-3d -mt-1 uppercase tracking-wider">
                    GRAU
                  </span>
                </button>

                {/* Botão Pular (Verde Esmeralda / Ciano 3D) */}
                <button
                  onClick={(e) => { e.preventDefault(); executeJump(); }}
                  className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-b from-[#4ade80] via-[#16a34a] to-[#14532d] border-[3px] border-[#bbf7d0] shadow-[0_6px_0_#052e16,0_10px_20px_rgba(0,0,0,0.85),inset_0_2px_0_rgba(255,255,255,0.5)] active:translate-y-1 active:shadow-[0_2px_0_#052e16] transition-all flex flex-col items-center justify-center select-none cursor-pointer"
                  title="Pular / Impulso de Aceleração"
                >
                  <svg viewBox="0 0 24 24" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_3px_2px_rgba(0,0,0,0.7)]">
                    <path d="M12 4.5l-7.5 8h5v7h5v-7h5L12 4.5z" fill="#ffffff" stroke="#052e16" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[9px] sm:text-[10px] font-black text-white cartoon-title-3d -mt-0.5 uppercase tracking-wider">
                    PULAR
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Lado Direito: Ações em Modo Caramelo (Pulo 3D) */}
          {gameMode === 'caramelo' && (
            <div
              className="absolute bottom-5 right-3 sm:right-6 flex items-center pointer-events-auto"
              style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={(e) => { e.preventDefault(); executeJump(); }}
                className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-b from-[#4ade80] via-[#16a34a] to-[#14532d] border-[3px] border-[#bbf7d0] shadow-[0_6px_0_#052e16,0_10px_20px_rgba(0,0,0,0.85),inset_0_2px_0_rgba(255,255,255,0.5)] active:translate-y-1 active:shadow-[0_2px_0_#052e16] transition-all flex flex-col items-center justify-center select-none cursor-pointer"
                title="Pular"
              >
                <svg viewBox="0 0 24 24" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_3px_2px_rgba(0,0,0,0.7)]">
                  <path d="M12 4.5l-7.5 8h5v7h5v-7h5L12 4.5z" fill="#ffffff" stroke="#052e16" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
                <span className="text-[9px] sm:text-[10px] font-black text-white cartoon-title-3d -mt-0.5 uppercase">PULAR</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 🐕 STATUS DO CARAMELO (VIDAS + ESTAMINA) — CENTRO INFERIOR LIMPO, SEM FUNDO PRETO E SEM COBRIR BOTÕES */}
      {gameState === 'PLAYING' && gameMode === 'caramelo' && (
        <div
          className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-25 flex flex-col items-center pointer-events-none select-none"
          style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}
        >
          {/* Corações do Caramelo */}
          <div className="flex items-center gap-1 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            <span className="text-xs sm:text-sm mr-0.5 filter drop-shadow">🐕</span>
            {Array.from({ length: getMaxLives(difficulty) }).map((_, idx) => (
              <span
                key={idx}
                className={`text-xs sm:text-sm transition-all duration-200 ${
                  idx < carameloLives ? 'opacity-100 scale-100' : 'opacity-25 scale-85 grayscale contrast-50'
                }`}
                style={{
                  textShadow: idx < carameloLives ? '0 0 10px rgba(239, 68, 68, 0.95), 0 2px 4px rgba(0,0,0,0.9)' : 'none',
                }}
              >
                {idx < carameloLives ? '❤️' : '🖤'}
              </span>
            ))}
          </div>

          {/* Barra de Estamina Slim */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-300 tracking-wider flex items-center gap-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              <span>⚡</span>
              {dogStamina >= 50 && (
                <span className="text-[7px] text-amber-300 font-bold uppercase bg-amber-500/25 px-1 py-0.2 rounded animate-pulse">
                  SPRINT
                </span>
              )}
            </span>
            <div className="w-32 sm:w-44 h-1.5 sm:h-2 bg-black/40 backdrop-blur-sm rounded-full overflow-hidden border border-emerald-400/30 p-[1px] shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              <div
                ref={dogStaminaBarRef}
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-green-300 rounded-full transition-[width] duration-75 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                style={{ width: `${dogStamina}%` }}
              />
            </div>
            <span ref={dogStaminaTextRef} className="text-[9px] sm:text-[10px] font-black font-mono text-emerald-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              {Math.round(dogStamina)}%
            </span>
          </div>
        </div>
      )}

      {/* 📏 RADAR DE PERSEGUIÇÃO: CARAMELO VS MOTOBOY */}
      {gameState === 'PLAYING' && gameMode === 'caramelo' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none flex flex-col items-center">
          <div className={`px-4 py-1.5 rounded-full border-2 shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all duration-300 ${
            motoboyDistance <= 4.0
              ? 'bg-red-950/95 border-red-500 text-red-200 animate-pulse shadow-red-500/60 scale-105'
              : motoboyDistance <= 10.0
              ? 'bg-amber-950/90 border-amber-400 text-amber-300 shadow-amber-500/40'
              : 'bg-slate-950/85 border-cyan-500/50 text-cyan-200 shadow-cyan-500/20'
          }`}>
            <span className="text-base">{motoboyDistance <= 4.0 ? '🚨' : motoboyDistance <= 10.0 ? '🐕' : '🛵'}</span>
            <span className="text-xs font-black uppercase tracking-wider font-fun">
              {motoboyDistance <= 4.0
                ? `ZONA DE MORDIDA! ${motoboyDistance.toFixed(1)}m`
                : `PERSEGUINDO MOTOBOY: ${motoboyDistance.toFixed(1)}m`}
            </span>
          </div>
        </div>
      )}

      {/* 📢 POPUPS DE AVISO E FALAS DO MOTOBOY (ALTAMENTE LEGÍVEIS COM DURAÇÃO AMPLIADA - ZERO REACT RE-RENDERS & ZERO REFLOW) */}
      <div
        ref={inGameAlertsContainerRef}
        className="absolute top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none flex flex-col items-center gap-2 max-w-md w-full px-4 transition-opacity duration-150"
        style={{ opacity: 0, transform: 'translate3d(-50%, 0, 0)', willChange: 'opacity, transform' }}
      >
        {/* Pop-up de Notificação do Jogo */}
        <div
          ref={damagePopBoxRef}
          className="bg-stone-950/95 border-2 border-amber-400 text-yellow-300 text-xs sm:text-sm md:text-base font-black uppercase tracking-wider px-4 py-2 rounded-2xl shadow-xl shadow-amber-500/20 font-fun text-center animate-bounce-subtle transition-all duration-150"
          style={{ opacity: 0, transform: 'translate3d(0, -6px, 0) scale(0.96)', willChange: 'opacity, transform' }}
        >
          <span ref={damagePopTextRef}>🌊</span>
        </div>

        {/* Balão de Fala do Motoboy */}
        <div
          ref={motoboySpeechBoxRef}
          className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white text-xs sm:text-sm font-extrabold px-4.5 py-2 rounded-full shadow-lg shadow-rose-950/50 border-2 border-rose-300 font-fun text-center flex items-center gap-2 transition-all duration-150"
          style={{ opacity: 0, transform: 'translate3d(0, -6px, 0) scale(0.96)', willChange: 'opacity, transform' }}
        >
          <span className="text-base">💬</span>
          <span ref={motoboySpeechTextRef}></span>
        </div>
      </div>

      {/* 🎯 ALVO DE MORDIDA FLUTUANTE QUE SEGUE A TRASEIRA DO MOTOBOY NA TELA */}
      {gameState === 'PLAYING' && gameMode === 'caramelo' && !dogQTE.active && (
        <div
          ref={biteTargetDomRef}
          className="absolute z-35 pointer-events-auto select-none items-center justify-center flex-col cursor-pointer transition-transform duration-75"
          style={{
            display: 'none',
            left: '50%',
            top: '45%',
            transform: 'translate(-50%, -50%)',
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerBiteChallenge();
          }}
        >
          <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-red-600 via-amber-500 to-yellow-400 border-2 border-yellow-200 shadow-[0_0_32px_rgba(239,68,68,0.95),0_0_15px_rgba(245,158,11,0.8)] active:scale-90 transition-transform">
            <div className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping pointer-events-none" />
            <span className="text-2xl sm:text-3xl filter drop-shadow">🦷</span>
          </div>
          <span className="mt-1 bg-black/90 text-yellow-300 border border-yellow-400/60 text-[10px] sm:text-xs font-black uppercase px-2.5 py-1 rounded-full font-fun tracking-wider shadow-lg whitespace-nowrap animate-pulse flex items-center gap-1">
            <span>⚡</span>
            <span>MORDER! (CLIQUE OU ESPAÇO)</span>
          </span>
        </div>
      )}

      {/* 🦷 ANIMAÇÃO DAS DUAS IMAGENS DE MORDIDA NO MOTOBOY (BOCA ABERTA -> BOCA FECHADA) */}
      {biteAnimStage && (
        <div
          ref={biteAnimDomRef}
          className="absolute z-55 pointer-events-none select-none flex items-center justify-center"
          style={{
            left: `${biteAnimPos.x}%`,
            top: `${biteAnimPos.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {biteAnimStage === 'open' ? (
            <img
              src="/mordida/dentes_aberto_so.png"
              alt="Mordida Aberta"
              className="w-18 h-18 sm:w-22 sm:h-22 md:w-26 md:h-26 object-contain animate-scale-in filter drop-shadow-[0_0_18px_rgba(239,68,68,0.95)]"
            />
          ) : (
            <img
              src="/mordida/dentes_fechado_so.png"
              alt="Mordida Fechada"
              className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain scale-105 filter drop-shadow-[0_0_22px_rgba(220,38,38,1)]"
            />
          )}
        </div>
      )}

      {/* ⚡ DESAFIO DE MORDIDA COM LINHA OSCILANDO NO MEIO — VISÍVEL NO PC E NO MOBILE */}
      {gameState === 'PLAYING' && gameMode === 'caramelo' && dogQTE.active && (
        <div
          className="absolute inset-x-0 bottom-24 sm:bottom-28 flex flex-col items-center justify-center pointer-events-auto animate-fade-in select-none px-4 z-50"
          style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        >
          {/* Aviso em destaque */}
          <div className="mb-2">
            <span className="bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 text-white font-black text-xs sm:text-sm uppercase px-4 py-1.5 rounded-full shadow-[0_0_25px_rgba(245,158,11,0.85)] border border-yellow-300 font-fun tracking-wider animate-pulse flex items-center gap-1.5">
              <span>⚡</span>
              <span>ACERTE A LINHA NO MEIO!</span>
              <span>⚡</span>
            </span>
          </div>

          {/* BARRA DE TIMING COM TRILHO, ZONA VERDE CENTRAL E PONTEIRO DINÂMICO */}
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDogQTEHit();
            }}
            className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-stone-950/95 border-2 border-amber-400 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_40px_rgba(0,0,0,0.95),0_0_25px_rgba(245,158,11,0.5)] backdrop-blur-md flex flex-col items-center cursor-pointer select-none"
          >
            {/* Trilho Horizontal */}
            <div className="relative w-full h-10 sm:h-12 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-700 shadow-inner flex items-center">
              {/* Lateral Esquerda (Fora do Alvo) */}
              <div className="w-[36%] h-full bg-gradient-to-r from-red-950/80 to-red-600/40 flex items-center justify-start pl-2">
                <span className="text-[10px] font-black text-red-400/80 uppercase tracking-tighter">ERRO</span>
              </div>

              {/* ZONA CENTRAL DE MORDIDA (MEIO - VERDE NEON COM BRILHO) */}
              <div className="w-[28%] h-full bg-gradient-to-r from-emerald-600/80 via-emerald-500 to-emerald-600/80 border-x-2 border-emerald-300 shadow-[inset_0_0_18px_rgba(34,197,94,0.95)] flex items-center justify-center relative">
                <div className="absolute inset-0 bg-emerald-400/25 animate-pulse pointer-events-none" />
                <span className="text-[11px] sm:text-xs font-black text-white font-fun uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] z-10 flex items-center gap-1">
                  <span>⭐</span>
                  <span>MEIO</span>
                  <span>⭐</span>
                </span>
              </div>

              {/* Lateral Direita (Fora do Alvo) */}
              <div className="w-[36%] h-full bg-gradient-to-l from-red-950/80 to-red-600/40 flex items-center justify-end pr-2">
                <span className="text-[10px] font-black text-red-400/80 uppercase tracking-tighter">ERRO</span>
              </div>

              {/* Marcador Central de 50% */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-yellow-300 pointer-events-none z-15 shadow-[0_0_8px_#fde047]" />

              {/* ⚡ LINHA / PONTEIRO OSCILANTE (60 FPS VIA DOM REF) */}
              <div
                ref={qtePointerRef}
                className="absolute top-0 bottom-0 w-3 -ml-1.5 flex flex-col items-center justify-between z-20 pointer-events-none"
                style={{ left: '50%' }}
              >
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-yellow-300 drop-shadow-[0_0_6px_#facc15]" />
                <div className="w-1.5 h-full bg-white shadow-[0_0_12px_#ffffff,0_0_6px_#fde047] rounded-full" />
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-yellow-300 drop-shadow-[0_0_6px_#facc15]" />
              </div>
            </div>

            {/* Botão de Mordida com Toque Rápido */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDogQTEHit();
              }}
              className="mt-2.5 w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 font-black text-sm sm:text-base uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/40 active:scale-95 transition-transform flex items-center justify-center gap-2 border border-yellow-200 cursor-pointer"
            >
              <span className="text-xl">🦷</span>
              <span>MORDER NO MEIO! (OU APERTE ESPAÇO)</span>
            </button>
          </div>
        </div>
      )}

      {/* 📱 STUNT BUTTONS NO AR */}
      {gameState === 'PLAYING' && gameMode === 'motoboy' && isMegaJumping && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-25 flex items-center gap-2 pointer-events-auto">
          <button
            onPointerDown={() => { gameRef.current.keys.frontFlip = true; }}
            onPointerUp={() => { gameRef.current.keys.frontFlip = false; }}
            onPointerLeave={() => { gameRef.current.keys.frontFlip = false; }}
            className="px-4 py-2.5 bg-amber-500/80 text-slate-950 font-black text-[10px] uppercase rounded-xl active:scale-90 border border-yellow-200 flex items-center gap-1 select-none transition-transform"
          >
            <span>🔄 FRENTE</span>
          </button>
          <button
            onPointerDown={() => { gameRef.current.keys.backFlip = true; }}
            onPointerUp={() => { gameRef.current.keys.backFlip = false; }}
            onPointerLeave={() => { gameRef.current.keys.backFlip = false; }}
            className="px-4 py-2.5 bg-cyan-500/80 text-white font-black text-[10px] uppercase rounded-xl active:scale-90 border border-cyan-200 flex items-center gap-1 select-none transition-transform"
          >
            <span>🔃 TRÁS</span>
          </button>
        </div>
      )}

      {/* 🏍️ CUSTOM 3D MOTORCYCLE DASHBOARD (Centralizado na parte inferior como guidão real, sem sobrepor botões!) */}
      {gameState === 'PLAYING' && gameMode === 'motoboy' && (
        <div
          ref={desktopDashRef}
          className={`hidden sm:block absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none transition-transform duration-75 origin-bottom sm:scale-80 md:scale-95 ${
            isHyperSpeed ? 'animate-dash-tremor' : ''
          }`}
        >
          <div className="relative w-64 sm:w-72 md:w-80 h-auto">
            {/* 🔥 EFEITO DE FOGO SUAVE E ELEGANTE ATRÁS DO PAINEL (> 100 KM/H, SEM EXAGERO) */}
            {isHyperSpeed && (
              <div className="absolute -inset-2 -z-10 pointer-events-none flex items-center justify-center overflow-visible">
                {/* Brilho de calor suave e dinâmico avermelhado/alaranjado contornando o painel */}
                <div className="absolute -inset-1 rounded-[45px] bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.45)_0%,rgba(245,158,11,0.22)_55%,rgba(0,0,0,0)_80%)] blur-md animate-pulse" />
                {/* Sutil labareda suave ascendente nas bordas superiores sem ofuscar */}
                <div className="absolute -top-3 inset-x-8 h-8 bg-gradient-to-t from-red-600/35 via-amber-500/25 to-transparent blur-xs rounded-full animate-fire-roar" />
              </div>
            )}

            {/* Dashboard Shell Image */}
            <img
              src="/images/dashboard_v3.png"
              alt="Painel da Moto"
              className={`w-full h-auto drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] filter brightness-105 ${
                isHyperSpeed ? 'drop-shadow-[0_4px_16px_rgba(239,68,68,0.45)]' : ''
              }`}
            />

            {/* 🔥 LEFT CIRCLE DIAL: SPEEDOMETER (Centralizado perfeitamente no centro do círculo esquerdo, sem brilho de fundo) */}
            <div className="absolute top-[42.4%] left-[29.4%] -translate-x-1/2 -translate-y-1/2 w-[24%] h-[40%] flex flex-col items-center justify-center pointer-events-none">
              <span
                ref={desktopSpeedRef}
                className={`font-black font-mono tracking-tighter text-white leading-none ${
                  isHyperSpeed ? 'text-3xl sm:text-4xl text-yellow-200' : 'text-2xl sm:text-3xl'
                }`}
              >
                {speedKmh}
              </span>
              <span className="text-[8px] sm:text-[9px] font-black font-mono tracking-widest text-slate-200 mt-1">
                KM/H
              </span>
            </div>

            {/* 🎯 CENTER DIGITAL DISPLAY: MARCHA */}
            <div className="absolute top-[43.0%] left-[50.0%] -translate-x-1/2 -translate-y-1/2 w-[14%] h-[32%] flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[7px] sm:text-[8px] font-bold text-slate-400 uppercase leading-none">
                GEAR
              </span>
              <span ref={desktopGearRef} className="text-sm sm:text-base font-black font-mono text-emerald-400">
                {speedKmh < 5 ? 'N' : Math.min(5, Math.floor(speedKmh / 18) + 1)}
              </span>
            </div>

            {/* 🐕 / 🚀 RIGHT CIRCLE DIAL: WHEELIE OU DISTÂNCIA DO DOG (Zero React Re-render via DOM refs) */}
            <div className="absolute top-[42.4%] left-[70.6%] -translate-x-1/2 -translate-y-1/2 w-[24%] h-[40%] flex flex-col items-center justify-center pointer-events-none">
              <span
                ref={desktopWheelieTextRef}
                className="text-2xl sm:text-3xl font-black font-mono tracking-tighter text-white leading-none"
              >
                {motoboyDistance.toFixed(1)}
              </span>
              <span
                ref={desktopWheelieLabelRef}
                className="text-[8px] sm:text-[9px] font-black font-mono tracking-widest text-slate-200 mt-1"
              >
                DOG (M)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 🎬 INTRO CINEMATIC (Disponível apenas quando explicitamente solicitado pelo jogador) */}
      {showIntroCinematic && (
        <IntroCinematic
          onComplete={() => {
            setShowIntroCinematic(false);
          }}
        />
      )}


      {/* 🚀 TELA DE CARREGAMENTO (0% A 100%) - DESIGN 3D ANIMADO EM MADEIRA ENTALHADA & OURO */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-3 sm:p-6 text-center select-none overflow-hidden animate-fade-in bg-[#1f0a02]">
          {/* Fundo Pôr do Sol Brasileiro Vibrante & Quente (Sem Cinza) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 28%, rgba(251, 191, 36, 0.38) 0%, rgba(180, 83, 9, 0.55) 45%, rgba(45, 14, 4, 0.98) 100%)',
            }}
          />

          {/* Ícones Flutuantes Animados do Corre na Quebrada */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            <span className="absolute top-[12%] left-[10%] text-3xl sm:text-5xl animate-bounce" style={{ animationDuration: '2.4s' }}>🛵</span>
            <span className="absolute top-[16%] right-[12%] text-3xl sm:text-5xl animate-bounce" style={{ animationDuration: '2.8s' }}>🐕</span>
            <span className="absolute bottom-[18%] left-[14%] text-2xl sm:text-4xl animate-pulse" style={{ animationDuration: '2.1s' }}>💵</span>
            <span className="absolute bottom-[15%] right-[14%] text-2xl sm:text-4xl animate-bounce" style={{ animationDuration: '2.6s' }}>🏆</span>
            <span className="absolute top-[48%] left-[6%] text-2xl sm:text-3xl animate-pulse" style={{ animationDuration: '1.9s' }}>⭐</span>
            <span className="absolute top-[45%] right-[7%] text-2xl sm:text-3xl animate-bounce" style={{ animationDuration: '3.1s' }}>🦴</span>
          </div>

          {/* Placa Principal de Madeira Entalhada com Cantoneiras Douradas e Pregos */}
          <div className="relative z-10 w-full max-w-md sm:max-w-lg cartoon-wood-board rounded-[30px] p-5 sm:p-7 flex flex-col items-center shadow-2xl">
            <SteelCornerBrackets size="lg" />
            <SteelRivet className="top-2.5 left-1/2 -translate-x-1/2 absolute" />
            <SteelRivet className="bottom-2.5 left-1/2 -translate-x-1/2 absolute" />

            {/* Logo Oficial com Halo Dourado Giratório & Animação Viva */}
            <div className="relative mb-3 sm:mb-4 flex items-center justify-center">
              <div
                className="absolute -inset-3 rounded-[28px] border-2 border-dashed border-amber-300/70 animate-spin pointer-events-none"
                style={{ animationDuration: '10s' }}
              />
              <div className="absolute -inset-2 rounded-3xl bg-amber-400/35 blur-md pointer-events-none animate-pulse" />
              <div className="relative p-1.5 rounded-3xl bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#b45309] border-2 border-[#fef9c3] shadow-[0_6px_0_#451a03,0_10px_20px_rgba(0,0,0,0.75)] animate-bounce" style={{ animationDuration: '2.2s' }}>
                <img
                  src="/logo.jpg"
                  alt="Logo Vira-Lata Run"
                  className="w-18 h-18 sm:w-24 sm:h-24 rounded-2xl object-cover"
                />
              </div>
            </div>

            {/* Título 3D Extrudado & Faixa Dourada */}
            <h1 className="cartoon-title-3d text-2xl sm:text-4xl md:text-5xl uppercase tracking-tight leading-none">
              VIRA-LATA <span className="cartoon-title-gold-3d">RUN 3D</span>
            </h1>

            <div className="mt-2 px-4 py-1 rounded-full cartoon-gold-ribbon font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
              <span>🔥</span>
              <span>O CORRE NUNCA PARA NA QUEBRADA!</span>
              <span>🔥</span>
            </div>

            {/* 4 Etapas Visuais Animadas do Carregamento */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full mt-4 mb-3">
              {[
                { icon: '🏘️', label: 'Quebrada', done: loadingSteps.houses },
                { icon: '🚶', label: 'Moradores', done: loadingSteps.npcs },
                { icon: '🌳', label: 'Cenário', done: loadingSteps.trees },
                { icon: '⚡', label: '60 FPS', done: loadingSteps.shaders },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`p-1.5 sm:p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300 ${
                    step.done
                      ? 'cartoon-btn-green scale-[1.03]'
                      : 'cartoon-wood-inset border-[#b45309] text-amber-200/70'
                  }`}
                >
                  <span className={`text-base sm:text-lg ${!step.done ? 'animate-bounce' : ''}`}>
                    {step.done ? '✅' : step.icon}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight mt-0.5 truncate w-full">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Seção da Barra de Progresso 3D em Madeira Esculpida */}
            <div className="w-full cartoon-wood-plank p-3 sm:p-3.5 rounded-2xl relative">
              <SteelRivet className="top-1.5 left-1.5 w-1.5 h-1.5 absolute" />
              <SteelRivet className="top-1.5 right-1.5 w-1.5 h-1.5 absolute" />

              <div className="flex items-center justify-between w-full mb-1.5 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-200 cartoon-text-outline">
                    {loadingProgress >= 100 ? '✨ PRONTO PRA CORRER!' : '🛵 PREPARANDO PISTA...'}
                  </span>
                  {loadingProgress < 100 && (
                    <span className="text-[10px] font-mono font-black text-amber-950 bg-gradient-to-b from-amber-300 to-amber-500 px-2 py-0.5 rounded-full border border-yellow-100 flex items-center gap-1 shadow">
                      <span>⚡</span>
                      <span>
                        {downloadSpeedKbps === 0
                          ? 'Turbo...'
                          : downloadSpeedKbps > 1024
                          ? `${(downloadSpeedKbps / 1024).toFixed(1)} MB/s`
                          : `${downloadSpeedKbps} KB/s`}
                      </span>
                    </span>
                  )}
                </div>
                <span className="text-sm sm:text-base font-mono font-black text-amber-300 cartoon-text-outline">
                  {loadingProgress}%
                </span>
              </div>

              {/* Calha de Madeira Embutida com Barra Dourada Listrada & Motoboy na Ponta */}
              <div className="w-full h-5 sm:h-6 cartoon-wood-inset rounded-full p-1 relative overflow-visible">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out relative shadow-[0_0_14px_rgba(251,191,36,0.85)]"
                  style={{
                    width: `${Math.min(100, Math.max(10, loadingProgress))}%`,
                    background:
                      'repeating-linear-gradient(45deg, #f59e0b 0px, #f59e0b 10px, #fde047 10px, #fde047 20px)',
                  }}
                >
                  {/* Motoboy Animado Correndo na Ponta da Barra */}
                  <span
                    className="absolute -right-3 -top-2.5 text-lg sm:text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none animate-bounce"
                    style={{ animationDuration: '0.6s' }}
                  >
                    🛵
                  </span>
                </div>
              </div>

              {/* Status Dinâmico */}
              <div className="mt-2.5 flex items-center justify-center gap-2 text-[11px] sm:text-xs font-extrabold text-amber-100 cartoon-text-outline">
                {loadingProgress < 100 ? (
                  <div className="w-3 h-3 border-2 border-amber-300 border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80] shrink-0" />
                )}
                <span className="truncate max-w-[240px] sm:max-w-[320px]">{loadingMessage}</span>
              </div>
            </div>

            {/* Botão 3D Verde ao Concluir */}
            {loadingProgress >= 100 && (
              <button
                id="enter-game-btn"
                onClick={() => {
                  setIsLoading(false);
                  setShowIntroCinematic(false);
                  sound.startMenuMusic();
                }}
                className="mt-4 w-full py-3.5 px-8 rounded-2xl cartoon-btn-green font-black text-sm sm:text-base uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2.5 relative animate-bounce"
              >
                <SteelRivet className="left-3 top-1/2 -translate-y-1/2 absolute" />
                <span>ACELERAR NA QUEBRADA!</span>
                <ArrowRight className="w-5 h-5 stroke-[3]" />
                <SteelRivet className="right-3 top-1/2 -translate-y-1/2 absolute" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* MAIN MENU (IDLE SCREEN) COM AS NOVAS ARTES GRÁFICAS DE MMENU */}
      {gameState === 'IDLE' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-3 sm:p-6 text-center overflow-hidden">
          {/* Background Video Loop cinematográfico (Desacoplado da GPU na gameplay) */}
          <video
            ref={(el) => {
              (menuVideoRef as any).current = el;
              if (el) {
                el.volume = 0.15;
                el.play().catch(() => {});
              }
            }}
            src="/videos/menu.mp4"
            autoPlay
            loop
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Soft Cinematic Vignette that preserves bright daylight scenery */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/35 pointer-events-none" />

          {/* TOP BAR — Padrão Oficial Interativo com Giro 360° Suave */}
          <div className="relative z-20 w-full max-w-6xl flex items-start justify-between pt-1 sm:pt-2 px-1 sm:px-3">
            {/* Lado Esquerdo: INÍCIO (Amarelo 3D), ANÚNCIOS (Roxo 3D), SOM e TELA CHEIA (Madeira & Ouro) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
              <button
                onClick={() => {
                  sound.playClick();
                  if (onBackToMenu) onBackToMenu();
                }}
                onMouseEnter={() => sound.playClick()}
                className="group menu-interactive-card relative px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#d97706] border-[2.5px] border-[#fef08a] shadow-[0_4px_0_#78350f,0_6px_14px_rgba(0,0,0,0.65),inset_0_2px_0_rgba(255,255,255,0.65)] active:translate-y-0.5 active:shadow-[0_2px_0_#78350f] flex items-center gap-1.5 cursor-pointer transition-all"
                title="Início"
              >
                <Home className="w-4 h-4 text-[#1e1b18] fill-[#1e1b18] stroke-[2.5] menu-icon-spin-360" />
                <span className="font-black text-xs sm:text-sm text-[#1e1b18] tracking-wide uppercase">INÍCIO</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setShowMarketingModal(true);
                }}
                onMouseEnter={() => sound.playClick()}
                className="group menu-interactive-card relative px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-b from-[#c084fc] via-[#9333ea] to-[#6b21a8] border-[2.5px] border-[#e9d5ff] shadow-[0_4px_0_#3b0764,0_6px_14px_rgba(0,0,0,0.65),inset_0_2px_0_rgba(255,255,255,0.45)] active:translate-y-0.5 active:shadow-[0_2px_0_#3b0764] flex items-center gap-1.5 cursor-pointer transition-all"
                title="Anúncios e Parcerias na Quebrada"
              >
                <Megaphone className="w-4 h-4 text-white stroke-[2.5] drop-shadow menu-icon-spin-360" />
                <span className="font-black text-xs sm:text-sm text-white tracking-wide uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]">ANÚNCIOS</span>
              </button>

              <button
                onClick={() => {
                  const isEnabled = sound.toggleMute(true);
                  setSoundMuted(!isEnabled);
                }}
                onMouseEnter={() => sound.playClick()}
                title={soundMuted ? 'Ativar Som' : 'Desligar Som'}
                className="group menu-spin-360-hover relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl cartoon-btn-wood flex items-center justify-center cursor-pointer"
              >
                {soundMuted ? (
                  <VolumeX className="w-5 h-5 text-amber-200/70" />
                ) : (
                  <Volume2 className="w-5 h-5 text-[#fde047] fill-[#fde047] drop-shadow" />
                )}
              </button>

              <button
                onClick={toggleFullscreen}
                onMouseEnter={() => sound.playClick()}
                title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia'}
                className="group menu-spin-360-hover relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl cartoon-btn-wood flex items-center justify-center cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-[#fde047] stroke-[2.8]" />
                ) : (
                  <Maximize className="w-5 h-5 text-[#fde047] stroke-[2.8]" />
                )}
              </button>
            </div>

            {/* Lado Direito: Painel de Madeira Entalhada & Ouro 3D de Perfil "Piloto PRO Lv. 12" + Barra de Moedas */}
            <div className="flex flex-col items-end select-none">
              <div
                onMouseEnter={() => sound.playClick()}
                className="group menu-interactive-card relative rounded-2xl cartoon-wood-board p-1.5 sm:p-2 min-w-[210px] sm:min-w-[255px]"
              >
                <SteelCornerBrackets size="sm" />
                <SteelRivet className="absolute top-1.5 left-1.5" />
                <SteelRivet className="absolute top-1.5 right-1.5" />

                {/* Linha Superior: Avatar Caramelo de Óculos + Nome Piloto + Badge PRO + Estrela Lv */}
                <div className="flex items-center gap-2.5 px-1 pb-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setIsPhotoSelectorOpen(true);
                    }}
                    className="menu-spin-360-hover relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#b45309] p-0.5 border-2 border-[#fef08a] shadow-md cursor-pointer flex-shrink-0"
                    title="Trocar foto de perfil"
                  >
                    <div className="w-full h-full rounded-[9px] overflow-hidden bg-[#451a03] flex items-center justify-center">
                      {currentUserPhoto ? (
                        <img src={currentUserPhoto} alt="Perfil" className="w-full h-full object-cover transition-transform" />
                      ) : (
                        <svg viewBox="0 0 64 64" className="w-full h-full">
                          <rect width="64" height="64" fill="#7c2d12" />
                          {/* Orelhas */}
                          <ellipse cx="14" cy="28" rx="9" ry="15" transform="rotate(-18 14 28)" fill="#b45309" />
                          <ellipse cx="50" cy="28" rx="9" ry="15" transform="rotate(18 50 28)" fill="#b45309" />
                          {/* Cabeça Caramelo */}
                          <circle cx="32" cy="34" r="20" fill="#f59e0b" />
                          <ellipse cx="32" cy="41" rx="13" ry="10" fill="#fde68a" />
                          {/* Óculos Escuros */}
                          <rect x="14" y="22" width="15" height="11" rx="3" fill="#290d03" stroke="#facc15" strokeWidth="1.5" />
                          <rect x="35" y="22" width="15" height="11" rx="3" fill="#290d03" stroke="#facc15" strokeWidth="1.5" />
                          <line x1="29" y1="26" x2="35" y2="26" stroke="#facc15" strokeWidth="2.5" />
                          <line x1="17" y1="25" x2="22" y2="29" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                          <line x1="38" y1="25" x2="43" y2="29" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                          {/* Focinho e Sorriso */}
                          <ellipse cx="32" cy="37" rx="5.5" ry="4" fill="#1c1917" />
                          <path d="M25 44 Q32 49 39 44" stroke="#451a03" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                  </button>

                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 w-full justify-between">
                      <span className="text-sm sm:text-base font-black text-white tracking-wide truncate cartoon-text-outline">
                        {storage.getCurrentUser()?.nickname || 'Piloto'}
                      </span>
                      <span className="menu-spin-360-hover px-2 py-0.5 rounded-md cartoon-gold-ribbon font-black text-[10px] sm:text-[11px] uppercase shadow-sm cursor-pointer">
                        PRO
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-amber-300 text-xs drop-shadow menu-icon-spin-360 inline-block">⭐</span>
                      <span className="text-xs font-extrabold text-amber-100 cartoon-text-outline">
                        Lv. {Math.max(12, Math.floor(highScore / 800) + 12)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra Inferior de Moedas Embutida em Madeira Escura */}
                <div className="grid grid-cols-3 gap-1 cartoon-wood-inset rounded-xl px-2 py-1 border border-[#b45309]">
                  {/* Moeda / Nota 10 */}
                  <div className="flex items-center justify-center gap-1 group/coin cursor-pointer" title="Notas de R$ 10">
                    <GoldCoinIcon className="w-4 h-4 flex-shrink-0 menu-icon-spin-360" />
                    <span className="text-[11px] sm:text-xs font-black text-amber-100 tabular-nums cartoon-text-outline">
                      {(userNotes10 * 10 + 30).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {/* Diamante Roxo / Nota 50 */}
                  <div className="flex items-center justify-center gap-1 border-x border-[#78350f] px-1 cursor-pointer" title="Notas de R$ 50">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0 menu-icon-spin-360">
                      <polygon points="12,2 22,9 12,22 2,9" fill="#c084fc" stroke="#581c87" strokeWidth="1.5" />
                      <polygon points="12,2 18,9 12,22 6,9" fill="#e879f9" opacity="0.65" />
                    </svg>
                    <span className="text-[11px] sm:text-xs font-black text-amber-100 tabular-nums cartoon-text-outline">
                      {Math.max(8, userNotes50)}
                    </span>
                  </div>

                  {/* Emblema Azul / Nota 100 */}
                  <div className="flex items-center justify-center gap-1 cursor-pointer" title="Notas de R$ 100">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0 menu-icon-spin-360">
                      <circle cx="12" cy="12" r="9.5" fill="#38bdf8" stroke="#0369a1" strokeWidth="2" />
                      <polygon points="12,6 14,10 18,10.5 15,13.5 15.8,17.5 12,15.5 8.2,17.5 9,13.5 6,10.5 10,10" fill="#e0f2fe" />
                    </svg>
                    <span className="text-[11px] sm:text-xs font-black text-amber-100 tabular-nums cartoon-text-outline">
                      {userNotes100}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER SHOWCASE — Placa de Madeira Real com Giro 360° Suave + Botão COMEÇAR + 3 Cartões 3D */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full max-w-4xl px-2 sm:px-4 gap-3 sm:gap-5">
            {/* PLACA DE MADEIRA ESCULPIDA: CARAMELO - LENDAS DO MOTOBOY (Giro 360° Suave e Satisfatório ao passar o mouse!) */}
            <div
              onMouseEnter={() => sound.playClick()}
              className="group menu-spin-360-hover relative flex flex-col items-center select-none mt-1 cursor-pointer"
              title="Caramelo - Lendas do Motoboy (Passe o mouse para girar 360°!)"
            >
              {/* Coroa 3D Dourada no Topo da Placa */}
              <div className="relative z-20 -mb-3.5 sm:-mb-4 drop-shadow-[0_6px_8px_rgba(0,0,0,0.85)] menu-icon-spin-360">
                <svg viewBox="0 0 120 72" className="w-16 h-10 sm:w-22 sm:h-14">
                  <defs>
                    <linearGradient id="crownGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="45%" stopColor="#facc15" />
                      <stop offset="100%" stopColor="#ca8a04" />
                    </linearGradient>
                  </defs>
                  {/* Moldura de Madeira Atrás da Coroa */}
                  <path d="M12 68 L22 22 L46 40 L60 12 L74 40 L98 22 L108 68 Z" fill="#78350f" stroke="#451a03" strokeWidth="5" strokeLinejoin="round" />
                  {/* Coroa Dourada Principal */}
                  <path d="M18 62 L26 26 L47 43 L60 16 L73 43 L94 26 L102 62 Z" fill="url(#crownGold)" stroke="#451a03" strokeWidth="3.5" strokeLinejoin="round" />
                  <rect x="20" y="56" width="80" height="10" rx="4" fill="#eab308" stroke="#451a03" strokeWidth="3" />
                  <circle cx="26" cy="23" r="4.5" fill="#fef08a" stroke="#451a03" strokeWidth="2.5" />
                  <circle cx="60" cy="13" r="5.5" fill="#fef08a" stroke="#451a03" strokeWidth="2.5" />
                  <circle cx="94" cy="23" r="4.5" fill="#fef08a" stroke="#451a03" strokeWidth="2.5" />
                </svg>
              </div>

              {/* Placa Principal de Madeira Trabalhada com Cantoneiras de Ouro */}
              <div className="relative cartoon-wood-board px-6 sm:px-12 py-3.5 sm:py-5 rounded-[28px] border-[4px] border-[#451a03] shadow-[0_14px_32px_rgba(0,0,0,0.9)] flex flex-col items-center">
                <SteelCornerBrackets />
                {/* Título Principal 3D "CARAMELO" (Sem artefatos internos nas letras graças a paintOrder: stroke fill) */}
                <h1
                  className="font-fun font-black text-4xl xs:text-5xl sm:text-7xl md:text-[78px] tracking-wide uppercase leading-none select-none"
                  style={{
                    background: 'linear-gradient(180deg, #fffbeb 0%, #fde047 32%, #f59e0b 70%, #d97706 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: '7px #3b1304',
                    filter: 'drop-shadow(0 5px 0 #240a02) drop-shadow(0 9px 14px rgba(0,0,0,0.85))',
                  }}
                >
                  CARAMELO
                </h1>

                {/* Subtítulo "LENDAS DO MOTOBOY" */}
                <div className="mt-1.5 sm:mt-2 px-5 py-1 rounded-xl bg-[#2a1205]/95 border-2 border-[#b45309] shadow-inner">
                  <span
                    className="font-fun font-black text-sm xs:text-base sm:text-2xl md:text-[26px] tracking-wider text-white uppercase block leading-tight"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: '3.5px #1c0a00',
                      textShadow: '0 3px 0 #1c0a00, 0 5px 10px rgba(0,0,0,0.9)',
                    }}
                  >
                    LENDAS DO MOTOBOY
                  </span>
                </div>
              </div>
            </div>

            {/* BOTÃO PRINCIPAL 3D VERDE "▶ COMEÇAR" EM MOLDURA DE MADEIRA E OURO */}
            <div className="group menu-interactive-card relative p-1.5 sm:p-2 rounded-[26px] cartoon-wood-board border-[3px] border-[#451a03] shadow-[0_12px_28px_rgba(0,0,0,0.9)]">
              <SteelCornerBrackets />
              <button
                onClick={() => {
                  sound.playBark();
                  setShowModeSelectModal(true);
                }}
                onMouseEnter={() => sound.playClick()}
                className="relative px-8 sm:px-14 py-3 sm:py-4 rounded-[18px] bg-gradient-to-b from-[#4ade80] via-[#22c55e] to-[#15803d] hover:from-[#86efac] hover:via-[#22c55e] hover:to-[#166534] border-[3px] border-[#bbf7d0] shadow-[0_6px_0_#052e16,inset_0_3px_0_rgba(255,255,255,0.65)] active:translate-y-1 active:shadow-[0_2px_0_#052e16] transition-all flex items-center justify-center gap-3 sm:gap-4 cursor-pointer"
              >
                {/* Ícone Play 3D com Giro 360° no Hover */}
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#166534]/85 border-2 border-[#86efac] flex items-center justify-center shadow-inner menu-icon-spin-360">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 ml-0.5 drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]">
                    <polygon points="6,4 20,12 6,20" fill="#ffffff" stroke="#052e16" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </div>
                <span
                  className="font-fun font-black text-2xl sm:text-4xl tracking-wider text-white uppercase"
                  style={{
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: '4px #052e16',
                    textShadow: '0 3px 0 #052e16, 0 5px 10px rgba(0,0,0,0.75)',
                  }}
                >
                  COMEÇAR
                </span>
              </button>
            </div>

            {/* 3 CARTÕES INFERIORES: LOJA (Laranja), GALERIA (Roxo), CONFIGURAÇÕES (Azul) — Sem cortar texto e com giro 360° */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 w-full max-w-4xl mt-0.5">
              {/* CARTÃO 1: LOJA (Laranja 3D com Ícone de Lojinha) */}
              <button
                onClick={() => {
                  sound.playClick();
                  setShowSkinsModal(true);
                }}
                onMouseEnter={() => sound.playClick()}
                className="group menu-interactive-card relative p-1.5 rounded-2xl cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)] cursor-pointer"
              >
                <SteelCornerBrackets />
                <div className="relative h-full px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] border-2 border-[#fde68a] shadow-[inset_0_2px_0_rgba(255,255,255,0.65)] flex items-center gap-2.5 sm:gap-3 text-left">
                  {/* Ícone 3D Lojinha com Giro 360° */}
                  <div className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] menu-icon-spin-360">
                    <svg viewBox="0 0 64 64" className="w-full h-full">
                      <rect x="10" y="26" width="44" height="32" rx="4" fill="#fef3c7" stroke="#451a03" strokeWidth="3" />
                      <rect x="16" y="36" width="14" height="22" fill="#38bdf8" stroke="#451a03" strokeWidth="2.5" />
                      <rect x="34" y="36" width="14" height="14" fill="#bae6fd" stroke="#451a03" strokeWidth="2.5" />
                      <path d="M6 28 L12 12 L52 12 L58 28 Z" fill="#ef4444" stroke="#451a03" strokeWidth="3" strokeLinejoin="round" />
                      <path d="M18 28 L21 12 L30 12 L28 28 Z" fill="#ffffff" />
                      <path d="M36 28 L37 12 L46 12 L47 28 Z" fill="#ffffff" />
                      <rect x="6" y="26" width="52" height="5" rx="2.5" fill="#dc2626" stroke="#451a03" strokeWidth="2.5" />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span
                      className="font-fun font-black text-base sm:text-lg md:text-xl text-white uppercase leading-tight tracking-wide"
                      style={{
                        paintOrder: 'stroke fill',
                        WebkitTextStroke: '2.5px #78350f',
                        textShadow: '0 2px 0 #78350f, 0 4px 6px rgba(0,0,0,0.6)',
                      }}
                    >
                      LOJA
                    </span>
                    <span className="text-[11px] sm:text-xs font-extrabold text-[#fffbeb] drop-shadow leading-snug">
                      Itens, veículos e upgrades
                    </span>
                  </div>
                </div>
              </button>

              {/* CARTÃO 2: GALERIA (Roxo 3D com Ícone de Paleta de Pintura) */}
              <button
                onClick={() => {
                  sound.playClick();
                  setIsGalleryOpen(true);
                }}
                onMouseEnter={() => sound.playClick()}
                className="group menu-interactive-card relative p-1.5 rounded-2xl cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)] cursor-pointer"
              >
                <SteelCornerBrackets />
                <div className="relative h-full px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-[#c084fc] via-[#9333ea] to-[#6b21a8] border-2 border-[#e9d5ff] shadow-[inset_0_2px_0_rgba(255,255,255,0.55)] flex items-center gap-2.5 sm:gap-3 text-left">
                  {/* Ícone 3D Paleta de Artes com Giro 360° */}
                  <div className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] menu-icon-spin-360">
                    <svg viewBox="0 0 64 64" className="w-full h-full">
                      <path
                        d="M32 8 C16 8 8 20 8 34 C8 48 20 56 32 56 C37 56 40 53 40 49 C40 46 38 44 38 41 C38 38 41 36 45 36 L48 36 C54 36 58 31 58 25 C58 15 46 8 32 8 Z"
                        fill="#f8fafc"
                        stroke="#1e1b4b"
                        strokeWidth="3"
                      />
                      <circle cx="20" cy="24" r="4.5" fill="#ef4444" />
                      <circle cx="31" cy="18" r="4.5" fill="#facc15" />
                      <circle cx="43" cy="22" r="4.5" fill="#3b82f6" />
                      <circle cx="18" cy="36" r="4.5" fill="#22c55e" />
                      <circle cx="29" cy="46" r="3.8" fill="#6b21a8" />
                      <path d="M40 12 L56 4 L52 20 Z" fill="#f97316" stroke="#1e1b4b" strokeWidth="2.5" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span
                      className="font-fun font-black text-base sm:text-lg md:text-xl text-white uppercase leading-tight tracking-wide"
                      style={{
                        paintOrder: 'stroke fill',
                        WebkitTextStroke: '2.5px #3b0764',
                        textShadow: '0 2px 0 #3b0764, 0 4px 6px rgba(0,0,0,0.6)',
                      }}
                    >
                      GALERIA
                    </span>
                    <span className="text-[11px] sm:text-xs font-extrabold text-purple-100 drop-shadow leading-snug">
                      De artes e coleções
                    </span>
                  </div>
                </div>
              </button>

              {/* CARTÃO 3: CONFIGURAÇÕES (Azul 3D com Ícone de Engrenagem Metálica) */}
              <button
                onClick={() => {
                  sound.playClick();
                  setIsSettingsOpen(true);
                }}
                onMouseEnter={() => sound.playClick()}
                className="group menu-interactive-card relative p-1.5 rounded-2xl cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)] cursor-pointer"
              >
                <SteelCornerBrackets />
                <div className="relative h-full px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#1d4ed8] border-2 border-[#bae6fd] shadow-[inset_0_2px_0_rgba(255,255,255,0.65)] flex items-center gap-2.5 sm:gap-3 text-left">
                  {/* Ícone 3D Engrenagem com Giro 360° */}
                  <div className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] menu-icon-spin-360">
                    <svg viewBox="0 0 64 64" className="w-full h-full">
                      <path
                        d="M27 8 L37 8 L39 15 L45 18 L52 14 L58 21 L54 28 L56 34 L62 38 L59 47 L52 46 L47 51 L49 58 L39 60 L35 54 L29 54 L25 60 L15 58 L17 51 L12 46 L5 47 L2 38 L8 34 L10 28 L6 21 L12 14 L19 18 L25 15 Z"
                        fill="#fef08a"
                        stroke="#451a03"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />
                      <circle cx="32" cy="34" r="10" fill="#78350f" stroke="#451a03" strokeWidth="3" />
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span
                      className="font-fun font-black text-sm sm:text-base md:text-[17px] text-white uppercase leading-tight tracking-wide"
                      style={{
                        paintOrder: 'stroke fill',
                        WebkitTextStroke: '2.5px #0c4a6e',
                        textShadow: '0 2px 0 #0c4a6e, 0 4px 6px rgba(0,0,0,0.6)',
                      }}
                    >
                      CONFIGURAÇÕES
                    </span>
                    <span className="text-[11px] sm:text-xs font-extrabold text-sky-100 drop-shadow leading-snug">
                      Ajustes do jogo
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* RODAPÉ DE MADEIRA ENTALHADA & OURO REBITADO — CRIADO E DESENVOLVIDO POR KELVIN, GUILHERME, WALDIR | ESTÚDIO GAMEFY.NET.BR */}
          <div className="relative z-20 w-full max-w-3xl px-2 pb-0.5 select-none">
            <div className="relative rounded-2xl cartoon-wood-board px-4 sm:px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
              <SteelCornerBrackets size="sm" />
              <SteelRivet className="absolute left-2.5 top-1/2 -translate-y-1/2" />
              <SteelRivet className="absolute right-2.5 top-1/2 -translate-y-1/2" />

              <div className="flex items-center gap-3 pl-2">
                <div className="menu-spin-360-hover w-8 h-8 rounded-lg bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#b45309] border-2 border-[#fef08a] flex items-center justify-center shadow-md cursor-pointer">
                  <Gamepad2 className="w-5 h-5 text-[#2e1005]" />
                </div>
                <div>
                  <span className="text-[9px] font-black text-amber-200 uppercase tracking-widest block text-left cartoon-text-outline">
                    CRIADO E DESENVOLVIDO POR
                  </span>
                  <div className="flex items-center gap-2 sm:gap-2.5 mt-0.5 flex-wrap">
                    <div
                      onMouseEnter={() => sound.playClick()}
                      className="group menu-interactive-card flex items-center gap-1.5 cartoon-wood-inset px-2.5 py-0.5 rounded-full border border-amber-400/70 cursor-pointer"
                    >
                      <img src="/profile_photos/image_20261007_113044 - Copia.webp" alt="Kelvin" className="w-5 h-5 rounded-full object-cover border border-amber-300 menu-icon-spin-360" />
                      <span className="text-amber-300 font-black text-xs cartoon-text-outline">Kelvin</span>
                    </div>
                    <div
                      onMouseEnter={() => sound.playClick()}
                      className="group menu-interactive-card flex items-center gap-1.5 cartoon-wood-inset px-2.5 py-0.5 rounded-full border border-amber-400/70 cursor-pointer"
                    >
                      <img src="/profile_photos/image_20261007_113045 - Copia.webp" alt="Guilherme" className="w-5 h-5 rounded-full object-cover border border-amber-300 menu-icon-spin-360" />
                      <span className="text-amber-200 font-black text-xs cartoon-text-outline">Guilherme</span>
                    </div>
                    <div
                      onMouseEnter={() => sound.playClick()}
                      className="group menu-interactive-card flex items-center gap-1.5 cartoon-wood-inset px-2.5 py-0.5 rounded-full border border-amber-400/70 cursor-pointer"
                    >
                      <img src="/profile_photos/image_20261007_113046 - Copia.webp" alt="Valdir" className="w-5 h-5 rounded-full object-cover border border-amber-300 menu-icon-spin-360" />
                      <span className="text-yellow-300 font-black text-xs cartoon-text-outline">Valdir</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:border-l-2 border-[#5c240a] sm:pl-5 pr-2">
                <div className="text-left">
                  <span className="text-[9px] font-black text-amber-200 uppercase tracking-widest block cartoon-text-outline">
                    ESTÚDIO
                  </span>
                  <a
                    href="https://gamefy.net.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => sound.playClick()}
                    className="group menu-interactive-card flex items-center gap-1.5 font-black text-xs sm:text-sm text-amber-300 hover:text-yellow-200 transition-colors cartoon-text-outline"
                  >
                    <span className="w-4 h-4 rounded-full bg-amber-500 border border-yellow-200 flex items-center justify-center text-[10px] menu-icon-spin-360">⭐</span>
                    <span>gamefy.net.br</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 MODAL RÁPIDO DE ESCOLHA DE MODO DE JOGO AO CLICAR EM COMEÇAR — PADRÃO IMAGEM DE REFERÊNCIA 1 */}
      {showModeSelectModal && gameState === 'IDLE' && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-45 flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="cartoon-wood-board max-w-xl w-full p-4 sm:p-6 relative text-left shadow-2xl">
            {/* Cantos e Rebites Metálicos */}
            <SteelCornerBrackets size="lg" />
            <SteelRivet className="top-2 left-1/2 -translate-x-1/2" />
            <SteelRivet className="bottom-2 left-1/2 -translate-x-1/2" />

            {/* Cabeçalho de Madeira */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-[#3d1e0d]">
              <div className="flex items-center gap-3">
                <OctagonIconBadge><span className="text-xl sm:text-2xl">⚡</span></OctagonIconBadge>
                <div>
                  <h3 className="cartoon-title-3d text-xl sm:text-2xl md:text-3xl tracking-tight leading-tight">
                    ESCOLHA SEU PAPEL
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-amber-200/90 cartoon-text-outline">
                    Qual lado da quebrada você vai comandar hoje?
                  </p>
                </div>
              </div>
              <OctagonCloseButton onClick={() => setShowModeSelectModal(false)} />
            </div>

            {/* 2 Grandes Cartões Tridimensionais (Motoboy vs Caramelo) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
              {/* Cartão MOTOBOY (Azul Metálico com Cantoneiras) */}
              <div
                onClick={() => {
                  setShowModeSelectModal(false);
                  startGame('motoboy');
                }}
                className="relative rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group shadow-xl"
                style={{
                  background: 'linear-gradient(180deg, #1fa2d6 0%, #0c6999 50%, #08486b 100%)',
                  border: '3px solid #7bc5f3',
                  boxShadow: 'inset 0 3px 6px rgba(255,255,255,0.4), inset 0 -4px 8px rgba(0,0,0,0.5), 0 8px 20px rgba(0,0,0,0.6)',
                }}
              >
                <SteelCornerBrackets size="sm" />
                <SteelRivet className="top-2 left-8 w-2 h-2" />
                <SteelRivet className="top-2 right-8 w-2 h-2" />

                {/* Ícone Central da Moto em Moldura Octogonal */}
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mb-2 relative group-hover:scale-105 transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, #09476b 0%, #042437 100%)',
                    border: '3px solid #38bdf8',
                    boxShadow: 'inset 0 0 12px rgba(56,189,248,0.5), 0 4px 10px rgba(0,0,0,0.5)',
                  }}
                >
                  <img
                    src="/icons/icone_empinar.png"
                    alt="Moto"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                  />
                </div>

                <div className="cartoon-title-3d text-xl sm:text-2xl text-white tracking-wide">
                  MOTOBOY
                </div>
                <div className="text-xs font-bold text-cyan-100 cartoon-text-outline mb-3">
                  Fuga na CG 160 & Grau
                </div>

                {/* Botão de Ação Azul 3D */}
                <div className="w-full cartoon-btn-blue py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider relative flex items-center justify-center gap-1.5 shadow-md">
                  <SteelRivet className="top-1 left-2 w-1.5 h-1.5" />
                  <SteelRivet className="top-1 right-2 w-1.5 h-1.5" />
                  <span>Desviar & Empinar</span>
                </div>
              </div>

              {/* Cartão CARAMELO (Madeira Dourada/Laranja) */}
              <div
                onClick={() => {
                  setShowModeSelectModal(false);
                  startGame('caramelo');
                }}
                className="relative rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group shadow-xl"
                style={{
                  background: 'linear-gradient(180deg, #d97706 0%, #b45309 50%, #78350f 100%)',
                  border: '3px solid #fcd34d',
                  boxShadow: 'inset 0 3px 6px rgba(255,255,255,0.4), inset 0 -4px 8px rgba(0,0,0,0.5), 0 8px 20px rgba(0,0,0,0.6)',
                }}
              >
                <SteelCornerBrackets size="sm" />
                <SteelRivet className="top-2 left-8 w-2 h-2" />
                <SteelRivet className="top-2 right-8 w-2 h-2" />

                {/* Ícone Central do Caramelo em Moldura Dourada */}
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mb-2 relative group-hover:scale-105 transition-transform overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
                    border: '3px solid #fbbf24',
                    boxShadow: 'inset 0 0 12px rgba(251,191,36,0.5), 0 4px 10px rgba(0,0,0,0.5)',
                  }}
                >
                  <img
                    src="/menu/caramelo_dog.png"
                    alt="Caramelo"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="text-3xl filter drop-shadow" style={{ display: 'none' }}>🐕</span>
                </div>

                <div className="cartoon-title-gold-3d text-xl sm:text-2xl tracking-wide">
                  CARAMELO
                </div>
                <div className="text-xs font-bold text-amber-100 cartoon-text-outline mb-3">
                  O Terror das Canelas
                </div>

                {/* Botão de Ação Dourado 3D */}
                <div className="w-full cartoon-btn-gold py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider relative flex items-center justify-center gap-1.5 shadow-md">
                  <SteelRivet className="top-1 left-2 w-1.5 h-1.5" />
                  <SteelRivet className="top-1 right-2 w-1.5 h-1.5" />
                  <span>Perseguir & Morder</span>
                </div>
              </div>
            </div>

            {/* Painel Inferior de Dificuldade (Tábua de Madeira com Rebites) */}
            <div className="cartoon-wood-plank rounded-xl p-3 sm:p-3.5 relative">
              <SteelRivet className="top-2 left-2 w-2 h-2" />
              <SteelRivet className="top-2 right-2 w-2 h-2" />
              <SteelRivet className="bottom-2 left-2 w-2 h-2" />
              <SteelRivet className="bottom-2 right-2 w-2 h-2" />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎗️</span>
                  <span className="cartoon-title-gold-3d text-sm sm:text-base tracking-wide">
                    NÍVEL DE DIFICULDADE:
                  </span>
                </div>
                <SteelCoinPill
                  amount={
                    difficulty === 'easy'
                      ? 'FÁCIL (10 vidas)'
                      : difficulty === 'medium'
                      ? 'MÉDIO (5 vidas)'
                      : 'DIFÍCIL (3 vidas)'
                  }
                />
              </div>

              {/* 3 Botões 3D Bevel com Rebites */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  onClick={() => handleSetDifficulty('easy')}
                  className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer relative flex items-center justify-center gap-1.5 ${
                    difficulty === 'easy'
                      ? 'cartoon-btn-green ring-4 ring-emerald-400/50 scale-[1.02]'
                      : 'cartoon-btn-steel opacity-80 hover:opacity-100'
                  }`}
                >
                  <SteelRivet className="top-1 left-1.5 w-1.5 h-1.5" />
                  <SteelRivet className="top-1 right-1.5 w-1.5 h-1.5" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  <span>FÁCIL</span>
                </button>

                <button
                  onClick={() => handleSetDifficulty('medium')}
                  className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer relative flex items-center justify-center gap-1.5 ${
                    difficulty === 'medium'
                      ? 'cartoon-btn-gold ring-4 ring-amber-400/50 scale-[1.02]'
                      : 'cartoon-btn-steel opacity-80 hover:opacity-100'
                  }`}
                >
                  <SteelRivet className="top-1 left-1.5 w-1.5 h-1.5" />
                  <SteelRivet className="top-1 right-1.5 w-1.5 h-1.5" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                  <span>MÉDIO</span>
                </button>

                <button
                  onClick={() => handleSetDifficulty('hard')}
                  className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer relative flex items-center justify-center gap-1.5 ${
                    difficulty === 'hard'
                      ? 'cartoon-btn-red ring-4 ring-rose-500/50 scale-[1.02]'
                      : 'cartoon-btn-steel opacity-80 hover:opacity-100'
                  }`}
                >
                  <SteelRivet className="top-1 left-1.5 w-1.5 h-1.5" />
                  <SteelRivet className="top-1 right-1.5 w-1.5 h-1.5" />
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
                  <span>DIFÍCIL</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SKINS & CUSTOMIZAÇÕES MODAL — PADRÃO IMAGEM DE REFERÊNCIA 4 (GARAGEM & SKINS 3D) */}
      {showSkinsModal && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-2 sm:p-4 text-center animate-fade-in overflow-y-auto">
          {/* Main Wood Board Container */}
          <div className="cartoon-wood-board max-w-5xl w-full p-3 sm:p-5 relative text-left shadow-2xl flex flex-col gap-3 my-auto">
            <SteelCornerBrackets size="lg" />

            {/* Cabeçalho de Madeira */}
            <div className="cartoon-wood-header p-2.5 sm:p-3 rounded-2xl flex items-center justify-between relative">
              <SteelCornerBrackets size="sm" />
              <div className="flex items-center gap-3">
                <OctagonIconBadge><span className="text-xl sm:text-2xl">🏍️</span></OctagonIconBadge>
                <div>
                  <h3 className="cartoon-title-3d text-lg sm:text-2xl tracking-tight leading-tight">
                    GARAGEM & SKINS 3D
                  </h3>
                  <p className="text-[11px] sm:text-xs font-bold text-amber-200/90 cartoon-text-outline hidden xs:block">
                    Personalize sua moto, escolha suas skins e deixe seu estilo único nas ruas!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <SteelCoinPill amount={userCoins.toLocaleString('pt-BR')} />
                <OctagonCloseButton onClick={() => setShowSkinsModal(false)} />
              </div>
            </div>

            {/* Abas Metálicas Estilo Jogo Profissional */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSkinsTab('motoboy')}
                className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                  skinsTab === 'motoboy' ? 'cartoon-btn-gold shadow-lg' : 'cartoon-btn-steel'
                }`}
              >
                <span>🏍️</span>
                <span>MOTOS</span>
              </button>
              <button
                onClick={() => setSkinsTab('caramelo')}
                className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                  skinsTab === 'caramelo' ? 'cartoon-btn-gold shadow-lg' : 'cartoon-btn-steel'
                }`}
              >
                <span>🐕</span>
                <span>SKINS CARAMELO</span>
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  confetti({ particleCount: 30, spread: 60 });
                }}
                className="py-2 px-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer hidden sm:flex items-center gap-2 cartoon-btn-steel"
              >
                <span>🎨</span>
                <span>PERSONALIZAÇÃO</span>
              </button>
            </div>

            {/* Corpo Principal (3 Colunas: Info Esquerda + 3D Viewer Centro + Ações Direita) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
              {/* Painel Esquerdo: MOTO ATUAL / CÃO ATUAL + Barras de Estatísticas */}
              <div className="lg:col-span-3 cartoon-navy-panel p-3.5 flex flex-col justify-between">
                <SteelCornerBrackets size="sm" />
                <div>
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black uppercase tracking-wider mb-1">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>{skinsTab === 'motoboy' ? 'MOTO ATUAL' : 'CÃO ATUAL'}</span>
                  </div>
                  <h4 className="cartoon-title-3d text-sm sm:text-base text-white tracking-wide leading-tight">
                    {skinsTab === 'motoboy' ? previewMotoSkin.name : previewDogSkin.name}
                  </h4>
                  <p className="text-[11px] text-amber-200/90 font-bold mt-0.5 mb-3 leading-snug cartoon-text-outline">
                    {skinsTab === 'motoboy' ? previewMotoSkin.subtitle : previewDogSkin.subtitle}
                  </p>

                  {/* 3 Barras de Estatísticas em Madeira & Ouro */}
                  <div className="flex flex-col gap-2.5 mt-2">
                    {/* Velocidade */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-100 tracking-wider mb-1 cartoon-text-outline">
                        <span className="flex items-center gap-1">⚡ VELOCIDADE</span>
                        <span className="font-mono text-amber-300">
                          {skinsTab === 'motoboy' ? (previewMotoSkin.id === 'titan_dourada' ? '100%' : '85%') : '90%'}
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full cartoon-wood-inset border border-[#d97706] p-[2px]">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: skinsTab === 'motoboy' ? (previewMotoSkin.id === 'titan_dourada' ? '100%' : '85%') : '90%',
                            background: 'linear-gradient(90deg, #f59e0b 0%, #fde047 100%)',
                            boxShadow: '0 0 8px rgba(251,191,36,0.8)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Controle */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-100 tracking-wider mb-1 cartoon-text-outline">
                        <span className="flex items-center gap-1">🎯 CONTROLE</span>
                        <span className="font-mono text-amber-300">
                          {skinsTab === 'motoboy' ? (previewMotoSkin.id === 'titan_neon' ? '95%' : '80%') : '95%'}
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full cartoon-wood-inset border border-[#d97706] p-[2px]">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: skinsTab === 'motoboy' ? (previewMotoSkin.id === 'titan_neon' ? '95%' : '80%') : '95%',
                            background: 'linear-gradient(90deg, #f59e0b 0%, #fde047 100%)',
                            boxShadow: '0 0 8px rgba(251,191,36,0.8)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Durabilidade */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-100 tracking-wider mb-1 cartoon-text-outline">
                        <span className="flex items-center gap-1">🛡️ DURABILIDADE</span>
                        <span className="font-mono text-amber-300">
                          {skinsTab === 'motoboy' ? '88%' : (previewDogSkin.rarity === 'Ancestral' ? '100%' : '80%')}
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full cartoon-wood-inset border border-[#d97706] p-[2px]">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: skinsTab === 'motoboy' ? '88%' : (previewDogSkin.rarity === 'Ancestral' ? '100%' : '80%'),
                            background: 'linear-gradient(90deg, #f59e0b 0%, #fde047 100%)',
                            boxShadow: '0 0 8px rgba(251,191,36,0.8)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-amber-200/70 font-mono mt-3">
                  ID: #{skinsTab === 'motoboy' ? previewMotoSkin.id : previewDogSkin.id}
                </div>
              </div>

              {/* Coluna Central: Estúdio Showroom 3D Giratório de Madeira & Ouro (Centralizado e Limpo) */}
              <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border-[3px] border-[#f59e0b] shadow-2xl bg-[#2b1004] min-h-[260px] sm:min-h-[300px] flex items-center justify-center">
                <SteelCornerBrackets size="sm" />
                {skinsTab === 'motoboy' ? (
                  <MotorcycleSkinViewer skin={previewMotoSkin} />
                ) : (
                  <DogSkinViewer skin={previewDogSkin} />
                )}
              </div>

              {/* Painel Direito: SKIN ATUAL + Botões de Ação */}
              <div className="lg:col-span-3 cartoon-navy-panel p-3.5 flex flex-col justify-between gap-3">
                <SteelCornerBrackets size="sm" />
                <div>
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-black uppercase tracking-wider mb-2 cartoon-text-outline">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>SKIN ATUAL</span>
                  </div>

                  <div className="flex items-center gap-2.5 p-2 rounded-xl cartoon-wood-inset border border-[#d97706] mb-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-amber-400 bg-[#2b1004] flex-shrink-0 flex items-center justify-center">
                      {skinsTab === 'motoboy' ? (
                        <img src={previewMotoSkin.thumbnail} alt={previewMotoSkin.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">{previewDogSkin.icon}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-black text-white leading-tight cartoon-text-outline">
                        {skinsTab === 'motoboy' ? previewMotoSkin.name : previewDogSkin.name}
                      </div>
                      <div className="text-[10px] text-amber-300 font-mono font-bold">
                        {skinsTab === 'motoboy' ? previewMotoSkin.rarity : previewDogSkin.rarity}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Botões de Ação Tridimensionais */}
                <div className="flex flex-col gap-2">
                  {/* Botão de Equipar / Comprar */}
                  {skinsTab === 'motoboy' ? (
                    equippedMotoSkinId === previewMotoSkin.id ? (
                      <div className="cartoon-btn-green py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md">
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>EQUIPADA</span>
                      </div>
                    ) : (!previewMotoSkin.price || unlockedMotoSkins.includes(previewMotoSkin.id)) ? (
                      <button
                        onClick={() => {
                          setEquippedMotoSkinId(previewMotoSkin.id);
                          localStorage.setItem('caramelorun_equipped_moto_skin', previewMotoSkin.id);
                          if (gameRef.current.motoboy) {
                            gameRef.current.motoboy.setSkin(previewMotoSkin.id);
                          }
                          sound.playPowerup();
                          confetti({ particleCount: 50, spread: 75, origin: { y: 0.6 } });
                        }}
                        className="cartoon-btn-gold py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        <span>EQUIPAR MOTO</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyMotoSkin(previewMotoSkin)}
                        disabled={userCoins < (previewMotoSkin.price || 0)}
                        className={`cartoon-btn-gold py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 transition-all ${
                          userCoins < (previewMotoSkin.price || 0) ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>COMPRAR 🪙 {previewMotoSkin.price?.toLocaleString('pt-BR')}</span>
                      </button>
                    )
                  ) : (
                    equippedDogSkinId === previewDogSkin.id ? (
                      <div className="cartoon-btn-green py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md">
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>EQUIPADO</span>
                      </div>
                    ) : (!previewDogSkin.price || unlockedDogSkins.includes(previewDogSkin.id)) ? (
                      <button
                        onClick={() => {
                          setEquippedDogSkinId(previewDogSkin.id);
                          localStorage.setItem('caramelorun_equipped_dog_skin', previewDogSkin.id);
                          if (gameRef.current.caramelo) {
                            gameRef.current.caramelo.setSkin(previewDogSkin.id);
                          }
                          sound.playPowerup();
                          confetti({ particleCount: 50, spread: 75, origin: { y: 0.6 } });
                        }}
                        className="cartoon-btn-gold py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        <span>EQUIPAR CACHORRO</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyDogSkin(previewDogSkin)}
                        disabled={userCoins < (previewDogSkin.price || 0)}
                        className={`cartoon-btn-gold py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 transition-all ${
                          userCoins < (previewDogSkin.price || 0) ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>COMPRAR 🪙 {previewDogSkin.price?.toLocaleString('pt-BR')}</span>
                      </button>
                    )
                  )}

                  <button
                    onClick={() => {
                      setSkinsTab(skinsTab === 'motoboy' ? 'caramelo' : 'motoboy');
                    }}
                    className="cartoon-btn-steel py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>VER OUTRAS SKINS &gt;</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      confetti({ particleCount: 30, spread: 50 });
                    }}
                    className="cartoon-btn-wood py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>PERSONALIZAR &gt;</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Carrossel Inferior com as Cartas de Veículos / Skins em Madeira & Ouro */}
            <div className="cartoon-navy-panel p-2.5 sm:p-3 relative">
              <SteelCornerBrackets size="sm" />
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {skinsTab === 'motoboy' ? (
                  MOTO_SKINS.map((moto) => {
                    const isSelected = previewMotoSkin.id === moto.id;
                    const isEquipped = equippedMotoSkinId === moto.id;
                    const isUnlocked = !moto.price || unlockedMotoSkins.includes(moto.id);
                    return (
                      <button
                        key={moto.id}
                        onClick={() => setPreviewMotoSkin(moto)}
                        className={`relative flex flex-col items-center p-2 rounded-xl border-2 transition-all cursor-pointer flex-shrink-0 w-28 sm:w-36 overflow-hidden ${
                          isSelected
                            ? 'border-amber-300 bg-gradient-to-b from-[#b45309] to-[#78350f] shadow-[0_0_15px_rgba(251,191,36,0.75)] scale-105'
                            : 'border-[#b45309] cartoon-wood-inset hover:border-amber-400'
                        }`}
                      >
                        <img
                          src={moto.thumbnail}
                          alt={moto.name}
                          className={`w-full h-14 sm:h-16 object-cover rounded-lg mb-1.5 ${!isUnlocked ? 'filter brightness-75' : ''}`}
                        />
                        <span className="text-[10px] sm:text-xs font-black text-amber-100 truncate w-full text-center leading-tight cartoon-text-outline">
                          {moto.name}
                        </span>

                        {isEquipped && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-slate-950 shadow-md z-10 border border-white">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}

                        {!isUnlocked && (
                          <div className="absolute inset-0 bg-[#2b0f04]/80 backdrop-blur-[1px] flex flex-col items-center justify-center p-1 z-10 pointer-events-none">
                            <Lock className="w-4 h-4 text-amber-400 mb-0.5" />
                            <span className="text-[9px] font-mono font-black text-amber-300 flex items-center gap-0.5">
                              <span>🪙</span>
                              <span>{moto.price?.toLocaleString('pt-BR')}</span>
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })
                ) : (
                  CARAMELO_SKINS.map((dog) => {
                    const isSelected = previewDogSkin.id === dog.id;
                    const isEquipped = equippedDogSkinId === dog.id;
                    const isUnlocked = !dog.price || unlockedDogSkins.includes(dog.id);
                    return (
                      <button
                        key={dog.id}
                        onClick={() => setPreviewDogSkin(dog)}
                        className={`relative flex flex-col items-center p-2 rounded-xl border-2 transition-all cursor-pointer flex-shrink-0 w-28 sm:w-36 overflow-hidden ${
                          isSelected
                            ? 'border-amber-300 bg-gradient-to-b from-[#b45309] to-[#78350f] shadow-[0_0_15px_rgba(251,191,36,0.75)] scale-105'
                            : 'border-[#b45309] cartoon-wood-inset hover:border-amber-400'
                        }`}
                      >
                        <div
                          className={`w-full h-14 sm:h-16 rounded-lg mb-1.5 flex items-center justify-center text-3xl shadow-inner border border-amber-400/30 ${!isUnlocked ? 'filter brightness-75' : ''}`}
                          style={{ backgroundColor: `${dog.color}40` }}
                        >
                          <span>{dog.icon}</span>
                        </div>
                        <span className="text-[10px] sm:text-xs font-black text-amber-100 truncate w-full text-center leading-tight cartoon-text-outline">
                          {dog.name.replace('Caramelo ', '')}
                        </span>

                        {isEquipped && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-slate-950 shadow-md z-10 border border-white">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}

                        {!isUnlocked && (
                          <div className="absolute inset-0 bg-[#2b0f04]/80 backdrop-blur-[1px] flex flex-col items-center justify-center p-1 z-10 pointer-events-none">
                            <Lock className="w-4 h-4 text-amber-400 mb-0.5" />
                            <span className="text-[9px] font-mono font-black text-amber-300 flex items-center gap-0.5">
                              <span>🪙</span>
                              <span>{dog.price?.toLocaleString('pt-BR')}</span>
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Botão Fechar Inferior */}
            <button
              onClick={() => setShowSkinsModal(false)}
              className="w-full py-2.5 cartoon-btn-steel font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              VOLTAR AO JOGO
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER / VICTORY SCREEN — PADRÃO IMAGEM DE REFERÊNCIA 3 (FIM DA CORRIDA!) */}
      {(gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto overscroll-contain animate-fade-in bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-5xl my-auto flex flex-col items-center gap-3 relative">
            
            {/* Top Banner de Madeira & Aço: FIM DA CORRIDA! */}
            <div className="flex flex-col items-center select-none">
              <div className="cartoon-wood-header px-6 sm:px-10 py-2 sm:py-3 rounded-2xl relative shadow-2xl">
                <SteelCornerBrackets size="sm" />
                <h3 className="cartoon-title-3d text-2xl sm:text-3xl md:text-4xl tracking-tight leading-tight flex items-center gap-2">
                  <span>🏁</span>
                  <span>
                    {gameState === 'VICTORY'
                      ? 'VITÓRIA NA QUEBRADA!'
                      : gameMode === 'motoboy'
                      ? 'FIM DA CORRIDA!'
                      : 'O MOTOBOY ESCAPOU!'}
                  </span>
                  <span>🏁</span>
                </h3>
              </div>

              {/* Sub-banner Vermelho Metálico com a Causa do Game Over */}
              {gameOverReason && (
                <div className="mt-1 px-4 py-1 rounded-xl bg-gradient-to-r from-red-900 via-rose-800 to-red-900 border-2 border-red-400 text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 cartoon-text-outline animate-bounce-subtle">
                  <span>🚨</span>
                  <span>{gameOverReason}</span>
                </div>
              )}
            </div>

            {/* Layout Principal em 2 Colunas (Selfie Esquerda + Placas de Resultados Direita) */}
            <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch">
              
              {/* COLUNA ESQUERDA: FOTO / SELFIE COM MOLDURA DE MADEIRA E CANTONEIRAS DE AÇO */}
              <div className="md:col-span-5 cartoon-wood-board p-3 flex flex-col items-center justify-center relative shadow-2xl">
                <SteelCornerBrackets size="lg" />

                {gameOverImage ? (
                  <div className="relative w-full rounded-xl overflow-hidden border-[3px] border-[#3d1e0d] shadow-inner bg-black">
                    {/* Plaquinha de Madeira de Localização */}
                    <div className="absolute top-2 left-2 z-10 cartoon-wood-plank px-2.5 py-1 rounded-lg border border-[#3d1e0d] text-[10px] sm:text-xs font-black text-amber-200 tracking-wider shadow flex items-center gap-1 cartoon-text-outline">
                      <span>📍</span>
                      <span>PADARIA PÃO DE OURO</span>
                    </div>

                    {/* Badge Metálica de Selfie */}
                    <div className="absolute top-2 right-2 z-10 cartoon-steel-pill px-2.5 py-1 text-[10px] sm:text-xs font-black text-white tracking-wider flex items-center gap-1 cartoon-text-outline">
                      <span>📸</span>
                      <span>{gameState === 'VICTORY' ? 'VITÓRIA' : 'SELFIE DA QUEBRADA'}</span>
                    </div>

                    <img
                      src={gameOverImage}
                      alt="Selfie da Quebrada"
                      className="block w-full h-auto max-h-[36vh] md:max-h-[50vh] object-cover mx-auto"
                    />
                  </div>
                ) : (
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-amber-950/60 border-2 border-amber-400 flex items-center justify-center text-6xl shadow-xl animate-bounce">
                    {gameState === 'VICTORY' ? '🏆' : '🐕'}
                  </div>
                )}
              </div>

              {/* COLUNA DIREITA: TÁBUAS DE DINHEIRO, PONTUAÇÃO, COMPARTILHAMENTO E JOGAR NOVAMENTE */}
              <div className="md:col-span-7 flex flex-col justify-between gap-2.5 text-left">
                
                {/* TÁBUA SUPERIOR: DINHEIRO COLETADO NA CORRIDA */}
                <div className="cartoon-wood-board p-3 sm:p-3.5 relative shadow-xl">
                  <SteelCornerBrackets size="sm" />
                  <div className="flex items-center gap-1 text-[11px] sm:text-xs uppercase font-black tracking-widest text-amber-300 cartoon-text-outline">
                    <span>🪙</span>
                    <span>DINHEIRO COLETADO NA CORRIDA</span>
                    <span>🪙</span>
                  </div>

                  <div className="cartoon-title-gold-3d text-3xl sm:text-4xl font-mono tracking-tight my-1 flex items-center gap-2">
                    <span className="text-xl sm:text-2xl text-amber-200">R$</span>
                    <span>{animTotalCollectedMoney.toLocaleString('pt-BR')}</span>
                  </div>

                  {/* 3 Cartões Bevel Tridimensionais com as Notas de 10, 50 e 100 */}
                  <div className="grid grid-cols-3 gap-2 w-full mt-2">
                    {/* Nota de 10 (Verde 3D) */}
                    <div className="cartoon-btn-green p-2 rounded-xl flex flex-col items-center justify-center text-center shadow-md relative">
                      <SteelRivet className="top-1 left-1.5 w-1.5 h-1.5" />
                      <SteelRivet className="top-1 right-1.5 w-1.5 h-1.5" />
                      <img src="/dinheiro/icone_10_cutout.png" alt="10" className="w-7 h-4.5 object-contain filter drop-shadow" />
                      <span className="text-[10px] font-black uppercase text-emerald-100 cartoon-text-outline mt-0.5">NOTA 10</span>
                      <span className="text-xs font-black text-white font-mono cartoon-text-outline">
                        +{animMoney10} <span className="text-[9px] text-emerald-200 font-bold">({animMoney10 * 10}R$)</span>
                      </span>
                    </div>

                    {/* Nota de 50 (Roxa 3D) */}
                    <div className="cartoon-btn-purple p-2 rounded-xl flex flex-col items-center justify-center text-center shadow-md relative">
                      <SteelRivet className="top-1 left-1.5 w-1.5 h-1.5" />
                      <SteelRivet className="top-1 right-1.5 w-1.5 h-1.5" />
                      <img src="/dinheiro/icone_50_roxo_cutout.png" alt="50" className="w-7 h-4.5 object-contain filter drop-shadow" />
                      <span className="text-[10px] font-black uppercase text-purple-100 cartoon-text-outline mt-0.5">NOTA 50</span>
                      <span className="text-xs font-black text-white font-mono cartoon-text-outline">
                        +{animMoney50} <span className="text-[9px] text-purple-200 font-bold">({animMoney50 * 50}R$)</span>
                      </span>
                    </div>

                    {/* Nota de 100 (Azul/Ciano 3D) */}
                    <div className="cartoon-btn-blue p-2 rounded-xl flex flex-col items-center justify-center text-center shadow-md relative">
                      <SteelRivet className="top-1 left-1.5 w-1.5 h-1.5" />
                      <SteelRivet className="top-1 right-1.5 w-1.5 h-1.5" />
                      <img src="/dinheiro/icone_100_vermelho_cutout.png" alt="100" className="w-7 h-4.5 object-contain filter drop-shadow" />
                      <span className="text-[10px] font-black uppercase text-cyan-100 cartoon-text-outline mt-0.5 flex items-center gap-0.5">
                        <span>👑 NOTA 100</span>
                      </span>
                      <span className="text-xs font-black text-white font-mono cartoon-text-outline">
                        +{animMoney100} <span className="text-[9px] text-cyan-200 font-bold">({animMoney100 * 100}R$)</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* PLACAS DE ESTATÍSTICAS (PONTUAÇÃO & MANOBRAS) */}
                <div className="grid grid-cols-2 gap-2.5 w-full">
                  {/* Pontuação */}
                  <div className="cartoon-wood-board p-2.5 rounded-2xl flex flex-col items-center justify-center relative shadow-md">
                    <SteelCornerBrackets size="sm" />
                    <div className="text-[10px] text-amber-200 font-black uppercase tracking-wider cartoon-text-outline flex items-center gap-1">
                      <span>🏆</span>
                      <span>PONTUAÇÃO</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-yellow-300 leading-tight cartoon-text-outline">{score}</div>
                    {score >= highScore && score > 0 && (
                      <span className="cartoon-gold-ribbon px-2 py-0.5 text-[9px] font-black uppercase tracking-wider mt-1">
                        ⭐ NOVO RECORDE! 👑
                      </span>
                    )}
                  </div>

                  {/* Manobras / Mordidas */}
                  <div className="cartoon-wood-board p-2.5 rounded-2xl flex flex-col items-center justify-center relative shadow-md">
                    <SteelCornerBrackets size="sm" />
                    <div className="text-[10px] text-amber-200 font-black uppercase tracking-wider cartoon-text-outline flex items-center gap-1">
                      <span>💀</span>
                      <span>{gameMode === 'motoboy' ? 'MANOBRAS' : 'MORDIDAS'}</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-rose-400 leading-tight cartoon-text-outline">{bitesCount}</div>
                    <span className="text-[10px] text-cyan-200 font-mono font-bold mt-0.5 cartoon-text-outline">{speedKmh} km/h</span>
                  </div>
                </div>

                {/* 4 BOTÕES TRIDIMENSIONAIS DE COMPARTILHAMENTO (ZAP, INSTA, SALVAR, ENVIAR) */}
                <div className="grid grid-cols-4 gap-2 w-full">
                  <button
                    onClick={handleWhatsAppShare}
                    className="cartoon-btn-green py-2 px-1 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all relative"
                    title="Compartilhar no WhatsApp"
                  >
                    <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                    <SteelRivet className="top-1 right-1 w-1.5 h-1.5" />
                    <MessageCircle className="w-4 h-4 fill-current shrink-0" />
                    <span>ZAP</span>
                  </button>

                  <button
                    onClick={handleInstagramShare}
                    className="cartoon-btn-purple py-2 px-1 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all relative"
                    title="Salvar para Stories"
                  >
                    <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                    <SteelRivet className="top-1 right-1 w-1.5 h-1.5" />
                    <Instagram className="w-4 h-4 shrink-0" />
                    <span>INSTA</span>
                  </button>

                  <button
                    onClick={handleDownloadImage}
                    className="cartoon-btn-blue py-2 px-1 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all relative"
                    title="Salvar foto"
                  >
                    <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                    <SteelRivet className="top-1 right-1 w-1.5 h-1.5" />
                    <Download className="w-4 h-4 shrink-0" />
                    <span>SALVAR</span>
                  </button>

                  <button
                    onClick={handleNativeShare}
                    className="cartoon-btn-gold py-2 px-1 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all relative"
                    title="Compartilhar ou Copiar link"
                  >
                    <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                    <SteelRivet className="top-1 right-1 w-1.5 h-1.5" />
                    <Share2 className="w-4 h-4 shrink-0" />
                    <span>ENVIAR</span>
                  </button>
                </div>

                {/* BOTÃO GIGANTE: JOGAR NOVAMENTE */}
                <button
                  onClick={() => {
                    sound.playClick();
                    startGame(gameMode);
                  }}
                  className="cartoon-btn-gold w-full py-3.5 sm:py-4 px-6 rounded-2xl font-black text-base sm:text-xl uppercase tracking-wider shadow-2xl flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.01] active:scale-95 transition-all relative"
                >
                  <SteelCornerBrackets size="sm" />
                  <RotateCcw className="w-6 h-6 stroke-[3]" />
                  <span>JOGAR NOVAMENTE</span>
                </button>

                {/* LINHA INFERIOR DE 3 BOTÕES: INÍCIO, MENU, SKINS */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {onBackToMenu ? (
                    <button
                      onClick={() => {
                        sound.playClick();
                        onBackToMenu();
                      }}
                      className="cartoon-btn-wood py-2.5 px-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Home className="w-4 h-4" />
                      <span>INÍCIO</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        sound.playClick();
                        setGameState('IDLE');
                      }}
                      className="cartoon-btn-wood py-2.5 px-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Home className="w-4 h-4" />
                      <span>INÍCIO</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      sound.playClick();
                      setGameState('IDLE');
                    }}
                    className="cartoon-btn-steel py-2.5 px-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>MENU</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setShowSkinsModal(true);
                    }}
                    className="cartoon-btn-steel py-2.5 px-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Palette className="w-4 h-4" />
                    <span>SKINS</span>
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* FLOATING TOAST NOTIFICATION */}
          {toastNotification && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 cartoon-wood-plank text-white border-2 border-amber-400 px-5 py-2 rounded-full shadow-2xl text-xs sm:text-sm font-black flex items-center gap-2 animate-fade-in pointer-events-none cartoon-text-outline">
              <span>✨</span>
              <span>{toastNotification}</span>
            </div>
          )}
        </div>
      )}

      {/* ⚙️ MODAL DE CONFIGURAÇÕES — PADRÃO IMAGEM DE REFERÊNCIA 2 */}
      {isSettingsOpen && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="cartoon-wood-board max-w-lg w-full p-3.5 sm:p-5 relative text-left text-white max-h-[92vh] flex flex-col gap-3 my-auto shadow-2xl">
            <SteelCornerBrackets size="lg" />

            {/* Header de Madeira com Ícone de Engrenagem Dourada 3D */}
            <div className="flex flex-col gap-1.5 pb-2 border-b-2 border-[#3d1e0d]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 border-2 border-yellow-200 flex items-center justify-center text-stone-950 shadow-md">
                    <Settings className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <h3 className="cartoon-title-gold-3d text-2xl sm:text-3xl tracking-tight leading-tight">
                    CONFIGURAÇÕES
                  </h3>
                </div>
                <OctagonCloseButton onClick={() => setIsSettingsOpen(false)} />
              </div>

              {/* Faixa de Subtítulo */}
              <div className="cartoon-wood-plank py-1 px-3 rounded-lg text-center text-xs font-black text-amber-200 cartoon-text-outline">
                Personalize jogabilidade, gráficos, som e clima
              </div>
            </div>

            {/* 4 Abas 3D de Navegação (CONTROLES / GRÁFICOS / ÁUDIO / CLIMA) */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-stone-950/70 rounded-2xl border-2 border-[#5f7d9c] shadow-inner">
              <button
                onClick={() => setSettingsTab('gameplay')}
                className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                  settingsTab === 'gameplay' ? 'cartoon-btn-gold shadow-lg' : 'cartoon-btn-steel'
                }`}
              >
                <SteelRivet className="top-1 left-1 w-1 h-1" />
                <SteelRivet className="top-1 right-1 w-1 h-1" />
                <span className="text-sm">🎮</span>
                <span className="text-[10px] sm:text-xs">CONTROLES</span>
              </button>

              <button
                onClick={() => setSettingsTab('graphics')}
                className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                  settingsTab === 'graphics' ? 'cartoon-btn-gold shadow-lg' : 'cartoon-btn-steel'
                }`}
              >
                <SteelRivet className="top-1 left-1 w-1 h-1" />
                <SteelRivet className="top-1 right-1 w-1 h-1" />
                <span className="text-sm">🖥️</span>
                <span className="text-[10px] sm:text-xs">GRÁFICOS</span>
              </button>

              <button
                onClick={() => setSettingsTab('audio')}
                className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                  settingsTab === 'audio' ? 'cartoon-btn-gold shadow-lg' : 'cartoon-btn-steel'
                }`}
              >
                <SteelRivet className="top-1 left-1 w-1 h-1" />
                <SteelRivet className="top-1 right-1 w-1 h-1" />
                <span className="text-sm">🔊</span>
                <span className="text-[10px] sm:text-xs">ÁUDIO</span>
              </button>

              <button
                onClick={() => setSettingsTab('weather')}
                className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                  settingsTab === 'weather' ? 'cartoon-btn-gold shadow-lg' : 'cartoon-btn-steel'
                }`}
              >
                <SteelRivet className="top-1 left-1 w-1 h-1" />
                <SteelRivet className="top-1 right-1 w-1 h-1" />
                <span className="text-sm">🌤️</span>
                <span className="text-[10px] sm:text-xs">CLIMA</span>
              </button>
            </div>

            {/* Conteúdo da Aba Selecionada */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 scrollbar-thin">
              {/* ABA 1: CONTROLES & JOGABILIDADE */}
              {settingsTab === 'gameplay' && (
                <>
                  {/* SEÇÃO 1: DIFICULDADE DA QUEBRADA */}
                  <div className="cartoon-wood-plank p-3 rounded-2xl relative shadow-md">
                    <SteelCornerBrackets size="sm" />
                    <div className="flex items-center justify-between mb-2">
                      <div className="cartoon-gold-ribbon px-3 py-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                        <span>🏆</span>
                        <span>DIFICULDADE DA QUEBRADA</span>
                      </div>
                      <span className="cartoon-steel-pill text-[9px] font-black px-2 py-0.5 uppercase flex items-center gap-1">
                        <span>⭐</span>
                        <span>RECOMENDADO</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {/* Fácil */}
                      <button
                        onClick={() => handleSetDifficulty('easy')}
                        className={`p-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                          difficulty === 'easy'
                            ? 'cartoon-btn-green ring-4 ring-emerald-400/50'
                            : 'cartoon-btn-steel opacity-80'
                        }`}
                      >
                        <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                        <SteelRivet className="top-1 right-1 w-1.5 h-1.5" />
                        <span className="text-base">🚗</span>
                        <span className="text-xs">FÁCIL</span>
                        <span className="text-[8px] font-bold opacity-90">2 CARROS - CALMO</span>
                      </button>

                      {/* Médio */}
                      <button
                        onClick={() => handleSetDifficulty('medium')}
                        className={`p-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                          difficulty === 'medium'
                            ? 'cartoon-btn-gold ring-4 ring-amber-400/50'
                            : 'cartoon-btn-steel opacity-80'
                        }`}
                      >
                        <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                        <SteelRivet className="top-1 right-1 w-1.5 h-1.5" />
                        <span className="text-base">🚖</span>
                        <span className="text-xs">MÉDIO</span>
                        <span className="text-[8px] font-bold opacity-90">4 CARROS - EQUILIBRADO</span>
                      </button>

                      {/* Difícil */}
                      <button
                        onClick={() => handleSetDifficulty('hard')}
                        className={`p-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                          difficulty === 'hard'
                            ? 'cartoon-btn-red ring-4 ring-rose-500/50'
                            : 'cartoon-btn-steel opacity-80'
                        }`}
                      >
                        <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                        <SteelRivet className="top-1 right-1 w-1.5 h-1.5" />
                        <span className="text-base">🚘</span>
                        <span className="text-xs">DIFÍCIL</span>
                        <span className="text-[8px] font-bold opacity-90">6 CARROS - EXTREMO</span>
                      </button>
                    </div>
                  </div>

                  {/* SEÇÃO 2: LINHA BOTÕES VIRTUAIS NA TELA */}
                  <div className="cartoon-wood-plank p-3 rounded-2xl flex items-center justify-between relative shadow-md">
                    <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                    <SteelRivet className="bottom-1 left-1 w-1.5 h-1.5" />
                    <div>
                      <div className="cartoon-gold-ribbon px-2.5 py-0.5 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider mb-1">
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>BOTÕES VIRTUAIS NA TELA</span>
                      </div>
                      <p className="text-[11px] text-amber-100/90 font-medium cartoon-text-outline">
                        Ativa e desativa os botões de ação para telas touchscreen.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowOnScreenControls((prev) => {
                          const next = !prev;
                          try {
                            localStorage.setItem('caramelo_touch_controls', next ? 'true' : 'false');
                          } catch {}
                          return next;
                        });
                      }}
                      className={`py-2 px-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
                        showOnScreenControls ? 'cartoon-btn-green' : 'cartoon-btn-steel'
                      }`}
                    >
                      {showOnScreenControls ? '✓ ATIVADO' : 'OCULTO'}
                    </button>
                  </div>

                  {/* SEÇÃO 3: LINHA INVERTER DIREÇÃO DO TOQUE */}
                  <div className="cartoon-wood-plank p-3 rounded-2xl flex items-center justify-between relative shadow-md">
                    <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                    <SteelRivet className="bottom-1 left-1 w-1.5 h-1.5" />
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl cartoon-btn-blue flex items-center justify-center flex-shrink-0">
                        <MoveHorizontal className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-black text-white uppercase cartoon-text-outline">
                          Inverter Direção do Toque
                        </span>
                        <p className="text-[10px] text-amber-200/80 font-medium cartoon-text-outline">
                          Inverte o lado dos botões de direção no celular.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setInvertTouchDirection((prev) => !prev)}
                      className="cartoon-btn-steel py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer"
                    >
                      {invertTouchDirection ? 'Invertido' : 'Padrão'}
                    </button>
                  </div>

                  {/* SEÇÃO 4: LINHA TUTORIAL DO JATO D'ÁGUA */}
                  <div className="cartoon-wood-plank p-3 rounded-2xl flex items-center justify-between relative shadow-md">
                    <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                    <SteelRivet className="bottom-1 left-1 w-1.5 h-1.5" />
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl cartoon-btn-blue flex items-center justify-center flex-shrink-0 text-lg">
                        🌊
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-black text-white uppercase cartoon-text-outline">
                          TUTORIAL DO JATO D'ÁGUA
                        </span>
                        <p className="text-[10px] text-amber-200/80 font-medium cartoon-text-outline">
                          Exibe instrução de desvio ao se aproximar dos jatos.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setWaterJetTutorialEnabled((prev) => {
                          const next = !prev;
                          try {
                            localStorage.setItem('caramelo_tutorial_enabled', next ? 'true' : 'false');
                          } catch {}
                          return next;
                        });
                      }}
                      className={`py-2 px-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
                        waterJetTutorialEnabled ? 'cartoon-btn-green' : 'cartoon-btn-steel'
                      }`}
                    >
                      {waterJetTutorialEnabled ? '✓ ATIVADO' : 'DESATIVADO'}
                    </button>
                  </div>

                  {/* SEÇÃO 5: LINHA MODO TELA CHEIA */}
                  <div className="cartoon-wood-plank p-3 rounded-2xl flex items-center justify-between relative shadow-md">
                    <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                    <SteelRivet className="bottom-1 left-1 w-1.5 h-1.5" />
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl cartoon-btn-blue flex items-center justify-center flex-shrink-0">
                        <Maximize className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-black text-white uppercase cartoon-text-outline">
                          MODO TELA CHEIA
                        </span>
                        <p className="text-[10px] text-amber-200/80 font-medium cartoon-text-outline">
                          Expande o jogo para máxima imersão.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={toggleFullscreen}
                      className="cartoon-btn-blue py-2 px-3.5 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                    >
                      <span>✓</span>
                      <span>{isFullscreen ? 'SAIR' : 'ATIVAR'}</span>
                    </button>
                  </div>

                  {/* SEÇÃO 6: CRÉDITOS DOS CRIADORES */}
                  <div className="cartoon-wood-plank p-3 rounded-2xl flex items-center justify-between relative shadow-md">
                    <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                    <SteelRivet className="bottom-1 left-1 w-1.5 h-1.5" />
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl cartoon-btn-purple flex items-center justify-center flex-shrink-0 text-lg">
                        🎬
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-black text-white uppercase cartoon-text-outline">
                          CRÉDITOS DOS CRIADORES
                        </span>
                        <p className="text-[10px] text-amber-200/80 font-medium cartoon-text-outline">
                          Assista e conheça os créditos da equipe de desenvolvimento.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setShowIntroCinematic(true);
                      }}
                      className="cartoon-btn-gold py-2 px-3.5 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1"
                    >
                      <span>🎬</span>
                      <span>CRÉDITOS</span>
                    </button>
                  </div>
                </>
              )}

              {/* ABA 2: GRÁFICOS */}
              {settingsTab === 'graphics' && (
                <>
                  <div className="cartoon-wood-plank p-3 rounded-2xl relative shadow-md">
                    <SteelCornerBrackets size="sm" />
                    <div className="flex items-center justify-between mb-2">
                      <div className="cartoon-gold-ribbon px-2.5 py-0.5 text-xs font-black uppercase">
                        QUALIDADE GRÁFICA GERAL
                      </div>
                      <span className="cartoon-steel-pill text-[10px] font-mono font-black px-2 py-0.5">
                        {graphicsSettings.preset.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {(['low', 'medium', 'high', 'ultra'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => updateGraphicsSetting('preset', p)}
                          className={`py-2 px-1 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer ${
                            graphicsSettings.preset === p ? 'cartoon-btn-gold shadow-md' : 'cartoon-btn-steel'
                          }`}
                        >
                          {p === 'low' ? 'Baixa' : p === 'medium' ? 'Média' : p === 'high' ? 'Alta' : 'Ultra'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="cartoon-wood-plank p-3 rounded-2xl relative shadow-md">
                    <SteelCornerBrackets size="sm" />
                    <div className="text-xs font-black uppercase text-amber-200 cartoon-text-outline mb-1.5">
                      DISTÂNCIA DE RENDERIZAÇÃO
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'medium', 'high'] as const).map((rd) => (
                        <button
                          key={rd}
                          onClick={() => updateGraphicsSetting('renderDistance', rd)}
                          className={`py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                            graphicsSettings.renderDistance === rd ? 'cartoon-btn-green' : 'cartoon-btn-steel'
                          }`}
                        >
                          {rd === 'low' ? '⚡ 75m' : rd === 'medium' ? '⚖️ 130m' : '🔭 220m'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="cartoon-wood-plank p-3 rounded-2xl relative shadow-md">
                    <SteelCornerBrackets size="sm" />
                    <div className="text-xs font-black uppercase text-amber-200 cartoon-text-outline mb-1.5">
                      LIMITE DE FPS
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {([30, 60, 90, 120, 0] as const).map((fps) => (
                        <button
                          key={fps}
                          onClick={() => updateGraphicsSetting('fpsLimit', fps)}
                          className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            graphicsSettings.fpsLimit === fps ? 'cartoon-btn-blue' : 'cartoon-btn-steel'
                          }`}
                        >
                          {fps === 0 ? 'MAX' : `${fps}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 🎮 NOVO: SISTEMA PROFISSIONAL DE DISTANCE FOG & DITHERING FADE RETRÔ PS2 */}
                  <div className="cartoon-wood-plank p-3 rounded-2xl relative shadow-md">
                    <SteelCornerBrackets size="sm" />
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-xs font-black uppercase text-amber-200 cartoon-text-outline flex items-center gap-1.5">
                        <span>🌫️</span>
                        <span>NEBLINA & FADE RETRÔ PS2</span>
                      </div>
                      <span className="cartoon-steel-pill text-[9px] font-mono font-black px-2 py-0.5">
                        {graphicsSettings.ps2FogMode === 'retro_ps2' ? 'BAYER 4X4' : graphicsSettings.ps2FogMode === 'smooth_cinematic' ? 'SUAVE' : 'OFF'}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-100/80 mb-2 leading-tight">
                      Perspectiva atmosférica, perda gradual de contraste e saturação com fade screen-door sem pop-in.
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'retro_ps2', label: '🎮 Retrô PS2' },
                        { id: 'smooth_cinematic', label: '✨ Suave' },
                        { id: 'off', label: '🚫 Desligado' },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => updateGraphicsSetting('ps2FogMode', mode.id as any)}
                          className={`py-2 px-1 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer ${
                            graphicsSettings.ps2FogMode === mode.id ? 'cartoon-btn-gold shadow-md' : 'cartoon-btn-steel'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>

                    {graphicsSettings.ps2FogMode === 'retro_ps2' && (
                      <div className="mt-3 pt-2.5 border-t border-amber-900/40">
                        <div className="text-[10px] font-black uppercase text-amber-300 cartoon-text-outline mb-1.5">
                          ESCALA DO DITHER (PIXEL ART)
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { sz: 1, label: '1x (Fino)' },
                            { sz: 2, label: '2x (PS2 480p)' },
                            { sz: 3, label: '3x (Retrô)' },
                          ].map((d) => (
                            <button
                              key={d.sz}
                              onClick={() => updateGraphicsSetting('ditherPixelSize', d.sz as any)}
                              className={`py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                                graphicsSettings.ditherPixelSize === d.sz ? 'cartoon-btn-green shadow-sm' : 'cartoon-btn-steel'
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ABA 3: ÁUDIO */}
              {settingsTab === 'audio' && (
                <div className="cartoon-wood-plank p-4 rounded-2xl flex items-center justify-between relative shadow-md">
                  <SteelCornerBrackets size="sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      {soundMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                      <span className="text-sm font-black uppercase text-white cartoon-text-outline">ÁUDIO GERAL DO JOGO</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 mt-0.5 cartoon-text-outline">Moto, buzinas, derrapagem e mordidas</p>
                  </div>
                  <button
                    onClick={() => {
                      const isEnabled = sound.toggleMute();
                      setSoundMuted(!isEnabled);
                    }}
                    className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      !soundMuted ? 'cartoon-btn-green' : 'cartoon-btn-red'
                    }`}
                  >
                    {!soundMuted ? 'LIGADO' : 'MUTADO'}
                  </button>
                </div>
              )}

              {/* ABA 4: CLIMA */}
              {settingsTab === 'weather' && (
                <div className="cartoon-wood-plank p-4 rounded-2xl relative shadow-md">
                  <SteelCornerBrackets size="sm" />
                  <div className="cartoon-gold-ribbon px-3 py-1 inline-flex items-center gap-1.5 text-xs font-black uppercase mb-3">
                    <Sun className="w-4 h-4" />
                    <span>HORÁRIO & ILUMINAÇÃO</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        if (gameRef.current.weather) {
                          gameRef.current.weather.resetToDay();
                          setCurrentTimeOfDay('DAY');
                        }
                      }}
                      className={`py-3 px-2 rounded-xl text-xs font-black uppercase flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        currentTimeOfDay === 'DAY' ? 'cartoon-btn-gold' : 'cartoon-btn-steel'
                      }`}
                    >
                      <Sun className="w-5 h-5 text-amber-300" />
                      <span>DIA</span>
                    </button>
                    <button
                      onClick={() => {
                        if (gameRef.current.weather) {
                          gameRef.current.weather.toggleTimeOfDay();
                          setCurrentTimeOfDay('SUNSET');
                        }
                      }}
                      className={`py-3 px-2 rounded-xl text-xs font-black uppercase flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        currentTimeOfDay === 'SUNSET' ? 'cartoon-btn-gold' : 'cartoon-btn-steel'
                      }`}
                    >
                      <Sunset className="w-5 h-5 text-orange-300" />
                      <span>PÔR DO SOL</span>
                    </button>
                    <button
                      onClick={() => {
                        if (gameRef.current.weather) {
                          gameRef.current.weather.toggleTimeOfDay();
                          setCurrentTimeOfDay('NIGHT');
                        }
                      }}
                      className={`py-3 px-2 rounded-xl text-xs font-black uppercase flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        currentTimeOfDay === 'NIGHT' ? 'cartoon-btn-gold' : 'cartoon-btn-steel'
                      }`}
                    >
                      <Moon className="w-5 h-5 text-cyan-300" />
                      <span>NOITE</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Botão Gigante de Fechar (Verde 3D com Disquete — Idêntico à Imagem de Referência 2) */}
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="cartoon-btn-green w-full py-3.5 px-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl cursor-pointer hover:scale-[1.01] active:scale-95 transition-all relative mt-1"
            >
              <SteelCornerBrackets size="sm" />
              <span className="text-xl">💾</span>
              <span>SALVAR & FECHAR</span>
            </button>
          </div>
        </div>
      )}

      {/* ⏸️ MODAL DE PAUSA DO JOGO (Não sobrepõe o painel de configurações) */}
      {isGamePaused && gameState === 'PLAYING' && !isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
          <div className="cartoon-wood-board max-w-sm w-full p-6 text-center flex flex-col items-center gap-4 relative shadow-2xl">
            <SteelCornerBrackets size="md" />

            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-inner">
              <Pause className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <h2 className="cartoon-title-3d text-2xl sm:text-3xl tracking-wider">JOGO PAUSADO</h2>
              <p className="text-xs text-amber-200 font-bold cartoon-text-outline mt-1">
                Respire fundo ou altere suas preferências
              </p>
            </div>

            <div className="w-full flex flex-col gap-2.5 mt-2">
              <button
                onClick={togglePause}
                className="cartoon-btn-gold w-full py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-stone-950" />
                <span>Continuar Corrida</span>
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="cartoon-btn-steel w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Settings className="w-4 h-4 text-amber-300" />
                <span>Configurações & Gráficos</span>
              </button>

              <button
                onClick={() => setShowQuitConfirm(true)}
                className="cartoon-btn-red w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Home className="w-4 h-4" />
                <span>Sair da Partida</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL DE CONFIRMAÇÃO DE SAÍDA (SEM RECOMPENSAS AO ABANDONAR) */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-4">
          <div className="cartoon-wood-board max-w-sm w-full p-6 text-center flex flex-col items-center gap-4 relative shadow-2xl border-4 border-red-500/80">
            <SteelCornerBrackets size="md" />

            <div className="w-14 h-14 rounded-2xl bg-red-600/30 border-2 border-red-400 flex items-center justify-center text-red-300 shadow-inner">
              <Home className="w-7 h-7 stroke-[3]" />
            </div>

            <div>
              <h3 className="cartoon-title-3d text-xl sm:text-2xl text-red-200 tracking-wider">
                ABANDONAR PARTIDA?
              </h3>
              <p className="text-xs text-amber-100 font-bold cartoon-text-outline mt-2 leading-relaxed">
                Atenção: Ao sair agora, a corrida atual será descartada e <strong>nenhuma moeda ou pontuação</strong> será adicionada à sua conta!
              </p>
            </div>

            <div className="w-full flex items-center gap-3 mt-2">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="cartoon-btn-steel flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmAbandon}
                className="cartoon-btn-red flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg"
              >
                Confirmar Saída
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ GALERIA DE ARTES & MISSÕES COLECIONÁVEIS */}
      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        userCoins={userCoins}
        onSpendCoins={handleSpendCoins}
        onStartGame={() => triggerLoadingAction(() => startGame('caramelo'), 'Iniciando modo Caramelo...')}
      />

      {/* 📢 PORTAL MARKETING 3D (CADASTRO CNPJ & PAINEL DO ANUNCIANTE) */}
      <MarketingPortalModal
        isOpen={showMarketingModal}
        onClose={() => setShowMarketingModal(false)}
      />

      {/* 🚀 OVERLAY DE LOADING INSTANTÂNEO ENTRE BOTÕES (Zero tela travada) */}
      {isNavigatingLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl animate-fade-in p-4 text-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-amber-400 font-black text-xs">
              ⚡
            </div>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider mb-1">
            CARREGANDO DADOS DA QUEBRADA...
          </h3>
          <p className="text-xs text-amber-300 font-mono font-medium animate-pulse">
            {navigatingMessage}
          </p>
        </div>
      )}

      {/* 📸 SELETOR DE FOTOS DE PERFIL (GALERIA COMPLETA DE 29 FOTOS) */}
      <ProfilePhotoSelectorModal
        isOpen={isPhotoSelectorOpen}
        onClose={() => setIsPhotoSelectorOpen(false)}
        currentPhotoUrl={currentUserPhoto}
        onSelectPhoto={(photoUrl) => {
          setCurrentUserPhoto(photoUrl);
          const cu = storage.getCurrentUser();
          if (cu) {
            storage.setUserProfilePhoto(cu.id, photoUrl);
          }
        }}
      />
    </div>
  );
};
