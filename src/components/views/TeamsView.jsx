import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, UsersRound } from 'lucide-react';
import { categoryConfig } from '../../config/categories';
import { defaultUsageScopeId, statModules, statsIndex } from '../../data/usageSources';
import { NameWithSprite } from '../common/NameWithSprite';
import { RankPill } from '../common/RankPill';
import { formatNumber, formatPascalCase, formatPercent, formatScopeLabel } from '../../utils/format';

const teamSizes = [2, 3, 4, 5, 6];
const teamSortOptions = [
  { id: 'rank', label: 'Rank', defaultDesc: false, value: (combo) => combo.rank ?? 0 },
  {
    id: 'composition',
    label: 'Composition',
    defaultDesc: false,
    value: (combo) => (combo.pokemon ?? []).map((pokemon) => pokemon.name ?? '').join(' '),
  },
  { id: 'usagePercent', label: 'Usage', defaultDesc: true, value: (combo) => combo.usagePercent ?? 0 },
  { id: 'winRate', label: 'Winrate', defaultDesc: true, value: (combo) => combo.record?.winRate ?? 0 },
  { id: 'count', label: 'Records', defaultDesc: true, value: (combo) => combo.count ?? 0 },
];

function formatTeamUsagePercent(value) {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  return `${Number(value).toFixed(2)}%`;
}

function compareSortValues(leftValue, rightValue) {
  if (typeof leftValue === 'string' || typeof rightValue === 'string') {
    return String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, { sensitivity: 'base' });
  }

  return Number(leftValue ?? 0) - Number(rightValue ?? 0);
}

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
      <strong>{formatTeamUsagePercent(combo.usagePercent)}</strong>
      <strong>{formatPercent(combo.record?.winRate)}</strong>
      <span>{formatNumber(combo.count)}</span>
    </article>
  );
}

export function TeamsView() {
  const [scopeId, setScopeId] = useState(defaultUsageScopeId);
  const [teamSize, setTeamSize] = useState(6);
  const [stats, setStats] = useState(null);
  const [sort, setSort] = useState({ id: 'rank', desc: false });
  const activeScope = statsIndex.scopes.find((scope) => scope.id === scopeId) ?? statsIndex.scopes[0];
  const combos = useMemo(
    () => stats?.teamSizes?.find((entry) => entry.size === teamSize)?.combos ?? [],
    [stats, teamSize],
  );
  const activeSortOption = teamSortOptions.find((option) => option.id === sort.id) ?? teamSortOptions[0];
  const sortedCombos = useMemo(
    () =>
      [...combos].sort((leftCombo, rightCombo) => {
        const direction = sort.desc ? -1 : 1;
        const primary = compareSortValues(activeSortOption.value(leftCombo), activeSortOption.value(rightCombo)) * direction;

        return primary || compareSortValues(leftCombo.rank, rightCombo.rank);
      }),
    [activeSortOption, combos, sort.desc],
  );
  const uniquePokemonCount = useMemo(
    () => new Set(combos.flatMap((combo) => (combo.pokemon ?? []).map((pokemon) => pokemon.id ?? pokemon.name))).size,
    [combos],
  );
  const updateSort = (sortId) => {
    const nextSortOption = teamSortOptions.find((option) => option.id === sortId) ?? teamSortOptions[0];

    setSort((currentSort) => ({
      id: sortId,
      desc: currentSort.id === sortId ? !currentSort.desc : nextSortOption.defaultDesc,
    }));
  };

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
      </header>

      <section className="metrics-grid" aria-label="Team composition totals">
        <article className="metric metric--green">
          <span>Tournaments</span>
          <strong>{formatNumber(activeScope?.totals?.tournaments)}</strong>
        </article>
        <article className="metric metric--blue">
          <span>Teams</span>
          <strong>{formatNumber(activeScope?.totals?.recordsWithTeams)}</strong>
        </article>
        <article className="metric metric--gold">
          <span>Team Compositions</span>
          <strong>{stats ? formatNumber(combos.length) : '...'}</strong>
        </article>
        <article className="metric metric--rose">
          <span>Unique Pokemon</span>
          <strong>{stats ? formatNumber(uniquePokemonCount) : '...'}</strong>
        </article>
      </section>

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
          <span>Pokemon #</span>
          <select value={teamSize} onChange={(event) => setTeamSize(Number(event.target.value))}>
            {teamSizes.map((size) => (
              <option value={size} key={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="teams-sort-controls" aria-label="Teams sort controls">
          <label className="teams-size-select teams-sort-select">
            <span>Sort</span>
            <select value={sort.id} onChange={(event) => setSort({ id: event.target.value, desc: sort.desc })}>
              {teamSortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="sort-direction-button"
            type="button"
            onClick={() => setSort((currentSort) => ({ ...currentSort, desc: !currentSort.desc }))}
            aria-label={`Sort teams ${sort.desc ? 'ascending' : 'descending'}`}
          >
            {sort.desc ? <ArrowDown size={17} aria-hidden="true" /> : <ArrowUp size={17} aria-hidden="true" />}
            <span>{sort.desc ? 'Desc' : 'Asc'}</span>
          </button>
        </div>
      </div>

      <section className="teams-table" aria-label={`Most common ${teamSize} Pokemon team compositions`}>
        <header className="teams-table__header">
          {teamSortOptions.map((option) => (
            <span aria-sort={sort.id === option.id ? (sort.desc ? 'descending' : 'ascending') : 'none'} key={option.id}>
              <button className="teams-table__sort-button" type="button" onClick={() => updateSort(option.id)}>
                {option.label}
                {sort.id === option.id ? (
                  sort.desc ? (
                    <ArrowDown size={15} aria-hidden="true" />
                  ) : (
                    <ArrowUp size={15} aria-hidden="true" />
                  )
                ) : (
                  <ArrowUpDown size={15} aria-hidden="true" />
                )}
              </button>
            </span>
          ))}
        </header>
        <div className="teams-table__body">
          {stats ? sortedCombos.map((combo) => <TeamRow combo={combo} key={`${teamSize}-${combo.rank}`} />) : (
            <p className="empty-state">Loading teams...</p>
          )}
          {stats && combos.length === 0 ? <p className="empty-state">No team compositions found</p> : null}
        </div>
      </section>
    </section>
  );
}
