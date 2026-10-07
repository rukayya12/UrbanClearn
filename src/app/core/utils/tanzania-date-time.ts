export const TANZANIA_TIME_ZONE = 'Africa/Dar_es_Salaam';

export interface TanzaniaDateTime {
  date: string;
  time: string;
}

function getParts(value: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TANZANIA_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(value)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );
}

export function getTanzaniaDateTime(now = new Date()): TanzaniaDateTime {
  const parts = getParts(now);
  return { date: `${parts['year']}-${parts['month']}-${parts['day']}`, time: `${parts['hour']}:${parts['minute']}` };
}

export function formatDateOnly(date?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date || '';
}

export function formatTime12Hour(time?: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time || '');
  if (!match) return time || '';
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return time || '';
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? 'PM' : 'AM'}`;
}

export function formatTanzaniaInstant(value?: Date | string): string {
  if (!value) return '';
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) return '';
  const parts = getParts(instant);
  return `${parts['day']}/${parts['month']}/${parts['year']} at ${formatTime12Hour(`${parts['hour']}:${parts['minute']}`)}`;
}

export function isValidDateOnly(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function isValidTimeOnly(time: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  return !!match && Number(match[1]) <= 23 && Number(match[2]) <= 59;
}

export function isFutureTanzaniaDateTime(date: string, time: string, now = new Date()): boolean {
  if (!isValidDateOnly(date) || !isValidTimeOnly(time)) return false;
  const current = getTanzaniaDateTime(now);
  return `${date}T${time}` > `${current.date}T${current.time}`;
}

export function isValidTanzaniaPreference(date?: string, time?: string, now = new Date()): boolean {
  if (!date) return !time || isValidTimeOnly(time);
  if (!isValidDateOnly(date)) return false;
  if (!time) return date >= getTanzaniaDateTime(now).date;
  return isFutureTanzaniaDateTime(date, time, now);
}

export function tanzaniaDateTimeToDate(date: string, time: string): Date | null {
  if (!isValidDateOnly(date) || !isValidTimeOnly(time)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hours, minutes);
  const inTanzania = getParts(new Date(localAsUtc));
  const representedAsUtc = Date.UTC(
    Number(inTanzania['year']), Number(inTanzania['month']) - 1, Number(inTanzania['day']),
    Number(inTanzania['hour']), Number(inTanzania['minute'])
  );
  return new Date(localAsUtc - (representedAsUtc - localAsUtc));
}