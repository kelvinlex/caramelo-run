import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, Check, Settings, X, ChevronRight } from 'lucide-react';
import { sound } from '../../services/soundEffects';

interface CookiePreferences {
  essential: boolean; // Sempre true
  analytics: boolean;
  marketing: boolean;
}

interface CookieBannerProps {
  onOpenLegalModal: (tab: 'privacy' | 'terms' | 'cookies') => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ onOpenLegalModal }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    marketing: true,
  });

  useEffect(() => {
    // Verifica se o consentimento de cookies já foi salvo
    try {
      const savedConsent = localStorage.getItem('caramelo_cookie_consent');
      if (!savedConsent) {
        // Exibe o banner após um pequeno delay para não prejudicar o carregamento
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      setIsVisible(true);
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    sound.playClick();
    try {
      localStorage.setItem('caramelo_cookie_consent', JSON.stringify({
        preferences: prefs,
        timestamp: new Date().toISOString(),
      }));
    } catch (e) {}
    setIsVisible(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ essential: true, analytics: true, marketing: true });
  };

  const handleRejectNonEssential = () => {
    saveConsent({ essential: true, analytics: false, marketing: false });
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-3 sm:p-5 pointer-events-none flex justify-center animate-in slide-in-from-bottom-5 duration-300">
      <div className="w-full max-w-4xl bg-stone-950/95 backdrop-blur-xl border-2 border-amber-500/60 rounded-3xl p-4 sm:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.25)] pointer-events-auto flex flex-col gap-4 text-stone-100 font-sans">
        {/* Cabeçalho do Banner */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0 text-amber-400 shadow-inner">
              <Cookie className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white font-fun">
                  PRIVACIDADE & COOKIES (LGPD)
                </h3>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  LEI 13.709/2018
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed font-medium">
                Utilizamos cookies essenciais para salvar seu progresso no jogo 3D, ranking e preferências. Você pode aceitar todos ou personalizar suas preferências de acordo com a nossa{' '}
                <button
                  onClick={() => onOpenLegalModal('cookies')}
                  className="text-amber-400 hover:underline font-bold cursor-pointer inline-flex items-center"
                >
                  Política de Cookies
                </button>.
              </p>
            </div>
          </div>

          <button
            onClick={handleRejectNonEssential}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Fechar e recusar não essenciais"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configurações Detalhadas (Toggle Accordion) */}
        {showSettings && (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-4 text-xs space-y-3 animate-in fade-in zoom-in-95">
            <div className="font-bold text-amber-300 uppercase tracking-wider mb-1">
              Personalizar Consentimento:
            </div>

            {/* Cookies Essenciais */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>Cookies Essenciais de Gameplay</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">OBRIGATÓRIO</span>
                </div>
                <div className="text-[11px] text-zinc-400">Salvar pontuações, login de piloto e estado do jogo 3D.</div>
              </div>
              <input type="checkbox" checked disabled className="w-4 h-4 accent-amber-500 opacity-60 cursor-not-allowed" />
            </div>

            {/* Cookies Analíticos */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <div>
                <div className="font-bold text-white">Medição de Desempenho & FPS</div>
                <div className="text-[11px] text-zinc-400">Métricas de velocidade e FPS para otimização em aparelhos fracos.</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Cookies de Marketing */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <div>
                <div className="font-bold text-white">Outdoors 3D de Parceiros</div>
                <div className="text-[11px] text-zinc-400">Exibição de marcas patrocinadoras nos cenários do jogo.</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenLegalModal('privacy')}
              className="text-xs text-zinc-400 hover:text-amber-300 transition-colors font-medium cursor-pointer"
            >
              Política de Privacidade
            </button>
            <span className="text-zinc-600">•</span>
            <button
              onClick={() => onOpenLegalModal('terms')}
              className="text-xs text-zinc-400 hover:text-amber-300 transition-colors font-medium cursor-pointer"
            >
              Termos de Uso
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>{showSettings ? 'Ocultar Opções' : 'Opções'}</span>
            </button>

            {showSettings ? (
              <button
                onClick={handleSaveCustom}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Salvar Escolha
              </button>
            ) : (
              <>
                <button
                  onClick={handleRejectNonEssential}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Recusar Opcionais
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1 border border-yellow-200"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Aceitar Todos</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
