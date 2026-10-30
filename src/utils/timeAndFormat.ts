import { GpsLocation, TimeEntry } from '../types';

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getCurrentTimeHHMM(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatIsoDateGerman(isoDate: string): string {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

export function formatIsoDateLongGerman(isoDate: string): string {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

export function formatYearMonthGerman(yearMonth: string): string {
  if (!yearMonth || !yearMonth.includes('-')) return yearMonth;
  const [y, m] = yearMonth.split('-').map(Number);
  const dateObj = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat('de-DE', {
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

export function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, '0');
  const nd = String(dt.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

export function shiftYearMonth(yearMonth: string, deltaMonths: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const dt = new Date(y, m - 1 + deltaMonths, 1);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
}

export function calculateDurationMinutes(
  startTime: string,
  endTime: string,
  breakMinutes = 0
): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;

  let startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;

  // Handle overnight shifts crossing midnight
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }

  // Ensure minimum 1 minute if start and end clicked within same minute
  const rawDiff = endTotal === startTotal ? 1 : endTotal - startTotal;
  return Math.max(0, rawDiff - Math.max(0, breakMinutes));
}

export function formatMinutesAsHHMM(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function formatMinutesAsDecimalGerman(totalMinutes: number): string {
  const decimal = Math.max(0, totalMinutes) / 60;
  return decimal.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatElapsedSinceIso(isoTimestamp: string | null, nowMs: number): string {
  if (!isoTimestamp) return '00:00:00';
  const diffSec = Math.max(0, Math.floor((nowMs - new Date(isoTimestamp).getTime()) / 1000));
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatStreetAndNumber(street: string, houseNumber: string): string {
  const s = street.trim();
  const h = houseNumber.trim();
  if (s && h) return `${s} ${h}`;
  return s || h || '—';
}

export function formatPostalAndCity(postalCode: string, city: string): string {
  const p = postalCode.trim();
  const c = city.trim();
  if (p && c) return `${p} ${c}`;
  return c || p || '—';
}

export function formatFullAddress(loc: Pick<GpsLocation | TimeEntry, 'street' | 'houseNumber' | 'postalCode' | 'city'>): string {
  const streetPart = formatStreetAndNumber(loc.street, loc.houseNumber);
  const cityPart = formatPostalAndCity(loc.postalCode, loc.city);
  if (streetPart !== '—' && cityPart !== '—') {
    return `${streetPart}, ${cityPart}`;
  }
  if (streetPart !== '—') return streetPart;
  if (cityPart !== '—') return cityPart;
  return 'Keine Adresse hinterlegt';
}
