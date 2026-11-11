export type HouseStyle =
  | 'terrea_colonial'
  | 'platibanda_moderna'
  | 'sobrado_varanda'
  | 'varanda_muro'
  | 'comercio_esquina'
  | 'geminada';

export type RoofStyle = 'colonial_clay' | 'hipped_clay' | 'flat_parapet' | 'fiber_cement';

export type TreeType = 'none' | 'mango' | 'banana' | 'ipe_amarelo' | 'palm' | 'bougainvillea';

export interface HouseVariationSpec {
  id: number;
  name: string;
  regionTag: string;
  style: HouseStyle;
  roofStyle: RoofStyle;
  stories: 1 | 2;
  width: number;
  depth: number;
  height: number;
  spacingAfter: number; // Explicit spacing gap (meters) between this house and the next
  wallColor: string;
  upperWallColor?: string;
  basePlinthColor: string;
  trimColor: string;
  roofColor: string;
  doorColor: string;
  windowColor: string;
  gateColor: string;
  hasExposedBrick: boolean;
  hasSatelliteDish: boolean;
  hasWaterTank: boolean;
  hasFrontWall: boolean;
  hasBalcony: boolean;
  hasGarageGate: boolean;
  hasPlanterBox: boolean;
  hasStripedAwning: boolean;
  hasWindowGrille: boolean;
  hasLouveredWindow: boolean;
  hasElectricMeter: boolean;
  hasHammock: boolean;
  hasAzulejoStrip: boolean;
  doorSide: 'left' | 'right' | 'center';
  treeType: TreeType;
}

export const LANE_WIDTH = 3.15;
export const LANE_INDICES = [-1, 0, 1] as const;
export type LaneIndex = -1 | 0 | 1;

export const GRAVITY = 28.0;
export const JUMP_VELOCITY = 10.8;
export const ROLL_DURATION = 0.65;

export interface PlayerState {
  lane: LaneIndex;
  x: number;
  freeTargetX?: number;
  y: number;
  vy: number;
  vx?: number;
  steerInput?: number;
  isJumping: boolean;
  isRolling: boolean;
  rollTimer: number;
  invulnerableTimer: number;
  hp: number;
  maxHp: number;
  score: number;
  coins: number;
  distance: number;
  combo: number;
  speed: number;
  housesPassed: number;
}

export type ObstacleKind = 'cone_single' | 'cone_pair' | 'cavalete' | 'overhead_banner';

export interface TrackObstacle {
  id: number;
  z: number;
  lane: LaneIndex;
  kind: ObstacleKind;
  width: number;
  height: number;
  minY: number;
  hit: boolean;
  knockbackVx: number;
  knockbackVy: number;
  knockbackVz: number;
  rotX: number;
  rotZ: number;
}

export interface TrackCoin {
  id: number;
  z: number;
  lane: LaneIndex;
  y: number;
  collected: boolean;
}

/**
 * 30 Hand-Crafted Stylized Brazilian House Variations
 * First 5 directly match the user's attached reference sheet (Casas_Coloridas_em_Estilo_Cartum)
 */
export const HOUSE_VARIATIONS: readonly HouseVariationSpec[] = [
  {
    id: 1,
    name: 'Casa Amarela Ocre com Parabólica',
    regionTag: 'Subúrbio Paulista',
    style: 'terrea_colonial',
    roofStyle: 'colonial_clay',
    stories: 1,
    width: 7.4,
    depth: 6.8,
    height: 4.3,
    spacingAfter: 4.2,
    wallColor: '#F6B23E',
    basePlinthColor: '#9E6B3B',
    trimColor: '#FCE6B4',
    roofColor: '#D85A28',
    doorColor: '#7A3E1D',
    windowColor: '#E5E7EB',
    gateColor: '#374151',
    hasExposedBrick: true,
    hasSatelliteDish: true,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: false,
    hasStripedAwning: false,
    hasWindowGrille: false,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'left',
    treeType: 'mango',
  },
  {
    id: 2,
    name: 'Mercadinho Compra Certa',
    regionTag: 'Comércio do Bairro',
    style: 'comercio_esquina',
    roofStyle: 'flat_parapet',
    stories: 1,
    width: 7.8,
    depth: 7.0,
    height: 4.6,
    spacingAfter: 4.0,
    wallColor: '#E3D4B9',
    basePlinthColor: '#78716C',
    trimColor: '#3F3D42',
    roofColor: '#333136',
    doorColor: '#2E2A2D',
    windowColor: '#27272A',
    gateColor: '#232026',
    hasExposedBrick: false,
    hasSatelliteDish: false,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: true,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: false,
    hasLouveredWindow: false,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'right',
    treeType: 'none',
  },
  {
    id: 3,
    name: 'Casa Azul Celeste com Tijolinho Aparente',
    regionTag: 'Bairro Tradicional',
    style: 'terrea_colonial',
    roofStyle: 'hipped_clay',
    stories: 1,
    width: 7.2,
    depth: 6.6,
    height: 4.2,
    spacingAfter: 4.4,
    wallColor: '#3B9EE8',
    basePlinthColor: '#5B6470',
    trimColor: '#2C78B8',
    roofColor: '#D95326',
    doorColor: '#8B451D',
    windowColor: '#374151',
    gateColor: '#374151',
    hasExposedBrick: true,
    hasSatelliteDish: false,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: false,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: false,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'right',
    treeType: 'banana',
  },
  {
    id: 4,
    name: 'Sobrado Verde-Limão & Creme com Varanda',
    regionTag: 'Zona Norte',
    style: 'sobrado_varanda',
    roofStyle: 'colonial_clay',
    stories: 2,
    width: 7.6,
    depth: 7.2,
    height: 7.4,
    spacingAfter: 4.5,
    wallColor: '#F3D299',
    upperWallColor: '#76B82A',
    basePlinthColor: '#B59B72',
    trimColor: '#F7DFB5',
    roofColor: '#DA5826',
    doorColor: '#57534E',
    windowColor: '#334155',
    gateColor: '#6B6661',
    hasExposedBrick: false,
    hasSatelliteDish: false,
    hasWaterTank: true,
    hasFrontWall: false,
    hasBalcony: true,
    hasGarageGate: true,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: false,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'right',
    treeType: 'bougainvillea',
  },
  {
    id: 5,
    name: 'Mercearia São João · R$ 1,99',
    regionTag: 'Comércio do Bairro',
    style: 'comercio_esquina',
    roofStyle: 'colonial_clay',
    stories: 1,
    width: 8.0,
    depth: 7.4,
    height: 4.5,
    spacingAfter: 4.6,
    wallColor: '#DC4D32',
    basePlinthColor: '#8B3222',
    trimColor: '#6D3419',
    roofColor: '#E0672B',
    doorColor: '#6E381B',
    windowColor: '#2B303A',
    gateColor: '#5C2E14',
    hasExposedBrick: false,
    hasSatelliteDish: false,
    hasWaterTank: false,
    hasFrontWall: true,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: false,
    hasElectricMeter: true,
    hasHammock: true,
    hasAzulejoStrip: false,
    doorSide: 'right',
    treeType: 'mango',
  },
  {
    id: 6,
    name: 'Casa Rosa Goiaba com Grade Branca',
    regionTag: 'Vila Madalena',
    style: 'terrea_colonial',
    roofStyle: 'colonial_clay',
    stories: 1,
    width: 7.2,
    depth: 6.5,
    height: 4.2,
    spacingAfter: 3.9,
    wallColor: '#F06277',
    basePlinthColor: '#9D3648',
    trimColor: '#FFF1F2',
    roofColor: '#D95B2B',
    doorColor: '#7C3AED',
    windowColor: '#FFFFFF',
    gateColor: '#F8FAFC',
    hasExposedBrick: true,
    hasSatelliteDish: false,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: true,
    doorSide: 'left',
    treeType: 'ipe_amarelo',
  },
  {
    id: 7,
    name: 'Sobrado Turquesa com Caixa d’Água Azul',
    regionTag: 'Baixada Santista',
    style: 'sobrado_varanda',
    roofStyle: 'fiber_cement',
    stories: 2,
    width: 7.4,
    depth: 7.0,
    height: 7.2,
    spacingAfter: 4.3,
    wallColor: '#22B8CF',
    upperWallColor: '#1596A8',
    basePlinthColor: '#475569',
    trimColor: '#E0F2FE',
    roofColor: '#94A3B8',
    doorColor: '#78350F',
    windowColor: '#E2E8F0',
    gateColor: '#334155',
    hasExposedBrick: true,
    hasSatelliteDish: true,
    hasWaterTank: true,
    hasFrontWall: false,
    hasBalcony: true,
    hasGarageGate: true,
    hasPlanterBox: false,
    hasStripedAwning: false,
    hasWindowGrille: false,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'left',
    treeType: 'palm',
  },
  {
    id: 8,
    name: 'Mercearia Luiza Nº 298 & Bar',
    regionTag: 'Comércio Local',
    style: 'comercio_esquina',
    roofStyle: 'flat_parapet',
    stories: 1,
    width: 8.2,
    depth: 6.8,
    height: 4.8,
    spacingAfter: 4.8,
    wallColor: '#2DD4BF',
    basePlinthColor: '#0F766E',
    trimColor: '#FEF08A',
    roofColor: '#115E59',
    doorColor: '#B45309',
    windowColor: '#FDE047',
    gateColor: '#1E293B',
    hasExposedBrick: false,
    hasSatelliteDish: false,
    hasWaterTank: true,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: true,
    hasPlanterBox: false,
    hasStripedAwning: true,
    hasWindowGrille: false,
    hasLouveredWindow: false,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: true,
    doorSide: 'center',
    treeType: 'banana',
  },
  {
    id: 9,
    name: 'Casa Laranja Caju com Muro e Varanda',
    regionTag: 'Recife Antigo',
    style: 'varanda_muro',
    roofStyle: 'hipped_clay',
    stories: 1,
    width: 7.6,
    depth: 7.0,
    height: 4.4,
    spacingAfter: 4.1,
    wallColor: '#FB7124',
    basePlinthColor: '#9A3412',
    trimColor: '#FFEDD5',
    roofColor: '#C2410C',
    doorColor: '#5B21B6',
    windowColor: '#FFF7ED',
    gateColor: '#F8FAFC',
    hasExposedBrick: true,
    hasSatelliteDish: true,
    hasWaterTank: false,
    hasFrontWall: true,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: true,
    hasAzulejoStrip: false,
    doorSide: 'left',
    treeType: 'palm',
  },
  {
    id: 10,
    name: 'Sobrado Geminado Sol & Marfim',
    regionTag: 'Mooca',
    style: 'geminada',
    roofStyle: 'colonial_clay',
    stories: 2,
    width: 8.4,
    depth: 7.2,
    height: 7.5,
    spacingAfter: 4.4,
    wallColor: '#FACC15',
    upperWallColor: '#FEF9C3',
    basePlinthColor: '#854D0E',
    trimColor: '#713F12',
    roofColor: '#D95326',
    doorColor: '#78350F',
    windowColor: '#475569',
    gateColor: '#3F3F46',
    hasExposedBrick: false,
    hasSatelliteDish: true,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: true,
    hasGarageGate: true,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'right',
    treeType: 'ipe_amarelo',
  },
  {
    id: 11,
    name: 'Casa Roxo Açaí com Rede na Varanda',
    regionTag: 'Belém / Norte',
    style: 'varanda_muro',
    roofStyle: 'colonial_clay',
    stories: 1,
    width: 7.5,
    depth: 7.0,
    height: 4.4,
    spacingAfter: 4.2,
    wallColor: '#9333EA',
    basePlinthColor: '#581C87',
    trimColor: '#FDE047',
    roofColor: '#D95326',
    doorColor: '#854D0E',
    windowColor: '#FEF08A',
    gateColor: '#E2E8F0',
    hasExposedBrick: false,
    hasSatelliteDish: false,
    hasWaterTank: true,
    hasFrontWall: true,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: false,
    hasElectricMeter: true,
    hasHammock: true,
    hasAzulejoStrip: false,
    doorSide: 'right',
    treeType: 'banana',
  },
  {
    id: 12,
    name: 'Residência Cimento Queimado & Ipê',
    regionTag: 'Campinas',
    style: 'platibanda_moderna',
    roofStyle: 'flat_parapet',
    stories: 1,
    width: 8.0,
    depth: 7.0,
    height: 4.7,
    spacingAfter: 4.0,
    wallColor: '#D6D3D1',
    basePlinthColor: '#44403C',
    trimColor: '#9A3412',
    roofColor: '#292524',
    doorColor: '#7C2D12',
    windowColor: '#1C1917',
    gateColor: '#292524',
    hasExposedBrick: false,
    hasSatelliteDish: false,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: true,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: false,
    hasLouveredWindow: false,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'left',
    treeType: 'ipe_amarelo',
  },
  {
    id: 13,
    name: 'Casa Coral Ipanema com Azulejo Decorado',
    regionTag: 'Zona Sul RJ',
    style: 'terrea_colonial',
    roofStyle: 'colonial_clay',
    stories: 1,
    width: 7.3,
    depth: 6.8,
    height: 4.3,
    spacingAfter: 4.3,
    wallColor: '#FB7185',
    basePlinthColor: '#881337',
    trimColor: '#FFF1F2',
    roofColor: '#EA580C',
    doorColor: '#9A3412',
    windowColor: '#F8FAFC',
    gateColor: '#334155',
    hasExposedBrick: true,
    hasSatelliteDish: true,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: true,
    doorSide: 'right',
    treeType: 'palm',
  },
  {
    id: 14,
    name: 'Sobrado Tijolinho Paulista com Portão Preto',
    regionTag: 'ABC Paulista',
    style: 'sobrado_varanda',
    roofStyle: 'hipped_clay',
    stories: 2,
    width: 7.8,
    depth: 7.2,
    height: 7.3,
    spacingAfter: 4.5,
    wallColor: '#C85A32',
    upperWallColor: '#D97742',
    basePlinthColor: '#431407',
    trimColor: '#FDE68A',
    roofColor: '#9A3412',
    doorColor: '#27272A',
    windowColor: '#F8FAFC',
    gateColor: '#18181B',
    hasExposedBrick: true,
    hasSatelliteDish: true,
    hasWaterTank: true,
    hasFrontWall: false,
    hasBalcony: true,
    hasGarageGate: true,
    hasPlanterBox: false,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: false,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'left',
    treeType: 'mango',
  },
  {
    id: 15,
    name: 'Casa Verde-Folha com Bananeira no Quintal',
    regionTag: 'Litoral Norte',
    style: 'terrea_colonial',
    roofStyle: 'colonial_clay',
    stories: 1,
    width: 7.4,
    depth: 6.6,
    height: 4.2,
    spacingAfter: 4.4,
    wallColor: '#22C55E',
    basePlinthColor: '#14532D',
    trimColor: '#DCFCE7',
    roofColor: '#D95326',
    doorColor: '#78350F',
    windowColor: '#FFFFFF',
    gateColor: '#166534',
    hasExposedBrick: true,
    hasSatelliteDish: false,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: false,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'left',
    treeType: 'banana',
  },
  {
    id: 16,
    name: 'Casa Colonial Ouro Preto (Branca & Azul-Rei)',
    regionTag: 'Minas Histórica',
    style: 'terrea_colonial',
    roofStyle: 'colonial_clay',
    stories: 1,
    width: 7.6,
    depth: 6.8,
    height: 4.5,
    spacingAfter: 4.1,
    wallColor: '#F8FAFC',
    basePlinthColor: '#1E3A8A',
    trimColor: '#1D4ED8',
    roofColor: '#C2410C',
    doorColor: '#1E40AF',
    windowColor: '#1D4ED8',
    gateColor: '#1E3A8A',
    hasExposedBrick: false,
    hasSatelliteDish: false,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: false,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: true,
    doorSide: 'center',
    treeType: 'bougainvillea',
  },
  {
    id: 17,
    name: 'Sobrado Salmão com Padaria no Térreo',
    regionTag: 'Bela Vista',
    style: 'comercio_esquina',
    roofStyle: 'colonial_clay',
    stories: 2,
    width: 8.0,
    depth: 7.2,
    height: 7.6,
    spacingAfter: 4.7,
    wallColor: '#FDA4AF',
    upperWallColor: '#FB7185',
    basePlinthColor: '#9F1239',
    trimColor: '#FFF1F2',
    roofColor: '#D95326',
    doorColor: '#78350F',
    windowColor: '#FFE4E6',
    gateColor: '#475569',
    hasExposedBrick: true,
    hasSatelliteDish: true,
    hasWaterTank: true,
    hasFrontWall: false,
    hasBalcony: true,
    hasGarageGate: true,
    hasPlanterBox: false,
    hasStripedAwning: true,
    hasWindowGrille: true,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: true,
    doorSide: 'right',
    treeType: 'none',
  },
  {
    id: 18,
    name: 'Casa Amarelo-Canário com Telha Brasilit',
    regionTag: 'Periferia Viva',
    style: 'terrea_colonial',
    roofStyle: 'fiber_cement',
    stories: 1,
    width: 7.0,
    depth: 6.4,
    height: 4.1,
    spacingAfter: 4.0,
    wallColor: '#FDE047',
    basePlinthColor: '#713F12',
    trimColor: '#CA8A04',
    roofColor: '#94A3B8',
    doorColor: '#78350F',
    windowColor: '#E2E8F0',
    gateColor: '#52525B',
    hasExposedBrick: true,
    hasSatelliteDish: true,
    hasWaterTank: true,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: false,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'left',
    treeType: 'banana',
  },
  {
    id: 19,
    name: 'Casa Azul-Pavão com Muro de Pedra',
    regionTag: 'Serra Gaúcha',
    style: 'varanda_muro',
    roofStyle: 'hipped_clay',
    stories: 1,
    width: 7.8,
    depth: 7.2,
    height: 4.4,
    spacingAfter: 4.3,
    wallColor: '#0284C7',
    basePlinthColor: '#334155',
    trimColor: '#E0F2FE',
    roofColor: '#C2410C',
    doorColor: '#78350F',
    windowColor: '#F0F9FF',
    gateColor: '#475569',
    hasExposedBrick: false,
    hasSatelliteDish: false,
    hasWaterTank: false,
    hasFrontWall: true,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: false,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'right',
    treeType: 'ipe_amarelo',
  },
  {
    id: 20,
    name: 'Sobrado Moderno Areia & Terracota',
    regionTag: 'Goiânia',
    style: 'platibanda_moderna',
    roofStyle: 'flat_parapet',
    stories: 2,
    width: 7.8,
    depth: 7.0,
    height: 7.3,
    spacingAfter: 4.4,
    wallColor: '#F5F5F4',
    upperWallColor: '#EA580C',
    basePlinthColor: '#57534E',
    trimColor: '#292524',
    roofColor: '#1C1917',
    doorColor: '#431407',
    windowColor: '#1E293B',
    gateColor: '#27272A',
    hasExposedBrick: false,
    hasSatelliteDish: false,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: true,
    hasGarageGate: true,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: false,
    hasLouveredWindow: false,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'right',
    treeType: 'palm',
  },
  {
    id: 21,
    name: 'Casa Vermelho-Urucum com Varanda e Samambaia',
    regionTag: 'Interior Bahia',
    style: 'varanda_muro',
    roofStyle: 'colonial_clay',
    stories: 1,
    width: 7.7,
    depth: 7.2,
    height: 4.4,
    spacingAfter: 4.5,
    wallColor: '#DC2626',
    basePlinthColor: '#7F1D1D',
    trimColor: '#FEF2F2',
    roofColor: '#D95326',
    doorColor: '#78350F',
    windowColor: '#FEF2F2',
    gateColor: '#78350F',
    hasExposedBrick: true,
    hasSatelliteDish: true,
    hasWaterTank: false,
    hasFrontWall: true,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: false,
    hasElectricMeter: true,
    hasHammock: true,
    hasAzulejoStrip: false,
    doorSide: 'left',
    treeType: 'mango',
  },
  {
    id: 22,
    name: 'Casa Pêssego Tropical com Portão Basculante',
    regionTag: 'Sorocaba',
    style: 'platibanda_moderna',
    roofStyle: 'flat_parapet',
    stories: 1,
    width: 7.5,
    depth: 6.8,
    height: 4.5,
    spacingAfter: 3.9,
    wallColor: '#FDBA74',
    basePlinthColor: '#9A3412',
    trimColor: '#FFF7ED',
    roofColor: '#431407',
    doorColor: '#7C2D12',
    windowColor: '#F8FAFC',
    gateColor: '#F1F5F9',
    hasExposedBrick: false,
    hasSatelliteDish: true,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: true,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: false,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'right',
    treeType: 'bougainvillea',
  },
  {
    id: 23,
    name: 'Sobrado Duplo Olinda (Azul & Amarelo-Sol)',
    regionTag: 'Olinda PE',
    style: 'geminada',
    roofStyle: 'colonial_clay',
    stories: 2,
    width: 8.4,
    depth: 7.2,
    height: 7.4,
    spacingAfter: 4.6,
    wallColor: '#2563EB',
    upperWallColor: '#FACC15',
    basePlinthColor: '#1E3A8A',
    trimColor: '#FFFFFF',
    roofColor: '#D95326',
    doorColor: '#9A3412',
    windowColor: '#FFFFFF',
    gateColor: '#1D4ED8',
    hasExposedBrick: true,
    hasSatelliteDish: false,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: true,
    hasGarageGate: false,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: true,
    doorSide: 'left',
    treeType: 'palm',
  },
  {
    id: 24,
    name: 'Casa Verde-Esmeralda com Palmeira Imperial',
    regionTag: 'Jardim Botânico',
    style: 'varanda_muro',
    roofStyle: 'hipped_clay',
    stories: 1,
    width: 7.8,
    depth: 7.2,
    height: 4.4,
    spacingAfter: 4.3,
    wallColor: '#10B981',
    basePlinthColor: '#065F46',
    trimColor: '#ECFDF5',
    roofColor: '#C2410C',
    doorColor: '#78350F',
    windowColor: '#ECFDF5',
    gateColor: '#064E3B',
    hasExposedBrick: false,
    hasSatelliteDish: false,
    hasWaterTank: false,
    hasFrontWall: true,
    hasBalcony: false,
    hasGarageGate: true,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: false,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: true,
    doorSide: 'right',
    treeType: 'palm',
  },
  {
    id: 25,
    name: 'Casa Creme com Faixa de Azulejo São Luís',
    regionTag: 'São Luís MA',
    style: 'terrea_colonial',
    roofStyle: 'colonial_clay',
    stories: 1,
    width: 7.4,
    depth: 6.8,
    height: 4.3,
    spacingAfter: 4.1,
    wallColor: '#FEF3C7',
    basePlinthColor: '#0284C7',
    trimColor: '#0369A1',
    roofColor: '#D95326',
    doorColor: '#78350F',
    windowColor: '#0284C7',
    gateColor: '#0369A1',
    hasExposedBrick: true,
    hasSatelliteDish: false,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: true,
    doorSide: 'left',
    treeType: 'mango',
  },
  {
    id: 26,
    name: 'Sobrado Mostarda com Laje Coberta',
    regionTag: 'Zona Leste',
    style: 'sobrado_varanda',
    roofStyle: 'fiber_cement',
    stories: 2,
    width: 7.6,
    depth: 7.0,
    height: 7.5,
    spacingAfter: 4.4,
    wallColor: '#EAB308',
    upperWallColor: '#CA8A04',
    basePlinthColor: '#52525B',
    trimColor: '#FEF08A',
    roofColor: '#94A3B8',
    doorColor: '#3F3F46',
    windowColor: '#E4E4E7',
    gateColor: '#3F3F46',
    hasExposedBrick: true,
    hasSatelliteDish: true,
    hasWaterTank: true,
    hasFrontWall: false,
    hasBalcony: true,
    hasGarageGate: true,
    hasPlanterBox: false,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'right',
    treeType: 'banana',
  },
  {
    id: 27,
    name: 'Casa Azul-Bebê com Veneziana Dupla e Ipê',
    regionTag: 'Curitiba',
    style: 'terrea_colonial',
    roofStyle: 'hipped_clay',
    stories: 1,
    width: 7.3,
    depth: 6.6,
    height: 4.3,
    spacingAfter: 4.2,
    wallColor: '#60A5FA',
    basePlinthColor: '#1E40AF',
    trimColor: '#EFF6FF',
    roofColor: '#D95326',
    doorColor: '#78350F',
    windowColor: '#FFFFFF',
    gateColor: '#1E3A8A',
    hasExposedBrick: false,
    hasSatelliteDish: false,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: false,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'center',
    treeType: 'ipe_amarelo',
  },
  {
    id: 28,
    name: 'Casa Lavanda com Garagem de Telha Colonial',
    regionTag: 'Ribeirão Preto',
    style: 'varanda_muro',
    roofStyle: 'colonial_clay',
    stories: 1,
    width: 7.8,
    depth: 7.2,
    height: 4.4,
    spacingAfter: 4.3,
    wallColor: '#A855F7',
    basePlinthColor: '#581C87',
    trimColor: '#FAF5FF',
    roofColor: '#D95326',
    doorColor: '#78350F',
    windowColor: '#FAF5FF',
    gateColor: '#4C1D95',
    hasExposedBrick: true,
    hasSatelliteDish: true,
    hasWaterTank: false,
    hasFrontWall: true,
    hasBalcony: false,
    hasGarageGate: true,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: true,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: false,
    doorSide: 'left',
    treeType: 'bougainvillea',
  },
  {
    id: 29,
    name: 'Sobrado Verde-Menta & Areia com Floreira',
    regionTag: 'Florianópolis',
    style: 'sobrado_varanda',
    roofStyle: 'colonial_clay',
    stories: 2,
    width: 7.6,
    depth: 7.0,
    height: 7.4,
    spacingAfter: 4.2,
    wallColor: '#FDE68A',
    upperWallColor: '#34D399',
    basePlinthColor: '#065F46',
    trimColor: '#ECFDF5',
    roofColor: '#EA580C',
    doorColor: '#78350F',
    windowColor: '#FFFFFF',
    gateColor: '#475569',
    hasExposedBrick: false,
    hasSatelliteDish: false,
    hasWaterTank: true,
    hasFrontWall: false,
    hasBalcony: true,
    hasGarageGate: true,
    hasPlanterBox: true,
    hasStripedAwning: false,
    hasWindowGrille: false,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: true,
    doorSide: 'right',
    treeType: 'palm',
  },
  {
    id: 30,
    name: 'Casinha Geminada de Vila (Ocre & Coral)',
    regionTag: 'Vila Operária',
    style: 'geminada',
    roofStyle: 'colonial_clay',
    stories: 1,
    width: 8.6,
    depth: 6.8,
    height: 4.5,
    spacingAfter: 4.6,
    wallColor: '#F59E0B',
    upperWallColor: '#F43F5E',
    basePlinthColor: '#78350F',
    trimColor: '#FEF3C7',
    roofColor: '#D95326',
    doorColor: '#78350F',
    windowColor: '#FFFFFF',
    gateColor: '#374151',
    hasExposedBrick: true,
    hasSatelliteDish: true,
    hasWaterTank: false,
    hasFrontWall: false,
    hasBalcony: false,
    hasGarageGate: false,
    hasPlanterBox: true,
    hasStripedAwning: true,
    hasWindowGrille: true,
    hasLouveredWindow: true,
    hasElectricMeter: true,
    hasHammock: false,
    hasAzulejoStrip: true,
    doorSide: 'center',
    treeType: 'mango',
  },
];

export type GameDifficultyMode = 'easy' | 'medium' | 'hard' | 'extreme';

const DIFFICULTY_SPEED_CURVES: Record<
  GameDifficultyMode,
  { minSpeed: number; maxSpeed: number; accelPerMeter: number }
> = {
  easy: { minSpeed: 12.8, maxSpeed: 23.5, accelPerMeter: 0.0072 },
  medium: { minSpeed: 15.2, maxSpeed: 30.5, accelPerMeter: 0.0102 },
  hard: { minSpeed: 18.2, maxSpeed: 37.5, accelPerMeter: 0.0145 },
  extreme: { minSpeed: 19.6, maxSpeed: 40.5, accelPerMeter: 0.0165 },
};

export const ROAD_PLAYABLE_HALF_WIDTH = 4.92;

export function getInitialLivesForDifficulty(difficulty: GameDifficultyMode = 'medium'): number {
  if (difficulty === 'easy') return 10;
  if (difficulty === 'hard') return 4;
  if (difficulty === 'extreme') return 6;
  return 5;
}

export function createInitialPlayerState(
  difficulty: GameDifficultyMode = 'medium',
): PlayerState {
  const curve = DIFFICULTY_SPEED_CURVES[difficulty] ?? DIFFICULTY_SPEED_CURVES.medium;
  const initialLives = getInitialLivesForDifficulty(difficulty);
  return {
    lane: 0,
    x: 0,
    freeTargetX: 0,
    y: 0,
    vy: 0,
    vx: 0,
    steerInput: 0,
    isJumping: false,
    isRolling: false,
    rollTimer: 0,
    invulnerableTimer: 0,
    hp: initialLives,
    maxHp: initialLives,
    score: 0,
    coins: 0,
    distance: 0,
    combo: 1,
    speed: curve.minSpeed,
    housesPassed: 0,
  };
}

export function laneToX(lane: LaneIndex): number {
  return lane * LANE_WIDTH;
}

export function shiftLane(state: PlayerState, direction: -1 | 1, stepMeters = 0.96): PlayerState {
  const baseTargetX = state.freeTargetX !== undefined ? state.freeTargetX : state.x;
  const nextFreeTargetX = Math.max(
    -ROAD_PLAYABLE_HALF_WIDTH,
    Math.min(ROAD_PLAYABLE_HALF_WIDTH, baseTargetX + direction * stepMeters),
  );
  const nearestLane = Math.max(
    -1,
    Math.min(1, Math.round(nextFreeTargetX / LANE_WIDTH)),
  ) as LaneIndex;
  // Movimento lateral suave e ágil: resposta rápida e gostosa ao toque
  const prevVx = state.vx ?? 0;
  const gentleVx = prevVx * 0.55 + direction * 3.8;
  return {
    ...state,
    lane: nearestLane,
    freeTargetX: nextFreeTargetX,
    vx: Math.max(-9.2, Math.min(9.2, gentleVx)),
  };
}

export function triggerJump(state: PlayerState): PlayerState {
  if (state.isJumping) return state;
  return {
    ...state,
    y: 0.01,
    vy: JUMP_VELOCITY,
    isJumping: true,
    isRolling: false,
    rollTimer: 0,
  };
}

export function triggerRoll(state: PlayerState): PlayerState {
  if (state.isJumping) {
    // Fast-fall slam into roll
    return {
      ...state,
      vy: -18.0,
      isRolling: true,
      rollTimer: ROLL_DURATION,
    };
  }
  return {
    ...state,
    isRolling: true,
    rollTimer: ROLL_DURATION,
  };
}

export function stepPlayerPhysics(
  state: PlayerState,
  dt: number,
  difficulty: GameDifficultyMode = 'medium',
  isCarameloMode = false,
): PlayerState {
  const clampedDt = Math.min(dt, 0.05);
  const steer = Math.max(-1, Math.min(1, state.steerInput ?? 0));

  // Pilotagem Livre Total com Deslocamento Lateral Ágil e Suave:
  // Viradas mais rápidas atendendo ao pedido do jogador!
  const lateralSpeed = isCarameloMode ? 8.8 : 9.8;
  let nextFreeTargetX =
    state.freeTargetX !== undefined ? state.freeTargetX : laneToX(state.lane);
  if (Math.abs(steer) > 0.01) {
    nextFreeTargetX = Math.max(
      -ROAD_PLAYABLE_HALF_WIDTH,
      Math.min(ROAD_PLAYABLE_HALF_WIDTH, nextFreeTargetX + steer * lateralSpeed * clampedDt),
    );
    // Evita acumular alvo muito longe da posição atual para parar suavemente ao soltar a tecla
    const maxLead = 1.22;
    if (nextFreeTargetX - state.x > maxLead) nextFreeTargetX = state.x + maxLead;
    if (nextFreeTargetX - state.x < -maxLead) nextFreeTargetX = state.x - maxLead;
  }
  const targetX = Math.max(
    -ROAD_PLAYABLE_HALF_WIDTH,
    Math.min(ROAD_PLAYABLE_HALF_WIDTH, nextFreeTargetX),
  );

  // Movimento lateral com resposta ágil e amortecimento suave nas pontas (sem tranco!)
  let curX = state.x;
  let curVx = state.vx ?? 0;
  const diffX = targetX - curX;
  const absDiff = Math.abs(diffX);
  let desiredVx = 0;
  if (absDiff > 0.002) {
    const dir = Math.sign(diffX);
    // Desacelera suavemente nos últimos 24cm para nunca dar solavanco ao parar
    const rampDown = Math.min(1.0, absDiff / 0.24);
    desiredVx = dir * lateralSpeed * rampDown;
  }
  const vxBlend = 1 - Math.exp(-20.0 * clampedDt);
  curVx = curVx + (desiredVx - curVx) * vxBlend;
  const stepX = curVx * clampedDt;
  if (Math.abs(stepX) >= absDiff && absDiff < 0.15) {
    curX = targetX;
    curVx = desiredVx * 0.5;
  } else {
    curX += stepX;
  }
  curX = Math.max(-ROAD_PLAYABLE_HALF_WIDTH, Math.min(ROAD_PLAYABLE_HALF_WIDTH, curX));
  if (Math.abs(targetX - curX) < 0.002 && Math.abs(curVx) < 0.02) {
    curX = targetX;
    curVx = 0;
  }
  const nextX = curX;
  const nextVx = curVx;
  const nextLane = Math.max(-1, Math.min(1, Math.round(nextX / LANE_WIDTH))) as LaneIndex;

  let nextY = state.y;
  let nextVy = state.vy;
  let nextJumping = state.isJumping;

  if (nextJumping || nextY > 0) {
    nextY += nextVy * clampedDt;
    nextVy -= GRAVITY * clampedDt;
    if (nextY <= 0) {
      nextY = 0;
      nextVy = 0;
      nextJumping = false;
    }
  }

  let nextRollTimer = Math.max(0, state.rollTimer - clampedDt);
  let nextRolling = nextRollTimer > 0;

  let nextInvuln = Math.max(0, state.invulnerableTimer - clampedDt);

  const distDelta = state.speed * clampedDt;
  const nextDistance = state.distance + distDelta;

  // Aceleração e desaceleração natural nas curvas conforme o modo (Fácil / Médio / Difícil)
  const curve = DIFFICULTY_SPEED_CURVES[difficulty] ?? DIFFICULTY_SPEED_CURVES.medium;
  const baseTargetSpeed = Math.min(
    curve.maxSpeed,
    curve.minSpeed + nextDistance * curve.accelPerMeter,
  );
  // Leve alívio orgânico de velocidade em guinadas intensas + retomada vigorosa na reta
  const carveDrag = Math.min(0.85, Math.abs(nextVx) * 0.045);
  const targetSpeed = Math.max(curve.minSpeed * 0.96, baseTargetSpeed - carveDrag);
  const accelRate = targetSpeed >= state.speed ? 3.8 : 5.2;
  const nextSpeed = state.speed + (targetSpeed - state.speed) * (1 - Math.exp(-accelRate * clampedDt));
  const nextScore = state.score + distDelta * 2 * state.combo;

  return {
    ...state,
    lane: nextLane,
    x: nextX,
    freeTargetX: targetX,
    vx: nextVx,
    y: nextY,
    vy: nextVy,
    isJumping: nextJumping,
    isRolling: nextRolling,
    rollTimer: nextRollTimer,
    invulnerableTimer: nextInvuln,
    distance: nextDistance,
    speed: nextSpeed,
    score: nextScore,
  };
}

export function getPlayerHeight(state: PlayerState): number {
  return state.isRolling ? 0.85 : 1.75;
}

export function checkObstacleCollision(
  player: PlayerState,
  obstacle: TrackObstacle,
): boolean {
  if (obstacle.hit) return false;
  // Z window around player at z = 0
  if (Math.abs(obstacle.z) > 0.75) return false;
  // Horizontal distance check
  const obsX = laneToX(obstacle.lane);
  if (Math.abs(player.x - obsX) > 0.88) return false;

  const playerBottom = player.y;
  const playerTop = player.y + getPlayerHeight(stateToPlayer(player));

  const obsBottom = obstacle.minY;
  const obsTop = obstacle.minY + obstacle.height;

  // Vertical overlap check (allows jumping over cones or rolling under high banners)
  return playerBottom < obsTop - 0.12 && playerTop > obsBottom + 0.1;
}

function stateToPlayer(p: PlayerState): PlayerState {
  return p;
}

export function applyConeHit(player: PlayerState): PlayerState {
  if (player.invulnerableTimer > 0) return player;
  const nextHp = Math.max(0, player.hp - 1);
  return {
    ...player,
    hp: nextHp,
    combo: 1,
    invulnerableTimer: 1.2,
  };
}

export function applyCoinPickup(player: PlayerState): PlayerState {
  const nextCoins = player.coins + 1;
  const nextCombo = Math.min(5, 1 + Math.floor(nextCoins / 8));
  return {
    ...player,
    coins: nextCoins,
    combo: nextCombo,
    score: player.score + 50 * nextCombo,
  };
}

export function getHouseVariationByIndex(index: number): HouseVariationSpec {
  const normalized = ((index % HOUSE_VARIATIONS.length) + HOUSE_VARIATIONS.length) % HOUSE_VARIATIONS.length;
  return HOUSE_VARIATIONS[normalized];
}

export const WORLD_CURVE_START_Z = -4.0;
export const DEFAULT_DOWNHILL_SLOPE = 0.185;
export const DEFAULT_WORLD_CURVE_Y = 0.0011;

export const MOUNTAIN_VISTA_Z = -168.0;
export const MOUNTAIN_VISTA_Y = 32.8;
export const MOUNTAIN_VISTA_X = -9.5;
export const CRISTO_STATUE_SCALE = 0.52;

/**
 * Computes the exact world-space vertical drop produced by the horizon curvature vertex shader
 * (`wp.y -= uWorldCurveY * max(0, -(wp.z - uCurveStartZ))^2`) so houses, sidewalks, roads, and
 * distant landmarks share 100% identical world-space curvature without floating or view-space sway.
 */
export function computeWorldCurvatureDropY(
  worldZ: number,
  curveY: number = DEFAULT_WORLD_CURVE_Y,
  curveStartZ: number = WORLD_CURVE_START_Z,
): number {
  const curveDist = Math.max(0, -(worldZ - curveStartZ));
  return curveY * curveDist * curveDist;
}

/**
 * Computes the distant placement and optimization parameters for the Corcovado mountain massif
 * and smaller Cristo Redentor statue so the mountain sits further back behind the skyline
 * and remains rock-steady in world space.
 */
export function computeMountainVistaPlacement(
  vistaZ: number = MOUNTAIN_VISTA_Z,
  curveY: number = DEFAULT_WORLD_CURVE_Y,
): {
  x: number;
  y: number;
  z: number;
  scale: number;
  cristoScale: number;
  curvedBaseY: number;
  radialSegmentsMain: number;
  heightSegmentsMain: number;
} {
  const dropY = computeWorldCurvatureDropY(vistaZ, curveY);
  // Keep the apparent horizon base elevation around +1.75m after world curvature drop
  const compensatedY = Math.round((dropY + 1.76) * 10) / 10;
  return {
    x: MOUNTAIN_VISTA_X,
    y: compensatedY,
    z: vistaZ,
    scale: 1.0,
    cristoScale: CRISTO_STATUE_SCALE,
    curvedBaseY: compensatedY - dropY,
    radialSegmentsMain: 18,
    heightSegmentsMain: 12,
  };
}

/**
 * Computes the vertical (steep downhill ladeira + curvature) and horizontal (lateral)
 * displacement at a given world Z coordinate so the street plunges downhill toward the coast.
 */
export function computeHorizonCurveOffsets(
  worldZ: number,
  curveY: number = DEFAULT_WORLD_CURVE_Y,
  curveX = 0,
  downhillSlope: number = DEFAULT_DOWNHILL_SLOPE,
): { dy: number; dx: number } {
  const dist = Math.max(0, -(worldZ - WORLD_CURVE_START_Z));
  if (dist === 0) return { dy: 0, dx: 0 };
  const distSq = dist * dist;
  return {
    dy: -(downhillSlope * dist + curveY * distSq) || 0,
    dx: curveX * distSq || 0,
  };
}

/**
 * Computes the UV offset delta for scrolling road and sidewalk textures synchronized
 * with the player's running displacement along Z.
 */
export function computeRoadTextureOffsetDelta(moveZ: number, tileLengthMeters: number): number {
  if (tileLengthMeters <= 0 || moveZ <= 0) return 0;
  return moveZ / tileLengthMeters;
}

/**
 * 3D Performance & Visibility Optimization Constants:
 * - Delayed Behind-Camera Culling (BEHIND_GAMEPLAY_CULL_Z = 14.5m so houses & favelas never vanish while still visible on screen!)
 * - Automatic LOD (LOD0 -> LOD1 -> LOD2)
 * - Distance Culling (removes far objects beyond fog horizon)
 * - Fog Distance (linear near/far fog that smoothly hides object culling transitions)
 */
export const FOG_DISTANCE_NEAR = 64.0;
export const FOG_DISTANCE_FAR = 158.0;

export const BEHIND_GAMEPLAY_CULL_Z = 14.5;
export const LOD0_MAX_DISTANCE = 54.0;
export const LOD1_MAX_DISTANCE = 98.0;
export const LOD2_MAX_DISTANCE = 156.0;
export const MAX_CULL_DISTANCE_HOUSE_Z = 152.0;
export const MAX_CULL_DISTANCE_FAVELA_Z = 144.0;
export const MAX_CULL_DISTANCE_PROP_Z = 148.0;

export interface SmoothLodTierOpacities {
  lod0Opacity: number;
  lod1Opacity: number;
  lod2Opacity: number;
  lod3Opacity: number;
  outlineOpacity: number;
}

/**
 * Computes continuous C2 quintic fade-in / fade-out opacities for each LOD quality tier
 */
export function computeSmoothLodTierOpacities(
  distanceAhead: number,
  baseHorizonOpacity: number,
): SmoothLodTierOpacities {
  const base = Math.max(0, Math.min(1, baseHorizonOpacity));
  if (base <= 0.001) {
    return {
      lod0Opacity: 0,
      lod1Opacity: 0,
      lod2Opacity: 0,
      lod3Opacity: 0,
      outlineOpacity: 0,
    };
  }

  const d = Math.max(0, distanceAhead);
  const quinticFadeOut = (val: number, fadeStart: number, fadeEnd: number): number => {
    if (val <= fadeStart) return 1.0;
    if (val >= fadeEnd) return 0.0;
    const t = (val - fadeStart) / Math.max(0.001, fadeEnd - fadeStart);
    const s = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    return 1.0 - s;
  };

  const lod0Factor = quinticFadeOut(d, 26.0, LOD0_MAX_DISTANCE);
  const lod1Factor = quinticFadeOut(d, 54.0, LOD1_MAX_DISTANCE);
  const lod2Factor = quinticFadeOut(d, 96.0, LOD2_MAX_DISTANCE);
  const outlineFactor = 0.25 + 0.75 * quinticFadeOut(d, 32.0, 128.0);

  return {
    lod0Opacity: base * lod0Factor,
    lod1Opacity: base * lod1Factor,
    lod2Opacity: base * lod2Factor,
    lod3Opacity: base,
    outlineOpacity: base * outlineFactor,
  };
}

export interface OceanSunReflectionState {
  overOceanFactor: number;
  reflectionCenterX: number;
}

export function computeOceanSunReflectionState(
  sunX: number,
  sunZ: number,
  sunOpacity: number,
  waterZ: number,
): OceanSunReflectionState {
  if (sunOpacity <= 0.01 || sunX <= 14.0) {
    return { overOceanFactor: 0, reflectionCenterX: 48.0 };
  }
  const tOver = Math.max(0, Math.min(1, (sunX - 14.0) / (30.0 - 14.0)));
  const smoothOver = tOver * tOver * (3.0 - 2.0 * tOver);
  const overOceanFactor = smoothOver * Math.max(0, Math.min(1, sunOpacity));

  const distZ = Math.max(0, -waterZ);
  const horizonDistZ = Math.max(1.0, -sunZ);
  const rayT = Math.max(0, Math.min(1, distZ / horizonDistZ));
  const nearShoreX = Math.max(18.5, sunX * 0.44);
  const reflectionCenterX = nearShoreX + (sunX - nearShoreX) * rayT;

  return { overOceanFactor, reflectionCenterX };
}

export function computeSceneryApproachFadeFactor(
  objectZ: number,
  playerZ = 0,
  fullOpaqueDist = 64.0,
  maxCullDist = 175.0,
): number {
  const distanceAhead = Math.max(0, playerZ - objectZ);
  if (distanceAhead <= fullOpaqueDist) return 1.0;
  if (distanceAhead >= maxCullDist) return 0.0;

  const span = Math.max(1.0, maxCullDist - fullOpaqueDist);
  const t = (distanceAhead - fullOpaqueDist) / span;
  const s = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  return 1.0 - s;
}

/**
 * Computes a smooth, subtle distance transparency factor (`0.56 .. 1.0`) for houses
 * further ahead down the street ("deixe as casas la da frente pouco transparente suave")
 * so distant foreground houses blend softly into the horizon skyline.
 */
export function computeDistantHouseOpacity(objectZ: number, playerZ = 0): number {
  const distanceAhead = Math.max(0, playerZ - objectZ);
  const fadeStart = 58.0;
  const fadeEnd = 124.0;
  if (distanceAhead <= fadeStart) return 1.0;
  if (distanceAhead >= fadeEnd) return 0.56;
  const t = (distanceAhead - fadeStart) / (fadeEnd - fadeStart);
  const smooth = t * t * (3 - 2 * t);
  return 1.0 - smooth * 0.44;
}

/**
 * Computes a complete zero-pop-in horizon materialization curve (`0.0 .. 1.0`) for houses
 * entering at the far horizon (`132m -> 104m -> 58m`) so distant houses never appear suddenly
 * ("deixe mais fluido e suave a renderizacao das casas la na frente, para nao ficar aparecendo do nada").
 */
export function computeHouseHorizonFadeFactor(objectZ: number, playerZ = 0): number {
  const signedDelta = playerZ - objectZ;
  // Quando a casa passa para trás do jogador (+Z), aplica fade-out progressivo suave antes do limite de reciclagem
  if (signedDelta < 0) {
    const distBehind = -signedDelta;
    if (distBehind <= 16.0) return 1.0;
    if (distBehind >= 72.0) return 0.0;
    const tb = (distBehind - 16.0) / (72.0 - 16.0);
    const sb = tb * tb * (3 - 2 * tb);
    return 1.0 - sb;
  }

  const distanceAhead = signedDelta;
  if (distanceAhead <= 58.0) return 1.0;
  if (distanceAhead >= MAX_CULL_DISTANCE_HOUSE_Z) return 0.0;

  // Curva quintic C² contínua de fade-out progressivo por distância (58m -> MAX_CULL_DISTANCE_HOUSE_Z)
  const span = Math.max(1.0, MAX_CULL_DISTANCE_HOUSE_Z - 58.0);
  const t = (distanceAhead - 58.0) / span;
  const s = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  return 1.0 - s;
}

/**
 * Computes a progressive, smooth distance fade-out (`0.0 .. 1.0`) for distant and upper-tier
 * hillside favela houses so they dissolve softly into the horizon without sudden pop-out.
 */
export function computeFavelaFadeOpacity(
  objectZ: number,
  playerZ = 0,
  isUpperTier = false,
): number {
  const signedDelta = playerZ - objectZ;
  const baseCap = isUpperTier ? 0.94 : 1.0;
  if (signedDelta < 0) {
    const distBehind = -signedDelta;
    if (distBehind <= 18.0) return baseCap;
    if (distBehind >= 68.0) return 0.0;
    const tb = (distBehind - 18.0) / (68.0 - 18.0);
    const sb = tb * tb * (3 - 2 * tb);
    return baseCap * (1.0 - sb);
  }

  const distanceAhead = signedDelta;
  const fadeStart = isUpperTier ? 50.0 : 62.0;
  const fadeEnd = MAX_CULL_DISTANCE_FAVELA_Z;

  if (distanceAhead <= fadeStart) return baseCap;
  if (distanceAhead >= fadeEnd) return 0.0;
  const t = (distanceAhead - fadeStart) / Math.max(1.0, fadeEnd - fadeStart);
  const smooth = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  return baseCap * (1.0 - smooth);
}

export interface LodVisibilityResult {
  visible: boolean;
  lod: 0 | 1 | 2 | 3;
  distanceAhead: number;
  animateSubNodes: boolean;
}

/**
 * Evaluates automatic 4-tier LOD (0 = full detail, 1 = medium, 2 = low silhouette, 3 = ultra-light far horizon)
 * and culls objects behind the camera (z > behindCullZ) or beyond maxCullDistance.
 */
export function computeObjectLodAndCulling(
  objectZ: number,
  playerZ = 0,
  maxCullDistance: number = MAX_CULL_DISTANCE_HOUSE_Z,
  behindCullZ: number = BEHIND_GAMEPLAY_CULL_Z,
): LodVisibilityResult {
  if (objectZ > playerZ + behindCullZ) {
    return { visible: false, lod: 3, distanceAhead: 0, animateSubNodes: false };
  }

  const distanceAhead = Math.max(0, playerZ - objectZ);

  if (distanceAhead > maxCullDistance) {
    return { visible: false, lod: 3, distanceAhead, animateSubNodes: false };
  }

  if (distanceAhead <= LOD0_MAX_DISTANCE) {
    return { visible: true, lod: 0, distanceAhead, animateSubNodes: true };
  }

  if (distanceAhead <= LOD1_MAX_DISTANCE) {
    return { visible: true, lod: 1, distanceAhead, animateSubNodes: true };
  }

  if (distanceAhead <= LOD2_MAX_DISTANCE) {
    return { visible: true, lod: 2, distanceAhead, animateSubNodes: true };
  }

  return { visible: true, lod: 3, distanceAhead, animateSubNodes: false };
}

export interface OcclusionCheckResult {
  fullyOccluded: boolean;
  lowerTierOccluded: boolean;
}

export function evaluateFavelaOcclusion(
  favelaZ: number,
  side: 'left' | 'right',
  playerX: number,
  hasTwoStoryBlockerInFront: boolean,
  behindCullZ: number = BEHIND_GAMEPLAY_CULL_Z,
): OcclusionCheckResult {
  if (favelaZ > behindCullZ || -favelaZ > MAX_CULL_DISTANCE_FAVELA_Z) {
    return { fullyOccluded: true, lowerTierOccluded: true };
  }

  const distAhead = -favelaZ;
  const playerCloseToSameSide =
    (side === 'left' && playerX < -1.6) || (side === 'right' && playerX > 1.6);

  const lowerTierOccluded =
    (hasTwoStoryBlockerInFront && playerCloseToSameSide && distAhead >= 1.5 && distAhead <= 24.0) ||
    distAhead > 82.0;

  return {
    fullyOccluded: false,
    lowerTierOccluded,
  };
}

export const TROPICAL_CINEMATIC_GRADE_CONFIG = {
  shadowTintRGB: [0.055, 0.125, 0.245] as const,
  warmSunMultiplierRGB: [1.06, 1.01, 0.91] as const,
  softBlackFloorRGB: [0.022, 0.032, 0.056] as const,
  sCurveStrength: 0.22,
  vibranceStrength: 0.24,
};

function smoothstepScalar(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function applyTropicalCinematicColorGradeRGB(
  rIn: number,
  gIn: number,
  bIn: number,
): { r: number; g: number; b: number } {
  let r = Math.max(0, Math.min(1, rIn));
  let g = Math.max(0, Math.min(1, gIn));
  let b = Math.max(0, Math.min(1, bIn));

  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const shadowMask = 1.0 - smoothstepScalar(0.0, 0.48, luma);
  const highlightMask = smoothstepScalar(0.45, 0.96, luma);

  const [sr, sg, sb] = TROPICAL_CINEMATIC_GRADE_CONFIG.shadowTintRGB;
  const shMix = shadowMask * 0.68;
  r = r * (1 - shMix) + (r * 0.86 * 0.76 + sr * 0.24) * shMix;
  g = g * (1 - shMix) + (g * 0.93 * 0.76 + sg * 0.24) * shMix;
  b = b * (1 - shMix) + (b * 1.12 * 0.76 + sb * 0.24) * shMix;

  const [wr, wg, wb] = TROPICAL_CINEMATIC_GRADE_CONFIG.warmSunMultiplierRGB;
  const hiMix = highlightMask * 0.65;
  r = r * (1 - hiMix) + (r * wr + 0.028) * hiMix;
  g = g * (1 - hiMix) + (g * wg + 0.020) * hiMix;
  b = b * (1 - hiMix) + (b * wb + 0.004) * hiMix;

  const sMix = TROPICAL_CINEMATIC_GRADE_CONFIG.sCurveStrength;
  r = r * (1 - sMix) + smoothstepScalar(0, 1, r) * sMix;
  g = g * (1 - sMix) + smoothstepScalar(0, 1, g) * sMix;
  b = b * (1 - sMix) + smoothstepScalar(0, 1, b) * sMix;

  const newLuma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const maxChan = Math.max(r, g, b);
  const minChan = Math.min(r, g, b);
  const sat = maxChan - minChan;
  const vibranceBoost = 1.0 + TROPICAL_CINEMATIC_GRADE_CONFIG.vibranceStrength * (1.0 - sat * 0.75);
  r = newLuma + (r - newLuma) * vibranceBoost;
  g = newLuma + (g - newLuma) * vibranceBoost;
  b = newLuma + (b - newLuma) * vibranceBoost;

  const [flR, flG, flB] = TROPICAL_CINEMATIC_GRADE_CONFIG.softBlackFloorRGB;
  r = Math.max(0, Math.min(1, flR + r * (0.985 - flR)));
  g = Math.max(0, Math.min(1, flG + g * (0.985 - flG)));
  b = Math.max(0, Math.min(1, flB + b * (0.985 - flB)));

  return { r, g, b };
}

export function computeLadeiraLateralWindingOffsetX(
  worldZ: number,
  windPhase = 0.45,
  curveX = 0,
): number {
  const curveDist = Math.max(0, -(worldZ - WORLD_CURVE_START_Z));
  if (curveDist <= 0) return 0;
  const curveDistSq = curveDist * curveDist;
  const sCurveNear =
    Math.sin(curveDist * 0.036 + windPhase) * 2.85 * smoothstepScalar(8.0, 56.0, curveDist);
  const sCurveFar =
    Math.cos(curveDist * 0.018 - windPhase * 0.65) * 2.15 * smoothstepScalar(38.0, 155.0, curveDist);
  return curveX * curveDistSq + sCurveNear + sCurveFar;
}

export interface TimeOfDayAtmosphereConfig {
  labelPt: string;
  sunsetOrangeMix: number;
  nightDarknessMix: number;
  fogColorHex: string;
  skyTintHex: string;
  hemiSkyColorHex: string;
  hemiGroundColorHex: string;
  hemiIntensity: number;
  sunLightColorHex: string;
  sunLightIntensity: number;
  rimLightColorHex: string;
  rimLightIntensity: number;
  sunCoreColorHex: string;
  sunCoronaColorHex: string;
  godRayIntensity: number;
  streetLampGlowOpacity: number;
  exposure: number;
}

export function computeTimeOfDayAtmosphereConfig(
  preset: 'tropical_morning' | 'sunset_dramatic' | 'violet_dusk',
): TimeOfDayAtmosphereConfig {
  if (preset === 'sunset_dramatic') {
    return {
      labelPt: 'Entardecer',
      sunsetOrangeMix: 1.0,
      nightDarknessMix: 0.0,
      fogColorHex: '#FDBA74',
      skyTintHex: '#FB923C',
      hemiSkyColorHex: '#FDBA74',
      hemiGroundColorHex: '#431407',
      hemiIntensity: 0.78,
      sunLightColorHex: '#FB923C',
      sunLightIntensity: 1.42,
      rimLightColorHex: '#F59E0B',
      rimLightIntensity: 0.56,
      sunCoreColorHex: '#FEF08A',
      sunCoronaColorHex: '#EA580C',
      godRayIntensity: 1.32,
      streetLampGlowOpacity: 0.48,
      exposure: 1.02,
    };
  }
  if (preset === 'violet_dusk') {
    return {
      labelPt: 'Noite',
      sunsetOrangeMix: 0.0,
      nightDarknessMix: 1.0,
      fogColorHex: '#0F172A',
      skyTintHex: '#1E3A8A',
      hemiSkyColorHex: '#38BDF8',
      hemiGroundColorHex: '#090D16',
      hemiIntensity: 0.46,
      sunLightColorHex: '#93C5FD',
      sunLightIntensity: 0.64,
      rimLightColorHex: '#FBBF24',
      rimLightIntensity: 0.54,
      sunCoreColorHex: '#F8FAFC',
      sunCoronaColorHex: '#38BDF8',
      godRayIntensity: 0.58,
      streetLampGlowOpacity: 0.92,
      exposure: 0.94,
    };
  }
  return {
    labelPt: 'Dia',
    sunsetOrangeMix: 0.0,
    nightDarknessMix: 0.0,
    fogColorHex: '#BAE6FD',
    skyTintHex: '#7DD3FC',
    hemiSkyColorHex: '#FFF2C2',
    hemiGroundColorHex: '#1E3A8A',
    hemiIntensity: 0.72,
    sunLightColorHex: '#FFE8A3',
    sunLightIntensity: 1.24,
    rimLightColorHex: '#38BDF8',
    rimLightIntensity: 0.38,
    sunCoreColorHex: '#FFFBEB',
    sunCoronaColorHex: '#F59E0B',
    godRayIntensity: 1.05,
    streetLampGlowOpacity: 0.0,
    exposure: 0.98,
  };
}

export interface BannerAirplanePose {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  propellerAngle: number;
  bannerWavePhase: number;
  visible: boolean;
}

export const AIRPLANE_CYCLE_DURATION_SEC = 96.0;
export const AIRPLANE_ACTIVE_PASS_SEC = 42.0;
export const AIRPLANE_X_START = -82.0;
export const AIRPLANE_X_END = 118.0;

export function computeBannerAirplanePose(
  elapsedSeconds: number,
  _planeIndex = 0,
): BannerAirplanePose {
  const t = Math.max(0, elapsedSeconds);
  const cycleTime = (t + 2.5) % AIRPLANE_CYCLE_DURATION_SEC;
  const isPassing = cycleTime < AIRPLANE_ACTIVE_PASS_SEC;
  const u = isPassing ? cycleTime / AIRPLANE_ACTIVE_PASS_SEC : 1.0;

  const x = isPassing
    ? AIRPLANE_X_START + u * (AIRPLANE_X_END - AIRPLANE_X_START)
    : AIRPLANE_X_END + 40.0;
  const y = 17.8 + Math.sin(t * 0.95) * 0.18;
  const z = -56.0;

  return {
    x,
    y,
    z,
    rotX: Math.cos(t * 1.1) * 0.02,
    rotY: 0.0,
    rotZ: 0.035,
    propellerAngle: t * 38.0,
    bannerWavePhase: t * 8.2,
    visible: isPassing,
  };
}

export interface CelestialSunMoonDiagonalPose {
  sunX: number;
  sunY: number;
  sunZ: number;
  sunArcProgress: number;
  sunOpacity: number;
  moonX: number;
  moonY: number;
  moonZ: number;
  moonArcProgress: number;
  moonOpacity: number;
  starfieldOpacity: number;
  dynamicSunsetMix: number;
  dynamicNightMix: number;
  cyclePos: number;
}

export const SUN_BLUE_ARC_P0 = { x: -138.0, y: 102.0 } as const;
export const SUN_BLUE_ARC_P1 = { x: 28.0, y: 90.0 } as const;
export const SUN_BLUE_ARC_P2 = { x: 146.0, y: -16.0 } as const;
export const SUN_BLUE_ARC_SPEED_PER_SEC = 0.0095;

export function evaluateSunBlueArcTrajectory(arcProgress: number): { x: number; y: number } {
  const s = Math.max(0, Math.min(1, arcProgress));
  const inv = 1.0 - s;
  const x =
    inv * inv * SUN_BLUE_ARC_P0.x +
    2.0 * inv * s * SUN_BLUE_ARC_P1.x +
    s * s * SUN_BLUE_ARC_P2.x;
  const y =
    inv * inv * SUN_BLUE_ARC_P0.y +
    2.0 * inv * s * SUN_BLUE_ARC_P1.y +
    s * s * SUN_BLUE_ARC_P2.y;
  return { x, y };
}

export function computeCelestialSunMoonDiagonalPose(
  celestialPhase: number,
  elapsedSeconds = 0,
): CelestialSunMoonDiagonalPose {
  const p = Math.max(0, Math.min(1, celestialPhase));
  const t = Math.max(0, elapsedSeconds);

  const baseCyclePos =
    p <= 0.5
      ? 0.08 + (p / 0.5) * (0.37 - 0.08)
      : 0.37 + ((p - 0.5) / 0.5) * (0.58 - 0.37);

  const cyclePos = ((baseCyclePos + t * SUN_BLUE_ARC_SPEED_PER_SEC) % 1.0 + 1.0) % 1.0;

  const sunArcProgress = Math.max(0, Math.min(1, cyclePos / 0.495));
  const sunPt = evaluateSunBlueArcTrajectory(sunArcProgress);
  const sunX = sunPt.x;
  const sunY = sunPt.y;
  const sunZ = -252.0;

  // Garante exclusividade absoluta: o Sol desaparece 100% antes da Lua surgir à noite!
  const dawnFadeIn = smoothstepScalar(0.008, 0.045, cyclePos);
  const horizonSetFadeOut = 1.0 - smoothstepScalar(0.435, 0.495, cyclePos);
  const sunOpacity = cyclePos >= 0.495 || cyclePos <= 0.008 ? 0.0 : dawnFadeIn * horizonSetFadeOut;

  const moonArcProgress =
    cyclePos >= 0.505 ? Math.max(0, Math.min(1, (cyclePos - 0.505) / 0.485)) : 0.0;
  const moonPt = evaluateSunBlueArcTrajectory(moonArcProgress);
  const moonX = moonPt.x;
  const moonY = moonPt.y;
  const moonZ = -248.0;

  const moonFadeIn = smoothstepScalar(0.505, 0.555, cyclePos);
  const moonHorizonSetFadeOut = 1.0 - smoothstepScalar(0.935, 0.99, cyclePos);
  const moonOpacity =
    cyclePos < 0.505 || cyclePos >= 0.99 ? 0.0 : moonFadeIn * moonHorizonSetFadeOut;

  const starfieldOpacity =
    cyclePos < 0.48
      ? 0.0
      : smoothstepScalar(0.48, 0.56, cyclePos) * (1.0 - smoothstepScalar(0.91, 0.985, cyclePos));

  const eveningSunsetMix =
    smoothstepScalar(0.25, 0.34, cyclePos) * (1.0 - smoothstepScalar(0.46, 0.53, cyclePos));
  const dawnWarmMix =
    0.58 *
    (smoothstepScalar(0.91, 0.975, cyclePos) + (1.0 - smoothstepScalar(0.0, 0.045, cyclePos)));
  const dynamicSunsetMix = Math.min(1.0, Math.max(0.0, eveningSunsetMix + dawnWarmMix));

  const dynamicNightMix =
    smoothstepScalar(0.46, 0.54, cyclePos) * (1.0 - smoothstepScalar(0.91, 0.985, cyclePos));

  return {
    sunX,
    sunY,
    sunZ,
    sunArcProgress,
    sunOpacity,
    moonX,
    moonY,
    moonZ,
    moonArcProgress,
    moonOpacity,
    starfieldOpacity: Math.min(1.0, Math.max(0.0, starfieldOpacity)),
    dynamicSunsetMix,
    dynamicNightMix: Math.min(1.0, Math.max(0.0, dynamicNightMix)),
    cyclePos,
  };
}

export type BrazilianKiteArchetype =
  | 'pipa_carioca_4cores'
  | 'pipa_verde_amarela'
  | 'peixinho_arraia'
  | 'pipa_estrela_favela'
  | 'pipa_geometrica_delta'
  | 'pipa_sol_tropical';

export const BRAZILIAN_KITE_ARCHETYPES: readonly BrazilianKiteArchetype[] = [
  'pipa_carioca_4cores',
  'pipa_verde_amarela',
  'peixinho_arraia',
  'pipa_estrela_favela',
  'pipa_geometrica_delta',
  'pipa_sol_tropical',
];

export interface BeachKitePose {
  archetype: BrazilianKiteArchetype;
  swayX: number;
  bobY: number;
  rollZ: number;
  pitchX: number;
  yawY: number;
  tailWavePhase: number;
}

export function computeBeachKitePose(
  kiteIndex: number,
  elapsedSeconds: number,
): BeachKitePose {
  const t = Math.max(0, elapsedSeconds);
  const key = ((kiteIndex % 6) + 6) % 6;
  const archetype = BRAZILIAN_KITE_ARCHETYPES[key];
  const phase = kiteIndex * 1.75;
  const speed = 1.65 + (kiteIndex % 4) * 0.24;

  const tugPulse = Math.pow(0.5 + 0.5 * Math.sin(t * speed * 0.85 + phase * 1.3), 3.0);
  const tugDiveY = -tugPulse * 0.42;
  const tugDartX = Math.cos(t * speed * 1.7 + phase) * tugPulse * 0.55;

  const swayX =
    Math.sin(t * speed + phase) * 1.45 +
    Math.cos(t * speed * 0.52 - phase) * 0.48 +
    tugDartX;
  const bobY =
    Math.cos(t * speed * 1.35 + phase * 0.8) * 0.72 +
    Math.sin(t * 0.9 + phase) * 0.28 +
    tugDiveY;
  const rollZ = -Math.cos(t * speed + phase) * 0.38 + Math.sin(t * speed * 2.1 + phase) * 0.12;
  const pitchX = 0.26 + Math.sin(t * speed * 1.2 + phase) * 0.09;
  const yawY = -0.16 + Math.sin(t * speed * 0.65 + phase) * 0.14;

  return {
    archetype,
    swayX,
    bobY,
    rollZ,
    pitchX,
    yawY,
    tailWavePhase: t * 9.8 + kiteIndex * 2.1,
  };
}

/**
 * Computes the vertical elevation offset (dy) of the straight-line Inferno road
 * ("cenario diferente em linha reta... e se possivel a rua la no horizonte vai indo la pro ceu com uma luz na rua como se fosse saida la no horizonte").
 * Near the player (z >= -12), dy = 0; between z = -14 and -42 it dips gently into a shallow foreground valley,
 * and beyond z = -42 it climbs steeply upward into the sky toward the glowing horizon exit portal!
 */
export function computeInfernoAscendingRoadHeight(
  z: number,
  curveStartZ = WORLD_CURVE_START_Z,
): number {
  const curveDist = Math.max(0, -(z - curveStartZ));
  if (curveDist <= 0) return 0;

  const infernoDip =
    -1.35 * smoothstepScalar(2.0, 26.0, curveDist) * (1.0 - smoothstepScalar(28.0, 72.0, curveDist));
  const infernoClimbDist = Math.max(0, curveDist - 24.0);
  const infernoSkyClimb = Math.pow(infernoClimbDist / 165.0, 1.72) * 34.5;

  return infernoDip + infernoSkyClimb;
}

export interface InfernoFlyingCreaturePose {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  wingFlapAngle: number;
}

/**
 * Computes the distant 3D soaring trajectory and wing-flapping articulation for the blurry winged sky creatures
 * circling far away in the crimson sky ("deixe essas criaturas voando bem longe e borradas").
 */
export function computeInfernoFlyingCreaturePose(
  creatureIndex: number,
  elapsedSeconds: number,
): InfernoFlyingCreaturePose {
  const t = Math.max(0, elapsedSeconds);
  const anchors = [
    { baseX: -22.0, baseY: 38.5, baseZ: -158.0, radiusX: 6.5, radiusY: 1.5, speed: 0.40, flapSpeed: 5.6 },
    { baseX: 24.0, baseY: 41.0, baseZ: -164.0, radiusX: 7.0, radiusY: 1.7, speed: 0.36, flapSpeed: 5.2 },
    { baseX: -11.5, baseY: 45.0, baseZ: -176.0, radiusX: 7.5, radiusY: 1.6, speed: 0.34, flapSpeed: 5.9 },
    { baseX: 14.5, baseY: 47.5, baseZ: -182.0, radiusX: 8.0, radiusY: 1.8, speed: 0.32, flapSpeed: 5.1 },
    { baseX: -28.0, baseY: 50.0, baseZ: -194.0, radiusX: 8.5, radiusY: 1.5, speed: 0.38, flapSpeed: 5.5 },
    { baseX: 29.5, baseY: 52.0, baseZ: -202.0, radiusX: 9.0, radiusY: 1.7, speed: 0.30, flapSpeed: 4.9 },
  ];
  const cfg = anchors[Math.abs(creatureIndex) % anchors.length];
  const phase = creatureIndex * 1.95;

  const angle = t * cfg.speed + phase;
  const x = cfg.baseX + Math.sin(angle) * cfg.radiusX;
  const y =
    cfg.baseY +
    Math.cos(angle * 1.4) * cfg.radiusY +
    Math.sin(t * cfg.flapSpeed + phase) * 0.14;
  const z = cfg.baseZ + Math.cos(angle * 0.85) * 4.0;

  const vx = Math.cos(angle) * cfg.radiusX * cfg.speed;
  const rotZ = -vx * 0.055;
  const rotY = Math.sin(angle) * 0.24 + (cfg.baseX < 0 ? 0.16 : -0.16);
  const rotX = 0.10 + Math.sin(angle * 1.4) * 0.06;
  const wingFlapAngle = Math.sin(t * cfg.flapSpeed + phase) * 0.56;

  return {
    x,
    y,
    z,
    rotX,
    rotY,
    rotZ,
    wingFlapAngle,
  };
}

export interface InfernoMeteorPose {
  x: number;
  y: number;
  z: number;
  angleZ: number;
  opacity: number;
  scale: number;
}

/**
 * Computes the deterministic diagonal trajectory for distant meteors positioned far from the central road light
 * and streaking away into the deep horizon ("deixe os meteoros longe da luz da rua deixe em outro lugar e mais distante indo pro horizonte").
 */
export function computeInfernoMeteorPose(
  meteorIndex: number,
  elapsedSeconds: number,
): InfernoMeteorPose {
  const t = Math.max(0, elapsedSeconds);
  const tracks = [
    // Far-Left Upper Sky Meteor travelling outward & downward into the deep left horizon (x: -54 -> -92, z: -182 -> -242)
    { startX: -54.0, startY: 84.0, dx: -38.0, dy: -30.0, startZ: -182.0, dz: -60.0, duration: 5.8, initialProgress: 0.36, baseScale: 0.86 },
    // Far-Left Mid Sky Meteor travelling into the distant left horizon (x: -78 -> -116, z: -194 -> -254)
    { startX: -78.0, startY: 74.0, dx: -38.0, dy: -28.0, startZ: -194.0, dz: -60.0, duration: 6.4, initialProgress: 0.62, baseScale: 0.76 },
    // Far-Right Upper Sky Meteor travelling outward & downward into the deep right horizon (x: +54 -> +92, z: -184 -> -244)
    { startX: 54.0, startY: 86.0, dx: 38.0, dy: -31.0, startZ: -184.0, dz: -60.0, duration: 5.5, initialProgress: 0.42, baseScale: 0.85 },
    // Far-Right Mid Sky Meteor travelling into the distant right horizon (x: +76 -> +114, z: -196 -> -256)
    { startX: 76.0, startY: 75.0, dx: 38.0, dy: -28.0, startZ: -196.0, dz: -60.0, duration: 6.2, initialProgress: 0.28, baseScale: 0.74 },
    // High Extreme-Left Distant Meteor receding into the far horizon (x: -64 -> -102, z: -204 -> -264)
    { startX: -64.0, startY: 92.0, dx: -38.0, dy: -32.0, startZ: -204.0, dz: -60.0, duration: 6.8, initialProgress: 0.50, baseScale: 0.68 },
  ];

  const cfg = tracks[Math.abs(meteorIndex) % tracks.length];
  const rawProgress = (t / cfg.duration + cfg.initialProgress) % 1.0;
  const progress = rawProgress < 0 ? rawProgress + 1.0 : rawProgress;

  const x = cfg.startX + cfg.dx * progress;
  const y = cfg.startY + cfg.dy * progress;
  const z = cfg.startZ + cfg.dz * progress;
  const angleZ = Math.atan2(cfg.dy, cfg.dx);

  // Perspective foreshortening as the meteor travels deeper into the horizon ("mais distante indo pro horizonte")
  const scale = cfg.baseScale * (1.0 - 0.46 * progress);

  // Smooth fade-in at entry (0..0.14) and atmospheric horizon fade-out (0.76..1.0)
  const fadeIn = smoothstepScalar(0.0, 0.14, progress);
  const fadeOut = 1.0 - smoothstepScalar(0.76, 0.99, progress);
  const opacity = Math.max(0, Math.min(1, fadeIn * fadeOut));

  return {
    x,
    y,
    z,
    angleZ,
    opacity,
    scale,
  };
}









export type GameDifficultyId = 'easy' | 'medium' | 'hard' | 'extreme';
export function getPizzaMissionGoal(difficulty: GameDifficultyId): number {
  if (difficulty === 'easy') return 20;
  if (difficulty === 'medium') return 40;
  if (difficulty === 'hard') return 90;
  return 30;
}
