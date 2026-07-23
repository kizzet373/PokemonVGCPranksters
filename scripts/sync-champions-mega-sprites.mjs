import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const separateMegasDir = path.join(rootDir, 'public', 'data', 'usage-stats', 'pokemon-separate-megas');
const outputDir = path.join(rootDir, 'public', 'assets', 'pokemon-sprites', 'front-default');
const manifestPath = path.join(outputDir, 'manifest.json');
const sourceBaseUrl = 'https://pokebase.app/pokemon-champions/pokemon';

const officialSpriteAliases = new Map([
  ['absol-mega-z', 'absol-mega'],
  ['garchomp-mega-z', 'garchomp-mega'],
]);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function fetchText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function downloadFile(url, pathname) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(pathname, bytes);
}

function decodeHtml(value) {
  return value.replace(/&amp;/g, '&');
}

function spriteFileName(pokemonId) {
  return `champions-${pokemonId}.png`;
}

function isSeparatedMega(pokemon) {
  return typeof pokemon?.id === 'string' && pokemon.id.includes('-mega');
}

async function collectSeparatedMegaIds() {
  const ids = new Set();
  const fileNames = (await readdir(separateMegasDir)).filter((fileName) => fileName.endsWith('.json'));

  for (const fileName of fileNames) {
    const stats = await readJson(path.join(separateMegasDir, fileName));

    for (const pokemon of stats.pokemon ?? []) {
      if (isSeparatedMega(pokemon)) {
        ids.add(pokemon.id);
      }
    }
  }

  return [...ids].sort();
}

function findChampionsSpriteUrl(html) {
  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];

  for (const tag of imageTags) {
    if (!tag.includes('pokemon-champions/')) {
      continue;
    }

    const source = tag.match(/\bsrc="([^"]+)"/i)?.[1];

    if (source) {
      return decodeHtml(source);
    }
  }

  return null;
}

async function main() {
  const manifest = await readJson(manifestPath);
  const separatedMegaIds = await collectSeparatedMegaIds();
  const downloaded = [];
  const skipped = [];

  manifest.championsSource = sourceBaseUrl;

  for (const pokemonId of separatedMegaIds) {
    const officialAlias = officialSpriteAliases.get(pokemonId);

    if (manifest.forms?.[pokemonId]?.file || (officialAlias && manifest.forms?.[officialAlias]?.file)) {
      continue;
    }

    const sourcePage = `${sourceBaseUrl}/${pokemonId}`;

    try {
      const html = await fetchText(sourcePage);
      const spriteUrl = findChampionsSpriteUrl(html);

      if (!spriteUrl) {
        skipped.push({ name: pokemonId, sourcePage, reason: 'missing Champions sprite image' });
        continue;
      }

      const fileName = spriteFileName(pokemonId);
      await downloadFile(spriteUrl, path.join(outputDir, fileName));

      manifest.forms[pokemonId] = {
        id: pokemonId,
        name: pokemonId,
        formName: 'mega',
        pokemon: pokemonId,
        file: `assets/pokemon-sprites/front-default/${fileName}`,
        source: spriteUrl,
        sourcePage,
      };
      downloaded.push(pokemonId);
    } catch (error) {
      skipped.push({ name: pokemonId, sourcePage, reason: error.message });
    }
  }

  manifest.downloaded = Object.keys(manifest.forms ?? {}).length;
  manifest.championsSkipped = skipped;

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`Downloaded ${downloaded.length} Champions mega sprites.`);

  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length} Champions mega sprites.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
