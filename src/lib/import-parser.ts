import * as XLSX from 'xlsx';

const VALID_EDGE_TYPES = [
  'CONTACT', 'TRANSACTION', 'KINSHIP', 'ASSOCIATE', 'OWNERSHIP',
  'LOCATION', 'EMPLOYMENT', 'COMMUNICATION', 'TEMPORAL', 'CUSTOM',
];

export interface ParsedNode {
  tempId: string;
  type: string;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface ParsedEdge {
  sourceTemp: string;
  targetTemp: string;
  type: string;
  label?: string;
}

export interface ParseResult {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  errors: string[];
}

export async function parseImportFile(file: File, validNodeTypes: string[]): Promise<ParseResult> {
  const errors: string[] = [];
  const nodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];

  const data = await file.arrayBuffer();
  const wb = XLSX.read(data);

  // Find sheets (case-insensitive)
  const sheetNames = wb.SheetNames;
  const nodosSheet = sheetNames.find((s) => s.toLowerCase() === 'nodos');
  const conexionesSheet = sheetNames.find((s) => s.toLowerCase() === 'conexiones');

  if (!nodosSheet) {
    // If only one sheet, treat it as nodes-only (CSV case)
    if (sheetNames.length === 1) {
      parseNodesSheet(wb.Sheets[sheetNames[0]], nodes, errors, validNodeTypes);
    } else {
      errors.push('No se encontró la hoja "Nodos"');
    }
  } else {
    parseNodesSheet(wb.Sheets[nodosSheet], nodes, errors, validNodeTypes);
  }

  if (conexionesSheet) {
    const tempIds = new Set(nodes.map((n) => n.tempId));
    parseEdgesSheet(wb.Sheets[conexionesSheet], edges, errors, tempIds);
  }

  return { nodes, edges, errors };
}

function parseNodesSheet(
  ws: XLSX.WorkSheet,
  nodes: ParsedNode[],
  errors: string[],
  validNodeTypes: string[],
) {
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });

  if (rows.length === 0) {
    errors.push('La hoja de nodos está vacía');
    return;
  }

  // Detect column names (case-insensitive, support aliases)
  const firstRow = rows[0];
  const keys = Object.keys(firstRow);
  const colMap = detectNodeColumns(keys);

  if (!colMap.tempId) errors.push('Columna "id_temp" no encontrada en hoja de nodos');
  if (!colMap.type) errors.push('Columna "tipo" no encontrada en hoja de nodos');
  if (!colMap.label) errors.push('Columna "etiqueta" no encontrada en hoja de nodos');

  if (!colMap.tempId || !colMap.type || !colMap.label) return;

  const validNodeTypeSet = new Set(validNodeTypes);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for 1-indexed + header
    const tempId = String(row[colMap.tempId] ?? '').trim();
    const type = String(row[colMap.type] ?? '').trim().toUpperCase();
    const label = String(row[colMap.label] ?? '').trim();
    const metadataStr = colMap.metadata ? String(row[colMap.metadata] ?? '').trim() : '';

    if (!tempId && !type && !label) continue; // skip empty rows

    if (!tempId) { errors.push(`Fila ${rowNum}: falta id_temp`); continue; }
    if (!type) { errors.push(`Fila ${rowNum}: falta tipo`); continue; }
    if (!label) { errors.push(`Fila ${rowNum}: falta etiqueta`); continue; }

    if (!validNodeTypeSet.has(type)) {
      errors.push(`Fila ${rowNum}: tipo "${type}" no existe en la configuración`);
      continue;
    }

    let metadata: Record<string, unknown> | undefined;
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        errors.push(`Fila ${rowNum}: metadata no es JSON válido`);
        continue;
      }
    }

    nodes.push({ tempId, type, label, metadata });
  }
}

function parseEdgesSheet(
  ws: XLSX.WorkSheet,
  edges: ParsedEdge[],
  errors: string[],
  validTempIds: Set<string>,
) {
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });

  if (rows.length === 0) return;

  const keys = Object.keys(rows[0]);
  const colMap = detectEdgeColumns(keys);

  if (!colMap.source) errors.push('Columna "origen" no encontrada en hoja de conexiones');
  if (!colMap.target) errors.push('Columna "destino" no encontrada en hoja de conexiones');
  if (!colMap.type) errors.push('Columna "tipo" no encontrada en hoja de conexiones');

  if (!colMap.source || !colMap.target || !colMap.type) return;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const source = String(row[colMap.source] ?? '').trim();
    const target = String(row[colMap.target] ?? '').trim();
    const type = String(row[colMap.type] ?? '').trim().toUpperCase();
    const label = colMap.label ? String(row[colMap.label] ?? '').trim() : '';

    if (!source && !target && !type) continue; // skip empty rows

    if (!source) { errors.push(`Conexión fila ${rowNum}: falta origen`); continue; }
    if (!target) { errors.push(`Conexión fila ${rowNum}: falta destino`); continue; }
    if (!type) { errors.push(`Conexión fila ${rowNum}: falta tipo`); continue; }

    if (!validTempIds.has(source)) {
      errors.push(`Conexión fila ${rowNum}: origen "${source}" no existe en nodos`);
      continue;
    }
    if (!validTempIds.has(target)) {
      errors.push(`Conexión fila ${rowNum}: destino "${target}" no existe en nodos`);
      continue;
    }
    if (!VALID_EDGE_TYPES.includes(type)) {
      errors.push(`Conexión fila ${rowNum}: tipo "${type}" no válido`);
      continue;
    }

    edges.push({ sourceTemp: source, targetTemp: target, type, label: label || undefined });
  }
}

function detectNodeColumns(keys: string[]) {
  const lower = keys.map((k) => k.toLowerCase().trim());
  return {
    tempId: keys[lower.findIndex((k) => ['id_temp', 'idtemp', 'id', 'temp_id'].includes(k))] ?? null,
    type: keys[lower.findIndex((k) => ['tipo', 'type'].includes(k))] ?? null,
    label: keys[lower.findIndex((k) => ['etiqueta', 'label', 'nombre'].includes(k))] ?? null,
    metadata: keys[lower.findIndex((k) => ['metadata', 'metadatos', 'datos'].includes(k))] ?? null,
  };
}

function detectEdgeColumns(keys: string[]) {
  const lower = keys.map((k) => k.toLowerCase().trim());
  return {
    source: keys[lower.findIndex((k) => ['origen', 'source', 'desde', 'from'].includes(k))] ?? null,
    target: keys[lower.findIndex((k) => ['destino', 'target', 'hasta', 'to'].includes(k))] ?? null,
    type: keys[lower.findIndex((k) => ['tipo', 'type'].includes(k))] ?? null,
    label: keys[lower.findIndex((k) => ['etiqueta', 'label'].includes(k))] ?? null,
  };
}
