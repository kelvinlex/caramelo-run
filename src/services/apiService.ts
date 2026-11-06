import { User, Skin } from '../types';

/**
 * ============================================================================
 * API SERVICE — Integração Resiliente Frontend <-> Backend com Banco de Dados
 * ============================================================================
 * Suporta modo híbrido (Online com Banco de Dados / Offline com LocalStorage)
 * ============================================================================
 */

export function getApiBaseUrl(): string {
  // Em dev com Vite ou rodando no Express localhost, usar proxy relativo /api
  // evita Mixed Content (https frontend -> http backend) e funciona no celular via IP
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.') || window.location.protocol === 'https:';
    if (isLocal) {
      return '/api';
    }
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.origin}/api`;
    }
  }
  return (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
}

export const API_BASE_URL = getApiBaseUrl();

export interface ServerHealthStatus {
  isOnline: boolean;
  database: 'connected' | 'disconnected' | 'unknown';
  userCount?: number;
  skinCount?: number;
  error?: string;
}

class ApiService {
  private isServerAvailable = false;
  private lastHealthCheck = 0;
  private cachedHealth: ServerHealthStatus = {
    isOnline: false,
    database: 'unknown'
  };

  /**
   * Checa se o backend e o banco de dados estão acessíveis
   */
  async checkHealth(force = false): Promise<ServerHealthStatus> {
    const now = Date.now();
    if (!force && now - this.lastHealthCheck < 15000) {
      return this.cachedHealth;
    }
    this.lastHealthCheck = now;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${API_BASE_URL}/status`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        this.isServerAvailable = true;
        this.cachedHealth = {
          isOnline: true,
          database: data.database || 'connected',
          userCount: data.userCount,
          skinCount: data.skinCount
        };
        return this.cachedHealth;
      }
    } catch (e: any) {
      // Servidor offline ou inacessível
    }

    this.isServerAvailable = false;
    this.cachedHealth = {
      isOnline: false,
      database: 'disconnected',
      error: 'Servidor backend offline'
    };
    return this.cachedHealth;
  }

  isOnline(): boolean {
    return this.isServerAvailable;
  }

  /**
   * Login de jogador no banco de dados
   */
  async login(nickname?: string, email?: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, email })
      });

      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error || 'Erro no login' };
      }

      const dbUser = await res.json();
      return { success: true, user: this.formatDbUser(dbUser) };
    } catch (error) {
      return { success: false, error: 'Servidor de banco de dados offline' };
    }
  }

  /**
   * Cadastro de jogador no banco de dados
   */
  async register(nickname: string, email?: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, email })
      });

      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error || 'Erro no registro' };
      }

      const dbUser = await res.json();
      return { success: true, user: this.formatDbUser(dbUser) };
    } catch (error) {
      return { success: false, error: 'Servidor de banco de dados offline' };
    }
  }

  /**
   * Envia o score da partida para salvar no banco com anti-cheat
   */
  async submitScore(data: {
    userId: string;
    score: number;
    motoboys: number;
    chinelos: number;
    duracaoSegundos: number;
  }): Promise<{ success: boolean; user?: User; antiCheatFlagged?: boolean; coinsEarned?: number; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/game/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) return { success: false, error: 'Erro ao salvar score no banco' };

      const resData = await res.json();
      return {
        success: true,
        antiCheatFlagged: resData.antiCheatFlagged,
        coinsEarned: resData.coinsEarned,
        user: resData.user ? this.formatDbUser(resData.user) : undefined
      };
    } catch (error) {
      return { success: false, error: 'Servidor offline' };
    }
  }

  /**
   * Compra de skin gravada no banco de dados
   */
  async buySkin(userId: string, skinId: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/shop/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, skinId })
      });

      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error || 'Erro ao comprar' };
      }

      const data = await res.json();
      return { success: true, user: this.formatDbUser(data.user) };
    } catch (error) {
      return { success: false, error: 'Servidor offline' };
    }
  }

  /**
   * Equipa uma skin no banco de dados
   */
  async equipSkin(userId: string, skinId: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/shop/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, skinId })
      });

      if (!res.ok) return { success: false, error: 'Erro ao equipar skin' };

      const data = await res.json();
      return { success: true, user: this.formatDbUser(data.user) };
    } catch (error) {
      return { success: false, error: 'Servidor offline' };
    }
  }

  /**
   * Busca leaderboard em tempo real do banco de dados
   */
  async getLeaderboard(): Promise<User[] | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/leaderboard`);
      if (!res.ok) return null;
      const list = await res.json();
      return list.map((u: any) => this.formatDbUser(u));
    } catch {
      return null;
    }
  }

  /**
   * Sincroniza dados do jogador logado com o banco
   */
  async syncUser(userId: string): Promise<User | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/user/sync/${userId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return this.formatDbUser(data);
    } catch {
      return null;
    }
  }

  /**
   * Gerar cobrança PIX no Asaas
   */
  async generateAsaasPix(data: {
    userId: string;
    amount: number;
    description: string;
    tipoItem: string;
    itemId?: string;
    cpfCnpj?: string;
  }): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/payments/asaas/pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (error) {
      return { error: 'Erro de conexão com o servidor' };
    }
  }

  /**
   * Checar status de cobrança PIX no Asaas
   */
  async checkAsaasPixStatus(paymentId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/payments/asaas/status/${paymentId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // ==========================================
  // 📸 Game Over Images — API Global
  // ==========================================
  async getGameOverImages(): Promise<{ images: any[]; pinnedId: string | null } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/gameover-images`);
      if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null;
      return await res.json();
    } catch { return null; }
  }
  async addGameOverImage(data: { url: string; title?: string }): Promise<any | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/gameover-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }
  async deleteGameOverImage(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/gameover-images/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch { return false; }
  }
  async setPinnedGameOverImage(id: string | null): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/gameover-images/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      return res.ok;
    } catch { return false; }
  }
  async resetGameOverImages(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/gameover-images/reset`, { method: 'POST' });
      return res.ok;
    } catch { return false; }
  }

  /**
   /**
    * Atualiza foto de perfil do usuário no banco de dados
    */
  async updateProfilePhoto(userId: string, photoUrl: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/user/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, photoUrl })
      });
      if (!res.ok) return { success: false, error: 'Erro ao atualizar foto de perfil no banco' };
      const data = await res.json();
      return { success: true, user: this.formatDbUser(data.user) };
    } catch {
      return { success: false, error: 'Servidor offline' };
    }
  }

  /**
   * Converte modelo do Prisma/SQL para o modelo usado na UI
   */
  private formatDbUser(db: any): User {
    let inventarioSkinIds = ['skin-tradicional'];
    if (typeof db.inventarioSkins === 'string') {
      try {
        inventarioSkinIds = JSON.parse(db.inventarioSkins);
      } catch {
        inventarioSkinIds = ['skin-tradicional'];
      }
    } else if (Array.isArray(db.inventarioSkins)) {
      inventarioSkinIds = db.inventarioSkins;
    }

    const photo = db.profilePhotoUrl || db.avatarUrl || undefined;

    return {
      id: db.id,
      nickname: db.nickname,
      email: db.email,
      role: db.role || 'player',
      ossoCoins: db.ossoCoins ?? 0,
      skinEquipadaId: db.skinEquipadaId || 'skin-tradicional',
      profilePhotoUrl: photo,
      avatarUrl: photo,
      status: db.status || 'Ativo',
      criadoEm: db.criadoEm || new Date().toISOString(),
      ultimoAcesso: db.ultimoAcesso || new Date().toISOString(),
      isGuest: db.isGuest ?? false,
      ipOrigem: db.ipOrigem,
      stats: {
        maiorPontuacao: db.maiorPontuacao ?? 0,
        motoqueirosMordidos: db.motoqueirosMordidos ?? 0,
        chinelosDesviados: db.chinelosDesviados ?? 0,
        distanciaKm: db.distanciaKm ?? 0,
        conquistasDesbloqueadas: db.conquistasDesbloqueadas ?? 0,
        totalConquistas: db.totalConquistas ?? 15,
        statusQuebrada: db.statusQuebrada || 'Filhote de Calçada'
      },
      inventarioSkinIds
    };
  }
}

export const apiService = new ApiService();
