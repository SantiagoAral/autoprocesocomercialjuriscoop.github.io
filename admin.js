/* ═══════════════════════════════════════════════════════════════
   JURISCOOP MVP – admin.js
   Panel Admin · Case management dashboard
   Depends on app.js: escapeHtml, fmtDate, statusBadge,
                      LS_KEY, loadLocalStorage
════════════════════════════════════════════════════════════════ */

'use strict';

// ─────────────────────────────────────────────────────────────
// MVP AUTH GUARD
// Redirect to login if the session flag is missing.
// Replace with a real token/session check before production.
// ─────────────────────────────────────────────────────────────

if (sessionStorage.getItem('juriscoop_admin_auth') !== 'true') {
  location.replace('admin-login.html');
}

// ─────────────────────────────────────────────────────────────
// FALLBACK DATA
// Shown before any Excel file has been uploaded.
// Shape must match the object produced by mapRowToCaso() in app.js.
// ─────────────────────────────────────────────────────────────

const FALLBACK_CASOS = [
  {
    id: 'GC-0047', asunto: 'GC-0047',
    cliente: 'Carlos Martínez López',  nombre_cliente: 'Carlos Martínez López',
    producto: 'Crédito de vivienda',   asesor: 'Laura Gómez',
    estado: 'pendiente',   vencimiento: '2026-04-25',
    ultima_actividad: null,
    ultimo_comentario: 'Sin contacto aún. Pendiente primera llamada.',
  },
  {
    id: 'GC-0048', asunto: 'GC-0048',
    cliente: 'Ana Sofía Torres',       nombre_cliente: 'Ana Sofía Torres',
    producto: 'Tarjeta de crédito',    asesor: 'Pedro Ramírez',
    estado: 'en-gestion',  vencimiento: '2026-04-22',
    ultima_actividad: '2026-04-16T14:30:00Z',
    ultimo_comentario: 'Cliente solicitó llamada el miércoles a las 10 AM.',
  },
  {
    id: 'GC-0049', asunto: 'GC-0049',
    cliente: 'Luis Fernando Ríos',     nombre_cliente: 'Luis Fernando Ríos',
    producto: 'Crédito de consumo',    asesor: 'Laura Gómez',
    estado: 'no-contesta', vencimiento: '2026-04-20',
    ultima_actividad: '2026-04-14T11:00:00Z',
    ultimo_comentario: 'Tres intentos de llamada sin respuesta.',
  },
  {
    id: 'GC-0050', asunto: 'GC-0050',
    cliente: 'María José Vargas',      nombre_cliente: 'María José Vargas',
    producto: 'Libranza',              asesor: 'Carlos Díaz',
    estado: 'completado',  vencimiento: '2026-04-30',
    ultima_actividad: '2026-04-17T08:45:00Z',
    ultimo_comentario: 'Acuerdo de pago firmado. Caso cerrado.',
  },
  {
    id: 'GC-0051', asunto: 'GC-0051',
    cliente: 'Jorge Andrés Peña',      nombre_cliente: 'Jorge Andrés Peña',
    producto: 'Crédito de consumo',    asesor: 'Pedro Ramírez',
    estado: 'pendiente',   vencimiento: '2026-04-28',
    ultima_actividad: null,
    ultimo_comentario: 'Caso nuevo asignado desde carga del 17 de abril.',
  },
  {
    id: 'GC-0052', asunto: 'GC-0052',
    cliente: 'Sandra Milena Ruiz',     nombre_cliente: 'Sandra Milena Ruiz',
    producto: 'Cuenta de ahorros',     asesor: 'Carlos Díaz',
    estado: 'en-gestion',  vencimiento: '2026-05-02',
    ultima_actividad: '2026-04-16T10:00:00Z',
    ultimo_comentario: 'Cliente interesada en refinanciación. Reunión agendada.',
  },
  {
    id: 'GC-0053', asunto: 'GC-0053',
    cliente: 'Ricardo Herrera Molina', nombre_cliente: 'Ricardo Herrera Molina',
    producto: 'Crédito de vivienda',   asesor: 'Laura Gómez',
    estado: 'pendiente',   vencimiento: '2026-04-19',
    ultima_actividad: null,
    ultimo_comentario: 'Vencimiento próximo. Requiere contacto urgente.',
  },
  {
    id: 'GC-0054', asunto: 'GC-0054',
    cliente: 'Patricia Lozano Vega',   nombre_cliente: 'Patricia Lozano Vega',
    producto: 'Tarjeta de crédito',    asesor: 'Pedro Ramírez',
    estado: 'completado',  vencimiento: '2026-04-24',
    ultima_actividad: '2026-04-15T13:15:00Z',
    ultimo_comentario: 'Pago total realizado. Caso cerrado exitosamente.',
  },
];

const FALLBACK_CARGAS = [
  {
    nombre_archivo: 'cartera_abril_2026.xlsx',
    fecha_carga: '2026-04-17T10:23:00Z', estado: 'procesado',
    total_filas: 312, filas_ok: 310, filas_error: 2,
    usuario_carga: 'admin@juriscoop.co', porcentaje_ok: 99.36,
  },
  {
    nombre_archivo: 'cartera_marzo_2026.xlsx',
    fecha_carga: '2026-03-31T09:10:00Z', estado: 'procesado_con_errores',
    total_filas: 280, filas_ok: 265, filas_error: 15,
    usuario_carga: 'admin@juriscoop.co', porcentaje_ok: 94.64,
  },
  {
    nombre_archivo: 'cartera_febrero_2026.xlsx',
    fecha_carga: '2026-02-28T15:45:00Z', estado: 'procesado',
    total_filas: 195, filas_ok: 195, filas_error: 0,
    usuario_carga: 'supervisor@juriscoop.co', porcentaje_ok: 100,
  },
];

// ─────────────────────────────────────────────────────────────
// DATA  — loaded from localStorage, falls back to demo data
// admin.js is read-only: it never writes to localStorage,
// so it never overwrites data saved by asesor or the upload flow.
// ─────────────────────────────────────────────────────────────

const casos = loadLocalStorage(LS_KEY, FALLBACK_CASOS);
console.log('[Juriscoop] admin — juriscoop_casos cargado:', casos.length, 'caso(s)');

// ─────────────────────────────────────────────────────────────
// FILTER STATE
// ─────────────────────────────────────────────────────────────

let filterEstado = 'todos';
let filterAsesor = 'todos';
let filterSearch = '';

function getFiltered() {
  const q = filterSearch.toLowerCase();
  return casos.filter(c => {
    const matchEstado = filterEstado === 'todos' || c.estado === filterEstado;
    const matchAsesor = filterAsesor === 'todos' || c.asesor === filterAsesor;
    const matchSearch = !q
      || (c.cliente  || '').toLowerCase().includes(q)
      || (c.asesor   || '').toLowerCase().includes(q)
      || (c.id       || '').toLowerCase().includes(q);
    return matchEstado && matchAsesor && matchSearch;
  });
}

// ─────────────────────────────────────────────────────────────
// RENDER: KPIs  (always the full loaded dataset)
// Status counts come from juriscoop_casos (source of truth).
// Activity count (cases touched today) comes from juriscoop_gestiones.
// ─────────────────────────────────────────────────────────────

function renderKPIs() {
  document.getElementById('kpi-total').textContent       = casos.length;
  document.getElementById('kpi-pendientes').textContent  = casos.filter(c => c.estado === 'pendiente').length;
  document.getElementById('kpi-en-gestion').textContent  = casos.filter(c => c.estado === 'en-gestion').length;
  document.getElementById('kpi-completados').textContent = casos.filter(c => c.estado === 'completado').length;
}

// ─────────────────────────────────────────────────────────────
// GESTIONES HELPERS (admin read-only access)
// Admin never writes to gestiones — only reads for reporting.
// ─────────────────────────────────────────────────────────────

/**
 * Return all gestiones entries, newest first.
 * Falls back to [] when no advisor has saved any activity yet.
 * @returns {Object[]}
 */
function loadGestiones() {
  return loadLocalStorage(LS_KEY_GESTIONES, []);
}

/**
 * Count distinct caso_ids that have at least one gestion entry today.
 * Useful for a "casos gestionados hoy" KPI when the UI grows.
 * @returns {number}
 */
function countCasosGestionadosHoy() {
  const hoy = new Date().toISOString().slice(0, 10);   // YYYY-MM-DD
  const ids  = new Set(
    loadGestiones()
      .filter(g => g.fecha && g.fecha.startsWith(hoy))
      .map(g => g.caso_id)
  );
  return ids.size;
}

/**
 * Return the N most recent gestiones across all advisors and cases.
 * @param {number} n  Max entries to return (default 10).
 * @returns {Object[]}
 */
function getRecentActivity(n = 10) {
  // Already stored newest-first by appendGestion in app.js
  return loadGestiones().slice(0, n);
}

/**
 * Return all gestiones for a specific case, newest first.
 * Mirrors the shared getGestionesByCaso() from app.js but is
 * kept here so admin.js stays self-contained for future refactors.
 * @param {string} casoId
 * @returns {Object[]}
 */
function getAdminGestionesByCaso(casoId) {
  return loadGestiones().filter(g => g.caso_id === casoId);
}

/**
 * Build a per-advisor activity summary from gestiones.
 * Returns an array of { asesor_nombre, asesor_id, total, completados, ultima_gestion }.
 * Useful for a future "Rendimiento por asesor" tab.
 * @returns {Object[]}
 */
function buildAsesorSummary() {
  const map = {};
  loadGestiones().forEach(g => {
    const key = g.asesor_id || g.asesor_nombre || 'sin_asignar';
    if (!map[key]) {
      map[key] = {
        asesor_nombre:   g.asesor_nombre || g.asesor || key,
        asesor_id:       g.asesor_id || key,
        total:           0,
        completados:     0,
        ultima_gestion:  g.fecha,
      };
    }
    map[key].total++;
    if (g.estado_nuevo === 'completado') map[key].completados++;
    // gestiones are newest-first so the first seen per advisor is the latest
    // (already set on first encounter above — no need to update)
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

/**
 * Render a "Actividad reciente" section inside the casos tab using gestiones.
 * Called once at boot; can be called again to refresh without a page reload.
 * Only renders if the placeholder element #recent-activity-list exists in the DOM.
 */
function renderRecentActivity() {
  const container = document.getElementById('recent-activity-list');
  if (!container) return;    // element not yet added to admin.html — safe no-op

  const entries = getRecentActivity(10);
  if (!entries.length) {
    container.innerHTML = '<p class="td-muted" style="padding:1rem 0">No hay actividad registrada aún.</p>';
    return;
  }

  container.innerHTML = entries.map(g => `
    <div class="activity-entry">
      <span class="activity-entry__time">${fmtDate(g.fecha, true)}</span>
      <span class="activity-entry__who">${escapeHtml(g.asesor_nombre || g.asesor || '—')}</span>
      <span class="activity-entry__case">${escapeHtml(g.caso_id || '—')}</span>
      <span class="activity-entry__client">${escapeHtml(g.nombre_cliente || '—')}</span>
      <span>${statusBadge(g.estado_anterior || 'pendiente')}</span>
      <span class="activity-entry__arrow">→</span>
      <span>${statusBadge(g.estado_nuevo)}</span>
      ${g.nota ? `<span class="activity-entry__note td-muted">"${escapeHtml(g.nota)}"</span>` : ''}
    </div>`).join('');
}

// Log gestiones count at boot for debugging
console.log('[Juriscoop] admin — juriscoop_gestiones cargado:', loadGestiones().length, 'gestión(es)');


// ─────────────────────────────────────────────────────────────
// RENDER: Tabla de casos
// ─────────────────────────────────────────────────────────────

function renderTablaCasos(lista) {
  const tbody = document.getElementById('tabla-casos-admin');

  if (!lista.length) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-state__icon">🔍</div>
          <div class="empty-state__text">No se encontraron casos con ese criterio.</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(c => `
    <tr>
      <td class="td-label">${escapeHtml(c.id || c.asunto)}</td>
      <td class="td-bold">${escapeHtml(c.cliente || c.nombre_cliente || '—')}</td>
      <td class="td-muted">${escapeHtml(c.producto || '—')}</td>
      <td>${escapeHtml(c.asesor || '—')}</td>
      <td>${statusBadge(c.estado)}</td>
      <td class="td-sm">${fmtDate(c.vencimiento)}</td>
      <td class="td-sm td-muted">${fmtDate(c.ultima_actividad, true)}</td>
      <td class="td-truncate-sm td-muted" title="${escapeHtml(c.ultimo_comentario || '')}">${escapeHtml(c.ultimo_comentario || '—')}</td>
    </tr>`).join('');
}

// ─────────────────────────────────────────────────────────────
// RENDER: Tabla de cargas (secondary tab)
// Reads from juriscoop_cargas (written by the upload flow in app.js).
// Falls back to FALLBACK_CARGAS so the demo always shows something.
// ─────────────────────────────────────────────────────────────

function renderTablaCargas() {
  const tbody  = document.getElementById('tabla-cargas');
  const cargas = loadLocalStorage(LS_KEY_CARGAS, FALLBACK_CARGAS);
  console.log('[Juriscoop] admin — juriscoop_cargas cargado:', cargas.length, 'carga(s)');

  if (!cargas.length) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-state__icon">📂</div>
          <div class="empty-state__text">No hay cargas registradas aún.</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = cargas.map(c => {
    const pct        = Number(c.porcentaje_ok).toFixed(1);
    const errorClass = c.filas_error > 0 ? 'td-error' : 'td-neutral';
    return `
      <tr>
        <td class="td-truncate" title="${escapeHtml(c.nombre_archivo)}">${escapeHtml(c.nombre_archivo)}</td>
        <td>${fmtDate(c.fecha_carga, true)}</td>
        <td class="td-right">${c.total_filas.toLocaleString('es-CO')}</td>
        <td class="td-right td-success">${c.filas_ok.toLocaleString('es-CO')}</td>
        <td class="td-right ${errorClass}">${c.filas_error}</td>
        <td>
          <div class="progress-wrap">
            <div class="progress-bar">
              <div class="progress-bar__fill" style="width:${pct}%"></div>
            </div>
            <span class="progress-pct">${pct}%</span>
          </div>
        </td>
        <td>${statusBadge(c.estado)}</td>
        <td class="td-muted">${escapeHtml(c.usuario_carga || '—')}</td>
      </tr>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────
// INIT: Advisor filter — populated from unique asesor values
// ─────────────────────────────────────────────────────────────

function initAsesorFilter() {
  const sel          = document.getElementById('filter-asesor');
  const btnHistorial = document.getElementById('btn-historial-admin');
  const asesores     = [...new Set(casos.map(c => c.asesor).filter(Boolean))].sort();

  asesores.forEach(nombre => {
    const opt = document.createElement('option');
    opt.value       = nombre;
    opt.textContent = nombre;
    sel.appendChild(opt);
  });

  function actualizarBotonHistorial() {
    if (!btnHistorial) return;
    const asesor = sel.value;
    if (asesor && asesor !== 'todos') {
      btnHistorial.href = `historial.html?asesor=${encodeURIComponent(asesor)}`;
      btnHistorial.classList.remove('hidden');
    } else {
      btnHistorial.classList.add('hidden');
    }
  }

  sel.addEventListener('change', () => {
    filterAsesor = sel.value;
    actualizarBotonHistorial();
    renderTablaCasos(getFiltered());
  });

  actualizarBotonHistorial();
}

// ─────────────────────────────────────────────────────────────
// INIT: Status filter pills
// ─────────────────────────────────────────────────────────────

function initFilters() {
  document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      filterEstado = pill.dataset.filter;
      renderTablaCasos(getFiltered());
    });
  });
}

// ─────────────────────────────────────────────────────────────
// INIT: Search input
// ─────────────────────────────────────────────────────────────

function initSearch() {
  document.getElementById('search-casos').addEventListener('input', e => {
    filterSearch = e.target.value.trim();
    renderTablaCasos(getFiltered());
  });
}

// ─────────────────────────────────────────────────────────────
// INIT: Tabs
// ─────────────────────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// ─────────────────────────────────────────────────────────────
// EXPORT: CSV of the current filtered view
// ─────────────────────────────────────────────────────────────

function exportCSV() {
  const lista   = getFiltered();
  const headers = ['ID Caso','Cliente','Producto','Asesor','Estado',
                   'Vencimiento','Última actividad','Último comentario'];

  function cell(v) { return `"${String(v == null ? '' : v).replace(/"/g, '""')}"`; }

  const rows = lista.map(c => [
    cell(c.id || c.asunto),
    cell(c.cliente || c.nombre_cliente),
    cell(c.producto),
    cell(c.asesor),
    cell(c.estado),
    cell(fmtDate(c.vencimiento)),
    cell(fmtDate(c.ultima_actividad, true)),
    cell(c.ultimo_comentario),
  ].join(','));

  const csv  = [headers.map(cell).join(','), ...rows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `juriscoop_casos_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function initExport() {
  document.getElementById('btn-export').addEventListener('click', exportCSV);
}

// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────

renderKPIs();
renderTablaCasos(casos);
renderTablaCargas();
renderRecentActivity();   // reads juriscoop_gestiones — safe no-op if element absent
initAsesorFilter();
initFilters();
initSearch();
initTabs();
initExport();

// ─────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────

document.getElementById('btn-logout').addEventListener('click', function () {
  sessionStorage.removeItem('juriscoop_admin_auth');
  location.replace('index.html');
});

/*
 * ── INTEGRACIÓN REAL ──
 * Replace loadLocalStorage with a Supabase fetch and remove FALLBACK_CASOS:
 *
 * const casos = await fetch(
 *   'https://TU.supabase.co/rest/v1/v_casos_resumen?order=vencimiento.asc',
 *   { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
 * ).then(r => r.json());
 */