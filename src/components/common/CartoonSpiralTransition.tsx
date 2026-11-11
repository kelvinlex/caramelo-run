import React from 'react';

interface CartoonSpiralTransitionProps {
  active: boolean;
  phase: 'out' | 'in';
}

/**
 * Transição Cinematográfica Suave (Véu de Luz Âmbar-Dourado & Zoom Elegante)
 * Substitui a antiga transição de espiral por uma passagem fluida, limpa e cinematográfica
 * entre a tela inicial e o menu do jogo.
 */
export const CartoonSpiralTransition: React.FC<CartoonSpiralTransitionProps> = ({
  active,
  phase,
}) => {
  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[120] pointer-events-none overflow-hidden flex items-center justify-center select-none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes smoothGoldenFadeOut {
          0% {
            opacity: 0;
            transform: scale(1.04);
            backdrop-filter: blur(0px);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            backdrop-filter: blur(10px);
          }
        }

        @keyframes smoothGoldenRevealMenu {
          0% {
            opacity: 1;
            transform: scale(1);
            backdrop-filter: blur(10px);
          }
          100% {
            opacity: 0;
            transform: scale(1.03);
            backdrop-filter: blur(0px);
          }
        }

        @keyframes smoothShimmerSweep {
          0% {
            transform: translateX(-45%) rotate(-12deg);
            opacity: 0;
          }
          45% {
            opacity: 0.55;
          }
          100% {
            transform: translateX(45%) rotate(-12deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Camada principal de transição suave com gradiente quente do entardecer e desfoque */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.22) 0%, rgba(45, 18, 6, 0.88) 58%, rgba(12, 6, 3, 0.96) 100%)',
          animation:
            phase === 'out'
              ? 'smoothGoldenFadeOut 280ms cubic-bezier(0.22, 1, 0.36, 1) forwards'
              : 'smoothGoldenRevealMenu 380ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        }}
      >
        {/* Brilho diagonal suave de cinema atravessando a tela */}
        <div
          className="absolute -inset-full pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(254, 240, 138, 0.18) 50%, transparent 100%)',
            animation: 'smoothShimmerSweep 420ms ease-out forwards',
          }}
        />
      </div>
    </div>
  );
};
