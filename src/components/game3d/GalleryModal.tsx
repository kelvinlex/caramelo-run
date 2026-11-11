import React, { useState, useEffect } from 'react';
import {
  Lock,
  Check,
  Trophy,
  ArrowRight,
  Download,
  Share2,
  Maximize2,
  Image as ImageIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../services/soundEffects';
import {
  SteelCornerBrackets,
  OctagonCloseButton,
  OctagonIconBadge,
  SteelCoinPill,
  GoldCoinIcon,
  SteelRivet,
} from '../common/CartoonWoodUI';

export interface GalleryItem {
  id: string;
  number: string;
  title: string;
  image: string;
  missionTitle: string;
  missionDesc: string;
  rewardCoins: number;
  unlockPrice: number;
  category: 'Cachorro' | 'Moto' | 'Quebrada' | 'Lendária';
}

export const GALLERY_ITEMS: GalleryItem[] = [
  // 🐕 CATEGORIA: CACHORRO (5 Artes)
  {
    id: 'art_1',
    number: '#01',
    title: 'O Despertar do Caramelo',
    image: '/gallery/caramelo_quebrada_hd.jpg',
    missionTitle: 'A Fúria das Calçadas',
    missionDesc: 'Jogue como Vira-Lata Caramelo e morda o motoboy 10 vezes em partidas da quebrada.',
    rewardCoins: 500,
    unlockPrice: 1200,
    category: 'Cachorro',
  },
  {
    id: 'art_2',
    number: '#02',
    title: 'Salto Acrobático dos Cones',
    image: '/gallery/caramelo_salto_hd.jpg',
    missionTitle: 'Cão Ginasta',
    missionDesc: 'Pule por cima de 8 cones na mesma corrida sem encostar em nenhum obstáculo.',
    rewardCoins: 750,
    unlockPrice: 1600,
    category: 'Cachorro',
  },
  {
    id: 'art_3',
    number: '#03',
    title: 'O Salto do Vira-Lata',
    image: '/gallery/image_20260930_193450.jpg',
    missionTitle: 'Cão Voador',
    missionDesc: 'Pule por cima de obstáculos terrestres e acumule 45 segundos de corrida limpa.',
    rewardCoins: 600,
    unlockPrice: 1400,
    category: 'Cachorro',
  },
  {
    id: 'art_4',
    number: '#04',
    title: 'Caramelo Guerreiro Urbano',
    image: '/gallery/image_20260930_193449.jpg',
    missionTitle: 'Guardião da Rua',
    missionDesc: 'Colete 500 moedas na mesma partida sem colidir nas calçadas.',
    rewardCoins: 1200,
    unlockPrice: 2500,
    category: 'Cachorro',
  },
  {
    id: 'art_5',
    number: '#05',
    title: 'O Alfa da Reta Final',
    image: '/gallery/image_20260930_193407_1.jpg',
    missionTitle: 'Alfa Absoluto',
    missionDesc: 'Morda o motoboy 3 vezes consecutivas em menos de 15 segundos.',
    rewardCoins: 1400,
    unlockPrice: 2800,
    category: 'Cachorro',
  },

  // 🏍️ CATEGORIA: MOTO (5 Artes)
  {
    id: 'art_6',
    number: '#06',
    title: 'Rei do Grau na CG 160',
    image: '/gallery/moto_grau_hd.jpg',
    missionTitle: 'Equilíbrio Extremo',
    missionDesc: 'Empine a moto por mais de 250 metros sem encostar a roda dianteira no asfalto.',
    rewardCoins: 800,
    unlockPrice: 1800,
    category: 'Moto',
  },
  {
    id: 'art_7',
    number: '#07',
    title: 'Curva Perfeita na CG',
    image: '/gallery/image_20260930_193408_1.jpg',
    missionTitle: 'Piloto Ágil',
    missionDesc: 'Desvie de 12 carros no trânsito a menos de 1 metro de distância.',
    rewardCoins: 1100,
    unlockPrice: 2400,
    category: 'Moto',
  },
  {
    id: 'art_8',
    number: '#08',
    title: 'Acrobacia do Bueiro',
    image: '/gallery/image_20260930_193444.jpg',
    missionTitle: 'Voo das Águas',
    missionDesc: 'Passe pelo jato d’água e execute manobras aéreas sem cair de traseira.',
    rewardCoins: 900,
    unlockPrice: 2000,
    category: 'Moto',
  },
  {
    id: 'art_9',
    number: '#09',
    title: 'Aceleração Máxima na Pista',
    image: '/gallery/image_20260930_193444_1.jpg',
    missionTitle: 'Aceleração Pura',
    missionDesc: 'Passe de 110 km/h na reta da avenida no modo Motoboy.',
    rewardCoins: 1300,
    unlockPrice: 2600,
    category: 'Moto',
  },
  {
    id: 'art_10',
    number: '#10',
    title: 'Grau Noturno Neon',
    image: '/gallery/image_20260930_193520_1.jpg',
    missionTitle: 'Notívago Radical',
    missionDesc: 'Empine a moto durante a noite por mais de 500 metros.',
    rewardCoins: 1800,
    unlockPrice: 3500,
    category: 'Moto',
  },

  // 🏙️ CATEGORIA: QUEBRADA (5 Artes)
  {
    id: 'art_11',
    number: '#11',
    title: 'Pipas e Pôr do Sol na Quebrada',
    image: '/gallery/quebrada_pipas_hd.jpg',
    missionTitle: 'Horizonte Dourado',
    missionDesc: 'Sobreviva por 90 segundos seguidos durante o horário do pôr do sol.',
    rewardCoins: 1000,
    unlockPrice: 2200,
    category: 'Quebrada',
  },
  {
    id: 'art_12',
    number: '#12',
    title: 'Fuga em Alta Velocidade',
    image: '/gallery/image_20260930_193418.jpg',
    missionTitle: 'Velocidade Terminal',
    missionDesc: 'Alcance mais de 125 km/h na reta da avenida sem raspar no meio-fio.',
    rewardCoins: 700,
    unlockPrice: 1500,
    category: 'Quebrada',
  },
  {
    id: 'art_13',
    number: '#13',
    title: 'Pôr do Sol na Comunidade',
    image: '/gallery/image_20260930_193445.jpg',
    missionTitle: 'Vista Panorâmica',
    missionDesc: 'Suba pelas colinas e atinja mais de 4.000 metros de distância total.',
    rewardCoins: 1150,
    unlockPrice: 2400,
    category: 'Quebrada',
  },
  {
    id: 'art_14',
    number: '#14',
    title: 'Respeito na Quebrada',
    image: '/gallery/image_20260930_193521.jpg',
    missionTitle: 'Lenda Urbana',
    missionDesc: 'Atinja uma pontuação superior a 50.000 pontos em uma única corrida.',
    rewardCoins: 1500,
    unlockPrice: 3000,
    category: 'Quebrada',
  },
  {
    id: 'art_15',
    number: '#15',
    title: 'Pacto de Lealdade',
    image: '/gallery/image_20260930_193529.jpg',
    missionTitle: 'Irmandade da Quebrada',
    missionDesc: 'Complete 10 partidas consecutivas com pontuações expressivas.',
    rewardCoins: 1300,
    unlockPrice: 2600,
    category: 'Quebrada',
  },

  // 👑 CATEGORIA: LENDÁRIA (5 Artes)
  {
    id: 'art_16',
    number: '#16',
    title: 'O Lendário Vira-Lata Caramelo',
    image: '/gallery/caramelo_lendario_hd.jpg',
    missionTitle: 'Divindade da Quebrada',
    missionDesc: 'Morda o motoboy 15 vezes na mesma corrida sem tomar nenhum dano.',
    rewardCoins: 2500,
    unlockPrice: 5000,
    category: 'Lendária',
  },
  {
    id: 'art_17',
    number: '#17',
    title: 'O Retorno do Mito Caramelo',
    image: '/gallery/image_20260930_193521_1.jpg',
    missionTitle: 'Mito Imortal',
    missionDesc: 'Conquiste mais de 100.000 pontos no modo Caramelo.',
    rewardCoins: 2000,
    unlockPrice: 3800,
    category: 'Lendária',
  },
  {
    id: 'art_18',
    number: '#18',
    title: 'CG 160 Edição Especial Ouro',
    image: '/gallery/image_20260930_193522.jpg',
    missionTitle: 'Toque de Midas',
    missionDesc: 'Alcance a velocidade máxima e mantenha o grau por 15 segundos seguidos.',
    rewardCoins: 2200,
    unlockPrice: 4000,
    category: 'Lendária',
  },
  {
    id: 'art_19',
    number: '#19',
    title: 'Glória Eterna da Quebrada',
    image: '/gallery/image_20260930_193522_1.jpg',
    missionTitle: 'Mestre Supremo',
    missionDesc: 'Execute um combo de salto quádruplo no jato d’água com aterrissagem perfeita.',
    rewardCoins: 2300,
    unlockPrice: 4500,
    category: 'Lendária',
  },
  {
    id: 'art_20',
    number: '#20',
    title: 'Troféu Supremo do Vira-Lata',
    image: '/gallery/image_d9daad-faa-mais-30-so-que-deixe-a-legenda-menor-e-mais-cl.jpg',
    missionTitle: 'Colecionador de Elite',
    missionDesc: 'Desbloqueie pelo menos 4 cachorros e 3 motos na Garagem oficial.',
    rewardCoins: 2500,
    unlockPrice: 5000,
    category: 'Lendária',
  },
];

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoins: number;
  onSpendCoins: (amount: number) => boolean;
  onStartGame?: () => void;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({
  isOpen,
  onClose,
  userCoins,
  onSpendCoins,
  onStartGame,
}) => {
  const [unlockedArts, setUnlockedArts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('caramelorun_unlocked_gallery_arts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['art_1'];
  });

  const [selectedArt, setSelectedArt] = useState<GalleryItem | null>(null);
  const [cleanViewMode, setCleanViewMode] = useState(false);
  const [showShareTrayBelowImg, setShowShareTrayBelowImg] = useState(true);
  const [cardShareId, setCardShareId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | 'Cachorro' | 'Moto' | 'Quebrada' | 'Lendária'>('Todas');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('caramelorun_unlocked_gallery_arts', JSON.stringify(unlockedArts));
    } catch {}
  }, [unlockedArts]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3200);
  };

  const handleUnlockWithCoins = (art: GalleryItem) => {
    if (unlockedArts.includes(art.id)) return;
    if (userCoins < art.unlockPrice) {
      sound.playStumble();
      showToast(`Você precisa de ${art.unlockPrice.toLocaleString('pt-BR')} moedas para desbloquear esta arte!`);
      return;
    }

    const success = onSpendCoins(art.unlockPrice);
    if (success) {
      sound.playPowerup();
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      setUnlockedArts((prev) => [...prev, art.id]);
      showToast(`Arte "${art.title}" desbloqueada com sucesso!`);
    }
  };

  const handleSaveImage = (art: GalleryItem) => {
    const link = document.createElement('a');
    link.href = art.image;
    link.download = `caramelo_art_${art.number.replace('#', '')}_${art.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    sound.playPowerup();
  };

  const handleShareArt = async (art: GalleryItem) => {
    const shareData = {
      title: `Vira-Lata Run 3D - ${art.title}`,
      text: `Olha essa arte da quebrada que desbloqueei no jogo Vira-Lata Run 3D: "${art.title}"!`,
      url: window.location.origin + art.image,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {}
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        showToast('Link da arte copiado para a área de transferência!');
      } else {
        handleSaveImage(art);
      }
    } catch {
      handleSaveImage(art);
    }
  };

  const filteredItems = categoryFilter === 'Todas'
    ? GALLERY_ITEMS
    : GALLERY_ITEMS.filter((item) => item.category === categoryFilter);

  const totalUnlocked = unlockedArts.length;
  const totalArts = GALLERY_ITEMS.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-2 sm:p-5 animate-fade-in select-none">
      <div className="cartoon-wood-board rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col relative p-3 sm:p-5">
        <SteelCornerBrackets size="lg" />

        {/* Top Header Plank */}
        <div className="cartoon-wood-header rounded-2xl px-3.5 py-3 sm:px-5 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <OctagonIconBadge variant="steel">
              <ImageIcon className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
            </OctagonIconBadge>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="cartoon-title-3d text-lg sm:text-2xl md:text-3xl uppercase tracking-wide leading-none">
                  GALERIA DE ARTES & CONQUISTAS
                </h2>
                <span className="cartoon-wood-inset px-3 py-1 rounded-xl border-2 border-amber-500/80 text-xs sm:text-sm font-fun font-extrabold text-amber-300 uppercase tracking-wider shadow-md">
                  <span className="text-white">{totalUnlocked}/{totalArts}</span> DESBLOQUEADAS
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-100/95 font-bold cartoon-text-outline mt-1">
                Clique em qualquer imagem de conquista para abrir ou compartilhar abaixo da imagem.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <SteelCoinPill amount={userCoins} />
            <OctagonCloseButton onClick={onClose} title="Fechar Galeria" />
          </div>
        </div>

        {/* Filter Tabs Row */}
        <div className="flex items-center gap-2 sm:gap-3 px-2 py-3 overflow-x-auto relative z-10">
          {(['Todas', 'Cachorro', 'Moto', 'Quebrada', 'Lendária'] as const).map((cat) => {
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setCategoryFilter(cat);
                }}
                className={`relative px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer flex items-center gap-2 shrink-0 ${
                  isActive ? 'cartoon-btn-gold' : 'cartoon-btn-steel'
                }`}
              >
                <SteelRivet className="w-1.5 h-1.5" />
                <span>{cat}</span>
                <SteelRivet className="w-1.5 h-1.5" />
              </button>
            );
          })}
        </div>

        {/* 5-Column Wood & Steel Artwork Grid */}
        <div className="p-2 sm:p-3 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-3.5 relative z-10">
          {filteredItems.map((item) => {
            const isUnlocked = unlockedArts.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => {
                  sound.playClick();
                  setCardShareId((prev) => (prev === item.id ? null : item.id));
                  setSelectedArt(item);
                  setShowShareTrayBelowImg(true);
                  setCleanViewMode(false);
                }}
                className={`group cartoon-wood-plank rounded-2xl p-2 flex flex-col justify-between cursor-pointer transition-transform hover:scale-[1.02] active:scale-98 ${
                  isUnlocked ? 'ring-2 ring-amber-400/70' : ''
                }`}
              >
                <SteelCornerBrackets size="sm" />

                {/* Top Framed Artwork Window */}
                <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden border-2 border-[#1e293b] bg-[#0c192c] shadow-inner">
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-transform duration-300 ${
                      isUnlocked
                        ? 'brightness-100 group-hover:scale-105'
                        : 'brightness-40 contrast-115 saturate-50'
                    }`}
                    style={{ backgroundImage: `url(${item.image})` }}
                  />

                  {!isUnlocked && (
                    <div className="absolute inset-0 bg-[#0b172a]/55 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-[#3b5578] to-[#172436] border-2 border-[#8aa8cc] shadow-[0_4px_10px_rgba(0,0,0,0.85)] flex items-center justify-center">
                        <Lock className="w-5 h-5 text-slate-100 stroke-[2.5]" />
                      </div>
                    </div>
                  )}

                  <div className="absolute top-1.5 left-1.5 z-10">
                    <span className="text-[11px] font-fun font-extrabold px-2 py-0.5 rounded-md bg-[#111c2d]/95 border border-[#6482ab] text-white shadow">
                      {item.number}
                    </span>
                  </div>
                </div>

                {/* Bottom Wood Plank Title & Price/Status + Share Icons Below Image when Clicked */}
                <div className="pt-2 px-1 flex flex-col gap-1 relative z-10 text-left">
                  <div className="text-xs sm:text-[13px] font-fun font-extrabold text-white truncate cartoon-text-outline">
                    {item.title}
                  </div>
                  <div className="flex items-center justify-between gap-1.5 mt-0.5">
                    {isUnlocked ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-fun font-extrabold text-xs cartoon-text-outline">
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                          <Check className="w-3 h-3 stroke-[3.5]" />
                        </span>
                        <span>Conquistada</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-300 font-fun font-extrabold text-xs sm:text-sm cartoon-text-outline">
                        <GoldCoinIcon className="w-4 h-4" />
                        <span>{item.unlockPrice.toLocaleString('pt-BR')}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        sound.playClick();
                        setCardShareId((prev) => (prev === item.id ? null : item.id));
                      }}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/50 text-[10px] font-black text-amber-200 hover:bg-amber-500/35 flex items-center gap-1 cursor-pointer"
                      title="Exibir opções de compartilhamento abaixo da imagem"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Compartilhar</span>
                    </button>
                  </div>

                  {cardShareId === item.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1.5 pt-1.5 border-t border-amber-500/30 flex items-center justify-around gap-1 animate-fade-in"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const text = encodeURIComponent(
                            `Olha essa conquista no Caramelo Run 3D: "${item.title}"! 🐕🏍️`,
                          );
                          window.open(`https://wa.me/?text=${text}`, '_blank');
                        }}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase cursor-pointer shadow"
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareArt(item)}
                        className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase cursor-pointer shadow"
                      >
                        Link
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveImage(item)}
                        className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase cursor-pointer shadow"
                      >
                        Baixar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {feedbackToast && (
          <div className="mx-auto mt-2 px-4 py-2 rounded-xl cartoon-btn-gold text-xs sm:text-sm z-30">
            {feedbackToast}
          </div>
        )}
      </div>

      {/* MODAL DE ZOOM E DETALHE DA ARTE */}
      {selectedArt && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          {cleanViewMode ? (
            <div className="relative max-w-4xl w-full max-h-[96vh] flex flex-col items-center justify-center animate-fade-in">
              <div className="w-full flex items-center justify-between py-2.5 px-4 cartoon-wood-header rounded-2xl mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-fun font-extrabold text-amber-300 cartoon-text-outline">{selectedArt.number}</span>
                  <span className="text-sm sm:text-base font-fun font-extrabold text-white truncate cartoon-text-outline">{selectedArt.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSaveImage(selectedArt)}
                    className="px-3.5 py-1.5 rounded-xl cartoon-btn-green text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                  <button
                    onClick={() => handleShareArt(selectedArt)}
                    className="px-3.5 py-1.5 rounded-xl cartoon-btn-blue text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartilhar</span>
                  </button>
                  <OctagonCloseButton onClick={() => setCleanViewMode(false)} title="Voltar" className="w-9 h-9" />
                </div>
              </div>

              <div className="relative w-full rounded-2xl overflow-hidden border-4 border-[#4a6a91] bg-black flex items-center justify-center shadow-2xl">
                <img
                  src={selectedArt.image}
                  alt={selectedArt.title}
                  className="max-h-[80vh] w-auto max-w-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="cartoon-wood-board rounded-3xl max-w-xl w-full p-4 sm:p-5 relative flex flex-col gap-3.5">
              <SteelCornerBrackets size="md" />

              <div className="flex items-center justify-between cartoon-wood-header rounded-2xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#162336] border border-[#6482ab] text-xs font-fun font-extrabold text-amber-300">
                    {selectedArt.number} • {selectedArt.category}
                  </span>
                  <h3 className="cartoon-title-3d text-base sm:text-xl truncate">
                    {selectedArt.title}
                  </h3>
                </div>
                <OctagonCloseButton onClick={() => setSelectedArt(null)} className="w-9 h-9 sm:w-10 sm:h-10" />
              </div>

              {/* Imagem em Destaque (Clique na imagem para exibir/ocultar os ícones de compartilhamento logo abaixo!) */}
              <div
                onClick={() => {
                  sound.playClick();
                  setShowShareTrayBelowImg((prev) => !prev);
                }}
                className="relative w-full aspect-video rounded-2xl border-3 border-[#3b4f6b] bg-[#0b1526] flex items-center justify-center overflow-hidden shadow-inner cursor-pointer group"
                title="Clique na imagem para exibir os ícones de compartilhamento abaixo"
              >
                <img
                  src={selectedArt.image}
                  alt={selectedArt.title}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    unlockedArts.includes(selectedArt.id)
                      ? 'brightness-100 scale-100 group-hover:scale-[1.02]'
                      : 'brightness-35 contrast-125 saturate-50 blur-[1.5px] scale-105'
                  }`}
                />

                {unlockedArts.includes(selectedArt.id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCleanViewMode(true);
                    }}
                    className="absolute bottom-3 right-3 z-20 px-3.5 py-1.5 rounded-xl cartoon-btn-steel text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>Ver Imagem Limpa</span>
                  </button>
                )}

                {!unlockedArts.includes(selectedArt.id) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center bg-black/45">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#3b5578] to-[#172436] border-2 border-[#8aa8cc] flex items-center justify-center mb-2 shadow-xl">
                      <Lock className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-fun font-extrabold text-amber-200 uppercase tracking-wider cartoon-wood-inset px-3 py-1 rounded-full">
                      Arte Bloqueada
                    </span>
                  </div>
                )}
              </div>

              {/* Ícones de Compartilhamento exibidos logo abaixo da imagem ao clicar nela (Item 12) */}
              {showShareTrayBelowImg && (
                <div className="cartoon-wood-inset rounded-2xl px-3.5 py-2.5 border border-amber-400/50 flex flex-wrap items-center justify-between gap-2 animate-fade-in">
                  <span className="text-[11px] font-black text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    Compartilhar Conquista:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const text = encodeURIComponent(
                          `Conquista "${selectedArt.title}" no Caramelo Run 3D! 🐕🏍️`,
                        );
                        window.open(`https://wa.me/?text=${text}`, '_blank');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-md"
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const text = encodeURIComponent(
                          `Conquista "${selectedArt.title}" no Caramelo Run 3D! 🐕🏍️`,
                        );
                        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-md"
                    >
                      X / Twitter
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareArt(selectedArt)}
                      className="px-3 py-1.5 rounded-xl cartoon-btn-blue text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      Copiar Link
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveImage(selectedArt)}
                      className="px-3 py-1.5 rounded-xl cartoon-btn-green text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      Baixar
                    </button>
                  </div>
                </div>
              )}

              {/* Card da Missão */}
              <div className="cartoon-wood-plank p-3.5 rounded-2xl flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-fun font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 cartoon-text-outline">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Missão: {selectedArt.missionTitle}
                  </span>
                  <span className="text-xs font-fun font-extrabold text-emerald-300 cartoon-text-outline">
                    +{selectedArt.rewardCoins} pts extras
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-amber-50 font-semibold leading-relaxed cartoon-text-outline">
                  "{selectedArt.missionDesc}"
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="pt-1">
                {unlockedArts.includes(selectedArt.id) ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleSaveImage(selectedArt)}
                      className="flex-1 py-3 px-4 cartoon-btn-green rounded-xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Salvar na Galeria</span>
                    </button>

                    <button
                      onClick={() => handleShareArt(selectedArt)}
                      className="flex-1 py-3 px-4 cartoon-btn-blue rounded-xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Compartilhar</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleUnlockWithCoins(selectedArt)}
                      className="flex-1 py-3 px-4 cartoon-btn-gold rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Desbloquear por</span>
                      <GoldCoinIcon className="w-4 h-4" />
                      <span>{selectedArt.unlockPrice.toLocaleString('pt-BR')}</span>
                    </button>

                    {onStartGame && (
                      <button
                        onClick={() => {
                          setSelectedArt(null);
                          onClose();
                          onStartGame();
                        }}
                        className="py-3 px-5 cartoon-btn-green rounded-xl text-xs sm:text-sm uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Jogar</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
