import React from 'react';

export function Metric({ label, value, tone = 'neutral' }) {
  return (
    <article className={`metric metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
