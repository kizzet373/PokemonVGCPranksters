const excludedDropGames = new Set([1]);

export function isMetricEligibleStanding(standing = {}) {
  return standing.reporting?.valid !== false && !excludedDropGames.has(Number(standing.drop));
}

export function filterMetricEligibleStandings(standings = []) {
  return standings.filter(isMetricEligibleStanding);
}

export function metricExclusionCounts(standings = []) {
  return standings.reduce((counts, standing) => {
    if (standing.reporting?.valid === false) {
      counts.invalidStandings += 1;
    } else if (excludedDropGames.has(Number(standing.drop))) {
      counts.gameOneDrops += 1;
    }

    return counts;
  }, { gameOneDrops: 0, invalidStandings: 0 });
}

export const metricEligibilityNote =
  'Metric calculations exclude standings marked invalid because required data could not be resolved, plus standings where the player dropped on game 1.';
