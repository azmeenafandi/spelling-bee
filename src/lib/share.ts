const PUBLIC_URL = 'spelling.beeroolabs.com';

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function outcomeEmoji(outcome: 'correct' | 'second' | 'wrong'): string {
  switch (outcome) {
    case 'correct':
      return '✅';
    case 'second':
      return '🟡';
    case 'wrong':
      return '❌';
  }
}

export function generateGameShareCard(data: {
  date: string;
  score: number;
  rank: string;
  streak: number;
  tier: number;
  wordsAttempted: number;
  wordsCorrect: number;
  attemptPattern: ('correct' | 'second' | 'wrong')[];
}): { text: string; url: string } {
  const date = shortDate(data.date);
  const grid = data.attemptPattern.map(outcomeEmoji).join('');
  const url = `https://${PUBLIC_URL}`;
  return {
    text: [
      `🐝 Spelling Bee — ${date}`,
      `⭐ ${data.score.toLocaleString()} pts · ${data.rank} · 🔥 ${data.streak} streak · Tier ${data.tier}`,
      grid,
      PUBLIC_URL,
    ].join('\n'),
    url,
  };
}

export function generateDailyShareCard(data: {
  date: string;
  correct: boolean;
}): { text: string; url: string } {
  const date = shortDate(data.date);
  const result = data.correct ? '✅ Got it!' : '❌ Better luck tomorrow!';
  const url = `https://${PUBLIC_URL}`;
  return {
    text: [
      `🐝 Daily Challenge — ${date}`,
      result,
      PUBLIC_URL,
    ].join('\n'),
    url,
  };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to execCommand
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export async function shareResults(text: string, url?: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: 'Spelling Bee',
        text,
        url: url || 'https://spelling.beeroolabs.com',
      });
      return true;
    } catch {
      // User cancelled or API unsupported — fall through to clipboard
    }
  }

  return copyToClipboard(text);
}
