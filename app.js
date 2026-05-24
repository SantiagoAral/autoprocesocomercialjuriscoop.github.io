/* ═══════════════════════════════════════════════════════════════
   JURISCOOP MVP – app.js
   Shared utilities + file-upload page module (index.html)
════════════════════════════════════════════════════════════════ */

'use strict';

// ─────────────────────────────────────────────────────────────
// SHARED UTILITIES  (available to admin.js and asesor.js)
// ─────────────────────────────────────────────────────────────

/** Basic HTML escaping to prevent XSS in dynamic content. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format an ISO date string.
 * @param {string} iso
 * @param {boolean} withTime  Include HH:MM when true (default false)
 */
function fmtDate(iso, withTime = false) {
  if (!iso) return '—';
  if (withTime) {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Render a coloured status badge.
 * Handles all status values used across admin and asesor pages.
 */
function statusBadge(estado) {
  const map = {
    'procesado':             ['procesado',   'Procesado'],
    'pendiente':             ['pendiente',   'Pendiente'],
    'procesando':            ['procesando',  'Procesando'],
    'fallido':               ['fallido',     'Fallido'],
    'procesado_con_errores': ['con-errores', 'Con errores'],
    'en-gestion':            ['en-gestion',  'En gestión'],
    'completado':            ['completado',  'Completado'],
    'no-contesta':           ['no-contesta', 'No contesta'],
  };
  const [cls, label] = map[estado] || ['pendiente', estado];
  return `<span class="status status--${cls}">${escapeHtml(label)}</span>`;
}

// ─────────────────────────────────────────────────────────────
// LOCALSTORAGE HELPERS
// ─────────────────────────────────────────────────────────────

/** Keys used across all pages for shared persistence. */
const LS_KEY           = 'juriscoop_casos';      // case objects (read/write by all pages)
const LS_KEY_GESTIONES = 'juriscoop_gestiones';   // activity log written by asesor
const LS_KEY_CARGAS    = 'juriscoop_cargas';      // upload history written by index

/**
 * Persist data to localStorage. Silently no-ops if storage is unavailable.
 * @param {string} key
 * @param {any}    data  Must be JSON-serialisable.
 */
function saveLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[Juriscoop] localStorage write failed:', e);
  }
}

/**
 * Read data from localStorage.
 * @param {string} key
 * @param {any}    fallback  Returned when the key is absent or JSON is invalid.
 */
function loadLocalStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('[Juriscoop] localStorage read failed:', e);
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────
// GESTIONES HELPERS
// Convenience wrappers for the activity-history log.
// Both asesor.js and admin.js use these instead of calling
// loadLocalStorage / saveLocalStorage directly on LS_KEY_GESTIONES.
// ─────────────────────────────────────────────────────────────

/**
 * Return the full gestiones array (all advisors, all cases).
 * @returns {Object[]}
 */
function getGestiones() {
  return loadLocalStorage(LS_KEY_GESTIONES, []);
}

/**
 * Overwrite the gestiones array.
 * Only used internally — external callers should use appendGestion().
 * @param {Object[]} gestiones
 */
function setGestiones(gestiones) {
  saveLocalStorage(LS_KEY_GESTIONES, gestiones);
}

/**
 * Append one new activity entry and persist.
 * Never overwrites existing history — always appends.
 *
 * @param {Object} entry  Must include at minimum: caso_id, asesor, estado_nuevo, fecha.
 */
function appendGestion(entry) {
  const gestiones = getGestiones();
  gestiones.unshift(entry);          // newest first
  setGestiones(gestiones);
  console.log(
    '[Juriscoop] gestión registrada — caso:', entry.caso_id,
    '| ', entry.estado_anterior, '→', entry.estado_nuevo,
    '| total:', gestiones.length
  );
}

/**
 * Return all gestiones that belong to a specific case.
 * Results are already newest-first because appendGestion unshifts.
 *
 * @param {string} casoId  The business ID (caso.id / caso.asunto).
 * @returns {Object[]}
 */
function getGestionesByCaso(casoId) {
  return getGestiones().filter(g => g.caso_id === casoId);
}

// ─────────────────────────────────────────────────────────────
// EXCEL DATE NORMALISATION
// ─────────────────────────────────────────────────────────────

/**
 * Convert any representation of a date coming from SheetJS into
 * an ISO date string (YYYY-MM-DD), or null if the value is empty
 * or unparseable.
 *
 * SheetJS with cellDates:true returns JS Date objects, but some
 * exports still produce Excel serial numbers or text strings.
 *
 * @param {Date|number|string|null} value
 * @returns {string|null}
 */
function normalizeExcelDate(value) {
  if (value === null || value === undefined || value === '') return null;

  // JS Date (SheetJS cellDates:true path)
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  // Excel serial number (days since 1899-12-30, accounting for Excel's leap-year bug)
  if (typeof value === 'number') {
    const ms   = (value - 25569) * 86400000;
    const date = new Date(ms);
    return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  // String — try dd/mm/yyyy first, then fall back to Date constructor
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const iso = `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2,'0')}-${ddmmyyyy[1].padStart(2,'0')}`;
      const d   = new Date(iso);
      return isNaN(d.getTime()) ? null : iso;
    }

    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// ADVISOR MAPPING
// ─────────────────────────────────────────────────────────────

/**
 * Add entries here when the Excel export uses abbreviations or
 * inconsistent spelling for advisor names.
 * e.g. 'L.Gomez': 'Laura Gómez'
 */
const ADVISOR_MAP = {};

/**
 * Normalise the Propietario field from Excel to a canonical
 * advisor name. Falls back to the raw trimmed value, or
 * 'Sin asignar' if empty.
 * @param {string} propietario
 * @returns {string}
 */
function mapAdvisor(propietario) {
  const raw = String(propietario || '').trim();
  return ADVISOR_MAP[raw] || raw || 'Sin asignar';
}

// ─────────────────────────────────────────────────────────────
// ROW → CASE MAPPING
// ─────────────────────────────────────────────────────────────

/**
 * Convert one clean Excel row into a unified case object.
 * The resulting shape is consumed by both admin.js and asesor.js.
 *
 * @param {Object} row    Plain object keyed by column name.
 * @param {number} index  Row index (0-based) used as fallback ID.
 * @returns {Object}
 */
function mapRowToCaso(row, index) {
  const asunto  = String(row['Asunto'] || '').trim()
                  || `GC-${String(index + 1).padStart(4, '0')}`;
  const cliente = String(row['NombreCliente'] || '').trim();

  return {
    // _uid is the true primary key — unique by position, never collides
    // even when multiple rows share the same Asunto value.
    _uid:              `uid_${index}`,
    // id and asunto mirror the business identifier from the file
    id:                asunto,
    asunto:            asunto,
    // duplicated with different names so both admin and asesor tables work
    nombre_cliente:    cliente,
    cliente:           cliente,
    telefono:          String(row['TelefonoCliente'] || '').trim(),
    producto:          String(row['Producto'] || '').trim(),
    asesor:            mapAdvisor(row['Propietario']),
    estado:            'pendiente',
    vencimiento:       normalizeExcelDate(row['Vencimiento']),
    objetivo:          String(row['Objetivo de la Actividad'] || '').trim(),
    ultimo_comentario: String(row['Descripción'] || '').trim(),
    ultima_actividad:  null,
    creado_en:         new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// INDEX.HTML PAGE MODULE
// Only runs when the file-upload form is present.
// ─────────────────────────────────────────────────────────────
(function initUploadPage() {
  if (!document.getElementById('file-input')) return;

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────

/** Columnas obligatorias que debe tener el archivo fuente. */
const REQUIRED_COLUMNS = [
  'Asunto',
  'NombreCliente',
  'LlamarPersona',
  'LlamarEmpresa',
  'TelefonoCliente',
  'Vencimiento',
  'ReferenteA',
  'Dirección',
  'Objetivo de la Actividad',
  'Descripción',
  'Propietario',
  'Producto',
];

const PREVIEW_ROWS    = 5;    // Filas visibles en la tabla de vista previa
const SIMULATE_DELAY  = 1400; // ms para simular latencia del backend

// ─────────────────────────────────────────────────────────────
// ESTADO GLOBAL DE LA APLICACIÓN
// ─────────────────────────────────────────────────────────────

const state = {
  file:        null,   // File object seleccionado
  rawData:     [],     // Datos crudos parseados del archivo (array de objetos)
  columns:     [],     // Cabeceras detectadas
  cleanData:   [],     // Filas válidas tras limpieza básica
  missingCols: [],     // Columnas requeridas ausentes
  isValid:     false,  // Si el archivo pasó la validación de columnas
};

// ─────────────────────────────────────────────────────────────
// REFERENCIAS AL DOM
// ─────────────────────────────────────────────────────────────

const dom = {
  fileInput:         document.getElementById('file-input'),
  dropzone:          document.getElementById('dropzone'),
  fileInfo:          document.getElementById('file-info'),
  fileName:          document.getElementById('file-name'),
  btnClear:          document.getElementById('btn-clear'),
  btnProcess:        document.getElementById('btn-process'),
  btnNew:            document.getElementById('btn-new'),
  alertFormat:       document.getElementById('alert-format'),
  alertFormatMsg:    document.getElementById('alert-format-msg'),

  sectionValidation: document.getElementById('section-validation'),
  validationResult:  document.getElementById('validation-result'),

  sectionSummary:    document.getElementById('section-summary'),
  summaryGrid:       document.getElementById('summary-grid'),

  sectionPreview:    document.getElementById('section-preview'),
  previewThead:      document.getElementById('preview-thead'),
  previewTbody:      document.getElementById('preview-tbody'),

  sectionResult:     document.getElementById('section-result'),
  resultContent:     document.getElementById('result-content'),
  resultActions:     document.getElementById('result-actions'),
};

// ─────────────────────────────────────────────────────────────
// UTILIDADES DE UI
// ─────────────────────────────────────────────────────────────

function show(el)  { el.classList.remove('hidden'); }
function hide(el)  { el.classList.add('hidden'); }

function scrollTo(el) {
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
}

function resetSections() {
  hide(dom.sectionValidation);
  hide(dom.sectionSummary);
  hide(dom.sectionPreview);
  hide(dom.sectionResult);
  hide(dom.resultActions);
  dom.validationResult.innerHTML = '';
  dom.summaryGrid.innerHTML      = '';
  dom.previewThead.innerHTML     = '';
  dom.previewTbody.innerHTML     = '';
  dom.resultContent.innerHTML    = '';
}

// ─────────────────────────────────────────────────────────────
// VALIDACIÓN DE FORMATO DE ARCHIVO
// ─────────────────────────────────────────────────────────────

function isValidFormat(file) {
  const allowed = ['.xlsx', '.csv'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return allowed.includes(ext);
}

// ─────────────────────────────────────────────────────────────
// PARSEO DEL ARCHIVO (SheetJS)
// ─────────────────────────────────────────────────────────────

/**
 * Lee el archivo con FileReader y lo parsea con SheetJS.
 * Devuelve una Promise con { columns, rows } donde rows es
 * un array de objetos planos usando la primera fila como clave.
 */
function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data     = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // Tomar la primera hoja
        const sheetName = workbook.SheetNames[0];
        const sheet     = workbook.Sheets[sheetName];

        // Convertir a JSON; header:1 devuelve array de arrays
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rawRows.length < 2) {
          return reject(new Error('El archivo no tiene datos suficientes (mínimo 1 fila de encabezado + 1 de datos).'));
        }

        const columns = rawRows[0].map(c => String(c).trim());
        const rows    = rawRows.slice(1).map(row => {
          const obj = {};
          columns.forEach((col, i) => { obj[col] = row[i] ?? ''; });
          return obj;
        });

        resolve({ columns, rows });
      } catch (err) {
        reject(new Error('No se pudo leer el archivo. Verifica que sea un .xlsx o .csv válido.'));
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsArrayBuffer(file);
  });
}

// ─────────────────────────────────────────────────────────────
// VALIDACIÓN DE COLUMNAS
// ─────────────────────────────────────────────────────────────

/**
 * Compara las columnas detectadas contra REQUIRED_COLUMNS.
 * Devuelve el array de columnas faltantes (vacío si todo OK).
 */
function validateColumns(detected) {
  return REQUIRED_COLUMNS.filter(req => !detected.includes(req));
}

// ─────────────────────────────────────────────────────────────
// LIMPIEZA BÁSICA DE DATOS
// ─────────────────────────────────────────────────────────────

/**
 * Limpieza mínima del lado del frontend:
 * - Elimina filas completamente vacías.
 * - Recorta espacios en valores de texto.
 * Devuelve el array limpio.
 */
function cleanRows(rows, columns) {
  return rows.filter(row => {
    // Considera válida la fila si al menos un campo tiene valor
    return columns.some(col => String(row[col] ?? '').trim() !== '');
  }).map(row => {
    const clean = {};
    columns.forEach(col => {
      const val = row[col];
      clean[col] = typeof val === 'string' ? val.trim() : val;
    });
    return clean;
  });
}

// ─────────────────────────────────────────────────────────────
// RENDERIZADO: VALIDACIÓN
// ─────────────────────────────────────────────────────────────

function renderValidation(missing) {
  show(dom.sectionValidation);

  if (missing.length === 0) {
    dom.validationResult.innerHTML = `
      <div class="validation-ok">
        <span>✔</span>
        Todas las columnas requeridas están presentes (${REQUIRED_COLUMNS.length}/${REQUIRED_COLUMNS.length}).
      </div>`;
  } else {
    const items = missing.map(col => `<li>${col}</li>`).join('');
    dom.validationResult.innerHTML = `
      <div class="validation-error-block">
        <p>⚠ Faltan ${missing.length} columna(s) requerida(s):</p>
        <ul class="missing-cols">${items}</ul>
      </div>`;
  }

  scrollTo(dom.sectionValidation);
}

// ─────────────────────────────────────────────────────────────
// RENDERIZADO: RESUMEN
// ─────────────────────────────────────────────────────────────

function renderSummary(totalRows, validRows, totalCols) {
  show(dom.sectionSummary);

  const metrics = [
    { value: totalRows,  label: 'Filas en el archivo' },
    { value: validRows,  label: 'Filas válidas'        },
    { value: totalCols,  label: 'Columnas detectadas'  },
    { value: REQUIRED_COLUMNS.length, label: 'Columnas requeridas' },
  ];

  dom.summaryGrid.innerHTML = metrics.map(m => `
    <div class="summary-card">
      <span class="summary-card__value">${m.value}</span>
      <span class="summary-card__label">${m.label}</span>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────────────────────
// RENDERIZADO: VISTA PREVIA
// ─────────────────────────────────────────────────────────────

function renderPreview(columns, rows) {
  show(dom.sectionPreview);

  // Encabezados
  const ths = columns.map(col => `<th>${escapeHtml(col)}</th>`).join('');
  dom.previewThead.innerHTML = `<tr>${ths}</tr>`;

  // Primeras N filas
  const preview = rows.slice(0, PREVIEW_ROWS);
  dom.previewTbody.innerHTML = preview.map(row => {
    const tds = columns.map(col => `<td title="${escapeHtml(String(row[col] ?? ''))}">${escapeHtml(String(row[col] ?? ''))}</td>`).join('');
    return `<tr>${tds}</tr>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────
// RENDERIZADO: RESULTADO
// ─────────────────────────────────────────────────────────────

function renderResult(success, cleanCount) {
  show(dom.sectionResult);

  if (success) {
    dom.resultContent.innerHTML = `
      <div class="result-box result-box--success">
        <span class="result-box__icon">✔</span>
        <div class="result-box__body">
          <strong>Archivo procesado correctamente</strong>
          <span class="result-box__meta">
            ${cleanCount} casos guardados. Visítalos en el Panel Admin o el Portal Asesor.
          </span>
        </div>
      </div>`;
  } else {
    dom.resultContent.innerHTML = `
      <div class="result-box result-box--error">
        <span class="result-box__icon">✕</span>
        <div class="result-box__body">
          <strong>No se pudo procesar el archivo</strong>
          <span class="result-box__meta">
            Corrige las columnas faltantes e intenta nuevamente.
          </span>
        </div>
      </div>`;
  }

  show(dom.resultActions);
  scrollTo(dom.sectionResult);
}

// ─────────────────────────────────────────────────────────────
// BACKEND PLACEHOLDER
// ─────────────────────────────────────────────────────────────

/**
 * Punto de integración con el backend (n8n / Supabase).
 * Reemplaza el cuerpo de esta función con fetch() real cuando
 * el endpoint esté disponible.
 *
 * @param {Object[]} data - Array de objetos con las filas limpias
 * @returns {Promise<{ok: boolean}>}
 */
async function sendToBackend(data) {
  console.log('Simulación envío:', data);

  // ── EJEMPLO de implementación real (descomentar cuando esté listo): ──
  //
  // const response = await fetch('https://tu-endpoint.supabase.co/functions/v1/cargar-casos', {
  //   method:  'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${TU_API_KEY}`,
  //   },
  //   body: JSON.stringify({ registros: data }),
  // });
  // if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
  // return response.json();

  // Simulación: espera artificial + éxito
  return new Promise(resolve =>
    setTimeout(() => resolve({ ok: true }), SIMULATE_DELAY)
  );
}

// ─────────────────────────────────────────────────────────────
// FLUJO PRINCIPAL: PROCESAR ARCHIVO
// ─────────────────────────────────────────────────────────────

async function processFile() {
  resetSections();
  setProcessingState(true);

  try {
    // 1. Parsear
    const { columns, rows } = await parseFile(state.file);
    state.columns  = columns;
    state.rawData  = rows;

    // 2. Validar columnas
    state.missingCols = validateColumns(columns);
    state.isValid     = state.missingCols.length === 0;

    renderValidation(state.missingCols);

    // 3. Limpiar datos
    state.cleanData = cleanRows(rows, columns);

    // 4. Resumen
    renderSummary(rows.length, state.cleanData.length, columns.length);

    // 5. Vista previa (siempre, incluso si hay columnas faltantes)
    renderPreview(columns, state.cleanData);

    // 6. Mapear filas a casos y guardar localmente (solo si la validación pasó)
    if (state.isValid) {
      const casos = state.cleanData.map((row, i) => mapRowToCaso(row, i));

      // Persist cases — this is the source of truth read by admin and asesor
      saveLocalStorage(LS_KEY, casos);
      console.log('[Juriscoop] juriscoop_casos guardado:', casos.length, 'registros');

      // Append a carga record so admin's historial de cargas shows real uploads
      const cargaRecord = {
        nombre_archivo:  state.file.name,
        fecha_carga:     new Date().toISOString(),
        estado:          'procesado',
        total_filas:     state.rawData.length,
        filas_ok:        state.cleanData.length,
        filas_error:     state.rawData.length - state.cleanData.length,
        usuario_carga:   'admin@juriscoop.co',
        porcentaje_ok:   (state.cleanData.length / state.rawData.length) * 100,
      };
      const cargas = loadLocalStorage(LS_KEY_CARGAS, []);
      cargas.unshift(cargaRecord);
      saveLocalStorage(LS_KEY_CARGAS, cargas);
      console.log('[Juriscoop] juriscoop_cargas actualizado:', cargas.length, 'carga(s)');

      // Send mapped cases to backend when the endpoint is available
      await sendToBackend(casos);
      renderResult(true, casos.length);
    } else {
      renderResult(false, 0);
    }

  } catch (err) {
    console.error('[Juriscoop] Error procesando archivo:', err);
    show(dom.sectionResult);
    dom.resultContent.innerHTML = `
      <div class="result-box result-box--error">
        <span class="result-box__icon">✕</span>
        <div class="result-box__body">
          <strong>Error inesperado</strong>
          <span class="result-box__meta">${escapeHtml(err.message)}</span>
        </div>
      </div>`;
    show(dom.resultActions);
  } finally {
    setProcessingState(false);
  }
}

// ─────────────────────────────────────────────────────────────
// ESTADO DEL BOTÓN PROCESAR
// ─────────────────────────────────────────────────────────────

function setProcessingState(loading) {
  if (loading) {
    dom.btnProcess.disabled   = true;
    dom.btnProcess.innerHTML  = '<span class="spinner"></span> Procesando…';
  } else {
    dom.btnProcess.disabled   = false;
    dom.btnProcess.textContent = 'Procesar archivo';
  }
}

// ─────────────────────────────────────────────────────────────
// GESTIÓN DE ARCHIVO SELECCIONADO
// ─────────────────────────────────────────────────────────────

function onFileSelected(file) {
  hide(dom.alertFormat);
  resetSections();

  if (!isValidFormat(file)) {
    show(dom.alertFormat);
    dom.alertFormatMsg.textContent = `Formato no permitido: ".${file.name.split('.').pop()}". Usa .xlsx o .csv.`;
    dom.alertFormat.className      = 'alert alert--error';
    clearFile();
    return;
  }

  state.file = file;
  dom.fileName.textContent = file.name;
  show(dom.fileInfo);
  dom.btnProcess.disabled = false;
}

function clearFile() {
  state.file              = null;
  state.rawData           = [];
  state.columns           = [];
  state.cleanData         = [];
  state.missingCols       = [];
  state.isValid           = false;
  dom.fileInput.value     = '';
  dom.fileName.textContent = '—';
  hide(dom.fileInfo);
  dom.btnProcess.disabled = true;
  resetSections();
}

// ─────────────────────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────────────────────

// Input file change
dom.fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) onFileSelected(file);
});

// Drag & drop
dom.dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dom.dropzone.classList.add('drag-over');
});

dom.dropzone.addEventListener('dragleave', () => {
  dom.dropzone.classList.remove('drag-over');
});

dom.dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dom.dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) onFileSelected(file);
});

// Botón Procesar
dom.btnProcess.addEventListener('click', () => {
  if (!state.file) {
    show(dom.alertFormat);
    dom.alertFormatMsg.textContent = 'Selecciona un archivo antes de procesar.';
    dom.alertFormat.className      = 'alert alert--warning';
    return;
  }
  hide(dom.alertFormat);
  processFile();
});

// Botón Limpiar
dom.btnClear.addEventListener('click', () => {
  clearFile();
  hide(dom.alertFormat);
});

// Botón Nuevo archivo
dom.btnNew.addEventListener('click', () => {
  clearFile();
  hide(dom.alertFormat);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

})(); // end initUploadPage