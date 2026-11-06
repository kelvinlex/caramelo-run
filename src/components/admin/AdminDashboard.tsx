import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  ShoppingBag,
  ShieldAlert,
  Database,
  Code,
  LogOut,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Ban,
  Tag,
  Edit,
  UserCheck,
  Image as ImageIcon
} from 'lucide-react';
import { storage } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import { API_BASE_URL } from '../../services/apiService';
import { User, Skin } from '../../types';
import { UserManagementTab } from './UserManagementTab';
import { FinanceTab } from './FinanceTab';
import { EconomyTab } from './EconomyTab';
import { GameOverImagesTab } from './GameOverImagesTab';
import { AntiCheatTab } from './AntiCheatTab';
import { SqlExportTab } from './SqlExportTab';
import { ApiDocsTab } from './ApiDocsTab';
import { CarameloAvatar } from '../common/CarameloAvatar';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onGoToPortal: () => void;
  onInspectUser?: (user: User) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onLogout,
  onGoToPortal,
  onInspectUser,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'finance' | 'economy' | 'images' | 'anticheat' | 'sql' | 'api'
  >('overview');

  const [metrics, setMetrics] = useState({
    jogadoresAtivos: 0,
    receitaDoDiaBrl: 0,
    novosCadastrosHoje: 0,
    antiCheatAlerts: 0
  });
  const [skins, setSkins] = useState<Skin[]>([]);
  const [antiCheatLogs, setAntiCheatLogs] = useState<any[]>([]);

  React.useEffect(() => {
    // Busca as métricas
    fetch(`${API_BASE_URL}/admin/metrics`)
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error('Erro metrics:', err));

    // Busca as skins
    fetch(`${API_BASE_URL}/admin/skins`)
      .then(res => res.json())
      .then(data => setSkins(data))
      .catch(err => console.error('Erro skins:', err));

    // Busca logs anti-cheat
    fetch(`${API_BASE_URL}/admin/anticheat`)
      .then(res => res.json())
      .then(data => setAntiCheatLogs(data))
      .catch(err => console.error('Erro anticheat:', err));
  }, []);

  const handleBanFast = async (logId: string, playerId: string) => {
    sound.playBark();
    
    try {
      await fetch(`${API_BASE_URL}/admin/users/${playerId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Banido rapidamente via Visão Geral Root.' })
      });
      
      // Atualiza visualmente
      setAntiCheatLogs(prev => 
        prev.map(l => l.id === logId ? { ...l, status: 'Banido' } : l)
      );
    } catch (err) {
      console.error('Erro ao banir:', err);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950">
      {/* Top Header matching exact mockup */}
      <header className="border-b border-stone-800 bg-stone-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
              🐕
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold font-fun text-lg md:text-xl text-amber-400 tracking-wide">
                  VIRA-LATA RUN
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-950/80 text-red-400 border border-red-800 uppercase">
                  CONTROL PANEL ({currentUser.role.toUpperCase()})
                </span>
              </div>
              <p className="text-[11px] text-stone-400 hidden sm:block">
                INTERFACE DE GESTÃO DO APLICATIVO E ECONOMIA LIVEOPS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoToPortal}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 rounded-xl text-xs font-bold transition-all"
            >
              🌐 Ver Portal Público
            </button>

            <div className="flex items-center gap-2 bg-stone-800/80 px-3 py-1.5 rounded-xl border border-stone-700">
              <span className="text-xs">👤</span>
              <span className="text-xs font-bold text-stone-200">
                {currentUser.nickname}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-extrabold">
                {currentUser.role}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
              title="Encerrar Sessão"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs Bar */}
        <div className="border-t border-stone-800/80 bg-stone-950/60 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 overflow-x-auto py-2">
            {[
              { id: 'overview', label: '📊 Dashboard', icon: LayoutDashboard },
              { id: 'users', label: '👥 Jogadores', icon: Users },
              { id: 'finance', label: '💰 Financeiro', icon: DollarSign },
              { id: 'economy', label: '🐕 Loja/Skins', icon: ShoppingBag },
              { id: 'images', label: '🖼️ Imagens', icon: ImageIcon },
              { id: 'anticheat', label: '🚨 Anti-Cheat', icon: ShieldAlert },
              { id: 'sql', label: '💾 phpMyAdmin SQL', icon: Database },
              { id: 'api', label: '🏗️ Configs & API', icon: Code },
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
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold font-fun flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Admin Content View */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* OVERVIEW / DASHBOARD TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in">
            {/* 1. VISÃO GERAL (Métricas em Tempo Real) */}
            <div>
              <h3 className="text-base font-extrabold text-stone-300 uppercase tracking-wider font-fun mb-3 flex items-center gap-2">
                📈 VISÃO GERAL (Métricas em Tempo Real)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
                  <div className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">
                    JOGADORES ATIVOS
                  </div>
                  <div className="text-3xl font-black text-amber-400 font-mono">
                    {metrics.jogadoresAtivos.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1">usuários na quebrada</div>
                </div>

                <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
                  <div className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">
                    RECEITA DO DIA
                  </div>
                  <div className="text-3xl font-black text-emerald-400 font-mono">
                    R$ {metrics.receitaDoDiaBrl.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-emerald-400/80 mt-1">+18% vs. meta diária</div>
                </div>

                <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
                  <div className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">
                    NOVOS CADASTROS
                  </div>
                  <div className="text-3xl font-black text-blue-400 font-mono">
                    +{metrics.novosCadastrosHoje}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1">novos vira-latas hoje</div>
                </div>

                <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
                  <div className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">
                    ALERTAS ANTI-CHEAT
                  </div>
                  <div className="text-3xl font-black text-red-400 font-mono">
                    {antiCheatLogs.filter(l => l.status === 'Suspeito').length}
                  </div>
                  <div className="text-[11px] text-red-400/80 mt-1">pontuações em análise</div>
                </div>
              </div>
            </div>

            {/* 2. ECONOMIA DO GAME (LIVE OPS PREVIEW) */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between">
                <h4 className="text-sm font-bold text-amber-400 font-fun flex items-center gap-2">
                  🛒 ECONOMIA DO GAME (LIVE OPS)
                </h4>
                <button
                  onClick={() => setActiveTab('economy')}
                  className="text-xs text-amber-400 hover:underline font-fun"
                >
                  Gerenciar Catálogo Completo →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">SKIN NOME</th>
                      <th className="py-3 px-4">TIPO</th>
                      <th className="py-3 px-4">PREÇO ATUAL (MOEDAS / REAIS)</th>
                      <th className="py-3 px-4 text-right">AÇÃO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 text-stone-300">
                    {skins.slice(0, 4).map((s) => (
                      <tr key={s.id} className="hover:bg-stone-800/40">
                        <td className="py-3 px-4 font-bold text-stone-100 flex items-center gap-2">
                          <CarameloAvatar skin={s} size="sm" isAnimated={false} />
                          <span>{s.nome}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-stone-800 border border-stone-700">
                            {s.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-yellow-400">
                          {s.isRealMoneyOnly ? `R$ ${s.precoReais.toFixed(2)} (Dinheiro)` : `${s.precoMoedas.toLocaleString('pt-BR')} OssoCoins`}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setActiveTab('economy')}
                            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            ✏️ Alterar Valor
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. ALERTA DE ANTI-CHEAT (ÚLTIMAS PONTUAÇÕES SUSPEITAS) */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between">
                <h4 className="text-sm font-bold text-red-400 font-fun flex items-center gap-2">
                  🚨 ALERTA DE ANTI-CHEAT (Últimas Pontuações Suspeitas)
                </h4>
                <button
                  onClick={() => setActiveTab('anticheat')}
                  className="text-xs text-red-400 hover:underline font-fun"
                >
                  Ver Todos os Logs →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">PLAYER ID</th>
                      <th className="py-3 px-4">NICKNAME</th>
                      <th className="py-3 px-4">SCORE OBTIDO</th>
                      <th className="py-3 px-4">STATUS</th>
                      <th className="py-3 px-4 text-right">AÇÃO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 text-stone-300">
                    {antiCheatLogs.slice(0, 3).map((log) => (
                      <tr key={log.id} className="hover:bg-stone-800/40">
                        <td className="py-3 px-4 font-mono text-stone-500">{log.playerId}</td>
                        <td className="py-3 px-4 font-bold text-stone-200">@{log.nickname}</td>
                        <td className="py-3 px-4 font-mono font-bold text-red-400">
                          {log.scoreObtido.toLocaleString('pt-BR')} pts
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-950/60 text-red-400 border border-red-800">
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {log.status !== 'Banido' ? (
                            <button
                              onClick={() => handleBanFast(log.id, log.playerId)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" /> 🔨 BANIR
                            </button>
                          ) : (
                            <span className="text-xs text-stone-500">Banido</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TABS */}
        {activeTab === 'users' && <UserManagementTab currentUser={currentUser} onInspectUser={onInspectUser} />}
        {activeTab === 'finance' && <FinanceTab />}
        {activeTab === 'economy' && <EconomyTab />}
        {activeTab === 'images' && <GameOverImagesTab />}
        {activeTab === 'anticheat' && <AntiCheatTab />}
        {activeTab === 'sql' && <SqlExportTab />}
        {activeTab === 'api' && <ApiDocsTab />}
      </main>
    </div>
  );
};
