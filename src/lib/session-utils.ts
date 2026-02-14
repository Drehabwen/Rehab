const ALLOWED_LETTERS = 'ABCDEFGHJKLMNPRTUVWXYZ';

export function generatePatientId(): string {
  let result = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * ALLOWED_LETTERS.length);
    result += ALLOWED_LETTERS[randomIndex];
  }
  return result;
}

export function generateSessionId(patientId: string, sequence: number): string {
  const sequenceStr = String(sequence).padStart(3, '0');
  return `${patientId}-${sequenceStr}`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function isToday(timestamp: number): boolean {
  const today = new Date();
  const date = new Date(timestamp);
  return today.toDateString() === date.toDateString();
}

export function isYesterday(timestamp: number): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = new Date(timestamp);
  return yesterday.toDateString() === date.toDateString();
}

export function getRelativeTime(timestamp: number): string {
  if (isToday(timestamp)) {
    return `今天 ${formatTime(timestamp)}`;
  }
  if (isYesterday(timestamp)) {
    return `昨天 ${formatTime(timestamp)}`;
  }
  return formatDate(timestamp);
}
