/** Parse and compare school-course quantities (length, area, mass, time, money). */

const UNIT_FACTORS: Record<string, { dim: string; factor: number }> = {
  'мм': { dim: 'length', factor: 1 },
  'см': { dim: 'length', factor: 10 },
  'дм': { dim: 'length', factor: 100 },
  'м': { dim: 'length', factor: 1000 },
  'км': { dim: 'length', factor: 1_000_000 },
  'мм²': { dim: 'area', factor: 1 },
  'см²': { dim: 'area', factor: 100 },
  'дм²': { dim: 'area', factor: 10_000 },
  'м²': { dim: 'area', factor: 1_000_000 },
  'а': { dim: 'area', factor: 100_000_000 },
  'га': { dim: 'area', factor: 10_000_000_000 },
  'г': { dim: 'mass', factor: 1 },
  'кг': { dim: 'mass', factor: 1000 },
  'ц': { dim: 'mass', factor: 100_000 },
  'т': { dim: 'mass', factor: 1_000_000 },
  'с': { dim: 'time_s', factor: 1 },
  'мин': { dim: 'time_s', factor: 60 },
  'ч': { dim: 'time_s', factor: 3600 },
  'сут': { dim: 'time_s', factor: 86_400 },
  'нед': { dim: 'time_s', factor: 604_800 },
  'мес': { dim: 'time_m', factor: 1 },
  'год': { dim: 'time_m', factor: 12 },
  'век': { dim: 'time_m', factor: 1200 },
  'к': { dim: 'money', factor: 1 },
  'р': { dim: 'money', factor: 100 },
  'стр': { dim: 'pages', factor: 1 },
  'рис': { dim: 'count', factor: 1 },
  'км/ч': { dim: 'speed', factor: 1 },
  'м/мин': { dim: 'speed_m_min', factor: 1 },
  'см/мин': { dim: 'speed_cm_min', factor: 1 },
}

const UNIT_ALIASES: Record<string, string> = {
  'мм': 'мм',
  'см': 'см',
  'дм': 'дм',
  'м': 'м',
  'км': 'км',
  'мм2': 'мм²',
  'мм²': 'мм²',
  'см2': 'см²',
  'см²': 'см²',
  'дм2': 'дм²',
  'дм²': 'дм²',
  'м2': 'м²',
  'м²': 'м²',
  'а': 'а',
  'га': 'га',
  'г': 'г',
  'кг': 'кг',
  'ц': 'ц',
  'т': 'т',
  'с': 'с',
  'сек': 'с',
  'мин': 'мин',
  'ч': 'ч',
  'час': 'ч',
  'часа': 'ч',
  'часов': 'ч',
  'сут': 'сут',
  'сут.': 'сут',
  'сутки': 'сут',
  'суток': 'сут',
  'нед': 'нед',
  'нед.': 'нед',
  'мес': 'мес',
  'мес.': 'мес',
  'лет': 'год',
  'год': 'год',
  'года': 'год',
  'г.': 'год',
  'век': 'век',
  'в.': 'век',
  'в': 'век',
  'к.': 'к',
  'к': 'к',
  'коп': 'к',
  'р.': 'р',
  'р': 'р',
  'руб': 'р',
  'стр.': 'стр',
  'стр': 'стр',
  'рис.': 'рис',
  'рис': 'рис',
  'км/ч': 'км/ч',
  'м/мин': 'м/мин',
  'см/мин': 'см/мин',
}

const UNIT_LIST = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length)

export interface ParsedMeasure {
  dim: string
  value: number
}

export function parseNumberToken(raw: string): number | null {
  const compact = raw
    .trim()
    .replace(/[\u00a0\u202f\u2009]/g, ' ')
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/[−–—]/g, '-')
  const frac = compact.match(/^(-?\d+)\/(\d+)$/)
  if (frac) {
    const den = Number(frac[2])
    if (den === 0) return null
    return Number(frac[1]) / den
  }
  if (!/^-?\d+(\.\d+)?$/.test(compact)) return null
  const n = Number(compact)
  return Number.isFinite(n) ? n : null
}

export function parseNumber(raw: string): number | null {
  const stripped = stripTrailingUnit(raw.trim())
  return parseNumberToken(stripped ?? raw)
}

function stripTrailingUnit(s: string): string | null {
  const lower = s.toLowerCase()
  for (const alias of UNIT_LIST) {
    if (lower === alias) return null
    if (lower.endsWith(alias)) {
      const rest = s.slice(0, s.length - alias.length).trim()
      if (parseNumberToken(rest) != null) return rest
    }
  }
  return s
}

function normalizeSquareUnits(value: string): string {
  return value
    .replace(/\^2/g, '\u00B2')
    .replace(/мм2/g, 'мм\u00B2')
    .replace(/см2/g, 'см\u00B2')
    .replace(/дм2/g, 'дм\u00B2')
    .replace(/м2/g, 'м\u00B2')
}

function normalizeUnitToken(raw: string): string | null {
  const u = normalizeSquareUnits(raw.trim().toLowerCase().replace(/ё/g, 'е'))
  if (UNIT_ALIASES[u]) return UNIT_ALIASES[u]
  const nodot = u.replace(/\.+$/, '')
  return UNIT_ALIASES[nodot] ?? UNIT_ALIASES[`${nodot}.`] ?? null
}

/** Parse a compound quantity like "19 см 6 мм", "1/4 ч", "60 р. 90 к." */
export function parseMeasure(raw: string): ParsedMeasure | null {
  const s = normalizeSquareUnits(
    raw
      .trim()
      .replace(/[\u00a0\u202f\u2009]/g, ' ')
      .replace(/ё/g, 'е'),
  )
  if (!s) return null

  const tokenRe = new RegExp(
    String.raw`(?:(\d+)\s*/\s*(\d+)|(\d+(?:\s\d{3})*(?:[,.]\d+)?))\s*([^\d\s,;+/]+(?:/[^\d\s,;+/]+)?)`,
    'g',
  )

  const parts: { n: number; u: string }[] = []
  let consumed = 0
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(s)) !== null) {
    const n = m[1] != null ? Number(m[1]) / Number(m[2]) : parseNumberToken(m[3] ?? '')
    const unit = normalizeUnitToken(m[4] ?? '')
    if (n == null || !Number.isFinite(n) || !unit) return null
    parts.push({ n, u: unit })
    consumed = m.index + m[0].length
  }
  if (parts.length === 0) return null
  const rest = s.slice(consumed).trim().replace(/[.,;]+$/, '')
  if (rest.length > 0) return null

  const dim = UNIT_FACTORS[parts[0].u]?.dim
  if (!dim) return null
  let value = 0
  for (const p of parts) {
    const info = UNIT_FACTORS[p.u]
    if (!info || info.dim !== dim) return null
    value += p.n * info.factor
  }
  return { dim, value }
}

export function measuresEqual(a: string, b: string, impliedUnit?: string): boolean {
  const left = parseMeasure(a) ?? (impliedUnit ? parseMeasure(`${a} ${impliedUnit}`) : null)
  const right = parseMeasure(b) ?? (impliedUnit ? parseMeasure(`${b} ${impliedUnit}`) : null)
  if (!left || !right || left.dim !== right.dim) return false
  return almostEqual(left.value, right.value)
}

export function almostEqual(a: number, b: number): boolean {
  const scale = Math.max(1, Math.abs(a), Math.abs(b))
  return Math.abs(a - b) <= 1e-8 * scale
}

export function formatNumberRu(n: number): string {
  if (!Number.isFinite(n)) return String(n)
  if (Number.isInteger(n)) return String(n)
  return String(n).replace('.', ',')
}
