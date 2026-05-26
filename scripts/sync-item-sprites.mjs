import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
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

function lookupNameForItem(name) {
  return name.toLowerCase().replace(/[']/g, '');
}

async function main() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const uniqueItemNames = [...new Set(itemNames.map((name) => name.trim()).filter(Boolean))];
  const manifest = {
    schemaVersion: 1,
    source: `${endpoint}/{name}`,
    sprite: 'sprites.default',
    requested: uniqueItemNames.length,
    downloaded: 0,
    skipped: [],
    items: {},
  };

  for (const requestedName of uniqueItemNames) {
    const lookupName = lookupNameForItem(requestedName);
    const item = await fetchJson(`${endpoint}/${lookupName}`);

    if (!item) {
      manifest.skipped.push({
        requestedName,
        lookupName,
        reason: 'item not found',
      });
      continue;
    }

    const spriteUrl = item.sprites?.default;

    if (!spriteUrl) {
      manifest.skipped.push({
        requestedName,
        lookupName,
        reason: 'missing sprites.default',
      });
      continue;
    }

    const fileName = `${lookupName}.png`;
    await downloadFile(spriteUrl, path.join(outputDir, fileName));

    manifest.items[requestedName] = {
      id: item.id,
      name: item.name,
      requestedName,
      lookupName,
      file: `assets/item-sprites/default/${fileName}`,
      source: spriteUrl,
    };
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
