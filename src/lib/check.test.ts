import { describe, expect, it } from 'vitest'
import { checkLeaf, checkTask, getLeaves, officialAnswers } from './check'
import type { AnswerLeaf, Task } from '../types/task'

function leaf(partial: Partial<AnswerLeaf> & Pick<AnswerLeaf, 'expected' | 'kind'>): AnswerLeaf {
  return {
    path: 'x',
    label: 'x',
    ...partial,
  }
}

function task(partial: Partial<Task> & Pick<Task, 'id' | 'answer_entry'>): Task {
  return {
    section_id: 'test',
    book_page: 1,
    number: '1',
    type: 'expression',
    prompt: 'Тест',
    manual: false,
    ...partial,
  }
}

describe('checkLeaf: numbers', () => {
  const numberLeaf = leaf({ expected: 15000, kind: 'number' })

  it('accepts spaces and comma decimals', () => {
    expect(checkLeaf('15000', numberLeaf)).toBe(true)
    expect(checkLeaf('15 000', numberLeaf)).toBe(true)
    expect(checkLeaf('0,15', leaf({ expected: 0.15, kind: 'number' }))).toBe(true)
    expect(checkLeaf('15/100', leaf({ expected: 0.15, kind: 'number' }))).toBe(true)
  })

  it('rejects a wrong number or an empty value', () => {
    expect(checkLeaf('15001', numberLeaf)).toBe(false)
    expect(checkLeaf(' ', numberLeaf)).toBe(false)
  })
})

describe('checkLeaf: signs and text', () => {
  it('checks comparison signs', () => {
    const sign = leaf({ expected: '>', kind: 'sign' })
    expect(checkLeaf('>', sign)).toBe(true)
    expect(checkLeaf('<', sign)).toBe(false)
  })

  it('normalizes Russian text', () => {
    const text = leaf({ expected: 'улитка', kind: 'text' })
    expect(checkLeaf('Улитка', text)).toBe(true)
    expect(checkLeaf('ёжик', leaf({ expected: 'ежик', kind: 'text' }))).toBe(true)
  })
})

describe('checkLeaf: measures and acceptable answers', () => {
  it('treats equivalent units as equal', () => {
    const measure = leaf({ expected: '15 мин', kind: 'measure' })
    expect(checkLeaf('15 мин', measure)).toBe(true)
    expect(checkLeaf('1/4 ч', measure)).toBe(true)
    expect(checkLeaf('2 ц', leaf({ expected: '200 кг', kind: 'measure' }))).toBe(true)
    expect(checkLeaf('1 т', leaf({ expected: '10 ц', kind: 'measure' }))).toBe(true)
    expect(checkLeaf('608 мин', leaf({ expected: 608, kind: 'measure', unit: 'мин' }))).toBe(true)
  })

  it('accepts listed alternatives', () => {
    const century = leaf({
      expected: 'XI',
      kind: 'roman',
      acceptable: ['XI', '11', '11 век'],
    })
    expect(checkLeaf('11', century)).toBe(true)
    expect(checkLeaf('11 век', century)).toBe(true)
    expect(checkLeaf('XI', century)).toBe(true)
    expect(checkLeaf('10', century)).toBe(false)
  })
})

describe('checkLeaf: expansion and booleans', () => {
  it('ignores spaces in a place-value expansion', () => {
    const expansion = leaf({ expected: '400 + 8', kind: 'expansion' })
    expect(checkLeaf('400+8', expansion)).toBe(true)
    expect(checkLeaf('400 + 8', expansion)).toBe(true)
    expect(checkLeaf('400 + 80', expansion)).toBe(false)
  })

  it('accepts Russian boolean synonyms', () => {
    const yes = leaf({ expected: true, kind: 'boolean' })
    const no = leaf({ expected: false, kind: 'boolean' })
    expect(checkLeaf('Верно', yes)).toBe(true)
    expect(checkLeaf('да', yes)).toBe(true)
    expect(checkLeaf('неверно', no)).toBe(true)
    expect(checkLeaf('верно', no)).toBe(false)
  })
})

describe('checkTask', () => {
  it('requires every input to be correct', () => {
    const sample = task({
      id: 't1',
      answer_entry: 'number',
      items: [
        { id: 'a', prompt: '2+2', answer: 4 },
        { id: 'b', prompt: '3+1', answer: 4 },
      ],
    })
    expect(checkTask(sample, officialAnswers(sample)).ok).toBe(true)
    expect(checkTask(sample, { a: '4', b: '5' }).ok).toBe(false)
    expect(checkTask(sample, { a: '4', b: '4' }).leaves.every((item) => item.ok)).toBe(true)
  })

  it('skips manual tasks', () => {
    const manual = task({
      id: 'm1',
      answer_entry: 'drawing',
      prompt: 'Закрась',
      manual: true,
    })
    expect(getLeaves(manual)).toEqual([])
    expect(checkTask(manual, {}).skipped).toBe(true)
  })
})
