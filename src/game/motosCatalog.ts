export interface MotorcycleSpec {
  id: string;
  name: string;
  brand: string;
  category: string;
  displacementCc: number;
  powerHp: string;
  torqueNm: string;
  primaryColor: string;
  colorName: string;
  nodeName: string;
  rarity: 'Comum' | 'Rara' | 'Especial' | 'Lendária' | 'Mítica';
  price: number; // 0 = gratuita / inicial
  description: string;
  unlockedByDefault?: boolean;
}

export const MOTORCYCLES_CATALOG: MotorcycleSpec[] = [
  {
    id: 'cg160_titan',
    name: 'Honda CG 160 Titan CBS',
    brand: 'HONDA',
    category: 'Urbana Street 160cc',
    displacementCc: 162.7,
    powerHp: '15,1 cv @ 8.000 rpm',
    torqueNm: '1,54 kgf.m @ 7.000 rpm',
    primaryColor: '#b91c1c',
    colorName: 'Vermelho Metálico Marrakesh',
    nodeName: 'Player_Moto_05_honda_cg_160_titan',
    rarity: 'Comum',
    price: 0,
    description: 'A rainha absoluta do asfalto brasileiro. Ágil, econômica e imbatível no trânsito urbano.',
    unlockedByDefault: true,
  },
  {
    id: 'mottu_sport110',
    name: 'Mottu Sport 110i (TVS)',
    brand: 'MOTTU / TVS',
    category: 'Urbana Utility 110cc',
    displacementCc: 109.7,
    powerHp: '8,3 cv @ 7.350 rpm',
    torqueNm: '0,89 kgf.m @ 4.500 rpm',
    primaryColor: '#22c55e',
    colorName: 'Preto & Verde Mottu',
    nodeName: 'Player_Moto_04_mottu_tvs_mottu_sport_110i',
    rarity: 'Comum',
    price: 0,
    description: 'A guerreira dos entregadores de app. Resistente a qualquer buraco e com manutenção zero estresse.',
    unlockedByDefault: true,
  },
  {
    id: 'factor150_ed',
    name: 'Yamaha Factor 150 ED UBS',
    brand: 'YAMAHA',
    category: 'Urbana Street 150cc',
    displacementCc: 149.0,
    powerHp: '12,4 cv @ 7.500 rpm',
    torqueNm: '1,30 kgf.m @ 5.500 rpm',
    primaryColor: '#f1f5f9',
    colorName: 'Branco Sports Perolizado',
    nodeName: 'Player_Moto_08_yamaha_factor_150_ed',
    rarity: 'Comum',
    price: 2600,
    description: 'Confortável, com motor Blueflex e painel 100% digital com indicador de marcha eco.',
  },
  {
    id: 'pop110i_es',
    name: 'Honda Pop 110i ES',
    brand: 'HONDA',
    category: 'Cub Urbana 110cc',
    displacementCc: 109.5,
    powerHp: '8,43 cv @ 7.250 rpm',
    torqueNm: '0,94 kgf.m @ 5.000 rpm',
    primaryColor: '#ef4444',
    colorName: 'Branco Ross & Assento Vermelho',
    nodeName: 'Player_Moto_09_honda_pop_110i_es',
    rarity: 'Comum',
    price: 3400,
    description: 'Leve como uma pluma e divertida de pilotar. Costura qualquer congestionamento com extrema facilidade.',
  },
  {
    id: 'nxr160_bros',
    name: 'Honda NXR 160 Bros ESDD',
    brand: 'HONDA',
    category: 'Trail Multiuso 160cc',
    displacementCc: 162.7,
    powerHp: '14,7 cv @ 8.500 rpm',
    torqueNm: '1,60 kgf.m @ 5.500 rpm',
    primaryColor: '#dc2626',
    colorName: 'Vermelho Fighting & Preto',
    nodeName: 'Player_Moto_07_honda_nxr_160_bros',
    rarity: 'Rara',
    price: 5200,
    description: 'Suspensão de longo curso perfeita para encarar lombadas, paralelepípedos e ladeiras íngremes.',
  },
  {
    id: 'xre190_adv',
    name: 'Honda XRE 190 ABS Adventure',
    brand: 'HONDA',
    category: 'Adventure Trail 190cc',
    displacementCc: 184.4,
    powerHp: '16,4 cv @ 8.500 rpm',
    torqueNm: '1,66 kgf.m @ 6.000 rpm',
    primaryColor: '#38bdf8',
    colorName: 'Preto Fosco & Prata Acetinado',
    nodeName: 'Player_Moto_03_honda_xre_190_abs',
    rarity: 'Rara',
    price: 6800,
    description: 'Visual aventureiro com freio ABS dianteiro e excelente torque em baixas rotações.',
  },
  {
    id: 'xtz250_lander',
    name: 'Yamaha XTZ 250 Lander ABS',
    brand: 'YAMAHA',
    category: 'On-Off Road 250cc',
    displacementCc: 249.0,
    powerHp: '20,9 cv @ 8.000 rpm',
    torqueNm: '2,10 kgf.m @ 6.500 rpm',
    primaryColor: '#dc1f26',
    colorName: 'Solar Red & Preto Fosco',
    nodeName: 'Player_Moto_01_yamaha_xtz_250_lander',
    rarity: 'Rara',
    price: 8900,
    description: 'Robusta, agressiva e inspirada no rally Dakar. Domina terra, asfalto e qualquer desnível.',
  },
  {
    id: 'fz25_fazer',
    name: 'Yamaha FZ25 Fazer 250 ABS',
    brand: 'YAMAHA',
    category: 'Naked Sport 250cc',
    displacementCc: 249.0,
    powerHp: '21,5 cv @ 8.000 rpm',
    torqueNm: '2,10 kgf.m @ 6.500 rpm',
    primaryColor: '#3b82f6',
    colorName: 'Titanium Matt Grey & Racing Blue',
    nodeName: 'Player_Moto_02_yamaha_fz25_fazer_250',
    rarity: 'Rara',
    price: 9800,
    description: 'Farol com projetor de LED, visual musculoso e comportamento esportivo dinâmico nas curvas.',
  },
  {
    id: 'cb300f_twister',
    name: 'Honda CB 300F Twister ABS',
    brand: 'HONDA',
    category: 'Naked Sport 300cc',
    displacementCc: 293.5,
    powerHp: '24,7 cv @ 7.500 rpm',
    torqueNm: '2,67 kgf.m @ 5.500 rpm',
    primaryColor: '#eab308',
    colorName: 'Dourado Metálico Fosco',
    nodeName: 'Player_Moto_06_honda_cb_300f_twister',
    rarity: 'Especial',
    price: 12500,
    description: 'Embreagem deslizante assistida, iluminação full LED e resposta imediata do acelerador.',
  },
  {
    id: 'cbx250_twister_classic',
    name: 'Honda CBX 250 Twister Clássica',
    brand: 'HONDA',
    category: 'Clássica Street 250cc',
    displacementCc: 249.0,
    powerHp: '24,0 cv @ 8.000 rpm',
    torqueNm: '2,48 kgf.m @ 6.000 rpm',
    primaryColor: '#facc15',
    colorName: 'Amarelo Canário Clássico 2008',
    nodeName: 'Player_Moto_14_honda_cbx_250_twister',
    rarity: 'Especial',
    price: 14200,
    description: 'O ronco inconfundível dos anos 2000 que marcou época em todas as avenidas do país.',
  },
  {
    id: 'cg125_bolinha_cartoon',
    name: 'Honda CG 125 "Bolinha" 1979',
    brand: 'HONDA',
    category: 'Clássica Retrô 125cc',
    displacementCc: 124.0,
    powerHp: '11,0 cv @ 9.000 rpm',
    torqueNm: '0,98 kgf.m @ 7.500 rpm',
    primaryColor: '#f97316',
    colorName: 'Laranja Vibrante Retrô 1979',
    nodeName: 'Player_Moto_16_honda_cg_125_bolinha',
    rarity: 'Especial',
    price: 15800,
    description: 'Farol redondo, tanque cromado e muita história. O início da lenda das motos brasileiras.',
  },
  {
    id: 'xre300_sahara',
    name: 'Honda XRE 300 Sahara Adventure',
    brand: 'HONDA',
    category: 'Adventure Rally 300cc',
    displacementCc: 293.5,
    powerHp: '25,2 cv @ 7.500 rpm',
    torqueNm: '2,74 kgf.m @ 5.750 rpm',
    primaryColor: '#ca8a04',
    colorName: 'Bege Rally Sahara & Preto',
    nodeName: 'Player_Moto_13_honda_xre_300_sahara',
    rarity: 'Especial',
    price: 18500,
    description: 'O retorno do nome mítico Sahara. Equipada com bolha alta, protetor de carenagem e pronta para qualquer expedição.',
  },
  {
    id: 'dominar400',
    name: 'Bajaj Dominar 400 Touring ABS',
    brand: 'BAJAJ',
    category: 'Sport Touring 400cc',
    displacementCc: 373.3,
    powerHp: '40,0 cv @ 8.800 rpm',
    torqueNm: '3,57 kgf.m @ 6.500 rpm',
    primaryColor: '#0f766e',
    colorName: 'Aurora Green Metálico',
    nodeName: 'Player_Moto_12_bajaj_dominar_400',
    rarity: 'Especial',
    price: 21500,
    description: 'Equipada de fábrica com suporte de GPS, para-brisa alto, protetor de motor e garfo dianteiro invertido.',
  },
  {
    id: 'mt03_abs',
    name: 'Yamaha MT-03 Master of Torque',
    brand: 'YAMAHA',
    category: 'Hyper Naked 321cc',
    displacementCc: 321.0,
    powerHp: '42,0 cv @ 10.750 rpm',
    torqueNm: '3,02 kgf.m @ 9.000 rpm',
    primaryColor: '#06b6d4',
    colorName: 'Storm Fluo & Cyan',
    nodeName: 'Player_Moto_10_yamaha_mt_03_abs',
    rarity: 'Lendária',
    price: 27500,
    description: 'Bicilíndrica agressiva com faróis duplos no estilo predador. Arrancadas brutais e som encorpado.',
  },
  {
    id: 'rd350_viuva_negra',
    name: 'Yamaha RD 350R LC "Viúva Negra"',
    brand: 'YAMAHA',
    category: 'Clássica 2T 350cc',
    displacementCc: 347.0,
    powerHp: '55,0 cv @ 9.000 rpm',
    torqueNm: '4,79 kgf.m @ 8.500 rpm',
    primaryColor: '#dc2626',
    colorName: 'Branco Pérola & Speedblock Vermelho',
    nodeName: 'Player_Moto_15_yamaha_rd_350_vi_va_negra',
    rarity: 'Lendária',
    price: 32000,
    description: 'Motor dois tempos com válvula YPVS. O foguete lendário que acelera de 0 a 100 em menos de 5 segundos.',
  },
  {
    id: 'cb650r_neo',
    name: 'Honda CB 650R Neo Sports Café',
    brand: 'HONDA',
    category: 'Neo Sports 650cc',
    displacementCc: 649.0,
    powerHp: '88,4 cv @ 11.500 rpm',
    torqueNm: '6,13 kgf.m @ 8.000 rpm',
    primaryColor: '#991b1b',
    colorName: 'Vermelho Perolizado & Bronze Níquel',
    nodeName: 'Player_Moto_11_honda_cb_650r_caf',
    rarity: 'Lendária',
    price: 37500,
    description: 'Quatro cilindros em linha com escape em formato de harpa. Sinfonia mecânica pura a cada acelerada.',
  },
  {
    id: 'custom_cromada_imperador',
    name: 'Custom Imperador 1000 Full Cromada',
    brand: 'CUSTOM BR',
    category: 'Custom Cromada 1000cc',
    displacementCc: 998.0,
    powerHp: '145,0 cv @ 11.500 rpm',
    torqueNm: '10,8 kgf.m @ 9.000 rpm',
    primaryColor: '#f8fafc',
    colorName: 'Cromo Espelhado Puro & Safira',
    nodeName: 'Player_Moto_17_custom_br_imperador_cromada',
    rarity: 'Mítica',
    price: 48000,
    description: '100% banhada a cromo espelhado com acabamentos manuais de luxo e presença inigualável na avenida.',
  },
  {
    id: 'custom_motoqueiro_fantasma',
    name: 'Hellfire 666 "Motoqueiro Fantasma"',
    brand: 'CUSTOM HELL',
    category: 'Custom Fogo 666cc',
    displacementCc: 666.0,
    powerHp: '166,6 cv @ 10.660 rpm',
    torqueNm: '14,2 kgf.m @ 7.500 rpm',
    primaryColor: '#ea580c',
    colorName: 'Chamas do Inferno & Obsidiana',
    nodeName: 'Player_Moto_18_custom_hell_motoqueiro_fantasma',
    rarity: 'Mítica',
    price: 58000,
    description: 'Rodas flamejantes, corrente infernal no chassi e chamas puras emanando dos tubos de escape.',
  },
  {
    id: 'custom_cyber_neon_br',
    name: 'CyberMoto 500 Turbo Neon BR',
    brand: 'CUSTOM GAME',
    category: 'Custom Cyber 500cc',
    displacementCc: 500.0,
    powerHp: '92,0 cv @ 10.500 rpm',
    torqueNm: '7,40 kgf.m @ 8.000 rpm',
    primaryColor: '#d946ef',
    colorName: 'Cyberpunk Rosa Choque & Neon Cyan',
    nodeName: 'Player_Moto_19_custom_game_cyber_neon_500',
    rarity: 'Mítica',
    price: 65000,
    description: 'Painel holográfico de alta definição, fitas de neon pulsantes e aerodinâmica futurista.',
  },
  {
    id: 'custom_grau_ouro_24k',
    name: 'Grau Imperial 24K Ouro & Cromo',
    brand: 'CUSTOM BR',
    category: 'Custom Ouro 300cc',
    displacementCc: 300.0,
    powerHp: '38,5 cv @ 9.500 rpm',
    torqueNm: '3,40 kgf.m @ 7.200 rpm',
    primaryColor: '#fbbf24',
    colorName: 'Ouro 24K Espelhado & Cromo Real',
    nodeName: 'Player_Moto_20_custom_br_grau_ouro_24k',
    rarity: 'Mítica',
    price: 78000,
    description: 'Chassi banhado a ouro 24 quilates com escape polido sob medida para cortar de giro com estilo real.',
  },
];

export const EQUIPPED_MOTO_STORAGE_KEY = 'caramelorun_equipped_moto_id';
export const UNLOCKED_MOTOS_STORAGE_KEY = 'caramelorun_unlocked_motos_list';

export function getSavedEquippedMotoId(): string {
  try {
    const saved = localStorage.getItem(EQUIPPED_MOTO_STORAGE_KEY);
    if (saved && MOTORCYCLES_CATALOG.some((m) => m.id === saved)) {
      return saved;
    }
  } catch {}
  return 'cg160_titan';
}

export function saveEquippedMotoId(id: string): void {
  try {
    localStorage.setItem(EQUIPPED_MOTO_STORAGE_KEY, id);
  } catch {}
}

export function getUnlockedMotoIds(): string[] {
  try {
    const saved = localStorage.getItem(UNLOCKED_MOTOS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return ['cg160_titan', 'mottu_sport110'];
}

export function saveUnlockedMotoIds(ids: string[]): void {
  try {
    localStorage.setItem(UNLOCKED_MOTOS_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

export function getMotoSpecById(id: string): MotorcycleSpec {
  return (
    MOTORCYCLES_CATALOG.find((m) => m.id === id) ||
    MOTORCYCLES_CATALOG.find((m) => m.id === 'cg160_titan') ||
    MOTORCYCLES_CATALOG[0]
  );
}
