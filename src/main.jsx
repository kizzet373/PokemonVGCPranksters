import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDown,
  ArrowUpDown,
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  X,
} from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import statsIndex from './data/usage-stats/index.json';
import tournamentsData from './data/regulation-m-a-tournaments.json';
import './styles.css';

const statModules = {
  ...import.meta.glob('./data/usage-stats/pokemon/*.json'),
  ...import.meta.glob('./data/usage-stats/items/*.json'),
  ...import.meta.glob('./data/usage-stats/moves/*.json'),
};
const standingsAssetUrls = import.meta.glob('./data/standings/*.json', { query: '?url', import: 'default', eager: true });
const publicDataUrl = (pathname) => `${import.meta.env.BASE_URL}data/${pathname}`.replace(/\/{2,}/g, '/');

const defaultScopeId =
  statsIndex.scopes
    .filter((scope) => scope.type === 'month')
    .map((scope) => scope.id)
    .sort()
    .at(-1) ?? 'full';

const categoryConfig = {
  pokemon: {
    label: 'Pokemon',
    icon: Sparkles,
    dataKey: 'pokemon',
    empty: 'No Pokemon found',
  },
  items: {
    label: 'Items',
    icon: Shield,
    dataKey: 'items',
    empty: 'No items found',
  },
  moves: {
    label: 'Attacks',
    icon: Swords,
    dataKey: 'moves',
    empty: 'No attacks found',
  },
  players: {
    label: 'Prankster ELO',
    icon: Trophy,
    dataKey: 'players',
    empty: 'No players found',
  },
  tournaments: {
    label: 'Tournaments',
    icon: CalendarDays,
    dataKey: 'tournaments',
    empty: 'No tournaments found',
  },
};

const DESKTOP_TABLE_ROW_HEIGHT = 83;
const MOBILE_CARD_HEIGHT = 238;

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

function formatPercent(value) {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  return `${value.toFixed(1)}%`;
}

function formatScopeLabel(scope) {
  if (scope.id === 'full') {
    return 'Full';
  }

  const [year, month] = scope.id.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function recordLabel(record) {
  const wins = formatNumber(record?.wins);
  const losses = formatNumber(record?.losses);
  const ties = record?.ties ? ` - ${formatNumber(record.ties)}D` : '';

  return `${wins}W - ${losses}L${ties}`;
}

function playerDetailsFile(playerId) {
  return `prankster-elo/players/${encodeURIComponent(playerId)}.json`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function UsageBar({ value }) {
  return (
    <span className="usage-meter" aria-label={`${formatPercent(value)} usage`}>
      <span style={{ width: `${Math.min(value ?? 0, 100)}%` }} />
    </span>
  );
}

function Metric({ label, value, tone = 'neutral' }) {
  return (
    <article className={`metric metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function PokemonCell({ row }) {
  const pokemon = row.original;

  return (
    <div className="identity-cell">
      <span className="rank">{row.index + 1}</span>
      <span>
        <strong>{pokemon.name}</strong>
        <small>{pokemon.id} - click for sets</small>
      </span>
    </div>
  );
}

function NameCell({ row }) {
  return (
    <div className="identity-cell">
      <span className="rank">{row.index + 1}</span>
      <strong>{row.original.name}</strong>
    </div>
  );
}

function PlayerCell({ row }) {
  const player = row.original;

  return (
    <div className="identity-cell">
      <span className="rank">{player.rank}</span>
      <span>
        <strong>{player.name}</strong>
        <small>{player.country ?? 'Global'} - click for standings</small>
      </span>
    </div>
  );
}

function TournamentCell({ row }) {
  const tournament = row.original;

  return (
    <div className="identity-cell">
      <span className="rank">{row.index + 1}</span>
      <span>
        <strong>{tournament.name}</strong>
        <small>{tournament.id} - click for standings</small>
      </span>
    </div>
  );
}

function EloCell({ getValue }) {
  return <strong className="elo-value">{formatNumber(getValue())}</strong>;
}

function UsageCell({ category, getValue, row }) {
  const value = getValue();
  const countLabel = category === 'moves' ? 'Pokemon' : 'Teams';

  return (
    <div className="usage-cell">
      <span className="usage-value">
        <span>{formatPercent(value)}</span>
        <small>{formatNumber(row.original.count)} {countLabel}</small>
      </span>
      <UsageBar value={value} />
    </div>
  );
}

function WinRateCell({ row }) {
  const { record } = row.original;

  return (
    <div className="stacked-cell">
      <strong>{formatPercent(record?.winRate)}</strong>
      <small>{recordLabel(record)}</small>
    </div>
  );
}

function TopSetsCell({ row }) {
  const set = row.original.topSets?.[0];

  if (!set) {
    return <span className="muted">No public set</span>;
  }

  return (
    <div className="set-list">
      <span className="set-pill">
        <strong>{set.item ?? 'No item'}</strong>
        <small>{set.ability ?? 'No ability'} - {formatPercent(set.pokemonUsagePercent)}</small>
      </span>
    </div>
  );
}

function PokemonSetBreakdown({ pokemon }) {
  return (
    <div className="pokemon-breakdown">
      {(pokemon.topSets ?? []).map((set) => (
        <article className="set-detail" key={`${set.rank}-${set.item}-${set.ability}-${set.attacks.join('-')}`}>
          <div className="set-detail__header">
            <span className="rank">#{set.rank}</span>
            <span>
              <strong>{set.item ?? 'No item'}</strong>
              <small>{set.ability ?? 'No ability'}</small>
            </span>
          </div>
          <div className="set-detail__moves">
            {set.attacks.map((attack) => (
              <span key={attack}>{attack}</span>
            ))}
          </div>
          <div className="set-detail__stats">
            <span>
              <strong>{formatPercent(set.pokemonUsagePercent)}</strong>
              <small>Usage</small>
            </span>
            <span>
              <strong>{formatPercent(set.record?.winRate)}</strong>
              <small>Winrate</small>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function PlayerStandingsBreakdown({ player, scope }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignored = false;

    setDetails(null);
    setError(null);

    const detailsFile = playerDetailsFile(player.id);

    fetch(publicDataUrl(detailsFile))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${detailsFile}`);
        }

        return response.json();
      })
      .then((json) => {
        if (!ignored) {
          setDetails(json);
        }
      })
      .catch((fetchError) => {
        if (!ignored) {
          setError(fetchError);
        }
      });

    return () => {
      ignored = true;
    };
  }, [player.id]);

  if (error) {
    return <p className="detail-state">Could not load standings for {player.name}.</p>;
  }

  if (!details) {
    return <p className="detail-state">Loading standings for {player.name}...</p>;
  }

  const standings = (details.standings ?? []).filter((standing) => {
    if (scope.type === 'full') {
      return true;
    }

    return standing.date.slice(0, 7) === scope.id;
  });

  if (standings.length === 0) {
    return <p className="detail-state">No standings for {player.name} in {formatScopeLabel(scope)}.</p>;
  }

  return (
    <div className="player-breakdown">
      {standings.map((standing) => (
        <article className="standing-detail" key={`${standing.tournamentId}-${standing.placing ?? 'drop'}`}>
          <div className="standing-detail__header">
            <span>
              <strong>{standing.tournamentName}</strong>
              <small>
                {formatScopeLabel({ id: standing.date.slice(0, 7) })} - {formatNumber(standing.tournamentSize)} players
              </small>
            </span>
            <span className="standing-placement">{standing.placing ? `#${standing.placing}` : 'Drop'}</span>
          </div>
          <div className="standing-detail__record">
            <strong>{formatPercent(standing.record?.winRate)}</strong>
            <small>{recordLabel(standing.record)}</small>
          </div>
          <div className="team-grid">
            {(standing.team ?? []).map((pokemon) => (
              <article className="team-card" key={`${standing.tournamentId}-${pokemon.id}-${pokemon.item}-${pokemon.ability}`}>
                <strong>{pokemon.name}</strong>
                <small>{pokemon.item ?? 'No item'} - {pokemon.ability ?? 'No ability'}</small>
                <div className="team-card__moves">
                  {(pokemon.attacks ?? []).map((attack) => (
                    <span key={attack}>{attack}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}


function PokemonSetsModal({ pokemon, scope, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!pokemon) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-label={`${pokemon.name} sets`}
        aria-modal="true"
        className="player-modal pokemon-sets-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="player-modal__header">
          <div>
            <small>{formatScopeLabel(scope)} set breakdown</small>
            <h2>{pokemon.name}</h2>
          </div>
          <button aria-label="Close pokemon sets" className="icon-button" onClick={onClose} type="button">
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <div className="player-modal__stats">
          <span>
            <strong>{formatPercent(pokemon.usagePercent)}</strong>
            <small>Usage</small>
          </span>
          <span>
            <strong>{formatPercent(pokemon.record?.winRate)}</strong>
            <small>Winrate</small>
          </span>
          <span>
            <strong>{formatNumber(pokemon.count)}</strong>
            <small>Teams</small>
          </span>
          <span>
            <strong>{formatNumber(pokemon.topSets?.length ?? 0)}</strong>
            <small>Public sets</small>
          </span>
        </div>
        <PokemonSetBreakdown pokemon={pokemon} />
      </section>
    </div>
  );
}

function PlayerProfileModal({ player, scope, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!player) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-label={`${player.name} profile`}
        aria-modal="true"
        className="player-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="player-modal__header">
          <div>
            <small>{formatScopeLabel(scope)} profile</small>
            <h2>{player.name}</h2>
          </div>
          <button aria-label="Close player profile" className="icon-button" onClick={onClose} type="button">
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <div className="player-modal__stats">
          <span>
            <strong>{formatNumber(player.pranksterElo)}</strong>
            <small>Prankster ELO</small>
          </span>
          <span>
            <strong>{formatPercent(player.record?.winRate)}</strong>
            <small>Winrate</small>
          </span>
          <span>
            <strong>{formatNumber(player.tournaments)}</strong>
            <small>Tournaments</small>
          </span>
          <span>
            <strong>{formatNumber(player.averageSize)}</strong>
            <small>Average size</small>
          </span>
        </div>
        <PlayerStandingsBreakdown player={player} scope={scope} />
      </section>
    </div>
  );
}

function TournamentStandingsModal({ tournament, onClose }) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!tournament) {
      return undefined;
    }

    let ignored = false;
    const controller = new AbortController();

    setDetails(null);
    setError(null);

    const moduleKey = `./data/standings/${tournament.id}.json`;
    const standingsUrl = standingsAssetUrls[moduleKey];

    if (!standingsUrl) {
      setError(new Error(`Missing standings for ${tournament.id}`));
      return () => {
        ignored = true;
        controller.abort();
      };
    }

    fetch(standingsUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load standings for ${tournament.name}`);
        }

        return response.json();
      })
      .then((json) => {
        if (!ignored) {
          setDetails(json);
        }
      })
      .catch((fetchError) => {
        if (!ignored && fetchError.name !== 'AbortError') {
          setError(fetchError);
        }
      });

    return () => {
      ignored = true;
      controller.abort();
    };
  }, [tournament]);

  const standings = details?.standings ?? [];
  const standingsVirtualizer = useVirtualizer({
    count: standings.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 86,
    measureElement: (element) => element.offsetHeight,
    overscan: 10,
  });
  const virtualStandings = standingsVirtualizer.getVirtualItems();

  useEffect(() => {
    standingsVirtualizer.measure();
  }, [standings.length, standingsVirtualizer]);

  if (!tournament) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-label={`${tournament.name} standings`}
        aria-modal="true"
        className="player-modal tournament-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="player-modal__header">
          <div>
            <small>{formatDate(tournament.date)} - {formatNumber(tournament.players)} players</small>
            <h2>{tournament.name}</h2>
          </div>
          <button aria-label="Close tournament standings" className="icon-button" onClick={onClose} type="button">
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        <div className="player-modal__stats">
          <span>
            <strong>{formatNumber(tournament.players)}</strong>
            <small>Players</small>
          </span>
          <span>
            <strong>{details ? formatNumber(details.standingsCount ?? standings.length) : '...'}</strong>
            <small>Standings</small>
          </span>
          <span>
            <strong>{tournament.format}</strong>
            <small>Format</small>
          </span>
          <span>
            <strong>{tournament.game}</strong>
            <small>Game</small>
          </span>
        </div>
        {error ? <p className="detail-state">Could not load standings for {tournament.name}.</p> : null}
        {!error && !details ? <p className="detail-state">Loading standings for {tournament.name}...</p> : null}
        {details ? (
          <div className="tournament-standings" ref={scrollRef}>
            <div className="tournament-standings__spacer" style={{ height: `${standingsVirtualizer.getTotalSize()}px` }}>
              {virtualStandings.map((virtualRow) => {
                const standing = standings[virtualRow.index];

                return (
                  <article
                    className="tournament-standing"
                    data-index={virtualRow.index}
                    key={`${standing.player ?? standing.name}-${virtualRow.index}`}
                    ref={standingsVirtualizer.measureElement}
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <span className="standing-placement">{standing.placing ? `#${standing.placing}` : standing.drop ? `Drop ${standing.drop}` : '-'}</span>
                    <span className="tournament-standing__player">
                      <strong>{standing.name}</strong>
                      <small>{standing.country ?? 'Global'}</small>
                    </span>
                    <span className="standing-detail__record">
                      <strong>{recordLabel(standing.record)}</strong>
                      <small>Record</small>
                    </span>
                    <span className="tournament-standing__team">
                      {(standing.team ?? []).map((pokemon) => (
                        <span key={`${standing.player}-${pokemon.id}-${pokemon.item}`}>{pokemon.name}</span>
                      ))}
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function buildColumns(category) {
  if (category === 'tournaments') {
    return [
      {
        accessorKey: 'name',
        header: 'Tournament',
        cell: TournamentCell,
        filterFn: 'includesString',
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ getValue }) => <strong>{formatDate(getValue())}</strong>,
      },
      {
        accessorKey: 'players',
        header: 'Players',
        cell: ({ getValue }) => <strong>{formatNumber(getValue())}</strong>,
      },
      {
        accessorKey: 'format',
        header: 'Format',
        cell: ({ getValue }) => <strong>{getValue()}</strong>,
      },
    ];
  }

  if (category === 'pokemon') {
    return [
      {
        accessorKey: 'name',
        header: 'Pokemon',
        cell: PokemonCell,
        filterFn: 'includesString',
      },
      {
        accessorKey: 'usagePercent',
        header: 'Usage',
        cell: (context) => <UsageCell {...context} category={category} />,
      },
      {
        id: 'winRate',
        accessorFn: (row) => row.record?.winRate ?? 0,
        header: 'Winrate',
        cell: WinRateCell,
      },
      {
        id: 'topSets',
        header: 'Top sets',
        enableSorting: false,
        cell: TopSetsCell,
      },
    ];
  }

  if (category === 'players') {
    return [
      {
        accessorKey: 'name',
        header: 'Player',
        cell: PlayerCell,
        filterFn: 'includesString',
      },
      {
        accessorKey: 'pranksterElo',
        header: 'Prankster ELO',
        cell: EloCell,
      },
      {
        id: 'winRate',
        accessorFn: (row) => row.record?.winRate ?? 0,
        header: 'Winrate',
        cell: WinRateCell,
      },
      {
        accessorKey: 'tournaments',
        header: 'Tournaments',
        cell: ({ getValue }) => <strong>{formatNumber(getValue())}</strong>,
      },
      {
        accessorKey: 'averageSize',
        header: 'Average size',
        cell: ({ getValue }) => <strong>{formatNumber(getValue())}</strong>,
      },
    ];
  }

  return [
    {
      accessorKey: 'name',
      header: category === 'moves' ? 'Attack' : 'Item',
      cell: NameCell,
      filterFn: 'includesString',
    },
    {
      accessorKey: 'usagePercent',
      header: 'Usage',
      cell: (context) => <UsageCell {...context} category={category} />,
    },
    {
      accessorKey: 'count',
      header: category === 'moves' ? 'Pokemon' : 'Records',
      cell: ({ getValue }) => <strong>{formatNumber(getValue())}</strong>,
    },
    {
      id: 'winRate',
      accessorFn: (row) => row.record?.winRate ?? 0,
      header: 'Winrate',
      cell: WinRateCell,
    },
  ];
}

function DataTable({ category, data, scope, search, setSearch }) {
  const columns = useMemo(() => buildColumns(category), [category]);
  const isPlayerTable = category === 'players';
  const isTournamentTable = category === 'tournaments';
  const isExpandable = category === 'pokemon';
  const hasActionColumn = isExpandable || isPlayerTable || isTournamentTable;
  const defaultMinimum = isPlayerTable ? 2 : isTournamentTable ? 0 : 10;
  const tableScrollRef = useRef(null);
  const mobileScrollRef = useRef(null);
  const [sorting, setSorting] = useState([{ id: category === 'tournaments' ? 'date' : 'usagePercent', desc: true }]);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const filteredData = useMemo(
    () => data.filter((row) => (row.count ?? row.tournaments ?? row.players ?? 0) >= defaultMinimum),
    [data, defaultMinimum],
  );

  useEffect(() => {
    setSorting([{ id: isPlayerTable ? 'pranksterElo' : isTournamentTable ? 'date' : 'usagePercent', desc: true }]);
    setSelectedPokemon(null);
  }, [category, isPlayerTable, isTournamentTable]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter: search,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  });

  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      return DESKTOP_TABLE_ROW_HEIGHT;
    },
    measureElement: (element) => element.offsetHeight,
    overscan: 8,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const mobileVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => mobileScrollRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      return MOBILE_CARD_HEIGHT;
    },
    measureElement: (element) => element.offsetHeight,
    overscan: 5,
  });
  const mobileVirtualRows = mobileVirtualizer.getVirtualItems();
  const desktopGridTemplate = useMemo(
    () => `minmax(180px, 1.3fr) repeat(${columns.length - 1}, minmax(132px, 1fr))${hasActionColumn ? ' 48px' : ''}`,
    [columns.length, hasActionColumn],
  );

  useEffect(() => {
    setSelectedPokemon(null);
    setSelectedPlayer(null);
    setSelectedTournament(null);
  }, [category, data]);

  useEffect(() => {
    virtualizer.measure();
    mobileVirtualizer.measure();
  }, [selectedPokemon, mobileVirtualizer, rows.length, virtualizer]);

  return (
    <section className="table-panel">
      <div className="table-toolbar">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${categoryConfig[category].label.toLowerCase()}`}
            type="search"
          />
        </label>
        <span className="row-count">{formatNumber(rows.length)} rows</span>
      </div>

      <div className="desktop-table" ref={tableScrollRef}>
        <div className="data-grid" role="table" style={{ '--table-grid-template': desktopGridTemplate }}>
          <div className="data-grid__head" role="rowgroup">
            {table.getHeaderGroups().map((headerGroup) => (
              <div className="data-grid__row data-grid__header-row" key={headerGroup.id} role="row">
                {headerGroup.headers.map((header) => (
                  <div className="data-grid__header" key={header.id} role="columnheader">
                    <button
                      className="column-button"
                      disabled={!header.column.getCanSort()}
                      onClick={header.column.getToggleSortingHandler()}
                      type="button"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ArrowDown className="sort-icon sort-icon--asc" size={15} aria-hidden="true" />
                      ) : (
                        <ArrowUpDown size={15} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                ))}
                {hasActionColumn ? <div className="data-grid__header expand-heading" aria-label="Details" role="columnheader" /> : null}
              </div>
            ))}
          </div>
          <div className="data-grid__body" role="rowgroup" style={{ height: `${virtualizer.getTotalSize()}px` }}>
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  className="data-grid__item"
                  data-index={virtualRow.index}
                  key={row.id}
                  ref={virtualizer.measureElement}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div
                    className="data-grid__row data-row"
                    role="row"
                    onClick={() => {
                    if (isPlayerTable) {
                      setSelectedPlayer(row.original);
                    } else if (isTournamentTable) {
                      setSelectedTournament(row.original);
                    } else if (isExpandable) {
                      setSelectedPokemon(row.original);
                    }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div className="data-grid__cell" key={cell.id} role="cell">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                    {hasActionColumn ? (
                      <div className="data-grid__cell expand-cell" aria-label={isPlayerTable ? 'Open player profile' : isTournamentTable ? 'Open tournament standings' : 'Open sets'} role="cell">
                        <ChevronRight size={18} aria-hidden="true" />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mobile-list" ref={mobileScrollRef}>
        <div className="mobile-list__spacer" style={{ height: `${mobileVirtualizer.getTotalSize()}px` }}>
          {mobileVirtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <article
                className="mobile-card"
                data-index={virtualRow.index}
                key={row.id}
                ref={mobileVirtualizer.measureElement}
                onClick={() => {
                  if (isPlayerTable) {
                    setSelectedPlayer(row.original);
                  } else if (isTournamentTable) {
                    setSelectedTournament(row.original);
                  } else if (isExpandable) {
                    setSelectedPokemon(row.original);
                  }
                }}
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <div className="mobile-card__fields">
                  {row.getVisibleCells().map((cell) => (
                    <div className={`mobile-field mobile-field--${cell.column.id}`} key={cell.id}>
                      <span>{String(cell.column.columnDef.header)}</span>
                      <div>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? <p className="empty-state">{categoryConfig[category].empty}</p> : null}
      <PlayerProfileModal player={selectedPlayer} scope={scope} onClose={() => setSelectedPlayer(null)} />
      <PokemonSetsModal pokemon={selectedPokemon} scope={scope} onClose={() => setSelectedPokemon(null)} />
      {selectedTournament ? <TournamentStandingsModal tournament={selectedTournament} onClose={() => setSelectedTournament(null)} /> : null}
    </section>
  );
}

function App() {
  const [category, setCategory] = useState('pokemon');
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
      const moduleKey = `./data/${file}`;

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
  const metrics = isTournamentView
    ? [
        { label: 'Tournaments', value: stats ? formatNumber(rows.length) : '...', tone: 'green' },
        { label: 'Players', value: stats ? formatNumber(rows.reduce((total, tournament) => total + (tournament.players ?? 0), 0)) : '...', tone: 'blue' },
        { label: 'Average size', value: stats && rows.length ? formatNumber(Math.round(rows.reduce((total, tournament) => total + (tournament.players ?? 0), 0) / rows.length)) : '...', tone: 'gold' },
        { label: 'Format', value: tournamentsData.format, tone: 'rose' },
      ]
    : isPlayerView
    ? [
        { label: 'Tournaments', value: activeScope ? formatNumber(activeScope.totals.tournaments) : '...', tone: 'green' },
        { label: 'Ranked players', value: activeScope ? formatNumber(activeScope.totals.players) : '...', tone: 'blue' },
        { label: 'Average size', value: activeScope ? formatNumber(activeScope.totals.averageTournamentSize) : '...', tone: 'gold' },
        { label: 'Total games', value: activeScope ? formatNumber(activeScope.totals.totalGamesPlayed) : '...', tone: 'rose' },
      ]
    : [
        { label: 'Tournaments', value: formatNumber(displayScope.totals.tournaments), tone: 'green' },
        { label: 'Public teams', value: formatNumber(displayScope.totals.recordsWithTeams), tone: 'blue' },
        { label: 'Pokemon sets', value: formatNumber(displayScope.totals.pokemonSets), tone: 'gold' },
        { label: `Total ${activeCategory.label}`, value: stats ? formatNumber(rows.length) : '...', tone: 'rose' },
      ];

  return (
    <main className="app-shell">
      <aside className="side-rail" aria-label="Data category">
        <a className="brand" href="#">
          <span className="brand-mark">
            <Sparkles size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>VGC Pranksters</strong>
            <small>Metagame lab</small>
          </span>
        </a>

        <nav className="category-nav">
          {Object.entries(categoryConfig).map(([id, config]) => {
            const NavIcon = config.icon;

            return (
              <button
                aria-label={config.label}
                className={id === category ? 'nav-button nav-button--active' : 'nav-button'}
                key={id}
                onClick={() => setCategory(id)}
                type="button"
              >
                <NavIcon size={18} aria-hidden="true" />
                <span>{config.label}</span>
              </button>
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
            <p>{displayScope.label}</p>
            <h1>
              <Icon size={34} aria-hidden="true" />
              {activeCategory.label}
            </h1>
          </div>

          <label className="scope-select">
            <span>Timeframe</span>
            <select value={scopeId} onChange={(event) => setScopeId(event.target.value)}>
              {(isPlayerView && eloIndex ? eloIndex.scopes : statsIndex.scopes).map((scope) => (
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

createRoot(document.getElementById('root')).render(<App />);
