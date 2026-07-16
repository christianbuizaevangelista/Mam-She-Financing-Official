import dayjs from 'dayjs';

export type DateRange =
  | 'all'
  | 'today'
  | 'yesterday'
  | '7d'
  | '15d'
  | '30d'
  | 'month'
  | 'lastMonth'
  | 'custom';

export const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '15d', label: 'Last 15 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'Current month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'custom', label: 'Customize date' },
];

/** Returns the [start, end] epoch range for a date filter, or null for "all". */
export function computeRange(range: DateRange, from: string, to: string): { start: number; end: number } | null {
  const now = dayjs();
  switch (range) {
    case 'today':
      return { start: now.startOf('day').valueOf(), end: now.endOf('day').valueOf() };
    case 'yesterday': {
      const y = now.subtract(1, 'day');
      return { start: y.startOf('day').valueOf(), end: y.endOf('day').valueOf() };
    }
    case '7d':
      return { start: now.subtract(7, 'day').startOf('day').valueOf(), end: now.endOf('day').valueOf() };
    case '15d':
      return { start: now.subtract(15, 'day').startOf('day').valueOf(), end: now.endOf('day').valueOf() };
    case '30d':
      return { start: now.subtract(30, 'day').startOf('day').valueOf(), end: now.endOf('day').valueOf() };
    case 'month':
      return { start: now.startOf('month').valueOf(), end: now.endOf('month').valueOf() };
    case 'lastMonth': {
      const lm = now.subtract(1, 'month');
      return { start: lm.startOf('month').valueOf(), end: lm.endOf('month').valueOf() };
    }
    case 'custom':
      return {
        start: from ? dayjs(from).startOf('day').valueOf() : -Infinity,
        end: to ? dayjs(to).endOf('day').valueOf() : Infinity,
      };
    default:
      return null;
  }
}

/** True when an ISO date falls inside the computed range (or range is "all"). */
export function inRange(iso: string | undefined, range: { start: number; end: number } | null): boolean {
  if (!range) return true;
  if (!iso) return false;
  const t = dayjs(iso).valueOf();
  return t >= range.start && t <= range.end;
}
