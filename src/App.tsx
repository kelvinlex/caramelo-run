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
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div className="min-h-full bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950 flex-1">
          {/* Global Portal Navbar */}
          {activeView !== 'game' && (
            <Navbar
              currentUser={currentUser}
              activeView={activeView}
              onNavigate={handleNavigate}
              onOpenAuth={() => setShowAuthModal(true)}
              onLogout={handleLogout}
              onOpenMarketing={() => setShowMarketingModal(true)}
              onOpenPWAInstall={() => setShowPWAInstallModal(true)}
            />
          )}

          {/* Main Content Views */}
          <main className={`flex-1 w-full max-w-full overflow-x-hidden flex flex-col ${activeView === 'game' ? 'h-full overflow-hidden' : 'min-h-0 pb-24 md:pb-6'}`}>
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
