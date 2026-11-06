import React from 'react';
import { Instagram, Globe, Gamepad2, X } from 'lucide-react';

interface IntroCinematicProps {
  onComplete: () => void;
}

export const IntroCinematic: React.FC<IntroCinematicProps> = ({ onComplete }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none overflow-y-auto animate-fade-in"
      onClick={onComplete}
    >
      {/* Luzes estáticas de fundo - Gradientes radiais limpos */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-600/20 via-slate-950 to-black pointer-events-none" />
      <div className="absolute top-10 left-10 w-80 h-80 rounded-full ambient-glow-amber pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full ambient-glow-yellow pointer-events-none" />

      {/* Modal Card Estático dos Créditos */}
      <div
        className="relative z-10 bg-slate-900/95 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl text-center backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar no Topo Direito */}
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-white/10 transition-all cursor-pointer active:scale-95 shadow-md"
          title="Fechar Créditos"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Header: Logo & Título */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative mb-3 group">
            <div className="absolute -inset-2 rounded-2xl bg-amber-400/20 blur-md pointer-events-none" />
            <img
              src="/logo.jpg"
              alt="Vira-Lata Run Logo"
              className="relative w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-2xl shadow-xl border-2 border-amber-400/50"
            />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            VIRA-LATA <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">RUN 3D</span>
          </h2>
          <p className="text-xs font-semibold text-amber-300 tracking-widest uppercase mt-0.5">
            Créditos da Equipe & Estúdio
          </p>
        </div>

        {/* Seção 1: Criadores Sem Funções */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/25 text-amber-400 font-mono text-xs uppercase tracking-wider mb-3">
            <Gamepad2 className="w-4 h-4" />
            <span>Desenvolvido pela Equipe GameFy</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 w-full">
            <div className="py-3 px-2 rounded-2xl bg-slate-950/90 border border-amber-400/30 flex items-center justify-center shadow-md">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                Kelvin
              </h3>
            </div>

            <div className="py-3 px-2 rounded-2xl bg-slate-950/90 border border-amber-400/30 flex items-center justify-center shadow-md">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                Guilherme
              </h3>
            </div>

            <div className="py-3 px-2 rounded-2xl bg-slate-950/90 border border-amber-400/30 flex items-center justify-center shadow-md">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                Valdir
              </h3>
            </div>
          </div>
        </div>

        {/* Seção 2: Estúdio & Instagram */}
        <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md">
              <Globe className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <span className="text-[9px] uppercase font-mono text-slate-400 block">Estúdio Oficial</span>
              <span className="text-xs sm:text-sm font-black text-amber-300">gamefy.net.br</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 flex items-center justify-center text-white">
              <Instagram className="w-4 h-4" />
            </div>
            <div className="text-left hidden xs:block">
              <span className="text-[9px] uppercase font-mono text-slate-400 block">Instagram</span>
              <span className="text-xs font-bold text-white">@gamefy.net.br</span>
            </div>
          </div>
        </div>

        {/* Botão OK / Fechar */}
        <button
          onClick={onComplete}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-500/30 active:scale-95 cursor-pointer border border-yellow-200"
        >
          FECHAR CRÉDITOS
        </button>
      </div>
    </div>
  );
};
