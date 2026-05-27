import React from 'react';
import { NameWithSprite, RankPill, UsageBar } from '../common';
import { formatCountryCode, formatNumber, formatPascalCase, formatPercent, recordLabel } from '../../utils/format';

export function PokemonCell({ row }) {
  const pokemon = row.original;

  return (
    <div className="identity-cell">
      <RankPill>{row.index + 1}</RankPill>
      <span>
        <NameWithSprite kind="pokemon" id={pokemon.id} name={pokemon.name}>
          <strong>{formatPascalCase(pokemon.name)}</strong>
        </NameWithSprite>
      </span>
    </div>
  );
}

export function NameCell({ category, row }) {
  return (
    <div className="identity-cell">
      <RankPill>{row.index + 1}</RankPill>
      <NameWithSprite kind={category} name={row.original.name}>
        <strong>{formatPascalCase(row.original.name)}</strong>
      </NameWithSprite>
    </div>
  );
}

export function PlayerCell({ row }) {
  const player = row.original;

  return (
    <div className="identity-cell">
      <RankPill>{player.rank}</RankPill>
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
      <RankPill>{row.index + 1}</RankPill>
      <span>
        <strong>{formatPascalCase(tournament.name)}</strong>
        <small>{tournament.id} - click for standings</small>
      </span>
    </div>
  );
}

export function WinnerTeam({ team, winnerName }) {
  if (!team?.length) {
    return null;
  }

  return (
    <span className="winner-team">
      {team.map((pokemon) => (
        <span className="winner-pokemon" key={`${winnerName}-${pokemon.id}-${pokemon.item}`}>
          <NameWithSprite kind="pokemon" id={pokemon.id} name={pokemon.name}>
            <strong>{formatPascalCase(pokemon.name)}</strong>
          </NameWithSprite>
          <NameWithSprite kind="items" name={pokemon.item} fallback="No Item">
            <small>{formatPascalCase(pokemon.item, 'No Item')}</small>
          </NameWithSprite>
        </span>
      ))}
    </span>
  );
}

export function TournamentWinnerCell({ row }) {
  const winner = row.original.winner;

  if (!winner) {
    return <span className="muted">No winner data</span>;
  }

  return (
    <div className="winner-cell">
      <span>
        <strong>{formatPascalCase(winner.name)}</strong>
        <small>{formatCountryCode(winner.country)}</small>
      </span>
      <WinnerTeam team={winner.team} winnerName={winner.name} />
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
  const set = row.original.topAbilityItems?.[0] ?? row.original.topSets?.[0];

  if (!set) {
    return <span className="muted">No public set</span>;
  }

  return (
    <div className="set-list">
      <span className="set-pill">
        <NameWithSprite kind="items" name={set.item} fallback="No Item">
          <strong>{formatPascalCase(set.item, 'No Item')}</strong>
        </NameWithSprite>
        <small>
          {formatPascalCase(set.ability, 'No Ability')} - {formatPercent(set.pokemonUsagePercent)}
        </small>
      </span>
    </div>
  );
}
