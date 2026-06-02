import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const statsDir = path.join(rootDir, 'src', 'data', 'usage-stats');
const tournamentsPath = path.join(rootDir, 'src', 'data', 'regulation-m-a-tournaments.json');
const outputPath = path.join(rootDir, 'src', 'data', 'asset-index.json');
const pokemonManifestPath = path.join(rootDir, 'public', 'assets', 'pokemon-sprites', 'front-default', 'manifest.json');
const itemManifestPath = path.join(rootDir, 'public', 'assets', 'item-sprites', 'default', 'manifest.json');
const typeManifestPath = path.join(rootDir, 'public', 'assets', 'type-icons', 'sword-shield', 'manifest.json');

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

async function fetchJson(url) {
  const response = await fetch(url);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function toAssetPath(file) {
  return file ? `/${file}` : null;
}

function itemKey(name) {
  return typeof name === 'string' ? name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[']/g, '') : '';
}

function moveLookupName(name) {
  return typeof name === 'string'
    ? name
        .trim()
        .toLowerCase()
        .replace(/[']/g, '')
        .replace(/[.:]/g, '')
        .replace(/\s+/g, '-')
    : '';
}

function addTopPokemon(set, topPokemon) {
  for (const pokemon of topPokemon ?? []) {
    if (pokemon?.id) {
      set.add(pokemon.id);
    }
  }
}

async function readUsageFiles(category) {
  const categoryDir = path.join(statsDir, category);
  const fileNames = await readdir(categoryDir);
  const jsonFileNames = fileNames.filter((fileName) => fileName.endsWith('.json')).sort();

  return Promise.all(jsonFileNames.map((fileName) => readJson(path.join(categoryDir, fileName))));
}

async function readUsageFilesIfExists(category) {
  try {
    return await readUsageFiles(category);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function collectUsedNames() {
  const used = {
    pokemon: new Set(),
    items: new Set(),
    moves: new Set(),
  };

  const [pokemonStatsFiles, separateMegaPokemonStatsFiles, itemStatsFiles, moveStatsFiles] = await Promise.all([
    readUsageFiles('pokemon'),
    readUsageFilesIfExists('pokemon-separate-megas'),
    readUsageFiles('items'),
    readUsageFiles('moves'),
  ]);
  const tournaments = await readJsonIfExists(tournamentsPath);

  for (const stats of [...pokemonStatsFiles, ...separateMegaPokemonStatsFiles]) {
    for (const pokemon of stats.pokemon ?? []) {
      if (pokemon.id) {
        used.pokemon.add(pokemon.id);
      }

      for (const set of pokemon.topSets ?? []) {
        if (set.item) {
          used.items.add(set.item);
        }

        for (const attack of set.attacks ?? []) {
          used.moves.add(attack);
        }
      }

      for (const set of pokemon.topAbilityItems ?? []) {
        if (set.item) {
          used.items.add(set.item);
        }
      }

      for (const item of pokemon.topItems ?? []) {
        if (item.item) {
          used.items.add(item.item);
        }
      }
    }
  }

  for (const stats of itemStatsFiles) {
    for (const item of stats.items ?? []) {
      if (item.name) {
        used.items.add(item.name);
      }

      addTopPokemon(used.pokemon, item.topPokemon);
    }
  }

  for (const stats of moveStatsFiles) {
    for (const move of stats.moves ?? []) {
      if (move.name) {
        used.moves.add(move.name);
      }

      addTopPokemon(used.pokemon, move.topPokemon);
    }
  }

  for (const tournament of tournaments?.tournaments ?? []) {
    for (const pokemon of tournament.winner?.team ?? []) {
      if (pokemon.id) {
        used.pokemon.add(pokemon.id);
      }

      if (pokemon.item) {
        used.items.add(pokemon.item);
      }
    }
  }

  return used;
}

function buildPokemonIndex(usedPokemon, pokemonManifest) {
  const pokemon = {};
  const missing = [];
  const forms = Object.values(pokemonManifest.forms ?? {});

  function findSprite(pokemonId) {
    const candidates = [
      pokemonId,
      pokemonId.replace(/-mega-z$/, '-mega'),
      pokemonId.replace(/-f$/, '-female'),
      pokemonId.replace(/-m$/, '-male'),
      pokemonId.replace(/-m-mega$/, '-male-mega'),
    ];

    for (const candidate of candidates) {
      if (pokemonManifest.forms?.[candidate]?.file) {
        return pokemonManifest.forms[candidate];
      }
    }

    return forms
      .filter((form) => form.pokemon === pokemonId || form.name.startsWith(`${pokemonId}-`))
      .sort((a, b) => a.id - b.id)[0];
  }

  for (const pokemonId of [...usedPokemon].sort()) {
    const sprite = findSprite(pokemonId);

    if (sprite?.file) {
      pokemon[pokemonId] = toAssetPath(sprite.file);
    } else {
      missing.push(pokemonId);
    }
  }

  return { pokemon, missing };
}

function buildItemIndex(usedItems, itemManifest) {
  const items = {};
  const manifestItemsByLookupName = new Map();
  const missing = [];

  for (const item of Object.values(itemManifest.items ?? {})) {
    manifestItemsByLookupName.set(item.lookupName, item);
    manifestItemsByLookupName.set(item.name, item);
    manifestItemsByLookupName.set(itemKey(item.requestedName), item);
  }

  for (const itemName of [...usedItems].sort()) {
    const sprite = manifestItemsByLookupName.get(itemKey(itemName));

    if (sprite?.file) {
      items[itemName] = toAssetPath(sprite.file);
    } else {
      missing.push(itemName);
    }
  }

  return { items, missing };
}

async function buildMoveIndex(usedMoves, typeManifest, previousAssetIndex) {
  const moves = {};
  const missing = [];
  const typeIcons = typeManifest.types ?? {};

  for (const moveName of [...usedMoves].sort()) {
    const lookupName = moveLookupName(moveName);
    const cachedMove = previousAssetIndex?.moves?.[moveName];

    if (cachedMove?.type && typeIcons[cachedMove.type]?.file) {
      moves[moveName] = {
        type: cachedMove.type,
        icon: toAssetPath(typeIcons[cachedMove.type].file),
      };
      continue;
    }

    const move = await fetchJson(`https://pokeapi.co/api/v2/move/${lookupName}`);
    const typeName = move?.type?.name;
    const typeIcon = typeName ? typeIcons[typeName] : null;

    if (typeIcon?.file) {
      moves[moveName] = {
        type: typeName,
        icon: toAssetPath(typeIcon.file),
      };
    } else {
      missing.push({
        name: moveName,
        lookupName,
        reason: move ? `missing ${typeName ?? 'unknown'} type icon` : 'move not found',
      });
    }
  }

  return { moves, missing };
}

async function main() {
  const [used, pokemonManifest, itemManifest, typeManifest, previousAssetIndex] = await Promise.all([
    collectUsedNames(),
    readJson(pokemonManifestPath),
    readJson(itemManifestPath),
    readJson(typeManifestPath),
    readJsonIfExists(outputPath),
  ]);

  const pokemonIndex = buildPokemonIndex(used.pokemon, pokemonManifest);
  const itemIndex = buildItemIndex(used.items, itemManifest);
  const moveIndex = await buildMoveIndex(used.moves, typeManifest, previousAssetIndex);

  const assetIndex = {
    schemaVersion: 1,
    pokemon: pokemonIndex.pokemon,
    items: itemIndex.items,
    moves: moveIndex.moves,
    missing: {
      pokemon: pokemonIndex.missing.length,
      items: itemIndex.missing.length,
      moves: moveIndex.missing.length,
    },
  };

  await writeFile(outputPath, `${JSON.stringify(assetIndex, null, 2)}\n`, 'utf8');
  console.log(`Indexed ${Object.keys(assetIndex.pokemon).length} used Pokemon sprites.`);
  console.log(`Indexed ${Object.keys(assetIndex.items).length} used item sprites.`);
  console.log(`Indexed ${Object.keys(assetIndex.moves).length} used move type icons.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
