import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, Boxes, ChevronDown } from 'lucide-react';
import { categoryConfig } from '../../config/categories';
import { defaultScopeId, publicDataUrl, statModules, statsIndex, tournamentsData } from '../../data/sources';
import { Metric } from '.';
import { DataTable } from '../table';
import { formatNumber, formatPascalCase, formatScopeLabel } from '../../utils/format';

export function CategoryDataView({ category, dataKey, dataSource, getMetrics, icon: Icon, label }) {
  const [scopeId, setScopeId] = useState(defaultScopeId);
  const [eloIndex, setEloIndex] = useState(null);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const usesPlayerScopes = dataSource === 'players';
  const usesTournamentData = dataSource === 'tournaments';
  const usageScope = statsIndex.scopes.find((scope) => scope.id === scopeId) ?? statsIndex.scopes[0];
  const eloScope = eloIndex?.scopes.find((scope) => scope.id === scopeId) ?? eloIndex?.scopes[0];
  const activeScope = usesPlayerScopes ? eloScope : usageScope;
  const displayScope = activeScope ?? usageScope;

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

    if (usesTournamentData) {
      const tournaments = tournamentsData.tournaments.filter((tournament) => {
        if (activeScope.type === 'full') {
          return true;
        }

        return tournament.date.slice(0, 7) === activeScope.id;
      });

      setStats({ tournaments });
    } else if (usesPlayerScopes) {
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
  }, [activeScope, category, usesPlayerScopes, usesTournamentData]);

  const rows = stats?.[dataKey] ?? [];
  const metrics = useMemo(
    () => getMetrics({ activeScope, displayScope, rows, stats, tournamentFormat: tournamentsData.format }),
    [activeScope, displayScope, getMetrics, rows, stats],
  );
  const scopeOptions = usesPlayerScopes && eloIndex ? eloIndex.scopes : statsIndex.scopes;

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
              {label}
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
            <strong>Loading {label.toLowerCase()}</strong>
          </section>
        )}
      </section>
    </main>
  );
}
