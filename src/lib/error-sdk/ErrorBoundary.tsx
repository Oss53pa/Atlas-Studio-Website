import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureError } from './errorMonitor';

interface AtlasErrorBoundaryProps {
  appId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface AtlasErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
}

/**
 * React Error Boundary intégré à Atlas Error Monitor.
 *
 * - Capture les erreurs de rendu des enfants
 * - Envoie l'erreur en severity 'critical'
 * - Affiche un fallback UI minimaliste
 * - N'expose JAMAIS les détails techniques à l'utilisateur final
 */
export class AtlasErrorBoundary extends Component<AtlasErrorBoundaryProps, AtlasErrorBoundaryState> {
  state: AtlasErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): AtlasErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error, componentStack: errorInfo.componentStack || undefined });
    void captureError(this.props.appId, {
      message: error.message || 'React render error',
      stack: error.stack,
      component: this.extractComponentName(errorInfo.componentStack),
      context: 'AtlasErrorBoundary',
      severity: 'critical',
      metadata: {
        componentStack: errorInfo.componentStack?.slice(0, 2000),
      },
    });
  }

  private extractComponentName(componentStack: string | null | undefined): string | undefined {
    if (!componentStack) return undefined;
    // Premier nom de composant dans la stack (ex : "    in MyComponent")
    const match = componentStack.match(/\s+in\s+([A-Za-z0-9_]+)/);
    return match?.[1];
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined, componentStack: undefined });
  };

  /**
   * Show full error details when running on the admin console (always),
   * on localhost, or when ?debug=1 is set. Otherwise, the generic fallback
   * hides technical info from end users.
   */
  private shouldShowDetails(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const { pathname, hostname, search } = window.location;
      if (pathname.startsWith('/admin')) return true;
      if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
      if (new URLSearchParams(search).has('debug')) return true;
    } catch { /* noop */ }
    return false;
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback;
    }

    // Fallback par défaut : UI minimaliste, aucun détail technique
    return (
      <div
        role="alert"
        className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-500"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-neutral-text dark:text-admin-text mb-1">
          Une erreur est survenue
        </h2>
        <p className="text-sm text-neutral-muted dark:text-admin-muted mb-6 max-w-sm">
          Nos équipes ont été notifiées. Vous pouvez réessayer ou revenir à la page d'accueil.
        </p>

        {this.shouldShowDetails() && this.state.error && (
          <details
            className="mt-2 mb-6 max-w-2xl w-full text-left bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-lg p-4"
            open
          >
            <summary className="text-red-700 dark:text-red-300 text-sm font-semibold cursor-pointer mb-2">
              Détails techniques (visible aux admins)
            </summary>
            <div className="mt-3 space-y-2">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-red-600/70 dark:text-red-400/70 font-semibold mb-1">Message</div>
                <code className="block text-[12px] text-red-800 dark:text-red-200 font-mono break-words whitespace-pre-wrap">
                  {this.state.error.message || String(this.state.error)}
                </code>
              </div>
              {this.state.error.stack && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-red-600/70 dark:text-red-400/70 font-semibold mb-1">Stack</div>
                  <pre className="block text-[11px] text-red-700/90 dark:text-red-300/80 font-mono overflow-auto max-h-60 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </div>
              )}
              {this.state.componentStack && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-red-600/70 dark:text-red-400/70 font-semibold mb-1">Composant</div>
                  <pre className="block text-[11px] text-red-700/90 dark:text-red-300/80 font-mono overflow-auto max-h-40 whitespace-pre-wrap">
                    {this.state.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        <button
          type="button"
          onClick={this.handleRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold dark:bg-admin-accent text-black text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Réessayer
        </button>
      </div>
    );
  }
}
