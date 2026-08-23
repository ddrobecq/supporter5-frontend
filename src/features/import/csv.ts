export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

function detectDelimiter(headerLine: string): string {
  const candidates = [';', ',', '\t', '|'];
  return candidates.reduce((best, candidate) => (
    headerLine.split(candidate).length > headerLine.split(best).length ? candidate : best
  ), ';');
}

/** Decoupe une ligne CSV en gerant les guillemets et les doubles guillemets echappes. */
function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((value) => value.trim());
}

export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((header, index) => header || `Colonne ${index + 1}`);
  const rows = lines.slice(1).map((line) => splitCsvLine(line, delimiter));
  return { headers, rows };
}

/** Normalise une date de fichier (JJ/MM/AAAA, JJ-MM-AAAA, AAAA-MM-JJ, AAAAMMJJ) en AAAA-MM-JJ. */
export function normalizeImportDate(value: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  const fr = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}`;

  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  return '';
}

/** Normalise une heure de fichier (H:mm, HH:mm, HHhmm, HHmm) en HH:mm. */
export function normalizeImportTime(value: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const separated = raw.match(/^(\d{1,2})\s*[:hH]\s*(\d{1,2})/);
  if (separated) return `${separated[1].padStart(2, '0')}:${separated[2].padStart(2, '0')}`;

  const compact = raw.match(/^(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}:${compact[2]}`;

  return '';
}

/** Ne garde que les entiers; toute autre valeur (vide, tiret, texte) devient une chaine vide. */
export function normalizeImportNumber(value: string): string {
  const raw = String(value ?? '').trim();
  if (!/^-?\d+$/.test(raw)) return '';
  return String(Number(raw));
}
