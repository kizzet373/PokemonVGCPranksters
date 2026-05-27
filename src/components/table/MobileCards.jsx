import React from 'react';
import { flexRender } from '@tanstack/react-table';
import { NameWithSprite, RankPill } from '../common';
import { formatCountryCode, formatNumber, formatNumericDate, formatPascalCase } from '../../utils/format';
import { TopSetsCell, UsageCell, WinnerTeam, WinRateCell } from './tableCells';

function MobileMetric({ label, children }) {
  return (
    <div className="mobile-field mobile-field--metric">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function MobileIdentityField({ children, label, rank }) {
  return (
    <div className="mobile-field mobile-field--name">
      <span>{label}</span>
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
      <MobileIdentityField label="Pokemon" rank={row.index + 1}>
        <NameWithSprite kind="pokemon" id={pokemon.id} name={pokemon.name}>
          <strong>{formatPascalCase(pokemon.name)}</strong>
        </NameWithSprite>
      </MobileIdentityField>
      <MobileMetric label="Usage">
        <UsageCell category="pokemon" getValue={() => pokemon.usagePercent} row={row} />
      </MobileMetric>
      <MobileMetric label="Winrate">
        <WinRateCell row={row} />
      </MobileMetric>
      <MobileMetric label="Top Set">
        <TopSetsCell row={row} />
      </MobileMetric>
    </div>
  );
}

function MobileUsageDetailCard({ category, row }) {
  const entry = row.original;

  return (
    <div className="mobile-card__fields mobile-card__fields--usage-detail">
      <MobileIdentityField label={category === 'moves' ? 'Attack' : 'Item'} rank={row.index + 1}>
        <NameWithSprite kind={category} name={entry.name}>
          <strong>{formatPascalCase(entry.name)}</strong>
        </NameWithSprite>
      </MobileIdentityField>
      <MobileMetric label="Usage">
        <UsageCell category={category} getValue={() => entry.usagePercent} row={row} />
      </MobileMetric>
      <MobileMetric label="Winrate">
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
      <MobileIdentityField label="Tournament" rank={row.index + 1}>
        <span>
          <strong>{formatPascalCase(tournament.name)}</strong>
          <small>{tournament.id} - click for standings</small>
        </span>
      </MobileIdentityField>
      <MobileMetric label="Date">
        <strong>{formatNumericDate(tournament.date)}</strong>
      </MobileMetric>
      <MobileMetric label="Players">
        <strong>{formatNumber(tournament.players)}</strong>
      </MobileMetric>
      <MobileMetric label="Winner">
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

function GenericMobileCard({ row }) {
  return (
    <div className="mobile-card__fields">
      {row.getVisibleCells().map((cell) => (
        <div className={`mobile-field mobile-field--${cell.column.id}`} key={cell.id}>
          <span>{String(cell.column.columnDef.header)}</span>
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

  return <GenericMobileCard row={row} />;
}
