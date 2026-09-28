import { useState, useEffect, Suspense, lazy } from 'react';
import { NavLink, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Menu, X, BookOpen, Settings, ShieldAlert, EyeOff, Activity, Fingerprint, Layers, Puzzle, FileJson, Code2, HeartHandshake, Map, Lightbulb, ChevronRight, ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

const DocsIntroduction = lazy(() => import('../components/docs/DocsIntroduction'));
const DocsGettingStarted = lazy(() => import('../components/docs/DocsGettingStarted'));
const DocsArchitecture = lazy(() => import('../components/docs/DocsArchitecture'));
const DocsComplianceEngine = lazy(() => import('../components/docs/DocsComplianceEngine'));
const DocsPIIDetection = lazy(() => import('../components/docs/DocsPIIDetection'));
const DocsAPIValidation = lazy(() => import('../components/docs/DocsAPIValidation'));
const DocsAuditTrail = lazy(() => import('../components/docs/DocsAuditTrail'));
const DocsConfiguration = lazy(() => import('../components/docs/DocsConfiguration'));
const DocsOpenClawIntegration = lazy(() => import('../components/docs/DocsOpenClawIntegration'));
const DocsAPIReference = lazy(() => import('../components/docs/DocsAPIReference'));
const DocsExamples = lazy(() => import('../components/docs/DocsExamples'));
const DocsContributing = lazy(() => import('../components/docs/DocsContributing'));
const DocsRoadmap = lazy(() => import('../components/docs/DocsRoadmap'));
const DocsFutureScope = lazy(() => import('../components/docs/DocsFutureScope'));

const SECTIONS = [
  {
    title: 'Overview',
    items: [
      { name: 'Introduction', path: '/docs/introduction', icon: BookOpen },
      { name: 'Getting Started', path: '/docs/getting-started', icon: Settings },
      { name: 'Architecture', path: '/docs/architecture', icon: Layers },
    ]
  },
  {
    title: 'Core Components',
    items: [
      { name: 'Compliance Engine', path: '/docs/compliance-engine', icon: ShieldAlert },
      { name: 'PII Detection', path: '/docs/pii-detection', icon: EyeOff },
      { name: 'API Validation', path: '/docs/api-validation', icon: Activity },
      { name: 'Audit Trail', path: '/docs/audit-trail', icon: Fingerprint },
    ]
  },
  {
    title: 'Integration',
    items: [
      { name: 'Configuration', path: '/docs/configuration', icon: FileJson },
      { name: 'OpenClaw Integration', path: '/docs/openclaw-integration', icon: Puzzle },
      { name: 'API Reference', path: '/docs/api-reference', icon: Code2 },
      { name: 'Examples', path: '/docs/examples', icon: Code2 },
    ]
  },
  {
    title: 'Project',
    items: [
      { name: 'Contributing', path: '/docs/contributing', icon: HeartHandshake },
      { name: 'Roadmap', path: '/docs/roadmap', icon: Map },
      { name: 'Future Scope', path: '/docs/future-scope', icon: Lightbulb },
    ]
  }
];

const FLAT_ROUTES = SECTIONS.flatMap(section => section.items.map(item => ({ ...item, section: section.title })));

function useHeadings() {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const location = useLocation();

  useEffect(() => {
    // Wait for the route transition and render
    const timer = setTimeout(() => {
      const elements = Array.from(document.querySelectorAll('main h2, main h3'));
      const newHeadings = elements.map(el => {
        if (!el.id) {
          el.id = el.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '';
        }
        return {
          id: el.id,
          text: el.textContent || '',
          level: el.tagName === 'H2' ? 2 : 3
        };
      });
      setHeadings(newHeadings);
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return headings;
}

function TableOfContents() {
  const headings = useHeadings();
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -80% 0px' }
    );

    headings.forEach((heading) => {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-[#0F172A] text-sm uppercase tracking-wider">On this page</h4>
      <ul className="space-y-2.5 text-[13px]">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? 'ml-4' : ''}>
            <a
              href={`#${heading.id}`}
              className={`block truncate transition-colors duration-200 ${
                activeId === heading.id 
                  ? 'text-blue-600 font-medium' 
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DocsLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentRouteIndex = FLAT_ROUTES.findIndex(r => r.path === location.pathname);
  const currentRoute = FLAT_ROUTES[currentRouteIndex];
  const prevRoute = currentRouteIndex > 0 ? FLAT_ROUTES[currentRouteIndex - 1] : null;
  const nextRoute = currentRouteIndex < FLAT_ROUTES.length - 1 ? FLAT_ROUTES[currentRouteIndex + 1] : null;

  return (
    <div className="flex flex-col min-h-screen bg-white relative">
      {/* Reading Progress */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-blue-600 origin-left z-[60]"
        style={{ scaleX }}
      />

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between mt-[64px]">
        <div className="font-semibold text-[#0F172A] flex items-center gap-2">
          Documentation
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSearchOpen(true)}
            className="p-2 text-[#64748B] hover:text-[#0F172A]"
          >
            <Search className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 -mr-2 text-[#64748B] hover:text-[#0F172A]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-[90rem] w-full mx-auto flex flex-col lg:flex-row mt-[64px] lg:mt-[64px] items-start">
        
        {/* Sidebar Navigation */}
        <AnimatePresence>
          {(mobileMenuOpen || window.innerWidth >= 1024) && (
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`
                fixed lg:sticky top-[124px] lg:top-[64px] z-30
                w-full lg:w-72 h-[calc(100vh-124px)] lg:h-[calc(100vh-64px)] 
                bg-white lg:bg-transparent
                border-r border-[#E2E8F0]
                overflow-y-auto px-6 py-8
                ${!mobileMenuOpen ? 'hidden lg:block' : 'block'}
              `}
            >
              <div className="hidden lg:block mb-8">
                <button 
                  onClick={() => setSearchOpen(true)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#64748B] hover:border-[#CBD5E1] transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Search className="w-4 h-4" />
                    <span>Search...</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono font-medium border border-[#E2E8F0] px-1.5 py-0.5 rounded bg-white">
                    <span className="text-[12px]">⌘</span>K
                  </div>
                </button>
              </div>

              <nav className="space-y-8 pb-12">
                {SECTIONS.map((section) => (
                  <div key={section.title}>
                    <h3 className="font-semibold text-[#0F172A] text-[13px] mb-3 tracking-tight">
                      {section.title}
                    </h3>
                    <ul className="space-y-1">
                      {section.items.map((item) => (
                        <li key={item.path}>
                          <NavLink
                            to={item.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) => `
                              flex items-center gap-3 px-3 py-2 text-[14px] rounded-lg
                              transition-colors duration-200
                              ${isActive 
                                ? 'bg-blue-50 text-blue-700 font-medium' 
                                : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'}
                            `}
                          >
                            <item.icon className={`w-4 h-4 ${location.pathname === item.path ? 'text-blue-600' : 'text-[#94A3B8]'}`} />
                            {item.name}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 px-6 py-8 lg:px-12 lg:py-12 bg-white flex flex-col items-center">
          <div className="w-full max-w-4xl relative">
            
            {/* Breadcrumbs */}
            {currentRoute && (
              <nav className="flex items-center text-sm text-[#64748B] mb-8 font-medium">
                <Link to="/docs" className="hover:text-[#0F172A] transition-colors">Documentation</Link>
                <ChevronRight className="w-4 h-4 mx-2 text-[#CBD5E1]" />
                <span>{currentRoute.section}</span>
                <ChevronRight className="w-4 h-4 mx-2 text-[#CBD5E1]" />
                <span className="text-[#0F172A]">{currentRoute.name}</span>
              </nav>
            )}

            <div className="prose prose-slate max-w-none prose-headings:tracking-tight prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-img:rounded-xl">
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <Routes>
                  <Route path="/" element={<Navigate to="/docs/introduction" replace />} />
                  <Route path="introduction" element={<DocsIntroduction />} />
                  <Route path="getting-started" element={<DocsGettingStarted />} />
                  <Route path="architecture" element={<DocsArchitecture />} />
                  <Route path="compliance-engine" element={<DocsComplianceEngine />} />
                  <Route path="pii-detection" element={<DocsPIIDetection />} />
                  <Route path="api-validation" element={<DocsAPIValidation />} />
                  <Route path="audit-trail" element={<DocsAuditTrail />} />
                  <Route path="configuration" element={<DocsConfiguration />} />
                  <Route path="openclaw-integration" element={<DocsOpenClawIntegration />} />
                  <Route path="api-reference" element={<DocsAPIReference />} />
                  <Route path="examples" element={<DocsExamples />} />
                  <Route path="contributing" element={<DocsContributing />} />
                  <Route path="roadmap" element={<DocsRoadmap />} />
                  <Route path="future-scope" element={<DocsFutureScope />} />
                </Routes>
              </Suspense>
            </div>

            {/* Pagination */}
            <div className="mt-16 pt-8 border-t border-[#E2E8F0] flex items-center justify-between gap-4">
              {prevRoute ? (
                <Link to={prevRoute.path} className="flex-1 flex flex-col items-start gap-1 p-4 rounded-xl border border-[#E2E8F0] hover:border-blue-300 hover:bg-blue-50/50 transition-colors group">
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Previous
                  </span>
                  <span className="font-medium text-[#0F172A]">{prevRoute.name}</span>
                </Link>
              ) : <div className="flex-1" />}

              {nextRoute ? (
                <Link to={nextRoute.path} className="flex-1 flex flex-col items-end gap-1 p-4 rounded-xl border border-[#E2E8F0] hover:border-blue-300 hover:bg-blue-50/50 transition-colors group text-right">
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                    Next <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="font-medium text-[#0F172A]">{nextRoute.name}</span>
                </Link>
              ) : <div className="flex-1" />}
            </div>
            
          </div>
        </main>

        {/* Right Sidebar (Table of Contents) */}
        <div className="hidden xl:block w-64 shrink-0 border-l border-[#E2E8F0] h-[calc(100vh-64px)] sticky top-[64px] overflow-y-auto px-6 py-12">
          <TableOfContents />
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <SearchModal onClose={() => setSearchOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const results = FLAT_ROUTES.filter(route => 
    route.name.toLowerCase().includes(query.toLowerCase()) || 
    route.section.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-premium border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[70vh]"
      >
        <div className="flex items-center px-4 py-3 border-b border-[#E2E8F0] shrink-0">
          <Search className="w-5 h-5 text-[#64748B]" />
          <input 
            type="text" 
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documentation..." 
            className="flex-1 bg-transparent border-none focus:outline-none px-3 py-2 text-[#0F172A] text-lg placeholder:text-[#94A3B8]"
          />
          <button 
            onClick={onClose}
            className="text-[10px] font-mono font-medium border border-[#E2E8F0] px-1.5 py-0.5 rounded bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]"
          >
            ESC
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 bg-[#F8FAFC]">
          {query === '' ? (
            <div className="p-8 flex flex-col items-center justify-center text-center">
              <Search className="w-8 h-8 text-[#CBD5E1] mb-3" />
              <p className="text-[#64748B] text-sm">Start typing to search across SafeLine documentation.</p>
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              {results.map((route, i) => (
                <Link
                  key={route.path}
                  to={route.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    i === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-white text-[#0F172A]'
                  }`}
                >
                  <route.icon className={`w-5 h-5 ${i === selectedIndex ? 'text-white' : 'text-[#64748B]'}`} />
                  <div>
                    <div className={`font-medium ${i === selectedIndex ? 'text-white' : 'text-[#0F172A]'}`}>
                      {route.name}
                    </div>
                    <div className={`text-xs ${i === selectedIndex ? 'text-blue-100' : 'text-[#64748B]'}`}>
                      {route.section}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-center">
              <p className="text-[#64748B] text-sm">No results found for "{query}"</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

