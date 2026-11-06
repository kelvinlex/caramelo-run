import React from 'react';
import {
  Gamepad2,
  Trophy,
  ShoppingBag,
  Shield,
  Sparkles,
  Zap,
  ArrowRight,
  Download,
  Dices,
  Flame,
  Star,
  Users,
  Megaphone,
  Settings,
  Camera,
} from 'lucide-react';
import { API_BASE_URL } from '../../services/apiService';
import { sound } from '../../services/soundEffects';
import { storage } from '../../services/storageService';
import { User, Skin } from '../../types';
import { CarameloAvatar } from '../common/CarameloAvatar';
import { ProfilePhotoSelectorModal } from '../player/ProfilePhotoSelectorModal';
import { LegalTab } from '../legal/LegalModal';
import { SteelCornerBrackets, SteelRivet } from '../common/CartoonWoodUI';

interface HomePageProps {
  currentUser: User | null;
  onNavigate: (view: 'home' | 'leaderboard' | 'profile' | 'admin' | 'game' | 'shop') => void;
  onOpenAuth: () => void;
  onSelectPlayer: (user: User) => void;
  onOpenMarketing?: () => void;
  onOpenSettings?: () => void;
  onOpenPWAInstall?: () => void;
  onOpenLegalModal?: (tab: LegalTab) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  currentUser,
  onNavigate,
  onOpenAuth,
  onSelectPlayer,
  onOpenMarketing,
  onOpenSettings,
  onOpenPWAInstall,
  onOpenLegalModal,
}) => {
  const skins = storage.getSkins();
  const [leaderboard, setLeaderboard] = React.useState<User[]>(() => storage.getLeaderboard());
  const [downloadMsg, setDownloadMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`${API_BASE_URL}/leaderboard`)
      .then(res => {
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
          throw new Error('Offline fallback');
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((u: any) => ({
            ...u,
            stats: {
              maiorPontuacao: u.maiorPontuacao || u.stats?.maiorPontuacao || 0,
              motoqueirosMordidos: u.motoqueirosMordidos || u.stats?.motoqueirosMordidos || 0,
              chinelosDesviados: u.chinelosDesviados || u.stats?.chinelosDesviados || 0,
              distanciaKm: u.distanciaKm || u.stats?.distanciaKm || 0,
              conquistasDesbloqueadas: u.conquistasDesbloqueadas || u.stats?.conquistasDesbloqueadas || 0,
              totalConquistas: u.totalConquistas || u.stats?.totalConquistas || 15,
              statusQuebrada: u.statusQuebrada || u.stats?.statusQuebrada || 'Filhote'
            }
          }));
          setLeaderboard(formatted);
        }
      })
      .catch(() => {
        setLeaderboard(storage.getLeaderboard());
      });
  }, []);

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  const [isPhotoModalOpen, setIsPhotoModalOpen] = React.useState(false);

  return (
    <div className="space-y-8 sm:space-y-12 py-3 sm:py-6 md:py-8 text-stone-100 selection:bg-amber-500 selection:text-stone-950 w-full max-w-full overflow-x-hidden">
      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
        {/* BANNER DO PERFIL DO JOGADOR NO MENU COM FOTO E 3 TIPOS DE NOTAS */}
        {currentUser && (
          <div className="mb-6 cartoon-wood-board p-3 sm:p-5 relative shadow-[0_10px_25px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row items-center justify-between gap-3 max-w-full overflow-hidden">
            <SteelCornerBrackets size="sm" />
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 z-10">
              {/* Foto de Perfil Clicável */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsPhotoModalOpen(true);
                }}
                className="relative group p-1 rounded-2xl bg-gradient-to-b from-[#ffcf4b] to-[#d97706] border-2 border-white/60 shadow-lg cursor-pointer flex-shrink-0 hover:scale-105 transition-transform"
                title="Clique para escolher outra foto de perfil"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-950 border border-black/40">
                  {currentUser.profilePhotoUrl ? (
                    <img
                      src={currentUser.profilePhotoUrl}
                      alt={currentUser.nickname}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  ) : (
                    <span className="text-xl sm:text-2xl">🐕</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 bg-[#2563eb] border border-white/80 rounded-full text-white shadow-md">
                  <Camera className="w-3 h-3 stroke-[2.5]" />
                </div>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base sm:text-xl font-black text-[#ffea85] cartoon-title-gold-3d truncate">
                    @{currentUser.nickname}
                  </span>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#1b2b40] text-[#93c5fd] border-2 border-[#3b597c] shadow-sm flex-shrink-0">
                    {currentUser.stats.statusQuebrada}
                  </span>
                </div>
                <div className="text-xs text-amber-200/90 font-bold mt-0.5">
                  Recorde: <span className="text-[#ffdf5d] font-mono font-black">{currentUser.stats.maiorPontuacao.toLocaleString('pt-BR')} pts</span>
                </div>
              </div>
            </div>

            {/* Três tipos de dinheiro em cartoon-steel-pill */}
            <div className="flex items-center justify-center flex-wrap gap-2 cartoon-steel-pill px-3 py-2 z-10 w-full sm:w-auto shadow-md">
              {/* Nota de 10 */}
              <div
                onClick={() => onNavigate('shop')}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 cursor-pointer hover:scale-105 transition-transform"
                title="Skins Comuns custam notas de R$ 10"
              >
                <img src="/dinheiro/icone_10_cutout.png" alt="10" className="w-5 h-3.5 object-contain drop-shadow" />
                <span className="text-xs sm:text-sm font-black text-emerald-300 font-mono">
                  {(currentUser.notas10 ?? 0).toLocaleString('pt-BR')}
                </span>
              </div>

              {/* Nota de 50 */}
              <div
                onClick={() => onNavigate('shop')}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-950/70 border border-purple-500/40 cursor-pointer hover:scale-105 transition-transform"
                title="Skins Intermediárias custam notas de R$ 50"
              >
                <img src="/dinheiro/icone_50_roxo_cutout.png" alt="50" className="w-5 h-3.5 object-contain drop-shadow" />
                <span className="text-xs sm:text-sm font-black text-purple-300 font-mono">
                  {(currentUser.notas50 ?? 0).toLocaleString('pt-BR')}
                </span>
              </div>

              {/* Nota de 100 */}
              <div
                onClick={() => onNavigate('shop')}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-950/70 border border-cyan-500/50 cursor-pointer hover:scale-105 transition-transform"
                title="Skins Raras custam notas de R$ 100"
              >
                <img src="/dinheiro/icone_100_vermelho_cutout.png" alt="100" className="w-5 h-3.5 object-contain drop-shadow" />
                <span className="text-xs sm:text-sm font-black text-cyan-200 font-mono">
                  {(currentUser.notas100 ?? 0).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* HERO CARTOON WOOD BOARD */}
        <div className="relative cartoon-wood-board p-5 sm:p-10 lg:p-12 shadow-[0_15px_35px_rgba(0,0,0,0.8)] overflow-hidden text-center md:text-left">
          <SteelCornerBrackets size="lg" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-center relative z-10">
            <div className="lg:col-span-7 space-y-4 sm:space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 cartoon-wood-plank text-amber-200 border-2 border-[#543015] rounded-xl text-[11px] sm:text-xs font-black tracking-wide shadow-md">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" /> O MAIOR JOGO 3D DA QUEBRADA BRASILEIRA
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
                VIRA-LATA RUN 3D <br />
                <span className="cartoon-title-gold-3d text-3xl sm:text-5xl lg:text-6xl">
                  MOTO-CHASER & GRAU
                </span>
              </h1>

              {/* Sub-text */}
              <p className="text-amber-100 text-xs sm:text-base md:text-lg max-w-xl leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-medium">
                Assuma o controle do autêntico <strong>Caramelo Brasileiro</strong>! Corra pelas ruas da quebrada, persiga motoboys na CG 160, morda canelas, desvie de jatos d'água e desbloqueie artes exclusivas!
              </p>

              {/* Primary Buttons */}
              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 pt-2 w-full">
                <button
                  onClick={() => {
                    sound.playBark();
                    onNavigate('game');
                  }}
                  className="w-full sm:w-auto px-8 py-4 cartoon-btn-gold text-[#3d2002] font-black text-base sm:text-lg rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer group min-h-[56px]"
                >
                  <Gamepad2 className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                  <span>JOGAR AGORA!</span>
                </button>

                {onOpenPWAInstall && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      onOpenPWAInstall();
                    }}
                    className="w-full sm:w-auto px-6 py-4 cartoon-btn-green text-white rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg min-h-[56px]"
                  >
                    <Download className="w-5 h-5 stroke-[2.5]" />
                    <span>INSTALAR APP 📲</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    sound.playClick();
                    if (onOpenMarketing) onOpenMarketing();
                  }}
                  className="w-full sm:w-auto px-6 py-4 cartoon-btn-purple text-white rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg min-h-[56px]"
                >
                  <Megaphone className="w-5 h-5 stroke-[2.5]" />
                  <span>ANUNCIE SUA MARCA!</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    onNavigate('leaderboard');
                  }}
                  className="w-full sm:w-auto px-6 py-4 cartoon-btn-steel text-white rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer min-h-[56px] shadow-md"
                >
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span>RANKING</span>
                </button>

                {onOpenSettings && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      onOpenSettings();
                    }}
                    className="w-full sm:w-auto px-6 py-4 cartoon-btn-wood text-amber-200 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer min-h-[56px] shadow-md"
                    title="Configurações Gráficas e de Jogo"
                  >
                    <Settings className="w-4 h-4 text-amber-300 animate-[spin_8s_linear_infinite]" />
                    <span>CONFIGURAÇÕES</span>
                  </button>
                )}
              </div>

              {/* Live counter info */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-6 pt-3 sm:pt-4 border-t-2 border-[#5a3316] text-xs text-amber-200/90 font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                  <span>
                    {(1420 + (storage.getUsers()?.length || 0)).toLocaleString('pt-BR')} Jogadores na Quebrada
                  </span>
                </div>
                <div className="hidden sm:block text-amber-400">•</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#ffe066] font-mono font-black">
                    {top1 ? `${top1.stats.maiorPontuacao.toLocaleString('pt-BR')} pts` : '0 pts'}
                  </span>
                  <span>Recorde por @{top1 ? top1.nickname : 'Caramelo'}</span>
                </div>
              </div>
            </div>

            {/* Hero Mascot Visual Card (Navy Panel with Steel Brackets) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative cartoon-navy-panel p-5 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.7)] flex flex-col items-center text-center max-w-full">
                <SteelCornerBrackets size="sm" />

                <div className="mb-2 px-3.5 py-1 cartoon-gold-ribbon text-[#3d2002] font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-md">
                  Skin Juliete Rara ✨
                </div>

                <div className="w-40 h-40 sm:w-60 sm:h-60 rounded-2xl overflow-hidden border-4 border-[#3b597c] mb-2 shadow-[0_8px_20px_rgba(0,0,0,0.6)] bg-zinc-950 flex items-center justify-center">
                  <img src="/img/caramelo.jpeg" alt="Caramelo Brasileiro" className="w-full h-full object-cover scale-[1.25] hover:scale-[1.35] transition-transform duration-500" />
                </div>

                <h3 className="text-lg sm:text-xl font-black text-[#ffea85] cartoon-title-gold-3d mt-2">
                  O Terror dos Motoboys
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xs font-medium">
                  "Nenhum escapamento esportivo passará impune pela minha calçada!"
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <span className="px-3 py-1 cartoon-steel-pill text-[#93c5fd] font-mono text-xs font-black">
                    Velocidade: 99/100
                  </span>
                  <span className="px-3 py-1 cartoon-steel-pill text-red-300 font-mono text-xs font-black">
                    Mordida: 100/100
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TOP 3 PODIUM PREVIEW (Cartoon Wood Board) */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
        <div className="cartoon-wood-board p-5 sm:p-8 relative shadow-[0_12px_30px_rgba(0,0,0,0.7)]">
          <SteelCornerBrackets size="md" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b-2 border-[#5a3316] pb-4 z-10 relative">
            <div>
              <span className="text-xs uppercase font-black text-amber-300 tracking-wider">
                🏆 RANKING GLOBAL DOS CACHORREIROS
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white cartoon-title-3d">
                Top 3 Líderes da Quebrada
              </h3>
            </div>

            <button
              onClick={() => onNavigate('leaderboard')}
              className="cartoon-btn-steel px-5 py-2.5 rounded-xl text-xs font-black text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              Ver Tabela Completa →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 z-10 relative">
            {/* Top 1 */}
            {top1 && (
              <div
                onClick={() => onSelectPlayer(top1)}
                className="cartoon-navy-panel p-4 cursor-pointer hover:scale-[1.02] transition-transform relative border-2 border-[#ffbe3b] shadow-[0_6px_16px_rgba(245,158,11,0.3)]"
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-black text-amber-300">🥇</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-white text-base truncate">@{top1.nickname}</div>
                    <div className="text-xs font-mono font-black text-[#ffea85]">
                      {top1.stats.maiorPontuacao.toLocaleString('pt-BR')} pts
                    </div>
                    <div className="text-[11px] text-slate-400">Skin: Juliete Rara</div>
                  </div>
                </div>
              </div>
            )}

            {/* Top 2 */}
            {top2 && (
              <div
                onClick={() => onSelectPlayer(top2)}
                className="cartoon-navy-panel p-4 cursor-pointer hover:scale-[1.02] transition-transform relative border-2 border-slate-400 shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-black text-slate-300">🥈</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-white text-base truncate">@{top2.nickname}</div>
                    <div className="text-xs font-mono font-black text-slate-200">
                      {top2.stats.maiorPontuacao.toLocaleString('pt-BR')} pts
                    </div>
                    <div className="text-[11px] text-slate-400">Skin: Cria Capuz</div>
                  </div>
                </div>
              </div>
            )}

            {/* Top 3 */}
            {top3 && (
              <div
                onClick={() => onSelectPlayer(top3)}
                className="cartoon-navy-panel p-4 cursor-pointer hover:scale-[1.02] transition-transform relative border-2 border-amber-700 shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-black text-amber-600">🥉</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-white text-base truncate">@{top3.nickname}</div>
                    <div className="text-xs font-mono font-black text-amber-400">
                      {top3.stats.maiorPontuacao.toLocaleString('pt-BR')} pts
                    </div>
                    <div className="text-[11px] text-slate-400">Skin: Tradicional</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. MEME FEATURES GRID (Cartoon Navy Panels) */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-6 sm:mb-8 space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-amber-400 font-black">
            🐕 MECÂNICAS & DIVERSÃO BRASILEIRA
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white cartoon-title-3d">
            Por que o Caramelo é o Maior Herói Nacional?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="cartoon-navy-panel p-5 relative shadow-lg space-y-3">
            <SteelCornerBrackets size="sm" />
            <div className="w-12 h-12 rounded-xl bg-red-950/80 border-2 border-red-700 flex items-center justify-center text-2xl shadow-inner">
              🛵
            </div>
            <h4 className="font-black text-white text-base">
              Perseguição de Motoboy
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Ouvir um escapamento furado ativa o modo turbo do Caramelo. Alcance a moto e morda a canela!
            </p>
          </div>

          <div className="cartoon-navy-panel p-5 relative shadow-lg space-y-3">
            <SteelCornerBrackets size="sm" />
            <div className="w-12 h-12 rounded-xl bg-blue-950/80 border-2 border-blue-700 flex items-center justify-center text-2xl shadow-inner">
              🩴
            </div>
            <h4 className="font-black text-white text-base">
              Esquiva de Havaiana
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              A vizinha não perdoa latidos de madrugada. Salte com reflexos de ninja para não tomar uma chinelada voadora.
            </p>
          </div>

          <div className="cartoon-navy-panel p-5 relative shadow-lg space-y-3">
            <SteelCornerBrackets size="sm" />
            <div className="w-12 h-12 rounded-xl bg-amber-950/80 border-2 border-amber-600 flex items-center justify-center text-2xl shadow-inner">
              🕶️
            </div>
            <h4 className="font-black text-white text-base">
              Skins Juliete & Cria
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Guarda-roupa com óculos furta-cor, capuz de cria, coroa de ouro maciço e armadura cibernética 2077.
            </p>
          </div>

          <div className="cartoon-navy-panel p-5 relative shadow-lg space-y-3">
            <SteelCornerBrackets size="sm" />
            <div className="w-12 h-12 rounded-xl bg-yellow-950/80 border-2 border-yellow-600 flex items-center justify-center text-2xl shadow-inner">
              🦴
            </div>
            <h4 className="font-black text-white text-base">
              Economia de Notas BR
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Colete notas de R$ 10, R$ 50 e R$ 100 na pista para desbloquear motos lendárias e artes oficiais.
            </p>
          </div>
        </div>
      </section>

      {/* 4. DOWNLOAD / APPS TEASER (Cartoon Wood Board) */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
        {downloadMsg && (
          <div className="mb-4 cartoon-navy-panel p-3 text-center text-xs font-black text-emerald-300 border-2 border-emerald-500 shadow-lg">
            {downloadMsg}
          </div>
        )}
        <div className="cartoon-wood-board p-6 sm:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 relative shadow-[0_12px_30px_rgba(0,0,0,0.8)]">
          <SteelCornerBrackets size="md" />

          <div className="space-y-2 text-center md:text-left z-10">
            <span className="text-[11px] font-black uppercase tracking-wider cartoon-steel-pill text-amber-300 px-3 py-1 inline-block">
              📱 DISPONÍVEL NO NAVEGADOR & MOBILE
            </span>
            <h3 className="text-2xl sm:text-4xl font-black cartoon-title-gold-3d">
              Baixe o APK ou Jogue na Web!
            </h3>
            <p className="text-xs sm:text-sm font-semibold max-w-lg text-amber-100">
              Sincronização em tempo real de inventário, recordes no ranking nacional e suporte ao controle touchscreen.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto z-10">
            <button
              onClick={() => {
                sound.playWin();
                setDownloadMsg('📦 Download do APK Vira-Lata Run v1.0.4 iniciado!');
                setTimeout(() => setDownloadMsg(null), 4000);
              }}
              className="w-full sm:w-auto px-6 py-3.5 cartoon-btn-steel text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Download className="w-4 h-4 text-amber-300" /> BAIXAR APK ANDROID
            </button>

            <button
              onClick={() => onNavigate('game')}
              className="w-full sm:w-auto px-6 py-3.5 cartoon-btn-gold text-[#3d2002] font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Gamepad2 className="w-4 h-4" /> JOGAR NO NAVEGADOR
            </button>
          </div>
        </div>
      </section>

      {/* Seletor de Foto de Perfil na Home */}
      {currentUser && (
        <ProfilePhotoSelectorModal
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          currentPhotoUrl={currentUser.profilePhotoUrl}
          onSelectPhoto={(photoUrl) => {
            storage.setUserProfilePhoto(currentUser.id, photoUrl);
          }}
        />
      )}
    </div>
  );
};
