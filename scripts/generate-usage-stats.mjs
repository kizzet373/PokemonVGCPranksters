import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePokemon } from './pokemon-normalization.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data');
const standingsDir = path.join(dataDir, 'standings');
const standingsIndexPath = path.join(dataDir, 'standings-index.json');
const statsDir = path.join(dataDir, 'usage-stats');
const legacyOutputPath = path.join(dataDir, 'usage-stats.json');
const categoryDirs = {
  pokemon: path.join(statsDir, 'pokemon'),
  items: path.join(statsDir, 'items'),
  moves: path.join(statsDir, 'moves'),
};

function parseJsonFile(contents) {
  return JSON.parse(contents.replace(/^\uFEFF/, ''));
}

async function readJson(pathname) {
  return parseJsonFile(await readFile(pathname, 'utf8'));
}

function createRecord() {
  return {
    wins: 0,
    losses: 0,
    ties: 0,
  };
}

function createAccumulator() {
  return {
    pokemon: new Map(),
    moves: new Map(),
    items: new Map(),
    totals: {
      tournaments: 0,
      standings: 0,
      recordsWithTeams: 0,
      totalGamesPlayed: 0,
      pokemonSets: 0,
    },
  };
}

function addRecord(target, record = {}) {
  target.wins += record.wins ?? 0;
  target.losses += record.losses ?? 0;
  target.ties += record.ties ?? 0;
}

function gamesPlayed(record = {}) {
  return (record.wins ?? 0) + (record.losses ?? 0) + (record.ties ?? 0);
}

function formatPercent(value) {
  return Number(value.toFixed(4));
}

function winRate(record) {
  const decidedGames = record.wins + record.losses;
  return decidedGames === 0 ? null : formatPercent((record.wins / decidedGames) * 100);
}

function usagePercent(count, total) {
  return total === 0 ? 0 : formatPercent((count / total) * 100);
}

function sortedAttacks(attacks = []) {
  return [...attacks].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function setKey(pokemon) {
  return JSON.stringify({
    ability: pokemon.ability ?? null,
    item: pokemon.item ?? null,
    attacks: sortedAttacks(pokemon.attacks),
  });
}

function ensureMapEntry(map, key, create) {
  if (!map.has(key)) {
    map.set(key, create());
  }

  return map.get(key);
}

function serializeRecord(record) {
  return {
    ...record,
    games: record.wins + record.losses + record.ties,
    winRate: winRate(record),
  };
}

function serializeNamedAggregate({ name, count, record, totalRecords }) {
  return {
    name,
    count,
    usagePercent: usagePercent(count, totalRecords),
    record: serializeRecord(record),
  };
}

function addTournamentToAccumulator(accumulator, tournamentStandings) {
  accumulator.totals.tournaments += 1;

  for (const standing of tournamentStandings.standings ?? []) {
    accumulator.totals.standings += 1;

    const team = (standing.team ?? []).map(normalizePokemon);

    if (team.length === 0) {
      continue;
    }

    accumulator.totals.recordsWithTeams += 1;

    const record = standing.record ?? createRecord();
    accumulator.totals.totalGamesPlayed += gamesPlayed(record);

    const recordItems = new Set();

    for (const teamMember of team) {
      accumulator.totals.pokemonSets += 1;

      const pokemonEntry = ensureMapEntry(accumulator.pokemon, teamMember.id, () => ({
        id: teamMember.id,
        name: teamMember.name,
        count: 0,
        record: createRecord(),
        sets: new Map(),
      }));

      pokemonEntry.count += 1;
      addRecord(pokemonEntry.record, record);

      const key = setKey(teamMember);
      const setEntry = ensureMapEntry(pokemonEntry.sets, key, () => ({
        ability: teamMember.ability ?? null,
        item: teamMember.item ?? null,
        attacks: sortedAttacks(teamMember.attacks),
        count: 0,
        record: createRecord(),
      }));

      setEntry.count += 1;
      addRecord(setEntry.record, record);

      const setMoves = new Set((teamMember.attacks ?? []).filter(Boolean));

      for (const move of setMoves) {
        const moveEntry = ensureMapEntry(accumulator.moves, move, () => ({
          name: move,
          count: 0,
          record: createRecord(),
        }));

        moveEntry.count += 1;
        addRecord(moveEntry.record, record);
      }

      if (teamMember.item) {
        recordItems.add(teamMember.item);
      }
    }

    for (const item of recordItems) {
      const itemEntry = ensureMapEntry(accumulator.items, item, () => ({
        name: item,
        count: 0,
        record: createRecord(),
      }));

      itemEntry.count += 1;
      addRecord(itemEntry.record, record);
    }
  }
}

function baseStatsFile({ generatedAt, scope, standingsIndex, totals, category, notes }) {
  return {
    schemaVersion: 1,
    generatedAt,
    scope,
    category,
    source: {
      standingsIndex: 'standings-index.json',
      standingsDirectory: 'standings',
    },
    notes: {
      winRate: 'Wins divided by wins plus losses; ties are tracked but excluded from win-rate denominator.',
      ...notes,
    },
    totals: {
      ...totals,
      indexedTournaments: standingsIndex.tournamentCount,
      indexedStandings: standingsIndex.standingsCount,
    },
  };
}

function serializeCategoryStats({ accumulator, generatedAt, scope, standingsIndex }) {
  const { totals } = accumulator;
  const pokemonStats = [...accumulator.pokemon.values()]
    .map((pokemonEntry) => ({
      id: pokemonEntry.id,
      name: pokemonEntry.name,
      count: pokemonEntry.count,
      usagePercent: usagePercent(pokemonEntry.count, totals.recordsWithTeams),
      record: serializeRecord(pokemonEntry.record),
      topSets: [...pokemonEntry.sets.values()]
        .sort((a, b) => b.count - a.count || (winRate(b.record) ?? -1) - (winRate(a.record) ?? -1))
        .slice(0, 5)
        .map((set, index) => ({
          rank: index + 1,
          ability: set.ability,
          item: set.item,
          attacks: set.attacks,
          count: set.count,
          usagePercent: usagePercent(set.count, totals.recordsWithTeams),
          pokemonUsagePercent: usagePercent(set.count, pokemonEntry.count),
          record: serializeRecord(set.record),
        })),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    pokemon: {
      ...baseStatsFile({
        generatedAt,
        scope,
        standingsIndex,
        totals,
        category: {
          id: 'pokemon',
          label: 'Pokemon',
        },
        notes: {
          usagePercent: 'Pokemon count divided by player records with public teams in this stats file scope.',
          setUsagePercent: 'Set count divided by player records with public teams in this stats file scope.',
          pokemonUsagePercent: 'Set count divided by that Pokemon total set count in this stats file scope.',
        },
      }),
      pokemon: pokemonStats,
    },
    moves: {
      ...baseStatsFile({
        generatedAt,
        scope,
        standingsIndex,
        totals,
        category: {
          id: 'moves',
          label: 'Moves',
        },
        notes: {
          usagePercent: 'Pokemon set slots with the move divided by total Pokemon set slots in this stats file scope.',
        },
      }),
      moves: [...accumulator.moves.values()]
        .map((move) => serializeNamedAggregate({ ...move, totalRecords: totals.pokemonSets }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    },
    items: {
      ...baseStatsFile({
        generatedAt,
        scope,
        standingsIndex,
        totals,
        category: {
          id: 'items',
          label: 'Items',
        },
        notes: {
          usagePercent: 'Player records with the item divided by player records with public teams in this stats file scope.',
        },
      }),
      items: [...accumulator.items.values()]
        .map((item) => serializeNamedAggregate({ ...item, totalRecords: totals.recordsWithTeams }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    },
  };
}

function statsFileName(scopeId) {
  return `${scopeId}.json`;
}

async function writeScopeStats(scopeStats) {
  await Promise.all(
    Object.entries(scopeStats).map(([category, stats]) =>
      writeFile(path.join(categoryDirs[category], statsFileName(stats.scope.id)), `${JSON.stringify(stats, null, 2)}\n`, 'utf8'),
    ),
  );
}

async function main() {
  const standingsIndex = await readJson(standingsIndexPath);
  const generatedAt = new Date().toISOString();
  const full = createAccumulator();
  const months = new Map();

  for (const tournamentId of standingsIndex.tournamentOrder ?? []) {
    const indexEntry = standingsIndex.byTournamentId[tournamentId];

    if (!indexEntry?.file) {
      continue;
    }

    const tournamentStandings = await readJson(path.join(dataDir, indexEntry.file));
    const month = tournamentStandings.tournament.date.slice(0, 7);

    addTournamentToAccumulator(full, tournamentStandings);
    addTournamentToAccumulator(
      ensureMapEntry(months, month, () => createAccumulator()),
      tournamentStandings,
    );
  }

  await Promise.all([mkdir(statsDir, { recursive: true }), ...Object.values(categoryDirs).map((dir) => mkdir(dir, { recursive: true }))]);

  const fullStats = serializeCategoryStats({
    accumulator: full,
    generatedAt,
    scope: {
      id: 'full',
      label: 'Full metagame',
      type: 'full',
    },
    standingsIndex,
  });

  await writeScopeStats(fullStats);
  await rm(legacyOutputPath, { force: true });

  const monthEntries = [...months.entries()].sort(([a], [b]) => a.localeCompare(b));
  await Promise.all(
    ['full', ...monthEntries.map(([month]) => month)].map((scopeId) =>
      rm(path.join(statsDir, statsFileName(scopeId)), { force: true }),
    ),
  );

  const monthlyStats = [];

  for (const [month, accumulator] of monthEntries) {
    const monthStats = serializeCategoryStats({
      accumulator,
      generatedAt,
      scope: {
        id: month,
        label: month,
        type: 'month',
        month,
      },
      standingsIndex,
    });

    await writeScopeStats(monthStats);
    monthlyStats.push(monthStats);
  }

  const statsIndex = {
    schemaVersion: 1,
    generatedAt,
    source: {
      standingsIndex: 'standings-index.json',
      standingsDirectory: 'standings',
    },
    categories: [
      {
        id: 'pokemon',
        label: 'Pokemon',
      },
      {
        id: 'items',
        label: 'Items',
      },
      {
        id: 'moves',
        label: 'Moves',
      },
    ],
    scopes: [
      {
        id: 'full',
        label: 'Full metagame',
        type: 'full',
        files: {
          pokemon: `usage-stats/pokemon/${statsFileName('full')}`,
          items: `usage-stats/items/${statsFileName('full')}`,
          moves: `usage-stats/moves/${statsFileName('full')}`,
        },
        totals: fullStats.pokemon.totals,
      },
      ...monthlyStats.map((monthStats) => ({
        id: monthStats.pokemon.scope.id,
        label: monthStats.pokemon.scope.label,
        type: 'month',
        month: monthStats.pokemon.scope.month,
        files: {
          pokemon: `usage-stats/pokemon/${statsFileName(monthStats.pokemon.scope.id)}`,
          items: `usage-stats/items/${statsFileName(monthStats.pokemon.scope.id)}`,
          moves: `usage-stats/moves/${statsFileName(monthStats.pokemon.scope.id)}`,
        },
        totals: monthStats.pokemon.totals,
      })),
    ],
  };

  await writeFile(path.join(statsDir, 'index.json'), `${JSON.stringify(statsIndex, null, 2)}\n`, 'utf8');
  console.log(`Generated full usage stats and ${monthEntries.length} monthly stats files.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
