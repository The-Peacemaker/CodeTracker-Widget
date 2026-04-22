import React, { useState, useRef, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { ViewMode, DayData, UserProfile } from '../types';
import { formatCompactNumber, getMonthHeaders } from '../data/mockData';

interface ActivityWidgetProps {
  profile: UserProfile;
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  heatmapData: DayData[];
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const ActivityWidget: React.FC<ActivityWidgetProps> = ({
  profile,
  activeView,
  onViewChange,
  heatmapData,
  onRefresh,
  isRefreshing = false,
}) => {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);

  const isTokens = activeView === 'tokens';
  const monthHeaders = useMemo(() => getMonthHeaders(heatmapData), [heatmapData]);

  const handleCellMouseEnter = (
    e: React.MouseEvent<SVGRectElement>,
    day: DayData
  ) => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const widgetRect = widgetRef.current?.getBoundingClientRect();

    if (widgetRect) {
      const tooltipW = 200;
      const tooltipH = 92;

      let top = rect.top - widgetRect.top - tooltipH - 8;
      let left = rect.left - widgetRect.left + rect.width / 2 - tooltipW / 2;

      // Bound safety
      if (top < 10) top = rect.bottom - widgetRect.top + 8;
      if (left < 12) left = 12;
      if (left + tooltipW > widgetRect.width - 12) {
        left = widgetRect.width - tooltipW - 12;
      }

      setTooltipPos({ x: left, y: top });
      setHoveredDay(day);
    }
  };

  const handleCellMouseLeave = () => {
    hideTimerRef.current = window.setTimeout(() => {
      setHoveredDay(null);
    }, 120);
  };

  // SVG grid cell geometry
  const cellW = 9.8;
  const cellH = 9.8;
  const gap = 2.4;

  return (
    <div className="relative w-full max-w-[720px] select-none" ref={widgetRef}>
      {/* Liquid ambient lighting bloom behind transparent glass */}
      <div
        className={`absolute -inset-3 rounded-[32px] blur-3xl transition-all duration-700 pointer-events-none ${
          isTokens
            ? 'bg-gradient-to-tr from-blue-600/35 via-indigo-500/25 to-sky-400/20 opacity-90'
            : 'bg-gradient-to-tr from-emerald-600/35 via-teal-500/25 to-emerald-400/20 opacity-90'
        }`}
      />

      {/* Main Liquid Glass Widget Box */}
      <div className="relative glass-panel rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 overflow-hidden">
        {/* Optical diagonal specular sheen reflection */}
        <div className="liquid-sheen absolute inset-0 pointer-events-none rounded-2xl" />

        {/* 1. Header: User Info & Pill Switcher */}
        <div className="relative z-10 flex items-center justify-between gap-3 pb-3 border-b border-white/[0.09]">
          {/* Avatar and Profile Details */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-[#141d2d] to-[#253957] border border-blue-400/30 text-blue-300 font-semibold text-xs shadow-inner">
              <span>{profile.avatarLetter}</span>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0B0F17] shadow-sm shadow-emerald-400/50" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-100 tracking-tight">
                Hi {profile.name}!
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {profile.handle}
              </span>
              {profile.isPro && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-blue-500/15 text-blue-400 border border-blue-400/25">
                  PRO
                </span>
              )}
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono">
            <button
              id="tab-tokens"
              onClick={() => onViewChange('tokens')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium cursor-pointer ${
                isTokens
                  ? 'text-blue-300 bg-blue-500/20 border border-blue-400/30 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
              title="OpenCode Token Metrics"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  isTokens
                    ? 'bg-blue-400 shadow-sm shadow-blue-400/80 scale-110'
                    : 'bg-blue-400/40'
                }`}
              />
              <span>Tokens</span>
            </button>

            <button
              id="tab-gh"
              onClick={() => onViewChange('gh')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium cursor-pointer ${
                !isTokens
                  ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 shadow-[0_0_12px_rgba(57,211,83,0.25)]'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
              title="GitHub Contributions & Commits"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  !isTokens
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 scale-110'
                    : 'bg-emerald-400/40'
                }`}
              />
              <span>GitHub</span>
            </button>
          </div>
        </div>

        {/* 2. Metrics Bar: 4 Specular Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Card 1 */}
          <div className="glass-card rounded-xl px-3.5 py-2.5 flex flex-col justify-center transition-colors hover:border-white/15">
            <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase truncate">
              {isTokens ? 'Tokens Today' : 'Commits Today'}
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold tracking-tight text-white tabular-nums">
                {isTokens
                  ? formatCompactNumber(profile.stats.todayTokens)
                  : profile.stats.todayCommits.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-medium">
                {isTokens ? 'tok' : 'commits'}
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-card rounded-xl px-3.5 py-2.5 flex flex-col justify-center transition-colors hover:border-white/15">
            <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase truncate">
              {isTokens ? '7D Output' : '7D Output'}
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold tracking-tight text-white tabular-nums">
                {isTokens
                  ? formatCompactNumber(profile.stats.last7dTokens)
                  : `${profile.stats.last7dCommits}`}
              </span>
              <span className="text-[10px] text-blue-400 font-mono font-medium">
                {isTokens ? 'tok' : 'commits'}
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-card rounded-xl px-3.5 py-2.5 flex flex-col justify-center transition-colors hover:border-white/15">
            <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase truncate">
              {isTokens ? 'Peak Day' : 'Peak Day'}
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold tracking-tight text-white tabular-nums">
                {isTokens
                  ? formatCompactNumber(profile.stats.peakTokens)
                  : `${profile.stats.peakCommits}`}
              </span>
              <span className="text-[10px] text-indigo-400 font-mono font-medium">
                {isTokens ? 'high' : 'high'}
              </span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="glass-card rounded-xl px-3.5 py-2.5 flex flex-col justify-center transition-colors hover:border-white/15">
            <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase truncate">
              Best Streak
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold tracking-tight text-white tabular-nums">
                {isTokens
                  ? `${profile.stats.streakDays}d`
                  : `${profile.stats.gitStreakDays}d`}
              </span>
              <span className="text-[10px] text-amber-400 font-mono font-medium flex items-center gap-0.5">
                fire
              </span>
            </div>
          </div>
        </div>

        {/* 3. Heatmap Container Card */}
        <div className="glass-card rounded-xl p-3 sm:p-3.5 flex flex-col gap-2 relative">
          {/* Heatmap Subheader & Legend */}
          <div className="flex items-center justify-between text-xs px-0.5">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  isTokens
                    ? 'bg-blue-400 shadow-sm shadow-blue-400/60'
                    : 'bg-emerald-400 shadow-sm shadow-emerald-400/60'
                }`}
              />
              <span className="text-[11px] font-medium text-slate-200">
                {isTokens ? 'Token Activity' : 'GitHub Activity'}
              </span>
              <span className="text-slate-600 text-[10px]">•</span>
              <span
                className={`text-[11px] font-mono font-medium ${
                  isTokens ? 'text-blue-400/90' : 'text-emerald-400/90'
                }`}
              >
                {isTokens
                  ? `${formatCompactNumber(profile.stats.totalYearTokens)} tokens in the last year`
                  : `${profile.stats.totalYearCommits.toLocaleString()} contributions in the last year`}
              </span>
            </div>

            {/* Color Scale Legend */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span>Less</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((tier) => (
                  <span
                    key={tier}
                    className={`w-2.5 h-2.5 rounded-[2px] transition-colors ${
                      isTokens ? `tier-token-${tier}` : `tier-gh-${tier}`
                    } ${tier === 0 ? 'border border-white/5' : ''}`}
                    style={{
                      backgroundColor: isTokens
                        ? ['#0f1420', '#1a2b4c', '#254982', '#3168be', '#3b82f6'][tier]
                        : ['#0d151c', '#0e4429', '#006d32', '#26a641', '#39d353'][tier],
                    }}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>

          {/* SVG Calendar Heatmap (52 weeks x 7 days) */}
          <div className="w-full overflow-x-auto select-none py-1 scrollbar-none">
            <svg
              className="w-full h-auto min-w-[640px]"
              viewBox="0 0 680 110"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Day of week labels: Mon, Wed, Fri */}
              <g className="fill-slate-500 font-mono text-[9px]">
                <text x="2" y="32">
                  Mon
                </text>
                <text x="2" y="58">
                  Wed
                </text>
                <text x="2" y="84">
                  Fri
                </text>
              </g>

              {/* Month Headers */}
              <g className="fill-slate-400 font-mono text-[9px]">
                {monthHeaders.map((m, idx) => (
                  <text
                    key={idx}
                    x={(30 + m.col * (cellW + gap)).toFixed(1)}
                    y="8"
                  >
                    {m.label}
                  </text>
                ))}
              </g>

              {/* Heatmap Grid Cells */}
              <g transform="translate(30, 16)">
                {heatmapData.map((d) => {
                  const tier = isTokens ? d.tokenTier : d.ghTier;
                  const tierClass = isTokens
                    ? `tier-token-${tier}`
                    : `tier-gh-${tier}`;

                  return (
                    <rect
                      key={d.index}
                      x={(d.col * (cellW + gap)).toFixed(1)}
                      y={(d.row * (cellH + gap)).toFixed(1)}
                      width={cellW}
                      height={cellH}
                      rx="2.5"
                      className={`cell-rect ${tierClass}`}
                      onMouseEnter={(e) => handleCellMouseEnter(e, d)}
                      onMouseLeave={handleCellMouseLeave}
                    />
                  );
                })}
              </g>
            </svg>
          </div>
        </div>

        {/* 4. Footer Status Bar */}
        <div className="flex items-center justify-between gap-3 pt-0.5 text-xs">
          {/* Most Used Model Badge */}
          <div
            className="flex items-center gap-2 glass-card px-2.5 py-1 rounded-md text-left transition-colors hover:border-white/15 cursor-default select-none"
            title={`Most used model: ${profile.modelName} (primary telemetry model)`}
          >
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
              MODEL:
            </span>
            <span className="font-mono text-[10px] text-slate-200 font-medium truncate max-w-[220px]">
              {profile.modelName}
            </span>
          </div>

          {/* Sync status & Refresh button */}
          <div className="flex items-center gap-2.5 ml-auto">
            <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Synced:</span>
              <span className="text-slate-400">Just now</span>
            </div>

            <button
              id="btn-refresh"
              onClick={onRefresh}
              className={`group relative flex items-center justify-center w-6 h-6 rounded-md glass-card hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 transition-all focus:outline-none cursor-pointer ${
                isRefreshing ? 'border-emerald-400/40 text-emerald-400' : ''
              }`}
              title="Refresh and simulate live telemetry"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 transition-transform duration-500 ${
                  isRefreshing ? 'animate-spin' : 'group-hover:rotate-45'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 5. Floating Interactive Tooltip */}
        {hoveredDay && (
          <div
            className="absolute z-50 pointer-events-none transition-all duration-100 ease-out bg-[#0d131f]/95 backdrop-blur-md border border-[#233147] rounded-lg p-2.5 shadow-2xl shadow-black min-w-[190px]"
            style={{
              transform: `translate3d(${tooltipPos.x}px, ${tooltipPos.y}px, 0)`,
            }}
          >
            <div className="text-[11px] font-semibold text-slate-200 mb-1 pb-1 border-b border-white/10">
              {hoveredDay.dateString}
            </div>

            {/* Tokens Stat */}
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-slate-400">Tokens:</span>
              </div>
              <span className="font-medium text-white tabular-nums">
                {hoveredDay.tokens > 0
                  ? `${formatCompactNumber(hoveredDay.tokens)} tok`
                  : '0 tok'}
              </span>
            </div>

            {/* Commits Stat */}
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-slate-400">Commits:</span>
              </div>
              <span className="font-medium text-emerald-300 tabular-nums">
                {hoveredDay.commits > 0 ? `${hoveredDay.commits}` : '0'}
              </span>
            </div>

            {/* Metadata (sessions / repos / PRs) */}
            <div className="text-[9px] font-mono text-slate-400 mt-1 pt-1 border-t border-white/10">
              {hoveredDay.sessions > 0
                ? `${hoveredDay.sessions} session${
                    hoveredDay.sessions > 1 ? 's' : ''
                  } • ${hoveredDay.repos} repo${
                    hoveredDay.repos > 1 ? 's' : ''
                  } (${hoveredDay.prs} PRs)`
                : 'No recorded activity'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
