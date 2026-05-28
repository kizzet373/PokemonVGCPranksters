import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NameWithSprite } from '../common/NameWithSprite';
import { TypeIcons } from '../table/tableCells';
import { TYPE_CHECK_CONFIG, TYPE_MULTIPLIER_OPTIONS } from '../../config/typeCheckConfig';
import typeMatchups from '../../data/type-matchups.json';
import usageIndex from '../../data/usage-stats/index.json';
import monthUsage from '../../data/usage-stats/pokemon/2026-05.json';
import { getTypeIcon } from '../../utils/assets';
import { formatPascalCase } from '../../utils/format';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const multiplierLabels = {
  0: '0x',
  0.25: '¼x',
  0.5: '½x',
  1: '1x',
  2: '2x',
  4: '4x',
};
const typeList = typeMatchups.types;

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
    const pokemon = pick(monthUsage.pokemon.slice(0, config.pokemonCount).filter((entry) => entry.typing?.length));
    const defendingTypes = pokemon.typing;

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

function SingleAnswerButtons({ disabled, selected, onSelect }) {
  return (
    <div className="type-check__answers" role="group" aria-label="Choose damage multiplier">
      {TYPE_MULTIPLIER_OPTIONS.map((value) => (
        <button
          className={selected === value ? 'selected' : ''}
          disabled={disabled}
          key={value}
          onClick={() => onSelect(value)}
          type="button"
        >
          {multiplierLabels[value]}
        </button>
      ))}
    </div>
  );
}

function HellTypeRow({ disabled, guess, onStep, result, type }) {
  const isCorrect = result && guess === result;
  const isWrong = result && guess !== result;

  return (
    <div className={`type-check__matrix-row ${isCorrect ? 'type-check__matrix-row--correct' : ''} ${isWrong ? 'type-check__matrix-row--wrong' : ''}`}>
      <TypeBadge type={type} />
      <button aria-label={`Lower ${type} matchup`} disabled={disabled} onClick={() => onStep(type, -1)} type="button"><ChevronLeft size={16} /></button>
      <strong>{multiplierLabels[guess]}</strong>
      <button aria-label={`Raise ${type} matchup`} disabled={disabled} onClick={() => onStep(type, 1)} type="button"><ChevronRight size={16} /></button>
      {result ? <small>{multiplierLabels[result]}</small> : null}
    </div>
  );
}

export function TypeCheckView() {
  const [mode, setMode] = useState('easy');
  const [round, setRound] = useState(() => buildRound('easy'));
  const [selected, setSelected] = useState(null);
  const [matrixGuesses, setMatrixGuesses] = useState(() => Object.fromEntries(typeList.map((type) => [type, 1])));
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(0);
  const config = TYPE_CHECK_CONFIG[mode];
  const monthId = useMemo(() => usageIndex.scopes.filter((scope) => scope.type === 'month').map((scope) => scope.id).sort().at(-1), []);

  const resetGuesses = () => {
    setSelected(null);
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
      const currentIndex = TYPE_MULTIPLIER_OPTIONS.indexOf(prev[type]);
      const nextIndex = Math.min(TYPE_MULTIPLIER_OPTIONS.length - 1, Math.max(0, currentIndex + direction));
      return { ...prev, [type]: TYPE_MULTIPLIER_OPTIONS[nextIndex] };
    });
  };

  const submit = () => {
    const correct = config.answerMode === 'all-types'
      ? typeList.every((type) => matrixGuesses[type] === round.allTypeAnswers[type])
      : selected === round.answer;

    setScore((prev) => (correct ? prev + 1 : 0));
    setResult({ correct });
  };

  const canSubmit = config.answerMode === 'all-types' || selected !== null;

  return <section className="speed-check type-check">
    <header className="speed-check__head">
      <h2>Type Check!</h2>
      <p>Meta scope: {monthId}</p>
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
        ) : <TypeIcons types={round.defendingTypes} />}
      </div>
    </div>

    {config.answerMode === 'single' ? (
      <SingleAnswerButtons disabled={Boolean(result)} selected={selected} onSelect={setSelected} />
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
          {round.pokemon ? <><TypeIcons types={round.defendingTypes} /> </> : null}
          {round.attackType ? `${round.pokemon ? '' : round.defendingTypes.map(formatPascalCase).join(' / ')} = ${multiplierLabels[round.answer]} (${matchupText(round.answer)})` : 'Review the highlighted matchups above.'}
        </span>
      </div>
    ) : null}
  </section>;
}
