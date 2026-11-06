import React from 'react';
import { Server, FolderTree, Code, Shield, CheckCircle2, ArrowRight } from 'lucide-react';

export const ApiDocsTab: React.FC = () => {
  const apiRoutes = [
    {
      group: '1. AUTENTICAÇÃO E PERFIL (RBAC)',
      routes: [
        { method: 'POST', path: '/api/v1/auth/guest', desc: 'Cria sessão instantânea de jogador sem dono com Nickname gerado.', access: 'Público' },
        { method: 'POST', path: '/api/v1/auth/login', desc: 'Login por email/nickname e senha com retorno de JWT com claims de role.', access: 'Público' },
        { method: 'POST', path: '/api/v1/auth/register', desc: 'Cadastro de nova conta com concessão do bônus de 250 OssoCoins.', access: 'Público' },
        { method: 'GET', path: '/api/v1/auth/me', desc: 'Recupera dados do usuário autenticado, inventário de skins e permissões.', access: 'Player/Admin/Root' },
        { method: 'GET', path: '/api/v1/auth/random-nickname', desc: 'Retorna um nickname aleatório baseado no banco de memes brasileiros.', access: 'Público' },
      ],
    },
    {
      group: '2. GAMEPLAY & LEADERBOARD (ANTI-CHEAT)',
      routes: [
        { method: 'POST', path: '/api/v1/gameplay/submit-score', desc: 'Submete pontuação final, tempo de corrida e canelas mordidas. Valida telemetria anti-cheat.', access: 'Player' },
        { method: 'GET', path: '/api/v1/leaderboard/global', desc: 'Lista os Top 100 jogadores com pontuação máxima, skin equipada e status na quebrada.', access: 'Público' },
        { method: 'GET', path: '/api/v1/players/:nickname/profile', desc: 'Retorna o perfil público do gamer para compartilhamento na web.', access: 'Público' },
      ],
    },
    {
      group: '3. ECONOMIA, SKINS & INVENTÁRIO',
      routes: [
        { method: 'GET', path: '/api/v1/shop/skins', desc: 'Lista o catálogo ativo de skins com preços atualizados em moedas e reais.', access: 'Público' },
        { method: 'POST', path: '/api/v1/inventory/buy', desc: 'Compra skin por OssoCoins ou gera transação PIX/Cartão.', access: 'Player' },
        { method: 'POST', path: '/api/v1/inventory/equip', desc: 'Equipa uma skin desbloqueada do inventário do jogador.', access: 'Player' },
        { method: 'POST', path: '/api/v1/payments/pix-webhook', desc: 'Webhook de confirmação bancária de pagamentos PIX com entrega de skins.', access: 'Gateway' },
      ],
    },
    {
      group: '4. PAINEL ROOT & GESTÃO LIVEOPS (ADMIN / ROOT ONLY)',
      routes: [
        { method: 'GET', path: '/api/v1/admin/metrics/overview', desc: 'Retorna métricas em tempo real de DAU, faturamento diário e alertas.', access: 'Admin / Root' },
        { method: 'GET', path: '/api/v1/admin/users', desc: 'Listagem paginada de jogadores com filtros de status e permissão.', access: 'Admin / Root' },
        { method: 'PATCH', path: '/api/v1/admin/users/:id/role', desc: 'Altera cargo RBAC (promover para admin ou rebaixar para player).', access: 'Root Only' },
        { method: 'POST', path: '/api/v1/admin/users/:id/ban', desc: 'Aplica banimento direto a jogador trapaceiro com registro de motivo.', access: 'Admin / Root' },
        { method: 'PATCH', path: '/api/v1/admin/economy/skins/:id', desc: 'Atualiza dinamicamente valores em moedas/reais e status de promoção da skin.', access: 'Admin / Root' },
        { method: 'GET', path: '/api/v1/admin/anticheat/logs', desc: 'Consulta telemetria e registros de detecções anômalas.', access: 'Admin / Root' },
      ],
    },
  ];

  const folderStructure = `📂 vira-lata-run-ecosystem/
├── 📁 backend-api/                  # Node.js + Express + TypeScript + MySQL
│   ├── 📁 src/
│   │   ├── 📁 config/              # Conexão de Banco (MySQL Pool / Drizzle / Prisma)
│   │   ├── 📁 controllers/         # AuthController, GameController, LiveOpsController
│   │   ├── 📁 middlewares/         # authMiddleware (JWT), rbacGuard ('root'|'admin'|'player'), antiCheatValidator
│   │   ├── 📁 models/              # User, PlayerStats, Skin, Transaction, AntiCheatLog
│   │   ├── 📁 routes/              # auth.routes.ts, gameplay.routes.ts, admin.routes.ts, shop.routes.ts
│   │   ├── 📁 services/            # AntiCheatTelemetryService, PixPaymentService, LiveOpsEconomyService
│   │   └── server.ts               # Ponto de entrada da API RESTful
│   └── package.json
│
├── 📁 admin-dashboard/              # Painel Root de Gestão LiveOps (React / Vite / Tailwind)
│   ├── 📁 src/
│   │   ├── 📁 components/          # UserManagementTab, LiveOpsSkins, AntiCheatMonitor, FinanceRevenue
│   │   ├── 📁 services/            # AdminApiService (com headers Bearer Token e controle RBAC)
│   │   └── App.tsx
│
├── 📁 web-portal/                   # Portal Público Gamers & Leaderboard
│   ├── 📁 src/
│   │   ├── 📁 components/          # LeaderboardPodium, PublicGamerProfile, MemeLoginFlow
│   │   └── App.tsx
│
└── 📁 mobile-game-client/           # Jogo Mobile (Unity / React Native / WebGL Canvas)
    ├── 📁 Scripts/ / 📁 src/
    │   ├── 📁 Mechanics/           # DogController (Pulo, Mordida Canela, Latido Sônico)
    │   ├── 📁 Network/             # GameApiClient (Submissão criptografada de Score)
    │   └── 📁 UI/                  # Custom Caramelo Wardrobe & Loja Virtual`;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Architecture Banner */}
      <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-950/80 border border-blue-800 rounded-2xl text-blue-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-400 font-fun">
              ARQUITETURA TÉCNICA FULL-STACK & ROTAS NODE.JS
            </h3>
            <p className="text-xs text-stone-300 mt-0.5">
              Isolamento estrito entre Painel Root, Web Portal, Mobile Client e API Gateway com RBAC.
            </p>
          </div>
        </div>
      </div>

      {/* Folder Structure Diagram */}
      <div className="bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3.5 bg-stone-900 border-b border-stone-800 flex items-center gap-2 font-fun text-xs text-stone-300 font-bold">
          <FolderTree className="w-4 h-4 text-amber-400" />
          <span>Estrutura de Pastas Recomendada (Isolamento de Camadas)</span>
        </div>
        <pre className="p-4 md:p-6 text-xs font-mono text-stone-300 overflow-x-auto leading-relaxed bg-stone-950">
          {folderStructure}
        </pre>
      </div>

      {/* API Endpoints Accordion/List */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-stone-200 font-fun flex items-center gap-2">
          <Code className="w-4 h-4 text-emerald-400" /> Especificação dos Endpoints RESTful em Node.js Express
        </h4>

        {apiRoutes.map((cat, idx) => (
          <div key={idx} className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-md">
            <div className="px-4 py-3 bg-stone-950/80 border-b border-stone-800 font-fun font-bold text-xs text-amber-400">
              {cat.group}
            </div>

            <div className="divide-y divide-stone-800/80 text-xs">
              {cat.routes.map((r, rIdx) => (
                <div key={rIdx} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-stone-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        r.method === 'GET'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : r.method === 'POST'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {r.method}
                    </span>
                    <span className="font-mono text-stone-200 font-semibold">{r.path}</span>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4">
                    <span className="text-stone-400 text-xs">{r.desc}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        r.access === 'Público'
                          ? 'bg-stone-800 border-stone-700 text-stone-400'
                          : r.access.includes('Root')
                          ? 'bg-red-950/60 border-red-800 text-red-300'
                          : 'bg-amber-950/60 border-amber-800 text-amber-300'
                      }`}
                    >
                      {r.access}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
