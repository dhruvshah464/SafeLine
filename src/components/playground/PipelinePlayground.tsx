import React, { useState, useEffect } from 'react';
import { SCENARIOS, simulator, Scenario, ValidationResponse } from '../../services/simulation';
import { Play, RotateCcw, ShieldAlert, ShieldCheck, FileText, Database, Shield, Lock, ChevronRight, Send, Server, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Chapter = 
  | 'LANDING'
  | 'CREATED'
  | 'INTERCEPTED'
  | 'RULES'
  | 'PII'
  | 'AUDIT'
  | 'DECISION'
  | 'PRODUCTION';

const CHAPTERS: Chapter[] = [
  'CREATED',
  'INTERCEPTED',
  'RULES',
  'PII',
  'AUDIT',
  'DECISION',
  'PRODUCTION'
];

const CHAPTER_INFO: Record<string, any> = {
  CREATED: {
    title: 'Request Created', icon: Send,
    what: 'The AI Agent formulated an API request to perform an action.',
    why: 'Autonomous agents need to interact with external tools and APIs to accomplish their goals.',
    next: 'The request leaves the agent and heads towards your production infrastructure.',
    color: 'text-slate-400', bg: 'bg-slate-500/20'
  },
  INTERCEPTED: {
    title: 'Request Intercepted', icon: Network,
    what: 'SafeLine paused the request before it could reach its destination.',
    why: 'To ensure the AI agent is not doing anything dangerous, non-compliant, or unauthorized.',
    next: 'The request enters the SafeLine Compliance Pipeline.',
    color: 'text-indigo-400', bg: 'bg-indigo-500/20'
  },
  RULES: {
    title: 'Rules Checked', icon: FileText,
    what: 'SafeLine compared this request against your organization\'s security rules.',
    why: 'To prevent unauthorized actions, such as deleting databases or transferring large sums of money.',
    next: 'We now check if the payload contains any sensitive user data.',
    color: 'text-amber-400', bg: 'bg-amber-500/20'
  },
  PII: {
    title: 'Sensitive Data Protected', icon: Lock,
    what: 'SafeLine searched the request for sensitive information such as emails, phone numbers, API keys, and customer data.',
    why: 'To ensure AI agents do not accidentally leak personally identifiable information to third-party APIs.',
    next: 'SafeLine generates a cryptographic receipt of this transaction.',
    color: 'text-blue-400', bg: 'bg-blue-500/20'
  },
  AUDIT: {
    title: 'Audit Recorded', icon: Database,
    what: 'SafeLine created a tamper-proof security record so this action can always be traced later.',
    why: 'Regulated environments require mathematical proof of every action an AI takes.',
    next: 'SafeLine makes a final routing decision based on the previous checks.',
    color: 'text-emerald-400', bg: 'bg-emerald-500/20'
  },
  DECISION: {
    title: 'Final Decision', icon: Shield,
    what: 'SafeLine computes whether the request is safe to proceed.',
    why: 'To enforce the security boundary. Violations are blocked, safe requests are permitted.',
    next: 'Depending on the decision, the request is either dropped or forwarded to production.',
    color: 'text-purple-400', bg: 'bg-purple-500/20'
  },
  PRODUCTION: {
    title: 'Reaches Production', icon: Server,
    what: 'The sanitized, verified request arrives at your actual infrastructure.',
    why: 'SafeLine operates invisibly; the target API simply sees a valid, safe request.',
    next: 'The journey is complete.',
    color: 'text-slate-400', bg: 'bg-slate-500/20'
  }
};

export default function PipelinePlayground() {
  const [currentChapter, setCurrentChapter] = useState<Chapter>('LANDING');
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [executionResult, setExecutionResult] = useState<ValidationResponse | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [chapterIndex, setChapterIndex] = useState(-1);

  const startJourney = async () => {
    setCurrentChapter('CREATED');
    setChapterIndex(0);
    // Execute scenario in background
    const result = await simulator.executeScenario(selectedScenario, selectedScenario.request.payload);
    setExecutionResult(result);
    setIsPlaying(true);
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying && chapterIndex >= 0) {
      if (chapterIndex < CHAPTERS.length - 1) {
        
        // If decision is DENY, we shouldn't reach PRODUCTION.
        if (CHAPTERS[chapterIndex] === 'DECISION' && executionResult?.decision === 'DENY') {
          setIsPlaying(false);
          return;
        }

        timer = setTimeout(() => {
          setChapterIndex(prev => prev + 1);
          setCurrentChapter(CHAPTERS[chapterIndex + 1]);
        }, 6000); // 6 seconds per chapter
      } else {
        setIsPlaying(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, chapterIndex, executionResult]);

  const renderLiveContext = () => {
    if (!executionResult) return null;
    
    switch(currentChapter) {
      case 'CREATED':
      case 'INTERCEPTED':
        return (
          <div className="mt-8 bg-[#0F172A] border border-slate-800 rounded-xl p-6 max-w-5xl mx-auto w-full">
            <div className="text-[11px] font-mono text-slate-500 mb-4 uppercase tracking-widest">Intercepted Payload</div>
            <pre className="text-sm text-blue-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(selectedScenario.request.payload, null, 2)}
            </pre>
          </div>
        );
      case 'RULES':
        return (
          <div className="mt-8 bg-[#0F172A] border border-slate-800 rounded-xl p-6 max-w-5xl mx-auto w-full space-y-4">
            <div className="text-[11px] font-mono text-slate-500 mb-2 uppercase tracking-widest">Policy Evaluation Engine</div>
            {executionResult.evaluations.map(rule => (
              <div key={rule.ruleId} className={`p-4 rounded-xl border ${rule.passed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/30'} flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${rule.passed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    {rule.passed ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> : <ShieldAlert className="w-5 h-5 text-red-500" />}
                  </div>
                  <div>
                    <span className={`text-base font-semibold block mb-1 ${rule.passed ? 'text-emerald-400' : 'text-red-400'}`}>{rule.name}</span>
                    <span className="text-xs text-slate-400 font-mono">ID: {rule.ruleId}</span>
                  </div>
                </div>
                <div className="text-xs font-mono text-slate-500 bg-[#0B1120] px-3 py-1.5 rounded-lg border border-slate-800">{rule.latencyMs}ms</div>
              </div>
            ))}
          </div>
        );
      case 'PII':
        return (
          <div className="mt-8 bg-[#0F172A] border border-slate-800 rounded-xl p-6 max-w-5xl mx-auto w-full">
            <div className="text-[11px] font-mono text-slate-500 mb-4 uppercase tracking-widest">Sensitive Data Scan</div>
            {executionResult.piiFindings.length > 0 ? (
               <div className="space-y-6">
                 <div className="flex flex-wrap gap-3">
                   {executionResult.piiFindings.map(f => (
                     <div key={f.type} className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-mono border border-blue-500/20 flex items-center gap-2">
                       <Lock className="w-4 h-4" /> Found: {f.type.toUpperCase()}
                     </div>
                   ))}
                 </div>
                 <div className="h-px w-full bg-slate-800" />
                 <div>
                   <div className="text-[11px] font-mono text-slate-500 mb-3 uppercase tracking-widest">Redacted Safe Payload</div>
                   <pre className="text-sm text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap bg-[#0B1120] p-4 rounded-xl border border-slate-800">
                     {JSON.stringify(executionResult.redactedPayload, null, 2)}
                   </pre>
                 </div>
               </div>
            ) : (
               <div className="text-sm text-slate-400 flex items-center gap-2 py-4">
                 <ShieldCheck className="w-5 h-5 text-emerald-500" /> No sensitive data detected. Payload remains unchanged.
               </div>
            )}
          </div>
        );
      case 'AUDIT':
        return (
          <div className="mt-8 bg-[#0F172A] border border-slate-800 rounded-xl p-12 max-w-5xl mx-auto w-full flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent pointer-events-none" />
            <Database className="w-16 h-16 text-emerald-500 mb-6 opacity-80" />
            <div className="text-[11px] font-mono text-emerald-500/50 mb-3 uppercase tracking-widest">Cryptographic Receipt Generated</div>
            <div className="text-xl md:text-2xl text-emerald-400 font-mono break-all text-center max-w-3xl leading-relaxed relative z-10">
              {executionResult.auditHash}
            </div>
          </div>
        );
      case 'DECISION':
        const isDenied = executionResult.decision === 'DENY';
        return (
          <div className="mt-8 max-w-5xl mx-auto w-full">
             <div className={`rounded-3xl p-10 border flex flex-col md:flex-row items-center gap-8 ${isDenied ? 'bg-red-950/20 border-red-500/30' : 'bg-emerald-950/20 border-emerald-500/30'}`}>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 shrink-0 ${isDenied ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'bg-emerald-500/20 border-emerald-500 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]'}`}>
                  {isDenied ? <ShieldAlert className="w-12 h-12" /> : <ShieldCheck className="w-12 h-12" />}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-4xl font-bold text-white mb-4 tracking-tight">{isDenied ? 'Blocked' : 'Allowed'}</h3>
                  {isDenied ? (
                    <>
                      <p className="text-lg text-red-200 mb-4 leading-relaxed">This request violated company policies and was intercepted before reaching production.</p>
                      
                      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-5 mt-4">
                        <div className="text-[11px] font-bold uppercase tracking-widest text-red-400 mb-2">Recommendation</div>
                        <div className="text-sm text-red-200">
                          {executionResult.evaluations.find(r => !r.passed)?.name} triggered a violation. Reduce the parameters or update the policy constraints.
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-lg text-emerald-200 leading-relaxed">This request passed all security checks, was safely audited, and is authorized to proceed to your infrastructure.</p>
                  )}
                </div>
             </div>
          </div>
        );
      case 'PRODUCTION':
        return (
          <div className="mt-8 max-w-5xl mx-auto w-full flex flex-col items-center justify-center py-16 bg-gradient-to-b from-[#0F172A] to-[#0B1120] border border-slate-800 rounded-3xl relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />
             <div className="w-24 h-24 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-8 relative z-10 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
               <Server className="w-12 h-12 text-blue-400" />
             </div>
             <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">Request Delivered</h3>
             <p className="text-lg text-slate-400">The external API received the secure, validated payload.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="bg-[#0B1120] min-h-screen text-white flex flex-col pt-16 relative" id="playground">
      
      {/* Header / Toolbar */}
      <div className="h-16 border-b border-white/5 px-8 flex items-center justify-between shrink-0 bg-[#0F172A]/80 backdrop-blur-xl z-30 sticky top-16">
        <div className="font-semibold tracking-tight text-white flex items-center gap-3 text-lg">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          SafeLine Journey
        </div>
        
        {currentChapter !== 'LANDING' && (
          <div className="flex items-center gap-4">
            <select 
              className="bg-[#1E293B] border border-slate-700 text-sm rounded-lg px-4 py-2 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
              value={selectedScenario.id}
              onChange={(e) => setSelectedScenario(SCENARIOS.find(s => s.id === e.target.value)!)}
              disabled={isPlaying}
            >
              {SCENARIOS.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button 
              onClick={() => {
                setIsPlaying(false);
                setCurrentChapter('LANDING');
                setChapterIndex(-1);
                setExecutionResult(null);
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
            >
              <RotateCcw className="w-4 h-4" /> Reset Journey
            </button>
          </div>
        )}
      </div>

      {currentChapter === 'LANDING' ? (
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/15 via-[#0B1120] to-[#0B1120] pointer-events-none" />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 max-w-3xl text-center px-6"
          >
            <div className="w-24 h-24 bg-blue-500/10 border border-blue-500/30 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-[0_0_60px_rgba(59,130,246,0.15)] relative">
               <div className="absolute inset-0 border border-blue-400/20 rounded-3xl animate-ping opacity-20" />
               <Play className="w-10 h-10 text-blue-400 translate-x-1" />
            </div>
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-8 leading-tight">
              Let's Follow <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">One Request</span>
            </h2>
            <p className="text-xl md:text-2xl text-slate-400 mb-12 leading-relaxed max-w-2xl mx-auto">
              See how SafeLine protects AI agents in real time. Every request passes through multiple security checks before it reaches your infrastructure.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={startJourney}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold text-lg transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] flex items-center gap-3 active:scale-95"
              >
                Start Guided Journey <ChevronRight className="w-5 h-5" />
              </button>
              
              <div className="relative group">
                <select 
                  className="px-8 py-4 bg-[#1E293B] border border-slate-700 text-slate-300 rounded-full font-medium hover:bg-slate-800 focus:outline-none focus:border-slate-500 appearance-none text-center cursor-pointer min-w-[280px] transition-all"
                  value={selectedScenario.id}
                  onChange={(e) => setSelectedScenario(SCENARIOS.find(s => s.id === e.target.value)!)}
                >
                  {SCENARIOS.map(s => (
                    <option key={s.id} value={s.id}>Scenario: {s.name}</option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-slate-300 transition-colors">
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-32">
          
          {/* Progress Bar Top */}
          <div className="w-full bg-[#0F172A]/50 border-b border-slate-800/50 py-6 overflow-x-auto">
            <div className="flex items-center justify-center gap-0 min-w-max px-8 mx-auto">
              {CHAPTERS.map((chap, idx) => {
                const isPast = chapterIndex > idx;
                const isCurrent = chapterIndex === idx;
                const info = CHAPTER_INFO[chap];
                return (
                   <div key={chap} className="flex items-center">
                     <div className={`flex items-center justify-center px-5 py-2 rounded-full border text-[13px] font-semibold transition-all duration-700 whitespace-nowrap ${
                       isCurrent ? 'bg-blue-900/40 border-blue-500 text-blue-400 scale-105 shadow-[0_0_20px_rgba(59,130,246,0.2)]' :
                       isPast ? 'bg-[#1E293B] border-slate-700 text-slate-300' :
                       'bg-[#0B1120] border-slate-800 text-slate-600'
                     }`}>
                       {info.title}
                     </div>
                     {idx < CHAPTERS.length - 1 && (
                       <div className="w-8 h-[2px] mx-2 bg-slate-800 relative overflow-hidden rounded-full">
                         {(isPast || isCurrent) && (
                           <motion.div 
                             className="absolute inset-0 bg-blue-500"
                             initial={{ x: '-100%' }}
                             animate={{ x: isPast ? '0%' : (isCurrent ? '0%' : '-100%') }}
                             transition={{ duration: 6, ease: "linear" }}
                           />
                         )}
                       </div>
                     )}
                   </div>
                )
              })}
            </div>
          </div>

          {/* Visual Pipeline Stage */}
          <div className="w-full max-w-6xl mx-auto mt-20 mb-16 relative px-8 hidden lg:block">
            <div className="flex items-center justify-between relative z-10">
               {CHAPTERS.map((chap, idx) => {
                 const isPast = chapterIndex > idx;
                 const isCurrent = chapterIndex === idx;
                 const nodeInfo = CHAPTER_INFO[chap];
                 const Icon = nodeInfo.icon;
                 
                 return (
                   <React.Fragment key={chap}>
                     <div className="relative flex flex-col items-center">
                       <motion.div 
                         animate={isCurrent ? { scale: 1.15, y: -5 } : { scale: 1, y: 0 }}
                         className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-700 relative ${
                           isCurrent ? `${nodeInfo.bg} ${nodeInfo.color} border-current shadow-[0_0_40px_currentColor]` :
                           isPast ? 'bg-[#1E293B] border-slate-600 text-slate-400' :
                           'bg-[#0F172A] border-slate-800 text-slate-700'
                         }`}
                       >
                         <Icon className="w-7 h-7" />
                         {isCurrent && (
                           <motion.div 
                             className="absolute inset-0 rounded-2xl border-2 border-white/30"
                             initial={{ opacity: 1, scale: 1 }}
                             animate={{ opacity: 0, scale: 1.5 }}
                             transition={{ duration: 1.5, repeat: Infinity }}
                           />
                         )}
                       </motion.div>
                     </div>
                     
                     {idx < CHAPTERS.length - 1 && (
                       <div className="flex-1 h-[3px] bg-slate-800 relative mx-4 rounded-full overflow-hidden">
                         {(isPast || (isCurrent && isPlaying)) && (
                           <motion.div 
                             className="absolute inset-0 bg-blue-500"
                             initial={{ x: '-100%' }}
                             animate={{ x: isPast ? '0%' : '0%' }}
                             transition={{ duration: isPast ? 0 : 6, ease: "linear" }}
                           />
                         )}
                         {isCurrent && isPlaying && (
                           <motion.div 
                             className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,1)] z-20"
                             initial={{ left: '0%' }}
                             animate={{ left: '100%' }}
                             transition={{ duration: 6, ease: "linear" }}
                           />
                         )}
                       </div>
                     )}
                   </React.Fragment>
                 )
               })}
            </div>
          </div>
          
          {/* Story Answers & Context */}
          <div className="max-w-5xl mx-auto w-full px-6 lg:mt-0 mt-12">
             <AnimatePresence mode="wait">
               <motion.div 
                 key={currentChapter}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 transition={{ duration: 0.5, ease: "easeOut" }}
               >
                 {/* The 3 Cards */}
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-[#1E293B] border border-slate-700/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col group hover:border-slate-600 transition-colors">
                      <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
                      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                         What is happening?
                      </div>
                      <div className="text-lg text-white font-medium leading-relaxed flex-1">{CHAPTER_INFO[currentChapter].what}</div>
                    </div>
                    <div className="bg-[#1E293B] border border-slate-700/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col group hover:border-slate-600 transition-colors">
                      <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
                      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                         Why is SafeLine doing this?
                      </div>
                      <div className="text-lg text-slate-300 leading-relaxed flex-1">{CHAPTER_INFO[currentChapter].why}</div>
                    </div>
                    <div className="bg-[#1E293B] border border-slate-700/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col group hover:border-slate-600 transition-colors">
                      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                         What happens next?
                      </div>
                      <div className="text-lg text-slate-400 leading-relaxed flex-1">{CHAPTER_INFO[currentChapter].next}</div>
                    </div>
                 </div>
                 
                 {/* Live Data Render */}
                 {renderLiveContext()}
                 
                 {/* Manual Next Button (if paused or finished) */}
                 {(!isPlaying && chapterIndex >= 0 && chapterIndex < CHAPTERS.length - 1 && !(CHAPTERS[chapterIndex] === 'DECISION' && executionResult?.decision === 'DENY')) && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-16 flex justify-center"
                    >
                      <button 
                        onClick={() => {
                          setChapterIndex(prev => prev + 1);
                          setCurrentChapter(CHAPTERS[chapterIndex + 1]);
                        }}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold text-lg transition-all shadow-xl hover:shadow-2xl flex items-center gap-3 active:scale-95"
                      >
                        Continue to {CHAPTER_INFO[CHAPTERS[chapterIndex + 1]].title} <ChevronRight className="w-5 h-5" />
                      </button>
                    </motion.div>
                 )}
                 
                 {(!isPlaying && (chapterIndex === CHAPTERS.length - 1 || (CHAPTERS[chapterIndex] === 'DECISION' && executionResult?.decision === 'DENY'))) && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-16 flex flex-col items-center justify-center gap-6"
                    >
                      <div className="text-slate-400 font-medium">The journey is complete.</div>
                      <button 
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentChapter('LANDING');
                          setChapterIndex(-1);
                          setExecutionResult(null);
                        }}
                        className="px-8 py-4 bg-[#1E293B] hover:bg-slate-800 text-white rounded-full font-semibold text-lg transition-all shadow-xl flex items-center gap-3 border border-slate-700 active:scale-95"
                      >
                        <RotateCcw className="w-5 h-5" /> Start New Journey
                      </button>
                    </motion.div>
                 )}

               </motion.div>
             </AnimatePresence>
          </div>
        </div>
      )}
    </section>
  );
}
