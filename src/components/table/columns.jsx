import React from 'react';
import { formatDate, formatNumber, formatWholeNumber } from '../../utils/format';
import {
  EloCell,
  NameCell,
  PlayerCell,
  PokemonCell,
  TopSetsCell,
  TournamentCell,
  TournamentWinnerCell,
  UsageCell,
  WinRateCell,
} from './tableCells';

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
        cell: ({ getValue }) => <strong>{formatDate(getValue())}</strong>,
      },
      {
        accessorKey: 'players',
        header: 'Players',
        cell: ({ getValue }) => <strong>{formatNumber(getValue())}</strong>,
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
        cell: ({ getValue }) => <strong>{formatNumber(getValue())}</strong>,
      },
      {
        accessorKey: 'averageSize',
        header: 'Average size',
        cell: ({ getValue }) => <strong>{formatWholeNumber(getValue())}</strong>,
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
