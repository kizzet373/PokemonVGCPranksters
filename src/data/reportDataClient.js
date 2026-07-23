import championsMegaMetadata from './champions-mega-metadata.json';
import assetIndex from './asset-index.json';
import typeMatchups from './type-matchups.json';
import countryNames from './country-names.json';
import { publicDataUrl } from './publicDataUrl';
import { normalizeDataValues } from '../utils/dataNormalization';

const jsonCache = new Map();

function safeFileSegment(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function fetchJson(pathname, label = pathname) {
  if (jsonCache.has(pathname)) {
    return jsonCache.get(pathname);
  }

  const response = await fetch(publicDataUrl(pathname));

  if (!response.ok) {
    throw new Error(`Failed to load ${label}`);
  }

  const payload = normalizeDataValues(await response.json());
  jsonCache.set(pathname, payload);
  return payload;
}

export async function loadUsageIndex() {
  return fetchJson('usage-stats/index.json', 'usage index');
}

export async function loadUsageReport(scope, category, { separateMegas = false } = {}) {
  const file = category === 'pokemon' && separateMegas
    ? scope.files.pokemonSeparateMegas ?? scope.files.pokemon
    : scope.files[category];

  if (!file) {
    throw new Error(`Missing usage shard ${file}`);
  }

  const report = await fetchJson(file, `${category} usage ${scope.id}`);

  if (category !== 'pokemon') {
    return report;
  }

  const pokemonStats = await loadRawDocument('pokemon_stats');
  const typingByName = new Map((pokemonStats.pokemon ?? []).map((pokemon) => [pokemon.name, pokemon.typing ?? []]));

  return {
    ...report,
    pokemon: (report.pokemon ?? []).map((pokemon) => ({
      ...pokemon,
      typing: pokemon.typing ?? typingByName.get(pokemon.name) ?? [],
    })),
  };
}

export async function loadPlayerIndex() {
  return fetchJson('prankster-elo/index.json', 'Prankster ELO index');
}

export async function loadPlayerReport(scope) {
  return fetchJson(scope.file, scope.label ?? scope.id);
}

export async function loadPlayerDetails(playerId) {
  return fetchJson(`prankster-elo/players/${safeFileSegment(playerId)}.json`, `player ${playerId}`);
}

function tournamentMatchesScope(tournament, scope) {
  if (scope.type === 'full') {
    return true;
  }

  const month = scope.month ?? scope.id;

  if (tournament.date?.slice(0, 7) !== month) {
    return false;
  }

  return !scope.format || tournament.format === scope.format;
}

export async function loadTournamentReport(scope) {
  const tournamentsData = await loadRawDocument('tournament_index');
  const tournaments = (tournamentsData.tournaments ?? [])
    .filter((tournament) => tournamentMatchesScope(tournament, scope))
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  const playerTotal = tournaments.reduce((total, tournament) => total + (tournament.players ?? 0), 0);

  return {
    schemaVersion: 1,
    scope,
    tournamentFormat: scope.format ?? '',
    totals: {
      tournaments: tournaments.length,
      players: playerTotal,
      averageTournamentSize: tournaments.length ? Number((playerTotal / tournaments.length).toFixed(4)) : 0,
    },
    tournaments,
  };
}

export async function loadStandings(tournamentId) {
  const standingsIndex = await loadRawDocument('standings_index');
  const entry = standingsIndex.byTournamentId?.[tournamentId];

  if (!entry?.file) {
    throw new Error(`Missing standings shard ${tournamentId}`);
  }

  return fetchJson(entry.file, `standings ${tournamentId}`);
}

export async function loadRawDocument(documentType) {
  const fetchedDocuments = {
    pokemon_stats: 'pokemon-stats.json',
    standings_index: 'standings-index.json',
    tournament_index: 'regulation-m-a-tournaments.json',
    usage_index: 'usage-stats/index.json',
  };
  const bundledDocuments = {
    asset_index: assetIndex,
    champions_mega_metadata: championsMegaMetadata,
    country_names: countryNames,
    type_matchups: typeMatchups,
  };
  const fetchedPath = fetchedDocuments[documentType];

  if (fetchedPath) {
    return fetchJson(fetchedPath, documentType);
  }

  const document = bundledDocuments[documentType];

  if (!document) {
    throw new Error(`Missing raw document ${documentType}`);
  }

  return normalizeDataValues(document);
}
