import React, { ErrorInfo, ReactNode } from 'react';

interface Vision3ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface Vision3ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class Vision3ErrorBoundary extends React.Component<Vision3ErrorBoundaryProps, Vision3ErrorBoundaryState> {
  constructor(props: Vision3ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Vision3ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    this.setState({
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rehab-page">
          <div className="rehab-page-inner">
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <h2 className="text-xl font-semibold text-slate-900">系统错误</h2>
              <p className="text-sm text-slate-500">体态评估模块出现了错误，请尝试刷新页面或联系技术支持。</p>
              {this.state.error && (
                <div className="mt-4 p-4 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600 max-w-md">
                  <p className="font-medium">错误信息：</p>
                  <p className="mt-1">{this.state.error.message}</p>
                </div>
              )}
              <button 
                className="mt-4 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => window.location.reload()}
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}