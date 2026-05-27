const earlyDropGames = new Set([1, 2]);

export function isMetricEligibleStanding(standing = {}) {
  return !earlyDropGames.has(Number(standing.drop));
}

export const metricEligibilityNote =
  'Metric calculations exclude standings where the player dropped on game 1 or game 2.';
