import React from 'react';
import { formatNumber, formatPascalCase, formatPercent, formatScopeLabel, formatWholeNumber } from '../../utils/format';
import { ModalShell } from '../ModalShell';
import { PlayerStandingsBreakdown } from '../PlayerStandingsBreakdown';

export function PlayerProfileModal({ player, scope, onClose }) {
  if (!player) {
    return null;
  }

  return (
    <ModalShell
      ariaLabel={`${formatPascalCase(player.name)} profile`}
      className="player-profile-modal"
      eyebrow={`${formatScopeLabel(scope)} profile`}
      onClose={onClose}
      title={formatPascalCase(player.name)}
      stats={[
        { label: 'Prankster ELO', value: formatNumber(player.pranksterElo) },
        { label: 'Winrate', value: formatPercent(player.record?.winRate) },
        { label: 'Tournaments', value: formatNumber(player.tournaments) },
        { label: 'Average size', value: formatWholeNumber(player.averageSize) },
      ]}
    >
      <PlayerStandingsBreakdown player={player} scope={scope} />
    </ModalShell>
  );
}
