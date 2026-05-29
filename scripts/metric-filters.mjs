const excludedDropGames = new Set([1]);

export function isMetricEligibleStanding(standing = {}) {
  return !excludedDropGames.has(Number(standing.drop));
}

export function filterMetricEligibleStandings(standings = []) {
  return standings.filter(isMetricEligibleStanding);
}

export const metricEligibilityNote =
  'Metric calculations exclude standings where the player dropped on game 1.';
