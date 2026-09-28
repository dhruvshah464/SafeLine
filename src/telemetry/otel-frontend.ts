import { 
  WebTracerProvider, 
  SimpleSpanProcessor, 
  ConsoleSpanExporter, 
  InMemorySpanExporter,
  StackContextManager 
} from '@opentelemetry/sdk-trace-web';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { 
  MeterProvider, 
  PeriodicExportingMetricReader, 
  ConsoleMetricExporter, 
  InMemoryMetricExporter 
} from '@opentelemetry/sdk-metrics';
import { trace, metrics, Tracer, Meter, Span, SpanStatusCode, Context } from '@opentelemetry/api';

export interface FrontendTelemetryConfig {
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  enableConsoleLogging?: boolean;
}

export interface TelemetryState {
  tracer: Tracer;
  meter: Meter;
  tracerProvider: WebTracerProvider;
  meterProvider: MeterProvider;
  memorySpanExporter: InMemorySpanExporter;
  memoryMetricExporter: InMemoryMetricExporter;
  isInitialized: boolean;
}

let telemetryState: TelemetryState | null = null;

/**
 * Initializes OpenTelemetry tracing and metrics for the browser environment.
 */
export function initFrontendTelemetry(config: FrontendTelemetryConfig = {}): TelemetryState {
  if (telemetryState) {
    return telemetryState;
  }

  const {
    serviceName = 'safeline-frontend',
    serviceVersion = '1.0.0',
    environment = (typeof process !== 'undefined' && process.env?.NODE_ENV) || 'production',
    enableConsoleLogging = false
  } = config;

  const resource = resourceFromAttributes({
    'service.name': serviceName,
    'service.version': serviceVersion,
    'deployment.environment': environment,
    'browser.user_agent': typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    'browser.language': typeof navigator !== 'undefined' ? navigator.language : 'unknown'
  });

  // 1. Tracer Setup
  const memorySpanExporter = new InMemorySpanExporter();
  const spanProcessors = [
    new SimpleSpanProcessor(memorySpanExporter)
  ];
  if (enableConsoleLogging) {
    spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }

  const tracerProvider = new WebTracerProvider({
    resource,
    spanProcessors
  });

  tracerProvider.register({
    contextManager: new StackContextManager()
  });

  const tracer = trace.getTracer(serviceName, serviceVersion);

  // 2. Metrics Setup
  const memoryMetricExporter = new InMemoryMetricExporter(0); // Cumulative temporality
  const metricReaders = [
    new PeriodicExportingMetricReader({
      exporter: memoryMetricExporter,
      exportIntervalMillis: 10000
    })
  ];

  if (enableConsoleLogging) {
    metricReaders.push(
      new PeriodicExportingMetricReader({
        exporter: new ConsoleMetricExporter(),
        exportIntervalMillis: 30000
      })
    );
  }

  const meterProvider = new MeterProvider({
    resource,
    readers: metricReaders
  });

  metrics.setGlobalMeterProvider(meterProvider);
  const meter = metrics.getMeter(serviceName, serviceVersion);

  // 3. Initialize Standard Frontend Metrics
  const pageViewCounter = meter.createCounter('safeline_frontend_page_views_total', {
    description: 'Total number of frontend page views and route transitions'
  });

  const userInteractionCounter = meter.createCounter('safeline_frontend_user_interactions_total', {
    description: 'Total user interactions (clicks, submits, toggles)'
  });

  const frontendErrorCounter = meter.createCounter('safeline_frontend_errors_total', {
    description: 'Total caught or unhandled frontend exceptions'
  });

  const renderDurationHistogram = meter.createHistogram('safeline_frontend_render_duration_ms', {
    description: 'Component render and lifecycle duration in milliseconds',
    unit: 'ms'
  });

  const apiRequestDurationHistogram = meter.createHistogram('safeline_frontend_api_request_duration_ms', {
    description: 'Frontend fetch/API roundtrip latency in milliseconds',
    unit: 'ms'
  });

  // Track initial page load performance
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        try {
          const perfEntries = performance.getEntriesByType('navigation');
          if (perfEntries && perfEntries.length > 0) {
            const nav = perfEntries[0] as PerformanceNavigationTiming;
            const span = tracer.startSpan('frontend.document_load', {
              attributes: {
                'http.response_time_ms': nav.responseEnd - nav.responseStart,
                'dom.content_loaded_ms': nav.domContentLoadedEventEnd - nav.startTime,
                'page.load_ms': nav.loadEventEnd - nav.startTime
              }
            });
            span.end();
          }
        } catch {
          // Ignore performance API errors in unsupported browsers
        }
      }, 0);
    });

    // Global uncaught error telemetry
    window.addEventListener('error', (event) => {
      frontendErrorCounter.add(1, {
        type: 'uncaught_error',
        filename: event.filename || 'unknown'
      });
      const span = tracer.startSpan('frontend.error');
      span.recordException(event.error || event.message);
      span.setStatus({ code: SpanStatusCode.ERROR, message: event.message });
      span.end();
    });

    window.addEventListener('unhandledrejection', (event) => {
      frontendErrorCounter.add(1, {
        type: 'unhandled_rejection'
      });
      const span = tracer.startSpan('frontend.unhandled_rejection');
      span.recordException(event.reason || 'Unhandled Promise Rejection');
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(event.reason) });
      span.end();
    });
  }

  telemetryState = {
    tracer,
    meter,
    tracerProvider,
    meterProvider,
    memorySpanExporter,
    memoryMetricExporter,
    isInitialized: true
  };

  return telemetryState;
}

export function getFrontendTelemetry(): TelemetryState {
  if (!telemetryState) {
    return initFrontendTelemetry();
  }
  return telemetryState;
}
