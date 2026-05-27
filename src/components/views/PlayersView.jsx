import React from 'react';
import { DataTable } from '../table';
import { CategoryDataView } from '../common/CategoryDataView';
import { viewConfigs } from './viewConfigs';

export function PlayersView() {
  return (
    <CategoryDataView
      {...viewConfigs.players}
      renderTable={({ rows, scope, search, setSearch }) => (
        <DataTable category="players" data={rows} scope={scope} search={search} setSearch={setSearch} />
      )}
    />
  );
}
