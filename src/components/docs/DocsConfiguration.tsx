import CodeBlock from './CodeBlock';

export default function DocsConfiguration() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-4xl font-semibold text-[#0F172A] mb-4">Configuration</h1>
      <p className="text-lg text-[#64748B] mb-8">
        Learn how to configure the SafeLine proxy, policy engine, and audit integrations via the `safeline.yaml` manifest.
      </p>

      <div className="prose prose-slate max-w-none">
        
        <h2 id="global-config" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Global Configuration</h2>
        <p>
          SafeLine is configured using a single YAML file, typically named `safeline.yaml`. This file defines how the proxy binds to the network, where it loads policies from, and how it handles audit trails.
        </p>

        <CodeBlock
          language="yaml"
          code={`version: "1.0"
proxy:
  # The port the SafeLine proxy binds to
  port: 8080
  # (Optional) Upstream target. If specified, SafeLine acts as a reverse proxy.
  # If omitted, SafeLine acts as a forward HTTP proxy.
  target_url: "https://api.production.internal"
  tls:
    enabled: true
    cert_file: "/etc/safeline/certs/tls.crt"
    key_file: "/etc/safeline/certs/tls.key"

engine:
  # Directory containing Rego policies (.rego) and JSON schemas (.json)
  policy_dir: "./policies"
  # If true, requests without a matching policy are denied by default
  strict_mode: true
  timeout_ms: 100

audit:
  enabled: true
  # Supported backends: postgres, clickhouse, stdout, file
  backend: "postgres"
  connection_string: "\${DATABASE_URL}"
  # Ed25519 private key for signing audit log payloads
  signing_key: "\${SIGNING_KEY}"`}
        />

        <h2 id="environment-variables" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Environment Variables</h2>
        <p>
          You can override any configuration value using environment variables. This is especially useful for managing secrets like database connection strings and cryptographic signing keys.
        </p>
        <p>
          Use the <code>{"${VAR_NAME}"}</code> syntax inside the <code>safeline.yaml</code> file to inject environment variables at startup.
        </p>

        <h2 id="hot-reloading" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Hot Reloading</h2>
        <p>
          SafeLine supports zero-downtime hot reloading of both the configuration file and the policy directory.
        </p>
        <p>
          Send a <code>SIGHUP</code> signal to the SafeLine process to trigger a reload:
        </p>

        <CodeBlock
          language="bash"
          code={`kill -SIGHUP $(pidof safeline)`}
        />
        
        <p>
          If the new configuration or policies are invalid (e.g., Rego syntax error), SafeLine will reject the update, log the error, and continue operating with the existing valid state.
        </p>
      </div>
    </div>
  );
}
