import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NameWithSprite } from '../common/NameWithSprite';
import { TYPE_CHECK_CONFIG, TYPE_MULTIPLIER_OPTIONS } from '../../config/typeCheckConfig';
import typeMatchups from '../../data/type-matchups.json';
import { defaultUsageScopeId, statsIndex } from '../../data/usageSources';
import pokemonStats from '../../data/pokemon-stats.json';
import { getTypeIcon } from '../../utils/assets';
import { formatPascalCase, formatScopeLabel } from '../../utils/format';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const multiplierLabels = {
  0: '0x',
  0.25: '1/4x',
  0.5: '1/2x',
  1: '1x',
  2: '2x',
  4: '4x',
};
const typeList = typeMatchups.types;
const pokemonTypingByName = new Map(pokemonStats.pokemon.map((pokemon) => [pokemon.name, pokemon.typing ?? []]));
const pokemonUsageModules = import.meta.glob('../../data/usage-stats/pokemon-separate-megas/*.json', { eager: true });
const monthUsage =
  pokemonUsageModules[`../../data/usage-stats/pokemon-separate-megas/${defaultUsageScopeId}.json`]?.default ??
  pokemonUsageModules['../../data/usage-stats/pokemon-separate-megas/full.json']?.default;

function multiplierFor(attackType, defenderTypes) {
  return defenderTypes.reduce((total, defenderType) => total * (typeMatchups.attack[attackType]?.[defenderType] ?? 1), 1);
}

function matchupText(value) {
  if (value === 0) return 'Immune';
  if (value < 1) return 'Resists';
  if (value > 1) return 'Weak';
  return 'Neutral';
}

function randomDualTypes() {
  const first = pick(typeList);
  const secondPool = typeList.filter((type) => type !== first);
  return [first, pick(secondPool)];
}

function buildRound(modeKey) {
  const config = TYPE_CHECK_CONFIG[modeKey];
  const attackType = config.answerMode === 'single' ? pick(typeList) : null;

  if (config.usesPokemon) {
    const pokemonPool = (monthUsage?.pokemon ?? [])
      .slice(0, config.pokemonCount)
      .filter((entry) => (entry.typing ?? pokemonTypingByName.get(entry.name))?.length);
    const pokemon = pick(pokemonPool);
    const defendingTypes = pokemon.typing ?? pokemonTypingByName.get(pokemon.name);

    return {
      attackType,
      defendingTypes,
      pokemon,
      allTypeAnswers: Object.fromEntries(typeList.map((type) => [type, multiplierFor(type, defendingTypes)])),
      answer: attackType ? multiplierFor(attackType, defendingTypes) : null,
    };
  }

  const defendingTypes = config.defenderTypeCount === 1 ? [pick(typeList)] : randomDualTypes();

  return {
    attackType,
    defendingTypes,
    pokemon: null,
    answer: multiplierFor(attackType, defendingTypes),
  };
}

function TypeBadge({ type }) {
  return <span className="type-check__type"><img src={getTypeIcon(type)} alt="" />{formatPascalCase(type)}</span>;
}

function TypeBadgeList({ types }) {
  return <span className="type-check__defender-types">{types.map((type) => <TypeBadge key={type} type={type} />)}</span>;
}

function stepMultiplier(value, direction, options = TYPE_MULTIPLIER_OPTIONS) {
  const currentIndex = options.indexOf(value);
  const safeIndex = currentIndex === -1 ? options.indexOf(1) : currentIndex;
  const nextIndex = Math.min(options.length - 1, Math.max(0, safeIndex + direction));

  return options[nextIndex];
}

function SingleAnswerStepper({ disabled, selected, onStep }) {
  return (
    <div className="type-check__single-stepper" role="group" aria-label="Choose damage multiplier">
      <button aria-label="Lower matchup multiplier" disabled={disabled} onClick={() => onStep(-1)} type="button"><ChevronLeft size={18} /></button>
      <span>
        <strong>{multiplierLabels[selected]}</strong>
        <small>{matchupText(selected)}</small>
      </span>
      <button aria-label="Raise matchup multiplier" disabled={disabled} onClick={() => onStep(1)} type="button"><ChevronRight size={18} /></button>
    </div>
  );
}

function HellTypeRow({ disabled, guess, onStep, result, type }) {
  const hasResult = result !== null && result !== undefined;
  const isCorrect = hasResult && guess === result;
  const isWrong = hasResult && guess !== result;

  return (
    <div className={`type-check__matrix-row ${isCorrect ? 'type-check__matrix-row--correct' : ''} ${isWrong ? 'type-check__matrix-row--wrong' : ''}`}>
      <TypeBadge type={type} />
      <button aria-label={`Lower ${type} matchup`} disabled={disabled} onClick={() => onStep(type, -1)} type="button"><ChevronLeft size={16} /></button>
      <strong>{multiplierLabels[guess]}</strong>
      <button aria-label={`Raise ${type} matchup`} disabled={disabled} onClick={() => onStep(type, 1)} type="button"><ChevronRight size={16} /></button>
      {hasResult ? <small>{multiplierLabels[result]}</small> : null}
    </div>
  );
}

export function TypeCheckView() {
  const [mode, setMode] = useState('easy');
  const [round, setRound] = useState(() => buildRound('easy'));
  const [selected, setSelected] = useState(1);
  const [matrixGuesses, setMatrixGuesses] = useState(() => Object.fromEntries(typeList.map((type) => [type, 1])));
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(0);
  const config = TYPE_CHECK_CONFIG[mode];
  const metaScope = useMemo(
    () => statsIndex.scopes.find((scope) => scope.id === defaultUsageScopeId) ?? { id: defaultUsageScopeId },
    [],
  );

  const resetGuesses = () => {
    setSelected(1);
    setMatrixGuesses(Object.fromEntries(typeList.map((type) => [type, 1])));
    setResult(null);
  };

  const next = (newMode = mode, resetScore = false) => {
    setMode(newMode);
    resetGuesses();
    if (resetScore) setScore(0);
    setRound(buildRound(newMode));
  };

  const stepMatrixGuess = (type, direction) => {
    if (result) return;
    setMatrixGuesses((prev) => {
      return { ...prev, [type]: stepMultiplier(prev[type], direction) };
    });
  };

  const submit = () => {
    const correct = config.answerMode === 'all-types'
      ? typeList.every((type) => matrixGuesses[type] === round.allTypeAnswers[type])
      : selected === round.answer;

    setScore((prev) => (correct ? prev + 1 : 0));
    setResult({ correct });
  };

  const stepSingleGuess = (direction) => {
    if (result) return;
    setSelected((prev) => stepMultiplier(prev, direction, config.multiplierOptions));
  };

  const canSubmit = true;

  return <section className="speed-check type-check">
    <header className="speed-check__head">
      <h2>Type Check!</h2>
      <p>Meta scope: {formatScopeLabel(metaScope)}</p>
      <span className="speed-check__score">Score: {score}</span>
    </header>

    <div className="speed-check__modes">
      {Object.values(TYPE_CHECK_CONFIG).map((modeConfig) => (
        <button key={modeConfig.id} className={modeConfig.id === mode ? 'active' : ''} onClick={() => next(modeConfig.id, true)} type="button">
          {modeConfig.label}
        </button>
      ))}
    </div>
    <p className="type-check__description">{config.description}</p>

    <div className="type-check__prompt">
      {round.attackType ? <div><small>Move type</small><TypeBadge type={round.attackType} /></div> : null}
      <div>
        <small>Defender</small>
        {round.pokemon ? (
          <NameWithSprite kind="pokemon" id={round.pokemon.id} name={round.pokemon.name}>
            <strong>{formatPascalCase(round.pokemon.name)}</strong>
          </NameWithSprite>
        ) : <TypeBadgeList types={round.defendingTypes} />}
      </div>
    </div>

    {config.answerMode === 'single' ? (
      <SingleAnswerStepper disabled={Boolean(result)} selected={selected} onStep={stepSingleGuess} />
    ) : (
      <div className="type-check__matrix" aria-label="Set all move type matchups">
        {typeList.map((type) => <HellTypeRow key={type} type={type} guess={matrixGuesses[type]} result={result ? round.allTypeAnswers[type] : null} disabled={Boolean(result)} onStep={stepMatrixGuess} />)}
      </div>
    )}

    <div className="speed-check__actions">
      {result ? <button onClick={() => next(mode, !result.correct)} type="button">{result.correct ? 'Next Round' : 'New Game'}</button> : <button disabled={!canSubmit} onClick={submit} type="button">Submit</button>}
    </div>

    {result ? (
      <div className={`speed-check__result ${result.correct ? 'speed-check__result--correct' : 'speed-check__result--wrong'}`}>
        <span>{result.correct ? 'Correct!' : 'Not quite!'}</span>
        <span className="type-check__reveal">
          {round.attackType ? `${formatPascalCase(round.attackType)} into ` : ''}
          {round.pokemon ? <><TypeBadgeList types={round.defendingTypes} /> </> : null}
          {round.attackType ? `${round.pokemon ? '' : round.defendingTypes.map(formatPascalCase).join(' / ')} = ${multiplierLabels[round.answer]} (${matchupText(round.answer)})` : 'Review the highlighted matchups above.'}
        </span>
      </div>
    ) : null}
  </section>;
}
