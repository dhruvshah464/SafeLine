import { motion, useTransform, MotionValue } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface NavigationProps {
  scrollYProgress: MotionValue<number>;
}

export default function Navigation({ scrollYProgress }: NavigationProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  // Navigation background turns glassy as you scroll past hero
  const navBg = useTransform(
    scrollYProgress,
    [0, 0.05],
    ["rgba(252, 252, 253, 0)", "rgba(252, 252, 253, 0.85)"]
  );

  const navBorder = useTransform(
    scrollYProgress,
    [0, 0.05],
    ["rgba(15, 23, 42, 0)", "rgba(15, 23, 42, 0.06)"]
  );

  const backdropFilter = useTransform(
    scrollYProgress,
    [0, 0.05],
    ["blur(0px)", "blur(24px)"]
  );

  return (
    <motion.nav
      role="navigation"
      aria-label="Main Navigation"
      style={{
        backgroundColor: isHome ? navBg : "rgba(255, 255, 255, 1)",
        borderColor: isHome ? navBorder : "rgba(226, 232, 240, 1)",
        backdropFilter: isHome ? backdropFilter : "blur(0px)",
        WebkitBackdropFilter: isHome ? backdropFilter : "blur(0px)",
      }}
      className="fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-0 ease-cinematic text-[#0F172A]"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 cursor-pointer group" aria-label="SafeLine Home">
          <ShieldCheck className="w-5 h-5 text-blue-600 opacity-90 group-hover:opacity-100 transition-opacity duration-500 ease-cinematic" aria-hidden="true" />
          <span className="font-semibold text-[15px] tracking-tight">SafeLine</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-[13px] font-medium tracking-wide">
          {['Overview', 'Architecture', 'Playground'].map((item) => (
            <a key={item} href={`/#${item.toLowerCase()}`} className="opacity-60 hover:opacity-100 transition-opacity duration-300 ease-smooth" aria-label={`Navigate to ${item}`}>
              {item}
            </a>
          ))}
          <Link to="/docs" className="opacity-60 hover:opacity-100 transition-opacity duration-300 ease-smooth" aria-label="Documentation">
            Documentation
          </Link>
          <Link to="/admin" className="opacity-60 hover:opacity-100 transition-opacity duration-300 ease-smooth" aria-label="Admin Dashboard">
            Admin
          </Link>
          <a href="https://github.com/dhruvshah464/SafeLine" target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity duration-300 ease-smooth" aria-label="GitHub Repository">
            GitHub
          </a>
        </div>

        <div className="flex items-center gap-6">
          <span className="hidden md:block text-[13px] font-mono opacity-60">License: Apache 2.0</span>
          <button 
            aria-label="View Source Code"
            className="h-8 px-4 rounded-full text-[13px] font-medium bg-[#0F172A] text-white hover:bg-blue-600 hover:scale-[1.02] active:scale-100 transition-all duration-300 ease-cinematic shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            View Source
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
