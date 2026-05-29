import React, { useEffect, useMemo, useState } from 'react';
import { Boxes, ChevronDown } from 'lucide-react';
import { Metric } from '.';
import { formatScopeLabel } from '../../utils/format';

export function CategoryDataView({ getMetrics, getRows, icon: Icon, label, loadScopeOptions, loadStats, renderTable }) {
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
    <section className="workspace">
      <header className="workspace-header">
        <div>
          <h1>
            <Icon size={34} aria-hidden="true" />
            {label}
          </h1>
        </div>

        <label className="scope-select">
          <select aria-label="Timeframe" value={scopeId} onChange={(event) => setScopeId(event.target.value)} disabled={!scopeOptions.length}>
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
  );
}
