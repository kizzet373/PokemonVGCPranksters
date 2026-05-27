import fs from 'node:fs/promises';
import path from 'node:path';
import monthUsage from '../src/data/usage-stats/pokemon/2026-05.json' with { type: 'json' };

const outFile = path.resolve('src/data/pokemon-stats.json');

async function fetchPokemon(name) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`Failed ${name}: ${res.status}`);
  const json = await res.json();
  return {
    name,
    typing: json.types.map((t) => t.type.name),
    abilities: json.abilities.map((a) => a.ability.name),
    baseStats: Object.fromEntries(json.stats.map((s) => [s.stat.name, s.base_stat])),
  };
}

const names = [...new Set(monthUsage.pokemon.map((p) => p.name))];
const results = [];
for (const name of names) {
  try {
    results.push(await fetchPokemon(name));
    process.stdout.write(`Fetched ${name}\n`);
  } catch (error) {
    process.stdout.write(`Skip ${name}: ${error.message}\n`);
  }
}
await fs.writeFile(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), pokemon: results }, null, 2));
console.log(`Wrote ${results.length} pokemon to ${outFile}`);
