import fs from 'node:fs/promises';
import path from 'node:path';
import fullUsage from '../src/data/usage-stats/pokemon/full.json' with { type: 'json' };

const outFile = path.resolve('src/data/pokemon-stats.json');
const usageFile = 'src/data/usage-stats/pokemon/full.json';
const female = String.fromCodePoint(0x2640);
const male = String.fromCodePoint(0x2642);
const pokeApiNameOverrides = new Map([
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

function toPokeApiName(name) {
  if (pokeApiNameOverrides.has(name)) {
    return pokeApiNameOverrides.get(name);
  }

  let match = name.match(/^alolan (.+)$/);
  if (match) return `${match[1].replaceAll(' ', '-')}-alola`;

  match = name.match(/^galarian (.+)$/);
  if (match) return `${match[1].replaceAll(' ', '-')}-galar`;

  match = name.match(/^hisuian (.+)$/);
  if (match) return `${match[1].replaceAll(' ', '-')}-hisui`;

  match = name.match(/^lycanroc (.+)$/);
  if (match) return `lycanroc-${match[1].replaceAll(' ', '-')}`;

  if (name === 'lycanroc') {
    return 'lycanroc-midday';
  }

  return name
    .replaceAll(female, 'female')
    .replaceAll(male, 'male')
    .replace(/[.':]/g, '')
    .replace(/\s+/g, '-');
}

async function fetchPokemon(name) {
  const pokeApiName = toPokeApiName(name);
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

const names = [...new Set(fullUsage.pokemon.map((p) => p.name))];
const results = [];
const failures = [];
for (const name of names) {
  try {
    results.push(await fetchPokemon(name));
    process.stdout.write(`Fetched ${name}\n`);
  } catch (error) {
    failures.push({ name, error: error.message });
    process.stdout.write(`Failed ${name}: ${error.message}\n`);
  }
}

if (failures.length > 0) {
  throw new Error(`Failed to fetch ${failures.length} pokemon:\n${failures.map((failure) => `- ${failure.error}`).join('\n')}`);
}

await fs.mkdir(path.dirname(outFile), { recursive: true });
await fs.writeFile(outFile, JSON.stringify({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    usageFile,
    pokemonCount: names.length,
    api: 'https://pokeapi.co/api/v2/pokemon',
  },
  pokemon: results,
}, null, 2));
console.log(`Wrote ${results.length} pokemon to ${outFile}`);
