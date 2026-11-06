import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Key,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Send,
  Save,
  HelpCircle,
  ShieldCheck,
  Zap,
  Layers,
  Copy
} from 'lucide-react';
import { geminiKeyManager, KeySlot } from '../../services/geminiKeyManager';
import { geminiArgonService, KeyTestResult } from '../../services/geminiArgonService';
import { sound } from '../../services/soundEffects';

const POPULAR_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'Recomendado', desc: 'Ultra-rápido, multimodal e ideal para gameplay ao vivo' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', badge: 'Mais Rápido', desc: 'Menor latência absoluta para respostas instantâneas' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', badge: 'Alta Inteligência', desc: 'Maior capacidade de raciocínio e diálogos complexos' },
  { id: 'gemini-4-argon', name: 'Gemini 4 Argon', badge: 'Custom / Lab', desc: 'Identificador experimental para rotas customizadas' },
];

export const GeminiArgonTab: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string>(() => geminiKeyManager.getModel());
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [keySlots, setKeySlots] = useState<KeySlot[]>([]);
  const [testResults, setTestResults] = useState<KeyTestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  
  // Inputs manuais para as 5 chaves
  const [inputKeys, setInputKeys] = useState<string[]>(['', '', '', '', '']);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Playground de Teste
  const [prompt, setPrompt] = useState('Gere uma frase curta de provocação de um vira-lata caramelo fugindo do motoboy na favela.');
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [generatingAccount, setGeneratingAccount] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const loadSlots = () => {
    geminiKeyManager.initKeys();
    const raw = geminiKeyManager.getRawSlots();
    setKeySlots([...raw]);

    // Preenche os inputs se houver chaves salvas
    const currentKeys = raw.map(s => s.key);
    setInputKeys([
      currentKeys[0] || '',
      currentKeys[1] || '',
      currentKeys[2] || '',
      currentKeys[3] || '',
      currentKeys[4] || '',
    ]);
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const handleSaveKeys = () => {
    sound.playClick();
    const validKeys = inputKeys.map(k => k.trim()).filter(Boolean);
    geminiKeyManager.saveLocalKeys(validKeys);
    geminiKeyManager.setModel(selectedModel);
    loadSlots();
    setSavedSuccessMsg('Chaves e Modelo salvos com sucesso no navegador!');
    setTimeout(() => setSavedSuccessMsg(null), 4000);
  };

  const handleSelectModel = (modelId: string) => {
    sound.playClick();
    setSelectedModel(modelId);
    geminiKeyManager.setModel(modelId);
  };

  const handleSaveCustomModel = () => {
    if (!customModelInput.trim()) return;
    handleSelectModel(customModelInput.trim());
    setCustomModelInput('');
  };

  const handleRunPingTest = async () => {
    sound.playBark();
    setIsTesting(true);
    setTestResults([]);
    try {
      const results = await geminiArgonService.testAllKeys(selectedModel);
      setTestResults(results);
    } catch (e: any) {
      console.error('Erro no teste de ping:', e);
    } finally {
      setIsTesting(false);
    }
  };

  const handleGenerateSample = async () => {
    if (!prompt.trim()) return;
    sound.playClick();
    setIsGenerating(true);
    setGeneratedOutput(null);
    setGenerateError(null);
    setGeneratingAccount(null);

    try {
      const res = await geminiArgonService.generateText({
        prompt,
        model: selectedModel,
        temperature: 0.8,
      });
      setGeneratedOutput(res.text.trim());
      setGeneratingAccount(`${res.usedAccount} (${res.maskedKey})`);
    } catch (err: any) {
      setGenerateError(err.message || 'Falha ao gerar texto com o Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Banner Principal */}
      <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 border-2 border-amber-800/80 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/20 border-2 border-amber-500/50 rounded-2xl text-amber-400 shadow-inner">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-amber-300 font-fun uppercase tracking-wider">
                GEMINI ARGON AI & POOL DE CONTAS
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-amber-500/30 text-amber-200 border border-amber-400/50">
                Google GenAI
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
              Balanceador de carga com rodízio inteligente de até 5 contas para evitar limites 429 de cota,
              com suporte aos modelos de alta velocidade <strong>Gemini 2.5 Flash</strong> e <strong>Gemini 4 Argon</strong>.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunPingTest}
          disabled={isTesting || keySlots.length === 0}
          className={`px-5 py-3 rounded-xl font-fun font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-lg shrink-0 ${
            isTesting
              ? 'bg-stone-800 text-stone-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-stone-950 font-black active:scale-95'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
          <span>{isTesting ? 'Testando Conexões...' : 'Testar Conexão (Ping)'}</span>
        </button>
      </div>

      {savedSuccessMsg && (
        <div className="p-3 bg-green-950/80 border border-green-600/70 rounded-xl text-green-300 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* Grid: 1. Seleção de Model / 2. Configuração de Chaves */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: SELETOR DE MODELO */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center gap-2 text-amber-400 font-fun font-black text-sm uppercase">
                <Cpu className="w-4 h-4" />
                <span>Modelo Gemini Selecionado</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-950/70 border border-amber-800 px-2 py-0.5 rounded-lg">
                {selectedModel}
              </span>
            </div>

            <div className="space-y-2.5">
              {POPULAR_MODELS.map(m => {
                const isSelected = selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModel(m.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-stone-600'}`} />
                        <span className={`text-xs font-bold font-fun ${isSelected ? 'text-amber-300' : 'text-stone-200'}`}>
                          {m.name}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 pl-4">{m.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Input para Modelo Customizado */}
            <div className="mt-4 pt-3 border-t border-stone-800">
              <label className="block text-[11px] font-bold text-stone-300 mb-1.5">
                Ou digite um nome de modelo customizado:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  placeholder="Ex: gemini-2.5-flash ou gemini-4-argon"
                  className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  onClick={handleSaveCustomModel}
                  disabled={!customModelInput.trim()}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Definir
                </button>
              </div>
            </div>
          </div>

          {/* Dica do .env */}
          <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 text-xs text-stone-400 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>Como configurar no arquivo .env:</span>
            </div>
            <pre className="p-3 bg-stone-950 rounded-xl font-mono text-[11px] text-amber-200/90 overflow-x-auto border border-stone-800 leading-relaxed">
{`# Raiz do projeto: .env
GEMINI_KEY_1="AIzaSy..."
GEMINI_KEY_2="AIzaSy..."
GEMINI_MODEL="${selectedModel}"`}
            </pre>
            <p className="text-[11px] text-stone-400">
              Você pode colar chaves diretamente aqui na tela (salvas no navegador) ou declará-las no arquivo <code>.env</code> na raiz do projeto.
            </p>
          </div>
        </div>

        {/* Coluna Direita: SLOTS DE CHAVES & TESTES */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center gap-2 text-amber-400 font-fun font-black text-sm uppercase">
                <Key className="w-4 h-4" />
                <span>Pool de Chaves do Google AI Studio ({keySlots.length} cadastradas)</span>
              </div>
              <button
                onClick={handleSaveKeys}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-stone-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Configuração</span>
              </button>
            </div>

            {/* Lista dos 5 slots de chaves */}
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((idx) => {
                const slot = keySlots[idx];
                const test = testResults.find(t => t.slotId === idx + 1);

                return (
                  <div
                    key={idx}
                    className="p-3 bg-stone-950 border border-stone-800 rounded-xl space-y-2 hover:border-stone-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold font-fun">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="text-stone-200">Conta Google AI Studio #{idx + 1}</span>
                      </div>

                      {/* Status Tag */}
                      {test ? (
                        <div className="flex items-center gap-1.5">
                          {test.status === 'online' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-950 border border-green-600 text-green-300 font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3 text-green-400" /> ONLINE ({test.latencyMs}ms)
                            </span>
                          ) : test.status === 'rate_limited' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950 border border-amber-600 text-amber-300 font-bold text-[10px]">
                              <AlertTriangle className="w-3 h-3 text-amber-400" /> COOLDOWN (429)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950 border border-red-600 text-red-300 font-bold text-[10px]">
                              <XCircle className="w-3 h-3 text-red-400" /> INVÁLIDA / ERRO
                            </span>
                          )}
                        </div>
                      ) : slot ? (
                        <span className="text-[10px] text-stone-400 font-mono bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                          {slot.maskedKey}
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-500 italic">Vazia</span>
                      )}
                    </div>

                    {/* Input da Chave */}
                    <div className="relative">
                      <input
                        type="password"
                        value={inputKeys[idx]}
                        onChange={(e) => {
                          const updated = [...inputKeys];
                          updated[idx] = e.target.value;
                          setInputKeys(updated);
                        }}
                        placeholder={`Cole a chave AIzaSy... da Conta #${idx + 1}`}
                        className="w-full bg-stone-900 border border-stone-800 focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs text-amber-100 placeholder-stone-600 font-mono focus:outline-none"
                      />
                    </div>

                    {test?.error && (
                      <p className="text-[10px] text-red-400 font-mono pl-1">{test.error}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PLAYGROUND DE TESTE RÁPIDO DO CARAMELO */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2 text-amber-400 font-fun font-black text-sm uppercase">
                <Zap className="w-4 h-4" />
                <span>Testar Geração em Tempo Real com Rodízio</span>
              </div>
              {generatingAccount && (
                <span className="text-[10px] text-green-300 bg-green-950/70 border border-green-800 px-2 py-0.5 rounded-md font-mono">
                  Atendido por: {generatingAccount}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Digite uma instrução para testar..."
                className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleGenerateSample}
                disabled={isGenerating || keySlots.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 disabled:opacity-50 text-stone-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Gerando...' : 'Testar Prompt'}</span>
              </button>
            </div>

            {generatedOutput && (
              <div className="p-3.5 bg-stone-950 border border-amber-800/60 rounded-xl text-xs text-amber-100 font-medium leading-relaxed shadow-inner">
                <div className="text-[10px] text-amber-400 font-bold mb-1 uppercase tracking-wider">
                  Resposta do {selectedModel}:
                </div>
                "{generatedOutput}"
              </div>
            )}

            {generateError && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 font-mono">
                {generateError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
