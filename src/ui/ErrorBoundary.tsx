import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Keď sa niečo pokazí pri vykresľovaní, ukáže sa správa namiesto prázdnej obrazovky. Dáta v IndexedDB ostávajú. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fatal">
        <span className="brand-mark" aria-hidden="true" />
        <h1 className="display">Niečo sa pokazilo</h1>
        <p className="muted">Tvoje dáta sú v poriadku – sú uložené v prehliadači. Skús appku načítať znova.</p>
        <p className="faint small">{this.state.error.message}</p>
        <button type="button" className="btn primary" onClick={() => location.reload()}>
          Načítať znova
        </button>
      </div>
    );
  }
}
