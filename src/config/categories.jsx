import { Briefcase, Calculator, CalendarDays, Gauge, ListOrdered, Sparkles, Swords, Trophy } from 'lucide-react';
import { PokeballIcon } from '../components/icons/PokeballIcon';
import { TypeCheckIcon } from '../components/icons/TypeCheckIcon';

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
    navIcon: TypeCheckIcon,
    dataKey: 'type-check',
    empty: 'No type checks found',
  },
  tournaments: {
    label: 'Tournaments',
    icon: CalendarDays,
    dataKey: 'tournaments',
    empty: 'No tournaments found',
  },
  'damage-calc': {
    label: 'Damage Calc',
    icon: Calculator,
    dataKey: 'damage-calc',
    empty: 'No calculations found',
  },
  'speed-tiers': {
    label: 'Speed Tiers',
    icon: ListOrdered,
    dataKey: 'speed-tiers',
    empty: 'No speed tiers found',
  },
};
