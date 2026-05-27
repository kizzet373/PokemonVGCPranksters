import { categoryConfig } from '../../config/categories';
import { publicDataUrl } from '../../data/publicDataUrl';
import { formatNumber, formatPascalCase, formatWholeNumber } from '../../utils/format';

function buildUsageMetrics(label) {
  return ({ activeScope, rows, stats }) => [
    { label: 'Tournaments', value: formatNumber(activeScope.totals.tournaments), tone: 'green' },
    { label: 'Public teams', value: formatNumber(activeScope.totals.recordsWithTeams), tone: 'blue' },
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
    { label: 'Format', value: formatPascalCase(tournamentFormat), tone: 'rose' },
  ];
}

const latestMonthScopeId = (scopes) =>
  scopes
    .filter((scope) => scope.type === 'month')
    .map((scope) => scope.id)
    .sort()
    .at(-1) ?? 'full';

async function loadUsageScopeOptions() {
  const { defaultUsageScopeId, statsIndex } = await import('../../data/usageSources');

  return {
    defaultScopeId: defaultUsageScopeId,
    scopes: statsIndex.scopes,
  };
}

function loadUsageStats(category) {
  return async (scope) => {
    const { statModules } = await import('../../data/usageSources');
    const moduleKey = `./${scope.files[category]}`;
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
  const tournaments = tournamentsData.tournaments.filter((tournament) => {
    if (scope.type === 'full') {
      return true;
    }

    return tournament.date.slice(0, 7) === scope.id;
  });

  return {
    tournamentFormat: tournamentsData.format,
    tournaments,
  };
}

function getRows(dataKey) {
  return (stats) => stats?.[dataKey] ?? [];
}

export const viewConfigs = {
  pokemon: {
    ...categoryConfig.pokemon,
    getMetrics: buildUsageMetrics(categoryConfig.pokemon.label),
    getRows: getRows(categoryConfig.pokemon.dataKey),
    loadScopeOptions: loadUsageScopeOptions,
    loadStats: loadUsageStats('pokemon'),
  },
  items: {
    ...categoryConfig.items,
    getMetrics: buildUsageMetrics(categoryConfig.items.label),
    getRows: getRows(categoryConfig.items.dataKey),
    loadScopeOptions: loadUsageScopeOptions,
    loadStats: loadUsageStats('items'),
  },
  moves: {
    ...categoryConfig.moves,
    getMetrics: buildUsageMetrics(categoryConfig.moves.label),
    getRows: getRows(categoryConfig.moves.dataKey),
    loadScopeOptions: loadUsageScopeOptions,
    loadStats: loadUsageStats('moves'),
  },
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
