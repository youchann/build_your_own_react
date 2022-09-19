import { createDom } from './dom'
import { reconcileChildren } from './reconcile'

/** ネイティブタグのFiber Nodeを更新する */
function updateHostComponent(global: Pick<DidactGlobalState, 'deletions'>) {
  return function(fiber: Fiber) {
    if (!fiber.dom) {
      fiber.dom = createDom(fiber)
    }
    reconcileChildren({ ...global })(fiber, fiber.props.children ?? [])
  }
}

export { updateHostComponent }
