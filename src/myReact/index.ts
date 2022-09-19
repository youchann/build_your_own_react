import { createElement, updateDom } from './dom'
import { updateFunctionComponent, useEffect, useState } from './functionComponent'
import { updateHostComponent } from './hostComponent'

/** この値を元にDidactはDOMのレンダリングを行う */
const global: DidactGlobalState = {
  wipRoot: null,
  currentRoot: null,
  nextUnitOfWork: null,
  deletions: []
}

/**
 * レンダリングで作られたFiber Treeを元にDOMを更新する
 */
function commitRoot() {
  global.deletions.forEach(commitWork)
  commitWork(global.wipRoot?.child)
  global.currentRoot = global.wipRoot
  global.wipRoot = null
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
  for (const hook of fiber.hooks || []) {
    if (hook.type === 'useEffect' && hook.cleanup) {
      hook.cleanup()
    }
  }
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child as Fiber, domParent)
  }
}

function render(element: Fiber, container: HTMLElement) {
  global.wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    alternate: global.currentRoot
  }
  global.deletions = []
  global.nextUnitOfWork = global.wipRoot
}

const requestIdleCallbackFunc = (window as any).requestIdleCallback

function workLoop(deadline: any) {
  let shouldYield = false
  while (global.nextUnitOfWork && !shouldYield) {
    global.nextUnitOfWork = performUnitOfWork(global.nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!global.nextUnitOfWork && global.wipRoot) {
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
    updateFunctionComponent({ ...global })(fiber)
  } else {
    updateHostComponent({ ...global })(fiber)
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

export default {
  createElement,
  render,
  useState: useState(global),
  useEffect
}
