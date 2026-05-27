import React from 'react';
import { CategoryDataView } from '../common/CategoryDataView';
import { viewConfigs } from './viewConfigs';

export function PlayersView() {
  return <CategoryDataView {...viewConfigs.players} />;
}
