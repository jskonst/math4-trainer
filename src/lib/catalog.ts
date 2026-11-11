import catalogJson from '../data/tasks.json'
import type { Catalog, Section, Subsection, Task } from '../types/task'

export const catalog = catalogJson as Catalog

export function getSection(sectionId: string): Section | undefined {
  return catalog.sections.find((section) => section.id === sectionId)
}

export function getSubsection(section: Section, subsectionId: string): Subsection | undefined {
  return section.subsections.find((item) => item.id === subsectionId)
}

export function tasksInSection(sectionId: string, subsectionId?: string): Task[] {
  return catalog.tasks.filter((task) => {
    if (task.section_id !== sectionId) return false
    if (subsectionId) return task.subsection_id === subsectionId
    return true
  })
}

export function practiceTaskIds(tasks: Task[]): string[] {
  return tasks.filter((task) => !task.manual && task.answer_entry !== 'none').map((task) => task.id)
}

export function sectionProgressLabel(section: Section): string {
  const [from, to] = section.book_pages
  if (from && to && from !== to) return `стр. ${from}–${to}`
  if (from) return `стр. ${from}`
  return ''
}
