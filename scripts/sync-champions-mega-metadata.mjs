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
    for (const [baseName, megaName] of Object.entries(item.megaStone ?? {})) {
      const species = generation.species.get(toID(megaName));
      const ability = Object.values(species?.abilities ?? {}).find(Boolean);

      if (!species || !ability) {
        console.warn(`Skipped unresolved calculator Mega mapping ${baseName} -> ${megaName}.`);
        continue;
      }

      speciesById.set(toID(species.name), {
        id: species.name.toLowerCase(),
        baseId: toID(baseName),
        baseSpeciesId: toID(species.baseSpecies ?? baseName),
        record: {
          id: species.name.toLowerCase(),
          ability,
          source: '@smogon/calc',
        },
      });
    }
  }

  return speciesById;
}

function championsTargets(entry, calcById) {
  const exactEntry = calcById.get(toID(entry.id));

  if (exactEntry) {
    return [exactEntry];
  }

  const baseId = toID(entry.id.replace(/-mega(?:-[xyz])?$/i, ''));

  return [...calcById.values()].filter((candidate) => (
    candidate.baseSpeciesId === baseId || candidate.baseId === baseId
  ));
}

async function fetchChampionsEntries() {
  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw new Error(`source returned ${response.status} ${response.statusText}`);
  }

  const entries = parseChampionsMegaAbilities(await response.text());

  if (entries.length < 30) {
    throw new Error(`expected at least 30 entries, but parsed ${entries.length}`);
  }

  return entries;
}

const currentMetadata = parseJsonFile(await fs.readFile(metadataPath, 'utf8'));
let championsEntries;

try {
  championsEntries = await fetchChampionsEntries();
} catch (error) {
  console.warn(`Mega metadata source unavailable; retained last-known-good metadata (${error.message}).`);
  process.exit(0);
}

const currentById = new Map((currentMetadata.pokemon ?? []).map((entry) => [toID(entry.id), entry]));
const calcById = calcMegaSpecies();
const championsByCalcId = new Map();
const pendingCalculatorSupport = [];

for (const entry of championsEntries) {
  const targets = championsTargets(entry, calcById);

  if (targets.length === 0) {
    pendingCalculatorSupport.push(entry);
    continue;
  }

  for (const target of targets) {
    championsByCalcId.set(toID(target.record.id), {
      ...entry,
      id: target.record.id,
      ...(toID(entry.id) !== toID(target.record.id) ? { sourceEntryId: entry.id } : {}),
    });
  }
}

const pendingAuthoritativeSource = [];
const pokemon = [];

for (const [id, calcEntry] of calcById) {
  const championsEntry = championsByCalcId.get(id);

  if (championsEntry) {
    pokemon.push(championsEntry);
    continue;
  }

  const currentEntry = currentById.get(id);

  if (currentEntry) {
    if (currentEntry.source === 'serebii') {
      pokemon.push(currentEntry);
      continue;
    }

    pokemon.push({
      ...calcEntry.record,
      ...(currentEntry.sourcePage ? { sourcePage: currentEntry.sourcePage } : {}),
      ...(currentEntry.verificationStatus ? { verificationStatus: currentEntry.verificationStatus } : {}),
    });
    continue;
  }

  const pendingEntry = {
    ...calcEntry.record,
    verificationStatus: 'pending-authoritative-source',
  };

  pendingAuthoritativeSource.push(pendingEntry);
  pokemon.push(pendingEntry);
}

for (const entry of pendingCalculatorSupport) {
  pokemon.push({
    ...entry,
    verificationStatus: 'pending-calculator-support',
  });
}

pokemon.sort((a, b) => a.id.localeCompare(b.id));
const pendingCalculatorSupportIds = pokemon
  .filter((entry) => entry.verificationStatus === 'pending-calculator-support')
  .map((entry) => entry.id);
const pendingAuthoritativeSourceIds = pokemon
  .filter((entry) => entry.verificationStatus === 'pending-authoritative-source')
  .map((entry) => entry.id);

await fs.writeFile(metadataPath, `${JSON.stringify({
  schemaVersion: 3,
  sources: [
    sourceUrl,
    '@smogon/calc generation 9 data',
  ],
  audit: {
    pendingCalculatorSupport: pendingCalculatorSupportIds,
    pendingAuthoritativeSource: pendingAuthoritativeSourceIds,
  },
  pokemon,
}, null, 2)}\n`);

console.log(`Synced ${pokemon.length} Mega abilities (${championsEntries.length} Champions source entries).`);

if (pendingCalculatorSupportIds.length > 0) {
  console.warn(`Retained ${pendingCalculatorSupportIds.length} Mega metadata entr${pendingCalculatorSupportIds.length === 1 ? 'y' : 'ies'} pending calculator support.`);
}

if (pendingAuthoritativeSourceIds.length > 0) {
  console.warn(`Quarantined ${pendingAuthoritativeSourceIds.length} calculator Mega entr${pendingAuthoritativeSourceIds.length === 1 ? 'y' : 'ies'} pending an authoritative ability source.`);
}
