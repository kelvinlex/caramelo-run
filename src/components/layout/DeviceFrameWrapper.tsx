import React, { useEffect } from 'react';

interface DeviceFrameWrapperProps {
  children: React.ReactNode;
  activeView?: string;
}

export const DeviceFrameWrapper: React.FC<DeviceFrameWrapperProps> = ({ children, activeView }) => {
  // Gerencia o transbordo e rolagem da página entre o modo Jogo 3D e o Portal Web
  useEffect(() => {
    if (activeView === 'game') {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100dvh';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
    }

    const preventOverscroll = (e: TouchEvent) => {
      // Se estiver fora do jogo (Home, Leaderboard, Perfil), permite toque e rolagem naturais
      if (activeView !== 'game') {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && (target.closest('button') || target.closest('a') || target.closest('.overflow-y-auto') || target.closest('input'))) {
        return; // Permite toque normal em botões, links e inputs
      }
      // Impede o balanço elástico da janela do navegador durante o jogo 3D
      if (e.touches.length > 0 && e.cancelable) {
        e.preventDefault();
      }
    };

    window.addEventListener('touchmove', preventOverscroll, { passive: false });
    return () => {
      window.removeEventListener('touchmove', preventOverscroll);
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [activeView]);

  if (activeView === 'game') {
    return (
      <div
        className="fixed inset-0 w-full h-full bg-stone-950 text-stone-100 flex flex-col overflow-hidden select-none"
        style={{
          touchAction: 'none',
          overscrollBehavior: 'none',
          height: '100dvh',
        }}
      >
        <div
          className="flex-1 w-full flex flex-col relative z-10 max-w-full overflow-hidden"
          style={{ touchAction: 'none' }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-stone-950 text-stone-100 flex flex-col relative overflow-x-hidden">
      {/* Background ambient lighting - High performance radial gradients with zero blur filter overhead */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/15 via-stone-950 to-stone-950 pointer-events-none z-0" style={{ transform: 'translateZ(0)' }} />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full ambient-glow-amber pointer-events-none z-0" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 rounded-full ambient-glow-yellow pointer-events-none z-0" />

      {/* Conteúdo Real da Aplicação */}
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-full">
        {children}
      </div>
    </div>
  );
};

