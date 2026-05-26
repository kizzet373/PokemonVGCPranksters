import React, { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { standingsAssetUrls } from '../data/sources';
import { normalizeDataValues } from '../utils/dataNormalization';
import {
  formatCountryCode,
  formatDate,
  formatNumber,
  formatPascalCase,
  formatPercent,
  formatScopeLabel,
  formatWholeNumber,
  recordLabel,
} from '../utils/format';
import { ModalShell } from './ModalShell';
import { PlayerStandingsBreakdown } from './PlayerStandingsBreakdown';
import { PokemonSetBreakdown } from './PokemonSetBreakdown';

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
      <div className="usage-detail-list">
        {(entry.topPokemon ?? []).map((pokemon, index) => (
          <article className="usage-detail-pokemon" key={`${entry.name}-${pokemon.id}`}>
            <span className="rank">#{index + 1}</span>
            <span>
              <strong>{formatPascalCase(pokemon.name)}</strong>
              <small>{formatNumber(pokemon.count)} sets</small>
            </span>
            <span>
              <strong>{formatPercent(pokemon.usagePercent)}</strong>
              <small>Usage</small>
            </span>
            <span>
              <strong>{formatPercent(pokemon.record?.winRate)}</strong>
              <small>Winrate</small>
            </span>
          </article>
        ))}
      </div>
    </ModalShell>
  );
}

export function PokemonSetsModal({ pokemon, scope, onClose }) {
  if (!pokemon) {
    return null;
  }

  return (
    <ModalShell
      ariaLabel={`${formatPascalCase(pokemon.name)} sets`}
      className="pokemon-sets-modal"
      eyebrow={`${formatScopeLabel(scope)} set breakdown`}
      onClose={onClose}
      title={formatPascalCase(pokemon.name)}
      stats={[
        { label: 'Usage', value: formatPercent(pokemon.usagePercent) },
        { label: 'Winrate', value: formatPercent(pokemon.record?.winRate) },
        { label: 'Teams', value: formatNumber(pokemon.count) },
        { label: 'Public sets', value: formatNumber(pokemon.topSets?.length ?? 0) },
      ]}
    >
      <PokemonSetBreakdown pokemon={pokemon} />
    </ModalShell>
  );
}

export function PlayerProfileModal({ player, scope, onClose }) {
  if (!player) {
    return null;
  }

  return (
    <ModalShell
      ariaLabel={`${formatPascalCase(player.name)} profile`}
      eyebrow={`${formatScopeLabel(scope)} profile`}
      onClose={onClose}
      title={formatPascalCase(player.name)}
      stats={[
        { label: 'Prankster ELO', value: formatNumber(player.pranksterElo) },
        { label: 'Winrate', value: formatPercent(player.record?.winRate) },
        { label: 'Tournaments', value: formatNumber(player.tournaments) },
        { label: 'Average size', value: formatWholeNumber(player.averageSize) },
      ]}
    >
      <PlayerStandingsBreakdown player={player} scope={scope} />
    </ModalShell>
  );
}

export function TournamentStandingsModal({ tournament, onClose }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!tournament) {
      return undefined;
    }

    let ignored = false;
    const controller = new AbortController();

    setDetails(null);
    setError(null);

    const moduleKey = `./standings/${tournament.id}.json`;
    const standingsUrl = standingsAssetUrls[moduleKey];

    if (!standingsUrl) {
      setError(new Error(`Missing standings for ${tournament.id}`));
      return () => {
        ignored = true;
        controller.abort();
      };
    }

    fetch(standingsUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load standings for ${formatPascalCase(tournament.name)}`);
        }

        return response.json();
      })
      .then((json) => {
        if (!ignored) {
          setDetails(normalizeDataValues(json));
        }
      })
      .catch((fetchError) => {
        if (!ignored && fetchError.name !== 'AbortError') {
          setError(fetchError);
        }
      });

    return () => {
      ignored = true;
      controller.abort();
    };
  }, [tournament]);

  const standings = details?.standings ?? [];
  const standingsVirtualizer = useVirtualizer({
    count: standings.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 86,
    measureElement: (element) => element.offsetHeight,
    overscan: 10,
  });
  const virtualStandings = standingsVirtualizer.getVirtualItems();

  useEffect(() => {
    standingsVirtualizer.measure();
  }, [standings.length, standingsVirtualizer]);

  if (!tournament) {
    return null;
  }

  return (
    <ModalShell
      ariaLabel={`${formatPascalCase(tournament.name)} standings`}
      className="tournament-modal"
      eyebrow={`${formatDate(tournament.date)} - ${formatNumber(tournament.players)} players`}
      onClose={onClose}
      title={formatPascalCase(tournament.name)}
      stats={[
        { label: 'Players', value: formatNumber(tournament.players) },
        { label: 'Standings', value: details ? formatNumber(details.standingsCount ?? standings.length) : '...' },
        { label: 'Format', value: formatPascalCase(tournament.format) },
        { label: 'Game', value: formatPascalCase(tournament.game) },
      ]}
    >
      {error ? <p className="detail-state">Could not load standings for {formatPascalCase(tournament.name)}.</p> : null}
      {!error && !details ? <p className="detail-state">Loading standings for {formatPascalCase(tournament.name)}...</p> : null}
      {details ? (
        <div className="tournament-standings" ref={scrollRef}>
          <div className="tournament-standings__spacer" style={{ height: `${standingsVirtualizer.getTotalSize()}px` }}>
            {virtualStandings.map((virtualRow) => {
              const standing = standings[virtualRow.index];

              return (
                <article
                  className="tournament-standing"
                  data-index={virtualRow.index}
                  key={`${standing.player ?? standing.name}-${virtualRow.index}`}
                  ref={standingsVirtualizer.measureElement}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <span className="standing-placement">
                    {standing.placing ? `#${standing.placing}` : standing.drop ? `Drop ${standing.drop}` : '-'}
                  </span>
                  <span className="tournament-standing__player">
                    <strong>{formatPascalCase(standing.name)}</strong>
                    <small>{formatCountryCode(standing.country)}</small>
                  </span>
                  <span className="standing-detail__record">
                    <strong>{recordLabel(standing.record)}</strong>
                    <small>Record</small>
                  </span>
                  <span className="tournament-standing__team">
                    {(standing.team ?? []).map((pokemon) => (
                      <span key={`${standing.player}-${pokemon.id}-${pokemon.item}`}>{formatPascalCase(pokemon.name)}</span>
                    ))}
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
