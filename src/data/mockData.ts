import { DayData, UserProfile } from '../types';

export const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'benedict',
    name: 'Benedict',
    handle: '@ThePeacemaker',
    avatarLetter: 'B',
    isPro: true,
    modelName: 'opencode/big-pickle',
    stats: {
      todayTokens: 614900000,
      last7dTokens: 1800000000,
      peakTokens: 192600000,
      streakDays: 14,
      totalYearTokens: 13290000000,
      todayCommits: 18,
      last7dCommits: 74,
      peakCommits: 28,
      gitStreakDays: 14,
      totalYearCommits: 1428,
      mergedPRs: 84,
    },
  },
  {
    id: 'alexa',
    name: 'Alex Rivera',
    handle: '@arivera',
    avatarLetter: 'A',
    isPro: true,
    modelName: 'claude-3-7-sonnet',
    stats: {
      todayTokens: 489200000,
      last7dTokens: 2150000000,
      peakTokens: 241000000,
      streakDays: 28,
      totalYearTokens: 18450000000,
      todayCommits: 24,
      last7dCommits: 92,
      peakCommits: 35,
      gitStreakDays: 28,
      totalYearCommits: 2190,
      mergedPRs: 142,
    },
  },
  {
    id: 'dev_sarah',
    name: 'Sarah Chen',
    handle: '@schen',
    avatarLetter: 'S',
    isPro: false,
    modelName: 'deepseek/deepseek-r1',
    stats: {
      todayTokens: 312500000,
      last7dTokens: 980000000,
      peakTokens: 110400000,
      streakDays: 9,
      totalYearTokens: 7850000000,
      todayCommits: 9,
      last7dCommits: 41,
      peakCommits: 19,
      gitStreakDays: 9,
      totalYearCommits: 890,
      mergedPRs: 56,
    },
  },
];

export const AVAILABLE_MODELS = [
  'opencode/big-pickle',
  'anthropic/claude-3.7-sonnet',
  'deepseek/deepseek-r1',
  'openai/gpt-4o',
  'google/gemini-2.5-pro',
  'meta/llama-3.3-70b',
];

export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2).replace(/\.00$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

/**
 * Generate 52 weeks (364 days) of structured calendar heatmap data
 * ending at the current simulated date (September 2026),
 * seeded to match the aesthetic rhythm of the provided screenshot.
 */
export function generateHeatmapData(seedOffset = 0): DayData[] {
  const data: DayData[] = [];
  const totalWeeks = 52;
  const totalDays = totalWeeks * 7;
  
  // Reference date: early September 2026
  const baseDate = new Date(2026, 8, 7); // September 7, 2026
  const startDate = new Date(baseDate);
  startDate.setDate(baseDate.getDate() - (totalDays - 1));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Specific high activity cluster weeks roughly matching the screenshot
  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const dayOfWeek = (currentDate.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const col = Math.floor(i / 7);
    const row = dayOfWeek;

    // Pseudo-random deterministic hash with optional seed offset
    const pseudo = Math.sin((i + 1) * 9301 + seedOffset * 49297) * 49297;
    const randT = pseudo - Math.floor(pseudo);

    let tokens = 0;
    let tokenTier: 0 | 1 | 2 | 3 | 4 = 0;
    let sessions = 0;

    // Weekend dampener
    const isWeekend = row >= 5;
    const activityThreshold = isWeekend ? 0.45 : 0.28;

    if (randT > activityThreshold) {
      if (randT > 0.86) {
        tokens = Math.floor(80_000_000 + randT * 112_600_000);
        tokenTier = 4;
        sessions = Math.floor(8 + randT * 12);
      } else if (randT > 0.64) {
        tokens = Math.floor(35_000_000 + randT * 45_000_000);
        tokenTier = 3;
        sessions = Math.floor(4 + randT * 5);
      } else if (randT > 0.42) {
        tokens = Math.floor(12_000_000 + randT * 22_000_000);
        tokenTier = 2;
        sessions = Math.floor(2 + randT * 3);
      } else {
        tokens = Math.floor(2_000_000 + randT * 9_000_000);
        tokenTier = 1;
        sessions = 1;
      }
    }

    // GitHub Commits & Activity
    const randG = (Math.cos((i + 7) * 49297 + seedOffset * 9301) * 9301) % 1;
    const absG = Math.abs(randG);
    let commits = 0;
    let ghTier: 0 | 1 | 2 | 3 | 4 = 0;
    let repos = 0;
    let prs = 0;

    if (absG > (isWeekend ? 0.5 : 0.3)) {
      if (absG > 0.88) {
        commits = Math.floor(8 + absG * 14);
        ghTier = 4;
        repos = Math.floor(2 + absG * 3);
        prs = Math.floor(1 + absG * 2);
      } else if (absG > 0.65) {
        commits = Math.floor(4 + absG * 5);
        ghTier = 3;
        repos = Math.floor(1 + absG * 2);
        prs = absG > 0.75 ? 1 : 0;
      } else if (absG > 0.45) {
        commits = Math.floor(2 + absG * 3);
        ghTier = 2;
        repos = 1;
      } else {
        commits = 1;
        ghTier = 1;
        repos = 1;
      }
    }

    // Anchor the very last day (Today) to match the exact hero values in the screenshot
    if (i === totalDays - 1) {
      tokens = 614_900_000;
      tokenTier = 4;
      commits = 18;
      ghTier = 4;
      sessions = 18;
      repos = 3;
      prs = 2;
    }

    const monthName = monthNames[currentDate.getMonth()];
    const dateStr = `${currentDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })}`;

    data.push({
      index: i,
      col,
      row,
      dayOfWeek,
      dateObj: currentDate,
      dateString: dateStr,
      tokens,
      tokenTier,
      sessions,
      commits,
      ghTier,
      repos,
      prs,
    });
  }

  return data;
}

export function getMonthHeaders(heatmap: DayData[]): { col: number; label: string }[] {
  const headers: { col: number; label: string }[] = [];
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let lastRecordedMonth = -1;

  for (let col = 0; col < 52; col++) {
    const item = heatmap[col * 7];
    if (item) {
      const monthIdx = item.dateObj.getMonth();
      // Record label on change with min 3 column separation
      if (monthIdx !== lastRecordedMonth) {
        if (headers.length === 0 || col - headers[headers.length - 1].col >= 3) {
          headers.push({
            col,
            label: shortMonths[monthIdx],
          });
          lastRecordedMonth = monthIdx;
        }
      }
    }
  }

  return headers;
}
