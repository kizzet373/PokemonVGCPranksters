import React from 'react';
import { CategoryDataView } from '../common/CategoryDataView';
import { viewConfigs } from './viewConfigs';

export function PokemonView() {
  return <CategoryDataView {...viewConfigs.pokemon} />;
}
