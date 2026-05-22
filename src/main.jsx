import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  CalendarDays,
  ChevronRight,
  Gamepad2,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import './styles.css';

const topNavItems = ['Tournaments', 'Pokemon', 'Mini-Games'];

const sideNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Team Builder', icon: Swords },
  { label: 'Players', icon: Users },
  { label: 'Results', icon: Trophy },
  { label: 'Schedule', icon: CalendarDays },
];

const tournamentCards = [
  { label: 'Spring Regional', value: 'May 30', tone: 'green' },
  { label: 'Practice Ladder', value: '14-6', tone: 'blue' },
  { label: 'Draft Queue', value: '8 teams', tone: 'gold' },
];

function App() {
  return (
    <main className="app-shell">
      <aside className="side-nav" aria-label="Workspace navigation">
        <a className="brand" href="#">
          <span className="brand-mark">
            <Sparkles size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>VGC Pranksters</strong>
            <small>Battle lab</small>
          </span>
        </a>

        <nav className="side-nav__links">
          {sideNavItems.map(({ label, icon: Icon, active }) => (
            <a className={active ? 'side-link side-link--active' : 'side-link'} href="#" key={label}>
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="side-nav__status">
          <ShieldCheck size={20} aria-hidden="true" />
          <span>
            <strong>Open Team Sheets</strong>
            <small>Ready for prep</small>
          </span>
        </div>
      </aside>

      <section className="workspace">
        <header className="top-nav">
          <nav className="top-nav__links" aria-label="Primary navigation">
            {topNavItems.map((item) => (
              <a className={item === 'Tournaments' ? 'top-link top-link--active' : 'top-link'} href="#" key={item}>
                {item}
              </a>
            ))}
          </nav>
          <button className="icon-button" type="button" aria-label="Open current tournament">
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </header>

        <section className="content-band">
          <div className="section-heading">
            <p>Current workspace</p>
            <h1>Tournament command center</h1>
          </div>

          <div className="overview-grid" aria-label="Tournament overview">
            {tournamentCards.map((card) => (
              <article className={`metric-card metric-card--${card.tone}`} key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
          </div>

          <div className="feature-panel">
            <div>
              <Gamepad2 size={24} aria-hidden="true" />
              <h2>Prep smarter between rounds</h2>
            </div>
            <p>
              Track tournament plans, Pokemon notes, and mini-game ideas from one focused place as the app grows.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
