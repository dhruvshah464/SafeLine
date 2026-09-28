import { Network } from 'lucide-react';
import Architecture from '../sections/Architecture';

export default function DocsArchitecture() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-4xl font-semibold text-[#0F172A] mb-4">Architecture</h1>
      <p className="text-lg text-[#64748B] mb-8">
        Understand how SafeLine integrates into your deployment pipeline.
      </p>

      <div className="prose prose-slate max-w-none">
        <h2 className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Deployment Model</h2>
        <p>
          SafeLine operates as a high-performance proxy layer. It sits between your AI Agent (like OpenClaw or an LLM) and the target execution environment (e.g., AWS, Kubernetes, internal APIs).
        </p>

        <div className="my-10 bg-[#F8FAFC] border border-[#E2E8F0] p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4 text-[#0F172A] font-semibold">
            <Network className="w-5 h-5 text-blue-600" />
            Proxy Architecture
          </div>
          <p className="text-[#64748B] text-sm m-0">
            Agents must be configured to route all outbound requests through SafeLine. SafeLine terminates the connection, validates the payload against loaded policies, scrubs sensitive data, and only forwards the request to the upstream target if all checks pass.
          </p>
        </div>

        <h2 className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Validation Pipeline</h2>
        <p>
          The core validation loop operates in deterministic order to guarantee security constraints are met before any complex processing occurs.
        </p>
      </div>

      <div className="my-12 -mx-6 lg:-mx-16 border-y border-[#E2E8F0] bg-[#FCFCFD] overflow-hidden">
        {/* We reuse the architecture diagram from the landing page here, scaled nicely */}
        <div className="scale-[0.8] origin-top md:scale-90 lg:scale-100 max-w-5xl mx-auto py-8">
           <Architecture />
        </div>
      </div>

      <div className="prose prose-slate max-w-none">
        <h2 className="text-2xl font-semibold text-[#0F172A] mt-12 mb-4">Performance Impact</h2>
        <p>
          Because SafeLine uses deterministic rule matching (Rego, JSON Schema) rather than secondary LLM calls, the latency overhead is typically <strong>under 15ms</strong>. 
        </p>
      </div>
    </div>
  );
}
