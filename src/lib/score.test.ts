import { describe, expect, it } from 'vitest'
import { emptyScore, recordCheck, recordReveal, resetAll, resetTasks, summarize } from './score'

describe('score', () => {
  it('counts only the first check of a task', () => {
    let store = emptyScore()
    store = recordCheck(store, 'a', true)
    store = recordCheck(store, 'a', false)
    expect(store.verdicts.a).toBe('correct')
  })

  it('treats revealing the answer as incorrect, but does not overwrite a previous result', () => {
    let store = emptyScore()
    store = recordReveal(store, 'a')
    expect(store.verdicts.a).toBe('incorrect')
    store = recordCheck(store, 'a', true)
    expect(store.verdicts.a).toBe('incorrect')

    store = recordCheck(store, 'b', true)
    store = recordReveal(store, 'b')
    expect(store.verdicts.b).toBe('correct')
  })

  it('summarizes and resets per section', () => {
    let store = emptyScore()
    store = recordCheck(store, 'a', true)
    store = recordCheck(store, 'b', false)
    expect(summarize(store, ['a', 'b', 'c'])).toEqual({
      correct: 1,
      incorrect: 1,
      remaining: 1,
      total: 3,
    })
    store = resetTasks(store, ['a'])
    expect(store.verdicts.a).toBeUndefined()
    expect(store.verdicts.b).toBe('incorrect')
    store = resetAll()
    expect(store.verdicts).toEqual({})
  })
})
