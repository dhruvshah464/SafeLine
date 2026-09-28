import { useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion, useScroll } from 'framer-motion';
import Lenis from 'lenis';
import { useOpenTelemetry } from './telemetry';

import Navigation from './components/layout/Navigation';
import Hero from './components/sections/Hero';
import Footer from './components/layout/Footer';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load below-the-fold sections for performance optimization
const Architecture = lazy(() => import('./components/sections/Architecture'));
const Playground = lazy(() => import('./components/playground/PipelinePlayground'));
const DocsLayout = lazy(() => import('./pages/DocsLayout'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function LandingPage() {
  return (
    <main className="flex flex-col relative w-full overflow-hidden">
      <div id="overview">
        <Hero />
      </div>
      <Suspense fallback={<div className="h-32" />}>
        <Architecture />
        <div id="playground">
          <Playground />
        </div>
      </Suspense>
    </main>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  const { trackPageView } = useOpenTelemetry();

  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(pathname);
  }, [pathname, trackPageView]);

  return null;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <ErrorBoundary resetKeys={[location.pathname]} name="AppRoutesBoundary">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs/*" element={
          <Suspense fallback={<div className="h-screen bg-white" />}>
            <DocsLayout />
          </Suspense>
        } />
        <Route path="/admin" element={
          <Suspense fallback={<div className="h-screen bg-white" />}>
            <AdminDashboard />
          </Suspense>
        } />
      </Routes>
    </ErrorBoundary>
  );
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);
  
  // Track scroll progress across the whole page
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <BrowserRouter>
      <ScrollToTop />
      <motion.div 
        ref={containerRef}
        className="min-h-screen selection:bg-blue-500/20 bg-[#FCFCFD] text-[#0F172A] transition-colors duration-0 flex flex-col"
      >
        <Navigation scrollYProgress={scrollYProgress} />
        
        <div className="flex-1">
          <AppRoutes />
        </div>
        
        <Footer />
      </motion.div>
    </BrowserRouter>
  );
}

export default App;
