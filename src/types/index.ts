export type UserRole = 'root' | 'admin' | 'player';

export type SkinRarity = 'Comum' | 'Rara' | 'Especial' | 'Lendária' | 'Mítica';

export type PaymentMethod = 'PIX' | 'CARTAO' | 'BOLETO' | 'OSSOCOINS';

export type AccountStatus = 'Ativo' | 'Suspenso' | 'Banido' | 'Em Análise';

export interface Skin {
  id: string;
  nome: string;
  tipo: SkinRarity;
  descricao: string;
  precoMoedas: number;
  precoReais: number;
  isRealMoneyOnly: boolean;
  imagem: string;
  corPrimaria: string;
  corSecundaria: string;
  acessorios: {
    oculos?: boolean;
    tipoOculos?: 'juliete' | 'cibernetico' | 'nenhum';
    chapeu?: 'capuz' | 'coroa' | 'bone' | 'nenhum';
    coleira?: 'dourada' | 'espinhos' | 'vermelha' | 'nenhuma';
    brilho?: boolean;
    efeitoAura?: string;
  };
  ativaLoja: boolean;
  emPromocao?: boolean;
  descontoPercentual?: number;
  desbloqueioPorConquista?: string;
  precoNotas10?: number;
  precoNotas50?: number;
  precoNotas100?: number;
  tipoMoeda?: 'nota10' | 'nota50' | 'nota100' | 'ossoCoins';
}

export interface PlayerStats {
  maiorPontuacao: number;
  motoqueirosMordidos: number;
  chinelosDesviados: number;
  distanciaKm: number;
  conquistasDesbloqueadas: number;
  totalConquistas: number;
  statusQuebrada: 'Filhote de Calçada' | 'Vira-Lata Esguio' | 'Terror dos Motoboys' | 'Cão de Guarda Alerta' | 'Lendário Alfa da Quebrada';
}

export interface User {
  id: string;
  nickname: string;
  email: string;
  senha?: string;
  role: UserRole;
  avatarUrl?: string;
  profilePhotoUrl?: string;
  ossoCoins: number;
  notas10?: number;
  notas50?: number;
  notas100?: number;
  skinEquipadaId: string;
  status: AccountStatus;
  criadoEm: string;
  ultimoAcesso: string;
  ipOrigem?: string;
  isGuest?: boolean;
  stats: PlayerStats;
  inventarioSkinIds: string[];
}

export interface Achievement {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  progressoAtual: number;
  progressoMaximo: number;
  desbloqueada: boolean;
  recompensaMoedas: number;
  recompensaSkinId?: string;
}

export interface AntiCheatLog {
  id: string;
  playerId: string;
  nickname: string;
  scoreObtido: number;
  duracaoSegundos: number;
  motoboysMordidos: number;
  motivoSuspeita: string;
  status: 'Suspeito' | 'Confirmado Hack' | 'Falso Positivo' | 'Banido';
  dataRegistro: string;
  ip: string;
}

export interface Transaction {
  id: string;
  playerId: string;
  nickname: string;
  itemComprado: string;
  tipoItem: 'SKIN' | 'PACOTE_MOEDAS' | 'PASSE_TEMPORADA';
  valorBrl: number;
  valorOssoCoins?: number;
  metodo: PaymentMethod;
  status: 'Aprovado' | 'Pendente' | 'Cancelado';
  dataHora: string;
}

export interface DailyMetrics {
  jogadoresAtivos: number;
  receitaDoDiaBrl: number;
  novosCadastrosHoje: number;
  totalPartidasHoje: number;
  ossoCoinsCirculando: number;
  suspeitosDetectados: number;
}

export interface GameOverImage {
  id: string;
  url: string;
  title: string;
  createdAt: string;
}


