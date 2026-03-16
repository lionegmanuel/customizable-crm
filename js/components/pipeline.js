/**
 * Vista de tipo Kanban
 * Responsabilidad: renderizar y gestionar el pipeline de leads.
 * Lee datos de Store. Delega cambios de etapa a Store.
 * Comunica apertura de panel a App via callback (inversión de dependencia).
 */

const PipelineView = (() => {
  let _onOpenLead = null;
  let _dragId = null;

  /* ─── API pública ─── */

  function init({ onOpenLead }) {
    _onOpenLead = onOpenLead;
  }

  function render() {
    const el = document.getElementById("view-pipeline");
    if (!el) return;

    const leads = Store.getAll();
    const active = leads.filter(
      (l) =>
        !Store.getSettings().stages.find((s) => s.id === l.stage)?.terminal,
    );
    const pipelineVal = active.reduce((a, l) => a + (Number(l.ticket) || 0), 0);
    const alertCount = active.filter(
      (l) => Utils.daysSince(l.lastActivity) > Store.getSettings().followupDays,
    ).length;

    el.innerHTML = [
      _renderMetrics(leads, active, pipelineVal, alertCount),
      _renderToolbar(),
      _renderKanban(leads),
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

  function _renderToolbar() {
    return `<div class="actions-row" style="margin-bottom:12px">
      <span></span>
      <div style="display:flex;gap:8px">
        <button class="btn btn--sm" id="btn-export">↓ Exportar backup</button>
        <button class="btn btn--sm" id="btn-import">↑ Importar</button>
      </div>
    </div>`;
  }

  /* ─── Kanban ─── */

  function _renderKanban(leads) {
    const cols = Store.getSettings()
      .stages.map((s) => _renderColumn(s, leads))
      .join("");
    return `<div class="kanban-wrap"><div class="kanban">${cols}</div></div>`;
  }

  function _renderColumn(stage, leads) {
    const stageLeads = leads.filter((l) => l.stage === stage.id);
    const val = stageLeads.reduce((a, l) => a + (Number(l.ticket) || 0), 0);
    const cards = stageLeads.map(_renderCard).join("");

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

  function _renderCard(lead) {
    const days = Utils.daysSince(lead.lastActivity);
    const daysHtml =
      days > Store.getSettings().followupDays
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
    const exportBtn = document.getElementById("btn-export");
    const importBtn = document.getElementById("btn-import");
    if (exportBtn) exportBtn.addEventListener("click", _handleExport);
    if (importBtn) importBtn.addEventListener("click", _handleImport);
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
