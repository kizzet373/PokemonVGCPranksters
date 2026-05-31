import React, { useMemo, useState } from 'react';
import { Calculator, Shield, Swords } from 'lucide-react';
import {
  calculate,
  Field,
  Generations,
  Move as CalcMove,
  Pokemon as CalcPokemon,
  calcStat,
  toID,
} from '@smogon/calc';
import { NameWithSprite } from '../common';
import pokemonStatsData from '../../data/pokemon-stats.json';
import pokemonUsageStats from '../../data/usage-stats/pokemon/full.json';
import itemUsageStats from '../../data/usage-stats/items/full.json';
import moveUsageStats from '../../data/usage-stats/moves/full.json';
import { getTypeIcon } from '../../utils/assets';
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
const globalMoveUsageById = new Map((moveUsageStats.moves ?? []).map((move) => [toID(move.name), move.count ?? 0]));
const speciesOptions = [...generation.species]
  .filter((species) => !species.isNonstandard && championSpeciesIds.has(species.id))
  .sort((a, b) => a.name.localeCompare(b.name));
const moveOptions = [...generation.moves]
  .filter((move) => !move.isNonstandard)
  .sort((a, b) => a.name.localeCompare(b.name));
const itemOptions = [...generation.items]
  .filter((item) => !item.isNonstandard && championItemIds.has(item.id))
  .sort((a, b) => a.name.localeCompare(b.name));
const natureOptions = [...generation.natures].sort((a, b) => a.name.localeCompare(b.name));

const speciesById = new Map(speciesOptions.map((species) => [species.id, species]));
const moveById = new Map(moveOptions.map((move) => [move.id, move]));
const pokemonStatsById = new Map((pokemonStatsData.pokemon ?? []).map((pokemon) => [toID(pokemon.name), pokemon]));
const itemNames = ['', ...itemOptions.map((item) => item.name)];
const natureNames = natureOptions.map((nature) => nature.name);
const moveUsageByPokemonId = new Map((pokemonUsageStats.pokemon ?? []).map((pokemon) => {
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
const emptyStatPoints = Object.fromEntries(stats.map((stat) => [stat, 0]));

const defaultAttacker = {
  species: 'Sneasler',
  ability: 'Unburden',
  item: 'White Herb',
  moves: ['Close Combat', 'Dire Claw', 'Fake Out', 'Protect'],
  nature: 'Jolly',
  statPoints: { hp: 0, atk: 32, def: 0, spa: 0, spd: 2, spe: 32 },
  boosts: defaultBoosts,
};

const defaultDefender = {
  species: 'Incineroar',
  ability: 'Intimidate',
  item: 'Sitrus Berry',
  moves: ['Fake Out', 'Flare Blitz', 'Knock Off', 'Parting Shot'],
  nature: 'Careful',
  statPoints: { hp: 32, atk: 0, def: 2, spa: 0, spd: 32, spe: 0 },
  boosts: defaultBoosts,
};

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

function getAbilitiesForSpecies(name) {
  const species = getSpeciesRecord(name);
  const pokemonStats = pokemonStatsById.get(toID(name));

  if (!species) {
    return [''];
  }

  const calcAbilities = Object.values(species.abilities ?? {}).filter(Boolean);
  const statsAbilities = pokemonStats?.abilities?.map((ability) => formatPascalCase(ability.name)) ?? [];

  return ['', ...new Set([...calcAbilities, ...statsAbilities])];
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

function getDefaultMovesForSpecies(name) {
  return getMoveOptionsForSpecies(name).slice(0, 4).map((move) => move.name);
}

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

function formatRange(values) {
  if (!values.length) {
    return '0-0';
  }

  return `${Math.min(...values)}-${Math.max(...values)}`;
}

function formatPercentRange(values, maxHp) {
  if (!values.length || !maxHp) {
    return '0 - 0%';
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const minPercent = ((min / maxHp) * 100).toFixed(1);
  const maxPercent = ((max / maxHp) * 100).toFixed(1);

  return `${minPercent} - ${maxPercent}%`;
}

function DataList({ id, options }) {
  return (
    <datalist id={id}>
      {options.map((option) => <option key={option} value={option} />)}
    </datalist>
  );
}

function TextInput({ id, label, list, onChange, value }) {
  return (
    <label className="damage-calc-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} list={list} onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
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

function PokemonIdentity({ config }) {
  const species = getSpeciesRecord(config.species);

  return (
    <div className="damage-calc-card__identity">
      <NameWithSprite kind="pokemon" name={species?.name ?? config.species} />
      {species?.types?.length ? <TypeIcons types={species.types} /> : null}
    </div>
  );
}

function StatEditor({ config, onStatChange }) {
  const statPoints = normalizeStatPoints(config.statPoints);
  const statPointTotal = getStatPointTotal(statPoints);

  return (
    <>
      <div className="damage-calc-stat-summary">
        <span>Stat Points</span>
        <strong>{statPointTotal} / {CHAMPIONS_TOTAL_STAT_POINTS}</strong>
      </div>
      <div className="damage-calc-stat-grid damage-calc-stat-grid--champions">
        <span>Stat</span>
        <span>SP</span>
        <span>Boost</span>
        {stats.map((stat) => (
          <React.Fragment key={stat}>
            <strong>{statLabels[stat]}</strong>
            <input
              aria-label={`${statLabels[stat]} stat points`}
              inputMode="numeric"
              max={CHAMPIONS_MAX_STAT_POINTS}
              min="0"
              onChange={(event) => onStatChange('statPoints', stat, event.target.value)}
              type="number"
              value={statPoints[stat]}
            />
            {stat === 'hp' ? (
              <span aria-hidden="true" />
            ) : (
              <input
                aria-label={`${statLabels[stat]} boost`}
                inputMode="numeric"
                max="6"
                min="-6"
                onChange={(event) => onStatChange('boosts', stat, clampNumber(event.target.value, -6, 6))}
                type="number"
                value={config.boosts[stat]}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

function MovesetEditor({ config, id, listId, onMoveChange }) {
  return (
    <div className="damage-calc-moveset">
      <span className="damage-calc-moveset__label">Moves</span>
      {Array.from({ length: 4 }, (_, index) => (
        <TextInput
          id={`${id}-move-${index + 1}`}
          key={`${id}-move-${index + 1}`}
          label={`Move ${index + 1}`}
          list={listId}
          onChange={(value) => onMoveChange(index, value)}
          value={config.moves?.[index] ?? ''}
        />
      ))}
    </div>
  );
}

function PokemonPanel({ config, id, icon: Icon, listId, onChange, title }) {
  const abilityOptions = getAbilitiesForSpecies(config.species);

  function updateField(field, value) {
    onChange((current) => {
      const next = { ...current, [field]: value };

      if (field === 'species') {
        next.ability = getAbilitiesForSpecies(value)[1] ?? '';
        next.moves = getDefaultMovesForSpecies(value);
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
      <header className="damage-calc-card__header">
        <Icon size={19} aria-hidden="true" />
        <h2>{title}</h2>
      </header>

      <PokemonIdentity config={config} />

      <div className="damage-calc-card__controls">
        <TextInput
          id={`${id}-species`}
          label="Pokemon"
          list="damage-calc-species"
          onChange={(value) => updateField('species', value)}
          value={config.species}
        />
        <SelectField
          id={`${id}-ability`}
          label="Ability"
          onChange={(value) => updateField('ability', value)}
          options={abilityOptions}
          value={abilityOptions.includes(config.ability) ? config.ability : ''}
        />
        <TextInput
          id={`${id}-item`}
          label="Item"
          list="damage-calc-items"
          onChange={(value) => updateField('item', value)}
          value={config.item}
        />
        <SelectField
          id={`${id}-nature`}
          label="Nature"
          onChange={(value) => updateField('nature', value)}
          options={natureNames}
          value={config.nature}
        />
      </div>

      <MovesetEditor config={config} id={id} listId={listId} onMoveChange={updateMove} />

      <StatEditor config={config} onStatChange={updateStat} />
    </article>
  );
}

function getStatTotal(config, stat) {
  const championStats = getChampionsStats(config);

  return championStats?.[stat] ?? null;
}

function makeDamageField(field) {
  return new Field({
    gameType: CHAMPIONS_GAME_TYPE,
    terrain: field.terrain || undefined,
    weather: field.weather || undefined,
    attackerSide: {
      isHelpingHand: field.isHelpingHand,
    },
    defenderSide: {
      isAuroraVeil: field.isAuroraVeil,
      isLightScreen: field.isLightScreen,
      isProtected: field.isProtected,
      isReflect: field.isReflect,
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
      isCrit: field.isCrit,
      item: attacker.item || undefined,
      species: getSpeciesRecord(attacker.species)?.name ?? attacker.species,
    });
    const calculation = calculate(GEN, attackerPokemon, defenderPokemon, move, makeDamageField(field));
    const damageValues = flattenDamage(calculation.damage);
    const maxHp = defenderPokemon.maxHP();

    return {
      category: move.category,
      damageLabel: formatRange(damageValues),
      damageValues,
      desc: calculation.desc(),
      error: null,
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

function summarizeMoveResults(results) {
  const validResults = results.filter((result) => !result.error && result.damageValues?.length);
  const maxHp = validResults[0]?.maxHp;

  if (!validResults.length || !maxHp) {
    return {
      damageLabel: '0-0',
      percentLabel: '0 - 0%',
      targetHp: maxHp ?? 0,
    };
  }

  const totalMinDamage = validResults.reduce((total, result) => total + Math.min(...result.damageValues), 0);
  const totalMaxDamage = validResults.reduce((total, result) => total + Math.max(...result.damageValues), 0);

  return {
    damageLabel: `${totalMinDamage}-${totalMaxDamage}`,
    percentLabel: formatPercentRange([totalMinDamage, totalMaxDamage], maxHp),
    targetHp: maxHp,
  };
}

function MoveDamageRow({ result }) {
  if (result.error) {
    return (
      <div className="damage-calc-move-result damage-calc-move-result--error">
        <strong>{result.moveName || 'Move'}</strong>
        <span>{result.error}</span>
      </div>
    );
  }

  return (
    <div className="damage-calc-move-result">
      <div>
        <strong>{result.moveName}</strong>
        <small>{result.moveType} / {result.category}</small>
      </div>
      <span>
        <small>Damage</small>
        <strong>{result.damageLabel}</strong>
      </span>
      <span>
        <small>Percent</small>
        <strong>{result.percentLabel}</strong>
      </span>
    </div>
  );
}

function DamageDirection({ attacker, defender, field, title }) {
  const results = useMemo(
    () => (attacker.moves ?? []).slice(0, 4).map((move) => calculateMoveResult(attacker, defender, field, move)),
    [attacker, defender, field],
  );
  const total = useMemo(() => summarizeMoveResults(results), [results]);
  const attackerSpa = getStatTotal(attacker, 'spa');
  const attackerAtk = getStatTotal(attacker, 'atk');
  const defenderHp = getStatTotal(defender, 'hp');

  return (
    <section className="damage-calc-direction">
      <header className="damage-calc-card__header">
        <Swords size={18} aria-hidden="true" />
        <h3>{title}</h3>
      </header>
      <div className="damage-calc-result__numbers">
        <span>
          <small>Total Damage</small>
          <strong>{total.damageLabel}</strong>
        </span>
        <span>
          <small>Total Percent</small>
          <strong>{total.percentLabel}</strong>
        </span>
        <span>
          <small>Target HP</small>
          <strong>{total.targetHp || defenderHp || 0}</strong>
        </span>
      </div>
      <div className="damage-calc-move-results">
        {results.map((result, index) => <MoveDamageRow key={`${result.moveName}-${index}`} result={result} />)}
      </div>
      <div className="damage-calc-result__meta">
        {attackerAtk ? <span>{attackerAtk} Atk</span> : null}
        {attackerSpa ? <span>{attackerSpa} SpA</span> : null}
        {defenderHp ? <span>{defenderHp} HP target</span> : null}
      </div>
    </section>
  );
}

function ResultPanel({ attacker, defender, field }) {
  return (
    <article className="damage-calc-result">
      <header className="damage-calc-card__header">
        <Calculator size={19} aria-hidden="true" />
        <h2>Results</h2>
      </header>

      <DamageDirection
        attacker={attacker}
        defender={defender}
        field={field}
        title={`${getSpeciesRecord(attacker.species)?.name ?? attacker.species} into ${getSpeciesRecord(defender.species)?.name ?? defender.species}`}
      />
      <DamageDirection
        attacker={defender}
        defender={attacker}
        field={field}
        title={`${getSpeciesRecord(defender.species)?.name ?? defender.species} into ${getSpeciesRecord(attacker.species)?.name ?? attacker.species}`}
      />
    </article>
  );
}

export function DamageCalcView() {
  const [attacker, setAttacker] = useState(defaultAttacker);
  const [defender, setDefender] = useState(defaultDefender);
  const [field, setField] = useState({
    isAuroraVeil: false,
    isCrit: false,
    isHelpingHand: false,
    isLightScreen: false,
    isProtected: false,
    isReflect: false,
    terrain: 'Electric',
    weather: '',
  });
  const attackerMoveOptions = useMemo(() => getMoveOptionsForSpecies(attacker.species), [attacker.species]);
  const defenderMoveOptions = useMemo(() => getMoveOptionsForSpecies(defender.species), [defender.species]);

  function updateField(fieldName, value) {
    setField((current) => ({
      ...current,
      [fieldName]: value,
    }));
  }

  return (
    <section className="workspace damage-calc-workspace">
      <DataList id="damage-calc-species" options={speciesOptions.map((species) => species.name)} />
      <DataList id="damage-calc-attacker-moves" options={attackerMoveOptions.map((move) => move.name)} />
      <DataList id="damage-calc-defender-moves" options={defenderMoveOptions.map((move) => move.name)} />
      <DataList id="damage-calc-items" options={itemNames} />

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
            config={attacker}
            icon={Swords}
            id="attacker"
            listId="damage-calc-attacker-moves"
            onChange={setAttacker}
            title="Attacker"
          />
          <PokemonPanel
            config={defender}
            icon={Shield}
            id="defender"
            listId="damage-calc-defender-moves"
            onChange={setDefender}
            title="Defender"
          />

          <article className="damage-calc-card damage-calc-card--field">
            <header className="damage-calc-card__header">
              <Calculator size={19} aria-hidden="true" />
              <h2>Move & Field</h2>
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
            <div className="damage-calc-toggle-grid">
              <ToggleField
                checked={field.isHelpingHand}
                label="Helping Hand"
                onChange={(value) => updateField('isHelpingHand', value)}
              />
              <ToggleField checked={field.isCrit} label="Critical" onChange={(value) => updateField('isCrit', value)} />
              <ToggleField checked={field.isReflect} label="Reflect" onChange={(value) => updateField('isReflect', value)} />
              <ToggleField
                checked={field.isLightScreen}
                label="Light Screen"
                onChange={(value) => updateField('isLightScreen', value)}
              />
              <ToggleField
                checked={field.isAuroraVeil}
                label="Aurora Veil"
                onChange={(value) => updateField('isAuroraVeil', value)}
              />
              <ToggleField
                checked={field.isProtected}
                label="Protect"
                onChange={(value) => updateField('isProtected', value)}
              />
            </div>
          </article>

          <ResultPanel attacker={attacker} defender={defender} field={field} />
        </div>
      </section>
    </section>
  );
}
