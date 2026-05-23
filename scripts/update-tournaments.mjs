import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataPath = path.join(rootDir, 'src', 'data', 'regulation-m-a-tournaments.json');

const game = 'VGC';
const format = 'M-A';
const pageSize = 50;
const source = `https://play.limitlesstcg.com/api/tournaments?game=${game}&format=${format}`;

async function fetchTournamentPage(page) {
  const response = await fetch(`${source}&page=${page}`);

  if (!response.ok) {
    throw new Error(`Limitless API returned ${response.status} ${response.statusText} for page ${page}`);
  }

  const tournaments = await response.json();

  if (!Array.isArray(tournaments)) {
    throw new Error(`Expected page ${page} to return an array`);
  }

  return tournaments;
}

function sortNewestFirst(tournaments) {
  return [...tournaments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function main() {
  const file = JSON.parse((await readFile(dataPath, 'utf8')).replace(/^\uFEFF/, ''));
  const existingIds = new Set(file.tournaments.map((tournament) => tournament.id));
  const newTournaments = [];

  let page = 1;
  let shouldContinue = true;

  while (shouldContinue) {
    const tournaments = await fetchTournamentPage(page);

    if (tournaments.length === 0) {
      break;
    }

    for (const tournament of tournaments) {
      if (existingIds.has(tournament.id)) {
        shouldContinue = false;
        break;
      }

      newTournaments.push(tournament);
      existingIds.add(tournament.id);
    }

    page += 1;
  }

  if (newTournaments.length === 0) {
    console.log('No new tournaments found.');
    return;
  }

  const tournaments = sortNewestFirst([...newTournaments, ...file.tournaments]);
  const updatedFile = {
    ...file,
    source,
    game,
    format,
    fetchedAt: new Date().toISOString(),
    pageSize,
    pages: Math.max(file.pages ?? 0, page - 1),
    count: tournaments.length,
    tournaments,
  };

  await writeFile(dataPath, `${JSON.stringify(updatedFile, null, 2)}\n`, 'utf8');
  console.log(`Added ${newTournaments.length} new tournament${newTournaments.length === 1 ? '' : 's'}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
