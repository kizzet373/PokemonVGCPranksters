import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, ChevronDown } from 'lucide-react';
import { categoryConfig } from '../../config/categories';
import { formatNumber } from '../../utils/format';

const navEntries = Object.entries(categoryConfig).map(([path, config]) => ({
  icon: config.navIcon ?? config.icon,
  iconSrc: config.navIconSrc,
  label: config.label,
  path: `/${path}`,
}));

const speedCheckItem = navEntries.find((item) => item.path === '/speed-check');
const primaryNavItems = navEntries.filter((item) => item.path !== '/speed-check');
const minigameItems = speedCheckItem ? [speedCheckItem] : [];

export function SideNav() {
  const [totalGames, setTotalGames] = useState(null);
  const [isMinigamesOpen, setIsMinigamesOpen] = useState(false);
  const location = useLocation();
  const hasActiveMinigame = minigameItems.some((item) => item.path === location.pathname);

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

  useEffect(() => {
    setIsMinigamesOpen(false);
  }, [location.pathname]);

  return (
    <aside className="side-rail" aria-label="Data category">
      <NavLink className="brand" to="/pokemon">
        <span className="brand__mark" aria-hidden="true">VGC</span>
        <span className="brand__text">
          <strong>VGC Pranksters</strong>
          <small>Metagame lab</small>
        </span>
      </NavLink>

      <nav className="category-nav">
        {primaryNavItems.map((item) => {
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

        {minigameItems.length ? (
          <div className={`nav-menu ${isMinigamesOpen ? 'nav-menu--open' : ''}`}>
            <button
              aria-expanded={isMinigamesOpen}
              aria-haspopup="menu"
              aria-label="Minigames"
              className={`nav-button nav-button--menu ${hasActiveMinigame ? 'nav-button--active' : ''}`}
              onClick={() => setIsMinigamesOpen((open) => !open)}
              type="button"
            >
              <ChevronDown size={18} aria-hidden="true" />
              <span>Minigames</span>
            </button>
            <div className="nav-menu__panel" role="menu">
              {minigameItems.map((item) => {
                const NavIcon = item.icon;

                return (
                  <NavLink
                    aria-label={item.label}
                    className={({ isActive }) => (isActive ? 'nav-button nav-button--active' : 'nav-button')}
                    key={item.path}
                    role="menuitem"
                    to={item.path}
                  >
                    <NavIcon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ) : null}
      </nav>

      {speedCheckItem ? (
        <nav className="category-nav category-nav--bottom">
          <NavLink
            aria-label={speedCheckItem.label}
            className={({ isActive }) => (isActive ? 'nav-button nav-button--active' : 'nav-button')}
            to={speedCheckItem.path}
          >
            <speedCheckItem.icon size={18} aria-hidden="true" />
            <span>{speedCheckItem.label}</span>
          </NavLink>
        </nav>
      ) : null}

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
