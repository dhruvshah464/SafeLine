import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer role="contentinfo" aria-label="Footer" className="py-12 border-t border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] text-[13px] text-center font-medium tracking-wide">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
        <span>Released under Apache 2.0 License. An Open Source Project.</span>
        <nav aria-label="Footer Navigation" className="flex gap-8 mt-6 md:mt-0">
          <a href="/#overview" className="hover:text-[#0F172A] transition-colors duration-300 ease-smooth focus:outline-none focus:ring-2 focus:ring-[#0F172A] rounded">Overview</a>
          <a href="/#architecture" className="hover:text-[#0F172A] transition-colors duration-300 ease-smooth focus:outline-none focus:ring-2 focus:ring-[#0F172A] rounded">Architecture</a>
          <a href="/#playground" className="hover:text-[#0F172A] transition-colors duration-300 ease-smooth focus:outline-none focus:ring-2 focus:ring-[#0F172A] rounded">Playground</a>
          <Link to="/docs" className="hover:text-[#0F172A] transition-colors duration-300 ease-smooth focus:outline-none focus:ring-2 focus:ring-[#0F172A] rounded">Documentation</Link>
          <a href="https://github.com/dhruvshah464/SafeLine" target="_blank" rel="noopener noreferrer" className="hover:text-[#0F172A] transition-colors duration-300 ease-smooth focus:outline-none focus:ring-2 focus:ring-[#0F172A] rounded">GitHub</a>
        </nav>
      </div>
    </footer>
  );
}
