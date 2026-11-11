import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart,
  Coins,
  Trophy,
  Play,
  Pause,
  RotateCcw,
  Home,
  Megaphone,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Sparkles,
  Award,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Sun,
  Sunset,
  Moon,
  MoveHorizontal,
  Gamepad2,
  Check,
  Lock,
  Flame,
  Zap,
  MessageCircle,
  Instagram,
  Download,
  Share2,
  Images,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  RunnerCanvas,
  type GamePhase,
  type HudSnapshot,
  type MapId,
} from '../RunnerCanvas';
import { getInitialLivesForDifficulty } from '../../game/rules';
import type { CashDenomination } from '../../game/builders';
import type { SkyPreset } from '../../game/textures';
import type { Skin } from '../../types';
import { storage, isInfiniteMoneyUser } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import {
  SteelCornerBrackets,
  OctagonCloseButton,
  OctagonIconBadge,
  SteelCoinPill,
  SteelRivet,
} from '../common/CartoonWoodUI';
import { GalleryModal } from '../game3d/GalleryModal';
import { MarketingPortalModal } from './MarketingPortalModal';
import { ProfilePhotoSelectorModal } from '../player/ProfilePhotoSelectorModal';
import { CartoonSpiralTransition } from '../common/CartoonSpiralTransition';
import {
  MOTORCYCLES_CATALOG,
  getSavedEquippedMotoId,
  saveEquippedMotoId,
  getUnlockedMotoIds,
  saveUnlockedMotoIds,
  getMotoSpecById,
  type MotorcycleSpec,
} from '../../game/motosCatalog';
import {
  MOTOBOYS_CATALOG,
  getMotoboySpecById,
  getSavedMotoboyId,
  saveMotoboyId,
  getUnlockedMotoboyIds,
  saveUnlockedMotoboyIds,
  type MotoboyCharacterId,
  type MotoboySpec,
} from '../../services/motoboyModelLoader';
import {
  CARAMELO_CATALOG,
  getCarameloSpecById,
  getSavedEquippedCarameloId,
  saveEquippedCarameloId,
  getUnlockedCarameloIds,
  saveUnlockedCarameloIds,
  getSavedPlayMode,
  savePlayMode,
  type CarameloSpec,
  type PlayMode,
} from '../../services/carameloModelLoader';
import { Garage3DShowroom, type GarageShowroomMode } from './Garage3DShowroom';
import {
  getOrRenderCaramelo3DPortrait,
  getOrRenderMapGameplayCapture,
  getOrRenderMotoboy3DPortrait,
  getOrRenderMoto3DCardThumb,
} from '../../services/garage3dThumbnailRenderer';
import {
  RANK_TIERS,
  getRankTierByTrophies,
  getRankProgressInfo,
  loadPlayerRankingState,
  evaluateMatchCompetitiveProgress,
  claimCompetitiveMission,
  buildCompetitiveLeaderboard,
  loadAllRankEmblemSprites,
  type PlayerRankingState,
  type CompetitiveMission,
  type RankTierDefinition,
} from '../../services/rankingSystem';

// 📸 FOTOS FINAIS DE PERDA / GAME OVER (Alternadas dinamicamente ou fixadas pelo Admin/Galeria)
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
    const directPinnedUrl =
      storage.getPinnedGameOverImageUrl?.() ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('viralata_pinned_gameover_image_url_v1')
        : null);
    if (directPinnedUrl && typeof directPinnedUrl === 'string' && directPinnedUrl.trim().length > 0) {
      return directPinnedUrl.trim();
    }

    const pinnedId =
      storage.getPinnedGameOverImageId?.() ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('viralata_pinned_gameover_image_v1')
        : null);
    const customImages = storage.getGameOverImages();
    if (pinnedId && customImages && customImages.length > 0) {
      const pinned = customImages.find((img) => img.id === pinnedId || img.url === pinnedId);
      if (pinned && pinned.url) {
        return pinned.url;
      }
    }

    const pickRandom = (len: number) => {
      if (len <= 1) return 0;
      let nextIdx = Math.floor(Math.random() * len);
      if (nextIdx === lastGameOverImageIndex) {
        nextIdx = (nextIdx + 1) % len;
      }
      lastGameOverImageIndex = nextIdx;
      try {
        localStorage.setItem(LAST_GAMEOVER_IDX_KEY, String(nextIdx));
      } catch {}
      return nextIdx;
    };

    if (customImages && customImages.length > 0) {
      const urls = customImages.map((img) => img.url).filter(Boolean);
      if (urls.length > 0) {
        const idx = pickRandom(urls.length);
        return urls[idx];
      }
    }
  } catch (e) {
    console.warn('[GameOver] Erro no sorteio custom:', e);
  }

  const len = FINAL_GAME_OVER_IMAGES.length;
  let nextIdx = Math.floor(Math.random() * len);
  if (len > 1 && nextIdx === lastGameOverImageIndex) {
    nextIdx = (nextIdx + 1) % len;
  }
  lastGameOverImageIndex = nextIdx;
  try {
    localStorage.setItem(LAST_GAMEOVER_IDX_KEY, String(nextIdx));
  } catch {}
  return FINAL_GAME_OVER_IMAGES[nextIdx];
}

export interface TropicalVilaRunnerProps {
  onBackToMenu?: () => void;
  equippedSkin?: Skin | string;
  startInSettings?: boolean;
}

export type GameState = 'IDLE' | 'PLAYING';

export const TropicalVilaRunner: React.FC<TropicalVilaRunnerProps> = ({
  onBackToMenu,
  startInSettings = false,
}) => {
  // Estado de tela principal: 'IDLE' (menu inicial) ou 'PLAYING' (corrida ativa)
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [phase, setPhase] = useState<GamePhase>('title');
  const [runNonce, setRunNonce] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  // Moto equipada, Piloto Motoboy, Caramelo e Modo de Jogo ('moto' | 'caramelo')
  const [equippedMotoId, setEquippedMotoId] = useState<string>(getSavedEquippedMotoId);
  const [selectedGarageMotoId, setSelectedGarageMotoId] = useState<string>(getSavedEquippedMotoId);
  const [unlockedMotoIds, setUnlockedMotoIds] = useState<string[]>(getUnlockedMotoIds);

  const [equippedMotoboyId, setEquippedMotoboyId] = useState<MotoboyCharacterId>(getSavedMotoboyId);
  const [selectedGarageMotoboyId, setSelectedGarageMotoboyId] =
    useState<MotoboyCharacterId>(getSavedMotoboyId);
  const [unlockedMotoboyIds, setUnlockedMotoboyIds] =
    useState<MotoboyCharacterId[]>(getUnlockedMotoboyIds);

  const [equippedCarameloId, setEquippedCarameloId] = useState<string>(getSavedEquippedCarameloId);
  const [selectedGarageCarameloId, setSelectedGarageCarameloId] =
    useState<string>(getSavedEquippedCarameloId);
  const [unlockedCarameloIds, setUnlockedCarameloIds] = useState<string[]>(getUnlockedCarameloIds);

  const [playMode, setPlayMode] = useState<PlayMode>(getSavedPlayMode);
  const [garageSection, setGarageSection] = useState<GarageShowroomMode>('caramelos');
  const [garageStepBanner, setGarageStepBanner] = useState<string | null>(null);
  const [deniedPurchaseFlash, setDeniedPurchaseFlash] = useState<string | null>(null);
  const deniedPurchaseTimerRef = useRef<number | null>(null);
  const [menuIntroSpiralPhase, setMenuIntroSpiralPhase] = useState<'in' | null>('in');

  useEffect(() => {
    const t = window.setTimeout(() => {
      setMenuIntroSpiralPhase(null);
    }, 380);
    return () => window.clearTimeout(t);
  }, []);
  const [cashPickupToast, setCashPickupToast] = useState<{
    text: string;
    denom: CashDenomination;
  } | null>(null);
  const [cashPopActive, setCashPopActive] = useState<boolean>(false);
  const [lastCashDenom, setLastCashDenom] = useState<CashDenomination>(10);
  const [runCashCollected, setRunCashCollected] = useState<number>(0);
  const [lensSplash, setLensSplash] = useState<{ id: number; intensity: number } | null>(null);
  const lensSplashTimerRef = useRef<number | null>(null);
  const [lobbyExiting, setLobbyExiting] = useState<boolean>(false);
  const lobbyExitTimerRef = useRef<number | null>(null);
  const [blueHitFlash, setBlueHitFlash] = useState<{
    id: number;
    quality: 'weak' | 'good' | 'perfect';
  } | null>(null);
  const blueFlashTimerRef = useRef<number | null>(null);
  const [redDamageFlash, setRedDamageFlash] = useState<number | null>(null);
  const redDamageFlashTimerRef = useRef<number | null>(null);
  const lastDamageFlashNonceRef = useRef<number>(0);
  const [soulLiberatedBadge, setSoulLiberatedBadge] = useState<number | null>(null);
  const soulLiberatedTimerRef = useRef<number | null>(null);
  const lastSoulLiberatedNonceRef = useRef<number>(0);
  const [showExtremeConfirmModal, setShowExtremeConfirmModal] = useState<boolean>(false);
  const [extremeTypedChars, setExtremeTypedChars] = useState<number>(0);
  const [biteFeedbackBadge, setBiteFeedbackBadge] = useState<{
    id: number;
    text: string;
    tone: 'perfect' | 'good' | 'weak' | 'miss';
  } | null>(null);
  const biteBadgeTimerRef = useRef<number | null>(null);
  const lastBiteNonceRef = useRef<number>(0);
  const [dodgeFeedbackBadge, setDodgeFeedbackBadge] = useState<number | null>(null);
  const dodgeBadgeTimerRef = useRef<number | null>(null);
  const lastDodgeNonceRef = useRef<number>(0);
  const [pizzaDeliveredBadge, setPizzaDeliveredBadge] = useState<number | null>(null);
  const pizzaBadgeTimerRef = useRef<number | null>(null);
  const lastPizzaNonceRef = useRef<number>(0);
  const [pizzaCounterPop, setPizzaCounterPop] = useState<boolean>(false);
  const [deliveryProgressPopup, setDeliveryProgressPopup] = useState<{
    delivered: number;
    goal: number;
    id: number;
  } | null>(null);
  const deliveryProgressTimerRef = useRef<number | null>(null);
  const prevHpRef = useRef<number>(10);
  const [brokenHeartIndex, setBrokenHeartIndex] = useState<number | null>(null);
  const [healedHeartIndex, setHealedHeartIndex] = useState<number | null>(null);
  const [comboPopActive, setComboPopActive] = useState<boolean>(false);
  const lastPickupComboNonceRef = useRef<number>(0);
  const lastComboBreakNonceRef = useRef<number>(0);
  const [activeComboBreak, setActiveComboBreak] = useState<{
    brokenCombo: number;
    nonce: number;
    mode: 'moto' | 'caramelo';
  } | null>(null);
  const [previewedMapId, setPreviewedMapId] = useState<MapId | null>(null);
  const [showGameOverPhotoShare, setShowGameOverPhotoShare] = useState<boolean>(false);
  const [rankingState, setRankingState] = useState<PlayerRankingState>(() => loadPlayerRankingState());
  const [rankEmblemSprites, setRankEmblemSprites] = useState<Record<number, string>>({});
  const [showRankingModal, setShowRankingModal] = useState<boolean>(false);
  const [rankingModalTab, setRankingModalTab] = useState<'patentes' | 'missoes' | 'top'>('patentes');
  const [rankingMissionModeFilter, setRankingMissionModeFilter] = useState<'all' | 'moto' | 'caramelo'>('all');
  const [matchRankReport, setMatchRankReport] = useState<{
    trophiesDelta: number;
    promotedTo: RankTierDefinition | null;
    completedMissionIds: string[];
  } | null>(null);
  const [isRunVictory, setIsRunVictory] = useState<boolean>(false);
  const [isMissionCompletedVictory, setIsMissionCompletedVictory] = useState<boolean>(false);
  const [gameOverPanelTab, setGameOverPanelTab] = useState<'records' | 'vitorias'>('records');
  const [deliveryMissionStats, setDeliveryMissionStats] = useState<{
    totalDeliveredAllTime: number;
    bestDeliveredInRun: number;
    missionsCompleted: number;
    bestPerformanceScore: number;
  }>(() => {
    try {
      const total = parseInt(localStorage.getItem('caramelo_total_pizzas_v1') || '0', 10) || 0;
      const bestRun = parseInt(localStorage.getItem('caramelo_best_pizzas_run_v1') || '0', 10) || 0;
      const missions = parseInt(localStorage.getItem('caramelo_missions_done_v1') || '0', 10) || 0;
      const bestPerf = parseInt(localStorage.getItem('caramelo_best_mission_score_v1') || '0', 10) || 0;
      return {
        totalDeliveredAllTime: total,
        bestDeliveredInRun: bestRun,
        missionsCompleted: missions,
        bestPerformanceScore: bestPerf,
      };
    } catch {
      return {
        totalDeliveredAllTime: 0,
        bestDeliveredInRun: 0,
        missionsCompleted: 0,
        bestPerformanceScore: 0,
      };
    }
  });
  const [runBills, setRunBills] = useState<{ n10: number; n50: number; n100: number; n200: number }>({
    n10: 0,
    n50: 0,
    n100: 0,
    n200: 0,
  });
  const streetCashCollectedRef = useRef<number>(0);
  const streetBillsRef = useRef<{ n10: number; n50: number; n100: number; n200: number }>({
    n10: 0,
    n50: 0,
    n100: 0,
    n200: 0,
  });
  const [showSeLascouTransition, setShowSeLascouTransition] = useState<boolean>(false);
  const seLascouTimerRef = useRef<number | null>(null);

  // Clima e Shader de Céu
  const [skyPreset, setSkyPreset] = useState<SkyPreset>(() => {
    try {
      const saved = localStorage.getItem('caramelo_sky_preset') as SkyPreset;
      if (saved && ['sunset_dramatic', 'tropical_morning', 'violet_dusk'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'sunset_dramatic';
  });

  // Modais & Seleção de Mapas
  const [isSettingsOpen, setIsSettingsOpen] = useState(startInSettings);
  const [settingsTab, setSettingsTab] = useState<'gameplay' | 'graphics' | 'audio' | 'weather' | 'dev'>('gameplay');
  const [fullscreenImageModal, setFullscreenImageModal] = useState<{
    url: string;
    title?: string;
    subtitle?: string;
  } | null>(null);
  const [showSkinsModal, setShowSkinsModal] = useState(false);
  const [showMapSelectModal, setShowMapSelectModal] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<MapId>(() => {
    try {
      const saved = localStorage.getItem('caramelo_selected_map_id') as MapId;
      if (saved === 'favela' || saved === 'praia') return saved;
    } catch {}
    return 'favela';
  });
  // Memoriza o mapa normal do jogador (favela ou praia) para restaurar perfeitamente ao desmarcar o Modo Extremo!
  const lastNormalMapIdRef = useRef<MapId>(
    selectedMapId === 'praia' ? 'praia' : 'favela'
  );

  useEffect(() => {
    if (selectedMapId === 'favela' || selectedMapId === 'praia') {
      lastNormalMapIdRef.current = selectedMapId;
    }
  }, [selectedMapId]);

  const [moto3DThumbs, setMoto3DThumbs] = useState<Record<string, string>>({});
  const [motoboy3DThumbs, setMotoboy3DThumbs] = useState<Record<string, string>>({});
  const [caramelo3DThumbs, setCaramelo3DThumbs] = useState<Record<string, string>>({});
  const [map3DCaptures, setMap3DCaptures] = useState<Record<string, string>>({});
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [isIntroCutsceneActive, setIsIntroCutsceneActive] = useState(false);
  const [mapLoadingState, setMapLoadingState] = useState<{
    active: boolean;
    progress: number;
    stepLabel: string;
    targetMapId: MapId;
    fadingOut: boolean;
  } | null>(null);
  const mapLoadTimersRef = useRef<number[]>([]);

  useEffect(() => {
    sound.setActiveMap(selectedMapId);
  }, [selectedMapId]);

  // Preload 3D portrait of equipped Motoboy & Caramelo for the Health HUD + 3D Rank Emblems
  useEffect(() => {
    let cancelled = false;
    getOrRenderMotoboy3DPortrait(equippedMotoboyId)
      .then((url) => {
        if (!cancelled) {
          setMotoboy3DThumbs((prev) => (prev[equippedMotoboyId] ? prev : { ...prev, [equippedMotoboyId]: url }));
        }
      })
      .catch(() => {});
    getOrRenderCaramelo3DPortrait(equippedCarameloId)
      .then((url) => {
        if (!cancelled) {
          setCaramelo3DThumbs((prev) => (prev[equippedCarameloId] ? prev : { ...prev, [equippedCarameloId]: url }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [equippedMotoboyId, equippedCarameloId]);

  useEffect(() => {
    let cancelled = false;
    loadAllRankEmblemSprites()
      .then((sprites) => {
        if (!cancelled) setRankEmblemSprites(sprites);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Item 10 & 12: Carregamento sob demanda sequencial das miniaturas 3D da Garagem (prioriza o selecionado e vizinhos!)
  useEffect(() => {
    if (!showSkinsModal) return;
    let cancelled = false;

    const loadSequentially = async () => {
      if (garageSection === 'motos') {
        const selIdx = Math.max(
          0,
          MOTORCYCLES_CATALOG.findIndex((m) => m.id === selectedGarageMotoId)
        );
        const ordered = [...MOTORCYCLES_CATALOG].sort(
          (a, b) =>
            Math.abs(MOTORCYCLES_CATALOG.indexOf(a) - selIdx) -
            Math.abs(MOTORCYCLES_CATALOG.indexOf(b) - selIdx)
        );
        for (const m of ordered) {
          if (cancelled) return;
          if (!moto3DThumbs[m.id]) {
            try {
              const url = await getOrRenderMoto3DCardThumb(m.id);
              if (cancelled) return;
              setMoto3DThumbs((prev) => (prev[m.id] ? prev : { ...prev, [m.id]: url }));
            } catch {}
          }
        }
      } else if (garageSection === 'motoboys') {
        for (const mb of MOTOBOYS_CATALOG) {
          if (cancelled) return;
          if (!motoboy3DThumbs[mb.id]) {
            try {
              const url = await getOrRenderMotoboy3DPortrait(mb.id);
              if (cancelled) return;
              setMotoboy3DThumbs((prev) => (prev[mb.id] ? prev : { ...prev, [mb.id]: url }));
            } catch {}
          }
        }
      } else if (garageSection === 'caramelos') {
        for (const dog of CARAMELO_CATALOG) {
          if (cancelled) return;
          if (!caramelo3DThumbs[dog.id]) {
            try {
              const url = await getOrRenderCaramelo3DPortrait(dog.id);
              if (cancelled) return;
              setCaramelo3DThumbs((prev) => (prev[dog.id] ? prev : { ...prev, [dog.id]: url }));
            } catch {}
          }
        }
      }
    };

    loadSequentially();
    return () => {
      cancelled = true;
    };
  }, [showSkinsModal, garageSection, selectedGarageMotoId]);

  useEffect(() => {
    if (!showMapSelectModal) return;
    let cancelled = false;
    const mapKeys = [
      'favela',
      'praia',
      'centro_sp',
      'sertanejo',
      'pelourinho',
      'ponte_rio',
      'amazonia',
      'curitiba',
      'pantanal',
      'brasilia',
    ];
    for (const key of mapKeys) {
      if (!map3DCaptures[key]) {
        getOrRenderMapGameplayCapture(key)
          .then((url) => {
            if (!cancelled) {
              setMap3DCaptures((prev) => (prev[key] ? prev : { ...prev, [key]: url }));
            }
          })
          .catch(() => {});
      }
    }
    return () => {
      cancelled = true;
    };
  }, [showMapSelectModal]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [isPhotoSelectorOpen, setIsPhotoSelectorOpen] = useState(false);

  // Áudio & Tela Cheia
  const [soundMuted, setSoundMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Usuário e Moedas
  const [currentUser, setCurrentUser] = useState(() => storage.getCurrentUser());
  const [selectedProfilePhoto, setSelectedProfilePhoto] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('caramelo_profile_photo_url_v1') ||
        storage.getCurrentUser()?.profilePhotoUrl ||
        '/profile_photos/image_20261007_113048.jpg'
      );
    } catch {
      return '/profile_photos/image_20261007_113048.jpg';
    }
  });
  const [userCoins, setUserCoins] = useState(() => {
    const cu = storage.getCurrentUser();
    if (isInfiniteMoneyUser(cu)) return 999999999;
    return cu?.ossoCoins || 2500;
  });

  // Configurações Gráficas e de Controle
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>(() => {
    try {
      const saved = localStorage.getItem('caramelo_difficulty') as any;
      if (saved && ['easy', 'medium', 'hard', 'extreme'].includes(saved)) return saved;
    } catch {}
    return 'medium';
  });

  // Mapa 3D ativo: no modo extremo fica Inferno; ao desmarcar extremo volta para o mapa normal (praia ou favela/primeiro)!
  const active3DMapId: MapId =
    difficulty === 'extreme'
      ? 'inferno'
      : selectedMapId === 'inferno'
      ? (lastNormalMapIdRef.current || 'favela')
      : selectedMapId;

  const [graphicsPreset, setGraphicsPreset] = useState<'low' | 'medium' | 'high' | 'ultra'>(() => {
    try {
      const saved = localStorage.getItem('caramelo_graphics_preset') as any;
      if (saved && ['low', 'medium', 'high', 'ultra'].includes(saved)) return saved;
    } catch {}
    return 'high';
  });

  const [renderDistance, setRenderDistance] = useState<'low' | 'medium' | 'high'>(() => {
    try {
      const saved = localStorage.getItem('caramelo_render_distance') as any;
      if (saved && ['low', 'medium', 'high'].includes(saved)) return saved;
    } catch {}
    return 'medium';
  });

  const [fpsLimit, setFpsLimit] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('caramelo_fps_limit');
      if (saved !== null) return parseInt(saved, 10);
    } catch {}
    return 60;
  });

  const [showOnScreenControls, setShowOnScreenControls] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('caramelo_touch_controls');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  const [invertTouch, setInvertTouch] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('caramelo_invert_touch');
      if (saved !== null) return saved === 'true';
    } catch {}
    return false;
  });

  // Opacidade ajustável dos botões de controle na tela (Mobile Touch)
  const [touchControlsOpacity, setTouchControlsOpacity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('caramelo_touch_opacity');
      if (saved !== null) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.15 && val <= 1.0) return val;
      }
    } catch {}
    return 0.85;
  });

  // HUD
  const initialDifficultyLives = getInitialLivesForDifficulty(difficulty);
  const [hud, setHud] = useState<HudSnapshot>({
    score: 0,
    bestScore: storage.getCurrentUser()?.stats.maiorPontuacao || 0,
    coins: 0,
    distance: 0,
    hp: initialDifficultyLives,
    maxHp: initialDifficultyLives,
    combo: 0,
    speed: 13.5,
    housesPassed: 0,
    leftHouseId: 1,
    leftHouseName: 'Casas Brasileiras',
    rightHouseId: 2,
    rightHouseName: 'Sobrado Tropical',
  });

  useEffect(() => {
    const livesForDiff = getInitialLivesForDifficulty(difficulty);
    prevHpRef.current = livesForDiff;
    if (gameState === 'IDLE') {
      setHud((prev) => ({
        ...prev,
        hp: livesForDiff,
        maxHp: livesForDiff,
      }));
    }
  }, [difficulty, gameState]);

  const [finalSummary, setFinalSummary] = useState<HudSnapshot | null>(null);
  const [gameOverImage, setGameOverImage] = useState<string | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [earnedRunMoney, setEarnedRunMoney] = useState<{
    n10: number;
    n50: number;
    n100: number;
    n200: number;
    total: number;
  }>({ n10: 0, n50: 0, n100: 0, n200: 0, total: 0 });

  const controlTriggerRef = useRef<{
    left: () => void;
    right: () => void;
    jump: () => void;
    roll: () => void;
    wheelie?: () => void;
    bite?: () => void;
    throwPizza?: () => void;
    setHoldLeft?: (down: boolean) => void;
    setHoldRight?: (down: boolean) => void;
    setHoldWheelie?: (down: boolean) => void;
  } | null>(null);

  const showQuickToast = useCallback((msg: string) => {
    setShareToast(msg);
    window.setTimeout(() => {
      setShareToast((cur) => (cur === msg ? null : cur));
    }, 3200);
  }, []);

  // Sincroniza usuário e storage
  useEffect(() => {
    const unsub = storage.subscribe(() => {
      const cu = storage.getCurrentUser();
      setCurrentUser(cu);
      if (cu?.ossoCoins !== undefined) {
        setUserCoins(cu.ossoCoins);
      }
    });
    return unsub;
  }, []);

  // Monitora fullscreen
  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const toggleFullscreen = () => {
    sound.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleHudUpdate = useCallback((snap: HudSnapshot) => {
    setHud(snap);
  }, []);

  useEffect(() => {
    return () => {
      if (seLascouTimerRef.current !== null) window.clearTimeout(seLascouTimerRef.current);
      if (lensSplashTimerRef.current !== null) window.clearTimeout(lensSplashTimerRef.current);
      if (lobbyExitTimerRef.current !== null) window.clearTimeout(lobbyExitTimerRef.current);
      if (blueFlashTimerRef.current !== null) window.clearTimeout(blueFlashTimerRef.current);
      if (biteBadgeTimerRef.current !== null) window.clearTimeout(biteBadgeTimerRef.current);
      if (dodgeBadgeTimerRef.current !== null) window.clearTimeout(dodgeBadgeTimerRef.current);
      if (pizzaBadgeTimerRef.current !== null) window.clearTimeout(pizzaBadgeTimerRef.current);
    };
  }, []);

  // Item 6: Animação de perda de vida (rachadura/impacto) e recuperação de vida (brilho/cruz)!
  useEffect(() => {
    if (hud.hp < prevHpRef.current) {
      setBrokenHeartIndex(hud.hp);
      const t = window.setTimeout(() => setBrokenHeartIndex(null), 650);
      prevHpRef.current = hud.hp;
      return () => window.clearTimeout(t);
    }
    if (hud.hp > prevHpRef.current) {
      setHealedHeartIndex(hud.hp - 1);
      const t = window.setTimeout(() => setHealedHeartIndex(null), 650);
      prevHpRef.current = hud.hp;
      return () => window.clearTimeout(t);
    }
    prevHpRef.current = hud.hp;
  }, [hud.hp]);

  // Items 7 & 8: Pop animado do Multiplicador de Combo (Modo Motoboy e Modo Caramelo) + Quebra de Combo SLASH!
  useEffect(() => {
    const nonce = hud.pickupComboNonce ?? 0;
    if (nonce <= 0 || nonce === lastPickupComboNonceRef.current) return;
    lastPickupComboNonceRef.current = nonce;
    setComboPopActive(true);
    const t = window.setTimeout(() => setComboPopActive(false), 320);
    return () => window.clearTimeout(t);
  }, [hud.pickupComboNonce]);

  useEffect(() => {
    const ev = hud.comboBreakEvent;
    if (!ev || ev.nonce <= 0 || ev.nonce === lastComboBreakNonceRef.current) return;
    lastComboBreakNonceRef.current = ev.nonce;
    setActiveComboBreak(ev);
    const t = window.setTimeout(() => {
      setActiveComboBreak((cur) => (cur?.nonce === ev.nonce ? null : cur));
    }, 880);
    return () => window.clearTimeout(t);
  }, [hud.comboBreakEvent]);

  // Item 8: Feedback visual de Entrega de Pizza Concluída + Pop no Contador de Pizzas (sem repetir)!
  useEffect(() => {
    const nonce = hud.lastPizzaDeliveredNonce ?? 0;
    if (nonce <= 0) {
      lastPizzaNonceRef.current = 0;
      return;
    }
    if (nonce === lastPizzaNonceRef.current) return;
    lastPizzaNonceRef.current = nonce;
    setPizzaCounterPop(true);
    const popTimer = window.setTimeout(() => setPizzaCounterPop(false), 450);

    const delivered = hud.pizzasDelivered ?? 1;
    const goal = hud.pizzaMissionGoal ?? 30;
    setDeliveryProgressPopup({ delivered, goal, id: nonce });
    if (deliveryProgressTimerRef.current !== null) window.clearTimeout(deliveryProgressTimerRef.current);
    deliveryProgressTimerRef.current = window.setTimeout(() => {
      setDeliveryProgressPopup(null);
      deliveryProgressTimerRef.current = null;
    }, 1800);

    if (pizzaBadgeTimerRef.current !== null) window.clearTimeout(pizzaBadgeTimerRef.current);
    setPizzaDeliveredBadge(nonce);
    pizzaBadgeTimerRef.current = window.setTimeout(() => {
      setPizzaDeliveredBadge(null);
      pizzaBadgeTimerRef.current = null;
    }, 1450);
    return () => window.clearTimeout(popTimer);
  }, [hud.lastPizzaDeliveredNonce, hud.pizzasDelivered, hud.pizzaMissionGoal]);

  // Item 3 & Item 10: Piscar rapidamente em azul no acerto da mordida + badge de precisão (-2 Corações no acerto central)!
  useEffect(() => {
    const res = hud.biteLastResult;
    if (!res) return;
    if (res.nonce <= 0) {
      lastBiteNonceRef.current = 0;
      return;
    }
    if (res.nonce === lastBiteNonceRef.current) return;
    lastBiteNonceRef.current = res.nonce;

    const q = res.quality;
    if (q === 'perfect' || q === 'good' || q === 'weak') {
      if (blueFlashTimerRef.current !== null) window.clearTimeout(blueFlashTimerRef.current);
      setBlueHitFlash({ id: Date.now(), quality: q });
      blueFlashTimerRef.current = window.setTimeout(() => {
        setBlueHitFlash(null);
        blueFlashTimerRef.current = null;
      }, 310);
    }

    const labelMap: Record<'perfect' | 'good' | 'weak' | 'miss', string> = {
      perfect: '🎯 MORDIDA PERFEITA! -2 CORAÇÕES NO MOTOBOY!',
      good: '⚡ BOA MORDIDA! -1 CORAÇÃO NO MOTOBOY!',
      weak: '🦷 PEGOU DE RASPÃO! -1 CORAÇÃO!',
      miss: '💨 ERROU O TEMPO! MOTOBOY ESCAPOU!',
    };
    if (biteBadgeTimerRef.current !== null) window.clearTimeout(biteBadgeTimerRef.current);
    setBiteFeedbackBadge({ id: Date.now(), text: labelMap[q], tone: q });
    biteBadgeTimerRef.current = window.setTimeout(() => {
      setBiteFeedbackBadge(null);
      biteBadgeTimerRef.current = null;
    }, 1350);
  }, [hud.biteLastResult]);

  // Item 5: Feedback visual satisfatório ao esquivar da faixa vermelha do Caramelo!
  useEffect(() => {
    const nonce = hud.dodgeSuccessNonce ?? 0;
    if (nonce <= 0 || nonce === lastDodgeNonceRef.current) return;
    lastDodgeNonceRef.current = nonce;
    if (dodgeBadgeTimerRef.current !== null) window.clearTimeout(dodgeBadgeTimerRef.current);
    setDodgeFeedbackBadge(Date.now());
    dodgeBadgeTimerRef.current = window.setTimeout(() => {
      setDodgeFeedbackBadge(null);
      dodgeBadgeTimerRef.current = null;
    }, 1350);
  }, [hud.dodgeSuccessNonce]);

  // Item 2 & 7: Efeito vermelho rápido na tela durante a mordida ou ataque de lava indicando o dano recebido!
  useEffect(() => {
    const nonce = hud.damageScreenFlashNonce ?? 0;
    if (nonce <= 0) {
      lastDamageFlashNonceRef.current = 0;
      return;
    }
    if (nonce === lastDamageFlashNonceRef.current) return;
    lastDamageFlashNonceRef.current = nonce;
    if (redDamageFlashTimerRef.current !== null) window.clearTimeout(redDamageFlashTimerRef.current);
    setRedDamageFlash(Date.now());
    redDamageFlashTimerRef.current = window.setTimeout(() => {
      setRedDamageFlash(null);
      redDamageFlashTimerRef.current = null;
    }, 340);
  }, [hud.damageScreenFlashNonce]);

  // Item 9: Notificação sobrenatural quando uma alma fantasma é libertada ao receber pizza no Inferno!
  useEffect(() => {
    const nonce = hud.soulLiberatedNonce ?? 0;
    if (nonce <= 0) {
      lastSoulLiberatedNonceRef.current = 0;
      return;
    }
    if (nonce === lastSoulLiberatedNonceRef.current) return;
    lastSoulLiberatedNonceRef.current = nonce;
    if (soulLiberatedTimerRef.current !== null) window.clearTimeout(soulLiberatedTimerRef.current);
    setSoulLiberatedBadge(Date.now());
    soulLiberatedTimerRef.current = window.setTimeout(() => {
      setSoulLiberatedBadge(null);
      soulLiberatedTimerRef.current = null;
    }, 2200);
  }, [hud.soulLiberatedNonce]);

  // Animação letra por letra (Typewriter) + Voz de Monstro (Character Chatter / Gibberish Voice) no modal do Modo Extremo!
  const EXTREME_DEVIL_SPEECH = 'AÍ, VACILÃO! VOCÊ TEM ESSA CORAGEM MESMO DE SEGUIR?';
  useEffect(() => {
    if (!showExtremeConfirmModal) {
      setExtremeTypedChars(0);
      return;
    }
    setExtremeTypedChars(0);
    sound.playMonsterIntroGrowl();

    let currentIdx = 0;
    let timeoutId: number | null = null;
    let cancelled = false;

    const stepChar = () => {
      if (cancelled) return;
      currentIdx += 1;
      setExtremeTypedChars(currentIdx);
      const ch = EXTREME_DEVIL_SPEECH[currentIdx - 1] || '';
      if (ch.trim().length > 0 && ch !== ',') {
        sound.playMonsterChatterBlip(currentIdx, ch);
      }
      if (currentIdx < EXTREME_DEVIL_SPEECH.length) {
        const delay = ch === '!' || ch === ',' ? 145 : ch === ' ' ? 26 : 42;
        timeoutId = window.setTimeout(stepChar, delay);
      }
    };

    timeoutId = window.setTimeout(stepChar, 220);
    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [showExtremeConfirmModal]);

  const handleGameOver = useCallback((finalSnap: HudSnapshot, crashVehicleName?: string) => {
    const upperReason = (crashVehicleName || '').toUpperCase();
    const missionFlag = upperReason.includes('MISSÃO CONCLUÍDA');
    const victoryFlag = missionFlag || upperReason.includes('VITÓRIA');

    setIsMissionCompletedVictory(missionFlag);
    setIsRunVictory(victoryFlag);
    // Mostra primeiro o Painel de Vitória ou Painel de Derrota; ao clicar em PRÓXIMO abre a Tela de Records!
    setGameOverPanelTab('vitorias');
    setShowGameOverPhotoShare(false);
    setFinalSummary(finalSnap);
    setGameOverImage(getNextGameOverImage());

    // Item 13: Avalia progresso competitivo da partida (Troféus, Missões e Subida de Patente)
    try {
      const sbRun = streetBillsRef.current;
      const runMoneyTotal = sbRun.n10 * 10 + sbRun.n50 * 50 + sbRun.n100 * 100 + sbRun.n200 * 200;
      const rankRes = evaluateMatchCompetitiveProgress(rankingState, {
        mode: playMode,
        isVictory: victoryFlag,
        score: Math.floor(finalSnap.score),
        distance: Math.floor(finalSnap.distance),
        hpLeft: finalSnap.hp ?? 0,
        pizzasDelivered: finalSnap.pizzasDelivered ?? 0,
        dodgeCount: Math.max(0, Math.floor((finalSnap.dodgeSuccessNonce ?? 0) > 0 ? 2 : 0)),
        cashEarnedInRun: runMoneyTotal,
        maxPickupCombo: Math.max(finalSnap.combo ?? 0, finalSnap.pickupComboCount ?? 0),
        bonesCollected: finalSnap.bonesCollected ?? 0,
        bitesLanded: Math.max(0, 10 - (finalSnap.targetMotoboyHp ?? 10)),
        motoboysDefeated: finalSnap.motoboysDefeated ?? (victoryFlag && playMode === 'caramelo' ? 1 : 0),
      });
      setRankingState(rankRes.nextState);
      setMatchRankReport({
        trophiesDelta: rankRes.report.trophiesDelta,
        promotedTo: rankRes.report.promotedTo,
        completedMissionIds: rankRes.report.completedMissionIds,
      });
    } catch {}
    setGameOverReason(
      missionFlag
        ? '🍕 MISSÃO CONCLUÍDA! TODAS AS PIZZAS ENTREGUES & FUGA DO CARAMELO!'
        : victoryFlag
        ? '🏆 MOTOBOY CAPTURADO PELO CARAMELO!'
        : crashVehicleName
        ? `FIM DE ROTA: ${crashVehicleName.toUpperCase()}`
        : 'ACIDENTE NA CONTRAMÃO DA VILA!',
    );

    if (victoryFlag) {
      confetti({ particleCount: 95, spread: 92, origin: { y: 0.55 } });
    }

    // Atualiza estatísticas persistentes do Novo Painel de Vitórias (Item 10)
    const runDelivered = finalSnap.pizzasDelivered ?? 0;
    setDeliveryMissionStats((prev) => {
      const nextTotal = prev.totalDeliveredAllTime + runDelivered;
      const nextBestRun = Math.max(prev.bestDeliveredInRun, runDelivered);
      const nextMissions = prev.missionsCompleted + (missionFlag ? 1 : 0);
      const nextBestPerf = Math.max(prev.bestPerformanceScore, Math.floor(finalSnap.score));
      try {
        localStorage.setItem('caramelo_total_pizzas_v1', String(nextTotal));
        localStorage.setItem('caramelo_best_pizzas_run_v1', String(nextBestRun));
        localStorage.setItem('caramelo_missions_done_v1', String(nextMissions));
        localStorage.setItem('caramelo_best_mission_score_v1', String(nextBestPerf));
      } catch {}
      return {
        totalDeliveredAllTime: nextTotal,
        bestDeliveredInRun: nextBestRun,
        missionsCompleted: nextMissions,
        bestPerformanceScore: nextBestPerf,
      };
    });

    // Item 7: Se o player morrer (!victoryFlag), perde metade (50%) do dinheiro coletado na partida para ser justo!
    const sb = streetBillsRef.current;
    const rawN10 = sb.n10 + (victoryFlag ? Math.max(1, finalSnap.coins + Math.floor(finalSnap.distance / 45)) : 0);
    const rawN50 = sb.n50 + (victoryFlag ? Math.floor(finalSnap.distance / 155) + Math.floor(finalSnap.combo / 4) : 0);
    const rawN100 = sb.n100 + (victoryFlag ? Math.floor(finalSnap.score / 950) + (missionFlag ? 3 : 0) : 0);
    const rawN200 = sb.n200 + (missionFlag ? 1 : 0);
    const rawTotal =
      rawN10 * 10 + rawN50 * 50 + rawN100 * 100 + rawN200 * 200 || streetCashCollectedRef.current;

    const n10 = victoryFlag ? rawN10 : Math.floor(rawN10 * 0.5);
    const n50 = victoryFlag ? rawN50 : Math.floor(rawN50 * 0.5);
    const n100 = victoryFlag ? rawN100 : Math.floor(rawN100 * 0.5);
    const n200 = victoryFlag ? rawN200 : Math.floor(rawN200 * 0.5);
    const total = victoryFlag ? rawTotal : Math.floor(rawTotal * 0.5);
    setEarnedRunMoney({ n10, n50, n100, n200, total });
    setRunCashCollected(0);

    // Transição dramática antes de abrir o Painel de Records / Painel de Vitórias
    if (seLascouTimerRef.current !== null) {
      window.clearTimeout(seLascouTimerRef.current);
    }
    setShowSeLascouTransition(true);
    seLascouTimerRef.current = window.setTimeout(() => {
      setShowSeLascouTransition(false);
      seLascouTimerRef.current = null;
    }, 1750);

    setPhase('gameover');

    try {
      const duracaoSegundos = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      storage.submitGameScore(
        Math.floor(finalSnap.score),
        finalSnap.combo,
        finalSnap.housesPassed,
        duracaoSegundos,
        { n10, n50, n100, n200 },
      );
      const cu = storage.getCurrentUser();
      setCurrentUser(cu);
      if (cu?.ossoCoins !== undefined) {
        setUserCoins(cu.ossoCoins);
      } else {
        setUserCoins((c) => c + total);
      }
    } catch (e) {
      console.warn('Erro ao salvar progresso:', e);
    }
  }, []);

  // 🎨 Gera um "Share Card" combinando a foto de Game Over + resultados da corrida
  const generateShareCardFile = useCallback(
    async (
      imgUrl: string,
      lines: string[],
      filename = 'caramelo_vila_tropical.jpg',
    ): Promise<File | null> => {
      try {
        let srcBlob: Blob;
        if (imgUrl.startsWith('data:')) {
          const [header, b64] = imgUrl.split(',');
          const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
          const bstr = atob(b64);
          const u8 = new Uint8Array(bstr.length);
          for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
          srcBlob = new Blob([u8], { type: mime });
        } else {
          const fullUrl = imgUrl.startsWith('http')
            ? imgUrl
            : `${window.location.origin}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
          srcBlob = await fetch(fullUrl).then((r) => r.blob());
        }

        const bmp = await createImageBitmap(srcBlob);
        const W = bmp.width || 600;
        const H = bmp.height || 600;
        const BANNER = Math.round(H * 0.24);

        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H + BANNER;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(0, 0, W, canvas.height);
        ctx.drawImage(bmp, 0, 0, W, H);

        ctx.fillStyle = 'rgba(18, 8, 3, 0.96)';
        ctx.fillRect(0, H, W, BANNER);

        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(0, H, W, 5);

        const fontSize = Math.max(15, Math.round(W / 23));
        const smallFontSize = Math.max(12, Math.round(W / 31));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const totalLines = lines.length;
        const lineH = BANNER / (totalLines + 1);
        lines.forEach((line, i) => {
          const isFirst = i === 0;
          ctx.font = `bold ${isFirst ? fontSize : smallFontSize}px 'Fredoka', 'Arial Rounded MT Bold', Arial, sans-serif`;
          ctx.fillStyle = isFirst ? '#fde047' : '#f3f4f6';
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = 4;
          ctx.fillText(line, W / 2, H + lineH * (i + 1), W - 24);
        });
        ctx.shadowBlur = 0;

        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob(res, 'image/jpeg', 0.93),
        );
        if (!blob) return null;
        return new File([blob], filename, { type: 'image/jpeg' });
      } catch (err) {
        console.warn('[ShareCard] Erro ao gerar card:', err);
        return null;
      }
    },
    [],
  );

  const downloadFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, []);

  const buildShareLinesAndText = useCallback(() => {
    const pts = Math.floor(finalSummary?.score || 0);
    const dist = Math.floor(finalSummary?.distance || 0);
    const spd = Math.round(finalSummary?.speed || 60);
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gamefy.net.br';
    const cardLines = [
      `🏍️ ${pts} PTS • ${dist}m • ${spd} km/h`,
      `${gameOverReason || 'VILA TROPICAL GRAU & MOTOS 3D'}`,
      `Jogue agora: ${shareUrl}`,
    ];
    const shareText = `💥 Fiz ${pts} pontos (${dist}m a ${spd} km/h) desviando na contramão no Vila Tropical Grau & Motos 3D! 🏍️🔥 Duvido bater meu recorde: ${shareUrl}`;
    return { cardLines, shareText, shareUrl };
  }, [finalSummary, gameOverReason]);

  const handleWhatsAppShare = useCallback(async () => {
    sound.playClick();
    const { cardLines, shareText } = buildShareLinesAndText();
    if (gameOverImage && navigator.share) {
      const card = await generateShareCardFile(gameOverImage, cardLines, 'caramelo_zap.jpg');
      if (card && navigator.canShare?.({ files: [card] })) {
        try {
          await navigator.share({ files: [card], text: shareText, title: 'Vila Tropical 3D' });
          return;
        } catch {}
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
    showQuickToast('📲 Abrindo WhatsApp para compartilhar!');
  }, [buildShareLinesAndText, gameOverImage, generateShareCardFile, showQuickToast]);

  const handleInstagramShare = useCallback(async () => {
    sound.playClick();
    const { cardLines, shareText } = buildShareLinesAndText();
    if (gameOverImage) {
      const card = await generateShareCardFile(gameOverImage, cardLines, 'caramelo_stories.jpg');
      if (card) {
        if (navigator.share && navigator.canShare?.({ files: [card] })) {
          try {
            await navigator.share({ files: [card], text: shareText, title: 'Stories Vila Tropical' });
            return;
          } catch {}
        }
        downloadFile(card);
        showQuickToast('📸 Card salvo! Publique nos Stories do Instagram!');
        return;
      }
    }
    showQuickToast('📸 Prepare seu print para os Stories!');
  }, [buildShareLinesAndText, downloadFile, gameOverImage, generateShareCardFile, showQuickToast]);

  const handleDownloadImage = useCallback(async () => {
    sound.playClick();
    const { cardLines } = buildShareLinesAndText();
    if (gameOverImage) {
      const card = await generateShareCardFile(gameOverImage, cardLines, 'selfie_quebrada_3d.jpg');
      if (card) {
        downloadFile(card);
        showQuickToast('📥 Foto com placar salva no seu dispositivo!');
        return;
      }
    }
    showQuickToast('⚠️ Não foi possível salvar a imagem.');
  }, [buildShareLinesAndText, downloadFile, gameOverImage, generateShareCardFile, showQuickToast]);

  const handleNativeShare = useCallback(async () => {
    sound.playClick();
    const { cardLines, shareText, shareUrl } = buildShareLinesAndText();
    if (gameOverImage && navigator.share) {
      const card = await generateShareCardFile(gameOverImage, cardLines, 'caramelo_share.jpg');
      try {
        if (card && navigator.canShare?.({ files: [card] })) {
          await navigator.share({ files: [card], title: 'Vila Tropical 3D', text: shareText });
          return;
        }
        await navigator.share({ title: 'Vila Tropical 3D', text: shareText, url: shareUrl });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareText);
      showQuickToast('🔗 Placar + Link copiados! Cole onde quiser!');
    } catch {
      showQuickToast('🔗 Compartilhe: ' + shareUrl);
    }
  }, [buildShareLinesAndText, gameOverImage, generateShareCardFile, showQuickToast]);

  const startGame = useCallback(
    (overrideMapId?: MapId) => {
      const targetMap = overrideMapId ?? selectedMapId;
      sound.setActiveMap(targetMap);
      sound.playClick();
      sound.startMusic(true);
    if (seLascouTimerRef.current !== null) {
      window.clearTimeout(seLascouTimerRef.current);
      seLascouTimerRef.current = null;
    }
    if (lobbyExitTimerRef.current !== null) {
      window.clearTimeout(lobbyExitTimerRef.current);
      lobbyExitTimerRef.current = null;
    }
    setShowSeLascouTransition(false);
    setIsRunVictory(false);
    setBlueHitFlash(null);
    setBiteFeedbackBadge(null);
    setDodgeFeedbackBadge(null);
    setPizzaDeliveredBadge(null);
    setDeliveryProgressPopup(null);
    lastBiteNonceRef.current = 0;
    lastDodgeNonceRef.current = 0;
    lastPizzaNonceRef.current = 0;
    startTimeRef.current = Date.now();
    streetCashCollectedRef.current = 0;
    streetBillsRef.current = { n10: 0, n50: 0, n100: 0, n200: 0 };
    setRunBills({ n10: 0, n50: 0, n100: 0, n200: 0 });
    setRunCashCollected(0);
    setFinalSummary(null);
    setShareToast(null);
    setCashPickupToast(null);
    setRunNonce((prev) => prev + 1);
    setLobbyExiting(true);
    setGameState('PLAYING');
    setPhase('playing');
    lobbyExitTimerRef.current = window.setTimeout(() => {
      setLobbyExiting(false);
      lobbyExitTimerRef.current = null;
    }, 260);
  }, [selectedMapId]);

  const beginMapLoadAndStart = useCallback(
    (targetMap: MapId) => {
      for (const tid of mapLoadTimersRef.current) {
        window.clearTimeout(tid);
      }
      mapLoadTimersRef.current = [];

      setSelectedMapId(targetMap);
      try {
        localStorage.setItem('caramelo_selected_map_id', targetMap);
      } catch {}
      sound.setActiveMap(targetMap);
      sound.playClick();
      setShowMapSelectModal(false);
      setShowSkinsModal(false);

      setMapLoadingState({
        active: true,
        progress: 18,
        stepLabel: 'CARREGANDO...',
        targetMapId: targetMap,
        fadingOut: false,
      });

      const t1 = window.setTimeout(() => {
        setMapLoadingState((prev) =>
          prev
            ? {
                ...prev,
                progress: 55,
                stepLabel: 'CARREGANDO...',
              }
            : null
        );
      }, 200);

      const t2 = window.setTimeout(() => {
        setMapLoadingState((prev) =>
          prev
            ? {
                ...prev,
                progress: 88,
                stepLabel: 'CARREGANDO...',
              }
            : null
        );
      }, 420);

      const t3 = window.setTimeout(() => {
        setMapLoadingState((prev) =>
          prev
            ? {
                ...prev,
                progress: 100,
                stepLabel: 'PRONTO!',
              }
            : null
        );
        startGame(targetMap);
      }, 640);

      const t4 = window.setTimeout(() => {
        setMapLoadingState((prev) => (prev ? { ...prev, fadingOut: true } : null));
      }, 880);

      const t5 = window.setTimeout(() => {
        setMapLoadingState(null);
      }, 1180);

      mapLoadTimersRef.current = [t1, t2, t3, t4, t5];
    },
    [startGame]
  );

  const restartRun = useCallback(() => {
    sound.playClick();
    sound.startMusic(false);
    if (seLascouTimerRef.current !== null) {
      window.clearTimeout(seLascouTimerRef.current);
      seLascouTimerRef.current = null;
    }
    setShowSeLascouTransition(false);
    setIsRunVictory(false);
    setBlueHitFlash(null);
    setBiteFeedbackBadge(null);
    setDodgeFeedbackBadge(null);
    setPizzaDeliveredBadge(null);
    setDeliveryProgressPopup(null);
    lastBiteNonceRef.current = 0;
    lastDodgeNonceRef.current = 0;
    lastPizzaNonceRef.current = 0;
    startTimeRef.current = Date.now();
    streetCashCollectedRef.current = 0;
    streetBillsRef.current = { n10: 0, n50: 0, n100: 0, n200: 0 };
    setRunBills({ n10: 0, n50: 0, n100: 0, n200: 0 });
    setRunCashCollected(0);
    setFinalSummary(null);
    setShareToast(null);
    setCashPickupToast(null);
    setRunNonce((prev) => prev + 1);
    setGameState('PLAYING');
    setPhase('playing');
  }, []);

  const handleCashCollected = useCallback((amount: number, denomination: CashDenomination) => {
    streetCashCollectedRef.current += amount;
    if (denomination === 10) streetBillsRef.current.n10 += 1;
    else if (denomination === 50) streetBillsRef.current.n50 += 1;
    else if (denomination === 100) streetBillsRef.current.n100 += 1;
    else if (denomination === 200) streetBillsRef.current.n200 += 1;

    setLastCashDenom(denomination);
    setRunBills({ ...streetBillsRef.current });
    setRunCashCollected((c) => c + amount);
    setCashPopActive(true);
    window.setTimeout(() => setCashPopActive(false), 360);

    const text =
      denomination === 200
        ? `💎 NOTA RARA +R$ 200!`
        : `💵 +R$ ${denomination}!`;
    const nextToast = { text, denom: denomination };
    setCashPickupToast(nextToast);
    window.setTimeout(() => {
      setCashPickupToast((cur) => (cur === nextToast ? null : cur));
    }, 1550);
  }, []);

  const handleBoneCollected = useCallback(
    (rewardCoins: number, kind: 'bone' | 'meat' | 'bite') => {
      streetCashCollectedRef.current += rewardCoins;
      if (rewardCoins >= 200) streetBillsRef.current.n200 += 1;
      else if (rewardCoins >= 100) streetBillsRef.current.n100 += 1;
      else if (rewardCoins >= 50) streetBillsRef.current.n50 += 1;
      else streetBillsRef.current.n10 += Math.max(1, Math.round(rewardCoins / 10));

      setRunBills({ ...streetBillsRef.current });
      setRunCashCollected((c) => c + rewardCoins);
      setCashPopActive(true);
      window.setTimeout(() => setCashPopActive(false), 320);

      if (kind === 'meat' || kind === 'bite') {
        const text =
          kind === 'meat'
            ? '🥩 CARNE! ESTAMINA 100% + TURBO!'
            : rewardCoins >= 200
            ? '🦷 MOTOBOY DERRUBADO! +R$ 260!'
            : '🦷 MORDIDA NAS PERNAS! +R$ 110!';
        const denom: CashDenomination =
          kind === 'meat' ? 50 : rewardCoins >= 200 ? 200 : 100;
        const nextToast = { text, denom };
        setCashPickupToast(nextToast);
        window.setTimeout(() => {
          setCashPickupToast((cur) => (cur === nextToast ? null : cur));
        }, 1650);
      }
    },
    [],
  );

  const [vehiclePassBlur, setVehiclePassBlur] = useState<{
    id: number;
    side: 'left' | 'right';
    intensity: number;
  } | null>(null);
  const vehiclePassBlurTimerRef = useRef<number | null>(null);

  const handleWaterJetSplash = useCallback((intensity: number) => {
    if (lensSplashTimerRef.current !== null) {
      window.clearTimeout(lensSplashTimerRef.current);
    }
    setLensSplash({ id: Date.now(), intensity: Math.min(1, Math.max(0.45, intensity)) });
    lensSplashTimerRef.current = window.setTimeout(() => {
      setLensSplash(null);
      lensSplashTimerRef.current = null;
    }, 1850);
  }, []);

  const handleVehiclePassBlur = useCallback((side: 'left' | 'right', intensity: number) => {
    if (vehiclePassBlurTimerRef.current !== null) {
      window.clearTimeout(vehiclePassBlurTimerRef.current);
    }
    setVehiclePassBlur({
      id: Date.now() + Math.random(),
      side,
      intensity: Math.min(1, Math.max(0.45, intensity)),
    });
    vehiclePassBlurTimerRef.current = window.setTimeout(() => {
      setVehiclePassBlur(null);
      vehiclePassBlurTimerRef.current = null;
    }, 390);
  }, []);

  const handleConfirmAbandon = useCallback(() => {
    sound.stopMusic();
    sound.startMenuMusic();
    if (streetCashCollectedRef.current > 0) {
      try {
        const cu = storage.getCurrentUser();
        if (cu) {
          storage.adjustUserCoins(cu.id, streetCashCollectedRef.current);
          const updated = storage.getCurrentUser();
          if (updated?.ossoCoins !== undefined) setUserCoins(updated.ossoCoins);
        } else {
          setUserCoins((c) => c + streetCashCollectedRef.current);
        }
      } catch {}
    }
    streetCashCollectedRef.current = 0;
    streetBillsRef.current = { n10: 0, n50: 0, n100: 0, n200: 0 };
    setRunBills({ n10: 0, n50: 0, n100: 0, n200: 0 });
    setRunCashCollected(0);
    setShowQuitConfirm(false);
    setGameState('IDLE');
    setPhase('title');
  }, []);

  const togglePause = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    sound.playClick();
    setPhase((prev) => (prev === 'playing' ? 'paused' : 'playing'));
  }, [gameState]);

  // Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'PLAYING') {
          togglePause();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, togglePause]);

  const handleSpendCoins = useCallback((amount: number): boolean => {
    const cu = storage.getCurrentUser();
    if (isInfiniteMoneyUser(cu)) {
      return true; // 👑 Dinheiro Infinito no modo ADM (Valdir, Kelvin, Gui)
    }
    if (userCoins < amount) return false;
    if (cu) {
      storage.adjustUserCoins(cu.id, -amount);
    }
    setUserCoins((c) => Math.max(0, c - amount));
    return true;
  }, [userCoins]);

  const showGarageBanner = useCallback((msg: string) => {
    setGarageStepBanner(msg);
    window.setTimeout(() => {
      setGarageStepBanner((cur) => (cur === msg ? null : cur));
    }, 4500);
  }, []);

  const triggerPurchaseDenied = useCallback((msg: string) => {
    sound.playCrash();
    setDeniedPurchaseFlash(msg);
    window.setTimeout(() => {
      setDeniedPurchaseFlash((cur) => (cur === msg ? null : cur));
    }, 2400);
  }, [sound]);

  // Ação de Equipar ou Comprar Moto -> Avança Automaticamente para Escolher o Personagem Motoboy!
  const handleEquipOrBuyMoto = (spec: MotorcycleSpec) => {
    sound.playClick();
    const isUnlocked = !spec.price || unlockedMotoIds.includes(spec.id);

    const proceedToMotoboyStep = (motoName: string) => {
      setPlayMode('moto');
      savePlayMode('moto');
      setSelectedGarageMotoboyId(equippedMotoboyId);
      setGarageSection('motoboys');
      showGarageBanner(`🏍️ ${motoName} equipada! Agora escolha seu Personagem Motoboy!`);
    };

    if (isUnlocked) {
      setEquippedMotoId(spec.id);
      saveEquippedMotoId(spec.id);
      proceedToMotoboyStep(spec.name);
    } else {
      if (handleSpendCoins(spec.price)) {
        const next = [...unlockedMotoIds, spec.id];
        setUnlockedMotoIds(next);
        saveUnlockedMotoIds(next);
        setEquippedMotoId(spec.id);
        saveEquippedMotoId(spec.id);
        proceedToMotoboyStep(spec.name);
      } else {
        triggerPurchaseDenied(
          `🚨 TÁ LISO! Faltam R$ ${Math.max(0, spec.price - userCoins).toLocaleString('pt-BR')} para comprar a ${spec.name}!`,
        );
      }
    }
  };

  // Ação de Escolher / Comprar / Confirmar o Personagem Motoboy
  const handleConfirmMotoboy = (mbSpec: MotoboySpec) => {
    sound.playClick();
    const isUnlocked = !mbSpec.price || unlockedMotoboyIds.includes(mbSpec.id);
    if (isUnlocked) {
      setEquippedMotoboyId(mbSpec.id);
      saveMotoboyId(mbSpec.id);
      setPlayMode('moto');
      savePlayMode('moto');
      showGarageBanner(`🧑‍🚀 ${mbSpec.name} pronto no guidão com caixote! O Caramelo vai correr atrás!`);
    } else {
      if (handleSpendCoins(mbSpec.price)) {
        const next = [...unlockedMotoboyIds, mbSpec.id];
        setUnlockedMotoboyIds(next);
        saveUnlockedMotoboyIds(next);
        setEquippedMotoboyId(mbSpec.id);
        saveMotoboyId(mbSpec.id);
        setPlayMode('moto');
        savePlayMode('moto');
        showGarageBanner(`🧑‍🚀 ${mbSpec.name} desbloqueado e equipado na moto!`);
      } else {
        triggerPurchaseDenied(
          `🚨 COMPRA NEGADA! Faltam R$ ${Math.max(0, mbSpec.price - userCoins).toLocaleString('pt-BR')} para liberar ${mbSpec.name}!`,
        );
      }
    }
  };

  // Ação de Equipar ou Comprar Caramelo na Esteira 3D
  const handleEquipOrBuyCaramelo = (dogSpec: CarameloSpec) => {
    sound.playClick();
    const isUnlocked = !dogSpec.price || unlockedCarameloIds.includes(dogSpec.id);

    if (isUnlocked) {
      setEquippedCarameloId(dogSpec.id);
      saveEquippedCarameloId(dogSpec.id);
      showGarageBanner(`🐕 ${dogSpec.name} equipado na pista!`);
    } else {
      if (handleSpendCoins(dogSpec.price)) {
        const next = [...unlockedCarameloIds, dogSpec.id];
        setUnlockedCarameloIds(next);
        saveUnlockedCarameloIds(next);
        setEquippedCarameloId(dogSpec.id);
        saveEquippedCarameloId(dogSpec.id);
        showGarageBanner(`🐕 ${dogSpec.name} desbloqueado e equipado!`);
      } else {
        triggerPurchaseDenied(
          `🚨 SALDO INSUFICIENTE! Faltam R$ ${Math.max(0, dogSpec.price - userCoins).toLocaleString('pt-BR')} para liberar ${dogSpec.name}!`,
        );
      }
    }
  };

  const handleSwitchPlayMode = (nextMode: PlayMode) => {
    sound.playClick();
    setPlayMode(nextMode);
    savePlayMode(nextMode);
  };

  const selectedSpec = getMotoSpecById(selectedGarageMotoId);
  const equippedSpec = getMotoSpecById(equippedMotoId);
  const selectedMotoboySpec = getMotoboySpecById(selectedGarageMotoboyId);
  const equippedMotoboySpec = getMotoboySpecById(equippedMotoboyId);
  const selectedCarameloSpec = getCarameloSpecById(selectedGarageCarameloId);
  const equippedCarameloSpec = getCarameloSpecById(equippedCarameloId);

  // Atributos visuais de Game Design calculados a partir da cilindrada e categoria
  const getMotoVisualStats = (spec: MotorcycleSpec) => {
    const ccNorm = Math.min(1, Math.max(0.28, Math.pow(spec.displacementCc / 1000, 0.42)));
    const isTrailOrStreet =
      spec.category.includes('Trail') ||
      spec.category.includes('Street') ||
      spec.category.includes('Cub') ||
      spec.category.includes('Rally');
    const speedPct = Math.round(48 + ccNorm * 50);
    const accelPct = Math.round(52 + ccNorm * 45);
    const grauPct = Math.min(99, Math.round((isTrailOrStreet ? 88 : 74) + (1 - ccNorm * 0.3) * 10));
    return { speedPct, accelPct, grauPct };
  };

  const selectedStats = getMotoVisualStats(selectedSpec);

  // Lista única com TODAS as 20 motos (sem sub-filtros de categorias)
  const filteredMotos = MOTORCYCLES_CATALOG;

  const cycleGarageMoto = (dir: -1 | 1) => {
    if (filteredMotos.length === 0) return;
    sound.playClick();
    const idx = filteredMotos.findIndex((m) => m.id === selectedGarageMotoId);
    const cur = idx >= 0 ? idx : 0;
    const nextIdx = (cur + dir + filteredMotos.length) % filteredMotos.length;
    setSelectedGarageMotoId(filteredMotos[nextIdx].id);
  };

  const cycleGarageMotoboy = (dir: -1 | 1 = 1) => {
    sound.playClick();
    const idx = MOTOBOYS_CATALOG.findIndex((m) => m.id === selectedGarageMotoboyId);
    const cur = idx >= 0 ? idx : 0;
    const nextIdx = (cur + dir + MOTOBOYS_CATALOG.length) % MOTOBOYS_CATALOG.length;
    const nextSpec = MOTOBOYS_CATALOG[nextIdx];
    setSelectedGarageMotoboyId(nextSpec.id);
    if (!nextSpec.price || unlockedMotoboyIds.includes(nextSpec.id)) {
      setEquippedMotoboyId(nextSpec.id);
      saveMotoboyId(nextSpec.id);
      setPlayMode('moto');
      savePlayMode('moto');
    }
  };

  const cycleGarageCaramelo = (dir: -1 | 1) => {
    sound.playClick();
    const idx = CARAMELO_CATALOG.findIndex((c) => c.id === selectedGarageCarameloId);
    const cur = idx >= 0 ? idx : 0;
    const nextIdx = (cur + dir + CARAMELO_CATALOG.length) % CARAMELO_CATALOG.length;
    setSelectedGarageCarameloId(CARAMELO_CATALOG[nextIdx].id);
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden select-none bg-gradient-to-b from-[#1e293b] via-[#3b1d0e] to-[#120804] font-sans">
      {/* 3D WebGL Canvas Vila Tropical com Ciclo Dia/Noite + Aurora Boreal, Moto/Motoboy e Caramelos Cartoon */}
      <RunnerCanvas
        phase={gameState === 'IDLE' ? 'title' : phase}
        mapId={active3DMapId}
        skyPreset={skyPreset}
        inspectedHouseId={null}
        runNonce={runNonce}
        equippedMotoId={equippedMotoId}
        equippedMotoboyId={equippedMotoboyId}
        equippedCarameloId={equippedCarameloId}
        playMode={playMode}
        graphicsPreset={graphicsPreset}
        renderDistance={renderDistance}
        fpsLimit={fpsLimit}
        difficulty={difficulty}
        onHudUpdate={handleHudUpdate}
        onCashCollected={handleCashCollected}
        onBoneCollected={handleBoneCollected}
        onWaterJetSplash={handleWaterJetSplash}
        onVehiclePassBlur={handleVehiclePassBlur}
        onGameOver={handleGameOver}
        onSceneReady={() => setIsSceneReady(true)}
        onIntroCutsceneChange={setIsIntroCutsceneActive}
        controlTriggerRef={controlTriggerRef}
      />

      {/* =========================================================================
          1. MENU INTERATIVO INICIAL (LOBBY / IDLE SCREEN EM MADEIRA ENTALHADA 3D)
          ========================================================================= */}
      <style>{`
        @keyframes cartoonMenuBandIn {
          0% { opacity: 0; transform: translateY(14px) scale(0.975); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cartoonMenuExitGlide {
          0% { opacity: 1; transform: scale(1); filter: blur(0px); }
          100% { opacity: 0; transform: scale(1.045); filter: blur(4px); }
        }
        @keyframes blueBiteFlashAnim {
          0% { opacity: 0.92; }
          35% { opacity: 0.72; }
          100% { opacity: 0; }
        }
        @keyframes vehiclePassMotionBlurAnim {
          0% { opacity: 0; transform: scaleX(0.92) scaleY(1.02); }
          22% { opacity: 1; transform: scaleX(1.0) scaleY(1.06); }
          100% { opacity: 0; transform: scaleX(1.08) scaleY(1.14); }
        }
        @keyframes vehicleSpeedLineRush {
          0% { opacity: 0; transform: translateY(-28%) scaleY(0.45); }
          25% { opacity: 0.95; transform: translateY(12%) scaleY(1.25); }
          100% { opacity: 0; transform: translateY(95%) scaleY(1.65); }
        }
        @keyframes redDamageScreenFlashAnim {
          0% { opacity: 0.95; }
          40% { opacity: 0.72; }
          100% { opacity: 0; }
        }
        @keyframes extremeSpiralSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.08); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes extremeReverseSpiralSpin {
          0% { transform: rotate(360deg) scale(1.05); }
          50% { transform: rotate(180deg) scale(0.95); }
          100% { transform: rotate(0deg) scale(1.05); }
        }
        @keyframes sinisterDevilSway {
          0%, 100% { transform: translateX(-8px) rotate(-3.2deg) scale(1.02); }
          50% { transform: translateX(8px) rotate(3.2deg) scale(1.05); }
        }
        @keyframes infernoEmberRise {
          0% { transform: translateY(20px) scale(0.6); opacity: 0; }
          30% { opacity: 0.95; }
          100% { transform: translateY(-160px) scale(1.25); opacity: 0; }
        }
        @keyframes infernoHeatDistort {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1) skewX(0deg); }
          25% { transform: translate3d(-0.8px, -0.6px, 0) scale(1.006) skewX(0.4deg); }
          50% { transform: translate3d(0.8px, 0.4px, 0) scale(1.003) skewX(-0.35deg); }
          75% { transform: translate3d(0.4px, -0.8px, 0) scale(1.008) skewX(0.25deg); }
        }
        @keyframes infernoCardGlow {
          0%, 100% {
            box-shadow: 0 0 16px rgba(239, 68, 68, 0.45), 0 8px 24px rgba(0, 0, 0, 0.85);
          }
          50% {
            box-shadow: 0 0 28px rgba(239, 68, 68, 0.82), 0 8px 28px rgba(0, 0, 0, 0.95);
          }
        }
      `}</style>
      <CartoonSpiralTransition active={menuIntroSpiralPhase !== null} phase="in" />

      {(gameState === 'IDLE' || lobbyExiting) && (
        <div
          style={{
            animation: lobbyExiting
              ? 'cartoonMenuExitGlide 240ms cubic-bezier(0.4, 0, 1, 1) forwards'
              : undefined,
          }}
          className={`absolute inset-0 z-30 flex flex-col items-center justify-between p-2.5 sm:p-5 text-center overflow-hidden pointer-events-none ${
            lobbyExiting ? 'pointer-events-none' : ''
          }`}
        >
          {difficulty === 'extreme' ? (
            <div className="absolute inset-0 pointer-events-none overflow-hidden transition-all duration-500 will-change-transform">
              {/* Atmosfera Carmesim Vulcânica Otimizada (CSS Puro sem sobrecarga de GPU) */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 38%, rgba(185, 28, 28, 0.45) 0%, rgba(127, 29, 29, 0.72) 48%, rgba(20, 3, 3, 0.95) 100%)',
                }}
              />
              {/* Ondas Sutis de Calor e Brasa na Base */}
              <div
                className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#dc2626]/42 via-[#b91c1c]/20 to-transparent"
                style={{
                  animation: 'infernoHeatDistort 3.8s ease-in-out infinite',
                }}
              />
              {/* Vinheta Superior Escura para Destacar Textos e HUD */}
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/30 to-transparent" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/35 pointer-events-none transition-all duration-500" />
          )}

          {/* TOP BAR INTERATIVA MAIS ORGANIZADA: ESQUERDA (BOTÕES + PAINEL DE MEDALHAS AMPLIADO) | DIREITA (PAINEL COMPACTO SÓ FOTO MAIOR E NOME + MOEDAS EMBAIXO FORA DO PAINEL) */}
          <div
            style={{
              animation: !lobbyExiting
                ? 'cartoonMenuBandIn 280ms cubic-bezier(0.22, 1, 0.36, 1) both'
                : undefined,
            }}
            className={`relative z-20 w-full max-w-6xl flex items-start justify-between gap-2 pt-0.5 sm:pt-1 px-1 sm:px-2 ${
              lobbyExiting ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            {/* Lado Esquerdo: Botões Rápidos no Topo + Painel de Medalhas Reorganizado com Medalha Principal Muito Maior */}
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {onBackToMenu && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      onBackToMenu();
                    }}
                    className="group relative p-1 rounded-xl cartoon-wood-board border-2 border-[#451a03] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    title="Início"
                  >
                    <SteelCornerBrackets size="sm" />
                    <div className="px-3 sm:px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#d97706] border border-[#fef08a] shadow-[inset_0_2px_0_rgba(255,255,255,0.65)] flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-[#2e1005] fill-[#2e1005] stroke-[2.5]" />
                      <span className="font-fun font-black text-xs sm:text-sm text-[#2e1005] tracking-wide uppercase">
                        INÍCIO
                      </span>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => {
                    sound.playClick();
                    setShowMarketingModal(true);
                  }}
                  className="group relative p-1 rounded-xl cartoon-wood-board border-2 border-[#451a03] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                  title="Anúncios e Parcerias na Quebrada"
                >
                  <SteelCornerBrackets size="sm" />
                  <div className="px-3 sm:px-3.5 py-1.5 rounded-lg bg-gradient-to-b from-[#c084fc] via-[#9333ea] to-[#6b21a8] border border-[#e9d5ff] shadow-[inset_0_2px_0_rgba(255,255,255,0.55)] flex items-center gap-1.5">
                    <Megaphone className="w-4 h-4 text-white stroke-[2.5] drop-shadow" />
                    <span className="font-fun font-black text-xs sm:text-sm text-white tracking-wide uppercase cartoon-text-outline">
                      ANÚNCIOS
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    const isEnabled = sound.toggleMute(true);
                    setSoundMuted(!isEnabled);
                  }}
                  title={soundMuted ? 'Ativar Som' : 'Desligar Som'}
                  className="group relative p-1 rounded-xl cartoon-wood-board border-2 border-[#451a03] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                >
                  <SteelCornerBrackets size="sm" />
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg cartoon-wood-inset flex items-center justify-center">
                    {soundMuted ? (
                      <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200/60" />
                    ) : (
                      <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#fde047] fill-[#fde047] drop-shadow" />
                    )}
                  </div>
                </button>

                <button
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia'}
                  className="group relative p-1 rounded-xl cartoon-wood-board border-2 border-[#451a03] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                >
                  <SteelCornerBrackets size="sm" />
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg cartoon-wood-inset flex items-center justify-center">
                    {isFullscreen ? (
                      <Minimize className="w-4 h-4 sm:w-5 sm:h-5 text-[#fde047] stroke-[2.8]" />
                    ) : (
                      <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-[#fde047] stroke-[2.8]" />
                    )}
                  </div>
                </button>
              </div>

              {/* ITEM 1: PAINEL DE MEDALHAS REORGANIZADO COM MEDALHA PRINCIPAL CONSIDERAVELMENTE MAIOR E MAIS DESTACADA */}
              {(() => {
                const curRank = getRankTierByTrophies(rankingState.trophies);
                const rankProg = getRankProgressInfo(rankingState.trophies);
                const claimableCount = rankingState.missions.filter(
                  (m: CompetitiveMission) => m.progress >= m.target && !m.claimed
                ).length;
                const emblemUrl = rankEmblemSprites[curRank.index];
                const isExtremeTheme = difficulty === 'extreme';
                return (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setShowRankingModal(true);
                    }}
                    className={`group relative p-1 rounded-2xl border-2 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-[0_8px_22px_rgba(0,0,0,0.85)] ${
                      isExtremeTheme
                        ? 'bg-[#2a0707] border-[#ef4444]'
                        : 'bg-[#3b1c0c] border-[#fbbf24]'
                    }`}
                    title="Abrir Ranking Oficial, 8 Patentes, Missões e Top Jogadores"
                  >
                    <SteelCornerBrackets size="sm" />
                    <div
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl border shadow-inner ${
                        isExtremeTheme
                          ? 'bg-gradient-to-r from-[#1c0404] via-[#360808] to-[#140202] border-[#f87171]/65'
                          : 'bg-gradient-to-r from-[#1f0e06] via-[#2e1509] to-[#1a0b04] border-[#fde047]/65'
                      }`}
                    >
                      {/* MEDALHA PRINCIPAL CONSIDERAVELMENTE AUMENTADA COM FORTE DESTAQUE VISUAL */}
                      <div
                        onClick={(e) => {
                          if (emblemUrl) {
                            e.stopPropagation();
                            sound.playClick();
                            setFullscreenImageModal({
                              url: emblemUrl,
                              title: `Patente ${curRank.index + 1}: ${curRank.name}`,
                              subtitle: `${curRank.subtitle} • 🏆 ${rankingState.trophies} Troféus`,
                            });
                          }
                        }}
                        title="Clique na medalha para ampliar em Tela Cheia"
                        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-[#45210c] via-[#1f0d05] to-[#090401] border-[2.5px] flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:brightness-110 transition-all ${
                          isExtremeTheme
                            ? 'border-[#ef4444] shadow-[0_0_18px_rgba(239,68,68,0.6)]'
                            : 'border-[#fde047] shadow-[0_0_18px_rgba(251,191,36,0.55)]'
                        }`}
                      >
                        <div
                          className="absolute inset-0 pointer-events-none opacity-60"
                          style={{
                            background: isExtremeTheme
                              ? 'radial-gradient(circle at 50% 42%, rgba(248,113,113,0.65) 0%, transparent 72%)'
                              : 'radial-gradient(circle at 50% 42%, rgba(253,224,71,0.65) 0%, transparent 72%)',
                          }}
                        />
                        {emblemUrl ? (
                          <img
                            src={emblemUrl}
                            alt={curRank.name}
                            className="relative z-10 w-full h-full object-contain scale-[1.46] group-hover:scale-[1.55] transition-transform drop-shadow-[0_4px_7px_rgba(0,0,0,0.9)]"
                            draggable={false}
                          />
                        ) : (
                          <Trophy className="relative z-10 w-10 h-10 text-[#fde047] drop-shadow" />
                        )}
                      </div>

                      {/* ELEMENTOS DO PAINEL ORGANIZADOS COM HIERARQUIA CLARA */}
                      <div className="flex flex-col items-start justify-center min-w-[148px] sm:min-w-[172px] gap-1.5">
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="flex flex-col items-start leading-none">
                            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-amber-300/80">
                              PATENTE ATUAL
                            </span>
                            <span
                              className="text-sm sm:text-base font-fun font-black uppercase tracking-wider leading-tight whitespace-nowrap mt-0.5"
                              style={{
                                color: curRank.primaryColor,
                                paintOrder: 'stroke fill',
                                WebkitTextStroke: '2.6px #1f0901',
                                textShadow: '0 2px 0 #1f0901',
                              }}
                            >
                              {curRank.name}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/25 border border-[#fde047]/85 text-xs sm:text-sm font-mono font-black text-[#fde047] leading-none whitespace-nowrap shadow-sm">
                            🏆 {rankingState.trophies}
                          </span>
                        </div>

                        <div className="w-full h-2 rounded-full bg-black/90 border border-amber-400/55 overflow-hidden p-[1px]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 transition-all duration-300"
                            style={{ width: `${Math.max(8, rankProg.progressPercent)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between w-full gap-2 text-[9px] sm:text-[10px] font-black text-amber-200/95 uppercase leading-none">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/50 border border-amber-400/30 whitespace-nowrap">
                            🥇 RANKING
                          </span>
                          <span className="text-[#fde047] whitespace-nowrap">
                            {rankProg.nextTier
                              ? `FALTAM ${rankProg.trophiesNeededForNext} 🏆`
                              : 'PATENTE MÁXIMA 🏆'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {claimableCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 border-2 border-[#1f0901] text-[8.5px] font-black text-white uppercase shadow animate-bounce whitespace-nowrap">
                        +{claimableCount} MISSÃO!
                      </span>
                    )}
                  </button>
                );
              })()}
            </div>

            {/* Lado Direito: PAINEL DE PERFIL MENOR (SÓ NOME + FOTO DE PERFIL MAIOR) + FOCO NO DINHEIRO ABAIXO */}
            <div className="flex flex-col items-end gap-1.5">
              {/* 1. PAINEL DE PERFIL COMPACTO: APENAS FOTO DE PERFIL MAIOR + NOME DO JOGADOR */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsPhotoSelectorOpen(true);
                }}
                className="group relative p-1 rounded-2xl cartoon-wood-board border-2 border-[#451a03] shadow-[0_6px_18px_rgba(0,0,0,0.65)] cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
                title="Clique para trocar sua Foto de Perfil"
              >
                <SteelCornerBrackets size="sm" />
                <div className="flex items-center gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-xl cartoon-wood-inset border border-amber-500/45">
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-[2.5px] border-[#fde047] bg-gradient-to-b from-[#dc2626] to-[#7f1d1d] shadow-[0_3px_8px_rgba(0,0,0,0.75)] flex-shrink-0 group-hover:brightness-110 transition-all">
                    {(() => {
                      const rawPhoto =
                        selectedProfilePhoto ||
                        currentUser?.profilePhotoUrl ||
                        caramelo3DThumbs[equippedCarameloId] ||
                        '/profile_photos/image_20261007_113048.jpg';
                      const safePhotoSrc = rawPhoto.startsWith('data:')
                        ? rawPhoto
                        : encodeURI(rawPhoto);
                      return (
                        <img
                          src={safePhotoSrc}
                          alt={currentUser?.nickname || 'Jogador'}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      );
                    })()}
                  </div>
                  <div className="flex flex-col items-start text-left pr-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs sm:text-sm text-[#fef08a] uppercase font-fun font-black leading-none tracking-wide truncate max-w-[125px] sm:max-w-[150px]"
                        style={{
                          paintOrder: 'stroke fill',
                          WebkitTextStroke: '2.4px #1f0901',
                          textShadow: '0 1.5px 0 #1f0901',
                        }}
                      >
                        {currentUser?.nickname || 'Jogador'}
                      </span>
                      {isInfiniteMoneyUser(currentUser) && (
                        <span className="px-1.5 py-0.5 bg-amber-400 border border-[#1f0901] text-[#1f0901] rounded text-[8px] font-black uppercase tracking-wider leading-none shadow-sm">
                          ADM
                        </span>
                      )}
                    </div>
                    <span className="text-[8.5px] font-fun font-black uppercase text-amber-200/80 tracking-wider mt-0.5">
                      ✏️ TROCAR FOTO
                    </span>
                  </div>
                </div>
              </button>

              {/* 2. ABAIXO DO PAINEL DE PERFIL: FOCO TOTAL E LIMPO NO DINHEIRO (SEM 10x25, SEM OSSO COIN E SEM OSSOS) */}
              <div className="relative p-1 rounded-2xl cartoon-wood-board border-2 border-[#fbbf24] shadow-[0_8px_20px_rgba(0,0,0,0.8)]">
                <SteelCornerBrackets size="sm" />
                <div className="flex items-center gap-2.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#120804] via-[#1c0d06] to-[#120804] border border-[#4ade80]/70 shadow-inner">
                  {/* Ícone Cartoon de Maço de Dinheiro */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-b from-[#4ade80] to-[#15803d] border-2 border-[#052e16] flex items-center justify-center shadow flex-shrink-0">
                    <svg viewBox="0 0 36 28" className="w-5 h-4 drop-shadow-[0_1.5px_0_#052e16]">
                      <rect x="2" y="4" width="32" height="20" rx="3.5" fill="#22c55e" stroke="#052e16" strokeWidth="2.5" />
                      <rect x="5" y="7" width="26" height="14" rx="2" fill="#86efac" stroke="#14532d" strokeWidth="1.5" />
                      <circle cx="18" cy="14" r="4.5" fill="#15803d" />
                      <text x="18" y="17" textAnchor="middle" fill="#fef08a" fontSize="9" fontWeight="900">$</text>
                    </svg>
                  </div>
                  <div className="flex flex-col items-end leading-none">
                    <span className="text-[8px] sm:text-[9px] font-fun font-black uppercase text-amber-200/90 tracking-widest">
                      SALDO EM DINHEIRO
                    </span>
                    <span
                      className="text-base sm:text-xl font-fun font-black text-[#4ade80] tracking-wide mt-0.5"
                      style={{
                        paintOrder: 'stroke fill',
                        WebkitTextStroke: '3px #052e16',
                        textShadow: '0 2px 0 #052e16',
                      }}
                    >
                      {isInfiniteMoneyUser(currentUser)
                        ? 'R$ ∞'
                        : `R$ ${userCoins.toLocaleString('pt-BR')}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CENTRO LIMPO: APENAS ROSTO DO CARAMELO + NOME DO JOGO + BOTÃO COMEÇAR */}
          <div
            style={{
              animation: !lobbyExiting
                ? 'cartoonMenuBandIn 320ms cubic-bezier(0.22, 1, 0.36, 1) 55ms both'
                : undefined,
            }}
            className={`relative z-20 my-auto flex flex-col items-center gap-3.5 sm:gap-4 max-w-2xl w-full px-2 ${
              lobbyExiting ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            {/* PLACA LIMPA DE MADEIRA ENTALHADA (OU RUBI INFERNAL QUANDO EXTREMO ESTIVER ATIVO) */}
            <div
              className={`cartoon-hero-float relative cartoon-wood-board px-6 sm:px-10 py-3.5 sm:py-4.5 rounded-[28px] border-[3px] flex items-center justify-center transition-all duration-300 ${
                difficulty === 'extreme'
                  ? 'border-[#ef4444] shadow-[0_14px_38px_rgba(220,38,38,0.65)] ring-2 ring-red-500/45'
                  : 'border-[#f59e0b] shadow-[0_14px_34px_rgba(0,0,0,0.85)]'
              }`}
            >
              <SteelCornerBrackets size="md" />

              <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 leading-none">
                <div className="w-12 h-12 sm:w-15 sm:h-15 flex-shrink-0 drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">
                  <svg viewBox="0 0 64 64" className="w-full h-full">
                    {difficulty === 'extreme' && (
                      <>
                        {/* Chifres Demoníacos no Ícone do Menu quando EXTREMO está selecionado */}
                        <path
                          d="M21 18 C16 6, 9 8, 12 19 Z"
                          fill="#111827"
                          stroke="#ef4444"
                          strokeWidth="2.5"
                        />
                        <path
                          d="M43 18 C48 6, 55 8, 52 19 Z"
                          fill="#111827"
                          stroke="#ef4444"
                          strokeWidth="2.5"
                        />
                      </>
                    )}
                    <path
                      d="M15 24 C7 18, 5 31, 11 39 C14 42, 18 37, 18 30 Z"
                      fill={difficulty === 'extreme' ? '#7f1d1d' : '#92400e'}
                      stroke="#1f0901"
                      strokeWidth="3.2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M49 24 C57 18, 59 31, 53 39 C50 42, 46 37, 46 30 Z"
                      fill={difficulty === 'extreme' ? '#7f1d1d' : '#92400e'}
                      stroke="#1f0901"
                      strokeWidth="3.2"
                      strokeLinejoin="round"
                    />
                    <ellipse
                      cx="32"
                      cy="33"
                      rx="18.5"
                      ry="17.5"
                      fill={difficulty === 'extreme' ? '#dc2626' : '#f59e0b'}
                      stroke="#1f0901"
                      strokeWidth="3.5"
                    />
                    <ellipse
                      cx="32"
                      cy="39.5"
                      rx="11"
                      ry="8.5"
                      fill={difficulty === 'extreme' ? '#fca5a5' : '#fde68a'}
                      stroke="#1f0901"
                      strokeWidth="2.6"
                    />
                    <circle cx="24.5" cy="28.5" r="3.6" fill={difficulty === 'extreme' ? '#fef08a' : '#1f0901'} />
                    <circle cx="23.4" cy="27.3" r="1.3" fill={difficulty === 'extreme' ? '#dc2626' : '#ffffff'} />
                    <circle cx="39.5" cy="28.5" r="3.6" fill={difficulty === 'extreme' ? '#fef08a' : '#1f0901'} />
                    <circle cx="38.4" cy="27.3" r="1.3" fill={difficulty === 'extreme' ? '#dc2626' : '#ffffff'} />
                    <path
                      d="M20 22.5 Q24.5 20 28 22.5"
                      fill="none"
                      stroke="#451a03"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M36 22.5 Q39.5 20 44 22.5"
                      fill="none"
                      stroke="#451a03"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                    <ellipse cx="32" cy="36.5" rx="4.6" ry="3.2" fill="#1f0901" />
                    <ellipse cx="30.8" cy="35.6" rx="1.5" ry="0.9" fill="#ffffff" opacity="0.8" />
                    <path
                      d="M27.5 41.5 Q32 45 36.5 41.5"
                      fill="none"
                      stroke="#1f0901"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M29.5 43.2 Q32 49.5 34.5 43.2 Z"
                      fill="#fb7185"
                      stroke="#1f0901"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <h1 className="flex items-baseline gap-2 sm:gap-2.5">
                  <span
                    className={`font-fun font-black text-3xl sm:text-5xl md:text-[54px] tracking-tight uppercase leading-none ${
                      difficulty === 'extreme' ? 'text-[#ef4444]' : 'text-[#fde047]'
                    }`}
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: '5px #3b1304',
                      textShadow:
                        '0 3px 0 #3b1304, 0 6px 0 #1f0901, 0 10px 18px rgba(0,0,0,0.85)',
                    }}
                  >
                    CARAMELO
                  </span>
                  <span
                    className="font-fun font-black text-3xl sm:text-5xl md:text-[54px] tracking-tight text-white uppercase leading-none"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: '5px #3b1304',
                      textShadow:
                        '0 3px 0 #3b1304, 0 6px 0 #1f0901, 0 10px 18px rgba(0,0,0,0.85)',
                    }}
                  >
                    RUN
                  </span>
                </h1>
              </div>
            </div>

            {/* BOTÃO COMEÇAR SUPER DINÂMICO (NO MODO EXTREMO ABRE A TELA DE CONFIRMAÇÃO DO CARAMELO DIABO!) */}
            <button
              onClick={() => {
                sound.playClick();
                if (difficulty === 'extreme') {
                  setShowExtremeConfirmModal(true);
                } else {
                  setShowMapSelectModal(true);
                }
              }}
              className={`group relative p-2 sm:p-2.5 rounded-[28px] cartoon-wood-board cartoon-wood-start-btn border-[3px] cursor-pointer transition-all ${
                difficulty === 'extreme'
                  ? 'border-[#ef4444] shadow-[0_0_28px_rgba(239,68,68,0.65)]'
                  : 'border-[#fbbf24]'
              }`}
            >
              <SteelCornerBrackets size="md" />

              <div
                className={`relative overflow-hidden px-7 sm:px-11 py-3 sm:py-4 rounded-[20px] border-[3px] flex items-center justify-center gap-3.5 sm:gap-4 ${
                  difficulty === 'extreme'
                    ? 'bg-gradient-to-b from-[#ef4444] via-[#b91c1c] to-[#450a0a] border-[#fca5a5] shadow-[inset_0_3px_0_rgba(255,255,255,0.65),inset_0_-4px_0_rgba(24,4,4,0.9),0_4px_0_#1f0404]'
                    : 'bg-gradient-to-b from-[#4ade80] via-[#16a34a] to-[#15803d] border-[#bbf7d0] shadow-[inset_0_3px_0_rgba(255,255,255,0.75),inset_0_-4px_0_rgba(5,46,22,0.8),0_4px_0_#052e16]'
                }`}
              >
                <div className="cartoon-shine-bar" />

                <div className="relative w-11 h-11 sm:w-13 sm:h-13 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.65)] group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <svg viewBox="0 0 64 64" className="w-full h-full">
                    <polygon
                      points="20,4 44,4 60,20 60,44 44,60 20,60 4,44 4,20"
                      fill={difficulty === 'extreme' ? '#450a0a' : '#9a3412'}
                      stroke="#3b1304"
                      strokeWidth="4"
                    />
                    <polygon
                      points="22,9 42,9 55,22 55,42 42,55 22,55 9,42 9,22"
                      fill={difficulty === 'extreme' ? '#ef4444' : '#fbbf24'}
                      stroke="#78350f"
                      strokeWidth="2.5"
                    />
                    <polygon
                      points="25,19 46,32 25,45"
                      fill="#ffffff"
                      stroke="#3b1304"
                      strokeWidth="3.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="flex flex-col items-start text-left">
                  <span
                    className="font-fun font-black text-2xl sm:text-4xl tracking-wider text-white uppercase leading-none"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: difficulty === 'extreme' ? '4.5px #450a0a' : '4.5px #052e16',
                      textShadow:
                        difficulty === 'extreme'
                          ? '0 3px 0 #450a0a, 0 6px 10px rgba(0,0,0,0.85)'
                          : '0 3px 0 #052e16, 0 6px 10px rgba(0,0,0,0.75)',
                    }}
                  >
                    {difficulty === 'extreme' ? 'ENTRAR NO INFERNO' : 'COMEÇAR'}
                  </span>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#fef08a] cartoon-text-outline mt-0.5">
                    {difficulty === 'extreme'
                      ? '🔥 MAPA EXCLUSIVO INFERNO • CARAMELO DIABO!'
                      : playMode === 'caramelo'
                      ? `🐕 CORRIDA CARAMELO: ${equippedCarameloSpec.name.toUpperCase()}!`
                      : '🏍️ CORRIDA DE MOTO (+ CARAMELOS ATRÁS)!'}
                  </span>
                </div>

                <div className="hidden xs:flex items-center text-[#fef08a] group-hover:translate-x-1 transition-transform drop-shadow">
                  <Flame className="w-6 h-6 sm:w-7 sm:h-7 fill-[#fde047] text-[#3b1304] stroke-[2.2]" />
                </div>
              </div>
            </button>

            {/* SELETORES RÁPIDOS EM MADEIRA: MODO MOTO / MODO CARAMELO + DIFICULDADE (INCLUINDO EXTREMO — INFERNO!) */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="relative p-1.5 rounded-2xl cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.8)] flex items-center gap-1.5">
                <SteelCornerBrackets size="sm" />
                <button
                  type="button"
                  onClick={() => handleSwitchPlayMode('moto')}
                  className={`px-3 py-1.5 rounded-xl font-fun font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 text-[10px] sm:text-xs ${
                    playMode === 'moto'
                      ? 'cartoon-btn-gold ring-2 ring-amber-200 scale-105 shadow-md'
                      : 'cartoon-wood-inset text-amber-100/80 hover:text-white opacity-85 hover:opacity-100'
                  }`}
                >
                  <span>🏍️</span>
                  <span>MODO MOTO</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchPlayMode('caramelo')}
                  className={`px-3.5 py-1.5 rounded-xl font-fun font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 text-[10px] sm:text-xs ${
                    playMode === 'caramelo'
                      ? 'cartoon-btn-green ring-2 ring-emerald-300 scale-105 shadow-md'
                      : 'cartoon-wood-inset text-amber-100/80 hover:text-white opacity-85 hover:opacity-100'
                  }`}
                >
                  <span>🐕</span>
                  <span>MODO CARAMELO</span>
                </button>
              </div>

              {/* ITEM 4 & 5: Dificuldades Fácil (20 🍕) / Médio (40 🍕) / Difícil (90 🍕) / EXTREMO — INFERNO */}
              <div
                className={`relative p-1.5 rounded-2xl cartoon-wood-board border-2 shadow-[0_8px_20px_rgba(0,0,0,0.8)] flex items-center gap-1.5 flex-wrap justify-center ${
                  difficulty === 'extreme' ? 'border-[#ef4444]' : 'border-[#451a03]'
                }`}
              >
                <SteelCornerBrackets size="sm" />
                {(
                  [
                    {
                      id: 'easy',
                      label: 'FÁCIL',
                      sub: '20 🍕 • 10 ❤️',
                      activeClass: 'cartoon-btn-green ring-2 ring-emerald-300',
                    },
                    {
                      id: 'medium',
                      label: 'MÉDIO',
                      sub: '40 🍕 • 5 ❤️',
                      activeClass: 'cartoon-btn-gold ring-2 ring-amber-200',
                    },
                    {
                      id: 'hard',
                      label: 'DIFÍCIL',
                      sub: '90 🍕 • 4 ❤️',
                      activeClass: 'cartoon-btn-red ring-2 ring-rose-300',
                    },
                  ] as const
                ).map((mode) => {
                  const isSelected = difficulty === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        const wasExtreme = difficulty === 'extreme';
                        setDifficulty(mode.id);
                        if (selectedMapId === 'inferno') {
                          const fallback = lastNormalMapIdRef.current || 'favela';
                          setSelectedMapId(fallback);
                          try {
                            localStorage.setItem('caramelo_selected_map_id', fallback);
                          } catch {}
                        }
                        if (wasExtreme) {
                          sound.setMenuExtremeMode(false);
                        }
                        try {
                          localStorage.setItem('caramelo_difficulty', mode.id);
                        } catch {}
                      }}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-fun font-black uppercase transition-all cursor-pointer flex flex-col items-center leading-none ${
                        isSelected
                          ? `${mode.activeClass} scale-105 shadow-md`
                          : 'cartoon-wood-inset text-amber-100/80 hover:text-white opacity-85 hover:opacity-100'
                      }`}
                    >
                      <span className="text-[10px] sm:text-xs tracking-wider">{mode.label}</span>
                      <span
                        className={`text-[8px] sm:text-[9px] font-extrabold mt-0.5 ${
                          isSelected ? 'opacity-95' : 'text-amber-300/75'
                        }`}
                      >
                        {mode.sub}
                      </span>
                    </button>
                  );
                })}

                {/* BOTÃO EXCLUSIVO DO NOVO MODO EXTREMO — INFERNO (VERMELHO, PRETO, FOGO + ESPIRAIS GIRATÓRIAS SOBRENATURAIS ATRÁS DO ÍCONE!) */}
                {(() => {
                  const isExtreme = difficulty === 'extreme';
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        if (difficulty === 'extreme') {
                          setDifficulty('medium');
                          const fallback = lastNormalMapIdRef.current || 'favela';
                          setSelectedMapId(fallback);
                          sound.setMenuExtremeMode(false);
                          try {
                            localStorage.setItem('caramelo_difficulty', 'medium');
                            localStorage.setItem('caramelo_selected_map_id', fallback);
                          } catch {}
                        } else {
                          setDifficulty('extreme');
                          sound.setMenuExtremeMode(true);
                          try {
                            localStorage.setItem('caramelo_difficulty', 'extreme');
                          } catch {}
                        }
                      }}
                      className={`relative overflow-hidden px-3 sm:px-3.5 py-1.5 rounded-xl font-fun font-black uppercase transition-all cursor-pointer flex items-center gap-2 leading-none border-2 ${
                        isExtreme
                          ? 'bg-gradient-to-r from-[#090202] via-[#7f1d1d] to-[#dc2626] border-[#fde047] ring-2 ring-red-500 scale-105 shadow-[0_0_22px_rgba(239,68,68,0.85)] text-white'
                          : 'bg-gradient-to-r from-[#090202] via-[#2a0606] to-[#450a0a] border-[#dc2626]/80 text-red-200 hover:text-white hover:border-[#ef4444]'
                      }`}
                    >
                      {/* Ícone Exclusivo Vermelho/Preto/Fogo com Espirais Giratórias Sobrenaturais Atrás */}
                      <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0">
                        <svg
                          viewBox="0 0 48 48"
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          style={{ animation: 'extremeSpiralSpin 3.2s linear infinite' }}
                        >
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="2.5"
                            strokeDasharray="10 6"
                          />
                          <path
                            d="M24 6 C34 6, 42 14, 42 24 C42 32, 35 38, 27 38"
                            fill="none"
                            stroke="#f97316"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        <svg
                          viewBox="0 0 48 48"
                          className="absolute inset-0.5 w-[calc(100%-4px)] h-[calc(100%-4px)] pointer-events-none"
                          style={{ animation: 'extremeReverseSpiralSpin 2.4s linear infinite' }}
                        >
                          <circle
                            cx="24"
                            cy="24"
                            r="14"
                            fill="none"
                            stroke="#fde047"
                            strokeWidth="2"
                            strokeDasharray="6 6"
                          />
                        </svg>
                        <div className="relative z-10 w-5 h-5 rounded-full bg-gradient-to-b from-[#dc2626] via-[#7f1d1d] to-[#090202] border border-[#fde047] flex items-center justify-center shadow-[0_0_8px_#ef4444]">
                          <Flame className="w-3.5 h-3.5 text-[#fde047] fill-[#f97316]" />
                        </div>
                      </div>

                      <div className="flex flex-col items-start text-left">
                        <span
                          className="text-[10px] sm:text-xs tracking-wider text-[#fef08a]"
                          style={{
                            paintOrder: 'stroke fill',
                            WebkitTextStroke: '2.2px #090202',
                          }}
                        >
                          EXTREMO
                        </span>
                        <span className="text-[7.5px] sm:text-[8.5px] font-extrabold text-red-200 mt-0.5">
                          🔥 INFERNO • 30 🍕
                        </span>
                      </div>
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* INFERIOR: 4 CARTÕES TRIDIMENSIONAIS (GARAGEM / CARAMELOS / GALERIA / CONFIGURAÇÕES) */}
          <div
            style={{
              animation: !lobbyExiting
                ? difficulty === 'extreme'
                  ? 'infernoHeatDistort 3.8s ease-in-out infinite, cartoonMenuBandIn 340ms cubic-bezier(0.22, 1, 0.36, 1) 125ms both'
                  : 'cartoonMenuBandIn 340ms cubic-bezier(0.22, 1, 0.36, 1) 125ms both'
                : undefined,
            }}
            className={`relative z-20 w-full max-w-5xl grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-auto mb-2 ${
              lobbyExiting ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            {/* CARTÃO 1: GARAGEM (Modo Normal: Loja Amigável Laranja | Modo Extremo: Oficina Blindada & Forja em Chamas) */}
            <button
              onClick={() => {
                sound.playClick();
                setSelectedGarageMotoId(equippedMotoId);
                setGarageSection('motos');
                setShowSkinsModal(true);
              }}
              style={{
                animation: difficulty === 'extreme' ? 'infernoCardGlow 2.8s ease-in-out infinite' : undefined,
              }}
              className={`group menu-interactive-card relative p-1.5 rounded-2xl cursor-pointer transition-all ${
                difficulty === 'extreme'
                  ? 'bg-[#180404] border-2 border-[#b91c1c] shadow-[0_8px_24px_rgba(220,38,38,0.5)]'
                  : 'cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)]'
              }`}
            >
              <SteelCornerBrackets size="sm" />
              <div
                className={`relative h-full px-2.5 sm:px-3.5 py-2.5 sm:py-3 rounded-xl border-2 flex items-center gap-2 sm:gap-2.5 text-left transition-all ${
                  difficulty === 'extreme'
                    ? 'bg-gradient-to-b from-[#7f1d1d] via-[#450a0a] to-[#180303] border-[#ef4444] shadow-[inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-2px_0_rgba(0,0,0,0.8)]'
                    : 'bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] border-[#fde68a] shadow-[inset_0_2px_0_rgba(255,255,255,0.65)]'
                }`}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform">
                  {difficulty === 'extreme' ? (
                    /* ÍCONE SÉRIO MODO EXTREMO: Garagem Blindada & Forja de Aço em Chamas */
                    <svg viewBox="0 0 64 64" className="w-full h-full">
                      <rect x="8" y="24" width="48" height="34" rx="4" fill="#180404" stroke="#7f1d1d" strokeWidth="2.8" />
                      <rect x="14" y="32" width="36" height="26" rx="2" fill="#2d0606" stroke="#ef4444" strokeWidth="2" />
                      <line x1="14" y1="32" x2="50" y2="58" stroke="#7f1d1d" strokeWidth="1.8" />
                      <line x1="50" y1="32" x2="14" y2="58" stroke="#7f1d1d" strokeWidth="1.8" />
                      <rect x="12" y="14" width="7" height="12" rx="1.5" fill="#450a0a" stroke="#ef4444" strokeWidth="1.8" />
                      <rect x="45" y="14" width="7" height="12" rx="1.5" fill="#450a0a" stroke="#ef4444" strokeWidth="1.8" />
                      <path d="M15.5 14 Q12 4 15.5 1 Q19 6 15.5 14 Z" fill="#facc15" stroke="#ef4444" strokeWidth="1.2" />
                      <path d="M48.5 14 Q45 4 48.5 1 Q52 6 48.5 14 Z" fill="#facc15" stroke="#ef4444" strokeWidth="1.2" />
                      <circle cx="32" cy="42" r="7.5" fill="#0f0202" stroke="#ef4444" strokeWidth="2" />
                      <circle cx="29.5" cy="40.5" r="1.8" fill="#ef4444" />
                      <circle cx="34.5" cy="40.5" r="1.8" fill="#ef4444" />
                      <path d="M30 45 L34 45" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M12 58 Q16 50 20 58 Q24 49 28 58 Q32 48 36 58 Q40 50 44 58 Q48 48 52 58 Z" fill="#ef4444" />
                      <path d="M16 58 Q20 52 24 58 Q28 51 32 58 Q36 51 40 58 Q44 52 48 58 Z" fill="#fbbf24" />
                    </svg>
                  ) : (
                    /* ÍCONE MODO NORMAL: Loja Tradicional Amigável */
                    <svg viewBox="0 0 64 64" className="w-full h-full">
                      <rect x="10" y="26" width="44" height="32" rx="4" fill="#fef3c7" stroke="#451a03" strokeWidth="3" />
                      <rect x="16" y="36" width="14" height="22" fill="#38bdf8" stroke="#451a03" strokeWidth="2.5" />
                      <rect x="34" y="36" width="14" height="14" fill="#bae6fd" stroke="#451a03" strokeWidth="2.5" />
                      <path d="M6 28 L12 12 L52 12 L58 28 Z" fill="#ef4444" stroke="#451a03" strokeWidth="3" strokeLinejoin="round" />
                      <path d="M18 28 L21 12 L30 12 L28 28 Z" fill="#ffffff" />
                      <path d="M36 28 L37 12 L46 12 L47 28 Z" fill="#ffffff" />
                      <rect x="6" y="26" width="52" height="5" rx="2.5" fill="#dc2626" stroke="#451a03" strokeWidth="2.5" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className="font-fun font-black text-sm sm:text-base md:text-lg text-white uppercase leading-tight tracking-wide"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: difficulty === 'extreme' ? '2.5px #450a0a' : '2.5px #78350f',
                      textShadow:
                        difficulty === 'extreme'
                          ? '0 2px 0 #450a0a, 0 4px 8px rgba(220,38,38,0.7)'
                          : '0 2px 0 #78350f, 0 4px 6px rgba(0,0,0,0.6)',
                    }}
                  >
                    GARAGEM
                  </span>
                  <span
                    className={`text-[10px] sm:text-xs font-extrabold drop-shadow leading-snug truncate ${
                      difficulty === 'extreme' ? 'text-[#fca5a5]' : 'text-[#fffbeb]'
                    }`}
                  >
                    {difficulty === 'extreme' ? '20 Motos Turbinadas' : '20 Motos + Motoboys'}
                  </span>
                </div>
              </div>
            </button>

            {/* CARTÃO 2: CARAMELOS (Modo Normal: Cãozinho Fofo Verde | Modo Extremo: Cão Diabo Sério & Predador Carmesim) */}
            <button
              onClick={() => {
                sound.playClick();
                setSelectedGarageCarameloId(equippedCarameloId);
                setGarageSection('caramelos');
                setShowSkinsModal(true);
              }}
              style={{
                animation: difficulty === 'extreme' ? 'infernoCardGlow 2.8s ease-in-out 0.25s infinite' : undefined,
              }}
              className={`group menu-interactive-card relative p-1.5 rounded-2xl cursor-pointer transition-all ${
                difficulty === 'extreme'
                  ? 'bg-[#180404] border-2 border-[#b91c1c] shadow-[0_8px_24px_rgba(220,38,38,0.5)]'
                  : 'cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)]'
              }`}
            >
              <SteelCornerBrackets size="sm" />
              <div
                className={`relative h-full px-2.5 sm:px-3.5 py-2.5 sm:py-3 rounded-xl border-2 flex items-center gap-2 sm:gap-2.5 text-left transition-all ${
                  difficulty === 'extreme'
                    ? 'bg-gradient-to-b from-[#991b1b] via-[#5c0d0d] to-[#1a0303] border-[#f87171] shadow-[inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-2px_0_rgba(0,0,0,0.8)]'
                    : 'bg-gradient-to-b from-[#34d399] via-[#10b981] to-[#047857] border-[#a7f3d0] shadow-[inset_0_2px_0_rgba(255,255,255,0.65)]'
                }`}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform">
                  {difficulty === 'extreme' ? (
                    /* ÍCONE SÉRIO MODO EXTREMO: Rosto Ameaçador do Caramelo Diabo com Chifres e Olhos de Fogo */
                    <svg viewBox="0 0 64 64" className="w-full h-full">
                      <path d="M19 23 C13 7, 5 10, 8 24 Z" fill="#180404" stroke="#ef4444" strokeWidth="2.5" strokeLinejoin="round" />
                      <path d="M45 23 C51 7, 59 10, 56 24 Z" fill="#180404" stroke="#ef4444" strokeWidth="2.5" strokeLinejoin="round" />
                      <path d="M14 28 L5 16 L22 20 Z" fill="#7f1d1d" stroke="#1c0303" strokeWidth="3" strokeLinejoin="round" />
                      <path d="M50 28 L59 16 L42 20 Z" fill="#7f1d1d" stroke="#1c0303" strokeWidth="3" strokeLinejoin="round" />
                      <circle cx="32" cy="35" r="18" fill="#991b1b" stroke="#1c0303" strokeWidth="3.2" />
                      <ellipse cx="32" cy="42" rx="11" ry="8.5" fill="#450a0a" stroke="#1c0303" strokeWidth="2.6" />
                      <path d="M20 28 Q26 25 29 30 Q26 33 20 28 Z" fill="#fef08a" stroke="#1c0303" strokeWidth="2" />
                      <path d="M23 28.5 L27 28.5" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
                      <path d="M44 28 Q38 25 35 30 Q38 33 44 28 Z" fill="#fef08a" stroke="#1c0303" strokeWidth="2" />
                      <path d="M41 28.5 L37 28.5" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
                      <path d="M18 25 L29 28" stroke="#1c0303" strokeWidth="3.2" strokeLinecap="round" />
                      <path d="M46 25 L35 28" stroke="#1c0303" strokeWidth="3.2" strokeLinecap="round" />
                      <ellipse cx="32" cy="38" rx="4.5" ry="3" fill="#1c0303" />
                      <polygon points="26,44 28,50 30,44" fill="#ffffff" stroke="#1c0303" strokeWidth="1.6" />
                      <polygon points="34,44 36,50 38,44" fill="#ffffff" stroke="#1c0303" strokeWidth="1.6" />
                      <path d="M24 44 Q32 46 40 44" stroke="#1c0303" strokeWidth="2.8" strokeLinecap="round" />
                      <circle cx="27" cy="37" r="1.4" fill="#facc15" />
                      <circle cx="37" cy="37" r="1.4" fill="#facc15" />
                    </svg>
                  ) : (
                    /* ÍCONE MODO NORMAL: Caramelo Dócil Fofinho */
                    <svg viewBox="0 0 64 64" className="w-full h-full">
                      <path d="M14 26 L8 14 L22 18 Z" fill="#b45309" stroke="#1f0901" strokeWidth="3.2" strokeLinejoin="round" />
                      <path d="M50 26 L56 14 L42 18 Z" fill="#b45309" stroke="#1f0901" strokeWidth="3.2" strokeLinejoin="round" />
                      <circle cx="32" cy="34" r="18" fill="#f59e0b" stroke="#1f0901" strokeWidth="3.5" />
                      <ellipse cx="32" cy="40" rx="10" ry="8" fill="#fde68a" stroke="#1f0901" strokeWidth="2.5" />
                      <circle cx="25" cy="29" r="3.2" fill="#1f0901" />
                      <circle cx="39" cy="29" r="3.2" fill="#1f0901" />
                      <ellipse cx="32" cy="37" rx="4.5" ry="3.2" fill="#1f0901" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className="font-fun font-black text-sm sm:text-base md:text-lg text-white uppercase leading-tight tracking-wide"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: difficulty === 'extreme' ? '2.5px #450a0a' : '2.5px #064e3b',
                      textShadow:
                        difficulty === 'extreme'
                          ? '0 2px 0 #450a0a, 0 4px 8px rgba(220,38,38,0.7)'
                          : '0 2px 0 #064e3b, 0 4px 6px rgba(0,0,0,0.6)',
                    }}
                  >
                    CARAMELOS
                  </span>
                  <span
                    className={`text-[10px] sm:text-xs font-extrabold drop-shadow leading-snug truncate ${
                      difficulty === 'extreme' ? 'text-[#fca5a5]' : 'text-emerald-50'
                    }`}
                  >
                    {difficulty === 'extreme' ? '7 Bestas Infernais' : '7 Skins 3D'}
                  </span>
                </div>
              </div>
            </button>

            {/* CARTÃO 3: GALERIA (Modo Normal: Paleta Roxo Doce | Modo Extremo: Grimório Profano de Magma Carmesim) */}
            <button
              onClick={() => {
                sound.playClick();
                setIsGalleryOpen(true);
              }}
              style={{
                animation: difficulty === 'extreme' ? 'infernoCardGlow 2.8s ease-in-out 0.5s infinite' : undefined,
              }}
              className={`group menu-interactive-card relative p-1.5 rounded-2xl cursor-pointer transition-all ${
                difficulty === 'extreme'
                  ? 'bg-[#18040d] border-2 border-[#9d174d] shadow-[0_8px_24px_rgba(219,39,119,0.5)]'
                  : 'cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)]'
              }`}
            >
              <SteelCornerBrackets size="sm" />
              <div
                className={`relative h-full px-2.5 sm:px-3.5 py-2.5 sm:py-3 rounded-xl border-2 flex items-center gap-2 sm:gap-2.5 text-left transition-all ${
                  difficulty === 'extreme'
                    ? 'bg-gradient-to-b from-[#831843] via-[#4c0519] to-[#1a0208] border-[#fb7185] shadow-[inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-2px_0_rgba(0,0,0,0.8)]'
                    : 'bg-gradient-to-b from-[#c084fc] via-[#9333ea] to-[#6b21a8] border-[#e9d5ff] shadow-[inset_0_2px_0_rgba(255,255,255,0.55)]'
                }`}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform">
                  {difficulty === 'extreme' ? (
                    /* ÍCONE SÉRIO MODO EXTREMO: Grimório Rúnico Antigo com Chamas Místicas */
                    <svg viewBox="0 0 64 64" className="w-full h-full">
                      <path d="M32 6 Q24 16 28 26 Q32 14 36 26 Q40 16 32 6 Z" fill="#fb7185" />
                      <path d="M32 10 Q26 18 29 26 Q32 17 35 26 Q38 18 32 10 Z" fill="#fde047" />
                      <path d="M12 20 L30 16 L30 54 L12 58 Z" fill="#4c0519" stroke="#1f020a" strokeWidth="2.8" strokeLinejoin="round" />
                      <path d="M52 20 L34 16 L34 54 L52 58 Z" fill="#4c0519" stroke="#1f020a" strokeWidth="2.8" strokeLinejoin="round" />
                      <path d="M15 22 L28 19 L28 52 L15 55 Z" fill="#fef2f2" stroke="#1f020a" strokeWidth="1.6" />
                      <path d="M49 22 L36 19 L36 52 L49 55 Z" fill="#fef2f2" stroke="#1f020a" strokeWidth="1.6" />
                      <rect x="29.5" y="15" width="5" height="40" fill="#1f020a" rx="1.5" />
                      <path d="M21 26 L23 44 M17 32 L27 38 M18 40 L26 30" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="42" cy="35" r="4.5" fill="#e11d48" stroke="#1f020a" strokeWidth="1.6" />
                      <circle cx="42" cy="35" r="2" fill="#facc15" />
                      <path d="M32 54 Q35 60 30 63 L34 63 Q37 60 32 54 Z" fill="#ef4444" stroke="#1f020a" strokeWidth="1.2" />
                    </svg>
                  ) : (
                    /* ÍCONE MODO NORMAL: Paleta de Cores e Tintas */
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
                    </svg>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className="font-fun font-black text-sm sm:text-base md:text-lg text-white uppercase leading-tight tracking-wide"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: difficulty === 'extreme' ? '2.5px #4c0519' : '2.5px #3b0764',
                      textShadow:
                        difficulty === 'extreme'
                          ? '0 2px 0 #4c0519, 0 4px 8px rgba(225,29,72,0.7)'
                          : '0 2px 0 #3b0764, 0 4px 6px rgba(0,0,0,0.6)',
                    }}
                  >
                    GALERIA
                  </span>
                  <span
                    className={`text-[10px] sm:text-xs font-extrabold drop-shadow leading-snug truncate ${
                      difficulty === 'extreme' ? 'text-[#fbcfe8]' : 'text-purple-100'
                    }`}
                  >
                    {difficulty === 'extreme' ? 'Relíquias & Artes' : 'De artes e coleções'}
                  </span>
                </div>
              </div>
            </button>

            {/* CARTÃO 4: CONFIGURAÇÕES (Modo Normal: Engrenagem Amarela Azul | Modo Extremo: Serra Industrial com Magma Fervente) */}
            <button
              onClick={() => {
                sound.playClick();
                setIsSettingsOpen(true);
              }}
              style={{
                animation: difficulty === 'extreme' ? 'infernoCardGlow 2.8s ease-in-out 0.75s infinite' : undefined,
              }}
              className={`group menu-interactive-card relative p-1.5 rounded-2xl cursor-pointer transition-all ${
                difficulty === 'extreme'
                  ? 'bg-[#170502] border-2 border-[#c2410c] shadow-[0_8px_24px_rgba(234,88,12,0.5)]'
                  : 'cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)]'
              }`}
            >
              <SteelCornerBrackets size="sm" />
              <div
                className={`relative h-full px-2.5 sm:px-3.5 py-2.5 sm:py-3 rounded-xl border-2 flex items-center gap-2 sm:gap-2.5 text-left transition-all ${
                  difficulty === 'extreme'
                    ? 'bg-gradient-to-b from-[#7c2d12] via-[#431407] to-[#170402] border-[#fb923c] shadow-[inset_0_2px_0_rgba(255,255,255,0.45),inset_0_-2px_0_rgba(0,0,0,0.8)]'
                    : 'bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#1d4ed8] border-[#bae6fd] shadow-[inset_0_2px_0_rgba(255,255,255,0.65)]'
                }`}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] menu-icon-spin-360">
                  {difficulty === 'extreme' ? (
                    /* ÍCONE SÉRIO MODO EXTREMO: Engrenagem Industrial com Lâminas Afiadas & Núcleo de Magma */
                    <svg viewBox="0 0 64 64" className="w-full h-full">
                      <path
                        d="M32 6 L36 12 L44 9 L46 17 L54 16 L53 24 L60 27 L57 34 L62 40 L56 45 L58 53 L50 54 L49 61 L41 59 L38 65 L32 60 L26 65 L23 59 L15 61 L14 54 L6 53 L8 45 L2 40 L7 34 L4 27 L11 24 L10 16 L18 17 L20 9 L28 12 Z"
                        fill="#1c0702"
                        stroke="#ea580c"
                        strokeWidth="3"
                        strokeLinejoin="round"
                      />
                      <circle cx="32" cy="35" r="15" fill="#7c2d12" stroke="#ea580c" strokeWidth="2.2" />
                      <circle cx="32" cy="35" r="9" fill="#f97316" stroke="#facc15" strokeWidth="2.4" />
                      <circle cx="32" cy="35" r="5" fill="#fef08a" />
                      <path d="M24 35 L20 33 M40 35 L44 33 M32 27 L32 23 M32 43 L32 47" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    /* ÍCONE MODO NORMAL: Engrenagem Clássica */
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
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className="font-fun font-black text-xs sm:text-sm md:text-base text-white uppercase leading-tight tracking-wide truncate"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: difficulty === 'extreme' ? '2.5px #431407' : '2.5px #0c4a6e',
                      textShadow:
                        difficulty === 'extreme'
                          ? '0 2px 0 #431407, 0 4px 8px rgba(234,88,12,0.7)'
                          : '0 2px 0 #0c4a6e, 0 4px 6px rgba(0,0,0,0.6)',
                    }}
                  >
                    CONFIGURAÇÕES
                  </span>
                  <span
                    className={`text-[10px] sm:text-xs font-extrabold drop-shadow leading-snug truncate ${
                      difficulty === 'extreme' ? 'text-[#fed7aa]' : 'text-sky-100'
                    }`}
                  >
                    {difficulty === 'extreme' ? 'Painel do Inferno' : 'Ajustes do jogo'}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          ITEM 5: TELA DE CONFIRMAÇÃO AO INICIAR O MODO EXTREMO (CARAMELO DIABO)
          Layout Esculpido Dark & Imponente (Fundo Preto + Detalhes Vermelhos + Voz de Monstro + Digitação Animada)
          ========================================================================= */}
      {showExtremeConfirmModal && (
        <div className="fixed inset-0 z-[92] flex items-center justify-center p-3 sm:p-5 bg-black/95 backdrop-blur-md animate-fade-in overflow-hidden select-none">
          {/* Atmosfera Abissal Preta e Vermelha Profunda */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 42%, rgba(153,27,27,0.42) 0%, rgba(30,4,4,0.92) 52%, rgba(2,0,0,0.99) 100%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#991b1b]/50 via-[#dc2626]/15 to-transparent pointer-events-none" />

          {/* Brasas e Cristais Vermelhos Flutuando */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[
              { l: '8%', s: 10, d: '0s', dur: '2.1s', c: '#ef4444' },
              { l: '19%', s: 14, d: '0.3s', dur: '2.5s', c: '#dc2626' },
              { l: '32%', s: 9, d: '0.7s', dur: '1.8s', c: '#f97316' },
              { l: '47%', s: 15, d: '0.15s', dur: '2.3s', c: '#ef4444' },
              { l: '63%', s: 12, d: '0.55s', dur: '2.0s', c: '#dc2626' },
              { l: '77%', s: 14, d: '0.1s', dur: '2.4s', c: '#f97316' },
              { l: '90%', s: 10, d: '0.45s', dur: '1.9s', c: '#ef4444' },
            ].map((emb, idx) => (
              <div
                key={idx}
                className="absolute bottom-4 rotate-45 border border-black"
                style={{
                  left: emb.l,
                  width: `${emb.s}px`,
                  height: `${emb.s}px`,
                  backgroundColor: emb.c,
                  boxShadow: `0 0 16px ${emb.c}`,
                  animation: `infernoEmberRise ${emb.dur} ease-in ${emb.d} infinite`,
                }}
              />
            ))}
          </div>

          {/* Estrutura Esculpida Estilo Boss Arcade (Sem caixa externa quadrada — silhueta imponente da referência!) */}
          <div className="relative z-10 max-w-lg w-full flex flex-col items-center text-center">
            {/* 1. Topo Esculpido com Ombreiras Rubi/Obsidiana, Chamas Laterais e Retrato Central */}
            <div className="relative w-full flex flex-col items-center">
              {/* Badge Superior Cravada no Topo do Brasão */}
              <div className="relative z-30 -mb-3.5 px-6 py-1.5 rounded-full bg-gradient-to-r from-[#450a0a] via-[#dc2626] to-[#450a0a] border-[2.5px] border-[#f59e0b] outline outline-[3px] outline-black shadow-[0_6px_0_#000,0_0_28px_rgba(220,38,38,0.9)] flex items-center gap-2">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-[#fde047] text-[#ef4444] animate-pulse" />
                <span
                  className="font-fun font-black text-xs sm:text-base uppercase tracking-widest text-white"
                  style={{
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: '2px #090202',
                  }}
                >
                  MODO EXTREMO • INFERNO
                </span>
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-[#fde047] text-[#ef4444] animate-pulse" />
              </div>

              {/* Brasão Alado Superior (Ombreiras Rubi/Preto + Chamas Laterais Animadas + Moldura do Diabo) */}
              <div className="relative w-[92%] sm:w-[88%] pt-6 pb-3 px-4 flex items-center justify-center">
                {/* Asas/Ombreiras Esculpidas em Obsidiana e Rubi */}
                <div
                  className="absolute inset-0 bg-gradient-to-b from-[#7f1d1d] via-[#280404] to-[#070101] border-x-[3px] border-t-[3px] border-[#ef4444] shadow-[0_0_45px_rgba(220,38,38,0.65)]"
                  style={{
                    clipPath:
                      'polygon(0% 14%, 14% 0%, 86% 0%, 100% 14%, 92% 100%, 8% 100%)',
                  }}
                />
                <div
                  className="absolute inset-[5px] bg-gradient-to-b from-[#1a0303] via-[#090101] to-[#030000] pointer-events-none"
                  style={{
                    clipPath:
                      'polygon(1% 15%, 14% 2%, 86% 2%, 99% 15%, 91% 100%, 9% 100%)',
                  }}
                />

                {/* Chamas Cartoon Animadas Subindo nas Laterais do Retrato */}
                <svg
                  viewBox="0 0 100 130"
                  className="absolute left-3 sm:left-6 bottom-1 w-16 h-28 sm:w-20 sm:h-32 pointer-events-none z-10"
                  style={{ animation: 'flameTongueFlicker 0.9s ease-in-out infinite' }}
                >
                  <path
                    d="M55,125 C20,115 5,82 18,46 C24,62 34,58 30,24 C45,42 54,18 46,4 C68,26 82,62 72,125 Z"
                    fill="#dc2626"
                    stroke="#090202"
                    strokeWidth="4"
                  />
                  <path
                    d="M55,125 C30,112 20,84 28,56 C34,68 42,60 40,36 C54,52 64,76 62,125 Z"
                    fill="#f97316"
                  />
                  <path
                    d="M54,125 C38,112 32,90 38,68 C46,80 54,94 54,125 Z"
                    fill="#fde047"
                  />
                </svg>

                <svg
                  viewBox="0 0 100 130"
                  className="absolute right-3 sm:right-6 bottom-1 w-16 h-28 sm:w-20 sm:h-32 pointer-events-none z-10 -scale-x-100"
                  style={{ animation: 'flameTongueFlicker 0.95s ease-in-out 0.2s infinite' }}
                >
                  <path
                    d="M55,125 C20,115 5,82 18,46 C24,62 34,58 30,24 C45,42 54,18 46,4 C68,26 82,62 72,125 Z"
                    fill="#dc2626"
                    stroke="#090202"
                    strokeWidth="4"
                  />
                  <path
                    d="M55,125 C30,112 20,84 28,56 C34,68 42,60 40,36 C54,52 64,76 62,125 Z"
                    fill="#f97316"
                  />
                  <path
                    d="M54,125 C38,112 32,90 38,68 C46,80 54,94 54,125 Z"
                    fill="#fde047"
                  />
                </svg>

                {/* Retrato Central do Caramelo Diabo (Balança falando enquanto digita!) */}
                <div
                  onClick={() => {
                    sound.playMonsterIntroGrowl();
                    setExtremeTypedChars(EXTREME_DEVIL_SPEECH.length);
                  }}
                  style={{
                    animation:
                      extremeTypedChars < EXTREME_DEVIL_SPEECH.length
                        ? 'monsterTalkBounce 0.22s ease-in-out infinite'
                        : 'sinisterDevilSway 2.4s ease-in-out infinite',
                  }}
                  className="relative z-20 w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border-[3.5px] border-[#f59e0b] outline outline-[4px] outline-black bg-gradient-to-b from-[#450a0a] via-[#180202] to-black shadow-[0_0_36px_rgba(239,68,68,0.9)] cursor-pointer"
                >
                  <img
                    src="/images/inferno_mascote_diabo.png"
                    alt="Caramelo Diabo"
                    className="w-full h-full object-cover scale-105"
                    draggable={false}
                  />
                  {/* Brilho Rubro Pulsante enquanto fala */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-t from-[#dc2626]/70 via-transparent to-transparent pointer-events-none transition-opacity duration-150 ${
                      extremeTypedChars < EXTREME_DEVIL_SPEECH.length ? 'opacity-95' : 'opacity-55'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* 2. Painel de Fala Dark & Imponente (Fundo Preto + Detalhes Vermelhos + Sem Aspas + Letras Animadas!) */}
            <div
              onClick={() => {
                if (extremeTypedChars < EXTREME_DEVIL_SPEECH.length) {
                  setExtremeTypedChars(EXTREME_DEVIL_SPEECH.length);
                }
              }}
              className="relative z-20 w-full rounded-2xl p-[3px] bg-gradient-to-b from-[#ef4444] via-[#991b1b] to-[#450a0a] outline outline-[4px] outline-black shadow-[0_14px_40px_rgba(0,0,0,0.95),0_0_30px_rgba(220,38,38,0.45)] cursor-pointer"
            >
              {/* Seta Triangular Apontando para o Caramelo Diabo */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#070202] border-l-[3px] border-t-[3px] border-[#ef4444] rotate-45 z-10" />

              <div className="relative rounded-[13px] bg-gradient-to-b from-[#090203] via-[#050101] to-[#110204] px-4 py-4 sm:px-6 sm:py-5 overflow-hidden">
                {/* Detalhes Vermelhos nos Cantos Internos */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#ef4444]/80 pointer-events-none" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#ef4444]/80 pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#ef4444]/80 pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#ef4444]/80 pointer-events-none" />

                {/* Fala Animada Letra por Letra Agrupada por Palavra (Sem Quebrar Palavras no Meio e Sem Aspas!) */}
                <p
                  className="relative z-10 min-h-[3.4rem] sm:min-h-[3.8rem] font-fun font-black text-base sm:text-xl uppercase leading-snug tracking-wide flex flex-wrap items-center justify-center content-center gap-x-2 gap-y-1 text-center"
                  style={{
                    animation:
                      extremeTypedChars >= EXTREME_DEVIL_SPEECH.length
                        ? 'monsterWordTremor 0.28s ease-in-out infinite'
                        : undefined,
                  }}
                >
                  {(() => {
                    const words = EXTREME_DEVIL_SPEECH.split(' ');
                    let globalIdx = 0;
                    return words.map((word, wIdx) => {
                      const wordStart = globalIdx;
                      const chars = word.split('');
                      globalIdx += word.length + 1; // +1 pelo espaço entre palavras
                      if (wordStart >= extremeTypedChars) return null;
                      const visibleCount = Math.min(chars.length, extremeTypedChars - wordStart);
                      return (
                        <span key={wIdx} className="inline-flex whitespace-nowrap">
                          {chars.slice(0, visibleCount).map((ch, cIdx) => (
                            <span
                              key={wordStart + cIdx}
                              className="inline-block text-[#ff2e2e]"
                              style={{
                                paintOrder: 'stroke fill',
                                WebkitTextStroke: '2.2px #000000',
                                textShadow: '0 3px 0 #450a0a, 0 0 12px rgba(239,68,68,0.65)',
                                animation: 'monsterCharPop 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards',
                              }}
                            >
                              {ch}
                            </span>
                          ))}
                        </span>
                      );
                    });
                  })()}
                  {extremeTypedChars < EXTREME_DEVIL_SPEECH.length && (
                    <span className="inline-block w-2.5 h-5 sm:h-6 ml-0.5 bg-[#ef4444] animate-pulse shadow-[0_0_10px_#ef4444]" />
                  )}
                </p>

                {/* Divisor Vermelho Rubi Estilizado */}
                <div className="my-3 flex items-center justify-center gap-2">
                  <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#dc2626] to-[#ef4444]" />
                  <Flame className="w-4 h-4 fill-[#ef4444] text-[#fde047]" />
                  <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-[#dc2626] to-[#ef4444]" />
                </div>

                {/* Detalhes do Modo Inferno em Fundo Preto com Destaque Vermelho */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-fun font-black uppercase tracking-wider">
                  <span className="px-2.5 py-1 rounded-lg bg-[#1c0406] border border-[#dc2626]/80 text-[#fca5a5] shadow-[inset_0_0_10px_rgba(220,38,38,0.25)]">
                    🌋 ATAQUES DE LAVA (-50% VIDA)
                  </span>
                  <span className="text-[#ef4444] hidden sm:inline">•</span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#1c0406] border border-[#dc2626]/80 text-[#fca5a5] shadow-[inset_0_0_10px_rgba(220,38,38,0.25)]">
                    👻 30 ALMAS PARA LIBERTAR
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#450a0a] to-[#7f1d1d] border border-[#ef4444] text-[#fde047] shadow-[0_0_12px_rgba(239,68,68,0.45)]">
                    🔥 BAFORADA DE FOGO!
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Base Esculpida Inferior com os 2 Botões Arcade (SIM, PROSSEGUIR | NÃO, ARREGAR) */}
            <div className="relative z-10 w-[96%] -mt-1 pt-3 pb-3 px-3 sm:px-4 rounded-b-3xl bg-gradient-to-b from-[#2b0505] via-[#120202] to-[#050000] border-x-[3px] border-b-[3px] border-[#dc2626] outline outline-[4px] outline-black shadow-[0_18px_45px_rgba(0,0,0,0.95)] grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPlayMode('moto');
                  savePlayMode('moto');
                  setShowExtremeConfirmModal(false);
                  beginMapLoadAndStart('inferno');
                }}
                className="relative overflow-hidden py-3.5 px-4 rounded-2xl bg-gradient-to-b from-[#ff3b3b] via-[#dc2626] to-[#650909] border-[3px] border-[#f59e0b] outline outline-[3px] outline-black font-fun font-black text-sm sm:text-base text-white uppercase tracking-wider shadow-[0_5px_0_#090202,0_0_25px_rgba(239,68,68,0.85)] hover:scale-[1.03] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <div className="cartoon-shine-bar" />
                <Flame className="w-5 h-5 fill-[#fde047] text-[#fde047] shrink-0" />
                <span
                  style={{
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: '2px #2b0404',
                  }}
                >
                  SIM, PROSSEGUIR
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowExtremeConfirmModal(false);
                }}
                className="py-3.5 px-4 rounded-2xl bg-gradient-to-b from-[#27272a] via-[#18181b] to-[#09090b] border-[3px] border-[#71717a] outline outline-[3px] outline-black font-fun font-black text-sm sm:text-base text-zinc-200 uppercase tracking-wider shadow-[0_5px_0_#000000] hover:text-white hover:border-[#ef4444] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🐔</span>
                <span
                  style={{
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: '2px #000000',
                  }}
                >
                  NÃO, ARREGAR
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TELA DE CARREGAMENTO SIMPLES E LIMPA (COM TRANSIÇÃO DE FOGO NO MODO INFERNO!)
          ========================================================================= */}
      {mapLoadingState?.active && (
        <div
          className={`fixed inset-0 z-[95] flex flex-col items-center justify-center p-4 backdrop-blur-lg transition-opacity duration-300 ${
            mapLoadingState.targetMapId === 'inferno'
              ? 'bg-gradient-to-b from-black via-[#280404] to-black'
              : 'bg-[#120904]/95'
          } ${mapLoadingState.fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <div
            className={`max-w-sm w-full rounded-3xl p-5 border-2 shadow-[0_24px_60px_rgba(0,0,0,0.9)] flex flex-col items-center gap-3.5 text-center ${
              mapLoadingState.targetMapId === 'inferno'
                ? 'border-[#ef4444] bg-gradient-to-b from-[#3b0707] via-[#1c0303] to-[#090101]'
                : 'border-[#fbbf24]/80 bg-gradient-to-b from-[#2b1508] via-[#1c0d05] to-[#110703]'
            }`}
          >
            <div className="cartoon-title-gold-3d text-xl sm:text-2xl uppercase leading-tight">
              {mapLoadingState.targetMapId === 'inferno'
                ? '🔥 ESTRADA DO INFERNO 🔥'
                : mapLoadingState.targetMapId === 'praia'
                ? 'Orla de Copacabana'
                : 'Vila & Quebrada'}
            </div>

            <div className="w-full flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-fun font-black uppercase tracking-wider text-amber-200">
                <span>
                  {mapLoadingState.targetMapId === 'inferno'
                    ? 'ABRINDO PORTAL DE FOGO...'
                    : 'CARREGANDO...'}
                </span>
                <span className="text-[#fde047]">
                  {Math.round(mapLoadingState.progress)}%
                </span>
              </div>
              <div className="w-full h-3.5 rounded-full bg-black/75 border border-amber-500/50 p-0.5 overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    mapLoadingState.targetMapId === 'inferno'
                      ? 'bg-gradient-to-r from-[#dc2626] via-[#f97316] to-[#fde047]'
                      : 'bg-gradient-to-r from-[#f59e0b] via-[#fde047] to-[#4ade80]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(8, mapLoadingState.progress))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. GAMEPLAY HUD (APENAS PAUSE E ENGRENAGEM NO CANTO SUPERIOR DIREITO)
          ========================================================================= */}
      {gameState === 'PLAYING' && (
        <>
          {/* FAIXAS CINEMATOGRÁFICAS DA CUTSCENE DE ENTRADA (MOTOBOY + CARAMELO / CARAMELO DIABO) */}
          {isIntroCutsceneActive && (
            <>
              {/* Efeito Óptico Cinematográfico de Foco/Desfoque Gradual (Rack Focus) no Modo Hardcore */}
              {(selectedMapId === 'inferno' || difficulty === 'extreme') && (
                <div
                  className="fixed inset-0 pointer-events-none z-[23] overflow-hidden"
                  aria-hidden="true"
                >
                  <style>{`
                    @keyframes hardcoreRackFocus {
                      0% {
                        backdrop-filter: blur(4.5px);
                        -webkit-backdrop-filter: blur(4.5px);
                        opacity: 0.95;
                        mask-image: radial-gradient(circle at 62% 62%, transparent 18%, black 65%);
                        -webkit-mask-image: radial-gradient(circle at 62% 62%, transparent 18%, black 65%);
                      }
                      38% {
                        backdrop-filter: blur(4.0px);
                        -webkit-backdrop-filter: blur(4.0px);
                        opacity: 0.92;
                        mask-image: radial-gradient(circle at 58% 60%, transparent 22%, black 68%);
                        -webkit-mask-image: radial-gradient(circle at 58% 60%, transparent 22%, black 68%);
                      }
                      55% {
                        backdrop-filter: blur(3.5px);
                        -webkit-backdrop-filter: blur(3.5px);
                        opacity: 0.88;
                        mask-image: radial-gradient(circle at 45% 48%, transparent 26%, black 72%);
                        -webkit-mask-image: radial-gradient(circle at 45% 48%, transparent 26%, black 72%);
                      }
                      74% {
                        backdrop-filter: blur(2.0px);
                        -webkit-backdrop-filter: blur(2.0px);
                        opacity: 0.55;
                        mask-image: radial-gradient(circle at 50% 50%, transparent 45%, black 85%);
                        -webkit-mask-image: radial-gradient(circle at 50% 50%, transparent 45%, black 85%);
                      }
                      100% {
                        backdrop-filter: blur(0px);
                        -webkit-backdrop-filter: blur(0px);
                        opacity: 0;
                        mask-image: none;
                        -webkit-mask-image: none;
                      }
                    }
                  `}</style>
                  <div
                    className="absolute inset-0"
                    style={{
                      animation: 'hardcoreRackFocus 3.45s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                      background:
                        'radial-gradient(ellipse at 50% 55%, transparent 45%, rgba(0, 0, 0, 0.35) 75%, rgba(20, 0, 0, 0.65) 100%)',
                    }}
                  />
                </div>
              )}

              <div className="fixed inset-0 pointer-events-none z-[24] flex flex-col justify-between overflow-hidden">
                <div className="w-full h-10 sm:h-12 bg-gradient-to-b from-black/85 to-transparent flex items-center justify-center pt-1">
                  <span
                    className={`px-3.5 py-1 rounded-full bg-black/75 border text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg ${
                      selectedMapId === 'inferno'
                        ? 'border-[#ef4444] text-[#fca5a5]'
                        : 'border-[#fbbf24]/60 text-[#fde047]'
                    }`}
                  >
                    {selectedMapId === 'inferno'
                      ? '🔥 BEM-VINDO AO INFERNO • CARAMELO DIABO NA SUA COLA!'
                      : selectedMapId === 'praia'
                      ? '🎬 CHEGADA NA ORLA DE COPACABANA • CARAMELO NA COLA!'
                      : '🎬 CHEGADA NA VILA CARAMELO • FUGA EM ALTA VELOCIDADE!'}
                  </span>
                </div>
                <div className="w-full h-8 sm:h-10 bg-gradient-to-t from-black/75 to-transparent" />
              </div>
            </>
          )}

          {/* ITEM 2 & 7: EFEITO VERMELHO RÁPIDO NA TELA DURANTE A MORDIDA OU ATAQUE DE LAVA INDICANDO DANO RECEBIDO */}
          {redDamageFlash && (
            <div
              key={redDamageFlash}
              className="fixed inset-0 pointer-events-none z-[19] overflow-hidden"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.06) 0%, rgba(220,38,38,0.34) 60%, rgba(153,27,27,0.68) 100%)',
                boxShadow: 'inset 0 0 65px rgba(220,38,38,0.75)',
                animation: 'redDamageScreenFlashAnim 340ms ease-out forwards',
              }}
            />
          )}

          {/* ITEM 9: EFEITO CINEMATOGRÁFICO DE ALMA LIBERTADA NA TELA (APENAS BORDAS BRANCAS LEVES + ANIMAÇÃO 3D DA ALMA VOANDO LÁ PRA CIMA, SEM PNG/SVG NO MEIO DA TELA!) */}
          {soulLiberatedBadge && (
            <div
              key={soulLiberatedBadge}
              className="fixed inset-0 pointer-events-none z-[25] overflow-hidden"
              style={{ animation: 'soulWhiteBorderPulse 2.2s ease-in-out forwards' }}
            >
              {/* Bordas Brancas de Leve / Vinheta Celestial Suave ao Redor da Tela */}
              <div
                className="absolute inset-0 border-[3px] border-white/45 rounded-none"
                style={{
                  boxShadow:
                    'inset 0 0 75px rgba(255, 255, 255, 0.36), inset 0 0 24px rgba(224, 242, 254, 0.55)',
                  background:
                    'radial-gradient(circle at 50% 50%, transparent 68%, rgba(255, 255, 255, 0.14) 100%)',
                }}
              />

              {/* Banner Superior Cinematográfico Dark com Borda Branca Suave */}
              <div className="absolute inset-x-0 top-14 sm:top-16 flex justify-center px-3">
                <div className="px-5 py-1.5 rounded-full bg-black/80 border-[2px] border-white/85 shadow-[0_0_28px_rgba(255,255,255,0.65)] flex items-center gap-2">
                  <span className="text-white text-sm">✨</span>
                  <span
                    className="font-fun font-black text-xs sm:text-sm text-white uppercase tracking-widest"
                    style={{
                      textShadow: '0 0 12px rgba(255,255,255,0.9)',
                    }}
                  >
                    ALMA LIBERTADA • SUBIU AO CÉU
                  </span>
                  <span className="text-white text-sm">✨</span>
                </div>
              </div>
            </div>
          )}
          {/* EFEITO DE BORRÃO DE VELOCIDADE (MOTION BLUR + LINHAS DE VENTO) QUANDO OS CARROS PASSAM PELA CÂMERA! */}
          {vehiclePassBlur && (
            <div
              key={vehiclePassBlur.id}
              className="fixed inset-0 pointer-events-none z-[17] overflow-hidden"
              aria-hidden="true"
              style={{
                animation: 'vehiclePassMotionBlurAnim 380ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              {/* Faixa Lateral de Desfoque de Movimento (Motion Blur na lateral da câmera por onde o carro passou) */}
              <div
                className={`absolute inset-y-0 w-[42%] sm:w-[36%] ${
                  vehiclePassBlur.side === 'left' ? 'left-0' : 'right-0'
                }`}
                style={{
                  backdropFilter: `blur(${(3.2 + vehiclePassBlur.intensity * 3.8).toFixed(1)}px)`,
                  WebkitBackdropFilter: `blur(${(3.2 + vehiclePassBlur.intensity * 3.8).toFixed(1)}px)`,
                  maskImage:
                    vehiclePassBlur.side === 'left'
                      ? 'linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, transparent 100%)'
                      : 'linear-gradient(to left, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, transparent 100%)',
                  WebkitMaskImage:
                    vehiclePassBlur.side === 'left'
                      ? 'linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, transparent 100%)'
                      : 'linear-gradient(to left, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, transparent 100%)',
                  background:
                    selectedMapId === 'inferno' || difficulty === 'extreme'
                      ? vehiclePassBlur.side === 'left'
                        ? 'linear-gradient(to right, rgba(239,68,68,0.22), rgba(251,146,60,0.08) 55%, transparent)'
                        : 'linear-gradient(to left, rgba(239,68,68,0.22), rgba(251,146,60,0.08) 55%, transparent)'
                      : vehiclePassBlur.side === 'left'
                      ? 'linear-gradient(to right, rgba(255,255,255,0.20), rgba(186,230,253,0.08) 55%, transparent)'
                      : 'linear-gradient(to left, rgba(255,255,255,0.20), rgba(186,230,253,0.08) 55%, transparent)',
                }}
              />

              {/* Rastros de Vento / Speed Lines Cortando Pela Câmera */}
              {[0, 1, 2, 3, 4].map((lineIdx) => {
                const offsetPct = 3 + lineIdx * 5.5;
                const isInfernoMode = selectedMapId === 'inferno' || difficulty === 'extreme';
                return (
                  <div
                    key={lineIdx}
                    className="absolute top-0 h-[55%] w-[3px] sm:w-[4px] rounded-full"
                    style={{
                      [vehiclePassBlur.side === 'left' ? 'left' : 'right']: `${offsetPct}%`,
                      background: isInfernoMode
                        ? 'linear-gradient(to bottom, transparent, rgba(254,240,138,0.85), rgba(239,68,68,0.75), transparent)'
                        : 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.88), rgba(125,211,252,0.65), transparent)',
                      filter: 'blur(0.8px)',
                      animation: `vehicleSpeedLineRush ${280 + lineIdx * 24}ms ease-out forwards`,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* ITEM 3: PISCAR RAPIDAMENTE EM AZUL NO ACERTO CONFIRMADO DA MORDIDA */}
          {blueHitFlash && (
            <div
              key={blueHitFlash.id}
              className="fixed inset-0 pointer-events-none z-[18] overflow-hidden"
              aria-hidden="true"
              style={{
                background:
                  blueHitFlash.quality === 'perfect'
                    ? 'radial-gradient(circle at 50% 48%, rgba(125,211,252,0.28) 0%, rgba(56,189,248,0.46) 55%, rgba(2,132,199,0.58) 100%)'
                    : 'radial-gradient(circle at 50% 48%, rgba(125,211,252,0.18) 0%, rgba(56,189,248,0.34) 60%, rgba(14,165,233,0.44) 100%)',
                animation: 'blueBiteFlashAnim 300ms ease-out forwards',
              }}
            />
          )}

          {/* =====================================================================
              EFEITO CINEMATOGRÁFICO DE RESPINGOS DE ÁGUA / JATO DE LAVA NA LENTE
              (NO MODO EXTREMO/INFERNO: EFEITO DE FOGO NA TELA SUMINDO, SEM GOTAS DE ÁGUA!)
              ===================================================================== */}
          {lensSplash && (
            <div
              key={lensSplash.id}
              className="fixed inset-0 pointer-events-none z-[16] overflow-hidden"
              aria-hidden="true"
            >
              {selectedMapId === 'inferno' || difficulty === 'extreme' ? (
                <>
                  <style>{`
                    @keyframes lensFireHeatWave {
                      0% {
                        backdrop-filter: blur(0px) brightness(1) contrast(1);
                        -webkit-backdrop-filter: blur(0px) brightness(1) contrast(1);
                        opacity: 0;
                      }
                      12% {
                        backdrop-filter: blur(${(6.8 * lensSplash.intensity).toFixed(1)}px) brightness(1.28) contrast(1.32) saturate(1.45);
                        -webkit-backdrop-filter: blur(${(6.8 * lensSplash.intensity).toFixed(1)}px) brightness(1.28) contrast(1.32) saturate(1.45);
                        opacity: 1;
                      }
                      45% {
                        backdrop-filter: blur(${(4.2 * lensSplash.intensity).toFixed(1)}px) brightness(1.15) contrast(1.18) saturate(1.25);
                        -webkit-backdrop-filter: blur(${(4.2 * lensSplash.intensity).toFixed(1)}px) brightness(1.15) contrast(1.18) saturate(1.25);
                        opacity: 0.88;
                      }
                      75% {
                        backdrop-filter: blur(${(1.8 * lensSplash.intensity).toFixed(1)}px) brightness(1.08);
                        -webkit-backdrop-filter: blur(${(1.8 * lensSplash.intensity).toFixed(1)}px) brightness(1.08);
                        opacity: 0.45;
                      }
                      100% {
                        backdrop-filter: blur(0px);
                        -webkit-backdrop-filter: blur(0px);
                        opacity: 0;
                      }
                    }
                    @keyframes lensFireScreenFlash {
                      0% { opacity: 0; transform: scale(0.96); }
                      12% { opacity: 1; transform: scale(1.0); }
                      45% { opacity: 0.82; transform: scale(1.01); }
                      75% { opacity: 0.45; transform: scale(1.02); }
                      100% { opacity: 0; transform: scale(1.04); }
                    }
                    @keyframes lensFireFlamesLick {
                      0% { transform: translateY(45%) scaleY(0.7); opacity: 0; }
                      15% { transform: translateY(0%) scaleY(1.08); opacity: 1; }
                      35% { transform: translateY(-3%) scaleY(1.02); opacity: 0.95; }
                      65% { transform: translateY(8%) scaleY(0.9); opacity: 0.65; }
                      100% { transform: translateY(45%) scaleY(0.65); opacity: 0; }
                    }
                    @keyframes lensEmberFloatRise {
                      0% { transform: translate(0, 30px) scale(0.6); opacity: 0; }
                      18% { transform: translate(-8px, -20px) scale(1.15); opacity: 1; }
                      60% { transform: translate(12px, -90px) scale(0.9); opacity: 0.85; }
                      100% { transform: translate(-16px, -180px) scale(0.25); opacity: 0; }
                    }
                  `}</style>

                  {/* 1) Ondas de Calor + Desfoque Térmico na Lente */}
                  <div
                    className="absolute inset-0"
                    style={{
                      animation: 'lensFireHeatWave 2.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                    }}
                  />

                  {/* 2) Brilho e Vinheta de Lava e Fogo Incandescente na Tela */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(ellipse at 50% 85%, rgba(254, 240, 138, 0.35) 0%, rgba(249, 115, 22, 0.48) 32%, rgba(220, 38, 38, 0.72) 65%, rgba(69, 10, 10, 0.92) 100%)',
                      boxShadow:
                        'inset 0 0 115px rgba(220, 38, 38, 0.95), inset 0 0 55px rgba(254, 240, 138, 0.65)',
                      animation: 'lensFireScreenFlash 2.1s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                    }}
                  />

                  {/* 3) Chamas Cartoon Esculpidas Subindo pela Base da Tela */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-48 sm:h-64 flex items-end justify-center pointer-events-none"
                    style={{
                      animation: 'lensFireFlamesLick 2.1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    }}
                  >
                    <svg
                      viewBox="0 0 1200 400"
                      preserveAspectRatio="none"
                      className="w-full h-full overflow-visible"
                    >
                      {/* Camada Externa: Vermelho Brasa com Sombra Escura */}
                      <path
                        d="M0,400 L0,180 Q100,60 180,240 Q260,30 380,220 Q480,80 580,250 Q670,40 790,230 Q890,70 1010,240 Q1120,50 1200,190 L1200,400 Z"
                        fill="#b91c1c"
                        stroke="#450a0a"
                        strokeWidth="8"
                      />
                      {/* Camada Intermediária: Laranja Fogo */}
                      <path
                        d="M0,400 L0,220 Q110,120 200,280 Q280,100 400,260 Q500,130 600,290 Q690,100 810,270 Q910,120 1020,280 Q1130,110 1200,240 L1200,400 Z"
                        fill="#f97316"
                        stroke="#991b1b"
                        strokeWidth="5"
                      />
                      {/* Camada Interna: Amarelo Ardente */}
                      <path
                        d="M0,400 L0,270 Q120,190 220,320 Q300,170 420,300 Q520,200 620,330 Q710,180 830,310 Q930,190 1040,320 Q1140,180 1200,290 L1200,400 Z"
                        fill="#fef08a"
                      />
                      {/* Núcleo Incandescente Branco */}
                      <path
                        d="M0,400 L0,330 Q140,270 240,360 Q320,260 440,350 Q540,280 640,370 Q730,260 850,350 Q950,270 1060,360 Q1150,270 1200,340 L1200,400 Z"
                        fill="#ffffff"
                        opacity="0.92"
                      />
                    </svg>
                  </div>

                  {/* 4) Fagulhas e Brasas de Fogo Flutuando e Sumindo */}
                  {[
                    { l: '8%', b: '12%', s: 11, d: '0ms' },
                    { l: '16%', b: '22%', s: 15, d: '60ms' },
                    { l: '24%', b: '10%', s: 9, d: '30ms' },
                    { l: '33%', b: '28%', s: 13, d: '100ms' },
                    { l: '42%', b: '14%', s: 17, d: '20ms' },
                    { l: '50%', b: '32%', s: 15, d: '80ms' },
                    { l: '58%', b: '16%', s: 12, d: '40ms' },
                    { l: '67%', b: '26%', s: 16, d: '110ms' },
                    { l: '75%', b: '12%', s: 10, d: '50ms' },
                    { l: '84%', b: '24%', s: 14, d: '90ms' },
                    { l: '92%', b: '15%', s: 11, d: '30ms' },
                    { l: '14%', b: '38%', s: 9, d: '120ms' },
                    { l: '48%', b: '44%', s: 13, d: '70ms' },
                    { l: '78%', b: '38%', s: 11, d: '130ms' },
                    { l: '28%', b: '45%', s: 10, d: '95ms' },
                    { l: '64%', b: '46%', s: 12, d: '85ms' },
                  ].map((em, idx) => (
                    <div
                      key={idx}
                      className="absolute rounded-full"
                      style={{
                        left: em.l,
                        bottom: em.b,
                        width: `${em.s}px`,
                        height: `${em.s}px`,
                        background:
                          'radial-gradient(circle, #ffffff 18%, #fef08a 48%, #f97316 78%, #dc2626 100%)',
                        boxShadow:
                          '0 0 16px rgba(249, 115, 22, 0.95), 0 0 8px rgba(254, 240, 138, 0.95)',
                        animation: `lensEmberFloatRise 1.95s ease-out ${em.d} forwards`,
                      }}
                    />
                  ))}
                </>
              ) : (
                <>
                  <style>{`
                    @keyframes lensWaterBlurClear {
                      0% {
                        backdrop-filter: blur(0px);
                        -webkit-backdrop-filter: blur(0px);
                        opacity: 0;
                      }
                      14% {
                        backdrop-filter: blur(${(5.8 * lensSplash.intensity).toFixed(1)}px) saturate(1.18);
                        -webkit-backdrop-filter: blur(${(5.8 * lensSplash.intensity).toFixed(1)}px) saturate(1.18);
                        opacity: 1;
                      }
                      48% {
                        backdrop-filter: blur(${(3.4 * lensSplash.intensity).toFixed(1)}px) saturate(1.08);
                        -webkit-backdrop-filter: blur(${(3.4 * lensSplash.intensity).toFixed(1)}px) saturate(1.08);
                        opacity: 0.88;
                      }
                      78% {
                        backdrop-filter: blur(${(1.4 * lensSplash.intensity).toFixed(1)}px);
                        -webkit-backdrop-filter: blur(${(1.4 * lensSplash.intensity).toFixed(1)}px);
                        opacity: 0.45;
                      }
                      100% {
                        backdrop-filter: blur(0px);
                        -webkit-backdrop-filter: blur(0px);
                        opacity: 0;
                      }
                    }
                    @keyframes lensDropletSlideFade {
                      0% { transform: translateY(-8px) scale(0.55); opacity: 0; }
                      14% { transform: translateY(0px) scale(1.08); opacity: 0.96; }
                      65% { transform: translateY(26px) scale(0.96); opacity: 0.72; }
                      100% { transform: translateY(62px) scale(0.72); opacity: 0; }
                    }
                  `}</style>
                  <div
                    className="absolute inset-0 bg-sky-200/12"
                    style={{
                      animation: 'lensWaterBlurClear 2.4s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                    }}
                  />
                  {[
                    { l: '8%', t: '14%', w: 28, h: 34, d: '0ms' },
                    { l: '19%', t: '36%', w: 18, h: 23, d: '45ms' },
                    { l: '12%', t: '66%', w: 24, h: 30, d: '80ms' },
                    { l: '28%', t: '18%', w: 15, h: 19, d: '30ms' },
                    { l: '35%', t: '52%', w: 30, h: 38, d: '15ms' },
                    { l: '44%', t: '24%', w: 20, h: 26, d: '70ms' },
                    { l: '53%', t: '72%', w: 26, h: 33, d: '55ms' },
                    { l: '61%', t: '16%', w: 32, h: 40, d: '20ms' },
                    { l: '68%', t: '44%', w: 17, h: 22, d: '95ms' },
                    { l: '76%', t: '28%', w: 27, h: 35, d: '35ms' },
                    { l: '83%', t: '62%', w: 22, h: 28, d: '65ms' },
                    { l: '90%', t: '19%', w: 19, h: 24, d: '50ms' },
                    { l: '24%', t: '78%', w: 16, h: 20, d: '110ms' },
                    { l: '72%', t: '79%', w: 21, h: 27, d: '90ms' },
                  ].map((dr, idx) => (
                    <div
                      key={idx}
                      className="absolute rounded-full border-2 border-[#09090b]/85 outline outline-1 outline-white/80"
                      style={{
                        left: dr.l,
                        top: dr.t,
                        width: `${Math.round(dr.w * (0.82 + lensSplash.intensity * 0.28))}px`,
                        height: `${Math.round(dr.h * (0.82 + lensSplash.intensity * 0.28))}px`,
                        background:
                          'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.96) 0%, rgba(186,230,253,0.72) 42%, rgba(56,189,248,0.38) 78%, rgba(14,165,233,0.14) 100%)',
                        boxShadow:
                          'inset 0 2px 4px rgba(255,255,255,0.95), 0 4px 10px rgba(9,9,11,0.38)',
                        animation: `lensDropletSlideFade 2.25s ease-out ${dr.d} forwards`,
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* =====================================================================
              ITEM 4: TRANSIÇÃO DE INÍCIO — CÂMERA GIRA E O JOGO ENTRA EM CÂMERA LENTA
              PARA DESVIAR DO CARRO + MENSAGEM DIVERTIDA "Agora se vire hahaha..."
              ===================================================================== */}
          {hud.tutorialPhase === 'slowmo' && phase === 'playing' && (
            <div className="fixed inset-x-0 top-20 sm:top-24 z-30 flex flex-col items-center pointer-events-auto px-3">
              <div className="cartoon-wood-board px-5 sm:px-7 py-3 rounded-3xl border-[3px] border-[#38bdf8] shadow-[0_10px_30px_rgba(0,0,0,0.85),0_0_26px_rgba(56,189,248,0.65)] flex flex-col items-center gap-2 text-center max-w-md animate-bounce">
                <SteelCornerBrackets size="sm" />
                <span className="px-3 py-0.5 rounded-full bg-sky-500 border border-white text-[10px] font-fun font-black text-white uppercase tracking-widest">
                  🎬 CÂMERA LENTA ATIVADA!
                </span>
                <p
                  className="font-fun font-black text-base sm:text-xl text-[#fde047] uppercase leading-tight"
                  style={{
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: '3px #1f0901',
                  }}
                >
                  CARRO NA CONTRAMÃO! DESVIE PRO LADO AGORA!
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      controlTriggerRef.current?.left();
                    }}
                    className="px-4 py-1.5 rounded-xl cartoon-btn-gold font-fun font-black text-xs uppercase cursor-pointer active:scale-95"
                  >
                    ◀ DESVIAR ESQUERDA
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      controlTriggerRef.current?.right();
                    }}
                    className="px-4 py-1.5 rounded-xl cartoon-btn-green font-fun font-black text-xs uppercase cursor-pointer active:scale-95"
                  >
                    DESVIAR DIREITA ▶
                  </button>
                </div>
              </div>
            </div>
          )}

          {hud.tutorialBannerText && phase === 'playing' && (
            <div className="fixed inset-x-0 top-20 sm:top-24 z-30 flex flex-col items-center pointer-events-none px-3">
              <div className="cartoon-wood-board px-6 py-2.5 rounded-2xl border-[3px] border-[#fde047] shadow-[0_10px_26px_rgba(0,0,0,0.85)] animate-bounce">
                <span
                  className="font-fun font-black text-lg sm:text-2xl text-[#fde047] uppercase tracking-wider"
                  style={{
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: '3.8px #1f0901',
                    textShadow: '0 3px 0 #1f0901',
                  }}
                >
                  😂 {hud.tutorialBannerText}
                </span>
              </div>
            </div>
          )}

          {/* =====================================================================
              COMBO & COLETA DE DINHEIRO NO CHÃO AO LADO DO MOTOBOY (DESLIZE SUAVE, CORES CARTOON, SEM FUNDO PRETO)
              ===================================================================== */}
          {phase === 'playing' &&
            ((hud.pickupComboCount ?? 0) >= 5 || (activeComboBreak !== null && activeComboBreak.brokenCombo >= 5)) && (
              <div
                className="fixed inset-0 pointer-events-none z-20 overflow-hidden"
                aria-hidden="true"
              >
                <style>{`
                  @keyframes groundSmoothSlideRight {
                    0% {
                      opacity: 0;
                      transform: translate(-16px, 8px) scale(0.85);
                    }
                    22% {
                      opacity: 1;
                      transform: translate(2px, -2px) scale(1.04);
                    }
                    48% {
                      opacity: 1;
                      transform: translate(0px, 0px) scale(1);
                    }
                    78% {
                      opacity: 0.95;
                      transform: translate(4px, -2px) scale(0.98);
                    }
                    100% {
                      opacity: 0;
                      transform: translate(14px, -8px) scale(0.9);
                    }
                  }
                  @keyframes groundSmoothSlideLeft {
                    0% {
                      opacity: 0;
                      transform: translate(16px, 8px) scale(0.85);
                    }
                    22% {
                      opacity: 1;
                      transform: translate(-2px, -2px) scale(1.04);
                    }
                    48% {
                      opacity: 1;
                      transform: translate(0px, 0px) scale(1);
                    }
                    78% {
                      opacity: 0.95;
                      transform: translate(-4px, -2px) scale(0.98);
                    }
                    100% {
                      opacity: 0;
                      transform: translate(-14px, -8px) scale(0.9);
                    }
                  }
                  @keyframes cinematicSlashBlade {
                    0% { opacity: 0; transform: translate(-50%, -50%) rotate(-28deg) scaleX(0.1); }
                    30% { opacity: 1; transform: translate(-50%, -50%) rotate(-28deg) scaleX(1.4); }
                    100% { opacity: 0; transform: translate(-50%, -50%) rotate(-28deg) scaleX(1.65); }
                  }
                  @keyframes cinematicHalfTop {
                    0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
                    100% { opacity: 0; transform: translate(-24px, -20px) rotate(-18deg) scale(0.85); }
                  }
                  @keyframes cinematicHalfBottom {
                    0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
                    100% { opacity: 0; transform: translate(24px, 20px) rotate(16deg) scale(0.85); }
                  }
                `}</style>

                {(() => {
                  const nonce = hud.pickupComboNonce ?? 0;
                  const playerNormX = hud.playerScreenPos?.x ?? 0.5;
                  const playerNormY = hud.playerScreenPos?.y ?? 0.58;
                  const playerX = playerNormX * 100;
                  const playerY = playerNormY * 100;

                  // Posição alinhada perfeitamente ao lado do motoboy na mesma camada/altura visual (sem sobrepor as costas):
                  const isRightSide = (Math.abs(nonce) % 2) === 0;
                  const posX = isRightSide
                    ? Math.min(88, Math.max(60, playerX + 18))
                    : Math.max(12, Math.min(40, playerX - 18));
                  // Na mesma altura do motoboy (ao lado, sem cobrir o personagem nem a barra superior):
                  const groundY = Math.min(72, Math.max(54, playerY + 2 + ((Math.abs(nonce) % 3) - 1) * 1.5));

                  const count = hud.pickupComboCount ?? 0;
                  const timeLeftRatio = hud.pickupComboTimeRatio ?? 1;
                  const scaleBoost = Math.min(1.15, 1 + Math.max(0, count - 1) * 0.03);
                  const isBoneMode = playMode === 'caramelo';

                  if (activeComboBreak) {
                    if (activeComboBreak.brokenCombo < 5) return null;
                    const breakBoneMode = activeComboBreak.mode === 'caramelo';
                    return (
                      <div
                        key={`break-${activeComboBreak.nonce}`}
                        style={{ left: `${posX}%`, top: `${groundY}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
                      >
                        <div className="relative flex flex-col items-center justify-center filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
                          <div
                            style={{
                              clipPath: 'polygon(0 0, 100% 0, 100% 48%, 0 56%)',
                              animation: 'cinematicHalfTop 0.78s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                            }}
                            className="flex flex-col items-center"
                          >
                            <span
                              className={`font-fun font-black text-2xl sm:text-3xl tracking-tight leading-none ${
                                breakBoneMode ? 'text-[#fef3c7]' : 'text-[#fde047]'
                              }`}
                              style={{
                                paintOrder: 'stroke fill',
                                WebkitTextStroke: '4px #180c05',
                                textShadow: '0 3px 0 #7f1d1d',
                              }}
                            >
                              {activeComboBreak.brokenCombo}x
                            </span>
                          </div>

                          <div
                            style={{
                              clipPath: 'polygon(0 54%, 100% 46%, 100% 100%, 0 100%)',
                              animation: 'cinematicHalfBottom 0.78s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                            }}
                            className="absolute inset-0 flex flex-col items-center"
                          >
                            <span
                              className={`font-fun font-black text-2xl sm:text-3xl tracking-tight leading-none ${
                                breakBoneMode ? 'text-[#fca5a5]' : 'text-[#fb7185]'
                              }`}
                              style={{
                                paintOrder: 'stroke fill',
                                WebkitTextStroke: '4px #180c05',
                                textShadow: '0 3px 0 #450a0a',
                              }}
                            >
                              {activeComboBreak.brokenCombo}x
                            </span>
                          </div>

                          <div
                            style={{ animation: 'cinematicSlashBlade 0.55s ease-out forwards' }}
                            className="absolute top-1/2 left-1/2 w-20 sm:w-28 h-1.5 rounded-full bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_14px_#ef4444,0_0_6px_#ffffff]"
                          />

                          <span
                            className="mt-0.5 font-fun font-black text-[10px] text-[#fca5a5] uppercase tracking-wider"
                            style={{
                              paintOrder: 'stroke fill',
                              WebkitTextStroke: '2.5px #180c05',
                              textShadow: '0 1.5px 0 #450a0a',
                            }}
                          >
                            ✂️ QUEBROU!
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (count < 5) return null;

                  const isUrgent = timeLeftRatio < 0.35;
                  const slideAnimation = isRightSide
                    ? 'groundSmoothSlideRight 1.55s cubic-bezier(0.18, 1, 0.32, 1) forwards'
                    : 'groundSmoothSlideLeft 1.55s cubic-bezier(0.18, 1, 0.32, 1) forwards';

                  return (
                    <div
                      key={`ground-combo-${nonce}`}
                      style={{
                        left: `${posX}%`,
                        top: `${groundY}%`,
                        animation: slideAnimation,
                        opacity: Math.max(0.3, Math.min(1, timeLeftRatio * 1.5)),
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none transition-opacity duration-150"
                    >
                      <div
                        style={{
                          transform: `scale(${comboPopActive ? scaleBoost * 1.12 : scaleBoost})`,
                        }}
                        className="relative flex flex-col items-center transition-transform duration-150"
                      >
                        {/* COMBO COMPACTO EM ESTILO HQ / CARTOON COMIC BURST (Alinhado ao lado na mesma camada!) */}
                        <div className="relative flex items-center justify-center filter drop-shadow-[0_6px_14px_rgba(0,0,0,0.85)]">
                          {/* SVG do Comic Burst em escala compacta */}
                          <svg
                            viewBox="0 0 180 156"
                            className="w-16 h-14 sm:w-18 sm:h-16 overflow-visible"
                          >
                            <defs>
                              <radialGradient id={`comicBurstRed-${nonce}`} cx="50%" cy="46%" r="56%">
                                <stop offset="0%" stopColor="#ff4530" />
                                <stop offset="60%" stopColor="#e11d23" />
                                <stop offset="100%" stopColor="#991b1b" />
                              </radialGradient>
                              <radialGradient id={`comicBurstYellow-${nonce}`} cx="50%" cy="44%" r="52%">
                                <stop offset="0%" stopColor="#fff875" />
                                <stop offset="42%" stopColor="#fbb024" />
                                <stop offset="82%" stopColor="#f97316" />
                                <stop offset="100%" stopColor="#ea580c" />
                              </radialGradient>
                            </defs>

                            {/* Action Lines de gibi no canto superior esquerdo */}
                            <g stroke="#180c05" strokeLinecap="round" fill="none">
                              <path d="M 32 20 Q 22 30 24 44" strokeWidth="4.6" />
                              <path d="M 20 28 Q 12 38 15 50" strokeWidth="3.4" />
                            </g>
                            {/* Lasca de impacto cartoon */}
                            <polygon
                              points="38,12 48,22 34,20"
                              fill="#facc15"
                              stroke="#180c05"
                              strokeWidth="2.6"
                              strokeLinejoin="round"
                            />

                            {/* Camada 1 Externa: Explosão Estrelada Vermelha com Borda Preta */}
                            <polygon
                              points="
                                90,6    104,36  140,18  132,54  170,68  144,92
                                168,120 132,122 126,152 96,134  68,152  62,122
                                22,124  40,94   12,72   46,58   38,24   74,38
                              "
                              fill={`url(#comicBurstRed-${nonce})`}
                              stroke="#180c05"
                              strokeWidth="6.5"
                              strokeLinejoin="round"
                            />

                            {/* Camada 2 Interna: Explosão Estrelada Amarela/Laranja */}
                            <polygon
                              points="
                                90,18   100,42  128,30  122,58  152,70  132,90
                                150,110 122,112 116,136 94,122  72,136  68,112
                                36,114  48,90   26,72   54,62   48,34   76,42
                              "
                              fill={`url(#comicBurstYellow-${nonce})`}
                              stroke="#180c05"
                              strokeWidth="4"
                              strokeLinejoin="round"
                            />

                            {/* Realce de Brilho Cartoon Branco */}
                            <path
                              d="M 90 22 L 98 42 L 122 34"
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth="3"
                              strokeLinecap="round"
                              opacity="0.85"
                            />
                          </svg>

                          {/* Textos Sobrepostos Estilo Gibi: Multiplicador 3D + "COMBO" */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center -translate-y-0.5">
                            {/* Multiplicador: Ex: "4X" */}
                            <div className="relative transform -rotate-3 select-none flex items-center justify-center">
                              {/* Sombra 3D Extrudada */}
                              <span
                                aria-hidden="true"
                                className="absolute top-[2px] left-[1.2px] font-fun font-black text-lg sm:text-xl tracking-tighter text-[#180c05]"
                                style={{
                                  WebkitTextStroke: '3.8px #180c05',
                                  paintOrder: 'stroke fill',
                                  textShadow: '0 2px 0 #180c05',
                                }}
                              >
                                {count}X
                              </span>
                              {/* Texto Principal Amarelo com Borda Preta Cartoon */}
                              <span
                                className="relative font-fun font-black text-lg sm:text-xl tracking-tighter leading-none text-[#fffb8f]"
                                style={{
                                  paintOrder: 'stroke fill',
                                  WebkitTextStroke: '3px #180c05',
                                  textShadow: '0 1.2px 0 #ea580c, 0 2.4px 0 #92400e',
                                }}
                              >
                                {count}X
                              </span>
                            </div>

                            {/* Palavra "COMBO" Compacta */}
                            <div className="relative -mt-0.5 transform -rotate-2 select-none flex items-center justify-center">
                              <span
                                aria-hidden="true"
                                className="absolute top-[1.5px] left-[1px] font-fun font-black text-[8px] sm:text-[9.5px] tracking-wider text-[#180c05]"
                                style={{
                                  WebkitTextStroke: '3px #180c05',
                                  paintOrder: 'stroke fill',
                                }}
                              >
                                COMBO
                              </span>
                              <span
                                className="relative font-fun font-black text-[8px] sm:text-[9.5px] tracking-wider text-[#ffffff] uppercase leading-none"
                                style={{
                                  paintOrder: 'stroke fill',
                                  WebkitTextStroke: '2.2px #180c05',
                                  textShadow: '0 1px 0 #180c05',
                                }}
                              >
                                COMBO
                              </span>
                            </div>
                          </div>

                          {/* Ícone Dinâmico Flutuante Compacto ao lado */}
                          <div
                            className={`absolute ${
                              isRightSide ? '-left-3.5 sm:-left-4.5' : '-right-3.5 sm:-right-4.5'
                            } -top-1 flex items-center justify-center pointer-events-none animate-bounce`}
                          >
                            {isBoneMode ? (
                              /* Modo Caramelo: Osso Dourado c/ Brilho Cartoon */
                              <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center flex-shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                <svg viewBox="0 0 44 32" className="w-full h-full">
                                  <g transform="rotate(-15 22 16)">
                                    <circle cx="9" cy="11" r="5.5" fill="#fffbeb" stroke="#180c05" strokeWidth="2.8" />
                                    <circle cx="9" cy="21" r="5.5" fill="#fef3c7" stroke="#180c05" strokeWidth="2.8" />
                                    <circle cx="35" cy="11" r="5.5" fill="#fffbeb" stroke="#180c05" strokeWidth="2.8" />
                                    <circle cx="35" cy="21" r="5.5" fill="#fef3c7" stroke="#180c05" strokeWidth="2.8" />
                                    <rect x="9" cy="12" width="26" height="8" rx="3.5" fill="#fffbeb" stroke="#180c05" strokeWidth="2.8" />
                                    <path d="M12 13 Q22 11 32 13" fill="none" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
                                  </g>
                                </svg>
                              </div>
                            ) : (
                              /* Modo Motoboy: Cédulas e Moedas de Ouro Cartoon Vivas */
                              <div className="relative w-7 h-6 sm:w-8 sm:h-7 flex items-center justify-center flex-shrink-0 drop-shadow-[0_3px_6px_rgba(0,0,0,0.85)]">
                                <svg viewBox="0 0 54 44" className="w-full h-full">
                                  <g transform="rotate(18 27 22)">
                                    <rect x="7" y="10" width="38" height="22" rx="3.5" fill="#f59e0b" stroke="#180c05" strokeWidth="2.8" />
                                    <rect x="10" y="13" width="32" height="16" rx="2" fill="#fbbf24" stroke="#180c05" strokeWidth="1.6" />
                                    <circle cx="34" cy="21" r="4.2" fill="#fef3c7" opacity="0.8" />
                                  </g>
                                  <g transform="rotate(-8 27 22)">
                                    <rect x="6" y="11" width="39" height="22" rx="3.5" fill="#10b981" stroke="#180c05" strokeWidth="3" />
                                    <rect x="9" y="14" width="33" height="16" rx="2" fill="#34d399" stroke="#180c05" strokeWidth="1.8" />
                                    <path d="M16 14 L16 30" stroke="#059669" strokeWidth="2.5" />
                                    <circle cx="28" cy="22" r="5" fill="#ecfdf5" stroke="#065f46" strokeWidth="1.6" />
                                    <text x="28" y="25" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#065f46">R$</text>
                                    <path d="M10 15 L22 15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
                                  </g>
                                  <circle cx="44" cy="14" r="6" fill="#fde047" stroke="#180c05" strokeWidth="2.2" />
                                  <circle cx="44" cy="14" r="4.5" fill="#eab308" stroke="#180c05" strokeWidth="1.2" />
                                  <text x="44" y="16.5" textAnchor="middle" fontSize="6" fontWeight="900" fill="#713f12">$</text>
                                  <polygon points="7,8 9,4 11,8 15,10 11,12 9,16 7,12 3,10" fill="#ffffff" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Barra de Tempo Cartoon Estilizada no Asfalto */}
                        <div className="mt-0.5 w-16 sm:w-20 h-1.5 rounded-full bg-[#180c05] p-[1px] shadow-[0_3px_8px_rgba(0,0,0,0.8)] border border-yellow-400/90 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-75 ${
                              isUrgent
                                ? 'bg-gradient-to-r from-red-500 to-rose-400 animate-pulse'
                                : count >= 6
                                ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-white'
                                : 'bg-gradient-to-r from-emerald-400 via-yellow-300 to-lime-300'
                            }`}
                            style={{ width: `${Math.max(6, Math.round(timeLeftRatio * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

          <div className="absolute top-0 left-0 right-0 p-2.5 sm:p-4 flex items-start justify-between pointer-events-none z-10">
            {/* Esquerda: Item 2 & 3 — Barra de Vida Estilo HQ (Retrato Fundo Vermelho Borda Branca + Painel Fundo Preto Borda Branca + Corações c/ Borda Branca e Dano Explosivo) + Pizzas Maiores */}
            <div className="flex flex-col gap-2 sm:gap-2.5 items-start max-w-[74%] sm:max-w-none">
              {(() => {
                const maxHearts = hud.maxHp || getInitialLivesForDifficulty(difficulty);
                const isLowLife =
                  hud.hp > 0 && (playMode === 'caramelo' ? hud.hp <= 1 : hud.hp <= 2);
                const portraitUrl =
                  playMode === 'caramelo'
                    ? caramelo3DThumbs[equippedCarameloId]
                    : motoboy3DThumbs[equippedMotoboyId];

                return (
                  <div className="flex flex-col items-start gap-1.5 pointer-events-auto select-none">
                    <div className="relative flex items-center pt-2 pl-1">
                      {/* 1) MOLDURA DO PERSONAGEM À ESQUERDA: FUNDO VERMELHO + BORDA BRANCA + CONTORNO PRETO + FOTO 3D NA FRENTE */}
                      <div className="relative z-20 flex-shrink-0">
                        {/* Coroa Branca c/ Contorno Preto estilo HQ acima do retrato (igual à imagem de referência) */}
                        <svg
                          viewBox="0 0 40 26"
                          className="absolute -top-5 left-0.5 w-6 h-4 sm:w-7 sm:h-5 -rotate-12 z-30 drop-shadow-[0_2px_0_#000000]"
                        >
                          <path
                            d="M4 22 L7 6 L15 14 L20 3 L25 14 L33 6 L36 22 Z"
                            fill="#ffffff"
                            stroke="#09090b"
                            strokeWidth="3.5"
                            strokeLinejoin="round"
                          />
                        </svg>

                        {/* Respingos / Pontas Vermelhas estilo HQ nos cantos da moldura */}
                        <svg
                          viewBox="0 0 100 100"
                          className="absolute -inset-2.5 w-[calc(100%+20px)] h-[calc(100%+20px)] pointer-events-none -z-10"
                        >
                          <polygon points="82,4 99,0 91,17" fill="#ef4444" />
                          <polygon points="0,78 14,96 3,99" fill="#dc2626" />
                          <circle cx="4" cy="70" r="3.5" fill="#ef4444" />
                        </svg>

                        {/* Caixa Inclinada Vermelha com Borda Branca Nítida e Contorno Preto Grosso */}
                        <div
                          className={`relative w-13 h-13 sm:w-16 sm:h-16 -skew-x-12 overflow-hidden bg-gradient-to-b from-[#ff2a2a] via-[#e11d48] to-[#991b1b] border-[3px] border-white outline outline-[4px] outline-[#09090b] shadow-[0_5px_0_#09090b] ${
                            isLowLife ? 'animate-pulse' : ''
                          }`}
                        >
                          {/* Sombra diagonal estilo HQ no fundo vermelho */}
                          <div
                            className="absolute inset-0 opacity-35"
                            style={{
                              background:
                                'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, transparent 45%, rgba(0,0,0,0.55) 100%)',
                            }}
                          />
                          {portraitUrl ? (
                            <img
                              src={portraitUrl}
                              alt="Personagem"
                              className="relative z-10 w-full h-full object-cover scale-[1.32] skew-x-12 translate-y-1 drop-shadow-[0_3px_4px_rgba(0,0,0,0.85)]"
                              draggable={false}
                            />
                          ) : (
                            <div className="relative z-10 w-full h-full flex items-center justify-center skew-x-12 text-xl">
                              {playMode === 'caramelo' ? '🐕' : '🏍️'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2) PAINEL HORIZONTAL DE FUNDO PRETO E BORDA BRANCA CONECTADO À DIREITA DO RETRATO */}
                      <div className="relative z-10 -ml-3 sm:-ml-3.5 -skew-x-12 bg-[#09090b] border-[3px] border-white outline outline-[4px] outline-[#09090b] shadow-[0_5px_0_#09090b] pl-5 sm:pl-6 pr-3.5 sm:pr-5 py-1.5 sm:py-2 flex items-center">
                        {/* Detalhe de respingos vermelhos HQ nas pontas direitas da barra preta (igual à imagem!) */}
                        <svg
                          viewBox="0 0 60 50"
                          className="absolute -right-3 -bottom-2.5 w-10 h-8 pointer-events-none -z-10"
                        >
                          <polygon points="10,38 56,18 38,44 52,42 22,50" fill="#ef4444" />
                        </svg>

                        <div className="flex items-center flex-wrap gap-1 sm:gap-1.5 skew-x-12">
                          {Array.from({ length: maxHearts }).map((_, i) => {
                            const active = i < hud.hp;
                            const isBreaking = brokenHeartIndex === i;
                            const isHealing = healedHeartIndex === i;

                            return (
                              <div
                                key={i}
                                className={`relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center transition-all duration-300 ${
                                  isBreaking
                                    ? 'scale-150 -translate-y-0.5 z-30'
                                    : isHealing
                                    ? 'scale-125 -translate-y-0.5 z-20'
                                    : active
                                    ? isLowLife
                                      ? 'scale-105 animate-bounce'
                                      : 'scale-100'
                                    : 'scale-95 opacity-90'
                                }`}
                              >
                                {isHealing && (
                                  <div className="absolute inset-0 rounded-full bg-yellow-300/80 blur-sm animate-ping" />
                                )}

                                <svg
                                  viewBox="0 0 44 42"
                                  className="w-full h-full overflow-visible"
                                >
                                  {/* EFEITO EXPLOSIVO "RECEBER DANO" IDÊNTICO À IMAGEM DE REFERÊNCIA (media_1794190557005_116b7842.png) */}
                                  {isBreaking && (
                                    <g>
                                      {/* Explosão pontiaguda vermelha externa + estilhaços voando */}
                                      <polygon
                                        points="22,0 27,8 37,2 34,12 44,10 38,20 44,27 35,29 39,39 28,34 22,42 16,34 5,39 9,29 0,27 6,20 0,10 10,12 7,2 17,8"
                                        fill="#ff1e27"
                                      />
                                      {/* Estilhaços vermelhos soltos nas laterais */}
                                      <polygon points="-5,14 2,11 0,18" fill="#ff1e27" />
                                      <polygon points="43,19 50,16 48,23" fill="#ff1e27" />
                                      <polygon points="-3,30 4,27 1,35" fill="#ff1e27" />
                                      {/* Explosão pontiaguda preta interna */}
                                      <polygon
                                        points="22,3 26,10 34,5 32,14 40,13 35,20 40,26 32,27 35,35 26,31 22,38 18,31 9,35 12,27 4,26 9,20 4,13 12,14 10,5 18,10"
                                        fill="#09090b"
                                      />
                                    </g>
                                  )}

                                  {/* Borda Branca Externa do Coração (destaca cada coração dentro do painel preto!) */}
                                  {!isBreaking && (
                                    <path
                                      d="M22 36.5 C22 36.5 4 25.5 4 13.8 C4 7.4 8.9 3 14.8 3 C18.3 3 20.6 4.8 22 7.1 C23.4 4.8 25.7 3 29.2 3 C35.1 3 40 7.4 40 13.8 C40 25.5 22 36.5 22 36.5 Z"
                                      fill="none"
                                      stroke="#ffffff"
                                      strokeWidth="5.2"
                                      strokeLinejoin="round"
                                    />
                                  )}

                                  {isBreaking ? (
                                    /* Coração Partido em 2 Metades: Esquerda Vermelha Viva + Direita Escura Arroxeada + Raio Central */
                                    <g>
                                      {/* Metade Esquerda Vermelha Viva */}
                                      <path
                                        d="M22 7.1 C20.6 4.8 18.3 3 14.8 3 C8.9 3 4 7.4 4 13.8 C4 25.5 22 36.5 22 36.5 L19 25 L24 21 L18 15 L23 7.1 Z"
                                        fill="#ff1e27"
                                        stroke="#09090b"
                                        strokeWidth="2.8"
                                        strokeLinejoin="round"
                                      />
                                      {/* Metade Direita Escura/Arroxeada Perdendo Vida */}
                                      <path
                                        d="M24 7.1 C25.7 3 29.2 3 29.2 3 C35.1 3 40 7.4 40 13.8 C40 25.5 22 36.5 22 36.5 L21 25 L26 20 L20 15 L25 7.1 Z"
                                        fill="#522130"
                                        stroke="#09090b"
                                        strokeWidth="2.8"
                                        strokeLinejoin="round"
                                      />
                                      {/* Brilho branco na metade esquerda */}
                                      <ellipse
                                        cx="12.8"
                                        cy="11.2"
                                        rx="3.4"
                                        ry="2.0"
                                        transform="rotate(-28 12.8 11.2)"
                                        fill="#ffffff"
                                      />
                                      <circle cx="9.8" cy="15.8" r="1.3" fill="#ffffff" />
                                      {/* Raio branco e preto de ruptura no centro */}
                                      <path
                                        d="M24 5 L18 15 L25 19 L19 35"
                                        fill="none"
                                        stroke="#ffffff"
                                        strokeWidth="2.4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </g>
                                  ) : (
                                    /* Coração Normal (Cheio Vermelho Brilhante com Borda Branca ou Vazio Cinza Escuro) */
                                    <>
                                      <path
                                        d="M22 36.5 C22 36.5 4 25.5 4 13.8 C4 7.4 8.9 3 14.8 3 C18.3 3 20.6 4.8 22 7.1 C23.4 4.8 25.7 3 29.2 3 C35.1 3 40 7.4 40 13.8 C40 25.5 22 36.5 22 36.5 Z"
                                        fill={active ? '#ff1e27' : '#303036'}
                                        stroke="#09090b"
                                        strokeWidth="2.6"
                                        strokeLinejoin="round"
                                      />
                                      {active ? (
                                        <>
                                          <path
                                            d="M22 32.8 C22 32.8 7.5 23.4 7.5 13.8 C7.5 9.2 10.8 6.2 14.8 6.2 C17.6 6.2 19.9 7.9 22 10.1 C24.1 7.9 26.4 6.2 29.2 6.2 C33.2 6.2 36.5 9.2 36.5 13.8 C36.5 23.4 22 32.8 22 32.8 Z"
                                            fill="#ef4444"
                                            opacity="0.45"
                                          />
                                          <ellipse
                                            cx="13.2"
                                            cy="11.2"
                                            rx="3.4"
                                            ry="2.0"
                                            transform="rotate(-28 13.2 11.2)"
                                            fill="#ffffff"
                                          />
                                          <circle cx="10.2" cy="15.8" r="1.3" fill="#ffffff" />
                                          <ellipse
                                            cx="29.4"
                                            cy="10.6"
                                            rx="2.3"
                                            ry="1.3"
                                            transform="rotate(-18 29.4 10.6)"
                                            fill="#ffffff"
                                            opacity="0.85"
                                          />
                                        </>
                                      ) : (
                                        <line
                                          x1="22"
                                          y1="7"
                                          x2="22"
                                          y2="35"
                                          stroke="#18181b"
                                          strokeWidth="2"
                                        />
                                      )}
                                    </>
                                  )}

                                  {isHealing && (
                                    <g>
                                      <rect x="19" y="12" width="6" height="15" rx="1.4" fill="#ffffff" stroke="#09090b" strokeWidth="1.6" />
                                      <rect x="14.5" y="16.5" width="15" height="6" rx="1.4" fill="#ffffff" stroke="#09090b" strokeWidth="1.6" />
                                    </g>
                                  )}
                                </svg>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Alerta de VIDA BAIXA! estilo HQ */}
                    {isLowLife && (
                      <div className="flex items-center gap-1.5 px-3 py-0.5 -skew-x-12 rounded-lg bg-[#09090b] border-2 border-white outline outline-[3px] outline-black shadow-[0_3px_0_#000000] animate-pulse ml-1">
                        <span className="font-fun font-black text-sm text-red-500 leading-none">
                          !!
                        </span>
                        <span
                          className="font-fun font-black text-[11px] sm:text-xs text-red-400 uppercase tracking-wider leading-none"
                          style={{
                            paintOrder: 'stroke fill',
                            WebkitTextStroke: '2px #09090b',
                          }}
                        >
                          VIDA BAIXA!
                        </span>
                      </div>
                    )}

                    {/* Indicador de PIZZAS RESTANTES fixo diretamente embaixo das vidas */}
                    {playMode === 'moto' && (
                      <div className="flex items-center gap-2 mt-0.5 ml-1">
                        <div
                          className={`flex items-center gap-2 bg-[#09090b] px-3 py-1 rounded-xl border-[2.5px] border-white outline outline-[3px] outline-[#09090b] shadow-[0_4px_0_#09090b] -skew-x-12 transition-transform duration-200 ${
                            pizzaCounterPop ? 'scale-110 ring-2 ring-yellow-400' : 'scale-100'
                          }`}
                        >
                          {/* Ícone Fatia de Pizza Cartoon */}
                          <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center flex-shrink-0 skew-x-12">
                            <svg viewBox="0 0 36 36" className="w-full h-full drop-shadow-[0_1.5px_0_#000000]">
                              <path
                                d="M6 10 Q18 3 30 10 L18 32 Z"
                                fill="#f59e0b"
                                stroke="#ffffff"
                                strokeWidth="2.2"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M8.5 12 Q18 6.5 27.5 12 L18 29.5 Z"
                                fill="#fde047"
                                stroke="#09090b"
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                              />
                              <circle cx="15" cy="15.5" r="2.2" fill="#ef4444" stroke="#09090b" strokeWidth="1.2" />
                              <circle cx="21" cy="16.5" r="2.0" fill="#dc2626" stroke="#09090b" strokeWidth="1.2" />
                              <circle cx="18" cy="22" r="2.0" fill="#dc2626" stroke="#09090b" strokeWidth="1.2" />
                            </svg>
                          </div>
                          <div className="flex items-baseline gap-1.5 skew-x-12 leading-none">
                            <span
                              className="font-fun font-black text-[10px] sm:text-xs text-[#fde047] uppercase tracking-wider"
                              style={{
                                paintOrder: 'stroke fill',
                                WebkitTextStroke: '2px #09090b',
                              }}
                            >
                              PIZZAS:
                            </span>
                            <span
                              className="font-fun font-black text-sm sm:text-base text-white tracking-wider"
                              style={{
                                paintOrder: 'stroke fill',
                                WebkitTextStroke: '2.5px #09090b',
                                textShadow: '0 1.5px 0 #000000',
                              }}
                            >
                              ×{hud.pizzasLeft ?? 20}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {playMode === 'moto' && (hud.wheelieBalanceRatio ?? 0) > 0.15 && (
                <div className="flex items-center gap-2.5 pointer-events-auto ml-1">
                  <div className="px-2.5 py-1 rounded-xl bg-[#1f0901]/90 border border-[#fde047] flex items-center gap-1.5 shadow">
                    <span className="font-fun font-black text-[10px] text-[#fde047] uppercase">
                      GRAU
                    </span>
                    <div className="w-12 h-2 rounded-full bg-stone-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (hud.wheelieBalanceRatio ?? 0) > 0.72
                            ? 'bg-red-500 animate-pulse'
                            : 'bg-emerald-400'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((hud.wheelieBalanceRatio ?? 0) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Barra de Estamina & Alvo Motoboy exclusiva do Modo Caramelo */}
              {playMode === 'caramelo' && (
                <div className="flex flex-col gap-1.5 pointer-events-auto">
                  <div className="flex items-center gap-2 bg-gradient-to-b from-[#fffbeb] to-[#fde68a] px-3 py-1.5 rounded-xl border-2 border-[#78350f] shadow-[0_3px_0_#78350f]">
                    <span className="text-xs font-fun font-black text-[#78350f] uppercase tracking-wide">
                      {hud.meatBoostActive ? '🥩 TURBO!' : '⚡ GÁS'}
                    </span>
                    <div className="w-24 sm:w-28 h-3 rounded-full bg-[#78350f]/25 border border-[#78350f]/50 overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${
                          hud.meatBoostActive
                            ? 'bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 animate-pulse'
                            : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                        }`}
                        style={{ width: `${Math.max(12, hud.stamina ?? 100)}%` }}
                      />
                    </div>
                  </div>

                  {(() => {
                    const maxMotoHp = hud.targetMotoboyMaxHp ?? 10;
                    const curMotoHp = hud.targetMotoboyHp ?? 10;
                    const isFury = curMotoHp > 0 && curMotoHp <= 5;
                    return (
                      <div className="inline-flex flex-wrap items-center gap-1.5 bg-gradient-to-r from-[#fb923c] to-[#ea580c] px-2.5 py-1 rounded-xl border-2 border-[#fff7ed] shadow-[0_3px_0_#7c2d12]">
                        <span className="font-fun font-black text-[10px] sm:text-xs text-white uppercase tracking-wide cartoon-text-outline">
                          🏍️ MOTOBOY:
                        </span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: maxMotoHp }).map((_, idx) => (
                            <Heart
                              key={idx}
                              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform ${
                                idx < curMotoHp
                                  ? 'text-yellow-200 fill-rose-600 scale-100'
                                  : 'text-orange-950/40 fill-orange-950/25 scale-90'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-mono font-black text-[10px] sm:text-xs text-[#fef08a] cartoon-text-outline">
                          {curMotoHp}/{maxMotoHp}
                        </span>
                        {isFury && (
                          <span className="px-1.5 py-0.5 rounded-md bg-red-700 border border-yellow-200 text-[9px] font-fun font-black text-yellow-200 uppercase animate-pulse">
                            🔥 FUGA RÁPIDA
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Alerta Cômico + Faixa Vermelha no Chão quando o Caramelo prepara o bote no Modo Motoboy */}
              {playMode === 'moto' && hud.carameloAttackWarning && (
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 text-white px-3 py-1.5 rounded-xl border-[2.5px] border-white font-fun font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_4px_0_#7f1d1d] animate-bounce -rotate-2 cartoon-text-outline">
                  <span>🚨 FAIXA VERMELHA NO CHÃO! DESVIE!</span>
                </div>
              )}

              {/* Feedback de Esquiva Perfeita no Modo Motoboy */}
              {playMode === 'moto' && dodgeFeedbackBadge !== null && (
                <div
                  key={dodgeFeedbackBadge}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-white px-3 py-1.5 rounded-xl border-2 border-white font-fun font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_4px_0_#064e3b] animate-bounce cartoon-text-outline"
                >
                  <span>⚡ ESQUIVA PERFEITA! +120 PTS!</span>
                </div>
              )}

              {/* Feedback de Precisão da Mordida no Modo Caramelo */}
              {playMode === 'caramelo' && biteFeedbackBadge && (
                <div
                  key={biteFeedbackBadge.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-fun font-black text-xs sm:text-sm uppercase tracking-wider animate-bounce cartoon-text-outline ${
                    biteFeedbackBadge.tone === 'perfect'
                      ? 'bg-gradient-to-r from-emerald-400 via-green-500 to-cyan-500 text-white border-white shadow-[0_4px_0_#064e3b]'
                      : biteFeedbackBadge.tone === 'good'
                      ? 'bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 text-white border-white shadow-[0_4px_0_#78350f]'
                      : biteFeedbackBadge.tone === 'weak'
                      ? 'bg-gradient-to-r from-orange-400 to-amber-600 text-white border-orange-100 shadow-[0_4px_0_#7c2d12]'
                      : 'bg-gradient-to-r from-red-500 to-rose-700 text-yellow-100 border-rose-200 shadow-[0_4px_0_#4c0519]'
                  }`}
                >
                  <span>{biteFeedbackBadge.text}</span>
                </div>
              )}

              {/* ITEM 3: Removido o "6X COMBO!" de baixo da vida e faixas antigas conforme solicitado! */}
            </div>

            {/* Centro: Limpo sem letreiro por solicitação do usuário */}
            <div />

            {/* Direita: Novo Contador Cartoon Integrado ao HUD — Mostra o Dinheiro da Partida Atual (Reseta ao Jogar Novamente!) */}
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                {/* Pílula Principal de Dinheiro Cartoon Verde-Esmeralda & Ouro (Com Pop Animado da Cor da Nota!) */}
                <div
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-2xl bg-gradient-to-b from-[#bbf7d0] via-[#4ade80] to-[#16a34a] border-[2.5px] border-[#14532d] shadow-[0_4px_0_#14532d,0_8px_16px_rgba(20,83,45,0.32),inset_0_2px_0_rgba(255,255,255,0.82)] transition-all duration-200 ${
                    cashPopActive
                      ? lastCashDenom === 200
                        ? 'scale-115 -translate-y-0.5 ring-4 ring-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.9)]'
                        : lastCashDenom === 100
                        ? 'scale-112 -translate-y-0.5 ring-4 ring-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.85)]'
                        : lastCashDenom === 50
                        ? 'scale-110 -translate-y-0.5 ring-4 ring-orange-300 shadow-[0_0_18px_rgba(251,146,60,0.85)]'
                        : 'scale-110 -translate-y-0.5 ring-4 ring-rose-300 shadow-[0_0_18px_rgba(251,113,133,0.85)]'
                      : 'scale-100'
                  }`}
                  title="Dinheiro coletado nesta partida (reseta ao jogar novamente)"
                >
                  {/* Ícone SVG Maço de Dinheiro Cartoon 3D Inclinado c/ Cinta Creme e Cifrão */}
                  <svg viewBox="0 0 44 34" className="w-7 h-6 sm:w-8 sm:h-6 flex-shrink-0 drop-shadow-[0_2px_0_rgba(20,83,45,0.65)]">
                    <g transform="rotate(-12 22 17)">
                      <rect x="4" y="13" width="34" height="15" rx="3" fill="#15803d" stroke="#052e16" strokeWidth="2.2" />
                      <rect x="4" y="9" width="34" height="15" rx="3" fill="#22c55e" stroke="#052e16" strokeWidth="2.2" />
                      <rect x="4" y="5" width="34" height="15" rx="3" fill="#86efac" stroke="#052e16" strokeWidth="2.2" />
                      <rect x="8" y="8" width="26" height="9" rx="1.8" fill="#16a34a" />
                      <circle cx="12" cy="12.5" r="1.8" fill="#bbf7d0" />
                      <circle cx="30" cy="12.5" r="1.8" fill="#bbf7d0" />
                      <rect x="17.5" y="4.5" width="8.5" height="24" rx="1.5" fill="#fef3c7" stroke="#92400e" strokeWidth="1.8" />
                      <text
                        x="21.8"
                        y="16.2"
                        textAnchor="middle"
                        fill="#052e16"
                        fontSize="9.5"
                        fontWeight="900"
                        fontFamily="Fredoka, Arial, sans-serif"
                      >
                        $
                      </text>
                    </g>
                  </svg>

                  <span
                    className="font-fun font-black text-sm sm:text-lg text-white tracking-wide leading-none"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: '3.2px #052e16',
                      textShadow: '0 2px 0 #052e16',
                    }}
                  >
                    R$ {runCashCollected.toLocaleString('pt-BR')}
                  </span>

                  {/* No Modo Caramelo mostra contador de Ossos Brancos; no Modo Moto mostra as Cédulas */}
                  {playMode === 'caramelo' ? (
                    <div className="flex items-center gap-1 ml-0.5 px-2 py-0.5 rounded-xl bg-[#fffbeb] border-2 border-[#78350f] shadow-[0_2px_0_#78350f]">
                      <svg viewBox="0 0 32 20" className="w-4 h-3 flex-shrink-0">
                        <circle cx="6" cy="6" r="4" fill="#ffffff" stroke="#451a03" strokeWidth="2.2" />
                        <circle cx="6" cy="14" r="4" fill="#ffffff" stroke="#451a03" strokeWidth="2.2" />
                        <circle cx="26" cy="6" r="4" fill="#ffffff" stroke="#451a03" strokeWidth="2.2" />
                        <circle cx="26" cy="14" r="4" fill="#ffffff" stroke="#451a03" strokeWidth="2.2" />
                        <rect x="6" y="6.5" width="20" height="7" rx="3" fill="#ffffff" stroke="#451a03" strokeWidth="2.2" />
                        <rect x="7" y="7.5" width="18" height="5" fill="#ffffff" />
                      </svg>
                      <span className="font-fun font-black text-[11px] text-[#451a03] leading-none">
                        ×{hud.bonesCollected ?? 0}
                      </span>
                    </div>
                  ) : (
                    runCashCollected > 0 && (
                      <div className="hidden md:flex items-center gap-1 ml-0.5 pl-1.5 border-l-2 border-[#14532d]/30">
                        {runBills.n10 > 0 && (
                          <span className="px-1.5 py-0.5 rounded-lg bg-rose-500 border border-white/80 text-white text-[9.5px] font-fun font-black leading-none shadow-sm">
                            10×{runBills.n10}
                          </span>
                        )}
                        {runBills.n50 > 0 && (
                          <span className="px-1.5 py-0.5 rounded-lg bg-orange-400 border border-white/80 text-[#431407] text-[9.5px] font-fun font-black leading-none shadow-sm">
                            50×{runBills.n50}
                          </span>
                        )}
                        {runBills.n100 > 0 && (
                          <span className="px-1.5 py-0.5 rounded-lg bg-sky-500 border border-white/80 text-white text-[9.5px] font-fun font-black leading-none shadow-sm">
                            100×{runBills.n100}
                          </span>
                        )}
                        {runBills.n200 > 0 && (
                          <span className="px-1.5 py-0.5 rounded-lg bg-[#be123c] border border-amber-200 text-[#fef08a] text-[9.5px] font-fun font-black leading-none shadow-sm">
                            200×{runBills.n200}
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>

                {/* Pílula Cartoon Integrada de Distância + Troféu Score (Zero Fundo Preto!) */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-gradient-to-b from-[#fef08a] via-[#fbbf24] to-[#d97706] border-[2.5px] border-[#78350f] shadow-[0_4px_0_#78350f,0_8px_16px_rgba(120,53,15,0.3),inset_0_2px_0_rgba(255,255,255,0.82)]">
                  <span
                    className="font-fun font-black text-xs sm:text-sm text-[#e0f2fe] tracking-wide leading-none"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: '2.8px #0c4a6e',
                      textShadow: '0 1.5px 0 #0c4a6e',
                    }}
                  >
                    {Math.floor(hud.distance)}m
                  </span>
                  <div className="w-0.5 h-4 rounded-full bg-[#78350f]/35" />
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-[#fffbeb] fill-[#f59e0b] stroke-[#78350f] stroke-[2.5] drop-shadow-sm" />
                    <span
                      className="font-fun font-black text-sm sm:text-base text-white leading-none"
                      style={{
                        paintOrder: 'stroke fill',
                        WebkitTextStroke: '3px #78350f',
                        textShadow: '0 2px 0 #78350f',
                      }}
                    >
                      {Math.floor(hud.score)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações da gameplay: PAUSE E ENGRENAGEM EM MADEIRA DOURADA CARTOON */}
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePause}
                  className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#fcd34d] via-[#f59e0b] to-[#b45309] border-[2.5px] border-[#78350f] shadow-[0_4px_0_#78350f,inset_0_2px_0_rgba(255,255,255,0.75)] flex items-center justify-center cursor-pointer active:translate-y-0.5 transition-all"
                  title="Pausar Corrida (P ou Esc)"
                  aria-label="Pausa"
                >
                  {phase === 'playing' ? (
                    <Pause className="w-5 h-5 text-[#451a03] fill-[#451a03] stroke-[2.5]" />
                  ) : (
                    <Play className="w-5 h-5 text-[#14532d] fill-[#22c55e] stroke-[2.5]" />
                  )}
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setPhase('paused');
                    setIsSettingsOpen(true);
                  }}
                  className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#fcd34d] via-[#f59e0b] to-[#b45309] border-[2.5px] border-[#78350f] shadow-[0_4px_0_#78350f,inset_0_2px_0_rgba(255,255,255,0.75)] flex items-center justify-center cursor-pointer active:translate-y-0.5 transition-all"
                  title="Configurações do Jogo"
                  aria-label="Configurações"
                >
                  <Settings className="w-5 h-5 text-[#451a03] stroke-[2.6]" />
                </button>
              </div>
            </div>
          </div>

          {/* BANNER CÔMICO DO GRAND FINALE DE POEIRA CARTOON (0 VIDAS DO MOTOBOY — ITEM 6) */}
          {playMode === 'caramelo' && hud.brawlFinaleActive && phase === 'playing' && (
            <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
              <div className="cartoon-wood-board px-5 py-2 rounded-2xl border-[3px] border-[#fde047] shadow-[0_8px_24px_rgba(0,0,0,0.85)] animate-bounce">
                <span
                  className="font-fun font-black text-base sm:text-2xl text-[#fde047] uppercase tracking-wider leading-none"
                  style={{
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: '4px #1f0901',
                    textShadow: '0 3px 0 #7f1d1d',
                  }}
                >
                  💥 BRIGA NA POEIRA! MOTOBOY CAPTURADO!
                </span>
              </div>
            </div>
          )}

          {/* ITEM 9: BANNER DE FIM DAS PIZZAS & FUGA CINEMATOGRÁFICA DO CARAMELO */}
          {playMode === 'moto' && hud.missionVictorySequenceActive && phase === 'playing' && (
            <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
              <div className="cartoon-wood-board px-6 py-3 rounded-2xl border-[3px] border-[#4ade80] shadow-[0_10px_28px_rgba(0,0,0,0.85)] animate-bounce text-center">
                <span
                  className="font-fun font-black text-base sm:text-2xl text-[#86efac] uppercase tracking-wider leading-none block"
                  style={{
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: '4px #052e16',
                    textShadow: '0 3px 0 #052e16',
                  }}
                >
                  🍕 FIM DAS PIZZAS! ACELERANDO E FUGINDO DO CARAMELO!
                </span>
              </div>
            </div>
          )}

          {/* POPUP FLUIDO E SATISFATÓRIO DE ENTREGA DE PIZZA NA TELA (1/30, 2/30, ETC.) */}
          {deliveryProgressPopup && (
            <div
              key={deliveryProgressPopup.id}
              className="fixed top-24 sm:top-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none select-none flex flex-col items-center"
              style={{
                animation: 'deliveryPopSatisfying 1.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              <div className="relative flex items-center gap-2.5 px-6 py-2.5 rounded-2xl bg-[#09090b]/95 border-[3.5px] border-white outline outline-[4px] outline-[#14532d] shadow-[0_8px_25px_rgba(0,0,0,0.85),0_0_20px_rgba(34,197,94,0.6)] -skew-x-6 backdrop-blur-md">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center skew-x-6 animate-bounce">
                  <svg viewBox="0 0 36 36" className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    <path
                      d="M6 10 Q18 3 30 10 L18 32 Z"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.5 12 Q18 6.5 27.5 12 L18 29.5 Z"
                      fill="#fde047"
                      stroke="#09090b"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <circle cx="15" cy="15.5" r="2.2" fill="#dc2626" stroke="#09090b" strokeWidth="1.2" />
                    <circle cx="21" cy="16.5" r="2.0" fill="#dc2626" stroke="#09090b" strokeWidth="1.2" />
                    <circle cx="18" cy="22" r="2.0" fill="#dc2626" stroke="#09090b" strokeWidth="1.2" />
                  </svg>
                </div>

                <div className="flex flex-col items-center skew-x-6 leading-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-300 text-xs sm:text-sm">✨</span>
                    <span
                      className="font-fun font-black text-xs sm:text-sm text-[#86efac] uppercase tracking-widest"
                      style={{
                        paintOrder: 'stroke fill',
                        WebkitTextStroke: '2.5px #052e16',
                      }}
                    >
                      ENTREGA FEITA! +R$ 150
                    </span>
                    <span className="text-yellow-300 text-xs sm:text-sm">✨</span>
                  </div>

                  <span
                    className="font-fun font-black text-2xl sm:text-4xl text-[#4ade80] tracking-wider mt-0.5"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: '4.5px #052e16',
                      textShadow: '0 3px 0 #052e16, 0 0 16px rgba(74,222,128,0.7)',
                    }}
                  >
                    {deliveryProgressPopup.delivered}/{deliveryProgressPopup.goal}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ITEM 3: BARRA HORIZONTAL DE DESAFIO DE PRECISÃO DA MORDIDA (VERMELHO | LARANJA | AMARELO | VERDE) */}
          {playMode === 'caramelo' &&
            Boolean(hud.bitePrecisionActive) &&
            !hud.brawlFinaleActive &&
            phase === 'playing' && (
              <div className="absolute bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 select-none pointer-events-auto">
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    controlTriggerRef.current?.bite?.();
                  }}
                  className="group flex flex-col items-center gap-1.5 cursor-pointer touch-none active:scale-95 transition-transform"
                  aria-label="Confirmar precisão da mordida"
                >
                  {/* Placa Superior de Instrução Rápida */}
                  <div className="px-3.5 py-1 rounded-full bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#b45309] border-[2.5px] border-[#1f0901] shadow-[0_4px_0_#1f0901] flex items-center gap-1.5">
                    <span className="font-fun font-black text-[11px] sm:text-xs text-[#1f0901] uppercase tracking-wider leading-none">
                      🎯 PARE NO VERDE! TOQUE EM MORDER!
                    </span>
                  </div>

                  {/* Trilha Horizontal 4 Cores + Marcador Oscilante Acima da Barra */}
                  <div className="relative pt-4 pb-1 px-1">
                    {/* Marcador Oscilante Contínuo Acima e Através da Barra */}
                    <div
                      className="absolute top-0 bottom-0 z-20 pointer-events-none flex flex-col items-center"
                      style={{
                        left: `${Math.min(99, Math.max(1, (hud.bitePrecisionMarker ?? 0.5) * 100)).toFixed(2)}%`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      {/* Seta/Presa Cartoon Acima da Barra */}
                      <svg
                        viewBox="0 0 28 22"
                        className="w-6 h-5 -mt-0.5 drop-shadow-[0_3px_2px_rgba(0,0,0,0.85)] flex-shrink-0"
                      >
                        <polygon
                          points="3,2 25,2 14,20"
                          fill="#ffffff"
                          stroke="#1f0901"
                          strokeWidth="3.2"
                          strokeLinejoin="round"
                        />
                        <polygon points="8,5 20,5 14,15" fill="#38bdf8" />
                      </svg>
                      {/* Agulha Vertical de Precisão */}
                      <div className="w-1.5 flex-1 rounded-full bg-white border-[2px] border-[#1f0901] shadow-[0_0_10px_rgba(255,255,255,0.95)] -mt-1" />
                    </div>

                    {/* Moldura Cartoon da Barra Dividida Exatamente nas Regiões do Motor (16 | 14 | 11 | 18 | 11 | 14 | 16) */}
                    <div className="relative w-[268px] sm:w-[336px] h-6 sm:h-7 rounded-full border-[3.5px] border-[#1f0901] shadow-[0_6px_0_#1f0901,0_10px_22px_rgba(0,0,0,0.85)] overflow-hidden flex">
                      {/* Vermelho Esquerdo (16% — Erro / Fuga) */}
                      <div
                        style={{ width: '16%' }}
                        className="h-full bg-gradient-to-b from-[#f87171] via-[#ef4444] to-[#b91c1c] border-r-2 border-[#1f0901]/60"
                      />
                      {/* Laranja Esquerdo (14% — Fraco) */}
                      <div
                        style={{ width: '14%' }}
                        className="h-full bg-gradient-to-b from-[#fdba74] via-[#f97316] to-[#c2410c] border-r-2 border-[#1f0901]/60"
                      />
                      {/* Amarelo Esquerdo (11% — Bom) */}
                      <div
                        style={{ width: '11%' }}
                        className="h-full bg-gradient-to-b from-[#fef08a] via-[#facc15] to-[#ca8a04] border-r-2 border-[#1f0901]/70"
                      />
                      {/* VERDE CENTRAL (18% — Acerto Perfeito!) */}
                      <div
                        style={{ width: '18%' }}
                        className="relative h-full bg-gradient-to-b from-[#86efac] via-[#22c55e] to-[#15803d] border-r-2 border-[#1f0901]/70 flex items-center justify-center shadow-[inset_0_0_10px_rgba(255,255,255,0.65)]"
                      >
                        <div className="w-1 h-3.5 rounded-full bg-white/90 shadow-sm" />
                      </div>
                      {/* Amarelo Direito (11% — Bom) */}
                      <div
                        style={{ width: '11%' }}
                        className="h-full bg-gradient-to-b from-[#fef08a] via-[#facc15] to-[#ca8a04] border-r-2 border-[#1f0901]/60"
                      />
                      {/* Laranja Direito (14% — Fraco) */}
                      <div
                        style={{ width: '14%' }}
                        className="h-full bg-gradient-to-b from-[#fdba74] via-[#f97316] to-[#c2410c] border-r-2 border-[#1f0901]/60"
                      />
                      {/* Vermelho Direito (16% — Erro / Fuga) */}
                      <div
                        style={{ width: '16%' }}
                        className="h-full bg-gradient-to-b from-[#f87171] via-[#ef4444] to-[#b91c1c]"
                      />

                      {/* Brilho Vítreo Cartoon no Topo da Barra */}
                      <div className="absolute inset-x-1 top-0.5 h-2 rounded-full bg-white/35 pointer-events-none" />
                    </div>
                  </div>
                </button>
              </div>
            )}

          {/* CONTROLES MOBILE & VELOCÍMETRO CIRCULAR KM/H ESTILO MADEIRA CARTOON */}
          {showOnScreenControls && phase === 'playing' && !hud.brawlFinaleActive && (
            <div
              style={{ opacity: touchControlsOpacity }}
              className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 right-3 sm:right-5 flex items-end justify-between pointer-events-none z-20 select-none transition-opacity duration-200"
            >
              {/* LADO ESQUERDO: VELOCÍMETRO CIRCULAR KM/H EM CIMA + BOTÕES CIRCULARES (<) E (>) EMBAIXO */}
              <div className="flex flex-col items-start gap-2.5 sm:gap-3 pointer-events-auto">
                {/* Ícone Circular de Velocidade (KM/H) com Arco Dinâmico Redline */}
                {(() => {
                  const displaySpeed = Math.max(0, Math.round(hud.speed));
                  const arcLen = 142.6;
                  const fillRatio = Math.min(1, Math.max(0.1, (displaySpeed - 45) / 175));
                  const dashOffset = arcLen * (1 - fillRatio);
                  return (
                    <div
                      className="relative w-[92px] h-[92px] sm:w-[106px] sm:h-[106px] ml-1 drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]"
                      aria-label={`Velocímetro ${displaySpeed} km/h`}
                    >
                      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="speedoWoodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#451a03" />
                            <stop offset="55%" stopColor="#271004" />
                            <stop offset="100%" stopColor="#140802" />
                          </linearGradient>
                          <linearGradient id="speedoArcGrad" x1="65%" y1="95%" x2="25%" y2="5%">
                            <stop offset="0%" stopColor="#fde047" />
                            <stop offset="58%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#ef4444" />
                          </linearGradient>
                        </defs>

                        {/* Trilha do arco externo em madeira escura + borda preta */}
                        <path
                          d="M 73.2 88.0 A 43 43 0 1 1 39.7 9.1"
                          fill="none"
                          stroke="#1c0a02"
                          strokeWidth="10.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 73.2 88.0 A 43 43 0 1 1 39.7 9.1"
                          fill="none"
                          stroke="rgba(254, 243, 199, 0.22)"
                          strokeWidth="6.5"
                          strokeLinecap="round"
                        />

                        {/* Arco de progresso vivo (Amarelo -> Laranja -> Vermelho Redline no topo!) */}
                        <path
                          d="M 73.2 88.0 A 43 43 0 1 1 39.7 9.1"
                          fill="none"
                          stroke="url(#speedoArcGrad)"
                          strokeWidth="6.8"
                          strokeLinecap="round"
                          strokeDasharray={arcLen}
                          strokeDashoffset={dashOffset}
                          style={{ transition: 'stroke-dashoffset 90ms linear' }}
                        />

                        {/* Marcação vermelha de giro alto na ponta superior */}
                        <path
                          d="M 29.0 14.3 A 43 43 0 0 1 39.7 9.1"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="7"
                          strokeOpacity={displaySpeed >= 165 ? 1 : 0.45}
                          strokeLinecap="butt"
                        />

                        {/* Mostrador circular entalhado em madeira e aro dourado */}
                        <circle
                          cx="53"
                          cy="50"
                          r="33.5"
                          fill="url(#speedoWoodGrad)"
                          stroke="#d97706"
                          strokeWidth="3.2"
                        />
                        <circle
                          cx="53"
                          cy="50"
                          r="30.2"
                          fill="none"
                          stroke="#451a03"
                          strokeWidth="1.6"
                        />

                        {/* Divisórias de gomos no arco igual velocímetro esportivo */}
                        <line x1="16" y1="68" x2="23" y2="64" stroke="#1c0a02" strokeWidth="2.2" />
                        <line x1="10" y1="45" x2="18" y2="46" stroke="#1c0a02" strokeWidth="2.2" />
                        <line x1="20" y1="22" x2="26" y2="27" stroke="#1c0a02" strokeWidth="2.2" />
                      </svg>

                      {/* Leitura Numérica Digital Cartoon Centralizada */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pl-1.5 pt-0.5 pointer-events-none">
                        <span
                          className={`font-fun font-black text-2xl sm:text-[27px] leading-none tracking-tight ${
                            displaySpeed >= 175 ? 'text-[#fca5a5]' : 'text-white'
                          }`}
                          style={{
                            paintOrder: 'stroke fill',
                            WebkitTextStroke: '3.5px #1f0901',
                            textShadow: '0 2px 0 #1f0901, 0 4px 6px rgba(0,0,0,0.85)',
                          }}
                        >
                          {displaySpeed}
                        </span>
                        <span
                          className="font-fun font-black text-[9px] sm:text-[10px] text-[#fde047] tracking-widest uppercase mt-0.5 leading-none"
                          style={{
                            paintOrder: 'stroke fill',
                            WebkitTextStroke: '2px #1f0901',
                          }}
                        >
                          KM/H
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Par de Botões Circulares de Direção: (<) Virar Esquerda e (>) Virar Direita */}
                <div className="flex items-center gap-3 sm:gap-3.5">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if (invertTouch) {
                        controlTriggerRef.current?.setHoldRight?.(true);
                      } else {
                        controlTriggerRef.current?.setHoldLeft?.(true);
                      }
                    }}
                    onPointerUp={() => {
                      controlTriggerRef.current?.setHoldLeft?.(false);
                      controlTriggerRef.current?.setHoldRight?.(false);
                    }}
                    onPointerLeave={() => {
                      controlTriggerRef.current?.setHoldLeft?.(false);
                      controlTriggerRef.current?.setHoldRight?.(false);
                    }}
                    onPointerCancel={() => {
                      controlTriggerRef.current?.setHoldLeft?.(false);
                      controlTriggerRef.current?.setHoldRight?.(false);
                    }}
                    className="group w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full bg-gradient-to-b from-[#9a3412] via-[#7c2d12] to-[#451a03] border-[3px] border-[#fbbf24] shadow-[0_6px_0_#1f0901,0_10px_18px_rgba(0,0,0,0.8),inset_0_2px_0_rgba(255,255,255,0.45)] active:translate-y-1 active:shadow-[0_2px_0_#1f0901] flex items-center justify-center transition-all touch-none cursor-pointer"
                    aria-label="Virar para Esquerda"
                  >
                    <div className="w-[82%] h-[82%] rounded-full bg-gradient-to-b from-[#451a03]/80 to-[#271004]/90 border border-amber-400/40 flex items-center justify-center group-active:bg-amber-500/30">
                      <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow">
                        <path
                          d="M29 11 L16 24 L29 37"
                          fill="none"
                          stroke="#1f0901"
                          strokeWidth="9.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M29 11 L16 24 L29 37"
                          fill="none"
                          stroke="#fde047"
                          strokeWidth="5.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </button>

                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if (invertTouch) {
                        controlTriggerRef.current?.setHoldLeft?.(true);
                      } else {
                        controlTriggerRef.current?.setHoldRight?.(true);
                      }
                    }}
                    onPointerUp={() => {
                      controlTriggerRef.current?.setHoldLeft?.(false);
                      controlTriggerRef.current?.setHoldRight?.(false);
                    }}
                    onPointerLeave={() => {
                      controlTriggerRef.current?.setHoldLeft?.(false);
                      controlTriggerRef.current?.setHoldRight?.(false);
                    }}
                    onPointerCancel={() => {
                      controlTriggerRef.current?.setHoldLeft?.(false);
                      controlTriggerRef.current?.setHoldRight?.(false);
                    }}
                    className="group w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-full bg-gradient-to-b from-[#9a3412] via-[#7c2d12] to-[#451a03] border-[3px] border-[#fbbf24] shadow-[0_6px_0_#1f0901,0_10px_18px_rgba(0,0,0,0.8),inset_0_2px_0_rgba(255,255,255,0.45)] active:translate-y-1 active:shadow-[0_2px_0_#1f0901] flex items-center justify-center transition-all touch-none cursor-pointer"
                    aria-label="Virar para Direita"
                  >
                    <div className="w-[82%] h-[82%] rounded-full bg-gradient-to-b from-[#451a03]/80 to-[#271004]/90 border border-amber-400/40 flex items-center justify-center group-active:bg-amber-500/30">
                      <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow">
                        <path
                          d="M19 11 L32 24 L19 37"
                          fill="none"
                          stroke="#1f0901"
                          strokeWidth="9.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M19 11 L32 24 L19 37"
                          fill="none"
                          stroke="#fde047"
                          strokeWidth="5.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>

              {/* LADO DIREITO: MODO MOTO (MANETE + GRAU) vs MODO CARAMELO (1 ÚNICO BOTÃO DE MORDIDA!) */}
              <div className="flex items-end gap-3 sm:gap-4 pointer-events-auto">
                {playMode === 'caramelo' ? (
                  /* ÚNICO BOTÃO DE MORDIDA ("MORDER" / "TRAVAR!") NO MODO CARAMELO */
                  (() => {
                    const isPrecision = Boolean(hud.bitePrecisionActive);
                    const isReady = Boolean(hud.biteReady) || isPrecision;
                    const cdRatio = hud.biteCooldownRatio ?? 0;
                    return (
                      <button
                        type="button"
                        disabled={!isReady}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          if (isReady) {
                            controlTriggerRef.current?.bite?.();
                          }
                        }}
                        className={`relative group w-[86px] h-[86px] sm:w-[98px] sm:h-[98px] rounded-full flex items-center justify-center transition-all touch-none ${
                          isPrecision
                            ? 'bg-gradient-to-b from-[#86efac] via-[#22c55e] to-[#0284c7] border-[4px] border-white shadow-[0_7px_0_#064e3b,0_0_30px_rgba(34,197,94,0.98),inset_0_3px_0_rgba(255,255,255,0.9)] scale-110 active:translate-y-1 active:scale-95 cursor-pointer'
                            : isReady
                            ? 'bg-gradient-to-b from-[#fde047] via-[#f97316] to-[#dc2626] border-[4px] border-white shadow-[0_7px_0_#7f1d1d,0_0_28px_rgba(249,115,22,0.95),inset_0_3px_0_rgba(255,255,255,0.8)] animate-pulse scale-105 active:translate-y-1 active:scale-95 cursor-pointer'
                            : 'bg-gradient-to-b from-[#78350f]/75 via-[#451a03]/80 to-[#271004]/85 border-[3px] border-amber-700/50 shadow-[0_5px_0_#1f0901] opacity-60 saturate-50 cursor-not-allowed'
                        }`}
                        aria-label="Morder Pernas do Motoboy (Espaço ou Q)"
                        title={
                          isPrecision
                            ? 'TRAVAR MARCADOR NO VERDE AGORA! (Espaço ou Q)'
                            : isReady
                            ? 'MORDER AGORA! (Espaço ou Q)'
                            : 'Aproxime-se do Motoboy para ativar a Mordida!'
                        }
                      >
                        {isReady && (
                          <span
                            className={`absolute -inset-1.5 rounded-full border-[3px] ${
                              isPrecision ? 'border-emerald-200' : 'border-[#fef08a]'
                            } opacity-80 animate-ping pointer-events-none`}
                          />
                        )}

                        <div
                          className={`w-[83%] h-[83%] rounded-full flex flex-col items-center justify-center border-2 ${
                            isPrecision
                              ? 'bg-gradient-to-b from-[#16a34a] via-[#15803d] to-[#052e16] border-[#fef08a]'
                              : isReady
                              ? 'bg-gradient-to-b from-[#dc2626] via-[#991b1b] to-[#450a0a] border-[#fde047]'
                              : 'bg-gradient-to-b from-[#451a03] to-[#1c0a02] border-amber-800/40'
                          }`}
                        >
                          {/* Ícone Cartoon de Mandíbula / Presas de Mordida */}
                          <svg viewBox="0 0 64 52" className="w-11 h-9 sm:w-13 sm:h-10 drop-shadow">
                            {/* Gengiva / Boca Cartoon */}
                            <path
                              d="M10 14 Q32 4 54 14 L50 23 Q32 17 14 23 Z"
                              fill={isPrecision ? '#4ade80' : isReady ? '#fb7185' : '#a8a29e'}
                              stroke="#1f0901"
                              strokeWidth="3"
                              strokeLinejoin="round"
                            />
                            {/* Presas Superiores Afiadas */}
                            <path
                              d="M14 18 L19 33 L25 20 L32 28 L39 20 L45 33 L50 18 Z"
                              fill="#ffffff"
                              stroke="#1f0901"
                              strokeWidth="3"
                              strokeLinejoin="round"
                            />
                            {/* Presas Inferiores */}
                            <path
                              d="M18 44 L23 31 L29 40 L35 40 L41 31 L46 44 Z"
                              fill="#fef3c7"
                              stroke="#1f0901"
                              strokeWidth="2.8"
                              strokeLinejoin="round"
                            />
                          </svg>

                          <span
                            className={`font-fun font-black text-[9px] sm:text-[10.5px] tracking-wider uppercase -mt-0.5 leading-none ${
                              isReady ? 'text-[#fef08a]' : 'text-amber-200/75'
                            }`}
                            style={{
                              paintOrder: 'stroke fill',
                              WebkitTextStroke: '2.4px #1f0901',
                            }}
                          >
                            {isPrecision
                              ? 'TRAVAR!'
                              : isReady
                              ? 'MORDER!'
                              : cdRatio > 0.05
                              ? 'RECARGA'
                              : 'MORDER'}
                          </span>
                        </div>
                      </button>
                    );
                  })()
                ) : (
                  <>
                    {/* Botão Circular Manete da Moto (Freio / Deslizar) */}
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        controlTriggerRef.current?.roll();
                      }}
                      className="group w-15 h-15 sm:w-[66px] sm:h-[66px] rounded-full bg-gradient-to-b from-[#9a3412] via-[#7c2d12] to-[#451a03] border-[3px] border-[#fbbf24] shadow-[0_6px_0_#1f0901,0_10px_18px_rgba(0,0,0,0.8),inset_0_2px_0_rgba(255,255,255,0.45)] active:translate-y-1 active:shadow-[0_2px_0_#1f0901] flex items-center justify-center transition-all touch-none cursor-pointer"
                      aria-label="Manete de Freio / Abaixar"
                      title="Freio / Abaixar (S)"
                    >
                      <div className="w-[82%] h-[82%] rounded-full bg-gradient-to-b from-[#451a03]/80 to-[#271004]/90 border border-amber-400/40 flex items-center justify-center group-active:bg-amber-500/30">
                        <svg viewBox="0 0 64 64" className="w-9 h-9 sm:w-10 sm:h-10 drop-shadow">
                          <path
                            d="M14 21 C22 25, 32 24, 42 22 L49 26 L49 32"
                            fill="none"
                            stroke="#1f0901"
                            strokeWidth="7.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14 21 C22 25, 32 24, 42 22 L49 26 L49 32"
                            fill="none"
                            stroke="#fef3c7"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="13" cy="20.5" r="4.5" fill="#fde047" stroke="#1f0901" strokeWidth="2.5" />
                          <rect
                            x="13"
                            y="34"
                            width="28"
                            height="11"
                            rx="3"
                            fill="#f59e0b"
                            stroke="#1f0901"
                            strokeWidth="3"
                          />
                          <rect
                            x="41"
                            y="32"
                            width="10"
                            height="15"
                            rx="2.5"
                            fill="#fde047"
                            stroke="#1f0901"
                            strokeWidth="3"
                          />
                        </svg>
                      </div>
                    </button>

                    {/* Botão Circular Cartoon de JOGAR PIZZA / ENTREGAR */}
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        controlTriggerRef.current?.throwPizza?.();
                      }}
                      className={`relative group w-15 h-15 sm:w-[68px] sm:h-[68px] rounded-full flex items-center justify-center transition-all touch-none cursor-pointer ${
                        hud.inDeliveryZone
                          ? 'bg-gradient-to-b from-[#22c55e] via-[#16a34a] to-[#14532d] border-[3.5px] border-[#fde047] shadow-[0_7px_0_#052e16,0_0_24px_rgba(34,197,94,0.95),inset_0_2px_0_rgba(255,255,255,0.7)] animate-pulse scale-105 active:scale-95 active:translate-y-1'
                          : 'bg-gradient-to-b from-[#f59e0b] via-[#d97706] to-[#7c2d12] border-[3px] border-[#fbbf24] shadow-[0_6px_0_#1f0901,0_10px_18px_rgba(0,0,0,0.8),inset_0_2px_0_rgba(255,255,255,0.45)] active:translate-y-1 active:shadow-[0_2px_0_#1f0901]'
                      }`}
                      aria-label="Jogar Pizza (Q)"
                      title="Arremessar Pizza no Cliente (Q)"
                    >
                      {/* Anel pulsante quando estiver na Zona de Entrega */}
                      {hud.inDeliveryZone && (
                        <span className="absolute -inset-1 rounded-full border-2 border-emerald-300 opacity-75 animate-ping pointer-events-none" />
                      )}

                      {/* Badge com Pizzas Restantes */}
                      {(hud.pizzasLeft ?? 0) > 0 && (
                        <div className="absolute -top-1.5 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-600 border border-white text-white font-fun font-black text-[10px] leading-none flex items-center justify-center shadow-md">
                          {hud.pizzasLeft}
                        </div>
                      )}

                      <div className="w-[82%] h-[82%] rounded-full bg-gradient-to-b from-[#451a03]/85 to-[#271004]/95 border border-amber-400/40 flex flex-col items-center justify-center group-active:bg-amber-500/30">
                        {/* Desenho Cartoon de Fatia de Pizza (Crosta Dourada, Molho, Queijo Derretido, Calabresa e Azeitona) */}
                        <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow">
                          {/* Crosta da Massa no Topo */}
                          <path
                            d="M 8 13 Q 24 9 40 13 C 38 17, 36 17, 34 16 Q 24 13 14 16 C 12 17, 10 17, 8 13 Z"
                            fill="#b45309"
                            stroke="#1f0901"
                            strokeWidth="2.4"
                            strokeLinejoin="round"
                          />
                          {/* Molho de Tomate Vermelho */}
                          <path
                            d="M 10 15 L 24 43 L 38 15 Q 24 11 10 15 Z"
                            fill="#dc2626"
                            stroke="#1f0901"
                            strokeWidth="2.2"
                            strokeLinejoin="round"
                          />
                          {/* Queijo Amarelo Derretido */}
                          <path
                            d="M 12 17 Q 15 22 17 21 Q 20 27 22 25 Q 24 37 24 41 Q 25 35 28 27 Q 30 25 32 28 Q 34 22 36 17 Q 24 13 12 17 Z"
                            fill="#fde047"
                            stroke="#1f0901"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                          {/* Rodelas de Calabresa */}
                          <circle cx="21" cy="22" r="3.2" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.2" />
                          <circle cx="27" cy="27" r="2.8" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.2" />
                          <circle cx="24" cy="34" r="2.4" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.2" />
                          {/* Azeitona Preta */}
                          <circle cx="28" cy="19" r="1.8" fill="#18181b" stroke="#09090b" strokeWidth="0.8" />
                          <circle cx="18" cy="28" r="1.6" fill="#18181b" stroke="#09090b" strokeWidth="0.8" />
                        </svg>
                        <span
                          className={`font-fun font-black text-[7.5px] sm:text-[8.5px] tracking-wider uppercase -mt-0.5 cartoon-text-outline ${
                            hud.inDeliveryZone ? 'text-[#86efac]' : 'text-[#fef08a]'
                          }`}
                        >
                          PIZZA
                        </span>
                      </div>
                    </button>

                    {/* Botão Circular Maior de EMPINAR / GRAU (^) — Suporta Segurar para Grau Fluido Contínuo! */}
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        controlTriggerRef.current?.setHoldWheelie?.(true);
                      }}
                      onPointerUp={() => {
                        controlTriggerRef.current?.setHoldWheelie?.(false);
                      }}
                      onPointerLeave={() => {
                        controlTriggerRef.current?.setHoldWheelie?.(false);
                      }}
                      onPointerCancel={() => {
                        controlTriggerRef.current?.setHoldWheelie?.(false);
                      }}
                      className="group w-[74px] h-[74px] sm:w-[84px] sm:h-[84px] rounded-full bg-gradient-to-b from-[#fbbf24] via-[#d97706] to-[#7c2d12] border-[3.5px] border-[#fef08a] shadow-[0_7px_0_#2e1005,0_12px_22px_rgba(0,0,0,0.85),inset_0_3px_0_rgba(255,255,255,0.65)] active:translate-y-1 active:shadow-[0_2px_0_#2e1005] flex items-center justify-center transition-all touch-none cursor-pointer"
                      aria-label="Empinar Moto no Grau (Q)"
                      title="Segure para Empinar no Grau (Q)"
                    >
                      <div className="w-[83%] h-[83%] rounded-full bg-gradient-to-b from-[#7c2d12] via-[#451a03] to-[#271004] border-2 border-[#fbbf24]/70 flex flex-col items-center justify-center group-active:from-[#b45309] group-active:to-[#451a03]">
                        <svg viewBox="0 0 64 48" className="w-10 h-8 sm:w-12 sm:h-9 drop-shadow">
                          <path
                            d="M12 34 L32 15 L52 34"
                            fill="none"
                            stroke="#1f0901"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 34 L32 15 L52 34"
                            fill="none"
                            stroke="#fde047"
                            strokeWidth="7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="font-fun font-black text-[8px] sm:text-[9px] text-[#fef08a] tracking-widest uppercase -mt-1 cartoon-text-outline">
                          GRAU
                        </span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          3. MODAL DE PAUSA DO JOGO ("JOGO PAUSADO")
          ========================================================================= */}
      {phase === 'paused' && gameState === 'PLAYING' && !isSettingsOpen && !showQuitConfirm && (
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
                onClick={() => setPhase('playing')}
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
                onClick={restartRun}
                className="cartoon-btn-steel w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RotateCcw className="w-4 h-4 text-amber-300" />
                <span>Reiniciar Corrida</span>
              </button>

              <button
                onClick={() => setShowQuitConfirm(true)}
                className="cartoon-btn-red w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Home className="w-4 h-4" />
                <span>Sair para o Menu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. MODAL DE CONFIRMAÇÃO DE SAÍDA ("ABANDONAR PARTIDA?")
          ========================================================================= */}
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
                Ao sair para o menu agora, a corrida atual será encerrada.
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

      {/* =========================================================================
          5. MODAL DE CONFIGURAÇÕES COMPLETO COM 4 ABAS
          ========================================================================= */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="cartoon-wood-board max-w-lg w-full p-3.5 sm:p-5 relative text-left text-white max-h-[92vh] flex flex-col gap-3 my-auto shadow-2xl">
            <SteelCornerBrackets size="lg" />

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

              <div className="cartoon-wood-plank py-1 px-3 rounded-lg text-center text-xs font-black text-amber-200 cartoon-text-outline">
                Personalize jogabilidade, gráficos, som, clima e área do desenvolvedor
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1.5 p-1 bg-stone-950/70 rounded-2xl border-2 border-[#5f7d9c] shadow-inner">
              <button
                onClick={() => setSettingsTab('gameplay')}
                className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                  settingsTab === 'gameplay' ? 'cartoon-btn-gold shadow-lg' : 'cartoon-btn-steel'
                }`}
              >
                <SteelRivet className="top-1 left-1 w-1 h-1" />
                <SteelRivet className="top-1 right-1 w-1 h-1" />
                <span className="text-sm">🎮</span>
                <span className="text-[9.5px] sm:text-xs">CONTROLES</span>
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
                <span className="text-[9.5px] sm:text-xs">GRÁFICOS</span>
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
                <span className="text-[9.5px] sm:text-xs">ÁUDIO</span>
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
                <span className="text-[9.5px] sm:text-xs">CLIMA</span>
              </button>

              <button
                onClick={() => setSettingsTab('dev')}
                className={`py-2 px-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                  settingsTab === 'dev' ? 'cartoon-btn-gold shadow-lg' : 'cartoon-btn-steel'
                }`}
              >
                <SteelRivet className="top-1 left-1 w-1 h-1" />
                <SteelRivet className="top-1 right-1 w-1 h-1" />
                <span className="text-sm">🛠️</span>
                <span className="text-[9.5px] sm:text-xs">DEV</span>
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1 scrollbar-thin">
              {settingsTab === 'gameplay' && (
                <>
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

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                      <button
                        onClick={() => {
                          const wasExtreme = difficulty === 'extreme';
                          setDifficulty('easy');
                          if (selectedMapId === 'inferno') {
                            const fallback = lastNormalMapIdRef.current || 'favela';
                            setSelectedMapId(fallback);
                            try {
                              localStorage.setItem('caramelo_selected_map_id', fallback);
                            } catch {}
                          }
                          if (wasExtreme && gameState === 'IDLE') sound.setMenuExtremeMode(false);
                          try {
                            localStorage.setItem('caramelo_difficulty', 'easy');
                          } catch {}
                        }}
                        className={`p-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                          difficulty === 'easy' ? 'cartoon-btn-green ring-4 ring-emerald-400/50' : 'cartoon-btn-steel opacity-80'
                        }`}
                      >
                        <span className="text-base">🚗</span>
                        <span className="text-xs">FÁCIL</span>
                        <span className="text-[8px] font-bold opacity-95">20 🍕 • 10 ❤️</span>
                      </button>

                      <button
                        onClick={() => {
                          const wasExtreme = difficulty === 'extreme';
                          setDifficulty('medium');
                          if (selectedMapId === 'inferno') {
                            const fallback = lastNormalMapIdRef.current || 'favela';
                            setSelectedMapId(fallback);
                            try {
                              localStorage.setItem('caramelo_selected_map_id', fallback);
                            } catch {}
                          }
                          if (wasExtreme && gameState === 'IDLE') sound.setMenuExtremeMode(false);
                          try {
                            localStorage.setItem('caramelo_difficulty', 'medium');
                          } catch {}
                        }}
                        className={`p-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                          difficulty === 'medium' ? 'cartoon-btn-gold ring-4 ring-amber-400/50' : 'cartoon-btn-steel opacity-80'
                        }`}
                      >
                        <span className="text-base">🚖</span>
                        <span className="text-xs">MÉDIO</span>
                        <span className="text-[8px] font-bold opacity-95">40 🍕 • 5 ❤️</span>
                      </button>

                      <button
                        onClick={() => {
                          const wasExtreme = difficulty === 'extreme';
                          setDifficulty('hard');
                          if (selectedMapId === 'inferno') {
                            const fallback = lastNormalMapIdRef.current || 'favela';
                            setSelectedMapId(fallback);
                            try {
                              localStorage.setItem('caramelo_selected_map_id', fallback);
                            } catch {}
                          }
                          if (wasExtreme && gameState === 'IDLE') sound.setMenuExtremeMode(false);
                          try {
                            localStorage.setItem('caramelo_difficulty', 'hard');
                          } catch {}
                        }}
                        className={`p-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                          difficulty === 'hard' ? 'cartoon-btn-red ring-4 ring-rose-500/50' : 'cartoon-btn-steel opacity-80'
                        }`}
                      >
                        <span className="text-base">🚘</span>
                        <span className="text-xs">DIFÍCIL</span>
                        <span className="text-[8px] font-bold opacity-95">90 🍕 • 4 ❤️</span>
                      </button>

                      <button
                        onClick={() => {
                          if (difficulty === 'extreme') {
                            setDifficulty('medium');
                            const fallback = lastNormalMapIdRef.current || 'favela';
                            setSelectedMapId(fallback);
                            if (gameState === 'IDLE') sound.setMenuExtremeMode(false);
                            try {
                              localStorage.setItem('caramelo_difficulty', 'medium');
                              localStorage.setItem('caramelo_selected_map_id', fallback);
                            } catch {}
                          } else {
                            setDifficulty('extreme');
                            if (gameState === 'IDLE') sound.setMenuExtremeMode(true);
                            try {
                              localStorage.setItem('caramelo_difficulty', 'extreme');
                            } catch {}
                          }
                        }}
                        className={`p-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative border-2 ${
                          difficulty === 'extreme'
                            ? 'bg-gradient-to-b from-[#dc2626] via-[#7f1d1d] to-[#090202] border-[#fde047] ring-4 ring-red-500/60 text-white'
                            : 'cartoon-btn-steel opacity-80'
                        }`}
                      >
                        <span className="text-base">🔥</span>
                        <span className="text-xs text-[#fef08a]">EXTREMO</span>
                        <span className="text-[8px] font-bold opacity-95">INFERNO • 30 🍕</span>
                      </button>
                    </div>
                  </div>

                  <div className="cartoon-wood-plank p-3 rounded-2xl flex items-center justify-between relative shadow-md">
                    <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                    <SteelRivet className="bottom-1 left-1 w-1.5 h-1.5" />
                    <div>
                      <div className="cartoon-gold-ribbon px-2.5 py-0.5 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider mb-1">
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>BOTÕES VIRTUAIS NA TELA</span>
                      </div>
                      <p className="text-[11px] text-amber-100/90 font-medium cartoon-text-outline">
                        Ativa e desativa os botões touch para telas móveis.
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
                        <p className="text-[11px] text-amber-100/80 font-medium cartoon-text-outline">
                          Inverte os botões direcionais de esquerda e direita
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setInvertTouch((prev) => {
                          const next = !prev;
                          try {
                            localStorage.setItem('caramelo_invert_touch', next ? 'true' : 'false');
                          } catch {}
                          return next;
                        });
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                        invertTouch ? 'cartoon-btn-green' : 'cartoon-btn-steel'
                      }`}
                    >
                      {invertTouch ? 'INVERTIDO' : 'NORMAL'}
                    </button>
                  </div>

                  {/* NOVO: Ajuste de Opacidade dos Botões Touch Mobile */}
                  <div className="cartoon-wood-plank p-3 rounded-2xl relative shadow-md">
                    <SteelRivet className="top-1 left-1 w-1.5 h-1.5" />
                    <SteelRivet className="bottom-1 left-1 w-1.5 h-1.5" />
                    <div className="flex items-center justify-between mb-2">
                      <div className="cartoon-gold-ribbon px-2.5 py-0.5 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                        <span>👁️</span>
                        <span>OPACIDADE DOS BOTÕES TOUCH</span>
                      </div>
                      <span className="font-fun font-black text-sm text-[#fef08a] cartoon-text-outline">
                        {Math.round(touchControlsOpacity * 100)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-100/90 font-medium cartoon-text-outline mb-2">
                      Ajuste a transparência dos botões na tela para melhor visibilidade da pista.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="15"
                        max="100"
                        step="5"
                        value={Math.round(touchControlsOpacity * 100)}
                        onChange={(e) => {
                          const val = Number(e.target.value) / 100;
                          setTouchControlsOpacity(val);
                          try {
                            localStorage.setItem('caramelo_touch_opacity', String(val));
                          } catch {}
                        }}
                        className="flex-1 accent-amber-400 h-2 bg-stone-900 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mt-2.5">
                      {[0.3, 0.5, 0.75, 1.0].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setTouchControlsOpacity(preset);
                            try {
                              localStorage.setItem('caramelo_touch_opacity', String(preset));
                            } catch {}
                          }}
                          className={`py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                            Math.abs(touchControlsOpacity - preset) < 0.05
                              ? 'cartoon-btn-gold text-[#180c05] font-black'
                              : 'cartoon-btn-steel text-amber-100/80'
                          }`}
                        >
                          {Math.round(preset * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {settingsTab === 'graphics' && (
                <>
                  <div className="cartoon-wood-plank p-3 rounded-2xl relative shadow-md">
                    <SteelCornerBrackets size="sm" />
                    <div className="flex items-center justify-between mb-2">
                      <div className="cartoon-gold-ribbon px-2.5 py-0.5 text-xs font-black uppercase">
                        QUALIDADE GRÁFICA GERAL
                      </div>
                      <span className="cartoon-steel-pill text-[10px] font-mono font-black px-2 py-0.5">
                        {graphicsPreset.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {(['low', 'medium', 'high', 'ultra'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => {
                            sound.playClick();
                            setGraphicsPreset(p);
                            try {
                              localStorage.setItem('caramelo_graphics_preset', p);
                            } catch {}
                          }}
                          className={`py-2 px-1 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer ${
                            graphicsPreset === p ? 'cartoon-btn-gold shadow-md' : 'cartoon-btn-steel'
                          }`}
                        >
                          {p === 'low' ? 'Baixa' : p === 'medium' ? 'Média' : p === 'high' ? 'Alta' : 'Ultra'}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 cartoon-wood-inset px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold text-amber-100/95 leading-snug">
                      {graphicsPreset === 'low' &&
                        '⚡ Baixa Otimizada: Cores vivas, Contornos Cartoon nítidos, Sol Cinematográfico leve e 60 FPS estáveis em qualquer aparelho.'}
                      {graphicsPreset === 'medium' &&
                        '⚖️ Média Equilibrada: Relevo no asfalto, Sombras de Contato nos veículos, Feixes Solares suaves e ótimo desempenho.'}
                      {graphicsPreset === 'high' &&
                        '✨ Alta Cinematográfica: Alta definição, God-Rays solares completos, Linhas de Velocidade e iluminação tropical viva.'}
                      {graphicsPreset === 'ultra' &&
                        '🔥 Ultra Máxima (2x DPR): Nitidez cristalina, Sol Cinematográfico máximo, tráfego denso e efeitos atmosféricos completos.'}
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
                          onClick={() => {
                            setRenderDistance(rd);
                            try {
                              localStorage.setItem('caramelo_render_distance', rd);
                            } catch {}
                          }}
                          className={`py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                            renderDistance === rd ? 'cartoon-btn-green' : 'cartoon-btn-steel'
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
                          onClick={() => {
                            setFpsLimit(fps);
                            try {
                              localStorage.setItem('caramelo_fps_limit', fps.toString());
                            } catch {}
                          }}
                          className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            fpsLimit === fps ? 'cartoon-btn-blue' : 'cartoon-btn-steel'
                          }`}
                        >
                          {fps === 0 ? 'MAX' : `${fps}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {settingsTab === 'audio' && (
                <div className="cartoon-wood-plank p-4 rounded-2xl flex items-center justify-between relative shadow-md">
                  <SteelCornerBrackets size="sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      {soundMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                      <span className="text-sm font-black uppercase text-white cartoon-text-outline">ÁUDIO GERAL DO JOGO</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 mt-0.5 cartoon-text-outline">Efeitos sonoros, motor da moto, pulos e moedas</p>
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

              {settingsTab === 'weather' && (
                <div className="cartoon-wood-plank p-4 rounded-2xl relative shadow-md">
                  <SteelCornerBrackets size="sm" />
                  <div className="cartoon-gold-ribbon px-3 py-1 inline-flex items-center gap-1.5 text-xs font-black uppercase mb-3">
                    <Sun className="w-4 h-4" />
                    <span>HORÁRIO & ILUMINAÇÃO DO CENÁRIO</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setSkyPreset('tropical_morning');
                        try {
                          localStorage.setItem('caramelo_sky_preset', 'tropical_morning');
                        } catch {}
                      }}
                      className={`py-3 px-2 rounded-xl text-xs font-black uppercase flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        skyPreset === 'tropical_morning' ? 'cartoon-btn-gold' : 'cartoon-btn-steel'
                      }`}
                    >
                      <Sun className="w-5 h-5 text-amber-300" />
                      <span>DIA</span>
                    </button>
                    <button
                      onClick={() => {
                        setSkyPreset('sunset_dramatic');
                        try {
                          localStorage.setItem('caramelo_sky_preset', 'sunset_dramatic');
                        } catch {}
                      }}
                      className={`py-3 px-2 rounded-xl text-xs font-black uppercase flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        skyPreset === 'sunset_dramatic' ? 'cartoon-btn-gold' : 'cartoon-btn-steel'
                      }`}
                    >
                      <Sunset className="w-5 h-5 text-orange-300" />
                      <span>PÔR DO SOL</span>
                    </button>
                    <button
                      onClick={() => {
                        setSkyPreset('violet_dusk');
                        try {
                          localStorage.setItem('caramelo_sky_preset', 'violet_dusk');
                        } catch {}
                      }}
                      className={`py-3 px-2 rounded-xl text-xs font-black uppercase flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        skyPreset === 'violet_dusk' ? 'cartoon-btn-gold' : 'cartoon-btn-steel'
                      }`}
                    >
                      <Moon className="w-5 h-5 text-cyan-300" />
                      <span>NOITE</span>
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === 'dev' && (
                <div className="space-y-3">
                  {/* Painel Oficial do Desenvolvedor transferido da tela principal */}
                  <div className="cartoon-wood-board p-4 rounded-2xl relative shadow-xl border-2 border-[#fbbf24]">
                    <SteelCornerBrackets size="sm" />
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#b45309] border-2 border-[#fef08a] flex items-center justify-center shadow-lg flex-shrink-0">
                          <Gamepad2 className="w-6 h-6 text-[#2e1005]" />
                        </div>
                        <div className="text-left">
                          <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest">
                            ESTÚDIO OFICIAL & DIREÇÃO TÉCNICA
                          </div>
                          <div className="text-xs sm:text-sm font-black text-amber-100 uppercase tracking-wider cartoon-text-outline">
                            DESENVOLVIDO POR KELVIN, GUILHERME & VALDIR
                          </div>
                        </div>
                      </div>

                      <a
                        href="https://gamefy.net.br"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl cartoon-btn-gold font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:scale-105 transition-transform"
                      >
                        <span>⭐</span>
                        <span>gamefy.net.br</span>
                      </a>
                    </div>
                  </div>

                  {/* Ferramentas de Teste e Diagnóstico do Desenvolvedor */}
                  <div className="cartoon-wood-plank p-3.5 rounded-2xl relative shadow-md space-y-2.5">
                    <SteelCornerBrackets size="sm" />
                    <div className="flex items-center justify-between">
                      <div className="cartoon-gold-ribbon px-3 py-1 inline-flex items-center gap-1.5 text-xs font-black uppercase">
                        <span>🛠️</span>
                        <span>FERRAMENTAS DE DESENVOLVEDOR</span>
                      </div>
                      <span className="cartoon-steel-pill text-[9.5px] font-mono font-black px-2 py-0.5">
                        BUILD 3D CARTOON HQ
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setUserCoins((prev) => {
                            const next = prev + 10000;
                            const u = storage.getCurrentUser();
                            if (u) storage.adjustUserCoins(u.id, 10000);
                            return next;
                          });
                          showQuickToast('🛠️ +R$ 10.000 adicionados para teste!');
                        }}
                        className="py-2.5 px-3 rounded-xl cartoon-btn-green text-[11px] font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 shadow"
                      >
                        <span>💵</span>
                        <span>+R$ 10.000 (TESTE)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setIsSettingsOpen(false);
                          setIsGalleryOpen(true);
                        }}
                        className="py-2.5 px-3 rounded-xl cartoon-btn-blue text-[11px] font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 shadow"
                      >
                        <Images className="w-4 h-4" />
                        <span>GALERIA 3D & FOTOS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setIsSettingsOpen(false);
                          setShowMarketingModal(true);
                        }}
                        className="py-2.5 px-3 rounded-xl cartoon-btn-gold text-[11px] font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 shadow col-span-2"
                      >
                        <Megaphone className="w-4 h-4" />
                        <span>PORTAL DE DIVULGAÇÃO & MARKETING</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

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

      {/* =========================================================================
          6. GARAGEM 3D REFORMULADA — ESTÚDIO MAIS CENTRALIZADO E EQUILIBRADO COM AS OPÇÕES
          ========================================================================= */}
      {showSkinsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-1.5 sm:p-3 text-center animate-fade-in overflow-hidden">
          <style>{`
            @keyframes comicDeniedShake {
              0%, 100% { transform: translateX(0) rotate(0deg); }
              15% { transform: translateX(-8px) rotate(-2deg); }
              30% { transform: translateX(8px) rotate(2deg); }
              45% { transform: translateX(-6px) rotate(-1.5deg); }
              60% { transform: translateX(6px) rotate(1.5deg); }
              75% { transform: translateX(-3px) rotate(-0.8deg); }
            }
            @keyframes comicDeniedRedPulse {
              0%, 100% { background-color: rgba(220, 38, 38, 0.95); border-color: #ffffff; box-shadow: 0 0 24px rgba(239, 68, 68, 0.95); }
              50% { background-color: rgba(127, 29, 29, 0.98); border-color: #fde047; box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
            }
            .cartoon-garage-scroll {
              scrollbar-width: thin;
              scrollbar-color: #f59e0b #1a0c05;
            }
            .cartoon-garage-scroll::-webkit-scrollbar {
              height: 11px;
            }
            .cartoon-garage-scroll::-webkit-scrollbar-track {
              background: #1a0c05;
              border-radius: 9999px;
              border: 2px solid #451a03;
              box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.85);
            }
            .cartoon-garage-scroll::-webkit-scrollbar-thumb {
              background: linear-gradient(90deg, #f59e0b 0%, #fde047 50%, #d97706 100%);
              border-radius: 9999px;
              border: 2px solid #1f0901;
            }
            .cartoon-garage-scroll::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(90deg, #fde047 0%, #fbbf24 100%);
            }
          `}</style>
          <div
            style={{
              animation: deniedPurchaseFlash
                ? 'comicDeniedShake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both'
                : undefined,
            }}
            className={`max-w-[1120px] w-full rounded-[26px] relative text-left shadow-[0_24px_60px_rgba(0,0,0,0.88)] flex flex-col my-auto max-h-[95vh] overflow-hidden border-[2.5px] transition-colors ${
              deniedPurchaseFlash
                ? 'border-red-500 bg-[#240808] shadow-[0_0_45px_rgba(239,68,68,0.8)]'
                : 'border-[#fbbf24]/80 bg-[#120a06]'
            }`}
          >
            {/* BARRA SUPERIOR COMPACTA: ABAS DE CATEGORIA (CARAMELOS EM 1º) + SALDO + FECHAR */}
            <div className="px-3 sm:px-4 pt-2.5 pb-2 flex items-center justify-between gap-2 flex-wrap border-b border-amber-500/20 bg-[#180d07]">
              <div className="flex items-center gap-1.5 bg-[#120904] p-1 rounded-2xl border border-[#fbbf24]/45 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setGarageSection('caramelos');
                  }}
                  className={`py-1.5 px-3 sm:px-4 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    garageSection === 'caramelos'
                      ? 'cartoon-btn-green shadow-md'
                      : 'text-amber-100/85 hover:text-white'
                  }`}
                >
                  <span>🐕 CARAMELOS ({CARAMELO_CATALOG.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setGarageSection('motos');
                  }}
                  className={`py-1.5 px-3 sm:px-4 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    garageSection === 'motos'
                      ? 'cartoon-btn-gold shadow-md'
                      : 'text-amber-100/85 hover:text-white'
                  }`}
                >
                  <span>🏍️ MOTOS ({filteredMotos.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setGarageSection('motoboys');
                  }}
                  className={`py-1.5 px-3 sm:px-4 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    garageSection === 'motoboys'
                      ? 'cartoon-btn-gold shadow-md'
                      : 'text-amber-100/85 hover:text-white'
                  }`}
                >
                  <span>🧑‍🚀 PILOTOS ({MOTOBOYS_CATALOG.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <div
                  style={{
                    animation: deniedPurchaseFlash
                      ? 'comicDeniedRedPulse 0.32s ease-in-out infinite'
                      : undefined,
                  }}
                  className="rounded-2xl transition-all"
                >
                  <SteelCoinPill amount={`R$ ${userCoins.toLocaleString('pt-BR')}`} />
                </div>
                <OctagonCloseButton onClick={() => setShowSkinsModal(false)} />
              </div>
            </div>

            {/* ITEM 9: PALCO DO ESTÚDIO 3D AMPLO E CENTRALIZADO (MODELOS INTEIROS SEM CORTES!) */}
            <div className="px-3 sm:px-4 pt-2">
              <div className="relative h-[255px] sm:h-[315px] lg:h-[355px] w-full max-w-[960px] mx-auto rounded-2xl flex-shrink-0 overflow-hidden bg-[#f7c8a0] border-2 border-[#fbbf24]/65 shadow-[0_14px_34px_rgba(0,0,0,0.7)]">
                <Garage3DShowroom
                  motoId={selectedGarageMotoId}
                  mode={garageSection}
                  selectedMotoboyId={selectedGarageMotoboyId}
                  selectedCarameloId={selectedGarageCarameloId}
                  riderId={null}
                  onSelectMotoboy={(id) => {
                    sound.playClick();
                    setSelectedGarageMotoboyId(id);
                    const spec = getMotoboySpecById(id);
                    if (!spec.price || unlockedMotoboyIds.includes(id)) {
                      setEquippedMotoboyId(id);
                      saveMotoboyId(id);
                      setPlayMode('moto');
                      savePlayMode('moto');
                    }
                  }}
                />

                {/* Vinheta Superior e Fade-Out Inferior Suaves */}
                <div
                  className="absolute inset-x-0 top-0 h-8 pointer-events-none z-[6]"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(18,10,6,0.35) 0%, rgba(18,10,6,0) 100%)',
                  }}
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-12 pointer-events-none z-[6]"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(18,10,6,0) 0%, rgba(18,10,6,0.45) 70%, rgba(18,10,6,0.82) 100%)',
                  }}
                />

                {/* Setas Laterais do Estúdio (< e >) */}
                <button
                  type="button"
                  onClick={() => {
                    if (garageSection === 'caramelos') cycleGarageCaramelo(-1);
                    else if (garageSection === 'motoboys') cycleGarageMotoboy(-1);
                    else cycleGarageMoto(-1);
                  }}
                  aria-label="Anterior"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1a0d06]/80 hover:bg-[#2e160a] backdrop-blur-md border-2 border-[#fde047]/80 shadow-lg flex items-center justify-center cursor-pointer active:scale-90 transition-all"
                >
                  <ChevronLeft className="w-5 h-5 text-[#fef08a] stroke-[3]" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (garageSection === 'caramelos') cycleGarageCaramelo(1);
                    else if (garageSection === 'motoboys') cycleGarageMotoboy(1);
                    else cycleGarageMoto(1);
                  }}
                  aria-label="Próximo"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1a0d06]/80 hover:bg-[#2e160a] backdrop-blur-md border-2 border-[#fde047]/80 shadow-lg flex items-center justify-center cursor-pointer active:scale-90 transition-all"
                >
                  <ChevronRight className="w-5 h-5 text-[#fef08a] stroke-[3]" />
                </button>
              </div>
            </div>

            {/* BARRA CENTRALIZADA DE INFORMAÇÕES E AÇÕES DO MODELO SELECIONADO */}
            <div className="mx-3 sm:mx-4 mt-2 px-3 sm:px-4 py-2 rounded-2xl bg-[#1b0e07] border border-[#fbbf24]/45 shadow-md flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="min-w-0">
                  <div className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-amber-300/85 leading-none">
                    {garageSection === 'caramelos'
                      ? 'COMPANHEIRO / CORREDOR 3D'
                      : garageSection === 'motoboys'
                      ? 'PILOTO OFICIAL 3D'
                      : selectedSpec.category}
                  </div>
                  <div className="cartoon-title-3d text-sm sm:text-base text-white tracking-wide leading-tight truncate">
                    {garageSection === 'caramelos'
                      ? selectedCarameloSpec.name
                      : garageSection === 'motoboys'
                      ? selectedMotoboySpec.name
                      : selectedSpec.name}
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-b from-[#fde047] to-[#f59e0b] border border-[#3b1304] text-[10px] sm:text-xs font-black text-[#2e1005] uppercase shadow-sm flex-shrink-0">
                  {garageSection === 'caramelos'
                    ? selectedCarameloSpec.rarity
                    : garageSection === 'motoboys'
                    ? selectedMotoboySpec.badge
                    : `${Math.round(selectedSpec.displacementCc)}cc`}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-end ml-auto">
                {garageSection === 'caramelos' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !selectedCarameloSpec.price ||
                          unlockedCarameloIds.includes(selectedCarameloSpec.id)
                        ) {
                          setEquippedCarameloId(selectedCarameloSpec.id);
                          saveEquippedCarameloId(selectedCarameloSpec.id);
                        }
                        handleSwitchPlayMode('caramelo');
                        showGarageBanner('Modo Jogar com Caramelo ativado!');
                      }}
                      className={`py-1.5 px-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase cursor-pointer transition-all shadow-md ${
                        playMode === 'caramelo'
                          ? 'cartoon-btn-green ring-2 ring-emerald-200'
                          : 'cartoon-btn-wood'
                      }`}
                    >
                      Jogar c/ Ele
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !selectedCarameloSpec.price ||
                          unlockedCarameloIds.includes(selectedCarameloSpec.id)
                        ) {
                          setEquippedCarameloId(selectedCarameloSpec.id);
                          saveEquippedCarameloId(selectedCarameloSpec.id);
                        }
                        handleSwitchPlayMode('moto');
                        showGarageBanner('Caramelo vai perseguir a Moto!');
                      }}
                      className={`py-1.5 px-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase cursor-pointer transition-all shadow-md ${
                        playMode === 'moto'
                          ? 'cartoon-btn-gold ring-2 ring-amber-200'
                          : 'cartoon-btn-wood'
                      }`}
                    >
                      Perseguir Moto
                    </button>
                  </>
                )}

                {garageSection === 'motos' ? (
                  (() => {
                    const isUnlocked =
                      !selectedSpec.price || unlockedMotoIds.includes(selectedSpec.id);
                    const isEquipped =
                      equippedMotoId === selectedSpec.id && playMode === 'moto';
                    return (
                      <button
                        type="button"
                        onClick={() => handleEquipOrBuyMoto(selectedSpec)}
                        style={{
                          animation:
                            deniedPurchaseFlash && !isUnlocked
                              ? 'comicDeniedRedPulse 0.3s ease-in-out infinite'
                              : undefined,
                        }}
                        className={`py-1.5 px-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all ${
                          isEquipped
                            ? 'cartoon-btn-green'
                            : isUnlocked
                            ? 'cartoon-btn-gold'
                            : 'cartoon-btn-steel'
                        }`}
                      >
                        {isEquipped ? (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>EM USO</span>
                          </>
                        ) : isUnlocked ? (
                          <>
                            <Zap className="w-4 h-4 fill-current" />
                            <span>EQUIPAR</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-300" />
                            <span>R$ {selectedSpec.price.toLocaleString('pt-BR')}</span>
                          </>
                        )}
                      </button>
                    );
                  })()
                ) : garageSection === 'motoboys' ? (
                  (() => {
                    const isMbUnlocked =
                      !selectedMotoboySpec.price ||
                      unlockedMotoboyIds.includes(selectedMotoboySpec.id);
                    const isMbEquipped =
                      equippedMotoboyId === selectedMotoboySpec.id && playMode === 'moto';
                    return (
                      <button
                        type="button"
                        onClick={() => handleConfirmMotoboy(selectedMotoboySpec)}
                        style={{
                          animation:
                            deniedPurchaseFlash && !isMbUnlocked
                              ? 'comicDeniedRedPulse 0.3s ease-in-out infinite'
                              : undefined,
                        }}
                        className={`py-1.5 px-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all ${
                          isMbEquipped
                            ? 'cartoon-btn-green'
                            : isMbUnlocked
                            ? 'cartoon-btn-gold'
                            : 'cartoon-btn-steel'
                        }`}
                      >
                        {isMbEquipped ? (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>EM USO</span>
                          </>
                        ) : isMbUnlocked ? (
                          <span>EQUIPAR</span>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-300" />
                            <span>R$ {selectedMotoboySpec.price.toLocaleString('pt-BR')}</span>
                          </>
                        )}
                      </button>
                    );
                  })()
                ) : (
                  (() => {
                    const isUnlocked =
                      !selectedCarameloSpec.price ||
                      unlockedCarameloIds.includes(selectedCarameloSpec.id);
                    const isEquipped = equippedCarameloId === selectedCarameloSpec.id;
                    return (
                      <button
                        type="button"
                        onClick={() => handleEquipOrBuyCaramelo(selectedCarameloSpec)}
                        style={{
                          animation:
                            deniedPurchaseFlash && !isUnlocked
                              ? 'comicDeniedRedPulse 0.3s ease-in-out infinite'
                              : undefined,
                        }}
                        className={`py-1.5 px-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer shadow-lg active:scale-95 transition-all ${
                          isEquipped
                            ? 'cartoon-btn-green'
                            : isUnlocked
                            ? 'cartoon-btn-gold'
                            : 'cartoon-btn-steel'
                        }`}
                      >
                        {isEquipped ? (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>ATIVO</span>
                          </>
                        ) : isUnlocked ? (
                          <span>EQUIPAR</span>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-300" />
                            <span>R$ {selectedCarameloSpec.price.toLocaleString('pt-BR')}</span>
                          </>
                        )}
                      </button>
                    );
                  })()
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (
                      garageSection === 'motos' &&
                      (!selectedSpec.price || unlockedMotoIds.includes(selectedSpec.id))
                    ) {
                      setEquippedMotoId(selectedSpec.id);
                      saveEquippedMotoId(selectedSpec.id);
                      setPlayMode('moto');
                      savePlayMode('moto');
                    } else if (
                      garageSection === 'motoboys' &&
                      (!selectedMotoboySpec.price ||
                        unlockedMotoboyIds.includes(selectedMotoboySpec.id))
                    ) {
                      setEquippedMotoboyId(selectedGarageMotoboyId);
                      saveMotoboyId(selectedGarageMotoboyId);
                      setPlayMode('moto');
                      savePlayMode('moto');
                    }
                    setShowSkinsModal(false);
                    if (difficulty === 'extreme') {
                      setShowExtremeConfirmModal(true);
                    } else {
                      setShowMapSelectModal(true);
                    }
                  }}
                  className="py-1.5 px-4 rounded-xl cartoon-btn-green font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>CORRER!</span>
                </button>
              </div>
            </div>

            {/* BANNER CÔMICO PISCANDO EM VERMELHO DE COMPRA NEGADA (SUBSTITUI O ALERT DO NAVEGADOR!) */}
            {deniedPurchaseFlash && (
              <div
                style={{ animation: 'comicDeniedRedPulse 0.28s ease-in-out infinite' }}
                className="mx-3 mt-1.5 px-3 py-1.5 rounded-xl border-2 border-white text-xs sm:text-sm font-fun font-black text-yellow-200 uppercase tracking-wider text-center shadow-lg"
              >
                {deniedPurchaseFlash}
              </div>
            )}

            {garageStepBanner && !deniedPurchaseFlash && (
              <div className="mx-3 mt-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 border border-emerald-200 text-[11px] font-black text-stone-950 uppercase tracking-wide text-center shadow-md">
                {garageStepBanner}
              </div>
            )}

            {/* =====================================================================
                ITEM 7: SELETORES DA GARAGEM COM BARRA DE ROLAGEM PRÓPRIA ESTILIZADA (SEM SETINHAS ANTERIOR/PRÓXIMA E SEM BARRA BRANCA PADRÃO!)
                ===================================================================== */}
            <div className="px-3 sm:px-4 pb-3 pt-2 flex-shrink-0">
              {garageSection === 'motos' && (
                <div className="cartoon-garage-scroll flex items-stretch gap-2.5 overflow-x-auto pb-2.5 pt-0.5">
                  {filteredMotos.map((moto, idx) => {
                    const isSelected = selectedGarageMotoId === moto.id;
                    const isEquipped = equippedMotoId === moto.id;
                    const isUnlocked = !moto.price || unlockedMotoIds.includes(moto.id);
                    const thumb3d = moto3DThumbs[moto.id];

                    return (
                      <button
                        key={moto.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setSelectedGarageMotoId(moto.id);
                          if (isUnlocked) {
                            setEquippedMotoId(moto.id);
                            saveEquippedMotoId(moto.id);
                            setPlayMode('moto');
                            savePlayMode('moto');
                          }
                        }}
                        className={`group w-[160px] sm:w-[185px] flex-shrink-0 p-2 rounded-2xl flex flex-col justify-between gap-1.5 transition-all cursor-pointer relative text-left border-2 ${
                          isSelected
                            ? 'bg-gradient-to-b from-[#452411] to-[#241208] border-[#fde047] ring-2 ring-[#fde047]/60 shadow-[0_0_18px_rgba(251,191,36,0.3)]'
                            : 'bg-gradient-to-b from-[#26150b] to-[#170c06] border-[#52301c] hover:border-[#b45309]'
                        }`}
                      >
                        <div className="w-full h-[78px] sm:h-[86px] rounded-xl overflow-hidden relative border border-[#3d2212] bg-[#160c07] flex items-center justify-center shadow-inner">
                          {thumb3d ? (
                            <img
                              src={thumb3d}
                              alt={moto.name}
                              loading="lazy"
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                              draggable={false}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                              <span className="text-[8px] font-bold text-amber-200/60 uppercase">
                                3D
                              </span>
                            </div>
                          )}

                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 border border-white/15 text-[8.5px] font-black text-amber-200/90 leading-none">
                            #{idx + 1}
                          </span>

                          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-[#2b1408]/90 border border-[#fbbf24]/70 text-[8.5px] font-black text-[#fde047] leading-none">
                            {Math.round(moto.displacementCc)}cc
                          </span>

                          {thumb3d && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                sound.playClick();
                                setFullscreenImageModal({
                                  url: thumb3d,
                                  title: `${moto.name} (${Math.round(moto.displacementCc)}cc)`,
                                  subtitle: `${moto.category} • Estúdio Garagem 3D`,
                                });
                              }}
                              title="Ver modelo 3D em Tela Cheia"
                              className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 hover:bg-amber-400 hover:text-stone-950 border border-amber-400/50 text-[8px] font-black text-[#fde047] leading-none opacity-85 group-hover:opacity-100 transition-all"
                            >
                              🔍
                            </span>
                          )}
                        </div>

                        <div className="w-full flex flex-col gap-1">
                          <div className="text-[11px] font-black text-white truncate leading-tight">
                            {moto.name}
                          </div>

                          <div
                            className={`w-full text-center text-[9.5px] font-black uppercase py-1 px-1.5 rounded-lg border ${
                              isEquipped
                                ? 'bg-emerald-600 border-emerald-300 text-white shadow'
                                : isUnlocked
                                ? 'bg-[#3b1d0e] border-amber-400/50 text-[#fde047]'
                                : 'bg-stone-900/90 border-amber-500/35 text-amber-200/90'
                            }`}
                          >
                            {isEquipped
                              ? '✓ EM USO'
                              : isUnlocked
                              ? 'DISPONÍVEL'
                              : `🔒 R$ ${moto.price.toLocaleString('pt-BR')}`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {garageSection === 'motoboys' && (
                <div className="cartoon-garage-scroll flex items-stretch gap-2.5 overflow-x-auto pb-2.5 pt-0.5">
                  {MOTOBOYS_CATALOG.map((mb) => {
                    const isSelected = selectedGarageMotoboyId === mb.id;
                    const isEquipped = equippedMotoboyId === mb.id && playMode === 'moto';
                    const isMbUnlocked = !mb.price || unlockedMotoboyIds.includes(mb.id);
                    const portrait3d = motoboy3DThumbs[mb.id];

                    return (
                      <button
                        key={mb.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setSelectedGarageMotoboyId(mb.id);
                          if (isMbUnlocked) {
                            setEquippedMotoboyId(mb.id);
                            saveMotoboyId(mb.id);
                            setPlayMode('moto');
                            savePlayMode('moto');
                          }
                        }}
                        className={`group w-[160px] sm:w-[185px] flex-shrink-0 p-2 rounded-2xl flex flex-col justify-between gap-1.5 transition-all cursor-pointer relative text-left border-2 ${
                          isSelected
                            ? 'bg-gradient-to-b from-[#452411] to-[#241208] border-[#fde047] ring-2 ring-[#fde047]/60 shadow-[0_0_18px_rgba(251,191,36,0.3)]'
                            : 'bg-gradient-to-b from-[#26150b] to-[#170c06] border-[#52301c] hover:border-[#b45309]'
                        }`}
                      >
                        <div className="w-full h-[78px] sm:h-[86px] rounded-xl overflow-hidden relative border border-[#3d2212] bg-[#160c07] flex items-center justify-center shadow-inner">
                          {portrait3d ? (
                            <img
                              src={portrait3d}
                              alt={mb.name}
                              loading="lazy"
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                              draggable={false}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                              <span className="text-[8px] font-bold text-amber-200/60 uppercase">
                                3D
                              </span>
                            </div>
                          )}

                          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-[#2b1408]/90 border border-[#fbbf24]/70 text-[8px] font-black text-[#fde047] leading-none">
                            {mb.badge}
                          </span>

                          {portrait3d && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                sound.playClick();
                                setFullscreenImageModal({
                                  url: portrait3d,
                                  title: `Piloto: ${mb.name}`,
                                  subtitle: `${mb.badge} • Retrato 3D Oficial`,
                                });
                              }}
                              title="Ver retrato 3D em Tela Cheia"
                              className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 hover:bg-amber-400 hover:text-stone-950 border border-amber-400/50 text-[8px] font-black text-[#fde047] leading-none opacity-85 group-hover:opacity-100 transition-all"
                            >
                              🔍
                            </span>
                          )}
                        </div>

                        <div className="w-full flex flex-col gap-1">
                          <div className="text-[10.5px] sm:text-[11px] font-black text-white truncate leading-tight">
                            {mb.name}
                          </div>

                          <div
                            className={`w-full text-center text-[9px] font-black uppercase py-1 px-1 rounded-lg border ${
                              isEquipped
                                ? 'bg-emerald-600 border-emerald-300 text-white shadow'
                                : isMbUnlocked
                                ? 'bg-[#3b1d0e] border-amber-400/50 text-[#fde047]'
                                : 'bg-stone-900/90 border-amber-500/35 text-amber-200/90'
                            }`}
                          >
                            {isEquipped
                              ? '✓ ATIVO'
                              : isMbUnlocked
                              ? 'DISPONÍVEL'
                              : `🔒 R$ ${mb.price.toLocaleString('pt-BR')}`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {garageSection === 'caramelos' && (
                <div className="cartoon-garage-scroll flex items-stretch gap-2.5 overflow-x-auto pb-2.5 pt-0.5">
                  {CARAMELO_CATALOG.map((dog) => {
                    const isSelected = selectedGarageCarameloId === dog.id;
                    const isEquipped = equippedCarameloId === dog.id;
                    const isUnlocked = !dog.price || unlockedCarameloIds.includes(dog.id);
                    const dogPortrait3d = caramelo3DThumbs[dog.id];

                    return (
                      <button
                        key={dog.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setSelectedGarageCarameloId(dog.id);
                          if (isUnlocked) {
                            setEquippedCarameloId(dog.id);
                            saveEquippedCarameloId(dog.id);
                          }
                        }}
                        className={`group w-[160px] sm:w-[185px] flex-shrink-0 p-2 rounded-2xl flex flex-col justify-between gap-1.5 transition-all cursor-pointer relative text-left border-2 ${
                          isSelected
                            ? 'bg-gradient-to-b from-[#452411] to-[#241208] border-[#fde047] ring-2 ring-[#fde047]/60 shadow-[0_0_18px_rgba(251,191,36,0.3)]'
                            : 'bg-gradient-to-b from-[#26150b] to-[#170c06] border-[#52301c] hover:border-[#b45309]'
                        }`}
                      >
                        <div className="w-full h-[78px] sm:h-[86px] rounded-xl overflow-hidden relative border border-[#3d2212] bg-[#160c07] flex items-center justify-center shadow-inner">
                          {dogPortrait3d ? (
                            <img
                              src={dogPortrait3d}
                              alt={dog.name}
                              loading="lazy"
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                              draggable={false}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                              <span className="text-[8px] font-bold text-amber-200/60 uppercase">
                                3D
                              </span>
                            </div>
                          )}

                          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-[#2b1408]/90 border border-[#fbbf24]/70 text-[8.5px] font-black text-[#fde047] leading-none">
                            {dog.rarity}
                          </span>

                          {dogPortrait3d && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                sound.playClick();
                                setFullscreenImageModal({
                                  url: dogPortrait3d,
                                  title: `Caramelo: ${dog.name}`,
                                  subtitle: `Raridade ${dog.rarity} • Retrato 3D Oficial`,
                                });
                              }}
                              title="Ver retrato 3D em Tela Cheia"
                              className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 hover:bg-amber-400 hover:text-stone-950 border border-amber-400/50 text-[8px] font-black text-[#fde047] leading-none opacity-85 group-hover:opacity-100 transition-all"
                            >
                              🔍
                            </span>
                          )}
                        </div>

                        <div className="w-full flex flex-col gap-1">
                          <div className="text-[11px] sm:text-xs font-black text-white truncate leading-tight">
                            {dog.name}
                          </div>

                          <div
                            className={`w-full text-center text-[9.5px] font-black uppercase py-1 px-1.5 rounded-lg border ${
                              isEquipped
                                ? 'bg-emerald-600 border-emerald-300 text-white shadow'
                                : isUnlocked
                                ? 'bg-[#3b1d0e] border-amber-400/50 text-[#fde047]'
                                : 'bg-stone-900/90 border-amber-500/35 text-amber-200/90'
                            }`}
                          >
                            {isEquipped
                              ? '✓ ATIVO'
                              : isUnlocked
                              ? 'DISPONÍVEL'
                              : `🔒 R$ ${dog.price.toLocaleString('pt-BR')}`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6B. ITEM 5: PAINEL DE SELEÇÃO DE MAPAS REDESIGNADO (CARDS LIMPOS + JANELA CENTRAL DE CARTOGRAFIA)
          ========================================================================= */}
      {showMapSelectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[75] flex items-center justify-center p-2 sm:p-4 text-center animate-fade-in overflow-y-auto">
          <div className="max-w-[1100px] w-full p-3.5 sm:p-5 rounded-[28px] relative text-left shadow-[0_24px_60px_rgba(0,0,0,0.9)] flex flex-col gap-4 my-auto max-h-[95vh] overflow-y-auto overflow-x-hidden border-[2.5px] border-[#fbbf24]/85 bg-gradient-to-b from-[#1f1109] via-[#150b06] to-[#0e0704]">
            {/* CABEÇALHO LIMPO E CINEMATOGRÁFICO */}
            <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-amber-500/25">
              <div>
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-400">
                  ATLAS OFICIAL DE ROTAS • CARAMELO RUN
                </div>
                <h3 className="cartoon-title-gold-3d text-lg sm:text-2xl tracking-tight uppercase leading-tight">
                  ESCOLHA O MAPA DA CORRIDA
                </h3>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-600/90 border border-emerald-300 text-xs font-black text-white uppercase shadow">
                  2 DISPONÍVEIS • 8 EM BREVE
                </span>
                <OctagonCloseButton
                  onClick={() => {
                    setPreviewedMapId(null);
                    setShowMapSelectModal(false);
                  }}
                />
              </div>
            </div>

            {/* CARDS PRINCIPAIS MAIS LIMPOS COM FOCO NA IMAGEM REAL 3D (CLIQUE ABRE A JANELA DE CARTOGRAFIA) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {(
                [
                  {
                    id: 'favela' as MapId,
                    num: '01',
                    title: 'Vila & Quebrada Tropical',
                    tag: 'CRISTO 3D • FAVELA & LADEIRAS',
                    coords: '22°57′06″S • 43°12′37″O',
                  },
                  {
                    id: 'praia' as MapId,
                    num: '02',
                    title: 'Orla de Copacabana 3D',
                    tag: 'PRAIA 3D • CALÇADÃO & MAR',
                    coords: '22°58′14″S • 43°10′56″O',
                  },
                ] as const
              ).map((mapCard) => {
                const isSelected = selectedMapId === mapCard.id;
                const cap = map3DCaptures[mapCard.id];
                return (
                  <div
                    key={mapCard.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedMapId(mapCard.id);
                      setPreviewedMapId(mapCard.id);
                    }}
                    className={`group relative p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-2.5 border-2 ${
                      isSelected
                        ? 'bg-gradient-to-b from-[#422310] to-[#211007] border-[#fde047] ring-2 ring-[#fde047]/50 shadow-[0_0_24px_rgba(251,191,36,0.26)]'
                        : 'bg-gradient-to-b from-[#2b160a] to-[#170c06] border-[#fbbf24]/50 hover:border-[#fde047]'
                    }`}
                  >
                    <div className="relative h-44 sm:h-52 w-full rounded-xl overflow-hidden border border-[#fbbf24]/55 bg-[#1a0f08] shadow-lg">
                      {cap ? (
                        <img
                          src={cap}
                          alt={mapCard.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#1c1008]">
                          <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                        </div>
                      )}

                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.72) 100%)',
                        }}
                      />

                      <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-emerald-600/95 border border-emerald-200 text-[10px] font-black text-white uppercase shadow">
                        MAPA {mapCard.num}
                      </span>

                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        {cap && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              sound.playClick();
                              setFullscreenImageModal({
                                url: cap,
                                title: `Mapa ${mapCard.num} — ${mapCard.title}`,
                                subtitle: `${mapCard.tag} • ${mapCard.coords}`,
                              });
                            }}
                            title="Abrir imagem do mapa em Tela Cheia"
                            className="px-2 py-0.5 rounded-md bg-black/75 hover:bg-amber-500 hover:text-stone-950 backdrop-blur-sm border border-[#fde047]/70 text-[9.5px] font-mono font-black text-[#fde047] transition-colors cursor-pointer"
                          >
                            🔍 TELA CHEIA
                          </button>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-sm border border-amber-300/40 text-[9.5px] font-mono font-bold text-amber-200">
                          🗺️ VER MAPA
                        </span>
                      </div>

                      <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
                        <div>
                          <div className="text-[9.5px] font-black uppercase tracking-wider text-[#fde047]">
                            {mapCard.tag}
                          </div>
                          <h4 className="text-base sm:text-xl font-black uppercase text-white leading-tight drop-shadow">
                            {mapCard.title}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            beginMapLoadAndStart(mapCard.id);
                          }}
                          className="px-3.5 py-2 rounded-xl cartoon-btn-green font-black text-xs uppercase tracking-wider flex items-center gap-1 flex-shrink-0 shadow-lg hover:scale-105 transition-transform cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>JOGAR</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* GRADE COMPACTA E LIMPA DOS 8 MAPAS BLOQUEADOS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              {[
                { num: 3, key: 'centro_sp', title: 'Paulista & Sé (SP)' },
                { num: 4, key: 'sertanejo', title: 'Lapa & Arcos (RJ)' },
                { num: 5, key: 'pelourinho', title: 'Pelourinho (BA)' },
                { num: 6, key: 'ponte_rio', title: 'Ponte Estaiada (SP)' },
                { num: 7, key: 'amazonia', title: 'Sertão & Cânions' },
                { num: 8, key: 'curitiba', title: 'Amazônia & Porto' },
                { num: 9, key: 'pantanal', title: 'Serra & Araucárias' },
                { num: 10, key: 'brasilia', title: 'Eixo Monumental (DF)' },
              ].map((m) => {
                const capUrl = map3DCaptures[m.key] || map3DCaptures['favela'];
                return (
                  <button
                    key={m.num}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      showQuickToast(`🔒 Mapa ${m.num} (${m.title}) será desbloqueado em breve!`);
                    }}
                    className="group p-2 rounded-2xl flex flex-col justify-between gap-1.5 text-left cursor-pointer transition-all relative bg-[#160d07]/90 border border-stone-700/70 hover:border-stone-500"
                  >
                    <div className="w-full h-20 sm:h-24 rounded-xl border border-stone-700/80 relative overflow-hidden flex items-center justify-center bg-stone-900">
                      {capUrl && (
                        <img
                          src={capUrl}
                          alt={m.title}
                          className="w-full h-full object-cover select-none"
                          style={{
                            filter: 'grayscale(100%) blur(2.4px) brightness(0.6) contrast(1.08)',
                            transform: 'scale(1.08)',
                          }}
                          draggable={false}
                        />
                      )}

                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-black/75 border border-white/25 flex items-center justify-center shadow-lg">
                          <Lock className="w-3.5 h-3.5 text-stone-300" />
                        </div>
                      </div>

                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[8.5px] font-black text-stone-300">
                        MAPA {m.num < 10 ? `0${m.num}` : m.num}
                      </span>
                    </div>

                    <div className="text-[11px] font-black text-stone-300 truncate px-0.5">
                      {m.num}. {m.title}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* =====================================================================
                JANELA DINÂMICA CENTRAL INSPIRADA EM CARTOGRAFIA / MAPA DE PAPEL FÍSICO
                Abre ao clicar em um mapa com imagem maior, linhas cartográficas e botão Jogar!
                ===================================================================== */}
            {previewedMapId && (
              <div
                onClick={() => setPreviewedMapId(null)}
                className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="relative max-w-[760px] w-full rounded-[26px] p-3.5 sm:p-5 shadow-[0_28px_70px_rgba(0,0,0,0.92)] border-[3px] border-[#b45309] overflow-hidden text-left"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 35%, #fef3c7 0%, #fde68a 52%, #f59e0b 100%)',
                  }}
                >
                  {/* Grade de Cartografia / Linhas de Coordenadas de Papel Antigo */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-25"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, #78350f 1px, transparent 1px), linear-gradient(to bottom, #78350f 1px, transparent 1px)',
                      backgroundSize: '36px 36px',
                    }}
                  />

                  {/* Moldura Interna Tracejada estilo Mapa Físico */}
                  <div className="relative z-10 rounded-2xl border-2 border-dashed border-[#78350f]/75 p-3 sm:p-4 bg-[#fffbeb]/80 backdrop-blur-[1px] flex flex-col gap-3.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap border-b-2 border-[#78350f]/25 pb-2">
                      <div className="flex items-center gap-2">
                        {/* Rosa dos Ventos SVG */}
                        <div className="w-9 h-9 rounded-full bg-[#451a03] border-2 border-[#f59e0b] flex items-center justify-center shadow">
                          <svg viewBox="0 0 32 32" className="w-6 h-6">
                            <polygon points="16,2 19,13 16,11 13,13" fill="#ef4444" />
                            <polygon points="16,30 19,19 16,21 13,19" fill="#fde047" />
                            <polygon points="2,16 13,13 11,16 13,19" fill="#fde047" />
                            <polygon points="30,16 19,13 21,16 19,19" fill="#fde047" />
                            <circle cx="16" cy="16" r="2.2" fill="#ffffff" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-[10px] font-mono font-black uppercase tracking-widest text-[#92400e]">
                            CARTA CARTOGRÁFICA OFICIAL •{' '}
                            {previewedMapId === 'praia'
                              ? '22°58′14″S 43°10′56″O'
                              : '22°57′06″S 43°12′37″O'}
                          </div>
                          <h4 className="font-fun font-black text-lg sm:text-2xl text-[#2e1005] uppercase leading-none">
                            {previewedMapId === 'praia'
                              ? 'Mapa 02 — Orla de Copacabana 3D'
                              : 'Mapa 01 — Vila & Quebrada Tropical'}
                          </h4>
                        </div>
                      </div>

                      <OctagonCloseButton onClick={() => setPreviewedMapId(null)} />
                    </div>

                    {/* Imagem Ampliada do Cenário com Rota Tracejada Cartográfica (Clique p/ Tela Cheia) */}
                    <div
                      onClick={() => {
                        const url = map3DCaptures[previewedMapId];
                        if (url) {
                          sound.playClick();
                          setFullscreenImageModal({
                            url,
                            title:
                              previewedMapId === 'praia'
                                ? 'Mapa 02 — Orla de Copacabana 3D'
                                : 'Mapa 01 — Vila & Quebrada Tropical',
                            subtitle:
                              previewedMapId === 'praia'
                                ? 'Calçadão • Ladeira Costeira • Mar Turquesa'
                                : 'Morro & Quebrada • Cristo 3D • Jatos d’Água',
                          });
                        }
                      }}
                      title="Clique na imagem para ver em Tela Cheia"
                      className="group relative h-56 sm:h-72 w-full rounded-2xl overflow-hidden border-[3px] border-[#451a03] shadow-xl bg-[#1c1008] cursor-zoom-in"
                    >
                      {map3DCaptures[previewedMapId] && (
                        <img
                          src={map3DCaptures[previewedMapId]}
                          alt="Prévia Ampliada do Mapa"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          draggable={false}
                        />
                      )}
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 border border-[#fde047] text-[10px] font-mono font-black text-[#fde047] uppercase shadow">
                        🔍 CLIQUE P/ TELA CHEIA
                      </span>

                      {/* Trilha Pontilhada de Rota sobre o Mapa */}
                      <svg
                        viewBox="0 0 400 180"
                        className="absolute inset-0 w-full h-full pointer-events-none opacity-85"
                      >
                        <path
                          d="M 45 155 Q 150 115, 205 95 T 355 38"
                          fill="none"
                          stroke="#fde047"
                          strokeWidth="3.5"
                          strokeDasharray="8 6"
                          strokeLinecap="round"
                        />
                        <circle cx="45" cy="155" r="6" fill="#22c55e" stroke="#140702" strokeWidth="2.5" />
                        <circle cx="355" cy="38" r="7" fill="#ef4444" stroke="#140702" strokeWidth="2.5" />
                      </svg>

                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#2e1005]/90 border border-[#fde047] text-[10px] font-mono font-black text-[#fde047] uppercase">
                        {previewedMapId === 'praia'
                          ? '🌊 CALÇADÃO • LADEIRA COSTEIRA • MAR TURQUESA'
                          : '⛰️ MORRO & QUEBRADA • CRISTO 3D • JATOS D’ÁGUA'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                      <p className="text-xs sm:text-sm font-bold text-[#451a03] max-w-md leading-snug">
                        {previewedMapId === 'praia'
                          ? 'Avenida Atlântica com curvas na ladeira, quiosques, coqueiros, trânsito dinâmico e vista para o Cristo Redentor.'
                          : 'Subidas e descidas da Vila Caramelo com casas brasileiras, trânsito intenso, entregas de pizza e perseguição.'}
                      </p>

                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => setPreviewedMapId(null)}
                          className="px-4 py-2.5 rounded-xl cartoon-btn-wood font-black text-xs uppercase tracking-wider cursor-pointer"
                        >
                          VOLTAR
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const target = previewedMapId;
                            setPreviewedMapId(null);
                            beginMapLoadAndStart(target);
                          }}
                          className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl cartoon-btn-green font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>JOGAR NESTE MAPA!</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          7. MODAIS AUXILIARES (GALERIA, MARKETING, FOTO DE PERFIL)
          ========================================================================= */}
      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        userCoins={userCoins}
        onSpendCoins={handleSpendCoins}
        onStartGame={startGame}
      />

      <MarketingPortalModal
        isOpen={showMarketingModal}
        onClose={() => setShowMarketingModal(false)}
      />

      <ProfilePhotoSelectorModal
        isOpen={isPhotoSelectorOpen}
        onClose={() => setIsPhotoSelectorOpen(false)}
        currentPhotoUrl={
          selectedProfilePhoto ||
          currentUser?.profilePhotoUrl ||
          caramelo3DThumbs[equippedCarameloId] ||
          '/profile_photos/image_20261007_113048.jpg'
        }
        extraPhotos={[
          ...Object.values(caramelo3DThumbs),
          ...Object.values(motoboy3DThumbs),
        ]}
        onSelectPhoto={(photoUrl) => {
          setSelectedProfilePhoto(photoUrl);
          try {
            localStorage.setItem('caramelo_profile_photo_url_v1', photoUrl);
          } catch {}
          if (currentUser) {
            storage.setUserProfilePhoto(currentUser.id, photoUrl);
            setCurrentUser(storage.getCurrentUser());
          }
        }}
      />

      {/* =========================================================================
          7B. ITEM 13: SISTEMA PROFISSIONAL DE RANKING, 8 PATENTES, MISSÕES E TOP JOGADORES
          ========================================================================= */}
      {showRankingModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[80] flex items-center justify-center p-2 sm:p-4 text-center animate-fade-in overflow-y-auto">
          <div className="max-w-[980px] w-full p-3.5 sm:p-5 rounded-[28px] relative text-left shadow-[0_24px_65px_rgba(0,0,0,0.92)] flex flex-col gap-3.5 my-auto max-h-[95vh] overflow-y-auto overflow-x-hidden border-[2.5px] border-[#fbbf24]/85 bg-gradient-to-b from-[#1f1109] via-[#140a05] to-[#0b0503]">
            {/* CABEÇALHO DO SISTEMA COMPETITIVO */}
            <div className="flex items-center justify-between gap-3 flex-wrap pb-2.5 border-b border-amber-500/25">
              <div className="flex items-center gap-3">
                {(() => {
                  const curRank = getRankTierByTrophies(rankingState.trophies);
                  const spr = rankEmblemSprites[curRank.index];
                  return (
                    <div
                      onClick={() => {
                        if (spr) {
                          sound.playClick();
                          setFullscreenImageModal({
                            url: spr,
                            title: `Patente ${curRank.index + 1}: ${curRank.name}`,
                            subtitle: `${curRank.subtitle} • 🏆 ${rankingState.trophies} Troféus`,
                          });
                        }
                      }}
                      title="Clique para ampliar o emblema em Tela Cheia"
                      className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-b from-[#3b1d0b] via-[#1a0b04] to-[#090401] border-2 border-[#fde047] outline outline-2 outline-black flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.5)] flex-shrink-0 cursor-zoom-in group"
                    >
                      {spr ? (
                        <img
                          src={spr}
                          alt={curRank.name}
                          className="w-full h-full object-contain scale-125 group-hover:scale-135 transition-transform drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)]"
                        />
                      ) : (
                        <Trophy className="w-8 h-8 text-[#fde047]" />
                      )}
                    </div>
                  );
                })()}
                <div>
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-400">
                    LIGA COMPETITIVA OFICIAL • TEMPORADA CARAMELO RUN
                  </div>
                  <h3 className="cartoon-title-gold-3d text-lg sm:text-2xl tracking-tight uppercase leading-tight">
                    RANKING, PATENTES & TROFÉUS
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/60 flex items-center gap-1.5">
                  <span className="text-sm">🏆</span>
                  <span className="font-mono font-black text-xs sm:text-sm text-[#fde047]">
                    {rankingState.trophies} TROFÉUS
                  </span>
                </div>
                <SteelCoinPill amount={`R$ ${userCoins.toLocaleString('pt-BR')}`} />
                <OctagonCloseButton onClick={() => setShowRankingModal(false)} />
              </div>
            </div>

            {/* BARRA DE PROGRESSO DA PATENTE ATUAL DO JOGADOR */}
            {(() => {
              const curRank = getRankTierByTrophies(rankingState.trophies);
              const prog = getRankProgressInfo(rankingState.trophies);
              const nextRank = prog.nextTier;
              const totalWins = rankingState.motoWins + rankingState.carameloWins;
              return (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-[#2b150a] via-[#1f0f07] to-[#2b150a] border border-amber-400/45 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-xl bg-black/50 border border-amber-400/50 text-center">
                      <div className="text-[9px] font-bold uppercase text-amber-200/80">PATENTE ATUAL</div>
                      <div
                        className="font-fun font-black text-sm sm:text-base uppercase"
                        style={{ color: curRank.primaryColor }}
                      >
                        {curRank.index + 1}. {curRank.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">
                        {curRank.subtitle}
                      </div>
                      <div className="text-[11px] font-bold text-amber-200/80">
                        Vitórias: <span className="text-emerald-400">{totalWins}</span> • Partidas:{' '}
                        <span className="text-amber-300">{rankingState.totalMatches}</span> • Pizzas:{' '}
                        <span className="text-yellow-300">{rankingState.totalPizzasDelivered}</span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:w-72 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-200">
                      <span>PROGRESSO DE PATENTE</span>
                      <span className="text-[#fde047]">
                        {nextRank
                          ? `FALTAM ${prog.trophiesNeededForNext} 🏆 P/ ${nextRank.name.toUpperCase()}`
                          : 'PATENTE LENDÁRIA MÁXIMA!'}
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-black/75 border border-amber-400/50 overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 transition-all duration-300"
                        style={{ width: `${Math.max(8, prog.progressPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ABAS PRINCIPAIS DO RANKING */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setRankingModalTab('patentes');
                }}
                className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  rankingModalTab === 'patentes'
                    ? 'cartoon-btn-gold shadow-lg'
                    : 'bg-[#241208] text-amber-200/85 border border-amber-500/30 hover:border-amber-400'
                }`}
              >
                <span>🛡️ 8 PATENTES</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setRankingModalTab('missoes');
                }}
                className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5 relative ${
                  rankingModalTab === 'missoes'
                    ? 'cartoon-btn-green shadow-lg'
                    : 'bg-[#241208] text-amber-200/85 border border-amber-500/30 hover:border-amber-400'
                }`}
              >
                <span>🎯 MISSÕES COMPETITIVAS</span>
                {rankingState.missions.some((m: CompetitiveMission) => m.progress >= m.target && !m.claimed) && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-600 border border-white text-[9px] font-black text-white">
                    !
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setRankingModalTab('top');
                }}
                className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  rankingModalTab === 'top'
                    ? 'cartoon-btn-gold shadow-lg'
                    : 'bg-[#241208] text-amber-200/85 border border-amber-500/30 hover:border-amber-400'
                }`}
              >
                <span>🏆 TOP JOGADORES</span>
              </button>
            </div>

            {/* CONTEÚDO DA ABA 1: TODAS AS 8 PATENTES COM EMBLEMAS 3D EXCLUSIVOS */}
            {rankingModalTab === 'patentes' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {RANK_TIERS.map((tier) => {
                  const unlocked = rankingState.trophies >= tier.minTrophies;
                  const isCurrent = getRankTierByTrophies(rankingState.trophies).id === tier.id;
                  const spr = rankEmblemSprites[tier.index];
                  return (
                    <div
                      key={tier.id}
                      className={`p-3 rounded-2xl flex flex-col items-center text-center justify-between gap-2 border-2 transition-all relative ${
                        isCurrent
                          ? 'bg-gradient-to-b from-[#45230f] to-[#1f0f06] border-[#fde047] ring-2 ring-[#fde047]/60 shadow-[0_0_24px_rgba(251,191,36,0.3)]'
                          : unlocked
                          ? 'bg-gradient-to-b from-[#2b160a] to-[#160b05] border-amber-500/45'
                          : 'bg-[#130a05]/90 border-stone-800 opacity-70'
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-600 border border-emerald-200 text-[8.5px] font-black text-white uppercase">
                          ATUAL
                        </span>
                      )}

                      <div
                        onClick={() => {
                          if (spr) {
                            sound.playClick();
                            setFullscreenImageModal({
                              url: spr,
                              title: `${tier.index + 1}. Patente ${tier.name}`,
                              subtitle: `${tier.subtitle} • Requisito: 🏆 ${tier.minTrophies}+ Troféus`,
                            });
                          }
                        }}
                        title="Clique no emblema para ver em Tela Cheia"
                        className="group relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-b from-[#351a0a] via-[#170b04] to-[#080301] border-2 border-[#fde047]/80 outline outline-2 outline-black flex items-center justify-center overflow-hidden p-1.5 shadow-[0_0_18px_rgba(251,191,36,0.32),inset_0_2px_6px_rgba(255,255,255,0.18)] cursor-zoom-in"
                      >
                        <div
                          className="absolute inset-0 pointer-events-none opacity-40"
                          style={{
                            background:
                              'radial-gradient(circle at 50% 35%, rgba(253,224,71,0.45) 0%, transparent 72%)',
                          }}
                        />
                        {spr ? (
                          <img
                            src={spr}
                            alt={tier.name}
                            className={`relative z-10 w-full h-full object-contain transition-transform duration-300 drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)] ${
                              unlocked ? 'scale-[1.18] group-hover:scale-[1.3]' : 'grayscale brightness-75 scale-110 group-hover:scale-125'
                            }`}
                            draggable={false}
                          />
                        ) : (
                          <Trophy className="relative z-10 w-10 h-10 text-amber-400" />
                        )}
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 border border-amber-400/50 text-[8px] font-black text-[#fde047] opacity-0 group-hover:opacity-100 transition-opacity">
                          🔍 ZOOM
                        </span>
                      </div>

                      <div>
                        <div
                          className="font-fun font-black text-sm sm:text-base uppercase tracking-wide"
                          style={{ color: tier.primaryColor }}
                        >
                          {tier.index + 1}. {tier.name}
                        </div>
                        <div className="text-[10px] font-bold text-amber-100/75 mt-0.5">
                          {tier.subtitle}
                        </div>
                      </div>

                      <div className="w-full py-1 px-2 rounded-xl bg-black/55 border border-amber-500/30 text-[10px] font-mono font-black text-[#fde047]">
                        🏆 {tier.minTrophies}+ TROFÉUS
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CONTEÚDO DA ABA 2: MISSÕES COMPETITIVAS (DIÁRIAS, SEMANAIS E TEMPORADA — MOTOBOY & CARAMELO) */}
            {rankingModalTab === 'missoes' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'Todas as Missões' },
                        { id: 'moto', label: '🏍️ Modo Motoboy' },
                        { id: 'caramelo', label: '🐕 Modo Caramelo' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setRankingMissionModeFilter(f.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase cursor-pointer transition-all ${
                          rankingMissionModeFilter === f.id
                            ? 'cartoon-btn-gold'
                            : 'bg-[#221108] text-amber-200/80 border border-amber-500/30'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-amber-200/85">
                    Conclua missões para ganhar Troféus (🏆) e Dinheiro (R$)!
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {rankingState.missions
                    .filter((m: CompetitiveMission) =>
                      rankingMissionModeFilter === 'all' ? true : m.mode === rankingMissionModeFilter
                    )
                    .map((mission: CompetitiveMission) => {
                      const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
                      const isDone = mission.progress >= mission.target;
                      const missionEmoji =
                        mission.mode === 'moto'
                          ? mission.metric.includes('pizza')
                            ? '🍕'
                            : mission.metric.includes('cash')
                            ? '💵'
                            : '🏍️'
                          : mission.metric.includes('bone')
                          ? '🦴'
                          : mission.metric.includes('bite')
                          ? '🦷'
                          : '🐕';
                      return (
                        <div
                          key={mission.id}
                          className={`p-3 rounded-2xl border-2 flex flex-col justify-between gap-2 ${
                            mission.claimed
                              ? 'bg-[#140b06]/70 border-emerald-700/40 opacity-75'
                              : isDone
                              ? 'bg-gradient-to-b from-[#1e3a1e] to-[#112211] border-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.25)]'
                              : 'bg-[#1c0f08] border-amber-500/35'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{missionEmoji}</span>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded bg-black/60 border border-amber-400/40 text-[9px] font-black uppercase text-amber-300">
                                    {mission.frequency === 'daily'
                                      ? 'DIÁRIA'
                                      : mission.frequency === 'weekly'
                                      ? 'SEMANAL'
                                      : 'TEMPORADA'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-black/60 border border-white/15 text-[9px] font-black uppercase text-white">
                                    {mission.mode === 'moto' ? '🏍️ MOTOBOY' : '🐕 CARAMELO'}
                                  </span>
                                </div>
                                <h4 className="text-xs sm:text-sm font-black text-white uppercase mt-1">
                                  {mission.title}
                                </h4>
                                <p className="text-[11px] font-bold text-amber-100/80">
                                  {mission.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/60 text-xs font-mono font-black text-emerald-300 flex items-center gap-1 shadow-sm">
                                💰 +R$ {mission.cashReward.toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-[10px] font-mono font-black text-amber-200 mb-1">
                                <span>
                                  {mission.progress}/{mission.target}
                                </span>
                                <span>{pct}%</span>
                              </div>
                              <div className="w-full h-2.5 rounded-full bg-black/75 border border-amber-500/35 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>

                            {mission.claimed ? (
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-900/60 border border-emerald-400/50 text-[10px] font-black text-emerald-200 uppercase">
                                ✓ RESGATADO
                              </span>
                            ) : isDone ? (
                              <button
                                type="button"
                                onClick={() => {
                                  sound.playClick();
                                  const res = claimCompetitiveMission(rankingState, mission.id);
                                  setRankingState(res.nextState);
                                  if (res.cashEarned > 0) {
                                    const cu = storage.getCurrentUser();
                                    if (cu) storage.adjustUserCoins(cu.id, res.cashEarned);
                                    setUserCoins((c) => c + res.cashEarned);
                                  }
                                  confetti({ particleCount: 55, spread: 70, origin: { y: 0.6 } });
                                  showQuickToast(
                                    `💰 Missão resgatada! +R$ ${res.cashEarned.toLocaleString('pt-BR')}!`
                                  );
                                }}
                                className="px-3.5 py-2 rounded-xl cartoon-btn-green text-[10px] sm:text-xs font-black uppercase tracking-wider cursor-pointer animate-bounce shadow-lg"
                              >
                                RESGATAR!
                              </button>
                            ) : (
                              <span className="px-2.5 py-1.5 rounded-xl bg-black/50 border border-stone-700 text-[10px] font-black text-stone-400 uppercase">
                                EM CURSO
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* CONTEÚDO DA ABA 3: PÓDIO TOP 3 (OURO, PRATA E BRONZE) + TABELA DE CLASSIFICAÇÃO */}
            {rankingModalTab === 'top' &&
              (() => {
                const board = buildCompetitiveLeaderboard(
                  rankingState,
                  currentUser?.nickname || 'Você',
                  equippedMotoboyId
                );
                const top3 = board.slice(0, 3);
                return (
                  <div className="flex flex-col gap-3.5">
                    {/* PÓDIO DESTACADO: 1º OURO, 2º PRATA E 3º BRONZE */}
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                      {top3.map((entry, idx) => {
                        const rankPos = idx + 1;
                        const tier = entry.rankTier;
                        const spr = rankEmblemSprites[tier.index];
                        const avatarImg =
                          motoboy3DThumbs[entry.avatarMotoboyId] ||
                          currentUser?.profilePhotoUrl ||
                          '/logo.png';
                        const medalInfo =
                          rankPos === 1
                            ? {
                                badge: '🥇 1º LUGAR • OURO',
                                border: 'border-[#fde047] bg-gradient-to-b from-[#4d3208] to-[#1f1204]',
                              }
                            : rankPos === 2
                            ? {
                                badge: '🥈 2º LUGAR • PRATA',
                                border: 'border-slate-300 bg-gradient-to-b from-slate-800 to-stone-950',
                              }
                            : {
                                badge: '🥉 3º LUGAR • BRONZE',
                                border: 'border-amber-600 bg-gradient-to-b from-[#3b1d0e] to-stone-950',
                              };
                        return (
                          <div
                            key={entry.id}
                            className={`p-3 rounded-2xl border-2 ${medalInfo.border} flex flex-col items-center text-center gap-1.5 shadow-lg`}
                          >
                            <span className="px-2.5 py-0.5 rounded-full bg-black/65 border border-white/20 text-[9.5px] font-black text-[#fde047] uppercase">
                              {medalInfo.badge}
                            </span>

                            <div className="flex items-center gap-2 mt-1">
                              <img
                                src={avatarImg}
                                alt={entry.name}
                                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[#fde047] bg-stone-900 shadow"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = '/logo.png';
                                }}
                              />
                              {spr && (
                                <img
                                  src={spr}
                                  alt={tier.name}
                                  className="w-10 h-10 object-contain drop-shadow"
                                />
                              )}
                            </div>

                            <div className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                              {entry.name} {entry.isCurrentPlayer ? '(VOCÊ)' : ''}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] font-mono font-black text-[#fde047]">
                              <span>🏆 {entry.trophies}</span>
                              <span>•</span>
                              <span className="text-emerald-300">{entry.wins} VIT</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* TABELA COMPLETA DE CLASSIFICAÇÃO COMPETITIVA */}
                    <div className="rounded-2xl border border-amber-500/35 bg-[#140a05] overflow-hidden max-h-[270px] overflow-y-auto">
                      {board.map((entry, idx) => {
                        const rankPos = idx + 1;
                        const tier = entry.rankTier;
                        const spr = rankEmblemSprites[tier.index];
                        const avatarImg =
                          motoboy3DThumbs[entry.avatarMotoboyId] ||
                          currentUser?.profilePhotoUrl ||
                          '/logo.png';
                        return (
                          <div
                            key={entry.id}
                            className={`px-3.5 py-2 flex items-center justify-between gap-2 border-b border-amber-500/15 text-xs ${
                              entry.isCurrentPlayer
                                ? 'bg-amber-500/20 font-black text-[#fde047]'
                                : 'text-amber-100/90'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 font-mono font-black text-amber-300">
                                #{rankPos}
                              </span>
                              <img
                                src={avatarImg}
                                alt={entry.name}
                                className="w-7 h-7 rounded-full object-cover border border-amber-300 bg-stone-900"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = '/logo.png';
                                }}
                              />
                              {spr && (
                                <img src={spr} alt={tier.name} className="w-6 h-6 object-contain" />
                              )}
                              <span className="truncate font-bold">
                                {entry.name} {entry.isCurrentPlayer ? '⭐ (VOCÊ)' : ''}
                              </span>
                              <span
                                className="hidden sm:inline-block px-2 py-0.5 rounded bg-black/50 text-[9.5px] font-black uppercase"
                                style={{ color: tier.primaryColor }}
                              >
                                {tier.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 font-mono font-black flex-shrink-0">
                              <span className="text-emerald-300">{entry.wins} Vitórias</span>
                              <span className="text-[#fde047]">🏆 {entry.trophies}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      )}

      {/* =========================================================================
          8. ITEM 12: PAINEL DE RECORDES E VITÓRIAS REESTRUTURADO (MAIS LIMPO + CLIQUE NA IMAGEM EXIBE ÍCONES DE COMPARTILHAMENTO ABAIXO DELA)
          ========================================================================= */}
      {phase === 'gameover' && finalSummary && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <style>{`
            @keyframes seLascouSlam {
              0% { opacity: 0; transform: scale(2.35) rotate(-8deg); filter: brightness(2.1); }
              55% { opacity: 1; transform: scale(0.92) rotate(-2deg); filter: brightness(1.2); }
              78% { transform: scale(1.05) rotate(-3.5deg); }
              100% { opacity: 1; transform: scale(1) rotate(-3deg); filter: brightness(1); }
            }
            @keyframes seLascouSweep {
              0% { width: 0%; }
              100% { width: 100%; }
            }
            @keyframes recordsRiseIn {
              0% { opacity: 0; transform: translateY(28px) scale(0.95); }
              70% { opacity: 1; transform: translateY(-4px) scale(1.01); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes recordBadgePulse {
              0%, 100% { transform: translateY(0) scale(1); }
              50% { transform: translateY(-3px) scale(1.04); }
            }
          `}</style>

          {showSeLascouTransition ? (
            /* ETAPA 1: TRANSIÇÃO CINEMÁTICA DE IMPACTO ("SE LASCOU!" OU "MISSÃO CONCLUÍDA!") */
            <button
              type="button"
              onClick={() => {
                if (seLascouTimerRef.current !== null) {
                  window.clearTimeout(seLascouTimerRef.current);
                  seLascouTimerRef.current = null;
                }
                setShowSeLascouTransition(false);
              }}
              className="relative w-full h-full flex flex-col items-center justify-center text-center cursor-pointer select-none px-4"
              aria-label="Avançar para Painel de Resultados"
            >
              {/* Halo Radial Explosivo ou Dourado/Esmeralda Cartoon */}
              <div
                className={`absolute w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] rounded-full blur-2xl pointer-events-none animate-pulse ${
                  isRunVictory
                    ? 'bg-gradient-to-tr from-emerald-500/45 via-amber-400/40 to-yellow-300/30'
                    : 'bg-gradient-to-tr from-red-600/45 via-orange-500/35 to-yellow-400/20'
                }`}
              />

              <div
                style={{ animation: 'seLascouSlam 0.58s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
                className="relative flex flex-col items-center gap-3"
              >
                <div
                  className={`px-4 py-1 rounded-full border-[3px] border-[#1f0901] shadow-[0_5px_0_#1f0901] text-xs sm:text-sm font-black uppercase tracking-widest ${
                    isRunVictory
                      ? 'bg-emerald-600 text-yellow-200'
                      : 'bg-red-600 text-yellow-200'
                  }`}
                >
                  {isMissionCompletedVictory
                    ? '🍕 TODAS AS PIZZAS ENTREGUES — FUGA CONCLUÍDA!'
                    : isRunVictory
                    ? '🏆 VITÓRIA DO CARAMELO!'
                    : '💥 FIM DE CORRIDA!'}
                </div>

                <h2
                  className={`font-fun font-black text-5xl sm:text-7xl md:text-8xl uppercase tracking-tight leading-none ${
                    isRunVictory ? 'text-[#86efac]' : 'text-[#fde047]'
                  }`}
                  style={{
                    paintOrder: 'stroke fill',
                    WebkitTextStroke: '9px #1f0901',
                    textShadow: isRunVictory
                      ? '0 8px 0 #064e3b, 0 14px 28px rgba(0,0,0,0.9)'
                      : '0 8px 0 #7f1d1d, 0 14px 28px rgba(0,0,0,0.9)',
                  }}
                >
                  {isMissionCompletedVictory
                    ? 'ESCAPOU!'
                    : isRunVictory
                    ? 'CAPTURADO!'
                    : 'SE LASCOU!'}
                </h2>

                {gameOverReason && (
                  <div className="cartoon-wood-plank px-4 py-1.5 rounded-xl border-2 border-amber-400/80 text-[11px] sm:text-xs font-black text-amber-100 uppercase tracking-wider shadow-xl">
                    {gameOverReason}
                  </div>
                )}

                <div className="w-48 sm:w-64 h-2 rounded-full bg-stone-950/90 border border-amber-400/50 overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full ${
                      isRunVictory
                        ? 'bg-gradient-to-r from-emerald-400 via-yellow-400 to-amber-500'
                        : 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500'
                    }`}
                    style={{ animation: 'seLascouSweep 1.7s linear forwards' }}
                  />
                </div>
              </div>
            </button>
          ) : (
            /* ETAPA 2: PRIMEIRO EXIBE PAINEL DE VITÓRIA OU TELA DE DERROTA (CARAMELO / MOTO) -> BOTÃO "PRÓXIMO ▶" -> TELA DE RECORDS (SEM IMAGEM NA DERROTA IGUAL VITÓRIA!) */
            <div
              style={{ animation: 'recordsRiseIn 0.44s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
              className={`max-w-xl w-full my-auto p-3 sm:p-4 rounded-[26px] bg-gradient-to-b from-[#1f1008]/95 via-[#150b05]/95 to-[#0c0603]/98 border-[2.5px] relative shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col gap-2.5 ${
                !isRunVictory && gameOverPanelTab === 'vitorias'
                  ? 'border-rose-500/85'
                  : 'border-[#fbbf24]/85'
              }`}
            >
              {/* Cabeçalho Limpo e Moderno com Título de Vitória, Derrota ou Records */}
              <div
                className={`px-3.5 py-2 rounded-2xl border flex items-center justify-between gap-2 flex-wrap relative ${
                  gameOverPanelTab === 'records'
                    ? 'bg-gradient-to-r from-[#2e170b] via-[#3d1f0f] to-[#261208] border-[#fde047]/45'
                    : isRunVictory
                    ? 'bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#064e3b] border-emerald-300/60'
                    : 'bg-gradient-to-r from-[#450a0a] via-[#7f1d1d] to-[#450a0a] border-rose-400/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-[#fde047] drop-shadow" />
                  <h3 className="cartoon-title-gold-3d text-base sm:text-xl uppercase tracking-wide leading-none">
                    {gameOverPanelTab === 'records'
                      ? 'TELA DE RECORDS'
                      : isRunVictory
                      ? playMode === 'caramelo'
                        ? 'VITÓRIA DO CARAMELO'
                        : 'PAINEL DE VITÓRIA'
                      : playMode === 'caramelo'
                      ? 'DERROTA DO CARAMELO'
                      : 'PAINEL DE DERROTA'}
                  </h3>
                </div>

                {isMissionCompletedVictory ? (
                  <span
                    style={{ animation: 'recordBadgePulse 1.8s ease-in-out infinite' }}
                    className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 border-2 border-emerald-200 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-md"
                  >
                    🍕 MISSÃO CONCLUÍDA!
                  </span>
                ) : isRunVictory ? (
                  <span
                    style={{ animation: 'recordBadgePulse 1.8s ease-in-out infinite' }}
                    className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 border-2 border-emerald-200 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-md"
                  >
                    🏆 MOTOBOY CAPTURADO!
                  </span>
                ) : finalSummary.score >= finalSummary.bestScore && finalSummary.score > 0 ? (
                  <span
                    style={{ animation: 'recordBadgePulse 1.8s ease-in-out infinite' }}
                    className="cartoon-gold-ribbon px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-md"
                  >
                    ⭐ NOVO RECORDE!
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl bg-red-950/90 border border-rose-300/60 text-[10px] font-black text-rose-100 uppercase tracking-wider">
                    {playMode === 'caramelo' ? '🐕 CARAMELO CAIU!' : '💥 FIM DE PARTIDA'}
                  </span>
                )}
              </div>

              {/* Destaque Competitivo de Troféus Ganhos & Subida de Patente */}
              {matchRankReport && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setShowRankingModal(true);
                  }}
                  className="px-3 py-2 rounded-2xl bg-gradient-to-r from-[#2c1609] via-[#3d1e0c] to-[#2c1609] border border-[#fde047]/65 flex items-center justify-between gap-2 cursor-pointer hover:brightness-110 transition-all"
                >
                  <div className="flex items-center gap-2">
                    {(() => {
                      const tier = getRankTierByTrophies(rankingState.trophies);
                      const spr = rankEmblemSprites[tier.index];
                      return spr ? (
                        <img src={spr} alt={tier.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <span className="text-lg">🏆</span>
                      );
                    })()}
                    <div className="text-left">
                      <div className="text-[10px] font-black uppercase text-amber-300">
                        {matchRankReport.promotedTo
                          ? `🎉 SUBIU PARA PATENTE ${matchRankReport.promotedTo.name.toUpperCase()}!`
                          : `PATENTE ${getRankTierByTrophies(rankingState.trophies).name.toUpperCase()}`}
                      </div>
                      <div className="text-xs font-black text-white">
                        +{matchRankReport.trophiesDelta} Troféus conquistados nesta partida!
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-[#1f0901] text-[10px] font-black uppercase">
                    VER RANKING
                  </span>
                </button>
              )}

              {gameOverPanelTab === 'vitorias' ? (
                /* PASSO 1: PAINEL DE VITÓRIA OU TELA DE DERROTA — QUADRO LIMPO COM "(SEM FOTOS)" NA PARTE DAS IMAGENS */
                <div className="flex flex-col gap-2.5">
                  <div
                    onClick={() => {
                      sound.playClick();
                      setShowGameOverPhotoShare((v) => !v);
                    }}
                    title="Clique para opções de compartilhamento"
                    className={`relative rounded-2xl overflow-hidden border-[3px] shadow-inner h-[135px] sm:h-[150px] cursor-pointer flex flex-col items-center justify-center p-4 text-center ${
                      isRunVictory
                        ? 'border-emerald-500/60 bg-gradient-to-b from-[#064e3b]/55 via-[#1c0d06]/95 to-[#120804]'
                        : 'border-rose-500/60 bg-gradient-to-b from-[#450a0a]/60 via-[#1c0d06]/95 to-[#120804]'
                    }`}
                  >
                    <span
                      className="font-fun font-black text-base sm:text-xl uppercase tracking-widest text-amber-200/80 mb-5 select-none"
                      style={{
                        paintOrder: 'stroke fill',
                        WebkitTextStroke: '2.5px #1f0901',
                        textShadow: '0 2px 0 #1f0901',
                      }}
                    >
                      (SEM FOTOS)
                    </span>

                    <div className="absolute bottom-2 left-2 right-2 cartoon-wood-inset px-3 py-1 rounded-lg border border-amber-400/40 flex items-center justify-between text-[10px] sm:text-[11px] font-black">
                      <span className="text-amber-100 truncate">
                        {playMode === 'caramelo'
                          ? `🐕 ${equippedCarameloSpec.name}`
                          : `🏍️ ${equippedSpec.name} • ${selectedMotoboySpec.name}`}
                      </span>
                      <span className="text-[#fde047] font-mono ml-1.5">
                        {Math.round(finalSummary.speed)} km/h
                      </span>
                    </div>
                  </div>

                  {showGameOverPhotoShare && (
                    <div className="p-2 rounded-2xl bg-[#180c06] border-2 border-[#fbbf24] grid grid-cols-4 gap-1.5 animate-fade-in">
                      <button
                        type="button"
                        onClick={handleWhatsAppShare}
                        className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-300 text-white font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer shadow"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>WHATSAPP</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleInstagramShare}
                        className="py-2 px-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 border border-fuchsia-300 text-white font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer shadow"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        <span>STORIES</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadImage}
                        className="py-2 px-2 rounded-xl bg-sky-600 hover:bg-sky-500 border border-sky-300 text-white font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer shadow"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>BAIXAR</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNativeShare}
                        className="py-2 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 border border-yellow-200 text-stone-950 font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer shadow"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>LINK</span>
                      </button>
                    </div>
                  )}

                  {/* 3 Indicadores do Modo (Caramelo ou Moto) */}
                  {playMode === 'caramelo' ? (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="cartoon-wood-plank p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] font-black uppercase text-amber-100/90 tracking-wider">
                          OSSOS NA CORRIDA
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-[#fef08a] font-mono leading-tight mt-0.5 cartoon-text-outline">
                          {finalSummary.bonesCollected ?? 0} 🦴
                        </span>
                      </div>

                      <div className="cartoon-wood-plank p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] font-black uppercase text-amber-100/90 tracking-wider">
                          MORDIDAS DADAS
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-[#86efac] font-mono leading-tight mt-0.5 cartoon-text-outline">
                          {Math.max(
                            0,
                            (finalSummary.targetMotoboyMaxHp ?? 10) -
                              (finalSummary.targetMotoboyHp ?? 10),
                          )}
                          /{finalSummary.targetMotoboyMaxHp ?? 10} 🦷
                        </span>
                      </div>

                      <div className="cartoon-wood-plank p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] font-black uppercase text-amber-100/90 tracking-wider">
                          VITÓRIAS CARAMELO
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono leading-tight mt-0.5 cartoon-text-outline">
                          {rankingState.carameloWins} 🏆
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="cartoon-wood-plank p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-black uppercase text-amber-100/90 tracking-wider">
                          PIZZAS ENTREGUES
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-[#86efac] font-mono leading-tight mt-0.5 cartoon-text-outline">
                          {finalSummary.pizzasDelivered ?? 0}/{finalSummary.pizzaMissionGoal ?? 20} 🍕
                        </span>
                      </div>

                      <div className="cartoon-wood-plank p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-black uppercase text-amber-100/90 tracking-wider">
                          DINHEIRO DA PARTIDA
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-[#4ade80] font-mono leading-tight mt-0.5 cartoon-text-outline">
                          +R$ {earnedRunMoney.total.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Botão PRÓXIMO -> Abre a Tela de Records */}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setGameOverPanelTab('records');
                    }}
                    className="cartoon-btn-gold w-full py-3.5 px-5 rounded-2xl font-fun font-black text-sm sm:text-base uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-95 transition-all"
                  >
                    <span>PRÓXIMO: VER TELA DE RECORDS</span>
                    <ChevronRight className="w-5 h-5 stroke-[3]" />
                  </button>
                </div>
              ) : (
                /* PASSO 2: TELA DE RECORDS — QUADRO LIMPO COM "(SEM FOTOS)" NA PARTE DAS IMAGENS */
                <div className="flex flex-col gap-2.5">
                  <div
                    onClick={() => {
                      sound.playClick();
                      setShowGameOverPhotoShare((v) => !v);
                    }}
                    title="Clique para opções de compartilhamento"
                    className="relative rounded-2xl overflow-hidden border-[3px] border-[#3d1e0d] bg-[#1c0d06]/90 shadow-inner h-[135px] sm:h-[150px] cursor-pointer flex flex-col items-center justify-center p-4 text-center"
                  >
                    <span
                      className="font-fun font-black text-base sm:text-xl uppercase tracking-widest text-amber-200/80 mb-5 select-none"
                      style={{
                        paintOrder: 'stroke fill',
                        WebkitTextStroke: '2.5px #1f0901',
                        textShadow: '0 2px 0 #1f0901',
                      }}
                    >
                      (SEM FOTOS)
                    </span>

                    <div className="absolute bottom-2 left-2 right-2 cartoon-wood-inset px-3 py-1 rounded-lg border border-amber-400/40 flex items-center justify-between text-[10px] sm:text-[11px] font-black">
                      <span className="text-amber-100 truncate">
                        {playMode === 'caramelo'
                          ? `🐕 ${equippedCarameloSpec.name}`
                          : `🏍️ ${equippedSpec.name}`}
                      </span>
                      <span className="text-[#fde047] font-mono ml-1.5 whitespace-nowrap">
                        {Math.round(finalSummary.speed)} km/h
                      </span>
                    </div>
                  </div>

                  {showGameOverPhotoShare && (
                    <div className="p-2 rounded-2xl bg-[#180c06] border-2 border-[#fbbf24] grid grid-cols-4 gap-1.5 animate-fade-in">
                      <button
                        type="button"
                        onClick={handleWhatsAppShare}
                        className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-300 text-white font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer shadow"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>WHATSAPP</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleInstagramShare}
                        className="py-2 px-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 border border-fuchsia-300 text-white font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer shadow"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        <span>STORIES</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadImage}
                        className="py-2 px-2 rounded-xl bg-sky-600 hover:bg-sky-500 border border-sky-300 text-white font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer shadow"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>BAIXAR</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleNativeShare}
                        className="py-2 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 border border-yellow-200 text-stone-950 font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer shadow"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>LINK</span>
                      </button>
                    </div>
                  )}

                  {/* 3 Cards Grandes e Limpos de Destaque: PONTOS • MELHOR RECORDE • DISTÂNCIA */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="cartoon-wood-plank p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                      <span className="text-[9.5px] font-black uppercase text-amber-100/90 tracking-wider">
                        PONTOS
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-[#fef08a] font-mono leading-tight mt-0.5 cartoon-text-outline">
                        {Math.floor(finalSummary.score)}
                      </span>
                    </div>

                    <div className="cartoon-wood-plank p-2.5 rounded-2xl flex flex-col items-center justify-center text-center border border-[#fde047]/45">
                      <span className="text-[9.5px] font-black uppercase text-[#fde047] tracking-wider">
                        MELHOR RECORDE
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-[#fde047] font-mono leading-tight mt-0.5 cartoon-text-outline">
                        {Math.max(Math.floor(finalSummary.score), Math.floor(finalSummary.bestScore))}
                      </span>
                    </div>

                    <div className="cartoon-wood-plank p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                      <span className="text-[9.5px] font-black uppercase text-amber-100/90 tracking-wider">
                        DISTÂNCIA
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono leading-tight mt-0.5 cartoon-text-outline">
                        {Math.floor(finalSummary.distance)}m
                      </span>
                    </div>
                  </div>

                  {/* Resumo Limpo de Dinheiro Ganho na Partida */}
                  <div className="cartoon-wood-plank px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase text-amber-100 tracking-wide">
                        💵 RECOMPENSA DA PARTIDA
                      </span>
                      {!isRunVictory && (
                        <span className="text-[9.5px] font-black uppercase text-[#f87171] tracking-wider">
                          💀 DERROTA: -50% DO DINHEIRO COLETADO
                        </span>
                      )}
                    </div>
                    <span className="cartoon-title-gold-3d text-lg sm:text-xl font-mono">
                      +R$ {earnedRunMoney.total.toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {/* Botões de Ação na Tela de Records */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setGameOverPanelTab('vitorias');
                      }}
                      className="cartoon-btn-wood py-3 px-3.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>VOLTAR</span>
                    </button>

                    <button
                      type="button"
                      onClick={restartRun}
                      className="cartoon-btn-green flex-1 py-3 px-5 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-95 transition-all relative"
                    >
                      <RotateCcw className="w-5 h-5 stroke-[3]" />
                      <span>JOGAR NOVAMENTE</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Navegação Rápida Inferior Limpa: Ranking • Garagem • Menu */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setShowRankingModal(true);
                  }}
                  className="cartoon-btn-gold py-2 px-2 rounded-xl font-black text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Trophy className="w-4 h-4 shrink-0" />
                  <span>RANKING</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    sound.stopMusic();
                    sound.startMenuMusic();
                    setGameState('IDLE');
                    setPhase('title');
                    setShowSkinsModal(true);
                  }}
                  className="cartoon-btn-blue py-2 px-2 rounded-xl font-black text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Award className="w-4 h-4 shrink-0" />
                  <span>GARAGEM</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    sound.stopMusic();
                    sound.startMenuMusic();
                    setGameState('IDLE');
                    setPhase('title');
                  }}
                  className="cartoon-btn-wood py-2 px-2 rounded-xl font-black text-[11px] uppercase flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Home className="w-4 h-4 text-[#fde047] shrink-0" />
                  <span>MENU</span>
                </button>
              </div>

              {shareToast && (
                <div className="cartoon-wood-inset px-3 py-1 rounded-xl text-center text-[11px] font-black text-[#fde047] border border-amber-400/50 animate-fade-in">
                  {shareToast}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          8. MODAL DE VISUALIZAÇÃO DE IMAGEM EM TELA CHEIA (LIGHTBOX COM PROPORÇÃO ORIGINAL)
          ========================================================================= */}
      {fullscreenImageModal && (
        <div
          onClick={() => setFullscreenImageModal(null)}
          className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full rounded-[28px] cartoon-wood-board border-[3px] border-[#fbbf24] p-3 sm:p-5 shadow-[0_28px_80px_rgba(0,0,0,0.95)] flex flex-col items-center gap-3"
          >
            <SteelCornerBrackets size="md" />

            <div className="w-full flex items-center justify-between gap-3 border-b border-amber-500/30 pb-2.5">
              <div className="text-left">
                {fullscreenImageModal.title && (
                  <h4 className="font-fun font-black text-base sm:text-xl text-[#fde047] uppercase leading-tight cartoon-text-outline">
                    {fullscreenImageModal.title}
                  </h4>
                )}
                {fullscreenImageModal.subtitle && (
                  <p className="text-[11px] sm:text-xs font-bold text-amber-200/90 mt-0.5">
                    {fullscreenImageModal.subtitle}
                  </p>
                )}
              </div>
              <OctagonCloseButton onClick={() => setFullscreenImageModal(null)} />
            </div>

            <div className="relative w-full max-h-[72vh] rounded-2xl bg-[#0d0603] border-2 border-[#fbbf24]/60 flex items-center justify-center overflow-hidden p-2 sm:p-4 shadow-inner">
              <img
                src={fullscreenImageModal.url}
                alt={fullscreenImageModal.title || 'Visualização em Tela Cheia'}
                className="max-w-full max-h-[66vh] w-auto h-auto object-contain rounded-xl select-none drop-shadow-[0_10px_28px_rgba(0,0,0,0.85)]"
                draggable={false}
              />
            </div>

            <button
              type="button"
              onClick={() => setFullscreenImageModal(null)}
              className="px-6 py-2.5 rounded-xl cartoon-btn-gold font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              ✕ FECHAR TELA CHEIA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TropicalVilaRunner;
