import { motion } from 'framer-motion';
import { ArrowRight, Terminal } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative w-full min-h-[100vh] flex flex-col items-center justify-center overflow-hidden pt-24 pb-16">
      {/* Background Grid & Particles */}
      <div className="absolute inset-0 bg-grid-light opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#FCFCFD] via-transparent to-[#F1F5F9] pointer-events-none" />
      
      {/* Ambient soft glow */}
      <motion.div 
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/10 rounded-[100%] blur-[120px] pointer-events-none" 
      />
      
      <div className="max-w-7xl mx-auto px-6 w-full flex flex-col items-center text-center z-10 relative pt-20">
        <motion.div
          initial={{ opacity: 0, filter: 'blur(10px)', y: 30 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50/50 text-blue-700 text-[11px] font-semibold tracking-widest uppercase mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            For Developers Building AI Agents
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-[72px] lg:text-[84px] font-semibold tracking-tight leading-[1.05] text-balance text-[#0F172A] max-w-5xl">
            Prevent unsafe AI actions <br/>
            <span className="text-[#64748B] font-light">before execution.</span>
          </h1>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-[17px] md:text-[20px] text-[#475569] max-w-2xl leading-[1.6] font-light tracking-wide mt-8 mb-12"
        >
          The security and compliance layer that sits between AI agents and real-world systems. Intercept, validate, and audit every sensitive action before it reaches production.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <a href="https://github.com/dhruvshah464/SafeLine" target="_blank" rel="noopener noreferrer" className="h-14 px-8 rounded-full bg-[#0F172A] text-white text-[15px] font-medium hover:scale-[1.02] hover:bg-blue-600 active:scale-100 transition-all duration-500 ease-cinematic flex items-center gap-2 group shadow-premium">
            View on GitHub
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-500 ease-cinematic" />
          </a>
          <a href="#playground" className="h-14 px-8 rounded-full border border-[#E2E8F0] bg-white text-[#475569] text-[15px] font-medium hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all duration-500 ease-cinematic flex items-center gap-2 shadow-sm">
            <Terminal className="w-4 h-4 opacity-70" />
            Live Playground
          </a>
        </motion.div>
      </div>
    </section>
  );
}
