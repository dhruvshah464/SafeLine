import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SpanStatusCode } from '@opentelemetry/api';
import { AlertTriangle, RefreshCw, Home, Copy, Check, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { getFrontendTelemetry } from '../../telemetry/otel-frontend';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void, errorId: string) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  resetKeys?: any[];
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  showDetails: boolean;
  copied: boolean;
}

function generateErrorId(): string {
  return 'err_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || generateErrorId();
    const currentRoute = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
    const boundaryName = this.props.name || 'RouteErrorBoundary';

    this.setState({ errorInfo });

    // 1. Log to OpenTelemetry Tracing
    try {
      const telemetry = getFrontendTelemetry();
      const span = telemetry.tracer.startSpan('react.runtime_error', {
        attributes: {
          'error.id': errorId,
          'error.boundary': boundaryName,
          'error.name': error.name,
          'error.message': error.message,
          'error.stack': error.stack || '',
          'error.component_stack': errorInfo.componentStack || '',
          'route.path': currentRoute,
          'browser.url': typeof window !== 'undefined' ? window.location.href : '',
        },
      });

      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `${boundaryName}: ${error.message}`,
      });
      span.end();

      // 2. Record to OpenTelemetry Metrics
      const errorCounter = telemetry.meter.createCounter('safeline_frontend_errors_total', {
        description: 'Frontend errors caught by React Error Boundary',
      });
      errorCounter.add(1, {
        boundary: boundaryName,
        error_type: error.name,
        route: currentRoute,
      });
    } catch (otelErr) {
      console.warn('Failed to dispatch error to OpenTelemetry:', otelErr);
    }

    // 3. Dispatch structured error log to backend observability pipeline
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/telemetry/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId,
          boundary: boundaryName,
          name: error.name,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          route: currentRoute,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silently tolerate backend network transmission failure
      });
    }

    // 4. Custom callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, index) => !prevProps.resetKeys || key !== prevProps.resetKeys[index]
      );
      if (hasChanged) {
        this.resetError();
      }
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false,
      copied: false,
    });
  };

  handleCopyDiagnostic = () => {
    const diagnosticData = {
      errorId: this.state.errorId,
      name: this.state.error?.name,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      route: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString(),
    };

    navigator.clipboard.writeText(JSON.stringify(diagnosticData, null, 2)).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.resetError, this.state.errorId);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full min-h-[400px] flex items-center justify-center p-6 md:p-12">
          <div className="max-w-2xl w-full bg-white border border-red-200/80 rounded-2xl shadow-xl shadow-red-500/5 p-6 md:p-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-xl font-bold text-slate-900">
                    Application Error Encountered
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-red-50 text-red-700 border border-red-200">
                    Logged to Observability
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  An unexpected runtime error occurred on this route. The incident has been recorded with full telemetry diagnostics.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="mb-6 p-4 rounded-xl bg-slate-900 text-slate-100 text-sm font-mono border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 border-b border-slate-800 pb-2">
                <span>Incident Ref: <strong className="text-amber-400">{this.state.errorId}</strong></span>
                <span>Type: <strong className="text-red-400">{this.state.error.name}</strong></span>
              </div>
              <p className="text-red-300 font-medium break-words">
                {this.state.error.message || 'Unknown runtime error'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <button
                onClick={this.resetError}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') window.location.href = '/';
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition-colors"
              >
                <Home className="w-4 h-4" />
                Go to Overview
              </button>

              <button
                onClick={this.handleCopyDiagnostic}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors ml-auto"
                title="Copy error report to clipboard"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600">Copied Report</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Diagnostic</span>
                  </>
                )}
              </button>
            </div>

            {/* Collapsible Details */}
            <div className="border-t border-slate-200 pt-4">
              <button
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
              >
                <span>Technical Stack Trace & Diagnostics</span>
                {this.state.showDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 space-y-3">
                  {this.state.error.stack && (
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">Error Stack:</div>
                      <pre className="p-3 bg-slate-100 rounded-lg text-slate-800 text-xs overflow-x-auto max-h-48 font-mono leading-relaxed">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">Component Stack:</div>
                      <pre className="p-3 bg-slate-100 rounded-lg text-slate-800 text-xs overflow-x-auto max-h-48 font-mono leading-relaxed">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
