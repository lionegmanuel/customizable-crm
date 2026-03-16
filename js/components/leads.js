/**
 * Vista tabla de leads. Renderiza la tabla con búsqueda y filtros. Estado de filtros local al componente (no global).
 */

const LeadsView = (() => {
  let _onOpenLead = null;
  let _search = "";
  let _filterStage = "";
  let _filterNicho = "";

  /* ─── API pública ─── */

  function init({ onOpenLead }) {
    _onOpenLead = onOpenLead;
  }

  function render() {
    const el = document.getElementById("view-leads");
    if (!el) return;

    const filtered = Store.query({
      search: _search,
      stage: _filterStage,
      nicho: _filterNicho,
    });

    el.innerHTML = [
      _renderFilters(),
      _renderToolbar(filtered.length),
      _renderTable(filtered),
    ].join("");

    _attachHandlers();
  }

  /* ─── Filtros ─── */

  function _renderFilters() {
    const stageOpts = Store.getSettings()
      .stages.map(
        (s) =>
          `<option value="${s.id}" ${_filterStage === s.id ? "selected" : ""}>${Utils.esc(s.label)}</option>`,
      )
      .join("");

    const nichoOpts = Store.getSettings()
      .nichos.map(
        (n) =>
          `<option value="${n}" ${_filterNicho === n ? "selected" : ""}>${Utils.esc(n)}</option>`,
      )
      .join("");

    return `<div class="search-row">
      <input
        id="leads-search"
        placeholder="Buscar nombre, nicho, teléfono, Instagram..."
        value="${Utils.esc(_search)}"
      />
      <select id="leads-filter-stage">
        <option value="">Todas las etapas</option>
        ${stageOpts}
      </select>
      <select id="leads-filter-nicho">
        <option value="">Todos los nichos</option>
        ${nichoOpts}
      </select>
    </div>`;
  }

  function _renderToolbar(count) {
    return `<div class="actions-row">
      <span class="text-muted text-sm">${count} lead${count !== 1 ? "s" : ""}</span>
      <div style="display:flex;gap:6px">
        <button class="btn btn--sm" id="btn-export-leads">↓ Exportar backup</button>
        <button class="btn btn--sm" id="btn-import-leads">↑ Importar</button>
      </div>
    </div>`;
  }

  /* ─── Tabla ─── */

  function _renderTable(leads) {
    const rows = leads.length
      ? leads.map(_renderRow).join("")
      : `<tr><td colspan="8">
          <div class="empty">
            <strong>Sin resultados</strong>
            Probá ajustar los filtros de búsqueda.
          </div>
         </td></tr>`;

    return `<div class="panel-card">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Nicho</th>
            <th>Etapa</th>
            <th>WA</th>
            <th>Ticket</th>
            <th>Temperatura</th>
            <th>Prioridad</th>
            <th>Última act.</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  function _renderRow(lead) {
    const days = Utils.daysSince(lead.lastActivity);
    const waBtn = lead.whatsapp
      ? `<a class="btn btn--sm btn--wa"
            href="https://wa.me/${(lead.whatsapp || "").replace(/\D/g, "")}"
            target="_blank"
            rel="noopener"
            onclick="event.stopPropagation()">WA</a>`
      : "—";

    const tempHtml = lead.temperatura
      ? `<span style="display:flex;align-items:center;gap:5px">
           ${Utils.tempDotHtml(lead.temperatura)}
           ${Utils.esc(lead.temperatura)}
         </span>`
      : "—";

    const prioHtml = lead.prioridad
      ? `<span class="${Utils.priorityClass(lead.prioridad)}">${Utils.esc(lead.prioridad)}</span>`
      : "—";

    return `<tr data-id="${lead.id}" onclick="LeadsView._onRowClick('${lead.id}')">
      <td style="font-weight:500;max-width:160px" class="truncate">${Utils.esc(lead.name || "—")}</td>
      <td class="text-muted">${Utils.esc(lead.nicho || "—")}</td>
      <td>${Utils.stageBadgeHtml(lead.stage)}</td>
      <td>${waBtn}</td>
      <td style="color:var(--green);font-weight:500">${lead.ticket ? Utils.fmtCurrency(lead.ticket) : "—"}</td>
      <td>${tempHtml}</td>
      <td>${prioHtml}</td>
      <td style="color:${days > Store.getSettings().followupDays ? "var(--amber)" : "var(--text-tertiary)"};font-size:12px">${days}d</td>
    </tr>`;
  }

  /* ─── Event handlers ─── */

  function _attachHandlers() {
    const searchEl = document.getElementById("leads-search");
    const stageEl = document.getElementById("leads-filter-stage");
    const nichoEl = document.getElementById("leads-filter-nicho");
    const exportEl = document.getElementById("btn-export-leads");
    const importEl = document.getElementById("btn-import-leads");

    if (searchEl)
      searchEl.addEventListener("input", (e) => {
        _search = e.target.value;
        render();
      });

    if (stageEl)
      stageEl.addEventListener("change", (e) => {
        _filterStage = e.target.value;
        render();
      });

    if (nichoEl)
      nichoEl.addEventListener("change", (e) => {
        _filterNicho = e.target.value;
        render();
      });

    if (exportEl)
      exportEl.addEventListener("click", () => {
        const filename = `velinex-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
        Utils.downloadFile(Store.exportJSON(), filename);
        App.showToast("Backup exportado", "success");
      });

    if (importEl)
      importEl.addEventListener("click", () => {
        Utils.pickJsonFile((json) => {
          App.showConfirm(
            "Importar datos",
            "Esto reemplazará todos los leads actuales. ¿Continuar?",
            () => {
              try {
                const count = Store.importJSON(json);
                App.showToast(`${count} leads importados`, "success");
              } catch (err) {
                App.showToast("Archivo inválido", "danger");
              }
            },
          );
        });
      });
  }

  function _onRowClick(id) {
    if (_onOpenLead) _onOpenLead(id);
  }

  return {
    init,
    render,
    _onRowClick,
  };
})();
