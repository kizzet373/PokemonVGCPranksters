import rawTournamentsData from './regulation-m-a-tournaments.json';
import { normalizeDataValues } from '../utils/dataNormalization';

export const tournamentsData = normalizeDataValues(rawTournamentsData);
