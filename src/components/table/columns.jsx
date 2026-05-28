import React from 'react';
import { formatDate, formatNumber, formatWholeNumber } from '../../utils/format';
import {
  EloCell,
  NameCell,
  PlayerCell,
  PokemonCell,
  PokemonTypeCell,
  typingForPokemon,
  TopSetsCell,
  TournamentCell,
  TournamentWinnerCell,
  UsageCell,
  WinRateCell,
} from './tableCells';

const numericCell = (formatter = formatNumber) => {
  function NumericCell({ getValue }) {
    return <strong>{formatter(getValue())}</strong>;
  }

  return NumericCell;
};

export function buildColumns(category) {
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
        cell: numericCell(formatDate),
      },
      {
        accessorKey: 'players',
        header: 'Players',
        cell: numericCell(),
      },
      {
        id: 'winner',
        accessorFn: (row) => row.winner?.name ?? '',
        header: 'Winner',
        cell: TournamentWinnerCell,
        enableSorting: false,
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
        id: 'typing',
        accessorFn: (row) => typingForPokemon(row).join(' '),
        header: 'Type',
        cell: PokemonTypeCell,
        enableSorting: false,
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
        header: 'Top Set',
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
        cell: numericCell(),
      },
      {
        accessorKey: 'averageSize',
        header: 'Average size',
        cell: numericCell(formatWholeNumber),
      },
    ];
  }

  return [
    {
      accessorKey: 'name',
      header: category === 'moves' ? 'Attack' : 'Item',
      cell: (context) => <NameCell {...context} category={category} />,
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
      cell: numericCell(),
    },
    {
      id: 'winRate',
      accessorFn: (row) => row.record?.winRate ?? 0,
      header: 'Winrate',
      cell: WinRateCell,
    },
  ];
}
