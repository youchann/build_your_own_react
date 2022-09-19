/**
 * 過去のFiber Nodeとの差分を比較して、更新のために必要な情報(`effectTag`など)を付与する
 */
function reconcileChildren(global: Pick<DidactGlobalState, 'deletions'>) {
  return function(wipFiber: Fiber, elements: Fiber[]) {
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
        global.deletions.push(oldFiber)
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
}

export { reconcileChildren }
