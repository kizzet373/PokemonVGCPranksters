import usageIndex from './usage-stats/index.json';
import pokemonStats from './pokemon-stats.json';
import championsMegaMetadata from './champions-mega-metadata.json';
import assetIndex from './asset-index.json';
import typeMatchups from './type-matchups.json';
import countryNames from './country-names.json';
import standingsIndex from './standings-index.json';
import { statModules } from './usageSources';
import { tournamentsData } from './tournamentSources';
import { publicDataUrl } from './publicDataUrl';
import { normalizeDataValues } from '../utils/dataNormalization';

const standingsModules = import.meta.glob('./standings/*.json');

function safeFileSegment(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function fetchJson(pathname, label = pathname) {
  const response = await fetch(publicDataUrl(pathname));

  if (!response.ok) {
    throw new Error(`Failed to load ${label}`);
  }

  return normalizeDataValues(await response.json());
}

function normalizePayload(payload) {
  return normalizeDataValues(payload?.default ?? payload);
}

export async function loadUsageIndex() {
  return normalizePayload(usageIndex);
}

export async function loadUsageReport(scope, category, { separateMegas = false } = {}) {
  const file = category === 'pokemon' && separateMegas
    ? scope.files.pokemonSeparateMegas ?? scope.files.pokemon
    : scope.files[category];
  const moduleKey = `./${file}`;
  const loader = statModules[moduleKey];

  if (!loader) {
    throw new Error(`Missing usage shard ${file}`);
  }

  const report = normalizePayload(await loader());

  if (category !== 'pokemon') {
    return report;
  }

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
  const entry = standingsIndex.byTournamentId?.[tournamentId];
  const moduleKey = entry?.file ? `./${entry.file}` : null;
  const loader = moduleKey ? standingsModules[moduleKey] : null;

  if (!loader) {
    throw new Error(`Missing standings shard ${tournamentId}`);
  }

  return normalizePayload(await loader());
}

export async function loadRawDocument(documentType) {
  const documents = {
    asset_index: assetIndex,
    champions_mega_metadata: championsMegaMetadata,
    country_names: countryNames,
    pokemon_stats: pokemonStats,
    standings_index: standingsIndex,
    tournament_index: tournamentsData,
    type_matchups: typeMatchups,
    usage_index: usageIndex,
  };
  const document = documents[documentType];

  if (!document) {
    throw new Error(`Missing raw document ${documentType}`);
  }

  return normalizePayload(document);
}
