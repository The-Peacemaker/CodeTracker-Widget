import React from 'react';
import { Share2, Zap, UserCheck, Play, Pause } from 'lucide-react';
import { UserProfile, ViewMode } from '../types';

interface WidgetControlsProps {
  profiles: UserProfile[];
  currentProfile: UserProfile;
  onSelectProfile: (profile: UserProfile) => void;
  activeView: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onOpenEmbed: () => void;
}

export const WidgetControls: React.FC<WidgetControlsProps> = ({
  profiles,
  currentProfile,
  onSelectProfile,
  activeView,
  onViewChange,
  isSimulating,
  onToggleSimulation,
  onOpenEmbed,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-2 px-4 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md text-xs font-mono text-slate-400">
      {/* Profile Selector */}
      <div className="flex items-center gap-1.5">
        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-slate-500 hidden sm:inline">Profile:</span>
        <select
          value={currentProfile.id}
          onChange={(e) => {
            const p = profiles.find((item) => item.id === e.target.value);
            if (p) onSelectProfile(p);
          }}
          className="bg-black/60 border border-white/10 rounded-md px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-400/40 cursor-pointer"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.handle})
            </option>
          ))}
        </select>
      </div>

      <span className="text-white/10">•</span>

      {/* Mode Shortcut */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onViewChange('tokens')}
          className={`px-2 py-1 rounded transition-colors ${
            activeView === 'tokens'
              ? 'text-blue-300 bg-blue-500/20 font-medium'
              : 'hover:text-white'
          }`}
        >
          Tokens View
        </button>
        <span className="text-slate-600">/</span>
        <button
          onClick={() => onViewChange('gh')}
          className={`px-2 py-1 rounded transition-colors ${
            activeView === 'gh'
              ? 'text-emerald-300 bg-emerald-500/20 font-medium'
              : 'hover:text-white'
          }`}
        >
          GitHub View
        </button>
      </div>

      <span className="text-white/10">•</span>

      {/* Live Simulation Toggle */}
      <button
        onClick={onToggleSimulation}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
          isSimulating
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
        }`}
        title={isSimulating ? 'Pause live stream simulation' : 'Simulate real-time token streaming'}
      >
        {isSimulating ? (
          <>
            <Pause className="w-3 h-3 text-amber-400" />
            <span>Streaming</span>
          </>
        ) : (
          <>
            <Play className="w-3 h-3 text-slate-400" />
            <span>Live Stream</span>
          </>
        )}
      </button>

      {/* Embed / Export Button */}
      <button
        onClick={onOpenEmbed}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
        title="Get embed code for your site or GitHub README"
      >
        <Share2 className="w-3 h-3 text-slate-400" />
        <span>Embed Widget</span>
      </button>
    </div>
  );
};
