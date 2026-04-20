/**
 *Panel lateral de detalle/edición de lead
 * Responsabilidad: renderizar el panel de detalle, manejar el formulario de creación/edición y coordinar con Store para persistir cambios.
 */

const Panel = (() => {
  let _currentId = null;
  let _mode = null; // 'read' | 'edit' | 'new'
  let _onClose = null;

  const MODES = { READ: "read", EDIT: "edit", NEW: "new" };

  function _hasValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  }

  function _leadValue(lead, ...keys) {
    for (const key of keys) {
      const value = lead?.[key];
      if (_hasValue(value)) return value;
    }
    return "";
  }

  function _safeHttpUrl(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) return "";

    const normalized = /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`;

    try {
      const parsed = new URL(normalized);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
      return parsed.href;
    } catch (e) {
      return "";
    }
  }

  function _formatReadLink(rawValue, label = "Abrir") {
    const href = _safeHttpUrl(rawValue);
    if (!href) return _hasValue(rawValue) ? Utils.esc(String(rawValue)) : "—";
    return `<a href="${Utils.esc(href)}" target="_blank" rel="noopener">${Utils.esc(label)}</a>`;
  }

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
    const whatsapp = String(
      _leadValue(lead, "whatsapp", "telefono_normalizado", "telefono", "sourcePhone"),
    ).trim();
    const whatsappDigits = whatsapp.replace(/\D/g, "");

    const instagramRaw = String(_leadValue(lead, "instagram")).trim();
    const instagramHandle = instagramRaw
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/^@/, "")
      .split(/[/?#]/)[0];

    const email = String(_leadValue(lead, "email", "correo", "sourceEmail")).trim();
    const phone = String(
      _leadValue(lead, "phone", "telefono", "telefono_normalizado", "sourcePhone"),
    ).trim();
    const website = _leadValue(lead, "website", "webProducto", "web_producto", "sourceWebsite");
    const linkedin = _leadValue(lead, "linkedin");

    const address = _leadValue(lead, "address", "direccion", "sourceAddress");
    const city = _leadValue(lead, "city", "ciudad", "sourceCity");
    const province = _leadValue(lead, "province", "provincia", "sourceProvince");
    const country = _leadValue(lead, "country", "pais", "sourceCountry");
    const postalCode = _leadValue(lead, "postalCode");

    const businessProfile = _leadValue(lead, "businessProfile", "perfil");
    const targetCategory = _leadValue(
      lead,
      "targetCategory",
      "categoriaObjetivo",
      "categoria_objetivo_archivo",
    );
    const subCategory = _leadValue(lead, "subCategory", "sub_nicho_categoria");
    const slogan = _leadValue(lead, "slogan");
    const businessDescription = _leadValue(lead, "businessDescription", "descripcion");
    const infoDetail = _leadValue(lead, "infoDetail", "info_linea");
    const companySize = _leadValue(lead, "companySize");
    const employeeCount = _leadValue(lead, "employeeCount");
    const branchCount = _leadValue(lead, "branchCount");

    const commercialScore = _leadValue(lead, "commercialScore", "score", "sourceScore");
    const potentialScore = _leadValue(lead, "potentialScore", "potencial_1_5");
    const difficultyScore = _leadValue(lead, "difficultyScore", "dificultad_1_5");
    const reachScore = _leadValue(lead, "reachScore", "alcance_1_5");
    const replicabilityScore = _leadValue(lead, "replicabilityScore", "replicabilidad_1_5");
    const speedScore = _leadValue(lead, "speedScore", "velocidad_caso_exito_1_5");
    const alignmentScore = _leadValue(lead, "alignmentScore", "alineacion_bases_1_5");
    const contactCompleteness = _leadValue(lead, "contactCompleteness", "completitud_contacto_0_5");
    const alignmentStatus = _leadValue(lead, "alignmentStatus", "estado_alineacion");

    const decisionMakerName = _leadValue(lead, "decisionMakerName");
    const decisionMakerRole = _leadValue(lead, "decisionMakerRole");
    const decisionMakerEmail = _leadValue(lead, "decisionMakerEmail");
    const decisionMakerPhone = _leadValue(lead, "decisionMakerPhone");
    const painPoint = _leadValue(lead, "painPoint");
    const currentSolution = _leadValue(lead, "currentSolution");
    const recommendedService = _leadValue(
      lead,
      "recommendedService",
      "servicio_producto_recomendado",
    );
    const recommendedOffer = _leadValue(
      lead,
      "recommendedOffer",
      "oferta_promesa_recomendada",
    );

    const leadSource = _leadValue(lead, "leadSource", "fuente");
    const sourceRecordUrl = _leadValue(lead, "sourceRecordUrl", "ficha_url");
    const sourceSearchUrl = _leadValue(lead, "sourceSearchUrl", "fuente_url_busqueda");
    const sourceDataUrl = _leadValue(
      lead,
      "sourceDataUrl",
      "sourceJsonUrl",
      "fuente_url_json",
    );
    const sourceCategorySlug = _leadValue(
      lead,
      "sourceCategorySlug",
      "categoria_slug",
    );
    const sourceCitySlug = _leadValue(lead, "sourceCitySlug", "ciudad_slug");
    const extractedAt = _leadValue(lead, "extractedAt", "fecha_extraccion");
    const externalId = _leadValue(lead, "externalId", "sourceId");
    const sourcePriority = _leadValue(lead, "sourcePriority");
    const latitude = _leadValue(lead, "latitude", "latitud", "sourceLat");
    const longitude = _leadValue(lead, "longitude", "longitud", "sourceLng");

    const renderRows = (rows) =>
      rows
        .map(
          ([key, value]) =>
            `<div class="read-row">
          <span class="read-key">${Utils.esc(key)}</span>
          <span class="read-val">${value}</span>
        </div>`,
        )
        .join("");

    const formatDateValue = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "—";
      return Number.isNaN(new Date(raw).getTime()) ? Utils.esc(raw) : Utils.fmtDate(raw);
    };

    const rowsMain = renderRows([
      ["Etapa", Utils.stageBadgeHtml(lead.stage)],
      ["Canal", Utils.esc(lead.canal || "—")],
      [
        "WhatsApp",
        whatsappDigits
          ? `<a class="btn btn--sm btn--wa" href="https://wa.me/${whatsappDigits}" target="_blank" rel="noopener">${Utils.esc(whatsapp)}</a>`
          : whatsapp
            ? Utils.esc(whatsapp)
            : "—",
      ],
      ["Teléfono principal", phone ? Utils.esc(phone) : "—"],
      [
        "Correo electrónico",
        email
          ? `<a href="mailto:${Utils.esc(email)}">${Utils.esc(email)}</a>`
          : "—",
      ],
      [
        "Instagram",
        instagramHandle
          ? `<a class="btn btn--sm btn--ig" href="https://instagram.com/${Utils.esc(instagramHandle)}" target="_blank" rel="noopener">@${Utils.esc(instagramHandle)}</a>`
          : "—",
      ],
      ["LinkedIn", _formatReadLink(linkedin, "Perfil de LinkedIn")],
      ["Sitio web", _formatReadLink(website, "Sitio web")],
      ["Nicho", Utils.esc(lead.nicho || "—")],
      ["Sub-nicho", Utils.esc(lead.subnicho || "—")],
      ["Categoría objetivo", _hasValue(targetCategory) ? Utils.esc(String(targetCategory)) : "—"],
      ["Subcategoría objetivo", _hasValue(subCategory) ? Utils.esc(String(subCategory)) : "—"],
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
    ]);

    const rowsBusiness = renderRows([
      ["Dirección", _hasValue(address) ? Utils.esc(String(address)) : "—"],
      ["Ciudad", _hasValue(city) ? Utils.esc(String(city)) : "—"],
      ["Provincia / Estado", _hasValue(province) ? Utils.esc(String(province)) : "—"],
      ["País", _hasValue(country) ? Utils.esc(String(country)) : "—"],
      ["Código postal", _hasValue(postalCode) ? Utils.esc(String(postalCode)) : "—"],
      ["Perfil comercial", _hasValue(businessProfile) ? Utils.esc(String(businessProfile)) : "—"],
      ["Tamaño de empresa", _hasValue(companySize) ? Utils.esc(String(companySize)) : "—"],
      ["Cantidad de empleados", _hasValue(employeeCount) ? Utils.esc(String(employeeCount)) : "—"],
      ["Cantidad de sucursales", _hasValue(branchCount) ? Utils.esc(String(branchCount)) : "—"],
      ["Slogan", _hasValue(slogan) ? Utils.esc(String(slogan)) : "—"],
      ["Descripción del negocio", _hasValue(businessDescription) ? Utils.esc(String(businessDescription)) : "—"],
      ["Información adicional", _hasValue(infoDetail) ? Utils.esc(String(infoDetail)) : "—"],
    ]);

    const rowsScore = renderRows([
      ["Score comercial", _hasValue(commercialScore) ? Utils.esc(String(commercialScore)) : "—"],
      ["Potencial (1 a 5)", _hasValue(potentialScore) ? Utils.esc(String(potentialScore)) : "—"],
      ["Dificultad de cierre (1 a 5)", _hasValue(difficultyScore) ? Utils.esc(String(difficultyScore)) : "—"],
      ["Alcance (1 a 5)", _hasValue(reachScore) ? Utils.esc(String(reachScore)) : "—"],
      ["Replicabilidad (1 a 5)", _hasValue(replicabilityScore) ? Utils.esc(String(replicabilityScore)) : "—"],
      ["Velocidad caso de éxito (1 a 5)", _hasValue(speedScore) ? Utils.esc(String(speedScore)) : "—"],
      ["Alineación con base (1 a 5)", _hasValue(alignmentScore) ? Utils.esc(String(alignmentScore)) : "—"],
      ["Completitud de contacto (0 a 5)", _hasValue(contactCompleteness) ? Utils.esc(String(contactCompleteness)) : "—"],
      ["Estado de alineación", _hasValue(alignmentStatus) ? Utils.esc(String(alignmentStatus)) : "—"],
    ]);

    const rowsStrategy = renderRows([
      ["Nombre del decisor", _hasValue(decisionMakerName) ? Utils.esc(String(decisionMakerName)) : "—"],
      ["Rol del decisor", _hasValue(decisionMakerRole) ? Utils.esc(String(decisionMakerRole)) : "—"],
      ["Correo del decisor", _hasValue(decisionMakerEmail) ? Utils.esc(String(decisionMakerEmail)) : "—"],
      ["Teléfono del decisor", _hasValue(decisionMakerPhone) ? Utils.esc(String(decisionMakerPhone)) : "—"],
      ["Dolor principal", _hasValue(painPoint) ? Utils.esc(String(painPoint)) : "—"],
      ["Solución actual", _hasValue(currentSolution) ? Utils.esc(String(currentSolution)) : "—"],
      ["Servicio recomendado", _hasValue(recommendedService) ? Utils.esc(String(recommendedService)) : "—"],
      ["Oferta recomendada", _hasValue(recommendedOffer) ? Utils.esc(String(recommendedOffer)) : "—"],
    ]);

    const rowsTrace = renderRows([
      ["Fuente del lead", _hasValue(leadSource) ? Utils.esc(String(leadSource)) : "—"],
      ["URL de ficha", _formatReadLink(sourceRecordUrl, "Abrir ficha")],
      ["URL de búsqueda", _formatReadLink(sourceSearchUrl, "Abrir búsqueda")],
      ["URL de datos", _formatReadLink(sourceDataUrl, "Abrir datos")],
      ["Categoría técnica", _hasValue(sourceCategorySlug) ? Utils.esc(String(sourceCategorySlug)) : "—"],
      ["Ciudad técnica", _hasValue(sourceCitySlug) ? Utils.esc(String(sourceCitySlug)) : "—"],
      ["Fecha de extracción", formatDateValue(extractedAt)],
      ["Identificador externo", _hasValue(externalId) ? Utils.esc(String(externalId)) : "—"],
      ["Prioridad de fuente", _hasValue(sourcePriority) ? Utils.esc(String(sourcePriority)) : "—"],
      ["Latitud", _hasValue(latitude) ? Utils.esc(String(latitude)) : "—"],
      ["Longitud", _hasValue(longitude) ? Utils.esc(String(longitude)) : "—"],
      ["Creado", Utils.fmtDate(lead.createdAt)],
      ["Última actividad", Utils.fmtDate(lead.lastActivity)],
    ]);

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

    return (
      rowsMain +
      `<div class="section-title">Empresa y ubicación</div>${rowsBusiness}` +
      `<div class="section-title">Scoring comercial</div>${rowsScore}` +
      `<div class="section-title">Estrategia y decisión</div>${rowsStrategy}` +
      `<div class="section-title">Trazabilidad</div>${rowsTrace}` +
      notesHtml +
      tlHtml
    );
  }

  /* ─── Form view ─── */

  function _renderFormBody(lead) {
    const settings = Store.getSettings();
    const email = _leadValue(lead, "email", "correo", "sourceEmail");
    const phone = _leadValue(lead, "phone", "telefono", "telefono_normalizado", "sourcePhone");
    const website = _leadValue(lead, "website", "webProducto", "web_producto", "sourceWebsite");
    const linkedin = _leadValue(lead, "linkedin");

    const address = _leadValue(lead, "address", "direccion", "sourceAddress");
    const city = _leadValue(lead, "city", "ciudad", "sourceCity");
    const province = _leadValue(lead, "province", "provincia", "sourceProvince");
    const country = _leadValue(lead, "country", "pais", "sourceCountry");
    const postalCode = _leadValue(lead, "postalCode");
    const latitude = _leadValue(lead, "latitude", "latitud", "sourceLat");
    const longitude = _leadValue(lead, "longitude", "longitud", "sourceLng");

    const businessProfile = _leadValue(lead, "businessProfile", "perfil");
    const targetCategory = _leadValue(
      lead,
      "targetCategory",
      "categoriaObjetivo",
      "categoria_objetivo_archivo",
    );
    const subCategory = _leadValue(lead, "subCategory", "sub_nicho_categoria");
    const slogan = _leadValue(lead, "slogan");
    const businessDescription = _leadValue(lead, "businessDescription", "descripcion");
    const infoDetail = _leadValue(lead, "infoDetail", "info_linea");
    const companySize = _leadValue(lead, "companySize");
    const employeeCount = _leadValue(lead, "employeeCount");
    const branchCount = _leadValue(lead, "branchCount");

    const commercialScore = _leadValue(lead, "commercialScore", "score", "sourceScore");
    const potentialScore = _leadValue(lead, "potentialScore", "potencial_1_5");
    const difficultyScore = _leadValue(lead, "difficultyScore", "dificultad_1_5");
    const reachScore = _leadValue(lead, "reachScore", "alcance_1_5");
    const replicabilityScore = _leadValue(lead, "replicabilityScore", "replicabilidad_1_5");
    const speedScore = _leadValue(lead, "speedScore", "velocidad_caso_exito_1_5");
    const alignmentScore = _leadValue(lead, "alignmentScore", "alineacion_bases_1_5");
    const contactCompleteness = _leadValue(lead, "contactCompleteness", "completitud_contacto_0_5");
    const alignmentStatus = _leadValue(lead, "alignmentStatus", "estado_alineacion");

    const decisionMakerName = _leadValue(lead, "decisionMakerName");
    const decisionMakerRole = _leadValue(lead, "decisionMakerRole");
    const decisionMakerEmail = _leadValue(lead, "decisionMakerEmail");
    const decisionMakerPhone = _leadValue(lead, "decisionMakerPhone");
    const painPoint = _leadValue(lead, "painPoint");
    const currentSolution = _leadValue(lead, "currentSolution");
    const recommendedService = _leadValue(
      lead,
      "recommendedService",
      "servicio_producto_recomendado",
    );
    const recommendedOffer = _leadValue(
      lead,
      "recommendedOffer",
      "oferta_promesa_recomendada",
    );

    const leadSource = _leadValue(lead, "leadSource", "fuente");
    const sourceRecordUrl = _leadValue(lead, "sourceRecordUrl", "ficha_url");
    const sourceSearchUrl = _leadValue(lead, "sourceSearchUrl", "fuente_url_busqueda");
    const sourceDataUrl = _leadValue(
      lead,
      "sourceDataUrl",
      "sourceJsonUrl",
      "fuente_url_json",
    );
    const sourceCategorySlug = _leadValue(
      lead,
      "sourceCategorySlug",
      "categoria_slug",
    );
    const sourceCitySlug = _leadValue(lead, "sourceCitySlug", "ciudad_slug");
    const extractedAt = _leadValue(lead, "extractedAt", "fecha_extraccion");
    const externalId = _leadValue(lead, "externalId", "sourceId");
    const sourcePriority = _leadValue(lead, "sourcePriority");

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
          <label class="field-label" for="f-phone">Teléfono principal</label>
          <input id="f-phone" value="${Utils.esc(String(phone || ""))}" placeholder="Ej: +54 11 5263 9825"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-email">Correo electrónico</label>
          <input id="f-email" type="email" value="${Utils.esc(String(email || ""))}" placeholder="contacto@empresa.com"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-ig">Instagram</label>
          <input id="f-ig" value="${Utils.esc(lead.instagram || "")}" placeholder="@usuario"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-linkedin">LinkedIn</label>
          <input id="f-linkedin" value="${Utils.esc(String(linkedin || ""))}" placeholder="https://www.linkedin.com/company/..."/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-web">Sitio web</label>
          <input id="f-web" value="${Utils.esc(String(website || ""))}" placeholder="https://empresa.com"/>
        </div>
      </div>

      <div class="section-title">Clasificación comercial</div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-nicho">Nicho</label>
          ${Utils.buildSelect("f-nicho", settings.nichos, lead.nicho || "")}
        </div>
        <div class="field-group">
          <label class="field-label" for="f-sub">Sub-nicho</label>
          ${Utils.buildSelect("f-sub", settings.subnichos, lead.subnicho || "")}
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-target-cat">Categoría objetivo</label>
          <input id="f-target-cat" value="${Utils.esc(String(targetCategory || ""))}" placeholder="Ej: Gastronomía con fuerte presencia digital"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-subcat">Subcategoría objetivo</label>
          <input id="f-subcat" value="${Utils.esc(String(subCategory || ""))}" placeholder="Ej: Bares y cafeterías"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-business-profile">Perfil comercial</label>
          <input id="f-business-profile" value="${Utils.esc(String(businessProfile || ""))}" placeholder="Ej: CORE"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-company-size">Tamaño de empresa</label>
          <input id="f-company-size" value="${Utils.esc(String(companySize || ""))}" placeholder="Ej: PyME (11-50)"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-employees">Cantidad de empleados</label>
          <input id="f-employees" type="number" value="${Utils.esc(String(employeeCount || ""))}" placeholder="25"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-branches">Cantidad de sucursales</label>
          <input id="f-branches" type="number" value="${Utils.esc(String(branchCount || ""))}" placeholder="3"/>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label" for="f-slogan">Slogan</label>
        <input id="f-slogan" value="${Utils.esc(String(slogan || ""))}" placeholder="Mensaje principal de marca"/>
      </div>
      <div class="field-group">
        <label class="field-label" for="f-description">Descripción del negocio</label>
        <textarea id="f-description" placeholder="Resumen del negocio, propuesta y contexto comercial">${Utils.esc(String(businessDescription || ""))}</textarea>
      </div>
      <div class="field-group">
        <label class="field-label" for="f-info-detail">Información adicional</label>
        <textarea id="f-info-detail" placeholder="Detalle útil para prospección y personalización del outreach">${Utils.esc(String(infoDetail || ""))}</textarea>
      </div>

      <div class="section-title">Pipeline y prioridad</div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-canal">Canal de contacto</label>
          ${Utils.buildSelect("f-canal", settings.canales, lead.canal || "")}
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
          ${(settings.ticket || []).map(t =>
            `<option value="${t}" ${lead?.ticketRango === t ? 'selected' : ''}>${t}</option>`
          ).join('')}
        </select>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-temp">Temperatura</label>
          ${Utils.buildSelect("f-temp", settings.temperaturas, lead.temperatura || "Frío")}
        </div>
        <div class="field-group">
          <label class="field-label" for="f-prio">Prioridad</label>
          ${Utils.buildSelect("f-prio", settings.prioridades, lead.prioridad || "Media")}
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

      <div class="section-title">Scoring de prospección</div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-score-commercial">Score comercial</label>
          <input id="f-score-commercial" type="number" step="0.1" value="${Utils.esc(String(commercialScore || ""))}" placeholder="0-100"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-score-potential">Potencial (1 a 5)</label>
          <input id="f-score-potential" type="number" min="1" max="5" step="1" value="${Utils.esc(String(potentialScore || ""))}" placeholder="4"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-score-difficulty">Dificultad de cierre (1 a 5)</label>
          <input id="f-score-difficulty" type="number" min="1" max="5" step="1" value="${Utils.esc(String(difficultyScore || ""))}" placeholder="2"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-score-reach">Alcance (1 a 5)</label>
          <input id="f-score-reach" type="number" min="1" max="5" step="1" value="${Utils.esc(String(reachScore || ""))}" placeholder="3"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-score-replicability">Replicabilidad (1 a 5)</label>
          <input id="f-score-replicability" type="number" min="1" max="5" step="1" value="${Utils.esc(String(replicabilityScore || ""))}" placeholder="5"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-score-speed">Velocidad caso de éxito (1 a 5)</label>
          <input id="f-score-speed" type="number" min="1" max="5" step="1" value="${Utils.esc(String(speedScore || ""))}" placeholder="4"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-score-alignment">Alineación con base (1 a 5)</label>
          <input id="f-score-alignment" type="number" min="1" max="5" step="1" value="${Utils.esc(String(alignmentScore || ""))}" placeholder="5"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-score-contact">Completitud de contacto (0 a 5)</label>
          <input id="f-score-contact" type="number" min="0" max="5" step="1" value="${Utils.esc(String(contactCompleteness || ""))}" placeholder="3"/>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label" for="f-alignment-status">Estado de alineación</label>
        <input id="f-alignment-status" value="${Utils.esc(String(alignmentStatus || ""))}" placeholder="Ej: Alineado con ICP"/>
      </div>

      <div class="section-title">Decisor y estrategia</div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-decision-name">Nombre del decisor</label>
          <input id="f-decision-name" value="${Utils.esc(String(decisionMakerName || ""))}" placeholder="Ej: Ana Pérez"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-decision-role">Rol del decisor</label>
          <input id="f-decision-role" value="${Utils.esc(String(decisionMakerRole || ""))}" placeholder="Ej: Directora Comercial"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-decision-email">Correo del decisor</label>
          <input id="f-decision-email" type="email" value="${Utils.esc(String(decisionMakerEmail || ""))}" placeholder="ana@empresa.com"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-decision-phone">Teléfono del decisor</label>
          <input id="f-decision-phone" value="${Utils.esc(String(decisionMakerPhone || ""))}" placeholder="+54 9 ..."/>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label" for="f-pain-point">Dolor principal detectado</label>
        <textarea id="f-pain-point" placeholder="Principal problema de negocio o cuello de botella comercial">${Utils.esc(String(painPoint || ""))}</textarea>
      </div>
      <div class="field-group">
        <label class="field-label" for="f-current-solution">Solución actual</label>
        <textarea id="f-current-solution" placeholder="Qué herramienta, proceso o equipo usa actualmente">${Utils.esc(String(currentSolution || ""))}</textarea>
      </div>
      <div class="field-group">
        <label class="field-label" for="f-recommended-service">Servicio recomendado</label>
        <textarea id="f-recommended-service" placeholder="Propuesta sugerida según contexto y potencial">${Utils.esc(String(recommendedService || ""))}</textarea>
      </div>
      <div class="field-group">
        <label class="field-label" for="f-recommended-offer">Oferta recomendada</label>
        <textarea id="f-recommended-offer" placeholder="Promesa u oferta específica para outreach y cierre">${Utils.esc(String(recommendedOffer || ""))}</textarea>
      </div>

      <div class="section-title">Ubicación y trazabilidad</div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-address">Dirección</label>
          <input id="f-address" value="${Utils.esc(String(address || ""))}" placeholder="Calle y número"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-city">Ciudad</label>
          <input id="f-city" value="${Utils.esc(String(city || ""))}" placeholder="Ej: Olivos"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-province">Provincia / Estado</label>
          <input id="f-province" value="${Utils.esc(String(province || ""))}" placeholder="Ej: Buenos Aires"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-country">País</label>
          <input id="f-country" value="${Utils.esc(String(country || ""))}" placeholder="Ej: Argentina"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-postal">Código postal</label>
          <input id="f-postal" value="${Utils.esc(String(postalCode || ""))}" placeholder="Ej: 1636"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-lead-source">Fuente del lead</label>
          <input id="f-lead-source" value="${Utils.esc(String(leadSource || ""))}" placeholder="Ej: Páginas Amarillas"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-lat">Latitud</label>
          <input id="f-lat" value="${Utils.esc(String(latitude || ""))}" placeholder="-34.50894"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-lng">Longitud</label>
          <input id="f-lng" value="${Utils.esc(String(longitude || ""))}" placeholder="-58.49173"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-source-record-url">URL de ficha</label>
          <input id="f-source-record-url" value="${Utils.esc(String(sourceRecordUrl || ""))}" placeholder="https://..."/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-source-search-url">URL de búsqueda</label>
          <input id="f-source-search-url" value="${Utils.esc(String(sourceSearchUrl || ""))}" placeholder="https://..."/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-source-data-url">URL de datos</label>
          <input id="f-source-data-url" value="${Utils.esc(String(sourceDataUrl || ""))}" placeholder="https://..."/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-extracted-at">Fecha de extracción</label>
          <input id="f-extracted-at" value="${Utils.esc(String(extractedAt || ""))}" placeholder="2026-04-15T10:08:28.313Z"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-external-id">Identificador externo</label>
          <input id="f-external-id" value="${Utils.esc(String(externalId || ""))}" placeholder="ID del directorio o dataset"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-source-priority">Prioridad de fuente</label>
          <input id="f-source-priority" type="number" value="${Utils.esc(String(sourcePriority || ""))}" placeholder="7"/>
        </div>
      </div>
      <div class="field-row">
        <div class="field-group">
          <label class="field-label" for="f-source-category-slug">Categoría técnica</label>
          <input id="f-source-category-slug" value="${Utils.esc(String(sourceCategorySlug || ""))}" placeholder="bares-y-cafeterias"/>
        </div>
        <div class="field-group">
          <label class="field-label" for="f-source-city-slug">Ciudad técnica</label>
          <input id="f-source-city-slug" value="${Utils.esc(String(sourceCitySlug || ""))}" placeholder="olivos"/>
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
      phone: (get("f-phone")?.value || "").trim(),
      email: (get("f-email")?.value || "").trim(),
      instagram: (get("f-ig")?.value || "").trim(),
      linkedin: (get("f-linkedin")?.value || "").trim(),
      website: (get("f-web")?.value || "").trim(),
      nicho: get("f-nicho")?.value || "",
      subnicho: get("f-sub")?.value || "",
      targetCategory: (get("f-target-cat")?.value || "").trim(),
      subCategory: (get("f-subcat")?.value || "").trim(),
      businessProfile: (get("f-business-profile")?.value || "").trim(),
      companySize: (get("f-company-size")?.value || "").trim(),
      employeeCount: (get("f-employees")?.value || "").trim(),
      branchCount: (get("f-branches")?.value || "").trim(),
      slogan: (get("f-slogan")?.value || "").trim(),
      businessDescription: (get("f-description")?.value || "").trim(),
      infoDetail: (get("f-info-detail")?.value || "").trim(),
      canal: get("f-canal")?.value || "",
      ticket: get("f-ticket")?.value || "",
      ticketRango: get("f-ticket-rango")?.value || "",
      temperatura: get("f-temp")?.value || "Frío",
      prioridad: get("f-prio")?.value || "Media",
      seguidores: get("f-seg")?.value || "",
      stage: get("f-stage")?.value || "identificado",

      commercialScore: (get("f-score-commercial")?.value || "").trim(),
      potentialScore: (get("f-score-potential")?.value || "").trim(),
      difficultyScore: (get("f-score-difficulty")?.value || "").trim(),
      reachScore: (get("f-score-reach")?.value || "").trim(),
      replicabilityScore: (get("f-score-replicability")?.value || "").trim(),
      speedScore: (get("f-score-speed")?.value || "").trim(),
      alignmentScore: (get("f-score-alignment")?.value || "").trim(),
      contactCompleteness: (get("f-score-contact")?.value || "").trim(),
      alignmentStatus: (get("f-alignment-status")?.value || "").trim(),

      decisionMakerName: (get("f-decision-name")?.value || "").trim(),
      decisionMakerRole: (get("f-decision-role")?.value || "").trim(),
      decisionMakerEmail: (get("f-decision-email")?.value || "").trim(),
      decisionMakerPhone: (get("f-decision-phone")?.value || "").trim(),
      painPoint: (get("f-pain-point")?.value || "").trim(),
      currentSolution: (get("f-current-solution")?.value || "").trim(),
      recommendedService: (get("f-recommended-service")?.value || "").trim(),
      recommendedOffer: (get("f-recommended-offer")?.value || "").trim(),

      address: (get("f-address")?.value || "").trim(),
      city: (get("f-city")?.value || "").trim(),
      province: (get("f-province")?.value || "").trim(),
      country: (get("f-country")?.value || "").trim(),
      postalCode: (get("f-postal")?.value || "").trim(),
      latitude: (get("f-lat")?.value || "").trim(),
      longitude: (get("f-lng")?.value || "").trim(),

      leadSource: (get("f-lead-source")?.value || "").trim(),
      sourceRecordUrl: (get("f-source-record-url")?.value || "").trim(),
      sourceSearchUrl: (get("f-source-search-url")?.value || "").trim(),
      sourceDataUrl: (get("f-source-data-url")?.value || "").trim(),
      extractedAt: (get("f-extracted-at")?.value || "").trim(),
      externalId: (get("f-external-id")?.value || "").trim(),
      sourcePriority: (get("f-source-priority")?.value || "").trim(),
      sourceCategorySlug: (get("f-source-category-slug")?.value || "").trim(),
      sourceCitySlug: (get("f-source-city-slug")?.value || "").trim(),

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
