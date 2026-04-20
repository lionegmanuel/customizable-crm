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

  /* ─── Tiempo ─── */

  function daysSince(isoString) {
    if (!isoString) return 0;
    return Math.floor((Date.now() - new Date(isoString).getTime()) / 864e5);
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

  function matchesLeadFilters(lead, filters = {}) {
    const eq = (value, selected) =>
      !selected || normalizeText(value) === normalizeText(selected);

    if (filters.stage && (lead.stage || "") !== filters.stage) return false;
    if (!eq(lead.nicho, filters.nicho)) return false;
    if (!eq(lead.subnicho, filters.subnicho)) return false;
    if (!eq(lead.canal, filters.canal)) return false;
    if (!eq(lead.ticketRango, filters.ticketRango)) return false;
    if (!eq(lead.temperatura, filters.temperatura)) return false;
    if (!eq(lead.prioridad, filters.prioridad)) return false;

    if (!eq(leadValue(lead, "city", "ciudad", "sourceCity"), filters.city))
      return false;
    if (
      !eq(
        leadValue(lead, "province", "provincia", "sourceProvince"),
        filters.province,
      )
    )
      return false;
    if (!eq(leadValue(lead, "country", "pais", "sourceCountry"), filters.country))
      return false;

    if (
      !eq(
        leadValue(lead, "targetCategory", "categoriaObjetivo", "categoria_objetivo_archivo"),
        filters.targetCategory,
      )
    )
      return false;
    if (!eq(leadValue(lead, "subCategory", "sub_nicho_categoria"), filters.subCategory))
      return false;
    if (!eq(leadValue(lead, "businessProfile", "perfil"), filters.businessProfile))
      return false;
    if (!eq(leadValue(lead, "companySize"), filters.companySize)) return false;
    if (!eq(leadValue(lead, "leadSource", "fuente"), filters.leadSource))
      return false;
    if (!eq(leadValue(lead, "decisionMakerRole"), filters.decisionMakerRole))
      return false;
    if (!eq(leadValue(lead, "alignmentStatus", "estado_alineacion"), filters.alignmentStatus))
      return false;

    const hasEmail = hasValue(leadValue(lead, "email", "correo", "sourceEmail"));
    if (!_matchesPresenceFilter(filters.hasEmail, hasEmail)) return false;

    const hasWhatsapp = hasValue(leadValue(lead, "whatsapp"));
    if (!_matchesPresenceFilter(filters.hasWhatsapp, hasWhatsapp)) return false;

    const hasPhone = hasValue(
      leadValue(lead, "phone", "telefono", "telefono_normalizado", "sourcePhone"),
    );
    if (!_matchesPresenceFilter(filters.hasPhone, hasPhone)) return false;

    const hasWebsite = hasValue(
      leadValue(lead, "website", "webProducto", "web_producto", "sourceWebsite"),
    );
    if (!_matchesPresenceFilter(filters.hasWebsite, hasWebsite)) return false;

    const hasLinkedin = hasValue(leadValue(lead, "linkedin"));
    if (!_matchesPresenceFilter(filters.hasLinkedin, hasLinkedin)) return false;

    const hasDecisionMaker = hasValue(
      leadValue(
        lead,
        "decisionMakerName",
        "decisionMakerRole",
        "decisionMakerEmail",
        "decisionMakerPhone",
      ),
    );
    if (!_matchesPresenceFilter(filters.hasDecisionMaker, hasDecisionMaker))
      return false;

    const score = _parseNumber(leadValue(lead, "commercialScore", "score", "sourceScore"));
    if (!_matchesMinMax(score, filters.scoreMin, filters.scoreMax)) return false;

    const potential = _parseNumber(leadValue(lead, "potentialScore", "potencial_1_5"));
    if (!_matchesMinMax(potential, filters.potentialMin, "")) return false;

    const difficulty = _parseNumber(leadValue(lead, "difficultyScore", "dificultad_1_5"));
    if (!_matchesMinMax(difficulty, "", filters.difficultyMax)) return false;

    const followers = _parseNumber(leadValue(lead, "seguidores"));
    if (!_matchesMinMax(followers, filters.followersMin, "")) return false;

    const inactiveDays = daysSince(lead.lastActivity);
    if (!_matchesMinMax(inactiveDays, filters.inactiveDaysMin, filters.inactiveDaysMax))
      return false;

    return true;
  }

  function collectLeadFilterOptions(leads = [], settings = Store.getSettings()) {
    const createMap = () => new Map();
    const fields = {
      nichos: createMap(),
      subnichos: createMap(),
      canales: createMap(),
      ticketRangos: createMap(),
      temperaturas: createMap(),
      prioridades: createMap(),
      city: createMap(),
      province: createMap(),
      country: createMap(),
      targetCategory: createMap(),
      subCategory: createMap(),
      businessProfile: createMap(),
      companySize: createMap(),
      leadSource: createMap(),
      decisionMakerRole: createMap(),
      alignmentStatus: createMap(),
    };

    const add = (map, value) => {
      const text = String(value || "").trim();
      if (!text) return;
      const normalized = normalizeText(text);
      if (!map.has(normalized)) map.set(normalized, text);
    };

    (settings.nichos || []).forEach((value) => add(fields.nichos, value));
    (settings.subnichos || []).forEach((value) => add(fields.subnichos, value));
    (settings.canales || []).forEach((value) => add(fields.canales, value));
    (settings.ticket || []).forEach((value) => add(fields.ticketRangos, value));
    (settings.temperaturas || []).forEach((value) => add(fields.temperaturas, value));
    (settings.prioridades || []).forEach((value) => add(fields.prioridades, value));

    leads.forEach((lead) => {
      add(fields.nichos, lead.nicho);
      add(fields.subnichos, lead.subnicho);
      add(fields.canales, lead.canal);
      add(fields.ticketRangos, lead.ticketRango);
      add(fields.temperaturas, lead.temperatura);
      add(fields.prioridades, lead.prioridad);

      add(fields.city, leadValue(lead, "city", "ciudad", "sourceCity"));
      add(fields.province, leadValue(lead, "province", "provincia", "sourceProvince"));
      add(fields.country, leadValue(lead, "country", "pais", "sourceCountry"));
      add(
        fields.targetCategory,
        leadValue(lead, "targetCategory", "categoriaObjetivo", "categoria_objetivo_archivo"),
      );
      add(fields.subCategory, leadValue(lead, "subCategory", "sub_nicho_categoria"));
      add(fields.businessProfile, leadValue(lead, "businessProfile", "perfil"));
      add(fields.companySize, leadValue(lead, "companySize"));
      add(fields.leadSource, leadValue(lead, "leadSource", "fuente"));
      add(fields.decisionMakerRole, leadValue(lead, "decisionMakerRole"));
      add(fields.alignmentStatus, leadValue(lead, "alignmentStatus", "estado_alineacion"));
    });

    const sortValues = (map) =>
      [...map.values()].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    return {
      stages: (settings.stages || []).map((stage) => ({ id: stage.id, label: stage.label })),
      nichos: sortValues(fields.nichos),
      subnichos: sortValues(fields.subnichos),
      canales: sortValues(fields.canales),
      ticketRangos: sortValues(fields.ticketRangos),
      temperaturas: sortValues(fields.temperaturas),
      prioridades: sortValues(fields.prioridades),
      city: sortValues(fields.city),
      province: sortValues(fields.province),
      country: sortValues(fields.country),
      targetCategory: sortValues(fields.targetCategory),
      subCategory: sortValues(fields.subCategory),
      businessProfile: sortValues(fields.businessProfile),
      companySize: sortValues(fields.companySize),
      leadSource: sortValues(fields.leadSource),
      decisionMakerRole: sortValues(fields.decisionMakerRole),
      alignmentStatus: sortValues(fields.alignmentStatus),
    };
  }

  return {
    fmtCurrency,
    fmtNumber,
    fmtDate,
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
  };
})();
