import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePokemon } from './pokemon-normalization.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data');
const tournamentsPath = path.join(dataDir, 'regulation-m-a-tournaments.json');
const standingsDir = path.join(dataDir, 'standings');

function parseJsonFile(contents) {
  return JSON.parse(contents.replace(/^\uFEFF/, ''));
}

async function readJson(pathname, fallback = null) {
  try {
    return parseJsonFile(await readFile(pathname, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

function winnerFromStandings(tournamentStandings) {
  const winner =
    (tournamentStandings.standings ?? []).find((standing) => standing.placing === 1) ??
    (tournamentStandings.standings ?? [])
      .filter((standing) => Number.isFinite(standing.placing))
      .sort((a, b) => a.placing - b.placing)[0];

  if (!winner) {
    return null;
  }

  return {
    name: winner.name ?? winner.player ?? null,
    country: winner.country ?? null,
    record: winner.record ?? null,
    team: (winner.team ?? []).map((pokemon) => {
      const normalizedPokemon = normalizePokemon(pokemon);

      return {
        id: normalizedPokemon.id ?? null,
        name: normalizedPokemon.name ?? null,
        item: normalizedPokemon.item ?? null,
      };
    }),
  };
}

async function main() {
  const tournamentFile = await readJson(tournamentsPath);
  let updatedCount = 0;
  let missingCount = 0;

  const tournaments = await Promise.all(
    (tournamentFile.tournaments ?? []).map(async (tournament) => {
      const standings = await readJson(path.join(standingsDir, `${tournament.id}.json`));
      const winner = standings ? winnerFromStandings(standings) : null;

      if (!winner) {
        missingCount += 1;
      }

      const updatedTournament = {
        ...tournament,
        winner,
      };

      if (JSON.stringify(tournament.winner ?? null) !== JSON.stringify(winner)) {
        updatedCount += 1;
      }

      return updatedTournament;
    }),
  );

  await writeFile(
    tournamentsPath,
    `${JSON.stringify(
      {
        ...tournamentFile,
        tournaments,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(`Updated ${updatedCount} tournament winner summar${updatedCount === 1 ? 'y' : 'ies'}.`);

  if (missingCount > 0) {
    console.log(`${missingCount} tournament${missingCount === 1 ? '' : 's'} did not have a standings winner.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
