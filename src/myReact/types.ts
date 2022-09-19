type Type = keyof HTMLElementTagNameMap | 'TEXT_ELEMENT' | FunctionComponent

type FunctionComponent = (props: Props) => Fiber

type Hook<T = any> = {
  state: T
  queue: SetState<T>[]
}
type SetState<T> = (prevState: T) => T

type Fiber = {
  type?: Type
  props: Props
  parent?: Fiber
  child?: Fiber
  sibling?: Fiber
  alternate?: Fiber | null
  effectTag?: 'PLACEMENT' | 'UPDATE' | 'DELETION'
  dom?: HTMLElement | Text
  hooks?: Hook[]
}

type Props = {
  children?: Fiber[]
  [key: string]: any
}

type DidactHTMLElement = { [key: string]: any }

/**
 * 全体で利用するグローバル変数
 */
type DidactGlobalState = {
  /** 処理中のFiber Node */
  wipRoot: Fiber | null
  /** 最後にDOMにコミットしたFiber TreeのRoot */
  currentRoot: Fiber | null
  /** 削除対象のFiber Node */
  deletions: Fiber[]
  /** 処理予定のFiber Node */
  nextUnitOfWork: Fiber | null
}
