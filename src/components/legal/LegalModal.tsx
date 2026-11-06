import React, { useState } from 'react';
import { Shield, FileText, Cookie, X, CheckCircle, Scale, AlertTriangle, Lock, HelpCircle, Mail, Building, Award } from 'lucide-react';
import { sound } from '../../services/soundEffects';

export type LegalTab = 'terms' | 'privacy' | 'cookies';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'terms',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in zoom-in-95 font-sans">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-stone-950 border-2 border-amber-500/50 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.2)] flex flex-col overflow-hidden text-stone-100">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="p-4 sm:p-6 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-white font-fun">
                  CENTRAL JURÍDICA E DE COMPLIANCE
                </h2>
                <span className="hidden sm:inline text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  CONFORME LGPD & CDC
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                Vira-Lata Run 3D — Termos Oficiais, Privacidade e Regulamentação Brasileira
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-zinc-700"
            title="Fechar Modal Jurídico"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 pb-1 bg-zinc-950 border-b border-zinc-800/80 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('terms');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'terms'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/30 font-fun'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Termos e Condições</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('privacy');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/30 font-fun'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Política de Privacidade (LGPD)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('cookies');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cookies'
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/30 font-fun'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Cookie className="w-4 h-4" />
            <span>Política de Cookies</span>
          </button>
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 text-xs sm:text-sm text-zinc-300 space-y-6 leading-relaxed font-normal">
          
          {/* ========================================================================= */}
          {/* 📜 ABA 1: TERMOS E CONDIÇÕES DE USO */}
          {/* ========================================================================= */}
          {activeTab === 'terms' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-amber-500/10 border border-amber-500/40 p-4 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-300 uppercase">Última Atualização: 10 de Outubro de 2026</div>
                  <p className="text-xs text-zinc-300 mt-1">
                    Estes Termos de Uso regem a utilização do jogo eletrônico **Vira-Lata Run 3D (Caramelo Run)** e do site oficial. Ao jogar ou criar uma conta, você concorda integralmente com estas regras.
                  </p>
                </div>
              </div>

              {/* Seção 1 */}
              <section className="space-y-2">
                <h3 className="text-base font-black text-amber-400 uppercase tracking-tight flex items-center gap-2">
                  <span>1. ACEITAÇÃO E ELEGIBILIDADE</span>
                </h3>
                <p>
                  O jogo **Vira-Lata Run 3D** é um jogo casual eletrônico 3D sem apostas financeiras. Ao acessar o jogo, o usuário declara ter pelo menos 18 anos de idade ou estar sob a supervisão direta de um pai ou responsável legal.
                </p>
              </section>

              {/* Seção 2 */}
              <section className="space-y-2">
                <h3 className="text-base font-black text-amber-400 uppercase tracking-tight flex items-center gap-2">
                  <span>2. CLASSIFICAÇÃO INDICATIVA</span>
                </h3>
                <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500 text-stone-950 font-black text-lg flex items-center justify-center rounded-xl flex-shrink-0 font-mono">
                    10+
                  </div>
                  <div>
                    <div className="font-bold text-white uppercase text-xs">Recomendado para Maiores de 10 Anos</div>
                    <div className="text-[11px] text-zinc-400">Contém Violência Fantasiosa Leve (cão perseguindo moto e humor de rua brasileiro). Não contém apostas, jogos de azar ou conteúdo adulto.</div>
                  </div>
                </div>
              </section>

              {/* Seção 3 */}
              <section className="space-y-2">
                <h3 className="text-base font-black text-amber-400 uppercase tracking-tight flex items-center gap-2">
                  <span>3. REGRAS DE CONDUTA E SISTEMA ANTI-CHEAT</span>
                </h3>
                <p>
                  Para preservar a integridade do Ranking Brasil e a diversão da comunidade, é estritamente proibido:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>Utilizar qualquer tipo de cheat, bot, script, alteração de memória (ex: Cheat Engine) ou robôs de clique.</li>
                  <li>Explorar bugs de pontuação ou duplicar moedas virtuais.</li>
                  <li>Cadastrar apelidos (nicknames) ofensivos, racistas, homofóbicos ou discriminatórios.</li>
                </ul>
                <p className="text-red-300 font-bold mt-1">
                  ⚠️ Violações sujeitam o infrator ao banimento imediato e definitivo da conta, com remoção do histórico no placar de líderes.
                </p>
              </section>

              {/* Seção 4 */}
              <section className="space-y-2">
                <h3 className="text-base font-black text-amber-400 uppercase tracking-tight flex items-center gap-2">
                  <span>4. MOEDAS VIRTUAIS E ITENS IN-GAME (SKINS)</span>
                </h3>
                <p>
                  O jogo pode oferecer notas virtuais (R$ 10, 50, 100) e moedas virtuais (OssoCoins) para desbloqueio de skins (como Juliete, Caramelo Dourado, Motoboy Esportivo).
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li><strong>Licença Limitada:</strong> Moedas e itens virtuais não possuem valor monetário real, não geram rendimentos e não podem ser trocados ou convertidos em dinheiro real.</li>
                  <li><strong>Transferibilidade:</strong> É proibida a venda, leilão ou transferência de moedas ou skins fora dos canais oficiais da plataforma.</li>
                </ul>
              </section>

              {/* Seção 5 */}
              <section className="space-y-2">
                <h3 className="text-base font-black text-amber-400 uppercase tracking-tight flex items-center gap-2">
                  <span>5. DIREITO DE ARREPENDIMENTO (CDC ART. 49)</span>
                </h3>
                <p>
                  Em conformidade com o Código de Defesa do Consumidor, compras digitais não consumidas podem ser canceladas em até 7 (sete) dias corridos a partir da data de compra com reembolso integral, com os devidos impostos cobrados.
                </p>
              </section>

              {/* Seção 6 */}
              <section className="space-y-2">
                <h3 className="text-base font-black text-amber-400 uppercase tracking-tight flex items-center gap-2">
                  <span>6. PROPRIEDADE INTELECTUAL</span>
                </h3>
                <p>
                  Todos os direitos autorais, marcas registradas, códigos fonte, modelos 3D, arte gráfica, animações e trilhas sonoras do jogo **Vira-Lata Run 3D** são de propriedade exclusiva da Gamefy.net.br.
                </p>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 🔒 ABA 2: POLÍTICA DE PRIVACIDADE (LGPD) */}
          {/* ========================================================================= */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-emerald-500/10 border border-emerald-500/40 p-4 rounded-2xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-emerald-300 uppercase">Conformidade com a LGPD (Lei Federal nº 13.709/2018)</div>
                  <p className="text-xs text-zinc-300 mt-1">
                    Sua privacidade é nossa prioridade. Esta política detalha como tratamos seus dados pessoais com transparência e segurança.
                  </p>
                </div>
              </div>

              {/* Seção 1 */}
              <section className="space-y-2">
                <h3 className="text-base font-black text-amber-400 uppercase tracking-tight">
                  1. DADOS PESSOAIS COLETADOS
                </h3>
                <p>Coletamos o mínimo de informações necessárias para o funcionamento do jogo 3D:</p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li><strong>Dados de Identificação:</strong> Apelido (nickname), e-mail (caso opte por criar conta) e foto de perfil selecionada.</li>
                  <li><strong>Dados de Gameplay:</strong> Maior pontuação, estatísticas de corrida, histórico de moedas virtuais coletadas e conquistas.</li>
                  <li><strong>Dados Técnicos & Telemetria:</strong> Endereço IP (para anti-cheat), tipo de dispositivo, navegador, resolução de tela e preferências de taxa de quadros (FPS).</li>
                </ul>
              </section>

              {/* Seção 2 */}
              <section className="space-y-2">
                <h3 className="text-base font-black text-amber-400 uppercase tracking-tight">
                  2. FINALIDADE DO TRATAMENTO DE DADOS
                </h3>
                <p>Seus dados são utilizados exclusivamente para:</p>
                <ol className="list-decimal pl-5 space-y-1 text-zinc-300">
                  <li>Exibir seu progresso e salvar sua colocação no Ranking Geral do jogo.</li>
                  <li>Garantir a segurança contra trapaças e acessos não autorizados.</li>
                  <li>Salvar suas preferências de gráficos, áudio e iluminação (Dia/Noite).</li>
                  <li>Prestar suporte ao cliente caso solicitado.</li>
                </ol>
              </section>

              {/* Seção 3 */}
              <section className="space-y-2">
                <h3 className="text-base font-black text-amber-400 uppercase tracking-tight">
                  3. COMPARTILHAMENTO E SEGURANÇA DOS DADOS
                </h3>
                <p>
                  <strong>Nós não vendemos nem alugamos seus dados pessoais a terceiros.</strong> O compartilhamento ocorre estritamente com infraestrutura segura de servidores e bancos de dados protegidos por criptografia SSL/TLS.
                </p>
              </section>

              {/* Seção 4 */}
              <section className="space-y-2">
                <h3 className="text-base font-black text-amber-400 uppercase tracking-tight">
                  4. DIREITOS DO TITULAR (ART. 18 DA LGPD)
                </h3>
                <p>Você tem o direito de, a qualquer momento e gratuitamente:</p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>Confirmar a existência de tratamento dos seus dados.</li>
                  <li>Acessar ou corrigir dados incompletos ou desatualizados.</li>
                  <li>Solicitar a exclusão definitiva da sua conta e de todo o seu histórico no jogo.</li>
                </ul>
                <div className="mt-2 p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">Encarregado de Dados (DPO):</span>
                  <a href="mailto:diretoria@gamefy.net.br" className="text-xs font-bold text-amber-400 hover:underline">
                    diretoria@gamefy.net.br
                  </a>
                </div>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 🍪 ABA 3: POLÍTICA DE COOKIES */}
          {/* ========================================================================= */}
          {activeTab === 'cookies' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-cyan-500/10 border border-cyan-500/40 p-4 rounded-2xl flex items-start gap-3">
                <Cookie className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-cyan-300 uppercase">Uso Transparente de Cookies</div>
                  <p className="text-xs text-zinc-300 mt-1">
                    Explicamos claramente como usamos cookies para otimizar sua experiência no navegador e no celular.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-base font-black text-amber-400 uppercase tracking-tight">
                  1. O QUE SÃO COOKIES?
                </h3>
                <p>
                  Cookies são pequenos arquivos de texto armazenados no seu navegador para guardar preferências e garantir que o jogo carregue rapidamente na sua próxima visita.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-black text-amber-400 uppercase tracking-tight">
                  2. TIPOS DE COOKIES UTILIZADOS
                </h3>

                <div className="space-y-2">
                  <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                    <div className="font-bold text-white text-xs uppercase text-emerald-400">a) Cookies Essenciais (Obrigatórios)</div>
                    <p className="text-xs text-zinc-400 mt-1">Necessários para salvar seu login, estado de pausa, preferências de gráficos (low/ultra) e moedas virtuais no navegador via LocalStorage.</p>
                  </div>

                  <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                    <div className="font-bold text-white text-xs uppercase text-cyan-400">b) Cookies Analíticos de Desempenho</div>
                    <p className="text-xs text-zinc-400 mt-1">Medem de forma anônima a taxa de FPS e tempo de carregamento de cenários 3D para otimizarmos aparelhos mais antigos.</p>
                  </div>

                  <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                    <div className="font-bold text-white text-xs uppercase text-amber-400">c) Cookies de Anunciantes / Outdoors 3D</div>
                    <p className="text-xs text-zinc-400 mt-1">Utilizados para contabilizar visualizações em outdoors do jogo para marcas parceiras, sem armazenar dados sensíveis do usuário.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-black text-amber-400 uppercase tracking-tight">
                  3. COMO GERENCIAR SEUS COOKIES
                </h3>
                <p>
                  Você pode alterar ou revogar seu consentimento a qualquer momento limpando os dados de navegação do seu browser ou através do nosso Banner de Cookies na página inicial.
                </p>
              </section>
            </div>
          )}

        </div>

        {/* RODAPÉ DO MODAL COM IDENTIFICAÇÃO CORPORATIVA */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 text-zinc-400">
            <Building className="w-4 h-4 text-amber-400" />
            <span><strong>Gamefy.net.br / Caramelo Run 3D</strong> • CNPJ: 65.653.823/0001-61</span>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black uppercase text-xs tracking-wider hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md"
          >
            Entendido & Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
