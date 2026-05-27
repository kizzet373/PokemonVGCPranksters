import React from 'react';
import { formatNumber, formatPascalCase, formatPercent } from '../../utils/format';
import { NameWithSprite, RankPill } from '../common';

export function UsageDetailBreakdown({ entry }) {
  return (
    <div className="usage-detail-list">
      {(entry.topPokemon ?? []).map((pokemon, index) => (
        <article className="usage-detail-pokemon" key={`${entry.name}-${pokemon.id}`}>
          <RankPill>#{index + 1}</RankPill>
          <span>
            <NameWithSprite kind="pokemon" id={pokemon.id} name={pokemon.name}>
              <strong>{formatPascalCase(pokemon.name)}</strong>
            </NameWithSprite>
            <small>{formatNumber(pokemon.count)} sets</small>
          </span>
          <span>
            <strong>{formatPercent(pokemon.usagePercent)}</strong>
            <small>Usage</small>
          </span>
          <span>
            <strong>{formatPercent(pokemon.record?.winRate)}</strong>
            <small>Winrate</small>
          </span>
        </article>
      ))}
    </div>
  );
}
