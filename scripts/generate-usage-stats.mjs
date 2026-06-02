import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Generations, toID } from '@smogon/calc';
import { filterMetricEligibleStandings, metricEligibilityNote } from './metric-filters.mjs';
import { normalizeDataText, normalizePokemon } from './pokemon-normalization.mjs';

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
const pokemonSeparateMegasDir = path.join(statsDir, 'pokemon-separate-megas');
const minDetailUsagePercent = 1;
const generation = Generations.get(9);
const megaStoneAliases = new Map([
  ['charizarditex', ['charizard x', 'mega stone x']],
  ['charizarditey', ['charizard y', 'mega stone y']],
  ['froslassite', ['frosslassite']],
  ['lopunnite', ['lopunite', 'loppunite', 'lopunnyite']],
  ['lucarionite', ['lucarite', 'lucarioite']],
  ['lucarionitez', ['lucarite z', 'lucario z', 'lucarioite z', 'mega stone z']],
  ['skarmorite', ['skarmoryite']],
]);

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
      excludedGameOneDrops: 0,
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

function hasMinimumDetailUsage(count, total) {
  return usagePercent(count, total) >= minDetailUsagePercent;
}

function sortedAttacks(attacks = []) {
  return [...attacks].map(normalizeDataText).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function setKey(pokemon) {
  return JSON.stringify({
    ability: pokemon.ability ?? null,
    item: pokemon.item ?? null,
    attacks: sortedAttacks(pokemon.attacks),
  });
}

function abilityItemKey(pokemon) {
  return JSON.stringify({
    ability: pokemon.ability ?? null,
    item: pokemon.item ?? null,
  });
}

function addAggregateUsage(aggregate, record) {
  aggregate.count += 1;
  addRecord(aggregate.record, record);
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

function formatUsagePokemonName(name) {
  return normalizeDataText(name).replace(/\s+/g, '-');
}

function toUsageBaseStats(baseStats = {}) {
  return {
    hp: baseStats.hp ?? 0,
    attack: baseStats.atk ?? 0,
    defense: baseStats.def ?? 0,
    specialAttack: baseStats.spa ?? 0,
    specialDefense: baseStats.spd ?? 0,
    speed: baseStats.spe ?? 0,
  };
}

function firstAbility(abilities = {}) {
  return normalizeDataText(Object.values(abilities).filter(Boolean)[0]);
}

function buildMegaStoneMap() {
  const megaStoneMap = new Map();

  for (const item of generation.items) {
    if (!item.megaStone) {
      continue;
    }

    const [baseName, megaName] = Object.entries(item.megaStone)[0] ?? [];
    const species = generation.species.get(toID(megaName));

    if (!baseName || !species) {
      continue;
    }

    const megaSpecies = {
      baseId: toID(baseName),
      id: formatUsagePokemonName(species.name),
      name: formatUsagePokemonName(species.name),
      typing: species.types.map(normalizeDataText),
      baseStats: toUsageBaseStats(species.baseStats),
      ability: firstAbility(species.abilities),
      megaStone: normalizeDataText(item.name),
    };
    const itemAliases = new Set([item.id, toID(item.name), toID(normalizeDataText(item.name))]);
    const suffix = item.name.match(/\s+([xyz])$/i)?.[1];

    itemAliases.add(toID(`${baseName}ite`));

    if (suffix) {
      itemAliases.add(toID(`${baseName} ${suffix}`));
      itemAliases.add(toID(`${baseName}ite ${suffix}`));
      itemAliases.add(toID(`mega stone ${suffix}`));
    }

    for (const alias of megaStoneAliases.get(item.id) ?? []) {
      itemAliases.add(toID(alias));
    }

    for (const alias of itemAliases) {
      megaStoneMap.set(alias, megaSpecies);
    }
  }

  return megaStoneMap;
}

const megaStoneMap = buildMegaStoneMap();

function separateMegaPokemon(pokemon) {
  const megaSpecies = megaStoneMap.get(toID(pokemon.item));

  if (!megaSpecies || toID(pokemon.id ?? pokemon.name) !== megaSpecies.baseId) {
    return pokemon;
  }

  return {
    ...pokemon,
    id: megaSpecies.id,
    name: megaSpecies.name,
    typing: megaSpecies.typing,
    baseStats: megaSpecies.baseStats,
    ability: megaSpecies.ability,
    baseAbility: pokemon.ability ?? null,
    megaStone: megaSpecies.megaStone,
  };
}

function serializeNamedAggregate({ name, count, record, totalRecords }) {
  return {
    name: normalizeDataText(name),
    count,
    usagePercent: usagePercent(count, totalRecords),
    record: serializeRecord(record),
  };
}

function serializeTopPokemon(pokemon, totalPokemonSets) {
  return [...pokemon.values()]
    .filter((entry) => hasMinimumDetailUsage(entry.count, totalPokemonSets))
    .map((entry) => ({
      id: entry.id,
      name: normalizeDataText(entry.name),
      count: entry.count,
      usagePercent: usagePercent(entry.count, totalPokemonSets),
      record: serializeRecord(entry.record),
    }))
    .sort((a, b) => b.count - a.count || (winRate(b.record) ?? -1) - (winRate(a.record) ?? -1) || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function serializeUsageAggregate({ aggregate, totalRecords }) {
  return {
    ...serializeNamedAggregate({ ...aggregate, totalRecords }),
    topPokemon: serializeTopPokemon(aggregate.pokemon, aggregate.pokemonSetCount ?? aggregate.count),
  };
}

function serializePokemonAggregateList(entries, totalRecords, createEntry) {
  return [...entries.values()]
    .filter((entry) => hasMinimumDetailUsage(entry.count, totalRecords))
    .sort(
      (a, b) =>
        b.count - a.count ||
        (winRate(b.record) ?? -1) - (winRate(a.record) ?? -1) ||
        String(a.ability ?? a.item ?? '').localeCompare(String(b.ability ?? b.item ?? '')),
    )
    .slice(0, 5)
    .map((entry, index) => ({
      rank: index + 1,
      ...createEntry(entry),
      count: entry.count,
      usagePercent: usagePercent(entry.count, totalRecords),
      pokemonUsagePercent: usagePercent(entry.count, totalRecords),
      record: serializeRecord(entry.record),
    }));
}

function addPokemonUsage(aggregate, teamMember, record) {
  aggregate.pokemonSetCount += 1;

  const pokemonEntry = ensureMapEntry(aggregate.pokemon, teamMember.id, () => ({
    id: teamMember.id,
    name: teamMember.name,
    count: 0,
    record: createRecord(),
  }));

  pokemonEntry.count += 1;
  addRecord(pokemonEntry.record, record);
}

function addTournamentToAccumulator(accumulator, tournamentStandings, { separateMegas = false } = {}) {
  accumulator.totals.tournaments += 1;
  const standings = tournamentStandings.standings ?? [];
  const metricStandings = filterMetricEligibleStandings(standings);

  accumulator.totals.excludedGameOneDrops += standings.length - metricStandings.length;

  for (const standing of metricStandings) {
    accumulator.totals.standings += 1;

    const team = (standing.team ?? [])
      .map(normalizePokemon)
      .map((pokemon) => (separateMegas ? separateMegaPokemon(pokemon) : pokemon));

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
        typing: teamMember.typing,
        baseStats: teamMember.baseStats,
        megaStone: teamMember.megaStone,
        count: 0,
        record: createRecord(),
        sets: new Map(),
        abilityItems: new Map(),
        abilities: new Map(),
        baseAbilities: new Map(),
        items: new Map(),
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

      const abilityItemEntry = ensureMapEntry(pokemonEntry.abilityItems, abilityItemKey(teamMember), () => ({
        ability: teamMember.ability ?? null,
        item: teamMember.item ?? null,
        count: 0,
        record: createRecord(),
      }));
      addAggregateUsage(abilityItemEntry, record);

      const abilityEntry = ensureMapEntry(pokemonEntry.abilities, teamMember.ability ?? null, () => ({
        ability: teamMember.ability ?? null,
        count: 0,
        record: createRecord(),
      }));
      addAggregateUsage(abilityEntry, record);

      if (teamMember.megaStone) {
        const baseAbilityEntry = ensureMapEntry(pokemonEntry.baseAbilities, teamMember.baseAbility ?? null, () => ({
          ability: teamMember.baseAbility ?? null,
          count: 0,
          record: createRecord(),
        }));
        addAggregateUsage(baseAbilityEntry, record);
      }

      const itemEntry = ensureMapEntry(pokemonEntry.items, teamMember.item ?? null, () => ({
        item: teamMember.item ?? null,
        count: 0,
        record: createRecord(),
      }));
      addAggregateUsage(itemEntry, record);

      const setMoves = new Set((teamMember.attacks ?? []).filter(Boolean));

      for (const move of setMoves) {
        const moveEntry = ensureMapEntry(accumulator.moves, move, () => ({
          name: move,
          count: 0,
          record: createRecord(),
          pokemonSetCount: 0,
          pokemon: new Map(),
        }));

        moveEntry.count += 1;
        addRecord(moveEntry.record, record);
        addPokemonUsage(moveEntry, teamMember, record);
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
        pokemonSetCount: 0,
        pokemon: new Map(),
      }));

      itemEntry.count += 1;
      addRecord(itemEntry.record, record);
    }

    for (const teamMember of team) {
      if (!teamMember.item) {
        continue;
      }

      const itemEntry = accumulator.items.get(teamMember.item);
      addPokemonUsage(itemEntry, teamMember, record);
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
      metricEligibility: metricEligibilityNote,
      ...notes,
    },
    totals: {
      ...totals,
      indexedTournaments: standingsIndex.tournamentCount,
      indexedStandings: standingsIndex.standingsCount,
    },
  };
}

function serializeCategoryStats({ accumulator, generatedAt, scope, standingsIndex, includeBaseAbilityNotes = false }) {
  const { totals } = accumulator;
  const pokemonStats = [...accumulator.pokemon.values()]
    .map((pokemonEntry) => ({
      id: pokemonEntry.id,
      name: pokemonEntry.name,
      ...(pokemonEntry.typing?.length ? { typing: pokemonEntry.typing } : {}),
      ...(pokemonEntry.baseStats ? { baseStats: pokemonEntry.baseStats } : {}),
      ...(pokemonEntry.megaStone ? { megaStone: pokemonEntry.megaStone } : {}),
      count: pokemonEntry.count,
      usagePercent: usagePercent(pokemonEntry.count, totals.recordsWithTeams),
      record: serializeRecord(pokemonEntry.record),
      topAbilityItems: serializePokemonAggregateList(pokemonEntry.abilityItems, pokemonEntry.count, (entry) => ({
        ability: normalizeDataText(entry.ability),
        item: normalizeDataText(entry.item),
      })),
      topAbilities: serializePokemonAggregateList(pokemonEntry.abilities, pokemonEntry.count, (entry) => ({
        ability: normalizeDataText(entry.ability),
      })),
      ...(pokemonEntry.megaStone
        ? {
            baseAbilities: serializePokemonAggregateList(pokemonEntry.baseAbilities, pokemonEntry.count, (entry) => ({
              ability: normalizeDataText(entry.ability),
            })),
          }
        : {}),
      topItems: serializePokemonAggregateList(pokemonEntry.items, pokemonEntry.count, (entry) => ({
        item: normalizeDataText(entry.item),
      })),
      topSets: [...pokemonEntry.sets.values()]
        .filter((set) => hasMinimumDetailUsage(set.count, pokemonEntry.count))
        .sort((a, b) => b.count - a.count || (winRate(b.record) ?? -1) - (winRate(a.record) ?? -1))
        .slice(0, 5)
        .map((set, index) => ({
          rank: index + 1,
          ability: normalizeDataText(set.ability),
          item: normalizeDataText(set.item),
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
          label: 'pokemon',
        },
        notes: {
          usagePercent: 'Pokemon count divided by player records with public teams in this stats file scope.',
          setUsagePercent: 'Set count divided by player records with public teams in this stats file scope.',
          pokemonUsagePercent: 'Set count divided by that Pokemon total set count in this stats file scope.',
          topAbilityItems: 'Ability plus item counts are grouped across all move combinations for that Pokemon.',
          topAbilities: 'Ability counts are grouped across all items and move combinations for that Pokemon.',
          ...(includeBaseAbilityNotes
            ? { baseAbilities: 'For separated mega Pokemon, base ability counts show the submitted pre-mega ability usage.' }
            : {}),
          topItems: 'Item counts are grouped across all abilities and move combinations for that Pokemon.',
          detailMinimum: `Top detail lists only include entries with at least ${minDetailUsagePercent}% usage within their modal detail context.`,
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
          label: 'moves',
        },
        notes: {
          usagePercent: 'Pokemon set slots with the move divided by total Pokemon set slots in this stats file scope.',
          detailMinimum: `Top Pokemon detail lists only include entries with at least ${minDetailUsagePercent}% usage within their modal detail context.`,
        },
      }),
      moves: [...accumulator.moves.values()]
        .map((move) => serializeUsageAggregate({ aggregate: move, totalRecords: totals.pokemonSets }))
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
          label: 'items',
        },
        notes: {
          usagePercent: 'Player records with the item divided by player records with public teams in this stats file scope.',
          detailMinimum: `Top Pokemon detail lists only include entries with at least ${minDetailUsagePercent}% usage within their modal detail context.`,
        },
      }),
      items: [...accumulator.items.values()]
        .map((item) => serializeUsageAggregate({ aggregate: item, totalRecords: totals.recordsWithTeams }))
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

async function writeSeparateMegaStats(stats) {
  await writeFile(path.join(pokemonSeparateMegasDir, statsFileName(stats.scope.id)), `${JSON.stringify(stats, null, 2)}\n`, 'utf8');
}

async function main() {
  const standingsIndex = await readJson(standingsIndexPath);
  const generatedAt = new Date().toISOString();
  const full = createAccumulator();
  const fullSeparateMegas = createAccumulator();
  const months = new Map();
  const monthsSeparateMegas = new Map();

  for (const tournamentId of standingsIndex.tournamentOrder ?? []) {
    const indexEntry = standingsIndex.byTournamentId[tournamentId];

    if (!indexEntry?.file) {
      continue;
    }

    const tournamentStandings = await readJson(path.join(dataDir, indexEntry.file));
    const month = tournamentStandings.tournament.date.slice(0, 7);

    addTournamentToAccumulator(full, tournamentStandings);
    addTournamentToAccumulator(fullSeparateMegas, tournamentStandings, { separateMegas: true });
    addTournamentToAccumulator(
      ensureMapEntry(months, month, () => createAccumulator()),
      tournamentStandings,
    );
    addTournamentToAccumulator(
      ensureMapEntry(monthsSeparateMegas, month, () => createAccumulator()),
      tournamentStandings,
      { separateMegas: true },
    );
  }

  await Promise.all([
    mkdir(statsDir, { recursive: true }),
    mkdir(pokemonSeparateMegasDir, { recursive: true }),
    ...Object.values(categoryDirs).map((dir) => mkdir(dir, { recursive: true })),
  ]);

  const monthEntries = [...months.entries()].sort(([a], [b]) => a.localeCompare(b));
  await Promise.all(
    ['full', ...monthEntries.map(([month]) => month)].map((scopeId) =>
      rm(path.join(pokemonSeparateMegasDir, statsFileName(scopeId)), { force: true }),
    ),
  );

  const fullStats = serializeCategoryStats({
    accumulator: full,
    generatedAt,
    scope: {
      id: 'full',
      label: 'full metagame',
      type: 'full',
    },
    standingsIndex,
  });

  await writeScopeStats(fullStats);
  const fullSeparateMegaStats = serializeCategoryStats({
    accumulator: fullSeparateMegas,
    generatedAt,
    scope: {
      id: 'full',
      label: 'full metagame',
      type: 'full',
    },
    standingsIndex,
    includeBaseAbilityNotes: true,
  });
  await writeSeparateMegaStats({
    ...fullSeparateMegaStats.pokemon,
    notes: {
      ...fullSeparateMegaStats.pokemon.notes,
      separateMegas: 'Pokemon holding a real mega stone are reported as their matching Mega species in this file.',
    },
  });
  await rm(legacyOutputPath, { force: true });

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
    const separatedMonthStats = serializeCategoryStats({
      accumulator: monthsSeparateMegas.get(month),
      generatedAt,
      scope: {
        id: month,
        label: month,
        type: 'month',
        month,
      },
      standingsIndex,
      includeBaseAbilityNotes: true,
    });
    await writeSeparateMegaStats({
      ...separatedMonthStats.pokemon,
      notes: {
        ...separatedMonthStats.pokemon.notes,
        separateMegas: 'Pokemon holding a real mega stone are reported as their matching Mega species in this file.',
      },
    });
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
        label: 'pokemon',
      },
      {
        id: 'items',
        label: 'items',
      },
      {
        id: 'moves',
        label: 'moves',
      },
    ],
    scopes: [
      {
        id: 'full',
        label: 'full metagame',
        type: 'full',
        files: {
          pokemon: `usage-stats/pokemon/${statsFileName('full')}`,
          pokemonSeparateMegas: `usage-stats/pokemon-separate-megas/${statsFileName('full')}`,
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
          pokemonSeparateMegas: `usage-stats/pokemon-separate-megas/${statsFileName(monthStats.pokemon.scope.id)}`,
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
