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

  useEffect(() => {
    let ignored = false;

    setDetails(null);
    setError(null);

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

  return (
    <div className="player-breakdown">
      {standings.map((standing) => (
        <article className="standing-detail" key={`${standing.tournamentId}-${standing.placing ?? 'drop'}`}>
          <div className="standing-detail__header">
            <span>
              <strong>{formatPascalCase(standing.tournamentName)}</strong>
              <small>
                {formatScopeLabel({ id: standing.date.slice(0, 7) })} - {formatNumber(standing.tournamentSize)} players
              </small>
            </span>
            <span className="standing-placement">{standing.placing ? `#${standing.placing}` : 'Drop'}</span>
          </div>
          <div className="standing-detail__record">
            <strong>{formatPercent(standing.record?.winRate)}</strong>
            <small>{recordLabel(standing.record)}</small>
          </div>
          <div className="team-grid">
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
                    <span key={attack}>
                      <NameWithSprite kind="moves" name={attack}>
                        {formatPascalCase(attack)}
                      </NameWithSprite>
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
