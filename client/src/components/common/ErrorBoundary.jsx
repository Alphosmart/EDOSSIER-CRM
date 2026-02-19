/* @refresh reset */
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="card max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-red-600 text-3xl">⚠</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
            <p className="text-gray-500 text-sm">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="text-left bg-gray-100 rounded p-3 text-xs text-gray-600 overflow-auto max-h-40">
                <summary className="cursor-pointer font-medium mb-1">Stack trace</summary>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="btn-primary"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="btn-secondary"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
