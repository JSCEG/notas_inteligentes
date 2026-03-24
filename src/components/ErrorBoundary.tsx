import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — captura errores de React en tiempo de render.
 * Envuelve <App /> en main.tsx para evitar pantallas en blanco.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Error no controlado:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 font-sans p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Algo salió mal
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              La aplicación encontró un error inesperado. Puedes intentar recargar la página.
            </p>

            {this.state.error && (
              <details className="text-left mb-6">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 mb-1">
                  Ver detalles del error
                </summary>
                <pre className="text-xs text-red-600 bg-red-50 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReload}
              className="w-full px-4 py-2.5 bg-brand-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
