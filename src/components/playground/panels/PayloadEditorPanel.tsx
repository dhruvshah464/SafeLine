import { useState, useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-tomorrow.css';
import { Play, Copy, RotateCcw } from 'lucide-react';

interface Props {
  initialPayload: any;
  onExecute: (payload: any) => void;
  isExecuting: boolean;
}

export default function PayloadEditorPanel({ initialPayload, onExecute, isExecuting }: Props) {
  const [code, setCode] = useState(JSON.stringify(initialPayload, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCode(JSON.stringify(initialPayload, null, 2));
    setError(null);
  }, [initialPayload]);

  const handleRun = () => {
    try {
      const parsed = JSON.parse(code);
      setError(null);
      onExecute(parsed);
    } catch (e: any) {
      setError(`Invalid JSON: ${e.message}`);
    }
  };

  const handleReset = () => {
    setCode(JSON.stringify(initialPayload, null, 2));
    setError(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="flex flex-col h-full bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#0F172A]">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Payload Editor</span>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" title="Copy JSON" aria-label="Copy JSON">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" title="Reset to Scenario Default" aria-label="Reset to Scenario Default">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRun} 
            disabled={isExecuting}
            aria-label="Execute Scenario"
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-[#0F172A]"
          >
            <Play className="w-3 h-3" />
            Run
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto relative">
        <Editor
          value={code}
          onValueChange={code => setCode(code)}
          highlight={code => Prism.highlight(code, Prism.languages.json, 'json')}
          padding={16}
          style={{
            fontFamily: '"Fira Code", "JetBrains Mono", monospace',
            fontSize: 13,
            backgroundColor: '#1E293B',
            minHeight: '100%',
          }}
          className="text-slate-300 focus:outline-none"
        />
      </div>
      
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs font-mono">
          {error}
        </div>
      )}
    </div>
  );
}
