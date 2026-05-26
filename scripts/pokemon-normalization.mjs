import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataCorrections = JSON.parse(readFileSync(path.join(__dirname, 'data-corrections.json'), 'utf8'));
const manualPokemonNamesById = new Map([
  ['floette-mega', 'Eternal Flower Floette'],
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

  if (id === 'floette-mega') {
    return 'floette-eternal';
  }

  return correctedValue('pokemonIds', id.replace(/-mega(?:-[a-z])?$/i, ''));
}

export function normalizeDataText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function normalizePokemonName({ id, name }) {
  if (!name) {
    return name;
  }

  const manualName = manualPokemonNamesById.get(id);

  if (manualName) {
    return manualName;
  }

  return name
    .replace(/^mega\s+/i, '')
    .replace(/\s+[a-z]$/i, '')
    .trim();
}

export function normalizePokemon(pokemon) {
  return {
    ...pokemon,
    id: normalizePokemonId(pokemon.id),
    name: correctedValue('pokemonNames', normalizePokemonName(pokemon)),
    ability: correctedValue('abilities', pokemon.ability),
    item: correctedValue('items', pokemon.item),
    attacks: (pokemon.attacks ?? []).map((attack) => correctedValue('attacks', attack)).filter(Boolean),
  };
}
