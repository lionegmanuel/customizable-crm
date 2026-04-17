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
  let _viewNeedsRender = _createDirtyMap();
  let _renderQueued = false;
  let _globalHandlersAttached = false;
  let _unsubscribeStore = null;

  function _createDirtyMap() {
    return Object.keys(VIEWS).reduce((acc, id) => {
      acc[id] = true;
      return acc;
    }, {});
  }

  function _markAllViewsDirty() {
    Object.keys(_viewNeedsRender).forEach((id) => {
      _viewNeedsRender[id] = true;
    });
  }

  function init() {
    AuthService.init({
      onLogin: (user) => _onUserLogin(user),
      onLogout: () => _onUserLogout(),
    });
  }

  async function _onUserLogin(user) {
    // datos actuales del usuario
    const chip = document.getElementById("user-chip");
    if (chip) {
      const name = user.displayName || user.email.split("@")[0];
      chip.innerHTML = `<span class="user-avatar">${name.charAt(0).toUpperCase()}</span><span class="user-name">${name}</span>`;
    }
    // inicializar store con datos del usuario
    await Store.init();
    _markAllViewsDirty();
    // inicializar componentes y UI
    _initComponents();
    _attachGlobalHandlers();
    _subscribeToStore();
    setView("pipeline");
  }

  function _onUserLogout() {
    if (_unsubscribeStore) {
      _unsubscribeStore();
      _unsubscribeStore = null;
    }

    Panel.reset();

    // limpieza del estado actual estado
    document.getElementById("view-pipeline").innerHTML = "";
    document.getElementById("view-leads").innerHTML = "";
    document.getElementById("view-metricas").innerHTML = "";
    document.getElementById("view-settings").innerHTML = "";
    document.getElementById("portal-confirm").innerHTML = "";

    _currentView = "pipeline";
    _viewNeedsRender = _createDirtyMap();
    _renderQueued = false;
  }

  function _initComponents() {
    const callbacks = {
      onOpenLead: (id) => Panel.openLead(id),
    };

    PipelineView.init(callbacks);
    LeadsView.init(callbacks);
    MetricsView.init(callbacks);
    Panel.init({
      onClose: () => {
        if (_viewNeedsRender[_currentView]) _queueRender();
      },
    });
    SettingsView.init();
  }

  function _attachGlobalHandlers() {
    if (_globalHandlersAttached) return;
    _globalHandlersAttached = true;

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
    //logout
    document.getElementById("btn-logout")?.addEventListener("click", () => {
      App.showConfirm("Cerrar sesión", "¿Querés cerrar sesión?", () =>
        AuthService.logout(),
      );
    });
  }

  function _subscribeToStore() {
    if (_unsubscribeStore) _unsubscribeStore();

    _unsubscribeStore = Store.subscribe(() => {
      // Cualquier cambio en el store re-renderiza la vista actual.
      // En SaaS con múltiples pestañas, aquí iría un WebSocket listener.
      _markAllViewsDirty();
      if (Panel.isOpen()) return;
      _queueRender();
    });
  }

  /* ─── Routing ─── */

  function setView(viewId) {
    if (!VIEWS[viewId]) return;
    const viewChanged = _currentView !== viewId;
    if (!viewChanged && !_viewNeedsRender[viewId]) return;
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

    if (viewChanged || _viewNeedsRender[_currentView]) _queueRender();
  }

  function _queueRender(force = false) {
    if (force) _viewNeedsRender[_currentView] = true;
    if (_renderQueued) return;

    _renderQueued = true;
    requestAnimationFrame(() => {
      _renderQueued = false;
      _renderCurrentView();
    });
  }

  function _renderCurrentView(force = false) {
    const view = VIEWS[_currentView];
    if (!view) return;
    if (!force && !_viewNeedsRender[_currentView]) return;

    view.component.render();
    _viewNeedsRender[_currentView] = false;
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
