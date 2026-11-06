import React, { useState, useEffect } from 'react';
import { Check, Camera, Sparkles } from 'lucide-react';
import { storage } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import { SteelCornerBrackets, OctagonCloseButton } from '../common/CartoonWoodUI';

interface ProfilePhotoSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoUrl?: string;
  onSelectPhoto: (photoUrl: string) => void;
}

export const ProfilePhotoSelectorModal: React.FC<ProfilePhotoSelectorModalProps> = ({
  isOpen,
  onClose,
  currentPhotoUrl,
  onSelectPhoto,
}) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string>(currentPhotoUrl || '');
  const [isLoading, setIsLoading] = useState(true);

  // Carrega automaticamente o catálogo de fotos via manifest dinâmico
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetch('/profile_photos_manifest.json')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPhotos(data);
          if (!selectedPhoto && currentPhotoUrl) {
            setSelectedPhoto(currentPhotoUrl);
          } else if (!selectedPhoto && data.length > 0) {
            setSelectedPhoto(data[0]);
          }
        }
      })
      .catch((err) => {
        console.error('Erro ao ler manifest de fotos de perfil:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, currentPhotoUrl]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedPhoto) return;
    sound.playPowerup();
    onSelectPhoto(selectedPhoto);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-2xl cartoon-wood-board p-5 sm:p-7 shadow-[0_20px_40px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]">
        <SteelCornerBrackets size="md" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#543015] z-10 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl cartoon-btn-gold text-[#3d2002] flex items-center justify-center shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white cartoon-title-3d leading-tight flex items-center gap-1.5">
                <span>Escolha sua Foto de Perfil</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </h3>
              <p className="text-xs text-amber-100 font-medium">
                Selecione uma foto da galeria para exibir no seu perfil e no ranking!
              </p>
            </div>
          </div>

          <OctagonCloseButton onClick={onClose} className="w-9 h-9 sm:w-10 sm:h-10" />
        </div>

        {/* Selected Preview Highlight */}
        <div className="py-3.5 flex items-center justify-between gap-4 border-b-2 border-[#543015] z-10 relative">
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-[#ffbe3b] shadow-[0_0_15px_rgba(251,191,36,0.5)] flex-shrink-0 bg-zinc-950">
              {selectedPhoto ? (
                <img
                  src={selectedPhoto}
                  alt="Foto Selecionada"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🐕</div>
              )}
            </div>
            <div>
              <div className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Foto Atual Selecionada
              </div>
              <div className="text-xs text-amber-100 truncate max-w-[200px] sm:max-w-xs font-mono font-bold">
                {selectedPhoto ? selectedPhoto.split('/').pop() : 'Nenhuma selecionada'}
              </div>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={!selectedPhoto}
            className="px-5 py-2.5 sm:px-6 sm:py-3 cartoon-btn-gold text-[#3d2002] font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>SALVAR FOTO</span>
          </button>
        </div>

        {/* Grid de Fotos de Perfil (Cartoon Navy Panel) */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 z-10 relative">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-amber-200 font-black">
              Carregando galeria de fotos de perfil...
            </div>
          ) : photos.length === 0 ? (
            <div className="py-12 text-center text-xs text-amber-200 font-black">
              Nenhuma foto encontrada na galeria.
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2.5 sm:gap-3.5">
              {photos.map((photoUrl, idx) => {
                const isSelected = selectedPhoto === photoUrl;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSelectedPhoto(photoUrl);
                    }}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group bg-zinc-950 ${
                      isSelected
                        ? 'border-[#ffbe3b] ring-4 ring-amber-400/60 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                        : 'border-[#2b3e58] hover:border-slate-300 hover:scale-105 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={photoUrl}
                      alt={`Perfil ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-amber-500/25 backdrop-blur-[0.5px] flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center shadow-lg">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t-2 border-[#543015] text-center text-[11px] text-amber-200 font-bold z-10 relative">
          Dica: Escolha a foto do seu Caramelo preferido para se destacar na quebrada!
        </div>
      </div>
    </div>
  );
};
