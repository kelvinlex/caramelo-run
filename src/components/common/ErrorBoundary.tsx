import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public props: Props;
  public state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Erro capturado no componente:', error, errorInfo);
  }

  private handleReload = () => {
    if (this.props.onReset) {
      (this as any).setState({ hasError: false, error: null });
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-stone-950 text-stone-100 text-center select-none">
          <div className="max-w-md w-full p-6 sm:p-8 bg-stone-900/90 border-2 border-amber-500/50 rounded-3xl shadow-2xl backdrop-blur-md flex flex-col items-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mb-4 text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-white font-fun tracking-wide mb-2">
              {this.props.fallbackTitle || 'O Caramelo Tropeçou!'}
            </h2>

            <p className="text-stone-300 text-xs sm:text-sm mb-6 leading-relaxed">
              Opa! Aconteceu um tropeço inesperado ao carregar o jogo 3D. Clique abaixo para levantar a poeira e recomeçar o corre!
            </p>

            {this.state.error && (
              <div className="w-full p-3 mb-6 bg-black/60 rounded-xl border border-stone-800 text-left overflow-x-auto text-[11px] font-mono text-amber-300/80 max-h-24">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer font-fun"
            >
              <RotateCcw className="w-4 h-4 stroke-[3]" />
              <span>Levantar e Recomeçar</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
