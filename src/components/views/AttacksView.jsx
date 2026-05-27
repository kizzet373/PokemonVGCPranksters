import React from 'react';
import { CategoryDataView } from '../common/CategoryDataView';
import { viewConfigs } from './viewConfigs';

export function AttacksView() {
  return <CategoryDataView {...viewConfigs.moves} />;
}
