import React, { useState } from 'react';
import { DollarSign, CreditCard, QrCode, TrendingUp, CheckCircle, Clock, PlusCircle } from 'lucide-react';
import { storage } from '../../services/storageService';
import { sound } from '../../services/soundEffects';
import { API_BASE_URL } from '../../services/apiService';

export const FinanceTab: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<'ALL' | 'PIX' | 'CARTAO' | 'BOLETO'>('ALL');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ receitaDoDiaBrl: 0 });
  const [asaasConfig, setAsaasConfig] = useState({
    asaasEnv: 'sandbox',
    apiKeyMasked: '',
    hasApiKey: false,
    webhookUrl: `${API_BASE_URL}/payments/asaas/webhook`
  });
  const [inputKey, setInputKey] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('sandbox');

  React.useEffect(() => {
    fetch(`${API_BASE_URL}/admin/transactions`)
      .then(res => res.json())
      .then(data => setTransactions(data))
      .catch(console.error);

    fetch(`${API_BASE_URL}/admin/metrics`)
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(console.error);

    fetch(`${API_BASE_URL}/admin/asaas/config`)
      .then(res => res.json())
      .then(data => {
        setAsaasConfig(data);
        if (data.asaasEnv) setSelectedEnv(data.asaasEnv);
      })
      .catch(console.error);
  }, []);

  const filteredTx = transactions.filter(
    (tx) => selectedMethod === 'ALL' || tx.metodo === selectedMethod
  );

  const totalRevenueBrl = transactions
    .filter((tx) => tx.status === 'Aprovado')
    .reduce((acc, curr) => acc + (curr.valorBrl || 0), 0);

  const simulatePixPurchase = () => {
    sound.playCoin();
    const mockUser = storage.getCurrentUser() || storage.getUsers()[2];
    const newTx = {
      id: `tx-pix-${Date.now()}`,
      playerId: mockUser.id,
      nickname: mockUser.nickname,
      itemComprado: 'Pacote 1.500 OssoCoins (PIX Instantâneo)',
      tipoItem: 'PACOTE_MOEDAS' as const,
      valorBrl: 9.90,
      metodo: 'PIX' as const,
      status: 'Aprovado' as const,
      dataHora: new Date().toISOString(),
    };
    setTransactions(prev => [newTx, ...prev]);
    storage.getTransactions().unshift(newTx);
    storage.adjustUserCoins(mockUser.id, 1500);
    setMetrics(prev => ({ ...prev, receitaDoDiaBrl: prev.receitaDoDiaBrl + 9.90 }));
  };

  const handleSaveAsaasConfig = async () => {
    sound.playClick();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/asaas/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: inputKey, asaasEnv: selectedEnv })
      });
      if (res.ok) {
        const updated = await res.json();
        setAsaasConfig(prev => ({
          ...prev,
          asaasEnv: updated.asaasEnv,
          hasApiKey: updated.hasApiKey
        }));
        sound.playWin();
        alert('✅ Configurações do Banco Asaas salvas com sucesso no servidor!');
      }
    } catch {
      alert('Erro ao salvar configurações do Asaas.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Receita do Dia</span>
            <div className="p-2 bg-emerald-950/60 text-emerald-400 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            R$ {metrics.receitaDoDiaBrl.toFixed(2)}
          </div>
          <span className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +18.4% vs. ontem
          </span>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ticket Médio</span>
            <div className="p-2 bg-blue-950/60 text-blue-400 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">
            R$ 12.80
          </div>
          <span className="text-[11px] text-stone-400 mt-1 block">
            Base: 48 compras hoje
          </span>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">PIX Instantâneo</span>
            <div className="p-2 bg-teal-950/60 text-teal-400 rounded-xl">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-400 font-mono">
            78.5%
          </div>
          <span className="text-[11px] text-teal-400/80 mt-1 block">
            Principal método de conversão
          </span>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Acumulado</span>
            <div className="p-2 bg-amber-950/60 text-amber-400 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            R$ {(totalRevenueBrl + 17500).toFixed(2)}
          </div>
          <span className="text-[11px] text-stone-400 mt-1 block">
            Mês de Outubro / 2026
          </span>
        </div>
      </div>

      {/* Gateway Banco Asaas Configuration Panel */}
      <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white font-fun flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" /> Configuração do Gateway Banco Asaas (PIX / Webhook)
            </h4>
            <p className="text-xs text-stone-400 mt-0.5">
              Gerencie a chave de API de produção/sandbox e a URL do Webhook do Asaas.
            </p>
          </div>
          <span className={`px-3 py-1 border rounded-full text-xs font-bold font-mono self-start sm:self-auto ${
            asaasConfig.hasApiKey
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
              : 'bg-yellow-950/80 text-yellow-400 border-yellow-800'
          }`}>
            {asaasConfig.hasApiKey ? '● Asaas Conectado' : '⚠️ Chave API Pendente'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-stone-300 font-semibold mb-1">
              Chave de API do Asaas (API Key)
              {asaasConfig.apiKeyMasked && (
                <span className="text-[10px] text-stone-500 ml-1">({asaasConfig.apiKeyMasked})</span>
              )}
            </label>
            <input
              type="password"
              placeholder="$aact_YTU5YTEyM2EzMzZO2a..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white font-mono placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-stone-300 font-semibold mb-1">Ambiente Asaas</label>
            <select
              value={selectedEnv}
              onChange={(e) => setSelectedEnv(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="sandbox">🧪 Sandbox (Ambiente de Testes)</option>
              <option value="production">🚀 Produção (Cobranças Reais)</option>
            </select>
          </div>

          <div>
            <label className="block text-stone-300 font-semibold mb-1">URL para Notificação Webhook</label>
            <input
              type="text"
              readOnly
              value={asaasConfig.webhookUrl}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-amber-400 font-mono select-all cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleSaveAsaasConfig}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-transform active:scale-95 font-fun shadow-lg"
          >
            <CheckCircle className="w-4 h-4" /> Salvar Configurações do Asaas
          </button>

          <button
            onClick={simulatePixPurchase}
            className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs flex items-center gap-2 border border-stone-700 cursor-pointer transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" /> Simular Pagamento PIX (R$ 9,90)
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
          <h4 className="text-sm font-bold text-white font-fun">
            Extrato de Microtransações em Tempo Real
          </h4>

          <div className="flex items-center gap-1.5 bg-stone-800 p-1 rounded-xl text-xs font-semibold">
            {(['ALL', 'PIX', 'CARTAO', 'BOLETO'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  selectedMethod === m ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-400 hover:text-white'
                }`}
              >
                {m === 'ALL' ? 'Todos' : m}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="bg-stone-950/80 border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3.5 px-4">ID Transação</th>
                <th className="py-3.5 px-4">Jogador</th>
                <th className="py-3.5 px-4">Item Comprado</th>
                <th className="py-3.5 px-4">Valor</th>
                <th className="py-3.5 px-4">Método</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {filteredTx.map((tx) => (
                <tr key={tx.id} className="hover:bg-stone-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs text-stone-500">{tx.id}</td>
                  <td className="py-3.5 px-4 font-bold text-stone-200">@{tx.nickname}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-stone-200">{tx.itemComprado}</span>
                    <span className="block text-[10px] text-stone-500">{tx.tipoItem}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                    {tx.valorBrl > 0 ? `R$ ${tx.valorBrl.toFixed(2)}` : `${tx.valorOssoCoins} OssoCoins`}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 bg-stone-800 rounded text-xs font-mono text-stone-300">
                      {tx.metodo}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        tx.status === 'Aprovado'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                          : tx.status === 'Pendente'
                          ? 'bg-yellow-950/60 text-yellow-400 border border-yellow-800'
                          : 'bg-red-950/60 text-red-400 border border-red-800'
                      }`}
                    >
                      {tx.status === 'Aprovado' && <CheckCircle className="w-3 h-3" />}
                      {tx.status === 'Pendente' && <Clock className="w-3 h-3" />}
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-stone-400 text-xs font-mono">
                    {new Date(tx.dataHora).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
