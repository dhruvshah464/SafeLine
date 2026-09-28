import CodeBlock from './CodeBlock';

export default function DocsGettingStarted() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-4xl font-semibold text-[#0F172A] mb-4">Getting Started</h1>
      <p className="text-lg text-[#64748B] mb-8">
        Learn how to install, configure, and integrate SafeLine into your agentic workflow in minutes.
      </p>

      <div className="prose prose-slate max-w-none">
        <h2 id="installation" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">1. Installation</h2>
        <p>
          SafeLine is distributed as a pre-compiled binary, a Docker container, and an npm package (for Node.js agents). The most common deployment method is running the SafeLine proxy alongside your agent via Docker.
        </p>

        <CodeBlock
          language="bash"
          code={`# Pull the official SafeLine Docker image
docker pull ghcr.io/safeline-dev/safeline:latest

# Or install the Node.js SDK for embedded usage
npm install @safeline/sdk`}
        />

        <h2 id="configuration" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">2. Base Configuration</h2>
        <p>
          SafeLine requires a configuration file (`safeline.yaml`) and a directory of Rego policies. Create a new directory and initialize the configuration.
        </p>

        <CodeBlock
          language="yaml"
          code={`# safeline.yaml
version: "1.0"
proxy:
  port: 8080
  target_url: "https://api.internal.corp"
engine:
  policy_dir: "./policies"
  strict_mode: true
audit:
  enabled: true
  backend: "postgres"
  connection_string: "\${DATABASE_URL}"`}
        />

        <h2 id="writing-policies" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">3. Writing Your First Policy</h2>
        <p>
          Create a simple Open Policy Agent (OPA) Rego policy in the `./policies` directory to govern what the agent is allowed to do.
        </p>

        <CodeBlock
          language="rego"
          code={`# ./policies/network.rego
package safeline.network

default allow = false

# Allow GET requests to specific internal domains
allow {
    input.method == "GET"
    regex.match("^https://api\\.internal\\.corp/v1/.*$", input.url)
}

# Deny any request containing AWS credentials in the payload
deny[msg] {
    regex.match("AKIA[0-9A-Z]{16}", input.body)
    msg := "AWS Access Key detected in outbound payload"
}`}
        />

        <h2 id="running-proxy" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">4. Running the Proxy</h2>
        <p>
          Start the SafeLine proxy, pointing it to your configuration file.
        </p>

        <CodeBlock
          language="bash"
          code={`docker run -d \\
  -p 8080:8080 \\
  -v $(pwd)/safeline.yaml:/etc/safeline/config.yaml \\
  -v $(pwd)/policies:/etc/safeline/policies \\
  -e DATABASE_URL="postgresql://user:pass@host/audit" \\
  ghcr.io/safeline-dev/safeline:latest`}
        />

        <h2 id="agent-integration" className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">5. Routing Agent Traffic</h2>
        <p>
          Configure your LLM agent (e.g., OpenClaw, AutoGPT, LangChain) to route its outbound network requests through the SafeLine proxy (`http://localhost:8080`).
        </p>

        <CodeBlock
          language="typescript"
          code={`// Example using Node.js fetch with an HTTPS Proxy Agent
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

const proxyAgent = new HttpsProxyAgent('http://localhost:8080');

// This request will be intercepted and evaluated by SafeLine
const response = await fetch('https://api.internal.corp/v1/deploy', {
  method: 'POST',
  agent: proxyAgent,
  body: JSON.stringify({ action: "scale_up", instances: 5 })
});`}
        />

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 my-8">
          <p className="text-sm text-blue-800 m-0">
            <strong>Next Steps:</strong> Check out the <a href="/docs/compliance-engine" className="font-medium underline">Compliance Engine</a> documentation to learn how to write advanced, stateful Rego policies.
          </p>
        </div>

      </div>
    </div>
  );
}
