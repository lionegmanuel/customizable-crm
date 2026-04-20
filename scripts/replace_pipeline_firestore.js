#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const DEFAULT_SOURCE = 'D:/Downloads/VELINEX_leads_2000.json'

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBzD_Eb36i7KxPXXiZnDx9cZECCLjLKWSg',
  authDomain: 'custom-leadscrm.firebaseapp.com',
  projectId: 'custom-leadscrm'
}

const GROUP_NAMES = {
  'Grupo 1': 'Salud y bienestar privado',
  'Grupo 2': 'Educacion y formacion',
  'Grupo 3': 'Gastronomia',
  'Grupo 4': 'Turismo y hospitalidad',
  'Grupo 5': 'Inmobiliarias y propiedad',
  'Grupo 6': 'Servicios profesionales',
  'Grupo 7': 'Estetica y cuidado personal',
  'Grupo 8': 'Veterinaria y mascotas',
  'Grupo 9': 'Automotriz',
  'Grupo 10': 'Construccion y hogar',
  'Grupo 11': 'Comercio consultivo',
  'Grupo 12': 'Eventos y entretenimiento'
}

function readFirebaseConfigFile() {
  try {
    const cfgPath = path.resolve(__dirname, '..', 'js', 'firebase-config.js')
    if (!fs.existsSync(cfgPath)) return null
    const raw = fs.readFileSync(cfgPath, 'utf8')
    const apiKey = (raw.match(/apiKey\s*:\s*"([^"]+)"/) || [])[1] || ''
    const authDomain = (raw.match(/authDomain\s*:\s*"([^"]+)"/) || [])[1] || ''
    const projectId = (raw.match(/projectId\s*:\s*"([^"]+)"/) || [])[1] || ''
    if (!apiKey || !projectId) return null
    return { apiKey, authDomain, projectId }
  } catch (_) {
    return null
  }
}

const FIREBASE_CONFIG = (() => {
  const fromFile = readFirebaseConfigFile() || {}
  return {
    apiKey: process.env.FIREBASE_API_KEY || fromFile.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || fromFile.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: process.env.FIREBASE_PROJECT_ID || fromFile.projectId || DEFAULT_FIREBASE_CONFIG.projectId
  }
})()

function parseArgs(argv) {
  const out = {
    source: DEFAULT_SOURCE,
    email: process.env.CRM_USER_EMAIL || '',
    password: process.env.CRM_USER_PASSWORD || '',
    dryRun: false
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--source' && argv[i + 1]) {
      out.source = argv[i + 1]
      i += 1
    } else if (arg === '--email' && argv[i + 1]) {
      out.email = argv[i + 1]
      i += 1
    } else if (arg === '--password' && argv[i + 1]) {
      out.password = argv[i + 1]
      i += 1
    } else if (arg === '--dry-run') {
      out.dryRun = true
    }
  }

  return out
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function slugify(value) {
  const normalized = normalizeText(value)
  return normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function compact(parts) {
  return parts
    .filter((v) => String(v || '').trim() !== '')
    .map((v) => String(v).trim())
    .join(' | ')
}

function extractDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function parsePaisCiudad(value, fallbackPais, fallbackCiudad) {
  const raw = String(value || '').trim()
  if (!raw) {
    return {
      pais: String(fallbackPais || '').trim(),
      ciudad: String(fallbackCiudad || '').trim(),
      provincia: ''
    }
  }

  const parts = raw.split('-').map((x) => x.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return { pais: parts[0], ciudad: parts.slice(1).join(' - '), provincia: '' }
  }

  return {
    pais: String(fallbackPais || '').trim(),
    ciudad: raw,
    provincia: ''
  }
}

function normalizeUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw}`
}

function parseInstagramHandle(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const fromUrl = raw
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
  return fromUrl.trim()
}

function parseWhatsapp(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/wa\.me\//i.test(raw)) {
    return extractDigits(raw)
  }
  return extractDigits(raw)
}

function mapTicketRange(tier) {
  if (tier === 'Tier 3') return 'Alto'
  if (tier === 'Tier 2') return 'Medio'
  return 'Bajo'
}

function mapTicketValue(tier) {
  if (tier === 'Tier 3') return 2500
  if (tier === 'Tier 2') return 1200
  return 450
}

function mapTemperatura(tier) {
  if (tier === 'Tier 3') return 'Caliente'
  if (tier === 'Tier 2') return 'Tibio'
  return 'Fr\u00edo'
}

function mapPrioridad(tier) {
  if (tier === 'Tier 3') return 'Alta'
  if (tier === 'Tier 2') return 'Media'
  return 'Media'
}

function mapCanal(canalEntrada) {
  const v = normalizeText(canalEntrada)
  if (v.includes('whatsapp')) return 'WhatsApp'
  if (v.includes('instagram')) return 'Instagram DM'
  if (v.includes('linkedin')) return 'LinkedIn'
  if (v.includes('email')) return 'Email'
  return 'Otro'
}

function contactCompleteness(src) {
  const points = [
    src.whatsapp,
    src.telefonoAlternativo,
    src.email,
    src.website,
    src.instagramUrl,
    src.linkedinUrl,
    src.googleMapsUrl
  ].filter((v) => String(v || '').trim() !== '').length

  return Math.max(0, Math.min(5, Math.round((points / 7) * 5)))
}

function tierToPotential(tier) {
  if (tier === 'Tier 3') return 5
  if (tier === 'Tier 2') return 4
  return 3
}

function tierToDifficulty(tier) {
  if (tier === 'Tier 3') return 4
  if (tier === 'Tier 2') return 3
  return 2
}

function buildCommercialScore(tier, quality, completeness) {
  const base = tier === 'Tier 3' ? 84 : tier === 'Tier 2' ? 76 : 68
  const q = Number(quality || 0)
  const c = Number(completeness || 0)
  const score = base + q + c
  return Math.max(45, Math.min(99, Math.round(score * 10) / 10))
}

function buildRecommendedService(tier, groupName) {
  if (tier === 'Tier 3') {
    return `Setter + closer conversacional IA multi-canal para ${groupName}`
  }
  if (tier === 'Tier 2') {
    return `Agente IA de calificacion y agenda comercial para ${groupName}`
  }
  return `Agente IA de atencion conversacional para ${groupName}`
}

function buildRecommendedOffer(tier) {
  if (tier === 'Tier 3') {
    return 'Reducimos tiempos de respuesta a menos de 30 segundos y convertimos mas consultas calificadas en ventas.'
  }
  if (tier === 'Tier 2') {
    return 'Atencion 24/7 por WhatsApp con calificacion automatica y agenda sin friccion.'
  }
  return 'Respuesta automatizada con seguimiento para no perder consultas entrantes.'
}

function buildPainPoint(groupName) {
  return `Negocio de ${groupName} con consultas conversacionales y atencion manual que genera perdida de tiempo y oportunidades.`
}

function hashString(value) {
  let hash = 5381
  const input = String(value || '')
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i)
    hash = hash >>> 0
  }
  return hash.toString(16)
}

function buildLeadId(src, idx) {
  const seed = `${src.key || ''}|${src.nombre || ''}|${src.paisCiudad || ''}|${idx + 1}`
  const hash = hashString(seed)
  return `velinex_${String(idx + 1).padStart(4, '0')}_${hash}`
}

function cleanObservation(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toCrmLead(src, idx, importedAt) {
  const groupLabel = GROUP_NAMES[src.grupo] || src.grupo || 'Grupo sin clasificar'
  const loc = parsePaisCiudad(src.paisCiudad, src.pais, src.ciudad)

  const waDigits = parseWhatsapp(src.whatsapp)
  const phone = String(src.telefonoAlternativo || '').trim()
  const email = String(src.email || '').trim()
  const website = normalizeUrl(src.website)
  const instagramHandle = parseInstagramHandle(src.instagramUrl)
  const linkedin = normalizeUrl(src.linkedinUrl)

  const completeness = contactCompleteness(src)
  const quality = Number(src.quality || 0)
  const commercialScore = buildCommercialScore(src.tier, quality, completeness)
  const potential = tierToPotential(src.tier)
  const difficulty = tierToDifficulty(src.tier)
  const reach = src.tier === 'Tier 3' ? 4 : 3
  const replicability = 4
  const speed = src.tier === 'Tier 3' ? 3 : 4
  const alignment = 4

  const normalizedObservation = cleanObservation(src.observacion)
  const signals = compact([
    src.senalesVolumen,
    waDigits ? 'Canal WhatsApp detectado' : '',
    email ? 'Email de contacto disponible' : '',
    website ? 'Sitio web disponible' : '',
    src.sourceCategory ? `Categoria tecnica: ${src.sourceCategory}` : ''
  ])

  const notesLines = [
    'Importacion masiva Velinex 2026.',
    `Grupo: ${src.grupo || ''} - ${groupLabel}`,
    `Rubro: ${src.rubro || ''}`,
    `Tier: ${src.tier || ''}`,
    `Canal recomendado: ${src.canalEntrada || ''}`,
    src.sourceUrl ? `URL fuente: ${src.sourceUrl}` : '',
    normalizedObservation ? `Observacion: ${normalizedObservation}` : '',
    '',
    'Payload original completo:',
    JSON.stringify(src, null, 2)
  ].filter(Boolean)

  const lead = {
    id: buildLeadId(src, idx),
    name: String(src.nombre || `Lead ${idx + 1}`).trim(),
    whatsapp: waDigits,
    phone,
    email,
    instagram: instagramHandle,
    linkedin,
    website,

    nicho: `${src.grupo || 'Grupo'} - ${groupLabel}`,
    subnicho: String(src.rubro || '').trim(),
    targetCategory: groupLabel,
    subCategory: String(src.rubro || '').trim(),
    businessProfile: String(src.grupo || '').trim(),
    companySize: '1-10 (estimado)',
    employeeCount: '',
    branchCount: '',
    businessDescription: normalizedObservation,
    infoDetail: compact([
      `Pais/Ciudad: ${src.paisCiudad || ''}`,
      `Canal entrada recomendado: ${src.canalEntrada || ''}`,
      src.sourceCategory ? `Source category: ${src.sourceCategory}` : ''
    ]),
    slogan: '',

    canal: mapCanal(src.canalEntrada),
    ticket: mapTicketValue(src.tier),
    ticketRango: mapTicketRange(src.tier),
    temperatura: mapTemperatura(src.tier),
    prioridad: mapPrioridad(src.tier),
    seguidores: extractDigits(src.instagramFollowers) || '',
    stage: 'identificado',

    commercialScore,
    potentialScore: potential,
    difficultyScore: difficulty,
    reachScore: reach,
    replicabilityScore: replicability,
    speedScore: speed,
    alignmentScore: alignment,
    contactCompleteness: completeness,
    alignmentStatus: normalizedObservation.toUpperCase().includes('REVISAR')
      ? 'REVISAR - volumen no verificable con fuente actual'
      : 'Alineado con criterios de importacion',

    decisionMakerName: String(src.owner || '').trim(),
    decisionMakerRole: String(src.owner || '').trim() ? 'Dueno/a o socio/a' : '',
    decisionMakerEmail: '',
    decisionMakerPhone: '',
    painPoint: buildPainPoint(groupLabel),
    currentSolution: 'Atencion manual por canales conversacionales',
    recommendedService: buildRecommendedService(src.tier, groupLabel),
    recommendedOffer: buildRecommendedOffer(src.tier),

    address: '',
    city: loc.ciudad || '',
    province: loc.provincia || '',
    country: loc.pais || src.pais || '',
    postalCode: '',
    latitude: '',
    longitude: '',

    leadSource: 'Base Velinex 2000 leads (scraping + validacion)',
    sourceRecordUrl: normalizeUrl(src.sourceUrl),
    sourceSearchUrl: normalizeUrl(src.googleMapsUrl),
    sourceDataUrl: '',
    sourceCategorySlug: slugify(src.sourceCategory || ''),
    sourceCitySlug: slugify(loc.ciudad || ''),
    extractedAt: importedAt,
    externalId: String(src.key || '').trim(),
    sourcePriority: idx + 1,

    sourceScore: commercialScore,
    sourcePhone: phone,
    sourceEmail: email,
    sourceWebsite: website,
    sourceAddress: '',
    sourceCity: loc.ciudad || '',
    sourceProvince: loc.provincia || '',
    sourceCountry: loc.pais || src.pais || '',
    sourceLat: '',
    sourceLng: '',

    sourceTier: src.tier || '',
    sourceQuality: quality,
    sourceRaw: src,

    ['se\u00f1ales']: signals,
    notas: notesLines.join('\n'),

    createdAt: importedAt,
    lastActivity: importedAt,
    timeline: [
      { text: 'Lead importado por reemplazo masivo de pipeline', date: importedAt },
      { text: 'Dataset Velinex 2000 leads aplicado', date: importedAt }
    ]
  }

  return lead
}

function readJsonArray(filePath) {
  const abs = path.resolve(filePath)
  if (!fs.existsSync(abs)) {
    throw new Error(`No existe archivo fuente: ${abs}`)
  }

  const raw = fs.readFileSync(abs, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error('El archivo fuente debe ser un array JSON.')
  }
  return parsed
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) }
    return { doubleValue: value }
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((v) => toFirestoreValue(v)) } }
  }
  const fields = {}
  Object.keys(value).forEach((k) => {
    fields[k] = toFirestoreValue(value[k])
  })
  return { mapValue: { fields } }
}

function toFirestoreFields(obj) {
  const fields = {}
  Object.keys(obj).forEach((k) => {
    fields[k] = toFirestoreValue(obj[k])
  })
  return fields
}

function fromFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null
  if ('nullValue' in value) return null
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('timestampValue' in value) return value.timestampValue
  if ('arrayValue' in value) {
    const arr = (value.arrayValue && value.arrayValue.values) || []
    return arr.map((item) => fromFirestoreValue(item))
  }
  if ('mapValue' in value) {
    const fields = (value.mapValue && value.mapValue.fields) || {}
    const out = {}
    Object.keys(fields).forEach((k) => {
      out[k] = fromFirestoreValue(fields[k])
    })
    return out
  }
  return null
}

function firestoreDocToObject(doc) {
  const fields = doc && doc.fields ? doc.fields : {}
  const out = {}
  Object.keys(fields).forEach((key) => {
    out[key] = fromFirestoreValue(fields[key])
  })
  out.id = String(doc.name || '').split('/').pop()
  return out
}

function chunk(array, size) {
  const out = []
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size))
  }
  return out
}

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError = null
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetch(url, options)
      return res
    } catch (err) {
      lastError = err
      await new Promise((resolve) => setTimeout(resolve, 300 * i))
    }
  }
  throw lastError
}

async function signInWithEmailPassword(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`
  const referer = process.env.FIREBASE_ALLOWED_REFERRER || 'http://localhost:4173/'

  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: referer
    },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  })

  const data = await res.json()
  if (!res.ok) {
    const msg = (data && data.error && data.error.message) || 'Error de autenticacion'
    throw new Error(`No se pudo autenticar: ${msg}`)
  }

  return {
    idToken: data.idToken,
    uid: data.localId
  }
}

async function listLeadDocs({ projectId, uid, idToken }) {
  const docs = []
  let nextPageToken = ''

  while (true) {
    const params = new URLSearchParams({ pageSize: '300' })
    if (nextPageToken) params.set('pageToken', nextPageToken)

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/leads?${params.toString()}`
    const res = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    })

    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = (payload && payload.error && payload.error.message) || `HTTP ${res.status}`
      throw new Error(`No se pudieron listar leads: ${msg}`)
    }

    if (Array.isArray(payload.documents)) {
      docs.push(...payload.documents)
    }

    nextPageToken = payload.nextPageToken || ''
    if (!nextPageToken) break
  }

  return docs
}

async function commitWrites({ projectId, idToken, writes }) {
  if (!writes.length) return

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ writes })
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (payload && payload.error && payload.error.message) || `HTTP ${res.status}`
    throw new Error(`Commit Firestore fallido: ${msg}`)
  }
}

async function deleteAllLeadDocs({ projectId, idToken, docs }) {
  if (!docs.length) return

  const names = docs.map((doc) => doc.name)
  const chunks = chunk(names, 350)

  for (let i = 0; i < chunks.length; i += 1) {
    const writes = chunks[i].map((name) => ({ delete: name }))
    await commitWrites({ projectId, idToken, writes })
    console.log(`Borrado lote ${i + 1}/${chunks.length} (${chunks[i].length} docs)`)
  }
}

async function insertLeadDocs({ projectId, uid, idToken, leads }) {
  const chunks = chunk(leads, 220)

  for (let i = 0; i < chunks.length; i += 1) {
    const writes = chunks[i].map((lead) => ({
      update: {
        name: `projects/${projectId}/databases/(default)/documents/users/${uid}/leads/${lead.id}`,
        fields: toFirestoreFields(lead)
      }
    }))

    await commitWrites({ projectId, idToken, writes })
    console.log(`Importado lote ${i + 1}/${chunks.length} (${chunks[i].length} leads)`)
  }
}

function makeTimestampTag(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
}

function buildImportReport({ uid, sourcePath, sourceCount, backupPath, beforeCount, deletedCount, importedCount, afterCount }) {
  return {
    timestamp: new Date().toISOString(),
    projectId: FIREBASE_CONFIG.projectId,
    uid,
    sourcePath,
    sourceCount,
    beforeCount,
    deletedCount,
    importedCount,
    afterCount,
    backupPath,
    status: afterCount === importedCount ? 'ok' : 'warning_count_mismatch'
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const importedAt = new Date().toISOString()

  const sourceRows = readJsonArray(args.source)
  const mappedLeads = sourceRows.map((src, idx) => toCrmLead(src, idx, importedAt))

  if (mappedLeads.length !== 2000) {
    console.warn(`Aviso: la fuente tiene ${mappedLeads.length} leads (esperado: 2000).`)
  }

  const idSet = new Set()
  for (const lead of mappedLeads) {
    if (idSet.has(lead.id)) {
      throw new Error(`ID duplicado generado: ${lead.id}`)
    }
    idSet.add(lead.id)
  }

  if (args.dryRun) {
    const previewPath = path.resolve('D:/Downloads/velinex-crm-replace-preview.json')
    fs.writeFileSync(previewPath, JSON.stringify(mappedLeads.slice(0, 10), null, 2), 'utf8')
    console.log(`Dry run OK. Preview guardado en: ${previewPath}`)
    console.log(`Leads mapeados: ${mappedLeads.length}`)
    return
  }

  if (!args.email || !args.password) {
    throw new Error('Faltan credenciales. Usa --email y --password o define CRM_USER_EMAIL y CRM_USER_PASSWORD.')
  }

  const auth = await signInWithEmailPassword(args.email, args.password)
  console.log(`Autenticado UID: ${auth.uid}`)

  const existingDocs = await listLeadDocs({
    projectId: FIREBASE_CONFIG.projectId,
    uid: auth.uid,
    idToken: auth.idToken
  })
  console.log(`Leads actuales detectados: ${existingDocs.length}`)

  const backupTag = makeTimestampTag()
  const backupPath = path.resolve(`D:/Downloads/velinex-crm-backup-${auth.uid}-${backupTag}.json`)
  const backupPayload = {
    timestamp: new Date().toISOString(),
    projectId: FIREBASE_CONFIG.projectId,
    uid: auth.uid,
    total: existingDocs.length,
    leads: existingDocs.map((doc) => firestoreDocToObject(doc))
  }
  fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2), 'utf8')
  console.log(`Backup generado: ${backupPath}`)

  await deleteAllLeadDocs({
    projectId: FIREBASE_CONFIG.projectId,
    idToken: auth.idToken,
    docs: existingDocs
  })
  console.log('Borrado completo de leads actuales finalizado.')

  await insertLeadDocs({
    projectId: FIREBASE_CONFIG.projectId,
    uid: auth.uid,
    idToken: auth.idToken,
    leads: mappedLeads
  })
  console.log('Importacion de nuevos leads finalizada.')

  const afterDocs = await listLeadDocs({
    projectId: FIREBASE_CONFIG.projectId,
    uid: auth.uid,
    idToken: auth.idToken
  })

  const report = buildImportReport({
    uid: auth.uid,
    sourcePath: path.resolve(args.source),
    sourceCount: sourceRows.length,
    backupPath,
    beforeCount: existingDocs.length,
    deletedCount: existingDocs.length,
    importedCount: mappedLeads.length,
    afterCount: afterDocs.length
  })

  const reportPath = path.resolve(`D:/Downloads/velinex-crm-import-report-${backupTag}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')

  console.log('--- Resultado reemplazo ---')
  console.log(`Leads antes: ${existingDocs.length}`)
  console.log(`Leads importados: ${mappedLeads.length}`)
  console.log(`Leads despues: ${afterDocs.length}`)
  console.log(`Backup: ${backupPath}`)
  console.log(`Reporte: ${reportPath}`)

  if (afterDocs.length !== mappedLeads.length) {
    throw new Error(`Cantidad final inesperada: ${afterDocs.length} (esperado ${mappedLeads.length})`)
  }
}

run().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
