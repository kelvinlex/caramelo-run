import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Search,
  Award,
  Sparkles,
  Flame,
  Eye,
  Crown,
  Medal,
  Bike,
  Zap,
  TrendingUp,
  MapPin,
  ShieldAlert
} from 'lucide-react';
import { API_BASE_URL } from '../../services/apiService';
import { storage } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import { User, Skin } from '../../types';
import { CarameloAvatar } from '../common/CarameloAvatar';
import { SteelCornerBrackets, SteelRivet } from '../common/CartoonWoodUI';

interface LeaderboardViewProps {
  onSelectPlayer: (user: User) => void;
}

type LeaderboardCategory = 'points' | 'bites' | 'dodges' | 'distance';

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onSelectPlayer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<LeaderboardCategory>('points');
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const skins = storage.getSkins();

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_BASE_URL}/leaderboard`)
      .then((res) => {
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
          throw new Error('Offline fallback');
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((u: any) => ({
            ...u,
            stats: {
              maiorPontuacao: u.maiorPontuacao || u.stats?.maiorPontuacao || 0,
              motoqueirosMordidos: u.motoqueirosMordidos || u.stats?.motoqueirosMordidos || 0,
              chinelosDesviados: u.chinelosDesviados || u.stats?.chinelosDesviados || 0,
              distanciaKm: u.distanciaKm || u.stats?.distanciaKm || 0,
              statusQuebrada: u.statusQuebrada || u.stats?.statusQuebrada || 'Filhote'
            }
          }));
          setLeaderboard(formatted);
        } else {
          setLeaderboard(storage.getUsers());
        }
      })
      .catch(() => {
        // Fallback robusto para dados do storage local
        setLeaderboard(storage.getUsers());
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const getSkin = (skinId: string): Skin => {
    return skins.find((s) => s.id === skinId) || skins[0];
  };

  // Ordenação dinâmica pela categoria selecionada
  const sortedList = useMemo(() => {
    const list = [...leaderboard];
    return list.sort((a, b) => {
      if (category === 'points') {
        return (b.stats.maiorPontuacao || 0) - (a.stats.maiorPontuacao || 0);
      }
      if (category === 'bites') {
        return (b.stats.motoqueirosMordidos || 0) - (a.stats.motoqueirosMordidos || 0);
      }
      if (category === 'dodges') {
        return (b.stats.chinelosDesviados || 0) - (a.stats.chinelosDesviados || 0);
      }
      if (category === 'distance') {
        return (b.stats.distanciaKm || 0) - (a.stats.distanciaKm || 0);
      }
      return 0;
    });
  }, [leaderboard, category]);

  // Filtro de busca reativa
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return sortedList;
    const term = searchTerm.toLowerCase();
    return sortedList.filter(
      (u) =>
        u.nickname.toLowerCase().includes(term) ||
        (u.stats.statusQuebrada && u.stats.statusQuebrada.toLowerCase().includes(term))
    );
  }, [sortedList, searchTerm]);

  const top1 = filteredList[0];
  const top2 = filteredList[1];
  const top3 = filteredList[2];
  const restList = filteredList.slice(3);

  const getCategoryMetric = (user: User) => {
    if (category === 'points') {
      return `${user.stats.maiorPontuacao.toLocaleString('pt-BR')} PTS`;
    }
    if (category === 'bites') {
      return `${user.stats.motoqueirosMordidos.toLocaleString('pt-BR')} MORDIDAS`;
    }
    if (category === 'dodges') {
      return `${user.stats.chinelosDesviados.toLocaleString('pt-BR')} DESVIOS`;
    }
    return `${(user.stats.distanciaKm || 0).toFixed(1)} KM`;
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in text-stone-100 max-w-full overflow-x-hidden">
      {/* Header Estilo Cartoon Wood & Steel */}
      <div className="text-center space-y-3 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 cartoon-wood-plank text-amber-200 border-2 border-[#543015] rounded-xl text-xs font-black uppercase tracking-wider shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="truncate">CIRCUITO OFICIAL DA QUEBRADA</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] flex-shrink-0" />
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white cartoon-title-3d uppercase tracking-tight">
          RANKING <span className="cartoon-title-gold-3d">GLOBAL DOS PILOTOS</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto font-medium leading-relaxed px-2">
          Veja quem domina o asfalto: maiores pontuações, fugas radicais na CG e predadores de canela do Brasil!
        </p>

        {/* Abas Dinâmicas de Filtro (Botões Cartoon 3D) */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 pt-3 w-full">
          <button
            onClick={() => {
              sound.playClick();
              setCategory('points');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
              category === 'points'
                ? 'cartoon-btn-gold text-[#3d2002] scale-105'
                : 'cartoon-btn-steel text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 flex-shrink-0 text-amber-300" />
            <span className="truncate">Maior Pontuação</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setCategory('bites');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
              category === 'bites'
                ? 'cartoon-btn-red text-white scale-105'
                : 'cartoon-btn-steel text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 flex-shrink-0 text-red-300" />
            <span className="truncate">Mordidas</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setCategory('dodges');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
              category === 'dodges'
                ? 'cartoon-btn-blue text-white scale-105'
                : 'cartoon-btn-steel text-white'
            }`}
          >
            <Bike className="w-3.5 h-3.5 flex-shrink-0 text-cyan-300" />
            <span className="truncate">No Grau & Desvios</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setCategory('distance');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
              category === 'distance'
                ? 'cartoon-btn-green text-white scale-105'
                : 'cartoon-btn-steel text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 text-emerald-300" />
            <span className="truncate">Km Percorridos</span>
          </button>
        </div>
      </div>

      {/* PÓDIO DINÂMICO 3D (TOP 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 pt-2 items-end">
        {/* 🥈 2º LUGAR (PRATA METÁLICA) */}
        {top2 && (
          <div
            onClick={() => {
              sound.playClick();
              onSelectPlayer(top2);
            }}
            className="order-2 md:order-1 cartoon-navy-panel p-5 flex flex-col items-center text-center shadow-xl transition-all cursor-pointer hover:scale-[1.02] relative"
          >
            <SteelCornerBrackets size="sm" />
            <div className="px-4 py-1 cartoon-steel-pill text-slate-100 text-xs font-black mb-3 uppercase tracking-wider shadow-md flex items-center gap-1.5 z-10">
              <span>🥈</span>
              <span>2º LUGAR</span>
            </div>

            <div className="relative mb-3 z-10">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-300 shadow-md bg-zinc-950 flex items-center justify-center">
                {top2.profilePhotoUrl ? (
                  <img
                    src={top2.profilePhotoUrl}
                    alt={top2.nickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <CarameloAvatar skin={getSkin(top2.skinEquipadaId)} size="md" isAnimated={true} />
                )}
              </div>
            </div>

            <h3 className="font-black text-white text-base z-10">
              @{top2.nickname}
            </h3>

            <div className="font-mono font-black text-lg text-slate-200 mt-1 z-10">
              {getCategoryMetric(top2)}
            </div>

            <div className="text-[11px] text-slate-400 mt-0.5 font-medium z-10">
              Skin: {getSkin(top2.skinEquipadaId).nome}
            </div>

            <div className="mt-3 text-[10px] text-slate-200 font-black cartoon-steel-pill px-3 py-1 z-10">
              {top2.stats.statusQuebrada || 'Piloto de Respeito'}
            </div>
          </div>
        )}

        {/* 🥇 1º LUGAR (OURO CAMPEÃO ALFA - CARTOON WOOD BOARD) */}
        {top1 && (
          <div
            onClick={() => {
              sound.playWin();
              onSelectPlayer(top1);
            }}
            className="order-1 md:order-2 cartoon-wood-board p-6 flex flex-col items-center text-center shadow-[0_15px_35px_rgba(245,158,11,0.4)] transition-all cursor-pointer hover:scale-[1.03] md:-translate-y-4 relative ring-4 ring-amber-400/50"
          >
            <SteelCornerBrackets size="md" />

            <div className="px-4 py-1.5 cartoon-gold-ribbon text-[#3d2002] text-xs font-black rounded-full mb-3 uppercase tracking-wider shadow-lg flex items-center gap-1.5 z-10">
              <Crown className="w-4 h-4 fill-current" />
              <span>1º LUGAR • CAMPEÃO ALFA</span>
            </div>

            <div className="relative mb-3 z-10">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-[#fff0a8] shadow-[0_0_20px_rgba(251,191,36,0.7)] bg-zinc-950 flex items-center justify-center">
                {top1.profilePhotoUrl ? (
                  <img
                    src={top1.profilePhotoUrl}
                    alt={top1.nickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <CarameloAvatar skin={getSkin(top1.skinEquipadaId)} size="lg" isAnimated={true} />
                )}
              </div>
              <span className="absolute -top-3 -right-3 text-2xl filter drop-shadow">👑</span>
            </div>

            <h3 className="font-black text-[#ffea85] text-xl cartoon-title-gold-3d tracking-tight z-10">
              @{top1.nickname}
            </h3>

            <div className="font-mono font-black text-2xl text-yellow-300 mt-1 drop-shadow z-10">
              {getCategoryMetric(top1)}
            </div>

            <div className="text-xs text-amber-200 mt-0.5 font-bold z-10">
              Skin: {getSkin(top1.skinEquipadaId).nome}
            </div>

            <div className="mt-3 text-xs text-[#3d2002] font-black cartoon-btn-gold px-4 py-1.5 rounded-xl shadow-md uppercase tracking-wider z-10">
              👑 {top1.stats.statusQuebrada || 'Lenda do Asfalto'}
            </div>
          </div>
        )}

        {/* 🥉 3º LUGAR (BRONZE RELUZENTE) */}
        {top3 && (
          <div
            onClick={() => {
              sound.playClick();
              onSelectPlayer(top3);
            }}
            className="order-3 cartoon-navy-panel p-5 flex flex-col items-center text-center shadow-xl transition-all cursor-pointer hover:scale-[1.02] relative"
          >
            <SteelCornerBrackets size="sm" />
            <div className="px-4 py-1 cartoon-wood-plank text-amber-300 text-xs font-black mb-3 uppercase tracking-wider shadow-md flex items-center gap-1.5 z-10">
              <span>🥉</span>
              <span>3º LUGAR</span>
            </div>

            <div className="relative mb-3 z-10">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-600 shadow-md bg-zinc-950 flex items-center justify-center">
                {top3.profilePhotoUrl ? (
                  <img
                    src={top3.profilePhotoUrl}
                    alt={top3.nickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <CarameloAvatar skin={getSkin(top3.skinEquipadaId)} size="md" isAnimated={true} />
                )}
              </div>
            </div>

            <h3 className="font-black text-white text-base z-10">
              @{top3.nickname}
            </h3>

            <div className="font-mono font-black text-lg text-amber-400 mt-1 z-10">
              {getCategoryMetric(top3)}
            </div>

            <div className="text-[11px] text-slate-400 mt-0.5 font-medium z-10">
              Skin: {getSkin(top3.skinEquipadaId).nome}
            </div>

            <div className="mt-3 text-[10px] text-amber-300 font-black cartoon-steel-pill px-3 py-1 z-10">
              {top3.stats.statusQuebrada || 'Cachorro Esperto'}
            </div>
          </div>
        )}
      </div>

      {/* BARRA DE PESQUISA INSTANTÂNEA REATIVA (Cartoon Navy Panel) */}
      <div className="cartoon-navy-panel p-3 sm:p-4 flex items-center gap-3 shadow-md relative">
        <SteelCornerBrackets size="sm" />
        <span className="text-xs font-black uppercase tracking-wider text-amber-300 whitespace-nowrap pl-2 hidden sm:inline z-10">
          Buscar Piloto:
        </span>
        <div className="relative flex-1 z-10">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Digite o Nickname para filtrar o ranking em tempo real..."
            className="w-full bg-[#0a121e] border-2 border-[#2b3e58] rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#ffbe3b] transition-colors font-medium shadow-inner"
          />
        </div>
        <div className="text-xs font-mono font-black text-amber-300 px-3 py-1 cartoon-steel-pill whitespace-nowrap z-10">
          {filteredList.length} pilotos
        </div>
      </div>

      {/* TABELA DE CLASSIFICAÇÃO GERAL (4º AO ÚLTIMO) */}
      <div className="cartoon-navy-panel rounded-3xl overflow-hidden shadow-2xl relative">
        <SteelCornerBrackets size="md" />

        <div className="p-4 bg-[#101b2a] border-b-2 border-[#2b3e58] flex items-center justify-between z-10 relative">
          <h3 className="font-black text-white text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="cartoon-title-3d">Tabela Geral da Temporada</span>
          </h3>
          <span className="text-xs text-slate-300 font-mono font-black cartoon-steel-pill px-3 py-1">
            Mostrando {filteredList.length} posições
          </span>
        </div>

        <div className="overflow-x-auto w-full z-10 relative">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b-2 border-[#24354c] text-amber-300 uppercase tracking-wider text-[10px] sm:text-[11px] font-black bg-[#0d1624]">
                <th className="py-3 px-3 sm:px-4">Posição</th>
                <th className="py-3 px-3 sm:px-4">Jogador / Skin</th>
                <th className="py-3 px-3 sm:px-4">Pontuação</th>
                <th className="py-3 px-3 sm:px-4">Mordidas</th>
                <th className="py-3 px-3 sm:px-4 hidden md:table-cell">No Grau & Desvios</th>
                <th className="py-3 px-3 sm:px-4 hidden sm:table-cell">Distância</th>
                <th className="py-3 px-3 sm:px-4 text-right hidden sm:table-cell">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2f47] text-slate-200">
              {filteredList.map((player, idx) => {
                const skin = getSkin(player.skinEquipadaId);
                const rank = idx + 1;

                return (
                  <tr
                    key={player.id}
                    onClick={() => {
                      sound.playClick();
                      onSelectPlayer(player);
                    }}
                    className={`hover:bg-[#1a2b42]/80 transition-colors cursor-pointer ${
                      rank === 1
                        ? 'bg-[#ffbe3b]/10 font-semibold'
                        : rank === 2
                        ? 'bg-slate-400/10'
                        : rank === 3
                        ? 'bg-amber-800/15'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-3 sm:px-4 font-mono font-black text-xs sm:text-sm">
                      {rank === 1 && <span className="text-amber-300 font-black">🥇 #1</span>}
                      {rank === 2 && <span className="text-slate-200 font-black">🥈 #2</span>}
                      {rank === 3 && <span className="text-amber-500 font-black">🥉 #3</span>}
                      {rank > 3 && <span className="text-slate-400 font-bold">#{rank}</span>}
                    </td>

                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden border-2 border-[#3b597c] shadow-md flex-shrink-0 bg-zinc-900 flex items-center justify-center">
                          {player.profilePhotoUrl ? (
                            <img
                              src={player.profilePhotoUrl}
                              alt={player.nickname}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <CarameloAvatar skin={skin} size="sm" isAnimated={false} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-white flex items-center gap-1 text-xs sm:text-sm truncate">
                            <span className="truncate">@{player.nickname}</span>
                            {rank === 1 && <Crown className="w-3.5 h-3.5 text-amber-400 fill-current flex-shrink-0" />}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-400 truncate font-medium">{skin.nome}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 sm:px-4 font-mono font-black text-[#ffea85] text-xs sm:text-sm whitespace-nowrap">
                      {player.stats.maiorPontuacao.toLocaleString('pt-BR')} pts
                    </td>

                    <td className="py-3 px-3 sm:px-4 font-mono text-red-400 font-black text-xs sm:text-sm whitespace-nowrap">
                      {player.stats.motoqueirosMordidos} 🛵
                    </td>

                    <td className="py-3 px-3 sm:px-4 font-mono text-cyan-400 font-black text-xs sm:text-sm hidden md:table-cell">
                      {player.stats.chinelosDesviados || 0}
                    </td>

                    <td className="py-3 px-3 sm:px-4 font-mono text-emerald-400 font-black text-xs sm:text-sm hidden sm:table-cell">
                      {(player.stats.distanciaKm || 0).toFixed(1)} km
                    </td>

                    <td className="py-3 px-3 sm:px-4 text-right hidden sm:table-cell">
                      <button className="px-3 py-1.5 cartoon-btn-steel text-white rounded-xl text-xs font-black flex items-center gap-1.5 ml-auto transition-all cursor-pointer shadow-sm">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Perfil</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
