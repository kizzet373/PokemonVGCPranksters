import React from 'react';
import { CategoryDataView } from '../common/CategoryDataView';
import { viewConfigs } from './viewConfigs';

export function ItemsView() {
  return <CategoryDataView {...viewConfigs.items} />;
}
