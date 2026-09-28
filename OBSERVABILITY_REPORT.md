# SafeLine Observability Report

SafeLine has been converted into an observable production service, equipped with comprehensive telemetry, structured logging, and metrics.

## 1. Metrics & Prometheus

We use `prom-client` to expose metrics via the `/metrics` endpoint. The metrics include:

- **Default Node.js Metrics**: CPU, memory, event loop lag, active handles.
- **`http_request_duration_seconds`**: A histogram tracking the latency of HTTP requests. Features percentiles (P95, P99) calculation capability through Prometheus querying (`histogram_quantile`).
- **`rule_execution_duration_seconds`**: A histogram tracking the execution time of individual policy rules, labeled by `rule_id` and `decision`.
- **`safeline_errors_total`**: A counter tracking unhandled errors categorized by `type` and `endpoint`.

## 2. Distributed Tracing & OpenTelemetry

We integrated OpenTelemetry for distributed tracing.
- The tracing setup is initialized in `server/telemetry.ts` before the application loads (`require` order matters).
- We use `@opentelemetry/auto-instrumentations-node` to automatically capture HTTP requests, Express routes, and other supported libraries.
- Traces are exported using `OTLPTraceExporter` over HTTP.

## 3. Structured Logging

We use `winston` in `server/config/logger.ts` for structured JSON logging. This format is ideal for ingestion into systems like Elasticsearch, Datadog, or Loki.
- Logs include timestamps and log levels.
- Unhandled exceptions are caught by an Express middleware and logged with stack traces.

## 4. Health and Readiness Checks

Kubernetes-friendly endpoints have been added:
- **`/health/live`**: Checks if the Node.js process is running and responsive. (Liveness Probe)
- **`/health/ready`**: Verifies that the service is fully booted and ready to handle traffic. (Readiness Probe)

## 5. Grafana Dashboard Examples

Below are standard PromQL queries you can use to build your Grafana dashboards.

### Request Latency (P95)
```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
```

### Request Latency (P99)
```promql
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
```

### Error Rate
```promql
sum(rate(safeline_errors_total[5m])) by (type, endpoint)
```

### Rule Execution Performance
```promql
histogram_quantile(0.95, sum(rate(rule_execution_duration_seconds_bucket[5m])) by (le, rule_id))
```

## Dashboard Creation

1. Set Prometheus as the data source in Grafana.
2. Create panels for Request Volume (Rate), Error Rate, P95/P99 Latency.
3. Import generic Node.js dashboards using the default metrics provided by `prom-client`.

## 6. Frontend OpenTelemetry Tracing & Metrics

The React web application is wrapped with `OpenTelemetryProvider` in `src/main.tsx` and provides browser-level observability:
- **`WebTracerProvider` & `StackContextManager`**: Configured with service name `safeline-frontend` for end-to-end tracing.
- **Frontend Metrics (`MeterProvider`)**:
  - `safeline_frontend_page_views_total`: Track route changes and navigation.
  - `safeline_frontend_user_interactions_total`: Track UI actions (buttons, form submissions).
  - `safeline_frontend_errors_total`: Captures unhandled window exceptions, promise rejections, and React boundary errors.
  - `safeline_frontend_render_duration_ms`: Component lifecycle and render latency.
  - `safeline_frontend_api_request_duration_ms`: Client-side fetch roundtrip latency.
- **React Context & Hooks**:
  - `useOpenTelemetry()`: Access tracer, meter, and trace helpers (`startSpan`, `tracePromise`, `recordError`, `trackPageView`).
  - `useTraceComponent()`: Automates component mount/unmount and lifespan telemetry.

## 7. React Route Error Boundary & Observability Integration

To safeguard application resilience and maintain zero-blindspot visibility in production:
- **`ErrorBoundary` Component (`src/components/common/ErrorBoundary.tsx`)**:
  - Encapsulates routes (`<AppRoutes />`) and components.
  - Generates a unique incident tracking reference (`errorId: err_xxxxxxxx`).
  - Emits OpenTelemetry trace spans (`react.runtime_error`) with stack traces, component stacks, route, and environment tags.
  - Increments frontend Prometheus metric `safeline_frontend_errors_total`.
  - Dispatches structured logs to the backend `/api/telemetry/error` ingestion endpoint.
  - Automatically resets error state upon route transition via `resetKeys={[location.pathname]}`.
  - Renders a clean diagnostic fallback UI with incident reference copy, diagnostic JSON report, and user recovery options.
- **Backend Error Ingestion (`POST /api/telemetry/error`)**:
  - Ingests frontend runtime errors into Winston structured logs with JSON formatting for Grafana/Loki/Elasticsearch.
  - Increments the Prometheus `safeline_errors_total{type="frontend_runtime_error"}` counter.


