/**
 * Error Boundary Component
 *
 * Catches React errors and displays user-friendly fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // Reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-red-950 border border-red-900 rounded p-8">
              <div className="flex items-start gap-4">
                <svg
                  className="w-8 h-8 text-red-400 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2 text-red-400">
                    Something went wrong
                  </h1>
                  <p className="text-gray-300 mb-4">
                    The application encountered an unexpected error. This has
                    been logged for investigation.
                  </p>

                  {this.state.error && (
                    <div className="bg-black rounded p-4 mb-4">
                      <div className="text-xs text-gray-400 mb-2 uppercase">
                        Error Details
                      </div>
                      <div className="text-sm text-red-400 font-mono break-all">
                        {this.state.error.toString()}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={this.handleReset}
                      className="bg-orange-400 text-black px-6 py-3 rounded font-bold hover:bg-orange-500 transition"
                    >
                      RELOAD PAGE
                    </button>
                    <a
                      href="/"
                      className="bg-gray-800 text-white px-6 py-3 rounded font-bold hover:bg-gray-700 transition"
                    >
                      GO HOME
                    </a>
                  </div>

                  {process.env.NODE_ENV === "development" &&
                    this.state.errorInfo && (
                      <details className="mt-6">
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-white">
                          Stack Trace (Development Only)
                        </summary>
                        <pre className="text-xs text-gray-500 mt-2 overflow-auto bg-black rounded p-4 max-h-64">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
