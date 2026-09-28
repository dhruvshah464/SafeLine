import CodeBlock from './CodeBlock';

export default function DocsOpenClawIntegration() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-4xl font-semibold text-[#0F172A] mb-4">OpenClaw Integration</h1>
      <p className="text-lg text-[#64748B] mb-8">
        How to run SafeLine seamlessly alongside the OpenClaw autonomous agent framework.
      </p>

      <div className="prose prose-slate max-w-none">
        
        <h2 id="overview" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Overview</h2>
        <p>
          OpenClaw is a powerful autonomous agent framework for executing complex operational tasks. Because OpenClaw agents have broad capabilities, integrating SafeLine is highly recommended to ensure agents cannot perform destructive actions outside their intended scope.
        </p>

        <h2 id="architecture" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Deployment Architecture</h2>
        <p>
          The standard pattern is the <strong>Sidecar Pattern</strong>. SafeLine runs as a local proxy alongside the OpenClaw agent container within the same Pod or network namespace.
        </p>

        <CodeBlock
          language="yaml"
          code={`# docker-compose.yml
version: '3.8'

services:
  openclaw-agent:
    image: openclaw/agent:latest
    environment:
      # Force OpenClaw to route all traffic through SafeLine
      - HTTP_PROXY=http://safeline:8080
      - HTTPS_PROXY=http://safeline:8080
      - NO_PROXY=localhost,127.0.0.1
    depends_on:
      - safeline

  safeline:
    image: ghcr.io/safeline-dev/safeline:latest
    volumes:
      - ./safeline.yaml:/etc/safeline/config.yaml
      - ./policies:/etc/safeline/policies
    ports:
      - "8080:8080"`}
        />

        <h2 id="tool-interception" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Intercepting Tool Calls</h2>
        <p>
          OpenClaw executes external actions by calling "tools". These tools often make HTTP requests. By setting the proxy environment variables, the underlying Node.js or Python runtime inside OpenClaw will automatically route these requests through SafeLine.
        </p>
        <p>
          SafeLine will evaluate the tool calls against your Rego policies. If a tool call violates a policy, SafeLine blocks it and returns a JSON error.
        </p>

        <h2 id="handling-rejections" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Handling Rejections in OpenClaw</h2>
        <p>
          When SafeLine blocks a request, it returns an HTTP 403. OpenClaw is designed to handle API errors gracefully. It reads the error message returned by SafeLine and feeds it back into the LLM context.
        </p>
        <p>
          This allows the LLM to understand <em>why</em> the action failed and attempt to self-correct (e.g., trying a different approach that complies with the policy).
        </p>

      </div>
    </div>
  );
}
