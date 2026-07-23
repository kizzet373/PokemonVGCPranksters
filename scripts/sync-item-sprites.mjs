import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const statsDir = path.join(rootDir, 'public', 'data', 'usage-stats');
const tournamentsPath = path.join(rootDir, 'public', 'data', 'regulation-m-a-tournaments.json');
const outputDir = path.join(rootDir, 'public', 'assets', 'item-sprites', 'default');
const manifestPath = path.join(outputDir, 'manifest.json');
const endpoint = 'https://pokeapi.co/api/v2/item';

const itemNames = [
  'black-belt',
  'black-glasses',
  'bright-powder',
  'charcoal',
  'choice-scarf',
  'dragon-fang',
  'fairy-feather',
  'focus-band',
  'focus-sash',
  'hard-stone',
  "king's-rock",
  'leftovers',
  'light-ball',
  'magnet',
  'mental-herb',
  'metal-coat',
  'miracle-seed',
  'mystic-water',
  'never-melt-ice',
  'poison-barb',
  'quick-claw',
  'scope-lens',
  'sharp-beak',
  'shell-bell',
  'silk-scarf',
  'silver-powder',
  'soft-sand',
  'spell-tag',
  'twisted-spoon',
  'white-herb',
  'abomasite',
  'absolite',
  'aerodactylite',
  'aggronite',
  'alakazite',
  'altarianite',
  'ampharosite',
  'audinite',
  'banettite',
  'beedrillite',
  'blastoisinite',
  'cameruptite',
  'chandelurite',
  'charizardite-x',
  'charizardite-y',
  'chesnaughtite',
  'chimechite',
  'clefablite',
  'crabominite',
  'delphoxite',
  'dragoninite',
  'drampanite',
  'emboarite',
  'excadrite',
  'feraligite',
  'floettite',
  'froslassite',
  'galladite',
  'garchompite',
  'gardevoirite',
  'gengarite',
  'glalitite',
  'glimmoranite',
  'golurkite',
  'greninjite',
  'gyaradosite',
  'hawluchanite',
  'heracronite',
  'houndoominite',
  'kangaskhanite',
  'lopunnite',
  'lucarionite',
  'manectite',
  'medichamite',
  'meganiumite',
  'meowsticite',
  'pidgeotite',
  'pinsirite',
  'sablenite',
  'scizorite',
  'scovillainite',
  'sharpedonite',
  'skarmorite',
  'slowbronite',
  'starminite',
  'steelixite',
  'tyranitarite',
  'venusaurite',
  'victreebelite',
  'aspear-berry',
  'babiri-berry',
  'charti-berry',
  'cheri-berry',
  'chesto-berry',
  'chilan-berry',
  'chople-berry',
  'coba-berry',
  'colbur-berry',
  'haban-berry',
  'kasib-berry',
  'kebia-berry',
  'leppa-berry',
  'lum-berry',
  'occa-berry',
  'oran-berry',
  'passho-berry',
  'payapa-berry',
  'pecha-berry',
  'persim-berry',
  'rawst-berry',
  'rindo-berry',
  'roseli-berry',
  'shuca-berry',
  'sitrus-berry',
  'tanga-berry',
  'wacan-berry',
  'yache-berry',
];

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

async function downloadFile(url, pathname) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(pathname, bytes);
}

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

async function collectUsedItemNames() {
  const used = new Set();
  const [pokemonStatsFiles, itemStatsFiles, tournaments] = await Promise.all([
    readUsageFiles('pokemon'),
    readUsageFiles('items'),
    readJsonIfExists(tournamentsPath),
  ]);

  for (const stats of pokemonStatsFiles) {
    for (const pokemon of stats.pokemon ?? []) {
      for (const set of pokemon.topSets ?? []) {
        if (set.item) {
          used.add(set.item);
        }
      }

      for (const set of pokemon.topAbilityItems ?? []) {
        if (set.item) {
          used.add(set.item);
        }
      }

      for (const item of pokemon.topItems ?? []) {
        if (item.item) {
          used.add(item.item);
        }
      }
    }
  }

  for (const stats of itemStatsFiles) {
    for (const item of stats.items ?? []) {
      if (item.name) {
        used.add(item.name);
      }
    }
  }

  for (const tournament of tournaments?.tournaments ?? []) {
    for (const pokemon of tournament.winner?.team ?? []) {
      if (pokemon.item) {
        used.add(pokemon.item);
      }
    }
  }

  return used;
}

function lookupNameForItem(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[']/g, '')
    .replace(/[.:]/g, '')
    .replace(/\s+/g, '-');
}

async function main() {
  const usedItemNames = await collectUsedItemNames();
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const requestedNamesByLookupName = new Map();

  for (const requestedName of [...itemNames, ...usedItemNames]) {
    const cleanName = requestedName.trim();

    if (!cleanName) {
      continue;
    }

    const lookupName = lookupNameForItem(cleanName);

    if (!requestedNamesByLookupName.has(lookupName)) {
      requestedNamesByLookupName.set(lookupName, new Set());
    }

    requestedNamesByLookupName.get(lookupName).add(cleanName);
  }

  const manifest = {
    schemaVersion: 1,
    source: `${endpoint}/{name}`,
    sprite: 'sprites.default',
    requested: [...requestedNamesByLookupName.values()].reduce((total, names) => total + names.size, 0),
    requestedLookups: requestedNamesByLookupName.size,
    downloaded: 0,
    skipped: [],
    items: {},
  };

  for (const [lookupName, requestedNames] of [...requestedNamesByLookupName.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const item = await fetchJson(`${endpoint}/${lookupName}`);
    const requestedNameList = [...requestedNames].sort((a, b) => a.localeCompare(b));

    if (!item) {
      manifest.skipped.push({
        requestedNames: requestedNameList,
        lookupName,
        reason: 'item not found',
      });
      continue;
    }

    const spriteUrl = item.sprites?.default;

    if (!spriteUrl) {
      manifest.skipped.push({
        requestedNames: requestedNameList,
        lookupName,
        reason: 'missing sprites.default',
      });
      continue;
    }

    const fileName = `${lookupName}.png`;
    await downloadFile(spriteUrl, path.join(outputDir, fileName));

    for (const requestedName of requestedNames) {
      manifest.items[requestedName] = {
        id: item.id,
        name: item.name,
        requestedName,
        lookupName,
        file: `assets/item-sprites/default/${fileName}`,
        source: spriteUrl,
      };
    }

    manifest.downloaded += 1;
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Synced ${manifest.downloaded} item sprites to ${path.relative(rootDir, outputDir)}.`);

  if (manifest.skipped.length > 0) {
    console.log(`Skipped ${manifest.skipped.length} requested items.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
