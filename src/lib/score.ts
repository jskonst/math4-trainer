const STORAGE_KEY = 'math4-trainer:score:v1'

export type TaskVerdict = 'correct' | 'incorrect'

export interface ScoreStore {
  verdicts: Record<string, TaskVerdict>
}

export function emptyScore(): ScoreStore {
  return { verdicts: {} }
}

export function loadScore(): ScoreStore {
  if (typeof localStorage === 'undefined') return emptyScore()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyScore()
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !('verdicts' in parsed)) return emptyScore()
    const verdicts = (parsed as ScoreStore).verdicts
    if (!verdicts || typeof verdicts !== 'object') return emptyScore()
    return { verdicts: { ...verdicts } }
  } catch {
    return emptyScore()
  }
}

export function saveScore(store: ScoreStore): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

/** A task counts once: the first recorded result sticks. */
export function recordCheck(store: ScoreStore, taskId: string, ok: boolean): ScoreStore {
  if (store.verdicts[taskId]) return store
  return { verdicts: { ...store.verdicts, [taskId]: ok ? 'correct' : 'incorrect' } }
}

/** Revealing the answer counts as incorrect, unless already scored. */
export function recordReveal(store: ScoreStore, taskId: string): ScoreStore {
  if (store.verdicts[taskId]) return store
  return { verdicts: { ...store.verdicts, [taskId]: 'incorrect' } }
}

export function resetAll(): ScoreStore {
  return emptyScore()
}

export function resetTasks(store: ScoreStore, taskIds: string[]): ScoreStore {
  const verdicts = { ...store.verdicts }
  for (const id of taskIds) delete verdicts[id]
  return { verdicts }
}

export interface ScoreSummary {
  correct: number
  incorrect: number
  remaining: number
  total: number
}

export function summarize(store: ScoreStore, taskIds: string[]): ScoreSummary {
  let correct = 0
  let incorrect = 0
  for (const id of taskIds) {
    if (store.verdicts[id] === 'correct') correct += 1
    else if (store.verdicts[id] === 'incorrect') incorrect += 1
  }
  return {
    correct,
    incorrect,
    remaining: taskIds.length - correct - incorrect,
    total: taskIds.length,
  }
}
