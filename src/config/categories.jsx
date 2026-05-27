import { Briefcase, CalendarDays, Sparkles, Swords, Trophy } from 'lucide-react';
import { PokeballIcon } from '../components/icons/PokeballIcon';

export const categoryConfig = {
  pokemon: {
    label: 'Pokemon',
    icon: Sparkles,
    navIcon: PokeballIcon,
    dataKey: 'pokemon',
    empty: 'No Pokemon found',
  },
  items: {
    label: 'Items',
    icon: Briefcase,
    navIcon: Briefcase,
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
