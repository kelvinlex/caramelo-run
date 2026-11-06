import { GoogleGenAI } from '@google/genai';

/**
 * Interface que representa o estado de cada conta no Pool de Chaves
 */
export interface KeySlot {
  id: number;
  key: string;
  maskedKey: string;
  accountLabel: string;
  status: 'available' | 'cooldown' | 'exhausted';
  cooldownUntil: number; // timestamp
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  lastUsedAt?: number;
  lastError?: string;
}

export interface KeyPoolStats {
  totalKeys: number;
  availableKeys: number;
  cooldownKeys: number;
  slots: Array<Omit<KeySlot, 'key'>>;
}

/**
 * Mascara a chave de API para exibição segura em logs e UI
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '****';
  const prefix = key.slice(0, 7);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Gerenciador e Balanceador de Carga para Múltiplas Contas do Gemini API / AI Studio
 */
export class GeminiKeyManager {
  private slots: KeySlot[] = [];
  private currentIndex = 0;
  private defaultCooldownMs = 60_000; // 60 segundos por padrão ao atingir 429

  constructor(customKeys?: string[]) {
    this.initKeys(customKeys);
  }

  /**
   * Inicializa o pool de chaves a partir de parâmetros, process.env ou import.meta.env
   */
  public initKeys(providedKeys?: string[]): void {
    const rawKeys: string[] = [];

    if (providedKeys && providedKeys.length > 0) {
      rawKeys.push(...providedKeys);
    } else {
      // 1. Tenta carregar do ambiente Node (process.env)
      const env = typeof process !== 'undefined' && process.env ? process.env : {};

      // Formato em lista única: GEMINI_API_KEYS="key1,key2,key3..."
      if (env.GEMINI_API_KEYS) {
        rawKeys.push(...env.GEMINI_API_KEYS.split(',').map(k => k.trim()));
      }

      // Formato por slots: GEMINI_KEY_1 até GEMINI_KEY_5 (ou mais)
      for (let i = 1; i <= 10; i++) {
        const key = env[`GEMINI_KEY_${i}`];
        if (key && !rawKeys.includes(key.trim())) {
          rawKeys.push(key.trim());
        }
      }

      // Chave única padrão de fallback
      if (rawKeys.length === 0 && env.GEMINI_API_KEY) {
        rawKeys.push(env.GEMINI_API_KEY.trim());
      }

      // 2. Tenta carregar do ambiente Vite frontend (import.meta.env)
      try {
        const metaEnv = (import.meta as any)?.env || {};
        if (metaEnv.VITE_GEMINI_API_KEYS) {
          rawKeys.push(...metaEnv.VITE_GEMINI_API_KEYS.split(',').map((k: string) => k.trim()));
        }
        for (let i = 1; i <= 10; i++) {
          const key = metaEnv[`VITE_GEMINI_KEY_${i}`];
          if (key && !rawKeys.includes(key.trim())) {
            rawKeys.push(key.trim());
          }
        }
        if (rawKeys.length === 0 && metaEnv.VITE_GEMINI_API_KEY) {
          rawKeys.push(metaEnv.VITE_GEMINI_API_KEY.trim());
        }
      } catch {
        // Ignora se import.meta não estiver disponível
      }
    }

    // Filtra chaves válidas e remove duplicatas vazias ou placeholders
    const validKeys = Array.from(new Set(rawKeys.filter(k => k && !k.startsWith('MY_GEMINI') && k.length > 10)));

    this.slots = validKeys.map((key, index) => ({
      id: index + 1,
      key,
      maskedKey: maskApiKey(key),
      accountLabel: `Conta AI Studio #${index + 1}`,
      status: 'available',
      cooldownUntil: 0,
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
    }));

    if (this.slots.length > 0) {
      console.log(`[GeminiKeyManager] Pool inicializado com ${this.slots.length} contas configuradas.`);
    } else {
      console.warn('[GeminiKeyManager] Nenhuma chave do Gemini configurada ainda. Preencha as chaves no .env.');
    }
  }

  /**
   * Adiciona dinamicamente uma lista de chaves ao pool
   */
  public addKeys(keys: string[]): void {
    const currentKeys = this.slots.map(s => s.key);
    keys.forEach(k => {
      const trimmed = k.trim();
      if (trimmed && !currentKeys.includes(trimmed)) {
        const newId = this.slots.length + 1;
        this.slots.push({
          id: newId,
          key: trimmed,
          maskedKey: maskApiKey(trimmed),
          accountLabel: `Conta AI Studio #${newId}`,
          status: 'available',
          cooldownUntil: 0,
          totalRequests: 0,
          successRequests: 0,
          failedRequests: 0,
        });
      }
    });
  }

  /**
   * Obtém a próxima chave disponível através de Round-Robin inteligente
   * Ignora chaves que estão em cooldown por erro 429.
   */
  public getNextSlot(): KeySlot {
    if (this.slots.length === 0) {
      throw new Error(
        'Nenhuma chave do Gemini configurada. Configure GEMINI_KEY_1 até GEMINI_KEY_5 no seu .env'
      );
    }

    const now = Date.now();

    // Atualiza status de cooldown
    for (const slot of this.slots) {
      if (slot.status === 'cooldown' && now >= slot.cooldownUntil) {
        slot.status = 'available';
        slot.cooldownUntil = 0;
      }
    }

    // Busca circular a partir do currentIndex
    const totalSlots = this.slots.length;
    for (let i = 0; i < totalSlots; i++) {
      const idx = (this.currentIndex + i) % totalSlots;
      const candidate = this.slots[idx];

      if (candidate.status === 'available') {
        this.currentIndex = (idx + 1) % totalSlots;
        candidate.totalRequests++;
        candidate.lastUsedAt = now;
        return candidate;
      }
    }

    // Se todas estiverem em cooldown, encontra a que vai liberar mais rápido
    const nearestSlot = [...this.slots].sort((a, b) => a.cooldownUntil - b.cooldownUntil)[0];
    const waitSeconds = Math.max(1, Math.ceil((nearestSlot.cooldownUntil - now) / 1000));

    console.warn(
      `[GeminiKeyManager] Todas as ${this.slots.length} contas estão em cooldown (limite 429). Próxima liberação em ${waitSeconds}s (Conta #${nearestSlot.id}).`
    );

    // Retorna a mais próxima mesmo assim para que a chamada possa aguardar ou tentar novamente
    nearestSlot.totalRequests++;
    nearestSlot.lastUsedAt = now;
    return nearestSlot;
  }

  /**
   * Marca uma chave com sucesso
   */
  public markSuccess(keyId: number): void {
    const slot = this.slots.find(s => s.id === keyId);
    if (slot) {
      slot.successRequests++;
      slot.status = 'available';
      slot.lastError = undefined;
    }
  }

  /**
   * Marca uma chave em Cooldown devido a limite de taxa (Rate Limit 429 / Quota)
   */
  public markRateLimited(keyId: number, retryAfterMs?: number, errorMessage?: string): void {
    const slot = this.slots.find(s => s.id === keyId);
    if (slot) {
      const duration = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : this.defaultCooldownMs;
      slot.status = 'cooldown';
      slot.cooldownUntil = Date.now() + duration;
      slot.failedRequests++;
      slot.lastError = errorMessage || '429 Quota Exceeded / Rate Limit';

      console.warn(
        `[GeminiKeyManager] ⚠️ [${slot.accountLabel} (${slot.maskedKey})] atingiu o limite de cota! Em cooldown por ${Math.round(duration / 1000)}s.`
      );
    }
  }

  /**
   * Verifica se o erro ocorrido é de esgotamento de cota / limite de taxa
   */
  public isRateLimitError(error: any): boolean {
    if (!error) return false;
    const msg = String(error.message || error).toUpperCase();
    const status = error.status || error.statusCode || error.response?.status;

    return (
      status === 429 ||
      status === 503 ||
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('QUOTA') ||
      msg.includes('RATE LIMIT') ||
      msg.includes('RATE_LIMIT') ||
      msg.includes('TOO MANY REQUESTS') ||
      msg.includes('OVERLOADED')
    );
  }

  /**
   * Executa uma operação com tolerância a falhas e rotação automática de contas
   */
  public async executeWithRotation<T>(
    operation: (ai: GoogleGenAI, slot: KeySlot) => Promise<T>,
    maxAttempts?: number
  ): Promise<T> {
    const totalSlots = this.slots.length;
    if (totalSlots === 0) {
      throw new Error('Nenhuma chave Gemini disponível no pool. Configure suas chaves no .env');
    }

    const attemptsLimit = Math.min(maxAttempts || totalSlots, totalSlots * 2);
    let lastError: any = null;

    for (let attempt = 1; attempt <= attemptsLimit; attempt++) {
      const slot = this.getNextSlot();
      const ai = new GoogleGenAI({ apiKey: slot.key });

      try {
        const result = await operation(ai, slot);
        this.markSuccess(slot.id);
        return result;
      } catch (err: any) {
        lastError = err;
        const isRateLimit = this.isRateLimitError(err);

        if (isRateLimit) {
          this.markRateLimited(slot.id, 60_000, err.message);
          console.log(`[GeminiKeyManager] Alternando automaticamente para a próxima conta... (Tentativa ${attempt}/${attemptsLimit})`);
        } else {
          slot.failedRequests++;
          slot.lastError = err.message;
          console.error(`[GeminiKeyManager] Erro na ${slot.accountLabel}:`, err.message);
        }

        // Se ainda restarem tentativas, continua o loop para a próxima chave
        if (attempt === attemptsLimit) {
          break;
        }
      }
    }

    throw new Error(
      `[GeminiKeyManager] Todas as ${totalSlots} contas falharam na requisição. Último erro: ${lastError?.message || lastError}`
    );
  }

  /**
   * Retorna estatísticas de todas as contas no pool
   */
  public getStats(): KeyPoolStats {
    const now = Date.now();
    let availableCount = 0;
    let cooldownCount = 0;

    const sanitizedSlots = this.slots.map(s => {
      const isCooling = s.status === 'cooldown' && now < s.cooldownUntil;
      if (isCooling) cooldownCount++;
      else availableCount++;

      return {
        id: s.id,
        maskedKey: s.maskedKey,
        accountLabel: s.accountLabel,
        status: isCooling ? ('cooldown' as const) : ('available' as const),
        cooldownUntil: s.cooldownUntil,
        totalRequests: s.totalRequests,
        successRequests: s.successRequests,
        failedRequests: s.failedRequests,
        lastUsedAt: s.lastUsedAt,
        lastError: s.lastError,
      };
    });

    return {
      totalKeys: this.slots.length,
      availableKeys: availableCount,
      cooldownKeys: cooldownCount,
      slots: sanitizedSlots,
    };
  }

  public getSlotCount(): number {
    return this.slots.length;
  }
}

// Instância singleton global para reaproveitamento no app
export const geminiKeyManager = new GeminiKeyManager();
