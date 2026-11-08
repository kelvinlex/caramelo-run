import React, { useState } from 'react';
import { Search, Shield, Ban, CheckCircle, Coins, Award, UserCheck, AlertTriangle, Sparkles, Infinity as InfinityIcon } from 'lucide-react';
import { storage, isInfiniteMoneyUser } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import { API_BASE_URL } from '../../services/apiService';
import { User, UserRole, AccountStatus } from '../../types';

interface UserManagementTabProps {
  currentUser: User | null;
  onInspectUser?: (user: User) => void;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({ currentUser, onInspectUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [coinAmount, setCoinAmount] = useState(500);
  const [banReason, setBanReason] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);

  const [users, setUsers] = useState<any[]>(() => {
    return storage.getUsers().map((u: any) => ({
      ...u,
      stats: {
        maiorPontuacao: u.stats?.maiorPontuacao || 0,
        motoqueirosMordidos: u.stats?.motoqueirosMordidos || 0,
        chinelosDesviados: u.stats?.chinelosDesviados || 0,
        distanciaKm: u.stats?.distanciaKm || 0,
        statusQuebrada: u.stats?.statusQuebrada || 'Filhote'
      }
    }));
  });

  React.useEffect(() => {
    fetch(`${API_BASE_URL}/admin/users`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((u: any) => ({
            ...u,
            hasInfiniteCoins: u.hasInfiniteCoins ?? isInfiniteMoneyUser(u),
            ossoCoins: isInfiniteMoneyUser(u) ? 999999999 : (u.ossoCoins ?? 0),
            stats: {
              maiorPontuacao: u.maiorPontuacao || 0,
              motoqueirosMordidos: u.motoqueirosMordidos || 0,
              chinelosDesviados: u.chinelosDesviados || 0,
              distanciaKm: u.distanciaKm || 0,
              statusQuebrada: u.statusQuebrada || 'Filhote'
            }
          }));
          setUsers(formatted);
        }
      })
      .catch(err => {
        // Fallback no storage local já carregado
      });
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    sound.playClick();
    // Por enquanto mockamos no state, precisaria de uma rota PUT /api/admin/users/:id/role
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const handleStatusChange = async (userId: string, newStatus: AccountStatus, reason?: string) => {
    sound.playBark();
    try {
      if (newStatus === 'Banido') {
        await fetch(`${API_BASE_URL}/admin/users/${userId}/ban`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason })
        });
      }
      // Mock do state para Desbanir/Suspender
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      setShowBanModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCoins = async (userId: string, delta: number) => {
    sound.playCoin();
    try {
      await fetch(`${API_BASE_URL}/admin/users/${userId}/add-coins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: delta })
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ossoCoins: u.ossoCoins + delta } : u));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Barra de Destaque MODO ADM — Valdir, Kelvin e Gui com Dinheiro Infinito */}
      <div className="bg-gradient-to-r from-amber-950/90 via-stone-900 to-emerald-950/90 border-2 border-amber-500/70 p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-amber-200 uppercase tracking-wide">
                MODO ADM — DINHEIRO INFINITO ATIVO
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <InfinityIcon className="w-3 h-3" /> ATIVADO
              </span>
            </div>
            <p className="text-xs text-amber-100/80 font-medium mt-0.5">
              As contas de desenvolvimento <strong className="text-amber-300 font-bold">Valdir</strong>, <strong className="text-amber-300 font-bold">Kelvin</strong> e <strong className="text-amber-300 font-bold">Gui (Guilherme)</strong> possuem Saldo Infinito (999.999.999), todas as notas e cargo Administrador.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {[
            { id: 'usr-valdir-01', label: 'Valdir' },
            { id: 'usr-kelvin-01', label: 'Kelvin' },
            { id: 'usr-guilherme-01', label: 'Gui' },
          ].map((item) => {
            const admUser = users.find((u) => u.id === item.id);
            const isCurrent = currentUser?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  sound.playClick();
                  storage.loginAsUser(item.id);
                  window.location.reload();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-600 text-white border-2 border-emerald-300 scale-105'
                    : 'bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-600/70 hover:scale-[1.02]'
                }`}
                title={`Entrar na conta de ${item.label} com Dinheiro Infinito`}
              >
                <span>{isCurrent ? '✓' : '👤'}</span>
                <span>{item.label}</span>
                <span className="text-[11px] font-mono text-yellow-300 font-black">∞</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-stone-900/90 border border-stone-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nick, email ou ID..."
            className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-10 pr-4 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 font-semibold">Cargo:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todos os Cargos</option>
              <option value="root">👑 Root</option>
              <option value="admin">🛡️ Admin</option>
              <option value="player">🐕 Player</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Todos os Status</option>
              <option value="Ativo">Ativo</option>
              <option value="Suspenso">Suspenso</option>
              <option value="Banido">Banido</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-stone-950/80 border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3.5 px-4">Jogador / ID</th>
                <th className="py-3.5 px-4">Permissão (RBAC)</th>
                <th className="py-3.5 px-4">Pontuação / Canelas</th>
                <th className="py-3.5 px-4">Saldo Moedas</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações de Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {filteredUsers.map((user) => {
                const isRootUser = user.role === 'root';
                const isBan = user.status === 'Banido';

                return (
                  <tr key={user.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-base">
                          {user.role === 'root' ? '👑' : user.role === 'admin' ? '🛡️' : '🐕'}
                        </div>
                        <div>
                          <div className="font-bold text-stone-100 flex items-center gap-1.5">
                            <span>{user.nickname}</span>
                            {user.isGuest && (
                              <span className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded">
                                Convidado
                              </span>
                            )}
                          </div>
                          <div className="text-stone-500 text-xs font-mono">{user.email}</div>
                          <div className="text-[10px] text-stone-500 font-mono">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {currentUser?.role === 'root' ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            user.role === 'root'
                              ? 'bg-red-950/60 border-red-800 text-red-300'
                              : user.role === 'admin'
                              ? 'bg-blue-950/60 border-blue-800 text-blue-300'
                              : 'bg-amber-950/60 border-amber-800 text-amber-300'
                          }`}
                        >
                          <option value="player">🐕 player</option>
                          <option value="admin">🛡️ admin</option>
                          <option value="root">👑 root</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-block ${
                            user.role === 'root'
                              ? 'bg-red-950/60 border-red-800 text-red-300'
                              : user.role === 'admin'
                              ? 'bg-blue-950/60 border-blue-800 text-blue-300'
                              : 'bg-amber-950/60 border-amber-800 text-amber-300'
                          }`}
                        >
                          {user.role}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-amber-400">
                        {user.stats.maiorPontuacao.toLocaleString('pt-BR')} pts
                      </div>
                      <div className="text-xs text-stone-400">
                        {user.stats.motoqueirosMordidos} motoboys mordidos
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {user.hasInfiniteCoins || isInfiniteMoneyUser(user) ? (
                        <div>
                          <div className="flex items-center gap-1.5 font-mono font-black text-sm">
                            <span>🦴</span>
                            <span className="bg-gradient-to-r from-yellow-300 via-amber-200 to-emerald-400 bg-clip-text text-transparent drop-shadow">
                              ∞ INFINITO
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-yellow-300 border border-amber-400/50 text-[9px] font-black uppercase">
                              ADM
                            </span>
                          </div>
                          <div className="text-[10px] text-emerald-300/90 font-mono mt-0.5">
                            R$ 999.999.999
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              const next = storage.toggleInfiniteCoins(user.id);
                              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, hasInfiniteCoins: next, ossoCoins: next ? 999999999 : 50000 } : u));
                            }}
                            className="mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 transition-all cursor-pointer block"
                          >
                            ⚡ Infinito Ativo
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5 font-mono font-bold text-yellow-400">
                            <span>🦴</span>
                            <span>{user.ossoCoins.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              onClick={() => handleAddCoins(user.id, 500)}
                              className="px-1.5 py-0.5 bg-yellow-900/40 hover:bg-yellow-800/60 text-yellow-300 border border-yellow-700/50 rounded text-[10px] font-bold"
                              title="Adicionar 500 OssoCoins"
                            >
                              +500
                            </button>
                            <button
                              onClick={() => handleAddCoins(user.id, -500)}
                              className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-400 border border-stone-700 rounded text-[10px]"
                              title="Remover 500 OssoCoins"
                            >
                              -500
                            </button>
                            <button
                              onClick={() => {
                                sound.playClick();
                                const next = storage.toggleInfiniteCoins(user.id);
                                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, hasInfiniteCoins: next, ossoCoins: next ? 999999999 : 50000 } : u));
                              }}
                              className="px-1.5 py-0.5 bg-stone-800 hover:bg-amber-900/50 text-amber-300 border border-amber-700/60 rounded text-[10px] font-bold"
                              title="Dar Dinheiro Infinito a este usuário"
                            >
                              ∞ Infinito
                            </button>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.status === 'Ativo'
                            ? 'bg-green-950/60 text-green-400 border border-green-800'
                            : user.status === 'Suspenso'
                            ? 'bg-yellow-950/60 text-yellow-400 border border-yellow-800'
                            : 'bg-red-950/60 text-red-400 border border-red-800'
                        }`}
                      >
                        {user.status === 'Ativo' && <CheckCircle className="w-3 h-3" />}
                        {user.status === 'Suspenso' && <AlertTriangle className="w-3 h-3" />}
                        {user.status === 'Banido' && <Ban className="w-3 h-3" />}
                        {user.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            storage.loginAsUser(user.id);
                            window.location.reload();
                          }}
                          className="px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-600/70 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          title="Alternar sessão para este usuário"
                        >
                          👤 Entrar
                        </button>

                        {onInspectUser && (
                          <button
                            onClick={() => onInspectUser(user)}
                            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Ver Perfil
                          </button>
                        )}

                        {user.status === 'Banido' ? (
                          <button
                            onClick={() => handleStatusChange(user.id, 'Ativo')}
                            className="px-2.5 py-1 bg-green-900/60 hover:bg-green-800 text-green-300 border border-green-700 rounded-lg text-xs font-bold transition-all"
                          >
                            Desbanir
                          </button>
                        ) : (
                          <button
                            disabled={isRootUser}
                            onClick={() => {
                              setSelectedUser(user);
                              setShowBanModal(true);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                              isRootUser
                                ? 'bg-stone-800 text-stone-600 cursor-not-allowed'
                                : 'bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800'
                            }`}
                          >
                            <Ban className="w-3 h-3" /> 🔨 BANIR
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ban Confirmation Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-stone-900 border-2 border-red-600 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-red-500 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-lg font-bold font-fun text-white">
                Banir Jogador @{selectedUser.nickname}
              </h4>
            </div>
            <p className="text-xs text-stone-300 mb-4">
              Esta ação bloqueará o acesso do usuário ao jogo, suspenderá a submissão de pontuações no leaderboard e registrará uma ocorrência no Anti-Cheat.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Motivo do Banimento
              </label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Ex: Trapaça de pontuação impossível, bot automatizado..."
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBanModal(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleStatusChange(selectedUser.id, 'Banido', banReason)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" /> Confirmar Banimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
