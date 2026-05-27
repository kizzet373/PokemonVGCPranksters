import React from 'react';
import { formatNumber, formatPascalCase, formatPercent, formatScopeLabel } from '../../utils/format';
import { PokemonSetBreakdown } from '../breakdowns';
import { ModalShell } from '../common';

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
      <PokemonSetBreakdown pokemon={pokemon} />
    </ModalShell>
  );
}
