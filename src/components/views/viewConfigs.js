import { categoryConfig } from '../../config/categories';

export const viewConfigs = {
  pokemon: {
    ...categoryConfig.pokemon,
    category: 'pokemon',
    dataSource: 'usage',
    metricsSource: 'usage',
  },
  items: {
    ...categoryConfig.items,
    category: 'items',
    dataSource: 'usage',
    metricsSource: 'usage',
  },
  moves: {
    ...categoryConfig.moves,
    category: 'moves',
    dataSource: 'usage',
    metricsSource: 'usage',
  },
  players: {
    ...categoryConfig.players,
    category: 'players',
    dataSource: 'players',
    metricsSource: 'players',
  },
  tournaments: {
    ...categoryConfig.tournaments,
    category: 'tournaments',
    dataSource: 'tournaments',
    metricsSource: 'tournaments',
  },
};
