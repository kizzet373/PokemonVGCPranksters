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

const toolPaths = new Set(['/damage-calc', '/speed-tiers']);
const minigamePaths = new Set(['/speed-check', '/type-check']);
const utilityPaths = new Set([...toolPaths, ...minigamePaths]);
const primaryNavItems = navEntries.filter((item) => !utilityPaths.has(item.path));
const toolItems = navEntries.filter((item) => toolPaths.has(item.path));
const minigameItems = navEntries.filter((item) => minigamePaths.has(item.path));
const utilitySections = [
  { items: toolItems, label: 'Tools' },
  { items: minigameItems, label: 'Mini Games' },
].filter((section) => section.items.length);

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

function NavSection({ items, label }) {
  if (!items.length) {
    return null;
  }

  return (
    <nav className="category-nav category-nav--section" aria-label={label}>
      <span className="category-nav__label">{label}</span>
      {items.map((item) => <NavItem item={item} key={item.path} />)}
    </nav>
  );
}

export function SideNav() {
  const [totalGames, setTotalGames] = useState(null);
  const [isUtilityMenuOpen, setIsUtilityMenuOpen] = useState(false);
  const utilityMenuRef = useRef(null);
  const location = useLocation();
  const hasActiveUtility = utilitySections.some((section) => section.items.some((item) => item.path === location.pathname));

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
    setIsUtilityMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isUtilityMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (utilityMenuRef.current?.contains(event.target)) {
        return;
      }

      setIsUtilityMenuOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isUtilityMenuOpen]);

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

        {utilitySections.length ? (
          <div className={`nav-menu ${isUtilityMenuOpen ? 'nav-menu--open' : ''}`} ref={utilityMenuRef}>
            <button
              aria-expanded={isUtilityMenuOpen}
              aria-haspopup="menu"
              aria-label="Tools and mini games"
              className={`nav-button nav-button--menu ${hasActiveUtility ? 'nav-button--active' : ''}`}
              onClick={() => setIsUtilityMenuOpen((open) => !open)}
              type="button"
            >
              <ChevronDown size={18} aria-hidden="true" />
              <span>More</span>
            </button>
            <div className="nav-menu__panel" role="menu">
              {utilitySections.map((section) => (
                <div className="nav-menu__group" key={section.label}>
                  <span className="nav-menu__label">{section.label}</span>
                  {section.items.map((item) => <NavItem item={item} key={item.path} role="menuitem" />)}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </nav>

      {utilitySections.length ? (
        <div className="side-nav-sections">
          <NavSection items={toolItems} label="Tools" />
          <NavSection items={minigameItems} label="Mini Games" />
        </div>
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
