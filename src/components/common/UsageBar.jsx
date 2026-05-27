import React from 'react';
import { formatPercent } from '../../utils/format';

export function UsageBar({ value }) {
  return (
    <span className="usage-meter" aria-label={`${formatPercent(value)} usage`}>
      <span style={{ width: `${Math.min(value ?? 0, 100)}%` }} />
    </span>
  );
}
