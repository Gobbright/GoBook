import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[AdminPanelError]', error, info);
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-white p-5 shadow-sm dark:border-red-900/60 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="m-0 text-lg font-extrabold">Admin page error</h1>
              <p className="m-0 mt-1 text-sm text-slate-600 dark:text-slate-300">
                This page failed to render. The full error is printed in the browser console.
              </p>
              <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 text-xs font-semibold text-red-100 whitespace-pre-wrap">
                {error?.message || String(error)}
                {info?.componentStack ? `\n${info.componentStack}` : ''}
              </pre>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border-0 bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                <RefreshCw size={16} /> Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
