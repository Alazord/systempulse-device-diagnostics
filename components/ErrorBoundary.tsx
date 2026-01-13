import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="glass-card p-8 rounded-3xl border-l-4 border-rose-500 mt-8 relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <i className="fas fa-exclamation-triangle text-8xl"></i>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-rose-400"></i>
              </span>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                AI Analysis Error
              </h2>
            </div>
            
            <p className="text-slate-200 leading-relaxed text-base font-medium mb-4">
              Something went wrong while generating the AI analysis. This might be due to a network issue, API error, or unexpected problem.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <i className="fas fa-redo text-xs"></i>
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-slate-700"
              >
                <i className="fas fa-refresh text-xs"></i>
                Reload Page
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <summary className="text-xs text-slate-400 cursor-pointer font-medium mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs text-slate-500 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

