import React, { useEffect, useRef, useState } from 'react';
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

const minigamePaths = new Set(['/speed-check', '/type-check']);
const primaryNavItems = navEntries.filter((item) => !minigamePaths.has(item.path));
const minigameItems = navEntries.filter((item) => minigamePaths.has(item.path));

function NavIconGraphic({ item, size = 18 }) {
  const NavIcon = item.icon;

  return item.iconSrc ? (
    <img className="nav-button__icon" src={item.iconSrc} alt="" aria-hidden="true" />
  ) : (
    <NavIcon size={size} aria-hidden="true" />
  );
}

function NavItem({ item, role }) {
  return (
    <NavLink
      aria-label={item.label}
      className={({ isActive }) => (isActive ? 'nav-button nav-button--active' : 'nav-button')}
      key={item.path}
      role={role}
      to={item.path}
    >
      <NavIconGraphic item={item} />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function SideNav() {
  const [totalGames, setTotalGames] = useState(null);
  const [isMinigamesOpen, setIsMinigamesOpen] = useState(false);
  const minigamesMenuRef = useRef(null);
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

  useEffect(() => {
    if (!isMinigamesOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (minigamesMenuRef.current?.contains(event.target)) {
        return;
      }

      setIsMinigamesOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isMinigamesOpen]);

  return (
    <aside className="side-rail" aria-label="Data category">
      <NavLink className="brand" to="/pokemon">
        <span className="brand__mark" aria-hidden="true">VGC Pranksters</span>
        <span className="brand__text">
          <strong>VGC Pranksters</strong>
          <small>Metagame lab</small>
        </span>
      </NavLink>

      <nav className="category-nav">
        {primaryNavItems.map((item) => <NavItem item={item} key={item.path} />)}

        {minigameItems.length ? (
          <div className={`nav-menu ${isMinigamesOpen ? 'nav-menu--open' : ''}`} ref={minigamesMenuRef}>
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
              {minigameItems.map((item) => <NavItem item={item} key={item.path} role="menuitem" />)}
            </div>
          </div>
        ) : null}
      </nav>

      {minigameItems.length ? (
        <nav className="category-nav category-nav--bottom" aria-label="Minigames">
          {minigameItems.map((item) => <NavItem item={item} key={item.path} />)}
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
