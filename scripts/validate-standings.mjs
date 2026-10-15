import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildKnownPokemonKeys, isReportingInvalid, validateStandingForReporting } from './standing-validation.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'public', 'data');
const standingsDir = path.join(dataDir, 'standings');
const standingsIndexPath = path.join(dataDir, 'standings-index.json');
const pokemonStatsPath = path.join(dataDir, 'pokemon-stats.json');
const dryRun = process.argv.includes('--dry-run');

function parseJsonFile(contents) {
  return JSON.parse(contents.replace(/^\uFEFF/, ''));
}

async function readJson(pathname) {
  return parseJsonFile(await readFile(pathname, 'utf8'));
}

function publicPathToFile(file) {
  return path.join(dataDir, ...file.split('/'));
}

async function main() {
  const [standingsIndex, pokemonStats] = await Promise.all([
    readJson(standingsIndexPath),
    readJson(pokemonStatsPath),
  ]);
  const knownPokemonKeys = buildKnownPokemonKeys(pokemonStats.pokemon ?? []);
  const nextByTournamentId = { ...(standingsIndex.byTournamentId ?? {}) };
  let changedTournamentCount = 0;
  let invalidStandingCount = 0;
  let normalizedStandingCount = 0;
  const issueCounts = new Map();

  for (const tournamentId of standingsIndex.tournamentOrder ?? []) {
    const indexEntry = nextByTournamentId[tournamentId];

    if (!indexEntry?.file) {
      continue;
    }

    const pathname = publicPathToFile(indexEntry.file);
    const payload = await readJson(pathname);
    const standings = (payload.standings ?? []).map((standing) => (
      validateStandingForReporting(standing, { knownPokemonKeys })
    ));
    const tournamentInvalidCount = standings.filter(isReportingInvalid).length;
    const nextPayloadBase = {
      ...payload,
      standingsCount: standings.length,
      standings,
    };
    delete nextPayloadBase.invalidStandingsCount;
    const nextPayload = tournamentInvalidCount > 0
      ? { ...nextPayloadBase, invalidStandingsCount: tournamentInvalidCount }
      : nextPayloadBase;
    const previousSerialized = JSON.stringify(payload);
    const nextSerialized = JSON.stringify(nextPayload);

    invalidStandingCount += tournamentInvalidCount;
    normalizedStandingCount += standings.length;
    const nextIndexEntry = {
      ...indexEntry,
      standingsCount: standings.length,
    };
    delete nextIndexEntry.invalidStandingsCount;
    nextByTournamentId[tournamentId] = tournamentInvalidCount > 0
      ? { ...nextIndexEntry, invalidStandingsCount: tournamentInvalidCount }
      : nextIndexEntry;

    for (const standing of standings) {
      for (const issue of standing.reporting?.issues ?? []) {
        issueCounts.set(issue.code, (issueCounts.get(issue.code) ?? 0) + 1);
      }
    }

    if (previousSerialized !== nextSerialized) {
      changedTournamentCount += 1;

      if (!dryRun) {
        await writeFile(pathname, `${JSON.stringify(nextPayload, null, 2)}\n`, 'utf8');
      }
    }
  }

  const nextIndex = {
    ...standingsIndex,
    schemaVersion: Math.max(2, standingsIndex.schemaVersion ?? 1),
    invalidStandingsCount: invalidStandingCount,
    byTournamentId: nextByTournamentId,
  };

  if (!dryRun && JSON.stringify(standingsIndex) !== JSON.stringify(nextIndex)) {
    await writeFile(standingsIndexPath, `${JSON.stringify(nextIndex, null, 2)}\n`, 'utf8');
  }

  console.log(`${dryRun ? 'Would validate' : 'Validated'} ${normalizedStandingCount} standings across ${standingsIndex.tournamentCount ?? 0} tournaments.`);
  console.log(`${invalidStandingCount} standing${invalidStandingCount === 1 ? '' : 's'} excluded from reporting; ${changedTournamentCount} tournament file${changedTournamentCount === 1 ? '' : 's'} ${dryRun ? 'would change' : 'changed'}.`);

  if (issueCounts.size > 0) {
    console.log(`Validation issues: ${[...issueCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([code, count]) => `${code}=${count}`).join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
