/**
 * Permite customizar todas las listas desplegables y etapas del pipeline.
 */

const SettingsView = (() => {
  let _activeSection = "stages";

  function init() {}

  function render() {
    const el = document.getElementById("view-settings");
    if (!el) return;
    const s = Store.getSettings();

    el.innerHTML = `
      <div style="max-width:760px;margin:0 auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div>
            <h2 style="font-size:18px;font-weight:600;margin-bottom:4px">Configuración</h2>
            <p style="font-size:13px;color:var(--text-secondary)">Personalizá las listas y etapas del pipeline.</p>
          </div>
          <button class="btn btn--sm btn--danger" id="settings-reset">Restaurar defaults</button>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
          ${[
            ["stages", "Etapas Kanban"],
            ["nichos", "Nichos"],
            ["subnichos", "Sub-nichos"],
            ["canales", "Canales"],
            ["prioridades", "Prioridades"],
            ["temperaturas", "Temperaturas"],
            ['ticket','Ticket'],
          ]
            .map(
              ([id, label]) =>
                `<button class="btn btn--sm ${_activeSection === id ? "btn--primary" : ""}"
               onclick="SettingsView._setSection('${id}')">${label}</button>`,
            )
            .join("")}
        </div>

        <div id="settings-section">
          ${_activeSection === "stages" ? _renderStages(s.stages) : _renderList(_activeSection, s[_activeSection])}
        </div>
      </div>`;

    _attachHandlers();
  }

  function _setSection(section) {
    _activeSection = section;
    render();
  }

  /* ─── Stages ─── */

  function _renderStages(stages) {
    const rows = stages
      .map(
        (s, i) => `
      <div style="display:grid;grid-template-columns:1fr 110px 90px 80px 86px 36px;gap:8px;align-items:center;margin-bottom:8px" data-stage-idx="${i}">
        <input class="stage-label-input" value="${Utils.esc(s.label)}" placeholder="Nombre de etapa" data-idx="${i}"/>
        <input class="stage-color-input" type="color" value="${s.color}" data-idx="${i}"
          style="height:36px;padding:2px 4px;cursor:pointer;border-radius:6px"/>
        <select class="stage-terminal-input" data-idx="${i}">
          <option value="false" ${!s.terminal ? "selected" : ""}>Activa</option>
          <option value="true"  ${s.terminal ? "selected" : ""}>Terminal</option>
        </select>
        <input class="stage-order-input" type="number" min="1" step="1" value="${i + 1}" data-idx="${i}"/>
        <div style="display:flex;gap:4px;justify-content:center">
          <button class="btn btn--sm stage-move-up" data-idx="${i}" ${i === 0 ? "disabled" : ""} aria-label="Mover etapa arriba">↑</button>
          <button class="btn btn--sm stage-move-down" data-idx="${i}" ${i === stages.length - 1 ? "disabled" : ""} aria-label="Mover etapa abajo">↓</button>
        </div>
        <button class="btn btn--sm btn--danger stage-delete" data-idx="${i}" ${stages.length <= 2 ? "disabled" : ""}>✕</button>
      </div>`,
      )
      .join("");

    return `
      <div class="panel-card" style="padding:16px">
        <div style="overflow-x:auto">
          <div style="min-width:560px">
            <div style="font-size:11px;color:var(--text-secondary);display:grid;grid-template-columns:1fr 110px 90px 80px 86px 36px;gap:8px;margin-bottom:8px;padding:0 0 8px;border-bottom:1px solid var(--border)">
              <span>Nombre</span><span>Color</span><span>Tipo</span><span>Orden</span><span>Mover</span><span></span>
            </div>
            <div id="stages-list">${rows}</div>
          </div>
        </div>
        <button class="btn btn--sm" id="stage-add" style="margin-top:12px">+ Agregar etapa</button>
      </div>
      <button class="btn btn--primary" id="settings-save-stages" style="margin-top:12px">Guardar etapas</button>`;
  }

  function _moveStage(fromIdx, toIdx) {
    const s = Store.getSettings();
    if (!Number.isInteger(fromIdx) || !Number.isInteger(toIdx)) return;
    if (toIdx < 0 || toIdx >= s.stages.length) return;

    const [moved] = s.stages.splice(fromIdx, 1);
    s.stages.splice(toIdx, 0, moved);
    s.stages.forEach((stage, index) => (stage.order = index));

    Store.saveSettings({ stages: s.stages });
    render();
  }

  /* ─── Listas simples ─── */

  function _renderList(field, items = []) {
    const labels = {
      nichos: "Nichos",
      subnichos: "Sub-nichos",
      canales: "Canales de contacto",
      prioridades: "Prioridades",
      temperaturas: "Temperaturas",
      ticket: "Ticket",
    };

    const rows = items
      .map(
        (val, i) => `
      <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center" data-list-idx="${i}">
        <input class="list-item-input" value="${Utils.esc(val)}" data-idx="${i}" style="flex:1"/>
        <button class="btn btn--sm btn--danger list-delete" data-idx="${i}" ${items.length <= 1 ? "disabled" : ""}>✕</button>
      </div>`,
      )
      .join("");

    return `
      <div class="panel-card" style="padding:16px">
        <div style="font-size:13px;font-weight:500;margin-bottom:12px">${labels[field] || field}</div>
        <div id="list-items">${rows}</div>
        <button class="btn btn--sm" id="list-add" style="margin-top:12px">+ Agregar opción</button>
      </div>
      <button class="btn btn--primary" id="settings-save-list" style="margin-top:12px" data-field="${field}">Guardar</button>`;
  }

  /* ─── Handlers ─── */

  function _attachHandlers() {
    document.getElementById("settings-reset")?.addEventListener("click", () => {
      App.showConfirm(
        "Restaurar configuración",
        "Esto restablecerá todas las listas y etapas a los valores originales.",
        () => {
          Store.resetSettings();
          render();
          App.showToast("Configuración restaurada");
        },
      );
    });

    // --- Stages ---
    document.getElementById("stage-add")?.addEventListener("click", () => {
      const s = Store.getSettings();
      const newId = "custom_" + Date.now().toString(36);
      s.stages.push({
        id: newId,
        label: "Nueva etapa",
        color: "#7c6fe0",
        order: s.stages.length,
        terminal: false,
      });
      Store.saveSettings({ stages: s.stages });
      render();
    });

    document.querySelectorAll(".stage-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.dataset.idx);
        const s = Store.getSettings();
        s.stages.splice(idx, 1);
        s.stages.forEach((st, i) => (st.order = i));
        Store.saveSettings({ stages: s.stages });
        render();
      });
    });

    document.querySelectorAll(".stage-move-up").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.dataset.idx);
        _moveStage(idx, idx - 1);
      });
    });

    document.querySelectorAll(".stage-move-down").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.dataset.idx);
        _moveStage(idx, idx + 1);
      });
    });

    document
      .getElementById("settings-save-stages")
      ?.addEventListener("click", () => {
        const s = Store.getSettings();
        const labels = document.querySelectorAll(".stage-label-input");
        const colors = document.querySelectorAll(".stage-color-input");
        const terms = document.querySelectorAll(".stage-terminal-input");
        const orderInputs = document.querySelectorAll(".stage-order-input");

        const nextStages = s.stages
          .map((stage, index) => {
            const orderValue = Number(orderInputs[index]?.value);
            const manualOrder = Number.isFinite(orderValue)
              ? Math.max(1, Math.floor(orderValue))
              : index + 1;

            return {
              ...stage,
              label: labels[index]?.value.trim() || stage.label,
              color: colors[index]?.value || stage.color,
              terminal: terms[index]?.value === "true",
              _manualOrder: manualOrder,
              _originalIndex: index,
            };
          })
          .sort(
            (a, b) =>
              a._manualOrder - b._manualOrder ||
              a._originalIndex - b._originalIndex,
          )
          .map((stage, index) => {
            const { _manualOrder, _originalIndex, ...cleanStage } = stage;
            return { ...cleanStage, order: index };
          });

        Store.saveSettings({ stages: nextStages });
        App.showToast("Etapas guardadas", "success");
        render();
      });

    // --- Listas simples ---
    document.getElementById("list-add")?.addEventListener("click", () => {
      const field =
        document.getElementById("settings-save-list")?.dataset.field;
      if (!field) return;
      const s = Store.getSettings();
      s[field].push("Nueva opción");
      Store.saveSettings({ [field]: s[field] });
      render();
    });

    document.querySelectorAll(".list-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.dataset.idx);
        const field =
          document.getElementById("settings-save-list")?.dataset.field;
        if (!field) return;
        const s = Store.getSettings();
        s[field].splice(idx, 1);
        Store.saveSettings({ [field]: s[field] });
        render();
      });
    });

    document
      .getElementById("settings-save-list")
      ?.addEventListener("click", (e) => {
        const field = e.currentTarget.dataset.field;
        const s = Store.getSettings();
        const items = document.querySelectorAll(".list-item-input");
        s[field] = Array.from(items)
          .map((el) => el.value.trim())
          .filter(Boolean);
        Store.saveSettings({ [field]: s[field] });
        App.showToast("Lista guardada", "success");
        render();
      });
  }

  return { init, render, _setSection };
})();
