/* ═══════════════════════════════════════════════════════════════
   JURISCOOP MVP – asesor.js
   Portal Asesor · Advisor-scoped case view
   Depends on app.js: escapeHtml, fmtDate, statusBadge,
                      LS_KEY, loadLocalStorage, saveLocalStorage
════════════════════════════════════════════════════════════════ */

'use strict';

// ─────────────────────────────────────────────────────────────
// FALLBACK DATA
// Shown before any Excel file has been uploaded.
// id and asunto are always the same string — the primary key.
// Shape must match the object produced by mapRowToCaso() in app.js.
// ─────────────────────────────────────────────────────────────

const FALLBACK_CASOS = [
  {
    id: 'GC-0047', asunto: 'GC-0047',
    nombre_cliente: 'Carlos Martínez López', cliente: 'Carlos Martínez López',
    telefono: '3001234567', producto: 'Crédito de vivienda',
    vencimiento: '2026-04-25', objetivo: 'Normalización de cartera',
    estado: 'pendiente',   asesor: 'Laura Gómez',
    ultima_actividad: null, ultimo_comentario: 'Sin contacto aún.',
  },
  {
    id: 'GC-0048', asunto: 'GC-0048',
    nombre_cliente: 'Ana Sofía Torres', cliente: 'Ana Sofía Torres',
    telefono: '3112345678', producto: 'Tarjeta de crédito',
    vencimiento: '2026-04-22', objetivo: 'Pago cuota mínima',
    estado: 'en-gestion',  asesor: 'Pedro Ramírez',
    ultima_actividad: '2026-04-16T14:30:00Z',
    ultimo_comentario: 'Cliente solicitó llamada el miércoles a las 10 AM.',
  },
  {
    id: 'GC-0049', asunto: 'GC-0049',
    nombre_cliente: 'Luis Fernando Ríos', cliente: 'Luis Fernando Ríos',
    telefono: '3209876543', producto: 'Crédito de consumo',
    vencimiento: '2026-04-20', objetivo: 'Acuerdo de pago',
    estado: 'no-contesta', asesor: 'Laura Gómez',
    ultima_actividad: '2026-04-14T11:00:00Z',
    ultimo_comentario: 'Tres intentos de llamada sin respuesta.',
  },
  {
    id: 'GC-0050', asunto: 'GC-0050',
    nombre_cliente: 'María José Vargas', cliente: 'María José Vargas',
    telefono: '3154567890', producto: 'Libranza',
    vencimiento: '2026-04-30', objetivo: 'Renovación del crédito',
    estado: 'completado',  asesor: 'Carlos Díaz',
    ultima_actividad: '2026-04-17T08:45:00Z',
    ultimo_comentario: 'Acuerdo de pago firmado. Caso cerrado.',
  },
  {
    id: 'GC-0051', asunto: 'GC-0051',
    nombre_cliente: 'Jorge Andrés Peña', cliente: 'Jorge Andrés Peña',
    telefono: '3007654321', producto: 'Crédito de consumo',
    vencimiento: '2026-04-28', objetivo: 'Normalización de cartera',
    estado: 'pendiente',   asesor: 'Pedro Ramírez',
    ultima_actividad: null, ultimo_comentario: 'Caso nuevo asignado.',
  },
  {
    id: 'GC-0052', asunto: 'GC-0052',
    nombre_cliente: 'Sandra Milena Ruiz', cliente: 'Sandra Milena Ruiz',
    telefono: '3168765432', producto: 'Cuenta de ahorros',
    vencimiento: '2026-05-02', objetivo: 'Oferta de refinanciación',
    estado: 'en-gestion',  asesor: 'Carlos Díaz',
    ultima_actividad: '2026-04-16T10:00:00Z',
    ultimo_comentario: 'Reunión agendada para el lunes.',
  },
  {
    id: 'GC-0053', asunto: 'GC-0053',
    nombre_cliente: 'Ricardo Herrera Molina', cliente: 'Ricardo Herrera Molina',
    telefono: '3054321098', producto: 'Crédito de vivienda',
    vencimiento: '2026-04-19', objetivo: 'Normalización de cartera',
    estado: 'pendiente',   asesor: 'Laura Gómez',
    ultima_actividad: null, ultimo_comentario: 'Vencimiento próximo. Urgente.',
  },
  {
    id: 'GC-0054', asunto: 'GC-0054',
    nombre_cliente: 'Patricia Lozano Vega', cliente: 'Patricia Lozano Vega',
    telefono: '3142345678', producto: 'Tarjeta de crédito',
    vencimiento: '2026-04-24', objetivo: 'Pago total',
    estado: 'completado',  asesor: 'Pedro Ramírez',
    ultima_actividad: '2026-04-15T13:15:00Z',
    ultimo_comentario: 'Pago total realizado. Caso cerrado exitosamente.',
  },
];

// ─────────────────────────────────────────────────────────────
// STATE
// casos: full mutable array (all advisors); filtered on display only
// ─────────────────────────────────────────────────────────────

// Each case gets a _uid that is guaranteed unique within this session.
// _uid is what the modal uses to find the right case — it never depends
// on the business id (c.id / c.asunto) being unique across rows.
let casos = loadLocalStorage(LS_KEY, FALLBACK_CASOS).map((c, idx) => ({
  ...c,
  _uid: c._uid || `uid_${idx}`,
}));

let currentAsesor = null;   // null = show all
let currentFilter = 'todos';
let editingId     = null;   // _uid of the case open in the modal

// ─────────────────────────────────────────────────────────────
// FILTERING
// ─────────────────────────────────────────────────────────────

function getVisible() {
  return casos.filter(c => {
    const matchAsesor = !currentAsesor || c.asesor === currentAsesor;
    const matchEstado = currentFilter === 'todos' || c.estado === currentFilter;
    return matchAsesor && matchEstado;
  });
}

// ─────────────────────────────────────────────────────────────
// RENDER: KPIs  (scoped to the visible advisor/filter)
// ─────────────────────────────────────────────────────────────

function renderAsesorKPIs(lista) {
  document.getElementById('kpi-total').textContent       = lista.length;
  document.getElementById('kpi-pendientes').textContent  = lista.filter(c => c.estado === 'pendiente').length;
  document.getElementById('kpi-en-gestion').textContent  = lista.filter(c => c.estado === 'en-gestion').length;
  document.getElementById('kpi-completados').textContent = lista.filter(c => c.estado === 'completado').length;
}

// ─────────────────────────────────────────────────────────────
// RENDER: Tabla de casos
// ─────────────────────────────────────────────────────────────

function renderTablaCasos(lista) {
  const tbody = document.getElementById('tabla-casos');

  if (!lista.length) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-state__icon">📋</div>
          <div class="empty-state__text">No hay casos para mostrar.</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(c => {
    const disabled = c.estado === 'completado' ? 'disabled' : '';
    return `
      <tr data-id="${escapeHtml(c.id)}" data-estado="${c.estado}">
        <td class="td-label">${escapeHtml(c.asunto || c.id)}</td>
        <td class="td-bold">${escapeHtml(c.nombre_cliente || c.cliente || '—')}</td>
        <td>
          <a href="tel:${escapeHtml(c.telefono || '')}" class="link-primary">${escapeHtml(c.telefono || '—')}</a>
        </td>
        <td class="td-muted">${escapeHtml(c.producto || '—')}</td>
        <td class="td-sm">${fmtDate(c.vencimiento)}</td>
        <td class="td-muted td-truncate-sm" title="${escapeHtml(c.objetivo || '')}">${escapeHtml(c.objetivo || '—')}</td>
        <td>${statusBadge(c.estado)}</td>
        <td>
          <button class="btn-action" data-caso-id="${escapeHtml(c._uid)}" ${disabled}>Gestionar</button>
        </td>
      </tr>`;
  }).join('');
  // Click handling is done via event delegation in initModal — no per-button listeners here.
}

// ─────────────────────────────────────────────────────────────
// REFRESH — single entry point after any state change
// ─────────────────────────────────────────────────────────────

function refreshAll() {
  const visible = getVisible();
  renderAsesorKPIs(visible);
  renderTablaCasos(visible);
}

// ─────────────────────────────────────────────────────────────
// INIT: Advisor selector
// ─────────────────────────────────────────────────────────────

function initAsesorSelector() {
  const sel        = document.getElementById('sel-asesor-login');
  const btnHistorial = document.getElementById('btn-historial-asesor');
  const asesores   = [...new Set(casos.map(c => c.asesor).filter(Boolean))].sort();

  asesores.forEach(nombre => {
    const opt = document.createElement('option');
    opt.value       = nombre;
    opt.textContent = nombre;
    sel.appendChild(opt);
  });

  function actualizarBotonHistorial() {
    if (!btnHistorial) return;
    const asesor = sel.value;
    if (asesor) {
      btnHistorial.href = `historial.html?asesor=${encodeURIComponent(asesor)}`;
      btnHistorial.classList.remove('hidden');
    } else {
      btnHistorial.classList.add('hidden');
    }
  }

  sel.addEventListener('change', () => {
    currentAsesor = sel.value || null;
    currentFilter = 'todos';
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    const todoPill = document.querySelector('.pill[data-filter="todos"]');
    if (todoPill) todoPill.classList.add('active');
    actualizarBotonHistorial();
    refreshAll();
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
      currentFilter = pill.dataset.filter;
      refreshAll();
    });
  });
}

// ─────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────

function openModal(uid) {
  console.log('[Juriscoop] openModal — caso _uid recibido:', uid);
  // Search by _uid — guaranteed unique even when business ids (Asunto) repeat
  // or are empty across multiple rows in the same Excel upload.
  const caso = casos.find(c => c._uid === uid);
  if (!caso) {
    console.warn('[Juriscoop] openModal — caso no encontrado para _uid:', uid);
    return;
  }

  editingId = uid;
  document.getElementById('modal-cliente-info').textContent =
    `${caso.asunto || caso.id} · ${caso.nombre_cliente || caso.cliente} · ${caso.producto}`;
  document.getElementById('sel-estado').value = caso.estado;
  document.getElementById('txt-nota').value   = '';
  document.getElementById('modal-backdrop').classList.remove('hidden');
}

function closeModal() {
  editingId = null;
  document.getElementById('modal-backdrop').classList.add('hidden');
}

/**
 * Save the modal values back into the casos array and persist to
 * localStorage so the admin view reflects the change immediately.
 *
 * Updates:
 *   - estado           → new status chosen in the select
 *   - ultima_actividad → current timestamp
 *   - ultimo_comentario → note text (only if non-empty)
 */
function saveModal() {
  if (editingId === null) return;

  const caso = casos.find(c => c._uid === editingId);
  if (caso) {
    const nota          = document.getElementById('txt-nota').value.trim();
    const estadoAnterior = caso.estado;

    caso.estado           = document.getElementById('sel-estado').value;
    caso.ultima_actividad = new Date().toISOString();
    if (nota) caso.ultimo_comentario = nota;

    // ── Persist cases so admin.js reads the updated data on next load ──
    saveLocalStorage(LS_KEY, casos);
    console.log(
      '[Juriscoop] juriscoop_casos guardado — caso', caso.id,
      '| estado:', estadoAnterior, '→', caso.estado
    );

    // ── Append an activity record to the gestiones log ──
    const gestion = {
      caso_id:         caso.id,
      asesor:          caso.asesor  || currentAsesor || 'Sin asignar',
      nombre_cliente:  caso.nombre_cliente || caso.cliente || '—', 
      estado_anterior: estadoAnterior,
      estado_nuevo:    caso.estado,
      nota:            nota,
      fecha:           caso.ultima_actividad,
    };
    const gestiones = loadLocalStorage(LS_KEY_GESTIONES, []);
    gestiones.unshift(gestion);
    saveLocalStorage(LS_KEY_GESTIONES, gestiones);
    console.log('[Juriscoop] juriscoop_gestiones actualizado:', gestiones.length, 'gestión(es)');
  }

  closeModal();
  refreshAll();
}

function initModal() {
  document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-modal-save').addEventListener('click', saveModal);
  document.getElementById('modal-backdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Single event delegation listener on the tbody.
  // Handles all current and future Gestionar buttons with one handler,
  // set up once regardless of how many times renderTablaCasos re-runs.
  // Uses data-caso-id (not data-id) to avoid ambiguity with the <tr>'s data-id.
  document.getElementById('tabla-casos').addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-action');
    if (!btn || btn.disabled) return;
    openModal(btn.dataset.casoId);
  });
}

// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────

initAsesorSelector();
initFilters();
initModal();
refreshAll();

/*
 * ── INTEGRACIÓN REAL ──
 * Replace loadLocalStorage with a Supabase fetch filtered by auth session:
 *
 * const data = await fetch(
 *   `https://TU.supabase.co/rest/v1/casos_gestion?propietario=eq.${USER_ID}&order=vencimiento.asc`,
 *   { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
 * ).then(r => r.json());
 * casos = data;
 * initAsesorSelector();
 * refreshAll();
 */