import countryNames from '../data/country-names.json';

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

export function formatWholeNumber(value) {
  return formatNumber(Math.round(value ?? 0));
}

export function formatPascalCase(value, fallback = '') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value)
    .trim()
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

export function formatTournamentFormat(value, fallback = '') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value).trim().toUpperCase();
}

export function formatCountryCode(value, fallback = 'Global') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const code = String(value).toUpperCase();
  return countryNames[code] ?? code;
}

export function formatPercent(value) {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  return `${Math.round(value)}%`;
}

export function formatScopeLabel(scope) {
  if (scope.id === 'full') {
    return 'Full';
  }

  const [year, month] = scope.id.split('-').map(Number);
  const date = new Date(year, month - 1, 1);

  if (!Number.isFinite(date.getTime())) {
    return scope.id;
  }

  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
}

export function recordLabel(record) {
  const wins = formatNumber(record?.wins);
  const losses = formatNumber(record?.losses);
  const ties = record?.ties ? ` - ${formatNumber(record.ties)}D` : '';

  return `${wins}W - ${losses}L${ties}`;
}

function parseDisplayDate(value) {
  if (typeof value === 'string') {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch.map(Number);
      return new Date(year, month - 1, day);
    }
  }

  return new Date(value);
}

export function formatDate(value) {
  const date = parseDisplayDate(value);

  if (!Number.isFinite(date.getTime())) {
    return 'Unknown date';
  }

  return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
}

export function formatNumericDate(value) {
  return formatDate(value);
}
