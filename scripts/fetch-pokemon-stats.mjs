import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeDataText } from './pokemon-normalization.mjs';

const outFile = path.resolve('public/data/pokemon-stats.json');
const auditFile = path.resolve('public/data/pokemon-stats-audit.json');
const overridesFile = path.resolve('scripts/pokemon-stats-overrides.json');
const usageFile = 'public/data/usage-stats/pokemon/full.json';
const usagePath = path.resolve(usageFile);
const strict = process.argv.includes('--strict') || process.env.STRICT_POKEMON_STATS === 'true';
const female = String.fromCodePoint(0x2640);
const male = String.fromCodePoint(0x2642);
const basePokeApiNameOverrides = new Map([
  ['aegislash', 'aegislash-shield'],
  ['aegislash blade forme', 'aegislash-blade'],
  ['basculegion', 'basculegion-male'],
  [`basculegion ${female}`, 'basculegion-female'],
  ['eternal flower floette', 'floette-eternal'],
  ['fan rotom', 'rotom-fan'],
  ['frost rotom', 'rotom-frost'],
  ['gourgeist', 'gourgeist-average'],
  ['heat rotom', 'rotom-heat'],
  ['maushold', 'maushold-family-of-four'],
  ['meowstic', 'meowstic-male'],
  [`meowstic ${female}`, 'meowstic-female'],
  ['mimikyu', 'mimikyu-disguised'],
  ['morpeko', 'morpeko-full-belly'],
  ['mow rotom', 'rotom-mow'],
  ['mr. rime', 'mr-rime'],
  ['palafin', 'palafin-zero'],
  ['paldean tauros', 'tauros-paldea-combat-breed'],
  ['paldean tauros aqua breed', 'tauros-paldea-aqua-breed'],
  ['paldean tauros blaze breed', 'tauros-paldea-blaze-breed'],
  ['pyroar', 'pyroar-male'],
  ['eiscue', 'eiscue-ice'],
  ['hearthflame mask ogerpon', 'ogerpon-hearthflame-mask'],
  ['wash rotom', 'rotom-wash'],
]);

const statNameMap = new Map([
  ['hp', 'hp'],
  ['attack', 'attack'],
  ['defense', 'defense'],
  ['special-attack', 'specialAttack'],
  ['special-defense', 'specialDefense'],
  ['speed', 'speed'],
]);

function parseJsonFile(contents) {
  return JSON.parse(contents.replace(/^\uFEFF/, ''));
}

async function readJson(pathname, fallback) {
  try {
    return parseJsonFile(await fs.readFile(pathname, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

function pokemonKey(name) {
  return normalizeDataText(name)
    ?.replaceAll(female, 'female')
    .replaceAll(male, 'male')
    .replace(/[.':]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function byPokemonName(records = []) {
  const lookup = new Map();

  for (const record of records) {
    const keys = [
      record.name,
      record.pokeApiName,
      record.id,
    ].map(pokemonKey).filter(Boolean);

    for (const key of keys) {
      if (!lookup.has(key)) {
        lookup.set(key, record);
      }
    }
  }

  return lookup;
}

function toPokeApiName(name, pokeApiNameOverrides) {
  const normalizedName = normalizeDataText(name);

  if (pokeApiNameOverrides.has(normalizedName)) {
    return pokeApiNameOverrides.get(normalizedName);
  }

  let match = normalizedName.match(/^alolan (.+)$/);
  if (match) return `${match[1].replaceAll(' ', '-')}-alola`;

  match = normalizedName.match(/^galarian (.+)$/);
  if (match) return `${match[1].replaceAll(' ', '-')}-galar`;

  match = normalizedName.match(/^hisuian (.+)$/);
  if (match) return `${match[1].replaceAll(' ', '-')}-hisui`;

  match = normalizedName.match(/^lycanroc (.+)$/);
  if (match) return `lycanroc-${match[1].replaceAll(' ', '-')}`;

  if (normalizedName === 'lycanroc') {
    return 'lycanroc-midday';
  }

  return normalizedName
    .replaceAll(female, 'female')
    .replaceAll(male, 'male')
    .replace(/[.':]/g, '')
    .replace(/\s+/g, '-');
}

function normalizeStatsRecord(record, requestedName) {
  if (!record) {
    return null;
  }

  const baseStats = record.baseStats ?? {};
  const normalized = {
    name: normalizeDataText(record.name ?? requestedName),
    ...(record.pokeApiId ? { pokeApiId: record.pokeApiId } : {}),
    ...(record.pokeApiName ? { pokeApiName: record.pokeApiName } : {}),
    typing: (record.typing ?? []).map(normalizeDataText).filter(Boolean),
    abilities: (record.abilities ?? []).map((ability, index) => (
      typeof ability === 'string'
        ? { name: normalizeDataText(ability), isHidden: false, slot: index + 1 }
        : {
            name: normalizeDataText(ability.name),
            isHidden: Boolean(ability.isHidden),
            slot: ability.slot ?? index + 1,
          }
    )).filter((ability) => ability.name),
    baseStats: {
      hp: baseStats.hp ?? 0,
      attack: baseStats.attack ?? baseStats.atk ?? 0,
      defense: baseStats.defense ?? baseStats.def ?? 0,
      specialAttack: baseStats.specialAttack ?? baseStats.spa ?? 0,
      specialDefense: baseStats.specialDefense ?? baseStats.spd ?? 0,
      speed: baseStats.speed ?? baseStats.spe ?? 0,
    },
  };

  return normalized;
}

function isNetworkFetchError(error) {
  return error?.message === 'fetch failed' ||
    ['ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'].includes(error?.cause?.code);
}

async function fetchPokemon(name, pokeApiNameOverrides) {
  const pokeApiName = toPokeApiName(name, pokeApiNameOverrides);
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokeApiName)}`);
  if (!res.ok) throw new Error(`Failed ${name} (${pokeApiName}): ${res.status}`);
  const json = await res.json();
  const typing = json.types
    .toSorted((a, b) => a.slot - b.slot)
    .map((type) => type.type.name);
  const abilities = json.abilities
    .toSorted((a, b) => a.slot - b.slot)
    .map((ability) => ({
      name: ability.ability.name,
      isHidden: ability.is_hidden,
      slot: ability.slot,
    }));
  const baseStats = Object.fromEntries(json.stats.map((stat) => [
    statNameMap.get(stat.stat.name) ?? stat.stat.name,
    stat.base_stat,
  ]));

  return {
    name,
    pokeApiId: json.id,
    pokeApiName: json.name,
    typing,
    abilities,
    baseStats,
  };
}

function buildPokeApiNameOverrides(overrides) {
  const pokeApiNameOverrides = new Map(basePokeApiNameOverrides);

  for (const [name, apiName] of Object.entries(overrides.pokeApiNameOverrides ?? {})) {
    const normalizedName = normalizeDataText(name);
    const normalizedApiName = normalizeDataText(apiName);

    if (normalizedName && normalizedApiName) {
      pokeApiNameOverrides.set(normalizedName, normalizedApiName);
    }
  }

  return pokeApiNameOverrides;
}

const fullUsage = await readJson(usagePath, { pokemon: [] });
const previousStats = await readJson(outFile, { pokemon: [] });
const overrides = await readJson(overridesFile, { pokemon: [] });
const previousStatsByName = byPokemonName(previousStats.pokemon);
const overrideStatsByName = byPokemonName(overrides.pokemon);
const pokeApiNameOverrides = buildPokeApiNameOverrides(overrides);
const names = [...new Set((fullUsage.pokemon ?? []).map((p) => normalizeDataText(p.name)).filter(Boolean))];
const nameOrder = new Map(names.map((name, index) => [name, index]));
const results = [];
const auditEntries = [];
let fetchedCount = 0;
let overrideCount = 0;
let reusedCount = 0;

for (const name of names) {
  const overrideRecord = overrideStatsByName.get(pokemonKey(name));

  if (overrideRecord) {
    results.push(normalizeStatsRecord(overrideRecord, name));
    overrideCount += 1;
    process.stdout.write(`Overrode ${name}\n`);
    continue;
  }

  try {
    results.push(await fetchPokemon(name, pokeApiNameOverrides));
    fetchedCount += 1;
    process.stdout.write(`Fetched ${name}\n`);
  } catch (error) {
    const previousRecord = previousStatsByName.get(pokemonKey(name));

    if (previousRecord) {
      results.push(normalizeStatsRecord(previousRecord, name));
      reusedCount += 1;

      if (!isNetworkFetchError(error)) {
        auditEntries.push({
          name,
          status: 'reused_previous',
          error: error.message,
          action: 'Add a pokeApiNameOverrides alias or a manual pokemon entry if this form changed.',
        });
      }

      process.stdout.write(`Reused previous stats for ${name}: ${error.message}\n`);
      continue;
    }

    auditEntries.push({
      name,
      status: 'missing',
      error: error.message,
      action: 'Add a scripts/pokemon-stats-overrides.json pokemon entry or pokeApiNameOverrides alias.',
    });
    process.stdout.write(`Missing stats for ${name}: ${error.message}\n`);
  }
}

results.sort((a, b) => (nameOrder.get(a.name) ?? Number.MAX_SAFE_INTEGER) - (nameOrder.get(b.name) ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name));

if (strict && auditEntries.length > 0) {
  throw new Error(`Pokemon stats audit has ${auditEntries.length} entr${auditEntries.length === 1 ? 'y' : 'ies'}:\n${auditEntries.map((entry) => `- ${entry.name}: ${entry.error}`).join('\n')}`);
}

const generatedAt = new Date().toISOString();
const networkOnlyReuse = fetchedCount === 0 && overrideCount === 0 && reusedCount === results.length && auditEntries.length === 0;

if (networkOnlyReuse) {
  console.log('All Pokemon stats lookups failed due to network fetch errors; kept existing pokemon-stats.json unchanged.');
} else {
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify({
    schemaVersion: 1,
    generatedAt,
    source: {
      usageFile,
      pokemonCount: names.length,
      fetchedCount,
      overrideCount,
      reusedCount,
      missingCount: auditEntries.filter((entry) => entry.status === 'missing').length,
      api: 'https://pokeapi.co/api/v2/pokemon',
      overridesFile: path.relative(path.resolve('.'), overridesFile).replace(/\\/g, '/'),
    },
    pokemon: results,
  }, null, 2));

  console.log(`Wrote ${results.length} pokemon to ${outFile}`);
}

if (auditEntries.length > 0) {
  await fs.writeFile(auditFile, JSON.stringify({
    schemaVersion: 1,
    generatedAt,
    source: {
      usageFile,
      pokemonCount: names.length,
    },
    summary: {
      fetched: fetchedCount,
      overrides: overrideCount,
      reusedPrevious: reusedCount,
      missing: auditEntries.filter((entry) => entry.status === 'missing').length,
    },
    entries: auditEntries,
  }, null, 2));
  console.log(`Wrote pokemon stats audit to ${auditFile}`);
  console.log(`Pokemon stats completed with ${auditEntries.length} audit entr${auditEntries.length === 1 ? 'y' : 'ies'}; rerun with --strict to fail on these.`);
} else {
  await fs.rm(auditFile, { force: true });
  console.log('Pokemon stats audit is clean.');
}
