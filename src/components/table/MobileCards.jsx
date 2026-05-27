import React from 'react';
import { flexRender } from '@tanstack/react-table';
import { NameWithSprite } from '../common';
import { formatCountryCode, formatNumber, formatNumericDate, formatPascalCase } from '../../utils/format';
import { TopSetsCell, UsageCell, WinRateCell } from './tableCells';

function MobileMetric({ label, children }) {
  return (
    <div className="mobile-field mobile-field--metric">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function MobilePokemonCard({ row }) {
  const pokemon = row.original;

  return (
    <div className="mobile-card__fields mobile-card__fields--pokemon">
      <div className="mobile-field mobile-field--name">
        <span>Pokemon</span>
        <div>
          <div className="identity-cell">
            <span className="rank">{row.index + 1}</span>
            <NameWithSprite kind="pokemon" id={pokemon.id} name={pokemon.name}>
              <strong>{formatPascalCase(pokemon.name)}</strong>
            </NameWithSprite>
          </div>
        </div>
      </div>
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
      <div className="mobile-field mobile-field--name">
        <span>{category === 'moves' ? 'Attack' : 'Item'}</span>
        <div>
          <div className="identity-cell">
            <span className="rank">{row.index + 1}</span>
            <NameWithSprite kind={category} name={entry.name}>
              <strong>{formatPascalCase(entry.name)}</strong>
            </NameWithSprite>
          </div>
        </div>
      </div>
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
      <div className="mobile-field mobile-field--name">
        <span>Tournament</span>
        <div>
          <div className="identity-cell">
            <span className="rank">{row.index + 1}</span>
            <span>
              <strong>{formatPascalCase(tournament.name)}</strong>
              <small>{tournament.id} - click for standings</small>
            </span>
          </div>
        </div>
      </div>
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
          <div className="winner-team">
            {winner.team.map((pokemon) => (
              <span className="winner-pokemon" key={`${winner.name}-${pokemon.id}-${pokemon.item}`}>
                <NameWithSprite kind="pokemon" id={pokemon.id} name={pokemon.name}>
                  <strong>{formatPascalCase(pokemon.name)}</strong>
                </NameWithSprite>
                <NameWithSprite kind="items" name={pokemon.item} fallback="No Item">
                  <small>{formatPascalCase(pokemon.item, 'No Item')}</small>
                </NameWithSprite>
              </span>
            ))}
          </div>
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
