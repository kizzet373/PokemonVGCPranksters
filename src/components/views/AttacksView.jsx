import React from 'react';
import { DataTable } from '../table';
import { CategoryDataView } from '../common/CategoryDataView';
import { viewConfigs } from './viewConfigs';

export function AttacksView() {
  return (
    <CategoryDataView
      {...viewConfigs.moves}
      renderTable={({ rows, scope, search, setSearch }) => (
        <DataTable category="moves" data={rows} scope={scope} search={search} setSearch={setSearch} />
      )}
    />
  );
}
