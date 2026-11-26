import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataCorrections = JSON.parse(readFileSync(path.join(__dirname, 'data-corrections.json'), 'utf8'));
const eternalFloetteId = 'floette-eternal';
const eternalFloetteName = 'eternal flower floette';
const manualPokemonNamesById = new Map([
  ['floette-mega', eternalFloetteName],
  [eternalFloetteId, eternalFloetteName],
]);

function correctedValue(correctionType, value) {
  const normalizedValue = normalizeDataText(value);

  if (!normalizedValue) {
    return normalizedValue;
  }

  return dataCorrections[correctionType]?.[normalizedValue] ?? normalizedValue;
}

function normalizePokemonId(id) {
  if (!id) {
    return id;
  }

  const normalizedId = normalizeDataText(id);

  if (!normalizedId) {
    return normalizedId;
  }

  if (normalizedId === 'floette-mega' || normalizedId === eternalFloetteName) {
    return eternalFloetteId;
  }

  return correctedValue('pokemonIds', normalizedId.replace(/-mega(?:-[a-z])?$/i, ''));
}

export function normalizeDataText(value) {
  if (value == null) {
    return value;
  }

  if (!['string', 'number', 'bigint', 'boolean'].includes(typeof value)) {
    return null;
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
}

function normalizePokemonName({ id, name }) {
  const normalizedName = normalizeDataText(name);

  if (!normalizedName) {
    return normalizedName;
  }

  const manualName = manualPokemonNamesById.get(id);

  if (manualName) {
    return manualName;
  }

  return normalizedName
    .replace(/^mega\s+/i, '')
    .replace(/\s+[a-z]$/i, '')
    .trim();
}

export function normalizePokemon(pokemon) {
  const item = correctedValue('items', pokemon.item);
  const id = normalizePokemonId(pokemon.id);
  const isFloettiteFloette = item === 'floettite' && (id === 'floette' || id === eternalFloetteId);
  const normalizedId = isFloettiteFloette ? eternalFloetteId : id;

  return {
    ...pokemon,
    id: normalizedId,
    name: isFloettiteFloette ? eternalFloetteName : correctedValue('pokemonNames', normalizePokemonName({ ...pokemon, id: normalizedId })),
    ability: correctedValue('abilities', pokemon.ability),
    item,
    attacks: (Array.isArray(pokemon.attacks) ? pokemon.attacks : [])
      .map((attack) => correctedValue('attacks', attack))
      .filter(Boolean),
  };
}
