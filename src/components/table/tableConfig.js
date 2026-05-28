export const DESKTOP_TABLE_ROW_HEIGHT = 83;
export const MOBILE_CARD_HEIGHT = 238;
const DEFAULT_COLUMN_MAX_WIDTH = 240;
const DEFAULT_COLUMN_MIN_WIDTH = 72;
const ACTION_COLUMN_WIDTH = 48;
const CHARACTER_WIDTH = 8;
const CELL_INLINE_PADDING = 32;
const SORT_ICON_INLINE_WIDTH = 36;

const COLUMN_WIDTH_LIMITS = {
  averageSize: 156,
  count: 136,
  date: 118,
  name: 320,
  players: 112,
  pranksterElo: 156,
  topSets: 260,
  typing: 128,
  tournaments: 168,
  usagePercent: 150,
  winRate: 172,
  winner: 520,
};

const COLUMN_WIDTH_MINIMUMS = {
  'items:name': 250,
  'moves:name': 250,
};

export const tableCategoryConfig = {
  pokemon: { actionLabel: 'Open sets', defaultMinimum: 10, defaultSort: 'usagePercent', detailType: 'pokemon' },
  items: { actionLabel: 'Open usage details', defaultMinimum: 10, defaultSort: 'usagePercent', detailType: 'usage' },
  moves: { actionLabel: 'Open usage details', defaultMinimum: 10, defaultSort: 'usagePercent', detailType: 'usage' },
  players: { actionLabel: 'Open player profile', defaultMinimum: 2, defaultSort: 'pranksterElo', detailType: 'player' },
  tournaments: { actionLabel: 'Open tournament standings', defaultMinimum: 0, defaultSort: 'date', detailType: 'tournament' },
};

export const tableConfigFor = (category) => tableCategoryConfig[category] ?? tableCategoryConfig.pokemon;

function columnMaxWidth(columnId) {
  return COLUMN_WIDTH_LIMITS[columnId] ?? DEFAULT_COLUMN_MAX_WIDTH;
}

function columnMinWidth(category, columnId) {
  return COLUMN_WIDTH_MINIMUMS[`${category}:${columnId}`] ?? DEFAULT_COLUMN_MIN_WIDTH;
}

function clampWidth(width, category, columnId) {
  return Math.min(Math.max(width, columnMinWidth(category, columnId)), columnMaxWidth(columnId));
}

function textWidth(text, category, columnId) {
  return clampWidth(String(text ?? '').length * CHARACTER_WIDTH + CELL_INLINE_PADDING, category, columnId);
}

function headerWidth(text, category, columnId) {
  return clampWidth(String(text ?? '').length * CHARACTER_WIDTH + CELL_INLINE_PADDING + SORT_ICON_INLINE_WIDTH, category, columnId);
}

function recordText(record) {
  if (!record) {
    return '';
  }

  const wins = record.wins ?? 0;
  const losses = record.losses ?? 0;
  const draws = record.draws ?? 0;

  return `${wins}W - ${losses}L${draws ? ` - ${draws}D` : ''}`;
}

function topSetText(row) {
  const set = row.topSets?.[0];

  if (!set) {
    return '';
  }

  return [set.ability, set.item, `${set.usagePercent ?? ''}%`].filter(Boolean).join(' ');
}

function winnerText(row) {
  const winner = row.winner;

  if (!winner) {
    return '';
  }

  const team = (winner.team ?? []).map((pokemon) => `${pokemon.name} ${pokemon.item}`).join(' ');

  return `${winner.name} ${winner.country ?? ''} ${team}`;
}

function columnText(category, columnId, row) {
  if (columnId === 'name') {
    return row.name;
  }

  if (columnId === 'typing') {
    return (row.typing ?? []).join(' ');
  }

  if (columnId === 'usagePercent') {
    return `${row.usagePercent ?? ''}% ${row.count ?? ''}`;
  }

  if (columnId === 'winRate') {
    return `${row.record?.winRate ?? ''}% ${recordText(row.record)}`;
  }

  if (columnId === 'topSets') {
    return topSetText(row);
  }

  if (columnId === 'winner') {
    return winnerText(row);
  }

  if (category === 'tournaments' && columnId === 'date') {
    return row.date;
  }

  return row[columnId];
}

export function desktopGridTemplate({ category, columns, rows, hasActionColumn }) {
  const columnTracks = columns.map((column) => {
    const columnId = column.id ?? column.accessorKey;
    const minimumHeaderWidth = headerWidth(column.header ?? columnId, category, columnId);
    const contentWidth = rows.reduce(
      (maxWidth, row) => Math.max(maxWidth, textWidth(columnText(category, columnId, row.original), category, columnId)),
      minimumHeaderWidth,
    );

    return contentWidth;
  });

  if (hasActionColumn) {
    columnTracks.push(ACTION_COLUMN_WIDTH);
  }

  return columnTracks
    .map((width, index) => (index === columnTracks.length - 1 ? `minmax(${width}px, 1fr)` : `${width}px`))
    .join(' ');
}
