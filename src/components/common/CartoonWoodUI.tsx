import React from 'react';

/**
 * 🔩 3D Metallic Rivet Dot
 */
export const SteelRivet: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`cartoon-rivet ${className}`} aria-hidden="true" />
);

/**
 * 🪙 3D Cartoon Gold Coin SVG Icon
 */
export const GoldCoinIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" className={`${className} shrink-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.75)]`} aria-hidden="true">
    <defs>
      <linearGradient id="coinOuter" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="coinInner" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#fde047" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="14" fill="url(#coinOuter)" stroke="#78350f" strokeWidth="2.2" />
    <circle cx="16" cy="16" r="10" fill="url(#coinInner)" stroke="#92400e" strokeWidth="1.5" />
    <path
      d="M16 9.5L17.9 13.5L22.2 14.1L19.1 17.1L19.8 21.4L16 19.3L12.2 21.4L12.9 17.1L9.8 14.1L14.1 13.5Z"
      fill="#fef9c3"
      stroke="#92400e"
      strokeWidth="1"
    />
  </svg>
);

/**
 * 🔩 Beveled Blue-Steel Corner Brackets with 3D Rivets (4 corners)
 */
export const SteelCornerBrackets: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const dim =
    size === 'sm'
      ? 'w-5 h-5'
      : size === 'lg'
      ? 'w-9 h-9 sm:w-11 sm:h-11'
      : 'w-7 h-7 sm:w-8 sm:h-8';

  const BracketSVG = () => (
    <svg viewBox="0 0 44 44" className="w-full h-full drop-shadow-[0_3px_4px_rgba(0,0,0,0.75)]">
      <defs>
        <linearGradient id="steelGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="45%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>
      {/* L-shaped beveled golden-bronze plate */}
      <path
        d="M2 8 C2 4, 4 2, 8 2 L38 2 L34 15 L15 15 L15 34 L2 38 Z"
        fill="url(#steelGrad)"
        stroke="#3b1304"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Top specular highlight */}
      <path
        d="M5 7 L34 5"
        stroke="#fef9c3"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* 3 Golden Rivets */}
      <circle cx="9" cy="9" r="3" fill="#fef08a" stroke="#451a03" strokeWidth="1.2" />
      <circle cx="25" cy="8.5" r="2.6" fill="#fef08a" stroke="#451a03" strokeWidth="1.2" />
      <circle cx="8.5" cy="25" r="2.6" fill="#fef08a" stroke="#451a03" strokeWidth="1.2" />
    </svg>
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-visible z-20 ${className}`} aria-hidden="true">
      <div className={`absolute -top-1.5 -left-1.5 ${dim}`}>
        <BracketSVG />
      </div>
      <div className={`absolute -top-1.5 -right-1.5 ${dim} scale-x-[-1]`}>
        <BracketSVG />
      </div>
      <div className={`absolute -bottom-1.5 -left-1.5 ${dim} scale-y-[-1]`}>
        <BracketSVG />
      </div>
      <div className={`absolute -bottom-1.5 -right-1.5 ${dim} scale-x-[-1] scale-y-[-1]`}>
        <BracketSVG />
      </div>
    </div>
  );
};

/**
 * ❌ Octagonal Red & Golden-Bronze Close Button
 */
export const OctagonCloseButton: React.FC<{
  onClick: () => void;
  title?: string;
  className?: string;
}> = ({ onClick, title = 'Fechar', className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`group relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0 ${className}`}
  >
    <svg viewBox="0 0 56 56" className="w-full h-full drop-shadow-[0_5px_8px_rgba(0,0,0,0.8)]">
      <defs>
        <linearGradient id="closeSteel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="closeRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="45%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#9f1239" />
        </linearGradient>
      </defs>
      {/* Outer Golden-Bronze Octagon */}
      <polygon
        points="17,3 39,3 53,17 53,39 39,53 17,53 3,39 3,17"
        fill="url(#closeSteel)"
        stroke="#3b1304"
        strokeWidth="3"
      />
      {/* Inner Red Beveled Octagon */}
      <polygon
        points="20,9 36,9 47,20 47,36 36,47 20,47 9,36 9,20"
        fill="url(#closeRed)"
        stroke="#4c0519"
        strokeWidth="2.5"
      />
      {/* White X Cross */}
      <path
        d="M21 21 L35 35 M35 21 L21 35"
        stroke="#ffffff"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
    </svg>
  </button>
);

/**
 * 🛡️ Octagonal 3D Header Emblem Badge (Left side of modal headers)
 */
export const OctagonIconBadge: React.FC<{
  children: React.ReactNode;
  variant?: 'gold' | 'steel' | 'blue';
  className?: string;
}> = ({ children, variant = 'gold', className = '' }) => {
  const outerColors =
    variant === 'steel'
      ? ['#fbbf24', '#b45309', '#5c240a']
      : variant === 'blue'
      ? ['#7dd3fc', '#0284c7', '#0c4a6e']
      : ['#fde047', '#f59e0b', '#b45309'];

  return (
    <div className={`relative w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 60 60" className="absolute inset-0 w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.75)]">
        <defs>
          <linearGradient id={`badgeGrad_${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={outerColors[0]} />
            <stop offset="55%" stopColor={outerColors[1]} />
            <stop offset="100%" stopColor={outerColors[2]} />
          </linearGradient>
        </defs>
        <polygon
          points="18,3 42,3 57,18 57,42 42,57 18,57 3,42 3,18"
          fill={`url(#badgeGrad_${variant})`}
          stroke="#291004"
          strokeWidth="3"
        />
        <polygon
          points="21,9 39,9 51,21 51,39 39,51 21,51 9,39 9,21"
          fill="#23120b"
          stroke="#451a03"
          strokeWidth="2"
        />
      </svg>
      <div className="relative z-10 flex items-center justify-center text-xl sm:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
        {children}
      </div>
    </div>
  );
};

/**
 * 💰 Blue-Steel Coin Counter Pill
 */
export const SteelCoinPill: React.FC<{
  amount: number | string;
  className?: string;
}> = ({ amount, className = '' }) => (
  <div className={`cartoon-steel-pill px-3 sm:px-4 py-1.5 rounded-xl flex items-center gap-2 shrink-0 ${className}`}>
    <GoldCoinIcon className="w-5 h-5 sm:w-6 sm:h-6" />
    <span className="font-fun font-extrabold text-sm sm:text-lg text-white tracking-wide tabular-nums cartoon-text-outline">
      {typeof amount === 'number' ? amount.toLocaleString('pt-BR') : amount}
    </span>
  </div>
);
