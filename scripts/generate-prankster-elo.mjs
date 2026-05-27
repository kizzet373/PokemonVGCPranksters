import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMetricEligibleStanding, metricEligibilityNote } from './metric-filters.mjs';
import { normalizeDataText, normalizePokemon } from './pokemon-normalization.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data');
const standingsDir = path.join(dataDir, 'standings');
const standingsIndexPath = path.join(dataDir, 'standings-index.json');
const publicDataDir = path.join(rootDir, 'public', 'data');
const outputDir = path.join(publicDataDir, 'prankster-elo');
const detailsDir = path.join(outputDir, 'players');
const baseElo = 1500;
const dayMs = 24 * 60 * 60 * 1000;
const recencyHalfLifeDays = 21;
const totalTournamentsModifierMin = 0.87832;
const totalTournamentsModifierMax = 1.21528;
const tournamentSizeModifierMin = 0.94;
const tournamentSizeModifierMax = 1.09;
const totalWinRateModifierMin = 0.9;
const totalWinRateModifierMax = 1.16;

function parseJsonFile(contents) {
  return JSON.parse(contents.replace(/^\uFEFF/, ''));
}

async function readJson(pathname) {
  return parseJsonFile(await readFile(pathname, 'utf8'));
}

function formatNumber(value) {
  return Number(value.toFixed(4));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function recordGames(record = {}) {
  return (record.wins ?? 0) + (record.losses ?? 0) + (record.ties ?? 0);
}

function winRate(record = {}) {
  const decidedGames = (record.wins ?? 0) + (record.losses ?? 0);
  return decidedGames === 0 ? null : formatNumber(((record.wins ?? 0) / decidedGames) * 100);
}

function addRecord(target, record = {}) {
  target.wins += record.wins ?? 0;
  target.losses += record.losses ?? 0;
  target.ties += record.ties ?? 0;
}

function playerKey(standing) {
  return normalizeDataText(standing.player) || normalizeDataText(standing.name).replace(/\s+/g, '-');
}

function safeFileSegment(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function placementScore(placing, tournamentSize, record) {
  if (Number.isFinite(placing) && Number.isFinite(tournamentSize) && tournamentSize > 1) {
    return clamp((tournamentSize - placing) / (tournamentSize - 1), 0, 1);
  }

  const rate = winRate(record);
  return rate === null ? 0.5 : clamp(rate / 100, 0, 1);
}

function recencyScore(date, latestDate) {
  const ageDays = Math.max(0, (latestDate.getTime() - date.getTime()) / dayMs);
  return Math.pow(0.5, ageDays / recencyHalfLifeDays);
}

function modifier(value, min, max) {
  return min + clamp(value, 0, 1) * (max - min);
}

function createPlayer(standing) {
  return {
    id: playerKey(standing),
    name: normalizeDataText(standing.name),
    country: normalizeDataText(standing.country) ?? null,
    tournaments: 0,
    totalSize: 0,
    record: {
      wins: 0,
      losses: 0,
      ties: 0,
    },
    placementScoreTotal: 0,
    placementWeightTotal: 0,
    recencyScoreTotal: 0,
    recencyWeightTotal: 0,
    standings: [],
  };
}

function addStanding(player, tournament, standing, latestDate) {
  const size = tournament.players ?? standing.tournamentSize ?? 0;
  const date = new Date(tournament.date);
  const placement = Number.isFinite(standing.placing) ? standing.placing : null;
  const sizeWeight = Math.sqrt(Math.max(size, 1));
  const placementValue = placementScore(placement, size, standing.record);
  const team = (standing.team ?? []).map(normalizePokemon);

  player.name = normalizeDataText(standing.name);
  player.country = normalizeDataText(standing.country) ?? player.country;
  player.tournaments += 1;
  player.totalSize += size;
  player.placementScoreTotal += placementValue * sizeWeight;
  player.placementWeightTotal += sizeWeight;
  player.recencyScoreTotal += recencyScore(date, latestDate) * sizeWeight;
  player.recencyWeightTotal += sizeWeight;
  addRecord(player.record, standing.record);

  player.standings.push({
    tournamentId: tournament.id,
    tournamentName: normalizeDataText(tournament.name),
    date: tournament.date,
    tournamentSize: size,
    placing: placement,
    record: {
      ...standing.record,
      games: recordGames(standing.record),
      winRate: winRate(standing.record),
    },
    team,
  });
}

function serializePlayer(player, maxTournaments, maxAverageSize) {
  const averageSize = player.tournaments === 0 ? 0 : player.totalSize / player.tournaments;
  const placementScoreAverage = player.placementWeightTotal === 0 ? 0.5 : player.placementScoreTotal / player.placementWeightTotal;
  const recencyScoreAverage = player.recencyWeightTotal === 0 ? 0 : player.recencyScoreTotal / player.recencyWeightTotal;
  const tournamentScore = maxTournaments <= 1 ? 1 : Math.log1p(player.tournaments) / Math.log1p(maxTournaments);
  const sizeScore = maxAverageSize <= 1 ? 1 : Math.log1p(averageSize) / Math.log1p(maxAverageSize);
  const playerWinRate = winRate(player.record);
  const winRateScore = playerWinRate === null ? 0.5 : playerWinRate / 100;
  const modifiers = {
    tournamentSize: formatNumber(modifier(sizeScore, tournamentSizeModifierMin, tournamentSizeModifierMax)),
    placement: formatNumber(modifier(placementScoreAverage, 0.9, 1.16)),
    totalTournaments: formatNumber(modifier(tournamentScore, totalTournamentsModifierMin, totalTournamentsModifierMax)),
    totalWinRate: formatNumber(modifier(winRateScore, totalWinRateModifierMin, totalWinRateModifierMax)),
    recency: formatNumber(modifier(recencyScoreAverage, 0.97, 1.05)),
  };
  const pranksterElo = Math.round(
    baseElo *
      modifiers.tournamentSize *
      modifiers.placement *
      modifiers.totalTournaments *
      modifiers.totalWinRate *
      modifiers.recency,
  );

  return {
    id: player.id,
    name: player.name,
    country: player.country,
    pranksterElo,
    tournaments: player.tournaments,
    averageSize: formatNumber(averageSize),
    record: {
      ...player.record,
      winRate: playerWinRate,
    },
    standings: player.standings.sort((a, b) => new Date(b.date) - new Date(a.date)),
  };
}

function splitPlayerDetails(player) {
  const { standings, ...summary } = player;

  return {
    summary,
    details: {
      schemaVersion: 1,
      player: {
        id: player.id,
        name: player.name,
        country: player.country,
        pranksterElo: player.pranksterElo,
        rank: player.rank,
      },
      standings,
    },
  };
}

function scopeFromId(scopeId) {
  if (scopeId === 'full') {
    return {
      id: 'full',
      label: 'full metagame',
      type: 'full',
    };
  }

  return {
    id: scopeId,
    label: scopeId,
    type: 'month',
    month: scopeId,
  };
}

function serializeScope({ scopeId, tournaments, standingsIndex, generatedAt, includeDetails = false }) {
  const latestDate = tournaments.reduce((latest, tournament) => {
    const date = new Date(tournament.tournament.date);
    return date > latest ? date : latest;
  }, new Date(0));
  const players = new Map();
  const totals = {
    tournaments: tournaments.length,
    standings: 0,
    excludedGameOneDrops: 0,
    players: 0,
    totalGamesPlayed: 0,
    averageTournamentSize: 0,
    indexedTournaments: standingsIndex.tournamentCount,
    indexedStandings: standingsIndex.standingsCount,
  };

  for (const tournamentStandings of tournaments) {
    totals.averageTournamentSize += tournamentStandings.tournament.players ?? 0;

    for (const standing of tournamentStandings.standings ?? []) {
      if (!isMetricEligibleStanding(standing)) {
        totals.excludedGameOneDrops += 1;
        continue;
      }

      if ((standing.team ?? []).length === 0) {
        continue;
      }

      totals.standings += 1;
      totals.totalGamesPlayed += recordGames(standing.record);

      const key = playerKey(standing);
      if (!players.has(key)) {
        players.set(key, createPlayer(standing));
      }

      addStanding(players.get(key), tournamentStandings.tournament, standing, latestDate);
    }
  }

  const playerValues = [...players.values()].filter((player) => player.tournaments > 1);
  const maxTournaments = Math.max(1, ...playerValues.map((player) => player.tournaments));
  const maxAverageSize = Math.max(1, ...playerValues.map((player) => player.totalSize / player.tournaments));
  const rankedPlayers = playerValues
    .map((player) => serializePlayer(player, maxTournaments, maxAverageSize))
    .sort((a, b) => b.pranksterElo - a.pranksterElo || b.tournaments - a.tournaments || a.name.localeCompare(b.name))
    .map((player, index) => ({
      rank: index + 1,
      ...player,
    }));
  const splitPlayers = rankedPlayers.map(splitPlayerDetails);

  totals.players = rankedPlayers.length;
  totals.averageTournamentSize = totals.tournaments === 0 ? 0 : formatNumber(totals.averageTournamentSize / totals.tournaments);

  const stats = {
    schemaVersion: 1,
    generatedAt,
    scope: scopeFromId(scopeId),
    source: {
      standingsIndex: 'standings-index.json',
      standingsDirectory: 'standings',
    },
    notes: {
      pranksterElo:
        'Elo-inspired bounded index: 1500 multiplied by tournament size, placement, total tournaments, total win-rate, and recency modifiers, in that priority order. It is not pairwise Elo because Limitless standings do not include opponent-level match logs.',
      formula:
        'round(1500 * tournamentSizeModifier * placementModifier * totalTournamentsModifier * totalWinRateModifier * recencyModifier)',
      modifierRanges:
        `Tournament size ${tournamentSizeModifierMin}-${tournamentSizeModifierMax}, placement 0.90-1.16, total tournaments ${totalTournamentsModifierMin}-${totalTournamentsModifierMax}, total win-rate ${totalWinRateModifierMin}-${totalWinRateModifierMax}, recency 0.97-1.05.`,
      metricEligibility: metricEligibilityNote,
    },
    totals,
    players: splitPlayers.map((player) => player.summary),
  };

  if (includeDetails) {
    stats.details = splitPlayers.map((player) => player.details);
  }

  return stats;
}

function fileName(scopeId) {
  return `${scopeId}.json`;
}

async function writePlayerDetails(playerDetails) {
  await mkdir(detailsDir, { recursive: true });

  for (const detail of playerDetails) {
    await writeFile(
      path.join(detailsDir, `${safeFileSegment(detail.player.id)}.json`),
      `${JSON.stringify(detail, null, 2)}\n`,
      'utf8',
    );
  }
}

async function main() {
  const standingsIndex = await readJson(standingsIndexPath);
  const generatedAt = new Date().toISOString();
  const allTournaments = [];
  const byMonth = new Map();

  for (const tournamentId of standingsIndex.tournamentOrder ?? []) {
    const indexEntry = standingsIndex.byTournamentId[tournamentId];

    if (!indexEntry?.file) {
      continue;
    }

    const tournamentStandings = await readJson(path.join(dataDir, indexEntry.file));
    const month = tournamentStandings.tournament.date.slice(0, 7);

    allTournaments.push(tournamentStandings);

    if (!byMonth.has(month)) {
      byMonth.set(month, []);
    }

    byMonth.get(month).push(tournamentStandings);
  }

  await rm(outputDir, { recursive: true, force: true });
  await Promise.all([mkdir(outputDir, { recursive: true }), mkdir(detailsDir, { recursive: true })]);

  const fullStats = serializeScope({
    scopeId: 'full',
    tournaments: allTournaments,
    standingsIndex,
    generatedAt,
    includeDetails: true,
  });

  const fullDetails = fullStats.details;
  delete fullStats.details;
  await writeFile(path.join(outputDir, fileName('full')), `${JSON.stringify(fullStats, null, 2)}\n`, 'utf8');
  await writePlayerDetails(fullDetails);

  const monthEntries = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  const scopes = [
    {
      id: 'full',
      label: 'full metagame',
      type: 'full',
      file: `prankster-elo/${fileName('full')}`,
      totals: fullStats.totals,
    },
  ];

  for (const [month, tournaments] of monthEntries) {
    const monthStats = serializeScope({
      scopeId: month,
      tournaments,
      standingsIndex,
      generatedAt,
    });

    await writeFile(path.join(outputDir, fileName(month)), `${JSON.stringify(monthStats, null, 2)}\n`, 'utf8');
    scopes.push({
      id: month,
      label: month,
      type: 'month',
      month,
      file: `prankster-elo/${fileName(month)}`,
      totals: monthStats.totals,
    });
  }

  const index = {
    schemaVersion: 1,
    generatedAt,
    source: {
      standingsIndex: 'standings-index.json',
      standingsDirectory: 'standings',
    },
    scopes,
  };

  await writeFile(path.join(outputDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  console.log(`Generated Prankster ELO for full metagame and ${monthEntries.length} monthly scopes.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
