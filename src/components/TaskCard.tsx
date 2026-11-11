import { useMemo, useState } from 'react'
import type { AnswerLeaf, LeafResult, Task } from '../types/task'
import { checkTask, formatExpectedDisplay, getLeaves, isAutoCheckable } from '../lib/check'

interface Props {
  task: Task
  verdict?: 'correct' | 'incorrect'
  onChecked: (ok: boolean) => void
  onRevealed: () => void
}

export default function TaskCard({ task, verdict, onChecked, onRevealed }: Props) {
  const leaves = useMemo(() => getLeaves(task), [task])
  const auto = isAutoCheckable(task)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<LeafResult[] | null>(null)
  const [revealed, setRevealed] = useState(false)

  const resultByPath = new Map((results ?? []).map((item) => [item.path, item]))
  const hasWrong = (results ?? []).some((item) => !item.ok)

  function setValue(path: string, value: string) {
    setAnswers((current) => ({ ...current, [path]: value }))
    setResults(null)
  }

  function handleCheck() {
    const result = checkTask(task, answers)
    setResults(result.leaves)
    if (!result.skipped) onChecked(result.ok)
  }

  function handleReveal() {
    setRevealed(true)
    onRevealed()
  }

  const groups = groupLeaves(leaves)

  return (
    <article className="card task">
      <div className="task-head">
        <span className="badge">Стр. {task.book_page}, № {task.number}</span>
        <div className="row">
          {task.book_error ? <span className="badge warn">В учебнике опечатка</span> : null}
          {verdict === 'correct' ? <span className="badge ok">Зачтено верно</span> : null}
          {verdict === 'incorrect' ? <span className="badge bad">Зачтено неверно</span> : null}
          {task.manual ? <span className="badge warn">Без автопроверки</span> : null}
        </div>
      </div>
      <p className="prompt">{task.prompt}</p>

      {!auto ? (
        <div className="manual-note">
          Это задание выполняется в тетради
          {task.manual_note ? <>: {task.manual_note}</> : '.'}
        </div>
      ) : null}

      {task.answer_entry === 'choice' && task.items_values ? (
        <div className="item">
          <div className="choices" role="radiogroup" aria-label="Выбор выражения">
            {task.items_values.map((option) => (
              <button
                key={option.prompt}
                type="button"
                className={`choice ${stateClass(resultByPath.get('choice'))}`}
                data-on={String(answers.choice === option.prompt)}
                onClick={() => setValue('choice', option.prompt)}
              >
                {option.prompt}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {groups.filter((group) => !(task.items_values && group.leaves.every((leaf) => leaf.path === 'choice'))).map((group) => (
        <div className="item" key={group.id}>
          {group.label && group.label !== task.prompt ? <div className="item-prompt">{group.label}</div> : null}
          <div className="fields">
            {group.leaves.map((leaf) => (
              <Field
                key={leaf.path}
                leaf={leaf}
                value={answers[leaf.path] ?? defaultValue(leaf)}
                result={resultByPath.get(leaf.path)}
                revealed={revealed}
                onChange={(value) => setValue(leaf.path, value)}
              />
            ))}
          </div>
        </div>
      ))}

      {auto ? (
        <div className="row nav-next">
          <button type="button" className="btn" onClick={handleCheck}>
            Проверить
          </button>
          {hasWrong || revealed ? (
            <button type="button" className="btn secondary" onClick={handleReveal}>
              Показать ответ
            </button>
          ) : null}
        </div>
      ) : task.manual && leaves.length > 0 ? (
        <div className="row nav-next">
          <button type="button" className="btn secondary" onClick={() => setRevealed(true)}>
            Показать ответ
          </button>
        </div>
      ) : null}
    </article>
  )
}

function defaultValue(leaf: AnswerLeaf): string {
  if (leaf.kind === 'list' || leaf.input === 'multichoice') return '[]'
  return ''
}

function stateClass(result: LeafResult | undefined): string {
  if (!result) return ''
  return result.ok ? 'ok' : 'bad'
}

function groupLeaves(leaves: AnswerLeaf[]): { id: string; label: string; leaves: AnswerLeaf[] }[] {
  const groups: { id: string; label: string; leaves: AnswerLeaf[] }[] = []
  const index = new Map<string, number>()
  for (const leaf of leaves) {
    const id = leaf.path.includes('.') ? leaf.path.slice(0, leaf.path.indexOf('.')) : leaf.path.split(':')[0]
    const label = leaf.path.includes('.') || leaf.path.startsWith('pair:')
      ? leaf.label.replace(/ — .*$/, '')
      : ''
    const existing = index.get(id)
    if (existing == null) {
      index.set(id, groups.length)
      groups.push({ id, label, leaves: [leaf] })
    } else {
      groups[existing].leaves.push(leaf)
      if (!groups[existing].label) groups[existing].label = label
    }
  }
  return groups
}

interface FieldProps {
  leaf: AnswerLeaf
  value: string
  result?: LeafResult
  revealed: boolean
  onChange: (value: string) => void
}

function Field({ leaf, value, result, revealed, onChange }: FieldProps) {
  const status = stateClass(result)
  const showAnswer = revealed && (result ? !result.ok : true)
  const hideLabel = leaf.input === 'multichoice' || leaf.input === 'boolean' || leaf.input === 'sign'

  if (leaf.input === 'sign') {
    return (
      <div className={`field ${status}`}>
        <label>{leaf.label}</label>
        <div className="signs">
          {(['<', '=', '>'] as const).map((sign) => (
            <button
              key={sign}
              type="button"
              className={`sign ${value === sign ? status : ''}`}
              data-on={String(value === sign)}
              onClick={() => onChange(sign)}
            >
              {sign}
            </button>
          ))}
        </div>
        {showAnswer ? <div className="answer-reveal">Ответ: {formatExpectedDisplay(leaf)}</div> : null}
      </div>
    )
  }

  if (leaf.input === 'boolean') {
    return (
      <div className={`field wide ${status}`}>
        {hideLabel ? null : <label>{leaf.label}</label>}
        <div className="signs">
          <button type="button" className={`sign ${value === 'верно' ? status : ''}`} data-on={String(value === 'верно')} onClick={() => onChange('верно')}>
            Верно
          </button>
          <button type="button" className={`sign ${value === 'неверно' ? status : ''}`} data-on={String(value === 'неверно')} onClick={() => onChange('неверно')}>
            Неверно
          </button>
        </div>
        {showAnswer ? <div className="answer-reveal">Ответ: {formatExpectedDisplay(leaf)}</div> : null}
      </div>
    )
  }

  if (leaf.input === 'choice' && leaf.options) {
    return (
      <div className={`field wide ${status}`}>
        <label>{leaf.label}</label>
        <div className="choices">
          {leaf.options.map((option) => (
            <button
              key={option}
              type="button"
              className={`choice ${value === option ? status : ''}`}
              data-on={String(value === option)}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
        {showAnswer ? <div className="answer-reveal">Ответ: {formatExpectedDisplay(leaf)}</div> : null}
      </div>
    )
  }

  if (leaf.input === 'multichoice' && leaf.options) {
    const selected = parseSelected(value)
    function toggle(option: string) {
      const next = selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option]
      onChange(JSON.stringify(next))
    }
    return (
      <div className={`field wide ${status}`}>
        <label>{leaf.label}</label>
        <div className="choices">
          {leaf.options.map((option) => (
            <button
              key={option}
              type="button"
              className={`choice ${selected.includes(option) ? status : ''}`}
              data-on={String(selected.includes(option))}
              onClick={() => toggle(option)}
            >
              {option}
            </button>
          ))}
        </div>
        {showAnswer ? <div className="answer-reveal">Ответ: {formatExpectedDisplay(leaf)}</div> : null}
      </div>
    )
  }

  return (
    <div className={`field ${status}`}>
      <label htmlFor={leaf.path}>
        {leaf.label}
        {leaf.unit ? <span className="unit"> ({leaf.unit})</span> : null}
      </label>
      <input
        id={leaf.path}
        value={value === '[]' ? '' : value}
        inputMode={leaf.kind === 'number' || leaf.kind === 'measure' ? 'decimal' : 'text'}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
      {showAnswer ? <div className="answer-reveal">Ответ: {formatExpectedDisplay(leaf)}</div> : null}
    </div>
  )
}

function parseSelected(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
  } catch {
    return []
  }
}
