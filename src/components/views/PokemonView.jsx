import React from 'react';
import { DataTable } from '../table';
import { CategoryDataView } from '../common/CategoryDataView';
import { viewConfigs } from './viewConfigs';

export function PokemonView() {
  return (
    <CategoryDataView
      {...viewConfigs.pokemon}
      renderTable={({ rows, scope, search, setSearch }) => (
        <DataTable category="pokemon" data={rows} scope={scope} search={search} setSearch={setSearch} />
      )}
    />
  );
}
