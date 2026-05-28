import React from 'react';

export function RankPill({ children, className = 'rank' }) {
  const label = typeof children === 'string' ? children.replace(/^#/, '') : children;

  return <span className={className}>{label}</span>;
}
