import React from 'react';
import { Shield, FileText, Cookie, Mail, MapPin, Building, Trophy, Download, Megaphone, Smartphone, HelpCircle, Heart } from 'lucide-react';
import { sound } from '../../services/soundEffects';
import { LegalTab } from '../legal/LegalModal';

interface FooterProps {
  onOpenLegalModal: (tab: LegalTab) => void;
  onOpenMarketing?: () => void;
  onOpenPWAInstall?: () => void;
  onNavigate: (view: 'home' | 'leaderboard' | 'profile' | 'admin' | 'game' | 'shop') => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenLegalModal,
  onOpenMarketing,
  onOpenPWAInstall,
  onNavigate,
}) => {
  return (
    <footer className="w-full max-w-full overflow-x-hidden bg-[#18110b] border-t-4 border-[#3b5988] text-amber-100/70 font-sans text-xs pt-8 pb-24 md:pb-8 shadow-2xl relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#5b83b8] opacity-50" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* PRIMEIRA LINHA: MARCA, SOBRE E REQUISITOS LEGAIS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-8 pb-6 border-b border-[#3b2314]">
          
          {/* COLUNA 1: LOGO E DESCRIÇÃO */}
          <div className="space-y-3 md:col-span-1">
            <div
              onClick={() => {
                sound.playClick();
                onNavigate('home');
              }}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform overflow-hidden border-2 border-amber-300">
                <img src="/logo.png" alt="Caramelo Run" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="font-black text-base text-amber-300 tracking-tight leading-none block font-fun cartoon-title-gold-3d">
                  VIRA-LATA RUN 3D
                </span>
                <span className="text-[9px] text-amber-200/80 font-black uppercase tracking-wider block mt-0.5">
                  GAMEFY BRASIL
                </span>
              </div>
            </div>
            <p className="text-[11px] text-amber-100/70 leading-relaxed">
              O maior jogo 3D de perseguição de motoqueiros do Brasil! Corra com o Caramelo, empine motos e domine o ranking da quebrada sem apostas financeiras.
            </p>
            {/* BADGE CLASSIFICAÇÃO INDICATIVA 10+ */}
            <div className="flex items-center gap-2 bg-[#25180f] p-2 rounded-xl border border-[#4a2a16]">
              <div className="w-7 h-7 bg-amber-500 text-stone-950 font-black text-xs flex items-center justify-center rounded-lg font-mono shadow">
                10+
              </div>
              <div className="text-[10px] leading-tight">
                <span className="font-bold text-amber-100 block">Classificação Indicativa 10 Anos</span>
                <span className="text-amber-200/60">Violência Fantasiosa Leve • Sem Apostas</span>
              </div>
            </div>
          </div>

          {/* COLUNA 2: NAVEGAÇÃO & JOGO */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-white uppercase tracking-wider font-fun">Navegação Rápida</h4>
            <ul className="space-y-1.5 text-zinc-400">
              <li>
                <button onClick={() => { sound.playClick(); onNavigate('game'); }} className="hover:text-amber-400 transition-colors cursor-pointer">
                  🎮 Jogar Agora 3D
                </button>
              </li>
              <li>
                <button onClick={() => { sound.playClick(); onNavigate('shop'); }} className="hover:text-amber-400 transition-colors cursor-pointer">
                  🛒 Loja de Skins (Juliete & Motos)
                </button>
              </li>
              <li>
                <button onClick={() => { sound.playClick(); onNavigate('leaderboard'); }} className="hover:text-amber-400 transition-colors cursor-pointer">
                  🏆 Ranking dos Melhores da Quebrada
                </button>
              </li>
              {onOpenMarketing && (
                <li>
                  <button onClick={() => { sound.playClick(); onOpenMarketing(); }} className="text-purple-400 hover:text-purple-300 font-bold transition-colors cursor-pointer flex items-center gap-1">
                    <Megaphone className="w-3 h-3" />
                    <span>Anunciar sua Marca no Jogo 3D</span>
                  </button>
                </li>
              )}
              {onOpenPWAInstall && (
                <li>
                  <button onClick={() => { sound.playClick(); onOpenPWAInstall(); }} className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    <span>Instalar App PWA no Celular / PC</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* COLUNA 3: DOCUMENTOS JURÍDICOS & LGPD */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-white uppercase tracking-wider font-fun">Conformidade & Leis (LGPD)</h4>
            <ul className="space-y-1.5 text-zinc-400">
              <li>
                <button onClick={() => { sound.playClick(); onOpenLegalModal('privacy'); }} className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Política de Privacidade (LGPD)</span>
                </button>
              </li>
              <li>
                <button onClick={() => { sound.playClick(); onOpenLegalModal('terms'); }} className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Termos e Condições de Uso</span>
                </button>
              </li>
              <li>
                <button onClick={() => { sound.playClick(); onOpenLegalModal('cookies'); }} className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5">
                  <Cookie className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Política de Cookies</span>
                </button>
              </li>
            </ul>
          </div>

          {/* COLUNA 4: TRANSPARÊNCIA CORPORATIVA & ATENDIMENTO */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-white uppercase tracking-wider font-fun">Identificação da Empresa</h4>
            <div className="space-y-2 text-[11px] text-zinc-400">
              <div className="flex items-start gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-200">Gamefy.net.br - Entreterimento Didigal</strong>
                  <div className="text-[10px] text-zinc-400 font-mono">CNPJ: 65.653.823/0001-61</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Registro - SP, Brasil</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <a href="mailto:diretoria@gamefy.net.br" className="hover:text-amber-300 transition-colors font-mono">
                  diretoria@gamefy.net.br
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* SEGUNDA LINHA: DIREITOS RESERVADOS E AVISO LEGAL */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-400">
          <div>
            © 2026 <strong>Vira-Lata Run 3D (Caramelo Run)</strong> — Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-1 text-zinc-400">
            <span>Desenvolvido com</span>
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            <span>para a comunidade de games brasileira.</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
