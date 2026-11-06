import { GoogleGenAI } from '@google/genai';
import { geminiKeyManager, KeySlot } from './geminiKeyManager';

export interface GenerateTextOptions {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatOptions {
  history: ChatMessage[];
  message: string;
  systemInstruction?: string;
  model?: string;
  temperature?: number;
}

export interface KeyTestResult {
  slotId: number;
  accountLabel: string;
  maskedKey: string;
  status: 'online' | 'rate_limited' | 'invalid_key' | 'error';
  latencyMs: number;
  responseSnippet?: string;
  error?: string;
}

export class GeminiArgonService {
  public defaultModel = 'gemini-4-argon';

  constructor(modelName?: string) {
    if (modelName) {
      this.defaultModel = modelName;
    }
  }

  /**
   * Gera texto utilizando o Gemini 4 Argon com rodízio automático de chaves
   */
  async generateText(options: GenerateTextOptions): Promise<{
    text: string;
    usedAccount: string;
    maskedKey: string;
    model: string;
  }> {
    const model = options.model || this.defaultModel;

    return await geminiKeyManager.executeWithRotation(async (ai: GoogleGenAI, slot: KeySlot) => {
      const response = await ai.models.generateContent({
        model,
        contents: options.prompt,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
        },
      });

      const text = response.text || '';
      return {
        text,
        usedAccount: slot.accountLabel,
        maskedKey: slot.maskedKey,
        model,
      };
    });
  }

  /**
   * Gera saída em JSON estruturado com tipagem TypeScript
   */
  async generateJson<T = any>(
    prompt: string,
    systemInstruction?: string,
    model?: string
  ): Promise<{ data: T; usedAccount: string }> {
    const targetModel = model || this.defaultModel;

    return await geminiKeyManager.executeWithRotation(async (ai: GoogleGenAI, slot: KeySlot) => {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: prompt,
        config: {
          systemInstruction: (systemInstruction ? systemInstruction + '\n' : '') +
            'IMPORTANTE: Responda APENAS em JSON válido, sem blocos de markdown adicionais.',
          responseMimeType: 'application/json',
        },
      });

      const raw = response.text?.trim() || '{}';
      // Limpa possíveis marcadores ```json se houver
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned) as T;

      return {
        data: parsed,
        usedAccount: slot.accountLabel,
      };
    });
  }

  /**
   * Conversa multi-turnos com histórico mantendo o contexto no Gemini 4 Argon
   */
  async chat(options: ChatOptions): Promise<{
    reply: string;
    usedAccount: string;
    history: ChatMessage[];
  }> {
    const model = options.model || this.defaultModel;

    return await geminiKeyManager.executeWithRotation(async (ai: GoogleGenAI, slot: KeySlot) => {
      const formattedContents = options.history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }));

      // Adiciona a nova mensagem do usuário
      formattedContents.push({
        role: 'user',
        parts: [{ text: options.message }],
      });

      const response = await ai.models.generateContent({
        model,
        contents: formattedContents,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature,
        },
      });

      const reply = response.text || '';
      const updatedHistory: ChatMessage[] = [
        ...options.history,
        { role: 'user', text: options.message },
        { role: 'model', text: reply },
      ];

      return {
        reply,
        usedAccount: slot.accountLabel,
        history: updatedHistory,
      };
    });
  }

  /**
   * Testa todas as 5 contas individualmente e gera relatório de saúde
   */
  async testAllKeys(testModel?: string): Promise<KeyTestResult[]> {
    const model = testModel || this.defaultModel;
    const stats = geminiKeyManager.getStats();
    const results: KeyTestResult[] = [];

    // Recupera os slots diretamente com as chaves reais
    const slots = (geminiKeyManager as any).slots as KeySlot[];

    if (!slots || slots.length === 0) {
      return [];
    }

    for (const slot of slots) {
      const start = Date.now();
      try {
        const ai = new GoogleGenAI({ apiKey: slot.key });
        const res = await ai.models.generateContent({
          model,
          contents: 'Ping de teste de API. Responda apenas com a palavra: PONG',
        });

        const latency = Date.now() - start;
        results.push({
          slotId: slot.id,
          accountLabel: slot.accountLabel,
          maskedKey: slot.maskedKey,
          status: 'online',
          latencyMs: latency,
          responseSnippet: res.text?.trim().slice(0, 30),
        });
      } catch (err: any) {
        const latency = Date.now() - start;
        const isRateLimit = geminiKeyManager.isRateLimitError(err);
        const msg = String(err.message || err);

        let status: KeyTestResult['status'] = 'error';
        if (isRateLimit) {
          status = 'rate_limited';
        } else if (msg.includes('API_KEY_INVALID') || msg.includes('403') || msg.includes('not found')) {
          status = 'invalid_key';
        }

        results.push({
          slotId: slot.id,
          accountLabel: slot.accountLabel,
          maskedKey: slot.maskedKey,
          status,
          latencyMs: latency,
          error: err.message,
        });
      }
    }

    return results;
  }

  /**
   * Retorna estatísticas de uso em tempo real do pool
   */
  getStats() {
    return geminiKeyManager.getStats();
  }
}

// Instância singleton pronta para uso
export const geminiArgonService = new GeminiArgonService();
