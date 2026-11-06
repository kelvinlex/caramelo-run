import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Zap, Award, ShieldAlert, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { storage } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import { Skin } from '../../types';

interface CarameloGameRunnerProps {
  equippedSkin?: Skin;
  onGameOver?: (score: number, motoboys: number) => void;
}

export const CarameloGameRunner: React.FC<CarameloGameRunnerProps> = ({
  equippedSkin,
  onGameOver,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [motoboysBitten, setMotoboysBitten] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [soundMuted, setSoundMuted] = useState(false);
  const [antiCheatAlert, setAntiCheatAlert] = useState(false);
  const [highScoreResult, setHighScoreResult] = useState<boolean | null>(null);

  // Game state refs for 60fps loop
  const gameState = useRef({
    dogY: 220,
    dogVY: 0,
    isJumping: false,
    groundY: 220,
    gravity: 0.75,
    jumpForce: -13.5,
    speed: 5.5,
    distance: 0,
    score: 0,
    motoboys: 0,
    coins: 0,
    obstacles: [] as Array<{ x: number; y: number; width: number; height: number; type: 'chinelo' | 'bueiro' | 'cone'; passed?: boolean }>,
    collectibles: [] as Array<{ x: number; y: number; type: 'coin' | 'coxinha'; collected?: boolean }>,
    motoboy: { x: 750, y: 195, speed: 4.8, active: true, bitten: false, distanceToDog: 600 },
    barkCooldown: 0,
    barkEffect: { active: false, x: 0, y: 0, timer: 0 },
    gameStartTime: 0,
    lastFrameTime: 0,
    animationFrameId: 0,
  });

  const jump = useCallback(() => {
    if (!gameState.current.isJumping && isPlaying && !isGameOver) {
      gameState.current.dogVY = gameState.current.jumpForce;
      gameState.current.isJumping = true;
      sound.playClick();
    }
  }, [isPlaying, isGameOver]);

  const bark = useCallback(() => {
    if (!isPlaying || isGameOver || gameState.current.barkCooldown > 0) return;
    gameState.current.barkCooldown = 25;
    gameState.current.barkEffect = {
      active: true,
      x: 140,
      y: gameState.current.dogY - 10,
      timer: 18,
    };
    sound.playBark();

    // If motoboy is in front, scare him to drop coxinhas & coins!
    const moto = gameState.current.motoboy;
    if (moto.active && moto.x > 100 && moto.x < 500) {
      moto.x -= 30; // gets closer!
      gameState.current.collectibles.push({
        x: moto.x - 20,
        y: 190,
        type: 'coxinha',
      });
      gameState.current.collectibles.push({
        x: moto.x + 20,
        y: 170,
        type: 'coin',
      });
    }
  }, [isPlaying, isGameOver]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isPlaying && !isGameOver) {
          startGame();
        } else if (isGameOver) {
          startGame();
        } else {
          jump();
        }
      } else if (e.code === 'KeyB' || e.code === 'KeyZ') {
        e.preventDefault();
        bark();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isGameOver, jump, bark]);

  const finishGame = useCallback(() => {
    setIsPlaying(false);
    setIsGameOver(true);
    cancelAnimationFrame(gameState.current.animationFrameId);

    const duracao = Math.max(1, Math.round((Date.now() - gameState.current.gameStartTime) / 1000));
    const score = Math.round(gameState.current.score);
    const bites = gameState.current.motoboys;
    const chinelos = Math.floor(gameState.current.distance / 120);

    const res = storage.submitGameScore(score, bites, chinelos, duracao);
    setAntiCheatAlert(res.antiCheatFlagged);
    setHighScoreResult(res.newHighScore);

    if (res.newHighScore) {
      sound.playWin();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }

    if (onGameOver) {
      onGameOver(score, bites);
    }
  }, [onGameOver]);

  const startGame = () => {
    setIsGameOver(false);
    setIsPlaying(true);
    setAntiCheatAlert(false);
    setHighScoreResult(null);
    setCurrentScore(0);
    setMotoboysBitten(0);
    setCoinsCollected(0);

    gameState.current = {
      dogY: 220,
      dogVY: 0,
      isJumping: false,
      groundY: 220,
      gravity: 0.75,
      jumpForce: -13.5,
      speed: 5.5,
      distance: 0,
      score: 0,
      motoboys: 0,
      coins: 0,
      obstacles: [
        { x: 500, y: 232, width: 28, height: 16, type: 'chinelo' },
        { x: 900, y: 235, width: 45, height: 12, type: 'bueiro' },
      ],
      collectibles: [
        { x: 400, y: 180, type: 'coin' },
        { x: 700, y: 160, type: 'coxinha' },
      ],
      motoboy: { x: 800, y: 180, speed: 4.8, active: true, bitten: false, distanceToDog: 700 },
      barkCooldown: 0,
      barkEffect: { active: false, x: 0, y: 0, timer: 0 },
      gameStartTime: Date.now(),
      lastFrameTime: performance.now(),
      animationFrameId: 0,
    };

    sound.playBark();
    loop();
  };

  const loop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameState.current;

    // Physics Update
    state.dogVY += state.gravity;
    state.dogY += state.dogVY;

    if (state.dogY >= state.groundY) {
      state.dogY = state.groundY;
      state.dogVY = 0;
      state.isJumping = false;
    }

    state.distance += state.speed;
    state.score += (state.speed * 0.4);
    state.speed = Math.min(11, 5.5 + state.distance * 0.0007);

    if (state.barkCooldown > 0) state.barkCooldown--;

    // Move Obstacles
    state.obstacles.forEach((obs) => {
      obs.x -= state.speed;
    });

    // Spawn new obstacles
    if (state.obstacles.length < 3) {
      const lastObs = state.obstacles[state.obstacles.length - 1];
      const nextX = (lastObs ? lastObs.x : 600) + 320 + Math.random() * 260;
      const typeChoice = Math.random() > 0.45 ? 'chinelo' : 'bueiro';
      state.obstacles.push({
        x: nextX,
        y: typeChoice === 'chinelo' ? 230 : 236,
        width: typeChoice === 'chinelo' ? 32 : 45,
        height: typeChoice === 'chinelo' ? 18 : 12,
        type: typeChoice,
      });
    }

    // Filter offscreen obstacles
    state.obstacles = state.obstacles.filter((obs) => obs.x > -60);

    // Move Collectibles
    state.collectibles.forEach((item) => {
      item.x -= state.speed;
    });

    // Spawn collectibles
    if (state.collectibles.length < 3 && Math.random() < 0.03) {
      state.collectibles.push({
        x: 850 + Math.random() * 200,
        y: 160 + Math.random() * 50,
        type: Math.random() > 0.3 ? 'coin' : 'coxinha',
      });
    }
    state.collectibles = state.collectibles.filter((item) => item.x > -40);

    // Motoboy logic
    const moto = state.motoboy;
    if (moto.active) {
      // Motoboy moves slightly slower than player so Caramelo can catch up!
      moto.x -= (state.speed - moto.speed);

      // Dog bites motoboy!
      const dogX = 90;
      const dogHitbox = { x: dogX, y: state.dogY - 20, w: 45, h: 35 };
      const motoHitbox = { x: moto.x, y: moto.y, w: 55, h: 60 };

      if (
        dogHitbox.x + dogHitbox.w > motoHitbox.x &&
        dogHitbox.x < motoHitbox.x + motoHitbox.w &&
        dogHitbox.y + dogHitbox.h > motoHitbox.y &&
        dogHitbox.y < motoHitbox.y + motoHitbox.h
      ) {
        // BITE!
        state.motoboys++;
        state.score += 750;
        sound.playBite();
        setMotoboysBitten(state.motoboys);

        // Motoboy accelerates away and returns later!
        moto.x = 900 + Math.random() * 300;
        moto.speed = 4.5 + Math.random() * 1.5;

        // Drop bones & celebration
        for (let i = 0; i < 3; i++) {
          state.collectibles.push({
            x: dogX + 60 + i * 35,
            y: 160 - i * 15,
            type: 'coxinha',
          });
        }
      }
    }

    // Check collisions with obstacles
    const dogBox = { x: 90, y: state.dogY - 22, w: 38, h: 32 };
    for (const obs of state.obstacles) {
      if (
        dogBox.x + dogBox.w > obs.x + 6 &&
        dogBox.x < obs.x + obs.width - 6 &&
        dogBox.y + dogBox.h > obs.y + 4 &&
        dogBox.y < obs.y + obs.height
      ) {
        // Collision! Game Over
        finishGame();
        return;
      }
    }

    // Check coin collection
    state.collectibles.forEach((item) => {
      if (!item.collected) {
        if (
          dogBox.x + dogBox.w > item.x &&
          dogBox.x < item.x + 24 &&
          dogBox.y + dogBox.h > item.y &&
          dogBox.y < item.y + 24
        ) {
          item.collected = true;
          if (item.type === 'coin') {
            state.coins += 1;
            state.score += 100;
            sound.playCoin();
          } else {
            // Coxinha dá turbo de score!
            state.coins += 5;
            state.score += 350;
            sound.playBite();
          }
          setCoinsCollected(state.coins);
        }
      }
    });
    state.collectibles = state.collectibles.filter((item) => !item.collected);

    // Update state display every few frames
    setCurrentScore(Math.round(state.score));

    // RENDER CANVAS
    renderFrame(ctx, canvas.width, canvas.height);

    state.animationFrameId = requestAnimationFrame(loop);
  };

  const renderFrame = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = gameState.current;

    // Sky gradient (Sunset / Warm Brazilian dusk)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#FEF3C7'); // warm sun yellow
    skyGrad.addColorStop(0.45, '#FDE68A');
    skyGrad.addColorStop(0.7, '#FED7AA'); // orange twilight
    skyGrad.addColorStop(1, '#E2E8F0');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Sun / Sol da Quebrada
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(680, 70, 38, 0, Math.PI * 2);
    ctx.fill();

    // Background Houses / Prédios e Muros
    const bgOffset = (state.distance * 0.3) % 240;
    ctx.fillStyle = '#E2E8F0';
    for (let x = -bgOffset; x < width + 100; x += 120) {
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(x, 110, 80, 110);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(x + 10, 125, 20, 20);
      ctx.fillRect(x + 50, 125, 20, 20);
      // Muro chapiscado / portão
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(x + 80, 175, 40, 45);
    }

    // Asphalt Ground & Street
    ctx.fillStyle = '#334155'; // Dark slate asphalt
    ctx.fillRect(0, 220, width, height - 220);

    // Calçada / Guia amarela brasileira
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, 218, width, 4);

    // Road dashed line
    const roadOffset = (state.distance * 1.5) % 60;
    ctx.fillStyle = '#F1F5F9';
    for (let rx = -roadOffset; rx < width; rx += 60) {
      ctx.fillRect(rx, 255, 30, 4);
    }

    // Render Obstacles
    state.obstacles.forEach((obs) => {
      if (obs.type === 'chinelo') {
        // Havaiana voadora / no chão
        ctx.fillStyle = '#2563EB'; // Blue havaiana
        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 6);
        ctx.fill();
        // Tirante da havaiana
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(obs.x + 8, obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width / 2, obs.y + 3);
        ctx.lineTo(obs.x + obs.width - 8, obs.y + obs.height);
        ctx.stroke();
      } else {
        // Bueiro aberto / Tampa de esgoto
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.ellipse(obs.x + obs.width / 2, obs.y + 4, obs.width / 2, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Render Collectibles
    state.collectibles.forEach((item) => {
      if (item.type === 'coin') {
        // OssoCoin
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.arc(item.x + 10, item.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#78350F';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('🦴', item.x + 3, item.y + 14);
      } else {
        // Coxinha
        ctx.fillStyle = '#D97706';
        ctx.beginPath();
        ctx.moveTo(item.x + 10, item.y);
        ctx.quadraticCurveTo(item.x + 22, item.y + 20, item.x + 10, item.y + 22);
        ctx.quadraticCurveTo(item.x - 2, item.y + 20, item.x + 10, item.y);
        ctx.fill();
      }
    });

    // Render Motoboy
    const moto = state.motoboy;
    if (moto.active && moto.x > -100 && moto.x < width + 100) {
      // Bike Body
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(moto.x + 10, moto.y + 25, 36, 16);
      // Wheels
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(moto.x + 12, moto.y + 42, 10, 0, Math.PI * 2);
      ctx.arc(moto.x + 46, moto.y + 42, 10, 0, Math.PI * 2);
      ctx.fill();
      // Delivery Box (Bag do Ifood)
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(moto.x - 2, moto.y + 8, 22, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(moto.x + 2, moto.y + 16, 14, 8);
      // Rider Body & Helmet
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(moto.x + 18, moto.y + 12, 14, 18);
      ctx.fillStyle = '#0F172A'; // Helmet
      ctx.beginPath();
      ctx.arc(moto.x + 25, moto.y + 6, 9, 0, Math.PI * 2);
      ctx.fill();
      // Visor
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(moto.x + 27, moto.y + 4, 7, 4);

      // Warning prompt: "MORDA A CANELA!"
      if (moto.x < 350) {
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 12px "Fredoka", sans-serif';
        ctx.fillText('ALCANCE A CANELA! 🦷', moto.x - 20, moto.y - 12);
      }
    }

    // Render Caramelo Dog
    const dogX = 90;
    const dogY = state.dogY;
    const pColor = equippedSkin?.corPrimaria || '#D97706';
    const sColor = equippedSkin?.corSecundaria || '#F59E0B';

    // Tail wagging
    const tailAngle = Math.sin(Date.now() * 0.02) * 10;
    ctx.strokeStyle = pColor;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(dogX + 4, dogY - 8);
    ctx.lineTo(dogX - 12, dogY - 18 + tailAngle);
    ctx.stroke();

    // Body
    ctx.fillStyle = pColor;
    ctx.beginPath();
    ctx.ellipse(dogX + 22, dogY - 6, 20, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Underbelly
    ctx.fillStyle = sColor;
    ctx.beginPath();
    ctx.ellipse(dogX + 22, dogY - 2, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (animated running cycle)
    const legPhase = (state.distance * 0.25);
    const leg1Y = Math.sin(legPhase) * 6;
    const leg2Y = Math.cos(legPhase) * 6;

    ctx.fillStyle = pColor;
    ctx.fillRect(dogX + 8, dogY + 4, 5, 12 + leg1Y);
    ctx.fillRect(dogX + 30, dogY + 4, 5, 12 + leg2Y);

    // Collar
    ctx.fillStyle = equippedSkin?.acessorios?.coleira === 'dourada' ? '#EAB308' : '#DC2626';
    ctx.fillRect(dogX + 32, dogY - 14, 6, 12);

    // Head
    ctx.fillStyle = pColor;
    ctx.beginPath();
    ctx.arc(dogX + 40, dogY - 16, 12, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = sColor;
    ctx.beginPath();
    ctx.ellipse(dogX + 48, dogY - 14, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(dogX + 53, dogY - 15, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Ear
    ctx.fillStyle = '#92400E';
    ctx.beginPath();
    ctx.moveTo(dogX + 34, dogY - 26);
    ctx.lineTo(dogX + 42, dogY - 26);
    ctx.lineTo(dogX + 36, dogY - 16);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#1C1917';
    ctx.beginPath();
    ctx.arc(dogX + 42, dogY - 18, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Juliete Sunglasses or Visor
    if (equippedSkin?.acessorios?.tipoOculos === 'juliete') {
      ctx.fillStyle = '#EC4899';
      ctx.fillRect(dogX + 40, dogY - 20, 10, 4);
    } else if (equippedSkin?.acessorios?.tipoOculos === 'cibernetico') {
      ctx.fillStyle = '#06B6D4';
      ctx.fillRect(dogX + 39, dogY - 20, 12, 5);
    }

    // Bark Visual Effect ("AU AU!")
    if (state.barkEffect.active && state.barkEffect.timer > 0) {
      state.barkEffect.timer--;
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 16px "Fredoka", sans-serif';
      ctx.fillText('💥 AU AU!!', dogX + 56, dogY - 28);
    }
  };

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    setSoundMuted(!sound.enabled);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto bg-stone-900 rounded-3xl p-4 md:p-6 shadow-2xl border-4 border-amber-500/80 overflow-hidden select-none">
      {/* Game Header Bar */}
      <div className="flex items-center justify-between gap-4 mb-3 px-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-bounce">🐕💨</span>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-amber-400 font-fun tracking-wide">
              Vira-Lata Run: Modo Treino de Rua
            </h3>
            <p className="text-xs text-stone-400">
              Skin Equipada: <span className="text-amber-300 font-semibold">{equippedSkin?.nome || 'Caramelo Raiz'}</span>
            </p>
          </div>
        </div>

        {/* HUD Counters */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="bg-stone-800/90 px-3 py-1.5 rounded-xl border border-stone-700 flex items-center gap-1.5">
            <span className="text-sm">🏆</span>
            <span className="text-xs md:text-sm font-bold text-amber-400 font-mono">
              {currentScore.toLocaleString('pt-BR')} pts
            </span>
          </div>

          <div className="bg-stone-800/90 px-3 py-1.5 rounded-xl border border-stone-700 flex items-center gap-1.5">
            <span className="text-sm">🛵</span>
            <span className="text-xs md:text-sm font-bold text-red-400 font-mono">
              {motoboysBitten} canelas
            </span>
          </div>

          <div className="bg-stone-800/90 px-3 py-1.5 rounded-xl border border-stone-700 flex items-center gap-1.5">
            <span className="text-sm">🦴</span>
            <span className="text-xs md:text-sm font-bold text-yellow-400 font-mono">
              +{coinsCollected}
            </span>
          </div>

          <button
            onClick={toggleSound}
            className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition-colors"
            title={soundMuted ? 'Ativar Sons' : 'Silenciar'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative w-full aspect-[16/6] min-h-[260px] md:min-h-[300px] bg-slate-900 rounded-2xl overflow-hidden shadow-inner border border-stone-700/60">
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          className="w-full h-full object-cover block cursor-pointer"
          onClick={jump}
        />

        {/* Start Overlay */}
        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold mb-2 uppercase tracking-wider border border-amber-500/30">
              <Zap className="w-3.5 h-3.5" /> Mini-Game Integrado ao Ranking
            </div>
            <h4 className="text-2xl md:text-3xl font-extrabold text-white font-fun mb-2 drop-shadow">
              Pronto para correr atrás dos motoboys?
            </h4>
            <p className="text-xs md:text-sm text-stone-300 max-w-md mb-6 leading-relaxed">
              Pule chinelos com <kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-600 text-amber-300 font-mono text-xs">ESPAÇO</kbd> ou <kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-600 text-amber-300 font-mono text-xs">CLIQUE</kbd>. Use <kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-600 text-amber-300 font-mono text-xs">B</kbd> para latir e fazer o motoboy soltar coxinhas!
            </p>

            <button
              onClick={startGame}
              className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-extrabold text-base md:text-lg rounded-2xl shadow-xl shadow-amber-500/30 transition-all flex items-center gap-2 cursor-pointer font-fun"
            >
              <Play className="w-5 h-5 fill-current" /> JOGAR AGORA!
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in">
            <div className="text-4xl mb-1">💥🩴</div>
            <h4 className="text-2xl md:text-3xl font-black text-red-400 font-fun mb-1">
              CHINELADA NA FUÇA!
            </h4>
            <p className="text-sm text-stone-300 mb-3">
              A vizinha acertou a havaiana voadora em você!
            </p>

            <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-4">
              <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800 text-center">
                <span className="text-xs text-stone-400 block">Pontuação</span>
                <span className="text-base font-bold text-amber-400 font-mono">
                  {currentScore.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800 text-center">
                <span className="text-xs text-stone-400 block">Canelas</span>
                <span className="text-base font-bold text-red-400 font-mono">
                  {motoboysBitten}
                </span>
              </div>
              <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800 text-center">
                <span className="text-xs text-stone-400 block">OssoCoins</span>
                <span className="text-base font-bold text-yellow-400 font-mono">
                  +{coinsCollected}
                </span>
              </div>
            </div>

            {highScoreResult && (
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/40 mb-3 animate-pulse">
                <Sparkles className="w-4 h-4 text-amber-400" /> NOVO RECORDE PESSOAL NA QUEBRADA!
              </div>
            )}

            {antiCheatAlert && (
              <div className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-800 mb-3">
                <ShieldAlert className="w-4 h-4" /> Alerta Anti-Cheat ativado! Telemetria enviada ao Root.
              </div>
            )}

            <button
              onClick={startGame}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 cursor-pointer font-fun text-sm md:text-base"
            >
              <RotateCcw className="w-4 h-4" /> CORRER DE NOVO
            </button>
          </div>
        )}
      </div>

      {/* Touch / Mobile Controls */}
      <div className="mt-3 flex items-center justify-between gap-3 md:hidden">
        <button
          onClick={jump}
          className="flex-1 py-3 bg-stone-800 active:bg-amber-600 text-white font-bold rounded-xl text-center text-sm border border-stone-700"
        >
          ⬆️ PULAR CHINELO
        </button>
        <button
          onClick={bark}
          className="flex-1 py-3 bg-amber-600 active:bg-amber-500 text-stone-950 font-extrabold rounded-xl text-center text-sm shadow-md font-fun"
        >
          💥 LATIR (AU AU!)
        </button>
      </div>
    </div>
  );
};
