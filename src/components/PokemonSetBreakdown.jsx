import React from 'react';
import { formatPascalCase, formatPercent } from '../utils/format';
import { NameWithSprite } from './NameWithSprite';

function PokemonAggregateList({ entries, kind, title }) {
  if (!entries?.length) {
    return null;
  }

  const isItem = kind === 'items';

  return (
    <section className="pokemon-aggregate">
      <h3>{title}</h3>
      <div className="pokemon-aggregate__list">
        {entries.map((entry) => (
          <article className="pokemon-aggregate__row" key={`${kind}-${entry.rank}-${entry.ability ?? entry.item}`}>
            <span className="rank">#{entry.rank}</span>
            <span>
              {isItem ? (
                <NameWithSprite kind="items" name={entry.item} fallback="No Item">
                  <strong>{formatPascalCase(entry.item, 'No Item')}</strong>
                </NameWithSprite>
              ) : (
                <strong>{formatPascalCase(entry.ability, 'No Ability')}</strong>
              )}
              <small>{formatPercent(entry.pokemonUsagePercent)} usage</small>
            </span>
            <span>
              <strong>{formatPercent(entry.record?.winRate)}</strong>
              <small>Winrate</small>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PokemonSetBreakdown({ pokemon }) {
  return (
    <div className="pokemon-set-breakdown">
      <div className="pokemon-aggregate-grid">
        <PokemonAggregateList entries={pokemon.topAbilities} kind="abilities" title="Top Abilities" />
        <PokemonAggregateList entries={pokemon.topItems} kind="items" title="Top Items" />
      </div>
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
    </div>
  );
}
