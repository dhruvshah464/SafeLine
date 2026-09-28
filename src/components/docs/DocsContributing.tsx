export default function DocsContributing() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-4xl font-semibold text-[#0F172A] mb-4">Contributing</h1>
      <p className="text-lg text-[#64748B] mb-8">
        Help us build the most secure evaluation layer for autonomous AI agents.
      </p>

      <div className="prose prose-slate max-w-none">
        
        <h2 id="code-of-conduct" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Code of Conduct</h2>
        <p>
          We expect all contributors to adhere to the Contributor Covenant Code of Conduct. Please treat everyone with respect and focus on constructive engineering discussions.
        </p>

        <h2 id="getting-started" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Development Setup</h2>
        <p>
          SafeLine is written in Rust. You will need a standard Rust toolchain to build the project.
        </p>
        
        <ol>
          <li>Install Rust via rustup.</li>
          <li>Clone the repository.</li>
          <li>Run `cargo build` to compile the proxy.</li>
          <li>Run `cargo test` to execute the test suite.</li>
        </ol>

        <h2 id="pull-requests" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Submitting Pull Requests</h2>
        <p>
          We welcome contributions for bug fixes, performance improvements, and new analyzers.
        </p>
        <ul>
          <li><strong>Tests are mandatory:</strong> Any PR adding new functionality must include unit tests. If adding a new PII analyzer, include tests for false positives and edge cases.</li>
          <li><strong>Performance matters:</strong> SafeLine is a proxy layer. If your PR introduces significant latency (e.g., heavy regex parsing), please provide benchmarking results (`cargo bench`) in the PR description.</li>
          <li><strong>Keep it deterministic:</strong> We explicitly reject any features that introduce non-deterministic evaluation (e.g., "AI-powered policy evaluation") into the critical proxy path. SafeLine must remain 100% deterministic.</li>
        </ul>

        <h2 id="reporting-vulnerabilities" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Reporting Vulnerabilities</h2>
        <p>
          SafeLine is a security product. If you discover a vulnerability, <strong>do not open a public GitHub issue</strong>. Instead, please email our security team directly at <code>security@safeline-dev.example.com</code>. We will respond within 24 hours.
        </p>
      </div>
    </div>
  );
}
