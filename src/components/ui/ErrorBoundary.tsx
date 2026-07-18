import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches unhandled rendering errors in any child component tree
 * and displays a branded recovery UI instead of crashing the entire app.
 * 
 * Features:
 * - Automatic retry for ChunkLoadError (stale code-split bundles after deploy)
 * - Branded fallback UI with phone support link
 * - Custom fallback prop for route-level overrides
 * 
 * Usage: Wrap around <Routes> or individual page components.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);

    // Auto-recover from chunk load errors (stale code-split bundles after deploy)
    if (
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module')
    ) {
      const reloadKey = 'ss-chunk-reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      // Only auto-reload once per session to avoid infinite loops
      if (!lastReload) {
        sessionStorage.setItem(reloadKey, Date.now().toString());
        window.location.reload();
        return;
      }
    }
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'var(--font-body, "Plus Jakarta Sans", sans-serif)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'rgba(45, 80, 22, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              fontSize: '1.75rem',
            }}
          >
            ⚠️
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display, "Playfair Display", serif)',
              fontSize: '1.75rem',
              color: 'var(--color-brand-primary, #2D5016)',
              marginBottom: '0.75rem',
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              color: 'var(--color-text-secondary, #4A4540)',
              maxWidth: '40ch',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            We encountered an unexpected error. Please try refreshing the page or contact us directly at{' '}
            <a href="tel:+919494323211" style={{ color: 'var(--color-brand-primary, #2D5016)', fontWeight: 600 }}>
              +91 94943 23211
            </a>.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={this.handleReset}
              className="btn-pill btn-pill-primary"
              type="button"
            >
              Try Again
            </button>
            <a
              href="/"
              className="btn-pill btn-pill-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              Go to Home Page
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
