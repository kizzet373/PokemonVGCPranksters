import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, Boxes, ChevronDown } from 'lucide-react';
import { Metric } from '.';
import { formatNumber, formatPascalCase, formatScopeLabel } from '../../utils/format';

export function CategoryDataView({ getMetrics, getRows, icon: Icon, label, loadScopeOptions, loadStats, navItems, renderTable }) {
  const [scopeId, setScopeId] = useState('');
  const [scopeOptions, setScopeOptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const activeScope = scopeOptions.find((scope) => scope.id === scopeId) ?? scopeOptions[0] ?? null;

  useEffect(() => {
    let ignored = false;

    loadScopeOptions().then(({ defaultScopeId, scopes }) => {
      if (!ignored) {
        setScopeOptions(scopes);
        setScopeId((currentScopeId) => {
          if (scopes.some((scope) => scope.id === currentScopeId)) {
            return currentScopeId;
          }

          return defaultScopeId ?? scopes[0]?.id ?? '';
        });
      }
    });

    return () => {
      ignored = true;
    };
  }, [loadScopeOptions]);

  useEffect(() => {
    let ignored = false;

    if (!activeScope) {
      setStats(null);
      return () => {
        ignored = true;
      };
    }

    setStats(null);
    setSearch('');

    loadStats(activeScope).then((nextStats) => {
      if (!ignored) {
        setStats(nextStats);
      }
    });

    return () => {
      ignored = true;
    };
  }, [activeScope, loadStats]);

  const rows = useMemo(() => getRows(stats), [getRows, stats]);
  const metrics = useMemo(
    () => (activeScope ? getMetrics({ activeScope, rows, stats }) : []),
    [activeScope, getMetrics, rows, stats],
  );

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
          {navItems.map((item) => {
            const NavIcon = item.icon;

            return (
              <NavLink
                aria-label={item.label}
                className={({ isActive }) => (isActive ? 'nav-button nav-button--active' : 'nav-button')}
                key={item.path}
                to={item.path}
              >
                <NavIcon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="rail-stat">
          <BarChart3 size={20} aria-hidden="true" />
          <span>
            <strong>{activeScope ? formatNumber(activeScope.totals.totalGamesPlayed) : '...'}</strong>
            <small>Total games played</small>
          </span>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p>{activeScope ? formatPascalCase(activeScope.label) : 'Loading'}</p>
            <h1>
              <Icon size={34} aria-hidden="true" />
              {label}
            </h1>
          </div>

          <label className="scope-select">
            <span>Timeframe</span>
            <select value={scopeId} onChange={(event) => setScopeId(event.target.value)} disabled={!scopeOptions.length}>
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
          renderTable({ rows, scope: activeScope, search, setSearch })
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
