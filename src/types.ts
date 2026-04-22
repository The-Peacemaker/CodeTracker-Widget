export type ViewMode = 'tokens' | 'gh';

export interface DayData {
  index: number;
  col: number;
  row: number;
  dateObj: Date;
  dateString: string;
  dayOfWeek: number; // 0=Mon ... 6=Sun
  tokens: number;
  tokenTier: 0 | 1 | 2 | 3 | 4;
  sessions: number;
  commits: number;
  ghTier: 0 | 1 | 2 | 3 | 4;
  repos: number;
  prs: number;
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatarLetter: string;
  isPro: boolean;
  modelName: string;
  stats: {
    todayTokens: number;
    last7dTokens: number;
    peakTokens: number;
    streakDays: number;
    totalYearTokens: number;
    // GitHub stats
    todayCommits: number;
    last7dCommits: number;
    peakCommits: number;
    gitStreakDays: number;
    totalYearCommits: number;
    mergedPRs: number;
  };
}
