import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, Camera } from 'lucide-react';
import { sound } from '../../services/soundEffects';

interface ProfilePhotoSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoUrl?: string;
  onSelectPhoto: (photoUrl: string) => void;
  extraPhotos?: string[];
}

const BUILTIN_PROFILE_PHOTOS: string[] = [
  '/profile_photos/image_20261007_113048.jpg',
  '/profile_photos/image_20261007_113132.jpg',
  '/profile_photos/image_20261007_113133.jpg',
  '/profile_photos/image_20261007_113144.jpg',
  '/profile_photos/image_20261007_113226_2.jpg',
  '/profile_photos/image_20261007_113235.jpg',
  '/profile_photos/image_20261007_113237.jpg',
  '/profile_photos/image_20261007_113241.jpg',
  '/profile_photos/image_20261007_113044 - Copia.webp',
  '/profile_photos/image_20261007_113045 - Copia.webp',
  '/profile_photos/image_20261007_113045_1 - Copia.webp',
  '/profile_photos/image_20261007_113046 - Copia.webp',
  '/profile_photos/image_20261007_113046_1 - Copia.webp',
  '/profile_photos/image_20261007_113048 - Copia.jpg',
  '/profile_photos/image_20261007_113053 - Copia.jpg',
  '/profile_photos/image_20261007_113054 - Copia.jpg',
  '/profile_photos/image_20261007_113055 - Copia.jpg',
  '/profile_photos/image_20261007_113056 - Copia.jpg',
  '/profile_photos/image_20261007_113133 - Copia.jpg',
  '/profile_photos/image_20261007_113134_1 - Copia.jpg',
  '/profile_photos/image_20261007_113134_2 - Copia.jpg',
  '/profile_photos/image_20261007_113135 - Copia.jpg',
  '/profile_photos/image_20261007_113136 - Copia.jpg',
  '/profile_photos/image_20261007_113140 - Copia.jpg',
  '/profile_photos/image_20261007_113145 - Copia.jpg',
  '/profile_photos/image_20261007_113224 - Copia.jpg',
  '/profile_photos/image_20261007_113225_1 - Copia.jpg',
  '/profile_photos/image_20261007_113226 - Copia.jpg',
  '/profile_photos/image_20261007_113226_1 - Copia.jpg',
];

export const ProfilePhotoSelectorModal: React.FC<ProfilePhotoSelectorModalProps> = ({
  isOpen,
  onClose,
  currentPhotoUrl,
  onSelectPhoto,
  extraPhotos = [],
}) => {
  const [photos, setPhotos] = useState<string[]>(BUILTIN_PROFILE_PHOTOS);
  const [selected, setSelected] = useState<string>(
    currentPhotoUrl || BUILTIN_PROFILE_PHOTOS[0]
  );

  useEffect(() => {
    if (isOpen) {
      const merged = Array.from(
        new Set([...extraPhotos.filter(Boolean), ...BUILTIN_PROFILE_PHOTOS])
      );
      setPhotos(merged);
      setSelected(currentPhotoUrl || merged[0] || BUILTIN_PROFILE_PHOTOS[0]);

      fetch('/profile_photos_manifest.json')
        .then((res) => res.json())
        .then((data: string[]) => {
          if (Array.isArray(data) && data.length > 0) {
            const allUnique = Array.from(
              new Set([...extraPhotos.filter(Boolean), ...BUILTIN_PROFILE_PHOTOS, ...data])
            );
            setPhotos(allUnique);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, currentPhotoUrl, extraPhotos]);

  if (!isOpen) return null;

  const handleChoosePhoto = (photo: string) => {
    sound.playClick();
    setSelected(photo);
    // Atualiza imediatamente a foto de perfil ao escolher!
    onSelectPhoto(photo);
  };

  const handleSaveAndClose = () => {
    sound.playClick();
    if (selected) {
      onSelectPhoto(selected);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl cartoon-wood-board rounded-[30px] border-[3px] border-[#fbbf24] shadow-[0_24px_65px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-[#451a03] bg-gradient-to-r from-[#2c1206] via-[#3d1b0a] to-[#2c1206] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-[2.5px] border-[#fde047] bg-[#180c05] flex items-center justify-center shadow-lg flex-shrink-0">
              {selected ? (
                <img
                  src={selected.startsWith('data:') ? selected : encodeURI(selected)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-6 h-6 text-[#fde047]" />
              )}
            </div>
            <div>
              <h2
                className="text-lg sm:text-2xl font-fun font-black text-[#fef08a] uppercase tracking-wider flex items-center gap-2 leading-none"
                style={{
                  paintOrder: 'stroke fill',
                  WebkitTextStroke: '3px #1f0901',
                  textShadow: '0 2px 0 #1f0901',
                }}
              >
                ESCOLHER FOTO DE PERFIL
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              </h2>
              <p className="text-[11px] sm:text-xs text-amber-200/90 font-bold mt-1">
                Clique em qualquer ícone abaixo — ele aparece na hora no seu perfil!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-10 h-10 rounded-xl cartoon-btn-red flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

        {/* Content — Grade de Ícones de Perfil */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 garage-custom-scrollbar bg-[#140904]/90">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-3.5">
            {photos.map((photo, index) => {
              const isSelected = selected === photo;
              const safeSrc = photo.startsWith('data:') ? photo : encodeURI(photo);
              return (
                <button
                  key={`${photo}-${index}`}
                  type="button"
                  onClick={() => handleChoosePhoto(photo)}
                  onDoubleClick={handleSaveAndClose}
                  className={`group relative aspect-square rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'ring-4 ring-[#4ade80] scale-[1.04] shadow-[0_0_24px_rgba(74,222,128,0.65)] z-10 border-2 border-white'
                      : 'border-2 border-[#fbbf24]/45 hover:border-[#fde047] hover:scale-[1.03] opacity-90 hover:opacity-100'
                  }`}
                >
                  <img
                    src={safeSrc}
                    alt={`Avatar ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 bg-[#271206]"
                    loading="eager"
                  />

                  <div
                    className={`absolute inset-0 transition-opacity duration-200 ${
                      isSelected
                        ? 'bg-emerald-500/15 opacity-100'
                        : 'bg-black/25 opacity-0 group-hover:opacity-100'
                    }`}
                  />

                  {isSelected && (
                    <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#22c55e] border-2 border-[#052e16] text-white flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 stroke-[3.5]" />
                    </div>
                  )}

                  <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[9px] font-black text-[#fef08a] border border-amber-400/40">
                    #{index + 1}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t-2 border-[#451a03] bg-[#241007] flex items-center justify-between gap-3">
          <div className="text-xs font-bold text-amber-200/90 hidden sm:block">
            Foto selecionada:{' '}
            <span className="text-[#4ade80] font-black">
              #{Math.max(1, photos.indexOf(selected) + 1)} (Aplicada!)
            </span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl cartoon-btn-green font-fun font-black text-sm uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              CONFIRMAR FOTO DE PERFIL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
