import { CheckCircle2, CircleDot, Activity, ArrowRight, LayoutTemplate, Shield, Database, Cpu } from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  status: 'completed' | 'in-progress' | 'planned';
  description: string;
  modules: string[];
  impact: string;
  dependencies: string[];
  notes: string;
  icon: React.ElementType;
}

const MILESTONES: Milestone[] = [
  {
    id: "m1",
    title: "Core Interception Layer",
    status: "completed",
    description: "Establishing the foundational HTTP/HTTPS proxy and deterministic payload interception.",
    modules: ["Proxy Interceptor", "JSON Schema Validator"],
    impact: "High - Enables baseline request interception.",
    dependencies: ["None"],
    notes: "Implemented using a lightweight Node.js proxy layer to ensure sub-10ms latency overhead.",
    icon: LayoutTemplate
  },
  {
    id: "m2",
    title: "Regex-based PII Redaction",
    status: "completed",
    description: "Automatic detection and masking of standard PII formats (SSN, Credit Cards, Emails) before egress.",
    modules: ["PII Scanner", "Data Masker"],
    impact: "Critical - Prevents immediate data leaks.",
    dependencies: ["Core Interception Layer"],
    notes: "Uses highly optimized deterministic regex. Future iterations will include NER (Named Entity Recognition).",
    icon: Shield
  },
  {
    id: "m3",
    title: "Cryptographic Audit Trail",
    status: "completed",
    description: "Immutable signing of all allowed and blocked requests for compliance reporting.",
    modules: ["Audit Logger", "Crypto Signer"],
    impact: "Critical - Required for financial compliance standards.",
    dependencies: ["Core Interception Layer"],
    notes: "Logs are hashed continuously. Ed25519 signatures used for performance.",
    icon: Database
  },
  {
    id: "m4",
    title: "OPA / Rego Policy Engine",
    status: "in-progress",
    description: "Migrating from static JSON configuration to dynamic Open Policy Agent (OPA) evaluations.",
    modules: ["Policy Evaluator", "Rego Compiler"],
    impact: "High - Allows complex, context-aware business logic.",
    dependencies: ["Core Interception Layer"],
    notes: "Currently testing WASM-compiled Rego policies to maintain high throughput.",
    icon: Activity
  },
  {
    id: "m5",
    title: "OpenClaw Native SDK",
    status: "in-progress",
    description: "Direct library integration for OpenClaw agents to evaluate policies before attempting network calls.",
    modules: ["SDK Client", "Context Bridge"],
    impact: "Medium - Improves developer experience.",
    dependencies: ["OPA / Rego Policy Engine"],
    notes: "Provides a fail-fast mechanism so agents don't waste reasoning cycles on blocked paths.",
    icon: Cpu
  },
  {
    id: "m6",
    title: "Kubernetes Sidecar Injection",
    status: "planned",
    description: "Zero-config deployment model for injecting SafeLine alongside agent pods in K8s clusters.",
    modules: ["Mutating Webhook", "Envoy Filter"],
    impact: "High - Enables enterprise-scale deployment.",
    dependencies: ["Dockerization"],
    notes: "Will leverage Istio/Envoy for seamless traffic capture.",
    icon: Layers
  },
  {
    id: "m7",
    title: "OpenTelemetry Tracing",
    status: "planned",
    description: "Exporting policy evaluation spans to standard observability backends (Jaeger, DataDog).",
    modules: ["OTel Exporter"],
    impact: "Medium - Enhances observability.",
    dependencies: ["Audit Logger"],
    notes: "Span attributes will include policy ID, agent ID, and block reasons.",
    icon: Activity
  }
];

// Placeholder for Layers icon
import { Layers } from 'lucide-react';

export default function DocsRoadmap() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-4xl font-semibold text-[#0F172A] mb-4">Engineering Roadmap</h1>
      <p className="text-lg text-[#64748B] mb-12">
        An interactive timeline of SafeLine's architectural evolution and upcoming capabilities.
      </p>

      <div className="relative border-l-2 border-[#E2E8F0] ml-4 md:ml-6 space-y-12">
        {MILESTONES.map((milestone) => (
          <div key={milestone.id} className="relative pl-8 md:pl-12 group">
            {/* Status Icon Indicator */}
            <div className={`absolute -left-[17px] top-1 rounded-full border-4 border-white bg-white`}>
              {milestone.status === 'completed' && <CheckCircle2 className="w-7 h-7 text-green-500" fill="currentColor" stroke="white" />}
              {milestone.status === 'in-progress' && <Activity className="w-7 h-7 text-blue-500 p-1 bg-blue-100 rounded-full" />}
              {milestone.status === 'planned' && <CircleDot className="w-7 h-7 text-[#94A3B8]" />}
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 relative overflow-hidden">
              
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <milestone.icon className="w-5 h-5 text-[#64748B]" />
                    <h3 className="text-xl font-semibold text-[#0F172A] m-0">{milestone.title}</h3>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider
                    ${milestone.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' : ''}
                    ${milestone.status === 'in-progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' : ''}
                    ${milestone.status === 'planned' ? 'bg-slate-50 text-slate-600 border border-slate-200' : ''}
                  `}>
                    {milestone.status === 'completed' ? '✓ Completed' : milestone.status === 'in-progress' ? '◐ In Progress' : '○ Planned'}
                  </span>
                </div>
              </div>

              <p className="text-[#475569] text-sm mb-6 leading-relaxed">
                {milestone.description}
              </p>

              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-sm bg-[#F8FAFC] -mx-6 -mb-6 p-6 border-t border-[#E2E8F0]">
                <div>
                  <span className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Related Modules</span>
                  <div className="flex flex-wrap gap-2">
                    {milestone.modules.map(mod => (
                      <span key={mod} className="px-2 py-1 bg-white border border-[#E2E8F0] rounded text-[#475569] text-xs">
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Impact</span>
                  <span className="text-[#0F172A] font-medium text-xs">{milestone.impact}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Dependencies</span>
                  <div className="flex items-center gap-2 text-xs text-[#475569]">
                    {milestone.dependencies.join(' ➔ ')}
                  </div>
                </div>
              </div>

              {/* Hover Notes Overlay */}
              <div className="absolute inset-0 bg-[#0F172A]/95 backdrop-blur-sm p-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center pointer-events-none">
                <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  Implementation Notes <ArrowRight className="w-4 h-4" />
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed m-0">
                  {milestone.notes}
                </p>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
