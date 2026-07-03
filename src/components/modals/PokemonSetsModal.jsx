import React, { useEffect, useMemo, useState } from 'react';
import { loadRawDocument } from '../../data/sqliteClient';
import {
  championStatLabels,
  championStatOrder,
  getAdjustedChampionStats,
  getChampionStatMaxima,
  toId,
} from '../../utils/championStats';
import { formatNumber, formatPascalCase, formatPercent, formatScopeLabel } from '../../utils/format';
import { PokemonSetBreakdown } from '../breakdowns';
import { ModalShell } from '../common';

function getChampionBaseStats(pokemon, pokemonStatsById) {
  const baseStats = pokemon?.baseStats ?? pokemonStatsById.get(toId(pokemon?.name))?.baseStats;

  return baseStats ? getAdjustedChampionStats(baseStats) : null;
}

function ChampionStatsStrip({ pokemon, pokemonEntries, pokemonStatsById }) {
  const championStats = getChampionBaseStats(pokemon, pokemonStatsById);
  const championStatMaxima = getChampionStatMaxima(pokemonEntries, pokemonStatsById);

  if (!championStats) {
    return null;
  }

  return (
    <section className="pokemon-champion-stats" aria-label="Champion stats">
      <header>
        <span>Champion Stats</span>
      </header>
      <div className="pokemon-champion-stats__grid">
        {championStatOrder.map((stat) => {
          const max = championStatMaxima[stat] || championStats[stat] || 1;
          const meterWidth = Math.min(100, Math.max(0, ((championStats[stat] ?? 0) / max) * 100));

          return (
            <span className="pokemon-champion-stats__item" key={stat}>
              <span className="pokemon-champion-stats__value">
                <small>{championStatLabels[stat]}</small>
                <strong>{championStats[stat]}</strong>
              </span>
              <span className="pokemon-champion-stats__meter" aria-hidden="true">
                <span style={{ width: `${meterWidth}%` }} />
              </span>
            </span>
          );
        })}
      </div>
    </section>
  );
}

export function PokemonSetsModal({ pokemon, pokemonEntries = [], scope, onClose }) {
  const [pokemonStatsData, setPokemonStatsData] = useState(null);
  const pokemonStatsById = useMemo(
    () => new Map((pokemonStatsData?.pokemon ?? []).map((entry) => [toId(entry.name), entry])),
    [pokemonStatsData],
  );

  useEffect(() => {
    let ignored = false;

    loadRawDocument('pokemon_stats').then((nextStats) => {
      if (!ignored) {
        setPokemonStatsData(nextStats);
      }
    });

    return () => {
      ignored = true;
    };
  }, []);

  if (!pokemon) {
    return null;
  }

  return (
    <ModalShell
      ariaLabel={`${formatPascalCase(pokemon.name)} sets`}
      className="pokemon-sets-modal"
      eyebrow={`${formatScopeLabel(scope)} set breakdown`}
      onClose={onClose}
      title={formatPascalCase(pokemon.name)}
      stats={[
        { label: 'Usage', value: formatPercent(pokemon.usagePercent) },
        { label: 'Winrate', value: formatPercent(pokemon.record?.winRate) },
        { label: 'Teams', value: formatNumber(pokemon.count) },
        { label: 'Public sets', value: formatNumber(pokemon.topSets?.length ?? 0) },
      ]}
    >
      <ChampionStatsStrip pokemon={pokemon} pokemonEntries={pokemonEntries} pokemonStatsById={pokemonStatsById} />
      <PokemonSetBreakdown pokemon={pokemon} />
    </ModalShell>
  );
}
