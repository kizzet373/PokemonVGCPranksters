import React, { useEffect, useMemo, useState } from 'react';
import { publicDataUrl } from '../../data/publicDataUrl';
import { useJsonResource } from '../../hooks/useJsonResource';
import { formatNumber, formatPascalCase, formatPercent, formatScopeLabel, recordLabel } from '../../utils/format';
import { DetailState, NameWithSprite, RankPill } from '../common';

function playerDetailsFile(playerId) {
  return `prankster-elo/players/${encodeURIComponent(playerId)}.json`;
}

function standingMatchesScope(standing, scope) {
  if (scope.type === 'full') {
    return true;
  }

  const month = scope.month ?? scope.id;

  if (standing.date.slice(0, 7) !== month) {
    return false;
  }

  return !scope.format || standing.format === scope.format;
}

export function PlayerStandingsBreakdown({ player, scope }) {
  const [expandedStandings, setExpandedStandings] = useState(() => new Set());
  const detailsUrl = useMemo(() => publicDataUrl(playerDetailsFile(player.id)), [player.id]);
  const { data: details, error } = useJsonResource(detailsUrl);

  useEffect(() => {
    setExpandedStandings(new Set());
  }, [player.id]);

  if (error) {
    return <DetailState>Could not load standings for {formatPascalCase(player.name)}.</DetailState>;
  }

  if (!details) {
    return <DetailState>Loading standings for {formatPascalCase(player.name)}...</DetailState>;
  }

  const standings = (details.standings ?? []).filter((standing) => standingMatchesScope(standing, scope));

  if (standings.length === 0) {
    return (
      <DetailState>
        No standings for {formatPascalCase(player.name)} in {formatScopeLabel(scope)}.
      </DetailState>
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
              <RankPill className="standing-placement">{standing.placing ? `#${standing.placing}` : 'Drop'}</RankPill>
              <span>
                <strong>{formatPascalCase(standing.tournamentName)}</strong>
                <small>
                  {formatScopeLabel({ id: standing.date.slice(0, 7), month: standing.date.slice(0, 7), format: standing.format })} - {formatNumber(standing.tournamentSize)} players
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
