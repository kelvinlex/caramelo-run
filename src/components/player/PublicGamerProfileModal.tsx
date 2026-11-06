import React, { useState } from 'react';
import { X, Trophy, Share2, Check, Award, Flame, Sparkles } from 'lucide-react';
import { User, Skin } from '../../types';
import { storage } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import { CarameloAvatar } from '../common/CarameloAvatar';

interface PublicGamerProfileModalProps {
  user: User | null;
  onClose: () => void;
}

export const PublicGamerProfileModal: React.FC<PublicGamerProfileModalProps> = ({ user, onClose }) => {
  const [copied, setCopied] = useState(false);
  if (!user) return null;

  const skins = storage.getSkins();
  const equippedSkin = skins.find((s) => s.id === user.skinEquipadaId) || skins[0];

  const handleCopyLink = () => {
    sound.playClick();
    const url = `${window.location.origin}/?player=${encodeURIComponent(user.nickname)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-stone-900 border-2 border-amber-500/60 rounded-3xl p-6 md:p-8 shadow-2xl text-stone-100 overflow-hidden">
        {/* Ambient light - High-performance radial gradient */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full ambient-glow-amber pointer-events-none" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-stone-400 hover:text-white rounded-full bg-stone-800/80 hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header matching ASCII */}
        <div className="mb-4">
          <span className="text-xs uppercase tracking-wider text-amber-400 font-bold font-fun block mb-0.5">
            👤 PERFIL PÚBLICO EM DESTAQUE
          </span>
          <h3 className="text-2xl font-extrabold text-white font-fun">
            @{user.nickname}
          </h3>
        </div>

        {/* Profile Card Box matching ASCII format */}
        <div className="bg-stone-950/90 border border-stone-800 rounded-2xl p-5 md:p-6 mb-5 relative">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Foto da Skin */}
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-stone-900 rounded-2xl border border-stone-800 shadow-md">
                <CarameloAvatar skin={equippedSkin} size="lg" isAnimated={true} />
              </div>
              <div className="mt-2 text-xs font-bold text-amber-300 font-fun">
                Caramelo Equipado:
              </div>
              <div className="text-xs text-stone-300 font-semibold italic">
                *{equippedSkin.nome}*
              </div>
            </div>

            {/* Estatísticas Gerais */}
            <div className="flex-1 w-full space-y-2.5 text-xs sm:text-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 border-b border-stone-800 pb-1">
                Estatísticas Gerais na Quebrada:
              </h4>

              <div className="flex items-center justify-between">
                <span className="text-stone-400">• Maior Pontuação:</span>
                <span className="font-bold text-amber-400 font-mono text-sm">
                  {user.stats.maiorPontuacao.toLocaleString('pt-BR')} pts
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-400">• Motoqueiros Mordidos:</span>
                <span className="font-bold text-red-400 font-mono text-sm">
                  {user.stats.motoqueirosMordidos.toLocaleString('pt-BR')} canelas
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-400">• Conquistas Desbloqueadas:</span>
                <span className="font-bold text-stone-200 font-mono">
                  {user.stats.conquistasDesbloqueadas} / {user.stats.totalConquistas}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-stone-400">• Status na Quebrada:</span>
                <span className="font-bold text-yellow-300 font-fun">
                  {user.stats.statusQuebrada}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <span className="text-xs text-stone-500 font-mono">
            ID: {user.id} • Vira-Lata Run 2026
          </span>

          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer font-fun shadow-lg active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-stone-950" /> : <Share2 className="w-4 h-4 text-stone-950" />}
            <span>{copied ? 'Link Copiado!' : 'Copiar Link do Perfil Gamer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
