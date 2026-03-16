/**
 * Responsabilidades:
 * - Inicializar todos los módulos en el orden correcto.
 * - Gestionar el routing entre vistas (tabs).
 * - Exponer utilidades UI globales: showToast, showConfirm.
 * - Suscribirse a Store para re-renderizar cuando cambian los datos.
 * NO contiene lógica de negocio ni de renderizado de componentes.
 * Es el único módulo con conocimiento de todos los demás.
 * Escalabilidad:
 * - Reemplazar el routing por hash-router o history API.
 * - Reemplazar Store.init() por autenticación + fetch de datos del tenant.
 */

const App = (() => {
  const VIEWS = {
    pipeline: { id: "pipeline", component: PipelineView },
    leads: { id: "leads", component: LeadsView },
    metricas: { id: "metricas", component: MetricsView },
    settings: { id: "settings", component: SettingsView },
  };

  let _currentView = "pipeline";

  /* ─── Bootstrap ─── */

  function init() {
    _initComponents();
    _attachGlobalHandlers();
    _subscribeToStore();
    Store.init();
  }

  function _initComponents() {
    const callbacks = {
      onOpenLead: (id) => Panel.openLead(id),
    };

    PipelineView.init(callbacks);
    LeadsView.init(callbacks);
    MetricsView.init(callbacks);
    Panel.init({ onClose: () => _renderCurrentView() });
    SettingsView.init();
  }

  function _attachGlobalHandlers() {
    // Tabs
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        if (tab) setView(tab);
      });
    });

    // Nuevo lead
    document.getElementById("btn-new-lead")?.addEventListener("click", () => {
      Panel.openNew();
    });

    // Teclado: Escape cierra panel
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") Panel.close();
    });
  }

  function _subscribeToStore() {
    Store.subscribe((event) => {
      // Cualquier cambio en el store re-renderiza la vista actual.
      // En SaaS con múltiples pestañas, aquí iría un WebSocket listener.
      _renderCurrentView();
    });
  }

  /* ─── Routing ─── */

  function setView(viewId) {
    if (!VIEWS[viewId]) return;
    _currentView = viewId;

    // Actualizar tabs
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === viewId);
      btn.setAttribute("aria-selected", btn.dataset.tab === viewId);
    });

    // Mostrar/ocultar vistas
    Object.keys(VIEWS).forEach((id) => {
      const el = document.getElementById(`view-${id}`);
      if (el) el.classList.toggle("view--active", id === viewId);
    });

    _renderCurrentView();
  }

  function _renderCurrentView() {
    const view = VIEWS[_currentView];
    if (view) view.component.render();
  }

  /* ─── Global UI utilities ─── */

  /**
   * Muestra un toast en la esquina inferior derecha.
   * @param {string} message
   * @param {'success'|'danger'|''} type
   */
  function showToast(message, type = "") {
    const wrap = document.getElementById("portal-toast");
    if (!wrap) return;

    const el = document.createElement("div");
    el.className = `toast${type ? " toast--" + type : ""}`;
    el.textContent = message;

    wrap.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  /**
   * Muestra un diálogo de confirmación modal.
   * @param {string} title
   * @param {string} message
   * @param {Function} onConfirm
   */
  function showConfirm(title, message, onConfirm) {
    const container = document.getElementById("portal-confirm");
    if (!container) return;

    container.innerHTML = `
      <div class="confirm-overlay">
        <div class="confirm-box">
          <h3>${Utils.esc(title)}</h3>
          <p>${Utils.esc(message)}</p>
          <div class="confirm-btns">
            <button class="btn" id="confirm-cancel">Cancelar</button>
            <button class="btn btn--danger" id="confirm-ok">Confirmar</button>
          </div>
        </div>
      </div>`;

    document.getElementById("confirm-cancel").addEventListener("click", () => {
      container.innerHTML = "";
    });

    document.getElementById("confirm-ok").addEventListener("click", () => {
      container.innerHTML = "";
      onConfirm();
    });
  }

  return {
    init,
    setView,
    showToast,
    showConfirm,
  };
})();

/* ─── Entry point ─── */
document.addEventListener("DOMContentLoaded", () => App.init());
