import React, { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { standingsAssetUrls } from '../../data/sources';
import { normalizeDataValues } from '../../utils/dataNormalization';
import { formatCountryCode, formatDate, formatNumber, formatPascalCase, recordLabel } from '../../utils/format';
import { ModalShell } from '../ModalShell';
import { NameWithSprite } from '../NameWithSprite';

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
    estimateSize: () => 148,
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
                      <span className="tournament-standing__pokemon" key={`${standing.player}-${pokemon.id}-${pokemon.item}`}>
                        <NameWithSprite className="tournament-standing__pokemon-name" kind="pokemon" id={pokemon.id} name={pokemon.name}>
                          {formatPascalCase(pokemon.name)}
                        </NameWithSprite>
                        <NameWithSprite className="tournament-standing__pokemon-item" kind="items" name={pokemon.item} fallback="No Item">
                          {formatPascalCase(pokemon.item, 'No Item')}
                        </NameWithSprite>
                        {pokemon.attacks?.length ? (
                          <span className="tournament-standing__pokemon-moves">
                            {pokemon.attacks.map((attack) => formatPascalCase(attack)).join(', ')}
                          </span>
                        ) : null}
                      </span>
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
