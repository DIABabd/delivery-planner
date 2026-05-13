import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <h1 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-4 max-w-sm">
          The app hit an unexpected error. Tap reload to recover — your shops and route are safe.
        </p>
        <button
          onClick={this.handleReload}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Reload
        </button>
        {this.state.error.message && (
          <p className="mt-6 text-xs text-gray-400 max-w-sm break-words">
            {this.state.error.message}
          </p>
        )}
      </div>
    );
  }
}
