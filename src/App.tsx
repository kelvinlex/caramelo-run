import React, { useState, useEffect } from 'react';
import { storage } from './services/storageService';
import { sound } from './services/soundEffects';
import { User } from './types';
import { Navbar } from './components/Navbar';
import { HomePage } from './components/home/HomePage';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { PlayerProfileView } from './components/player/PlayerProfileView';
import { SkinStorePage } from './components/shop/SkinStorePage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Caramelo3DRunner } from './components/game3d/Caramelo3DRunner';
import { AuthModal } from './components/auth/AuthModal';
import { PublicGamerProfileModal } from './components/player/PublicGamerProfileModal';
import { MarketingPortalModal } from './components/game/MarketingPortalModal';
import { DeviceFrameWrapper } from './components/layout/DeviceFrameWrapper';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PWAInstallModal } from './components/common/PWAInstallModal';
import { LegalModal, LegalTab } from './components/legal/LegalModal';
import { CookieBanner } from './components/legal/CookieBanner';
import { Footer } from './components/layout/Footer';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(storage.getCurrentUser());
  const [activeView, setActiveView] = useState<'home' | 'leaderboard' | 'profile' | 'admin' | 'game' | 'shop'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        if (view && ['home', 'leaderboard', 'profile', 'game', 'shop'].includes(view)) {
          return view as any;
        }
        if (params.get('autostart') === '1') {
          return 'game';
        }
      }
    } catch {}
    return 'home';
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [showPWAInstallModal, setShowPWAInstallModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('terms');
  const [inspectedPlayer, setInspectedPlayer] = useState<User | null>(null);
  const [openSettingsInGame, setOpenSettingsInGame] = useState(false);
  const [portalTransition, setPortalTransition] = useState<{
    active: boolean;
    phase: 'out' | 'in';
    direction: 'to-game' | 'to-portal';
  }>({ active: false, phase: 'in', direction: 'to-game' });
  const navSwapTimerRef = React.useRef<number | null>(null);
  const navDoneTimerRef = React.useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (navSwapTimerRef.current !== null) window.clearTimeout(navSwapTimerRef.current);
      if (navDoneTimerRef.current !== null) window.clearTimeout(navDoneTimerRef.current);
    };
  }, []);

  const handleOpenLegalModal = (tab: LegalTab) => {
    setLegalTab(tab);
    setShowLegalModal(true);
  };

  // Subscribe to reactive storage changes
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setCurrentUser(storage.getCurrentUser());
    });
    return unsubscribe;
  }, []);

  // Check URL params and routes on mount
  useEffect(() => {
    // Secret Admin Route
    if (window.location.pathname === '/adminosso' || window.location.pathname === '/adminosso/') {
      window.history.replaceState({}, '', '/');
      const user = storage.getCurrentUser();
      if (user && (user.role === 'admin' || user.role === 'root')) {
        setActiveView('admin');
      } else {
        setShowAuthModal(true);
      }
    }

    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam && ['home', 'leaderboard', 'profile', 'game', 'shop'].includes(viewParam)) {
      setActiveView(viewParam as any);
    }
    const playerParam = params.get('player');
    if (playerParam) {
      const found = storage.getUsers().find(
        (u) => u.nickname.toLowerCase() === playerParam.toLowerCase()
      );
      if (found) {
        setInspectedPlayer(found);
      }
    }
  }, []);

  const handleLogout = () => {
    sound.playClick();
    storage.logout();
    setActiveView('home');
  };

  const handleNavigate = (view: 'home' | 'leaderboard' | 'profile' | 'admin' | 'game' | 'shop') => {
    // If trying to access admin without permission, redirect to auth or warn
    if (view === 'admin') {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'root')) {
        sound.playBark();
        setShowAuthModal(true);
        return;
      }
    }
    // If trying to access profile without login, show auth modal
    if (view === 'profile' && !currentUser) {
      sound.playClick();
      setShowAuthModal(true);
      return;
    }
    if (view === activeView) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (navSwapTimerRef.current !== null) window.clearTimeout(navSwapTimerRef.current);
    if (navDoneTimerRef.current !== null) window.clearTimeout(navDoneTimerRef.current);

    const direction: 'to-game' | 'to-portal' = view === 'game' ? 'to-game' : 'to-portal';
    setPortalTransition({ active: true, phase: 'out', direction });

    navSwapTimerRef.current = window.setTimeout(() => {
      setActiveView(view);
      window.scrollTo({ top: 0, behavior: 'auto' });
      setPortalTransition({ active: true, phase: 'in', direction });
      navSwapTimerRef.current = null;
    }, 185);

    navDoneTimerRef.current = window.setTimeout(() => {
      setPortalTransition((prev) => ({ ...prev, active: false }));
      navDoneTimerRef.current = null;
    }, 470);
  };

  const handleSelectPlayer = (player: User) => {
    setInspectedPlayer(player);
  };

  const skins = storage.getSkins();
  const equippedSkin = currentUser
    ? skins.find((s) => s.id === currentUser.skinEquipadaId) || skins[0]
    : skins[0];

  return (
    <DeviceFrameWrapper activeView={activeView}>
      {activeView === 'admin' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'root') ? (
        <div className="min-h-full bg-stone-950 font-sans flex-1">
          <AdminDashboard
            currentUser={currentUser}
            onLogout={handleLogout}
            onGoToPortal={() => handleNavigate('home')}
            onInspectUser={(u) => setInspectedPlayer(u)}
          />
        </div>
      ) : (
        <div className="relative min-h-full bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950 flex-1 overflow-hidden">
          <style>{`
            @keyframes carameloPortalSweep {
              0% { opacity: 0; transform: scale(0.92); }
              38% { opacity: 1; transform: scale(1.02); }
              100% { opacity: 0; transform: scale(1.1); }
            }
            @keyframes carameloPortalMote {
              0% { opacity: 0; transform: translateY(14px) scale(0.6); }
              45% { opacity: 0.9; transform: translateY(-6px) scale(1.08); }
              100% { opacity: 0; transform: translateY(-28px) scale(0.75); }
            }
          `}</style>

          {/* Camada Cinematográfica de Luz Solar, Profundidade e Partículas Suaves na Transição Início <-> Menu */}
          {portalTransition.active && (
            <div
              className="fixed inset-0 z-[70] pointer-events-none overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    portalTransition.direction === 'to-game'
                      ? 'radial-gradient(circle at 50% 42%, rgba(251,191,36,0.34) 0%, rgba(234,88,12,0.22) 45%, rgba(12,10,9,0.72) 100%)'
                      : 'radial-gradient(circle at 50% 35%, rgba(253,224,71,0.28) 0%, rgba(180,83,9,0.2) 48%, rgba(12,10,9,0.68) 100%)',
                  animation: 'carameloPortalSweep 460ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
                }}
              />
              {[
                { l: '18%', t: '62%', s: 7, d: '0ms' },
                { l: '32%', t: '46%', s: 9, d: '35ms' },
                { l: '48%', t: '58%', s: 6, d: '15ms' },
                { l: '64%', t: '42%', s: 10, d: '45ms' },
                { l: '79%', t: '56%', s: 7, d: '25ms' },
              ].map((m, idx) => (
                <span
                  key={idx}
                  className="absolute rounded-full bg-amber-300/85 shadow-[0_0_12px_rgba(253,224,71,0.9)]"
                  style={{
                    left: m.l,
                    top: m.t,
                    width: `${m.s}px`,
                    height: `${m.s}px`,
                    animation: `carameloPortalMote 430ms ease-out ${m.d} forwards`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Global Portal Navbar */}
          {activeView !== 'game' && (
            <div
              style={{
                transition: 'opacity 210ms ease, transform 230ms cubic-bezier(0.22, 1, 0.36, 1)',
                opacity: portalTransition.active && portalTransition.phase === 'out' ? 0 : 1,
                transform:
                  portalTransition.active && portalTransition.phase === 'out'
                    ? 'translateY(-10px)'
                    : 'translateY(0)',
              }}
            >
              <Navbar
                currentUser={currentUser}
                activeView={activeView}
                onNavigate={handleNavigate}
                onOpenAuth={() => setShowAuthModal(true)}
                onLogout={handleLogout}
                onOpenMarketing={() => setShowMarketingModal(true)}
                onOpenPWAInstall={() => setShowPWAInstallModal(true)}
              />
            </div>
          )}

          {/* Main Content Views com Movimento Suave de Câmera e Profundidade */}
          <main
            style={{
              transition:
                portalTransition.phase === 'out'
                  ? 'opacity 180ms ease-in, transform 195ms cubic-bezier(0.4, 0, 1, 1), filter 180ms ease-in'
                  : 'opacity 260ms ease-out, transform 280ms cubic-bezier(0.22, 1, 0.36, 1), filter 240ms ease-out',
              opacity: portalTransition.active && portalTransition.phase === 'out' ? 0 : 1,
              transform:
                portalTransition.active && portalTransition.phase === 'out'
                  ? portalTransition.direction === 'to-game'
                    ? 'scale(1.04) translateY(-6px)'
                    : 'scale(0.97) translateY(8px)'
                  : 'scale(1) translateY(0)',
              filter:
                portalTransition.active && portalTransition.phase === 'out'
                  ? 'blur(4px) brightness(1.08)'
                  : 'blur(0px) brightness(1)',
              willChange: portalTransition.active ? 'transform, opacity, filter' : undefined,
            }}
            className={`flex-1 w-full max-w-full overflow-x-hidden flex flex-col ${activeView === 'game' ? 'h-full overflow-hidden' : 'min-h-0 pb-24 md:pb-6'}`}
          >
            {activeView === 'home' && (
              <HomePage
                currentUser={currentUser}
                onNavigate={(v) => {
                  setOpenSettingsInGame(false);
                  handleNavigate(v);
                }}
                onOpenAuth={() => setShowAuthModal(true)}
                onSelectPlayer={handleSelectPlayer}
                onOpenMarketing={() => setShowMarketingModal(true)}
                onOpenSettings={() => {
                  setOpenSettingsInGame(true);
                  handleNavigate('game');
                }}
                onOpenPWAInstall={() => setShowPWAInstallModal(true)}
                onOpenLegalModal={handleOpenLegalModal}
              />
            )}

            {activeView === 'shop' && (
              <SkinStorePage
                currentUser={currentUser}
                onNavigate={handleNavigate}
                onOpenAuth={() => setShowAuthModal(true)}
              />
            )}

            {activeView === 'leaderboard' && (
              <LeaderboardView onSelectPlayer={handleSelectPlayer} />
            )}

            {activeView === 'profile' && currentUser && (
              <PlayerProfileView
                user={currentUser}
                onOpenAuth={() => setShowAuthModal(true)}
                onShareProfile={(u) => setInspectedPlayer(u)}
                onNavigate={handleNavigate}
              />
            )}

            {activeView === 'game' && (
              <div
                className="w-full h-full sm:max-w-7xl sm:mx-auto p-0 sm:px-2 sm:py-1 flex flex-col items-center justify-center flex-1 overflow-hidden"
                style={{ touchAction: 'none', overscrollBehavior: 'none' }}
              >
                <ErrorBoundary
                  fallbackTitle="Opa! Falha ao iniciar o 3D"
                  onReset={() => handleNavigate('home')}
                >
                  <Caramelo3DRunner
                    equippedSkin={equippedSkin}
                    onBackToMenu={() => handleNavigate('home')}
                    startInSettings={openSettingsInGame}
                  />
                </ErrorBoundary>
              </div>
            )}
          </main>

          {/* Corporate Transparency & Legal Footer */}
          {activeView !== 'game' && (
            <Footer
              onOpenLegalModal={handleOpenLegalModal}
              onOpenMarketing={() => setShowMarketingModal(true)}
              onOpenPWAInstall={() => setShowPWAInstallModal(true)}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          const user = storage.getCurrentUser();
          if (user && (user.role === 'admin' || user.role === 'root')) {
            setActiveView('admin');
          }
        }}
      />

      {/* Public Gamer Profile Modal */}
      <PublicGamerProfileModal
        user={inspectedPlayer}
        onClose={() => setInspectedPlayer(null)}
      />

      {/* 📢 Global Ads Manager 3D Marketing Portal Modal */}
      <MarketingPortalModal
        isOpen={showMarketingModal}
        onClose={() => setShowMarketingModal(false)}
      />

      {/* 📱 Global PWA Application Installer Modal */}
      <PWAInstallModal
        isOpen={showPWAInstallModal}
        onClose={() => setShowPWAInstallModal(false)}
      />

      {/* 📜 Global Legal Documentation Modal (LGPD, Terms, Cookies) */}
      <LegalModal
        isOpen={showLegalModal}
        initialTab={legalTab}
        onClose={() => setShowLegalModal(false)}
      />

      {/* 🍪 LGPD Cookie Banner */}
      <CookieBanner onOpenLegalModal={handleOpenLegalModal} />
    </DeviceFrameWrapper>
  );
}
