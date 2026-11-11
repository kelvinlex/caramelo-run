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
import { CartoonSpiralTransition } from './components/common/CartoonSpiralTransition';

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
    }, 260);

    navDoneTimerRef.current = window.setTimeout(() => {
      setPortalTransition((prev) => ({ ...prev, active: false }));
      navDoneTimerRef.current = null;
    }, 620);
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
          {/* Transição em Espiral Cartoon (Redemoinho HQ Verde e Amarelo) entre Entrada e Menu Principal */}
          <CartoonSpiralTransition
            active={portalTransition.active}
            phase={portalTransition.phase}
          />

          {/* Global Portal Navbar */}
          {activeView !== 'game' && (
            <div
              style={{
                transition: 'opacity 320ms ease, transform 380ms cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: portalTransition.active && portalTransition.phase === 'out' ? 0 : 1,
                transform:
                  portalTransition.active && portalTransition.phase === 'out'
                    ? 'scale(0.86) rotate(-8deg)'
                    : 'scale(1) rotate(0deg)',
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

          {/* Main Content Views com Deformação Suave de Redemoinho na Entrada para o Menu */}
          <main
            style={{
              transition:
                portalTransition.phase === 'out'
                  ? 'opacity 390ms ease-in, transform 420ms cubic-bezier(0.55, 0.055, 0.675, 0.19), filter 380ms ease-in'
                  : 'opacity 380ms ease-out, transform 460ms cubic-bezier(0.16, 1, 0.3, 1), filter 340ms ease-out',
              opacity: portalTransition.active && portalTransition.phase === 'out' ? 0 : 1,
              transform:
                portalTransition.active && portalTransition.phase === 'out'
                  ? portalTransition.direction === 'to-game'
                    ? 'scale(0.58) rotate(24deg)'
                    : 'scale(0.68) rotate(-18deg)'
                  : undefined,
              filter:
                portalTransition.active && portalTransition.phase === 'out'
                  ? 'blur(5px) saturate(1.3)'
                  : undefined,
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
