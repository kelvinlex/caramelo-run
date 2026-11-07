import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart,
  Coins,
  Trophy,
  Play,
  Pause,
  RotateCcw,
  Home,
  Sun,
  Sunset,
  Moon,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from 'lucide-react';
import {
  RunnerCanvas,
  type GamePhase,
  type HudSnapshot,
} from '../RunnerCanvas';
import type { SkyPreset } from '../../game/textures';
import type { Skin } from '../../types';
import { storage } from '../../services/storageService';

export interface TropicalVilaRunnerProps {
  onBackToMenu?: () => void;
  equippedSkin?: Skin | string;
  startInSettings?: boolean;
}

export const TropicalVilaRunner: React.FC<TropicalVilaRunnerProps> = ({
  onBackToMenu,
}) => {
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [skyPreset, setSkyPreset] = useState<SkyPreset>('sunset_dramatic');
  const [runNonce, setRunNonce] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

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
    leftHouseName: 'Casa Colonial das Palmeiras',
    rightHouseId: 2,
    rightHouseName: 'Sobrado do Açaí',
  });

  const [finalSummary, setFinalSummary] = useState<HudSnapshot | null>(null);

  const controlTriggerRef = useRef<{
    left: () => void;
    right: () => void;
    jump: () => void;
    roll: () => void;
  } | null>(null);

  const handleHudUpdate = useCallback((snap: HudSnapshot) => {
    setHud(snap);
  }, []);

  const handleGameOver = useCallback((finalSnap: HudSnapshot) => {
    setFinalSummary(finalSnap);
    setPhase('gameover');

    // Registra pontuação e moedas ganhas com o storageService
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
      console.warn('Erro ao salvar progresso da corrida:', e);
    }
  }, []);

  const restartRun = useCallback(() => {
    startTimeRef.current = Date.now();
    setFinalSummary(null);
    setRunNonce((prev) => prev + 1);
    setPhase('playing');
  }, []);

  const cycleSky = useCallback(() => {
    setSkyPreset((prev) =>
      prev === 'sunset_dramatic'
        ? 'tropical_morning'
        : prev === 'tropical_morning'
          ? 'violet_dusk'
          : 'sunset_dramatic'
    );
  }, []);

  // Atalhos de teclado globais
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyK') {
        cycleSky();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (phase === 'playing') setPhase('paused');
        else if (phase === 'paused') setPhase('playing');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cycleSky, phase]);

  const skyPresetLabel =
    skyPreset === 'sunset_dramatic'
      ? 'Pôr do Sol'
      : skyPreset === 'tropical_morning'
      ? 'Manhã Tropical'
      : 'Crepúsculo';

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden select-none bg-slate-950 font-sans">
      {/* 3D WebGL Canvas */}
      <RunnerCanvas
        phase={phase}
        skyPreset={skyPreset}
        inspectedHouseId={null}
        runNonce={runNonce}
        onHudUpdate={handleHudUpdate}
        onGameOver={handleGameOver}
        controlTriggerRef={controlTriggerRef}
      />

      {/* =========================================================================
          CABECALHO / HUD SUPERIOR
          ========================================================================= */}
      <div className="absolute top-0 left-0 right-0 p-3 sm:p-5 flex items-start justify-between pointer-events-none z-10">
        {/* Esquerda: Vidas / HP e Combo */}
        <div className="flex flex-col gap-2">
          {/* Vidas em Corações */}
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

          {/* Badge de Combo */}
          {hud.combo > 1 && (
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-3 py-1 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg animate-pulse">
              <Sparkles className="w-4 h-4 fill-current" />
              <span>{hud.combo}x COMBO!</span>
            </div>
          )}
        </div>

        {/* Centro: Nome do Bairro / Casa e Alternador de Céu */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-amber-400/20 shadow-md text-center">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-400">
              🇧🇷 VILA TROPICAL 3D
            </span>
            <div className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[200px] sm:max-w-xs">
              {hud.leftHouseName || 'Casas Brasileiras'}
            </div>
          </div>

          {/* Botão de Alternar Céu */}
          <button
            onClick={cycleSky}
            className="pointer-events-auto bg-slate-800/80 hover:bg-slate-700/90 active:scale-95 text-amber-300 px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-md border border-amber-400/20 transition-all cursor-pointer"
            title="Alternar Clima (Tecla K)"
          >
            {skyPreset === 'sunset_dramatic' && <Sunset className="w-3.5 h-3.5 text-orange-400" />}
            {skyPreset === 'tropical_morning' && <Sun className="w-3.5 h-3.5 text-amber-300" />}
            {skyPreset === 'violet_dusk' && <Moon className="w-3.5 h-3.5 text-violet-300" />}
            <span>{skyPresetLabel}</span>
            <span className="text-[9px] opacity-60 ml-0.5 bg-slate-900/60 px-1 py-0.5 rounded">K</span>
          </button>
        </div>

        {/* Direita: Score, Moedas, Metros e Controles de Menu */}
        <div className="flex flex-col items-end gap-2">
          {/* Painel de Pontos e Moedas */}
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border-2 border-amber-500/30 shadow-xl pointer-events-auto">
            {/* Moedas */}
            <div className="flex items-center gap-1 text-amber-400 font-black text-sm sm:text-base">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 fill-amber-400" />
              <span>{hud.coins}</span>
            </div>

            <div className="w-px h-5 bg-slate-700" />

            {/* Distância */}
            <div className="text-cyan-300 font-bold text-xs sm:text-sm">
              <span>{Math.floor(hud.distance)}m</span>
            </div>

            <div className="w-px h-5 bg-slate-700" />

            {/* Score */}
            <div className="flex items-center gap-1 text-amber-300 font-black text-sm sm:text-base">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{Math.floor(hud.score)}</span>
            </div>
          </div>

          {/* Botões de Ação: Pausar e Menu */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setPhase(phase === 'playing' ? 'paused' : 'playing')}
              className="bg-slate-800/90 hover:bg-slate-700 p-2.5 rounded-xl border border-slate-700 shadow-lg text-slate-200 active:scale-95 transition-all cursor-pointer"
              title="Pausar Corrida (P ou ESC)"
            >
              {phase === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>

            {onBackToMenu && (
              <button
                onClick={onBackToMenu}
                className="bg-slate-800/90 hover:bg-slate-700 p-2.5 rounded-xl border border-slate-700 shadow-lg text-slate-200 active:scale-95 transition-all cursor-pointer"
                title="Voltar ao Menu Principal"
              >
                <Home className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          CONTROLES VIRTUAIS NA TELA (MOBILE / TABLET)
          ========================================================================= */}
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none z-10 md:hidden">
        {/* Direcional Lateral */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onPointerDown={() => controlTriggerRef.current?.left()}
            className="w-14 h-14 bg-slate-900/80 backdrop-blur-md active:bg-amber-500 active:text-slate-950 text-slate-200 rounded-2xl border-2 border-slate-700 flex items-center justify-center shadow-2xl active:scale-90 transition-all touch-none"
            aria-label="Mover para Esquerda"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onPointerDown={() => controlTriggerRef.current?.right()}
            className="w-14 h-14 bg-slate-900/80 backdrop-blur-md active:bg-amber-500 active:text-slate-950 text-slate-200 rounded-2xl border-2 border-slate-700 flex items-center justify-center shadow-2xl active:scale-90 transition-all touch-none"
            aria-label="Mover para Direita"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>

        {/* Pular e Rolar */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onPointerDown={() => controlTriggerRef.current?.roll()}
            className="w-14 h-14 bg-slate-900/80 backdrop-blur-md active:bg-orange-500 active:text-slate-950 text-slate-200 rounded-2xl border-2 border-slate-700 flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-all touch-none"
            aria-label="Rolar / Deslizar"
          >
            <ArrowDown className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase">Rolar</span>
          </button>
          <button
            onPointerDown={() => controlTriggerRef.current?.jump()}
            className="w-14 h-14 bg-emerald-600/90 active:bg-emerald-400 text-white rounded-2xl border-2 border-emerald-400 flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-all touch-none"
            aria-label="Pular"
          >
            <ArrowUp className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase">Pular</span>
          </button>
        </div>
      </div>

      {/* Dica de teclado no Desktop */}
      <div className="hidden md:flex absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/75 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-700/50 text-[11px] text-slate-400 pointer-events-none items-center gap-3 z-10 shadow-lg">
        <span>Use <b>← →</b> ou <b>A/D</b> para mover</span>
        <span>•</span>
        <span><b>↑ / W / Espaço</b> para pular</span>
        <span>•</span>
        <span><b>↓ / S</b> para rolar</span>
        <span>•</span>
        <span><b>K</b> muda o clima</span>
      </div>

      {/* =========================================================================
          MODAL DE PAUSA
          ========================================================================= */}
      {phase === 'paused' && (
        <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl border-2 border-amber-500/40 shadow-2xl max-w-sm w-full text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-400/30">
              <Pause className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-amber-400 uppercase tracking-wider">
                JOGO PAUSADO
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                A corrida está esperando por você!
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => setPhase('playing')}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-sm"
              >
                <Play className="w-5 h-5 fill-current" />
                Continuar
              </button>

              <button
                onClick={restartRun}
                className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 shadow active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-xs"
              >
                <RotateCcw className="w-4 h-4" />
                Reiniciar Corrida
              </button>

              {onBackToMenu && (
                <button
                  onClick={onBackToMenu}
                  className="w-full py-3.5 px-4 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold rounded-2xl border border-slate-800 shadow active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-xs"
                >
                  <Home className="w-4 h-4" />
                  Voltar ao Menu
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE FIM DE JOGO (GAME OVER)
          ========================================================================= */}
      {phase === 'gameover' && finalSummary && (
        <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl border-2 border-rose-500/50 shadow-2xl max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-rose-500/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border-2 border-rose-500/40 animate-bounce">
              <Trophy className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-widest text-rose-400">
                FIM DA CORRIDA
              </span>
              <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tight mt-1">
                {Math.floor(finalSummary.score)} PONTOS!
              </h2>
            </div>

            {/* Painel de Resultados */}
            <div className="grid grid-cols-3 gap-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Moedas</span>
                <div className="text-base sm:text-lg font-black text-amber-400 flex items-center justify-center gap-1 mt-0.5">
                  <Coins className="w-4 h-4 fill-amber-400" />
                  <span>+{finalSummary.coins}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Distância</span>
                <div className="text-base sm:text-lg font-black text-cyan-300 mt-0.5">
                  {Math.floor(finalSummary.distance)}m
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Casas</span>
                <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
                  {finalSummary.housesPassed}
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-3 pt-2">
              <button
                onClick={restartRun}
                className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-base"
              >
                <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                Jogar Novamente
              </button>

              {onBackToMenu && (
                <button
                  onClick={onBackToMenu}
                  className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-2xl border border-slate-700 shadow active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-xs"
                >
                  <Home className="w-4 h-4" />
                  Voltar ao Menu Inicial
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TropicalVilaRunner;
