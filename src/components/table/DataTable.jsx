import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Search, X } from 'lucide-react';
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { categoryConfig } from '../../config/categories';
import typeMatchups from '../../data/type-matchups.json';
import { getMoveType, getTypeIcon } from '../../utils/assets';
import { formatNumber, formatPascalCase, formatTournamentFormat } from '../../utils/format';
import { PlayerProfileModal, PokemonSetsModal, TournamentStandingsModal, UsageDetailModal } from '../modals';
import { buildColumns } from './columns';
import { MobileCardFields } from './MobileCards';
import { typingForPokemon } from './tableCells';
import { desktopGridTemplate, DESKTOP_TABLE_ROW_HEIGHT, MOBILE_CARD_HEIGHT, tableConfigFor } from './tableConfig';

function ExpandPill({ label }) {
  return (
    <span className="expand-pill" aria-label={label} role="img">
      <ChevronDown size={15} aria-hidden="true" />
    </span>
  );
}

function TypeFilterPill({ type, onRemove }) {
  return (
    <button className="type-filter-pill" onClick={() => onRemove(type)} type="button" aria-label={`Remove ${formatPascalCase(type)} filter`}>
      <img src={getTypeIcon(type)} alt="" />
      <X size={13} aria-hidden="true" />
    </button>
  );
}

export function DataTable({ category, data, scope, search, setSearch, toolbarControls = null }) {
  const tableConfig = tableConfigFor(category);
  const columns = useMemo(() => buildColumns(category), [category]);
  const isTournamentTable = category === 'tournaments';
  const hasPokemonTypeFilter = category === 'pokemon';
  const hasMoveTypeFilter = category === 'moves';
  const tableScrollRef = useRef(null);
  const mobileScrollRef = useRef(null);
  const [sorting, setSorting] = useState([{ id: tableConfig.defaultSort, desc: true }]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formatFilter, setFormatFilter] = useState('all');
  const [pokemonTypeFilters, setPokemonTypeFilters] = useState([]);
  const [moveTypeFilter, setMoveTypeFilter] = useState('all');
  const typeOptions = typeMatchups.types;
  const formatOptions = useMemo(() => {
    if (!isTournamentTable) {
      return [];
    }

    return [...new Set(data.map((row) => row.format).filter(Boolean))].sort((a, b) =>
      formatTournamentFormat(a).localeCompare(formatTournamentFormat(b)),
    );
  }, [data, isTournamentTable]);
  const availablePokemonTypes = useMemo(
    () => typeOptions.filter((type) => !pokemonTypeFilters.includes(type)),
    [pokemonTypeFilters, typeOptions],
  );
  const addPokemonTypeFilter = (type) => {
    if (!type) {
      return;
    }

    setPokemonTypeFilters((currentTypes) => (currentTypes.includes(type) ? currentTypes : [...currentTypes, type]));
  };
  const removePokemonTypeFilter = (type) => {
    setPokemonTypeFilters((currentTypes) => currentTypes.filter((currentType) => currentType !== type));
  };
  const filteredData = useMemo(
    () =>
      data.filter((row) => {
        const meetsMinimum = (row.count ?? row.tournaments ?? row.players ?? 0) >= tableConfig.defaultMinimum;
        const matchesFormat = !isTournamentTable || formatFilter === 'all' || row.format === formatFilter;
        const rowTypes = hasPokemonTypeFilter ? typingForPokemon(row) : [];
        const matchesPokemonTypes = !hasPokemonTypeFilter || pokemonTypeFilters.every((type) => rowTypes.includes(type));
        const matchesMoveType = !hasMoveTypeFilter || moveTypeFilter === 'all' || getMoveType(row.name) === moveTypeFilter;

        return meetsMinimum && matchesFormat && matchesPokemonTypes && matchesMoveType;
      }),
    [
      data,
      formatFilter,
      hasMoveTypeFilter,
      hasPokemonTypeFilter,
      isTournamentTable,
      moveTypeFilter,
      pokemonTypeFilters,
      tableConfig.defaultMinimum,
    ],
  );

  useEffect(() => {
    setSorting([{ id: tableConfig.defaultSort, desc: true }]);
    setFormatFilter('all');
    setPokemonTypeFilters([]);
    setMoveTypeFilter('all');
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
  const desktopSortOptions = table
    .getAllLeafColumns()
    .filter((column) => column.getCanSort())
    .map((column) => ({
      id: column.id,
      label: typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id,
    }));
  const activeSort = sorting[0] ?? { id: tableConfig.defaultSort, desc: true };
  const sortOptions = tableConfig.mobileSorts
    ? tableConfig.mobileSorts.map((sortId) => desktopSortOptions.find((option) => option.id === sortId)).filter(Boolean)
    : desktopSortOptions;
  const mobileActiveSort = sortOptions.some((option) => option.id === activeSort.id) ? activeSort : {
    id: sortOptions[0]?.id ?? activeSort.id,
    desc: true,
  };
  const usesFixedPokemonRows = category === 'pokemon';
  const rowDataKey = useMemo(
    () =>
      rows
        .map((row) => {
          const original = row.original ?? {};

          return `${original.id ?? original.name ?? row.id}:${original.count ?? original.players ?? original.tournaments ?? ''}`;
        })
        .join('|'),
    [rows],
  );
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
    ...(usesFixedPokemonRows ? {} : { measureElement: (element) => element.offsetHeight }),
    overscan: 8,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const mobileVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => mobileScrollRef.current,
    estimateSize: () => MOBILE_CARD_HEIGHT,
    ...(usesFixedPokemonRows ? {} : { measureElement: (element) => element.offsetHeight }),
    overscan: 5,
  });
  const mobileVirtualRows = mobileVirtualizer.getVirtualItems();
  const desktopTableHeight = usesFixedPokemonRows ? rows.length * DESKTOP_TABLE_ROW_HEIGHT : virtualizer.getTotalSize();
  const mobileListHeight = usesFixedPokemonRows ? rows.length * MOBILE_CARD_HEIGHT : mobileVirtualizer.getTotalSize();
  const gridTemplate = useMemo(
    () => desktopGridTemplate({ category, columns, rows, hasActionColumn: Boolean(tableConfig.detailType) }),
    [category, columns, rows, tableConfig.detailType],
  );

  useLayoutEffect(() => {
    if (usesFixedPokemonRows) {
      return;
    }

    virtualizer.measure();
    mobileVirtualizer.measure();
  }, [gridTemplate, mobileVirtualizer, rowDataKey, usesFixedPokemonRows, virtualizer]);

  useEffect(() => {
    tableScrollRef.current?.scrollTo({ top: 0 });
    mobileScrollRef.current?.scrollTo({ top: 0 });
  }, [category, formatFilter, moveTypeFilter, pokemonTypeFilters, rowDataKey, search, sorting]);

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
        {hasPokemonTypeFilter ? (
          <div className="table-type-filter" aria-label="Pokemon type filters">
            <label className="table-filter table-filter--type-add">
              <span>Type</span>
              <select
                aria-label="Add Pokemon type filter"
                value=""
                onChange={(event) => {
                  addPokemonTypeFilter(event.target.value);
                  event.target.value = '';
                }}
              >
                <option value="" disabled>Add type</option>
                {availablePokemonTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatPascalCase(type)}
                  </option>
                ))}
              </select>
            </label>
            {pokemonTypeFilters.length ? (
              <div className="type-filter-pills">
                {pokemonTypeFilters.map((type) => <TypeFilterPill key={type} type={type} onRemove={removePokemonTypeFilter} />)}
              </div>
            ) : null}
          </div>
        ) : null}
        {hasMoveTypeFilter ? (
          <label className="table-filter table-filter--move-type">
            <span>Type</span>
            <select value={moveTypeFilter} onChange={(event) => setMoveTypeFilter(event.target.value)}>
              <option value="all">All types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {formatPascalCase(type)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {toolbarControls}
        <div className="mobile-sort-controls" aria-label={`${categoryConfig[category].label} sort controls`}>
          <label className="table-filter table-filter--sort">
            <span>Sort</span>
            <select
              value={mobileActiveSort.id}
              onChange={(event) => setSorting([{ id: event.target.value, desc: mobileActiveSort.desc }])}
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="sort-direction-button"
            type="button"
            onClick={() => setSorting([{ id: mobileActiveSort.id, desc: !mobileActiveSort.desc }])}
            aria-label={`Sort ${mobileActiveSort.desc ? 'ascending' : 'descending'}`}
          >
            {mobileActiveSort.desc ? <ArrowDown size={17} aria-hidden="true" /> : <ArrowUp size={17} aria-hidden="true" />}
            <span>{mobileActiveSort.desc ? 'Desc' : 'Asc'}</span>
          </button>
        </div>
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
          <div className="data-grid__body" role="rowgroup" style={{ height: `${desktopTableHeight}px` }}>
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              const rowKey = row?.original?.id ?? row?.original?.name ?? row.id;
              const rowY = usesFixedPokemonRows ? virtualRow.index * DESKTOP_TABLE_ROW_HEIGHT : virtualRow.start;

              return (
                <div
                  className="data-grid__item"
                  data-index={virtualRow.index}
                  key={`${rowKey}-${virtualRow.index}`}
                  ref={usesFixedPokemonRows ? null : virtualizer.measureElement}
                  style={{
                    height: usesFixedPokemonRows ? `${DESKTOP_TABLE_ROW_HEIGHT}px` : undefined,
                    transform: `translateY(${rowY}px)`,
                  }}
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
        <div className="mobile-list__spacer" style={{ height: `${mobileListHeight}px` }}>
          {mobileVirtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            const rowKey = row?.original?.id ?? row?.original?.name ?? row.id;
            const rowY = usesFixedPokemonRows ? virtualRow.index * MOBILE_CARD_HEIGHT : virtualRow.start;

            return (
              <article
                className="mobile-card"
                data-index={virtualRow.index}
                key={`${rowKey}-${virtualRow.index}`}
                ref={usesFixedPokemonRows ? null : mobileVirtualizer.measureElement}
                onClick={() => openDetails(row)}
                style={{
                  height: usesFixedPokemonRows ? `${MOBILE_CARD_HEIGHT}px` : undefined,
                  transform: `translateY(${rowY}px)`,
                }}
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
