import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import databaseUrl from './pokemon-vgc.sqlite?url';
import { normalizeDataValues } from '../utils/dataNormalization';

let databasePromise;

async function loadDatabase() {
  if (!databasePromise) {
    databasePromise = Promise.all([
      initSqlJs({ locateFile: () => sqlWasmUrl }),
      fetch(databaseUrl).then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load SQLite database');
        }

        return response.arrayBuffer();
      }),
    ]).then(([SQL, buffer]) => new SQL.Database(new Uint8Array(buffer)));
  }

  return databasePromise;
}

function queryObjects(db, sql, params = []) {
  const statement = db.prepare(sql, params);
  const rows = [];

  try {
    while (statement.step()) {
      rows.push(statement.getAsObject());
    }
  } finally {
    statement.free();
  }

  return rows;
}

function parsePayload(row, label) {
  if (!row?.payload_json) {
    throw new Error(`Missing SQLite payload for ${label}`);
  }

  return normalizeDataValues(JSON.parse(row.payload_json));
}

export async function loadReportDocument(reportType, { scopeId = null, category = null, separateMegas = false } = {}) {
  const db = await loadDatabase();
  const rows = queryObjects(
    db,
    `SELECT payload_json
     FROM report_documents
     WHERE report_type = ?
       AND (? IS NULL OR scope_id = ?)
       AND (? IS NULL OR category = ?)
       AND separate_megas = ?
     LIMIT 1`,
    [reportType, scopeId, scopeId, category, category, separateMegas ? 1 : 0],
  );

  return parsePayload(rows[0], reportType);
}

export async function loadUsageIndex() {
  return loadReportDocument('usage_index');
}

export async function loadUsageReport(scope, category, { separateMegas = false } = {}) {
  const report = await loadReportDocument('usage', {
    scopeId: scope.id,
    category,
    separateMegas: category === 'pokemon' && separateMegas,
  });

  if (category !== 'pokemon') {
    return report;
  }

  const pokemonStats = await loadRawDocument('pokemon_stats');
  const typingByName = new Map((pokemonStats.pokemon ?? []).map((pokemon) => [pokemon.name, pokemon.typing ?? []]));

  return {
    ...report,
    pokemon: (report.pokemon ?? []).map((pokemon) => ({
      ...pokemon,
      typing: pokemon.typing ?? typingByName.get(pokemon.name) ?? [],
    })),
  };
}

export async function loadPlayerIndex() {
  return loadReportDocument('prankster_elo_index', { category: 'players' });
}

export async function loadPlayerReport(scope) {
  return loadReportDocument('prankster_elo', {
    scopeId: scope.id,
    category: 'players',
  });
}

export async function loadPlayerDetails(playerId) {
  const db = await loadDatabase();
  const rows = queryObjects(
    db,
    `SELECT payload_json
     FROM report_player_details
     WHERE player_id = ?
     LIMIT 1`,
    [playerId],
  );

  return parsePayload(rows[0], `player ${playerId}`);
}

export async function loadTournamentReport(scope) {
  const db = await loadDatabase();
  const rows = queryObjects(
    db,
    `SELECT payload_json
     FROM report_documents
     WHERE report_type = 'tournament_report'
       AND scope_id = ?
     LIMIT 1`,
    [scope.id],
  );

  if (rows[0]) {
    return parsePayload(rows[0], `tournament report ${scope.id}`);
  }

  const scopeRows = queryObjects(
    db,
    `SELECT payload_json
     FROM report_scopes
     WHERE scope_id = ?
     LIMIT 1`,
    [scope.id],
  );
  const tournamentRows = queryObjects(
    db,
    `SELECT payload_json
     FROM report_tournament_rows
     WHERE scope_id = ?
     ORDER BY date DESC, name ASC`,
    [scope.id],
  );
  const tournaments = tournamentRows.map((row) => normalizeDataValues(JSON.parse(row.payload_json)));
  const playerTotal = tournaments.reduce((total, tournament) => total + (tournament.players ?? 0), 0);

  return {
    schemaVersion: 1,
    scope: scopeRows[0] ? normalizeDataValues(JSON.parse(scopeRows[0].payload_json)) : scope,
    tournamentFormat: scope.format ?? '',
    totals: {
      tournaments: tournaments.length,
      players: playerTotal,
      averageTournamentSize: tournaments.length ? Number((playerTotal / tournaments.length).toFixed(4)) : 0,
    },
    tournaments,
  };
}

export async function loadStandings(tournamentId) {
  const db = await loadDatabase();
  const rows = queryObjects(
    db,
    `SELECT payload_json
     FROM raw_standings_files
     WHERE tournament_id = ?
     LIMIT 1`,
    [tournamentId],
  );

  return parsePayload(rows[0], `standings ${tournamentId}`);
}

export async function loadRawDocument(documentType) {
  const db = await loadDatabase();
  const rows = queryObjects(
    db,
    `SELECT payload_json
     FROM raw_documents
     WHERE document_type = ?
     LIMIT 1`,
    [documentType],
  );

  return parsePayload(rows[0], documentType);
}
