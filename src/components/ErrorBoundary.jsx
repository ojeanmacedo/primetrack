import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PrimeTrack ErrorBoundary capturou um erro:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#03060D] text-[#EDF2FF] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-[#0A1426] border border-[#13233E] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            
            <h2 className="text-lg font-bold text-white tracking-tight">
              Ops! Algo deu errado ao carregar
            </h2>
            
            <p className="text-xs text-zinc-400 leading-relaxed">
              Ocorreu uma instabilidade momentânea na exibição desta tela. Clique no botão abaixo para recarregar com segurança.
            </p>

            {this.state.error && (
              <div className="p-3 bg-[#060D1A] rounded-xl border border-white/5 text-[11px] font-mono text-red-300 text-left overflow-x-auto max-h-24 select-all">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-xl bg-[#1A6DFF] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                Recarregar Página
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/dashboard';
                }}
                className="px-4 py-2 rounded-xl bg-[#070D1A] hover:bg-white/5 border border-white/10 text-zinc-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Ir para Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
