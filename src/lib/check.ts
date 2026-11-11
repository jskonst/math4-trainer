import type {
  AnswerLeaf,
  CompareKind,
  LeafResult,
  Task,
  TaskCheckResult,
  TaskItem,
} from '../types/task'
import {
  almostEqual,
  formatNumberRu,
  measuresEqual,
  parseNumber,
} from './units'

export function isAutoCheckable(task: Task): boolean {
  if (task.manual) return false
  if (task.answer_entry === 'none' || task.answer_entry === 'drawing') return false
  return true
}

export function fieldLabel(key: string): string {
  const labels: Record<string, string> = {
    n: 'Число',
    plus3: '+3',
    minus4: '−4',
    one_fifth: '1/5',
    one_third: '1/3',
    P: 'Периметр',
    S: 'Площадь',
    width: 'Ширина',
    kg: 'кг',
    q: 'Частное или ц',
    r: 'Остаток',
    first: 'Первое неполное делимое',
    digits: 'Цифр в частном',
    correct: 'Верно?',
    equation: 'Уравнение',
    order: 'Порядок действий',
    larger: 'Больше',
    times: 'Во сколько раз',
    choice: 'Выбор',
    value: 'Значение',
    hundreds_thousands: 'Сот. тыс.',
    tens_thousands: 'Дес. тыс.',
    thousands: 'Ед. тыс.',
    hundreds: 'Сотни',
    tens: 'Десятки',
    ones: 'Единицы',
    answer: 'Ответ',
  }
  return labels[key] ?? key
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined
}

function inferKind(task: Task, value: unknown, unit?: string): CompareKind {
  if (task.answer_entry === 'sign') return 'sign'
  if (task.answer_entry === 'expansion') return 'expansion'
  if (task.answer_entry === 'roman_or_integer') return 'roman'
  if (typeof value === 'boolean') return 'boolean'
  if (value === '<' || value === '>' || value === '=') return 'sign'
  if (typeof value === 'number') {
    if (unit || task.answer_entry === 'compound_measure') return 'measure'
    return 'number'
  }
  if (typeof value === 'string') {
    if (task.answer_entry === 'compound_measure' || task.answer_entry === 'text_or_measure') {
      return looksLikeMeasure(value) || unit ? 'measure' : 'text'
    }
    if (unit || looksLikeMeasure(value)) return 'measure'
    return 'text'
  }
  return 'text'
}

function looksLikeMeasure(value: string): boolean {
  return /\d/.test(value) && /[а-яёa-z²]/i.test(value)
}

function leavesFromValue(
  path: string,
  label: string,
  value: unknown,
  unit: string | undefined,
  acceptable: unknown,
  kind: CompareKind,
): AnswerLeaf[] {
  if (Array.isArray(value)) {
    if (isRecord(acceptable)) {
      const accValues = Object.values(acceptable)
      return value.map((item, i) => ({
        path: `${path}.${i}`,
        label: `${label} (${i + 1})`,
        expected: item,
        acceptable: asArray(accValues[i]),
        kind: typeof item === 'number' ? 'number' : 'measure',
        unit,
        setGroup: path,
        input: 'text',
      }))
    }
    const allText = value.every((item) => typeof item === 'string' && String(item).length > 24)
    if (allText) {
      return [
        {
          path,
          label,
          expected: value,
          acceptable: asArray(acceptable),
          kind: 'list',
          input: 'multichoice',
        },
      ]
    }
    return value.map((item, i) => ({
      path: `${path}.${i}`,
      label: `${label} (${i + 1})`,
      expected: item,
      kind: inferKindFromScalar(item, unit, kind),
      unit,
      input: 'text',
    }))
  }

  if (isRecord(value)) {
    const acc = isRecord(acceptable) ? acceptable : undefined
    return Object.entries(value).map(([key, item]) => ({
      path: `${path}.${key}`,
      label: `${label} — ${key === 'q' && 'kg' in value ? 'ц' : fieldLabel(key)}`,
      expected: item,
      acceptable: asArray(acc?.[key]),
      kind: inferKindFromScalar(item, unit, kind),
      unit,
      input: typeof item === 'boolean' ? 'boolean' : 'text',
    }))
  }

  return [
    {
      path,
      label,
      expected: value,
      acceptable: asArray(acceptable),
      kind,
      unit,
      input: kind === 'sign' ? 'sign' : kind === 'boolean' ? 'boolean' : 'text',
    },
  ]
}

function inferKindFromScalar(
  value: unknown,
  unit: string | undefined,
  fallback: CompareKind,
): CompareKind {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return unit ? 'measure' : 'number'
  if (typeof value === 'string') {
    if (value === '<' || value === '>' || value === '=') return 'sign'
    if (unit || looksLikeMeasure(value)) return 'measure'
    return 'text'
  }
  return fallback
}

function leavesFromItem(task: Task, item: TaskItem): AnswerLeaf[] {
  const id = item.id
  const label = item.prompt ?? id

  if (item.equation != null || task.answer_entry === 'equation_and_number') {
    const leaves: AnswerLeaf[] = []
    if (item.equation != null) {
      leaves.push({
        path: `${id}.equation`,
        label: `${label} — уравнение`,
        expected: item.equation,
        acceptable: item.acceptable_equations,
        kind: 'text',
        input: 'text',
      })
    }
    if (item.answer != null) {
      leaves.push({
        path: `${id}.answer`,
        label: `${label} — x`,
        expected: item.answer,
        kind: 'number',
        input: 'text',
      })
    }
    return leaves
  }

  if (task.answer_entry === 'choice_and_number' || (item.larger != null && item.times != null)) {
    return [
      {
        path: `${id}.larger`,
        label: `${label} — больше`,
        expected: item.larger,
        kind: 'measure',
        input: 'text',
      },
      {
        path: `${id}.times`,
        label: `${label} — во сколько раз`,
        expected: item.times,
        kind: 'number',
        input: 'text',
      },
    ]
  }

  if (item.order != null) {
    const leaves: AnswerLeaf[] = [
      {
        path: `${id}.order`,
        label: `${label} — порядок`,
        expected: item.order,
        kind: 'order',
        input: 'order',
      },
    ]
    if (item.answer != null) {
      leaves.push({
        path: `${id}.answer`,
        label: `${label} — значение`,
        expected: item.answer,
        kind: 'number',
        input: 'text',
      })
    }
    return leaves
  }

  if (
    item.correct !== undefined &&
    (task.answer_entry.startsWith('boolean_and') ||
      task.answer_entry === 'dividend_and_digits' ||
      task.answer_entry === 'error_check')
  ) {
    const leaves: AnswerLeaf[] = [
      {
        path: `${id}.correct`,
        label: `${label} — верно?`,
        expected: item.correct,
        kind: 'boolean',
        input: 'boolean',
      },
    ]
    if (task.answer_entry === 'dividend_and_digits' && isRecord(item.answer)) {
      leaves.push({
        path: `${id}.first`,
        label: `${label} — первое неполное`,
        expected: item.answer.first,
        kind: 'number',
        input: 'text',
      })
      leaves.push({
        path: `${id}.digits`,
        label: `${label} — цифр в частном`,
        expected: item.answer.digits,
        kind: 'number',
        input: 'text',
      })
      return leaves
    }
    if (item.answer != null) {
      leaves.push({
        path: `${id}.answer`,
        label: `${label} — исправление`,
        expected: item.answer,
        acceptable: asArray(item.acceptable),
        kind: inferKind(task, item.answer, item.unit),
        unit: item.unit,
        input: 'text',
      })
    }
    return leaves
  }

  if (isRecord(item.answer) && 'q' in item.answer && 'r' in item.answer && !('first' in item.answer)) {
    return [
      {
        path: `${id}.q`,
        label: `${label} — частное`,
        expected: item.answer.q,
        kind: 'number',
        input: 'text',
      },
      {
        path: `${id}.r`,
        label: `${label} — остаток`,
        expected: item.answer.r,
        kind: 'number',
        input: 'text',
      },
    ]
  }

  if (item.answer !== undefined) {
    return leavesFromValue(
      id,
      label,
      item.answer,
      item.unit,
      item.acceptable,
      inferKind(task, item.answer, item.unit),
    )
  }

  return []
}

export function getLeaves(task: Task): AnswerLeaf[] {
  if (!isAutoCheckable(task)) return []

  if (task.answer_entry === 'pairs') {
    const leaves: AnswerLeaf[] = []
    if (isRecord(task.answer)) {
      const values = Object.keys(task.answer)
      for (const [value, exprs] of Object.entries(task.answer)) {
        if (!Array.isArray(exprs)) continue
        for (const expr of exprs) {
          leaves.push({
            path: `pair:${String(expr)}`,
            label: String(expr),
            expected: value,
            kind: 'number',
            input: 'choice',
            options: values,
          })
        }
      }
    } else {
      const values = [
        ...new Set(
          (task.items ?? []).map((item) => (item.value != null ? String(item.value) : 'без пары')),
        ),
      ]
      for (const item of task.items ?? []) {
        const expected = item.value != null ? String(item.value) : 'без пары'
        const expressions = Array.isArray(item.expressions) ? item.expressions : []
        for (const expr of expressions) {
          leaves.push({
            path: `pair:${String(expr)}`,
            label: String(expr),
            expected,
            kind: item.value != null ? 'number' : 'text',
            input: 'choice',
            options: values,
          })
        }
      }
    }
    return leaves
  }

  if (task.answer_entry === 'choice' && isRecord(task.answer)) {
    const options = (task.items_values ?? []).map((item) => item.prompt)
    return [
      {
        path: 'choice',
        label: 'Выражение',
        expected: task.answer.choice,
        kind: 'text',
        input: 'choice',
        options,
      },
      {
        path: 'value',
        label: 'Значение',
        expected: task.answer.value,
        kind: 'number',
        input: 'text',
      },
    ]
  }

  const booleanItems = (task.items ?? []).filter((item) => typeof item.answer === 'boolean')
  if (task.answer_entry === 'index_list' && Array.isArray(task.answer) && booleanItems.length === 0) {
    const options = parseListedOptions(task.prompt)
    return [
      {
        path: 'answer',
        label: 'Выбор',
        expected: task.answer,
        kind: 'list',
        input: 'multichoice',
        options: options.length ? options : task.answer.map((item) => String(item)),
      },
    ]
  }

  if (task.items?.length) {
    const leaves: AnswerLeaf[] = []
    for (const item of task.items) {
      if (typeof item.answer === 'boolean' && task.answer_entry === 'index_list') {
        leaves.push({
          path: item.id,
          label: item.prompt ?? item.id,
          expected: item.answer,
          kind: 'boolean',
          input: 'boolean',
        })
        continue
      }
      if (Array.isArray(item.answer) && item.not_needed) {
        const options = [...item.answer.map((x) => String(x)), ...asArray(item.not_needed)!.map((x) => String(x))]
        leaves.push({
          path: item.id,
          label: item.prompt ?? item.id,
          expected: item.answer,
          kind: 'list',
          input: 'multichoice',
          options,
        })
        continue
      }
      leaves.push(...leavesFromItem(task, item))
    }
    return leaves
  }

  if (task.answer != null) {
    return leavesFromValue(
      'answer',
      'Ответ',
      task.answer,
      task.unit,
      undefined,
      inferKind(task, task.answer, task.unit),
    )
  }

  return []
}

export function parseListedOptions(prompt: string): string[] {
  const idx = prompt.lastIndexOf(':')
  if (idx < 0) return []
  return prompt
    .slice(idx + 1)
    .split(',')
    .map((part) => part.trim().replace(/[.;]+$/, '').trim())
    .filter(Boolean)
}

export function formatExpected(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'верно' : 'неверно'
  if (typeof value === 'number') return formatNumberRu(value)
  if (Array.isArray(value)) return value.map((item) => formatExpected(item)).join(', ')
  if (value == null) return ''
  return String(value)
}

export function officialAnswers(task: Task): Record<string, string> {
  const answers: Record<string, string> = {}
  for (const leaf of getLeaves(task)) {
    answers[leaf.path] =
      leaf.kind === 'list' && Array.isArray(leaf.expected)
        ? JSON.stringify(leaf.expected.map((item) => String(item)))
        : formatExpected(leaf.expected)
  }
  return answers
}

function normalizeText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»""„]/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/[×∙·*]/g, '*')
    .replace(/\s+/g, ' ')
    .replace(/[.]/g, '')
    .replace(/\s*=\s*/g, '=')
    .replace(/\s*([+\-*/:])\s*/g, '$1')
}

function parseBoolean(raw: string): boolean | null {
  const t = normalizeText(raw)
  const truthy = ['верно', 'да', 'true', '1', 'v', 'ок', 'правильно', 'без ошибок', 'без-ошибок']
  const falsy = ['неверно', 'нет', 'false', '0', 'ошибка', 'неправильно', 'есть ошибка', 'есть-ошибка']
  if (truthy.includes(t) || t === '✓' || t === '✔' || t === '+') return true
  if (falsy.includes(t) || t === '✗' || t === '×' || t === '-') return false
  return null
}

function parseSign(raw: string): string | null {
  const t = raw.trim()
  if (t === '>' || t === '&gt;') return '>'
  if (t === '<' || t === '&lt;') return '<'
  if (t === '=' || t === '==') return '='
  return null
}

function parseExpansion(raw: string): number[] | null {
  const parts = raw
    .replace(/[−–—]/g, '-')
    .split('+')
    .map((part) => parseNumber(part.trim()))
  if (parts.some((n) => n == null)) return null
  return parts as number[]
}

function parseOrder(raw: string): string[] {
  const n = raw
    .replace(/[×∙·*]/g, '×')
    .replace(/[−–—-]/g, '−')
    .replace(/[÷]/g, ':')
  const ops: string[] = []
  for (const ch of n) {
    if (ch === '×' || ch === '−' || ch === '+' || ch === ':') ops.push(ch)
  }
  return ops
}

const ROMAN: Record<string, number> = {
  i: 1,
  v: 5,
  x: 10,
  l: 50,
  c: 100,
  d: 500,
  m: 1000,
}

function parseRomanOrCentury(raw: string): number | null {
  const t = normalizeText(raw)
    .replace(/век/g, '')
    .replace(/в$/g, '')
    .trim()
  const asNumber = parseNumber(t)
  if (asNumber != null) return asNumber
  if (!/^[ivxlcdm]+$/.test(t)) return null
  let total = 0
  let prev = 0
  for (const ch of [...t].reverse()) {
    const v = ROMAN[ch]
    if (v < prev) total -= v
    else total += v
    prev = v
  }
  return total
}

function parseList(raw: string): string[] {
  const trimmed = raw.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean)
    } catch {
      /* fall through */
    }
  }
  return trimmed
    .split(/[\n;]+|(?<=[а-яёa-z²])\s*,\s+|,/i)
    .map((part) => part.trim())
    .filter(Boolean)
}

function valuesEqual(user: string, expected: unknown, leaf: AnswerLeaf): boolean {
  const raw = user.trim()
  if (!raw) return false

  if (leaf.kind === 'boolean' || typeof expected === 'boolean') {
    const parsed = parseBoolean(raw)
    return parsed != null && parsed === Boolean(expected)
  }

  if (leaf.kind === 'sign' || expected === '<' || expected === '>' || expected === '=') {
    return parseSign(raw) === String(expected)
  }

  if (leaf.kind === 'expansion') {
    const left = parseExpansion(raw)
    const right = parseExpansion(formatExpected(expected))
    return Boolean(left && right && left.length === right.length && left.every((n, i) => n === right[i]))
  }

  if (leaf.kind === 'order') {
    const left = parseOrder(raw)
    const right = parseOrder(String(expected))
    return left.length > 0 && left.join() === right.join()
  }

  if (leaf.kind === 'roman') {
    const left = parseRomanOrCentury(raw)
    const right =
      typeof expected === 'number' ? expected : parseRomanOrCentury(String(expected))
    return left != null && right != null && left === right
  }

  if (leaf.kind === 'list') {
    const userItems = parseList(raw)
    const expectedItems = Array.isArray(expected) ? expected.map((item) => String(item)) : [String(expected)]
    if (userItems.length !== expectedItems.length) return false
    const used = new Set<number>()
    return expectedItems.every((exp) => {
      const idx = userItems.findIndex((item, i) => !used.has(i) && (looseEqual(item, exp, leaf) || normalizeText(item) === normalizeText(exp)))
      if (idx < 0) return false
      used.add(idx)
      return true
    })
  }

  return looseEqual(raw, expected, leaf)
}

function looseEqual(user: string, expected: unknown, leaf: AnswerLeaf): boolean {
  if (typeof expected === 'number' || leaf.kind === 'number' || leaf.kind === 'measure') {
    const userNum = parseNumber(user)
    const expNum = typeof expected === 'number' ? expected : parseNumber(String(expected))
    if (userNum != null && expNum != null && almostEqual(userNum, expNum)) return true
  }

  const expectedText = formatExpected(expected)
  if (normalizeText(user) === normalizeText(expectedText)) return true

  if (leaf.unit && measuresEqual(user, expectedText, leaf.unit)) return true
  if (leaf.kind === 'measure' || looksLikeMeasure(expectedText) || looksLikeMeasure(user)) {
    if (measuresEqual(user, expectedText, leaf.unit)) return true
  }
  return false
}

function leafMatches(user: string, leaf: AnswerLeaf): boolean {
  const candidates = [leaf.expected, ...(leaf.acceptable ?? [])]
  return candidates.some((candidate) => valuesEqual(user, candidate, leaf))
}

export function checkLeaf(user: string, leaf: AnswerLeaf): boolean {
  return leafMatches(user, leaf)
}

export function checkTask(task: Task, answers: Record<string, string>): TaskCheckResult {
  if (!isAutoCheckable(task)) {
    return { ok: true, skipped: true, leaves: [] }
  }
  const leaves = getLeaves(task)
  const usedByGroup = new Map<string, Set<string>>()
  const results: LeafResult[] = leaves.map((leaf) => {
    const user = answers[leaf.path] ?? ''
    let ok = leafMatches(user, leaf)
    if (!ok && leaf.setGroup) {
      const groupLeaves = leaves.filter((item) => item.setGroup === leaf.setGroup)
      const used = usedByGroup.get(leaf.setGroup) ?? new Set<string>()
      const match = groupLeaves.find((candidate) => {
        if (used.has(candidate.path)) return false
        return leafMatches(user, candidate)
      })
      if (match) {
        ok = true
        used.add(match.path)
        usedByGroup.set(leaf.setGroup, used)
      }
    } else if (ok && leaf.setGroup) {
      const used = usedByGroup.get(leaf.setGroup) ?? new Set<string>()
      used.add(leaf.path)
      usedByGroup.set(leaf.setGroup, used)
    }
    return {
      path: leaf.path,
      label: leaf.label,
      ok,
      expectedDisplay: formatExpectedDisplay(leaf),
    }
  })
  return {
    ok: results.length > 0 && results.every((item) => item.ok),
    skipped: false,
    leaves: results,
  }
}

export function formatExpectedDisplay(leaf: AnswerLeaf): string {
  const main = formatExpected(leaf.expected)
  if (!leaf.acceptable?.length) return main
  const extra = leaf.acceptable.map((item) => formatExpected(item)).filter((item) => item && item !== main)
  if (!extra.length) return main
  return `${main} (также: ${extra.join(', ')})`
}
