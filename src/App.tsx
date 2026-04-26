/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ViewMode, UserProfile } from './types';
import { DEFAULT_PROFILES, generateHeatmapData } from './data/mockData';
import { loadRealData } from './data/realData';
import { ActivityWidget } from './components/ActivityWidget';
import { WidgetControls } from './components/WidgetControls';
import { EmbedModal } from './components/EmbedModal';

export default function App() {
  const [profiles, setProfiles] = useState<UserProfile[]>(DEFAULT_PROFILES);
  const [currentProfile, setCurrentProfile] = useState<UserProfile>(DEFAULT_PROFILES[0]);
  const [activeView, setActiveView] = useState<ViewMode>('tokens');
  const [heatmapData, setHeatmapData] = useState(() => generateHeatmapData(0));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);

  // Load REAL OpenCode history (collector/collect_opencode.py -> public/usage.json).
  // Falls back to mock data when usage.json is unavailable.
  const loadLive = useCallback(async () => {
    const real = await loadRealData();
    if (real) {
      setProfiles([real.profile]);
      setCurrentProfile(real.profile);
      setHeatmapData(real.heatmap);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    void loadLive();
  }, [loadLive]);

  // Manual refresh handler: re-read real data, fall back to a subtle nudge.
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(async () => {
      const ok = await loadLive();
      if (!ok) {
        setCurrentProfile((prev) => ({
          ...prev,
          stats: {
            ...prev.stats,
            todayTokens: prev.stats.todayTokens + Math.floor(120_000 + Math.random() * 450_000),
            todayCommits: prev.stats.todayCommits + (Math.random() > 0.6 ? 1 : 0),
            totalYearCommits: prev.stats.totalYearCommits + 1,
          },
        }));
      }
      setIsRefreshing(false);
    }, 600);
  }, [loadLive]);

  // Real-time live token streamer simulation
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setCurrentProfile((prev) => {
        const addedTokens = Math.floor(15_000 + Math.random() * 35_000);
        return {
          ...prev,
          stats: {
            ...prev.stats,
            todayTokens: prev.stats.todayTokens + addedTokens,
            totalYearTokens: prev.stats.totalYearTokens + addedTokens,
          },
        };
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isSimulating]);

  return (
    <div className="relative min-h-screen bg-[#030407] text-slate-100 flex flex-col justify-between items-center p-4 sm:p-8 selection:bg-blue-500/30 overflow-x-hidden">
      {/* Subtle organic light mesh behind the widget so liquid glass refraction is visible */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-br from-blue-900/18 via-indigo-900/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 w-[350px] h-[350px] bg-emerald-900/10 rounded-full blur-[90px] pointer-events-none" />
      </div>

      {/* Top spacer */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between opacity-40 hover:opacity-100 transition-opacity">
        <span className="text-[11px] font-mono text-slate-500 tracking-wider">
          OPENCODE TELEMETRY • ACTIVITY WIDGET
        </span>
        <span className="text-[11px] font-mono text-slate-500">
          v2.4.0
        </span>
      </div>

      {/* Centerpiece: The Exact Activity Widget from Screenshot */}
      <main className="relative z-10 w-full flex items-center justify-center my-auto py-6">
        <ActivityWidget
          profile={currentProfile}
          activeView={activeView}
          onViewChange={setActiveView}
          heatmapData={heatmapData}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </main>

      {/* Bottom Controls Bar */}
      <footer className="w-full max-w-2xl flex flex-col items-center gap-3 pt-4">
        <WidgetControls
          profiles={profiles}
          currentProfile={currentProfile}
          onSelectProfile={setCurrentProfile}
          activeView={activeView}
          onViewChange={setActiveView}
          isSimulating={isSimulating}
          onToggleSimulation={() => setIsSimulating(!isSimulating)}
          onOpenEmbed={() => setIsEmbedOpen(true)}
        />
      </footer>

      {/* Embed Modal Dialog */}
      <EmbedModal
        isOpen={isEmbedOpen}
        onClose={() => setIsEmbedOpen(false)}
        profile={currentProfile}
        activeView={activeView}
      />
    </div>
  );
}
