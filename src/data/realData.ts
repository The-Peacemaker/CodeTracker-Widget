import { DayData, UserProfile } from '../types';

/** Shape produced by collector/collect_opencode.py */
export interface UsageJson {
  profile: { name: string; handle: string; plan: string };
  lifetimeTokens: number;
  totalCost: number;
  sessions: number;
  messages: number;
  activeDays: number;
  peakDay: { date: string; tokens: number };
  today: { date: string; tokens: number; sessions: number };
  last7Tokens: number;
  last30Tokens: number;
  currentStreak: number;
  longestStreak: number;
  topModel: { model: string; tokens: number; sessions: number } | null;
  models: { model: string; tokens: number; sessions: number }[];
  daily: { date: string; tokens: number; sessions: number; cost: number }[];
  updatedAt: string;
}

function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return 1;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

export function buildProfile(u: UsageJson): UserProfile {
  const yearAgo = new Date();
  yearAgo.setDate(yearAgo.getDate() - 364);
  let yearTokens = 0;
  let yearSessions = 0;
  let last7Sessions = 0;
  let peakSessions = 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (const d of u.daily) {
    const dt = parseDay(d.date);
    if (dt >= yearAgo) {
      yearTokens += d.tokens;
      yearSessions += d.sessions;
      peakSessions = Math.max(peakSessions, d.sessions);
      if (now.getTime() - dt.getTime() < 7 * 86400_000) last7Sessions += d.sessions;
    }
  }
  return {
    id: 'benedict',
    name: u.profile.name,
    handle: u.profile.handle,
    avatarLetter: (u.profile.name[0] || 'B').toUpperCase(),
    isPro: true,
    modelName: u.topModel?.model ?? '—',
    stats: {
      todayTokens: u.today.tokens,
      last7dTokens: u.last7Tokens,
      peakTokens: u.peakDay.tokens,
      streakDays: u.longestStreak,
      totalYearTokens: yearTokens,
      todayCommits: u.today.sessions,
      last7dCommits: last7Sessions,
      peakCommits: peakSessions,
      gitStreakDays: u.longestStreak,
      totalYearCommits: yearSessions,
      mergedPRs: 0,
    },
  };
}

/** 52 weeks x 7 days ending today, Monday-first, from real daily history. */
export function buildHeatmap(u: UsageJson): DayData[] {
  const byDate = new Map(u.daily.map((d) => [d.date, d]));
  const vals = u.daily.map((d) => d.tokens).filter((v) => v > 0).sort((a, b) => a - b);
  const ses = u.daily.map((d) => d.sessions).filter((v) => v > 0).sort((a, b) => a - b);
  const tT = [quantile(vals, 0.4), quantile(vals, 0.7), quantile(vals, 0.9)];
  const tS = [quantile(ses, 0.4), quantile(ses, 0.7), quantile(ses, 0.9)];

  const tierOf = (v: number, t: number[]): 0 | 1 | 2 | 3 | 4 =>
    v <= 0 ? 0 : v <= t[0] ? 1 : v <= t[1] ? 2 : v <= t[2] ? 3 : 4;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Monday of this week, then back 51 full weeks
  const endMonday = new Date(today);
  endMonday.setDate(endMonday.getDate() - ((endMonday.getDay() + 6) % 7));
  const start = new Date(endMonday);
  start.setDate(start.getDate() - 51 * 7);

  const data: DayData[] = [];
  let index = 0;
  for (let col = 0; col < 52; col++) {
    for (let row = 0; row < 7; row++) {
      const dt = new Date(start);
      dt.setDate(dt.getDate() + col * 7 + row);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
        dt.getDate(),
      ).padStart(2, '0')}`;
      const e = dt <= today ? byDate.get(key) : undefined;
      const tokens = e?.tokens ?? 0;
      const sessions = e?.sessions ?? 0;
      data.push({
        index: index++,
        col,
        row,
        dateObj: dt,
        dateString: dt.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        dayOfWeek: row,
        tokens,
        tokenTier: tierOf(tokens, tT),
        sessions,
        commits: sessions,
        ghTier: tierOf(sessions, tS),
        repos: 0,
        prs: 0,
      });
    }
  }
  return data;
}

export async function loadRealData(): Promise<{ profile: UserProfile; heatmap: DayData[] } | null> {
  try {
    const res = await fetch('usage.json');
    if (!res.ok) return null;
    const u = (await res.json()) as UsageJson;
    if (!u.daily || !u.profile) return null;
    return { profile: buildProfile(u), heatmap: buildHeatmap(u) };
  } catch {
    return null;
  }
}
