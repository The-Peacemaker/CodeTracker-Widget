import React, { useState } from 'react';
import { X, Copy, Check, Code, Globe, Terminal } from 'lucide-react';
import { UserProfile, ViewMode } from '../types';

interface EmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  activeView: ViewMode;
}

export const EmbedModal: React.FC<EmbedModalProps> = ({
  isOpen,
  onClose,
  profile,
  activeView,
}) => {
  const [embedType, setEmbedType] = useState<'iframe' | 'markdown' | 'react'>('iframe');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://opencode.dev';

  const snippets = {
    iframe: `<iframe 
  src="${currentUrl}?user=${profile.handle.replace('@', '')}&mode=${activeView}" 
  width="100%" 
  height="360" 
  frameborder="0" 
  style="border-radius: 16px; max-width: 720px; overflow: hidden;"
  title="Developer Activity Widget"
></iframe>`,
    markdown: `[![Developer Activity](${currentUrl}/api/badge?user=${profile.handle.replace('@', '')}&mode=${activeView})](${currentUrl})`,
    react: `import { DeveloperActivityWidget } from '@opencode/activity-widget';

export default function MyPortfolio() {
  return (
    <DeveloperActivityWidget 
      username="${profile.handle}" 
      defaultMode="${activeView}" 
      theme="glass-dark" 
    />
  );
}`,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippets[embedType]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel rounded-2xl p-6 border border-white/15 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-semibold text-white">Embed Activity Widget</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-2 p-1 bg-black/40 rounded-lg border border-white/10 text-xs font-mono">
          <button
            onClick={() => setEmbedType('iframe')}
            className={`flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
              embedType === 'iframe'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>HTML iFrame</span>
          </button>
          <button
            onClick={() => setEmbedType('markdown')}
            className={`flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
              embedType === 'markdown'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Markdown</span>
          </button>
          <button
            onClick={() => setEmbedType('react')}
            className={`flex-1 py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
              embedType === 'react'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>React</span>
          </button>
        </div>

        <div className="mt-3 relative">
          <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap select-all max-h-48">
            {snippets[embedType]}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 text-xs font-mono transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Configured for: {profile.name} ({profile.handle})</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-400/30 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
