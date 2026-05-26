import React from 'react';
import { formatPascalCase, formatPercent } from '../utils/format';

export function PokemonSetBreakdown({ pokemon }) {
  return (
    <div className="pokemon-breakdown">
      {(pokemon.topSets ?? []).map((set) => (
        <article className="set-detail" key={`${set.rank}-${set.item}-${set.ability}-${set.attacks.join('-')}`}>
          <div className="set-detail__header">
            <span className="rank">#{set.rank}</span>
            <span>
              <strong>{formatPascalCase(set.item, 'No Item')}</strong>
              <small>{formatPascalCase(set.ability, 'No Ability')}</small>
            </span>
          </div>
          <div className="set-detail__moves">
            {set.attacks.map((attack) => (
              <span key={attack}>{formatPascalCase(attack)}</span>
            ))}
          </div>
          <div className="set-detail__stats">
            <span>
              <strong>{formatPercent(set.pokemonUsagePercent)}</strong>
              <small>Usage</small>
            </span>
            <span>
              <strong>{formatPercent(set.record?.winRate)}</strong>
              <small>Winrate</small>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
