export type RankTierId =
  | 'iniciante'
  | 'bronze'
  | 'prata'
  | 'ouro'
  | 'platina'
  | 'diamante'
  | 'mestre'
  | 'lendario';

export type CompetitiveMissionFrequency = 'daily' | 'weekly' | 'season';
export type CompetitiveMissionMode = 'moto' | 'caramelo';

export type CompetitiveMissionMetric =
  | 'pizza_deliveries'
  | 'pizza_streak'
  | 'fast_delivery'
  | 'dog_dodges'
  | 'cash_collected'
  | 'cash_combo'
  | 'bones_collected'
  | 'bone_combo'
  | 'pursuit_distance'
  | 'successful_bites'
  | 'motoboys_captured';

export interface RankTierDefinition {
  id: RankTierId;
  index: number;
  name: string;
  subtitle: string;
  minTrophies: number;
  maxTrophies: number | null;
  primaryColor: string;
  secondaryColor: string;
  borderColor: string;
  glowColor: string;
  rewardCashOnPromotion: number;
  spriteCol: number;
  spriteRow: number;
}

export const RANK_TIERS: RankTierDefinition[] = [
  {
    id: 'iniciante',
    index: 0,
    name: 'Iniciante',
    subtitle: 'Sem Patente • Estreante da Rua',
    minTrophies: 0,
    maxTrophies: 149,
    primaryColor: '#94A3B8',
    secondaryColor: '#475569',
    borderColor: '#CBD5E1',
    glowColor: 'rgba(148, 163, 184, 0.45)',
    rewardCashOnPromotion: 0,
    spriteCol: 0,
    spriteRow: 0,
  },
  {
    id: 'bronze',
    index: 1,
    name: 'Bronze',
    subtitle: 'Cachorro de Calçada',
    minTrophies: 150,
    maxTrophies: 399,
    primaryColor: '#D97706',
    secondaryColor: '#78350F',
    borderColor: '#FBBF24',
    glowColor: 'rgba(217, 119, 6, 0.5)',
    rewardCashOnPromotion: 500,
    spriteCol: 1,
    spriteRow: 0,
  },
  {
    id: 'prata',
    index: 2,
    name: 'Prata',
    subtitle: 'Ás do Asfalto',
    minTrophies: 400,
    maxTrophies: 749,
    primaryColor: '#E2E8F0',
    secondaryColor: '#64748B',
    borderColor: '#F8FAFC',
    glowColor: 'rgba(226, 232, 240, 0.55)',
    rewardCashOnPromotion: 1200,
    spriteCol: 2,
    spriteRow: 0,
  },
  {
    id: 'ouro',
    index: 3,
    name: 'Ouro',
    subtitle: 'Rei do Grau & Perseguição',
    minTrophies: 750,
    maxTrophies: 1199,
    primaryColor: '#FACC15',
    secondaryColor: '#B45309',
    borderColor: '#FEF08A',
    glowColor: 'rgba(250, 204, 21, 0.6)',
    rewardCashOnPromotion: 2500,
    spriteCol: 3,
    spriteRow: 0,
  },
  {
    id: 'platina',
    index: 4,
    name: 'Platina',
    subtitle: 'Relâmpago da Quebrada',
    minTrophies: 1200,
    maxTrophies: 1799,
    primaryColor: '#38BDF8',
    secondaryColor: '#0369A1',
    borderColor: '#BAE6FD',
    glowColor: 'rgba(56, 189, 248, 0.65)',
    rewardCashOnPromotion: 4500,
    spriteCol: 0,
    spriteRow: 1,
  },
  {
    id: 'diamante',
    index: 5,
    name: 'Diamante',
    subtitle: 'Lenda Urbana 3D',
    minTrophies: 1800,
    maxTrophies: 2599,
    primaryColor: '#60A5FA',
    secondaryColor: '#1D4ED8',
    borderColor: '#DBEAFE',
    glowColor: 'rgba(96, 165, 250, 0.7)',
    rewardCashOnPromotion: 7500,
    spriteCol: 1,
    spriteRow: 1,
  },
  {
    id: 'mestre',
    index: 6,
    name: 'Mestre',
    subtitle: 'Soberano da Vila Tropical',
    minTrophies: 2600,
    maxTrophies: 3599,
    primaryColor: '#C084FC',
    secondaryColor: '#6B21A8',
    borderColor: '#F3E8FF',
    glowColor: 'rgba(192, 132, 252, 0.75)',
    rewardCashOnPromotion: 12000,
    spriteCol: 2,
    spriteRow: 1,
  },
  {
    id: 'lendario',
    index: 7,
    name: 'Lendário',
    subtitle: 'Imortal do Caramelo Run',
    minTrophies: 3600,
    maxTrophies: null,
    primaryColor: '#F43F5E',
    secondaryColor: '#9F1239',
    borderColor: '#FDE047',
    glowColor: 'rgba(244, 63, 94, 0.82)',
    rewardCashOnPromotion: 20000,
    spriteCol: 3,
    spriteRow: 1,
  },
];

export interface CompetitiveMission {
  id: string;
  title: string;
  description: string;
  mode: CompetitiveMissionMode;
  frequency: CompetitiveMissionFrequency;
  metric: CompetitiveMissionMetric;
  progress: number;
  target: number;
  trophiesReward: number;
  cashReward: number;
  claimed: boolean;
}

export interface LeaderboardCompetitor {
  id: string;
  name: string;
  avatarMotoboyId: string;
  trophies: number;
  competitivePoints: number;
  wins: number;
  rankTier: RankTierDefinition;
  isCurrentPlayer?: boolean;
}

export interface PlayerRankingState {
  trophies: number;
  highestTrophies: number;
  competitivePoints: number;
  totalMatches: number;
  motoWins: number;
  carameloWins: number;
  bestMotoCombo: number;
  bestCarameloCombo: number;
  totalPizzasDelivered: number;
  totalBonesCollected: number;
  missions: CompetitiveMission[];
  lastDailyResetDay: string;
}

export interface MatchCompetitiveReport {
  trophiesDelta: number;
  pointsDelta: number;
  completedMissionIds: string[];
  promotedFrom: RankTierDefinition | null;
  promotedTo: RankTierDefinition | null;
  promotionCashBonus: number;
}

const RANKING_STORAGE_KEY = 'caramelo_ranking_state_v1';

export function getRankTierByTrophies(trophies: number): RankTierDefinition {
  const safe = Math.max(0, Math.floor(trophies));
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (safe >= RANK_TIERS[i].minTrophies) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

export function getNextRankTier(currentTier: RankTierDefinition): RankTierDefinition | null {
  const nextIdx = currentTier.index + 1;
  return nextIdx < RANK_TIERS.length ? RANK_TIERS[nextIdx] : null;
}

export function getRankProgressInfo(trophies: number): {
  currentTier: RankTierDefinition;
  nextTier: RankTierDefinition | null;
  progressPercent: number;
  trophiesIntoTier: number;
  trophiesNeededForNext: number;
} {
  const currentTier = getRankTierByTrophies(trophies);
  const nextTier = getNextRankTier(currentTier);
  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      progressPercent: 100,
      trophiesIntoTier: trophies - currentTier.minTrophies,
      trophiesNeededForNext: 0,
    };
  }
  const span = Math.max(1, nextTier.minTrophies - currentTier.minTrophies);
  const into = Math.max(0, trophies - currentTier.minTrophies);
  const pct = Math.min(100, Math.max(0, Math.round((into / span) * 100)));
  return {
    currentTier,
    nextTier,
    progressPercent: pct,
    trophiesIntoTier: into,
    trophiesNeededForNext: Math.max(0, nextTier.minTrophies - trophies),
  };
}

function getTodayIsoKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Gera missões competitivas progressivas (Diárias, Semanais e de Temporada)
 * para o Modo Motoboy e o Modo Caramelo, escalando dificuldade e recompensas conforme a patente!
 */
export function buildProgressiveMissionsForRank(rankIndex: number): CompetitiveMission[] {
  const mult = 1 + rankIndex * 0.45;
  const rewardMult = 1 + rankIndex * 0.35;

  const pizzaTarget = Math.max(4, Math.round(5 * mult));
  const pizzaStreakTarget = Math.max(3, Math.round(4 * mult));
  const dogDodgeTarget = Math.max(2, Math.round(3 * mult));
  const cashComboTarget = Math.min(12, 4 + rankIndex);
  const cashCollectTarget = Math.round(600 * mult);
  const fastDeliveryTarget = Math.max(8, Math.round(12 * mult));

  const bonesTarget = Math.max(12, Math.round(16 * mult));
  const boneComboTarget = Math.min(12, 4 + rankIndex);
  const bitesTarget = Math.max(3, Math.round(4 * mult));
  const pursuitDistTarget = Math.round(450 * mult);
  const capturesTarget = Math.max(1, Math.round(1.5 * mult));

  return [
    // MODO MOTOBOY — DIÁRIAS, SEMANAIS E TEMPORADA (Recompensas exclusivamente em DINHEIRO!)
    {
      id: `moto_daily_pizzas_${rankIndex}`,
      title: 'Expresso da Quebrada',
      description: `Entregue ${pizzaTarget} pizzas quentinhas para os clientes na calçada.`,
      mode: 'moto',
      frequency: 'daily',
      metric: 'pizza_deliveries',
      progress: 0,
      target: pizzaTarget,
      trophiesReward: 0,
      cashReward: Math.round(450 * rewardMult),
      claimed: false,
    },
    {
      id: `moto_daily_streak_${rankIndex}`,
      title: 'Entrega Impecável',
      description: `Realize ${pizzaStreakTarget} entregas de pizza na mesma corrida com pelo menos 7 corações.`,
      mode: 'moto',
      frequency: 'daily',
      metric: 'pizza_streak',
      progress: 0,
      target: pizzaStreakTarget,
      trophiesReward: 0,
      cashReward: Math.round(550 * rewardMult),
      claimed: false,
    },
    {
      id: `moto_daily_dodge_${rankIndex}`,
      title: 'Olé no Caramelo',
      description: `Desvie de ${dogDodgeTarget} botes da faixa vermelha do Caramelo sem sofrer mordida.`,
      mode: 'moto',
      frequency: 'daily',
      metric: 'dog_dodges',
      progress: 0,
      target: dogDodgeTarget,
      trophiesReward: 0,
      cashReward: Math.round(500 * rewardMult),
      claimed: false,
    },
    {
      id: `moto_weekly_combo_${rankIndex}`,
      title: 'Combo Magnético de Notas',
      description: `Alcance um multiplicador de combo de dinheiro de ${cashComboTarget}x coletando notas em sequência.`,
      mode: 'moto',
      frequency: 'weekly',
      metric: 'cash_combo',
      progress: 0,
      target: cashComboTarget,
      trophiesReward: 0,
      cashReward: Math.round(950 * rewardMult),
      claimed: false,
    },
    {
      id: `moto_weekly_cash_${rankIndex}`,
      title: 'Caixa Forte do Grau',
      description: `Acumule R$ ${cashCollectTarget.toLocaleString('pt-BR')} em notas coletadas nas ruas.`,
      mode: 'moto',
      frequency: 'weekly',
      metric: 'cash_collected',
      progress: 0,
      target: cashCollectTarget,
      trophiesReward: 0,
      cashReward: Math.round(1200 * rewardMult),
      claimed: false,
    },
    {
      id: `moto_season_fast_${rankIndex}`,
      title: 'Lenda das Entregas no Prazo',
      description: `Conclua ${fastDeliveryTarget} entregas em alta velocidade ou missões completas de fuga.`,
      mode: 'moto',
      frequency: 'season',
      metric: 'fast_delivery',
      progress: 0,
      target: fastDeliveryTarget,
      trophiesReward: 0,
      cashReward: Math.round(2200 * rewardMult),
      claimed: false,
    },

    // MODO CARAMELO — DIÁRIAS, SEMANAIS E TEMPORADA (Recompensas exclusivamente em DINHEIRO!)
    {
      id: `dog_daily_bones_${rankIndex}`,
      title: 'Banquete de Ossos',
      description: `Colete ${bonesTarget} ossos brancos durante a perseguição ao motoboy.`,
      mode: 'caramelo',
      frequency: 'daily',
      metric: 'bones_collected',
      progress: 0,
      target: bonesTarget,
      trophiesReward: 0,
      cashReward: Math.round(450 * rewardMult),
      claimed: false,
    },
    {
      id: `dog_daily_bites_${rankIndex}`,
      title: 'Mordida Certeira',
      description: `Acerte ${bitesTarget} ataques bem-sucedidos no motoboy na barra de precisão.`,
      mode: 'caramelo',
      frequency: 'daily',
      metric: 'successful_bites',
      progress: 0,
      target: bitesTarget,
      trophiesReward: 0,
      cashReward: Math.round(580 * rewardMult),
      claimed: false,
    },
    {
      id: `dog_weekly_combo_${rankIndex}`,
      title: 'Faro Implacável (Combo)',
      description: `Alcance um combo sequencial de ossos de ${boneComboTarget}x sem deixar o combo quebrar.`,
      mode: 'caramelo',
      frequency: 'weekly',
      metric: 'bone_combo',
      progress: 0,
      target: boneComboTarget,
      trophiesReward: 0,
      cashReward: Math.round(950 * rewardMult),
      claimed: false,
    },
    {
      id: `dog_weekly_pursuit_${rankIndex}`,
      title: 'Perseguição Incansável',
      description: `Percorra ${pursuitDistTarget}m caçando o motoboy em alta velocidade no Modo Caramelo.`,
      mode: 'caramelo',
      frequency: 'weekly',
      metric: 'pursuit_distance',
      progress: 0,
      target: pursuitDistTarget,
      trophiesReward: 0,
      cashReward: Math.round(1100 * rewardMult),
      claimed: false,
    },
    {
      id: `dog_season_capture_${rankIndex}`,
      title: 'Terror dos Motoboys',
      description: `Capture e derrote ${capturesTarget} motoboy(s) zerando todas as vidas dele na perseguição.`,
      mode: 'caramelo',
      frequency: 'season',
      metric: 'motoboys_captured',
      progress: 0,
      target: capturesTarget,
      trophiesReward: 0,
      cashReward: Math.round(2400 * rewardMult),
      claimed: false,
    },
  ];
}

export function loadPlayerRankingState(): PlayerRankingState {
  const today = getTodayIsoKey();
  try {
    const raw = localStorage.getItem(RANKING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerRankingState>;
      const trophies = Math.max(0, Number(parsed.trophies) || 0);
      const tier = getRankTierByTrophies(trophies);
      let missions = Array.isArray(parsed.missions) ? parsed.missions : [];
      if (missions.length === 0) {
        missions = buildProgressiveMissionsForRank(tier.index);
      } else if (parsed.lastDailyResetDay !== today) {
        // Renova missões diárias já resgatadas na virada do dia
        const freshDaily = buildProgressiveMissionsForRank(tier.index).filter(
          (m) => m.frequency === 'daily',
        );
        missions = [
          ...freshDaily,
          ...missions.filter((m) => m.frequency !== 'daily'),
        ];
      }
      // Garante que todas as missões deem exclusivamente DINHEIRO (zero troféus)
      missions = missions.map((m) => ({ ...m, trophiesReward: 0 }));
      return {
        trophies,
        highestTrophies: Math.max(trophies, Number(parsed.highestTrophies) || trophies),
        competitivePoints: Math.max(0, Number(parsed.competitivePoints) || trophies * 12),
        totalMatches: Math.max(0, Number(parsed.totalMatches) || 0),
        motoWins: Math.max(0, Number(parsed.motoWins) || 0),
        carameloWins: Math.max(0, Number(parsed.carameloWins) || 0),
        bestMotoCombo: Math.max(1, Number(parsed.bestMotoCombo) || 1),
        bestCarameloCombo: Math.max(1, Number(parsed.bestCarameloCombo) || 1),
        totalPizzasDelivered: Math.max(0, Number(parsed.totalPizzasDelivered) || 0),
        totalBonesCollected: Math.max(0, Number(parsed.totalBonesCollected) || 0),
        missions,
        lastDailyResetDay: today,
      };
    }
  } catch {
    // Ignore storage read errors
  }

  return {
    trophies: 165, // Começa próximo ao Bronze para o jogador já sentir a progressão competitiva viva!
    highestTrophies: 165,
    competitivePoints: 2150,
    totalMatches: 0,
    motoWins: 0,
    carameloWins: 0,
    bestMotoCombo: 1,
    bestCarameloCombo: 1,
    totalPizzasDelivered: 0,
    totalBonesCollected: 0,
    missions: buildProgressiveMissionsForRank(1),
    lastDailyResetDay: today,
  };
}

export function savePlayerRankingState(state: PlayerRankingState): void {
  try {
    localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write errors
  }
}

export function evaluateMatchCompetitiveProgress(
  prevState: PlayerRankingState,
  params: {
    mode: 'moto' | 'caramelo';
    isVictory: boolean;
    score: number;
    distance: number;
    hpLeft: number;
    pizzasDelivered: number;
    dodgeCount: number;
    cashEarnedInRun: number;
    maxPickupCombo: number;
    bonesCollected: number;
    bitesLanded: number;
    motoboysDefeated: number;
  },
): { nextState: PlayerRankingState; report: MatchCompetitiveReport } {
  const prevTier = getRankTierByTrophies(prevState.trophies);

  // Calcula troféus e pontos competitivos ganhos na partida
  let trophiesDelta = 0;
  if (params.mode === 'moto') {
    trophiesDelta =
      (params.isVictory ? 38 : 8) +
      params.pizzasDelivered * 4 +
      params.dodgeCount * 3 +
      Math.floor(params.distance / 180);
  } else {
    trophiesDelta =
      (params.isVictory ? 42 : 9) +
      params.bitesLanded * 5 +
      Math.floor(params.bonesCollected * 1.5) +
      Math.floor(params.distance / 180);
  }
  trophiesDelta = Math.max(4, Math.min(95, trophiesDelta));

  const pointsDelta =
    Math.round(params.score * 0.25) +
    trophiesDelta * 15 +
    (params.isVictory ? 450 : 90);

  const completedMissionIds: string[] = [];
  const updatedMissions = prevState.missions.map((m) => {
    if (m.claimed || m.mode !== params.mode) return m;
    const wasComplete = m.progress >= m.target;
    let nextProg = m.progress;

    switch (m.metric) {
      case 'pizza_deliveries':
        nextProg += params.pizzasDelivered;
        break;
      case 'pizza_streak':
        if (params.hpLeft >= 7) {
          nextProg = Math.max(nextProg, params.pizzasDelivered);
        }
        break;
      case 'fast_delivery':
        nextProg += params.pizzasDelivered + (params.isVictory ? 2 : 0);
        break;
      case 'dog_dodges':
        nextProg += params.dodgeCount;
        break;
      case 'cash_collected':
        nextProg += params.cashEarnedInRun;
        break;
      case 'cash_combo':
        nextProg = Math.max(nextProg, params.maxPickupCombo);
        break;
      case 'bones_collected':
        nextProg += params.bonesCollected;
        break;
      case 'bone_combo':
        nextProg = Math.max(nextProg, params.maxPickupCombo);
        break;
      case 'pursuit_distance':
        nextProg += Math.round(params.distance);
        break;
      case 'successful_bites':
        nextProg += params.bitesLanded;
        break;
      case 'motoboys_captured':
        nextProg += params.motoboysDefeated + (params.isVictory ? 1 : 0);
        break;
    }

    const clampedProg = Math.min(m.target, nextProg);
    if (!wasComplete && clampedProg >= m.target) {
      completedMissionIds.push(m.id);
    }
    return {
      ...m,
      progress: clampedProg,
    };
  });

  const nextTrophies = prevState.trophies + trophiesDelta;
  const nextTier = getRankTierByTrophies(nextTrophies);
  const promoted = nextTier.index > prevTier.index;
  const promotionCashBonus = promoted ? nextTier.rewardCashOnPromotion : 0;

  // Se subiu de patente e já resgatou várias missões, adiciona missões da nova patente!
  let finalMissions = updatedMissions;
  if (promoted) {
    const newRankMissions = buildProgressiveMissionsForRank(nextTier.index);
    const existingUnclaimed = updatedMissions.filter((m) => !m.claimed);
    const mergedIds = new Set(existingUnclaimed.map((m) => m.id));
    for (const nm of newRankMissions) {
      if (!mergedIds.has(nm.id) && existingUnclaimed.length < 12) {
        existingUnclaimed.push(nm);
      }
    }
    finalMissions = existingUnclaimed;
  }

  const nextState: PlayerRankingState = {
    ...prevState,
    trophies: nextTrophies,
    highestTrophies: Math.max(prevState.highestTrophies, nextTrophies),
    competitivePoints: prevState.competitivePoints + pointsDelta,
    totalMatches: prevState.totalMatches + 1,
    motoWins: prevState.motoWins + (params.mode === 'moto' && params.isVictory ? 1 : 0),
    carameloWins: prevState.carameloWins + (params.mode === 'caramelo' && params.isVictory ? 1 : 0),
    bestMotoCombo:
      params.mode === 'moto'
        ? Math.max(prevState.bestMotoCombo, params.maxPickupCombo)
        : prevState.bestMotoCombo,
    bestCarameloCombo:
      params.mode === 'caramelo'
        ? Math.max(prevState.bestCarameloCombo, params.maxPickupCombo)
        : prevState.bestCarameloCombo,
    totalPizzasDelivered: prevState.totalPizzasDelivered + params.pizzasDelivered,
    totalBonesCollected: prevState.totalBonesCollected + params.bonesCollected,
    missions: finalMissions,
  };

  savePlayerRankingState(nextState);

  return {
    nextState,
    report: {
      trophiesDelta,
      pointsDelta,
      completedMissionIds,
      promotedFrom: promoted ? prevTier : null,
      promotedTo: promoted ? nextTier : null,
      promotionCashBonus,
    },
  };
}

export function claimCompetitiveMission(
  prevState: PlayerRankingState,
  missionId: string,
): {
  nextState: PlayerRankingState;
  trophiesEarned: number;
  cashEarned: number;
  promotedFrom: RankTierDefinition | null;
  promotedTo: RankTierDefinition | null;
} {
  const targetMission = prevState.missions.find((m) => m.id === missionId);
  if (!targetMission || targetMission.claimed || targetMission.progress < targetMission.target) {
    return {
      nextState: prevState,
      trophiesEarned: 0,
      cashEarned: 0,
      promotedFrom: null,
      promotedTo: null,
    };
  }

  // Missões concedem exclusivamente dinheiro, sem troféus para manter troféus apenas em vitórias competitivas!
  const nextTrophies = prevState.trophies;

  let nextMissions = prevState.missions.map((m) =>
    m.id === missionId ? { ...m, claimed: true, trophiesReward: 0 } : m,
  );

  const currentTier = getRankTierByTrophies(nextTrophies);
  // Se todas as missões de um modo foram resgatadas, gera um novo ciclo mais difícil da patente atual!
  const remainingActive = nextMissions.filter((m) => !m.claimed);
  if (remainingActive.length <= 2) {
    nextMissions = buildProgressiveMissionsForRank(currentTier.index);
  }

  const nextState: PlayerRankingState = {
    ...prevState,
    missions: nextMissions,
  };

  savePlayerRankingState(nextState);

  return {
    nextState,
    trophiesEarned: 0,
    cashEarned: targetMission.cashReward,
    promotedFrom: null,
    promotedTo: null,
  };
}

const ELITE_RIVALS_SEED: Array<{
  id: string;
  name: string;
  avatarMotoboyId: string;
  trophies: number;
  competitivePoints: number;
  wins: number;
}> = [
  {
    id: 'rival_1',
    name: 'KelvinGrauRJ',
    avatarMotoboyId: 'motoboy_5',
    trophies: 3890,
    competitivePoints: 64200,
    wins: 142,
  },
  {
    id: 'rival_2',
    name: 'GuilhermeTurbo',
    avatarMotoboyId: 'motoboy_2',
    trophies: 3640,
    competitivePoints: 58900,
    wins: 128,
  },
  {
    id: 'rival_3',
    name: 'ValdirDoCorte',
    avatarMotoboyId: 'motoboy_4',
    trophies: 2980,
    competitivePoints: 47500,
    wins: 104,
  },
  {
    id: 'rival_4',
    name: 'CarameloSupremo',
    avatarMotoboyId: 'motoboy_3',
    trophies: 2150,
    competitivePoints: 34800,
    wins: 86,
  },
  {
    id: 'rival_5',
    name: 'BielDaEntrega',
    avatarMotoboyId: 'motoboy_1',
    trophies: 1480,
    competitivePoints: 23400,
    wins: 61,
  },
  {
    id: 'rival_6',
    name: 'RaioDeCopacabana',
    avatarMotoboyId: 'motoboy_2',
    trophies: 920,
    competitivePoints: 14900,
    wins: 39,
  },
  {
    id: 'rival_7',
    name: 'TropaDaVila3D',
    avatarMotoboyId: 'motoboy_1',
    trophies: 510,
    competitivePoints: 8200,
    wins: 22,
  },
  {
    id: 'rival_8',
    name: 'FaiscaDoMorro',
    avatarMotoboyId: 'motoboy_3',
    trophies: 240,
    competitivePoints: 3900,
    wins: 11,
  },
];

export function buildCompetitiveLeaderboard(
  playerState: PlayerRankingState,
  playerName: string,
  playerAvatarId: string,
): LeaderboardCompetitor[] {
  const entries: LeaderboardCompetitor[] = ELITE_RIVALS_SEED.map((r) => ({
    ...r,
    rankTier: getRankTierByTrophies(r.trophies),
    isCurrentPlayer: false,
  }));

  entries.push({
    id: 'current_player',
    name: playerName || 'Piloto da Quebrada',
    avatarMotoboyId: playerAvatarId,
    trophies: playerState.trophies,
    competitivePoints: playerState.competitivePoints,
    wins: playerState.motoWins + playerState.carameloWins,
    rankTier: getRankTierByTrophies(playerState.trophies),
    isCurrentPlayer: true,
  });

  entries.sort((a, b) => {
    if (b.trophies !== a.trophies) return b.trophies - a.trophies;
    return b.competitivePoints - a.competitivePoints;
  });

  return entries;
}

// ============================================================================
// GERADOR PROCEDURAL EM CANVAS 2D HD DOS 8 EMBLEMAS 3D DE PATENTE
// (Escudo Metálico Facetado + Asas Progressivas + Coroa + Patinha Caramelo 3D)
// ============================================================================
const cachedRankEmblemUrls: Record<number, string> = {};
let rankEmblemsLoadPromise: Promise<Record<number, string>> | null = null;

interface EmblemPalette {
  metalLight: string;
  metalMid: string;
  metalDark: string;
  metalDeep: string;
  coreTop: string;
  coreBottom: string;
  gemLight: string;
  gemDark: string;
  glowRgba: string;
  pawLight: string;
  pawMid: string;
  pawDark: string;
  wingCount: number;
  crownPoints: number;
  hasRays: boolean;
}

const EMBLEM_PALETTES: EmblemPalette[] = [
  // 0: Iniciante (Ferro Escovado & Grafite)
  {
    metalLight: '#cbd5e1',
    metalMid: '#64748b',
    metalDark: '#334155',
    metalDeep: '#0f172a',
    coreTop: '#1e293b',
    coreBottom: '#090d16',
    gemLight: '#94a3b8',
    gemDark: '#334155',
    glowRgba: 'rgba(148, 163, 184, 0.28)',
    pawLight: '#cbd5e1',
    pawMid: '#64748b',
    pawDark: '#1e293b',
    wingCount: 2,
    crownPoints: 1,
    hasRays: false,
  },
  // 1: Bronze (Bronze Forjado & Cobre Quente)
  {
    metalLight: '#fdba74',
    metalMid: '#c2410c',
    metalDark: '#7c2d12',
    metalDeep: '#431407',
    coreTop: '#431407',
    coreBottom: '#1c0702',
    gemLight: '#fb923c',
    gemDark: '#9a3412',
    glowRgba: 'rgba(249, 115, 22, 0.36)',
    pawLight: '#fed7aa',
    pawMid: '#ea580c',
    pawDark: '#7c2d12',
    wingCount: 3,
    crownPoints: 1,
    hasRays: false,
  },
  // 2: Prata (Prata Cromada Espelhada)
  {
    metalLight: '#ffffff',
    metalMid: '#94a3b8',
    metalDark: '#475569',
    metalDeep: '#1e293b',
    coreTop: '#334155',
    coreBottom: '#0f172a',
    gemLight: '#e0f2fe',
    gemDark: '#0284c7',
    glowRgba: 'rgba(226, 232, 240, 0.45)',
    pawLight: '#ffffff',
    pawMid: '#cbd5e1',
    pawDark: '#475569',
    wingCount: 3,
    crownPoints: 3,
    hasRays: false,
  },
  // 3: Ouro (Ouro Imperial 24K & Rubi)
  {
    metalLight: '#fef08a',
    metalMid: '#eab308',
    metalDark: '#a16207',
    metalDeep: '#422006',
    coreTop: '#713f12',
    coreBottom: '#271203',
    gemLight: '#fca5a5',
    gemDark: '#dc2626',
    glowRgba: 'rgba(250, 204, 21, 0.55)',
    pawLight: '#fef9c3',
    pawMid: '#facc15',
    pawDark: '#854d0e',
    wingCount: 4,
    crownPoints: 3,
    hasRays: true,
  },
  // 4: Platina (Platina Ciano & Safira Celeste)
  {
    metalLight: '#e0f2fe',
    metalMid: '#38bdf8',
    metalDark: '#0369a1',
    metalDeep: '#082f49',
    coreTop: '#0c4a6e',
    coreBottom: '#041829',
    gemLight: '#67e8f9',
    gemDark: '#0891b2',
    glowRgba: 'rgba(56, 189, 248, 0.6)',
    pawLight: '#f0f9ff',
    pawMid: '#7dd3fc',
    pawDark: '#0369a1',
    wingCount: 4,
    crownPoints: 3,
    hasRays: true,
  },
  // 5: Diamante (Diamante Prismático Azul & Cristal Violeta)
  {
    metalLight: '#eef2ff',
    metalMid: '#60a5fa',
    metalDark: '#1d4ed8',
    metalDeep: '#1e1b4b',
    coreTop: '#312e81',
    coreBottom: '#0f0b29',
    gemLight: '#e879f9',
    gemDark: '#7e22ce',
    glowRgba: 'rgba(96, 165, 250, 0.68)',
    pawLight: '#ffffff',
    pawMid: '#93c5fd',
    pawDark: '#1e40af',
    wingCount: 5,
    crownPoints: 5,
    hasRays: true,
  },
  // 6: Mestre (Soberano Carmesim, Ametista & Ouro Real)
  {
    metalLight: '#fef08a',
    metalMid: '#f59e0b',
    metalDark: '#9a3412',
    metalDeep: '#450a0a',
    coreTop: '#881337',
    coreBottom: '#2c0412',
    gemLight: '#fda4af',
    gemDark: '#e11d48',
    glowRgba: 'rgba(244, 63, 94, 0.72)',
    pawLight: '#fef08a',
    pawMid: '#fbbf24',
    pawDark: '#9a3412',
    wingCount: 6,
    crownPoints: 5,
    hasRays: true,
  },
  // 7: Lendário (Lendário Supremo — Ouro Cósmico, Púrpura & Neon Ciano)
  {
    metalLight: '#ffffff',
    metalMid: '#facc15',
    metalDark: '#b45309',
    metalDeep: '#3b0764',
    coreTop: '#581c87',
    coreBottom: '#19032e',
    gemLight: '#67e8f9',
    gemDark: '#0284c7',
    glowRgba: 'rgba(192, 132, 252, 0.82)',
    pawLight: '#ffffff',
    pawMid: '#fde047',
    pawDark: '#ca8a04',
    wingCount: 6,
    crownPoints: 5,
    hasRays: true,
  },
];

function renderProceduralRankEmblem(tierIndex: number): string {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const pal = EMBLEM_PALETTES[Math.max(0, Math.min(EMBLEM_PALETTES.length - 1, tierIndex))];

  // 1. Aura Radiante de Fundo + Raios Dinâmicos nas Patentes Superiores
  const auraGrad = ctx.createRadialGradient(cx, cy - 4, 14, cx, cy - 4, 128);
  auraGrad.addColorStop(0, pal.glowRgba);
  auraGrad.addColorStop(0.65, pal.glowRgba.replace(/[\d.]+\)$/, '0.16)'));
  auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 128, 0, Math.PI * 2);
  ctx.fill();

  if (pal.hasRays) {
    ctx.save();
    ctx.translate(cx, cy - 4);
    const rayCount = tierIndex >= 6 ? 16 : 12;
    for (let i = 0; i < rayCount; i++) {
      const ang = (i / rayCount) * Math.PI * 2;
      ctx.save();
      ctx.rotate(ang);
      const rGrad = ctx.createLinearGradient(0, -18, 0, -122);
      rGrad.addColorStop(0, pal.metalLight);
      rGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rGrad;
      ctx.globalAlpha = tierIndex >= 6 ? 0.28 : 0.18;
      ctx.beginPath();
      ctx.moveTo(-6, -24);
      ctx.lineTo(0, -120 - (i % 2) * 10);
      ctx.lineTo(6, -24);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // 2. Asas Metálicas Simétricas (Esquerda e Direita) com Contorno Forte e Chanfro 3D
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(side, 1);

    for (let w = pal.wingCount - 1; w >= 0; w--) {
      const t = w / Math.max(1, pal.wingCount - 1);
      const spreadX = 68 + w * 13.5 + tierIndex * 2.2;
      const topY = -52 + w * 19;
      const tipY = -70 + w * 23 - tierIndex * 1.6;
      const botY = -20 + w * 21;

      const wingGrad = ctx.createLinearGradient(34, tipY, spreadX, botY);
      wingGrad.addColorStop(0, pal.metalLight);
      wingGrad.addColorStop(0.48, pal.metalMid);
      wingGrad.addColorStop(1, pal.metalDark);

      ctx.beginPath();
      ctx.moveTo(32, topY);
      ctx.quadraticCurveTo(58 + w * 6, tipY - 8, spreadX, tipY);
      ctx.quadraticCurveTo(spreadX - 8, (tipY + botY) * 0.5 + 4, 38, botY);
      ctx.closePath();

      ctx.lineWidth = 8;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#090401';
      ctx.stroke();

      ctx.fillStyle = wingGrad;
      ctx.fill();

      // Friso luminoso superior de cada pena da asa
      ctx.beginPath();
      ctx.moveTo(36, topY + 2);
      ctx.quadraticCurveTo(56 + w * 5, tipY - 3, spreadX - 5, tipY + 3);
      ctx.lineWidth = 2.4 - t * 0.6;
      ctx.strokeStyle = pal.metalLight;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Escudo Heráldico Facetado Central (Sombra Projetada + Contorno + Chanfro Metálico Duplo)
  const drawShieldPath = (scale = 1.0, offsetY = 0) => {
    const sw = 72 * scale;
    const topY = cy - 68 * scale + offsetY;
    const shoulderY = cy - 42 * scale + offsetY;
    const midY = cy + 16 * scale + offsetY;
    const botY = cy + 88 * scale + offsetY;

    ctx.beginPath();
    ctx.moveTo(cx, topY - 10 * scale);
    ctx.lineTo(cx + sw * 0.72, topY + 4 * scale);
    ctx.lineTo(cx + sw, shoulderY);
    ctx.quadraticCurveTo(cx + sw * 0.94, midY, cx, botY);
    ctx.quadraticCurveTo(cx - sw * 0.94, midY, cx - sw, shoulderY);
    ctx.lineTo(cx - sw * 0.72, topY + 4 * scale);
    ctx.closePath();
  };

  // Sombra externa pesada
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  drawShieldPath(1.03, 0);
  ctx.fillStyle = '#090401';
  ctx.fill();
  ctx.restore();

  // Contorno preto cartoon externo do escudo
  drawShieldPath(1.03, 0);
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#090401';
  ctx.stroke();

  // Moldura metálica externa chanfrada
  const rimGrad = ctx.createLinearGradient(cx - 70, cy - 75, cx + 70, cy + 85);
  rimGrad.addColorStop(0, pal.metalLight);
  rimGrad.addColorStop(0.32, pal.metalMid);
  rimGrad.addColorStop(0.68, pal.metalDark);
  rimGrad.addColorStop(1, pal.metalMid);
  drawShieldPath(1.0, 0);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  // Faceta metálica esquerda iluminada (efeito 3D)
  ctx.save();
  drawShieldPath(1.0, 0);
  ctx.clip();
  const leftFacetGrad = ctx.createLinearGradient(cx - 75, cy - 75, cx, cy + 80);
  leftFacetGrad.addColorStop(0, 'rgba(255,255,255,0.42)');
  leftFacetGrad.addColorStop(0.6, 'rgba(255,255,255,0.08)');
  leftFacetGrad.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = leftFacetGrad;
  ctx.fillRect(cx - 90, cy - 90, 90, 190);
  ctx.restore();

  // Borda interna escura + Núcleo profundo do escudo
  drawShieldPath(0.8, 2);
  ctx.lineWidth = 5.5;
  ctx.strokeStyle = '#090401';
  ctx.stroke();

  const coreGrad = ctx.createRadialGradient(cx, cy - 10, 6, cx, cy + 6, 72);
  coreGrad.addColorStop(0, pal.coreTop);
  coreGrad.addColorStop(0.7, pal.coreBottom);
  coreGrad.addColorStop(1, '#040201');
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // Filete brilhante interno ao redor do núcleo
  drawShieldPath(0.77, 2);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = pal.metalLight;
  ctx.globalAlpha = 0.65;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Rebites / Joias nos cantos do escudo
  const rivetPoints = [
    [cx - 56, cy - 36],
    [cx + 56, cy - 36],
    [cx - 46, cy + 16],
    [cx + 46, cy + 16],
    [cx, cy + 70],
  ];
  for (const [rx, ry] of rivetPoints) {
    ctx.beginPath();
    ctx.arc(rx, ry, 4.6, 0, Math.PI * 2);
    ctx.fillStyle = tierIndex >= 4 ? pal.gemLight : pal.metalLight;
    ctx.strokeStyle = '#090401';
    ctx.lineWidth = 2.4;
    ctx.fill();
    ctx.stroke();
  }

  // 4. Coroa / Crista Superior Progressiva no Topo do Escudo
  const crownBaseY = cy - 64;
  ctx.save();
  if (pal.crownPoints === 1) {
    // Crista Losango / Lança Metálica (Iniciante & Bronze)
    const crestH = tierIndex === 0 ? 28 : 34;
    const crestW = tierIndex === 0 ? 18 : 22;
    ctx.beginPath();
    ctx.moveTo(cx, crownBaseY - crestH);
    ctx.lineTo(cx + crestW, crownBaseY - crestH * 0.35);
    ctx.lineTo(cx, crownBaseY + 10);
    ctx.lineTo(cx - crestW, crownBaseY - crestH * 0.35);
    ctx.closePath();
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#090401';
    ctx.stroke();
    const cGrad = ctx.createLinearGradient(cx - crestW, crownBaseY - crestH, cx + crestW, crownBaseY + 10);
    cGrad.addColorStop(0, pal.metalLight);
    cGrad.addColorStop(0.5, pal.metalMid);
    cGrad.addColorStop(1, pal.metalDark);
    ctx.fillStyle = cGrad;
    ctx.fill();
  } else {
    // Coroa Real de 3 ou 5 Pontas (Prata até Lendário)
    const isFive = pal.crownPoints >= 5;
    const cw = isFive ? 46 : 36;
    const ch = isFive ? 42 : 34;
    ctx.beginPath();
    ctx.moveTo(cx - cw * 0.78, crownBaseY + 4);
    ctx.lineTo(cx - cw, crownBaseY - ch * 0.62);
    ctx.lineTo(cx - cw * 0.48, crownBaseY - ch * 0.25);
    if (isFive) {
      ctx.lineTo(cx - cw * 0.42, crownBaseY - ch * 0.85);
      ctx.lineTo(cx - cw * 0.16, crownBaseY - ch * 0.34);
    }
    ctx.lineTo(cx, crownBaseY - ch);
    if (isFive) {
      ctx.lineTo(cx + cw * 0.16, crownBaseY - ch * 0.34);
      ctx.lineTo(cx + cw * 0.42, crownBaseY - ch * 0.85);
    }
    ctx.lineTo(cx + cw * 0.48, crownBaseY - ch * 0.25);
    ctx.lineTo(cx + cw, crownBaseY - ch * 0.62);
    ctx.lineTo(cx + cw * 0.78, crownBaseY + 4);
    ctx.closePath();

    ctx.lineWidth = 7.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#090401';
    ctx.stroke();

    const crownGrad = ctx.createLinearGradient(cx, crownBaseY - ch, cx, crownBaseY + 6);
    crownGrad.addColorStop(0, '#ffffff');
    crownGrad.addColorStop(0.35, pal.metalLight);
    crownGrad.addColorStop(0.8, pal.metalMid);
    crownGrad.addColorStop(1, pal.metalDark);
    ctx.fillStyle = crownGrad;
    ctx.fill();

    // Joia central cravada na coroa
    ctx.beginPath();
    ctx.moveTo(cx, crownBaseY - 19);
    ctx.lineTo(cx + 8, crownBaseY - 9);
    ctx.lineTo(cx, crownBaseY + 1);
    ctx.lineTo(cx - 8, crownBaseY - 9);
    ctx.closePath();
    ctx.fillStyle = pal.gemLight;
    ctx.strokeStyle = '#090401';
    ctx.lineWidth = 2.8;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // 5. Patinha 3D em Alto-Relevo no Centro do Escudo (Almofada Principal + 4 Dedinhos)
  const pawGrad = ctx.createLinearGradient(cx - 28, cy - 32, cx + 28, cy + 36);
  pawGrad.addColorStop(0, pal.pawLight);
  pawGrad.addColorStop(0.45, pal.pawMid);
  pawGrad.addColorStop(1, pal.pawDark);

  // Almofada central esculpida da patinha
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.moveTo(cx, cy - 2);
  ctx.bezierCurveTo(cx + 16, cy - 2, cx + 26, cy + 12, cx + 22, cy + 25);
  ctx.bezierCurveTo(cx + 19, cy + 33, cx + 9, cy + 32, cx, cy + 27);
  ctx.bezierCurveTo(cx - 9, cy + 32, cx - 19, cy + 33, cx - 22, cy + 25);
  ctx.bezierCurveTo(cx - 26, cy + 12, cx - 16, cy - 2, cx, cy - 2);
  ctx.closePath();
  ctx.lineWidth = 6.5;
  ctx.strokeStyle = '#090401';
  ctx.stroke();
  ctx.fillStyle = pawGrad;
  ctx.fill();

  // Brilho especular na almofada central
  ctx.beginPath();
  ctx.ellipse(cx - 6, cy + 9, 8, 4.5, -0.35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.58)';
  ctx.fill();

  // 4 dedinhos ovais inclinados da patinha Caramelo
  const toes: Array<{ dx: number; dy: number; rx: number; ry: number; rot: number }> = [
    { dx: -27, dy: -6, rx: 7.5, ry: 10.5, rot: -0.42 },
    { dx: -10, dy: -19, rx: 8.2, ry: 11.5, rot: -0.15 },
    { dx: 10, dy: -19, rx: 8.2, ry: 11.5, rot: 0.15 },
    { dx: 27, dy: -6, rx: 7.5, ry: 10.5, rot: 0.42 },
  ];

  for (const toe of toes) {
    ctx.save();
    ctx.translate(cx + toe.dx, cy + toe.dy);
    ctx.rotate(toe.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, toe.rx, toe.ry, 0, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#090401';
    ctx.stroke();
    ctx.fillStyle = pawGrad;
    ctx.fill();

    // Brilho 3D no topo de cada dedinho
    ctx.beginPath();
    ctx.ellipse(-toe.rx * 0.22, -toe.ry * 0.28, toe.rx * 0.36, toe.ry * 0.34, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // 6. Brilhos Estelares / Partículas Dinâmicas nas Patentes Ouro+
  if (tierIndex >= 3) {
    const sparkles = [
      [cx - 68, cy - 66, 7],
      [cx + 72, cy - 60, 8],
      [cx - 82, cy + 12, 6],
      [cx + 82, cy + 16, 7],
      [cx, cy - 112, 9],
    ];
    for (const [sx, sy, sr] of sparkles) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -sr);
      ctx.quadraticCurveTo(1.5, -1.5, sr, 0);
      ctx.quadraticCurveTo(1.5, 1.5, 0, sr);
      ctx.quadraticCurveTo(-1.5, 1.5, -sr, 0);
      ctx.quadraticCurveTo(-1.5, -1.5, 0, -sr);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  return canvas.toDataURL('image/png');
}

export function loadAllRankEmblemSprites(): Promise<Record<number, string>> {
  if (Object.keys(cachedRankEmblemUrls).length === 8) {
    return Promise.resolve(cachedRankEmblemUrls);
  }
  if (rankEmblemsLoadPromise) return rankEmblemsLoadPromise;

  rankEmblemsLoadPromise = new Promise((resolve) => {
    try {
      for (let idx = 0; idx < 8; idx++) {
        cachedRankEmblemUrls[idx] = renderProceduralRankEmblem(idx);
      }
    } catch {
      // Fallback silencioso
    }
    resolve(cachedRankEmblemUrls);
  });

  return rankEmblemsLoadPromise;
}
