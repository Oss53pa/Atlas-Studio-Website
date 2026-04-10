import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureError } from './errorMonitor';

interface AtlasErrorBoundaryProps {
  appId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface AtlasErrorBoundaryState {
  hasError: boolean;
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

  static getDerivedStateFromError(): AtlasErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
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
    this.setState({ hasError: false });
  };

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
