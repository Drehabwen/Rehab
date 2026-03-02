import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class Vision3ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Vision3ErrorBoundary] Caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="bg-red-50 p-4 rounded-full mb-4 border border-red-200">
            <AlertTriangle size={48} className="text-red-500" />
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            视觉分析组件遇到错误
          </h2>
          
          <p className="text-sm text-slate-600 mb-6 text-center max-w-md">
            {this.state.error?.message || '未知错误'}
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all active:scale-95"
            >
              <RefreshCw size={18} />
              重新加载
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium transition-all active:scale-95"
            >
              刷新页面
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-6 p-4 bg-slate-100 rounded-xl text-left">
              <summary className="cursor-pointer text-sm font-bold text-slate-700 mb-2">
                错误详情（开发模式）
              </summary>
              <pre className="text-xs text-slate-600 overflow-auto max-h-48 mt-2">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default Vision3ErrorBoundary;
