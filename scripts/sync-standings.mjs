import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePokemon } from './pokemon-normalization.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data');
const tournamentsPath = path.join(dataDir, 'regulation-m-a-tournaments.json');
const standingsDir = path.join(dataDir, 'standings');
const standingsIndexPath = path.join(dataDir, 'standings-index.json');

const sourceTemplate = 'https://play.limitlesstcg.com/api/tournaments/{id}/standings';
const requestDelayMs = 750;
const maxAttempts = 5;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseJsonFile(contents) {
  return JSON.parse(contents.replace(/^\uFEFF/, ''));
}

async function readJson(pathname, fallback) {
  try {
    return parseJsonFile(await readFile(pathname, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

async function pathExists(pathname) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

function standingsFileName(tournamentId) {
  return `${tournamentId}.json`;
}

function standingsFilePath(tournamentId) {
  return path.join(standingsDir, standingsFileName(tournamentId));
}

function standingsPublicPath(tournamentId) {
  return `standings/${standingsFileName(tournamentId)}`;
}

function dateOnly(value) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

function summarizeTournament(tournament) {
  return {
    id: tournament.id,
    name: tournament.name,
    date: dateOnly(tournament.date),
    game: tournament.game,
    format: tournament.format,
    players: tournament.players,
    organizerId: tournament.organizerId,
  };
}

function normalizeStanding(standing) {
  const { decklist, team, ...rest } = standing;

  return {
    ...rest,
    team: (team ?? decklist ?? []).map(normalizePokemon),
  };
}

function normalizeStandings(standings) {
  return standings.map(normalizeStanding);
}

async function fetchStandings(tournamentId) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(sourceTemplate.replace('{id}', tournamentId));

    if (response.ok) {
      const standings = await response.json();

      if (!Array.isArray(standings)) {
        throw new Error('Expected standings response to return an array');
      }

      return standings;
    }

    if (response.status !== 429 || attempt === maxAttempts) {
      throw new Error(`Limitless API returned ${response.status} ${response.statusText}`);
    }

    const retryAfter = Number(response.headers.get('retry-after'));
    const backoffMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : requestDelayMs * attempt * 2;
    await sleep(backoffMs);
  }
}

function buildIndexFile({ tournamentFile, tournaments, byTournamentId, failuresByTournamentId }) {
  const tournamentOrder = tournaments.map((tournament) => tournament.id);
  const standingsCount = Object.values(byTournamentId).reduce(
    (total, tournamentStandings) => total + tournamentStandings.standingsCount,
    0,
  );

  return {
    schemaVersion: 1,
    sourceTemplate,
    tournamentSource: tournamentFile.source,
    game: tournamentFile.game,
    format: tournamentFile.format,
    fetchedAt: new Date().toISOString(),
    tournamentCount: Object.keys(byTournamentId).length,
    standingsCount,
    tournamentOrder,
    byTournamentId,
    failuresByTournamentId,
  };
}

async function writeIndexFile(payload) {
  await writeFile(standingsIndexPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function writeTournamentStandings({ tournament, standings }) {
  const normalizedStandings = normalizeStandings(standings);
  const payload = {
    schemaVersion: 2,
    source: sourceTemplate.replace('{id}', tournament.id),
    tournament: summarizeTournament(tournament),
    fetchedAt: new Date().toISOString(),
    standingsCount: normalizedStandings.length,
    standings: normalizedStandings,
  };

  await mkdir(standingsDir, { recursive: true });
  await writeFile(standingsFilePath(tournament.id), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return payload;
}

async function updateExistingTournamentSummary(tournament) {
  const pathname = standingsFilePath(tournament.id);

  if (!(await pathExists(pathname))) {
    return null;
  }

  const payload = await readJson(pathname);
  const tournamentSummary = summarizeTournament(tournament);

  if (JSON.stringify(payload.tournament) === JSON.stringify(tournamentSummary)) {
    return payload;
  }

  const updatedPayload = {
    ...payload,
    tournament: tournamentSummary,
  };

  await writeFile(pathname, `${JSON.stringify(updatedPayload, null, 2)}\n`, 'utf8');
  return updatedPayload;
}

async function main() {
  const tournamentFile = await readJson(tournamentsPath);
  const tournaments = tournamentFile.tournaments ?? [];
  const previous = await readJson(standingsIndexPath, {
    schemaVersion: 1,
    sourceTemplate,
    tournamentSource: tournamentFile.source,
    game: tournamentFile.game,
    format: tournamentFile.format,
    fetchedAt: null,
    tournamentCount: 0,
    standingsCount: 0,
    tournamentOrder: [],
    byTournamentId: {},
    failuresByTournamentId: {},
  });

  const byTournamentId = previous.byTournamentId ?? {};
  const failuresByTournamentId = previous.failuresByTournamentId ?? {};
  const missingTournaments = [];
  let normalizedCount = 0;

  for (const tournament of tournaments) {
    const existingPayload = await updateExistingTournamentSummary(tournament);

    if (existingPayload) {
      const tournamentSummary = summarizeTournament(tournament);
      const currentIndexEntry = byTournamentId[tournament.id];

      delete failuresByTournamentId[tournament.id];

      if (!currentIndexEntry) {
        byTournamentId[tournament.id] = {
          tournament: existingPayload.tournament,
          fetchedAt: existingPayload.fetchedAt,
          standingsCount: existingPayload.standingsCount,
          file: standingsPublicPath(tournament.id),
        };
        normalizedCount += 1;
      } else if (JSON.stringify(currentIndexEntry.tournament) !== JSON.stringify(tournamentSummary)) {
        byTournamentId[tournament.id] = {
          ...currentIndexEntry,
          tournament: tournamentSummary,
        };
        normalizedCount += 1;
      }
    }

    if (!byTournamentId[tournament.id] || !(await pathExists(standingsFilePath(tournament.id)))) {
      missingTournaments.push(tournament);
    }
  }

  let fetchedCount = 0;

  for (const tournament of missingTournaments) {
    try {
      await sleep(requestDelayMs);
      const standings = await fetchStandings(tournament.id);
      const payload = await writeTournamentStandings({ tournament, standings });

      byTournamentId[tournament.id] = {
        tournament: payload.tournament,
        fetchedAt: payload.fetchedAt,
        standingsCount: payload.standingsCount,
        file: standingsPublicPath(tournament.id),
      };

      delete failuresByTournamentId[tournament.id];
      fetchedCount += 1;
      await writeIndexFile(buildIndexFile({ tournamentFile, tournaments, byTournamentId, failuresByTournamentId }));
      console.log(`Fetched standings for ${tournament.name} (${standings.length})`);
    } catch (error) {
      failuresByTournamentId[tournament.id] = {
        tournament: summarizeTournament(tournament),
        attemptedAt: new Date().toISOString(),
        message: error.message,
      };

      await writeIndexFile(buildIndexFile({ tournamentFile, tournaments, byTournamentId, failuresByTournamentId }));
      console.warn(`Skipped ${tournament.name}: ${error.message}`);
    }
  }

  await writeIndexFile(buildIndexFile({ tournamentFile, tournaments, byTournamentId, failuresByTournamentId }));

  if (fetchedCount === 0) {
    console.log(normalizedCount === 0 ? 'No missing standings found.' : `Normalized ${normalizedCount} standings tournament date${normalizedCount === 1 ? '' : 's'}.`);
    return;
  }

  console.log(`Fetched standings for ${fetchedCount} tournament${fetchedCount === 1 ? '' : 's'}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
