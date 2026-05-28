import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const statsDir = path.join(rootDir, 'src', 'data', 'usage-stats');
const tournamentsPath = path.join(rootDir, 'src', 'data', 'regulation-m-a-tournaments.json');
const outputPath = path.join(rootDir, 'src', 'data', 'missing-sprite-audit.json');
const pokemonManifestPath = path.join(rootDir, 'public', 'assets', 'pokemon-sprites', 'front-default', 'manifest.json');
const itemManifestPath = path.join(rootDir, 'public', 'assets', 'item-sprites', 'default', 'manifest.json');
const assetIndexPath = path.join(rootDir, 'src', 'data', 'asset-index.json');

const noItemLookups = new Set([
  '-',
  'blank',
  'empty',
  'n',
  'na',
  'no-held-item',
  'no-item',
  'no-object',
  'noitem',
  'none',
  'none-item',
  'not-item',
  'nothing',
  'null',
  'sem-item',
]);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function readUsageFiles(category) {
  const categoryDir = path.join(statsDir, category);
  const fileNames = await readdir(categoryDir);
  const jsonFileNames = fileNames.filter((fileName) => fileName.endsWith('.json')).sort();

  return Promise.all(jsonFileNames.map((fileName) => readJson(path.join(categoryDir, fileName))));
}

function itemKey(name) {
  return typeof name === 'string'
    ? name
        .trim()
        .toLowerCase()
        .replace(/[']/g, '')
        .replace(/[.:]/g, '')
        .replace(/\s+/g, '-')
    : '';
}

function addTopPokemon(usedPokemon, topPokemon) {
  for (const pokemon of topPokemon ?? []) {
    if (pokemon?.id) {
      usedPokemon.set(pokemon.id, pokemon.name ?? pokemon.id);
    }
  }
}

async function collectUsedNames() {
  const usedPokemon = new Map();
  const usedItems = new Set();
  const [pokemonStatsFiles, itemStatsFiles, moveStatsFiles, tournaments] = await Promise.all([
    readUsageFiles('pokemon'),
    readUsageFiles('items'),
    readUsageFiles('moves'),
    readJsonIfExists(tournamentsPath),
  ]);

  for (const stats of pokemonStatsFiles) {
    for (const pokemon of stats.pokemon ?? []) {
      if (pokemon.id) {
        usedPokemon.set(pokemon.id, pokemon.name ?? pokemon.id);
      }

      for (const set of pokemon.topSets ?? []) {
        if (set.item) {
          usedItems.add(set.item);
        }
      }

      for (const set of pokemon.topAbilityItems ?? []) {
        if (set.item) {
          usedItems.add(set.item);
        }
      }

      for (const item of pokemon.topItems ?? []) {
        if (item.item) {
          usedItems.add(item.item);
        }
      }
    }
  }

  for (const stats of itemStatsFiles) {
    for (const item of stats.items ?? []) {
      if (item.name) {
        usedItems.add(item.name);
      }

      addTopPokemon(usedPokemon, item.topPokemon);
    }
  }

  for (const stats of moveStatsFiles) {
    for (const move of stats.moves ?? []) {
      addTopPokemon(usedPokemon, move.topPokemon);
    }
  }

  for (const tournament of tournaments?.tournaments ?? []) {
    for (const pokemon of tournament.winner?.team ?? []) {
      if (pokemon.id) {
        usedPokemon.set(pokemon.id, pokemon.name ?? pokemon.id);
      }

      if (pokemon.item) {
        usedItems.add(pokemon.item);
      }
    }
  }

  return { usedPokemon, usedItems };
}

function buildPokemonManifestLookup(pokemonManifest) {
  const forms = Object.values(pokemonManifest.forms ?? {});

  return function findSprite(pokemonId) {
    const candidates = [pokemonId, pokemonId.replace(/-f$/, '-female'), pokemonId.replace(/-m$/, '-male')];

    for (const candidate of candidates) {
      if (pokemonManifest.forms?.[candidate]?.file) {
        return pokemonManifest.forms[candidate];
      }
    }

    return forms
      .filter((form) => form.pokemon === pokemonId || form.name.startsWith(`${pokemonId}-`))
      .sort((a, b) => a.id - b.id)[0];
  };
}

function buildItemManifestLookup(itemManifest) {
  const itemLookup = new Map();

  for (const item of Object.values(itemManifest.items ?? {})) {
    itemLookup.set(item.lookupName, item);
    itemLookup.set(item.name, item);
    itemLookup.set(itemKey(item.requestedName), item);
  }

  return itemLookup;
}

function buildSkippedItemLookup(itemManifest) {
  const skippedLookup = new Map();

  for (const skipped of itemManifest.skipped ?? []) {
    skippedLookup.set(skipped.lookupName, skipped);
  }

  return skippedLookup;
}

async function hasShowdownItemIcon(lookupName) {
  const source = `https://play.pokemonshowdown.com/sprites/itemicons/${lookupName}.png`;

  try {
    const response = await fetch(source, { method: 'HEAD' });
    return response.ok ? source : null;
  } catch {
    return null;
  }
}

async function describeMissingItem(lookupName, names, skippedItem) {
  if (noItemLookups.has(lookupName)) {
    return {
      lookupName,
      names,
      sourceStatus: 'not-needed',
      recommendation: 'Normalize this value to no item and suppress sprite lookup.',
    };
  }

  const showdownSource = await hasShowdownItemIcon(lookupName);

  if (showdownSource) {
    return {
      lookupName,
      names,
      sourceStatus: 'pokemon-showdown',
      source: showdownSource,
      recommendation: 'Download this icon or add it to the item sprite sync source list.',
    };
  }

  const likelyCustomItem = /(?:ite|inite|nite)$/.test(lookupName);
  const sourceStatus = likelyCustomItem ? 'custom-item-art-needed' : 'data-correction-needed';

  return {
    lookupName,
    names,
    sourceStatus,
    checkedSources: [
      `https://pokeapi.co/api/v2/item/${lookupName}`,
      `https://play.pokemonshowdown.com/sprites/itemicons/${lookupName}.png`,
    ],
    pokeApiReason: skippedItem?.reason ?? 'not requested by item sprite sync',
    recommendation: likelyCustomItem
      ? 'PokeAPI and Pokemon Showdown do not provide this custom item icon; add a manual custom icon or map it to a placeholder.'
      : 'This looks like a typo, localized name, note, or unsupported alias; add a data correction to the canonical English item name.',
  };
}

async function main() {
  const [used, pokemonManifest, itemManifest, assetIndex] = await Promise.all([
    collectUsedNames(),
    readJson(pokemonManifestPath),
    readJson(itemManifestPath),
    readJson(assetIndexPath),
  ]);
  const findPokemonSprite = buildPokemonManifestLookup(pokemonManifest);
  const itemLookup = buildItemManifestLookup(itemManifest);
  const skippedItemLookup = buildSkippedItemLookup(itemManifest);

  const missingPokemon = [...used.usedPokemon.entries()]
    .filter(([id]) => !findPokemonSprite(id)?.file)
    .map(([id, name]) => ({
      id,
      name,
      checkedSources: [`https://pokeapi.co/api/v2/pokemon-form/${id}`],
      recommendation: 'Check PokeAPI pokemon-form first; if absent, add a custom Pokemon form sprite manually.',
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const missingItemNamesByLookup = new Map();

  for (const itemName of used.usedItems) {
    const lookupName = itemKey(itemName);

    if (itemLookup.get(lookupName)?.file) {
      continue;
    }

    if (!missingItemNamesByLookup.has(lookupName)) {
      missingItemNamesByLookup.set(lookupName, new Set());
    }

    missingItemNamesByLookup.get(lookupName).add(itemName);
  }

  const missingItems = [];

  for (const [lookupName, names] of [...missingItemNamesByLookup.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    missingItems.push(await describeMissingItem(lookupName, [...names].sort((a, b) => a.localeCompare(b)), skippedItemLookup.get(lookupName)));
  }

  const byItemSourceStatus = missingItems.reduce((counts, item) => {
    counts[item.sourceStatus] = (counts[item.sourceStatus] ?? 0) + 1;
    return counts;
  }, {});

  const audit = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      usedPokemon: used.usedPokemon.size,
      usedItems: used.usedItems.size,
      indexedPokemonSprites: Object.keys(assetIndex.pokemon ?? {}).length,
      indexedItemSprites: Object.keys(assetIndex.items ?? {}).length,
      missingPokemonSprites: missingPokemon.length,
      missingItemSpriteLookups: missingItems.length,
      missingItemRawNames: missingItems.reduce((total, item) => total + item.names.length, 0),
      byItemSourceStatus,
    },
    missingPokemon,
    missingItems,
  };

  await writeFile(outputPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  console.log(`Wrote missing sprite audit to ${path.relative(rootDir, outputPath)}.`);
  console.log(`Missing Pokemon sprites: ${missingPokemon.length}`);
  console.log(`Missing item sprite lookups: ${missingItems.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
