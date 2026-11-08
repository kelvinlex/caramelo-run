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
} from '../RunnerCanvas';
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
  const [garageSection, setGarageSection] = useState<GarageShowroomMode>('motos');
  const [garageStepBanner, setGarageStepBanner] = useState<string | null>(null);
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
  const prevHpRef = useRef<number>(10);
  const [brokenHeartIndex, setBrokenHeartIndex] = useState<number | null>(null);
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

  // Modais
  const [isSettingsOpen, setIsSettingsOpen] = useState(startInSettings);
  const [settingsTab, setSettingsTab] = useState<'gameplay' | 'graphics' | 'audio' | 'weather'>('gameplay');
  const [showSkinsModal, setShowSkinsModal] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [isPhotoSelectorOpen, setIsPhotoSelectorOpen] = useState(false);

  // Áudio & Tela Cheia
  const [soundMuted, setSoundMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Usuário e Moedas
  const [currentUser, setCurrentUser] = useState(() => storage.getCurrentUser());
  const [userCoins, setUserCoins] = useState(() => {
    const cu = storage.getCurrentUser();
    if (isInfiniteMoneyUser(cu)) return 999999999;
    return cu?.ossoCoins || 2500;
  });

  // Configurações Gráficas e de Controle
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(() => {
    try {
      const saved = localStorage.getItem('caramelo_difficulty') as any;
      if (saved && ['easy', 'medium', 'hard'].includes(saved)) return saved;
    } catch {}
    return 'medium';
  });

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

  // HUD
  const [hud, setHud] = useState<HudSnapshot>({
    score: 0,
    bestScore: storage.getCurrentUser()?.stats.maiorPontuacao || 0,
    coins: 0,
    distance: 0,
    hp: 3,
    maxHp: 3,
    combo: 0,
    speed: 13.5,
    housesPassed: 0,
    leftHouseId: 1,
    leftHouseName: 'Casas Brasileiras',
    rightHouseId: 2,
    rightHouseName: 'Sobrado Tropical',
  });

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

  // Item 4: Animação curta de quebra/desaparecimento quando o Motoboy ou Caramelo perde 1 coração!
  useEffect(() => {
    if (hud.hp < prevHpRef.current) {
      setBrokenHeartIndex(hud.hp);
      const t = window.setTimeout(() => setBrokenHeartIndex(null), 550);
      prevHpRef.current = hud.hp;
      return () => window.clearTimeout(t);
    }
    prevHpRef.current = hud.hp;
  }, [hud.hp]);

  // Item 8: Feedback visual de Entrega de Pizza Concluída + Pop no Contador de Pizzas!
  useEffect(() => {
    const nonce = hud.lastPizzaDeliveredNonce ?? 0;
    if (nonce <= 0 || nonce === lastPizzaNonceRef.current) return;
    lastPizzaNonceRef.current = nonce;
    setPizzaCounterPop(true);
    window.setTimeout(() => setPizzaCounterPop(false), 420);
    if (pizzaBadgeTimerRef.current !== null) window.clearTimeout(pizzaBadgeTimerRef.current);
    setPizzaDeliveredBadge(Date.now());
    pizzaBadgeTimerRef.current = window.setTimeout(() => {
      setPizzaDeliveredBadge(null);
      pizzaBadgeTimerRef.current = null;
    }, 1450);
  }, [hud.lastPizzaDeliveredNonce]);

  // Item 3: Piscar rapidamente em azul no acerto da mordida + badge de precisão!
  useEffect(() => {
    const res = hud.biteLastResult;
    if (!res || res.nonce === lastBiteNonceRef.current) return;
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
      perfect: '🎯 MORDIDA PERFEITA! IMPACTO MÁXIMO!',
      good: '⚡ BOA MORDIDA! NA MOSCA!',
      weak: '🦷 PEGOU DE RASPÃO!',
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

  const handleGameOver = useCallback((finalSnap: HudSnapshot, crashVehicleName?: string) => {
    const upperReason = (crashVehicleName || '').toUpperCase();
    const missionFlag = upperReason.includes('MISSÃO CONCLUÍDA');
    const victoryFlag = missionFlag || upperReason.includes('VITÓRIA');

    setIsMissionCompletedVictory(missionFlag);
    setIsRunVictory(victoryFlag);
    setGameOverPanelTab(missionFlag ? 'vitorias' : 'records');
    setFinalSummary(finalSnap);
    setGameOverImage(getNextGameOverImage());
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

    // Soma as notas coletadas na rua (R$ 10, R$ 50, R$ 100 e rara R$ 200) + bônus de distância/finas
    const sb = streetBillsRef.current;
    const n10 = sb.n10 + Math.max(1, finalSnap.coins + Math.floor(finalSnap.distance / 45));
    const n50 = sb.n50 + Math.floor(finalSnap.distance / 155) + Math.floor(finalSnap.combo / 4);
    const n100 = sb.n100 + Math.floor(finalSnap.score / 950) + (missionFlag ? 3 : 0);
    const n200 = sb.n200 + (missionFlag ? 1 : 0);
    const total = n10 * 10 + n50 * 50 + n100 * 100 + n200 * 200;
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

  const startGame = useCallback(() => {
    sound.playClick();
    sound.startMusic(true);
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
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
    lastBiteNonceRef.current = 0;
    lastDodgeNonceRef.current = 0;
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
  }, []);

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
    lastBiteNonceRef.current = 0;
    lastDodgeNonceRef.current = 0;
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
      confetti({ particleCount: 40, spread: 60 });
      proceedToMotoboyStep(spec.name);
    } else {
      if (handleSpendCoins(spec.price)) {
        const next = [...unlockedMotoIds, spec.id];
        setUnlockedMotoIds(next);
        saveUnlockedMotoIds(next);
        setEquippedMotoId(spec.id);
        saveEquippedMotoId(spec.id);
        confetti({ particleCount: 75, spread: 85, origin: { y: 0.6 } });
        proceedToMotoboyStep(spec.name);
      } else {
        alert(
          'Saldo insuficiente! Colete as notas de R$ 10, R$ 50, R$ 100 e R$ 200 na rua para comprar esta moto!',
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
      confetti({ particleCount: 45, spread: 65 });
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
        confetti({ particleCount: 75, spread: 85, origin: { y: 0.6 } });
        showGarageBanner(`🧑‍🚀 ${mbSpec.name} desbloqueado e equipado na moto!`);
      } else {
        alert('Saldo insuficiente! Colete dinheiro na rua para desbloquear este Piloto Motoboy!');
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
      confetti({ particleCount: 45, spread: 65 });
      showGarageBanner(`🐕 ${dogSpec.name} equipado na pista!`);
    } else {
      if (handleSpendCoins(dogSpec.price)) {
        const next = [...unlockedCarameloIds, dogSpec.id];
        setUnlockedCarameloIds(next);
        saveUnlockedCarameloIds(next);
        setEquippedCarameloId(dogSpec.id);
        saveEquippedCarameloId(dogSpec.id);
        confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } });
        showGarageBanner(`🐕 ${dogSpec.name} desbloqueado e equipado!`);
      } else {
        alert('Saldo insuficiente! Colete notas de dinheiro na rua para liberar este Caramelo!');
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
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden select-none bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Vila Tropical com Ciclo Dia/Noite + Aurora Boreal, Moto/Motoboy e Caramelos Cartoon */}
      <RunnerCanvas
        phase={gameState === 'IDLE' ? 'title' : phase}
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
        onGameOver={handleGameOver}
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
      `}</style>
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/35 pointer-events-none" />

          {/* TOP BAR INTERATIVA — MESMA QUALIDADE DE MADEIRA ENTALHADA DOS CARTÕES */}
          <div
            style={{
              animation: !lobbyExiting
                ? 'cartoonMenuBandIn 280ms cubic-bezier(0.22, 1, 0.36, 1) both'
                : undefined,
            }}
            className={`relative z-20 w-full max-w-6xl flex items-start justify-between pt-0.5 sm:pt-1 px-1 sm:px-2 ${
              lobbyExiting ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            {/* Lado Esquerdo: INÍCIO, ANÚNCIOS, SOM e TELA CHEIA em Moldura de Madeira */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
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

            {/* Lado Direito: Perfil do Jogador + Todas as Cédulas do Jogo (10, 50, 100 e 200) Bem Bonitinhas na Frente */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sound.playClick();
                  setIsPhotoSelectorOpen(true);
                }}
                className="relative p-1 rounded-2xl cartoon-wood-board border-2 border-[#451a03] cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
                title="Perfil do Jogador e Carteira de Notas"
              >
                <SteelCornerBrackets size="sm" />
                <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-xl cartoon-wood-inset border border-amber-500/45">
                  <img
                    src={
                      currentUser?.profilePhotoUrl ||
                      '/profile_photos/image_20261007_113044 - Copia.webp'
                    }
                    alt="Perfil"
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-[#fde047] shadow flex-shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/logo.png';
                    }}
                  />

                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-[11px] text-amber-100 uppercase font-black leading-none cartoon-text-outline max-w-[96px] truncate">
                        {currentUser?.nickname || 'Jogador'}
                      </span>
                      {isInfiniteMoneyUser(currentUser) ? (
                        <span className="text-[11px] sm:text-xs font-black text-[#4ade80] leading-none cartoon-text-outline flex items-center gap-1">
                          <span>R$ ∞</span>
                          <span className="px-1 py-0.5 bg-amber-400 text-[#1f0901] rounded text-[8px] font-black uppercase tracking-wider">
                            ADM
                          </span>
                        </span>
                      ) : (
                        <span className="text-[11px] sm:text-xs font-black text-[#4ade80] leading-none cartoon-text-outline">
                          R$ {userCoins.toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>

                    {/* Todas as 4 Notas do Jogo (10, 50, 100 e 200) bem bonitinhas na frente! */}
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        title="Notas de R$ 10"
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gradient-to-b from-rose-400 to-rose-600 border border-rose-200 text-[9px] font-black text-white shadow-sm leading-none"
                      >
                        <span>10</span>
                        <span className="text-rose-100 opacity-90">
                          ×{isInfiniteMoneyUser(currentUser) ? '∞' : (currentUser?.notas10 ?? Math.floor(userCoins / 100))}
                        </span>
                      </span>

                      <span
                        title="Notas de R$ 50"
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gradient-to-b from-amber-400 to-orange-600 border border-amber-100 text-[9px] font-black text-stone-950 shadow-sm leading-none"
                      >
                        <span>50</span>
                        <span className="opacity-85">
                          ×{isInfiniteMoneyUser(currentUser) ? '∞' : (currentUser?.notas50 ?? 0)}
                        </span>
                      </span>

                      <span
                        title="Notas de R$ 100"
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gradient-to-b from-sky-400 to-blue-600 border border-sky-100 text-[9px] font-black text-white shadow-sm leading-none"
                      >
                        <span>100</span>
                        <span className="text-sky-100 opacity-90">
                          ×{isInfiniteMoneyUser(currentUser) ? '∞' : (currentUser?.notas100 ?? 0)}
                        </span>
                      </span>

                      <span
                        title="Notas Raras de R$ 200"
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gradient-to-b from-[#9f1239] to-[#4c0519] border border-amber-300 text-[9px] font-black text-[#fde047] shadow-sm leading-none"
                      >
                        <span>200</span>
                        <span className="text-amber-100 opacity-95">
                          ×{isInfiniteMoneyUser(currentUser) ? '∞' : (currentUser?.notas200 ?? 0)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* CENTRO LIMPO: APENAS ROSTO DO CARAMELO + NOME DO JOGO + BOTÃO COMEÇAR */}
          <div
            style={{
              animation: !lobbyExiting
                ? 'cartoonMenuBandIn 320ms cubic-bezier(0.22, 1, 0.36, 1) 55ms both'
                : undefined,
            }}
            className={`relative z-20 my-auto flex flex-col items-center gap-3.5 sm:gap-4 max-w-xl w-full px-2 ${
              lobbyExiting ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            {/* PLACA LIMPA DE MADEIRA ENTALHADA: APENAS ROSTO CARAMELO CARTOON + CARAMELO RUN */}
            <div className="cartoon-hero-float relative cartoon-wood-board px-6 sm:px-10 py-3.5 sm:py-4.5 rounded-[28px] border-[3px] border-[#f59e0b] flex items-center justify-center shadow-[0_14px_34px_rgba(0,0,0,0.85)]">
              <SteelCornerBrackets size="md" />

              <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 leading-none">
                {/* Rosto do Caramelo Cartoon super expressivo */}
                <div className="w-12 h-12 sm:w-15 sm:h-15 flex-shrink-0 drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">
                  <svg viewBox="0 0 64 64" className="w-full h-full">
                    {/* Orelhas caídas simpáticas */}
                    <path
                      d="M15 24 C7 18, 5 31, 11 39 C14 42, 18 37, 18 30 Z"
                      fill="#92400e"
                      stroke="#1f0901"
                      strokeWidth="3.2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M49 24 C57 18, 59 31, 53 39 C50 42, 46 37, 46 30 Z"
                      fill="#92400e"
                      stroke="#1f0901"
                      strokeWidth="3.2"
                      strokeLinejoin="round"
                    />
                    {/* Cabeça dourada caramelo */}
                    <ellipse
                      cx="32"
                      cy="33"
                      rx="18.5"
                      ry="17.5"
                      fill="#f59e0b"
                      stroke="#1f0901"
                      strokeWidth="3.5"
                    />
                    {/* Mancha clara na testa/focinho */}
                    <ellipse
                      cx="32"
                      cy="39.5"
                      rx="11"
                      ry="8.5"
                      fill="#fde68a"
                      stroke="#1f0901"
                      strokeWidth="2.6"
                    />
                    {/* Olhos brilhantes cartoon */}
                    <circle cx="24.5" cy="28.5" r="3.6" fill="#1f0901" />
                    <circle cx="23.4" cy="27.3" r="1.3" fill="#ffffff" />
                    <circle cx="39.5" cy="28.5" r="3.6" fill="#1f0901" />
                    <circle cx="38.4" cy="27.3" r="1.3" fill="#ffffff" />
                    {/* Sobrancelhas expressivas */}
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
                    {/* Focinho preto brilhante */}
                    <ellipse cx="32" cy="36.5" rx="4.6" ry="3.2" fill="#1f0901" />
                    <ellipse cx="30.8" cy="35.6" rx="1.5" ry="0.9" fill="#ffffff" opacity="0.8" />
                    {/* Sorriso + linguinha rosa */}
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
                    className="font-fun font-black text-3xl sm:text-5xl md:text-[54px] tracking-tight text-[#fde047] uppercase leading-none"
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

            {/* BOTÃO COMEÇAR SUPER DINÂMICO EM MADEIRA ENTALHADA & ESMERALDA 3D */}
            <button
              onClick={startGame}
              className="group relative p-2 sm:p-2.5 rounded-[28px] cartoon-wood-board cartoon-wood-start-btn border-[3px] border-[#fbbf24] cursor-pointer"
            >
              <SteelCornerBrackets size="md" />

              <div className="relative overflow-hidden px-7 sm:px-11 py-3 sm:py-4 rounded-[20px] bg-gradient-to-b from-[#4ade80] via-[#16a34a] to-[#15803d] border-[3px] border-[#bbf7d0] shadow-[inset_0_3px_0_rgba(255,255,255,0.75),inset_0_-4px_0_rgba(5,46,22,0.8),0_4px_0_#052e16] flex items-center justify-center gap-3.5 sm:gap-4">
                <div className="cartoon-shine-bar" />

                <div className="relative w-11 h-11 sm:w-13 sm:h-13 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.65)] group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <svg viewBox="0 0 64 64" className="w-full h-full">
                    <polygon
                      points="20,4 44,4 60,20 60,44 44,60 20,60 4,44 4,20"
                      fill="#9a3412"
                      stroke="#3b1304"
                      strokeWidth="4"
                    />
                    <polygon
                      points="22,9 42,9 55,22 55,42 42,55 22,55 9,42 9,22"
                      fill="#fbbf24"
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
                      WebkitTextStroke: '4.5px #052e16',
                      textShadow: '0 3px 0 #052e16, 0 6px 10px rgba(0,0,0,0.75)',
                    }}
                  >
                    COMEÇAR
                  </span>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#fef08a] cartoon-text-outline mt-0.5">
                    {playMode === 'caramelo'
                      ? `CORRER COM ${equippedCarameloSpec.name.toUpperCase()}!`
                      : 'ACELERAR NA MOTO (+ CARAMELOS ATRÁS)!'}
                  </span>
                </div>

                <div className="hidden xs:flex items-center text-[#fef08a] group-hover:translate-x-1 transition-transform drop-shadow">
                  <Zap className="w-6 h-6 sm:w-7 sm:h-7 fill-[#fde047] text-[#3b1304] stroke-[2.2]" />
                </div>
              </div>
            </button>

            {/* SELETORES RÁPIDOS EM MADEIRA: MODO DE JOGO (MOTO vs CARAMELO) + DIFICULDADE */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {/* Alternador de Protagonista: Moto (+ Caramelos atrás) vs Jogar com Caramelo */}
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
                  className={`px-3 py-1.5 rounded-xl font-fun font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 text-[10px] sm:text-xs ${
                    playMode === 'caramelo'
                      ? 'cartoon-btn-green ring-2 ring-emerald-300 scale-105 shadow-md'
                      : 'cartoon-wood-inset text-amber-100/80 hover:text-white opacity-85 hover:opacity-100'
                  }`}
                >
                  <span>🐕</span>
                  <span>JOGAR CARAMELO</span>
                </button>
              </div>

              {/* Dificuldade: Fácil / Médio / Difícil */}
              <div className="relative p-1.5 rounded-2xl cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.8)] flex items-center gap-1.5">
                <SteelCornerBrackets size="sm" />
                {(
                  [
                    { id: 'easy', label: 'FÁCIL', sub: '130 KM/H', activeClass: 'cartoon-btn-green ring-2 ring-emerald-300' },
                    { id: 'medium', label: 'MÉDIO', sub: '175 KM/H', activeClass: 'cartoon-btn-gold ring-2 ring-amber-200' },
                    { id: 'hard', label: 'DIFÍCIL', sub: '220 KM/H+', activeClass: 'cartoon-btn-red ring-2 ring-rose-300' },
                  ] as const
                ).map((mode) => {
                  const isSelected = difficulty === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setDifficulty(mode.id);
                        try {
                          localStorage.setItem('caramelo_difficulty', mode.id);
                        } catch {}
                      }}
                      className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-fun font-black uppercase transition-all cursor-pointer flex flex-col items-center leading-none ${
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
              </div>
            </div>
          </div>

          {/* INFERIOR: 4 CARTÕES TRIDIMENSIONAIS EM MADEIRA (GARAGEM MOTOS / GARAGEM CARAMELOS / GALERIA / CONFIGURAÇÕES) */}
          <div
            style={{
              animation: !lobbyExiting
                ? 'cartoonMenuBandIn 340ms cubic-bezier(0.22, 1, 0.36, 1) 125ms both'
                : undefined,
            }}
            className={`relative z-20 w-full max-w-5xl grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-auto mb-2 ${
              lobbyExiting ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            {/* CARTÃO 1: GARAGEM DE MOTOS & MOTOBOY (Laranja 3D) */}
            <button
              onClick={() => {
                sound.playClick();
                setSelectedGarageMotoId(equippedMotoId);
                setGarageSection('motos');
                setShowSkinsModal(true);
              }}
              className="group menu-interactive-card relative p-1.5 rounded-2xl cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)] cursor-pointer"
            >
              <SteelCornerBrackets size="sm" />
              <div className="relative h-full px-2.5 sm:px-3.5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] border-2 border-[#fde68a] shadow-[inset_0_2px_0_rgba(255,255,255,0.65)] flex items-center gap-2 sm:gap-2.5 text-left">
                <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform">
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
                    className="font-fun font-black text-sm sm:text-base md:text-lg text-white uppercase leading-tight tracking-wide"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: '2.5px #78350f',
                      textShadow: '0 2px 0 #78350f, 0 4px 6px rgba(0,0,0,0.6)',
                    }}
                  >
                    GARAGEM
                  </span>
                  <span className="text-[10px] sm:text-xs font-extrabold text-[#fffbeb] drop-shadow leading-snug truncate">
                    20 Motos + Motoboys
                  </span>
                </div>
              </div>
            </button>

            {/* CARTÃO 2: GARAGEM DOS CARAMELOS NA ESTEIRA 3D (Esmeralda/Âmbar 3D) */}
            <button
              onClick={() => {
                sound.playClick();
                setSelectedGarageCarameloId(equippedCarameloId);
                setGarageSection('caramelos');
                setShowSkinsModal(true);
              }}
              className="group menu-interactive-card relative p-1.5 rounded-2xl cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)] cursor-pointer"
            >
              <SteelCornerBrackets size="sm" />
              <div className="relative h-full px-2.5 sm:px-3.5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-[#34d399] via-[#10b981] to-[#047857] border-2 border-[#a7f3d0] shadow-[inset_0_2px_0_rgba(255,255,255,0.65)] flex items-center gap-2 sm:gap-2.5 text-left">
                <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform">
                  {/* Ícone Cartoon Vira-Lata Caramelo com Bordas Pretas */}
                  <svg viewBox="0 0 64 64" className="w-full h-full">
                    <path
                      d="M14 26 L8 14 L22 18 Z"
                      fill="#b45309"
                      stroke="#1f0901"
                      strokeWidth="3.2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M50 26 L56 14 L42 18 Z"
                      fill="#b45309"
                      stroke="#1f0901"
                      strokeWidth="3.2"
                      strokeLinejoin="round"
                    />
                    <circle cx="32" cy="34" r="18" fill="#f59e0b" stroke="#1f0901" strokeWidth="3.5" />
                    <ellipse cx="32" cy="40" rx="10" ry="8" fill="#fde68a" stroke="#1f0901" strokeWidth="2.5" />
                    <circle cx="25" cy="29" r="3.2" fill="#1f0901" />
                    <circle cx="39" cy="29" r="3.2" fill="#1f0901" />
                    <ellipse cx="32" cy="37" rx="4.5" ry="3.2" fill="#1f0901" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className="font-fun font-black text-sm sm:text-base md:text-lg text-white uppercase leading-tight tracking-wide"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: '2.5px #064e3b',
                      textShadow: '0 2px 0 #064e3b, 0 4px 6px rgba(0,0,0,0.6)',
                    }}
                  >
                    CARAMELOS
                  </span>
                  <span className="text-[10px] sm:text-xs font-extrabold text-emerald-50 drop-shadow leading-snug truncate">
                    Esteira 3D • 7 Skins
                  </span>
                </div>
              </div>
            </button>

            {/* CARTÃO 3: GALERIA (Roxo 3D) */}
            <button
              onClick={() => {
                sound.playClick();
                setIsGalleryOpen(true);
              }}
              className="group menu-interactive-card relative p-1.5 rounded-2xl cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)] cursor-pointer"
            >
              <SteelCornerBrackets size="sm" />
              <div className="relative h-full px-2.5 sm:px-3.5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-[#c084fc] via-[#9333ea] to-[#6b21a8] border-2 border-[#e9d5ff] shadow-[inset_0_2px_0_rgba(255,255,255,0.55)] flex items-center gap-2 sm:gap-2.5 text-left">
                <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform">
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
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className="font-fun font-black text-sm sm:text-base md:text-lg text-white uppercase leading-tight tracking-wide"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: '2.5px #3b0764',
                      textShadow: '0 2px 0 #3b0764, 0 4px 6px rgba(0,0,0,0.6)',
                    }}
                  >
                    GALERIA
                  </span>
                  <span className="text-[10px] sm:text-xs font-extrabold text-purple-100 drop-shadow leading-snug truncate">
                    De artes e coleções
                  </span>
                </div>
              </div>
            </button>

            {/* CARTÃO 4: CONFIGURAÇÕES (Azul 3D) */}
            <button
              onClick={() => {
                sound.playClick();
                setIsSettingsOpen(true);
              }}
              className="group menu-interactive-card relative p-1.5 rounded-2xl cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)] cursor-pointer"
            >
              <SteelCornerBrackets size="sm" />
              <div className="relative h-full px-2.5 sm:px-3.5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#1d4ed8] border-2 border-[#bae6fd] shadow-[inset_0_2px_0_rgba(255,255,255,0.65)] flex items-center gap-2 sm:gap-2.5 text-left">
                <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)] menu-icon-spin-360">
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
                    className="font-fun font-black text-xs sm:text-sm md:text-base text-white uppercase leading-tight tracking-wide truncate"
                    style={{
                      paintOrder: 'stroke fill',
                      WebkitTextStroke: '2.5px #0c4a6e',
                      textShadow: '0 2px 0 #0c4a6e, 0 4px 6px rgba(0,0,0,0.6)',
                    }}
                  >
                    CONFIGURAÇÕES
                  </span>
                  <span className="text-[10px] sm:text-xs font-extrabold text-sky-100 drop-shadow leading-snug truncate">
                    Ajustes do jogo
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* RODAPÉ DE CRÉDITOS */}
          <div className="relative z-20 w-full max-w-3xl px-2 pb-1 pointer-events-auto">
            <div className="relative rounded-2xl cartoon-wood-board px-4 sm:px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg">
              <SteelCornerBrackets size="sm" />
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#b45309] border border-[#fef08a] flex items-center justify-center shadow-md">
                  <Gamepad2 className="w-4 h-4 text-[#2e1005]" />
                </div>
                <span className="text-[10px] sm:text-xs font-black text-amber-200 uppercase tracking-widest cartoon-text-outline">
                  DESENVOLVIDO POR KELVIN, GUILHERME & VALDIR
                </span>
              </div>
              <a
                href="https://gamefy.net.br"
                target="_blank"
                rel="noopener noreferrer"
                className="font-black text-xs text-amber-300 hover:text-yellow-200 transition-colors cartoon-text-outline flex items-center gap-1.5"
              >
                <span>⭐</span>
                <span>gamefy.net.br</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. GAMEPLAY HUD (APENAS PAUSE E ENGRENAGEM NO CANTO SUPERIOR DIREITO)
          ========================================================================= */}
      {gameState === 'PLAYING' && (
        <>
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
              EFEITO CINEMATOGRÁFICO DE RESPINGOS DE ÁGUA + DESFOQUE SUAVE NA LENTE
              ===================================================================== */}
          {lensSplash && (
            <div
              key={lensSplash.id}
              className="fixed inset-0 pointer-events-none z-[15] overflow-hidden"
              aria-hidden="true"
            >
              <style>{`
                @keyframes lensWaterBlurClear {
                  0% { backdrop-filter: blur(0px); opacity: 0; }
                  12% { backdrop-filter: blur(${(4.6 * lensSplash.intensity).toFixed(1)}px); opacity: 1; }
                  45% { backdrop-filter: blur(${(2.4 * lensSplash.intensity).toFixed(1)}px); opacity: 0.85; }
                  100% { backdrop-filter: blur(0px); opacity: 0; }
                }
                @keyframes lensDropletSlideFade {
                  0% { transform: translateY(-6px) scale(0.55); opacity: 0; }
                  14% { transform: translateY(0px) scale(1.05); opacity: 0.92; }
                  65% { transform: translateY(22px) scale(0.96); opacity: 0.65; }
                  100% { transform: translateY(54px) scale(0.72); opacity: 0; }
                }
              `}</style>
              <div
                className="absolute inset-0 bg-sky-200/10"
                style={{
                  animation: 'lensWaterBlurClear 1.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                }}
              />
              {[
                { l: '8%', t: '14%', w: 26, h: 32, d: '0ms' },
                { l: '19%', t: '36%', w: 16, h: 21, d: '45ms' },
                { l: '12%', t: '66%', w: 22, h: 28, d: '80ms' },
                { l: '28%', t: '18%', w: 13, h: 17, d: '30ms' },
                { l: '35%', t: '52%', w: 28, h: 36, d: '15ms' },
                { l: '44%', t: '24%', w: 18, h: 24, d: '70ms' },
                { l: '53%', t: '72%', w: 24, h: 31, d: '55ms' },
                { l: '61%', t: '16%', w: 30, h: 38, d: '20ms' },
                { l: '68%', t: '44%', w: 15, h: 20, d: '95ms' },
                { l: '76%', t: '28%', w: 25, h: 33, d: '35ms' },
                { l: '83%', t: '62%', w: 20, h: 26, d: '65ms' },
                { l: '90%', t: '19%', w: 17, h: 22, d: '50ms' },
                { l: '24%', t: '78%', w: 14, h: 18, d: '110ms' },
                { l: '72%', t: '79%', w: 19, h: 25, d: '90ms' },
              ].map((dr, idx) => (
                <div
                  key={idx}
                  className="absolute rounded-full border border-white/75"
                  style={{
                    left: dr.l,
                    top: dr.t,
                    width: `${Math.round(dr.w * (0.78 + lensSplash.intensity * 0.28))}px`,
                    height: `${Math.round(dr.h * (0.78 + lensSplash.intensity * 0.28))}px`,
                    background:
                      'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0%, rgba(186,230,253,0.62) 42%, rgba(56,189,248,0.28) 78%, rgba(14,165,233,0.08) 100%)',
                    boxShadow:
                      'inset 0 2px 4px rgba(255,255,255,0.9), 0 4px 10px rgba(14,116,144,0.28)',
                    animation: `lensDropletSlideFade 1.75s ease-out ${dr.d} forwards`,
                  }}
                />
              ))}
            </div>
          )}

          {/* =====================================================================
              ITEM 4: 10 CORAÇÕES DINÂMICOS ACIMA DO MOTOBOY ACOMPANHANDO A POSIÇÃO
              DO JOGADOR NO MUNDO (COM ANIMAÇÃO DE QUEBRA AO PERDER VIDA!)
              ===================================================================== */}
          {playMode === 'moto' && phase === 'playing' && !hud.missionVictorySequenceActive && (
            <div
              className="fixed z-[16] pointer-events-none transition-[left,top] duration-75 ease-out"
              style={{
                left: `${((hud.playerScreenPos?.x ?? 0.5) * 100).toFixed(2)}%`,
                top: `${Math.max(9.5, (hud.playerScreenPos?.y ?? 0.42) * 100).toFixed(2)}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="flex flex-col items-center gap-1">
                {/* 10 Corações Cartoon Proporcionais e Limpos acima do Motoboy */}
                <div className="flex items-center gap-0.5 sm:gap-1 px-2.5 py-1 rounded-full bg-gradient-to-b from-[#fffbeb]/95 via-[#fef3c7]/95 to-[#fde68a]/95 border-2 border-white shadow-[0_3px_0_#78350f,0_6px_14px_rgba(0,0,0,0.45)]">
                  {Array.from({ length: hud.maxHp || 10 }).map((_, i) => {
                    const active = i < hud.hp;
                    const isBreaking = brokenHeartIndex === i;
                    return (
                      <Heart
                        key={i}
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all duration-300 ${
                          isBreaking
                            ? 'text-rose-500 fill-rose-500 scale-150 -translate-y-2 rotate-12 opacity-0'
                            : active
                            ? 'text-[#ef4444] fill-[#ef4444] scale-100 drop-shadow-[0_1.5px_0_#7f1d1d]'
                            : 'text-amber-900/25 fill-amber-900/15 scale-75'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Indicador compacto de equilíbrio do Grau quando empinando */}
                {(hud.wheelieBalanceRatio ?? 0) > 0.15 && (
                  <div className="px-2 py-0.5 rounded-full bg-[#1f0901]/85 border border-[#fde047] flex items-center gap-1.5 shadow">
                    <span className="font-fun font-black text-[9px] text-[#fde047] uppercase">
                      GRAU
                    </span>
                    <div className="w-14 h-1.5 rounded-full bg-stone-800 overflow-hidden">
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
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              ITEM 2: TRANSIÇÃO DE INÍCIO — TUTORIAL CINEMATOGRÁFICO EM CÂMERA LENTA
              + MENSAGEM DIVERTIDA "Agora se vire hahaha..."
              ===================================================================== */}
          {playMode === 'moto' && hud.tutorialPhase === 'slowmo' && phase === 'playing' && (
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
                  CARRO NA CONTRAMÃO! USE O JATO / DESVIE PRO LADO AGORA!
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

          {playMode === 'moto' && hud.tutorialBannerText && phase === 'playing' && (
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

          <div className="absolute top-0 left-0 right-0 p-3 sm:p-5 flex items-start justify-between pointer-events-none z-10">
            {/* Esquerda: Status por Modo (Contador de Caixas de Pizza + Progresso da Missão no Modo Moto; Vidas + Estamina no Modo Caramelo) */}
            <div className="flex flex-col gap-2 items-start">
              {playMode === 'caramelo' ? (
                <div className="flex items-center gap-1.5 bg-gradient-to-b from-[#fef3c7] via-[#fde68a] to-[#f59e0b] px-3.5 py-1.5 rounded-2xl border-[2.5px] border-[#78350f] shadow-[0_4px_0_#78350f,0_8px_16px_rgba(120,53,15,0.32),inset_0_2px_0_rgba(255,255,255,0.8)] pointer-events-auto">
                  {Array.from({ length: hud.maxHp }).map((_, i) => {
                    const active = i < hud.hp;
                    return (
                      <Heart
                        key={i}
                        className={`w-6 h-6 transition-all duration-300 ${
                          active
                            ? 'text-[#ef4444] fill-[#ef4444] scale-100 drop-shadow-[0_2px_0_#7f1d1d]'
                            : 'text-amber-900/35 fill-amber-900/20 scale-90'
                        }`}
                      />
                    );
                  })}
                </div>
              ) : (
                /* ITEM 8: CONTADOR DE CAIXAS DE PIZZA LOGO ABAIXO DO STATUS + PROGRESSO DA MISSÃO */
                <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
                  <div
                    className={`flex items-center gap-2 bg-gradient-to-b from-[#fffbeb] via-[#fde68a] to-[#f59e0b] px-3.5 py-1.5 rounded-2xl border-[2.5px] border-[#78350f] shadow-[0_4px_0_#78350f,0_8px_16px_rgba(120,53,15,0.32),inset_0_2px_0_rgba(255,255,255,0.85)] transition-transform duration-200 ${
                      pizzaCounterPop ? 'scale-112 -translate-y-0.5 ring-4 ring-emerald-300' : 'scale-100'
                    }`}
                    title="Caixas de Pizza restantes no bagageiro da moto"
                  >
                    {/* Ícone Cartoon 3D de Caixa de Pizza (Inspirado na Referência 4) */}
                    <svg viewBox="0 0 40 34" className="w-7 h-6 flex-shrink-0 drop-shadow">
                      <polygon
                        points="6,14 22,6 36,13 20,22"
                        fill="#e6be8a"
                        stroke="#451a03"
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                      />
                      <polygon
                        points="6,14 20,22 20,29 6,21"
                        fill="#b88952"
                        stroke="#451a03"
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                      />
                      <polygon
                        points="20,22 36,13 36,20 20,29"
                        fill="#cfa168"
                        stroke="#451a03"
                        strokeWidth="2.4"
                        strokeLinejoin="round"
                      />
                      <ellipse cx="21" cy="14" rx="7" ry="4.2" fill="#dc2626" />
                      <ellipse cx="21" cy="14" rx="5.2" ry="3.1" fill="#fde047" />
                      <circle cx="19.5" cy="13.5" r="1" fill="#dc2626" />
                      <circle cx="22.5" cy="14.5" r="1" fill="#dc2626" />
                    </svg>

                    <div className="flex flex-col leading-none">
                      <span className="text-[9px] font-fun font-black uppercase text-[#78350f] tracking-wider">
                        CAIXAS DE PIZZA
                      </span>
                      <span
                        className="font-fun font-black text-sm sm:text-base text-white mt-0.5"
                        style={{
                          paintOrder: 'stroke fill',
                          WebkitTextStroke: '2.8px #451a03',
                        }}
                      >
                        ×{hud.pizzasLeft ?? 8} RESTANTES
                      </span>
                    </div>
                  </div>

                  {/* Progresso Discreto da Missão de Entrega */}
                  <div className="flex items-center gap-1.5 bg-gradient-to-b from-[#bbf7d0] via-[#4ade80] to-[#16a34a] px-3 py-1.5 rounded-2xl border-[2.5px] border-[#14532d] shadow-[0_4px_0_#14532d,inset_0_2px_0_rgba(255,255,255,0.8)]">
                    <span className="text-sm">🏠</span>
                    <div className="flex flex-col leading-none">
                      <span className="text-[8.5px] font-fun font-black uppercase text-[#052e16] tracking-wider">
                        META DE ENTREGAS
                      </span>
                      <span
                        className="font-fun font-black text-xs sm:text-sm text-white mt-0.5"
                        style={{
                          paintOrder: 'stroke fill',
                          WebkitTextStroke: '2.6px #052e16',
                        }}
                      >
                        {hud.pizzasDelivered ?? 0} / {hud.pizzaMissionGoal ?? 8}
                      </span>
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

              {/* Confirmação Cartoon de Entrega de Pizza Concluída (Item 8) */}
              {playMode === 'moto' && pizzaDeliveredBadge !== null && (
                <div
                  key={pizzaDeliveredBadge}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-400 via-green-500 to-lime-500 text-white px-3.5 py-1.5 rounded-xl border-2 border-white font-fun font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_4px_0_#14532d] animate-bounce cartoon-text-outline"
                >
                  <span>🍕 ENTREGA CONCLUÍDA! +R$ 150!</span>
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

              {hud.combo > 1 && (
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-[#2e1005] px-3 py-1 rounded-xl border-2 border-amber-100 font-fun font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_3px_0_#78350f] animate-pulse">
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>{hud.combo}x COMBO!</span>
                </div>
              )}
              {/* ITEM 3: Faixas/barras de coleta removidas completamente conforme solicitado! */}
            </div>

            {/* Centro: Limpo sem letreiro por solicitação do usuário */}
            <div />

            {/* Direita: Novo Contador Cartoon Integrado ao HUD — 100% SEM FUNDO PRETO! */}
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
                  title="Saldo acumulado na carteira"
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
                    R$ {(userCoins + runCashCollected).toLocaleString('pt-BR')}
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

          {/* ITEM 8: ÍCONE INTERATIVO DE PIZZA NA TELA QUANDO PASSAR EM CIMA DO CHÃO VERDE DE ENTREGA! */}
          {playMode === 'moto' &&
            Boolean(hud.inDeliveryZone) &&
            (hud.pizzasLeft ?? 0) > 0 &&
            phase === 'playing' && (
              <div className="fixed bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto select-none">
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    controlTriggerRef.current?.throwPizza?.();
                  }}
                  onClick={() => {
                    controlTriggerRef.current?.throwPizza?.();
                  }}
                  className="group relative px-5 sm:px-7 py-2.5 sm:py-3 rounded-full bg-gradient-to-b from-[#86efac] via-[#22c55e] to-[#15803d] border-[4px] border-white shadow-[0_7px_0_#052e16,0_0_32px_rgba(34,197,94,0.95),inset_0_3px_0_rgba(255,255,255,0.9)] flex items-center gap-3 cursor-pointer active:translate-y-1 active:scale-95 transition-all animate-bounce"
                  aria-label="Lançar Caixa de Pizza para o Cliente (E ou Espaço)"
                >
                  <span className="absolute -inset-1.5 rounded-full border-[3px] border-emerald-200 opacity-80 animate-ping pointer-events-none" />
                  {/* Ícone de Caixa de Pizza + Fatia Cartoon */}
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#fef08a] to-[#f59e0b] border-[2.5px] border-[#1f0901] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <span className="text-2xl sm:text-3xl leading-none drop-shadow">🍕</span>
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span
                      className="font-fun font-black text-base sm:text-xl text-white uppercase tracking-wider leading-none"
                      style={{
                        paintOrder: 'stroke fill',
                        WebkitTextStroke: '3.2px #052e16',
                      }}
                    >
                      JOGAR PIZZA!
                    </span>
                    <span className="text-[10px] sm:text-xs font-fun font-black text-[#fef08a] uppercase tracking-wider cartoon-text-outline mt-0.5">
                      {hud.deliveryZoneSide === 'left'
                        ? '◀ CLIENTE À ESQUERDA (TOQUE / E)'
                        : 'CLIENTE À DIREITA ▶ (TOQUE / E)'}
                    </span>
                  </div>
                </button>
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
            <div className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 right-3 sm:right-5 flex items-end justify-between pointer-events-none z-20 select-none">
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
                Personalize jogabilidade, gráficos, som e clima
              </div>
            </div>

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

                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <button
                        onClick={() => {
                          setDifficulty('easy');
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
                        <span className="text-[8px] font-bold opacity-90">ATÉ 130 KM/H • CALMO</span>
                      </button>

                      <button
                        onClick={() => {
                          setDifficulty('medium');
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
                        <span className="text-[8px] font-bold opacity-90">ATÉ 175 KM/H • PADRÃO</span>
                      </button>

                      <button
                        onClick={() => {
                          setDifficulty('hard');
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
                        <span className="text-[8px] font-bold opacity-90">ATÉ 220 KM/H • EXTREMO</span>
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
          6. GARAGEM 3D LIMPA, FLUIDA E ORGANIZADA (PC & MOBILE: MOTOS + PILOTO + CARAMELOS)
          ========================================================================= */}
      {showSkinsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-2 sm:p-3 text-center animate-fade-in overflow-y-auto">
          <div className="cartoon-wood-board max-w-[1120px] w-full p-2.5 sm:p-3.5 rounded-[24px] relative text-left shadow-2xl flex flex-col gap-2.5 my-auto max-h-[96vh] overflow-y-auto">
            <SteelCornerBrackets size="lg" />

            {/* BARRA SUPERIOR COMPACTA: TÍTULO + ABAS INTEGRADAS + SALDO + FECHAR */}
            <div className="cartoon-wood-header px-3 py-2 rounded-2xl flex items-center justify-between gap-2 flex-wrap relative">
              <SteelCornerBrackets size="sm" />

              <div className="flex items-center gap-2">
                <OctagonIconBadge>
                  <svg viewBox="0 0 64 64" className="w-6 h-6 sm:w-7 sm:h-7">
                    <rect x="8" y="24" width="48" height="34" rx="4" fill="#fef3c7" stroke="#3b1304" strokeWidth="3.5" />
                    <rect x="16" y="34" width="32" height="24" fill="#0284c7" stroke="#3b1304" strokeWidth="2.8" />
                    <path d="M4 26 L11 10 L53 10 L60 26 Z" fill="#ef4444" stroke="#3b1304" strokeWidth="3.5" strokeLinejoin="round" />
                  </svg>
                </OctagonIconBadge>
                <h3 className="cartoon-title-gold-3d text-base sm:text-xl tracking-tight uppercase leading-none">
                  GARAGEM 3D
                </h3>
              </div>

              {/* Seletor Segmentado Maior e Confortável para Toque Mobile: Motos • Pilotos • Caramelos */}
              <div className="flex items-center gap-1.5 bg-[#240d03]/85 p-1.5 rounded-2xl border-2 border-amber-500/45 order-3 sm:order-2 w-full sm:w-auto justify-center">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setGarageSection('motos');
                  }}
                  className={`flex-1 sm:flex-initial py-2.5 px-3.5 rounded-xl text-xs sm:text-[13px] font-black uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    garageSection === 'motos'
                      ? 'cartoon-btn-gold shadow-md'
                      : 'text-amber-100/85 hover:text-white'
                  }`}
                >
                  <span className="text-sm">🏍️</span>
                  <span>MOTOS ({filteredMotos.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setGarageSection('motoboys');
                  }}
                  className={`flex-1 sm:flex-initial py-2.5 px-3.5 rounded-xl text-xs sm:text-[13px] font-black uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    garageSection === 'motoboys'
                      ? 'cartoon-btn-gold shadow-md'
                      : 'text-amber-100/85 hover:text-white'
                  }`}
                >
                  <span className="text-sm">🧑‍🚀</span>
                  <span>PILOTOS ({MOTOBOYS_CATALOG.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setGarageSection('caramelos');
                  }}
                  className={`flex-1 sm:flex-initial py-2.5 px-3.5 rounded-xl text-xs sm:text-[13px] font-black uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    garageSection === 'caramelos'
                      ? 'cartoon-btn-green shadow-md'
                      : 'text-amber-100/85 hover:text-white'
                  }`}
                >
                  <span className="text-sm">🐕</span>
                  <span>CARAMELOS ({CARAMELO_CATALOG.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2 order-2 sm:order-3">
                <SteelCoinPill amount={`R$ ${userCoins.toLocaleString('pt-BR')}`} />
                <OctagonCloseButton onClick={() => setShowSkinsModal(false)} />
              </div>
            </div>

            {garageStepBanner && (
              <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 border-2 border-emerald-200 text-[11px] font-black text-stone-950 uppercase tracking-wide text-center shadow-md">
                {garageStepBanner}
              </div>
            )}

            {/* CORPO EM 2 COLUNAS RESPONSIVAS (PALCO 3D + CONTROLES À ESQUERDA | CATÁLOGO LIMPO À DIREITA) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
              {/* ===============================================================
                  COLUNA ESQUERDA (lg:col-span-7): PALCO 3D + BARRA DE MOTO & PILOTO
                  =============================================================== */}
              <div className="lg:col-span-7 flex flex-col gap-2">
                {/* Palco 3D Amplo e Limpo com Setas Laterais Grandes (< e >) para Mobile e PC */}
                <div className="relative h-[245px] sm:h-[315px] lg:h-[355px] rounded-2xl overflow-hidden border-[3px] border-[#3b1304] shadow-xl bg-[#f7c8a0]">
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

                  {/* Setas Rápidas Laterais (< e >) Ampliadas para Conforto Total no Mobile */}
                  <button
                    type="button"
                    onClick={() => {
                      if (garageSection === 'caramelos') cycleGarageCaramelo(-1);
                      else if (garageSection === 'motoboys') cycleGarageMotoboy(-1);
                      else cycleGarageMoto(-1);
                    }}
                    aria-label="Anterior"
                    className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-[#b45309] via-[#7c2d12] to-[#451a03] border-[3px] border-[#fde047] shadow-[0_5px_0_#1f0901,0_10px_18px_rgba(0,0,0,0.65),inset_0_2px_0_rgba(255,255,255,0.45)] flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                  >
                    <ChevronLeft className="w-7 h-7 sm:w-8 sm:h-8 text-[#fef08a] stroke-[3.2] drop-shadow" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (garageSection === 'caramelos') cycleGarageCaramelo(1);
                      else if (garageSection === 'motoboys') cycleGarageMotoboy(1);
                      else cycleGarageMoto(1);
                    }}
                    aria-label="Próximo"
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-[#b45309] via-[#7c2d12] to-[#451a03] border-[3px] border-[#fde047] shadow-[0_5px_0_#1f0901,0_10px_18px_rgba(0,0,0,0.65),inset_0_2px_0_rgba(255,255,255,0.45)] flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                  >
                    <ChevronRight className="w-7 h-7 sm:w-8 sm:h-8 text-[#fef08a] stroke-[3.2] drop-shadow" />
                  </button>
                </div>

                {/* Barra Inferior Minimalista (Sem Poluição Visual: Apenas Nome + Ação + Jogar!) */}
                <div className="cartoon-navy-panel px-3 py-2.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 relative">
                  <SteelCornerBrackets size="sm" />

                  <div className="min-w-0 flex items-center gap-2">
                    <h4 className="cartoon-title-3d text-sm sm:text-base text-white tracking-wide truncate">
                      {garageSection === 'caramelos'
                        ? selectedCarameloSpec.name
                        : garageSection === 'motoboys'
                        ? selectedMotoboySpec.name
                        : selectedSpec.name}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-black text-[#fde047] uppercase flex-shrink-0">
                      {garageSection === 'caramelos'
                        ? selectedCarameloSpec.rarity
                        : garageSection === 'motoboys'
                        ? selectedMotoboySpec.rarity
                        : `${selectedSpec.displacementCc}cc`}
                    </span>
                  </div>

                  {garageSection !== 'caramelos' ? (
                    <div className="flex items-center gap-1.5 sm:justify-end">
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
                              className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all ${
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
                                  <span>EQUIPADA</span>
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
                      ) : (
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
                              className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all ${
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
                                  <span>ATIVO</span>
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
                          }
                          if (
                            !selectedMotoboySpec.price ||
                            unlockedMotoboyIds.includes(selectedMotoboySpec.id)
                          ) {
                            setEquippedMotoboyId(selectedGarageMotoboyId);
                            saveMotoboyId(selectedGarageMotoboyId);
                          }
                          setPlayMode('moto');
                          savePlayMode('moto');
                          setShowSkinsModal(false);
                          startGame();
                        }}
                        className="py-2.5 px-4 rounded-xl cartoon-btn-green font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer shadow-md active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>JOGAR</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
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
                          showGarageBanner('🐕 Modo Jogar com Caramelo ativado!');
                        }}
                        className={`py-1.5 px-2.5 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all ${
                          playMode === 'caramelo'
                            ? 'cartoon-btn-green ring-2 ring-emerald-200'
                            : 'cartoon-btn-wood'
                        }`}
                      >
                        🐕 Jogar
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
                          showGarageBanner('🏍️ Caramelo vai correr ao lado da Moto!');
                        }}
                        className={`py-1.5 px-2.5 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all ${
                          playMode === 'moto'
                            ? 'cartoon-btn-gold ring-2 ring-amber-200'
                            : 'cartoon-btn-wood'
                        }`}
                      >
                        🏍️ Perseguir
                      </button>

                      {(() => {
                        const isUnlocked =
                          !selectedCarameloSpec.price ||
                          unlockedCarameloIds.includes(selectedCarameloSpec.id);
                        const isEquipped = equippedCarameloId === selectedCarameloSpec.id;
                        return (
                          <button
                            type="button"
                            onClick={() => handleEquipOrBuyCaramelo(selectedCarameloSpec)}
                            className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer shadow-md active:scale-95 transition-all ${
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
                      })()}

                      <button
                        type="button"
                        onClick={() => {
                          setShowSkinsModal(false);
                          startGame();
                        }}
                        className="py-2 px-3.5 rounded-xl cartoon-btn-green font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer shadow-md active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>IR</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ===============================================================
                  COLUNA DIREITA (lg:col-span-5): GRADE LIMPA E ORGANIZADA
                  =============================================================== */}
              <div className="lg:col-span-5 cartoon-navy-panel p-2.5 sm:p-3 rounded-2xl flex flex-col relative">
                <SteelCornerBrackets size="sm" />

                {garageSection === 'motos' && (
                  <>
                    <div className="flex items-center justify-between px-1 mb-2">
                      <span className="text-xs font-black uppercase text-[#fde047] cartoon-text-outline">
                        🏍️ Motos ({unlockedMotoIds.length}/{filteredMotos.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 overflow-y-auto max-h-[210px] sm:max-h-[250px] lg:max-h-[415px] pr-1 scrollbar-thin">
                      {filteredMotos.map((moto) => {
                        const isSelected = selectedGarageMotoId === moto.id;
                        const isEquipped = equippedMotoId === moto.id;
                        const isUnlocked = !moto.price || unlockedMotoIds.includes(moto.id);

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
                            className={`p-2 rounded-xl flex flex-col gap-1.5 transition-all cursor-pointer text-left ${
                              isSelected
                                ? 'cartoon-gold-ribbon scale-[1.01]'
                                : 'cartoon-wood-plank hover:brightness-110'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="w-9 h-8 rounded-lg cartoon-wood-inset flex items-center justify-center flex-shrink-0 p-1">
                                <svg viewBox="0 0 64 48" className="w-full h-full">
                                  <circle cx="14" cy="34" r="9" fill="#1f2937" stroke="#0d0b0a" strokeWidth="3" />
                                  <circle cx="50" cy="34" r="9" fill="#1f2937" stroke="#0d0b0a" strokeWidth="3" />
                                  <path
                                    d="M14 34 L25 20 L42 20 L50 34 M21 24 L15 18 L27 17 L35 22 L28 30 Z"
                                    fill={moto.primaryColor}
                                    stroke="#0d0b0a"
                                    strokeWidth="3"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                                  isEquipped
                                    ? 'bg-emerald-600 text-white'
                                    : isUnlocked
                                    ? 'bg-amber-950/70 text-emerald-300'
                                    : 'bg-stone-900/85 text-[#fde047]'
                                }`}
                              >
                                {isEquipped
                                  ? '✓ USO'
                                  : isUnlocked
                                  ? 'LIVRE'
                                  : `R$ ${moto.price.toLocaleString('pt-BR')}`}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div
                                className={`text-[11px] font-black truncate leading-tight ${
                                  isSelected ? 'text-[#2e1005]' : 'text-white cartoon-text-outline'
                                }`}
                              >
                                {moto.name}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {garageSection === 'motoboys' && (
                  <>
                    <div className="flex items-center justify-between px-1 mb-2">
                      <span className="text-xs font-black uppercase text-[#fde047] cartoon-text-outline">
                        🧑‍🚀 Pilotos ({unlockedMotoboyIds.length}/{MOTOBOYS_CATALOG.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 overflow-y-auto max-h-[215px] sm:max-h-[255px] lg:max-h-[385px] pr-1 scrollbar-thin">
                      {MOTOBOYS_CATALOG.map((mb) => {
                        const isSelected = selectedGarageMotoboyId === mb.id;
                        const isEquipped = equippedMotoboyId === mb.id && playMode === 'moto';
                        const isMbUnlocked = !mb.price || unlockedMotoboyIds.includes(mb.id);
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
                            className={`p-2.5 rounded-xl flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                              isSelected
                                ? 'cartoon-gold-ribbon scale-[1.01]'
                                : 'cartoon-wood-plank hover:brightness-110'
                            }`}
                          >
                            <div
                              className="w-10 h-10 rounded-xl border-2 border-[#1f0901] flex items-center justify-center flex-shrink-0 shadow-inner"
                              style={{ backgroundColor: mb.primaryColor }}
                            >
                              <span className="text-white font-black text-xs drop-shadow">
                                {mb.name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                              <span
                                className={`text-xs sm:text-sm font-black truncate ${
                                  isSelected ? 'text-[#2e1005]' : 'text-white cartoon-text-outline'
                                }`}
                              >
                                {mb.name}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase flex-shrink-0 ${
                                  isEquipped
                                    ? 'bg-emerald-600 text-white'
                                    : isMbUnlocked
                                    ? 'bg-amber-950/70 text-emerald-300'
                                    : 'bg-stone-900/85 text-[#fde047]'
                                }`}
                              >
                                {isEquipped
                                  ? '✓ USO'
                                  : isMbUnlocked
                                  ? 'LIVRE'
                                  : `R$ ${mb.price.toLocaleString('pt-BR')}`}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {garageSection === 'caramelos' && (
                  <>
                    <div className="flex items-center justify-between px-1 mb-2">
                      <span className="text-xs font-black uppercase text-[#fde047] cartoon-text-outline">
                        🐕 Caramelos ({unlockedCarameloIds.length}/{CARAMELO_CATALOG.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 overflow-y-auto max-h-[210px] sm:max-h-[250px] lg:max-h-[415px] pr-1 scrollbar-thin">
                      {CARAMELO_CATALOG.map((dog) => {
                        const isSelected = selectedGarageCarameloId === dog.id;
                        const isEquipped = equippedCarameloId === dog.id;
                        const isUnlocked = !dog.price || unlockedCarameloIds.includes(dog.id);

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
                            className={`p-2 rounded-xl flex flex-col gap-1.5 transition-all cursor-pointer text-left ${
                              isSelected
                                ? 'cartoon-gold-ribbon scale-[1.01]'
                                : 'cartoon-wood-plank hover:brightness-110'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="w-9 h-8 rounded-lg cartoon-wood-inset flex items-center justify-center flex-shrink-0 p-1">
                                <svg viewBox="0 0 64 64" className="w-full h-full">
                                  <path d="M14 26 L8 14 L22 18 Z" fill="#78350f" stroke="#0d0b0a" strokeWidth="3.5" />
                                  <path d="M50 26 L56 14 L42 18 Z" fill="#78350f" stroke="#0d0b0a" strokeWidth="3.5" />
                                  <circle cx="32" cy="34" r="17" fill={dog.accentColor} stroke="#0d0b0a" strokeWidth="3.5" />
                                  <ellipse cx="32" cy="40" rx="9" ry="6.5" fill="#fef3c7" stroke="#0d0b0a" strokeWidth="2.5" />
                                  <circle cx="25" cy="29" r="3" fill="#0d0b0a" />
                                  <circle cx="39" cy="29" r="3" fill="#0d0b0a" />
                                </svg>
                              </div>
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                                  isEquipped
                                    ? 'bg-emerald-600 text-white'
                                    : isUnlocked
                                    ? 'bg-amber-950/70 text-emerald-300'
                                    : 'bg-stone-900/85 text-[#fde047]'
                                }`}
                              >
                                {isEquipped
                                  ? '✓ USO'
                                  : isUnlocked
                                  ? 'LIVRE'
                                  : `R$ ${dog.price.toLocaleString('pt-BR')}`}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div
                                className={`text-[11px] font-black truncate leading-tight ${
                                  isSelected ? 'text-[#2e1005]' : 'text-white cartoon-text-outline'
                                }`}
                              >
                                {dog.name}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
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
        currentPhotoUrl={currentUser?.profilePhotoUrl}
        onSelectPhoto={(photoUrl) => {
          if (currentUser) {
            storage.setUserProfilePhoto(currentUser.id, photoUrl);
            setCurrentUser(storage.getCurrentUser());
          }
        }}
      />

      {/* =========================================================================
          8. TRANSIÇÃO DE FIM DE CORRIDA -> PAINEL DE RECORDS & PAINEL DE VITÓRIAS
          ========================================================================= */}
      {phase === 'gameover' && finalSummary && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
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
            /* ETAPA 2: PAINEL DE RECORDS & NOVO PAINEL DE VITÓRIAS (MISSÕES CONCLUÍDAS) */
            <div
              style={{ animation: 'recordsRiseIn 0.44s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
              className="cartoon-wood-board max-w-xl w-full my-auto p-3 sm:p-4 rounded-[26px] relative shadow-2xl flex flex-col gap-2.5"
            >
              <SteelCornerBrackets size="lg" />

              {/* Cabeçalho com título e selo de status */}
              <div className="cartoon-wood-header px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-2 flex-wrap relative">
                <SteelCornerBrackets size="sm" />
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-[#fde047] drop-shadow" />
                  <h3 className="cartoon-title-gold-3d text-base sm:text-xl uppercase tracking-wide leading-none">
                    {gameOverPanelTab === 'vitorias'
                      ? 'PAINEL DE VITÓRIAS'
                      : 'PAINEL DE RECORDS'}
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
                  <span className="px-2.5 py-1 rounded-xl bg-red-950/85 border border-rose-400/50 text-[10px] font-black text-rose-200 uppercase tracking-wider">
                    💥 SE LASCOU
                  </span>
                )}
              </div>

              {/* Abas de alternância entre PAINEL DE RECORDS e PAINEL DE VITÓRIAS (Missões Concluídas) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setGameOverPanelTab('records');
                  }}
                  className={`py-2 px-3 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    gameOverPanelTab === 'records'
                      ? 'cartoon-gold-ribbon scale-[1.01]'
                      : 'cartoon-wood-plank text-amber-100/90 hover:brightness-110'
                  }`}
                >
                  <span>🏆 PAINEL DE RECORDS</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setGameOverPanelTab('vitorias');
                  }}
                  className={`py-2 px-3 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    gameOverPanelTab === 'vitorias'
                      ? 'cartoon-gold-ribbon scale-[1.01]'
                      : 'cartoon-wood-plank text-amber-100/90 hover:brightness-110'
                  }`}
                >
                  <span>🍕 PAINEL DE VITÓRIAS</span>
                </button>
              </div>

              {gameOverPanelTab === 'records' ? (
                /* =============================================================
                   ABA 1: PAINEL DE RECORDS (LAYOUT FIEL À REFERÊNCIA 3)
                   ============================================================= */
                <div className="flex flex-col gap-2.5">
                  {/* Quadro da Imagem + Barra Inferior com Veículo e Velocidade */}
                  <div className="relative rounded-2xl overflow-hidden border-[3px] border-[#3d1e0d] bg-stone-950 shadow-lg h-[175px] sm:h-[215px] flex items-center justify-center">
                    {gameOverImage ? (
                      <img
                        src={gameOverImage}
                        alt="Registro da Corrida"
                        className="block w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            '/images/gameover/dog_selfie_gas_station.jpg';
                        }}
                      />
                    ) : (
                      <span className="text-5xl">💥</span>
                    )}

                    <div className="absolute bottom-2 left-2 right-2 cartoon-wood-inset px-3 py-1 rounded-lg border border-amber-400/40 flex items-center justify-between text-[10px] sm:text-[11px] font-black">
                      <span className="text-amber-100 truncate">
                        {playMode === 'caramelo'
                          ? `🐕 ${equippedCarameloSpec.name}`
                          : `🏍️ ${equippedSpec.name}`}
                      </span>
                      <span className="text-[#fde047] font-mono ml-1.5">
                        {Math.round(finalSummary.speed)} km/h
                      </span>
                    </div>
                  </div>

                  {/* 3 Blocos de Records: PONTOS • RECORDE • DISTÂNCIA */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="cartoon-wood-plank p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                      <span className="text-[9.5px] font-black uppercase text-amber-100/90 tracking-wider">
                        PONTOS
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-[#fef08a] font-mono leading-tight mt-0.5 cartoon-text-outline">
                        {Math.floor(finalSummary.score)}
                      </span>
                    </div>

                    <div className="cartoon-wood-plank p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                      <span className="text-[9.5px] font-black uppercase text-amber-100/90 tracking-wider">
                        RECORDE
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

                  {/* Total Ganho na Pista + 4 Notas Brasileiras */}
                  <div className="cartoon-wood-plank p-2.5 sm:p-3 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-amber-100 tracking-wide">
                        💵 TOTAL GANHO NA PISTA
                      </span>
                      <span className="cartoon-title-gold-3d text-lg sm:text-xl font-mono">
                        +R$ {earnedRunMoney.total.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="rounded-xl p-1.5 bg-gradient-to-b from-rose-400 to-rose-600 border-2 border-rose-200 flex flex-col items-center justify-center text-center shadow">
                        <span className="text-[9px] font-black text-rose-950 uppercase leading-none">
                          R$ 10
                        </span>
                        <span className="text-xs font-black font-mono text-white cartoon-text-outline mt-0.5">
                          +{earnedRunMoney.n10}
                        </span>
                      </div>

                      <div className="rounded-xl p-1.5 bg-gradient-to-b from-orange-400 to-amber-600 border-2 border-orange-200 flex flex-col items-center justify-center text-center shadow">
                        <span className="text-[9px] font-black text-stone-950 uppercase leading-none">
                          R$ 50
                        </span>
                        <span className="text-xs font-black font-mono text-white cartoon-text-outline mt-0.5">
                          +{earnedRunMoney.n50}
                        </span>
                      </div>

                      <div className="rounded-xl p-1.5 bg-gradient-to-b from-sky-400 to-blue-600 border-2 border-sky-200 flex flex-col items-center justify-center text-center shadow">
                        <span className="text-[9px] font-black text-sky-950 uppercase leading-none">
                          R$ 100
                        </span>
                        <span className="text-xs font-black font-mono text-white cartoon-text-outline mt-0.5">
                          +{earnedRunMoney.n100}
                        </span>
                      </div>

                      <div className="rounded-xl p-1.5 bg-gradient-to-b from-[#881337] to-[#4c0519] border-2 border-amber-300 flex flex-col items-center justify-center text-center shadow">
                        <span className="text-[9px] font-black text-amber-200 uppercase leading-none">
                          💎 R$ 200
                        </span>
                        <span className="text-xs font-black font-mono text-[#fde047] mt-0.5">
                          +{earnedRunMoney.n200}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* =============================================================
                   ABA 2: NOVO PAINEL DE VITÓRIAS (MISSÕES DE ENTREGA CONCLUÍDAS)
                   IMPORTANTE: ÁREA DESTINADA ÀS IMAGENS TOTALMENTE VAZIA!
                   ============================================================= */
                <div className="flex flex-col gap-2.5">
                  {/* Estrutura Visual Preparada para Receber Imagens Futuramente (VAZIA conforme solicitado) */}
                  <div className="relative rounded-2xl overflow-hidden border-[3px] border-[#3d1e0d] bg-[#1c0d06]/90 shadow-inner h-[175px] sm:h-[205px]">
                    <div className="absolute bottom-2 left-2 right-2 cartoon-wood-inset px-3 py-1 rounded-lg border border-amber-400/40 flex items-center justify-between text-[10px] sm:text-[11px] font-black">
                      <span className="text-amber-100 truncate">
                        🏍️ {equippedSpec.name} • {selectedMotoboySpec.name}
                      </span>
                      <span className="text-[#fde047] font-mono ml-1.5">
                        {Math.round(finalSummary.speed)} km/h
                      </span>
                    </div>
                  </div>

                  {/* 3 Indicadores Principais de Entrega */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="cartoon-wood-plank p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-black uppercase text-amber-100/90 tracking-wider">
                        PIZZAS ENTREGUES
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-[#86efac] font-mono leading-tight mt-0.5 cartoon-text-outline">
                        {finalSummary.pizzasDelivered ?? 0}/{finalSummary.pizzaMissionGoal ?? 8}
                      </span>
                    </div>

                    <div className="cartoon-wood-plank p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-black uppercase text-amber-100/90 tracking-wider">
                        RECORDE ENTREGAS
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-[#fde047] font-mono leading-tight mt-0.5 cartoon-text-outline">
                        {deliveryMissionStats.bestDeliveredInRun} 🍕
                      </span>
                    </div>

                    <div className="cartoon-wood-plank p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-black uppercase text-amber-100/90 tracking-wider">
                        TOTAL REALIZADAS
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono leading-tight mt-0.5 cartoon-text-outline">
                        {deliveryMissionStats.totalDeliveredAllTime}
                      </span>
                    </div>
                  </div>

                  {/* Resultado Final da Missão & Melhor Desempenho do Jogador */}
                  <div className="cartoon-wood-plank p-2.5 sm:p-3 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10.5px] font-black uppercase text-amber-100 tracking-wide">
                        📦 RESULTADO FINAL DA MISSÃO
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-black uppercase border ${
                          isMissionCompletedVictory
                            ? 'bg-emerald-600 text-white border-emerald-200'
                            : (finalSummary.pizzasDelivered ?? 0) > 0
                            ? 'bg-amber-600 text-white border-amber-200'
                            : 'bg-stone-800 text-amber-200 border-amber-500/40'
                        }`}
                      >
                        {isMissionCompletedVictory
                          ? 'CONCLUÍDA — FUGA DO CARAMELO!'
                          : (finalSummary.pizzasDelivered ?? 0) > 0
                          ? `ENTREGA PARCIAL (${finalSummary.pizzasDelivered}/${finalSummary.pizzaMissionGoal ?? 8})`
                          : 'EM ANDAMENTO'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-400/20">
                      <div className="cartoon-wood-inset px-3 py-1.5 rounded-xl flex items-center justify-between">
                        <span className="text-[9.5px] font-black uppercase text-amber-200/90">
                          MELHOR DESEMPENHO
                        </span>
                        <span className="text-xs sm:text-sm font-black font-mono text-[#fde047]">
                          {Math.max(
                            deliveryMissionStats.bestPerformanceScore,
                            Math.floor(finalSummary.score),
                            Math.floor(finalSummary.bestScore)
                          )}{' '}
                          PTS
                        </span>
                      </div>

                      <div className="cartoon-wood-inset px-3 py-1.5 rounded-xl flex items-center justify-between">
                        <span className="text-[9.5px] font-black uppercase text-amber-200/90">
                          MISSÕES COMPLETAS
                        </span>
                        <span className="text-xs sm:text-sm font-black font-mono text-emerald-300">
                          {deliveryMissionStats.missionsCompleted} 🏆
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botão Principal Animado: Jogar Novamente */}
              <button
                type="button"
                onClick={restartRun}
                className="cartoon-btn-green w-full py-3 px-5 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-95 transition-all relative"
              >
                <RotateCcw className="w-5 h-5 stroke-[3]" />
                <span>JOGAR NOVAMENTE</span>
              </button>

              {/* Linha Inferior: WhatsApp • Instagram • Download • Garagem • Menu */}
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  title="Compartilhar no WhatsApp"
                  className="cartoon-btn-green py-2 px-1.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span className="hidden xs:inline">ZAP</span>
                </button>

                <button
                  type="button"
                  onClick={handleInstagramShare}
                  title="Salvar Stories Instagram"
                  className="cartoon-btn-purple py-2 px-1.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                >
                  <Instagram className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xs:inline">INSTA</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadImage}
                  title="Salvar Card de Recorde"
                  className="cartoon-btn-blue py-2 px-1.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xs:inline">FOTO</span>
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
                  className="cartoon-btn-gold py-2 px-1.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                >
                  <Award className="w-3.5 h-3.5 shrink-0" />
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
                  className="cartoon-btn-wood py-2 px-1.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                >
                  <Home className="w-3.5 h-3.5 text-[#fde047] shrink-0" />
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
    </div>
  );
};

export default TropicalVilaRunner;
