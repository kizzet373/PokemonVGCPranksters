import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data');
const dbPath = path.join(dataDir, 'pokemon-vgc.sqlite');

function outputPathFromSource(sourcePath) {
  return path.join(rootDir, sourcePath);
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function queryRows(db, sql, params = []) {
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

async function exportReportDocuments(db) {
  const rows = queryRows(
    db,
    `SELECT output_path, payload_json
     FROM report_documents
     ORDER BY output_path`,
  );

  for (const row of rows) {
    await writeJsonFile(outputPathFromSource(row.output_path), JSON.parse(row.payload_json));
  }

  return rows.length;
}

async function exportPlayerDetails(db) {
  const rows = queryRows(
    db,
    `SELECT source_path, payload_json
     FROM report_player_details
     ORDER BY source_path`,
  );

  for (const row of rows) {
    await writeJsonFile(outputPathFromSource(row.source_path), JSON.parse(row.payload_json));
  }

  return rows.length;
}

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(await readFile(dbPath));
  const exportedReportDocuments = await exportReportDocuments(db);
  const exportedPlayerDetails = await exportPlayerDetails(db);

  db.close();
  console.log(`Exported ${exportedReportDocuments} report documents from SQLite.`);
  console.log(`Exported ${exportedPlayerDetails} player detail reports from SQLite.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
