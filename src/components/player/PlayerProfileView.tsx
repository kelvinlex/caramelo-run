import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  ShoppingBag,
  Trophy,
  Award,
  Flame,
  Shield,
  Coins,
  Share2,
  Gamepad2,
  Lock,
  Tag,
  Camera,
} from 'lucide-react';
import { storage } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import { User, Skin } from '../../types';
import { CarameloAvatar } from '../common/CarameloAvatar';
import { Caramelo3DRunner } from '../game3d/Caramelo3DRunner';
import { PixCheckoutModal } from '../payment/PixCheckoutModal';
import { ProfilePhotoSelectorModal } from './ProfilePhotoSelectorModal';
import { SteelCornerBrackets, SteelRivet, SteelCoinPill, GoldCoinIcon } from '../common/CartoonWoodUI';

interface PlayerProfileViewProps {
  user: User;
  onOpenAuth: () => void;
  onShareProfile: (user: User) => void;
  onNavigate: (view: 'home' | 'leaderboard' | 'profile' | 'admin' | 'game' | 'shop') => void;
}

export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({
  user,
  onOpenAuth,
  onShareProfile,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'wardrobe' | 'shop' | 'stats' | 'game' | 'achievements'>('wardrobe');
  const [buyMsg, setBuyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<{
    title: string;
    priceBrl: number;
    tipoItem: 'SKIN' | 'PACOTE_MOEDAS' | 'PASSE_TEMPORADA';
    itemId?: string;
  } | null>(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const skins = storage.getSkins();
  const achievements = storage.getAchievements();
  const equippedSkin = skins.find((s) => s.id === user.skinEquipadaId) || skins[0];

  const handleEquip = (skinId: string) => {
    sound.playBark();
    storage.equipSkin(skinId);
  };

  const handleBuy = (skinId: string) => {
    const targetSkin = skins.find(s => s.id === skinId);
    if (targetSkin && targetSkin.isRealMoneyOnly) {
      setCheckoutItem({
        title: `Skin Exclusiva: ${targetSkin.nome}`,
        priceBrl: targetSkin.precoReais || 14.90,
        tipoItem: 'SKIN',
        itemId: targetSkin.id
      });
      setIsPixModalOpen(true);
      return;
    }

    const res = storage.buySkin(skinId);
    if (res.success) {
      sound.playWin();
      setBuyMsg({ type: 'success', text: 'Skin desbloqueada e equipada com sucesso na matilha!' });
    } else {
      sound.playClick();
      setBuyMsg({ type: 'error', text: res.error || 'Erro ao comprar skin.' });
    }
    setTimeout(() => setBuyMsg(null), 4000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Player Hero Card Banner - 3D Cartoon Wood Board with Steel Brackets */}
      <div className="relative cartoon-wood-board rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
        <SteelCornerBrackets size="lg" />
        <div className="absolute top-2 left-10"><SteelRivet /></div>
        <div className="absolute top-2 right-10"><SteelRivet /></div>
        <div className="absolute bottom-2 left-10"><SteelRivet /></div>
        <div className="absolute bottom-2 right-10"><SteelRivet /></div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            {/* Foto de Perfil Gamer Clicável com Moldura 3D Estilizada */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsPhotoModalOpen(true);
                }}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)] bg-zinc-950 flex items-center justify-center cursor-pointer transition-transform group-hover:scale-105"
                title="Clique para trocar sua foto de perfil"
              >
                {user.profilePhotoUrl ? (
                  <img
                    src={user.profilePhotoUrl}
                    alt={user.nickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <CarameloAvatar skin={equippedSkin} size="lg" isAnimated={true} />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsPhotoModalOpen(true);
                }}
                className="absolute bottom-0 right-0 p-2 bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 rounded-full shadow-lg border-2 border-stone-900 cursor-pointer transform hover:scale-110 transition-transform"
                title="Trocar Foto de Perfil"
              >
                <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                <h2 className="text-2xl md:text-3xl font-black text-amber-200 font-fun cartoon-title-gold-3d">
                  @{user.nickname}
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 border border-amber-300 shadow">
                  {user.stats.statusQuebrada}
                </span>
                {user.role !== 'player' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-950 text-red-300 border-2 border-red-700 uppercase shadow">
                    {user.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-100/80 mb-3 drop-shadow">
                Skin Atual: <span className="text-amber-300 font-black">{equippedSkin.nome}</span> • Membro da matilha desde {new Date(user.criadoEm).toLocaleDateString('pt-BR')}
              </p>

              {/* 💵 Contadores dos 3 tipos de dinheiro lado a lado - Steel Pills 3D */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3">
                {/* 10 */}
                <div className="cartoon-steel-pill px-3 py-1.5 flex items-center gap-1.5 shadow">
                  <img src="/dinheiro/icone_10_cutout.png" alt="10" className="w-5 h-3.5 object-contain" />
                  <span className="text-xs sm:text-sm font-black text-emerald-300 font-mono">
                    {(user.notas10 ?? 0).toLocaleString('pt-BR')} <span className="text-[10px] text-emerald-400 font-sans">(R$ 10)</span>
                  </span>
                </div>

                {/* 50 */}
                <div className="cartoon-steel-pill px-3 py-1.5 flex items-center gap-1.5 shadow">
                  <img src="/dinheiro/icone_50_roxo_cutout.png" alt="50" className="w-5 h-3.5 object-contain" />
                  <span className="text-xs sm:text-sm font-black text-purple-300 font-mono">
                    {(user.notas50 ?? 0).toLocaleString('pt-BR')} <span className="text-[10px] text-purple-400 font-sans">(R$ 50)</span>
                  </span>
                </div>

                {/* 100 */}
                <div className="cartoon-steel-pill px-3 py-1.5 flex items-center gap-1.5 shadow">
                  <img src="/dinheiro/icone_100_vermelho_cutout.png" alt="100" className="w-5 h-3.5 object-contain" />
                  <span className="text-xs sm:text-sm font-black text-cyan-200 font-mono">
                    {(user.notas100 ?? 0).toLocaleString('pt-BR')} <span className="text-[10px] text-cyan-300 font-sans">(R$ 100)</span>
                  </span>
                </div>

                <div className="cartoon-steel-pill px-3 py-1.5 flex items-center gap-2 shadow border-amber-500/60">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-black text-amber-300 font-mono">
                    {user.stats.maiorPontuacao.toLocaleString('pt-BR')} pts <span className="text-[10px] text-amber-400/80 font-sans font-normal">(Recorde)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto">
            <button
              onClick={() => onShareProfile(user)}
              className="cartoon-btn-steel px-5 py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow"
            >
              <Share2 className="w-4 h-4 text-amber-400" /> Compartilhar Perfil
            </button>

            <button
              onClick={() => setActiveTab('game')}
              className="cartoon-btn-gold px-6 py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer font-fun shadow-lg tracking-wider"
            >
              <Gamepad2 className="w-4 h-4 text-stone-900" /> CORRER AGORA!
            </button>
          </div>
        </div>

        {/* Profile Tabs - 3D Beveled Tabs */}
        <div className="mt-8 pt-4 border-t-2 border-[#542d13] flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'wardrobe', label: '🐕 Meu Guarda-Roupa', icon: ShoppingBag },
            { id: 'shop', label: '🛍️ Loja de Skins & PIX', icon: Tag },
            { id: 'stats', label: '📊 Estatísticas', icon: Trophy },
            { id: 'achievements', label: '🏆 Conquistas', icon: Award },
            { id: 'game', label: '🎮 Treino de Corrida', icon: Gamepad2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sound.playClick();
                  setActiveTab(tab.id as any);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black font-fun flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'cartoon-btn-gold text-stone-950 scale-105'
                    : 'cartoon-btn-steel text-cyan-100 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {buyMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold text-center border animate-in fade-in ${
            buyMsg.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
              : 'bg-red-950/60 text-red-300 border-red-800'
          }`}
        >
          {buyMsg.text}
        </div>
      )}

      {/* TAB 1: MEU GUARDA-ROUPA (Apenas Skins Adquiridas) */}
      {activeTab === 'wardrobe' && (() => {
        const ownedSkins = skins.filter((s) => user.inventarioSkinIds.includes(s.id));
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-amber-200 font-fun cartoon-title-gold-3d flex items-center gap-2">
                  🐕 Meu Guarda-Roupa de Skins ({ownedSkins.length} Desbloqueadas)
                </h3>
                <p className="text-xs text-stone-300">
                  Aqui ficam todas as skins que você possui. Escolha qual equipar para usar na corrida!
                </p>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  onNavigate('shop');
                }}
                className="cartoon-btn-gold px-5 py-2.5 rounded-2xl text-xs font-black font-fun shadow-lg flex items-center gap-2 cursor-pointer transition-all"
              >
                <ShoppingBag className="w-4 h-4 text-stone-900" />
                <span>IR PARA A LOJA DE SKINS 🛍️</span>
              </button>
            </div>

            {ownedSkins.length === 0 ? (
              <div className="cartoon-wood-board rounded-3xl p-8 text-center space-y-4 relative">
                <SteelCornerBrackets size="md" />
                <div className="w-16 h-16 rounded-full bg-[#1b2b48] border-2 border-[#3b5988] flex items-center justify-center mx-auto text-3xl shadow-inner">
                  🐕
                </div>
                <h4 className="text-base font-black text-amber-200 font-fun">
                  Seu guarda-roupa ainda está vazio!
                </h4>
                <p className="text-xs text-amber-100/70 max-w-md mx-auto">
                  Você ainda não possui skins adicionais. Visite a Loja da Quebrada para liberar visuais incríveis com seus OssoCoins ou via PIX!
                </p>
                <button
                  onClick={() => onNavigate('shop')}
                  className="cartoon-btn-gold px-6 py-3 rounded-2xl text-xs font-black font-fun shadow-lg cursor-pointer"
                >
                  ABRIR LOJA DA QUEBRADA 🛍️
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {ownedSkins.map((skin) => {
                  const isEquipped = user.skinEquipadaId === skin.id;
                  return (
                    <div
                      key={skin.id}
                      className={`cartoon-navy-panel rounded-3xl p-5 flex flex-col justify-between transition-all relative overflow-hidden shadow-xl ${
                        isEquipped
                          ? 'ring-4 ring-amber-400'
                          : ''
                      }`}
                    >
                      <SteelCornerBrackets size="sm" />
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                            skin.tipo === 'Lendária'
                              ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                              : skin.tipo === 'Especial'
                              ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                              : skin.tipo === 'Rara'
                              ? 'bg-blue-950/80 border-cyan-400 text-cyan-300'
                              : 'bg-stone-800 border-stone-600 text-stone-300'
                          }`}
                        >
                          {skin.tipo}
                        </span>

                        <span className="text-[10px] bg-emerald-950 text-emerald-300 border-2 border-emerald-600 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 shadow">
                          <Check className="w-3 h-3 stroke-[3]" /> NA MATILHA
                        </span>
                      </div>

                      <div className="flex items-center justify-center py-4 bg-black/40 rounded-2xl mb-4 border-2 border-[#2b4168] shadow-inner relative z-10">
                        <CarameloAvatar skin={skin} size="md" isAnimated={true} />
                      </div>

                      <div className="mb-4 relative z-10">
                        <h4 className="font-black text-amber-200 font-fun text-base flex items-center gap-1.5 drop-shadow">
                          {skin.nome}
                        </h4>
                        <p className="text-xs text-blue-100/70 mt-1 leading-relaxed line-clamp-2">
                          {skin.descricao}
                        </p>
                      </div>

                      <div className="relative z-10">
                        {isEquipped ? (
                          <div className="w-full py-2.5 cartoon-btn-green text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow">
                            <Check className="w-4 h-4 stroke-[3]" /> EQUIPADO NO JOGO
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEquip(skin.id)}
                            className="w-full py-2.5 cartoon-btn-gold text-stone-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer font-fun shadow-md"
                          >
                            EQUIPAR ESTA SKIN
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 2: LOJA DA QUEBRADA (Catálogo Completo de Compras) */}
      {activeTab === 'shop' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-amber-200 font-fun cartoon-title-gold-3d flex items-center gap-2">
                🛍️ Loja da Quebrada (Catálogo de Skins)
              </h3>
              <p className="text-xs text-stone-300">
                Desbloqueie skins exclusivas com seus OssoCoins ou adquira edições lendárias via PIX!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="cartoon-steel-pill px-4 py-2 flex items-center gap-2 shadow">
                <span className="text-xs text-stone-300 font-bold">Saldo:</span>
                <span className="font-black text-amber-300 font-mono text-sm">{user.ossoCoins.toLocaleString('pt-BR')} 🦴</span>
              </div>
              <button
                onClick={() => {
                  sound.playCoin();
                  setCheckoutItem({
                    title: 'Pacote 10.000 OssoCoins',
                    priceBrl: 19.90,
                    tipoItem: 'PACOTE_MOEDAS',
                    itemId: 'pkg-10000'
                  });
                  setIsPixModalOpen(true);
                }}
                className="cartoon-btn-green px-4 py-2 rounded-xl text-xs font-black font-fun shadow-lg flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>+ COMPRAR MOEDAS (PIX)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {skins.map((skin) => {
              const isOwned = user.inventarioSkinIds.includes(skin.id);
              const isEquipped = user.skinEquipadaId === skin.id;

              return (
                <div
                  key={skin.id}
                  className={`cartoon-navy-panel rounded-3xl p-5 flex flex-col justify-between transition-all relative overflow-hidden shadow-xl ${
                    isEquipped
                      ? 'ring-4 ring-amber-400'
                      : isOwned
                      ? 'border-emerald-600/60'
                      : ''
                  }`}
                >
                  <SteelCornerBrackets size="sm" />
                  {/* Badge */}
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                        skin.tipo === 'Lendária'
                          ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                          : skin.tipo === 'Especial'
                          ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                          : skin.tipo === 'Rara'
                          ? 'bg-blue-950/80 border-cyan-400 text-cyan-300'
                          : 'bg-stone-800 border-stone-600 text-stone-300'
                      }`}
                    >
                      {skin.tipo}
                    </span>

                    {isOwned ? (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border-2 border-emerald-600 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 shadow">
                        <Check className="w-3 h-3 stroke-[3]" /> ADQUIRIDA
                      </span>
                    ) : skin.emPromocao ? (
                      <span className="text-[10px] bg-red-950 text-red-200 border-2 border-red-600 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 shadow animate-pulse">
                        <Tag className="w-3 h-3" /> PROMO -{skin.descontoPercentual}%
                      </span>
                    ) : null}
                  </div>

                  {/* Visual Avatar */}
                  <div className="flex items-center justify-center py-4 bg-black/40 rounded-2xl mb-4 border-2 border-[#2b4168] shadow-inner relative z-10">
                    <CarameloAvatar skin={skin} size="md" isAnimated={true} />
                  </div>

                  {/* Info */}
                  <div className="mb-4 relative z-10">
                    <h4 className="font-black text-amber-200 font-fun text-base flex items-center gap-1.5 drop-shadow">
                      {skin.nome}
                    </h4>
                    <p className="text-xs text-blue-100/70 mt-1 leading-relaxed line-clamp-2">
                      {skin.descricao}
                    </p>
                    {skin.desbloqueioPorConquista && (
                      <p className="text-[11px] text-amber-400 font-bold mt-1.5 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Desbloqueio: {skin.desbloqueioPorConquista}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="relative z-10">
                    {isEquipped ? (
                      <div className="w-full py-2.5 cartoon-btn-green text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow">
                        <Check className="w-4 h-4 stroke-[3]" /> EQUIPADO NO JOGO
                      </div>
                    ) : isOwned ? (
                      <button
                        onClick={() => handleEquip(skin.id)}
                        className="w-full py-2.5 cartoon-btn-steel text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer font-fun shadow"
                      >
                        EQUIPAR SKIN
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuy(skin.id)}
                        className="w-full py-2.5 cartoon-btn-gold text-stone-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer font-fun shadow-lg"
                      >
                        {skin.isRealMoneyOnly ? (
                          <span>COMPRAR POR R$ {skin.precoReais.toFixed(2)} (PIX)</span>
                        ) : (
                          <span>
                            COMPRAR •{' '}
                            {skin.emPromocao && skin.descontoPercentual
                              ? `${Math.round(skin.precoMoedas * (1 - skin.descontoPercentual / 100))} OssoCoins`
                              : `${skin.precoMoedas} OssoCoins`}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED STATS */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="cartoon-navy-panel p-5 rounded-2xl relative">
              <SteelCornerBrackets size="sm" />
              <span className="text-xs text-blue-200 block font-bold mb-1">Maior Pontuação</span>
              <span className="text-2xl font-black text-amber-300 font-mono drop-shadow">
                {user.stats.maiorPontuacao.toLocaleString('pt-BR')} pts
              </span>
              <span className="text-[11px] text-blue-300/70 block mt-1">Ranking global da quebrada</span>
            </div>

            <div className="cartoon-navy-panel p-5 rounded-2xl relative">
              <SteelCornerBrackets size="sm" />
              <span className="text-xs text-blue-200 block font-bold mb-1">Motoqueiros Mordidos</span>
              <span className="text-2xl font-black text-red-400 font-mono drop-shadow">
                {user.stats.motoqueirosMordidos.toLocaleString('pt-BR')} canelas
              </span>
              <span className="text-[11px] text-blue-300/70 block mt-1">Terror das entregas</span>
            </div>

            <div className="cartoon-navy-panel p-5 rounded-2xl relative">
              <SteelCornerBrackets size="sm" />
              <span className="text-xs text-blue-200 block font-bold mb-1">Chineladas Desviadas</span>
              <span className="text-2xl font-black text-cyan-300 font-mono drop-shadow">
                {user.stats.chinelosDesviados.toLocaleString('pt-BR')} esquivas
              </span>
              <span className="text-[11px] text-blue-300/70 block mt-1">Reflexos de vira-lata</span>
            </div>

            <div className="cartoon-navy-panel p-5 rounded-2xl relative">
              <SteelCornerBrackets size="sm" />
              <span className="text-xs text-blue-200 block font-bold mb-1">Distância no Asfalto</span>
              <span className="text-2xl font-black text-emerald-400 font-mono drop-shadow">
                {user.stats.distanciaKm.toFixed(1)} km
              </span>
              <span className="text-[11px] text-blue-300/70 block mt-1">Percorridos na correria</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACHIEVEMENTS */}
      {activeTab === 'achievements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-amber-200 font-fun cartoon-title-gold-3d">
              Conquistas & Medalhas da Quebrada
            </h3>
            <span className="cartoon-steel-pill px-3 py-1 text-xs text-amber-300 font-black shadow">
              {user.stats.conquistasDesbloqueadas} / {user.stats.totalConquistas} Desbloqueadas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`cartoon-navy-panel p-4 rounded-2xl flex items-center gap-4 transition-all relative ${
                  ach.desbloqueada
                    ? 'border-amber-500/60 shadow-lg'
                    : 'opacity-75'
                }`}
              >
                <SteelCornerBrackets size="sm" />
                <div className="w-12 h-12 rounded-2xl bg-black/50 border-2 border-[#3b5988] flex items-center justify-center text-2xl shadow-inner relative z-10">
                  {ach.desbloqueada ? ach.icone : '🔒'}
                </div>

                <div className="flex-1 relative z-10">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-amber-100 font-fun text-sm drop-shadow">{ach.titulo}</h4>
                    <span className="text-xs font-mono font-black text-amber-300">+{ach.recompensaMoedas} 🦴</span>
                  </div>
                  <p className="text-xs text-blue-100/70 mt-0.5">{ach.descricao}</p>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-3 bg-black/60 rounded-full overflow-hidden border border-[#2b4168] p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full shadow"
                        style={{
                          width: `${Math.min(100, (ach.progressoAtual / ach.progressoMaximo) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-cyan-200 font-bold">
                      {ach.progressoAtual}/{ach.progressoMaximo}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: INTERACTIVE RUNNER GAME */}
      {activeTab === 'game' && (
        <div className="space-y-4">
          <Caramelo3DRunner equippedSkin={equippedSkin} onBackToMenu={() => onNavigate('home')} />
        </div>
      )}

      {/* MODAL DE CHECKOUT PIX BANCO ASAAS */}
      <PixCheckoutModal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        item={checkoutItem}
        currentUser={user}
        onSuccess={(updated) => {
          setBuyMsg({
            type: 'success',
            text: '🎉 Pagamento PIX confirmado com sucesso via Banco Asaas!'
          });
          setTimeout(() => setBuyMsg(null), 5000);
        }}
      />

      {/* MODAL SELETOR DE FOTOS DE PERFIL */}
      <ProfilePhotoSelectorModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        currentPhotoUrl={user.profilePhotoUrl}
        onSelectPhoto={(photoUrl) => {
          storage.setUserProfilePhoto(user.id, photoUrl);
        }}
      />
    </div>
  );
};
