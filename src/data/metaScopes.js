export const defaultScopeMinimumTournaments = 15;

export function isRegulationMonthScope(scope) {
  return scope?.type === 'month' && Boolean(scope.month) && Boolean(scope.format);
}

export function isFullScope(scope) {
  return scope?.type === 'full' || scope?.id === 'full';
}

export function scopeSortKey(scope) {
  return `${scope.month ?? scope.id}-${scope.format ?? ''}`;
}

export function selectableMetaScopes(scopes = []) {
  const fullScope = scopes.find(isFullScope);
  const monthScopes = scopes
    .filter(isRegulationMonthScope)
    .sort((a, b) => scopeSortKey(a).localeCompare(scopeSortKey(b)));

  return [fullScope, ...monthScopes].filter(Boolean);
}

export function defaultMetaScope(scopes = [], minimumTournaments = defaultScopeMinimumTournaments) {
  const selectableScopes = selectableMetaScopes(scopes).filter(isRegulationMonthScope);

  return selectableScopes
    .filter((scope) => (scope.totals?.tournaments ?? 0) >= minimumTournaments)
    .at(-1) ?? selectableScopes.at(-1) ?? selectableMetaScopes(scopes)[0] ?? null;
}

export function defaultMetaScopeId(scopes = [], minimumTournaments = defaultScopeMinimumTournaments) {
  return defaultMetaScope(scopes, minimumTournaments)?.id ?? '';
}
