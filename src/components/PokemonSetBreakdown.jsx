import React from 'react';
import { formatPascalCase, formatPercent } from '../utils/format';
import { NameWithSprite } from './NameWithSprite';

export function PokemonSetBreakdown({ pokemon }) {
  return (
    <div className="pokemon-breakdown">
      {(pokemon.topSets ?? []).map((set) => (
        <article className="set-detail" key={`${set.rank}-${set.item}-${set.ability}-${set.attacks.join('-')}`}>
          <div className="set-detail__header">
            <span className="rank">#{set.rank}</span>
            <span>
              <NameWithSprite kind="items" name={set.item} fallback="No Item">
                <strong>{formatPascalCase(set.item, 'No Item')}</strong>
              </NameWithSprite>
              <small>{formatPascalCase(set.ability, 'No Ability')}</small>
            </span>
          </div>
          <div className="set-detail__moves">
            {set.attacks.map((attack) => (
              <span className="set-detail__move" key={attack}>
                {formatPascalCase(attack)}
              </span>
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
