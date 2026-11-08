import React from 'react';
import {
  Trophy,
  ShoppingBag,
  Shield,
  LogIn,
  LogOut,
  Gamepad2,
  Volume2,
  VolumeX,
  Sparkles,
  User as UserIcon,
  Home,
  Megaphone,
  Download,
} from 'lucide-react';
import { User } from '../types';
import { sound } from '../services/soundEffects';
import { storage, isInfiniteMoneyUser } from '../services/storageService';
import { ProfilePhotoSelectorModal } from './player/ProfilePhotoSelectorModal';

interface NavbarProps {
  currentUser: User | null;
  activeView: string;
  onNavigate: (view: 'home' | 'leaderboard' | 'profile' | 'admin' | 'game' | 'shop') => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenMarketing?: () => void;
  onOpenPWAInstall?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeView,
  onNavigate,
  onOpenAuth,
  onLogout,
  onOpenMarketing,
  onOpenPWAInstall,
}) => {
  const [soundEnabled, setSoundEnabled] = React.useState(sound.enabled);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = React.useState(false);

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    setSoundEnabled(sound.enabled);
  };

  const isStaff = currentUser && (currentUser.role === 'root' || currentUser.role === 'admin');

  return (
    <>
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 cartoon-wood-plank border-b-4 border-[#2f435c] text-stone-100 shadow-[0_8px_20px_rgba(0,0,0,0.6)]" style={{ transform: 'translateZ(0)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 relative">
          {/* Rivets in corners */}
          <div className="absolute top-1.5 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.8)] opacity-60 pointer-events-none" />
          <div className="absolute bottom-1.5 left-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.8)] opacity-60 pointer-events-none" />
          <div className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.8)] opacity-60 pointer-events-none" />
          <div className="absolute bottom-1.5 right-2 w-2 h-2 rounded-full bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.8)] opacity-60 pointer-events-none" />

          {/* Brand Logo */}
          <div
            onClick={() => {
              sound.playBark();
              onNavigate('home');
            }}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none min-w-0"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-b from-[#ffbe3b] to-[#d97706] p-0.5 sm:p-1 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_2px_2px_rgba(255,255,255,0.4)] group-hover:scale-105 transition-transform overflow-hidden border-2 border-[#fff0a8] flex-shrink-0">
              <img
                src="/menu/caramelo_dog.png"
                alt="Caramelo"
                className="w-full h-full object-contain drop-shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-xl sm:text-2xl hidden" id="fallback-dog-icon">🐕</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm sm:text-xl text-[#ffda59] tracking-tight leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate cartoon-title-gold-3d">
                  CARAMELO RUN
                </span>
                <span className="text-[9px] bg-[#1e2f47] text-[#85b6ff] font-black px-1.5 py-0.5 rounded border border-[#3b557a] leading-none flex-shrink-0 shadow-sm">
                  3D
                </span>
              </div>
              <span className="text-[8px] sm:text-[10px] text-amber-200/80 font-black tracking-wider uppercase block mt-0.5 hidden sm:block drop-shadow">
                MOTO-CHASER NA QUEBRADA
              </span>
            </div>
          </div>

          {/* Desktop Nav Links Pill (Cartoon Blue-Steel Dock) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#142033]/90 p-1.5 rounded-2xl border-2 border-[#2f486d] shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
            <button
              onClick={() => {
                sound.playClick();
                onNavigate('home');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'home'
                  ? 'cartoon-btn-gold text-[#3d2002]'
                  : 'text-slate-300 hover:text-white hover:bg-[#1e304b]'
              }`}
            >
              <span>🏠</span>
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onNavigate('shop');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'shop'
                  ? 'cartoon-btn-gold text-[#3d2002]'
                  : 'text-slate-300 hover:text-amber-300 hover:bg-[#1e304b]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              <span>Loja</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onNavigate('leaderboard');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'leaderboard'
                  ? 'cartoon-btn-gold text-[#3d2002]'
                  : 'text-slate-300 hover:text-white hover:bg-[#1e304b]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>Ranking</span>
            </button>

            {onOpenPWAInstall && (
              <button
                onClick={() => {
                  sound.playClick();
                  onOpenPWAInstall();
                }}
                className="cartoon-btn-green px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer text-white shadow-md"
                title="Instalar aplicativo PWA no Celular ou Computador"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>INSTALAR</span>
              </button>
            )}

            <button
              onClick={() => {
                sound.playClick();
                if (onOpenMarketing) onOpenMarketing();
              }}
              className="cartoon-btn-purple px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer text-white shadow-md"
              title="Anunciar sua Marca no Jogo (Ads Manager 3D)"
            >
              <Megaphone className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>ANUNCIE!</span>
            </button>

            <button
              onClick={() => {
                sound.playBark();
                onNavigate('game');
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                activeView === 'game'
                  ? 'cartoon-btn-gold text-[#3d2002] scale-105'
                  : 'cartoon-btn-gold text-[#3d2002]'
              }`}
            >
              <Gamepad2 className="w-4 h-4 fill-current" />
              <span>JOGAR</span>
            </button>

            {isStaff && (
              <button
                onClick={() => {
                  sound.playClick();
                  onNavigate('admin');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'admin'
                    ? 'cartoon-btn-red text-white shadow-md'
                    : 'text-red-300 hover:bg-red-950/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Root</span>
              </button>
            )}
          </nav>

          {/* Right User State / Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-2 cartoon-btn-steel text-amber-300 rounded-xl transition-all cursor-pointer flex-shrink-0 shadow-md"
              title={soundEnabled ? 'Silenciar Áudio' : 'Ativar Sons'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                {/* 💵 Três Tipos de Dinheiro em Cartoon Steel Pill (Desktop only) */}
                <div
                  onClick={() => onNavigate('shop')}
                  className="hidden md:flex items-center gap-2.5 cartoon-steel-pill px-3 py-1 text-xs font-black font-mono cursor-pointer hover:brightness-110 transition-all shadow-md"
                  title="Seu saldo de notas (Clique para ver loja)"
                >
                  {isInfiniteMoneyUser(currentUser) ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-yellow-300 font-black">👑 ADM</span>
                      <span className="text-emerald-400 font-black text-sm">∞ INFINITO</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <img src="/dinheiro/icone_10_cutout.png" alt="10" className="w-4 h-3 object-contain drop-shadow" />
                        <span className="text-emerald-300">{(currentUser.notas10 ?? 0).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-1 border-l border-[#3a5375] pl-2">
                        <img src="/dinheiro/icone_50_roxo_cutout.png" alt="50" className="w-4 h-3 object-contain drop-shadow" />
                        <span className="text-purple-300">{(currentUser.notas50 ?? 0).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-1 border-l border-[#3a5375] pl-2">
                        <img src="/dinheiro/icone_100_vermelho_cutout.png" alt="100" className="w-4 h-3 object-contain drop-shadow" />
                        <span className="text-cyan-300">{(currentUser.notas100 ?? 0).toLocaleString('pt-BR')}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* 📸 Foto de Perfil Clicável (Abre seletor de fotos) */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setIsPhotoModalOpen(true);
                  }}
                  className="relative group p-0.5 rounded-xl border-2 border-[#ffbe3b] hover:border-white transition-all cursor-pointer shadow-lg bg-[#142033] flex-shrink-0"
                  title="Alterar Foto de Perfil"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex items-center justify-center bg-zinc-950">
                    {currentUser.profilePhotoUrl ? (
                      <img
                        src={currentUser.profilePhotoUrl}
                        alt={currentUser.nickname}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <span className="text-base">🐕</span>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full border-2 border-[#121214]" />
                </button>

                {/* User menu button */}
                <button
                  onClick={() => onNavigate('profile')}
                  className="hidden sm:flex items-center gap-1.5 cartoon-btn-steel px-3 py-1.5 rounded-xl text-xs font-black text-slate-100 transition-all cursor-pointer max-w-[120px] sm:max-w-[140px] truncate shadow-sm"
                  title="Ver Perfil"
                >
                  <span className="truncate">@{currentUser.nickname}</span>
                </button>

                <button
                  onClick={onLogout}
                  className="p-2 cartoon-btn-red text-white rounded-xl transition-all cursor-pointer flex-shrink-0 shadow-md"
                  title="Sair da Conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="cartoon-btn-gold px-4 py-2 text-[#3d2002] font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md flex-shrink-0"
              >
                <LogIn className="w-4 h-4" /> ENTRAR
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SMARTPHONE BOTTOM APP DOCK (Matching Blue-Steel Dock from Reference Image 4) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#0e1624] via-[#152338] to-[#1c2e47] border-t-4 border-[#2f4563] px-2 py-2 shadow-[0_-8px_25px_rgba(0,0,0,0.8)]" style={{ transform: 'translateZ(0)' }}>
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('home');
            }}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
              activeView === 'home'
                ? 'cartoon-btn-gold text-[#3d2002] scale-105'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-black">Home</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onNavigate('leaderboard');
            }}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
              activeView === 'leaderboard'
                ? 'cartoon-btn-gold text-[#3d2002] scale-105'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Trophy className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-black">Ranking</span>
          </button>

          {/* Central Play Button */}
          <button
            onClick={() => {
              sound.playBark();
              onNavigate('game');
            }}
            className="flex flex-col items-center -mt-6"
          >
            <div className="w-13 h-13 rounded-2xl cartoon-btn-gold flex items-center justify-center text-[#3d2002] shadow-[0_6px_16px_rgba(245,158,11,0.5)] border-2 border-[#fff0a8] active:scale-95 transition-transform">
              <Gamepad2 className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-black text-amber-300 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">JOGAR</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onNavigate('shop');
            }}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
              activeView === 'shop'
                ? 'cartoon-btn-gold text-[#3d2002] scale-105'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-black">Loja</span>
          </button>

          {isStaff ? (
            <button
              onClick={() => {
                sound.playClick();
                onNavigate('admin');
              }}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                activeView === 'admin'
                  ? 'cartoon-btn-red text-white scale-105'
                  : 'text-red-400 hover:text-red-200'
              }`}
            >
              <Shield className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-black">Root</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (!currentUser) onOpenAuth();
                else onNavigate('profile');
              }}
              className="flex flex-col items-center py-1 px-3 rounded-xl text-slate-300 hover:text-white"
            >
              <UserIcon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-black">{currentUser ? 'Perfil' : 'Entrar'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Seletor de Foto de Perfil */}
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
    </>
  );
};
