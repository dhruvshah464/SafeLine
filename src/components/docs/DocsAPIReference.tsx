import CodeBlock from './CodeBlock';

export default function DocsAPIReference() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-4xl font-semibold text-[#0F172A] mb-4">API Reference</h1>
      <p className="text-lg text-[#64748B] mb-8">
        Reference documentation for SafeLine's management API and diagnostic endpoints.
      </p>

      <div className="prose prose-slate max-w-none">
        
        <h2 id="overview" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Overview</h2>
        <p>
          SafeLine operates on two distinct ports:
        </p>
        <ul>
          <li><strong>Data Plane (Default: 8080):</strong> The proxy port that intercepts agent traffic.</li>
          <li><strong>Control Plane (Default: 9090):</strong> The management API for health checks, metrics, and dynamic policy reloads.</li>
        </ul>
        <p>This reference covers the <strong>Control Plane API</strong>.</p>

        <h2 id="endpoints" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Endpoints</h2>

        <h3 id="healthz" className="text-xl font-semibold text-[#0F172A] mt-8 mb-4">GET /healthz</h3>
        <p>Returns the health status of the proxy.</p>
        
        <p><strong>Response (200 OK)</strong></p>
        <CodeBlock
          language="json"
          code={`{
  "status": "healthy",
  "version": "1.2.0",
  "uptime_seconds": 34502
}`}
        />

        <h3 id="metrics" className="text-xl font-semibold text-[#0F172A] mt-8 mb-4">GET /metrics</h3>
        <p>Returns Prometheus-formatted metrics.</p>
        
        <p><strong>Response (200 OK)</strong></p>
        <CodeBlock
          language="text"
          code={`# HELP safeline_requests_total Total intercepted requests
# TYPE safeline_requests_total counter
safeline_requests_total{status="allowed"} 1042
safeline_requests_total{status="denied"} 42
# HELP safeline_evaluation_latency_ms Policy evaluation latency
# TYPE safeline_evaluation_latency_ms histogram`}
        />

        <h3 id="reload" className="text-xl font-semibold text-[#0F172A] mt-8 mb-4">POST /api/v1/reload</h3>
        <p>Triggers a hot reload of the configuration file and policy directory. Requires an admin token.</p>
        
        <p><strong>Request</strong></p>
        <CodeBlock
          language="bash"
          code={`curl -X POST http://localhost:9090/api/v1/reload \\
  -H "Authorization: Bearer \${ADMIN_TOKEN}"`}
        />

        <p><strong>Response (200 OK)</strong></p>
        <CodeBlock
          language="json"
          code={`{
  "status": "success",
  "message": "Configuration reloaded successfully",
  "policies_loaded": 14
}`}
        />

        <p><strong>Response (400 Bad Request)</strong></p>
        <CodeBlock
          language="json"
          code={`{
  "status": "error",
  "message": "Failed to compile Rego policies",
  "details": "parse error: unexpected identifier at policies/network.rego:4"
}`}
        />

      </div>
    </div>
  );
}
