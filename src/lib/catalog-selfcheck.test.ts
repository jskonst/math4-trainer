import { describe, expect, it } from 'vitest'
import { catalog } from './catalog'
import { checkTask, getLeaves, isAutoCheckable, officialAnswers } from './check'

describe('catalog self-check', () => {
  const autoTasks = catalog.tasks.filter(isAutoCheckable)

  it('has auto-checkable and manual tasks', () => {
    expect(catalog.tasks.length).toBe(113)
    expect(autoTasks.length).toBe(102)
    expect(catalog.tasks.length - autoTasks.length).toBe(11)
  })

  it('builds at least one leaf for every auto-checkable task', () => {
    const empty = autoTasks.filter((task) => getLeaves(task).length === 0).map((task) => task.id)
    expect(empty).toEqual([])
  })

  it('accepts the official answer of every auto-checkable task', () => {
    const failed: string[] = []
    for (const task of autoTasks) {
      const result = checkTask(task, officialAnswers(task))
      if (!result.ok) {
        const bad = result.leaves.filter((leaf) => !leaf.ok).map((leaf) => `${leaf.path} expected ${leaf.expectedDisplay}`)
        failed.push(`${task.id} (${task.answer_entry}): ${bad.join('; ')}`)
      }
    }
    expect(failed).toEqual([])
  })

  it('rejects a blank answer on auto-checkable tasks', () => {
    for (const task of autoTasks) {
      const result = checkTask(task, {})
      expect(result.skipped).toBe(false)
      expect(result.ok).toBe(false)
    }
  })
})
