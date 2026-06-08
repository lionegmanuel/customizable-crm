/**
 * Vista tabla de leads. Renderiza la tabla con búsqueda y filtros. Estado de filtros local al componente (no global).
 */

const LeadsView = (() => {
  let _onOpenLead = null;
  let _search = "";
  let _filters = _defaultFilters();
  let _showAdvanced = false;
  let _renderTimer = null;
  let _limit = 50;
  const PAGE_SIZE = 50;

  function _defaultFilters() {
    return { stage: "" };
  }

  function _queueRender(postRender = null, delay = 0) {
    if (_renderTimer) clearTimeout(_renderTimer);
    _renderTimer = setTimeout(() => {
      _renderTimer = null;
      render();
      if (typeof postRender === "function") postRender();
    }, delay);
  }

  function _clearSearch() {
    if (!_search.trim()) return;
    if (_renderTimer) {
      clearTimeout(_renderTimer);
      _renderTimer = null;
    }
    _search = "";
    _limit = PAGE_SIZE;
    _queueRender(() => {
      const el = document.getElementById("leads-search");
      if (el) el.focus();
    });
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

    const paginated = filtered.slice(0, _limit);

    if (document.getElementById("leads-table-body")) {
      // Actualizar toolbar con opciones siempre frescas
      const filtersSlot = document.getElementById("leads-filters-slot");
      if (filtersSlot) filtersSlot.innerHTML = _renderFilters(options, activeFilters);
      
      const toolbarSlot = document.getElementById("leads-toolbar-slot");
      if (toolbarSlot) toolbarSlot.innerHTML = _renderToolbar(filtered.length);
      
      _attachToolbarHandlers();
      
      // Actualización parcial muy rápida sin destruir el DOM principal
      document.getElementById("leads-table-body").innerHTML = paginated.length 
        ? paginated.map((lead) => _renderRow(lead, settings.followupDays)).join("")
        : `<tr><td colspan="9"><div class="empty"><strong>Sin resultados</strong> Probá ajustar los filtros de búsqueda.</div></td></tr>`;
      
      _updateLoadMoreBtn(filtered.length);
      return;
    }

    el.innerHTML = [
      `<div id="leads-filters-slot">${_renderFilters(options, activeFilters)}</div>`,
      `<div id="leads-toolbar-slot">${_renderToolbar(filtered.length)}</div>`,
      _renderTable(paginated, settings.followupDays),
      _renderLoadMoreBtn(filtered.length)
    ].join("");

    _attachHandlers();
    _attachToolbarHandlers();
  }

  function _updateLoadMoreBtn(totalFiltered) {
    const btn = document.getElementById("leads-load-more");
    const container = document.getElementById("leads-load-more-container");
    if (!btn || !container) return;
    
    if (_limit >= totalFiltered) {
      container.style.display = "none";
    } else {
      container.style.display = "flex";
      btn.textContent = `Cargar más (Mostrando ${_limit} de ${totalFiltered})`;
    }
  }

  function _renderLoadMoreBtn(totalFiltered) {
    if (_limit >= totalFiltered) return '<div id="leads-load-more-container" style="display:none; padding:16px; justify-content:center"><button class="btn btn--sm" id="leads-load-more"></button></div>';
    return `<div id="leads-load-more-container" style="display:flex; padding:16px; justify-content:center">
      <button class="btn btn--sm" id="leads-load-more">Cargar más (Mostrando ${_limit} de ${totalFiltered})</button>
    </div>`;
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

    let basicSelects = `
      <select data-leads-filter="stage" id="leads-filter-stage">
        <option value="">Todas las etapas</option>
        ${stageOpts}
      </select>
    `;

    let advancedSelects = '';

    (options._keys || []).forEach(key => {
      if (key === 'stage') return;
      const opts = _renderOptionTags(options[key], _filters[key]);
      const label = Utils.getFilterLabel(key);
      const isBasic = Utils.FILTER_CONFIG.basic.includes(key);

      const selectHtml = `
        <select data-leads-filter="${key}" id="leads-filter-${key}">
          <option value="">Todos los ${label.toLowerCase()}</option>
          ${opts}
        </select>
      `;

      if (isBasic) {
        basicSelects += selectHtml;
      } else {
        advancedSelects += `
          <div class="filter-field">
            <label>${label}</label>
            <select data-leads-filter="${key}"><option value="">Todos</option>${opts}</select>
          </div>
        `;
      }
    });

    const advancedLabel = _showAdvanced
      ? `Ocultar filtros PRO (${activeFilters})`
      : `Filtros PRO (${activeFilters})`;

    return `<div class="filters-card">
      <div class="search-row search-row--tight">
        <div class="search-input-wrap">
          <input
            id="leads-search"
            placeholder="Buscar..."
            value="${Utils.esc(_search)}"
          />
          ${_search.trim() ? '<button class="search-clear-btn" id="leads-search-clear" type="button">×</button>' : ""}
        </div>
      </div>

      <div class="search-row search-row--tight">
        ${basicSelects}
        <button class="btn btn--sm" id="leads-toggle-advanced" type="button">${advancedLabel}</button>
        <button class="btn btn--sm" id="leads-clear-filters" type="button" ${activeFilters ? "" : "disabled"}>Limpiar filtros</button>
      </div>

      <div class="filters-advanced ${_showAdvanced ? "filters-advanced--open" : ""}" id="leads-advanced-wrap">
        <div class="filters-grid">
          ${advancedSelects}
        </div>
      </div>
    </div>`;
  }

  function _renderToolbar(count) {
    return `<div class="actions-row">
      <span class="text-muted text-sm" id="leads-toolbar-count">${count} lead${count !== 1 ? "s" : ""}</span>
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

    return `<div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:20%">Nombre / Empresa</th>
            <th style="width:15%">Nicho</th>
            <th style="width:12%">Etapa</th>
            <th style="width:8%">WA</th>
            <th style="width:15%">Ticket</th>
            <th style="width:12%">Temperatura</th>
            <th style="width:10%">Prioridad</th>
            <th style="width:8%">Inact.</th>
          </tr>
        </thead>
        <tbody id="leads-table-body">
          ${rows}
        </tbody>
      </table>
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
    const loadMoreBtn = document.getElementById("leads-load-more");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        _limit += PAGE_SIZE;
        render();
      });
    }
  }

  function _attachToolbarHandlers() {
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
        _limit = PAGE_SIZE;
        _queueRender(() => _restoreSearchCursor(selectionStart, selectionEnd), 300);
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
        _limit = PAGE_SIZE;
        render();
      });

    document.querySelectorAll("[data-leads-filter]").forEach((field) => {
      const eventName = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(eventName, (e) => {
        const key = e.currentTarget.dataset.leadsFilter;
        if (!key) return;

        const value = e.currentTarget.value || "";
        if (_filters[key] === value) return;

        _filters = { ..._filters, [key]: value };
        _limit = PAGE_SIZE;
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
                _limit = PAGE_SIZE;
                App.showToast(`${count} leads importados`, "success");
              } catch (err) {
                App.showToast("Archivo inválido", "danger");
              }
            },
          );
        });
      });
  }

  function _restoreSearchCursor(start, end) {
    const searchEl = document.getElementById("leads-search");
    if (searchEl) {
      searchEl.focus();
      searchEl.setSelectionRange(start, end);
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
