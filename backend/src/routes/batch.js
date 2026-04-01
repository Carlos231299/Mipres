import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import * as MipresApi from '../services/mipresApi.js';
import * as Proceso from '../models/procesoModel.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper: extraer digitos puros para VR TOTAL (elimina espacios, puntos, comas, letras)
const parseCurrency = (val) => {
  if (!val) return '0';
  return String(val).replace(/\D/g, '') || '0';
};

// Helper: Búsqueda insensible de llaves en objetos JSON
const findInObj = (obj, search) => {
  if (!obj) return null;
  const key = Object.keys(obj).find(k => k.toUpperCase() === search.toUpperCase());
  return key ? obj[key] : null;
};

// Helper: Delay para no saturar la API
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: convertir fecha Excel Nativa o String "DD/MM/YYYY" a "YYYY-MM-DD"
const parseDate = (val) => {
  if (!val) return '';
  // Si ya es un objeto Date de JS (sucede con cellDates: true)
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  // Si es número (formato fecha de excel nativo serial)
  if (typeof val === 'number') {
    // excel epoch starts at 1/1/1900
    const date = new Date((val - (25567 + 2)) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  // Si es string "DD/MM/YYYY"
  const str = String(val).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    // partes: [DD, MM, YYYY] -> "YYYY-MM-DD"
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return str; // Fallback
};

// ============================================================
// CARGA MASIVA - EXCEL
// ============================================================
router.post('/excel', upload.single('archivo'), async (req, res) => {
  try {
    const { nit, tokenBase } = req.body;

    if (!req.file) return res.status(400).json({ ok: false, error: 'No se envió ningún archivo Excel.' });
    if (!nit || !tokenBase) return res.status(400).json({ ok: false, error: 'NIT y Token Base son requeridos para la carga masiva.' });

    // 1. Generar nuevo token en base al NIT y Token Base para toda la sesión batch
    const tokenData = await MipresApi.generarToken(nit, tokenBase);
    const token = typeof tokenData === 'string' ? tokenData : JSON.stringify(tokenData);

    // 2. Leer Excel desde la memoria (buffer)
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Convertir la hoja a JSON
    let rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'El archivo Excel está vacío.' });
    }

    // Identificar de forma flexible o estricta el nombre de las columnas originales para devolverlas exactas
    // Convertimos temporalmente todas las llaves a minúsculas y eliminamos espacios por completo
    const sanitizeKey = (k) => String(k).trim().toUpperCase().replace(/\s+/g, '');

    // 3. Procesamiento en Lote
    for (const [index, row] of rows.entries()) {
      try {
        // Encontrar llaves exactas sin importar espacios al final usando map temporal
        const rowKeys = Object.keys(row);
        const findKey = (search) => rowKeys.find(k => sanitizeKey(k).includes(sanitizeKey(search)));

        const keyNoMipres = findKey('N°MIPRES') || findKey('PRESCRIPCION');
        const keyCodTec = findKey('CODIGOTEC') || findKey('CODTEC');
        const keyCant = findKey('CANT');
        const keyNoEntrega = findKey('NOENTREGA') || findKey('ENTREGA');
        const keyFecEntrega = findKey('FECHADEENTREGA') || findKey('FECHA');
        const keyCcRecibe = findKey('CCQUERECIBE') || findKey('CCRECIBE');
        const keyVrTotal = findKey('VRTOTAL') || findKey('VALORTOTAL');

        // Extraer valores crudos
        const noPrescripcion = String(row[keyNoMipres] || '').trim();
        const codSerTec = String(row[keyCodTec] || '').trim();
        const cantidad = String(row[keyCant] || '').trim();
        const numEntrega = Number(row[keyNoEntrega]) || 1; // Fallback a 1 si el excel lo omite
        const fechaEntrega = parseDate(row[keyFecEntrega]);
        const ccRecibe = String(row[keyCcRecibe] || '').trim();
        const vrTotal = parseCurrency(row[keyVrTotal]);

        if (!noPrescripcion) {
          row['Log_Sistema'] = 'Omitido: N° MIPRES vacío';
          continue;
        }

        // --- PASO 2: Verificar CÓDIGO TEC dentro de prescripción ---
        let dirSelect = null;
        let reportesPrevios = [];
        try {
          const reporte = await MipresApi.getReporteEntregaXPrescripcion(nit, token, noPrescripcion);
          if (Array.isArray(reporte)) reportesPrevios = reporte;
        } catch (e) { /* vacio o sin reporte previo */ }

        const allDirs = await MipresApi.getDireccionamientoXPrescripcion(nit, token, noPrescripcion);
        if (!allDirs || !Array.isArray(allDirs) || allDirs.length === 0) {
          const apiMsg = (typeof allDirs === 'string') ? `: ${allDirs}` : '';
          row['Log_Sistema'] = `Error Paso 2: Prescripción sin direccionamientos${apiMsg}.`;
          continue;
        }

        // Buscar en los direccionamientos
        const exactDirs = allDirs.filter(d =>
          String(d.CodSerTecAEntregar).trim() === codSerTec &&
          Number(d.NoEntrega) === numEntrega
        );

        if (exactDirs.length === 0) {
          row['Log_Sistema'] = `Error Paso 2: La entrega #${numEntrega} de la tecnología ${codSerTec} no existe en Mipres.`;
          continue;
        }

        dirSelect = exactDirs[0];
        const idDireccionamiento = dirSelect.ID || dirSelect.IdDireccionamiento;

        // Comprobar si ESE direccionamiento exacto ya fue entregado y reportado por nosotros en la nube
        const reporteExistente = reportesPrevios.find(r => (r.ID || r.IdEntrega || r.Id) === idDireccionamiento);
        if (reporteExistente) {
          const idRepFinal = String(reporteExistente.IDReporteEntrega || reporteExistente.IdReporteEntrega || reporteExistente.IdReporte || reporteExistente.Id || '');
          row['Log_Sistema'] = `Omitido: La Entrega #${numEntrega} ya se encontraba completada y reportada en SISPRO.`;

          // Rellenar IDs históricos para trazabilidad
          row['ID_Direccionamiento'] = idDireccionamiento;

          // --- BÚSQUEDA PROFUNDA DE IDS HISTÓRICOS ---
          // Buscamos específicamente en los servicios de historial por prescripción
          try {
            const historyProgs = await MipresApi.getProgramacionXPrescripcion(nit, token, noPrescripcion);
            if (Array.isArray(historyProgs)) {
              // Filtrar por el ID de direccionamiento específico
              const exactProg = historyProgs.find(p => (p.ID || p.IdDireccionamiento) === idDireccionamiento);
              if (exactProg) {
                row['ID_Programacion'] = String(findInObj(exactProg, 'IDProgramacion') || '');
              }
            }
          } catch (e) { /* Error silencioso en historial */ }

          try {
            const historyEnts = await MipresApi.getEntregaXPrescripcion(nit, token, noPrescripcion);
            if (Array.isArray(historyEnts)) {
              // Filtrar por el ID de direccionamiento específico
              const exactEnt = historyEnts.find(e => (e.ID || e.IdDireccionamiento) === idDireccionamiento);
              if (exactEnt) {
                row['ID_Entrega'] = String(findInObj(exactEnt, 'IDEntrega') || '');
              }
            }
          } catch (e) { /* Error silencioso en historial */ }

          // Fallback final: si aún está vacío, intentar el mapeo básico anterior
          if (!row['ID_Programacion']) {
            row['ID_Programacion'] = String(findInObj(dirSelect, 'IDProgramacion') || findInObj(reporteExistente, 'IdProgramacion') || '');
          }
          if (!row['ID_Entrega']) {
            row['ID_Entrega'] = String(findInObj(reporteExistente, 'IdEntrega') || '');
          }

          // Limpiar debugs ya que no hubo error al omitir
          row['Problemas_encontrados_Programacion'] = '';
          row['Problemas_encontrados_Entrega'] = '';

          // Si el Excel traía una columna llamada IDReporteEntrega, la llenamos también
          const keyColIdRep = findKey('IDREPORTEENTREGA');
          if (keyColIdRep) row[keyColIdRep] = idRepFinal;

          continue;
        }

        row['ID_Direccionamiento'] = idDireccionamiento;

        // Crear registro local en base de datos para historial (opcional pero ayuda a tracking)
        const localId = await Proceso.create({ nit, token });
        await Proceso.update(localId, {
          id_mipres: String(idDireccionamiento),
          no_prescripcion: noPrescripcion,
          cod_ser_tec_a_entregar: codSerTec,
          cant_tot_a_entregar: Number(cantidad || dirSelect.CantTotAEntregar),
          fec_max_ent: String(dirSelect.FecMaxEnt || ''),
          estado: 'VERIFICADO',
        });

        // --- PASO 3: Programación (Intentamos programar. Si 422, asumimos éxito previo) ---
        let idProgramacion = '';
        try {
          const payloadProg = {
            ID: Number(idDireccionamiento),
            FecMaxEnt: String(dirSelect.FecMaxEnt || ''),
            TipoIDSedeProv: 'NI',
            NoIDSedeProv: nit,
            CodSedeProv: 'PROV008934',
            CodSerTecAEntregar: codSerTec,
            CantTotAEntregar: String(cantidad || dirSelect.CantTotAEntregar || '0')
          };
          const resProg = await MipresApi.programacion(nit, token, payloadProg);
          const progData = Array.isArray(resProg) ? resProg[0] : resProg || {};
          idProgramacion = String(progData.IdProgramacion || progData.Id || '');
        } catch (errProg) {
          const status = errProg.response?.status;
          if (status === 422 || status === 400) {
            row['Problemas_encontrados_Programacion'] = 'Ignorado: ' + (errProg.response?.data?.Message || 'Ya programado o error config.');
          } else {
            row['Log_Sistema'] = 'Error Paso 3 Programación: ' + errProg.message;
            continue; // Abortamos para este registro
          }
        }
        if (idProgramacion) row['ID_Programacion'] = idProgramacion;
        await Proceso.update(localId, { id_programacion: idProgramacion, estado: 'PROGRAMADO' });

        // --- PASO 4: Entrega ---
        let idEntrega = '';
        let entregaOk = false;
        try {
          const payloadEntr = {
            ID: Number(idDireccionamiento),
            CodSerTecEntregado: codSerTec,
            CantTotEntregada: Number(cantidad || dirSelect.CantTotAEntregar || '0'),
            EntTotal: 1, // Se solicita asertividad exitosa masiva
            CausaNoEntrega: 0,
            FecEntrega: fechaEntrega, // Desde Excel parseado
            NoLote: '',
            TipoIDRecibe: 'CC', // O fijo provisto por el cliente
            NoIDRecibe: ccRecibe
          };
          const resEntr = await MipresApi.entrega(nit, token, payloadEntr);
          const entrData = Array.isArray(resEntr) ? resEntr[0] : resEntr || {};
          idEntrega = String(entrData.IdEntrega || entrData.Id || '');
          entregaOk = true;
        } catch (errEntr) {
          const status = errEntr.response?.status;
          if (status === 422 || status === 400) {
            const msg = errEntr.response?.data?.Message || '';
            row['Problemas_encontrados_Entrega'] = 'Ignorado: ' + (msg || 'Error validación');
            // Si el error dice que "ya existe", podríamos considerarlo OK para pasar al reporte
            if (msg.includes('ya existe') || msg.includes('ya fue')) {
              entregaOk = true;
            }
          } else {
            row['Log_Sistema'] = 'Error Paso 4 Entrega: ' + errEntr.message;
            continue;
          }
        }
        if (idEntrega) row['ID_Entrega'] = idEntrega;
        await Proceso.update(localId, { id_entrega: idEntrega, estado: 'ENTREGADO' });

        // --- PASO 5: Reporte Final ---
        if (!entregaOk) {
          row['Log_Sistema'] = 'Omitido Paso 5: La entrega falló o no pudo ser verificada.';
          continue;
        }

        let idReporte = '';
        try {
          const payloadRep = {
            ID: Number(idDireccionamiento),
            EstadoEntrega: 1, // Exitosa
            CausaNoEntrega: 0,
            ValorEntregado: Number(vrTotal) // Forzamos a Number para evitar Error 400
          };
          const resRep = await MipresApi.reporteEntrega(nit, token, payloadRep);
          const repData = Array.isArray(resRep) ? resRep[0] : resRep || {};
          idReporte = String(repData.IDReporteEntrega || repData.IdReporteEntrega || repData.IdReporte || repData.Id || '');
          row['Log_Sistema'] = '✅ MIPRES FULL EXITOSO';
        } catch (errRep) {
          row['Log_Sistema'] = 'Error Paso 5 Reporte: ' + (errRep.response?.data?.Message || errRep.message);
        }
        if (idReporte) {
          // Si el Excel traía una columna llamada IDReporteEntrega, la llenamos también
          const keyColIdRep = findKey('IDREPORTEENTREGA');
          if (keyColIdRep) row[keyColIdRep] = idReporte;
        }
        await Proceso.update(localId, { id_reporte: idReporte, estado: 'REPORTADO' });

      } catch (errReg) {
        row['Log_Sistema'] = `Error Crítico Fila ${index + 1}: ` + errReg.message;
      }
    }

    // 4. Volver a empaquetar en un libro de Excel binario
    // Antes de exportar, recorremos todas las columnas de cada fila.
    // Si la columna se llama algo relacionado con "FECHA" o "FEC",
    // intentamos convertir su valor a un objeto Date real para que Excel lo reconozca.
    const processedRows = rows.map(r => {
      const newRow = { ...r };

      // 1. Extraer llaves de interés para reordenar al final
      const keyColIdRep = Object.keys(newRow).find(k => sanitizeKey(k) === 'IDREPORTEENTREGA');

      const vLog = newRow['Log_Sistema'] || '';
      const vDir = newRow['ID_Direccionamiento'] || '';
      const vProg = newRow['ID_Programacion'] || '';
      const vEnt = newRow['ID_Entrega'] || '';
      const vDbgProg = newRow['Problemas_encontrados_Programacion'] || '';
      const vDbgEnt = newRow['Problemas_encontrados_Entrega'] || '';
      const vIdRep = keyColIdRep ? newRow[keyColIdRep] : '';

      // 2. Borrar para reinsertar ordenadamente al final
      delete newRow['Log_Sistema'];
      delete newRow['ID_Direccionamiento'];
      delete newRow['ID_Programacion'];
      delete newRow['ID_Entrega'];
      delete newRow['Problemas_encontrados_Programacion'];
      delete newRow['Problemas_encontrados_Entrega'];
      if (keyColIdRep) delete newRow[keyColIdRep];

      // 3. Procesar Fechas en el resto de columnas originales
      Object.keys(newRow).forEach(key => {
        const sKey = sanitizeKey(key);
        if (sKey.includes('FECHA') || sKey.includes('FEC')) {
          const val = newRow[key];
          if (val) {
            const dateStr = parseDate(val);
            if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              newRow[key] = new Date(dateStr + 'T12:00:00');
            }
          }
        }
      });

      // 4. Insertar columnas de resultado en el orden solicitado
      newRow['Log_Sistema'] = vLog;
      newRow['ID_Direccionamiento'] = vDir;
      newRow['ID_Programacion'] = vProg;
      newRow['ID_Entrega'] = vEnt;
      newRow['Problemas_encontrados_Programacion'] = vDbgProg;
      newRow['Problemas_encontrados_Entrega'] = vDbgEnt;

      // El ID de reporte va de último
      if (keyColIdRep) {
        newRow[keyColIdRep] = vIdRep;
      }

      return newRow;
    });

    const newWorksheet = xlsx.utils.json_to_sheet(processedRows, { cellDates: true });

    // Aplicar formato visual de fecha a todas las celdas que tengan fecha
    const range = xlsx.utils.decode_range(newWorksheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = { c: C, r: R };
        const cell_ref = xlsx.utils.encode_cell(cell_address);
        if (newWorksheet[cell_ref] && newWorksheet[cell_ref].t === 'd') {
          newWorksheet[cell_ref].z = 'yyyy-mm-dd';
        }
      }
    }

    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Reporte Resultados MIPRES');

    const excelBuffer = xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });

    // 5. Configurar Headers HTTP para forzar descarga
    res.setHeader('Content-Disposition', 'attachment; filename="Resumen_Masivo_MIPRES.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);

  } catch (err) {
    console.error('[Error Lote Excel]', err);
    res.status(500).json({ ok: false, error: 'Hubo un error del servidor al procesar el archivo Excel.' });
  }
});

export default router;
