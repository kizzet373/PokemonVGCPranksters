import React, { useEffect, useState } from 'react';
import { publicDataUrl } from '../data/sources';
import { normalizeDataValues } from '../utils/dataNormalization';
import { formatNumber, formatPascalCase, formatPercent, formatScopeLabel, recordLabel } from '../utils/format';
import { NameWithSprite } from './NameWithSprite';

function playerDetailsFile(playerId) {
  return `prankster-elo/players/${encodeURIComponent(playerId)}.json`;
}

export function PlayerStandingsBreakdown({ player, scope }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);
  const [expandedStandings, setExpandedStandings] = useState(() => new Set());

  useEffect(() => {
    let ignored = false;

    setDetails(null);
    setError(null);
    setExpandedStandings(new Set());

    const detailsFile = playerDetailsFile(player.id);

    fetch(publicDataUrl(detailsFile))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${detailsFile}`);
        }

        return response.json();
      })
      .then((json) => {
        if (!ignored) {
          setDetails(normalizeDataValues(json));
        }
      })
      .catch((fetchError) => {
        if (!ignored) {
          setError(fetchError);
        }
      });

    return () => {
      ignored = true;
    };
  }, [player.id]);

  if (error) {
    return <p className="detail-state">Could not load standings for {formatPascalCase(player.name)}.</p>;
  }

  if (!details) {
    return <p className="detail-state">Loading standings for {formatPascalCase(player.name)}...</p>;
  }

  const standings = (details.standings ?? []).filter((standing) => {
    if (scope.type === 'full') {
      return true;
    }

    return standing.date.slice(0, 7) === scope.id;
  });

  if (standings.length === 0) {
    return (
      <p className="detail-state">
        No standings for {formatPascalCase(player.name)} in {formatScopeLabel(scope)}.
      </p>
    );
  }

  const toggleStanding = (standingId) => {
    setExpandedStandings((current) => {
      const next = new Set(current);

      if (next.has(standingId)) {
        next.delete(standingId);
      } else {
        next.add(standingId);
      }

      return next;
    });
  };

  return (
    <div className="player-breakdown">
      {standings.map((standing) => {
        const standingKey = `${standing.tournamentId}-${standing.placing ?? 'drop'}`;
        const isExpanded = expandedStandings.has(standingKey);

        return (
          <article className="standing-detail" data-expanded={isExpanded ? 'true' : 'false'} key={standingKey}>
            <div className="standing-detail__header">
              <span className="standing-placement">{standing.placing ? `#${standing.placing}` : 'Drop'}</span>
              <span>
                <strong>{formatPascalCase(standing.tournamentName)}</strong>
                <small>
                  {formatScopeLabel({ id: standing.date.slice(0, 7) })} - {formatNumber(standing.tournamentSize)} players
                </small>
              </span>
              <button className="standing-detail__toggle" onClick={() => toggleStanding(standingKey)} type="button">
                {isExpanded ? 'Hide sets' : 'Show sets'}
              </button>
            </div>
            <div className="standing-detail__record">
              <strong>{formatPercent(standing.record?.winRate)}</strong>
              <small>{recordLabel(standing.record)}</small>
            </div>
            <div className="team-grid standing-detail__team">
              {(standing.team ?? []).map((pokemon) => (
                <article className="team-card" key={`${standing.tournamentId}-${pokemon.id}-${pokemon.item}-${pokemon.ability}`}>
                  <NameWithSprite kind="pokemon" id={pokemon.id} name={pokemon.name}>
                    <strong>{formatPascalCase(pokemon.name)}</strong>
                  </NameWithSprite>
                  <small>
                    <NameWithSprite kind="items" name={pokemon.item} fallback="No Item">
                      {formatPascalCase(pokemon.item, 'No Item')}
                    </NameWithSprite>{' '}
                    - {formatPascalCase(pokemon.ability, 'No Ability')}
                  </small>
                  <div className="team-card__moves">
                    {(pokemon.attacks ?? []).map((attack) => (
                      <NameWithSprite key={attack} kind="moves" name={attack}>
                        {formatPascalCase(attack)}
                      </NameWithSprite>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
