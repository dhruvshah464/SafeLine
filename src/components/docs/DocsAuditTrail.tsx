import CodeBlock from './CodeBlock';

export default function DocsAuditTrail() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-4xl font-semibold text-[#0F172A] mb-4">Immutable Audit Trail</h1>
      <p className="text-lg text-[#64748B] mb-8">
        Cryptographically verifiable records of every decision made by autonomous agents.
      </p>

      <div className="prose prose-slate max-w-none">
        
        <h2 id="overview" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Overview</h2>
        <p>
          In regulated environments (finance, healthcare), knowing <em>what</em> an agent did is not enough; you must prove it cryptographically. SafeLine records every intercepted request, the policy evaluation results, and the exact payload into an append-only audit log.
        </p>

        <h2 id="cryptographic-signing" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Cryptographic Signing</h2>
        <p>
          Each audit log entry is hashed (SHA-256) and signed using an Ed25519 private key. Each log entry also includes the hash of the <em>previous</em> log entry, creating a tamper-evident blockchain-like structure. If a bad actor modifies a database row, the signature chain is broken, and auditors are alerted.
        </p>

        <h2 id="log-structure" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Log Structure</h2>
        <p>
          Audit logs are stored as structured JSON. Below is an example of a single audit event.
        </p>

        <CodeBlock
          language="json"
          code={`{
  "event_id": "evt_01HGWJ49Z2N6P...",
  "timestamp": "2024-05-12T08:42:12Z",
  "agent_id": "openclaw-prod-1",
  "request": {
    "method": "POST",
    "url": "https://api.internal/v1/billing/charge",
    "redacted_body": "{\\"amount\\": 500, \\"customer_id\\": \\"[REDACTED]\\"}"
  },
  "evaluation": {
    "decision": "DENY",
    "matched_policies": ["safeline.finance.deny_large_charges"],
    "latency_ms": 4.2
  },
  "crypto": {
    "prev_hash": "a1b2c3d4...",
    "signature": "3045022100e4b..."
  }
}`}
        />

        <h2 id="backends" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Supported Storage Backends</h2>
        <p>
          SafeLine supports multiple storage backends for audit logs:
        </p>
        <ul>
          <li><strong>PostgreSQL:</strong> Best for standard enterprise deployments.</li>
          <li><strong>ClickHouse:</strong> Best for high-throughput, analytics-heavy deployments.</li>
          <li><strong>AWS S3 / GCS:</strong> For cold storage and compliance archiving.</li>
          <li><strong>Stdout (JSON lines):</strong> For integration with external log aggregators like Datadog or Splunk.</li>
        </ul>

        <h2 id="verifying-logs" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Verifying the Audit Trail</h2>
        <p>
          SafeLine provides a CLI tool to verify the cryptographic integrity of the audit log database.
        </p>

        <CodeBlock
          language="bash"
          code={`safeline audit verify \\
  --db "postgresql://..." \\
  --public-key "./public_key.pem"`}
        />
        
        <p>
          Output:
        </p>
        
        <CodeBlock
          language="text"
          code={`Verifying 14,203 events...
[OK] Chain integrity verified.
[OK] Signatures valid.
No tampering detected.`}
        />
      </div>
    </div>
  );
}
