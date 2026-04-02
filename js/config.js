/**Configuración. Es la fuente única de verdad para constantes, etapas y definiciones de campos.
 - Reemplazazable por una respuesta de API = (GET /api/tenants/:id/config) para habilitar white-labeling por cliente.
 - No contiene lógica de negocio — solo datos de configuración.
 */

const CRM_CONFIG = Object.freeze({
  /** Clave usada en localStorage. Cambiar en producción por tenant ID. */
  STORAGE_KEY: "velinex_crm_v1",

  /** Versión del esquema de datos. Incrementar al cambiar estructura de Lead. */
  SCHEMA_VERSION: 1,

  /**
   * Etapas del pipeline.
   * order: posición en el Kanban (0 = primera columna).
   * terminal: true indica que el lead salió del flujo activo.
   */
  DEFAULTS: {
    STAGES: [
      {
        id: "identificado",
        label: "Identificado",
        color: "#8888a8",
        order: 0,
        terminal: false,
      },
      {
        id: "contactado",
        label: "Contactado",
        color: "#7c6fe0",
        order: 1,
        terminal: false,
      },
      {
        id: "respondio",
        label: "Respondió",
        color: "#4a9edd",
        order: 2,
        terminal: false,
      },
      {
        id: "deck",
        label: "Deck enviado",
        color: "#e09c3e",
        order: 3,
        terminal: false,
      },
      {
        id: "vsl",
        label: "VSL enviado",
        color: "#c27ac0",
        order: 4,
        terminal: false,
      },
      {
        id: "llamada",
        label: "Llamada agendada",
        color: "#2db87a",
        order: 5,
        terminal: false,
      },
      {
        id: "cerrado",
        label: "Cerrado",
        color: "#3e9e5f",
        order: 6,
        terminal: true,
      },
      {
        id: "descartado",
        label: "Descartado",
        color: "#e05555",
        order: 7,
        terminal: true,
      },
    ],
    NICHOS: [
      "Coach fitness",
      "Nutricionista",
      "Infoproductor",
      "Academia online",
      "Coach negocios",
      "Coach finanzas",
      "Consultor digital",
      "Agencia marketing",
      "Coach productividad",
      "Coach mindset",
      "Otro",
    ],
    SUBNICHOS: [
      "A — Cierre por videollamada",
      "B — Cierre por chat",
      "C — Híbrido",
    ],
    CANALES: ["WhatsApp", "Instagram DM", "LinkedIn", "Email", "Otro"],
    PRIORIDADES: ["Alta", "Media", "Baja"],
    TEMPERATURAS: ["Frío", "Tibio", "Caliente"],
    TICKET: ['Bajo', 'Medio', 'Alto', 'Irreconocible']
  },
  FOLLOWUP_THRESHOLD_DAYS: 3,

  /** Días sin actividad para marcar follow-up urgente. */
  FOLLOWUP_THRESHOLD_DAYS: 3,
});
