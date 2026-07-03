import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data');
const publicDataDir = path.join(rootDir, 'public', 'data');
const outputPath = path.join(dataDir, 'pokemon-vgc.sqlite');

function stripBom(contents) {
  return contents.replace(/^\uFEFF/, '');
}

async function readJson(filePath) {
  return JSON.parse(stripBom(await readFile(filePath, 'utf8')));
}

function stringify(value) {
  return JSON.stringify(value ?? null);
}

function valueOrNull(value) {
  return value === undefined ? null : value;
}

function recordWinRate(row) {
  return valueOrNull(row?.record?.winRate);
}

function games(row) {
  return valueOrNull(row?.record?.games);
}

function wins(row) {
  return valueOrNull(row?.record?.wins);
}

function losses(row) {
  return valueOrNull(row?.record?.losses);
}

function ties(row) {
  return valueOrNull(row?.record?.ties);
}

function documentName(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

async function readJsonFiles(dir) {
  const files = await readdir(dir, { withFileTypes: true });
  const jsonFiles = [];

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      jsonFiles.push(...await readJsonFiles(filePath));
    } else if (file.name.endsWith('.json')) {
      jsonFiles.push(filePath);
    }
  }

  return jsonFiles.sort((a, b) => a.localeCompare(b));
}

function runSchema(db) {
  db.run(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE raw_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_type TEXT NOT NULL,
      source_path TEXT NOT NULL UNIQUE,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE raw_tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      format TEXT,
      players INTEGER,
      organizer_id TEXT,
      source TEXT,
      payload_json TEXT NOT NULL
    );

    CREATE INDEX idx_raw_tournaments_date ON raw_tournaments(date);
    CREATE INDEX idx_raw_tournaments_format ON raw_tournaments(format);

    CREATE TABLE raw_standings_files (
      tournament_id TEXT PRIMARY KEY,
      source_path TEXT NOT NULL,
      tournament_name TEXT,
      date TEXT,
      format TEXT,
      standings_count INTEGER,
      payload_json TEXT NOT NULL
    );

    CREATE INDEX idx_raw_standings_date ON raw_standings_files(date);
    CREATE INDEX idx_raw_standings_format ON raw_standings_files(format);

    CREATE TABLE report_scopes (
      scope_id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      type TEXT NOT NULL,
      month TEXT,
      format TEXT,
      totals_json TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE report_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_type TEXT NOT NULL,
      scope_id TEXT,
      category TEXT,
      separate_megas INTEGER NOT NULL DEFAULT 0,
      source_path TEXT NOT NULL UNIQUE,
      output_path TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE INDEX idx_report_documents_scope ON report_documents(scope_id);
    CREATE INDEX idx_report_documents_category ON report_documents(category, separate_megas);

    CREATE TABLE report_usage_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope_id TEXT NOT NULL,
      category TEXT NOT NULL,
      separate_megas INTEGER NOT NULL DEFAULT 0,
      entity_id TEXT,
      entity_name TEXT,
      rank INTEGER,
      count INTEGER,
      usage_percent REAL,
      win_rate REAL,
      games INTEGER,
      wins INTEGER,
      losses INTEGER,
      ties INTEGER,
      payload_json TEXT NOT NULL
    );

    CREATE INDEX idx_report_usage_rows_scope_category ON report_usage_rows(scope_id, category, separate_megas);
    CREATE INDEX idx_report_usage_rows_usage ON report_usage_rows(category, separate_megas, usage_percent DESC);

    CREATE TABLE report_team_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope_id TEXT NOT NULL,
      team_size INTEGER NOT NULL,
      rank INTEGER NOT NULL,
      pokemon_ids_json TEXT NOT NULL,
      pokemon_names_json TEXT NOT NULL,
      count INTEGER,
      usage_percent REAL,
      win_rate REAL,
      games INTEGER,
      wins INTEGER,
      losses INTEGER,
      ties INTEGER,
      payload_json TEXT NOT NULL
    );

    CREATE INDEX idx_report_team_rows_scope_size ON report_team_rows(scope_id, team_size);

    CREATE TABLE report_player_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope_id TEXT NOT NULL,
      rank INTEGER,
      player_id TEXT,
      player_name TEXT,
      country TEXT,
      prankster_elo INTEGER,
      tournaments INTEGER,
      average_size REAL,
      win_rate REAL,
      wins INTEGER,
      losses INTEGER,
      ties INTEGER,
      payload_json TEXT NOT NULL
    );

    CREATE INDEX idx_report_player_rows_scope ON report_player_rows(scope_id);
    CREATE INDEX idx_report_player_rows_elo ON report_player_rows(scope_id, prankster_elo DESC);

    CREATE TABLE report_player_details (
      player_id TEXT PRIMARY KEY,
      source_path TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE report_tournament_rows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope_id TEXT NOT NULL,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      format TEXT,
      players INTEGER,
      payload_json TEXT NOT NULL
    );

    CREATE INDEX idx_report_tournament_rows_scope ON report_tournament_rows(scope_id);
    CREATE INDEX idx_report_tournament_rows_date ON report_tournament_rows(scope_id, date DESC);
  `);
}

function insertMetadata(db, key, value) {
  db.run('INSERT INTO metadata (key, value) VALUES (?, ?)', [key, value]);
}

async function insertRawDocuments(db) {
  const rawDocuments = [
    ['tournament_index', path.join(dataDir, 'regulation-m-a-tournaments.json')],
    ['standings_index', path.join(dataDir, 'standings-index.json')],
    ['usage_index', path.join(dataDir, 'usage-stats', 'index.json')],
    ['pokemon_stats', path.join(dataDir, 'pokemon-stats.json')],
    ['champions_mega_metadata', path.join(dataDir, 'champions-mega-metadata.json')],
    ['asset_index', path.join(dataDir, 'asset-index.json')],
    ['type_matchups', path.join(dataDir, 'type-matchups.json')],
    ['country_names', path.join(dataDir, 'country-names.json')],
    ['prankster_elo_index', path.join(publicDataDir, 'prankster-elo', 'index.json')],
  ];
  const stmt = db.prepare(`
    INSERT INTO raw_documents (document_type, source_path, payload_json)
    VALUES (?, ?, ?)
  `);

  try {
    for (const [type, filePath] of rawDocuments) {
      const payload = await readJson(filePath);
      stmt.run([type, documentName(filePath), stringify(payload)]);
    }
  } finally {
    stmt.free();
  }
}

async function insertTournaments(db) {
  const tournamentsData = await readJson(path.join(dataDir, 'regulation-m-a-tournaments.json'));
  const stmt = db.prepare(`
    INSERT INTO raw_tournaments (
      id, name, date, format, players, organizer_id, source, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    for (const tournament of tournamentsData.tournaments ?? []) {
      stmt.run([
        tournament.id,
        tournament.name,
        tournament.date,
        valueOrNull(tournament.format),
        valueOrNull(tournament.players),
        valueOrNull(tournament.organizerId),
        valueOrNull(tournamentsData.source),
        stringify(tournament),
      ]);
    }
  } finally {
    stmt.free();
  }
}

async function insertStandingsFiles(db) {
  const standingsIndex = await readJson(path.join(dataDir, 'standings-index.json'));
  const stmt = db.prepare(`
    INSERT INTO raw_standings_files (
      tournament_id, source_path, tournament_name, date, format, standings_count, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    for (const tournamentId of standingsIndex.tournamentOrder ?? []) {
      const entry = standingsIndex.byTournamentId?.[tournamentId];

      if (!entry?.file) {
        continue;
      }

      const filePath = path.join(dataDir, entry.file);
      const payload = await readJson(filePath);
      const tournament = payload.tournament ?? {};

      stmt.run([
        tournamentId,
        documentName(filePath),
        valueOrNull(tournament.name),
        valueOrNull(tournament.date),
        valueOrNull(tournament.format),
        payload.standings?.length ?? 0,
        stringify(payload),
      ]);
    }
  } finally {
    stmt.free();
  }
}

function insertReportScope(db, scope) {
  db.run(
    `INSERT OR REPLACE INTO report_scopes (
      scope_id, label, type, month, format, totals_json, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      scope.id,
      scope.label,
      scope.type,
      valueOrNull(scope.month),
      valueOrNull(scope.format),
      stringify(scope.totals ?? {}),
      stringify(scope),
    ],
  );
}

function usageRowsForDocument(category, payload) {
  if (category === 'teams') {
    return [];
  }

  return payload[category] ?? [];
}

function insertUsageRows(db, scopeId, category, separateMegas, payload) {
  if (category === 'teams') {
    const stmt = db.prepare(`
      INSERT INTO report_team_rows (
        scope_id, team_size, rank, pokemon_ids_json, pokemon_names_json, count,
        usage_percent, win_rate, games, wins, losses, ties, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      for (const teamSize of payload.teamSizes ?? []) {
        for (const combo of teamSize.combos ?? []) {
          stmt.run([
            scopeId,
            teamSize.size,
            combo.rank,
            stringify((combo.pokemon ?? []).map((pokemon) => pokemon.id)),
            stringify((combo.pokemon ?? []).map((pokemon) => pokemon.name)),
            valueOrNull(combo.count),
            valueOrNull(combo.usagePercent),
            recordWinRate(combo),
            games(combo),
            wins(combo),
            losses(combo),
            ties(combo),
            stringify(combo),
          ]);
        }
      }
    } finally {
      stmt.free();
    }

    return;
  }

  const stmt = db.prepare(`
    INSERT INTO report_usage_rows (
      scope_id, category, separate_megas, entity_id, entity_name, rank, count,
      usage_percent, win_rate, games, wins, losses, ties, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    usageRowsForDocument(category, payload).forEach((row, index) => {
      stmt.run([
        scopeId,
        category,
        separateMegas ? 1 : 0,
        valueOrNull(row.id),
        valueOrNull(row.name),
        valueOrNull(row.rank ?? index + 1),
        valueOrNull(row.count),
        valueOrNull(row.usagePercent),
        recordWinRate(row),
        games(row),
        wins(row),
        losses(row),
        ties(row),
        stringify(row),
      ]);
    });
  } finally {
    stmt.free();
  }
}

async function insertUsageReports(db) {
  const usageIndexPath = path.join(dataDir, 'usage-stats', 'index.json');
  const usageIndex = await readJson(usageIndexPath);
  const documentStmt = db.prepare(`
    INSERT INTO report_documents (
      report_type, scope_id, category, separate_megas, source_path, output_path, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    documentStmt.run([
      'usage_index',
      null,
      null,
      0,
      documentName(usageIndexPath),
      documentName(usageIndexPath),
      stringify(usageIndex),
    ]);

    for (const scope of usageIndex.scopes ?? []) {
      insertReportScope(db, scope);

      for (const [fileKey, relativeFile] of Object.entries(scope.files ?? {})) {
        const category = fileKey === 'pokemonSeparateMegas' ? 'pokemon' : fileKey;
        const separateMegas = fileKey === 'pokemonSeparateMegas';
        const filePath = path.join(dataDir, relativeFile);
        const payload = await readJson(filePath);

        documentStmt.run([
          'usage',
          scope.id,
          category,
          separateMegas ? 1 : 0,
          documentName(filePath),
          documentName(filePath),
          stringify(payload),
        ]);
        insertUsageRows(db, scope.id, category, separateMegas, payload);
      }
    }
  } finally {
    documentStmt.free();
  }
}

async function insertEloReports(db) {
  const eloIndexPath = path.join(publicDataDir, 'prankster-elo', 'index.json');
  const eloIndex = await readJson(eloIndexPath);
  const documentStmt = db.prepare(`
    INSERT INTO report_documents (
      report_type, scope_id, category, separate_megas, source_path, output_path, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const playerStmt = db.prepare(`
    INSERT INTO report_player_rows (
      scope_id, rank, player_id, player_name, country, prankster_elo, tournaments,
      average_size, win_rate, wins, losses, ties, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    documentStmt.run([
      'prankster_elo_index',
      null,
      'players',
      0,
      documentName(eloIndexPath),
      documentName(eloIndexPath),
      stringify(eloIndex),
    ]);

    for (const scope of eloIndex.scopes ?? []) {
      const filePath = path.join(publicDataDir, scope.file);
      const payload = await readJson(filePath);

      documentStmt.run([
        'prankster_elo',
        scope.id,
        'players',
        0,
        documentName(filePath),
        documentName(filePath),
        stringify(payload),
      ]);

      for (const player of payload.players ?? []) {
        playerStmt.run([
          scope.id,
          valueOrNull(player.rank),
          valueOrNull(player.id),
          valueOrNull(player.name),
          valueOrNull(player.country),
          valueOrNull(player.pranksterElo),
          valueOrNull(player.tournaments),
          valueOrNull(player.averageSize),
          recordWinRate(player),
          wins(player),
          losses(player),
          ties(player),
          stringify(player),
        ]);
      }
    }
  } finally {
    documentStmt.free();
    playerStmt.free();
  }

  const detailFiles = await readJsonFiles(path.join(publicDataDir, 'prankster-elo', 'players'));
  const detailStmt = db.prepare(`
    INSERT INTO report_player_details (player_id, source_path, payload_json)
    VALUES (?, ?, ?)
  `);

  try {
    for (const filePath of detailFiles) {
      const payload = await readJson(filePath);
      const playerId = payload.player?.id ?? path.basename(filePath, '.json');

      detailStmt.run([playerId, documentName(filePath), stringify(payload)]);
    }
  } finally {
    detailStmt.free();
  }
}

function tournamentMatchesScope(tournament, scope) {
  if (scope.type === 'full') {
    return true;
  }

  const month = scope.month ?? scope.id;

  if (tournament.date?.slice(0, 7) !== month) {
    return false;
  }

  return !scope.format || tournament.format === scope.format;
}

async function insertTournamentReports(db) {
  const usageIndex = await readJson(path.join(dataDir, 'usage-stats', 'index.json'));
  const tournamentsData = await readJson(path.join(dataDir, 'regulation-m-a-tournaments.json'));
  const stmt = db.prepare(`
    INSERT INTO report_tournament_rows (
      scope_id, tournament_id, name, date, format, players, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    for (const scope of usageIndex.scopes ?? []) {
      for (const tournament of tournamentsData.tournaments ?? []) {
        if (!tournamentMatchesScope(tournament, scope)) {
          continue;
        }

        stmt.run([
          scope.id,
          tournament.id,
          tournament.name,
          tournament.date,
          valueOrNull(tournament.format),
          valueOrNull(tournament.players),
          stringify(tournament),
        ]);
      }
    }
  } finally {
    stmt.free();
  }
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  runSchema(db);
  db.run('BEGIN TRANSACTION');

  try {
    insertMetadata(db, 'schema_version', '1');
    insertMetadata(db, 'generated_at', new Date().toISOString());
    await insertRawDocuments(db);
    await insertTournaments(db);
    await insertStandingsFiles(db);
    await insertUsageReports(db);
    await insertEloReports(db);
    await insertTournamentReports(db);
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(db.export()));

  const counts = Object.fromEntries(
    db.exec(`
      SELECT 'raw_tournaments' AS table_name, COUNT(*) AS count FROM raw_tournaments
      UNION ALL SELECT 'raw_standings_files', COUNT(*) FROM raw_standings_files
      UNION ALL SELECT 'report_documents', COUNT(*) FROM report_documents
      UNION ALL SELECT 'report_usage_rows', COUNT(*) FROM report_usage_rows
      UNION ALL SELECT 'report_team_rows', COUNT(*) FROM report_team_rows
      UNION ALL SELECT 'report_player_rows', COUNT(*) FROM report_player_rows
      UNION ALL SELECT 'report_tournament_rows', COUNT(*) FROM report_tournament_rows
    `)[0].values,
  );

  db.close();
  console.log(`Built SQLite database at ${documentName(outputPath)}.`);
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
