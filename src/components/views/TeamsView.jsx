import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, UsersRound } from 'lucide-react';
import { categoryConfig } from '../../config/categories';
import { defaultUsageScopeId, statModules, statsIndex } from '../../data/usageSources';
import { NameWithSprite } from '../common/NameWithSprite';
import { RankPill } from '../common/RankPill';
import { formatNumber, formatPascalCase, formatPercent, formatScopeLabel } from '../../utils/format';

const teamSizes = [2, 3, 4, 5, 6];

async function loadTeamStats(scope) {
  const moduleKey = `./${scope.files.teams}`;
  const module = await statModules[moduleKey]();

  return module.default;
}

function TeamComposition({ pokemon }) {
  return (
    <div className="teams-composition">
      {pokemon.map((entry) => (
        <NameWithSprite kind="pokemon" id={entry.id} name={entry.name} key={entry.id}>
          <strong>{formatPascalCase(entry.name)}</strong>
        </NameWithSprite>
      ))}
    </div>
  );
}

function TeamRow({ combo }) {
  return (
    <article className="teams-table__row">
      <div className="teams-table__rank">
        <RankPill>{combo.rank}</RankPill>
      </div>
      <TeamComposition pokemon={combo.pokemon ?? []} />
      <strong>{formatPercent(combo.usagePercent)}</strong>
      <strong>{formatPercent(combo.record?.winRate)}</strong>
      <span>{formatNumber(combo.count)}</span>
    </article>
  );
}

export function TeamsView() {
  const [scopeId, setScopeId] = useState(defaultUsageScopeId);
  const [teamSize, setTeamSize] = useState(6);
  const [stats, setStats] = useState(null);
  const activeScope = statsIndex.scopes.find((scope) => scope.id === scopeId) ?? statsIndex.scopes[0];
  const combos = useMemo(
    () => stats?.teamSizes?.find((entry) => entry.size === teamSize)?.combos ?? [],
    [stats, teamSize],
  );

  useEffect(() => {
    let ignored = false;

    if (!activeScope?.files?.teams) {
      setStats(null);
      return () => {
        ignored = true;
      };
    }

    setStats(null);
    loadTeamStats(activeScope).then((nextStats) => {
      if (!ignored) {
        setStats(nextStats);
      }
    });

    return () => {
      ignored = true;
    };
  }, [activeScope]);

  return (
    <section className="workspace teams-workspace">
      <header className="workspace-header teams__head">
        <div>
          <h1>
            <UsersRound size={34} aria-hidden="true" />
            {categoryConfig.teams.label}
          </h1>
        </div>

        <div className="teams__controls">
          <label className="scope-select">
            <select aria-label="Timeframe" value={scopeId} onChange={(event) => setScopeId(event.target.value)}>
              {statsIndex.scopes.map((scope) => (
                <option key={scope.id} value={scope.id}>
                  {formatScopeLabel(scope)}
                </option>
              ))}
            </select>
            <ChevronDown size={17} aria-hidden="true" />
          </label>
          <label className="teams-size-select">
            <span>Pokemon</span>
            <select value={teamSize} onChange={(event) => setTeamSize(Number(event.target.value))}>
              {teamSizes.map((size) => (
                <option value={size} key={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="metrics-grid" aria-label="Team composition totals">
        <article className="metric metric--green">
          <span>Tournaments</span>
          <strong>{formatNumber(activeScope?.totals?.tournaments)}</strong>
        </article>
        <article className="metric metric--blue">
          <span>Public teams</span>
          <strong>{formatNumber(activeScope?.totals?.recordsWithTeams)}</strong>
        </article>
        <article className="metric metric--gold">
          <span>Team size</span>
          <strong>{teamSize}</strong>
        </article>
        <article className="metric metric--rose">
          <span>Combos</span>
          <strong>{stats ? formatNumber(combos.length) : '...'}</strong>
        </article>
      </section>

      <section className="teams-table" aria-label={`Most common ${teamSize} Pokemon team compositions`}>
        <header className="teams-table__header">
          <span>Rank</span>
          <span>Composition</span>
          <span>Usage</span>
          <span>Winrate</span>
          <span>Records</span>
        </header>
        <div className="teams-table__body">
          {stats ? combos.map((combo) => <TeamRow combo={combo} key={`${teamSize}-${combo.rank}`} />) : (
            <p className="empty-state">Loading teams...</p>
          )}
          {stats && combos.length === 0 ? <p className="empty-state">No team compositions found</p> : null}
        </div>
      </section>
    </section>
  );
}
