const manualPokemonNamesById = new Map([
  ['floette-mega', 'Eternal Flower Floette'],
]);

function normalizePokemonId(id) {
  if (!id) {
    return id;
  }

  if (id === 'floette-mega') {
    return 'floette-eternal';
  }

  return id.replace(/-mega(?:-[a-z])?$/i, '');
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
    name: normalizePokemonName(pokemon),
  };
}
