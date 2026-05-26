import React from 'react';
import { formatNumber, formatPascalCase, formatPercent, formatScopeLabel } from '../../utils/format';
import { ModalShell } from '../ModalShell';
import { NameWithSprite } from '../NameWithSprite';

export function UsageDetailModal({ category, entry, scope, onClose }) {
  if (!entry) {
    return null;
  }

  const label = category === 'moves' ? 'Attack' : 'Item';

  return (
    <ModalShell
      ariaLabel={`${formatPascalCase(entry.name)} ${label.toLowerCase()} details`}
      className="usage-detail-modal"
      eyebrow={`${formatScopeLabel(scope)} ${label.toLowerCase()}`}
      onClose={onClose}
      title={formatPascalCase(entry.name)}
      stats={[
        { label: category === 'moves' ? 'Pokemon' : 'Teams', value: formatNumber(entry.count) },
        { label: 'Usage', value: formatPercent(entry.usagePercent) },
        { label: 'Winrate', value: formatPercent(entry.record?.winRate) },
        { label: 'Top Pokemon', value: formatNumber(entry.topPokemon?.length ?? 0) },
      ]}
    >
      <div className="usage-detail-list">
        {(entry.topPokemon ?? []).map((pokemon, index) => (
          <article className="usage-detail-pokemon" key={`${entry.name}-${pokemon.id}`}>
            <span className="rank">#{index + 1}</span>
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
    </ModalShell>
  );
}
