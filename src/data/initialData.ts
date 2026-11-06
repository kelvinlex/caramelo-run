import { User, Skin, Achievement, AntiCheatLog, Transaction, DailyMetrics } from '../types';

export const MEME_NICKNAME_PREFIXES = [
  'Caramelo', 'Chinelada', 'ReyDo', 'Motoqueiro', 'CachorroDo',
  'Capivara', 'Morde', 'Pneu', 'LatiNo', 'Marmiteiro',
  'CriaDa', 'Salsichinha', 'PitbullDe', 'ViraLata', 'TerrorDo'
];

export const MEME_NICKNAME_SUFFIXES = [
  'Veloz', 'Mortal', 'Latido', 'Fugitivo', 'Copo',
  'Ninja', 'Canela', 'Furou', 'Portao', 'Churrasco',
  'Quebrada', 'Juliete', 'Asfalto', 'Posto', 'Entregador',
  'Havaiana', 'Voador', 'Alfa', 'Bala', 'Grau'
];

export function generateRandomNickname(): string {
  const prefix = MEME_NICKNAME_PREFIXES[Math.floor(Math.random() * MEME_NICKNAME_PREFIXES.length)];
  const suffix = MEME_NICKNAME_SUFFIXES[Math.floor(Math.random() * MEME_NICKNAME_SUFFIXES.length)];
  const randomNum = Math.floor(Math.random() * 90 + 10);
  return `${prefix}${suffix}${randomNum}`;
}

export const INITIAL_SKINS: Skin[] = [
  {
    id: 'skin-tradicional',
    nome: 'Caramelo Raiz',
    tipo: 'Comum',
    descricao: 'O autêntico vira-lata brasileiro. Pelagem dourada queimada de sol, orelha alerta e velocidade pura.',
    precoMoedas: 0,
    precoReais: 0,
    isRealMoneyOnly: false,
    imagem: '🐕',
    corPrimaria: '#D97706',
    corSecundaria: '#F59E0B',
    acessorios: {
      oculos: false,
      tipoOculos: 'nenhum',
      chapeu: 'nenhum',
      coleira: 'vermelha',
      brilho: false,
    },
    ativaLoja: true,
  },
  {
    id: 'skin-juliete',
    nome: 'Óculos Juliete',
    tipo: 'Rara',
    descricao: 'Estilo puro da quebrada com óculos espelhado furta-cor. Intimida qualquer entregador de aplicativo.',
    precoMoedas: 1200,
    precoReais: 3.50,
    isRealMoneyOnly: false,
    imagem: '🕶️🐕',
    corPrimaria: '#B45309',
    corSecundaria: '#FBBF24',
    acessorios: {
      oculos: true,
      tipoOculos: 'juliete',
      chapeu: 'nenhum',
      coleira: 'dourada',
      brilho: true,
      efeitoAura: 'rgba(234, 179, 8, 0.4)',
    },
    ativaLoja: true,
    emPromocao: true,
    descontoPercentual: 15,
  },
  {
    id: 'skin-cria',
    nome: 'Caramelo Cria',
    tipo: 'Especial',
    descricao: 'Capuz estiloso e corrente pesada no pescoço. O terror das motos esportivas e dos escapamentos furados.',
    precoMoedas: 500,
    precoReais: 2.00,
    isRealMoneyOnly: false,
    imagem: '🧢🐕',
    corPrimaria: '#92400E',
    corSecundaria: '#FDE047',
    acessorios: {
      oculos: false,
      tipoOculos: 'nenhum',
      chapeu: 'capuz',
      coleira: 'dourada',
      brilho: false,
    },
    ativaLoja: true,
  },
  {
    id: 'skin-cibernetico',
    nome: 'Cibernético 2077',
    tipo: 'Lendária',
    descricao: 'Modificado com implantes nanotecnológicos de latido sônico e radar de motoboy a 5km de distância.',
    precoMoedas: 4500,
    precoReais: 4.90,
    isRealMoneyOnly: true,
    imagem: '🤖🐕',
    corPrimaria: '#0284C7',
    corSecundaria: '#38BDF8',
    acessorios: {
      oculos: true,
      tipoOculos: 'cibernetico',
      chapeu: 'nenhum',
      coleira: 'espinhos',
      brilho: true,
      efeitoAura: 'rgba(14, 165, 233, 0.6)',
    },
    ativaLoja: true,
  },
  {
    id: 'skin-dourado',
    nome: 'Caramelo Dourado VIP',
    tipo: 'Lendária',
    descricao: 'Feito de puro ouro maciço 24k com coroa reluzente. Reservado para os maiores mestres do latido.',
    precoMoedas: 10000,
    precoReais: 14.90,
    isRealMoneyOnly: false,
    imagem: '👑🐕',
    corPrimaria: '#EAB308',
    corSecundaria: '#FEF08A',
    acessorios: {
      oculos: true,
      tipoOculos: 'juliete',
      chapeu: 'coroa',
      coleira: 'dourada',
      brilho: true,
      efeitoAura: 'rgba(250, 204, 21, 0.8)',
    },
    ativaLoja: true,
    desbloqueioPorConquista: 'Morder 1.000 Motoqueiros',
  },
  {
    id: 'skin-capivara',
    nome: 'Disfarce de Capivara',
    tipo: 'Rara',
    descricao: 'Calmo por fora, predador de pneus por dentro. 100% de carisma brasileiro.',
    precoMoedas: 1800,
    precoReais: 4.50,
    isRealMoneyOnly: false,
    imagem: '🐾🐕',
    corPrimaria: '#78350F',
    corSecundaria: '#A16207',
    acessorios: {
      oculos: false,
      tipoOculos: 'nenhum',
      chapeu: 'bone',
      coleira: 'vermelha',
      brilho: false,
    },
    ativaLoja: true,
  },
  {
    id: 'caramelo_skin1',
    nome: 'Caramelo Dourado',
    tipo: 'Especial',
    descricao: 'Pelagem dourada brilhante, focado na corrida e nas manobras da quebrada.',
    precoMoedas: 2500,
    precoReais: 5.00,
    isRealMoneyOnly: false,
    imagem: '✨🐕',
    corPrimaria: '#eab308',
    corSecundaria: '#facc15',
    acessorios: {
      oculos: false,
      tipoOculos: 'nenhum',
      chapeu: 'nenhum',
      coleira: 'dourada',
      brilho: true,
    },
    ativaLoja: true,
  },
  {
    id: 'caramelo_skin2',
    nome: 'Caramelo Pitbull',
    tipo: 'Mítica',
    descricao: 'Porte forte e atlético, morde na velocidade máxima e nunca desiste.',
    precoMoedas: 5000,
    precoReais: 9.90,
    isRealMoneyOnly: false,
    imagem: '🐕‍🦺',
    corPrimaria: '#f97316',
    corSecundaria: '#fb923c',
    acessorios: {
      oculos: false,
      tipoOculos: 'nenhum',
      chapeu: 'nenhum',
      coleira: 'espinhos',
      brilho: true,
    },
    ativaLoja: true,
  }
];

export const INITIAL_USERS: User[] = [
  // === CONTAS REAIS DE DESENVOLVIMENTO & ADMIN ===
  {
    id: 'usr-root-01',
    nickname: 'RootMaster',
    email: 'root@viralatarun.com.br',
    role: 'root',
    ossoCoins: 100000,
    skinEquipadaId: 'skin-dourado',
    status: 'Ativo',
    criadoEm: '2026-01-10T10:00:00Z',
    ultimoAcesso: '2026-08-19T09:45:00Z',
    ipOrigem: '189.120.45.12',
    stats: {
      maiorPontuacao: 0,
      motoqueirosMordidos: 0,
      chinelosDesviados: 0,
      distanciaKm: 0.0,
      conquistasDesbloqueadas: 0,
      totalConquistas: 15,
      statusQuebrada: 'Filhote de Calçada',
    },
    inventarioSkinIds: ['skin-tradicional', 'skin-juliete', 'skin-cria', 'skin-cibernetico', 'skin-dourado', 'skin-capivara', 'caramelo_skin1', 'caramelo_skin2'],
  },
  {
    id: 'usr-kelvin-01',
    nickname: 'kelvin_01',
    email: 'kelvin@viralatarun.com.br',
    role: 'player',
    ossoCoins: 50000,
    skinEquipadaId: 'skin-juliete',
    status: 'Ativo',
    criadoEm: '2026-02-01T10:00:00Z',
    ultimoAcesso: '2026-08-19T10:00:00Z',
    ipOrigem: '189.120.45.13',
    stats: {
      maiorPontuacao: 0,
      motoqueirosMordidos: 0,
      chinelosDesviados: 0,
      distanciaKm: 0.0,
      conquistasDesbloqueadas: 0,
      totalConquistas: 15,
      statusQuebrada: 'Filhote de Calçada',
    },
    inventarioSkinIds: ['skin-tradicional', 'skin-juliete', 'skin-cria'],
  },
  {
    id: 'usr-guilherme-01',
    nickname: 'guilherme_01',
    email: 'guilherme@viralatarun.com.br',
    role: 'player',
    ossoCoins: 50000,
    skinEquipadaId: 'skin-cria',
    status: 'Ativo',
    criadoEm: '2026-02-01T10:00:00Z',
    ultimoAcesso: '2026-08-19T10:00:00Z',
    ipOrigem: '189.120.45.14',
    stats: {
      maiorPontuacao: 0,
      motoqueirosMordidos: 0,
      chinelosDesviados: 0,
      distanciaKm: 0.0,
      conquistasDesbloqueadas: 0,
      totalConquistas: 15,
      statusQuebrada: 'Filhote de Calçada',
    },
    inventarioSkinIds: ['skin-tradicional', 'skin-cria'],
  },
  {
    id: 'usr-valdir-01',
    nickname: 'valdir_01',
    email: 'valdir@viralatarun.com.br',
    role: 'player',
    ossoCoins: 50000,
    skinEquipadaId: 'skin-dourado',
    status: 'Ativo',
    criadoEm: '2026-02-01T10:00:00Z',
    ultimoAcesso: '2026-08-19T10:00:00Z',
    ipOrigem: '189.120.45.15',
    stats: {
      maiorPontuacao: 0,
      motoqueirosMordidos: 0,
      chinelosDesviados: 0,
      distanciaKm: 0.0,
      conquistasDesbloqueadas: 0,
      totalConquistas: 15,
      statusQuebrada: 'Filhote de Calçada',
    },
    inventarioSkinIds: ['skin-tradicional', 'skin-dourado'],
  },

  // === JOGADORES FAKE / LENDAS DA QUEBRADA (NPCs para Ranking Fictício) ===
  {
    id: 'usr-npc-01',
    nickname: 'MestreDoLatido',
    email: 'mestrelatido@npc.viralatarun.com.br',
    role: 'player',
    ossoCoins: 0,
    skinEquipadaId: 'skin-dourado',
    status: 'Ativo',
    criadoEm: '2026-01-01T00:00:00Z',
    ultimoAcesso: '2026-08-19T12:00:00Z',
    ipOrigem: '127.0.0.1',
    stats: {
      maiorPontuacao: 250000,
      motoqueirosMordidos: 2500,
      chinelosDesviados: 1800,
      distanciaKm: 420.5,
      conquistasDesbloqueadas: 15,
      totalConquistas: 15,
      statusQuebrada: 'Lendário Alfa da Quebrada',
    },
    inventarioSkinIds: ['skin-tradicional', 'skin-dourado'],
  },
  {
    id: 'usr-npc-02',
    nickname: 'ReyDoLatido',
    email: 'reydolatido@npc.viralatarun.com.br',
    role: 'player',
    ossoCoins: 0,
    skinEquipadaId: 'skin-juliete',
    status: 'Ativo',
    criadoEm: '2026-01-02T00:00:00Z',
    ultimoAcesso: '2026-08-19T12:00:00Z',
    ipOrigem: '127.0.0.1',
    stats: {
      maiorPontuacao: 184320,
      motoqueirosMordidos: 1402,
      chinelosDesviados: 940,
      distanciaKm: 312.4,
      conquistasDesbloqueadas: 14,
      totalConquistas: 15,
      statusQuebrada: 'Lendário Alfa da Quebrada',
    },
    inventarioSkinIds: ['skin-tradicional', 'skin-juliete'],
  },
  {
    id: 'usr-npc-03',
    nickname: 'FugaDoChinelo',
    email: 'fugachinelo@npc.viralatarun.com.br',
    role: 'player',
    ossoCoins: 0,
    skinEquipadaId: 'skin-cria',
    status: 'Ativo',
    criadoEm: '2026-01-03T00:00:00Z',
    ultimoAcesso: '2026-08-19T12:00:00Z',
    ipOrigem: '127.0.0.1',
    stats: {
      maiorPontuacao: 165000,
      motoqueirosMordidos: 1100,
      chinelosDesviados: 750,
      distanciaKm: 210.0,
      conquistasDesbloqueadas: 12,
      totalConquistas: 15,
      statusQuebrada: 'Terror dos Motoboys',
    },
    inventarioSkinIds: ['skin-tradicional', 'skin-cria'],
  },
  {
    id: 'usr-npc-04',
    nickname: 'MordePneu',
    email: 'mordepneu@npc.viralatarun.com.br',
    role: 'player',
    ossoCoins: 0,
    skinEquipadaId: 'skin-capivara',
    status: 'Ativo',
    criadoEm: '2026-01-04T00:00:00Z',
    ultimoAcesso: '2026-08-19T12:00:00Z',
    ipOrigem: '127.0.0.1',
    stats: {
      maiorPontuacao: 120000,
      motoqueirosMordidos: 980,
      chinelosDesviados: 620,
      distanciaKm: 190.0,
      conquistasDesbloqueadas: 10,
      totalConquistas: 15,
      statusQuebrada: 'Terror dos Motoboys',
    },
    inventarioSkinIds: ['skin-tradicional', 'skin-capivara'],
  },
  {
    id: 'usr-npc-05',
    nickname: 'TerrorDaCalcada',
    email: 'terrorcalcada@npc.viralatarun.com.br',
    role: 'player',
    ossoCoins: 0,
    skinEquipadaId: 'skin-tradicional',
    status: 'Ativo',
    criadoEm: '2026-01-05T00:00:00Z',
    ultimoAcesso: '2026-08-19T12:00:00Z',
    ipOrigem: '127.0.0.1',
    stats: {
      maiorPontuacao: 85000,
      motoqueirosMordidos: 650,
      chinelosDesviados: 410,
      distanciaKm: 140.0,
      conquistasDesbloqueadas: 8,
      totalConquistas: 15,
      statusQuebrada: 'Cão de Guarda Alerta',
    },
    inventarioSkinIds: ['skin-tradicional'],
  },
  {
    id: 'usr-npc-06',
    nickname: 'PneuFurou',
    email: 'pneufurou@npc.viralatarun.com.br',
    role: 'player',
    ossoCoins: 0,
    skinEquipadaId: 'skin-tradicional',
    status: 'Ativo',
    criadoEm: '2026-01-06T00:00:00Z',
    ultimoAcesso: '2026-08-19T12:00:00Z',
    ipOrigem: '127.0.0.1',
    stats: {
      maiorPontuacao: 50000,
      motoqueirosMordidos: 400,
      chinelosDesviados: 300,
      distanciaKm: 90.0,
      conquistasDesbloqueadas: 6,
      totalConquistas: 15,
      statusQuebrada: 'Cão de Guarda Alerta',
    },
    inventarioSkinIds: ['skin-tradicional'],
  }
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-01',
    titulo: 'Primeira Mordida',
    descricao: 'Morda a canela do seu primeiro motoqueiro na rua.',
    icone: '🦷',
    progressoAtual: 1,
    progressoMaximo: 1,
    desbloqueada: true,
    recompensaMoedas: 50,
  },
  {
    id: 'ach-02',
    titulo: 'Terror do Ifood',
    descricao: 'Persiga e alcance 50 motoboys de entrega.',
    icone: '🛵',
    progressoAtual: 50,
    progressoMaximo: 50,
    desbloqueada: true,
    recompensaMoedas: 250,
  },
  {
    id: 'ach-03',
    titulo: 'Esquiva da Havaiana',
    descricao: 'Desvie de 100 chinelos voadores arremessados pela vizinha.',
    icone: '🩴',
    progressoAtual: 100,
    progressoMaximo: 100,
    desbloqueada: true,
    recompensaMoedas: 400,
  },
  {
    id: 'ach-04',
    titulo: 'Alfa da Quebrada',
    descricao: 'Alcance 100.000 pontos em uma única corrida.',
    icone: '🏆',
    progressoAtual: 100000,
    progressoMaximo: 100000,
    desbloqueada: true,
    recompensaMoedas: 800,
  },
  {
    id: 'ach-05',
    titulo: 'Mestre dos Mil Motoqueiros',
    descricao: 'Morda 1.000 motoqueiros no total ao longo da carreira.',
    icone: '👑',
    progressoAtual: 1402,
    progressoMaximo: 1000,
    desbloqueada: true,
    recompensaMoedas: 2000,
    recompensaSkinId: 'skin-dourado',
  },
  {
    id: 'ach-06',
    titulo: 'Maratonista do Asfalto',
    descricao: 'Corra um total acumulado de 500 km pela cidade.',
    icone: '🏃',
    progressoAtual: 312,
    progressoMaximo: 500,
    desbloqueada: false,
    recompensaMoedas: 1500,
  }
];

export const INITIAL_ANTI_CHEAT_LOGS: AntiCheatLog[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_DAILY_METRICS: DailyMetrics = {
  jogadoresAtivos: 1420,
  receitaDoDiaBrl: 0,
  novosCadastrosHoje: 0,
  totalPartidasHoje: 0,
  ossoCoinsCirculando: 250000,
  suspeitosDetectados: 0,
};

export const PHPMYADMIN_SQL_SCHEMA = `-- =============================================================================
-- BANCO DE DADOS: Vira-Lata Run: Moto-Chaser
-- COMPATIBILIDADE: MySQL 8.0+ / MariaDB 10.5+ / phpMyAdmin
-- GERADO EM: 2026-08-19
-- =============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS \`viralata_run_db\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`viralata_run_db\`;

-- --------------------------------------------------------
-- 1. TABELA DE USUÁRIOS & RBAC (Role Based Access Control)
-- --------------------------------------------------------
CREATE TABLE \`users\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`nickname\` VARCHAR(50) NOT NULL UNIQUE,
  \`email\` VARCHAR(150) NOT NULL UNIQUE,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`role\` ENUM('root', 'admin', 'player') NOT NULL DEFAULT 'player',
  \`status\` ENUM('Ativo', 'Suspenso', 'Banido', 'Em Análise') NOT NULL DEFAULT 'Ativo',
  \`osso_coins\` INT NOT NULL DEFAULT 0,
  \`skin_equipada_id\` VARCHAR(50) NOT NULL DEFAULT 'skin-tradicional',
  \`is_guest\` TINYINT(1) NOT NULL DEFAULT 0,
  \`ip_origem\` VARCHAR(45) NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_user_role\` (\`role\`),
  INDEX \`idx_user_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. TABELA DE ESTATÍSTICAS DO JOGADOR
-- --------------------------------------------------------
CREATE TABLE \`player_stats\` (
  \`user_id\` VARCHAR(36) NOT NULL,
  \`maior_pontuacao\` INT NOT NULL DEFAULT 0,
  \`motoqueiros_mordidos\` INT NOT NULL DEFAULT 0,
  \`chinelos_desviados\` INT NOT NULL DEFAULT 0,
  \`distancia_km\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  \`partidas_jogadas\` INT NOT NULL DEFAULT 0,
  \`status_quebrada\` VARCHAR(50) NOT NULL DEFAULT 'Filhote de Calçada',
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`user_id\`),
  INDEX \`idx_highscore\` (\`maior_pontuacao\` DESC),
  CONSTRAINT \`fk_stats_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. TABELA DO CATÁLOGO DE SKINS (LIVEOPS ECONOMY)
-- --------------------------------------------------------
CREATE TABLE \`skins\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`nome\` VARCHAR(100) NOT NULL,
  \`tipo\` ENUM('Comum', 'Rara', 'Especial', 'Lendária') NOT NULL DEFAULT 'Comum',
  \`descricao\` TEXT NULL,
  \`preco_moedas\` INT NOT NULL DEFAULT 0,
  \`preco_reais\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  \`is_real_money_only\` TINYINT(1) NOT NULL DEFAULT 0,
  \`ativa_loja\` TINYINT(1) NOT NULL DEFAULT 1,
  \`em_promocao\` TINYINT(1) NOT NULL DEFAULT 0,
  \`desconto_percentual\` INT NOT NULL DEFAULT 0,
  \`acessorios_json\` JSON NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. TABELA DE INVENTÁRIO DO JOGADOR
-- --------------------------------------------------------
CREATE TABLE \`player_inventory\` (
  \`id\` INT AUTO_INCREMENT NOT NULL,
  \`user_id\` VARCHAR(36) NOT NULL,
  \`skin_id\` VARCHAR(50) NOT NULL,
  \`adquirido_em\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`origem\` ENUM('COMPRA_MOEDAS', 'COMPRA_REAIS', 'CONQUISTA', 'PADRAO_INICIAL') NOT NULL DEFAULT 'COMPRA_MOEDAS',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_user_skin\` (\`user_id\`, \`skin_id\`),
  CONSTRAINT \`fk_inventory_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_inventory_skin\` FOREIGN KEY (\`skin_id\`) REFERENCES \`skins\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. TABELA DE TRANSAÇÕES FINANCEIRAS (MICROTRANSAÇÕES)
-- --------------------------------------------------------
CREATE TABLE \`transactions\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`user_id\` VARCHAR(36) NOT NULL,
  \`item_comprado\` VARCHAR(150) NOT NULL,
  \`tipo_item\` ENUM('SKIN', 'PACOTE_MOEDAS', 'PASSE_TEMPORADA') NOT NULL,
  \`valor_brl\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  \`valor_moedas\` INT NULL DEFAULT 0,
  \`metodo_pagamento\` ENUM('PIX', 'CARTAO', 'BOLETO', 'OSSOCOINS') NOT NULL,
  \`status\` ENUM('Aprovado', 'Pendente', 'Cancelado') NOT NULL DEFAULT 'Pendente',
  \`gateway_transacao_id\` VARCHAR(100) NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_tx_user\` (\`user_id\`),
  INDEX \`idx_tx_status\` (\`status\`),
  CONSTRAINT \`fk_tx_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. TABELA DE LOGS DE GAMEPLAY E ANTI-CHEAT
-- --------------------------------------------------------
CREATE TABLE \`anti_cheat_logs\` (
  \`id\` VARCHAR(50) NOT NULL,
  \`user_id\` VARCHAR(36) NOT NULL,
  \`score_obtido\` INT NOT NULL,
  \`duracao_segundos\` INT NOT NULL,
  \`motoboys_mordidos\` INT NOT NULL,
  \`motivo_suspeita\` TEXT NOT NULL,
  \`status\` ENUM('Suspeito', 'Confirmado Hack', 'Falso Positivo', 'Banido') NOT NULL DEFAULT 'Suspeito',
  \`telemetria_json\` JSON NULL,
  \`ip_origem\` VARCHAR(45) NOT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_anticheat_status\` (\`status\`),
  CONSTRAINT \`fk_anticheat_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- SEED DATA INICIAL
-- --------------------------------------------------------
INSERT INTO \`skins\` (\`id\`, \`nome\`, \`tipo\`, \`descricao\`, \`preco_moedas\`, \`preco_reais\`, \`is_real_money_only\`, \`ativa_loja\`, \`em_promocao\`, \`desconto_percentual\`) VALUES
('skin-tradicional', 'Caramelo Raiz', 'Comum', 'O autêntico vira-lata brasileiro.', 0, 0.00, 0, 1, 0, 0),
('skin-juliete', 'Óculos Juliete', 'Rara', 'Estilo puro da quebrada com óculos espelhado.', 1200, 3.50, 0, 1, 1, 15),
('skin-cria', 'Caramelo Cria', 'Especial', 'Capuz estiloso e corrente pesada no pescoço.', 500, 2.00, 0, 1, 0, 0),
('skin-cibernetico', 'Cibernético 2077', 'Lendária', 'Modificado com implantes nanotecnológicos.', 4500, 4.90, 1, 1, 0, 0),
('skin-dourado', 'Caramelo Dourado VIP', 'Lendária', 'Feito de puro ouro maciço 24k com coroa.', 10000, 14.90, 0, 1, 0, 0),
('skin-capivara', 'Disfarce de Capivara', 'Rara', '100% de carisma brasileiro.', 1800, 4.50, 0, 1, 0, 0);

INSERT INTO \`users\` (\`id\`, \`nickname\`, \`email\`, \`password_hash\`, \`role\`, \`status\`, \`osso_coins\`, \`skin_equipada_id\`) VALUES
('usr-root-01', 'RootMaster', 'root@viralatarun.com.br', '$2y$12$e8Yk2uR7l9KxN/AdminHashGenerated123', 'root', 'Ativo', 99999, 'skin-dourado'),
('usr-admin-01', 'Admin01', 'admin01@viralatarun.com.br', '$2y$12$e8Yk2uR7l9KxN/AdminHashGenerated456', 'admin', 'Ativo', 25000, 'skin-cibernetico'),
('usr-player-01', 'ReyDoLatido', 'reydolatido@gamers.br', '$2y$12$e8Yk2uR7l9KxN/PlayerHashGenerated789', 'player', 'Ativo', 3840, 'skin-juliete'),
('usr-player-02', 'MordeCanela', 'mordecanela@meme.com', '$2y$12$e8Yk2uR7l9KxN/PlayerHashGenerated101', 'player', 'Ativo', 2100, 'skin-cria'),
('usr-player-03', 'PneuFurou', 'pneufurou@brazil.com', '$2y$12$e8Yk2uR7l9KxN/PlayerHashGenerated102', 'player', 'Ativo', 1450, 'skin-tradicional');

INSERT INTO \`player_stats\` (\`user_id\`, \`maior_pontuacao\`, \`motoqueiros_mordidos\`, \`chinelos_desviados\`, \`distancia_km\`, \`status_quebrada\`) VALUES
('usr-root-01', 250000, 2500, 1800, 420.50, 'Lendário Alfa da Quebrada'),
('usr-admin-01', 165000, 1100, 750, 210.00, 'Terror dos Motoboys'),
('usr-player-01', 184320, 1402, 940, 312.40, 'Lendário Alfa da Quebrada'),
('usr-player-02', 152100, 980, 620, 245.80, 'Terror dos Motoboys'),
('usr-player-03', 141050, 870, 510, 198.30, 'Terror dos Motoboys');

INSERT INTO \`player_inventory\` (\`user_id\`, \`skin_id\`, \`origem\`) VALUES
('usr-player-01', 'skin-tradicional', 'PADRAO_INICIAL'),
('usr-player-01', 'skin-juliete', 'COMPRA_MOEDAS'),
('usr-player-01', 'skin-cria', 'COMPRA_MOEDAS'),
('usr-player-02', 'skin-tradicional', 'PADRAO_INICIAL'),
('usr-player-02', 'skin-cria', 'COMPRA_MOEDAS'),
('usr-player-03', 'skin-tradicional', 'PADRAO_INICIAL');

COMMIT;
`;
