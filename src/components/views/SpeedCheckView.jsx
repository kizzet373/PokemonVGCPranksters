import React, { useMemo, useState } from 'react';
import { NameWithSprite } from '../common/NameWithSprite';
import usageIndex from '../../data/usage-stats/index.json';
import monthUsage from '../../data/usage-stats/pokemon/2026-05.json';
import { SPEED_CHECK_CONFIG, SPEED_STAGES } from '../../config/speedCheckConfig';

const stageMultiplier = { '-2': 0.5, '-1': 2 / 3, 0: 1, 1: 1.5, 2: 2 };

const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function championModifier() {
  return 20;
}

function estimatedBaseSpeed(poke) {
  const usage = poke.usagePercent / 100;
  const wr = poke.record.winRate / 100;
  return Math.max(30, Math.min(200, Math.round(55 + usage * 120 + (wr - 0.5) * 80)));
}

function rollModifiers(config) {
  return {
    trickRoom: config.modifiers.trickRoom ? Math.random() < 0.35 : false,
    tailwindLeft: config.modifiers.tailwind ? Math.random() < 0.4 : false,
    tailwindRight: config.modifiers.tailwind ? Math.random() < 0.4 : false,
    choiceScarf: config.modifiers.choiceScarf ? Math.random() < 0.4 : false,
    paralysis: config.modifiers.paralysis ? Math.random() < 0.25 : false,
    speedStage: config.modifiers.speedStage ? pick(SPEED_STAGES) : 0,
  };
}

function calcSpeed(poke, modifiers, sideTailwind) {
  const base = estimatedBaseSpeed(poke);
  const champ = championModifier(poke);
  const stageMult = stageMultiplier[String(modifiers.speedStage)] ?? 1;
  const tailwindMult = sideTailwind ? 2 : 1;
  const paraMult = modifiers.paralysis ? 0.5 : 1;
  const scarfMult = modifiers.choiceScarf ? 1.5 : 1;
  const total = Math.round((base + champ) * stageMult * tailwindMult * paraMult * scarfMult);

  return { base, champ, stageMult, tailwindMult, paraMult, scarfMult, total };
}

function equationParts(result, modifiers, sideTailwind) {
  const parts = [{ label: 'Champion modifier', value: `${result.champ}` }];
  if (modifiers.speedStage) parts.push({ label: `Stat stage (${modifiers.speedStage > 0 ? '+' : ''}${modifiers.speedStage})`, value: `× ${result.stageMult}` });
  if (sideTailwind) parts.push({ label: 'Tailwind', value: '× 2' });
  if (modifiers.paralysis) parts.push({ label: 'Paralysis', value: '× 0.5' });
  if (modifiers.choiceScarf) parts.push({ label: 'Choice Scarf', value: '× 1.5' });
  return parts;
}

export function SpeedCheckView() {
  const [mode, setMode] = useState('easy');
  const [round, setRound] = useState(() => buildRound('easy'));
  const [selectedOrder, setSelectedOrder] = useState([]);
  const [result, setResult] = useState(null);

  const config = SPEED_CHECK_CONFIG[mode];
  const monthId = useMemo(() => usageIndex.scopes.filter((s) => s.type === 'month').map((s) => s.id).sort().at(-1), []);

  function buildRound(modeKey) {
    const cfg = SPEED_CHECK_CONFIG[modeKey];
    const pool = monthUsage.pokemon.slice(0, cfg.pokemonCount);
    const mods = rollModifiers(cfg);
    const left = Array.from({ length: cfg.teamSizePerSide }, () => pick(pool));
    const right = Array.from({ length: cfg.teamSizePerSide }, () => pick(pool));

    const racers = [
      ...left.map((poke, idx) => ({ id: `L${idx}`, side: 'left', poke, mods: rollModifiers(cfg), teamTailwind: mods.tailwindLeft })),
      ...right.map((poke, idx) => ({ id: `R${idx}`, side: 'right', poke, mods: rollModifiers(cfg), teamTailwind: mods.tailwindRight })),
    ].map((r) => ({ ...r, result: calcSpeed(r.poke, r.mods, r.teamTailwind) }));

    racers.sort((a, b) => (mods.trickRoom ? a.result.total - b.result.total : b.result.total - a.result.total));
    const lead = racers[0].result.total;
    const trail = racers[racers.length - 1].result.total;
    const deviation = Math.abs(lead - trail) / Math.max(lead, 1);
    const tie = lead === trail;
    if (deviation < cfg.deviationRange.min || deviation > cfg.deviationRange.max || (!cfg.allowSpeedTieGeneration && tie)) return buildRound(modeKey);
    return { racers, mods, cfg };
  }

  const submit = () => {
    const expected = round.racers.map((r) => r.id);
    const correct = config.teamSizePerSide === 1 ? selectedOrder[0] === expected[0] : expected.join(',') === selectedOrder.join(',');
    setResult(correct ? 'Correct!' : 'Not quite!');
  };

  const togglePick = (id) => {
    setResult(null);
    if (config.teamSizePerSide === 1) return setSelectedOrder([id]);
    setSelectedOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev));
  };

  const next = (newMode = mode) => {
    setMode(newMode);
    setSelectedOrder([]);
    setResult(null);
    setRound(buildRound(newMode));
  };

  return (
    <section className="speed-check">
      <header className="speed-check__head"><h2>Speed Check!</h2><p>Meta scope: {monthId}</p></header>
      <div className="speed-check__modes">{Object.values(SPEED_CHECK_CONFIG).map((m)=><button key={m.id} className={m.id===mode?'active':''} onClick={()=>next(m.id)}>{m.label}</button>)}</div>
      {round.mods.trickRoom ? <p className="speed-check__global">Trick Room is active (slowest goes first).</p> : null}
      <div className="speed-check__sides">
        <div className="speed-check__side">
          <h3>Left Side</h3>
          <div className="speed-check__grid">
            {round.racers.filter((r) => r.side === 'left').map((r) => (
              <button key={r.id} className={`speed-card ${selectedOrder.includes(r.id) ? 'selected' : ''}`} onClick={() => togglePick(r.id)}>
                <NameWithSprite kind="pokemon" name={r.poke.name} />
                <div>Item: <NameWithSprite kind="items" name={r.mods.choiceScarf ? 'choice scarf' : 'none'} /></div>
                <div className="speed-equation">
                  {equationParts(r.result, r.mods, r.teamTailwind).map((part) => (
                    <span key={part.label} className="speed-equation__part"><strong>{part.label}</strong><em>{part.value}</em></span>
                  ))}
                  <span className="speed-equation__total"><strong>Final Speed</strong><em>{r.result.total}</em></span>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="speed-check__side">
          <h3>Right Side</h3>
          <div className="speed-check__grid">
            {round.racers.filter((r) => r.side === 'right').map((r) => (
              <button key={r.id} className={`speed-card ${selectedOrder.includes(r.id) ? 'selected' : ''}`} onClick={() => togglePick(r.id)}>
                <NameWithSprite kind="pokemon" name={r.poke.name} />
                <div>Item: <NameWithSprite kind="items" name={r.mods.choiceScarf ? 'choice scarf' : 'none'} /></div>
                <div className="speed-equation">
                  {equationParts(r.result, r.mods, r.teamTailwind).map((part) => (
                    <span key={part.label} className="speed-equation__part"><strong>{part.label}</strong><em>{part.value}</em></span>
                  ))}
                  <span className="speed-equation__total"><strong>Final Speed</strong><em>{r.result.total}</em></span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      {config.allowTieChoice ? <button onClick={() => setSelectedOrder(['tie'])}>Select Tie</button> : null}
      <div className="speed-check__actions">
        <button onClick={submit}>Submit</button>
        <button onClick={() => next()}>New Round</button>
      </div>
      {config.teamSizePerSide === 2 ? <p>Choose the full order from 1st to 4th by clicking in sequence.</p> : null}
      {result ? <p className="speed-check__result">{result}</p> : null}
    </section>
  );
}
