import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeDataText, normalizePokemon } from './pokemon-normalization.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'src', 'data');
const tournamentsPath = path.join(dataDir, 'regulation-m-a-tournaments.json');
const standingsDir = path.join(dataDir, 'standings');
const pokemonStatsPath = path.join(dataDir, 'pokemon-stats.json');
const pokemonUsagePath = path.join(dataDir, 'usage-stats', 'pokemon', 'full.json');

const sourcePageUrl = 'https://www.pokedata.ovh/standingsVGC/';
const earliestDate = '2026-04-01';
const game = 'VGC';
const format = 'M-A';
const requestDelayMs = 350;
const dryRun = process.argv.includes('--dry-run');
const verbose = process.argv.includes('--verbose') || dryRun;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseJsonFile(contents) {
  return JSON.parse(contents.replace(/^\uFEFF/, ''));
}

async function readJson(pathname, fallback) {
  try {
    return parseJsonFile(await readFile(pathname, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

function localDateOnly(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function dateSortValue(date) {
  return new Date(`${date}T00:00:00.000Z`).getTime();
}

function sortNewestFirst(tournaments) {
  return [...tournaments].sort((a, b) => dateSortValue(b.date) - dateSortValue(a.date));
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f\d]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function textContent(value) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function normalizeTournamentName(name) {
  return normalizeDataText(name).replace(/\s+/g, ' ');
}

function parsePokeDataDate(dateText) {
  const monthNames = new Map([
    ['january', 1],
    ['february', 2],
    ['march', 3],
    ['april', 4],
    ['may', 5],
    ['june', 6],
    ['july', 7],
    ['august', 8],
    ['september', 9],
    ['october', 10],
    ['november', 11],
    ['december', 12],
  ]);
  const match = normalizeDataText(dateText).match(/^([a-z]+)\s+(\d{1,2})(?:\s*-\s*(?:[a-z]+\s+)?\d{1,2})?,\s*(\d{4})$/i);

  if (!match) {
    return null;
  }

  const [, monthName, dayText, yearText] = match;
  const month = monthNames.get(monthName);
  const day = Number(dayText);
  const year = Number(yearText);

  if (!month || !Number.isInteger(day) || !Number.isInteger(year)) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseButtonLink(attributes) {
  const match = attributes.match(/\blocation\.href\s*=\s*['"]([^'"]+)['"]/i);

  if (!match) {
    return null;
  }

  return new URL(match[1], sourcePageUrl).toString();
}

function tournamentIdFromLink(link) {
  const { pathname } = new URL(link);
  const segments = pathname.split('/').filter(Boolean);

  return segments.at(-1) ?? null;
}

function mastersJsonUrl(tournamentId) {
  return new URL(`${tournamentId}/masters/${tournamentId}_Masters.json`, sourcePageUrl).toString();
}

function parseTournamentButtons(html) {
  const buttons = [];
  const divButtonPattern = /<div\b[^>]*>[\s\S]*?<button\b([^>]*)>([\s\S]*?)<\/button>[\s\S]*?<\/div>/gi;

  for (const match of html.matchAll(divButtonPattern)) {
    const [, attributes, rawLabel] = match;
    const label = textContent(rawLabel).toLowerCase();
    const [name, dateText] = label.split(' - ');
    const link = parseButtonLink(attributes);
    const id = link ? tournamentIdFromLink(link) : null;
    const date = dateText ? parsePokeDataDate(dateText) : null;

    if (!name || !date || !link || !id) {
      continue;
    }

    buttons.push({
      id,
      name: normalizeTournamentName(name),
      date,
      link,
      source: mastersJsonUrl(id),
    });
  }

  return buttons;
}

function toAliasKey(value) {
  return normalizeDataText(value)
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function pokemonNameAliases(name) {
  const normalizedName = normalizeDataText(name);
  const aliases = new Set([normalizedName]);
  const regionalPrefixes = [
    ['hisuian', ['hisui', 'hisuian']],
    ['alolan', ['alola', 'alolan']],
    ['galarian', ['galar', 'galarian']],
    ['paldean', ['paldea', 'paldean']],
  ];

  for (const [prefix, suffixes] of regionalPrefixes) {
    if (!normalizedName.startsWith(`${prefix} `)) {
      continue;
    }

    const baseName = normalizedName.slice(prefix.length + 1);
    for (const suffix of suffixes) {
      aliases.add(`${baseName} ${suffix}`);
      aliases.add(`${baseName}-${suffix}`);
    }
  }

  if (normalizedName.startsWith('paldean tauros ')) {
    const breed = normalizedName.replace(/^paldean tauros\s+/, '');
    aliases.add(`tauros ${breed}`);
    aliases.add(`tauros paldean ${breed}`);
  }

  return aliases;
}

function addLegalPokemonRecord(lookup, pokemon) {
  const id = normalizeDataText(pokemon.id ?? pokemon.pokeApiName ?? pokemon.name);
  const name = normalizeDataText(pokemon.name ?? pokemon.pokeApiName ?? pokemon.id);
  const aliases = new Set([id, name, pokemon.pokeApiName]);

  for (const alias of pokemonNameAliases(name)) {
    aliases.add(alias);
  }

  for (const alias of aliases) {
    const key = toAliasKey(alias);

    if (key) {
      lookup.set(key, { id, name });
    }
  }
}

async function buildLegalPokemonLookup() {
  const pokemonStats = await readJson(pokemonStatsPath, { pokemon: [] });
  const pokemonUsage = await readJson(pokemonUsagePath, { pokemon: [] });
  const lookup = new Map();

  for (const pokemon of pokemonStats.pokemon ?? []) {
    addLegalPokemonRecord(lookup, pokemon);
  }

  for (const pokemon of pokemonUsage.pokemon ?? []) {
    addLegalPokemonRecord(lookup, pokemon);
  }

  return lookup;
}

function incomingPokemonAliases(name) {
  const normalizedName = normalizeDataText(name);
  const bracketMatch = normalizedName.match(/^(.+?)\s*\[(.+?)\]$/);
  const aliases = new Set([normalizedName]);

  if (bracketMatch) {
    const [, baseName, formName] = bracketMatch;
    const cleanedFormName = formName.replace(/\s+forme?$/i, '').trim();
    const formWithoutBaseName = cleanedFormName.endsWith(` ${baseName}`)
      ? cleanedFormName.slice(0, -baseName.length).trim()
      : cleanedFormName;
    const defaultFormNames = new Set(['unremarkable', 'normal', 'ordinary', 'average', 'default']);

    aliases.add(cleanedFormName);
    aliases.add(`${baseName} ${cleanedFormName}`);
    aliases.add(`${cleanedFormName} ${baseName}`);

    if (formWithoutBaseName && formWithoutBaseName !== cleanedFormName) {
      aliases.add(formWithoutBaseName);
      aliases.add(`${baseName} ${formWithoutBaseName}`);
      aliases.add(`${formWithoutBaseName} ${baseName}`);
    }

    if (defaultFormNames.has(cleanedFormName) || defaultFormNames.has(formWithoutBaseName)) {
      aliases.add(baseName);
    }
  }

  aliases.add(normalizedName.replace(/[♀♂]/g, ''));

  return aliases;
}

function findLegalPokemon(rawPokemon, legalPokemonLookup) {
  for (const alias of incomingPokemonAliases(rawPokemon.name ?? rawPokemon.id)) {
    const key = toAliasKey(alias);
    const pokemon = legalPokemonLookup.get(key);

    if (pokemon) {
      return pokemon;
    }
  }

  return null;
}

function rawDecklist(standing) {
  return standing.decklist ?? standing.Decklist ?? [];
}

function normalizeTeam(rawTeam, legalPokemonLookup) {
  const team = [];
  const illegalPokemon = [];

  for (const rawPokemon of rawTeam) {
    const legalPokemon = findLegalPokemon(rawPokemon, legalPokemonLookup);

    if (!legalPokemon) {
      illegalPokemon.push(rawPokemon.name ?? rawPokemon.id ?? 'unknown pokemon');
      continue;
    }

    team.push(normalizePokemon({
      id: legalPokemon.id,
      name: legalPokemon.name,
      ability: rawPokemon.ability,
      item: rawPokemon.item,
      attacks: Array.isArray(rawPokemon.badges) ? rawPokemon.badges : rawPokemon.attacks ?? [],
    }));
  }

  return { team, illegalPokemon };
}

function normalizeStanding(standing, legalPokemonLookup) {
  const { decklist, Decklist, ...rest } = standing;
  const { team, illegalPokemon } = normalizeTeam(decklist ?? Decklist ?? [], legalPokemonLookup);

  if (illegalPokemon.length > 0) {
    return { standing: null, illegalPokemon };
  }

  return {
    standing: {
      ...rest,
      team,
    },
    illegalPokemon,
  };
}

function sortedStandings(standings) {
  return [...standings].sort((a, b) => {
    const placingA = Number(a.placing);
    const placingB = Number(b.placing);

    if (Number.isFinite(placingA) && Number.isFinite(placingB)) {
      return placingA - placingB;
    }

    return 0;
  });
}

function validateTopFour(standings, legalPokemonLookup) {
  const topFour = sortedStandings(standings).slice(0, 4);

  if (topFour.length === 0) {
    return { valid: false, reason: 'no standings found' };
  }

  for (const standing of topFour) {
    const team = rawDecklist(standing);

    if (!Array.isArray(team) || team.length === 0) {
      return { valid: false, reason: `top ${standing.placing ?? '?'} has no pokemon` };
    }

    const { illegalPokemon } = normalizeTeam(team, legalPokemonLookup);

    if (illegalPokemon.length > 0) {
      return {
        valid: false,
        reason: `top ${standing.placing ?? '?'} has non-Champions pokemon: ${illegalPokemon.join(', ')}`,
      };
    }
  }

  return { valid: true, reason: null };
}

function summarizeTournament(tournament) {
  return {
    id: tournament.id,
    name: tournament.name,
    date: tournament.date,
    game: tournament.game,
    format: tournament.format,
    players: tournament.players,
    organizerId: tournament.organizerId,
  };
}

function standingsFilePath(tournamentId) {
  return path.join(standingsDir, `${tournamentId}.json`);
}

async function fetchText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`PokeData returned ${response.status} ${response.statusText} for ${url}`);
  }

  return response.text();
}

async function fetchStandings(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`PokeData returned ${response.status} ${response.statusText} for ${url}`);
  }

  const standings = await response.json();

  if (!Array.isArray(standings)) {
    throw new Error(`Expected PokeData standings to be an array for ${url}`);
  }

  return standings;
}

function buildTournamentRecord(candidate, standingsCount) {
  return {
    game,
    name: candidate.name,
    date: candidate.date,
    format,
    id: candidate.id,
    players: standingsCount,
    organizerId: null,
    source: candidate.link,
  };
}

function buildStandingsPayload({ tournament, candidate, standings, legalPokemonLookup }) {
  const normalizedStandings = [];
  const skippedStandings = [];

  for (const standing of standings) {
    const result = normalizeStanding(standing, legalPokemonLookup);

    if (result.standing) {
      normalizedStandings.push(result.standing);
    } else {
      skippedStandings.push({
        placing: standing.placing,
        reason: `non-Champions pokemon: ${result.illegalPokemon.join(', ')}`,
      });
    }
  }

  return {
    payload: {
      schemaVersion: 2,
      source: candidate.source,
      tournament: summarizeTournament(tournament),
      fetchedAt: new Date().toISOString(),
      standingsCount: normalizedStandings.length,
      standings: normalizedStandings,
    },
    skippedStandings,
  };
}

function selectCandidates({ buttons, tournamentFile }) {
  const today = localDateOnly();
  const existingNames = new Set((tournamentFile.tournaments ?? []).map((tournament) => normalizeTournamentName(tournament.name)));
  const existingIds = new Set((tournamentFile.tournaments ?? []).map((tournament) => tournament.id));

  return buttons.filter((button) => (
    dateSortValue(button.date) < dateSortValue(today)
    && dateSortValue(button.date) > dateSortValue(earliestDate)
    && !existingNames.has(normalizeTournamentName(button.name))
    && !existingIds.has(button.id)
  ));
}

async function main() {
  const [tournamentFile, legalPokemonLookup, html] = await Promise.all([
    readJson(tournamentsPath),
    buildLegalPokemonLookup(),
    fetchText(sourcePageUrl),
  ]);
  const buttons = parseTournamentButtons(html);
  const candidates = selectCandidates({ buttons, tournamentFile });
  const importedTournaments = [];
  const skippedTournaments = [];

  console.log(`Found ${buttons.length} PokeData tournament button${buttons.length === 1 ? '' : 's'}.`);
  console.log(`Found ${candidates.length} new PokeData candidate${candidates.length === 1 ? '' : 's'} after date and duplicate filters.`);

  for (const candidate of candidates) {
    await sleep(requestDelayMs);

    try {
      const standings = await fetchStandings(candidate.source);
      const topFourValidation = validateTopFour(standings, legalPokemonLookup);

      if (!topFourValidation.valid) {
        skippedTournaments.push({ name: candidate.name, reason: topFourValidation.reason });

        if (verbose) {
          console.log(`Skipped ${candidate.name}: ${topFourValidation.reason}`);
        }

        continue;
      }

      const tournament = buildTournamentRecord(candidate, standings.length);
      const { payload, skippedStandings } = buildStandingsPayload({ tournament, candidate, standings, legalPokemonLookup });

      if (!dryRun) {
        await mkdir(standingsDir, { recursive: true });
        await writeFile(standingsFilePath(tournament.id), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      }

      importedTournaments.push({ tournament, skippedStandings });
      console.log(`${dryRun ? 'Would import' : 'Imported'} ${candidate.name} (${payload.standingsCount}/${standings.length} standings).`);

      if (verbose && skippedStandings.length > 0) {
        console.log(`  Skipped ${skippedStandings.length} standing${skippedStandings.length === 1 ? '' : 's'} with non-Champions pokemon.`);
      }
    } catch (error) {
      skippedTournaments.push({ name: candidate.name, reason: error.message });
      console.warn(`Skipped ${candidate.name}: ${error.message}`);
    }
  }

  if (!dryRun && importedTournaments.length > 0) {
    const tournaments = sortNewestFirst([
      ...importedTournaments.map(({ tournament }) => tournament),
      ...(tournamentFile.tournaments ?? []),
    ]);
    const updatedTournamentFile = {
      ...tournamentFile,
      fetchedAt: new Date().toISOString(),
      count: tournaments.length,
      tournaments,
      pokedata: {
        source: sourcePageUrl,
        fetchedAt: new Date().toISOString(),
        importedCount: importedTournaments.length,
        skippedCount: skippedTournaments.length,
      },
    };

    await writeFile(tournamentsPath, `${JSON.stringify(updatedTournamentFile, null, 2)}\n`, 'utf8');
  }

  if (dryRun) {
    console.log('Dry run complete. No files were written.');
  }

  console.log(`${dryRun ? 'Would import' : 'Imported'} ${importedTournaments.length} PokeData tournament${importedTournaments.length === 1 ? '' : 's'}.`);
  console.log(`Skipped ${skippedTournaments.length} PokeData tournament${skippedTournaments.length === 1 ? '' : 's'}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
