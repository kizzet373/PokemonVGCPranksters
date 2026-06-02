import React, { useCallback, useState } from 'react';
import { DataTable } from '../table';
import { CategoryDataView } from '../common/CategoryDataView';
import { viewConfigs } from './viewConfigs';

export function PokemonView() {
  const [separateMegas, setSeparateMegas] = useState(false);
  const loadPokemonStats = useCallback(
    (scope) => viewConfigs.pokemon.loadStats(scope, { separateMegas }),
    [separateMegas],
  );

  return (
    <CategoryDataView
      {...viewConfigs.pokemon}
      loadStats={loadPokemonStats}
      renderTable={({ rows, scope, search, setSearch }) => (
        <DataTable
          category="pokemon"
          data={rows}
          scope={scope}
          search={search}
          setSearch={setSearch}
          toolbarControls={(
            <label className="table-toggle">
              <input checked={separateMegas} onChange={(event) => setSeparateMegas(event.target.checked)} type="checkbox" />
              <span>Separate Megas</span>
            </label>
          )}
        />
      )}
    />
  );
}
