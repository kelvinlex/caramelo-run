import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  Link as LinkIcon,
  Eye,
  RefreshCw,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Camera,
  Layers,
  CheckCircle2,
  Pin,
  RotateCcw,
  Target,
  Gamepad2
} from 'lucide-react';
import { storage } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import { GameOverImage } from '../../types';

export const GameOverImagesTab: React.FC = () => {
  const [images, setImages] = useState<GameOverImage[]>([]);
  const [pinnedId, setPinnedId] = useState<string | null>(storage.getPinnedGameOverImageId());
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<GameOverImage | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [activeInputType, setActiveInputType] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [imageTitle, setImageTitle] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load images and pinned state from storage
  const loadImages = () => {
    setImages(storage.getGameOverImages());
    setPinnedId(storage.getPinnedGameOverImageId());
  };

  useEffect(() => {
    loadImages();
    const unsubscribe = storage.subscribe(() => {
      loadImages();
    });
    return unsubscribe;
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggle Pin for Game Over Test
  const handleTogglePin = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sound.playClick();

    if (pinnedId === id) {
      storage.setPinnedGameOverImageId(null);
      setPinnedId(null);
      triggerToast('🎲 Imagem desafixada! O Game Over voltou a sortear todas as imagens aleatoriamente.');
    } else {
      storage.setPinnedGameOverImageId(id);
      setPinnedId(id);
      sound.playWin();
      triggerToast('🎯 Imagem FIXADA! Ela agora aparecerá SEMPRE na tela de Game Over para você testar no jogo.');
    }
  };

  // Process and compress image file before saving
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }

    setIsProcessingFile(true);
    setFormError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) {
        setIsProcessingFile(false);
        setFormError('Erro ao carregar a imagem.');
        return;
      }

      // Compress using canvas to prevent exceeding localStorage limits
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setImageUrl(compressed);
          if (!imageTitle) {
            const fileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            setImageTitle(fileName);
          }
        } else {
          setImageUrl(src);
        }
        setIsProcessingFile(false);
      };
      img.onerror = () => {
        setIsProcessingFile(false);
        setFormError('Arquivo de imagem inválido ou corrompido.');
      };
      img.src = src;
    };
    reader.onerror = () => {
      setIsProcessingFile(false);
      setFormError('Erro ao ler o arquivo.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl || !imageUrl.trim()) {
      setFormError('É necessário selecionar uma imagem ou digitar uma URL.');
      return;
    }

    try {
      const newImg = storage.addGameOverImage({
        url: imageUrl.trim(),
        title: imageTitle.trim() || undefined,
      });
      sound.playWin();
      triggerToast('Nova imagem adicionada! Você pode fixá-la agora para testar no jogo.');
      setShowAddModal(false);
      setImageUrl('');
      setImageTitle('');
      setFormError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setFormError('Erro ao salvar imagem. O arquivo pode ser muito grande.');
    }
  };

  const handleDeleteImage = (id: string) => {
    sound.playBark();
    storage.deleteGameOverImage(id);
    setConfirmDeleteId(null);
    triggerToast('Imagem removida com sucesso!');
  };

  const handleResetDefaults = () => {
    if (window.confirm('Deseja restaurar o pacote de imagens padrão do Game Over?')) {
      sound.playClick();
      storage.resetGameOverImages();
      triggerToast('Imagens padrão restauradas!');
    }
  };

  const currentPinnedImage = images.find((img) => img.id === pinnedId);

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 border-2 border-amber-400 text-stone-100 px-5 py-3.5 rounded-2xl shadow-2xl shadow-black/80 flex items-center gap-3 text-xs sm:text-sm font-bold animate-in slide-in-from-bottom-5">
          <div className="w-7 h-7 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center font-black">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="max-w-md">{toastMessage}</span>
        </div>
      )}

      {/* Header & Overview Card */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/40 p-6 rounded-3xl border border-stone-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-100 font-fun tracking-tight flex items-center gap-2">
                Galeria de Game Over da Quebrada
              </h2>
              <p className="text-xs text-stone-400">
                Gerencie as fotos e fixe qualquer imagem para aparecer sempre na tela de derrota para testes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 bg-stone-800/80 hover:bg-stone-700/80 text-stone-300 border border-stone-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:text-white"
            title="Restaurar as 6 fotos originais do jogo"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restaurar Padrões</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setImageUrl('');
              setImageTitle('');
              setFormError(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black text-xs rounded-2xl shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2 cursor-pointer transform hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Adicionar Imagem</span>
          </button>
        </div>
      </div>

      {/* STATUS BANNER: MODO DE TESTE FIXADO vs MODO ALEATÓRIO */}
      {pinnedId && currentPinnedImage ? (
        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-stone-900 border-2 border-amber-400 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-amber-500/10 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-lg shadow-amber-400/30 flex-shrink-0 animate-bounce">
              <Pin className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-400 text-stone-950 uppercase tracking-wider">
                  🎯 MODO DE TESTE ATIVO
                </span>
                <span className="text-xs text-amber-300 font-bold hidden sm:inline">
                  Sempre exibida no Game Over
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-black text-white mt-1">
                A foto <span className="text-amber-300 underline font-black">"{currentPinnedImage.title}"</span> está configurada para aparecer SEMPRE!
              </h4>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Inicie uma corrida e perca para confirmar que esta imagem aparece com sucesso na tela de derrota.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
            <button
              onClick={() => handleTogglePin(pinnedId)}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-amber-300 hover:text-white border border-amber-400/40 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Voltar ao Aleatório</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-400">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎲</span>
            <div>
              <span className="font-extrabold text-stone-200 block">
                Modo Atual: Rotação Aleatória
              </span>
              <span>
                As fotos são sorteadas a cada derrota. Clique no botão <strong className="text-amber-300">"🎯 Fixar no Jogo"</strong> de qualquer imagem abaixo para testá-la com 100% de certeza!
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-stone-400 font-bold block uppercase tracking-wider">
                Total de Fotos
              </span>
              <span className="text-xl font-black text-amber-400 font-mono">
                {images.length}
              </span>
            </div>
          </div>
          <span className="text-xs text-stone-500 font-medium">Cadastradas</span>
        </div>

        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-stone-400 font-bold block uppercase tracking-wider">
                Disposição
              </span>
              <span className="text-sm font-black text-stone-200">
                Grade 4x4 Quadrada
              </span>
            </div>
          </div>
          <span className="text-xs text-stone-500">1:1 Ratio</span>
        </div>

        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              pinnedId ? 'bg-amber-500/20 text-amber-400 border border-amber-400/40' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            }`}>
              {pinnedId ? <Target className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-[11px] text-stone-400 font-bold block uppercase tracking-wider">
                Comportamento
              </span>
              <span className={`text-sm font-black ${pinnedId ? 'text-amber-300' : 'text-emerald-400'}`}>
                {pinnedId ? 'Imagem Fixa Ativa' : 'Sorteio Rotativo'}
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-stone-500">{pinnedId ? 'Modo Teste' : 'Normal'}</span>
        </div>
      </div>

      {/* GRID DE IMAGENS EM QUADRADOS 4x4 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-stone-300 uppercase tracking-wider flex items-center gap-2">
            <span>📷 Fotos da Rotação ({images.length})</span>
          </h3>
          <span className="text-xs text-stone-500">
            Fileiras de 4 quadrados com botão de fixação para testes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card Especial de Adicionar (Primeiro Quadrado) */}
          <div
            onClick={() => {
              sound.playClick();
              setImageUrl('');
              setImageTitle('');
              setFormError(null);
              setShowAddModal(true);
            }}
            className="aspect-square rounded-3xl border-2 border-dashed border-stone-700/80 hover:border-amber-400 bg-stone-900/40 hover:bg-amber-500/5 transition-all flex flex-col items-center justify-center p-6 text-center group cursor-pointer shadow-lg hover:shadow-amber-500/10"
          >
            <div className="w-14 h-14 rounded-2xl bg-stone-800 group-hover:bg-amber-500 text-stone-400 group-hover:text-stone-950 flex items-center justify-center transition-all shadow-md mb-3 group-hover:scale-110">
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-sm text-stone-200 group-hover:text-amber-400 transition-colors font-fun">
              + Adicionar Nova Foto
            </span>
            <span className="text-[11px] text-stone-500 mt-1">
              Upload do PC ou via URL
            </span>
          </div>

          {/* Quadrados de Imagens Salvas (Fileiras de 4x4) */}
          {images.map((item, index) => {
            const isPinned = pinnedId === item.id;

            return (
              <div
                key={item.id}
                className={`aspect-square relative rounded-3xl overflow-hidden bg-stone-950 transition-all duration-300 group shadow-xl ${
                  isPinned
                    ? 'border-2 border-amber-400 ring-4 ring-amber-400/30 shadow-2xl shadow-amber-500/30 scale-[1.02]'
                    : 'border border-stone-800/80 hover:border-stone-600 hover:shadow-2xl hover:shadow-black/70'
                }`}
              >
                {/* Imagem em Formato Quadrado */}
                <img
                  src={item.url}
                  alt={item.title || `Selfie Game Over #${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/gameover/low_poly_dog_selfie.jpg';
                  }}
                />

                {/* Badges e Ações do Topo */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-black bg-black/75 backdrop-blur-md text-amber-300 border border-amber-400/30 shadow-md">
                      #{index + 1}
                    </span>

                    {isPinned && (
                      <span className="px-2 py-1 rounded-full text-[10px] font-mono font-black bg-amber-400 text-stone-950 shadow-md flex items-center gap-1 animate-pulse">
                        <Pin className="w-3 h-3 fill-current" />
                        <span>FIXADA</span>
                      </span>
                    )}
                  </div>

                  {/* Botão de Excluir */}
                  <div className="pointer-events-auto">
                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1 bg-red-950/90 backdrop-blur-md border border-red-700 p-1 rounded-xl shadow-lg">
                        <button
                          onClick={() => handleDeleteImage(item.id)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                          title="Confirmar exclusão"
                        >
                          Excluir
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1 hover:bg-stone-800 text-stone-400 rounded-lg cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="w-8 h-8 rounded-xl bg-black/75 backdrop-blur-md hover:bg-red-600 text-stone-300 hover:text-white border border-white/10 hover:border-red-500 flex items-center justify-center transition-all cursor-pointer shadow-md group-hover:scale-105"
                        title="Excluir imagem do Game Over"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* BOTÃO PRINCIPAL: FIXAR PARA TESTE SEMPRE NO GAME OVER (Sempre visível ou no hover) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-auto">
                  <button
                    onClick={(e) => handleTogglePin(item.id, e)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-black shadow-2xl flex items-center gap-2 cursor-pointer transition-transform transform active:scale-95 ${
                      isPinned
                        ? 'bg-amber-400 text-stone-950 ring-2 ring-white shadow-amber-400/50 scale-105'
                        : 'bg-black/90 hover:bg-amber-500 hover:text-stone-950 text-white border border-amber-400/50 backdrop-blur-md'
                    }`}
                  >
                    <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                    <span>{isPinned ? 'Desafixar Imagem' : 'Fixar no Jogo (Sempre)'}</span>
                  </button>
                </div>

                {/* Overlay Inferior com Título, Botão de Fixar e Preview */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col gap-2 z-10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-black text-white truncate drop-shadow font-fun">
                        {item.title || `Foto #${index + 1}`}
                      </h4>
                      <span className="text-[10px] text-stone-400 font-mono block">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        sound.playClick();
                        setPreviewImage(item);
                      }}
                      className="p-1.5 rounded-xl bg-stone-800/90 hover:bg-amber-500 hover:text-stone-950 text-stone-300 border border-stone-700 hover:border-amber-400 flex items-center justify-center transition-all cursor-pointer shadow flex-shrink-0"
                      title="Pré-visualizar como fica no Game Over"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Barra de Ação Rápida de Fixar (Visível Direto no Card) */}
                  <button
                    onClick={(e) => handleTogglePin(item.id, e)}
                    className={`w-full py-1.5 px-2.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow ${
                      isPinned
                        ? 'bg-amber-400 text-stone-950 shadow-amber-400/30'
                        : 'bg-stone-800/90 hover:bg-amber-500/20 text-stone-300 hover:text-amber-300 border border-stone-700/80 hover:border-amber-400/50'
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                    <span>{isPinned ? '✓ Sempre no Game Over' : 'Fixar p/ Teste'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL PARA ADICIONAR NOVA IMAGEM */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-stone-900 border border-stone-700 rounded-3xl p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white font-fun">
                    Adicionar Imagem ao Game Over
                  </h3>
                  <p className="text-xs text-stone-400">
                    A foto aparecerá para os jogadores quando perderem a partida
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="p-3 bg-red-950/70 border border-red-700 rounded-2xl flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Toggle Tipo de Entrada */}
            <div className="flex gap-2 p-1 bg-stone-950 rounded-2xl border border-stone-800">
              <button
                type="button"
                onClick={() => setActiveInputType('upload')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeInputType === 'upload'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload de Arquivo (PC)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveInputType('url')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeInputType === 'url'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>URL / Link Direto</span>
              </button>
            </div>

            <form onSubmit={handleSaveImage} className="space-y-4">
              {/* Título / Legenda */}
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Título ou Legenda da Imagem (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Caramelo no Ponto de Moto-Táxi"
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-stone-500 outline-none transition-colors"
                />
              </div>

              {/* Entrada de Arquivo ou URL */}
              {activeInputType === 'upload' ? (
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    Selecione a Imagem do Computador
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-stone-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-amber-500 file:text-stone-950 hover:file:bg-amber-400 file:cursor-pointer cursor-pointer bg-stone-950 p-2 rounded-xl border border-stone-700"
                  />
                  {isProcessingFile && (
                    <span className="text-[11px] text-amber-400 mt-1 block">
                      Otimizando imagem para o jogo...
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1.5">
                    URL ou Caminho da Imagem
                  </label>
                  <input
                    type="text"
                    placeholder="https://exemplo.com/foto.jpg ou /images/..."
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setFormError(null);
                    }}
                    className="w-full bg-stone-950 border border-stone-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-stone-500 outline-none transition-colors font-mono"
                  />
                </div>
              )}

              {/* Preview da Imagem Selecionada */}
              {imageUrl && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-400 block uppercase">
                    Pré-visualização do Quadrado:
                  </span>
                  <div className="w-32 h-32 aspect-square rounded-2xl overflow-hidden border-2 border-amber-400 mx-auto bg-stone-950 shadow-lg relative group">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold text-white bg-black/70 px-2 py-0.5 rounded">
                        1:1 Quadrado
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!imageUrl || isProcessingFile}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Salvar Imagem</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PRÉ-VISUALIZAÇÃO NO ESTILO GAME OVER */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-stone-900 border border-stone-700 rounded-3xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                SIMULAÇÃO DE TELA DE GAME OVER
              </span>
              <button
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Moldura da Quebrada IDÊNTICA à do Game Over */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-2xl shadow-black/80 bg-black/40">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-amber-300 font-bold border border-amber-400/40 shadow flex items-center gap-1.5">
                <span>📸</span>
                <span>SELFIE DA QUEBRADA</span>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between">
                <span className="text-xs font-black text-white font-fun truncate">
                  {previewImage.title}
                </span>

                <button
                  onClick={() => handleTogglePin(previewImage.id)}
                  className={`px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all ${
                    pinnedId === previewImage.id
                      ? 'bg-amber-400 text-stone-950'
                      : 'bg-stone-800 hover:bg-amber-500 text-white hover:text-stone-950'
                  }`}
                >
                  <Pin className="w-3 h-3" />
                  <span>{pinnedId === previewImage.id ? 'Fixada' : 'Fixar no Jogo'}</span>
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-stone-400">
              Esta é a visualização exata de como a imagem aparecerá para os jogadores após a derrota.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => handleTogglePin(previewImage.id)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  pinnedId === previewImage.id
                    ? 'bg-amber-400 text-stone-950 shadow-md'
                    : 'bg-stone-800 hover:bg-amber-500 text-white hover:text-stone-950 border border-stone-700'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
                <span>{pinnedId === previewImage.id ? 'Remover Fixação' : 'Fixar para Teste no Jogo'}</span>
              </button>

              <button
                onClick={() => setPreviewImage(null)}
                className="py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
