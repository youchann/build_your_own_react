type Type = keyof HTMLElementTagNameMap | 'TEXT_ELEMENT' | FunctionComponent

type FunctionComponent = (props: Props) => Fiber

type Hook = UseStateHook | UseEffectHook

type UseStateHook<T = any> = {
  type: 'useState'
  state: T
  queue: SetState<T>[]
}

type SetState<T> = (prevState: T) => T

type UseEffectHook = {
  type: 'useEffect'
  effect: () => void | UseEffectHook['cleanup']
  deps?: any[]
  cleanup?: () => void
}

type Fiber = {
  /** Fiber Nodeの種類 */
  type?: Type
  /** そのFiber Nodeが持つProps */
  props: Props
  /** そのFiber Nodeの親 */
  parent?: Fiber
  /** そのFiber Nodeの子であり、次の処理対象となる */
  child?: Fiber
  /** そのFiber Nodeの兄弟であり、次の処理対象となる */
  sibling?: Fiber
  /** そのFiber Nodeの過去の状態のSnapShot */
  alternate?: Fiber | null
  /** そのFiber Nodeがどのように処理されるかを示すタグ */
  effectTag?: 'PLACEMENT' | 'UPDATE' | 'DELETION'
  /** そのFiber NodeのDOMとしての実態 */
  dom?: HTMLElement | Text
  /** そのFiber Node内で所持しているhooks */
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
