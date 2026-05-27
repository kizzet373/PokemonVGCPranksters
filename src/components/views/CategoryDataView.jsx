import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, Boxes, ChevronDown } from 'lucide-react';
import { categoryConfig } from '../../config/categories';
import { defaultScopeId, publicDataUrl, statModules, statsIndex, tournamentsData } from '../../data/sources';
import { Metric } from '../common';
import { DataTable } from '../table';
import { formatNumber, formatPascalCase, formatScopeLabel, formatWholeNumber } from '../../utils/format';

function buildMetrics({ activeCategory, activeScope, displayScope, isPlayerView, isTournamentView, rows, stats }) {
  if (isTournamentView) {
    const playerTotal = rows.reduce((total, tournament) => total + (tournament.players ?? 0), 0);

    return [
      { label: 'Tournaments', value: stats ? formatNumber(rows.length) : '...', tone: 'green' },
      { label: 'Players', value: stats ? formatNumber(playerTotal) : '...', tone: 'blue' },
      { label: 'Average size', value: stats && rows.length ? formatWholeNumber(playerTotal / rows.length) : '...', tone: 'gold' },
      { label: 'Format', value: formatPascalCase(tournamentsData.format), tone: 'rose' },
    ];
  }

  if (isPlayerView) {
    return [
      { label: 'Tournaments', value: activeScope ? formatNumber(activeScope.totals.tournaments) : '...', tone: 'green' },
      { label: 'Ranked players', value: activeScope ? formatNumber(activeScope.totals.players) : '...', tone: 'blue' },
      {
        label: 'Average size',
        value: activeScope ? formatWholeNumber(activeScope.totals.averageTournamentSize) : '...',
        tone: 'gold',
      },
      { label: 'Total games', value: activeScope ? formatNumber(activeScope.totals.totalGamesPlayed) : '...', tone: 'rose' },
    ];
  }

  return [
    { label: 'Tournaments', value: formatNumber(displayScope.totals.tournaments), tone: 'green' },
    { label: 'Public teams', value: formatNumber(displayScope.totals.recordsWithTeams), tone: 'blue' },
    { label: 'Pokemon sets', value: formatNumber(displayScope.totals.pokemonSets), tone: 'gold' },
    { label: `Total ${activeCategory.label}`, value: stats ? formatNumber(rows.length) : '...', tone: 'rose' },
  ];
}

export function CategoryDataView({ category }) {
  const [scopeId, setScopeId] = useState(defaultScopeId);
  const [eloIndex, setEloIndex] = useState(null);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const isPlayerView = category === 'players';
  const isTournamentView = category === 'tournaments';
  const usageScope = statsIndex.scopes.find((scope) => scope.id === scopeId) ?? statsIndex.scopes[0];
  const eloScope = eloIndex?.scopes.find((scope) => scope.id === scopeId) ?? eloIndex?.scopes[0];
  const activeScope = isPlayerView ? eloScope : usageScope;
  const displayScope = activeScope ?? usageScope;
  const activeCategory = categoryConfig[category];

  useEffect(() => {
    let ignored = false;

    fetch(publicDataUrl('prankster-elo/index.json'))
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load Prankster ELO index');
        }

        return response.json();
      })
      .then((json) => {
        if (!ignored) {
          setEloIndex(json);
        }
      });

    return () => {
      ignored = true;
    };
  }, []);

  useEffect(() => {
    let ignored = false;

    if (!activeScope) {
      return () => {
        ignored = true;
      };
    }

    setStats(null);
    setSearch('');

    if (isTournamentView) {
      const tournaments = tournamentsData.tournaments.filter((tournament) => {
        if (activeScope.type === 'full') {
          return true;
        }

        return tournament.date.slice(0, 7) === activeScope.id;
      });

      setStats({ tournaments });
    } else if (isPlayerView) {
      fetch(publicDataUrl(activeScope.file))
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load ${activeScope.file}`);
          }

          return response.json();
        })
        .then((json) => {
          if (!ignored) {
            setStats(json);
          }
        });
    } else {
      const file = activeScope.files[category];
      const moduleKey = `./${file}`;

      statModules[moduleKey]().then((module) => {
        if (!ignored) {
          setStats(module.default);
        }
      });
    }

    return () => {
      ignored = true;
    };
  }, [activeScope, category, isPlayerView, isTournamentView]);

  const rows = stats?.[activeCategory.dataKey] ?? [];
  const Icon = activeCategory.icon;
  const metrics = useMemo(
    () => buildMetrics({ activeCategory, activeScope, displayScope, isPlayerView, isTournamentView, rows, stats }),
    [activeCategory, activeScope, displayScope, isPlayerView, isTournamentView, rows, stats],
  );
  const scopeOptions = isPlayerView && eloIndex ? eloIndex.scopes : statsIndex.scopes;

  return (
    <main className="app-shell">
      <aside className="side-rail" aria-label="Data category">
        <NavLink className="brand" to="/pokemon">
          <span>
            <strong>VGC Pranksters</strong>
            <small>Metagame lab</small>
          </span>
        </NavLink>

        <nav className="category-nav">
          {Object.entries(categoryConfig).map(([id, config]) => {
            const NavIcon = config.icon;

            return (
              <NavLink
                aria-label={config.label}
                className={({ isActive }) => (isActive ? 'nav-button nav-button--active' : 'nav-button')}
                key={id}
                to={`/${id}`}
              >
                <NavIcon size={18} aria-hidden="true" />
                <span>{config.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="rail-stat">
          <BarChart3 size={20} aria-hidden="true" />
          <span>
            <strong>{formatNumber(displayScope.totals.totalGamesPlayed)}</strong>
            <small>Total games played</small>
          </span>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p>{formatPascalCase(displayScope.label)}</p>
            <h1>
              <Icon size={34} aria-hidden="true" />
              {activeCategory.label}
            </h1>
          </div>

          <label className="scope-select">
            <span>Timeframe</span>
            <select value={scopeId} onChange={(event) => setScopeId(event.target.value)}>
              {scopeOptions.map((scope) => (
                <option key={scope.id} value={scope.id}>
                  {formatScopeLabel(scope)}
                </option>
              ))}
            </select>
            <ChevronDown size={17} aria-hidden="true" />
          </label>
        </header>

        <section className="metrics-grid" aria-label="Metagame totals">
          {metrics.map((metric) => (
            <Metric key={metric.label} {...metric} />
          ))}
        </section>

        {stats ? (
          <DataTable category={category} data={rows} scope={displayScope} search={search} setSearch={setSearch} />
        ) : (
          <section className="table-panel table-panel--loading">
            <Boxes size={24} aria-hidden="true" />
            <strong>Loading {activeCategory.label.toLowerCase()}</strong>
          </section>
        )}
      </section>
    </main>
  );
}
