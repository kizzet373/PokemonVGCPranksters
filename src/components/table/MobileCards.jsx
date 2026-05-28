import React from 'react';
import { flexRender } from '@tanstack/react-table';
import { NameWithSprite, RankPill } from '../common';
import {
  formatCountryCode,
  formatNumber,
  formatNumericDate,
  formatPascalCase,
  formatPercent,
  formatWholeNumber,
  recordLabel,
} from '../../utils/format';
import { EloCell, TopSetsCell, TypeIcons, typingForPokemon, UsageCell, WinnerTeam, WinRateCell } from './tableCells';

function MobileMetric({ children, field, label }) {
  const fieldClass = field ? ` mobile-field--${field}` : '';

  return (
    <div className={`mobile-field mobile-field--metric${fieldClass}`}>
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function MobileIdentityField({ children, label, rank }) {
  return (
    <div className="mobile-field mobile-field--name">
      {label ? <span>{label}</span> : null}
      <div>
        <div className="identity-cell">
          <RankPill>{rank}</RankPill>
          {children}
        </div>
      </div>
    </div>
  );
}

function MobilePokemonCard({ row }) {
  const pokemon = row.original;

  return (
    <div className="mobile-card__fields mobile-card__fields--pokemon">
      <MobileIdentityField rank={row.index + 1}>
        <span className="mobile-card__title-line">
          <NameWithSprite kind="pokemon" id={pokemon.id} name={pokemon.name}>
            <strong>{formatPascalCase(pokemon.name)}</strong>
          </NameWithSprite>
          <TypeIcons types={typingForPokemon(pokemon)} />
        </span>
      </MobileIdentityField>
      <MobileMetric field="usagePercent" label="Usage">
        <UsageCell category="pokemon" getValue={() => pokemon.usagePercent} row={row} />
      </MobileMetric>
      <MobileMetric field="winRate" label="Winrate">
        <WinRateCell row={row} />
      </MobileMetric>
      <MobileMetric field="topSets" label="Top Set">
        <TopSetsCell row={row} />
      </MobileMetric>
    </div>
  );
}

function MobileUsageDetailCard({ category, row }) {
  const entry = row.original;

  return (
    <div className="mobile-card__fields mobile-card__fields--usage-detail">
      <MobileIdentityField rank={row.index + 1}>
        <span className="mobile-card__title-line">
          <NameWithSprite kind={category} name={entry.name}>
            <strong>{formatPascalCase(entry.name)}</strong>
          </NameWithSprite>
        </span>
      </MobileIdentityField>
      <MobileMetric field="usagePercent" label="Usage">
        <UsageCell category={category} getValue={() => entry.usagePercent} row={row} />
      </MobileMetric>
      <MobileMetric field="winRate" label="Winrate">
        <WinRateCell row={row} />
      </MobileMetric>
    </div>
  );
}

function MobileTournamentCard({ row }) {
  const tournament = row.original;
  const winner = tournament.winner;

  return (
    <div className="mobile-card__fields mobile-card__fields--tournament">
      <MobileIdentityField rank={row.index + 1}>
        <span className="mobile-card__title-line">
          <strong>{formatPascalCase(tournament.name)}</strong>
        </span>
      </MobileIdentityField>
      <MobileMetric field="date" label="Date">
        <strong>{formatNumericDate(tournament.date)}</strong>
      </MobileMetric>
      <MobileMetric field="players" label="Players">
        <strong>{formatNumber(tournament.players)}</strong>
      </MobileMetric>
      <MobileMetric field="winner" label="Winner">
        {winner ? (
          <span className="mobile-winner-name">
            <strong>{formatPascalCase(winner.name)}</strong>
            <small>{formatCountryCode(winner.country)}</small>
          </span>
        ) : (
          <span className="muted">No winner data</span>
        )}
      </MobileMetric>
      {winner?.team?.length ? (
        <div className="mobile-field mobile-field--winnerTeam">
          <span>Team</span>
          <WinnerTeam team={winner.team} winnerName={winner.name} />
        </div>
      ) : null}
    </div>
  );
}

function MobilePlayerCard({ row }) {
  const player = row.original;

  return (
    <div className="mobile-card__fields mobile-card__fields--player">
      <MobileIdentityField rank={player.rank}>
        <span className="mobile-card__title-line">
          <span className="player-name-line">
            <strong>{formatPascalCase(player.name)}</strong>
            <small>({formatCountryCode(player.country)})</small>
          </span>
        </span>
      </MobileIdentityField>
      <MobileMetric field="pranksterElo" label="Prankster ELO">
        <EloCell getValue={() => player.pranksterElo} />
      </MobileMetric>
      <MobileMetric field="winRate" label="Winrate">
        <div className="stacked-cell">
          <strong>{formatPercent(player.record?.winRate)}</strong>
          <small>{recordLabel(player.record)}</small>
        </div>
      </MobileMetric>
      <MobileMetric field="tournaments" label="Tournaments">
        <strong>{formatNumber(player.tournaments)}</strong>
      </MobileMetric>
      <MobileMetric field="averageSize" label="Average Size">
        <strong>{formatWholeNumber(player.averageSize)}</strong>
      </MobileMetric>
    </div>
  );
}

function GenericMobileCard({ row }) {
  return (
    <div className="mobile-card__fields">
      {row.getVisibleCells().map((cell, index) => (
        <div className={`mobile-field mobile-field--${cell.column.id}`} key={cell.id}>
          {index === 0 ? null : <span>{String(cell.column.columnDef.header)}</span>}
          <div>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
        </div>
      ))}
    </div>
  );
}

export function MobileCardFields({ category, row }) {
  if (category === 'pokemon') {
    return <MobilePokemonCard row={row} />;
  }

  if (category === 'items' || category === 'moves') {
    return <MobileUsageDetailCard category={category} row={row} />;
  }

  if (category === 'tournaments') {
    return <MobileTournamentCard row={row} />;
  }

  if (category === 'players') {
    return <MobilePlayerCard row={row} />;
  }

  return <GenericMobileCard row={row} />;
}
