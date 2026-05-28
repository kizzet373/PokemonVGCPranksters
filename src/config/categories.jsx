import { Briefcase, CalendarDays, Gauge, Sparkles, Swords, Trophy } from 'lucide-react';
import { PokeballIcon } from '../components/icons/PokeballIcon';
import { getTypeIcon } from '../utils/assets';

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
  'speed-check': {
    label: 'Speed Check',
    icon: Gauge,
    dataKey: 'speed-check',
    empty: 'No speed checks found',
  },
  'type-check': {
    label: 'Type Check',
    icon: Sparkles,
    navIconSrc: getTypeIcon('fire'),
    dataKey: 'type-check',
    empty: 'No type checks found',
  },
  tournaments: {
    label: 'Tournaments',
    icon: CalendarDays,
    dataKey: 'tournaments',
    empty: 'No tournaments found',
  },
};
