import React, { useMemo } from 'react';
import { Gauge } from 'lucide-react';
import pokemonStatsData from '../../data/pokemon-stats.json';
import { defaultUsageScopeId } from '../../data/usageSources';
import { NameWithSprite } from '../common/NameWithSprite';
import { formatNumber, formatPascalCase } from '../../utils/format';

const LEVEL = 50;
const MAX_SPEED_EV = 252;
const MAX_IV = 31;
const SPEED_NATURE_MODIFIER = 1.1;
const MIN_TOURNAMENT_ENTRIES = 10;
const pokemonUsageModules = import.meta.glob('../../data/usage-stats/pokemon-separate-megas/*.json', { eager: true });
const pokemonUsageStats =
  pokemonUsageModules[`../../data/usage-stats/pokemon-separate-megas/${defaultUsageScopeId}.json`]?.default ??
  pokemonUsageModules['../../data/usage-stats/pokemon-separate-megas/full.json']?.default;

const speedItemModifiers = new Map([
  ['choicescarf', { label: 'choice scarf', multiplier: 1.5 }],
  ['ironball', { label: 'iron ball', multiplier: 0.5 }],
  ['machobrace', { label: 'macho brace', multiplier: 0.5 }],
  ['poweranklet', { label: 'power anklet', multiplier: 0.5 }],
  ['powerband', { label: 'power band', multiplier: 0.5 }],
  ['powerbelt', { label: 'power belt', multiplier: 0.5 }],
  ['powerbracer', { label: 'power bracer', multiplier: 0.5 }],
  ['powerlens', { label: 'power lens', multiplier: 0.5 }],
  ['powerweight', { label: 'power weight', multiplier: 0.5 }],
  ['quickpowder', { label: 'quick powder', multiplier: 2 }],
]);

const speedAbilityModifiers = new Map([
  ['chlorophyll', { label: 'chlorophyll', multiplier: 2 }],
  ['quarkdrive', { label: 'quark drive', multiplier: 1.5 }],
  ['quickfeet', { label: 'quick feet', multiplier: 1.5 }],
  ['sandrush', { label: 'sand rush', multiplier: 2 }],
  ['slowstart', { label: 'slow start', multiplier: 0.5 }],
  ['slushrush', { label: 'slush rush', multiplier: 2 }],
  ['surgesurfer', { label: 'surge surfer', multiplier: 2 }],
  ['swiftswim', { label: 'swift swim', multiplier: 2 }],
  ['unburden', { label: 'unburden', multiplier: 2 }],
  ['protosynthesis', { label: 'protosynthesis', multiplier: 1.5 }],
]);

const pokemonStatsById = new Map(pokemonStatsData.pokemon.map((pokemon) => [toId(pokemon.name), pokemon]));

function toId(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getMaxSpeed(baseSpeed) {
  const evContribution = Math.floor(MAX_SPEED_EV / 4);
  const raw = Math.floor(((2 * baseSpeed + MAX_IV + evContribution) * LEVEL) / 100) + 5;

  return Math.floor(raw * SPEED_NATURE_MODIFIER);
}

function applySpeedModifiers(speed, modifiers) {
  return modifiers.reduce((total, modifier) => Math.floor(total * modifier.multiplier), speed);
}

function makeSpeedTierEntries() {
  const entries = [];

  for (const pokemon of pokemonUsageStats?.pokemon ?? []) {
    const speciesStats = pokemonStatsById.get(toId(pokemon.name));
    const baseSpeed = pokemon.baseStats?.speed ?? speciesStats?.baseStats?.speed;

    if (!Number.isFinite(baseSpeed) || (pokemon.count ?? 0) < MIN_TOURNAMENT_ENTRIES) {
      continue;
    }

    const maxSpeed = getMaxSpeed(baseSpeed);
    const seenVariantKeys = new Set();
    const topSets = (pokemon.topSets ?? []).filter((set) => (set.rank ?? Infinity) <= 5);
    const variantSets = topSets.length ? topSets : [{}];

    for (const set of variantSets) {
      const itemModifier = speedItemModifiers.get(toId(set.item));
      const abilityModifier = speedAbilityModifiers.get(toId(set.ability));

      const itemOption = itemModifier ? { modifier: itemModifier, name: set.item } : null;
      const abilityOption = abilityModifier ? { modifier: abilityModifier, name: set.ability } : null;
      const variantKey = `${toId(itemOption?.name)}:${toId(abilityOption?.name)}`;

      if (seenVariantKeys.has(variantKey)) {
        continue;
      }

      seenVariantKeys.add(variantKey);
      entries.push({
        ability: abilityOption?.name ?? '',
        item: itemOption?.name ?? '',
        key: `${pokemon.id}:${variantKey || 'base'}`,
        pokemon,
        speed: applySpeedModifiers(maxSpeed, [itemOption?.modifier, abilityOption?.modifier].filter(Boolean)),
        usage: pokemon.count ?? 0,
      });
    }
  }

  return entries.sort((a, b) => {
    if (b.speed !== a.speed) {
      return b.speed - a.speed;
    }

    if (b.usage !== a.usage) {
      return b.usage - a.usage;
    }

    return a.pokemon.name.localeCompare(b.pokemon.name);
  });
}

function groupEntriesBySpeed(entries) {
  const groups = [];

  for (const entry of entries) {
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.speed === entry.speed) {
      lastGroup.entries.push(entry);
      continue;
    }

    groups.push({ entries: [entry], speed: entry.speed });
  }

  return groups;
}

function SpeedTierEntry({ entry }) {
  const hasDetails = entry.item || entry.ability;

  return (
    <li className="speed-tier-entry">
      <NameWithSprite kind="pokemon" id={entry.pokemon.id} name={entry.pokemon.name} />
      {hasDetails ? (
        <span className="speed-tier-entry__details">
          {entry.item ? (
            <span className="speed-tier-entry__detail speed-tier-entry__detail--item">
              <NameWithSprite kind="items" name={entry.item} />
            </span>
          ) : null}
          {entry.ability ? (
            <span className="speed-tier-entry__detail">{formatPascalCase(entry.ability)}</span>
          ) : null}
        </span>
      ) : null}
    </li>
  );
}

export function SpeedTiersView() {
  const tierGroups = useMemo(() => groupEntriesBySpeed(makeSpeedTierEntries()), []);
  const entryCount = useMemo(() => tierGroups.reduce((total, group) => total + group.entries.length, 0), [tierGroups]);

  return (
    <section className="workspace speed-tiers-workspace">
      <header className="workspace-header speed-tiers__head">
        <div>
          <h1>
            <Gauge size={34} aria-hidden="true" />
            Speed Tiers
          </h1>
        </div>
        <div className="speed-tiers__summary">
          <strong>{formatNumber(entryCount)}</strong>
          <span>tier entries</span>
        </div>
      </header>

      <div className="speed-tiers">
        {tierGroups.map((group) => (
          <section className="speed-tier-block" key={group.speed} aria-label={`Speed ${group.speed}`}>
            <header className="speed-tier-block__header">
              <span>Speed</span>
              <strong>{formatNumber(group.speed)}</strong>
            </header>
            <ul className="speed-tier-block__list">
              {group.entries.map((entry) => <SpeedTierEntry entry={entry} key={entry.key} />)}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
