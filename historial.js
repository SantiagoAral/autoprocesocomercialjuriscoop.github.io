/* ═══════════════════════════════════════════════════════════════
   JURISCOOP MVP – historial.js
   Historial de actividad POR ASESOR.
   Lee ?asesor=<nombre> de la URL y muestra únicamente los
   registros de juriscoop_gestiones donde asesor_nombre coincide.

   Depends on app.js:
     escapeHtml, fmtDate, statusBadge,
     LS_KEY, LS_KEY_GESTIONES, loadLocalStorage, getGestiones
════════════════════════════════════════════════════════════════ */

'use strict';

const ESTADO_META = {
  'pendiente':   { label: 'Pendiente',   dot: 'warning' },
  'en-gestion':  { label: 'En gestión',  dot: 'primary' },
  'no-contesta': { label: 'No contesta', dot: 'purple'  },
  'completado':  { label: 'Completado',  dot: 'success' },
};

function estadoLabel(val) { return (ESTADO_META[val] || {}).label || val || '—'; }
function estadoDot(val)   { return (ESTADO_META[val] || {}).dot   || 'muted';   }

// ── URL param ──
const params       = new URLSearchParams(window.location.search);
let   asesorActual = params.get('asesor') || '';

// ── Datos globales ──
const todasGestiones = getGestiones();   // app.js → lee juriscoop_gestiones
const todosCasos     = loadLocalStorage(LS_KEY, []);

// Todos los asesores únicos (union de gestiones + casos)
const todosAsesores = [...new Set([
  ...todasGestiones.map(g => g.asesor_nombre || g.asesor),
  ...todosCasos.map(c => c.asesor),
].filter(Boolean))].sort();

// ── Filtro por asesor ──
function getGestionesDeAsesor(nombre) {
  if (!nombre) return [];
  return todasGestiones.filter(g =>
    (g.asesor_nombre || g.asesor || '') === nombre
  );
}

// ── Dropdown de asesor ──
function renderDropdownAsesor() {
  const sel = document.getElementById('sel-historial-asesor');
  if (!sel) return;

  sel.innerHTML = '<option value="">— Selecciona un asesor —</option>';
  todosAsesores.forEach(nombre => {
    const opt       = document.createElement('option');
    opt.value       = nombre;
    opt.textContent = nombre;
    if (nombre === asesorActual) opt.selected = true;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    asesorActual = sel.value;
    const url = new URL(window.location.href);
    asesorActual
      ? url.searchParams.set('asesor', asesorActual)
      : url.searchParams.delete('asesor');
    history.replaceState(null, '', url.toString());
    renderAll();
  });
}

// ── Meta card ──
function renderMeta(gestiones) {
  const subtitle = document.getElementById('header-subtitle');
  const meta     = document.getElementById('historial-meta');

  if (!asesorActual) {
    if (subtitle) subtitle.textContent = 'Selecciona un asesor para ver su historial.';
    if (meta)     meta.innerHTML = '';
    return;
  }

  if (subtitle) subtitle.textContent = `Historial de ${asesorActual}`;
  if (!meta) return;

  const total       = gestiones.length;
  const completados = gestiones.filter(g => g.estado_nuevo === 'completado').length;
  const enGestion   = gestiones.filter(g => g.estado_nuevo === 'en-gestion').length;
  const noContesta  = gestiones.filter(g => g.estado_nuevo === 'no-contesta').length;

  meta.innerHTML = `
    <div class="historial-meta__grid">
      <div class="historial-meta__item historial-meta__item--name">
        <span class="historial-meta__label">Asesor</span>
        <span class="historial-meta__value historial-meta__asesor">${escapeHtml(asesorActual)}</span>
      </div>
      <div class="historial-meta__item">
        <span class="historial-meta__label">Total gestiones</span>
        <span class="historial-meta__value td-bold">${total}</span>
      </div>
      <div class="historial-meta__item">
        <span class="historial-meta__label">Completados</span>
        <span class="historial-meta__value" style="color:var(--color-success);font-weight:700">${completados}</span>
      </div>
      <div class="historial-meta__item">
        <span class="historial-meta__label">En gestión</span>
        <span class="historial-meta__value" style="color:var(--color-primary);font-weight:700">${enGestion}</span>
      </div>
      <div class="historial-meta__item">
        <span class="historial-meta__label">No contesta</span>
        <span class="historial-meta__value" style="color:#7c3aed;font-weight:700">${noContesta}</span>
      </div>
    </div>`;
}

// ── Timeline ──
function renderTimeline(gestiones) {
  const list  = document.getElementById('timeline-list');
  const empty = document.getElementById('empty-historial');
  const badge = document.getElementById('badge-total');

  if (!list) return;

  const emptyText = empty ? empty.querySelector('.empty-state__text') : null;

  if (!asesorActual) {
    list.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    if (emptyText) emptyText.innerHTML = 'Selecciona un asesor en el menú de arriba para ver su historial de actividad.';
    if (badge) badge.textContent = '0 registros';
    return;
  }

  if (!gestiones.length) {
    list.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    if (emptyText) emptyText.innerHTML =
      `<strong>${escapeHtml(asesorActual)}</strong> no tiene actividad registrada aún.<br>Los cambios de estado aparecerán aquí.`;
    if (badge) badge.textContent = '0 registros';
    return;
  }

  if (empty) empty.classList.add('hidden');
  list.classList.remove('hidden');
  if (badge) badge.textContent = `${gestiones.length} registro${gestiones.length !== 1 ? 's' : ''}`;

  list.innerHTML = gestiones.map((g, i) => {
    const esUltimo    = i === 0;
    const dot         = estadoDot(g.estado_nuevo);
    const labelNuevo  = estadoLabel(g.estado_nuevo);
    const labelPrev   = g.estado_anterior ? estadoLabel(g.estado_anterior) : null;
    const fechaFmt    = fmtDate(g.fecha, true);
    const notaText    = g.nota ? escapeHtml(g.nota) : null;
    const clienteText = escapeHtml(g.nombre_cliente || '—');
    const casoText    = escapeHtml(g.caso_id || '—');

    return `
      <li class="timeline__item${esUltimo ? ' timeline__item--latest' : ''}">

        <div class="timeline__dot timeline__dot--${dot}">
          ${esUltimo ? '<span class="timeline__dot-ring"></span>' : ''}
        </div>

        <div class="timeline__line"></div>

        <div class="timeline__body">
          ${esUltimo ? '<span class="timeline__latest-badge">Última actividad</span>' : ''}

          <!-- Cliente + ID caso -->
          <div class="timeline__cliente-row">
            <span class="timeline__cliente">${clienteText}</span>
            <span class="timeline__caso-id">${casoText}</span>
          </div>

          <!-- Transición de estado -->
          <p class="timeline__headline">
            ${labelPrev
              ? `<span class="timeline__prev">${escapeHtml(labelPrev)}</span>
                 <span class="timeline__arrow">→</span>`
              : ''}
            <span class="timeline__new timeline__new--${dot}">${escapeHtml(labelNuevo)}</span>
          </p>

          <!-- Hora -->
          <p class="timeline__meta">
            <span class="timeline__time">🕐 ${fechaFmt}</span>
          </p>

          ${notaText ? `<p class="timeline__nota">"${notaText}"</p>` : ''}
        </div>
      </li>`;
  }).join('');
}

// ── Render central ──
function renderAll() {
  const gestiones = getGestionesDeAsesor(asesorActual);
  renderMeta(gestiones);
  renderTimeline(gestiones);
}

// ── Boot ──
renderDropdownAsesor();
renderAll();