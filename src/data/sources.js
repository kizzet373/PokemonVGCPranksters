import statsIndex from './usage-stats/index.json';
import rawTournamentsData from './regulation-m-a-tournaments.json';
import { normalizeDataValues } from '../utils/dataNormalization';

export const tournamentsData = normalizeDataValues(rawTournamentsData);
export { statsIndex };

export const statModules = {
  ...import.meta.glob('./usage-stats/pokemon/*.json'),
  ...import.meta.glob('./usage-stats/items/*.json'),
  ...import.meta.glob('./usage-stats/moves/*.json'),
};

export const standingsAssetUrls = import.meta.glob('./standings/*.json', {
  query: '?url',
  import: 'default',
  eager: true,
});

export const publicDataUrl = (pathname) => `${import.meta.env.BASE_URL}data/${pathname}`.replace(/\/{2,}/g, '/');

export const defaultScopeId =
  statsIndex.scopes
    .filter((scope) => scope.type === 'month')
    .map((scope) => scope.id)
    .sort()
    .at(-1) ?? 'full';
