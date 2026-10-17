import fs from 'node:fs/promises';
import path from 'node:path';
import { Generations, toID } from '@smogon/calc';

const metadataPath = path.resolve('src/data/champions-mega-metadata.json');
const sourceUrl = 'https://www.serebii.net/pokemonchampions/megaabilities.shtml';
const generation = Generations.get(9);

function parseJsonFile(contents) {
  return JSON.parse(contents.replace(/^\uFEFF/, ''));
}

function megaIdFromDisplayName(displayName) {
  const parts = displayName.replace(/^Mega\s+/i, '').trim().split(/\s+/);
  const suffix = /^[xyz]$/i.test(parts.at(-1)) ? parts.pop().toLowerCase() : null;
  const baseId = parts.join('-').toLowerCase();

  if (baseId === 'meowstic') {
    return 'meowstic-m-mega';
  }

  return `${baseId}-mega${suffix ? `-${suffix}` : ''}`;
}

function parseChampionsMegaAbilities(html) {
  const entryPattern = /<a href="\/pokedex-champions\/[^"]+\/">(Mega [^<]+)<\/a>[\s\S]*?<a href="\/abilitydex\/[^"]+\.shtml">([^<]+)<\/a>/g;

  return [...html.matchAll(entryPattern)].map(([, displayName, ability]) => ({
    id: megaIdFromDisplayName(displayName),
    ability: ability.trim(),
    source: 'serebii',
    sourcePage: sourceUrl,
  }));
}

function calcMegaSpecies() {
  const speciesById = new Map();

  for (const item of generation.items) {
    const megaName = Object.values(item.megaStone ?? {})[0];

    if (!megaName) {
      continue;
    }

    const species = generation.species.get(toID(megaName));
    const ability = Object.values(species?.abilities ?? {}).find(Boolean);

    if (!species || !ability) {
      throw new Error(`Unable to resolve Mega species data for ${megaName}.`);
    }

    speciesById.set(toID(species.name), {
      id: species.name.toLowerCase(),
      ability,
      source: '@smogon/calc',
    });
  }

  return speciesById;
}

const currentMetadata = parseJsonFile(await fs.readFile(metadataPath, 'utf8'));
const response = await fetch(sourceUrl);

if (!response.ok) {
  throw new Error(`Failed to fetch Champions Mega abilities: ${response.status} ${response.statusText}`);
}

const championsEntries = parseChampionsMegaAbilities(await response.text());

if (championsEntries.length < 30) {
  throw new Error(`Expected at least 30 Champions Mega abilities, but parsed ${championsEntries.length}.`);
}

const championsById = new Map(championsEntries.map((entry) => [toID(entry.id), entry]));
const currentById = new Map((currentMetadata.pokemon ?? []).map((entry) => [toID(entry.id), entry]));
const calcById = calcMegaSpecies();
const allowCalcBootstrap = (currentMetadata.schemaVersion ?? 0) < 2;
const unresolved = [];
const pokemon = [];

for (const [id, calcEntry] of calcById) {
  const championsEntry = championsById.get(id);
  const currentEntry = currentById.get(id);

  if (championsEntry) {
    pokemon.push(championsEntry);
    continue;
  }

  if (!currentEntry && !allowCalcBootstrap) {
    unresolved.push(calcEntry.id);
    continue;
  }

  pokemon.push({
    ...calcEntry,
    ...(currentEntry?.sourcePage ? { sourcePage: currentEntry.sourcePage } : {}),
  });
}

const unknownChampionsEntries = championsEntries.filter((entry) => !calcById.has(toID(entry.id)));

if (unknownChampionsEntries.length > 0) {
  throw new Error(`Champions Mega abilities do not match installed species data: ${unknownChampionsEntries.map((entry) => entry.id).join(', ')}`);
}

if (unresolved.length > 0) {
  throw new Error(
    `New Mega species need authoritative ability metadata before reports can be generated: ${unresolved.join(', ')}`,
  );
}

pokemon.sort((a, b) => a.id.localeCompare(b.id));

await fs.writeFile(metadataPath, `${JSON.stringify({
  schemaVersion: 2,
  sources: [
    sourceUrl,
    '@smogon/calc generation 9 data',
  ],
  pokemon,
}, null, 2)}\n`);

console.log(`Synced ${pokemon.length} Mega abilities (${championsEntries.length} Champions overrides).`);
