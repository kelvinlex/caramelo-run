import { User, Skin, Achievement, AntiCheatLog, Transaction, DailyMetrics, UserRole, GameOverImage } from '../types';
import {
  INITIAL_USERS,
  INITIAL_SKINS,
  INITIAL_ACHIEVEMENTS,
  INITIAL_ANTI_CHEAT_LOGS,
  INITIAL_TRANSACTIONS,
  INITIAL_DAILY_METRICS,
  generateRandomNickname
} from '../data/initialData';
import { apiService } from './apiService';

const USERS_KEY = 'viralata_users_v1';
const SKINS_KEY = 'viralata_skins_v1';
const ACHIEVEMENTS_KEY = 'viralata_achievements_v1';
const ANTICHEAT_KEY = 'viralata_anticheat_v1';
const TRANSACTIONS_KEY = 'viralata_transactions_v1';
const METRICS_KEY = 'viralata_metrics_v1';
const CURRENT_USER_KEY = 'viralata_current_user_v1';
const GAMEOVER_IMAGES_KEY = 'viralata_gameover_images_v1';
const PINNED_GAMEOVER_IMAGE_KEY = 'viralata_pinned_gameover_image_v1';
const PINNED_GAMEOVER_IMAGE_URL_KEY = 'viralata_pinned_gameover_image_url_v1';

export function isInfiniteMoneyUser(user?: User | null): boolean {
  if (!user) return false;
  if (user.hasInfiniteCoins) return true;
  const id = (user.id || '').toLowerCase();
  const nick = (user.nickname || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return (
    id === 'usr-valdir-01' ||
    id === 'usr-kelvin-01' ||
    id === 'usr-guilherme-01' ||
    id === 'usr-root-01' ||
    nick.includes('valdir') ||
    nick.includes('kelvin') ||
    nick.includes('guilherme') ||
    nick === 'gui' ||
    nick.startsWith('gui_') ||
    nick.endsWith('_gui') ||
    email.includes('valdir') ||
    email.includes('kelvin') ||
    email.includes('guilherme')
  );
}

export const INITIAL_GAMEOVER_IMAGES: GameOverImage[] = [
  { id: 'go-1', url: '/images/gameover/dog_selfie_gas_station.jpg', title: 'Posto de Gasolina', createdAt: '2026-10-01T12:00:00Z' },
  { id: 'go-2', url: '/images/gameover/favela_selfie_scene.jpg', title: 'Selfie na Favela', createdAt: '2026-10-01T12:00:00Z' },
  { id: 'go-3', url: '/images/gameover/low_poly_dog_selfie.jpg', title: 'Caramelo Clássico', createdAt: '2026-10-01T12:00:00Z' },
  { id: 'go-4', url: '/images/gameover/low_poly_dog_selfie_1.jpg', title: 'Caramelo Estiloso', createdAt: '2026-10-01T12:00:00Z' },
  { id: 'go-5', url: '/images/gameover/low_poly_selfie_scene.jpg', title: 'Cena da Quebrada', createdAt: '2026-10-01T12:00:00Z' },
  { id: 'go-6', url: '/images/gameover/sunset_park_selfie.jpg', title: 'Pôr do Sol no Parque', createdAt: '2026-10-01T12:00:00Z' },
];

class StorageService {
  private users: User[] = [];
  private skins: Skin[] = [];
  private achievements: Achievement[] = [];
  private anticheatLogs: AntiCheatLog[] = [];
  private transactions: Transaction[] = [];
  private metrics: DailyMetrics = INITIAL_DAILY_METRICS;
  private gameOverImages: GameOverImage[] = [];
  private pinnedGameOverImageId: string | null = null;
  private currentUser: User | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadState();
    this.initDbSync();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (
          e.key === PINNED_GAMEOVER_IMAGE_KEY ||
          e.key === PINNED_GAMEOVER_IMAGE_URL_KEY ||
          e.key === GAMEOVER_IMAGES_KEY
        ) {
          this.loadGameOverImagesFromStorage();
          this.notify();
        }
      });
    }
  }

  private async initDbSync() {
    // Sempre tenta sincronizar GameOver Images (global via API, corrige bug do celular não ver imagem adicionada no PC)
    this.syncGameOverImagesFromServer();
    // Tenta novamente após 3s e quando a aba volta ao foco
    if (typeof window !== 'undefined') {
      setTimeout(() => this.syncGameOverImagesFromServer(), 3000);
      window.addEventListener('focus', () => this.syncGameOverImagesFromServer());
      window.addEventListener('online', () => this.syncGameOverImagesFromServer());
    }

    try {
      const health = await apiService.checkHealth();
      if (health.isOnline && health.database === 'connected') {
        // Sincroniza Leaderboard do Banco
        const dbLeaderboard = await apiService.getLeaderboard();
        if (dbLeaderboard && dbLeaderboard.length > 0) {
          // Atualiza lista de usuários com os do banco
          const merged = [...this.users];
          dbLeaderboard.forEach(dbU => {
            const idx = merged.findIndex(u => u.id === dbU.id || u.nickname.toLowerCase() === dbU.nickname.toLowerCase());
            if (idx >= 0) {
              const localPhoto = merged[idx].profilePhotoUrl || merged[idx].avatarUrl;
              merged[idx] = {
                ...merged[idx],
                ...dbU,
                profilePhotoUrl: dbU.profilePhotoUrl || dbU.avatarUrl || localPhoto,
                avatarUrl: dbU.avatarUrl || dbU.profilePhotoUrl || localPhoto,
              };
            } else {
              merged.push(dbU);
            }
          });
          this.users = merged;
          this.saveState();
        }

        // Sincroniza usuário atual se estiver logado
        if (this.currentUser && !this.currentUser.isGuest) {
          const synced = await apiService.syncUser(this.currentUser.id);
          if (synced) {
            const localPhoto = this.currentUser.profilePhotoUrl || this.currentUser.avatarUrl;
            this.currentUser = {
              ...synced,
              profilePhotoUrl: synced.profilePhotoUrl || synced.avatarUrl || localPhoto,
              avatarUrl: synced.avatarUrl || synced.profilePhotoUrl || localPhoto,
            };
            this.saveState();
          }
        }
      }
    } catch {
      // Falha silenciosa: opera em fallback local
    }
  }

  private async syncGameOverImagesFromServer() {
    try {
      const data = await apiService.getGameOverImages();
      if (data && Array.isArray(data.images) && data.images.length > 0) {
        // Só atualiza se o servidor tiver dados (evita sobrescrever com vazio durante offline)
        const serverIds = data.images.map((x: any) => x.id).sort().join(',');
        const localIds = this.gameOverImages.map(x => x.id).sort().join(',');
        const pinnedChanged = data.pinnedId !== this.pinnedGameOverImageId;
        if (serverIds !== localIds || pinnedChanged) {
          console.log(`[Storage] Sincronizando GameOver do servidor: ${data.images.length} imagens, pinned=${data.pinnedId}`);
          this.gameOverImages = data.images;
          this.pinnedGameOverImageId = data.pinnedId;
          // Também atualiza localStorage para fallback offline
          try {
            localStorage.setItem(GAMEOVER_IMAGES_KEY, JSON.stringify(this.gameOverImages));
            if (data.pinnedId) {
              localStorage.setItem(PINNED_GAMEOVER_IMAGE_KEY, data.pinnedId);
              const found = this.gameOverImages.find(x => x.id === data.pinnedId);
              if (found) localStorage.setItem(PINNED_GAMEOVER_IMAGE_URL_KEY, found.url);
            } else {
              localStorage.removeItem(PINNED_GAMEOVER_IMAGE_KEY);
              localStorage.removeItem(PINNED_GAMEOVER_IMAGE_URL_KEY);
            }
          } catch {}
          this.notify();
        }
      }
    } catch {}
  }

  private loadState() {
    try {
      const u = localStorage.getItem(USERS_KEY);
      this.users = u ? JSON.parse(u) : INITIAL_USERS;

      const s = localStorage.getItem(SKINS_KEY);
      this.skins = s ? JSON.parse(s) : INITIAL_SKINS;

      const a = localStorage.getItem(ACHIEVEMENTS_KEY);
      this.achievements = a ? JSON.parse(a) : INITIAL_ACHIEVEMENTS;

      const ac = localStorage.getItem(ANTICHEAT_KEY);
      this.anticheatLogs = ac ? JSON.parse(ac) : INITIAL_ANTI_CHEAT_LOGS;

      const tx = localStorage.getItem(TRANSACTIONS_KEY);
      this.transactions = tx ? JSON.parse(tx) : INITIAL_TRANSACTIONS;

      const m = localStorage.getItem(METRICS_KEY);
      this.metrics = m ? JSON.parse(m) : INITIAL_DAILY_METRICS;

      const gi = localStorage.getItem(GAMEOVER_IMAGES_KEY);
      this.gameOverImages = gi ? JSON.parse(gi) : INITIAL_GAMEOVER_IMAGES;

      const pgi = localStorage.getItem(PINNED_GAMEOVER_IMAGE_KEY);
      this.pinnedGameOverImageId = pgi || null;

      const cu = localStorage.getItem(CURRENT_USER_KEY);
      if (cu) {
        const parsed = JSON.parse(cu);
        // refresh from users list
        const found = this.users.find(x => x.id === parsed.id);
        this.currentUser = found || parsed;
      } else {
        this.currentUser = null;
      }

      // Garante que Valdir, Kelvin, Gui (e RootMaster) no modo ADM sempre tenham dinheiro infinito e cargo admin
      this.users = this.users.map((u) => {
        if (isInfiniteMoneyUser(u)) {
          return {
            ...u,
            role: u.role === 'root' ? 'root' : 'admin',
            hasInfiniteCoins: true,
            ossoCoins: 999999999,
            notas10: 999999,
            notas50: 999999,
            notas100: 999999,
            notas200: 999999,
          };
        }
        return u;
      });

      if (this.currentUser && isInfiniteMoneyUser(this.currentUser)) {
        this.currentUser = {
          ...this.currentUser,
          role: this.currentUser.role === 'root' ? 'root' : 'admin',
          hasInfiniteCoins: true,
          ossoCoins: 999999999,
          notas10: 999999,
          notas50: 999999,
          notas100: 999999,
          notas200: 999999,
        };
      }
    } catch {
      this.users = INITIAL_USERS;
      this.skins = INITIAL_SKINS;
      this.achievements = INITIAL_ACHIEVEMENTS;
      this.anticheatLogs = INITIAL_ANTI_CHEAT_LOGS;
      this.transactions = INITIAL_TRANSACTIONS;
      this.metrics = INITIAL_DAILY_METRICS;
      this.gameOverImages = INITIAL_GAMEOVER_IMAGES;
      this.pinnedGameOverImageId = null;
      this.currentUser = INITIAL_USERS[2];
    }
  }

  private loadGameOverImagesFromStorage() {
    try {
      const gi = localStorage.getItem(GAMEOVER_IMAGES_KEY);
      if (gi) this.gameOverImages = JSON.parse(gi);
      const pgi = localStorage.getItem(PINNED_GAMEOVER_IMAGE_KEY);
      this.pinnedGameOverImageId = pgi || null;
    } catch {}
  }

  private saveState() {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
      localStorage.setItem(SKINS_KEY, JSON.stringify(this.skins));
      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(this.achievements));
      localStorage.setItem(ANTICHEAT_KEY, JSON.stringify(this.anticheatLogs));
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(this.transactions));
      localStorage.setItem(METRICS_KEY, JSON.stringify(this.metrics));
      localStorage.setItem(GAMEOVER_IMAGES_KEY, JSON.stringify(this.gameOverImages));

      // Preserva a imagem fixada para não ser apagada por outra aba
      const currentStoredPinned = localStorage.getItem(PINNED_GAMEOVER_IMAGE_KEY);
      const effectivePinned = this.pinnedGameOverImageId || currentStoredPinned;
      if (effectivePinned) {
        localStorage.setItem(PINNED_GAMEOVER_IMAGE_KEY, effectivePinned);
        this.pinnedGameOverImageId = effectivePinned;
        const found = this.gameOverImages.find(x => x.id === effectivePinned);
        if (found) {
          localStorage.setItem(PINNED_GAMEOVER_IMAGE_URL_KEY, found.url);
        }
      }

      if (this.currentUser) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    } catch {
      // ignore
    }
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // Auth getters & actions
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  setCurrentUser(user: User | null) {
    this.currentUser = user;
    this.saveState();
  }

  loginWithRole(role: UserRole): User {
    let user = this.users.find(u => u.role === role && u.status === 'Ativo');
    if (!user) {
      user = this.users[0];
    }
    this.currentUser = user;
    this.saveState();
    return user;
  }

  loginAsGuest(customNickname?: string): User {
    const nick = customNickname && customNickname.trim() ? customNickname.trim() : generateRandomNickname();
    const guestUser: User = {
      id: `usr-guest-${Date.now()}`,
      nickname: nick,
      email: `${nick.toLowerCase()}@viralata.guest`,
      role: 'player',
      ossoCoins: 150, // initial welcome gift
      skinEquipadaId: 'skin-tradicional',
      status: 'Ativo',
      criadoEm: new Date().toISOString(),
      ultimoAcesso: new Date().toISOString(),
      isGuest: true,
      stats: {
        maiorPontuacao: 0,
        motoqueirosMordidos: 0,
        chinelosDesviados: 0,
        distanciaKm: 0,
        conquistasDesbloqueadas: 0,
        totalConquistas: 15,
        statusQuebrada: 'Filhote de Calçada',
      },
      inventarioSkinIds: ['skin-tradicional'],
    };

    this.users.unshift(guestUser);
    this.currentUser = guestUser;
    this.metrics.novosCadastrosHoje += 1;
    this.metrics.jogadoresAtivos += 1;
    this.saveState();
    return guestUser;
  }

  registerUser(nickname: string, email: string): { success: boolean; user?: User; error?: string } {
    const cleanNick = nickname.trim();
    if (!cleanNick) return { success: false, error: 'Nickname obrigatório!' };

    const exists = this.users.find(u => u.nickname.toLowerCase() === cleanNick.toLowerCase());
    if (exists) return { success: false, error: 'Este Nickname já está em uso na quebrada!' };

    const newUser: User = {
      id: `usr-player-${Date.now()}`,
      nickname: cleanNick,
      email: email.trim() || `${cleanNick.toLowerCase()}@caramelomail.com`,
      role: 'player',
      ossoCoins: 250,
      skinEquipadaId: 'skin-tradicional',
      status: 'Ativo',
      criadoEm: new Date().toISOString(),
      ultimoAcesso: new Date().toISOString(),
      stats: {
        maiorPontuacao: 0,
        motoqueirosMordidos: 0,
        chinelosDesviados: 0,
        distanciaKm: 0,
        conquistasDesbloqueadas: 0,
        totalConquistas: 15,
        statusQuebrada: 'Filhote de Calçada',
      },
      inventarioSkinIds: ['skin-tradicional'],
    };

    this.users.unshift(newUser);
    this.currentUser = newUser;
    this.metrics.novosCadastrosHoje += 1;
    this.metrics.jogadoresAtivos += 1;
    this.saveState();
    return { success: true, user: newUser };
  }

  logout() {
    this.currentUser = null;
    this.saveState();
  }

  // Getters
  getUsers(): User[] {
    return [...this.users];
  }

  getSkins(): Skin[] {
    return [...this.skins];
  }

  getAchievements(): Achievement[] {
    return [...this.achievements];
  }

  getAntiCheatLogs(): AntiCheatLog[] {
    return [...this.anticheatLogs];
  }

  getTransactions(): Transaction[] {
    return [...this.transactions];
  }

  getMetrics(): DailyMetrics {
    return { ...this.metrics };
  }

  getLeaderboard(): User[] {
    return [...this.users]
      .filter(u => u.status !== 'Banido')
      .sort((a, b) => b.stats.maiorPontuacao - a.stats.maiorPontuacao);
  }

  // Admin user management actions
  updateUserRole(userId: string, newRole: UserRole) {
    this.users = this.users.map(u => {
      if (u.id === userId) {
        return { ...u, role: newRole };
      }
      return u;
    });
    if (this.currentUser?.id === userId) {
      this.currentUser.role = newRole;
    }
    this.saveState();
  }

  updateUserStatus(userId: string, newStatus: User['status'], reason?: string) {
    this.users = this.users.map(u => {
      if (u.id === userId) {
        return { ...u, status: newStatus };
      }
      return u;
    });

    if (newStatus === 'Banido' || newStatus === 'Suspenso') {
      const target = this.users.find(u => u.id === userId);
      if (target) {
        this.anticheatLogs.unshift({
          id: `anticheat-${Date.now()}`,
          playerId: target.id,
          nickname: target.nickname,
          scoreObtido: target.stats.maiorPontuacao,
          duracaoSegundos: 30,
          motoboysMordidos: target.stats.motoqueirosMordidos,
          motivoSuspeita: reason || 'Bloqueio administrativo direto via Painel Root.',
          status: newStatus === 'Banido' ? 'Banido' : 'Suspeito',
          dataRegistro: new Date().toISOString(),
          ip: target.ipOrigem || '127.0.0.1',
        });
      }
    }

    if (this.currentUser?.id === userId) {
      this.currentUser.status = newStatus;
    }
    this.saveState();
  }

  adjustUserCoins(userId: string, amount: number) {
    this.users = this.users.map(u => {
      if (u.id === userId) {
        if (isInfiniteMoneyUser(u)) {
          return {
            ...u,
            hasInfiniteCoins: true,
            ossoCoins: 999999999,
            notas10: 999999,
            notas50: 999999,
            notas100: 999999,
            notas200: 999999,
          };
        }
        const next = Math.max(0, u.ossoCoins + amount);
        return { ...u, ossoCoins: next };
      }
      return u;
    });
    if (this.currentUser?.id === userId) {
      if (isInfiniteMoneyUser(this.currentUser)) {
        this.currentUser.hasInfiniteCoins = true;
        this.currentUser.ossoCoins = 999999999;
        this.currentUser.notas10 = 999999;
        this.currentUser.notas50 = 999999;
        this.currentUser.notas100 = 999999;
        this.currentUser.notas200 = 999999;
      } else {
        this.currentUser.ossoCoins = Math.max(0, this.currentUser.ossoCoins + amount);
      }
    }
    this.saveState();
  }

  // ⚡ Alterna Dinheiro Infinito para qualquer usuário no modo ADM
  toggleInfiniteCoins(userId: string): boolean {
    let newState = true;
    this.users = this.users.map(u => {
      if (u.id === userId) {
        newState = !u.hasInfiniteCoins;
        return {
          ...u,
          hasInfiniteCoins: newState,
          ossoCoins: newState ? 999999999 : 50000,
          notas10: newState ? 999999 : (u.notas10 ?? 0),
          notas50: newState ? 999999 : (u.notas50 ?? 0),
          notas100: newState ? 999999 : (u.notas100 ?? 0),
          notas200: newState ? 999999 : (u.notas200 ?? 0),
        };
      }
      return u;
    });
    if (this.currentUser?.id === userId) {
      const found = this.users.find(u => u.id === userId);
      if (found) this.currentUser = { ...found };
    }
    this.saveState();
    return newState;
  }

  // Permite logar direto em qualquer conta (ex: Valdir, Kelvin, Gui)
  loginAsUser(userId: string): User | null {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      this.currentUser = { ...user };
      this.saveState();
      return this.currentUser;
    }
    return null;
  }

  // 💵 Ajuste detalhado das notas de 10, 50 e 100
  adjustUserBanknotes(userId: string, n10: number, n50: number, n100: number) {
    this.users = this.users.map(u => {
      if (u.id === userId) {
        if (isInfiniteMoneyUser(u)) {
          return {
            ...u,
            hasInfiniteCoins: true,
            notas10: 999999,
            notas50: 999999,
            notas100: 999999,
            notas200: 999999,
            ossoCoins: 999999999,
          };
        }
        const cur10 = typeof u.notas10 === 'number' ? u.notas10 : Math.floor(u.ossoCoins / 10);
        const cur50 = typeof u.notas50 === 'number' ? u.notas50 : 0;
        const cur100 = typeof u.notas100 === 'number' ? u.notas100 : 0;
        const next10 = Math.max(0, cur10 + n10);
        const next50 = Math.max(0, cur50 + n50);
        const next100 = Math.max(0, cur100 + n100);
        const totalCoins = next10 * 10 + next50 * 50 + next100 * 100;
        return {
          ...u,
          notas10: next10,
          notas50: next50,
          notas100: next100,
          ossoCoins: totalCoins,
        };
      }
      return u;
    });

    if (this.currentUser?.id === userId) {
      if (isInfiniteMoneyUser(this.currentUser)) {
        this.currentUser.hasInfiniteCoins = true;
        this.currentUser.notas10 = 999999;
        this.currentUser.notas50 = 999999;
        this.currentUser.notas100 = 999999;
        this.currentUser.notas200 = 999999;
        this.currentUser.ossoCoins = 999999999;
      } else {
        const cur10 = typeof this.currentUser.notas10 === 'number' ? this.currentUser.notas10 : Math.floor(this.currentUser.ossoCoins / 10);
        const cur50 = typeof this.currentUser.notas50 === 'number' ? this.currentUser.notas50 : 0;
        const cur100 = typeof this.currentUser.notas100 === 'number' ? this.currentUser.notas100 : 0;
        this.currentUser.notas10 = Math.max(0, cur10 + n10);
        this.currentUser.notas50 = Math.max(0, cur50 + n50);
        this.currentUser.notas100 = Math.max(0, cur100 + n100);
        this.currentUser.ossoCoins = this.currentUser.notas10 * 10 + this.currentUser.notas50 * 50 + this.currentUser.notas100 * 100;
      }
    }
    this.saveState();
  }

  // 🖼️ Salvar foto de perfil do usuário
  setUserProfilePhoto(userId: string, photoUrl: string) {
    this.users = this.users.map(u => {
      if (u.id === userId) {
        return { ...u, profilePhotoUrl: photoUrl, avatarUrl: photoUrl };
      }
      return u;
    });
    if (this.currentUser?.id === userId) {
      this.currentUser.profilePhotoUrl = photoUrl;
      this.currentUser.avatarUrl = photoUrl;
    }
    this.saveState();

    const targetUser = this.users.find(u => u.id === userId);
    if (targetUser && !targetUser.isGuest) {
      apiService.updateProfilePhoto(userId, photoUrl).catch(() => {});
    }
  }

  // LiveOps Skin management
  updateSkin(updated: Skin) {
    this.skins = this.skins.map(s => (s.id === updated.id ? updated : s));
    this.saveState();
  }

  addSkin(newSkin: Skin) {
    this.skins.push(newSkin);
    this.saveState();
  }

  // Player Inventory Actions
  equipSkin(skinId: string): boolean {
    if (!this.currentUser) return false;
    if (!this.currentUser.inventarioSkinIds.includes(skinId)) return false;

    this.currentUser.skinEquipadaId = skinId;
    this.users = this.users.map(u => (u.id === this.currentUser!.id ? { ...u, skinEquipadaId: skinId } : u));
    this.saveState();

    if (!this.currentUser.isGuest) {
      apiService.equipSkin(this.currentUser.id, skinId).catch(() => {});
    }

    return true;
  }

  buySkin(skinId: string): { success: boolean; error?: string } {
    if (!this.currentUser) return { success: false, error: 'Faça login para comprar!' };
    const skin = this.skins.find(s => s.id === skinId);
    if (!skin) return { success: false, error: 'Skin não encontrada!' };

    if (this.currentUser.inventarioSkinIds.includes(skinId)) {
      return { success: false, error: 'Você já possui esta skin!' };
    }

    // Check coins / banknotes
    if (!skin.isRealMoneyOnly) {
      // 💵 Determina moeda necessária:
      // - Skins Comuns: Notas de 10
      // - Skins Intermediárias / Raras: Notas de 50
      // - Skins Lendárias / Míticas: Notas de 100
      const n10Cost = skin.precoNotas10 ?? (skin.tipo === 'Comum' ? Math.max(10, Math.floor(skin.precoMoedas / 10)) : 0);
      const n50Cost = skin.precoNotas50 ?? (skin.tipo === 'Rara' || skin.tipo === 'Especial' ? Math.max(5, Math.floor(skin.precoMoedas / 50)) : 0);
      const n100Cost = skin.precoNotas100 ?? (skin.tipo === 'Lendária' || skin.tipo === 'Mítica' ? Math.max(1, Math.floor(skin.precoMoedas / 1000)) : 0);

      const userN10 = this.currentUser.notas10 ?? 0;
      const userN50 = this.currentUser.notas50 ?? 0;
      const userN100 = this.currentUser.notas100 ?? 0;

      if (n100Cost > 0) {
        if (userN100 < n100Cost) {
          return { success: false, error: `Notas de R$ 100 insuficientes! Necessário ${n100Cost} notas de R$ 100 (você tem ${userN100}).` };
        }
        this.currentUser.notas100 = userN100 - n100Cost;
      } else if (n50Cost > 0) {
        if (userN50 < n50Cost) {
          return { success: false, error: `Notas de R$ 50 insuficientes! Necessário ${n50Cost} notas de R$ 50 (você tem ${userN50}).` };
        }
        this.currentUser.notas50 = userN50 - n50Cost;
      } else if (n10Cost > 0) {
        if (userN10 < n10Cost) {
          return { success: false, error: `Notas de R$ 10 insuficientes! Necessário ${n10Cost} notas de R$ 10 (você tem ${userN10}).` };
        }
        this.currentUser.notas10 = userN10 - n10Cost;
      } else {
        let finalPrice = skin.precoMoedas;
        if (skin.emPromocao && skin.descontoPercentual) {
          finalPrice = Math.round(skin.precoMoedas * (1 - skin.descontoPercentual / 100));
        }

        if (this.currentUser.ossoCoins < finalPrice) {
          return { success: false, error: `Saldo insuficiente! Necessário ${finalPrice} moedas.` };
        }
        this.currentUser.ossoCoins -= finalPrice;
      }

      this.currentUser.inventarioSkinIds.push(skinId);
      this.currentUser.skinEquipadaId = skinId;

      this.transactions.unshift({
        id: `tx-${Date.now()}`,
        playerId: this.currentUser.id,
        nickname: this.currentUser.nickname,
        itemComprado: `Skin: ${skin.nome}`,
        tipoItem: 'SKIN',
        valorBrl: 0,
        valorOssoCoins: skin.precoMoedas,
        metodo: 'OSSOCOINS',
        status: 'Aprovado',
        dataHora: new Date().toISOString(),
      });
    } else {
      // Real money purchase simulated
      this.currentUser.inventarioSkinIds.push(skinId);
      this.currentUser.skinEquipadaId = skinId;

      this.transactions.unshift({
        id: `tx-${Date.now()}`,
        playerId: this.currentUser.id,
        nickname: this.currentUser.nickname,
        itemComprado: `Skin Lendária: ${skin.nome}`,
        tipoItem: 'SKIN',
        valorBrl: skin.precoReais,
        metodo: 'PIX',
        status: 'Aprovado',
        dataHora: new Date().toISOString(),
      });

      this.metrics.receitaDoDiaBrl += skin.precoReais;
    }

    this.users = this.users.map(u => (u.id === this.currentUser!.id ? this.currentUser! : u));
    this.saveState();

    if (!this.currentUser.isGuest) {
      apiService.buySkin(this.currentUser.id, skinId).catch(() => {});
    }

    return { success: true };
  }

  // Gameplay score submission with anti-cheat validation
  submitGameScore(
    score: number,
    motoboys: number,
    chinelos: number,
    duracaoSegundos: number,
    notesEarned?: { n10: number; n50: number; n100: number; n200?: number }
  ): { antiCheatFlagged: boolean; newHighScore: boolean; coinsEarned: number } {
    if (!this.currentUser) {
      return { antiCheatFlagged: false, newHighScore: false, coinsEarned: 0 };
    }

    let antiCheatFlagged = false;
    // Anti-cheat verification: max possible pts per second is ~2,500
    const pointsPerSec = duracaoSegundos > 0 ? score / duracaoSegundos : score;
    if (pointsPerSec > 2500 || score > 500000 && duracaoSegundos < 60) {
      antiCheatFlagged = true;
      this.anticheatLogs.unshift({
        id: `anticheat-${Date.now()}`,
        playerId: this.currentUser.id,
        nickname: this.currentUser.nickname,
        scoreObtido: score,
        duracaoSegundos,
        motoboysMordidos: motoboys,
        motivoSuspeita: `Velocidade de ganho de pontos abusiva: ${Math.round(pointsPerSec)} pts/s.`,
        status: 'Suspeito',
        dataRegistro: new Date().toISOString(),
        ip: this.currentUser.ipOrigem || '189.44.120.9',
      });
      this.metrics.suspeitosDetectados += 1;
    }

    // Calcula valor total e notas coletadas (10, 50, 100 e 200)
    const add10 = notesEarned ? notesEarned.n10 : Math.floor(score / 50);
    const add50 = notesEarned ? notesEarned.n50 : 0;
    const add100 = notesEarned ? notesEarned.n100 : 0;
    const add200 = notesEarned?.n200 ?? 0;
    const totalAdded = add10 * 10 + add50 * 50 + add100 * 100 + add200 * 200;
    const coinsEarned = totalAdded;

    const cur10 = typeof this.currentUser.notas10 === 'number' ? this.currentUser.notas10 : Math.floor(this.currentUser.ossoCoins / 10);
    const cur50 = typeof this.currentUser.notas50 === 'number' ? this.currentUser.notas50 : 0;
    const cur100 = typeof this.currentUser.notas100 === 'number' ? this.currentUser.notas100 : 0;
    const cur200 = typeof this.currentUser.notas200 === 'number' ? this.currentUser.notas200 : 0;

    this.currentUser.notas10 = cur10 + add10;
    this.currentUser.notas50 = cur50 + add50;
    this.currentUser.notas100 = cur100 + add100;
    this.currentUser.notas200 = cur200 + add200;
    this.currentUser.ossoCoins =
      this.currentUser.notas10 * 10 +
      this.currentUser.notas50 * 50 +
      this.currentUser.notas100 * 100 +
      this.currentUser.notas200 * 200;

    this.currentUser.stats.motoqueirosMordidos += motoboys;
    this.currentUser.stats.chinelosDesviados += chinelos;
    this.currentUser.stats.distanciaKm += parseFloat((duracaoSegundos * 0.05).toFixed(1));

    let newHighScore = false;
    if (!antiCheatFlagged && score > this.currentUser.stats.maiorPontuacao) {
      this.currentUser.stats.maiorPontuacao = score;
      newHighScore = true;
    }

    // Update quebrada status
    if (this.currentUser.stats.maiorPontuacao > 150000) {
      this.currentUser.stats.statusQuebrada = 'Lendário Alfa da Quebrada';
    } else if (this.currentUser.stats.maiorPontuacao > 80000) {
      this.currentUser.stats.statusQuebrada = 'Terror dos Motoboys';
    } else if (this.currentUser.stats.maiorPontuacao > 30000) {
      this.currentUser.stats.statusQuebrada = 'Cão de Guarda Alerta';
    } else if (this.currentUser.stats.maiorPontuacao > 10000) {
      this.currentUser.stats.statusQuebrada = 'Vira-Lata Esguio';
    }

    this.metrics.totalPartidasHoje += 1;
    this.metrics.ossoCoinsCirculando += coinsEarned;

    this.users = this.users.map(u => (u.id === this.currentUser!.id ? this.currentUser! : u));
    this.saveState();

    // Sincronização em background com o Banco de Dados se não for guest
    if (!this.currentUser.isGuest) {
      apiService.submitScore({
        userId: this.currentUser.id,
        score,
        motoboys,
        chinelos,
        duracaoSegundos
      }).catch(() => {});
    }

    return { antiCheatFlagged, newHighScore, coinsEarned };
  }

  // Game Over Images Management
  getGameOverImages(): GameOverImage[] {
    return [...this.gameOverImages];
  }

  addGameOverImage(image: { url: string; title?: string }): GameOverImage {
    const newImg: GameOverImage = {
      id: `go-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      url: image.url,
      title: image.title && image.title.trim() ? image.title.trim() : `Foto #${this.gameOverImages.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    this.gameOverImages.unshift(newImg);
    this.saveState();
    // Sincroniza com servidor para que apareça no celular de todos os jogadores (global)
    apiService.addGameOverImage({ url: newImg.url, title: newImg.title }).then((serverImg) => {
      if (serverImg && serverImg.id && serverImg.id !== newImg.id) {
        // Substitui ID local pelo ID do servidor para manter consistência
        const idx = this.gameOverImages.findIndex(x => x.id === newImg.id);
        if (idx >= 0) {
          this.gameOverImages[idx].id = serverImg.id;
          this.saveState();
        }
      }
      // Força re-sync completo
      setTimeout(() => this.syncGameOverImagesFromServer(), 500);
    }).catch(() => {});
    return newImg;
  }

  deleteGameOverImage(id: string): boolean {
    const prevCount = this.gameOverImages.length;
    this.gameOverImages = this.gameOverImages.filter(img => img.id !== id);
    if (this.pinnedGameOverImageId === id) {
      this.pinnedGameOverImageId = null;
    }
    if (this.gameOverImages.length !== prevCount) {
      this.saveState();
      apiService.deleteGameOverImage(id).then(() => setTimeout(() => this.syncGameOverImagesFromServer(), 500)).catch(() => {});
      return true;
    }
    return false;
  }

  getPinnedGameOverImageId(): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(PINNED_GAMEOVER_IMAGE_KEY);
        if (stored) {
          this.pinnedGameOverImageId = stored;
          return stored;
        }
      }
    } catch {}
    return this.pinnedGameOverImageId;
  }

  getPinnedGameOverImageUrl(): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const directUrl = window.localStorage.getItem(PINNED_GAMEOVER_IMAGE_URL_KEY);
        if (directUrl) return directUrl;
        const pinnedId = window.localStorage.getItem(PINNED_GAMEOVER_IMAGE_KEY) || this.pinnedGameOverImageId;
        if (pinnedId) {
          const imgs = this.getGameOverImages();
          const found = imgs.find(x => x.id === pinnedId);
          if (found) return found.url;
        }
      }
    } catch {}
    return null;
  }

  setPinnedGameOverImageId(id: string | null): void {
    this.pinnedGameOverImageId = id;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (id) {
          window.localStorage.setItem(PINNED_GAMEOVER_IMAGE_KEY, id);
          const found = this.gameOverImages.find(x => x.id === id);
          if (found) {
            window.localStorage.setItem(PINNED_GAMEOVER_IMAGE_URL_KEY, found.url);
          }
        } else {
          window.localStorage.removeItem(PINNED_GAMEOVER_IMAGE_KEY);
          window.localStorage.removeItem(PINNED_GAMEOVER_IMAGE_URL_KEY);
        }
      }
    } catch {}
    this.saveState();
    apiService.setPinnedGameOverImage(id).then(() => setTimeout(() => this.syncGameOverImagesFromServer(), 500)).catch(() => {});
  }

  resetGameOverImages(): void {
    this.gameOverImages = [...INITIAL_GAMEOVER_IMAGES];
    this.pinnedGameOverImageId = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(PINNED_GAMEOVER_IMAGE_KEY);
        window.localStorage.removeItem(PINNED_GAMEOVER_IMAGE_URL_KEY);
      }
    } catch {}
    this.saveState();
    apiService.resetGameOverImages().then(() => setTimeout(() => this.syncGameOverImagesFromServer(), 500)).catch(() => {});
  }

  // Reset to initial seed
  resetAllData() {
    this.users = INITIAL_USERS;
    this.skins = INITIAL_SKINS;
    this.achievements = INITIAL_ACHIEVEMENTS;
    this.anticheatLogs = INITIAL_ANTI_CHEAT_LOGS;
    this.transactions = INITIAL_TRANSACTIONS;
    this.metrics = INITIAL_DAILY_METRICS;
    this.gameOverImages = [...INITIAL_GAMEOVER_IMAGES];
    this.pinnedGameOverImageId = null;
    this.currentUser = INITIAL_USERS[2];
    this.saveState();
  }
}

export const storage = new StorageService();
