import { CalendarDays, Shield, Sparkles, Swords, Trophy } from 'lucide-react';

export const categoryConfig = {
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
