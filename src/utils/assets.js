import assetIndex from '../data/asset-index.json';

function normalizedText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function itemKey(value) {
  return normalizedText(value).replace(/\s+/g, '-').replace(/[']/g, '');
}

function typeKey(value) {
  return normalizedText(value).replace(/\s+/g, '-');
}

export function getTypeIcon(name) {
  const key = typeKey(name);

  return key ? `/assets/type-icons/sword-shield/${key}.png` : null;
}

export function getPokemonSprite(id) {
  return assetIndex.pokemon[normalizedText(id)] ?? null;
}

export function getItemSprite(name) {
  const normalizedName = normalizedText(name);

  return assetIndex.items[normalizedName] ?? assetIndex.items[itemKey(normalizedName)] ?? null;
}

export function getMoveIcon(name) {
  return assetIndex.moves[normalizedText(name)]?.icon ?? null;
}

export function getNameAsset({ kind, id, name }) {
  if (kind === 'pokemon') {
    return getPokemonSprite(id ?? name);
  }

  if (kind === 'items') {
    return getItemSprite(name);
  }

  if (kind === 'moves') {
    return getMoveIcon(name);
  }

  return null;
}
