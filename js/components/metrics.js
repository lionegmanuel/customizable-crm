/**
 calculo y renderizado de KPIs, gráficos de barra y lista de follow-ups urgentes. Solo lectura — no modifica datos.
 */

const MetricsView = (() => {
  let _onOpenLead = null;

  function init({ onOpenLead }) {
    _onOpenLead = onOpenLead;
  }

  function render() {
    const el = document.getElementById("view-metricas");
    if (!el) return;

    const leads = Store.getAll();
    const stats = _calcStats(leads);
    const byStage = _groupByStage(leads);
    const byNicho = _groupByField(leads, "nicho");
    const byCanal = _groupByField(leads, "canal");
    const alertList = _getAlertLeads(leads);

    el.innerHTML = [
      _renderSummary(stats),
      _renderCharts(leads.length, byStage, byNicho, byCanal),
      alertList.length ? _renderAlertList(alertList) : "",
    ].join("");

    _attachHandlers(alertList);
  }

  /* ─── Cálculos ─── */

  function _calcStats(leads) {
    const cerrados = leads.filter((l) => l.stage === "cerrado");
    const active = leads.filter(
      (l) =>
        !Store.getSettings().stages.find((s) => s.id === l.stage)?.terminal,
    );
    const tasa =
      leads.length > 0 ? Math.round((cerrados.length / leads.length) * 100) : 0;
    const valorCerr = cerrados.reduce((a, l) => a + (Number(l.ticket) || 0), 0);
    const valorPipe = active.reduce((a, l) => a + (Number(l.ticket) || 0), 0);
    const alertCount = active.filter(
      (l) => Utils.daysSince(l.lastActivity) > Store.getSettings().followupDays,
    ).length;
    return { total: leads.length, tasa, valorCerr, valorPipe, alertCount };
  }

  function _groupByStage(leads) {
    return Store.getSettings().stages.map((s) => ({
      ...s,
      count: leads.filter((l) => l.stage === s.id).length,
    }));
  }

  function _groupByField(leads, field) {
    const map = {};
    leads.forEach((l) => {
      if (l[field]) map[l[field]] = (map[l[field]] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }

  function _getAlertLeads(leads) {
    return leads
      .filter(
        (l) =>
          !Store.getSettings().stages.find((s) => s.id === l.stage)?.terminal &&
          Utils.daysSince(l.lastActivity) > Store.getSettings().followupDays,
      )
      .sort(
        (a, b) =>
          Utils.daysSince(b.lastActivity) - Utils.daysSince(a.lastActivity),
      );
  }

  /* ─── Render ─── */

  function _renderSummary(s) {
    return `<div class="metrics-row" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
      <div class="metric-card">
        <div class="metric-label">Total leads</div>
        <div class="metric-val metric-val--purple">${s.total}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Tasa de cierre</div>
        <div class="metric-val metric-val--green">${s.tasa}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Valor cerrado</div>
        <div class="metric-val metric-val--amber">$${s.valorCerr.toLocaleString("es-AR")}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Valor pipeline</div>
        <div class="metric-val">${s.valorPipe > 0 ? "$" + s.valorPipe.toLocaleString("es-AR") : "$0"}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Follow-up urgente</div>
        <div class="metric-val ${s.alertCount > 0 ? "metric-val--red" : ""}">${s.alertCount}</div>
      </div>
    </div>`;
  }

  function _renderCharts(total, byStage, byNicho, byCanal) {
    return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
      <div class="panel-card" style="padding:16px">
        <div class="section-title" style="margin-top:0">Embudo de conversión</div>
        ${_renderBars(
          byStage.filter((s) => s.id !== "descartado" && s.count > 0),
          total,
          (s) => s.label,
          (s) => s.color,
        )}
      </div>
      <div class="panel-card" style="padding:16px">
        <div class="section-title" style="margin-top:0">Leads por nicho</div>
        ${_renderBars(
          byNicho.map(([n, c]) => ({ label: n, count: c })),
          total,
          (s) => s.label,
          () => "var(--accent)",
        )}
      </div>
      <div class="panel-card" style="padding:16px">
        <div class="section-title" style="margin-top:0">Leads por canal</div>
        ${_renderBars(
          byCanal.map(([n, c]) => ({ label: n, count: c })),
          total,
          (s) => s.label,
          () => "var(--blue)",
        )}
      </div>
    </div>`;
  }

  function _renderBars(items, total, getLabel, getColor) {
    if (!items.length)
      return '<div class="empty" style="padding:20px">Sin datos</div>';
    return items
      .map((item) => {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return `<div>
        <div class="bar-label">
          <span class="text-muted">${Utils.esc(getLabel(item))}</span>
          <span style="font-weight:500">${item.count} <span class="text-muted text-tiny">(${pct}%)</span></span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${getColor(item)}"></div>
        </div>
      </div>`;
      })
      .join("");
  }

  function _renderAlertList(alertLeads) {
    const rows = alertLeads
      .slice(0, 8)
      .map(
        (l) => `
      <div class="alert-row">
        <div>
          <div style="font-weight:500">${Utils.esc(l.name || "Sin nombre")}</div>
          <div class="text-tiny text-muted">${Utils.stageLabel(l.stage)} · ${Utils.esc(l.nicho || "—")}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="alert-days text-sm">${Utils.daysSince(l.lastActivity)}d sin actividad</span>
          <button class="btn btn--sm" data-open-lead="${l.id}">Ver</button>
        </div>
      </div>`,
      )
      .join("");

    return `<div class="panel-card" style="padding:16px">
      <div class="section-title" style="margin-top:0;color:var(--amber)">
        Leads que necesitan follow-up (${alertLeads.length})
      </div>
      ${rows}
    </div>`;
  }

  function _attachHandlers(alertLeads) {
    document.querySelectorAll("[data-open-lead]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.openLead;
        if (_onOpenLead) _onOpenLead(id);
      });
    });
  }

  return { init, render };
})();
