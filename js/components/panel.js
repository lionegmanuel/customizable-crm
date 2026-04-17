/**
 *Panel lateral de detalle/edición de lead
 * Responsabilidad: renderizar el panel de detalle, manejar el formulario de creación/edición y coordinar con Store para persistir cambios.
 */

const Panel = (() => {
  let _currentId = null;
  let _mode = null; // 'read' | 'edit' | 'new'
  let _onClose = null;

  const MODES = { READ: "read", EDIT: "edit", NEW: "new" };

  /* ─── API pública ─── */

  function init({ onClose }) {
    _onClose = onClose;
  }

  function openNew() {
    _currentId = null;
    _mode = MODES.NEW;
    _render({
      stage: "identificado",
      temperatura: "Frío",
      prioridad: "Media",
    });
  }

  function openLead(id) {
    const lead = Store.getById(id);
    if (!lead) return;
    _currentId = id;
    _mode = MODES.READ;
    _render(lead);
  }

  function _resetState() {
    const overlay = document.getElementById("portal-panel");
    if (overlay) overlay.innerHTML = "";
    _currentId = null;
    _mode = null;
  }

  function close() {
    const wasOpen = Boolean(_mode);
    _resetState();
    if (wasOpen && _onClose) _onClose();
  }

  function reset() {
    _resetState();
  }

  function isOpen() {
    return Boolean(_mode);
  }

  /* ─── Render ─── */

  function _render(lead) {
    const isNew = _mode === MODES.NEW;
    const isRead = _mode === MODES.READ;
    const isEdit = _mode === MODES.EDIT;

    const headerHtml = `
      <div class="panel-header">
        <div class="panel-header-left">
          <button class="close-btn" id="panel-close">✕</button>
          <div class="panel-title">${isNew ? "Nuevo lead" : Utils.esc(lead.name || "Lead")}</div>
        </div>
        ${
          isRead
            ? `<div style="display:flex;gap:6px">
          <button class="btn btn--sm" id="panel-btn-edit">Editar</button>
          <button class="btn btn--sm btn--danger" id="panel-btn-delete">Eliminar</button>
        </div>`
            : ""
        }
      </div>`;

    const bodyHtml = isRead ? _renderReadBody(lead) : _renderFormBody(lead);
    const footerHtml = isRead
      ? _renderReadFooter(lead)
      : _renderFormFooter(isNew);

    document.getElementById("portal-panel").innerHTML = `
      <div class="overlay" id="panel-overlay">
        <div class="panel" id="panel-inner">
          ${headerHtml}
          <div class="panel-body">${bodyHtml}</div>
          <div class="panel-footer">${footerHtml}</div>
        </div>
      </div>`;

    _attachHandlers(lead, isNew, isRead);
  }

  /* ─── Read view ─── */

  function _renderReadBody(lead) {
    const fields = [
      ["Etapa", Utils.stageBadgeHtml(lead.stage)],
      [
        "WhatsApp",
        lead.whatsapp
          ? `<a class="btn btn--sm btn--wa" href="https://wa.me/${lead.whatsapp.replace(/\D/g, "")}" target="_blank" rel="noopener">${Utils.esc(lead.whatsapp)}</a>`
          : "—",
      ],
      [
        "Instagram",
        lead.instagram
          ? `<a class="btn btn--sm btn--ig" href="https://instagram.com/${lead.instagram.replace("@", "")}" target="_blank" rel="noopener">@${Utils.esc(lead.instagram.replace("@", ""))}</a>`
          : "—",
      ],
      ["Nicho", Utils.esc(lead.nicho || "—")],
      ["Sub-nicho", Utils.esc(lead.subnicho || "—")],
      ["Canal", Utils.esc(lead.canal || "—")],
      ["Ticket estimado", lead.ticket ? Utils.fmtCurrency(lead.ticket) : "—"],
      ["Ticket", Utils.esc(lead.ticketRango || "—")],
      [
        "Temperatura",
        lead.temperatura
          ? `<span style="display:flex;align-items:center;gap:6px">${Utils.tempDotHtml(lead.temperatura)}${Utils.esc(lead.temperatura)}</span>`
          : "—",
      ],
      [
        "Prioridad",
        lead.prioridad
          ? `<span class="${Utils.priorityClass(lead.prioridad)}">${Utils.esc(lead.prioridad)}</span>`
          : "—",
      ],
      ["Seguidores", lead.seguidores ? Utils.fmtNumber(lead.seguidores) : "—"],
      ["Señales", Utils.esc(lead.señales || "—")],
      ["Creado", Utils.fmtDate(lead.createdAt)],
      ["Última actividad", Utils.fmtDate(lead.lastActivity)],
    ];

    const rows = fields
      .map(
        ([k, v]) =>
          `<div class="read-row">
        <span class="read-key">${Utils.esc(k)}</span>
        <span class="read-val">${v}</span>
      </div>`,
      )
      .join("");

    const notesHtml = lead.notas
      ? `<div class="section-title">Notas</div>
         <div style="font-size:13px;color:var(--text-secondary);line-height:1.6">
           ${Utils.esc(lead.notas).replace(/\n/g, "<br>")}
         </div>`
      : "";

    const tlItems = (lead.timeline || [])
      .slice()
      .reverse()
      .map(
        (t) =>
          `<div class="tl-item">
        <div class="tl-dot"></div>
        <div>
          <div class="tl-content">${Utils.esc(t.text)}</div>
          <div class="tl-date">${Utils.fmtDate(t.date)}</div>
        </div>
      </div>`,
      )
      .join("");

    const tlHtml = tlItems
      ? `<div class="section-title">Actividad (${(lead.timeline || []).length})</div>
         <div class="timeline">${tlItems}</div>`
      : "";

    return rows + notesHtml + tlHtml;
  }

  /* ─── Form view ─── */

  function _renderFormBody(lead) {
    return `
      <div class="field-group">
        <label class="field-label" for="f-name">Nombre / Negocio *</label>
        <input id="f-name" value="${Utils.esc(lead.name || "")}" placeholder="Ej: Coach Lucía Pérez"/>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-wa">WhatsApp</label>
          <input id="f-wa" value="${Utils.esc(lead.whatsapp || "")}" placeholder="+54 9 11 2345-6789"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-ig">Instagram</label>
          <input id="f-ig" value="${Utils.esc(lead.instagram || "")}" placeholder="@usuario"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-nicho">Nicho</label>
          ${Utils.buildSelect("f-nicho", Store.getSettings().nichos, lead.nicho || "")}
        </div>
        <div class="field-group">
          <label class="field-label" for="f-sub">Sub-nicho</label>
          ${Utils.buildSelect("f-sub", Store.getSettings().subnichos, lead.subnicho || "")}
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-canal">Canal de contacto</label>
          ${Utils.buildSelect("f-canal", Store.getSettings().canales, lead.canal || "")}
        </div>
        <div class="field-group">
          <label class="field-label" for="f-ticket">Ticket estimado (USD)</label>
          <input id="f-ticket" type="number" value="${lead.ticket || ""}" placeholder="1500"/>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label" for="f-ticket-rango">Ticket</label>
        <select id="f-ticket-rango">
          <option value="">— Seleccionar —</option>
          ${(Store.getSettings().ticket || []).map(t =>
            `<option value="${t}" ${lead?.ticketRango === t ? 'selected' : ''}>${t}</option>`
          ).join('')}
        </select>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-temp">Temperatura</label>
          ${Utils.buildSelect("f-temp", Store.getSettings().temperaturas, lead.temperatura || "Frío")}
        </div>
        <div class="field-group">
          <label class="field-label" for="f-prio">Prioridad</label>
          ${Utils.buildSelect("f-prio", Store.getSettings().prioridades, lead.prioridad || "Media")}
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-seg">Seguidores aprox.</label>
          <input id="f-seg" type="number" value="${lead.seguidores || ""}" placeholder="15000"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-stage">Etapa</label>
          ${Utils.buildStageSelect("f-stage", lead.stage || "identificado")}
        </div>
      </div>
      <div class="field-group">
        <label class="field-label" for="f-senales">Señales de demanda</label>
        <input id="f-senales" value="${Utils.esc(lead.señales || "")}" placeholder="Comentarios 'info', ads activos, CTA a WA..."/>
      </div>
      <div class="field-group">
        <label class="field-label" for="f-notas">Notas</label>
        <textarea id="f-notas">${Utils.esc(lead.notas || "")}</textarea>
      </div>`;
  }

  /* ─── Footers ─── */

  function _renderReadFooter(lead) {
    const stageOpts = Store.getSettings()
      .stages.map(
        (s) =>
          `<option value="${s.id}" ${lead.stage === s.id ? "selected" : ""}>${Utils.esc(s.label)}</option>`,
      )
      .join("");

    return `
      <select class="stage-select-footer" id="panel-stage-select">${stageOpts}</select>
      <button class="btn btn--sm" id="panel-btn-activity">+ Actividad</button>`;
  }

  function _renderFormFooter(isNew) {
    return `
      <button class="btn btn--primary" id="panel-btn-save">Guardar</button>
      <button class="btn" id="panel-btn-cancel">${isNew ? "Cancelar" : "Cancelar"}</button>`;
  }

  /* ─── Handlers ─── */

  function _attachHandlers(lead, isNew, isRead) {
    const get = (id) => document.getElementById(id);

    get("panel-overlay")?.addEventListener("click", (e) => {
      if (e.target === get("panel-overlay")) close();
    });

    get("panel-close")?.addEventListener("click", close);

    if (isRead) {
      get("panel-btn-edit")?.addEventListener("click", () => {
        _mode = MODES.EDIT;
        _render(Store.getById(_currentId));
      });

      get("panel-btn-delete")?.addEventListener("click", () => {
        App.showConfirm(
          "¿Eliminar este lead?",
          "Esta acción no se puede deshacer.",
          () => {
            Store.remove(_currentId);
            App.showToast("Lead eliminado");
            close();
          },
        );
      });

      get("panel-stage-select")?.addEventListener("change", (e) => {
        const updated = Store.moveToStage(_currentId, e.target.value);
        if (updated) {
          App.showToast(
            `Etapa → ${Utils.stageLabel(e.target.value)}`,
            "success",
          );
          _render(updated);
        }
      });

      get("panel-btn-activity")?.addEventListener("click", () => {
        const text = prompt("¿Qué acción realizaste con este lead?");
        if (!text?.trim()) return;
        const updated = Store.addActivity(_currentId, text.trim());
        if (updated) {
          App.showToast("Actividad registrada", "success");
          _render(updated);
        }
      });
    }

    if (!isRead) {
      get("panel-btn-save")?.addEventListener("click", () => _save(isNew));

      get("panel-btn-cancel")?.addEventListener("click", () => {
        if (isNew) {
          close();
        } else {
          _mode = MODES.READ;
          _render(Store.getById(_currentId));
        }
      });
    }
  }

  /* ─── Save ─── */

  function _save(isNew) {
    const get = (id) => document.getElementById(id);
    const name = (get("f-name")?.value || "").trim();

    if (!name) {
      App.showToast("El nombre es obligatorio", "danger");
      return;
    }

    const data = {
      name,
      whatsapp: (get("f-wa")?.value || "").trim(),
      instagram: (get("f-ig")?.value || "").trim(),
      nicho: get("f-nicho")?.value || "",
      subnicho: get("f-sub")?.value || "",
      canal: get("f-canal")?.value || "",
      ticket: get("f-ticket")?.value || "",
      ticketRango: get("f-ticket-rango")?.value || "",
      temperatura: get("f-temp")?.value || "Frío",
      prioridad: get("f-prio")?.value || "Media",
      seguidores: get("f-seg")?.value || "",
      stage: get("f-stage")?.value || "identificado",
      señales: (get("f-senales")?.value || "").trim(),
      notas: (get("f-notas")?.value || "").trim(),
    };

    if (isNew) {
      const lead = Store.create(data);
      _currentId = lead.id;
      _mode = MODES.READ;
      App.showToast("Lead creado", "success");
      _render(Store.getById(_currentId));
    } else {
      const lead = Store.update(_currentId, data);
      _mode = MODES.READ;
      App.showToast("Lead actualizado", "success");
      _render(lead);
    }
  }

  return { init, openNew, openLead, close, reset, isOpen };
})();
