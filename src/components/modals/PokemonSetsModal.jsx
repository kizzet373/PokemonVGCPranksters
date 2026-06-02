import React from 'react';
import pokemonStatsData from '../../data/pokemon-stats.json';
import { formatNumber, formatPascalCase, formatPercent, formatScopeLabel } from '../../utils/format';
import { PokemonSetBreakdown } from '../breakdowns';
import { ModalShell } from '../common';

const statLabels = {
  hp: 'HP',
  attack: 'Atk',
  defense: 'Def',
  specialAttack: 'SpA',
  specialDefense: 'SpD',
  speed: 'Spe',
};

const statOrder = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
const pokemonStatsById = new Map(pokemonStatsData.pokemon.map((entry) => [entry.name, entry]));

function getChampionBaseStats(pokemon) {
  return pokemon?.baseStats ?? pokemonStatsById.get(pokemon?.name)?.baseStats ?? null;
}

function ChampionStatsStrip({ pokemon }) {
  const championStats = getChampionBaseStats(pokemon);

  if (!championStats) {
    return null;
  }

  return (
    <section className="pokemon-champion-stats" aria-label="Champion stats">
      <header>
        <span>Champion Stats</span>
      </header>
      <div className="pokemon-champion-stats__grid">
        {statOrder.map((stat) => (
          <span className="pokemon-champion-stats__item" key={stat}>
            <small>{statLabels[stat]}</small>
            <strong>{championStats[stat]}</strong>
          </span>
        ))}
      </div>
    </section>
  );
}

export function PokemonSetsModal({ pokemon, scope, onClose }) {
  if (!pokemon) {
    return null;
  }

  return (
    <ModalShell
      ariaLabel={`${formatPascalCase(pokemon.name)} sets`}
      className="pokemon-sets-modal"
      eyebrow={`${formatScopeLabel(scope)} set breakdown`}
      onClose={onClose}
      title={formatPascalCase(pokemon.name)}
      stats={[
        { label: 'Usage', value: formatPercent(pokemon.usagePercent) },
        { label: 'Winrate', value: formatPercent(pokemon.record?.winRate) },
        { label: 'Teams', value: formatNumber(pokemon.count) },
        { label: 'Public sets', value: formatNumber(pokemon.topSets?.length ?? 0) },
      ]}
    >
      <ChampionStatsStrip pokemon={pokemon} />
      <PokemonSetBreakdown pokemon={pokemon} />
    </ModalShell>
  );
}
