import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Monitor, CheckCircle, Share, PlusSquare, X, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import { sound } from '../../services/soundEffects';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Detecta se já está rodando como PWA instalado (Standalone)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandaloneMode);
    };

    checkStandalone();

    // Detecta se é iOS (iPhone / iPad)
    const ua = window.navigator.userAgent;
    const isAppleDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isAppleDevice);

    // Captura o evento nativo de instalação do navegador (Android/Chrome/Edge/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallSuccess(true);
      setDeferredPrompt(null);
      sound.playWin();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    sound.playClick();
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstallSuccess(true);
        setIsInstalled(true);
        sound.playWin();
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('[PWA] Erro ao disparar prompt de instalação:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in zoom-in-95">
      <div className="relative w-full max-w-md bg-stone-950 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-center flex flex-col items-center overflow-hidden">
        {/* Glow de fundo - Gradientes radiais limpos */}
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full ambient-glow-amber pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full ambient-glow-cyan pointer-events-none" />

        {/* Botão de Fechar */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer border border-zinc-800"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone do App */}
        <div className="relative mb-4 group">
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-amber-500 to-yellow-400 opacity-75 blur-md group-hover:opacity-100 transition-opacity animate-pulse" />
          <img
            src="/logo.jpg"
            alt="Vira-Lata Run App"
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-amber-300 shadow-2xl"
          />
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-stone-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-200 shadow-lg flex items-center gap-1 font-mono">
            <Zap className="w-3 h-3 fill-stone-950" />
            <span>PWA 3D</span>
          </div>
        </div>

        {/* Título e Subtítulo */}
        <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
          <span>INSTALAR</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
            CARAMELO RUN 3D
          </span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed font-medium">
          Jogue direto da tela inicial do seu celular ou PC como um app nativo, sem ocupar memória da loja!
        </p>

        {/* Vantagens do PWA */}
        <div className="w-full grid grid-cols-3 gap-2 my-4">
          <div className="bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
            <Smartphone className="w-5 h-5 text-amber-400 mb-1" />
            <span className="text-[10px] font-bold text-zinc-300 uppercase leading-tight">Zero Download de Loja</span>
          </div>
          <div className="bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
            <Zap className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-[10px] font-bold text-zinc-300 uppercase leading-tight">60 FPS Cravado</span>
          </div>
          <div className="bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
            <ShieldCheck className="w-5 h-5 text-cyan-400 mb-1" />
            <span className="text-[10px] font-bold text-zinc-300 uppercase leading-tight">Modo Offline Pronto</span>
          </div>
        </div>

        {/* STATUS 1: Já instalado */}
        {isInstalled || installSuccess ? (
          <div className="w-full bg-emerald-950/70 border border-emerald-500/50 p-4 rounded-2xl flex flex-col items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-10 h-10 text-emerald-400 animate-bounce" />
            <div className="text-sm font-black text-emerald-300 uppercase">
              APP JÁ INSTALADO COM SUCESSO! 🎉
            </div>
            <p className="text-xs text-emerald-200/80">
              Procure pelo ícone do <strong>Caramelo Run</strong> na sua tela de início para jogar instantaneamente em tela cheia!
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg"
            >
              Entendido! Jogar Agora
            </button>
          </div>
        ) : deferredPrompt ? (
          /* STATUS 2: Instalação nativa direta em 1-Clique (Chrome / Android / Windows / Edge) */
          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 border-2 border-yellow-200 animate-pulse"
            >
              <Download className="w-5 h-5 stroke-[2.5]" />
              <span>INSTALAR AGORA EM 1-CLIQUE</span>
            </button>
            <p className="text-[11px] text-zinc-400">
              Instalação instantânea em menos de 3 segundos no seu dispositivo.
            </p>
          </div>
        ) : isIOS ? (
          /* STATUS 3: Passo a passo de Instalação para iPhone / iPad (iOS Safari) */
          <div className="w-full bg-zinc-900/90 border border-amber-500/40 p-4 rounded-2xl flex flex-col text-left gap-3">
            <div className="text-xs font-black text-amber-400 uppercase flex items-center gap-1.5">
              <span>🍏</span>
              <span>COMO INSTALAR NO IPHONE / IPAD:</span>
            </div>
            <ol className="text-xs text-zinc-300 space-y-2 font-medium">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px] border border-amber-500/40">1</span>
                <span>Toque no botão <strong className="text-white">Compartilhar</strong> <Share className="w-4 h-4 text-cyan-400 inline mx-0.5" /> do Safari.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px] border border-amber-500/40">2</span>
                <span>Role para baixo e selecione <strong className="text-white">Adicionar à Tela de Início</strong> <PlusSquare className="w-4 h-4 text-emerald-400 inline mx-0.5" />.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px] border border-amber-500/40">3</span>
                <span>Confirme em <strong className="text-white">Adicionar</strong> no canto superior. Pronto! 🚀</span>
              </li>
            </ol>
          </div>
        ) : (
          /* STATUS 4: Computador / Navegador Desktop genérico sem prompt pendente */
          <div className="w-full bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-2.5 text-center">
            <div className="text-xs font-black text-zinc-200 uppercase flex items-center justify-center gap-1.5">
              <Monitor className="w-4 h-4 text-amber-400" />
              <span>INSTALAR PELO NAVEGADOR</span>
            </div>
            <p className="text-xs text-zinc-400">
              No Chrome/Edge/Brave no PC, clique no ícone de <strong>Instalar App (⊕ ou 📥)</strong> na barra de endereços do navegador no topo direito.
            </p>
            <button
              onClick={onClose}
              className="mt-1 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Fechar Guia
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
