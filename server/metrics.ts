import client from 'prom-client';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10] // Useful for p95, p99
});

export const ruleExecutionDuration = new client.Histogram({
  name: 'rule_execution_duration_seconds',
  help: 'Duration of rule execution in seconds',
  labelNames: ['rule_id', 'decision'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

export const errorRateCounter = new client.Counter({
  name: 'safeline_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'endpoint']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(ruleExecutionDuration);
register.registerMetric(errorRateCounter);
