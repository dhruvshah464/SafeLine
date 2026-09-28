import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, PlayCircle, Cpu, Shield, FileText, Database, Cloud, X, ChevronRight, Activity, Zap, Layers, FileCode2, Share2, Cog } from 'lucide-react';

const NODES = [
  { 
    id: 'github', label: 'Developer Push', icon: Github, x: 100, y: 225, 
    color: 'text-slate-600', bg: 'bg-white', border: 'border-slate-200', 
    desc: 'Developer pushes agent configuration to repository. Triggers standard git hooks.',
    path: '.github/workflows/main.yml',
    details: {
      purpose: 'Entry point for agent logic and policy configuration updates.',
      responsibilities: ['Version control', 'PR reviews', 'Triggering CI/CD pipelines'],
      input: 'Developer commits (Code, Prompts, Config).',
      output: 'Git webhook event payload.',
      configuration: 'Standard Git repository settings and branch protections.',
      executionOrder: '1',
      executionFlow: 'Developer commits code -> Pushes to main -> Webhook fires to CI provider.',
      relatedFiles: ['.github/workflows/*.yml', 'src/agent/*'],
      dependencies: ['Git', 'GitHub / GitLab']
    },
    targets: ['actions']
  },
  { 
    id: 'actions', label: 'CI Pipeline', icon: PlayCircle, x: 280, y: 225, 
    color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', 
    desc: 'Automated CI/CD pipeline triggered by push. Boots isolated container.',
    path: 'scripts/ci-runner.sh',
    details: {
      purpose: 'Build and test the agent environment securely before deployment.',
      responsibilities: ['Dependency installation', 'Running unit tests', 'Building containers', 'Deploying to staging'],
      input: 'Git webhook payload.',
      output: 'Built and verified Docker container.',
      configuration: 'GitHub Actions YAML files defining steps and secrets.',
      executionOrder: '2',
      executionFlow: 'Webhook received -> Provision runner -> Execute pipeline -> Report status.',
      relatedFiles: ['.github/workflows/main.yml', 'scripts/ci-runner.sh'],
      dependencies: ['Docker', 'Node.js/Python Runtimes']
    },
    targets: ['openclaw']
  },
  { 
    id: 'openclaw', label: 'AI Agent', icon: Cpu, x: 460, y: 225, 
    color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', 
    desc: 'Autonomous agent attempts to execute deployment or infrastructure operations.',
    path: 'src/agent/openclaw.ts',
    details: {
      purpose: 'The autonomous LLM-driven entity making decisions and generating actions.',
      responsibilities: ['Context gathering', 'Reasoning', 'Tool selection', 'Action generation'],
      input: 'User prompt, environment context, tool schemas.',
      output: 'Formulated tool call (JSON payload).',
      configuration: 'System prompts, available tool schemas, and environment variables.',
      executionOrder: '3',
      executionFlow: 'Receive trigger -> Query LLM -> Parse tool call -> Dispatch network request.',
      relatedFiles: ['src/agent/openclaw.ts', 'src/prompts/system.txt'],
      dependencies: ['OpenAI / Anthropic / Gemini APIs']
    },
    targets: ['safeline']
  },
  { 
    id: 'safeline', label: 'SafeLine Proxy', icon: Shield, x: 700, y: 225, 
    color: 'text-white', bg: 'bg-[#0F172A]', border: 'border-slate-800', 
    desc: 'The core interception layer. Evaluates the agents requested action against company policies.',
    path: 'src/proxy/server.ts',
    details: {
      purpose: 'Intercept, analyze, and authorize all outbound actions from the autonomous agent.',
      responsibilities: ['Request interception', 'Payload unwrapping', 'Routing to compliance engines', 'Decision enforcement'],
      input: 'HTTP request from the AI Agent.',
      output: 'ALLOW or DENY HTTP response.',
      configuration: 'Proxy port, TLS certificates, engine routing tables.',
      executionOrder: '4',
      executionFlow: 'Intercept request -> Extract payload -> Fan out to Policy/PII engines -> Aggregate results -> Block or Forward.',
      relatedFiles: ['src/proxy/server.ts', 'src/proxy/middleware.ts'],
      dependencies: ['Express / Fastify']
    },
    targets: ['policies', 'pii', 'audit', 'production']
  },
  { 
    id: 'policies', label: 'Rules Engine', icon: FileText, x: 700, y: 70, 
    color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', 
    desc: 'Evaluates the payload against Open Policy Agent (OPA) Rego rules.',
    path: 'policies/financial.rego',
    details: {
      purpose: 'Determine if the requested action violates any business or security rules.',
      responsibilities: ['Schema validation', 'Role-based access checks', 'Business logic constraints'],
      input: 'JSON payload from SafeLine proxy.',
      output: 'Boolean allow/deny array with violation reasons.',
      configuration: 'Rego policy files and dynamic data bundles.',
      executionOrder: '5a',
      executionFlow: 'Receive payload -> Evaluate all .rego files -> Return boolean decision matrix.',
      relatedFiles: ['policies/financial.rego', 'policies/infrastructure.rego'],
      dependencies: ['Open Policy Agent (OPA)']
    },
    targets: []
  },
  { 
    id: 'pii', label: 'Sensitive Data Detection', icon: FileCode2, x: 880, y: 70, 
    color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', 
    desc: 'Scans the payload for PII and redacts it before auditing.',
    path: 'src/engine/pii.ts',
    details: {
      purpose: 'Prevent sensitive data leaks in audit trails or downstream systems.',
      responsibilities: ['Regex scanning', 'Entity recognition', 'Payload redaction'],
      input: 'JSON payload from SafeLine proxy.',
      output: 'Sanitized JSON payload and list of detected PII types.',
      configuration: 'Regex patterns and threshold confidence scores.',
      executionOrder: '5b',
      executionFlow: 'Receive payload -> Scan strings and nested objects -> Redact matches -> Return safe payload.',
      relatedFiles: ['src/engine/pii.ts', 'src/patterns/pii.json'],
      dependencies: ['RE2 Regex Engine']
    },
    targets: []
  },
  { 
    id: 'audit', label: 'Security Audit', icon: Database, x: 700, y: 380, 
    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', 
    desc: 'Cryptographically hashes and stores the request, evaluation, and decision.',
    path: 'src/audit/logger.ts',
    details: {
      purpose: 'Provide a tamper-proof historical record of all agent actions and compliance decisions.',
      responsibilities: ['Immutability hashing', 'Database insertion', 'Event sourcing'],
      input: 'Final decision, sanitized payload, and rule evaluation matrix.',
      output: 'SHA-256 Audit Hash.',
      configuration: 'Database connection strings and retention policies.',
      executionOrder: '6',
      executionFlow: 'Receive final decision context -> Generate SHA-256 hash -> Store in PostgreSQL -> Return receipt.',
      relatedFiles: ['src/audit/logger.ts', 'src/db/schema.sql'],
      dependencies: ['PostgreSQL', 'Crypto']
    },
    targets: []
  },
  { 
    id: 'production', label: 'Production API', icon: Cloud, x: 940, y: 225, 
    color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', 
    desc: 'The actual target system the agent is trying to interact with (AWS, Stripe, etc).',
    path: 'api.stripe.com',
    details: {
      purpose: 'The ultimate destination of the authorized action.',
      responsibilities: ['Executing the business action', 'Returning actual response'],
      input: 'The original (or sanitized) HTTP request.',
      output: 'The target API response.',
      configuration: 'N/A (External System)',
      executionOrder: '7',
      executionFlow: 'Receive forwarded request from SafeLine -> Execute -> Return response.',
      relatedFiles: [],
      dependencies: ['External Services']
    },
    targets: []
  }
];

const EDGES = NODES.flatMap(node => 
  node.targets.map(targetId => {
    const target = NODES.find(n => n.id === targetId)!;
    return {
      source: node.id,
      target: targetId,
      x1: node.x,
      y1: node.y,
      x2: target.x,
      y2: target.y
    };
  })
);

export default function Architecture() {
  const [selectedNode, setSelectedNode] = useState<typeof NODES[0] | null>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Helper to determine if a node is in the execution path of the selected node
  const isInExecutionPath = (nodeId: string) => {
    if (!selectedNode) return false;
    if (selectedNode.id === nodeId) return true;
    
    // Simple path checking for UI highlighting
    const getDescendants = (id: string, visited = new Set<string>()): Set<string> => {
      if (visited.has(id)) return visited;
      visited.add(id);
      const node = NODES.find(n => n.id === id);
      node?.targets.forEach(t => getDescendants(t, visited));
      return visited;
    };

    const getAncestors = (id: string, visited = new Set<string>()): Set<string> => {
      if (visited.has(id)) return visited;
      visited.add(id);
      NODES.filter(n => n.targets.includes(id)).forEach(n => getAncestors(n.id, visited));
      return visited;
    };

    const descendants = getDescendants(selectedNode.id);
    const ancestors = getAncestors(selectedNode.id);
    
    return descendants.has(nodeId) || ancestors.has(nodeId);
  };

  const getNodeOpacity = (nodeId: string) => {
    if (!selectedNode && !activeNode) return 1;
    if (selectedNode && isInExecutionPath(nodeId)) return 1;
    if (activeNode === nodeId) return 1;
    return 0.3;
  };

  const getEdgeOpacity = (source: string, target: string) => {
    if (!selectedNode && !activeNode) return 1;
    if (selectedNode && isInExecutionPath(source) && isInExecutionPath(target)) return 1;
    if (activeNode === source || activeNode === target) return 1;
    return 0.15;
  };

  const handleNodeClick = (node: typeof NODES[0]) => {
    setSelectedNode(node);
    setHasInteracted(true);
  };

  return (
    <>
      <section className="py-24 bg-[#FCFCFD] relative overflow-hidden" id="architecture">
        
        {/* Background Grid */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-[0.07] blur-[100px]"></div>
        </div>

        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 relative z-10 flex flex-col items-center">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-[32px] md:text-[40px] font-semibold text-[#0F172A] tracking-tight leading-tight mb-6">
              How SafeLine Works
            </h2>
            <p className="text-lg text-[#475569] leading-relaxed">
              An architectural breakdown of the interception proxy. Explore how autonomous agents are secured without modifying their internal logic.
            </p>
          </div>

          <div className="w-full flex flex-col xl:flex-row gap-8 items-start relative min-h-[600px]">
            
            {/* Interactive Canvas */}
            <div className="flex-1 w-full bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-x-auto relative h-[600px]">
              
              {!hasInteracted && (
                <div className="absolute inset-x-0 top-8 z-30 flex justify-center pointer-events-none">
                  <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-[#0F172A] text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4 text-amber-400" /> Click any component to explore how it works
                  </motion.div>
                </div>
              )}

              <div className="min-w-[1000px] h-[600px] relative mx-auto">
                {/* SVG Edges */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#CBD5E1" />
                    </marker>
                    <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#3B82F6" />
                    </marker>
                  </defs>

                  {EDGES.map((edge, i) => {
                    const isActive = selectedNode && isInExecutionPath(edge.source) && isInExecutionPath(edge.target);
                    const opacity = getEdgeOpacity(edge.source, edge.target);
                    const isDashed = edge.target === 'policies' || edge.target === 'audit' || edge.target === 'pii';

                    return (
                      <g key={i}>
                        <line
                          x1={`${(edge.x1 / 1000) * 100}%`}
                          y1={`${(edge.y1 / 450) * 100}%`}
                          x2={`${(edge.x2 / 1000) * 100}%`}
                          y2={`${(edge.y2 / 450) * 100}%`}
                          stroke={isActive ? '#3B82F6' : '#E2E8F0'}
                          strokeWidth={isActive ? 3 : 2}
                          strokeDasharray={isDashed ? '6,6' : 'none'}
                          markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                          className="transition-all duration-300"
                          style={{ opacity }}
                        />
                        {isActive && (
                          <motion.circle
                            r="4"
                            fill="#3B82F6"
                            initial={{ cx: `${(edge.x1 / 1000) * 100}%`, cy: `${(edge.y1 / 450) * 100}%` }}
                            animate={{ cx: `${(edge.x2 / 1000) * 100}%`, cy: `${(edge.y2 / 450) * 100}%` }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* HTML Nodes */}
                <div className="absolute inset-0">
                  {NODES.map((node) => {
                    const isSafeLine = node.id === 'safeline';
                    const isSelected = selectedNode?.id === node.id;
                    const sizeClass = isSafeLine ? 'w-20 h-20' : 'w-16 h-16';
                    const Icon = node.icon;
                    const opacity = getNodeOpacity(node.id);
                    
                    return (
                      <div 
                        key={node.id}
                        className="absolute flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
                        style={{ left: `${(node.x / 1000) * 100}%`, top: `${(node.y / 450) * 100}%`, opacity, transition: 'all 0.3s ease' }}
                        onMouseEnter={() => setActiveNode(node.id)}
                        onMouseLeave={() => setActiveNode(null)}
                        onClick={() => handleNodeClick(node as any)}
                      >
                        <motion.div 
                          whileHover={{ y: -5, scale: 1.05 }}
                          className={`${sizeClass} rounded-2xl ${node.bg} border ${isSelected ? 'border-blue-500 shadow-xl shadow-blue-500/20' : node.border} shadow-sm flex items-center justify-center relative z-10 transition-colors duration-300`}
                        >
                          <Icon className={`${isSafeLine ? 'w-8 h-8' : 'w-6 h-6'} ${node.color}`} />
                        </motion.div>
                        
                        <div className={`absolute ${isSafeLine ? 'top-24' : 'top-20'} whitespace-nowrap text-center`}>
                          <span className={`text-[13px] font-semibold ${isSafeLine ? 'text-[#0F172A]' : 'text-[#475569]'}`}>
                            {node.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Side Inspector Panel (VS Code Style) */}
            <AnimatePresence mode="wait">
              {selectedNode ? (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full xl:w-[420px] shrink-0 flex flex-col bg-white border border-[#E2E8F0] rounded-2xl shadow-xl overflow-hidden z-20 sticky top-24 max-h-[600px]"
                >
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-start justify-between bg-[#F8FAFC]">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${selectedNode.bg} border ${selectedNode.border}`}>
                          <selectedNode.icon className={`w-6 h-6 ${selectedNode.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#0F172A] text-lg leading-tight m-0">{selectedNode.label}</h3>
                          <div className="text-[12px] font-mono text-[#64748B] mt-1 bg-slate-200/50 px-2 py-0.5 rounded inline-block">{selectedNode.path}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedNode(null)}
                        className="p-2 -mr-2 -mt-2 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-[#E2E8F0] transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* Content Scroll */}
                    <div className="p-6 overflow-y-auto space-y-8 flex-1">
                      
                      <section>
                        <h4 className="flex items-center gap-2 text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                          <Activity className="w-4 h-4 text-blue-500" /> Purpose
                        </h4>
                        <p className="text-[#475569] text-sm leading-relaxed m-0 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          {selectedNode.details.purpose}
                        </p>
                      </section>

                      <section>
                        <h4 className="flex items-center gap-2 text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                          <Layers className="w-4 h-4 text-blue-500" /> Input & Output
                        </h4>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                           <div>
                              <span className="text-xs font-semibold text-slate-500 uppercase">Input:</span>
                              <p className="text-sm text-[#0F172A] mt-1">{selectedNode.details.input}</p>
                           </div>
                           <div className="h-px bg-slate-200 w-full" />
                           <div>
                              <span className="text-xs font-semibold text-slate-500 uppercase">Output:</span>
                              <p className="text-sm text-[#0F172A] mt-1">{selectedNode.details.output}</p>
                           </div>
                        </div>
                      </section>
                      
                      <section>
                        <h4 className="flex items-center gap-2 text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                          <Cog className="w-4 h-4 text-blue-500" /> Responsibilities
                        </h4>
                        <ul className="space-y-2.5 m-0 p-0 list-none">
                          {selectedNode.details.responsibilities.map(r => (
                            <li key={r} className="flex items-start gap-3 text-sm text-[#475569]">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section>
                        <h4 className="flex items-center gap-2 text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                          <Share2 className="w-4 h-4 text-blue-500" /> Execution Order: {selectedNode.details.executionOrder}
                        </h4>
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm font-mono text-[#0F172A] space-y-2">
                          {selectedNode.details.executionFlow.split(' -> ').map((step, i) => (
                            <div key={i} className="flex items-center gap-2">
                              {i > 0 && <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />}
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                      
                      <section className="pt-6 border-t border-[#E2E8F0]">
                        <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Configuration & Files</h4>
                        <p className="text-sm text-[#475569] mb-4">{selectedNode.details.configuration}</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedNode.details.relatedFiles.map(f => (
                            <code key={f} className="text-xs bg-slate-100 border border-slate-200 px-2 py-1 rounded text-slate-700">{f}</code>
                          ))}
                        </div>
                      </section>

                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full xl:w-[420px] shrink-0 hidden xl:flex flex-col bg-[#F8FAFC] border border-[#E2E8F0] border-dashed rounded-2xl items-center justify-center p-8 text-center min-h-[600px]"
                >
                  <div className="w-20 h-20 rounded-full bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center mb-6">
                    <Shield className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#0F172A] mb-3">Architecture Inspector</h3>
                  <p className="text-base text-[#64748B] max-w-[280px]">
                    Click on any node in the diagram to inspect its purpose, responsibilities, and execution flow.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </>
  );
}
