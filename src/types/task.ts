export interface Catalog {
  meta: CatalogMeta
  sections: Section[]
  theory_pages?: TheoryPage[]
  tasks: Task[]
  stats?: unknown
}

export interface CatalogMeta {
  title: string
  author?: string
  year?: number
  isbn?: string
  pagination?: string
  copyright_note?: string
  schema?: unknown
}

export interface Section {
  id: string
  title: string
  book_pages: number[]
  pdf_pages?: number[]
  subsections: Subsection[]
}

export interface Subsection {
  id: string
  title: string
  book_pages: number[]
  pdf_pages?: number[]
}

export interface TheoryPage {
  book_page: number
  pdf_page?: number
  section_id: string
  subsection_id?: string
  title: string
}

export interface ChoiceOption {
  prompt: string
  value: number
  greatest?: boolean
}

export interface Task {
  id: string
  section_id: string
  subsection_id?: string
  book_page: number
  pdf_page?: number
  number: string
  type: string
  answer_entry: string
  prompt: string
  items?: TaskItem[]
  items_values?: ChoiceOption[]
  answer?: unknown
  unit?: string
  manual: boolean
  manual_note?: string
  note?: string
  book_error?: boolean
  generatable?: boolean
  generator?: string
}

export interface TaskItem {
  id: string
  prompt?: string
  answer?: unknown
  acceptable?: unknown
  unit?: string
  correct?: boolean
  equation?: string
  acceptable_equations?: string[]
  order?: string
  larger?: string
  times?: number
  reason?: string
  note?: string
  book_error?: boolean
  value?: unknown
  expressions?: string[]
  given?: unknown
  answer_was?: string
  answer_now?: string
  acceptable_now?: string[]
  underline?: boolean
  circle_remainder?: boolean
  not_needed?: unknown
  computed?: Record<string, number>
  [key: string]: unknown
}

export type CompareKind =
  | 'number'
  | 'sign'
  | 'boolean'
  | 'text'
  | 'measure'
  | 'expansion'
  | 'list'
  | 'order'
  | 'roman'

export interface AnswerLeaf {
  path: string
  label: string
  expected: unknown
  acceptable?: unknown[]
  kind: CompareKind
  unit?: string
  /** Leaves that share a setGroup may match in any order. */
  setGroup?: string
  input?: 'text' | 'sign' | 'boolean' | 'choice' | 'multichoice' | 'order'
  options?: string[]
}

export interface LeafResult {
  path: string
  label: string
  ok: boolean
  expectedDisplay: string
}

export interface TaskCheckResult {
  ok: boolean
  skipped: boolean
  leaves: LeafResult[]
}
