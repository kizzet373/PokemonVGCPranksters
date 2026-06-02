import React from 'react';
import { NameWithSprite, RankPill } from '../common';
import { formatPascalCase, formatPercent } from '../../utils/format';

function PokemonAggregateList({ entries, kind, title, variant = kind }) {
  if (!entries?.length) {
    return null;
  }

  const isItem = kind === 'items';

  return (
    <section className={`pokemon-aggregate pokemon-aggregate--${variant}`}>
      <h3>{title}</h3>
      <div className="pokemon-aggregate__list">
        {entries.map((entry) => (
          <article className="pokemon-aggregate__row" key={`${kind}-${entry.rank}-${entry.ability ?? entry.item}`}>
            <RankPill>{entry.rank}</RankPill>
            <span>
              {isItem ? (
                <NameWithSprite kind="items" name={entry.item} fallback="No Item">
                  <strong>{formatPascalCase(entry.item, 'No Item')}</strong>
                </NameWithSprite>
              ) : (
                <strong>{formatPascalCase(entry.ability, 'No Ability')}</strong>
              )}
            </span>
            <div className="pokemon-aggregate__stats">
              <span>
                <strong>{formatPercent(entry.pokemonUsagePercent)}</strong>
                <small>Usage</small>
              </span>
              <span>
                <strong>{formatPercent(entry.record?.winRate)}</strong>
                <small>Winrate</small>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PokemonSetBreakdown({ pokemon }) {
  const isMega = Boolean(pokemon.megaStone);

  return (
    <div className={`pokemon-set-breakdown${isMega ? ' pokemon-set-breakdown--mega' : ''}`}>
      <PokemonAggregateList entries={pokemon.topAbilities} kind="abilities" title={isMega ? 'Mega Ability' : 'Top Abilities'} />
      {isMega ? (
        <PokemonAggregateList entries={pokemon.baseAbilities} kind="abilities" title="Base Abilities" variant="base-abilities" />
      ) : null}
      <PokemonAggregateList entries={pokemon.topItems} kind="items" title="Top Items" />
      <section className="pokemon-sets-column">
        <h3>Top Sets</h3>
        <div className="pokemon-breakdown">
          {(pokemon.topSets ?? []).map((set) => (
            <article className="set-detail" key={`${set.rank}-${set.item}-${set.ability}-${set.attacks.join('-')}`}>
              <div className="set-detail__header">
                <RankPill>{set.rank}</RankPill>
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
      </section>
    </div>
  );
}
