/**
 * Vista de tipo Kanban
 * Responsabilidad: renderizar y gestionar el pipeline de leads.
 * Lee datos de Store. Delega cambios de etapa a Store.
 * Comunica apertura de panel a App via callback (inversión de dependencia).
 */

const PipelineView = (() => {
  let _onOpenLead = null;
  let _dragId = null;
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
    const el = document.getElementById("view-pipeline");
    if (!el) return;

    const settings = Store.getSettings();
    const stages = settings.stages;
    const followupDays = settings.followupDays;
    const terminalStages = new Set(
      stages.filter((stage) => stage.terminal).map((stage) => stage.id),
    );

    const leads = Store.getAll();
    const options = Utils.collectLeadFilterOptions(leads, settings);
    const searchMatched = _search.trim() ? Store.query({ search: _search }) : leads;
    const filteredLeads = searchMatched.filter((lead) =>
      Utils.matchesLeadFilters(lead, _filters),
    );

    const active = leads.filter((l) => !terminalStages.has(l.stage));
    const pipelineVal = active.reduce((a, l) => a + (Number(l.ticket) || 0), 0);
    const alertCount = active.filter(
      (l) => Utils.daysSince(l.lastActivity) > followupDays,
    ).length;

    const activeFilters = Object.values(_filters).filter((value) => Utils.hasValue(value)).length;

    el.innerHTML = [
      _renderMetrics(leads, active, pipelineVal, alertCount),
      _renderToolbar(filteredLeads.length, options, activeFilters),
      _renderKanban(filteredLeads, stages, followupDays),
    ].join("");

    _attachDragHandlers();
  }

  /* ─── Métricas resumen ─── */

  function _renderMetrics(leads, active, pipelineVal, alertCount) {
    const cerrados = leads.filter((l) => l.stage === "cerrado").length;
    return `<div class="metrics-row">
      <div class="metric-card">
        <div class="metric-label">Total leads</div>
        <div class="metric-val metric-val--purple">${leads.length}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Pipeline activo</div>
        <div class="metric-val">${active.length}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Cerrados</div>
        <div class="metric-val metric-val--green">${cerrados}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Valor pipeline</div>
        <div class="metric-val metric-val--amber">$${pipelineVal.toLocaleString("es-AR")}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Follow-up pendiente</div>
        <div class="metric-val ${alertCount > 0 ? "metric-val--red" : ""}">${alertCount}</div>
      </div>
    </div>`;
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

  function _renderToolbar(filteredCount, options, activeFilters) {
    const resultsLabel = `${filteredCount} resultado${filteredCount !== 1 ? "s" : ""}`;
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

    return `<div class="actions-row pipeline-toolbar">
      <div class="pipeline-toolbar-main">
        <div class="search-input-wrap">
          <input
            id="pipeline-search"
            placeholder="Buscar por nombre, correo, teléfono, ciudad, web, decisor..."
            value="${Utils.esc(_search)}"
          />
          ${_search.trim() ? '<button class="search-clear-btn" id="pipeline-search-clear" type="button" aria-label="Limpiar búsqueda">×</button>' : ""}
        </div>
        <span class="text-muted text-sm pipeline-results">${resultsLabel}</span>
      </div>
      <div class="pipeline-toolbar-actions">
        <button class="btn btn--sm" id="btn-export">↓ Exportar backup</button>
        <button class="btn btn--sm" id="btn-import">↑ Importar</button>
      </div>
    </div>

    <div class="filters-card pipeline-filters-card">
      <div class="search-row search-row--tight">
        <select data-pipeline-filter="stage" id="pipeline-filter-stage">
          <option value="">Todas las etapas</option>
          ${stageOpts}
        </select>
        <select data-pipeline-filter="nicho" id="pipeline-filter-nicho">
          <option value="">Todos los nichos</option>
          ${quickNichoOpts}
        </select>
        <select data-pipeline-filter="prioridad" id="pipeline-filter-prioridad">
          <option value="">Todas las prioridades</option>
          ${priorityOpts}
        </select>
        <button class="btn btn--sm" id="pipeline-toggle-advanced" type="button">${advancedLabel}</button>
        <button class="btn btn--sm" id="pipeline-clear-filters" type="button" ${activeFilters ? "" : "disabled"}>Limpiar filtros</button>
      </div>

      <div class="filters-advanced ${_showAdvanced ? "filters-advanced--open" : ""}" id="pipeline-advanced-wrap">
        <div class="filters-grid">
          <div class="filter-field">
            <label>Sub-nicho</label>
            <select data-pipeline-filter="subnicho"><option value="">Todos</option>${subnichoOpts}</select>
          </div>
          <div class="filter-field">
            <label>Canal de contacto</label>
            <select data-pipeline-filter="canal"><option value="">Todos</option>${canalOpts}</select>
          </div>
          <div class="filter-field">
            <label>Temperatura</label>
            <select data-pipeline-filter="temperatura"><option value="">Todas</option>${tempOpts}</select>
          </div>
          <div class="filter-field">
            <label>Ticket</label>
            <select data-pipeline-filter="ticketRango"><option value="">Todos</option>${ticketOpts}</select>
          </div>

          <div class="filter-field">
            <label>Ciudad</label>
            <select data-pipeline-filter="city"><option value="">Todas</option>${cityOpts}</select>
          </div>
          <div class="filter-field">
            <label>Provincia</label>
            <select data-pipeline-filter="province"><option value="">Todas</option>${provinceOpts}</select>
          </div>
          <div class="filter-field">
            <label>País</label>
            <select data-pipeline-filter="country"><option value="">Todos</option>${countryOpts}</select>
          </div>
          <div class="filter-field">
            <label>Fuente del lead</label>
            <select data-pipeline-filter="leadSource"><option value="">Todas</option>${sourceOpts}</select>
          </div>

          <div class="filter-field">
            <label>Categoría objetivo</label>
            <select data-pipeline-filter="targetCategory"><option value="">Todas</option>${targetCategoryOpts}</select>
          </div>
          <div class="filter-field">
            <label>Subcategoría</label>
            <select data-pipeline-filter="subCategory"><option value="">Todas</option>${subCategoryOpts}</select>
          </div>
          <div class="filter-field">
            <label>Perfil comercial</label>
            <select data-pipeline-filter="businessProfile"><option value="">Todos</option>${profileOpts}</select>
          </div>
          <div class="filter-field">
            <label>Tamaño de empresa</label>
            <select data-pipeline-filter="companySize"><option value="">Todos</option>${companySizeOpts}</select>
          </div>

          <div class="filter-field">
            <label>Rol del decisor</label>
            <select data-pipeline-filter="decisionMakerRole"><option value="">Todos</option>${roleOpts}</select>
          </div>
          <div class="filter-field">
            <label>Estado de alineación</label>
            <select data-pipeline-filter="alignmentStatus"><option value="">Todos</option>${alignmentOpts}</select>
          </div>
          <div class="filter-field">
            <label>Correo</label>
            <select data-pipeline-filter="hasEmail">${_renderPresenceOptions(_filters.hasEmail)}</select>
          </div>
          <div class="filter-field">
            <label>WhatsApp</label>
            <select data-pipeline-filter="hasWhatsapp">${_renderPresenceOptions(_filters.hasWhatsapp)}</select>
          </div>

          <div class="filter-field">
            <label>Teléfono</label>
            <select data-pipeline-filter="hasPhone">${_renderPresenceOptions(_filters.hasPhone)}</select>
          </div>
          <div class="filter-field">
            <label>Sitio web</label>
            <select data-pipeline-filter="hasWebsite">${_renderPresenceOptions(_filters.hasWebsite)}</select>
          </div>
          <div class="filter-field">
            <label>LinkedIn</label>
            <select data-pipeline-filter="hasLinkedin">${_renderPresenceOptions(_filters.hasLinkedin)}</select>
          </div>
          <div class="filter-field">
            <label>Datos de decisor</label>
            <select data-pipeline-filter="hasDecisionMaker">${_renderPresenceOptions(_filters.hasDecisionMaker)}</select>
          </div>

          <div class="filter-field">
            <label>Score comercial mínimo</label>
            <input data-pipeline-filter="scoreMin" type="number" step="0.1" value="${Utils.esc(_filters.scoreMin)}" placeholder="70" />
          </div>
          <div class="filter-field">
            <label>Score comercial máximo</label>
            <input data-pipeline-filter="scoreMax" type="number" step="0.1" value="${Utils.esc(_filters.scoreMax)}" placeholder="100" />
          </div>
          <div class="filter-field">
            <label>Potencial mínimo (1-5)</label>
            <input data-pipeline-filter="potentialMin" type="number" min="1" max="5" step="1" value="${Utils.esc(_filters.potentialMin)}" placeholder="3" />
          </div>
          <div class="filter-field">
            <label>Dificultad máxima (1-5)</label>
            <input data-pipeline-filter="difficultyMax" type="number" min="1" max="5" step="1" value="${Utils.esc(_filters.difficultyMax)}" placeholder="3" />
          </div>
          <div class="filter-field">
            <label>Seguidores mínimos</label>
            <input data-pipeline-filter="followersMin" type="number" min="0" step="1" value="${Utils.esc(_filters.followersMin)}" placeholder="10000" />
          </div>
          <div class="filter-field">
            <label>Días sin actividad mín.</label>
            <input data-pipeline-filter="inactiveDaysMin" type="number" min="0" step="1" value="${Utils.esc(_filters.inactiveDaysMin)}" placeholder="3" />
          </div>
          <div class="filter-field">
            <label>Días sin actividad máx.</label>
            <input data-pipeline-filter="inactiveDaysMax" type="number" min="0" step="1" value="${Utils.esc(_filters.inactiveDaysMax)}" placeholder="30" />
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ─── Kanban ─── */

  function _renderKanban(leads, stages, followupDays) {
    const groupedLeads = _groupLeadsByStage(leads);
    const cols = stages
      .map((s) => _renderColumn(s, groupedLeads.get(s.id) || [], followupDays))
      .join("");
    return `<div class="kanban-wrap"><div class="kanban">${cols}</div></div>`;
  }

  function _groupLeadsByStage(leads) {
    const grouped = new Map();
    leads.forEach((lead) => {
      const stageId = lead.stage || "";
      if (!grouped.has(stageId)) grouped.set(stageId, []);
      grouped.get(stageId).push(lead);
    });
    return grouped;
  }

  function _renderColumn(stage, stageLeads, followupDays) {
    const val = stageLeads.reduce((a, l) => a + (Number(l.ticket) || 0), 0);
    const cards = stageLeads
      .map((lead) => _renderCard(lead, followupDays))
      .join("");

    return `<div class="kanban-col"
        data-stage="${stage.id}"
        ondragover="PipelineView._onDragOver(event)"
        ondrop="PipelineView._onDrop(event,'${stage.id}')"
        ondragleave="PipelineView._onDragLeave(event)">
      <div class="kanban-col-header">
        <div>
          <span class="kanban-col-dot" style="background:${stage.color}"></span>
          <span class="kanban-col-title">${Utils.esc(stage.label)}</span>
          ${val > 0 ? `<div class="kanban-col-value">$${val.toLocaleString("es-AR")}</div>` : ""}
        </div>
        <span class="kanban-col-count">${stageLeads.length}</span>
      </div>
      <div class="drop-zone" id="dz-${stage.id}">
        ${cards || '<div style="height:30px"></div>'}
      </div>
    </div>`;
  }

  function _renderCard(lead, followupDays) {
    const days = Utils.daysSince(lead.lastActivity);
    const daysHtml =
      days > followupDays
        ? `<span class="alert-days">${days}d</span>`
        : `<span style="color:var(--text-tertiary);font-size:10px">${days}d</span>`;

    return `<div class="lead-card"
        draggable="true"
        data-id="${lead.id}"
        ondragstart="PipelineView._onDragStart(event,'${lead.id}')"
        ondragend="PipelineView._onDragEnd(event)"
        onclick="PipelineView._onCardClick('${lead.id}')">
      <div class="lead-card-name">${Utils.esc(lead.name || "Sin nombre")}</div>
      <div class="lead-card-nicho">${Utils.esc(lead.nicho || "—")}</div>
      <div class="lead-card-footer">
        <span class="lead-card-ticket">${lead.ticket ? Utils.fmtCurrency(lead.ticket) : ""}</span>
        <div class="lead-card-meta">
          ${Utils.tempDotHtml(lead.temperatura)}
          ${daysHtml}
        </div>
      </div>
    </div>`;
  }

  /* ─── Drag & Drop ─── */

  function _attachDragHandlers() {
    const searchEl = document.getElementById("pipeline-search");
    const clearSearchEl = document.getElementById("pipeline-search-clear");
    const toggleAdvancedEl = document.getElementById("pipeline-toggle-advanced");
    const clearFiltersEl = document.getElementById("pipeline-clear-filters");
    const exportBtn = document.getElementById("btn-export");
    const importBtn = document.getElementById("btn-import");

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

    document.querySelectorAll("[data-pipeline-filter]").forEach((field) => {
      const eventName = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(eventName, (e) => {
        const key = e.currentTarget.dataset.pipelineFilter;
        if (!key || !(key in _filters)) return;

        const value = e.currentTarget.value || "";
        if (_filters[key] === value) return;

        _filters = { ..._filters, [key]: value };
        _queueRender();
      });
    });

    if (exportBtn) exportBtn.addEventListener("click", _handleExport);
    if (importBtn) importBtn.addEventListener("click", _handleImport);
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
      const searchEl = document.getElementById("pipeline-search");
      if (searchEl) searchEl.focus();
    });
  }

  function _restoreSearchCursor(selectionStart, selectionEnd) {
    const searchEl = document.getElementById("pipeline-search");
    if (!searchEl) return;
    searchEl.focus();

    if (
      typeof selectionStart === "number" &&
      typeof selectionEnd === "number"
    ) {
      searchEl.setSelectionRange(selectionStart, selectionEnd);
    }
  }

  function _onDragStart(e, id) {
    _dragId = id;
    setTimeout(() => {
      const el = document.querySelector(`.lead-card[data-id="${id}"]`);
      if (el) el.classList.add("is-dragging");
    }, 0);
  }

  function _onDragEnd(e) {
    document
      .querySelectorAll(".lead-card")
      .forEach((el) => el.classList.remove("is-dragging"));
    document
      .querySelectorAll(".drop-zone")
      .forEach((el) => el.classList.remove("drop-zone--over"));
    _dragId = null;
  }

  function _onDragOver(e) {
    e.preventDefault();
    const dz = e.currentTarget.querySelector(".drop-zone");
    if (dz) dz.classList.add("drop-zone--over");
  }

  function _onDragLeave(e) {
    const dz = e.currentTarget.querySelector(".drop-zone");
    if (dz) dz.classList.remove("drop-zone--over");
  }

  function _onDrop(e, stageId) {
    e.preventDefault();
    document
      .querySelectorAll(".drop-zone")
      .forEach((el) => el.classList.remove("drop-zone--over"));
    if (!_dragId) return;
    const lead = Store.getById(_dragId);
    if (!lead || lead.stage === stageId) return;
    Store.moveToStage(_dragId, stageId);
    App.showToast(`Movido a ${Utils.stageLabel(stageId)}`);
    _dragId = null;
  }

  function _onCardClick(id) {
    if (_onOpenLead) _onOpenLead(id);
  }

  /* ─── Backup ─── */

  function _handleExport() {
    const filename = `velinex-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    Utils.downloadFile(Store.exportJSON(), filename);
    App.showToast("Backup exportado", "success");
  }

  function _handleImport() {
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
  }

  return {
    init,
    render,
    _onDragStart,
    _onDragEnd,
    _onDragOver,
    _onDragLeave,
    _onDrop,
    _onCardClick,
  };
})();
