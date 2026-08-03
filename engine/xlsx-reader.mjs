import zlib from 'node:zlib';

const ZIP_EOCD = 0x06054b50;
const ZIP_CENTRAL_ENTRY = 0x02014b50;
const ZIP_LOCAL_ENTRY = 0x04034b50;

function decodeXml(value) {
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, token) => {
    if (token === 'amp') return '&';
    if (token === 'lt') return '<';
    if (token === 'gt') return '>';
    if (token === 'quot') return '"';
    if (token === 'apos') return "'";
    return String.fromCodePoint(token[1]?.toLowerCase() === 'x'
      ? Number.parseInt(token.slice(2), 16)
      : Number.parseInt(token.slice(1), 10));
  });
}

function attributes(source) {
  const result = {};
  for (const match of source.matchAll(/([\w:.-]+)="([^"]*)"/g)) result[match[1]] = decodeXml(match[2]);
  return result;
}

function normalizeZipPath(value) {
  const parts = [];
  for (const part of value.replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

export class XlsxArchive {
  constructor(buffer) {
    this.buffer = Buffer.from(buffer);
    this.entries = new Map();
    const minimum = Math.max(0, this.buffer.length - 65_557);
    let eocd = -1;
    for (let offset = this.buffer.length - 22; offset >= minimum; offset -= 1) {
      if (this.buffer.readUInt32LE(offset) === ZIP_EOCD) { eocd = offset; break; }
    }
    if (eocd < 0) throw new Error('Workbook ZIP directory was not found.');
    const entryCount = this.buffer.readUInt16LE(eocd + 10);
    let offset = this.buffer.readUInt32LE(eocd + 16);
    for (let index = 0; index < entryCount; index += 1) {
      if (this.buffer.readUInt32LE(offset) !== ZIP_CENTRAL_ENTRY) throw new Error('Workbook ZIP directory is malformed.');
      const compression = this.buffer.readUInt16LE(offset + 10);
      const compressedSize = this.buffer.readUInt32LE(offset + 20);
      const uncompressedSize = this.buffer.readUInt32LE(offset + 24);
      const nameLength = this.buffer.readUInt16LE(offset + 28);
      const extraLength = this.buffer.readUInt16LE(offset + 30);
      const commentLength = this.buffer.readUInt16LE(offset + 32);
      const localOffset = this.buffer.readUInt32LE(offset + 42);
      const name = normalizeZipPath(this.buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'));
      this.entries.set(name, { compression, compressedSize, uncompressedSize, localOffset });
      offset += 46 + nameLength + extraLength + commentLength;
    }
  }

  read(name) {
    const entry = this.entries.get(normalizeZipPath(name));
    if (!entry) return null;
    const offset = entry.localOffset;
    if (this.buffer.readUInt32LE(offset) !== ZIP_LOCAL_ENTRY) throw new Error(`Workbook ZIP entry ${name} is malformed.`);
    const nameLength = this.buffer.readUInt16LE(offset + 26);
    const extraLength = this.buffer.readUInt16LE(offset + 28);
    const start = offset + 30 + nameLength + extraLength;
    const compressed = this.buffer.subarray(start, start + entry.compressedSize);
    if (entry.compression === 0) return Buffer.from(compressed);
    if (entry.compression === 8) return zlib.inflateRawSync(compressed, { maxOutputLength: entry.uncompressedSize });
    throw new Error(`Workbook ZIP compression method ${entry.compression} is unsupported.`);
  }

  text(name) {
    const value = this.read(name);
    return value ? value.toString('utf8') : null;
  }
}

function columnIndex(reference) {
  const letters = String(reference).match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? '';
  let result = 0;
  for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
  return result - 1;
}

function richText(source) {
  return [...source.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1])).join('');
}

export function parseWorksheetXml(xml, sharedStrings = [], { maxRows = Infinity } = {}) {
  const rows = [];
  for (const match of xml.matchAll(/<c\b(?![^>]*\/>)([^>]*)>([\s\S]*?)<\/c>/g)) {
    const attrs = attributes(match[1]);
    const reference = attrs.r;
    if (!reference) continue;
    const rowIndex = Number(reference.match(/\d+$/)?.[0] ?? 0) - 1;
    const colIndex = columnIndex(reference);
    if (rowIndex < 0 || colIndex < 0) continue;
    if (rowIndex >= maxRows) break;
    const body = match[2];
    const raw = body.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1];
    const inline = body.match(/<is(?:\s[^>]*)?>([\s\S]*?)<\/is>/)?.[1];
    let value = null;
    if (attrs.t === 'inlineStr') value = richText(inline ?? '');
    else if (attrs.t === 's') value = sharedStrings[Number(raw)] ?? '';
    else if (attrs.t === 'str') value = decodeXml(raw ?? '');
    else if (attrs.t === 'b') value = raw === '1';
    else if (attrs.t === 'e') value = decodeXml(raw ?? '');
    else if (raw != null && raw !== '') {
      const numeric = Number(raw);
      value = Number.isFinite(numeric) ? numeric : decodeXml(raw);
    }
    if (value == null || value === '') continue;
    rows[rowIndex] ??= [];
    rows[rowIndex][colIndex] = value;
  }
  return Array.from({ length: rows.length }, (_, index) => rows[index] ?? []);
}

function workbookSheetMap(archive) {
  const workbookXml = archive.text('xl/workbook.xml');
  const relationshipsXml = archive.text('xl/_rels/workbook.xml.rels');
  if (!workbookXml || !relationshipsXml) throw new Error('Workbook metadata is missing.');
  const relationships = new Map();
  for (const match of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
    const attrs = attributes(match[1]);
    if (attrs.Id && attrs.Target) relationships.set(attrs.Id, normalizeZipPath(`xl/${attrs.Target}`));
  }
  const sheets = new Map();
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/g)) {
    const attrs = attributes(match[1]);
    const target = relationships.get(attrs['r:id']);
    if (attrs.name && target) sheets.set(attrs.name, target);
  }
  return sheets;
}

function sharedStrings(archive) {
  const xml = archive.text('xl/sharedStrings.xml');
  if (!xml) return [];
  return [...xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((match) => richText(match[1]));
}

export function openXlsx(buffer) {
  const archive = new XlsxArchive(buffer);
  const sheets = workbookSheetMap(archive);
  const strings = sharedStrings(archive);
  return {
    sheetNames: [...sheets.keys()],
    readSheet(name, options = {}) {
      const target = sheets.get(name);
      if (!target) throw new Error(`Workbook sheet ${name} was not found.`);
      return parseWorksheetXml(archive.text(target), strings, options);
    },
  };
}
