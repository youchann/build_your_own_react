import { reconcileChildren } from './reconcile'

/** 処置途中の関数コンポーネントのFiber Node */
let wipFiber: Fiber | null = null
/** 処置途中の関数コンポーネントのFiber NodeのHookのIndex */
let hookIndex: number = 0

/** 関数コンポーネントのFiber Nodeを更新する */
function updateFunctionComponent(global: Pick<DidactGlobalState, 'deletions'>) {
  return function(fiber: Fiber) {
    if (fiber.type instanceof Function) {
      wipFiber = fiber
      hookIndex = 0
      wipFiber.hooks = []
      const children = [fiber.type(fiber.props)]
      reconcileChildren({ ...global })(fiber, children)
    }
  }
}

/**
 * Reactの`useState`を再現したもの
 * 現状は`setState`の引数は関数のみ対応
 */
function useState(global: DidactGlobalState) {
  return function<T>(initial: T): [T, (action: SetState<T>) => void] {
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
      global.wipRoot = {
        dom: global.currentRoot?.dom,
        props: global.currentRoot?.props ?? {},
        alternate: global.currentRoot
      }
      global.nextUnitOfWork = global.wipRoot
      global.deletions = []
    }

    wipFiber.hooks.push(hook)
    hookIndex++
    return [hook.state, setState]
  }
}

export { updateFunctionComponent, useState }
