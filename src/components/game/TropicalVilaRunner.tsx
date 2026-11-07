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
  Palette,
  Check,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  RunnerCanvas,
  type GamePhase,
  type HudSnapshot,
} from '../RunnerCanvas';
import type { SkyPreset } from '../../game/textures';
import type { Skin } from '../../types';
import { storage } from '../../services/storageService';
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

export interface TropicalVilaRunnerProps {
  onBackToMenu?: () => void;
  equippedSkin?: Skin | string;
  startInSettings?: boolean;
}

export type GameState = 'IDLE' | 'PLAYING';

export interface MotoSkinItem {
  id: string;
  name: string;
  subtitle: string;
  thumbnail: string;
  rarity: string;
  color: string;
  price: number;
}

export interface DogSkinItem {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  rarity: string;
  color: string;
  price: number;
  description: string;
}

export const MOTO_SKINS: MotoSkinItem[] = [
  {
    id: 'moto_default',
    name: 'Honda CG 160 Titan',
    subtitle: 'A Lendária Clássica Vermelha',
    thumbnail: '/assets/aistudio/image_f982d7d4.png',
    rarity: 'Comum',
    color: '#ef4444',
    price: 0,
  },
  {
    id: 'moto_skin1',
    name: 'CG 160 Cargo Laranja',
    subtitle: 'Baú Ciano & Carenagem Laranja',
    thumbnail: '/assets/aistudio/image_f61de67f.png',
    rarity: 'Rara',
    color: '#ea580c',
    price: 1500,
  },
  {
    id: 'moto_skin2',
    name: 'Fazer 250 Street Black',
    subtitle: 'Estilo Noturno & Baú Branco',
    thumbnail: '/assets/aistudio/image_f77c3dae.png',
    rarity: 'Especial',
    color: '#18181b',
    price: 3500,
  },
  {
    id: 'moto_skin3',
    name: 'XRE 300 Rally Amarela',
    subtitle: 'Baú Roxo & Carenagem Amarela',
    thumbnail: '/assets/aistudio/image_fa94b008.png',
    rarity: 'Lendária',
    color: '#eab308',
    price: 5000,
  },
  {
    id: 'titan_dourada',
    name: 'CG 160 Ouro Maciço',
    subtitle: 'Edição Mítica da Quebrada',
    thumbnail: '/assets/aistudio/image_f93f2d69.png',
    rarity: 'Mítica',
    color: '#fbbf24',
    price: 10000,
  },
];

export const CARAMELO_SKINS: DogSkinItem[] = [
  {
    id: 'caramelo_default',
    name: 'Caramelo Clássico',
    subtitle: 'O autêntico vira-lata caramelo brasileiro',
    icon: '🐕',
    rarity: 'Lendária',
    color: '#d97706',
    description: 'Ágil, incansável e rei absoluto das calçadas do Brasil.',
    price: 0,
  },
  {
    id: 'caramelo_skin1',
    name: 'Caramelo Dourado',
    subtitle: 'Vira-lata dourado com pelagem reluzente',
    icon: '✨',
    rarity: 'Especial',
    color: '#eab308',
    description: 'Pelagem dourada brilhante, focado na corrida e nas manobras da quebrada.',
    price: 1000,
  },
  {
    id: 'caramelo_praia',
    name: 'Caramelo Praiano',
    subtitle: 'Direto de Copacabana com óculos e bermuda',
    icon: '🏄',
    rarity: 'Especial',
    color: '#06b6d4',
    description: 'Estilo praiano carioca, sempre no pique do verão tropical.',
    price: 2000,
  },
  {
    id: 'caramelo_style',
    name: 'Caramelo Mandrake',
    subtitle: 'Visual de cria, kit reflexivo e postura',
    icon: '🕶️',
    rarity: 'Rara',
    color: '#a855f7',
    description: 'Juliete espelhada, coleira de ouro e atitude de mandrake.',
    price: 3000,
  },
  {
    id: 'caramelo_cyber',
    name: 'Cyber Caramelo 2077',
    subtitle: 'Vira-lata cibernético com circuitos de neon',
    icon: '⚡',
    rarity: 'Mítica',
    color: '#3b82f6',
    description: 'Implantes neurais para desviar de qualquer obstáculo em nanossegundos.',
    price: 8000,
  },
];

export const TropicalVilaRunner: React.FC<TropicalVilaRunnerProps> = ({
  onBackToMenu,
  startInSettings = false,
}) => {
  // Estado de tela principal: 'IDLE' (menu inicial) ou 'PLAYING' (corrida ativa)
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [phase, setPhase] = useState<GamePhase>('title');
  const [runNonce, setRunNonce] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

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
  const [skinsTab, setSkinsTab] = useState<'motoboy' | 'caramelo'>('motoboy');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [isPhotoSelectorOpen, setIsPhotoSelectorOpen] = useState(false);

  // Áudio & Tela Cheia
  const [soundMuted, setSoundMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Usuário e Moedas
  const [currentUser, setCurrentUser] = useState(() => storage.getCurrentUser());
  const [userCoins, setUserCoins] = useState(() => storage.getCurrentUser()?.ossoCoins || 2500);

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

  // Skins selecionadas
  const [equippedMotoSkinId, setEquippedMotoSkinId] = useState<string>(() => {
    return localStorage.getItem('caramelorun_equipped_moto_skin') || 'moto_default';
  });
  const [previewMotoSkin, setPreviewMotoSkin] = useState<MotoSkinItem>(() => {
    const saved = localStorage.getItem('caramelorun_equipped_moto_skin') || 'moto_default';
    return MOTO_SKINS.find((m) => m.id === saved) || MOTO_SKINS[0];
  });

  const [equippedDogSkinId, setEquippedDogSkinId] = useState<string>(() => {
    return localStorage.getItem('caramelorun_equipped_dog_skin') || 'caramelo_default';
  });
  const [previewDogSkin, setPreviewDogSkin] = useState<DogSkinItem>(() => {
    const saved = localStorage.getItem('caramelorun_equipped_dog_skin') || 'caramelo_default';
    return CARAMELO_SKINS.find((c) => c.id === saved) || CARAMELO_SKINS[0];
  });

  const [unlockedMotoSkins, setUnlockedMotoSkins] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('caramelorun_unlocked_moto_skins');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['moto_default'];
  });

  const [unlockedDogSkins, setUnlockedDogSkins] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('caramelorun_unlocked_dog_skins');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['caramelo_default'];
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

  const controlTriggerRef = useRef<{
    left: () => void;
    right: () => void;
    jump: () => void;
    roll: () => void;
  } | null>(null);

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

  const handleGameOver = useCallback((finalSnap: HudSnapshot) => {
    setFinalSummary(finalSnap);
    setPhase('gameover');

    try {
      const duracaoSegundos = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      storage.submitGameScore(
        Math.floor(finalSnap.score),
        0,
        finalSnap.housesPassed,
        duracaoSegundos,
        { n10: finalSnap.coins, n50: 0, n100: 0 }
      );
    } catch (e) {
      console.warn('Erro ao salvar progresso:', e);
    }
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    startTimeRef.current = Date.now();
    setFinalSummary(null);
    setRunNonce((prev) => prev + 1);
    setGameState('PLAYING');
    setPhase('playing');
  }, []);

  const restartRun = useCallback(() => {
    sound.playClick();
    startTimeRef.current = Date.now();
    setFinalSummary(null);
    setRunNonce((prev) => prev + 1);
    setGameState('PLAYING');
    setPhase('playing');
  }, []);

  const handleConfirmAbandon = useCallback(() => {
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
    if (userCoins < amount) return false;
    const cu = storage.getCurrentUser();
    if (cu) {
      storage.adjustUserCoins(cu.id, -amount);
    }
    setUserCoins((c) => Math.max(0, c - amount));
    return true;
  }, [userCoins]);

  // Compra ou Equipamento de Skin Moto
  const handleEquipOrBuyMoto = (moto: MotoSkinItem) => {
    sound.playClick();
    const isUnlocked = !moto.price || unlockedMotoSkins.includes(moto.id);
    if (isUnlocked) {
      setEquippedMotoSkinId(moto.id);
      localStorage.setItem('caramelorun_equipped_moto_skin', moto.id);
      confetti({ particleCount: 35, spread: 50 });
    } else {
      if (handleSpendCoins(moto.price)) {
        const next = [...unlockedMotoSkins, moto.id];
        setUnlockedMotoSkins(next);
        localStorage.setItem('caramelorun_unlocked_moto_skins', JSON.stringify(next));
        setEquippedMotoSkinId(moto.id);
        localStorage.setItem('caramelorun_equipped_moto_skin', moto.id);
        confetti({ particleCount: 65, spread: 80, origin: { y: 0.6 } });
      } else {
        alert('Moedas insuficientes!');
      }
    }
  };

  // Compra ou Equipamento de Skin Caramelo
  const handleEquipOrBuyDog = (dog: DogSkinItem) => {
    sound.playClick();
    const isUnlocked = !dog.price || unlockedDogSkins.includes(dog.id);
    if (isUnlocked) {
      setEquippedDogSkinId(dog.id);
      localStorage.setItem('caramelorun_equipped_dog_skin', dog.id);
      confetti({ particleCount: 35, spread: 50 });
    } else {
      if (handleSpendCoins(dog.price)) {
        const next = [...unlockedDogSkins, dog.id];
        setUnlockedDogSkins(next);
        localStorage.setItem('caramelorun_unlocked_dog_skins', JSON.stringify(next));
        setEquippedDogSkinId(dog.id);
        localStorage.setItem('caramelorun_equipped_dog_skin', dog.id);
        confetti({ particleCount: 65, spread: 80, origin: { y: 0.6 } });
      } else {
        alert('Moedas insuficientes!');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden select-none bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Vila Tropical */}
      <RunnerCanvas
        phase={gameState === 'IDLE' ? 'title' : phase}
        skyPreset={skyPreset}
        inspectedHouseId={null}
        runNonce={runNonce}
        onHudUpdate={handleHudUpdate}
        onGameOver={handleGameOver}
        controlTriggerRef={controlTriggerRef}
      />

      {/* =========================================================================
          1. MENU INTERATIVO INICIAL (LOBBY / IDLE SCREEN)
          ========================================================================= */}
      {gameState === 'IDLE' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-3 sm:p-6 text-center overflow-hidden pointer-events-none">
          {/* Vinheta atmosférica suave */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/40 pointer-events-none" />

          {/* TOP BAR INTERATIVA */}
          <div className="relative z-20 w-full max-w-6xl flex items-start justify-between pt-1 sm:pt-2 px-1 sm:px-3 pointer-events-auto">
            {/* Lado Esquerdo: INÍCIO, ANÚNCIOS, SOM e TELA CHEIA */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
              {onBackToMenu && (
                <button
                  onClick={() => {
                    sound.playClick();
                    onBackToMenu();
                  }}
                  className="group relative px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#d97706] border-[2.5px] border-[#fef08a] shadow-[0_4px_0_#78350f,0_6px_14px_rgba(0,0,0,0.65)] active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Início"
                >
                  <Home className="w-4 h-4 text-[#1e1b18] fill-[#1e1b18] stroke-[2.5]" />
                  <span className="font-black text-xs sm:text-sm text-[#1e1b18] tracking-wide uppercase">INÍCIO</span>
                </button>
              )}

              <button
                onClick={() => {
                  sound.playClick();
                  setShowMarketingModal(true);
                }}
                className="group relative px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-b from-[#c084fc] via-[#9333ea] to-[#6b21a8] border-[2.5px] border-[#e9d5ff] shadow-[0_4px_0_#3b0764,0_6px_14px_rgba(0,0,0,0.65)] active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer transition-all"
                title="Anúncios e Parcerias na Quebrada"
              >
                <Megaphone className="w-4 h-4 text-white stroke-[2.5] drop-shadow" />
                <span className="font-black text-xs sm:text-sm text-white tracking-wide uppercase drop-shadow">ANÚNCIOS</span>
              </button>

              <button
                onClick={() => {
                  const isEnabled = sound.toggleMute(true);
                  setSoundMuted(!isEnabled);
                }}
                title={soundMuted ? 'Ativar Som' : 'Desligar Som'}
                className="group relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl cartoon-btn-wood flex items-center justify-center cursor-pointer shadow-md"
              >
                {soundMuted ? (
                  <VolumeX className="w-5 h-5 text-amber-200/70" />
                ) : (
                  <Volume2 className="w-5 h-5 text-[#fde047] fill-[#fde047] drop-shadow" />
                )}
              </button>

              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia'}
                className="group relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl cartoon-btn-wood flex items-center justify-center cursor-pointer shadow-md"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-[#fde047] stroke-[2.8]" />
                ) : (
                  <Maximize className="w-5 h-5 text-[#fde047] stroke-[2.8]" />
                )}
              </button>
            </div>

            {/* Lado Direito: Perfil do Jogador & Moedas */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sound.playClick();
                  setIsPhotoSelectorOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-2xl cartoon-wood-plank border-2 border-amber-400/80 shadow-lg cursor-pointer hover:scale-105 transition-transform"
                title="Alterar Foto de Perfil"
              >
                <img
                  src={currentUser?.profilePhotoUrl || '/profile_photos/image_20261007_113044 - Copia.webp'}
                  alt="Perfil"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-amber-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logo.png';
                  }}
                />
                <div className="text-left hidden sm:block">
                  <div className="text-[10px] text-amber-200 uppercase font-black leading-none cartoon-text-outline">
                    {currentUser?.nickname || 'Jogador'}
                  </div>
                  <div className="text-xs font-black text-amber-300 flex items-center gap-1 mt-0.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{userCoins.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* CENTRO: BOTÃO GIGANTE DE COMEÇAR A CORRIDA */}
          <div className="relative z-20 my-auto flex flex-col items-center gap-3 pointer-events-auto">
            <button
              onClick={startGame}
              className="group relative px-10 sm:px-14 py-4 sm:py-5 rounded-3xl bg-gradient-to-b from-[#4ade80] via-[#22c55e] to-[#15803d] border-[3.5px] border-[#86efac] shadow-[0_8px_0_#14532d,0_12px_28px_rgba(0,0,0,0.8),inset_0_3px_0_rgba(255,255,255,0.7)] hover:scale-105 active:scale-95 active:translate-y-1 active:shadow-[0_4px_0_#14532d] transition-all cursor-pointer flex items-center justify-center gap-3.5"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 border-2 border-white/60 flex items-center justify-center text-white drop-shadow">
                <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white translate-x-0.5" />
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

          {/* INFERIOR: 3 CARTÕES TRIDIMENSIONAIS (LOJA / GALERIA / CONFIGURAÇÕES) */}
          <div className="relative z-20 w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 mt-auto mb-2 pointer-events-auto">
            {/* CARTÃO 1: LOJA / GARAGEM (Laranja 3D) */}
            <button
              onClick={() => {
                sound.playClick();
                setShowSkinsModal(true);
              }}
              className="group relative p-1.5 rounded-2xl cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)] cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
            >
              <SteelCornerBrackets size="sm" />
              <div className="relative h-full px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] border-2 border-[#fde68a] shadow-[inset_0_2px_0_rgba(255,255,255,0.65)] flex items-center gap-2.5 sm:gap-3 text-left">
                <div className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]">
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
                    GARAGEM
                  </span>
                  <span className="text-[11px] sm:text-xs font-extrabold text-[#fffbeb] drop-shadow leading-snug">
                    Motos e skins 3D
                  </span>
                </div>
              </div>
            </button>

            {/* CARTÃO 2: GALERIA (Roxo 3D) */}
            <button
              onClick={() => {
                sound.playClick();
                setIsGalleryOpen(true);
              }}
              className="group relative p-1.5 rounded-2xl cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)] cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
            >
              <SteelCornerBrackets size="sm" />
              <div className="relative h-full px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-[#c084fc] via-[#9333ea] to-[#6b21a8] border-2 border-[#e9d5ff] shadow-[inset_0_2px_0_rgba(255,255,255,0.55)] flex items-center gap-2.5 sm:gap-3 text-left">
                <div className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]">
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

            {/* CARTÃO 3: CONFIGURAÇÕES (Azul 3D) */}
            <button
              onClick={() => {
                sound.playClick();
                setIsSettingsOpen(true);
              }}
              className="group relative p-1.5 rounded-2xl cartoon-wood-board border-2 border-[#451a03] shadow-[0_8px_20px_rgba(0,0,0,0.85)] cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
            >
              <SteelCornerBrackets size="sm" />
              <div className="relative h-full px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#1d4ed8] border-2 border-[#bae6fd] shadow-[inset_0_2px_0_rgba(255,255,255,0.65)] flex items-center gap-2.5 sm:gap-3 text-left">
                <div className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]">
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
          <div className="absolute top-0 left-0 right-0 p-3 sm:p-5 flex items-start justify-between pointer-events-none z-10">
            {/* Esquerda: Vidas / HP e Combo */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border-2 border-amber-500/30 shadow-xl pointer-events-auto">
                {Array.from({ length: hud.maxHp }).map((_, i) => {
                  const active = i < hud.hp;
                  return (
                    <Heart
                      key={i}
                      className={`w-6 h-6 transition-all duration-300 ${
                        active
                          ? 'text-rose-500 fill-rose-500 scale-100 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                          : 'text-slate-600 fill-slate-800 scale-90 opacity-40'
                      }`}
                    />
                  );
                })}
              </div>

              {hud.combo > 1 && (
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-3 py-1 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg animate-pulse">
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>{hud.combo}x COMBO!</span>
                </div>
              )}
            </div>

            {/* Centro: Totalmente Limpo (sem letreiro nem ícone de clima por solicitação do usuário) */}
            <div />

            {/* Direita: Moedas, Metros, Score + APENAS BOTÃO PAUSE E BOTÃO ENGRENAGEM */}
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border-2 border-amber-500/30 shadow-xl">
                <div className="flex items-center gap-1 text-amber-400 font-black text-sm sm:text-base">
                  <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 fill-amber-400" />
                  <span>{hud.coins}</span>
                </div>
                <div className="w-px h-5 bg-slate-700" />
                <div className="text-cyan-300 font-bold text-xs sm:text-sm">
                  <span>{Math.floor(hud.distance)}m</span>
                </div>
                <div className="w-px h-5 bg-slate-700" />
                <div className="flex items-center gap-1 text-amber-300 font-black text-sm sm:text-base">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>{Math.floor(hud.score)}</span>
                </div>
              </div>

              {/* Ações da gameplay: EXCLUSIVAMENTE PAUSE E ENGRENAGEM */}
              <div className="flex items-center gap-2">
                {/* 1. BOTÃO DE PAUSA */}
                <button
                  onClick={togglePause}
                  className="w-11 h-11 cartoon-btn-steel rounded-xl flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition-all"
                  title="Pausar Corrida (P ou Esc)"
                  aria-label="Pausa"
                >
                  {phase === 'playing' ? (
                    <Pause className="w-5 h-5 text-amber-300 stroke-[2.5]" />
                  ) : (
                    <Play className="w-5 h-5 text-emerald-300 fill-emerald-300 stroke-[2.5]" />
                  )}
                </button>

                {/* 2. BOTÃO DE ENGRENAGEM (CONFIGURAÇÕES) */}
                <button
                  onClick={() => {
                    sound.playClick();
                    setPhase('paused');
                    setIsSettingsOpen(true);
                  }}
                  className="w-11 h-11 cartoon-btn-steel rounded-xl flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition-all"
                  title="Configurações do Jogo"
                  aria-label="Configurações"
                >
                  <Settings className="w-5 h-5 text-amber-300 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>

          {/* CONTROLES VIRTUAIS NA TELA (MOBILE / TABLET) */}
          {showOnScreenControls && (
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none z-10 md:hidden">
              <div className="flex items-center gap-3 pointer-events-auto">
                <button
                  onPointerDown={() => (invertTouch ? controlTriggerRef.current?.right() : controlTriggerRef.current?.left())}
                  className="w-14 h-14 bg-slate-900/80 backdrop-blur-md active:bg-amber-500 active:text-slate-950 text-slate-200 rounded-2xl border-2 border-slate-700 flex items-center justify-center shadow-2xl active:scale-90 transition-all touch-none"
                  aria-label="Mover para Esquerda"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onPointerDown={() => (invertTouch ? controlTriggerRef.current?.left() : controlTriggerRef.current?.right())}
                  className="w-14 h-14 bg-slate-900/80 backdrop-blur-md active:bg-amber-500 active:text-slate-950 text-slate-200 rounded-2xl border-2 border-slate-700 flex items-center justify-center shadow-2xl active:scale-90 transition-all touch-none"
                  aria-label="Mover para Direita"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </div>

              <div className="flex items-center gap-3 pointer-events-auto">
                <button
                  onPointerDown={() => controlTriggerRef.current?.roll()}
                  className="w-14 h-14 bg-slate-900/80 backdrop-blur-md active:bg-sky-500 active:text-slate-950 text-slate-200 rounded-2xl border-2 border-slate-700 flex items-center justify-center shadow-2xl active:scale-90 transition-all touch-none"
                  aria-label="Deslizar"
                >
                  <ArrowDown className="w-8 h-8" />
                </button>
                <button
                  onPointerDown={() => controlTriggerRef.current?.jump()}
                  className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black rounded-2xl border-2 border-amber-300 flex items-center justify-center shadow-2xl active:scale-90 transition-all touch-none"
                  aria-label="Pular"
                >
                  <ArrowUp className="w-10 h-10 stroke-[3]" />
                </button>
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

            {/* Cabeçalho de Madeira */}
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

            {/* 4 Abas 3D: CONTROLES / GRÁFICOS / ÁUDIO / CLIMA */}
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

            {/* Conteúdo da Aba */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 scrollbar-thin">
              {/* ABA 1: CONTROLES */}
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
                        <span className="text-[8px] font-bold opacity-90">10 VIDAS - CALMO</span>
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
                        <span className="text-[8px] font-bold opacity-90">5 VIDAS - EQUILIBRADO</span>
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
                        <span className="text-[8px] font-bold opacity-90">3 VIDAS - EXTREMO</span>
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
                        {graphicsPreset.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {(['low', 'medium', 'high', 'ultra'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => {
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

              {/* ABA 3: ÁUDIO */}
              {settingsTab === 'audio' && (
                <div className="cartoon-wood-plank p-4 rounded-2xl flex items-center justify-between relative shadow-md">
                  <SteelCornerBrackets size="sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      {soundMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                      <span className="text-sm font-black uppercase text-white cartoon-text-outline">ÁUDIO GERAL DO JOGO</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 mt-0.5 cartoon-text-outline">Efeitos sonoros, passos, pulos, moedas e batidas</p>
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

            {/* Botão de Fechar */}
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
          6. MODAL DA GARAGEM & SKINS 3D
          ========================================================================= */}
      {showSkinsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex flex-col items-center justify-center p-2 sm:p-4 text-center animate-fade-in overflow-y-auto">
          <div className="cartoon-wood-board max-w-4xl w-full p-3 sm:p-5 relative text-left shadow-2xl flex flex-col gap-3 my-auto">
            <SteelCornerBrackets size="lg" />

            {/* Cabeçalho */}
            <div className="cartoon-wood-header p-2.5 sm:p-3 rounded-2xl flex items-center justify-between relative">
              <SteelCornerBrackets size="sm" />
              <div className="flex items-center gap-3">
                <OctagonIconBadge><span className="text-xl sm:text-2xl">🏍️</span></OctagonIconBadge>
                <div>
                  <h3 className="cartoon-title-3d text-lg sm:text-2xl tracking-tight leading-tight">
                    GARAGEM & SKINS 3D
                  </h3>
                  <p className="text-[11px] sm:text-xs font-bold text-amber-200/90 cartoon-text-outline hidden xs:block">
                    Personalize sua moto e escolha seu estilo único nas ruas!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <SteelCoinPill amount={userCoins.toLocaleString('pt-BR')} />
                <OctagonCloseButton onClick={() => setShowSkinsModal(false)} />
              </div>
            </div>

            {/* Abas */}
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
                <span>CARAMELO</span>
              </button>
            </div>

            {/* Conteúdo Garagem */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
              {/* Painel Esquerdo: Info da Skin Selecionada */}
              <div className="md:col-span-5 cartoon-navy-panel p-3.5 flex flex-col justify-between">
                <SteelCornerBrackets size="sm" />
                <div>
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black uppercase tracking-wider mb-1">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>{skinsTab === 'motoboy' ? 'MOTO SELECIONADA' : 'CARAMELO SELECIONADO'}</span>
                  </div>
                  <h4 className="cartoon-title-3d text-base sm:text-lg text-white tracking-wide leading-tight">
                    {skinsTab === 'motoboy' ? previewMotoSkin.name : previewDogSkin.name}
                  </h4>
                  <p className="text-[11px] text-amber-200/90 font-bold mt-0.5 mb-3 leading-snug cartoon-text-outline">
                    {skinsTab === 'motoboy' ? previewMotoSkin.subtitle : previewDogSkin.subtitle}
                  </p>

                  {/* Barras de Estatísticas */}
                  <div className="flex flex-col gap-2 mt-2">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-100 tracking-wider mb-1 cartoon-text-outline">
                        <span>⚡ VELOCIDADE</span>
                        <span className="font-mono text-amber-300">
                          {skinsTab === 'motoboy' ? (previewMotoSkin.id === 'titan_dourada' ? '100%' : '85%') : '90%'}
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full cartoon-wood-inset border border-[#d97706] p-[2px]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300"
                          style={{
                            width: skinsTab === 'motoboy' ? (previewMotoSkin.id === 'titan_dourada' ? '100%' : '85%') : '90%',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-100 tracking-wider mb-1 cartoon-text-outline">
                        <span>🎯 CONTROLE</span>
                        <span className="font-mono text-amber-300">
                          {skinsTab === 'motoboy' ? '90%' : '95%'}
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full cartoon-wood-inset border border-[#d97706] p-[2px]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-300"
                          style={{ width: '90%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ação: Equipar ou Comprar */}
                <div className="mt-4 pt-3 border-t border-amber-500/20">
                  {skinsTab === 'motoboy' ? (
                    (() => {
                      const isUnlocked = !previewMotoSkin.price || unlockedMotoSkins.includes(previewMotoSkin.id);
                      const isEquipped = equippedMotoSkinId === previewMotoSkin.id;
                      return (
                        <button
                          onClick={() => handleEquipOrBuyMoto(previewMotoSkin)}
                          className={`w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isEquipped
                              ? 'cartoon-btn-green'
                              : isUnlocked
                              ? 'cartoon-btn-gold'
                              : 'cartoon-btn-steel'
                          }`}
                        >
                          {isEquipped ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>EQUIPADA</span>
                            </>
                          ) : isUnlocked ? (
                            <span>EQUIPAR MOTO</span>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 text-amber-300" />
                              <span>COMPRAR POR {previewMotoSkin.price} MOEDAS</span>
                            </>
                          )}
                        </button>
                      );
                    })()
                  ) : (
                    (() => {
                      const isUnlocked = !previewDogSkin.price || unlockedDogSkins.includes(previewDogSkin.id);
                      const isEquipped = equippedDogSkinId === previewDogSkin.id;
                      return (
                        <button
                          onClick={() => handleEquipOrBuyDog(previewDogSkin)}
                          className={`w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isEquipped
                              ? 'cartoon-btn-green'
                              : isUnlocked
                              ? 'cartoon-btn-gold'
                              : 'cartoon-btn-steel'
                          }`}
                        >
                          {isEquipped ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>EQUIPADO</span>
                            </>
                          ) : isUnlocked ? (
                            <span>EQUIPAR CARAMELO</span>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 text-amber-300" />
                              <span>COMPRAR POR {previewDogSkin.price} MOEDAS</span>
                            </>
                          )}
                        </button>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Painel Direito: Grade de Itens */}
              <div className="md:col-span-7 cartoon-navy-panel p-3.5 flex flex-col">
                <SteelCornerBrackets size="sm" />
                <div className="text-xs font-black uppercase text-amber-300 mb-2 cartoon-text-outline">
                  SELECIONE SEU MODELO
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto max-h-[280px] p-1 scrollbar-thin">
                  {skinsTab === 'motoboy'
                    ? MOTO_SKINS.map((moto) => {
                        const isSelected = previewMotoSkin.id === moto.id;
                        const isEquipped = equippedMotoSkinId === moto.id;
                        const isUnlocked = !moto.price || unlockedMotoSkins.includes(moto.id);
                        return (
                          <button
                            key={moto.id}
                            onClick={() => {
                              sound.playClick();
                              setPreviewMotoSkin(moto);
                            }}
                            className={`p-2 rounded-xl border-2 flex flex-col items-center text-center transition-all cursor-pointer relative ${
                              isSelected
                                ? 'border-amber-300 bg-amber-600/30 scale-102 shadow-lg'
                                : 'border-stone-700 bg-stone-900/60 hover:border-amber-400/50'
                            }`}
                          >
                            <img
                              src={moto.thumbnail}
                              alt={moto.name}
                              className="w-full h-16 object-cover rounded-lg mb-1.5"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/logo.png';
                              }}
                            />
                            <div className="text-[11px] font-black text-white truncate w-full cartoon-text-outline">
                              {moto.name}
                            </div>
                            <div className="text-[9px] font-bold text-amber-300">
                              {isEquipped ? '✓ EQUIPADA' : isUnlocked ? 'LIBERADA' : `${moto.price} Moedas`}
                            </div>
                          </button>
                        );
                      })
                    : CARAMELO_SKINS.map((dog) => {
                        const isSelected = previewDogSkin.id === dog.id;
                        const isEquipped = equippedDogSkinId === dog.id;
                        const isUnlocked = !dog.price || unlockedDogSkins.includes(dog.id);
                        return (
                          <button
                            key={dog.id}
                            onClick={() => {
                              sound.playClick();
                              setPreviewDogSkin(dog);
                            }}
                            className={`p-2 rounded-xl border-2 flex flex-col items-center text-center transition-all cursor-pointer relative ${
                              isSelected
                                ? 'border-amber-300 bg-amber-600/30 scale-102 shadow-lg'
                                : 'border-stone-700 bg-stone-900/60 hover:border-amber-400/50'
                            }`}
                          >
                            <div className="w-full h-16 rounded-lg bg-stone-800 flex items-center justify-center text-3xl mb-1.5">
                              {dog.icon}
                            </div>
                            <div className="text-[11px] font-black text-white truncate w-full cartoon-text-outline">
                              {dog.name}
                            </div>
                            <div className="text-[9px] font-bold text-amber-300">
                              {isEquipped ? '✓ EQUIPADO' : isUnlocked ? 'LIBERADO' : `${dog.price} Moedas`}
                            </div>
                          </button>
                        );
                      })}
                </div>
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
          8. MODAL DE FIM DE JOGO (GAME OVER)
          ========================================================================= */}
      {phase === 'gameover' && finalSummary && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="cartoon-wood-board max-w-md w-full p-6 text-center space-y-5 animate-in fade-in zoom-in-95">
            <SteelCornerBrackets size="md" />

            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 mx-auto">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                FIM DA CORRIDA
              </span>
              <h2 className="cartoon-title-gold-3d text-2xl sm:text-3xl mt-1">
                {Math.floor(finalSummary.score)} PONTOS!
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2 cartoon-wood-plank p-3 rounded-2xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-200/80">Moedas</span>
                <div className="text-base font-black text-amber-300 flex items-center justify-center gap-1 mt-0.5">
                  <Coins className="w-4 h-4 fill-amber-400" />
                  <span>+{finalSummary.coins}</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-200/80">Distância</span>
                <div className="text-base font-black text-cyan-300 mt-0.5">
                  {Math.floor(finalSummary.distance)}m
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-200/80">Casas</span>
                <div className="text-base font-black text-emerald-400 mt-0.5">
                  {finalSummary.housesPassed}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={restartRun}
                className="cartoon-btn-green w-full py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Correr Novamente</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('IDLE');
                  setPhase('title');
                }}
                className="cartoon-btn-steel w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Home className="w-4 h-4" />
                <span>Voltar ao Menu da Quebrada</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TropicalVilaRunner;
