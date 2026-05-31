import React, { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import {
  calculate,
  Field,
  Generations,
  Move as CalcMove,
  Pokemon as CalcPokemon,
  calcStat,
  toID,
} from '@smogon/calc';
import pokemonStatsData from '../../data/pokemon-stats.json';
import recentPokemonUsageStats from '../../data/usage-stats/pokemon/2026-05.json';
import pokemonUsageStats from '../../data/usage-stats/pokemon/full.json';
import itemUsageStats from '../../data/usage-stats/items/full.json';
import recentMoveUsageStats from '../../data/usage-stats/moves/2026-05.json';
import moveUsageStats from '../../data/usage-stats/moves/full.json';
import { getPokemonSprite, getTypeIcon } from '../../utils/assets';
import { formatPascalCase } from '../../utils/format';

const GEN = 9;
const CHAMPIONS_LEVEL = 50;
const CHAMPIONS_GAME_TYPE = 'Doubles';
const CHAMPIONS_MAX_STAT_POINTS = 32;
const CHAMPIONS_TOTAL_STAT_POINTS = 66;
const generation = Generations.get(GEN);
const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const boostStats = ['atk', 'def', 'spa', 'spd', 'spe'];
const statLabels = {
  hp: 'HP',
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe',
};
const weatherOptions = ['', 'Sun', 'Rain', 'Sand', 'Snow'];
const terrainOptions = ['', 'Electric', 'Grassy', 'Misty', 'Psychic'];

const championSpeciesIds = new Set((pokemonUsageStats.pokemon ?? []).map((pokemon) => toID(pokemon.id ?? pokemon.name)));
const championItemIds = new Set((itemUsageStats.items ?? []).map((item) => toID(item.name)));
const recentPokemonEntries = recentPokemonUsageStats.pokemon ?? [];
const recentPokemonById = new Map(recentPokemonEntries.map((pokemon) => [toID(pokemon.id ?? pokemon.name), pokemon]));
const globalMoveUsageById = new Map((recentMoveUsageStats.moves ?? moveUsageStats.moves ?? []).map((move) => [toID(move.name), move.count ?? 0]));
const speciesOptions = [...generation.species]
  .filter((species) => !species.isNonstandard && championSpeciesIds.has(species.id))
  .sort((a, b) => {
    const usageDifference = getPokemonUsageCount(b.id) - getPokemonUsageCount(a.id);

    if (usageDifference !== 0) {
      return usageDifference;
    }

    return a.name.localeCompare(b.name);
  });
const moveOptions = [...generation.moves]
  .filter((move) => !move.isNonstandard)
  .sort((a, b) => a.name.localeCompare(b.name));
const itemOptions = [...generation.items]
  .filter((item) => !item.isNonstandard && championItemIds.has(item.id))
  .sort((a, b) => a.name.localeCompare(b.name));
const natureOptions = [...generation.natures].sort((a, b) => a.name.localeCompare(b.name));

const speciesById = new Map(speciesOptions.map((species) => [species.id, species]));
const moveById = new Map(moveOptions.map((move) => [move.id, move]));
const itemById = new Map(itemOptions.map((item) => [item.id, item]));
const natureByName = new Map(natureOptions.map((nature) => [nature.name, nature]));
const pokemonStatsById = new Map((pokemonStatsData.pokemon ?? []).map((pokemon) => [toID(pokemon.name), pokemon]));
const natureNames = natureOptions.map((nature) => nature.name);
const statPointOptions = Array.from({ length: CHAMPIONS_MAX_STAT_POINTS + 1 }, (_, index) => index);
const statStageOptions = Array.from({ length: 13 }, (_, index) => index - 6);
const moveUsageByPokemonId = new Map((recentPokemonEntries.length ? recentPokemonEntries : pokemonUsageStats.pokemon ?? []).map((pokemon) => {
  const usage = new Map();

  for (const set of pokemon.topSets ?? []) {
    for (const attack of set.attacks ?? []) {
      const moveId = toID(attack);
      usage.set(moveId, (usage.get(moveId) ?? 0) + (set.count ?? 0));
    }
  }

  return [toID(pokemon.id ?? pokemon.name), usage];
}));

const defaultIvs = Object.fromEntries(stats.map((stat) => [stat, 31]));
const defaultBoosts = Object.fromEntries(boostStats.map((stat) => [stat, 0]));
const defaultBattleModifiers = {
  isAuroraVeil: false,
  isCrit: false,
  isHelpingHand: false,
  isLightScreen: false,
  isReflect: false,
};
const emptyStatPoints = Object.fromEntries(stats.map((stat) => [stat, 0]));
const natureByBoostDrop = new Map([
  ['atk:spa', 'Adamant'],
  ['atk:spe', 'Brave'],
  ['spa:atk', 'Modest'],
  ['spa:spe', 'Quiet'],
  ['spe:atk', 'Timid'],
  ['spe:spa', 'Jolly'],
  ['def:atk', 'Bold'],
  ['def:spa', 'Impish'],
  ['spd:atk', 'Calm'],
  ['spd:spa', 'Careful'],
]);

function clampNumber(value, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.round(number)));
}

function getSpeciesRecord(name) {
  return speciesById.get(toID(name));
}

function getMoveRecord(name) {
  return moveById.get(toID(name));
}

function getItemRecord(name) {
  return itemById.get(toID(name));
}

function getPokemonUsageRecord(name) {
  return recentPokemonById.get(toID(name));
}

function getPokemonUsageCount(name) {
  return getPokemonUsageRecord(name)?.count ?? 0;
}

function getBaseAbilitiesForSpecies(name) {
  const species = getSpeciesRecord(name);
  const pokemonStats = pokemonStatsById.get(toID(name));

  if (!species) {
    return [];
  }

  const calcAbilities = Object.values(species.abilities ?? {}).filter(Boolean);
  const statsAbilities = pokemonStats?.abilities?.map((ability) => formatPascalCase(ability.name)) ?? [];

  return [...new Set([...calcAbilities, ...statsAbilities])];
}

function getAbilityUsageForSpecies(speciesName, abilityName) {
  const abilityId = toID(abilityName);
  const abilityUsage = getPokemonUsageRecord(speciesName)?.topAbilities?.find((ability) => toID(ability.ability) === abilityId);

  return abilityUsage?.count ?? 0;
}

function getAbilitiesForSpecies(name) {
  const baseAbilities = getBaseAbilitiesForSpecies(name);
  const usageAbilities = getPokemonUsageRecord(name)?.topAbilities
    ?.map((ability) => {
      const abilityId = toID(ability.ability);
      return baseAbilities.find((baseAbility) => toID(baseAbility) === abilityId) ?? formatPascalCase(ability.ability);
    }) ?? [];

  const sortedAbilities = [...new Set([...usageAbilities, ...baseAbilities])].sort((a, b) => {
    const usageDifference = getAbilityUsageForSpecies(name, b) - getAbilityUsageForSpecies(name, a);

    if (usageDifference !== 0) {
      return usageDifference;
    }

    return a.localeCompare(b);
  });

  return ['', ...sortedAbilities];
}

function getItemUsageForSpecies(speciesName, itemName) {
  const itemId = toID(itemName);
  const itemUsage = getPokemonUsageRecord(speciesName)?.topItems?.find((item) => toID(item.item) === itemId);

  return itemUsage?.count ?? 0;
}

function getItemOptionsForSpecies(name) {
  const usageItems = getPokemonUsageRecord(name)?.topItems
    ?.map((item) => getCanonicalItemName(item.item))
    .filter(Boolean) ?? [];
  const sortedItems = [...new Set([...usageItems, ...itemOptions.map((item) => item.name)])].sort((a, b) => {
    const usageDifference = getItemUsageForSpecies(name, b) - getItemUsageForSpecies(name, a);

    if (usageDifference !== 0) {
      return usageDifference;
    }

    return a.localeCompare(b);
  });

  return ['', ...sortedItems];
}

function getMoveUsageForSpecies(name, moveName) {
  return moveUsageByPokemonId.get(toID(name))?.get(toID(moveName)) ?? 0;
}

function getMoveOptionsForSpecies(name) {
  return [...moveOptions].sort((a, b) => {
    const usageDifference = getMoveUsageForSpecies(name, b.name) - getMoveUsageForSpecies(name, a.name);

    if (usageDifference !== 0) {
      return usageDifference;
    }

    const globalUsageDifference = (globalMoveUsageById.get(b.id) ?? 0) - (globalMoveUsageById.get(a.id) ?? 0);

    if (globalUsageDifference !== 0) {
      return globalUsageDifference;
    }

    return a.name.localeCompare(b.name);
  });
}

function getCanonicalMoveName(name) {
  return getMoveRecord(name)?.name ?? formatPascalCase(name);
}

function getCanonicalItemName(name) {
  if (!name) {
    return '';
  }

  return getItemRecord(name)?.name ?? formatPascalCase(name);
}

function getCanonicalAbilityName(speciesName, abilityName) {
  if (!abilityName) {
    return '';
  }

  const abilityId = toID(abilityName);
  const matchingAbility = getBaseAbilitiesForSpecies(speciesName).find((ability) => toID(ability) === abilityId);

  return matchingAbility ?? formatPascalCase(abilityName);
}

function getTopSetForSpecies(name) {
  return recentPokemonById.get(toID(name))?.topSets?.[0] ?? null;
}

function getHigherBaseStat(baseStats, first, second) {
  return (baseStats?.[first] ?? 0) >= (baseStats?.[second] ?? 0) ? first : second;
}

function getLowerBaseStat(baseStats, first, second) {
  return (baseStats?.[first] ?? 0) <= (baseStats?.[second] ?? 0) ? first : second;
}

function getNatureForStats(boostStat, dropStat) {
  return natureByBoostDrop.get(`${boostStat}:${dropStat}`) ?? 'Serious';
}

function makeDefaultStatPoints(primaryStat, secondaryStat, tertiaryStats = []) {
  const statPoints = { ...emptyStatPoints };
  let remaining = CHAMPIONS_TOTAL_STAT_POINTS;

  function invest(stat, amount) {
    if (!stat || remaining <= 0) {
      return;
    }

    const room = CHAMPIONS_MAX_STAT_POINTS - statPoints[stat];
    const points = Math.min(room, amount, remaining);
    statPoints[stat] += points;
    remaining -= points;
  }

  invest(primaryStat, CHAMPIONS_MAX_STAT_POINTS);
  invest(secondaryStat, CHAMPIONS_MAX_STAT_POINTS);

  for (const stat of tertiaryStats) {
    invest(stat, remaining);
  }

  return statPoints;
}

function getDefaultSpreadForSpecies(speciesName, moves, itemName = '') {
  const species = getSpeciesRecord(speciesName);

  if (!species) {
    return {
      nature: 'Serious',
      statPoints: { ...emptyStatPoints },
    };
  }

  const baseStats = species.baseStats;
  const bestAttackStat = getHigherBaseStat(baseStats, 'atk', 'spa');
  const worstAttackStat = getLowerBaseStat(baseStats, 'atk', 'spa');
  const otherAttackStat = bestAttackStat === 'atk' ? 'spa' : 'atk';
  const worstDefenseStat = getLowerBaseStat(baseStats, 'def', 'spd');
  const bestDefenseStat = worstDefenseStat === 'def' ? 'spd' : 'def';
  const tertiaryBulkStats = ['hp', worstDefenseStat, bestDefenseStat];
  const statusMoveCount = moves.filter((move) => getMoveRecord(move)?.category === 'Status').length;
  const hasChoiceScarf = toID(itemName) === 'choicescarf';

  if (hasChoiceScarf) {
    return {
      nature: getNatureForStats('spe', worstAttackStat),
      statPoints: makeDefaultStatPoints('spe', bestAttackStat, tertiaryBulkStats),
    };
  }

  if (statusMoveCount >= 3) {
    return {
      nature: getNatureForStats(worstDefenseStat, worstAttackStat),
      statPoints: makeDefaultStatPoints('hp', worstDefenseStat, tertiaryBulkStats),
    };
  }

  if (baseStats.spe <= 55) {
    return {
      nature: getNatureForStats(bestAttackStat, 'spe'),
      statPoints: makeDefaultStatPoints('hp', bestAttackStat, tertiaryBulkStats),
    };
  }

  if (baseStats.spe <= 80) {
    return {
      nature: getNatureForStats(bestAttackStat, otherAttackStat),
      statPoints: makeDefaultStatPoints('hp', bestAttackStat, tertiaryBulkStats),
    };
  }

  return {
    nature: getNatureForStats('spe', worstAttackStat),
    statPoints: makeDefaultStatPoints(bestAttackStat, 'spe', tertiaryBulkStats),
  };
}

function makePokemonConfigFromUsage(pokemon) {
  const species = getSpeciesRecord(pokemon?.name ?? pokemon?.id)?.name ?? formatPascalCase(pokemon?.name ?? pokemon?.id);
  const topSet = getTopSetForSpecies(species);
  const item = getCanonicalItemName(topSet?.item);
  const moves = (topSet?.attacks ?? [])
    .slice(0, 4)
    .map((move) => getCanonicalMoveName(move));

  while (moves.length < 4) {
    moves.push('');
  }

  const defaultSpread = getDefaultSpreadForSpecies(species, moves, item);

  return {
    species,
    ability: getCanonicalAbilityName(species, topSet?.ability),
    item,
    moves,
    nature: defaultSpread.nature,
    statPoints: defaultSpread.statPoints,
    boosts: { ...defaultBoosts },
    battleModifiers: { ...defaultBattleModifiers },
  };
}

function makePokemonConfigForSpecies(name) {
  const pokemon = recentPokemonById.get(toID(name)) ?? { name };

  return makePokemonConfigFromUsage(pokemon);
}

const defaultPokemonConfigs = (recentPokemonUsageStats.pokemon ?? [])
  .filter((pokemon) => getSpeciesRecord(pokemon.name ?? pokemon.id))
  .slice(0, 2)
  .map((pokemon) => makePokemonConfigFromUsage(pokemon));

const defaultPokemonOne = defaultPokemonConfigs[0] ?? makePokemonConfigForSpecies('Sneasler');
const defaultPokemonTwo = defaultPokemonConfigs[1] ?? makePokemonConfigForSpecies('Incineroar');

function normalizeStats(values, min, max) {
  return Object.fromEntries(stats.map((stat) => [stat, clampNumber(values[stat], min, max)]));
}

function normalizeStatPoints(values) {
  return normalizeStats(values ?? emptyStatPoints, 0, CHAMPIONS_MAX_STAT_POINTS);
}

function getStatPointTotal(values) {
  return stats.reduce((total, stat) => total + clampNumber(values?.[stat], 0, CHAMPIONS_MAX_STAT_POINTS), 0);
}

function clampStatPointChange(current, stat, value) {
  const currentPoints = normalizeStatPoints(current);
  const remainingForStat = CHAMPIONS_TOTAL_STAT_POINTS - getStatPointTotal(currentPoints) + currentPoints[stat];

  return clampNumber(value, 0, Math.min(CHAMPIONS_MAX_STAT_POINTS, remainingForStat));
}

function normalizeBoosts(values) {
  return Object.fromEntries(boostStats.map((stat) => [stat, clampNumber(values[stat], -6, 6)]));
}

function calcChampionsStat(species, nature, stat, statPoints) {
  const baseStat = calcStat(
    GEN,
    stat,
    species.baseStats[stat],
    defaultIvs[stat],
    0,
    CHAMPIONS_LEVEL,
    nature,
  );

  return baseStat + clampNumber(statPoints?.[stat], 0, CHAMPIONS_MAX_STAT_POINTS);
}

function getChampionsStats(config) {
  const species = getSpeciesRecord(config.species);

  if (!species) {
    return null;
  }

  const statPoints = normalizeStatPoints(config.statPoints);

  return Object.fromEntries(stats.map((stat) => [stat, calcChampionsStat(species, config.nature, stat, statPoints)]));
}

function applyChampionsStats(pokemon, championStats) {
  if (!championStats) {
    return pokemon;
  }

  // @smogon/calc clones Pokemon before calculating, so keep the direct SP stats on clones too.
  const defaultClone = Object.getPrototypeOf(pokemon).clone;

  function patch(target) {
    target.rawStats = { ...target.rawStats, ...championStats };
    target.stats = { ...target.stats, ...championStats };
    target.originalCurHP = championStats.hp;
    target.clone = function cloneWithChampionsStats() {
      return patch(defaultClone.call(this));
    };

    return target;
  }

  return patch(pokemon);
}

function makePokemon(config) {
  const species = getSpeciesRecord(config.species)?.name ?? config.species;
  const statPoints = normalizeStatPoints(config.statPoints);

  return applyChampionsStats(new CalcPokemon(GEN, species, {
    ability: config.ability || undefined,
    boosts: normalizeBoosts(config.boosts),
    evs: statPoints,
    item: config.item || undefined,
    ivs: defaultIvs,
    level: CHAMPIONS_LEVEL,
    nature: config.nature || 'Serious',
  }), getChampionsStats(config));
}

function flattenDamage(damage) {
  if (typeof damage === 'number') {
    return [damage];
  }

  if (Array.isArray(damage)) {
    return damage.flat(Infinity).filter((value) => typeof value === 'number');
  }

  return [];
}

function formatPercentRange(values, maxHp) {
  if (!values.length || !maxHp) {
    return '0% - 0%';
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const minPercent = ((min / maxHp) * 100).toFixed(1);
  const maxPercent = ((max / maxHp) * 100).toFixed(1);

  return `${minPercent}% - ${maxPercent}%`;
}

function formatHitCount(hitCount) {
  return hitCount <= 1 ? 'OHKO' : `${hitCount}HKO`;
}

function formatKoChance(desc, damageValues, maxHp) {
  const calcSummary = desc ? desc.split(' -- ').pop().trim().replace(/\.$/, '') : '';

  if (calcSummary && /(?:OHKO|\d+HKO)/i.test(calcSummary)) {
    return calcSummary;
  }

  if (!damageValues.length || !maxHp) {
    return 'KO chance unavailable';
  }

  const minDamage = Math.min(...damageValues);
  const maxDamage = Math.max(...damageValues);

  if (maxDamage <= 0) {
    return 'no KO chance';
  }

  const bestCaseHits = Math.max(1, Math.ceil(maxHp / maxDamage));
  const worstCaseHits = minDamage > 0 ? Math.max(1, Math.ceil(maxHp / minDamage)) : bestCaseHits;

  if (bestCaseHits === worstCaseHits) {
    return `guaranteed ${formatHitCount(bestCaseHits)}`;
  }

  return `${formatHitCount(bestCaseHits)} - ${formatHitCount(worstCaseHits)} range`;
}

function SelectField({ id, label, onChange, options, value }) {
  return (
    <label className="damage-calc-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option || 'none'} value={option}>
            {option || 'None'}
          </option>
        ))}
      </select>
    </label>
  );
}

function NatureEffect({ nature }) {
  const natureRecord = natureByName.get(nature);

  if (!natureRecord?.plus || !natureRecord?.minus) {
    return <span className="damage-calc-nature-effect">Neutral</span>;
  }

  return (
    <span className="damage-calc-nature-effect">
      <span className="damage-calc-nature-effect__up">+{statLabels[natureRecord.plus]}</span>
      <span className="damage-calc-nature-effect__down">-{statLabels[natureRecord.minus]}</span>
    </span>
  );
}

function NatureField({ id, onChange, value }) {
  return (
    <div className="damage-calc-field damage-calc-field--nature">
      <label htmlFor={id}>Nature</label>
      <div className="damage-calc-nature-control">
        <select id={id} onChange={(event) => onChange(event.target.value)} value={value}>
          {natureNames.map((nature) => (
            <option key={nature} value={nature}>
              {nature}
            </option>
          ))}
        </select>
        <NatureEffect nature={value} />
      </div>
    </div>
  );
}

function ToggleField({ checked, label, onChange }) {
  return (
    <label className="damage-calc-toggle">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

function TypeIcons({ types }) {
  return (
    <span className="damage-calc-types">
      {types.map((type) => {
        const icon = getTypeIcon(type);

        return icon ? <img alt={type} key={type} src={icon} /> : <span key={type}>{type}</span>;
      })}
    </span>
  );
}

function PokemonSearchRow({ config, id, onSpeciesChange }) {
  const species = getSpeciesRecord(config.species);
  const sprite = getPokemonSprite(species?.id ?? config.species);
  const nameLength = config.species.length;

  return (
    <div className="damage-calc-pokemon-search">
      {sprite ? (
        <img alt="" className="damage-calc-pokemon-search__sprite" loading="lazy" src={sprite} />
      ) : (
        <span aria-hidden="true" className="damage-calc-pokemon-search__sprite damage-calc-pokemon-search__sprite--empty" />
      )}
      <div className="damage-calc-pokemon-search__name">
        <label className="damage-calc-sr-only" htmlFor={id}>Pokemon</label>
        <select
          id={id}
          onChange={(event) => onSpeciesChange(event.target.value)}
          style={{ '--pokemon-name-length': nameLength }}
          value={config.species}
        >
          {speciesOptions.map((option) => (
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
      {species?.types?.length ? (
        <div className="damage-calc-type-field">
          <span>Type</span>
          <TypeIcons types={species.types} />
        </div>
      ) : null}
    </div>
  );
}

function StatEditor({ config, id, onNatureChange, onStatChange }) {
  const statPoints = normalizeStatPoints(config.statPoints);
  const statPointTotal = getStatPointTotal(statPoints);
  const statPointTotalId = `${id}-stat-point-total`;

  function getStatPointOptions(stat) {
    const remainingForStat = CHAMPIONS_TOTAL_STAT_POINTS - statPointTotal + statPoints[stat];
    const max = Math.min(CHAMPIONS_MAX_STAT_POINTS, remainingForStat);

    return statPointOptions.filter((points) => points <= max);
  }

  return (
    <section className="damage-calc-section damage-calc-stats-section">
      <span className="damage-calc-section__label">Stats</span>
      <NatureField
        id={`${id}-nature`}
        onChange={onNatureChange}
        value={config.nature}
      />
      <div className="damage-calc-field damage-calc-stat-total">
        <label htmlFor={statPointTotalId}>Stat Points</label>
        <output id={statPointTotalId}>{statPointTotal} / {CHAMPIONS_TOTAL_STAT_POINTS}</output>
      </div>
      <div className="damage-calc-stat-grid damage-calc-stat-grid--champions">
        <span>Stat</span>
        <span>Stat Points</span>
        <span>Stat Stage</span>
        {stats.map((stat) => (
          <React.Fragment key={stat}>
            <strong>{statLabels[stat]}</strong>
            <select
              aria-label={`${statLabels[stat]} stat points`}
              onChange={(event) => onStatChange('statPoints', stat, event.target.value)}
              value={statPoints[stat]}
            >
              {getStatPointOptions(stat).map((points) => (
                <option key={points} value={points}>
                  {points}
                </option>
              ))}
            </select>
            {stat === 'hp' ? (
              <span aria-hidden="true" />
            ) : (
              <select
                aria-label={`${statLabels[stat]} boost`}
                onChange={(event) => onStatChange('boosts', stat, clampNumber(event.target.value, -6, 6))}
                value={config.boosts[stat]}
              >
                {statStageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage > 0 ? `+${stage}` : stage}
                  </option>
                ))}
              </select>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

function BattleModifiersEditor({ config, onChange }) {
  const modifiers = {
    ...defaultBattleModifiers,
    ...(config.battleModifiers ?? {}),
  };

  return (
    <section className="damage-calc-section damage-calc-battle-section">
      <span className="damage-calc-section__label">Battle</span>
      <div className="damage-calc-toggle-grid">
        <ToggleField
          checked={modifiers.isHelpingHand}
          label="Helping Hand"
          onChange={(value) => onChange('isHelpingHand', value)}
        />
        <ToggleField checked={modifiers.isCrit} label="Critical Hit" onChange={(value) => onChange('isCrit', value)} />
        <ToggleField checked={modifiers.isReflect} label="Reflect" onChange={(value) => onChange('isReflect', value)} />
        <ToggleField
          checked={modifiers.isLightScreen}
          label="Light Screen"
          onChange={(value) => onChange('isLightScreen', value)}
        />
        <ToggleField
          checked={modifiers.isAuroraVeil}
          label="Aurora Veil"
          onChange={(value) => onChange('isAuroraVeil', value)}
        />
      </div>
    </section>
  );
}

function MoveDamageControl({ id, index, moveOptionsForSpecies, onMoveChange, result, value }) {
  const totalClassName = result.isTopDamage
    ? 'damage-calc-move-total__text damage-calc-move-total__text--best'
    : 'damage-calc-move-total__text';

  return (
    <div className="damage-calc-move-slot">
      <label className="damage-calc-sr-only" htmlFor={`${id}-move-${index + 1}`}>Move {index + 1}</label>
      <select
        id={`${id}-move-${index + 1}`}
        onChange={(event) => onMoveChange(index, event.target.value)}
        value={value}
      >
        <option value="">Choose a move</option>
        {moveOptionsForSpecies.map((move) => (
          <option key={move.id} value={move.name}>
            {move.name}
          </option>
        ))}
      </select>
      <div className="damage-calc-move-total">
        {result.error ? (
          <span className="damage-calc-move-total__error">{result.error}</span>
        ) : (
          <span className={totalClassName}>
            <span>{result.percentLabel}</span>
            <span className="damage-calc-move-total__ko">({result.koChanceLabel})</span>
          </span>
        )}
      </div>
    </div>
  );
}

function MovesetEditor({ config, field, id, moveOptionsForSpecies, onMoveChange, opponent }) {
  const results = useMemo(
    () => (config.moves ?? []).slice(0, 4).map((move) => calculateMoveResult(config, opponent, field, move)),
    [config, field, opponent],
  );
  const highestDamage = Math.max(
    ...results
      .filter((result) => !result.error && result.damageValues?.length)
      .map((result) => Math.max(...result.damageValues)),
  );

  return (
    <section className="damage-calc-section damage-calc-moveset">
      <span className="damage-calc-moveset__label">Moves</span>
      {Array.from({ length: 4 }, (_, index) => (
        <MoveDamageControl
          id={id}
          key={`${id}-move-${index + 1}`}
          index={index}
          moveOptionsForSpecies={moveOptionsForSpecies}
          onMoveChange={onMoveChange}
          result={{
            ...(results[index] ?? { error: 'Choose a move.', moveName: config.moves?.[index] }),
            isTopDamage:
              Number.isFinite(highestDamage)
              && Math.max(...(results[index]?.damageValues ?? [])) === highestDamage,
          }}
          value={config.moves?.[index] ?? ''}
        />
      ))}
    </section>
  );
}

function PokemonPanel({ config, field, id, moveOptionsForSpecies, onChange, opponent }) {
  const abilityOptions = getAbilitiesForSpecies(config.species);
  const itemOptionsForSpecies = getItemOptionsForSpecies(config.species);

  function updateField(field, value) {
    onChange((current) => {
      const next = { ...current, [field]: value };

      if (field === 'species') {
        return getSpeciesRecord(value) ? makePokemonConfigForSpecies(value) : next;
      }

      return next;
    });
  }

  function updateStat(group, stat, value) {
    onChange((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [stat]: group === 'statPoints' ? clampStatPointChange(current[group], stat, value) : value,
      },
    }));
  }

  function updateBattleModifier(modifier, value) {
    onChange((current) => ({
      ...current,
      battleModifiers: {
        ...defaultBattleModifiers,
        ...(current.battleModifiers ?? {}),
        [modifier]: value,
      },
    }));
  }

  function updateMove(index, value) {
    onChange((current) => {
      const nextMoves = [...(current.moves ?? ['', '', '', ''])];
      nextMoves[index] = value;

      return {
        ...current,
        moves: nextMoves,
      };
    });
  }

  return (
    <article className="damage-calc-card">
      <PokemonSearchRow config={config} id={`${id}-species`} onSpeciesChange={(value) => updateField('species', value)} />

      <div className="damage-calc-card__controls">
        <SelectField
          id={`${id}-ability`}
          label="Ability"
          onChange={(value) => updateField('ability', value)}
          options={abilityOptions}
          value={abilityOptions.includes(config.ability) ? config.ability : ''}
        />
        <SelectField
          id={`${id}-item`}
          label="Item"
          onChange={(value) => updateField('item', value)}
          options={itemOptionsForSpecies}
          value={itemOptionsForSpecies.includes(config.item) ? config.item : ''}
        />
      </div>

      <MovesetEditor
        config={config}
        field={field}
        id={id}
        moveOptionsForSpecies={moveOptionsForSpecies}
        onMoveChange={updateMove}
        opponent={opponent}
      />

      <StatEditor
        config={config}
        id={id}
        onNatureChange={(value) => updateField('nature', value)}
        onStatChange={updateStat}
      />

      <BattleModifiersEditor config={config} onChange={updateBattleModifier} />
    </article>
  );
}

function getBattleModifiers(config) {
  return {
    ...defaultBattleModifiers,
    ...(config.battleModifiers ?? {}),
  };
}

function makeDamageField(field, attacker, defender) {
  const attackerModifiers = getBattleModifiers(attacker);
  const defenderModifiers = getBattleModifiers(defender);

  return new Field({
    gameType: CHAMPIONS_GAME_TYPE,
    terrain: field.terrain || undefined,
    weather: field.weather || undefined,
    attackerSide: {
      isHelpingHand: attackerModifiers.isHelpingHand,
    },
    defenderSide: {
      isAuroraVeil: defenderModifiers.isAuroraVeil,
      isLightScreen: defenderModifiers.isLightScreen,
      isReflect: defenderModifiers.isReflect,
    },
  });
}

function calculateMoveResult(attacker, defender, field, moveName) {
  if (!moveName) {
    return {
      error: 'Choose a move.',
      moveName,
    };
  }

  try {
    const attackerPokemon = makePokemon(attacker);
    const defenderPokemon = makePokemon(defender);
    const moveRecord = getMoveRecord(moveName);
    const move = new CalcMove(GEN, moveRecord?.name ?? moveName, {
      ability: attacker.ability || undefined,
      isCrit: getBattleModifiers(attacker).isCrit,
      item: attacker.item || undefined,
      species: getSpeciesRecord(attacker.species)?.name ?? attacker.species,
    });
    const calculation = calculate(GEN, attackerPokemon, defenderPokemon, move, makeDamageField(field, attacker, defender));
    const damageValues = flattenDamage(calculation.damage);
    const maxHp = defenderPokemon.maxHP();
    const desc = calculation.desc();

    return {
      category: move.category,
      damageValues,
      desc,
      error: null,
      koChanceLabel: formatKoChance(desc, damageValues, maxHp),
      maxHp,
      moveName: move.name,
      moveType: move.type,
      percentLabel: formatPercentRange(damageValues, maxHp),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unable to calculate damage.',
      moveName,
    };
  }
}

export function DamageCalcView() {
  const [pokemonOne, setPokemonOne] = useState(defaultPokemonOne);
  const [pokemonTwo, setPokemonTwo] = useState(defaultPokemonTwo);
  const [field, setField] = useState({
    terrain: 'Electric',
    weather: '',
  });
  const pokemonOneMoveOptions = useMemo(() => getMoveOptionsForSpecies(pokemonOne.species), [pokemonOne.species]);
  const pokemonTwoMoveOptions = useMemo(() => getMoveOptionsForSpecies(pokemonTwo.species), [pokemonTwo.species]);

  function updateField(fieldName, value) {
    setField((current) => ({
      ...current,
      [fieldName]: value,
    }));
  }

  return (
    <section className="workspace damage-calc-workspace">
      <header className="workspace-header damage-calc__head">
        <div>
          <h1 id="damage-calc-title">
            <Calculator size={34} aria-hidden="true" />
            Damage Calc
          </h1>
          <span className="damage-calc-format-pill">Pokemon Champions Doubles</span>
        </div>
      </header>

      <section className="damage-calc" aria-labelledby="damage-calc-title">
        <div className="damage-calc__grid">
          <PokemonPanel
            config={pokemonOne}
            field={field}
            id="pokemon-one"
            moveOptionsForSpecies={pokemonOneMoveOptions}
            onChange={setPokemonOne}
            opponent={pokemonTwo}
          />
          <PokemonPanel
            config={pokemonTwo}
            field={field}
            id="pokemon-two"
            moveOptionsForSpecies={pokemonTwoMoveOptions}
            onChange={setPokemonTwo}
            opponent={pokemonOne}
          />

          <article className="damage-calc-card damage-calc-card--field">
            <header className="damage-calc-card__header">
              <Calculator size={19} aria-hidden="true" />
              <h2>Field</h2>
            </header>
            <div className="damage-calc-card__controls">
              <SelectField
                id="damage-calc-weather"
                label="Weather"
                onChange={(value) => updateField('weather', value)}
                options={weatherOptions}
                value={field.weather}
              />
              <SelectField
                id="damage-calc-terrain"
                label="Terrain"
                onChange={(value) => updateField('terrain', value)}
                options={terrainOptions}
                value={field.terrain}
              />
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}
