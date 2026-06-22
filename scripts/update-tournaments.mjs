import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataPath = path.join(rootDir, 'src', 'data', 'regulation-m-a-tournaments.json');

const game = 'VGC';
const pageSize = 50;
const targetRegulations = ['M-A', 'M-B'];
const sources = [
  {
    id: 'vgc',
    source: `https://play.limitlesstcg.com/api/tournaments?game=${game}`,
    includeOnlyInferredRegulations: true,
  },
  ...targetRegulations.map((regulation) => ({
    id: regulation.toLowerCase(),
    source: `https://play.limitlesstcg.com/api/tournaments?game=${game}&format=${regulation}`,
    fallbackRegulation: regulation,
  })),
];

async function fetchTournamentPage(source, page) {
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

function dateOnly(value) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

function inferRegulation(name) {
  const normalizedName = String(name ?? '').toLowerCase();
  const match = normalizedName.match(/\b(?:reg(?:ulation)?\s*)?m[\s-]*([ab])\b/i);

  if (!match) {
    return null;
  }

  return `M-${match[1].toUpperCase()}`;
}

function normalizeTournament(tournament, fallbackRegulation = null) {
  const limitlessFormat = tournament.limitlessFormat ?? tournament.format;
  const regulation = inferRegulation(tournament.name) ?? fallbackRegulation ?? tournament.format;

  return {
    ...tournament,
    limitlessFormat,
    format: regulation,
    date: dateOnly(tournament.date),
  };
}

async function main() {
  const file = JSON.parse((await readFile(dataPath, 'utf8')).replace(/^\uFEFF/, ''));
  const existingIds = new Set(file.tournaments.map((tournament) => tournament.id));
  const newTournaments = [];
  const pagesBySource = {};

  for (const sourceConfig of sources) {
    let page = 1;
    let shouldContinue = true;

    while (shouldContinue) {
      const tournaments = await fetchTournamentPage(sourceConfig.source, page);

      if (tournaments.length === 0) {
        break;
      }

      for (const tournament of tournaments) {
        if (existingIds.has(tournament.id)) {
          shouldContinue = false;
          break;
        }

        const inferredRegulation = inferRegulation(tournament.name);

        if (sourceConfig.includeOnlyInferredRegulations && !targetRegulations.includes(inferredRegulation)) {
          continue;
        }

        const normalizedTournament = normalizeTournament(tournament, sourceConfig.fallbackRegulation);

        if (!targetRegulations.includes(normalizedTournament.format)) {
          continue;
        }

        newTournaments.push(normalizedTournament);
        existingIds.add(tournament.id);
      }

      page += 1;
    }

    pagesBySource[sourceConfig.id] = page - 1;
  }

  const normalizedExistingTournaments = file.tournaments.map((tournament) => normalizeTournament(tournament));

  if (newTournaments.length === 0) {
    const tournaments = sortNewestFirst(normalizedExistingTournaments);
    const changed = JSON.stringify(tournaments) !== JSON.stringify(file.tournaments);

    if (!changed) {
      console.log('No new tournaments found.');
      return;
    }

    const updatedFile = {
      ...file,
      source: sources[0].source,
      sources: sources.map((sourceConfig) => sourceConfig.source),
      game,
      format: 'mixed',
      regulations: targetRegulations,
      fetchedAt: new Date().toISOString(),
      pageSize,
      pages: pagesBySource,
      count: tournaments.length,
      tournaments,
    };

    await writeFile(dataPath, `${JSON.stringify(updatedFile, null, 2)}\n`, 'utf8');
    console.log('Normalized existing tournament dates.');
    return;
  }

  const tournaments = sortNewestFirst([...newTournaments, ...normalizedExistingTournaments]);
  const updatedFile = {
    ...file,
    source: sources[0].source,
    sources: sources.map((sourceConfig) => sourceConfig.source),
    game,
    format: 'mixed',
    regulations: targetRegulations,
    fetchedAt: new Date().toISOString(),
    pageSize,
    pages: pagesBySource,
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
