/**
 * Vista tabla de leads. Renderiza la tabla con búsqueda y filtros. Estado de filtros local al componente (no global).
 */

const LeadsView = (() => {
  let _onOpenLead = null;
  let _search = "";
  let _filters = _defaultFilters();
  let _showAdvanced = false;
  let _searchRenderRaf = null;

  function _defaultFilters() {
    return {
      stage: "",
      nicho: "",
      subnicho: "",
      canal: "",
      ticketRango: "",
      temperatura: "",
      prioridad: "",
      city: "",
      province: "",
      country: "",
      targetCategory: "",
      subCategory: "",
      businessProfile: "",
      companySize: "",
      leadSource: "",
      decisionMakerRole: "",
      alignmentStatus: "",
      hasEmail: "",
      hasWhatsapp: "",
      hasPhone: "",
      hasWebsite: "",
      hasLinkedin: "",
      hasDecisionMaker: "",
      scoreMin: "",
      scoreMax: "",
      potentialMin: "",
      difficultyMax: "",
      followersMin: "",
      inactiveDaysMin: "",
      inactiveDaysMax: "",
    };
  }

  /* ─── API pública ─── */

  function init({ onOpenLead }) {
    _onOpenLead = onOpenLead;
  }

  function render() {
    const el = document.getElementById("view-leads");
    if (!el) return;

    const settings = Store.getSettings();
    const allLeads = Store.getAll();
    const options = Utils.collectLeadFilterOptions(allLeads, settings);

    const searchMatched = _search.trim()
      ? Store.query({ search: _search })
      : allLeads;

    const filtered = searchMatched.filter((lead) =>
      Utils.matchesLeadFilters(lead, _filters),
    );

    const activeFilters = _activeFiltersCount();

    el.innerHTML = [
      _renderFilters(options, activeFilters),
      _renderToolbar(filtered.length),
      _renderTable(filtered, settings.followupDays),
    ].join("");

    _attachHandlers();
  }

  /* ─── Filtros ─── */

  function _activeFiltersCount() {
    return Object.values(_filters).filter((value) => Utils.hasValue(value)).length;
  }

  function _renderOptionTags(items, selected) {
    return (items || [])
      .map(
        (item) =>
          `<option value="${Utils.esc(item)}" ${selected === item ? "selected" : ""}>${Utils.esc(item)}</option>`,
      )
      .join("");
  }

  function _renderPresenceOptions(selected) {
    return [
      `<option value="" ${selected === "" ? "selected" : ""}>Todos</option>`,
      `<option value="yes" ${selected === "yes" ? "selected" : ""}>Con dato</option>`,
      `<option value="no" ${selected === "no" ? "selected" : ""}>Sin dato</option>`,
    ].join("");
  }

  function _renderFilters(options, activeFilters) {
    const stageOpts = (options.stages || [])
      .map(
        (stage) =>
          `<option value="${stage.id}" ${_filters.stage === stage.id ? "selected" : ""}>${Utils.esc(stage.label)}</option>`,
      )
      .join("");

    const quickNichoOpts = _renderOptionTags(options.nichos, _filters.nicho);
    const priorityOpts = _renderOptionTags(options.prioridades, _filters.prioridad);
    const subnichoOpts = _renderOptionTags(options.subnichos, _filters.subnicho);
    const canalOpts = _renderOptionTags(options.canales, _filters.canal);
    const tempOpts = _renderOptionTags(options.temperaturas, _filters.temperatura);
    const ticketOpts = _renderOptionTags(options.ticketRangos, _filters.ticketRango);
    const cityOpts = _renderOptionTags(options.city, _filters.city);
    const provinceOpts = _renderOptionTags(options.province, _filters.province);
    const countryOpts = _renderOptionTags(options.country, _filters.country);
    const targetCategoryOpts = _renderOptionTags(
      options.targetCategory,
      _filters.targetCategory,
    );
    const subCategoryOpts = _renderOptionTags(options.subCategory, _filters.subCategory);
    const profileOpts = _renderOptionTags(options.businessProfile, _filters.businessProfile);
    const companySizeOpts = _renderOptionTags(options.companySize, _filters.companySize);
    const sourceOpts = _renderOptionTags(options.leadSource, _filters.leadSource);
    const roleOpts = _renderOptionTags(options.decisionMakerRole, _filters.decisionMakerRole);
    const alignmentOpts = _renderOptionTags(
      options.alignmentStatus,
      _filters.alignmentStatus,
    );

    const advancedLabel = _showAdvanced
      ? `Ocultar filtros PRO (${activeFilters})`
      : `Filtros PRO (${activeFilters})`;

    return `<div class="filters-card">
      <div class="search-row search-row--tight">
        <div class="search-input-wrap">
          <input
            id="leads-search"
            placeholder="Buscar por nombre, correo, teléfono, ciudad, web, decisor..."
            value="${Utils.esc(_search)}"
          />
          ${_search.trim() ? '<button class="search-clear-btn" id="leads-search-clear" type="button" aria-label="Limpiar búsqueda">×</button>' : ""}
        </div>
      </div>

      <div class="search-row search-row--tight">
        <select data-leads-filter="stage" id="leads-filter-stage">
          <option value="">Todas las etapas</option>
          ${stageOpts}
        </select>
        <select data-leads-filter="nicho" id="leads-filter-nicho">
          <option value="">Todos los nichos</option>
          ${quickNichoOpts}
        </select>
        <select data-leads-filter="prioridad" id="leads-filter-prioridad">
          <option value="">Todas las prioridades</option>
          ${priorityOpts}
        </select>
        <button class="btn btn--sm" id="leads-toggle-advanced" type="button">${advancedLabel}</button>
        <button class="btn btn--sm" id="leads-clear-filters" type="button" ${activeFilters ? "" : "disabled"}>Limpiar filtros</button>
      </div>

      <div class="filters-advanced ${_showAdvanced ? "filters-advanced--open" : ""}" id="leads-advanced-wrap">
        <div class="filters-grid">
          <div class="filter-field">
            <label>Sub-nicho</label>
            <select data-leads-filter="subnicho"><option value="">Todos</option>${subnichoOpts}</select>
          </div>
          <div class="filter-field">
            <label>Canal de contacto</label>
            <select data-leads-filter="canal"><option value="">Todos</option>${canalOpts}</select>
          </div>
          <div class="filter-field">
            <label>Temperatura</label>
            <select data-leads-filter="temperatura"><option value="">Todas</option>${tempOpts}</select>
          </div>
          <div class="filter-field">
            <label>Ticket</label>
            <select data-leads-filter="ticketRango"><option value="">Todos</option>${ticketOpts}</select>
          </div>

          <div class="filter-field">
            <label>Ciudad</label>
            <select data-leads-filter="city"><option value="">Todas</option>${cityOpts}</select>
          </div>
          <div class="filter-field">
            <label>Provincia</label>
            <select data-leads-filter="province"><option value="">Todas</option>${provinceOpts}</select>
          </div>
          <div class="filter-field">
            <label>País</label>
            <select data-leads-filter="country"><option value="">Todos</option>${countryOpts}</select>
          </div>
          <div class="filter-field">
            <label>Fuente del lead</label>
            <select data-leads-filter="leadSource"><option value="">Todas</option>${sourceOpts}</select>
          </div>

          <div class="filter-field">
            <label>Categoría objetivo</label>
            <select data-leads-filter="targetCategory"><option value="">Todas</option>${targetCategoryOpts}</select>
          </div>
          <div class="filter-field">
            <label>Subcategoría</label>
            <select data-leads-filter="subCategory"><option value="">Todas</option>${subCategoryOpts}</select>
          </div>
          <div class="filter-field">
            <label>Perfil comercial</label>
            <select data-leads-filter="businessProfile"><option value="">Todos</option>${profileOpts}</select>
          </div>
          <div class="filter-field">
            <label>Tamaño de empresa</label>
            <select data-leads-filter="companySize"><option value="">Todos</option>${companySizeOpts}</select>
          </div>

          <div class="filter-field">
            <label>Rol del decisor</label>
            <select data-leads-filter="decisionMakerRole"><option value="">Todos</option>${roleOpts}</select>
          </div>
          <div class="filter-field">
            <label>Estado de alineación</label>
            <select data-leads-filter="alignmentStatus"><option value="">Todos</option>${alignmentOpts}</select>
          </div>
          <div class="filter-field">
            <label>Correo</label>
            <select data-leads-filter="hasEmail">${_renderPresenceOptions(_filters.hasEmail)}</select>
          </div>
          <div class="filter-field">
            <label>WhatsApp</label>
            <select data-leads-filter="hasWhatsapp">${_renderPresenceOptions(_filters.hasWhatsapp)}</select>
          </div>

          <div class="filter-field">
            <label>Teléfono</label>
            <select data-leads-filter="hasPhone">${_renderPresenceOptions(_filters.hasPhone)}</select>
          </div>
          <div class="filter-field">
            <label>Sitio web</label>
            <select data-leads-filter="hasWebsite">${_renderPresenceOptions(_filters.hasWebsite)}</select>
          </div>
          <div class="filter-field">
            <label>LinkedIn</label>
            <select data-leads-filter="hasLinkedin">${_renderPresenceOptions(_filters.hasLinkedin)}</select>
          </div>
          <div class="filter-field">
            <label>Datos de decisor</label>
            <select data-leads-filter="hasDecisionMaker">${_renderPresenceOptions(_filters.hasDecisionMaker)}</select>
          </div>

          <div class="filter-field">
            <label>Score comercial mínimo</label>
            <input data-leads-filter="scoreMin" type="number" step="0.1" value="${Utils.esc(_filters.scoreMin)}" placeholder="70" />
          </div>
          <div class="filter-field">
            <label>Score comercial máximo</label>
            <input data-leads-filter="scoreMax" type="number" step="0.1" value="${Utils.esc(_filters.scoreMax)}" placeholder="100" />
          </div>
          <div class="filter-field">
            <label>Potencial mínimo (1-5)</label>
            <input data-leads-filter="potentialMin" type="number" min="1" max="5" step="1" value="${Utils.esc(_filters.potentialMin)}" placeholder="3" />
          </div>
          <div class="filter-field">
            <label>Dificultad máxima (1-5)</label>
            <input data-leads-filter="difficultyMax" type="number" min="1" max="5" step="1" value="${Utils.esc(_filters.difficultyMax)}" placeholder="3" />
          </div>
          <div class="filter-field">
            <label>Seguidores mínimos</label>
            <input data-leads-filter="followersMin" type="number" min="0" step="1" value="${Utils.esc(_filters.followersMin)}" placeholder="10000" />
          </div>
          <div class="filter-field">
            <label>Días sin actividad mín.</label>
            <input data-leads-filter="inactiveDaysMin" type="number" min="0" step="1" value="${Utils.esc(_filters.inactiveDaysMin)}" placeholder="3" />
          </div>
          <div class="filter-field">
            <label>Días sin actividad máx.</label>
            <input data-leads-filter="inactiveDaysMax" type="number" min="0" step="1" value="${Utils.esc(_filters.inactiveDaysMax)}" placeholder="30" />
          </div>
        </div>
      </div>
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

  function _renderTable(leads, followupDays) {
    const rows = leads.length
      ? leads.map((lead) => _renderRow(lead, followupDays)).join("")
      : `<tr><td colspan="9">
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
            <th>Ticket (USD)</th>
            <th>Temperatura</th>
            <th>Prioridad</th>
            <th>Última act.</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  function _renderRow(lead, followupDays) {
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
    const ticketHtml = lead.ticket ? `<span style="display:flex;align-items:center;gap:5px">
           ${Utils.ticketHtml(lead.ticket)}
           ${Utils.esc(lead.ticket)}
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
      <td>${ticketHtml}
      <td style="color:var(--green);font-weight:500">${lead.ticket ? Utils.fmtCurrency(lead.ticket) : "—"}</td>
      <td>${tempHtml}</td>
      <td>${prioHtml}</td>
      <td style="color:${days > followupDays ? "var(--amber)" : "var(--text-tertiary)"};font-size:12px">${days}d</td>
    </tr>`;
  }

  /* ─── Event handlers ─── */

  function _attachHandlers() {
    const searchEl = document.getElementById("leads-search");
    const clearSearchEl = document.getElementById("leads-search-clear");
    const toggleAdvancedEl = document.getElementById("leads-toggle-advanced");
    const clearFiltersEl = document.getElementById("leads-clear-filters");
    const exportEl = document.getElementById("btn-export-leads");
    const importEl = document.getElementById("btn-import-leads");

    if (searchEl)
      searchEl.addEventListener("input", (e) => {
        const { selectionStart, selectionEnd, value } = e.target;
        if (value === _search) return;
        _search = value;
        _queueRender(() => _restoreSearchCursor(selectionStart, selectionEnd));
      });

    if (searchEl)
      searchEl.addEventListener("keydown", (e) => {
        if (e.key !== "Escape" || !_search.trim()) return;
        e.preventDefault();
        e.stopPropagation();
        _clearSearch();
      });

    if (clearSearchEl)
      clearSearchEl.addEventListener("click", () => {
        _clearSearch();
      });

    if (toggleAdvancedEl)
      toggleAdvancedEl.addEventListener("click", () => {
        _showAdvanced = !_showAdvanced;
        render();
      });

    if (clearFiltersEl)
      clearFiltersEl.addEventListener("click", () => {
        _filters = _defaultFilters();
        render();
      });

    document.querySelectorAll("[data-leads-filter]").forEach((field) => {
      const eventName = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(eventName, (e) => {
        const key = e.currentTarget.dataset.leadsFilter;
        if (!key || !(key in _filters)) return;

        const value = e.currentTarget.value || "";
        if (_filters[key] === value) return;

        _filters = { ..._filters, [key]: value };
        _queueRender();
      });
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

  function _queueRender(postRender = null) {
    if (_searchRenderRaf) cancelAnimationFrame(_searchRenderRaf);
    _searchRenderRaf = requestAnimationFrame(() => {
      _searchRenderRaf = null;
      render();
      if (typeof postRender === "function") postRender();
    });
  }

  function _clearSearch() {
    if (!_search.trim()) return;
    if (_searchRenderRaf) {
      cancelAnimationFrame(_searchRenderRaf);
      _searchRenderRaf = null;
    }
    _search = "";
    _queueRender(() => {
      const el = document.getElementById("leads-search");
      if (el) el.focus();
    });
  }

  function _restoreSearchCursor(selectionStart, selectionEnd) {
    const searchEl = document.getElementById("leads-search");
    if (!searchEl) return;
    searchEl.focus();

    if (
      typeof selectionStart === "number" &&
      typeof selectionEnd === "number"
    ) {
      searchEl.setSelectionRange(selectionStart, selectionEnd);
    }
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
