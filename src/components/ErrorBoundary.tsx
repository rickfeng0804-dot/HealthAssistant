import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 max-w-lg w-full">
            <h2 className="text-xl font-semibold text-red-600 mb-4">發生錯誤 (Something went wrong)</h2>
            <div className="bg-red-50 p-4 rounded-lg overflow-auto max-h-96">
              <pre className="text-sm text-red-800 whitespace-pre-wrap">
                {this.state.error?.message}
              </pre>
            </div>
            <button
              className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              onClick={() => window.location.reload()}
            >
              重新載入 (Reload)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
