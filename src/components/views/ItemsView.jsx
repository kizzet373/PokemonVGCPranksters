import React from 'react';
import { DataTable } from '../table';
import { CategoryDataView } from '../common/CategoryDataView';
import { viewConfigs } from './viewConfigs';

export function ItemsView() {
  return (
    <CategoryDataView
      {...viewConfigs.items}
      renderTable={({ rows, scope, search, setSearch }) => (
        <DataTable category="items" data={rows} scope={scope} search={search} setSearch={setSearch} />
      )}
    />
  );
}
