import statsIndex from './usage-stats/index.json';

export { statsIndex };

export const statModules = {
  ...import.meta.glob('./usage-stats/pokemon/*.json'),
  ...import.meta.glob('./usage-stats/items/*.json'),
  ...import.meta.glob('./usage-stats/moves/*.json'),
};

export const defaultUsageScopeMinimumTournaments = 15;

export const defaultUsageScopeId =
  statsIndex.scopes
    .filter((scope) => scope.type === 'month')
    .filter((scope) => (scope.totals?.tournaments ?? 0) >= defaultUsageScopeMinimumTournaments)
    .map((scope) => scope.id)
    .sort()
    .at(-1) ?? 'full';
