import { Sparkles, LayoutDashboard, Puzzle, Shield, Zap } from 'lucide-react';

interface FutureIdea {
  id: string;
  category: string;
  title: string;
  problem: string;
  solution: string;
  impact: string;
  difficulty: 'Low' | 'Medium' | 'High' | 'Extreme';
  priority: 'Low' | 'Medium' | 'High';
  status: 'Concept' | 'Research' | 'Planned' | 'Experimental';
  icon: React.ElementType;
}

const IDEAS: FutureIdea[] = [
  {
    id: "f1",
    category: "AI & Security",
    title: "AI-Powered Anomaly Detection",
    problem: "Deterministic rules cannot catch novel zero-day agent hallucinations or creative data exfiltration attempts.",
    solution: "Deploy a secondary, strictly isolated SLM (Small Language Model) that evaluates agent intent asynchronously without blocking the critical path.",
    impact: "Provides defense-in-depth against prompt injection and zero-day threats.",
    difficulty: "High",
    priority: "Medium",
    status: "Research",
    icon: Sparkles
  },
  {
    id: "f2",
    category: "Developer Experience",
    title: "Web Policy Dashboard",
    problem: "Writing Rego policies is difficult for compliance teams who are not engineers.",
    solution: "A visual, node-based policy builder that compiles down to strict Rego rules, complete with test simulation environments.",
    impact: "Democratizes policy creation, allowing legal and compliance teams to author rules directly.",
    difficulty: "Medium",
    priority: "High",
    status: "Planned",
    icon: LayoutDashboard
  },
  {
    id: "f3",
    category: "Plugins & Ecosystem",
    title: "MCP Ecosystem Integration",
    problem: "Agents fetch context from many disparate sources. Standardizing interception points is fragmenting.",
    solution: "Native support for the Model Context Protocol (MCP) to proxy and validate context retrieval securely.",
    impact: "Unified security model for all agentic tool usage and context fetching.",
    difficulty: "Medium",
    priority: "High",
    status: "Planned",
    icon: Puzzle
  },
  {
    id: "f4",
    category: "Performance",
    title: "Edge-based Validation",
    problem: "Centralized policy evaluation adds unacceptable latency (100ms+) for global agents.",
    solution: "Compile the SafeLine evaluation engine to WebAssembly and distribute it via Edge runtimes (e.g., Cloudflare Workers).",
    impact: "Sub-10ms policy evaluation globally.",
    difficulty: "High",
    priority: "Low",
    status: "Concept",
    icon: Zap
  },
  {
    id: "f5",
    category: "Enterprise",
    title: "Compliance Policy Packs",
    problem: "Enterprises spend months translating SOC2, HIPAA, and GDPR into technical agent guardrails.",
    solution: "Pre-built, certified Rego rulesets that enforce standard compliance frameworks out-of-the-box.",
    impact: "Drastically reduces integration time and auditing costs.",
    difficulty: "Medium",
    priority: "High",
    status: "Planned",
    icon: Shield
  }
];

export default function DocsFutureScope() {
  const categories = Array.from(new Set(IDEAS.map(i => i.category)));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <h1 className="text-4xl font-semibold text-[#0F172A] mb-4">Future Scope</h1>
      <p className="text-lg text-[#64748B] mb-8">
        Exploration areas, research topics, and planned architectural expansions.
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-12">
        <p className="text-sm text-amber-800 m-0 font-medium flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Note: These items represent concepts and features that are currently under research or planned. They are not yet available in the stable release.
        </p>
      </div>

      <div className="space-y-16">
        {categories.map(category => (
          <div key={category}>
            <h2 className="text-2xl font-semibold text-[#0F172A] mb-6 pb-2 border-b border-[#E2E8F0]">{category}</h2>
            
            <div className="grid gap-6">
              {IDEAS.filter(i => i.category === category).map(idea => (
                <div key={idea.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                        <idea.icon className="w-5 h-5 text-[#64748B]" />
                      </div>
                      <h3 className="text-xl font-semibold text-[#0F172A] m-0">{idea.title}</h3>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md border
                        ${idea.status === 'Concept' ? 'bg-slate-50 text-slate-600 border-slate-200' : ''}
                        ${idea.status === 'Research' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                        ${idea.status === 'Planned' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                        ${idea.status === 'Experimental' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                      `}>
                        {idea.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <span className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">The Problem</span>
                        <p className="text-[#475569] text-sm leading-relaxed m-0">{idea.problem}</p>
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">Proposed Solution</span>
                        <p className="text-[#475569] text-sm leading-relaxed m-0">{idea.solution}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                      <div>
                        <span className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Expected Impact</span>
                        <span className="text-[#0F172A] text-sm font-medium">{idea.impact}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#E2E8F0]">
                        <div>
                          <span className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Difficulty</span>
                          <span className="text-[#0F172A] text-sm">{idea.difficulty}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Priority</span>
                          <span className="text-[#0F172A] text-sm">{idea.priority}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
