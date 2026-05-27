import React from 'react';
import { CategoryDataView } from '../common/CategoryDataView';
import { viewConfigs } from './viewConfigs';

export function TournamentsView() {
  return <CategoryDataView {...viewConfigs.tournaments} />;
}
