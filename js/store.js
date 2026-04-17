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
  let _searchIndex = new Map();

  /* ─── Persistencia ─── */

  function _getCollection() {
    const user = AuthService.currentUser();
    if (!user) return null;
    return DB.collection("users").doc(user.uid).collection("leads");
  }

  async function _hydrate() {
    const col = _getCollection();
    if (!col) {
      _leads = [];
      _rebuildSearchIndex();
      _notify("init", null);
      return;
    }
    try {
      const snapshot = await col.orderBy("createdAt", "desc").get();
      _leads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("[Store] Firestore error, fallback localStorage:", e);
      const raw = localStorage.getItem(CRM_CONFIG.STORAGE_KEY);
      _leads = raw ? JSON.parse(raw) : [];
    }
    _rebuildSearchIndex();
    _notify("init", null);
  }

  async function _persist(changedLead = null) {
    const col = _getCollection();
    if (!col) return;
    try {
      if (changedLead) {
        // Upsert solo el lead modificado — más eficiente
        const { id, ...data } = changedLead;
        await col.doc(id).set(data);
      } else {
        // Sync completo (usado en import)
        const batch = DB.batch();
        _leads.forEach((l) => {
          const { id, ...data } = l;
          batch.set(col.doc(id), data);
        });
        await batch.commit();
      }
      localStorage.setItem(CRM_CONFIG.STORAGE_KEY, JSON.stringify(_leads));
    } catch (e) {
      console.error("[Store] Error Firestore:", e);
      localStorage.setItem(CRM_CONFIG.STORAGE_KEY, JSON.stringify(_leads));
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

  function _buildSearchText(lead) {
    return [
      lead.name,
      lead.nicho,
      lead.subnicho,
      lead.whatsapp,
      lead.instagram,
      lead.canal,
      lead.ticketRango,
      lead.stage,
    ]
      .filter((v) => v || v === 0)
      .map((v) => String(v).toLowerCase())
      .join(" ");
  }

  function _rebuildSearchIndex() {
    _searchIndex = new Map();
    _leads.forEach((lead) => {
      _searchIndex.set(lead.id, _buildSearchText(lead));
    });
  }

  function _syncSearchIndex(lead) {
    if (!lead || !lead.id) return;
    _searchIndex.set(lead.id, _buildSearchText(lead));
  }

  function _removeFromSearchIndex(id) {
    _searchIndex.delete(id);
  }

  /* ─── API pública ─── */

  async function init() {
    await _loadSettings();
    await _hydrate();
    //_notify("init", null); _hydrate ya llama a _notify("init") internamente
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
    _syncSearchIndex(lead);
    _persist({ ...lead });
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

    _syncSearchIndex(_leads[idx]);
    _persist({ ..._leads[idx] });
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
    _persist({ ..._leads[idx] });
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
    _removeFromSearchIndex(id);
    //eliminar el doc en firestore
    const col = _getCollection();
    if (col)
      col
        .doc(id)
        .delete()
        .catch((e) => console.error("[Store] delete error:", e));
    localStorage.setItem(CRM_CONFIG.STORAGE_KEY, JSON.stringify(_leads));
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
    _rebuildSearchIndex();
    _persist();
    _notify("import", { count: parsed.length });
    return parsed.length;
  }

  /* ─── Queries ─── */

  function query({ search = "", stage = "", nicho = "" } = {}) {
    const s = search.trim().toLowerCase();
    if (!s && !stage && !nicho) return [..._leads];

    if (!s) {
      return _leads.filter((l) => {
        const matchStage = !stage || l.stage === stage;
        const matchNicho = !nicho || l.nicho === nicho;
        return matchStage && matchNicho;
      });
    }

    return _leads.filter((l) => {
      const indexedSearch = _searchIndex.get(l.id);
      const searchable = indexedSearch || _buildSearchText(l);
      if (!indexedSearch) _searchIndex.set(l.id, searchable);

      const matchSearch = searchable.includes(s);
      const matchStage = !stage || l.stage === stage;
      const matchNicho = !nicho || l.nicho === nicho;
      return matchSearch && matchStage && matchNicho;
    });
  }
  async function _loadSettings() {
    const user = AuthService.currentUser();
    if (!user) {
      _settings = _defaultSettings();
      return;
    }
    try {
      const doc = await DB.collection("users")
        .doc(user.uid)
        .collection("settings")
        .doc("main")
        .get();
      _settings = doc.exists ? doc.data() : _defaultSettings();
    } catch (e) {
      const raw = localStorage.getItem(SETTINGS_KEY);
      _settings = raw ? JSON.parse(raw) : _defaultSettings();
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
      ticket: [...CRM_CONFIG.DEFAULTS.TICKET],
      followupDays: CRM_CONFIG.FOLLOWUP_THRESHOLD_DAYS,
    };
  }

  function getSettings() {
    const defaults = _defaultSettings();
    const merged = { ...defaults, ..._settings };
    // Garantiza que cada key del default exista aunque los settings guardados sean viejos
    Object.keys(defaults).forEach(key => {
      if (!merged[key] || (Array.isArray(merged[key]) && merged[key].length === 0)) {
        merged[key] = defaults[key];
      }
    });
    merged.stages = (merged.stages || defaults.stages).map(s => ({ ...s }));
    return merged;
  }

  function saveSettings(newSettings) {
    const defaults = _defaultSettings();
    _settings = { ...defaults, ..._settings, ...newSettings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(_settings));
    const user = AuthService.currentUser();
    if (user) {
      DB.collection("users")
        .doc(user.uid)
        .collection("settings")
        .doc("main")
        .set(_settings)
        .catch((e) => console.error("[Store] settings sync error:", e));
    }
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
