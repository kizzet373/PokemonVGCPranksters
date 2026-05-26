export function normalizeDataValues(value) {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeDataValues);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [key, normalizeDataValues(entryValue)]));
  }

  return value;
}
