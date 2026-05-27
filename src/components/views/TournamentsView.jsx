import React from 'react';
import { DataTable } from '../table';
import { CategoryDataView } from '../common/CategoryDataView';
import { viewConfigs } from './viewConfigs';

export function TournamentsView() {
  return (
    <CategoryDataView
      {...viewConfigs.tournaments}
      renderTable={({ rows, scope, search, setSearch }) => (
        <DataTable category="tournaments" data={rows} scope={scope} search={search} setSearch={setSearch} />
      )}
    />
  );
}
