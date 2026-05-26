import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'public', 'assets', 'pokemon-sprites', 'front-default');
const manifestPath = path.join(outputDir, 'manifest.json');
const endpoint = 'https://pokeapi.co/api/v2/pokemon-form';

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

function fileNameForForm(form) {
  return `${String(form.id).padStart(4, '0')}-${form.name}.png`;
}

async function main() {
  const { count, results } = await fetchJson(`${endpoint}?limit=2000`);
  const forms = results
    .map((result) => ({
      ...result,
      id: Number(result.url.match(/\/pokemon-form\/(\d+)\//)?.[1]),
    }))
    .filter((result) => Number.isFinite(result.id))
    .sort((a, b) => a.id - b.id);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    source: `${endpoint}/{id}/`,
    sprite: 'sprites.front_default',
    count,
    downloaded: 0,
    skipped: [],
    forms: {},
  };

  for (const formReference of forms) {
    const form = await fetchJson(formReference.url);
    const spriteUrl = form.sprites?.front_default;

    if (!spriteUrl) {
      manifest.skipped.push({
        id: form.id,
        name: form.name,
        reason: 'missing sprites.front_default',
      });
      continue;
    }

    const fileName = fileNameForForm(form);
    await downloadFile(spriteUrl, path.join(outputDir, fileName));

    manifest.forms[form.name] = {
      id: form.id,
      name: form.name,
      formName: form.form_name,
      pokemon: form.pokemon?.name ?? form.name,
      file: `assets/pokemon-sprites/front-default/${fileName}`,
      source: spriteUrl,
    };
    manifest.downloaded += 1;
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Synced ${manifest.downloaded} Pokemon form sprites to ${path.relative(rootDir, outputDir)}.`);

  if (manifest.skipped.length > 0) {
    console.log(`Skipped ${manifest.skipped.length} forms without sprites.front_default.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
