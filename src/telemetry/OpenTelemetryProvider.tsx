import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { Span, SpanStatusCode, Tracer, Meter } from '@opentelemetry/api';
import { 
  initFrontendTelemetry, 
  getFrontendTelemetry, 
  FrontendTelemetryConfig, 
  TelemetryState 
} from './otel-frontend';

export interface OpenTelemetryContextValue {
  tracer: Tracer;
  meter: Meter;
  isInitialized: boolean;
  startSpan: (name: string, attributes?: Record<string, string | number | boolean>) => Span;
  tracePromise: <T>(
    name: string,
    operation: (span: Span) => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ) => Promise<T>;
  recordError: (error: Error | string, attributes?: Record<string, string | number | boolean>) => void;
  recordMetric: (name: string, value: number, attributes?: Record<string, string | number | boolean>) => void;
  trackInteraction: (action: string, component: string, attributes?: Record<string, string | number | boolean>) => void;
  trackPageView: (pageName: string, attributes?: Record<string, string | number | boolean>) => void;
  getFinishedSpans: () => any[];
}

const OpenTelemetryContext = createContext<OpenTelemetryContextValue | null>(null);

export interface OpenTelemetryProviderProps {
  children: React.ReactNode;
  config?: FrontendTelemetryConfig;
}

export function OpenTelemetryProvider({ children, config }: OpenTelemetryProviderProps) {
  const telemetry = useMemo(() => {
    return initFrontendTelemetry(config);
  }, [config]);

  const value: OpenTelemetryContextValue = useMemo(() => {
    const { tracer, meter, memorySpanExporter } = telemetry;

    const startSpan = (name: string, attributes?: Record<string, string | number | boolean>): Span => {
      return tracer.startSpan(name, {
        attributes: {
          'component.type': 'react',
          ...attributes,
        },
      });
    };

    const tracePromise = async <T,>(
      name: string,
      operation: (span: Span) => Promise<T>,
      attributes?: Record<string, string | number | boolean>
    ): Promise<T> => {
      const span = startSpan(name, attributes);
      try {
        const result = await operation(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err: any) {
        span.recordException(err);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err?.message || 'Error executing tracked operation',
        });
        throw err;
      } finally {
        span.end();
      }
    };

    const recordError = (
      error: Error | string,
      attributes?: Record<string, string | number | boolean>
    ): void => {
      const span = tracer.startSpan('react.error', {
        attributes: {
          'error.source': 'user_recorded',
          ...attributes,
        },
      });
      const errObj = typeof error === 'string' ? new Error(error) : error;
      span.recordException(errObj);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errObj.message,
      });
      span.end();

      const errorCounter = meter.createCounter('safeline_frontend_errors_total');
      errorCounter.add(1, {
        type: 'component_error',
        ...attributes,
      });
    };

    const recordMetric = (
      name: string,
      value: number,
      attributes?: Record<string, string | number | boolean>
    ): void => {
      const metric = meter.createHistogram(`safeline_frontend_${name}`, {
        unit: 'count',
      });
      metric.record(value, attributes);
    };

    const trackInteraction = (
      action: string,
      component: string,
      attributes?: Record<string, string | number | boolean>
    ): void => {
      const interactionCounter = meter.createCounter('safeline_frontend_user_interactions_total');
      interactionCounter.add(1, {
        action,
        component,
        ...attributes,
      });

      const span = tracer.startSpan(`ui.${action}`, {
        attributes: {
          'ui.component': component,
          'ui.action': action,
          ...attributes,
        },
      });
      span.end();
    };

    const trackPageView = (
      pageName: string,
      attributes?: Record<string, string | number | boolean>
    ): void => {
      const pageViewCounter = meter.createCounter('safeline_frontend_page_views_total');
      pageViewCounter.add(1, {
        page: pageName,
        ...attributes,
      });

      const span = tracer.startSpan('navigation.page_view', {
        attributes: {
          'navigation.page': pageName,
          ...attributes,
        },
      });
      span.end();
    };

    const getFinishedSpans = () => {
      return memorySpanExporter.getFinishedSpans();
    };

    return {
      tracer,
      meter,
      isInitialized: true,
      startSpan,
      tracePromise,
      recordError,
      recordMetric,
      trackInteraction,
      trackPageView,
      getFinishedSpans,
    };
  }, [telemetry]);

  return (
    <OpenTelemetryContext.Provider value={value}>
      <TelemetryErrorBoundary>
        {children}
      </TelemetryErrorBoundary>
    </OpenTelemetryContext.Provider>
  );
}

export interface TelemetryErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((error: Error) => React.ReactNode);
}

interface TelemetryErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class TelemetryErrorBoundary extends React.Component<
  TelemetryErrorBoundaryProps,
  TelemetryErrorBoundaryState
> {
  constructor(props: TelemetryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): TelemetryErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const telemetry = getFrontendTelemetry();
    const span = telemetry.tracer.startSpan('react.error_boundary', {
      attributes: {
        'error.component_stack': errorInfo.componentStack || '',
        'error.message': error.message,
      },
    });
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.end();

    const errorCounter = telemetry.meter.createCounter('safeline_frontend_errors_total');
    errorCounter.add(1, { type: 'react_error_boundary' });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-6 m-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-red-800 dark:text-red-300">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm font-mono">{this.state.error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 cursor-pointer"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Hook to access the OpenTelemetry context
 */
export function useOpenTelemetry(): OpenTelemetryContextValue {
  const context = useContext(OpenTelemetryContext);
  if (!context) {
    // If used outside provider, fallback to direct telemetry client
    const fallback = getFrontendTelemetry();
    return {
      tracer: fallback.tracer,
      meter: fallback.meter,
      isInitialized: fallback.isInitialized,
      startSpan: (name, attributes) => fallback.tracer.startSpan(name, { attributes }),
      tracePromise: async (name, operation, attributes) => {
        const span = fallback.tracer.startSpan(name, { attributes });
        try {
          const result = await operation(span);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (e: any) {
          span.recordException(e);
          span.setStatus({ code: SpanStatusCode.ERROR, message: e?.message });
          throw e;
        } finally {
          span.end();
        }
      },
      recordError: (error, attributes) => {
        const span = fallback.tracer.startSpan('react.error', { attributes });
        span.recordException(typeof error === 'string' ? new Error(error) : error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.end();
      },
      recordMetric: (name, value, attributes) => {
        const metric = fallback.meter.createHistogram(`safeline_frontend_${name}`);
        metric.record(value, attributes);
      },
      trackInteraction: (action, component, attributes) => {
        const span = fallback.tracer.startSpan(`ui.${action}`, {
          attributes: { 'ui.component': component, ...attributes }
        });
        span.end();
      },
      trackPageView: (pageName, attributes) => {
        const span = fallback.tracer.startSpan('navigation.page_view', {
          attributes: { 'navigation.page': pageName, ...attributes }
        });
        span.end();
      },
      getFinishedSpans: () => fallback.memorySpanExporter.getFinishedSpans(),
    };
  }
  return context;
}

/**
 * Hook to trace a component mount, render, and unmount lifecycle
 */
export function useTraceComponent(componentName: string, attributes?: Record<string, string | number | boolean>) {
  const { tracer, meter } = useOpenTelemetry();
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const mountSpan = tracer.startSpan(`component.${componentName}.mount`, {
      attributes: {
        'component.name': componentName,
        ...attributes,
      },
    });
    mountSpan.end();

    const histogram = meter.createHistogram('safeline_frontend_component_lifetime_ms', {
      unit: 'ms',
      description: 'Lifetime of React components from mount to unmount',
    });

    return () => {
      const duration = Date.now() - mountTimeRef.current;
      histogram.record(duration, {
        'component.name': componentName,
        ...attributes,
      });

      const unmountSpan = tracer.startSpan(`component.${componentName}.unmount`, {
        attributes: {
          'component.name': componentName,
          'component.duration_ms': duration,
          ...attributes,
        },
      });
      unmountSpan.end();
    };
  }, [componentName, tracer, meter]);
}

/**
 * Helper component for tracking route navigation changes when rendered inside react-router-dom
 */
export function TelemetryNavigationTracker() {
  const { trackPageView } = useOpenTelemetry();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      trackPageView(window.location.pathname, {
        href: window.location.href,
        search: window.location.search,
      });

      const handlePopState = () => {
        trackPageView(window.location.pathname, {
          trigger: 'popstate',
          href: window.location.href,
        });
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [trackPageView]);

  return null;
}

export default OpenTelemetryProvider;
