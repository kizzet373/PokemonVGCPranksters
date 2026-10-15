import { Generations, toID } from '@smogon/calc';
import { normalizeDataText, normalizePokemon } from './pokemon-normalization.mjs';

const generation = Generations.get(9);

function validationIssue(code, message) {
  return { code, message };
}

function uniqueIssues(issues) {
  return [...new Map(issues.map((issue) => [`${issue.code}:${issue.message}`, issue])).values()];
}

function pokemonKeys(pokemon = {}) {
  return [pokemon.id, pokemon.name, pokemon.pokeApiName].map(toID).filter(Boolean);
}

export function buildKnownPokemonKeys(records = []) {
  return new Set(records.flatMap(pokemonKeys));
}

export function validateStandingForReporting(standing = {}, { knownPokemonKeys = new Set() } = {}) {
  const { reporting: _previousReporting, ...standingData } = standing;
  const issues = [];
  const sourceTeam = Array.isArray(standing.team) ? standing.team : [];

  if (sourceTeam.length === 0) {
    issues.push(validationIssue('team-unavailable', 'No Pokemon team data was available.'));
  }

  const team = sourceTeam.map((rawPokemon, pokemonIndex) => {
    const pokemon = normalizePokemon(rawPokemon);
    const displayName = pokemon.name ?? pokemon.id ?? `team slot ${pokemonIndex + 1}`;
    const keys = pokemonKeys(pokemon);

    if (keys.length === 0) {
      issues.push(validationIssue('pokemon-unavailable', `Pokemon data was unavailable for team slot ${pokemonIndex + 1}.`));
    } else if (knownPokemonKeys.size > 0 && !keys.some((key) => knownPokemonKeys.has(key))) {
      issues.push(validationIssue('pokemon-unavailable', `Pokemon data could not be resolved for ${displayName}.`));
    }

    const sourceAttacks = Array.isArray(pokemon.attacks) ? pokemon.attacks : [];

    if (sourceAttacks.length === 0) {
      issues.push(validationIssue('moves-unavailable', `Move data was unavailable for ${displayName}.`));
    }

    const attacks = sourceAttacks.map((attack) => {
      const normalizedAttack = normalizeDataText(attack);
      const move = generation.moves.get(toID(normalizedAttack));

      if (!move) {
        issues.push(validationIssue('move-unavailable', `Move data could not be resolved for ${attack} on ${displayName}.`));
        return normalizedAttack;
      }

      return normalizeDataText(move.name);
    }).filter(Boolean);

    return {
      ...pokemon,
      attacks,
    };
  });

  const uniqueValidationIssues = uniqueIssues(issues);

  return {
    ...standingData,
    team,
    ...(uniqueValidationIssues.length > 0 ? {
      reporting: {
        valid: false,
        issues: uniqueValidationIssues,
      },
    } : {}),
  };
}

export function isReportingInvalid(standing = {}) {
  return standing.reporting?.valid === false;
}
