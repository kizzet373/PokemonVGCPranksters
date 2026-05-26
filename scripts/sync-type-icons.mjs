import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'public', 'assets', 'type-icons', 'sword-shield');
const manifestPath = path.join(outputDir, 'manifest.json');
const typeIds = Array.from({ length: 18 }, (_, index) => index + 1);

async function fetchJson(url) {
  const response = await fetch(url);

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

async function main() {
  await mkdir(outputDir, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    source: 'https://pokeapi.co/api/v2/type/{id}/',
    game: 'sword-shield',
    sprite: 'sprites.generation-viii.sword-shield.symbol_icon',
    types: {},
  };

  for (const id of typeIds) {
    const type = await fetchJson(`https://pokeapi.co/api/v2/type/${id}/`);
    const iconUrl = type.sprites?.['generation-viii']?.['sword-shield']?.symbol_icon;

    if (!iconUrl) {
      throw new Error(`Missing Sword/Shield symbol icon for type ${id} (${type.name})`);
    }

    const fileName = `${type.name}.png`;
    await downloadFile(iconUrl, path.join(outputDir, fileName));

    manifest.types[type.name] = {
      id,
      name: type.name,
      file: `assets/type-icons/sword-shield/${fileName}`,
      source: iconUrl,
    };
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Synced ${typeIds.length} Sword/Shield type icons to ${path.relative(rootDir, outputDir)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
