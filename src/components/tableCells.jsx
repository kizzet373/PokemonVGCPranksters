import React from 'react';
import { UsageBar } from './UsageBar';
import { formatCountryCode, formatNumber, formatPascalCase, formatPercent, recordLabel } from '../utils/format';

export function PokemonCell({ row }) {
  const pokemon = row.original;

  return (
    <div className="identity-cell">
      <span className="rank">{row.index + 1}</span>
      <span>
        <strong>{formatPascalCase(pokemon.name)}</strong>
        <small>{formatPascalCase(pokemon.id)} - click for sets</small>
      </span>
    </div>
  );
}

export function NameCell({ row }) {
  return (
    <div className="identity-cell">
      <span className="rank">{row.index + 1}</span>
      <strong>{formatPascalCase(row.original.name)}</strong>
    </div>
  );
}

export function PlayerCell({ row }) {
  const player = row.original;

  return (
    <div className="identity-cell">
      <span className="rank">{player.rank}</span>
      <span>
        <strong>{formatPascalCase(player.name)}</strong>
        <small>{formatCountryCode(player.country)} - click for standings</small>
      </span>
    </div>
  );
}

export function TournamentCell({ row }) {
  const tournament = row.original;

  return (
    <div className="identity-cell">
      <span className="rank">{row.index + 1}</span>
      <span>
        <strong>{formatPascalCase(tournament.name)}</strong>
        <small>{tournament.id} - click for standings</small>
      </span>
    </div>
  );
}

export function EloCell({ getValue }) {
  return <strong className="elo-value">{formatNumber(getValue())}</strong>;
}

export function UsageCell({ category, getValue, row }) {
  const value = getValue();
  const countLabel = category === 'moves' ? 'Pokemon' : 'Teams';

  return (
    <div className="usage-cell">
      <span className="usage-value">
        <span>{formatPercent(value)}</span>
        <small>
          {formatNumber(row.original.count)} {countLabel}
        </small>
      </span>
      <UsageBar value={value} />
    </div>
  );
}

export function WinRateCell({ row }) {
  const { record } = row.original;

  return (
    <div className="stacked-cell">
      <strong>{formatPercent(record?.winRate)}</strong>
      <small>{recordLabel(record)}</small>
    </div>
  );
}

export function TopSetsCell({ row }) {
  const set = row.original.topSets?.[0];

  if (!set) {
    return <span className="muted">No public set</span>;
  }

  return (
    <div className="set-list">
      <span className="set-pill">
        <strong>{formatPascalCase(set.item, 'No Item')}</strong>
        <small>
          {formatPascalCase(set.ability, 'No Ability')} - {formatPercent(set.pokemonUsagePercent)}
        </small>
      </span>
    </div>
  );
}
