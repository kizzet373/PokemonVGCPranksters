import React from 'react';

export function RankPill({ children, className = 'rank' }) {
  return <span className={className}>{children}</span>;
}
