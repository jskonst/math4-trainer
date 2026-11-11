import { useMemo, useState } from 'react'
import ScoreBar from './components/ScoreBar'
import TaskCard from './components/TaskCard'
import { catalog, practiceTaskIds, sectionProgressLabel, tasksInSection } from './lib/catalog'
import { loadScore, recordCheck, recordReveal, resetAll, resetTasks, saveScore, summarize } from './lib/score'
import type { ScoreStore } from './lib/score'

type View = { page: 'home' } | { page: 'section'; sectionId: string; subsectionId?: string }
type Mode = 'one' | 'list'

export default function App() {
  const [view, setView] = useState<View>({ page: 'home' })
  const [mode, setMode] = useState<Mode>('one')
  const [taskIndex, setTaskIndex] = useState(0)
  const [score, setScore] = useState<ScoreStore>(() => loadScore())

  function updateScore(next: ScoreStore) {
    setScore(next)
    saveScore(next)
  }

  const allPracticeIds = useMemo(() => practiceTaskIds(catalog.tasks), [])
  const total = summarize(score, allPracticeIds)

  const section = view.page === 'section'
    ? catalog.sections.find((item) => item.id === view.sectionId)
    : undefined
  const tasks = view.page === 'section' ? tasksInSection(view.sectionId, view.subsectionId) : []
  const practiceIds = practiceTaskIds(tasks)
  const sectionSummary = summarize(score, practiceIds)
  const safeIndex = tasks.length ? Math.min(taskIndex, tasks.length - 1) : 0
  const current = tasks[safeIndex]
  const subsectionTitle = section && view.page === 'section' && view.subsectionId
    ? section.subsections.find((item) => item.id === view.subsectionId)?.title
    : undefined

  function openSection(sectionId: string, subsectionId?: string) {
    setView({ page: 'section', sectionId, subsectionId })
    setTaskIndex(0)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Тренажёр по математике</h1>
          <p>4 класс · задания по разделам тетради с проверкой</p>
        </div>
        <ScoreBar
          title={view.page === 'home' ? 'Все разделы' : 'Этот раздел'}
          summary={view.page === 'home' ? total : sectionSummary}
          resetLabel={view.page === 'home' ? 'Сбросить всё' : 'Сбросить раздел'}
          onReset={() => updateScore(view.page === 'home' ? resetAll() : resetTasks(score, practiceIds))}
          extra={
            view.page === 'section' ? (
              <div className="meta">Всего верно {total.correct} · неверно {total.incorrect}</div>
            ) : null
          }
        />
      </header>

      {view.page === 'home' ? (
        <section className="grid">
          {catalog.sections.map((item) => {
            const ids = practiceTaskIds(tasksInSection(item.id))
            const local = summarize(score, ids)
            return (
              <button key={item.id} type="button" className="card" onClick={() => openSection(item.id)}>
                <h2>{item.title}</h2>
                <p className="meta">{sectionProgressLabel(item)} · {tasksInSection(item.id).length} заданий</p>
                <p className="meta">Верно {local.correct} · неверно {local.incorrect}</p>
              </button>
            )
          })}
        </section>
      ) : null}

      {view.page === 'section' && section ? (
        <>
          <div className="toolbar">
            <button type="button" className="btn ghost" onClick={() => setView({ page: 'home' })}>
              ← К разделам
            </button>
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => setMode('one')} disabled={mode === 'one'}>
                По одному
              </button>
              <button type="button" className="btn ghost" onClick={() => setMode('list')} disabled={mode === 'list'}>
                Списком
              </button>
            </div>
          </div>

          <h2>{section.title}{subsectionTitle ? ` · ${subsectionTitle}` : ''}</h2>

          {section.subsections.length > 0 ? (
            <div className="row" style={{ margin: '14px 0' }}>
              <button
                type="button"
                className="btn ghost"
                disabled={!view.subsectionId}
                onClick={() => openSection(section.id)}
              >
                Все задания
              </button>
              {section.subsections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="btn ghost"
                  disabled={view.subsectionId === item.id}
                  onClick={() => openSection(section.id, item.id)}
                >
                  {item.title}
                </button>
              ))}
            </div>
          ) : null}

          {mode === 'list' ? (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                verdict={score.verdicts[task.id]}
                onChecked={(ok) => updateScore(recordCheck(score, task.id, ok))}
                onRevealed={() => updateScore(recordReveal(score, task.id))}
              />
            ))
          ) : current ? (
            <>
              <p className="meta" style={{ margin: '12px 0' }}>
                Задание {safeIndex + 1} из {tasks.length}
              </p>
              <TaskCard
                key={current.id}
                task={current}
                verdict={score.verdicts[current.id]}
                onChecked={(ok) => updateScore(recordCheck(score, current.id, ok))}
                onRevealed={() => updateScore(recordReveal(score, current.id))}
              />
              <div className="row">
                <button
                  type="button"
                  className="btn secondary"
                  disabled={safeIndex === 0}
                  onClick={() => setTaskIndex((n) => Math.max(0, n - 1))}
                >
                  Предыдущее
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={safeIndex >= tasks.length - 1}
                  onClick={() => setTaskIndex((n) => Math.min(tasks.length - 1, n + 1))}
                >
                  Следующее
                </button>
              </div>
            </>
          ) : (
            <p className="hint">В этом разделе пока нет заданий.</p>
          )}
        </>
      ) : null}
    </div>
  )
}
