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
import { getTypeIcon } from '../../utils/assets';

const GEN = 9;
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
const gameTypeOptions = ['Doubles', 'Singles'];

const speciesOptions = [...generation.species]
  .filter((species) => !species.isNonstandard)
  .sort((a, b) => a.name.localeCompare(b.name));
const moveOptions = [...generation.moves]
  .filter((move) => !move.isNonstandard)
  .sort((a, b) => a.name.localeCompare(b.name));
const itemOptions = [...generation.items]
  .filter((item) => !item.isNonstandard)
  .sort((a, b) => a.name.localeCompare(b.name));
const natureOptions = [...generation.natures].sort((a, b) => a.name.localeCompare(b.name));

const speciesById = new Map(speciesOptions.map((species) => [species.id, species]));
const moveById = new Map(moveOptions.map((move) => [move.id, move]));
const itemNames = ['', ...itemOptions.map((item) => item.name)];
const natureNames = natureOptions.map((nature) => nature.name);

const defaultIvs = Object.fromEntries(stats.map((stat) => [stat, 31]));
const defaultBoosts = Object.fromEntries(boostStats.map((stat) => [stat, 0]));

const defaultAttacker = {
  species: 'Miraidon',
  level: 50,
  ability: 'Hadron Engine',
  item: 'Choice Specs',
  nature: 'Modest',
  evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
  ivs: defaultIvs,
  boosts: defaultBoosts,
};

const defaultDefender = {
  species: 'Incineroar',
  level: 50,
  ability: 'Intimidate',
  item: 'Sitrus Berry',
  nature: 'Careful',
  evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
  ivs: defaultIvs,
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

  if (!species) {
    return [''];
  }

  return ['', ...new Set(Object.values(species.abilities ?? {}).filter(Boolean))];
}

function normalizeStats(values, min, max) {
  return Object.fromEntries(stats.map((stat) => [stat, clampNumber(values[stat], min, max)]));
}

function normalizeBoosts(values) {
  return Object.fromEntries(boostStats.map((stat) => [stat, clampNumber(values[stat], -6, 6)]));
}

function makePokemon(config) {
  const species = getSpeciesRecord(config.species)?.name ?? config.species;

  return new CalcPokemon(GEN, species, {
    ability: config.ability || undefined,
    boosts: normalizeBoosts(config.boosts),
    evs: normalizeStats(config.evs, 0, 252),
    item: config.item || undefined,
    ivs: normalizeStats(config.ivs, 0, 31),
    level: clampNumber(config.level, 1, 100),
    nature: config.nature || 'Serious',
  });
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

function NumberInput({ id, label, max, min, onChange, value }) {
  return (
    <label className="damage-calc-field damage-calc-field--number" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        inputMode="numeric"
        max={max}
        min={min}
        onChange={(event) => onChange(clampNumber(event.target.value, min, max))}
        type="number"
        value={value}
      />
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
  return (
    <div className="damage-calc-stat-grid">
      <span>Stat</span>
      <span>EV</span>
      <span>IV</span>
      <span>Boost</span>
      {stats.map((stat) => (
        <React.Fragment key={stat}>
          <strong>{statLabels[stat]}</strong>
          <input
            aria-label={`${statLabels[stat]} EV`}
            inputMode="numeric"
            max="252"
            min="0"
            onChange={(event) => onStatChange('evs', stat, clampNumber(event.target.value, 0, 252))}
            type="number"
            value={config.evs[stat]}
          />
          <input
            aria-label={`${statLabels[stat]} IV`}
            inputMode="numeric"
            max="31"
            min="0"
            onChange={(event) => onStatChange('ivs', stat, clampNumber(event.target.value, 0, 31))}
            type="number"
            value={config.ivs[stat]}
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
  );
}

function PokemonPanel({ config, id, icon: Icon, onChange, title }) {
  const abilityOptions = getAbilitiesForSpecies(config.species);

  function updateField(field, value) {
    onChange((current) => {
      const next = { ...current, [field]: value };

      if (field === 'species') {
        next.ability = getAbilitiesForSpecies(value)[1] ?? '';
      }

      return next;
    });
  }

  function updateStat(group, stat, value) {
    onChange((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [stat]: value,
      },
    }));
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
        <NumberInput
          id={`${id}-level`}
          label="Level"
          max={100}
          min={1}
          onChange={(value) => updateField('level', value)}
          value={config.level}
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

      <StatEditor config={config} onStatChange={updateStat} />
    </article>
  );
}

function getStatTotal(config, stat) {
  const species = getSpeciesRecord(config.species);

  if (!species) {
    return null;
  }

  return calcStat(
    GEN,
    stat,
    species.baseStats[stat],
    clampNumber(config.ivs[stat], 0, 31),
    clampNumber(config.evs[stat], 0, 252),
    clampNumber(config.level, 1, 100),
    config.nature,
  );
}

function ResultPanel({ attacker, defender, field, moveName }) {
  const result = useMemo(() => {
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
      const damageField = new Field({
        gameType: field.gameType,
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
      const calculation = calculate(GEN, attackerPokemon, defenderPokemon, move, damageField);
      const damageValues = flattenDamage(calculation.damage);
      const maxHp = defenderPokemon.maxHP();

      return {
        category: move.category,
        damageLabel: formatRange(damageValues),
        desc: calculation.desc(),
        error: null,
        maxHp,
        moveType: move.type,
        percentLabel: formatPercentRange(damageValues, maxHp),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unable to calculate damage.',
      };
    }
  }, [attacker, defender, field, moveName]);

  const attackerSpa = getStatTotal(attacker, 'spa');
  const attackerAtk = getStatTotal(attacker, 'atk');
  const defenderHp = getStatTotal(defender, 'hp');

  return (
    <article className="damage-calc-result">
      <header className="damage-calc-card__header">
        <Calculator size={19} aria-hidden="true" />
        <h2>Result</h2>
      </header>

      {result.error ? (
        <p className="damage-calc-error">{result.error}</p>
      ) : (
        <>
          <div className="damage-calc-result__numbers">
            <span>
              <small>Damage</small>
              <strong>{result.damageLabel}</strong>
            </span>
            <span>
              <small>Percent</small>
              <strong>{result.percentLabel}</strong>
            </span>
            <span>
              <small>Target HP</small>
              <strong>{result.maxHp}</strong>
            </span>
          </div>
          <p className="damage-calc-result__desc">{result.desc}</p>
          <div className="damage-calc-result__meta">
            <span>{result.moveType}</span>
            <span>{result.category}</span>
            {attackerAtk ? <span>{attackerAtk} Atk</span> : null}
            {attackerSpa ? <span>{attackerSpa} SpA</span> : null}
            {defenderHp ? <span>{defenderHp} HP</span> : null}
          </div>
        </>
      )}
    </article>
  );
}

export function DamageCalcView() {
  const [attacker, setAttacker] = useState(defaultAttacker);
  const [defender, setDefender] = useState(defaultDefender);
  const [moveName, setMoveName] = useState('Electro Drift');
  const [field, setField] = useState({
    gameType: 'Doubles',
    isAuroraVeil: false,
    isCrit: false,
    isHelpingHand: false,
    isLightScreen: false,
    isProtected: false,
    isReflect: false,
    terrain: 'Electric',
    weather: '',
  });

  function updateField(fieldName, value) {
    setField((current) => ({
      ...current,
      [fieldName]: value,
    }));
  }

  return (
    <section className="workspace damage-calc-workspace">
      <DataList id="damage-calc-species" options={speciesOptions.map((species) => species.name)} />
      <DataList id="damage-calc-moves" options={moveOptions.map((move) => move.name)} />
      <DataList id="damage-calc-items" options={itemNames} />

      <header className="workspace-header damage-calc__head">
        <div>
          <h1 id="damage-calc-title">
            <Calculator size={34} aria-hidden="true" />
            Damage Calc
          </h1>
        </div>
      </header>

      <section className="damage-calc" aria-labelledby="damage-calc-title">
        <div className="damage-calc__grid">
          <PokemonPanel config={attacker} icon={Swords} id="attacker" onChange={setAttacker} title="Attacker" />
          <PokemonPanel config={defender} icon={Shield} id="defender" onChange={setDefender} title="Defender" />

          <article className="damage-calc-card damage-calc-card--field">
            <header className="damage-calc-card__header">
              <Calculator size={19} aria-hidden="true" />
              <h2>Move & Field</h2>
            </header>
            <div className="damage-calc-card__controls">
              <TextInput
                id="damage-calc-move"
                label="Move"
                list="damage-calc-moves"
                onChange={setMoveName}
                value={moveName}
              />
              <SelectField
                id="damage-calc-game-type"
                label="Game"
                onChange={(value) => updateField('gameType', value)}
                options={gameTypeOptions}
                value={field.gameType}
              />
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

          <ResultPanel attacker={attacker} defender={defender} field={field} moveName={moveName} />
        </div>
      </section>
    </section>
  );
}
