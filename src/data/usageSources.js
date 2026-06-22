import statsIndex from './usage-stats/index.json';

export { statsIndex };

export const statModules = {
  ...import.meta.glob('./usage-stats/pokemon/*.json'),
  ...import.meta.glob('./usage-stats/pokemon-separate-megas/*.json'),
  ...import.meta.glob('./usage-stats/items/*.json'),
  ...import.meta.glob('./usage-stats/moves/*.json'),
  ...import.meta.glob('./usage-stats/teams/*.json'),
};

export const defaultUsageScopeMinimumTournaments = 15;

function scopeSortKey(scope) {
  return `${scope.month ?? scope.id}-${scope.format ?? ''}`;
}

export const defaultUsageScopeId =
  statsIndex.scopes
    .filter((scope) => scope.type === 'month')
    .filter((scope) => (scope.totals?.tournaments ?? 0) >= defaultUsageScopeMinimumTournaments)
    .sort((a, b) => scopeSortKey(a).localeCompare(scopeSortKey(b)))
    .at(-1)?.id ?? 'full';
