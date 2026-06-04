export const CHAMPIONS_STAT_MODIFIER = 20;

export const championStatOrder = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];

export const championStatLabels = {
  hp: 'HP',
  attack: 'Atk',
  defense: 'Def',
  specialAttack: 'SpA',
  specialDefense: 'SpD',
  speed: 'Spe',
};

export const calcStatToChampionStat = {
  hp: 'hp',
  atk: 'attack',
  def: 'defense',
  spa: 'specialAttack',
  spd: 'specialDefense',
  spe: 'speed',
};

export const championStatToCalcStat = Object.fromEntries(
  Object.entries(calcStatToChampionStat).map(([calcStat, championStat]) => [championStat, calcStat]),
);

export function toId(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function normalizeChampionBaseStats(baseStats = {}) {
  return {
    hp: baseStats.hp ?? 0,
    attack: baseStats.attack ?? baseStats.atk ?? 0,
    defense: baseStats.defense ?? baseStats.def ?? 0,
    specialAttack: baseStats.specialAttack ?? baseStats.spa ?? 0,
    specialDefense: baseStats.specialDefense ?? baseStats.spd ?? 0,
    speed: baseStats.speed ?? baseStats.spe ?? 0,
  };
}

export function getAdjustedChampionStats(baseStats = {}) {
  const normalized = normalizeChampionBaseStats(baseStats);

  return Object.fromEntries(
    championStatOrder.map((stat) => [stat, (normalized[stat] ?? 0) + CHAMPIONS_STAT_MODIFIER]),
  );
}

export function getAdjustedCalcStats(baseStats = {}) {
  const championStats = getAdjustedChampionStats(baseStats);

  return Object.fromEntries(
    Object.entries(calcStatToChampionStat).map(([calcStat, championStat]) => [calcStat, championStats[championStat]]),
  );
}

export function getChampionStatMaxima(pokemonEntries = [], pokemonStatsById = new Map()) {
  return pokemonEntries.reduce((maxima, pokemon) => {
    const fallbackStats = pokemonStatsById.get(toId(pokemon?.name))?.baseStats;
    const stats = getAdjustedChampionStats(pokemon?.baseStats ?? fallbackStats);

    for (const stat of championStatOrder) {
      maxima[stat] = Math.max(maxima[stat] ?? 0, stats[stat] ?? 0);
    }

    return maxima;
  }, {});
}
