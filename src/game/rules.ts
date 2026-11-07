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
  y: number;
  vy: number;
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

export function createInitialPlayerState(): PlayerState {
  return {
    lane: 0,
    x: 0,
    y: 0,
    vy: 0,
    isJumping: false,
    isRolling: false,
    rollTimer: 0,
    invulnerableTimer: 0,
    hp: 3,
    maxHp: 3,
    score: 0,
    coins: 0,
    distance: 0,
    combo: 1,
    speed: 9.8,
    housesPassed: 0,
  };
}

export function laneToX(lane: LaneIndex): number {
  return lane * LANE_WIDTH;
}

export function shiftLane(state: PlayerState, direction: -1 | 1): PlayerState {
  const next = Math.max(-1, Math.min(1, state.lane + direction)) as LaneIndex;
  return {
    ...state,
    lane: next,
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

export function stepPlayerPhysics(state: PlayerState, dt: number): PlayerState {
  const clampedDt = Math.min(dt, 0.05);
  const targetX = laneToX(state.lane);
  const dampFactor = 1 - Math.exp(-16 * clampedDt);
  const nextX = state.x + (targetX - state.x) * dampFactor;

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
  // Calm, comfortable speed ramp so the scenery passes smoothly without rushing ("faz com que o cenario nao passe muito rapido")
  const nextSpeed = Math.min(14.5, 9.8 + Math.floor(nextDistance / 180) * 0.45);
  const nextScore = state.score + distDelta * 2 * state.combo;

  return {
    ...state,
    x: nextX,
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
export const FOG_DISTANCE_NEAR = 52.0;
export const FOG_DISTANCE_FAR = 138.0;

export const BEHIND_GAMEPLAY_CULL_Z = 14.5;
export const LOD0_MAX_DISTANCE = 48.0;
export const LOD1_MAX_DISTANCE = 88.0;
export const MAX_CULL_DISTANCE_HOUSE_Z = 132.0;
export const MAX_CULL_DISTANCE_FAVELA_Z = 126.0;
export const MAX_CULL_DISTANCE_PROP_Z = 128.0;

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
  const distanceAhead = Math.max(0, playerZ - objectZ);
  if (distanceAhead <= 56.0) return 1.0;
  if (distanceAhead >= MAX_CULL_DISTANCE_HOUSE_Z) return 0.0;

  // Stage 1 (56m .. 100m): gentle mid-distance translucency (1.0 -> 0.68)
  if (distanceAhead <= 100.0) {
    const t = (distanceAhead - 56.0) / (100.0 - 56.0);
    const s = t * t * (3 - 2 * t);
    return 1.0 - s * 0.32;
  }

  // Stage 2 (100m .. 132m): silky horizon emergence fade from 0.68 down to 0.0 at the cull boundary
  const tFar = (distanceAhead - 100.0) / (MAX_CULL_DISTANCE_HOUSE_Z - 100.0);
  const sFar = tFar * tFar * (3 - 2 * tFar);
  return 0.68 * (1.0 - sFar);
}

/**
 * Computes a delayed, smooth fade-out ("fassas as casas de tras esperando mais um pouco pra sumir")
 * for distant and upper-tier hillside favela houses so they stay solid across the main view
 * and only dissolve far in the horizon!
 */
export function computeFavelaFadeOpacity(
  objectZ: number,
  playerZ = 0,
  isUpperTier = false,
): number {
  const distanceAhead = Math.max(0, playerZ - objectZ);
  const fadeStart = isUpperTier ? 52.0 : 68.0;
  const fadeEnd = isUpperTier ? 114.0 : 124.0;
  const baseCap = isUpperTier ? 0.92 : 1.0;
  const minFloor = isUpperTier ? 0.22 : 0.35;

  if (distanceAhead <= fadeStart) return baseCap;
  if (distanceAhead >= fadeEnd) return minFloor;
  const t = (distanceAhead - fadeStart) / (fadeEnd - fadeStart);
  const smooth = t * t * (3 - 2 * t);
  return baseCap - smooth * (baseCap - minFloor);
}

export interface LodVisibilityResult {
  visible: boolean;
  lod: 0 | 1 | 2;
  distanceAhead: number;
}

/**
 * Evaluates automatic LOD tier (0 = high, 1 = medium, 2 = low silhouette) and
 * culls objects that are either completely behind the camera (z > behindCullZ) or beyond maxCullDistance.
 */
export function computeObjectLodAndCulling(
  objectZ: number,
  playerZ = 0,
  maxCullDistance: number = MAX_CULL_DISTANCE_HOUSE_Z,
  behindCullZ: number = BEHIND_GAMEPLAY_CULL_Z,
): LodVisibilityResult {
  // Wait until object is completely behind the camera frustum (z > 14.5) before culling
  if (objectZ > playerZ + behindCullZ) {
    return { visible: false, lod: 2, distanceAhead: 0 };
  }

  const distanceAhead = Math.max(0, playerZ - objectZ);

  // Distance Culling for objects beyond the Fog Distance horizon
  if (distanceAhead > maxCullDistance) {
    return { visible: false, lod: 2, distanceAhead };
  }

  if (distanceAhead <= LOD0_MAX_DISTANCE) {
    return { visible: true, lod: 0, distanceAhead };
  }

  if (distanceAhead <= LOD1_MAX_DISTANCE) {
    return { visible: true, lod: 1, distanceAhead };
  }

  return { visible: true, lod: 2, distanceAhead };
}

export interface OcclusionCheckResult {
  fullyOccluded: boolean;
  lowerTierOccluded: boolean;
}

/**
 * Evaluates Occlusion Culling for hillside favela constructions:
 * Never hides the elevated upper favela houses while on screen (so they never blink out!),
 * and only culls the bottom retaining base when directly behind a 2-story sobrado or far in the horizon.
 */
export function evaluateFavelaOcclusion(
  favelaZ: number,
  side: 'left' | 'right',
  playerX: number,
  hasTwoStoryBlockerInFront: boolean,
): OcclusionCheckResult {
  if (favelaZ > BEHIND_GAMEPLAY_CULL_Z || -favelaZ > MAX_CULL_DISTANCE_FAVELA_Z) {
    return { fullyOccluded: true, lowerTierOccluded: true };
  }

  const distAhead = -favelaZ;
  const playerCloseToSameSide =
    (side === 'left' && playerX < -1.6) || (side === 'right' && playerX > 1.6);

  // Only hide the lower retaining base when a 2-story sobrado stands in front or far in the distance;
  // keep the elevated favela houses visible so they never pop out on screen!
  const lowerTierOccluded =
    (hasTwoStoryBlockerInFront && playerCloseToSameSide && distAhead >= 1.5 && distAhead <= 24.0) ||
    distAhead > 82.0;

  return {
    fullyOccluded: false,
    lowerTierOccluded,
  };
}


