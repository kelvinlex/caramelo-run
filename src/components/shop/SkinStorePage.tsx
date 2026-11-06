import React, { useState } from 'react';
import {
  ShoppingBag,
  Sparkles,
  Check,
  Tag,
  Coins,
  ShieldCheck,
  Trophy,
  Flame,
  ArrowRight,
  ChevronRight,
  Zap,
  Gift
} from 'lucide-react';
import { storage } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import { User, Skin } from '../../types';
import { CarameloAvatar } from '../common/CarameloAvatar';
import { PixCheckoutModal } from '../payment/PixCheckoutModal';
import { SteelCornerBrackets, SteelRivet } from '../common/CartoonWoodUI';

interface SkinStorePageProps {
  currentUser: User | null;
  onNavigate: (view: 'home' | 'leaderboard' | 'profile' | 'admin' | 'game' | 'shop') => void;
  onOpenAuth: () => void;
}

export const SkinStorePage: React.FC<SkinStorePageProps> = ({
  currentUser,
  onNavigate,
  onOpenAuth,
}) => {
  const [filter, setFilter] = useState<'all' | 'coins' | 'pix'>('all');
  const [buyMsg, setBuyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<{
    title: string;
    priceBrl: number;
    tipoItem: 'SKIN' | 'PACOTE_MOEDAS' | 'PASSE_TEMPORADA';
    itemId?: string;
  } | null>(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  const skins = storage.getSkins();

  const filteredSkins = skins.filter((skin) => {
    if (filter === 'coins') return !skin.isRealMoneyOnly;
    if (filter === 'pix') return skin.isRealMoneyOnly;
    return true;
  });

  const handleBuySkin = (skin: Skin) => {
    sound.playClick();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (skin.isRealMoneyOnly) {
      setCheckoutItem({
        title: `Skin Exclusiva: ${skin.nome}`,
        priceBrl: skin.precoReais || 14.90,
        tipoItem: 'SKIN',
        itemId: skin.id
      });
      setIsPixModalOpen(true);
      return;
    }

    const res = storage.buySkin(skin.id);
    if (res.success) {
      sound.playWin();
      setBuyMsg({
        type: 'success',
        text: `🎉 Parabéns! A skin ${skin.nome} foi comprada e adicionada ao seu Guarda-Roupa!`
      });
    } else {
      sound.playClick();
      setBuyMsg({ type: 'error', text: res.error || 'Erro ao efetuar compra.' });
    }
    setTimeout(() => setBuyMsg(null), 5000);
  };

  const handleBuyCoinPackage = (title: string, priceBrl: number, itemId: string) => {
    sound.playCoin();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setCheckoutItem({
      title,
      priceBrl,
      tipoItem: 'PACOTE_MOEDAS',
      itemId
    });
    setIsPixModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in select-none max-w-full overflow-x-hidden">
      {/* STORE HERO BANNER (Cartoon Wood Board) */}
      <div className="relative cartoon-wood-board p-5 sm:p-8 md:p-10 shadow-[0_12px_30px_rgba(0,0,0,0.8)] overflow-hidden text-stone-100">
        <SteelCornerBrackets size="lg" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2.5 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 cartoon-steel-pill text-amber-300 font-mono text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" /> LOJA VIRTUAL DA QUEBRADA
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black cartoon-title-gold-3d tracking-tight">
              Skins Exclusivas & Pacotes
            </h1>
            <p className="text-xs sm:text-sm md:text-base font-semibold text-amber-100 max-w-xl">
              Personalize o Caramelo com os visuais mais estilosos da rua ou recarregue moedas via PIX com aprovação instantânea!
            </p>
          </div>

          {/* User Balance card com 3 tipos de dinheiro */}
          <div className="cartoon-navy-panel p-4 sm:p-5 relative shadow-xl flex flex-col items-center md:items-end text-center md:text-right w-full sm:w-auto min-w-0 sm:min-w-[280px]">
            <SteelCornerBrackets size="sm" />
            <span className="text-xs text-amber-300 font-black uppercase tracking-wider">Seu Saldo em Notas</span>
            <div className="flex items-center justify-center flex-wrap gap-2 my-2 cartoon-steel-pill px-3 py-2 w-full sm:w-auto shadow-inner">
              {/* 10 */}
              <div className="flex items-center gap-1.5">
                <img src="/dinheiro/icone_10_cutout.png" alt="10" className="w-5 h-3.5 object-contain drop-shadow" />
                <span className="text-xs sm:text-sm font-black text-emerald-300 font-mono">
                  {currentUser ? (currentUser.notas10 ?? 0).toLocaleString('pt-BR') : 0}
                </span>
              </div>
              {/* 50 */}
              <div className="flex items-center gap-1.5 border-l border-[#3a5375] pl-2">
                <img src="/dinheiro/icone_50_roxo_cutout.png" alt="50" className="w-5 h-3.5 object-contain drop-shadow" />
                <span className="text-xs sm:text-sm font-black text-purple-300 font-mono">
                  {currentUser ? (currentUser.notas50 ?? 0).toLocaleString('pt-BR') : 0}
                </span>
              </div>
              {/* 100 */}
              <div className="flex items-center gap-1.5 border-l border-[#3a5375] pl-2">
                <img src="/dinheiro/icone_100_vermelho_cutout.png" alt="100" className="w-5 h-3.5 object-contain drop-shadow" />
                <span className="text-xs sm:text-sm font-black text-cyan-200 font-mono">
                  {currentUser ? (currentUser.notas100 ?? 0).toLocaleString('pt-BR') : 0}
                </span>
              </div>
            </div>
            {currentUser ? (
              <span className="text-xs text-slate-300 font-black">
                Membro: @{currentUser.nickname}
              </span>
            ) : (
              <button
                onClick={onOpenAuth}
                className="mt-1 text-xs font-black text-amber-400 hover:underline cursor-pointer"
              >
                Entre na conta para comprar
              </button>
            )}
          </div>
        </div>
      </div>

      {buyMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-black text-center border-2 animate-in fade-in shadow-lg ${
            buyMsg.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500'
              : 'bg-red-950/90 text-red-300 border-red-500'
          }`}
        >
          {buyMsg.text}
        </div>
      )}

      {/* PACOTES DE MOEDAS VIA PIX */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-black text-white cartoon-title-3d">
              Recarga de OssoCoins (PIX Instantâneo)
            </h2>
          </div>
          <span className="text-xs text-emerald-300 font-mono font-black cartoon-steel-pill px-3 py-1 flex items-center gap-1 shadow-sm">
            <Zap className="w-3.5 h-3.5 fill-current" /> Entrega Automática via Asaas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pacote 1 */}
          <div className="cartoon-navy-panel p-6 flex flex-col justify-between relative shadow-lg">
            <SteelCornerBrackets size="sm" />
            <div>
              <span className="px-3 py-1 cartoon-steel-pill text-amber-300 text-[10px] font-black uppercase">
                Pacote Inicial
              </span>
              <div className="my-4 text-center">
                <span className="text-4xl">🦴</span>
                <h3 className="text-2xl font-black text-yellow-400 font-mono mt-2 drop-shadow">
                  5.000 OssoCoins
                </h3>
                <p className="text-xs text-slate-300 mt-1">Ideal para desbloquear skins raras</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t-2 border-[#2b3e58] flex items-center justify-between">
              <span className="text-lg font-black text-emerald-300 font-mono">R$ 9,90</span>
              <button
                onClick={() => handleBuyCoinPackage('Pacote 5.000 OssoCoins', 9.90, 'pkg-5000')}
                className="cartoon-btn-green px-4 py-2 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                COMPRAR PIX
              </button>
            </div>
          </div>

          {/* Pacote 2 - MAIS POPULAR (Cartoon Wood Board) */}
          <div className="cartoon-wood-board p-6 flex flex-col justify-between shadow-[0_10px_25px_rgba(0,0,0,0.7)] relative overflow-hidden">
            <SteelCornerBrackets size="sm" />
            <div className="absolute top-3 right-3 px-3 py-0.5 cartoon-gold-ribbon text-[#3d2002] font-black text-[10px] uppercase shadow-md">
              🔥 Mais Popular
            </div>

            <div className="z-10">
              <span className="px-3 py-1 cartoon-wood-plank text-amber-200 border border-[#523015] rounded-full text-[10px] font-black uppercase">
                Pacote Pro
              </span>
              <div className="my-4 text-center">
                <span className="text-5xl">🦴🦴</span>
                <h3 className="text-3xl font-black text-[#ffea85] font-mono mt-2 cartoon-title-gold-3d">
                  15.000 OssoCoins
                </h3>
                <p className="text-xs text-amber-200 mt-1 font-bold">+ Bônus de 2.000 moedas extras!</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t-2 border-[#5a3316] flex items-center justify-between z-10">
              <span className="text-xl font-black text-emerald-300 font-mono">R$ 24,90</span>
              <button
                onClick={() => handleBuyCoinPackage('Pacote 15.000 OssoCoins', 24.90, 'pkg-15000')}
                className="cartoon-btn-gold px-5 py-2.5 text-[#3d2002] font-black rounded-xl text-xs shadow-lg transition-all cursor-pointer"
              >
                COMPRAR PIX
              </button>
            </div>
          </div>

          {/* Pacote 3 - MELHOR VALOR */}
          <div className="cartoon-navy-panel p-6 flex flex-col justify-between relative shadow-lg">
            <SteelCornerBrackets size="sm" />
            <div>
              <span className="px-3 py-1 cartoon-steel-pill text-purple-300 text-[10px] font-black uppercase">
                👑 Pacote Ostentação
              </span>
              <div className="my-4 text-center">
                <span className="text-4xl">👑🦴</span>
                <h3 className="text-2xl font-black text-yellow-400 font-mono mt-2 drop-shadow">
                  50.000 OssoCoins
                </h3>
                <p className="text-xs text-slate-300 mt-1">Garante todas as skins lendárias da loja</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t-2 border-[#2b3e58] flex items-center justify-between">
              <span className="text-lg font-black text-emerald-300 font-mono">R$ 59,90</span>
              <button
                onClick={() => handleBuyCoinPackage('Pacote 50.000 OssoCoins', 59.90, 'pkg-50000')}
                className="cartoon-btn-green px-4 py-2 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                COMPRAR PIX
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SKINS CATALOG FILTER & GRID */}
      <div className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-[#2b3e58] pb-4">
          <div>
            <h2 className="text-xl font-black text-white cartoon-title-3d flex items-center gap-2">
              🐕 Catálogo de Skins
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Escolha seu visual favorito para o Caramelo brilhar nas corridas da quebrada.
            </p>
          </div>

          {/* Filter Pills (Beveled Cartoon Buttons) */}
          <div className="flex items-center gap-2 cartoon-steel-pill p-1">
            {[
              { id: 'all', label: 'Todas as Skins' },
              { id: 'coins', label: 'OssoCoins 🦴' },
              { id: 'pix', label: 'Exclusivas PIX ⚡' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  sound.playClick();
                  setFilter(f.id as any);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  filter === f.id
                    ? 'cartoon-btn-gold text-[#3d2002]'
                    : 'text-slate-300 hover:text-white hover:bg-[#1f314c]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* SKINS GRID (Cartoon Navy Panels with Steel Brackets) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSkins.map((skin) => {
            const isOwned = currentUser?.inventarioSkinIds.includes(skin.id);
            const isEquipped = currentUser?.skinEquipadaId === skin.id;

            return (
              <div
                key={skin.id}
                className={`cartoon-navy-panel p-5 flex flex-col justify-between transition-all relative overflow-hidden shadow-lg ${
                  isEquipped
                    ? 'ring-4 ring-amber-400 border-[#ffbe3b]'
                    : isOwned
                    ? 'border-emerald-700/80'
                    : 'hover:border-slate-500'
                }`}
              >
                <SteelCornerBrackets size="sm" />

                {/* Badge */}
                <div className="flex items-center justify-between mb-3 z-10">
                  <span
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${
                      skin.tipo === 'Lendária'
                        ? 'cartoon-gold-ribbon text-[#3d2002]'
                        : skin.tipo === 'Especial'
                        ? 'cartoon-btn-purple text-white'
                        : skin.tipo === 'Rara'
                        ? 'cartoon-btn-blue text-white'
                        : 'cartoon-steel-pill text-slate-200'
                    }`}
                  >
                    {skin.tipo}
                  </span>

                  {isOwned ? (
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" /> NA COLEÇÃO
                    </span>
                  ) : skin.emPromocao ? (
                    <span className="text-[10px] bg-red-950 text-red-300 border border-red-500 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 shadow-sm">
                      <Tag className="w-3 h-3" /> PROMO -{skin.descontoPercentual}%
                    </span>
                  ) : null}
                </div>

                {/* Visual Avatar */}
                <div className="flex items-center justify-center py-6 bg-[#0a121e]/80 rounded-2xl mb-4 border-2 border-[#1e2f47] shadow-inner z-10">
                  <CarameloAvatar skin={skin} size="lg" isAnimated={true} />
                </div>

                {/* Info */}
                <div className="mb-4 space-y-1 z-10">
                  <h3 className="font-black text-white text-lg flex items-center gap-1.5 cartoon-title-3d">
                    {skin.nome}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 font-medium">
                    {skin.descricao}
                  </p>
                  {skin.desbloqueioPorConquista && (
                    <p className="text-[11px] text-amber-300 font-bold pt-1 flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-400" /> Requisito: {skin.desbloqueioPorConquista}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="z-10">
                  {isOwned ? (
                    <button
                      onClick={() => onNavigate('profile')}
                      className="w-full py-2.5 cartoon-btn-steel text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <span>{isEquipped ? '✓ EQUIPADO NO GUARDA-ROUPA' : 'VER NO GUARDA-ROUPA'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuySkin(skin)}
                      className="w-full py-2.5 cartoon-btn-gold text-[#3d2002] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      {skin.isRealMoneyOnly ? (
                        <span>COMPRAR POR R$ {skin.precoReais.toFixed(2)} (PIX)</span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          {skin.tipo === 'Lendária' || skin.tipo === 'Mítica' ? (
                            <>
                              <span>COMPRAR •</span>
                              <img src="/dinheiro/icone_100_vermelho_cutout.png" alt="100" className="w-4 h-3 object-contain drop-shadow" />
                              <span>{skin.precoNotas100 ?? Math.max(1, Math.floor(skin.precoMoedas / 1000))} notas de 100</span>
                            </>
                          ) : skin.tipo === 'Rara' || skin.tipo === 'Especial' ? (
                            <>
                              <span>COMPRAR •</span>
                              <img src="/dinheiro/icone_50_roxo_cutout.png" alt="50" className="w-4 h-3 object-contain drop-shadow" />
                              <span>{skin.precoNotas50 ?? Math.max(5, Math.floor(skin.precoMoedas / 50))} notas de 50</span>
                            </>
                          ) : (
                            <>
                              <span>COMPRAR •</span>
                              <img src="/dinheiro/icone_10_cutout.png" alt="10" className="w-4 h-3 object-contain drop-shadow" />
                              <span>{skin.precoNotas10 ?? Math.max(10, Math.floor(skin.precoMoedas / 10))} notas de 10</span>
                            </>
                          )}
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

      {/* PIX CHECKOUT MODAL */}
      <PixCheckoutModal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        item={checkoutItem}
        currentUser={currentUser}
        onSuccess={() => {
          setBuyMsg({
            type: 'success',
            text: '🎉 Pagamento PIX aprovado com sucesso via Banco Asaas!'
          });
          setTimeout(() => setBuyMsg(null), 5000);
        }}
      />
    </div>
  );
};
