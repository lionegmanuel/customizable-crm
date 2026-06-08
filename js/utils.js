/**
funciones de utilidad 100%
 */

const Utils = (() => {
  /* ─── Formateo ─── */

  function fmtCurrency(value, locale = "es-AR") {
    if (!value && value !== 0) return "—";
    return "$" + Number(value).toLocaleString(locale);
  }

  function fmtNumber(value, locale = "es-AR") {
    if (!value && value !== 0) return "—";
    return Number(value).toLocaleString(locale);
  }

  function fmtDate(isoString) {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function fmtDateTime(isoString) {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  }

  /* ─── Tiempo ─── */

  function daysSince(isoString) {
    if (!isoString) return 0;
    const start = new Date(isoString);
    const end = new Date();
    if (isNaN(start.getTime())) return 0;

    const msDiff = end.getTime() - start.getTime();
    if (msDiff <= 0) return 0;

    const totalDays = Math.floor(msDiff / 86400000);
    let weekendDays = 0;
    
    const currentDay = new Date(start);
    for (let i = 0; i < totalDays; i++) {
      currentDay.setDate(currentDay.getDate() + 1);
      const dayOfWeek = currentDay.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendDays++;
      }
    }
    
    return totalDays - weekendDays;
  }

  /* ─── Config lookups ─── */

  function stageById(id) {
    return Store.getSettings().stages.find((s) => s.id === id) || null;
  }

  function stageLabel(id) {
    return stageById(id)?.label || id;
  }

  function stageColor(id) {
    return stageById(id)?.color || "#8888a8";
  }

  /* ─── CSS helpers ─── */

  function tempDotClass(temperatura) {
    if (temperatura === "Caliente") return "temp-dot--caliente";
    if (temperatura === "Tibio") return "temp-dot--tibio";
    return "temp-dot--frio";
  }
  function ticketValue(ticket) {
    if (ticket === 'Bajo') return "low-ticket"
    if (ticket === 'Medio') return "mid-ticket"
    if (ticket === 'Alto') return "high-ticket"
    return 'unrecognizable';
  }
  function priorityClass(prioridad) {
    const map = { Alta: "alta", Media: "media", Baja: "baja" };
    return `priority-badge priority-badge--${map[prioridad] || "media"}`;
  }

  /* ─── Seguridad ─── */

  /**
   * Escapa HTML para prevenir XSS al insertar strings de usuario en el DOM.
   * Usar siempre que se construya HTML con datos del usuario.
   */
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ─── Generadores de HTML reutilizables ─── */

  /**
   * Genera un <select> con las opciones de un array de strings.
   * @param {string} id - id del elemento
   * @param {string[]} options - Lista de opciones
   * @param {string} selected - Valor actualmente seleccionado
   * @param {string} placeholder - Primer opción vacía
   */
  function buildSelect(
    id,
    options,
    selected = "",
    placeholder = "— Seleccioná —",
  ) {
    const opts = options
      .map(
        (o) =>
          `<option value="${esc(o)}" ${o === selected ? "selected" : ""}>${esc(o)}</option>`,
      )
      .join("");
    return `<select id="${id}"><option value="">${esc(placeholder)}</option>${opts}</select>`;
  }

  function buildStageSelect(id, selected = "") {
    const opts = Store.getSettings()
      .stages.map(
        (s) =>
          `<option value="${s.id}" ${s.id === selected ? "selected" : ""}>${esc(s.label)}</option>`,
      )
      .join("");
    return `<select id="${id}">${opts}</select>`;
  }

  function stageBadgeHtml(stageId) {
    const color = stageColor(stageId);
    return `<span class="stage-badge" style="background:${color}22;color:${color}">${stageLabel(stageId)}</span>`;
  }

  function tempDotHtml(temperatura) {
    if (!temperatura) return "";
    return `<span class="temp-dot ${tempDotClass(temperatura)}"></span>`;
  }
  function ticketHtml (ticket) {
    if (!ticket) return;
    return `<span class="ticket-value ${ticketValue(ticket)}"></span>`;
  }

  /* ─── Exportar/Importar UI ─── */

  function downloadFile(content, filename, mimeType = "application/json") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function pickJsonFile(onLoad) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => onLoad(ev.target.result);
      reader.readAsText(file);
    };
    input.click();
  }

  function hasValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function leadValue(lead, ...keys) {
    for (const key of keys) {
      const value = lead?.[key];
      if (hasValue(value)) return value;
    }
    return "";
  }

  function _parseNumber(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const raw = String(value || "").trim();
    if (!raw) return null;
    const cleaned = raw.replace(/[^\d.,-]/g, "");
    if (!cleaned) return null;

    const normalized = cleaned.includes(",") && !cleaned.includes(".")
      ? cleaned.replace(/,/g, ".")
      : cleaned.replace(/,/g, "");

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function _matchesMinMax(value, min, max) {
    const hasMin = hasValue(min);
    const hasMax = hasValue(max);
    if (!hasMin && !hasMax) return true;
    if (!Number.isFinite(value)) return false;

    const minVal = hasMin ? Number(min) : null;
    const maxVal = hasMax ? Number(max) : null;

    if (Number.isFinite(minVal) && value < minVal) return false;
    if (Number.isFinite(maxVal) && value > maxVal) return false;
    return true;
  }

  function _matchesPresenceFilter(filterValue, hasData) {
    if (!filterValue) return true;
    if (filterValue === "yes") return hasData;
    if (filterValue === "no") return !hasData;
    return true;
  }

  
  /* ---> DYNAMIC FILTER ENGINE <--- */
  
  const FILTER_CONFIG = {
    // Definimos qu campos van en los filtros rpidos y en los PRO, y su mapeo.
    // Tambin detectaremos automticamente los que no estn aqu.
    basic: ['stage', 'nicho', 'prioridad'],
    labels: {
      stage: 'Etapa', nicho: 'Nicho', subnicho: 'Subnicho', canal: 'Canal',
      ticketRango: 'Ticket', temperatura: 'Temperatura', prioridad: 'Prioridad',
      city: 'Ciudad', province: 'Provincia', country: 'Pas',
      targetCategory: 'Categora Objetivo', subCategory: 'Subcategora',
      businessProfile: 'Perfil de Negocio', companySize: 'Tamao Empresa',
      leadSource: 'Fuente del Lead', decisionMakerRole: 'Rol del Decisor',
      alignmentStatus: 'Estado de Alineacin'
    },
    ignore: new Set(['id', 'createdAt', 'lastActivity', 'timeline', 'tags', 'score', 'potentialScore', 'difficultyScore', 'seguidores'])
  };

  function getDynamicFilterKeys(leads, settings) {
    const keys = new Set(Object.keys(FILTER_CONFIG.labels));
    leads.forEach(lead => {
      Object.keys(lead).forEach(k => {
        if (!FILTER_CONFIG.ignore.has(k) && typeof lead[k] === 'string') {
          keys.add(k);
        }
      });
    });
    return Array.from(keys);
  }

  function collectLeadFilterOptions(leads = [], settings = Store.getSettings()) {
    const keys = getDynamicFilterKeys(leads, settings);
    const result = {
      _keys: keys,
      stages: (settings.stages || []).map((stage) => ({ id: stage.id, label: stage.label }))
    };

    keys.forEach(k => result[k] = new Map());

    const add = (map, value) => {
      const text = String(value || "").trim();
      if (!text) return;
      const normalized = normalizeText(text);
      if (!map.has(normalized)) map.set(normalized, text);
    };

    // Defaults from settings
    if (settings.nichos) settings.nichos.forEach(v => add(result.nicho, v));
    if (settings.subnichos) settings.subnichos.forEach(v => add(result.subnicho, v));
    if (settings.canales) settings.canales.forEach(v => add(result.canal, v));
    if (settings.ticket) settings.ticket.forEach(v => add(result.ticketRango, v));
    if (settings.temperaturas) settings.temperaturas.forEach(v => add(result.temperatura, v));
    if (settings.prioridades) settings.prioridades.forEach(v => add(result.prioridad, v));

    leads.forEach((lead) => {
      keys.forEach(k => {
        add(result[k], lead[k]);
      });
      // Fallbacks
      add(result.city, leadValue(lead, "city", "ciudad", "sourceCity"));
      add(result.province, leadValue(lead, "province", "provincia", "sourceProvince"));
      add(result.country, leadValue(lead, "country", "pais", "sourceCountry"));
      add(result.targetCategory, leadValue(lead, "targetCategory", "categoriaObjetivo", "categoria_objetivo_archivo"));
      add(result.subCategory, leadValue(lead, "subCategory", "sub_nicho_categoria"));
      add(result.businessProfile, leadValue(lead, "businessProfile", "perfil"));
      add(result.leadSource, leadValue(lead, "leadSource", "fuente"));
      add(result.alignmentStatus, leadValue(lead, "alignmentStatus", "estado_alineacion"));
    });

    const sortValues = (map) =>
      [...map.values()].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    keys.forEach(k => {
      result[k] = sortValues(result[k]);
    });

    return result;
  }

  function matchesLeadFilters(lead, filters = {}) {
    const eq = (value, selected) =>
      !selected || normalizeText(value) === normalizeText(selected);

    if (filters.stage && (lead.stage || "") !== filters.stage) return false;

    // Check all dynamic string filters
    for (const key of Object.keys(filters)) {
      if (!filters[key] || key === 'stage') continue; // empty or already checked
      
      let val = lead[key];
      // special fallbacks to maintain compatibility
      if (key === 'city') val = leadValue(lead, "city", "ciudad", "sourceCity");
      if (key === 'province') val = leadValue(lead, "province", "provincia", "sourceProvince");
      if (key === 'country') val = leadValue(lead, "country", "pais", "sourceCountry");
      if (key === 'targetCategory') val = leadValue(lead, "targetCategory", "categoriaObjetivo", "categoria_objetivo_archivo");
      if (key === 'subCategory') val = leadValue(lead, "subCategory", "sub_nicho_categoria");
      if (key === 'businessProfile') val = leadValue(lead, "businessProfile", "perfil");
      if (key === 'leadSource') val = leadValue(lead, "leadSource", "fuente");
      if (key === 'alignmentStatus') val = leadValue(lead, "alignmentStatus", "estado_alineacion");

      if (!eq(val, filters[key])) return false;
    }
    return true;
  }
  
  function getFilterLabel(key) {
    if (FILTER_CONFIG.labels[key]) return FILTER_CONFIG.labels[key];
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
  }

  return {
    fmtCurrency,
    fmtNumber,
    fmtDate,
    fmtDateTime,
    daysSince,
    stageById,
    stageLabel,
    stageColor,
    tempDotClass,
    ticketValue,
    priorityClass,
    esc,
    buildSelect,
    buildStageSelect,
    stageBadgeHtml,
    tempDotHtml,
    ticketHtml,
    downloadFile,
    pickJsonFile,
    hasValue,
    normalizeText,
    leadValue,
    matchesLeadFilters,
    collectLeadFilterOptions,
    getDynamicFilterKeys,
    getFilterLabel,
    FILTER_CONFIG,
  };
})();
