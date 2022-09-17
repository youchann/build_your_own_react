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

function createElement(type: Type, props: Props, ...children: (Fiber | string)[]): Fiber {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => (typeof child === 'object' ? child : createTextElement(child)))
    }
  }
}

function createTextElement(text: string): Fiber {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: []
    }
  }
}

function createDom(fiber: Fiber) {
  if (fiber.type instanceof Function || fiber.type === undefined) return
  const dom = fiber.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(fiber.type)
  updateDom(dom, {}, fiber.props)
  return dom
}

// @ts-ignore
const isEvent = (key: string) => key.startsWith('on')
const isProperty = (key: string) => key !== 'children' && !isEvent(key)
const isNew = (prev: Props, next: Props) => (key: string) => prev[key] !== next[key]
const isGone = (_prev: Props, next: Props) => (key: string) => !(key in next)
/** 既にあるDOMを更新する */
function updateDom(dom: DidactHTMLElement, prevProps: Props, nextProps: Props) {
  // MEMO: Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // MEMO: Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })

  // MEMO: Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ''
    })

  // MEMO: Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })
}

/**
 * レンダリングで作られたFiber Treeを元にDOMを更新する
 */
function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot?.child)
  currentRoot = wipRoot
  wipRoot = null
}

/**
 * 任意のFiber Nodeを元にDOMを更新する
 * リンクされた子Nodeや兄弟Nodeを再起的に処理する
 */
function commitWork(fiber?: Fiber) {
  if (!fiber) {
    return
  }

  // MEMO: 関数コンポーネントの場合、`dom`が存在しない
  //       そのため、親の`dom`操作対象のDOMとする
  let domParentFiber = fiber.parent
  while (!domParentFiber?.dom) {
    domParentFiber = domParentFiber?.parent
  }
  const domParent = domParentFiber.dom as HTMLElement

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate?.props || {}, fiber.props)
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent)
  }
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

/**
 * 任意のFiber Nodeを元にDOMを削除する
 * 関数コンポーネントが加わったことで、任意のFiber Nodeが`dom`を持たないケースが出てきた
 * そのため、`dom`が存在しない場合は、親の`dom`を探して削除する
 */
function commitDeletion(fiber: Fiber, domParent: HTMLElement) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child as Fiber, domParent)
  }
}

function render(element: Fiber, container: HTMLElement) {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    alternate: currentRoot
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

const requestIdleCallbackFunc = (window as any).requestIdleCallback

/** 処理予定のFiber Node */
let nextUnitOfWork: Fiber | null = null
/** 最後にDOMにコミットしたFiber TreeのRoot */
let currentRoot: Fiber | null = null
/** Fiber TreeのRoot */
let wipRoot: Fiber | null = null
/** 削除予定のFiber Tree */
let deletions: Fiber[] = []

function workLoop(deadline: any) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot() // 全ての作業を終えると、DOMに反映する
  }

  requestIdleCallbackFunc(workLoop)
}

requestIdleCallbackFunc(workLoop)

/**
 * 任意のFiber Nodeを処理する
 * 処理後に次に処理すべきFiber Nodeを返す
 * 子→兄弟→親の優先度で処理の対象を決める
 */
function performUnitOfWork(fiber: Fiber): Fiber | null {
  const isFunctionComponent = (fiber?.type as any) instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

  if (fiber.child) {
    return fiber.child
  }

  let nextFiber: Fiber | undefined = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling as Fiber
    }
    nextFiber = nextFiber.parent
  }
  return null
}

/** 処置途中の関数コンポーネントのFiber Node */
let wipFiber: Fiber | null = null
/** 処置途中の関数コンポーネントのFiber NodeのHookのIndex */
let hookIndex: number = 0

/** 関数コンポーネントのFiber Nodeを更新する */
function updateFunctionComponent(fiber: Fiber) {
  if (fiber.type instanceof Function) {
    wipFiber = fiber
    hookIndex = 0
    wipFiber.hooks = []
    const children = [fiber.type(fiber.props)]
    reconcileChildren(fiber, children)
  }
}

/**
 * Reactの`useState`を再現したもの
 * 現状は`setState`の引数は関数のみ対応
 */
function useState<T>(initial: T): [T, (action: SetState<T>) => void] {
  if (wipFiber === null || wipFiber.hooks === undefined) {
    throw new Error('wipFiber is invalid')
  }

  const oldHook = wipFiber?.alternate?.hooks && wipFiber.alternate.hooks[hookIndex]
  const hook: Hook<T> = {
    state: oldHook?.state ?? initial,
    queue: []
  }

  const actions = oldHook?.queue ?? []
  actions.forEach(action => {
    hook.state = action(hook.state)
  })

  const setState = (action: SetState<T>) => {
    hook.queue.push(action)
    wipRoot = {
      dom: currentRoot?.dom,
      props: currentRoot?.props ?? {},
      alternate: currentRoot
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }

  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state, setState]
}

/** ネイティブタグのFiber Nodeを更新する */
function updateHostComponent(fiber: Fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children ?? [])
}

/**
 * 過去のFiber Nodeとの差分を比較して、更新のために必要な情報(`effectTag`など)を付与する
 */
function reconcileChildren(wipFiber: Fiber, elements: Fiber[]) {
  let index = 0
  let oldFiber = wipFiber?.alternate?.child
  let prevSibling: Fiber | null = null

  while (index < elements.length || oldFiber != null) {
    const element = elements[index]
    let newFiber: Fiber | null = null

    const sameType = oldFiber && element?.type == oldFiber.type

    if (sameType) {
      newFiber = {
        type: oldFiber?.type,
        props: element.props,
        dom: oldFiber?.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE'
      }
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: undefined,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT'
      }
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0 && newFiber !== null) {
      wipFiber.child = newFiber
    } else if (element && newFiber !== null && prevSibling !== null) {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

export default {
  createElement,
  render,
  useState
}
