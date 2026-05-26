export const DESKTOP_TABLE_ROW_HEIGHT = 83;
export const MOBILE_CARD_HEIGHT = 238;

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

export function desktopGridTemplate({ columnCount, hasActionColumn, isTournamentTable }) {
  const actionColumn = hasActionColumn ? ' 48px' : '';

  if (isTournamentTable) {
    return `fit-content(320px) fit-content(120px) fit-content(96px) minmax(300px, 1fr)${actionColumn}`;
  }

  if (columnCount <= 1) {
    return `minmax(180px, 1fr)${actionColumn}`;
  }

  return `${Array.from({ length: columnCount - 1 }, () => 'fit-content(240px)').join(' ')} minmax(220px, 1fr)${actionColumn}`;
}
