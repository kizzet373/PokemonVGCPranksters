export const TYPE_CHECK_CONFIG = {
  easy: {
    id: 'easy',
    label: 'Easy',
    description: 'One move type into one defending type.',
    defenderTypeCount: 1,
    usesPokemon: false,
    answerMode: 'single',
    multiplierOptions: [0, 0.5, 1, 2],
    pokemonCount: 80,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    description: 'One move type into a dual-type defender.',
    defenderTypeCount: 2,
    usesPokemon: false,
    answerMode: 'single',
    pokemonCount: 100,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    description: 'One move type into a meta Pokemon. Types reveal after submitting.',
    defenderTypeCount: 2,
    usesPokemon: true,
    answerMode: 'single',
    pokemonCount: 120,
  },
  hell: {
    id: 'hell',
    label: 'Hell',
    description: 'Set every move type matchup against a hidden-type meta Pokemon.',
    usesPokemon: true,
    answerMode: 'all-types',
    pokemonCount: 140,
  },
};

export const TYPE_MULTIPLIER_OPTIONS = [0, 0.25, 0.5, 1, 2, 4];
