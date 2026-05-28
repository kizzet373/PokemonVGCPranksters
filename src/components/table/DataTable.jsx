import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUpDown, ChevronDown, Search } from 'lucide-react';
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { categoryConfig } from '../../config/categories';
import { formatNumber, formatPascalCase, formatTournamentFormat } from '../../utils/format';
import { PlayerProfileModal, PokemonSetsModal, TournamentStandingsModal, UsageDetailModal } from '../modals';
import { buildColumns } from './columns';
import { MobileCardFields } from './MobileCards';
import { desktopGridTemplate, DESKTOP_TABLE_ROW_HEIGHT, MOBILE_CARD_HEIGHT, tableConfigFor } from './tableConfig';

function ExpandPill({ label }) {
  return (
    <span className="expand-pill" aria-label={label} role="img">
      <ChevronDown size={15} aria-hidden="true" />
    </span>
  );
}

export function DataTable({ category, data, scope, search, setSearch }) {
  const tableConfig = tableConfigFor(category);
  const columns = useMemo(() => buildColumns(category), [category]);
  const isTournamentTable = category === 'tournaments';
  const tableScrollRef = useRef(null);
  const mobileScrollRef = useRef(null);
  const [sorting, setSorting] = useState([{ id: tableConfig.defaultSort, desc: true }]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formatFilter, setFormatFilter] = useState('all');
  const formatOptions = useMemo(() => {
    if (!isTournamentTable) {
      return [];
    }

    return [...new Set(data.map((row) => row.format).filter(Boolean))].sort((a, b) =>
      formatTournamentFormat(a).localeCompare(formatTournamentFormat(b)),
    );
  }, [data, isTournamentTable]);
  const filteredData = useMemo(
    () =>
      data.filter((row) => {
        const meetsMinimum = (row.count ?? row.tournaments ?? row.players ?? 0) >= tableConfig.defaultMinimum;
        const matchesFormat = !isTournamentTable || formatFilter === 'all' || row.format === formatFilter;

        return meetsMinimum && matchesFormat;
      }),
    [data, formatFilter, isTournamentTable, tableConfig.defaultMinimum],
  );

  useEffect(() => {
    setSorting([{ id: tableConfig.defaultSort, desc: true }]);
    setFormatFilter('all');
    setSelectedEntry(null);
  }, [category, data, tableConfig.defaultSort]);

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
  const rowCountLabel = {
    pokemon: 'pokemon',
    items: 'items',
    moves: 'attacks',
    players: 'players',
    tournaments: 'tournaments',
  }[category] ?? 'results';
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
    () => desktopGridTemplate({ category, columns, rows, hasActionColumn: Boolean(tableConfig.detailType) }),
    [category, columns, rows, tableConfig.detailType],
  );

  useEffect(() => {
    virtualizer.measure();
    mobileVirtualizer.measure();
  }, [mobileVirtualizer, rows.length, virtualizer]);

  const openDetails = (row) => setSelectedEntry(row.original);
  const closeDetails = () => setSelectedEntry(null);

  return (
    <section className={`table-panel table-panel--${category}`}>
      <div className="table-toolbar">
        <div className="table-search-summary">
          <label className="search-box">
            <Search size={18} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${categoryConfig[category].label.toLowerCase()}`}
              type="search"
            />
          </label>
          <span className="row-count">{formatNumber(rows.length)} {rowCountLabel}</span>
        </div>
        {isTournamentTable ? (
          <label className="table-filter">
            <span>Format</span>
            <select value={formatFilter} onChange={(event) => setFormatFilter(event.target.value)}>
              <option value="all">All formats</option>
              {formatOptions.map((format) => (
                <option key={format} value={format}>
                  {formatTournamentFormat(format)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
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
                {tableConfig.detailType ? <div className="data-grid__header expand-heading" aria-label="Details" role="columnheader" /> : null}
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
                    {tableConfig.detailType ? (
                      <div className="data-grid__cell expand-cell" aria-label={tableConfig.actionLabel} role="cell">
                        <ExpandPill label={tableConfig.actionLabel} />
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
                {tableConfig.detailType ? <ExpandPill label={tableConfig.actionLabel} /> : null}
                <MobileCardFields category={category} row={row} />
              </article>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? <p className="empty-state">{categoryConfig[category].empty}</p> : null}
      {tableConfig.detailType === 'player' ? <PlayerProfileModal player={selectedEntry} scope={scope} onClose={closeDetails} /> : null}
      {tableConfig.detailType === 'pokemon' ? <PokemonSetsModal pokemon={selectedEntry} scope={scope} onClose={closeDetails} /> : null}
      {tableConfig.detailType === 'usage' ? (
        <UsageDetailModal category={category} entry={selectedEntry} scope={scope} onClose={closeDetails} />
      ) : null}
      {tableConfig.detailType === 'tournament' ? <TournamentStandingsModal tournament={selectedEntry} onClose={closeDetails} /> : null}
    </section>
  );
}
