import type { ReactNode } from 'react'
import type { ScoreSummary } from '../lib/score'

interface Props {
  title: string
  summary: ScoreSummary
  onReset: () => void
  resetLabel?: string
  extra?: ReactNode
}

export default function ScoreBar({ title, summary, onReset, resetLabel = 'Сбросить', extra }: Props) {
  return (
    <aside className="score-box" aria-live="polite">
      <div className="meta">{title}</div>
      <div className="score-line">
        <span className="ok">Верно {summary.correct}</span>
        <span className="bad">Неверно {summary.incorrect}</span>
        <span className="rest">Осталось {summary.remaining}</span>
      </div>
      <div className="score-actions">
        <button type="button" className="btn danger" onClick={onReset}>
          {resetLabel}
        </button>
        {extra}
      </div>
    </aside>
  )
}
