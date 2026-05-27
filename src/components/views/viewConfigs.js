import { categoryConfig } from '../../config/categories';
import { formatNumber, formatPascalCase, formatWholeNumber } from '../../utils/format';

function buildUsageMetrics(label) {
  return ({ displayScope, rows, stats }) => [
    { label: 'Tournaments', value: formatNumber(displayScope.totals.tournaments), tone: 'green' },
    { label: 'Public teams', value: formatNumber(displayScope.totals.recordsWithTeams), tone: 'blue' },
    { label: 'Pokemon sets', value: formatNumber(displayScope.totals.pokemonSets), tone: 'gold' },
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

export const viewConfigs = {
  pokemon: {
    ...categoryConfig.pokemon,
    category: 'pokemon',
    dataSource: 'usage',
    getMetrics: buildUsageMetrics(categoryConfig.pokemon.label),
  },
  items: {
    ...categoryConfig.items,
    category: 'items',
    dataSource: 'usage',
    getMetrics: buildUsageMetrics(categoryConfig.items.label),
  },
  moves: {
    ...categoryConfig.moves,
    category: 'moves',
    dataSource: 'usage',
    getMetrics: buildUsageMetrics(categoryConfig.moves.label),
  },
  players: {
    ...categoryConfig.players,
    category: 'players',
    dataSource: 'players',
    getMetrics: buildPlayerMetrics,
  },
  tournaments: {
    ...categoryConfig.tournaments,
    category: 'tournaments',
    dataSource: 'tournaments',
    getMetrics: buildTournamentMetrics,
  },
};
