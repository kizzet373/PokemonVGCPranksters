import { categoryConfig } from '../../config/categories';
import {
  loadPlayerIndex,
  loadPlayerReport,
  loadTournamentReport,
  loadUsageIndex,
  loadUsageReport,
} from '../../data/reportDataClient';
import { defaultMetaScopeId, selectableMetaScopes } from '../../data/metaScopes';
import { formatNumber, formatTournamentFormat, formatWholeNumber } from '../../utils/format';

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
  const formatLabel = tournamentFormat ? formatTournamentFormat(tournamentFormat) : 'All Formats';

  return [
    { label: 'Tournaments', value: stats ? formatNumber(rows.length) : '...', tone: 'green' },
    { label: 'Players', value: stats ? formatNumber(playerTotal) : '...', tone: 'blue' },
    { label: 'Average Tournament Size', value: stats && rows.length ? formatWholeNumber(playerTotal / rows.length) : '...', tone: 'gold' },
    { label: 'Format', value: formatLabel, tone: 'rose' },
  ];
}

async function loadUsageScopeOptions() {
  const statsIndex = await loadUsageIndex();
  const scopes = selectableMetaScopes(statsIndex.scopes);

  return {
    defaultScopeId: defaultMetaScopeId(scopes),
    scopes,
  };
}

function loadUsageStats(category) {
  return async (scope, { separateMegas = false } = {}) => {
    return loadUsageReport(scope, category, { separateMegas });
  };
}

async function loadPlayerScopeOptions() {
  const index = await loadPlayerIndex();
  const scopes = selectableMetaScopes(index.scopes);

  return {
    defaultScopeId: defaultMetaScopeId(scopes),
    scopes,
  };
}

async function loadPlayerStats(scope) {
  return loadPlayerReport(scope);
}

async function loadTournamentStats(scope) {
  return loadTournamentReport(scope);
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
