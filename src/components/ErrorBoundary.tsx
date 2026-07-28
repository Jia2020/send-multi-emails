import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
    (this as any).setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndReload = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  render() {
    const { hasError, error } = (this as any).state || {};
    if (hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-extrabold tracking-tight">Application Render Notice</h1>
              <p className="text-xs text-slate-400">
                A temporary error occurred during page rendering. You can refresh or reset session cache below.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-left overflow-x-auto max-h-40">
                <p className="text-xs font-mono text-red-400 font-semibold">{error.toString()}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
              <button
                onClick={this.handleClearAndReload}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Reset Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
