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
  };
})();
