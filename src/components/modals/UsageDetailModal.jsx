import React from 'react';
import { formatNumber, formatPascalCase, formatPercent, formatScopeLabel } from '../../utils/format';
import { UsageDetailBreakdown } from '../breakdowns';
import { ModalShell } from '../common';

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
      <UsageDetailBreakdown entry={entry} />
    </ModalShell>
  );
}
