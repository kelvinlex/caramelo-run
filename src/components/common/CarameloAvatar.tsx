import React from 'react';
import { Skin } from '../../types';

interface CarameloAvatarProps {
  skin?: Skin;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isAnimated?: boolean;
  isBarking?: boolean;
  className?: string;
}

export const CarameloAvatar: React.FC<CarameloAvatarProps> = ({
  skin,
  size = 'md',
  isAnimated = true,
  isBarking = false,
  className = '',
}) => {
  const primaryColor = skin?.corPrimaria || '#D97706'; // Amber 600
  const secondaryColor = skin?.corSecundaria || '#F59E0B'; // Amber 500
  const accessories = skin?.acessorios || {};

  const sizeDimensions = {
    sm: { width: 48, height: 48, viewBox: '0 0 100 100' },
    md: { width: 84, height: 84, viewBox: '0 0 100 100' },
    lg: { width: 130, height: 130, viewBox: '0 0 100 100' },
    xl: { width: 200, height: 200, viewBox: '0 0 100 100' },
  }[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: sizeDimensions.width, height: sizeDimensions.height }}
    >
      {/* Aura / Glow if cyber or legendary */}
      {accessories.brilho && (
        <div
          className="absolute inset-0 rounded-full blur-xl -z-10 animate-pulse opacity-70"
          style={{ background: accessories.efeitoAura || 'rgba(234, 179, 8, 0.4)' }}
        />
      )}

      <svg
        width={sizeDimensions.width}
        height={sizeDimensions.height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md transition-transform"
      >
        {/* Tail (Wagging) */}
        <path
          d="M 22 62 Q 8 50 14 36"
          stroke={primaryColor}
          strokeWidth="6"
          strokeLinecap="round"
          className={isAnimated ? 'animate-tail origin-bottom-left' : ''}
        />

        {/* Dog Body */}
        <ellipse cx="46" cy="66" rx="28" ry="20" fill={primaryColor} />
        {/* Underbelly highlight */}
        <ellipse cx="46" cy="71" rx="20" ry="12" fill={secondaryColor} />

        {/* Back Legs */}
        <rect x="24" y="70" width="8" height="18" rx="4" fill={primaryColor} />
        <rect x="22" y="84" width="12" height="6" rx="3" fill={secondaryColor} />

        {/* Front Legs */}
        <rect x="58" y="70" width="8" height="18" rx="4" fill={primaryColor} />
        <rect x="56" y="84" width="12" height="6" rx="3" fill={secondaryColor} />

        {/* Collar */}
        {accessories.coleira === 'dourada' && (
          <path d="M 52 50 C 60 52 74 54 74 54 L 73 60 C 65 59 51 57 51 57 Z" fill="#EAB308" stroke="#CA8A04" strokeWidth="1" />
        )}
        {accessories.coleira === 'espinhos' && (
          <path d="M 52 50 C 60 52 74 54 74 54 L 73 60 C 65 59 51 57 51 57 Z" fill="#334155" stroke="#0F172A" strokeWidth="1" />
        )}
        {(!accessories.coleira || accessories.coleira === 'vermelha') && (
          <path d="M 52 50 C 60 52 74 54 74 54 L 73 60 C 65 59 51 57 51 57 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
        )}
        {/* Collar Tag / Medalha de Osso */}
        <circle cx="63" cy="58" r="3.5" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />

        {/* Dog Head */}
        <circle cx="70" cy="40" r="18" fill={primaryColor} />
        <ellipse cx="78" cy="44" rx="10" ry="7" fill={secondaryColor} />

        {/* Left Ear (Alert floppy) */}
        <path d="M 60 28 C 55 18 50 24 55 35 Z" fill="#92400E" />

        {/* Right Ear (Perked up Brazilian Vira-Lata style) */}
        <path d="M 74 25 C 78 12 85 18 80 32 Z" fill="#92400E" />

        {/* Capuz Cria / Hat */}
        {accessories.chapeu === 'capuz' && (
          <path
            d="M 54 36 C 54 18 86 16 88 36 C 88 42 82 46 72 46 C 60 46 54 42 54 36 Z"
            fill="#1E293B"
            stroke="#0F172A"
            strokeWidth="1.5"
          />
        )}
        {accessories.chapeu === 'coroa' && (
          <path
            d="M 60 24 L 64 12 L 70 20 L 76 12 L 80 24 Z"
            fill="#FACC15"
            stroke="#CA8A04"
            strokeWidth="1.5"
          />
        )}
        {accessories.chapeu === 'bone' && (
          <path
            d="M 58 26 C 64 18 80 18 86 28 L 94 30 L 84 34 Z"
            fill="#16A34A"
            stroke="#15803D"
            strokeWidth="1"
          />
        )}

        {/* Snout / Focinho */}
        <ellipse cx="86" cy="42" rx="3.5" ry="2.5" fill="#1C1917" />

        {/* Mouth (Barking or smiling) */}
        {isBarking ? (
          <path d="M 78 47 Q 84 55 88 47 Z" fill="#DC2626" stroke="#1C1917" strokeWidth="1" />
        ) : (
          <path d="M 80 46 Q 84 50 87 45" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" />
        )}

        {/* Eye */}
        <circle cx="70" cy="36" r="3" fill="#1C1917" />
        <circle cx="71" cy="35" r="1" fill="#FFFFFF" />

        {/* Glasses / Juliete or Cyber Visor */}
        {accessories.tipoOculos === 'juliete' && (
          <g>
            {/* Bridge */}
            <path d="M 63 34 Q 74 31 82 34" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
            {/* Left Lens Furta-cor */}
            <ellipse cx="68" cy="36" rx="6" ry="4.5" fill="url(#julieteGrad)" stroke="#1E293B" strokeWidth="1" />
            {/* Right Lens */}
            <ellipse cx="79" cy="37" rx="6.5" ry="5" fill="url(#julieteGrad)" stroke="#1E293B" strokeWidth="1" />
          </g>
        )}

        {accessories.tipoOculos === 'cibernetico' && (
          <g>
            <path
              d="M 62 32 L 85 34 L 83 40 L 64 38 Z"
              fill="#06B6D4"
              fillOpacity="0.8"
              stroke="#0891B2"
              strokeWidth="1.5"
            />
            <circle cx="78" cy="36" r="1.5" fill="#FFFFFF" className="animate-ping" />
          </g>
        )}

        {/* Gradients */}
        <defs>
          <linearGradient id="julieteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
