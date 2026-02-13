import * as XLSX from 'xlsx';

export function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet: Nodos
  const nodesData = [
    ['id_temp', 'tipo', 'etiqueta', 'metadata'],
    ['n1', 'PERSON', 'Juan Pérez', '{"rut":"12.345.678-9"}'],
    ['n2', 'ORGANIZATION', 'Empresa X', '{"giro":"Transporte"}'],
    ['n3', 'PHONE', '+56 9 1234 5678', ''],
  ];
  const wsNodos = XLSX.utils.aoa_to_sheet(nodesData);

  // Set column widths
  wsNodos['!cols'] = [
    { wch: 10 }, // id_temp
    { wch: 18 }, // tipo
    { wch: 25 }, // etiqueta
    { wch: 35 }, // metadata
  ];

  // Add comment with valid types
  if (!wsNodos.B1) wsNodos.B1 = { t: 's', v: 'tipo' };
  wsNodos.B1.c = [{
    a: 'LinkCharts',
    t: 'Tipos válidos: Consultar los tipos configurados en Admin > Tipos de Nodo. Ejemplos comunes: PERSON, ORGANIZATION, VEHICLE, PHONE, ADDRESS, BANK_ACCOUNT, SOCIAL_MEDIA, DOCUMENT, EVENT, CUSTOM',
  }];

  XLSX.utils.book_append_sheet(wb, wsNodos, 'Nodos');

  // Sheet: Conexiones
  const edgesData = [
    ['origen', 'destino', 'tipo', 'etiqueta'],
    ['n1', 'n2', 'OWNERSHIP', 'Socio'],
    ['n1', 'n3', 'COMMUNICATION', 'Línea personal'],
  ];
  const wsConexiones = XLSX.utils.aoa_to_sheet(edgesData);

  wsConexiones['!cols'] = [
    { wch: 10 }, // origen
    { wch: 10 }, // destino
    { wch: 18 }, // tipo
    { wch: 25 }, // etiqueta
  ];

  // Add comment with valid edge types
  if (!wsConexiones.C1) wsConexiones.C1 = { t: 's', v: 'tipo' };
  wsConexiones.C1.c = [{
    a: 'LinkCharts',
    t: 'Tipos válidos: CONTACT, TRANSACTION, KINSHIP, ASSOCIATE, OWNERSHIP, LOCATION, EMPLOYMENT, COMMUNICATION, TEMPORAL, CUSTOM',
  }];

  XLSX.utils.book_append_sheet(wb, wsConexiones, 'Conexiones');

  // Download
  XLSX.writeFile(wb, 'plantilla_linkcharts.xlsx');
}
