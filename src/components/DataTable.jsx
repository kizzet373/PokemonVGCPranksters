import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUpDown, ChevronRight, Search } from 'lucide-react';
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { categoryConfig } from '../config/categories';
import { formatNumber, formatPascalCase } from '../utils/format';
import { buildColumns } from './columns';
import { MobileCardFields } from './MobileCards';
import { PlayerProfileModal, PokemonSetsModal, TournamentStandingsModal, UsageDetailModal } from './modals';
import { actionLabel, defaultSortForCategory, desktopGridTemplate, DESKTOP_TABLE_ROW_HEIGHT, MOBILE_CARD_HEIGHT } from './tableConfig';

export function DataTable({ category, data, scope, search, setSearch }) {
  const columns = useMemo(() => buildColumns(category), [category]);
  const isPlayerTable = category === 'players';
  const isTournamentTable = category === 'tournaments';
  const isPokemonTable = category === 'pokemon';
  const isUsageDetailTable = category === 'items' || category === 'moves';
  const hasActionColumn = isPokemonTable || isPlayerTable || isTournamentTable || isUsageDetailTable;
  const defaultMinimum = isPlayerTable ? 2 : isTournamentTable ? 0 : 10;
  const tableScrollRef = useRef(null);
  const mobileScrollRef = useRef(null);
  const [sorting, setSorting] = useState([{ id: defaultSortForCategory(category), desc: true }]);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedUsageEntry, setSelectedUsageEntry] = useState(null);
  const [formatFilter, setFormatFilter] = useState('all');
  const formatOptions = useMemo(() => {
    if (!isTournamentTable) {
      return [];
    }

    return [...new Set(data.map((row) => row.format).filter(Boolean))].sort((a, b) =>
      formatPascalCase(a).localeCompare(formatPascalCase(b)),
    );
  }, [data, isTournamentTable]);
  const filteredData = useMemo(
    () =>
      data.filter((row) => {
        const meetsMinimum = (row.count ?? row.tournaments ?? row.players ?? 0) >= defaultMinimum;
        const matchesFormat = !isTournamentTable || formatFilter === 'all' || row.format === formatFilter;

        return meetsMinimum && matchesFormat;
      }),
    [data, defaultMinimum, formatFilter, isTournamentTable],
  );

  useEffect(() => {
    setSorting([{ id: defaultSortForCategory(category), desc: true }]);
    setFormatFilter('all');
    setSelectedPokemon(null);
    setSelectedPlayer(null);
    setSelectedTournament(null);
    setSelectedUsageEntry(null);
  }, [category, data]);

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
    estimateSize: () => DESKTOP_TABLE_ROW_HEIGHT,
    measureElement: (element) => element.offsetHeight,
    overscan: 8,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const mobileVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => mobileScrollRef.current,
    estimateSize: () => MOBILE_CARD_HEIGHT,
    measureElement: (element) => element.offsetHeight,
    overscan: 5,
  });
  const mobileVirtualRows = mobileVirtualizer.getVirtualItems();
  const gridTemplate = useMemo(
    () => desktopGridTemplate({ columnCount: columns.length, hasActionColumn, isTournamentTable }),
    [columns.length, hasActionColumn, isTournamentTable],
  );

  useEffect(() => {
    virtualizer.measure();
    mobileVirtualizer.measure();
  }, [mobileVirtualizer, rows.length, virtualizer]);

  const openDetails = (row) => {
    if (isPlayerTable) {
      setSelectedPlayer(row.original);
    } else if (isTournamentTable) {
      setSelectedTournament(row.original);
    } else if (isPokemonTable) {
      setSelectedPokemon(row.original);
    } else if (isUsageDetailTable) {
      setSelectedUsageEntry(row.original);
    }
  };

  return (
    <section className={`table-panel table-panel--${category}`}>
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
        {isTournamentTable ? (
          <label className="table-filter">
            <span>Format</span>
            <select value={formatFilter} onChange={(event) => setFormatFilter(event.target.value)}>
              <option value="all">All formats</option>
              {formatOptions.map((format) => (
                <option key={format} value={format}>
                  {formatPascalCase(format)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <span className="row-count">{formatNumber(rows.length)} rows</span>
      </div>

      <div className="desktop-table" ref={tableScrollRef}>
        <div className="data-grid" role="table" style={{ '--table-grid-template': gridTemplate }}>
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
                  <div className="data-grid__row data-row" role="row" onClick={() => openDetails(row)}>
                    {row.getVisibleCells().map((cell) => (
                      <div className="data-grid__cell" key={cell.id} role="cell">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                    {hasActionColumn ? (
                      <div className="data-grid__cell expand-cell" aria-label={actionLabel(category)} role="cell">
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
                onClick={() => openDetails(row)}
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <MobileCardFields category={category} row={row} />
              </article>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? <p className="empty-state">{categoryConfig[category].empty}</p> : null}
      <PlayerProfileModal player={selectedPlayer} scope={scope} onClose={() => setSelectedPlayer(null)} />
      <PokemonSetsModal pokemon={selectedPokemon} scope={scope} onClose={() => setSelectedPokemon(null)} />
      <UsageDetailModal category={category} entry={selectedUsageEntry} scope={scope} onClose={() => setSelectedUsageEntry(null)} />
      {selectedTournament ? <TournamentStandingsModal tournament={selectedTournament} onClose={() => setSelectedTournament(null)} /> : null}
    </section>
  );
}
