import { Component } from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches runtime errors in the component tree
 * and displays a recovery UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f] text-white p-8">
          <div className="max-w-md text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-500/20 flex items-center justify-center text-2xl">
              !
            </div>
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-400 mb-4 font-mono break-all">
              {this.state.error?.message ?? "Unknown error"}
            </p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-blue-500 rounded-lg text-sm font-medium hover:opacity-90 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
