import React, { useMemo, useState } from 'react';
import { BarChart3, Calculator, ChevronDown, ChevronRight, X } from 'lucide-react';
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
import { RankPill } from '../common/RankPill';
import { getPokemonSprite, getTypeIcon } from '../../utils/assets';
import { formatPascalCase } from '../../utils/format';

const GEN = 9;
const CHAMPIONS_LEVEL = 50;
const CHAMPIONS_GAME_TYPE = 'Doubles';
const CHAMPIONS_MAX_STAT_POINTS = 32;
const CHAMPIONS_TOTAL_STAT_POINTS = 66;
const LAST_RESPECTS_REPORTING_BASE_POWER = 100;
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
const matchupCategories = {
  immune: 'Immune',
  extremeResist: 'Extreme Resist',
  resist: 'Resist',
  neutral: 'Neutral',
  super: 'Super Effective',
  extremeSuper: 'Extremely Effective',
};
const typeEffectivenessChart = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 },
};

const championItemIds = new Set((itemUsageStats.items ?? []).map((item) => toID(item.name)));
const recentPokemonEntries = recentPokemonUsageStats.pokemon ?? [];
const recentPokemonById = new Map(recentPokemonEntries.map((pokemon) => [toID(pokemon.id ?? pokemon.name), pokemon]));
const pokemonStatsEntries = pokemonStatsData.pokemon ?? [];
const globalMoveUsageById = new Map((recentMoveUsageStats.moves ?? moveUsageStats.moves ?? []).map((move) => [toID(move.name), move.count ?? 0]));
const speciesOptions = pokemonStatsEntries
  .map((pokemon) => makeSiteSpeciesOption(pokemon))
  .filter((species) => species.calcName)
  .sort((a, b) => {
    const usageDifference = getPokemonUsageCountForAliases(b.usageAliases) - getPokemonUsageCountForAliases(a.usageAliases);

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

const speciesById = buildSpeciesLookup(speciesOptions);
const moveById = new Map(moveOptions.map((move) => [move.id, move]));
const itemById = new Map(itemOptions.map((item) => [item.id, item]));
const natureByName = new Map(natureOptions.map((nature) => [nature.name, nature]));
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

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function formatSitePokemonName(value) {
  return String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word
      .split('-')
      .map((part, index) => {
        if (!part) {
          return part;
        }

        if (index > 0 && part.length === 1) {
          return part.toLowerCase();
        }

        return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
      })
      .join('-'))
    .join(' ');
}

function getCalcSpeciesCandidateNames(pokemon) {
  const pokeApiName = pokemon?.pokeApiName ?? '';
  const pokeApiCandidates = [
    pokeApiName,
    pokeApiName.replace(/-breed$/i, ''),
    pokeApiName.replace(/-female$/i, '-f'),
    pokeApiName.replace(/-male$/i, ''),
    pokeApiName.replace(/-family-of-four$/i, ''),
    pokeApiName.replace(/-zero$/i, ''),
    pokeApiName.replace(/-disguised$/i, ''),
    pokeApiName.replace(/-average$/i, ''),
    pokeApiName.replace(/-full-belly$/i, ''),
    pokeApiName.replace(/-midday$/i, ''),
  ];

  return uniqueValues([...pokeApiCandidates, pokemon?.name]);
}

function getSpriteIdForPokemon(pokemon, displayName, calcSpecies) {
  const candidates = uniqueValues([
    ...getCalcSpeciesCandidateNames(pokemon),
    pokemon?.name,
    displayName,
    calcSpecies?.name,
    calcSpecies?.id,
  ]);

  return candidates.find((candidate) => getPokemonSprite(candidate)) ?? pokemon?.name ?? displayName;
}

function getCalcSpeciesForPokemon(pokemon) {
  for (const candidate of getCalcSpeciesCandidateNames(pokemon)) {
    const species = generation.species.get(toID(candidate));

    if (species && !species.isNonstandard) {
      return species;
    }
  }

  return null;
}

function toCalcBaseStats(baseStats = {}) {
  return {
    hp: baseStats.hp ?? 0,
    atk: baseStats.attack ?? baseStats.atk ?? 0,
    def: baseStats.defense ?? baseStats.def ?? 0,
    spa: baseStats.specialAttack ?? baseStats.spa ?? 0,
    spd: baseStats.specialDefense ?? baseStats.spd ?? 0,
    spe: baseStats.speed ?? baseStats.spe ?? 0,
  };
}

function makeSiteSpeciesOption(pokemon) {
  const calcSpecies = getCalcSpeciesForPokemon(pokemon);
  const name = formatSitePokemonName(pokemon?.name ?? calcSpecies?.name);
  const calcCandidateIds = getCalcSpeciesCandidateNames(pokemon).map((candidate) => toID(candidate));
  const usageAliases = uniqueValues([
    ...calcCandidateIds,
    calcSpecies?.id,
    toID(pokemon?.name),
    toID(name),
  ]);
  const lookupKeys = uniqueValues([
    name,
    pokemon?.name,
    pokemon?.pokeApiName,
    calcSpecies?.name,
    calcSpecies?.id,
    ...usageAliases,
  ]);
  const types = (pokemon?.typing?.length ? pokemon.typing : calcSpecies?.types ?? [])
    .map((type) => formatPascalCase(type));

  return {
    id: uniqueValues([toID(pokemon?.pokeApiName), toID(pokemon?.name), calcSpecies?.id])[0],
    name,
    calcName: calcSpecies?.name ?? '',
    baseStats: calcSpecies?.baseStats ?? toCalcBaseStats(pokemon?.baseStats),
    abilities: calcSpecies?.abilities ?? {},
    lookupKeys,
    pokemonStats: pokemon,
    spriteId: getSpriteIdForPokemon(pokemon, name, calcSpecies),
    types,
    usageAliases,
  };
}

function buildSpeciesLookup(options) {
  const lookup = new Map();

  for (const species of options) {
    for (const key of species.lookupKeys) {
      if (key && !lookup.has(key)) {
        lookup.set(key, species);
      }
    }
  }

  return lookup;
}

function getSpeciesRecord(name) {
  return speciesById.get(name) ?? speciesById.get(toID(name));
}

function getMoveRecord(name) {
  return moveById.get(toID(name));
}

function getItemRecord(name) {
  return itemById.get(toID(name));
}

function getPokemonUsageRecordForAliases(aliases) {
  for (const alias of aliases) {
    const record = recentPokemonById.get(alias);

    if (record) {
      return record;
    }
  }

  return null;
}

function getPokemonUsageCountForAliases(aliases) {
  return getPokemonUsageRecordForAliases(aliases)?.count ?? 0;
}

function getPokemonUsageRecord(name) {
  const species = getSpeciesRecord(name);
  const aliases = species?.usageAliases ?? [toID(name)];

  return getPokemonUsageRecordForAliases(aliases);
}

function getBaseAbilitiesForSpecies(name) {
  const species = getSpeciesRecord(name);
  const pokemonStats = species?.pokemonStats;

  if (!species && !pokemonStats) {
    return [];
  }

  const calcAbilities = Object.values(species?.abilities ?? {}).filter(Boolean);
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
  const species = getSpeciesRecord(name);
  const aliases = species?.usageAliases ?? [toID(name)];

  for (const alias of aliases) {
    const usage = moveUsageByPokemonId.get(alias)?.get(toID(moveName));

    if (usage) {
      return usage;
    }
  }

  return 0;
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
  return getPokemonUsageRecord(name)?.topSets?.[0] ?? null;
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
  const itemId = toID(itemName);
  const hasChoiceScarf = itemId === 'choicescarf';
  const hasFocusSash = itemId === 'focussash';

  if (hasChoiceScarf || hasFocusSash) {
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
  const species = getSpeciesRecord(pokemon?.name ?? pokemon?.id)?.name ?? formatSitePokemonName(pokemon?.name ?? pokemon?.id);
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
  const pokemon = getPokemonUsageRecord(name) ?? { name };

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
  const species = getSpeciesRecord(config.species)?.calcName ?? config.species;
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

function getDamageRollTotals(damage) {
  if (typeof damage === 'number') {
    return [damage];
  }

  if (!Array.isArray(damage)) {
    return [];
  }

  if (damage.every((value) => typeof value === 'number')) {
    return damage;
  }

  const rollGroups = damage
    .map((value) => getDamageRollTotals(value))
    .filter((values) => values.length);

  if (!rollGroups.length) {
    return [];
  }

  const rollCount = Math.max(...rollGroups.map((values) => values.length));

  return Array.from({ length: rollCount }, (_, index) => rollGroups.reduce((total, values) => {
    const fallback = index === 0 ? Math.min(...values) : Math.max(...values);

    return total + (values[index] ?? fallback);
  }, 0));
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

function getTypeMatchupMultiplier(moveType, defenderTypes = []) {
  if (!moveType) {
    return 1;
  }

  return defenderTypes.reduce((multiplier, defenderType) => (
    multiplier * (typeEffectivenessChart[moveType]?.[defenderType] ?? 1)
  ), 1);
}

function getMatchupCategory(multiplier) {
  if (multiplier === 0) {
    return 'immune';
  }

  if (multiplier >= 4) {
    return 'extremeSuper';
  }

  if (multiplier > 1) {
    return 'super';
  }

  if (multiplier > 0 && multiplier < 0.5) {
    return 'extremeResist';
  }

  if (multiplier < 1) {
    return 'resist';
  }

  return 'neutral';
}

function makeEmptyMatchupCounts() {
  return Object.fromEntries(Object.keys(matchupCategories).map((category) => [category, 0]));
}

function countTypeMatchups(matchups) {
  return matchups.reduce((counts, matchup) => {
    counts[matchup.category] += 1;
    return counts;
  }, makeEmptyMatchupCounts());
}

function cleanKoChanceLabel(label) {
  return String(label ?? '')
    .replace(/\s+after\s+.*$/i, '')
    .trim();
}

function formatStatPointSummary(statPoints) {
  const normalized = normalizeStatPoints(statPoints);

  return stats.map((stat) => `${statLabels[stat]} ${normalized[stat]}`).join(' / ');
}

function getAverageDamagePercent(result) {
  if (!result?.damageValues?.length || !result.maxHp) {
    return null;
  }

  const averageDamage = result.damageValues.reduce((total, value) => total + value, 0) / result.damageValues.length;

  return (averageDamage / result.maxHp) * 100;
}

function getAverageDamagePercentFromRows(rows) {
  const values = rows
    .map((row) => row.averageDamagePercent)
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatAverageDamagePercent(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : 'No damage calc';
}

function interpolateColor(start, end, amount) {
  const ratio = clampNumber(amount, 0, 1);
  const channel = (index) => Math.round(start[index] + ((end[index] - start[index]) * ratio));

  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function getAverageDamageColor(value, isInverse = false) {
  const clamped = clampNumber(Number.isFinite(value) ? value : 0, 0, 100);
  const scaledValue = isInverse ? 100 - clamped : clamped;
  const stops = [
    { value: 0, color: [127, 29, 29] },
    { value: 25, color: [249, 115, 22] },
    { value: 50, color: [254, 240, 138] },
    { value: 75, color: [34, 197, 94] },
    { value: 100, color: [96, 165, 250] },
  ];

  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1];
    const next = stops[index];

    if (scaledValue <= next.value) {
      return interpolateColor(previous.color, next.color, (scaledValue - previous.value) / (next.value - previous.value));
    }
  }

  return interpolateColor(stops[stops.length - 1].color, stops[stops.length - 1].color, 1);
}

function getAnalysisMoves(config) {
  return (config.moves ?? [])
    .slice(0, 4)
    .map((move) => getMoveRecord(move))
    .filter((move) => move && move.category !== 'Status');
}

function getTopMetaConfigs(limit = 20) {
  return recentPokemonEntries
    .filter((pokemon) => getSpeciesRecord(pokemon.name ?? pokemon.id))
    .slice(0, limit)
    .map((pokemon, index) => ({
      config: makePokemonConfigFromUsage(pokemon),
      rank: pokemon.rank ?? index + 1,
    }));
}

function makeMetaDamageRows(config, field, metaEntries) {
  const moves = (config.moves ?? []).slice(0, 4).filter((move) => getMoveRecord(move)?.category !== 'Status');

  return metaEntries.map(({ config: target, rank }) => {
    const results = moves
      .map((move) => calculateMoveResult(config, target, field, move))
      .filter((result) => !result.error && result.damageValues?.length);
    const bestResult = results.reduce((best, result) => {
      const maxDamage = Math.max(...result.damageValues);

      return !best || maxDamage > best.maxDamage ? { ...result, maxDamage } : best;
    }, null);

    return {
      averageDamagePercent: getAverageDamagePercent(bestResult),
      rank,
      species: target.species,
      item: target.item,
      move: bestResult?.moveName ?? 'No damaging move',
      percentLabel: bestResult?.percentLabel ?? 'No damage calc',
      koChanceLabel: cleanKoChanceLabel(bestResult?.koChanceLabel ?? 'Unavailable'),
    };
  });
}

function makeDefensiveDamageRows(config, field, metaEntries) {
  return metaEntries.map(({ config: attacker, rank }) => {
    const moves = (attacker.moves ?? []).slice(0, 4).filter((move) => getMoveRecord(move)?.category !== 'Status');
    const results = moves
      .map((move) => calculateMoveResult(attacker, config, field, move))
      .filter((result) => !result.error && result.damageValues?.length);
    const bestResult = results.reduce((best, result) => {
      const maxDamage = Math.max(...result.damageValues);

      return !best || maxDamage > best.maxDamage ? { ...result, maxDamage } : best;
    }, null);

    return {
      averageDamagePercent: getAverageDamagePercent(bestResult),
      rank,
      species: attacker.species,
      item: attacker.item,
      move: bestResult?.moveName ?? 'No damaging move',
      percentLabel: bestResult?.percentLabel ?? 'No damage calc',
      koChanceLabel: cleanKoChanceLabel(bestResult?.koChanceLabel ?? 'Unavailable'),
    };
  });
}

function makeOffensiveMetaMatchup(config, metaEntries) {
  const uniqueMoveTypes = uniqueValues(getAnalysisMoves(config).map((move) => move.type));
  const matchups = [];

  for (const type of uniqueMoveTypes) {
    for (const { config: target } of metaEntries) {
      const targetTypes = getSpeciesRecord(target.species)?.types ?? [];
      const multiplier = getTypeMatchupMultiplier(type, targetTypes);

      matchups.push({
        category: getMatchupCategory(multiplier),
        multiplier,
        species: target.species,
        type,
      });
    }
  }

  const counts = countTypeMatchups(matchups);

  return {
    counts,
    uniqueTypes: uniqueMoveTypes,
  };
}

function makeDefensiveMetaMatchup(config, metaEntries) {
  const defenderTypes = getSpeciesRecord(config.species)?.types ?? [];
  const matchups = [];

  for (const { config: attacker } of metaEntries) {
    const moves = getAnalysisMoves(attacker);
    for (const move of moves) {
      const multiplier = getTypeMatchupMultiplier(move.type, defenderTypes);

      matchups.push({
        category: getMatchupCategory(multiplier),
        move: move.name,
        multiplier,
        species: attacker.species,
        type: move.type,
      });
    }
  }

  const counts = countTypeMatchups(matchups);

  return {
    counts,
  };
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

function NatureField({ id, onChange, value }) {
  return (
    <div className="damage-calc-field damage-calc-field--nature">
      <label htmlFor={id}>Nature</label>
      <select id={id} onChange={(event) => onChange(event.target.value)} value={value}>
        {natureNames.map((nature) => (
          <option key={nature} value={nature}>
            {nature}
          </option>
        ))}
      </select>
    </div>
  );
}

function getNatureStatLabelClass(natureRecord, stat) {
  if (natureRecord?.plus === stat) {
    return 'damage-calc-stat-label damage-calc-stat-label--up';
  }

  if (natureRecord?.minus === stat) {
    return 'damage-calc-stat-label damage-calc-stat-label--down';
  }

  return 'damage-calc-stat-label';
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
  const sprite = getPokemonSprite(species?.spriteId ?? species?.id ?? config.species);
  const nameLength = (species?.name ?? config.species).length;

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
          <span className="damage-calc-type-names">{species.types.join(' / ')}</span>
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
  const natureRecord = natureByName.get(config.nature);

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
            <strong className={getNatureStatLabelClass(natureRecord, stat)}>{statLabels[stat]}</strong>
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
      </div>
    </section>
  );
}

function MoveDamageControl({ id, index, moveOptionsForSpecies, onMoveChange, result, value }) {
  const totalClassName = result.isTopDamage
    ? 'damage-calc-move-total__text damage-calc-move-total__text--best'
    : 'damage-calc-move-total__text';
  const isStatusMove = result.category === 'Status';

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
        ) : isStatusMove ? (
          <span aria-hidden="true" className="damage-calc-move-total__text damage-calc-move-total__text--empty">
            <span>&nbsp;</span>
            <span className="damage-calc-move-total__ko">&nbsp;</span>
          </span>
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

function MatchupChart({ counts, mode = 'offense' }) {
  return (
    <div className={`damage-calc-matchup-chart damage-calc-matchup-chart--${mode}`}>
      {Object.entries(matchupCategories).map(([category, label]) => (
        <div className={`damage-calc-matchup-stat damage-calc-matchup-stat--${category}`} key={category}>
          <strong>{counts[category] ?? 0}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function AverageDamageMetric({ isInverse = false, label, value }) {
  return (
    <div className="damage-calc-average-damage">
      <span>{label}</span>
      <strong style={{ color: getAverageDamageColor(value, isInverse) }}>{formatAverageDamagePercent(value)}</strong>
    </div>
  );
}

function ExpandButton({ isExpanded, label, onClick }) {
  const Icon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <button className="damage-calc-expand-button" type="button" onClick={onClick}>
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  );
}

function DamageRowsGrid({ rows }) {
  return (
    <div className="damage-calc-analysis-table">
      {rows.map((row) => (
        <div key={`${row.rank}-${row.species}`} className="damage-calc-analysis-row">
          <div className="damage-calc-analysis-row__pokemon">
            <RankPill>{row.rank}</RankPill>
            <strong>{row.species}</strong>
          </div>
          <span>{row.move}</span>
          <span>{row.percentLabel}</span>
          <small>{row.koChanceLabel}</small>
        </div>
      ))}
    </div>
  );
}

function MetaAnalysisModal({ config, field, onClose }) {
  const [showOffensiveDamage, setShowOffensiveDamage] = useState(false);
  const [showDefensiveDamage, setShowDefensiveDamage] = useState(false);
  const species = getSpeciesRecord(config.species);
  const metaEntries = useMemo(() => getTopMetaConfigs(20), []);
  const damageRows = useMemo(() => makeMetaDamageRows(config, field, metaEntries), [config, field, metaEntries]);
  const defensiveDamageRows = useMemo(() => makeDefensiveDamageRows(config, field, metaEntries), [config, field, metaEntries]);
  const offensiveMatchup = useMemo(() => makeOffensiveMetaMatchup(config, metaEntries), [config, metaEntries]);
  const defensiveMatchup = useMemo(() => makeDefensiveMetaMatchup(config, metaEntries), [config, metaEntries]);
  const offensiveAverageDamage = useMemo(() => getAverageDamagePercentFromRows(damageRows), [damageRows]);
  const defensiveAverageDamage = useMemo(() => getAverageDamagePercentFromRows(defensiveDamageRows), [defensiveDamageRows]);
  const sprite = getPokemonSprite(species?.spriteId ?? species?.id ?? config.species);

  return (
    <div className="damage-calc-modal" role="dialog" aria-modal="true" aria-labelledby="damage-calc-meta-title">
      <div className="damage-calc-modal__backdrop" onClick={onClose} />
      <article className="damage-calc-modal__card">
        <header className="damage-calc-modal__header">
          <div className="damage-calc-modal__pokemon">
            {sprite ? <img alt="" src={sprite} /> : null}
            <div>
              <h2 id="damage-calc-meta-title">Meta Analysis</h2>
              <strong>{config.species}</strong>
              <span>{species?.types?.join(' / ')}</span>
            </div>
          </div>
          <button className="damage-calc-icon-button" type="button" onClick={onClose} aria-label="Close meta analysis">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <section className="damage-calc-analysis-summary">
          <span><strong>Ability</strong>{config.ability || 'None'}</span>
          <span><strong>Item</strong>{config.item || 'None'}</span>
          <span><strong>Nature</strong>{config.nature}</span>
          <span><strong>Stat Points</strong>{formatStatPointSummary(config.statPoints)}</span>
          <span><strong>Moves</strong>{(config.moves ?? []).filter(Boolean).join(' / ') || 'None'}</span>
        </section>

        <div className="damage-calc-analysis-grid">
          <section className="damage-calc-analysis-section damage-calc-analysis-section--wide">
            <h3>Offensive Meta Matchup</h3>
            {offensiveMatchup.uniqueTypes.length ? (
              <>
                <AverageDamageMetric label="Average Damage Dealt %" value={offensiveAverageDamage} />
                <div className="damage-calc-analysis-type-line">
                  <strong>Move Types</strong>
                  <span>{offensiveMatchup.uniqueTypes.join(' / ')}</span>
                </div>
                <MatchupChart counts={offensiveMatchup.counts} />
              </>
            ) : (
              <p className="damage-calc-analysis-empty">Choose at least one damaging move.</p>
            )}
            <ExpandButton
              isExpanded={showOffensiveDamage}
              label={`${showOffensiveDamage ? 'Hide' : 'Show'} Best Damage Into Top 20`}
              onClick={() => setShowOffensiveDamage((current) => !current)}
            />
            {showOffensiveDamage ? <DamageRowsGrid rows={damageRows} /> : null}
          </section>

          <section className="damage-calc-analysis-section damage-calc-analysis-section--wide">
            <h3>Defensive Meta Matchup</h3>
            <AverageDamageMetric isInverse label="Average Damage Taken %" value={defensiveAverageDamage} />
            <MatchupChart counts={defensiveMatchup.counts} mode="defense" />
            <ExpandButton
              isExpanded={showDefensiveDamage}
              label={`${showDefensiveDamage ? 'Hide' : 'Show'} Top 20 Best Moves Into Us`}
              onClick={() => setShowDefensiveDamage((current) => !current)}
            />
            {showDefensiveDamage ? <DamageRowsGrid rows={defensiveDamageRows} /> : null}
          </section>
        </div>
      </article>
    </div>
  );
}

function PokemonPanel({ config, field, id, moveOptionsForSpecies, onChange, opponent }) {
  const [isMetaAnalysisOpen, setIsMetaAnalysisOpen] = useState(false);
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

      <hr className="damage-calc-divider" />

      <MovesetEditor
        config={config}
        field={field}
        id={id}
        moveOptionsForSpecies={moveOptionsForSpecies}
        onMoveChange={updateMove}
        opponent={opponent}
      />

      <hr className="damage-calc-divider" />

      <StatEditor
        config={config}
        id={id}
        onNatureChange={(value) => updateField('nature', value)}
        onStatChange={updateStat}
      />

      <hr className="damage-calc-divider" />

      <BattleModifiersEditor config={config} onChange={updateBattleModifier} />

      <hr className="damage-calc-divider" />

      <button className="damage-calc-meta-button" type="button" onClick={() => setIsMetaAnalysisOpen(true)}>
        <BarChart3 size={16} aria-hidden="true" />
        Meta Analysis
      </button>

      {isMetaAnalysisOpen ? (
        <MetaAnalysisModal config={config} field={field} onClose={() => setIsMetaAnalysisOpen(false)} />
      ) : null}
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
      isLightScreen: defenderModifiers.isLightScreen,
      isReflect: defenderModifiers.isReflect,
    },
  });
}

function getMoveOverridesForReporting(moveRecord) {
  if (toID(moveRecord?.name) === 'lastrespects') {
    return {
      basePower: LAST_RESPECTS_REPORTING_BASE_POWER,
    };
  }

  return undefined;
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

    if (moveRecord?.category === 'Status') {
      return {
        category: moveRecord.category,
        damageValues: [],
        desc: '',
        error: null,
        koChanceLabel: '',
        maxHp: defenderPokemon.maxHP(),
        moveName: moveRecord.name,
        moveType: moveRecord.type,
        percentLabel: '',
      };
    }

    const move = new CalcMove(GEN, moveRecord?.name ?? moveName, {
      ability: attacker.ability || undefined,
      isCrit: getBattleModifiers(attacker).isCrit,
      item: attacker.item || undefined,
      overrides: getMoveOverridesForReporting(moveRecord),
      species: getSpeciesRecord(attacker.species)?.calcName ?? attacker.species,
    });
    const calculation = calculate(GEN, attackerPokemon, defenderPokemon, move, makeDamageField(field, attacker, defender));
    const damageValues = getDamageRollTotals(calculation.damage);
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
    terrain: '',
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
