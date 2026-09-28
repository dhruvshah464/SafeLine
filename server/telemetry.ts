import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';

const traceExporter = new OTLPTraceExporter();

export const otelSDK = new NodeSDK({
  resource: resourceFromAttributes({
    'service.name': 'safeline-api',
  }),
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()]
});
