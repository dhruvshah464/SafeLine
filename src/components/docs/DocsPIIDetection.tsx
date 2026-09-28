import CodeBlock from './CodeBlock';

export default function DocsPIIDetection() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-4xl font-semibold text-[#0F172A] mb-4">PII Detection & Redaction</h1>
      <p className="text-lg text-[#64748B] mb-8">
        Automatically detect and redact sensitive Personally Identifiable Information (PII) before it leaves the agent perimeter.
      </p>

      <div className="prose prose-slate max-w-none">
        
        <h2 id="overview" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Overview</h2>
        <p>
          AI agents often handle sensitive context, such as user transcripts, database rows, or internal chat logs. SafeLine includes a deterministic PII scrubbing engine that ensures sensitive data is masked or blocked before being transmitted in API requests.
        </p>

        <h2 id="how-it-works" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">How it Works</h2>
        <p>
          The PII engine operates on the payload body of intercepted HTTP requests. It uses high-performance regular expressions and checksum validations (like Luhn for credit cards) to identify sensitive patterns.
        </p>
        <p>
          You can configure the engine to either <strong>redact</strong> the data (replacing it with a mask like `[REDACTED_SSN]`) or <strong>block</strong> the request entirely if PII is detected.
        </p>

        <h2 id="configuration" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Configuration</h2>
        <p>
          PII rules are configured in the `safeline.yaml` file under the `pii` block.
        </p>

        <CodeBlock
          language="yaml"
          code={`pii:
  enabled: true
  # "redact" mutates the payload inline, "block" denies the request
  mode: "redact"
  
  # Built-in analyzers to enable
  analyzers:
    - "CREDIT_CARD"
    - "SSN"
    - "EMAIL"
    - "PHONE_NUMBER"
    - "AWS_ACCESS_KEY"
    - "GITHUB_TOKEN"
    
  # Custom regex patterns
  custom_patterns:
    - name: "INTERNAL_PROJECT_CODE"
      pattern: "PRJ-[0-9]{4}-[A-Z]{3}"`}
        />

        <h2 id="example" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Example Redaction</h2>
        
        <p><strong>Original Outbound Request (From Agent):</strong></p>
        <CodeBlock
          language="json"
          code={`{
  "action": "send_email",
  "recipient": "customer@example.com",
  "body": "Your account linked to SSN 000-11-2222 has been updated."
}`}
        />

        <p><strong>Mutated Payload (Forwarded to API):</strong></p>
        <CodeBlock
          language="json"
          code={`{
  "action": "send_email",
  "recipient": "[REDACTED_EMAIL]",
  "body": "Your account linked to SSN [REDACTED_SSN] has been updated."
}`}
        />

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 my-8">
          <p className="text-sm text-amber-800 m-0">
            <strong>Performance Note:</strong> PII detection adds approximately 2-5ms of latency depending on payload size. For payloads over 1MB, we recommend targeting specific JSON keys rather than running a full body scan.
          </p>
        </div>
      </div>
    </div>
  );
}
