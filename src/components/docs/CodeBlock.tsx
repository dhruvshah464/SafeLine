import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  code: string;
  showLineNumbers?: boolean;
}

export default function CodeBlock({ language, code, showLineNumbers = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split('\n');

  return (
    <div className="my-6 rounded-xl overflow-hidden bg-[#0F172A] border border-[#1E293B] shadow-sm relative group">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1E293B]/60 bg-[#0B1120]">
        <span className="text-[11px] font-mono font-medium text-slate-400 uppercase tracking-wider">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Copy code"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed">
        <table className="border-spacing-0 border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                {showLineNumbers && (
                  <td className="pr-4 py-0 select-none text-right border-r border-[#1E293B] text-slate-600 tabular-nums">
                    {i + 1}
                  </td>
                )}
                <td className="pl-4 py-0 whitespace-pre">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
