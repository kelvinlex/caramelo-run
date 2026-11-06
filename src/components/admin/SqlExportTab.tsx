import React, { useState } from 'react';
import { Database, Copy, Check, Download, Table, Key, Shield, Layers } from 'lucide-react';
import { PHPMYADMIN_SQL_SCHEMA } from '../../data/initialData';
import { sound } from '../../services/soundEffects';

export const SqlExportTab: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopySql = () => {
    sound.playClick();
    navigator.clipboard.writeText(PHPMYADMIN_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSql = () => {
    sound.playWin();
    const blob = new Blob([PHPMYADMIN_SQL_SCHEMA], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'viralata_run_phpmyadmin.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const tablesInfo = [
    {
      name: 'users',
      desc: 'Controle de contas, autenticação, níveis de acesso (RBAC: root, admin, player) e saldo de OssoCoins.',
      columns: 'id (PK), nickname, email, password_hash, role, status, osso_coins, skin_equipada_id, is_guest, ip_origem',
    },
    {
      name: 'player_stats',
      desc: 'Métricas de gameplay: maior pontuação (high score), motoqueiros mordidos, chinelos desviados, km corridos.',
      columns: 'user_id (PK/FK), maior_pontuacao, motoqueiros_mordidos, chinelos_desviados, distancia_km, status_quebrada',
    },
    {
      name: 'skins',
      desc: 'Catálogo de customização do Caramelo (LiveOps): preços em moedas e reais, raridade e tags promocionais.',
      columns: 'id (PK), nome, tipo, descricao, preco_moedas, preco_reais, is_real_money_only, ativa_loja, em_promocao',
    },
    {
      name: 'player_inventory',
      desc: 'Relação N:N de skins desbloqueadas por cada jogador (por compra ou conquista).',
      columns: 'id (PK), user_id (FK), skin_id (FK), adquirido_em, origem',
    },
    {
      name: 'transactions',
      desc: 'Histórico financeiro de microtransações (PIX, Cartão, Boleto e Moedas virtuais).',
      columns: 'id (PK), user_id (FK), item_comprado, tipo_item, valor_brl, valor_moedas, metodo_pagamento, status',
    },
    {
      name: 'anti_cheat_logs',
      desc: 'Logs heurísticos de pontuações impossíveis, detecção de modificações e telemetria de gameplay.',
      columns: 'id (PK), user_id (FK), score_obtido, duracao_segundos, motoboys_mordidos, motivo_suspeita, status, ip_origem',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-950/80 border border-amber-800 rounded-2xl text-amber-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-400 font-fun">
              SCHEMA SQL PARA PHPMYADMIN / MYSQL 8.0+
            </h3>
            <p className="text-xs text-stone-300 mt-0.5">
              Script DDL completo com integridade referencial, foreign keys, índices de performance e dados iniciais de teste.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySql}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
            <span>{copied ? 'Copiado!' : 'Copiar SQL'}</span>
          </button>

          <button
            onClick={handleDownloadSql}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer font-fun"
          >
            <Download className="w-4 h-4" /> Baixar .SQL
          </button>
        </div>
      </div>

      {/* Relational Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tablesInfo.map((tbl) => (
          <div key={tbl.name} className="bg-stone-900/90 border border-stone-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-sm mb-1.5">
              <Table className="w-4 h-4 text-amber-500" />
              <span>{tbl.name}</span>
            </div>
            <p className="text-xs text-stone-400 mb-3 leading-relaxed">
              {tbl.desc}
            </p>
            <div className="p-2 bg-stone-950 rounded-xl border border-stone-800/80 font-mono text-[11px] text-stone-400">
              <span className="text-stone-500 block text-[10px] uppercase font-bold mb-0.5">Campos Principais:</span>
              <span className="text-stone-300">{tbl.columns}</span>
            </div>
          </div>
        ))}
      </div>

      {/* SQL Code Block */}
      <div className="bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-3 bg-stone-900/80 border-b border-stone-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-2 font-mono text-xs text-stone-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
            <span className="ml-2">viralata_run_database_phpmyadmin.sql</span>
          </div>

          <button
            onClick={handleCopySql}
            className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-mono"
          >
            {copied ? '✓ Copiado com sucesso' : 'Copiar código completo'}
          </button>
        </div>

        <pre className="p-4 md:p-6 text-xs font-mono text-amber-100/90 overflow-x-auto leading-relaxed max-h-[420px] selection:bg-amber-500 selection:text-stone-950">
          <code>{PHPMYADMIN_SQL_SCHEMA}</code>
        </pre>
      </div>
    </div>
  );
};
