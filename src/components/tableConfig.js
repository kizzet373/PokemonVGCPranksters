export const DESKTOP_TABLE_ROW_HEIGHT = 83;
export const MOBILE_CARD_HEIGHT = 238;
const DEFAULT_COLUMN_MAX_WIDTH = 240;
const DEFAULT_COLUMN_MIN_WIDTH = 72;
const ACTION_COLUMN_WIDTH = 48;
const CHARACTER_WIDTH = 8;
const CELL_INLINE_PADDING = 32;

const COLUMN_WIDTH_LIMITS = {
  averageSize: 126,
  count: 126,
  date: 118,
  name: 320,
  players: 96,
  pranksterElo: 132,
  topSets: 260,
  tournaments: 116,
  usagePercent: 150,
  winRate: 172,
  winner: 320,
};

export function defaultSortForCategory(category) {
  if (category === 'players') {
    return 'pranksterElo';
  }

  if (category === 'tournaments') {
    return 'date';
  }

  return 'usagePercent';
}

export function actionLabel(category) {
  if (category === 'players') {
    return 'Open player profile';
  }

  if (category === 'tournaments') {
    return 'Open tournament standings';
  }

  if (category === 'items' || category === 'moves') {
    return 'Open usage details';
  }

  return 'Open sets';
}

function columnMaxWidth(columnId) {
  return COLUMN_WIDTH_LIMITS[columnId] ?? DEFAULT_COLUMN_MAX_WIDTH;
}

function clampWidth(width, columnId) {
  return Math.min(Math.max(width, DEFAULT_COLUMN_MIN_WIDTH), columnMaxWidth(columnId));
}

function textWidth(text, columnId) {
  return clampWidth(String(text ?? '').length * CHARACTER_WIDTH + CELL_INLINE_PADDING, columnId);
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
    const headerWidth = textWidth(column.header ?? columnId, columnId);
    const contentWidth = rows.reduce(
      (maxWidth, row) => Math.max(maxWidth, textWidth(columnText(category, columnId, row.original), columnId)),
      headerWidth,
    );

    return `${contentWidth}px`;
  });

  if (hasActionColumn) {
    columnTracks.push(`${ACTION_COLUMN_WIDTH}px`);
  }

  return columnTracks.join(' ');
}
