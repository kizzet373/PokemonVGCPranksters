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

export function formatCountryCode(value, fallback = 'Global') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value).toUpperCase();
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

export function formatDate(value) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
