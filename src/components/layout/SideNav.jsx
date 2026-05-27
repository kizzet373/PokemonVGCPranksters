import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { categoryConfig } from '../../config/categories';
import { formatNumber } from '../../utils/format';

const navItems = Object.entries(categoryConfig).map(([path, config]) => ({
  icon: config.navIcon ?? config.icon,
  iconSrc: config.navIconSrc,
  label: config.label,
  path: `/${path}`,
}));

export function SideNav() {
  const [totalGames, setTotalGames] = useState(null);

  useEffect(() => {
    let ignored = false;

    import('../../data/usageSources').then(({ defaultUsageScopeId, statsIndex }) => {
      const defaultScope = statsIndex.scopes.find((scope) => scope.id === defaultUsageScopeId) ?? statsIndex.scopes[0];

      if (!ignored) {
        setTotalGames(defaultScope?.totals.totalGamesPlayed ?? null);
      }
    });

    return () => {
      ignored = true;
    };
  }, []);

  return (
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
              {item.iconSrc ? (
                <img className="nav-button__icon" src={item.iconSrc} alt="" aria-hidden="true" />
              ) : (
                <NavIcon size={18} aria-hidden="true" />
              )}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="rail-stat">
        <BarChart3 size={20} aria-hidden="true" />
        <span>
          <strong>{totalGames === null ? '...' : formatNumber(totalGames)}</strong>
          <small>Total games played</small>
        </span>
      </div>
    </aside>
  );
}
