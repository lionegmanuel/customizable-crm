/**
 Capa de datos del CRM
 *
Responsabilidad única: gestionar el estado de los leads y su persistencia. Abstrae el mecanismo de almacenamiento para que los componentes no dependan de localStorage directamente.
 */
let _settings = null;
const SETTINGS_KEY = "velinex_crm_settings_v1";

const Store = (() => {
  /* ─── Estado privado ─── */
  let _leads = [];
  let _subscribers = [];

  /* ─── Persistencia ─── */

  function _hydrate() {
    try {
      const raw = localStorage.getItem(CRM_CONFIG.STORAGE_KEY);
      if (raw) _leads = JSON.parse(raw);
    } catch (e) {
      console.warn("[Store] Error al cargar datos:", e);
      _leads = [];
    }
  }

  function _persist() {
    try {
      localStorage.setItem(CRM_CONFIG.STORAGE_KEY, JSON.stringify(_leads));
    } catch (e) {
      console.error("[Store] Error al guardar. Storage lleno?", e);
      _notify("error", "Error al guardar. Almacenamiento lleno.");
    }
  }

  /* ─── Pub/Sub ─── */

  function _notify(event, payload) {
    _subscribers.forEach((fn) => fn(event, payload));
  }

  function subscribe(fn) {
    _subscribers.push(fn);
    return () => {
      _subscribers = _subscribers.filter((s) => s !== fn);
    };
  }

  /* ─── Utilidades internas ─── */

  function _uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function _now() {
    return new Date().toISOString();
  }

  function _getById(id) {
    return _leads.find((l) => l.id === id) || null;
  }

  /* ─── API pública ─── */

  function init() {
    _loadSettings();
    _hydrate();
    _notify("init", null);
  }

  function getAll() {
    return [..._leads];
  }

  function getById(id) {
    const lead = _getById(id);
    return lead ? { ...lead } : null;
  }

  /**
   * Crea un nuevo lead.
   * @param {Object} data - Campos del lead (sin id, createdAt, lastActivity, timeline).
   * @returns {Object} - Lead creado.
   */
  function create(data) {
    const now = _now();
    const lead = {
      id: _uid(),
      stage: "identificado",
      temperatura: "Frío",
      prioridad: "Media",
      ...data,
      createdAt: now,
      lastActivity: now,
      timeline: [{ text: "Lead creado", date: now }],
    };
    _leads.unshift(lead);
    _persist();
    _notify("create", lead);
    return { ...lead };
  }

  /**
   * Actualiza campos de un lead existente.
   * @param {string} id
   * @param {Object} changes - Solo los campos a modificar.
   * @returns {Object|null} - Lead actualizado o null si no existe.
   */
  function update(id, changes) {
    const idx = _leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;

    const now = _now();
    const prev = _leads[idx];

    _leads[idx] = { ...prev, ...changes, lastActivity: now };

    if (changes.stage && changes.stage !== prev.stage) {
      _leads[idx].timeline = [
        ...(_leads[idx].timeline || []),
        { text: `Etapa → "${Utils.stageLabel(changes.stage)}"`, date: now },
      ];
    }

    _persist();
    _notify("update", { ..._leads[idx] });
    return { ..._leads[idx] };
  }

  /**
   * Cambia la etapa de un lead (atajo de update).
   */
  function moveToStage(id, stageId) {
    return update(id, { stage: stageId });
  }

  /**
   * Agrega una entrada al timeline sin cambiar otros campos.
   */
  function addActivity(id, text) {
    const idx = _leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    const now = _now();
    _leads[idx].timeline = [
      ...(_leads[idx].timeline || []),
      { text, date: now },
    ];
    _leads[idx].lastActivity = now;
    _persist();
    _notify("activity", { id, text });
    return { ..._leads[idx] };
  }

  /**
   * Elimina un lead por id.
   */
  function remove(id) {
    const existed = _leads.some((l) => l.id === id);
    if (!existed) return false;
    _leads = _leads.filter((l) => l.id !== id);
    _persist();
    _notify("remove", { id });
    return true;
  }

  /* ─── Backup / Restore ─── */

  function exportJSON() {
    return JSON.stringify(_leads, null, 2);
  }

  function importJSON(jsonString) {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) throw new Error("Formato inválido");
    _leads = parsed;
    _persist();
    _notify("import", { count: parsed.length });
    return parsed.length;
  }

  /* ─── Queries ─── */

  function query({ search = "", stage = "", nicho = "" } = {}) {
    const s = search.toLowerCase();
    return _leads.filter((l) => {
      const matchSearch =
        !s ||
        (l.name || "").toLowerCase().includes(s) ||
        (l.nicho || "").toLowerCase().includes(s) ||
        (l.whatsapp || "").includes(s) ||
        (l.instagram || "").toLowerCase().includes(s);
      const matchStage = !stage || l.stage === stage;
      const matchNicho = !nicho || l.nicho === nicho;
      return matchSearch && matchStage && matchNicho;
    });
  }
  function _loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      _settings = raw ? JSON.parse(raw) : _defaultSettings();
    } catch (e) {
      _settings = _defaultSettings();
    }
  }

  function _defaultSettings() {
    return {
      stages: CRM_CONFIG.DEFAULTS.STAGES.map((s) => ({ ...s })),
      nichos: [...CRM_CONFIG.DEFAULTS.NICHOS],
      subnichos: [...CRM_CONFIG.DEFAULTS.SUBNICHOS],
      canales: [...CRM_CONFIG.DEFAULTS.CANALES],
      prioridades: [...CRM_CONFIG.DEFAULTS.PRIORIDADES],
      temperaturas: [...CRM_CONFIG.DEFAULTS.TEMPERATURAS],
      followupDays: CRM_CONFIG.FOLLOWUP_THRESHOLD_DAYS,
    };
  }

  function getSettings() {
    return { ..._settings, stages: _settings.stages.map((s) => ({ ...s })) };
  }

  function saveSettings(newSettings) {
    _settings = { ..._settings, ...newSettings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(_settings));
    _notify("settings", null);
  }

  function resetSettings() {
    _settings = _defaultSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(_settings));
    _notify("settings", null);
  }
  return {
    init,
    subscribe,
    getAll,
    getById,
    create,
    update,
    moveToStage,
    addActivity,
    remove,
    exportJSON,
    importJSON,
    query,
    getSettings,
    saveSettings,
    resetSettings,
  };
})();
