import React, { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatCountryCode, formatPascalCase, recordLabel } from '../../utils/format';
import { NameWithSprite, RankPill } from '../common';

export function TournamentStandingsBreakdown({ standings }) {
  const scrollRef = useRef(null);
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

  return (
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
              <RankPill className="standing-placement">
                {standing.placing ? `#${standing.placing}` : standing.drop ? `Drop ${standing.drop}` : '-'}
              </RankPill>
              <span className="tournament-standing__player">
                <strong>{formatPascalCase(standing.name)}</strong>
                <small>({formatCountryCode(standing.country)})</small>
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
  );
}
