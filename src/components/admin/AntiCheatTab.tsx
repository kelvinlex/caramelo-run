import React, { useState } from 'react';
import { ShieldAlert, Ban, CheckCircle, RefreshCw, AlertTriangle, Eye, Terminal } from 'lucide-react';
import { storage } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import { API_BASE_URL } from '../../services/apiService';
import { AntiCheatLog } from '../../types';

export const AntiCheatTab: React.FC = () => {
  const [selectedLog, setSelectedLog] = useState<AntiCheatLog | null>(null);
  const [logs, setLogs] = useState<AntiCheatLog[]>([]);

  React.useEffect(() => {
    fetch(`${API_BASE_URL}/admin/anticheat`)
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(err => console.error(err));
  }, []);

  const handleBan = async (log: AntiCheatLog) => {
    sound.playBark();
    try {
      await fetch(`${API_BASE_URL}/admin/users/${log.playerId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `Banimento Anti-Cheat: ${log.motivoSuspeita}` })
      });
      setLogs(prev => prev.map(l => l.id === log.id ? { ...l, status: 'Banido' } : l));
    } catch (err) {
      console.error(err);
    }
  };

  const handleFalsePositive = (log: AntiCheatLog) => {
    sound.playClick();
    // Requeriria rota PUT /api/admin/anticheat/:id para falso positivo (mockando por agora)
    setLogs(prev => prev.map(l => l.id === log.id ? { ...l, status: 'Falso Positivo' } : l));
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Anti-Cheat Banner */}
      <div className="bg-red-950/30 border border-red-900/60 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-950/80 border border-red-800 rounded-2xl text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-400 font-fun">
              ALERTA DE ANTI-CHEAT & TELEMETRIA DE GAMEPLAY
            </h3>
            <p className="text-xs text-stone-300 mt-0.5">
              Detecção heurística em tempo real de modificadores de memória, invencibilidade injetada e saltos de pontuação anômalos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-red-900/40 text-red-300 border border-red-800/80 rounded-xl text-xs font-mono font-bold">
            {logs.filter((l) => l.status === 'Suspeito').length} Casos Suspeitos
          </span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="bg-stone-950/80 border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3.5 px-4">Player ID / Nick</th>
                <th className="py-3.5 px-4">Score Obtido</th>
                <th className="py-3.5 px-4">Duração / Canelas</th>
                <th className="py-3.5 px-4">Motivo da Suspeita</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-stone-100">@{log.nickname}</div>
                    <div className="text-[10px] text-stone-500 font-mono">ID: {log.playerId}</div>
                    <div className="text-[10px] text-stone-500 font-mono">IP: {log.ip}</div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-red-400 text-sm">
                    {log.scoreObtido.toLocaleString('pt-BR')} pts
                  </td>

                  <td className="py-3.5 px-4 text-xs">
                    <span className="text-stone-300 font-mono">{log.duracaoSegundos}s</span>
                    <span className="block text-stone-500">{log.motoboysMordidos} mordidas</span>
                  </td>

                  <td className="py-3.5 px-4 text-xs text-stone-300 max-w-xs">
                    <div className="p-2 bg-stone-950/60 rounded-lg border border-stone-800 font-mono text-[11px] text-red-300/90 leading-tight">
                      {log.motivoSuspeita}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        log.status === 'Suspeito'
                          ? 'bg-yellow-950/60 text-yellow-400 border border-yellow-800'
                          : log.status === 'Banido' || log.status === 'Confirmado Hack'
                          ? 'bg-red-950/60 text-red-400 border border-red-800'
                          : 'bg-green-950/60 text-green-400 border border-green-800'
                      }`}
                    >
                      {log.status === 'Suspeito' && <AlertTriangle className="w-3 h-3" />}
                      {log.status === 'Banido' && <Ban className="w-3 h-3" />}
                      {log.status === 'Falso Positivo' && <CheckCircle className="w-3 h-3" />}
                      {log.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs"
                        title="Ver Telemetria Detalhada"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                      </button>

                      {log.status !== 'Banido' ? (
                        <button
                          onClick={() => handleBan(log)}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-md transition-all active:scale-95"
                        >
                          <Ban className="w-3 h-3" /> 🔨 BANIR
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFalsePositive(log)}
                          className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-lg text-xs"
                        >
                          Revogar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Telemetry Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-stone-900 border-2 border-red-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-stone-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold font-fun text-red-400 flex items-center gap-2">
                <Terminal className="w-5 h-5" /> Pacote de Telemetria: #{selectedLog.id}
              </h4>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-2 py-1 bg-stone-800 rounded-lg text-xs"
              >
                Fechar
              </button>
            </div>

            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 font-mono text-xs text-stone-300 space-y-2 mb-4 overflow-x-auto">
              <div><span className="text-stone-500">Player:</span> @{selectedLog.nickname} ({selectedLog.playerId})</div>
              <div><span className="text-stone-500">Score Registrado:</span> {selectedLog.scoreObtido} pts</div>
              <div><span className="text-stone-500">Tempo de Partida:</span> {selectedLog.duracaoSegundos} segundos</div>
              <div><span className="text-stone-500">IP de Conexão:</span> {selectedLog.ip}</div>
              <div><span className="text-stone-500">Timestamp:</span> {selectedLog.dataRegistro}</div>
              <div className="pt-2 border-t border-stone-800 text-red-400">
                <span className="text-stone-500">Diagnóstico Heurístico:</span>
                <p className="mt-1 text-red-300">{selectedLog.motivoSuspeita}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleFalsePositive(selectedLog)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
              >
                Ignorar (Falso Positivo)
              </button>
              <button
                onClick={() => {
                  handleBan(selectedLog);
                  setSelectedLog(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" /> Banir Jogador Imediatamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
