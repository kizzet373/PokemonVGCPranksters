import { categoryConfig } from '../../config/categories';
import { publicDataUrl } from '../../data/publicDataUrl';
import { formatNumber, formatPascalCase, formatTournamentFormat, formatWholeNumber } from '../../utils/format';

function buildUsageMetrics(label) {
  return ({ activeScope, rows, stats }) => [
    { label: 'Tournaments', value: formatNumber(activeScope.totals.tournaments), tone: 'green' },
    { label: 'Teams', value: formatNumber(activeScope.totals.recordsWithTeams), tone: 'blue' },
    { label: 'Pokemon sets', value: formatNumber(activeScope.totals.pokemonSets), tone: 'gold' },
    { label: `Total ${label}`, value: stats ? formatNumber(rows.length) : '...', tone: 'rose' },
  ];
}

function buildPlayerMetrics({ activeScope }) {
  return [
    { label: 'Tournaments', value: activeScope ? formatNumber(activeScope.totals.tournaments) : '...', tone: 'green' },
    { label: 'Ranked Players', value: activeScope ? formatNumber(activeScope.totals.players) : '...', tone: 'blue' },
    { label: 'Average Size', value: activeScope ? formatWholeNumber(activeScope.totals.averageTournamentSize) : '...', tone: 'gold' },
    { label: 'Total Games', value: activeScope ? formatNumber(activeScope.totals.totalGamesPlayed) : '...', tone: 'rose' },
  ];
}

function buildTournamentMetrics({ rows, stats, tournamentFormat }) {
  const playerTotal = rows.reduce((total, tournament) => total + (tournament.players ?? 0), 0);

  return [
    { label: 'Tournaments', value: stats ? formatNumber(rows.length) : '...', tone: 'green' },
    { label: 'Players', value: stats ? formatNumber(playerTotal) : '...', tone: 'blue' },
    { label: 'Average Tournament Size', value: stats && rows.length ? formatWholeNumber(playerTotal / rows.length) : '...', tone: 'gold' },
    { label: 'Format', value: formatTournamentFormat(tournamentFormat), tone: 'rose' },
  ];
}

const minimumDefaultScopeTournaments = 15;

function scopeSortKey(scope) {
  return `${scope.month ?? scope.id}-${scope.format ?? ''}`;
}

function tournamentMatchesScope(tournament, scope) {
  if (scope.type === 'full') {
    return true;
  }

  const month = scope.month ?? scope.id;

  if (tournament.date.slice(0, 7) !== month) {
    return false;
  }

  return !scope.format || tournament.format === scope.format;
}

const latestMonthScopeId = (scopes) =>
  scopes
    .filter((scope) => scope.type === 'month')
    .filter((scope) => (scope.totals?.tournaments ?? 0) >= minimumDefaultScopeTournaments)
    .sort((a, b) => scopeSortKey(a).localeCompare(scopeSortKey(b)))
    .at(-1)?.id ?? 'full';

async function loadUsageScopeOptions() {
  const { defaultUsageScopeId, statsIndex } = await import('../../data/usageSources');

  return {
    defaultScopeId: defaultUsageScopeId,
    scopes: statsIndex.scopes,
  };
}

function loadUsageStats(category) {
  return async (scope, { separateMegas = false } = {}) => {
    const { statModules } = await import('../../data/usageSources');
    const file = category === 'pokemon' && separateMegas
      ? scope.files.pokemonSeparateMegas ?? scope.files.pokemon
      : scope.files[category];
    const moduleKey = `./${file}`;
    const module = await statModules[moduleKey]();

    return module.default;
  };
}

async function loadPlayerScopeOptions() {
  const response = await fetch(publicDataUrl('prankster-elo/index.json'));

  if (!response.ok) {
    throw new Error('Failed to load Prankster ELO index');
  }

  const index = await response.json();

  return {
    defaultScopeId: latestMonthScopeId(index.scopes),
    scopes: index.scopes,
  };
}

async function loadPlayerStats(scope) {
  const response = await fetch(publicDataUrl(scope.file));

  if (!response.ok) {
    throw new Error(`Failed to load ${scope.file}`);
  }

  return response.json();
}

async function loadTournamentStats(scope) {
  const { tournamentsData } = await import('../../data/tournamentSources');
  const tournaments = tournamentsData.tournaments.filter((tournament) => tournamentMatchesScope(tournament, scope));

  return {
    tournamentFormat: tournamentsData.format,
    tournaments,
  };
}

function getRows(dataKey) {
  return (stats) => stats?.[dataKey] ?? [];
}

function usageViewConfig(category) {
  const config = categoryConfig[category];

  return {
    ...config,
    getMetrics: buildUsageMetrics(config.label),
    getRows: getRows(config.dataKey),
    loadScopeOptions: loadUsageScopeOptions,
    loadStats: loadUsageStats(category),
  };
}

export const viewConfigs = {
  pokemon: usageViewConfig('pokemon'),
  items: usageViewConfig('items'),
  moves: usageViewConfig('moves'),
  players: {
    ...categoryConfig.players,
    getMetrics: buildPlayerMetrics,
    getRows: getRows(categoryConfig.players.dataKey),
    loadScopeOptions: loadPlayerScopeOptions,
    loadStats: loadPlayerStats,
  },
  tournaments: {
    ...categoryConfig.tournaments,
    getMetrics: ({ rows, stats }) => buildTournamentMetrics({ rows, stats, tournamentFormat: stats?.tournamentFormat }),
    getRows: getRows(categoryConfig.tournaments.dataKey),
    loadScopeOptions: loadUsageScopeOptions,
    loadStats: loadTournamentStats,
  },
};
